import { getTopics, getFilterGroups } from "@/lib/data";
import { getManifest } from "@/lib/manifest";
import { loadPriorityQueue, loadFeedback } from "@/lib/state";
import { PipelineBoard } from "@/components/pipeline-board";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const manifest = getManifest();
  const topics = getTopics();
  const filterGroups = getFilterGroups(topics);
  const params = await searchParams;

  const prioritizedIds = loadPriorityQueue().map((e) => e.id);
  const feedback = loadFeedback();
  const feedbackCounts: Record<string, number> = {};
  for (const entry of feedback) {
    feedbackCounts[entry.id] = (feedbackCounts[entry.id] || 0) + 1;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Story Board</h1>
        <p className="mt-1 text-sm text-stone-500">
          See where every story stands
        </p>
      </div>
      <PipelineBoard
        topics={topics}
        filterGroups={filterGroups}
        manifest={manifest}
        searchParams={params}
        prioritizedIds={prioritizedIds}
        feedbackCounts={feedbackCounts}
      />
    </div>
  );
}
