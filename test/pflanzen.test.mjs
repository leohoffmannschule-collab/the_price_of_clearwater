// Bereich „pflanzen": Bäume und Baumarten, Saatgut und Dünger bei Ottilie, Sorten der Ernte.
// Aufruf: node test/pflanzen.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { ITEMS, BAUM_ARTEN } from '../src/daten.js';
import { karte, raster, rahmen, fertigRaster } from '../src/karten.js';
import * as L from '../src/logik.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
karte({ id: 'testwald', name: 'Testwald', aussen: true, grid: fertigRaster(rahmen(raster(10, 8, '.'), '#')) });

console.log('\nPflanzen');
test('Bäume fallen nach genug Axthieben, geben Holz und lassen einen Stumpf', () => {
  const s = neues(10);
  const ort = L.ortVon(s, 'testwald');
  ort.welt.objekte[L.k(4, 4)] = { t: 'baum', hp: 8, art: 'eiche' };
  let erg;
  for (let i = 0; i < 8; i++) erg = L.axtHieb(s, ort, 4, 4, () => 0.5);
  assert.ok(erg.gefallen);
  assert.ok(L.anzahl(s, 'holz') >= BAUM_ARTEN.eiche.holz[0]);
  assert.equal(ort.welt.objekte[L.k(4, 4)].t, 'stumpf');
  assert.ok(L.hat(s, 'harz'), 'Baumharz');
});
test('Saatgut der Jahreszeit und Dünger liegen bei Ottilie', () => {
  const s = neues(15);
  const ware = L.ladenWare(s, 'laden');
  assert.ok(ware.some((w) => w.id === 'blumenkohl_saat'));
  assert.ok(!ware.some((w) => w.id === 'melone_saat'));
  assert.ok(ware.some((w) => w.id === 'duenger'));
});
test('jede Ernte trägt eine Sorte', () => {
  for (const it of Object.values(ITEMS)) if (it.kat === 'ernte') assert.ok(['gemuese', 'obst', 'blume', 'getreide', 'kraut', 'pilz'].includes(it.sorte), it.id);
  assert.equal(ITEMS.blaubeere.sorte, 'obst');
  assert.equal(ITEMS.pastinake.sorte, 'gemuese');
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
