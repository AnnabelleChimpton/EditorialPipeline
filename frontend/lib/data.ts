import fs from "fs";
import path from "path";
import { REFERENCE_DIR } from "./paths";
import { getManifest, type FilterGroup } from "./manifest";

export type Stage =
  | "queued"
  | "card"
  | "dossier"
  | "brief"
  | "draft"
  | "qa-failed"
  | "revision"
  | "done";

export interface PipelineItem {
  id: string;
  title: string;
  currentStage: Stage;
  qaStatus?: "approved" | "needs-edits";
  revisionRound?: number;
  revisionStatus?: string;
  artifactTimestamps?: Record<string, string>;
  artifacts: {
    card?: string;
    dossier?: string;
    brief?: string;
    draft?: string;
    qa?: string;
    revision?: string;
    shortForm?: string;
  };
  /** All domain-specific metadata from queue + index, keyed by original field name */
  meta: Record<string, unknown>;
}

/** @deprecated Use PipelineItem instead */
export type Topic = PipelineItem;

interface IndexEntry {
  id: string;
  type?: string;
  card?: string;
  dossier?: string;
  brief?: string;
  draft?: string;
  qa?: string;
  qaStatus?: "approved" | "needs-edits";
  revisionRound?: number;
  revisionStatus?: string;
  shortForm?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface QueueEntry {
  id: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Attempt to repair a malformed JSONL line by replacing non-structural
 * double quotes inside string values with single quotes.
 *
 * A `"` is considered structural if it is:
 *  - preceded by `{`, `,`, or `:` (possibly with whitespace) → opening a key or value
 *  - followed by `:`, `,`, `}`, `]` (possibly with whitespace) or is the last `"` before EOL → closing a key or value
 *
 * Everything else is an interior quote that broke the JSON and gets replaced with `'`.
 */
function tryRepairJSONL(raw: string): unknown | null {
  const line = raw
    .replace(/\u201c/g, '"')   // left smart double quote → straight
    .replace(/\u201d/g, '"')   // right smart double quote → straight
    .replace(/\u2018/g, "'")   // left smart single quote
    .replace(/\u2019/g, "'")   // right smart single quote
    .trim();

  if (!line) return null;

  // Fast path: line is already valid JSON
  try {
    return JSON.parse(line);
  } catch {
    // fall through to repair
  }

  // Character-level state machine to find non-structural quotes
  const chars = [...line];
  const repaired: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (escaped) {
      repaired.push(ch);
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      repaired.push(ch);
      escaped = true;
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        // Opening quote — always structural
        repaired.push(ch);
        inString = true;
      } else {
        // We're inside a string. Is this quote structural (closing)?
        // Look ahead past optional whitespace for a structural follower: `:`, `,`, `}`, `]`, or EOL
        let j = i + 1;
        while (j < chars.length && (chars[j] === " " || chars[j] === "\t")) j++;
        const next = j < chars.length ? chars[j] : undefined;
        const isClosing =
          next === undefined || // end of line
          next === ":" ||
          next === "," ||
          next === "}" ||
          next === "]";

        if (isClosing) {
          repaired.push(ch);
          inString = false;
        } else {
          // Non-structural interior quote → replace with single quote
          repaired.push("'");
        }
      }
    } else {
      repaired.push(ch);
    }
  }

  const fixed = repaired.join("");
  try {
    const result = JSON.parse(fixed);
    console.warn(`[JSONL repair] Auto-repaired line with non-structural quotes`);
    return result;
  } catch (e) {
    console.error(`[JSONL repair] Repair failed: ${(e as Error).message}`);
    return null;
  }
}

function parseJSONL<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const results: T[] = [];
  for (const raw of content.split("\n")) {
    const parsed = tryRepairJSONL(raw);
    if (parsed !== null) {
      results.push(parsed as T);
    }
  }
  return results;
}

function resolveStage(entries: IndexEntry[]): {
  stage: Stage;
  qaStatus?: "approved" | "needs-edits";
  revisionRound?: number;
  revisionStatus?: string;
  artifacts: PipelineItem["artifacts"];
  artifactTimestamps: Record<string, string>;
} {
  const artifacts: PipelineItem["artifacts"] = {};
  const artifactTimestamps: Record<string, string> = {};
  let qaStatus: "approved" | "needs-edits" | undefined;
  let revisionRound: number | undefined;
  let revisionStatus: string | undefined;

  for (const entry of entries) {
    const type = entry.type;
    const ts = entry.timestamp;

    if (!type) {
      if (entry.card) artifacts.card = entry.card;
      if (ts) artifactTimestamps["card"] = ts;
    } else if (type === "deepdive") {
      if (entry.dossier) artifacts.dossier = entry.dossier;
      if (ts) artifactTimestamps["dossier"] = ts;
    } else if (type === "brief") {
      if (entry.brief) artifacts.brief = entry.brief;
      if (ts) artifactTimestamps["brief"] = ts;
    } else if (type === "draft") {
      if (entry.draft) artifacts.draft = entry.draft;
      if (ts) artifactTimestamps["draft"] = ts;
    } else if (type === "qa") {
      if (entry.qa) artifacts.qa = entry.qa;
      if (ts) artifactTimestamps["qa"] = ts;
      qaStatus = entry.qaStatus;
    } else if (type === "revision") {
      if (entry.draft) artifacts.revision = entry.draft;
      if (ts) artifactTimestamps["revision"] = ts;
      revisionRound = entry.revisionRound;
      revisionStatus = entry.revisionStatus as string | undefined;
    } else if (type === "short-form") {
      if (entry.shortForm) artifacts.shortForm = entry.shortForm;
      if (ts) artifactTimestamps["shortForm"] = ts;
    }
  }

  // Walk backwards to find final state
  let finalStage: Stage = "card";
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.type === "qa" && e.qaStatus === "approved") {
      finalStage = "done";
      qaStatus = "approved";
      break;
    } else if (e.type === "revision") {
      finalStage = "revision";
      revisionRound = e.revisionRound;
      revisionStatus = e.revisionStatus as string | undefined;
      break;
    } else if (e.type === "qa" && e.qaStatus === "needs-edits") {
      finalStage = "qa-failed";
      qaStatus = "needs-edits";
      break;
    } else if (e.type === "draft") {
      finalStage = "draft";
      break;
    } else if (e.type === "brief") {
      finalStage = "brief";
      break;
    } else if (e.type === "deepdive") {
      finalStage = "dossier";
      break;
    } else if (!e.type) {
      finalStage = "card";
      break;
    }
  }

  return { stage: finalStage, qaStatus, revisionRound, revisionStatus, artifacts, artifactTimestamps };
}

export function getTopics(): PipelineItem[] {
  const manifest = getManifest();
  const indexPath = path.join(REFERENCE_DIR, "dossier-index.jsonl");
  const queuePath = path.join(REFERENCE_DIR, "topic-queue.jsonl");

  const indexEntries = parseJSONL<IndexEntry>(indexPath);
  const queueEntries = parseJSONL<QueueEntry>(queuePath);

  // Group index entries by id
  const grouped = new Map<string, IndexEntry[]>();
  for (const entry of indexEntries) {
    const list = grouped.get(entry.id) || [];
    list.push(entry);
    grouped.set(entry.id, list);
  }

  // Build item map from index
  const itemMap = new Map<string, PipelineItem>();
  for (const [id, entries] of grouped) {
    const first = entries[0];
    const { stage, qaStatus, revisionRound, revisionStatus, artifacts, artifactTimestamps } = resolveStage(entries);
    itemMap.set(id, {
      id,
      title: (first[manifest.titleField] as string) || id,
      currentStage: stage,
      qaStatus,
      revisionRound,
      revisionStatus,
      artifacts,
      artifactTimestamps,
      meta: {},
    });
  }

  // Merge queue metadata
  const reservedKeys = new Set(["id", "status", manifest.titleField]);
  for (const q of queueEntries) {
    const existing = itemMap.get(q.id);
    if (existing) {
      for (const [key, val] of Object.entries(q)) {
        if (!reservedKeys.has(key) && val !== undefined) {
          existing.meta[key] = val;
        }
      }
    } else {
      // Topics not in the index: "queued" → queued stage, "done" → card stage (card was written)
      const inferredStage: Stage = q.status === "done" ? "card" : "queued";
      const meta: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(q)) {
        if (!reservedKeys.has(key) && val !== undefined) {
          meta[key] = val;
        }
      }
      itemMap.set(q.id, {
        id: q.id,
        title: (q[manifest.titleField] as string) || q.id,
        currentStage: inferredStage,
        meta,
        artifacts: {},
      });
    }
  }

  return Array.from(itemMap.values());
}

export function getTopicById(id: string): PipelineItem | null {
  const topics = getTopics();
  const topic = topics.find((t) => t.id === id);
  if (!topic) return null;

  const readArtifact = (relativePath: string | undefined): string | undefined => {
    if (!relativePath) return undefined;
    const fullPath = path.join(REFERENCE_DIR, "..", relativePath);
    try {
      return fs.readFileSync(fullPath, "utf-8");
    } catch {
      return undefined;
    }
  };

  topic.artifacts = {
    card: readArtifact(topic.artifacts.card),
    dossier: readArtifact(topic.artifacts.dossier),
    brief: readArtifact(topic.artifacts.brief),
    draft: readArtifact(topic.artifacts.draft),
    qa: readArtifact(topic.artifacts.qa),
    revision: readArtifact(topic.artifacts.revision),
    shortForm: readArtifact(topic.artifacts.shortForm),
  };

  return topic;
}

export function getIndexLastModified(): Date {
  const indexPath = path.join(REFERENCE_DIR, "dossier-index.jsonl");
  const stat = fs.statSync(indexPath);
  return stat.mtime;
}

export interface TopicStats {
  total: number;
  queued: number;
  inProgress: number;
  qaFailed: number;
  revision: number;
  done: number;
}

export function getTopicStats(): TopicStats {
  const topics = getTopics();
  const inProgressStages: Stage[] = ["card", "dossier", "brief", "draft"];
  return {
    total: topics.length,
    queued: topics.filter((t) => t.currentStage === "queued").length,
    inProgress: topics.filter((t) => inProgressStages.includes(t.currentStage)).length,
    qaFailed: topics.filter((t) => t.currentStage === "qa-failed").length,
    revision: topics.filter((t) => t.currentStage === "revision").length,
    done: topics.filter((t) => t.currentStage === "done").length,
  };
}

export interface ActivityEntry {
  id: string;
  topic: string;
  type: string;
  label: string;
}

const activityLabels: Record<string, string> = {
  card: "Topic created",
  deepdive: "Research complete",
  brief: "Brief ready",
  draft: "Draft ready",
  qa: "Editor review complete",
  revision: "Revision submitted",
  "short-form": "Short post ready",
};

export function getRecentActivity(count = 10): ActivityEntry[] {
  const manifest = getManifest();
  const indexPath = path.join(REFERENCE_DIR, "dossier-index.jsonl");
  const entries = parseJSONL<IndexEntry>(indexPath);
  return entries.slice(-count).reverse().map((e) => {
    const type = e.type || "card";
    let label = activityLabels[type] || type;
    if (type === "qa" && e.qaStatus === "approved") label = "Approved for publish";
    if (type === "qa" && e.qaStatus === "needs-edits") label = "Flagged for revision";
    return { id: e.id, topic: (e[manifest.titleField] as string) || e.id, type, label };
  });
}

export interface StageDistribution {
  stage: Stage;
  count: number;
  priorities: Record<string, number>;
}

export function getStageDistribution(): StageDistribution[] {
  const manifest = getManifest();
  const topics = getTopics();
  const allStages: Stage[] = ["queued", "card", "dossier", "brief", "draft", "qa-failed", "revision", "done"];
  return allStages.map((stage) => {
    const matching = topics.filter((t) => t.currentStage === stage);
    const priorities: Record<string, number> = {};
    for (const t of matching) {
      const p = (t.meta[manifest.priority.field] as string) || "unset";
      priorities[p] = (priorities[p] || 0) + 1;
    }
    return { stage, count: matching.length, priorities };
  });
}

export function getFilterGroups(items: PipelineItem[]): FilterGroup[] {
  const manifest = getManifest();
  const groups: FilterGroup[] = [];

  // Priority field
  const priorityValues = new Set<string>();
  for (const item of items) {
    const v = item.meta[manifest.priority.field] as string | undefined;
    if (v) priorityValues.add(v);
  }
  if (priorityValues.size > 0) {
    groups.push({
      field: manifest.priority.field,
      label: manifest.priority.label,
      values: manifest.priority.sortOrder.filter((v) => priorityValues.has(v)),
    });
  }

  // Filterable metadata fields
  for (const mf of manifest.metadata) {
    if (!mf.filterable) continue;
    const values = new Set<string>();
    for (const item of items) {
      const v = item.meta[mf.field] as string | undefined;
      if (v) values.add(v);
    }
    if (values.size > 0) {
      groups.push({ field: mf.field, label: mf.label, values: Array.from(values).sort() });
    }
  }

  return groups;
}

export function getPriorityWeight(item: PipelineItem): number {
  const manifest = getManifest();
  const val = item.meta[manifest.priority.field] as string | undefined;
  if (!val) return manifest.priority.sortOrder.length;
  const idx = manifest.priority.sortOrder.indexOf(val);
  return idx === -1 ? manifest.priority.sortOrder.length : idx;
}

export function getReadyTopics(): PipelineItem[] {
  const topics = getTopics().filter((t) => t.currentStage === "done");
  return topics.map((topic) => {
    const readArtifact = (relativePath: string | undefined): string | undefined => {
      if (!relativePath) return undefined;
      const fullPath = path.join(REFERENCE_DIR, "..", relativePath);
      try {
        return fs.readFileSync(fullPath, "utf-8");
      } catch {
        return undefined;
      }
    };
    return {
      ...topic,
      artifacts: {
        card: readArtifact(topic.artifacts.card),
        dossier: readArtifact(topic.artifacts.dossier),
        brief: readArtifact(topic.artifacts.brief),
        draft: readArtifact(topic.artifacts.draft),
        qa: readArtifact(topic.artifacts.qa),
        revision: readArtifact(topic.artifacts.revision),
        shortForm: readArtifact(topic.artifacts.shortForm),
      },
    };
  });
}
