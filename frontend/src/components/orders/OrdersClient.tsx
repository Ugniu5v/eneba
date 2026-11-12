"use client";

import Link from "next/link";
import { ArrowRight, PackageOpen, ShoppingBag } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { OrdersResponse } from "@/lib/types";
import { Breadcrumbs } from "../Breadcrumbs";
import { EmptyState, ErrorPanel } from "../EmptyState";

export function OrdersClient({ variant = "page" }: { variant?: "page" | "account" }) {
  const { t, money, formatDate, formatNumber } = usePreferences();
  const { data, loading, error, refetch } = useApiQuery<OrdersResponse>("/api/orders");
  const account = variant === "account";

  return (
    <div className={account ? "" : "site-container py-6 lg:py-9"}>
      {!account ? (
        <>
          <Breadcrumbs
            items={[
              { label: t("common.home"), href: "/" },
              { label: t("account.orders") },
            ]}
          />
          <div className="mt-4 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-eneba-yellow">{t("account.private")}</p>
              <h1 className="mt-2 text-[30px] font-bold leading-none tracking-[-0.035em] sm:text-[36px]">
                {t("account.orders")}
              </h1>
              <p className="mt-2 text-sm text-white/52">{t("account.ordersDesc")}</p>
            </div>
            <Link href="/store" className="btn btn-secondary btn-sm">
              <ShoppingBag size={13} aria-hidden="true" /> {t("account.continueShopping")}
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em]">{t("account.orders")}</h2>
            <p className="mt-1 text-[13px] leading-5 text-white/55">
              {t("account.ordersDesc")}
            </p>
          </div>
          <Link href="/store" className="btn btn-secondary btn-sm w-fit">
            <ShoppingBag size={13} aria-hidden="true" /> {t("account.continueShopping")}
          </Link>
        </div>
      )}

      <div className={account ? "mt-4" : "mt-6"}>
        {error ? (
          <ErrorPanel
            title={t("account.ordersLoadFailed")}
            description={error.message}
            onRetry={refetch}
          />
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="skeleton h-48 w-full" />
            ))}
          </div>
        ) : !data || data.orders.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={t("account.ordersEmpty")}
            description={t("account.ordersEmptyDesc")}
            actionLabel={t("account.findSomething")}
            actionHref="/store"
          />
        ) : (
          <div className="space-y-3">
            {data.orders.map((order) => (
              <article
                key={order.number}
                className="grid gap-5 border border-white/12 bg-eneba-surface p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_220px]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 pb-3">
                    <p className="font-mono text-sm font-bold">{order.number}</p>
                    <span className="inline-flex items-center gap-1.5 border border-eneba-mint/35 bg-eneba-mint/[0.08] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-mint">
                      <span className="size-1.5 rounded-full bg-eneba-mint" aria-hidden="true" />
                      {order.status}
                    </span>
                    <span className="ml-auto text-[11px] text-white/38">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {order.items.slice(0, 4).map((item) => (
                        <img
                          key={`${order.number}-${item.productSlug}`}
                          src={item.coverImage}
                          alt=""
                          className="h-[72px] w-[54px] border border-white/18 object-cover"
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-bold">
                        {order.items.map((item) => item.productTitle).join(", ")}
                      </p>
                      <p className="mt-1 text-[11px] text-white/42">
                        {formatNumber(order.itemCount)}{" "}
                        {order.itemCount === 1 ? t("common.key") : t("common.keys")} ·{" "}
                        {t("account.cardEnding")} {order.cardLast4} ·{" "}
                        {t("account.simulated")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-4 border-t border-white/8 pt-3 lg:flex-col lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <div className="lg:w-full lg:text-right">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                      {t("account.orderTotal")}
                    </p>
                    <p className="mt-1 text-xl font-extrabold">
                      {money(order.totalCents)}
                    </p>
                    {order.cashbackEarnedCents > 0 ? (
                      <p className="mt-1 text-[10px] font-bold text-eneba-mint">
                        {t("account.cashbackEarnedOn", {
                          amount: money(order.cashbackEarnedCents),
                        })}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/orders/${order.number}`}
                    className="btn btn-primary btn-sm shrink-0 lg:w-full"
                  >
                    {t("account.viewOrder")} <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {!account ? (
        <div className="mt-8 border-t border-white/10 pt-5 text-center text-[11px] leading-5 text-white/38">
          {t("account.needHelp")}{" "}
          <Link
            href="/help"
            className="font-bold text-white/65 underline underline-offset-3 hover:text-white"
          >
            {t("account.deliveryHelp")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
