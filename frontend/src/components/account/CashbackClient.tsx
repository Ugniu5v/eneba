"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { CashbackResponse } from "@/lib/types";
import { EmptyState, ErrorPanel } from "../EmptyState";

export function CashbackClient() {
  const { t, money, formatDate, formatNumber } = usePreferences();
  const { data, loading, error, refetch } =
    useApiQuery<CashbackResponse>("/api/account/cashback");

  const summary = data?.cashback;
  const entries = summary?.entries ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-[-0.02em]">
            <Wallet size={19} className="text-eneba-yellow" aria-hidden="true" />
            {t("account.cashback")}
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-5 text-white/55">
            {t("account.cashbackDesc")}
          </p>
        </div>
        <Link href="/store" className="btn btn-secondary btn-sm w-fit">
          <ShoppingBag size={13} aria-hidden="true" />
          {t("account.continueShopping")}
        </Link>
      </div>

      {error ? (
        <ErrorPanel
          title={t("account.cashbackLoadFailed")}
          description={error.message}
          onRetry={refetch}
        />
      ) : loading ? (
        <>
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-64 w-full" />
        </>
      ) : !summary ? null : (
        <>
          <section className="border border-eneba-yellow/35 bg-eneba-yellow/[0.07] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-eneba-yellow">
                  <Sparkles size={13} aria-hidden="true" />
                  {t("account.cashbackBalance")}
                </p>
                <p className="mt-2 text-[38px] font-extrabold leading-none tracking-[-0.04em] sm:text-[46px]">
                  {money(summary.balanceCents)}
                </p>
                <p className="mt-3 max-w-md text-[12px] leading-5 text-white/62">
                  {t("account.cashbackBalanceNote")}
                </p>
              </div>
              <div className="grid w-full grid-cols-2 divide-x divide-white/10 border border-white/12 bg-black/[0.14] sm:w-auto">
                <div className="px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/38">
                    <ArrowDownLeft size={12} className="text-eneba-mint" aria-hidden="true" />
                    {t("account.cashbackEarnedTotal")}
                  </p>
                  <p className="mt-1 text-base font-extrabold text-eneba-mint">
                    {money(summary.earnedCents)}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/38">
                    <ArrowUpRight size={12} aria-hidden="true" />
                    {t("account.cashbackRedeemedTotal")}
                  </p>
                  <p className="mt-1 text-base font-extrabold">
                    {money(summary.redeemedCents)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
            <section aria-labelledby="cashback-history-heading">
              <div className="flex items-end justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h3 id="cashback-history-heading" className="text-base font-bold">
                    {t("account.cashbackHistory")}
                  </h3>
                  <p className="mt-1 text-[11px] text-white/42">
                    {t("account.cashbackHistoryDesc")}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-white/35">
                  {formatNumber(entries.length)}
                </span>
              </div>

              {entries.length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    icon={Coins}
                    title={t("account.cashbackEmpty")}
                    description={t("account.cashbackEmptyDesc")}
                    actionLabel={t("account.findSomething")}
                    actionHref="/store"
                  />
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-white/10 border border-white/12 bg-eneba-surface">
                  {entries.map((entry) => {
                    const earned = entry.amountCents > 0;
                    const Icon = earned ? ArrowDownLeft : ArrowUpRight;
                    return (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                      >
                        <span
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${
                            earned
                              ? "border-eneba-mint/35 bg-eneba-mint/[0.1] text-eneba-mint"
                              : "border-white/18 bg-white/[0.06] text-white/65"
                          }`}
                        >
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold">
                            {t(
                              earned
                                ? "account.cashbackEarned"
                                : "account.cashbackRedeemed",
                            )}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-white/42">
                            <span>{formatDate(entry.createdAt)}</span>
                            {entry.orderNumber ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <Link
                                  href={`/orders/${entry.orderNumber}`}
                                  className="font-bold text-white/62 hover:text-eneba-yellow"
                                >
                                  {t("account.cashbackOrder")} {entry.orderNumber}
                                </Link>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <p
                          className={`shrink-0 text-base font-extrabold tabular-nums ${
                            earned ? "text-eneba-mint" : "text-white/80"
                          }`}
                        >
                          {earned ? "+" : "−"}
                          {money(Math.abs(entry.amountCents))}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <aside className="border border-white/12 bg-black/[0.08] p-4">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">
                <Coins size={13} className="text-eneba-yellow" aria-hidden="true" />
                {t("account.cashbackHowItWorks")}
              </p>
              <ol className="mt-3 space-y-3">
                {[
                  t("account.cashbackStep1"),
                  t("account.cashbackStep2"),
                  t("account.cashbackStep3"),
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-[12px] leading-5 text-white/58">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-eneba-yellow text-[10px] font-extrabold text-black">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-4 text-white/35">
                {t("account.cashbackNoExpiry")}
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
