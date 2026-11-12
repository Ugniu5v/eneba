"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error";

interface ToastAction {
  href: string;
  label: string;
}

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "success", action?: ToastAction) => {
      const id = ++counter.current;
      setToasts((current) => [...current.slice(-2), { id, message, tone, action }]);
      const timer = window.setTimeout(() => dismiss(id), 4200);
      timers.current.push(timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="animate-fade-rise pointer-events-auto flex w-full max-w-sm items-start gap-3 border border-white/15 bg-[#1a0638] p-3.5 shadow-[0_16px_60px_rgba(0,0,0,0.35)]"
          >
            <div
              className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                toast.tone === "success"
                  ? "bg-[#45e1bd]/15 text-[#75f3d2]"
                  : "bg-[#ff6b6b]/15 text-[#ff9d9d]"
              }`}
            >
              {toast.tone === "success" ? (
                <CheckCircle2 size={16} aria-hidden />
              ) : (
                <AlertCircle size={16} aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-5 text-white">{toast.message}</p>
              {toast.action ? (
                <Link
                  href={toast.action.href}
                  className="mt-1.5 inline-block text-xs font-bold text-eneba-yellow hover:underline"
                  onClick={() => dismiss(toast.id)}
                >
                  {toast.action.label}
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-lg leading-none text-white/45 transition-colors hover:text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
