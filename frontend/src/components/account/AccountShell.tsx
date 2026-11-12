"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Heart,
  KeyRound,
  LogOut,
  Package,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import { useWishlist } from "@/context/WishlistContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { CashbackResponse, OrdersResponse } from "@/lib/types";
import { Breadcrumbs } from "../Breadcrumbs";
import { ProtectedGate } from "../ProtectedGate";

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedGate>
      <AccountLayout>{children}</AccountLayout>
    </ProtectedGate>
  );
}

function AccountLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { t, money, formatDate } = usePreferences();
  const { count: wishlistCount } = useWishlist();
  const { notify } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const orders = useApiQuery<OrdersResponse>(user ? "/api/orders" : null);
  const cashback = useApiQuery<CashbackResponse>(
    user ? "/api/account/cashback" : null,
  );

  if (!user) return null;

  const orderList = orders.data?.orders ?? [];
  const keyCount = orderList.reduce(
    (total, order) =>
      total + order.items.reduce((sum, item) => sum + item.keys.length, 0),
    0,
  );

  const initials = user.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const navigation = [
    {
      href: "/account/profile",
      label: t("account.profile"),
      icon: UserRound,
      active: pathname === "/account/profile" || pathname === "/account",
    },
    {
      href: "/account/orders",
      label: t("account.orders"),
      icon: Package,
      active: pathname.startsWith("/account/orders"),
    },
    {
      href: "/account/keys",
      label: t("account.keys"),
      icon: KeyRound,
      active: pathname.startsWith("/account/keys"),
    },
    {
      href: "/account/cashback",
      label: t("account.cashback"),
      icon: Wallet,
      active: pathname.startsWith("/account/cashback"),
    },
    {
      href: "/wishlist",
      label: t("account.wishlist"),
      icon: Heart,
      active: pathname.startsWith("/wishlist"),
    },
  ];

  return (
    <div className="site-container py-6 lg:py-9">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("account.title") },
        ]}
      />

      <div className="mt-4 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-eneba-yellow">{t("account.private")}</p>
          <h1 className="mt-2 text-[30px] font-bold leading-none tracking-[-0.035em] sm:text-[36px]">
            {t("account.title")}
          </h1>
          <p className="mt-2 text-sm text-white/52">
            {user.displayName} · {user.email}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 border border-eneba-mint/35 bg-eneba-mint/[0.07] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.09em] text-eneba-mint">
          <ShieldCheck size={13} aria-hidden="true" />
          {t("account.private")}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:mt-7 lg:grid-cols-[262px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="lg:sticky lg:top-[128px]">
          <div className="border border-white/12 bg-eneba-surface">
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-eneba-yellow text-sm font-extrabold text-black">
                {initials || <UserRound size={18} aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user.displayName}</p>
                <p className="truncate text-[11px] text-white/45">{user.email}</p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  {t("account.memberSince")} {formatDate(user.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 divide-x divide-white/10 border-b border-white/10 text-center">
              <Stat
                value={orders.loading ? "…" : String(orderList.length)}
                label={t("account.ordersStat")}
              />
              <Stat
                value={orders.loading ? "…" : String(keyCount)}
                label={t("account.keysStat")}
              />
              <Stat value={String(wishlistCount)} label={t("account.wishlistStat")} />
              <Stat
                value={
                  cashback.loading
                    ? "…"
                    : money(cashback.data?.cashback.balanceCents ?? 0)
                }
                label={t("account.cashbackStat")}
              />
            </div>

            <nav aria-label={t("account.accountNav")} className="p-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-2.5 text-[13px] font-medium transition-colors ${
                      item.active
                        ? "bg-white/[0.09] font-bold text-eneba-yellow"
                        : "text-white/68 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <ChevronRight
                      size={13}
                      aria-hidden="true"
                      className="text-white/25"
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-1.5">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  notify(
                    t("common.signOut") === "Atsijungti"
                      ? "Jūs atsijungėte."
                      : "You have been signed out.",
                  );
                  router.push("/");
                }}
                className="flex w-full items-center gap-2.5 px-2.5 py-2.5 text-left text-[13px] font-medium text-[#ffb8ad] transition-colors hover:bg-white/[0.06]"
              >
                <LogOut size={16} aria-hidden="true" />
                {t("common.signOut")}
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-1 py-3">
      <p className="text-lg font-extrabold leading-none">{value}</p>
      <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.08em] text-white/38">
        {label}
      </p>
    </div>
  );
}
