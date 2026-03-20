# Cron Prompts — Research-Editorial Pipeline

These prompts go in the `message` field of each cron job in `cron/jobs.json`.
Copy the contents of each code block directly into the job's `payload.message` value.

**Model recommendations (tiered):**
- Mechanical lanes (sourcing, index-integrity, ghost-publish): `openai/gpt-5.4-nano` — cheapest, sufficient for structured tasks
- Research lanes (card, deep-dive, QA, short-form): `openai/gpt-5.4-mini` — good reasoning at moderate cost
- Writing lanes (brief, draft, revision): `openai-codex/gpt-5.4` or `openai/gpt-5.4` — full model needed for voice quality

**Thinking levels:**
- `"none"` for mechanical lanes (card, short-form, index-integrity, ghost-publish)
- `"low"` for all other lanes
- Never use `"none"` on revision — it causes OpenAI 500 errors on complex edits

All agent lanes should set `lightContext: true` to avoid loading full workspace context (saves ~9KB of input tokens per run).

---

## Lane 1 — Topic Sourcing

Schedule: `15 */4 * * *` (every 4 hours at :15)
Timeout: 900 seconds
Agent: research agent (needs `web_search`)

> The detailed workflow is in `REFERENCE/lane-instructions/sourcing.md`. The cron prompt just tells the agent where to find its instructions and state.

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation, do NOT wait for human input, do NOT present candidates for approval. Read REFERENCE/lane-instructions/sourcing.md for your workflow, then follow it exactly. IMPORTANT: Read queue depth from REFERENCE/.state/queue-depth.json. If queue depth >= [YOUR_THRESHOLD], stop immediately. Stage new topics by appending to REFERENCE/.state/stage-queue.jsonl. Do NOT read or write topic-queue.jsonl or dossier-index.jsonl directly.
```

---

## Lane 2 — First-Pass Research

Schedule: `0 */2 * * *` (every 2 hours)
Timeout: 900 seconds
Agent: research agent (needs `web_search`)

> The detailed workflow is in `REFERENCE/lane-instructions/card.md`. The cron prompt just tells the agent where to find its instructions and state.

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation, do NOT wait for human input, do NOT present results for approval. Read REFERENCE/lane-instructions/card.md for your workflow, then follow it exactly. IMPORTANT: Read your work item from REFERENCE/.state/next-card.json. Stage index entries by appending to REFERENCE/.state/stage-append.jsonl. Stage status updates by appending to REFERENCE/.state/stage-status.jsonl. Do NOT read or write dossier-index.jsonl or topic-queue.jsonl directly.
```

---

## Lane 3 — Deep Dive

Schedule: `45 */2 * * *` (every 2 hours at :45)
Timeout: 900 seconds
Agent: research agent (needs `web_search`, `web_fetch`)

> The detailed workflow is in `REFERENCE/lane-instructions/deepdive.md`. The cron prompt just tells the agent where to find its instructions and state.

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation, do NOT wait for human input, do NOT present results for approval. Read REFERENCE/lane-instructions/deepdive.md for your workflow, then follow it exactly and complete ALL steps including source verification (use the `process` tool to run python3 REFERENCE/pipeline-tools.py verify-sources on the dossier — do NOT skip this or suggest the human run it). IMPORTANT: Read your work item from REFERENCE/.state/next-deepdive.json. Stage index entries by appending to REFERENCE/.state/stage-append.jsonl. Do NOT read or write dossier-index.jsonl directly.
```

---

## Lane 4 — Post Brief

Schedule: `30 */2 * * *` (every 2 hours at :30)
Timeout: 300 seconds
Agent: writing agent (no web tools needed)

> The detailed workflow is in `REFERENCE/lane-instructions/brief.md`. The cron prompt just tells the agent where to find its instructions and state.

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation, do NOT wait for human input, do NOT defer steps to the human. Complete ALL steps yourself. Read REFERENCE/lane-instructions/brief.md for your workflow, then follow it exactly. Read your work item from REFERENCE/.state/next-brief.json. Use _resolvedPaths for file lookups — do NOT read dossier-index.jsonl. Stage index entries using the python3 stage command as described in the lane instructions — do NOT write to stage-append.jsonl directly.
```

---

## Lane 5 — Post Draft

Schedule: `10 */2 * * *` (every 2 hours at :10)
Timeout: 300 seconds
Agent: writing agent (no web tools needed)

> The detailed workflow is in `REFERENCE/lane-instructions/draft.md`. The cron prompt just tells the agent where to find its instructions and state.

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation, do NOT wait for human input, do NOT defer steps to the human. Complete ALL steps yourself including the slop-check (use the `process` tool to run python3 REFERENCE/pipeline-tools.py slop-check on the draft — do NOT skip this or suggest the human run it). Read REFERENCE/lane-instructions/draft.md for your workflow, then follow it exactly. Read your work item from REFERENCE/.state/next-draft.json. Use _resolvedPaths for file lookups — do NOT read dossier-index.jsonl. Stage index entries by appending to REFERENCE/.state/stage-append.jsonl.
```

---

## Lane 5b — Short-Form Post

Schedule: `5 */2 * * *` (every 2 hours at :05)
Timeout: 300 seconds
Agent: writing agent (no web tools needed)

> The detailed workflow is in `REFERENCE/lane-instructions/short-form.md`. The cron prompt just tells the agent where to find its instructions and state.

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation, do NOT wait for human input, do NOT defer steps to the human. Complete ALL steps yourself including the slop-check (use the `process` tool to run python3 REFERENCE/pipeline-tools.py slop-check on the short-form post — do NOT skip this or suggest the human run it). Read REFERENCE/lane-instructions/short-form.md for your workflow, then follow it exactly. Read your work item from REFERENCE/.state/next-short-form.json. Use _resolvedPaths for file lookups — do NOT read dossier-index.jsonl. Stage index entries by appending to REFERENCE/.state/stage-append.jsonl.
```

---

## Lane 6 — QA Review

Schedule: `50 */1 * * *` (hourly at :50)
Timeout: 300 seconds
Agent: writing agent (no web tools needed)

> The detailed workflow is in `REFERENCE/lane-instructions/qa.md`. The cron prompt just tells the agent where to find its instructions and state.

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation, do NOT wait for human input, do NOT defer steps to the human. Complete ALL steps yourself. Read REFERENCE/lane-instructions/qa.md for your workflow, then follow it exactly. Read your work item from REFERENCE/.state/next-qa.json. Use _resolvedPaths for file lookups — do NOT read dossier-index.jsonl. Stage index entries by appending to REFERENCE/.state/stage-append.jsonl. CRITICAL: You must write the QA report file and append the index entry BEFORE producing the Discord summary.
```

---

## Lane 7 — Revision

Schedule: `20 */1 * * *` (hourly at :20)
Timeout: 300 seconds
Agent: writing agent (no web tools needed)

> The detailed workflow is in `REFERENCE/lane-instructions/revision.md`. The cron prompt just tells the agent where to find its instructions and state.

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation, do NOT wait for human input, do NOT defer steps to the human. Complete ALL steps yourself including the slop-check (use the `process` tool to run python3 REFERENCE/pipeline-tools.py slop-check on the revision draft — do NOT skip this or suggest the human run it). Read REFERENCE/lane-instructions/revision.md for your workflow, then follow it exactly. Read your work item from REFERENCE/.state/next-revision.json. Use _resolvedPaths for file lookups — do NOT read dossier-index.jsonl. Stage index entries by appending to REFERENCE/.state/stage-append.jsonl.
```

---

## Index-Integrity Check

Schedule: `35 */6 * * *` (every 6 hours at :35)
Timeout: 120 seconds
Agent: any agent (no web tools needed)
Thinking: `none`

### Prompt

```
Cron run. You are running autonomously — do NOT ask for confirmation. Perform the index-integrity check:

1. Read REFERENCE/dossier-index.jsonl — parse each line as JSON. If any line fails to parse, report the line number and error.
2. Read REFERENCE/topic-queue.jsonl — same parse check.
3. For each index entry, check that every referenced file path exists. Try to read each path — if the file doesn't exist, record it as broken.
4. Check for banned fields (sources_count) and merged entries (both verdict and type).
5. If all paths resolve AND checks pass, report "index integrity OK — N entries, 0 broken paths" and stop.
6. If any paths are broken, report each issue. Do NOT fix or modify any files — read-only check.
```

---

## Infrastructure: Pre-compute — Next Work Items

Schedule: `57 * * * *` (hourly at :57)
Timeout: 120 seconds
Thinking: `none`

This is an infrastructure lane, not an agent lane. It runs `pipeline-cron.py` to
compute the `next-*.json` state files that all agent lanes read their work items from.
It also computes `queue-depth.json` for the sourcing gate.

### Prompt

```
Cron run. Run the pre-compute step: use the `process` tool to run python3 REFERENCE/pipeline-cron.py. Report the result.
```

---

## Infrastructure: Commit — Flush Staged Changes

Schedule: `*/4 * * * *` (every 4 minutes)
Timeout: 120 seconds
Thinking: `none`

This is an infrastructure lane, not an agent lane. It runs `pipeline-commit.py` to
flush staged changes from `.state/stage-*.jsonl` into the main index files (`dossier-index.jsonl`,
`topic-queue.jsonl`). The staging pattern prevents concurrent write conflicts between lanes.

### Prompt

```
Cron run. Run the commit step: use the `process` tool to run python3 REFERENCE/pipeline-commit.py. Report the result.
```

---

## Schedule Summary

| Lane | Schedule | Agent | Model | Thinking |
|------|----------|-------|-------|----------|
| Sourcing | `:15 */4h` | research | gpt-5.4-nano | low |
| Card | `:00 */2h` | research | gpt-5.4-mini | none |
| Deep-dive | `:45 */2h` | research | gpt-5.4-mini | low |
| Brief | `:30 */2h` | writing | codex/gpt-5.4 | low |
| Draft | `:10 */2h` | writing | codex/gpt-5.4 | low |
| Short-form | `:05 */2h` | writing | gpt-5.4-mini | none |
| QA | `:50 */1h` | writing | gpt-5.4-mini | low |
| Revision | `:20 */1h` | writing | codex/gpt-5.4 | low |
| Index check | `:35 */6h` | any | gpt-5.4-nano | none |
| Pre-compute | `:57 */1h` | infra | gpt-5.4-nano | none |
| Commit | `*/4m` | infra | gpt-5.4-nano | none |

All agent lanes use `lightContext: true`. Stagger schedules to avoid collisions.
