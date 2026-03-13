import { getTopics, getFilterGroups } from "@/lib/data";
import { PipelineBoard } from "@/components/pipeline-board";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const topics = getTopics();
  const filterGroups = getFilterGroups(topics);
  const params = await searchParams;

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
        searchParams={params}
      />
    </div>
  );
}
