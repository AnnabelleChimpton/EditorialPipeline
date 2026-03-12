"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="prose prose-stone prose-sm max-w-none">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
