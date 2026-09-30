import { config, githubConfigured } from "./config.js";
import { demoPrds } from "./demo.js";
import { fetchPrds, type RawPrd } from "./github.js";
import { prdProgress } from "./progress.js";
import { simplify } from "./simplify.js";
import type { Dashboard, GroupProgress, Person, Prd } from "./types.js";

function toPrd(raw: RawPrd): Prd {
  const simple = simplify(raw.id, raw.title, raw.body);
  return {
    id: raw.id,
    prdNumber: raw.prdNumber,
    title: raw.title,
    url: raw.url,
    repository: raw.repository,
    status: raw.status,
    progress: prdProgress(raw),
    theme: raw.theme,
    assignees: raw.assignees.map<Person>((a) => ({
      login: a.login,
      name: a.name || a.login,
      avatarUrl: a.avatarUrl,
    })),
    description: raw.body,
    simpleDescription: simple.text,
    simpleSource: simple.source,
    updatedAt: raw.updatedAt,
  };
}

function group(prds: Prd[], keysOf: (p: Prd) => { key: string; label: string; avatarUrl?: string }[]): GroupProgress[] {
  const map = new Map<string, GroupProgress & { sum: number }>();
  for (const p of prds) {
    for (const k of keysOf(p)) {
      const g = map.get(k.key) ?? { ...k, count: 0, done: 0, progress: 0, sum: 0 };
      g.count++;
      g.sum += p.progress;
      if (p.progress >= 100) g.done++;
      map.set(k.key, g);
    }
  }
  return [...map.values()]
    .map(({ sum, ...g }) => ({ ...g, progress: Math.round(sum / g.count) }))
    .sort((a, b) => b.progress - a.progress || a.label.localeCompare(b.label));
}

let cached: Dashboard | null = null;
let cachedAt = 0;
let inflight: Promise<Dashboard> | null = null;

async function build(): Promise<Dashboard> {
  let source: Dashboard["source"] = "demo";
  let error: string | undefined;
  let data = demoPrds();

  if (githubConfigured) {
    try {
      data = await fetchPrds();
      source = "github";
    } catch (err) {
      error = (err as Error).message;
      console.error("[github]", error);
      // Liever de laatste goede data tonen dan een leeg scherm.
      if (cached?.source === "github") return { ...cached, error };
    }
  }

  const prds = data.prds.map(toPrd).sort((a, b) =>
    a.theme.localeCompare(b.theme) || Number(a.prdNumber.slice(4)) - Number(b.prdNumber.slice(4)),
  );
  const done = prds.filter((p) => p.progress >= 100).length;
  const notStarted = prds.filter((p) => p.progress === 0).length;

  return {
    projectTitle: data.projectTitle,
    source,
    fetchedAt: new Date().toISOString(),
    refreshSeconds: config.refreshSeconds,
    totals: {
      count: prds.length,
      done,
      notStarted,
      inProgress: prds.length - done - notStarted,
      progress: prds.length ? Math.round(prds.reduce((s, p) => s + p.progress, 0) / prds.length) : 0,
    },
    byTheme: group(prds, (p) => [{ key: p.theme, label: p.theme }]),
    byPerson: group(prds, (p) =>
      p.assignees.length
        ? p.assignees.map((a) => ({ key: a.login, label: a.name, avatarUrl: a.avatarUrl }))
        : [{ key: "__none__", label: "Niet toegewezen" }],
    ),
    prds,
    error,
  };
}

export async function getDashboard(force = false): Promise<Dashboard> {
  const fresh = Date.now() - cachedAt < config.refreshSeconds * 1000 * 0.9;
  if (cached && fresh && !force) return cached;
  inflight ??= build()
    .then((d) => {
      cached = d;
      cachedAt = Date.now();
      return d;
    })
    .finally(() => (inflight = null));
  return inflight;
}
