# AUTOMATION LANES

## Lane 1 — Event sourcing (manual trigger)

### Goal
Search for new developments in the Middle East conflict and add them to the event queue with urgency tiers and confidence levels. Uses domain-zone exploration to ensure diverse coverage.

### Adaptive behavior
- Read `topic-queue.jsonl` and count entries with `status: "queued"`
- If queue depth >= 15: report "queue healthy" and stop immediately (no web searches)
- If queue depth < 15: perform a zone audit and source 3-4 new events via targeted web search

### Zone audit
- Read `REFERENCE/domain-zones.md` for the full list of thematic zones
- Tabulate existing events per zone from `topic-queue.jsonl` + `dossier-index.jsonl`
- Identify 2-3 most underrepresented zones
- Construct search queries targeted at those zones (e.g., "Middle East ceasefire UN Security Council 2026" not a single generic query)

### Read set
- `REFERENCE/topic-queue.jsonl`
- `REFERENCE/dossier-index.jsonl` (for dedup)
- `REFERENCE/domain-zones.md` (for zone-targeted search)
- `REFERENCE/schema.md` (for field definitions)

### Write set
- append 3-4 lines to `REFERENCE/topic-queue.jsonl`
- append 3-4 lines to `topics/inbox.md`

### Research scope
- Max 2 web searches per run (only if queue depth < 15)
- **All search queries must include "past 24 hours" or "today"** to bias toward current developments (e.g., "Middle East ceasefire today March 2026" not "Middle East ceasefire 2026")
- Events must spread across at least 2 different zones per run
- Tag each event with urgency (critical/high/standard) and confidence (confirmed/developing/unverified)
- Include `eventDate` (ISO timestamp) and `parentEvent` (optional grouping ID) for each event

### Recency gate
- After sourcing, check each event's `eventDate` against the current time
- **Reject any event older than 48h** — do not append it to the queue
- Log rejected events with reason: "recency gate: eventDate >48h old"
- This prevents stale events from consuming 5+ downstream lane runs before QA catches them

### Failure rule
- If search fails, stop and report. Do NOT invent events.

---

## Lane 2 — Event cards (triage)

### Goal
Convert one queued event into a lightweight event card with confidence assessment and source corroboration analysis. Speed over depth.

### Event statuses
- `"queued"` — available for processing
- `"done"` — card completed, skip
- `"blocked"` — research failed, skip until manually unblocked

### Selection rule
Find the first event in `topic-queue.jsonl` whose `status` is `"queued"`. Among queued events, prefer highest `urgency` (`critical` > `high` > `standard`); break ties by queue order. The selected event's `id` must NOT already appear in `dossier-index.jsonl`.

### Read set
- `PROJECT.md`
- `REFERENCE/topic-queue.jsonl`
- `REFERENCE/topic-card-template.md`
- `REFERENCE/first-pass-dossier-rubric.md`
- `REFERENCE/schema.md`

### Write set
- one new event card file under `REFERENCE/cards/`
- append one line to `REFERENCE/dossier-index.jsonl`
- update the event's `status` in `REFERENCE/topic-queue.jsonl` from `"queued"` to `"done"`
- mark the matching line in `topics/inbox.md` as `[x]`

### Failure rule
If a required file update fails twice, stop and report the blocker instead of retry-looping.

### Blocked-on-failure rule
If web research fails 3 times, update the event's `status` in `topic-queue.jsonl` from `"queued"` to `"blocked"` and add a `"blockedReason"` field. Report the blocker and stop.

---

## Lane 3 — Situation dossiers (deep-dive)

### Goal
Take one triaged event card and produce a full situation dossier with timeline, context, actor analysis, humanitarian dimension, and forward-looking assessment.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the event card file referenced by the index entry
- `REFERENCE/topic-dossier-template.md`
- `REFERENCE/deep-dive-rubric.md`

### Write set
- one new dossier file under `REFERENCE/dossiers/`
- append one line to `REFERENCE/dossier-index.jsonl` (type: deepdive)

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `confidence` is `"confirmed"` or `"developing"` and `dossier` is `null` or absent. Prefer `urgency: "critical"` over `"high"` over `"standard"`.

Note: Unlike VCE (which gates on verdict: "strong"), this pipeline advances confirmed and developing events. Unverified events do NOT get deep-dives — they stay at the card level until upgraded.

### Research scope
- 2-3 web searches per event (bounded); supplement with `web_fetch` on URLs already cited in the event card (don't count toward search budget)
- After each web search, fully process results before the next search
- If a search returns a 429 rate-limit error, do NOT count it as a failed fetch — do non-search work then retry
- Target: official statements, wire service updates, UN agency reports, named journalist accounts
- Follow leads from the card's **Open questions** and **Context needed** sections

### Failure rule
- If the event card file doesn't exist at the path in the index, skip and report.
- If web research fails 3 times (excluding 429s), stop and report.
- If a file update fails twice, stop and report.

---

## Lane 4 — Post briefs (editorial direction)

### Goal
Take one completed situation dossier and produce a post brief: format recommendation (sitrep / analysis brief / timeline update), angle, key facts, sensitivity flags, and confidence qualifiers.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the situation dossier file referenced by the index entry
- the event card file referenced by the index entry
- `REFERENCE/post-brief-template.md`
- `REFERENCE/post-brief-rubric.md`

### Source quality gate
Before finalizing source anchors, reject bare domain URLs and prefer wire services/official statements. If the dossier's sources are mostly weak, note this as a caveat in the brief.

### Write set
- one new brief file under `REFERENCE/briefs/`
- append one line to `REFERENCE/dossier-index.jsonl` (type: brief)

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `type` is `"deepdive"` and no brief file exists at `REFERENCE/briefs/<id>-<slug>.md`. Prefer `urgency: "critical"` entries.

### Research scope
- NONE. This lane does no web searches. All material comes from existing dossiers and cards.

### Failure rule
- If the dossier file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report.

---

## Lane 5 — Post drafts (writing)

### Goal
Take one completed post brief and its dossier and produce a ready-to-review draft (sitrep, analysis brief, or timeline update) with full attribution, confidence qualifiers, and sensitivity compliance.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the post brief file referenced by the index entry
- the situation dossier file (looked up via the same `id`'s deepdive entry)
- `REFERENCE/post-draft-template.md`
- `REFERENCE/post-draft-rubric.md`
- `REFERENCE/brand-config.md`

### Write set
- one new draft file under `REFERENCE/drafts/`
- append one line to `REFERENCE/dossier-index.jsonl` (type: draft)

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `type` is `"brief"` and no draft file exists at `REFERENCE/drafts/<id>-<slug>.md`. Prefer `urgency: "critical"` entries.

### Research scope
- NONE. This lane does no web searches.

### Failure rule
- If the brief or dossier file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report.

---

## Lane 6 — QA review

### Goal
Read one completed draft against its brief. Produce a QA report with 7 checks: factual accuracy, attribution, confidence alignment, staleness, sensitivity, source quality, and voice compliance.

### QA checks
See `REFERENCE/qa-rubric.md` for full details. Key differences from VCE QA:
- **Staleness check** (new): flag if eventDate >24h before draft timestamp
- **Sensitivity review** (new): dehumanizing language, gratuitous detail, civilian impact framing
- **Confidence alignment** (replaces anti-slop as priority): qualifiers must match confidence level
- **Factual accuracy is the top priority** — a well-voiced draft with attribution gaps fails

### Read set
- `REFERENCE/dossier-index.jsonl`
- the draft file referenced by the index entry
- the post brief file (looked up via the same `id`'s brief entry)
- `REFERENCE/qa-rubric.md`
- `REFERENCE/brand-config.md`

### Write set
- one new QA report file under `REFERENCE/qa/`
- append one line to `REFERENCE/dossier-index.jsonl` (type: qa, qaStatus: approved/needs-edits)

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `type` is `"draft"` or `"revision"` and no QA report exists at `REFERENCE/qa/<id>-<slug>.md` (for originals) or `REFERENCE/qa/<id>-<slug>-r<N>.md` (for revisions). Prefer `urgency: "critical"` entries.

### Research scope
- NONE.

### Failure rule
- If the draft or brief file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report.

---

## Lane 7 — Revision

### Goal
Take one draft that received `qaStatus: "needs-edits"` and produce a revised version that addresses every QA issue. Factual fixes first, voice fixes second.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the QA report that flagged the draft
- the draft file (original or previous revision)
- the post brief (looked up via the same `id`'s brief entry)
- the situation dossier (looked up via the same `id`'s deepdive entry)
- `REFERENCE/post-revision-rubric.md`
- `REFERENCE/post-draft-rubric.md`
- `REFERENCE/brand-config.md`

### Write set
- one new revised draft file under `REFERENCE/drafts/` (named `<id>-<slug>-r1.md` or `-r2.md`)
- append one line to `REFERENCE/dossier-index.jsonl` (type: revision)

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `type` is `"qa"` and `qaStatus` is `"needs-edits"`, and whose `id` does NOT already have a revision draft for that round. Determine the revision round: if the QA report was for the original draft, produce `-r1`; if for `-r1`, produce `-r2`. If the QA report is for `-r2`, skip — revision cap reached, flag for human review.

### Research scope
- NONE.

### Failure rule
- If the draft, QA report, or brief file doesn't exist at the indexed path, skip and report.
- If this is a `-r2` QA failure, do NOT create `-r3`. Append an index entry with `revisionStatus: "human-review"` and stop.
- If a file write fails twice, stop and report.
