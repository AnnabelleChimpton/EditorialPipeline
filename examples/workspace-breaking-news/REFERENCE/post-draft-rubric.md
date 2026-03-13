# POST DRAFT RUBRIC

This rubric is for Lane 5 — the writing pass that converts a post brief + dossier into a ready-to-review output.

## Goal
Produce one draft that follows the brief's editorial direction, attributes every claim, applies confidence qualifiers, and reads like a professional news analysis product. The draft should be ready for a human to review, lightly edit, and publish.

## Minimum acceptance bar
A post draft is acceptable only if it:
- Uses the format specified in the brief (sitrep / analysis brief / timeline update)
- Attributes every factual claim to a specific source
- Applies confidence qualifiers to every developing or unverified claim
- Includes all key facts the brief identified
- Excludes what the brief said to leave out
- Cites the source anchors from the brief (specific URLs, not bare domains)
- Falls within the brief's estimated length (±20%)
- Passes the sensitivity check (no gratuitous detail, no dehumanizing language, civilian impact noted where relevant)
- Fills out the compliance notes section honestly

## Voice rules
The draft must NOT:
- Use "breaking" for events >1h old
- Use tabloid verbs: "slammed," "blasted," "ripped" (unless literally describing kinetic action)
- Use "chaos," "chaos erupts," "all hell breaks loose"
- Say "the situation is complex" without specifying what's complex
- Say "both sides" without naming the actors
- Say "tensions" without specifying between whom and over what
- Use "war-torn" (describe the damage or don't)
- Use "innocent civilians" (all civilians are protected — the adjective implies some aren't)
- Present unattributed assertions as fact
- Editorialize in sitrep or timeline format (analysis brief may include grounded analytical statements)
- Use emotional language as a substitute for factual reporting ("heartbreaking," "horrifying," "shocking")
- Use more than 2 em-dashes per piece
- Stack rhetorical questions

The draft SHOULD:
- Lead with the most significant development
- Let facts and attributed quotes do the heavy lifting
- Use precise verbs: "said," "reported," "confirmed," "denied," "claimed"
- Include timestamps on significant developments
- Note what is NOT known alongside what is known
- **Sitreps and timelines**: End with forward-looking "what to watch" indicators, not a summary.
- **Analysis briefs**: Vary the ending — "what to watch" is one option, but also consider: a forward-looking question, implications stated as testable predictions, or a named official's quote that anchors the assessment. Check the last 3 analysis drafts in `REFERENCE/drafts/` — if they all end with "what to watch," use a different closing move.

## Brand voice
If `REFERENCE/brand-config.md` exists, the draft must also conform to its voice guidelines, attribution rules, and sensitivity rules. Brand voice overrides generic voice rules where they conflict.

## Format-specific guidance

### Sitrep (300-500 words)
- Open with a one-sentence summary of the situation
- Bullet-heavy body: each bullet is one development, timestamped, attributed
- Separate sections: CONFIRMED / DEVELOPING / UNVERIFIED
- End with "Assessment" (2-3 sentences: what this means, grounded in facts) and "What to watch" (2-3 bullet indicators)
- No editorializing in the bullet section — save analysis for the assessment

### Analysis brief (500-800 words)
- Open with the thesis or central claim
- Paragraph prose, not bullets (except for supporting data)
- Every analytical statement grounded in a specific cited fact
- Acknowledge counterarguments or alternative interpretations where they exist
- End with implications and "what to watch" — not a summary of what you just said
- May include one named-official quote as an anchor

### Timeline update (200-400 words)
- Strictly chronological, timestamped entries
- Each entry: `**HH:MM UTC** — What happened. (Source)`
- Confidence tags in brackets: [CONFIRMED], [DEVELOPING], [UNVERIFIED]
- No editorializing between entries — let the sequence speak
- Brief context header (2-3 sentences) before the timeline
- End with "Latest" marker and "what to watch" if appropriate

## What this lane does NOT do
- No web searches — all material comes from the dossier and brief
- No modifications to existing files (cards, dossiers, briefs, index) — this lane only creates drafts and appends to the index
- No publishing — drafts go to `REFERENCE/drafts/` for human review
