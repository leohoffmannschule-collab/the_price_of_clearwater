// Darstellung ohne Bildschirm: Bild-Register (sprites.js), Zeichner-Ebenen (render.js),
// Fenster und Menüreiter (ui.js), Importregeln für grafik.js und oberflaeche.js.
// Die Pixel selbst prüft der Browser-Rauchtest (test/browser.mjs).
// Aufruf: node test/darstellung.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import '../src/bereiche/inhalt.js';
import '../src/bereiche/grafik.js';
import '../src/bereiche/oberflaeche.js';
import * as D from '../src/daten.js';
import * as SP from '../src/sprites.js';
import { KARTEN, BODEN } from '../src/karten.js';
import { MONSTER } from '../src/mine.js';
import { EBENEN, ZEICHNER, zeichner } from '../src/render.js';
import { FENSTER, MENUE_REITER, WARE_BILD, STATISTIK, fensterArt, menueReiter, wareBild, statistik } from '../src/ui.js';
import { mineErzeugen, BAENDER } from '../src/bereiche/mine/inhalt.js';
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

/** Spielstände, in denen dynamische Gebäude und Deko (Hooks) einmal da und einmal weg sind. */
function staende() {
  const a = neues();
  const b = neues();
  b.stall.gebaut = true;
  b.muehle = true;
  b.flags.mineOffen = true;
  L.kartenGeaendert();
  return [a, b];
}
/** Alle Karten, die es gibt: feste und ein paar Minenebenen aus allen Bändern. */
function alleKarten() {
  const liste = Object.values(KARTEN);
  for (const n of [1, 15, 25]) liste.push(mineErzeugen(n, zufall(n)).def);
  return liste;
}

gruppe('Bild-Register', () => {
  test('jeder Gegenstand hat Kunst (KUNST[bild.art] oder KUNST[id])', () => {
    const fehlt = Object.values(D.ITEMS).filter((it) => !SP.KUNST[it.bild?.art] && !SP.KUNST[it.id]).map((it) => it.id);
    assert.deepEqual(fehlt, []);
  });
  test('jede Deko und jedes Gebäude auf den Karten hat ein Bild', () => {
    const fehlt = new Set();
    for (const s of staende()) {
      for (const def of alleKarten()) {
        for (const d of [...def.deko, ...L.dekoListe(s, def)]) if (!SP.DEKO_BILD[d.typ]) fehlt.add(`Deko ${d.typ} (${def.id})`);
        for (const g of [...def.gebaeude, ...L.gebaeudeListe(s, def)]) if (!SP.GEBAEUDE_BILD[g.typ]) fehlt.add(`Gebäude ${g.typ} (${def.id})`);
      }
    }
    assert.deepEqual([...fehlt], []);
  });
  test('Gebäudelicht gibt es nur für Gebäude mit Bild', () => {
    for (const typ of Object.keys(SP.GEBAEUDE_LICHT)) assert.ok(SP.GEBAEUDE_BILD[typ], typ);
    for (const [typ, def] of Object.entries(SP.GEBAEUDE_BILD)) assert.ok(def.b > 0 && def.h > 0 && typeof def.malen === 'function', typ);
  });
  test('jeder Objekttyp hat ein Objektbild oder ein gleichnamiges Item', () => {
    const fehlt = Object.keys(D.OBJEKT_TYPEN).filter((t) => !SP.OBJEKT_BILD[t] && !D.ITEMS[t]);
    assert.deepEqual(fehlt, []);
  });
  test('jede Pflanze hat eine Wuchsform mit Bild', () => {
    const fehlt = Object.values(D.PFLANZEN).filter((p) => !SP.PFLANZEN_BILD[p.id] && !SP.PFLANZEN_BILD[p.wuchs]).map((p) => p.id);
    assert.deepEqual(fehlt, []);
  });
  test('jedes Monster und jedes Tier hat ein Bild', () => {
    for (const [id, m] of Object.entries(MONSTER)) assert.ok(SP.MONSTER_BILD[id] || SP.MONSTER_BILD[m.art], id);
    assert.ok(SP.TIER_BILD.huhn);
  });
  test('jedes Bodenzeichen der Karten hat ein Bild, jede Karte ihre Farben', () => {
    for (const z of Object.keys(BODEN)) assert.ok(SP.BODEN_BILD[z], `Boden ${z}`);
    for (const def of alleKarten()) {
      const rand = def.rand || (def.innen === 'mine' ? 'mine' : 'wand');
      for (const zeile of def.grid) for (const z of zeile) assert.ok(SP.BODEN_BILD[`${z}:${rand}`] || SP.BODEN_BILD[z], `${def.id}: ${z}`);
      if (def.innen && def.innen !== 'mine') assert.ok(SP.INNEN_FARBEN[def.innen], `Innenraum ${def.innen}`);
      if (def.wasser) assert.ok(SP.WASSER_FARBE[def.wasser], `Wasser ${def.wasser}`);
    }
    assert.ok(SP.MINE_FARBEN.length >= BAENDER.length, 'Farben für jedes Minen-Band');
  });
  test('doppelte Bilder werfen, ersetzen: true geht', () => {
    const doppelt = /gibt es schon/;
    assert.throws(() => SP.kunst('hacke', () => {}), doppelt);
    assert.throws(() => SP.kunst({ holz() {} }), doppelt);
    assert.throws(() => SP.dekoKunst('laterne', () => {}), doppelt);
    assert.throws(() => SP.objektKunst('stein', () => {}), doppelt);
    assert.throws(() => SP.gebaeudeKunst('haus', { b: 1, h: 1, malen() {} }), doppelt);
    assert.throws(() => SP.bodenKunst('.', () => {}), doppelt);
    assert.throws(() => SP.pflanzenKunst('busch', () => {}), doppelt);
    assert.throws(() => SP.monsterKunst('schleim', () => {}), doppelt);
    assert.throws(() => SP.tierKunst('huhn', () => {}), doppelt);
    assert.throws(() => SP.symbolKunst('gold', () => {}), doppelt);
    const alt = SP.KUNST.hacke;
    SP.kunst('hacke', alt, { ersetzen: true });
    assert.equal(SP.KUNST.hacke, alt);
  });
  test('Darstellungsfelder: Bäume werfen Schatten und werden durchsichtig, Funde hüpfen', () => {
    const baum = SP.objektArt('baum');
    assert.deepEqual([baum.tiefe, baum.durchsichtig], [0, [30, 40]]);
    assert.equal(SP.objektArt('stein').tiefe, -1, 'Standard-Tiefe');
    assert.equal(SP.objektArt('sammel').wackeln, false);
    assert.equal(SP.dekoArt('bett').flach, true);
    assert.equal(SP.dekoArt('gibtsnicht'), null);
  });
});

gruppe('Zeichner', () => {
  test('alle Ebenen mit den Zeichnern von Kern und Bereichen, sortiert nach reihe', () => {
    assert.deepEqual(EBENEN, ['boden', 'welt', 'ueber', 'licht', 'bildschirm']);
    const namen = (e) => ZEICHNER[e].map((z) => z.name);
    assert.deepEqual(namen('welt'), ['objekte', 'pflanzen', 'deko', 'gebaeude', 'muehlrad', 'fallend', 'funde', 'npcs', 'huehner', 'monster', 'spieler', 'fang']);
    assert.deepEqual(namen('boden'), ['glitzern', 'beete', 'wanddeko']);
    assert.deepEqual(namen('ueber'), ['ziel', 'angeln', 'partikel', 'texte']);
    assert.deepEqual(namen('licht'), ['wetter', 'dunkel']);
    assert.deepEqual(namen('bildschirm'), ['blitz', 'drill']);
    for (const e of EBENEN) for (let i = 1; i < ZEICHNER[e].length; i++) assert.ok(ZEICHNER[e][i - 1].reihe <= ZEICHNER[e][i].reihe, e);
  });
  test('zeichner prüft Ebene, Funktion und Namen', () => {
    assert.throws(() => zeichner({ name: 'x', ebene: 'himmel', zeichnen() {} }), /unbekannte Ebene/);
    assert.throws(() => zeichner({ name: 'x', ebene: 'welt', zeichnen() {} }), /braucht sammeln/);
    assert.throws(() => zeichner({ name: 'x', ebene: 'ueber', sammeln() {} }), /braucht zeichnen/);
    assert.throws(() => zeichner({ name: 'monster', ebene: 'welt', sammeln() {} }), /gibt es schon/);
  });
});

gruppe('Oberfläche', () => {
  test('jedes Fenster, das irgendwo geöffnet wird, ist registriert', () => {
    const dateien = [];
    const sammeln = (ordner) => {
      for (const e of readdirSync(ordner, { withFileTypes: true })) {
        if (e.isDirectory()) sammeln(`${ordner}${e.name}/`);
        else if (e.name.endsWith('.js')) dateien.push(`${ordner}${e.name}`);
      }
    };
    sammeln(wurzel);
    const namen = new Set();
    for (const f of dateien) for (const m of readFileSync(f, 'utf8').matchAll(/\bfenster(?:Oeffnen)?\('(\w+)'/g)) namen.add(m[1]);
    assert.ok(namen.size >= 8, [...namen].join(', '));
    for (const n of namen) assert.ok(FENSTER[n], `Fenster „${n}" fehlt`);
  });
  test('Menüreiter und Statistik in fester Reihenfolge', () => {
    assert.deepEqual(MENUE_REITER.map((r) => r.id), ['rucksack', 'basteln', 'faehigkeiten', 'freunde', 'aufgaben', 'optionen']);
    assert.deepEqual(STATISTIK.map((z) => z.id), ['tage', 'verdient', 'geerntet', 'gefangen', 'baeume', 'tiefste', 'auftraege']);
  });
  test('Spezialwaren ohne Gegenstand haben ein Bild im Laden', () => {
    const gesehen = new Set();
    for (const s of staende()) {
      for (const id of Object.keys(D.LAEDEN)) {
        for (const w of L.ladenWare(s, id)) {
          if (w.id) continue;
          gesehen.add(w.spezial);
          assert.ok(WARE_BILD[w.spezial], `${id}: ${w.spezial}`);
        }
      }
    }
    assert.deepEqual([...gesehen].sort(), ['kueken', 'rucksack', 'stall', 'upgrade']);
  });
  test('die Oberflächen-Register werfen bei doppelten Namen', () => {
    const doppelt = /gibt es schon/;
    assert.throws(() => fensterArt('laden', () => null), doppelt);
    assert.throws(() => menueReiter({ id: 'aufgaben', name: 'x', bauen() {} }), doppelt);
    assert.throws(() => wareBild('kueken', () => null), doppelt);
    assert.throws(() => statistik({ id: 'tiefste', name: 'x', wert: () => 0 }), doppelt);
  });
});

gruppe('Importregeln der Darstellung', () => {
  const importeVon = (pfad) => [...readFileSync(pfad, 'utf8').matchAll(/^import [^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  const kern = ['daten', 'karten', 'system', 'logik', 'spiel', 'mine', 'angeln', 'zufall'].map((m) => `../../${m}.js`);
  test('grafik.js: DOM-freier Kern, sprites.js, render.js, eigenes inhalt.js', () => {
    const erlaubt = [...kern, '../../sprites.js', '../../render.js', './inhalt.js'];
    for (const b of BEREICHE) for (const i of importeVon(`${wurzel}bereiche/${b}/grafik.js`)) assert.ok(erlaubt.includes(i), `${b}/grafik.js importiert ${i}`);
  });
  test('oberflaeche.js: DOM-freier Kern, ui.js, sprites.js, eigenes inhalt.js', () => {
    const erlaubt = [...kern, '../../ui.js', '../../sprites.js', './inhalt.js'];
    for (const b of BEREICHE) for (const i of importeVon(`${wurzel}bereiche/${b}/oberflaeche.js`)) assert.ok(erlaubt.includes(i), `${b}/oberflaeche.js importiert ${i}`);
  });
  test('der Browser-Kern (sprites, render, ui, eingabe, ton) importiert keine Bereiche', () => {
    for (const m of ['sprites', 'render', 'ui', 'eingabe', 'ton']) {
      for (const i of importeVon(`${wurzel}${m}.js`)) assert.ok(!i.includes('bereiche'), `${m}.js importiert ${i}`);
    }
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
