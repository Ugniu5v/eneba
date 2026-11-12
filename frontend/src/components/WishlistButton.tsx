"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import { useWishlist } from "@/context/WishlistContext";
import type { ProductSummary } from "@/lib/types";

export function WishlistButton({
  product,
  className = "",
  size = 17,
  variant = "icon",
  label,
}: {
  product: ProductSummary;
  className?: string;
  size?: number;
  variant?: "icon" | "button";
  label?: string;
}) {
  const { has, toggle } = useWishlist();
  const { notify } = useToast();
  const { t } = usePreferences();
  const [pop, setPop] = useState(false);
  const saved = has(product.slug);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const added = toggle(product);
    setPop(true);
    window.setTimeout(() => setPop(false), 320);
    notify(
      added ? t("header.wishlistSaved") : t("header.wishlistRemoved"),
      "success",
      added ? { href: "/wishlist", label: t("common.wishlist") } : undefined,
    );
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={saved ? t("header.removeFromWishlist") : t("header.addToWishlist")}
        className={`btn btn-secondary ${className}`}
      >
        <Heart
          size={size}
          strokeWidth={1.9}
          aria-hidden="true"
          className={saved ? "fill-eneba-yellow text-eneba-yellow" : ""}
        />
        {label ?? (saved ? t("product.savedWish") : t("product.saveWish"))}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? t("header.removeFromWishlist") : t("header.addToWishlist")}
      className={`flex size-8 items-center justify-center rounded-full border border-white/25 bg-[#16052d]/72 text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:border-eneba-yellow hover:text-eneba-yellow ${className}`}
    >
      <Heart
        size={size}
        strokeWidth={1.9}
        aria-hidden="true"
        className={`${saved ? "fill-eneba-yellow text-eneba-yellow" : ""} ${pop ? "heart-pop" : ""}`}
      />
    </button>
  );
}
