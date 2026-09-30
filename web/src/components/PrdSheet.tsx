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
          <ProgressBar value={prd.progress} size="lg" label={`${prd.progress}%`} />
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
            Bekijk op GitHub ↗
          </a>
        )}
      </div>
    </div>
  );
}
