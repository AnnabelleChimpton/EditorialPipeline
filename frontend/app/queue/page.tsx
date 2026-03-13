import { getTopics, getFilterGroups, getPriorityWeight } from "@/lib/data";
import { getManifest } from "@/lib/manifest";
import { QueueTable } from "@/components/queue-table";

export const dynamic = "force-dynamic";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const manifest = getManifest();
  const topics = getTopics().sort((a, b) => getPriorityWeight(a) - getPriorityWeight(b));
  const filterGroups = getFilterGroups(topics);
  const params = await searchParams;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">All Stories</h1>
        <p className="mt-1 text-sm text-stone-500">
          All stories, sorted by {manifest.priority.label.toLowerCase()}
        </p>
      </div>
      <QueueTable
        topics={topics}
        filterGroups={filterGroups}
        manifest={manifest}
        searchParams={params}
      />
    </div>
  );
}
