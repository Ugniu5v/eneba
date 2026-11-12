"use client";

import Link from "next/link";
import { Heart, LayoutGrid, ShoppingCart } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useCart } from "@/context/CartContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useWishlist } from "@/context/WishlistContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { categoryLabel } from "@/lib/i18n";
import type { Category } from "@/lib/types";
import { AccountMenu } from "./AccountMenu";
import { Brand } from "./Brand";
import { CategoryDrawer } from "./CategoryDrawer";
import { CategoryIcon } from "./CategoryIcon";
import { LanguageCurrencyMenu } from "./LanguageCurrencyMenu";
import { SearchBar } from "./SearchBar";

export function Header() {
  const { count, hydrated } = useCart();
  const { count: wishlistCount, hydrated: wishlistHydrated } = useWishlist();
  const { t } = usePreferences();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { data } = useApiQuery<{ categories: Category[] }>(
    "/api/storefront/home/categories",
  );
  const categories = data?.categories ?? [];

  return (
    <>
      <header className="sticky top-0 z-50 bg-eneba-header shadow-[0_1px_0_rgba(255,255,255,0.08)]">
        <div className="site-container">
          <div className="flex h-[58px] items-center gap-1.5 sm:gap-3 lg:h-[74px] lg:gap-7">
            <Brand />
            <div className="hidden min-w-0 flex-1 md:block">
              <SearchBar />
            </div>
            <div className="ml-auto flex items-center gap-0 sm:gap-1 lg:gap-3">
              <LanguageCurrencyMenu />
              <Link
                href="/wishlist"
                aria-label={`${t("common.wishlist")}${
                  wishlistHydrated && wishlistCount > 0 ? `, ${wishlistCount}` : ""
                }`}
                className="relative flex size-9 items-center justify-center text-white transition-colors hover:text-eneba-yellow sm:size-10"
              >
                <Heart size={20} strokeWidth={1.8} aria-hidden="true" />
                {wishlistHydrated && wishlistCount > 0 ? (
                  <span className="absolute right-0 top-0 flex min-w-[17px] items-center justify-center rounded-full bg-eneba-yellow px-1 text-[10px] font-extrabold leading-[17px] text-black">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                ) : null}
              </Link>
              <AccountMenu />
              <Link
                href="/cart"
                aria-label={`${t("common.cart")}${
                  hydrated && count > 0
                    ? `, ${count} ${count === 1 ? t("common.item") : t("common.items")}`
                    : ""
                }`}
                className="relative flex size-9 items-center justify-center text-white transition-colors hover:text-eneba-yellow sm:size-10"
              >
                <ShoppingCart size={21} strokeWidth={1.8} aria-hidden="true" />
                {hydrated && count > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center rounded-full bg-eneba-yellow px-1 text-[10px] font-extrabold leading-[17px] text-black">
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
          <div className="pb-2.5 md:hidden">
            <SearchBar />
          </div>
        </div>

        <div className="border-t border-white/8 bg-black/15">
          <div className="site-container">
            <nav
              aria-label="Product categories"
              className="flex h-[43px] items-center"
            >
              <button
                type="button"
                onClick={() => setCategoriesOpen(true)}
                aria-haspopup="dialog"
                className="mr-1 inline-flex h-[31px] shrink-0 items-center gap-2 border-r border-white/20 pr-3 text-[13px] font-bold text-white transition-colors hover:text-eneba-yellow sm:pr-4 sm:text-sm"
              >
                <LayoutGrid size={17} strokeWidth={1.8} aria-hidden="true" />
                {t("header.categories")}
              </button>
              <HeaderCategoryStrip categories={categories} />
            </nav>
          </div>
        </div>
      </header>

      <CategoryDrawer
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={categories}
      />
    </>
  );
}

const STRIP_GAP = 2;

/**
 * The category strip never scrolls or clips a label. It measures how many
 * categories fit at a readable width and shows only those; everything else
 * stays reachable from the categories drawer.
 */
function HeaderCategoryStrip({ categories }: { categories: Category[] }) {
  const { language } = usePreferences();
  const track = useRef<HTMLDivElement>(null);
  const measurer = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  const fit = useCallback(() => {
    const trackElement = track.current;
    const measureElement = measurer.current;
    if (!trackElement || !measureElement) return;
    const available = trackElement.clientWidth;
    if (available <= 0) return;
    let used = 0;
    let count = 0;
    for (const item of Array.from(measureElement.children) as HTMLElement[]) {
      const width = item.getBoundingClientRect().width;
      if (width <= 0) break;
      const next = count === 0 ? width : used + width + STRIP_GAP;
      if (next > available) break;
      used = next;
      count += 1;
    }
    setVisibleCount(count);
  }, []);

  useLayoutEffect(() => {
    fit();
    const element = track.current;
    if (!element) return;
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit, categories.length, language]);

  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    return () => {
      cancelled = true;
    };
  }, [fit]);

  if (categories.length === 0) {
    return (
      <div
        className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden"
        aria-hidden="true"
      >
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={index}
            className="h-3 w-16 shrink-0 animate-pulse bg-white/10"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={track}
        className="flex min-w-0 items-center gap-0.5 overflow-hidden"
      >
        {categories.slice(0, visibleCount).map((category) => (
          <Link
            key={category.slug}
            href={category.href}
            className="inline-flex h-[31px] shrink-0 items-center gap-2 px-2.5 text-[13px] font-medium text-[#ddd7ed] transition-colors hover:text-white sm:text-sm"
          >
            <CategoryIcon
              name={category.icon}
              size={15}
              className="text-white/60"
            />
            {categoryLabel(language, category.name)}
          </Link>
        ))}
      </div>

      {/* Invisible clone used only to measure the natural width of every label. */}
      <div
        ref={measurer}
        aria-hidden="true"
        inert
        className="pointer-events-none invisible absolute left-0 top-0 flex h-0 w-full items-center gap-0.5 overflow-hidden"
      >
        {categories.map((category) => (
          <span
            key={category.slug}
            className="inline-flex shrink-0 items-center gap-2 px-2.5 text-[13px] font-medium sm:text-sm"
          >
            <CategoryIcon name={category.icon} size={15} />
            {categoryLabel(language, category.name)}
          </span>
        ))}
      </div>
    </div>
  );
}
