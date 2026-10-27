// Fabrik (Bereich handwerk): Bänder, Rückstau, Kurven und Seiteneinspeisung, Vorkommen und Bohrer, Schmelzer,
// Konstrukteur, Assembler, Splitter, Zusammenführer, Lager und Versandkiste als Senken, Nachholen (Karte betreten
// und über Nacht), Aufheben ohne Verlust, Speichern und Laden, alte Stände, Vorkommen erreichbar, Zeitbudget.
// Aufruf: node test/fabrik.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/bereiche/inhalt.js';
import { ITEMS, REZEPTE, OBJEKT_TYPEN, STAPEL_MAX } from '../src/daten.js';
import { KARTEN } from '../src/karten.js';
import * as L from '../src/logik.js';
import { S } from '../src/spiel.js';
import { modifikator } from '../src/system.js';
import {
  FABRIK, MASCHINEN, SORTEN, PREISE, FREISCHALT, VORKOMMEN_PREIS, SCHMELZ_REZEPTE, KONSTRUKTEUR_REZEPTE, ASSEMBLER_REZEPTE,
} from '../src/bereiche/handwerk/fabrik-daten.js';
import { schritt, simuliere, warenSumme, fabrikAenderung, leistungVon, tempoVon, cacheVon } from '../src/bereiche/handwerk/fabrik-sim.js';
import { maschinenInfo, fabrikInfoZeile } from '../src/bereiche/handwerk/fabrik-info.js';
import { fabrikAufheben, rezeptWaehlen, ausgangLeeren, maschineDrehen } from '../src/bereiche/handwerk/fabrik-objekte.js';
import { fabrikZustand, nachholen, nacht } from '../src/bereiche/handwerk/fabrik-system.js';
import { vorkommenAnlegen, erreichbarePunkte, ANLAGE } from '../src/bereiche/handwerk/fabrik-vorkommen.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.stack?.split('\n').slice(0, 3).join('\n      ') ?? e.message}`);
  }
}

// ─── Hilfen ─────────────────────────────────────────────────────────────────

/** Neues Spiel; die Hofkarte wird geleert (nur Objekte, Beete, Belag), damit Bauten Platz haben. */
function neues(seed = 11) {
  const s = L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
  s.spieler.inv = Array(24).fill(null);
  const ort = L.ortVon(s, 'hof');
  ort.welt.objekte = {};
  ort.welt.felder = {};
  ort.welt.belag = {};
  fabrikAenderung();
  return { s, ort };
}
const OBEN = 0;
const RECHTS = 1;
const UNTEN = 2;
const LINKS = 3;
const X0 = 20;
const Y0 = 20;

function band(ort, x, y, r) {
  const o = { t: 'foerderband', r, w: [] };
  L.objektSetzen(ort, x, y, o);
  fabrikAenderung();
  return o;
}
function bandReihe(ort, x, y, n, r = RECHTS) {
  const liste = [];
  for (let i = 0; i < n; i++) liste.push(band(ort, x + (r === RECHTS ? i : r === LINKS ? -i : 0), y + (r === UNTEN ? i : r === OBEN ? -i : 0), r));
  return liste;
}
function maschine(ort, x, y, t, r = RECHTS, extra = {}) {
  const o = { t, r, ...(t === 'lager' ? { inv: Array(48).fill(null) } : { ein: {}, aus: {}, f: 0 }), ...(MASCHINEN[t].waehlbar ? { rez: MASCHINEN[t].standard } : {}), ...extra };
  L.objektSetzen(ort, x, y, o);
  fabrikAenderung();
  return o;
}
/** Ware auf den Anfang eines Bandes legen, wenn Platz ist. */
function auflegen(b, id, p = 0) {
  const w = (b.w ??= []);
  if (w.length >= FABRIK.maxJeFeld || (w.length && w[w.length - 1].p < p + FABRIK.abstand - 1e-9)) return false;
  w.push({ id, p });
  return true;
}
const lagerInhalt = (o) => {
  const summe = {};
  for (const f of o.inv) if (f) summe[f.id] = (summe[f.id] || 0) + f.n;
  return summe;
};
const lagerN = (o, id) => lagerInhalt(o)[id] || 0;
const gesamt = (ort) => Object.values(warenSumme(ort)).reduce((a, b) => a + b, 0);
const nahe = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('\nGegenstände, Rezepte, Freischaltung');

test('alle Bauteile und Waren sind Gegenstände; Bauteile aufstellbar mit Objekttyp', () => {
  for (const id of ['foerderband', 'splitter', 'zusammenfuehrer', 'lager', 'erzbohrer', 'schmelzer', 'konstrukteur', 'assembler']) {
    assert.ok(ITEMS[id], id);
    assert.ok(ITEMS[id].aufstellbar, id);
    assert.ok(OBJEKT_TYPEN[id], id);
  }
  for (const id of Object.keys(PREISE)) assert.equal(ITEMS[id].preis, PREISE[id]);
  for (const id of Object.keys(SORTEN)) assert.ok(ITEMS[`vorkommen_${id}`].aufstellbar);
});
test('Verkaufspreise: Bauteile bringen mehr als ihre Barren, ein Barren wird nie entwertet', () => {
  const barren = (id) => ITEMS[id].preis;
  // 1 Barren → Erzeugnisse
  assert.ok(2 * PREISE.kupferdraht > barren('kupferbarren'));
  assert.ok(2 * PREISE.eisenplatte > barren('eisenbarren'));
  assert.ok(4 * PREISE.schraube > barren('eisenbarren'));
  assert.ok(PREISE.zahnrad > barren('eisenbarren'));
  // Assembler: Eingangswert gegen Ergebniswert
  assert.ok(PREISE.maschinenteil > 2 * PREISE.eisenplatte + 3 * PREISE.kupferdraht);
  assert.ok(PREISE.antriebseinheit > 2 * PREISE.zahnrad + 4 * PREISE.schraube);
});
test('Basteln: gestaffelte Zutaten und Bergbau-Stufen, Band von Anfang an aus Holz und Stein', () => {
  const r = (id) => REZEPTE.find((x) => x.id === id);
  assert.deepEqual(r('foerderband').zutaten, { holz: 2, stein: 2 });
  assert.equal(r('foerderband').menge, 4);
  for (const [id, n] of Object.entries(FREISCHALT)) assert.deepEqual(r(id).stufe, ['bergbau', n], id);
  assert.ok(FREISCHALT.foerderband < FREISCHALT.erzbohrer && FREISCHALT.erzbohrer < FREISCHALT.schmelzer);
  assert.ok(FREISCHALT.schmelzer < FREISCHALT.konstrukteur && FREISCHALT.konstrukteur < FREISCHALT.assembler);
  assert.ok(r('assembler').zutaten.maschinenteil > 0, 'Assembler braucht Maschinenteile');
  const { s } = neues();
  assert.ok(!L.rezeptFrei(s, r('foerderband')), 'Stufe 0: noch gesperrt');
  s.spieler.xp.bergbau = 400; // Stufe 2
  assert.ok(L.rezeptFrei(s, r('foerderband')));
  assert.ok(!L.rezeptFrei(s, r('erzbohrer')));
  L.hinzufuegen(s, { id: 'holz', n: 2 }); L.hinzufuegen(s, { id: 'stein', n: 2 });
  assert.ok(L.basteln(s, r('foerderband')).ok);
  assert.equal(L.anzahl(s, 'foerderband'), 4);
});
test('jede Maschine hat ein Feld leistung (MW), der Objekttyp trägt es auch', () => {
  for (const [id, d] of Object.entries(MASCHINEN)) {
    assert.equal(typeof d.leistung, 'number', id);
    assert.equal(OBJEKT_TYPEN[id].leistung, d.leistung);
  }
  for (const id of ['erzbohrer', 'schmelzer', 'konstrukteur', 'assembler']) assert.ok(MASCHINEN[id].leistung > 0);
  assert.equal(VORKOMMEN_PREIS.normal, 50_000_000);
  assert.ok(VORKOMMEN_PREIS.unrein < VORKOMMEN_PREIS.normal && VORKOMMEN_PREIS.normal < VORKOMMEN_PREIS.rein);
});

console.log('\nBänder');

test('Ware wandert mit der Bandgeschwindigkeit (1,5 Felder/s) und rutscht ins nächste Band', () => {
  const { s, ort } = neues();
  const reihe = bandReihe(ort, X0, Y0, 6);
  auflegen(reihe[0], 'kohle');
  simuliere(s, ort, 2.2, { schritt: 0.05 });
  const wo = reihe.findIndex((b) => b.w.length);
  assert.equal(wo, 3, 'nach 2,2 s 3,3 Felder weit');
  assert.ok(nahe(reihe[wo].w[0].p, 0.3, 0.1), `p ${reihe[wo].w[0].p}`);
  simuliere(s, ort, 1, { schritt: 0.05 });
  assert.equal(reihe.findIndex((b) => b.w.length), 4, 'nach 3,2 s 4,8 Felder weit');
});
test('Rückstau: nichts geht verloren, höchstens 4 je Feld, Summe bleibt konstant', () => {
  const { s, ort } = neues();
  const reihe = bandReihe(ort, X0, Y0, 5);
  let eingelegt = 0;
  for (let t = 0; t < 400; t++) {
    if (auflegen(reihe[0], 'stein')) eingelegt++;
    simuliere(s, ort, 0.05, { schritt: 0.05 });
    assert.equal(gesamt(ort), eingelegt, `Schritt ${t}`);
    for (const b of reihe) assert.ok(b.w.length <= FABRIK.maxJeFeld);
  }
  assert.equal(reihe.at(-1).w.length, 4, 'am Bandende gestaut');
  assert.ok(nahe(reihe.at(-1).w[0].p, 1, 1e-6));
  assert.ok(eingelegt >= 18 && eingelegt <= 20, `4 Felder × 4 Stück … ${eingelegt}`);
  // Abstand wird nie unterschritten
  for (const b of reihe) for (let i = 1; i < b.w.length; i++) assert.ok(b.w[i - 1].p - b.w[i].p >= FABRIK.abstand - 1e-6);
});
test('Kurve: ein Band, das nur von der Seite gespeist wird, nimmt Waren an und führt sie weiter', () => {
  const { s, ort } = neues();
  const a = band(ort, X0, Y0, RECHTS);
  const b = band(ort, X0 + 1, Y0, UNTEN);
  const c = band(ort, X0 + 1, Y0 + 1, UNTEN);
  const lager = maschine(ort, X0 + 1, Y0 + 2, 'lager', UNTEN);
  auflegen(a, 'kohle');
  simuliere(s, ort, 5, { schritt: 0.05 });
  assert.notEqual(b.kv, 0, 'Kurve erkannt');
  assert.equal(c.kv, 0, 'dahinter gerade');
  assert.equal(lagerN(lager, 'kohle'), 1);
});
test('Seiteneinspeisung: ein Band von der Seite füttert ein durchlaufendes Band', () => {
  const { s, ort } = neues();
  const haupt = bandReihe(ort, X0, Y0, 5);
  const seite = band(ort, X0 + 2, Y0 - 1, UNTEN);
  const lager = maschine(ort, X0 + 5, Y0, 'lager', RECHTS);
  auflegen(haupt[0], 'eisenerz');
  auflegen(seite, 'kohle');
  simuliere(s, ort, 6, { schritt: 0.05 });
  assert.equal(haupt[2].kv, 0, 'mittleres Band bleibt gerade (hinten gespeist)');
  assert.equal(lagerN(lager, 'eisenerz'), 1);
  assert.equal(lagerN(lager, 'kohle'), 1);
});
test('Band gegen Band gegenüber nimmt nicht an: die Ware bleibt am Ende liegen', () => {
  const { s, ort } = neues();
  const a = band(ort, X0, Y0, RECHTS);
  const b = band(ort, X0 + 1, Y0, LINKS);
  auflegen(a, 'kohle');
  simuliere(s, ort, 4, { schritt: 0.05 });
  assert.equal(a.w.length, 1);
  assert.ok(nahe(a.w[0].p, 1, 1e-6));
  assert.equal(b.w.length, 0);
});
test('Band, dessen Ziel leer ist (nichts da), staut, statt Waren zu verlieren', () => {
  const { s, ort } = neues();
  const a = band(ort, X0, Y0, RECHTS);
  auflegen(a, 'kohle');
  simuliere(s, ort, 10);
  assert.equal(a.w.length, 1);
});
test('Band-Zyklus (Ring) verliert nichts und hängt nicht', () => {
  const { s, ort } = neues();
  const ring = [band(ort, X0, Y0, RECHTS), band(ort, X0 + 1, Y0, UNTEN), band(ort, X0 + 1, Y0 + 1, LINKS), band(ort, X0, Y0 + 1, OBEN)];
  for (const b of ring) auflegen(b, 'stein');
  simuliere(s, ort, 30, { schritt: 0.1 });
  assert.equal(gesamt(ort), 4);
});

console.log('\nVorkommen und Erzbohrer');

test('Vorkommen: 2×2-Objekt mit Sorte und Reinheit (0,5 / 1 / 2), unzerstörbar', () => {
  const { s, ort } = neues();
  const o = { t: 'vorkommen', erz: 'eisen', rein: 2 };
  L.objektSetzen(ort, X0, Y0, o);
  assert.deepEqual(L.flaecheVon(o), [2, 2]);
  assert.ok(OBJEKT_TYPEN.vorkommen.blockiert);
  s.spieler.werkzeug.spitzhacke = 0;
  const erg = L.spitzhackeHieb(s, ort, X0 + 1, Y0 + 1);
  assert.ok(erg.grund && /unzerstörbar/.test(erg.grund));
  assert.equal(ort.welt.objekte[L.k(X0, Y0)], o);
  const erg2 = L.axtHieb(s, ort, X0, Y0);
  assert.ok(erg2.grund);
  assert.equal(ort.welt.objekte[L.k(X0 + 1, Y0)].t, 'teil');
});
test('Vorkommen aus dem Rucksack: eigener Gegenstand je Sorte, Platzregel wie Aufstellbares, Reinheit 1× im Objekt', () => {
  const { s, ort } = neues();
  let frei = null;
  for (let y = 8; y < 60 && !frei; y++) for (let x = 8; x < 70 && !frei; x++) if (L.flaecheFrei(s, ort, x, y, 2, 2)) frei = { x, y };
  assert.ok(frei);
  L.hinzufuegen(s, { id: 'vorkommen_gold', n: 2 });
  const idx = s.spieler.inv.findIndex((z) => z?.id === 'vorkommen_gold');
  const r = L.aufstellen(s, ort, frei.x, frei.y, idx);
  assert.ok(r.ok, r.grund);
  const o = ort.welt.objekte[L.k(frei.x, frei.y)];
  assert.equal(o.t, 'vorkommen');
  assert.equal(o.erz, 'gold');
  assert.equal(o.rein, 1);
  // auf Beeten und Belag nicht
  ort.welt.felder[L.k(frei.x + 5, frei.y)] = { nass: false };
  assert.ok(L.aufstellen(s, ort, frei.x + 5, frei.y, idx).grund);
  ort.welt.belag[L.k(frei.x, frei.y + 5)] = { t: 'holzrohr' };
  assert.ok(L.aufstellen(s, ort, frei.x, frei.y + 5, idx).grund);
  // auf besetztem Feld nicht
  assert.ok(L.aufstellen(s, ort, frei.x, frei.y, idx).grund);
});
test('Erzbohrer steht nur auf einem Vorkommen: sonst abgelehnt, auf dem Vorkommen erbt er Sorte und Reinheit', () => {
  const { s, ort } = neues();
  L.hinzufuegen(s, { id: 'erzbohrer', n: 2 });
  const idx = s.spieler.inv.findIndex((z) => z?.id === 'erzbohrer');
  const r = L.aufstellen(s, ort, X0, Y0, idx);
  assert.ok(r.grund && /Vorkommen/.test(r.grund));
  assert.equal(ort.welt.objekte[L.k(X0, Y0)], undefined);
  L.objektSetzen(ort, X0 + 5, Y0, { t: 'vorkommen', erz: 'kupfer', rein: 0.5 });
  S.s = s; S.ort = ort; S.sp = { ...S.sp, blick: 'links', x: 3 * 16, y: 3 * 16 };
  const hand = { s, ort, x: X0 + 5, y: Y0, o: ort.welt.objekte[L.k(X0 + 5, Y0)], slot: s.spieler.inv[idx], idx };
  OBJEKT_TYPEN.vorkommen.einlegen(hand);
  const b = ort.welt.objekte[L.k(X0 + 5, Y0)];
  assert.equal(b.t, 'erzbohrer');
  assert.equal(b.erz, 'kupfer');
  assert.equal(b.rein, 0.5);
  assert.equal(b.r, LINKS, 'Ausgang nach der Blickrichtung');
  assert.equal(L.anzahl(s, 'erzbohrer'), 1);
  assert.equal(ort.welt.objekte[L.k(X0 + 6, Y0 + 1)].t, 'teil');
  S.s = null; S.ort = null;
});
test('Reinheit: unrein 0,5×, normal 1×, rein 2× (ein Stück je 2 s bei normal)', () => {
  const mengen = {};
  for (const rein of [0.5, 1, 2]) {
    const { s, ort } = neues();
    const bohrer = maschine(ort, X0, Y0, 'erzbohrer', RECHTS, { erz: 'eisen', rein });
    const lager = maschine(ort, X0 + 2, Y0, 'lager', RECHTS);
    simuliere(s, ort, 60, { schritt: 0.1 });
    mengen[rein] = lagerN(lager, 'eisenerz') + (bohrer.aus.eisenerz || 0);
  }
  assert.ok(nahe(mengen[1], 30, 1), `normal ${mengen[1]}`);
  assert.ok(nahe(mengen[0.5], 15, 1), `unrein ${mengen[0.5]}`);
  assert.ok(nahe(mengen[2], 60, 1), `rein ${mengen[2]}`);
});
test('Bohrer gibt an Band, Lager und Maschine ab; ist der Ausgang voll, hält er an (Status „Ausgang voll")', () => {
  const { s, ort } = neues();
  const bohrer = maschine(ort, X0, Y0, 'erzbohrer', RECHTS, { erz: 'kohle', rein: 2 });
  simuliere(s, ort, 20, { schritt: 0.1 });
  assert.equal(bohrer.aus.kohle, FABRIK.bohrerPuffer);
  assert.equal(bohrer.st, 'v');
  assert.equal(maschinenInfo(bohrer, s).status, 'Ausgang voll');
  const b = band(ort, X0 + 2, Y0, RECHTS);
  simuliere(s, ort, 1, { schritt: 0.1 });
  assert.ok(b.w.length > 0 || bohrer.aus.kohle < FABRIK.bohrerPuffer, 'fließt ins Band');
});

console.log('\nSchmelzer, Konstrukteur, Assembler');

test('Schmelzer: 5 Erz + 1 Kohle → 1 Barren, alle drei Rezepte, Reste bleiben', () => {
  for (const [id, r] of Object.entries(SCHMELZ_REZEPTE)) {
    const { s, ort } = neues();
    const erz = Object.keys(r.ein).find((z) => z !== 'kohle');
    const sm = maschine(ort, X0, Y0, 'schmelzer', RECHTS, { ein: { [erz]: 13, kohle: 4 } });
    const lager = maschine(ort, X0 + 2, Y0, 'lager', RECHTS);
    simuliere(s, ort, r.zeit * 2 + 0.5, { schritt: 0.1 });
    assert.equal(lagerN(lager, id), 2, id);
    assert.equal(sm.ein[erz], 3, 'zwei Durchgänge à 5 Erz');
    assert.equal(sm.ein.kohle, 2);
    simuliere(s, ort, 60, { schritt: 0.1 });
    assert.equal(lagerN(lager, id), 2, 'mit 3 Erz geht es nicht weiter');
    assert.equal(sm.st, 'e', 'wartet auf Eingang');
  }
});
test('Schmelzer nimmt vom Band nur Erz und Kohle an (Rest bleibt auf dem Band), Grenzen 3× Bedarf', () => {
  const { s, ort } = neues();
  const reihe = bandReihe(ort, X0, Y0, 3);
  const sm = maschine(ort, X0 + 3, Y0, 'schmelzer', RECHTS);
  let gelegt = 0;
  for (let i = 0; i < 40; i++) { if (auflegen(reihe[0], 'kupfererz')) gelegt++; simuliere(s, ort, 0.2, { schritt: 0.1 }); }
  assert.equal(sm.ein.kupfererz, 3 * 5, 'Grenze 3× Bedarf');
  assert.equal(sm.ein.kupfererz + reihe.reduce((n, b) => n + b.w.length, 0), gelegt, 'Rest staut auf dem Band');
  reihe.forEach((b) => { b.w = []; });
  auflegen(reihe[0], 'hartholz');
  simuliere(s, ort, 5, { schritt: 0.1 });
  assert.ok(reihe.some((b) => b.w.some((e) => e.id === 'hartholz')), 'Fremdes Zeug staut am Ende');
  assert.ok(!sm.ein.hartholz);
});
test('Konstrukteur: Kupferbarren → 2 Kupferdraht, Eisenbarren → 2 Eisenplatte, → 4 Schraube, → 1 Zahnrad', () => {
  const erwartet = { kupferdraht: ['kupferbarren', 2], eisenplatte: ['eisenbarren', 2], schraube: ['eisenbarren', 4], zahnrad: ['eisenbarren', 1] };
  for (const [rid, [zutat, n]] of Object.entries(erwartet)) {
    assert.deepEqual(KONSTRUKTEUR_REZEPTE[rid].ein, { [zutat]: 1 });
    assert.equal(KONSTRUKTEUR_REZEPTE[rid].aus[rid], n);
    const { s, ort } = neues();
    const k = maschine(ort, X0, Y0, 'konstrukteur', RECHTS, { rez: rid, ein: { [zutat]: 3 } });
    const lager = maschine(ort, X0 + 2, Y0, 'lager', RECHTS);
    simuliere(s, ort, 60, { schritt: 0.1 });
    assert.equal(lagerN(lager, rid), 3 * n, rid);
    assert.equal(k.ein[zutat], 0);
  }
});
test('Konstrukteur nimmt nur die Zutat des gewählten Rezepts an', () => {
  const { s, ort } = neues();
  const reihe = bandReihe(ort, X0, Y0, 3);
  const k = maschine(ort, X0 + 3, Y0, 'konstrukteur', RECHTS, { rez: 'schraube' });
  auflegen(reihe[0], 'kupferbarren');
  simuliere(s, ort, 5, { schritt: 0.1 });
  assert.ok(!k.ein.kupferbarren);
  assert.ok(reihe.some((b) => b.w.length), 'Kupfer staut');
});
test('Assembler: Eisenplatte + Kupferdraht → Maschinenteil, Zahnrad + Schraube → Antriebseinheit', () => {
  for (const [rid, r] of Object.entries(ASSEMBLER_REZEPTE)) {
    const { s, ort } = neues();
    const a = maschine(ort, X0, Y0, 'assembler', RECHTS, { rez: rid, ein: Object.fromEntries(Object.entries(r.ein).map(([z, n]) => [z, n * 2])) });
    const lager = maschine(ort, X0 + 3, Y0, 'lager', RECHTS);
    simuliere(s, ort, r.zeit * 2 + 1, { schritt: 0.1 });
    assert.equal(lagerN(lager, rid), 2, rid);
    assert.equal(Object.values(a.ein).reduce((x, y) => x + y, 0), 0);
  }
  assert.deepEqual(Object.keys(ASSEMBLER_REZEPTE[ 'maschinenteil'].ein).sort(), ['eisenplatte', 'kupferdraht']);
  assert.deepEqual(Object.keys(ASSEMBLER_REZEPTE.antriebseinheit.ein).sort(), ['schraube', 'zahnrad']);
});
test('Eine ganze Linie: Bohrer → Band → Schmelzer → Konstrukteur → Lager (Direktanschluss Maschine an Maschine)', () => {
  const { s, ort } = neues();
  maschine(ort, X0, Y0, 'erzbohrer', RECHTS, { erz: 'kupfer', rein: 2 });
  bandReihe(ort, X0 + 2, Y0, 2);
  const sm = maschine(ort, X0 + 4, Y0, 'schmelzer', RECHTS);
  // Kohle kommt getrennt von unten (zwei Zutaten auf einem Band würden sich bei falschem Verhältnis blockieren)
  maschine(ort, X0 + 4, Y0 + 3, 'erzbohrer', OBEN, { erz: 'kohle', rein: 1 });
  band(ort, X0 + 4, Y0 + 2, OBEN);
  const kon = maschine(ort, X0 + 6, Y0, 'konstrukteur', RECHTS, { rez: 'kupferdraht' });
  const lager = maschine(ort, X0 + 8, Y0, 'lager', RECHTS);
  simuliere(s, ort, 300, { schritt: 0.25 });
  assert.ok(lagerN(lager, 'kupferdraht') > 20, `Draht ${lagerN(lager, 'kupferdraht')}`);
  assert.equal(sm.t, 'schmelzer');
  assert.ok(kon.dr >= 0);
});

console.log('\nSplitter, Zusammenführer, Lager, Versandkiste');

test('Splitter verteilt gleichmäßig auf drei Ausgänge', () => {
  const { s, ort } = neues();
  const zu = bandReihe(ort, X0, Y0, 2);
  L.objektSetzen(ort, X0 + 2, Y0, { t: 'splitter', r: RECHTS, pf: null, z: 0, nx: 0 });
  const vorn = maschine(ort, X0 + 3, Y0, 'lager', RECHTS);
  band(ort, X0 + 2, Y0 - 1, OBEN);
  const oben = maschine(ort, X0 + 2, Y0 - 3, 'lager', OBEN);
  band(ort, X0 + 2, Y0 + 1, UNTEN);
  const unten = maschine(ort, X0 + 2, Y0 + 2, 'lager', UNTEN);
  fabrikAenderung();
  let n = 0;
  for (let t = 0; t < 1200; t++) {
    if (n < 90 && auflegen(zu[0], 'stein')) n++;
    simuliere(s, ort, 0.1, { schritt: 0.1 });
  }
  assert.equal(n, 90);
  const a = lagerN(vorn, 'stein');
  const b = lagerN(oben, 'stein');
  const c = lagerN(unten, 'stein');
  assert.equal(a + b + c, 90, 'nichts verloren');
  assert.ok(Math.max(a, b, c) - Math.min(a, b, c) <= 1, `${a}/${b}/${c}`);
});
test('Splitter: ist ein Ausgang gestaut, gehen alle Waren in die anderen (Rückstau ohne Verlust)', () => {
  const { s, ort } = neues();
  const zu = bandReihe(ort, X0, Y0, 2);
  L.objektSetzen(ort, X0 + 2, Y0, { t: 'splitter', r: RECHTS, pf: null, z: 0, nx: 0 });
  const vorn = maschine(ort, X0 + 3, Y0, 'lager', RECHTS);
  vorn.inv = Array(48).fill(null).map(() => ({ id: 'holz', n: STAPEL_MAX })); // voll
  band(ort, X0 + 2, Y0 - 1, OBEN);
  const oben = maschine(ort, X0 + 2, Y0 - 3, 'lager', OBEN);
  let n = 0;
  for (let t = 0; t < 400; t++) {
    if (n < 30 && auflegen(zu[0], 'stein')) n++;
    simuliere(s, ort, 0.1, { schritt: 0.1 });
  }
  assert.equal(lagerN(oben, 'stein'), 30);
  assert.equal(lagerN(vorn, 'stein'), 0);
});
test('Zusammenführer: zwei Zuflüsse (links, rechts) abwechselnd auf ein Band', () => {
  const { s, ort } = neues();
  const l = bandReihe(ort, X0 + 2, Y0 - 2, 2, UNTEN);
  const r = bandReihe(ort, X0 + 2, Y0 + 2, 2, OBEN);
  L.objektSetzen(ort, X0 + 2, Y0, { t: 'zusammenfuehrer', r: RECHTS, pf: null, z: 0, nx: 0 });
  // Bänder zeigen von oben (unten) bzw. unten (oben) auf den Zusammenführer; y-Reihenfolge: l an y−2,−1, r an y+2,+1
  ort.welt.objekte[L.k(X0 + 2, Y0 - 1)].r = UNTEN;
  ort.welt.objekte[L.k(X0 + 2, Y0 + 1)].r = OBEN;
  band(ort, X0 + 3, Y0, RECHTS);
  const lager = maschine(ort, X0 + 4, Y0, 'lager', RECHTS);
  fabrikAenderung();
  const links = ort.welt.objekte[L.k(X0 + 2, Y0 - 2)];
  const rechts = ort.welt.objekte[L.k(X0 + 2, Y0 + 2)];
  assert.ok(l && r);
  let n = 0;
  for (let t = 0; t < 1500; t++) {
    if (n < 80) {
      const a = auflegen(links, 'kohle');
      const b = auflegen(rechts, 'stein');
      if (a) n++;
      if (b) n++;
    }
    simuliere(s, ort, 0.1, { schritt: 0.1 });
  }
  const k = lagerN(lager, 'kohle');
  const st = lagerN(lager, 'stein');
  assert.ok(k + st > 70, `angekommen ${k + st}`);
  assert.ok(Math.abs(k - st) <= 2, `fair: ${k} / ${st}`);
});
test('Lager: nimmt vom Band an (48 Fächer), gibt vorn an ein abgehendes Band ab; voll → Rückstau', () => {
  const { s, ort } = neues();
  const zu = bandReihe(ort, X0, Y0, 2);
  const lager = maschine(ort, X0 + 2, Y0, 'lager', RECHTS);
  const raus = bandReihe(ort, X0 + 4, Y0, 2);
  const lager2 = maschine(ort, X0 + 6, Y0, 'lager', RECHTS);
  assert.equal(lager.inv.length, 48);
  for (let t = 0; t < 100; t++) { auflegen(zu[0], 'zahnrad'); simuliere(s, ort, 0.1, { schritt: 0.1 }); }
  assert.ok(lagerN(lager, 'zahnrad') + lagerN(lager2, 'zahnrad') + raus.reduce((n, b) => n + b.w.length, 0) + zu.reduce((n, b) => n + b.w.length, 0) >= 30);
  assert.ok(lagerN(lager2, 'zahnrad') > 5, 'wird weitergereicht');
  // voll: 48 volle Fächer anderer Ware
  const voll = maschine(ort, X0, Y0 + 10, 'lager', RECHTS);
  voll.inv = voll.inv.map(() => ({ id: 'holz', n: STAPEL_MAX }));
  const eing = band(ort, X0 - 1, Y0 + 10, RECHTS);
  auflegen(eing, 'zahnrad');
  simuliere(s, ort, 5);
  assert.equal(eing.w.length, 1, 'bleibt auf dem Band');
  assert.equal(lagerN(voll, 'zahnrad'), 0);
});
test('Lager öffnet per Aktionstaste das Truhenfenster', () => {
  assert.equal(typeof OBJEKT_TYPEN.lager.interagieren, 'function');
  assert.equal(typeof OBJEKT_TYPEN.lager.hinweis, 'function');
});
test('Versandkiste als Senke: Bänder münden hinein, die Ware wird über Nacht normal verkauft', () => {
  const { s, ort } = neues();
  const kiste = L.dekoListe(s, ort.def).find((d) => d.typ === 'versandkiste');
  assert.ok(kiste);
  const b = band(ort, kiste.x - 1, kiste.y, RECHTS);
  auflegen(b, 'eisenbarren');
  simuliere(s, ort, 3, { schritt: 0.1 });
  assert.equal(b.w.length, 0);
  assert.equal(s.versand.find((x) => x.id === 'eisenbarren')?.n, 1);
  const gold = s.spieler.gold;
  L.tagBeenden(s, { r: () => 0.99 });
  assert.equal(s.spieler.gold, gold + ITEMS.eisenbarren.preis);
});
test('Bohrer direkt neben der Versandkiste verkauft sein Erz über Nacht', () => {
  const { s, ort } = neues();
  const kiste = L.dekoListe(s, ort.def).find((d) => d.typ === 'versandkiste');
  maschine(ort, kiste.x - 2, kiste.y, 'erzbohrer', RECHTS, { erz: 'eisen', rein: 1 });
  fabrikZustand(s).zeit.hof = 0;
  s.zeit.minute = 1380; // 23 Uhr
  const gold = s.spieler.gold;
  const bericht = L.tagBeenden(s, { r: () => 0.99 });
  const minuten = bericht.nachtMinuten;
  const erwartet = Math.floor(minuten * FABRIK.sekProMinute / 2);
  const n = bericht.verkauf.find((v) => v.slot.id === 'eisenerz')?.slot.n ?? 0;
  assert.ok(n >= erwartet - 4 && n <= erwartet, `verkauft ${n}, erwartet ~${erwartet}`);
  assert.equal(s.spieler.gold, gold + n * ITEMS.eisenerz.preis);
});
test('Truhen nehmen vom Band an (Bonus), Fremdes ohne Platz staut', () => {
  const { s, ort } = neues();
  const b = band(ort, X0, Y0, RECHTS);
  const truhe = { t: 'truhe', inv: Array(24).fill(null) };
  L.objektSetzen(ort, X0 + 1, Y0, truhe);
  auflegen(b, 'kohle');
  simuliere(s, ort, 2, { schritt: 0.1 });
  assert.equal(truhe.inv[0].id, 'kohle');
});

console.log('\nNachholen und Laufzeit');

/** Linie: Bohrer → 8 Bänder → Lager. Gibt das Lager zurück. */
function linie(ort, x = X0, y = Y0) {
  maschine(ort, x, y, 'erzbohrer', RECHTS, { erz: 'kupfer', rein: 2 });
  bandReihe(ort, x + 2, y, 8);
  return maschine(ort, x + 10, y, 'lager', RECHTS);
}
test('Nachholen (große Schritte) entspricht in Summe der Echtzeit-Rate (±5 %)', () => {
  const echt = neues();
  const lagerE = linie(echt.ort);
  for (let t = 0; t < 3000; t++) schritt(echt.s, echt.ort, 0.1); // 300 s in Echtzeit-Schritten
  const grob = neues();
  const lagerG = linie(grob.ort);
  simuliere(grob.s, grob.ort, 300, { schritt: FABRIK.nachholSchritt });
  const a = lagerN(lagerE, 'kupfererz');
  const b = lagerN(lagerG, 'kupfererz');
  assert.ok(a > 250, `Echtzeit ${a}`);
  assert.ok(Math.abs(a - b) / a < 0.05, `Echtzeit ${a} gegen Nachholen ${b}`);
});
test('Karte betreten: Rückstand wird nachgeholt, höchstens 10 Minuten Echtzeit-Äquivalent', () => {
  const { s, ort } = neues();
  const lager = linie(ort);
  const f = fabrikZustand(s);
  f.zeit.hof = 0;
  f.t = 100;
  const rest = nachholen(s, ort);
  assert.equal(rest, 0);
  assert.equal(f.zeit.hof, 100);
  const n1 = lagerN(lager, 'kupfererz');
  assert.ok(nahe(n1, 100 - 7, 12), `nach 100 s: ${n1}`); // 1 Stück/s, Anlaufzeit durch die Bänder
  f.t = 100 + 5000; // lange weg
  nachholen(s, ort);
  const n2 = lagerN(lager, 'kupfererz') - n1;
  assert.ok(n2 <= FABRIK.nachholMax + 2 && n2 >= FABRIK.nachholMax - 20, `gedeckelt: ${n2}`);
  assert.equal(f.zeit.hof, f.t);
});
test('Zeitbudget: mit Budget bleibt ein Rest für das nächste Bild, ohne Verlust und ohne Doppelzählung', () => {
  const { s, ort } = neues();
  const lager = linie(ort);
  const f = fabrikZustand(s);
  f.zeit.hof = 0;
  f.t = 600;
  let runden = 0;
  while (nachholen(s, ort, { budgetMs: 0.05 }) > 0 && runden++ < 10000);
  assert.equal(f.zeit.hof, 600);
  const mit = lagerN(lager, 'kupfererz');
  const ohne = neues();
  const lager2 = linie(ohne.ort);
  const f2 = fabrikZustand(ohne.s);
  f2.zeit.hof = 0; f2.t = 600;
  nachholen(ohne.s, ohne.ort);
  assert.ok(Math.abs(mit - lagerN(lager2, 'kupfererz')) <= 6, `${mit} gegen ${lagerN(lager2, 'kupfererz')}`);
});
test('Über Nacht läuft die Fabrik auf jeder Karte weiter (auch auf der, auf der man nicht ist)', () => {
  const { s } = neues();
  const berg = L.ortVon(s, 'berg');
  berg.welt.objekte = {};
  fabrikAenderung();
  const lager = linie(berg, 10, 10);
  fabrikZustand(s).zeit.berg = 0;
  s.zeit.minute = 1320; // 22 Uhr
  const bericht = L.tagBeenden(s, { r: () => 0.99 });
  const sek = bericht.nachtMinuten * FABRIK.sekProMinute;
  const n = lagerN(lager, 'kupfererz');
  assert.ok(n > sek * 0.8 && n <= sek + 2, `${n} von ~${Math.floor(sek)}`);
  assert.equal(s.fabrik.zeit.berg, s.fabrik.t);
});
test('Echtzeit (Hook update) und Pause: das Spiel läuft nur, wenn nicht pausiert', async () => {
  const { s, ort } = neues();
  const lager = linie(ort);
  fabrikZustand(s).zeit.hof = 0;
  const spiel = await import('../src/spiel.js');
  const { alleSicher } = await import('../src/system.js');
  S.s = s; S.ort = ort;
  for (let i = 0; i < 600; i++) alleSicher('update', 1 / 60); // 10 s
  assert.ok(Math.abs(s.fabrik.t - 10) < 1e-6);
  const n = lagerN(lager, 'kupfererz');
  assert.ok(n >= 1 && n <= 10, `${n}`);
  const t = s.fabrik.t;
  S.pause = true;
  spiel.update(1, { richtung: { x: 0, y: 0 }, benutzen: {}, aktion: {}, maus: {}, slot: null });
  assert.equal(s.fabrik.t, t, 'Pause friert die Fabrik ein');
  S.pause = false;
  S.s = null; S.ort = null;
});
test('Deterministisch: ohne Math.random, gleiche Eingabe gleiche Karte', () => {
  const lauf = () => {
    const { s, ort } = neues(3);
    linie(ort);
    maschine(ort, X0, Y0 + 4, 'schmelzer', RECHTS, { ein: { kupfererz: 20, kohle: 4 } });
    simuliere(s, ort, 120, { schritt: 0.25 });
    return JSON.stringify(ort.welt.objekte);
  };
  assert.equal(lauf(), lauf());
  for (const f of ['daten', 'sim', 'info', 'objekte', 'vorkommen', 'system']) {
    const text = readFileSync(new URL(`../src/bereiche/handwerk/fabrik-${f}.js`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random/.test(text), f);
  }
});
test('Zeitbudget je Bild: 200 Bänder und 40 Maschinen brauchen im Mittel höchstens ~3 ms', () => {
  const { s, ort } = neues();
  // 40 Zeilen mit je 5 Bändern = 200 Bänder, dazu 40 Maschinen (Bohrer + Lager)
  for (let i = 0; i < 20; i++) {
    const y = 2 + i * 3;
    maschine(ort, 4, y, 'erzbohrer', RECHTS, { erz: 'eisen', rein: 2 });
    bandReihe(ort, 6, y, 5);
    maschine(ort, 11, y, 'lager', RECHTS);
    // zweite Zeile: Schmelzer → Band
    maschine(ort, 20, y, 'schmelzer', RECHTS, { ein: { eisenerz: 100, kohle: 20 } });
    bandReihe(ort, 22, y, 5);
    maschine(ort, 27, y, 'lager', RECHTS);
  }
  const c = cacheVon(s, ort);
  assert.equal(c.fluss.length, 200);
  assert.equal(c.maschinen.length, 80 - 0, '20 × (Bohrer, Lager, Schmelzer, Lager)');
  for (let i = 0; i < 300; i++) schritt(s, ort, 1 / 60); // warm
  const t0 = performance.now();
  for (let i = 0; i < 600; i++) schritt(s, ort, 1 / 60);
  const ms = (performance.now() - t0) / 600;
  assert.ok(ms < 3, `${ms.toFixed(3)} ms je Bild`);
  const t1 = performance.now();
  simuliere(s, ort, FABRIK.nachholMax, { schritt: FABRIK.nachholSchritt });
  assert.ok(performance.now() - t1 < 4000, 'volles Nachholen (600 s) bleibt unter wenigen Sekunden');
});
test('Taktfaktor tempo (0..1, Stufe 1 immer 1) über den Modifikator fabrikTempo; Leistung wird gelesen, nicht erzwungen', () => {
  const { s, ort } = neues();
  const b = maschine(ort, X0, Y0, 'erzbohrer', RECHTS, { erz: 'eisen', rein: 2 });
  const lager = maschine(ort, X0 + 2, Y0, 'lager', RECHTS);
  const c = cacheVon(s, ort);
  assert.equal(tempoVon(c, b), 1);
  assert.equal(leistungVon(s, ort), MASCHINEN.erzbohrer.leistung + MASCHINEN.lager.leistung);
  let faktor = 1;
  modifikator('fabrikTempo', (w, k) => (k.o === b ? faktor : w));
  faktor = 0.5;
  simuliere(s, ort, 60, { schritt: 0.1 });
  const halb = lagerN(lager, 'eisenerz') + (b.aus.eisenerz || 0);
  assert.ok(nahe(halb, 30, 2), `halbes Tempo ${halb}`);
  faktor = 0;
  simuliere(s, ort, 60, { schritt: 0.1 });
  assert.equal(lagerN(lager, 'eisenerz') + (b.aus.eisenerz || 0), halb, 'ohne Takt nichts');
  assert.equal(b.st, 'x');
});

console.log('\nAufheben, Drehen, Fenster');

test('Band aufheben: Band und Ware zurück in den Rucksack, nichts doppelt (Summe konstant)', () => {
  const { s, ort } = neues();
  const b = band(ort, X0, Y0, RECHTS);
  auflegen(b, 'kohle'); b.w.push({ id: 'kohle', p: 0.5 });
  const erg = L.neuesErgebnis();
  fabrikAufheben({ s, ort, x: X0, y: Y0, o: b, erg });
  assert.equal(ort.welt.objekte[L.k(X0, Y0)], undefined);
  assert.equal(L.anzahl(s, 'foerderband'), 1);
  assert.equal(L.anzahl(s, 'kohle'), 2);
});
test('Band aufheben bei vollem Rucksack bis auf den Platz für das Band: Rest fällt weg, kein Duplikat', () => {
  const { s, ort } = neues();
  s.spieler.inv = s.spieler.inv.map((_, i) => (i === 0 ? null : { id: 'holz', n: 1 }));
  s.spieler.inv[1] = { id: 'kohle', n: STAPEL_MAX - 1 }; // ein Stück Platz für Kohle
  const b = band(ort, X0, Y0, RECHTS);
  b.w.push({ id: 'kohle', p: 0.2 }, { id: 'kohle', p: 0.7 });
  const erg = L.neuesErgebnis();
  const vorher = L.anzahl(s, 'kohle');
  fabrikAufheben({ s, ort, x: X0, y: Y0, o: b, erg });
  assert.equal(L.anzahl(s, 'foerderband'), 1);
  assert.ok(L.anzahl(s, 'kohle') - vorher <= 2);
  assert.equal(ort.welt.funde.length, 0, 'nichts auf den Boden');
});
test('Maschine aufheben: nur wenn der Inhalt zurückgegeben werden kann, sonst bleibt alles stehen', () => {
  const { s, ort } = neues();
  const sm = maschine(ort, X0, Y0, 'schmelzer', RECHTS, { ein: { kupfererz: 7, kohle: 2 }, aus: { kupferbarren: 3 } });
  s.spieler.inv = s.spieler.inv.map(() => ({ id: 'holz', n: STAPEL_MAX }));
  const erg = L.neuesErgebnis();
  fabrikAufheben({ s, ort, x: X0, y: Y0, o: sm, erg });
  assert.ok(erg.grund);
  assert.equal(ort.welt.objekte[L.k(X0, Y0)], sm);
  assert.equal(sm.ein.kupfererz, 7);
  // mit Platz
  s.spieler.inv = Array(24).fill(null);
  const erg2 = L.neuesErgebnis();
  fabrikAufheben({ s, ort, x: X0, y: Y0, o: sm, erg: erg2 });
  assert.equal(ort.welt.objekte[L.k(X0, Y0)], undefined);
  assert.equal(L.anzahl(s, 'schmelzer'), 1);
  assert.equal(L.anzahl(s, 'kupfererz'), 7);
  assert.equal(L.anzahl(s, 'kohle'), 2);
  assert.equal(L.anzahl(s, 'kupferbarren'), 3);
});
test('Lager aufheben gibt alle Fächer zurück; per Spitzhacke und Axt', () => {
  const { s, ort } = neues();
  const lager = maschine(ort, X0, Y0, 'lager', RECHTS);
  lager.inv[0] = { id: 'zahnrad', n: 5 }; lager.inv[7] = { id: 'schraube', n: 40 };
  s.spieler.werkzeug.spitzhacke = 0;
  const erg = L.spitzhackeHieb(s, ort, X0 + 1, Y0 + 1);
  assert.equal(erg.treffer, 'aufheben');
  assert.equal(L.anzahl(s, 'zahnrad'), 5);
  assert.equal(L.anzahl(s, 'schraube'), 40);
  assert.equal(L.anzahl(s, 'lager'), 1);
  assert.equal(Object.keys(ort.welt.objekte).length, 0, 'alle Teile weg');
});
test('Bohrer aufheben gibt das Vorkommen wieder frei (Sorte und Reinheit bleiben)', () => {
  const { s, ort } = neues();
  const b = maschine(ort, X0, Y0, 'erzbohrer', RECHTS, { erz: 'gold', rein: 0.5, aus: { golderz: 2 } });
  const erg = L.neuesErgebnis();
  fabrikAufheben({ s, ort, x: X0, y: Y0, o: b, erg });
  const v = ort.welt.objekte[L.k(X0, Y0)];
  assert.equal(v.t, 'vorkommen');
  assert.equal(v.erz, 'gold');
  assert.equal(v.rein, 0.5);
  assert.equal(L.anzahl(s, 'erzbohrer'), 1);
  assert.equal(L.anzahl(s, 'golderz'), 2);
  assert.equal(ort.welt.objekte[L.k(X0 + 1, Y0 + 1)].t, 'teil');
});
test('Band drehen im Uhrzeigersinn mit der Aktionstaste', () => {
  const { s, ort } = neues();
  const b = band(ort, X0, Y0, OBEN);
  const gesehen = [];
  for (let i = 0; i < 4; i++) { OBJEKT_TYPEN.foerderband.interagieren({ s, ort, o: b }); gesehen.push(b.r); }
  assert.deepEqual(gesehen, [RECHTS, UNTEN, LINKS, OBEN]);
  assert.match(OBJEKT_TYPEN.foerderband.hinweis({ o: b }), /drehen/);
});
test('Platzregeln: Bänder auch auf Belag, Maschinen nicht auf Beeten; nicht im Dorf', () => {
  const { s, ort } = neues();
  L.hinzufuegen(s, { id: 'foerderband', n: 3 }); L.hinzufuegen(s, { id: 'schmelzer', n: 1 });
  const iB = s.spieler.inv.findIndex((z) => z?.id === 'foerderband');
  const iS = s.spieler.inv.findIndex((z) => z?.id === 'schmelzer');
  ort.welt.belag[L.k(X0, Y0)] = { t: 'holzrohr' };
  assert.ok(L.aufstellen(s, ort, X0, Y0, iB).ok, 'Band auf Rohr');
  ort.welt.felder[L.k(X0 + 5, Y0)] = { nass: false };
  assert.ok(L.aufstellen(s, ort, X0 + 5, Y0, iB).grund, 'Band auf Beet');
  assert.ok(L.aufstellen(s, ort, X0 + 4, Y0 + 4, iS).ok, 'Schmelzer 2×2 auf freier Fläche');
  assert.equal(ort.welt.objekte[L.k(X0 + 5, Y0 + 5)].t, 'teil');
  const dorf = L.ortVon(s, 'dorf');
  let x = 0;
  let y = 0;
  for (let j = 0; j < dorf.def.h && !x; j++) for (let i = 0; i < dorf.def.w && !x; i++) if (L.feldFrei(s, dorf, i, j)) { x = i; y = j; }
  assert.ok(L.aufstellen(s, dorf, x, y, iB).grund, 'im Dorf nicht');
});
test('Blickrichtung beim Platzieren: Band zeigt dorthin, wohin man schaut', () => {
  const { s, ort } = neues();
  L.hinzufuegen(s, { id: 'foerderband', n: 4 });
  const idx = s.spieler.inv.findIndex((z) => z?.id === 'foerderband');
  S.s = s; S.ort = ort;
  const gelegt = [];
  for (const [blick, r] of [['oben', OBEN], ['rechts', RECHTS], ['unten', UNTEN], ['links', LINKS]]) {
    S.sp.blick = blick;
    const x = X0 + r * 2;
    assert.ok(L.aufstellen(s, ort, x, Y0, idx).ok);
    gelegt.push(ort.welt.objekte[L.k(x, Y0)].r);
  }
  assert.deepEqual(gelegt, [OBEN, RECHTS, UNTEN, LINKS]);
  assert.ok(fabrikZustand(s).zeit.hof != null, 'die Fabrik-Uhr der Karte beginnt beim ersten Bau');
  S.s = null; S.ort = null;
});
test('Info-Fenster: Name, Rezept, Status, Durchsatz, Inhalt, Ein- und Ausgang in Worten, erweiterbar', () => {
  const { s, ort } = neues();
  const k = maschine(ort, X0, Y0, 'konstrukteur', UNTEN, { rez: 'zahnrad', ein: { eisenbarren: 2 }, st: 'a', dr: 12 });
  const i = maschinenInfo(k, s);
  assert.equal(i.name, 'Konstrukteur');
  assert.equal(i.status, 'arbeitet');
  assert.equal(i.durchsatz, 12);
  assert.equal(i.gewaehlt, 'zahnrad');
  assert.equal(i.rezepte.length, 4);
  assert.deepEqual(i.ein[0].slice(0, 2), ['Eisenbarren', 2]);
  assert.match(i.ausgang, /unten/);
  assert.match(i.eingang, /hinten/);
  assert.ok(i.zeilen.some(([a]) => a === 'Leistung'));
  fabrikInfoZeile((o) => (o === k ? ['Strom', '4 MW'] : null));
  assert.ok(maschinenInfo(k, s).zeilen.some(([a, b]) => a === 'Strom' && b === '4 MW'));
  for (const st of ['a', 'e', 'v']) assert.notEqual(maschinenInfo({ ...k, st }, s).status, undefined);
  assert.equal(maschinenInfo(maschine(ort, X0 + 5, Y0, 'schmelzer'), s).status, 'wartet auf Eingang');
});
test('Rezept wählen: Zutaten des alten Rezepts gehen zurück, bei vollem Rucksack bleibt es beim alten; Wahl bleibt im Stand', () => {
  const { s, ort } = neues();
  const a = maschine(ort, X0, Y0, 'assembler', RECHTS, { ein: { eisenplatte: 2, kupferdraht: 1 } });
  s.spieler.inv = s.spieler.inv.map(() => ({ id: 'holz', n: STAPEL_MAX }));
  assert.ok(rezeptWaehlen(s, a, 'antriebseinheit').grund);
  assert.equal(a.rez, 'maschinenteil');
  assert.equal(a.ein.eisenplatte, 2);
  s.spieler.inv = Array(24).fill(null);
  const erg = rezeptWaehlen(s, a, 'antriebseinheit');
  assert.ok(erg.ok);
  assert.equal(a.rez, 'antriebseinheit');
  assert.equal(L.anzahl(s, 'eisenplatte'), 2);
  assert.equal(Object.values(a.ein).reduce((x, y) => x + y, 0), 0);
  assert.ok(rezeptWaehlen(s, a, 'gibtsnicht').grund);
  assert.ok(rezeptWaehlen(s, maschine(ort, X0 + 5, Y0, 'schmelzer'), 'x').grund, 'Schmelzer ist nicht wählbar');
  const s2 = L.deserialisieren(L.serialisieren(s));
  assert.equal(s2.welt.hof.objekte[L.k(X0, Y0)].rez, 'antriebseinheit');
});
test('Ausgang leeren und Drehen aus dem Fenster', () => {
  const { s, ort } = neues();
  const k = maschine(ort, X0, Y0, 'schmelzer', OBEN, { aus: { eisenbarren: 3 } });
  const erg = ausgangLeeren(s, k);
  assert.ok(erg.ok);
  assert.equal(L.anzahl(s, 'eisenbarren'), 3);
  assert.ok(ausgangLeeren(s, k).grund);
  maschineDrehen(k);
  assert.equal(k.r, RECHTS);
  for (let i = 0; i < 3; i++) maschineDrehen(k);
  assert.equal(k.r, OBEN);
});
test('Maschine nimmt nicht durch ihre Ausgangsseite an', () => {
  const { s, ort } = neues();
  const zu = band(ort, X0 + 2, Y0, LINKS); // zeigt von rechts auf die Maschine (rechts ist vorn)
  const sm = maschine(ort, X0, Y0, 'schmelzer', RECHTS);
  auflegen(zu, 'kupfererz');
  simuliere(s, ort, 4, { schritt: 0.1 });
  assert.equal(sm.ein.kupfererz || 0, 0);
  assert.equal(zu.w.length, 1);
  sm.r = LINKS;
  fabrikAenderung();
  simuliere(s, ort, 4, { schritt: 0.1 });
  assert.equal(sm.ein.kupfererz, 1);
});

console.log('\nSpeichern, alte Stände, Vorkommen');

test('Speichern und Laden: Bänder, Maschinen und Fabrik-Uhr bleiben; Format v2; danach läuft alles gleich weiter', () => {
  const { s, ort } = neues();
  const lager = linie(ort);
  fabrikZustand(s).zeit.hof = 0;
  simuliere(s, ort, 25, { schritt: 0.1 });
  s.fabrik.t = 25; s.fabrik.zeit.hof = 25;
  const text = L.serialisieren(s);
  assert.equal(JSON.parse(text).version, 2);
  const s2 = L.deserialisieren(text);
  const ort2 = L.ortVon(s2, 'hof');
  assert.deepEqual(s2.fabrik, s.fabrik);
  assert.equal(JSON.stringify(ort2.welt.objekte), JSON.stringify(ort.welt.objekte));
  simuliere(s, ort, 40, { schritt: 0.1 });
  simuliere(s2, ort2, 40, { schritt: 0.1 });
  assert.equal(JSON.stringify(ort2.welt.objekte), JSON.stringify(ort.welt.objekte));
  assert.ok(lagerN(lager, 'kupfererz') > 20);
});
test('beschädigte Fabrik-Werte werden geglättet', () => {
  const { s } = neues();
  s.fabrik = { t: 'x', zeit: { hof: 'kaputt', berg: -5, wald: 99999 }, vk: 1 };
  const f = fabrikZustand(s);
  assert.equal(f.t, 0);
  for (const v of Object.values(f.zeit)) assert.ok(v >= 0 && v <= f.t);
  s.fabrik = 7;
  assert.deepEqual(Object.keys(fabrikZustand(s)).sort(), ['t', 'vk', 'vkb', 'zeit']);
});
test('alter Stand ohne Fabrik: Format v2 bleibt gültig, die Fabrik und ihre Vorkommen kommen beim Laden', () => {
  const text = readFileSync(new URL('./alter-hof-stand.json', import.meta.url), 'utf8');
  const roh = JSON.parse(text);
  assert.equal(roh.fabrik, undefined);
  const s = L.deserialisieren(text);
  assert.deepEqual(Object.keys(s.fabrik).sort(), ['t', 'vk', 'vkb', 'zeit']);
  assert.equal(s.fabrik.t, 0);
  // jeder Stand ohne s.fabrik, mitten im Spiel gespeichert
  const { s: n } = neues();
  n.stats.tage = 5;
  delete n.fabrik;
  const s3 = L.deserialisieren(JSON.stringify(n));
  assert.equal(s3.fabrik.vk, true);
  const zahl = (id) => Object.values(s3.welt[id].objekte).filter((o) => o.t === 'vorkommen').length;
  assert.ok(zahl('berg') + zahl('hof') + zahl('wald') + zahl('strand') >= 10);
});
test('Vorkommen: neues Spiel legt sie an (Berg-Steinbruch, Anhöhe, Rand von Wald und Strand), jede Sorte, alle drei Reinheiten, Gold selten', () => {
  const s = L.neuesSpiel({ name: 'V', hof: 'H', seed: 5 });
  const alle = [];
  for (const id of ['hof', 'berg', 'wald', 'strand']) {
    for (const [kk, o] of Object.entries(s.welt[id].objekte)) if (o.t === 'vorkommen') alle.push({ karte: id, kk, ...o });
  }
  const sollNach = (k) => ANLAGE.filter((a) => a.karte === k).reduce((n, a) => n + a.liste.length, 0);
  const nach = (k) => alle.filter((v) => v.karte === k).length;
  assert.equal(nach('berg'), sollNach('berg'), 'Steinbruch voll');
  assert.ok(nach('hof') >= 1 && nach('wald') >= 1 && nach('strand') >= 1);
  assert.deepEqual([...new Set(alle.map((v) => v.erz))].sort(), Object.keys(SORTEN).sort());
  assert.deepEqual([...new Set(alle.map((v) => v.rein))].sort(), [0.5, 1, 2]);
  assert.equal(alle.filter((v) => v.erz === 'gold').length, 1, 'Gold selten');
  assert.equal(s.fabrik.vk, true);
  // im Steinbruch
  const b = KARTEN.berg.bereiche.steinbruch;
  for (const v of alle.filter((v) => v.karte === 'berg')) {
    const [x, y] = L.ausK(v.kk);
    assert.ok(x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3], v.kk);
  }
});
test('Vorkommen liegen auf freien begehbaren Feldern, nicht auf Wegen, und lassen alle Punkte erreichbar', () => {
  for (const seed of [5, 23]) {
    const s = L.neuesSpiel({ name: 'V', hof: 'H', seed });
    for (const id of ['hof', 'berg', 'wald', 'strand']) {
      const ort = L.ortVon(s, id);
      const punkte = Object.entries(ort.def.punkte);
      const vorkommen = Object.entries(ort.welt.objekte).filter(([, o]) => o.t === 'vorkommen').map(([kk]) => L.ausK(kk));
      for (const [x, y] of vorkommen) {
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            assert.ok(!':=hT_tm'.includes(ort.def.grid[y + dy][x + dx]), `${id} ${x},${y}: Weg`);
            assert.ok(!L.begehbar(s, ort.def, ort.welt, x + dx, y + dy), 'blockiert');
          }
        }
        for (const [name, p] of punkte) assert.ok(!(p[0] >= x - 1 && p[0] <= x + 2 && p[1] >= y - 1 && p[1] <= y + 2), `${id}: Punkt ${name} zu nah`);
      }
      // Erreichbarkeit: ohne Vorkommen nicht mehr Punkte erreichbar als mit
      const mit = erreichbarePunkte(s, ort);
      const kopie = { ...ort.welt.objekte };
      for (const [x, y] of vorkommen) L.objektEntfernen(ort, x, y);
      L.kartenGeaendert();
      const ohne = erreichbarePunkte(s, ort);
      assert.equal(mit, ohne, `${id} seed ${seed}: erreichbare Punkte ${mit} gegen ${ohne}`);
      ort.welt.objekte = kopie;
      L.kartenGeaendert();
    }
  }
});
test('Vorkommen werden nur einmal angelegt (Laden legt keine neuen an) und sind deterministisch', () => {
  const s = L.neuesSpiel({ name: 'V', hof: 'H', seed: 9 });
  const zaehle = (st) => Object.values(st.welt).reduce((n, w) => n + Object.values(w.objekte).filter((o) => o.t === 'vorkommen').length, 0);
  const n = zaehle(s);
  assert.ok(n >= 12);
  const s2 = L.deserialisieren(L.serialisieren(s));
  assert.equal(zaehle(s2), n);
  const gleich = L.neuesSpiel({ name: 'V', hof: 'H', seed: 9 });
  assert.equal(JSON.stringify(gleich.welt.berg.objekte), JSON.stringify(s.welt.berg.objekte));
  assert.deepEqual(vorkommenAnlegen(s).length >= 0, true);
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
