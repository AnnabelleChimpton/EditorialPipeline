# JSONL Schema Definitions

## topic-queue.jsonl

One JSON line per event. Fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Format: `bn-NNN` (e.g., `bn-001`) |
| `event` | string | yes | Human-readable event description |
| `urgency` | string | yes | `critical` / `high` / `standard` |
| `confidence` | string | yes | `confirmed` / `developing` / `unverified` |
| `zone` | string | yes | From `domain-zones.md` (e.g., "military-operations", "diplomatic") |
| `eventDate` | string | yes | ISO 8601 timestamp of when the event occurred |
| `parentEvent` | string | no | Optional grouping ID (e.g., "gaza-ceasefire-2026"). Informational, not structural |
| `status` | string | yes | `queued` / `done` / `blocked` |
| `sources` | number | yes | Number of corroborating sources at time of queue entry |
| `notes` | string | no | Editorial notes |
| `blockedReason` | string | no | Present only when `status` is `"blocked"` |

### Urgency tiers
- **critical**: Active escalation, mass casualty event, imminent threat. Process first in all downstream lanes.
- **high**: Major policy shift, significant military operation, key diplomatic development. Process before standard.
- **standard**: Ongoing context, diplomatic process, background development. Process in queue order.

### Confidence levels
- **confirmed**: Corroborated by 2+ independent sources (different outlets, not rewrites of the same wire).
- **developing**: Single credible source (wire service, named official, established outlet). Facts may shift.
- **unverified**: Social media, single unconfirmed source, or conflicting reports. Handle with explicit qualifiers.

## dossier-index.jsonl

Append-only index tracking each event through all 7 lanes. One JSON line per stage transition.

### Entry types

**Card entry** (Lane 2 output):
```json
{
  "id": "bn-001",
  "event": "...",
  "confidence": "confirmed",
  "urgency": "critical",
  "eventDate": "2026-03-10T14:00:00Z",
  "sources": 4,
  "parentEvent": "regional-iran-israel-war-2026",
  "card": "REFERENCE/cards/bn-001-event-slug.md",
  "timestamp": "2026-03-10T16:00:00Z"
}
```

`parentEvent` is optional. When present, it is carried forward from `topic-queue.jsonl` and enables sibling-event detection in downstream lanes (Lanes 2, 4, and 5).

**Deep-dive entry** (Lane 3 output):
```json
{
  "id": "bn-001",
  "event": "...",
  "type": "deepdive",
  "confidence": "confirmed",
  "urgency": "critical",
  "eventDate": "2026-03-10T14:00:00Z",
  "dossier": "REFERENCE/dossiers/bn-001-event-slug.md",
  "timestamp": "..."
}
```

**Brief entry** (Lane 4 output):
```json
{
  "id": "bn-001",
  "event": "...",
  "type": "brief",
  "brief": "REFERENCE/briefs/bn-001-event-slug.md",
  "timestamp": "..."
}
```

**Draft entry** (Lane 5 output):
```json
{
  "id": "bn-001",
  "event": "...",
  "type": "draft",
  "draft": "REFERENCE/drafts/bn-001-event-slug.md",
  "timestamp": "..."
}
```

**QA entry** (Lane 6 output):
```json
{
  "id": "bn-001",
  "event": "...",
  "type": "qa",
  "qa": "REFERENCE/qa/bn-001-event-slug.md",
  "qaStatus": "approved",
  "timestamp": "..."
}
```

**Revision entry** (Lane 7 output):
```json
{
  "id": "bn-001",
  "event": "...",
  "type": "revision",
  "draft": "REFERENCE/drafts/bn-001-event-slug-r1.md",
  "revisionRound": 1,
  "timestamp": "..."
}
```

If revision cap reached:
```json
{
  "id": "bn-001",
  "event": "...",
  "type": "revision",
  "revisionRound": 2,
  "revisionStatus": "human-review",
  "timestamp": "..."
}
```
