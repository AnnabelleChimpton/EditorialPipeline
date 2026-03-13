import Link from "next/link";
import type { ActivityEntry } from "@/lib/data";

const dotColor: Record<string, string> = {
  card: "bg-sky-400",
  deepdive: "bg-violet-400",
  brief: "bg-fuchsia-400",
  draft: "bg-amber-400",
  qa: "bg-red-400",
  revision: "bg-orange-400",
};

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-stone-400">No recent updates</p>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-4">
        {entries.map((entry, i) => (
          <li key={`${entry.id}-${entry.type}-${i}`} className="relative pb-4">
            {i < entries.length - 1 && (
              <span className="absolute left-[7px] top-5 -bottom-0 w-px bg-stone-100" />
            )}
            <div className="flex gap-3">
              <div className={`mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-white ${dotColor[entry.type] || "bg-stone-300"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-700">{entry.label}</p>
                <Link
                  href={`/topics/${entry.id}`}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors truncate block"
                >
                  {entry.topic}
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
