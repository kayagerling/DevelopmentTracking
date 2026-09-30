import type { Prd } from "../types";
import { AvatarStack } from "./Avatar";
import { ProgressBar, progressTone } from "./ProgressBar";

export function StatusPill({ prd }: { prd: Prd }) {
  return <span className={`pill tone-${progressTone(prd.progress)}`}>{prd.status}</span>;
}

export function PrdCard({ prd, onOpen }: { prd: Prd; onOpen: () => void }) {
  return (
    <button className="card prd" onClick={onOpen}>
      <div className="prd__top">
        <span className="prd__nr">{prd.prdNumber}</span>
        <StatusPill prd={prd} />
      </div>
      <h3 className="prd__title">{prd.title}</h3>
      <p className="prd__desc">{prd.simpleDescription}</p>
      <div className="prd__bottom">
        <div className="prd__progress">
          <ProgressBar value={prd.progress} size="sm" label={`${prd.title}: ${prd.progress}%`} />
          <strong className="pct small">{prd.progress}%</strong>
        </div>
        <div className="prd__foot">
          <span className="tag">{prd.theme}</span>
          <AvatarStack people={prd.assignees} />
        </div>
      </div>
    </button>
  );
}
