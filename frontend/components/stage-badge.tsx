import type { Stage } from "@/lib/data";

const stageStyles: Record<Stage, { badge: string; dot: string }> = {
  queued: { badge: "bg-stone-100 text-stone-600 ring-stone-200", dot: "bg-stone-400" },
  card: { badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-400" },
  dossier: { badge: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-400" },
  brief: { badge: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200", dot: "bg-fuchsia-400" },
  draft: { badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-400" },
  "qa-failed": { badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-400" },
  revision: { badge: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-400" },
  done: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-400" },
};

const stageLabels: Record<Stage, string> = {
  queued: "Up Next",
  card: "Card",
  dossier: "Dossier",
  brief: "Brief",
  draft: "Draft",
  "qa-failed": "Needs Review",
  revision: "Revised",
  done: "Ready",
};

export function StageBadge({ stage }: { stage: Stage }) {
  const style = stageStyles[stage];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {stageLabels[stage]}
    </span>
  );
}
