"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery, useDebouncedValue } from "@/hooks/useApiQuery";
import type { SearchSuggestResponse } from "@/lib/types";

export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { t, money } = usePreferences();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(query.trim(), 180);
  const path =
    focused && debounced.length >= 2
      ? `/api/search/suggest?q=${encodeURIComponent(debounced)}&limit=6`
      : null;
  const { data, loading, error } = useApiQuery<SearchSuggestResponse>(path);
  const trimmed = query.trim();
  const showPanel = focused && trimmed.length >= 2;
  const currentData = data?.query === debounced ? data : undefined;
  const suggestions = currentData?.suggestions ?? [];
  const searching = loading || trimmed !== debounced;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const goToResults = (value: string) => {
    const term = value.trim();
    if (!term) return;
    setFocused(false);
    setActiveIndex(-1);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const openProduct = (slug: string) => {
    setFocused(false);
    setActiveIndex(-1);
    router.push(`/product/${slug}`);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    goToResults(query);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setFocused(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }
    if (!showPanel || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      openProduct(suggestions[activeIndex].slug);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={submit} role="search" className="relative">
        <Search
          size={20}
          strokeWidth={1.9}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/85"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="global-search-suggestions"
          className="h-[46px] w-full border border-white/35 bg-[#230a54]/35 pl-11 pr-11 text-[15px] font-medium text-white transition-colors placeholder:text-white/58 hover:border-white/55 focus:border-eneba-yellow focus:bg-[#230a54]/55 focus:outline-none lg:h-[50px]"
        />
        {query.length > 0 ? (
          <button
            type="button"
            aria-label={t("search.clear")}
            onClick={() => {
              setQuery("");
              setFocused(true);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center text-white/55 transition-colors hover:text-white"
          >
            <X size={17} aria-hidden="true" />
          </button>
        ) : null}
      </form>

      {showPanel ? (
        <div
          id="global-search-suggestions"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] overflow-hidden border border-[#d8cff0] bg-[#fbf9ff] text-[#16052d] shadow-[0_24px_70px_rgba(9,0,24,0.45)]"
        >
          {searching && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-5 text-sm font-medium text-[#6d5b8d]">
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              {t("search.searching")}
            </div>
          ) : null}

          {!searching && !error && currentData?.suggestion ? (
            <button
              type="button"
              onClick={() => goToResults(currentData.suggestion)}
              className="flex w-full items-center justify-between border-b border-[#e6def3] bg-[#f3edff] px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#ebe2ff]"
            >
              <span>
                {t("search.didYouMean", { query: currentData.suggestion })}
              </span>
              <span className="text-[11px] font-bold text-[#6d5b8d]">
                {t("search.search")}
              </span>
            </button>
          ) : null}

          {suggestions.length > 0 ? (
            <div role="listbox" aria-label={t("search.suggestLabel")} className="py-1">
              {suggestions.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => openProduct(product.slug)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    index === activeIndex ? "bg-[#f0e8ff]" : "hover:bg-[#f6f1ff]"
                  }`}
                >
                  <img
                    src={product.coverImage}
                    alt=""
                    className="h-14 w-[42px] shrink-0 border border-black/10 object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold leading-5">
                      {product.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[#78688f]">
                      {product.platform} · {product.region}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-[#4618ac]">
                    {money(product.lowestOffer.priceCents)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {!searching && error ? (
            <div className="px-4 py-5">
              <p className="text-sm font-bold">{t("search.unavailableTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-[#6d5b8d]">
                {t("search.unavailableDesc")}
              </p>
            </div>
          ) : null}

          {!searching && !error && currentData && suggestions.length === 0 ? (
            <div className="px-4 py-5">
              <p className="text-sm font-bold">
                {t("search.noMatches", { query: currentData.query })}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#6d5b8d]">
                {t("search.noMatchesDesc")}
              </p>
              <Link
                href="/store"
                onClick={() => setFocused(false)}
                className="mt-3 inline-flex text-xs font-bold text-[#4618ac] underline underline-offset-4"
              >
                {t("search.browseAll")}
              </Link>
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <button
              type="button"
              onClick={() => goToResults(query)}
              className="flex w-full items-center justify-between border-t border-[#e6def3] bg-white px-4 py-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-[#4618ac] transition-colors hover:bg-[#f7f2ff]"
            >
              {t("search.seeAll", { query: trimmed })}
              <span aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
