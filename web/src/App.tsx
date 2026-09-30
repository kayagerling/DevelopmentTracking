import { useEffect, useMemo } from "react";
import { BranchCard, BranchIcon } from "./components/BranchCard";
import { GroupCard } from "./components/GroupCard";
import { PrdCard } from "./components/PrdCard";
import { PrdSheet } from "./components/PrdSheet";
import { ProgressBar } from "./components/ProgressBar";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { WelcomeDialog } from "./components/WelcomeDialog";
import { haptic } from "./haptics";
import { IS_STATIC, useChanges, useDashboard, useScrollHint, useTheme } from "./hooks";
import { StatsPage } from "./pages/Stats";
import { useRoute, type SortKey, type StatusFilter } from "./route";
import type { Prd } from "./types";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "todo", label: "Nog niet gestart" },
  { value: "busy", label: "Bezig" },
  { value: "done", label: "Klaar" },
];

const matchesStatus = (p: Prd, f: StatusFilter) =>
  f === "all" || (f === "todo" ? p.progress === 0 : f === "done" ? p.progress >= 100 : p.progress > 0 && p.progress < 100);

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "standaard", label: "Standaard" },
  { value: "nummer", label: "Nummer" },
  { value: "voortgang", label: "Voortgang" },
  { value: "bijgewerkt", label: "Laatst bijgewerkt" },
];

const prdNum = (p: Prd) => Number(p.prdNumber.match(/\d+/)?.[0] ?? 0);
const sorters: Record<SortKey, ((a: Prd, b: Prd) => number) | null> = {
  standaard: null,
  nummer: (a, b) => prdNum(a) - prdNum(b),
  voortgang: (a, b) => b.progress - a.progress,
  bijgewerkt: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

export default function App() {
  const { data, error, loading, refresh, manual } = useDashboard();
  const [theme, setTheme] = useTheme();
  const { route, update, go, openPrd, closePrd } = useRoute();
  const { page, theme: themeKey, person: personKey, status, query, sort } = route;
  const { changes, markSeen } = useChanges(data);
  const sideRef = useScrollHint<HTMLElement>();
  const mainRef = useScrollHint<HTMLElement>();

  const prds = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const list = data.prds.filter(
      (p) =>
        (!themeKey || p.theme === themeKey) &&
        (!personKey ||
          (personKey === "__none__" ? p.assignees.length === 0 : p.assignees.some((a) => a.login === personKey))) &&
        matchesStatus(p, status) &&
        (!route.changed || changes.has(p.id)) &&
        (!q || `${p.prdNumber} ${p.title} ${p.simpleDescription} ${(p.branches ?? []).map((b) => b.name).join(" ")}`.toLowerCase().includes(q)),
    );
    const by = sorters[sort];
    return by ? [...list].sort(by) : list;
  }, [data, themeKey, personKey, status, query, sort, route.changed, changes]);

  const open = (route.prd && data?.prds.find((p) => p.prdNumber === route.prd)) || null;
  const openById = (id: string) => {
    const p = data?.prds.find((x) => x.id === id);
    if (p) openPrd(p.prdNumber);
  };
  // Na het bekijken (sluiten) telt een PRD niet meer als gewijzigd.
  useEffect(() => {
    if (open) return () => markSeen(open.id);
  }, [open?.id, markSeen]);

  const t = data?.totals;

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__logo" aria-hidden>
              <i /> <i /> <i />
            </span>
            <div>
              <h1>DevelopmentTracker</h1>
              <p className="muted small">{data?.projectTitle ?? "Laden…"}</p>
            </div>
          </div>
          <div className="topbar__actions">
            <nav className="segmented nav" aria-label="Pagina">
              <button ref={haptic} className={page === "overzicht" ? "active" : ""} aria-current={page === "overzicht" ? "page" : undefined} onClick={() => go("overzicht")}>
                Overzicht
              </button>
              <button ref={haptic} className={page === "statistieken" ? "active" : ""} aria-current={page === "statistieken" ? "page" : undefined} onClick={() => go("statistieken")}>
                Statistieken
              </button>
            </nav>
            {data && (
              <button
                className={`live ${manual !== "idle" ? `is-${manual}` : ""}`}
                onClick={refresh}
                disabled={manual === "busy"}
                aria-live="polite"
                title={IS_STATIC ? "Klik om te verversen (de gegevens zelf worden elke ~15 minuten bijgewerkt)" : "Klik om nu te verversen"}
              >
                <span className={`live__dot ${loading ? "is-loading" : ""} ${data.source === "demo" ? "is-demo" : ""}`} />
                <span className="small">
                  {manual === "busy"
                    ? "Verversen…"
                    : manual === "done"
                      ? "Ververst ✓"
                      : <>
                          {data.source === "demo" ? "Demo" : IS_STATIC ? "Bijgewerkt" : "Live"} ·{" "}
                          {new Date(data.fetchedAt).toLocaleString("nl-NL", {
                            ...(new Date(data.fetchedAt).toDateString() === new Date().toDateString() ? {} : { day: "numeric", month: "short" }),
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </>}
                </span>
              </button>
            )}
            <ThemeSwitch value={theme} onChange={setTheme} />
          </div>
        </div>
      </header>

      <main className="container">
        {(error || data?.error) && (
          <div className="notice">{IS_STATIC ? "Kon de gegevens niet laden" : "Kon GitHub niet bereiken"}: {error ?? data?.error}. De laatst bekende gegevens worden getoond.</div>
        )}
        {data?.source === "demo" && (
          <div className="notice notice--info">
            Je ziet voorbeeldgegevens. Vul <code>.env</code> in om het echte scrumboard uit GitHub te laden.
          </div>
        )}

        {!data && !error && <div className="skeleton" />}

        {data && page === "statistieken" && <StatsPage data={data} onBack={() => go("overzicht")} />}

        {data && t && page === "overzicht" && (
          <div className="layout">
            <aside ref={sideRef} className="layout__side">
            <section className="hero card">
              <div className="hero__main">
                <p className="eyebrow">Totale voortgang</p>
                <div className="hero__pct">{t.progress}%</div>
                <ProgressBar value={t.progress} size="lg" label="Totale voortgang" animated />
              </div>
              <div className="stats">
                <Stat label="PRD's" value={t.count} />
                <Stat label="Klaar" value={t.done} tone="green" />
                <Stat label="Bezig" value={t.inProgress} tone="orange" />
                <Stat label="Nog niet gestart" value={t.notStarted} tone="red" />
              </div>
              <p className="hero__branches small">
                <BranchIcon />
                <span>
                  <strong>{t.branches}</strong> {t.branches === 1 ? "branch" : "branches"}
                  <span className="muted"> · {t.branchesWithPrd} bij een PRD</span>
                </span>
              </p>
            </section>

            <div className="grid-2">
              <GroupCard title="Per thema" groups={data.byTheme} selected={themeKey} onSelect={(k) => update({ theme: k })} />
              <GroupCard title="Per persoon" groups={data.byPerson} withAvatar selected={personKey} onSelect={(k) => update({ person: k })} />
            </div>

            <BranchCard branches={data.branches ?? []} onOpenPrd={openById} />
            </aside>

            <section ref={mainRef} className="layout__main">
              <div className="list-head">
                <div className="list-head__title">
                  <h2>
                    Alle PRD's <span className="muted">({prds.length})</span>
                  </h2>
                  {(changes.size > 0 || route.changed) && (
                    <button
                      className={`changes-toggle ${route.changed ? "active" : ""}`}
                      aria-pressed={route.changed}
                      onClick={() => update({ changed: !route.changed })}
                    >
                      {route.changed ? "Toon alle PRD's" : `${changes.size} ${changes.size === 1 ? "wijziging" : "wijzigingen"} sinds je laatste bezoek`}
                    </button>
                  )}
                </div>
                <div className="filters">
                  <div className="segmented segmented--wide">
                    {statusFilters.map((f) => (
                      <button key={f.value} className={status === f.value ? "active" : ""} onClick={() => update({ status: f.value })}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className="search"
                    type="search"
                    placeholder="Zoeken…"
                    value={query}
                    onChange={(e) => update({ query: e.target.value })}
                  />
                  <select className="search sort" value={sort} onChange={(e) => update({ sort: e.target.value as SortKey })} aria-label="Sorteren">
                    {sortOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.value === "standaard" ? "Sorteren" : o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {prds.length ? (
                <div className="prd-grid">
                  {prds.map((p) => (
                    <PrdCard key={p.id} prd={p} change={changes.get(p.id)} onOpen={() => openPrd(p.prdNumber)} />
                  ))}
                </div>
              ) : (
                <p className="empty muted">Geen PRD's gevonden met deze filters.</p>
              )}
            </section>
          </div>
        )}
      </main>

      {open && <PrdSheet prd={open} onClose={closePrd} />}
      <WelcomeDialog />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="stat">
      <span className={`stat__value ${tone ? `text-${tone}` : ""}`}>{value}</span>
      <span className="muted small">{label}</span>
    </div>
  );
}
