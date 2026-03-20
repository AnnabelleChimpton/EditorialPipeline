# Revision cron workflow (one topic per run)

1. Read `REFERENCE/.state/next-revision.json` — if the content is `"NONE"`, report "no drafts awaiting revision" and stop.
2. The result includes `_revisionRound` (the round to produce), `_qaTarget` (the draft that was QA'd), and `_resolvedPaths` with pre-resolved file paths.
3. If `_revisionRound` > 2, STOP — revision cap reached. Append a human-review entry and report.
4. Read the QA report at the path in the result's `qa` field. If the file doesn't exist, skip and report.
5. Read the draft that was QA'd (from `_qaTarget.draft`).
6. Read the post brief from `_resolvedPaths.brief` and dossier from `_resolvedPaths.dossier`.
7. Read `REFERENCE/post-revision-rubric.md` and `REFERENCE/post-draft-rubric.md`.
8. If `REFERENCE/brand-config.md` exists, read it for voice guidelines.
9. **Create the revision file using copy-then-edit (MANDATORY — do NOT rewrite the whole file):**
   a. Use the `process` tool to copy the original draft to the revision filename:
      `cp <original-draft-path> <revision-filename>`
      where the revision filename is derived from the draft path: strip `.md` and append `-r<N>.md`.
   b. Use `edit` operations (find-and-replace) on the copied file to fix each QA issue. This is critical: make **targeted, surgical edits** — do NOT rewrite the entire file with `write`. Each edit should replace only the specific passage QA flagged.
   c. For each QA issue: find the exact quoted passage, apply the fix, verify the fix doesn't introduce new problems.

   **CRITICAL — most common revision failure modes (avoid these):**

   a) **"Fix one, introduce another"**: When you rewrite a flagged sentence, do NOT use a different variant of the same banned pattern. Example of WRONG fix:
      - QA flags: "This wasn't just a hack. It was a wake-up call."
      - Bad revision: "It's not about the hack itself — it's about what it revealed." <- STILL a negation-reframe!
      - Good revision: "The hack exposed a vulnerability that three other companies shared."

   b) **Negation-reframe rewrites** — the pattern "It's not X, it's Y" has many disguises. ALL of these are the same banned pattern:
      - "This isn't X; it's Y" / "It wasn't X. It was Y." / "isn't about X, it's about Y"
      - "This isn't just X; it's Y" / "not merely X — it's Y"
      - "The real issue isn't X — it's Y"
      To fix: state the Y directly without negating X first. "The ruling established corporate liability" — not "This isn't about one chatbot; it's about corporate liability."

   c) **Throat-clear rewrites** — if QA flags "what happened next" or an atmospheric opener, do NOT replace it with a different throat-clear. Go straight to the subject:
      - QA flags: "What happened next shocked everyone."
      - Bad revision: "The aftermath proved devastating." <- still a throat-clear
      - Good revision: "Moffatt filed a claim with the BC tribunal." <- subject + action

   d) **Voice drift during revision** — do not make the prose MORE formal while fixing issues. The brand voice is conversational. If anything, loosen up, don't polish.

10. Preserve everything the QA report praised or did not flag. Do not rewrite approved sections.
11. After all edits are applied, append a `## Revision notes` section to the end of the file documenting: what changed, what was preserved, which QA issues were addressed.
12. **Self-review before slop check:** For each QA issue you fixed, re-read the replacement sentence and ask: "Did I use a negation-reframe? Did I use a throat-clear? Did I add a metaphor?" If yes, edit it again.
13. **Slop check:** Use the `process` tool to execute `python3 REFERENCE/pipeline-tools.py slop-check <revision-draft-path>`. If it returns FAIL, fix every flagged pattern and re-run until it passes. Do NOT skip this or suggest the human run it.
14. Append the index entry as a single JSON line to `REFERENCE/.state/stage-append.jsonl`:
    `{"id":"<ID>","topic":"<TITLE>","type":"revision","draft":"<PATH>","revisionRound":<1|2>,"timestamp":"<ISO>"}`
15. Return a Discord-friendly summary in 6 bullets or fewer: topic, revision round, number of QA issues addressed, and key changes made.

## Guard rails

- Process only ONE topic per run.
- NO web searches — all material comes from existing drafts, QA reports, briefs, and dossiers.
- Do NOT modify the original draft file or previous revision — revisions are copies with targeted edits (`-r1`, `-r2`). Always `cp` first, then `edit`.
- Do NOT modify existing QA reports, briefs, dossiers, cards, or index entries.
- Maximum 2 revision rounds. If `-r2` still fails QA, flag for human review. Do NOT produce `-r3`.
- If the QA report, draft, or brief file doesn't exist, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
