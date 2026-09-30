import type { ThemeChoice } from "../hooks";

const options: { value: ThemeChoice; label: string; icon: string }[] = [
  { value: "light", label: "Licht", icon: "☀︎" },
  { value: "system", label: "Auto", icon: "◐" },
  { value: "dark", label: "Donker", icon: "☾" },
];

export function ThemeSwitch({ value, onChange }: { value: ThemeChoice; onChange: (v: ThemeChoice) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Weergave">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
          title={o.label}
        >
          <span aria-hidden>{o.icon}</span>
          <span className="segmented__label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
