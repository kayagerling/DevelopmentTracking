import { useMemo, useState } from "react";
import { GroupCard } from "./components/GroupCard";
import { PrdCard } from "./components/PrdCard";
import { PrdSheet } from "./components/PrdSheet";
import { ProgressBar } from "./components/ProgressBar";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { IS_STATIC, useDashboard, useTheme } from "./hooks";
import type { Prd } from "./types";

type StatusFilter = "all" | "todo" | "busy" | "done";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Alles" },
  { value: "todo", label: "Nog niet gestart" },
  { value: "busy", label: "Bezig" },
  { value: "done", label: "Klaar" },
];

const matchesStatus = (p: Prd, f: StatusFilter) =>
  f === "all" || (f === "todo" ? p.progress === 0 : f === "done" ? p.progress >= 100 : p.progress > 0 && p.progress < 100);

export default function App() {
  const { data, error, loading, refresh } = useDashboard();
  const [theme, setTheme] = useTheme();
  const [themeKey, setThemeKey] = useState<string | null>(null);
  const [personKey, setPersonKey] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const prds = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.prds.filter(
      (p) =>
        (!themeKey || p.theme === themeKey) &&
        (!personKey ||
          (personKey === "__none__" ? p.assignees.length === 0 : p.assignees.some((a) => a.login === personKey))) &&
        matchesStatus(p, status) &&
        (!q || `${p.prdNumber} ${p.title} ${p.simpleDescription}`.toLowerCase().includes(q)),
    );
  }, [data, themeKey, personKey, status, query]);

  const open = data?.prds.find((p) => p.id === openId) ?? null;
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
            {data && (
              <button className="live" onClick={refresh} title={IS_STATIC ? "Wordt elke ~15 minuten bijgewerkt" : "Nu verversen"}>
                <span className={`live__dot ${loading ? "is-loading" : ""} ${data.source === "demo" ? "is-demo" : ""}`} />
                <span className="small">
                  {data.source === "demo" ? "Demo" : IS_STATIC ? "Bijgewerkt" : "Live"} ·{" "}
                  {new Date(data.fetchedAt).toLocaleString("nl-NL", {
                    ...(new Date(data.fetchedAt).toDateString() === new Date().toDateString() ? {} : { day: "numeric", month: "short" }),
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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

        {data && t && (
          <div className="layout">
            <aside className="layout__side">
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
            </section>

            <div className="grid-2">
              <GroupCard title="Per thema" groups={data.byTheme} selected={themeKey} onSelect={setThemeKey} />
              <GroupCard title="Per persoon" groups={data.byPerson} withAvatar selected={personKey} onSelect={setPersonKey} />
            </div>
            </aside>

            <section className="layout__main">
              <div className="list-head">
                <h2>
                  Alle PRD's <span className="muted">({prds.length})</span>
                </h2>
                <div className="filters">
                  <div className="segmented segmented--wide">
                    {statusFilters.map((f) => (
                      <button key={f.value} className={status === f.value ? "active" : ""} onClick={() => setStatus(f.value)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className="search"
                    type="search"
                    placeholder="Zoeken…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              {prds.length ? (
                <div className="prd-grid">
                  {prds.map((p) => (
                    <PrdCard key={p.id} prd={p} onOpen={() => setOpenId(p.id)} />
                  ))}
                </div>
              ) : (
                <p className="empty muted">Geen PRD's gevonden met deze filters.</p>
              )}
            </section>
          </div>
        )}
      </main>

      {open && <PrdSheet prd={open} onClose={() => setOpenId(null)} />}
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
