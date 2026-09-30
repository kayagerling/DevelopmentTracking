import type { RawBranch, RawPrd } from "./github.js";

/** Voorbeelddata zodat het dashboard werkt voordat GitHub gekoppeld is. */
const people = {
  kaya: { login: "kayagerling", name: "Kaya Gerling", avatarUrl: "" },
  sam: { login: "sdevries", name: "Sam de Vries", avatarUrl: "" },
  noor: { login: "noorb", name: "Noor Bakker", avatarUrl: "" },
  lucas: { login: "ljansen", name: "Lucas Jansen", avatarUrl: "" },
};

type Seed = [number, string, string, string, (keyof typeof people)[], string];

const seeds: Seed[] = [
  [101, "Inloggen met tweestapsverificatie", "Beveiliging", "Done", ["sam"],
    "## Doel\nImplementeer TOTP-based 2FA via RFC 6238 met fallback recovery codes. Wijzigingen in de auth-middleware en het users-schema (migratie 0042).\n\n- [x] TOTP secret generatie\n- [x] QR-code enrolment\n- [x] Recovery codes"],
  [112, "Rolgebaseerde toegang voor beheerders", "Beveiliging", "In review", ["sam", "kaya"],
    "## Samenvatting\nRBAC-model met policies per resource; enforcement in de API-gateway via JWT-claims.\n\n- [x] Rollen-tabel\n- [x] Policy engine\n- [ ] Audit logging\n- [ ] Admin UI"],
  [118, "Wachtwoord-reset via e-mail", "Beveiliging", "Todo", [],
    "## Probleem\nGebruikers kunnen hun wachtwoord niet zelf resetten. Signed tokens met TTL van 30 min via de mail-queue."],
  [124, "Dashboard met maandcijfers", "Rapportage", "In progress", ["noor"],
    "## Doel\nMaterialized views voor maandelijkse aggregaties, geserveerd via een GraphQL resolver met caching in Redis.\n\n- [x] Views\n- [ ] Resolver\n- [ ] Grafieken"],
  [131, "Export naar Excel", "Rapportage", "Done", ["noor"],
    "## Doel\nStreaming XLSX-export van rapportages zonder geheugenpieken.\n\n- [x] Export endpoint\n- [x] Opmaak"],
  [137, "Automatische weekrapportage per e-mail", "Rapportage", "Backlog", ["lucas"],
    "## Achtergrond\nCron-job die elke maandag een PDF genereert en verstuurt aan stakeholders."],
  [144, "Foutenregister en leercurve correcties meetbaar maken", "Kwaliteit", "In progress", ["kaya"],
    "## Doel\nEvent-sourcing van correcties zodat we per model-versie de error rate en leercurve kunnen plotten.\n\n- [x] Event schema\n- [x] Ingest pipeline\n- [ ] Metrics\n- [ ] Dashboard"],
  [150, "Automatische tests bij elke wijziging", "Kwaliteit", "Ready", ["lucas", "kaya"],
    "## Doel\nCI-pipeline met unit-, integratie- en e2e-tests (Playwright) als required check op PR's."],
  [156, "Snellere laadtijd van de app", "Performance", "In review", ["lucas"],
    "## Probleem\nLCP van 4,2s op mobiel. Code splitting, image CDN en HTTP/2 push.\n\n- [x] Code splitting\n- [x] Image CDN\n- [x] Lazy loading\n- [ ] Meting in productie"],
  [161, "Offline werken op de tablet", "Performance", "Todo", ["noor"],
    "## Doel\nService worker met IndexedDB-sync en conflict resolution (last-write-wins)."],
];

const branchSeeds = [
  "SV-prd-112-rolgebaseerde-toegang",
  "NB-prd-124-dashboard-maandcijfers",
  "KG-prd-144-foutenregister",
  "KG-prd-144-metrics",
  "LJ-prd-156-snellere-laadtijd",
  "fix/login-timeout",
];

export function demoPrds(): { projectTitle: string; prds: RawPrd[]; branches: RawBranch[] } {
  const now = Date.now();
  return {
    branches: branchSeeds.map((name, i) => ({
      name,
      repository: "voorbeeld/repo",
      lastCommitAt: new Date(now - i * 36e5 * 5).toISOString(),
    })),
    projectTitle: "Voorbeeldproject (demo)",
    prds: seeds.map(([nr, title, theme, status, who, body], i) => ({
      id: `demo-${nr}`,
      prdNumber: `PRD-${nr}`,
      title,
      url: "https://github.com",
      repository: "voorbeeld/repo",
      status,
      theme,
      closed: status === "Done",
      body,
      updatedAt: new Date(now - i * 36e5 * 7).toISOString(),
      createdAt: new Date(now - (30 - i) * 864e5).toISOString(),
      closedAt: status === "Done" ? new Date(now - (20 - i * 2) * 864e5).toISOString() : null,
      assignees: who.map((k) => people[k]),
      linkedBranches: [],
    })),
  };
}
