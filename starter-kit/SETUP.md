# Pipeline Setup Guide

How to stand up a new 7-lane research-to-content pipeline from this starter kit.

---

## 1. Prerequisites

- OpenClaw installed and running (`openclaw --version`)
- Gateway active (`openclaw gateway status` should return OK)
- A model provider configured in `openclaw.json` (this guide assumes `openai-codex/gpt-5.4`)
- Discord channel ID (optional, for delivery notifications)

## 2. Create the workspace

```bash
# Pick a workspace name
WORKSPACE="workspace-myproject"
mkdir -p ~/.openclaw/$WORKSPACE

# Copy the starter kit into it
cp -r ~/.openclaw/workspace-nostalgia/_starter/AGENTS.md ~/.openclaw/$WORKSPACE/
cp -r ~/.openclaw/workspace-nostalgia/_starter/REFERENCE ~/.openclaw/$WORKSPACE/

# Set up domain zones from template
cp ~/.openclaw/$WORKSPACE/REFERENCE/domain-zones-template.md ~/.openclaw/$WORKSPACE/REFERENCE/domain-zones.md
cp -r ~/.openclaw/workspace-nostalgia/_starter/topics ~/.openclaw/$WORKSPACE/

# Create supporting directories
mkdir -p ~/.openclaw/$WORKSPACE/{sources,logs,reports}

# Create the run log
touch ~/.openclaw/$WORKSPACE/LOG.md
```

You will also need a `PROJECT.md`, `IDENTITY.md`, and `SOUL.md` in the workspace root. Write these for your domain -- they define scope, voice, and editorial values respectively.

## 3. Configure the agent

First, create the agent directory. This must exist for the agent to be routable:

```bash
mkdir -p ~/.openclaw/agents/[your-agent-id]/agent
```

Then add an entry to the `agents.list` array in `openclaw.json`:

```json
{
  "id": "[your-agent-id]",
  "name": "[your-agent-id]",
  "workspace": "[your-workspace-path]",
  "agentDir": "/home/annabelle/.openclaw/agents/[your-agent-id]/agent",
  "model": {
    "primary": "openai-codex/gpt-5.4"
  },
  "sandbox": {
    "mode": "off",
    "workspaceAccess": "rw"
  },
  "tools": {
    "profile": "full",
    "allow": [
      "read",
      "write",
      "edit",
      "web_search",
      "web_fetch"
    ]
  }
}
```

Required tools: `read`, `write`, `edit` (file operations), `web_search`, `web_fetch` (research lanes). Lanes 4-7 only need file tools, but granting all five to a single agent is simpler than splitting.

## 4. Customize for your domain

Find-and-replace in all files under your new workspace:

| Placeholder | Replace with | Example |
|---|---|---|
| `[YOUR PROJECT]` | Your project name | `Retro Gaming Digest` |
| `[YOUR DOMAIN]` | Your content domain | `retro gaming culture` |
| `[YOUR NICHE]` | Your specific niche | `90s console wars and gaming magazine nostalgia` |

Additional customization:

- **Domain zones.** Copy `REFERENCE/domain-zones-template.md` to `REFERENCE/domain-zones.md` and fill in each zone with descriptions and example topic angles specific to your domain. This file drives the sourcing lane's category audit and zone-targeted search behavior.
- **Anti-slop rules in rubrics.** Every rubric file (`*-rubric.md`) has AI-tell flags. Edit these for your domain. If your niche is gaming, flag terms like "game-changer," "level up," "it hits different." The defaults flag generic AI writing patterns.
- **Brand voice.** Optionally create a `brand-config.md` in the workspace root with tone guidance, vocabulary preferences, and formatting rules. Reference it from `AGENTS.md`.
- **Templates.** Review `REFERENCE/topic-card-template.md`, `topic-dossier-template.md`, `post-brief-template.md`, and `post-draft-template.md`. Adjust section headings and prompts for your content type.

### Lane 1 tuning (sourcing behavior)

Lane 1 has several domain-specific knobs that should be tuned before your first run:

| Knob | What it controls | VCE default | News example | Where to change |
|------|-----------------|-------------|--------------|-----------------|
| Queue depth threshold | When sourcing stops because the queue is healthy | 30 | 15 | `cron-prompts.md` Lane 1 step 2 |
| Recency gate | Whether to reject items older than N hours | None (timeless topics) | 48h | `AGENTS.md` Lane 1 + `automation-lane.md` |
| Search query style | How search queries are constructed | `"early 2000s [domain] [zone keywords]"` | `"[domain] today [zone keywords]"` | `cron-prompts.md` Lane 1 step 6 |
| Items per run | How many items sourcing adds | 4-5 | 3-4 | `cron-prompts.md` Lane 1 steps 7, 10 |
| Candidate criteria | What makes a good candidate | hook, tension, humor | urgency, corroboration, timeliness | `cron-prompts.md` Lane 1 step 7 |

**Time-sensitive domains** (news, market intel, regulatory monitoring) need a recency gate in Lane 1. Add it to your `AGENTS.md` and `automation-lane.md` — see the `workspace-breaking-news` workspace for an example. Without it, stale items waste 5+ downstream lane runs before QA catches them.

**Evergreen domains** (nostalgia, history, academic research) can skip the recency gate entirely. Queue depth threshold can be higher since items don't expire.

### Deep-dive gate field

Lane 3 only processes items that pass a gate check. This field varies by domain:

| Domain type | Gate field | Gate value | What it means |
|------------|-----------|------------|---------------|
| VCE / culture | `verdict` | `"strong"` | First-pass card has enough material for a deep dive |
| News / monitoring | `confidence` | `"confirmed"` or `"developing"` | Event is corroborated enough to invest research time |
| Your domain | `[YOUR_GATE_FIELD]` | `[YOUR_GATE_VALUE]` | Define what "ready for deep-dive" means for your content |

Set this in `AGENTS.md` (deep-dive workflow step 2), `cron-prompts.md` (Lane 3 step 2 and guard rails), and `REFERENCE/schema.md`.

## 5. Seed your topic queue

### Create state files

```bash
cd ~/.openclaw/$WORKSPACE/REFERENCE

# Rename the examples to live files
cp topic-queue-example.jsonl topic-queue.jsonl
cp dossier-index-example.jsonl dossier-index.jsonl

# Clear the example content -- start empty
> topic-queue.jsonl
> dossier-index.jsonl
```

### Add 5-10 initial topics

Append one JSON line per topic to `REFERENCE/topic-queue.jsonl`:

```json
{"id":"proj-001","topic":"Your topic name","hook":"One sentence on why this matters.","category":"your-category","era":"1998-2005","priority":"high","sourceability":"high","status":"queued","notes":"Research angle or context.","dossier":null}
```

Field reference:

**Structural fields (required for all domains):**

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique ID, e.g. `proj-001`. Use a consistent prefix. |
| `status` | string | `queued` (Lane 1 sets this; Lane 2 picks it up) |
| `notes` | string | Additional context for the research agent |
| `dossier` | null | Set to null initially; populated when Lane 2 processes it |

**Domain-specific fields (adapt for your content type):**

The example above uses VCE-style fields. Adapt these for your domain:

| Field | Type | VCE example | News example |
|---|---|---|---|
| `topic` | string | Topic name | Event headline |
| `hook` | string | Why this matters | Breaking angle |
| `category` | string | Theme bucket | Beat/region |
| `era` | string | Time period | — (use `eventDate`) |
| `priority` / `urgency` | string | `high/medium/low` | `critical/high/standard` |
| `sourceability` / `confidence` | string | `high/medium/low` | `confirmed/developing/unverified` |
| `eventDate` | string | — | ISO timestamp of event |

> **Note:** Adapt the schema for your domain. The structural fields (`id`, `status`, `notes`, `dossier`) are required. All other fields should match your content type. See the breaking-news workspace's `topic-queue.jsonl` for a news-domain schema example alongside this VCE-style schema.

### Create matching inbox entries

Add a checkbox line per topic to `topics/inbox.md`:

```
- [ ] proj-001 -- Your topic name
- [ ] proj-002 -- Another topic name
```

## 6. Create cron jobs

Seven jobs, one per lane. All prompts reference `_starter/cron-prompts.md` -- copy the appropriate prompt block for each lane's `message` field.

Replace `[agent-id]` with your agent ID from step 3. Replace `[channel-id]` with your Discord channel ID (or set delivery mode to `"none"`).

### Lane 1: Sourcing (every 4h at :15)

```bash
openclaw cron add \
  --name "[YOUR PROJECT] topic sourcing" \
  --agent-id "[agent-id]" \
  --schedule "15 */4 * * *" \
  --timeout 900 \
  --model "openai-codex/gpt-5.4" \
  --thinking low \
  --light-context \
  --announce \
  --channel discord \
  --to "channel:[channel-id]"
```

Set the message to the **Lane 1 sourcing prompt** from `_starter/cron-prompts.md`.

### Lane 2: First-pass cards (every 2h at :00)

```bash
openclaw cron add \
  --name "[YOUR PROJECT] first-pass research" \
  --agent-id "[agent-id]" \
  --schedule "0 */2 * * *" \
  --timeout 900 \
  --model "openai-codex/gpt-5.4" \
  --thinking low \
  --light-context \
  --announce \
  --channel discord \
  --to "channel:[channel-id]"
```

Message: **Lane 2 first-pass prompt** from `_starter/cron-prompts.md`.

### Lane 3: Deep-dive dossiers (hourly at :45)

```bash
openclaw cron add \
  --name "[YOUR PROJECT] deep-dive" \
  --agent-id "[agent-id]" \
  --schedule "45 * * * *" \
  --timeout 900 \
  --model "openai-codex/gpt-5.4" \
  --thinking low \
  --light-context \
  --announce \
  --channel discord \
  --to "channel:[channel-id]"
```

Message: **Lane 3 deep-dive prompt** from `_starter/cron-prompts.md`.

### Lane 4: Post briefs (hourly at :30)

```bash
openclaw cron add \
  --name "[YOUR PROJECT] post-brief" \
  --agent-id "[agent-id]" \
  --schedule "30 * * * *" \
  --timeout 300 \
  --model "openai-codex/gpt-5.4" \
  --thinking low \
  --light-context \
  --announce \
  --channel discord \
  --to "channel:[channel-id]"
```

Message: **Lane 4 post-brief prompt** from `_starter/cron-prompts.md`.

### Lane 5: Post drafts (hourly at :10)

```bash
openclaw cron add \
  --name "[YOUR PROJECT] post-draft" \
  --agent-id "[agent-id]" \
  --schedule "10 * * * *" \
  --timeout 300 \
  --model "openai-codex/gpt-5.4" \
  --thinking low \
  --light-context \
  --announce \
  --channel discord \
  --to "channel:[channel-id]"
```

Message: **Lane 5 post-draft prompt** from `_starter/cron-prompts.md`.

### Lane 6: QA review (hourly at :50)

```bash
openclaw cron add \
  --name "[YOUR PROJECT] QA review" \
  --agent-id "[agent-id]" \
  --schedule "50 * * * *" \
  --timeout 300 \
  --model "openai-codex/gpt-5.4" \
  --thinking low \
  --light-context \
  --announce \
  --channel discord \
  --to "channel:[channel-id]"
```

Message: **Lane 6 QA prompt** from `_starter/cron-prompts.md`.

### Lane 7: Revision (hourly at :20)

```bash
openclaw cron add \
  --name "[YOUR PROJECT] revision" \
  --agent-id "[agent-id]" \
  --schedule "20 * * * *" \
  --timeout 300 \
  --model "openai-codex/gpt-5.4" \
  --thinking low \
  --light-context \
  --announce \
  --channel discord \
  --to "channel:[channel-id]"
```

Message: **Lane 7 revision prompt** from `_starter/cron-prompts.md`.

## 7. Set concurrency

In `openclaw.json`, set:

```json
"cron": {
  "maxConcurrentRuns": 8
}
```

This covers all 7 lanes plus one slot of headroom for overlapping runs.

## 8. Restart and test

```bash
openclaw gateway restart
```

Test each lane manually before relying on cron. Start with Lane 2 (first-pass cards) -- it has the most visible output and will confirm your templates, rubrics, and file paths all work:

```bash
openclaw cron run [lane-2-job-id]
```

Then test in order: Lane 1 (sourcing), Lane 3 (deep-dive), Lane 4 (brief), Lane 5 (draft), Lane 6 (QA), Lane 7 (revision). Each lane depends on upstream output existing, so this order ensures data flows through the full pipeline. To test Lane 7, you need a draft with `qaStatus: "needs-edits"` — either from a real QA run or a manually written QA report.

Check that each run:
- Reads the correct state files
- Writes output to the expected path
- Appends to `dossier-index.jsonl` correctly
- Delivers to Discord (if configured)

## 9. Manual runs without cron

You can run any lane manually using `openclaw agent`. This is useful for testing individual lanes or running the pipeline without cron enabled.

**Syntax:**

```bash
openclaw agent --agent <agent-id> -m "<prompt>"
```

**Examples by lane:**

```bash
# Lane 1 — Sourcing (search for recent events)
openclaw agent --agent myproject-agent -m "Search for developments from the past 24 hours. Follow the Lane 1 sourcing workflow in AGENTS.md."

# Lane 2 — First-pass card
openclaw agent --agent myproject-agent -m "Run the event card cron workflow in AGENTS.md."

# Lane 3 — Deep-dive dossier
openclaw agent --agent myproject-agent -m "Run the deep-dive cron workflow in AGENTS.md."

# Lane 4 — Post brief
openclaw agent --agent myproject-agent -m "Run the post-brief cron workflow in AGENTS.md."

# Lane 5 — Post draft
openclaw agent --agent myproject-agent -m "Run the post-draft cron workflow in AGENTS.md."

# Lane 6 — QA review
openclaw agent --agent myproject-agent -m "Run the QA cron workflow in AGENTS.md."

# Lane 7 — Revision
openclaw agent --agent myproject-agent -m "Run the revision cron workflow in AGENTS.md."
```

Manual runs use the same agent and workspace as cron — they just skip the scheduler. Useful for debugging a single lane or bootstrapping the pipeline before enabling cron.

## 10. Monitor

- **LOG.md** -- Each lane appends a line per run. Check for errors, skips, and idle reports.
- **Discord** -- If delivery is configured, you get a summary per run. Watch for "queue empty" or "no eligible topic" messages -- these mean upstream lanes need to catch up.
- **First card review** -- After Lane 2 produces its first card, read it against `REFERENCE/first-pass-dossier-rubric.md`. If the quality bar is wrong, adjust the rubric before the pipeline scales up.
- **dossier-index.jsonl** -- The single source of truth for pipeline state. Check it to see which topics are at which stage.

If a lane reports repeated errors, check `LOG.md` for the specific failure, then re-run with `openclaw cron run [job-id]` to reproduce.

### Resetting pipeline state

To wipe all artifacts and state files for a clean test run:

```bash
bash ~/.openclaw/workspace-nostalgia/_starter/reset.sh ~/.openclaw/$WORKSPACE
```

This empties `topic-queue.jsonl`, `dossier-index.jsonl`, and `topics/inbox.md`, and removes all generated files from `cards/`, `dossiers/`, `briefs/`, `drafts/`, and `qa/`. Templates, rubrics, and config files are not touched.
