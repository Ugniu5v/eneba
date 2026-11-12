import type { Metadata } from "next";
import { Suspense } from "react";
import { StoreClient } from "@/components/store/StoreClient";
import { ProductGridSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = {
  title: "Store",
  description:
    "Browse every game, gift card, top-up and software title on the marketplace. Filter by platform, region, genre and price.",
};

function StoreFallback() {
  return (
    <div className="site-container py-8">
      <div className="skeleton h-6 w-40" />
      <div className="mt-4 flex gap-3">
        <div className="skeleton hidden h-[500px] w-[248px] lg:block" />
        <div className="min-w-0 flex-1">
          <div className="skeleton mb-5 h-10 w-full" />
          <ProductGridSkeleton
            count={8}
            className="grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          />
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<StoreFallback />}>
      <StoreClient />
    </Suspense>
  );
}
