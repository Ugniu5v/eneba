"use client";

import Link from "next/link";
import { BadgeCheck, Check, Star } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import type { ProductSummary } from "@/lib/types";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductSummary;
  priority?: boolean;
}) {
  const { addItem } = useCart();
  const { notify } = useToast();
  const { money, t, formatNumber } = usePreferences();
  const [added, setAdded] = useState(false);
  const offer = product.lowestOffer;
  const original =
    offer.originalPriceCents > offer.priceCents ? offer.originalPriceCents : null;

  const handleAdd = () => {
    const accepted = addItem(
      {
        offerId: offer.id,
        productSlug: product.slug,
        title: product.title,
        coverImage: product.coverImage,
        sellerName: offer.sellerName,
        platform: offer.platform,
        region: offer.region,
        unitPriceCents: offer.priceCents,
        originalPriceCents: offer.originalPriceCents,
        maxStock: offer.stock,
      },
      1,
    );
    if (!accepted) {
      notify(t("cart.maxQuantity"), "error");
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
    notify(`${product.title} — ${t("product.added").toLowerCase()}.`, "success", {
      href: "/cart",
      label: `${t("common.cart")} →`,
    });
  };

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-card border border-transparent bg-eneba-surface transition-all duration-200 hover:border-white/35 hover:shadow-[0_16px_40px_rgba(8,0,22,0.32)]">
      <WishlistButton
        product={product}
        className="absolute left-2.5 top-2.5 z-20"
      />
      <Link
        href={`/product/${product.slug}`}
        className="relative block overflow-hidden bg-[#20084d]"
        aria-label={product.title}
      >
        <div className="relative aspect-[3/4] w-full">
          <img
            src={product.coverImage}
            alt={`${product.title} cover`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0320]/35 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          {product.discountPercent > 0 ? (
            <span className="absolute right-2.5 top-2.5 bg-eneba-coral px-1.5 py-1 text-[11px] font-extrabold leading-none text-[#1a0616]">
              -{product.discountPercent}%
            </span>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 p-2.5">
            {product.cashbackPercent > 0 ? (
              <span className="inline-flex items-center gap-1 bg-[#071d21]/90 px-1.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-mint">
                <BadgeCheck size={11} strokeWidth={2.5} aria-hidden="true" />
                {t("product.cashbackShort", { percent: product.cashbackPercent })}
              </span>
            ) : null}
            {product.isNew ? (
              <span className="bg-eneba-yellow px-1.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-black">
                {t("common.new")}
              </span>
            ) : null}
          </div>

          {/* Consistent hover/focus preview used by every product card. */}
          <div className="card-popup absolute inset-x-0 bottom-0 border-t border-eneba-yellow/30 bg-[#16052d]/86 p-3 backdrop-blur-[2px]">
            <p className="line-clamp-2 text-[11px] font-medium leading-4 text-white/80">
              {product.subtitle}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-white/55">
              <span className="inline-flex items-center gap-1 font-bold text-eneba-yellow">
                <Star size={11} className="fill-eneba-yellow" aria-hidden="true" />
                {product.rating.toFixed(1)}
                <span className="font-normal text-white/45">
                  ({formatNumber(product.ratingCount)})
                </span>
              </span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span>
                {t("product.offers", { count: product.offerCount })}
              </span>
              <span className="text-white/25" aria-hidden="true">·</span>
              <span>{product.region}</span>
            </div>
            <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-eneba-yellow">
              {t("product.viewOffers")} <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-eneba-lilac">
          <span className="truncate">{product.platform}</span>
          <span className="text-white/20" aria-hidden="true">
            ·
          </span>
          <span className="truncate text-white/48">{product.region}</span>
        </p>
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 line-clamp-2 text-[13px] font-bold leading-[19px] text-white transition-colors group-hover:text-eneba-yellow"
        >
          {product.title}
        </Link>

        <div className="mt-auto pt-2">
          <div className="flex min-h-[24px] flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-[11px] text-white/52">{t("common.from")}</span>
            {original ? (
              <span className="text-[11px] text-white/42 line-through">
                {money(original)}
              </span>
            ) : null}
            <span className="ml-auto text-[18px] font-extrabold leading-none tracking-[-0.02em]">
              {money(offer.priceCents)}
            </span>
          </div>
          <div className="mt-2 grid gap-1.5">
            <button
              type="button"
              onClick={handleAdd}
              className="btn btn-primary h-9 min-h-9 w-full px-2 text-[12px]"
              aria-label={`${t("product.addToCart")} — ${product.title}, ${money(offer.priceCents)}`}
            >
              {added ? (
                <>
                  <Check size={14} aria-hidden="true" /> {t("product.added")}
                </>
              ) : (
                t("product.addToCart")
              )}
            </button>
            <Link
              href={`/product/${product.slug}`}
              className="btn btn-secondary h-9 min-h-9 w-full px-2 text-[12px]"
            >
              {t("product.viewOffers")}
              <span className="sr-only"> — {product.title}</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
