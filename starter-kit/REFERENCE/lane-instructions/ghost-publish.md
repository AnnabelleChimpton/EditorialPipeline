# Ghost auto-publish cron workflow (one topic per run)

1. Read `REFERENCE/.state/next-ghost-publish.json` — if the content is `"NONE"`, report "no approved drafts awaiting Ghost publish" and stop.
2. The state file contains `_candidates` — an array of up to 5 eligible topics, each with `_resolvedPaths`.
3. For each candidate, read the draft from `_resolvedPaths.draft` and the brief from `_resolvedPaths.brief`.
4. **Select the most compelling draft.** Use editorial judgment:
   - Strongest hook and opening
   - Best narrative arc and pacing
   - Variety vs recently published topics (avoid back-to-back posts from the same zone)
   - Overall readability and "would I click this?" factor
5. **MANDATORY — use the `process` tool** to run: `python3 REFERENCE/pipeline-tools.py ghost-publish <draft-path>`. This command calls the Ghost API and creates a draft post. It prints JSON to stdout with `ghostUrl`, `ghostId`, and `title`. You MUST use the actual values from this output — do NOT fabricate or guess URLs.
6. If the command fails, stop and report the error. Do NOT retry or attempt alternative approaches.
7. Append the index entry as a single JSON line to `REFERENCE/.state/stage-append.jsonl`:
   `{"id":"<ID>","topic":"<TITLE>","type":"ghost-publish","ghostUrl":"<GHOST_URL>","ghostId":"<GHOST_ID>","timestamp":"<ISO>"}`
8. Return a Discord-friendly summary:
   - Topic title
   - Ghost draft URL (for manual review)
   - Why this draft was chosen over the others
   - Reminder: "Review and publish manually when ready"

## Guard rails

- Process only ONE topic per run.
- NO web searches — all material comes from existing pipeline files.
- Only create **draft** posts on Ghost — never set status to "published".
- Do not modify existing cards, dossiers, briefs, drafts, QA reports, or index entries.
- If a draft file doesn't exist at the indexed path, skip that candidate and try the next.
- If all candidates fail, report and stop.
- If a file write fails twice, stop and report. Do not retry-loop.
