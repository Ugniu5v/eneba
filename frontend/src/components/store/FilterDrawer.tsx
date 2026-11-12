"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { usePreferences } from "@/context/PreferencesContext";

export function FilterDrawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = usePreferences();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="filter-drawer absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col border-t border-white/15 bg-[#2b0a64] shadow-[0_-24px_80px_rgba(0,0,0,0.45)] lg:inset-y-0 lg:left-0 lg:right-auto lg:max-h-none lg:w-[420px] lg:border-r lg:border-t-0 lg:shadow-[24px_0_80px_rgba(0,0,0,0.4)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 bg-white/25 lg:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-white/12 px-4 py-3.5">
          <p className="text-sm font-bold">{title}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center border border-white/20 text-white/70 transition-colors hover:border-white/45 hover:text-white"
            aria-label={t("common.close")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
        {footer ? <div className="border-t border-white/12 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
