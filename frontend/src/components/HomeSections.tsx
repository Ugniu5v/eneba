"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { HomeSection, HomeSectionResponse } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { SectionHeading } from "./SectionHeading";
import { SectionSlider } from "./SectionSlider";
import { SectionSkeleton } from "./Skeletons";

export function HomeSections() {
  const { t } = usePreferences();
  const { data, loading, error, refetch } = useApiQuery<{ sections: HomeSection[] }>(
    "/api/storefront/home/sections",
  );

  if (loading) {
    return (
      <div>
        <SectionSkeleton count={4} />
        <SectionSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="site-container py-10">
        <div className="flex flex-col items-center border border-white/12 bg-black/10 px-6 py-12 text-center">
          <AlertTriangle className="text-eneba-yellow" size={24} aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">Homepage blocks couldn&apos;t load</h2>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-white/55">
            Each block is requested independently from the API. Try again to fetch
            the latest merchandising content.
          </p>
          <button type="button" onClick={refetch} className="btn btn-primary btn-sm mt-5">
            <RefreshCw size={14} aria-hidden="true" /> Reload blocks
          </button>
        </div>
        <p className="sr-only">{t("common.retry")}</p>
      </div>
    );
  }

  return (
    <div>
      {(data?.sections ?? []).map((section) => (
        <HomeSectionRow key={section.slug} section={section} />
      ))}
    </div>
  );
}

function HomeSectionRow({ section }: { section: HomeSection }) {
  const { t } = usePreferences();
  const { data, loading, error, refetch } = useApiQuery<HomeSectionResponse>(
    section.apiPath,
  );

  if (loading) return <SectionSkeleton count={section.maxItems || 5} />;

  const title = t(`home.${section.slug}.title`, undefined, section.title);
  const subtitle = t(`home.${section.slug}.subtitle`, undefined, section.subtitle);

  if (error) {
    return (
      <section className="site-container border-b border-white/8 py-8">
        <SectionHeading title={title} subtitle={subtitle} />
        <div className="flex items-center justify-between gap-4 border border-white/12 bg-black/10 px-4 py-4 text-xs text-white/60">
          <span>This block could not be loaded.</span>
          <button
            type="button"
            onClick={refetch}
            className="inline-flex shrink-0 items-center gap-1 font-bold text-eneba-yellow hover:underline"
          >
            <RefreshCw size={12} aria-hidden="true" /> {t("common.retry")}
          </button>
        </div>
      </section>
    );
  }

  const products = data?.products ?? [];
  if (products.length === 0) return null;

  return (
    <section className="site-container border-b border-white/8 py-7 last:border-b-0 lg:py-9">
      <SectionHeading
        title={title}
        subtitle={subtitle}
        count={products.length}
        variant={section.layout === "deals" ? "deals" : "default"}
      />
      <SectionSlider
        label={title}
        prevLabel={t("home.slidePrev")}
        nextLabel={t("home.slideNext")}
      >
        {products.map((product, index) => (
          <div key={product.id} className="slider-item">
            <ProductCard product={product} priority={index < 3} />
          </div>
        ))}
      </SectionSlider>
      {section.ctaHref ? (
        <div className="mt-5 flex justify-center">
          <Link
            href={section.ctaHref}
            className="btn btn-secondary min-w-[168px] text-[12px]"
          >
            {t("common.showAll")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
