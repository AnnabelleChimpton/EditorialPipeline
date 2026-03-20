# POST REVISION RUBRIC

This rubric is for Lane 7 — the revision pass that takes a QA report with `needs-edits` status and produces a corrected draft that addresses every flagged issue.

## Goal
Produce a revised draft that fixes every issue the QA report identified, without introducing new problems or degrading what already worked. The revised draft replaces the original as the artifact under review — it goes back to Lane 6 for a fresh QA pass.

## Minimum acceptance bar
A revision is acceptable only if it:
- Addresses every specific issue listed in the QA report (quote by quote, not paraphrased)
- Preserves sections, lines, and structural choices the QA report praised or did not flag
- Stays within the original brief's creative direction (format, tone, hook, key moments, length)
- Does not introduce new anti-slop violations
- Fills out the revision notes section honestly: what changed, what was preserved, what QA issues were addressed

## Revision rules
- Fix what QA flagged. Do not rewrite sections QA approved.
- Treat the QA report as a punch list: every numbered issue must be resolved. Anti-slop issues are NEVER "unresolvable" — if QA flagged a banned phrase or structure, you must rewrite that sentence using a different construction. "Retained for rhetorical purposes" is not an acceptable resolution. If you can't find an alternative construction, cut the sentence entirely.
- Do NOT do web research. All material comes from the existing dossier, brief, and original draft.
- Do NOT change the format, platform, or hook direction unless the QA report explicitly called for it.
- Preserve the voice: if the original draft had specific good lines or structural choices noted by QA, keep them intact.

## Copy-then-edit workflow (MANDATORY)

Revisions MUST be created using copy-then-edit, not full-file rewrite:
1. Copy the original draft to the revision filename using the `process` tool: `cp <original-draft-path> <revision-filename>`
2. Make targeted `edit` operations on the copied file — one edit per QA issue.
3. Do NOT use `write` to regenerate the entire file. This avoids content filter issues with models that may flag sensitive quoted material during regeneration.

This approach is mandatory because:
- It prevents the model from introducing new problems in sections QA already approved
- It avoids OpenAI content filter crashes when drafts contain quoted sensitive material (profanity, slurs in historical quotes, etc.)
- It produces smaller, more reviewable diffs

## Pre-save slop check (MANDATORY)

Before saving the revision, use the `process` tool to execute:
```
python3 REFERENCE/pipeline-tools.py slop-check <your-revision-file>
```
If the result is `FAIL`, fix every flagged pattern before saving. Do NOT submit a revision that fails the mechanical check — it will just come back from QA again.

## Revision cap
- Maximum 2 revision rounds per topic: `-r1` and `-r2`.
- If a `-r2` draft still receives `qaStatus: "needs-edits"`, do NOT produce `-r3`. Instead, flag the topic for human intervention by appending an index entry with `"type": "revision"`, `"revisionRound": 2`, and `"revisionStatus": "human-review"`.
- This prevents infinite revision loops. Two rounds of machine editing is the limit — after that, a human needs to look at it.

## File naming
- First revision: `REFERENCE/drafts/<id>-<slug>-r1.md`
- Second revision: `REFERENCE/drafts/<id>-<slug>-r2.md`
- Original draft stays intact at `REFERENCE/drafts/<id>-<slug>.md` for diffing.

## Voice rules
Same as `post-draft-rubric.md`. The revision must NOT introduce any of the voice violations listed there. If the original draft was clean on voice and QA only flagged structural or substance issues, the revision should sound the same — not "more polished" or "more careful," just fixed.

## What this lane does NOT do
- No web searches — all material comes from existing artifacts
- No modifications to existing QA reports, briefs, dossiers, or cards
- No changes to the original draft file — revisions are new files (`-r1`, `-r2`)
- No revision beyond `-r2` — escalate to human review instead
