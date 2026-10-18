// Die Laufzeit ohne Bildschirm: durch den Weltgraphen laufen, Türen, Mine, Werkzeuge,
// Gespräche, Hühner. Eingaben werden wie von der Tastatur gesetzt.
// Aufruf: node test/laufzeit.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { T } from '../src/daten.js';
import { punkt } from '../src/karten.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, karteBetreten, zustandSichern } from '../src/spiel.js';
import { aufzugFahren } from '../src/bereiche/mine/inhalt.js';

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

test('der Mineneingang am Berg ist erst ab Tag 4 offen', () => {
  stellen('berg', 'vorMine', 'oben');
  assert.equal(laufen('oben', 40), 'berg', 'Geröll versperrt den Weg');
  aktion();
  assert.match(protokoll.dialoge.at(-1).texte[0], /Geröll/);
  S.s.flags.mineOffen = true;
  assert.equal(laufen('oben'), 'mine0');
  assert.deepEqual(feld(), xy('mine0', 'eingang'));
});

test('Schwert nehmen, Leiter hinab, Ebene 1 mit Monstern, Förderkorb zurück', () => {
  karteBetreten('mine0', 3, 3, 'oben');
  aktion();
  assert.ok(L.hat(S.s, 'schwert'), 'Schwert');
  assert.ok(S.s.mine.schwert);
  stellen('mine0', 'leiter', 'oben');
  aktion();
  assert.equal(S.ort.def.id, 'mine1');
  assert.equal(S.mineEbene, 1);
  assert.ok(S.monster.length > 0, 'Monster');
  assert.equal(S.s.mine.tiefste, 1);
  const gesichert = zustandSichern();
  assert.equal(gesichert.spieler.karte, 'mine0');
  assert.deepEqual([gesichert.spieler.x, gesichert.spieler.y], xy('mine0', 'leiter'));
  bild(20);
  aufzugFahren(0);
  assert.equal(S.ort.def.id, 'mine0');
  assert.equal(S.mineEbene, 0);
  assert.equal(S.monster.length, 0);
  stellen('mine0', 'eingang', 'unten');
  assert.equal(laufen('unten'), 'berg');
  assert.deepEqual(feld(), xy('berg', 'vorMine'));
});

test('Werkzeuge: hacken, säen, gießen und die Axt am Baum', () => {
  karteBetreten('hof', 30, 20, 'rechts');
  const w = S.ort.welt;
  for (const kk of [L.k(31, 20), L.k(32, 20)]) { delete w.objekte[kk]; delete w.felder[kk]; }
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'hacke');
  benutzen();
  assert.ok(w.felder[L.k(31, 20)], 'Beet');
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'pastinake_saat');
  benutzen();
  assert.equal(w.felder[L.k(31, 20)].pflanze?.id, 'pastinake');
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'giesskanne');
  benutzen();
  assert.equal(w.felder[L.k(31, 20)].nass, true);
  w.objekte[L.k(32, 21)] = { t: 'baum', hp: 1, art: 'eiche' };
  karteBetreten('hof', 32, 20, 'unten');
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'axt');
  const holz = L.anzahl(S.s, 'holz');
  benutzen();
  assert.equal(w.objekte[L.k(32, 21)]?.t, 'stumpf');
  assert.ok(L.anzahl(S.s, 'holz') > holz);
});

test('reden, und mit der gesuchten Ware den Auftrag abgeben', () => {
  S.s.zeit.minute = 600;
  bild();
  const ottilie = S.npcs.find((n) => n.id === 'ottilie');
  assert.equal(ottilie.karte, 'laden');
  karteBetreten('laden', 3, 5, 'oben');
  S.s.spieler.wahl = 0;
  aktion();
  const d = protokoll.dialoge.at(-1);
  assert.equal(d.npc, 'ottilie');
  assert.ok(d.optionen.some(([t]) => t === 'Einkaufen'), 'Laden ist offen');
  assert.equal(S.hinweis, 'Krämerladen');
  // Über die Theke hinweg …
  S.s.quest = { npc: 'ottilie', id: 'holz', n: 1, belohnung: 100, text: '', frist: 99 };
  S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'holz');
  let gold = S.s.spieler.gold;
  aktion();
  assert.equal(S.s.quest, null);
  assert.equal(S.s.spieler.gold, gold + 100);
  // … und direkt neben ihr
  S.s.quest = { npc: 'ottilie', id: 'holz', n: 1, belohnung: 100, text: '', frist: 99 };
  karteBetreten('laden', 4, 3, 'links');
  ottilie.pause = 0;
  bild();
  assert.equal(S.hinweis, 'Auftrag abgeben an Ottilie');
  gold = S.s.spieler.gold;
  aktion();
  assert.equal(S.s.quest, null);
  assert.equal(S.s.spieler.gold, gold + 100);
});

test('Hühner im Auslauf lassen sich streicheln', () => {
  S.s.stall.gebaut = true;
  S.s.stall.huehner = [{ name: 'Erna', freundschaft: 0, gestreichelt: false, neu: false }];
  S.s.zeit.minute = 600;
  S.s.zeit.wetter = 'sonne';
  L.kartenGeaendert();
  karteBetreten('hof', 20, 7, 'unten');
  assert.equal(S.huehner.length, 1);
  const h = S.huehner[0];
  h.t = 99;
  const hx = Math.floor(h.x / T);
  const hy = Math.floor((h.y - 3) / T);
  karteBetreten('hof', hx, hy - 1, 'unten');
  S.huehner[0] = h;
  bild();
  assert.equal(S.hinweis, 'Huhn streicheln');
  aktion();
  assert.ok(S.s.stall.huehner[0].gestreichelt);
  assert.ok(L.gebaeudeListe(S.s, S.ort.def).some((g) => g.typ === 'stall'), 'Stall steht');
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
