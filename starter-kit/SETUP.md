# Pipeline Setup Guide

How to stand up a new research-to-content pipeline.

---

## 1. Prerequisites

- OpenClaw installed and running (`openclaw --version`)
- Gateway active (`openclaw gateway status` should return OK)
- A model provider configured in `openclaw.json`
- Discord channel ID (optional, for delivery notifications)

## 2. Setup with `pipeline init` (recommended)

The fastest way to create a new pipeline workspace. The CLI generates all files from your brand config, sets up symlinks to shared core code, and registers cron jobs.

### Create a brand config

Copy an existing brand YAML from `brands/` or start from scratch. Required sections:

```yaml
brand:
  name: "Your Project Name"
  slug: "your-project"
  id_prefix: "yp"

voice:
  personality: "..."
  communication_style: "..."
  principles: [...]
  dos: [...]
  donts: [...]
  platforms:
    blog: { tone: "...", length: "1500-3500 words" }
  content_rules:
    always: [...]
    never: [...]

domain:
  zones:
    - slug: "zone-one"
      name: "Zone One"
      description: "..."
      example_angles: ["...", "..."]
    # ... 8-12 zones total

pipeline:
  queue_depth_threshold: 20
  items_per_sourcing_run: "4-5"
  gate_field: "verdict"
  gate_values: ["strong", "maybe", "weak"]
  gate_primary: "strong"
  revision_cap: 2
  queue_fields: [...]
  allowed_formats: ["blog essay", "ranked list", "mini-essay"]

slop:
  hard_fail: ["negation-reframe", "ultimately", "at-its-core", ...]
  warn: [...]

schedule:
  sourcing: "15 */4 * * *"
  card: "0 */2 * * *"
  deepdive: "45 */2 * * *"
  brief: "30 */2 * * *"
  draft: "10 */2 * * *"
  qa: "50 */1 * * *"
  revision: "20 */1 * * *"
  short_form: "5 */2 * * *"

delivery:
  channel: "discord"
  to: "channel:YOUR_CHANNEL_ID"

agent:
  model_research: "openai/gpt-5.4-mini"
  model_mechanical: "openai/gpt-5.4-nano"
  model_writing: "openai-codex/gpt-5.4"
```

### Initialize the workspace

```bash
pipeline init brands/your-project.yaml
```

This:
- Creates `~/.openclaw/workspace-your-project/`
- Symlinks core Python files (`pipeline-tools.py`, `pipeline-cron.py`, `pipeline-commit.py`)
- Renders templates with your brand values (AGENTS.md, rubrics, domain-zones.md, lane-instructions)
- Copies static files (templates, prompts)
- Creates output directories (`cards/`, `dossiers/`, `briefs/`, `drafts/`, `qa/`, `revisions/`, `short-form/`)
- Creates state directory (`REFERENCE/.state/`)
- Registers cron jobs in OpenClaw

### Verify

```bash
pipeline list           # shows initialized workspaces
openclaw cron list      # shows registered jobs
```

---

## 3. Alternative: Manual setup

If you prefer to set up without the CLI, or need to understand what `pipeline init` does under the hood.

### Create the workspace

```bash
WORKSPACE="workspace-myproject"
mkdir -p ~/.openclaw/$WORKSPACE

# Copy starter-kit files
cp starter-kit/AGENTS.md ~/.openclaw/$WORKSPACE/
cp -r starter-kit/REFERENCE ~/.openclaw/$WORKSPACE/
cp -r starter-kit/topics ~/.openclaw/$WORKSPACE/

# Set up domain zones from template
cp ~/.openclaw/$WORKSPACE/REFERENCE/domain-zones-template.md ~/.openclaw/$WORKSPACE/REFERENCE/domain-zones.md

# Symlink core Python files
ln -s ~/git/research-editorial-pipeline/core/pipeline-tools.py ~/.openclaw/$WORKSPACE/REFERENCE/pipeline-tools.py
ln -s ~/git/research-editorial-pipeline/core/pipeline-cron.py ~/.openclaw/$WORKSPACE/REFERENCE/pipeline-cron.py
ln -s ~/git/research-editorial-pipeline/core/pipeline-commit.py ~/.openclaw/$WORKSPACE/REFERENCE/pipeline-commit.py

# Create output directories
mkdir -p ~/.openclaw/$WORKSPACE/REFERENCE/{cards,dossiers,briefs,drafts,qa,revisions,short-form}

# Create state directory
mkdir -p ~/.openclaw/$WORKSPACE/REFERENCE/.state

# Create lane-instructions directory and copy templates
mkdir -p ~/.openclaw/$WORKSPACE/REFERENCE/lane-instructions

# Create the run log
touch ~/.openclaw/$WORKSPACE/LOG.md
```

You will also need `IDENTITY.md` and `SOUL.md` in the workspace root — these define scope and editorial values for your domain.

### Configure agents

You need at least two agents — one with web tools (for research lanes 1-3) and one without (for writing lanes 4-7):

**Research agent** (Lanes 1-3: sourcing, card, deep-dive):
```json
{
  "id": "myproject-research",
  "name": "myproject-research",
  "workspace": "/home/you/.openclaw/workspace-myproject",
  "agentDir": "/home/you/.openclaw/agents/myproject-research/agent",
  "model": { "primary": "openai/gpt-5.4-mini" },
  "sandbox": { "mode": "off", "workspaceAccess": "rw" },
  "tools": {
    "profile": "full",
    "allow": ["read", "write", "edit", "apply_patch", "web_search", "web_fetch", "exec", "process"]
  }
}
```

**Writing agent** (Lanes 4-7: brief, draft, QA, revision, short-form):
```json
{
  "id": "myproject-light",
  "name": "myproject-light",
  "workspace": "/home/you/.openclaw/workspace-myproject",
  "agentDir": "/home/you/.openclaw/agents/myproject-light/agent",
  "model": { "primary": "openai/gpt-5.4-mini" },
  "sandbox": { "mode": "off", "workspaceAccess": "rw" },
  "tools": {
    "profile": "coding",
    "allow": ["read", "write", "edit", "apply_patch", "exec", "process"]
  }
}
```

Create the agent directories and add both to `agents.list` in `openclaw.json`.

**Important:** Agents with `"profile": "coding"` do NOT have `web_search`/`web_fetch` access. Writing lanes should never do web research. Research lanes need `"profile": "full"`.

### Model recommendations

| Lane | Role | Recommended model | Thinking |
|------|------|-------------------|----------|
| Sourcing | Mechanical + search | `openai/gpt-5.4-nano` | `low` |
| Card | Research + writing | `openai/gpt-5.4-mini` | `none` |
| Deep-dive | Research + writing | `openai/gpt-5.4-mini` | `low` |
| Brief | Editorial judgment | `openai-codex/gpt-5.4` | `low` |
| Draft | Creative writing | `openai-codex/gpt-5.4` | `low` |
| QA | Evaluation | `openai/gpt-5.4-mini` | `low` |
| Revision | Creative writing | `openai-codex/gpt-5.4` | `low` |
| Short-form | Creative writing | `openai/gpt-5.4-mini` | `none` |
| Index integrity | Mechanical | `openai/gpt-5.4-nano` | `none` |
| Ghost publish | Mechanical | `openai/gpt-5.4-nano` | `none` |

Use `thinking: "none"` for mechanical lanes that don't benefit from reasoning. Use a full-size model (`gpt-5.4` or `codex/gpt-5.4`) for writing lanes — `gpt-5-mini` is unreliable for creative writing (repeated slop patterns, structural format instead of finished prose).

### Customize for your domain

Find-and-replace in all files under your new workspace:

| Placeholder | Replace with | Example |
|---|---|---|
| `[YOUR PROJECT]` | Your project name | `Retro Gaming Digest` |
| `[YOUR DOMAIN]` | Your content domain | `retro gaming culture` |
| `[YOUR_QUEUE_DEPTH_THRESHOLD]` | Queue depth gate | `20` |
| `[YOUR_GATE_VALUES]` | Gate field values | `strong/maybe/weak` |

Additional customization:

- **Domain zones.** Edit `REFERENCE/domain-zones.md` with descriptions and example topic angles specific to your domain. This drives the sourcing lane's zone-targeted search.
- **Anti-slop rules in rubrics.** Every rubric file has AI-tell flags. Edit these for your domain's cliches.
- **Brand voice.** Create or edit `REFERENCE/brand-config.md` with tone guidance and vocabulary preferences.
- **Lane instructions.** Copy the templates from `core/templates/lane-instructions/` and customize for your domain.
- **Templates.** Review all `*-template.md` files in `REFERENCE/` and adjust for your content type.

## 4. Seed your topic queue

### Create state files

```bash
cd ~/.openclaw/$WORKSPACE/REFERENCE

# Create empty state files (with a trailing newline so append tools work)
echo "" > topic-queue.jsonl
echo "" > dossier-index.jsonl
```

### Add 5-10 initial topics

Append one JSON line per topic to `REFERENCE/.state/stage-queue.jsonl` (not `topic-queue.jsonl` directly — the commit infrastructure will flush it):

```json
{"id":"proj-001","topic":"Your topic name","hook":"One sentence on why this matters.","category":"your-category","zone":"your-zone","priority":"high","sourceability":"high","status":"queued","notes":"Research angle or context.","dossier":null}
```

**Structural fields (required):** `id`, `status`, `notes`, `dossier`
**Domain-specific fields:** Adapt for your content type. Define in `brand.yaml` under `pipeline.queue_fields`.

### Create matching inbox entries

```
- [ ] proj-001 -- Your topic name
- [ ] proj-002 -- Another topic name
```

## 5. Create cron jobs

Copy the prompts from `cron-prompts.md` into each job's `payload.message` field. All lanes use `lightContext: true` to avoid loading full workspace context.

See `cron-prompts.md` for the exact prompt text per lane, and the `openclaw cron add` commands with recommended schedules.

## 6. Set concurrency

In `openclaw.json`:

```json
"cron": {
  "maxConcurrentRuns": 8
}
```

This covers all lanes plus headroom for overlapping runs.

## 7. Restart and test

```bash
openclaw gateway restart
```

Test each lane manually, in order (each depends on upstream output):

```bash
openclaw cron run [lane-2-job-id]   # Card — produces visible output first
openclaw cron run [lane-1-job-id]   # Sourcing — fills the queue
openclaw cron run [lane-3-job-id]   # Deep-dive — needs a "strong" card
openclaw cron run [lane-4-job-id]   # Brief — needs a dossier
openclaw cron run [lane-5-job-id]   # Draft — needs a brief
openclaw cron run [lane-6-job-id]   # QA — needs a draft
openclaw cron run [lane-7-job-id]   # Revision — needs qaStatus: "needs-edits"
```

Check that each run:
- Reads from the correct `.state/next-*.json` file
- Writes output to the expected path
- Stages index entries correctly (via `pipeline-tools.py stage`)
- Delivers to Discord (if configured)

## 8. Monitor

- **LOG.md** — Each lane appends a line per run. Check for errors, skips, and idle reports.
- **Discord** — If delivery is configured, you get a summary per run. Watch for "queue empty" or "no eligible topic" messages.
- **dossier-index.jsonl** — The single source of truth for pipeline state.
- **First card review** — After Lane 2 produces its first card, read it against the rubric. If the quality bar is wrong, adjust before the pipeline scales up.

### Resetting pipeline state

To wipe all artifacts and state files for a clean test run:

```bash
bash ~/git/research-editorial-pipeline/starter-kit/reset.sh ~/.openclaw/$WORKSPACE
```

This empties JSONL files and removes generated files from output directories. Templates, rubrics, and config files are not touched.
