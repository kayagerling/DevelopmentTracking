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
}

export function ProgressBar({ value, size = "md", label, animated = false }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
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
