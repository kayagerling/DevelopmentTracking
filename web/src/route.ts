import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Routering via de hash, werkt ook op GitHub Pages.
 * Voorbeeld: #/?thema=Beveiliging&status=busy&sort=voortgang&prd=PRD-144
 * Zo blijven filters staan na verversen en kun je een PRD of lijst delen.
 */

export type Page = "overzicht" | "statistieken";
export type StatusFilter = "all" | "todo" | "busy" | "done";
export type SortKey = "standaard" | "nummer" | "voortgang" | "bijgewerkt";

export interface Route {
  page: Page;
  theme: string | null;
  person: string | null;
  status: StatusFilter;
  query: string;
  sort: SortKey;
  prd: string | null; // prdNumber van de geopende PRD
  changed: boolean; // alleen PRD's die veranderd zijn sinds je laatste bezoek
}

const STATUSES: StatusFilter[] = ["all", "todo", "busy", "done"];
const SORTS: SortKey[] = ["standaard", "nummer", "voortgang", "bijgewerkt"];

function parse(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const i = hash.indexOf("?");
  const path = i === -1 ? hash : hash.slice(0, i);
  const p = new URLSearchParams(i === -1 ? "" : hash.slice(i + 1));
  const status = p.get("status") as StatusFilter;
  const sort = p.get("sort") as SortKey;
  return {
    page: path.startsWith("statistieken") ? "statistieken" : "overzicht",
    theme: p.get("thema"),
    person: p.get("persoon"),
    status: STATUSES.includes(status) ? status : "all",
    query: p.get("q") ?? "",
    sort: SORTS.includes(sort) ? sort : "standaard",
    prd: p.get("prd"),
    changed: p.get("nieuw") === "1",
  };
}

function toUrl(r: Route): string {
  const base = window.location.pathname + window.location.search;
  // De statistiekenpagina heeft geen filters; die blijven wel bewaard voor de terugweg.
  if (r.page === "statistieken") return `${base}#/statistieken`;
  const p = new URLSearchParams();
  if (r.theme) p.set("thema", r.theme);
  if (r.person) p.set("persoon", r.person);
  if (r.status !== "all") p.set("status", r.status);
  if (r.query) p.set("q", r.query);
  if (r.sort !== "standaard") p.set("sort", r.sort);
  if (r.changed) p.set("nieuw", "1");
  if (r.prd) p.set("prd", r.prd);
  const qs = p.toString();
  return qs ? `${base}#/?${qs}` : base;
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(parse);
  const current = useRef(route);

  useEffect(() => {
    const onNav = () => {
      current.current = parse();
      setRoute(current.current);
    };
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, []);

  /** Past de route aan. Standaard zonder nieuwe stap in de geschiedenis (filters, zoeken). */
  const update = useCallback((patch: Partial<Route>, opts: { push?: boolean; state?: unknown } = {}) => {
    const next = { ...current.current, ...patch };
    const url = toUrl(next);
    if (opts.push) history.pushState(opts.state ?? null, "", url);
    else history.replaceState(history.state, "", url);
    current.current = next;
    setRoute(next);
  }, []);

  const go = useCallback((page: Page) => update({ page, prd: null }, { push: true }), [update]);

  // Openen als nieuwe stap, zodat de terugknop (op mobiel) de PRD sluit.
  const openPrd = useCallback((prdNumber: string) => update({ prd: prdNumber }, { push: true, state: { prdOpened: true } }), [update]);
  const closePrd = useCallback(() => {
    if ((history.state as { prdOpened?: boolean } | null)?.prdOpened) history.back();
    else update({ prd: null });
  }, [update]);

  return { route, update, go, openPrd, closePrd };
}
