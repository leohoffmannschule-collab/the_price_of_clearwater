// Fabrik Stufe 2: Befunde aus Code-Review und Spieltest (R1–R8, S1–S13). Jeder Test war vor der Behebung rot.
// Aufruf: node test/fabrik-strom-befunde.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/bereiche/inhalt.js';
import { OBJEKT_TYPEN } from '../src/daten.js';
import * as L from '../src/logik.js';
import { S } from '../src/spiel.js';
import { erster, alle } from '../src/system.js';
import { FABRIK } from '../src/bereiche/handwerk/fabrik-daten.js';
import { simuliere, fabrikAenderung, maschineAnnehmen } from '../src/bereiche/handwerk/fabrik-sim.js';
import { fabrikAufheben, bauVorschau, vorschauDrehen, drehungZuruecksetzen, leitungBedienen } from '../src/bereiche/handwerk/fabrik-objekte.js';
import { fabrikZustand, nachholen } from '../src/bereiche/handwerk/fabrik-system.js';
import { maschinenInfo } from '../src/bereiche/handwerk/fabrik-info.js';
import { kabelVerbinden, netzUebersicht, sicherungEin, anschlussStatus, stromNetze } from '../src/bereiche/handwerk/fabrik-strom.js';
import { kabelAnfang, kabelAbbrechen, kabelWaehlen } from '../src/bereiche/handwerk/fabrik-strom-objekte.js';
import { rohrInfo } from '../src/bereiche/handwerk/fabrik-rohre.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.stack?.split('\n').slice(0, 6).join('\n      ') ?? e.message}`);
  }
  S.s = null; S.ort = null;
}

const X0 = 20;
const Y0 = 14;
function neues({ seed = 21, uebergang = false } = {}) {
  const s = L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
  s.spieler.inv = Array(24).fill(null);
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
const mast = (ort, x, y) => setze(ort, x, y, { t: 'strommast' });
const brenner = (ort, x, y, holz = 0) => setze(ort, x, y, { t: 'biomassebrenner', r: 0, ein: holz ? { holz } : {}, aus: {}, f: 0 });
const kraftwerk = (ort, x, y, kohle = 0, wa = 0) => setze(ort, x, y, { t: 'kohlekraftwerk', r: 0, ein: kohle ? { kohle } : {}, aus: {}, f: 0, wa });
const bohrer = (ort, x, y) => setze(ort, x, y, { t: 'erzbohrer', r: 1, erz: 'eisen', rein: 1, ein: {}, aus: {}, f: 0 });
const lager = (ort, x, y) => setze(ort, x, y, { t: 'lager', r: 1, inv: Array(48).fill(null) });
const pumpe = (ort, x, y) => setze(ort, x, y, { t: 'wasserpumpe', st: 'x' });
const rohr = (ort, x, y, mk = 1) => setze(ort, x, y, { t: 'rohrleitung', ...(mk > 1 ? { mk } : {}), fl: 0 });
const band = (ort, x, y, r = 1, mk = 1) => setze(ort, x, y, { t: 'foerderband', r, w: [], ...(mk > 1 ? { mk } : {}) });
const kk = (x, y) => L.k(x, y);
function kabel(s, ort, a, b) {
  L.hinzufuegen(s, { id: 'stromkabel', n: 20 });
  const e = kabelVerbinden(s, ort, a, b);
  assert.ok(e.ok, e.grund);
}
const nahe = (a, b, t) => Math.abs(a - b) <= t;

console.log('\nMuss');

test('R1: ein Kraftwerk an zwei getrennten Rohrnetzen bekommt aus beiden Wasser (zwei Pumpen: 240 m³/min)', () => {
  const { s, ort } = neues({ uebergang: true });
  const kw = kraftwerk(ort, 10, 10, 0, 0);
  rohr(ort, 9, 11); pumpe(ort, 8, 11);
  rohr(ort, 13, 11); pumpe(ort, 14, 11);
  simuliere(s, ort, 10, { schritt: 0.1 });
  assert.ok(nahe(kw.wa, 40, 0.5), `Tank nach 10 s: ${kw.wa}`);
  for (const r of ['9,11', '13,11']) assert.equal(rohrInfo(s, ort, r).verbraucher.length, 1, r);
  // eine Pumpe zwischen zwei Netzen speist beide
  const t = neues({ uebergang: true });
  const a = kraftwerk(t.ort, 4, 10, 0, 0);
  const b = kraftwerk(t.ort, 12, 10, 0, 0);
  rohr(t.ort, 7, 11); pumpe(t.ort, 8, 11); rohr(t.ort, 9, 11); rohr(t.ort, 10, 11); rohr(t.ort, 11, 11);
  simuliere(t.s, t.ort, 6, { schritt: 0.1 });
  assert.ok(a.wa > 3 && b.wa > 3, `beide bekommen Wasser: ${a.wa}, ${b.wa}`);
  assert.ok(nahe(a.wa + b.wa + rohrInfo(t.s, t.ort, '7,11').inhalt + rohrInfo(t.s, t.ort, '10,11').inhalt, 12, 0.2), 'Pumpe fördert 120 m³/min, nicht doppelt');
});
test('R2: einen Generator mitten im Brennen aufheben gibt das brennende Stück nicht zurück', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 0);
  g.ein = { hartholz: 1 };
  mast(ort, X0 + 4, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  for (const [x, y] of [[X0 + 6, Y0 - 2], [X0 + 6, Y0 + 1], [X0 + 2, Y0 + 4]]) { bohrer(ort, x, y); kabel(s, ort, kk(X0 + 4, Y0), kk(x, y)); }
  simuliere(s, ort, 5, { schritt: 0.1 });
  assert.equal(g.arb, 'hartholz');
  g.ein.holz = 2;
  s.spieler.inv = Array(24).fill(null);
  const erg = L.neuesErgebnis();
  fabrikAufheben({ s, ort, x: X0, y: Y0, o: g, erg });
  assert.equal(L.anzahl(s, 'hartholz'), 0, 'das brennende Hartholz ist weg');
  assert.equal(L.anzahl(s, 'holz'), 2, 'unverbrannter Vorrat kommt zurück');
  // gewöhnliche Maschinen geben angefangene Arbeit weiter zurück (Stufe 1)
  const t = neues();
  const sm = setze(t.ort, X0, Y0, { t: 'schmelzer', r: 1, ein: {}, aus: {}, f: 1, arb: 'eisenbarren' });
  fabrikAufheben({ s: t.s, ort: t.ort, x: X0, y: Y0, o: sm, erg: L.neuesErgebnis() });
  assert.equal(L.anzahl(t.s, 'eisenerz'), 5);
});
test('R4: Doku und Fenster versprechen nicht, dass ein Wasserrad allein das Kraftwerk anfährt', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const fenster = readFileSync(new URL('../src/bereiche/handwerk/fabrik-strom-fenster.js', import.meta.url), 'utf8');
  assert.ok(!/Biomasse-Brenner oder Wasserrad im selben Netz an/.test(readme));
  assert.ok(!/einen Biomasse-Brenner oder ein Wasserrad ins Netz/.test(fenster));
  assert.match(readme, /vier Wasserräder/);
  // und es stimmt: drei Wasserräder (18 MW) reichen nicht für die Pumpe (20 MW), vier (24 MW) schon
  for (const [n, geht] of [[3, false], [4, true]]) {
    const { s, ort } = neues();
    for (let x = 10; x < 14; x++) rohr(ort, x, 10);
    pumpe(ort, 10, 9);
    const kw = kraftwerk(ort, 14, 9, 20, 0);
    mast(ort, 12, 14); kabel(s, ort, kk(12, 14), kk(10, 9)); kabel(s, ort, kk(12, 14), kk(14, 9));
    let vor = [12, 14];
    for (let i = 0; i < n; i++) { const p = [8 + i * 2, 16]; setze(ort, ...p, { t: 'wasserrad', st: 'x' }); kabel(s, ort, kk(...vor), kk(...p)); vor = p; }
    simuliere(s, ort, 30, { schritt: 0.1 });
    assert.equal(kw.wa > 1, geht, `${n} Wasserräder`);
  }
});
test('R5: 30 Pumpen an 2232 Rohren, mit Mk3-Band: 600 s Nachholen unter 0,5 s', () => {
  for (const mk3 of [false, true]) {
    const { s, ort } = neues();
    for (let y = 4; y < 60; y += 2) for (let x = 2; x < 78; x++) rohr(ort, x, y);
    for (let x = 2; x < 78; x++) rohr(ort, x, 3);
    for (let y = 3; y < 60; y++) rohr(ort, 2, y);
    for (let i = 0; i < 30; i++) pumpe(ort, 3 + i, 2);
    for (let i = 0; i < 30; i += 3) {
      setze(ort, 3 + i, 1, { t: 'strommast' });
      for (let j = i; j < Math.min(i + 3, 30); j++) kabel(s, ort, kk(3 + i, 1), kk(3 + j, 2));
    }
    if (mk3) band(ort, 40, 61, 1, 3);
    s.fabrik.zeit.hof = 0;
    s.fabrik.t = 600;
    const t0 = performance.now();
    nachholen(s, ort);
    const ms = performance.now() - t0;
    console.log(`      Mk3=${mk3}: ${ms.toFixed(0)} ms`);
    assert.ok(ms < 500, `${ms.toFixed(0)} ms`);
  }
});
test('S1: Generatoren nehmen Brennstoff an allen vier Seiten an, die Vorschau zeigt keinen Ausgang', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 0); // r = 0: „vorn" ist oben
  for (let d = 0; d < 4; d++) assert.ok(maschineAnnehmen(g, { id: 'holz' }, d), `Seite ${d}`);
  // Band von oben (zeigt nach unten in die Vorderseite)
  const b = band(ort, X0, Y0 - 1, 2);
  b.w.push({ id: 'holz', p: 0.9 });
  simuliere(s, ort, 1, { schritt: 0.1 });
  assert.equal(b.w.length, 0);
  assert.equal(g.ein.holz, 5);
  assert.equal(bauVorschau(s, ort, X0 + 5, Y0, 'rechts', { id: 'biomassebrenner', n: 1 }).t, 'biomassebrenner');
  const info = maschinenInfo(setze(ort, X0 + 8, Y0, { t: 'schmelzer', r: 1, ein: {}, aus: {}, f: 0 }), s);
  assert.match(info.eingang, /hinten/);
});
test('S2: mit dem Stromkabel in der Hand verlegt die Aktion (auch Antippen) Kabel; leere Felder und Bänder verwerfen den Anfang nicht; Werkzeugwechsel bricht ab', () => {
  const { s, ort } = neues();
  kabelAbbrechen();
  mast(ort, X0, Y0);
  mast(ort, X0 + 6, Y0);
  band(ort, X0 + 3, Y0 + 2);
  s.spieler.inv[0] = { id: 'stromkabel', n: 30 };
  s.spieler.wahl = 0;
  S.s = s; S.ort = ort;
  const ctx = (x, y) => ({ s, ort, x, y, f: { x: x - 1, y }, slot: s.spieler.inv[0], idx: 0, S });
  assert.match(erster('hinweis', ctx(X0, Y0)), /Kabel/);
  assert.notEqual(erster('interagieren', ctx(X0, Y0)), undefined, 'Aktion auf den Mast: Kabelanfang statt Netzfenster');
  assert.equal(kabelAnfang()?.kk, kk(X0, Y0));
  erster('interagieren', ctx(X0 + 2, Y0 + 5)); // leeres Feld
  erster('interagieren', ctx(X0 + 3, Y0 + 2)); // Band
  assert.equal(kabelAnfang()?.kk, kk(X0, Y0), 'der Anfang bleibt');
  assert.match(kabelWaehlen(s, ort, X0 + 3, Y0 + 2).grund, /Anschluss|Kabel/);
  erster('interagieren', ctx(X0 + 6, Y0));
  assert.equal(netzUebersicht(s, ort, kk(X0, Y0)).kabel, 1, 'Kabel verlegt');
  erster('interagieren', ctx(X0 + 6, Y0));
  assert.ok(kabelAnfang());
  s.spieler.wahl = 1; // anderes Werkzeug
  alle('update', 0.016);
  assert.equal(kabelAnfang(), null, 'Werkzeugwechsel bricht ab');
  // ohne Kabel in der Hand: Aktion öffnet das Netzfenster wie bisher
  assert.equal(erster('interagieren', { ...ctx(X0, Y0), slot: null }), undefined);
});
test('S3: Anlauf des Kraftwerks im bestehenden Netz – Pumpen haben Vorrang, keine Sicherungsfalle', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 100);
  const m = kk(X0 + 4, Y0);
  mast(ort, X0 + 4, Y0);
  const m2 = kk(X0 + 10, Y0);
  mast(ort, X0 + 10, Y0);
  kabel(s, ort, kk(X0, Y0), m);
  kabel(s, ort, m, m2);
  const bs = [];
  for (const [x, y] of [[X0 + 6, Y0 - 3], [X0 + 6, Y0 + 2], [X0 + 12, Y0 - 3]]) { bs.push(bohrer(ort, x, y)); lager(ort, x + 2, y); kabel(s, ort, x < X0 + 10 ? m : m2, kk(x, y)); }
  const p = pumpe(ort, X0 + 3, Y0 + 5);
  for (let x = X0 + 4; x <= X0 + 7; x++) rohr(ort, x, Y0 + 5);
  const kw = kraftwerk(ort, X0 + 8, Y0 + 4, 30, 0);
  kabel(s, ort, m2, kk(X0 + 3, Y0 + 5));
  kabel(s, ort, m2, kk(X0 + 8, Y0 + 4));
  simuliere(s, ort, 0.1, { schritt: 0.1 }); // ein Schritt: der Tank ist noch leer
  let u = netzUebersicht(s, ort, m);
  assert.ok(!g.fl, 'keine Sicherung');
  assert.equal(u.status, 'vorrang');
  assert.equal(p.st, 'a', 'die Pumpe läuft');
  assert.ok(bs.every((b) => b.st === 'x'), 'die Bohrer warten');
  assert.match(anschlussStatus(s, ort, kk(X0 + 6, Y0 - 3)).text, /Pumpen haben Vorrang/);
  simuliere(s, ort, 20, { schritt: 0.1 });
  assert.ok(kw.wa > 1);
  u = netzUebersicht(s, ort, m);
  assert.equal(u.status, 'an');
  assert.ok(bs.every((b) => b.st === 'a' || b.st === 'v'));
  // ohne Pumpe im Netz fliegt die Sicherung wie bisher; der Text sagt, wenn die Leistung wieder reicht
  const t = neues();
  const g2 = brenner(t.ort, X0, Y0, 100);
  setze(t.ort, X0 + 4, Y0, { t: 'strommast' });
  kabel(t.s, t.ort, kk(X0, Y0), kk(X0 + 4, Y0));
  const viele = [];
  for (const [x, y] of [[X0 + 6, Y0 - 3], [X0 + 6, Y0 + 1], [X0 + 2, Y0 + 3]]) { viele.push(setze(t.ort, x, y, { t: 'assembler', r: 1, rez: 'maschinenteil', ein: { eisenplatte: 6, kupferdraht: 9 }, aus: {}, f: 0 })); kabel(t.s, t.ort, kk(X0 + 4, Y0), kk(x, y)); }
  simuliere(t.s, t.ort, 1, { schritt: 0.1 });
  assert.ok(g2.fl);
  assert.match(sicherungEin(t.s, t.ort, kk(X0, Y0)).text, /fliegt sofort wieder/);
  for (const a of viele.slice(1)) { a.ein = {}; }
  const u2 = netzUebersicht(t.s, t.ort, kk(X0, Y0));
  assert.equal(u2.status, 'sicherung');
  assert.match(u2.rat, /Leistung reicht jetzt/);
});
test('S4: ein Schmelzer an einem reinen Kohleband nimmt nur ein Vielfaches seiner Grenze an', () => {
  const { s, ort } = neues({ uebergang: true });
  const q = lager(ort, X0, Y0);
  q.inv[0] = { id: 'kohle', n: 200 };
  band(ort, X0 + 2, Y0);
  const sm = setze(ort, X0 + 3, Y0, { t: 'schmelzer', r: 1, ein: {}, aus: {}, f: 0 });
  simuliere(s, ort, 120, { schritt: 0.1 });
  assert.ok(sm.ein.kohle <= 12, `Kohle im Eingang: ${sm.ein.kohle}`);
  assert.ok(sm.ein.kohle >= 4);
});
test('S7: Morgenbericht warnt ab zwei Tagen Rest vor dem Ende des Übergangsstroms, mit der Zahl der Maschinen ohne Netz', () => {
  const { s, ort } = neues({ uebergang: true });
  bohrer(ort, X0, Y0);
  bohrer(ort, X0 + 4, Y0);
  s.fabrik.strom.frist = L.tagNr(s.zeit) + 2;
  s.zeit.minute = 1300;
  let b = L.tagBeenden(s, { r: () => 0.5 });
  assert.ok(b.meldungen.some((z) => /Noch 2 Tage Übergangsstrom/.test(z) && /2 Maschinen/.test(z)), b.meldungen.join(' | '));
  s.zeit.minute = 1300;
  b = L.tagBeenden(s, { r: () => 0.5 });
  assert.ok(b.meldungen.some((z) => /letzte Tag/.test(z)), b.meldungen.join(' | '));
});

console.log('\nSoll');

test('R3: die Durchfluss-Anzeige zeigt auch live (1/60 s) den echten Durchfluss', () => {
  const { s, ort } = neues({ uebergang: true });
  for (let x = 10; x < 14; x++) rohr(ort, x, 10).fl = 1;
  pumpe(ort, 10, 9);
  const kw = kraftwerk(ort, 14, 9, 0, 50);
  for (let t = 0; t < 120; t += 1 / 60) { kw.wa = Math.max(0, kw.wa - 0.75 / 60); simuliere(s, ort, 1 / 60, { schritt: 1 / 60 }); }
  const i = rohrInfo(s, ort, '11,10');
  assert.ok(nahe(i.zufluss, 45, 5) && nahe(i.abfluss, 45, 5), `${i.zufluss} / ${i.abfluss}`);
});
test('R6: Sicherung einschalten ohne Brennstoff meldet „kein Brennstoff", nicht „fliegt wieder"', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 0);
  g.fl = 1;
  bohrer(ort, X0 + 4, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  const e = sicherungEin(s, ort, kk(X0, Y0));
  assert.ok(e.ok && !e.flog);
  assert.match(e.text, /Brennstoff/);
});
test('R7: ein gewählter Kabelanfang gilt nicht in einem anderen Spielstand', () => {
  const a = neues();
  mast(a.ort, X0, Y0);
  assert.ok(kabelWaehlen(a.s, a.ort, X0, Y0).start);
  const b = neues();
  assert.equal(kabelAnfang(b.s), null);
});
test('R8: Rohre speichern kurz (gerundet, Durchfluss am Netz statt in jedem Rohr)', () => {
  const { s, ort } = neues({ uebergang: true });
  for (let x = 10; x < 30; x++) rohr(ort, x, 10);
  pumpe(ort, 10, 9);
  kraftwerk(ort, 30, 9, 0, 0);
  simuliere(s, ort, 7.3, { schritt: 0.1 });
  const roh = Object.values(ort.welt.objekte).filter((o) => o.t === 'rohrleitung').map((o) => JSON.stringify(o));
  const bytes = roh.reduce((n, x) => n + x.length, 0) / roh.length;
  assert.ok(bytes < 32, `${bytes} Bytes je Rohr: ${roh[3]}`);
});
test('S5: der Brenner ist Reserve – reicht das Kraftwerk, verbrennt er kein Holz', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 20);
  const kw = kraftwerk(ort, X0 + 4, Y0, 30, 50);
  mast(ort, X0 + 8, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 8, Y0));
  kabel(s, ort, kk(X0 + 4, Y0), kk(X0 + 8, Y0));
  bohrer(ort, X0 + 10, Y0); lager(ort, X0 + 12, Y0);
  kabel(s, ort, kk(X0 + 8, Y0), kk(X0 + 10, Y0));
  simuliere(s, ort, 30, { schritt: 0.1 });
  assert.equal(g.ein.holz, 20, 'Holz unberührt');
  assert.ok(!g.arb);
  assert.ok(kw.ein.kohle < 30);
  const u = netzUebersicht(s, ort, kk(X0 + 8, Y0));
  assert.ok(u.gens.find((x) => x.o === g).reserve, 'Brenner als Reserve markiert');
});
test('S6: die Pumpe zieht Strom nach Förderung (45 von 120 m³/min → 7,5 MW)', () => {
  const { s, ort } = neues();
  setze(ort, X0, Y0, { t: 'wasserrad', st: 'x' });
  for (let i = 1; i < 6; i++) { setze(ort, X0 + i * 2, Y0, { t: 'wasserrad', st: 'x' }); kabel(s, ort, kk(X0 + (i - 1) * 2, Y0), kk(X0 + i * 2, Y0)); }
  pumpe(ort, X0, Y0 + 3);
  kabel(s, ort, kk(X0, Y0), kk(X0, Y0 + 3));
  for (let x = X0 + 1; x < X0 + 4; x++) rohr(ort, x, Y0 + 3);
  const kw = kraftwerk(ort, X0 + 4, Y0 + 2, 0, 50);
  for (let t = 0; t < 60; t += 0.1) { kw.wa = Math.max(0, kw.wa - 0.075); simuliere(s, ort, 0.1, { schritt: 0.1 }); }
  const u = netzUebersicht(s, ort, kk(X0, Y0));
  assert.ok(nahe(u.info.bedarf, 7.5, 0.6), `Bedarf ${u.info.bedarf}`);
});
test('S8: bei geflogener Sicherung steht in der Liste „steht (Sicherung)" statt „arbeitet"', () => {
  const { s, ort } = neues();
  const g = brenner(ort, X0, Y0, 10);
  bohrer(ort, X0 + 4, Y0);
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  g.fl = 1;
  simuliere(s, ort, 1, { schritt: 0.1 });
  const v = netzUebersicht(s, ort, kk(X0, Y0)).verb[0];
  assert.equal(v.zustand, 'steht (Sicherung)');
});
test('S10: Komma statt Punkt in Durchsatz und Reinheit', () => {
  const { s, ort } = neues();
  const b = setze(ort, X0, Y0, { t: 'erzbohrer', r: 1, erz: 'eisen', rein: 0.5, ein: {}, aus: {}, f: 0, dr: 12.5 });
  const i = maschinenInfo(b, s);
  assert.ok(i.zeilen.some(([z, w]) => z === 'Vorkommen' && /0,5×/.test(w)), JSON.stringify(i.zeilen));
  assert.equal(i.durchsatzText, '12,5');
});
test('S11: der Morgenbericht nennt den Grund der Überlast', () => {
  const { s, ort } = neues();
  brenner(ort, X0, Y0, 100);
  setze(ort, X0 + 4, Y0, { t: 'strommast' });
  kabel(s, ort, kk(X0, Y0), kk(X0 + 4, Y0));
  for (const [x, y] of [[X0 + 6, Y0 - 3], [X0 + 6, Y0 + 1], [X0 + 2, Y0 + 3]]) { setze(ort, x, y, { t: 'assembler', r: 1, rez: 'maschinenteil', ein: { eisenplatte: 6, kupferdraht: 9 }, aus: {}, f: 0 }); kabel(s, ort, kk(X0 + 4, Y0), kk(x, y)); }
  s.zeit.minute = 1300;
  const b = L.tagBeenden(s, { r: () => 0.5 });
  assert.ok(b.meldungen.some((z) => /Sicherung/.test(z) && /45 MW/.test(z) && /30 MW/.test(z)), b.meldungen.join(' | '));
});
test('S13: die Richtung lässt sich vor dem Legen drehen (Vorschau und Aufstellen), Drehen meldet die neue Richtung', () => {
  const { s, ort } = neues();
  drehungZuruecksetzen();
  assert.equal(bauVorschau(s, ort, X0, Y0, 'rechts', { id: 'foerderband', n: 1 }).r, 1);
  vorschauDrehen();
  assert.equal(bauVorschau(s, ort, X0, Y0, 'rechts', { id: 'foerderband', n: 1 }).r, 2);
  drehungZuruecksetzen();
  const b = band(ort, X0, Y0, 1);
  const meld = [];
  const alt = S.hooks.meldung;
  S.hooks.meldung = (t) => meld.push(t);
  leitungBedienen({ ort, x: X0, y: Y0, o: b });
  leitungBedienen({ ort, x: X0, y: Y0, o: b });
  S.hooks.meldung = alt;
  assert.ok(/zeigt jetzt unten/.test(meld[meld.length - 1]), meld.join(' | '));
});
void stromNetze; void FABRIK; void OBJEKT_TYPEN;

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`);
process.exit(fehlgeschlagen ? 1 : 0);
