import { notFound } from "next/navigation";
import Link from "next/link";
import { getTopicById } from "@/lib/data";
import { StageBadge } from "@/components/stage-badge";
import { ArtifactTabs } from "@/components/artifact-tabs";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = getTopicById(id);
  if (!topic) notFound();

  return (
    <div className="max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to pipeline
      </Link>

      {/* Header */}
      <div className="mt-5 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-mono text-stone-400 dark:text-stone-500">{topic.id}</span>
          <StageBadge stage={topic.currentStage} />
          {topic.revisionRound && (
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
              Revision round {topic.revisionRound}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-foreground leading-tight">{topic.title}</h1>
        {topic.hook && (
          <p className="mt-2 text-stone-500 dark:text-stone-400 leading-relaxed">{topic.hook}</p>
        )}
        {(topic.era || topic.category || topic.priority) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {topic.era && (
              <span className="inline-flex items-center rounded-md bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-600 dark:text-stone-400 ring-1 ring-inset ring-stone-200 dark:ring-stone-700">
                {topic.era}
              </span>
            )}
            {topic.category && (
              <span className="inline-flex items-center rounded-md bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-600 dark:text-stone-400 ring-1 ring-inset ring-stone-200 dark:ring-stone-700">
                {topic.category}
              </span>
            )}
            {topic.priority && (
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                topic.priority === "high"
                  ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-800"
                  : topic.priority === "medium"
                    ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-800"
                    : "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:ring-stone-700"
              }`}>
                {topic.priority} priority
              </span>
            )}
          </div>
        )}
      </div>

      <ArtifactTabs
        artifacts={topic.artifacts}
        currentStage={topic.currentStage}
        revisionRound={topic.revisionRound}
      />
    </div>
  );
}
