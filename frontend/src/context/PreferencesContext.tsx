"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENCIES,
  type CurrencyCode,
  type Language,
  localeTag,
  translate,
} from "@/lib/i18n";

const LANGUAGE_COOKIE = "eneba_lang";
const CURRENCY_COOKIE = "eneba_currency";

interface PreferencesContextValue {
  language: Language;
  currency: CurrencyCode;
  locale: string;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: CurrencyCode) => void;
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string;
  money: (cents: number) => string;
  formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string) => string;
  formatNumber: (value: number) => string;
  rateFromEur: number;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function writeCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookie storage can be disabled; the in-memory value still works.
  }
}

export function PreferencesProvider({
  children,
  initialLanguage = "en",
  initialCurrency = "EUR",
}: {
  children: ReactNode;
  initialLanguage?: Language;
  initialCurrency?: CurrencyCode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [currency, setCurrencyState] = useState<CurrencyCode>(initialCurrency);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    writeCookie(LANGUAGE_COOKIE, next);
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    writeCookie(CURRENCY_COOKIE, next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>, fallback?: string) =>
      translate(language, key, vars, fallback),
    [language],
  );

  const rate =
    CURRENCIES.find((entry) => entry.code === currency)?.rateFromEur ?? 1;

  const money = useCallback(
    (cents: number) => {
      if (!Number.isFinite(cents)) return "";
      const amount = (cents / 100) * rate;
      return new Intl.NumberFormat(localeTag(language), {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [currency, language, rate],
  );

  const formatDate = useCallback(
    (value: string, options: Intl.DateTimeFormatOptions = {}) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat(localeTag(language), {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options,
      }).format(date);
    },
    [language],
  );

  const formatDateTime = useCallback(
    (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return new Intl.DateTimeFormat(localeTag(language), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    },
    [language],
  );

  const formatNumber = useCallback(
    (value: number) => new Intl.NumberFormat(localeTag(language)).format(value),
    [language],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      language,
      currency,
      locale: localeTag(language),
      hydrated: true,
      setLanguage,
      setCurrency,
      t,
      money,
      formatDate,
      formatDateTime,
      formatNumber,
      rateFromEur: rate,
    }),
    [
      language,
      currency,
      setLanguage,
      setCurrency,
      t,
      money,
      formatDate,
      formatDateTime,
      formatNumber,
      rate,
    ],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside PreferencesProvider");
  return context;
}

export const LANGUAGE_OPTIONS = [
  { code: "en" as Language, label: "English", short: "EN" },
  { code: "lt" as Language, label: "Lietuvių", short: "LT" },
];

export { CURRENCIES, localeTag };
