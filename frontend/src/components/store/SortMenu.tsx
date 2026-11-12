"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import type { SortOption } from "@/lib/types";

export function SortMenu({
  options,
  value,
  onChange,
}: {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value);
  const currentLabel = current
    ? t(`sort.${current.value}`, undefined, current.label)
    : t("common.loading");

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative w-full sm:w-[230px]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("store.sortBy")}: ${currentLabel}`}
        disabled={options.length === 0}
        className="field flex h-10 min-h-10 w-full items-center justify-between gap-2 px-3 text-left text-xs font-medium disabled:text-white/35"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`shrink-0 text-white/55 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t("store.sortBy")}
          className="pop-panel absolute left-0 right-0 top-[calc(100%+6px)] z-[75] max-h-[min(70vh,360px)] overflow-y-auto border border-white/18 bg-[#1a0638] p-1.5 shadow-[0_24px_60px_rgba(5,0,16,0.6)] sm:left-auto sm:w-[260px]"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">
            {t("store.sortLabel")}
          </p>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs transition-colors ${
                  selected
                    ? "bg-eneba-yellow/12 font-bold text-eneba-yellow"
                    : "text-white/72 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="min-w-0 flex-1">
                  {t(`sort.${option.value}`, undefined, option.label)}
                </span>
                {selected ? <Check size={13} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
