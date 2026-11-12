"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  LockKeyhole,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ApiError } from "@/lib/api";
import type { Order, OrderResponse } from "@/lib/types";
import { Breadcrumbs } from "../Breadcrumbs";
import { EmptyState, ErrorPanel } from "../EmptyState";
import { KeysVerification } from "./KeysVerification";
import { PurchaseConfirmation } from "./PurchaseConfirmation";

export function OrderDetailClient({ number }: { number: string }) {
  const { data, loading, error, refetch } = useApiQuery<OrderResponse>(
    `/api/orders/${encodeURIComponent(number)}`,
  );
  const { notify } = useToast();
  const router = useRouter();
  const { t, money, formatDateTime } = usePreferences();
  const [justPurchased, setJustPurchased] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const params = new URLSearchParams(window.location.search);
    setJustPurchased(params.get("new") === "1");
  }, [number]);

  const closeConfirmation = useCallback(() => {
    setJustPurchased(false);
    router.replace(`/orders/${encodeURIComponent(number)}`, { scroll: false });
  }, [number, router]);

  // The confirmation endpoint returns the order with its keys; keeping that
  // response in local state reveals the keys immediately without a refetch.
  const applyConfirmedOrder = useCallback((next: Order) => {
    setConfirmedOrder(next);
  }, []);

  const copyText = async (text: string, label = "Key") => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      notify(`${label} copied to clipboard.`);
    } catch {
      notify("Couldn’t copy automatically. Select the code and copy it.", "error");
    }
  };

  if (loading) {
    return (
      <div className="site-container py-10">
        <div className="skeleton h-4 w-56" />
        <div className="skeleton mt-5 h-10 w-72" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="skeleton h-72 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="site-container py-12">
          <EmptyState
            icon={PackageOpen}
            title="Order not found"
            description="This order doesn't exist or belongs to another account."
            actionLabel={t("account.orders")}
            actionHref="/account/orders"
          />
        </div>
      );
    }
    return (
      <div className="site-container py-12">
        <ErrorPanel
          title="This order couldn’t be loaded"
          description={error.message}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!data) return null;
  const order = confirmedOrder ?? data.order;
  const allKeys = order.items.flatMap((item) => item.keys.map((key) => key.code));

  return (
    <div className="site-container py-6 lg:py-9">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("account.orders"), href: "/account/orders" },
          { label: order.number },
        ]}
      />

      <div className="mt-5 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-eneba-yellow">Order confirmed</p>
          <h1 className="mt-2 font-mono text-[27px] font-bold leading-none tracking-[-0.02em] sm:text-[32px]">
            {order.number}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {t("account.placed")} {formatDateTime(order.createdAt)} ·{" "}
            {order.itemCount} {t("product.digital").toLowerCase()}{" "}
            {order.itemCount === 1 ? t("common.item") : t("common.items")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-eneba-mint/35 bg-eneba-mint/[0.08] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-eneba-mint">
            <span className="size-1.5 rounded-full bg-eneba-mint" aria-hidden="true" />
            {order.status}
          </span>
          {order.keysConfirmed && allKeys.length > 1 ? (
            <button
              type="button"
              onClick={() => copyText(allKeys.join("\n"), "All keys")}
              className="btn btn-secondary btn-sm"
            >
              <Copy size={13} aria-hidden="true" /> {t("order.copyAll")}
            </button>
          ) : null}
          <Link href="/account/orders" className="btn btn-secondary btn-sm">
            <ArrowLeft size={13} aria-hidden="true" /> {t("account.allOrders")}
          </Link>
        </div>
      </div>

      {!order.keysConfirmed ? (
        <div className="mt-5">
          <KeysVerification order={order} onConfirmed={applyConfirmedOrder} />
        </div>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="space-y-4">
          {order.items.map((item, itemIndex) => (
            <article key={`${item.productSlug}-${itemIndex}`} className="border border-white/12 bg-eneba-surface">
              <div className="flex gap-4 p-4">
                <Link href={`/product/${item.productSlug}`} className="shrink-0">
                  <img
                    src={item.coverImage}
                    alt={`${item.productTitle} cover`}
                    className="h-[108px] w-[81px] border border-white/14 object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.productSlug}`}
                    className="line-clamp-2 text-sm font-bold leading-5 hover:text-eneba-yellow"
                  >
                    {item.productTitle}
                  </Link>
                  <p className="mt-1 text-[11px] text-white/42">
                    {item.platform} · {item.region} · Sold by {item.sellerName}
                  </p>
                  <p className="mt-2 text-[11px] text-white/42">
                    {t("checkout.qty")} {item.quantity} × {money(item.unitPriceCents)}
                  </p>
                  <p className="mt-1 text-sm font-extrabold">
                    {money(item.lineTotalCents)}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">
                    <KeyRound size={13} className="text-eneba-yellow" aria-hidden="true" />
                    Digital {item.quantity === 1 ? "key" : "keys"}
                  </p>
                  {order.keysConfirmed ? (
                    <span className="text-[9px] text-white/30">Click to copy</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-yellow">
                      <LockKeyhole size={11} aria-hidden="true" />
                      {t("order.keysLocked")}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 space-y-2">
                  {order.keysConfirmed ? (
                    item.keys.map((key, keyIndex) => (
                      <div
                        key={key.code}
                        className="group flex flex-col gap-2 border border-white/14 bg-[#1b0738] p-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">
                            Key {keyIndex + 1}
                          </p>
                          <code className="mt-1 block break-all font-mono text-[14px] font-bold tracking-[0.08em] text-white sm:text-[16px]">
                            {key.code}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(key.code, `Key ${keyIndex + 1}`)}
                          className="btn btn-secondary btn-sm shrink-0 self-start sm:self-center"
                          aria-label={`Copy key ${keyIndex + 1}`}
                        >
                          <Copy size={13} aria-hidden="true" /> {t("common.copy")}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="flex items-start gap-2 border border-dashed border-white/18 bg-black/15 p-3 text-[11px] leading-4 text-white/45">
                      <LockKeyhole
                        size={13}
                        className="mt-0.5 shrink-0 text-eneba-yellow"
                        aria-hidden="true"
                      />
                      {t("order.keysLockedDesc")}
                    </p>
                  )}
                </div>
                <p className="mt-3 text-[10px] leading-4 text-white/32">
                  This order is stored privately against your account. In a live
                  marketplace, keys would also be delivered by email.
                </p>
              </div>
            </article>
          ))}

          <div className="flex flex-col justify-between gap-3 border border-white/12 bg-black/[0.06] p-4 text-xs sm:flex-row sm:items-center">
            <p className="text-white/48">
              Need help activating a product? Read the redemption notes.
            </p>
            <Link href="/help" className="font-bold text-eneba-yellow hover:underline">
              How to redeem →
            </Link>
          </div>
        </div>

        <aside className="border border-white/14 bg-eneba-surface p-5 lg:sticky lg:top-[144px]">
          <h2 className="text-base font-bold">{t("order.paymentSummary")}</h2>
          <dl className="mt-4 space-y-3 border-b border-white/10 pb-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-white/48">{t("checkout.subtotal")}</dt>
              <dd className="font-bold">{money(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/48">{t("order.servicesFee")}</dt>
              <dd className="font-bold">{money(order.feeCents)}</dd>
            </div>
            {order.cashbackUsedCents > 0 ? (
              <div className="flex justify-between">
                <dt className="text-eneba-mint">{t("order.cashbackApplied")}</dt>
                <dd className="font-bold text-eneba-mint">
                  −{money(order.cashbackUsedCents)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-white/48">{t("order.payment")}</dt>
              <dd className="font-bold">
                {t("account.cardEnding")} {order.cardLast4}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/48">{t("order.mode")}</dt>
              <dd className="font-bold text-eneba-yellow">
                {t("order.testPayment")}
              </dd>
            </div>
            {order.cashbackEarnedCents > 0 ? (
              <div className="flex justify-between">
                <dt className="text-eneba-mint">{t("order.cashbackEarned")}</dt>
                <dd className="font-bold text-eneba-mint">
                  +{money(order.cashbackEarnedCents)}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="flex items-baseline justify-between py-4">
            <span className="text-sm font-bold">{t("order.totalPaid")}</span>
            <span className="text-2xl font-extrabold tracking-[-0.03em]">
              {money(order.totalCents)}
            </span>
          </div>
          <div className="space-y-2 border-t border-white/10 pt-4 text-[11px] text-white/42">
            <p className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-eneba-mint" aria-hidden="true" />
              No real card was charged
            </p>
            <p className="flex items-center gap-2">
              <Check size={13} className="text-eneba-mint" aria-hidden="true" />
              Unique keys reserved from inventory
            </p>
          </div>
          <div className="mt-5 grid gap-2">
            <Link href="/store" className="btn btn-primary text-xs">
              {t("account.continueShopping")}
            </Link>
            <Link href="/account/orders" className="btn btn-secondary text-xs">
              {t("account.allOrders")}
            </Link>
          </div>
        </aside>
      </div>

      {justPurchased ? (
        <PurchaseConfirmation
          order={order}
          onClose={closeConfirmation}
          onConfirmed={applyConfirmedOrder}
        />
      ) : null}
    </div>
  );
}
