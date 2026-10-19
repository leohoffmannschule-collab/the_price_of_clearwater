// Karten, Punkte-Vertrag, Weltgraph, Wege der Dorfbewohner, Bau-Helfer, dynamische Karten.
// Aufruf: node test/karten.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { NPCS, LAEDEN } from '../src/daten.js';
import {
  KARTEN, BODEN, boden, punkt, bereichVon, verbindungen, warpZiel, zielVon, karteHolen, karte, kartenAnbieter, karteVergessen,
  raster, rechteck, ellipse, pfad, rahmen, raum, fertigRaster,
} from '../src/karten.js';
import { system } from '../src/system.js';
import * as L from '../src/logik.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }

const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
/** Spielstände, mit denen Karten geprüft werden: frisch, und einige Tage später mit offener Mine. */
function zustaende() {
  const frisch = neues(7);
  const spaeter = neues(8);
  for (let i = 0; i < 6; i++) L.tagBeenden(spaeter, { r: () => 0.5 });
  spaeter.flags.mineOffen = true;
  // Bereichszustand, der zusätzliche Gebäude zeigt (fehlt der Schlüssel, bleibt der Stand, wie er ist)
  if (spaeter.stall) spaeter.stall.gebaut = true;
  if (spaeter.mine) spaeter.mine.schwert = true;
  L.kartenGeaendert();
  return [frisch, spaeter];
}
const leer = { objekte: {}, felder: {}, funde: [] };

/** Felder, die von (sx, sy) aus erreichbar sind. */
function erreichbar(s, def, w, sx, sy) {
  const gesehen = new Set([L.k(sx, sy)]);
  const offen = [[sx, sy]];
  while (offen.length) {
    const [x, y] = offen.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const kk = L.k(nx, ny);
      if (gesehen.has(kk) || !L.begehbar(s, def, w, nx, ny)) continue;
      gesehen.add(kk);
      offen.push([nx, ny]);
    }
  }
  return gesehen;
}

// Punkte-Vertrag: diese Punkte muss jede Karte liefern, sobald es sie gibt.
const VERTRAG = {
  hof: ['vonDorf', 'vonWald', 'vonBerg', 'vorHaus', 'vorGewaechshaus', 'versandkiste', 'briefkasten'],
  haus: ['eingang', 'bett', 'fernseher', 'kueche', 'partner'],
  gewaechshaus: ['eingang'],
  dorf: ['vonHof', 'vonStrand', 'vonBerg', 'vonWald', 'brunnen', 'platz', 'brett', 'bank1', 'bank2', 'fluss1', 'fluss2',
    'spielplatz', 'friedhof', 'garten', 'vorLaden', 'vorGasthaus', 'vorSchmiede', 'vorRathaus', 'vorArzt', 'vorMuseum',
    'vorMuehle', 'vorHausRosa'],
  laden: ['eingang', 'theke', 'regal', 'bett_ottilie', 'bett_jonas'],
  gasthaus: ['eingang', 'theke', 'tisch1', 'tisch2', 'tisch3', 'kamin', 'billard', 'bett_hannes'],
  schmiede: ['eingang', 'theke', 'amboss', 'bett_bruno'],
  rathaus: ['eingang', 'schreibtisch', 'bett_frieda'],
  arzt: ['eingang', 'theke', 'bett_theo'],
  museum: ['eingang', 'theke', 'lesesaal', 'bett_mira'],
  hausRosa: ['eingang', 'kueche', 'bett_rosa', 'bett_pia'],
  muehle: ['eingang'],
  strand: ['vonDorf', 'steg', 'vorFischladen', 'vorHuetteMats', 'strand1', 'strand2', 'gezeiten', 'lagerfeuer'],
  fischladen: ['eingang', 'theke', 'bett_lene'],
  huetteMats: ['eingang', 'staffelei', 'bett_mats'],
  wald: ['vonHof', 'vonDorf', 'vorRanch', 'vorTurm', 'haendler', 'see1', 'fluss1', 'lichtung', 'vorGeheimwald'],
  ranch: ['eingang', 'theke', 'bett_wilma', 'bett_sanne'],
  turm: ['eingang', 'buch', 'bett_oswin'],
  geheimwald: ['vonWald'],
  berg: ['vonHof', 'vonDorf', 'vorMine', 'vorZimmerei', 'vorGilde', 'see1', 'steinbruch'],
  zimmerei: ['eingang', 'theke', 'werkbank', 'bett_greta', 'bett_kai', 'bett_nele'],
  gilde: ['eingang', 'theke', 'bett_alrik'],
  mine0: ['eingang'],
};
const VERTRAG_BEREICHE = { hof: ['bauland', 'stall', 'auslauf'], dorf: ['fest'], strand: ['fest'], wald: ['fest'] };
/** Alle Karten des Vertrags gibt es (bis ein Bereich sie ausbaut, als Platzhalter). */
const PFLICHT_KARTEN = Object.keys(VERTRAG);

// Weltgraph: [von, Rand, nach, Ankunftspunkt drüben, Rückweg landet auf]
const KANTEN = [
  ['hof', 'ost', 'dorf', 'vonHof', 'vonDorf'],
  ['hof', 'sued', 'wald', 'vonHof', 'vonWald'],
  ['hof', 'nord', 'berg', 'vonHof', 'vonBerg'],
  ['dorf', 'sued', 'strand', 'vonDorf', 'vonStrand'],
  ['dorf', 'nord', 'berg', 'vonDorf', 'vonBerg'],
  ['dorf', 'west', 'wald', 'vonDorf', 'vonWald'],
];
const amRand = (def, w, rand) => ({
  ost: w.x + w.w - 1 === def.w - 1, west: w.x === 0, nord: w.y === 0, sued: w.y + w.h - 1 === def.h - 1,
}[rand]);
const randAbstand = (def, p, rand) => ({ ost: def.w - 1 - p.x, west: p.x, nord: p.y, sued: def.h - 1 - p.y }[rand]);

gruppe('Raster', () => {
  test('alle Raster sind rechteckig und nutzen nur bekannte Bodenzeichen', () => {
    for (const def of Object.values(KARTEN)) {
      for (const z of def.grid) {
        assert.equal(z.length, def.w, `${def.id}: Zeile „${z}"`);
        for (const c of z) assert.ok(BODEN[c], `${def.id}: unbekanntes Zeichen „${c}"`);
      }
    }
  });
  test('Gebäudetüren liegen in der untersten Reihe', () => {
    for (const s of zustaende()) {
      for (const def of Object.values(KARTEN)) {
        for (const g of L.gebaeudeListe(s, def)) {
          if (!g.tuer) continue;
          assert.equal(g.tuer.y, g.y + g.h - 1, `${def.id}/${g.typ}`);
          assert.ok(g.tuer.x >= g.x && g.tuer.x < g.x + g.w, `${def.id}/${g.typ}`);
          if (g.ziel) assert.notEqual(boden(def, g.tuer.x, g.tuer.y + 1), '#', `${def.id}/${g.typ}: vor der Tür`);
        }
      }
    }
  });
  test('Bau-Helfer zeichnen Rechteck, Ellipse, Weg und Rahmen', () => {
    const g = raster(8, 6, '.');
    rahmen(g, '#');
    rechteck(g, 1, 1, 2, 1, 's');
    pfad(g, [[3, 2], [6, 2], [6, 4]], 1, ':');
    ellipse(g, 2, 4, 0.6, 0.6, '~');
    assert.deepEqual(fertigRaster(g), ['########', '#ss....#', '#..::::#', '#.....:#', '#.~...:#', '########']);
    const breit = fertigRaster(pfad(raster(4, 3, '.'), [[0, 0], [2, 0]], 2, ':'));
    assert.deepEqual(breit, ['::::', '::::', '....']);
    assert.deepEqual(fertigRaster(raum(6, 5)), ['######', '######', '#____#', '#____#', '##_###']);
    assert.deepEqual(fertigRaster(raum(5, 4, { tuerX: 3, boden: 't' })), ['#####', '#####', '#ttt#', '###t#']);
  });
});

gruppe('Punkte-Vertrag und Weltgraph', () => {
  test('alle Pflicht-Karten gibt es', () => {
    for (const id of PFLICHT_KARTEN) assert.ok(KARTEN[id], id);
  });
  test('jede vorhandene Karte liefert alle Vertragspunkte und -bereiche', () => {
    for (const [id, namen] of Object.entries(VERTRAG)) {
      if (!KARTEN[id]) continue;
      for (const n of namen) assert.ok(punkt(id, n), `${id}.${n}`);
    }
    for (const [id, namen] of Object.entries(VERTRAG_BEREICHE)) {
      for (const n of namen) assert.ok(bereichVon(id, n), `${id}: Bereich ${n}`);
    }
  });
  test('die Kanten des Weltgraphen: Warp am richtigen Rand, Ankunft 1–2 Felder innen, Rückweg', () => {
    for (const [von, rand, nach, ankunft, rueck] of KANTEN) {
      const a = KARTEN[von];
      const b = KARTEN[nach];
      const hin = a.warps.find((w) => w.karte === nach && amRand(a, w, rand));
      assert.ok(hin, `${von}: kein Warp am Rand ${rand} nach ${nach}`);
      assert.equal(hin.punkt, ankunft, `${von} → ${nach}`);
      if (von === 'dorf' && rand === 'west') assert.ok(hin.y >= a.h / 2, 'Dorf → Wald liegt in der unteren Hälfte');
      const zurueck = b.warps.find((w) => w.karte === von && w.punkt === rueck);
      assert.ok(zurueck, `${nach}: kein Warp zurück auf ${von}.${rueck}`);
      const p = punkt(von, rueck);
      const d = randAbstand(a, p, rand);
      assert.ok(d >= 1 && d <= 2, `${von}.${rueck} liegt ${d} Felder vom Rand ${rand}`);
    }
  });
  test('Türen und Warps auf andere Karten verweisen über Punkte', () => {
    for (const def of Object.values(KARTEN)) {
      for (const w of def.warps) assert.ok(w.punkt, `${def.id}: Warp nach ${w.karte} ohne Punkt`);
      for (const g of def.gebaeude) if (g.ziel) assert.ok(g.ziel.punkt, `${def.id}/${g.typ}: Tür ohne Punkt`);
    }
  });
  test('Bereiche liegen auf der Karte, Festplätze sind groß und weitgehend frei', () => {
    const s = neues(9);
    for (const def of Object.values(KARTEN)) {
      for (const name of Object.keys(def.bereiche)) {
        const b = bereichVon(def, name);
        assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= def.w && b.y + b.h <= def.h, `${def.id}: Bereich ${name}`);
      }
      const fest = bereichVon(def, 'fest');
      if (!fest) continue;
      let frei = 0;
      for (let y = fest.y; y < fest.y + fest.h; y++) for (let x = fest.x; x < fest.x + fest.w; x++) if (L.begehbar(s, def, leer, x, y)) frei++;
      assert.ok(frei / (fest.w * fest.h) >= 0.85, `${def.id}: Festplatz nur zu ${Math.round((100 * frei) / (fest.w * fest.h))} % frei`);
    }
    const dorfFest = bereichVon('dorf', 'fest');
    assert.ok(dorfFest.w >= 16 && dorfFest.h >= 12, 'Festplatz im Dorf mindestens 16×12');
  });
});

gruppe('Begehbarkeit', () => {
  test('jeder Warp und jede Tür führt auf ein begehbares Feld', () => {
    for (const s of zustaende()) {
      for (const def of Object.values(KARTEN)) {
        const ziele = [...def.warps.map((w) => [w, warpZiel(w)])];
        for (const g of L.gebaeudeListe(s, def)) if (g.ziel) ziele.push([g, zielVon(g.ziel)]);
        for (const [quelle, z] of ziele) {
          const ziel = karteHolen(z.karte, s);
          assert.ok(ziel, `${def.id} → ${z.karte}`);
          const text = `${def.id} → ${z.karte} (${z.x},${z.y})`;
          assert.ok(L.begehbar(s, ziel, L.welt(s, z.karte), z.x, z.y), text);
          assert.ok(!L.warpAn(ziel, z.x, z.y), `Ankunft auf Warp: ${text}`);
          assert.ok(!L.tuerAn(s, ziel, z.x, z.y), `Ankunft auf Tür: ${text}`);
          assert.ok(quelle, text);
        }
      }
    }
  });
  test('alle Punkte sind begehbar und liegen auf keinem Warp und keiner Tür', () => {
    for (const s of zustaende()) {
      for (const def of Object.values(KARTEN)) {
        for (const [name, [x, y]] of Object.entries(def.punkte)) {
          const text = `${def.id}.${name} (${x},${y})`;
          assert.ok(L.begehbar(s, def, leer, x, y), text);
          assert.ok(!L.warpAn(def, x, y), `${text} liegt auf einem Warp`);
          assert.ok(!L.tuerAn(s, def, x, y), `${text} liegt auf einer Tür`);
        }
      }
    }
  });
  test('vom Haus aus ist jeder Ausgang des Hofs erreichbar', () => {
    const t = neues(1234);
    t.flags.mineOffen = true;
    const def = KARTEN.hof;
    const w = L.welt(t, 'hof');
    const vor = punkt('hof', 'vorHaus');
    const ok = erreichbar(t, def, w, vor.x, vor.y);
    for (const name of ['vonDorf', 'vonBerg', 'vonWald', 'versandkiste', 'briefkasten', 'vorGewaechshaus']) {
      const p = punkt('hof', name);
      assert.ok(ok.has(L.k(p.x, p.y)), name);
    }
    for (const wp of def.warps) assert.ok(ok.has(L.k(wp.x, wp.y)), `Warp nach ${wp.karte}`);
  });
  test('im Dorf ist jeder Laden und jeder Ausgang zu Fuß erreichbar', () => {
    const s = neues();
    const def = KARTEN.dorf;
    const start = punkt('dorf', 'vonHof');
    const ok = erreichbar(s, def, L.welt(s, 'dorf'), start.x, start.y);
    for (const name of VERTRAG.dorf) {
      const p = punkt('dorf', name);
      assert.ok(ok.has(L.k(p.x, p.y)), name);
    }
    for (const wp of def.warps) assert.ok(ok.has(L.k(wp.x, wp.y)), `Warp nach ${wp.karte}`);
  });
  test('Wald und Berg: alle Punkte und Ausgänge hängen zusammen', () => {
    const s = neues();
    for (const id of ['wald', 'berg', 'strand']) {
      const def = KARTEN[id];
      const [erster] = Object.values(def.punkte);
      const ok = erreichbar({ ...s, flags: { mineOffen: true } }, def, leer, erster[0], erster[1]);
      for (const [name, [x, y]] of Object.entries(def.punkte)) assert.ok(ok.has(L.k(x, y)), `${id}.${name}`);
      for (const wp of def.warps) assert.ok(ok.has(L.k(wp.x, wp.y)), `${id}: Warp nach ${wp.karte}`);
    }
  });
  test('der Mineneingang liegt am Berg und öffnet sich erst mit „mineOffen"', () => {
    const s = neues();
    const tor = KARTEN.berg.gebaeude.find((g) => g.ziel?.karte === 'mine0');
    assert.ok(tor, 'Höhle am Berg');
    assert.ok(!KARTEN.hof.gebaeude.some((g) => g.ziel?.karte === 'mine0'), 'keine Mine mehr auf dem Hof');
    assert.ok(!L.begehbar(s, KARTEN.berg, leer, tor.tuer.x, tor.tuer.y), 'zu');
    s.flags.mineOffen = true;
    assert.ok(L.begehbar(s, KARTEN.berg, leer, tor.tuer.x, tor.tuer.y), 'offen');
    assert.equal(L.tuerAn(s, KARTEN.berg, tor.tuer.x, tor.tuer.y), tor);
    const vor = punkt('berg', 'vorMine');
    assert.deepEqual([vor.x, vor.y], [tor.tuer.x, tor.tuer.y + 1]);
  });
});

gruppe('Dorfbewohner', () => {
  const s = neues();
  test('Pläne und Zuhause liegen auf begehbaren Punkten', () => {
    for (const [id, n] of Object.entries(NPCS)) {
      assert.ok(n.heim, `${id}: heim`);
      const h = L.npcHeim(id);
      assert.ok(L.begehbar(s, KARTEN[h.karte], leer, h.x, h.y), `${id}: Zuhause`);
      for (const plan of Object.values(n.plan)) {
        for (const e of plan) {
          if (!e[1]) continue;
          assert.equal(typeof e[2], 'string', `${id}: Plan nutzt Punkte statt Koordinaten`);
          const z = L.planZiel(e);
          assert.ok(L.begehbar(s, KARTEN[z.karte], leer, z.x, z.y), `${id}: ${z.karte}.${e[2]}`);
        }
      }
    }
  });
  test('jeder Dorfbewohner erreicht zu Fuß alle Planziele und kommt wieder heim', () => {
    for (const [id, n] of Object.entries(NPCS)) {
      for (const [art, plan] of Object.entries(n.plan)) {
        let hier = L.npcHeim(id);
        const stationen = plan.map((e) => L.planZiel(e) || L.npcHeim(id));
        for (const ziel of [...stationen, L.npcHeim(id)]) {
          const weg = L.wegPlanen(s, hier, ziel);
          assert.ok(weg.ok, `${id} (${art}): kein Weg von ${hier.karte} (${hier.x},${hier.y}) nach ${ziel.karte} (${ziel.x},${ziel.y})`);
          hier = ziel;
        }
      }
    }
  });
  test('Wege führen nicht über Hof, Haus oder Mine, und Unerreichbares wird erkannt', () => {
    const offen = Object.values(KARTEN).filter((d) => d.npcWege !== false).map((d) => d.id);
    for (const von of offen) {
      for (const nach of offen) {
        const weg = L.kartenWeg(s, von, nach);
        if (weg) assert.ok(weg.every((l) => KARTEN[l.nach].npcWege !== false), `${von} → ${nach}`);
      }
    }
    assert.equal(L.kartenWeg(s, 'dorf', 'haus'), null, 'ins Haus geht niemand');
    karte({ id: 'testinsel', name: 'Insel', grid: ['#####', '#.#.#', '#####'] });
    assert.ok(!L.wegPlanen(s, { karte: 'testinsel', x: 1, y: 1 }, { karte: 'testinsel', x: 3, y: 1 }).ok, 'Ziel hinter der Wand');
  });
  test('Ladenstände stehen dort, wo ihre Leute arbeiten', () => {
    for (const [id, l] of Object.entries(LAEDEN)) {
      assert.ok(l.ort.punkt, `${id}: Theke über einen Punkt`);
      const o = L.ladenOrt(id);
      const plan = NPCS[l.npc].plan.normal;
      assert.ok(plan.some((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; }), id);
    }
  });
});

gruppe('Dynamische Karten und Caches', () => {
  // Ein Testbereich mit dynamischen Karten (Innenraum je Stufe) und einem dynamischen Gebäude
  let erzeugt = 0;
  kartenAnbieter((id) => /^teststall\d$/.test(id), (id, s) => {
    erzeugt++;
    const breite = 6 + (s?.flags.testStufe ?? 0) * 2;
    return { name: 'Teststall', grid: fertigRaster(raum(breite, 5)), punkte: { eingang: [2, 3, 'oben'] }, stufe: s?.flags.testStufe ?? 0 };
  });
  karte({ id: 'testhof', name: 'Testhof', aussen: true, grid: fertigRaster(raster(12, 8, '.')), punkte: { mitte: [6, 6] } });
  system({
    name: 'test-dynamisch',
    gebaeude: (ort, s) => (ort.def.id === 'testhof' && s.flags.testGebaeude
      ? [{ typ: 'stall', x: 2, y: 1, w: 3, h: 2, tuer: { x: 3, y: 2 }, ziel: { karte: 'teststall1', punkt: 'eingang' }, nurWenn: s.flags.testNurWenn }]
      : undefined),
  });
  test('Kartenanbieter: erzeugt mit Spielstand, gecacht nach ID, vergessen bei Änderung', () => {
    const s = neues();
    s.flags.testStufe = 1;
    const d = karteHolen('teststall1', s);
    assert.ok(d?.dynamisch && !KARTEN.teststall1);
    assert.equal(d.stufe, 1, 'erzeugen bekommt den Spielstand');
    assert.equal(karteHolen('teststall1', s), d, 'gecacht');
    assert.deepEqual(zielVon({ karte: 'teststall1', punkt: 'eingang' }, s), { karte: 'teststall1', x: 2, y: 3, blick: 'oben' });
    s.flags.testStufe = 2;
    karteVergessen('teststall1');
    assert.equal(punkt('teststall1', 'eingang', s).x, 2);
    assert.equal(karteHolen('teststall1', s).w, 10, 'neu erzeugt mit Stufe 2');
    assert.equal(karteHolen('teststall9x', s), null);
    assert.equal(karteHolen('gibtsnicht'), null);
    assert.ok(erzeugt >= 2);
  });
  test('der Kartenstand wird gecacht und erkennt Änderungen, auch an Bedingungen dynamischer Gebäude', () => {
    const s = neues();
    const def = KARTEN.testhof;
    const a = L.kartenStand(s, def);
    assert.equal(L.kartenStand(s, def), a, 'zweimal derselbe Stand');
    assert.ok(!a.gebaeude.length);
    s.flags.testGebaeude = true;
    L.kartenGeaendert();
    const b = L.kartenStand(s, def);
    assert.notEqual(b, a);
    assert.ok(b.gebaeude.some((g) => g.typ === 'stall'), 'dynamisches Gebäude');
    assert.ok(!L.begehbar(s, def, leer, 2, 1), 'Gebäude blockiert');
    assert.ok(L.tuerAn(s, def, 3, 2), 'Tür offen');
    // Bedingung am dynamischen Gebäude: ändert sie sich, gilt der neue Stand ohne kartenGeaendert()
    s.flags.testNurWenn = (st) => !st.flags.testAus;
    L.kartenGeaendert();
    assert.ok(L.gebaeudeListe(s, def).length);
    s.flags.testAus = true;
    assert.ok(!L.gebaeudeListe(s, def).length, 'Bedingung des dynamischen Gebäudes wird beachtet');
    s.flags.testAus = false;
    assert.ok(L.gebaeudeListe(s, def).length);
    delete s.flags.testNurWenn;
  });
  test('Wege auf einer 100×72-Karte bleiben schnell', () => {
    const g = raster(100, 72, '.');
    rahmen(g, '#', 2);
    for (let x = 10; x < 90; x += 10) rechteck(g, x, 5, 1, 60, '~');
    for (let x = 10; x < 90; x += 10) rechteck(g, x, x % 20 ? 60 : 10, 1, 2, 'h');
    const deko = [];
    for (let i = 0; i < 300; i++) deko.push({ typ: 'busch', x: 3 + ((i * 37) % 94), y: 3 + ((i * 53) % 66) });
    karte({ id: 'testgross', name: 'Testgroß', aussen: true, grid: fertigRaster(g), deko: deko.filter((d) => g[d.y][d.x] === '.') });
    const s = neues();
    const t0 = performance.now();
    let weg;
    for (let i = 0; i < 40; i++) weg = L.feldWeg(s, 'testgross', 3, 3, 95, 68);
    const dauer = performance.now() - t0;
    assert.ok(weg && weg.length > 90, 'Weg gefunden');
    assert.ok(dauer < 2000, `40 Wege in ${Math.round(dauer)} ms`);
  });
  test('verbindungen() ist gecacht und kennt neue Karten', () => {
    const a = verbindungen();
    assert.equal(verbindungen(), a);
    karte({ id: 'testweg', name: 'Test', grid: ['###', '#.#', '#:#'], warps: [{ x: 1, y: 2, w: 1, h: 1, karte: 'dorf', punkt: 'vonHof' }] });
    const b = verbindungen();
    assert.notEqual(b, a);
    assert.ok(b.some((v) => v.von === 'testweg' && v.nach === 'dorf'));
    assert.throws(() => karte({ id: 'testweg', name: 'Doppelt', grid: ['.'] }), /gibt es schon/);
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
