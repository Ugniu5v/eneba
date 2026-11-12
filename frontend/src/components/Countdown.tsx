"use client";

import { useEffect, useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function Countdown({
  endsAt,
  inverse = false,
}: {
  endsAt?: string;
  inverse?: boolean;
}) {
  const { t } = usePreferences();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return;
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  if (!endsAt || remaining === null || remaining <= 0) return null;
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const units = [
    { value: pad(days), label: t("countdown.days") },
    { value: pad(hours), label: t("countdown.hrs") },
    { value: pad(minutes), label: t("countdown.min") },
    { value: pad(seconds), label: t("countdown.sec") },
  ];

  return (
    <div className="flex items-end gap-2.5" aria-label={t("countdown.aria")}>
      <span
        className={`mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
          inverse ? "text-black/60" : "text-white/55"
        }`}
      >
        {t("countdown.endsIn")}
      </span>
      <div className="flex gap-1.5">
        {units.map((unit) => (
          <span key={unit.label} className="min-w-[34px] text-center">
            <span
              className={`block px-1 py-1 text-[15px] font-extrabold leading-none tabular-nums ${
                inverse ? "bg-black/80 text-white" : "bg-black/45 text-white"
              }`}
            >
              {unit.value}
            </span>
            <span
              className={`mt-1 block text-[8px] font-bold uppercase tracking-[0.08em] ${
                inverse ? "text-black/55" : "text-white/45"
              }`}
            >
              {unit.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
