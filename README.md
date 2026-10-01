# DevelopmentTracker

Eén overzicht van alle PRD's op het GitHub-scrumboard, begrijpelijk voor iedereen, ook zonder technische kennis.

- **Live**: haalt het scrumboard (GitHub Project) op via de GitHub API en ververst elke minuut.
- **Voortgang** in balken: totaal, **per thema** en **per persoon**. Kleuren: rood (< 20%), geel (20–49%), van geel naar groen (50–79%), groen (80–100%, met ✓ bij 100%).
- **Versimpelde beschrijving** per PRD in gewone taal (met Claude), de technische tekst is uitklapbaar.
- **Licht / donker / automatisch**, in Apple-stijl, werkt ook op mobiel.
- **Deelbare links**: filters, zoekterm, sortering en de geopende PRD staan in de URL (bv. `#/?status=busy&prd=PRD-144`). In een PRD staat een knop *Deel link*.
- **Wijzigingen sinds je laatste bezoek**: nieuwe, gewijzigde en afgeronde PRD's krijgen een label, met een filter om alleen die te tonen (bewaard in je browser).
- **Installeerbaar als app**: op iPhone via *Deel → Zet op beginscherm*, op Android/desktop via *Installeren* in de browser.

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

## Hosten op GitHub Pages

GitHub Pages kan geen server draaien. Daarom maakt een GitHub Action (`.github/workflows/pages.yml`) elke ~15 minuten een momentopname (`dashboard.json`) van het scrumboard en zet de site opnieuw online. Dat gebeurt ook bij elke push naar `main` en bij wijzigingen aan issues in deze repo.

**Let op:** een Pages-site is openbaar. De volledige technische PRD-tekst wordt standaard níet gepubliceerd (zet de variable `PUBLISH_TECHNICAL_DESCRIPTION` op `true` als je dat wel wilt). Titels, status, personen en de versimpelde uitleg zijn wel zichtbaar.

Eenmalig instellen in de repo op GitHub (**Settings**):

1. **Pages** → *Build and deployment* → *Source*: **GitHub Actions**.
2. **Secrets and variables → Actions → Secrets**:
   - `PROJECT_TOKEN`: een *classic* personal access token met `repo` en `read:project` ([aanmaken](https://github.com/settings/tokens/new?scopes=repo,read:project&description=DevelopmentTracker)).
   - `ANTHROPIC_API_KEY`: (optioneel) voor de uitleg in gewone taal.
3. **Secrets and variables → Actions → Variables** (zelfde waarden als in je `.env`, alleen andere namen omdat GitHub geen namen toestaat die met `GITHUB_` beginnen):

   | Variable | Komt overeen met in `.env` |
   |---|---|
   | `PROJECT_OWNER` | `GITHUB_OWNER` |
   | `PROJECT_OWNER_TYPE` | `GITHUB_OWNER_TYPE` |
   | `PROJECT_NUMBER` | `GITHUB_PROJECT_NUMBER` |
   | `STATUS_FIELD`, `THEME_FIELD`, `THEME_LABEL_PREFIX`, `STATUS_PROGRESS` | zelfde naam (alleen invullen als je ze in `.env` hebt aangepast) |

4. Push naar `main`, of start de workflow handmatig via **Actions → Dashboard naar GitHub Pages → Run workflow**.

De site staat daarna op `https://<owner>.github.io/<repo>/`. Kan de Action GitHub niet bereiken, dan faalt hij en blijft de vorige versie online staan (er wordt nooit demodata gepubliceerd).

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

**Branches**: alle branches van de repo('s) van de PRD's, behalve de hoofdbranch (`main`). Een branch hoort bij een PRD als hij op GitHub aan het issue gekoppeld is (blok *Development*), of anders als de naam het PRD-nummer bevat, bv. `MF-prd-160-dode-subsystemen-opruimen`. Branches zonder PRD-nummer staan als *Geen PRD* in het overzicht.

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
