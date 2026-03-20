import { NextRequest, NextResponse } from "next/server";
import { loadFeedback, saveFeedback } from "@/lib/state";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const { topicId } = await params;
  const entries = loadFeedback().filter((e) => e.id === topicId);
  return NextResponse.json(entries);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const { topicId } = await params;
  const lane = request.nextUrl.searchParams.get("lane");
  let entries = loadFeedback();
  if (lane) {
    entries = entries.filter((e) => !(e.id === topicId && e.lane === lane));
  } else {
    entries = entries.filter((e) => e.id !== topicId);
  }
  saveFeedback(entries);
  return NextResponse.json({ ok: true });
}
