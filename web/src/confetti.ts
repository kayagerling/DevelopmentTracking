/**
 * Lichtgewicht confetti: één gedeeld canvas, één animatielus die alleen draait
 * zolang er deeltjes zijn, en een wachtrij zodat klappen na elkaar afgaan.
 */

const COLORS = ["#34c759", "#0a84ff", "#ff9f0a", "#ff375f", "#bf5af2", "#ffd60a"];
const PARTICLES = 34;
const GAP_MS = 380; // tijd tussen twee klappen
const START_DELAY_MS = 900; // eerst de balk laten vollopen (transition van 0.8s)
const GRAVITY = 0.32;
const DRAG = 0.985;
const LIFE = 95; // frames

interface Particle {
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number; w: number; h: number;
  color: string; age: number;
}

interface Job {
  key: string;
  el: Element;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Balken die al geknald hebben (per sessie): na verversen of filteren niet opnieuw. */
const fired = new Set<string>();
const queue: Job[] = [];
const particles: Particle[] = [];
const readyAt = performance.now() + START_DELAY_MS;
let nextAt = 0;
let timer: number | undefined;
let raf = 0;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let dpr = 1;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "60" });
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}

function burst(x: number, y: number) {
  for (let i = 0; i < PARTICLES; i++) {
    // Omhoog in een waaier, iets naar links (de klap zit aan de rechterkant van de balk).
    const angle = -Math.PI / 2 + (Math.random() - 0.62) * 1.5;
    const speed = 5 + Math.random() * 6;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      w: 4 + Math.random() * 4,
      h: 6 + Math.random() * 5,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      age: 0,
    });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}

function tick() {
  if (!ctx || !canvas) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vx *= DRAG;
    p.vy = p.vy * DRAG + GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.age++;
    if (p.age > LIFE || p.y > window.innerHeight + 20) {
      particles[i] = particles[particles.length - 1];
      particles.pop();
      continue;
    }
    ctx.globalAlpha = p.age > LIFE * 0.7 ? 1 - (p.age - LIFE * 0.7) / (LIFE * 0.3) : 1;
    ctx.fillStyle = p.color;
    // "Flipperend" papiertje: de breedte schommelt mee met de rotatie.
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    const flip = Math.abs(Math.cos(p.age * 0.18 + p.rot));
    ctx.setTransform(dpr * c * flip, dpr * s * flip, -dpr * s, dpr * c, p.x * dpr, p.y * dpr);
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  }
  ctx.globalAlpha = 1;

  if (particles.length) raf = requestAnimationFrame(tick);
  else {
    raf = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function pump() {
  timer = undefined;
  const now = performance.now();
  const wait = Math.max(readyAt, nextAt) - now;
  if (wait > 0) {
    timer = window.setTimeout(pump, wait);
    return;
  }
  const job = queue.shift();
  if (!job) return;
  const r = job.el.getBoundingClientRect();
  if (r.width > 0 && job.el.isConnected) {
    fired.add(job.key);
    ensureCanvas();
    burst(r.right, r.top + r.height / 2);
    nextAt = now + GAP_MS;
  }
  if (queue.length) pump();
}

/** Zet een klap in de wachtrij (één keer per key). */
export function requestConfetti(key: string, el: Element) {
  if (fired.has(key) || queue.some((j) => j.key === key) || reducedMotion()) return;
  queue.push({ key, el });
  if (timer === undefined) pump();
}

/** Uit beeld (of verdwenen) voordat hij aan de beurt was: niet meer afvuren. */
export function cancelConfetti(key: string) {
  const i = queue.findIndex((j) => j.key === key);
  if (i >= 0) queue.splice(i, 1);
}
