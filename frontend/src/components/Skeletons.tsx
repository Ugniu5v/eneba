export function ProductCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-card bg-eneba-surface"
      aria-hidden="true"
    >
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="flex flex-1 flex-col p-3">
        <div className="skeleton h-2.5 w-20" />
        <div className="skeleton mt-2.5 h-3.5 w-full" />
        <div className="skeleton mt-1.5 h-3.5 w-3/4" />
        <div className="mt-auto pt-5">
          <div className="skeleton ml-auto h-4 w-16" />
          <div className="skeleton mt-3 h-9 w-full" />
          <div className="skeleton mt-1.5 h-9 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 5,
  className = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-3 ${className}`}
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
      <span className="sr-only">Loading products…</span>
    </div>
  );
}

export function SectionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="site-container py-7 lg:py-9" aria-hidden="true">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="skeleton h-6 w-52" />
          <div className="skeleton mt-2 h-3 w-72" />
        </div>
        <div className="skeleton h-3 w-20" />
      </div>
      <ProductGridSkeleton count={count} />
    </section>
  );
}

export function BannerSkeleton() {
  return (
    <div className="site-container pt-4 lg:pt-5" aria-hidden="true">
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
        <div className="skeleton min-h-[320px] lg:col-span-6 lg:min-h-[396px]" />
        <div className="grid grid-cols-2 gap-2.5 lg:col-span-6 lg:grid-cols-2">
          <div className="skeleton min-h-[190px] lg:min-h-[396px]" />
          <div className="skeleton min-h-[190px] lg:min-h-[396px]" />
        </div>
      </div>
    </div>
  );
}
