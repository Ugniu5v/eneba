"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (displayName: string, email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<User>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    apiRequest<AuthResponse>("/api/auth/me")
      .then((payload) => {
        if (alive) setUser(payload.user);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const payload = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!payload.user) throw new Error("Sign in failed.");
    setUser(payload.user);
    return payload.user;
  }, []);

  const signUp = useCallback(
    async (displayName: string, email: string, password: string) => {
      const payload = await apiRequest<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: { displayName, email, password },
      });
      if (!payload.user) throw new Error("Account creation failed.");
      setUser(payload.user);
      return payload.user;
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await apiRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (displayName: string) => {
    const payload = await apiRequest<AuthResponse>("/api/account/profile", {
      method: "PATCH",
      body: { displayName },
    });
    if (!payload.user) throw new Error("Profile update failed.");
    setUser(payload.user);
    return payload.user;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const payload = await apiRequest<AuthResponse>("/api/auth/me");
      setUser(payload.user);
    } catch {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, updateProfile, refresh }),
    [user, loading, signIn, signUp, signOut, updateProfile, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
