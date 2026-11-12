"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { errorMessage } from "@/lib/api";
import { AuthShell, safeNextPath } from "./AuthShell";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const { user, loading, signUp } = useAuth();
  const { t } = usePreferences();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (displayName.trim().length < 2) {
      setFormError(t("auth.errName"));
      return;
    }
    if (!email.includes("@")) {
      setFormError(t("auth.errEmail"));
      return;
    }
    if (password.length < 8) {
      setFormError(t("auth.errPassword"));
      return;
    }
    if (password !== confirm) {
      setFormError(t("auth.errMatch"));
      return;
    }
    setSubmitting(true);
    try {
      await signUp(displayName.trim(), email.trim(), password);
      router.replace(next);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      heading={t("auth.headingRegister")}
      subheading={t("auth.subheadingRegister")}
    >
      <div className="mb-6">
        <p className="eyebrow text-eneba-yellow">{t("auth.join")}</p>
        <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.03em]">
          {t("auth.createTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/55">
          {t("auth.createDesc")}
        </p>
      </div>

      {formError ? (
        <div
          role="alert"
          className="mb-4 border border-[#ff8c86]/40 bg-[#ff6b6b]/10 px-3.5 py-3 text-xs leading-5 text-[#ffc0bc]"
        >
          {formError}
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label htmlFor="register-name" className="field-label">
            {t("auth.displayName")}
          </label>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            maxLength={50}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t("auth.namePlaceholder")}
            className="field"
            required
          />
        </div>
        <div>
          <label htmlFor="register-email" className="field-label">
            {t("auth.email")}
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            className="field"
            required
          />
        </div>
        <div>
          <label htmlFor="register-password" className="field-label">
            {t("auth.password")}
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.passwordHint")}
              className="field pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-white/45 transition-colors hover:text-white"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="register-confirm" className="field-label">
            {t("auth.confirmPassword")}
          </label>
          <input
            id="register-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder={t("auth.confirmPlaceholder")}
            className="field"
            required
          />
        </div>

        <p className="pt-0.5 text-[10px] leading-4 text-white/38">
          {t("auth.terms")}
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary w-full disabled:opacity-60"
        >
          {submitting ? (
            <>
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />{" "}
              {t("auth.creating")}
            </>
          ) : (
            <>
              <UserPlus size={16} aria-hidden="true" /> {t("auth.createAccount")}
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-[12px] text-white/52">
        {t("auth.alreadyAccount")}{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-bold text-white underline underline-offset-4 hover:text-eneba-yellow"
        >
          {t("auth.logIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
