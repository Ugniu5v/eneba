"use client";

import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import type { Facet, FilterOptions } from "@/lib/types";
import {
  facetLabel,
  FILTER_GROUPS,
  normalizeFilterText,
  type FilterFocus,
  type FilterKey,
} from "./filterConfig";

export interface FilterBarPrice {
  currency: string;
  min: string;
  max: string;
  error: string;
  active: boolean;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
}

interface FilterBarProps {
  filters: FilterOptions | null;
  selected: Record<FilterKey, string[]>;
  onToggle: (key: FilterKey, value: string) => void;
  onClearAll: () => void;
  price: FilterBarPrice;
}

export function FilterBar({
  filters,
  selected,
  onToggle,
  onClearAll,
  price,
}: FilterBarProps) {
  const { t, formatNumber } = usePreferences();
  const [openKey, setOpenKey] = useState<FilterFocus | null>(null);
  const [search, setSearch] = useState("");
  const barRef = useRef<HTMLDivElement>(null);

  const activeGroups = FILTER_GROUPS.filter(
    (group) => selected[group.key].length > 0,
  );
  const activeCount =
    activeGroups.reduce((count, group) => count + selected[group.key].length, 0) +
    (price.active ? 1 : 0);

  useEffect(() => {
    if (!openKey) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpenKey(null);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openKey]);

  if (activeGroups.length === 0 && !price.active) return null;

  const toggle = (key: FilterFocus) => {
    setSearch("");
    setOpenKey((current) => (current === key ? null : key));
  };

  const close = () => setOpenKey(null);

  const bubbleClass = (active: boolean, open: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-bold transition-colors ${
      active || open
        ? "border-eneba-yellow/60 bg-eneba-yellow/10 text-white"
        : "border-white/22 bg-white/[0.04] text-white/72 hover:border-white/45 hover:text-white"
    }`;

  return (
    <div ref={barRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {activeGroups.map((group) => {
          const count = selected[group.key].length;
          const open = openKey === group.key;
          return (
            <div key={group.key} className="relative">
              <button
                type="button"
                onClick={() => toggle(group.key)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={
                  count > 0
                    ? `${t(group.titleKey)} (${formatNumber(count)})`
                    : t(group.titleKey)
                }
                className={bubbleClass(count > 0, open)}
              >
                {t(group.titleKey)}
                {count > 0 ? (
                  <span className="text-eneba-yellow">({formatNumber(count)})</span>
                ) : null}
                <ChevronDown
                  size={13}
                  aria-hidden="true"
                  className={`text-white/55 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open ? (
                <GroupPanel
                  group={group}
                  filters={filters}
                  selected={selected[group.key]}
                  search={search}
                  onSearch={setSearch}
                  onToggle={(value) => onToggle(group.key, value)}
                  onClearAll={() => {
                    onClearAll();
                    close();
                  }}
                  onClose={close}
                />
              ) : null}
            </div>
          );
        })}

        {price.active ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => toggle("price")}
              aria-haspopup="dialog"
              aria-expanded={openKey === "price"}
              aria-label={
                price.active ? `${t("filter.price")} (1)` : t("filter.price")
              }
              className={bubbleClass(price.active, openKey === "price")}
            >
              {t("filter.price")}
              {price.active ? <span className="text-eneba-yellow">(1)</span> : null}
              <ChevronDown
                size={13}
                aria-hidden="true"
                className={`text-white/55 transition-transform ${
                  openKey === "price" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openKey === "price" ? (
              <PricePanel price={price} onClearAll={onClearAll} onClose={close} />
            ) : null}
          </div>
        ) : null}

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-bold text-white/48 underline underline-offset-3 transition-colors hover:text-white"
          >
            {t("common.clearAll")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Panel({
  label,
  children,
  footer,
  onClose,
}: {
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-[74] bg-black/55 lg:hidden"
      />
      <div
        role="dialog"
        aria-label={label}
        className="pop-panel fixed inset-x-3 bottom-3 z-[75] flex max-h-[70vh] flex-col border border-white/20 bg-[#1a0638] shadow-[0_24px_60px_rgba(5,0,16,0.6)] lg:absolute lg:inset-x-auto lg:bottom-auto lg:left-0 lg:top-[calc(100%+8px)] lg:max-h-[430px] lg:w-[320px]"
      >
        {children}
        {footer ? (
          <div className="border-t border-white/10 p-2.5">{footer}</div>
        ) : null}
      </div>
    </>
  );
}

function GroupPanel({
  group,
  filters,
  selected,
  search,
  onSearch,
  onToggle,
  onClearAll,
  onClose,
}: {
  group: (typeof FILTER_GROUPS)[number];
  filters: FilterOptions | null;
  selected: string[];
  search: string;
  onSearch: (value: string) => void;
  onToggle: (value: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const { t, language, formatNumber } = usePreferences();
  const term = normalizeFilterText(search.trim());

  const visible = useMemo(() => {
    const items = (filters?.[group.pluralKey] as Facet[] | undefined) ?? [];
    if (!term) return items;
    return items.filter((item) =>
      normalizeFilterText(facetLabel(group.key, item, language)).includes(term),
    );
  }, [filters, group.pluralKey, group.key, term, language]);

  return (
    <Panel
      label={t(group.titleKey)}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClearAll}
          className="w-full text-center text-[11px] font-bold text-eneba-yellow transition-colors hover:text-eneba-yellow-bright"
        >
          {t("common.clearAll")}
        </button>
      }
    >
      <div className="border-b border-white/10 p-2.5">
        <div className="relative">
          <Search
            size={13}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t("filter.search")}
            aria-label={t("filter.search")}
            className="field h-9 min-h-9 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {!filters ? (
          <div className="space-y-1.5 p-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-6 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-white/45">
            {t("filter.noMatches")}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((item) => {
              const checked = selected.includes(item.value);
              const disabled = item.count === 0 && !checked;
              return (
                <li key={item.value}>
                  <label
                    className={`flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] transition-colors ${
                      disabled
                        ? "cursor-not-allowed text-white/28"
                        : "cursor-pointer text-white/72 hover:bg-white/[0.055] hover:text-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onToggle(item.value)}
                      aria-label={`${facetLabel(group.key, item, language)} (${formatNumber(item.count)})`}
                      className="size-[15px] shrink-0 cursor-pointer accent-[#fad318] disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {facetLabel(group.key, item, language)}
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
        )}
      </div>
    </Panel>
  );
}

function PricePanel({
  price,
  onClearAll,
  onClose,
}: {
  price: FilterBarPrice;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const { t } = usePreferences();
  return (
    <Panel
      label={t("filter.price")}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClearAll}
          className="w-full text-center text-[11px] font-bold text-eneba-yellow transition-colors hover:text-eneba-yellow-bright"
        >
          {t("common.clearAll")}
        </button>
      }
    >
      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">
          {t("filter.price")} ({price.currency})
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("store.min")}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price.min}
              onChange={(event) => price.onMinChange(event.target.value)}
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
              value={price.max}
              onChange={(event) => price.onMaxChange(event.target.value)}
              placeholder={t("store.max")}
              className="field h-10 min-h-10 px-2.5 text-xs"
            />
          </label>
        </div>
        {price.error ? (
          <p role="alert" className="mt-2 text-[11px] leading-4 text-[#ffada2]">
            {price.error}
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-white/38">{t("filter.priceNote")}</p>
        )}
        <button
          type="button"
          onClick={price.onApply}
          className="btn btn-primary mt-2.5 h-9 min-h-9 w-full text-[11px]"
        >
          {t("common.apply")}
        </button>
        {price.active ? (
          <button
            type="button"
            onClick={price.onClear}
            className="mt-2 w-full text-[11px] font-bold text-white/48 transition-colors hover:text-white"
          >
            {t("common.clear")}
          </button>
        ) : null}
      </div>
    </Panel>
  );
}
