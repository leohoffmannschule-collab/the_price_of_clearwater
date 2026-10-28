// Bereich „pflanzen": Feldfrüchte (Wachstum, Nachwachsen, Rankhilfe, Dünger, Jahreszeitwechsel),
// Riesenpflanzen, Obstbäume, Wildbäume aus Samen, hohes Gras, Sammelfunde, Wildsamen, Läden.
// Aufruf: node test/pflanzen.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { ITEMS, PFLANZEN, BAUM_ARTEN, OBJEKT_TYPEN, REZEPTE, JZ, TAGE_PRO_JZ } from '../src/daten.js';
import { karte, raster, rahmen, fertigRaster } from '../src/karten.js';
import { system } from '../src/system.js';
import * as L from '../src/logik.js';
import { riesenNacht, RIESE_HP } from '../src/bereiche/pflanzen/riesen.js';
import { obstNacht, OBSTBAEUME } from '../src/bereiche/pflanzen/obstbaeume.js';
import { baeumeNacht, baumSaeen } from '../src/bereiche/pflanzen/baeume.js';
import { grasNacht, grasSetzen } from '../src/bereiche/pflanzen/gras.js';
import { streuen, feuchteHalten } from '../src/bereiche/pflanzen/duenger.js';
import { wildSaeen } from '../src/bereiche/pflanzen/inhalt.js';
import { FRUECHTE } from '../src/bereiche/pflanzen/feldfruechte.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
karte({ id: 'testwald', name: 'Testwald', aussen: true, grid: fertigRaster(rahmen(raster(10, 8, '.'), '#')) });
karte({ id: 'pfl_acker', name: 'Pflanzacker', aussen: true, farmbar: true, wasser: 'teich', npcWege: false, grid: fertigRaster(rahmen(raster(24, 16, '.'), '#')) });
karte({ id: 'pfl_glas', name: 'Glashaus', aussen: false, farmbar: true, ganzjaehrig: true, npcWege: false, grid: fertigRaster(rahmen(raster(12, 10, '.'), '#')) });
karte({ id: 'pfl_wiese', name: 'Wiese', aussen: true, npcWege: false, sammel: [{ x: 1, y: 1, w: 10, h: 8, art: 'wiese', max: 0 }], grid: fertigRaster(rahmen(raster(12, 10, '.'), '#')) });
const acker = (s) => L.ortVon(s, 'pfl_acker');
const idx = (s, id) => s.spieler.inv.findIndex((i) => i?.id === id);
const geben = (s, id, n = 1) => { L.hinzufuegen(s, { id, n }); return idx(s, id); };
/** Eine Nacht nur mit dem Wachstum des Kerns (gegossen), ohne Zufall. */
function gegosseneNacht(s, ort, felder, r = () => 0.99) {
  for (const kk of felder) if (ort.welt.felder[kk]) ort.welt.felder[kk].nass = true;
  s.zeit.morgen = 'sonne';
  L.tagBeenden(s, { r });
}
let gemaeht = 0;
system({ name: 'test-gras', grasGemaeht: () => { gemaeht++; } });

console.log('\nPflanzen: Daten');
test('rund 40 Feldfrüchte über Frühling, Sommer und Herbst, jede mit Saat und Sorte', () => {
  assert.ok(FRUECHTE.length >= 40, `${FRUECHTE.length} Feldfrüchte`);
  for (const jz of ['fruehling', 'sommer', 'herbst']) assert.ok(FRUECHTE.filter((f) => f[6].includes(jz)).length >= 12, jz);
  for (const [id] of FRUECHTE) {
    const p = PFLANZEN[id];
    assert.ok(p && ITEMS[p.saat]?.kauf > 0 && ITEMS[id].preis > 0, id);
    assert.ok(['gemuese', 'obst', 'blume', 'getreide', 'kraut', 'pilz'].includes(ITEMS[id].sorte), id);
  }
  for (const id of ['bohne', 'erbse', 'hopfen', 'trauben']) assert.ok(PFLANZEN[id].rankhilfe, id);
  for (const id of ['blumenkohl', 'melone', 'kuerbis']) assert.ok(PFLANZEN[id].riesig, id);
  assert.ok(PFLANZEN.mais.jz.length === 2 && PFLANZEN.weizen.jz.length === 2);
});
test('jede Ernte trägt eine Sorte', () => {
  for (const it of Object.values(ITEMS)) if (it.kat === 'ernte') assert.ok(['gemuese', 'obst', 'blume', 'getreide', 'kraut', 'pilz'].includes(it.sorte), it.id);
  assert.equal(ITEMS.blaubeere.sorte, 'obst');
  assert.equal(ITEMS.pastinake.sorte, 'gemuese');
});
test('Sammelfunde: jede Zonenart hat in jeder Jahreszeit mindestens zwei Funde', () => {
  for (const art of ['wiese', 'wald', 'strand', 'berg', 'dorf', 'geheimwald']) {
    for (const jz of JZ) assert.ok(L.sammelPool(art, jz).length >= 2, `${art} im ${jz}: ${L.sammelPool(art, jz)}`);
  }
  assert.ok(L.sammelPool('geheimwald', 'herbst').includes('fliegenpilz'));
  assert.ok(L.sammelPool('strand', 'sommer').includes('regenbogenmuschel'));
  assert.ok(!L.sammelPool('strand', 'fruehling').includes('regenbogenmuschel'));
});
test('Sammelfunde wachsen in ihrer Zone (Wiese im Frühling)', () => {
  const s = neues(30);
  s.zeit.jz = 0;
  const def = karte({ id: 'pfl_wiese2', name: 'Wiese 2', aussen: true, npcWege: false, sammel: [{ x: 1, y: 1, w: 10, h: 8, art: 'wiese', max: 6 }], grid: fertigRaster(rahmen(raster(12, 10, '.'), '#')) });
  L.sammelSpawnen(s, def.id, () => 0.37, 6);
  const funde = Object.values(L.welt(s, def.id).objekte).filter((o) => o.t === 'sammel');
  assert.ok(funde.length > 0);
  for (const o of funde) assert.ok(L.sammelPool('wiese', 'fruehling').includes(o.id), o.id);
});
test('Saatgut der Jahreszeit, Dünger und Setzlinge bei Ottilie, Grassamen auf der Ranch', () => {
  const s = neues(15);
  const ware = L.ladenWare(s, 'laden');
  assert.ok(ware.some((w) => w.id === 'blumenkohl_saat'));
  assert.ok(ware.some((w) => w.id === 'kaffeebohne_saat'), 'Kaffee im Frühling');
  assert.ok(!ware.some((w) => w.id === 'melone_saat'));
  for (const id of ['duenger', 'qualitaetsduenger', 'beschleuniger', 'feuchteerde', 'kirschesetzling', 'apfelsetzling']) assert.ok(ware.some((w) => w.id === id), id);
  s.zeit.jz = 1;
  const sommer = L.ladenWare(s, 'laden');
  assert.ok(sommer.some((w) => w.id === 'melone_saat') && sommer.some((w) => w.id === 'mais_saat'));
  assert.ok(!sommer.some((w) => w.id === 'blumenkohl_saat'));
  assert.ok(L.ladenWare(s, 'ranch').some((w) => w.id === 'grassamen'), 'Grassamen bei Wilma');
});

console.log('\nPflanzen: Feld');
test('Pflanzen wachsen nur gegossen, reifen nach ihren Tagen und tragen nach', () => {
  const s = neues(40);
  s.zeit.jz = 0;
  const ort = acker(s);
  L.hacken(s, ort, [[3, 3]]);
  assert.ok(L.saeen(s, ort, 3, 3, geben(s, 'erdbeere_saat')).ok);
  const kk = L.k(3, 3);
  for (let i = 0; i < PFLANZEN.erdbeere.tage; i++) { assert.ok(!L.reif(ort.welt.felder[kk]), `Tag ${i}`); s.zeit.tag = 2; gegosseneNacht(s, ort, [kk]); }
  assert.ok(L.reif(ort.welt.felder[kk]));
  const n = L.anzahl(s, 'erdbeere');
  assert.ok(L.ernten(s, ort, 3, 3, () => 0.5).ok);
  assert.ok(L.anzahl(s, 'erdbeere') > n);
  assert.equal(ort.welt.felder[kk].pflanze.tage, PFLANZEN.erdbeere.tage - PFLANZEN.erdbeere.nach, 'trägt nach');
  for (let i = 0; i < PFLANZEN.erdbeere.nach; i++) { s.zeit.tag = 2; gegosseneNacht(s, ort, [kk]); }
  assert.ok(L.reif(ort.welt.felder[kk]), 'wieder reif');
});
test('Rankhilfen versperren ihr Beet ab dem ersten Tag', () => {
  const s = neues(41);
  s.zeit.jz = 0;
  const ort = acker(s);
  L.hacken(s, ort, [[5, 5]]);
  assert.ok(L.begehbar(s, ort.def, ort.welt, 5, 5));
  L.saeen(s, ort, 5, 5, geben(s, 'bohne_saat'));
  assert.ok(!L.begehbar(s, ort.def, ort.welt, 5, 5));
});
test('Jahreszeitwechsel: Frühlingspflanzen welken, Mais (Sommer und Herbst) nicht, im Glashaus nichts', () => {
  const s = neues(42);
  s.zeit.jz = 1;
  s.zeit.tag = TAGE_PRO_JZ;
  const ort = acker(s);
  ort.welt.felder[L.k(2, 2)] = { nass: true, pflanze: { id: 'mais', tage: 3 } };
  ort.welt.felder[L.k(3, 2)] = { nass: true, pflanze: { id: 'melone', tage: 3 } };
  const glas = L.ortVon(s, 'pfl_glas');
  glas.welt.felder[L.k(2, 2)] = { nass: true, pflanze: { id: 'melone', tage: 3 } };
  L.tagBeenden(s, { r: () => 0.99 });
  assert.equal(L.jahreszeit(s), 'herbst');
  assert.ok(!ort.welt.felder[L.k(2, 2)].pflanze.tot, 'Mais lebt');
  assert.ok(ort.welt.felder[L.k(3, 2)].pflanze.tot, 'Melone welkt');
  assert.ok(!glas.welt.felder[L.k(2, 2)].pflanze.tot, 'Glashaus');
});

console.log('\nPflanzen: Dünger');
test('Wachstumsbeschleuniger: die Pflanze reift früher', () => {
  const s = neues(43);
  s.zeit.jz = 0;
  const ort = acker(s);
  L.hacken(s, ort, [[2, 6], [3, 6]]);
  assert.ok(streuen(s, ort, 3, 6, geben(s, 'turbobeschleuniger')).ok);
  assert.ok(streuen(s, ort, 3, 6, geben(s, 'duenger')).grund, 'nur ein Mittel je Beet');
  L.saeen(s, ort, 2, 6, geben(s, 'blumenkohl_saat'));
  L.saeen(s, ort, 3, 6, geben(s, 'blumenkohl_saat'));
  let tage = 0;
  while (!L.reif(ort.welt.felder[L.k(3, 6)]) && tage < 20) { s.zeit.tag = 2; gegosseneNacht(s, ort, [L.k(2, 6), L.k(3, 6)]); tage++; }
  assert.equal(tage, Math.ceil(PFLANZEN.blumenkohl.tage * 0.75));
  assert.ok(!L.reif(ort.welt.felder[L.k(2, 6)]), 'ohne Beschleuniger noch nicht reif');
});
test('Qualitätsdünger hebt die Qualität, Feuchteerde hält Beete nass', () => {
  const s = neues(44);
  const ort = acker(s);
  L.hacken(s, ort, [[7, 7], [8, 7]]);
  assert.ok(streuen(s, ort, 7, 7, geben(s, 'qualitaetsduenger')).ok);
  assert.equal(ort.welt.felder[L.k(7, 7)].duenger, 'qualitaet');
  let summe = 0;
  for (let i = 0; i < 40; i++) {
    s.zeit.tag = 1 + (i % 28);
    ort.welt.felder[L.k(7, 7)].pflanze = { id: 'pastinake', tage: 4 };
    summe += L.ernten(s, ort, 7, 7, () => 0.99).items[0].q || 0;
  }
  assert.ok(summe > 0, 'mindestens einmal besser als normal');
  assert.ok(streuen(s, ort, 8, 7, geben(s, 'gute_feuchteerde')).ok);
  ort.welt.felder[L.k(8, 7)].nass = false;
  feuchteHalten(s, () => 0.1);
  assert.ok(ort.welt.felder[L.k(8, 7)].nass);
});

console.log('\nPflanzen: Riesen');
test('3×3 reife Melonen verschmelzen zur Riesenmelone, die Axt fällt sie für viele Melonen', () => {
  const s = neues(45);
  s.zeit.jz = 1;
  const ort = acker(s);
  for (let y = 4; y < 7; y++) for (let x = 10; x < 13; x++) ort.welt.felder[L.k(x, y)] = { pflanze: { id: 'melone', tage: PFLANZEN.melone.tage } };
  ort.welt.felder[L.k(13, 4)] = { pflanze: { id: 'melone', tage: 2 } };
  assert.equal(riesenNacht(s, null, () => 0.99), 0, 'mit Pech nichts');
  assert.equal(riesenNacht(s, { meldungen: [] }, () => 0), 1);
  const o = ort.welt.objekte[L.k(10, 4)];
  assert.equal(o.t, 'pflanzen_riese');
  assert.equal(ort.welt.objekte[L.k(12, 6)].t, 'teil');
  assert.ok(!ort.welt.felder[L.k(11, 5)].pflanze, 'Pflanzen sind aufgegangen');
  assert.ok(!L.begehbar(s, ort.def, ort.welt, 11, 5));
  const vorher = L.anzahl(s, 'melone');
  let erg;
  for (let i = 0; i < RIESE_HP; i++) erg = L.axtHieb(s, ort, 12, 6, () => 0.5);
  assert.ok(erg.riese);
  assert.ok(L.anzahl(s, 'melone') + ort.welt.funde.reduce((n, f) => n + f.slot.n, 0) - vorher >= 15);
  assert.ok(!ort.welt.objekte[L.k(11, 5)], 'alle Teile weg');
  assert.ok(L.begehbar(s, ort.def, ort.welt, 11, 5));
});
test('Riesen wachsen nicht im Glashaus und nicht aus unreifen Pflanzen', () => {
  const s = neues(46);
  const glas = L.ortVon(s, 'pfl_glas');
  for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) glas.welt.felder[L.k(x, y)] = { pflanze: { id: 'kuerbis', tage: 99 } };
  const ort = acker(s);
  for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) ort.welt.felder[L.k(x, y)] = { pflanze: { id: 'kuerbis', tage: x === 3 && y === 3 ? 4 : PFLANZEN.kuerbis.tage } };
  assert.equal(riesenNacht(s, null, () => 0), 0);
});

console.log('\nPflanzen: Obstbäume');
test('Setzling braucht freie Nachbarn, wächst 28 Tage und trägt in seiner Jahreszeit bis zu drei Früchte', () => {
  const s = neues(47);
  s.zeit.jz = 0;
  const ort = acker(s);
  ort.welt.objekte[L.k(4, 10)] = { t: 'stein', hp: 2 };
  assert.match(L.aufstellen(s, ort, 5, 10, geben(s, 'kirschesetzling')).grund, /frei/);
  assert.ok(L.aufstellen(s, ort, 15, 10, idx(s, 'kirschesetzling')).ok);
  assert.match(L.aufstellen(s, L.ortVon(s, 'testwald'), 3, 3, geben(s, 'apfelsetzling')).grund, /Hof/);
  const o = ort.welt.objekte[L.k(15, 10)];
  assert.equal(o.art, 'kirsche');
  assert.ok(!L.begehbar(s, ort.def, ort.welt, 15, 10));
  ort.welt.objekte[L.k(16, 11)] = { t: 'ast' };
  obstNacht(s, false);
  assert.equal(o.tage, 0, 'eingeengt wächst er nicht');
  delete ort.welt.objekte[L.k(16, 11)];
  for (let i = 0; i < 28; i++) obstNacht(s, false);
  assert.equal(o.tage, 28);
  assert.equal(o.fr || 0, 0, 'erst ab der nächsten Nacht Früchte');
  for (let i = 0; i < 5; i++) obstNacht(s, false);
  assert.equal(o.fr, 3);
  const erg = L.neuesErgebnis();
  OBJEKT_TYPEN.obstbaum.interagieren({ s, ort, x: 15, y: 10, o, erg });
  assert.equal(L.anzahl(s, 'kirsche'), 3);
  assert.equal(o.fr, 0);
  // Sommer: Kirschen tragen nicht, hängende fallen beim Wechsel ab
  o.fr = 2;
  s.zeit.jz = 1;
  obstNacht(s, true);
  assert.equal(o.fr, 0);
  obstNacht(s, false);
  assert.equal(o.fr, 0);
});
test('Obst wird mit jedem Jahr besser; im Glashaus trägt der Baum immer', () => {
  const s = neues(48);
  s.zeit.jz = 3;
  const glas = L.ortVon(s, 'pfl_glas');
  glas.welt.objekte[L.k(5, 5)] = { t: 'obstbaum', art: 'pfirsich', tage: 28, fr: 0, alt: 112 * 2 };
  obstNacht(s, false);
  const o = glas.welt.objekte[L.k(5, 5)];
  assert.equal(o.fr, 1, 'trägt im Winter im Glashaus');
  OBJEKT_TYPEN.obstbaum.interagieren({ s, ort: glas, x: 5, y: 5, o });
  assert.equal(s.spieler.inv.find((x) => x?.id === 'pfirsich').q, 2, 'Gold nach zwei Jahren');
  assert.equal(Object.keys(OBSTBAEUME).length, 6);
});
test('Ein junger Setzling lässt sich mit der Axt zurückholen, ein großer Baum gibt Holz', () => {
  const s = neues(49);
  const ort = acker(s);
  ort.welt.objekte[L.k(3, 12)] = { t: 'obstbaum', art: 'apfel', tage: 2, fr: 0, alt: 0 };
  L.axtHieb(s, ort, 3, 12, () => 0.5);
  assert.ok(L.hat(s, 'apfelsetzling'));
  ort.welt.objekte[L.k(8, 12)] = { t: 'obstbaum', art: 'apfel', tage: 40, fr: 2, alt: 3 };
  const holz = L.anzahl(s, 'holz');
  for (let i = 0; i < 12; i++) L.axtHieb(s, ort, 8, 12, () => 0.5);
  assert.ok(!ort.welt.objekte[L.k(8, 12)]);
  assert.ok(L.anzahl(s, 'holz') > holz && L.anzahl(s, 'apfel') === 2);
});

console.log('\nPflanzen: Wildbäume');
test('Bäume fallen nach genug Axthieben, geben Holz und lassen einen Stumpf', () => {
  const s = neues(10);
  const ort = L.ortVon(s, 'testwald');
  ort.welt.objekte[L.k(4, 4)] = { t: 'baum', hp: 8, art: 'eiche' };
  let erg;
  for (let i = 0; i < 8; i++) erg = L.axtHieb(s, ort, 4, 4, () => 0.5);
  assert.ok(erg.gefallen);
  assert.ok(L.anzahl(s, 'holz') >= BAUM_ARTEN.eiche.holz[0]);
  assert.equal(ort.welt.objekte[L.k(4, 4)].t, 'stumpf');
  assert.ok(L.hat(s, 'harz'), 'Baumharz');
});
test('Baumarten mit Samen, Zapfhahn-Feld und Wachstumschance', () => {
  for (const art of ['eiche', 'ahorn', 'kiefer', 'mahagoni']) {
    const b = BAUM_ARTEN[art];
    assert.ok(ITEMS[b.samen]?.baum === art, art);
    assert.ok(b.wachsen > 0);
  }
  assert.deepEqual(BAUM_ARTEN.ahorn.zapfen, { item: 'ahornsirup', tage: 9 });
  assert.equal(BAUM_ARTEN.eiche.zapfen.item, 'eichenharz');
  assert.equal(BAUM_ARTEN.kiefer.zapfen.item, 'kiefernteer');
});
test('Aus einer Eichel wächst Stufe um Stufe eine Eiche (nicht im Winter, nicht neben einer großen)', () => {
  const s = neues(50);
  s.zeit.jz = 0;
  const ort = acker(s);
  assert.ok(baumSaeen(s, ort, 6, 3, geben(s, 'eichel')).ok);
  assert.match(baumSaeen(s, L.ortVon(s, 'testwald'), 3, 3, geben(s, 'eichel')).grund, /Hof/);
  const kk = L.k(6, 3);
  assert.equal(ort.welt.objekte[kk].t, 'pflanzen_baumkeim');
  assert.ok(L.begehbar(s, ort.def, ort.welt, 6, 3), 'Keim ist begehbar');
  s.zeit.jz = 3;
  baeumeNacht(s, () => 0);
  assert.equal(ort.welt.objekte[kk].st, 0, 'Winter: kein Wachstum');
  s.zeit.jz = 0;
  baeumeNacht(s, () => 0.5);
  assert.equal(ort.welt.objekte[kk].st, 0, 'ohne Glück kein Wachstum');
  const stufen = [];
  ort.welt.objekte[L.k(7, 4)] = { t: 'baum', art: 'eiche', hp: 8 };
  for (let i = 0; i < 6; i++) { baeumeNacht(s, () => 0.1); stufen.push(ort.welt.objekte[kk].t + ':' + (ort.welt.objekte[kk].st ?? 'reif')); }
  assert.deepEqual(stufen.slice(0, 4), ['pflanzen_baumkeim:1', 'pflanzen_jungbaum:2', 'pflanzen_jungbaum:3', 'pflanzen_jungbaum:4']);
  assert.equal(ort.welt.objekte[kk].t, 'pflanzen_jungbaum', 'neben einer großen Eiche bleibt er klein');
  assert.ok(!L.begehbar(s, ort.def, ort.welt, 6, 3));
  delete ort.welt.objekte[L.k(7, 4)];
  baeumeNacht(s, () => 0.1);
  assert.equal(ort.welt.objekte[kk].t, 'baum');
  assert.equal(ort.welt.objekte[kk].art, 'eiche');
});
test('Ausgewachsene Bäume tragen manchmal Samen zum Schütteln; Keimlinge mäht die Sense weg', () => {
  const s = neues(51);
  s.zeit.jz = 1;
  const ort = acker(s);
  let gefunden = 0;
  for (let x = 1; x < 23; x++) {
    for (let y = 1; y < 15; y += 3) {
      const o = { t: 'baum', art: 'ahorn', hp: 8 };
      ort.welt.objekte[L.k(x, y)] = o;
      const h = OBJEKT_TYPEN.baum.hinweis({ s, x, y, o });
      if (h) { OBJEKT_TYPEN.baum.interagieren({ s, ort, x, y, o }); gefunden++; assert.equal(OBJEKT_TYPEN.baum.hinweis({ s, x, y, o }), '', 'nur einmal am Tag'); }
    }
  }
  assert.ok(gefunden > 0 && L.anzahl(s, 'ahornsamen') === gefunden);
  const s2 = neues(52);
  const o2 = acker(s2);
  o2.welt.objekte[L.k(3, 3)] = { t: 'pflanzen_baumkeim', art: 'kiefer', st: 0 };
  assert.equal(L.senseSchnitt(s2, o2, [[3, 3]]).n, 1);
  assert.ok(!o2.welt.objekte[L.k(3, 3)] && L.hat(s2, 'kiefernzapfen'));
});

console.log('\nPflanzen: Gras und Wildsamen');
test('Hohes Gras ist begehbar, die Sense mäht es und ruft grasGemaeht', () => {
  const s = neues(53);
  s.zeit.jz = 1;
  const ort = acker(s);
  assert.equal(grasSetzen(s, ort, 10, 10, () => 0.3, 1), 1);
  assert.ok(L.begehbar(s, ort.def, ort.welt, 10, 10));
  const vorher = gemaeht;
  const erg = L.senseSchnitt(s, ort, [[10, 10]]);
  assert.equal(erg.n, 1);
  assert.equal(gemaeht, vorher + 1);
  assert.ok(!ort.welt.objekte[L.k(10, 10)]);
});
test('Hohes Gras breitet sich aus und sprießt auf Wiesen, nicht im Winter', () => {
  const s = neues(54);
  s.zeit.jz = 1;
  const ort = acker(s);
  grasSetzen(s, ort, 12, 8, () => 0.3, 1);
  const zaehlen = (w) => Object.values(w.objekte).filter((o) => o.t === 'hohesgras').length;
  for (let i = 0; i < 5; i++) grasNacht(s, () => 0.01);
  assert.ok(zaehlen(ort.welt) > 1, 'ausgebreitet');
  const wiese = L.ortVon(s, 'pfl_wiese');
  grasNacht(s, () => 0.2);
  assert.ok(zaehlen(wiese.welt) > 0, 'auf der Wiese gesprossen');
  s.zeit.jz = 3;
  const n = zaehlen(ort.welt);
  grasNacht(s, () => 0.01);
  assert.equal(zaehlen(ort.welt), n);
});
test('Wildsamen: Rezept aus vier Funden, gesät wächst ein Fund der Jahreszeit', () => {
  const r = REZEPTE.find((x) => x.id === 'wildsamen_fruehling');
  assert.ok(r && r.menge === 10 && Object.keys(r.zutaten).length === 4);
  const s = neues(55);
  s.zeit.jz = 0;
  const ort = acker(s);
  L.hacken(s, ort, [[2, 13]]);
  assert.ok(wildSaeen(s, ort, 2, 13, geben(s, 'wildsamen_fruehling'), () => 0.3).ok);
  const p = ort.welt.felder[L.k(2, 13)].pflanze;
  const fund = PFLANZEN[p.id].ernte;
  assert.ok(r.zutaten[fund], fund);
  p.tage = PFLANZEN[p.id].tage;
  assert.ok(L.ernten(s, ort, 2, 13, () => 0.5).ok);
  assert.ok(L.hat(s, fund));
  L.hacken(s, ort, [[3, 13]]);
  assert.ok(wildSaeen(s, ort, 3, 13, geben(s, 'wildsamen_winter')).grund, 'Winter-Samen nicht im Frühling');
});
test('Krähen kommen nicht ins Glashaus', () => {
  const s = neues(56);
  s.zeit.jz = 1;
  const glas = L.ortVon(s, 'pfl_glas');
  for (let x = 1; x < 11; x++) for (let y = 1; y < 3; y++) glas.welt.felder[L.k(x, y)] = { pflanze: { id: 'melone', tage: 1 } };
  L.tagBeenden(s, { r: () => 0.01 });
  assert.equal(Object.values(glas.welt.felder).filter((f) => f.pflanze).length, 20);
});
test('Spielstand mit Bäumen, Obstbäumen, Riesen und Gras übersteht Speichern und Laden', () => {
  const s = neues(57);
  const ort = acker(s);
  ort.welt.objekte[L.k(2, 2)] = { t: 'pflanzen_jungbaum', art: 'ahorn', st: 3, hp: 2 };
  ort.welt.objekte[L.k(6, 6)] = { t: 'obstbaum', art: 'orange', tage: 12, fr: 0, alt: 0 };
  L.objektSetzen(ort, 10, 2, { t: 'pflanzen_riese', art: 'kuerbis', hp: 9 });
  grasSetzen(s, ort, 15, 12, () => 0.3, 1);
  const t = L.serialisieren(s);
  assert.equal(L.serialisieren(L.deserialisieren(t)), t);
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
