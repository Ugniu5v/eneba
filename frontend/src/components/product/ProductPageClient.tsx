"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ApiError } from "@/lib/api";
import { categoryLabel, genreLabel, regionLabel } from "@/lib/i18n";
import type { Offer, ProductPageResponse, ProductSummary } from "@/lib/types";
import { Breadcrumbs } from "../Breadcrumbs";
import { ErrorPanel } from "../EmptyState";
import { ProductCard } from "../ProductCard";
import { QuantityStepper } from "../QuantityStepper";
import { StarRating } from "../StarRating";
import { WishlistButton } from "../WishlistButton";

export function ProductPageClient({ slug }: { slug: string }) {
  const { t } = usePreferences();
  const { data, loading, error, refetch } = useApiQuery<ProductPageResponse>(
    `/api/storefront/products/${encodeURIComponent(slug)}`,
  );

  if (loading) return <ProductSkeleton />;

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="site-container py-20">
          <div className="mx-auto max-w-lg text-center">
            <p className="text-[80px] font-extrabold leading-none text-white/12">404</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
              {t("product.notFound")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {t("product.notFoundDesc")}
            </p>
            <Link href="/store" className="btn btn-primary mt-6">
              {t("product.browseStore")}
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="site-container py-16">
        <ErrorPanel
          title={t("product.fetchFailed")}
          description={error.message}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!data) return null;
  return (
    <ProductContent
      key={data.product.slug}
      product={data.product}
      related={data.related}
      variants={data.variants ?? []}
    />
  );
}

function ProductContent({
  product,
  related,
  variants,
}: {
  product: ProductPageResponse["product"];
  related: ProductSummary[];
  variants: ProductSummary[];
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { notify } = useToast();
  const { t, money, formatDate, formatNumber, language } = usePreferences();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const lowest = product.offers[0] ?? product.lowestOffer;

  // The seller we recommend is the highest rated one that still has stock;
  // official stores and price only break ties, so the recommendation does not
  // simply repeat the cheapest offer.
  const recommended = useMemo(() => {
    const pool = product.offers.filter((offer) => offer.stock > 0);
    const candidates = pool.length > 0 ? pool : product.offers;
    return (
      [...candidates].sort((a, b) => {
        if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
        if (b.sellerRating !== a.sellerRating) {
          return b.sellerRating - a.sellerRating;
        }
        if (b.sellerReviews !== a.sellerReviews) {
          return b.sellerReviews - a.sellerReviews;
        }
        return a.priceCents - b.priceCents;
      })[0] ?? product.lowestOffer
    );
  }, [product.offers, product.lowestOffer]);

  const recommendedTags = [
    recommended.isOfficial ? t("product.recommendedOfficial") : null,
    recommended.sellerRating >= 4.8 ? t("product.recommendedTopRated") : null,
    recommended.priceCents === lowest.priceCents
      ? t("product.recommendedBestPrice")
      : null,
  ].filter((tag): tag is string => Boolean(tag));
  if (recommendedTags.length === 0) {
    recommendedTags.push(t("product.recommendedVerified"));
  }

  // Every gift-card denomination is its own catalogue product, so the title,
  // description and prices on this page always describe exactly one SKU.
  const title = product.title;

  const addOffer = (offer: Offer, amount: number, goToCart = false) => {
    const accepted = addItem(
      {
        offerId: offer.id,
        productSlug: product.slug,
        title,
        coverImage: product.coverImage,
        sellerName: offer.sellerName,
        platform: offer.platform,
        region: offer.region,
        unitPriceCents: offer.priceCents,
        originalPriceCents: offer.originalPriceCents,
        maxStock: offer.stock,
      },
      amount,
    );
    if (!accepted) {
      notify("Maximum quantity reached for this offer.", "error");
      return;
    }
    if (goToCart) {
      router.push("/cart");
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
    notify(`${product.title} was added to your cart.`, "success", {
      href: "/cart",
      label: "View cart →",
    });
  };

  return (
    <>
      <div className="border-b border-white/10 bg-black/[0.055]">
        <div className="site-container py-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: t("common.store"), href: "/store" },
              {
                label: categoryLabel(language, product.category),
                href: `/store?category=${encodeURIComponent(product.category)}`,
              },
              { label: title },
            ]}
          />
        </div>
      </div>

      <div className="site-container pb-24 pt-6 md:pb-14 lg:pt-8">
        <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)] xl:gap-14">
          <div className="mx-auto w-full max-w-[330px] md:mx-0 md:max-w-none lg:sticky lg:top-[144px] lg:self-start">
            <div className="relative overflow-hidden border border-white/14 bg-eneba-surface">
              <img
                src={product.coverImage}
                alt={`${product.title} cover`}
                className="aspect-[3/4] w-full object-cover"
              />
              {product.discountPercent > 0 ? (
                <span className="absolute right-3 top-3 bg-eneba-coral px-2 py-1.5 text-xs font-extrabold text-black">
                  -{product.discountPercent}%
                </span>
              ) : null}
            </div>
            <div className="mt-2.5 grid grid-cols-3 divide-x divide-white/10 border border-white/12 bg-black/[0.08] text-center">
              <TrustItem
                icon={Zap}
                label={t("product.instant")}
                sublabel={t("product.delivery")}
              />
              <TrustItem
                icon={ShieldCheck}
                label={t("product.verified")}
                sublabel={t("product.sellers")}
              />
              <TrustItem
                icon={RotateCcw}
                label={t("product.digital")}
                sublabel={t("product.key")}
              />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold uppercase tracking-[0.1em]">
              <span className="border border-white/18 bg-white/[0.06] px-2 py-1">
                {t(`type.${product.productType}`, undefined, product.productType)}
              </span>
              <span className="text-white/52">{product.platform}</span>
              <span className="text-white/28" aria-hidden="true">
                /
              </span>
              <span className="text-white/52">
                {regionLabel(language, product.region)}
              </span>
              {product.isNew ? (
                <span className="bg-eneba-yellow px-2 py-1 text-black">New</span>
              ) : null}
            </div>

            <h1 className="mt-4 text-[32px] font-bold leading-[1.03] tracking-[-0.04em] sm:text-[42px] xl:text-[48px]">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] text-white/58">
              {product.subtitle}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StarRating
                rating={product.rating}
                count={product.ratingCount}
                size={16}
              />
              {product.badge ? (
                <span className="border border-eneba-yellow/40 bg-eneba-yellow/[0.08] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-eneba-yellow">
                  {product.badge}
                </span>
              ) : null}
            </div>

            <div className="mt-4 rounded-card border border-white/14 bg-eneba-surface">
              {variants.length > 1 ? (
                <div className="border-b border-white/10 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-white/42">
                    {t("product.giftValue")}
                  </p>
                  <p className="mt-1 text-[11px] text-white/42">
                    {t("product.giftValueHint")}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {variants.map((variant) => {
                      const selected = variant.slug === product.slug;
                      return (
                        <Link
                          key={variant.slug}
                          href={`/product/${variant.slug}`}
                          aria-label={`${variant.title}, ${money(variant.lowestOffer.priceCents)}`}
                          aria-current={selected ? "page" : undefined}
                          className={`relative flex flex-col items-start border px-2.5 py-2 text-left transition-colors ${
                            selected
                              ? "border-eneba-yellow bg-eneba-yellow/[0.08]"
                              : "border-white/12 bg-white/[0.025] hover:border-white/35"
                          }`}
                        >
                          <span className="text-[12px] font-bold leading-4">
                            {formatGiftValue(
                              variant.giftValueCents,
                              variant.giftCurrency,
                            )}
                          </span>
                          <span
                            className={`mt-0.5 text-[11px] leading-4 ${
                              selected ? "text-white/70" : "text-white/45"
                            }`}
                          >
                            {money(variant.lowestOffer.priceCents)}
                          </span>
                          {variant.discountPercent > 0 ? (
                            <span className="absolute right-1 top-1 bg-eneba-coral px-1 py-0.5 text-[8px] font-extrabold leading-3 text-black">
                              -{variant.discountPercent}%
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 p-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-white/42">
                    {t("product.bestPrice")}
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
                    <span className="text-[36px] font-extrabold leading-none tracking-[-0.045em]">
                      {money(lowest.priceCents)}
                    </span>
                    {lowest.originalPriceCents > lowest.priceCents ? (
                      <span className="text-sm text-white/38 line-through">
                        {money(lowest.originalPriceCents)}
                      </span>
                    ) : null}
                    {product.discountPercent > 0 ? (
                      <span className="text-[11px] font-bold text-eneba-coral">
                        {t("product.save", { percent: product.discountPercent })}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p className="flex items-center justify-end gap-1.5 font-bold text-eneba-mint">
                    <BadgeCheck size={14} aria-hidden="true" />
                    {t("product.cashback", { percent: product.cashbackPercent })}
                  </p>
                  <p className="mt-1 text-[11px] text-white/42">
                    {t("product.instant")} {t("product.delivery")}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Meta label={t("product.seller")} value={lowest.sellerName} />
                  <Meta
                    label={t("product.region")}
                    value={regionLabel(language, lowest.region)}
                  />
                  <Meta label={t("product.platform")} value={lowest.platform} />
                  <Meta
                    label={t("product.availability")}
                    value={t("product.inStock", { count: lowest.stock })}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/50">{t("product.quantity")}</span>
                    <span className="text-white/38">{t("product.maxPerOffer")}</span>
                  </div>
                  <div className="mt-2 flex items-stretch gap-2">
                    <QuantityStepper
                      value={quantity}
                      onChange={setQuantity}
                      max={Math.min(5, lowest.stock)}
                    />
                    <button
                      type="button"
                      onClick={() => addOffer(lowest, quantity)}
                      className="btn btn-primary min-h-[42px] flex-1 px-3 text-[13px]"
                    >
                      {added ? (
                        <>
                          <Check size={15} aria-hidden="true" /> {t("product.added")}
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={15} aria-hidden="true" />{" "}
                          {t("product.addToCart")}
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => addOffer(lowest, quantity, true)}
                    className="btn btn-secondary mt-2 min-h-10 w-full text-xs"
                  >
                    {t("product.buyNow")}
                  </button>
                  <WishlistButton
                    product={product}
                    variant="button"
                    className="mt-2 w-full"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-eneba-mint" aria-hidden="true" />
                {t("product.buyerProtection")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap size={13} className="text-eneba-yellow" aria-hidden="true" />
                {t("product.keyDelivery")}
              </span>
            </div>
          </div>
        </div>

        <section
          className="mt-8 lg:mt-10"
          aria-labelledby="recommended-seller-heading"
        >
          <div className="border border-eneba-yellow/35 bg-eneba-yellow/[0.05]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-eneba-yellow/20 px-4 py-2.5 sm:px-5">
              <p className="eyebrow text-eneba-yellow">
                {t("product.recommendedSeller")}
              </p>
              <a
                href="#offers-heading"
                className="text-[11px] font-bold text-white/55 transition-colors hover:text-eneba-yellow"
              >
                {t("product.compareAllOffers", {
                  count: formatNumber(product.offers.length),
                })}{" "}
                <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:gap-8">
              <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#4b20a6] text-sm font-extrabold">
                  {recommended.sellerName
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <h2
                    id="recommended-seller-heading"
                    className="text-[17px] font-bold leading-tight tracking-[-0.02em]"
                  >
                    {recommended.sellerName}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/48">
                    <span className="inline-flex items-center gap-1 font-bold text-eneba-yellow">
                      <Star
                        size={11}
                        className="fill-eneba-yellow"
                        aria-hidden="true"
                      />
                      {recommended.sellerRating.toFixed(1)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {formatNumber(recommended.sellerReviews)}{" "}
                      {t("product.reviewsLower")}
                    </span>
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {recommendedTags.map((tag) => (
                      <span
                        key={tag}
                        className="border border-eneba-yellow/35 bg-eneba-yellow/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-yellow"
                      >
                        {tag}
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs sm:grid-cols-4 lg:w-[330px]">
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                    {t("product.region")}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {regionLabel(language, recommended.region)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                    {t("product.platform")}
                  </dt>
                  <dd className="mt-1 font-medium">{recommended.platform}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                    {t("product.delivery")}
                  </dt>
                  <dd className="mt-1 font-medium">{recommended.delivery}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                    {t("product.availability")}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {t("product.inStock", { count: recommended.stock })}
                  </dd>
                </div>
              </dl>

              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-4 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
                <div className="lg:text-right">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                    {t("store.priceChip")}
                  </p>
                  <p className="mt-1 text-lg font-extrabold leading-none tracking-[-0.02em]">
                    {money(recommended.priceCents)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addOffer(recommended, 1)}
                  className="btn btn-primary h-10 min-h-10 shrink-0 px-3 text-[12px]"
                >
                  <ShoppingCart size={14} aria-hidden="true" />
                  {t("product.addToCart")}
                  <span className="sr-only">
                    {" "}
                    — {recommended.sellerName}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 lg:mt-14" aria-labelledby="offers-heading">
          <div className="flex flex-col justify-between gap-2 border-b border-white/12 pb-3 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow text-eneba-yellow">{t("product.compareChoose")}</p>
              <h2
                id="offers-heading"
                className="mt-1.5 scroll-mt-32 text-[24px] font-bold tracking-[-0.025em]"
              >
                {t("product.offersHeading", { count: product.offers.length })}
              </h2>
            </div>
            <p className="text-[11px] text-white/42">
              {t("product.pricesNote")}
            </p>
          </div>

          <div className="mt-3 overflow-hidden border border-white/12">
            <div className="hidden grid-cols-[minmax(0,1.65fr)_minmax(0,0.8fr)_minmax(0,0.65fr)_220px] items-center gap-3 border-b border-white/10 bg-black/15 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.11em] text-white/38 md:grid">
              <span>{t("product.seller")}</span>
              <span>{t("product.region")}</span>
              <span>{t("product.availability")}</span>
              <span className="text-right">{t("store.priceChip")}</span>
            </div>
            <div className="divide-y divide-white/10 bg-eneba-surface">
              {product.offers.map((offer, index) => (
                <div
                  key={offer.id}
                  className={`offer-row grid gap-3 px-4 py-4 transition-colors duration-150 hover:bg-white/[0.055] md:grid-cols-[minmax(0,1.65fr)_minmax(0,0.8fr)_minmax(0,0.65fr)_220px] md:items-center ${
                    index === 0 ? "bg-white/[0.035]" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#4b20a6] text-[11px] font-extrabold">
                      {offer.sellerName
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                        <span className="truncate">{offer.sellerName}</span>
                        {index === 0 ? (
                          <span className="bg-eneba-yellow px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.08em] text-black">
                            {t("product.bestPriceBadge")}
                          </span>
                        ) : null}
                        {offer.isOfficial ? (
                          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-mint">
                            {t("product.official")}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/42">
                        <span className="text-eneba-yellow">★</span>
                        {offer.sellerRating.toFixed(1)} ·{" "}
                        {formatNumber(offer.sellerReviews)} {t("product.reviewsLower")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs md:block">
                    <span className="text-white/38 md:hidden">{t("product.region")}</span>
                    <span>{regionLabel(language, offer.region)}</span>
                    <span className="mt-0.5 block text-[10px] text-white/32">
                      {offer.platform}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs md:block">
                    <span className="text-white/38 md:hidden">
                      {t("product.availability")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-eneba-mint" aria-hidden="true" />
                      {t("product.inStock", { count: offer.stock })}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-white/32">
                      {t("product.instant")} {t("product.delivery")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3 md:justify-end md:border-0 md:pt-0">
                    <span className="text-lg font-extrabold">
                      {money(offer.priceCents)}
                    </span>
                    <button
                      type="button"
                      onClick={() => addOffer(offer, 1)}
                      className={`offer-action btn h-9 min-h-9 w-[118px] shrink-0 justify-center px-2 text-[11px] ${
                        index === 0 ? "btn-primary" : "btn-secondary"
                      }`}
                      aria-label={t("product.addOffer", { seller: offer.sellerName })}
                    >
                      <ShoppingCart size={13} aria-hidden="true" />
                      {t("product.addToCart")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 border-t border-white/10 pt-8 lg:grid-cols-[1.55fr_1fr] lg:gap-14">
          <div>
            <h2 className="text-[23px] font-bold tracking-[-0.025em]">
              {t("product.about")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
              {product.description}
            </p>
            {product.features.length > 0 ? (
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[13px] text-white/66">
                    <Check size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-eneba-mint" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            ) : null}
            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-4">
              <Meta label={t("product.developer")} value={product.developer} />
              <Meta label={t("product.publisher")} value={product.publisher} />
              <Meta label={t("product.releaseDate")} value={formatDate(product.releaseDate)} />
              <Meta label={t("store.genre")} value={genreLabel(language, product.genre)} />
            </dl>
          </div>

          <div className="border border-white/12 bg-black/[0.08] p-5">
            <p className="eyebrow text-eneba-yellow">{t("product.howItWorks")}</p>
            <h2 className="mt-2 text-lg font-bold">{t("product.howItWorksTitle")}</h2>
            <ol className="mt-4 space-y-4">
              {[
                t("product.step1"),
                t("product.step2"),
                t("product.step3"),
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-[13px] leading-5 text-white/62">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-eneba-yellow/40 text-[10px] font-extrabold text-eneba-yellow">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="mt-5 border-t border-white/10 pt-4 text-[11px] leading-5 text-white/38">
              {t("product.demoNote")}
            </div>
          </div>
        </section>

        {related.length > 0 ? (
          <section className="mt-12 border-t border-white/10 pt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="eyebrow text-eneba-yellow">{t("product.keepExploring")}</p>
                <h2 className="mt-1.5 text-[24px] font-bold tracking-[-0.025em]">
                  {t("product.moreLikeThis")}
                </h2>
              </div>
              <Link
                href={`/store?category=${encodeURIComponent(product.category)}`}
                className="text-xs font-bold text-eneba-yellow hover:underline"
              >
                {t("product.seeAll")}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-[#21074f]/98 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">
              {t("product.bestPriceLabel")}
            </p>
            <p className="text-lg font-extrabold">{money(lowest.priceCents)}</p>
          </div>
          <button
            type="button"
            onClick={() => addOffer(lowest, quantity)}
            className="btn btn-primary min-h-10 flex-1 max-w-[190px] text-[12px]"
          >
            <ShoppingCart size={14} aria-hidden="true" /> {t("product.addToCart")}
          </button>
        </div>
      </div>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[12px] font-medium leading-4 text-white/78">
        {value}
      </dd>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  label,
  sublabel,
}: {
  icon: typeof Zap;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="px-2 py-3">
      <Icon size={15} className="mx-auto text-eneba-yellow" aria-hidden="true" />
      <p className="mt-1.5 text-[10px] font-bold leading-3">{label}</p>
      <p className="text-[9px] leading-3 text-white/38">{sublabel}</p>
    </div>
  );
}

function formatGiftValue(cents: number, currency: string): string {
  return `${cents / 100} ${currency}`;
}

function ProductSkeleton() {
  return (
    <div className="site-container py-8">
      <div className="skeleton h-3 w-56" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div>
          <div className="skeleton aspect-[3/4] w-full" />
          <div className="skeleton mt-3 h-14 w-full" />
        </div>
        <div>
          <div className="skeleton h-3 w-36" />
          <div className="skeleton mt-4 h-10 w-4/5" />
          <div className="skeleton mt-3 h-4 w-2/3" />
          <div className="skeleton mt-5 h-5 w-48" />
          <div className="skeleton mt-7 h-[230px] w-full" />
          <div className="skeleton mt-3 h-5 w-72" />
        </div>
      </div>
      <div className="mt-12">
        <div className="skeleton h-7 w-64" />
        <div className="skeleton mt-4 h-[220px] w-full" />
      </div>
      <span className="sr-only">Loading product…</span>
    </div>
  );
}
