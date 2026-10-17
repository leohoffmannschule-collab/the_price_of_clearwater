// Kleiner Webserver zum Spielen und Entwickeln.
// Node bringt alles mit, was er dafür braucht: kein npm install, kein Python.
//
//   node tools/server.mjs          → http://localhost:8080
//   node tools/server.mjs 9000     → anderer Port
//
// Gebraucht wird er, weil das Spiel aus ES-Modulen besteht. Die lädt kein
// Browser über file:// — er verweigert das aus Sicherheitsgründen.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  let pfad;
  try {
    pfad = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Ungültige Adresse');
    return;
  }
  if (pfad.endsWith('/')) pfad += 'index.html';

  // Nur Dateien unterhalb des Projektordners ausliefern — ein „../../"
  // in der Adresse darf nicht aus dem Ordner herausführen.
  const datei = resolve(join(WURZEL, pfad));
  if (datei !== WURZEL && !datei.startsWith(WURZEL + sep)) {
    res.writeHead(403).end('Außerhalb des Projektordners');
    return;
  }

  try {
    const info = await stat(datei);
    if (info.isDirectory()) {
      res.writeHead(302, { Location: `${pfad.replace(/\/$/, '')}/index.html` }).end();
      return;
    }
    const inhalt = await readFile(datei);
    res.writeHead(200, {
      'Content-Type': TYPEN[extname(datei).toLowerCase()] || 'application/octet-stream',
      'Content-Length': inhalt.length,
      'Cache-Control': 'no-cache',
    });
    res.end(inhalt);
  } catch (e) {
    const code = e.code === 'ENOENT' || e.code === 'ENOTDIR' ? 404 : 500;
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(code === 404 ? `Nicht gefunden: ${pfad}` : 'Fehler beim Lesen');
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} ist belegt. Anderen Port wählen: node tools/server.mjs ${PORT + 1}`);
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, () => {
  console.log(`\n  Klarwasser-Hof läuft.\n`);
  console.log(`  Im Browser öffnen:  http://localhost:${PORT}\n`);
  console.log(`  Beenden mit Strg+C\n`);
});
