import { useCallback, useEffect, useState } from "react";
import type { Dashboard } from "./types";

/** Haalt het dashboard op en ververst automatisch (live). */
export function useDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard${force ? "?force=1" : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setData(json);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshSeconds = data?.refreshSeconds ?? 60;
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && load(), refreshSeconds * 1000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load, refreshSeconds]);

  return { data, error, loading, refresh: () => load(true) };
}

export type ThemeChoice = "system" | "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    try {
      const t = localStorage.getItem("dt-theme");
      return t === "light" || t === "dark" ? t : "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      localStorage.setItem("dt-theme", theme);
    } catch {
      /* geen opslag beschikbaar */
    }
  }, [theme]);

  return [theme, setTheme] as const;
}
