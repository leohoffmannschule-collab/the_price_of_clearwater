// Bereich „berg": Mineneingang, Zimmerei und Gilde mit Türen hinein und hinaus.
// Aufruf: node test/berg.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { KARTEN, boden, zielVon, warpZiel } from '../src/karten.js';
import * as L from '../src/logik.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });

console.log('\nBerg');
test('neben der Höhlentür bleibt die Klippe ganz (kein Weg scheint durch)', () => {
  const tor = KARTEN.berg.gebaeude.find((g) => g.ziel?.karte === 'mine0');
  for (let x = tor.x; x < tor.x + tor.w; x++) {
    for (let y = tor.y; y < tor.y + tor.h; y++) {
      if (x === tor.tuer.x && y === tor.tuer.y) continue;
      assert.notEqual(boden(KARTEN.berg, x, y), ':', `Weg unter der Höhle bei (${x},${y})`);
    }
  }
});
test('Zimmerei und Gilde: Tür hinein, Ausgang zurück vor die Tür', () => {
  const s = neues();
  for (const id of ['zimmerei', 'gilde']) {
    const tuer = KARTEN.berg.gebaeude.find((g) => g.ziel?.karte === id);
    assert.ok(tuer, `Tür zur ${id}`);
    const rein = zielVon(tuer.ziel);
    assert.ok(L.begehbar(s, KARTEN[id], L.welt(s, id), rein.x, rein.y));
    const raus = warpZiel(KARTEN[id].warps.find((w) => w.karte === 'berg'));
    assert.deepEqual([raus.x, raus.y], [tuer.tuer.x, tuer.tuer.y + 1]);
  }
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
