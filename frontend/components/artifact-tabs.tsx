"use client";

import { useState } from "react";
import type { Stage } from "@/lib/data";
import { MarkdownViewer } from "./markdown-viewer";
import { CopyButton } from "./copy-button";

type ArtifactKey = "card" | "dossier" | "brief" | "draft" | "qa" | "revision";

interface ArtifactTabsProps {
  artifacts: Record<string, string | undefined>;
  currentStage: Stage;
  revisionRound?: number;
  qaStatus?: "approved" | "needs-edits";
  artifactTimestamps?: Record<string, string>;
}

const stageOrder: { key: Stage; label: string; artifactKey?: ArtifactKey }[] = [
  { key: "queued", label: "Up Next" },
  { key: "card", label: "Card", artifactKey: "card" },
  { key: "dossier", label: "Dossier", artifactKey: "dossier" },
  { key: "brief", label: "Brief", artifactKey: "brief" },
  { key: "draft", label: "Draft", artifactKey: "draft" },
  { key: "qa-failed", label: "Review", artifactKey: "qa" },
  { key: "revision", label: "Revised", artifactKey: "revision" },
  { key: "done", label: "Ready" },
];

const tabDefs: { key: ArtifactKey; label: string }[] = [
  { key: "card", label: "Card" },
  { key: "dossier", label: "Dossier" },
  { key: "brief", label: "Brief" },
  { key: "draft", label: "Draft" },
  { key: "qa", label: "Editor Review" },
  { key: "revision", label: "Draft (Revised)" },
];

function pickDefaultTab(artifacts: Record<string, string | undefined>): ArtifactKey {
  const preference: ArtifactKey[] = ["revision", "qa", "draft", "brief", "dossier", "card"];
  return preference.find((k) => artifacts[k]) ?? "card";
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ArtifactTabs({ artifacts, currentStage, revisionRound, qaStatus, artifactTimestamps }: ArtifactTabsProps) {
  const available = tabDefs.filter((t) => artifacts[t.key]);
  const [activeTab, setActiveTab] = useState<ArtifactKey>(() => pickDefaultTab(artifacts));
  const hasBothRevAndQa = !!(artifacts.revision && artifacts.qa);
  const [splitView, setSplitView] = useState(hasBothRevAndQa);

  const resolvedTab = artifacts[activeTab] ? activeTab : pickDefaultTab(artifacts);
  if (resolvedTab !== activeTab) setActiveTab(resolvedTab);

  const currentStageIdx = stageOrder.findIndex((s) => s.key === currentStage);

  function tabLabel(tab: (typeof tabDefs)[number]): string {
    if (tab.key === "revision") {
      return revisionRound ? `Draft (Revised, Rev ${revisionRound})` : "Draft (Revised)";
    }
    return tab.label;
  }

  function handleStepClick(stage: (typeof stageOrder)[number]) {
    if (stage.artifactKey && artifacts[stage.artifactKey]) {
      setActiveTab(stage.artifactKey);
    }
  }

  const showSplitView = splitView && activeTab === "revision" && artifacts.qa;

  return (
    <div className="flex flex-col gap-5">
      {/* Progress stepper */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {stageOrder.map((stage, i) => {
            const completed = i < currentStageIdx;
            const current = i === currentStageIdx;
            const clickable = stage.artifactKey != null && artifacts[stage.artifactKey] != null;
            const viewing = clickable && stage.artifactKey === activeTab;
            const isQaStep = stage.key === "qa-failed";
            const qaWarning = isQaStep && qaStatus === "needs-edits";
            const qaApproved = isQaStep && qaStatus === "approved";
            const timestampKey = stage.artifactKey;
            const timestamp = timestampKey && artifactTimestamps?.[timestampKey];

            return (
              <div key={stage.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => handleStepClick(stage)}
                    aria-label={`${stage.label}${clickable ? " — view document" : ""}`}
                    aria-current={current ? "step" : undefined}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                      qaWarning && (completed || current)
                        ? "bg-red-100 text-red-700 hover:ring-2 hover:ring-red-300 cursor-pointer"
                        : qaApproved && (completed || current)
                          ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300/50 hover:ring-emerald-400 cursor-pointer"
                          : completed && clickable
                            ? "bg-emerald-100 text-emerald-700 hover:ring-2 hover:ring-emerald-300 cursor-pointer"
                            : completed
                              ? "bg-emerald-100 text-emerald-700"
                              : current
                                ? "bg-sky-500 text-white shadow-sm" + (clickable ? " hover:bg-sky-600 cursor-pointer" : "")
                                : "bg-stone-100 text-stone-400",
                      viewing ? "ring-2 ring-sky-400" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {qaWarning && (completed || current) ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                    ) : completed ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </button>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${
                    i <= currentStageIdx
                      ? "text-stone-700"
                      : "text-stone-400"
                  }`}>
                    {stage.label}
                  </span>
                  {completed && timestamp && (
                    <span className="text-[10px] text-stone-400">
                      {formatRelativeTime(timestamp)} ago
                    </span>
                  )}
                </div>
                {i < stageOrder.length - 1 && (
                  <div className={`mx-1.5 h-0.5 flex-1 rounded ${
                    i < currentStageIdx
                      ? "bg-emerald-200"
                      : "bg-stone-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabbed artifact viewer */}
      {available.length > 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-1 px-3 pt-3 pb-0 overflow-x-auto border-b border-stone-200" role="tablist">
            {available.map((tab) => {
              const selected = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors -mb-px border-b-2",
                    selected
                      ? "border-sky-500 text-stone-900"
                      : "border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-300",
                  ].join(" ")}
                >
                  {tabLabel(tab)}
                </button>
              );
            })}
            {hasBothRevAndQa && activeTab === "revision" && (
              <button
                type="button"
                onClick={() => setSplitView(!splitView)}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors whitespace-nowrap"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15M4.5 4.5h15v15h-15z" />
                </svg>
                {splitView ? "Single view" : "Compare with Review"}
              </button>
            )}
          </div>

          {showSplitView ? (
            <div className="flex divide-x divide-stone-200 min-h-[16rem]" role="tabpanel">
              {/* Left: QA report */}
              <div className="flex-1 overflow-y-auto max-h-[70vh] bg-red-50/30 px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Editor Review</h3>
                  <CopyButton text={artifacts.qa!} />
                </div>
                <MarkdownViewer content={artifacts.qa!} />
              </div>
              {/* Right: Revised draft */}
              <div className="flex-1 overflow-y-auto max-h-[70vh] bg-stone-50 px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    {tabLabel(available.find((t) => t.key === "revision")!)}
                  </h3>
                  <CopyButton text={artifacts.revision!} />
                </div>
                <MarkdownViewer content={artifacts.revision!} />
              </div>
            </div>
          ) : (
            <div className="bg-stone-50 px-6 py-5 min-h-[16rem]" role="tabpanel">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  {tabLabel(available.find((t) => t.key === activeTab)!)}
                </h3>
                <CopyButton text={artifacts[activeTab]!} />
              </div>
              <MarkdownViewer content={artifacts[activeTab]!} />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white/50 py-12 text-center">
          <svg className="h-8 w-8 text-stone-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p className="text-sm font-medium text-stone-500">No documents yet</p>
          <p className="mt-1 text-xs text-stone-400">Documents will appear as this story moves through the workflow</p>
        </div>
      )}
    </div>
  );
}
