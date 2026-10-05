import { useEffect, type RefObject } from "react";

/**
 * Liquid glass (https://github.com/ybouane/liquidglass) op de tegels van de totale voortgang.
 *
 * De library breekt alleen wat binnen dezelfde root achter het glas ligt. De tegelrij is de root;
 * op `backdrop` (een canvas achter de tegels) tekenen we daarom precies na wat de kaart op die plek
 * laat zien: de achtergrond en de bewegende aurora (live uitgelezen uit de CSS). Zo buigt het glas
 * de echte aurora af. Lukt WebGL niet, dan blijven de gewone tegels staan.
 */

const FRAME_MS = 1000 / 30;

const GLASS = {
  blurAmount: 0.50,
  refraction: 2,
  chromAberration: 0.02,
  fresnel: 1,
  zRadius: 10, // ondiepe rand: bij een diepere geeft de spiegeling vreemde balkjes op zulke kleine tegels
  shadowSpread: 12,
  distortion: 0.02,
  shadowOffsetY: 3,
};

/** Per thema: op een lichte achtergrond stralen randlicht en reflectie anders alles wit. */
const THEMED = {
  dark: { edgeHighlight: 0.05, specular: 0.00, brightness: 0.04, shadowOpacity: 0.3 },
  light: { edgeHighlight: 0.25, specular: 0.00, fresnel: 0.35, brightness: -0.03, shadowOpacity: 0.12 },
};

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

/** "rgba(r, g, b, a)" → dezelfde kleur met alpha 0 (voor een nette overloop naar doorzichtig). */
const clear = (color: string) => {
  const m = color.match(/[\d.]+/g);
  return m && m.length >= 3 ? `rgba(${m[0]}, ${m[1]}, ${m[2]}, 0)` : "rgba(0, 0, 0, 0)";
};

/** "170px" of "32vmin" → pixels (custom properties komen als tekst terug). */
const toPx = (value: string) => {
  const n = parseFloat(value);
  return value.endsWith("vmin") ? (n * Math.min(innerWidth, innerHeight)) / 100 : n;
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Achtergrond + aurora van de kaart, getekend in de coördinaten van de tegelrij. */
function paint(bg: HTMLCanvasElement, root: HTMLElement, card: HTMLElement, aurora: HTMLElement, work: HTMLCanvasElement, mask: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rb = root.getBoundingClientRect();
  const w = Math.round(rb.width * dpr), h = Math.round(rb.height * dpr);
  if (!w || !h) return;
  for (const c of [bg, work, mask]) if (c.width !== w || c.height !== h) Object.assign(c, { width: w, height: h });

  const cb = card.getBoundingClientRect();
  const ox = cb.left - rb.left, oy = cb.top - rb.top; // kaart t.o.v. de tegelrij
  const cs = getComputedStyle(card);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  const radius = parseFloat(cs.borderTopLeftRadius) || 0;
  const reach = toPx(v("--aurora-reach")) || 170; // zelfde maskerlengte als in de CSS

  // 1. Achtergrond: radial-gradient(120% 90% at 50% 0%, bg-1, bg-2 58%, bg-3)
  const ctx = bg.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.translate(ox + cb.width / 2, oy);
  ctx.scale(cb.width * 1.2, cb.height * 0.9);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, v("--total-bg-1"));
  g.addColorStop(0.58, v("--total-bg-2"));
  g.addColorStop(1, v("--total-bg-3"));
  ctx.fillStyle = g;
  ctx.fillRect(-2, -2, 4, 4);
  ctx.restore();

  // 2. Aurora: de vlekken op hun huidige (geanimeerde) plek, plus de ademende rand.
  const a = work.getContext("2d")!;
  a.setTransform(dpr, 0, 0, dpr, 0, 0);
  a.globalCompositeOperation = "source-over";
  a.clearRect(0, 0, rb.width, rb.height);
  for (const blob of aurora.querySelectorAll("i")) {
    const b = blob.getBoundingClientRect();
    const color = getComputedStyle(blob).getPropertyValue("--c").trim();
    if (!b.width || !color) continue;
    a.save();
    a.translate(b.left - rb.left + b.width / 2, b.top - rb.top + b.height / 2);
    a.scale(b.width / 2, b.height / 2);
    const rg = a.createRadialGradient(0, 0, 0, 0, 0, 1);
    rg.addColorStop(0, color);
    rg.addColorStop(1, clear(color));
    a.fillStyle = rg;
    a.fillRect(-1, -1, 2, 2);
    a.restore();
  }
  const rim = getComputedStyle(aurora, "::before");
  a.save();
  a.globalAlpha = Number(rim.opacity) || 1;
  roundedRect(a, ox, oy, cb.width, cb.height, radius);
  a.clip();
  a.shadowColor = v("--aurora-rim");
  a.shadowBlur = 48 * dpr;
  a.beginPath();
  a.rect(ox - 200, oy - 200, cb.width + 400, cb.height + 400);
  a.roundRect(ox + 4, oy + 4, cb.width - 8, cb.height - 8, Math.max(0, radius - 4));
  a.fillStyle = "#000";
  a.fill("evenodd");
  a.restore();

  // 3. Masker van de aurora: vier randen die naar binnen vervagen (samen opgeteld).
  const m = mask.getContext("2d")!;
  m.setTransform(dpr, 0, 0, dpr, 0, 0);
  m.clearRect(0, 0, rb.width, rb.height);
  const edges: [number, number, number, number, number][] = [
    [ox, oy, ox, oy + cb.height, cb.height], // van boven
    [ox, oy + cb.height, ox, oy, cb.height], // van onder
    [ox, oy, ox + cb.width, oy, cb.width], // van links
    [ox + cb.width, oy, ox, oy, cb.width], // van rechts
  ];
  for (const [x0, y0, x1, y1, len] of edges) {
    const lg = m.createLinearGradient(x0, y0, x1, y1);
    const end = Math.min(0.42, reach / len);
    lg.addColorStop(0, "#000");
    lg.addColorStop(Math.min(0.14, end * 0.9), "rgba(0, 0, 0, 0.45)");
    lg.addColorStop(end, "rgba(0, 0, 0, 0)");
    m.fillStyle = lg;
    m.fillRect(0, 0, rb.width, rb.height);
  }
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.globalCompositeOperation = "destination-in";
  a.drawImage(mask, 0, 0);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(work, 0, 0);
}

export function useLiquidGlass(rootRef: RefObject<HTMLElement>, backdropRef: RefObject<HTMLCanvasElement>, cardRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const root = rootRef.current, bg = backdropRef.current, card = cardRef.current;
    const aurora = card?.querySelector<HTMLElement>(".total__aurora");
    if (!root || !bg || !card || !aurora) return;

    const work = document.createElement("canvas");
    const mask = document.createElement("canvas");
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let glass: { destroy(): void; markChanged(el?: HTMLElement): void } | undefined;
    let stopped = false, raf = 0, last = 0, inView = true;

    let tiles: HTMLElement[] = [];
    const draw = () => {
      paint(bg, root, card, aurora, work, mask);
      glass?.markChanged(bg);
    };
    // Glasinstellingen voor het huidige thema (de library leest data-config opnieuw bij een wijziging).
    const theme = () => {
      const config = JSON.stringify(THEMED[isDark() ? "dark" : "light"]);
      for (const t of tiles) if (t.dataset.config !== config) t.dataset.config = config;
      draw();
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;
      draw();
    };
    // De aurora beweegt: alleen bijtekenen als het in beeld is en beweging mag.
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = inView && !still.matches && glass ? requestAnimationFrame(tick) : 0;
      draw();
    };

    const ro = new ResizeObserver(draw);
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      sync();
    });
    const mo = new MutationObserver(theme); // licht/donker
    const dark = matchMedia("(prefers-color-scheme: dark)");

    (async () => {
      try {
        const { LiquidGlass } = await import("../vendor/liquidglass.js");
        if (stopped) return;
        tiles = [...root.children].filter((el): el is HTMLElement => el.classList.contains("total__tile"));
        theme();
        const cornerRadius = parseFloat(getComputedStyle(tiles[0]).borderTopLeftRadius) || 20;
        const instance = await LiquidGlass.init({ root, glassElements: tiles, defaults: { ...GLASS, cornerRadius } });
        if (stopped) return instance.destroy();
        glass = instance;
        root.classList.add("is-glass");
        ro.observe(root);
        io.observe(root);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        dark.addEventListener("change", theme);
        still.addEventListener("change", sync);
        sync();
      } catch (err) {
        console.warn("Liquid glass niet beschikbaar, gewone tegels worden getoond.", err);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      dark.removeEventListener("change", theme);
      still.removeEventListener("change", sync);
      glass?.destroy();
      root.classList.remove("is-glass");
    };
  }, [rootRef, backdropRef, cardRef]);
}
