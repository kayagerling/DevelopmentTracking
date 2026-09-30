import { useEffect, useRef, useState } from "react";
import { setConfettiPaused } from "../confetti";

const STORAGE_KEY = "dt-welcome-hidden";

function isHidden() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Welkomstvenster bij het openen van de site, tenzij "Niet meer laten zien" is aangevinkt. */
export function WelcomeDialog() {
  const [open, setOpen] = useState(() => !isHidden());
  const [dontShow, setDontShow] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    if (dontShow) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* geen opslag beschikbaar: dan verschijnt hij de volgende keer weer */
      }
    }
    setOpen(false);
  };

  // Confetti wacht tot het venster dicht is (anders knalt hij achter de vervaagde achtergrond).
  useEffect(() => {
    setConfettiPaused(open);
    if (open) buttonRef.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  if (!open) return null;

  return (
    <div className="sheet-backdrop welcome-backdrop">
      <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-text">
        <span className="brand__logo welcome__logo" aria-hidden>
          <i /> <i /> <i />
        </span>
        <h2 id="welcome-title" className="welcome__title">Welkom!</h2>
        <p id="welcome-text" className="welcome__text">
          Hier zie je de voortgang van alle PRD's in een overzichtelijk dashboard met data en grafieken.
        </p>
        <p className="welcome__note">
          <strong>Let op:</strong> Er worden nog regelmatig PRD's toegevoegd.
        </p>
        <label className="welcome__check">
          <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          <span>Niet meer laten zien.</span>
        </label>
        <button ref={buttonRef} className="button welcome__button" onClick={close}>
          Doorgaan
        </button>
      </div>
    </div>
  );
}
