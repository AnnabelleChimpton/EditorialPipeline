import Link from "next/link";
import type { Topic } from "@/lib/data";
import { StageBadge } from "./stage-badge";

const priorityStyles: Record<string, string> = {
  high: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-800",
  medium: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-800",
  low: "bg-stone-50 text-stone-600 ring-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:ring-stone-700",
};

export function QueueTable({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 py-12 text-center text-sm text-stone-400 dark:text-stone-500">
        No topics in the queue
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
            <th className="px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">ID</th>
            <th className="px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Topic</th>
            <th className="px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider max-w-[16rem]">Hook</th>
            <th className="px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Stage</th>
            <th className="px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Category</th>
            <th className="px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Era</th>
            <th className="px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Priority</th>
            <th className="px-4 py-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Sourceability</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
          {topics.map((topic) => (
            <tr
              key={topic.id}
              className={`hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors ${
                topic.currentStage === "done" ? "opacity-50" : ""
              }`}
            >
              <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                <Link
                  href={`/topics/${topic.id}`}
                  className="text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 font-medium transition-colors"
                >
                  {topic.id}
                </Link>
              </td>
              <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-200 max-w-[14rem] truncate">
                {topic.title}
              </td>
              <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 max-w-[16rem] truncate">
                {topic.hook || <span className="text-stone-300 dark:text-stone-600">&mdash;</span>}
              </td>
              <td className="px-4 py-3">
                <StageBadge stage={topic.currentStage} />
              </td>
              <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 max-w-[8rem] truncate">
                {topic.category || <span className="text-stone-300 dark:text-stone-600">&mdash;</span>}
              </td>
              <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                {topic.era || <span className="text-stone-300 dark:text-stone-600">&mdash;</span>}
              </td>
              <td className="px-4 py-3">
                {topic.priority ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      priorityStyles[topic.priority] ?? priorityStyles.low
                    }`}
                  >
                    {topic.priority}
                  </span>
                ) : (
                  <span className="text-xs text-stone-300 dark:text-stone-600">&mdash;</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400">
                {topic.sourceability || <span className="text-stone-300 dark:text-stone-600">&mdash;</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
