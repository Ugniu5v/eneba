"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { categoryLabel } from "@/lib/i18n";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";

const ITEM_GAP = 4;
const MIN_ITEM_WIDTH = 92;
const ARROW_SIZE = 28;
const ARROW_GAP = 4;
const ARROW_SPACE = ARROW_SIZE * 2 + ARROW_GAP * 2;

export function CategoryRail() {
  const { t } = usePreferences();
  const { data, loading, error, refetch } = useApiQuery<{ categories: Category[] }>(
    "/api/storefront/home/categories",
  );

  return (
    <section
      aria-label="Browse categories"
      className="mt-4 border-y border-white/10 bg-black/[0.06] lg:mt-5"
    >
      <div className="site-container">
        {loading ? (
          <div className="hide-scrollbar flex gap-2 overflow-hidden py-6" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex min-w-[96px] flex-1 flex-col items-center gap-2">
                <div className="skeleton size-8 rounded-full" />
                <div className="skeleton h-2.5 w-12" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 py-4 text-xs text-white/60">
            <span>{t("header.categories")} — {t("common.retry")}</span>
            <button
              type="button"
              onClick={refetch}
              className="inline-flex items-center gap-1 font-bold text-eneba-yellow hover:underline"
            >
              <RefreshCw size={12} aria-hidden="true" /> {t("common.retry")}
            </button>
          </div>
        ) : (
          <CategoryScroller categories={data?.categories ?? []} />
        )}
      </div>
    </section>
  );
}

function CategoryScroller({ categories }: { categories: Category[] }) {
  const { language, t } = usePreferences();
  const wrapper = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(categories.length || 1);
  const [showArrows, setShowArrows] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    setCanPrev(element.scrollLeft > 8);
    setCanNext(element.scrollLeft < max - 8);
  }, []);

  /**
   * Fit whole tiles only: the visible page is always exactly `pageSize` tiles
   * wide, so a card is never cut in half. When every category fits without
   * arrows, the row shows them all and no arrow is rendered.
   */
  const measure = useCallback(() => {
    const element = wrapper.current;
    const total = categories.length;
    if (!element || total === 0) return;
    const available = element.clientWidth;
    if (available <= 0) return;

    const needed = total * MIN_ITEM_WIDTH + (total - 1) * ITEM_GAP;
    if (needed <= available) {
      setPageSize(total);
      setShowArrows(false);
      return;
    }

    const usable = Math.max(MIN_ITEM_WIDTH, available - ARROW_SPACE);
    const next = Math.max(
      1,
      Math.min(total, Math.floor((usable + ITEM_GAP) / (MIN_ITEM_WIDTH + ITEM_GAP))),
    );
    setPageSize(next);
    setShowArrows(true);
  }, [categories.length]);

  useLayoutEffect(() => {
    measure();
    update();
    const element = wrapper.current;
    const trackElement = track.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      measure();
      update();
    });
    observer.observe(element);
    if (trackElement) observer.observe(trackElement);
    return () => observer.disconnect();
  }, [measure, update]);

  useLayoutEffect(() => {
    update();
  }, [pageSize, showArrows, update]);

  const scroll = (direction: 1 | -1) => {
    const element = track.current;
    if (!element) return;
    element.scrollBy({
      left: element.clientWidth * direction,
      behavior: "smooth",
    });
  };

  const basis = `calc((100% - ${(pageSize - 1) * ITEM_GAP}px) / ${pageSize})`;

  return (
    <div ref={wrapper} className="flex items-center gap-1">
      {showArrows ? (
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canPrev}
          aria-label={t("home.categoryPrev")}
          className="flex size-7 shrink-0 items-center justify-center border border-white/20 bg-[#1a0638]/92 text-white transition-colors hover:border-eneba-yellow hover:text-eneba-yellow disabled:cursor-default disabled:border-white/10 disabled:text-white/25"
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
      ) : null}

      <div
        ref={track}
        onScroll={update}
        className="hide-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory items-stretch gap-1 overflow-x-auto scroll-smooth py-1"
      >
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={category.href}
            style={{ flex: `0 0 ${basis}` }}
            className="group flex min-w-0 snap-start flex-col items-center justify-start gap-2 px-2 py-4 text-center transition-colors hover:bg-white/[0.055]"
          >
            <span className="text-white/78 transition-colors group-hover:text-eneba-yellow">
              <CategoryIcon name={category.icon} size={29} />
            </span>
            <span className="line-clamp-2 max-w-[104px] text-[11px] font-medium leading-[13px] text-white/72 transition-colors group-hover:text-white">
              {categoryLabel(language, category.name)}
            </span>
          </Link>
        ))}
      </div>

      {showArrows ? (
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canNext}
          aria-label={t("home.categoryNext")}
          className="flex size-7 shrink-0 items-center justify-center border border-white/20 bg-[#1a0638]/92 text-white transition-colors hover:border-eneba-yellow hover:text-eneba-yellow disabled:cursor-default disabled:border-white/10 disabled:text-white/25"
        >
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
