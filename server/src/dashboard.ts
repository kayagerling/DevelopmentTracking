import { config, githubConfigured } from "./config.js";
import { demoPrds } from "./demo.js";
import { fetchBranches, fetchPrds, type RawBranch, type RawPrd } from "./github.js";
import { prdProgress } from "./progress.js";
import { simplify } from "./simplify.js";
import type { Branch, Dashboard, GroupProgress, Person, Prd } from "./types.js";

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
    branches: [],
  };
}

const branchUrl = (b: RawBranch) =>
  `https://github.com/${b.repository}/tree/${b.name.split("/").map(encodeURIComponent).join("/")}`;

/**
 * Koppelt elke branch aan een PRD: eerst via de koppeling op het issue (blok "Development"),
 * anders via "prd-144" in de branchnaam.
 */
function linkBranches(rawBranches: RawBranch[], rawPrds: RawPrd[], prds: Prd[]): Branch[] {
  const byNumber = new Map(prds.map((p) => [p.prdNumber, p]));
  const byLinked = new Map<string, Prd>();
  rawPrds.forEach((raw, i) => raw.linkedBranches.forEach((name) => byLinked.set(`${raw.repository}#${name}`, prds[i])));

  return rawBranches
    .map((b) => {
      const nr = b.name.match(/prd[-_ ]?(\d+)/i)?.[1];
      const prd = byLinked.get(`${b.repository}#${b.name}`) ?? (nr ? byNumber.get(`PRD-${Number(nr)}`) : undefined);
      const branch: Branch = {
        name: b.name,
        url: branchUrl(b),
        repository: b.repository,
        lastCommitAt: b.lastCommitAt,
        prdId: prd?.id ?? null,
        prdNumber: prd?.prdNumber ?? null,
      };
      prd?.branches.push(branch);
      return branch;
    })
    .sort((a, b) => b.lastCommitAt.localeCompare(a.lastCommitAt));
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
      const fetched = await fetchPrds();
      const repos = [...new Set(fetched.prds.map((p) => p.repository).filter(Boolean))];
      data = { ...fetched, branches: await fetchBranches(repos) };
      source = "github";
    } catch (err) {
      error = (err as Error).message;
      console.error("[github]", error);
      // Liever de laatste goede data tonen dan een leeg scherm.
      if (cached?.source === "github") return { ...cached, error };
    }
  }

  const unsorted = data.prds.map(toPrd);
  const branches = linkBranches(data.branches, data.prds, unsorted);
  const prds = unsorted.sort((a, b) =>
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
      branches: branches.length,
      branchesWithPrd: branches.filter((b) => b.prdId).length,
    },
    byTheme: group(prds, (p) => [{ key: p.theme, label: p.theme }]),
    byPerson: group(prds, (p) =>
      p.assignees.length
        ? p.assignees.map((a) => ({ key: a.login, label: a.name, avatarUrl: a.avatarUrl }))
        : [{ key: "__none__", label: "Niet toegewezen" }],
    ),
    prds,
    branches,
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
