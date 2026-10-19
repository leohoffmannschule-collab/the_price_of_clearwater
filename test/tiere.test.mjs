// Bereich „tiere": Hühnerstall, Küken, Eier, Hühner im Auslauf, Greta und Wilma.
// Aufruf: node test/tiere.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { T, LAEDEN, NPCS } from '../src/daten.js';
import { punkt } from '../src/karten.js';
import * as L from '../src/logik.js';
import { zufall } from '../src/zufall.js';
import { S, spielStarten, update, karteBetreten } from '../src/spiel.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });

gruppe('Hühnerstall', () => {
  test('Stall über Nacht gebaut: steht am nächsten Morgen und blockiert', () => {
    const s = neues(26);
    s.spieler.gold = 10000;
    L.hinzufuegen(s, { id: 'holz', n: 150 });
    L.hinzufuegen(s, { id: 'stein', n: 50 });
    const stall = L.ladenWare(s, 'schmiede').find((w) => w.spezial === 'stall');
    assert.ok(L.kaufen(s, stall).ok);
    assert.ok(!L.ladenWare(s, 'schmiede').some((w) => w.spezial === 'stall'), 'Stall doppelt kaufbar');
    L.kartenStand(s, L.ortVon(s, 'hof').def);
    L.tagBeenden(s, { r: zufall(5) });
    assert.ok(s.stall.gebaut);
    // ohne zusätzliches kartenGeaendert(): der Tageswechsel meldet die Änderung selbst
    const g = L.gebaeudeListe(s, L.ortVon(s, 'hof').def).find((x) => x.typ === 'stall');
    assert.ok(g, 'Stall steht am Morgen nach dem Bau');
    assert.ok(!L.begehbar(s, L.ortVon(s, 'hof').def, L.welt(s, 'hof'), g.x, g.y), 'Stallfeld blockiert');
  });
  test('Küken erst mit Stall, dann jeden Morgen Eier', () => {
    const s = neues(27);
    assert.ok(!L.ladenWare(s, 'laden').some((w) => w.spezial === 'kueken'));
    s.stall.gebaut = true;
    s.spieler.gold = 10000;
    const kueken = L.ladenWare(s, 'laden').find((w) => w.spezial === 'kueken');
    assert.ok(L.kaufen(s, kueken).ok);
    L.tagBeenden(s, { r: () => 0.5 });
    const eier = () => Object.values(L.welt(s, 'hof').objekte).filter((o) => o.t === 'sammel' && (o.id === 'ei' || o.id === 'grossesei')).length;
    assert.equal(eier(), 0, 'Küken legt in der ersten Nacht schon');
    L.tagBeenden(s, { r: () => 0.5 });
    assert.equal(eier(), 1);
  });
  test('der Stallzustand wird beim Laden ergänzt', () => {
    const t = JSON.parse(L.serialisieren(neues(28)));
    delete t.stall;
    assert.equal(L.deserialisieren(JSON.stringify(t)).stall.gebaut, false);
  });
});

gruppe('Laufzeit', () => {
  const E = {
    richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
    aktion: { gedrueckt: false }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
  };
  test('Hühner im Auslauf lassen sich streicheln', () => {
    const s = neues(29);
    s.zeit.minute = 600;
    spielStarten(s, {});
    S.s.stall.gebaut = true;
    S.s.stall.huehner = [{ name: 'Erna', freundschaft: 0, gestreichelt: false, neu: false }];
    S.s.zeit.wetter = 'sonne';
    L.kartenGeaendert();
    const vor = punkt('hof', 'vorHaus');
    karteBetreten('hof', vor.x, vor.y, 'unten');
    assert.equal(S.huehner.length, 1);
    const h = S.huehner[0];
    h.t = 99;
    karteBetreten('hof', Math.floor(h.x / T), Math.floor((h.y - 3) / T) - 1, 'unten');
    S.huehner[0] = h;
    update(0.05, E);
    assert.equal(S.hinweis, 'Huhn streicheln');
    E.aktion.gedrueckt = true;
    update(0.05, E);
    assert.ok(S.s.stall.huehner[0].gestreichelt);
  });
});

gruppe('Greta und Wilma', () => {
  test('Zimmerei und Ranch haben eine Person an der Theke', () => {
    for (const id of ['zimmerei', 'ranch']) {
      const l = LAEDEN[id];
      assert.ok(NPCS[l.npc], id);
      const o = L.ladenOrt(id);
      assert.ok(NPCS[l.npc].plan.normal.some((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; }), id);
    }
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
