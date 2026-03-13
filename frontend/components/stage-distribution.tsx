import type { StageDistribution, Stage } from "@/lib/data";

const stageColors: Record<Stage, string> = {
  queued: "bg-stone-300",
  card: "bg-sky-400",
  dossier: "bg-violet-400",
  brief: "bg-fuchsia-400",
  draft: "bg-amber-400",
  "qa-failed": "bg-red-400",
  revision: "bg-orange-400",
  done: "bg-emerald-400",
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

export function StageDistributionBar({ distribution }: { distribution: StageDistribution[] }) {
  const total = distribution.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return null;

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden bg-stone-100">
        {distribution.map((d) => {
          if (d.count === 0) return null;
          const pct = (d.count / total) * 100;
          return (
            <div
              key={d.stage}
              className={`${stageColors[d.stage]} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${stageLabels[d.stage]}: ${d.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {distribution.map((d) => {
          if (d.count === 0) return null;
          return (
            <div key={d.stage} className="flex items-center gap-1.5 text-xs text-stone-600">
              <span className={`h-2 w-2 rounded-full ${stageColors[d.stage]}`} />
              <span>{stageLabels[d.stage]}</span>
              <span className="font-semibold text-stone-800">{d.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
