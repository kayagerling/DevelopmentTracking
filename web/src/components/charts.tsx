import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/* ─────────────  Hulpjes  ───────────── */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Een rond getal net boven de max, zodat de as schone stappen heeft (0 / 20 / 40 …). */
function niceScale(max: number, ticks = 4): { top: number; step: number } {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const clean = Math.max(1, Math.round(step));
  return { top: Math.ceil(max / clean) * clean, step: clean };
}

interface Tip {
  x: number;
  y: number;
  content: ReactNode;
}

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div className="viz-tip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.content}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; kind?: "line" | "rect" }[] }) {
  return (
    <ul className="viz-legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className={`viz-key viz-key--${i.kind ?? "rect"}`} style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Kaart rond een grafiek, met een knop om dezelfde cijfers als tabel te zien. */
export function ChartCard({
  title,
  subtitle,
  table,
  legend,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  table: { head: string[]; rows: (string | number)[][] };
  legend?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`card viz-card ${wide ? "viz-card--wide" : ""}`}>
      <header className="viz-card__head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        <button className="link small" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>
          {asTable ? "Grafiek" : "Tabel"}
        </button>
      </header>
      {!asTable && legend}
      {asTable ? (
        <div className="viz-table-wrap">
          <table className="viz-table">
            <thead>
              <tr>
                {table.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/* ─────────────  Lijngrafiek (met kruisdraad)  ───────────── */

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
  area?: boolean;
}

export function LineChart({
  labels,
  tipLabels,
  series,
  height = 240,
}: {
  labels: string[]; // korte labels voor de x-as
  tipLabels?: string[]; // uitgebreide labels in de tooltip
  series: LineSeries[];
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const m = { top: 12, right: 44, bottom: 26, left: 34 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const n = labels.length;
  const { top, step } = niceScale(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => m.left + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => m.top + h - (v / top) * h;
  const yTicks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const xTickEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 80))));

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el || n === 0) return;
    const px = clientX - el.getBoundingClientRect().left - m.left;
    setIdx(Math.max(0, Math.min(n - 1, Math.round((px / (w || 1)) * (n - 1)))));
  };

  const tip: Tip | null =
    idx === null
      ? null
      : {
          x: Math.min(x(idx) + 12, Math.max(0, width - 170)),
          y: m.top,
          content: (
            <>
              <div className="viz-tip__title">{tipLabels?.[idx] ?? labels[idx]}</div>
              {series.map((s) => (
                <div key={s.name} className="viz-tip__row">
                  <span className="viz-key viz-key--line" style={{ background: s.color }} />
                  <strong>{s.values[idx]}</strong>
                  <span className="muted">{s.name}</span>
                </div>
              ))}
            </>
          ),
        };

  return (
    <div className="viz" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => `${s.name}: ${s.values.at(-1)}`).join(", ")}>
          {yTicks.map((t) => (
            <g key={t}>
              <line className="viz-grid" x1={m.left} x2={m.left + w} y1={y(t)} y2={y(t)} />
              <text className="viz-axis" x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % xTickEvery === 0 || i === n - 1 ? (
              i === n - 1 || n - 1 - i >= xTickEvery ? (
                <text key={i} className="viz-axis" x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
                  {l}
                </text>
              ) : null
            ) : null,
          )}
          {series.map((s) => {
            const d = s.values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
            return (
              <g key={s.name}>
                {s.area && <path d={`${d}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={s.color} opacity={0.1} />}
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {/* Waarde aan het einde van elke lijn */}
          {series.map((s) => (
            <g key={`end-${s.name}`}>
              <circle className="viz-dot" cx={x(n - 1)} cy={y(s.values[n - 1] ?? 0)} r={4} fill={s.color} />
              <text className="viz-label" x={x(n - 1) + 9} y={y(s.values[n - 1] ?? 0)} dy="0.32em">
                {s.values[n - 1]}
              </text>
            </g>
          ))}
          {idx !== null && (
            <g>
              <line className="viz-cross" x1={x(idx)} x2={x(idx)} y1={m.top} y2={m.top + h} />
              {series.map((s) => (
                <circle key={s.name} className="viz-dot" cx={x(idx)} cy={y(s.values[idx])} r={4} fill={s.color} />
              ))}
            </g>
          )}
          <rect
            x={m.left}
            y={m.top}
            width={w}
            height={h}
            fill="transparent"
            tabIndex={0}
            aria-label="Beweeg of gebruik de pijltjes om per dag te lezen"
            onPointerMove={(e) => pick(e.clientX)}
            onPointerLeave={() => setIdx(null)}
            onBlur={() => setIdx(null)}
            onFocus={() => setIdx(n - 1)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, (i ?? n - 1) - 1));
              if (e.key === "ArrowRight") setIdx((i) => Math.min(n - 1, (i ?? 0) + 1));
            }}
          />
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

/* ─────────────  Kolommen  ───────────── */

export function ColumnChart({
  labels,
  tipLabels,
  values,
  color,
  unit,
  height = 200,
}: {
  labels: string[];
  tipLabels?: string[];
  values: number[];
  color: string;
  unit: (v: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const m = { top: 18, right: 4, bottom: 26, left: 30 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const n = values.length;
  const band = n ? w / n : 0;
  const bw = Math.min(24, band * 0.6);
  const { top, step } = niceScale(Math.max(1, ...values));
  const y = (v: number) => m.top + h - (v / top) * h;
  const yTicks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const max = Math.max(...values);
  const maxIdx = values.indexOf(max);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 48))));

  const tip: Tip | null =
    idx === null
      ? null
      : {
          x: Math.min(m.left + band * idx + band / 2 + 10, Math.max(0, width - 160)),
          y: m.top,
          content: (
            <>
              <div className="viz-tip__title">{tipLabels?.[idx] ?? labels[idx]}</div>
              <div className="viz-tip__row">
                <strong>{unit(values[idx])}</strong>
              </div>
            </>
          ),
        };

  return (
    <div className="viz" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={labels.map((l, i) => `${l}: ${values[i]}`).join(", ")}>
          {yTicks.map((t) => (
            <g key={t}>
              <line className="viz-grid" x1={m.left} x2={m.left + w} y1={y(t)} y2={y(t)} />
              <text className="viz-axis" x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {values.map((v, i) => {
            const cx = m.left + band * i + band / 2;
            const bh = Math.max(0, y(0) - y(v));
            const r = Math.min(4, bh, bw / 2);
            const x0 = cx - bw / 2;
            const y0 = y(v);
            // Afgeronde bovenkant, vierkant op de basislijn.
            const d = bh
              ? `M${x0},${y(0)}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${y(0)}Z`
              : "";
            return (
              <g key={i}>
                {d && <path d={d} fill={color} className={`viz-bar ${idx === i ? "is-hover" : ""}`} />}
                {(i === maxIdx || i === n - 1) && v > 0 && (
                  <text className="viz-label" x={cx} y={y0 - 6} textAnchor="middle">
                    {v}
                  </text>
                )}
                {(i % labelEvery === 0 || i === n - 1) && (
                  <text className="viz-axis" x={cx} y={height - 6} textAnchor="middle">
                    {labels[i]}
                  </text>
                )}
                <rect
                  x={m.left + band * i}
                  y={m.top}
                  width={band}
                  height={h}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${tipLabels?.[i] ?? labels[i]}: ${unit(v)}`}
                  onPointerEnter={() => setIdx(i)}
                  onPointerLeave={() => setIdx(null)}
                  onFocus={() => setIdx(i)}
                  onBlur={() => setIdx(null)}
                />
              </g>
            );
          })}
          <line className="viz-base" x1={m.left} x2={m.left + w} y1={y(0)} y2={y(0)} />
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

/* ─────────────  Liggende balken (enkel of gestapeld)  ───────────── */

export interface BarRow {
  key: string;
  label: ReactNode;
  segments: { name: string; value: number; color: string }[];
  /** Tekst aan het einde van de balk. */
  end: string;
}

export function BarList({ rows, max }: { rows: BarRow[]; max?: number }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const scale = max ?? Math.max(1, ...rows.map((r) => r.segments.reduce((s, x) => s + x.value, 0)));

  const show = (e: React.PointerEvent | React.FocusEvent, row: BarRow, seg: BarRow["segments"][number]) => {
    const box = ref.current?.getBoundingClientRect();
    const t = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!box) return;
    setTip({
      x: Math.min(t.left - box.left + t.width / 2, box.width - 170),
      y: t.bottom - box.top + 6,
      content: (
        <>
          <div className="viz-tip__title">{row.key}</div>
          <div className="viz-tip__row">
            <span className="viz-key viz-key--rect" style={{ background: seg.color }} />
            <strong>{seg.value}</strong>
            <span className="muted">{seg.name}</span>
          </div>
        </>
      ),
    });
  };

  return (
    <div className="viz viz--bars" ref={ref}>
      {rows.map((row) => (
        <div key={row.key} className="viz-row">
          <span className="viz-row__label" title={row.key}>{row.label}</span>
          <div className="viz-row__track">
            {row.segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <span
                  key={s.name}
                  className="viz-seg"
                  style={{ width: `${(s.value / scale) * 100}%`, background: s.color }}
                  tabIndex={0}
                  aria-label={`${row.key}, ${s.name}: ${s.value}`}
                  onPointerEnter={(e) => show(e, row, s)}
                  onPointerLeave={() => setTip(null)}
                  onFocus={(e) => show(e, row, s)}
                  onBlur={() => setTip(null)}
                />
              ))}
          </div>
          <span className="viz-row__end">{row.end}</span>
        </div>
      ))}
      <Tooltip tip={tip} />
    </div>
  );
}
