import { config } from "./config.js";
import type { RawPrd } from "./github.js";

/** Telt afgevinkte taken in de beschrijving: "- [x] ..." vs "- [ ] ...". */
function checklistProgress(body: string): number | null {
  const all = body.match(/^\s*[-*]\s+\[[ xX]\]/gm);
  if (!all || all.length === 0) return null;
  const done = body.match(/^\s*[-*]\s+\[[xX]\]/gm)?.length ?? 0;
  return Math.round((done / all.length) * 100);
}

/**
 * Voortgang van één PRD:
 * - gesloten issue of kolom "Done" = 100%
 * - anders het percentage dat bij de kolom hoort (STATUS_PROGRESS)
 * - staan er taken (checkboxes) in de PRD, dan telt het hoogste van de twee
 */
export function prdProgress(prd: RawPrd): number {
  const statusPct = config.statusProgress[prd.status.toLowerCase()];
  if (prd.closed || statusPct === 100) return 100;

  let pct = statusPct ?? 0;
  if (config.useChecklist) {
    const checklist = checklistProgress(prd.body);
    // Nooit 100% zolang de kaart niet op Done staat.
    if (checklist !== null) pct = Math.max(pct, Math.min(checklist, 95));
  }
  return Math.max(0, Math.min(100, Math.round(pct)));
}
