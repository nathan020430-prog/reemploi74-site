#!/usr/bin/env node
// Sert le site généré (fichiers de la racine) en local pour le tester avec l'application :
//   node serve-local.mjs --port 8074 --app-url http://localhost:3074
// config.js est servi avec appUrl remplacé par --app-url (ou APP_URL), sans toucher au fichier :
// le dépôt reste en mode démonstration, seul ce serveur de test parle à l'application.
// Côté application, l'origine http://localhost:<port> doit figurer dans ORIGINES_AUTORISEES (.env).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (nom, defaut) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const PORT = Number(option("--port", process.env.PORT || "8074"));
const APP_URL = (option("--app-url", process.env.APP_URL || "") || "").replace(/\/+$/, "");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ico": "image/x-icon",
};

const serveur = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    let chemin = decodeURIComponent(url.pathname);
    if (chemin.endsWith("/")) chemin += "index.html";
    const fichier = path.normalize(path.join(RACINE, chemin));
    if (!fichier.startsWith(RACINE)) {
      res.writeHead(403).end();
      return;
    }
    if (chemin === "/config.js" && APP_URL) {
      const source = await readFile(fichier, "utf8");
      const corps = source.replace(/appUrl:\s*'[^']*'/, `appUrl: '${APP_URL}'`);
      res.writeHead(200, { "Content-Type": TYPES[".js"], "Cache-Control": "no-store" }).end(corps);
      return;
    }
    const infos = await stat(fichier).catch(() => null);
    if (!infos || !infos.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404");
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(fichier).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(await readFile(fichier));
  } catch (erreur) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end(String(erreur));
  }
});

serveur.listen(PORT, "127.0.0.1", () => {
  console.log(`Site servi sur http://localhost:${PORT}${APP_URL ? ` (application : ${APP_URL})` : " (mode démonstration)"}`);
});
