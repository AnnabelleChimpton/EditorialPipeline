# State File Schemas

Both files are **append-only JSONL**. Agents must never rewrite or delete existing lines.

---

## `topic-queue.jsonl`

One line per candidate topic. Written by Lane 1 (sourcing); `status` updated by Lane 2 (first-pass cards).

| Field         | Type     | Values / Notes                                      |
|---------------|----------|-----------------------------------------------------|
| `id`          | string   | Unique ID, format `vce-NNN`                         |
| `topic`       | string   | Human-readable topic title                          |
| `hook`        | string   | One-sentence pitch explaining why this topic works   |
| `category`    | string   | Slash-separated tags (e.g. `"social internet / identity / platform behavior"`) |
| `zone`        | string   | Domain zone slug from `domain-zones.md`. One of: `mall-retail`, `physical-media`, `tv-movies`, `fashion-aesthetic`, `music`, `internet-platforms`, `gaming`, `teen-social`, `food-products`, `moral-panics`, `advertising-media`, `college`. Used as the filterable category on the board. |
| `era`         | string   | Approximate year range (e.g. `"2004-2008"`)         |
| `eraBucket`   | string   | Broad era grouping derived from the `era` start year. One of: `late-90s` (≤1999), `early-00s` (2000–2002), `mid-00s` (2003–2005), `late-00s` (2006+). Used as the filterable era on the board. |
| `priority`    | string   | `"high"` or `"medium"`                              |
| `sourceability` | string | `"high"` or `"medium"` — how findable sources are   |
| `status`      | string   | `"queued"` (awaiting first-pass) or `"done"` (card written) |
| `notes`       | string   | Editorial notes on angle, risks, or pairing ideas    |
| `parentEvent` | string \| null | Optional grouping ID (e.g., `"aol-instant-messenger-culture"`). Enables sibling-topic detection in downstream lanes. |
| `dossier`     | string \| null | Path to first-pass card once written, or `null`  |

### Example

```json
{"id":"vce-011","topic":"Napster, Limewire, and the moral panic of music piracy","hook":"A generation learned to steal music and felt righteous about it...","category":"music / piracy / digital rights / moral panic","zone":"music","era":"1999-2006","eraBucket":"late-90s","priority":"high","sourceability":"high","status":"queued","notes":"Massive cultural footprint...","dossier":null}
```

---

## `dossier-index.jsonl`

One line per pipeline event. Each topic accumulates multiple entries as it moves through lanes. The `type` field (or its absence) distinguishes entry kinds.

### Entry types

#### First-pass card (Lane 2)

Written when a first-pass research card is completed. No `type` field.

| Field       | Type   | Values / Notes                                  |
|-------------|--------|--------------------------------------------------|
| `id`        | string | Matches `topic-queue.jsonl` id                   |
| `topic`     | string | Topic title                                      |
| `verdict`   | string | `"strong"`, `"maybe"`, or `"weak"`               |
| `sources`   | number | Count of sources used in the card                |
| `card`      | string | Path to card file (e.g. `"REFERENCE/cards/vce-001-...md"`) |
| `parentEvent` | string \| null | Carried from `topic-queue.jsonl` if present       |
| `timestamp` | string | ISO 8601 timestamp                               |

> **parentEvent note:** When a topic has a `parentEvent`, all topics sharing that grouping ID are "siblings." Downstream lanes (brief, draft, QA) use this to detect overlapping coverage, avoid redundant material, and enable synthesis across related topics (e.g., folding a thin sibling into a stronger sibling's draft).

#### Deep-dive dossier (Lane 3)

Written when a full dossier is completed from a "strong" first-pass card.

| Field       | Type   | Values / Notes                                  |
|-------------|--------|--------------------------------------------------|
| `id`        | string | Same id as the first-pass entry                  |
| `topic`     | string | Topic title                                      |
| `verdict`   | string | Carried from first-pass entry                    |
| `sources`   | number | Carried from first-pass entry                    |
| `card`      | string | Path to first-pass card                          |
| `timestamp` | string | ISO 8601 timestamp                               |
| `type`      | string | `"deepdive"`                                     |
| `dossier`   | string | Path to dossier file (e.g. `"REFERENCE/dossiers/vce-001-...md"`) |

#### Post brief (Lane 4)

Written when an editorial brief is created from a completed dossier.

| Field   | Type   | Values / Notes                                      |
|---------|--------|------------------------------------------------------|
| `id`    | string | Same id                                              |
| `topic` | string | Topic title                                          |
| `type`  | string | `"brief"`                                            |
| `brief` | string | Path to brief file (e.g. `"REFERENCE/briefs/vce-001-...md"`) |

#### Post draft (Lane 5)

Written when a draft post is produced from a brief and dossier.

| Field   | Type   | Values / Notes                                      |
|---------|--------|------------------------------------------------------|
| `id`    | string | Same id                                              |
| `topic` | string | Topic title                                          |
| `type`  | string | `"draft"`                                            |
| `draft` | string | Path to draft file (e.g. `"REFERENCE/drafts/vce-001-...md"`) |

#### QA review (Lane 6)

Written when a draft passes (or fails) QA review.

| Field      | Type   | Values / Notes                                      |
|------------|--------|------------------------------------------------------|
| `id`       | string | Same id                                              |
| `topic`    | string | Topic title                                          |
| `type`     | string | `"qa"`                                               |
| `qa`       | string | Path to QA report (e.g. `"REFERENCE/qa/vce-001-...md"`) |
| `qaStatus` | string | `"approved"` or `"needs-edits"`                      |

#### Revision (Lane 7)

Written when a revised draft is produced from a QA report with `needs-edits` status.

| Field            | Type   | Values / Notes                                      |
|------------------|--------|------------------------------------------------------|
| `id`             | string | Same id                                              |
| `topic`          | string | Topic title                                          |
| `type`           | string | `"revision"`                                         |
| `draft`          | string | Path to revised draft (e.g. `"REFERENCE/drafts/vce-001-...-r1.md"`) |
| `revisionRound`  | number | `1` or `2`                                           |
| `revisionStatus` | string | (optional) `"human-review"` if r2 still fails QA     |

**Max revision cap:** After `-r2` still receives `qaStatus: "needs-edits"`, Lane 7 does NOT produce `-r3`. Instead it appends an entry with `revisionStatus: "human-review"` to flag the topic for manual intervention.

---

## Selection logic

Each lane finds its next work item by scanning `dossier-index.jsonl`:

- **Lane 2**: picks the first `topic-queue.jsonl` entry with `status: "queued"` whose `id` is not in `dossier-index.jsonl`.
- **Lane 3**: picks the first first-pass entry (no `type` field) with `verdict: "strong"` whose `id` does not already have a `type: "deepdive"` entry in the index.
- **Lane 4**: picks the first `type: "deepdive"` entry whose `id` has no brief file on disk.
- **Lane 5**: picks the first `type: "brief"` entry whose `id` has no draft file on disk.
- **Lane 6**: picks the first `type: "draft"` or `"revision"` entry whose `id` has no QA report on disk for that draft version. This covers both original drafts and revision drafts (`-r1`, `-r2`).
- **Lane 7**: picks the first `type: "qa"` entry with `qaStatus: "needs-edits"` whose `id` does not already have a revision for that round. If the QA was for the original draft, produces `-r1`; if for `-r1`, produces `-r2`. If for `-r2`, skips (revision cap reached).
