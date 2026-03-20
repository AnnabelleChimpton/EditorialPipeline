# Short-form cron workflow (one topic per run)

1. Read `REFERENCE/.state/next-short-form.json` — if the content is `"NONE"`, report "no approved drafts awaiting short-form" and stop.
2. The state file includes `_resolvedPaths` with pre-resolved file paths. Read the approved draft from `_resolvedPaths.draft`. If the file doesn't exist, skip and report.
3. Read the post brief from `_resolvedPaths.brief`.
4. Read `REFERENCE/short-form-template.md` and `REFERENCE/short-form-rubric.md`.
5. If `REFERENCE/brand-config.md` exists, read it for voice guidelines.
6. Identify the sharpest material from the draft: the best fact, the thesis, the best line, and the most entertaining moment.
7. Write a 150-250 word standalone short-form post following the rubric. This is NOT a summary — it's a self-contained piece that pulls the best material from the draft.
8. Choose the platform: use the brief's secondary platform if one exists; otherwise use Threads for consumer-facing topics or LinkedIn for industry/professional topics.
9. Fill out the compliance notes honestly.
10. Derive the output filename from the approved draft's path — append `-short` before `.md` (e.g., `proj-021-slug.md` -> `proj-021-slug-short.md`). Save to `REFERENCE/short-form/`.
11. **Slop check:** Use the `process` tool to execute `python3 REFERENCE/pipeline-tools.py slop-check <short-form-path>`. If it returns FAIL, fix every flagged pattern and re-run until it passes. Do NOT skip this or suggest the human run it.
12. Append the index entry as a single JSON line to `REFERENCE/.state/stage-append.jsonl`:
    `{"id":"<ID>","topic":"<TITLE>","type":"short-form","shortForm":"<PATH>","timestamp":"<ISO>"}`
13. Return a Discord-friendly summary in 6 bullets or fewer: topic, platform, opening hook, word count, and link to full draft.

## Guard rails

- Process only ONE topic per run.
- NO web searches — all material comes from the existing draft and brief.
- Only produce short-form for topics with a QA-approved draft.
- Do not modify existing cards, dossiers, briefs, drafts, QA reports, or index entries.
- If the draft or brief file doesn't exist at the indexed path, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the voice rules in `REFERENCE/short-form-rubric.md` and `REFERENCE/brand-config.md`.
