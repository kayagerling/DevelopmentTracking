import { haptic } from "../haptics";
import type { ChangeKind } from "../hooks";
import type { Prd } from "../types";
import { AvatarStack } from "./Avatar";
import { BranchIcon } from "./BranchCard";
import { ProgressBar, progressTone } from "./ProgressBar";

export function StatusPill({ prd }: { prd: Prd }) {
  return <span className={`pill tone-${progressTone(prd.progress)}`}>{prd.status}</span>;
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
          <strong className="pct small">{prd.progress}%</strong>
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
