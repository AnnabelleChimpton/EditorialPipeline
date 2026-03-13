import Link from "next/link";
import type { PipelineItem } from "@/lib/data";
import { getManifest, getDotStyle } from "@/lib/manifest";
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

export function TopicCard({ topic }: { topic: PipelineItem }) {
  const manifest = getManifest();
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
        {topic.currentStage === "revision" && topic.revisionRound && (
          <span className="text-[11px] text-orange-600 font-medium">
            Rev {topic.revisionRound}
          </span>
        )}
      </div>
    </Link>
  );
}
