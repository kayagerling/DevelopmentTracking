# DevelopmentTracker

Eén overzicht van alle PRD's op het GitHub-scrumboard, begrijpelijk voor iedereen, ook zonder technische kennis.

- **Live**: haalt het scrumboard (GitHub Project) op via de GitHub API en ververst elke minuut.
- **Voortgang** in balken: totaal, **per thema** en **per persoon**. Kleuren: rood (< 25%), oranje (25–99%), groen (100%).
- **Versimpelde beschrijving** per PRD in gewone taal (met Claude), de technische tekst is uitklapbaar.
- **Licht / donker / automatisch**, in Apple-stijl, werkt ook op mobiel.

Zonder instellingen draait hij met **voorbeelddata**, zodat je meteen kunt kijken.

## Snel starten (lokaal)

```bash
npm install
cp .env.example .env     # en vul in (zie hieronder)
npm run dev
```

Open http://localhost:5173 (tijdens ontwikkelen) of na `npm run build && npm start` http://localhost:3000.

## Met Docker

```bash
cp .env.example .env     # GITHUB_TOKEN invullen, bv. met de uitvoer van: gh auth token
docker compose up -d --build
```

Open http://localhost:3000.

## GitHub koppelen

1. Zorg dat `gh` rechten heeft om projecten te lezen: `gh auth refresh -s read:project`
2. Zoek het projectnummer op in de URL van het scrumboard: `github.com/users/<owner>/projects/<nummer>` (of `/orgs/<org>/projects/<nummer>`).
3. Vul in `.env` in: `GITHUB_OWNER`, `GITHUB_OWNER_TYPE` (`user` of `organization`) en `GITHUB_PROJECT_NUMBER`.
4. Lokaal hoeft `GITHUB_TOKEN` niet: de server gebruikt dan `gh auth token`. In Docker wel.

**Wat telt als PRD?** Issues op het board met een titel als `PRD-144 — Omschrijving` (instelbaar met `PRD_TITLE_PATTERN`).

**Thema**: uit het projectveld `Thema`, of anders uit een label als `thema: Beveiliging`.

**Voortgang per PRD**:
- Gesloten issue of kolom *Done* = 100%.
- Anders het percentage van de kolom (`STATUS_PROGRESS` in `.env`, bv. *In progress* = 50%).
- Staan er taken (`- [x]`) in de PRD, dan telt het hoogste van de twee (max. 95% zolang hij niet op *Done* staat).

Thema- en persoonsbalken zijn het gemiddelde van hun PRD's. Een PRD met twee personen telt bij allebei mee.

## Beschrijvingen versimpelen

Met `ANTHROPIC_API_KEY` in `.env` schrijft Claude voor elke PRD 2–3 zinnen in eenvoudig Nederlands. Dat gebeurt één keer per versie van de tekst. Het resultaat wordt bewaard in `server/.cache/simplified.json`, dus het kost alleen iets als een PRD verandert. Zonder key toont hij een automatische samenvatting (de eerste zinnen zonder code), maar die blijft vaak technisch.

## Structuur

```
server/   Node + TypeScript API (GitHub, voortgang, versimpelen)
  src/github.ts     scrumboard ophalen via GraphQL
  src/progress.ts   voortgang per PRD berekenen
  src/simplify.ts   uitleg in gewone taal + cache
  src/dashboard.ts  groeperen per thema/persoon, caching
  src/demo.ts       voorbeelddata
web/      React + TypeScript + Vite (de website)
  src/App.tsx               overzichtspagina
  src/components/           voortgangsbalk, kaarten, detailvenster, thema-schakelaar
  src/styles.css            design (licht/donker)
```
