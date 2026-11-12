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

const STORAGE_KEY = "eneba.cart.v2";
const MAX_PER_OFFER = 5;

export interface CartItem {
  offerId: string;
  /** Stable cart-line identity; one catalogue product is one line. */
  lineId: string;
  productSlug: string;
  title: string;
  coverImage: string;
  sellerName: string;
  platform: string;
  region: string;
  unitPriceCents: number;
  originalPriceCents: number;
  quantity: number;
  maxStock: number;
}

export type NewCartItem = Omit<CartItem, "quantity" | "lineId">;

export function cartLineId(offerId: string): string {
  return offerId;
}

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  addItem: (item: NewCartItem, quantity?: number) => boolean;
  removeItem: (offerId: string) => void;
  setQuantity: (offerId: string, quantity: number) => void;
  clearCart: () => void;
  count: number;
  subtotalCents: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is Omit<CartItem, "lineId"> {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.offerId === "string" &&
    typeof item.productSlug === "string" &&
    typeof item.title === "string" &&
    typeof item.coverImage === "string" &&
    typeof item.sellerName === "string" &&
    typeof item.platform === "string" &&
    typeof item.region === "string" &&
    typeof item.unitPriceCents === "number" &&
    typeof item.originalPriceCents === "number" &&
    typeof item.quantity === "number" &&
    typeof item.maxStock === "number"
  );
}

function readCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem).map((item) => ({
      ...item,
      lineId: cartLineId(item.offerId),
      quantity: Math.max(1, Math.min(MAX_PER_OFFER, item.maxStock || 1, item.quantity)),
    }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: NewCartItem, quantity = 1) => {
    let accepted = true;
    const lineId = cartLineId(item.offerId);
    setItems((current) => {
      const existing = current.find((entry) => entry.lineId === lineId);
      const stockLimit = Math.max(1, Math.min(MAX_PER_OFFER, item.maxStock || 1));
      if (existing) {
        if (existing.quantity >= stockLimit) {
          accepted = false;
          return current;
        }
        const nextQuantity = Math.min(stockLimit, existing.quantity + quantity);
        return current.map((entry) =>
          entry.lineId === lineId
            ? { ...entry, ...item, lineId, quantity: nextQuantity }
            : entry,
        );
      }
      const nextQuantity = Math.min(stockLimit, Math.max(1, quantity));
      return [...current, { ...item, lineId, quantity: nextQuantity }];
    });
    return accepted;
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((current) => current.filter((item) => item.lineId !== lineId));
  }, []);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((current) =>
      current.map((item) => {
        if (item.lineId !== lineId) return item;
        const limit = Math.max(1, Math.min(MAX_PER_OFFER, item.maxStock || 1));
        return { ...item, quantity: Math.max(1, Math.min(limit, quantity)) };
      }),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Local storage can be disabled; in-memory state is still cleared.
    }
  }, []);

  const subtotalCents = useMemo(
    () => items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0),
    [items],
  );
  const count = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      count,
      subtotalCents,
    }),
    [items, hydrated, addItem, removeItem, setQuantity, clearCart, count, subtotalCents],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
