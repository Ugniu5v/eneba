"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Search, SearchX, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { categoryLabel } from "@/lib/i18n";
import type { Category, SearchResponse } from "@/lib/types";
import { Breadcrumbs } from "../Breadcrumbs";
import { EmptyState, ErrorPanel } from "../EmptyState";
import { ProductCard } from "../ProductCard";
import { ProductGridSkeleton } from "../Skeletons";

export function SearchClient() {
  const router = useRouter();
  const { t, language, formatNumber } = usePreferences();
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [input, setInput] = useState(query);

  useEffect(() => {
    setInput(query);
  }, [query]);

  const result = useApiQuery<SearchResponse>(
    query ? `/api/search?q=${encodeURIComponent(query)}` : null,
  );
  const categories = useApiQuery<{ categories: Category[] }>(
    "/api/storefront/home/categories",
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const term = input.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const products = result.data?.products ?? [];
  const categoryLinks = categories.data?.categories.slice(0, 8) ?? [];

  return (
    <>
      <section className="border-b border-white/10 bg-black/[0.08]">
        <div className="site-container py-5 lg:py-7">
          <Breadcrumbs
            items={[
              { label: t("common.home"), href: "/" },
              { label: t("common.search"), href: "/search" },
              ...(query ? [{ label: query }] : []),
            ]}
          />
          <div className="mt-5 max-w-3xl">
            <p className="eyebrow text-eneba-yellow">{t("search.findNext")}</p>
            <h1 className="mt-2 text-[32px] font-bold leading-[1.03] tracking-[-0.045em] sm:text-[42px]">
              {query ? (
                <>
                  {t("search.resultsPrefix")}{" "}
                  <span className="text-eneba-yellow">“{query}”</span>
                </>
              ) : (
                t("search.searchMarketplace")
              )}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/58">
              {t("search.searchDesc")}
            </p>
          </div>

          <form onSubmit={submit} role="search" className="relative mt-6 max-w-2xl">
            <Search
              size={19}
              strokeWidth={1.9}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
            />
            <input
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("search.placeholderLong")}
              aria-label={t("search.placeholderLong")}
              className="field h-[52px] min-h-[52px] pl-12 pr-32 text-[15px]"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="btn btn-primary absolute right-1.5 top-1/2 h-[40px] min-h-[40px] -translate-y-1/2 px-5 text-[13px]"
            >
              {t("common.search")}
            </button>
          </form>

          {result.data?.suggestion ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
              <Sparkles size={14} className="text-eneba-yellow" aria-hidden="true" />
              {t("search.suggestionPrefix")}{" "}
              <Link
                href={`/search?q=${encodeURIComponent(result.data.suggestion)}`}
                className="font-bold text-eneba-yellow underline underline-offset-3"
              >
                {result.data.suggestion}
              </Link>
              ?
            </div>
          ) : null}
        </div>
      </section>

      <div className="site-container py-6 lg:py-8">
        {!query ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-14">
            <div>
              <h2 className="text-lg font-bold">{t("search.startCategory")}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {categoryLinks.length === 0
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <span key={index} className="skeleton h-9 w-24" aria-hidden="true" />
                    ))
                  : categoryLinks.map((category) => (
                      <Link
                        key={category.slug}
                        href={category.href}
                        className="btn btn-secondary h-9 min-h-9 text-xs"
                      >
                        {categoryLabel(language, category.name)}
                      </Link>
                    ))}
              </div>
              <div className="mt-12 border border-white/12 bg-black/[0.06] p-6">
                <p className="eyebrow text-eneba-yellow">{t("search.understands")}</p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.02em]">
                  {t("search.typosTitle")}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
                  {t("search.typosDesc")}
                </p>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="border border-white/12 bg-black/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/45">
                  {t("search.tips")}
                </p>
                <ul className="mt-4 space-y-3 text-[13px] leading-5 text-white/62">
                  <li>{t("search.tip1")}</li>
                  <li>{t("search.tip2")}</li>
                  <li>{t("search.tip3")}</li>
                  <li>{t("search.tip4")}</li>
                </ul>
                <Link
                  href="/store"
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-eneba-yellow hover:underline"
                >
                  {t("search.browseFull")} <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        ) : result.error ? (
          <ErrorPanel
            title={t("search.unavailableTitle")}
            description={result.error.message}
            onRetry={result.refetch}
          />
        ) : result.loading ? (
          <div>
            <div className="skeleton h-4 w-40" />
            <div className="mt-5">
              <ProductGridSkeleton
                count={8}
                className="grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
              />
            </div>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t("search.noFound")}
            description={t("search.noFoundDesc", { query })}
            actionLabel={t("store.browseAll")}
            actionHref="/store"
            secondary={
              <Link href="/" className="font-bold text-eneba-yellow underline underline-offset-4">
                {t("search.backHome")}
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-white/12 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/58">
                {t("search.resultCount", {
                  count: formatNumber(result.data?.total ?? 0),
                  query,
                })}
              </p>
              <Link
                href={`/store?q=${encodeURIComponent(query)}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-eneba-yellow hover:underline"
              >
                <SlidersHorizontal size={13} aria-hidden="true" />
                {t("search.refine")}
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
            <div className="mt-8 border-t border-white/10 pt-6 text-center">
              <p className="text-xs text-white/45">
                {t("search.notFinding")}
              </p>
              <Link href="/store" className="btn btn-secondary btn-sm mt-3">
                {t("search.browseFull")}
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
