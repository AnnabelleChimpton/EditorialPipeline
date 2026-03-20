import fs from "fs";
import path from "path";
import { WORKSPACE_ROOT } from "./paths";
import type { PipelineManifest } from "./manifest-types";

export type {
  BadgeColor,
  MetadataFieldDef,
  PriorityFieldDef,
  PipelineManifest,
  FilterGroup,
} from "./manifest-types";

export { BADGE_STYLES, DOT_STYLES, getBadgeStyle, getDotStyle } from "./manifest-types";

const DEFAULT_MANIFEST: PipelineManifest = {
  name: "Pipeline",
  titleField: "topic",
  subtitleField: "hook",
  priority: {
    field: "priority",
    label: "Priority",
    sortOrder: ["high", "medium", "low"],
    colors: { high: "red", medium: "amber", low: "stone" },
  },
  metadata: [
    { field: "era", label: "Era", filterable: true },
    { field: "category", label: "Category", filterable: true },
    {
      field: "sourceability",
      label: "Sources",
      badge: true,
      colors: { high: "emerald", medium: "amber", low: "stone" },
    },
  ],
};

let cached: PipelineManifest | null = null;

export function getManifest(): PipelineManifest {
  if (cached) return cached;
  const manifestPath = path.join(WORKSPACE_ROOT, "pipeline.manifest.json");
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    cached = { ...DEFAULT_MANIFEST, ...JSON.parse(raw) };
  } catch {
    cached = DEFAULT_MANIFEST;
  }
  return cached!;
}
