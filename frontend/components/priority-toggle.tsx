"use client";

import { useState } from "react";

export function PriorityToggle({
  topicId,
  isPrioritized: initialPrioritized,
}: {
  topicId: string;
  isPrioritized: boolean;
}) {
  const [active, setActive] = useState(initialPrioritized);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !active;
    setActive(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/priority/${topicId}`, {
        method: next ? "PUT" : "DELETE",
      });
      if (!res.ok) setActive(!next);
    } catch {
      setActive(!next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={active ? "Remove from priority queue" : "Add to priority queue"}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors ${
        active
          ? "bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100"
          : "bg-stone-50 text-stone-500 ring-stone-200 hover:bg-stone-100"
      } ${loading ? "opacity-50" : ""}`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
      {active ? "Prioritized" : "Prioritize"}
    </button>
  );
}
