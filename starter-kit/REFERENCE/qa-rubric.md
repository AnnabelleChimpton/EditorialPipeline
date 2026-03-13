# QA RUBRIC

This rubric is for Lane 6 — the self-edit pass that reviews a draft against its brief and flags problems before a human sees it.

## Goal
Read the draft and the brief side by side. Produce a QA report that either approves the draft or lists specific, actionable fixes. The human should be able to trust that an "approved" draft is genuinely ready to post.

## QA checks (run all of these)

### 1. Brief compliance
- Does the draft use the format the brief specified?
- Does the opening match the brief's hook direction (not verbatim, but same energy)?
- Does the tone land in the register the brief called for? (Read the draft aloud in your head — does it sound like the brief's tone notes, or like a different voice?)
- Are all key moments from the brief present in the draft?
- Is the material the brief said to leave out actually absent?
- Are the brief's source anchors cited?
- Is the length within the brief's estimate (±20%)?
- Does the draft's argument match the brief's thesis? Is the thesis discernible in the draft, or has it drifted?

### 2. Anti-slop scan
- Check every anti-slop flag from the brief — does the draft violate any?
- Scan for **universal AI tells** (apply to all domains):
  - Topic-setting throat-clear openings (e.g., "In the early days of...", "Back when...")
  - More than 2 em-dashes
  - Stacked rhetorical questions
  - "it's worth noting that," "interestingly enough," "needless to say"
  - Generic engagement CTAs at the end
  - Listicle filler transitions
  - Every paragraph starting with the same structure
  - Vague adjectives doing the work of specific details ("strange genius," "inevitable cleanup," "remarkable rise") — if the adjective could be replaced by a concrete fact, flag it
- Scan for **domain-specific clichés** (from `brand-config.md` and rubric voice rules):
  <!-- VCE examples: "iconic," "legendary," "game-changing" used unironically
       News examples: "chaos erupts," "both sides," "tensions" as standalone noun
       Your domain: check brand-config.md avoid-list and post-draft-rubric.md voice traps -->

### 3. Substance check
- Does the draft have a point of view, or is it just information?
- Are pull quotes and specific incidents doing the heavy lifting, or is it mostly paraphrase?
- Does the ending land (resonant line, image, turn) or fizzle (summary, CTA, trailing off)?
- Would a reader knowledgeable about [YOUR DOMAIN] feel like this was written by someone who gets it?

### 6. Source traceability
Every specific factual claim in the draft (quote, dollar figure, date, statistic, attributed statement) must trace to an entry in the "Sources cited" list. If a claim appears in the prose but has no corresponding source link, flag it. Bare homepage URLs (e.g., reuters.com with no article path) also count as unsourced.

### 5. Brand voice compliance
If `REFERENCE/brand-config.md` exists, check the draft against its voice guidelines. Does the tone match? Are any avoid-list items present? Does it follow platform-specific brand rules?

### 4. Platform fit
- Does the draft actually work on the specified platform?
- Thread: does tweet 1 work as a completely standalone post? Would someone who saw only tweet 1 in their feed open the thread? If the opener reads like a thesis statement rather than a hook, flag it.
- Carousel: is slide text under 30 words each?
- Long-post: are paragraphs short enough for screen reading?
- Is the length appropriate for the platform?

## Output format

### If approved
```
## QA Report — <id>

**Status: APPROVED**

- Brief compliance: all checks pass
- Anti-slop: clean
- Substance: [1-2 sentence note on what works]
- Platform fit: good

No edits needed. Ready for human review.
```

### If fixes needed
```
## QA Report — <id>

**Status: NEEDS EDITS**

### Issues found
1. [Specific issue]: [exact quote from draft] → [what it should be or why it fails]
2. [Specific issue]: [exact quote from draft] → [suggested fix]

### What works
- [1-2 things the draft does well — QA should be honest, not just critical]

### Recommendation
[1-2 sentences: is this close and needs minor tweaks, or does it need a significant rework?]
```

## Rules
- Be specific. "The tone feels off" is not actionable. "The third paragraph shifts from sardonic to earnest mid-sentence" is.
- Quote the draft when flagging issues — don't just describe problems abstractly.
- Don't rewrite the draft in the QA report. Flag the problem, suggest direction, let Lane 5 (or the human) fix it.
- If the draft is genuinely good, say so. Don't manufacture issues to justify the lane's existence.
- A draft can be approved with minor notes ("approved — human may want to tighten the ending" is fine).

## What this lane does NOT do
- No web searches
- No modifications to the draft, brief, dossier, or card files
- No rewriting — QA reports flag problems, they don't fix them
- Only creates QA report files and appends to the index
