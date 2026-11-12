"use client";

import { Star } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";

export function StarRating({
  rating,
  count,
  size = 14,
  showCount = true,
}: {
  rating: number;
  count?: number;
  size?: number;
  showCount?: boolean;
}) {
  const { formatNumber, t } = usePreferences();
  const filled = Math.round(rating);
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`${rating.toFixed(1)} / 5${count ? ` · ${formatNumber(count)} ${t("product.reviewsLower")}` : ""}`}
    >
      <span className="flex items-center gap-0.5 text-eneba-yellow" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={size}
            strokeWidth={1.6}
            fill={index < filled ? "currentColor" : "transparent"}
            className={index < filled ? "" : "text-white/22"}
          />
        ))}
      </span>
      <span className="text-xs font-bold">{rating.toFixed(1)}</span>
      {showCount && count !== undefined ? (
        <span className="text-[11px] text-white/50">({formatNumber(count)})</span>
      ) : null}
    </span>
  );
}
