import { useEffect, useState } from "react";
import type { Prd } from "../types";
import { Avatar } from "./Avatar";
import { BranchIcon } from "./BranchCard";
import { StatusPill } from "./PrdCard";
import { ProgressBar } from "./ProgressBar";

/** Detailvenster van één PRD, met de technische tekst standaard ingeklapt. */
export function PrdSheet({ prd, onClose }: { prd: Prd; onClose: () => void }) {
  const [showTech, setShowTech] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={prd.title} onClick={(e) => e.stopPropagation()}>
        <button className="sheet__close" onClick={onClose} aria-label="Sluiten">
          ✕
        </button>
        <div className="prd__top">
          <span className="prd__nr">{prd.prdNumber}</span>
          <StatusPill prd={prd} />
        </div>
        <h2 className="sheet__title">{prd.title}</h2>

        <div className="sheet__progress">
          <ProgressBar value={prd.progress} size="lg" label={`${prd.progress}%`} confettiKey={`sheet-${prd.id}`} />
          <strong className="pct">{prd.progress}%</strong>
        </div>

        <h4 className="eyebrow">Waar gaat dit over?</h4>
        <p className="sheet__simple">{prd.simpleDescription}</p>

        <dl className="facts">
          <div>
            <dt>Thema</dt>
            <dd>{prd.theme}</dd>
          </div>
          <div>
            <dt>Wie werkt eraan</dt>
            <dd className="people">
              {prd.assignees.length
                ? prd.assignees.map((a) => (
                    <span key={a.login} className="person">
                      <Avatar name={a.name} src={a.avatarUrl} size={22} /> {a.name}
                    </span>
                  ))
                : "Nog niemand"}
            </dd>
          </div>
          <div>
            <dt>Branches</dt>
            <dd className="sheet__branches">
              {prd.branches?.length
                ? prd.branches.map((b) => (
                    <a key={`${b.repository}#${b.name}`} className="branch__name" href={b.url} target="_blank" rel="noreferrer" title={b.name}>
                      <BranchIcon />
                      <span>{b.name}</span>
                    </a>
                  ))
                : "Nog geen branch"}
            </dd>
          </div>
          <div>
            <dt>Laatst bijgewerkt</dt>
            <dd>{prd.updatedAt ? new Date(prd.updatedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "—"}</dd>
          </div>
        </dl>

        {prd.description && (
          <>
            <button className="link" onClick={() => setShowTech((s) => !s)}>
              {showTech ? "Verberg technische beschrijving" : "Toon technische beschrijving"}
            </button>
            {showTech && <pre className="tech">{prd.description}</pre>}
          </>
        )}

        {prd.url && (
          <a className="button" href={prd.url} target="_blank" rel="noreferrer">
            Bekijk op GitHub
            <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
