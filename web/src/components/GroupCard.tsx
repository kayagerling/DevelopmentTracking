import type { GroupProgress } from "../types";
import { Avatar } from "./Avatar";
import { ProgressBar } from "./ProgressBar";

interface Props {
  title: string;
  groups: GroupProgress[];
  withAvatar?: boolean;
  selected: string | null;
  onSelect: (key: string | null) => void;
}

export function GroupCard({ title, groups, withAvatar, selected, onSelect }: Props) {
  return (
    <section className="card">
      <header className="card__head">
        <h2>{title}</h2>
        {selected && (
          <button className="link" onClick={() => onSelect(null)}>
            Toon alles
          </button>
        )}
      </header>
      <ul className="groups">
        {groups.map((g) => (
          <li key={g.key}>
            <button
              className={`group ${selected === g.key ? "is-selected" : ""} ${selected && selected !== g.key ? "is-dimmed" : ""}`}
              onClick={() => onSelect(selected === g.key ? null : g.key)}
            >
              <div className="group__row">
                <span className="group__name">
                  {withAvatar && <Avatar name={g.label} src={g.avatarUrl} size={26} />}
                  {g.label}
                </span>
                <span className="group__meta">
                  <span className="muted small">
                    {g.done}/{g.count} klaar
                  </span>
                  <strong className="pct">{g.progress}%</strong>
                </span>
              </div>
              <ProgressBar value={g.progress} label={`${g.label}: ${g.progress}%`} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
