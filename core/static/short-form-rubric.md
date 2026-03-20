# SHORT-FORM RUBRIC

This rubric is for Lane 5b — the condensation pass that takes a finished long-form draft and produces a standalone short-form companion post.

## Goal
Produce one short-form post (150-250 words) that works as a standalone piece on LinkedIn or Threads. It should make a reader want to click through to the full post, but also deliver value on its own. This is NOT a summary — it's a sharp, self-contained take derived from the best material in the draft.

## Minimum acceptance bar
A short-form post is acceptable only if it:
- Works as a standalone piece — someone who never reads the full post still gets something valuable
- Opens with a hook that stops a scroll (not "I wrote about X" or "Here's why X matters")
- Contains at least 1 specific fact (name, number, date, incident) from the draft
- States or implies the thesis in 1-2 sentences
- Has a point of view — not a neutral teaser
- Stays within 150-250 words
- Includes at least one line with entertainment value (deadpan observation, sharp juxtaposition, absurdist detail)
- Ends on a concrete line, not a generic "read more"

## What this is NOT
- NOT a summary of the blog post ("In my latest post, I explore...")
- NOT an abstract teaser ("Tech debt is more dangerous than you think...")
- NOT a thread — it's a single post
- NOT a rewrite — it pulls the sharpest material from the existing draft

## How to build it
1. Read the finished draft. Identify: the single sharpest fact, the thesis, the best line, and the most entertaining moment.
2. Open with the sharpest fact or the most provocative framing of the thesis. The first sentence must earn the second sentence.
3. Build a tight 150-250 word post around 1-2 key facts and the core argument. You're distilling, not shrinking.
4. If the draft has a killer line (deadpan observation, sharp metaphor, a fact that speaks for itself), use it — don't paraphrase something that already works.
5. End on a concrete implication or the sharpest line in the piece. If linking to the full post, the link text goes in a separate field — the post itself should end strong without it.

## Voice rules
All voice rules from `REFERENCE/post-draft-rubric.md` apply, with these additions:
- **Higher entertainment density.** In a 200-word post, every sentence needs to earn its place. Flat, informational sentences that would be fine in paragraph 6 of a blog post are dead weight here.
- **Sharper tone.** Short-form can be more direct, more casual, more pointed than the long-form version. The brand voice's "slightly exasperated" can dial up to "openly exasperated."
- **No throat-clearing.** Zero tolerance for setup sentences. The post starts in the middle of the argument.

## Anti-slop rules
All anti-slop rules from `REFERENCE/post-draft-rubric.md` and `REFERENCE/brand-config.md` apply, plus:
- No "I wrote about X" or "New post:" framing — the post IS the content, not a pointer to content
- No "Here's why that matters" — show why it matters, don't announce that you're about to
- No "What do you think?" or engagement bait endings
- No stacking multiple facts without commentary — in short-form, every fact needs to land

## Platform guidance
- **LinkedIn:** Slightly more measured, can lean into professional credibility angle. Lead with the insight. 200-250 words.
- **Threads:** Sharper, more casual, funnier. Lead with the most provocative line. 150-200 words. Must work in a fast-moving feed.

## Pre-save slop check (MANDATORY)

Before saving the short-form post, run:
```
python3 REFERENCE/pipeline-tools.py slop-check <your-short-form-file>
```
If the result is `FAIL`, fix every flagged pattern before saving. In 200 words, every slop pattern is amplified.

## QA
Lane 5b short-form posts go through the same QA lane as full drafts. The QA rubric's checks apply — concreteness, anti-slop, voice, endings — with the understanding that short-form has tighter tolerances (one weak sentence in 200 words is a bigger problem than one weak sentence in 800 words).
