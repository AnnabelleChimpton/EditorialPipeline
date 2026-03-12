# PROJECT

## Purpose
Build a durable research archive for blog-worthy topics from the millennial pop-culture and early-internet era — the vodka cranberry era — with enough factual depth, context, tone, and source material to turn each topic into a strong future post.

## Current State
Full 7-lane pipeline is operational:
1. Adaptive topic sourcing (queue-depth-aware)
2. First-pass topic cards
3. Deep-dive dossiers for strong topics
4. Post briefs (editorial direction)
5. Post drafts (actual writing)
6. QA review (approval or edit memos)
7. Revision (fixes QA-flagged drafts, max 2 rounds, then escalates to human)

All lanes run on automated cron schedules, staggered to avoid collisions.

## Constraints
- Favor specific facts, strong source trails, and sharp cultural framing over shallow nostalgia lists.
- Avoid low-grade rumor sludge and generic era summaries.
- The recurring cron must stay lightweight and reliable.
- Each lane processes only one topic per run; append-only writes where specified.

## Architecture Snapshot
- Canonical project state lives in this workspace.
- Human-readable topic sourcing lives in `REFERENCE/topic-queue.md`.
- Machine-readable automation queue lives in `REFERENCE/topic-queue.jsonl`.
- Append-only result tracking lives in `REFERENCE/dossier-index.jsonl`.

## Lanes
### 1. Topic sourcing (3x daily)
- Adaptive: checks queue depth first; only sources if under 15 queued topics.
- When sourcing, adds 4-5 new topics per run.
- Output: queue updates to `topic-queue.jsonl` and `topics/inbox.md`.

### 2. First-pass topic cards (every 2 hours)
- Take one queued topic.
- Produce one compact research card with a verdict: `strong`, `maybe`, or `weak`.
- Output: one card file plus one append-only index line.

### 3. Deepening winners
- Only for topics already marked `strong`.
- Automated via Lane 3 cron (:45).

### 4. Post briefs
- Only for topics with a completed deep-dive dossier.
- Assigns format, platform, hook, angle, tone, key moments, and editorial cuts.
- No web research — pure editorial judgment on existing material.
- Output: one brief file plus one append-only index line.
- Automated via Lane 4 cron (:30).

### 5. Post drafts
- Only for topics with a completed post brief.
- Writes the actual post following the brief's creative direction.
- No web research — all material from dossier + brief.
- Output: one draft file plus one append-only index line.
- Automated via Lane 5 cron (:10).

### 6. QA review
- Only for topics with a completed draft (original or revision).
- Reviews draft against brief: compliance, anti-slop, substance, platform fit.
- Produces an approval or a specific edit memo with quotes.
- No web research — reads draft + brief only.
- Output: one QA report plus one append-only index line.
- Automated via Lane 6 cron (:50).

### 7. Revision
- Only for topics with a QA report with `qaStatus: "needs-edits"`.
- Reads the QA report, original draft, brief, and dossier.
- Produces a revised draft addressing every QA issue. Versioned files: `-r1`, `-r2`.
- Maximum 2 revision rounds. If `-r2` still fails QA, escalates to human review.
- No web research — all material from existing artifacts.
- Output: one revised draft file plus one append-only index line.
- Automated via Lane 7 cron (:20).

## Key Files
- `PROJECT.md`
- `AGENTS.md`
- `NEXT.md`
- `DECISIONS.md`
- `LOG.md`
- `REFERENCE/topic-queue.md`
- `REFERENCE/topic-queue.jsonl`
- `REFERENCE/dossier-index.jsonl`
- `REFERENCE/topic-card-template.md`
- `REFERENCE/first-pass-dossier-rubric.md`
- `REFERENCE/topic-dossier-template.md`
- `REFERENCE/deep-dive-rubric.md`
- `REFERENCE/post-brief-template.md`
- `REFERENCE/post-brief-rubric.md`
- `REFERENCE/post-draft-template.md`
- `REFERENCE/post-draft-rubric.md`
- `REFERENCE/qa-rubric.md`
- `REFERENCE/post-revision-rubric.md`
- `REFERENCE/automation-lane.md`

## Risks / Unknowns
- Queue could drain faster than sourcing replenishes it if multiple lanes accelerate throughput.
- Rate-limit pressure from web searches in Lanes 1-3 could cause cascading stalls if upstream APIs throttle.
- Revision loop: if QA is too strict, many topics may hit the 2-round cap and pile up in human-review. Monitor `revisionStatus: "human-review"` entries in the index.
