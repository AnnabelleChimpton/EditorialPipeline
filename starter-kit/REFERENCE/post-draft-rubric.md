# POST DRAFT RUBRIC

This rubric is for Lane 5 — the copywriting pass that converts a post brief + dossier into a ready-to-review draft.

## Goal
Produce one post draft that follows the brief's creative direction and reads like a human wrote it. The draft should be ready for a human to review, lightly edit, and publish — not a rough outline that needs rewriting.

## Minimum acceptance bar
A post draft is acceptable only if it:
- Uses the format specified in the brief (thread, narrative, list, etc.)
- Opens with the hook from the brief (adapted, not pasted verbatim — the brief gives direction, not final copy)
- Stays in the tone register the brief specified
- Hits all key moments the brief identified (3-5 specific facts/quotes/incidents)
- Excludes what the brief said to leave out
- Cites the source anchors from the brief
- Falls within the brief's estimated length (±20%)
- Fills out the compliance notes section honestly

## Voice rules

### Universal AI tells (apply to all domains)
The draft must NOT:
- Open with a topic-setting throat-clear ("In the early days of...", "When [thing] first appeared...", "It all started when...")
- Address the reader as "you" more than twice (exception: threads where direct address is the format)
- Use listicle filler transitions ("Next up...", "But wait, there's more...", "And finally...")
- Hedge with "it's worth noting that" or "interestingly enough"
- End with a generic call-to-action ("What do you think? Let us know in the comments!")
- Use em-dashes more than twice per post (they're an AI tell at high frequency)
- Stack rhetorical questions
- Use the "It's not X, it's Y" reframe structure (e.g., "This wasn't about..., it was about...", "The real issue isn't... — it's...", "isn't X, it's Y") — find a different construction
- Use transitional filler phrases: "Ultimately," "At its core," "The reality is," "In essence," "What's really at stake," "The core of the problem" — cut them and start with the actual point

### Domain-specific voice traps (customize for your domain)
<!-- Replace these with phrases and patterns that are AI tells in YOUR niche.
     VCE examples: "iconic," "legendary," "game-changing" used unironically; era-setting throat-clears
     News examples: "chaos erupts," "both sides," "tensions," "in a stunning development"
     Your domain: add 3-5 phrases or patterns that signal lazy AI writing in your content type -->
The draft must NOT:
- [YOUR DOMAIN VOICE TRAP 1]
- [YOUR DOMAIN VOICE TRAP 2]
- [YOUR DOMAIN VOICE TRAP 3]

The draft SHOULD:
- Sound like a specific person with opinions, not a content mill
- Let facts and quotes do the heavy lifting — show, don't summarize
- Use the dossier's pull quotes and specific incidents as anchors
- Have a point of view, not just information
- End with something that resonates, not a prompt for engagement

## Editorial quality rules

### 1. Concreteness gate
Every paragraph must contain at least one concrete element: a name, a number, a date, a quote, a specific incident, or a described action. Paragraphs that are pure commentary or abstract reflection get cut or merged into a paragraph that has concrete anchoring.

### 2. Metaphor limit
Maximum 1 metaphor per article. If you use a metaphor, commit to it briefly and move on — no extending, mixing, or stacking. Remove dramatic compound metaphors entirely ("silent sabotage," "ticking time bomb," "slow-motion crisis"). If the piece already has a metaphor and you're tempted to add another, use literal language instead.

### 3. Statistics interpretation
Every number, percentage, or data point in the draft must be followed by a sentence explaining why it matters. A stat without context is padding.

### 4. No formulaic structure
Do not follow the hook → context → dilemma → solution → conclusion template. Structure should follow the argument. If you can see the five-paragraph essay skeleton, restructure.

### 5. Concrete over abstract
Replace generalized claims with specific incidents from the dossier. If the dossier doesn't have a specific example to support a claim, cut the claim.

### 6. Tight language
Short sentences. Cut unnecessary adjectives ("incredibly important" → "important"; "deeply problematic" → "problematic" or just state the problem). Remove filler words ("actually," "really," "just," "quite," "very"). If a sentence works without a word, the word shouldn't be there.

### 7. Endings
End on a concrete implication — what happens next, who pays the cost, what this means for a specific group. Do not end on a philosophical statement, a moral lesson, or a sweeping claim about the human condition.
- Bad ending: "Perhaps the real question isn't about technology at all — it's about what kind of future we're willing to accept."
- Good ending: "The bill comes due when the next team inherits the codebase and discovers that nobody wrote the tests."

## Brand voice
If `REFERENCE/brand-config.md` exists, the draft must also conform to its voice guidelines, avoid-list, and platform-specific rules. Brand voice overrides generic voice rules where they conflict.

## Format-specific guidance

### Narrative long-post / newsletter essay (400-800 words)
- Needs an arc: setup → tension → payoff (or: thesis → evidence → turn)
- One idea per paragraph, short paragraphs
- Pull quotes break up the wall of text
- End on an image, a line, or a turn — not a summary

### X/Twitter thread (5-12 tweets)
- Tweet 1 is the hook — it must work as a standalone post in a feed. If someone saw only this tweet with no thread indicator, would they click? The hook should make a claim, reveal a tension, or drop a fact sharp enough to stop a scroll. "Here's the story of X" energy is not enough.
- Each tweet should be readable on its own but build on the previous
- Vary sentence length between tweets
- Drop a quote or specific fact every 2-3 tweets
- Last tweet lands the point, doesn't ask for retweets

### Ranked list (5-10 items)
- Items should escalate (funniest last, or most surprising last)
- Each item needs a specific detail, not just a name
- Brief commentary per item, not equal-length paragraphs
- The ranking itself should imply a point of view

### Instagram carousel (6-10 slides)
- Slide 1: hook text (large, bold, stops the scroll)
- Each slide: one idea, one fact, or one quote
- Keep slide text under 30 words
- Last slide: the sharpest line or the "so what"
- Caption carries the narrative; slides carry the beats

### Hot take + receipts (200-400 words)
- Lead with the take — sharp, declarative, slightly provocative
- Follow immediately with evidence
- 2-3 specific receipts (quotes, dates, incidents)
- End on the implication, not the take restated

## Pre-save slop check (MANDATORY)

Before saving the draft, use the `process` tool to execute:
```
python3 REFERENCE/pipeline-tools.py slop-check <your-draft-file>
```
If the result is `FAIL`, fix every flagged pattern before saving. This catches the most common AI-isms mechanically — do not rely on self-review alone.

## What this lane does NOT do
- No web searches — all material comes from the dossier and brief
- No modifications to existing files (cards, dossiers, briefs, index) — this lane only creates drafts and appends to the index
- No publishing — drafts go to `REFERENCE/drafts/` for human review
