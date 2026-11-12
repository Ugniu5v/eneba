"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  Zap,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiRequest, errorMessage } from "@/lib/api";
import type { CashbackResponse, CheckoutResponse } from "@/lib/types";
import { Breadcrumbs } from "../Breadcrumbs";
import { EmptyState } from "../EmptyState";

const TEST_CARD = {
  number: "4242 4242 4242 4242",
  name: "Alex Morgan",
  expiry: "12/30",
  cvc: "123",
};

export function CheckoutClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, money, currency } = usePreferences();
  const { items, hydrated, subtotalCents, clearCart } = useCart();
  const cashback = useApiQuery<CashbackResponse>(
    user ? "/api/account/cashback" : null,
  );
  const [applyCashback, setApplyCashback] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardholder, setCardholder] = useState(user?.displayName ?? "");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const cashbackBalance = cashback.data?.cashback.balanceCents ?? 0;
  const cashbackApplied = applyCashback
    ? Math.min(cashbackBalance, subtotalCents)
    : 0;
  const payableCents = subtotalCents - cashbackApplied;

  if (!hydrated) {
    return (
      <div className="site-container py-10">
        <div className="skeleton h-7 w-56" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="skeleton h-[420px] w-full" />
          <div className="skeleton h-72 w-full" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="site-container py-10">
        <Breadcrumbs
          items={[
            { label: t("common.home"), href: "/" },
            { label: t("cart.title"), href: "/cart" },
            { label: t("checkout.title") },
          ]}
        />
        <div className="mt-6">
          <EmptyState
            icon={ShoppingBag}
            title={t("checkout.nothingTitle")}
            description={t("checkout.nothingDesc")}
            actionLabel={t("checkout.browse")}
            actionHref="/store"
          />
        </div>
      </div>
    );
  }

  const useTestCard = () => {
    setCardNumber(TEST_CARD.number);
    setCardholder(user?.displayName || TEST_CARD.name);
    setExpiry(TEST_CARD.expiry);
    setCvc(TEST_CARD.cvc);
    setFormError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length !== 16) {
      setFormError(t("checkout.errCard"));
      return;
    }
    if (cardholder.trim().length < 2) {
      setFormError(t("checkout.errName"));
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      setFormError(t("checkout.errExpiry"));
      return;
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      setFormError(t("checkout.errCvc"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await apiRequest<CheckoutResponse>("/api/checkout", {
        method: "POST",
        body: {
          items: items.map((item) => ({
            offerId: item.offerId,
            quantity: item.quantity,
          })),
          cashbackCents: cashbackApplied,
          payment: {
            method: "card",
            card: {
              number: digits,
              cardholder: cardholder.trim(),
              expiry,
              cvc,
            },
          },
        },
      });
      clearCart();
      window.scrollTo({ top: 0, behavior: "instant" });
      router.push(`/orders/${result.order.number}?new=1`);
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <div className="site-container py-6 lg:py-9">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("cart.title"), href: "/cart" },
          { label: t("checkout.title") },
        ]}
      />

      <div className="mt-5 flex flex-col justify-between gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-eneba-yellow">{t("checkout.secure")}</p>
          <h1 className="mt-2 text-[30px] font-bold leading-none tracking-[-0.035em] sm:text-[36px]">
            {t("checkout.title")}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-white/38">
          <LockKeyhole size={13} aria-hidden="true" />
          {t("checkout.simulated")}
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-10">
        <form onSubmit={submit} className="space-y-5">
          <section className="border border-white/12 bg-eneba-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-eneba-yellow text-xs font-extrabold text-black">
                  1
                </span>
                <div>
                  <h2 className="text-sm font-bold">{t("checkout.account")}</h2>
                  <p className="mt-0.5 text-[11px] text-white/42">
                    {t("checkout.keysGoHere")}
                  </p>
                </div>
              </div>
              <span className="border border-eneba-mint/25 bg-eneba-mint/[0.07] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-mint">
                {t("checkout.signedIn")}
              </span>
            </div>
            <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-xs sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                  {t("checkout.buyer")}
                </p>
                <p className="mt-1 font-medium">{user?.displayName}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
                  {t("checkout.email")}
                </p>
                <p className="mt-1 truncate font-medium">{user?.email}</p>
              </div>
            </div>
          </section>

          <section className="border border-white/12 bg-eneba-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-eneba-yellow text-xs font-extrabold text-black">
                2
              </span>
              <div>
                <h2 className="text-sm font-bold">{t("checkout.payment")}</h2>
                <p className="mt-0.5 text-[11px] text-white/42">
                  {t("checkout.testNoCharge")}
                </p>
              </div>
            </div>

            <div className="mt-4 border border-eneba-mint/30 bg-eneba-mint/[0.05] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">
                  <Wallet size={14} className="text-eneba-mint" aria-hidden="true" />
                  {t("checkout.cashbackBalance")}
                </p>
                <p className="text-sm font-extrabold text-eneba-mint">
                  {cashback.loading ? "…" : money(cashbackBalance)}
                </p>
              </div>
              {cashback.error ? (
                <p className="mt-2 text-[10px] leading-4 text-white/42">
                  {t("checkout.cashbackUnavailable")}
                </p>
              ) : cashback.loading ? (
                <p className="mt-2 text-[10px] leading-4 text-white/42">
                  {t("checkout.cashbackLoading")}
                </p>
              ) : cashbackBalance > 0 ? (
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 border-t border-white/10 pt-3">
                  <input
                    type="checkbox"
                    checked={applyCashback}
                    onChange={(event) => setApplyCashback(event.target.checked)}
                    aria-label={t("checkout.cashbackUse")}
                    className="mt-0.5 size-4 shrink-0 accent-eneba-yellow"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold">
                      {t("checkout.cashbackUse")}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-white/45">
                      {applyCashback
                        ? `${t("checkout.cashbackApplied")} · −${money(cashbackApplied)}`
                        : t("checkout.cashbackNote")}
                    </span>
                  </span>
                </label>
              ) : (
                <p className="mt-2 text-[10px] leading-4 text-white/42">
                  {t("checkout.cashbackNone")}
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border border-eneba-yellow/30 bg-eneba-yellow/[0.06] p-3.5">
              <div className="flex items-start gap-2.5">
                <CreditCard size={17} className="mt-0.5 shrink-0 text-eneba-yellow" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold text-eneba-yellow">{t("checkout.testMode")}</p>
                  <p className="mt-1 text-[10px] leading-4 text-white/48">
                    {t("checkout.testNote")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={useTestCard}
                className="btn btn-secondary btn-sm shrink-0 text-[10px]"
              >
                {t("checkout.fillTestCard")}
              </button>
            </div>

            {formError ? (
              <div
                role="alert"
                className="mt-4 border border-[#ff8c86]/40 bg-[#ff6b6b]/10 px-3.5 py-3 text-xs leading-5 text-[#ffc0bc]"
              >
                {formError}
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="card-number" className="field-label">
                  {t("checkout.cardNumber")}
                </label>
                <div className="relative">
                  <input
                    id="card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, "").slice(0, 16);
                      setCardNumber(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
                    }}
                    placeholder="4242 4242 4242 4242"
                    className="field pr-12 font-mono tracking-[0.04em]"
                  />
                  <CreditCard
                    size={18}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="cardholder" className="field-label">
                  {t("checkout.cardholder")}
                </label>
                <input
                  id="cardholder"
                  autoComplete="cc-name"
                  value={cardholder}
                  onChange={(event) => setCardholder(event.target.value)}
                  placeholder={t("checkout.cardholderPlaceholder")}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="card-expiry" className="field-label">
                  {t("checkout.expiry")}
                </label>
                <input
                  id="card-expiry"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  value={expiry}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                  }}
                  placeholder="MM/YY"
                  className="field font-mono"
                />
              </div>
              <div>
                <label htmlFor="card-cvc" className="field-label">
                  {t("checkout.securityCode")}
                </label>
                <input
                  id="card-cvc"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  value={cvc}
                  onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="CVC"
                  className="field font-mono"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-[10px] text-white/38">
              <ShieldCheck size={14} className="text-eneba-mint" aria-hidden="true" />
              {t("checkout.cardStored")}
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <Link href="/cart" className="btn btn-secondary">
              <ArrowLeft size={15} aria-hidden="true" /> {t("checkout.backToCart")}
            </Link>
            <button type="submit" disabled={submitting} className="btn btn-primary min-w-[240px] disabled:opacity-60">
              {submitting ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />{" "}
                  {t("checkout.processing")}
                </>
              ) : (
                <>
                  {t("checkout.pay", { amount: money(payableCents) })}{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="border border-white/14 bg-eneba-surface p-5 lg:sticky lg:top-[144px]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold">{t("checkout.yourOrder")}</h2>
            <Link href="/cart" className="text-[11px] font-bold text-eneba-yellow hover:underline">
              {t("checkout.editCart")}
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {items.map((item) => (
              <li key={item.lineId} className="flex gap-3 py-3">
                <img
                  src={item.coverImage}
                  alt=""
                  className="h-[62px] w-[47px] shrink-0 border border-white/12 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[12px] font-bold leading-4">{item.title}</p>
                  <p className="mt-1 text-[10px] text-white/38">
                    {item.sellerName} · {t("checkout.qty")} {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-[12px] font-bold">
                  {money(item.unitPriceCents * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 py-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-white/48">{t("checkout.subtotal")}</dt>
              <dd className="font-bold">{money(subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/48">{t("checkout.delivery")}</dt>
              <dd className="font-bold text-eneba-mint">{t("checkout.instantFree")}</dd>
            </div>
            {cashbackApplied > 0 ? (
              <div className="flex justify-between">
                <dt className="text-eneba-mint">{t("checkout.cashback")}</dt>
                <dd className="font-bold text-eneba-mint">
                  −{money(cashbackApplied)}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
            <span className="text-sm font-bold">{t("checkout.total")}</span>
            <div className="text-right">
              <span className="block text-2xl font-extrabold leading-none tracking-[-0.03em]">
                {money(payableCents)}
              </span>
              <span className="mt-1 block text-[9px] text-white/35">
                {t("checkout.vat", { currency })}
              </span>
              {currency !== "EUR" ? (
                <span className="mt-1 block max-w-[190px] text-right text-[9px] leading-3 text-white/28">
                  {t("checkout.displayOnly")}
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-[11px] text-white/45">
            <p className="flex items-center gap-2">
              <Zap size={13} className="text-eneba-yellow" aria-hidden="true" />
              {t("checkout.keysInventory")}
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-eneba-mint" aria-hidden="true" />
              {t("checkout.orderProtected")}
            </p>
            <p className="flex items-center gap-2">
              <Wallet size={13} className="text-eneba-mint" aria-hidden="true" />
              {t("checkout.cashbackEarn")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
