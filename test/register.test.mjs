// Register, Hooks, Modifikatoren und die Ordnung der Bereiche.
// Aufruf: node test/register.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import '../src/bereiche/inhalt.js';
import * as D from '../src/daten.js';
import { KARTEN, bodenTyp, karte } from '../src/karten.js';
import { SYSTEME, BEKANNTE_HOOKS, BEKANNTE_MODIFIKATOREN, system, modifikator, mod, alle, erster, sammle } from '../src/system.js';
import { MONSTER, monster } from '../src/mine.js';
import { mineErzeugen } from '../src/bereiche/mine/inhalt.js';
import { DEKO_AKTIONEN, GEBAEUDE_AKTIONEN, dekoAktion, gebaeudeAktion } from '../src/spiel.js';
import * as L from '../src/logik.js';
import { zufall } from '../src/zufall.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }

const wurzel = fileURLToPath(new URL('../src/', import.meta.url));
const BEREICHE = ['basis', 'hof', 'dorf', 'wildnis', 'pflanzen', 'angeln', 'mine', 'handwerk', 'tiere', 'npcs', 'npcs2', 'feste', 'gemeinschaft'];
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });

gruppe('Doppelte IDs', () => {
  const doppelt = /gibt es schon|doppelt/;
  test('jedes Register wirft bei doppelter ID', () => {
    assert.throws(() => D.item('holz', { name: 'Holz', kat: 'ressource' }), doppelt);
    assert.throws(() => D.item('holz', 'Holz', 'ressource', 2, { art: 'holz' }), doppelt);
    assert.throws(() => D.pflanze('pastinake', { tage: 1, jz: ['fruehling'] }), doppelt);
    assert.throws(() => D.fisch('karpfen', { name: 'K', preis: 1, schwierigkeit: 1, orte: ['teich'], jz: ['sommer'] }), doppelt);
    assert.throws(() => D.rezept('truhe', { zutaten: {} }), doppelt);
    assert.throws(() => D.laden('laden', { name: 'x', npc: 'ottilie', ort: { karte: 'laden', punkt: 'theke' } }), doppelt);
    assert.throws(() => D.spezialWare('upgrade', {}), doppelt);
    assert.throws(() => D.npc('ottilie', {}), doppelt);
    assert.throws(() => D.buendel('wald', { items: [] }), doppelt);
    assert.throws(() => D.brief('oma', { von: 'x', text: 'y' }), doppelt);
    assert.throws(() => D.tipp(D.TIPPS[0]), doppelt);
    assert.throws(() => D.objektTyp('baum', {}), doppelt);
    assert.throws(() => D.bedingung('mineOffen', () => true), doppelt);
    assert.throws(() => D.werkzeugArt('axt', {}), doppelt);
    assert.throws(() => D.kategorie('fisch', 'Fisch'), doppelt);
    assert.throws(() => karte({ id: 'hof', name: 'Hof', grid: ['.'] }), doppelt);
    assert.throws(() => bodenTyp('.', { name: 'gras' }), doppelt);
    assert.throws(() => monster('schleim', {}), doppelt);
    assert.throws(() => system({ name: 'tiere' }), doppelt);
    assert.throws(() => dekoAktion('bett', () => {}), doppelt);
    assert.throws(() => gebaeudeAktion('muehle', () => {}), doppelt);
  });
  test('mit ersetzen: true darf man überschreiben', () => {
    const alt = D.ITEMS.holz;
    D.item('holz', { ...alt, preis: 3, ersetzen: true });
    assert.equal(D.ITEMS.holz.preis, 3);
    assert.ok(!('ersetzen' in D.ITEMS.holz));
    D.item('holz', { ...alt, ersetzen: true });
    assert.equal(D.ITEMS.holz.preis, 2);
    const anzahl = D.FISCHE.length;
    const karpfen = D.ITEMS.karpfen;
    D.fisch('karpfen', { ...karpfen, ...karpfen.fisch, ersetzen: true });
    assert.equal(D.FISCHE.length, anzahl, 'Fisch ersetzt, nicht angehängt');
  });
});

gruppe('Inhalte vollständig', () => {
  test('jedes Item hat Name, Kategorie, Preis und Bild', () => {
    for (const [id, it] of Object.entries(D.ITEMS)) {
      assert.equal(it.id, id);
      assert.ok(typeof it.name === 'string' && it.name, `${id}: Name`);
      assert.ok(D.KATEGORIE_NAME[it.kat], `${id}: Kategorie ${it.kat}`);
      assert.ok(Number.isFinite(it.preis) && it.preis >= 0, `${id}: Preis`);
      assert.ok(typeof it.bild?.art === 'string', `${id}: Bild`);
      if (it.werkzeug) assert.ok(D.WERKZEUG_ARTEN[it.werkzeug], `${id}: Werkzeugart ${it.werkzeug}`);
      if (it.aufstellbar) assert.ok(D.OBJEKT_TYPEN[typeof it.aufstellbar === 'string' ? it.aufstellbar : id], `${id}: Objekttyp zum Aufstellen`);
      if (it.kat === 'saat') assert.ok(D.PFLANZEN[D.SAAT_ZU_PFLANZE[id]], `${id}: Pflanze`);
    }
  });
  test('Fische haben Gewässer, Jahreszeiten und Uhrzeiten', () => {
    for (const f of D.FISCHE) {
      const d = f.fisch;
      assert.ok(d.orte.length && d.jz.length && d.zeit.length === 2 && d.schwierigkeit >= 0, f.id);
      assert.ok(d.jz.every((j) => D.JZ.includes(j)), f.id);
    }
    for (const liste of Object.values(D.MUELL)) for (const id of liste) assert.ok(D.ITEMS[id], id);
  });
  test('Monster-Beute sind echte Gegenstände', () => {
    for (const [id, m] of Object.entries(MONSTER)) for (const [b] of m.beute) assert.ok(D.ITEMS[b], `${id}: ${b}`);
  });
  test('Bedingungen, Deko- und Gebäudeaktionen der Karten sind registriert', () => {
    const s = neues();
    s.stall.gebaut = true;
    for (const def of Object.values(KARTEN)) {
      for (const g of L.gebaeudeListe(s, def)) {
        for (const b of [g.nurWenn, g.tuerWenn]) if (typeof b === 'string') assert.ok(D.BEDINGUNGEN[b.replace(/^!/, '')], `${def.id}: Bedingung ${b}`);
        if (g.aktion) assert.ok(GEBAEUDE_AKTIONEN[g.aktion], `${def.id}: Gebäudeaktion ${g.aktion}`);
      }
      for (const d of [...def.deko, ...L.dekoListe(s, def)]) {
        if (typeof d.nurWenn === 'string') assert.ok(D.BEDINGUNGEN[d.nurWenn.replace(/^!/, '')], `${def.id}: Bedingung ${d.nurWenn}`);
        if (d.aktion) assert.ok(DEKO_AKTIONEN[d.aktion], `${def.id}: Deko-Aktion ${d.aktion}`);
        if (d.aktion === 'laden') assert.ok(D.LAEDEN[d.laden], `${def.id}: Laden ${d.laden}`);
      }
    }
    for (const l of Object.values(D.LAEDEN)) {
      for (const w of l.ware) if (typeof w.bedingung === 'string') assert.ok(D.BEDINGUNGEN[w.bedingung], `${l.name}: ${w.bedingung}`);
    }
  });
  test('jedes Objekt, das entstehen kann, hat einen Objekttyp', () => {
    const typen = new Set();
    for (let seed = 1; seed <= 3; seed++) {
      const s = neues(seed);
      for (let tag = 0; tag < 5; tag++) L.tagBeenden(s, { r: zufall(seed * 10 + tag) });
      for (const w of Object.values(s.welt)) for (const o of Object.values(w.objekte)) typen.add(o.t);
    }
    for (const n of [1, 10, 25]) for (const o of Object.values(mineErzeugen(n, zufall(n)).welt.objekte)) typen.add(o.t);
    for (const id of Object.keys(D.ITEMS)) if (D.ITEMS[id].aufstellbar) typen.add(id);
    typen.add('leiter');
    for (const t of typen) assert.ok(D.OBJEKT_TYPEN[t], `Objekttyp ${t}`);
  });
  test('Werkzeuge: alle Arten haben Wirkung oder Benutzen', () => {
    for (const [art, w] of Object.entries(D.WERKZEUG_ARTEN)) assert.ok(w.wirkung || w.benutzen, art);
    assert.deepEqual(D.AUFRUESTBAR, ['hacke', 'giesskanne', 'axt', 'spitzhacke']);
    assert.equal(D.WERKZEUG_STUFEN.length, D.KANNE_INHALT.length);
    assert.equal(D.QUALITAET[3].faktor, 2);
  });
});

gruppe('Hooks und Modifikatoren', () => {
  test('Systeme nutzen nur bekannte Hooks', () => {
    for (const sy of SYSTEME) {
      for (const [k, v] of Object.entries(sy)) {
        if (k === 'name' || typeof v !== 'function') continue;
        assert.ok(BEKANNTE_HOOKS.includes(k), `${sy.name}: unbekannter Hook ${k}`);
      }
    }
  });
  test('der Kern ruft neuesSpiel, ergaenzen, tagEnde, morgen, minuten und fertig', () => {
    const gerufen = {};
    const zaehle = (name) => (...a) => { gerufen[name] = (gerufen[name] || 0) + 1; return a; };
    system({
      name: 'test-hooks',
      neuesSpiel: zaehle('neuesSpiel'), ergaenzen: zaehle('ergaenzen'), tagEnde: zaehle('tagEnde'),
      morgen: zaehle('morgen'), minuten: zaehle('minuten'), gegessen: zaehle('gegessen'),
    });
    const s = neues(40);
    L.tagBeenden(s, { r: () => 0.5 });
    L.zeitVergeht(s, 10);
    L.hinzufuegen(s, { id: 'brot', n: 1 });
    L.essen(s, s.spieler.inv.findIndex((x) => x?.id === 'brot'));
    L.deserialisieren(L.serialisieren(s));
    for (const h of ['neuesSpiel', 'tagEnde', 'morgen', 'minuten', 'gegessen']) assert.equal(gerufen[h], 1, h);
    assert.equal(gerufen.ergaenzen, 2, 'ergaenzen beim Anlegen und beim Laden');
    assert.ok(D.istFertig(), 'fertig() lief');
  });
  test('alle, erster und sammle', () => {
    system({ name: 'test-a', interagieren: () => undefined, gebaeude: () => [1, 2] });
    system({ name: 'test-b', interagieren: () => 'b', gebaeude: () => [3] });
    assert.equal(erster('interagieren', {}), 'b');
    assert.deepEqual(sammle('gebaeude', { def: { id: 'nirgends' } }, neues()).slice(-3), [1, 2, 3]);
    alle('gibtsnicht');
  });
  test('Modifikatoren falten über die Rechnungen des Kerns', () => {
    const s = neues(41);
    const an = (k) => k.s?.flags.testMod;
    modifikator('verkaufspreis', (w, k) => (an(k) ? w * 2 : w));
    modifikator('energieKosten', (w, k) => (an(k) ? 0.5 : w));
    modifikator('xp', (w, k) => (an(k) ? 0 : w));
    modifikator('maxEnergie', (w, k) => (an(k) ? w + 30 : w));
    modifikator('wachstum', (w, k) => (an(k) ? 2 : w));
    modifikator('ernteQualitaet', (w, k) => (an(k) ? 3 : w));
    const slot = { id: 'pastinake', n: 1 };
    assert.equal(L.preisVon(slot, s), 35);
    s.flags.testMod = true;
    assert.equal(L.preisVon(slot, s), 70);
    assert.equal(L.energieKosten(s, 'hacke', 2), 0.5);
    L.xpGeben(s, 'angeln', 50);
    assert.equal(s.spieler.xp.angeln, 0);
    L.werteAktualisieren(s);
    assert.equal(s.spieler.maxEnergie, D.MAX_ENERGIE + 30);
    const ort = L.ortVon(s, 'hof');
    ort.welt.felder[L.k(30, 20)] = { nass: true, pflanze: { id: 'blumenkohl', tage: 0 } };
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(ort.welt.felder[L.k(30, 20)].pflanze.tage, 2, 'doppeltes Wachstum');
    ort.welt.felder[L.k(30, 21)] = { pflanze: { id: 'pastinake', tage: 4 } };
    L.ernten(s, ort, 30, 21, () => 0.5);
    assert.ok(s.spieler.inv.some((x) => x?.id === 'pastinake' && x.q === 3), 'Iridiumqualität über Modifikator');
    assert.equal(mod('gibtsnicht', 7), 7);
    for (const m of ['verkaufspreis', 'energieKosten']) assert.ok(BEKANNTE_MODIFIKATOREN.includes(m));
  });
});

gruppe('Bereiche', () => {
  test('jeder Bereich hat inhalt.js, grafik.js und oberflaeche.js', () => {
    for (const b of BEREICHE) for (const f of ['inhalt.js', 'grafik.js', 'oberflaeche.js']) assert.ok(existsSync(`${wurzel}bereiche/${b}/${f}`), `${b}/${f}`);
    const ordner = readdirSync(`${wurzel}bereiche`, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    assert.deepEqual(ordner, [...BEREICHE].sort());
  });
  test('die Sammeldateien laden alle Bereiche in fester Reihenfolge', () => {
    for (const f of ['inhalt.js', 'grafik.js', 'oberflaeche.js']) {
      const text = readFileSync(`${wurzel}bereiche/${f}`, 'utf8');
      const importe = [...text.matchAll(/import '\.\/(\w+)\/(\w+\.js)';/g)];
      assert.deepEqual(importe.map((m) => m[1]), BEREICHE, f);
      assert.ok(importe.every((m) => m[2] === f), `${f}: falsche Datei`);
    }
  });
  const importeVon = (pfad) => [...readFileSync(pfad, 'utf8').matchAll(/^import [^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  test('inhalt.js importiert nur DOM-freie Kernmodule', () => {
    const erlaubt = ['daten', 'karten', 'system', 'logik', 'spiel', 'mine', 'angeln', 'zufall'].map((m) => `../../${m}.js`);
    for (const b of BEREICHE) {
      for (const i of importeVon(`${wurzel}bereiche/${b}/inhalt.js`)) assert.ok(erlaubt.includes(i), `${b}/inhalt.js importiert ${i}`);
    }
  });
  test('der DOM-freie Kern importiert keine Bereiche', () => {
    for (const m of ['daten', 'karten', 'system', 'logik', 'spiel', 'mine', 'angeln', 'zufall']) {
      for (const i of importeVon(`${wurzel}${m}.js`)) assert.ok(!i.includes('bereiche'), `${m}.js importiert ${i}`);
    }
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
