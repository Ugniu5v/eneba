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
import type { ProductSummary } from "@/lib/types";

const STORAGE_KEY = "eneba.wishlist.v1";

export interface WishlistItem {
  product: ProductSummary;
  addedAt: string;
}

interface WishlistContextValue {
  items: WishlistItem[];
  hydrated: boolean;
  count: number;
  has: (slug: string) => boolean;
  toggle: (product: ProductSummary) => boolean;
  remove: (slug: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function isProduct(value: unknown): value is ProductSummary {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return (
    typeof product.id === "string" &&
    typeof product.slug === "string" &&
    typeof product.title === "string" &&
    typeof product.coverImage === "string" &&
    typeof product.lowestOffer === "object" &&
    product.lowestOffer !== null &&
    typeof (product.lowestOffer as Record<string, unknown>).priceCents === "number"
  );
}

function readWishlist(): WishlistItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is WishlistItem => {
        if (!entry || typeof entry !== "object") return false;
        return isProduct((entry as WishlistItem).product);
      })
      .map((entry) => ({
        product: entry.product,
        addedAt:
          typeof entry.addedAt === "string" ? entry.addedAt : new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readWishlist());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Keep the in-memory list when storage is unavailable.
    }
  }, [items, hydrated]);

  const has = useCallback(
    (slug: string) => items.some((entry) => entry.product.slug === slug),
    [items],
  );

  const toggle = useCallback((product: ProductSummary) => {
    let added = false;
    setItems((current) => {
      const exists = current.some((entry) => entry.product.slug === product.slug);
      if (exists) {
        return current.filter((entry) => entry.product.slug !== product.slug);
      }
      added = true;
      return [{ product, addedAt: new Date().toISOString() }, ...current];
    });
    return added;
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((current) => current.filter((entry) => entry.product.slug !== slug));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, hydrated, count: items.length, has, toggle, remove, clear }),
    [items, hydrated, has, toggle, remove, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
