# REFORMAT DRAFT

One-shot utility. Takes an existing topic's artifacts and produces a new draft in a different format.

## Inputs

- **Topic ID**: e.g., `tc-006`
- **Target format**: one of — narrative long-post, ranked list, thread, hot take + receipts, visual carousel, before/after comparison, mini-essay

## Procedure

### Step 1 — Gather artifacts

Read all of these for the given topic ID (find filenames via `REFERENCE/dossier-index.jsonl`):

1. **Card**: `REFERENCE/cards/<id>-*.md`
2. **Dossier**: `REFERENCE/dossiers/<id>-*.md`
3. **Brief**: `REFERENCE/briefs/<id>-*.md`
4. **Existing draft**: `REFERENCE/drafts/<id>-*.md` (the most recent version — use `-rN` if a revision exists)
5. **QA report** (if exists): `REFERENCE/qa/<id>-*.md`

If any of card, dossier, brief, or draft is missing, stop and report what's missing. All four are required.

### Step 2 — Analyze what worked

From the existing draft and QA report, note:
- Which quotes, facts, and incidents landed well
- What tone register the draft achieved
- What QA flagged (avoid repeating those issues)
- What the brief's thesis is

These carry forward into the new format. You're not starting from scratch — you're reshaping material that's already been editorially vetted.

### Step 3 — Adapt the brief for the new format

Mentally re-brief the topic for the target format. Consider:
- **Hook**: The existing hook was designed for the original format. What hook works for the target format? (A thread hook is punchy and standalone; a long-post hook can be more atmospheric; a hot take leads with the claim.)
- **Structure**: How do the key moments from the brief reorganize for this format? A thread needs discrete beats; a narrative needs an arc; a list needs escalation.
- **Length**: Match the target format's expected length (see post-draft-rubric.md for format-specific guidance).
- **Tone**: The register from the brief still applies, but the cadence changes with format. Threads are staccato. Essays breathe. Lists are punchy.

### Step 4 — Write the draft

Produce the draft following:
- `REFERENCE/post-draft-rubric.md` — all voice rules and format-specific guidance apply
- `REFERENCE/post-draft-template.md` — use this template structure for the output
- The brief's anti-slop flags still apply
- The brief's thesis must still be discernible
- Source anchors from the brief must still be cited

Use the existing draft as a creative reference, not a source to paraphrase. The new draft should feel like it was *written* for this format, not converted into it.

### Step 5 — Output

Save the new draft to:
```
REFERENCE/drafts/<id>-<slug>-<format-short>.md
```

Format short codes:
- `thread` — thread
- `longpost` — narrative long-post
- `list` — ranked list
- `hottake` — hot take + receipts
- `carousel` — visual carousel
- `beforeafter` — before/after comparison
- `miniessay` — mini-essay

Example: `REFERENCE/drafts/tc-006-topic-slug-thread.md`

Append an entry to `REFERENCE/dossier-index.jsonl`:
```json
{"id":"tc-006","type":"draft","format":"thread","draft":"REFERENCE/drafts/tc-006-topic-slug-thread.md","note":"reformat from longpost","timestamp":"..."}
```

### Step 6 — Self-check

Before finishing, run through these checks (do NOT produce a separate QA report — just fix issues inline):
- [ ] Thesis from the brief is present and discernible
- [ ] All source anchors cited (no bare homepage URLs)
- [ ] Anti-slop flags honored
- [ ] Hook works for the target format (thread hook is standalone; essay hook can breathe)
- [ ] Length matches format expectations
- [ ] No voice rule violations (em-dash count, rhetorical question stacking, etc.)

## What this prompt does NOT do

- No web searches — all material comes from existing artifacts
- No modifications to existing files (cards, dossiers, briefs, original drafts, index entries)
- Does not replace the original draft — the original remains as-is
- Does not trigger QA or revision lanes — the reformat is a one-shot that self-checks
