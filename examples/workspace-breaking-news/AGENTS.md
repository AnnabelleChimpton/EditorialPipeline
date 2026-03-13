# Breaking News Research Agent

Goal:
Monitor developing situations in the Middle East conflict and produce well-sourced sitreps, analysis briefs, and timeline updates through a 7-lane pipeline.

## Recency gate (Lane 1)

For time-sensitive domains, sourcing must enforce a recency window. All search queries should include "past 24 hours" or "today" to bias toward current events. After sourcing, reject any event with `eventDate` older than 48h from current time — do not queue stale events. This prevents wasted downstream lane runs on events that will fail the staleness check at QA.

## Event card cron workflow (one event per run)

1. Read `REFERENCE/topic-queue.jsonl` and `REFERENCE/dossier-index.jsonl`.
2. Find the first event in `topic-queue.jsonl` whose `status` is `"queued"` (skip `"done"` and `"blocked"`). Among queued events, prefer highest `urgency` (`critical` > `high` > `standard`); break ties by queue order. The selected event's `id` must NOT already appear in `dossier-index.jsonl`.
3. If no unprocessed event exists, report "queue empty" and stop. Do not invent events.
4. Read `REFERENCE/topic-card-template.md` and `REFERENCE/first-pass-dossier-rubric.md`.
5. Research the event using web sources (max 3 web searches; abandon after 3 failed fetches).
5b. If web research fails 3 times, update the event's `status` in `REFERENCE/topic-queue.jsonl` from `"queued"` to `"blocked"` and add a `"blockedReason"` field. Report the blocker and stop.
5c. Check if the event has a `parentEvent` in `topic-queue.jsonl`. If so, scan `topic-queue.jsonl` and `dossier-index.jsonl` for other entries with the same `parentEvent`. Note any siblings in the card's **Context needed** section (e.g., "Sibling events under same parentEvent: bn-003, bn-005").
6. Produce an event card following the template and rubric. Assign confidence (confirmed/developing/unverified) and urgency (critical/high/standard).
7. Save the card to `REFERENCE/cards/<id>-<slug>.md`.
8. Append exactly one JSON line to `REFERENCE/dossier-index.jsonl` with: id, event, confidence, urgency, eventDate, parentEvent (if present), sources count, card path, timestamp.
9. Update the event's `status` field in `REFERENCE/topic-queue.jsonl` from `"queued"` to `"done"`.
10. Mark the matching line in `topics/inbox.md` as `[x]`.
11. Return a summary in 6 bullets or fewer.

## Guard rails

- Process only ONE event per run.
- Do not create a card if the card file already exists (dedup guard).
- Do not rewrite existing files wholesale — append-only where specified.
- If a file write fails twice, stop and report the blocker. Do not retry-loop.
- Prefer wire services, official statements, and named reporters over aggregator coverage.
- Follow the speed and anti-slop rules in `REFERENCE/first-pass-dossier-rubric.md`.

## Deep-dive cron workflow (one event per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `confidence` is `"confirmed"` or `"developing"` and `dossier` is `null` or absent. Prefer `urgency: "critical"` entries. Unverified events do NOT get deep-dives.
3. If no eligible event exists, report "no events awaiting deep-dive" and stop.
4. Read the event card at the path in the entry's `card` field. If the file doesn't exist, skip and report.
5. Read `REFERENCE/topic-dossier-template.md` and `REFERENCE/deep-dive-rubric.md`.
6. Pay special attention to the card's **Open questions** and **Context needed** sections — these are research leads.
7. Do 2-3 web searches targeting: official statements, wire service updates, UN agency reports, background context, named journalist accounts. Supplement with `web_fetch` on URLs already cited in the event card — fetching a known URL does NOT count toward the search budget. After each web search, fully process results before the next search. If a search returns a rate-limit error (429), do NOT count it as a failed fetch — do non-search work then retry. Only count non-429 failures toward the 3-failure abort limit.
8. Produce a full situation dossier using the template format. All sections must be filled. Follow the deep-dive rubric.
9. Derive the output filename from the entry's `card` path — take its filename and replace `REFERENCE/cards/` with `REFERENCE/dossiers/`. Save the dossier there.
10. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the original entry's fields plus `"type": "deepdive"` and `"dossier"` set to the exact path you saved to.
11. Return a summary of new findings in 6 bullets or fewer.

## Post-brief cron workflow (one event per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"deepdive"` and whose `id` does NOT already have a brief file at `REFERENCE/briefs/<id>-<slug>.md`. Prefer `urgency: "critical"` entries.
3. If no eligible event exists, report "no dossiers awaiting post brief" and stop.
4. Read the situation dossier at the path in the entry's `dossier` field. If the file doesn't exist, skip and report.
5. Also read the event card at the entry's `card` field for additional context.
5b. Check if this event's entry in `dossier-index.jsonl` has a `parentEvent`. If so, scan for sibling entries with the same `parentEvent`. For each sibling with a brief or draft, read the sibling's brief and note overlapping material or complementary angles. In "Key facts to include": flag cross-references to sibling events. In "What to exclude": flag if this event overlaps too heavily with a sibling. Do NOT merge events — flag connections and let the brief's editorial judgment guide depth.
6. Read `REFERENCE/post-brief-template.md` and `REFERENCE/post-brief-rubric.md`.
7. Evaluate the dossier material and decide: what format fits this event best? Sitrep for fast-moving confirmed events, analysis brief for pattern/context pieces, timeline update for multi-day arcs.
8. Produce a post brief following the template. Every section must be filled, including sensitivity flags and confidence qualifiers.
9. Derive the output filename from the entry's `dossier` path — take its filename and replace `REFERENCE/dossiers/` with `REFERENCE/briefs/`. Save the brief there.
10. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the original entry's `id`, `event`, plus `"type": "brief"` and `"brief"` set to the exact path you saved to.
11. Return a summary in 6 bullets or fewer: event, recommended format, angle, and key sensitivity flags.

## Post-brief guard rails

- Process only ONE event per run.
- NO web searches — all material comes from the existing dossier and card.
- Only brief events that have a completed situation dossier.
- Do not modify existing cards, dossiers, or index entries — this lane only creates briefs and appends to the index.
- If the dossier file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the format selection guidance and anti-slop rules in `REFERENCE/post-brief-rubric.md`.

## Post-draft cron workflow (one event per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"brief"` and whose `id` does NOT already have a draft file at `REFERENCE/drafts/<id>-<slug>.md`. Prefer `urgency: "critical"` entries.
3. If no eligible event exists, report "no briefs awaiting draft" and stop.
4. Read the post brief at the path in the entry's `brief` field. If the file doesn't exist, skip and report. Check the brief's "Pipeline recommendation":
   - `card-only`: do NOT produce a draft. Append an index entry with `"type": "draft"`, `"draft": null`, `"pipelineSkip": "card-only"`. Report "pipeline recommendation: card-only — no draft produced" and stop.
   - `synthesize-into:<id>`: do NOT produce a standalone draft. Append an index entry with `"type": "draft"`, `"draft": null`, `"pipelineSkip": "synthesize-into:<id>"`. Report "pipeline recommendation: synthesize into <id> — no standalone draft" and stop.
   - `full-draft` or absent: proceed normally.
5. Read the situation dossier — find the `"deepdive"` entry for the same `id` and read the file at its `dossier` path.
5b. Scan `dossier-index.jsonl` for entries where `pipelineSkip` is `"synthesize-into:<this-event's-id>"`. For each, read its brief and incorporate its key facts as a section or supporting evidence in the draft.
6. Read `REFERENCE/post-draft-template.md`, `REFERENCE/post-draft-rubric.md`, and `REFERENCE/brand-config.md`.
7. Write the output following the brief's direction: use its format, attribute every claim, apply confidence qualifiers, honor sensitivity flags, include key facts, exclude what it says to leave out.
8. Fill out the compliance notes section honestly — don't just mark everything "yes." Also populate the "Live data cautions" section from the brief's staleness window: for each volatile figure flagged, list the claim as it appears in the draft, its source, and what to re-check before publishing.
9. Derive the output filename from the brief entry's `brief` path — take its filename and replace `REFERENCE/briefs/` with `REFERENCE/drafts/`. Save the draft there.
10. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `event`, plus `"type": "draft"` and `"draft"` set to the exact path you saved to.
11. Return a summary in 6 bullets or fewer: event, format used, confidence level, and word count.

## Post-draft guard rails

- Process only ONE event per run.
- NO web searches — all material comes from the existing dossier and brief.
- Only draft events that have a completed post brief.
- Do not modify existing cards, dossiers, briefs, or index entries — this lane only creates drafts and appends to the index.
- If the brief or dossier file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the voice rules, attribution rules, and format-specific guidance in `REFERENCE/post-draft-rubric.md` and `REFERENCE/brand-config.md`.

## QA cron workflow (one event per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"draft"` or `"revision"` and whose `id` does NOT already have a QA report for that draft version. For original drafts, check `REFERENCE/qa/<id>-<slug>.md`. For revision drafts (`-r1`, `-r2`), check `REFERENCE/qa/<id>-<slug>-r<N>.md`. Prefer `urgency: "critical"` entries.
3. If no eligible event exists, report "no drafts awaiting QA" and stop.
4. Read the draft at the path in the entry's `draft` field. If the file doesn't exist, skip and report.
5. Read the post brief — find the `"brief"` entry for the same `id` and read the file at its `brief` path.
6. Read `REFERENCE/qa-rubric.md` and `REFERENCE/brand-config.md`.
7. Run all 8 QA checks: factual accuracy, attribution, confidence alignment, staleness, sensitivity, source quality, voice compliance, cross-source reconciliation.
8. Produce a QA report following the format in the rubric. Be specific — quote the draft when flagging issues.
9. If the draft is genuinely good, say so. Don't manufacture issues.
10. Derive the output filename from the entry's `draft` path — take its filename and replace `REFERENCE/drafts/` with `REFERENCE/qa/`. Save the QA report there.
11. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `event`, plus `"type": "qa"`, `"qa"` set to the exact path you saved to, and `"qaStatus": "approved"` or `"qaStatus": "needs-edits"`.
12. Return a summary in 6 bullets or fewer: event, QA status, key issues found (if any), and what works.

## QA guard rails

- Process only ONE event per run.
- NO web searches.
- Do NOT rewrite or modify the draft — only create a QA report.
- Do not modify existing cards, dossiers, briefs, drafts, or index entries — this lane only creates QA reports and appends to the index.
- If the draft or brief file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Be honest: if the draft is good, approve it. Don't invent problems.
- Follow the 8 QA checks and output format in `REFERENCE/qa-rubric.md`.
- Revision drafts (`-r1`, `-r2`) get the same QA treatment as originals. The QA report for a revision should note which issues from the prior QA were resolved.
- **Factual accuracy and attribution outweigh voice issues.** A well-voiced draft with attribution gaps fails; a slightly stiff draft with perfect sourcing can pass.

## Revision cron workflow (one event per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"qa"` and `qaStatus` is `"needs-edits"`, and whose `id` does NOT already have a revision draft for that round.
3. Determine the revision round:
   - If the QA report was for the original draft (`REFERENCE/drafts/<id>-<slug>.md`), this is round 1 → produce `-r1`.
   - If the QA report was for `-r1`, this is round 2 → produce `-r2`.
   - If the QA report was for `-r2`, STOP. This event has hit the revision cap. Append an index entry with `"type": "revision"`, `"revisionRound": 2`, `"revisionStatus": "human-review"` and report "revision cap reached, flagged for human review."
4. If no eligible event exists, report "no drafts awaiting revision" and stop.
5. Read the QA report at the path in the entry's `qa` field. If the file doesn't exist, skip and report.
6. Read the draft that was QA'd (original or previous revision).
7. Read the post brief — find the `"brief"` entry for the same `id` and read the file at its `brief` path.
8. Read the situation dossier — find the `"deepdive"` entry for the same `id` and read the file at its `dossier` path.
9. Read `REFERENCE/post-revision-rubric.md`, `REFERENCE/post-draft-rubric.md`, and `REFERENCE/brand-config.md`.
10. Address every numbered issue in the QA report. Factual fixes first, then voice/structure. For each issue: find the quoted passage in the draft, apply the fix, verify the fix doesn't introduce new problems.
11. Preserve everything the QA report praised or did not flag. Do not rewrite approved sections.
12. Fill out the revision notes section: what changed, what was preserved, which QA issues were addressed.
13. Derive the base filename from the QA'd draft's path — strip `.md` and append `-r<N>.md` (where N is the revision round). Save there.
14. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `event`, plus `"type": "revision"`, `"draft"` set to the exact path you saved to, and `"revisionRound": <N>`.
15. Return a summary in 6 bullets or fewer: event, revision round, number of QA issues addressed, and key changes made.

## Revision guard rails

- Process only ONE event per run.
- NO web searches — all material comes from existing drafts, QA reports, briefs, and dossiers.
- Do NOT modify the original draft file or previous revision — revisions are new files (`-r1`, `-r2`).
- Do NOT modify existing QA reports, briefs, dossiers, cards, or index entries — this lane only creates revision drafts and appends to the index.
- Maximum 2 revision rounds. If `-r2` still fails QA, flag for human review. Do NOT produce `-r3`.
- If the QA report, draft, or brief file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the revision rubric in `REFERENCE/post-revision-rubric.md` and voice rules in `REFERENCE/post-draft-rubric.md`.
- **Fix factual issues first.** Attribution and accuracy outweigh voice and structure.

## Deep-dive guard rails

- Process only ONE event per run.
- Only deepen events with `confidence: "confirmed"` or `"developing"` — skip `"unverified"`.
- Max 3 web searches (use `web_fetch` on known URLs for additional sourcing).
- Do NOT rewrite the event card — the dossier is a separate, richer artifact.
- Append-only to `dossier-index.jsonl`; do not rewrite existing lines.
- If the event card doesn't exist at the indexed path, skip and report.
- If web research fails 3 times (excluding 429 rate-limit errors), stop and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the anti-slop rules in `REFERENCE/deep-dive-rubric.md`.

## Filename derivation rule

All lanes that create files (deep-dive, brief, draft, QA, revision) MUST derive their output filename from the upstream entry's file path by swapping the directory prefix — never re-derive from the event string. This prevents slug mismatches between the saved file and the index entry.

## Index-integrity check workflow

1. Read `REFERENCE/dossier-index.jsonl`.
2. For each entry, check that every referenced file path exists (`card`, `dossier`, `brief`, `draft`, `qa`). Try to read each path — if the file doesn't exist, record it as broken.
3. If all paths resolve, report "index integrity OK — N entries, 0 broken paths" and stop.
4. If any paths are broken, report each one: entry `id`, field name, and the broken path. Format as a numbered list.
5. Do NOT fix or modify any files — this is a read-only check.

## Rules

- Do not modify completed events.
- Cite URLs with outlet names and timestamps.
- If no events remain, report "queue empty" and exit.
- Attribute every factual claim.
- Apply confidence qualifiers appropriate to the confidence tier.
