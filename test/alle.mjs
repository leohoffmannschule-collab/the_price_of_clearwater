// Führt jede test/*.test.mjs nacheinander in einem eigenen Node-Prozess aus.
// Bereiche dürfen eigene test/<bereich>.test.mjs anlegen; sie laufen hier automatisch mit.
// Aufruf: npm test  (oder node test/alle.mjs [filter])
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ordner = fileURLToPath(new URL('.', import.meta.url));
const filter = process.argv[2] || '';
const dateien = readdirSync(ordner).filter((f) => f.endsWith('.test.mjs') && f.includes(filter)).sort();

const fehler = [];
for (const f of dateien) {
  console.log(`\n━━ ${f}`);
  const r = spawnSync(process.execPath, [`${ordner}${f}`], { stdio: 'inherit' });
  if (r.status !== 0) fehler.push(f);
}
console.log(fehler.length ? `\n✗ Fehlgeschlagen: ${fehler.join(', ')}\n` : `\n✓ Alle ${dateien.length} Testdateien grün.\n`);
process.exit(fehler.length ? 1 : 0);
