# POST REVISION RUBRIC

This rubric is for Lane 7 — the revision pass that takes a QA report with `needs-edits` status and produces a corrected draft.

## Goal
Produce a revised draft that fixes every issue the QA report identified, without introducing new problems or degrading what already worked. Factual fixes come first; voice and structure fixes second. The revised draft goes back to Lane 6 for a fresh QA pass.

## Minimum acceptance bar
A revision is acceptable only if it:
- Addresses every specific issue listed in the QA report (quote by quote, not paraphrased)
- Preserves sections, lines, and structural choices the QA report praised or did not flag
- Stays within the original brief's editorial direction (format, angle, key facts, length)
- Does not introduce new attribution gaps, confidence mismatches, or sensitivity issues
- Fills out the revision notes section honestly: what changed, what was preserved, what QA issues were addressed

## Revision priorities (in order)
1. **Factual accuracy**: Fix unattributed claims, incorrect facts, missing sources — these are blockers.
2. **Attribution**: Add source attribution where QA flagged gaps.
3. **Confidence alignment**: Adjust qualifiers to match confidence levels.
4. **Sensitivity**: Fix any dehumanizing language, gratuitous detail, or framing issues.
5. **Staleness**: Add freshness notes if QA flagged staleness.
6. **Voice and structure**: Fix tabloid language, editorializing, format compliance — only after factual issues are resolved.

## Revision rules
- Fix what QA flagged. Do not rewrite sections QA approved.
- Treat the QA report as a punch list: every numbered issue must be resolved or explicitly noted as unresolvable (with reason).
- Do NOT do web research. All material comes from the existing dossier, brief, and original draft.
- Do NOT change the format, platform, or angle unless the QA report explicitly called for it.
- Preserve attribution chains: if the original draft correctly attributed a claim, the revision must keep that attribution intact.
- Do not introduce new unattributed claims. If you add information not in the original draft, it must come from the dossier and be attributed.

## Revision cap
- Maximum 2 revision rounds per event: `-r1` and `-r2`.
- If a `-r2` draft still receives `qaStatus: "needs-edits"`, do NOT produce `-r3`. Instead, flag the event for human intervention by appending an index entry with `"type": "revision"`, `"revisionRound": 2`, and `"revisionStatus": "human-review"`.
- This prevents infinite revision loops. Two rounds of machine editing is the limit.

## File naming
- First revision: `REFERENCE/drafts/<id>-<slug>-r1.md`
- Second revision: `REFERENCE/drafts/<id>-<slug>-r2.md`
- Original draft stays intact at `REFERENCE/drafts/<id>-<slug>.md` for diffing.

## Voice rules
Same as `post-draft-rubric.md`. The revision must NOT introduce any of the voice violations listed there. If the original draft was clean on voice and QA only flagged factual or attribution issues, the revision should sound the same — just more accurate.

## What this lane does NOT do
- No web searches — all material comes from existing artifacts
- No modifications to existing QA reports, briefs, dossiers, or cards
- No changes to the original draft file — revisions are new files (`-r1`, `-r2`)
- No revision beyond `-r2` — escalate to human review instead
