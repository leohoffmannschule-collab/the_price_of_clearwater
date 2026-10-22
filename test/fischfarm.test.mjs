// Fischfarm (Bereich handwerk): 3 Holz, Platzregel am Ufer, jede Nacht +200 Karpfen je Farm auf
// jeder Karte, Einsammeln (voll, teilweise, leer), nur normale Karpfen, Aufheben nur leer,
// Speichern und Laden.
// Aufruf: node test/fischfarm.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { ITEMS, REZEPTE, OBJEKT_TYPEN, STAPEL_MAX } from '../src/daten.js';
import { istWasser } from '../src/karten.js';
import * as L from '../src/logik.js';
import { FISCHFARM_PRO_TAG, FISCHFARM_FISCH, farmEinsammeln, vorratVon } from '../src/bereiche/handwerk/fischfarm.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
const neues = (seed = 11) => {
  const s = L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
  s.spieler.inv = Array(24).fill(null);
  return s;
};
const nacht = (s) => L.tagBeenden(s, { r: () => 0.99 });
const KREUZ = [[0, -1], [-1, 0], [1, 0], [0, 1]];
const amUfer = (ort, x, y) => KREUZ.some(([dx, dy]) => istWasser(ort.def, x + dx, y + dy));

/** Erstes freies Landfeld einer Karte mit (ufer = true) oder ohne Wasser in der 4er-Nachbarschaft. */
function feld(s, ort, ufer, ab = 0) {
  let n = 0;
  for (let y = 0; y < ort.def.h; y++) {
    for (let x = 0; x < ort.def.w; x++) {
      if (L.feldFrei(s, ort, x, y) && amUfer(ort, x, y) === ufer && n++ >= ab) return { x, y };
    }
  }
  return null;
}
/** Farm in den Rucksack legen und aufstellen. */
function aufstellen(s, ort, x, y) {
  const idx = s.spieler.inv.findIndex((i) => i?.id === 'fischfarm');
  if (idx < 0) L.hinzufuegen(s, { id: 'fischfarm', n: 1 });
  return L.aufstellen(s, ort, x, y, s.spieler.inv.findIndex((i) => i?.id === 'fischfarm'));
}
const farmAn = (ort, x, y) => ort.welt.objekte[L.k(x, y)];

console.log('\nFischfarm: Gegenstand und Rezept');
test('Item „Fischfarm" ist aufstellbar, Kategorie Aufstellbar, Konstanten stehen an einer Stelle', () => {
  assert.equal(ITEMS.fischfarm.name, 'Fischfarm');
  assert.equal(ITEMS.fischfarm.kat, 'platz');
  assert.ok(ITEMS.fischfarm.aufstellbar);
  assert.ok(OBJEKT_TYPEN.fischfarm);
  assert.equal(FISCHFARM_PRO_TAG, 200);
  assert.equal(FISCHFARM_FISCH, 'karpfen');
});
test('Rezept: genau 3 Holz, ohne Fähigkeitsstufe, von Anfang an sichtbar und frei', () => {
  const r = REZEPTE.find((x) => x.id === 'fischfarm');
  assert.deepEqual(r.zutaten, { holz: 3 });
  assert.equal(r.art, 'basteln');
  assert.ok(!r.stufe && !r.lernen);
  const s = neues();
  assert.ok(L.rezepteVon('basteln').some((x) => x.id === 'fischfarm'));
  assert.ok(L.rezeptFrei(s, r));
});
test('Basteln zieht genau 3 Holz ab und gibt eine Fischfarm', () => {
  const s = neues();
  const r = REZEPTE.find((x) => x.id === 'fischfarm');
  L.hinzufuegen(s, { id: 'holz', n: 2 });
  assert.equal(L.basteln(s, r), null, 'mit 2 Holz geht es nicht');
  L.hinzufuegen(s, { id: 'holz', n: 5 });
  assert.ok(L.basteln(s, r).ok);
  assert.equal(L.anzahl(s, 'holz'), 4);
  assert.equal(L.anzahl(s, 'fischfarm'), 1);
});

console.log('\nFischfarm: Aufstellen nur am Ufer');
test('am Ufer des Hofteichs geht es, auf der Wiese und im Wasser nicht', () => {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  const wiese = feld(s, ort, false);
  const ufer = feld(s, ort, true);
  assert.ok(wiese && ufer);
  const nein = aufstellen(s, ort, wiese.x, wiese.y);
  assert.equal(nein.grund, 'Die Fischfarm muss direkt am Wasser stehen.');
  assert.equal(L.anzahl(s, 'fischfarm'), 1, 'die Farm bleibt im Rucksack');
  assert.ok(!farmAn(ort, wiese.x, wiese.y));
  const wasser = [...Array(ort.def.h * ort.def.w).keys()].map((i) => ({ x: i % ort.def.w, y: Math.floor(i / ort.def.w) })).find((p) => istWasser(ort.def, p.x, p.y));
  assert.ok(aufstellen(s, ort, wasser.x, wasser.y).grund, 'nicht ins Wasser');
  assert.ok(aufstellen(s, ort, ufer.x, ufer.y).ok);
  assert.equal(farmAn(ort, ufer.x, ufer.y).t, 'fischfarm');
  assert.equal(farmAn(ort, ufer.x, ufer.y).fisch, 0);
  assert.equal(L.anzahl(s, 'fischfarm'), 0);
});
test('nicht auf einem Beet am Ufer und nicht auf einem besetzten Feld', () => {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  const p = feld(s, ort, true);
  ort.welt.felder[L.k(p.x, p.y)] = { nass: false };
  assert.equal(aufstellen(s, ort, p.x, p.y).grund, 'Hier ist kein Platz.');
  delete ort.welt.felder[L.k(p.x, p.y)];
  ort.welt.objekte[L.k(p.x, p.y)] = { t: 'truhe', inv: [] };
  assert.equal(aufstellen(s, ort, p.x, p.y).grund, 'Hier ist kein Platz.');
});
test('auf jeder Karte mit Wasser: Strand, Dorf-Fluss, Wald, Berg', () => {
  for (const id of ['strand', 'dorf', 'wald', 'berg']) {
    const s = neues();
    const ort = L.ortVon(s, id);
    const ufer = feld(s, ort, true);
    const wiese = feld(s, ort, false);
    assert.ok(ufer, `${id}: Ufer da`);
    assert.ok(aufstellen(s, ort, ufer.x, ufer.y).ok, `${id}: am Ufer`);
    assert.equal(aufstellen(s, ort, wiese.x, wiese.y).grund, 'Die Fischfarm muss direkt am Wasser stehen.', `${id}: nicht auf der Wiese`);
  }
});
test('Kartenrand: ein Feld am Rand ohne Wasser daneben wirft keinen Fehler', () => {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  const r = OBJEKT_TYPEN.fischfarm.platz({ s, ort, x: 0, y: 0 });
  assert.equal(typeof r, 'string');
});
test('mehrere Farmen am selben Ufer sind erlaubt', () => {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  L.hinzufuegen(s, { id: 'fischfarm', n: 3 });
  for (let i = 0; i < 3; i++) {
    const p = feld(s, ort, true);
    assert.ok(aufstellen(s, ort, p.x, p.y).ok);
  }
  assert.equal(Object.values(ort.welt.objekte).filter((o) => o.t === 'fischfarm').length, 3);
});

console.log('\nFischfarm: Produktion über Nacht');
test('jede Nacht +200 Karpfen, über mehrere Nächte, bei jedem Wetter und jeder Jahreszeit', () => {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  const p = feld(s, ort, true);
  aufstellen(s, ort, p.x, p.y);
  let erwartet = 0;
  for (const [jz, wetter] of [['fruehling', 'sonne'], ['sommer', 'regen'], ['herbst', 'sonne'], ['winter', 'regen']]) {
    s.zeit.jz = jz;
    s.zeit.morgen = wetter;
    nacht(s);
    erwartet += FISCHFARM_PRO_TAG;
    assert.equal(farmAn(ort, p.x, p.y).fisch, erwartet);
  }
  assert.equal(erwartet, 800);
});
test('mehrere Farmen produzieren je 200', () => {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  L.hinzufuegen(s, { id: 'fischfarm', n: 2 });
  const a = feld(s, ort, true);
  aufstellen(s, ort, a.x, a.y);
  const b = feld(s, ort, true);
  aufstellen(s, ort, b.x, b.y);
  nacht(s);
  nacht(s);
  assert.equal(farmAn(ort, a.x, a.y).fisch, 400);
  assert.equal(farmAn(ort, b.x, b.y).fisch, 400);
});
test('eine Farm auf einer nicht aktiven Karte produziert auch', () => {
  const s = neues();
  const strand = L.ortVon(s, 'strand');
  const p = feld(s, strand, true);
  assert.ok(aufstellen(s, strand, p.x, p.y).ok);
  assert.equal(L.ortVon(s, 'hof').welt.objekte !== strand.welt.objekte, true);
  nacht(s);
  assert.equal(farmAn(strand, p.x, p.y).fisch, 200);
  nacht(s);
  assert.equal(farmAn(strand, p.x, p.y).fisch, 400);
});
test('Ohnmacht um zwei Uhr zählt nur einmal', () => {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  const p = feld(s, ort, true);
  aufstellen(s, ort, p.x, p.y);
  s.zeit.minute = 1560;
  L.tagBeenden(s, { ohnmacht: true, r: () => 0.99 });
  assert.equal(farmAn(ort, p.x, p.y).fisch, 200);
});
test('kein Deckel: der Vorrat wächst über 999 hinaus', () => {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  const p = feld(s, ort, true);
  aufstellen(s, ort, p.x, p.y);
  for (let i = 0; i < 6; i++) nacht(s);
  assert.equal(farmAn(ort, p.x, p.y).fisch, 1200);
});
test('beschädigter Vorrat (null, NaN, Text, negativ) wird zu 0 und produziert normal weiter', () => {
  for (const kaputt of [null, undefined, NaN, 'viel', -50, Infinity]) {
    const s = neues();
    const ort = L.ortVon(s, 'hof');
    const p = feld(s, ort, true);
    aufstellen(s, ort, p.x, p.y);
    farmAn(ort, p.x, p.y).fisch = kaputt;
    assert.equal(vorratVon(farmAn(ort, p.x, p.y)), 0);
    nacht(s);
    assert.equal(farmAn(ort, p.x, p.y).fisch, 200, String(kaputt));
  }
});

console.log('\nFischfarm: Einsammeln');
function mitFarm(vorrat) {
  const s = neues();
  const ort = L.ortVon(s, 'hof');
  const p = feld(s, ort, true);
  aufstellen(s, ort, p.x, p.y);
  const o = farmAn(ort, p.x, p.y);
  o.fisch = vorrat;
  return { s, ort, p, o };
}
test('Einsammeln gibt alle 200 Karpfen in den Rucksack', () => {
  const { s, o } = mitFarm(200);
  const erg = farmEinsammeln(s, o);
  assert.equal(erg.text, '200 Karpfen eingesammelt.');
  assert.deepEqual(erg.items, [{ id: 'karpfen', n: 200 }]);
  assert.equal(L.anzahl(s, 'karpfen'), 200);
  assert.equal(o.fisch, 0);
});
test('es ist der normale Karpfen: kein Feld q, keine Größe, kein Fangbuch, kein XP, keine Statistik', () => {
  const { s, o } = mitFarm(200);
  const xp = JSON.stringify(s.spieler.xp ?? s.spieler.faehigkeiten ?? null);
  const gefangen = s.stats.gefangen;
  const buch = JSON.stringify(s.angeln ?? null);
  farmEinsammeln(s, o);
  const slot = s.spieler.inv.find((i) => i?.id === 'karpfen');
  assert.deepEqual(Object.keys(slot).sort(), ['id', 'n']);
  assert.equal(JSON.stringify(s.spieler.xp ?? s.spieler.faehigkeiten ?? null), xp);
  assert.equal(s.stats.gefangen, gefangen);
  assert.equal(JSON.stringify(s.angeln ?? null), buch);
  assert.equal(ITEMS[slot.id].kat, 'fisch');
});
test('der Karpfen stapelt mit gefangenen normalen Karpfen', () => {
  const { s, o } = mitFarm(200);
  L.hinzufuegen(s, { id: 'karpfen', n: 5 });
  farmEinsammeln(s, o);
  assert.equal(s.spieler.inv.filter((i) => i?.id === 'karpfen').length, 1);
  assert.equal(L.anzahl(s, 'karpfen'), 205);
});
test('Rucksack teilweise voll: nur was passt, der Rest bleibt in der Farm', () => {
  const { s, o } = mitFarm(200);
  for (let i = 1; i < 24; i++) s.spieler.inv[i] = { id: 'stein', n: STAPEL_MAX };
  s.spieler.inv[0] = { id: 'karpfen', n: STAPEL_MAX - 120 };
  const erg = farmEinsammeln(s, o);
  assert.equal(erg.grund, 'Rucksack voll – 80 Karpfen bleiben in der Farm.');
  assert.equal(o.fisch, 80);
  assert.equal(s.spieler.inv[0].n, STAPEL_MAX);
  assert.deepEqual(erg.items, [{ id: 'karpfen', n: 120 }]);
});
test('Rucksack ganz voll: nichts geht verloren, Meldung nennt den ganzen Vorrat', () => {
  const { s, o } = mitFarm(200);
  for (let i = 0; i < 24; i++) s.spieler.inv[i] = { id: 'stein', n: STAPEL_MAX };
  const erg = farmEinsammeln(s, o);
  assert.equal(erg.grund, 'Rucksack voll – 200 Karpfen bleiben in der Farm.');
  assert.equal(o.fisch, 200);
  assert.ok(!erg.ok && erg.items.length === 0);
});
test('mehr als ein Stapel: 2400 Karpfen füllen mehrere Plätze, nichts geht verloren', () => {
  const { s, o } = mitFarm(2400);
  farmEinsammeln(s, o);
  assert.equal(L.anzahl(s, 'karpfen'), 2400);
  assert.ok(s.spieler.inv.every((i) => !i || i.n <= STAPEL_MAX));
  assert.equal(o.fisch, 0);
});
test('leere Farm: Hinweis, nichts im Rucksack', () => {
  const { s, o } = mitFarm(0);
  const erg = farmEinsammeln(s, o);
  assert.equal(erg.grund, 'Noch keine Fische. Über Nacht kommen 200 Karpfen.');
  assert.equal(L.anzahl(s, 'karpfen'), 0);
});
test('zweimal einsammeln gibt die Fische nicht doppelt', () => {
  const { s, o } = mitFarm(200);
  farmEinsammeln(s, o);
  farmEinsammeln(s, o);
  assert.equal(L.anzahl(s, 'karpfen'), 200);
});
test('Aktionshinweis zeigt den Vorrat', () => {
  const { s, ort, p, o } = mitFarm(200);
  const hinweis = OBJEKT_TYPEN.fischfarm.hinweis;
  assert.equal(hinweis({ s, ort, x: p.x, y: p.y, o }), 'Fische einsammeln (200)');
  o.fisch = 0;
  assert.equal(hinweis({ s, ort, x: p.x, y: p.y, o }), 'Fischfarm');
});

console.log('\nFischfarm: Aufheben');
test('mit Fischen wird sie nicht aufgehoben, leer schon (Axt und Spitzhacke)', () => {
  const { s, ort, p, o } = mitFarm(5);
  const erg = L.axtHieb(s, ort, p.x, p.y);
  assert.equal(erg.grund, 'In der Fischfarm sind noch Fische.');
  assert.ok(farmAn(ort, p.x, p.y), 'sie steht noch');
  o.fisch = 0;
  L.axtHieb(s, ort, p.x, p.y);
  assert.ok(!farmAn(ort, p.x, p.y));
  assert.equal(L.anzahl(s, 'fischfarm'), 1);
  aufstellen(s, ort, p.x, p.y);
  farmAn(ort, p.x, p.y).fisch = 1;
  assert.ok(L.spitzhackeHieb(s, ort, p.x, p.y).grund, 'Spitzhacke ebenso');
  farmAn(ort, p.x, p.y).fisch = 0;
  L.spitzhackeHieb(s, ort, p.x, p.y);
  assert.ok(!farmAn(ort, p.x, p.y));
});

console.log('\nFischfarm: Speichern und Laden');
test('Vorrat bleibt beim Speichern und Laden, alte Stände ohne Farm bleiben gültig', () => {
  const { s, p, o } = mitFarm(0);
  nacht(s);
  assert.equal(o.fisch, 200);
  const t = L.deserialisieren(L.serialisieren(s));
  assert.equal(L.serialisieren(t), L.serialisieren(s));
  assert.equal(farmAn(L.ortVon(t, 'hof'), p.x, p.y).fisch, 200);
  nacht(t);
  assert.equal(farmAn(L.ortVon(t, 'hof'), p.x, p.y).fisch, 400);
  const alt = L.neuesSpiel({ name: 'Alt', hof: 'Hof', seed: 5 });
  const geladen = L.deserialisieren(L.serialisieren(alt));
  assert.equal(geladen.version, alt.version);
  nacht(geladen);
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`);
if (fehlgeschlagen) process.exit(1);
