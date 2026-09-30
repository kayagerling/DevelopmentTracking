/**
 * Maakt een vaste momentopname van het dashboard (dashboard.json) voor GitHub Pages.
 * Wordt door de GitHub Action gedraaid:  node server/dist/export.js web/dist/dashboard.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config } from "./config.js";
import { getDashboard } from "./dashboard.js";
import { flushSimplify } from "./simplify.js";

const out = resolve(process.argv[2] ?? "web/dist/dashboard.json");
const publishTechnical = (process.env.PUBLISH_TECHNICAL_DESCRIPTION ?? "false").trim() === "true";

const first = await getDashboard(true);
if (first.source !== "github" && process.env.ALLOW_DEMO !== "true") {
  console.error(
    `Geen verbinding met GitHub${first.error ? `: ${first.error}` : ""}.\n` +
      "Controleer de secret PROJECT_TOKEN en de variables PROJECT_OWNER / PROJECT_NUMBER.",
  );
  process.exit(1);
}
if (first.error) {
  console.error(first.error);
  process.exit(1);
}

// AI-uitleg afwachten zodat de site meteen de versimpelde teksten toont.
if (config.anthropic.apiKey) {
  console.log("Wachten op versimpelde beschrijvingen…");
  await flushSimplify();
}
const dashboard = await getDashboard(true);

if (!publishTechnical) {
  // De site is openbaar: de volledige technische PRD-tekst niet meepubliceren.
  for (const p of dashboard.prds) p.description = "";
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(dashboard));
const ai = dashboard.prds.filter((p) => p.simpleSource === "ai").length;
console.log(`dashboard.json geschreven: ${dashboard.prds.length} PRD's (${ai} met AI-uitleg) -> ${out}`);
