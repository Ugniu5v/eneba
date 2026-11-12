"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { errorMessage } from "@/lib/api";
import { AuthShell, safeNextPath } from "./AuthShell";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const { user, loading, signIn } = useAuth();
  const { t } = usePreferences();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!email.trim() || !password) {
      setFormError(t("auth.errCredentials"));
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace(next);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const useDemo = () => {
    setEmail("demo@eneba.test");
    setPassword("Demo1234!");
    setFormError("");
  };

  return (
    <AuthShell
      heading={t("auth.headingSignIn")}
      subheading={t("auth.subheadingSignIn")}
    >
      <div className="mb-6">
        <p className="eyebrow text-eneba-yellow">{t("auth.welcomeBack")}</p>
        <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.03em]">
          {t("auth.signInTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/55">
          {t("auth.signInDesc")}
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

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="field-label">
            {t("auth.email")}
          </label>
          <input
            id="login-email"
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
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="text-[13px] font-medium text-[#ded7ef]">
              {t("auth.password")}
            </label>
            <span className="text-[10px] text-white/35">{t("auth.passwordHint")}</span>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.password")}
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

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary mt-2 w-full disabled:opacity-60"
        >
          {submitting ? (
            <>
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />{" "}
              {t("auth.signingIn")}
            </>
          ) : (
            <>
              <LogIn size={16} aria-hidden="true" /> {t("auth.logIn")}
            </>
          )}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/12" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/32">
          {t("auth.demoAccess")}
        </span>
        <span className="h-px flex-1 bg-white/12" aria-hidden="true" />
      </div>

      <div className="border border-eneba-yellow/25 bg-eneba-yellow/[0.05] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-eneba-yellow">{t("auth.tryDemo")}</p>
            <p className="mt-1 font-mono text-[10px] leading-4 text-white/55">
              demo@eneba.test / Demo1234!
            </p>
          </div>
          <button
            type="button"
            onClick={useDemo}
            className="btn btn-secondary btn-sm shrink-0 text-[10px]"
          >
            {t("auth.useAccount")}
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-white/52">
        {t("auth.newHere")}{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="font-bold text-white underline underline-offset-4 hover:text-eneba-yellow"
        >
          {t("auth.createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}
