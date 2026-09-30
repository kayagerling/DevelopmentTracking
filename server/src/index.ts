import express from "express";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config, githubConfigured } from "./config.js";
import { getDashboard } from "./dashboard.js";

const app = express();

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/dashboard", async (req, res) => {
  try {
    res.json(await getDashboard(req.query.force === "1"));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// In productie serveert de server ook de gebouwde website.
const webDist = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "web", "dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (_req, res) => res.sendFile(join(webDist, "index.html")));
}

app.listen(config.port, () => {
  console.log(`DevelopmentTracker draait op http://localhost:${config.port}`);
  console.log(
    githubConfigured
      ? `Bron: GitHub project #${config.github.projectNumber} van ${config.github.owner}`
      : "Bron: demodata (vul .env in om GitHub te koppelen)",
  );
  console.log(config.anthropic.apiKey ? `Versimpelen: Claude (${config.anthropic.model})` : "Versimpelen: automatische samenvatting");
});
