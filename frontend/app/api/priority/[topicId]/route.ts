import { NextRequest, NextResponse } from "next/server";
import { loadPriorityQueue, savePriorityQueue } from "@/lib/state";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const { topicId } = await params;
  const queue = loadPriorityQueue();
  if (!queue.some((e) => e.id === topicId)) {
    queue.push({ id: topicId, addedAt: new Date().toISOString() });
    savePriorityQueue(queue);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const { topicId } = await params;
  const queue = loadPriorityQueue().filter((e) => e.id !== topicId);
  savePriorityQueue(queue);
  return NextResponse.json({ ok: true });
}
