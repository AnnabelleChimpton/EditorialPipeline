# Research-Editorial Pipeline

Config-driven multi-brand research pipeline for OpenClaw. One YAML config per brand, one command to scaffold a workspace.

## Quick start

```bash
# New brand
pipeline init brands/my-brand.yaml

# Preview without creating anything
pipeline init brands/my-brand.yaml --dry-run

# Update workspace after editing brand.yaml
pipeline sync my-brand

# Check workspace health
pipeline list
```

## How it works

Each brand gets a YAML config (`brands/<slug>.yaml`) that defines everything brand-specific: voice, domain zones, slop patterns, schedules, delivery, and agent config.

Running `pipeline init` creates an OpenClaw workspace with:
- **Symlinks** to shared Python tools (bug fixes propagate instantly to all brands)
- **Generated markdown** (AGENTS.md, rubrics, brand-config.md, domain-zones.md) from templates + brand config
- **Copied static files** (templates that don't vary between brands)
- **Cron jobs** registered in OpenClaw + system crontab entries for pre-compute and commit

```
~/.openclaw/workspace-<slug>/
  brand.yaml            -> ~/git/.../brands/<slug>.yaml      (symlink)
  AGENTS.md                # generated from template
  REFERENCE/
    pipeline-tools.py   -> ~/git/.../core/pipeline-tools.py  (symlink)
    pipeline-cron.py    -> ~/git/.../core/pipeline-cron.py   (symlink)
    pipeline-commit.py  -> ~/git/.../core/pipeline-commit.py (symlink)
    brand-config.md        # generated
    domain-zones.md        # generated
    *-rubric.md            # generated (brand patterns injected)
    *-template.md          # copied from core/static/
    topic-queue.jsonl      # production data
    dossier-index.jsonl    # production data
    .state/                # pre-computed lane state
    cards/ dossiers/ briefs/ drafts/ qa/ revisions/ short-form/
```

## Repo structure

```
core/
  pipeline-tools.py       # State manager — reads brand.yaml at runtime
  pipeline-cron.py        # Pre-compute state for cron agents
  pipeline-commit.py      # Commit staged operations
  templates/              # .tmpl files with {variable} placeholders
    agents.md.tmpl
    brand-config.md.tmpl
    domain-zones.md.tmpl
    rubrics/*.tmpl
  static/                 # Copied as-is (no brand customization)
brands/
  tech-commentary.yaml    # Live VCE brand config
pipeline                  # CLI entry point
starter-kit/              # Legacy manual setup (kept for reference)
```

## Brand config (`brand.yaml`)

All brand-specific decisions live in one file. Key sections:

| Section | What it controls |
|---------|-----------------|
| `brand` | Name, slug, ID prefix |
| `voice` | Personality, dos/donts, platform guidelines, examples |
| `domain.zones` | Thematic zones for topic sourcing |
| `pipeline` | Gate field/values, queue threshold, revision cap |
| `slop.hard_fail` | Regex patterns that auto-fail drafts |
| `slop.warn` | Regex patterns that generate warnings |
| `agent` | Model selection per lane |
| `delivery` | Discord channel for cron output |
| `schedule` | Cron expressions for all lanes |

See `brands/tech-commentary.yaml` for a complete example.

## Pipeline lanes

The pipeline runs 7 production lanes + sourcing + integrity check:

| Lane | Schedule | What it does |
|------|----------|--------------|
| Sourcing | Every 4h | Refills topic queue from web search |
| Card | Hourly | First-pass research card with verdict |
| Deep-dive | Hourly | Full dossier from "strong" cards |
| Brief | Hourly | Editorial direction (format, hook, angle) |
| Draft | Hourly | Ready-to-review post copy |
| QA | Hourly | Mechanical slop check + editorial review |
| Revision | Hourly | Fix QA-flagged issues (max 2 rounds) |
| Short-form | Hourly | 150-250 word companion post |
| Integrity | Every 6h | Validate index paths exist |

State flows through JSONL files via a pre-compute + stage + commit pattern. Agents never write to production JSONL directly.

## Updating a brand

Edit the YAML, then sync:

```bash
vim brands/tech-commentary.yaml   # add a slop pattern, change a zone, etc.
pipeline sync tech-commentary      # regenerates AGENTS.md, rubrics, etc.
```

Slop pattern changes take effect immediately (pipeline-tools.py reads brand.yaml at runtime). Markdown changes require `pipeline sync`.

## Dependencies

- Python 3.8+
- PyYAML (`pip install pyyaml`)
- OpenClaw (for cron job management)
