"use client";

import { useState } from "react";
import { MarkdownViewer } from "./markdown-viewer";

interface ArtifactViewerProps {
  label: string;
  content: string;
  defaultOpen?: boolean;
}

export function ArtifactViewer({
  label,
  content,
  defaultOpen = false,
}: ArtifactViewerProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-stone-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
      >
        <span>{label}</span>
        <svg
          className={`h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-5 py-5">
          <MarkdownViewer content={content} />
        </div>
      )}
    </div>
  );
}
