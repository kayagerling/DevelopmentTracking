import { useEffect, useRef } from "react";

/**
 * Bovenste helft van een planeet als draaiende 3D-puntenwolk (canvas).
 * De punten liggen op breedtecirkels; waar de ruis "land" zegt, zijn ze groter en feller.
 * Kleuren komen uit CSS (--planet-*), zodat licht/donker vanzelf meegaat.
 */

const TILT = 0.34; // de camera kijkt iets van boven (radialen)
const TURN_MS = 140_000; // één omwenteling
const FRAME_MS = 1000 / 30; // 30 fps is genoeg voor zo'n trage draai
const GAP_PX = 5.2; // afstand tussen de punten op het oppervlak
const LEVELS = 12; // doorzichtigheid in stapjes: per stap één keer vullen
const START = 2.2; // beginstand (en de vaste stand zonder animatie)
const LIGHT = normalize(-0.55, 0.6, 0.58); // licht van linksboven-voor

interface Dot {
  x: number;
  y: number;
  z: number;
  land: boolean;
}

interface Colors {
  land: string;
  sea: string;
  glow: string;
  landA: number;
  seaA: number;
  glowA: number;
}

interface Geometry {
  /** Middelpunt (fractie van breedte/hoogte) en straal (fractie van de breedte). */
  cx: number;
  cy: number;
  r: number;
}

function normalize(x: number, y: number, z: number) {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l] as const;
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hash(x: number, y: number, z: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Gladde 3D-ruis (value noise). */
function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const c = (i: number, j: number, k: number) => hash(xi + i, yi + j, zi + k);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return mix(
    mix(mix(c(0, 0, 0), c(1, 0, 0), u), mix(c(0, 1, 0), c(1, 1, 0), u), v),
    mix(mix(c(0, 0, 1), c(1, 0, 1), u), mix(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

/** Ligt dit punt van de bol op "land"? Een paar lagen ruis geven grillige continenten. */
function isLand(x: number, y: number, z: number) {
  let n = 0;
  for (let o = 0, amp = 0.5, f = 1.6; o < 4; o++, amp /= 2, f *= 2) n += amp * noise(x * f + 9.1, y * f + 3.7, z * f + 5.3);
  return n / 0.9375 > 0.53;
}

/** Punten op breedtecirkels, van net onder de evenaar tot de pool. */
function makeDots(step: number): Dot[] {
  const dots: Dot[] = [];
  for (let lat = -0.1, ring = 0; lat < Math.PI / 2; lat += step, ring++) {
    const c = Math.cos(lat), y = Math.sin(lat);
    const n = Math.max(1, Math.round((2 * Math.PI * c) / step));
    for (let i = 0; i < n; i++) {
      const lon = ((i + (ring % 2) / 2) / n) * 2 * Math.PI;
      const x = c * Math.sin(lon), z = c * Math.cos(lon);
      dots.push({ x, y, z, land: isLand(x, y, z) });
    }
  }
  return dots;
}

function readColors(el: Element): Colors {
  const s = getComputedStyle(el);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    land: v("--planet-land"),
    sea: v("--planet-sea"),
    glow: v("--planet-glow"),
    landA: Number(v("--planet-land-a")) || 0.8,
    seaA: Number(v("--planet-sea-a")) || 0.2,
    glowA: Number(v("--planet-glow-a")) || 0.3,
  };
}

const buckets: number[][] = Array.from({ length: LEVELS * 2 }, () => []);

function render(ctx: CanvasRenderingContext2D, dots: Dot[], w: number, h: number, dpr: number, g: Geometry, angle: number, col: Colors) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const cx = g.cx * w, cy = g.cy * h, R = g.r * w;
  if (R <= 0) return;

  // Lichaam (zacht verlicht) en atmosfeer, beide weglopend naar de horizon.
  const body = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.7, R * 0.05, cx, cy, R);
  body.addColorStop(0, `rgba(${col.glow}, ${col.glowA * 0.55})`);
  body.addColorStop(1, `rgba(${col.glow}, ${col.glowA * 0.08})`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, 0);
  ctx.fill();

  const halo = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.2);
  halo.addColorStop(0, `rgba(${col.glow}, 0)`);
  halo.addColorStop(0.18, `rgba(${col.glow}, ${col.glowA})`);
  halo.addColorStop(1, `rgba(${col.glow}, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.2, Math.PI, 0);
  ctx.fill();

  ctx.globalCompositeOperation = "destination-in";
  const horizon = ctx.createLinearGradient(0, cy - R * 1.2, 0, cy);
  horizon.addColorStop(0, "#000");
  horizon.addColorStop(0.55, "#000");
  horizon.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";

  // Punten: draaien om de as, kantelen naar de camera, alleen de voorkant boven de horizon.
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const ct = Math.cos(TILT), st = Math.sin(TILT);
  const size = Math.min(1.3, Math.max(0.8, R / 105));
  for (const b of buckets) b.length = 0;

  for (const d of dots) {
    const x = d.x * ca + d.z * sa;
    const z0 = d.z * ca - d.x * sa;
    const y = d.y * ct - z0 * st;
    const z = d.y * st + z0 * ct;
    if (z <= 0 || y <= 0) continue;

    const lit = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);
    // Rustig rond het getal: punten vlak boven de horizon in het midden worden zachter.
    const text = Math.hypot(x / 0.72, y / 0.5);
    const fade = smooth(0, 0.35, z) * smooth(0, 0.4, y) * (0.25 + 0.75 * smooth(0.6, 1.2, text));
    const a = (d.land ? col.landA : col.seaA) * (0.3 + 0.7 * lit) * fade;
    if (a < 0.03) continue;

    const level = Math.min(LEVELS, Math.ceil(a * LEVELS));
    buckets[(d.land ? LEVELS : 0) + level - 1].push(cx + x * R, cy - y * R, (d.land ? 0.7 + 0.6 * z : 0.5 + 0.35 * z) * size);
  }

  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (!b.length) continue;
    ctx.fillStyle = `rgba(${i >= LEVELS ? col.land : col.sea}, ${((i % LEVELS) + 1) / LEVELS})`;
    ctx.beginPath();
    for (let j = 0; j < b.length; j += 3) {
      ctx.moveTo(b[j] + b[j + 2], b[j + 1]);
      ctx.arc(b[j], b[j + 1], b[j + 2], 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

export function Planet({ cx, cy, r }: Geometry) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const dark = matchMedia("(prefers-color-scheme: dark)");
    let w = 0, h = 0, dpr = 1;
    let dots: Dot[] = [];
    let colors = readColors(canvas);
    let angle = START, last = 0, raf = 0, inView = true;

    const draw = () => render(ctx, dots, w, h, dpr, { cx, cy, r }, angle, colors);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      angle += (Math.min(now - last, 100) / TURN_MS) * 2 * Math.PI;
      last = now;
      draw();
    };

    // Alleen draaien als hij in beeld is en beweging mag; anders één stilstaand beeld.
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (still.matches) angle = START;
      if (inView && !still.matches) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
      draw();
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      if (!box.width) return;
      w = box.width;
      h = box.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      dots = makeDots(GAP_PX / (r * w));
      draw();
    };

    const recolor = () => {
      colors = readColors(canvas);
      draw();
    };

    const ro = new ResizeObserver(resize);
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      sync();
    });
    const mo = new MutationObserver(recolor);
    ro.observe(canvas);
    io.observe(canvas);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    dark.addEventListener("change", recolor);
    still.addEventListener("change", sync);
    resize();
    sync();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      dark.removeEventListener("change", recolor);
      still.removeEventListener("change", sync);
    };
  }, [cx, cy, r]);

  return <canvas ref={ref} className="gauge__planet" aria-hidden />;
}
