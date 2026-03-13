# Nostalgia Internet Research Pipeline

## What this is

A 7-lane autonomous research-to-content pipeline. Takes a domain/niche (here: early internet and millennial nostalgia culture), sources topics, researches them, produces editorial briefs, writes drafts, and QA-reviews them. Runs on OpenClaw cron. A human reviews approved drafts and publishes.

## Pipeline overview

| Lane | Name | Schedule | What it does |
|------|------|----------|--------------|
| 1 | Sourcing | 3x daily (:15) | Adaptive queue refill — skips if queue >= 15 topics; otherwise sources 4-5 new ones |
| 2 | First-pass cards | Every 2h | Researches one queued topic, writes a card, assigns a verdict: strong / maybe / weak |
| 3 | Deep-dive dossiers | Hourly (:45) | Takes one "strong" card, produces a full dossier with richer sourcing |
| 4 | Post briefs | Hourly (:30) | Editorial direction for one dossier: format, platform, hook, tone, cuts |
| 5 | Post drafts | Hourly (:10) | Actual copywriting from brief + dossier |
| 6 | QA review | Hourly (:50) | Checks draft against brief, approves or flags with specific fixes |
| 7 | Revision | Hourly (:20) | Picks up QA-failed drafts, applies fixes, sends back to QA (max 2 rounds) |
| -- | Human review | Manual | Reviews approved drafts, edits if needed, publishes |

## How it works

**Pull-based selection.** Each lane scans `dossier-index.jsonl` to find its own next work item. No lane tells another what to do. If nothing is ready, the lane reports idle and exits.

**Append-only JSONL state.** Two files track all pipeline state: `topic-queue.jsonl` (candidate topics) and `dossier-index.jsonl` (pipeline progress). Agents only append lines, never rewrite or delete. This makes concurrent cron runs safe. See `REFERENCE/schema.md` for field definitions.

**One unit of work per run.** Every lane processes exactly one topic per invocation. Keeps runs short, debuggable, and recoverable.

**Staggered cron schedules.** Lanes fire at :10, :30, :45, :50 within each hour (sourcing at :15 3x/day, first-pass every 2h) to avoid file contention.

**Research vs. editorial split.** Lanes 1-3 do web research (search + fetch, bounded per run). Lanes 4-7 are closed-book editorial work with no web access and shorter timeouts.

## Directory structure

```
workspace-nostalgia/
  PROJECT.md                     — project definition, scope, architecture snapshot
  AGENTS.md                      — agent instructions for all 7 lanes + guard rails
  IDENTITY.md                    — voice and brand identity
  SOUL.md                        — editorial sensibility and values
  LOG.md                         — append-only run log
  REFERENCE/
    automation-lane.md           — lane specs: schedules, read/write sets, selection rules, failure rules
    schema.md                    — JSONL field definitions for both state files
    topic-queue.jsonl            — candidate topic queue (append-only)
    topic-queue.md               — human-readable topic list
    dossier-index.jsonl          — pipeline progress index (append-only)
    topic-card-template.md       — template for first-pass cards
    first-pass-dossier-rubric.md — quality rubric for first-pass research
    topic-dossier-template.md    — template for deep-dive dossiers
    deep-dive-rubric.md          — quality rubric for deep-dives
    post-brief-template.md       — template for editorial briefs
    post-brief-rubric.md         — quality rubric for briefs
    post-draft-template.md       — template for post drafts
    post-draft-rubric.md         — voice + format rubric for drafts
    qa-rubric.md                 — QA checklist and report format
    post-revision-rubric.md      — revision rules, cap, and file naming
    cards/                       — first-pass research cards (one per topic)
    dossiers/                    — deep-dive dossiers (one per topic)
    briefs/                      — editorial briefs (one per topic)
    drafts/                      — post drafts (one per topic)
    qa/                          — QA reports (one per topic)
  topics/
    inbox.md                     — checkbox list of all sourced topics
  skills/
    content-research/            — reusable skill package for the pipeline
  _starter/                      — blank templates for bootstrapping a new domain
  sources/                       — raw source material (manual additions)
  logs/                          — archived run logs
  reports/                       — generated pipeline reports
```

## Key design decisions

- **Research lanes vs. editorial lanes.** Lanes 1-3 hit the web; lanes 4-6 work only from existing artifacts. Once a dossier is written, all downstream work is closed-book. Drafts stay grounded in vetted material.
- **Adaptive sourcing with threshold.** Lane 1 checks queue depth before doing anything. If >= 15 queued topics, it stops immediately with zero web searches. Prevents queue bloat.
- **Anti-slop rubrics at every stage.** Each lane has a rubric that flags AI writing tells: era throat-clears, "iconic," em-dash overuse, stacked rhetorical questions, filler transitions, generic CTAs.
- **Brief as the critical bottleneck for voice quality.** Lane 4 makes all creative decisions (format, hook, tone, what to cut). Lane 5 executes the brief; it does not re-decide.
- **QA as gate, revision as loop.** Lane 6 checks brief compliance, runs an anti-slop scan, verifies substance, and confirms platform fit. Approves or flags with specific quoted evidence. Lane 7 picks up flagged drafts, applies the fixes, and sends revised drafts back to Lane 6 for re-review. Maximum 2 revision rounds — after that, the topic is escalated to a human.
- **Verdicts filter the funnel.** Only "strong" first-pass cards advance to deep-dive. "Maybe" and "weak" topics stay indexed but consume no downstream resources.

## Throughput

| Metric | Rate |
|--------|------|
| Sourcing | Up to ~12-15 topics/day (3 runs x 4-5 topics), adaptive -- skips when queue >= 15 |
| First-pass cards | ~12/day (every 2 hours) |
| Deep-dives, briefs, drafts, QA | ~1/hour each, gated by upstream availability |
| Queue threshold | 15 queued topics before sourcing pauses |
| Effective bottleneck | First-pass cards (~12/day entering the funnel); downstream clears backlog faster than it accumulates |

## Adapting for a new domain

The `_starter/` directory contains blank versions of templates and rubrics. To set up a new domain:

1. Create a new workspace
2. Copy everything from `_starter/` into the new workspace's `REFERENCE/`
3. Customize for your domain:
   - `PROJECT.md` -- define the niche, audience, and scope
   - `IDENTITY.md` / `SOUL.md` -- set voice, tone, and editorial values
   - Rubric files -- tune anti-slop flags and quality bars for your content style
   - `REFERENCE/automation-lane.md` -- adjust schedules and selection rules if needed
4. Initialize empty state files: `topic-queue.jsonl` and `dossier-index.jsonl`
5. Seed initial topics or let Lane 1 source from scratch
6. Set up cron jobs with staggered schedules (see `REFERENCE/automation-lane.md` for the pattern) — 7 lanes total

## File reference

| File | Type | Purpose |
|------|------|---------|
| `REFERENCE/topic-queue.jsonl` | State | Candidate topic queue with status tracking |
| `REFERENCE/dossier-index.jsonl` | State | Pipeline progress -- all lane outputs indexed here |
| `REFERENCE/schema.md` | Docs | JSONL field definitions for both state files |
| `REFERENCE/automation-lane.md` | Docs | Lane specs: schedules, read/write sets, selection rules |
| `REFERENCE/topic-card-template.md` | Template | Structure for first-pass research cards |
| `REFERENCE/topic-dossier-template.md` | Template | Structure for deep-dive dossiers |
| `REFERENCE/post-brief-template.md` | Template | Structure for editorial briefs |
| `REFERENCE/post-draft-template.md` | Template | Structure for post drafts |
| `REFERENCE/first-pass-dossier-rubric.md` | Rubric | Quality standards for first-pass research |
| `REFERENCE/deep-dive-rubric.md` | Rubric | Quality standards for deep-dive research |
| `REFERENCE/post-brief-rubric.md` | Rubric | Quality standards for editorial direction |
| `REFERENCE/post-draft-rubric.md` | Rubric | Voice rules and format guidance for drafts |
| `REFERENCE/qa-rubric.md` | Rubric | QA checklist, anti-slop scan, report format |
| `REFERENCE/post-revision-rubric.md` | Rubric | Revision rules, file naming, cap at 2 rounds |
