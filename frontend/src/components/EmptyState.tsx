import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  secondary,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-white/12 bg-black/[0.09] px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-eneba-yellow">
        <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-[-0.02em]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-white/58">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="btn btn-primary mt-6">
          {actionLabel}
        </Link>
      ) : null}
      {secondary ? <div className="mt-4 text-sm text-white/60">{secondary}</div> : null}
    </div>
  );
}

export function ErrorPanel({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-white/12 bg-black/[0.09] px-6 py-10 text-center">
      <p className="text-sm font-bold">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-xs leading-5 text-white/55">{description}</p>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-4">
          Try again
        </button>
      ) : null}
    </div>
  );
}
