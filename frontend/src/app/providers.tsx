"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { ToastProvider } from "@/context/ToastContext";
import { WishlistProvider } from "@/context/WishlistContext";
import type { CurrencyCode, Language } from "@/lib/i18n";

export function Providers({
  children,
  initialLanguage,
  initialCurrency,
}: {
  children: ReactNode;
  initialLanguage: Language;
  initialCurrency: CurrencyCode;
}) {
  return (
    <PreferencesProvider
      initialLanguage={initialLanguage}
      initialCurrency={initialCurrency}
    >
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>{children}</ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </PreferencesProvider>
  );
}
