import fs from "fs";
import path from "path";
import { REFERENCE_DIR } from "./paths";

const STATE_DIR = path.join(REFERENCE_DIR, ".state");

export interface FeedbackEntry {
  id: string;
  lane: string;
  text: string;
  addedAt: string;
}

export interface PriorityEntry {
  id: string;
  addedAt: string;
}

function readJSON<T>(filePath: string): T[] {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJSON<T>(filePath: string, data: T[]): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

const feedbackPath = () => path.join(STATE_DIR, "feedback.json");
const priorityPath = () => path.join(STATE_DIR, "priority.json");

export function loadFeedback(): FeedbackEntry[] {
  return readJSON<FeedbackEntry>(feedbackPath());
}

export function saveFeedback(entries: FeedbackEntry[]): void {
  writeJSON(feedbackPath(), entries);
}

export function loadPriorityQueue(): PriorityEntry[] {
  return readJSON<PriorityEntry>(priorityPath());
}

export function savePriorityQueue(entries: PriorityEntry[]): void {
  writeJSON(priorityPath(), entries);
}

export function getFeedbackForTopic(topicId: string): FeedbackEntry[] {
  return loadFeedback().filter((e) => e.id === topicId);
}

export function isPrioritized(topicId: string): boolean {
  return loadPriorityQueue().some((e) => e.id === topicId);
}

export function getPrioritizedIds(): Set<string> {
  return new Set(loadPriorityQueue().map((e) => e.id));
}
