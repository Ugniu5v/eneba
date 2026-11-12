import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-white/45">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight size={12} aria-hidden="true" className="shrink-0 text-white/25" />
              ) : null}
              {item.href && !last ? (
                <Link href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? "line-clamp-1 text-white/75" : ""} aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
