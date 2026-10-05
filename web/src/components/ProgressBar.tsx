import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { cancelConfetti, requestConfetti } from "../confetti";

/** Kleur volgens de afspraak: rood < 25% ≤ oranje < 100% = groen. */
export function progressTone(pct: number): "red" | "orange" | "green" {
  if (pct >= 100) return "green";
  if (pct >= 25) return "orange";
  return "red";
}

/** Balkkleur: rood < 20% ≤ geel < 50%, dan geleidelijk van geel naar groen, en vanaf 80% groen. */
export function progressColor(pct: number): string {
  if (pct < 20) return "var(--red)";
  if (pct < 50) return "var(--yellow)";
  if (pct >= 80) return "var(--green)";
  return `color-mix(in oklch, var(--green) ${Math.round(((pct - 50) / 30) * 100)}%, var(--yellow))`;
}

/** Percentage als tekst, met een groen vinkje bij 100%. */
export function Pct({ value }: { value: number }) {
  return (
    <>
      {value}%{value >= 100 && <span className="pct__done" aria-hidden> ✓</span>}
    </>
  );
}

/** Bij 100%: confetti zodra het element echt in beeld is (één keer, via de wachtrij). */
export function useConfetti(ref: RefObject<Element>, pct: number, key: string | undefined) {
  useEffect(() => {
    const el = ref.current;
    if (pct < 100 || !el || !key || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? requestConfetti(key, el) : cancelConfetti(key)),
      { threshold: 0.9 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelConfetti(key);
    };
  }, [ref, pct, key]);
}

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  /** Unieke sleutel voor de confetti bij 100% (standaard het label). */
  confettiKey?: string;
}

export function ProgressBar({ value, size = "md", label, confettiKey }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const ref = useRef<HTMLDivElement>(null);
  useConfetti(ref, pct, confettiKey ?? label);

  return (
    <div
      ref={ref}
      className={`bar bar--${size}`}
      style={{ "--tone": progressColor(pct) } as CSSProperties}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      {/* Minimaal een stipje tonen bij 0% zodat de rode kleur zichtbaar blijft */}
      <div className="bar__fill" style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}
