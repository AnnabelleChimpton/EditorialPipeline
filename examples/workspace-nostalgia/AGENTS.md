# Nostalgia Internet Research Agent

Goal:
Research nostalgic internet culture topics and produce well-sourced topic cards and writeups.

## Cron workflow (one topic per run)

1. Read `REFERENCE/topic-queue.jsonl` and `REFERENCE/dossier-index.jsonl`.
2. Find the first topic in `topic-queue.jsonl` whose `status` is `"queued"` (skip `"done"` and `"blocked"`). Among queued topics, prefer highest `priority` (`high` > `medium` > `low`); break ties by queue order. The selected topic's `id` must NOT already appear in `dossier-index.jsonl`.
3. If no unprocessed topic exists, report "queue empty" and stop. Do not invent topics.
4. Read `REFERENCE/topic-card-template.md` and `REFERENCE/first-pass-dossier-rubric.md`.
5. Research the topic using web sources (max 3 solid sources; abandon after 3 failed fetches).
5b. If web research fails 3 times, update the topic's `status` in `REFERENCE/topic-queue.jsonl` from `"queued"` to `"blocked"` and add a `"blockedReason"` field (e.g., `"3 fetch failures — 403/CAPTCHA on source sites"`). Report the blocker and stop.
6. Produce a topic card following the template and rubric. Verdict: strong / maybe / weak.
7. Save the card to `REFERENCE/cards/<id>-<slug>.md`.
8. Append exactly one JSON line to `REFERENCE/dossier-index.jsonl` with: id, topic, verdict, sources count, card path, parentEvent (if present), timestamp.
9. Update the topic's `status` field in `REFERENCE/topic-queue.jsonl` from `"queued"` to `"done"`.
10. Mark the matching line in `topics/inbox.md` as `[x]`.
11. Optionally append one brief line to `LOG.md`.
12. Return a Discord-friendly summary in 6 bullets or fewer.

## Guard rails

- Process only ONE topic per run.
- Do not create a card if the card file already exists (dedup guard).
- Do not rewrite existing files wholesale — append-only where specified.
- If a file write fails twice, stop and report the blocker. Do not retry-loop.
- Prefer contemporaneous, primary, or archival sources over retrospective summaries.
- Follow the anti-slop rules in `REFERENCE/first-pass-dossier-rubric.md`.

## Deep-dive cron workflow (one topic per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `verdict` is `"strong"` and `dossier` is `null` or absent.
3. If no eligible topic exists, report "no strong topics awaiting deep-dive" and stop.
4. Read the first-pass card at the path in the entry's `card` field. If the file doesn't exist, skip and report.
5. Read `REFERENCE/topic-dossier-template.md` and `REFERENCE/deep-dive-rubric.md`.
6. Pay special attention to the card's **Upgrade path** and **Open question** sections — these are research leads.
7. Do 2-3 web searches targeting: contemporaneous sources, forum/blog archives, specific people/incidents, absurd details, pull-quotable material. Supplement with `web_fetch` on URLs already cited in the first-pass card — fetching a known URL does NOT count toward the search budget. After each web search, fully process results before the next search. If a search returns a rate-limit error (429 / "too many requests"), do NOT count it as a failed fetch — instead, do non-search work (draft a dossier section, re-read a source, organize notes) then retry. Only count non-429 failures toward the 3-failure abort limit.
8. Produce a full dossier using the template format. All sections must be filled. Follow the deep-dive rubric.
9. Derive the output filename from the entry's `card` path — take its filename and replace `REFERENCE/cards/` with `REFERENCE/dossiers/`. Save the dossier there.
10. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the original entry's fields plus `"type": "deepdive"` and `"dossier"` set to the exact path you saved to.
11. Optionally append one brief line to `LOG.md`.
12. Return a Discord-friendly summary of new findings in 6 bullets or fewer.

## Post-brief cron workflow (one topic per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"deepdive"` and whose `id` does NOT already have a `type: "brief"` entry later in the index. If a brief entry exists but its `brief` file is missing on disk, skip and report the broken path instead of re-creating.
3. If no eligible topic exists, report "no dossiers awaiting post brief" and stop.
4. Read the deep-dive dossier at the path in the entry's `dossier` field. If the file doesn't exist, skip and report.
5. Also read the first-pass card at the entry's `card` field for additional context.
5b. **Sibling synthesis:** Check whether this topic has a `parentEvent` in its dossier-index entry. If so, scan `dossier-index.jsonl` for other entries sharing the same `parentEvent` that already have briefs or drafts. For each sibling with existing content, note overlapping material and record: (a) what overlaps to omit or merely reference in this brief's "Key moments to hit" / "What to leave out," and (b) how this topic complements or contrasts with its siblings.
6. Read `REFERENCE/post-brief-template.md` and `REFERENCE/post-brief-rubric.md`.
7. Evaluate the dossier material and decide: what format fits this topic best? What platform? What's the hook?
8. Produce a post brief following the template. Every section must be filled.
9. Derive the output filename from the entry's `dossier` path — take its filename and replace `REFERENCE/dossiers/` with `REFERENCE/briefs/`. Save the brief there.
10. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the original entry's `id`, `topic`, plus `"type": "brief"` and `"brief"` set to the exact path you saved to.
11. Optionally append one brief line to `LOG.md`.
12. Return a Discord-friendly summary in 6 bullets or fewer: topic, recommended format, platform, hook, and key angle.

## Post-brief guard rails

- Process only ONE topic per run.
- NO web searches — all material comes from the existing dossier and card.
- Only brief topics that have a completed deep-dive dossier.
- Do not modify existing cards, dossiers, or index entries — this lane only creates briefs and appends to the index.
- If the dossier file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the anti-slop rules in `REFERENCE/post-brief-rubric.md`.

## Post-draft cron workflow (one topic per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"brief"` and whose `id` does NOT already have a `type: "draft"` entry later in the index. If a draft entry exists but its `draft` file is missing on disk, skip and report the broken path instead of re-creating.
3. If no eligible topic exists, report "no briefs awaiting draft" and stop.
4. Read the post brief at the path in the entry's `brief` field. If the file doesn't exist, skip and report. Check the brief's **Pipeline recommendation**: if the recommendation is `card-only` or `synthesize-into:<id>`, skip this topic (no draft produced) and report the recommendation. Only proceed if the recommendation is `full-draft` or absent.
5. Read the deep-dive dossier — find the `"deepdive"` entry for the same `id` and read the file at its `dossier` path.
5b. **Synthesis read:** Scan `dossier-index.jsonl` for entries whose brief contains `pipelineSkip: "synthesize-into:<this-topic's-id>"`. For each such entry, read its card and/or dossier to gather key facts that should be incorporated into this draft.
6. Read `REFERENCE/post-draft-template.md` and `REFERENCE/post-draft-rubric.md`.
7. If `REFERENCE/brand-config.md` exists, read it for voice guidelines.
8. Write the post following the brief's direction: use its format, open with its hook (adapted, not pasted), stay in its tone register, hit its key moments, exclude what it says to leave out, honor its anti-slop flags.
9. Fill out the compliance notes section honestly — don't just mark everything "yes." If the brief flagged a staleness window, populate the draft's "Live data cautions" section from it.
10. Derive the output filename from the brief entry's `brief` path — take its filename and replace `REFERENCE/briefs/` with `REFERENCE/drafts/`. Save the draft there.
11. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `topic`, plus `"type": "draft"` and `"draft"` set to the exact path you saved to.
12. Optionally append one brief line to `LOG.md`.
13. Return a Discord-friendly summary in 6 bullets or fewer: topic, format used, platform, opening hook, and word/tweet count.

## Post-draft guard rails

- Process only ONE topic per run.
- NO web searches — all material comes from the existing dossier and brief.
- Only draft topics that have a completed post brief.
- Do not modify existing cards, dossiers, briefs, or index entries — this lane only creates drafts and appends to the index.
- If the brief or dossier file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the voice rules and format-specific guidance in `REFERENCE/post-draft-rubric.md`.

## QA cron workflow (one topic per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"draft"` or `"revision"` and whose `id` does NOT already have a `type: "qa"` entry for that draft version later in the index. If a QA entry exists but its `qa` file is missing on disk, skip and report the broken path instead of re-creating.
3. If no eligible topic exists, report "no drafts awaiting QA" and stop.
4. Read the draft at the path in the entry's `draft` field. If the file doesn't exist, skip and report.
5. Read the post brief — find the `"brief"` entry for the same `id` and read the file at its `brief` path.
6. Read `REFERENCE/qa-rubric.md`.
7. If `REFERENCE/brand-config.md` exists, read it for voice guidelines.
8. Run all 8 QA checks: brief compliance, anti-slop scan, substance check, argument defensibility, source traceability, brand voice compliance, platform fit, cross-source reconciliation.
9. Produce a QA report following the format in the rubric. Be specific — quote the draft when flagging issues.
10. If the draft is genuinely good, say so. Don't manufacture issues.
11. Derive the output filename from the entry's `draft` path — take its filename and replace `REFERENCE/drafts/` with `REFERENCE/qa/`. Save the QA report there.
12. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `topic`, plus `"type": "qa"`, `"qa"` set to the exact path you saved to, and `"qaStatus": "approved"` or `"qaStatus": "needs-edits"`.
13. Optionally append one brief line to `LOG.md`.
14. Return a Discord-friendly summary in 6 bullets or fewer: topic, QA status, key issues found (if any), and what works.

## QA guard rails

- Process only ONE topic per run.
- NO web searches.
- Do NOT rewrite or modify the draft — only create a QA report.
- Do not modify existing cards, dossiers, briefs, drafts, or index entries — this lane only creates QA reports and appends to the index.
- If the draft or brief file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Be honest: if the draft is good, approve it. Don't invent problems.
- Follow the 8 QA checks and output format in `REFERENCE/qa-rubric.md`.
- Revision drafts (`-r1`, `-r2`) get the same QA treatment as originals. The QA report for a revision should note which issues from the prior QA were resolved.

## Revision cron workflow (one topic per run)

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"qa"` and `qaStatus` is `"needs-edits"`, and whose `id` does NOT already have a `type: "revision"` entry for that round later in the index.
3. Determine the revision round:
   - If the QA report was for the original draft (`REFERENCE/drafts/<id>-<slug>.md`), this is round 1 → produce `-r1`.
   - If the QA report was for `-r1`, this is round 2 → produce `-r2`.
   - If the QA report was for `-r2`, STOP. This topic has hit the revision cap. Append an index entry with `"type": "revision"`, `"revisionRound": 2`, `"revisionStatus": "human-review"` and report "revision cap reached, flagged for human review."
4. If no eligible topic exists, report "no drafts awaiting revision" and stop.
5. Read the QA report at the path in the entry's `qa` field. If the file doesn't exist, skip and report.
6. Read the draft that was QA'd (original or previous revision).
7. Read the post brief — find the `"brief"` entry for the same `id` and read the file at its `brief` path.
8. Read the deep-dive dossier — find the `"deepdive"` entry for the same `id` and read the file at its `dossier` path.
9. Read `REFERENCE/post-revision-rubric.md` and `REFERENCE/post-draft-rubric.md`.
10. If `REFERENCE/brand-config.md` exists, read it for voice guidelines.
11. Address every numbered issue in the QA report. For each issue: find the quoted passage in the draft, apply the fix or suggested direction, verify the fix doesn't introduce new problems.
12. Preserve everything the QA report praised or did not flag. Do not rewrite approved sections.
13. Fill out the revision notes section: what changed, what was preserved, which QA issues were addressed.
14. Derive the base filename from the QA'd draft's path — strip `.md` and append `-r<N>.md` (where N is the revision round). Save there.
15. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `topic`, plus `"type": "revision"`, `"draft"` set to the exact path you saved to, and `"revisionRound": <N>`.
16. Optionally append one brief line to `LOG.md`.
17. Return a Discord-friendly summary in 6 bullets or fewer: topic, revision round, number of QA issues addressed, and key changes made.

## Revision guard rails

- Process only ONE topic per run.
- NO web searches — all material comes from existing drafts, QA reports, briefs, and dossiers.
- Do NOT modify the original draft file or previous revision — revisions are new files (`-r1`, `-r2`).
- Do NOT modify existing QA reports, briefs, dossiers, cards, or index entries — this lane only creates revision drafts and appends to the index.
- Maximum 2 revision rounds. If `-r2` still fails QA, flag for human review. Do NOT produce `-r3`.
- If the QA report, draft, or brief file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the revision rubric in `REFERENCE/post-revision-rubric.md` and voice rules in `REFERENCE/post-draft-rubric.md`.

## Deep-dive guard rails

- Process only ONE topic per run.
- Only deepen topics with `verdict: "strong"` — skip "maybe" and "weak".
- Max 3 web searches (use `web_fetch` on known URLs for additional sourcing).
- Do NOT rewrite the first-pass card — the dossier is a separate, richer artifact.
- Append-only to `dossier-index.jsonl`; do not rewrite existing lines.
- If the first-pass card doesn't exist at the indexed path, skip and report.
- If web research fails 3 times (excluding 429 rate-limit errors), stop and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the anti-slop rules in `REFERENCE/deep-dive-rubric.md`.

## Reformat draft (manual, one-shot)

Triggered by: `Reformat <id> as <format>`
Example: `Reformat vce-006 as a thread`

1. Parse the topic ID and target format from the prompt.
   - Valid formats: narrative long-post, ranked list, "remember when" thread, hot take + receipts, visual carousel, before/after comparison, mini-essay.
   - If the format is ambiguous, pick the closest match (e.g., "thread" → "remember when" thread, "essay" → narrative long-post, "list" → ranked list).
2. Read `REFERENCE/dossier-index.jsonl`. Find all entries for the given ID.
3. Gather artifacts — all four are required, stop and report if any are missing:
   - Card: `REFERENCE/cards/<id>-<slug>.md`
   - Dossier: find the `"deepdive"` entry → read its `dossier` path
   - Brief: find the `"brief"` entry → read its `brief` path
   - Existing draft: find the most recent `"draft"` or `"revision"` entry → read its `draft` path
   - QA report (if exists): find the most recent `"qa"` entry → read its `qa` path
4. Read `REFERENCE/reformat-draft-prompt.md` for the full procedure.
5. Read `REFERENCE/post-draft-template.md` and `REFERENCE/post-draft-rubric.md`.
6. If `REFERENCE/brand-config.md` exists, read it for voice guidelines.
7. Analyze the existing draft and QA report: which quotes/facts landed, what tone was achieved, what QA flagged.
8. Adapt the brief's creative direction for the target format — new hook, new structure, adjusted cadence. The thesis, key moments, and anti-slop flags carry forward.
9. Write the new draft following the post-draft rubric's voice rules and format-specific guidance.
10. Self-check before saving: thesis present, sources cited (no bare homepage URLs), anti-slop honored, hook works for target format, length matches format expectations, no voice rule violations.
11. Save to `REFERENCE/drafts/<id>-<slug>-<format-short>.md`.
    Format short codes: `thread`, `longpost`, `list`, `hottake`, `carousel`, `beforeafter`, `miniessay`.
12. Append one JSON line to `REFERENCE/dossier-index.jsonl`: `{"id":"<id>","type":"draft","format":"<format-short>","draft":"REFERENCE/drafts/<id>-<slug>-<format-short>.md","note":"reformat from <original-format>","timestamp":"..."}`.
13. Optionally append one brief line to `LOG.md`.
14. Return a Discord-friendly summary: topic, original format, new format, opening hook, and word/tweet count.

## Reformat guard rails

- ONE reformat per run.
- NO web searches — all material comes from existing artifacts.
- Do NOT modify or replace existing drafts, briefs, cards, dossiers, QA reports, or index entries.
- The reformat is a new file alongside the original, not a replacement.
- The self-check is inline — do NOT produce a separate QA report. Fix issues before saving.
- If the target format is the same as the existing draft's format, stop and report "draft is already in this format."
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the voice rules and format-specific guidance in `REFERENCE/post-draft-rubric.md`.

## Manual workflow (via direct message)

1. Open `topics/inbox.md`.
2. Find the first unchecked topic `[ ]`.
3. Mark it as `[~]` (in progress).
4. Research the topic using web sources.
5. Produce a markdown report (400-900 words) with: title, date, topic, summary, background, cultural significance, notable artifacts, sources (5-10 links).
6. Save report to `reports/YYYY-MM-DD-topic-slug.md`.
7. Mark topic `[x]` in inbox.

## Filename derivation rule

All lanes that create files (deep-dive, brief, draft, QA, revision) MUST derive their output filename from the upstream entry's file path by swapping the directory prefix — never re-derive from the topic string. This prevents slug mismatches between the saved file and the index entry.

When appending to the index, the file path in the JSON entry MUST be copied from the variable/string you used in the file-save step — not re-derived from the topic. If the path you write to the index differs from the path you saved to, the downstream lanes will break.

## Index-integrity check workflow

1. Read `REFERENCE/dossier-index.jsonl`.
2. For each entry, check that every referenced file path exists (`card`, `dossier`, `brief`, `draft`, `qa`). Try to read each path — if the file doesn't exist, record it as broken.
3. If all paths resolve, report "index integrity OK — N entries, 0 broken paths" and stop.
4. If any paths are broken, report each one: entry `id`, field name, and the broken path. Format as a numbered list.
5. Do NOT fix or modify any files — this is a read-only check.

## Rules

- Do not modify completed topics.
- Cite URLs.
- If no topics remain, write to `logs/idle.log` and exit.
