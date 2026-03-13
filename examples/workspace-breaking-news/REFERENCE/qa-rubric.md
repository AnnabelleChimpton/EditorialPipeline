# QA RUBRIC

This rubric is for Lane 6 — the review pass that checks a draft for factual accuracy, attribution, confidence alignment, staleness, sensitivity, source quality, and voice.

## Goal
Read the draft and the brief side by side. Produce a QA report that either approves the draft or lists specific, actionable fixes. The human should be able to trust that an "approved" draft is factually sound, properly attributed, and sensitively framed.

## QA checks (run all 8)

### 1. Factual accuracy
- Every factual claim in the draft (date, number, quote, event, attributed statement) must trace to an entry in the "Sources cited" list.
- Cross-check: does the draft accurately represent what the source says? No paraphrasing that shifts meaning.
- Flag any claim that appears in the prose but has no corresponding source.
- Bare homepage URLs (e.g., reuters.com with no article path) count as unsourced.

### 2. Attribution
- Every assertion of fact must be attributed to a specific source — not "reports suggest" but "Reuters reports" or "according to UNRWA's March 10 update."
- Unnamed sources must be noted as such: "an official who spoke on condition of anonymity told [outlet]."
- No unattributed assertions of fact. If a claim can't be attributed, it must be cut or explicitly flagged as the draft author's analysis (analysis brief only).

### 3. Confidence alignment
- Confirmed claims should not have hedging qualifiers ("reportedly," "allegedly") — they're confirmed.
- Developing claims must have single-source qualifiers ("according to [source]," "not independently confirmed").
- Unverified claims must have strong qualifiers ("unverified reports suggest," "social media posts, not independently verified, claim").
- Flag any mismatch: a claim tagged as "confirmed" in the event card but presented with hedging, or an "unverified" claim presented as fact.

### 4. Staleness check
- Check the `eventDate` field. If the event occurred >24h before the draft timestamp, flag the draft as potentially stale.
- A stale draft is not automatically failed — but the QA report must note it and recommend one of:
  - Add a "last updated" note at the top
  - Flag for the human to check for newer developments before publishing
  - Re-queue for a fresh card if the situation has materially changed
- Check the draft's "Live data cautions" section. If the brief's staleness window flagged volatile figures, this section must list them. Flag if empty or missing.

### 5. Sensitivity review
- No gratuitous descriptions of violence or suffering
- No dehumanizing language applied to any party
- Civilian impact acknowledged where relevant (not exploited)
- Contested events presented with attributed accounts from different parties, not adjudicated
- No framing that implies civilian casualties are justified or inevitable
- Precise language: not euphemisms, but not graphic detail
- Flag any passage that a reasonable reader could find dehumanizing, sensationalizing, or dismissive of suffering

### 6. Source quality
- Prefer wire services (AP, Reuters, AFP), official statements, and named reporters
- Flag if all sources are from the same outlet or editorial perspective
- Flag aggregator-only sourcing (sources that are rewriting a single wire report)
- Check source timestamps — flag if the most recent source is >12h old
- At least 1 source should be a wire service or official statement

### 7. Voice compliance
- Check against `REFERENCE/brand-config.md` voice guidelines
- No tabloid verbs, no editorializing in sitrep/timeline format
- Attribution language follows the brand-config patterns
- Format-specific rules followed (sitrep: bullet-heavy; analysis: paragraph prose; timeline: chronological entries)
- **Closing-move variety (analysis briefs only)**: Sitreps and timelines end with "what to watch" (correct). Analysis briefs should vary: implications, a forward-looking question, a named official's quote that encapsulates the situation. Check the last 2-3 analysis brief drafts — if they all end the same way, flag it.

### 8. Cross-source reconciliation
- When the draft cites multiple sources reporting the same type of fact (casualty count, displacement figure, timing, location) with different values, flag whether they:
  - (a) describe the same event with different counts — draft must acknowledge the discrepancy
  - (b) describe different events that look similar — draft should clarify they're separate incidents
  - (c) reflect different reporting windows — draft should note the earlier vs. later count
- If the draft silently uses one figure without noting the discrepancy, flag it.
- This check does NOT require the draft to resolve the discrepancy — only to surface it honestly.

## Output format

### If approved
```
## QA Report — <id>

**Status: APPROVED**

- Factual accuracy: all claims traced to sources
- Attribution: complete
- Confidence alignment: qualifiers match confidence levels
- Staleness: [not stale / note if >24h]
- Sensitivity: [clean / note any minor concerns]
- Source quality: [good / note any caveats]
- Voice: [compliant]

No edits needed. Ready for human review.
```

### If fixes needed
```
## QA Report — <id>

**Status: NEEDS EDITS**

### Issues found
1. [Category — specific issue]: [exact quote from draft] → [what it should be or why it fails]
2. [Category — specific issue]: [exact quote from draft] → [suggested fix]

### What works
- [1-2 things the draft does well — QA should be honest, not just critical]

### Recommendation
[1-2 sentences: is this close and needs minor tweaks, or does it need significant rework?]
```

## Rules
- Be specific. "Attribution is incomplete" is not actionable. "The claim 'at least 47 people were killed' in paragraph 3 has no source attribution" is.
- Quote the draft when flagging issues.
- Don't rewrite the draft in the QA report. Flag the problem, suggest direction, let Lane 7 fix it.
- If the draft is genuinely good, say so. Don't manufacture issues to justify the lane's existence.
- A draft can be approved with minor notes ("approved — human may want to add a more recent source" is fine).
- Factual issues are always higher priority than voice issues. A well-voiced draft with attribution gaps fails; a slightly stiff draft with perfect sourcing can pass.

## What this lane does NOT do
- No web searches
- No modifications to the draft, brief, dossier, or card files
- No rewriting — QA reports flag problems, they don't fix them
- Only creates QA report files and appends to the index
