# PROJECT

## Purpose
Monitor developing situations in the Middle East conflict and produce well-sourced sitreps, analysis briefs, and timeline updates. This workspace stress-tests the seven-lane research pipeline on breaking-news content — a fundamentally different domain from cultural analysis.

## Scope
Middle East conflict monitoring (test case). Content types: situation reports, analysis briefs, timeline updates. Sources: wire services, official statements, credible reporting. Manual-run pipeline — no cron jobs.

## Current State
Full 7-lane pipeline configured for manual runs:
1. Event sourcing (new developments, urgency-tagged)
2. Event cards (triage + verification)
3. Situation dossiers (deep context)
4. Post briefs (format selection + editorial direction)
5. Post drafts (sitreps, analysis, timeline updates)
6. QA review (fact-check emphasis, staleness check, sensitivity review)
7. Revision (factual fixes first, max 2 rounds)

All lanes triggered manually via `openclaw cron run` or direct agent messages.

## What's Different From VCE
- **Unit of work**: Events/developments, not cultural topics
- **Verdict system**: confirmed / developing / unverified (not strong / maybe / weak)
- **Urgency tiers**: critical / high / standard — downstream lanes process critical first
- **Shelf life**: Hours to days, not evergreen — staleness checks in QA
- **Output format**: Sitreps, analysis briefs, timeline updates (not threads/essays)
- **Voice**: Clear, attributed, measured (not sardonic/analytical)
- **Research depth**: Fast (3-5 sources, same-day) vs. deep (6-10, weeks)
- **Source priority**: Wire services, official statements, named reporters

## What's The Same
- Append-only JSONL state files (topic-queue, dossier-index)
- One topic per lane run
- 7-lane structure (sourcing → triage → deep-dive → brief → draft → QA → revision)
- Template-driven output with rubrics at every stage
- Filename derivation from upstream paths
- Brand voice config as central reference
- No web searches in lanes 4+

## Constraints
- Every factual claim must be attributed to a source
- Confidence qualifiers must match the confidence tier
- No speculation presented as fact
- Sensitivity: no gratuitous detail, no dehumanizing language
- Each lane processes only one event per run; append-only writes where specified

## Architecture Snapshot
- Machine-readable queue: `REFERENCE/topic-queue.jsonl`
- Append-only result tracking: `REFERENCE/dossier-index.jsonl`
- Templates and rubrics: `REFERENCE/`
- Lane specs: `REFERENCE/automation-lane.md`
- Agent workflows: `AGENTS.md`

## Key Files
- `PROJECT.md`
- `AGENTS.md`
- `REFERENCE/topic-queue.jsonl`
- `REFERENCE/dossier-index.jsonl`
- `REFERENCE/schema.md`
- `REFERENCE/domain-zones.md`
- `REFERENCE/brand-config.md`
- `REFERENCE/automation-lane.md`
- `REFERENCE/topic-card-template.md`
- `REFERENCE/topic-dossier-template.md`
- `REFERENCE/post-brief-template.md`
- `REFERENCE/post-draft-template.md`
- `REFERENCE/first-pass-dossier-rubric.md`
- `REFERENCE/deep-dive-rubric.md`
- `REFERENCE/post-brief-rubric.md`
- `REFERENCE/post-draft-rubric.md`
- `REFERENCE/qa-rubric.md`
- `REFERENCE/post-revision-rubric.md`

## Risks / Unknowns
- Staleness: breaking-news content decays fast. If a draft sits >24h, QA should flag it.
- Model behavior: does the model handle attribution/confidence qualifiers well, or does it slip into editorializing?
- Pipeline speed: 7 lanes may be too slow for time-sensitive content. May need merged lanes or staleness gates.
- Source freshness: web search results may lag behind actual developments.
- Sensitivity: conflict content requires careful framing. Monitor for dehumanizing language or gratuitous detail.
