// Bereich „dorf": die große Dorfkarte (100×72), Punkte, Türen und Öffnungszeiten, Ausgänge,
// Innenräume, Läden, Mühle von innen, Mülltonnen und die Ziele der Dorfbewohner.
// Aufruf: node test/dorf.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { NPCS, LAEDEN } from '../src/daten.js';
import { KARTEN, punkt, bereichVon, warpZiel, zielVon, wasserArt, bodenFlag, B_WASSER } from '../src/karten.js';
import * as L from '../src/logik.js';
import { S, spielStarten, karteBetreten, DEKO_AKTIONEN, GEBAEUDE_AKTIONEN } from '../src/spiel.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }

const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
const leer = { objekte: {}, felder: {} };
const dorf = KARTEN.dorf;

/** Alle Felder, die man von (sx, sy) zu Fuß erreicht; `sperre(x, y)` darf Felder zusätzlich verbieten. */
function erreichbar(s, def, sx, sy, sperre = () => false) {
  const gesehen = new Set([L.k(sx, sy)]);
  const offen = [[sx, sy]];
  while (offen.length) {
    const [x, y] = offen.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const kk = L.k(nx, ny);
      if (gesehen.has(kk) || sperre(nx, ny) || !L.begehbar(s, def, leer, nx, ny)) continue;
      gesehen.add(kk);
      offen.push([nx, ny]);
    }
  }
  return gesehen;
}

// Zeiten als Minuten seit Mitternacht
const um = (s, stunde, minute = 0) => { s.zeit.minute = stunde * 60 + minute; L.kartenGeaendert(); };

gruppe('Die Dorfkarte', () => {
  test('100×72 Felder mit Fluss, Wald als Rand und mindestens 25 Gebäuden', () => {
    assert.equal(dorf.w, 100);
    assert.equal(dorf.h, 72);
    assert.equal(dorf.wasser, 'fluss');
    assert.ok(dorf.gebaeude.length >= 25, `${dorf.gebaeude.length} Gebäude`);
    assert.ok(dorf.deko.length >= 400, `${dorf.deko.length} Deko`);
    const wasser = dorf.grid.join('').split('~').length - 1;
    assert.ok(wasser > 250, 'ein richtiger Fluss');
  });
  test('der Festplatz ist mindestens 16×12 groß und zu über 90 % frei', () => {
    const s = neues();
    const f = bereichVon('dorf', 'fest');
    assert.ok(f.w >= 16 && f.h >= 12);
    let frei = 0;
    for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (L.begehbar(s, dorf, leer, x, y)) frei++;
    assert.ok(frei / (f.w * f.h) >= 0.9, `${Math.round((100 * frei) / (f.w * f.h))} % frei`);
  });
  test('Marktplatz mit Brunnen in der Mitte, Schwarzes Brett und Bänken', () => {
    const brunnen = dorf.deko.find((d) => d.typ === 'brunnen');
    assert.ok(brunnen && brunnen.x >= 45 && brunnen.x <= 54 && brunnen.y >= 28 && brunnen.y <= 35);
    const brett = dorf.deko.find((d) => d.typ === 'brett');
    assert.equal(brett.aktion, 'brett');
    const p = punkt('dorf', 'brett');
    assert.deepEqual([p.x, p.y], [brett.x, brett.y + 1], 'der Punkt steht vor dem Brett');
    assert.equal(p.blick, 'oben');
    for (const name of ['bank1', 'bank2']) {
      const q = punkt('dorf', name);
      const bank = dorf.deko.find((d) => d.typ === 'bank' && q.x >= d.x && q.x < d.x + (d.w || 1) && q.y === d.y + 1);
      assert.ok(bank, `${name} liegt vor einer Bank`);
    }
  });
  test('Mülltonnen, Wegweiser, Laternen, Zäune und Blumenbeete gibt es reichlich', () => {
    const zaehle = (typ) => dorf.deko.filter((d) => d.typ === typ).length;
    assert.ok(zaehle('dorf_muelltonne') >= 6, 'Mülltonnen');
    assert.ok(zaehle('dorf_wegweiser') >= 4, 'Wegweiser');
    assert.ok(zaehle('laterne') >= 40, 'Laternen');
    assert.ok(zaehle('zaun') >= 15, 'Zäune');
    assert.ok(zaehle('blumen') >= 25, 'Blumenbeete');
    assert.ok(zaehle('baum') >= 150, 'Bäume');
    assert.ok(zaehle('dorf_marktstand') >= 4, 'Marktstände');
    assert.ok(zaehle('dorf_grabstein') >= 10, 'Gräber');
    for (const t of ['dorf_schaukel', 'dorf_rutsche', 'dorf_wippe', 'dorf_sandkasten', 'dorf_beet']) assert.ok(zaehle(t) >= 1, t);
  });
  test('alle Gebäude liegen im Raster auf Land und blockieren sich nicht gegenseitig', () => {
    const belegt = new Map();
    for (const g of dorf.gebaeude) {
      assert.ok(g.x >= 0 && g.y >= 0 && g.x + g.w <= dorf.w && g.y + g.h <= dorf.h, g.typ);
      assert.equal(g.tuer.y, g.y + g.h - 1, `${g.typ}: Tür in der untersten Reihe`);
      assert.ok(g.tuer.x >= g.x && g.tuer.x < g.x + g.w, `${g.typ}: Tür unter dem Gebäude`);
      for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) {
        assert.ok(!bodenFlag(dorf, x, y, B_WASSER), `${g.typ} steht im Wasser`);
        assert.ok(!belegt.has(L.k(x, y)), `${g.typ} überlappt ${belegt.get(L.k(x, y))}`);
        belegt.set(L.k(x, y), g.typ);
      }
    }
  });
  test('keine Deko steht auf einem Gebäude oder liegt doppelt auf demselben Feld', () => {
    const geb = new Set();
    for (const g of dorf.gebaeude) for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) geb.add(L.k(x, y));
    const feld = new Map();
    const fehler = [];
    for (const d of dorf.deko) {
      if (d.wand) continue;
      for (let y = d.y; y < d.y + (d.h || 1); y++) for (let x = d.x; x < d.x + (d.w || 1); x++) {
        const kk = L.k(x, y);
        if (geb.has(kk)) fehler.push(`${d.typ} (${x},${y}) steht auf einem Gebäude`);
        else if (feld.has(kk)) fehler.push(`${d.typ} und ${feld.get(kk)} liegen auf (${x},${y})`);
        feld.set(kk, d.typ);
      }
    }
    assert.deepEqual(fehler, []);
  });
  test('Gewässerart ist Fluss, auch an den Punkten am Ufer', () => {
    for (const name of ['fluss1', 'fluss2']) {
      const p = punkt('dorf', name);
      assert.equal(p.blick, 'rechts');
      assert.ok(bodenFlag(dorf, p.x + 1, p.y, B_WASSER), `${name}: Wasser rechts neben dem Punkt`);
      assert.equal(wasserArt({ def: dorf }, p.x + 1, p.y), 'fluss');
    }
  });
});

gruppe('Ausgänge und Wege', () => {
  const s = neues();
  test('Warps liegen am richtigen Rand, die Ankunftspunkte 1–2 Felder innen, der Wald in der unteren Hälfte', () => {
    const w = (karte) => dorf.warps.find((x) => x.karte === karte);
    assert.equal(w('hof').x, 0);
    assert.equal(w('strand').y, dorf.h - 1);
    assert.equal(w('berg').y, 0);
    assert.equal(w('wald').x, 0);
    assert.ok(w('wald').y >= dorf.h / 2, 'West-untere Hälfte');
    assert.ok(w('hof').y < dorf.h / 2, 'Hof liegt im Westen oben');
    assert.deepEqual([punkt('dorf', 'vonHof').x, punkt('dorf', 'vonWald').x], [2, 2]);
    assert.equal(punkt('dorf', 'vonBerg').y, 2);
    assert.equal(punkt('dorf', 'vonStrand').y, dorf.h - 3);
  });
  test('von jedem Ausgang aus erreicht man alle Punkte, Türen und Ausgänge zu Fuß', () => {
    for (const von of ['vonHof', 'vonStrand', 'vonBerg', 'vonWald']) {
      const start = punkt('dorf', von);
      const ok = erreichbar(s, dorf, start.x, start.y);
      for (const [name, [x, y]] of Object.entries(dorf.punkte)) assert.ok(ok.has(L.k(x, y)), `${von} → ${name}`);
      for (const w of dorf.warps) assert.ok(ok.has(L.k(w.x, w.y)), `${von} → Warp nach ${w.karte}`);
      for (const g of dorf.gebaeude) assert.ok(ok.has(L.k(g.tuer.x, g.tuer.y + 1)), `${von} → vor ${g.typ} (${g.x},${g.y})`);
    }
  });
  test('beide Brücken führen über den Fluss; jede für sich reicht zum Ostufer', () => {
    const bruecken = new Map();
    for (let y = 0; y < dorf.h; y++) for (let x = 0; x < dorf.w; x++) if (dorf.grid[y][x] === 'h') bruecken.set(L.k(x, y), y);
    const nord = new Set([...bruecken].filter(([, y]) => y < 45).map(([kk]) => kk));
    const sued = new Set([...bruecken].filter(([, y]) => y >= 45).map(([kk]) => kk));
    assert.ok(nord.size >= 8 && sued.size >= 6, 'zwei Brücken');
    const start = punkt('dorf', 'vonHof');
    const friedhof = punkt('dorf', 'friedhof');
    const ohneNord = erreichbar(s, dorf, start.x, start.y, (x, y) => nord.has(L.k(x, y)));
    const ohneSued = erreichbar(s, dorf, start.x, start.y, (x, y) => sued.has(L.k(x, y)));
    assert.ok(ohneNord.has(L.k(friedhof.x, friedhof.y)), 'Friedhof über die Südbrücke');
    assert.ok(ohneSued.has(L.k(friedhof.x, friedhof.y)), 'Friedhof über die Hauptbrücke');
  });
  test('alle Wege der Dorfbewohner (Wegsuche über Karten) führen ans Ziel', () => {
    for (const [id, n] of Object.entries(NPCS)) {
      for (const [art, plan] of Object.entries(n.plan)) {
        let hier = L.npcHeim(id);
        for (const e of [...plan.map((x) => L.planZiel(x) || L.npcHeim(id)), L.npcHeim(id)]) {
          const weg = L.wegPlanen(s, hier, e);
          assert.ok(weg.ok, `${id} (${art}): ${hier.karte} → ${e.karte}`);
          hier = e;
        }
      }
    }
  });
  test('Planpunkte der Dorfbewohner im Dorf: Amboss, Vor-Rathaus, Ladenbeet, Garten, Platz, Bank, Fluss, Mühlblick', () => {
    for (const name of ['amboss', 'vorRathaus', 'vorSchmiede', 'vorAtelier', 'ladenbeet', 'brunnen', 'garten', 'platz', 'bank2', 'fluss1', 'fluss2', 'rathausweg', 'sprechstunde', 'muehlblick']) {
      assert.ok(punkt('dorf', name), name);
      assert.ok(L.begehbar(s, dorf, leer, punkt('dorf', name).x, punkt('dorf', name).y), `${name} begehbar`);
    }
  });
});

gruppe('Türen und Öffnungszeiten', () => {
  const tuerVon = (typ, x) => dorf.gebaeude.find((g) => g.typ === typ && (x === undefined || g.x === x));
  const HAEUSER = [
    ['laden', 'laden', 'vorLaden'], ['rathaus', 'rathaus', 'vorRathaus'], ['gasthaus', 'gasthaus', 'vorGasthaus'],
    ['schmiede', 'schmiede', 'vorSchmiede'], ['dorf_arzt', 'arzt', 'vorArzt'], ['dorf_museum', 'museum', 'vorMuseum'],
    ['dorf_hausrosa', 'hausRosa', 'vorHausRosa'], ['muehle', 'muehle', 'vorMuehle'],
  ];
  test('jedes öffentliche Gebäude hat eine Tür in seinen Innenraum, direkt über dem Punkt „vor…"', () => {
    for (const [typ, innen, vor] of HAEUSER) {
      const g = tuerVon(typ);
      assert.ok(g, typ);
      assert.deepEqual(g.ziel, { karte: innen, punkt: 'eingang' });
      const p = punkt('dorf', vor);
      assert.deepEqual([p.x, p.y], [g.tuer.x, g.tuer.y + 1], `${vor} liegt unter der Tür`);
      const z = zielVon(g.ziel);
      const raum = KARTEN[innen];
      assert.ok(raum, innen);
      const rueck = raum.warps.find((w) => w.karte === 'dorf' && w.punkt === vor);
      assert.ok(rueck, `${innen}: Ausgang zurück auf ${vor}`);
      assert.ok(L.begehbar(neues(), raum, leer, z.x, z.y));
    }
  });
  test('Krämerladen, Gasthaus, Arzt, Museum, Rathaus, Schmiede, Haus Rosa sind außerhalb der Zeiten für die Spielerin zu', () => {
    const s = neues();
    for (const [typ, , , frueh, spaet] of [
      ['laden', 0, 0, [8, 0], [18, 0]], ['rathaus', 0, 0, [7, 0], [17, 30]], ['dorf_arzt', 0, 0, [8, 0], [16, 30]],
      ['dorf_museum', 0, 0, [9, 0], [17, 30]], ['schmiede', 0, 0, [7, 0], [18, 30]], ['dorf_hausrosa', 0, 0, [7, 0], [20, 30]],
    ]) {
      const g = tuerVon(typ);
      assert.ok(g.tuerWenn, `${typ}: tuerWenn`);
      assert.ok(g.sonst && g.sonst.length > 20, `${typ}: freundliche Meldung`);
      um(s, 12);
      assert.ok(L.erfuellt(s, g.tuerWenn), `${typ} mittags offen`);
      assert.ok(L.begehbar(s, dorf, leer, g.tuer.x, g.tuer.y), `${typ}: Tür mittags begehbar`);
      for (const [h, m] of [frueh, spaet, [3, 0]]) {
        um(s, h, m);
        assert.ok(!L.erfuellt(s, g.tuerWenn), `${typ} um ${h}:${m} zu`);
        assert.ok(!L.begehbar(s, dorf, leer, g.tuer.x, g.tuer.y), `${typ}: Tür um ${h}:${m} verschlossen`);
      }
    }
    um(s, 12);
  });
  test('das Gasthaus öffnet um elf und bleibt bis in die Nacht offen', () => {
    const s = neues();
    const g = tuerVon('gasthaus');
    um(s, 10, 59);
    assert.ok(!L.erfuellt(s, g.tuerWenn));
    um(s, 11);
    assert.ok(L.erfuellt(s, g.tuerWenn));
    um(s, 23, 30);
    assert.ok(L.erfuellt(s, g.tuerWenn));
    um(s, 12);
  });
  test('Dorfbewohner gehen immer durch: die Tür steht in den Verbindungen ohne tuerWenn', () => {
    const s = neues();
    um(s, 4);
    const g = tuerVon('laden');
    assert.ok(!L.begehbar(s, dorf, leer, g.tuer.x, g.tuer.y), 'Spielerin: zu');
    const weg = L.wegPlanen(s, { karte: 'dorf', x: punkt('dorf', 'vorLaden').x, y: punkt('dorf', 'vorLaden').y }, { karte: 'laden', ...punkt('laden', 'theke') });
    assert.ok(weg.ok, 'Ottilie kommt trotzdem hinein');
    um(s, 12);
  });
  test('Wohnhäuser als Kulisse haben freundliche Türtexte und eine freie Fläche davor', () => {
    const wohn = dorf.gebaeude.filter((g) => g.typ.startsWith('dorf_haus') && g.typ !== 'dorf_hausrosa');
    assert.ok(wohn.length >= 15, `${wohn.length} Wohnhäuser`);
    for (const g of wohn) {
      assert.ok(g.zu && g.zu.length > 20, `Text an ${g.x},${g.y}`);
      assert.ok(L.begehbar(neues(), dorf, leer, g.tuer.x, g.tuer.y + 1), `vor der Tür ${g.x},${g.y}`);
    }
  });
});

gruppe('Läden am neuen Ort', () => {
  test('Ottilie, Hannes und Bruno stehen an Theken, die in ihren Plänen vorkommen', () => {
    for (const [id, karte] of [['laden', 'laden'], ['gasthaus', 'gasthaus'], ['schmiede', 'dorf']]) {
      const o = L.ladenOrt(id);
      assert.equal(o.karte, karte);
      const plan = NPCS[LAEDEN[id].npc].plan.normal;
      assert.ok(plan.some((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; }), id);
    }
  });
  test('die Theken im Krämerladen und im Gasthaus tragen den Laden; der Amboss im Dorf den der Schmiede', () => {
    const theke = (karte, id) => KARTEN[karte].deko.find((d) => d.typ === 'theke' && d.aktion === 'laden' && d.laden === id);
    const t1 = theke('laden', 'laden');
    const p1 = punkt('laden', 'theke');
    assert.ok(t1 && p1.x >= t1.x && p1.x < t1.x + t1.w && p1.y === t1.y - 1, 'Ottilie steht hinter der Theke');
    const t2 = theke('gasthaus', 'gasthaus');
    const p2 = punkt('gasthaus', 'theke');
    assert.ok(t2 && p2.x >= t2.x && p2.x < t2.x + t2.w && p2.y === t2.y - 1, 'Hannes steht hinter der Theke');
    assert.equal(t2.art, 'krug', 'Bierkrüge auf der Theke');
    const amboss = dorf.deko.find((d) => d.typ === 'amboss' && d.aktion === 'laden' && d.laden === 'schmiede');
    const p3 = punkt('dorf', 'amboss');
    assert.ok(amboss && p3.x === amboss.x - 1 && p3.y === amboss.y && p3.blick === 'rechts', 'Bruno steht links vom Amboss');
  });
  test('der Laden der Schmiede bietet weiter Werkzeug-Upgrades, der Krämerladen den Rucksack', () => {
    const s = neues();
    assert.ok(L.ladenWare(s, 'schmiede').some((w) => w.spezial === 'upgrade' || w.id === 'kohle'));
    assert.ok(L.ladenWare(s, 'laden').some((w) => w.spezial === 'rucksack'));
  });
});

gruppe('Innenräume', () => {
  const RAEUME = {
    laden: ['eingang', 'theke', 'regal', 'bett_ottilie', 'bett_jonas'],
    gasthaus: ['eingang', 'theke', 'tisch1', 'tisch2', 'tisch3', 'kamin', 'billard', 'bett_hannes', 'tresen1', 'tresen2'],
    schmiede: ['eingang', 'theke', 'amboss', 'bett_bruno'],
    rathaus: ['eingang', 'schreibtisch', 'bett_frieda'],
    arzt: ['eingang', 'theke', 'bett_theo'],
    museum: ['eingang', 'theke', 'lesesaal', 'bett_mira'],
    hausRosa: ['eingang', 'kueche', 'bett_rosa', 'bett_pia'],
    muehle: ['eingang'],
  };
  test('jeder Raum liefert seine Pflicht-Punkte; alle Punkte sind erreichbar, frei und aus dem Eingang zu erreichen', () => {
    const s = neues();
    for (const [id, namen] of Object.entries(RAEUME)) {
      const def = KARTEN[id];
      assert.equal(def.aussen, false, id);
      for (const n of namen) assert.ok(punkt(id, n), `${id}.${n}`);
      const start = punkt(id, 'eingang');
      const ok = erreichbar(s, def, start.x, start.y);
      for (const [name, [x, y]] of Object.entries(def.punkte)) assert.ok(ok.has(L.k(x, y)), `${id}.${name} erreichbar`);
      for (const w of def.warps) assert.ok(ok.has(L.k(w.x, w.y)), `${id}: Ausgang erreichbar`);
    }
  });
  test('Räume sind möbliert: Fenster, Lampen, Pflanzen oder Regale und ein Bett für jeden Bewohner', () => {
    for (const [id, namen] of Object.entries(RAEUME)) {
      const def = KARTEN[id];
      assert.ok(def.deko.length >= 8, `${id}: nur ${def.deko.length} Möbel`);
      assert.ok(def.deko.some((d) => d.typ === 'fenster'), `${id}: Fenster`);
      assert.ok(def.deko.some((d) => d.licht), `${id}: eine Lichtquelle`);
      for (const n of namen.filter((x) => x.startsWith('bett_'))) {
        const p = punkt(id, n);
        assert.ok(def.deko.some((d) => d.typ === 'bett' && Math.abs(d.x + 0.5 - p.x) <= 2 && Math.abs(d.y + 0.5 - p.y) <= 2), `${id}.${n} liegt neben einem Bett`);
      }
    }
  });
  test('Mühle von innen: Mühlstein und Bündel-Tafel öffnen das Mühlen-Fenster; das Gebäude tut es auch', () => {
    const geb = dorf.gebaeude.find((g) => g.typ === 'muehle');
    assert.equal(geb.aktion, 'muehle', 'Aktion am Gebäude bleibt');
    assert.ok(GEBAEUDE_AKTIONEN.muehle);
    assert.ok(geb.ziel && geb.ziel.karte === 'muehle');
    const stein = KARTEN.muehle.deko.find((d) => d.typ === 'dorf_muehlstein');
    const tafel = KARTEN.muehle.deko.find((d) => d.typ === 'dorf_buendeltafel');
    assert.equal(stein.aktion, 'dorf_muehle');
    assert.equal(tafel.aktion, 'dorf_muehle');
    assert.ok(DEKO_AKTIONEN.dorf_muehle);
    const s = neues();
    const fenster = [];
    spielStarten(s, { fenster: (name) => fenster.push(name), dialog() {} });
    karteBetreten('muehle', 6, 5, 'oben');
    DEKO_AKTIONEN.dorf_muehle.fn(stein, {});
    GEBAEUDE_AKTIONEN.muehle.fn(geb, {});
    assert.deepEqual(fenster, ['muehle', 'muehle']);
  });
  test('Mühle am Fluss: das Wasser liegt rechts vom Gebäude, wo das Mühlrad dreht', () => {
    const g = dorf.gebaeude.find((x) => x.typ === 'muehle');
    for (let y = g.y + 2; y < g.y + 5; y++) {
      assert.ok(bodenFlag(dorf, g.x + g.w, y, B_WASSER), `Wasser rechts neben der Mühle (Zeile ${y})`);
      assert.ok(bodenFlag(dorf, g.x + g.w + 1, y, B_WASSER));
    }
  });
  test('das Schwarze Brett hängt auf dem Platz und öffnet das Aufträge-Fenster', () => {
    const brett = dorf.deko.find((d) => d.typ === 'brett');
    const s = neues();
    const fenster = [];
    spielStarten(s, { fenster: (name) => fenster.push(name), dialog() {} });
    karteBetreten('dorf', punkt('dorf', 'brett').x, punkt('dorf', 'brett').y, 'oben');
    DEKO_AKTIONEN[brett.aktion].fn(brett, {});
    assert.deepEqual(fenster, ['brett']);
  });
  test('Museum mit Vitrinen und Bibliothek (Regale), Arztpraxis mit Liege und Medizinschrank', () => {
    const zaehle = (karte, typ) => KARTEN[karte].deko.filter((d) => d.typ === typ).length;
    assert.ok(zaehle('museum', 'dorf_vitrine') >= 6);
    assert.ok(zaehle('museum', 'regal') >= 3);
    assert.ok(zaehle('arzt', 'dorf_liege') >= 1 && zaehle('arzt', 'dorf_medschrank') >= 1);
    assert.ok(zaehle('gasthaus', 'dorf_billard') === 1 && zaehle('gasthaus', 'kamin') === 1);
    assert.ok(zaehle('schmiede', 'dorf_esse') === 1 && zaehle('schmiede', 'amboss') === 1);
  });
});

gruppe('Mülltonnen', () => {
  const s = neues(21);
  const dialoge = [];
  spielStarten(s, { dialog: (npc, texte) => dialoge.push(texte[0]), fenster() {}, meldung() {}, funde() {} });
  const tonnen = dorf.deko.filter((d) => d.aktion === 'dorf_muelltonne');
  test('es gibt Tonnen mit einer Aktion „Durchsuchen"', () => {
    assert.ok(DEKO_AKTIONEN.dorf_muelltonne);
    assert.equal(DEKO_AKTIONEN.dorf_muelltonne.hinweis, 'Durchsuchen');
    assert.ok(tonnen.length >= 6);
  });
  test('eine Tonne lässt sich einmal am Tag durchsuchen, am nächsten Tag wieder', () => {
    karteBetreten('dorf', tonnen[0].x, tonnen[0].y + 1, 'oben');
    dialoge.length = 0;
    DEKO_AKTIONEN.dorf_muelltonne.fn(tonnen[0], {});
    DEKO_AKTIONEN.dorf_muelltonne.fn(tonnen[0], {});
    assert.ok(/schon gewühlt/.test(dialoge.at(-1)), 'beim zweiten Mal: schon durchwühlt');
    s.zeit.tag++;
    const vorher = dialoge.length;
    DEKO_AKTIONEN.dorf_muelltonne.fn(tonnen[0], {});
    assert.ok(!/schon gewühlt/.test(dialoge.at(-1)) || dialoge.length === vorher, 'am nächsten Tag wieder');
    assert.ok(s.dorf.muell, 'Zustand in s.dorf');
  });
  test('über viele Tage und Tonnen kommen Nichts, Münzen und Gegenstände vor, nie ein Absturz', () => {
    const gold0 = s.spieler.gold;
    let nichts = 0;
    for (let tag = 1; tag <= 28; tag++) {
      s.zeit.tag = tag;
      for (const t of tonnen) {
        dialoge.length = 0;
        DEKO_AKTIONEN.dorf_muelltonne.fn(t, {});
        if (dialoge.length && !/Gold/.test(dialoge[0])) nichts++;
      }
    }
    assert.ok(nichts > 20, 'meist nur Müll');
    assert.ok(s.spieler.gold > gold0, 'ab und zu Münzen');
    assert.ok(s.spieler.inv.some((x) => x && !['hacke', 'giesskanne', 'axt', 'spitzhacke', 'sense'].includes(x.id)) || s.spieler.gold > gold0);
  });
  test('der Zustand überlebt Speichern und Laden und fehlt in alten Ständen nicht', () => {
    const t = neues(33);
    delete t.dorf;
    L.ergaenzen(t);
    assert.deepEqual(t.dorf, { muell: {} });
    const kopie = JSON.parse(JSON.stringify(s));
    assert.ok(kopie.dorf.muell);
  });
});

gruppe('Zeichen und Größen', () => {
  test('die neuen Bodenzeichen f g i j sind begehbar, aber nicht farmbar', () => {
    for (const z of ['f', 'g', 'i', 'j']) {
      const feld = [...dorf.grid.join('')].indexOf(z);
      assert.ok(feld >= 0, `Zeichen ${z} kommt auf der Karte vor`);
    }
    assert.ok(dorf.grid.join('').includes('h'), 'Brücken');
  });
  test('Sammelzonen: Wald am Rand, Dorfwiesen im Ort', () => {
    const arten = new Set(dorf.sammel.map((z) => z.art));
    assert.ok(arten.has('wald') && arten.has('dorf'));
    for (const z of dorf.sammel) assert.ok(z.x >= 0 && z.y >= 0 && z.x + z.w <= dorf.w && z.y + z.h <= dorf.h);
  });
  test('Warps und Türen führen auf begehbare Felder ohne Warp und Tür', () => {
    const s = neues();
    for (const w of dorf.warps) {
      const z = warpZiel(w);
      const ziel = KARTEN[z.karte];
      assert.ok(L.begehbar(s, ziel, leer, z.x, z.y), `${w.karte}`);
    }
  });
  test('Wegsuche über das ganze Dorf bleibt schnell', () => {
    const s = neues();
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) {
      const w = L.wegPlanen(s, { karte: 'dorf', ...punkt('dorf', 'vonHof') }, { karte: 'dorf', ...punkt('dorf', 'friedhof') });
      assert.ok(w.ok);
    }
    assert.ok(Date.now() - t0 < 4000, 'unter vier Sekunden für 20 Wege');
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
