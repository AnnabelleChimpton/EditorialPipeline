import type { Stage } from "@/lib/data";

const stageDisplayNames: Record<Stage, string> = {
  queued: "Up Next",
  card: "Card",
  dossier: "Dossier",
  brief: "Brief",
  draft: "Draft",
  "qa-failed": "Needs Review",
  revision: "Revised",
  done: "Ready",
};

const stages: { key: Stage; color: string }[] = [
  { key: "card", color: "bg-sky-400" },
  { key: "dossier", color: "bg-violet-400" },
  { key: "brief", color: "bg-fuchsia-400" },
  { key: "draft", color: "bg-amber-400" },
  { key: "qa-failed", color: "bg-red-400" },
  { key: "revision", color: "bg-orange-400" },
  { key: "done", color: "bg-emerald-400" },
];

const stageIndex: Record<Stage, number> = {
  queued: -1,
  card: 0,
  dossier: 1,
  brief: 2,
  draft: 3,
  "qa-failed": 4,
  revision: 5,
  done: 6,
};

export function ProgressDots({ currentStage }: { currentStage: Stage }) {
  const current = stageIndex[currentStage];

  return (
    <div className="flex items-center gap-1" title={`Stage: ${stageDisplayNames[currentStage]}`}>
      {stages.map((s, i) => {
        const isCurrent = i === current;
        const isCompleted = i < current;
        const isFailed = currentStage === "qa-failed" && s.key === "qa-failed";
        return (
          <div
            key={s.key}
            className={`h-1.5 rounded-full transition-all ${
              isFailed
                ? "w-3 bg-red-400"
                : isCurrent
                  ? `w-3 ${s.color}`
                  : isCompleted
                    ? `w-1.5 ${s.color} opacity-60`
                    : "w-1.5 bg-stone-200"
            }`}
          />
        );
      })}
    </div>
  );
}
