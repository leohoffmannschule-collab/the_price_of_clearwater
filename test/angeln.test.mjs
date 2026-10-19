// Bereich „angeln": Fischwahl nach Gewässer, Lenes Angel, Lenes Laden im Fischladen.
// Aufruf: node test/angeln.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { ITEMS, LAEDEN, NPCS } from '../src/daten.js';
import { fischWaehlen, fangGeben } from '../src/angeln.js';
import * as L from '../src/logik.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });

console.log('\nAngeln');
test('Fischwahl richtet sich nach Gewässer, Jahreszeit und Uhrzeit', () => {
  const s = neues(1);
  s.zeit.minute = 600;
  for (let i = 0; i < 40; i++) {
    const w = fischWaehlen(s, 'meer', () => (i + 0.5) / 40);
    if (w.fisch) {
      const d = w.fisch.fisch;
      assert.ok(d.orte.includes('meer') && d.jz.includes('fruehling'), w.fisch.id);
    } else assert.ok(ITEMS[w.muell], w.muell);
  }
});
test('ein Fang landet mit Qualität im Rucksack und gibt Erfahrung', () => {
  const s = neues(2);
  const erg = fangGeben(s, null, 'karpfen', true, () => 0.01);
  assert.ok(L.hat(s, 'karpfen'));
  assert.ok(erg.q >= 1);
  assert.ok(s.spieler.xp.angeln > 0);
  assert.equal(s.stats.gefangen, 1);
});
test('Lene schenkt die Angel ab dem zweiten Tag', () => {
  const s = neues(20);
  const ort = L.ortVon(s, 'strand');
  L.gespraech(s, 'lene', ort);
  assert.ok(!L.hat(s, 'angel'));
  s.npcs.lene.gesprochen = false;
  s.zeit.tag = 2;
  L.gespraech(s, 'lene', ort);
  assert.ok(L.hat(s, 'angel'));
});
test('Lenes Laden ist im Fischladen, dort steht sie tagsüber', () => {
  const o = L.ladenOrt('fischer');
  assert.equal(o.karte, 'fischladen');
  assert.ok(NPCS[LAEDEN.fischer.npc].plan.normal.some((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; }));
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
