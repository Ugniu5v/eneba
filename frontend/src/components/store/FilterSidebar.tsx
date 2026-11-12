"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import type { Facet, FilterOptions } from "@/lib/types";
import {
  facetLabel,
  FILTER_GROUPS,
  type FilterKey,
} from "./filterConfig";

interface FilterSidebarProps {
  filters: FilterOptions | null;
  selected: Record<FilterKey, string[]>;
  onToggle: (key: FilterKey, value: string) => void;
  onClear: () => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onApplyPrice: () => void;
  priceError: string;
}

export function FilterSidebar({
  filters,
  selected,
  onToggle,
  onClear,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyPrice,
  priceError,
}: FilterSidebarProps) {
  const { t, language, currency, formatNumber } = usePreferences();
  const hasAnySelected =
    Object.values(selected).some((values) => values.length > 0) ||
    Boolean(minPrice || maxPrice);

  return (
    <div className="px-4 pb-4 pt-3.5">
      <div className="flex -mx-2 items-start justify-between gap-2 border-b border-white/12 px-2 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <SlidersHorizontal size={15} strokeWidth={1.8} aria-hidden="true" />
            {t("store.filters")}
          </h2>
          {filters ? (
            <p className="mt-1 text-[10px] text-white/40">
              {t("store.matching", { count: formatNumber(filters.matchingProducts) })}
            </p>
          ) : null}
        </div>
        {hasAnySelected ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[11px] font-bold text-eneba-yellow transition-colors hover:text-eneba-yellow-bright"
          >
            {t("common.clearAll")}
          </button>
        ) : null}
      </div>

      {!filters ? (
        <div className="space-y-5 py-5" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="skeleton h-3 w-24" />
              <div className="skeleton mt-3 h-3 w-full" />
              <div className="skeleton mt-2 h-3 w-4/5" />
              <div className="skeleton mt-2 h-3 w-3/5" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="-mx-2 border-b border-white/12 px-2 py-4">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/85">
              {t("filter.price")} ({currency})
            </h3>
            <div className="mt-3 flex items-center gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t("store.min")}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={minPrice}
                  onChange={(event) => onMinPriceChange(event.target.value)}
                  placeholder={t("store.min")}
                  className="field h-10 min-h-10 px-2.5 text-xs"
                />
              </label>
              <span className="shrink-0 text-white/30" aria-hidden="true">
                –
              </span>
              <label className="min-w-0 flex-1">
                <span className="sr-only">{t("store.max")}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={maxPrice}
                  onChange={(event) => onMaxPriceChange(event.target.value)}
                  placeholder={t("store.max")}
                  className="field h-10 min-h-10 px-2.5 text-xs"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={onApplyPrice}
              className="btn btn-secondary mt-2 h-9 min-h-9 w-full text-[11px]"
            >
              {t("common.apply")}
            </button>
            {priceError ? (
              <p className="mt-2 text-[11px] leading-4 text-[#ffada2]">{priceError}</p>
            ) : (
              <p className="mt-2 text-[10px] text-white/38">{t("filter.priceNote")}</p>
            )}
          </div>

          {FILTER_GROUPS.map((group) => (
            <FilterGroup
              key={group.key}
              title={t(group.titleKey)}
              items={(filters[group.pluralKey] as Facet[]) ?? []}
              selected={selected[group.key]}
              filterKey={group.key}
              language={language}
              onToggle={(value) => onToggle(group.key, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  items,
  selected,
  filterKey,
  language,
  onToggle,
}: {
  title: string;
  items: Facet[];
  selected: string[];
  filterKey: FilterKey;
  language: "en" | "lt";
  onToggle: (value: string) => void;
}) {
  const { t, formatNumber } = usePreferences();
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 6);

  return (
    <div className="border-b border-white/12 py-3.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/85">
          {title}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={1.8}
          aria-hidden="true"
          className={`text-white/48 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="mt-2">
          <ul className="space-y-0.5">
            {visible.map((item) => {
              const checked = selected.includes(item.value);
              const disabled = item.count === 0 && !checked;
              return (
                <li key={item.value}>
                  <label
                    className={`group flex items-center gap-2.5 py-1.5 text-[13px] transition-colors ${
                      disabled
                        ? "cursor-not-allowed text-white/28"
                        : "cursor-pointer text-white/70 hover:text-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggle(item.value)}
                      aria-label={`${facetLabel(filterKey, item, language)} (${formatNumber(item.count)})`}
                      className="size-[15px] shrink-0 cursor-pointer accent-[#fad318] disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {facetLabel(filterKey, item, language)}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums ${
                        item.count === 0 ? "text-white/20" : "text-white/32"
                      }`}
                    >
                      {formatNumber(item.count)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {items.length > 6 ? (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mt-2 text-[11px] font-bold text-eneba-yellow hover:underline"
            >
              {showAll ? t("filter.showLess") : t("filter.showAll", { count: items.length })}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
