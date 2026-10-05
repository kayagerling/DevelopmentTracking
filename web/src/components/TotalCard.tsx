import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { haptic } from "../haptics";
import { usePlanet } from "../hooks";
import type { Dashboard } from "../types";
import { Planet } from "./Planet";
import { progressColor, useConfetti } from "./ProgressBar";
import { useLiquidGlass } from "./useLiquidGlass";

// Maten van de meter in viewBox-eenheden; de planeet gebruikt dezelfde.
const W = 210, H = 110, CX = 105, CY = 105, R = 100, STROKE = 10, PLANET_R = 80;

/** Boog van links over de bovenkant naar rechts, tot pct procent. */
function arc(pct: number) {
  const a = Math.PI * (1 - pct / 100);
  return `M${CX - R} ${CY}A${R} ${R} 0 0 1 ${(CX + R * Math.cos(a)).toFixed(2)} ${(CY - R * Math.sin(a)).toFixed(2)}`;
}

/** Loopt soepel naar de nieuwe waarde, zodat de boog en het getal gelijk oplopen. */
function useTween(target: number, ms = 1100) {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / ms);
      current.current = from + (target - from) * (1 - (1 - t) ** 4);
      setValue(current.current);
      if (t < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function PlanetIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="6" />
      <path d="M15.95 7.48A10 3.4 -20 1 1 6.07 11.08" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function Tile({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="total__tile">
      <span className={`total__num text-${tone}`}>{value}</span>
      <span className="total__name">{label}</span>
    </div>
  );
}

/** Totale voortgang: halve meter met het percentage, en daaronder klaar / bezig / nog niet gestart. */
export function TotalCard({ totals: t }: { totals: Dashboard["totals"] }) {
  const pct = Math.max(0, Math.min(100, Math.round(t.progress)));
  const shown = useTween(pct);
  const n = Math.round(shown);
  const [planet, togglePlanet] = usePlanet();
  const end = useRef<HTMLSpanElement>(null);
  const card = useRef<HTMLElement>(null);
  const tiles = useRef<HTMLDivElement>(null);
  const glassBg = useRef<HTMLCanvasElement>(null);
  useLiquidGlass(tiles, glassBg, card);
  const glow = `gauge-glow-${useId().replace(/:/g, "")}`;
  // Confetti pas als de boog helemaal vol is.
  useConfetti(end, n, "Totale voortgang");

  return (
    <section ref={card} className="card total" style={{ "--tone": progressColor(pct) } as CSSProperties}>
      <div className="total__aurora" aria-hidden>
        <i /> <i /> <i /> <i />
      </div>

      <button
        ref={haptic}
        className="total__toggle"
        aria-pressed={planet}
        aria-label="Planeet tonen"
        title={planet ? "Planeet verbergen" : "Planeet tonen"}
        onClick={togglePlanet}
      >
        <PlanetIcon off={!planet} />
      </button>

      <div className="gauge" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Totale voortgang">
        {planet && <Planet cx={CX / W} cy={CY / H} r={PLANET_R / W} />}
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <defs>
            <filter id={glow} filterUnits="userSpaceOnUse" x={-20} y={-20} width={W + 40} height={H + 40}>
              <feGaussianBlur stdDeviation={4} />
            </filter>
          </defs>
          <path className="gauge__track" d={arc(100)} strokeWidth={STROKE} />
          {/* Minimaal een stipje bij 0%, zodat de kleur zichtbaar blijft */}
          <path className="gauge__halo" d={arc(100)} strokeWidth={STROKE} pathLength={100} strokeDasharray={`${Math.max(shown, 0.5)} 200`} filter={`url(#${glow})`} />
          <path className="gauge__fill" d={arc(100)} strokeWidth={STROKE} pathLength={100} strokeDasharray={`${Math.max(shown, 0.5)} 200`} />
          {pct < 100 && shown > 2 && <path className="gauge__glint" d={arc(shown)} strokeWidth={STROKE * 0.4} pathLength={100} />}
        </svg>
        <span ref={end} className="gauge__end" style={{ left: `${((CX + R) / W) * 100}%`, top: `${(CY / H) * 100}%` }} />
        <strong className="gauge__value">
          {n}
          <span className="gauge__unit">%</span>
          {n >= 100 && <span className="pct__done" aria-hidden>✓</span>}
        </strong>
      </div>

      <p className="total__label">
        Totale voortgang <span className="muted">· {t.count} {t.count === 1 ? "PRD" : "PRD's"}</span>
      </p>

      <div ref={tiles} className="total__tiles">
        <canvas ref={glassBg} className="total__glass-bg" aria-hidden />
        <Tile value={t.done} label="Klaar" tone="green" />
        <Tile value={t.inProgress} label="Bezig" tone="orange" />
        <Tile value={t.notStarted} label="Nog niet gestart" tone="red" />
      </div>
    </section>
  );
}
