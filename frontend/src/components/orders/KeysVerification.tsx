"use client";

import {
  Gamepad2,
  Globe2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";
import { apiRequest, errorMessage } from "@/lib/api";
import { regionLabel } from "@/lib/i18n";
import type { Order, OrderResponse } from "@/lib/types";

/**
 * Region/platform verification required before digital keys are exposed.
 * The backend withholds key codes until this posts an explicit confirmation,
 * so closing the purchase dialog cannot reveal them.
 */
export function KeysVerification({
  order,
  onConfirmed,
  variant = "page",
}: {
  order: Order;
  onConfirmed: (order: Order) => void;
  variant?: "page" | "dialog";
}) {
  const { t, language } = usePreferences();
  const titleId = useId();
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const pairs = useMemo(() => {
    const seen = new Map<string, { platform: string; region: string }>();
    for (const item of order.items) {
      const key = `${item.platform}\u0000${item.region}`;
      if (!seen.has(key)) {
        seen.set(key, { platform: item.platform, region: item.region });
      }
    }
    return Array.from(seen.values());
  }, [order.items]);

  if (order.keysConfirmed) {
    return (
      <div className="flex items-center gap-2 border border-eneba-mint/30 bg-eneba-mint/[0.07] p-3.5 text-[12px] font-bold text-eneba-mint">
        <ShieldCheck size={15} aria-hidden="true" />
        {t("order.verifyConfirmed")}
      </div>
    );
  }

  const confirm = async () => {
    if (!checked || pending) return;
    setPending(true);
    setError("");
    try {
      const result = await apiRequest<OrderResponse>(
        `/api/orders/${encodeURIComponent(order.number)}/confirm`,
        {
          method: "POST",
          body: { regionConfirmed: true, platformConfirmed: true },
        },
      );
      onConfirmed(result.order);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-labelledby={titleId}
      className="border border-eneba-yellow/40 bg-eneba-yellow/[0.06] p-4"
    >
      <h3
        id={titleId}
        className="flex items-center gap-2 text-[13px] font-bold"
      >
        <ShieldCheck size={15} className="text-eneba-yellow" aria-hidden="true" />
        {t("order.verifyTitle")}
      </h3>
      <p className="mt-1.5 text-[11px] leading-5 text-white/58">
        {t("order.verifyDesc")}
      </p>

      <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.1em] text-white/38">
        {t("order.verifyPairsLabel")}
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {pairs.map((pair) => (
          <li
            key={`${pair.platform}-${pair.region}`}
            className="inline-flex items-center gap-1.5 border border-white/16 bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-white/80"
          >
            <Gamepad2 size={11} aria-hidden="true" />
            {pair.platform}
            <span className="text-white/25" aria-hidden="true">
              /
            </span>
            <Globe2 size={11} aria-hidden="true" />
            {regionLabel(language, pair.region)}
          </li>
        ))}
      </ul>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[12px] font-medium leading-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#fad318]"
        />
        <span>{t("order.verifyCheck")}</span>
      </label>
      {!checked && !error ? (
        <p className="mt-1.5 pl-[26px] text-[10px] text-white/38">
          {t("order.verifyHint")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[11px] leading-4 text-[#ffada2]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={confirm}
        disabled={!checked || pending}
        className={`btn btn-primary mt-3 min-h-10 w-full text-xs disabled:cursor-not-allowed disabled:opacity-45 ${
          variant === "dialog" ? "" : "sm:w-auto sm:min-w-[240px]"
        }`}
      >
        {pending ? (
          <>
            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            {t("order.confirming")}
          </>
        ) : (
          <>
            <ShieldCheck size={14} aria-hidden="true" />
            {t("order.confirmKeys")}
          </>
        )}
      </button>
    </section>
  );
}
