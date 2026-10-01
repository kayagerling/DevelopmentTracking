import { useMemo } from "react";
import { Avatar } from "../components/Avatar";
import { BarList, ChartCard, ColumnChart, Legend, LineChart, type BarRow } from "../components/charts";
import type { Dashboard, Prd } from "../types";
import { useScrollHint } from "../hooks";

const C = {
  created: "var(--viz-1)",
  done: "var(--viz-2)",
  bar: "var(--viz-1)",
  klaar: "var(--green)",
  bezig: "var(--orange)",
  open: "var(--red)",
};

const DAY = 864e5;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monday = (d: Date) => {
  const s = startOfDay(d);
  return new Date(s.getTime() - ((s.getDay() + 6) % 7) * DAY);
};
const short = (d: Date) => d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
const long = (d: Date) => d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long" });

/** Wanneer een PRD klaar was: sluitdatum, of de laatste wijziging als hij op Done staat maar nog open is. */
const doneAt = (p: Prd) => (p.progress >= 100 ? p.closedAt || p.updatedAt || null : null);

function stackRow(key: string, label: BarRow["label"], prds: Prd[]): BarRow {
  const klaar = prds.filter((p) => p.progress >= 100).length;
  const open = prds.filter((p) => p.progress === 0).length;
  const avg = prds.length ? Math.round(prds.reduce((s, p) => s + p.progress, 0) / prds.length) : 0;
  return {
    key,
    label,
    end: `${avg}%`,
    segments: [
      { name: "Klaar", value: klaar, color: C.klaar },
      { name: "Bezig", value: prds.length - klaar - open, color: C.bezig },
      { name: "Nog niet gestart", value: open, color: C.open },
    ],
  };
}

export function StatsPage({ data }: { data: Dashboard }) {
  const scrollRef = useScrollHint<HTMLDivElement>();
  const s = useMemo(() => {
    const prds = data.prds;
    const today = startOfDay(new Date());

    // Verloop: cumulatief aangemaakt en afgerond per dag.
    const created = prds.map((p) => p.createdAt).filter(Boolean).map((d) => startOfDay(new Date(d)).getTime());
    const first = created.length ? Math.min(...created) : today.getTime();
    const days: Date[] = [];
    for (let t = first; t <= today.getTime(); t += DAY) days.push(new Date(t));
    const count = (dates: (string | null)[]) => {
      const per = new Map<string, number>();
      for (const d of dates) if (d) per.set(dayKey(new Date(d)), (per.get(dayKey(new Date(d))) ?? 0) + 1);
      let run = 0;
      return days.map((d) => (run += per.get(dayKey(d)) ?? 0));
    };
    const cumCreated = count(prds.map((p) => p.createdAt));
    const cumDone = count(prds.map(doneAt));

    // Afgerond per week (laatste 10 weken met data).
    const weeks = (dates: (string | null)[], n = 10) => {
      const end = monday(today);
      const list = Array.from({ length: n }, (_, i) => new Date(end.getTime() - (n - 1 - i) * 7 * DAY));
      const vals = list.map(() => 0);
      for (const d of dates) {
        if (!d) continue;
        const i = list.findIndex((w) => w.getTime() === monday(new Date(d)).getTime());
        if (i >= 0) vals[i]++;
      }
      const firstUsed = vals.findIndex((v) => v > 0);
      const from = firstUsed < 0 ? n - 1 : Math.min(firstUsed, n - 4);
      return { weeks: list.slice(from), values: vals.slice(from) };
    };
    const doneWeeks = weeks(prds.map(doneAt));
    const branchWeeks = weeks(data.branches.map((b) => b.lastCommitAt || null));

    // Kolommen op het scrumboard, in de volgorde van het werk.
    const order = ["backlog", "todo", "ready", "in progress", "in review", "on hold", "done"];
    const statusCounts = new Map<string, number>();
    for (const p of prds) statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1);
    const statuses = [...statusCounts.entries()].sort(
      (a, b) => ((order.indexOf(a[0].toLowerCase()) + 99) % 99) - ((order.indexOf(b[0].toLowerCase()) + 99) % 99),
    );

    // Doorlooptijd van afgeronde PRD's (aangemaakt → klaar), in dagen.
    const leadTimes = prds
      .map((p) => {
        const d = doneAt(p);
        return d && p.createdAt ? Math.max(0, (new Date(d).getTime() - new Date(p.createdAt).getTime()) / DAY) : null;
      })
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    const median = leadTimes.length ? leadTimes[Math.floor(leadTimes.length / 2)] : null;
    const buckets = [
      { label: "< 1 dag", tip: "Binnen een dag", max: 1 },
      { label: "1–3 d", tip: "1 tot 3 dagen", max: 3 },
      { label: "3–7 d", tip: "3 tot 7 dagen", max: 7 },
      { label: "1–2 wk", tip: "1 tot 2 weken", max: 14 },
      { label: "2–4 wk", tip: "2 tot 4 weken", max: 28 },
      { label: "> 4 wk", tip: "Meer dan 4 weken", max: Infinity },
    ].map((b, i, all) => ({
      ...b,
      value: leadTimes.filter((d) => d >= (i ? all[i - 1].max : 0) && d < b.max).length,
    }));

    const openPrds = prds.filter((p) => p.progress < 100);
    const busyWithBranch = openPrds.filter((p) => p.branches.length).length;

    const byTheme = new Map<string, Prd[]>();
    for (const p of prds) byTheme.set(p.theme, [...(byTheme.get(p.theme) ?? []), p]);
    const byPerson = new Map<string, { name: string; avatarUrl: string; prds: Prd[] }>();
    for (const p of prds) {
      const people = p.assignees.length ? p.assignees : [{ login: "__none__", name: "Niet toegewezen", avatarUrl: "" }];
      for (const a of people) {
        const g = byPerson.get(a.login) ?? { name: a.name, avatarUrl: a.avatarUrl, prds: [] };
        g.prds.push(p);
        byPerson.set(a.login, g);
      }
    }

    return {
      days, cumCreated, cumDone, doneWeeks, branchWeeks, statuses, median, buckets, openPrds, busyWithBranch,
      themeRows: [...byTheme.entries()].map(([t, list]) => stackRow(t, t, list)),
      personRows: [...byPerson.values()]
        .sort((a, b) => b.prds.length - a.prds.length)
        .map((g) => stackRow(g.name, <><Avatar name={g.name} src={g.avatarUrl} size={20} /> {g.name}</>, g.prds)),
    };
  }, [data]);

  const t = data.totals;
  const stackLegend = (
    <Legend items={[{ label: "Klaar", color: C.klaar }, { label: "Bezig", color: C.bezig }, { label: "Nog niet gestart", color: C.open }]} />
  );
  const stackTable = (rows: BarRow[], head: string) => ({
    head: [head, "Klaar", "Bezig", "Nog niet gestart", "Voortgang"],
    rows: rows.map((r) => [r.key, ...r.segments.map((x) => x.value), r.end]),
  });

  return (
    <div ref={scrollRef} className="stats-page">
      <div className="stats-page__head">
        <h2>Statistieken</h2>
      </div>

      <div className="tiles">
        <Tile label="Totale voortgang" value={`${t.progress}%`} />
        <Tile label="PRD's klaar" value={`${t.done}`} sub={`van ${t.count}`} />
        <Tile
          label="Doorlooptijd (mediaan)"
          value={s.median === null ? "—" : `${Math.max(1, Math.round(s.median))} ${Math.round(s.median) === 1 ? "dag" : "dagen"}`}
          sub="van aanmaken tot klaar"
        />
        <Tile label="Open werk met branch" value={`${s.busyWithBranch}`} sub={`van ${s.openPrds.length} open PRD's`} />
      </div>

      <div className="viz-grid-2">
        <ChartCard
          wide
          title="Verloop"
          subtitle="Aantal PRD's dat is aangemaakt en afgerond, opgeteld per dag"
          legend={<Legend items={[{ label: "Aangemaakt", color: C.created, kind: "line" }, { label: "Afgerond", color: C.done, kind: "line" }]} />}
          table={{
            head: ["Dag", "Aangemaakt", "Afgerond"],
            rows: s.days.map((d, i) => [short(d), s.cumCreated[i], s.cumDone[i]]).reverse(),
          }}
        >
          <LineChart
            labels={s.days.map(short)}
            tipLabels={s.days.map(long)}
            series={[
              { name: "Aangemaakt", color: C.created, values: s.cumCreated },
              { name: "Afgerond", color: C.done, values: s.cumDone, area: true },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Afgerond per week"
          subtitle="Aantal PRD's dat klaar is gekomen"
          table={{ head: ["Week van", "Afgerond"], rows: s.doneWeeks.weeks.map((w, i) => [short(w), s.doneWeeks.values[i]]) }}
        >
          <ColumnChart
            labels={s.doneWeeks.weeks.map(short)}
            tipLabels={s.doneWeeks.weeks.map((w) => `Week van ${short(w)}`)}
            values={s.doneWeeks.values}
            color={C.bar}
            unit={(v) => `${v} afgerond`}
          />
        </ChartCard>

        <ChartCard
          title="Op het scrumboard"
          subtitle="Aantal PRD's per kolom"
          table={{ head: ["Kolom", "PRD's"], rows: s.statuses }}
        >
          <BarList
            rows={s.statuses.map(([name, n]) => ({
              key: name,
              label: name,
              end: `${n}`,
              segments: [{ name: "PRD's", value: n, color: C.bar }],
            }))}
          />
        </ChartCard>

        <ChartCard title="Per thema" subtitle="Aantal PRD's per stand, met de gemiddelde voortgang" legend={stackLegend} table={stackTable(s.themeRows, "Thema")}>
          <BarList rows={s.themeRows} />
        </ChartCard>

        <ChartCard title="Per persoon" subtitle="Aantal PRD's per stand, met de gemiddelde voortgang" legend={stackLegend} table={stackTable(s.personRows, "Persoon")}>
          <BarList rows={s.personRows} />
        </ChartCard>

        <ChartCard
          title="Doorlooptijd"
          subtitle="Hoe lang afgeronde PRD's erover deden, van aanmaken tot klaar"
          table={{ head: ["Doorlooptijd", "PRD's"], rows: s.buckets.map((b) => [b.tip, b.value]) }}
        >
          <ColumnChart
            labels={s.buckets.map((b) => b.label)}
            tipLabels={s.buckets.map((b) => b.tip)}
            values={s.buckets.map((b) => b.value)}
            color={C.bar}
            unit={(v) => `${v} PRD's`}
          />
        </ChartCard>

        <ChartCard
          title="Branch-activiteit"
          subtitle={`Laatste commit per branch, per week (${t.branches} branches)`}
          table={{ head: ["Week van", "Branches"], rows: s.branchWeeks.weeks.map((w, i) => [short(w), s.branchWeeks.values[i]]) }}
        >
          <ColumnChart
            labels={s.branchWeeks.weeks.map(short)}
            tipLabels={s.branchWeeks.weeks.map((w) => `Week van ${short(w)}`)}
            values={s.branchWeeks.values}
            color={C.bar}
            unit={(v) => `${v} ${v === 1 ? "branch" : "branches"}`}
          />
        </ChartCard>
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card tile">
      <span className="muted small">{label}</span>
      <span className="tile__value">{value}</span>
      {sub && <span className="muted small">{sub}</span>}
    </div>
  );
}
