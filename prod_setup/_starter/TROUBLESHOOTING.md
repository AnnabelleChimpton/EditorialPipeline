# Troubleshooting

Common issues encountered during development, with symptoms and fixes.

---

## 1. Sourcing lane times out repeatedly

**Symptom:** Sourcing job shows consecutive errors and never completes. Job gets auto-disabled after 4+ failures.

**Cause:** `maxConcurrentRuns` defaulted to 1. Timed-out jobs leave zombie tasks occupying the single slot, so the next scheduled run can never start.

**Fix:**
- Set `maxConcurrentRuns` in `openclaw.json` to at least (active lane count + 1).
- Clear stale session entries left by the zombied runs.
- Reset `consecutiveErrors` to 0 on the job.
- Re-enable the job and stagger its schedule away from other lanes.

---

## 2. Discord delivery fails / no message received

**Symptom:** Job runs successfully but no Discord message arrives.

**Cause:** Wrong destination format. `user:<id>` does not work for DMs.

**Fix:**
- Use `channel:<channel-id>` format, even for DM channels.
- Find the channel ID by enabling Discord developer mode, right-clicking the DM conversation, and copying the channel ID.

---

## 3. Cron jobs collide / overlap

**Symptom:** Jobs fail intermittently, especially when multiple fire at the same time.

**Cause:** Schedules too close together, or `maxConcurrentRuns` too low for the number of active lanes.

**Fix:**
- Stagger schedules across the hour (e.g. :00, :10, :15, :30, :45, :50).
- Set `maxConcurrentRuns` >= active lane count + 1.
- After changing concurrency, restart the gateway.

---

## 4. Job completes but produces no output

**Symptom:** Job status is "ok" but no card, dossier, brief, draft, or QA report was created.

**Cause:** Selection logic found no eligible work. The queue is empty, no cards have a "strong" verdict, no dossiers lack briefs, etc.

**Check:** Read the job's delivery message. It should say something like "queue empty" or "no eligible topics."

**Not a bug.** The lane correctly determined there was nothing to do.

---

## 5. Append-only JSONL gets corrupted

**Symptom:** Lanes skip topics, produce duplicates, or fail to parse the index.

**Cause:** A failed or interrupted write left a partial JSON line, or a job overwrote the file instead of appending.

**Fix:**
- Open the JSONL file and check the last line. If it is incomplete JSON, delete that line.
- Ensure all cron prompts explicitly say "append-only" for JSONL files — never full-file rewrite.
- If entries are duplicated, deduplicate by `id` and keep the latest.

---

## 6. Card/dossier quality is low (slop)

**Symptom:** Output passes the lane but reads generic, padded, or obviously AI-generated.

**Cause:** The rubric is not strict enough for the domain, or the model is ignoring anti-slop rules.

**Fix:**
- Add domain-specific anti-slop flags to the relevant rubric (e.g. `first-pass-dossier-rubric.md`, `deep-dive-rubric.md`, `post-draft-rubric.md`).
- Tighten the minimum acceptance bar (raise the "strong" threshold).
- Consider switching models — `openai-codex/gpt-5.4` has been more reliable than Mistral for structured output.

---

## 7. Rate-limit errors (429) during web searches

**Symptom:** Research lanes fail mid-run with "too many requests."

**Already handled:** The deep-dive lane prompt says not to count 429s as failures. The lane should do non-search work (processing already-fetched results) and retry.

**If persistent:**
- Stagger research-heavy lanes further apart.
- Reduce the per-run search budget (Lane 1 is capped at 2 searches; Lane 3 at 2-3).
- Check whether multiple workspaces are sharing the same API quota.

---

## 8. Lane 5 drafts don't match the brief

**Symptom:** QA lane flags compliance issues repeatedly — wrong tone, missing key moments, ignoring the brief's hook.

**Cause:** The Lane 5 cron prompt or `post-draft-rubric.md` is not explicit enough about following the brief's creative direction.

**Fix:**
- Verify the Lane 5 prompt references the brief's hook, tone notes, key moments, and anti-slop flags.
- Tighten `post-draft-rubric.md` to require brief-compliance checks before the draft is accepted.
- Add a "brief adherence" section to the QA rubric so failures are caught consistently.

---

## 9. Web search fails with `invalid_search_lang`

**Symptom:** Research lane (1, 2, or 3) hits 3 consecutive `invalid_search_lang` errors and aborts. No card or dossier is produced. The topic is left unprocessed.

**Cause:** The model hallucinates extra `web_search` parameters. When it passes `search_lang: "en-US"`, Brave rejects it — only bare language codes like `"en"` are valid. If the model fires multiple searches in parallel with the bad value, all fail simultaneously and hit the 3-failure abort guardrail before it can self-correct.

**Fix:**
- Add this line to the research lane's cron prompt (before the guard rails section): `IMPORTANT: When calling web_search, pass ONLY the query parameter. Do not pass search_lang, ui_lang, language, country, or count — these cause Brave API errors.`
- Re-run the job manually with `openclaw cron run <job-id>`. The topic will be picked up cleanly since the failed run didn't write any files or index entries.

**Note:** In most runs the model self-corrects after one error. The total failure only happens when it parallelizes all searches with the bad parameter. The prompt fix reduces the odds but can't guarantee it — this is a model behavior issue, not a config issue.

---

## 10. Revision loop won't stop

**Symptom:** The same topic keeps getting revised and re-QA'd, or you see `-r3` or higher files appearing.

**Cause:** The revision cap isn't being enforced, or the QA lane is too strict and keeps flagging minor issues.

**Fix:**
- Verify Lane 7's cron prompt includes the revision cap logic: after `-r2` fails QA, it should append a `revisionStatus: "human-review"` entry and stop.
- Check `dossier-index.jsonl` for the topic — look for `type: "revision"` entries. There should be at most 2 per topic.
- If QA is too strict: review `REFERENCE/qa-rubric.md` and consider loosening the bar for minor stylistic issues vs. substantive problems.

---

## 11. Revised draft not picked up by QA

**Symptom:** Lane 7 produces a `-r1.md` file and appends to the index, but Lane 6 never QA-reviews it.

**Cause:** Lane 6's selection rule doesn't cover revision drafts, or the file naming doesn't match what Lane 6 expects.

**Fix:**
- Verify Lane 6's cron prompt checks for both `type: "draft"` and `type: "revision"` entries in `dossier-index.jsonl`.
- Check that the revision file naming follows the convention: `REFERENCE/drafts/<id>-<slug>-r1.md`. The QA lane looks for the absence of a QA report at `REFERENCE/qa/<id>-<slug>-r1.md`.
- Verify the index entry for the revision has `"type": "revision"` and a `"draft"` field pointing to the correct path.
