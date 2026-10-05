import { useEffect, useRef, useState } from "react";
import { TotalCard } from "../components/TotalCard";
import { haptic } from "../haptics";
import type { Dashboard } from "../types";

const icon = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function ExpandIcon() {
  return (
    <svg {...icon}>
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg {...icon}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function FullscreenIcon({ on }: { on: boolean }) {
  return (
    <svg {...icon}>
      {on ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
    </svg>
  );
}

/** Totale voortgang over het hele scherm, met alle effecten (bv. voor een tv of tweede scherm). */
export function ProgressPage({ totals, onClose }: { totals: Dashboard["totals"]; onClose: () => void }) {
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);
  // Vast houden: App geeft bij elke render (bv. verversen) een nieuwe functie mee.
  const close = useRef(onClose);
  close.current = onClose;
  const canFullscreen = typeof document.documentElement.requestFullscreen === "function" && document.fullscreenEnabled;

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    // Esc: in browser-fullscreen sluit de browser dat zelf; anders terug naar het overzicht.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.fullscreenElement && close.current();
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const toggleFullscreen = () =>
    (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

  return (
    <div className="progress-page">
      <TotalCard
        full
        totals={totals}
        toolbar={
          <>
            <button ref={haptic} className="total__btn" onClick={onClose} aria-label="Terug naar het overzicht" title="Terug (Esc)">
              <BackIcon />
            </button>
            {canFullscreen && (
              <button
                ref={haptic}
                className="total__btn"
                onClick={toggleFullscreen}
                aria-pressed={fullscreen}
                aria-label="Volledig scherm van de browser"
                title={fullscreen ? "Volledig scherm verlaten" : "Volledig scherm"}
              >
                <FullscreenIcon on={fullscreen} />
              </button>
            )}
          </>
        }
      />
    </div>
  );
}
