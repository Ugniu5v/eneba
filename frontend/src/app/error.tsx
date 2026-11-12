"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="site-container py-20">
      <div className="mx-auto max-w-lg border border-white/14 bg-black/10 p-8 text-center">
        <AlertTriangle size={26} className="mx-auto text-eneba-yellow" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.025em]">
          Something went off-script
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/55">
          {error.message || "The page hit an unexpected error. Try again."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn-primary">
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
