# [YOUR PROJECT] Research Agent

Goal:
Research [YOUR DOMAIN] topics and produce well-sourced topic cards and opinionated commentary drafts.

> **Note:** This is a reference version of the agent instructions. If you use `pipeline init <brand.yaml>`, the working version is generated automatically with your brand's values filled in. The workflows below show the current production architecture — all lanes use pre-computed state files and staging rather than direct index manipulation.

## Cron workflow (one topic per run)

1. Read `REFERENCE/.state/next-card.json` — if the content is `"NONE"`, report "queue empty" and stop.
2. Read `REFERENCE/topic-card-template.md` and `REFERENCE/first-pass-dossier-rubric.md`.
3. Research the topic using web sources (max 3 solid sources; abandon after 3 failed fetches).
3b. If web research fails 3 times, append `{"id":"<id>","status":"blocked"}` to `REFERENCE/.state/stage-status.jsonl` — report the blocker and stop.
4. Produce a topic card following the template and rubric. Verdict: [YOUR_GATE_VALUES] (e.g., strong/maybe/weak).
5. Use the `_slug` field from the state file as the filename component.
6. Save the card to `REFERENCE/cards/<id>-<slug>.md`.
7. Stage the index entry: `python3 REFERENCE/pipeline-tools.py stage --type card --id <id> --topic "<TITLE>" --verdict <verdict> --sources <count> --card "<PATH>"` (add `--parent-event "<event>"` if applicable).
8. Append `{"id":"<id>","status":"done"}` to `REFERENCE/.state/stage-status.jsonl`.
9. Mark the matching line in `topics/inbox.md` as `[x]`.
10. Optionally append one brief line to `LOG.md`.
11. Return a Discord-friendly summary in 6 bullets or fewer.

## Guard rails

- Process only ONE topic per run.
- Do not create a card if the card file already exists (dedup guard).
- Do not rewrite existing files wholesale — append-only where specified.
- If a file write fails twice, stop and report the blocker. Do not retry-loop.
- Prefer contemporaneous, primary, or archival sources over retrospective summaries.
- Follow the anti-slop rules in `REFERENCE/first-pass-dossier-rubric.md`.

## Sourcing cron workflow (zone-aware adaptive queue refill)

1. Read `REFERENCE/.state/queue-depth.json` — this is your queue depth.
2. **HARD STOP — If queue depth >= [YOUR_QUEUE_DEPTH_THRESHOLD]**: report "queue healthy (N queued)" and STOP immediately. Do not source, do not search, do not append. This is a non-negotiable gate — no exceptions, even if zones are underrepresented.
3. Read `REFERENCE/domain-zones.md` — this defines the thematic zones your domain covers.
4. Read `REFERENCE/topic-queue.jsonl` and `REFERENCE/dossier-index.jsonl` — note every existing id, topic, theme, and category (including done topics). Combined, this is your dedup set.
5. **Category audit**: tabulate how many existing topics (queue + index) fall into each zone from domain-zones.md. Identify the 2-3 most underrepresented zones.
6. Construct 1-2 web searches targeted at the underrepresented zones. Queries should be 3-6 plain keywords — do NOT wrap terms in quotes. Max 2 web searches total.
7. Pick 4-5 candidates with a clear hook and tension. Candidates MUST come from at least 2 different zones.
8. If search fails, STOP and report sourcing failed. Do NOT invent topics.
9. Filter out candidates that overlap with existing entries — match on theme, not just exact name. When in doubt, skip it.
10. For each candidate (4-5 max):
    a. Append topic JSON as a single line to `REFERENCE/.state/stage-queue.jsonl` with fields: [YOUR_QUEUE_FIELDS].
    b. One `- [ ] id — topic` line to `topics/inbox.md`.
11. Return a Discord-friendly summary in 6 bullets or fewer. Include current queue depth and which zones were targeted.

### Sourcing field rules

- **Quote escaping**: If any text value contains double quotes, you MUST escape them as `\"` or replace with single quotes.
- **`zone`**: Must be one of the zone slugs from `REFERENCE/domain-zones.md` — pick the single best match.
- Other domain-specific fields: define in your `brand.yaml` under `pipeline.queue_fields`.

## Sourcing guard rails

- **Queue depth >= [YOUR_QUEUE_DEPTH_THRESHOLD] is a HARD STOP.** Do not source. Do not search. Report and exit.
- 4-5 topics max per run. No duplicates. Append-only. No rewrites.
- Topics must spread across at least 2 different zones per run.
- Do NOT produce dossiers, cards, or research.
- Queue depth check comes FIRST — skip all work if queue is healthy.

## Deep-dive cron workflow (one topic per run)

1. Read `REFERENCE/.state/next-deepdive.json` — if the content is `"NONE"`, report "no [GATE_VALUE] topics awaiting deep-dive" and stop.
2. Read the first-pass card at the path in the result's `card` field. If the file doesn't exist, skip and report.
3. Read `REFERENCE/topic-dossier-template.md` and `REFERENCE/deep-dive-rubric.md`.
4. Pay special attention to the card's **Upgrade path** and **Open question** sections — these are research leads.
5. Do 2-3 web searches targeting the source types listed in `REFERENCE/deep-dive-rubric.md` under "Research targets." After each web search, fully process results before the next search. If a search returns a rate-limit error (429), write the cooldown file, stop all searches, and complete the dossier with sources already gathered.
6. Produce a full dossier using the template format. All sections must be filled. Follow the deep-dive rubric.
7. Derive the output filename from the entry's `card` path — take its filename and replace `REFERENCE/cards/` with `REFERENCE/dossiers/`. Save the dossier there.
8. **Source verification:** Run `python3 REFERENCE/pipeline-tools.py verify-sources <dossier-path>`. Review the JSON output:
   - **Failed URLs**: Try to find the correct URL via web search. If unfixable, remove the source and note it in "Open questions." Re-save.
   - **Unverified quotes**: If the quote text was not found on any cited page, check if you paraphrased with brackets or altered wording. Either correct the quote to match the actual source text or move it to "Open questions" as unverified.
   - **Unverified names**: Check for spelling variations. Fix or flag.
   - Re-run `verify-sources` after fixes. Do NOT skip this step or suggest the human run it.
9. Stage the index entry: `python3 REFERENCE/pipeline-tools.py stage --type deepdive --id <id> --topic "<TITLE>" --dossier "<PATH>"`.
10. Return a Discord-friendly summary of new findings in 6 bullets or fewer. Include the verify-sources result (e.g., "8/8 URLs verified").

## Deep-dive guard rails

- Process only ONE topic per run.
- Only deepen topics that meet your domain's deep-dive gate — skip those that don't.
- Max 3 web searches (use `web_fetch` on known URLs for additional sourcing).
- Do NOT rewrite the first-pass card — the dossier is a separate, richer artifact.
- If the first-pass card doesn't exist at the indexed path, skip and report.
- If web research fails 3 times (excluding 429 rate-limit errors), stop and report.
- If a file write fails twice, stop and report. Do not retry-loop.

## Web search coordination

All lanes that use `web_search` MUST follow this protocol:

**Before searching:**
1. Read `REFERENCE/.search-cooldown.json`. If `cooldownUntil` is in the future, do NOT search.

**After each successful search:**
Write `{"lastSearchAt": "<ISO>", "lane": "<lane-name>"}` to `REFERENCE/.search-cooldown.json`.

**On 429 (rate limit) error:**
Write `{"lastSearchAt": "<ISO>", "lane": "<lane-name>", "cooldownUntil": "<ISO + 5 min>"}` to `REFERENCE/.search-cooldown.json`. Stop ALL web searches for this run.

## CRITICAL: State file operations

**Never use the Write or Edit tool on JSONL files directly.** All queue and index
operations go through pre-computed state files and staging.

### Finding your next work item
Read `REFERENCE/.state/next-<lane>.json`
- If the content is `"NONE"`, report "<lane> empty" and stop.
- The JSON contains topic details plus a `_slug` field for filename generation.
- `_resolvedPaths` contains pre-resolved file paths for upstream artifacts — use these instead of searching the index.

### Staging index entries
Use the `stage` command to append index entries (do NOT write to `stage-append.jsonl` directly):
```
python3 REFERENCE/pipeline-tools.py stage --type <LANE> --id <ID> --topic "<TITLE>" [lane-specific flags]
```
- The command validates fields, builds JSON, and appends atomically.
- Do NOT write to `REFERENCE/dossier-index.jsonl` or `REFERENCE/.state/stage-append.jsonl` directly.

### Appending to the topic queue (sourcing only)
Append topic JSON as a single line to `REFERENCE/.state/stage-queue.jsonl`

### Updating topic status
Append `{"id":"<ID>","status":"done"}` to `REFERENCE/.state/stage-status.jsonl`

### Generating file slugs
Use the `_slug` field from the `.state/next-*.json` file. Do NOT generate slugs by hand.

### Checking queue depth (sourcing only)
Read `REFERENCE/.state/queue-depth.json` — if result >= [YOUR_QUEUE_DEPTH_THRESHOLD], HARD STOP.

### Per-lane JSON templates

```
# Lane 2 (card):     {"id":"<ID>","topic":"<TITLE>","verdict":"<VERDICT>","sources":<N>,"card":"<PATH>","parentEvent":<STR_OR_NULL>,"timestamp":"<ISO>"}
# Lane 3 (deepdive): {"id":"<ID>","topic":"<TITLE>","type":"deepdive","dossier":"<PATH>","timestamp":"<ISO>"}
# Lane 4 (brief):    {"id":"<ID>","topic":"<TITLE>","type":"brief","brief":"<PATH>","timestamp":"<ISO>"}
# Lane 5 (draft):    {"id":"<ID>","topic":"<TITLE>","type":"draft","draft":"<PATH>","timestamp":"<ISO>"}
# Lane 6 (qa):       {"id":"<ID>","topic":"<TITLE>","type":"qa","qa":"<PATH>","qaStatus":"<approved|needs-edits>","timestamp":"<ISO>"}
# Lane 7 (revision): {"id":"<ID>","topic":"<TITLE>","type":"revision","draft":"<PATH>","revisionRound":<1|2>,"timestamp":"<ISO>"}
# Lane 7b (short):   {"id":"<ID>","topic":"<TITLE>","type":"short-form","shortForm":"<PATH>","timestamp":"<ISO>"}
```

**IMPORTANT:**
- Use `sources` (NOT `sources_count`)
- QA paths must use `REFERENCE/qa/` (NOT `REFERENCE/qa-reports/`)
- File paths must use hyphens, never spaces
- Do NOT combine card and deepdive fields in one entry — they are separate lines

## Filename derivation rule

All lanes that create files MUST derive their output filename from the upstream entry's file path by swapping the directory prefix — never re-derive from the topic string. When appending to the index, the file path in the JSON entry MUST be copied from the variable you used in the file-save step.

## Index-integrity check workflow

1. Read `REFERENCE/dossier-index.jsonl` — parse each line as JSON. If any line fails to parse, report the line number and error.
2. Read `REFERENCE/topic-queue.jsonl` — same parse check.
3. For each index entry, check that every referenced file path exists. Try to read each path — if the file doesn't exist, record it as broken.
4. Check for banned fields (`sources_count`) and merged entries (both `verdict` and `type`).
5. If all paths resolve AND checks pass, report "index integrity OK — N entries, 0 broken paths" and stop.
6. If any paths are broken, report each issue. Do NOT fix or modify any files — read-only check.

## Reformat draft (manual, one-shot)

Triggered by: `Reformat <id> as <format>`
Example: `Reformat proj-006 as a thread`

1. Parse the topic ID and target format from the prompt.
   - Valid formats: narrative long-post, ranked list, "remember when" thread, hot take + receipts, visual carousel, before/after comparison, mini-essay.
   - If the format is ambiguous, pick the closest match.
2. Read `REFERENCE/dossier-index.jsonl`. Find all entries for the given ID.
3. Gather artifacts — all four are required, stop and report if any are missing:
   - Card, dossier, brief, existing draft, QA report (if exists).
4. Read `REFERENCE/reformat-draft-prompt.md` for the full procedure.
5. Read `REFERENCE/post-draft-template.md` and `REFERENCE/post-draft-rubric.md`.
6. If `REFERENCE/brand-config.md` exists, read it for voice guidelines.
7. Analyze the existing draft and QA report: which quotes/facts landed, what tone was achieved, what QA flagged.
8. Adapt the brief's creative direction for the target format — new hook, new structure, adjusted cadence.
9. Write the new draft following the post-draft rubric's voice rules and format-specific guidance.
10. Self-check before saving: thesis present, sources cited, anti-slop honored, hook works for target format.
11. Save to `REFERENCE/drafts/<id>-<slug>-<format-short>.md`.
12. Stage the index entry: `python3 REFERENCE/pipeline-tools.py stage --type draft --id <ID> --topic "<TITLE>" --draft "<PATH>"`.
13. Return a Discord-friendly summary: topic, original format, new format, opening hook, and word count.

## Reformat guard rails

- ONE reformat per run.
- NO web searches — all material comes from existing artifacts.
- Do NOT modify or replace existing drafts, briefs, cards, dossiers, QA reports, or index entries.
- The reformat is a new file alongside the original, not a replacement.
- The self-check is inline — do NOT produce a separate QA report.
- If a file write fails twice, stop and report. Do not retry-loop.

## Rules

- Do not modify completed topics.
- Cite URLs.
- When calling `web_search`, pass ONLY the `query` parameter. Do not pass `search_lang`, `ui_lang`, `language`, `country`, or `count`.
