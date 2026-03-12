import Link from "next/link";
import type { Topic } from "@/lib/data";

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
};

export function TopicCard({ topic }: { topic: Topic }) {
  const isQaFailed = topic.currentStage === "qa-failed";
  const dotColor = topic.priority ? priorityDot[topic.priority] : undefined;

  return (
    <Link
      href={`/topics/${topic.id}`}
      className={`group block rounded-lg border p-3 shadow-sm transition-all hover:shadow-md ${
        isQaFailed
          ? "border-red-300 bg-red-50 hover:border-red-400 dark:border-red-800 dark:bg-red-950/60 dark:hover:border-red-700"
          : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-stone-600"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500">
          {topic.id}
        </span>
        {dotColor && (
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`}
            title={`${topic.priority} priority`}
          />
        )}
      </div>
      <p className="text-sm font-medium text-stone-800 dark:text-stone-100 leading-snug line-clamp-3">
        {topic.title}
      </p>
      {topic.hook && (
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-snug line-clamp-2">
          {topic.hook}
        </p>
      )}
      {topic.currentStage === "revision" && topic.revisionRound && (
        <span className="mt-1.5 inline-block text-xs text-orange-600 dark:text-orange-400 font-medium">
          Round {topic.revisionRound}
        </span>
      )}
    </Link>
  );
}
