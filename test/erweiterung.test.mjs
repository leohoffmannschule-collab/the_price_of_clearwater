// Erweiterungspunkte des Kerns für die Bereiche: Ware in fremden Läden, Zuhause, eigene
// Spielmodi, große Objekte, Bodenbeläge, Platzregeln, Rankhilfen, Wege der Dorfbewohner,
// Wahlfenster im Tagesabschluss, Rezepte lernen, erwartete fremde IDs. Alles mit Testinhalten.
// Aufruf: node test/erweiterung.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import {
  T, ITEMS, OBJEKT_TYPEN, PFLANZEN, ERWARTET, item, kategorie, laden, spezialWare, objektTyp, pflanze, rezept, belagTyp,
  erwartet, npc, bedingung,
} from '../src/daten.js';
import { karte, raster, rahmen, rechteck, fertigRaster, verbindungen, bodenFlag, B_BEGEHBAR } from '../src/karten.js';
import { system, modifikator } from '../src/system.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, karteBetreten, dekoAktion, DEKO_AKTIONEN, feldUnterZeiger, schlafen } from '../src/spiel.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
const E = {
  richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
  aktion: { gedrueckt: false }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
};

// Testinhalte
kategorie('testkat', 'Testware');
item('testware', { name: 'Testware', kat: 'testkat', preis: 10, bild: { art: 'holz' } });
karte({ id: 'testfeld', name: 'Testfeld', aussen: true, farmbar: true, grid: fertigRaster(rahmen(raster(12, 10, '.'), '#')), punkte: { mitte: [5, 5] } });
karte({ id: 'testkeller', name: 'Testkeller', aussen: false, grid: fertigRaster(rahmen(raster(8, 6, '_'), '#')), punkte: { eingang: [2, 2] } });

gruppe('Ware und Ankauf in fremden Läden', () => {
  spezialWare('testspezial', {
    name: 'Testspezial', preis: 5,
    verfuegbar: (s, w, ladenId) => ladenId === 'testladen',
  });
  laden('testladen', { name: 'Testladen', npc: 'ottilie', ort: { karte: 'laden', punkt: 'theke' }, ware: [{ id: 'holz', preis: 9 }] });
  system({
    name: 'test-laden',
    ladenWare: (ladenId) => (ladenId === 'testladen' ? [
      { id: 'testware', preis: 20, reihe: 10 },
      { id: 'gibtsnochnicht', preis: 1 },
      { spezial: 'testspezial', reihe: 90 },
    ] : undefined),
    ladenKauft: (ladenId) => (ladenId === 'testladen' ? ['testkat'] : undefined),
  });
  test('Hook ladenWare ergänzt Ware, sortiert nach reihe, ohne fehlende Gegenstände', () => {
    const ware = L.ladenWare(neues(), 'testladen');
    assert.deepEqual(ware.map((w) => w.id ?? w.spezial), ['testware', 'holz', 'testspezial']);
  });
  test('Spezialwaren bekommen den Laden mit; Hook ladenKauft ergänzt den Ankauf', () => {
    assert.ok(!L.ladenWare(neues(), 'laden').some((w) => w.spezial === 'testspezial'));
    assert.ok(L.kauftKategorien('testladen').includes('testkat'));
    assert.ok(L.kauftLaden('testladen', { id: 'testware', n: 1 }));
    assert.ok(!L.kauftLaden('laden', { id: 'testware', n: 1 }));
  });
});

gruppe('Zuhause', () => {
  karte({ id: 'testzuhause', name: 'Testzuhause', aussen: false, zuhause: true, grid: fertigRaster(rahmen(raster(8, 6, '_'), '#')), punkte: { bett: [3, 3, 'unten'] } });
  system({ name: 'test-zuhause', zuhause: (s) => (s.flags.testZuhause ? { karte: 'testzuhause', punkt: 'bett' } : undefined) });
  test('ohne Hook: Punkt „bett" im Haus', () => {
    const z = L.zuhause(neues());
    assert.equal(z.karte, 'haus');
  });
  test('mit Hook: dort wacht man auf, nach jeder Nacht', () => {
    const s = neues();
    s.flags.testZuhause = true;
    assert.deepEqual(L.zuhause(s), { karte: 'testzuhause', x: 3, y: 3, blick: 'unten' });
    L.tagBeenden(s, { r: () => 0.5 });
    assert.deepEqual([s.spieler.karte, s.spieler.x, s.spieler.y], ['testzuhause', 3, 3]);
  });
  test('um zwei Uhr im Zuhause einschlafen ist keine Ohnmacht', () => {
    const s = neues(2);
    s.flags.testZuhause = true;
    let ohnmacht = null;
    spielStarten(s, { tagEnde: (b, o) => { ohnmacht = o; } });
    karteBetreten('testzuhause', 3, 3, 'unten');
    s.zeit.minute = 1550;
    for (let i = 0; i < 400 && ohnmacht === null; i++) update(0.05, E);
    assert.equal(ohnmacht, false);
    s.flags.testZuhause = false;
  });
});

gruppe('Eigene Spielmodi', () => {
  let aktiv = false;
  system({ name: 'test-modus', eingabe: ({ E: e }) => (aktiv && e ? true : undefined) });
  test('Hook eingabe übernimmt die Steuerung; karteBetreten beendet S.modus', () => {
    spielStarten(neues(3), {});
    karteBetreten('testfeld', 5, 5, 'unten');
    const x = S.sp.x;
    aktiv = true;
    S.modus = 'test';
    E.richtung.x = 1;
    for (let i = 0; i < 10; i++) update(0.05, E);
    assert.equal(S.sp.x, x, 'die Spielerin bleibt stehen');
    aktiv = false;
    for (let i = 0; i < 10; i++) update(0.05, E);
    E.richtung.x = 0;
    assert.ok(S.sp.x > x, 'danach läuft sie wieder');
    S.kameraFokus = { x: 0, y: 0 };
    karteBetreten('testfeld', 5, 5, 'unten');
    assert.equal(S.modus, null);
    assert.equal(S.kameraFokus, null);
  });
  test('feldUnterZeiger rechnet Bildschirm- in Feldkoordinaten um', () => {
    Object.assign(S.kamera, { x: 32, y: 16, zoom: 2, dpr: 1 });
    assert.deepEqual(feldUnterZeiger(0, 0), { x: 2, y: 1 });
    assert.deepEqual(feldUnterZeiger(64, 32), { x: 4, y: 2 });
  });
  test('schlafen beendet einen Modus', () => {
    S.modus = 'test';
    schlafen(false);
    assert.equal(S.modus, null);
  });
});

gruppe('Große Objekte', () => {
  let getroffen = null;
  let angesprochen = null;
  objektTyp('testriese', {
    blockiert: true, flaeche: [3, 2],
    axt(c) { getroffen = [c.x, c.y]; c.erg.treffer = 'holz'; return true; },
    interagieren(c) { angesprochen = [c.x, c.y]; },
    hinweis: 'Riese',
  });
  test('objektSetzen belegt die Fläche, Teile blockieren und leiten Werkzeuge ans Hauptobjekt', () => {
    const s = neues();
    const ort = L.ortVon(s, 'testfeld');
    L.objektSetzen(ort, 3, 3, { t: 'testriese' });
    assert.equal(ort.welt.objekte[L.k(5, 4)].t, 'teil');
    assert.ok(!L.begehbar(s, ort.def, ort.welt, 5, 4));
    L.axtHieb(s, ort, 5, 4);
    assert.deepEqual(getroffen, [3, 3]);
    OBJEKT_TYPEN.teil.interagieren({ s, ort, x: 4, y: 4, o: ort.welt.objekte[L.k(4, 4)] });
    assert.deepEqual(angesprochen, [3, 3]);
    assert.equal(OBJEKT_TYPEN.teil.hinweis({ s, ort, x: 4, y: 4, o: ort.welt.objekte[L.k(4, 4)] }), 'Riese');
    assert.ok(!L.flaecheFrei(s, ort, 2, 2, 2, 2));
    assert.equal(L.objektEntfernen(ort, 4, 4).t, 'testriese');
    assert.deepEqual(Object.keys(ort.welt.objekte).filter((kk) => ort.welt.objekte[kk].t === 'teil'), []);
    assert.ok(L.flaecheFrei(s, ort, 3, 3, 3, 2));
  });
});

gruppe('Aufstellen', () => {
  objektTyp('testkorb', { blockiert: true, axt: L.aufheben, platz: ({ ort, x, y }) => (bodenFlag(ort.def, x, y, B_BEGEHBAR) ? 'Nur ins Wasser.' : true) });
  item('testkorb', { name: 'Testkorb', kat: 'testkat', bild: { art: 'holz' }, aufstellbar: true });
  objektTyp('testkiste', { blockiert: true, axt: L.aufheben, flaeche: [2, 1] });
  item('testkiste', { name: 'Testkiste', kat: 'testkat', bild: { art: 'holz' }, aufstellbar: true });
  karte({ id: 'testteich', name: 'Testteich', aussen: true, grid: ['.~~.', '.~~.'] });
  test('nicht farmbare Karten erlauben Aufstellen mit `aufstellen: true`', () => {
    const s = neues();
    L.hinzufuegen(s, { id: 'testkiste', n: 2 });
    const idx = () => s.spieler.inv.findIndex((x) => x?.id === 'testkiste');
    assert.ok(L.aufstellen(s, L.ortVon(s, 'testkeller'), 2, 2, idx()).grund);
    karte({ id: 'testkammer', name: 'Testkammer', aufstellen: true, grid: fertigRaster(rahmen(raster(8, 6, '_'), '#')) });
    const kammer = L.ortVon(s, 'testkammer');
    assert.ok(L.aufstellen(s, kammer, 2, 2, idx()).ok);
    assert.equal(kammer.welt.objekte[L.k(3, 2)].t, 'teil', 'große Objekte belegen ihre Fläche');
    assert.ok(L.aufstellen(s, kammer, 3, 3, idx()).ok);
    L.axtHieb(s, kammer, 3, 2);
    assert.ok(!kammer.welt.objekte[L.k(2, 2)] && !kammer.welt.objekte[L.k(3, 2)], 'mit allen Teilen aufgehoben');
  });
  test('der Objekttyp darf eigene Platzregeln haben (platz)', () => {
    const s = neues();
    L.hinzufuegen(s, { id: 'testkorb', n: 2 });
    const idx = () => s.spieler.inv.findIndex((x) => x?.id === 'testkorb');
    const teich = L.ortVon(s, 'testteich');
    assert.equal(L.aufstellen(s, teich, 0, 0, idx()).grund, 'Nur ins Wasser.');
    assert.ok(L.aufstellen(s, teich, 1, 0, idx()).ok);
    assert.equal(L.aufstellen(s, teich, 1, 0, idx()).grund, 'Hier ist kein Platz.');
  });
});

gruppe('Beete, Beläge und Hacke', () => {
  pflanze('testranke', { saat: 'testranke_saat', ernte: 'testware', tage: 3, jz: ['fruehling', 'sommer', 'herbst', 'winter'], rankhilfe: true, wuchs: 'rank' });
  test('Pflanzen an einer Rankhilfe versperren ihr Beet, verwelkte nicht', () => {
    const s = neues();
    const ort = L.ortVon(s, 'testfeld');
    ort.welt.felder[L.k(2, 2)] = { pflanze: { id: 'testranke', tage: 0 } };
    assert.ok(!L.begehbar(s, ort.def, ort.welt, 2, 2));
    assert.ok(!L.begehbarPruefer(s, ort.def, ort.welt)(2, 2));
    ort.welt.felder[L.k(2, 2)].pflanze.tot = true;
    assert.ok(L.begehbar(s, ort.def, ort.welt, 2, 2));
    assert.ok(PFLANZEN.testranke.rankhilfe);
  });
  belagTyp('testweg', { name: 'Testweg', item: 'testweg', tempo: 1.5 });
  item('testweg', { name: 'Testweg', kat: 'testkat', bild: { art: 'stein' }, belag: 'testweg' });
  test('Beläge: legen, keine Beete darauf, Spitzhacke hebt sie auf', () => {
    const s = neues();
    const ort = L.ortVon(s, 'testfeld');
    L.hinzufuegen(s, { id: 'testweg', n: 1 });
    assert.ok(L.belagLegen(s, ort, 6, 6, s.spieler.inv.findIndex((x) => x?.id === 'testweg')).ok);
    assert.equal(ort.welt.belag[L.k(6, 6)].t, 'testweg');
    assert.ok(L.begehbar(s, ort.def, ort.welt, 6, 6));
    assert.equal(L.hacken(s, ort, [[6, 6]]).n, 0);
    assert.ok(!L.feldFrei(s, ort, 6, 6));
    const erg = L.spitzhackeHieb(s, ort, 6, 6);
    assert.ok(!ort.welt.belag[L.k(6, 6)]);
    assert.equal(erg.items[0].id, 'testweg');
  });
  test('Beläge machen schneller (Faktor tempo)', () => {
    const s = neues(4);
    spielStarten(s, {});
    karteBetreten('testfeld', 2, 7, 'rechts');
    for (let x = 1; x < 11; x++) L.welt(s, 'testfeld').belag[L.k(x, 7)] = { t: 'testweg' };
    const x0 = S.sp.x;
    E.richtung.x = 1;
    update(0.05, E);
    E.richtung.x = 0;
    assert.ok(S.sp.x - x0 > 76 * 0.05 * 1.2, 'schneller als zu Fuß');
  });
  test('die Hacke erreicht Objekte auch auf nicht farmbaren Karten (Artefaktstellen)', () => {
    let gegraben = false;
    objektTyp('teststelle', { hacke(c) { gegraben = true; delete c.ort.welt.objekte[c.kk]; c.erg.treffer = 'erde'; return true; } });
    const s = neues();
    const ort = L.ortVon(s, 'testkeller');
    ort.welt.objekte[L.k(2, 2)] = { t: 'teststelle' };
    const erg = L.hacken(s, ort, [[2, 2]]);
    assert.ok(gegraben);
    assert.ok(!erg.grund, 'keine Ablehnung, wenn etwas getroffen wurde');
    assert.ok(L.hacken(s, ort, [[3, 3]]).grund, 'sonst: hier lässt sich nichts anbauen');
  });
});

const gasseDef = () => L.ortVon(neues(), 'testgasse').def;

gruppe('Wege der Dorfbewohner', () => {
  const g = raster(8, 6, '.');
  rechteck(g, 0, 0, 8, 1, '#');
  karte({
    id: 'testgasse', name: 'Testgasse', aussen: true, grid: fertigRaster(g),
    gebaeude: [
      { typ: 'laden', x: 1, y: 1, w: 3, h: 2, tuer: { x: 2, y: 2 }, ziel: { karte: 'testkeller', punkt: 'eingang' }, tuerWenn: 'testOffen', sonst: 'Zu.' },
      { typ: 'laden', x: 5, y: 1, w: 2, h: 2, tuer: { x: 5, y: 2 }, ziel: { karte: 'testfeld', punkt: 'mitte' }, nurWenn: 'testSteht' },
    ],
  });
  bedingung('testOffen', (s) => !!s.flags.testOffen);
  bedingung('testSteht', (s) => !!s.flags.testSteht);
  test('tuerWenn sperrt nur die Spielerin, npcWenn und nurWenn auch Dorfbewohner', () => {
    const s = neues();
    const v = verbindungen().filter((l) => l.von === 'testgasse');
    assert.equal(v.length, 2);
    assert.ok(L.kartenWeg(s, 'testgasse', 'testkeller'), 'trotz verschlossener Tür');
    assert.equal(L.kartenWeg(s, 'testgasse', 'testfeld'), null, 'Gebäude steht nicht');
    s.flags.testSteht = true;
    assert.ok(L.kartenWeg(s, 'testgasse', 'testfeld'));
    assert.ok(!L.begehbar(s, gasseDef(), null, 2, 2), 'die Spielerin kommt nicht durch die verschlossene Tür');
  });
});

gruppe('Tagesabschluss', () => {
  system({
    name: 'test-nacht',
    tagEnde(s, bericht) {
      if (s.flags.testWahl) bericht.wahlen.push({ fenster: 'testwahl', daten: { n: 1 } });
      if (s.flags.testNacht) s.flags.testNachtMinuten = bericht.nachtMinuten;
    },
  });
  test('bericht.wahlen sammelt Wahlfenster, bericht.nachtMinuten die verschlafene Zeit', () => {
    const s = neues();
    s.flags.testWahl = true;
    s.flags.testNacht = true;
    s.zeit.minute = 1320;
    const b = L.tagBeenden(s, { r: () => 0.5 });
    assert.deepEqual(b.wahlen, [{ fenster: 'testwahl', daten: { n: 1 } }]);
    assert.equal(b.nachtMinuten, 360 + 1440 - 1320);
    assert.equal(s.flags.testNachtMinuten, b.nachtMinuten);
  });
  test('über Nacht geänderte dynamische Gebäude gelten am Morgen (kartenGeaendert nach tagEnde)', () => {
    karte({ id: 'testbauplatz', name: 'Bauplatz', aussen: true, grid: fertigRaster(raster(6, 6, '.')) });
    system({ name: 'test-cache', tagEnde: (s) => { if (s.flags.testBau) L.begehbar(s, L.ortVon(s, 'testbauplatz').def, null, 1, 1); } });
    system({
      name: 'test-bau',
      tagEnde: (s) => { if (s.flags.testBau) s.flags.testGebaut = true; },
      gebaeude: (ort, s) => (ort.def.id === 'testbauplatz' && s.flags.testGebaut ? [{ typ: 'laden', x: 1, y: 1, w: 2, h: 2 }] : undefined),
    });
    const s = neues();
    s.flags.testBau = true;
    L.tagBeenden(s, { r: () => 0.5 });
    assert.equal(L.gebaeudeListe(s, L.ortVon(s, 'testbauplatz').def).length, 1);
    assert.ok(!L.begehbar(s, L.ortVon(s, 'testbauplatz').def, null, 1, 1));
  });
});

gruppe('Stufen, Sammeln, Rezepte, Aktionen', () => {
  modifikator('stufe', (w, k) => (k.s.flags.testBuff && k.skill === 'angeln' ? w + 1 : w));
  modifikator('sammelRadius', (w, k) => (k.s.flags.testMagnet ? w * 2 : w));
  test('stufeWirksam: Stufe plus Modifikator, die erreichte Stufe bleibt', () => {
    const s = neues();
    assert.equal(L.stufeWirksam(s, 'angeln'), 0);
    s.flags.testBuff = true;
    assert.equal(L.stufeWirksam(s, 'angeln'), 1);
    assert.equal(L.stufe(s, 'angeln'), 0);
  });
  test('Sammelfunde dürfen in mehreren Zonenarten wachsen (fundort als Liste)', () => {
    item('testpilz', { name: 'Testpilz', kat: 'sammel', bild: { art: 'pilz', f: '#ffffff' }, fundort: ['testwiese', 'testhain'] });
    assert.ok(L.sammelPool('testwiese', 'fruehling').includes('testpilz'));
    assert.ok(L.sammelPool('testhain', 'winter').includes('testpilz'));
    assert.ok(!L.sammelPool('wald', 'fruehling').includes('testpilz'));
  });
  test('Rezepte lernen; Rezepte mit fehlenden Zutaten bleiben verborgen', () => {
    const r = rezept('testgericht', { art: 'kochen', zutaten: { testware: 1 }, ergebnis: 'testware', lernen: true });
    const fremd = rezept('testfremd', { art: 'kochen', zutaten: { gibtsnochnicht: 1 }, ergebnis: 'testware' });
    erwartet('gibtsnochnicht');
    assert.ok(ERWARTET.has('gibtsnochnicht'));
    const s = neues();
    assert.ok(!L.rezeptFrei(s, r));
    assert.ok(L.rezeptLernen(s, 'testgericht'));
    assert.ok(!L.rezeptLernen(s, 'testgericht'));
    assert.ok(L.rezeptFrei(s, r));
    assert.deepEqual(L.deserialisieren(L.serialisieren(s)).rezepte, ['testgericht']);
    assert.ok(!L.rezeptVollstaendig(fremd));
    assert.ok(L.rezepteVon('kochen').includes(r) && !L.rezepteVon('kochen').includes(fremd));
    assert.ok(!L.kannBasteln(s, fremd));
  });
  test('Deko-Aktionen lassen sich mit ersetzen übernehmen', () => {
    assert.throws(() => dekoAktion('kochen', () => {}), /gibt es schon/);
    const alt = DEKO_AKTIONEN.kochen;
    dekoAktion('kochen', () => 'neu', 'Kochen', { ersetzen: true });
    assert.equal(DEKO_AKTIONEN.kochen.fn(), 'neu');
    DEKO_AKTIONEN.kochen = alt;
  });
  test('neue Testdorfbewohner brauchen kein Bild – Figuren malt der Kern', () => {
    npc('testperson', { name: 'Test', aussehen: {}, heim: { karte: 'testfeld', punkt: 'mitte' }, plan: { normal: [[600, null]] } });
    assert.ok(ITEMS.testware && T === 16);
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
