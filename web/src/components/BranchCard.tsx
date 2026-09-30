import { useState } from "react";
import type { Branch } from "../types";

const COLLAPSED = 8;

export function BranchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg className="branch-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path
        fill="currentColor"
        d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 2.122a2.25 2.25 0 1 0-1.5 0v5.256a2.25 2.25 0 1 0 1.5 0V9.5h4.25A2.75 2.75 0 0 0 12 6.75v-.378a2.25 2.25 0 1 0-1.5 0v.378c0 .69-.56 1.25-1.25 1.25H5V5.372ZM11.25 4.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM4.25 12a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z"
      />
    </svg>
  );
}

/** Welke branch hoort bij welke PRD. */
export function BranchCard({ branches, onOpenPrd }: { branches: Branch[]; onOpenPrd: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? branches : branches.slice(0, COLLAPSED);

  return (
    <section className="card">
      <header className="card__head">
        <h2>Branches</h2>
        <span className="muted small">{branches.length} totaal</span>
      </header>
      {branches.length ? (
        <ul className="branches">
          {shown.map((b) => (
            <li key={`${b.repository}#${b.name}`} className="branch">
              <a className="branch__name" href={b.url} target="_blank" rel="noreferrer" title={b.name}>
                <BranchIcon />
                <span>{b.name}</span>
              </a>
              {b.prdId ? (
                <button className="tag tag--link" onClick={() => onOpenPrd(b.prdId!)}>
                  {b.prdNumber}
                </button>
              ) : (
                <span className="tag">Geen PRD</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Er zijn nog geen branches.</p>
      )}
      {branches.length > COLLAPSED && (
        <button className="link" onClick={() => setAll((a) => !a)}>
          {all ? "Toon minder" : `Toon alle ${branches.length}`}
        </button>
      )}
    </section>
  );
}
