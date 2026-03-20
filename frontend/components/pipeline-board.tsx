"use client";

import { useRef, useState } from "react";
import type { PipelineItem, Stage } from "@/lib/data";
import type { FilterGroup, PipelineManifest } from "@/lib/manifest-types";
import { TopicCard } from "./topic-card";
import { FilterBar } from "./filter-bar";
import { filterTopics } from "@/lib/filters";

const columns: { key: Stage; label: string; stages: Stage[]; accent: string }[] = [
  { key: "queued", label: "Up Next", stages: ["queued"], accent: "bg-stone-400" },
  { key: "card", label: "Card", stages: ["card"], accent: "bg-sky-400" },
  { key: "dossier", label: "Dossier", stages: ["dossier"], accent: "bg-violet-400" },
  { key: "brief", label: "Brief", stages: ["brief"], accent: "bg-fuchsia-400" },
  { key: "draft", label: "Draft", stages: ["draft"], accent: "bg-amber-400" },
  { key: "qa-failed", label: "Needs Review", stages: ["qa-failed"], accent: "bg-red-400" },
  { key: "revision", label: "Revised", stages: ["revision"], accent: "bg-orange-400" },
  { key: "done", label: "Ready", stages: ["done"], accent: "bg-emerald-400" },
];

const emptyMessages: Record<string, string> = {
  queued: "No incoming stories",
  card: "No stories being carded",
  dossier: "No dossiers in progress",
  brief: "No briefs in progress",
  draft: "No drafts in progress",
  "qa-failed": "All clear",
  revision: "No revisions needed",
  done: "No stories ready yet",
};

interface PipelineBoardProps {
  topics: PipelineItem[];
  filterGroups?: FilterGroup[];
  manifest: PipelineManifest;
  searchParams?: Record<string, string | string[] | undefined>;
  prioritizedIds?: string[];
  feedbackCounts?: Record<string, number>;
}

export function PipelineBoard({ topics, filterGroups, manifest, searchParams, prioritizedIds, feedbackCounts }: PipelineBoardProps) {
  const sortOrder = manifest.priority.sortOrder;
  function sortByPriority(items: PipelineItem[]): PipelineItem[] {
    return items.slice().sort((a, b) => {
      const av = a.meta[manifest.priority.field] as string | undefined;
      const bv = b.meta[manifest.priority.field] as string | undefined;
      const ai = av ? sortOrder.indexOf(av) : sortOrder.length;
      const bi = bv ? sortOrder.indexOf(bv) : sortOrder.length;
      return (ai === -1 ? sortOrder.length : ai) - (bi === -1 ? sortOrder.length : bi);
    });
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  // Extract active filters from URL params
  const activeFilters: Record<string, string | undefined> = { search };
  if (filterGroups) {
    for (const g of filterGroups) {
      const val = typeof searchParams?.[g.field] === "string" ? searchParams[g.field] as string : undefined;
      if (val) activeFilters[g.field] = val;
    }
  }

  const filtered = filterTopics(topics, activeFilters);

  const grouped = new Map<string, PipelineItem[]>();
  for (const col of columns) {
    grouped.set(col.key, []);
  }
  for (const topic of filtered) {
    for (const col of columns) {
      if (col.stages.includes(topic.currentStage)) {
        grouped.get(col.key)!.push(topic);
        break;
      }
    }
  }

  function scrollBoard(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    });
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search stories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 outline-none w-56 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {columns.map((col) => {
              const count = grouped.get(col.key)!.length;
              return (
                <div
                  key={col.key}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                    count === 0
                      ? "bg-stone-50 border-stone-100 text-stone-300"
                      : "bg-white border-stone-200 shadow-sm"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${col.accent} ${count === 0 ? "opacity-30" : ""}`} />
                  <span className={count === 0 ? "" : "text-stone-500"}>{col.label}</span>
                  <span className={count === 0 ? "" : "font-semibold text-stone-700"}>{count}</span>
                </div>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollBoard("left")}
              className="rounded-md p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              aria-label="Scroll board left"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollBoard("right")}
              className="rounded-md p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              aria-label="Scroll board right"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {filterGroups && filterGroups.length > 0 && (
          <FilterBar groups={filterGroups} />
        )}
      </div>

      <div
        ref={scrollRef}
        className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto pb-4 scroll-smooth kanban-scroll"
      >
        <div className="inline-flex gap-3 min-w-full">
          {columns.map((col) => {
            const sorted = sortByPriority(grouped.get(col.key)!);
            return (
              <div key={col.key} className="w-60 shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${col.accent}`} />
                  <h2 className="text-sm font-semibold text-stone-700 truncate">
                    {col.label}
                  </h2>
                  <span className="ml-auto rounded-full bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-500 tabular-nums">
                    {sorted.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {sorted.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      manifest={manifest}
                      isPrioritized={prioritizedIds?.includes(topic.id)}
                      feedbackCount={feedbackCounts?.[topic.id]}
                    />
                  ))}
                  {sorted.length === 0 && (
                    <div className="rounded-lg border border-dashed border-stone-200 py-8 text-center text-xs text-stone-400">
                      {emptyMessages[col.key] || "Empty"}
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
