import { execSync } from "node:child_process";

function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

/** Standaard: welke kolom op het scrumboard hoort bij welk percentage. */
const DEFAULT_STATUS_PROGRESS: Record<string, number> = {
  backlog: 0,
  todo: 0,
  "to do": 0,
  ready: 10,
  "in progress": 50,
  "in review": 80,
  review: 80,
  testing: 90,
  done: 100,
};

function parseStatusProgress(): Record<string, number> {
  const raw = env("STATUS_PROGRESS");
  if (!raw) return DEFAULT_STATUS_PROGRESS;
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k.toLowerCase(), Number(v)]));
  } catch {
    console.warn("[config] STATUS_PROGRESS is geen geldige JSON, standaardwaarden worden gebruikt.");
    return DEFAULT_STATUS_PROGRESS;
  }
}

/** Token uit .env, en anders uit de ingelogde GitHub CLI (`gh auth token`). */
function resolveToken(): string {
  const fromEnv = env("GITHUB_TOKEN");
  if (fromEnv) return fromEnv;
  try {
    return execSync("gh auth token", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

export const config = {
  port: Number(env("PORT", "3000")),
  github: {
    token: resolveToken(),
    owner: env("GITHUB_OWNER"),
    ownerType: env("GITHUB_OWNER_TYPE", "user") as "user" | "organization",
    projectNumber: Number(env("GITHUB_PROJECT_NUMBER", "0")),
    statusField: env("STATUS_FIELD", "Status"),
    themeField: env("THEME_FIELD", "Thema"),
    themeLabelPrefix: env("THEME_LABEL_PREFIX", "thema:"),
    prdTitlePattern: new RegExp(env("PRD_TITLE_PATTERN", "^PRD-(\\d+)\\s*[—–:-]\\s*(.*)$"), "i"),
  },
  statusProgress: parseStatusProgress(),
  useChecklist: env("USE_CHECKLIST", "true") === "true",
  refreshSeconds: Number(env("REFRESH_SECONDS", "60")),
  anthropic: {
    apiKey: env("ANTHROPIC_API_KEY"),
    model: env("ANTHROPIC_MODEL", "claude-haiku-4-5"),
  },
  forceDemo: env("DEMO_MODE") === "true",
};

export const githubConfigured =
  !config.forceDemo && !!config.github.token && !!config.github.owner && config.github.projectNumber > 0;
