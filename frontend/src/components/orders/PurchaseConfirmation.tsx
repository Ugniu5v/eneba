"use client";

import {
  ArrowRight,
  Check,
  Copy,
  Gamepad2,
  Globe2,
  KeyRound,
  LockKeyhole,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import { regionLabel } from "@/lib/i18n";
import type { Order } from "@/lib/types";
import { KeysVerification } from "./KeysVerification";

/**
 * Post-purchase confirmation. The keys are withheld by the backend until the
 * buyer confirms the platform and region here; closing the dialog leaves them
 * locked on the order page as well.
 */
export function PurchaseConfirmation({
  order: initialOrder,
  onClose,
  onConfirmed,
}: {
  order: Order;
  onClose: () => void;
  onConfirmed: (order: Order) => void;
}) {
  const { t, money, language } = usePreferences();
  const { notify } = useToast();
  const [order, setOrder] = useState(initialOrder);
  const [copiedAll, setCopiedAll] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const resetTimer = useRef<number | undefined>(undefined);

  const allKeys = order.items.flatMap((item) =>
    item.keys.map((key) => key.code),
  );

  const copyText = async (text: string, label: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      notify(`${label} copied to clipboard.`);
      return true;
    } catch {
      notify("Couldn't copy automatically. Select the code and copy it.", "error");
      return false;
    }
  };

  const copyAll = async () => {
    const copied = await copyText(allKeys.join("\n"), t("order.keysLabel"));
    if (!copied) return;
    setCopiedAll(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopiedAll(false), 2200);
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const nodes = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(resetTimer.current);
    };
  }, [onClose]);

  const applyConfirmed = (next: Order) => {
    setOrder(next);
    onConfirmed(next);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("order.close")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#050010]/80 backdrop-blur-sm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-confirmation-title"
        className="pop-panel relative flex max-h-[94vh] w-full max-w-[680px] flex-col border border-white/16 bg-[#1a0638] shadow-[0_40px_120px_rgba(0,0,0,0.65)] sm:m-6"
      >
        <header className="flex items-start gap-3.5 border-b border-white/10 bg-eneba-yellow/[0.06] p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-eneba-yellow text-black">
            <Check size={22} strokeWidth={2.6} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-eneba-yellow">
              {t("order.purchaseConfirmed")}
            </p>
            <h2
              id="purchase-confirmation-title"
              className="mt-1.5 font-mono text-[21px] font-bold leading-none tracking-[-0.01em]"
            >
              {order.number}
            </h2>
            <p className="mt-2.5 text-[12px] leading-5 text-white/62">
              {t("order.purchaseSubtitle")}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-eneba-mint">
              <Zap size={11} aria-hidden="true" />
              {t("order.testNote")}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("order.close")}
            className="flex size-8 shrink-0 items-center justify-center border border-white/20 text-white/60 transition-colors hover:border-white/45 hover:text-white"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {order.items.map((item, itemIndex) => (
            <section
              key={`${item.productSlug}-${itemIndex}`}
              className="border border-white/12 bg-black/[0.14]"
              aria-label={item.productTitle}
            >
              <div className="flex gap-3 border-b border-white/10 p-3.5">
                <img
                  src={item.coverImage}
                  alt={`${item.productTitle} cover`}
                  className="h-[66px] w-[50px] shrink-0 border border-white/14 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-bold leading-5">
                    {item.productTitle}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 border border-white/14 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold">
                      <Gamepad2 size={11} aria-hidden="true" />
                      {item.platform}
                    </span>
                    <span className="inline-flex items-center gap-1 border border-white/14 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold">
                      <Globe2 size={11} aria-hidden="true" />
                      {regionLabel(language, item.region)}
                    </span>
                    <span className="text-[10px] text-white/40">
                      ×{item.quantity} · {money(item.lineTotalCents)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/42">
                  <KeyRound
                    size={12}
                    className="text-eneba-yellow"
                    aria-hidden="true"
                  />
                  {t("order.keysLabel")}
                  {order.keysConfirmed ? ` (${item.keys.length})` : ""}
                </p>
                {order.keysConfirmed ? (
                  <ul className="mt-2 space-y-1.5">
                    {item.keys.map((key, keyIndex) => (
                      <li
                        key={key.code}
                        className="flex flex-col gap-1.5 border border-white/12 bg-[#1b0738] p-2.5 sm:flex-row sm:items-center"
                      >
                        <code className="min-w-0 flex-1 break-all font-mono text-[13px] font-bold tracking-[0.06em] text-white sm:text-[14px]">
                          {key.code}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              key.code,
                              `${t("order.keysLabel")} ${keyIndex + 1}`,
                            )
                          }
                          className="btn btn-secondary btn-sm shrink-0 justify-center px-3"
                          aria-label={`Copy key ${keyIndex + 1}`}
                        >
                          <Copy size={13} aria-hidden="true" />
                          {t("common.copy")}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 flex items-center gap-2 border border-dashed border-white/18 bg-black/15 p-3 text-[11px] leading-4 text-white/45">
                    <LockKeyhole
                      size={13}
                      className="shrink-0 text-eneba-yellow"
                      aria-hidden="true"
                    />
                    {t("order.keysLocked")}
                  </p>
                )}
              </div>
            </section>
          ))}

          <div className="flex flex-col gap-2 border border-white/12 bg-eneba-yellow/[0.05] p-3.5 text-[11px] sm:flex-row sm:items-center sm:justify-between">
            <p className="font-bold">
              {t("order.totalPaid")}{" "}
              <span className="ml-1 text-sm font-extrabold">
                {money(order.totalCents)}
              </span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-eneba-mint">
              {order.cashbackUsedCents > 0 ? (
                <p>
                  {t("order.cashbackApplied")} −{money(order.cashbackUsedCents)}
                </p>
              ) : null}
              {order.cashbackEarnedCents > 0 ? (
                <p>
                  {t("order.cashbackEarned")} +{money(order.cashbackEarnedCents)}
                </p>
              ) : null}
            </div>
          </div>

          <KeysVerification
            order={order}
            onConfirmed={applyConfirmed}
            variant="dialog"
          />
        </div>

        {order.keysConfirmed ? (
          <footer className="flex flex-col gap-2 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={copyAll}
              className="btn btn-secondary min-h-10 text-xs sm:min-w-[170px]"
            >
              {copiedAll ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Copy size={14} aria-hidden="true" />
              )}
              {copiedAll ? t("order.copiedAll") : t("order.copyAll")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary min-h-10 text-xs"
            >
              {t("order.done")} <ArrowRight size={14} aria-hidden="true" />
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
