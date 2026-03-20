import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { loadFeedback, saveFeedback, type FeedbackEntry } from "@/lib/state";
import { getTopics, type Stage } from "@/lib/data";
import { REFERENCE_DIR } from "@/lib/paths";

const VALID_LANES = new Set(["draft", "brief", "qa", "revision", "short-form", "*"]);

/** Lane progression order — higher index = further along. */
const STAGE_ORDER: Stage[] = ["queued", "card", "dossier", "brief", "draft", "qa-failed", "revision", "done"];

/** Map feedback lane names to the stage they target. */
const LANE_TO_STAGE: Record<string, Stage> = {
  brief: "brief",
  draft: "draft",
  qa: "qa-failed",
  revision: "revision",
  "short-form": "done",
};

function isTopicPastLane(currentStage: Stage, targetLane: string): boolean {
  if (targetLane === "*") return false;
  const targetStage = LANE_TO_STAGE[targetLane];
  if (!targetStage) return false;
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const targetIdx = STAGE_ORDER.indexOf(targetStage);
  return currentIdx > targetIdx;
}

function forceRevisionViaStage(topicId: string, topicTitle: string, qaPath: string): void {
  const stageAppendPath = path.join(REFERENCE_DIR, ".state", "stage-append.jsonl");
  const entry = JSON.stringify({
    id: topicId,
    topic: topicTitle,
    type: "qa",
    qa: qaPath,
    qaStatus: "needs-edits",
    feedbackForced: true,
    timestamp: new Date().toISOString(),
  });
  fs.mkdirSync(path.dirname(stageAppendPath), { recursive: true });
  fs.appendFileSync(stageAppendPath, entry + "\n", "utf-8");
}

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topicId");
  let entries = loadFeedback();
  if (topicId) {
    entries = entries.filter((e) => e.id === topicId);
  }
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, lane, text } = body as { id?: string; lane?: string; text?: string };

  if (!id || !lane || !text) {
    return NextResponse.json({ error: "id, lane, and text are required" }, { status: 400 });
  }
  if (!VALID_LANES.has(lane)) {
    return NextResponse.json(
      { error: `lane must be one of: ${[...VALID_LANES].join(", ")}` },
      { status: 400 },
    );
  }

  // Check if topic has already passed the target lane
  let effectiveLane = lane;
  let forcedRevision = false;

  if (lane !== "*" && lane !== "revision") {
    const topics = getTopics();
    const topic = topics.find((t) => t.id === id);
    if (topic && isTopicPastLane(topic.currentStage, lane)) {
      // Remap to revision and stage a needs-edits entry
      effectiveLane = "revision";
      forcedRevision = true;
      const qaPath = topic.artifacts.qa || "";
      forceRevisionViaStage(id, topic.title, qaPath);
    }
  }

  const entry: FeedbackEntry = { id, lane: effectiveLane, text, addedAt: new Date().toISOString() };
  const entries = loadFeedback();
  entries.push(entry);
  saveFeedback(entries);

  return NextResponse.json({ ...entry, forcedRevision }, { status: 201 });
}
