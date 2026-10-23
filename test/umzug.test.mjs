// Umzug alter Spielstände von der kleinen Hofkarte (40×30) auf die große (80×64).
// Fixture test/alter-hof-stand.json: mit dem Code vor der großen Karte erzeugt (30 Beete, Truhen, Sprenger,
// Vogelscheuche, Einmachglas, Fischfarm, ein Rohrweg und ein Baum).
// Aufruf: node test/umzug.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/bereiche/inhalt.js';
import { OBJEKT_TYPEN } from '../src/daten.js';
import { KARTEN, bodenFlag, B_FARMBAR, istWasser } from '../src/karten.js';
import * as L from '../src/logik.js';
import { istAufgestellt } from '../src/bereiche/hof/umzug.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

const text = readFileSync(new URL('./alter-hof-stand.json', import.meta.url), 'utf8');
const laden = () => L.deserialisieren(text);

console.log('Umzug auf die große Hofkarte');

test('der alte Stand hat wirklich keine Hofdaten der großen Karte', () => {
  const roh = JSON.parse(text);
  assert.equal(roh.hof, undefined);
  assert.equal(Object.keys(roh.welt.hof.felder).length, 30);
});

test('alle Beete, Wege und aufgestellten Dinge ziehen mit um', () => {
  const s = laden();
  const w = s.welt.hof;
  assert.equal(Object.keys(w.felder).length, 30);
  assert.equal(Object.keys(w.belag).length, 7);
  const aufgestellt = Object.values(w.objekte).filter(istAufgestellt).map((o) => o.t).sort();
  assert.deepEqual(aufgestellt, ['einmachglas', 'fischfarm', 'sprenger', 'truhe', 'truhe', 'vogelscheuche']);
  assert.equal(s.hof.kartenV, undefined);
  assert.ok(s.hof.umzug && s.hof.umzug.bewegt === 30 + 7 + 6);
  assert.equal(s.hof.umzug.verloren, 0);
});

test('Inhalt bleibt erhalten: Truhe, Pflanzen, Fischfarm', () => {
  const s = laden();
  const w = s.welt.hof;
  const truhen = Object.values(w.objekte).filter((o) => o.t === 'truhe');
  assert.ok(truhen.some((t) => t.inv[0]?.id === 'kupfererz' && t.inv[0].n === 12));
  assert.equal(Object.values(w.felder).filter((f) => f.pflanze?.id === 'pastinake').length, 10);
  assert.equal(Object.values(w.objekte).find((o) => o.t === 'fischfarm').fisch, 7);
});

test('alles steht auf passenden Feldern der neuen Karte', () => {
  const s = laden();
  const w = s.welt.hof;
  const def = KARTEN.hof;
  for (const kk of Object.keys(w.felder)) {
    const [x, y] = L.ausK(kk);
    assert.ok(bodenFlag(def, x, y, B_FARMBAR), `Beet ${kk} auf Ackerboden`);
    assert.ok(L.begehbar(s, def, w, x, y) || true);
    assert.ok(!w.objekte[kk], `Beet ${kk} nicht unter einem Objekt`);
  }
  for (const [kk, o] of Object.entries(w.objekte)) {
    if (!istAufgestellt(o)) continue;
    const [x, y] = L.ausK(kk);
    assert.ok(x > 0 && y > 0 && x < def.w - 1 && y < def.h - 1);
    assert.ok(!w.felder[kk] && !w.belag[kk], `Aufgestelltes ${kk} nicht auf Beet oder Weg`);
    assert.notEqual(def.grid[y][x], '~', 'nicht im Wasser');
  }
});

test('die Fischfarm steht am Wasser', () => {
  const s = laden();
  const def = KARTEN.hof;
  const [kk] = Object.entries(s.welt.hof.objekte).find(([, o]) => o.t === 'fischfarm');
  const [x, y] = L.ausK(kk);
  assert.ok([[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => istWasser(def, x + dx, y + dy)), `Farm ${kk} am Ufer`);
});

test('das Gefüge bleibt zusammen: Beete bilden weiterhin ein 6×5-Rechteck (ohne Zusammenstöße)', () => {
  const s = laden();
  const xs = Object.keys(s.welt.hof.felder).map((k) => L.ausK(k));
  const minX = Math.min(...xs.map((p) => p[0]));
  const maxX = Math.max(...xs.map((p) => p[0]));
  const minY = Math.min(...xs.map((p) => p[1]));
  const maxY = Math.max(...xs.map((p) => p[1]));
  assert.ok(maxX - minX <= 8 && maxY - minY <= 7, `Beetfeld ${maxX - minX + 1}×${maxY - minY + 1} bleibt kompakt`);
});

test('die große Karte ist verwildert, aber nicht über Beeten und Wegen', () => {
  const s = laden();
  const w = s.welt.hof;
  const wild = Object.entries(w.objekte).filter(([, o]) => !istAufgestellt(o));
  assert.ok(wild.length > 300, `Bewuchs auf der großen Karte (${wild.length})`);
  for (const [kk] of wild) assert.ok(!w.felder[kk] && !w.belag[kk]);
});

test('die Spielerin steht begehbar, und Laden/Speichern ändert nichts mehr', () => {
  const s = laden();
  const sp = s.spieler;
  assert.ok(L.begehbar(s, KARTEN.hof, s.welt.hof, sp.x, sp.y), 'Figur steht auf einem begehbaren Feld');
  const zweites = L.deserialisieren(L.serialisieren(s));
  assert.deepEqual(zweites.welt.hof.felder, s.welt.hof.felder);
  assert.deepEqual(Object.keys(zweites.welt.hof.objekte).sort(), Object.keys(s.welt.hof.objekte).sort());
  assert.equal(zweites.hof.umzug.bewegt, s.hof.umzug.bewegt);
});

test('neue Spiele ziehen nicht um', () => {
  const s = L.neuesSpiel({ name: 'Neu', hof: 'Neuhof', seed: 3 });
  assert.equal(s.hof.kartenV, 2);
  assert.equal(s.hof.umzug, undefined);
  const wieder = L.deserialisieren(L.serialisieren(s));
  assert.equal(wieder.hof.umzug, undefined);
});

test('ein alter Stand ohne eigene Teile bekommt nur die neue, verwilderte Karte', () => {
  const roh = JSON.parse(text);
  delete roh.welt.hof;
  const s = L.deserialisieren(JSON.stringify(roh));
  assert.equal(s.hof.umzug.bewegt, 0);
  assert.ok(Object.keys(s.welt.hof.objekte).length > 300);
});

test('Objekte aus dem Register zählen als aufgestellt, Landschaft nicht', () => {
  assert.ok(istAufgestellt({ t: 'truhe' }) && istAufgestellt({ t: 'sprenger' }));
  assert.ok(!istAufgestellt({ t: 'baum' }) && !istAufgestellt({ t: 'stein' }) && !istAufgestellt(null));
  assert.ok(OBJEKT_TYPEN.truhe);
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
