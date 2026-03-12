# AUTOMATION LANES

## Lane 1 — Topic sourcing (3x daily: 9:15, 15:15, 21:15)

### Goal
Check queue depth and source new topics only when the queue is running low (under 15 queued topics).

### Adaptive behavior
- Read `topic-queue.jsonl` and count entries with `status: "queued"`
- If queue depth >= 15: report "queue healthy" and stop immediately (no web searches)
- If queue depth < 15: source 4-5 new [YOUR DOMAIN] topics via web search

### Read set
- `REFERENCE/topic-queue.jsonl`
- `REFERENCE/dossier-index.jsonl` (for dedup)

### Write set
- append 4-5 lines to `REFERENCE/topic-queue.jsonl`
- append 4-5 lines to `topics/inbox.md`

### Research scope
- Max 2 web searches per run (only if queue depth < 15)

### Failure rule
- If search fails, stop and report. Do NOT invent topics.

---

## Lane 2 — First-pass topic cards (every 2 hours)

### Goal
Convert one queued topic into one lightweight research card with an explicit verdict.

### Read set
- `PROJECT.md`
- `REFERENCE/topic-queue.jsonl`
- `REFERENCE/topic-card-template.md`
- `REFERENCE/first-pass-dossier-rubric.md`

### Write set
- one new topic card file under `REFERENCE/cards/`
- append one line to `REFERENCE/dossier-index.jsonl`
- optionally append one brief line to `LOG.md`

### Do not update in cron
- `NEXT.md`
- human-facing queue prose unless explicitly asked
- deepening docs

### Failure rule
If a required file update fails twice, stop and report the blocker instead of retry-looping.

---

## Lane 3 — Deep-dive dossiers (hourly, :45)

### Goal
Take one "strong" first-pass card and produce a full article-ready dossier with richer sourcing, pull quotes, and post angles.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the first-pass card file referenced by the index entry
- `REFERENCE/topic-dossier-template.md`
- `REFERENCE/deep-dive-rubric.md`

### Write set
- one new dossier file under `REFERENCE/dossiers/`
- append one line to `REFERENCE/dossier-index.jsonl` (type: deepdive) or update existing entry with `dossier` field
- optionally append one brief line to `LOG.md`

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `verdict` is `"strong"` and `dossier` is `null` or absent.

### Research scope
- 2-3 web searches per topic (bounded); supplement with `web_fetch` on URLs already cited in the first-pass card (these don't count toward the search budget)
- After each web search, fully process results before the next search
- If a search returns a rate-limit error (429), do NOT count it as a failed fetch — do non-search work then retry
- Target contemporaneous/primary sources, forum archives, specific people/incidents, pull quotes
- Follow leads from the card's **Upgrade path** and **Open question** sections

### Do not update in cron
- `NEXT.md`
- first-pass cards (the dossier is a separate, richer artifact)
- human-facing queue prose unless explicitly asked

### Failure rule
- If the first-pass card file doesn't exist at the path in the index, skip and report.
- If web research fails 3 times (excluding 429 rate-limit errors), stop and report the blocker.
- If a file update fails twice, stop and report instead of retry-looping.

---

## Lane 4 — Post briefs (hourly, :30)

### Goal
Take one completed deep-dive dossier and produce a post brief: format recommendation, platform pick, hook, angle, tone, key moments, and editorial cuts — everything a copywriting pass needs to produce a non-AI-sounding post.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the deep-dive dossier file referenced by the index entry
- the first-pass card file referenced by the index entry
- `REFERENCE/post-brief-template.md`
- `REFERENCE/post-brief-rubric.md`

### Write set
- one new brief file under `REFERENCE/briefs/`
- append one line to `REFERENCE/dossier-index.jsonl` (type: brief)
- optionally append one brief line to `LOG.md`

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `type` is `"deepdive"` and no brief file exists at `REFERENCE/briefs/<id>-<slug>.md`.

### Research scope
- NONE. This lane does no web searches. All material comes from existing dossiers and cards.

### Do not update in cron
- `NEXT.md`
- first-pass cards or deep-dive dossiers
- human-facing queue prose unless explicitly asked

### Failure rule
- If the dossier file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report instead of retry-looping.

---

## Lane 5 — Post drafts (hourly, :10)

### Goal
Take one completed post brief and its dossier and produce a ready-to-review post draft that follows the brief's creative direction and reads like a human wrote it.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the post brief file referenced by the index entry
- the deep-dive dossier file (looked up via the same `id`'s deepdive entry)
- `REFERENCE/post-draft-template.md`
- `REFERENCE/post-draft-rubric.md`
- `REFERENCE/brand-config.md` (optional — if it exists, read for voice guidelines)

### Write set
- one new draft file under `REFERENCE/drafts/`
- append one line to `REFERENCE/dossier-index.jsonl` (type: draft)
- optionally append one brief line to `LOG.md`

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `type` is `"brief"` and no draft file exists at `REFERENCE/drafts/<id>-<slug>.md`.

### Research scope
- NONE. This lane does no web searches. All material comes from existing dossiers and briefs.

### Do not update in cron
- `NEXT.md`
- first-pass cards, deep-dive dossiers, or post briefs
- human-facing queue prose unless explicitly asked

### Failure rule
- If the brief or dossier file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report instead of retry-looping.

---

## Lane 6 — QA review (hourly, :50)

### Goal
Read one completed draft against its post brief. Produce a QA report that either approves the draft or lists specific, actionable fixes with quotes from the draft.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the draft file referenced by the index entry
- the post brief file (looked up via the same `id`'s brief entry)
- `REFERENCE/qa-rubric.md`
- `REFERENCE/brand-config.md` (optional — if it exists, read for voice guidelines)

### Write set
- one new QA report file under `REFERENCE/qa/`
- append one line to `REFERENCE/dossier-index.jsonl` (type: qa, qaStatus: approved/needs-edits)
- optionally append one brief line to `LOG.md`

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `type` is `"draft"` or `"revision"` and no QA report exists at `REFERENCE/qa/<id>-<slug>.md` (for originals) or `REFERENCE/qa/<id>-<slug>-r<N>.md` (for revisions). This ensures revision drafts get QA-reviewed, not just originals.

### Research scope
- NONE. This lane does no web searches.

### Do not update in cron
- `NEXT.md`
- drafts, briefs, dossiers, or cards — QA only creates reports
- human-facing queue prose unless explicitly asked

### Failure rule
- If the draft or brief file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report instead of retry-looping.

---

## Lane 7 — Revision (hourly, :20)

### Goal
Take one draft that received `qaStatus: "needs-edits"` and produce a revised version that addresses every issue in the QA report, without introducing new problems or degrading what already worked.

### Read set
- `REFERENCE/dossier-index.jsonl`
- the QA report that flagged the draft (looked up via the same `id`'s qa entry)
- the draft file (original or previous revision)
- the post brief (looked up via the same `id`'s brief entry)
- the deep-dive dossier (looked up via the same `id`'s deepdive entry)
- `REFERENCE/post-revision-rubric.md`
- `REFERENCE/post-draft-rubric.md` (for voice rules)
- `REFERENCE/brand-config.md` (optional — if it exists, read for voice guidelines)

### Write set
- one new revised draft file under `REFERENCE/drafts/` (named `<id>-<slug>-r1.md` or `-r2.md`)
- append one line to `REFERENCE/dossier-index.jsonl` (type: revision)
- optionally append one brief line to `LOG.md`

### Selection rule
Pick the first entry in `dossier-index.jsonl` where `type` is `"qa"` and `qaStatus` is `"needs-edits"`, and whose `id` does NOT already have a revision draft for that round. Determine the revision round: if the QA report was for the original draft, produce `-r1`; if for `-r1`, produce `-r2`. If the QA report is for `-r2`, skip — this topic has hit the revision cap and needs human review.

### Research scope
- NONE. This lane does no web searches. All material comes from existing drafts, QA reports, briefs, and dossiers.

### Do not update in cron
- `NEXT.md`
- original draft files, QA reports, briefs, dossiers, or cards — this lane only creates revision drafts and appends to the index
- human-facing queue prose unless explicitly asked

### Failure rule
- If the draft, QA report, or brief file doesn't exist at the indexed path, skip and report.
- If this is a `-r2` QA failure, do NOT create `-r3`. Append an index entry with `revisionStatus: "human-review"` and stop.
- If a file write fails twice, stop and report instead of retry-looping.
