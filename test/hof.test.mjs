// Bereich „hof": die große Hofkarte (Teiche, Klippen, Bauland, Ausgänge, Verwildern, Nachwachsen), das
// Wohnhaus in drei Ausbaustufen (Möbel, Herd, Kühlschrank, Mitnehmen beim Ausbau), das Gewächshaus
// (kaputt bis zur Flagge, im Winter wachsen), der Fernseher mit Sendern anderer Bereiche.
// Aufruf: node test/hof.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { KARTEN, punkt, bereichVon, wasserArt, BODEN, B_FARMBAR, bodenFlag } from '../src/karten.js';
import { OBJEKT_TYPEN, PFLANZEN, BRIEFE } from '../src/daten.js';
import { system } from '../src/system.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, karteBetreten } from '../src/spiel.js';
import { kistenFeld } from '../src/bereiche/tiere/inhalt.js';
import { uebertragen } from '../src/bereiche/hof/inhalt.js';
import { KUEHLSCHRANK, STUFE2_VERSATZ } from '../src/bereiche/hof/innen.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
const HINDERNISSE = ['baum', 'stein', 'unkraut', 'ast', 'fels', 'grossstumpf', 'stumpf'];
const hindernisse = (w) => Object.entries(w.objekte).filter(([, o]) => HINDERNISSE.includes(o.t));

/** Felder, die von (sx, sy) aus erreichbar sind (4er-Nachbarschaft, mit Objekten und Beeten der Karte). */
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

gruppe('Hofkarte: Größe, Gelände, Ausgänge', () => {
  const def = KARTEN.hof;
  test('80×64, farmbar, Teich-Gewässer, Waldrand; mit Klippen, Treppen, Ufer und Hofplatz', () => {
    assert.equal(def.w, 80);
    assert.equal(def.h, 64);
    assert.ok(def.farmbar && def.aussen && def.wasser === 'teich' && def.rand === 'wald');
    const zeichen = new Set(def.grid.join(''));
    for (const z of ['X', 'T', '~', 'b', 'a', 'h', ':', '#', '.']) assert.ok(zeichen.has(z), `Zeichen ${z}`);
    for (const z of 'abcd') assert.ok(BODEN[z], `Bodenzeichen ${z} ist angelegt`);
    assert.ok(BODEN.c.farmbar && !BODEN.a.farmbar && !BODEN.b.farmbar, 'Gewächshauserde ist Acker, Kies und Ufer nicht');
  });
  test('zwei Teiche (groß und klein), beide mit Gewässerart teich', () => {
    const zeilen = def.grid;
    const wasser = [];
    for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) if (zeilen[y][x] === '~') wasser.push([x, y]);
    assert.ok(wasser.length > 250, `nur ${wasser.length} Wasserfelder`);
    const klein = wasser.filter(([, y]) => y < 12).length;
    const gross = wasser.filter(([, y]) => y > 30).length;
    assert.ok(klein >= 20 && gross >= 200, `klein ${klein}, groß ${gross}`);
    for (const [x, y] of wasser) assert.equal(wasserArt({ def }, x, y), 'teich');
    assert.ok(def.gewaesser.length >= 2);
  });
  test('Klippen mit zwei Treppen im Norden: die Anhöhe ist nur über die Treppen erreichbar', () => {
    const t = [];
    for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) if (def.grid[y][x] === 'T') t.push([x, y]);
    assert.ok(t.length >= 8, 'mindestens zwei Treppen zu je 2×2');
    assert.ok(t.every(([, y]) => y >= 8 && y <= 11), 'Treppen im Norden');
    assert.ok(new Set(t.map(([x]) => x)).size >= 4, 'zwei getrennte Treppen');
    const s = neues(3);
    const ok = erreichbar(s, def, L.welt(s, 'hof'), ...Object.values(punkt('hof', 'vorHaus')).slice(0, 2));
    const berg = punkt('hof', 'vonBerg');
    assert.ok(ok.has(L.k(berg.x, berg.y)), 'vonBerg ist vom Haus aus erreichbar');
    for (const [x, y] of t) assert.ok(ok.has(L.k(x, y)), `Treppe ${x},${y}`);
  });
  test('Ausgänge: Ost → Dorf, Süd → Wald, Nord → Berg, mit den Vertragspunkten', () => {
    const w = (karte) => def.warps.find((x) => x.karte === karte);
    assert.equal(w('dorf').punkt, 'vonHof');
    assert.equal(w('wald').punkt, 'vonHof');
    assert.equal(w('berg').punkt, 'vonHof');
    assert.equal(w('dorf').x, def.w - 1);
    assert.equal(w('wald').y, def.h - 1);
    assert.equal(w('berg').y, 0);
    for (const n of ['vonDorf', 'vonWald', 'vonBerg', 'vorHaus', 'vorGewaechshaus', 'versandkiste', 'briefkasten']) assert.ok(punkt('hof', n), n);
    assert.ok(punkt('dorf', 'vonHof') && punkt('wald', 'vonHof') && punkt('berg', 'vonHof'));
  });
  test('der Mineneingang liegt am Berg, nicht auf dem Hof', () => {
    assert.ok(!def.gebaeude.some((g) => g.ziel?.karte === 'mine0'));
    assert.ok(KARTEN.berg.gebaeude.some((g) => g.ziel?.karte === 'mine0'));
  });
  test('Bereiche bauland, stall, auslauf; das Bauland ist groß und beim Spielbeginn ganz frei', () => {
    const s = neues(11);
    const w = L.welt(s, 'hof');
    const b = bereichVon('hof', 'bauland');
    assert.ok(b.w >= 20 && b.h >= 12, `Bauland ${b.w}×${b.h}`);
    let frei = 0;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (L.feldFrei(s, { def, welt: w }, x, y)) frei++;
    assert.equal(frei, b.w * b.h, 'jedes Bauland-Feld ist frei und begehbar');
    const st = bereichVon('hof', 'stall');
    assert.deepEqual([st.w, st.h], [5, 4]);
    assert.ok(bereichVon('hof', 'auslauf'));
    // die drei Bereiche überlappen sich nicht
    const lap = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
    const au = bereichVon('hof', 'auslauf');
    assert.ok(!lap(b, st) && !lap(b, au) && !lap(st, au));
  });
  test('Versandkiste und Briefkasten stehen am Haus; die Versandkiste liegt über der Eierkiste', () => {
    const s = neues(12);
    assert.ok(def.deko.some((d) => d.typ === 'versandkiste' && d.aktion === 'versand'));
    assert.ok(def.deko.some((d) => d.typ === 'briefkasten' && d.aktion === 'post'));
    s.stall.gebaut = true;
    L.kartenGeaendert();
    const deko = L.dekoListe(s, def);
    const kiste = deko.find((d) => d.typ === 'versandkiste');
    const ei = deko.find((d) => d.typ === 'eierkiste');
    assert.ok(ei && ei.y > kiste.y, 'Eierkiste weiter unten');
    assert.ok(ei.x > kiste.x, 'und rechts davon (Rohre laufen von der Eierkiste nach links)');
  });
  test('Stall: direkt unter der Gebäudezeile ein begehbares Feld seitlich der Tür für die Eierkiste', () => {
    const b = bereichVon('hof', 'stall');
    const f = kistenFeld(def);
    assert.ok(f, 'Kistenfeld');
    assert.equal(f.y, b.y + b.h);
    assert.ok(f.x >= b.x && f.x < b.x + b.w);
    assert.notEqual(f.x, b.x + Math.floor(b.w / 2));
    const s = neues(13);
    const kk = L.k(f.x, f.y);
    assert.ok(!L.welt(s, 'hof').objekte[kk], 'kein Hindernis auf dem Kistenfeld');
  });
  test('ältere Stände von der kleinen Hofkarte: wer im Wald steht, landet vor der Haustür', () => {
    const s = neues(14);
    Object.assign(s.spieler, { karte: 'hof', x: 2, y: 2 });
    L.ergaenzen(s);
    const vor = punkt('hof', 'vorHaus');
    assert.deepEqual([s.spieler.karte, s.spieler.x, s.spieler.y], ['hof', vor.x, vor.y]);
    Object.assign(s.spieler, { karte: 'hof', x: vor.x + 3, y: vor.y + 3 });
    L.ergaenzen(s);
    assert.deepEqual([s.spieler.x, s.spieler.y], [vor.x + 3, vor.y + 3], 'wer gut steht, bleibt stehen');
  });
  test('Zäune um den Auslauf lassen den Weg zum Stall und zur Eierkiste frei', () => {
    const zaeune = KARTEN.hof.deko.filter((d) => d.typ === 'zaun');
    assert.ok(zaeune.length >= 4);
    const au = bereichVon('hof', 'auslauf');
    for (const z of zaeune) assert.ok(z.x >= au.x - 1 && z.x <= au.x + au.w && z.y >= au.y && z.y <= au.y + au.h, 'Zaun am Auslauf');
    const st = bereichVon('hof', 'stall');
    const f = kistenFeld(KARTEN.hof);
    for (const z of zaeune) {
      const b = z.w || 1;
      const h = z.h || 1;
      for (const [x, y] of [[f.x, f.y], [st.x + 2, st.y + st.h]]) assert.ok(!(x >= z.x && x < z.x + b && y >= z.y && y < z.y + h), 'Zaun auf dem Weg');
    }
  });
  test('Sammelzonen: großzügig, auf der Karte, Arten wiese und wald', () => {
    assert.ok(def.sammel.length >= 5);
    assert.ok(def.sammel.some((z) => z.art === 'wiese') && def.sammel.some((z) => z.art === 'wald'));
    for (const z of def.sammel) assert.ok(z.x >= 0 && z.y >= 0 && z.x + z.w <= def.w && z.y + z.h <= def.h);
    const flaeche = def.sammel.reduce((a, z) => a + z.w * z.h, 0);
    assert.ok(flaeche > 1000, `Fläche ${flaeche}`);
  });
  test('alle wichtigen Orte sind vom Haus aus zu Fuß erreichbar, auch bei dichtem Bewuchs', () => {
    for (const seed of [1, 2, 3]) {
      const s = neues(seed);
      s.stall.gebaut = true;
      L.kartenGeaendert();
      const w = L.welt(s, 'hof');
      const vor = punkt('hof', 'vorHaus');
      const ok = erreichbar(s, def, w, vor.x, vor.y);
      for (const n of Object.keys(def.punkte)) assert.ok(ok.has(L.k(def.punkte[n][0], def.punkte[n][1])), `${n} (Seed ${seed})`);
      for (const wp of def.warps) assert.ok(ok.has(L.k(wp.x, wp.y)), `Warp nach ${wp.karte}`);
      const st = bereichVon('hof', 'stall');
      assert.ok(ok.has(L.k(st.x + Math.floor(st.w / 2), st.y + st.h)), 'vor der Stalltür');
      const f = kistenFeld(def);
      assert.ok(ok.has(L.k(f.x, f.y + 1)), 'vor der Eierkiste');
      const b = bereichVon('hof', 'bauland');
      assert.ok(ok.has(L.k(b.x + 1, b.y + 1)) && ok.has(L.k(b.x + b.w - 2, b.y + b.h - 2)), 'Bauland');
    }
  });
});

gruppe('Verwildern und Nachwachsen', () => {
  test('der Hof ist verwildert (viele Hindernisse), der Platz vor dem Haus frei', () => {
    const s = neues();
    const w = L.welt(s, 'hof');
    const n = hindernisse(w).length;
    assert.ok(n > 400 && n < 1600, `${n} Hindernisse`);
    const arten = new Set(hindernisse(w).map(([, o]) => o.t));
    for (const t of ['baum', 'stein', 'unkraut', 'ast', 'fels', 'grossstumpf']) assert.ok(arten.has(t), `Art ${t}`);
    const vor = punkt('hof', 'vorHaus');
    assert.ok(!w.objekte[L.k(vor.x, vor.y)], 'vor der Haustür');
  });
  test('der Bewuchs liegt in Gruppen: manche Ecken sind dicht, andere fast frei', () => {
    const s = neues(21);
    const w = L.welt(s, 'hof');
    const def = KARTEN.hof;
    const dichte = [];
    for (let y = 12; y + 8 <= def.h - 4; y += 4) {
      for (let x = 4; x + 8 <= def.w - 4; x += 4) {
        let grass = 0;
        let objekte = 0;
        for (let yy = y; yy < y + 8; yy++) for (let xx = x; xx < x + 8; xx++) { if (def.grid[yy][xx] === '.') grass++; if (w.objekte[L.k(xx, yy)]) objekte++; }
        if (grass >= 56) dichte.push(objekte / grass);
      }
    }
    assert.ok(Math.max(...dichte) > 0.35, `dichteste Ecke ${Math.max(...dichte).toFixed(2)}`);
    assert.ok(Math.min(...dichte) < 0.06, `leerste Ecke ${Math.min(...dichte).toFixed(2)}`);
  });
  test('Wege, Hofplatz und freie Plätze bleiben leer; am ersten Tag lassen sich viele Beete anlegen', () => {
    const s = neues(4);
    const w = L.welt(s, 'hof');
    const def = KARTEN.hof;
    for (const [kk, o] of Object.entries(w.objekte)) {
      const [x, y] = L.ausK(kk);
      assert.ok(!':ab'.includes(def.grid[y][x]), `${o.t} auf Weg ${kk}`);
      assert.ok(!def.frei.some((b) => L.imBereich(b, x, y)) || o.t === 'sammel', `${o.t} auf freiem Platz ${kk}`);
    }
    const vor = punkt('hof', 'vorHaus');
    let acker = 0;
    for (let y = vor.y; y < vor.y + 16; y++) {
      for (let x = vor.x - 14; x < vor.x + 14; x++) if (bodenFlag(def, x, y, B_FARMBAR) && L.feldFrei(s, { def, welt: w }, x, y)) acker++;
    }
    assert.ok(acker >= 150, `nur ${acker} freie Ackerfelder nahe dem Haus`);
  });
  test('hacken am ersten Tag: ein Beet am Startacker, kein Gestrüpp im Weg', () => {
    const s = neues(5);
    const ort = L.ortVon(s, 'hof');
    const p = punkt('hof', 'startacker');
    assert.ok(L.feldFrei(s, ort, p.x, p.y));
    assert.equal(L.hacken(s, ort, [[p.x, p.y], [p.x + 1, p.y], [p.x, p.y + 1]]).n, 3);
  });
  test('über Nacht kommen einige Hindernisse nach, nie auf Wegen oder freien Plätzen', () => {
    const s = neues(8);
    const w = L.welt(s, 'hof');
    const def = KARTEN.hof;
    const vorher = new Set(Object.keys(w.objekte));
    for (let i = 0; i < 6; i++) L.tagBeenden(s, { r: Math.random });
    const neu = Object.keys(w.objekte).filter((kk) => !vorher.has(kk));
    assert.ok(neu.length >= 20, `nur ${neu.length} neue in 6 Nächten`);
    for (const kk of neu) {
      const [x, y] = L.ausK(kk);
      if (w.objekte[kk].t === 'sammel') continue;
      assert.equal(def.grid[y][x], '.', `neues Hindernis ${kk} auf ${def.grid[y][x]}`);
      assert.ok(!def.frei.some((b) => L.imBereich(b, x, y)), `${kk} im freien Bereich`);
    }
  });
});

gruppe('Wohnhaus in drei Stufen', () => {
  const STUFEN = [['haus', 'haus'], ['haus1', 'hof_haus1'], ['haus2', 'hof_haus2']];
  test('drei Karten mit zuhause, aufstellen und allen Vertragspunkten, alle begehbar und erreichbar', () => {
    for (const [id] of STUFEN) {
      const def = KARTEN[id];
      assert.ok(def.zuhause && def.aufstellen && def.innen === 'haus' && !def.aussen, id);
      const s = neues(30);
      const w = L.welt(s, id);
      const e = punkt(id, 'eingang');
      const ok = erreichbar(s, def, w, e.x, e.y);
      for (const n of ['eingang', 'bett', 'fernseher', 'kueche', 'partner']) {
        const p = punkt(id, n);
        assert.ok(p, `${id}.${n}`);
        assert.ok(L.begehbar(s, def, w, p.x, p.y), `${id}.${n} begehbar`);
        assert.ok(ok.has(L.k(p.x, p.y)), `${id}.${n} erreichbar`);
      }
      const warp = def.warps.find((x) => x.karte === 'hof' && x.punkt === 'vorHaus');
      assert.ok(warp, `${id}: Ausgang`);
      assert.deepEqual([warp.x, warp.y], [e.x, e.y + 1], `${id}: Tür direkt unter dem Eingang`);
    }
  });
  test('die Häuser wachsen: Stube bleibt, Küche und zwei Zimmer kommen dazu', () => {
    const f = (id) => KARTEN[id].w * KARTEN[id].h;
    assert.ok(f('haus') < f('haus1') && f('haus1') < f('haus2'));
    assert.ok(KARTEN.haus.w >= 14 && KARTEN.haus1.w >= 24 && KARTEN.haus2.h >= 18);
    assert.equal(KARTEN.haus2.h - KARTEN.haus1.h, STUFE2_VERSATZ);
    const bett2 = punkt('haus2', 'bett');
    assert.ok(bett2.y < 9, 'in Stufe 2 steht das Bett im oberen Schlafzimmer');
    assert.ok(KARTEN.haus2.deko.some((d) => d.typ === 'hof_kinderbett'), 'Kinderzimmer');
  });
  test('Möbel: Bett, Fernseher, Herd mit Aktion „kochen" am Punkt kueche, Kamin, Fenster, Teppiche, Regale', () => {
    for (const [id] of STUFEN) {
      const def = KARTEN[id];
      const typen = def.deko.map((d) => d.typ);
      assert.equal(def.deko.filter((d) => d.aktion === 'bett').length, 1, `${id}: ein Bett zum Schlafen`);
      const herd = def.deko.find((d) => d.typ === 'herd' && d.aktion === 'kochen');
      assert.ok(herd, `${id}: Herd`);
      const k = punkt(id, 'kueche');
      assert.deepEqual([herd.x, herd.y + 1], [k.x, k.y], `${id}: Herd direkt am Punkt kueche`);
      const tv = def.deko.find((d) => d.aktion === 'tv');
      const f = punkt(id, 'fernseher');
      assert.deepEqual([tv.x, tv.y + 1], [f.x, f.y], `${id}: Fernseher am Punkt`);
      for (const t of ['kamin', 'hof_fenster', 'pflanze', 'hof_sofa']) assert.ok(typen.includes(t), `${id}: ${t}`);
      assert.ok(def.grid.some((z) => z.includes('t')), `${id}: Teppich`);
      assert.ok(def.deko.some((d) => d.licht), `${id}: Lichtquellen`);
      const bett = def.deko.find((d) => d.aktion === 'bett');
      const bp = punkt(id, 'bett');
      assert.ok(bp.x >= bett.x - 1 && bp.x <= bett.x + (bett.w || 1) && bp.y === bett.y + (bett.h || 1), `${id}: Bettpunkt vor dem Bett`);
    }
    assert.ok(KARTEN.haus1.deko.some((d) => d.typ === 'hof_kuechenzeile') && KARTEN.haus1.grid.some((z) => z.includes('d')), 'Küche mit Fliesen');
    assert.ok(KARTEN.haus2.deko.some((d) => d.typ === 'hof_schrank') && KARTEN.haus2.deko.some((d) => d.typ === 'hof_doppelbett'));
  });
  test('Haustür je Stufe: genau ein Haus auf dem Hof, gleiche Tür, Ziel passend zur Stufe', () => {
    const s = neues(31);
    const tueren = [];
    for (const [stufe, [id, typ]] of STUFEN.entries()) {
      s.haus.stufe = stufe;
      L.kartenGeaendert();
      const haeuser = L.gebaeudeListe(s, KARTEN.hof).filter((g) => g.ziel?.karte.startsWith('haus'));
      assert.equal(haeuser.length, 1, `Stufe ${stufe}`);
      assert.equal(haeuser[0].typ, typ);
      assert.equal(haeuser[0].ziel.karte, id);
      assert.ok(L.begehbar(s, KARTEN.hof, null, haeuser[0].tuer.x, haeuser[0].tuer.y), 'Tür begehbar');
      assert.equal(L.tuerAn(s, KARTEN.hof, haeuser[0].tuer.x, haeuser[0].tuer.y), haeuser[0]);
      tueren.push(haeuser[0].tuer);
      assert.equal(haeuser[0].h, 5);
      assert.ok(haeuser[0].w >= 5);
    }
    assert.deepEqual(tueren[0], tueren[1]);
    assert.deepEqual(tueren[1], tueren[2]);
    const vor = punkt('hof', 'vorHaus');
    assert.deepEqual([vor.x, vor.y], [tueren[0].x, tueren[0].y + 1]);
  });
  test('das größte Haus passt: nichts Blockierendes im Haus-Rechteck, die Tür bleibt frei', () => {
    const s = neues(32);
    s.haus.stufe = 2;
    L.kartenGeaendert();
    const g = L.gebaeudeListe(s, KARTEN.hof).find((x) => x.typ === 'hof_haus2');
    const w = L.welt(s, 'hof');
    for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) assert.ok(!w.objekte[L.k(x, y)], `Hindernis im Haus ${x},${y}`);
    const dekoFeld = L.dekoListe(s, KARTEN.hof).filter((d) => d.x < g.x + g.w && d.x + (d.w || 1) > g.x && d.y < g.y + g.h && d.y + (d.h || 1) > g.y);
    assert.deepEqual(dekoFeld.map((d) => d.typ), [], 'keine Deko im Haus-Rechteck');
  });
  test('Hook zuhause: Stufe 0 haus, Stufe 1 haus1, Stufe 2 haus2 – man wacht am Bett dieser Stufe auf', () => {
    const s = neues(33);
    for (const [stufe, [id]] of STUFEN.entries()) {
      s.haus.stufe = stufe;
      const z = L.zuhause(s);
      const b = punkt(id, 'bett');
      assert.deepEqual([z.karte, z.x, z.y], [id, b.x, b.y], `Stufe ${stufe}`);
      L.tagBeenden(s, { r: () => 0.5 });
      assert.deepEqual([s.spieler.karte, s.spieler.x, s.spieler.y], [id, b.x, b.y], `nach der Nacht, Stufe ${stufe}`);
    }
  });
  test('Spielbeginn: in Stufe 0 wacht man in der Stube auf', () => {
    const s = neues(34);
    assert.equal(s.spieler.karte, 'haus');
  });
  test('Kühlschrank: nur in der Küche ab Stufe 1, Behälter mit eigenem Objekttyp, öffnet das Truhenfenster', () => {
    const s = neues(35);
    assert.ok(OBJEKT_TYPEN.kuehlschrank?.blockiert);
    assert.ok(!Object.values(L.welt(s, 'haus').objekte).some((o) => o.t === 'kuehlschrank'), 'keiner in Stufe 0');
    for (const id of ['haus1', 'haus2']) {
      const [x, y] = KUEHLSCHRANK[id];
      const o = L.welt(s, id).objekte[L.k(x, y)];
      assert.equal(o.t, 'kuehlschrank');
      assert.equal(o.inv.length, 24);
      const kue = punkt(id, 'kueche');
      assert.ok(Math.abs(kue.x - x) <= 3 && Math.abs(kue.y - y) <= 1, `${id}: Kühlschrank in der Küche`);
      assert.ok(!L.begehbar(s, KARTEN[id], L.welt(s, id), x, y), 'blockiert');
      assert.ok(L.begehbar(s, KARTEN[id], L.welt(s, id), x, y + 1), 'davor kann man stehen');
    }
    const fenster = [];
    spielStarten(s, { fenster: (name, daten) => fenster.push({ name, daten }) });
    const o = L.welt(s, 'haus1').objekte[L.k(...KUEHLSCHRANK.haus1)];
    OBJEKT_TYPEN.kuehlschrank.interagieren({ o });
    assert.equal(fenster.at(-1).name, 'truhe');
    assert.equal(fenster.at(-1).daten.truhe, o);
    assert.equal(fenster.at(-1).daten.titel, 'Kühlschrank');
    assert.equal(fenster.at(-1).daten.drin, 'Im Kühlschrank');
  });
  test('ältere Stände bekommen die Kühlschränke beim Laden, ein vorhandener Inhalt bleibt', () => {
    const s = neues(36);
    const k1 = L.k(...KUEHLSCHRANK.haus1);
    L.welt(s, 'haus1').objekte[k1].inv[2] = { id: 'holz', n: 4 };
    delete s.hof;
    delete L.welt(s, 'haus2').objekte[L.k(...KUEHLSCHRANK.haus2)];
    L.ergaenzen(s);
    assert.ok(s.hof.uebernommen);
    assert.deepEqual(L.welt(s, 'haus1').objekte[k1].inv[2], { id: 'holz', n: 4 });
    assert.equal(L.welt(s, 'haus2').objekte[L.k(...KUEHLSCHRANK.haus2)].t, 'kuehlschrank');
    const t = JSON.parse(JSON.stringify(s));
    assert.deepEqual(t.hof, s.hof);
  });
  test('beim Ausbau wandern Truhen und der Inhalt des Kühlschranks mit', () => {
    const s = neues(37);
    const truhe = { t: 'truhe', inv: Array(24).fill(null) };
    truhe.inv[0] = { id: 'stein', n: 9 };
    L.welt(s, 'haus').objekte['1,8'] = truhe;
    L.welt(s, 'haus').belag['2,8'] = { t: 'kiesweg' };
    s.haus.stufe = 1;
    uebertragen(s, 'haus1');
    assert.equal(L.welt(s, 'haus').objekte['1,8'], undefined);
    assert.deepEqual(L.welt(s, 'haus').belag, {});
    const neu = Object.entries(L.welt(s, 'haus1').objekte).find(([, o]) => o === truhe);
    assert.ok(neu, 'Truhe in haus1');
    const [tx, ty] = L.ausK(neu[0]);
    assert.ok(L.begehbar(s, KARTEN.haus1, { objekte: {}, felder: {} }, tx, ty), 'steht auf begehbarem Boden');
    assert.equal(L.welt(s, 'haus1').belag['2,8'].t, 'kiesweg');
    // zweiter Ausbau
    L.welt(s, 'haus1').objekte[L.k(...KUEHLSCHRANK.haus1)].inv[5] = { id: 'karpfen', n: 3 };
    s.haus.stufe = 2;
    uebertragen(s, 'haus2');
    const kuehl = L.welt(s, 'haus2').objekte[L.k(...KUEHLSCHRANK.haus2)];
    assert.ok(kuehl.inv.some((x) => x?.id === 'karpfen' && x.n === 3), 'Fisch im neuen Kühlschrank');
    assert.ok(!L.welt(s, 'haus1').objekte[L.k(...KUEHLSCHRANK.haus1)], 'alter Kühlschrank leer geräumt');
    const dort = Object.entries(L.welt(s, 'haus2').objekte).find(([, o]) => o === truhe);
    assert.ok(dort, 'Truhe in haus2');
    assert.equal(L.ausK(dort[0])[1], L.ausK(neu[0])[1] + STUFE2_VERSATZ, 'an derselben Stelle der Stube, eine Etage tiefer');
    // zweimal übertragen tut nichts
    uebertragen(s, 'haus2');
    assert.equal(Object.values(L.welt(s, 'haus2').objekte).filter((o) => o === truhe).length, 1);
  });
  test('wer Stufe 1 überspringt, bekommt Truhen aus Stufe 0 in Stufe 2', () => {
    const s = neues(38);
    const truhe = { t: 'truhe', inv: Array(24).fill(null) };
    L.welt(s, 'haus').objekte['10,8'] = truhe;
    s.haus.stufe = 2;
    karteBetreten2(s, 'haus2');
    assert.ok(Object.values(L.welt(s, 'haus2').objekte).includes(truhe));
  });
  test('der Hook karteBetreten übernimmt die Möbel beim ersten Betreten der neuen Stufe', () => {
    const s = neues(39);
    const truhe = { t: 'truhe', inv: Array(24).fill(null) };
    L.welt(s, 'haus').objekte['4,8'] = truhe;
    s.haus.stufe = 1;
    spielStarten(s, {});
    const p = punkt('haus1', 'eingang');
    karteBetreten('haus1', p.x, p.y, 'oben');
    assert.ok(Object.values(L.welt(S.s, 'haus1').objekte).includes(truhe));
    assert.ok(S.s.hof.uebernommen.haus1);
  });
});
/** Betritt eine Karte über den echten Hook. */
function karteBetreten2(s, id) {
  spielStarten(s, {});
  const p = punkt(id, 'eingang');
  karteBetreten(id, p.x, p.y, 'oben');
}

gruppe('Gewächshaus', () => {
  const gh = () => KARTEN.hof.gebaeude.find((g) => g.ziel?.karte === 'gewaechshaus');
  test('außen kaputt: die Tür bleibt zu, bis die Flagge gesetzt ist; dann geht es hinein', () => {
    const s = neues(40);
    const g = gh();
    assert.equal(g.tuerWenn, 'gewaechshaus');
    assert.ok(g.sonst);
    assert.ok(!L.begehbar(s, KARTEN.hof, null, g.tuer.x, g.tuer.y), 'zu');
    s.flags.gewaechshaus = true;
    L.kartenGeaendert();
    assert.ok(L.begehbar(s, KARTEN.hof, null, g.tuer.x, g.tuer.y), 'offen');
    assert.equal(L.tuerAn(s, KARTEN.hof, g.tuer.x, g.tuer.y), g);
    const vor = punkt('hof', 'vorGewaechshaus');
    assert.deepEqual([vor.x, vor.y], [g.tuer.x, g.tuer.y + 1]);
    assert.equal(L.erfuellt(s, 'gewaechshaus'), true);
    s.flags.gewaechshaus = false;
    assert.equal(L.erfuellt(s, 'gewaechshaus'), false);
  });
  test('innen: 12×10 Erde in zwei Beeten, ganzjährig, farmbar, mit Ausgang auf den Hof', () => {
    const def = KARTEN.gewaechshaus;
    assert.ok(def.ganzjaehrig && def.farmbar && def.aufstellen && !def.aussen);
    let erde = 0;
    for (const z of def.grid) for (const c of z) if (c === 'c') erde++;
    assert.equal(erde, 120);
    const e = punkt('gewaechshaus', 'eingang');
    const warp = def.warps.find((w) => w.punkt === 'vorGewaechshaus');
    assert.deepEqual([warp.x, warp.y], [e.x, e.y + 1]);
    const s = neues(41);
    const ok = erreichbar(s, def, L.welt(s, 'gewaechshaus'), e.x, e.y);
    assert.ok(ok.size > 150);
  });
  test('im Winter wachsen Pflanzen im Gewächshaus und welken beim Jahreszeitwechsel nicht', () => {
    const s = neues(42);
    s.zeit.jz = 3;
    const ort = L.ortVon(s, 'gewaechshaus');
    const p = Object.values(PFLANZEN).find((x) => !x.jz.includes('winter'));
    assert.ok(p, 'eine Sommer-Pflanze');
    L.hinzufuegen(s, { id: p.saat, n: 3 });
    const idx = () => s.spieler.inv.findIndex((i) => i?.id === p.saat);
    assert.equal(L.hacken(s, ort, [[3, 3]]).n, 1);
    assert.ok(L.saeen(s, ort, 3, 3, idx()).ok, 'säen mitten im Winter');
    // draußen geht das nicht
    const hof = L.ortVon(s, 'hof');
    const vor = punkt('hof', 'startacker');
    L.hacken(s, hof, [[vor.x, vor.y]]);
    assert.ok(L.saeen(s, hof, vor.x, vor.y, idx()).grund, 'auf dem Hof im Winter abgelehnt');
    L.giessen(s, ort, [[3, 3]]);
    L.tagBeenden(s, { r: () => 0.5 });
    assert.equal(ort.welt.felder[L.k(3, 3)].pflanze.tage, 1, 'wächst im Winter');
    // Jahreszeitwechsel: Winter → Frühling
    s.zeit.tag = 28;
    L.tagBeenden(s, { r: () => 0.5 });
    assert.ok(!ort.welt.felder[L.k(3, 3)].pflanze.tot, 'nichts welkt');
  });
  test('Notbehelf bis zur Mühle: am Tag 14 kommt ein Brief und die Flagge wird gesetzt', () => {
    assert.ok(BRIEFE.some((b) => b.id === 'hof_gewaechshaus' && b.tagNr === 14));
    const s = neues(43);
    assert.ok(!s.flags.gewaechshaus);
    for (let i = 0; i < 20 && !s.flags.gewaechshaus; i++) L.tagBeenden(s, { r: Math.random });
    assert.ok(s.flags.gewaechshaus);
    assert.ok(L.tagNr(s.zeit) >= 14);
  });
});

gruppe('Fernseher und Herd', () => {
  test('der Herd im Haus kocht, der Fernseher zeigt Sender anderer Bereiche', () => {
    assert.ok(KARTEN.haus.deko.some((d) => d.typ === 'herd' && d.aktion === 'kochen'));
    const fragen = [];
    const s = neues(3);
    spielStarten(s, { frage: (text, optionen) => fragen.push({ text, optionen }), dialog() {} });
    system({ name: 'test-sender', fernsehen: () => [['Testsender', () => {}]] });
    const tv = KARTEN.haus.deko.find((d) => d.aktion === 'tv');
    karteBetreten('haus', tv.x, tv.y + 1, 'oben');
    const E = {
      richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
      aktion: { gedrueckt: true }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
    };
    update(0.05, E);
    assert.ok(fragen.at(-1)?.optionen.some(([t]) => t === 'Testsender'), 'Sender in der Auswahl');
    assert.ok(S.ort.def.id === 'haus');
  });
  test('Bett: Schlafen fragt nach, Versandkiste und Briefkasten haben ihre Aktionen', () => {
    for (const a of ['bett', 'tv', 'versand', 'post']) assert.ok(KARTEN.haus.deko.concat(KARTEN.hof.deko).some((d) => d.aktion === a), a);
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
