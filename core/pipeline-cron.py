#!/usr/bin/env python3
"""Pre-compute pipeline state for cron agents.

Runs via system crontab before agent jobs. Writes lane state to REFERENCE/.state/
so agents only need read/write tools (no shell execution).
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure imports work when run from workspace root
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
import importlib
pt = importlib.import_module("pipeline-tools")

STATE_DIR = os.path.join(os.path.dirname(__file__), ".state")
LANES = ["card", "deepdive", "brief", "draft", "qa", "revision", "short-form", "ghost-publish"]
ATTEMPTS_FILE = os.path.join(STATE_DIR, "lane-attempts.json")
SKIPPED_FILE = os.path.join(STATE_DIR, "skipped-items.json")
MAX_CONSECUTIVE_STALE = 5

# Cooldown backoff schedule (hours) by skipCount
COOLDOWN_HOURS = [4, 12, 48, 168]  # 4h, 12h, 48h, 7d (cap)


def load_json(path, default=None):
    if default is None:
        default = {}
    if os.path.exists(path):
        with open(path, "r") as f:
            try:
                return json.load(f)
            except (json.JSONDecodeError, ValueError):
                return default
    return default


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


MIN_STALE_INTERVAL_SEC = 45 * 60  # Only count a stale tick if 45+ min since last


def check_stale(lane, new_item, attempts):
    """Check if an item is stale (same item selected repeatedly without progress).

    Only increments the counter if enough time has passed for an agent run to
    have actually happened between pipeline-cron invocations. This prevents
    false positives when pipeline-cron runs multiple times per hour (before
    agent jobs + after commits).

    Returns (is_stale, updated_attempts).
    """
    now = datetime.now(timezone.utc).isoformat()
    lane_state = attempts.get(lane, {})
    prev_id = lane_state.get("id")
    prev_type = lane_state.get("type")
    new_id = new_item.get("id")
    new_type = new_item.get("type")

    if new_id != prev_id or new_type != prev_type:
        # Different item — reset counter
        attempts[lane] = {"id": new_id, "type": new_type, "consecutive": 1, "lastCountedAt": now}
        return False, attempts

    # Same item — only count if enough time has passed since last count
    last_counted = lane_state.get("lastCountedAt")
    if last_counted:
        try:
            last_dt = datetime.fromisoformat(last_counted)
            now_dt = datetime.now(timezone.utc)
            elapsed = (now_dt - last_dt).total_seconds()
            if elapsed < MIN_STALE_INTERVAL_SEC:
                # Too soon — don't increment, just return current state
                return False, attempts
        except (ValueError, TypeError):
            pass  # malformed timestamp, treat as expired

    # Enough time passed — increment
    count = lane_state.get("consecutive", 0) + 1
    attempts[lane] = {"id": new_id, "type": new_type, "consecutive": count, "lastCountedAt": now}

    if count >= MAX_CONSECUTIVE_STALE:
        return True, attempts
    return False, attempts


def _is_agent_hold(item):
    """Return True if this skip entry is a deliberate agent hold (permanent)."""
    return item.get("reason", "").startswith("Held:")


def _cooldown_active(item):
    """Return True if this item's cooldown has not yet expired."""
    if _is_agent_hold(item):
        return True
    cooldown_until = item.get("cooldownUntil")
    if not cooldown_until:
        return False
    try:
        until_dt = datetime.fromisoformat(cooldown_until)
        return datetime.now(timezone.utc) < until_dt
    except (ValueError, TypeError):
        return False


def load_skip_set(lane=None):
    """Load the skip/cooldown list. Returns set of topic IDs to exclude.

    Only excludes items whose cooldown is still active or that are agent holds.
    If lane is provided, only return IDs in that specific lane.
    """
    data = load_json(SKIPPED_FILE, default=[])
    result = set()
    for item in data:
        if "id" not in item:
            continue
        if lane is not None and item.get("lane") != lane:
            continue
        if _cooldown_active(item):
            result.add(item["id"])
    return result


def add_to_skip_list(topic_id, topic, lane):
    """Add an item to the cooldown list with exponential backoff."""
    data = load_json(SKIPPED_FILE, default=[])
    now = datetime.now(timezone.utc)

    # Find existing entry for this id+lane to get skipCount
    existing_idx = None
    for i, item in enumerate(data):
        if item.get("id") == topic_id and item.get("lane") == lane:
            existing_idx = i
            break

    if existing_idx is not None:
        prev = data[existing_idx]
        if _is_agent_hold(prev):
            return  # Don't override agent holds
        skip_count = prev.get("skipCount", 1) + 1
    else:
        skip_count = 1

    # Calculate cooldown duration from backoff schedule
    backoff_idx = min(skip_count - 1, len(COOLDOWN_HOURS) - 1)
    cooldown_hours = COOLDOWN_HOURS[backoff_idx]
    cooldown_until = now + timedelta(hours=cooldown_hours)

    entry = {
        "id": topic_id,
        "topic": topic,
        "lane": lane,
        "reason": f"Auto-cooldown: {MAX_CONSECUTIVE_STALE} consecutive failed runs (attempt {skip_count})",
        "skipCount": skip_count,
        "skippedAt": now.isoformat(),
        "cooldownUntil": cooldown_until.isoformat(),
    }

    if existing_idx is not None:
        data[existing_idx] = entry
    else:
        data.append(entry)

    save_json(SKIPPED_FILE, data)


def cleanup_expired_cooldowns():
    """Remove expired cooldown entries to prevent unbounded growth.

    Agent holds (reason starts with 'Held:') are never removed.
    """
    data = load_json(SKIPPED_FILE, default=[])
    if not data:
        return
    kept = [item for item in data if _cooldown_active(item)]
    if len(kept) != len(data):
        removed = len(data) - len(kept)
        save_json(SKIPPED_FILE, kept)
        print(f"  COOLDOWN-CLEANUP: removed {removed} expired cooldown entries")


def resolve_paths(topic_id, index):
    """Build a dict of resolved file paths for a topic from the index."""
    paths = {}
    for e in index:
        if e.get("id") != topic_id:
            continue
        etype = e.get("type")
        if etype is None and "card" in e:
            paths["card"] = e["card"]
        elif etype == "deepdive" and "dossier" in e:
            paths["dossier"] = e["dossier"]
        elif etype == "brief" and "brief" in e:
            paths["brief"] = e["brief"]
        elif etype in ("draft", "revision") and "draft" in e:
            paths["draft"] = e["draft"]  # latest draft/revision wins
        elif etype == "qa" and "qa" in e:
            paths["qa"] = e["qa"]
        elif etype == "short-form" and "shortForm" in e:
            paths["shortForm"] = e["shortForm"]
    return paths


def auto_clear_priority(index):
    """Remove priority items that have reached QA-approved status."""
    priority_ids = pt.load_priority_ids()
    if not priority_ids:
        return
    approved_ids = {
        e["id"] for e in index
        if e.get("type") == "qa" and e.get("qaStatus") == "approved"
    }
    cleared = [pid for pid in priority_ids if pid in approved_ids]
    if cleared:
        remaining = [pid for pid in priority_ids if pid not in approved_ids]
        # Reload full entries to preserve addedAt
        if os.path.exists(pt.PRIORITY_FILE):
            with open(pt.PRIORITY_FILE, "r") as f:
                data = json.load(f)
        else:
            data = []
        data = [item for item in data if item.get("id") not in approved_ids]
        pt.save_priority(data)
        for cid in cleared:
            print(f"  PRIORITY-CLEARED: {cid} — reached QA-approved")


def main():
    os.makedirs(STATE_DIR, exist_ok=True)

    # Clean up expired cooldowns before computing state
    cleanup_expired_cooldowns()

    # Load index once for path resolution
    index_entries = pt.read_jsonl(pt.INDEX_FILE)
    index = [e for _, e in index_entries]

    # Auto-clear priority items that have finished the pipeline
    auto_clear_priority(index)

    attempts = load_json(ATTEMPTS_FILE)
    newly_skipped = []

    for lane in LANES:
        # Start with the lane-specific skip list
        exclude_ids = set(load_skip_set(lane))

        # Get next eligible item (already excluding persistently skipped items)
        result = pt.compute_next_eligible(lane, exclude_ids=exclude_ids)

        # Check for stale items (same item picked repeatedly = agent keeps failing)
        if result != "NONE":
            is_stale, attempts = check_stale(lane, result, attempts)
            if is_stale:
                stale_id = result.get("id")
                stale_topic = result.get("topic", "unknown")
                newly_skipped.append({"lane": lane, "id": stale_id, "topic": stale_topic})
                # Persist the skip and try the next item
                add_to_skip_list(stale_id, stale_topic, lane)
                exclude_ids.add(stale_id)
                result = pt.compute_next_eligible(lane, exclude_ids=exclude_ids)
                # Reset the counter for this lane since we moved on
                if result != "NONE":
                    attempts[lane] = {
                        "id": result.get("id"),
                        "type": result.get("type"),
                        "consecutive": 1,
                    }
                else:
                    attempts.pop(lane, None)

        # Auto-approve all revision-capped items until we find a real candidate
        # Build set of IDs that already have an approved QA entry in the index
        approved_qa_ids = {
            e["id"] for e in index
            if e.get("type") == "qa" and e.get("qaStatus") == "approved"
        }
        while result != "NONE" and result.get("_capReached"):
            cap_id = result.get("id")
            cap_topic = result.get("topic", "unknown")
            # Skip if index already has an approved QA for this ID
            if cap_id in approved_qa_ids:
                print(f"  SKIP-AUTO-APPROVE: {cap_id} — already has approved QA in index")
                exclude_ids.add(cap_id)
                result = pt.compute_next_eligible(lane, exclude_ids=exclude_ids)
                continue
            now_ts = datetime.now(timezone.utc).isoformat()
            append_path = os.path.join(STATE_DIR, "stage-append.jsonl")
            # Resolve the existing QA report path from the result
            qa_path = result.get("qa", "")
            if not qa_path:
                resolved = resolve_paths(cap_id, index)
                qa_path = resolved.get("qa", "")
            auto_entry = json.dumps({
                "id": cap_id,
                "topic": cap_topic,
                "type": "qa",
                "qa": qa_path,
                "qaStatus": "approved",
                "autoApproved": True,
                "timestamp": now_ts,
            }, ensure_ascii=False)
            with open(append_path, "a") as f:
                f.write(auto_entry + "\n")
            approved_qa_ids.add(cap_id)  # Track so we don't re-stage within this run
            print(f"  AUTO-APPROVED: {cap_id} ({cap_topic[:60]}) — revision cap reached")
            exclude_ids.add(cap_id)
            result = pt.compute_next_eligible(lane, exclude_ids=exclude_ids)

        if result == "NONE":
            data = "NONE"
            # Clear attempts for this lane — nothing to track
            attempts.pop(lane, None)
        else:
            # Add computed slug from topic title
            topic = result.get("topic", "")
            if topic:
                result["_slug"] = pt.compute_slug(topic)
            # Resolve upstream file paths so agents don't need to read the full index
            topic_id = result.get("id")
            if topic_id:
                result["_resolvedPaths"] = resolve_paths(topic_id, index)
            # For lanes with multiple candidates, resolve paths for each
            if "_candidates" in result:
                for cand in result["_candidates"]:
                    cand_id = cand.get("id")
                    if cand_id:
                        cand["_resolvedPaths"] = resolve_paths(cand_id, index)
            # Inject user feedback if any matches this topic + lane
            feedback_entries = pt.load_feedback()
            topic_id = result.get("id")
            if topic_id and feedback_entries:
                matched = [
                    e["text"] for e in feedback_entries
                    if e.get("id") == topic_id and e.get("lane") in (lane, "*")
                ]
                if matched:
                    result["_feedback"] = "\n".join(f"- {t}" for t in matched)

            data = result

        out_path = os.path.join(STATE_DIR, f"next-{lane}.json")
        with open(out_path, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

    # Auto-cleanup: remove feedback entries whose topic ID is no longer
    # the current work item in any matching lane's state file
    feedback_entries = pt.load_feedback()
    if feedback_entries:
        active_items = {}  # lane -> current topic id
        for lane in LANES:
            state_path = os.path.join(STATE_DIR, f"next-{lane}.json")
            state_data = load_json(state_path)
            if isinstance(state_data, dict) and "id" in state_data:
                active_items[lane] = state_data["id"]

        def is_still_active(entry):
            entry_lane = entry.get("lane", "*")
            entry_id = entry.get("id")
            if entry_lane == "*":
                return entry_id in active_items.values()
            return active_items.get(entry_lane) == entry_id

        cleaned = [e for e in feedback_entries if is_still_active(e)]
        if len(cleaned) != len(feedback_entries):
            removed = len(feedback_entries) - len(cleaned)
            pt.save_feedback(cleaned)
            print(f"  FEEDBACK-CLEANUP: removed {removed} consumed feedback entries")

    save_json(ATTEMPTS_FILE, attempts)

    # Queue depth
    depth = pt.compute_queue_depth()
    with open(os.path.join(STATE_DIR, "queue-depth.json"), "w") as f:
        json.dump(depth, f)

    # Timestamp
    now = datetime.now(timezone.utc).isoformat()
    with open(os.path.join(STATE_DIR, "computed-at.json"), "w") as f:
        json.dump(now, f)

    skip_msg = f", skipped {len(newly_skipped)} stale items" if newly_skipped else ""
    print(f"[{now}] State computed for {len(LANES)} lanes, queue depth={depth}{skip_msg}")
    for item in newly_skipped:
        print(f"  COOLDOWN: {item['id']} ({item['topic'][:60]}) in {item['lane']} — will retry after backoff")


if __name__ == "__main__":
    main()
