import Link from "next/link";
import type { PipelineItem } from "@/lib/data";
import type { PipelineManifest } from "@/lib/manifest-types";
import { getDotStyle } from "@/lib/manifest-types";
import { ProgressDots } from "./progress-dots";

const stageAccent: Record<string, string> = {
  queued: "border-l-stone-300",
  card: "border-l-sky-400",
  dossier: "border-l-violet-400",
  brief: "border-l-fuchsia-400",
  draft: "border-l-amber-400",
  "qa-failed": "border-l-red-400",
  revision: "border-l-orange-400",
  done: "border-l-emerald-400",
};

export function TopicCard({
  topic,
  manifest,
  isPrioritized,
  feedbackCount,
}: {
  topic: PipelineItem;
  manifest: PipelineManifest;
  isPrioritized?: boolean;
  feedbackCount?: number;
}) {
  const isQaFailed = topic.currentStage === "qa-failed";
  const priorityVal = topic.meta[manifest.priority.field] as string | undefined;
  const dotColor = priorityVal ? manifest.priority.colors[priorityVal] : undefined;
  const subtitle = manifest.subtitleField
    ? (topic.meta[manifest.subtitleField] as string | undefined)
    : undefined;

  return (
    <Link
      href={`/topics/${topic.id}`}
      className={`card-hover group block rounded-lg border-l-2 border border-stone-200 p-3 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        stageAccent[topic.currentStage] || "border-l-stone-300"
      } ${isQaFailed ? "ring-1 ring-red-100 bg-red-50/50" : ""}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] font-mono text-stone-400">
          {topic.id}
        </span>
        {dotColor && (
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${getDotStyle(dotColor)}`}
            title={`${priorityVal} ${manifest.priority.label.toLowerCase()}`}
          />
        )}
      </div>
      <p className="text-sm font-medium text-stone-800 leading-snug line-clamp-2">
        {topic.title}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-stone-500 leading-snug line-clamp-2">
          {subtitle}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <ProgressDots currentStage={topic.currentStage} />
        <div className="flex items-center gap-1.5">
          {isPrioritized && (
            <span className="text-violet-500" title="In priority queue">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </span>
          )}
          {feedbackCount && feedbackCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-sky-500" title={`${feedbackCount} feedback`}>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              <span className="text-[10px] font-medium">{feedbackCount}</span>
            </span>
          )}
          {topic.currentStage === "revision" && topic.revisionRound && (
            <span className="text-[11px] text-orange-600 font-medium">
              Rev {topic.revisionRound}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
