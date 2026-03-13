# POST BRIEF RUBRIC

This rubric is for Lane 4 — the editorial pass that converts a situation dossier into a post brief (format + editorial direction) without writing the actual output.

## Goal
Produce one post brief per dossier that makes the right format call and gives Lane 5 enough direction to produce a well-attributed, appropriately framed piece.

## Minimum acceptance bar
A post brief is acceptable only if it includes:
- A format recommendation (sitrep / analysis brief / timeline update) with a clear rationale tied to the dossier's material
- An angle/thesis that goes beyond "this happened" — what does this piece argue, illuminate, or contextualize?
- 3-5 key facts from the dossier with attribution (source name, not just "according to reports")
- At least 1 "what to exclude" item — editorial judgment means cutting, not just including
- Sensitivity flags specific to the event (not generic "be careful")
- Confidence qualifiers listed for every claim that needs one
- Source anchors from the dossier (specific article URLs, not bare domains). At least 1 wire service or official statement.
- Estimated length appropriate to the format
- A staleness window listing 2-4 specific volatile claims with source and reason for volatility

## Pipeline depth decision
- **full-draft**: Default. Enough material and editorial value for a standalone piece.
- **card-only**: Event is thin or purely contextual for a sibling. No draft produced. Card/dossier remain as source material.
- **synthesize-into:<sibling-id>**: Event should be folded into a sibling's draft. Brief explains what this event contributes.

When in doubt, choose `full-draft`.

## Format selection guidance

### Sitrep (situation report)
Best when: fast-moving confirmed event with multiple developments, clear factual sequence, operational details. The reader needs to know what happened, in what order, and what's confirmed.
Watch for: dossiers with strong timelines, multiple confirmed sources, clear actor actions.
Structure: bullet-heavy, scannable, timestamp every development. Separate confirmed from developing from unverified.

### Analysis brief
Best when: the development has implications beyond the immediate facts — a pattern shift, a precedent, a policy change, a strategic inflection point. The reader needs to understand what this means, not just what happened.
Watch for: dossiers where the "analysis" and "what to watch" sections are stronger than the timeline.
Structure: thesis-driven, paragraph prose, grounded in specific evidence.

### Timeline update
Best when: multi-day arc with sequential developments, or when adding new facts to ongoing coverage. The reader needs the chronological sequence laid out cleanly.
Watch for: dossiers covering events that span multiple days or that update prior reporting.
Structure: strictly chronological, timestamped entries, confidence tags per entry.

## Anti-slop rules
Do not pass a brief as acceptable if:
- The format recommendation has no rationale beyond "this would work well as a sitrep"
- The thesis is a description ("the UN voted on a ceasefire") instead of an argument ("the fourth US veto signals a fundamental shift in diplomatic strategy")
- Sensitivity flags are generic ("be sensitive about conflict") instead of specific ("the UNRWA school strike reports are contested — attribute casualty figures to specific agencies")
- "Breaking" is recommended for events >6h old
- Source anchors are bare domain URLs
- Confidence qualifiers section is empty — every breaking news piece has at least one claim that needs qualifying
- All recent briefs use the same analytical frame. Check the 3 most recent briefs in `REFERENCE/briefs/`: if they all frame the angle as "this is a pattern shift" or "this is a precedent," try a different frame — e.g., operational assessment, humanitarian impact focus, historical parallel, or actor-motivation analysis.

## Source quality gate
Before finalizing source anchors:
- Reject bare domain URLs (e.g., `reuters.com` with no article path)
- Prefer wire services and official statements over aggregator coverage
- Flag if all sources are from the same editorial perspective
- Note source freshness — if the most recent source is >12h old, flag this for the draft writer
- If the dossier's best sources are weak, note this explicitly so the draft writer and QA know the source ceiling
- If all source anchors are press coverage, flag it. At least 1 source should be a primary document: an official statement, agency situation report (OCHA, UNRWA, WHO), government communication, or military communique.

## What this lane does NOT do
- No web searches — all material comes from the existing dossier and card
- No draft generation — the brief is direction, not copy
- No modifications to existing files (cards, dossiers, index) — this lane only creates briefs
