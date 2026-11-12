"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { categoryLabel, genreLabel } from "@/lib/i18n";
import type { CatalogResponse, FilterOptions, SortOption } from "@/lib/types";
import { Breadcrumbs } from "../Breadcrumbs";
import { EmptyState, ErrorPanel } from "../EmptyState";
import { ProductCard } from "../ProductCard";
import { ProductGridSkeleton } from "../Skeletons";
import { FilterBar } from "./FilterBar";
import { FilterDrawer } from "./FilterDrawer";
import { FilterSidebar } from "./FilterSidebar";
import type { FilterKey } from "./filterConfig";
import { SortMenu } from "./SortMenu";

const FILTER_KEYS: FilterKey[] = ["category", "platform", "region", "type", "genre"];

function listParam(params: URLSearchParams, key: FilterKey): string[] {
  return (params.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function positiveInt(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function StoreClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();
  const { t, language, currency, rateFromEur, formatNumber } = usePreferences();

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceError, setPriceError] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const query = searchParams.get("q") ?? "";
  const page = positiveInt(searchParams.get("page"));
  const activeSort =
    searchParams.get("sort") ?? (query ? "relevance" : "popular");

  const selected = useMemo(() => {
    const params = new URLSearchParams(queryKey);
    return {
      platform: listParam(params, "platform"),
      region: listParam(params, "region"),
      type: listParam(params, "type"),
      genre: listParam(params, "genre"),
      category: listParam(params, "category"),
    };
  }, [queryKey]);

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((key) => {
      if (selected[key].length > 0) params.set(key, selected[key].join(","));
    });
    if (query) params.set("q", query);
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    if (min) params.set("minPrice", min);
    if (max) params.set("maxPrice", max);
    return params;
  }, [selected, query, searchParams]);

  const catalogPath = useMemo(() => {
    const params = new URLSearchParams(queryKey);
    params.set("limit", "20");
    return `/api/storefront/catalog?${params.toString()}`;
  }, [queryKey]);
  const catalog = useApiQuery<CatalogResponse>(catalogPath);
  const filterMetaPath = filterQuery.toString()
    ? `/api/storefront/filters?${filterQuery.toString()}`
    : "/api/storefront/filters";
  const filterMeta = useApiQuery<FilterOptions>(filterMetaPath);

  useEffect(() => {
    setSearchInput(searchParams.get("q") ?? "");
  }, [queryKey, searchParams]);

  useEffect(() => {
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    const display = (raw: string | null) => {
      if (!raw) return "";
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) return "";
      return String(Number((value * rateFromEur).toFixed(2)));
    };
    setMinPrice(display(min));
    setMaxPrice(display(max));
    setPriceError("");
  }, [queryKey, rateFromEur, searchParams]);

  const updateParams = useCallback(
    (mutator: (params: URLSearchParams) => void, scroll = false) => {
      const params = new URLSearchParams(searchParams.toString());
      mutator(params);
      params.delete("page");
      const suffix = params.toString();
      router.push(`${pathname}${suffix ? `?${suffix}` : ""}`, { scroll });
    },
    [pathname, router, searchParams],
  );

  const toggleFilter = (key: FilterKey, value: string) => {
    updateParams((params) => {
      const values = new Set(listParam(params, key));
      if (values.has(value)) values.delete(value);
      else values.add(value);
      if (values.size > 0) params.set(key, Array.from(values).join(","));
      else params.delete(key);
    });
  };

  const clearFilters = () => {
    updateParams((params) => {
      FILTER_KEYS.forEach((key) => params.delete(key));
      params.delete("minPrice");
      params.delete("maxPrice");
      params.delete("page");
    });
  };

  const applyPrice = () => {
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;
    if (
      (min !== null && (!Number.isFinite(min) || min < 0)) ||
      (max !== null && (!Number.isFinite(max) || max < 0))
    ) {
      setPriceError(t("store.priceErrorInvalid"));
      return;
    }
    if (min !== null && max !== null && min > max) {
      setPriceError(t("store.priceErrorOrder"));
      return;
    }
    setPriceError("");
    const eur = (display: number | null) =>
      display === null ? null : display / rateFromEur;
    const minEur = eur(min);
    const maxEur = eur(max);
    updateParams((params) => {
      if (minEur !== null && minEur > 0) params.set("minPrice", minEur.toFixed(2));
      else params.delete("minPrice");
      if (maxEur !== null && maxEur > 0) params.set("maxPrice", maxEur.toFixed(2));
      else params.delete("maxPrice");
    });
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = searchInput.trim();
    updateParams((params) => {
      if (term) {
        params.set("q", term);
        params.set("sort", "relevance");
      } else {
        params.delete("q");
        if (params.get("sort") === "relevance") params.delete("sort");
      }
    });
  };

  const changeSort = (value: string) => {
    updateParams((params) => {
      params.set("sort", value);
    });
  };

  const setPage = (value: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value <= 1) params.delete("page");
    else params.set("page", String(value));
    const suffix = params.toString();
    router.push(`${pathname}${suffix ? `?${suffix}` : ""}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const title = query
    ? t("store.searchTitle", { query })
    : selected.category.length === 1
      ? categoryLabel(language, selected.category[0])
      : selected.genre.length === 1
        ? genreLabel(language, selected.genre[0])
        : selected.platform.length === 1
          ? selected.platform[0]
          : t("store.title");

  const sortOptions: SortOption[] = filterMeta.data?.sortOptions ?? [];
  const total = catalog.data?.total;
  const products = catalog.data?.products ?? [];
  const pageCount = catalog.data?.pageCount ?? 0;
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const hasActiveFilters =
    FILTER_KEYS.some((key) => selected[key].length > 0) ||
    Boolean(minPriceParam || maxPriceParam);
  const activeFilterCount =
    FILTER_KEYS.reduce((count, key) => count + selected[key].length, 0) +
    (minPriceParam || maxPriceParam ? 1 : 0);

  const sidebar = (
    <FilterSidebar
      filters={filterMeta.data}
      selected={selected}
      onToggle={toggleFilter}
      onClear={clearFilters}
      minPrice={minPrice}
      maxPrice={maxPrice}
      onMinPriceChange={setMinPrice}
      onMaxPriceChange={setMaxPrice}
      onApplyPrice={applyPrice}
      priceError={priceError}
    />
  );

  return (
    <>
      <section className="border-b border-white/10 bg-black/[0.08]">
        <div className="site-container py-5 lg:py-7">
          <Breadcrumbs
            items={[
              { label: t("common.home"), href: "/" },
              { label: t("common.store"), href: "/store" },
              ...(query ? [{ label: t("store.searchResultsCrumb") }] : []),
            ]}
          />
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow text-eneba-yellow">{t("common.store")}</p>
              <h1 className="mt-2 max-w-3xl text-[30px] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[38px]">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                {t("store.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/48">
              <span
                className="inline-block size-1.5 rounded-full bg-eneba-mint"
                aria-hidden="true"
              />
              {t("store.instant")}
            </div>
          </div>
        </div>
      </section>

      <div className="site-container py-5 lg:py-7">
        <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-8 xl:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-[128px] max-h-[calc(100vh-148px)] overflow-y-auto pr-1">
              {sidebar}
            </div>
          </aside>

          <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-white/12 pb-4">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(true)}
                className="btn btn-secondary h-10 min-h-10 gap-2 px-3 text-xs"
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                {t("store.filters")}
                {activeFilterCount > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-eneba-yellow text-[10px] font-extrabold text-black">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <form onSubmit={submitSearch} className="relative sm:w-[250px]">
                <Search
                  size={14}
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("store.searchByName")}
                  aria-label={t("store.searchByName")}
                  className="field h-10 min-h-10 pl-9 pr-3 text-xs"
                />
              </form>
              <SortMenu
                options={sortOptions}
                value={activeSort}
                onChange={changeSort}
              />
            </div>

            <FilterBar
              filters={filterMeta.data}
              selected={selected}
              onToggle={toggleFilter}
              onClearAll={clearFilters}
              price={{
                currency,
                min: minPrice,
                max: maxPrice,
                error: priceError,
                active: Boolean(minPriceParam || maxPriceParam),
                onMinChange: setMinPrice,
                onMaxChange: setMaxPrice,
                onApply: applyPrice,
                onClear: () => {
                  setMinPrice("");
                  setMaxPrice("");
                  setPriceError("");
                  updateParams((params) => {
                    params.delete("minPrice");
                    params.delete("maxPrice");
                  });
                },
              }}
            />

            <p className="text-xs text-white/52" aria-live="polite">
              {catalog.loading && total === undefined ? (
                <span className="skeleton inline-block h-3 w-24 align-middle" />
              ) : (
                <>
                  <span className="font-bold text-white">
                    {formatNumber(total ?? 0)}
                  </span>{" "}
                  {total === 1 ? t("common.product") : t("common.products")}
                </>
              )}
            </p>
          </div>

            {catalog.data?.suggestion ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-eneba-yellow/35 bg-eneba-yellow/[0.07] px-4 py-3 text-sm">
                <p>
                  {t("store.didYouMean", {
                    query: catalog.data.suggestion,
                  })}{" "}
                  <Link
                    href={`/search?q=${encodeURIComponent(catalog.data.suggestion)}`}
                    className="ml-1 font-bold text-eneba-yellow underline underline-offset-3"
                  >
                    {catalog.data.suggestion}
                  </Link>
                </p>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/38">
                  {t("store.typoFriendly")}
                </span>
              </div>
            ) : null}

            <div className="pt-5">
              {catalog.error ? (
                <ErrorPanel
                  title={t("store.loadFailed")}
                  description={catalog.error.message}
                  onRetry={catalog.refetch}
                />
              ) : catalog.loading ? (
                <ProductGridSkeleton
                  count={8}
                  className="grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                />
              ) : products.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title={t("store.noMatchTitle")}
                  description={t("store.noMatchDesc")}
                  actionLabel={t("store.browseAll")}
                  actionHref="/store"
                  secondary={
                    hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="font-bold text-eneba-yellow underline underline-offset-4"
                      >
                        {t("store.clearAllFilters")}
                      </button>
                    ) : null
                  }
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
                    {products.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        priority={index < 4}
                      />
                    ))}
                  </div>
                  {pageCount > 1 ? (
                    <Pagination
                      page={page}
                      pageCount={pageCount}
                      onPage={setPage}
                    />
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title={t("store.refine")}
        footer={
          <button
            type="button"
            onClick={() => setFilterDrawerOpen(false)}
            className="btn btn-primary w-full"
          >
            {t("store.showResults", { count: formatNumber(total ?? 0) })}
          </button>
        }
      >
        {sidebar}
      </FilterDrawer>

    </>
  );
}

function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  const { t, formatNumber } = usePreferences();
  const pages = paginationRange(page, pageCount);
  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="flex h-9 items-center gap-1.5 border border-white/20 px-3 text-xs font-bold text-white/75 transition-colors hover:border-white/45 hover:text-white disabled:border-white/8 disabled:text-white/20"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        <span className="hidden sm:inline">{t("store.previous")}</span>
      </button>
      {pages.map((value, index) =>
        typeof value === "string" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1.5 text-white/30"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={value}
            type="button"
            onClick={() => onPage(value)}
            aria-current={value === page ? "page" : undefined}
            className={`flex size-9 items-center justify-center border text-xs font-bold transition-colors ${
              value === page
                ? "border-eneba-yellow bg-eneba-yellow text-black"
                : "border-white/20 text-white/70 hover:border-white/45 hover:text-white"
            }`}
          >
            {formatNumber(value)}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
        className="flex h-9 items-center gap-1.5 border border-white/20 px-3 text-xs font-bold text-white/75 transition-colors hover:border-white/45 hover:text-white disabled:border-white/8 disabled:text-white/20"
      >
        <span className="hidden sm:inline">{t("store.next")}</span>
        <ArrowRight size={13} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onPage(1)}
        className="ml-2 hidden items-center gap-1 text-[11px] font-bold text-white/45 transition-colors hover:text-white sm:flex"
      >
        <RefreshCw size={11} aria-hidden="true" /> {t("store.firstPage")}
      </button>
    </nav>
  );
}

function paginationRange(page: number, pageCount: number): Array<number | string> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const values: Array<number | string> = [1];
  if (page > 3) values.push("ellipsis-left");
  for (let value = Math.max(2, page - 1); value <= Math.min(pageCount - 1, page + 1); value++) {
    values.push(value);
  }
  if (page < pageCount - 2) values.push("ellipsis-right");
  values.push(pageCount);
  return values;
}
