"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useApiQuery<T>(path: string | null): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<Error | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    apiRequest<T>(path, { signal: controller.signal })
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err : new Error("Request failed"));
        setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);

  const refetch = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  return { data, loading, error, refetch };
}

export function useDebouncedValue<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
