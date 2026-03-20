import type { PipelineItem } from "./data";
import type { PipelineManifest } from "./manifest-types";

export interface FilterParams {
  search?: string;
  stage?: string;
  [key: string]: string | undefined;
}

export function filterTopics(
  topics: PipelineItem[],
  filters: FilterParams,
  manifest?: PipelineManifest
): PipelineItem[] {
  return topics.filter((t) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const subtitleField = manifest?.subtitleField;
      const subtitle = subtitleField ? (t.meta[subtitleField] as string) || "" : "";
      const metaFields = manifest?.metadata ?? [];
      const searchable = [
        t.title,
        t.id,
        subtitle,
        ...metaFields.map((mf) => (t.meta[mf.field] as string) || ""),
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
