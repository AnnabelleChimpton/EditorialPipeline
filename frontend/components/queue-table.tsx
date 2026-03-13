"use client";

import { useState } from "react";
import Link from "next/link";
import type { PipelineItem } from "@/lib/data";
import type { FilterGroup, MetadataFieldDef, PipelineManifest } from "@/lib/manifest";
import { getBadgeStyle } from "@/lib/manifest";
import { StageBadge } from "./stage-badge";
import { ProgressDots } from "./progress-dots";
import { FilterBar } from "./filter-bar";
import { filterTopics } from "@/lib/filters";

interface QueueTableProps {
  topics: PipelineItem[];
  filterGroups?: FilterGroup[];
  manifest: PipelineManifest;
  searchParams?: Record<string, string | string[] | undefined>;
}

function MetaBadge({ value, fieldDef }: { value: string; fieldDef: MetadataFieldDef }) {
  if (fieldDef.badge && fieldDef.colors) {
    const color = fieldDef.colors[value];
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getBadgeStyle(color)}`}>
        {value}
      </span>
    );
  }
  return <span className="text-xs text-stone-500 truncate">{value}</span>;
}

function PriorityBadge({ value, manifest }: { value: string; manifest: PipelineManifest }) {
  const color = manifest.priority.colors[value];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getBadgeStyle(color)}`}>
      {value}
    </span>
  );
}

function TopicRow({ topic, manifest }: { topic: PipelineItem; manifest: PipelineManifest }) {
  const subtitle = manifest.subtitleField
    ? (topic.meta[manifest.subtitleField] as string | undefined)
    : undefined;
  const priorityVal = topic.meta[manifest.priority.field] as string | undefined;

  return (
    <tr className="hover:bg-stone-50/50 transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/topics/${topic.id}`}
          className="text-stone-800 hover:text-sky-600 font-medium transition-colors"
        >
          {topic.title}
        </Link>
        <p className="text-[11px] font-mono text-stone-400 mt-0.5">{topic.id}</p>
      </td>
      {manifest.subtitleField && (
        <td className="px-4 py-3 text-xs text-stone-500 max-w-[16rem] truncate">
          {subtitle || <span className="text-stone-300">&mdash;</span>}
        </td>
      )}
      <td className="px-4 py-3">
        <StageBadge stage={topic.currentStage} />
      </td>
      <td className="px-4 py-3">
        <ProgressDots currentStage={topic.currentStage} />
      </td>
      {manifest.metadata.map((mf) => {
        const val = topic.meta[mf.field] as string | undefined;
        return (
          <td key={mf.field} className="px-4 py-3 max-w-[10rem] truncate">
            {val ? (
              <MetaBadge value={val} fieldDef={mf} />
            ) : (
              <span className="text-xs text-stone-300">&mdash;</span>
            )}
          </td>
        );
      })}
      <td className="px-4 py-3">
        {priorityVal ? (
          <PriorityBadge value={priorityVal} manifest={manifest} />
        ) : (
          <span className="text-xs text-stone-300">&mdash;</span>
        )}
      </td>
    </tr>
  );
}

export function QueueTable({ topics, filterGroups, manifest, searchParams }: QueueTableProps) {
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
  const active = filtered.filter((t) => t.currentStage !== "done");
  const completed = filtered.filter((t) => t.currentStage === "done");
  const [showCompleted, setShowCompleted] = useState(false);

  if (topics.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-200 bg-white/50 py-12 text-center">
        <p className="text-sm font-medium text-stone-500">No stories yet</p>
        <p className="mt-1 text-xs text-stone-400">Stories will appear here as they are assigned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search stories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 outline-none transition-colors"
          />
        </div>
        {filterGroups && filterGroups.length > 0 && (
          <FilterBar groups={filterGroups} />
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white/50 py-12 text-center">
          <p className="text-sm font-medium text-stone-500">No stories match your search</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    {manifest.titleField.charAt(0).toUpperCase() + manifest.titleField.slice(1)}
                  </th>
                  {manifest.subtitleField && (
                    <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider max-w-[16rem]">
                      {manifest.subtitleField.charAt(0).toUpperCase() + manifest.subtitleField.slice(1)}
                    </th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Stage</th>
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Progress</th>
                  {manifest.metadata.map((mf) => (
                    <th key={mf.field} className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      {mf.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    {manifest.priority.label}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {active.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} manifest={manifest} />
                ))}
              </tbody>
            </table>
          </div>

          {completed.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-3"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${showCompleted ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                Ready to Publish ({completed.length})
              </button>
              {showCompleted && (
                <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm opacity-75">
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y divide-stone-50">
                      {completed.map((topic) => (
                        <TopicRow key={topic.id} topic={topic} manifest={manifest} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
