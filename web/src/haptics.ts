/**
 * Haptische tik op iOS, gebaseerd op https://github.com/tijnjh/ios-haptics (MIT).
 * De versie op npm (3.2.0) legt de switch nog onder de vinger, waardoor scrollen
 * vanaf een knop niet start. Dit is de gerepareerde versie uit de repo: een
 * doorzichtig <label> ligt over het element en stuurt de tik door naar een
 * verborgen switch, die Safari laat trillen.
 */

const isIos = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/** Ref voor een klikbaar element: geeft op iOS een haptische tik bij aanraken. Elders doet dit niets. */
export function haptic(el: HTMLElement | null) {
  if (!el || !isIos() || el.querySelector(":scope > [data-haptic-trigger]")) return;

  const label = document.createElement("label");
  label.setAttribute("data-haptic-trigger", "");
  label.setAttribute("aria-hidden", "true");
  Object.assign(label.style, { position: "absolute", inset: "0", touchAction: "manipulation" });
  label.style.setProperty("-webkit-tap-highlight-color", "transparent");

  // Nooit onder de vinger: een touchstart op de switch blokkeert scrollen.
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  Object.assign(input.style, { position: "absolute", width: "1px", height: "1px", margin: "0", visibility: "hidden" });
  // De doorgestuurde klik niet nog een keer bij de knop laten aankomen.
  input.addEventListener("click", (e) => e.stopPropagation());

  label.append(input);
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.append(label);
}
