import { haptic } from "../haptics";
import type { ChangeKind } from "../hooks";
import type { Prd } from "../types";
import { AvatarStack } from "./Avatar";
import { BranchIcon } from "./BranchCard";
import { Pct, ProgressBar, progressTone } from "./ProgressBar";

/** Icoontje per stand: leeg rondje (nog niet gestart), half (bezig), vinkje (klaar). */
function StatusIcon({ tone }: { tone: "red" | "orange" | "green" }) {
  return (
    <svg className="pill__icon" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      {tone === "green" ? (
        <path d="M2.5 6.3l2.3 2.2 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <circle cx="6" cy="6" r="4.2" />
          {tone === "orange" && <path d="M6 1.8a4.2 4.2 0 0 1 0 8.4z" fill="currentColor" stroke="none" />}
        </>
      )}
    </svg>
  );
}

export function StatusPill({ prd }: { prd: Prd }) {
  const tone = progressTone(prd.progress);
  return (
    <span className={`pill tone-${tone}`}>
      <StatusIcon tone={tone} />
      {prd.status}
    </span>
  );
}

const changeLabel: Record<ChangeKind, { text: string; tone: string }> = {
  nieuw: { text: "Nieuw", tone: "accent" },
  gewijzigd: { text: "Gewijzigd", tone: "orange" },
  klaar: { text: "Klaar", tone: "green" },
};

export function PrdCard({ prd, change, onOpen }: { prd: Prd; change?: ChangeKind; onOpen: () => void }) {
  return (
    <button ref={haptic} className="card prd" onClick={onOpen}>
      <div className="prd__top">
        <span className="prd__id">
          <span className="prd__nr">{prd.prdNumber}</span>
          {change && (
            <span className={`pill pill--change tone-${changeLabel[change].tone}`} title="Sinds je laatste bezoek">
              {changeLabel[change].text}
            </span>
          )}
        </span>
        <StatusPill prd={prd} />
      </div>
      <h3 className="prd__title">{prd.title}</h3>
      <p className="prd__desc">{prd.simpleDescription}</p>
      <div className="prd__bottom">
        <div className="prd__progress">
          <ProgressBar value={prd.progress} size="sm" label={`${prd.title}: ${prd.progress}%`} confettiKey={`card-${prd.id}`} />
          <strong className="pct small"><Pct value={prd.progress} /></strong>
        </div>
        <div className="prd__foot">
          <span className="prd__tags">
            <span className="tag">{prd.theme}</span>
            {prd.branches?.length > 0 && (
              <span className="tag tag--branch" title={prd.branches.map((b) => b.name).join("\n")}>
                <BranchIcon size={12} /> {prd.branches.length}
              </span>
            )}
          </span>
          <AvatarStack people={prd.assignees} />
        </div>
      </div>
    </button>
  );
}
