import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchClient } from "@/components/search/SearchClient";

export const metadata: Metadata = {
  title: "Search",
  description: "Search thousands of games, gift cards and digital extras by name.",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="site-container py-10">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton mt-5 h-12 w-full max-w-2xl" />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[3/5]" />
            ))}
          </div>
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
