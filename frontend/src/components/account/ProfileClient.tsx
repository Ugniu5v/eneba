"use client";

import Link from "next/link";
import { Check, LockKeyhole, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useToast } from "@/context/ToastContext";
import { errorMessage } from "@/lib/api";

export function ProfileClient() {
  const { user, updateProfile } = useAuth();
  const { t, formatDate } = usePreferences();
  const { notify } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  if (!user) return null;

  const initials = user.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaved(false);
    const name = displayName.trim();
    if (name.length < 2 || name.length > 50) {
      setError(t("account.nameHint"));
      return;
    }
    setSaving(true);
    try {
      await updateProfile(name);
      setSaved(true);
      notify(t("account.profileSaved"), "success");
      window.setTimeout(() => setSaved(false), 1600);
    } catch (caught) {
      setError(errorMessage(caught));
      notify(t("account.profileSaveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="border border-white/12 bg-eneba-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center rounded-full bg-eneba-yellow text-xl font-extrabold text-black">
              {initials || <UserRound size={26} aria-hidden="true" />}
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.02em]">{t("account.profile")}</h2>
              <p className="mt-1 max-w-md text-[13px] leading-5 text-white/55">
                {t("account.profileDesc")}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 border border-eneba-mint/35 bg-eneba-mint/[0.07] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-eneba-mint">
            <ShieldCheck size={12} aria-hidden="true" />
            {t("account.memberSince")} {formatDate(user.createdAt)}
          </span>
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <label className="block">
              <span className="field-label">{t("account.displayName")}</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setError("");
                }}
                maxLength={50}
                autoComplete="name"
                className="field"
                aria-describedby="display-name-hint"
              />
              <span id="display-name-hint" className="mt-1.5 block text-[11px] text-white/40">
                {t("account.nameHint")}
              </span>
            </label>

            <label className="block">
              <span className="field-label">{t("account.email")}</span>
              <span className="relative block">
                <Mail
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                />
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="field cursor-not-allowed pl-9 text-white/55"
                />
              </span>
              <span className="mt-1.5 block text-[11px] text-white/40">
                {t("account.emailNote")}
              </span>
            </label>

            {error ? (
              <p role="alert" className="text-[12px] leading-5 text-[#ffada2]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary min-w-44 disabled:opacity-60"
            >
              {saved ? (
                <>
                  <Check size={15} aria-hidden="true" /> {t("account.profileSaved")}
                </>
              ) : (
                <>
                  <Save size={15} aria-hidden="true" />
                  {saving ? t("common.saving") : t("account.saveChanges")}
                </>
              )}
            </button>
          </div>

          <aside className="space-y-3 border-l-0 border-white/10 lg:border-l lg:pl-5">
            <div className="border border-white/10 bg-black/[0.08] p-4">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">
                <LockKeyhole size={14} aria-hidden="true" />
                {t("account.security")}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-white/50">
                {t("account.securityNote")}
              </p>
            </div>
            <div className="border border-white/10 bg-black/[0.08] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">
                {t("account.quickLinks")}
              </p>
              <div className="mt-2 grid gap-1.5 text-[12px]">
                <Link href="/account/orders" className="text-white/70 hover:text-eneba-yellow">
                  {t("account.orders")} →
                </Link>
                <Link href="/account/keys" className="text-white/70 hover:text-eneba-yellow">
                  {t("account.keys")} →
                </Link>
                <Link
                  href="/account/cashback"
                  className="text-white/70 hover:text-eneba-yellow"
                >
                  {t("account.cashback")} →
                </Link>
                <Link href="/wishlist" className="text-white/70 hover:text-eneba-yellow">
                  {t("account.wishlist")} →
                </Link>
              </div>
            </div>
          </aside>
        </form>
      </section>
    </div>
  );
}
