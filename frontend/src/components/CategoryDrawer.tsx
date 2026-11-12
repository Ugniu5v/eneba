"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { categoryLabel } from "@/lib/i18n";
import type { Category, FilterOptions } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";

export function CategoryDrawer({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const { t, language } = usePreferences();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { data: filters } = useApiQuery<FilterOptions>(
    open ? "/api/storefront/filters" : null,
  );

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  const categoryCounts = new Map(
    (filters?.categories ?? []).map((facet) => [facet.value, facet.count]),
  );

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("header.browseCategories")}
        className="drawer-panel absolute inset-y-0 left-0 flex w-[min(94vw,430px)] flex-col border-r border-white/15 bg-[#240550] shadow-[24px_0_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between border-b border-white/12 px-5 py-4">
          <div>
            <p className="eyebrow text-eneba-yellow">{t("common.store")}</p>
            <h2 className="mt-1 text-lg font-bold tracking-[-0.02em]">
              {t("header.browseCategories")}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("header.closeMenu")}
            className="flex size-9 items-center justify-center border border-white/20 text-white/70 transition-colors hover:border-white/45 hover:text-white"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">
              {t("header.allCategories")}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {categories.map((category) => {
              const count = categoryCounts.get(category.name);
              return (
                <Link
                  key={category.slug}
                  href={category.href}
                  onClick={onClose}
                  className="group flex min-h-[54px] items-center gap-2.5 border border-white/12 bg-white/[0.04] px-2.5 py-2 text-[12px] font-medium transition-colors hover:border-white/35 hover:bg-white/[0.08]"
                >
                  <span className="text-white/60 transition-colors group-hover:text-eneba-yellow">
                    <CategoryIcon name={category.icon} size={19} />
                  </span>
                  <span className="min-w-0 flex-1 leading-4">
                    {categoryLabel(language, category.name)}
                  </span>
                  {count !== undefined ? (
                    <span className="text-[10px] text-white/32">{count}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/store"
            onClick={onClose}
            className="btn btn-secondary w-full"
          >
            {t("store.browseAll")}
          </Link>
        </div>
      </div>
    </div>
  );
}
