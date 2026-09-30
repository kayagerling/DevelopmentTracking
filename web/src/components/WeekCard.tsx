import { useMemo, useState } from "react";
import type { Prd } from "../types";

const DAY = 864e5;
const COLLAPSED = 3;

/** Maandag van de week van d (weekstart = maandag). */
function monday(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return new Date(s.getTime() - ((s.getDay() + 6) % 7) * DAY);
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

/** Welke PRD's deze week (sinds maandag) afgerond zijn. */
export function WeekCard({ prds, onOpenPrd }: { prds: Prd[]; onOpenPrd: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const done = useMemo(() => {
    const start = monday(new Date());
    return prds
      .filter((p) => p.progress >= 100)
      .map((p) => ({ prd: p, at: p.closedAt ?? p.updatedAt }))
      .filter((x): x is { prd: Prd; at: string } => !!x.at && new Date(x.at).getTime() >= start.getTime())
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [prds]);
  const shown = all ? done : done.slice(0, COLLAPSED);

  return (
    <section className="card">
      <header className="card__head">
        <h2>Deze week</h2>
        <span className="muted small">{done.length} {done.length === 1 ? "PRD" : "PRD's"} klaar</span>
      </header>
      {done.length ? (
        <ul className="groups">
          {shown.map(({ prd, at }) => (
            <li key={prd.id}>
              <button className="group" onClick={() => onOpenPrd(prd.id)}>
                <div className="group__row">
                  <span className="group__name">
                    <span className="prd__nr">{prd.prdNumber}</span> {prd.title}
                  </span>
                  <span className="muted small">{fmt(at)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Nog geen PRD's afgerond deze week.</p>
      )}
      {done.length > COLLAPSED && (
        <button className="link" onClick={() => setAll((a) => !a)}>
          {all ? "Toon minder" : `Toon alle ${done.length}`}
        </button>
      )}
    </section>
  );
}
