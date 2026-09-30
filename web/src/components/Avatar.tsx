import type { Person } from "../types";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Vaste, rustige kleur per persoon voor de initialen. */
function hue(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ name, src, size = 28 }: { name: string; src?: string; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (src) return <img className="avatar" src={src} alt={name} title={name} style={style} />;
  return (
    <span
      className="avatar avatar--initials"
      title={name}
      style={{ ...style, background: `hsl(${hue(name)} 55% 55%)` }}
      aria-label={name}
    >
      {name === "Niet toegewezen" ? "?" : initials(name)}
    </span>
  );
}

export function AvatarStack({ people }: { people: Person[] }) {
  if (!people.length) return <span className="muted small">Niet toegewezen</span>;
  return (
    <span className="avatar-stack">
      {people.map((p) => (
        <Avatar key={p.login} name={p.name} src={p.avatarUrl} size={24} />
      ))}
    </span>
  );
}
