import Link from "next/link";
import type { PipelineItem } from "@/lib/data";
import type { PipelineManifest } from "@/lib/manifest-types";
import { StageBadge } from "./stage-badge";

export function AttentionList({ topics, manifest }: { topics: PipelineItem[]; manifest: PipelineManifest }) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-600">All clear</p>
        <p className="mt-1 text-xs text-stone-400">Nothing needs your attention right now</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-stone-100">
      {topics.map((topic) => {
        const priorityVal = topic.meta[manifest.priority.field] as string | undefined;
        const isTopPriority = priorityVal === manifest.priority.sortOrder[0];
        return (
          <Link
            key={topic.id}
            href={`/topics/${topic.id}`}
            className="flex items-center gap-3 py-3 px-1 hover:bg-stone-50 rounded-lg transition-colors -mx-1"
          >
            <StageBadge stage={topic.currentStage} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-800 truncate">{topic.title}</p>
              <p className="text-xs text-stone-400 truncate">{topic.id}</p>
            </div>
            {topic.qaStatus === "needs-edits" && (
              <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 ring-1 ring-inset ring-red-100">
                Needs Revision
              </span>
            )}
            {isTopPriority && topic.qaStatus !== "needs-edits" && (
              <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 ring-1 ring-inset ring-red-100">
                {priorityVal}
              </span>
            )}
            {topic.revisionRound && (
              <span className="shrink-0 text-xs text-orange-500 font-medium">
                Rev {topic.revisionRound}
              </span>
            )}
            <svg className="h-4 w-4 shrink-0 text-stone-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
