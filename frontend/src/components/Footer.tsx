"use client";

import Link from "next/link";
import { usePreferences } from "@/context/PreferencesContext";
import { Brand } from "./Brand";

export function Footer() {
  const { t } = usePreferences();

  const columns = [
    {
      title: t("footer.marketplace"),
      links: [
        { label: t("footer.allProducts"), href: "/store" },
        { label: t("footer.games"), href: "/store?category=Games" },
        { label: t("footer.giftCards"), href: "/store?category=Gift%20Cards" },
        { label: t("footer.software"), href: "/store?category=Software" },
        { label: t("footer.deals"), href: "/store?sort=discount" },
      ],
    },
    {
      title: t("footer.account"),
      links: [
        { label: t("footer.signIn"), href: "/login" },
        { label: t("footer.createAccount"), href: "/register" },
        { label: t("footer.myOrders"), href: "/account/orders" },
        { label: t("account.keys"), href: "/account/keys" },
        { label: t("account.cashback"), href: "/account/cashback" },
        { label: t("common.wishlist"), href: "/wishlist" },
        { label: t("footer.cart"), href: "/cart" },
      ],
    },
    {
      title: t("footer.safe"),
      links: [
        { label: t("footer.howCheckout"), href: "/help" },
        { label: t("footer.digitalDelivery"), href: "/help" },
        { label: t("footer.testPayments"), href: "/help" },
        { label: t("footer.support"), href: "mailto:support@eneba-demo.test" },
      ],
    },
  ] as const;

  return (
    <footer className="mt-auto border-t border-white/8 bg-eneba-footer">
      <div className="site-container py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr] lg:gap-20">
          <div>
            <Brand footer />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              {t("footer.tagline")}
            </p>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.13em] text-eneba-yellow">
              {t("footer.instant")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-bold text-white">{column.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] leading-5 text-white/58 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-6 text-[11px] leading-5 text-white/45 md:flex-row md:items-center md:justify-between">
          <p>{t("footer.legal", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center gap-2">
            {["VISA", "Mastercard", "PayPal", t("footer.payByCard")].map((method) => (
              <span
                key={method}
                className="border border-white/15 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white/55"
              >
                {method}
              </span>
            ))}
            <span className="ml-1 inline-flex items-center gap-1.5 border border-eneba-yellow/35 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-yellow">
              <span className="size-1.5 rounded-full bg-eneba-yellow" aria-hidden="true" />
              {t("footer.testMode")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
