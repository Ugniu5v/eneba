import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Eneba Market — Games, gift cards & digital keys",
    template: "%s · Eneba Market",
  },
  description:
    "Compare trusted sellers and buy games, gift cards, top-ups and software with instant digital delivery.",
  applicationName: "Eneba Market",
  icons: {
    icon: "/brand-mark.svg",
    apple: "/brand-mark.svg",
  },
  openGraph: {
    title: "Eneba Market — Games, gift cards & digital keys",
    description:
      "Compare trusted sellers and get instant digital delivery on games, gift cards and more.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#4618ac",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const language = cookieStore.get("eneba_lang")?.value === "lt" ? "lt" : "en";
  const currencyCookie = cookieStore.get("eneba_currency")?.value;
  const currency =
    currencyCookie === "USD" || currencyCookie === "GBP" ? currencyCookie : "EUR";
  return (
    <html lang={language}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[200] -translate-y-20 bg-eneba-yellow px-4 py-2 text-sm font-bold text-black focus:translate-y-0"
        >
          Skip to content
        </a>
        <Providers initialLanguage={language} initialCurrency={currency}>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
