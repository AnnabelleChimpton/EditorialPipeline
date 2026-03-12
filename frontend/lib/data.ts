import fs from "fs";
import path from "path";
import { REFERENCE_DIR } from "./paths";

export type Stage =
  | "queued"
  | "card"
  | "dossier"
  | "brief"
  | "draft"
  | "qa-failed"
  | "revision"
  | "done";

export interface Topic {
  id: string;
  title: string;
  currentStage: Stage;
  qaStatus?: "approved" | "needs-edits";
  revisionRound?: number;
  revisionStatus?: string;
  hook?: string;
  era?: string;
  category?: string;
  priority?: string;
  sourceability?: string;
  status?: string;
  artifacts: {
    card?: string;
    dossier?: string;
    brief?: string;
    draft?: string;
    qa?: string;
    revision?: string;
  };
}

interface IndexEntry {
  id: string;
  topic: string;
  type?: string;
  card?: string;
  dossier?: string;
  brief?: string;
  draft?: string;
  qa?: string;
  qaStatus?: "approved" | "needs-edits";
  revisionRound?: number;
  revisionStatus?: string;
  [key: string]: unknown;
}

interface QueueEntry {
  id: string;
  topic: string;
  hook?: string;
  category?: string;
  era?: string;
  priority?: string;
  sourceability?: string;
  status?: string;
  [key: string]: unknown;
}

function parseJSONL<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

function resolveStage(entries: IndexEntry[]): {
  stage: Stage;
  qaStatus?: "approved" | "needs-edits";
  revisionRound?: number;
  revisionStatus?: string;
  artifacts: Topic["artifacts"];
} {
  const artifacts: Topic["artifacts"] = {};
  let stage: Stage = "card";
  let qaStatus: "approved" | "needs-edits" | undefined;
  let revisionRound: number | undefined;
  let revisionStatus: string | undefined;
  let lastQaApproved = false;
  let hasRevisionAfterQaFail = false;

  for (const entry of entries) {
    const type = entry.type;

    if (!type) {
      // Card entry
      if (entry.card) artifacts.card = entry.card;
      stage = "card";
    } else if (type === "deepdive") {
      if (entry.dossier) artifacts.dossier = entry.dossier;
      stage = "dossier";
    } else if (type === "brief") {
      if (entry.brief) artifacts.brief = entry.brief;
      stage = "brief";
    } else if (type === "draft") {
      if (entry.draft) artifacts.draft = entry.draft;
      stage = "draft";
    } else if (type === "qa") {
      if (entry.qa) artifacts.qa = entry.qa;
      qaStatus = entry.qaStatus;
      if (entry.qaStatus === "approved") {
        lastQaApproved = true;
        stage = "done";
      } else {
        lastQaApproved = false;
        stage = "qa-failed";
      }
    } else if (type === "revision") {
      if (entry.draft) artifacts.revision = entry.draft;
      revisionRound = entry.revisionRound;
      revisionStatus = entry.revisionStatus as string | undefined;
      hasRevisionAfterQaFail = true;
      stage = "revision";
    }
  }

  // Final resolution: if last QA was approved, it's done
  // The loop already handles ordering since entries are append-only
  if (lastQaApproved && !hasRevisionAfterQaFail) {
    // Actually we need to check: the last qa entry, not just any
  }

  // Re-derive from the last relevant events
  // Walk backwards to find final state
  let finalStage = stage;
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

  return { stage: finalStage, qaStatus, revisionRound, revisionStatus, artifacts };
}

export function getTopics(): Topic[] {
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

  // Build topic map from index
  const topicMap = new Map<string, Topic>();
  for (const [id, entries] of grouped) {
    const first = entries[0];
    const { stage, qaStatus, revisionRound, revisionStatus, artifacts } = resolveStage(entries);
    topicMap.set(id, {
      id,
      title: first.topic,
      currentStage: stage,
      qaStatus,
      revisionRound,
      revisionStatus,
      artifacts,
    });
  }

  // Merge queue metadata
  for (const q of queueEntries) {
    const existing = topicMap.get(q.id);
    if (existing) {
      existing.hook = q.hook;
      existing.era = q.era;
      existing.category = q.category;
      existing.priority = q.priority;
      existing.sourceability = q.sourceability;
      existing.status = q.status;
    } else if (q.status === "queued") {
      topicMap.set(q.id, {
        id: q.id,
        title: q.topic,
        currentStage: "queued",
        hook: q.hook,
        era: q.era,
        category: q.category,
        priority: q.priority,
        sourceability: q.sourceability,
        status: q.status,
        artifacts: {},
      });
    }
  }

  return Array.from(topicMap.values());
}

export function getTopicById(id: string): Topic | null {
  const topics = getTopics();
  const topic = topics.find((t) => t.id === id);
  if (!topic) return null;

  // Read artifact content from disk
  const readArtifact = (relativePath: string | undefined): string | undefined => {
    if (!relativePath) return undefined;
    const fullPath = path.join(
      REFERENCE_DIR,
      "..",
      relativePath
    );
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
  };

  return topic;
}

export function getQueueEntries(): QueueEntry[] {
  const queuePath = path.join(REFERENCE_DIR, "topic-queue.jsonl");
  const entries = parseJSONL<QueueEntry>(queuePath);
  // Sort by priority: high > medium > low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return entries.sort(
    (a, b) =>
      (priorityOrder[a.priority || "low"] ?? 3) -
      (priorityOrder[b.priority || "low"] ?? 3)
  );
}

export function getIndexLastModified(): Date {
  const indexPath = path.join(REFERENCE_DIR, "dossier-index.jsonl");
  const stat = fs.statSync(indexPath);
  return stat.mtime;
}
