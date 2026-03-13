import { getReadyTopics } from "@/lib/data";
import { ReadyTopicRow } from "@/components/ready-topic-row";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default function ReadyPage() {
  const topics = getReadyTopics();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-stone-900">Ready to Publish</h1>
        {topics.length > 0 && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {topics.length}
          </span>
        )}
      </div>
      <p className="mb-6 text-sm text-stone-500">
        These stories have been reviewed and are ready to publish.
      </p>

      {topics.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
          title="No stories ready to publish yet"
          description="Topics will appear here once they pass editor review."
          action={{ label: "View Story Board", href: "/board" }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {topics.map((topic) => (
            <ReadyTopicRow key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}
