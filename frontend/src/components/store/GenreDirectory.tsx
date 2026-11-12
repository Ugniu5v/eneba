"use client";

import Link from "next/link";
import { ArrowUpRight, Gamepad2 } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { genreLabel } from "@/lib/i18n";
import { GAME_GENRES, genreSearchHref } from "@/lib/taxonomy";
import type { FilterOptions } from "@/lib/types";

export function GenreDirectory() {
  const { t, language, formatNumber } = usePreferences();
  const { data } = useApiQuery<FilterOptions>("/api/storefront/filters");
  const counts = new Map((data?.genres ?? []).map((facet) => [facet.value, facet.count]));

  return (
    <section
      aria-labelledby="genre-directory-title"
      className="mt-10 border-t border-white/12 pt-7 lg:mt-12 lg:pt-9"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-eneba-yellow">{t("header.categories")}</p>
          <h2
            id="genre-directory-title"
            className="mt-2 text-[22px] font-bold leading-tight tracking-[-0.025em] sm:text-[27px]"
          >
            {t("store.genreDirectoryTitle")}
          </h2>
          <p className="mt-1.5 text-[13px] leading-5 text-white/55">
            {t("store.genreDirectorySubtitle")}
          </p>
        </div>
        <Link
          href="/store"
          className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-bold text-eneba-yellow transition-colors hover:text-eneba-yellow-bright"
        >
          {t("store.genreDirectoryAll")}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {GAME_GENRES.map((genre) => {
          const count = counts.get(genre) ?? 0;
          return (
            <Link
              key={genre}
              href={genreSearchHref(genre)}
              className={`group flex items-center gap-2 border border-white/12 bg-white/[0.035] px-2.5 py-2.5 transition-colors hover:border-eneba-yellow/55 hover:bg-white/[0.07] ${
                count === 0 ? "opacity-55" : ""
              }`}
            >
              <Gamepad2
                size={15}
                strokeWidth={1.7}
                aria-hidden="true"
                className="shrink-0 text-white/35 transition-colors group-hover:text-eneba-yellow"
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/78 group-hover:text-white">
                {genreLabel(language, genre)}
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-white/32">
                {formatNumber(count)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
