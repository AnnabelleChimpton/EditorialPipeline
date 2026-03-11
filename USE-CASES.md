# Use Cases

This pipeline pattern works for any domain with a research → editorial → publish flow. The architecture stays the same — you adjust the sourcing strategy, tempo, and rubrics for your domain.

## The core pattern

```
Source → Triage → Deepen → Brief → Draft → QA → Revision (if needed, max 2 rounds) → Human publishes
```

What changes between use cases:
- **What you source** (web searches, RSS, APIs, social feeds, databases)
- **How fast you run** (hourly for evergreen, every 15 minutes for breaking)
- **What "quality" means** (rubric criteria change per domain)
- **What formats you target** (threads, newsletters, alerts, reports)

---

## Content / Niche Newsletter

**Example:** "History of indie game development", "90s hip-hop deep cuts", "forgotten science experiments"

**What to adjust:**
- Lane 1 sourcing: change search terms to your niche. Keep adaptive threshold at ~15.
- Rubrics: customize the "tension point" requirement for your domain (humor, controversy, surprising facts, human drama — whatever makes your niche interesting)
- Anti-slop: add domain-specific AI tells to every rubric. Every niche has its own cliches.
- Brief rubric: adjust platform guidance for where your audience lives
- Tempo: hourly/every 2h is fine. Evergreen content doesn't expire.

**Minimal changes needed:** swap search terms, customize anti-slop flags, update `brand-config.md`

---

## Breaking News / Event Monitoring

**Example:** industry news desk, crisis monitoring, election coverage, product launch tracking

**What to adjust:**
- Lane 1 becomes a **monitor**: source from RSS feeds, X/Twitter lists, wire services, or specific URLs via `web_fetch`. Change the adaptive check from "queue depth" to "any new events in the last N hours?"
- Lane 2 becomes **triage**: change the verdict system from `strong/maybe/weak` to `developing/confirmed/noise`. The card should answer "is this real, is it significant, do we cover it?"
- Lane 3 becomes **rapid deep-dive**: prioritize official statements, primary sources, and contemporaneous reporting. Reduce the source minimum if speed matters more than depth.
- Lane 4 brief: add time-sensitive formats — "breaking alert" (1-2 sentences + source), "here's what we know so far" (developing thread), "full analysis" (once the story settles)
- Tempo: tighten schedules. Every 15 minutes for sourcing/triage, every 30 for downstream lanes.
- Timeout: keep research lanes at 900s, but consider lowering editorial lanes to 180s for faster turnaround.

**Key config changes:**
```
Lane 1: "*/15 * * * *"  (every 15 min)
Lane 2: "*/15 * * * *"  (every 15 min)
Lane 3: "*/30 * * * *"  (every 30 min)
Lane 4: "*/30 * * * *"  (every 30 min)
Lane 5: "*/30 * * * *"  (every 30 min)
Lane 6: "*/30 * * * *"  (every 30 min)
maxConcurrentRuns: 8+
```

**Additional rubric changes:**
- First-pass rubric: add "timeliness" to the verdict criteria. A confirmed story that's 6 hours old may be `noise` for a breaking desk.
- Draft rubric: add a "developing story" voice mode — factual, no speculation, clear about what's confirmed vs. unconfirmed.
- QA rubric: add a "factual accuracy" check — flag unverified claims, ensure sourcing is attributed.

---

## Competitive Intelligence

**Example:** monitoring competitor launches, pricing changes, hiring patterns, public statements

**What to adjust:**
- Lane 1: source from competitor blogs, press releases, job boards, SEC filings, social accounts. Use `web_fetch` on known URLs rather than broad web search.
- Lane 2: card format shifts to "signal card" — what happened, who did it, what it means for us. Verdict becomes `actionable/monitor/ignore`.
- Lane 3: deep-dive focuses on implications, not just facts. What does this mean for your product/positioning/roadmap?
- Lane 4: briefs target internal formats — Slack summary, executive briefing, team update — not public posts.
- Lane 5: drafts are internal comms, not social content. Tone shifts from "engaging" to "clear and actionable."
- Lane 6: QA checks for speculation vs. evidence, confidentiality (don't leak your analysis externally), and actionability.

**Key rubric changes:**
- Remove all social-media format guidance from brief and draft rubrics
- Add internal comms formats: Slack digest, executive summary, competitive brief
- Anti-slop: flag corporate buzzwords, unsupported strategic conclusions, and "we should be worried about..." without evidence

---

## Academic / Research Literature Review

**Example:** survey of papers on a topic, systematic review, research landscape mapping

**What to adjust:**
- Lane 1: source from Google Scholar, arXiv, PubMed, or domain-specific databases. Search terms should be academic keywords, not casual language.
- Lane 2: card becomes a "paper summary card" — citation, abstract summary, methodology, key findings, relevance to your question. Verdict: `relevant/tangential/skip`.
- Lane 3: deep-dive reads the full paper (use `web_fetch` or `pdf` tool), extracts methodology details, limitations, connections to other papers.
- Lane 4: brief decides how to present — annotated bibliography entry, comparative table row, narrative synthesis paragraph.
- Lane 5: draft produces the formatted output for your review document.
- Lane 6: QA checks citation accuracy, whether claims are supported by the paper, and whether the summary captures the paper's actual argument (not just the abstract).

**Key rubric changes:**
- First-pass: require DOI or direct URL. No "I think there's a paper about..." sourcing.
- Deep-dive: require engagement with methodology and limitations, not just findings.
- Draft: academic register — precise language, proper citation format, no editorializing unless the review calls for it.
- Anti-slop: flag "groundbreaking", "novel", "paradigm-shifting" unless the paper's own reception supports it.

---

## Product / Industry Newsletter

**Example:** weekly AI digest, fintech roundup, dev tools newsletter

**What to adjust:**
- Lane 1: source from Hacker News, Product Hunt, industry blogs, release notes, funding announcements. Higher volume — 5-8 items per run, threshold at 20+.
- Lane 2: card becomes "item card" — what launched/happened, who's behind it, why it matters. Verdict: `feature/mention/skip`.
- Lane 3: deep-dive only for `feature` items. Pull founding story, technical details, user reception, competitive context.
- Lane 4: brief assigns position in the newsletter — lead story, short mention, "worth watching" sidebar. Considers the full issue's mix, not just one item.
- Lane 5: draft writes in newsletter voice — opinionated curation, not neutral reporting.
- Lane 6: QA checks that the newsletter has variety (not all the same type of story), that opinions are supported, and that the tone is consistent across items.

**Key difference:** Lane 4 needs awareness of *other items in the same issue*. Consider adding a "newsletter planning" pass that reads all available briefs and assigns slots before drafting.

---

## Adjusting tempo — quick reference

| Use case | Sourcing | Triage | Downstream | Queue threshold | Max revision rounds |
|----------|----------|--------|------------|-----------------|---------------------|
| Evergreen content | 3x daily | Every 2h | Hourly | 15 | 2 |
| Breaking news | Every 15m | Every 15m | Every 30m | 5 | 1 |
| Competitive intel | 2x daily | Every 2h | Hourly | 10 | 2 |
| Academic review | Daily | Every 3h | Every 2h | 20 | 3 |
| Weekly newsletter | Daily | Daily | Every 2h | 20 | 2 |

## Reformatting drafts

The pipeline produces one draft per topic in the format the brief recommended. If you review a draft and want it in a different format (e.g., the brief suggested a thread but you'd rather have a long-post), you don't need to re-run the full pipeline.

**Trigger it with:**
```
Reformat <id> as <format>
```

**Examples:**
```
Reformat vce-006 as a thread
Reformat vce-003 as a mini-essay
Reformat vce-010 as a hot take
```

**What it does:**
- Reads the topic's card, dossier, brief, existing draft, and QA report
- Uses the existing draft as creative reference (what worked, what QA flagged)
- Adapts the hook and structure for the target format
- Produces a new draft file alongside the original (e.g., `vce-006-slug-thread.md` next to `vce-006-slug.md`)
- Self-checks against the post-draft rubric inline — no separate QA pass needed
- Logs the new draft to `dossier-index.jsonl`

**Formats:** narrative long-post, ranked list, "remember when" thread, hot take + receipts, visual carousel, before/after comparison, mini-essay

The original draft is never modified or replaced. The reformat prompt lives at `REFERENCE/reformat-draft-prompt.md` and the workflow is defined in `AGENTS.md` under "Reformat draft."

---

## General adaptation checklist

1. Define your **source strategy** — where does raw material come from?
2. Define your **verdict system** — what separates signal from noise in your domain?
3. Define your **output formats** — what does the final published artifact look like?
4. Write **domain-specific anti-slop flags** for every rubric — what are the cliches in your space?
5. Set your **tempo** based on how time-sensitive the content is
6. Create a **brand-config.md** for your voice
7. Configure revision cap (default: 2 rounds; breaking news may want 1, academic may want 3)
8. Seed 5-10 initial topics and test Lane 2 first
