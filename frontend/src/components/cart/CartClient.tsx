"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck, ShoppingBag, Trash2, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { usePreferences } from "@/context/PreferencesContext";
import { Breadcrumbs } from "../Breadcrumbs";
import { EmptyState } from "../EmptyState";
import { QuantityStepper } from "../QuantityStepper";

export function CartClient() {
  const { items, hydrated, removeItem, setQuantity, subtotalCents, count } = useCart();
  const { user, loading } = useAuth();
  const { t, money, formatNumber } = usePreferences();

  if (!hydrated) {
    return (
      <div className="site-container py-10">
        <div className="skeleton h-7 w-52" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <div className="skeleton h-36 w-full" />
            <div className="skeleton h-36 w-full" />
          </div>
          <div className="skeleton h-72 w-full" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="site-container py-8 lg:py-12">
        <Breadcrumbs
          items={[{ label: t("common.home"), href: "/" }, { label: t("cart.title") }]}
        />
        <div className="mt-6">
          <EmptyState
            icon={ShoppingBag}
            title={t("cart.empty")}
            description={t("cart.emptyDesc")}
            actionLabel={t("cart.browse")}
            actionHref="/store"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="site-container py-6 lg:py-9">
      <Breadcrumbs
        items={[{ label: t("common.home"), href: "/" }, { label: t("cart.title") }]}
      />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-eneba-yellow">{t("cart.ready")}</p>
          <h1 className="mt-2 text-[30px] font-bold leading-none tracking-[-0.035em] sm:text-[36px]">
            {t("cart.title")}
          </h1>
          <p className="mt-2 text-sm text-white/52">
            {t("cart.itemCount", { count: formatNumber(count) })} ·{" "}
            {t("cart.sellerCount", {
              count: formatNumber(new Set(items.map((item) => item.sellerName)).size),
            })}
          </p>
        </div>
        <Link
          href="/store"
          className="text-xs font-bold text-eneba-yellow hover:underline"
        >
          {t("cart.continue")} →
        </Link>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="border border-white/12 bg-black/[0.055]">
          <div className="hidden grid-cols-[1fr_150px_140px] gap-4 border-b border-white/10 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.11em] text-white/35 md:grid">
            <span>{t("cart.product")}</span>
            <span>{t("cart.quantity")}</span>
            <span className="text-right">{t("cart.totalLabel")}</span>
          </div>
          <div className="divide-y divide-white/10">
            {items.map((item) => (
              <div
                key={item.lineId}
                className="grid gap-4 p-4 md:grid-cols-[1fr_150px_140px] md:items-center"
              >
                <div className="flex min-w-0 gap-3.5">
                  <Link href={`/product/${item.productSlug}`} className="shrink-0">
                    <img
                      src={item.coverImage}
                      alt={`${item.title} cover`}
                      className="h-[112px] w-[84px] border border-white/15 object-cover"
                    />
                  </Link>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eneba-lilac">
                      {item.platform} · {item.region}
                    </p>
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="mt-1 line-clamp-2 text-sm font-bold leading-5 hover:text-eneba-yellow"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1.5 text-[11px] text-white/42">
                      {t("cart.soldBy")}{" "}
                      <span className="text-white/65">{item.sellerName}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-white/42">
                      {money(item.unitPriceCents)} {t("cart.each")}
                      {item.originalPriceCents > item.unitPriceCents ? (
                        <span className="ml-1.5 line-through text-white/28">
                          {money(item.originalPriceCents)}
                        </span>
                      ) : null}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.lineId)}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-white/38 transition-colors hover:text-[#ffada2]"
                    >
                      <Trash2 size={12} aria-hidden="true" /> {t("common.remove")}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between md:block">
                  <span className="text-[10px] text-white/35 md:hidden">
                    {t("cart.quantity")}
                  </span>
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(value) => setQuantity(item.lineId, value)}
                    max={Math.min(5, item.maxStock)}
                    size="small"
                  />
                </div>
                <div className="flex items-baseline justify-between gap-2 border-t border-white/8 pt-3 md:block md:border-0 md:pt-0 md:text-right">
                  <span className="text-[10px] text-white/35 md:hidden">
                    {t("cart.totalLabel")}
                  </span>
                  <span className="text-lg font-extrabold">
                    {money(item.unitPriceCents * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-[11px] text-white/42">
            <LockKeyhole size={13} aria-hidden="true" />
            {t("cart.pricesVerified")}
          </div>
        </div>

        <aside className="border border-white/14 bg-eneba-surface p-5 lg:sticky lg:top-[144px]">
          <h2 className="text-base font-bold">{t("cart.orderSummary")}</h2>
          <dl className="mt-4 space-y-3 border-b border-white/10 pb-4 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-white/52">
                {t("cart.subtotalCount", { count: formatNumber(count) })}
              </dt>
              <dd className="font-bold">{money(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/52">{t("cart.digitalDelivery")}</dt>
              <dd className="font-bold text-eneba-mint">{t("cart.free")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/52">{t("cart.servicesFee")}</dt>
              <dd className="font-bold">{money(0)}</dd>
            </div>
          </dl>
          <div className="flex items-baseline justify-between gap-4 py-4">
            <span className="text-sm font-bold">{t("cart.total")}</span>
            <span className="text-2xl font-extrabold tracking-[-0.03em]">
              {money(subtotalCents)}
            </span>
          </div>

          {!loading && !user ? (
            <>
              <Link href="/login?next=/checkout" className="btn btn-primary w-full">
                {t("cart.loginCheckout")} <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <p className="mt-3 text-center text-[11px] text-white/42">
                {t("cart.newHere")}{" "}
                <Link
                  href="/register?next=/checkout"
                  className="font-bold text-eneba-yellow hover:underline"
                >
                  {t("cart.createAccount")}
                </Link>
              </p>
            </>
          ) : (
            <Link href="/checkout" className="btn btn-primary w-full">
              {t("cart.checkout")} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}

          <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-[11px] text-white/45">
            <li className="flex items-center gap-2">
              <Zap size={13} className="text-eneba-yellow" aria-hidden="true" />
              {t("cart.keysInstant")}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-eneba-mint" aria-hidden="true" />
              {t("cart.buyerProtection")}
            </li>
          </ul>
          <p className="mt-4 border border-white/10 bg-black/15 px-3 py-2 text-[10px] leading-4 text-white/35">
            {t("cart.testMode")}
          </p>
        </aside>
      </div>
    </div>
  );
}
