"use client";

import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CURRENCIES,
  LANGUAGE_OPTIONS,
  usePreferences,
} from "@/context/PreferencesContext";

export function LanguageCurrencyMenu() {
  const { language, currency, setLanguage, setCurrency, t } = usePreferences();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

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

  const languageLabel =
    LANGUAGE_OPTIONS.find((option) => option.code === language)?.label ?? "English";

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t("header.languageCurrency")}: ${languageLabel}, ${currency}`}
        className="flex size-9 items-center justify-center gap-1 px-0 text-xs font-medium text-white/78 transition-colors hover:text-eneba-yellow sm:h-10 sm:w-auto sm:justify-start sm:gap-1.5 sm:px-1.5"
      >
        <Globe2 size={16} strokeWidth={1.7} aria-hidden="true" />
        <span className="hidden xl:inline">
          {languageLabel} · {currency}
        </span>
        <span className="hidden sm:inline xl:hidden">{currency}</span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={`hidden transition-transform sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("header.languageCurrency")}
          className="pop-panel absolute right-0 top-[calc(100%+8px)] z-[80] w-[292px] border border-white/18 bg-[#1a0638] p-4 shadow-[0_24px_70px_rgba(5,0,16,0.55)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <p className="text-sm font-bold">{t("header.languageCurrency")}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-lg leading-none text-white/50 transition-colors hover:text-white"
              aria-label={t("common.close")}
            >
              ×
            </button>
          </div>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
            {t("header.language")}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {LANGUAGE_OPTIONS.map((option) => {
              const active = language === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setLanguage(option.code)}
                  className={`flex items-center justify-between gap-1 border px-2.5 py-2 text-left text-xs font-bold transition-colors ${
                    active
                      ? "border-eneba-yellow bg-eneba-yellow/10 text-eneba-yellow"
                      : "border-white/15 text-white/75 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {option.label}
                  {active ? <Check size={13} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
            {t("header.currency")}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {CURRENCIES.map((option) => {
              const active = currency === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCurrency(option.code)}
                  className={`flex flex-col items-center gap-0.5 border px-1 py-2 transition-colors ${
                    active
                      ? "border-eneba-yellow bg-eneba-yellow/10 text-eneba-yellow"
                      : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-extrabold">{option.symbol}</span>
                  <span className="text-[10px] font-bold">{option.code}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-4 text-white/42">
            {t("header.approxRates")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
