"use client";

import Link from "next/link";
import type { PipelineItem } from "@/lib/data";
import { getManifest, getBadgeStyle } from "@/lib/manifest";
import { CopyButton } from "./copy-button";

export function ReadyTopicRow({ topic }: { topic: PipelineItem }) {
  const manifest = getManifest();
  const finalDraft = topic.artifacts.revision || topic.artifacts.draft || "";
  const subtitle = manifest.subtitleField
    ? (topic.meta[manifest.subtitleField] as string | undefined)
    : undefined;
  const priorityVal = topic.meta[manifest.priority.field] as string | undefined;

  return (
    <div className="rounded-xl border border-stone-200 border-l-2 border-l-emerald-400 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-stone-400">{topic.id}</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Ready
            </span>
            {manifest.metadata.filter((mf) => mf.badge).map((mf) => {
              const val = topic.meta[mf.field] as string | undefined;
              if (!val) return null;
              const color = mf.colors?.[val];
              return (
                <span
                  key={mf.field}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${getBadgeStyle(color)}`}
                >
                  {val} {mf.label.toLowerCase()}
                </span>
              );
            })}
            {priorityVal && manifest.priority.sortOrder.indexOf(priorityVal) < manifest.priority.sortOrder.length - 1 && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${getBadgeStyle(manifest.priority.colors[priorityVal])}`}
              >
                {priorityVal}
              </span>
            )}
          </div>
          <Link
            href={`/topics/${topic.id}`}
            className="text-base font-medium text-stone-900 hover:text-stone-600 transition-colors"
          >
            {topic.title}
          </Link>
          {subtitle && (
            <p className="mt-1.5 text-sm text-stone-500 italic border-l-2 border-stone-200 pl-3 line-clamp-2">{subtitle}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {manifest.metadata.filter((mf) => !mf.badge).map((mf) => {
              const val = topic.meta[mf.field] as string | undefined;
              if (!val) return null;
              return (
                <span key={mf.field} className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
                  {val}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {finalDraft && <CopyButton text={finalDraft} label="Copy Draft" />}
          <Link
            href={`/topics/${topic.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors"
          >
            View
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
