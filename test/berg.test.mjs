// Bereich „berg": die große Bergkarte (80×52) mit See, Wasserfall, Mineneingang, Zimmerei, Gilde,
// Steinbruch hinter der kaputten Brücke, dazu die Innenräume.
// Aufruf: node test/berg.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { KARTEN, BODEN, boden, punkt, bereichVon, zielVon, warpZiel, wasserArt, istWasser } from '../src/karten.js';
import { FISCHE, LAEDEN, NPCS, OBJEKT_TYPEN, ITEMS } from '../src/daten.js';
import { alle } from '../src/system.js';
import { zufall } from '../src/zufall.js';
import * as L from '../src/logik.js';
import { DEKO_AKTIONEN } from '../src/spiel.js';
import {
  BRUECKE_KOSTEN, STEINBRUCH_ZIEL, NACHWUCHS_TAGE, NACHWUCHS_MAX, brueckeReparieren, steinbruchBestand, steinbruchFuellen,
} from '../src/bereiche/berg/steinbruch.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.stack?.split('\n').slice(0, 3).join('\n      ') ?? e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
const leer = { objekte: {}, felder: {}, funde: [] };
const berg = KARTEN.berg;
const JAHRESZEITEN = ['fruehling', 'sommer', 'herbst', 'winter'];

/** Felder, die von (sx, sy) aus zu Fuß erreichbar sind (ohne Objekte, wenn w = leer). */
function erreichbar(s, def, w, sx, sy) {
  const frei = L.begehbarPruefer(s, def, w);
  const gesehen = new Set([L.k(sx, sy)]);
  const offen = [[sx, sy]];
  while (offen.length) {
    const [x, y] = offen.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const kk = L.k(x + dx, y + dy);
      if (gesehen.has(kk) || !frei(x + dx, y + dy)) continue;
      gesehen.add(kk);
      offen.push([x + dx, y + dy]);
    }
  }
  return gesehen;
}

gruppe('Karte und Gelände', () => {
  test('der Berg ist 80×52 groß, draußen, mit Seewasser und Felsrand', () => {
    assert.equal(berg.w, 80);
    assert.equal(berg.h, 52);
    assert.equal(berg.aussen, true);
    assert.equal(berg.wasser, 'see');
    assert.equal(berg.rand, 'fels');
    assert.ok(berg.deko.length > 250, 'Kulissen: Wälder, Bänke, Feuer …');
  });
  test('die Bodenzeichen des Bereichs sind angelegt', () => {
    assert.equal(BODEN.y.begehbar, false);
    assert.equal(BODEN.v.begehbar, false);
    assert.equal(BODEN.v.wasser, false, 'der Wasserfall ist kein Angelwasser');
    for (const z of ['r', 'u', 'w']) assert.equal(BODEN[z].begehbar, true, z);
  });
  test('jedes Wasserfeld gehört zu einer Gewässerart mit Fisch in jeder Jahreszeit', () => {
    const arten = new Set();
    for (let y = 0; y < berg.h; y++) for (let x = 0; x < berg.w; x++) if (istWasser(berg, x, y)) arten.add(wasserArt(berg, x, y));
    assert.deepEqual([...arten].sort(), ['fluss', 'see']);
    for (const art of arten) for (const jz of JAHRESZEITEN) {
      assert.ok(FISCHE.some((f) => f.fisch.orte.includes(art) && f.fisch.jz.includes(jz)), `${art} im ${jz}`);
    }
  });
  test('Bergsee mit Insel: Wasser rundum, Gras in der Mitte, ein Steg ragt hinein', () => {
    const see = punkt('berg', 'see1');
    assert.equal(boden(berg, see.x, see.y), 'h', 'Steg');
    let wasser = 0;
    for (let y = 20; y < 35; y++) for (let x = 18; x < 42; x++) if (boden(berg, x, y) === '~') wasser++;
    assert.ok(wasser > 150, `See: ${wasser} Felder`);
    assert.equal(boden(berg, 29, 26), '.', 'Insel');
    assert.equal(wasserArt(berg, 30, 22), 'see');
  });
  test('der Fluss zum Steinbruch ist Flusswasser, Becken und Teiche sind Seewasser', () => {
    assert.equal(wasserArt(berg, 63, 15), 'fluss');
    assert.equal(wasserArt(berg, 34, 9), 'see');
    assert.equal(wasserArt(berg, 71, 44), 'see');
  });
  test('Wasserfall: zwei Fälle, Becken darunter, nicht begehbar', () => {
    for (const [x, y] of [[34, 3], [35, 5], [63, 5]]) assert.equal(boden(berg, x, y), 'v');
    assert.equal(boden(berg, 34, 7), '~');
    assert.equal(boden(berg, 63, 7), '~');
    const s = neues();
    assert.ok(!L.begehbar(s, berg, leer, 34, 4));
  });
  test('Klippen: die Südwand des Plateaus hat eine Treppe, sonst keinen Durchgang', () => {
    assert.equal(boden(berg, 52, 16), 'T');
    assert.equal(boden(berg, 53, 17), 'T');
    assert.equal(boden(berg, 50, 16), 'y');
    const s = neues();
    const ok = erreichbar(s, berg, leer, punkt('berg', 'vonHof').x, punkt('berg', 'vonHof').y);
    const auf = punkt('berg', 'aussicht');
    assert.ok(bereichVon('berg', 'plateau') && L.imBereich(bereichVon('berg', 'plateau'), auf.x, auf.y));
    assert.ok(ok.has(L.k(auf.x, auf.y)), 'das Plateau ist über die Treppe erreichbar');
  });
});

gruppe('Weltgraph und Punkte', () => {
  test('Warps unten am Rand: West-Süd zum Hof, Ost-Süd zum Dorf; Ankunft zwei Felder innen', () => {
    const h = berg.warps.find((w) => w.karte === 'hof');
    const d = berg.warps.find((w) => w.karte === 'dorf');
    assert.equal(h.punkt, 'vonBerg');
    assert.equal(d.punkt, 'vonBerg');
    assert.equal(h.y, berg.h - 1);
    assert.equal(d.y, berg.h - 1);
    assert.ok(h.x < d.x, 'Hof im Westen, Dorf im Osten');
    assert.equal(punkt('berg', 'vonHof').y, berg.h - 3);
    assert.equal(punkt('berg', 'vonDorf').y, berg.h - 3);
  });
  test('von den Ankunftspunkten führt ein gerader Weg zum Warp', () => {
    const s = neues();
    for (const [name, karteId] of [['vonHof', 'hof'], ['vonDorf', 'dorf']]) {
      const p = punkt('berg', name);
      const w = berg.warps.find((x) => x.karte === karteId);
      assert.ok(p.x >= w.x && p.x < w.x + w.w);
      for (let y = p.y; y <= w.y; y++) assert.ok(L.begehbar(s, berg, leer, p.x, y), `${name} (${p.x},${y})`);
    }
  });
  test('Mineneingang: Höhle im Fels, Tür auf mine0.eingang, nur mit mineOffen, vorMine direkt davor', () => {
    const tor = berg.gebaeude.find((g) => g.ziel?.karte === 'mine0');
    assert.equal(tor.ziel.punkt, 'eingang');
    assert.equal(tor.tuerWenn, 'mineOffen');
    assert.ok(tor.sonst);
    assert.equal(boden(berg, tor.tuer.x, tor.tuer.y), ':');
    const v = punkt('berg', 'vorMine');
    assert.deepEqual([v.x, v.y], [tor.tuer.x, tor.tuer.y + 1]);
    const s = neues();
    assert.ok(!L.begehbar(s, berg, leer, tor.tuer.x, tor.tuer.y));
    s.flags.mineOffen = true;
    assert.ok(L.begehbar(s, berg, leer, tor.tuer.x, tor.tuer.y));
    assert.deepEqual(zielVon(tor.ziel), { karte: 'mine0', ...{ x: KARTEN.mine0.punkte.eingang[0], y: KARTEN.mine0.punkte.eingang[1] }, blick: zielVon(tor.ziel).blick });
  });
  test('Weg vom Hof bis zur Mine, zu Zimmerei, Gilde, See und Steinbruchbrücke', () => {
    const s = neues();
    s.flags.mineOffen = true;
    const von = punkt('berg', 'vonHof');
    const ok = erreichbar(s, berg, leer, von.x, von.y);
    for (const name of Object.keys(berg.punkte)) {
      const p = punkt('berg', name);
      assert.ok(ok.has(L.k(p.x, p.y)), name);
    }
    const tor = berg.gebaeude.find((g) => g.ziel?.karte === 'mine0');
    assert.ok(ok.has(L.k(tor.tuer.x, tor.tuer.y)), 'Tür der Mine');
    for (const w of berg.warps) assert.ok(ok.has(L.k(w.x, w.y)), `Warp nach ${w.karte}`);
  });
  test('Zimmerei und Gilde: Tür hinein, Ausgang zurück vor die Tür', () => {
    const s = neues();
    for (const id of ['zimmerei', 'gilde']) {
      const tuer = berg.gebaeude.find((g) => g.ziel?.karte === id);
      assert.ok(tuer, `Tür zur ${id}`);
      const rein = zielVon(tuer.ziel);
      assert.ok(L.begehbar(s, KARTEN[id], L.welt(s, id), rein.x, rein.y));
      const raus = warpZiel(KARTEN[id].warps.find((w) => w.karte === 'berg'));
      assert.deepEqual([raus.x, raus.y], [tuer.tuer.x, tuer.tuer.y + 1]);
      const vor = punkt('berg', id === 'zimmerei' ? 'vorZimmerei' : 'vorGilde');
      assert.deepEqual([vor.x, vor.y], [tuer.tuer.x, tuer.tuer.y + 1]);
    }
  });
});

gruppe('Kulissen', () => {
  const gebaeudeFelder = new Set();
  for (const g of berg.gebaeude) for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) gebaeudeFelder.add(L.k(x, y));
  const sperrig = berg.deko.filter((d) => !d.begehbar && !d.wand);
  test('nichts Sperriges steht auf Wegen, Stufen, Stegen, Wasserfall, Punkten, Warps oder in Gebäuden', () => {
    const punkteFelder = new Set(Object.values(berg.punkte).map((p) => L.k(p[0], p[1])));
    for (const d of sperrig) {
      for (let y = d.y; y < d.y + (d.h || 1); y++) for (let x = d.x; x < d.x + (d.w || 1); x++) {
        const z = boden(berg, x, y);
        const ort = `${d.typ} (${x},${y}) auf „${z}"`;
        if (d.typ === 'berg_bruecke_kaputt') { assert.equal(z, 'w', ort); continue; }
        assert.ok(!'Tvhw#y'.includes(z) || (d.typ === 'berg_schilf'), ort);
        assert.ok(!punkteFelder.has(L.k(x, y)), ort);
        assert.ok(!L.warpAn(berg, x, y), ort);
        assert.ok(!gebaeudeFelder.has(L.k(x, y)), ort);
      }
    }
  });
  test('Bäume, Wegweiser und Bänke blockieren kein Wegfeld (Wege bleiben ganz)', () => {
    for (const d of sperrig) {
      if (d.typ === 'berg_bruecke_kaputt') continue;
      for (let y = d.y; y < d.y + (d.h || 1); y++) for (let x = d.x; x < d.x + (d.w || 1); x++) {
        assert.notEqual(boden(berg, x, y), ':', `${d.typ} (${x},${y}) auf dem Weg`);
      }
    }
  });
  test('Kiefernwälder: viele Nadelbäume, dazu Büsche, Farn und Blumen', () => {
    const kiefern = berg.deko.filter((d) => d.typ === 'baum' && d.art === 'kiefer').length;
    assert.ok(kiefern > 150, `${kiefern} Kiefern`);
    for (const art of ['farn', 'enzian', 'wiese']) assert.ok(berg.deko.some((d) => d.typ === 'berg_bewuchs' && d.art === art), art);
    assert.ok(berg.deko.some((d) => d.typ === 'berg_steinmann'));
  });
  test('Sammelzonen: mehrere, auch die Art „berg", jede auf passendem Boden', () => {
    assert.ok(berg.sammel.length >= 5);
    assert.ok(berg.sammel.some((z) => z.art === 'berg'));
    for (const z of berg.sammel) {
      const boden0 = z.boden ?? '.';
      let n = 0;
      for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (boden(berg, x, y) === boden0) n++;
      assert.ok(n >= 20, `Zone ${z.art} (${z.x},${z.y}) hat nur ${n} passende Felder`);
    }
  });
});

gruppe('Steinbruch hinter der kaputten Brücke', () => {
  const quelle = () => {
    const s = neues();
    s.flags.mineOffen = true;
    return s;
  };
  const drueben = () => {
    const b = bereichVon('berg', 'steinbruch');
    return [b.x + 2, 21];
  };
  test('ohne Reparatur versperrt die Brücke den Weg, mit der Flagge steinbruch ist er frei', () => {
    const s = quelle();
    const von = punkt('berg', 'steinbruch');
    const [dx, dy] = drueben();
    assert.ok(erreichbar(s, berg, leer, von.x, von.y).has(L.k(von.x, von.y)));
    assert.ok(!erreichbar(s, berg, leer, von.x, von.y).has(L.k(dx, dy)), 'Steinbruch von hier aus unerreichbar');
    s.flags.steinbruch = true;
    L.kartenGeaendert();
    assert.ok(erreichbar(s, berg, leer, von.x, von.y).has(L.k(dx, dy)), 'jetzt drüben');
    // die Aufzählung der Deko ändert sich mit der Flagge (kaputtes Bild weg)
    assert.ok(!L.dekoListe(s, berg).some((d) => d.typ === 'berg_bruecke_kaputt'));
    delete s.flags.steinbruch;
    L.kartenGeaendert();
    assert.ok(L.dekoListe(s, berg).some((d) => d.typ === 'berg_bruecke_kaputt'));
  });
  test('Reparatur: ohne Material nichts, mit Material Flagge, Kosten abgezogen, nur einmal', () => {
    const s = quelle();
    assert.deepEqual(BRUECKE_KOSTEN, { holz: 60, stein: 30 });
    assert.equal(brueckeReparieren(s).grund, 'material');
    assert.ok(!s.flags.steinbruch);
    L.hinzufuegen(s, { id: 'holz', n: 70 });
    L.hinzufuegen(s, { id: 'stein', n: 29 });
    assert.equal(brueckeReparieren(s).grund, 'material', 'ein Stein fehlt');
    assert.equal(L.anzahl(s, 'holz'), 70, 'nichts abgezogen');
    L.hinzufuegen(s, { id: 'stein', n: 5 });
    assert.equal(brueckeReparieren(s).ok, true);
    assert.equal(s.flags.steinbruch, true);
    assert.equal(L.anzahl(s, 'holz'), 10);
    assert.equal(L.anzahl(s, 'stein'), 4);
    assert.equal(brueckeReparieren(s).grund, 'fertig');
    assert.equal(L.anzahl(s, 'holz'), 10, 'zweites Mal kostet nichts');
  });
  test('die Deko-Aktion der Brücke ist da, hat einen Hinweis und gehört dem Bereich (Präfix berg_)', () => {
    assert.ok(DEKO_AKTIONEN.berg_bruecke);
    const d = berg.deko.find((x) => x.aktion === 'berg_bruecke');
    assert.ok(d && d.nurWenn === '!berg_steinbruch');
    assert.equal(DEKO_AKTIONEN.berg_bruecke.hinweis(d, { flags: {} }), 'Kaputte Brücke ausbessern');
    assert.equal(DEKO_AKTIONEN.berg_bruecke.hinweis(d, { flags: { steinbruch: true } }), 'Brücke');
  });
  test('neues Spiel: der Steinbruch ist gefüllt (Steine, Felsbrocken, Kupfer, Eisen, Gold)', () => {
    const s = quelle();
    assert.deepEqual(steinbruchBestand(s), STEINBRUCH_ZIEL);
    const { welt } = L.ortVon(s, 'berg');
    const b = bereichVon('berg', 'steinbruch');
    const arten = new Set();
    for (const [kk, o] of Object.entries(welt.objekte)) {
      const [x, y] = L.ausK(kk);
      if (!L.imBereich(b, x, y)) continue;
      assert.equal(boden(berg, x, y), 'u', `Objekt ${o.t} auf Schotter, nicht auf dem Weg (${x},${y})`);
      if (o.t === 'mstein') { arten.add(o.art); assert.ok(o.hp > 0 && ['kupfer', 'eisen', 'gold'].includes(o.art)); }
    }
    assert.deepEqual([...arten].sort(), ['eisen', 'gold', 'kupfer']);
  });
  test('Nachwuchs: erst nach der Reparatur, alle NACHWUCHS_TAGE Tage, höchstens NACHWUCHS_MAX Stück', () => {
    const s = quelle();
    const r = zufall(5);
    const { welt } = L.ortVon(s, 'berg');
    const b = bereichVon('berg', 'steinbruch');
    // Spielerin räumt den Steinbruch leer
    const leeren = () => { for (const kk of Object.keys(welt.objekte)) { const [x, y] = L.ausK(kk); if (L.imBereich(b, x, y)) delete welt.objekte[kk]; } };
    const summe = () => Object.values(steinbruchBestand(s)).reduce((a, n) => a + n, 0);
    leeren();
    assert.equal(summe(), 0);
    for (let i = 0; i < 6; i++) L.tagBeenden(s, { r });
    assert.equal(summe(), 0, 'ohne Brücke wächst nichts nach');
    s.flags.steinbruch = true;
    const tage = [];
    for (let i = 0; i < 12; i++) { const vorher = summe(); L.tagBeenden(s, { r }); tage.push(summe() - vorher); }
    const nachschub = tage.filter((n) => n > 0);
    assert.ok(nachschub.length >= 3 && nachschub.length <= 5, `Nachschub an ${nachschub.length} von 12 Tagen: ${tage}`);
    for (const n of nachschub) assert.ok(n <= NACHWUCHS_MAX, `${n} auf einmal`);
    assert.ok(NACHWUCHS_TAGE >= 2 && NACHWUCHS_TAGE <= 5);
    const b2 = steinbruchBestand(s);
    for (const art of Object.keys(STEINBRUCH_ZIEL)) assert.ok(b2[art] <= STEINBRUCH_ZIEL[art], `${art} nie über dem Ziel`);
    // ... und nach genügend Zeit ist er wieder ganz voll
    for (let i = 0; i < 40; i++) L.tagBeenden(s, { r });
    assert.deepEqual(steinbruchBestand(s), STEINBRUCH_ZIEL);
  });
  test('Nachwuchs nimmt nur freie Schotterfelder (nicht den Weg, nicht belegte Felder)', () => {
    const s = quelle();
    s.flags.steinbruch = true;
    const { welt } = L.ortVon(s, 'berg');
    const b = bereichVon('berg', 'steinbruch');
    welt.objekte[L.k(b.x + 1, b.y + 1)] = { t: 'truhe', inv: [] };
    for (const kk of Object.keys(welt.objekte)) { const [x, y] = L.ausK(kk); if (L.imBereich(b, x, y) && welt.objekte[kk].t !== 'truhe') delete welt.objekte[kk]; }
    steinbruchFuellen(s, zufall(3), { voll: true });
    assert.equal(welt.objekte[L.k(b.x + 1, b.y + 1)].t, 'truhe', 'fremdes Objekt bleibt');
    for (const [kk, o] of Object.entries(welt.objekte)) {
      const [x, y] = L.ausK(kk);
      if (!L.imBereich(b, x, y) || o.t === 'truhe') continue;
      assert.equal(boden(berg, x, y), 'u');
    }
    // der Weg von der Brücke in den Steinbruch bleibt frei
    const frei = erreichbar(s, berg, welt, b.x, 21);
    assert.ok(frei.has(L.k(b.x + 5, 21)), 'Gasse im Steinbruch');
  });
  test('ältere Stände ohne Berg-Zustand bekommen ihre Objekte beim ersten Tagesende', () => {
    const s = quelle();
    delete s.berg;
    L.welt(s, 'berg').objekte = {};
    L.ergaenzen(s);
    assert.equal(s.berg.gefuellt, false);
    L.tagBeenden(s, { r: zufall(1) });
    assert.equal(s.berg.gefuellt, true);
    assert.deepEqual(steinbruchBestand(s), STEINBRUCH_ZIEL);
    assert.ok(Object.values(L.welt(s, 'berg').objekte).some((o) => o.t === 'stein'));
  });
  test('Spielstand mit s.berg übersteht Speichern und Laden', () => {
    const s = quelle();
    const t = L.deserialisieren(L.serialisieren(s));
    assert.deepEqual(t.berg, s.berg);
    assert.deepEqual(steinbruchBestand(t), steinbruchBestand(s));
  });
  test('Wiesen: Steine, Unkraut, Äste und Kiefern zum Fällen, aber nichts auf Wegen oder Punkten', () => {
    const s = quelle();
    const { welt } = L.ortVon(s, 'berg');
    const b = bereichVon('berg', 'steinbruch');
    const zaehl = {};
    const punkteFelder = new Set(Object.values(berg.punkte).map((p) => L.k(p[0], p[1])));
    for (const [kk, o] of Object.entries(welt.objekte)) {
      const [x, y] = L.ausK(kk);
      if (L.imBereich(b, x, y) || o.t === 'sammel') continue;
      zaehl[o.t] = (zaehl[o.t] || 0) + 1;
      assert.ok('.r'.includes(boden(berg, x, y)), `${o.t} auf „${boden(berg, x, y)}" (${x},${y})`);
      assert.ok(!punkteFelder.has(kk), `${o.t} auf Punkt`);
      if (o.t === 'baum') assert.equal(o.art, 'kiefer');
    }
    for (const t of ['stein', 'unkraut', 'ast', 'baum']) assert.ok(zaehl[t] > 5, `${t}: ${zaehl[t]}`);
    assert.ok(zaehl.fels >= 2, `Felsbrocken am Wandfuß: ${zaehl.fels}`);
    assert.ok(OBJEKT_TYPEN.baum && OBJEKT_TYPEN.stein && OBJEKT_TYPEN.fels && OBJEKT_TYPEN.mstein);
  });
  test('Erzbrocken am Berg lassen keine Leiter zurück (auch wenn der Zufall sie würfelt)', () => {
    const s = quelle();
    s.flags.steinbruch = true;
    const ort = L.ortVon(s, 'berg');
    const b = bereichVon('berg', 'steinbruch');
    const [x, y] = [b.x + 3, 12];
    const kk = L.k(x, y);
    ort.welt.objekte[kk] = { t: 'mstein', art: 'kupfer', hp: 1, v: 0 };
    const erg = L.neuesErgebnis();
    OBJEKT_TYPEN.mstein.spitzhacke({ s, ort, x, y, kk, o: ort.welt.objekte[kk], erg, r: () => 0, kraft: 5, stufe: 0 });
    assert.ok(erg.zerbrochen, 'Brocken ist kaputt');
    alle('schwung', { s, ort, felder: [[x, y]], erg });
    assert.equal(ort.welt.objekte[kk], undefined, 'keine Leiter');
    assert.ok(!erg.leiter);
    assert.ok(erg.items.some((it) => it.id === 'kupfererz'));
  });
});

gruppe('Zimmerei und Gilde von innen', () => {
  const inne = (id) => KARTEN[id];
  test('Zimmerei: Theke, Werkbank, drei Betten (Greta, Kai, Nele), alles erreichbar', () => {
    const z = inne('zimmerei');
    for (const n of ['eingang', 'theke', 'werkbank', 'bett_greta', 'bett_kai', 'bett_nele']) assert.ok(z.punkte[n], n);
    const s = neues();
    const ein = punkt('zimmerei', 'eingang');
    const ok = erreichbar(s, z, leer, ein.x, ein.y);
    for (const [n, [x, y]] of Object.entries(z.punkte)) assert.ok(ok.has(L.k(x, y)), n);
    assert.ok(z.w >= 17 && z.h >= 12, 'größer als der Platzhalter');
    assert.equal(z.innen, 'zimmerei');
  });
  test('Gilde: Theke, Vitrinen mit Waffen, Gildentafel, Alriks Kammer mit Bett, alles erreichbar', () => {
    const g = inne('gilde');
    for (const n of ['eingang', 'theke', 'bett_alrik']) assert.ok(g.punkte[n], n);
    assert.ok(g.deko.filter((d) => d.typ === 'berg_vitrine').length >= 2);
    assert.ok(g.deko.some((d) => d.typ === 'berg_gildentafel'));
    const s = neues();
    const ein = punkt('gilde', 'eingang');
    const ok = erreichbar(s, g, leer, ein.x, ein.y);
    for (const [n, [x, y]] of Object.entries(g.punkte)) assert.ok(ok.has(L.k(x, y)), n);
    assert.ok(g.w >= 19 && g.h >= 12);
  });
  test('Theken: die Person steht am Punkt „theke", die Theke-Deko davor; Läden sind bedienbar', () => {
    for (const [karteId, ladenId, npc] of [['zimmerei', 'zimmerei', 'greta'], ['gilde', 'gilde', 'alrik']]) {
      const k = inne(karteId);
      const th = k.deko.find((d) => d.typ === 'theke');
      const p = punkt(karteId, 'theke');
      assert.equal(th.aktion, 'laden');
      assert.equal(th.laden, ladenId);
      assert.ok(p.x >= th.x && p.x < th.x + th.w && th.y === p.y + 1, `${karteId}: Theke liegt direkt vor dem Standplatz`);
      assert.ok(LAEDEN[ladenId], `Laden ${ladenId}`);
      assert.equal(LAEDEN[ladenId].npc, npc);
      assert.deepEqual(LAEDEN[ladenId].ort, { karte: karteId, punkt: 'theke' });
      assert.ok(NPCS[npc].heim.karte === karteId);
      const s = neues();
      assert.ok(L.begehbar(s, k, leer, p.x, p.y), 'Standplatz hinter der Theke begehbar');
      assert.ok(L.begehbar(s, k, leer, p.x, p.y + 2), 'davor kann man stehen');
    }
  });
  test('beide Räume lassen sich durch die Tür verlassen und wieder betreten', () => {
    for (const id of ['zimmerei', 'gilde']) {
      const k = inne(id);
      const w = k.warps.find((x) => x.karte === 'berg');
      assert.ok(w);
      const e = punkt(id, 'eingang');
      assert.deepEqual([e.x, e.y], [w.x, w.y - 1], `${id}: Eingang liegt direkt vor dem Ausgang`);
    }
  });
  test('Betten und Möbel blockieren weder Türen noch Durchgänge zwischen den Räumen', () => {
    for (const id of ['zimmerei', 'gilde']) {
      const k = inne(id);
      const s = neues();
      const e = punkt(id, 'eingang');
      const ok = erreichbar(s, k, leer, e.x, e.y);
      let boden0 = 0;
      for (let y = 2; y < k.h - 1; y++) for (let x = 1; x < k.w - 1; x++) if ('_t'.includes(boden(k, x, y))) boden0++;
      assert.ok(ok.size > boden0 * 0.5, `${id}: ${ok.size} von ${boden0} Feldern erreichbar`);
    }
  });
});

gruppe('Darstellung und Daten', () => {
  test('die Wälder stehen nur auf Gras: kein Baum im Wasser, auf Klippen oder Sand', () => {
    for (const d of berg.deko.filter((x) => x.typ === 'baum')) assert.ok('.r'.includes(boden(berg, d.x, d.y)), `Baum (${d.x},${d.y}) auf „${boden(berg, d.x, d.y)}"`);
  });
  test('alle eigenen Bild- und Deko-Namen tragen das Präfix berg_', () => {
    const geteilt = new Set(['baum', 'busch', 'felsen', 'laterne', 'schild', 'kiste', 'fenster', 'bild', 'kamin', 'pflanze', 'tisch', 'theke', 'zaun']);
    for (const id of ['berg', 'zimmerei', 'gilde']) for (const d of KARTEN[id].deko) assert.ok(geteilt.has(d.typ) || d.typ.startsWith('berg_'), `${id}: ${d.typ}`);
    for (const d of berg.deko) if (d.aktion) assert.ok(['text', 'laden'].includes(d.aktion) || d.aktion.startsWith('berg_'), d.aktion);
  });
  test('Gewässer ohne Zugang zu Fisch: jeder Gewässerrahmen liegt auf Wasser', () => {
    for (const g of berg.gewaesser) {
      let n = 0;
      for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.b; x++) if (istWasser(berg, x, y)) n++;
      assert.ok(n > 10, `Gewässer ${g.art}`);
    }
    assert.ok(ITEMS.holz && ITEMS.stein, 'Baustoffe der Brücke existieren');
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
