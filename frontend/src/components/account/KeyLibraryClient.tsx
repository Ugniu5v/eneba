"use client";

import Link from "next/link";
import {
  Check,
  Copy,
  KeyRound,
  LockKeyhole,
  Package,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { OrdersResponse } from "@/lib/types";
import { EmptyState, ErrorPanel } from "../EmptyState";

export function KeyLibraryClient() {
  const { t, formatDate, formatNumber } = usePreferences();
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const { data, loading, error, refetch } = useApiQuery<OrdersResponse>("/api/orders");

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const term = search.trim().toLowerCase();

  const filteredOrders = useMemo(
    () =>
      orders
        .map((order) => ({
          ...order,
          items: order.items
            .map((item) => ({
              ...item,
              keys: item.keys.filter((key) => {
                if (!term) return true;
                return (
                  key.code.toLowerCase().includes(term) ||
                  item.productTitle.toLowerCase().includes(term) ||
                  order.number.toLowerCase().includes(term)
                );
              }),
            }))
            .filter((item) => item.keys.length > 0),
        }))
        .filter((order) => order.items.length > 0),
    [orders, term],
  );

  const pendingOrders = orders.filter((order) => !order.keysConfirmed).length;

  const totalKeys = orders.reduce(
    (total, order) =>
      total + order.items.reduce((sum, item) => sum + item.keys.length, 0),
    0,
  );
  const shownKeys = filteredOrders.reduce(
    (total, order) =>
      total + order.items.reduce((sum, item) => sum + item.keys.length, 0),
    0,
  );

  const copy = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(code);
      window.setTimeout(() => setCopied(""), 1400);
      notify(t("account.copiedKey"), "success");
    } catch {
      notify("Couldn't copy automatically. Select the key and copy it.", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-[-0.02em]">
            <KeyRound size={19} className="text-eneba-yellow" aria-hidden="true" />
            {t("account.keys")}
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-5 text-white/55">
            {t("account.keysDesc")}
          </p>
        </div>
        <Link href="/store" className="btn btn-secondary btn-sm w-fit">
          <ShoppingBag size={13} aria-hidden="true" />
          {t("account.continueShopping")}
        </Link>
      </div>

      {!loading && !error && pendingOrders > 0 ? (
        <div className="flex flex-col gap-3 border border-eneba-yellow/40 bg-eneba-yellow/[0.06] p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 leading-5 text-white/70">
            <LockKeyhole
              size={15}
              className="mt-0.5 shrink-0 text-eneba-yellow"
              aria-hidden="true"
            />
            {t("account.keysAwaiting", {
              count: formatNumber(pendingOrders),
            })}
          </p>
          <Link
            href="/orders"
            className="btn btn-secondary btn-sm w-fit shrink-0"
          >
            {t("account.confirmKeysNow")}
          </Link>
        </div>
      ) : null}

      {error ? (
        <ErrorPanel
          title={t("account.keysLoadFailed")}
          description={error.message}
          onRetry={refetch}
        />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="skeleton h-44 w-full" />
          ))}
        </div>
      ) : totalKeys === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={t("account.noKeys")}
          description={t("account.keysEmptyDesc")}
          actionLabel={t("account.findSomething")}
          actionHref="/store"
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-[300px]">
              <Search
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("account.searchKeys")}
                aria-label={t("account.searchKeys")}
                className="field h-10 min-h-10 pl-9 pr-3 text-xs"
              />
            </div>
            <p className="text-[11px] text-white/45" aria-live="polite">
              {(() => {
                const count = term ? shownKeys : totalKeys;
                return t(count === 1 ? "account.keyCountOne" : "account.keyCount", {
                  count: formatNumber(count),
                });
              })()}
            </p>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="border border-white/12 bg-black/[0.08] px-5 py-10 text-center text-sm text-white/55">
              {t("account.noKeyMatches")}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <article
                  key={order.number}
                  className="border border-white/12 bg-eneba-surface"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-white/10 px-4 py-3">
                    <Link
                      href={`/orders/${order.number}`}
                      className="font-mono text-[12px] font-bold hover:text-eneba-yellow"
                    >
                      {order.number}
                    </Link>
                    <span className="inline-flex items-center gap-1.5 border border-eneba-mint/35 bg-eneba-mint/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-mint">
                      <span className="size-1.5 rounded-full bg-eneba-mint" aria-hidden="true" />
                      {order.status}
                    </span>
                    <span className="text-[11px] text-white/38">
                      {formatDate(order.createdAt)}
                    </span>
                    <Link
                      href={`/orders/${order.number}`}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-eneba-yellow hover:underline"
                    >
                      <Package size={12} aria-hidden="true" />
                      {t("account.viewOrder")}
                    </Link>
                  </div>

                  <div className="divide-y divide-white/8">
                    {order.items.map((item) => (
                      <div
                        key={`${order.number}-${item.productSlug}`}
                        className="flex flex-col gap-3 p-4 sm:flex-row"
                      >
                        <img
                          src={item.coverImage}
                          alt=""
                          className="h-[82px] w-[62px] shrink-0 border border-white/15 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/product/${item.productSlug}`}
                            className="line-clamp-1 text-sm font-bold hover:text-eneba-yellow"
                          >
                            {item.productTitle}
                          </Link>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">
                            {item.platform} · {item.region} · {t("product.seller")}:{" "}
                            {item.sellerName}
                          </p>
                          <div className="mt-2.5 grid gap-1.5">
                            {item.keys.map((key) => (
                              <div
                                key={key.code}
                                className="flex items-center gap-2 border border-white/12 bg-black/20 px-2.5 py-1.5"
                              >
                                <code className="min-w-0 flex-1 truncate font-mono text-[12px] tracking-[0.03em] text-white/85">
                                  {key.code}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => copy(key.code)}
                                  className="inline-flex h-7 shrink-0 items-center gap-1 bg-eneba-yellow px-2 text-[10px] font-extrabold text-black transition-colors hover:bg-eneba-yellow-bright"
                                  aria-label={`${t("account.copyKey")} — ${item.productTitle}`}
                                >
                                  {copied === key.code ? (
                                    <Check size={12} aria-hidden="true" />
                                  ) : (
                                    <Copy size={12} aria-hidden="true" />
                                  )}
                                  {copied === key.code ? t("common.copied") : t("common.copy")}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
