"use client";

import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";

export function SectionHeading({
  title,
  subtitle,
  ctaHref,
  ctaLabel,
  count,
  variant = "default",
}: {
  title: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
  count?: number;
  variant?: "default" | "deals";
}) {
  const { t } = usePreferences();
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.025em] sm:text-[27px]">
            {title}
          </h2>
          <Info size={15} strokeWidth={1.8} className="text-white/38" aria-hidden="true" />
          {variant === "deals" ? (
            <span className="ml-1 hidden bg-eneba-coral px-1.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-black sm:inline-block">
              {t("home.limitedTime")}
            </span>
          ) : null}
          {count !== undefined ? (
            <span className="ml-1 hidden text-xs font-medium text-white/45 md:inline">
              {t("home.picks", { count })}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-white/58">
            {subtitle}
          </p>
        ) : null}
      </div>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className="group inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-eneba-yellow transition-colors hover:text-eneba-yellow-bright"
        >
          {ctaLabel || t("common.viewAll")}
          <ArrowUpRight
            size={15}
            strokeWidth={2}
            aria-hidden="true"
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      ) : null}
    </div>
  );
}
