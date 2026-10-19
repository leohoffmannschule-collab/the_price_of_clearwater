// Die Laufzeit ohne Bildschirm: durch den Weltgraphen laufen, Türen, Mineneingang, Werkzeuge,
// Gespräche. Eingaben werden wie von der Tastatur gesetzt. (Mine, Tiere … prüfen ihre Bereichstests.)
// Aufruf: node test/laufzeit.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { T, LAEDEN, NPCS } from '../src/daten.js';
import { KARTEN, karte, punkt, raster, rahmen, fertigRaster } from '../src/karten.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, karteBetreten } from '../src/spiel.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

const E = {
  richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
  aktion: { gedrueckt: false }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
};
const RICHTUNG = { oben: [0, -1], unten: [0, 1], links: [-1, 0], rechts: [1, 0] };
const protokoll = { dialoge: [], fenster: [], meldungen: [] };
const hooks = {
  dialog: (npc, texte, optionen) => { protokoll.dialoge.push({ npc, texte, optionen }); },
  frage: (text, optionen) => { protokoll.dialoge.push({ texte: [text], optionen }); },
  fenster: (name, daten) => { protokoll.fenster.push({ name, daten }); },
  meldung: (text) => { protokoll.meldungen.push(text); },
};
const feld = () => [Math.floor(S.sp.x / T), Math.floor((S.sp.y - 3) / T)];
const xy = (karte, name) => { const p = punkt(karte, name); return [p.x, p.y]; };

function bild(n = 1) {
  for (let i = 0; i < n; i++) {
    update(0.05, E);
    E.aktion.gedrueckt = false;
    E.benutzen.gedrueckt = false;
  }
}
/** Läuft in eine Richtung, bis die Karte wechselt (höchstens `max` Bilder). */
function laufen(richtung, max = 120) {
  const vorher = S.ort.def.id;
  [E.richtung.x, E.richtung.y] = RICHTUNG[richtung];
  for (let i = 0; i < max && S.ort.def.id === vorher; i++) bild();
  E.richtung.x = 0;
  E.richtung.y = 0;
  return S.ort.def.id;
}
function stellen(karte, name, blick) {
  const p = punkt(karte, name);
  karteBetreten(karte, p.x, p.y, blick || p.blick || 'unten');
}
function aktion() { E.aktion.gedrueckt = true; bild(); }
function benutzen() { E.benutzen.gedrueckt = true; bild(); E.benutzen.gehalten = false; bild(10); }

console.log('\nUnterwegs in Klarwasser');
const s = L.neuesSpiel({ seed: 5 });
s.zeit.minute = 600;
spielStarten(s, hooks);

test('aus dem Haus auf den Hof', () => {
  assert.equal(S.ort.def.id, 'haus');
  stellen('haus', 'eingang', 'unten');
  assert.equal(laufen('unten'), 'hof');
  assert.deepEqual(feld(), xy('hof', 'vorHaus'));
});

test('Hof → Dorf → Strand und zurück ins Dorf', () => {
  stellen('hof', 'vonDorf', 'rechts');
  assert.equal(laufen('rechts'), 'dorf');
  assert.deepEqual(feld(), xy('dorf', 'vonHof'));
  stellen('dorf', 'vonStrand', 'unten');
  assert.equal(laufen('unten'), 'strand');
  assert.deepEqual(feld(), xy('strand', 'vonDorf'));
  assert.equal(laufen('oben'), 'dorf');
  assert.deepEqual(feld(), xy('dorf', 'vonStrand'));
});

test('Dorf → Wald → Hof → Berg → Dorf', () => {
  stellen('dorf', 'vonWald', 'links');
  assert.equal(laufen('links'), 'wald');
  assert.deepEqual(feld(), xy('wald', 'vonDorf'));
  stellen('wald', 'vonHof', 'oben');
  assert.equal(laufen('oben'), 'hof');
  assert.deepEqual(feld(), xy('hof', 'vonWald'));
  stellen('hof', 'vonBerg', 'oben');
  assert.equal(laufen('oben'), 'berg');
  assert.deepEqual(feld(), xy('berg', 'vonHof'));
  stellen('berg', 'vonDorf', 'unten');
  assert.equal(laufen('unten'), 'dorf');
  assert.deepEqual(feld(), xy('dorf', 'vonBerg'));
});

test('der Mineneingang am Berg öffnet sich erst mit „mineOffen"', () => {
  const tor = KARTEN.berg.gebaeude.find((g) => g.ziel?.karte === 'mine0');
  stellen('berg', 'vorMine', 'oben');
  assert.equal(laufen('oben', 40), 'berg', 'Geröll versperrt den Weg');
  aktion();
  assert.equal(protokoll.dialoge.at(-1).texte[0], tor.sonst);
  S.s.flags.mineOffen = true;
  assert.equal(laufen('oben'), 'mine0');
  assert.deepEqual(feld(), xy('mine0', 'eingang'));
  stellen('mine0', 'eingang', 'unten');
  assert.equal(laufen('unten'), 'berg');
  assert.deepEqual(feld(), xy('berg', 'vorMine'));
});

// Testacker, damit die Werkzeuge nicht von der Hofkarte abhängen
karte({ id: 'testlauf', name: 'Testlauf', aussen: true, farmbar: true, wasser: 'teich', npcWege: false, grid: fertigRaster(rahmen(raster(16, 12, '.'), '#')) });

test('Werkzeuge: hacken, säen, gießen und die Axt am Baum', () => {
  karteBetreten('testlauf', 4, 6, 'rechts');
  const w = S.ort.welt;
  for (const kk of [L.k(5, 6), L.k(6, 6)]) { delete w.objekte[kk]; delete w.felder[kk]; }
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'hacke');
  benutzen();
  assert.ok(w.felder[L.k(5, 6)], 'Beet');
  L.hinzufuegen(S.s, { id: 'pastinake_saat', n: 1 });
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'pastinake_saat');
  benutzen();
  assert.equal(w.felder[L.k(5, 6)].pflanze?.id, 'pastinake');
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'giesskanne');
  benutzen();
  assert.equal(w.felder[L.k(5, 6)].nass, true);
  w.objekte[L.k(6, 7)] = { t: 'baum', hp: 1, art: 'eiche' };
  karteBetreten('testlauf', 6, 6, 'unten');
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'axt');
  const holz = L.anzahl(S.s, 'holz');
  benutzen();
  assert.notEqual(w.objekte[L.k(6, 7)]?.t, 'baum', 'Baum gefällt');
  assert.ok(L.anzahl(S.s, 'holz') > holz);
});

/** Ein begehbares Nachbarfeld von (x, y) und die Blickrichtung dorthin zurück. */
function nachbarVon(karteId, x, y) {
  const def = KARTEN[karteId];
  for (const [dx, dy, blick] of [[0, 1, 'oben'], [1, 0, 'links'], [-1, 0, 'rechts'], [0, -1, 'unten']]) {
    if (L.begehbar(S.s, def, L.welt(S.s, karteId), x + dx, y + dy)) return [x + dx, y + dy, blick];
  }
  return null;
}

test('am Laden reden und einkaufen, und mit der gesuchten Ware den Auftrag abgeben', () => {
  const laden = LAEDEN.laden;
  const ort = L.ladenOrt('laden');
  const name = NPCS[laden.npc].name;
  S.s.zeit.minute = 720;
  bild();
  const person = S.npcs.find((n) => n.id === laden.npc);
  person.karte = ort.karte; person.x = ort.x * T + 8; person.y = ort.y * T + 13; person.pfad = []; person.pause = 0;
  // Vor der Theke (Deko mit aktion „laden") …
  const theke = KARTEN[ort.karte].deko.find((d) => d.aktion === 'laden' && d.laden === 'laden');
  const [tx, ty, tb] = nachbarVon(ort.karte, theke.x, theke.y);
  karteBetreten(ort.karte, tx, ty, tb);
  S.s.spieler.wahl = 0;
  bild();
  assert.equal(S.hinweis, laden.name);
  aktion();
  const d = protokoll.dialoge.at(-1);
  assert.equal(d.npc, laden.npc);
  assert.ok(d.optionen.some(([t]) => t === 'Einkaufen'), 'Laden ist offen');
  // … über die Theke hinweg den Auftrag abgeben …
  S.s.quest = { npc: laden.npc, id: 'holz', n: 1, belohnung: 100, text: '', frist: 99 };
  L.hinzufuegen(S.s, { id: 'holz', n: 1 });
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'holz');
  let gold = S.s.spieler.gold;
  aktion();
  assert.equal(S.s.quest, null);
  assert.equal(S.s.spieler.gold, gold + 100);
  // … und direkt neben der Person
  S.s.quest = { npc: laden.npc, id: 'holz', n: 1, belohnung: 100, text: '', frist: 99 };
  L.hinzufuegen(S.s, { id: 'holz', n: 1 });
  const [nx, ny, nb] = nachbarVon(ort.karte, ort.x, ort.y);
  karteBetreten(ort.karte, nx, ny, nb);
  person.pause = 0;
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'holz');
  bild();
  assert.equal(S.hinweis, `Auftrag abgeben an ${name}`);
  gold = S.s.spieler.gold;
  aktion();
  assert.equal(S.s.quest, null);
  assert.equal(S.s.spieler.gold, gold + 100);
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
