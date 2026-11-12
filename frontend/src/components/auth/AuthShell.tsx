import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { Brand } from "../Brand";

export function AuthShell({
  children,
  heading,
  subheading,
}: {
  children: ReactNode;
  heading: string;
  subheading: string;
}) {
  const { t } = usePreferences();
  return (
    <div className="site-container py-8 lg:py-12">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-8">
        <section className="relative hidden min-h-[600px] overflow-hidden border border-white/10 bg-[#2a0a62] p-10 lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize: "54px 54px",
              maskImage: "linear-gradient(to bottom, black, transparent 82%)",
            }}
          />
          <div className="relative z-10">
            <Brand />
            <p className="eyebrow mt-14 text-eneba-yellow">
              <span className="h-px w-5 bg-eneba-yellow/60" aria-hidden="true" />
              {t("auth.oneAccount")}
            </p>
            <h1 className="mt-3 max-w-md text-[42px] font-extrabold leading-[0.98] tracking-[-0.045em]">
              {heading}
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/58">
              {subheading}
            </p>
          </div>

          <div className="relative z-10 mt-auto pt-20">
            <div className="relative h-[240px] w-full max-w-[470px]">
              <img
                src="/assets/covers/crownfall-shattered-realm.svg"
                alt=""
                className="absolute left-[6%] top-8 w-[150px] rotate-[-8deg] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
              />
              <img
                src="/assets/covers/playstation-store-100-usd.svg"
                alt=""
                className="absolute left-[36%] top-0 z-10 w-[160px] rotate-[3deg] border border-white/25 shadow-[0_24px_60px_rgba(0,0,0,0.4)]"
              />
              <img
                src="/assets/covers/neon-drift-2088.svg"
                alt=""
                className="absolute left-[67%] top-12 w-[145px] rotate-[9deg] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
              />
              <div className="absolute -bottom-2 right-2 z-20 flex items-center gap-2.5 border border-eneba-yellow/40 bg-[#1a0638] px-3.5 py-3 text-xs font-bold shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
                <span className="flex size-8 items-center justify-center rounded-full bg-eneba-yellow text-black">
                  <KeyRound size={15} aria-hidden="true" />
                </span>
                {t("auth.keysLive")}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[11px] text-white/48">
              <span className="inline-flex items-center gap-1.5">
                <Zap size={13} className="text-eneba-yellow" aria-hidden="true" />
                {t("auth.instant")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-eneba-mint" aria-hidden="true" />
                {t("auth.privateHistory")}
              </span>
              <Link
                href="/store"
                className="ml-auto inline-flex items-center gap-1 font-bold text-eneba-yellow hover:underline"
              >
                {t("auth.explore")} <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full border border-white/14 bg-black/[0.12] p-6 sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

export function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
