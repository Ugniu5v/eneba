"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({
  value,
  onChange,
  max = 5,
  size = "default",
  label = "Quantity",
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: "small" | "default";
  label?: string;
}) {
  const limit = Math.max(1, Math.min(5, max));
  return (
    <div
      className={`inline-flex items-center border border-white/25 ${
        size === "small" ? "h-8" : "h-[42px]"
      }`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className={`flex items-center justify-center text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/25 ${
          size === "small" ? "size-8" : "size-[40px]"
        }`}
      >
        <Minus size={size === "small" ? 12 : 14} aria-hidden="true" />
      </button>
      <span
        className={`min-w-8 border-x border-white/20 text-center font-bold tabular-nums ${
          size === "small" ? "px-1 text-xs leading-8" : "px-2 text-sm leading-[40px]"
        }`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(limit, value + 1))}
        disabled={value >= limit}
        aria-label="Increase quantity"
        className={`flex items-center justify-center text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/25 ${
          size === "small" ? "size-8" : "size-[40px]"
        }`}
      >
        <Plus size={size === "small" ? 12 : 14} aria-hidden="true" />
      </button>
    </div>
  );
}
