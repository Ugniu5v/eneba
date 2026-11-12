import type { Language } from "@/lib/i18n";
import { categoryLabel, genreLabel, regionLabel, translate } from "@/lib/i18n";
import type { Facet, FilterOptions } from "@/lib/types";

export type FilterKey = "category" | "platform" | "region" | "type" | "genre";
export type FilterFocus = FilterKey | "price";

export const FILTER_GROUPS: Array<{
  key: FilterKey;
  titleKey: string;
  pluralKey: keyof FilterOptions;
}> = [
  { key: "category", titleKey: "filter.category", pluralKey: "categories" },
  { key: "platform", titleKey: "filter.platform", pluralKey: "platforms" },
  { key: "region", titleKey: "filter.region", pluralKey: "regions" },
  { key: "type", titleKey: "filter.type", pluralKey: "types" },
  { key: "genre", titleKey: "filter.genre", pluralKey: "genres" },
];

export function facetLabel(key: FilterKey, item: Facet, language: Language): string {
  if (key === "category") return categoryLabel(language, item.label);
  if (key === "genre") return genreLabel(language, item.label);
  if (key === "region") return regionLabel(language, item.label);
  if (key === "type") {
    return translate(language, `type.${item.label}`, undefined, item.label);
  }
  return item.label;
}

export function normalizeFilterText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
