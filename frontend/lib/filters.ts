import { getManifest } from "./manifest";
import type { PipelineItem } from "./data";

export interface FilterParams {
  search?: string;
  stage?: string;
  [key: string]: string | undefined;
}

export function filterTopics(topics: PipelineItem[], filters: FilterParams): PipelineItem[] {
  const manifest = getManifest();

  return topics.filter((t) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const subtitle = manifest.subtitleField
        ? (t.meta[manifest.subtitleField] as string) || ""
        : "";
      const searchable = [
        t.title,
        t.id,
        subtitle,
        ...manifest.metadata.map((mf) => (t.meta[mf.field] as string) || ""),
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    if (filters.stage && t.currentStage !== filters.stage) return false;

    // Check all other filter params against meta
    for (const [key, val] of Object.entries(filters)) {
      if (key === "search" || key === "stage" || !val) continue;
      if ((t.meta[key] as string) !== val) return false;
    }

    return true;
  });
}
