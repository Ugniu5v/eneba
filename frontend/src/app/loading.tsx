export default function Loading() {
  return (
    <div className="site-container py-10" role="status" aria-label="Loading page">
      <div className="skeleton h-4 w-44" />
      <div className="skeleton mt-5 h-9 w-72 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton aspect-[3/5] w-full" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
