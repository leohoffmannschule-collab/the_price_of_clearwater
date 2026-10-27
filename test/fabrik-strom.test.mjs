// Fabrik Stufe 2 (Bereich handwerk): Stromnetz, Rohrleitungen, Handy. Netzbildung, Leistung, Überlast und Sicherung,
// Maschinen ohne Strom stehen und laufen mit Strom, Brennstoff-Verbrauch nach Brennwert und Last, Kabelreichweite und
// Anschlussgrenzen, Wasser über Rohre zum Kraftwerk, Durchflussgrenze, Nachholen über Nacht, Handy-Kauf (Gold, Menge,
// voller Rucksack), Vorkommen kaufen und aufstellen, Bänder Mk2/Mk3, Speichern und Laden, alter Stand (Übergang).
// Aufruf: node test/fabrik-strom.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { ITEMS, OBJEKT_TYPEN, REZEPTE, STAPEL_MAX, WERKZEUG_ARTEN, BRIEFE } from '../src/daten.js';
import * as L from '../src/logik.js';
import { istWasser } from '../src/karten.js';
import { S } from '../src/spiel.js';
import { FABRIK, MASCHINEN, VORKOMMEN_PREIS, BAND_TEMPO } from '../src/bereiche/handwerk/fabrik-daten.js';
import { simuliere, fabrikAenderung, tempoVon, cacheVon, warenSumme } from '../src/bereiche/handwerk/fabrik-sim.js';
import { fabrikAufheben } from '../src/bereiche/handwerk/fabrik-objekte.js';
import { fabrikZustand, nacht } from '../src/bereiche/handwerk/fabrik-system.js';
import { maschinenInfo } from '../src/bereiche/handwerk/fabrik-info.js';
import { STROM, GENERATOREN, ROHR, HANDY_PREISE, STARTER, anschluesseVon } from '../src/bereiche/handwerk/fabrik-strom-daten.js';
import {
  stromNetze, anschlussStatus, netzUebersicht, sicherungEin, kabelVerbinden, kabelPruefen, kabelLoesen, kabelAn,
  uebergang, stromZustand,
} from '../src/bereiche/handwerk/fabrik-strom.js';
import { kabelWaehlen, kabelAbbrechen } from '../src/bereiche/handwerk/fabrik-strom-objekte.js';
import { rohrNetze, rohrInfo, wasserSchritt, uferPlatz } from '../src/bereiche/handwerk/fabrik-rohre.js';
import { handyKaufen, hoechstens, vorkommenKaufen, paketListe, paketAbholen, handyKatalog, goldText } from '../src/bereiche/handwerk/fabrik-handy.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.stack?.split("\n").slice(0, 6).join('\n      ') ?? e.message}`);
  }
}

// ─── Hilfen ─────────────────────────────────────────────────────────────────

const RECHTS = 1;
const X0 = 20;
const Y0 = 14;

/** Neues Spiel mit leerer Hofkarte; `strom: false` beendet die Übergangszeit (Maschinen ohne Netz stehen). */
function neues({ seed = 21, uebergang: ueb = false } = {}) {
  const s = L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
  s.spieler.inv = Array(24).fill(null);
  const ort = L.ortVon(s, 'hof');
  ort.welt.objekte = {};
  ort.welt.felder = {};
  ort.welt.belag = {};
  if (!ueb) s.fabrik.strom.frist = 0;
  fabrikZustand(s).zeit.hof = 0;
  fabrikAenderung();
  return { s, ort };
}
function setze(ort, x, y, o) {
  L.objektSetzen(ort, x, y, o);
  fabrikAenderung();
  return o;
}
const mast = (ort, x, y) => setze(ort, x, y, { t: 'strommast' });
const brenner = (ort, x, y, holz = 0) => setze(ort, x, y, { t: 'biomassebrenner', r: 0, ein: holz ? { holz } : {}, aus: {}, f: 0 });
const kraftwerk = (ort, x, y, kohle = 0, wa = 0) => setze(ort, x, y, { t: 'kohlekraftwerk', r: 0, ein: kohle ? { kohle } : {}, aus: {}, f: 0, wa });
const bohrer = (ort, x, y, rein = 1) => setze(ort, x, y, { t: 'erzbohrer', r: RECHTS, erz: 'eisen', rein, ein: {}, aus: {}, f: 0 });
const lager = (ort, x, y) => setze(ort, x, y, { t: 'lager', r: RECHTS, inv: Array(48).fill(null) });
const pumpe = (ort, x, y) => setze(ort, x, y, { t: 'wasserpumpe', st: 'x' });
const rohr = (ort, x, y, mk = 1) => setze(ort, x, y, { t: 'rohrleitung', ...(mk > 1 ? { mk } : {}), fl: 0 });
const lagerN = (o, id) => o.inv.reduce((n, f) => n + (f && f.id === id ? f.n : 0), 0);
const kk = (x, y) => L.k(x, y);
/** Kabel verlegen (mit genug Kabel im Rucksack). */
function kabel(s, ort, a, b) {
  L.hinzufuegen(s, { id: 'stromkabel', n: 20 });
  const erg = kabelVerbinden(s, ort, a, b);
  assert.ok(erg.ok, erg.grund);
  return erg;
}
const erzVon = (b, l) => lagerN(l, 'eisenerz') + (b.aus.eisenerz || 0);
const nahe = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('\nDaten, Gegenstände, Rezepte');

test('alle neuen Teile sind Gegenstände mit Bild-Art; aufstellbare mit Objekttyp; Rezepte gestaffelt', () => {
  for (const id of ['foerderband_mk2', 'foerderband_mk3', 'biomassebrenner', 'kohlekraftwerk', 'wasserrad', 'strommast', 'wasserpumpe', 'rohrleitung', 'rohrleitung_mk2']) {
    assert.ok(ITEMS[id]?.aufstellbar, id);
    const t = typeof ITEMS[id].aufstellbar === 'string' ? ITEMS[id].aufstellbar : id;
    assert.ok(OBJEKT_TYPEN[t], t);
    assert.ok(REZEPTE.find((r) => r.id === id)?.stufe?.[0] === 'bergbau', `Rezept ${id}`);
  }
  assert.ok(REZEPTE.find((r) => r.id === 'stromkabel'));
  assert.equal(ITEMS.stromkabel.werkzeug, 'handwerk_kabel');
  assert.ok(WERKZEUG_ARTEN.handwerk_kabel.benutzen && WERKZEUG_ARTEN.handwerk_handy.benutzen);
  assert.equal(ITEMS.handy.verkaufbar, false);
  assert.deepEqual([BAND_TEMPO[1], BAND_TEMPO[2], BAND_TEMPO[3]], [1.5, 3, 5]);
  assert.equal(GENERATOREN.biomassebrenner.leistung, 30);
  assert.equal(GENERATOREN.kohlekraftwerk.leistung, 75);
  assert.equal(GENERATOREN.kohlekraftwerk.wasser, 45);
  assert.deepEqual([ROHR.stufen[1].grenze, ROHR.stufen[2].grenze], [300, 600]);
  assert.ok(MASCHINEN.biomassebrenner.generator && MASCHINEN.kohlekraftwerk.generator);
  assert.equal(anschluesseVon('strommast'), 4);
  assert.equal(anschluesseVon('erzbohrer'), 1);
  assert.equal(anschluesseVon('lager'), 0, 'Lager braucht keinen Strom');
  assert.equal(anschluesseVon('foerderband'), 0, 'Bänder brauchen keinen Strom');
});
test('Handy-Preise: Teile 0,1–10 Mio, das Kraftwerk mehr; Katalog enthält alle Gruppen', () => {
  for (const [id, p] of Object.entries(HANDY_PREISE)) {
    assert.ok(ITEMS[id], id);
    if (id === 'kohlekraftwerk') assert.ok(p > 10_000_000);
    else assert.ok(p >= 100_000 && p <= 10_000_000, `${id} ${p}`);
  }
  const ids = handyKatalog().flatMap((g) => g.eintraege.map((e) => e.id));
  for (const id of ['foerderband', 'foerderband_mk2', 'foerderband_mk3', 'erzbohrer', 'schmelzer', 'konstrukteur', 'assembler', 'splitter', 'zusammenfuehrer', 'lager', 'biomassebrenner', 'kohlekraftwerk', 'strommast', 'stromkabel', 'wasserpumpe', 'rohrleitung', 'rohrleitung_mk2', 'wasserrad']) assert.ok(ids.includes(id), id);
  assert.equal(goldText(2_500_000), '2,5 Mio. g');
});

console.log('\nNetze und Kabel');

test('Netzbildung: Kabel verbinden Anschlüsse zu einem Netz, ohne Kabel bleibt eine Maschine ohne Netz', () => {
  const { s, ort } = neues();
  brenner(ort, X0, Y0, 10);
  mast(ort, X0 + 4, Y0);
  bohrer(ort, X0 + 6, Y0);
  bohrer(ort, X0 + 6, Y0 + 4);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  kabel(s, ort, kk(X0 + 4, Y0), kk(X0 + 6, Y0));
  let c = stromNetze(s, ort);
  assert.equal(c.netze.length, 1);
  assert.equal(c.netze[0].gens.length, 1);
  assert.equal(c.netze[0].verb.length, 1);
  assert.equal(c.ohne.length, 1, 'zweiter Bohrer ohne Kabel');
  kabel(s, ort, kk(X0 + 4, Y0), kk(X0 + 6, Y0 + 4));
  c = stromNetze(s, ort);
  assert.equal(c.netze[0].verb.length, 2);
  assert.equal(c.ohne.length, 0);
  // Kabel lösen teilt das Netz, die Kabel kommen zurück
  const vorher = L.anzahl(s, 'stromkabel');
  const i = kabelAn(s, ort, kk(X0, Y0))[0].i;
  kabelLoesen(s, ort, i);
  assert.ok(L.anzahl(s, 'stromkabel') > vorher);
  c = stromNetze(s, ort);
  assert.equal(c.netze.length, 2, 'Brenner allein, Mast mit Bohrern');
});
test('Kabelreichweite (10 Felder), Kosten nach Länge, Kupferdraht als Ersatz, zu wenig Kabel', () => {
  const { s, ort } = neues();
  mast(ort, X0, Y0);
  mast(ort, X0 + 10, Y0);
  mast(ort, X0 + 21, Y0);
  assert.ok(kabelPruefen(s, ort, kk(X0, Y0), kk(X0 + 10, Y0)).ok, '10 Felder gehen');
  assert.match(kabelPruefen(s, ort, kk(X0 + 10, Y0), kk(X0 + 21, Y0)).grund, /Zu weit/);
  assert.match(kabelVerbinden(s, ort, kk(X0, Y0), kk(X0 + 10, Y0)).grund, /Zu wenig Kabel/);
  L.hinzufuegen(s, { id: 'stromkabel', n: 4 });
  L.hinzufuegen(s, { id: 'kupferdraht', n: 6 });
  const erg = kabelVerbinden(s, ort, kk(X0, Y0), kk(X0 + 10, Y0));
  assert.ok(erg.ok);
  assert.equal(erg.kosten, 10);
  assert.equal(L.anzahl(s, 'stromkabel'), 0);
  assert.equal(L.anzahl(s, 'kupferdraht'), 0);
  assert.match(kabelPruefen(s, ort, kk(X0, Y0), kk(X0 + 10, Y0)).grund, /schon verbunden/);
  assert.match(kabelPruefen(s, ort, kk(X0, Y0), kk(X0, Y0)).grund, /zwei verschiedene/);
});
test('Anschlussgrenzen: Mast 4, Maschine 1, Generator 2; Lager und Band sind keine Anschlüsse', () => {
  const { s, ort } = neues();
  const m = kk(X0 + 5, Y0 + 5);
  mast(ort, X0 + 5, Y0 + 5);
  const ziele = [[X0 + 1, Y0 + 5], [X0 + 9, Y0 + 5], [X0 + 5, Y0 + 1], [X0 + 5, Y0 + 9], [X0 + 8, Y0 + 8]];
  for (const [x, y] of ziele) mast(ort, x, y);
  for (const [x, y] of ziele.slice(0, 4)) kabel(s, ort, m, kk(x, y));
  assert.match(kabelPruefen(s, ort, m, kk(...ziele[4])).grund, /keinen freien Platz/);
  bohrer(ort, X0 + 12, Y0 + 12);
  kabel(s, ort, kk(X0 + 12, Y0 + 12), kk(X0 + 8, Y0 + 8));
  mast(ort, X0 + 14, Y0 + 9);
  assert.match(kabelPruefen(s, ort, kk(X0 + 14, Y0 + 9), kk(X0 + 12, Y0 + 12)).grund, /keinen freien Platz/, 'Maschine hat nur einen Anschluss');
  brenner(ort, X0 + 1, Y0 + 12);
  mast(ort, X0 + 1, Y0 + 15);
  mast(ort, X0 + 4, Y0 + 15);
  mast(ort, X0 + 1, Y0 + 10);
  kabel(s, ort, kk(X0 + 1, Y0 + 12), kk(X0 + 1, Y0 + 15));
  kabel(s, ort, kk(X0 + 1, Y0 + 12), kk(X0 + 4, Y0 + 15));
  assert.match(kabelPruefen(s, ort, kk(X0 + 1, Y0 + 12), kk(X0 + 1, Y0 + 10)).grund, /keinen freien Platz/, 'Generator hat zwei');
  lager(ort, X0 + 16, Y0);
  assert.match(kabelPruefen(s, ort, kk(X0 + 16, Y0), kk(X0 + 14, Y0 + 9)).grund, /nur Strommasten/);
});
test('Kabel-Werkzeug: erst Anfang, dann Ziel; zu weit lässt den Anfang stehen; derselbe Anschluss bricht ab', () => {
  const { s, ort } = neues();
  kabelAbbrechen();
  mast(ort, X0, Y0);
  mast(ort, X0 + 6, Y0);
  mast(ort, X0 + 20, Y0);
  L.hinzufuegen(s, { id: 'stromkabel', n: 30 });
  assert.match(kabelWaehlen(s, ort, X0 + 2, Y0 + 3).grund, /Strommasten/);
  assert.ok(kabelWaehlen(s, ort, X0, Y0).start);
  assert.match(kabelWaehlen(s, ort, X0 + 20, Y0).grund, /Zu weit/);
  const erg = kabelWaehlen(s, ort, X0 + 6, Y0);
  assert.ok(erg.ok && !erg.start, erg.grund);
  assert.equal(kabelAn(s, ort, kk(X0, Y0)).length, 1);
  assert.ok(kabelWaehlen(s, ort, X0 + 6, Y0).start);
  assert.match(kabelWaehlen(s, ort, X0 + 6, Y0).text, /abgebrochen/);
});

console.log('\nLeistung, Sicherung, Brennstoff');

test('Maschinen ohne Strom stehen (Takt 0), mit Strom laufen sie; Bänder und Lager brauchen keinen', () => {
  const { s, ort } = neues();
  const b = bohrer(ort, X0, Y0);
  const l = lager(ort, X0 + 2, Y0);
  simuliere(s, ort, 20, { schritt: 0.1 });
  assert.equal(erzVon(b, l), 0, 'ohne Netz kein Erz');
  assert.equal(b.st, 'x');
  assert.equal(tempoVon(cacheVon(s, ort), b), 0);
  assert.equal(tempoVon(cacheVon(s, ort), l), 1, 'Lager läuft ohne Strom');
  assert.match(anschlussStatus(s, ort, kk(X0, Y0)).text, /nicht angeschlossen/);
  brenner(ort, X0, Y0 + 4, 20);
  kabel(s, ort, kk(X0, Y0 + 4), kk(X0, Y0));
  simuliere(s, ort, 20, { schritt: 0.1 });
  assert.ok(nahe(erzVon(b, l), 10, 1), `mit Strom 0,5/s: ${erzVon(b, l)}`);
  assert.equal(anschlussStatus(s, ort, kk(X0, Y0)).status, 'an');
  assert.ok(maschinenInfo(b, s).zeilen.some(([z, w]) => z === 'Strom' && /versorgt/.test(w)), 'Info-Fenster zeigt den Strom');
});
/** Brenner bei (X0, Y0), drei Masten in einer Reihe, sieben Bohrer (35 MW). Gibt Masten und Bohrer zurück. */
function siebenBohrer(s, ort, holz = 100) {
  const g = brenner(ort, X0, Y0, holz);
  const m = [[X0 + 4, Y0 + 6], [X0 + 10, Y0 + 6], [X0 + 16, Y0 + 6]].map(([x, y]) => { mast(ort, x, y); return kk(x, y); });
  kabel(s, ort, kk(X0, Y0), m[0]);
  kabel(s, ort, m[0], m[1]);
  kabel(s, ort, m[1], m[2]);
  const pos = [[0, X0 + 2, Y0 + 9], [0, X0 + 5, Y0 + 9], [1, X0 + 8, Y0 + 9], [1, X0 + 11, Y0 + 9], [2, X0 + 14, Y0 + 9], [2, X0 + 17, Y0 + 9], [2, X0 + 14, Y0 + 2]];
  const bohrerListe = pos.map(([i, x, y]) => { const b = bohrer(ort, x, y); kabel(s, ort, m[i], kk(x, y)); return b; });
  return { g, m, pos, bohrerListe };
}

test('Überlast: 7 Bohrer (35 MW) an einem Brenner (30 MW) – die Sicherung fliegt, das ganze Netz steht', () => {
  const { s, ort } = neues();
  const { g, m, pos, bohrerListe } = siebenBohrer(s, ort);
  simuliere(s, ort, 2, { schritt: 0.1 });
  const u = netzUebersicht(s, ort, m[0]);
  assert.equal(u.status, 'sicherung');
  assert.ok(g.fl, 'Sicherung am Generator vermerkt');
  assert.ok(bohrerListe.every((b) => b.st === 'x'), 'alle stehen');
  const holz = (g.ein.holz || 0) + (g.arb ? 1 : 0);
  simuliere(s, ort, 30, { schritt: 0.5 });
  assert.equal((g.ein.holz || 0) + (g.arb ? 1 : 0), holz, 'ohne Last kein Brennstoff');
  // Sicherung einschalten, ohne dass der Verbrauch passt: fliegt sofort wieder
  const erg = sicherungEin(s, ort, m[2]);
  assert.ok(erg.flog);
  simuliere(s, ort, 1, { schritt: 0.1 });
  assert.equal(netzUebersicht(s, ort, m[1]).status, 'sicherung');
  // zwei Bohrer abklemmen (25 MW ≤ 30 MW), dann am Generator einschalten: Strom fließt
  for (const [, x, y] of pos.slice(5)) kabelLoesen(s, ort, kabelAn(s, ort, kk(x, y))[0].i);
  const erg2 = sicherungEin(s, ort, kk(X0, Y0));
  assert.ok(erg2.ok && !erg2.flog, erg2.text);
  simuliere(s, ort, 4, { schritt: 0.1 });
  assert.equal(netzUebersicht(s, ort, m[0]).status, 'an');
  assert.ok(bohrerListe.slice(0, 5).every((b) => b.st === 'a' || b.st === 'v'));
  assert.ok(bohrerListe.slice(5).every((b) => b.st === 'x'), 'abgeklemmte stehen');
  assert.equal(netzUebersicht(s, ort, m[0]).info.bedarf, 25);
});
test('Brennstoff nach Brennwert und Last: Holz 100 MJ, Brenner 30 MW – volle Last 18 Holz/min, 1/6 Last 3 Holz/min', () => {
  const messen = (anzahl) => {
    const { s, ort } = neues();
    const g = brenner(ort, X0, Y0, 100);
    const m = [[X0 + 4, Y0], [X0 + 12, Y0], [X0 + 19, Y0]].map(([x, y]) => { mast(ort, x, y); return kk(x, y); });
    kabel(s, ort, kk(X0, Y0), m[0]);
    kabel(s, ort, m[0], m[1]);
    kabel(s, ort, m[1], m[2]);
    const pos = [[0, X0 + 2, Y0 + 3], [0, X0 + 2, Y0 - 4], [1, X0 + 7, Y0 + 3], [1, X0 + 7, Y0 - 4], [2, X0 + 12, Y0 + 3], [2, X0 + 17, Y0 + 3]];
    for (const [i, x, y] of pos.slice(0, anzahl)) {
      bohrer(ort, x, y);
      lager(ort, x + 2, y); // der Bohrer gibt ab und arbeitet weiter
      kabel(s, ort, m[i], kk(x, y));
    }
    simuliere(s, ort, 60, { schritt: 0.1 });
    return 100 - (g.ein.holz || 0) - (g.arb ? 1 - (g.f || 0) / (100 / 30) : 0);
  };
  const voll = messen(6);
  assert.ok(nahe(voll, 18, 0.6), `volle Last ${voll}`);
  const sechstel = messen(1);
  assert.ok(nahe(sechstel, 3, 0.3), `1/6 Last ${sechstel}`);
});
test('Generator nimmt Brennstoff vom Band (Holz aus einem Lager) und aus der Hand; Fremdes staut', () => {
  const { s, ort } = neues();
  const quelle = lager(ort, X0, Y0);
  quelle.inv[0] = { id: 'holz', n: 30 };
  setze(ort, X0 + 2, Y0, { t: 'foerderband', r: RECHTS, w: [] });
  const g = brenner(ort, X0 + 3, Y0);
  simuliere(s, ort, 30, { schritt: 0.1 });
  assert.equal(g.ein.holz, 30, 'alles Holz im Brenner (Vorrat bis 100)');
  quelle.inv[0] = { id: 'kupfererz', n: 3 };
  simuliere(s, ort, 5, { schritt: 0.1 });
  assert.ok(ort.welt.objekte[kk(X0 + 2, Y0)].w.length > 0, 'Erz staut vor dem Brenner');
  assert.equal(g.abg?.id, 'kupfererz');
  // aus der Hand: einlegen bis zum Vorrat
  s.spieler.inv[0] = { id: 'holz', n: 200 };
  s.spieler.wahl = 0;
  OBJEKT_TYPEN.biomassebrenner.einlegen({ s, ort, x: X0 + 3, y: Y0, o: g });
  assert.equal(g.ein.holz, 100);
  assert.equal(s.spieler.inv[0].n, 130);
});
test('Info-Fenster jeder Maschine zeigt den Strom; das Handy öffnet das Menü beim Reiter Handy', () => {
  const { s, ort } = neues({ uebergang: true });
  const sm = setze(ort, X0, Y0, { t: 'schmelzer', r: RECHTS, ein: {}, aus: {}, f: 0 });
  assert.ok(maschinenInfo(sm, s).zeilen.some(([z, w]) => z === 'Strom' && /4 MW · Übergangsstrom/.test(w)));
  s.fabrik.strom.frist = 0;
  assert.ok(maschinenInfo(sm, s).zeilen.some(([z, w]) => z === 'Strom' && /nicht angeschlossen/.test(w)));
  const lg = lager(ort, X0 + 4, Y0);
  assert.ok(!maschinenInfo(lg, s).zeilen.some(([z]) => z === 'Strom'), 'Lager ohne Strom-Zeile');
  const geoeffnet = [];
  const alt = S.hooks.fenster;
  S.hooks.fenster = (name, d) => geoeffnet.push([name, d]);
  WERKZEUG_ARTEN.handwerk_handy.benutzen({ s });
  S.hooks.fenster = alt;
  assert.equal(geoeffnet[0][0], 'menue');
  assert.equal(geoeffnet[0][1].reiter, 'handy');
});
test('ohne Brennstoff kein Strom (ohne Sicherung); Wasserrad liefert 6 MW ohne Brennstoff', () => {
  const { s, ort } = neues();
  brenner(ort, X0, Y0, 0);
  const b = bohrer(ort, X0 + 4, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  simuliere(s, ort, 5, { schritt: 0.1 });
  assert.equal(netzUebersicht(s, ort, kk(X0, Y0)).status, 'leer');
  assert.equal(b.st, 'x');
  setze(ort, X0 + 8, Y0, { t: 'wasserrad', st: 'x' });
  kabel(s, ort, kk(X0 + 8, Y0), kk(X0, Y0));
  simuliere(s, ort, 5, { schritt: 0.1 });
  const u = netzUebersicht(s, ort, kk(X0, Y0));
  assert.equal(u.status, 'an');
  assert.equal(u.info.kap, 6);
  assert.ok(b.st === 'a' || b.st === 'v');
});

console.log('\nRohrleitungen und Kohlekraftwerk');

/** Feld am Hofteich: Landfeld mit Wasser darunter oder daneben, frei. */
function uferFeld(s, ort) {
  for (let y = 1; y < ort.def.h - 1; y++) {
    for (let x = 1; x < ort.def.w - 1; x++) {
      if (istWasser(ort.def, x, y) || !L.begehbar(s, ort.def, ort.welt, x, y)) continue;
      if (istWasser(ort.def, x, y + 1) || istWasser(ort.def, x - 1, y) || istWasser(ort.def, x + 1, y)) return [x, y];
    }
  }
  return null;
}

test('Pumpe und Wasserrad nur am Wasser', () => {
  const { s, ort } = neues();
  const u = uferFeld(s, ort);
  assert.ok(u, 'Ufer gefunden');
  assert.equal(uferPlatz({ s, ort, x: u[0], y: u[1] }, 'Die Wasserpumpe'), true);
  assert.match(String(uferPlatz({ s, ort, x: X0, y: Y0 }, 'Die Wasserpumpe')), /am Wasser/);
  assert.equal(OBJEKT_TYPEN.wasserpumpe.platz({ s, ort, x: u[0], y: u[1] }), true);
  assert.match(String(OBJEKT_TYPEN.wasserrad.platz({ s, ort, x: X0, y: Y0 })), /am Wasser/);
});
test('Wasser über Rohre zum Kraftwerk: Pumpe (Strom vom Brenner) füllt den Tank, das Kraftwerk liefert 75 MW und hält sich dann selbst', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 30);
  const p = pumpe(ort, X0 + 3, Y0 + 4);
  for (let x = X0 + 4; x <= X0 + 8; x++) rohr(ort, x, Y0 + 4);
  const kw = kraftwerk(ort, X0 + 9, Y0 + 3, 40, 0);
  mast(ort, X0 + 5, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 5, Y0));
  kabel(s, ort, kk(X0 + 5, Y0), kk(X0 + 3, Y0 + 4));
  kabel(s, ort, kk(X0 + 5, Y0), kk(X0 + 9, Y0 + 3));
  const c = rohrNetze(s, ort);
  assert.equal(c.netze.length, 1);
  assert.equal(c.netze[0].pumpen.length, 1);
  assert.equal(c.netze[0].verbraucher.length, 1);
  simuliere(s, ort, 10, { schritt: 0.1 });
  assert.equal(p.st, 'a', 'die Pumpe pumpt');
  assert.ok(kw.wa > 10, `Tank füllt sich (${kw.wa})`);
  let u = netzUebersicht(s, ort, kk(X0 + 5, Y0));
  assert.equal(u.status, 'an');
  assert.equal(u.info.kap, 105, 'Brenner 30 + Kraftwerk 75');
  // Brenner leer: das Kraftwerk versorgt die Pumpe allein
  g.ein = {};
  g.arb = null;
  simuliere(s, ort, 60, { schritt: 0.5 });
  u = netzUebersicht(s, ort, kk(X0 + 5, Y0));
  assert.equal(u.status, 'an');
  assert.equal(u.info.kap, 75);
  assert.ok(kw.wa > 1, 'Wasser reicht');
  const i = rohrInfo(s, ort, kk(X0 + 6, Y0 + 4));
  assert.equal(i.grenze, 300);
  assert.ok(i.abfluss > 0 || i.zufluss > 0);
  // Wasser ist begrenzt: ohne Pumpe läuft der Tank leer, dann liefert das Kraftwerk nichts mehr
  L.objektEntfernen(ort, X0 + 3, Y0 + 4);
  for (let x = X0 + 4; x <= X0 + 8; x++) ort.welt.objekte[kk(x, Y0 + 4)].fl = 0;
  bohrer(ort, X0 + 3, Y0 - 4);
  lager(ort, X0 + 5, Y0 - 4);
  kabel(s, ort, kk(X0 + 5, Y0), kk(X0 + 3, Y0 - 4));
  kw.wa = 0.5;
  simuliere(s, ort, 30, { schritt: 0.5 });
  assert.equal(kw.wa, 0);
  assert.equal(netzUebersicht(s, ort, kk(X0 + 5, Y0)).info.kap, 0);
  assert.equal(netzUebersicht(s, ort, kk(X0 + 5, Y0)).status, 'leer');
});
test('Kraftwerk: Wasser 45 m³/min und Kohle 300 MJ bei voller Last, bei Teillast anteilig (3 Bohrer = 15 MW)', () => {
  const { s, ort } = neues();
  const kw = kraftwerk(ort, X0, Y0, 50, 50);
  const m = kk(X0 + 5, Y0 + 1);
  mast(ort, X0 + 5, Y0 + 1);
  kabel(s, ort, kk(X0, Y0), m);
  for (const [bx, by] of [[X0 + 7, Y0 - 2], [X0 + 7, Y0 + 2], [X0 + 3, Y0 + 4]]) {
    bohrer(ort, bx, by);
    lager(ort, bx + 2, by);
    kabel(s, ort, m, kk(bx, by));
  }
  simuliere(s, ort, 60, { schritt: 0.1 });
  const u = netzUebersicht(s, ort, m);
  assert.equal(u.status, 'an');
  assert.equal(u.info.bedarf, 15);
  const last = 15 / 75;
  assert.ok(nahe(50 - kw.wa, (45 / 60) * last * 60, 0.3), `Wasser ${50 - kw.wa}`);
  const kohle = 50 - (kw.ein.kohle || 0) - (kw.arb ? 1 - (kw.f || 0) / 4 : 0);
  assert.ok(nahe(kohle, (75 * last * 60) / 300, 0.15), `Kohle ${kohle}`);
});
test('Durchflussgrenze: drei Pumpen (360 m³/min) – Mk1-Netz 300, Mk2-Netz 360; gemischt zählt das schwächste Rohr', () => {
  const messen = (mk, mischen = false) => {
    const { s, ort } = neues({ uebergang: true }); // Pumpen ohne Netz laufen in der Übergangszeit
    for (let i = 0; i < 3; i++) pumpe(ort, X0 + i * 2, Y0 + 1);
    for (let x = X0; x <= X0 + 6; x++) rohr(ort, x, Y0, mischen && x === X0 + 6 ? 1 : mk);
    for (let i = 0; i < 3; i++) kraftwerk(ort, X0 + 7 + i * 3, Y0 - 1, 0, 0);
    rohr(ort, X0 + 10, Y0 + 2, mk); // ein Rohr unter dem zweiten Kraftwerk ist ein eigenes Netz
    const c = wasserSchritt(s, ort, 1);
    return { info: rohrInfo(s, ort, kk(X0 + 1, Y0)), zu: c.netze.find((n) => n.rohre.length === 7).info.zu };
  };
  assert.ok(nahe(messen(1).zu, 300, 1e-6), 'Mk1');
  assert.ok(nahe(messen(2).zu, 360, 1e-6), 'Mk2: die Pumpen sind die Grenze');
  const g = messen(2, true);
  assert.ok(nahe(g.zu, 300, 1e-6), 'gemischt');
  assert.ok(g.info.stufenGemischt);
});
test('Rohrnetz als Behälter: voll heißt, die Pumpe steht und zieht keinen Strom', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 50);
  const p = pumpe(ort, X0 + 4, Y0);
  rohr(ort, X0 + 5, Y0);
  rohr(ort, X0 + 6, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  simuliere(s, ort, 5, { schritt: 0.1 });
  const i = rohrInfo(s, ort, kk(X0 + 5, Y0));
  assert.ok(nahe(i.fuellung, 1, 1e-6), `voll ${i.fuellung}`);
  assert.equal(p.st, 'v');
  const holz = g.ein.holz;
  simuliere(s, ort, 30, { schritt: 0.5 });
  assert.equal(netzUebersicht(s, ort, kk(X0, Y0)).info.bedarf, 0);
  assert.ok(g.ein.holz >= holz - 1, 'kaum Brennstoff ohne Last');
});

console.log('\nNachholen, Übergang, Speichern');

function linie(s, ort) {
  const g = brenner(ort, X0, Y0, 100);
  const b = bohrer(ort, X0 + 4, Y0);
  const l = lager(ort, X0 + 6, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  return { g, b, l };
}
test('Nachholen über Nacht: Strom, Brennstoff und Ausbeute wie live (±5 %)', () => {
  const a = neues();
  const la = linie(a.s, a.ort);
  simuliere(a.s, a.ort, 300, { schritt: 1 / 30 });
  const b = neues();
  const lb = linie(b.s, b.ort);
  b.s.zeit.minute = 2600 - Math.round(300 / FABRIK.sekProMinute); // so lange vor 2 Uhr
  const f = fabrikZustand(b.s);
  f.zeit.hof = f.t;
  nacht(b.s, 300 / FABRIK.sekProMinute);
  const ea = erzVon(la.b, la.l);
  const eb = erzVon(lb.b, lb.l);
  assert.ok(nahe(eb, ea, Math.max(2, ea * 0.05)), `live ${ea}, nachgeholt ${eb}`);
  const holz = (o) => (o.ein.holz || 0) + (o.arb ? 1 - (o.f || 0) / (100 / 30) : 0);
  assert.ok(nahe(holz(lb.g), holz(la.g), 0.3), `Holz live ${holz(la.g)}, nachgeholt ${holz(lb.g)}`);
});
test('ganze Nacht (tagBeenden) auf einer anderen Karte als der aktuellen: das Netz läuft mit, Überlast über Nacht steht im Bericht', () => {
  const { s, ort } = neues();
  const { b, l } = linie(s, ort);
  s.zeit.minute = 1300;
  const soll = ((360 + 1440 - 1300) * FABRIK.sekProMinute) / FABRIK.bohrerZeit;
  L.tagBeenden(s, { r: () => 0.5 });
  assert.ok(nahe(erzVon(b, l), soll, 3), `über Nacht gefördert: ${erzVon(b, l)} (soll ${soll})`);
  // Überlast über Nacht: 7 Bohrer an einem Brenner
  const t = neues();
  siebenBohrer(t.s, t.ort);
  t.s.zeit.minute = 1300;
  const bericht = L.tagBeenden(t.s, { r: () => 0.5 });
  assert.ok(bericht.meldungen.some((z) => /Sicherung ist geflogen/.test(z)), bericht.meldungen.join(' | '));
});
test('Übergang: neue Spiele und alte Stände – 7 Tage laufen Maschinen ohne Netz, danach stehen sie', () => {
  const { s, ort } = neues({ uebergang: true });
  assert.equal(s.fabrik.strom.frist, L.tagNr(s.zeit) + STROM.uebergangTage - 1);
  const b = bohrer(ort, X0, Y0);
  const l = lager(ort, X0 + 2, Y0);
  simuliere(s, ort, 10, { schritt: 0.1 });
  assert.ok(erzVon(b, l) >= 4, 'Übergangsstrom');
  assert.match(anschlussStatus(s, ort, kk(X0, Y0)).text, /Übergangsstrom/);
  for (let i = 0; i < 7; i++) { s.zeit.minute = 1300; L.tagBeenden(s, { r: () => 0.5 }); }
  assert.ok(!uebergang(s), 'nach einer Woche vorbei');
  const vor = erzVon(b, l);
  simuliere(s, ort, 20, { schritt: 0.1 });
  assert.equal(erzVon(b, l), vor, 'jetzt ohne Netz still');
});
test('alter Stand mit Fabrik ohne Netz: Übergangszeit, Starterpaket im Paketfach, Handy, Brief am nächsten Morgen', () => {
  const { s, ort } = neues({ uebergang: true });
  const b = bohrer(ort, X0, Y0);
  const l = lager(ort, X0 + 2, Y0);
  s.stats.tage = 30;
  s.zeit.tag = 20;
  s.spieler.inv[0] = { id: 'hacke', n: 1 };
  delete s.fabrik.strom;
  delete s.fabrik.paket;
  delete s.fabrik.handy;
  const s2 = L.deserialisieren(L.serialisieren(s));
  assert.ok(uebergang(s2), 'Übergangszeit beginnt beim Laden');
  assert.equal(s2.fabrik.strom.frist, L.tagNr(s2.zeit) + 6);
  assert.equal(s2.fabrik.strom.starter, 1);
  for (const w of STARTER) assert.ok(paketListe(s2).some((p) => p.id === w.id && p.n >= w.n), w.id);
  assert.ok(L.hat(s2, 'handy'), 'Handy in den Rucksack');
  const ort2 = L.ortVon(s2, 'hof');
  fabrikAenderung();
  const b2 = ort2.welt.objekte[kk(X0, Y0)];
  const l2 = ort2.welt.objekte[kk(X0 + 2, Y0)];
  simuliere(s2, ort2, 10, { schritt: 0.1 });
  assert.ok(erzVon(b2, l2) >= 4, 'die alte Fabrik läuft weiter');
  void b; void l;
  // Paket abholen: was passt, kommt in den Rucksack
  const erg = paketAbholen(s2);
  assert.ok(erg.ok);
  assert.equal(L.anzahl(s2, 'biomassebrenner'), 1);
  assert.equal(paketListe(s2).length, 0);
  // Brief kommt am nächsten Morgen
  s2.zeit.minute = 1300;
  L.tagBeenden(s2, { r: () => 0.5 });
  assert.ok(s2.post.includes('handwerk_strom_starter'), s2.post.join(','));
  assert.ok(BRIEFE.find((x) => x.id === 'handwerk_strom_starter'));
  // voller Rucksack: das Handy wartet im Paketfach (mit Brief)
  const v = neues();
  v.s.spieler.inv = v.s.spieler.inv.map(() => ({ id: 'holz', n: STAPEL_MAX }));
  v.s.stats.tage = 9;
  delete v.s.fabrik.handy;
  const v2 = L.deserialisieren(L.serialisieren(v.s));
  assert.ok(!L.hat(v2, 'handy'));
  assert.ok(paketListe(v2).some((p) => p.id === 'handy'));
  assert.equal(v2.fabrik.handyPost, 1);
});
test('neues Spiel: Handy von Anfang an im Rucksack (hinter dem Werkzeug), nur einmal', () => {
  const s = L.neuesSpiel({ name: 'H', hof: 'H', seed: 3 });
  assert.equal(s.spieler.inv.filter((x) => x?.id === 'handy').length, 1);
  assert.equal(s.spieler.inv[0].id, 'hacke', 'Werkzeug bleibt vorn');
  assert.equal(s.spieler.inv[11]?.id, 'handy', 'letzter Platz der Leiste');
  const s2 = L.deserialisieren(L.serialisieren(s));
  assert.equal(s2.spieler.inv.filter((x) => x?.id === 'handy').length, 1);
  assert.equal(paketListe(s2).length, 0);
});
test('Speichern und Laden: Kabel, Sicherung, Tankfüllung und Rohrwasser bleiben; danach läuft alles gleich weiter', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 40);
  const p = pumpe(ort, X0 + 4, Y0);
  rohr(ort, X0 + 5, Y0);
  rohr(ort, X0 + 6, Y0);
  kraftwerk(ort, X0 + 7, Y0 - 1, 10, 0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  kabel(s, ort, kk(X0, Y0), kk(X0 + 7, Y0 - 1));
  simuliere(s, ort, 4, { schritt: 0.1 });
  g.fl = 1;
  const text = L.serialisieren(s);
  const s2 = L.deserialisieren(text);
  assert.deepEqual(s2.fabrik.strom.kabel.hof, s.fabrik.strom.kabel.hof);
  const ort2 = L.ortVon(s2, 'hof');
  assert.equal(ort2.welt.objekte[kk(X0, Y0)].fl, 1);
  assert.ok(ort2.welt.objekte[kk(X0 + 7, Y0 - 1)].wa > 0);
  assert.equal(netzUebersicht(s2, ort2, kk(X0, Y0)).status, 'sicherung');
  void p;
  // beide Stände laufen gleich weiter
  delete ort.welt.objekte[kk(X0, Y0)].fl;
  delete ort2.welt.objekte[kk(X0, Y0)].fl;
  simuliere(s, ort, 20, { schritt: 0.5 });
  simuliere(s2, ort2, 20, { schritt: 0.5 });
  assert.deepEqual(JSON.parse(L.serialisieren(s2)).welt.hof.objekte, JSON.parse(L.serialisieren(s)).welt.hof.objekte);
  // beschädigte Kabelliste wird geglättet
  const kaputt = JSON.parse(text);
  kaputt.fabrik.strom.kabel = { hof: [['a'], 5, [kk(X0, Y0), kk(X0, Y0), 1], [kk(X0, Y0), kk(X0 + 4, Y0), 'x']] };
  kaputt.fabrik.strom.frist = 'morgen';
  const s3 = L.deserialisieren(JSON.stringify(kaputt));
  assert.equal(s3.fabrik.strom.kabel.hof.length, 1);
  assert.equal(s3.fabrik.strom.kabel.hof[0][2], 1);
  assert.ok(Number.isFinite(s3.fabrik.strom.frist));
  stromZustand(s3);
});
test('Aufheben: Mast und Generator geben ihre Kabel zurück, der Generator auch seinen Brennstoff', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 12);
  mast(ort, X0 + 5, Y0);
  bohrer(ort, X0 + 7, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 5, Y0));
  kabel(s, ort, kk(X0 + 5, Y0), kk(X0 + 7, Y0));
  s.spieler.inv = Array(24).fill(null);
  const erg = L.neuesErgebnis();
  OBJEKT_TYPEN.strommast.spitzhacke({ s, ort, x: X0 + 5, y: Y0, o: ort.welt.objekte[kk(X0 + 5, Y0)], erg });
  assert.equal(ort.welt.objekte[kk(X0 + 5, Y0)], undefined);
  assert.equal(L.anzahl(s, 'strommast'), 1);
  assert.ok(L.anzahl(s, 'stromkabel') >= 5, 'Kabel zurück');
  assert.equal(s.fabrik.strom.kabel.hof.length, 0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 7, Y0));
  const n = L.anzahl(s, 'stromkabel');
  const erg2 = L.neuesErgebnis();
  fabrikAufheben({ s, ort, x: X0, y: Y0, o: g, erg: erg2 });
  assert.equal(L.anzahl(s, 'biomassebrenner'), 1);
  assert.equal(L.anzahl(s, 'holz'), 12);
  assert.ok(L.anzahl(s, 'stromkabel') > n);
  assert.equal(s.fabrik.strom.kabel.hof.length, 0);
});

console.log('\nBänder Mk2 und Mk3');

test('Mk2 (3 Felder/s) und Mk3 (5 Felder/s): Tempo live, Nachholen in großen Schritten stimmt (±5 %), Aufheben gibt die Stufe zurück', () => {
  for (const mk of [2, 3]) {
    const zaehlen = (schritt) => {
      const { s, ort } = neues();
      const quelle = lager(ort, X0, Y0);
      quelle.inv[0] = { id: 'kohle', n: 900 };
      for (let x = X0 + 2; x < X0 + 22; x++) setze(ort, x, Y0, { t: 'foerderband', r: RECHTS, w: [], mk });
      const ziel = lager(ort, X0 + 22, Y0);
      simuliere(s, ort, 30, { schritt });
      return lagerN(ziel, 'kohle');
    };
    const live = zaehlen(1 / 60);
    const nach = zaehlen(FABRIK.nachholSchritt);
    assert.ok(live > 30 * 7, `Mk${mk} live ${live}`);
    assert.ok(nahe(nach, live, live * 0.05), `Mk${mk}: live ${live}, nachgeholt ${nach}`);
  }
  // Ware wandert 5 Felder/s
  const { s, ort } = neues();
  const reihe = [];
  for (let x = X0; x < X0 + 12; x++) reihe.push(setze(ort, x, Y0, { t: 'foerderband', r: RECHTS, w: [], mk: 3 }));
  reihe[0].w.push({ id: 'kohle', p: 0 });
  simuliere(s, ort, 1.1, { schritt: 1 / 60 });
  assert.equal(reihe.findIndex((b) => b.w.length), 5);
  const erg = L.neuesErgebnis();
  s.spieler.inv = Array(24).fill(null);
  fabrikAufheben({ s, ort, x: X0, y: Y0, o: reihe[0], erg });
  assert.equal(L.anzahl(s, 'foerderband_mk3'), 1);
  assert.ok(warenSumme(ort));
});

console.log('\nHandy');

test('Kaufen: Gold in Millionen, Menge, nur Geliefertes wird bezahlt (voller Rucksack, zu wenig Gold)', () => {
  const { s } = neues();
  s.spieler.gold = 10_000_000;
  let erg = handyKaufen(s, 'strommast', 10);
  assert.ok(erg.ok);
  assert.equal(L.anzahl(s, 'strommast'), 10);
  assert.equal(s.spieler.gold, 10_000_000 - 10 * HANDY_PREISE.strommast);
  // zu wenig Gold für alle: nur so viele, wie bezahlbar
  erg = handyKaufen(s, 'erzbohrer', 10);
  assert.equal(erg.geliefert, 2);
  assert.equal(s.spieler.gold, 10_000_000 - 10 * HANDY_PREISE.strommast - 2 * HANDY_PREISE.erzbohrer);
  assert.match(erg.text, /2 von 10/);
  // Rucksack fast voll: ein freies Fach → höchstens STAPEL_MAX Stück
  s.spieler.gold = 1e12;
  s.spieler.inv = s.spieler.inv.map(() => ({ id: 'holz', n: STAPEL_MAX }));
  s.spieler.inv[3] = null;
  const gold = s.spieler.gold;
  erg = handyKaufen(s, 'stromkabel', STAPEL_MAX + 500);
  assert.equal(erg.geliefert, STAPEL_MAX);
  assert.equal(gold - s.spieler.gold, STAPEL_MAX * HANDY_PREISE.stromkabel, 'nur Geliefertes bezahlt');
  assert.equal(hoechstens(s, 'stromkabel'), 0);
  erg = handyKaufen(s, 'stromkabel', 1);
  assert.match(erg.grund, /voll/);
  assert.equal(gold - s.spieler.gold, STAPEL_MAX * HANDY_PREISE.stromkabel, 'voll: nichts bezahlt');
  s.spieler.gold = 5;
  assert.match(handyKaufen(s, 'foerderband', 1).grund, /Zu wenig Gold/);
  assert.match(handyKaufen(s, 'hacke', 1).grund, /gibt es im Handy nicht/);
});
test('Kaufen geht jederzeit: nachts, in der Mine, unterwegs (nur Gold und Rucksack zählen)', () => {
  const { s } = neues();
  s.spieler.gold = 3_000_000;
  s.zeit.minute = 2550;
  s.spieler.karte = 'mine3';
  assert.ok(handyKaufen(s, 'schmelzer', 1).ok);
  assert.equal(hoechstens(s, 'schmelzer'), 0, '1 Mio Rest reicht nicht');
});
test('Vorkommen bestellen (Sorte und Reinheit), Preise 25/50/100 Mio, aufstellen ergibt das passende Vorkommen', () => {
  const { s, ort } = neues();
  s.spieler.gold = 175_000_000;
  for (const [sorte, rein] of [['gold', 'rein'], ['kupfer', 'normal'], ['kohle', 'unrein']]) assert.ok(vorkommenKaufen(s, sorte, rein).ok, `${sorte} ${rein}`);
  assert.equal(s.spieler.gold, 0);
  assert.equal(VORKOMMEN_PREIS.normal, 50_000_000);
  assert.equal(L.anzahl(s, 'vorkommen_gold_rein'), 1);
  assert.equal(L.anzahl(s, 'vorkommen_kupfer_normal'), 1);
  assert.equal(L.anzahl(s, 'vorkommen_kohle_unrein'), 1);
  assert.match(vorkommenKaufen(s, 'eisen', 'normal').grund, /Zu wenig Gold/);
  assert.match(vorkommenKaufen(s, 'diamant', 'rein').grund, /gibt es nicht/);
  const idx = s.spieler.inv.findIndex((x) => x?.id === 'vorkommen_gold_rein');
  const r = L.aufstellen(s, ort, X0, Y0, idx);
  assert.ok(r.ok, r.grund);
  const o = ort.welt.objekte[kk(X0, Y0)];
  assert.deepEqual([o.t, o.erz, o.rein, o.gk], ['vorkommen', 'gold', 2, 1]);
  assert.equal(ort.welt.objekte[kk(X0 + 1, Y0 + 1)].t, 'teil', '2×2');
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`);
process.exit(fehlgeschlagen ? 1 : 0);
