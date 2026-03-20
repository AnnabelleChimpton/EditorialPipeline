# AUTOMATION LANES

> All lanes use pre-computed state files and staging. Agents never read or write `dossier-index.jsonl` or `topic-queue.jsonl` directly — `pipeline-cron.py` pre-computes work items into `.state/next-*.json`, and `pipeline-commit.py` flushes staged entries into the main files.

## Lane 1 — Topic sourcing (every 4 hours at :15)

### Goal
Check queue depth and source new topics only when the queue is running low. Uses domain-zone exploration to ensure diverse topic coverage.

### Adaptive behavior
- Read `REFERENCE/.state/queue-depth.json` for pre-computed queue depth
- If queue depth >= threshold: report "queue healthy" and stop immediately (no web searches)
- If queue depth < threshold: perform a category audit and source 4-5 new topics via zone-targeted web search

### Category audit
- Read `REFERENCE/domain-zones.md` for the full list of thematic zones
- Tabulate existing topics per zone from `topic-queue.jsonl` + `dossier-index.jsonl`
- Identify 2-3 most underrepresented zones
- Construct search queries targeted at those zones

### Read set
- `REFERENCE/.state/queue-depth.json`
- `REFERENCE/topic-queue.jsonl` (for dedup)
- `REFERENCE/dossier-index.jsonl` (for dedup)
- `REFERENCE/domain-zones.md` (for zone-targeted search)

### Write set
- Append 4-5 lines to `REFERENCE/.state/stage-queue.jsonl`
- Append 4-5 lines to `topics/inbox.md`

### Research scope
- Max 2 web searches per run (only if queue depth < threshold)
- Topics must spread across at least 2 different zones per run

### Failure rule
- If search fails, stop and report. Do NOT invent topics.

---

## Lane 2 — First-pass topic cards (every 2 hours at :00)

### Goal
Convert one queued topic into one lightweight research card with an explicit verdict.

### Read set
- `REFERENCE/.state/next-card.json` (pre-computed work item)
- `REFERENCE/topic-card-template.md`
- `REFERENCE/first-pass-dossier-rubric.md`

### Write set
- One new topic card file under `REFERENCE/cards/`
- Stage index entry via `python3 REFERENCE/pipeline-tools.py stage --type card ...`
- Append status update to `REFERENCE/.state/stage-status.jsonl`
- Optionally append one brief line to `LOG.md`

### Failure rule
If a required file update fails twice, stop and report the blocker instead of retry-looping.

---

## Lane 3 — Deep-dive dossiers (every 2 hours at :45)

### Goal
Take one first-pass card that passed the gate and produce a full article-ready dossier with richer sourcing, pull quotes, and post angles.

### Read set
- `REFERENCE/.state/next-deepdive.json` (pre-computed work item with `card` path)
- The first-pass card file referenced by the state entry
- `REFERENCE/topic-dossier-template.md`
- `REFERENCE/deep-dive-rubric.md`

### Write set
- One new dossier file under `REFERENCE/dossiers/`
- Stage index entry via `python3 REFERENCE/pipeline-tools.py stage --type deepdive ...`
- Optionally append one brief line to `LOG.md`

### Selection rule
Pre-computed by `pipeline-cron.py`: first entry in index where gate criteria are met and no deepdive entry exists for that ID.

### Filename derivation
Derive the dossier filename from the entry's `card` path by swapping `REFERENCE/cards/` to `REFERENCE/dossiers/`. Never re-derive from the topic string.

### Research scope
- 2-3 web searches per topic; supplement with `web_fetch` on URLs already cited in the card (don't count toward search budget)
- After each search, fully process results before the next
- If a 429 rate-limit error occurs, write the cooldown file and complete with sources already gathered
- Source verification step (`pipeline-tools.py verify-sources`) is mandatory

### Failure rule
- If the first-pass card file doesn't exist, skip and report.
- If web research fails 3 times (excluding 429 rate-limit errors), stop and report.
- If a file update fails twice, stop and report.

---

## Lane 4 — Post briefs (every 2 hours at :30)

### Goal
Take one completed deep-dive dossier and produce a post brief: format recommendation, platform pick, hook, angle, tone, key moments, and editorial cuts.

### Read set
- `REFERENCE/.state/next-brief.json` (pre-computed with `_resolvedPaths`)
- The dossier and card files via `_resolvedPaths`
- `REFERENCE/post-brief-template.md`
- `REFERENCE/post-brief-rubric.md`

### Write set
- One new brief file under `REFERENCE/briefs/`
- Stage index entry via `python3 REFERENCE/pipeline-tools.py stage --type brief ...`
- Optionally append one brief line to `LOG.md`

### Selection rule
Pre-computed by `pipeline-cron.py`: first deepdive entry whose ID has no brief entry.

### Filename derivation
Derive from `_resolvedPaths.dossier` by swapping `REFERENCE/dossiers/` to `REFERENCE/briefs/`.

### Research scope
- NONE. All material comes from existing dossiers and cards.

### Failure rule
- If the dossier file doesn't exist, skip and report.
- If a file write fails twice, stop and report.

---

## Lane 5 — Post drafts (every 2 hours at :10)

### Goal
Take one completed post brief and its dossier and produce a ready-to-review post draft that follows the brief's creative direction.

### Read set
- `REFERENCE/.state/next-draft.json` (pre-computed with `_resolvedPaths`)
- The brief and dossier files via `_resolvedPaths`
- `REFERENCE/post-draft-template.md`
- `REFERENCE/post-draft-rubric.md`
- `REFERENCE/brand-config.md` (if it exists)

### Write set
- One new draft file under `REFERENCE/drafts/`
- Stage index entry via `python3 REFERENCE/pipeline-tools.py stage --type draft ...`
- Optionally append one brief line to `LOG.md`

### Slop check
Mandatory after writing: run `python3 REFERENCE/pipeline-tools.py slop-check <draft-path>`. Fix flagged patterns and re-run (max 3 cycles).

### Research scope
- NONE. All material comes from existing dossiers and briefs.

### Failure rule
- If the brief or dossier file doesn't exist, skip and report.
- If a file write fails twice, stop and report.

---

## Lane 5b — Short-form post (every 2 hours at :05)

### Goal
Take one completed draft and produce a short-form companion post (social-length summary, teaser, or standalone micro-post).

### Read set
- `REFERENCE/.state/next-short-form.json` (pre-computed with `_resolvedPaths`)
- The draft and brief files via `_resolvedPaths`
- `REFERENCE/short-form-template.md`
- `REFERENCE/short-form-rubric.md`

### Write set
- One new short-form post under `REFERENCE/short-form/`
- Stage index entry via `python3 REFERENCE/pipeline-tools.py stage --type short-form ...`

### Slop check
Mandatory after writing.

### Research scope
- NONE.

---

## Lane 6 — QA review (hourly at :50)

### Goal
Read one completed draft against its post brief. Produce a QA report that either approves the draft or lists specific, actionable fixes with quotes.

### Read set
- `REFERENCE/.state/next-qa.json` (pre-computed with `_resolvedPaths`)
- The draft and brief files via `_resolvedPaths`
- `REFERENCE/qa-rubric.md`
- `REFERENCE/brand-config.md` (if it exists)

### Write set
- One new QA report file under `REFERENCE/qa/`
- Stage index entry via `python3 REFERENCE/pipeline-tools.py stage --type qa ...`
- Optionally append one brief line to `LOG.md`

### Selection rule
Pre-computed: first draft or revision entry whose ID has no QA entry for that version.

### Filename derivation
Derive from the draft path by swapping `REFERENCE/drafts/` to `REFERENCE/qa/`.

### Research scope
- NONE.

### Failure rule
- If the draft or brief file doesn't exist, skip and report.
- If a file write fails twice, stop and report.
- Be honest: if the draft is good, approve it. Don't invent problems.

---

## Lane 7 — Revision (hourly at :20)

### Goal
Take one draft that received `qaStatus: "needs-edits"` and produce a revised version that addresses every QA issue without introducing new problems.

### Read set
- `REFERENCE/.state/next-revision.json` (pre-computed with `_resolvedPaths`)
- The QA report, draft, brief, and dossier files via `_resolvedPaths`
- `REFERENCE/post-revision-rubric.md`
- `REFERENCE/post-draft-rubric.md` (for voice rules)
- `REFERENCE/brand-config.md` (if it exists)

### Write set
- One new revised draft file under `REFERENCE/drafts/` (named `-r1.md` or `-r2.md`)
- Stage index entry via `python3 REFERENCE/pipeline-tools.py stage --type revision ...`
- Optionally append one brief line to `LOG.md`

### Revision workflow
Uses **copy-then-edit** pattern: copy the original draft to the revision filename, then make targeted edits. Never regenerate the full file (avoids OpenAI content safety crashes on sensitive quoted material).

### Filename derivation
Strip `.md` from the QA'd draft's path and append `-r<N>.md`.

### Selection rule
Pre-computed: first QA entry with `qaStatus: "needs-edits"` whose ID has no revision for that round. Max 2 rounds — after `-r2` fails QA, flag for human review.

### Slop check
Mandatory after writing.

### Research scope
- NONE.

### Failure rule
- If the draft, QA report, or brief file doesn't exist, skip and report.
- If this is a `-r2` QA failure, do NOT create `-r3`. Flag for human review.
- If a file write fails twice, stop and report.

---

## Index-Integrity Check (every 6 hours at :35)

### Goal
Scan `dossier-index.jsonl` and `topic-queue.jsonl` and verify that every referenced file path actually exists on disk. Report broken paths so they can be fixed.

### Read set
- `REFERENCE/dossier-index.jsonl`
- `REFERENCE/topic-queue.jsonl`
- Every file path referenced in the index

### Write set
- NONE. This is a read-only check.

### Failure rule
- Report broken paths clearly. Do NOT fix or modify any files.

---

## Infrastructure: Pre-compute (hourly at :57)

### Goal
Run `pipeline-cron.py` to compute the `.state/next-*.json` files that agent lanes read their work items from. Also computes `queue-depth.json` for the sourcing gate.

### Behavior
- Reads `dossier-index.jsonl` and `topic-queue.jsonl`
- Determines the next eligible work item for each lane
- Writes `next-card.json`, `next-deepdive.json`, `next-brief.json`, `next-draft.json`, `next-qa.json`, `next-revision.json`, `next-short-form.json`
- Resolves upstream file paths into `_resolvedPaths`
- Tracks stale items (repeated selection without progress) and applies exponential backoff

---

## Infrastructure: Commit (every 4 minutes)

### Goal
Run `pipeline-commit.py` to flush staged changes from `.state/stage-*.jsonl` into the main index files.

### Behavior
- Reads `stage-append.jsonl` → validates and appends to `dossier-index.jsonl`
- Reads `stage-status.jsonl` → updates topic status in `topic-queue.jsonl`
- Reads `stage-queue.jsonl` → appends new topics to `topic-queue.jsonl`
- Validates all entries before committing
- Runs slop-check on committed draft/revision/short-form files
- Clears staging files after successful commit
