import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

/**
 * Maakt van een technische PRD-beschrijving een korte uitleg in gewone taal.
 * - Met ANTHROPIC_API_KEY: Claude schrijft een uitleg (1x per versie van de tekst, daarna uit cache).
 * - Zonder key: een automatische samenvatting (eerste zinnen, zonder code en opmaak).
 */

const CACHE_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", ".cache", "simplified.json");
type CacheEntry = { hash: string; text: string };
let cache: Record<string, CacheEntry> = {};
if (existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {
    cache = {};
  }
}

function saveCache() {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

const hashOf = (s: string) => createHash("sha1").update(s).digest("hex");

/** Automatische samenvatting zonder AI. */
export function fallbackSummary(title: string, body: string): string {
  let text = body
    .replace(/```[\s\S]*?```/g, " ") // codeblokken
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // afbeeldingen
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"); // links -> tekst

  // Voorkeur voor een sectie die het doel uitlegt.
  const section = text.match(
    /^#{1,4}\s*(samenvatting|doel|probleem|achtergrond|summary|goal|problem|overview|context)[^\n]*\n([\s\S]*?)(?=^#{1,4}\s|$(?![\s\S]))/im,
  );
  if (section?.[2]?.trim()) text = section[2];

  const plain = text
    .split("\n")
    .filter((l) => !/^\s*(#|\||[-*]\s+\[|---)/.test(l))
    .map((l) => l.replace(/^\s*[-*>]\s+/, "").replace(/[*_~]/g, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return `Dit onderdeel gaat over: ${title}.`;
  const sentences = plain.match(/[^.!?]+[.!?]+/g) ?? [plain];
  let out = sentences.slice(0, 2).map((x) => x.trim()).join(" ");
  if (out.length > 280) out = out.slice(0, 277).trimEnd() + "…";
  return out;
}

async function askClaude(title: string, body: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.anthropic.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 300,
      system:
        "Je legt software-plannen (PRD's) uit aan iemand zonder technische achtergrond. " +
        "Schrijf in eenvoudig, vriendelijk Nederlands. Maximaal 3 korte zinnen: wat wordt er gemaakt, " +
        "en wat heeft de gebruiker of het bedrijf eraan. Geen jargon, geen afkortingen, geen opsommingen, " +
        "geen code, geen namen van technieken. Geef alleen de uitleg terug.",
      messages: [
        {
          role: "user",
          content: `Titel: ${title}\n\nBeschrijving:\n${body.slice(0, 12000)}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  return json.content.map((c) => c.text ?? "").join("").trim();
}

const pending = new Set<string>();
let queue: Promise<void> = Promise.resolve();

/**
 * Geeft direct een uitleg terug (uit cache of automatische samenvatting) en
 * vraagt op de achtergrond een AI-versie aan als die er nog niet is.
 * Bij de volgende verversing staat de AI-uitleg klaar.
 */
export function simplify(id: string, title: string, body: string): { text: string; source: "ai" | "samenvatting" } {
  const hash = hashOf(title + "\n" + body);
  const cached = cache[id];
  if (cached && cached.hash === hash) return { text: cached.text, source: "ai" };

  if (config.anthropic.apiKey && !pending.has(id)) {
    pending.add(id);
    // Eén voor één afhandelen om rate limits te vermijden.
    queue = queue.then(async () => {
      try {
        const text = await askClaude(title, body);
        if (text) {
          cache[id] = { hash, text };
          saveCache();
        }
      } catch (err) {
        console.warn(`[simplify] ${title}: ${(err as Error).message}`);
      } finally {
        pending.delete(id);
      }
    });
  }
  // Tekst gewijzigd? Toon de vorige AI-uitleg tot de nieuwe klaar is.
  if (cached) return { text: cached.text, source: "ai" };
  return { text: fallbackSummary(title, body), source: "samenvatting" };
}
