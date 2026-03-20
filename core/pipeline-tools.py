#!/usr/bin/env python3
"""Deterministic state management for the research-editorial pipeline.

Usage: python3 REFERENCE/pipeline-tools.py <command> [args]

All output goes to stdout as valid JSON. Errors go to stderr with non-zero exit.
Reads brand-specific config (zones, slop patterns) from brand.yaml at runtime.
"""

import argparse
import base64
import fcntl
import hashlib
import hmac
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

LOCKFILE = "REFERENCE/.pipeline.lock"
INDEX_FILE = "REFERENCE/dossier-index.jsonl"
QUEUE_FILE = "REFERENCE/topic-queue.jsonl"
PRIORITY_FILE = "REFERENCE/.state/priority.json"
FEEDBACK_FILE = "REFERENCE/.state/feedback.json"

BANNED_FIELDS = {"sources_count"}
VALID_QA_DIR = "REFERENCE/qa/"
INVALID_QA_DIR = "REFERENCE/qa-reports/"

# Lane type schemas: maps type -> required fields
LANE_SCHEMAS = {
    None: {"id", "topic", "verdict", "sources", "card", "timestamp"},  # card (no type field)
    "deepdive": {"id", "topic", "type", "dossier", "timestamp"},
    "brief": {"id", "topic", "type", "brief", "timestamp"},
    "draft": {"id", "topic", "type", "draft", "timestamp"},
    "qa": {"id", "topic", "type", "qa", "qaStatus", "timestamp"},
    "revision": {"id", "topic", "type", "draft", "revisionRound", "timestamp"},
    "short-form": {"id", "topic", "type", "shortForm", "timestamp"},
    "ghost-publish": {"id", "topic", "type", "ghostUrl", "ghostId", "timestamp"},
}

OPTIONAL_FIELDS = {
    None: {"parentEvent"},
    "deepdive": set(),
    "brief": set(),
    "draft": {"format", "note"},
    "qa": set(),
    "revision": {"revisionStatus"},
    "short-form": set(),
    "ghost-publish": set(),
}

# --- Ghost API helpers (stdlib only) ---

def _b64url(data):
    """Base64url encode bytes without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _make_ghost_jwt(key_id, secret_hex):
    """Generate a Ghost Admin API JWT (HS256, 5-min expiry)."""
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT", "kid": key_id}).encode())
    now = int(time.time())
    payload = _b64url(json.dumps({"iat": now, "exp": now + 300, "aud": "/admin/"}).encode())
    signing_input = f"{header}.{payload}".encode()
    secret = bytes.fromhex(secret_hex)
    sig = _b64url(hmac.new(secret, signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def _extract_draft_section(filepath, section):
    """Extract content between '## <section>' and the next '## ' heading."""
    with open(filepath, "r") as f:
        lines = f.readlines()
    capture = False
    result = []
    target = f"## {section}"
    for line in lines:
        if line.strip().startswith("## "):
            if line.strip().lower() == target.lower():
                capture = True
                continue
            elif capture:
                break
        if capture:
            result.append(line)
    return "".join(result).strip()


# --- Fallback slop patterns ---
# These are the last-resort safety net. If brand.yaml can't be loaded for any
# reason (broken symlink, missing PyYAML, corrupt YAML), these patterns still
# catch the most common AI-isms. They should never be the primary path — if
# you see the fallback warning in stderr, fix the config loading.

_FALLBACK_HARD_FAIL_PATTERNS = [
    (r"(?i)\b(?:(?:it'?s|that'?s) not (?:just |really |merely |simply )?(?:about |a |an )?|(?:it|this|that) (?:isn'?t|wasn'?t) (?:just |really |merely |simply )?(?:about |a |an )?)[^.;:!?\n]{3,60}(?:;|—|,| --|\.)\s*(?:it'?s|it was|this is|that'?s)", "\"It's not X, it's Y\" reframe"),
    (r"(?i)\b(?:the real (?:issue|problem|question|story|challenge) (?:isn'?t|wasn'?t))", "\"The real issue isn't...\" reframe"),
    (r"(?i)\b(?:isn'?t|wasn'?t) (?:just )?about [^.;:!?\n]{3,40}(?:;|—|,)\s*it'?s about\b", "\"isn't about X, it's about Y\" reframe"),
    (r"(?i)\bThis isn'?t (?:just |merely |simply )?(?:a |an )?[^.;:!?\n]{3,50}(?:;|—|,| --)\s*it'?s\b", "\"This isn't X; it's Y\" reframe"),
    (r"(?i)^(?:\s*>?\s*)Ultimately,", "\"Ultimately,\" opener"),
    (r"(?i)\bAt its core\b", "\"At its core\""),
    (r"(?i)\bThe reality is\b", "\"The reality is\""),
    (r"(?i)\bIn essence\b", "\"In essence\""),
    (r"(?i)\bWhat'?s really at stake\b", "\"What's really at stake\""),
    (r"(?i)\bThe core of the problem\b", "\"The core of the problem\""),
    (r"(?i)\bThis isn'?t merely\b", "\"This isn't merely\""),
    (r"(?i)(?:^|\.\s+)Fast forward\b", "\"Fast forward\""),
    (r"(?i)\bBeyond the [a-z]+\b", "\"Beyond the [noun]\""),
    (r"(?i)\bperfect storm\b", "\"perfect storm\""),
    (r"(?i)\bticking time bomb\b", "\"ticking time bomb\""),
    (r"(?i)\bsilent (?:sabotage|killer|crisis|epidemic|catastrophe|threat)\b", "\"silent [negative]\""),
    (r"(?i)\bsoul-crushing\b", "\"soul-crushing\""),
    (r"(?i)\bslow-motion (?:crisis|disaster|collapse|catastrophe|burnout|train ?wreck)\b", "\"slow-motion [disaster]\""),
    (r"(?i)\bgame[- ]chang(?:ing|er)\b", "\"game-changing\""),
    (r"(?i)(?<!\")(?<!')(?<!ironic)\bdisruptive\b(?!\")", "\"disruptive\" (unironic)"),
    (r"(?i)\blet that sink in\b", "\"let that sink in\""),
    (r"(?i)\bfull stop\.\b", "\"full stop.\""),
    (r"(?i)\b(?:buckle up|strap in|grab your popcorn)\b", "\"buckle up\" etc."),
    (r"(?i)\bit'?s worth noting\b", "\"it's worth noting\""),
    (r"(?i)\binterestingly enough\b", "\"interestingly enough\""),
    (r"(?i)\bneedless to say\b", "\"needless to say\""),
    (r"(?i)\bhere'?s the thing:?\b", "\"Here's the thing\""),
    (r"(?i)\ba cautionary tale\b", "\"a cautionary tale\""),
    (r"(?i)\b(?:would|was|were) never (?:quite )?(?:be )?the same\b", "\"would never be the same\""),
    (r"(?i)\bchanged (?:\w+ )?forever\b", "\"changed forever\""),
    (r"(?i)\bat the end of the day\b", "\"at the end of the day\""),
    (r"(?i)\bonly time will tell\b", "\"only time will tell\""),
    (r"(?i)\bmake no mistake\b", "\"make no mistake\""),
    (r"(?i)\bthe question isn'?t (?:whether|if)\b", "\"the question isn't whether\""),
    (r"(?i)(?:And )?[Ii]t worked\.?\s*Until it didn'?t", "\"It worked. Until it didn't.\""),
    (r"(?i)\bwhat makes .{3,40} (?:fascinating|remarkable|interesting|compelling) is\b", "\"what makes X fascinating is\""),
]

_FALLBACK_WARN_PATTERNS = [
    (r"(?i)\bIn the early days of\b", "throat-clear opening"),
    (r"(?i)^(?:\s*>?\s*)(?:Back when|When [A-Z][a-z]+ first)\b", "throat-clear opening"),
    (r"(?i)\b(?:massive|unprecedented|revolutionary) (?:impact|move|shift|change)\b", "vague superlative"),
    (r"(?i)\b(?:incredibly|deeply|truly) (?:important|problematic|significant)\b", "unnecessary intensifier"),
    (r"(?i)\ba wake-?up call\b", "\"a wake-up call\""),
    (r"(?i)\b(?:to truly|to really) understand\b", "\"to truly understand\""),
    (r"(?i)\bhere'?s why (?:that|this|it) matters\b", "\"here's why that matters\""),
    (r"(?i)\bif you'?re old enough to remember\b", "\"if you're old enough to remember\""),
    (r"(?i)\bbefore memes were called memes\b", "\"before memes were called memes\""),
]

# --- Brand config loading ---

_brand_config_cache = None
_brand_config_warned = False


def _find_brand_yaml():
    """Find brand.yaml by walking up from the script's directory."""
    # When symlinked into REFERENCE/, the workspace root is one level up
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Try: workspace_root/brand.yaml (script is in REFERENCE/)
    workspace_root = os.path.dirname(script_dir)
    candidate = os.path.join(workspace_root, "brand.yaml")
    if os.path.exists(candidate):
        return candidate
    # Try: same directory as script
    candidate = os.path.join(script_dir, "brand.yaml")
    if os.path.exists(candidate):
        return candidate
    return None


def _warn_config_fallback(reason):
    """Print a loud warning to stderr once per process when falling back."""
    global _brand_config_warned
    if not _brand_config_warned:
        print(f"WARNING: brand.yaml not loaded ({reason}) — using fallback slop patterns. "
              f"Fix this: slop-check is running on hardcoded defaults, not your brand config.",
              file=sys.stderr)
        _brand_config_warned = True


def _read_openclaw_env(key):
    """Read a key from ~/.openclaw/openclaw.json env block. Returns str or None."""
    oc_path = os.path.expanduser("~/.openclaw/openclaw.json")
    if not os.path.exists(oc_path):
        return None
    try:
        with open(oc_path, "r") as f:
            return json.loads(f.read()).get("env", {}).get(key)
    except Exception:
        return None


def load_brand_config():
    """Load brand.yaml from the workspace root. Returns dict or None.

    Cached after first load within a process. The config file is found by
    looking for brand.yaml one directory up from this script (which lives
    in REFERENCE/).
    """
    global _brand_config_cache
    if _brand_config_cache is not None:
        return _brand_config_cache

    yaml_path = _find_brand_yaml()
    if yaml_path is None:
        _warn_config_fallback("brand.yaml not found")
        return None

    try:
        import yaml
    except ImportError:
        _warn_config_fallback("PyYAML not installed")
        return None

    try:
        with open(yaml_path, "r") as f:
            _brand_config_cache = yaml.safe_load(f)
        if not isinstance(_brand_config_cache, dict):
            _brand_config_cache = None
            _warn_config_fallback("brand.yaml parsed but is not a dict")
            return None
        return _brand_config_cache
    except Exception as e:
        _warn_config_fallback(f"YAML parse error: {e}")
        return None


def get_valid_zones():
    """Return set of valid zone slugs from brand config, or empty set."""
    config = load_brand_config()
    if config and "domain" in config and "zones" in config["domain"]:
        return {z["slug"] for z in config["domain"]["zones"]}
    return set()


def get_slop_patterns():
    """Return (hard_fail_patterns, warn_patterns) from brand config.

    Each list contains (regex_string, name) tuples.
    Falls back to hardcoded patterns if config can't be loaded — never
    returns empty lists, because empty lists mean zero slop enforcement.
    """
    config = load_brand_config()
    if config and "slop" in config:
        slop = config["slop"]
        hard_fail = [(p["pattern"], p["name"]) for p in slop.get("hard_fail", [])]
        warn = [(p["pattern"], p["name"]) for p in slop.get("warn", [])]
        if hard_fail:
            return hard_fail, warn
        # Config exists but has no hard_fail patterns — that's a real problem
        _warn_config_fallback("slop.hard_fail is empty in brand.yaml")

    return list(_FALLBACK_HARD_FAIL_PATTERNS), list(_FALLBACK_WARN_PATTERNS)


def err(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)


# ---- Importable core functions ----

def compute_slug(text):
    """Deterministic slugification. Returns the slug string."""
    slug = text.lower().strip()
    slug = re.sub(r"[''\"\"\"]+", "", slug)
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    if len(slug) > 80:
        slug = slug[:80].rsplit("-", 1)[0]
    return slug


def validate_entry(entry, filepath):
    """Validate an entry dict. Returns (ok: bool, error_msg: str|None)."""
    if not isinstance(entry, dict):
        return False, "Entry must be a JSON object"

    for field in BANNED_FIELDS:
        if field in entry:
            return False, f"Rejected: field '{field}' is not allowed. Use 'sources' instead."

    entry_type = entry.get("type")

    if "verdict" in entry and "type" in entry:
        return False, "Rejected: entry has both 'verdict' and 'type' — merged card+deepdive."

    for field in ("qa", "card", "dossier", "brief", "draft", "shortForm"):
        val = entry.get(field, "")
        if isinstance(val, str) and INVALID_QA_DIR in val:
            return False, f"Rejected: path in '{field}' uses '{INVALID_QA_DIR}'."
        if isinstance(val, str) and " " in val:
            return False, f"Rejected: path in '{field}' contains spaces."

    if filepath.endswith("dossier-index.jsonl"):
        schema_key = entry_type
        if schema_key not in LANE_SCHEMAS:
            return False, f"Unknown entry type: '{entry_type}'."
        required = LANE_SCHEMAS[schema_key]
        if schema_key is None and "type" in entry:
            return False, "Card entries must not have a 'type' field."
        missing = required - set(entry.keys())
        if missing:
            return False, f"Missing required fields for {entry_type or 'card'}: {', '.join(sorted(missing))}"

    return True, None


def append_entry(filepath, entry):
    """Validate and append an entry to a JSONL file. Returns (ok, error_msg).
    Handles locking and dedup for dossier-index.jsonl."""
    ok, error = validate_entry(entry, filepath)
    if not ok:
        return False, error

    entry_type = entry.get("type")

    if filepath.endswith("dossier-index.jsonl"):
        lock_fd = acquire_lock()
        try:
            existing = read_jsonl(filepath)
            entry_id = entry.get("id")
            for _, ex in existing:
                if ex.get("id") == entry_id and ex.get("type") == entry_type:
                    if entry_type == "draft" and entry.get("format") != ex.get("format"):
                        continue
                    if entry_type == "qa" and not entry.get("autoApproved"):
                        continue
                    if entry_type == "revision" and entry.get("revisionRound") != ex.get("revisionRound"):
                        continue
                    return False, f"Duplicate: id='{entry_id}' type='{entry_type}' already exists."
            with open(filepath, "a") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        finally:
            release_lock(lock_fd)
    else:
        lock_fd = acquire_lock()
        try:
            with open(filepath, "a") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        finally:
            release_lock(lock_fd)

    return True, None


def update_topic_status(topic_id, new_status):
    """Update a topic's status in topic-queue.jsonl. Returns (ok, error_msg)."""
    if new_status not in ("queued", "done", "blocked"):
        return False, f"Invalid status '{new_status}'."

    lock_fd = acquire_lock()
    try:
        entries = read_jsonl(QUEUE_FILE)
        if not entries:
            return False, f"Queue file '{QUEUE_FILE}' is empty or missing."

        found = False
        lines = []
        for _, entry in entries:
            if entry.get("id") == topic_id:
                entry["status"] = new_status
                found = True
            lines.append(json.dumps(entry, ensure_ascii=False))

        if not found:
            release_lock(lock_fd)
            return False, f"Topic '{topic_id}' not found in queue."

        tmp = QUEUE_FILE + ".tmp"
        with open(tmp, "w") as f:
            for line in lines:
                f.write(line + "\n")
        os.replace(tmp, QUEUE_FILE)
    finally:
        release_lock(lock_fd)

    return True, None


def load_priority_ids():
    """Load the priority queue. Returns a list of topic IDs (ordered)."""
    if os.path.exists(PRIORITY_FILE):
        try:
            with open(PRIORITY_FILE, "r") as f:
                data = json.load(f)
            return [item["id"] for item in data if "id" in item]
        except (json.JSONDecodeError, ValueError, KeyError):
            pass
    return []


def save_priority(entries):
    """Save the priority queue."""
    os.makedirs(os.path.dirname(PRIORITY_FILE), exist_ok=True)
    with open(PRIORITY_FILE, "w") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)


def load_feedback():
    """Load feedback entries from feedback.json. Returns a list."""
    if os.path.exists(FEEDBACK_FILE):
        try:
            with open(FEEDBACK_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, ValueError):
            pass
    return []


def save_feedback(entries):
    """Save feedback entries to feedback.json."""
    os.makedirs(os.path.dirname(FEEDBACK_FILE), exist_ok=True)
    with open(FEEDBACK_FILE, "w") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)


def compute_next_eligible(lane, exclude_ids=None):
    """Compute the next eligible item for a lane. Returns dict or "NONE".

    exclude_ids: optional set of topic IDs to skip (e.g. items that have
    failed repeatedly and need human review).

    Priority items (from .state/priority.json) are checked first in each lane.
    """
    exclude_ids = exclude_ids or set()
    priority_ids = set(load_priority_ids())
    index_entries = read_jsonl(INDEX_FILE)
    index = [e for _, e in index_entries]

    ids_in_index = {e["id"] for e in index}
    ids_with_type = {}
    for e in index:
        key = (e.get("id"), e.get("type"))
        ids_with_type.setdefault(key, []).append(e)

    def has_type(tid, ttype):
        return (tid, ttype) in ids_with_type

    def _skip(e):
        return e.get("id") in exclude_ids

    def _priority_sort(items):
        """Stable reorder: priority items first, then the rest in original order."""
        if not priority_ids:
            return items
        pri = [e for e in items if e.get("id") in priority_ids]
        rest = [e for e in items if e.get("id") not in priority_ids]
        return pri + rest

    if lane == "card":
        queue_entries = read_jsonl(QUEUE_FILE)
        priority_order = {"high": 0, "medium": 1}
        queued = [(i, e) for i, e in queue_entries if e.get("status") == "queued"]
        queued.sort(key=lambda x: (
            0 if x[1].get("id") in priority_ids else 1,
            priority_order.get(x[1].get("priority", "medium"), 2),
            x[0],
        ))
        for _, e in queued:
            if e["id"] not in ids_in_index and not _skip(e):
                return e
        return "NONE"

    elif lane == "deepdive":
        for e in _priority_sort(index):
            if e.get("type") is None and "verdict" not in e:
                continue
            if e.get("type") is None and e.get("verdict") == "strong":
                if not has_type(e["id"], "deepdive") and not _skip(e):
                    return e
        return "NONE"

    elif lane == "brief":
        for e in _priority_sort(index):
            if e.get("type") == "deepdive":
                if not has_type(e["id"], "brief") and not _skip(e):
                    return e
        return "NONE"

    elif lane == "draft":
        for e in _priority_sort(index):
            if e.get("type") == "brief":
                if not has_type(e["id"], "draft") and not _skip(e):
                    return e
        return "NONE"

    elif lane == "qa":
        def _needs_qa(e):
            eid = e["id"]
            seen_this = False
            for idx_e in index:
                if idx_e is e:
                    seen_this = True
                    continue
                if seen_this and idx_e.get("id") == eid and idx_e.get("type") == "qa":
                    return False
            return True

        # Priority items first across both passes (revisions, then drafts)
        sorted_index = _priority_sort(index)
        for e in sorted_index:
            if e.get("type") == "revision" and _needs_qa(e) and not _skip(e):
                return e
        for e in sorted_index:
            if e.get("type") in ("draft", "short-form") and _needs_qa(e) and not _skip(e):
                return e
        return "NONE"

    elif lane == "revision":
        for e in _priority_sort(index):
            if e.get("type") == "qa" and e.get("qaStatus") == "needs-edits" and not _skip(e):
                eid = e["id"]
                qa_target = None
                for prev_e in index:
                    if prev_e is e:
                        break
                    if prev_e.get("id") == eid and prev_e.get("type") in ("draft", "revision"):
                        qa_target = prev_e
                if qa_target is None:
                    continue
                if qa_target.get("type") == "draft":
                    needed_round = 1
                elif qa_target.get("type") == "revision":
                    needed_round = qa_target.get("revisionRound", 1) + 1
                else:
                    continue
                if needed_round > 2:
                    result = dict(e)
                    result["_capReached"] = True
                    result["_revisionRound"] = needed_round
                    result["_qaTarget"] = qa_target
                    return result
                revisions = ids_with_type.get((eid, "revision"), [])
                has_this_round = any(r.get("revisionRound") == needed_round for r in revisions)
                if not has_this_round:
                    result = dict(e)
                    result["_revisionRound"] = needed_round
                    result["_qaTarget"] = qa_target
                    return result
        return "NONE"

    elif lane == "short-form":
        for e in _priority_sort(index):
            if e.get("type") == "qa" and e.get("qaStatus") == "approved":
                eid = e["id"]
                qa_target = None
                for prev_e in index:
                    if prev_e is e:
                        break
                    if prev_e.get("id") == eid and prev_e.get("type") in ("draft", "revision"):
                        qa_target = prev_e
                if qa_target is None:
                    continue
                if not has_type(eid, "short-form") and not _skip(e):
                    return e
        return "NONE"

    elif lane == "ghost-publish":
        candidates = []
        seen_ids = set()
        for e in _priority_sort(index):
            if e.get("type") == "qa" and e.get("qaStatus") == "approved":
                eid = e["id"]
                if eid in seen_ids:
                    continue
                if not has_type(eid, "ghost-publish") and not _skip(e):
                    candidates.append(e)
                    seen_ids.add(eid)
                    if len(candidates) >= 5:
                        break
        if not candidates:
            return "NONE"
        result = dict(candidates[0])
        result["_candidates"] = candidates
        return result

    else:
        return "NONE"


def compute_queue_depth():
    """Return count of queued topics."""
    entries = read_jsonl(QUEUE_FILE)
    return sum(1 for _, e in entries if e.get("status") == "queued")


def get_llm_classifier_config():
    """Read LLM classifier config from brand.yaml's slop.classifier block."""
    config = load_brand_config()
    if config and "slop" in config:
        return config["slop"].get("classifier", {})
    return {}


_CLASSIFIER_SYSTEM_PROMPT = """\
You are a slop classifier for editorial content. You detect formulaic AI writing patterns that make text feel templated and inauthentic.

Check the draft for these semantic categories (only check the ones listed in the user message):

1. **negation-reframe** — "It wasn't X, it was Y" pattern in any surface form. The writer negates a framing then immediately introduces the "real" framing. Includes: "wasn't about X — it was about Y", "the real story isn't X", "this isn't a story about X, it's a story about Y", and any structural equivalent regardless of exact wording. severity: hard_fail

2. **moralizing-ending** — Grand philosophical conclusions, "lessons learned" framing, abstract takeaways instead of concrete consequences. Paragraphs that zoom out to tell the reader What It All Means instead of showing what actually happened next. Do NOT flag endings that close with a concrete fact, specific image, or named detail — only flag endings that drift into vague abstraction with no specifics attached. severity: hard_fail

3. **false-profundity** — Statements that sound deep but say nothing specific. "And maybe that's the point", "Perhaps that says more about us than about them", "Some questions don't have easy answers." severity: hard_fail

4. **throat-clearing** — Opening a section or paragraph with setup that delays the actual content. "To understand why this matters, we need to...", "But first, some context", "Before we get to the main event..." severity: warn

5. **rhetorical-question-stacking** — Two or more rhetorical questions in sequence used as a transition device instead of just making the point. severity: warn

6. **vague-drama** — Claiming something is significant, remarkable, unprecedented, or important without showing why with specifics. The assertion of significance without evidence. severity: warn

7. **ai-narrative-scaffolding** — Formulaic story beats (setup → twist → lesson) that feel templated rather than organic. Overly neat narrative arcs, especially "everything changed when..." turning points. severity: warn

8. **nostalgia-bait** — Generic "remember when the internet was simple/weird/fun" framing without specific details. Invoking nostalgia as a substitute for actual content. severity: warn

9. **self-narration** — The writer narrating why their own point matters instead of letting the reader judge. "That matters because...", "That distinction is important:", "This is significant:", "The key takeaway here is", "X puts a human cost on Y". Just make the point directly. Do NOT flag sentences that contain a specific factual claim, named entity, or concrete detail — those are arguments, not meta-commentary. Only flag empty explanatory scaffolding with no substance attached. severity: warn

10. **redundancy** — A paragraph whose key facts, examples, or incidents already appeared in an earlier paragraph. If a later paragraph restates the same events in slightly different words, it is redundant. Also flag summary/recap endings that re-list what the article already covered. severity: hard_fail

Respond with ONLY valid JSON — no markdown fences, no explanation. Format:
{"findings": [{"paragraph_number": <int>, "category": "<category-slug>", "excerpt": "<exact quote, max 80 chars>", "severity": "<hard_fail|warn>"}]}

If the draft is clean, respond: {"findings": []}

Be precise. Only flag clear instances, not borderline cases. Quote the exact text.\
"""


def run_llm_slop_check(filepath):
    """LLM-based semantic slop check. Returns findings list or None on error.

    Runs after regex check. Uses Anthropic API with a constrained classifier prompt.
    Gracefully degrades: if API is unreachable or key missing, returns None with
    stderr warning (regex layer still enforces).
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        # Fallback: read from openclaw.json env block
        api_key = _read_openclaw_env("ANTHROPIC_API_KEY")
    if not api_key:
        print("WARNING: ANTHROPIC_API_KEY not set — skipping LLM slop classifier.", file=sys.stderr)
        return None

    classifier_config = get_llm_classifier_config()
    if not classifier_config or not classifier_config.get("enabled"):
        return None

    model = classifier_config.get("model", "claude-haiku-4-5-20251001")
    categories = classifier_config.get("categories", [])
    if not categories:
        return None

    try:
        with open(filepath, "r") as f:
            text = f.read()
    except Exception:
        return None

    # Split into numbered paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    numbered = "\n\n".join(f"[{i+1}] {p}" for i, p in enumerate(paragraphs))

    user_message = f"Categories to check: {', '.join(categories)}\n\nDraft text (paragraphs numbered):\n\n{numbered}"

    request_body = json.dumps({
        "model": model,
        "max_tokens": 1024,
        "temperature": 0,
        "system": _CLASSIFIER_SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_message}],
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=request_body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            response_data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as e:
        print(f"WARNING: LLM slop classifier failed ({e}) — regex layer still enforces.", file=sys.stderr)
        return None
    except Exception as e:
        print(f"WARNING: LLM slop classifier unexpected error ({e}) — regex layer still enforces.", file=sys.stderr)
        return None

    # Extract text content from API response
    try:
        content_text = ""
        for block in response_data.get("content", []):
            if block.get("type") == "text":
                content_text += block["text"]
        # Strip markdown fences if present (```json ... ```)
        stripped = content_text.strip()
        if stripped.startswith("```"):
            stripped = re.sub(r"^```(?:json)?\s*\n?", "", stripped)
            stripped = re.sub(r"\n?```\s*$", "", stripped)
        result = json.loads(stripped)
        findings = result.get("findings", [])
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"WARNING: LLM slop classifier returned unparseable response ({e}) — regex layer still enforces.", file=sys.stderr)
        return None

    # Validate and filter findings to only enabled categories
    valid_findings = []
    for f in findings:
        if (isinstance(f, dict)
                and f.get("category") in categories
                and f.get("severity") in ("hard_fail", "warn")
                and isinstance(f.get("paragraph_number"), int)
                and isinstance(f.get("excerpt"), str)):
            valid_findings.append(f)

    return valid_findings


def run_slop_check(filepath, use_llm=True):
    """Run slop check on a file. Returns result dict with status, fails, warns.

    Loads patterns from brand.yaml if available. After the regex pass, runs an
    LLM classifier (if configured and use_llm=True) to catch semantic slop
    patterns that regex can't reach. The LLM layer is additive — regex is
    always the floor. Pass use_llm=False for draft-stage checks where the
    model can't self-fix LLM-flagged issues anyway.
    """
    if not os.path.exists(filepath):
        return {"file": filepath, "status": "ERROR", "error": f"File not found: {filepath}"}

    hard_fail_patterns, warn_patterns = get_slop_patterns()

    with open(filepath, "r") as f:
        lines = f.readlines()

    hard_fails = []
    warnings = []

    for i, line in enumerate(lines, 1):
        line_stripped = line.strip()
        if not line_stripped:
            continue
        for pattern, name in hard_fail_patterns:
            for m in re.finditer(pattern, line_stripped):
                start = max(0, m.start() - 20)
                end = min(len(line_stripped), m.end() + 20)
                hard_fails.append({"line": i, "pattern": name, "context": f"...{line_stripped[start:end]}..."})
        for pattern, name in warn_patterns:
            for m in re.finditer(pattern, line_stripped):
                start = max(0, m.start() - 20)
                end = min(len(line_stripped), m.end() + 20)
                warnings.append({"line": i, "pattern": name, "context": f"...{line_stripped[start:end]}..."})

    # Em-dash density check — warn only (not a hard fail).
    # Models can't reliably self-fix em-dashes; QA+revision handles them
    # with targeted line-by-line instructions. Human does final cleanup.
    body_emdash_count = 0
    emdash_locations = []
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped or stripped.startswith("##") or stripped.startswith("- "):
            continue
        count = stripped.count("—")
        if count:
            body_emdash_count += count
            emdash_locations.append(i)
    if body_emdash_count > 1:
        warnings.append({
            "line": emdash_locations[0],
            "pattern": f"em-dash density: {body_emdash_count} em-dashes in draft (max 1)",
            "context": f"Found on lines: {', '.join(str(l) for l in emdash_locations[:5])}{'...' if len(emdash_locations) > 5 else ''}"
        })
    elif body_emdash_count == 1:
        warnings.append({
            "line": emdash_locations[0],
            "pattern": "em-dash present (1 is tolerable but prefer avoiding)",
            "context": f"Line {emdash_locations[0]}"
        })

    # LLM classifier (second pass) — skip when use_llm=False (draft stage)
    llm_findings = run_llm_slop_check(filepath) if use_llm else []
    if llm_findings:
        for f in llm_findings:
            entry = {"line": f["paragraph_number"], "pattern": f"[LLM] {f['category']}", "context": f["excerpt"]}
            if f["severity"] == "hard_fail":
                hard_fails.append(entry)
            else:
                warnings.append(entry)

    result = {"file": filepath, "hard_fails": len(hard_fails), "warnings": len(warnings)}
    if hard_fails:
        result["status"] = "FAIL"
        result["fails"] = hard_fails
    else:
        result["status"] = "PASS"
    if warnings:
        result["warns"] = warnings

    return result


def read_jsonl(path):
    """Read a JSONL file, returning list of (line_number, parsed_dict) tuples."""
    entries = []
    if not os.path.exists(path):
        return entries
    with open(path, "r") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entries.append((i, json.loads(line)))
            except json.JSONDecodeError as e:
                err(f"JSONL parse error in {path} line {i}: {e}")
    return entries


def acquire_lock():
    """Acquire a file lock for concurrency safety."""
    fd = open(LOCKFILE, "w")
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        fcntl.flock(fd, fcntl.LOCK_EX)
    return fd


def release_lock(fd):
    fcntl.flock(fd, fcntl.LOCK_UN)
    fd.close()


# ---- Write commands ----

def cmd_append(args):
    """Append a validated JSON entry to a JSONL file."""
    filepath = args.file
    try:
        entry = json.loads(args.json_str)
    except json.JSONDecodeError as e:
        err(f"Invalid JSON: {e}")

    if not isinstance(entry, dict):
        err("Entry must be a JSON object")

    for field in BANNED_FIELDS:
        if field in entry:
            err(f"Rejected: field '{field}' is not allowed. Use 'sources' instead.")

    entry_type = entry.get("type")

    if "verdict" in entry and "type" in entry:
        err("Rejected: entry has both 'verdict' and 'type' — this looks like a merged card+deepdive entry. Write them as separate lines.")

    for field in ("qa", "card", "dossier", "brief", "draft", "shortForm"):
        val = entry.get(field, "")
        if isinstance(val, str) and INVALID_QA_DIR in val:
            err(f"Rejected: path in '{field}' uses '{INVALID_QA_DIR}' — use '{VALID_QA_DIR}' instead.")

    for field in ("qa", "card", "dossier", "brief", "draft", "shortForm"):
        val = entry.get(field, "")
        if isinstance(val, str) and " " in val:
            err(f"Rejected: path in '{field}' contains spaces. Use hyphens instead.")

    if filepath.endswith("dossier-index.jsonl"):
        schema_key = entry_type
        if schema_key not in LANE_SCHEMAS:
            err(f"Unknown entry type: '{entry_type}'. Valid types: {', '.join(str(k) for k in LANE_SCHEMAS.keys())}")
        required = LANE_SCHEMAS[schema_key]
        optional = OPTIONAL_FIELDS.get(schema_key, set())
        allowed = required | optional | {"type"} if schema_key is None else required | optional
        if schema_key is None:
            allowed = required | optional
            if "type" in entry:
                err("Card entries (first-pass) must not have a 'type' field.")
        missing = required - set(entry.keys())
        if missing:
            err(f"Missing required fields for {entry_type or 'card'} entry: {', '.join(sorted(missing))}")

        lock_fd = acquire_lock()
        try:
            existing = read_jsonl(filepath)
            entry_id = entry.get("id")
            for _, ex in existing:
                if ex.get("id") == entry_id and ex.get("type") == entry_type:
                    if entry_type == "draft" and entry.get("format") != ex.get("format"):
                        continue
                    if entry_type == "qa" and not entry.get("autoApproved"):
                        continue
                    if entry_type == "revision" and entry.get("revisionRound") != ex.get("revisionRound"):
                        continue
                    err(f"Duplicate: entry with id='{entry_id}' type='{entry_type}' already exists in the index.")

            with open(filepath, "a") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        finally:
            release_lock(lock_fd)
    else:
        lock_fd = acquire_lock()
        try:
            with open(filepath, "a") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        finally:
            release_lock(lock_fd)

    print(json.dumps({"status": "ok", "appended": entry}))


def cmd_update_status(args):
    """Update one topic's status in topic-queue.jsonl."""
    topic_id = args.id
    new_status = args.new_status
    if new_status not in ("queued", "done", "blocked"):
        err(f"Invalid status '{new_status}'. Must be: queued, done, blocked")

    lock_fd = acquire_lock()
    try:
        entries = read_jsonl(QUEUE_FILE)
        if not entries:
            err(f"Queue file '{QUEUE_FILE}' is empty or missing.")

        found = False
        lines = []
        for _, entry in entries:
            if entry.get("id") == topic_id:
                entry["status"] = new_status
                found = True
            lines.append(json.dumps(entry, ensure_ascii=False))

        if not found:
            release_lock(lock_fd)
            err(f"Topic '{topic_id}' not found in queue.")

        tmp = QUEUE_FILE + ".tmp"
        with open(tmp, "w") as f:
            for line in lines:
                f.write(line + "\n")
        os.replace(tmp, QUEUE_FILE)
    finally:
        release_lock(lock_fd)

    print(json.dumps({"status": "ok", "id": topic_id, "newStatus": new_status}))


def cmd_slug(args):
    """Deterministic slugification."""
    text = args.text
    slug = compute_slug(text)
    print(json.dumps(slug))


def cmd_check(args):
    """Validate every line of a JSONL file parses as valid JSON."""
    filepath = args.file
    if not os.path.exists(filepath):
        err(f"File not found: {filepath}")

    errors = []
    count = 0
    with open(filepath, "r") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            count += 1
            try:
                obj = json.loads(line)
                for field in BANNED_FIELDS:
                    if field in obj:
                        errors.append(f"Line {i}: banned field '{field}' (use 'sources')")
                if filepath.endswith("dossier-index.jsonl"):
                    if "verdict" in obj and "type" in obj:
                        errors.append(f"Line {i}: merged entry (has both 'verdict' and 'type')")
                    for field in ("qa", "card", "dossier", "brief", "draft", "shortForm"):
                        val = obj.get(field, "")
                        if isinstance(val, str) and INVALID_QA_DIR in val:
                            errors.append(f"Line {i}: path '{val}' uses '{INVALID_QA_DIR}'")
                    for field in ("qa", "card", "dossier", "brief", "draft", "shortForm"):
                        val = obj.get(field, "")
                        if isinstance(val, str) and " " in val:
                            errors.append(f"Line {i}: path '{val}' contains spaces")
            except json.JSONDecodeError as e:
                errors.append(f"Line {i}: {e}")

    if errors:
        result = {"status": "errors", "count": len(errors), "total_lines": count, "errors": errors}
        print(json.dumps(result, indent=2))
        sys.exit(1)
    else:
        print(json.dumps({"status": "ok", "total_lines": count}))


# ---- Read commands ----

def cmd_next_topic(args):
    """Return the first queued topic from the queue."""
    entries = read_jsonl(QUEUE_FILE)
    priority_order = {"high": 0, "medium": 1}
    queued = [(i, e) for i, e in entries if e.get("status") == "queued"]
    queued.sort(key=lambda x: (priority_order.get(x[1].get("priority", "medium"), 2), x[0]))

    if not queued:
        print('"NONE"')
        return
    print(json.dumps(queued[0][1]))


def cmd_next_eligible(args):
    """Return the single next eligible item for a given lane."""
    lane = args.lane
    result = compute_next_eligible(lane)
    if result == "NONE":
        print('"NONE"')
    else:
        print(json.dumps(result, default=str))


def cmd_query_index(args):
    """Return all index entries for one topic."""
    topic_id = args.id
    entries = read_jsonl(INDEX_FILE)
    matches = [e for _, e in entries if e.get("id") == topic_id]
    print(json.dumps(matches, indent=2))


def cmd_queue_depth(args):
    """Return count of queued topics."""
    print(json.dumps(compute_queue_depth()))


def cmd_slop_check(args):
    """Hybrid slop check — regex patterns + optional LLM classifier.

    First pass: greps for known AI-ism patterns (fast, deterministic, free).
    Second pass: LLM classifier catches semantic slop regex can't reach (if configured).
    Returns pass/fail with specific line numbers and matches.
    Exit code 0 = clean, exit code 1 = slop found.
    """
    filepath = args.file
    if not os.path.exists(filepath):
        err(f"File not found: {filepath}")

    use_llm = not getattr(args, 'no_llm', False)
    result = run_slop_check(filepath, use_llm=use_llm)
    print(json.dumps(result, indent=2))
    if result.get("status") == "FAIL":
        sys.exit(1)


def _strip_html(html_bytes, encoding="utf-8"):
    """Strip HTML tags and decode to plain text. Stdlib only."""
    try:
        text = html_bytes.decode(encoding, errors="replace")
    except Exception:
        text = html_bytes.decode("utf-8", errors="replace")
    # Remove script/style blocks
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    # Remove tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Decode common entities
    for entity, char in [("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
                         ("&quot;", '"'), ("&#39;", "'"), ("&apos;", "'"),
                         ("&nbsp;", " "), ("&#8217;", "\u2019"), ("&#8216;", "\u2018"),
                         ("&#8220;", "\u201c"), ("&#8221;", "\u201d"),
                         ("&mdash;", "\u2014"), ("&ndash;", "\u2013"),
                         ("&rsquo;", "\u2019"), ("&lsquo;", "\u2018"),
                         ("&rdquo;", "\u201d"), ("&ldquo;", "\u201c")]:
        text = text.replace(entity, char)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _normalize_for_match(text):
    """Normalize text for fuzzy comparison: lowercase, collapse whitespace/punctuation variants."""
    t = text.lower()
    # Normalize quotes and apostrophes
    t = re.sub(r"[\u2018\u2019\u201a\u201b`\u0060]", "'", t)
    t = re.sub(r"[\u201c\u201d\u201e\u201f]", '"', t)
    # Normalize dashes
    t = re.sub(r"[\u2013\u2014\u2015]", "-", t)
    # Collapse whitespace
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _extract_section(content, header_pattern):
    """Extract text between a section header and the next section header.

    Recognizes section boundaries as: lines starting with # marks, OR lines that
    match known dossier section names (to handle dossiers written without # markers).
    """
    # Known section names that act as boundaries (case-insensitive)
    _SECTION_NAMES = (
        r"Topic|Verdict|Why this topic|Era\s*/?\s*date|Core thesis|Fast summary|"
        r"Key facts|Cultural context|Internet behavior|Drama|Notable people|"
        r"Receipts|Sources|Strong pull quotes|Open questions|Future post angles|"
        r"Upgrade path"
    )
    # Match: line starting with optional # + our pattern, capture until next section boundary
    boundary = r"(?:^#{1,3}\s|^(?:" + _SECTION_NAMES + r")\s*$)"
    match = re.search(
        r"(?:^#{0,3}\s*" + header_pattern + r")\s*\n(.*?)(?=" + boundary + r"|\Z)",
        content,
        re.MULTILINE | re.DOTALL | re.IGNORECASE,
    )
    return match.group(1) if match else ""


def _extract_quotes(content):
    """Extract quoted strings from the pull quotes section of a dossier.

    Returns list of dicts: {"text": str, "attribution": str}
    Handles formats:
      - "quote text" — Attribution
      - *"quote text"* — Attribution
      - **"quote text"** — Attribution
      - Attribution: "quote text"
    """
    section = _extract_section(content, r"Strong pull quotes[^\n]*")
    if not section:
        return []

    quotes = []
    # Process line by line to stay within the section and avoid noise
    for line in section.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        # Pattern 1: quoted text (possibly wrapped in * or **) followed by em-dash + attribution
        m = re.search(
            r'(?:\*{0,2})"([^"]{10,})"(?:\*{0,2})\s*(?:[—\-]+)\s*(.+?)$',
            line,
        )
        if m:
            attr = re.sub(r"\*{1,2}", "", m.group(2)).strip()
            quotes.append({"text": m.group(1).strip(), "attribution": attr})
            continue

        # Pattern 2: Attribution: "quote" or Attribution (*context*): "quote"
        m = re.search(
            r'(?:\*{0,2})([A-Z][^"]{2,60})(?:\*{0,2})\s*[:]\s*(?:\*{0,2})"([^"]{10,})"',
            line,
        )
        if m:
            text = m.group(2).strip()
            attr = re.sub(r"\*{1,2}", "", m.group(1)).strip()
            if not any(q["text"] == text for q in quotes):
                quotes.append({"text": text, "attribution": attr})

    return quotes


def _extract_names_from_sources(sources_text):
    """Extract person/author names mentioned near URLs in the sources section.

    Returns list of dicts: {"name": str, "url": str}
    """
    results = []
    lines = sources_text.strip().split("\n")
    for line in lines:
        urls = re.findall(r"https?://[^\s)>\]\"']+", line)
        if not urls:
            continue
        url = urls[0]
        # Extract names: look for patterns like "by Name", "Name,", "— Name,"
        # Bold names: **Name**
        bold_names = re.findall(r"\*\*([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\*\*", line)
        # "by Name" pattern
        by_names = re.findall(r"(?:by|BY)\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)", line)
        # "Name — " or "Name, " at start after bullet/number
        leading_names = re.findall(
            r"^[-*\d.]+\s*(?:\*\*)?([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)(?:\*\*)?\s*[,—\-]",
            line,
        )
        # Combine, dedup
        names = list(dict.fromkeys(bold_names + by_names + leading_names))
        for name in names:
            results.append({"name": name, "url": url})
    return results


def _fetch_url(url):
    """Fetch a URL and return (status_code, page_text) or (error_code, error_msg)."""
    headers = {"User-Agent": "Mozilla/5.0 (pipeline-tools source-verify/1.0)"}
    try:
        req = urllib.request.Request(url, headers=headers)
        resp = urllib.request.urlopen(req, timeout=15)
        code = resp.getcode()
        # Read up to 500KB to avoid huge pages
        raw = resp.read(512000)
        # Detect encoding from Content-Type header
        ct = resp.headers.get("Content-Type", "")
        enc = "utf-8"
        if "charset=" in ct:
            enc = ct.split("charset=")[-1].split(";")[0].strip()
        text = _strip_html(raw, enc)
        return code, text
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:
        return None, str(e)


def _check_quote_in_pages(quote_text, page_texts):
    """Check if a quote appears in any fetched page. Returns (found: bool, url: str|None, method: str|None).

    Tries three strategies:
    1. Exact normalized substring match
    2. First-20-words match (catches slight tail variations)
    3. 8-word sliding window (catches quotes with minor interior edits)
    """
    norm_quote = _normalize_for_match(quote_text)

    # Strategy 1: full normalized match
    for url, page_norm in page_texts.items():
        if norm_quote in page_norm:
            return True, url, "exact"

    # Strategy 2: first 20 words
    words = norm_quote.split()
    if len(words) > 8:
        prefix = " ".join(words[:20])
        for url, page_norm in page_texts.items():
            if prefix in page_norm:
                return True, url, "prefix"

    # Strategy 3: 8-word sliding window — at least 3 of 4 windows must match
    if len(words) > 12:
        window_size = 8
        windows = [" ".join(words[i:i + window_size]) for i in range(0, len(words) - window_size + 1, 4)]
        for url, page_norm in page_texts.items():
            hits = sum(1 for w in windows if w in page_norm)
            if len(windows) > 0 and hits >= max(2, len(windows) * 0.6):
                return True, url, "sliding-window"

    return False, None, None


def verify_sources(filepath):
    """Verify dossier sources: URL resolution, quote verification, and name verification.

    Phase 1: Check all URLs resolve (HEAD, fallback to GET).
    Phase 2: Fetch page content for URLs that resolved.
    Phase 3: Check pull quotes appear on cited pages.
    Phase 4: Check attributed names appear on cited pages.

    Returns structured results with per-item pass/fail.
    Exit code 0 = all passed, exit code 1 = any failures.
    """
    if not os.path.exists(filepath):
        return {"status": "ERROR", "error": f"File not found: {filepath}"}

    with open(filepath, "r") as f:
        content = f.read()

    # --- Phase 1: Extract and resolve URLs ---
    sources_text = _extract_section(content, r"Receipts\s*/?\s*sources?|Sources\s*cited")
    if not sources_text:
        return {"status": "SKIP", "message": "No Receipts/sources section found"}

    urls = re.findall(r"https?://[^\s)>\]\"']+", sources_text)
    if not urls:
        return {"status": "SKIP", "message": "No URLs found in sources section"}

    url_results = []
    for url in urls:
        entry = {"url": url, "status": None, "code": None, "error": None}
        try:
            req = urllib.request.Request(url, method="HEAD", headers={
                "User-Agent": "Mozilla/5.0 (pipeline-tools source-verify/1.0)",
            })
            resp = urllib.request.urlopen(req, timeout=10)
            entry["code"] = resp.getcode()
            entry["status"] = "ok"
        except urllib.error.HTTPError as e:
            if e.code == 405:
                try:
                    req = urllib.request.Request(url, headers={
                        "User-Agent": "Mozilla/5.0 (pipeline-tools source-verify/1.0)",
                    })
                    resp = urllib.request.urlopen(req, timeout=10)
                    entry["code"] = resp.getcode()
                    entry["status"] = "ok"
                except urllib.error.HTTPError as e2:
                    entry["code"] = e2.code
                    entry["status"] = "fail"
                    entry["error"] = str(e2.reason)
                except Exception as e2:
                    entry["status"] = "fail"
                    entry["error"] = str(e2)
            else:
                entry["code"] = e.code
                entry["status"] = "fail"
                entry["error"] = str(e.reason)
        except Exception as e:
            entry["status"] = "fail"
            entry["error"] = str(e)
        url_results.append(entry)

    # --- Phase 2: Fetch page content for resolved URLs ---
    page_texts = {}  # url -> normalized page text
    live_urls = [r["url"] for r in url_results if r["status"] == "ok"]
    for url in live_urls:
        code, text = _fetch_url(url)
        if text and isinstance(text, str):
            page_texts[url] = _normalize_for_match(text)

    # --- Phase 3: Quote verification ---
    quotes = _extract_quotes(content)
    quote_results = []
    for q in quotes:
        found, found_url, method = _check_quote_in_pages(q["text"], page_texts)
        quote_results.append({
            "quote": q["text"][:120] + ("..." if len(q["text"]) > 120 else ""),
            "attribution": q["attribution"],
            "status": "verified" if found else "unverified",
            "found_on": found_url,
            "method": method,
        })

    # --- Phase 4: Name verification ---
    name_entries = _extract_names_from_sources(sources_text)
    name_results = []
    for ne in name_entries:
        url = ne["url"]
        name_norm = _normalize_for_match(ne["name"])
        if url in page_texts and name_norm in page_texts[url]:
            name_results.append({"name": ne["name"], "url": url, "status": "verified"})
        else:
            name_results.append({"name": ne["name"], "url": url, "status": "unverified"})

    # --- Aggregate ---
    url_passed = sum(1 for r in url_results if r["status"] == "ok")
    url_failed = sum(1 for r in url_results if r["status"] == "fail")
    quotes_verified = sum(1 for r in quote_results if r["status"] == "verified")
    quotes_unverified = sum(1 for r in quote_results if r["status"] == "unverified")
    names_verified = sum(1 for r in name_results if r["status"] == "verified")
    names_unverified = sum(1 for r in name_results if r["status"] == "unverified")

    # Overall status: FAIL if any URLs are dead or any quotes are unverified.
    # Names are WARN-only (names may appear in different forms on the page).
    has_failures = url_failed > 0 or quotes_unverified > 0
    overall = "FAIL" if has_failures else "PASS"

    return {
        "status": overall,
        "urls": {
            "total": len(url_results),
            "passed": url_passed,
            "failed": url_failed,
            "results": url_results,
        },
        "quotes": {
            "total": len(quote_results),
            "verified": quotes_verified,
            "unverified": quotes_unverified,
            "results": quote_results,
        },
        "names": {
            "total": len(name_results),
            "verified": names_verified,
            "unverified": names_unverified,
            "results": name_results,
        },
        "pages_fetched": len(page_texts),
    }


def cmd_verify_sources(args):
    """Verify URLs, quotes, and name attributions in a dossier's sources."""
    filepath = args.file
    result = verify_sources(filepath)
    print(json.dumps(result, indent=2))
    if result.get("status") == "FAIL":
        sys.exit(1)


def cmd_ghost_publish(args):
    """Publish a draft markdown file to Ghost as a draft post."""
    filepath = args.file
    if not os.path.isfile(filepath):
        print(f"ERROR: File not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    # Extract title — try ## Topic first, fall back to first # heading
    title = _extract_draft_section(filepath, "Topic")
    if not title:
        with open(filepath, "r") as f:
            for line in f:
                if line.startswith("# "):
                    title = line.lstrip("# ").strip()
                    break
    if not title:
        title = os.path.basename(filepath).replace(".md", "").replace("-", " ").title()

    # Extract body from ## Draft section
    body = _extract_draft_section(filepath, "Draft")
    if not body:
        # Fall back to full file content
        with open(filepath, "r") as f:
            body = f.read()

    # Append sources list if present
    sources = _extract_draft_section(filepath, "Sources cited")
    if sources:
        body = body.rstrip() + "\n\n---\n\n### Sources\n\n" + sources.strip() + "\n"

    # Check for an explicit # Title inside the body (some drafts use this)
    body_lines = body.split("\n")
    if body_lines and body_lines[0].startswith("# "):
        title = body_lines[0].lstrip("# ").strip()
        body = "\n".join(body_lines[1:]).strip()

    # Load Ghost config from brand.yaml
    config = load_brand_config()
    if not config or "ghost" not in config:
        print("ERROR: No ghost config in brand.yaml", file=sys.stderr)
        sys.exit(1)

    ghost_config = config["ghost"]
    ghost_url = ghost_config["url"].rstrip("/")
    api_key_env = ghost_config.get("admin_api_key_env", "GHOST_ADMIN_API_KEY")

    api_key = os.environ.get(api_key_env)
    if not api_key:
        print(f"ERROR: Environment variable {api_key_env} not set", file=sys.stderr)
        sys.exit(1)

    # Split key into id:secret
    if ":" not in api_key:
        print(f"ERROR: {api_key_env} must be in format 'id:secret'", file=sys.stderr)
        sys.exit(1)

    key_id, secret_hex = api_key.split(":", 1)
    token = _make_ghost_jwt(key_id, secret_hex)

    # Build Mobiledoc payload with markdown card
    mobiledoc = json.dumps({
        "version": "0.3.1",
        "markups": [],
        "atoms": [],
        "cards": [["markdown", {"markdown": body}]],
        "sections": [[10, 0]],
    })

    post_data = json.dumps({
        "posts": [{
            "title": title,
            "mobiledoc": mobiledoc,
            "status": "draft",
        }]
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{ghost_url}/ghost/api/admin/posts/",
        data=post_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Ghost {token}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            response_data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        print(f"ERROR: Ghost API returned {e.code}: {error_body}", file=sys.stderr)
        sys.exit(1)
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        print(f"ERROR: Ghost API request failed: {e}", file=sys.stderr)
        sys.exit(1)

    post = response_data.get("posts", [{}])[0]
    ghost_post_url = post.get("url", "")
    ghost_id = post.get("id", "")

    result = {
        "ghostUrl": ghost_post_url,
        "ghostId": ghost_id,
        "title": title,
    }
    print(json.dumps(result, indent=2))


STAGE_APPEND_FILE = os.path.join("REFERENCE", ".state", "stage-append.jsonl")


def cmd_priority(args):
    """Manage the priority queue."""
    action = args.action

    if action == "list":
        if os.path.exists(PRIORITY_FILE):
            with open(PRIORITY_FILE, "r") as f:
                try:
                    data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    data = []
        else:
            data = []
        print(json.dumps({"priority": data}, indent=2))
        return

    if action == "clear":
        save_priority([])
        print(json.dumps({"status": "ok", "cleared": True}))
        return

    if not args.id:
        print(json.dumps({"error": f"'id' is required for priority {action}"}), file=sys.stderr)
        sys.exit(1)

    topic_id = args.id

    # Load existing
    if os.path.exists(PRIORITY_FILE):
        with open(PRIORITY_FILE, "r") as f:
            try:
                data = json.load(f)
            except (json.JSONDecodeError, ValueError):
                data = []
    else:
        data = []

    if action == "add":
        if any(item.get("id") == topic_id for item in data):
            print(json.dumps({"status": "ok", "already_present": True, "id": topic_id}))
            return
        data.append({
            "id": topic_id,
            "addedAt": datetime.now(timezone.utc).isoformat(),
        })
        save_priority(data)
        print(json.dumps({"status": "ok", "added": topic_id, "queue_size": len(data)}))

    elif action == "remove":
        before = len(data)
        data = [item for item in data if item.get("id") != topic_id]
        save_priority(data)
        removed = before - len(data)
        print(json.dumps({"status": "ok", "removed": topic_id, "found": removed > 0}))


def _topic_latest_type(topic_id):
    """Return the latest entry type for a topic from the index, or None."""
    index_entries = read_jsonl(INDEX_FILE)
    latest_type = None
    for _, e in index_entries:
        if e.get("id") == topic_id:
            latest_type = e.get("type")  # last one wins (append-only)
    return latest_type


# Lane progression order for determining if a topic has passed a lane.
# None = card (no type field). Later index = further along.
_LANE_ORDER = [None, "deepdive", "brief", "draft", "qa", "revision", "short-form", "ghost-publish"]


def _topic_past_lane(topic_id, target_lane):
    """Check if a topic has already progressed past the target lane.

    Returns (past: bool, latest_type: str|None, qa_approved: bool).
    """
    index_entries = read_jsonl(INDEX_FILE)
    latest_type = None
    qa_approved = False
    for _, e in index_entries:
        if e.get("id") == topic_id:
            latest_type = e.get("type")
            if e.get("type") == "qa" and e.get("qaStatus") == "approved":
                qa_approved = True

    if latest_type is None and target_lane == "*":
        return False, latest_type, qa_approved

    # Map target lane to its type key
    lane_to_type = {
        "card": None, "deepdive": "deepdive", "brief": "brief",
        "draft": "draft", "qa": "qa", "revision": "revision",
        "short-form": "short-form", "ghost-publish": "ghost-publish", "*": None,
    }
    target_type = lane_to_type.get(target_lane)
    if target_lane == "*":
        return False, latest_type, qa_approved

    try:
        target_idx = _LANE_ORDER.index(target_type)
        latest_idx = _LANE_ORDER.index(latest_type)
    except ValueError:
        return False, latest_type, qa_approved

    return latest_idx > target_idx, latest_type, qa_approved


def _force_revision_via_stage(topic_id, index_entries):
    """Stage a QA needs-edits entry to force a revision round.

    Returns the path to the QA report used, or None if no QA report found.
    """
    # Find the latest QA report path and topic name
    qa_path = ""
    topic_name = ""
    for _, e in index_entries:
        if e.get("id") == topic_id:
            if e.get("type") == "qa" and e.get("qa"):
                qa_path = e["qa"]
            if e.get("topic"):
                topic_name = e["topic"]

    now_ts = datetime.now(timezone.utc).isoformat()
    stage_entry = json.dumps({
        "id": topic_id,
        "topic": topic_name,
        "type": "qa",
        "qa": qa_path,
        "qaStatus": "needs-edits",
        "feedbackForced": True,
        "timestamp": now_ts,
    }, ensure_ascii=False)

    append_path = os.path.join("REFERENCE", ".state", "stage-append.jsonl")
    os.makedirs(os.path.dirname(append_path), exist_ok=True)
    with open(append_path, "a") as f:
        f.write(stage_entry + "\n")
    return qa_path


def cmd_feedback(args):
    """Manage editorial feedback for pipeline lanes."""
    action = args.action

    if action == "list":
        data = load_feedback()
        print(json.dumps({"feedback": data}, indent=2))
        return

    if not args.id:
        print(json.dumps({"error": f"'id' is required for feedback {action}"}), file=sys.stderr)
        sys.exit(1)

    topic_id = args.id
    data = load_feedback()

    if action == "add":
        if not args.text:
            print(json.dumps({"error": "'--text' is required for feedback add"}), file=sys.stderr)
            sys.exit(1)
        lane = args.lane or "*"

        # Check if topic has already passed the target lane
        past, latest_type, qa_approved = _topic_past_lane(topic_id, lane)
        forced_revision = False

        if past and qa_approved:
            # Topic already passed this lane — remap to revision and force a round
            print(json.dumps({
                "warning": f"Topic {topic_id} already past '{lane}' (latest: {latest_type}). "
                           f"Forcing revision round with feedback."
            }), file=sys.stderr)
            lane = "revision"
            index_entries = read_jsonl(INDEX_FILE)
            _force_revision_via_stage(topic_id, index_entries)
            forced_revision = True
        elif past:
            # Past the lane but not QA-approved yet — just warn, it may still
            # be picked up by a later lane naturally
            print(json.dumps({
                "warning": f"Topic {topic_id} already past '{lane}' (latest: {latest_type}). "
                           f"Feedback remapped to revision lane."
            }), file=sys.stderr)
            lane = "revision"

        data.append({
            "id": topic_id,
            "lane": lane,
            "text": args.text,
            "addedAt": datetime.now(timezone.utc).isoformat(),
        })
        save_feedback(data)
        result = {"status": "ok", "added": topic_id, "lane": lane, "entries": len(data)}
        if forced_revision:
            result["forced_revision"] = True
        print(json.dumps(result))

    elif action == "remove":
        before = len(data)
        if args.lane:
            data = [e for e in data if not (e.get("id") == topic_id and e.get("lane") == args.lane)]
        else:
            data = [e for e in data if e.get("id") != topic_id]
        save_feedback(data)
        removed = before - len(data)
        print(json.dumps({"status": "ok", "removed": topic_id, "found": removed > 0, "count": removed}))


def cmd_stage(args):
    """Build a validated JSON entry from CLI args and append to stage-append.jsonl."""
    entry_type = args.type
    # "card" maps to None key in LANE_SCHEMAS (cards have no type field)
    schema_key = None if entry_type == "card" else entry_type
    if schema_key not in LANE_SCHEMAS:
        print(f"Unknown lane type: '{entry_type}'", file=sys.stderr)
        sys.exit(1)

    schema = LANE_SCHEMAS[schema_key]
    optional = OPTIONAL_FIELDS.get(schema_key, set())

    # Build entry from known fields — cards omit the type field
    entry = {"id": args.id, "topic": args.topic}
    if schema_key is not None:
        entry["type"] = entry_type

    # Map CLI args to entry fields based on schema + optional
    field_map = {
        "qa_path": "qa",
        "qa_status": "qaStatus",
        "draft": "draft",
        "dossier": "dossier",
        "brief": "brief",
        "short_form": "shortForm",
        "ghost_url": "ghostUrl",
        "ghost_id": "ghostId",
        "revision_round": "revisionRound",
        "revision_status": "revisionStatus",
        "verdict": "verdict",
        "sources": "sources",
        "card": "card",
        "parent_event": "parentEvent",
        "format": "format",
        "note": "note",
    }

    for arg_name, field_name in field_map.items():
        val = getattr(args, arg_name, None)
        if val is not None:
            # Cast revisionRound and sources to int
            if field_name in ("revisionRound", "sources"):
                try:
                    val = int(val)
                except ValueError:
                    print(f"Field '{field_name}' must be an integer, got '{val}'", file=sys.stderr)
                    sys.exit(1)
            entry[field_name] = val

    # Auto-generate timestamp if not provided
    if args.timestamp:
        entry["timestamp"] = args.timestamp
    else:
        entry["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Validate against schema
    ok, err = validate_entry(entry, INDEX_FILE)
    if not ok:
        print(f"Validation failed: {err}", file=sys.stderr)
        sys.exit(1)

    # Check required fields
    missing = schema - set(entry.keys())
    if missing:
        print(f"Missing required fields for {entry_type}: {', '.join(sorted(missing))}", file=sys.stderr)
        sys.exit(1)

    # Append to stage file
    os.makedirs(os.path.dirname(STAGE_APPEND_FILE), exist_ok=True)
    lock_fd = acquire_lock()
    try:
        with open(STAGE_APPEND_FILE, "a") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    finally:
        release_lock(lock_fd)

    print(json.dumps({"ok": True, "staged": entry}, indent=2))


# ---- Main ----

def main():
    parser = argparse.ArgumentParser(description="Pipeline state manager")
    sub = parser.add_subparsers(dest="command")

    # Write commands
    p_append = sub.add_parser("append", help="Append validated entry to JSONL")
    p_append.add_argument("file", help="JSONL file path")
    p_append.add_argument("json_str", help="JSON string to append")

    p_update = sub.add_parser("update-status", help="Update topic status in queue")
    p_update.add_argument("id", help="Topic ID (e.g. tc-001)")
    p_update.add_argument("new_status", help="New status: queued, done, blocked")

    p_slug = sub.add_parser("slug", help="Deterministic slugification")
    p_slug.add_argument("text", help="Text to slugify")

    p_check = sub.add_parser("check", help="Validate JSONL file")
    p_check.add_argument("file", help="JSONL file path")

    # Read commands
    sub.add_parser("next-topic", help="First queued topic")

    p_eligible = sub.add_parser("next-eligible", help="Next eligible item for a lane")
    p_eligible.add_argument("lane", help="Lane: card, deepdive, brief, draft, qa, revision, short-form")

    p_query = sub.add_parser("query-index", help="All index entries for one topic")
    p_query.add_argument("id", help="Topic ID")

    sub.add_parser("queue-depth", help="Count of queued topics")

    p_slop = sub.add_parser("slop-check", help="Mechanical slop pattern check")
    p_slop.add_argument("file", help="Markdown file to check")
    p_slop.add_argument("--no-llm", action="store_true", help="Skip LLM classifier (regex only)")

    p_verify = sub.add_parser("verify-sources", help="Verify URLs in dossier sources section resolve")
    p_verify.add_argument("file", help="Dossier markdown file to check")

    p_ghost = sub.add_parser("ghost-publish", help="Publish draft to Ghost as draft post")
    p_ghost.add_argument("file", help="Draft markdown file path")

    p_priority = sub.add_parser("priority", help="Manage the priority queue (skip-the-line for lanes)")
    p_priority.add_argument("action", choices=["add", "remove", "list", "clear"], help="Action to perform")
    p_priority.add_argument("id", nargs="?", help="Topic ID (required for add/remove)")

    p_feedback = sub.add_parser("feedback", help="Attach editorial feedback to a topic for a specific lane")
    p_feedback.add_argument("action", choices=["add", "remove", "list"], help="Action to perform")
    p_feedback.add_argument("id", nargs="?", help="Topic ID (required for add/remove)")
    p_feedback.add_argument("--lane", help="Lane to target (draft, brief, qa, revision, short-form, or * for any)")
    p_feedback.add_argument("--text", help="Feedback text (required for add)")

    p_stage = sub.add_parser("stage", help="Stage an index entry (writes to stage-append.jsonl)")
    p_stage.add_argument("--type", required=True, help="Lane type: deepdive, brief, draft, qa, revision, short-form, ghost-publish")
    p_stage.add_argument("--id", required=True, help="Topic ID (e.g. ci-025)")
    p_stage.add_argument("--topic", required=True, help="Topic title")
    p_stage.add_argument("--timestamp", help="ISO timestamp (auto-generated if omitted)")
    p_stage.add_argument("--qa-path", dest="qa_path", help="QA report path (qa lane)")
    p_stage.add_argument("--qa-status", dest="qa_status", help="approved or needs-edits (qa lane)")
    p_stage.add_argument("--draft", help="Draft file path (draft/revision lanes)")
    p_stage.add_argument("--dossier", help="Dossier file path (deepdive lane)")
    p_stage.add_argument("--brief", help="Brief file path (brief lane)")
    p_stage.add_argument("--short-form", dest="short_form", help="Short-form file path")
    p_stage.add_argument("--ghost-url", dest="ghost_url", help="Ghost post URL")
    p_stage.add_argument("--ghost-id", dest="ghost_id", help="Ghost post ID")
    p_stage.add_argument("--revision-round", dest="revision_round", help="Revision round number (1 or 2)")
    p_stage.add_argument("--revision-status", dest="revision_status", help="Optional: human-review")
    p_stage.add_argument("--verdict", help="Card verdict (card lane)")
    p_stage.add_argument("--sources", help="Source count (card lane)")
    p_stage.add_argument("--card", help="Card file path (card lane)")
    p_stage.add_argument("--parent-event", dest="parent_event", help="Parent event ID (card lane)")
    p_stage.add_argument("--format", dest="format", help="Draft format (optional)")
    p_stage.add_argument("--note", help="Optional note")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    cmds = {
        "append": cmd_append,
        "update-status": cmd_update_status,
        "slug": cmd_slug,
        "check": cmd_check,
        "next-topic": cmd_next_topic,
        "next-eligible": cmd_next_eligible,
        "query-index": cmd_query_index,
        "queue-depth": cmd_queue_depth,
        "slop-check": cmd_slop_check,
        "verify-sources": cmd_verify_sources,
        "ghost-publish": cmd_ghost_publish,
        "priority": cmd_priority,
        "feedback": cmd_feedback,
        "stage": cmd_stage,
    }
    cmds[args.command](args)


if __name__ == "__main__":
    main()
