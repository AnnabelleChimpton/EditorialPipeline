"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { FilterGroup } from "@/lib/manifest-types";

interface FilterBarProps {
  groups: FilterGroup[];
}

export function FilterBar({ groups }: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const hasFilters = groups.some((g) => searchParams.get(g.field));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-stone-400 uppercase tracking-wider mr-1">Filter</span>

      {groups.map((group, gi) => {
        const active = searchParams.get(group.field) || "";
        return (
          <div key={group.field} className="contents">
            {gi > 0 && (
              <div className="h-4 w-px bg-stone-200" />
            )}
            {group.values.map((v) => (
              <button
                key={`${group.field}-${v}`}
                type="button"
                onClick={() => setFilter(group.field, active === v ? "" : v)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors max-w-[12rem] truncate ${
                  active === v
                    ? "bg-stone-800 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        );
      })}

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="ml-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      )}
    </div>
  );
}
