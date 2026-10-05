import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** Staat de planeet in de totale voortgang standaard aan? Zet iemand hem zelf aan/uit, dan onthoudt de browser dat. */
const PLANET_DEFAULT = true;

export function usePlanet() {
  const [on, setOn] = useState(() => {
    try {
      const v = localStorage.getItem("dt-planet");
      return v === null ? PLANET_DEFAULT : v === "1";
    } catch {
      return PLANET_DEFAULT;
    }
  });

  const toggle = () => {
    setOn(!on);
    try {
      localStorage.setItem("dt-planet", on ? "0" : "1");
    } catch {
      /* geen opslag beschikbaar */
    }
  };

  return [on, toggle] as const;
}

export type ChangeKind = "nieuw" | "gewijzigd" | "klaar";
type Snapshot = { savedAt: string; prds: Record<string, { status: string; progress: number }> };
const SEEN_KEY = "dt-seen";

function readSnapshot(): Snapshot | null {
  try {
    const s = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "null");
    return s && typeof s.prds === "object" ? s : null;
  } catch {
    return null;
  }
}

/**
 * Welke PRD's zijn nieuw of veranderd sinds je laatste bezoek?
 * De stand van het vorige bezoek wordt bij het openen één keer gelezen, zodat de
 * markeringen de hele sessie blijven staan. De huidige stand wordt steeds opgeslagen
 * voor de volgende keer. Bij het eerste bezoek is er niets om mee te vergelijken.
 */
export function useChanges(data: Dashboard | null) {
  const [base] = useState(readSnapshot);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!data) return;
    const snap: Snapshot = {
      savedAt: data.fetchedAt,
      prds: Object.fromEntries(data.prds.map((p) => [p.id, { status: p.status, progress: p.progress }])),
    };
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(snap));
    } catch {
      /* geen opslag beschikbaar */
    }
  }, [data]);

  const changes = useMemo(() => {
    const m = new Map<string, ChangeKind>();
    if (!data || !base) return m;
    for (const p of data.prds) {
      if (seen.has(p.id)) continue;
      const before = base.prds[p.id];
      if (!before) m.set(p.id, "nieuw");
      else if (before.progress < 100 && p.progress >= 100) m.set(p.id, "klaar");
      else if (before.status !== p.status || before.progress !== p.progress) m.set(p.id, "gewijzigd");
    }
    return m;
  }, [data, base, seen]);

  /** Markering weghalen, bv. nadat je de PRD bekeken hebt. */
  const markSeen = useCallback((id: string) => setSeen((s) => (s.has(id) ? s : new Set(s).add(id))), []);

  return { changes, markSeen };
}

/**
 * Ref voor een scrollend vak: zet data-more-above / data-more-below zodat de CSS
 * een vervaging kan tonen waar nog meer inhoud zit (er zijn geen scrollbars).
 */
export function useScrollHint<T extends HTMLElement>() {
  const cleanup = useRef<() => void>();
  return useCallback((el: T | null) => {
    cleanup.current?.();
    cleanup.current = undefined;
    if (!el) return;

    const check = () => {
      const max = el.scrollHeight - el.clientHeight;
      el.toggleAttribute("data-more-above", max > 1 && el.scrollTop > 1);
      el.toggleAttribute("data-more-below", max > 1 && el.scrollTop < max - 1);
    };
    const resize = new ResizeObserver(check);
    const observeChildren = () => {
      resize.disconnect();
      resize.observe(el);
      for (const child of el.children) resize.observe(child);
    };
    // Inhoud verandert bij filteren: opnieuw meten.
    const mutation = new MutationObserver(() => {
      observeChildren();
      check();
    });

    observeChildren();
    mutation.observe(el, { childList: true, subtree: true });
    el.addEventListener("scroll", check, { passive: true });
    check();

    cleanup.current = () => {
      el.removeEventListener("scroll", check);
      resize.disconnect();
      mutation.disconnect();
    };
  }, []);
}
