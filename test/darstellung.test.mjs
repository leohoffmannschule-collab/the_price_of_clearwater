// Darstellung ohne Bildschirm: Bild-Register (sprites.js), Zeichner-Ebenen (render.js),
// Fenster und Menüreiter (ui.js), Importregeln für grafik.js und oberflaeche.js.
// Die Pixel selbst prüft der Browser-Rauchtest (test/browser.mjs).
// Aufruf: node test/darstellung.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/bereiche/inhalt.js';
import '../src/bereiche/grafik.js';
import '../src/bereiche/oberflaeche.js';
import * as D from '../src/daten.js';
import * as SP from '../src/sprites.js';
import { KARTEN, BODEN, karteHolen } from '../src/karten.js';
import { MONSTER } from '../src/mine.js';
import { EBENEN, ZEICHNER, zeichner, SCHWUNG, schwungKunst } from '../src/render.js';
import {
  FENSTER, FENSTER_OPT, MENUE_REITER, WARE_BILD, STATISTIK, RUCKSACK_TEILE, RUCKSACK_AKTIONEN, STILE,
  fensterArt, menueReiter, wareBild, statistik, rucksackTeil, rucksackAktion, stil,
} from '../src/ui.js';
import * as L from '../src/logik.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }

const wurzel = fileURLToPath(new URL('../src/', import.meta.url));
const BEREICHE = ['basis', 'hof', 'dorf', 'wildnis', 'berg', 'pflanzen', 'angeln', 'mine', 'handwerk', 'tiere', 'npcs', 'npcs2', 'feste', 'gemeinschaft'];
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });

/** Spielstände, in denen dynamische Gebäude und Deko (Hooks) einmal da und einmal weg sind. */
function staende() {
  const a = neues();
  const b = neues();
  for (let i = 0; i < 6; i++) L.tagBeenden(b, { r: () => 0.5 });
  b.flags.mineOffen = true;
  // Bereichszustand, der Gebäude erscheinen lässt (fehlt ein Schlüssel, bleibt es beim Ersten)
  if (b.stall) b.stall.gebaut = true;
  b.muehle = true;
  L.kartenGeaendert();
  return [a, b];
}
/** Alle Karten, die es gibt: feste und die Karten, die Kartenanbieter für Türen und Warps erzeugen. */
function alleKarten() {
  const liste = Object.values(KARTEN);
  const s = staende()[1];
  const ids = new Set();
  for (const def of Object.values(KARTEN)) {
    for (const g of L.gebaeudeListe(s, def)) if (g.ziel && !KARTEN[g.ziel.karte]) ids.add(g.ziel.karte);
    for (const d of L.dekoListe(s, def)) if (d.ziel && !KARTEN[d.ziel.karte]) ids.add(d.ziel.karte);
  }
  for (const id of ['mine1', 'mine15', 'mine25', 'mine45', 'mine90']) ids.add(id);
  for (const id of ids) { const d = karteHolen(id, s); if (d) liste.push(d); }
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
  test('jedes Monster hat ein Bild', () => {
    for (const [id, m] of Object.entries(MONSTER)) assert.ok(SP.MONSTER_BILD[id] || SP.MONSTER_BILD[m.art], id);
  });
  test('jedes Bodenzeichen der Karten hat ein Bild, jede Karte ihre Farben', () => {
    for (const z of Object.keys(BODEN)) assert.ok(SP.BODEN_BILD[z], `Boden ${z}`);
    for (const def of alleKarten()) {
      const rand = def.rand || (def.innen === 'mine' ? 'mine' : 'wand');
      for (const zeile of def.grid) for (const z of zeile) assert.ok(SP.BODEN_BILD[`${z}:${rand}`] || SP.BODEN_BILD[z], `${def.id}: ${z}`);
      if (def.innen && def.innen !== 'mine') assert.ok(SP.INNEN_FARBEN[def.innen], `Innenraum ${def.innen}`);
      if (def.wasser) assert.ok(SP.WASSER_FARBE[def.wasser], `Wasser ${def.wasser}`);
      if (def.innen === 'mine') assert.ok(SP.MINE_FARBEN[def.band || 0], `${def.id}: Farben für Minen-Band ${def.band}`);
    }
    for (const art of ['teich', 'fluss', 'see', 'waldsee', 'meer', 'geheimteich', 'mine']) assert.ok(SP.WASSER_FARBE[art], `Wasserfarbe ${art}`);
  });
  test('Innenraum- und Wasserfarben werfen bei doppelten Namen', () => {
    assert.throws(() => SP.innenFarben('haus', {}), /gibt es schon/);
    assert.throws(() => SP.wasserFarbe('meer', '#000000'), /gibt es schon/);
    SP.wasserFarbe('testwasser', '#123456');
    assert.equal(SP.WASSER_FARBE.testwasser, '#123456');
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
    SP.belagKunst('testbelag', () => {});
    assert.throws(() => SP.belagKunst('testbelag', () => {}), doppelt);
    schwungKunst('testschwung', () => {});
    assert.throws(() => schwungKunst('testschwung', () => {}), doppelt);
    assert.ok(SCHWUNG.testschwung);
    const alt = SP.KUNST.hacke;
    SP.kunst('hacke', alt, { ersetzen: true });
    assert.equal(SP.KUNST.hacke, alt);
  });
  test('Darstellungsfelder: Standardwerte und eigene Felder', () => {
    SP.objektKunst('testobjekt', { malen() {} });
    SP.objektKunst('testbaum', { malen() {}, tiefe: 0, durchsichtig: [30, 40], wackeln: false });
    assert.deepEqual([SP.objektArt('testobjekt').tiefe, SP.objektArt('testobjekt').wackeln], [-1, true], 'Standard');
    const b = SP.objektArt('testbaum');
    assert.deepEqual([b.tiefe, b.durchsichtig, b.wackeln], [0, [30, 40], false]);
    SP.dekoKunst('testbett', { malen() {}, flach: true });
    assert.equal(SP.dekoArt('testbett').flach, true);
    assert.equal(SP.dekoArt('testbett').umriss, true, 'Deko hat standardmäßig einen Umriss');
    assert.equal(SP.dekoArt('gibtsnicht'), null);
    assert.ok(SP.OBJEKT_BILD.teil, 'Teile großer Objekte haben ein (leeres) Bild');
  });
});

gruppe('Zeichner', () => {
  test('alle Ebenen mit den Zeichnern des Kerns in fester Reihenfolge, sortiert nach reihe', () => {
    assert.deepEqual(EBENEN, ['boden', 'welt', 'ueber', 'licht', 'bildschirm']);
    const KERN = {
      boden: ['glitzern', 'beete', 'belag', 'wanddeko'],
      welt: ['objekte', 'pflanzen', 'deko', 'gebaeude', 'funde', 'npcs', 'spieler'],
      ueber: ['ziel', 'partikel', 'texte'],
      licht: ['wetter', 'dunkel'],
      bildschirm: ['blitz'],
    };
    for (const e of EBENEN) {
      const namen = ZEICHNER[e].map((z) => z.name);
      assert.deepEqual(namen.filter((n) => KERN[e].includes(n)), KERN[e], e);
      for (let i = 1; i < ZEICHNER[e].length; i++) assert.ok(ZEICHNER[e][i - 1].reihe <= ZEICHNER[e][i].reihe, e);
      assert.equal(new Set(namen).size, namen.length, `${e}: Namen doppelt`);
    }
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
  test('Menüreiter und Statistik: die des Kerns in fester Reihenfolge, alle nach reihe sortiert', () => {
    const kernReiter = ['rucksack', 'basteln', 'faehigkeiten', 'freunde', 'optionen'];
    assert.deepEqual(MENUE_REITER.map((r) => r.id).filter((id) => kernReiter.includes(id)), kernReiter);
    const kernStatistik = ['tage', 'verdient', 'geerntet', 'gefangen', 'baeume', 'auftraege'];
    assert.deepEqual(STATISTIK.map((z) => z.id).filter((id) => kernStatistik.includes(id)), kernStatistik);
    for (const liste of [MENUE_REITER, STATISTIK, RUCKSACK_TEILE, RUCKSACK_AKTIONEN]) {
      for (let i = 1; i < liste.length; i++) assert.ok(liste[i - 1].reihe <= liste[i].reihe);
    }
  });
  test('Spezialwaren ohne Gegenstand haben ein Bild im Laden', () => {
    let gesehen = 0;
    for (const s of staende()) {
      for (const id of Object.keys(D.LAEDEN)) {
        for (const w of L.ladenWare(s, id)) {
          if (w.id) continue;
          gesehen++;
          assert.ok(WARE_BILD[w.spezial], `${id}: ${w.spezial}`);
        }
      }
    }
    assert.ok(gesehen > 0);
  });
  test('Fenster-Optionen: fest und Beispieldaten für den Rauchtest', () => {
    assert.equal(FENSTER_OPT.tagEnde.fest, true);
    assert.equal(FENSTER_OPT.menue.fest, false);
    for (const [name, opt] of Object.entries(FENSTER_OPT)) {
      assert.ok(FENSTER[name], name);
      if (opt.beispiele) assert.ok(Array.isArray(opt.beispiele()) && opt.beispiele().length, `${name}: Beispiele`);
    }
  });
  test('Rucksack-Teile, Rucksack-Aktionen und Stile sind Register', () => {
    rucksackTeil({ id: 'testteil', reihe: 5, bauen: () => null });
    rucksackAktion({ id: 'testaktion', name: 'Test', wenn: () => false, tun() {} });
    assert.throws(() => rucksackTeil({ id: 'testteil', bauen: () => null }), /gibt es schon/);
    assert.throws(() => rucksackAktion({ id: 'testaktion', name: 'x', wenn: () => false, tun() {} }), /gibt es schon/);
    assert.ok(RUCKSACK_TEILE.some((x) => x.id === 'testteil'));
    stil('test-stil', '.x { color: red; }');
    assert.throws(() => stil('test-stil', ''), /gibt es schon/);
    assert.ok(STILE['dorf-laden'] && STILE['gemeinschaft-buendel'], 'Bereichsstile liegen in den Bereichen');
    const kernCss = readFileSync(`${wurzel}style.css`, 'utf8');
    for (const klasse of ['.laden-kopf', '.buendel', '.versand-liste']) assert.ok(!kernCss.includes(klasse), `${klasse} gehört nicht ins Kern-Stylesheet`);
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
  const importeVon = (pfad) => [...readFileSync(pfad, 'utf8').matchAll(/^\s*(?:import|export)\s+(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  /** Fremde Importe einer Bereichsdatei; Dateien im eigenen Ordner werden verfolgt (wie in register.test.mjs). */
  function fremdeImporte(pfad, ordner, gesehen = new Set()) {
    if (gesehen.has(pfad)) return [];
    gesehen.add(pfad);
    const liste = [];
    for (const i of importeVon(pfad)) {
      const ziel = resolve(dirname(pfad), i);
      if (ziel.startsWith(ordner)) liste.push(...fremdeImporte(ziel, ordner, gesehen));
      else liste.push({ datei: pfad, i, ziel });
    }
    return liste;
  }
  const kern = ['daten', 'karten', 'system', 'logik', 'spiel', 'mine', 'angeln', 'zufall'];
  const pruefen = (datei, extra) => {
    const erlaubt = [...kern, ...extra].map((m) => `${wurzel}${m}.js`);
    for (const b of BEREICHE) {
      for (const { datei: d, i, ziel } of fremdeImporte(`${wurzel}bereiche/${b}/${datei}`, `${wurzel}bereiche/${b}/`)) {
        assert.ok(erlaubt.includes(ziel), `${d.slice(wurzel.length)} importiert ${i}`);
      }
    }
  };
  test('grafik.js samt eigenen Dateien: DOM-freier Kern, sprites.js, render.js', () => pruefen('grafik.js', ['sprites', 'render']));
  test('oberflaeche.js samt eigenen Dateien: DOM-freier Kern, ui.js, sprites.js', () => pruefen('oberflaeche.js', ['ui', 'sprites']));
  test('der Browser-Kern (sprites, render, ui, eingabe, ton) importiert keine Bereiche', () => {
    for (const m of ['sprites', 'render', 'ui', 'eingabe', 'ton']) {
      for (const i of importeVon(`${wurzel}${m}.js`)) assert.ok(!i.includes('bereiche'), `${m}.js importiert ${i}`);
    }
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
