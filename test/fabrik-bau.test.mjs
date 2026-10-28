// Fabrik Stufe 3 (Bereich handwerk): Maschinenbauer (Zutaten aus Rucksack und Lager, Mengenwahl, fehlende Zutaten, voller Rucksack,
// Freischaltung nach Bergbau-Stufe), alle neuen Rezepte (Verhältnisse, Zeiten, Preise), Mischer mit Wasser aus Rohren und Strom,
// Fertiger mit vier Eingängen, Nachholen = live, Aufheben ohne Verlust, Preisverhältnis Selbstbau gegen Handy, Speichern und Laden,
// alte Stände, Bauplan-Übersicht.
// Aufruf: node test/fabrik-bau.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/bereiche/inhalt.js';
import { ITEMS, REZEPTE, OBJEKT_TYPEN, STAPEL_MAX } from '../src/daten.js';
import * as L from '../src/logik.js';
import { MASCHINEN, SCHMELZ_REZEPTE, KONSTRUKTEUR_REZEPTE, ASSEMBLER_REZEPTE, FABRIK } from '../src/bereiche/handwerk/fabrik-daten.js';
import { simuliere, fabrikAenderung, warenSumme } from '../src/bereiche/handwerk/fabrik-sim.js';
import { maschinenInfo } from '../src/bereiche/handwerk/fabrik-info.js';
import { fabrikAufheben, rezeptWaehlen, bauVorschau, platzPruefen } from '../src/bereiche/handwerk/fabrik-objekte.js';
import { fabrikZustand, nacht } from '../src/bereiche/handwerk/fabrik-system.js';
import { HANDY_PREISE, HANDY_GRUPPEN, STROM, anschluesseVon } from '../src/bereiche/handwerk/fabrik-strom-daten.js';
import { rohrMaske } from '../src/bereiche/handwerk/fabrik-rohre.js';
import { handyKatalog, handyKaufen } from '../src/bereiche/handwerk/fabrik-handy.js';
import {
  PREISE_TEILE, FREISCHALT_TEILE, SCHMELZ_NEU, KONSTRUKTEUR_NEU, ASSEMBLER_NEU, MISCHER_REZEPTE, FERTIGER_REZEPTE, MISCHER,
} from '../src/bereiche/handwerk/fabrik-teile-daten.js';
import {
  BAU, BAUPLAENE, HANDY_PREISE_NEU, planWert, selbstbauVerhaeltnis, rohstoffWert, materialien, herstellerVon, maschinenRezepte,
} from '../src/bereiche/handwerk/fabrik-bau-daten.js';
import {
  bauen, quellen, behaelterInReichweite, planStatus, maxBauten, planFrei, bauplanListe, rezeptListe, rezeptRaten, bauAktivSetzen, bauAktiv,
} from '../src/bereiche/handwerk/fabrik-bau.js';
import { mischerNetze, rezeptZeilen } from '../src/bereiche/handwerk/fabrik-bau-objekte.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.stack?.split('\n').slice(0, 5).join('\n      ') ?? e.message}`);
  }
}

// ─── Hilfen ─────────────────────────────────────────────────────────────────

const RECHTS = 1;
const X0 = 20;
const Y0 = 20;

/** Neues Spiel mit leerer Hofkarte; `uebergang` lässt Maschinen ohne Netz laufen (Übergangsstrom), sonst steht alles ohne Kabel. */
function neues({ seed = 31, uebergang = true, stufe = 10 } = {}) {
  const s = L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
  s.spieler.inv = Array(24).fill(null);
  s.spieler.xp.bergbau = stufe >= 10 ? 1e9 : 0;
  const ort = L.ortVon(s, 'hof');
  ort.welt.objekte = {};
  ort.welt.felder = {};
  ort.welt.belag = {};
  if (!uebergang) s.fabrik.strom.frist = 0;
  fabrikZustand(s).zeit.hof = 0;
  fabrikAenderung();
  return { s, ort };
}
const setze = (ort, x, y, o) => { L.objektSetzen(ort, x, y, o); fabrikAenderung(); return o; };
const maschine = (ort, x, y, t, extra = {}) => setze(ort, x, y, {
  t, r: RECHTS, ...(t === 'lager' ? { inv: Array(48).fill(null) } : { ein: {}, aus: {}, f: 0 }), ...(MASCHINEN[t]?.waehlbar ? { rez: MASCHINEN[t].standard } : {}), ...extra,
});
const bauer = (ort, x, y) => setze(ort, x, y, { t: 'maschinenbauer', r: RECHTS });
const lager = (ort, x, y) => setze(ort, x, y, { t: 'lager', r: RECHTS, inv: Array(48).fill(null) });
const truhe = (ort, x, y) => setze(ort, x, y, { t: 'truhe', inv: Array(24).fill(null) });
const band = (ort, x, y, r = RECHTS) => setze(ort, x, y, { t: 'foerderband', r, w: [] });
const lagerN = (o, id) => o.inv.reduce((n, f) => n + (f && f.id === id ? f.n : 0), 0);
const gib = (s, id, n) => { const rest = L.hinzufuegen(s, { id, n }); assert.equal(rest, 0, `Platz für ${n}× ${id}`); };
const legeIn = (o, id, n) => { const rest = L.inBehaelter(o.inv, { id, n }); assert.equal(rest, 0); };
const kk = (x, y) => L.k(x, y);
const nahe = (a, b, tol) => Math.abs(a - b) <= tol;
/** Gesamtbestand eines Gegenstands: Rucksack und alle Behälter der Karte. */
function bestand(s, ort, id) {
  let n = L.anzahl(s, id);
  for (const o of Object.values(ort.welt.objekte)) if (Array.isArray(o.inv)) n += lagerN(o, id);
  return n;
}
const ERSTE = ['kupferdraht', 'eisenplatte', 'schraube', 'zahnrad'];

console.log('\nDaten, Gegenstände, Rezepte');

test('alle neuen Waren: Gegenstand mit Kategorie, Preis, Bild-Art, Text, sorte; verkaufbar; Wasser ist keine Ware', () => {
  for (const [id, preis] of Object.entries(PREISE_TEILE)) {
    const it = ITEMS[id];
    assert.ok(it, id);
    assert.equal(it.preis, preis, id);
    assert.ok(it.kat && it.bild?.art && it.text && it.sorte, `${id}: kat, bild, text, sorte`);
    assert.ok(L.verkaufbar({ id, n: 1 }), `${id} verkaufbar`);
  }
  assert.equal(ITEMS.wasser.verkaufbar, false);
  assert.ok(ITEMS.wasser.fluessig);
  for (const id of ['maschinenbauer', 'mischer', 'fertiger']) {
    assert.ok(ITEMS[id].aufstellbar && OBJEKT_TYPEN[id], id);
    assert.ok(HANDY_PREISE[id] >= 1_000_000, `${id} im Millionenbereich`);
  }
  assert.deepEqual(OBJEKT_TYPEN.maschinenbauer.flaeche, [3, 3]);
  assert.deepEqual(OBJEKT_TYPEN.mischer.flaeche, [2, 2]);
  assert.deepEqual(OBJEKT_TYPEN.fertiger.flaeche, [3, 3]);
});
test('Rezepte der Stufe 1 bleiben unverändert; die Maschinen haben die neuen dazu', () => {
  assert.deepEqual(Object.keys(SCHMELZ_REZEPTE), ['kupferbarren', 'eisenbarren', 'goldbarren']);
  assert.equal(Object.keys(KONSTRUKTEUR_REZEPTE).length, 4);
  assert.equal(Object.keys(ASSEMBLER_REZEPTE).length, 2);
  assert.ok(MASCHINEN.schmelzer.rezepte.stahlbarren && MASCHINEN.schmelzer.rezepte.kupferbarren);
  for (const id of Object.keys(KONSTRUKTEUR_NEU)) assert.ok(MASCHINEN.konstrukteur.rezepte[id], id);
  for (const id of Object.keys(ASSEMBLER_NEU)) assert.ok(MASCHINEN.assembler.rezepte[id], id);
  assert.deepEqual(Object.keys(MASCHINEN.mischer.rezepte), ['beton', 'betonplatte']);
  assert.deepEqual(Object.keys(MASCHINEN.fertiger.rezepte), ['computer', 'antriebssystem']);
});
test('jedes neue Rezept: Zutaten und Ergebnis sind Gegenstände, der Ausgang lohnt (mehr Wert als die Zutaten), Eingang nach Maschine passt', () => {
  const alle = [
    ...Object.entries(SCHMELZ_NEU).map(([id, r]) => ['schmelzer', id, r]),
    ...Object.entries(KONSTRUKTEUR_NEU).map(([id, r]) => ['konstrukteur', id, r]),
    ...Object.entries(ASSEMBLER_NEU).map(([id, r]) => ['assembler', id, r]),
    ...Object.entries(MISCHER_REZEPTE).map(([id, r]) => ['mischer', id, r]),
    ...Object.entries(FERTIGER_REZEPTE).map(([id, r]) => ['fertiger', id, r]),
  ];
  assert.equal(alle.length, 1 + 6 + 6 + 2 + 2);
  for (const [m, id, r] of alle) {
    for (const z of Object.keys(r.ein)) assert.ok(ITEMS[z], `${id}: Zutat ${z}`);
    for (const z of Object.keys(r.aus)) assert.ok(ITEMS[z], `${id}: Ergebnis ${z}`);
    assert.ok(r.zeit > 0 && r.name);
    const wert = (liste) => Object.entries(liste).reduce((n, [z, k]) => n + k * (ITEMS[z].preis || 0), 0);
    assert.ok(wert(r.aus) > wert(r.ein), `${id}: Ausgang ${wert(r.aus)} > Eingang ${wert(r.ein)}`);
    if (m === 'konstrukteur') assert.equal(Object.keys(r.ein).length, 1, `${id}: ein Eingang`);
    if (m === 'schmelzer') assert.ok(r.ein.kohle >= 1);
  }
  assert.equal(Object.keys(FERTIGER_REZEPTE.computer.ein).length, 4);
  assert.equal(Object.keys(FERTIGER_REZEPTE.antriebssystem.ein).length, 4);
  assert.deepEqual(Object.keys(FERTIGER_REZEPTE.computer.ein).sort(), ['kabelrolle', 'kuehlkoerper', 'motor', 'platine']);
  assert.ok(MISCHER_REZEPTE.beton.ein.wasser > 0 && MISCHER_REZEPTE.beton.ein.stein > 0);
});
test('Handarbeit: einfache Zwischenprodukte ja, Motor, Computer, Antriebssystem, Beton und Stahlbarren nur aus Maschinen', () => {
  const r = (id) => REZEPTE.find((x) => x.id === id);
  for (const [id, n] of Object.entries(FREISCHALT_TEILE)) {
    assert.deepEqual(r(id).stufe, ['bergbau', n], id);
    const m = KONSTRUKTEUR_NEU[id] ?? ASSEMBLER_NEU[id];
    assert.deepEqual(r(id).zutaten, m.ein, `${id}: dasselbe Verhältnis wie in der Maschine`);
    assert.equal(r(id).menge, m.aus[id]);
  }
  for (const id of ['motor', 'computer', 'antriebssystem', 'beton', 'betonplatte', 'stahlbarren', 'wasser']) assert.equal(r(id), undefined, `${id} nicht von Hand`);
  // bis zum Maschinenteil (Stufe 1) wie bisher
  for (const id of [...ERSTE, 'maschinenteil']) assert.ok(r(id), id);
  assert.ok(FREISCHALT_TEILE.nagel < FREISCHALT_TEILE.rahmen, 'gestaffelt');
});
test('Maschinenbauer: von Hand basteln ab Bergbau 4 (auch ohne Handy), sonst nur im Handy', () => {
  const rez = REZEPTE.find((x) => x.id === 'maschinenbauer');
  assert.deepEqual(rez.stufe, ['bergbau', BAU.basteln]);
  assert.equal(BAU.basteln, 4);
  for (const z of Object.keys(rez.zutaten)) assert.ok(ERSTE.includes(z) || z === 'holz', `Zutat ${z} ist von Hand herstellbar`);
  const { s } = neues({ stufe: 0 });
  assert.ok(!L.rezeptFrei(s, rez));
  s.spieler.xp.bergbau = 1e9;
  for (const [z, n] of Object.entries(rez.zutaten)) gib(s, z, n);
  assert.ok(L.basteln(s, rez).ok);
  assert.equal(L.anzahl(s, 'maschinenbauer'), 1);
  for (const id of ['mischer', 'fertiger']) assert.equal(REZEPTE.find((x) => x.id === id), undefined, `${id}: im Handy oder am Maschinenbauer`);
});

console.log('\nBaupläne: alles, was das Handy verkauft');

test('jedes Fabrikteil im Handy hat einen Bauplan (und umgekehrt: jeder Plan hat einen Handy-Preis)', () => {
  const imHandy = HANDY_GRUPPEN.flatMap((g) => g.ids);
  for (const id of imHandy) assert.ok(BAUPLAENE[id], `Bauplan für ${id}`);
  for (const id of Object.keys(BAUPLAENE)) { assert.ok(HANDY_PREISE[id] > 0, id); assert.ok(ITEMS[id], id); }
  for (const id of ['foerderband', 'foerderband_mk2', 'foerderband_mk3', 'splitter', 'zusammenfuehrer', 'lager', 'erzbohrer', 'schmelzer', 'konstrukteur', 'assembler',
    'biomassebrenner', 'wasserrad', 'kohlekraftwerk', 'strommast', 'stromkabel', 'wasserpumpe', 'rohrleitung', 'rohrleitung_mk2', 'mischer', 'fertiger', 'maschinenbauer']) {
    assert.ok(BAUPLAENE[id], id);
  }
  const ids = handyKatalog().flatMap((g) => g.eintraege.map((e) => e.id));
  for (const id of ['maschinenbauer', 'mischer', 'fertiger']) assert.ok(ids.includes(id), `${id} im Katalog`);
  for (const [id, p] of Object.entries(HANDY_PREISE_NEU)) assert.equal(HANDY_PREISE[id], p);
});
test('Zutaten der Pläne sind herstellbar: Grundstoff, Handarbeit ab der Plan-Stufe oder Maschine; keine Kreise', () => {
  const grund = new Set(['holz', 'stein', 'kohle', 'eisenbarren', 'kupferbarren']);
  for (const [id, p] of Object.entries(BAUPLAENE)) {
    assert.ok(p.menge >= 1 && p.stufe >= BAU.basteln, `${id}: ab Bergbau ${BAU.basteln}`);
    for (const z of Object.keys(p.zutaten)) {
      assert.ok(ITEMS[z], `${id}: ${z}`);
      assert.ok(!(z in BAUPLAENE), `${id}: ${z} ist selbst ein Bauteil des Plans`);
      if (grund.has(z)) continue;
      const hand = REZEPTE.find((x) => x.id === z);
      const maschinell = !!herstellerVon(z);
      assert.ok(hand || maschinell, `${id}: ${z} ist herstellbar`);
    }
    // Teile, die nur Handarbeit sind, müssen zur Plan-Stufe schon freigeschaltet sein
    for (const z of Object.keys(p.zutaten)) {
      const hand = REZEPTE.find((x) => x.id === z);
      if (hand && !herstellerVon(z)) assert.ok(hand.stufe[1] <= p.stufe, `${id}: ${z} von Hand erst ab ${hand.stufe[1]}`);
    }
  }
  // Maschinen, die die Zutaten herstellen, sind selbst baubar: Konstrukteur (5) vor Assembler (7), Motor erst nach dem Assembler
  assert.ok(BAUPLAENE.konstrukteur.stufe < BAUPLAENE.assembler.stufe);
  assert.ok(!('motor' in BAUPLAENE.assembler.zutaten), 'der Assembler braucht keinen Motor');
  assert.ok('motor' in BAUPLAENE.fertiger.zutaten && BAUPLAENE.fertiger.stufe >= BAUPLAENE.assembler.stufe);
  assert.ok('betonplatte' in BAUPLAENE.kohlekraftwerk.zutaten && BAUPLAENE.kohlekraftwerk.stufe >= BAUPLAENE.mischer.stufe);
});
test('Freischaltung gestaffelt nach Bergbau-Stufe (4 bis 8)', () => {
  const stufen = new Set(Object.values(BAUPLAENE).map((p) => p.stufe));
  assert.deepEqual([...stufen].sort(), [4, 5, 6, 7, 8]);
  const { s } = neues({ stufe: 0 });
  assert.ok(!planFrei(s, 'foerderband'));
  s.spieler.xp.bergbau = 1e9;
  assert.ok(planFrei(s, 'fertiger'));
});

console.log('\nSelbstbau gegen Kaufen');

test('Selbstbau ist klar günstiger als das Handy: Rohstoffwert aller Zutaten gegen den Handy-Preis (höchstens 1 %)', () => {
  const zeilen = [];
  for (const id of Object.keys(BAUPLAENE)) {
    const v = selbstbauVerhaeltnis(id);
    zeilen.push(`${id} ${Math.round(planWert(id))} G : ${HANDY_PREISE[id]} G = 1:${Math.round(1 / v)}`);
    assert.ok(v < 0.01, `${id}: ${v}`);
    assert.ok(planWert(id) > 0, id);
  }
  console.log(`    ${zeilen.length} Pläne, Verhältnis zwischen 1:${Math.round(1 / Math.max(...Object.keys(BAUPLAENE).map(selbstbauVerhaeltnis)))} und 1:${Math.round(1 / Math.min(...Object.keys(BAUPLAENE).map(selbstbauVerhaeltnis)))}`);
  // Rohstoffwert: Barren, Stein, Kohle zum Verkaufspreis, Wasser umsonst; Stückzahlen je Durchgang zählen
  assert.equal(rohstoffWert('eisenplatte'), ITEMS.eisenbarren.preis / 2);
  assert.equal(rohstoffWert('stahlbarren'), (3 * ITEMS.eisenbarren.preis + ITEMS.kohle.preis) / 2);
  assert.equal(rohstoffWert('wasser'), 0);
  assert.equal(rohstoffWert('nagel'), ITEMS.eisenbarren.preis / 8);
  assert.ok(rohstoffWert('computer') < PREISE_TEILE.computer, 'ein Computer bringt mehr, als seine Rohstoffe kosten');
  assert.ok(rohstoffWert('antriebssystem') < PREISE_TEILE.antriebssystem);
});
test('Die Preise der Handy-Teile aus Stufe 2 sind unverändert (nur die neuen Maschinen kommen dazu)', () => {
  const alt = { foerderband: 100_000, foerderband_mk2: 250_000, foerderband_mk3: 600_000, splitter: 300_000, zusammenfuehrer: 300_000, lager: 800_000, erzbohrer: 2_500_000,
    schmelzer: 2_000_000, konstrukteur: 3_000_000, assembler: 8_000_000, stromkabel: 100_000, strommast: 500_000, wasserrad: 1_500_000, biomassebrenner: 4_000_000,
    kohlekraftwerk: 25_000_000, wasserpumpe: 3_000_000, rohrleitung: 150_000, rohrleitung_mk2: 400_000 };
  for (const [id, p] of Object.entries(alt)) assert.equal(HANDY_PREISE[id], p, id);
});

console.log('\nMaschinenbauer: Bauen');

test('Bauen aus dem Rucksack: Zutaten weg, Teile im Rucksack, Menge je Bau (Förderband ×4)', () => {
  const { s, ort } = neues();
  bauer(ort, X0, Y0);
  gib(s, 'eisenplatte', 5); gib(s, 'schraube', 9);
  const erg = bauen(s, ort, kk(X0, Y0), 'foerderband', 1);
  assert.ok(erg.ok, erg.grund);
  assert.equal(erg.gebaut, 4);
  assert.equal(L.anzahl(s, 'foerderband'), 4);
  assert.equal(L.anzahl(s, 'eisenplatte'), 3);
  assert.equal(L.anzahl(s, 'schraube'), 5);
  assert.match(erg.text, /4× Förderband gebaut/);
});
test('Mengenwahl ×5, ×10 und Max; mehr als die Zutaten hergeben baut so viel wie möglich und sagt es', () => {
  const { s, ort } = neues();
  bauer(ort, X0, Y0);
  gib(s, 'eisenplatte', 40); gib(s, 'schraube', 100);
  assert.equal(bauen(s, ort, kk(X0, Y0), 'foerderband', 5).gebaut, 20);
  assert.equal(L.anzahl(s, 'eisenplatte'), 30);
  const zehn = bauen(s, ort, kk(X0, Y0), 'foerderband', 10);
  assert.equal(zehn.gebaut, 40);
  assert.equal(L.anzahl(s, 'eisenplatte'), 10);
  const max = bauen(s, ort, kk(X0, Y0), 'foerderband', 'max');
  assert.equal(max.bauten, 5, 'noch 10 Platten = 5 Bauten');
  assert.equal(L.anzahl(s, 'foerderband'), 80);
  const mehr = bauen(s, ort, kk(X0, Y0), 'foerderband', 1);
  assert.ok(mehr.grund);
  gib(s, 'eisenplatte', 4); gib(s, 'schraube', 8);
  const teil = bauen(s, ort, kk(X0, Y0), 'foerderband', 10);
  assert.equal(teil.bauten, 2);
  assert.match(teil.text, /mehr ging nicht \(2 von 10 Bauten\)/);
});
test('fehlende Zutaten: nichts wird genommen, die Meldung nennt, was fehlt', () => {
  const { s, ort } = neues();
  bauer(ort, X0, Y0);
  gib(s, 'eisenplatte', 3); gib(s, 'schraube', 2);
  const erg = bauen(s, ort, kk(X0, Y0), 'foerderband', 1);
  assert.ok(!erg.ok);
  assert.match(erg.grund, /fehlt/);
  assert.match(erg.grund, /2× Schraube/);
  assert.equal(L.anzahl(s, 'eisenplatte'), 3);
  assert.equal(L.anzahl(s, 'schraube'), 2);
  const st = planStatus(s, quellen(s, ort, kk(X0, Y0)), 'foerderband');
  assert.deepEqual(st.zutaten.map((z) => [z.id, z.hat, z.braucht, z.fehlt]), [['eisenplatte', 3, 2, 0], ['schraube', 2, 4, 2]]);
  assert.equal(st.moeglich, 0);
});
test('Zutaten aus Lager und Truhe in Reichweite (3 Felder), nicht von weiter weg; Rucksack zuerst', () => {
  const { s, ort } = neues();
  bauer(ort, X0, Y0); // belegt X0..X0+2, Y0..Y0+2
  const nah = lager(ort, X0 + 3, Y0); // direkt daneben (Lücke 0)
  const mitte = truhe(ort, X0 + 3 + 3, Y0 + 1); // Lücke 3: gerade noch
  const fern = truhe(ort, X0 + 3 + 4, Y0 + 1); // Lücke 4: zu weit
  legeIn(nah, 'eisenplatte', 3); legeIn(mitte, 'eisenplatte', 3); legeIn(fern, 'eisenplatte', 100);
  legeIn(nah, 'schraube', 5); legeIn(mitte, 'schraube', 8); legeIn(fern, 'schraube', 100);
  gib(s, 'eisenplatte', 2); gib(s, 'schraube', 2);
  const liste = behaelterInReichweite(ort, kk(X0, Y0));
  assert.deepEqual(liste.map((b) => [b.name, b.abstand]), [['Lager', 0], ['Truhe', 3]]);
  const erg = bauen(s, ort, kk(X0, Y0), 'foerderband', 'max');
  // 8 Platten und 15 Schrauben in Reichweite: Platten reichen für 4, Schrauben für 3 Bauten
  assert.equal(erg.bauten, 3);
  assert.equal(L.anzahl(s, 'eisenplatte'), 0, 'Rucksack zuerst leer');
  assert.equal(lagerN(nah, 'eisenplatte') + lagerN(mitte, 'eisenplatte'), 8 - 6);
  assert.equal(lagerN(fern, 'eisenplatte'), 100, 'die ferne Truhe bleibt unberührt');
  assert.equal(lagerN(fern, 'schraube'), 100);
});
test('voller Rucksack: das Ergebnis geht ins Lager in Reichweite; ohne Platz nirgends: nichts wird gebaut, nichts geht verloren', () => {
  const { s, ort } = neues();
  bauer(ort, X0, Y0);
  const l = lager(ort, X0 + 3, Y0);
  legeIn(l, 'eisenplatte', 4); legeIn(l, 'schraube', 8);
  s.spieler.inv = s.spieler.inv.map(() => ({ id: 'holz', n: STAPEL_MAX })); // Rucksack voll
  const erg = bauen(s, ort, kk(X0, Y0), 'foerderband', 2);
  assert.ok(erg.ok, erg.grund);
  assert.equal(erg.imRucksack, 0);
  assert.equal(erg.imLager, 8);
  assert.equal(lagerN(l, 'foerderband'), 8);
  assert.equal(lagerN(l, 'eisenplatte'), 0);
  assert.match(erg.text, /ins Lager gelegt/);
  // jetzt alles voll: Rucksack und Lager
  l.inv = Array(48).fill(null).map(() => ({ id: 'holz', n: STAPEL_MAX }));
  l.inv[0] = { id: 'eisenplatte', n: 3 }; l.inv[1] = { id: 'schraube', n: 5 }; // nach einem Bau bleibt je ein Rest: kein Fach wird frei
  const vor = bestand(s, ort, 'eisenplatte') + bestand(s, ort, 'schraube');
  const kein = bauen(s, ort, kk(X0, Y0), 'foerderband', 1);
  assert.ok(!kein.ok && /Platz/.test(kein.grund), kein.grund);
  assert.equal(bestand(s, ort, 'eisenplatte') + bestand(s, ort, 'schraube'), vor, 'nichts verbraucht');
});
test('teils Rucksack, teils Lager: nichts geht verloren (Summe aller Behälter stimmt)', () => {
  const { s, ort } = neues();
  bauer(ort, X0, Y0);
  const l = lager(ort, X0 + 3, Y0);
  legeIn(l, 'eisenplatte', 20); legeIn(l, 'schraube', 40);
  // Rucksack: ein einziges freies Fach mit Platz für 5 Stück Förderband
  s.spieler.inv = s.spieler.inv.map((_, i) => (i === 0 ? { id: 'foerderband', n: STAPEL_MAX - 5 } : { id: 'holz', n: STAPEL_MAX }));
  const erg = bauen(s, ort, kk(X0, Y0), 'foerderband', 3); // 12 Stück: 5 in den Rucksack, 7 ins Lager
  assert.ok(erg.ok, erg.grund);
  assert.equal(erg.imRucksack, 5);
  assert.equal(erg.imLager, 7);
  assert.equal(bestand(s, ort, 'foerderband'), STAPEL_MAX - 5 + 12);
  assert.equal(bestand(s, ort, 'eisenplatte'), 20 - 6);
  assert.equal(bestand(s, ort, 'schraube'), 40 - 12);
});
test('gesperrt nach Bergbau-Stufe: kein Bau, Hinweis auf die Stufe', () => {
  const { s, ort } = neues({ stufe: 0 });
  bauer(ort, X0, Y0);
  gib(s, 'eisenplatte', 5); gib(s, 'schraube', 9);
  const erg = bauen(s, ort, kk(X0, Y0), 'foerderband', 1);
  assert.ok(!erg.ok);
  assert.match(erg.grund, /Bergbau Stufe 4/);
  assert.equal(L.anzahl(s, 'eisenplatte'), 5);
  assert.equal(maxBauten(s, quellen(s, ort, kk(X0, Y0)), 'foerderband'), 0);
});
test('jeder Plan baut sein Teil (alle 21): mit den Zutaten im Rucksack, Stückzahl stimmt', () => {
  for (const [id, p] of Object.entries(BAUPLAENE)) {
    const { s, ort } = neues();
    bauer(ort, X0, Y0);
    s.spieler.inv = Array(48).fill(null);
    for (const [z, n] of Object.entries(p.zutaten)) gib(s, z, n);
    const erg = bauen(s, ort, kk(X0, Y0), id, 1);
    assert.ok(erg.ok, `${id}: ${erg.grund}`);
    assert.equal(L.anzahl(s, id), p.menge, id);
    for (const z of Object.keys(p.zutaten)) assert.equal(L.anzahl(s, z), 0, `${id}: ${z} verbraucht`);
  }
});
test('Animation: nach einem Bau arbeitet der Maschinenbauer eine Weile (nur Darstellung, nicht im Spielstand)', () => {
  const { s, ort } = neues();
  const b = bauer(ort, X0, Y0);
  assert.equal(bauAktiv(b, 5), null);
  bauAktivSetzen(b, 5 + BAU.animation);
  assert.ok(bauAktiv(b, 5) === 0 || nahe(bauAktiv(b, 5), 0, 1e-9));
  assert.ok(bauAktiv(b, 6) > 0 && bauAktiv(b, 6) < 1);
  assert.equal(bauAktiv(b, 5 + BAU.animation + 0.1), null);
  assert.ok(!JSON.stringify(L.serialisieren(s)).includes('"bz"'));
});

console.log('\nAufstellen und Aufheben');

test('Maschinenbauer, Mischer, Fertiger aufstellen (große Teile vor der Spielerin, Vorschau), nicht im Wohnhaus', () => {
  const { s, ort } = neues();
  for (const id of ['maschinenbauer', 'mischer', 'fertiger']) {
    L.hinzufuegen(s, { id, n: 1 });
    const idx = s.spieler.inv.findIndex((z) => z?.id === id);
    const v = bauVorschau(s, ort, X0 + 8, Y0 + 8, 'rechts', s.spieler.inv[idx]);
    assert.ok(v && v.ok, `${id}: Vorschau grün`);
    assert.deepEqual([v.b, v.h], OBJEKT_TYPEN[id].flaeche);
    const erg = L.aufstellen(s, ort, v.x, v.y, idx);
    assert.ok(erg.ok, `${id}: ${erg.grund}`);
    assert.equal(ort.welt.objekte[kk(v.x, v.y)].t, id);
    ort.welt.objekte = {};
  }
  const haus = { s, ort: { def: { id: 'x', zuhause: true }, welt: ort.welt }, x: 3, y: 3 };
  assert.match(String(platzPruefen(haus, 3, 3, false)), /Haus/);
});
test('Aufheben ohne Verlust: Maschinenbauer kommt zurück; Mischer mit Wasser und Inhalt gibt keine „Wasser"-Gegenstände heraus', () => {
  const { s, ort } = neues();
  const b = bauer(ort, X0, Y0);
  const erg = L.neuesErgebnis();
  assert.ok(fabrikAufheben({ s, ort, x: X0, y: Y0, o: b, erg }));
  assert.equal(L.anzahl(s, 'maschinenbauer'), 1);
  assert.equal(ort.welt.objekte[kk(X0, Y0)], undefined);
  const m = maschine(ort, X0 + 5, Y0, 'mischer', { ein: { stein: 7, wasser: 3 }, aus: { beton: 4 }, arb: 'beton', f: 1 });
  m.wt = 0.7;
  const e2 = L.neuesErgebnis();
  fabrikAufheben({ s, ort, x: X0 + 5, y: Y0, o: m, erg: e2 });
  assert.equal(L.anzahl(s, 'mischer'), 1);
  assert.equal(L.anzahl(s, 'stein'), 7 + 4, 'angefangene Arbeit: 4 Stein zurück');
  assert.equal(L.anzahl(s, 'beton'), 4);
  assert.equal(L.anzahl(s, 'wasser'), 0, 'kein Wasser im Rucksack');
  assert.ok(!s.spieler.inv.some((z) => z?.id === 'wasser'));
  assert.equal(ort.welt.objekte[kk(X0 + 5, Y0)], undefined);
});
test('Rezept wechseln im Mischer gibt keine Wasser-Gegenstände heraus, die Zutaten kommen zurück', () => {
  const { s, ort } = neues();
  const m = maschine(ort, X0, Y0, 'mischer', { ein: { stein: 3, wasser: 2 } });
  const erg = rezeptWaehlen(s, m, 'betonplatte');
  assert.ok(erg.ok, erg.grund);
  assert.equal(L.anzahl(s, 'stein'), 3);
  assert.equal(L.anzahl(s, 'wasser'), 0);
  assert.equal(m.rez, 'betonplatte');
  assert.deepEqual(m.ein, {});
});

console.log('\nMaschinen: neue Rezepte laufen im richtigen Verhältnis');

function lauf(maschinenId, rid, sek, extra = {}) {
  const { s, ort } = neues();
  const r = MASCHINEN[maschinenId].rezepte[rid];
  const m = maschine(ort, X0, Y0, maschinenId, { rez: rid, ein: Object.fromEntries(Object.entries(r.ein).filter(([z]) => z !== 'wasser').map(([z, n]) => [z, n * 3])), ...extra });
  const l = lager(ort, X0 + MASCHINEN[maschinenId].flaeche[0], Y0);
  simuliere(s, ort, sek ?? r.zeit * 3 + 1, { schritt: 0.1 });
  return { s, ort, m, l, r };
}
test('Schmelzer: 3 Eisenbarren + 1 Kohle → 2 Stahlbarren in 8 s, neben den alten Rezepten', () => {
  const { s, ort } = neues();
  const sm = maschine(ort, X0, Y0, 'schmelzer', { ein: { eisenbarren: 6, kohle: 2 } });
  const l = lager(ort, X0 + 2, Y0);
  simuliere(s, ort, 8 * 2 + 0.5, { schritt: 0.1 });
  assert.equal(lagerN(l, 'stahlbarren'), 4);
  assert.equal(sm.ein.eisenbarren, 0);
  // Eisenerz + Kohle schmilzt weiter zu Eisenbarren, nicht zu Stahl
  const { s: s2, ort: ort2 } = neues();
  const sm2 = maschine(ort2, X0, Y0, 'schmelzer', { ein: { eisenerz: 5, kohle: 1 } });
  const l2 = lager(ort2, X0 + 2, Y0);
  simuliere(s2, ort2, 7, { schritt: 0.1 });
  assert.equal(lagerN(l2, 'eisenbarren'), 1);
  assert.equal(lagerN(l2, 'stahlbarren'), 0);
  assert.equal(sm2.ein.eisenerz, 0);
});
test('Konstrukteur: Stahlträger, Metallrohr, Kabelrolle, Rahmenplatte, Nägel, Zahnstange – Verhältnis und Zeit', () => {
  for (const id of Object.keys(KONSTRUKTEUR_NEU)) {
    const { l, r, m } = lauf('konstrukteur', id);
    const [z, n] = Object.entries(r.ein)[0];
    assert.equal(lagerN(l, id), 3 * r.aus[id], id);
    assert.equal(m.ein[z], 0, `${id}: ${z} verbraucht`);
    assert.ok(n >= 1);
  }
  // Zeit: genau ein Durchgang nach zeit Sekunden
  for (const [id, r] of Object.entries(KONSTRUKTEUR_NEU)) {
    const { s, ort } = neues();
    maschine(ort, X0, Y0, 'konstrukteur', { rez: id, ein: Object.fromEntries(Object.entries(r.ein).map(([z, n]) => [z, n * 3])) });
    const l = lager(ort, X0 + 2, Y0);
    const k = ort.welt.objekte[kk(X0, Y0)];
    const fertig = () => lagerN(l, id) + (k.aus[id] || 0);
    simuliere(s, ort, r.zeit - 0.3, { schritt: 0.1 });
    assert.equal(fertig(), 0, `${id}: noch nichts nach ${r.zeit - 0.3} s`);
    simuliere(s, ort, 0.6, { schritt: 0.1 });
    assert.equal(fertig(), r.aus[id], `${id}: ein Durchgang nach ${r.zeit} s`);
  }
});
test('Assembler: Platine, Kühlkörper, Rotor, Stator, Rahmen, Motor – Verhältnis und Zeit', () => {
  for (const [id, r] of Object.entries(ASSEMBLER_NEU)) {
    const { l, m } = lauf('assembler', id);
    assert.equal(lagerN(l, id), 3, id);
    assert.equal(Object.values(m.ein).reduce((a, b) => a + b, 0), 0, `${id}: alles verbraucht`);
    assert.ok(r.zeit >= 6);
  }
  const { s, ort } = neues();
  const m = maschine(ort, X0, Y0, 'assembler', { rez: 'motor', ein: { rotor: 2, stator: 2 } });
  const l = lager(ort, X0 + 3, Y0);
  simuliere(s, ort, ASSEMBLER_NEU.motor.zeit - 0.3, { schritt: 0.1 });
  assert.equal(lagerN(l, 'motor'), 0);
  simuliere(s, ort, 0.6, { schritt: 0.1 });
  assert.equal(lagerN(l, 'motor'), 1);
  assert.equal(m.ein.rotor, 0);
});
test('Fertiger: Computer und Antriebssystem aus vier Zutaten; ohne eine Zutat läuft nichts (Status, was fehlt)', () => {
  for (const id of Object.keys(FERTIGER_REZEPTE)) {
    const { l, m } = lauf('fertiger', id);
    assert.equal(lagerN(l, id), 3, id);
    assert.equal(Object.values(m.ein).reduce((a, b) => a + b, 0), 0, id);
  }
  const { s, ort } = neues();
  const m = maschine(ort, X0, Y0, 'fertiger', { rez: 'computer', ein: { platine: 4, kabelrolle: 4, kuehlkoerper: 2 } });
  lager(ort, X0 + 3, Y0);
  simuliere(s, ort, 100, { schritt: 0.5 });
  assert.equal(warenSumme(ort).computer || 0, 0);
  const info = maschinenInfo(m, s);
  assert.match(info.status, /es fehlt Motor 0\/1/);
  assert.equal(info.rezepte.length, 2);
  assert.equal(info.waehlbar, true);
});

console.log('\nMischer: Wasser aus Rohren, Strom');

/** Pumpe → Rohre → Mischer, Strom nur über den Übergangsstrom (oder keinen). */
function mischerAnlage({ uebergang = true, rohre = 3 } = {}) {
  const { s, ort } = neues({ uebergang });
  setze(ort, X0, Y0, { t: 'wasserpumpe', st: 'x' });
  for (let i = 1; i <= rohre; i++) setze(ort, X0 + i, Y0, { t: 'rohrleitung', fl: 0 });
  const m = maschine(ort, X0 + rohre + 1, Y0, 'mischer', { rez: 'beton' });
  const l = lager(ort, X0 + rohre + 3, Y0);
  return { s, ort, m, l };
}
test('Mischer: Stein vom Band + Wasser aus der Rohrleitung → Beton; Wasser kommt aus dem Rohrnetz (nimmt dort ab)', () => {
  const { s, ort, m, l } = mischerAnlage();
  m.ein.stein = 40;
  simuliere(s, ort, 20, { schritt: 0.1 });
  // 4 s je Durchgang: 4 Stein + 2 Wasser → 2 Beton
  assert.ok(lagerN(l, 'beton') >= 8, `Beton ${lagerN(l, 'beton')}`);
  assert.equal(lagerN(l, 'beton') % 2, 0);
  assert.ok(m.ein.stein <= 40 - 4 * 4);
  assert.ok(mischerNetze(s, ort, X0 + 4, Y0).length === 1);
});
test('Mischer ohne Rohr: nichts, mit Hinweis im Info-Fenster; mit Rohr steht „Rohr angeschlossen"', () => {
  const { s, ort } = neues();
  const m = maschine(ort, X0, Y0, 'mischer', { rez: 'beton', ein: { stein: 20 } });
  lager(ort, X0 + 2, Y0);
  simuliere(s, ort, 30, { schritt: 0.1 });
  assert.equal(warenSumme(ort).beton || 0, 0);
  assert.equal(m.ein.stein, 20);
  const wasser = (o) => maschinenInfo(o, s).zeilen.find(([a]) => a === 'Wasser')?.[1];
  assert.match(wasser(m), /kein Rohr/);
  const { s: s2, ort: ort2, m: m2 } = mischerAnlage();
  simuliere(s2, ort2, 10, { schritt: 0.1 });
  assert.match(maschinenInfo(m2, s2).zeilen.find(([a]) => a === 'Wasser')?.[1], /Rohr angeschlossen/);
});
test('Mischer ohne Strom steht (nach der Übergangszeit), mit Übergangsstrom läuft er; er zieht nur Strom, wenn er arbeiten kann', () => {
  const ohne = mischerAnlage({ uebergang: false });
  ohne.m.ein.stein = 20;
  simuliere(ohne.s, ohne.ort, 20, { schritt: 0.1 });
  assert.equal(lagerN(ohne.l, 'beton'), 0, 'kein Netz, kein Beton');
  assert.equal(ohne.m.st, 'x');
  const mit = mischerAnlage();
  mit.m.ein.stein = 20;
  simuliere(mit.s, mit.ort, 20, { schritt: 0.1 });
  assert.ok(lagerN(mit.l, 'beton') > 0);
  // Strombedarf 8 MW, Anschluss für ein Kabel
  assert.equal(MASCHINEN.mischer.leistung, 8);
  assert.equal(anschluesseVon('mischer'), 1);
});
test('Mischer: Rezept Betonplatte (Beton + Eisenplatte + Wasser); zwei Rezepte wählbar', () => {
  const { s, ort, m, l } = mischerAnlage();
  const erg = rezeptWaehlen(s, m, 'betonplatte');
  assert.ok(erg.ok);
  m.ein.beton = 8; m.ein.eisenplatte = 2;
  simuliere(s, ort, 6 * 2 + 1, { schritt: 0.1 });
  assert.equal(lagerN(l, 'betonplatte'), 2);
  assert.equal(m.ein.beton, 0);
});
test('Der Mischer nimmt Wasser höchstens so schnell, wie MISCHER.rate erlaubt, und höchstens bis zur Grenze des Rezepts', () => {
  const { s, ort, m } = mischerAnlage({ rohre: 8 });
  simuliere(s, ort, 20, { schritt: 0.1 }); // Rohre füllen sich, der Mischer holt Wasser (ohne Stein steht er)
  assert.ok(m.ein.wasser <= Math.max(4, MISCHER_REZEPTE.beton.ein.wasser * 3), `Wasser im Eingang ${m.ein.wasser}`);
  assert.ok((m.wt || 0) <= MISCHER.tank + 1e-9);
  assert.ok(m.ein.wasser >= 1, 'Wasser ist angekommen');
});
test('Rohre zeichnen den Anschluss zum Mischer (Maske) und Stromanschlüsse: Fertiger 2', () => {
  const { s, ort } = mischerAnlage();
  const maske = rohrMaske(ort, X0 + 3, Y0);
  assert.ok(maske & 2, `rechts zum Mischer: ${maske}`);
  assert.ok(OBJEKT_TYPEN.mischer.wasseranschluss);
  assert.equal(STROM.anschluesse.fertiger, 2);
  assert.equal(anschluesseVon('fertiger'), 2);
  assert.ok(s);
});

console.log('\nLinien, Nachholen, Nacht, Speichern');

test('Eine Linie bis zum Computer: gemischtes Band mit allen vier Zutaten läuft in den Fertiger und ins Lager', () => {
  const { s, ort } = neues();
  const reihe = [0, 1, 2, 3].map((i) => band(ort, X0 + i, Y0, RECHTS));
  maschine(ort, X0 + 4, Y0, 'fertiger', { rez: 'computer' });
  const l = lager(ort, X0 + 7, Y0);
  // Zutaten im Verhältnis 2 : 2 : 1 : 1, reihum aufs Band legen
  const vorrat = [];
  for (let i = 0; i < 6; i++) vorrat.push('platine', 'platine', 'kabelrolle', 'kabelrolle', 'kuehlkoerper', 'motor');
  let t = 0;
  while (t < 300) {
    if (vorrat.length) {
      const w = reihe[0].w;
      if (w.length < FABRIK.maxJeFeld && (!w.length || w[w.length - 1].p >= FABRIK.abstand)) w.push({ id: vorrat.shift(), p: 0 });
    }
    simuliere(s, ort, 0.2, { schritt: 0.1 });
    t += 0.2;
  }
  assert.equal(lagerN(l, 'computer'), 6, 'sechs Computer');
  assert.equal(vorrat.length, 0);
  assert.equal(Object.values(warenSumme(ort)).reduce((a, b) => a + b, 0), 6, 'nichts übrig, nichts verloren');
});
test('Vorratslager gibt der Reihe nach ab (erst alle Platinen …): der Fertiger klemmt nicht, ein reines Platinenband füllt ihn nur bis zur Grenze', () => {
  const { s, ort } = neues();
  const quelle = lager(ort, X0, Y0);
  for (const [id, n] of [['platine', 12], ['kabelrolle', 12], ['kuehlkoerper', 6], ['motor', 6]]) legeIn(quelle, id, n);
  [0, 1, 2].forEach((i) => band(ort, X0 + 2 + i, Y0, RECHTS));
  maschine(ort, X0 + 5, Y0, 'fertiger', { rez: 'computer' });
  const aus = lager(ort, X0 + 8, Y0);
  simuliere(s, ort, 200, { schritt: 0.1 });
  assert.equal(lagerN(aus, 'computer'), 6, 'alle sechs Computer trotz Reihenfolge im Lager');
  // reines Band (keine fehlende Zutat in Sicht): nur bis zur Grenze
  const { s: s2, ort: ort2 } = neues();
  const q2 = lager(ort2, X0, Y0);
  legeIn(q2, 'platine', 40);
  [0, 1, 2].forEach((i) => band(ort2, X0 + 2 + i, Y0, RECHTS));
  const f2 = maschine(ort2, X0 + 5, Y0, 'fertiger', { rez: 'computer' });
  simuliere(s2, ort2, 60, { schritt: 0.1 });
  assert.equal(f2.ein.platine, Math.max(4, 2 * 3), 'nur bis zur Grenze (3× Bedarf)');
});
test('Nachholen gleich live: Fertiger mit Vorrat, 100 s live (0,1 s) gegen 100 s Nachholen (0,5 s)', () => {
  const lauf2 = (schritt) => {
    const { s, ort } = neues();
    maschine(ort, X0, Y0, 'fertiger', { rez: 'computer', ein: { platine: 20, kabelrolle: 20, kuehlkoerper: 10, motor: 10 } });
    const l = lager(ort, X0 + 3, Y0);
    simuliere(s, ort, 100, { schritt });
    return lagerN(l, 'computer');
  };
  const live = lauf2(0.1);
  const nach = lauf2(0.5);
  assert.ok(live >= 4, `live ${live}`);
  assert.ok(Math.abs(live - nach) <= Math.max(1, live * 0.01), `live ${live} gegen nachgeholt ${nach}`);
});
test('Nachholen gleich live: Mischer mit Pumpe und Rohren (Wasser aus dem Netz), 120 s', () => {
  const lauf2 = (schritt) => {
    const { s, ort, m, l } = mischerAnlage();
    m.ein.stein = 500;
    simuliere(s, ort, 120, { schritt });
    return lagerN(l, 'beton');
  };
  const live = lauf2(0.1);
  const nach = lauf2(0.5);
  assert.ok(live >= 40, `live ${live}`);
  assert.ok(Math.abs(live - nach) <= Math.max(2, live * 0.03), `live ${live} gegen nachgeholt ${nach}`);
});
test('über Nacht holt die Fabrik die neuen Maschinen nach (Verschlafenes), auch der Mischer', () => {
  const { s, ort, m, l } = mischerAnlage();
  m.ein.stein = 400;
  const f = fabrikZustand(s);
  f.zeit.hof = f.t;
  nacht(s, 600); // 600 Minuten * 0,7 s, aber höchstens nachholMax
  assert.ok(lagerN(l, 'beton') >= 20, `Beton ${lagerN(l, 'beton')}`);
});
test('Speichern und Laden: Mischer (Wasser, Tank), Fertiger, Maschinenbauer; danach läuft alles gleich weiter', () => {
  const { s, ort, m, l } = mischerAnlage();
  m.ein.stein = 100;
  bauer(ort, X0 + 12, Y0 + 5);
  maschine(ort, X0 + 12, Y0 + 10, 'fertiger', { rez: 'antriebssystem', ein: { motor: 2, rahmen: 2, antriebseinheit: 2, zahnstange: 6 } });
  simuliere(s, ort, 10, { schritt: 0.1 });
  const s2 = L.deserialisieren(L.serialisieren(s));
  const ort2 = L.ortVon(s2, 'hof');
  const m2 = ort2.welt.objekte[kk(X0 + 4, Y0)];
  assert.equal(m2.t, 'mischer');
  assert.equal(m2.rez, 'beton');
  assert.equal(ort2.welt.objekte[kk(X0 + 12, Y0 + 5)].t, 'maschinenbauer');
  assert.equal(ort2.welt.objekte[kk(X0 + 12, Y0 + 10)].rez, 'antriebssystem');
  assert.deepEqual(JSON.parse(JSON.stringify(m2.ein)), JSON.parse(JSON.stringify(m.ein)));
  simuliere(s, ort, 20, { schritt: 0.1 });
  simuliere(s2, ort2, 20, { schritt: 0.1 });
  const l2 = ort2.welt.objekte[kk(X0 + 6, Y0)];
  assert.equal(lagerN(l2, 'beton'), lagerN(l, 'beton'), 'gleiches Ergebnis nach dem Laden');
  const f2 = ort2.welt.objekte[kk(X0 + 12, Y0 + 10)];
  const f1 = ort.welt.objekte[kk(X0 + 12, Y0 + 10)];
  assert.deepEqual(JSON.parse(JSON.stringify(f2.aus)), JSON.parse(JSON.stringify(f1.aus)), 'der Fertiger liefert nach dem Laden dasselbe');
  assert.equal(f2.aus.antriebssystem, 1);
});
test('alter Stand ohne Stufe 3: lädt, neue Rezepte und Pläne stehen bereit, der Maschinenbauer baut', () => {
  const text = readFileSync(new URL('./alter-hof-stand.json', import.meta.url), 'utf8');
  const s = L.deserialisieren(text);
  assert.ok(L.rezepteVon('basteln').some((r) => r.id === 'maschinenbauer'));
  s.spieler.xp.bergbau = 1e9;
  const ort = L.ortVon(s, 'hof');
  for (const kk2 of Object.keys(ort.welt.objekte)) delete ort.welt.objekte[kk2];
  bauer(ort, X0, Y0);
  s.spieler.inv = Array(24).fill(null);
  for (const [z, n] of Object.entries(BAUPLAENE.foerderband.zutaten)) gib(s, z, n);
  assert.ok(bauen(s, ort, kk(X0, Y0), 'foerderband', 1).ok);
});

console.log('\nInfo-Fenster und Bauplan-Übersicht (Handy)');

test('Info-Fenster: „Was braucht dieses Rezept?" mit Mengen pro Minute (gewähltes Rezept; Schmelzer alle)', () => {
  const { s, ort } = neues();
  const k = maschine(ort, X0, Y0, 'konstrukteur', { rez: 'eisenplatte' });
  const zeile = maschinenInfo(k, s).zeilen.find(([a]) => a === 'Was braucht dieses Rezept?');
  assert.ok(zeile);
  assert.match(zeile[1], /20× Eisenbarren → 40× Eisenplatte pro Minute/);
  const f = maschine(ort, X0 + 5, Y0, 'fertiger', { rez: 'computer' });
  assert.match(maschinenInfo(f, s).zeilen.find(([a]) => a === 'Was braucht dieses Rezept?')[1], /48× Platine|4,8× Platine|5× Platine/);
  const sm = maschine(ort, X0 + 10, Y0, 'schmelzer');
  const z = rezeptZeilen(sm);
  assert.equal(z.length, 4, 'alle vier Rezepte des Schmelzers');
  assert.match(z.join('\n'), /Stahlbarren: 22,5× Eisenbarren \+ 7,5× Kohle → 15× Stahlbarren pro Minute/);
  assert.deepEqual(rezeptRaten('konstrukteur', KONSTRUKTEUR_REZEPTE.kupferdraht), { ein: [{ id: 'kupferbarren', name: 'Kupferbarren', proMin: 30 }], aus: [{ id: 'kupferdraht', name: 'Kupferdraht', proMin: 60 }], leistung: 4 });
  assert.deepEqual(rezeptZeilen({ t: 'lager' }), []);
  assert.deepEqual(rezeptZeilen({ t: 'biomassebrenner' }), []);
});
test('Bauplan-App: alle Teile und alle Maschinenrezepte, Filter nach Material, „nur machbar"', () => {
  const { s } = neues();
  const alle = bauplanListe(s);
  assert.equal(alle.length, Object.keys(BAUPLAENE).length);
  assert.ok(alle.every((p) => p.name && p.zutaten.length && p.preis > 0));
  const mitSchraube = bauplanListe(s, { material: 'schraube' });
  assert.ok(mitSchraube.length > 3 && mitSchraube.every((p) => 'schraube' in BAUPLAENE[p.id].zutaten));
  assert.equal(bauplanListe(s, { nurMachbar: true }).length, 0);
  gib(s, 'eisenplatte', 2); gib(s, 'schraube', 4);
  const machbar = bauplanListe(s, { nurMachbar: true }).map((p) => p.id);
  assert.ok(machbar.includes('foerderband'));
  assert.ok(!machbar.includes('fertiger'));
  assert.equal(bauplanListe(s, { material: 'motor' }).map((p) => p.id).sort().join(), 'fertiger');
  const rez = rezeptListe();
  assert.equal(rez.length, maschinenRezepte().length);
  assert.ok(rez.length >= 3 + 4 + 2 + 6 + 6 + 2 + 2 - 3 + 3 + 2 - 2);
  assert.ok(rezeptListe({ material: 'wasser' }).every((r) => r.maschine === 'mischer'));
  assert.deepEqual(rezeptListe({ material: 'motor' }).map((r) => r.id).sort(), ['antriebssystem', 'computer', 'motor']);
  const mats = materialien();
  assert.ok(mats.includes('motor') && mats.includes('eisenplatte') && !mats.includes('wasser'));
  const unbek = bauplanListe(s, { material: 'goldbarren' });
  assert.equal(unbek.length, 0);
});
test('Handy-Kauf der neuen Maschinen: Maschinenbauer, Mischer, Fertiger zum festen Preis', () => {
  const { s } = neues();
  s.spieler.gold = 20_000_000;
  const e = handyKaufen(s, 'maschinenbauer', 1);
  assert.ok(e.ok, e.grund);
  assert.equal(s.spieler.gold, 20_000_000 - HANDY_PREISE_NEU.maschinenbauer);
  assert.ok(handyKaufen(s, 'mischer', 1).ok);
  assert.ok(handyKaufen(s, 'fertiger', 1).ok);
  assert.equal(s.spieler.gold, 20_000_000 - 3_500_000 - 5_000_000 - 10_000_000 + 0);
  assert.ok(!handyKaufen(s, 'fertiger', 1).ok, 'kein Gold mehr');
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
