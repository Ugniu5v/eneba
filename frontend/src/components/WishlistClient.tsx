"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useWishlist } from "@/context/WishlistContext";
import { Breadcrumbs } from "./Breadcrumbs";
import { EmptyState } from "./EmptyState";
import { ProductCard } from "./ProductCard";

export function WishlistClient() {
  const { t, formatNumber } = usePreferences();
  const { items, count, hydrated, clear } = useWishlist();

  return (
    <div className="site-container py-6 lg:py-9">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("wishlist.title") },
        ]}
      />
      <div className="mt-4 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-eneba-yellow">{t("common.account")}</p>
          <h1 className="mt-2 flex items-center gap-2 text-[30px] font-bold leading-none tracking-[-0.035em] sm:text-[36px]">
            <Heart size={26} className="text-eneba-yellow" aria-hidden="true" />
            {t("wishlist.title")}
          </h1>
          <p className="mt-2 text-sm text-white/52">{t("wishlist.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/45">
            {formatNumber(count)} {count === 1 ? t("common.item") : t("common.items")}
          </span>
          {hydrated && count > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="btn btn-secondary btn-sm"
            >
              <Trash2 size={13} aria-hidden="true" />
              {t("common.clearAll")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        {!hydrated ? (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-[420px] w-full" />
            ))}
          </div>
        ) : count === 0 ? (
          <EmptyState
            icon={Heart}
            title={t("wishlist.empty")}
            description={t("wishlist.emptyDesc")}
            actionLabel={t("wishlist.browse")}
            actionHref="/store"
            secondary={
              <Link
                href="/account/profile"
                className="font-bold text-eneba-yellow underline underline-offset-4"
              >
                {t("account.profile")}
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.product.slug} product={item.product} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <Link href="/store" className="btn btn-secondary btn-sm">
          <ShoppingBag size={13} aria-hidden="true" />
          {t("cart.browse")}
        </Link>
      </div>
    </div>
  );
}
