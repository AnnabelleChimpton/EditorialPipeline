# Post-draft cron workflow (one topic per run)

1. Read `REFERENCE/.state/next-draft.json` — if the content is `"NONE"`, report "no briefs awaiting draft" and stop.
2. The result includes `_resolvedPaths` with pre-resolved file paths. Read the post brief from `_resolvedPaths.brief`. If the file doesn't exist, skip and report. Check the brief's **Pipeline recommendation**: if the recommendation is `card-only` or `synthesize-into:<id>`, skip this topic (no draft produced) and report the recommendation. Only proceed if the recommendation is `full-draft` or absent.
3. Read the deep-dive dossier from `_resolvedPaths.dossier`.
3b. **Synthesis read:** Check the index for entries whose brief contains `pipelineSkip: "synthesize-into:<this-topic's-id>"`. For each such entry, read its card and/or dossier to gather key facts that should be incorporated into this draft.
4. Read `REFERENCE/post-draft-template.md` and `REFERENCE/post-draft-rubric.md`.
5. If `REFERENCE/brand-config.md` exists, read it for voice guidelines.
6. **Pre-flight — read this BEFORE writing a single word.**

   ### A. THE VOICE (this is what you're aiming for)

   <!-- CUSTOMIZE: Replace the personality, examples, and voice rules below with
        your brand's voice from brand.yaml or brand-config.md. The structure
        (personality -> good example -> bad example -> voice rules -> structure note)
        should stay the same. The content should be YOUR brand. -->

   [YOUR BRAND PERSONALITY — 2-3 sentences describing who the writer is, what their
   energy is, and how they relate to the subject matter.]

   **Write like this:**
   > [A GOOD EXAMPLE from your domain — 3-5 sentences that nail the voice. Specific
   > details, shows don't tells, treats subjects like people. Pull this from your
   > brand.yaml `voice.examples.good.text` or write a new one.]

   Notice: [1-2 sentences explaining WHY this example works — what makes it good.]

   **NOT like this:**
   > [A BAD EXAMPLE — the same topic written with every AI cliche. Pull from
   > brand.yaml `voice.examples.bad.text` or write a new one.]

   That version says nothing. [1 sentence on why it fails.]

   **Voice rules:**
   - [3-5 specific voice rules from your brand — e.g., "First person is fine",
     "Sentence fragments are fine", "Use specific details to build X instead of
     telling the reader it's X"]
   - **If the draft reads like it could have been written by a content mill, a news wire, or a research memo, it has failed.** Read it back — does it sound like a person? If not, rewrite.

   **Structure:** Write a proper finished post, not an outline. No section headers like "Key moments" or "Open questions." The post should have a narrative arc — setup, escalation, climax, aftermath — and read as a continuous piece. Follow the post-draft template format (ID, Topic, Format, Platform, Draft, Sources, Compliance notes).

   ### B. BANNED CONSTRUCTIONS (hard fails — QA will auto-reject)

   - "It's not X, it's Y" / "It wasn't X. It was Y." / "This isn't just X; it's Y" / "isn't about X, it's about Y" — ALL negation-reframe variants. Instead, state your point directly.
   - "What happened next" — just say what happened.
   - Atmospheric/scene-setting openers ("In 2017, the internet hummed with...") — first sentence must name the person, company, or event.
   - More than 1 metaphor in the entire piece.
   - Moralizing endings ("This is a wake-up call for...") — end on a concrete fact or what happened to the people.
   - "Here's the thing" / "Let that sink in" / "A cautionary tale" / "Changed forever" / "Perfect storm" — see the full list in the draft rubric.
   - Grand statements about What [Your Domain] Means For Society.
   - Section headers, outlines, or structured-notes format. Write a finished post.

7. Write the post following the brief's direction: use its format, open with its hook (adapted, not pasted), stay in its tone register, hit its key moments, exclude what it says to leave out, honor its anti-slop flags.
8. Fill out the compliance notes section honestly — don't just mark everything "yes." If the brief flagged a staleness window, populate the draft's "Live data cautions" section from it.
9. Derive the output filename from the brief entry's `brief` path — take its filename and replace `REFERENCE/briefs/` with `REFERENCE/drafts/`. Save the draft there.
10. **Self-review before slop check:** Re-read your draft's first sentence — does it name the subject? Re-read the last sentence — is it a concrete fact/implication, not a moral? Scan for "not X, it's Y" in any form. Count your metaphors (max 1). If anything fails, fix it now before the slop check wastes a cycle.
11. **Slop check:** Use the `process` tool to execute `python3 REFERENCE/pipeline-tools.py slop-check <draft-path>`. If it returns FAIL, fix every flagged pattern and re-run until it passes. Do NOT skip this or suggest the human run it.
12. Append the index entry as a single JSON line to `REFERENCE/.state/stage-append.jsonl`:
    `{"id":"<ID>","topic":"<TITLE>","type":"draft","draft":"<PATH>","timestamp":"<ISO>"}`
13. Return a Discord-friendly summary in 6 bullets or fewer: topic, format used, platform, opening hook, and word/tweet count.

## Guard rails

- Process only ONE topic per run.
- NO web searches — all material comes from the existing dossier and brief.
- Only draft topics that have a completed post brief.
- Do not modify existing cards, dossiers, briefs, or index entries.
- If the brief or dossier file doesn't exist, skip and report.
- If a file write fails twice, stop and report. Do not retry-loop.
- Follow the voice rules and format-specific guidance in `REFERENCE/post-draft-rubric.md`.
