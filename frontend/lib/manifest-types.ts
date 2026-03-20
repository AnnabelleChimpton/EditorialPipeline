export type BadgeColor =
  | "red"
  | "amber"
  | "emerald"
  | "stone"
  | "sky"
  | "violet"
  | "orange"
  | "fuchsia";

export const BADGE_STYLES: Record<BadgeColor, string> = {
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  stone: "bg-stone-50 text-stone-600 ring-stone-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  fuchsia: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
};

export const DOT_STYLES: Record<BadgeColor, string> = {
  red: "bg-red-500",
  amber: "bg-amber-400",
  emerald: "bg-emerald-500",
  stone: "bg-stone-400",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  fuchsia: "bg-fuchsia-500",
};

export interface MetadataFieldDef {
  field: string;
  label: string;
  filterable?: boolean;
  badge?: boolean;
  colors?: Record<string, BadgeColor>;
}

export interface PriorityFieldDef {
  field: string;
  label: string;
  sortOrder: string[];
  colors: Record<string, BadgeColor>;
}

export interface PipelineManifest {
  name: string;
  titleField: string;
  subtitleField?: string;
  priority: PriorityFieldDef;
  metadata: MetadataFieldDef[];
}

export interface FilterGroup {
  field: string;
  label: string;
  values: string[];
}

export function getBadgeStyle(color: BadgeColor | undefined): string {
  return color ? (BADGE_STYLES[color] ?? BADGE_STYLES.stone) : BADGE_STYLES.stone;
}

export function getDotStyle(color: BadgeColor | undefined): string {
  return color ? (DOT_STYLES[color] ?? DOT_STYLES.stone) : DOT_STYLES.stone;
}
