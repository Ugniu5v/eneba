"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Heart,
  KeyRound,
  LogOut,
  Package,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import { useWishlist } from "@/context/WishlistContext";

export function AccountMenu() {
  const { user, loading, signOut } = useAuth();
  const { notify } = useToast();
  const { t } = usePreferences();
  const { count: wishlistCount } = useWishlist();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-0.5 sm:gap-1.5">
        <Link
          href="/login"
          aria-label={t("common.signIn")}
          className="inline-flex h-10 items-center gap-2 px-1.5 text-sm font-bold text-white transition-colors hover:text-eneba-yellow sm:px-2.5"
        >
          <UserRound size={19} strokeWidth={1.8} className="sm:hidden" aria-hidden="true" />
          <span className="hidden sm:inline">{t("common.signIn")}</span>
        </Link>
        <span className="hidden text-white/25 sm:inline" aria-hidden="true">
          /
        </span>
        <Link
          href="/register"
          className="hidden h-10 items-center px-2 text-sm font-bold text-white transition-colors hover:text-eneba-yellow sm:inline-flex"
        >
          {t("common.register")}
        </Link>
      </div>
    );
  }

  const initials = user.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("header.accountMenu")} — ${user.displayName}`}
        className="flex h-10 items-center gap-2 text-sm font-bold text-white transition-colors hover:text-eneba-yellow"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-eneba-yellow text-xs font-extrabold text-black">
          {initials || <UserRound size={16} aria-hidden="true" />}
        </span>
        <span className="hidden max-w-[110px] truncate lg:block">{user.displayName}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`hidden transition-transform lg:block ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="pop-panel absolute right-0 top-[calc(100%+8px)] z-[80] w-64 border border-white/15 bg-[#1a0638] p-1.5 shadow-[0_24px_60px_rgba(8,0,22,0.45)]"
        >
          <div className="border-b border-white/10 px-3 py-3">
            <p className="truncate text-sm font-bold">{user.displayName}</p>
            <p className="mt-0.5 truncate text-xs text-white/55">{user.email}</p>
          </div>
          <Link
            href="/account/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/8"
          >
            <UserRound size={17} aria-hidden="true" />
            {t("header.myProfile")}
          </Link>
          <Link
            href="/account/orders"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/8"
          >
            <Package size={17} aria-hidden="true" />
            {t("header.myOrders")}
          </Link>
          <Link
            href="/account/keys"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/8"
          >
            <KeyRound size={17} aria-hidden="true" />
            {t("header.keyLibrary")}
          </Link>
          <Link
            href="/account/cashback"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/8"
          >
            <Wallet size={17} aria-hidden="true" />
            {t("header.cashback")}
          </Link>
          <Link
            href="/wishlist"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/8"
          >
            <Heart size={17} aria-hidden="true" />
            {t("common.wishlist")}
            {wishlistCount > 0 ? (
              <span className="ml-auto text-[10px] font-bold text-eneba-yellow">
                {wishlistCount}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              notify(
                t("common.signOut") === "Atsijungti"
                  ? "Jūs atsijungėte."
                  : "You have been signed out.",
              );
              router.push("/");
            }}
            className="flex w-full items-center gap-2.5 border-t border-white/8 px-3 py-2.5 text-left text-sm font-medium text-[#ffb8ad] transition-colors hover:bg-white/8"
          >
            <LogOut size={17} aria-hidden="true" />
            {t("common.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
