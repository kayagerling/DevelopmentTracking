import { useEffect, useRef } from "react";
import { cancelConfetti, requestConfetti } from "../confetti";

/** Kleur volgens de afspraak: rood < 25% ≤ oranje < 100% = groen. */
export function progressTone(pct: number): "red" | "orange" | "green" {
  if (pct >= 100) return "green";
  if (pct >= 25) return "orange";
  return "red";
}

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  /** Lichtglans die door het gevulde deel beweegt (verandert het percentage niet). */
  animated?: boolean;
  /** Unieke sleutel voor de confetti bij 100% (standaard het label). */
  confettiKey?: string;
}

export function ProgressBar({ value, size = "md", label, animated = false, confettiKey }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const ref = useRef<HTMLDivElement>(null);
  const key = confettiKey ?? label;

  // Bij 100%: confetti zodra de balk echt in beeld is (één keer, via de wachtrij).
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
  }, [pct, key]);

  return (
    <div
      ref={ref}
      className={`bar bar--${size} tone-${progressTone(pct)} ${animated && pct < 100 ? "bar--active" : ""}`}
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
