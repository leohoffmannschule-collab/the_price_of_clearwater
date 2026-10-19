// Bereich „hof": Verwildern, das Haus, der Fernseher mit Sendern anderer Bereiche.
// Aufruf: node test/hof.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { KARTEN, punkt } from '../src/karten.js';
import { system } from '../src/system.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, karteBetreten } from '../src/spiel.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });

console.log('\nHof');
test('der Hof ist verwildert, der Platz vor dem Haus frei', () => {
  const s = neues();
  const w = L.welt(s, 'hof');
  const anzahl = Object.values(w.objekte).filter((o) => ['baum', 'stein', 'unkraut', 'ast'].includes(o.t)).length;
  assert.ok(anzahl > 60, `nur ${anzahl} Hindernisse`);
  const vor = punkt('hof', 'vorHaus');
  assert.ok(!w.objekte[L.k(vor.x, vor.y)], 'vor der Haustür');
});
test('der Herd im Haus kocht, der Fernseher zeigt Sender anderer Bereiche', () => {
  assert.ok(KARTEN.haus.deko.some((d) => d.typ === 'herd' && d.aktion === 'kochen'));
  const fragen = [];
  const s = neues(3);
  spielStarten(s, { frage: (text, optionen) => fragen.push({ text, optionen }), dialog() {} });
  system({ name: 'test-sender', fernsehen: () => [['Testsender', () => {}]] });
  const tv = KARTEN.haus.deko.find((d) => d.aktion === 'tv');
  karteBetreten('haus', tv.x, tv.y + 1, 'oben');
  const E = {
    richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
    aktion: { gedrueckt: true }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
  };
  update(0.05, E);
  assert.ok(fragen.at(-1)?.optionen.some(([t]) => t === 'Testsender'), 'Sender in der Auswahl');
  assert.ok(S.ort.def.id === 'haus');
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
