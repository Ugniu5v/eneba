"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";

export function ProtectedGate({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const { user, loading } = useAuth();
  const { t } = usePreferences();
  const resolvedTitle = title ?? t("protect.title");
  const resolvedDescription = description ?? t("protect.desc");
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="site-container py-14">
        <div className="mx-auto max-w-md">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton mt-4 h-12 w-full" />
          <div className="skeleton mt-3 h-12 w-full" />
          <div className="skeleton mt-3 h-11 w-40" />
        </div>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(pathname || "/");
    return (
      <div className="site-container py-16 lg:py-24">
        <div className="mx-auto max-w-lg border border-white/14 bg-black/10 px-6 py-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-eneba-yellow">
            <LockKeyhole size={24} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">
            {resolvedTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/60">
            {resolvedDescription}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href={`/login?next=${next}`} className="btn btn-primary min-w-36">
              {t("common.signIn")}
            </Link>
            <Link href={`/register?next=${next}`} className="btn btn-secondary min-w-36">
              {t("common.register")}
            </Link>
          </div>
          <p className="mt-5 text-[11px] text-white/40">{t("protect.note")}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
