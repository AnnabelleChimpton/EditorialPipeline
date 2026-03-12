"use client";

import { useRef } from "react";
import type { Topic, Stage } from "@/lib/data";
import { TopicCard } from "./topic-card";

const priorityWeight: Record<string, number> = { high: 0, medium: 1, low: 2 };

const columns: { key: Stage; label: string; stages: Stage[]; accent: string }[] = [
  { key: "queued", label: "Queued", stages: ["queued"], accent: "bg-stone-400" },
  { key: "card", label: "Card", stages: ["card"], accent: "bg-sky-400" },
  { key: "dossier", label: "Dossier", stages: ["dossier"], accent: "bg-violet-400" },
  { key: "brief", label: "Brief", stages: ["brief"], accent: "bg-fuchsia-400" },
  { key: "draft", label: "Draft", stages: ["draft"], accent: "bg-amber-400" },
  { key: "qa-failed", label: "QA Failed", stages: ["qa-failed"], accent: "bg-red-400" },
  { key: "revision", label: "Revision", stages: ["revision"], accent: "bg-orange-400" },
  { key: "done", label: "Done", stages: ["done"], accent: "bg-emerald-400" },
];

function sortByPriority(topics: Topic[]): Topic[] {
  return topics.slice().sort(
    (a, b) =>
      (priorityWeight[a.priority || "low"] ?? 3) -
      (priorityWeight[b.priority || "low"] ?? 3),
  );
}

export function PipelineBoard({ topics }: { topics: Topic[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const grouped = new Map<string, Topic[]>();
  for (const col of columns) {
    grouped.set(col.key, []);
  }
  for (const topic of topics) {
    for (const col of columns) {
      if (col.stages.includes(topic.currentStage)) {
        grouped.get(col.key)!.push(topic);
        break;
      }
    }
  }

  function scrollBoard(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -260 : 260,
      behavior: "smooth",
    });
  }

  return (
    <>
      {/* Summary stats + scroll controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-4 py-2.5 shadow-sm">
          <span className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{topics.length}</span>
          <span className="ml-1.5 text-sm text-stone-500 dark:text-stone-400">topics</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {columns.map((col) => {
            const count = grouped.get(col.key)!.length;
            return (
              <div
                key={col.key}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs shadow-sm ${
                  count === 0
                    ? "bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-800 text-stone-300 dark:text-stone-600"
                    : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${col.accent} ${count === 0 ? "opacity-30" : ""}`} />
                <span className={count === 0 ? "" : "text-stone-500 dark:text-stone-400"}>{col.label}</span>
                <span className={count === 0 ? "" : "font-semibold text-stone-700 dark:text-stone-200"}>{count}</span>
              </div>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollBoard("left")}
            className="rounded-md p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-300 dark:hover:bg-stone-800 transition-colors"
            aria-label="Scroll board left"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollBoard("right")}
            className="rounded-md p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-300 dark:hover:bg-stone-800 transition-colors"
            aria-label="Scroll board right"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div
        ref={scrollRef}
        className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto pb-4 scroll-smooth"
      >
        <div className="inline-flex gap-3 min-w-full">
          {columns.map((col) => {
            const sorted = sortByPriority(grouped.get(col.key)!);
            return (
              <div key={col.key} className="w-56 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${col.accent}`} />
                  <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 truncate">
                    {col.label}
                  </h2>
                  <span className="ml-auto rounded-full bg-stone-100 dark:bg-stone-700 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
                    {sorted.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {sorted.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} />
                  ))}
                  {sorted.length === 0 && (
                    <div className="rounded-lg border border-dashed border-stone-200 dark:border-stone-700 py-8 text-center text-xs text-stone-400 dark:text-stone-600">
                      None
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
