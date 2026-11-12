"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import type { Banner } from "@/lib/types";
import { Countdown } from "./Countdown";

export function HeroBanner({
  banner,
  variant = "hero",
}: {
  banner: Banner;
  variant?: "hero" | "side";
}) {
  const { t } = usePreferences();
  const isLight = banner.theme === "light";
  const isHero = variant === "hero";
  const eyebrow = t(`banner.${banner.id}.eyebrow`, undefined, banner.eyebrow);
  const title = t(`banner.${banner.id}.title`, undefined, banner.title);
  const subtitle = t(`banner.${banner.id}.subtitle`, undefined, banner.subtitle);
  const ctaLabel = t(`banner.${banner.id}.cta`, undefined, banner.ctaLabel);

  return (
    <article
      className={`group relative isolate overflow-hidden border border-white/10 ${
        isHero
          ? "min-h-[340px] sm:min-h-[400px] lg:min-h-[420px]"
          : "min-h-[208px] sm:min-h-[260px] lg:min-h-[420px]"
      }`}
    >
      <img
        src={banner.image}
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
      />
      <div
        className={`absolute inset-0 -z-10 ${
          isLight
            ? "bg-[linear-gradient(90deg,rgba(255,222,112,0.94)_0%,rgba(255,220,101,0.56)_48%,rgba(255,200,55,0.04)_100%)]"
            : isHero
              ? "bg-[linear-gradient(90deg,rgba(18,4,38,0.92)_0%,rgba(24,6,52,0.56)_48%,rgba(24,6,52,0.04)_100%)]"
              : "bg-[linear-gradient(0deg,rgba(18,4,38,0.96)_0%,rgba(24,6,52,0.45)_58%,rgba(24,6,52,0.05)_100%)]"
        }`}
      />
      <div
        className={`relative flex h-full flex-col items-start ${
          isHero
            ? "justify-center px-6 py-8 sm:px-10 lg:px-12 lg:py-10"
            : "justify-end p-5 lg:p-6"
        }`}
      >
        <p
          className={`eyebrow ${isLight ? "text-black/65" : "text-eneba-yellow"}`}
        >
          <span
            className={`inline-block h-px w-5 ${isLight ? "bg-black/40" : "bg-eneba-yellow/60"}`}
            aria-hidden="true"
          />
          {eyebrow}
        </p>
        {isHero ? (
          <h1
            className={`whitespace-pre-line font-extrabold tracking-[-0.045em] ${
              isLight
                ? "mt-3 text-[42px] leading-[0.93] text-[#16052d] sm:text-[56px] lg:text-[68px]"
                : "mt-3 text-[42px] leading-[0.93] text-white sm:text-[56px] lg:text-[68px]"
            }`}
          >
            {title}
          </h1>
        ) : (
          <h2
            className={`whitespace-pre-line font-extrabold tracking-[-0.045em] ${
              isLight
                ? "mt-2 text-[28px] leading-[0.95] text-[#16052d] sm:text-[32px]"
                : "mt-2 text-[28px] leading-[0.95] text-white sm:text-[32px]"
            }`}
          >
            {title}
          </h2>
        )}
        {banner.subtitle ? (
          <p
            className={`mt-3 max-w-[380px] leading-6 ${
              isHero ? "text-sm sm:text-[15px]" : "text-xs sm:text-[13px]"
            } ${isLight ? "text-black/68" : "text-white/68"}`}
          >
            {subtitle}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Link
            href={banner.ctaHref}
            className={`btn ${isLight ? "btn-dark" : "btn-primary"} group/cta px-5`}
          >
            {ctaLabel}
            <ArrowRight
              size={15}
              strokeWidth={2.2}
              aria-hidden="true"
              className="transition-transform group-hover/cta:translate-x-0.5"
            />
          </Link>
          {banner.endsAt ? (
            <Countdown endsAt={banner.endsAt} inverse={isLight} />
          ) : null}
        </div>
      </div>
    </article>
  );
}
