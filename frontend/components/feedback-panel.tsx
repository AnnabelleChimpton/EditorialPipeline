"use client";

import { useState } from "react";
import type { FeedbackEntry } from "@/lib/state";

const LANE_LABELS: Record<string, string> = {
  "*": "Global",
  brief: "Brief",
  draft: "Draft",
  qa: "Editor Review",
  revision: "Revision",
  "short-form": "Short Post",
};

export function FeedbackPanel({
  topicId,
  initialFeedback,
  lanes,
}: {
  topicId: string;
  initialFeedback: FeedbackEntry[];
  lanes: string[];
}) {
  const [entries, setEntries] = useState(initialFeedback);
  const [open, setOpen] = useState(initialFeedback.length > 0);
  const [lane, setLane] = useState(lanes[0] || "*");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisionNotice, setRevisionNotice] = useState<string | null>(null);

  async function addFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    const optimistic: FeedbackEntry = {
      id: topicId,
      lane,
      text: text.trim(),
      addedAt: new Date().toISOString(),
    };

    setEntries((prev) => [...prev, optimistic]);
    setText("");
    setError(null);
    setRevisionNotice(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: topicId, lane, text: optimistic.text }),
      });
      if (!res.ok) {
        setEntries((prev) => prev.filter((e) => e !== optimistic));
        setError("Failed to save feedback");
      } else {
        const saved = await res.json();
        // If the API remapped the lane (topic already past target), update the entry
        const savedEntry: FeedbackEntry = { id: saved.id, lane: saved.lane, text: saved.text, addedAt: saved.addedAt };
        setEntries((prev) => prev.map((e) => (e === optimistic ? savedEntry : e)));
        if (saved.forcedRevision) {
          setRevisionNotice(`Topic already past "${LANE_LABELS[lane] || lane}" — revision round queued with your feedback.`);
        }
      }
    } catch {
      setEntries((prev) => prev.filter((e) => e !== optimistic));
      setError("Failed to save feedback");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeFeedback(entry: FeedbackEntry) {
    setEntries((prev) => prev.filter((e) => e !== entry));
    try {
      const res = await fetch(
        `/api/feedback/${topicId}?lane=${encodeURIComponent(entry.lane)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setEntries((prev) => [...prev, entry]);
      }
    } catch {
      setEntries((prev) => [...prev, entry]);
    }
  }

  return (
    <div className="rounded-xl border border-sky-200/60 bg-sky-50/40 shadow-sm mb-8">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        <svg className="h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
        <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
          Feedback{entries.length > 0 ? ` (${entries.length})` : ""}
        </span>
        <svg
          className={`ml-auto h-4 w-4 text-sky-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((entry, i) => (
                <div key={`${entry.lane}-${entry.addedAt}-${i}`} className="flex items-start gap-2 rounded-lg bg-white/70 p-2.5 text-sm">
                  <span className="shrink-0 rounded-md bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
                    {LANE_LABELS[entry.lane] || entry.lane}
                  </span>
                  <span className="flex-1 text-stone-700 leading-snug">{entry.text}</span>
                  <button
                    type="button"
                    onClick={() => removeFeedback(entry)}
                    className="shrink-0 rounded p-0.5 text-stone-400 hover:text-red-500 transition-colors"
                    title="Remove feedback"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addFeedback} className="flex items-start gap-2">
            <select
              value={lane}
              onChange={(e) => setLane(e.target.value)}
              className="rounded-md border border-sky-200 bg-white px-2 py-1.5 text-xs text-stone-700 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 outline-none"
            >
              {lanes.map((l) => (
                <option key={l} value={l}>
                  {LANE_LABELS[l] || l}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add feedback..."
              className="flex-1 rounded-md border border-sky-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 placeholder:text-stone-400 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </form>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {revisionNotice && <p className="text-xs text-amber-600">{revisionNotice}</p>}
        </div>
      )}
    </div>
  );
}
