// Bereich „handwerk": Barren basteln, Einmachglas, Sprenger, Herd.
// Aufruf: node test/handwerk.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { REZEPTE, OBJEKT_TYPEN } from '../src/daten.js';
import { karte, raster, rahmen, fertigRaster } from '../src/karten.js';
import { DEKO_AKTIONEN } from '../src/spiel.js';
import { glasBenutzen } from '../src/bereiche/handwerk/inhalt.js';
import * as L from '../src/logik.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
karte({ id: 'testwerkstatt', name: 'Werkstatt', aussen: true, farmbar: true, grid: fertigRaster(rahmen(raster(10, 8, '.'), '#')) });

console.log('\nHandwerk');
test('Barren basteln verbraucht Erz und Kohle', () => {
  const s = neues(16);
  L.hinzufuegen(s, { id: 'kupfererz', n: 7 });
  L.hinzufuegen(s, { id: 'kohle', n: 1 });
  const r = REZEPTE.find((x) => x.id === 'kupferbarren');
  assert.ok(L.basteln(s, r).ok);
  assert.equal(L.anzahl(s, 'kupfererz'), 2);
  assert.equal(L.anzahl(s, 'kupferbarren'), 1);
  assert.equal(L.basteln(s, r), null);
});
test('Einmachglas macht über Nacht Marmelade', () => {
  const s = neues(17);
  const ort = L.ortVon(s, 'testwerkstatt');
  ort.welt.objekte[L.k(4, 4)] = { t: 'einmachglas', inhalt: null, fertig: false };
  L.hinzufuegen(s, { id: 'blaubeere', n: 1 });
  assert.ok(glasBenutzen(s, ort, 4, 4, s.spieler.inv.findIndex((x) => x?.id === 'blaubeere')).ok);
  L.tagBeenden(s, { r: () => 0.99 });
  assert.ok(glasBenutzen(s, ort, 4, 4, null).ok);
  const glas = s.spieler.inv.find((x) => x?.id === 'marmelade');
  assert.equal(glas.von, 'blaubeere');
  assert.equal(L.preisVon(glas), 150);
});
test('Sprenger gießen ihre Nachbarn', () => {
  const s = neues(9);
  const ort = L.ortVon(s, 'testwerkstatt');
  for (const [x, y] of [[3, 3], [4, 3], [5, 3], [4, 2]]) ort.welt.felder[L.k(x, y)] = { nass: false };
  ort.welt.objekte[L.k(4, 4)] = { t: 'sprenger' };
  s.zeit.morgen = 'sonne';
  L.tagBeenden(s, { r: () => 0.99 });
  assert.equal(ort.welt.felder[L.k(4, 3)].nass, true);
  assert.equal(ort.welt.felder[L.k(3, 3)].nass, false);
});
test('der Herd hat die Aktion „kochen", Truhen sind Behälter', () => {
  assert.ok(DEKO_AKTIONEN.kochen);
  assert.ok(OBJEKT_TYPEN.truhe.nichtLeer({ inv: [{ id: 'holz', n: 1 }] }));
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
