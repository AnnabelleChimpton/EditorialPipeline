import type { Stage } from "@/lib/data";

const stageStyles: Record<Stage, string> = {
  queued: "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:ring-stone-700",
  card: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:ring-sky-800",
  dossier: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:ring-violet-800",
  brief: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-400 dark:ring-fuchsia-800",
  draft: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-800",
  "qa-failed": "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-400 dark:ring-red-800",
  revision: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:ring-orange-800",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-800",
};

const stageLabels: Record<Stage, string> = {
  queued: "Queued",
  card: "Card",
  dossier: "Dossier",
  brief: "Brief",
  draft: "Draft",
  "qa-failed": "QA Failed",
  revision: "Revision",
  done: "Done",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${stageStyles[stage]}`}
    >
      {stageLabels[stage]}
    </span>
  );
}
