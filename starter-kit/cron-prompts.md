# Cron Prompts — Seven-Lane Research Pipeline

These prompts go in the `message` field of each cron job in `cron/jobs.json`.
Copy the contents of each code block directly into the job's `payload.message` value.

Replace `[YOUR PROJECT]`, `[YOUR DOMAIN]`, and `[YOUR SEARCH TERMS]` with your
actual project name, subject area, and search queries. Update the Discord channel
ID in the job's `delivery.to` field.

**Domain-specific placeholders in these prompts:**
- `[YOUR_GATE_FIELD]` / `[YOUR_GATE_VALUE]` — the field and value that gates Lane 3 deep-dives. VCE uses `verdict: "strong"`. News uses `confidence: "confirmed"` or `"developing"`. Your domain should define what "ready for deep-dive" means.
- `[YOUR_QUEUE_FIELDS]` — the JSONL fields appended per item in Lane 1. Structural fields (`id`, `status`, `notes`, `dossier`) are required. Domain-specific fields (VCE: `hook`, `era`, `sourceability`; News: `urgency`, `confidence`, `eventDate`) should match your schema.
- `[YOUR_QUEUE_DEPTH_THRESHOLD]` — how many queued items before sourcing stops. VCE uses 30 (slow-burn topics). News uses 15 (fast-moving events). Tune for your domain's throughput.

---

## Lane 1 — Topic Sourcing

Schedule: `15 */4 * * *` (every 4 hours at :15)
Timeout: 900 seconds

### Prompt

```
## [YOUR PROJECT] Topic Sourcing — zone-aware adaptive queue refill

### Steps

1. Read REFERENCE/topic-queue.jsonl. Count entries where `status` is `"queued"`. This is your queue depth.
2. **If queue depth >= [YOUR_QUEUE_DEPTH_THRESHOLD]**: report "queue healthy (N queued)" and STOP. Do not source.
3. Read REFERENCE/domain-zones.md — this defines the thematic zones your domain covers.
4. Read REFERENCE/dossier-index.jsonl — note every existing id, topic, theme, and category (including done topics). Combined with topic-queue.jsonl, this is your dedup set.
5. **Category audit**: tabulate how many existing topics (queue + index) fall into each zone from domain-zones.md. Identify the 2-3 most underrepresented zones.
6. Construct 1-2 web searches targeted at the underrepresented zones. Use zone-specific search terms (e.g., "early 2000s [YOUR DOMAIN] [zone-specific keywords]") instead of a single generic query. Max 2 web searches total.
7. Pick 4-5 candidates with a clear hook and tension (humor, scandal, status, fandom, cultural friction). Candidates MUST come from at least 2 different zones.
8. If search fails, STOP and report sourcing failed. Do NOT invent topics.
9. Filter out candidates that overlap with existing entries — match on theme, not just exact name. When in doubt, skip it.
10. For each candidate (4-5 max), append:
    a. One JSONL line to REFERENCE/topic-queue.jsonl (fields per REFERENCE/schema.md: id, status queued, notes, dossier null, plus [YOUR_QUEUE_FIELDS])
    b. One - [ ] id — topic line to topics/inbox.md

IMPORTANT: When calling web_search, pass ONLY the `query` parameter. Do not pass `search_lang`, `ui_lang`, `language`, `country`, or `count` — these cause Brave API errors.

### Guard rails
- 4-5 topics max. No duplicates. Append-only. No rewrites.
- Topics must spread across at least 2 different zones per run.
- Do NOT produce dossiers, cards, or research.
- Queue depth check comes FIRST — skip all work if queue is healthy.

### Output
Discord-friendly summary, 6 bullets or fewer. Always include current queue depth and which zones were targeted.
```

---

## Lane 2 — First-Pass Research

Schedule: `0 */2 * * *` (every 2 hours)
Timeout: 900 seconds

### Prompt

```
Cron run. Follow the cron workflow in AGENTS.md exactly.

If no queued topic remains, say "queue empty" and stop.
If a file update fails twice, report the blocker and stop.
Abandon web research after 3 failed fetches.

IMPORTANT: When calling web_search, pass ONLY the `query` parameter. Do not pass `search_lang`, `ui_lang`, `language`, `country`, or `count` — these cause Brave API errors.

Return a Discord-friendly summary in 6 bullets or fewer.
```

---

## Lane 3 — Deep Dive

Schedule: `45 * * * *` (hourly at :45)
Timeout: 900 seconds

### Prompt

```
## [YOUR PROJECT] Deep-Dive — daily dossier pass

Follow the deep-dive cron workflow in AGENTS.md exactly.

### Steps

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `[YOUR_GATE_FIELD]` is `[YOUR_GATE_VALUE]` and `dossier` is `null` or absent. (Example: VCE uses `verdict: "strong"`. News uses `confidence: "confirmed"` or `"developing"`.)
3. If no eligible topic exists, say "no topics awaiting deep-dive" and stop.
4. Read the first-pass card at the path in the entry's `card` field. If the file doesn't exist, skip and report.
5. Read `REFERENCE/topic-dossier-template.md` and `REFERENCE/deep-dive-rubric.md`.
6. Pay special attention to the card's **Upgrade path** and **Open question** sections — these are your research leads.
7. Do 2-3 web searches targeting: contemporaneous sources, forum/blog archives, specific people/incidents, absurd details, pull-quotable material. Supplement with `web_fetch` on URLs already cited in the first-pass card — fetching a known URL does NOT count toward the search budget. After each web search, fully process results before the next search. If a search returns a rate-limit error (429 / "too many requests"), do NOT count it as a failed fetch — instead, do non-search work (draft a dossier section, re-read a source, organize notes) then retry. Only count non-429 failures toward the 3-failure abort limit.
8. Produce a full dossier using the template. All sections must be filled. Follow the deep-dive rubric.
9. Derive the output filename from the entry's `card` path — take its filename and replace `REFERENCE/cards/` with `REFERENCE/dossiers/`. Save the dossier there. Do NOT re-derive the slug from the topic string.
10. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the original entry's fields plus `"type": "deepdive"` and `"dossier"` set to the exact path you saved to.
11. Optionally append one brief line to `LOG.md`.
12. Return a Discord-friendly summary of new findings in 6 bullets or fewer.

### Guard rails
- ONE topic per run.
- Only deepen topics matching your gate criteria (see step 2). Skip topics that don't meet the gate threshold.
- Max 3 web searches (use `web_fetch` on known URLs for additional sourcing).
- Do NOT rewrite the first-pass card.
- Append-only to dossier-index.jsonl.
- If card file missing, skip and report.
- If web research fails 3 times (excluding 429 rate-limit errors), stop and report.
- If a file write fails twice, stop and report.
- IMPORTANT: When calling web_search, pass ONLY the `query` parameter. Do not pass `search_lang`, `ui_lang`, `language`, `country`, or `count` — these cause Brave API errors.
```

---

## Lane 4 — Post Brief

Schedule: `30 * * * *` (hourly at :30)
Timeout: 300 seconds

### Prompt

```
## [YOUR PROJECT] Post Brief — editorial pass

Follow the post-brief cron workflow in AGENTS.md exactly.

### Steps

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"deepdive"` and no brief file exists at `REFERENCE/briefs/<id>-<slug>.md`. To check, try to read the expected brief path — if the file doesn't exist, this topic needs a brief.
3. If no eligible topic exists, say "no dossiers awaiting post brief" and stop.
4. Read the deep-dive dossier at the path in the entry's `dossier` field. If the file doesn't exist, skip and report.
5. Also read the first-pass card at the entry's `card` field for additional context.
6. Read `REFERENCE/post-brief-template.md` and `REFERENCE/post-brief-rubric.md`.
7. Evaluate the dossier material: what format fits best? What platform? What's the sharpest hook? What tone? What should be cut?
8. Produce a post brief following the template. Every section must be filled.
9. Derive the output filename from the entry's `dossier` path — take its filename and replace `REFERENCE/dossiers/` with `REFERENCE/briefs/`. Save the brief there. Do NOT re-derive the slug from the topic string.
10. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `topic`, plus `"type": "brief"` and `"brief"` set to the exact path you saved to.
11. Optionally append one brief line to `LOG.md`.
12. Return a Discord-friendly summary in 6 bullets or fewer: topic, recommended format, platform, hook, and key angle.

### Guard rails
- ONE topic per run.
- NO web searches — all material comes from existing dossiers and cards.
- Only brief topics with a completed deep-dive dossier.
- Do NOT modify existing cards, dossiers, or index entries.
- Append-only to dossier-index.jsonl.
- If dossier file missing, skip and report.
- If a file write fails twice, stop and report.
- Follow the anti-slop rules in `REFERENCE/post-brief-rubric.md`.
```

---

## Lane 5 — Post Draft

Schedule: `10 * * * *` (hourly at :10)
Timeout: 300 seconds

### Prompt

```
## [YOUR PROJECT] Post Draft — copywriting pass

Follow the post-draft cron workflow in AGENTS.md exactly.

### Steps

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"brief"` and no draft file exists at `REFERENCE/drafts/<id>-<slug>.md`. To check, try to read the expected draft path — if the file doesn't exist, this topic needs a draft.
3. If no eligible topic exists, say "no briefs awaiting draft" and stop.
4. Read the post brief at the path in the entry's `brief` field. If the file doesn't exist, skip and report.
5. Find the `"deepdive"` entry for the same `id` in the index. Read the dossier at its `dossier` path.
6. Read `REFERENCE/post-draft-template.md` and `REFERENCE/post-draft-rubric.md`.
7. Write the post following the brief's direction: use its format, adapt its hook for the opening, stay in its tone register, hit its key moments, exclude what it says to leave out, honor its anti-slop flags.
8. Use the dossier's pull quotes, specific incidents, and facts as raw material — don't just summarize the dossier.
9. Fill out the compliance notes section in the template honestly.
10. Derive the output filename from the brief entry's `brief` path — take its filename and replace `REFERENCE/briefs/` with `REFERENCE/drafts/`. Save the draft there. Do NOT re-derive the slug from the topic string.
11. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `topic`, plus `"type": "draft"` and `"draft"` set to the exact path you saved to.
12. Optionally append one brief line to `LOG.md`.
13. Return a Discord-friendly summary in 6 bullets or fewer: topic, format used, platform, opening hook, and word/tweet count.

### Guard rails
- ONE topic per run.
- NO web searches — all material comes from existing dossiers and briefs.
- Only draft topics with a completed post brief.
- Do NOT modify existing cards, dossiers, briefs, or index entries.
- Append-only to dossier-index.jsonl.
- If brief or dossier file missing, skip and report.
- If a file write fails twice, stop and report.
- Follow the voice rules and format guidance in `REFERENCE/post-draft-rubric.md`.
```

---

## Lane 6 — QA Review

Schedule: `50 * * * *` (hourly at :50)
Timeout: 300 seconds

### Prompt

```
## [YOUR PROJECT] QA Review — editorial quality check

Follow the QA cron workflow in AGENTS.md exactly.

### Steps

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"draft"` or `"revision"` and no QA report exists for that draft version. For original drafts, check `REFERENCE/qa/<id>-<slug>.md`. For revision drafts (`-r1`, `-r2`), check `REFERENCE/qa/<id>-<slug>-r<N>.md`. If the file doesn't exist, this draft needs review.
3. If no eligible topic exists, say "no drafts awaiting QA" and stop.
4. Read the draft at the path in the entry's `draft` field. If the file doesn't exist, skip and report.
5. Find the `"brief"` entry for the same `id` in the index. Read the brief at its `brief` path.
6. Read `REFERENCE/qa-rubric.md`.
7. Run ALL QA checks against the draft:
   a. **Brief compliance**: format, hook, tone, key moments, exclusions, sources, length.
   b. **Anti-slop scan**: check every flag from the brief + universal AI tells (see `REFERENCE/qa-rubric.md` Check 2) + any domain-specific clichés from `REFERENCE/brand-config.md`.
   c. **Substance check**: does it have a point of view? Are quotes/incidents doing the work? Does the ending land?
   d. **Platform fit**: does it actually work on the specified platform?
8. Be specific — quote the draft when flagging issues.
9. If the draft is genuinely good, approve it. Don't manufacture problems.
10. Derive the output filename from the entry's `draft` path — take its filename and replace `REFERENCE/drafts/` with `REFERENCE/qa/`. Save the QA report there. Do NOT re-derive the slug from the topic string.
11. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `topic`, plus `"type": "qa"`, `"qa"` set to the exact path you saved to, and `"qaStatus": "approved"` or `"qaStatus": "needs-edits"`.
12. Optionally append one brief line to `LOG.md`.
13. Return a Discord-friendly summary in 6 bullets or fewer: topic, QA status, key issues (if any), and what works.

### Guard rails
- ONE topic per run.
- NO web searches.
- Do NOT rewrite or modify the draft — only create a QA report.
- Do NOT modify existing cards, dossiers, briefs, drafts, or index entries.
- Append-only to dossier-index.jsonl.
- If draft or brief file missing, skip and report.
- If a file write fails twice, stop and report.
- Be honest: good drafts get approved, bad drafts get specific actionable feedback.
- Revision drafts (`-r1`, `-r2`) get the same QA treatment as originals.
```

---

## Lane 7 — Revision

Schedule: `20 * * * *` (hourly at :20)
Timeout: 300 seconds

### Prompt

```
## [YOUR PROJECT] Revision — fix QA-flagged drafts

Follow the revision cron workflow in AGENTS.md exactly.

### Steps

1. Read `REFERENCE/dossier-index.jsonl`.
2. Find the first entry where `type` is `"qa"` and `qaStatus` is `"needs-edits"`, and whose `id` does NOT already have a revision draft for that round.
3. Determine the revision round:
   a. If the QA report was for the original draft, this is round 1 → produce `-r1`.
   b. If the QA report was for `-r1`, this is round 2 → produce `-r2`.
   c. If the QA report was for `-r2`, STOP. Append an index entry with `"type": "revision"`, `"revisionRound": 2`, `"revisionStatus": "human-review"` and report "revision cap reached."
4. If no eligible topic exists, say "no drafts awaiting revision" and stop.
5. Read the QA report at the entry's `qa` path. If missing, skip and report.
6. Read the draft that was QA'd (original or previous revision).
7. Find the `"brief"` entry for the same `id`. Read the brief.
8. Find the `"deepdive"` entry for the same `id`. Read the dossier.
9. Read `REFERENCE/post-revision-rubric.md` and `REFERENCE/post-draft-rubric.md`.
10. Address every numbered issue in the QA report:
    a. Find the quoted passage in the draft.
    b. Apply the fix or suggested direction.
    c. Verify the fix doesn't introduce new anti-slop violations or voice problems.
11. Preserve everything the QA report praised or did not flag. Do NOT rewrite approved sections.
12. Fill out the revision notes section: what changed, what was preserved, which QA issues were addressed.
13. Derive the base filename from the QA'd draft's path — strip `.md` and append `-r<N>.md`. Save there. Do NOT re-derive the slug from the topic string.
14. Append one JSON line to `REFERENCE/dossier-index.jsonl` with the entry's `id`, `topic`, plus `"type": "revision"`, `"draft"` set to the exact path you saved to, and `"revisionRound": <N>`.
15. Optionally append one brief line to `LOG.md`.
16. Return a Discord-friendly summary in 6 bullets or fewer: topic, revision round, QA issues addressed, key changes.

### Guard rails
- ONE topic per run.
- NO web searches — all material from existing artifacts.
- Do NOT modify original drafts, QA reports, briefs, dossiers, or cards.
- Append-only to dossier-index.jsonl.
- Max 2 revision rounds. After r2 fails QA → flag for human review, do NOT produce r3.
- If QA report, draft, or brief file missing, skip and report.
- If a file write fails twice, stop and report.
- Follow `REFERENCE/post-revision-rubric.md` and voice rules in `REFERENCE/post-draft-rubric.md`.
```

---

## Index-Integrity Check

Schedule: `30 */6 * * *` (every 6 hours at :30)
Timeout: 120 seconds

### Prompt

```
## [YOUR PROJECT] Index-Integrity Check

Follow the index-integrity check workflow in AGENTS.md exactly.

### Steps

1. Read `REFERENCE/dossier-index.jsonl`.
2. For each entry, check every referenced file path (`card`, `dossier`, `brief`, `draft`, `qa`). Try to read each path — if the file doesn't exist, record it as broken.
3. If all paths resolve, report "index integrity OK — N entries, 0 broken paths" and stop.
4. If any paths are broken, report each one: entry `id`, field name, and the broken path. Format as a numbered list.
5. Do NOT fix or modify any files — this is a read-only check.

### Guard rails
- Read-only. Do NOT modify any files.
- Check ALL entries, not just the latest.
- Report broken paths clearly so they can be fixed manually.
```
