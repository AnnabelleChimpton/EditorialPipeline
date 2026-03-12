"use client";

import { useState } from "react";
import type { Stage } from "@/lib/data";
import { MarkdownViewer } from "./markdown-viewer";

type ArtifactKey = "card" | "dossier" | "brief" | "draft" | "qa" | "revision";

interface ArtifactTabsProps {
  artifacts: Record<string, string | undefined>;
  currentStage: Stage;
  revisionRound?: number;
}

const stageOrder: { key: Stage; label: string; artifactKey?: ArtifactKey }[] = [
  { key: "queued", label: "Queued" },
  { key: "card", label: "Card", artifactKey: "card" },
  { key: "dossier", label: "Dossier", artifactKey: "dossier" },
  { key: "brief", label: "Brief", artifactKey: "brief" },
  { key: "draft", label: "Draft", artifactKey: "draft" },
  { key: "qa-failed", label: "QA", artifactKey: "qa" },
  { key: "revision", label: "Rev", artifactKey: "revision" },
  { key: "done", label: "Done" },
];

const tabDefs: { key: ArtifactKey; label: string }[] = [
  { key: "card", label: "Card" },
  { key: "dossier", label: "Dossier" },
  { key: "brief", label: "Brief" },
  { key: "draft", label: "Draft" },
  { key: "qa", label: "QA" },
  { key: "revision", label: "Draft (Revised)" },
];

function pickDefaultTab(artifacts: Record<string, string | undefined>): ArtifactKey {
  const preference: ArtifactKey[] = ["revision", "qa", "draft", "brief", "dossier", "card"];
  return preference.find((k) => artifacts[k]) ?? "card";
}

export function ArtifactTabs({ artifacts, currentStage, revisionRound }: ArtifactTabsProps) {
  const available = tabDefs.filter((t) => artifacts[t.key]);
  const [activeTab, setActiveTab] = useState<ArtifactKey>(() => pickDefaultTab(artifacts));

  const resolvedTab = artifacts[activeTab] ? activeTab : pickDefaultTab(artifacts);
  if (resolvedTab !== activeTab) setActiveTab(resolvedTab);

  const currentStageIdx = stageOrder.findIndex((s) => s.key === currentStage);

  function tabLabel(tab: (typeof tabDefs)[number]): string {
    if (tab.key === "revision") {
      return revisionRound ? `Draft (Revised, R${revisionRound})` : "Draft (Revised)";
    }
    return tab.label;
  }

  function handleStepClick(stage: (typeof stageOrder)[number]) {
    if (stage.artifactKey && artifacts[stage.artifactKey]) {
      setActiveTab(stage.artifactKey);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Progress stepper */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {stageOrder.map((stage, i) => {
            const completed = i < currentStageIdx;
            const current = i === currentStageIdx;
            const clickable = stage.artifactKey != null && artifacts[stage.artifactKey] != null;
            const viewing = clickable && stage.artifactKey === activeTab;

            return (
              <div key={stage.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => handleStepClick(stage)}
                    aria-label={`${stage.label}${clickable ? " — view artifact" : ""}`}
                    aria-current={current ? "step" : undefined}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                      completed && clickable
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 hover:ring-2 hover:ring-emerald-300 dark:hover:ring-emerald-700 cursor-pointer"
                        : completed
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                          : current
                            ? "bg-sky-500 text-white shadow-sm" + (clickable ? " hover:bg-sky-600 cursor-pointer" : "")
                            : "bg-stone-100 text-stone-400 dark:bg-stone-700 dark:text-stone-500",
                      viewing ? "ring-2 ring-sky-400 dark:ring-sky-500" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {completed ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </button>
                  <span className={`text-[11px] font-medium whitespace-nowrap ${
                    i <= currentStageIdx
                      ? "text-stone-700 dark:text-stone-300"
                      : "text-stone-400 dark:text-stone-600"
                  }`}>
                    {stage.label}
                  </span>
                </div>
                {i < stageOrder.length - 1 && (
                  <div className={`mx-1.5 h-0.5 flex-1 rounded ${
                    i < currentStageIdx
                      ? "bg-emerald-200 dark:bg-emerald-800"
                      : "bg-stone-200 dark:bg-stone-700"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabbed artifact viewer */}
      {available.length > 0 ? (
        <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-sm overflow-hidden">
          <div className="flex gap-1 px-3 pt-3 pb-0 overflow-x-auto" role="tablist">
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
                    "rounded-t-md px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    selected
                      ? "bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-b-0 border-stone-200 dark:border-stone-700"
                      : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/50",
                  ].join(" ")}
                >
                  {tabLabel(tab)}
                </button>
              );
            })}
          </div>
          <div className="border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-6 py-6 min-h-[16rem]" role="tabpanel">
            <MarkdownViewer content={artifacts[activeTab]!} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 py-12 text-center text-sm text-stone-400 dark:text-stone-500">
          No artifacts yet
        </div>
      )}
    </div>
  );
}
