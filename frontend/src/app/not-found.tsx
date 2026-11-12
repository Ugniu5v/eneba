import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="site-container py-20 lg:py-28">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-eneba-yellow">
          <Compass size={28} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <p className="mt-6 text-[88px] font-extrabold leading-none tracking-[-0.06em] text-white/10">
          404
        </p>
        <h1 className="mt-2 text-[32px] font-bold tracking-[-0.035em]">
          This page left the marketplace
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          The link may be broken or the page may have moved. The store is still
          open, though.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/store" className="btn btn-primary min-w-36">
            Browse the store
          </Link>
          <Link href="/" className="btn btn-secondary min-w-36">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
