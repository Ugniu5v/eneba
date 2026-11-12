"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { Banner } from "@/lib/types";
import { BannerSkeleton } from "./Skeletons";
import { HeroBanner } from "./HeroBanner";

export function HomeHero() {
  const { data, loading, error, refetch } = useApiQuery<{ banners: Banner[] }>(
    "/api/storefront/home/banners",
  );

  if (loading) return <BannerSkeleton />;

  if (error) {
    return (
      <div className="site-container pt-4 lg:pt-5">
        <div className="flex min-h-[200px] flex-col items-center justify-center border border-white/12 bg-black/12 px-6 py-10 text-center">
          <AlertTriangle size={22} className="text-eneba-yellow" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold">Promotions couldn&apos;t be loaded</p>
          <p className="mt-1 text-xs text-white/55">
            This block is served independently, so the rest of the marketplace still works.
          </p>
          <button type="button" onClick={refetch} className="btn btn-secondary btn-sm mt-4">
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const banners = data?.banners ?? [];
  const primary = banners.find((banner) => banner.slot === "hero") ?? banners[0];
  const secondary = banners.filter((banner) => banner.id !== primary?.id);
  if (!primary) return null;

  return (
    <section className="site-container pt-4 lg:pt-5" aria-label="Featured promotions">
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <HeroBanner banner={primary} />
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:col-span-6 lg:grid-cols-2">
          {secondary.map((banner) => (
            <HeroBanner key={banner.id} banner={banner} variant="side" />
          ))}
        </div>
      </div>
    </section>
  );
}
