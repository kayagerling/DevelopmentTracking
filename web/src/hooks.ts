import { useCallback, useEffect, useRef, useState } from "react";
import type { Dashboard } from "./types";

/** Op GitHub Pages is er geen server: dan lezen we de momentopname dashboard.json. */
export const IS_STATIC = import.meta.env.VITE_STATIC === "true";

function dashboardUrl(force: boolean) {
  if (IS_STATIC) return `${import.meta.env.BASE_URL}dashboard.json?t=${Date.now()}`;
  return `/api/dashboard${force ? "?force=1" : ""}`;
}

/** Haalt het dashboard op en ververst automatisch (live). */
export function useDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(dashboardUrl(force), { cache: "no-store" });
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

  // Handmatig verversen (klik op de status): hetzelfde ophalen als automatisch,
  // maar lang genoeg zichtbaar zodat je ziet dát er ververst is.
  const [manual, setManual] = useState<"idle" | "busy" | "done">("idle");
  const doneTimer = useRef<number>();
  const refresh = useCallback(async () => {
    if (manual === "busy") return;
    window.clearTimeout(doneTimer.current);
    setManual("busy");
    const started = Date.now();
    await load(true);
    await new Promise((r) => setTimeout(r, Math.max(0, 700 - (Date.now() - started))));
    setManual("done");
    doneTimer.current = window.setTimeout(() => setManual("idle"), 1800);
  }, [load, manual]);
  useEffect(() => () => window.clearTimeout(doneTimer.current), []);

  return { data, error, loading, refresh, manual };
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
