// Bereich „mine": 120 Ebenen in drei Schichten, Gestein, Leitern, Truhen, Monster und KI, Kampf (Waffen,
// Krit, Unverwundbarkeit, Spezialzüge), Bomben, Treppe, Ringe und Stiefel, Geoden, Mineralien,
// Artefakte und Artefaktstellen, Alriks Gilde mit Monsterzielen, Mineneingang.
// Aufruf: node test/mine.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { LAEDEN, NPCS, ITEMS, REZEPTE, WERKZEUG_ARTEN, T } from '../src/daten.js';
import { KARTEN, karteHolen, punkt, BODEN } from '../src/karten.js';
import { mod } from '../src/system.js';
import { MONSTER, MONSTER_KI, neuesMonster, monsterSchritt, geschossSchritt } from '../src/mine.js';
import { mineErzeugen, MINE_TIEFE, aufzugFahren, schichtVon, SCHATZ } from '../src/bereiche/mine/inhalt.js';
import { ebenenArt, monsterAuswahl, steinErtrag, SEE_EBENEN, freiesFeld } from '../src/bereiche/mine/ebenen.js';
import { MONSTER_TABELLE } from '../src/bereiche/mine/monster.js';
import { MINERALIEN, ARTEFAKTE, WAFFEN, RINGE, STIEFEL, WAFFEN_ARTEN } from '../src/bereiche/mine/gegenstaende.js';
import { KAMPF, waffeSchwingt, spielerGetroffen, spezialStarten, monsterTreffen, explosion, bombeLegen, treppeSetzen, schwungDauer, kampfUpdate } from '../src/bereiche/mine/kampf.js';
import { ringAnlegen, ringAblegen, stiefelAnziehen, stiefelAusziehen } from '../src/bereiche/mine/ringe.js';
import { GEODEN, geodenTabelle, geodeInhalt, geodeOeffnen } from '../src/bereiche/mine/geoden.js';
import { stellenSetzen, ARTEFAKT_KARTEN } from '../src/bereiche/mine/artefakte.js';
import { ZIELE, zielAbholen } from '../src/bereiche/mine/gilde.js';
import { zufall } from '../src/zufall.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, karteBetreten, zustandSichern } from '../src/spiel.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
/** Math.random für die Dauer von fn festlegen. */
function mitZufall(wert, fn) {
  const alt = Math.random;
  Math.random = typeof wert === 'function' ? wert : () => wert;
  try { return fn(); } finally { Math.random = alt; }
}

function erreichbar(s, def, w, sx, sy) {
  const gesehen = new Set([L.k(sx, sy)]);
  const offen = [[sx, sy]];
  while (offen.length) {
    const [x, y] = offen.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const kk = L.k(x + dx, y + dy);
      if (gesehen.has(kk) || !L.begehbar(s, def, w, x + dx, y + dy)) continue;
      gesehen.add(kk);
      offen.push([x + dx, y + dy]);
    }
  }
  return gesehen;
}
const SCHICHT_IDS = ['erde', 'eis', 'lava'];

gruppe('Ebenen (alle 120, drei Schichten)', () => {
  const s = neues(1);
  test('jede Ebene: Start frei, alles erreichbar, Leiter vorhanden (außer ganz unten), Monster auf Boden', () => {
    for (let n = 1; n <= MINE_TIEFE; n++) {
      for (let seed = 0; seed < 4; seed++) {
        const { def, welt, start, monster } = mineErzeugen(n, zufall(n * 100 + seed));
        assert.equal(def.schicht, schichtVon(n), `Ebene ${n}: Schicht`);
        assert.ok(L.begehbar(s, def, welt, start.x, start.y), `Ebene ${n}: Start`);
        const leer = { ...welt, objekte: {} };
        const ok = erreichbar(s, def, leer, start.x, start.y);
        let boden = 0;
        const gesperrt = new Set(def.deko.filter((d) => !d.begehbar && !d.wand).map((d) => L.k(d.x, d.y)));
        for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) if (BODEN[def.grid[y][x]]?.begehbar && !gesperrt.has(L.k(x, y))) { boden++; assert.ok(ok.has(L.k(x, y)), `Ebene ${n}/${seed}: Feld ${x},${y} unerreichbar`); }
        assert.ok(boden > 150, `Ebene ${n}: nur ${boden} Bodenfelder`);
        const objekte = Object.values(welt.objekte);
        const leiter = objekte.some((o) => o.leiter || o.t === 'leiter') || (def.befallen && def.leiterFeld);
        if (n < MINE_TIEFE) assert.ok(leiter, `Ebene ${n}/${seed} (${def.art}): keine Leiter`);
        else assert.ok(!objekte.some((o) => o.leiter || o.t === 'leiter'), 'Ebene 120: keine Leiter mehr');
        for (const m of monster) {
          assert.ok(BODEN[def.grid[Math.floor((m.y - 2) / 16)][Math.floor(m.x / 16)]].begehbar, `Ebene ${n}: Monster in der Wand`);
          assert.ok(monsterAuswahl(n, def.art).some(([id]) => id === m.typ), `Ebene ${n}: ${m.typ} gehört nicht hierher`);
        }
        if (n % 5 === 0) assert.ok(def.deko.some((d) => d.typ === 'aufzug'), `Ebene ${n}: Förderkorb`);
        if (SCHATZ[n]) assert.ok(objekte.some((o) => o.t === 'schatz' && o.ebene === n), `Ebene ${n}: Schatztruhe`);
        if (SEE_EBENEN.includes(n)) assert.equal(def.wasser, 'mine', `Ebene ${n}: unterirdischer See`);
      }
    }
  });
  test('Sonderebenen: befallen, dunkel, Pilzhöhle (nur in der Lava) und Schatzkammern', () => {
    const arten = {};
    for (let n = 1; n <= MINE_TIEFE; n++) for (let seed = 0; seed < 6; seed++) { const a = ebenenArt(n, zufall(n * 7 + seed)); (arten[a] ??= new Set()).add(n); }
    for (const a of ['normal', 'befallen', 'dunkel', 'pilz', 'schatz']) assert.ok(arten[a]?.size, a);
    assert.ok([...arten.pilz].every((n) => n >= 80), 'Pilzhöhlen nur in der Lavaschicht');
    assert.deepEqual([...arten.schatz].sort((a, b) => a - b), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
    const bef = mineErzeugen(33, zufall(3), { art: 'befallen' });
    assert.ok(bef.def.befallen && bef.monster.length >= 12 && bef.def.leiterFeld, 'befallen: viele Monster, Leiter erst danach');
    assert.ok(!Object.values(bef.welt.objekte).some((o) => o.leiter || o.t === 'leiter'));
    const dunkel = mineErzeugen(55, zufall(3), { art: 'dunkel' });
    assert.ok(dunkel.def.dunkel > 0.7, 'dunkle Ebene ist dunkel');
    const pilz = mineErzeugen(95, zufall(3), { art: 'pilz' });
    assert.equal(pilz.def.band, 3);
    assert.ok(pilz.def.deko.some((d) => d.typ === 'mine_leuchtpilz'), 'Leuchtpilze');
  });
  test('Monster je Schicht: jede Schicht hat eigene Monster, alle haben KI', () => {
    const je = SCHICHT_IDS.map((id) => new Set(MONSTER_TABELLE[id].map(([m]) => m)));
    assert.ok(je.every((x) => x.size >= 5), 'mindestens fünf Arten je Schicht');
    assert.ok(Object.keys(MONSTER).length >= 16, `${Object.keys(MONSTER).length} Monster`);
    for (const [id, d] of Object.entries(MONSTER)) assert.ok(MONSTER_KI[d.ki ?? d.art], `${id}: KI ${d.ki}`);
    for (let n = 1; n <= MINE_TIEFE; n += 3) {
      const typen = new Set();
      for (let seed = 0; seed < 6; seed++) for (const m of mineErzeugen(n, zufall(n + seed * 1000)).monster) typen.add(m.typ);
      const erlaubt = new Set([...MONSTER_TABELLE[SCHICHT_IDS[schichtVon(n)]], ...MONSTER_TABELLE[`dunkel_${SCHICHT_IDS[schichtVon(n)]}`], ...(schichtVon(n) === 2 ? MONSTER_TABELLE.pilz : [])].map(([m]) => m));
      for (const t of typen) assert.ok(erlaubt.has(t), `Ebene ${n}: ${t}`);
    }
  });
  test('Erze nach Schicht: Kupfer oben, Eisen im Eis, Gold in der Lava, Iridium erst ab 100', () => {
    const zaehle = (von, bis) => {
      const z = {};
      for (let n = von; n <= bis; n++) for (let seed = 0; seed < 3; seed++) for (const o of Object.values(mineErzeugen(n, zufall(n * 31 + seed)).welt.objekte)) if (o.t === 'mstein') z[o.art] = (z[o.art] || 0) + 1;
      return z;
    };
    const erde = zaehle(1, 30);
    const eis = zaehle(41, 70);
    const lava = zaehle(81, 99);
    const tief = zaehle(100, 119);
    assert.ok(erde.kupfer > (erde.eisen || 0) * 3 && !erde.gold, `Erde ${JSON.stringify(erde)}`);
    assert.ok(eis.eisen > (eis.kupfer || 0), `Eis ${JSON.stringify(eis)}`);
    assert.ok(lava.gold > (lava.eisen || 0) && !lava.iridium, `Lava ${JSON.stringify(lava)}`);
    assert.ok(tief.iridium > 0, 'Iridium tief unten');
  });
  test('Steine geben Erz, der Leiterstein eine Leiter; Geodensteine Geoden der Schicht', () => {
    const s2 = neues(24);
    const { def, welt } = mineErzeugen(5, zufall(9));
    const ort = { def, welt };
    const [kk] = Object.entries(welt.objekte).find(([, o]) => o.leiter);
    const [x, y] = kk.split(',').map(Number);
    let erg;
    for (let i = 0; i < 5 && welt.objekte[kk]?.t === 'mstein'; i++) erg = L.spitzhackeHieb(s2, ort, x, y, () => 0.5);
    assert.ok(erg.leiter);
    assert.equal(welt.objekte[kk].t, 'leiter');
    assert.equal(steinErtrag('kupfer', 5, () => 0.5, 0, s2).items[0].id, 'kupfererz');
    assert.equal(steinErtrag('iridium', 110, () => 0.5, 0, s2).items[0].id, 'iridiumerz');
    assert.equal(steinErtrag('geode', 50, () => 0.5, 0, s2).items[0].id, 'frostgeode');
    assert.equal(steinErtrag('geode', 90, () => 0.5, 0, s2).items[0].id, 'magmageode');
  });
  test('Erzbrocken außerhalb der Mine (Steinbruch) setzen nie eine Leiter', () => {
    const s2 = neues(25);
    const ort = L.ortVon(s2, 'berg');
    const p = punkt('berg', 'steinbruch');
    for (let i = 0; i < 20; i++) {
      const x = p.x + 2 + (i % 5);
      const y = p.y - 3 + Math.floor(i / 5);
      ort.welt.objekte[L.k(x, y)] = { t: 'mstein', art: 'kupfer', hp: 1 };
      const erg = L.spitzhackeHieb(s2, ort, x, y, () => 0);
      assert.ok(!erg.leiter && !erg.loch, 'keine Leiter');
      assert.notEqual(ort.welt.objekte[L.k(x, y)]?.t, 'leiter');
      assert.ok(erg.items.some((it) => it.id === 'kupfererz'));
    }
  });
  test('Minenebenen kommen vom Kartenanbieter, sind flüchtig, 1 bis 120', () => {
    const s2 = neues();
    const d = karteHolen('mine3', s2);
    assert.ok(d?.fluechtig && d.ebene === 3, 'mine3');
    assert.ok(!KARTEN.mine3, 'nicht in KARTEN');
    const st = punkt(d, 'start');
    assert.ok(L.begehbar(s2, d, d.weltStart, st.x, st.y), 'Start begehbar');
    assert.ok(karteHolen('mine120', s2), 'mine120');
    assert.equal(karteHolen(`mine${MINE_TIEFE + 1}`, s2), null);
  });
  test('die Mine öffnet am vierten Tag, der Zustand wird beim Laden ergänzt', () => {
    const s2 = neues(23);
    for (let i = 0; i < 3; i++) L.tagBeenden(s2, { r: () => 0.99 });
    assert.ok(s2.flags.mineOffen);
    const t = JSON.parse(L.serialisieren(neues(27)));
    delete t.mine;
    const m = L.deserialisieren(JSON.stringify(t)).mine;
    assert.deepEqual(m, { tiefste: 0, schwert: false, truhen: [], ringe: [null, null], stiefel: null, besiegt: {}, belohnt: [], gefunden: {}, monster: 0, geoden: 0 });
  });
});

gruppe('Gegenstände', () => {
  test('mindestens 30 Mineralien und 20 Artefakte, alle mit museum: true', () => {
    assert.ok(MINERALIEN.length >= 30, `${MINERALIEN.length} Mineralien`);
    assert.ok(ARTEFAKTE.length >= 20, `${ARTEFAKTE.length} Artefakte`);
    for (const id of [...MINERALIEN, ...ARTEFAKTE]) assert.ok(ITEMS[id].museum && ITEMS[id].preis > 0, id);
    for (const id of ARTEFAKTE) assert.ok(ITEMS[id].fundorte.length, `${id}: Fundorte`);
  });
  test('rund 20 Waffen in drei Arten, Ringe, Stiefel, Geoden, Bomben und Treppe als Rezepte', () => {
    assert.ok(WAFFEN.length >= 20, `${WAFFEN.length} Waffen`);
    for (const art of Object.keys(WAFFEN_ARTEN)) assert.ok(WAFFEN.filter((id) => ITEMS[id].waffe.art === art).length >= 5, art);
    for (const id of WAFFEN) assert.ok(WERKZEUG_ARTEN[ITEMS[id].werkzeug], `${id}: Werkzeugart`);
    assert.ok(RINGE.length >= 10, `${RINGE.length} Ringe`);
    assert.ok(STIEFEL.length >= 3);
    assert.deepEqual(GEODEN, ['geode', 'frostgeode', 'magmageode', 'omnigeode']);
    for (const id of ['kirschbombe', 'bombe', 'megabombe', 'treppe']) assert.ok(REZEPTE.some((r) => (r.ergebnis ?? r.id) === id), `Rezept ${id}`);
    assert.ok(REZEPTE.some((r) => (r.ergebnis ?? r.id) === 'iridiumbarren'), 'Iridiumbarren lässt sich schmelzen');
    for (const id of ['kupfererz', 'eisenerz', 'golderz', 'iridiumerz', 'kupferbarren', 'eisenbarren', 'goldbarren', 'iridiumbarren', 'quarz']) assert.ok(ITEMS[id], id);
  });
  test('Schatztruhen alle zehn Ebenen mit echten Belohnungen (Waffen, Ringe), jede einmal', () => {
    for (let n = 10; n <= MINE_TIEFE; n += 10) {
      assert.ok(SCHATZ[n]?.length, `Ebene ${n}`);
      for (const it of SCHATZ[n]) assert.ok(ITEMS[it.id], `${n}: ${it.id}`);
    }
    const alle = Object.values(SCHATZ).flat().map((x) => ITEMS[x.id].kat);
    assert.ok(alle.includes('waffe') && alle.includes('ring'));
    const { def, welt } = mineErzeugen(10, zufall(1), { schatzGeholt: [10] });
    assert.ok(!Object.values(welt.objekte).some((o) => o.t === 'schatz'), 'geholte Truhe kommt nicht wieder');
    void def;
  });
});

// ─── Laufzeit ───────────────────────────────────────────────────────────────

const E = {
  richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
  aktion: { gedrueckt: false }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
};
const aktion = () => { E.aktion.gedrueckt = true; update(0.05, E); E.aktion.gedrueckt = false; };
const schritte = (n, dt = 0.05) => { for (let i = 0; i < n; i++) update(dt, E); };

/** Startet ein Spiel auf einer festen Minenebene, die Spielerin am Start, ohne Monster. */
function inDerMine(n = 12, seed = 5) {
  const s = neues(seed);
  s.zeit.minute = 600;
  spielStarten(s, {});
  karteBetreten(`mine${n}`);
  S.monster = [];
  KAMPF.abk.schwert = 0; KAMPF.abk.dolch = 0; KAMPF.abk.keule = 0;
  S.sp.unverwundbar = 0;
  return s;
}
function inHand(s, id) {
  s.spieler.inv[0] = { id, n: 1 };
  s.spieler.wahl = 0;
}
/** Monster direkt vor die Spielerin stellen. */
function monsterVorne(typ, abstand = 14) {
  const m = neuesMonster(typ, 0, 0, () => 0.5);
  const [dx, dy] = L.RICHTUNG[S.sp.blick];
  m.x = S.sp.x + dx * abstand;
  m.y = S.sp.y + dy * abstand;
  m.phase = 'ruhe';
  m.panzer = 0;
  S.monster.push(m);
  return m;
}

gruppe('Kampf', () => {
  test('Waffen treffen Monster vor der Spielerin, mit Krit und Rückstoß; Unverwundbarkeit kurz danach', () => {
    const s = inDerMine();
    inHand(s, 'stahlschwert');
    S.sp.blick = 'rechts';
    const m = monsterVorne('lavaschleim');
    const vorher = m.hp;
    mitZufall(0.99, () => waffeSchwingt('stahlschwert'));
    const normal = vorher - m.hp;
    assert.ok(normal >= 6, `Schaden ${normal}`);
    assert.ok(m.vx > 0 && m.stoss > 0, 'Rückstoß nach rechts');
    const zwischen = m.hp;
    mitZufall(0.99, () => waffeSchwingt('stahlschwert'));
    assert.equal(m.hp, zwischen, 'kurz unverwundbar');
    m.unverw = 0;
    mitZufall(0, () => waffeSchwingt('stahlschwert'));
    assert.ok(zwischen - m.hp >= Math.round(6 * 1.5), 'Krit trifft härter');
    const hinten = monsterVorne('lavaschleim', -20);
    mitZufall(0.5, () => waffeSchwingt('stahlschwert'));
    assert.equal(hinten.hp, hinten.max, 'hinter der Spielerin kein Treffer');
  });
  test('Schwung über Benutzen: Waffe schwingt, die Wirkung trifft bei gut der Hälfte, Dolch schneller als Keule', () => {
    const s = inDerMine();
    inHand(s, 'eisendolch');
    S.sp.blick = 'unten';
    S.ziel = { x: Math.floor(S.sp.x / T), y: Math.floor((S.sp.y - 3) / T) + 1 };
    const m = monsterVorne('frostschleim');
    m.unverw = 0;
    E.benutzen.gedrueckt = true; update(0.02, E); E.benutzen.gedrueckt = false;
    assert.ok(S.sp.aktion?.werkzeugArt === 'mine_dolch', 'Dolch-Schwung läuft');
    schritte(6);
    assert.ok(m.hp < m.max, 'getroffen');
    assert.ok(schwungDauer('eisendolch', s) < schwungDauer('stahlschwert', s));
    assert.ok(schwungDauer('stahlschwert', s) < schwungDauer('bleistab', s));
  });
  test('Treffer an der Spielerin: Verteidigung, Unverwundbarkeit, Rückstoß, Ohnmacht bei 0', () => {
    const s = inDerMine();
    s.spieler.hp = 100;
    assert.ok(spielerGetroffen(10, S.sp.x - 10, S.sp.y));
    assert.equal(s.spieler.hp, 90);
    assert.ok(S.sp.unverwundbar > 0 && S.sp.stoss.vx > 0);
    assert.ok(!spielerGetroffen(10, S.sp.x - 10, S.sp.y), 'unverwundbar');
    S.sp.unverwundbar = 0;
    s.mine.stiefel = 'eisenkappen';
    spielerGetroffen(10, S.sp.x, S.sp.y);
    assert.equal(s.spieler.hp, 83, 'Eisenkappen ziehen 3 ab');
    S.sp.unverwundbar = 0;
    spielerGetroffen(500, S.sp.x, S.sp.y);
    assert.equal(s.spieler.hp, 0);
    assert.ok(S.pause, 'Ohnmacht hält das Spiel an');
  });
  test('Spezialzüge: Block pariert, Stichhagel trifft mehrfach, Stampfer trifft rundum; Abklingzeit', () => {
    let s = inDerMine();
    inHand(s, 'stahlschwert');
    s.spieler.hp = 50;
    assert.ok(spezialStarten());
    assert.equal(S.sp.aktion.spezial, 'block');
    const m = monsterVorne('schleim');
    assert.ok(!spielerGetroffen(20, m.x, m.y, m), 'pariert');
    assert.equal(s.spieler.hp, 50);
    assert.ok(m.betaeubt > 0, 'Angreifer betäubt');
    S.sp.aktion = null;
    assert.ok(!spezialStarten(), 'Abklingzeit');

    s = inDerMine();
    inHand(s, 'eisendolch');
    S.sp.blick = 'rechts';
    const ziel = monsterVorne('metallkopf');
    ziel.panzer = 0;
    const hpVor = ziel.hp;
    assert.ok(spezialStarten());
    let treffer = 0;
    let letzte = ziel.hp;
    mitZufall(0.99, () => { for (let i = 0; i < 14; i++) { ziel.x = S.sp.x + 14; ziel.y = S.sp.y; ziel.stoss = 0; schritte(1); if (ziel.hp < letzte) { treffer++; letzte = ziel.hp; } } });
    assert.ok(treffer >= 3, `Stichhagel: ${treffer} Treffer`);
    assert.ok(ziel.hp < hpVor);

    s = inDerMine();
    inHand(s, 'bleistab');
    const rund = ['oben', 'unten', 'links', 'rechts'].map((b) => { S.sp.blick = b; return monsterVorne('frostschleim', 18); });
    S.sp.blick = 'unten';
    assert.ok(spezialStarten());
    mitZufall(0.99, () => schritte(18));
    assert.ok(rund.every((x) => x.hp < x.max), 'Stampfer trifft in alle Richtungen');
  });
  test('Monster-KI: jede Art bewegt sich ohne Fehler, bleibt im Begehbaren (außer Geistern)', () => {
    inDerMine(45, 3);
    const frei = (px, py, fliegt) => {
      const tx = Math.floor(px / T);
      const ty = Math.floor((py - 4) / T);
      const b = BODEN[S.ort.def.grid[ty]?.[tx]];
      return !!b && !b.wand && (fliegt || b.begehbar);
    };
    for (const typ of Object.keys(MONSTER)) {
      const st = punkt(S.ort.def, 'start');
      const m = neuesMonster(typ, st.x, st.y, () => 0.3);
      const sp = { x: m.x + 20, y: m.y };
      let wurf = 0;
      let beruehrt = 0;
      for (let i = 0; i < 300; i++) {
        if (monsterSchritt(m, 0.03, sp, frei, { r: zufall(i), schiessen: () => wurf++, platzNahe: () => ({ x: sp.x - 20, y: sp.y }), breite: S.ort.def.w * T, hoehe: S.ort.def.h * T })) beruehrt++;
        assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y), `${typ}: Position`);
        if (!MONSTER[typ].durchWand) assert.ok(frei(m.x, m.y, MONSTER[typ].fliegt), `${typ}: in der Wand`);
      }
      if (MONSTER[typ].ki === 'werfer') assert.ok(wurf > 0, `${typ} wirft`);
    }
  });
  test('Felsenkrabbe: getarnt, wacht auf, wenn man nah kommt; die Spitzhacke knackt die Schale', () => {
    inDerMine();
    S.sp.blick = 'rechts';
    const m = monsterVorne('felsenkrabbe', 40);
    m.phase = 'getarnt';
    m.panzer = MONSTER.felsenkrabbe.verteidigung;
    const frei = () => true;
    monsterSchritt(m, 0.05, { x: m.x + 60, y: m.y }, frei);
    assert.equal(m.phase, 'getarnt', 'weit weg: bleibt Stein');
    assert.ok(!monsterSchritt(m, 0.05, { x: m.x, y: m.y + 4 }, frei), 'getarnt berührt nicht');
    assert.equal(m.phase, 'aufwachen');
    monsterTreffen(m, 2, { spitzhacke: true });
    assert.equal(m.panzer, 0, 'Schale ab');
  });
  test('Geschosse fliegen, prallen an Wänden ab und treffen die Spielerin', () => {
    const g = { x: 0, y: 0, vx: 100, vy: 0, t: 0, schaden: 5 };
    assert.equal(geschossSchritt(g, 0.1, { x: 30, y: 10 }, () => true), undefined);
    assert.equal(geschossSchritt({ ...g }, 0.1, { x: 500, y: 0 }, () => false), 'weg');
    assert.equal(geschossSchritt({ x: 18, y: 0, vx: 10, vy: 0, t: 0 }, 0.1, { x: 19, y: 10 }, () => true), 'treffer');
  });
  test('besiegte Monster: Beute, Erfahrung, Zählung für die Ziele; befallene Ebene gibt die Leiter frei', () => {
    const s = inDerMine(34, 2);
    S.ort.def.befallen = true;
    S.ort.def.leiterFeld = null;
    S.sp.blick = 'rechts';
    const m = monsterVorne('schleim');
    const xp = s.spieler.xp.kampf;
    mitZufall(0, () => monsterTreffen(m, 999, {}));
    assert.equal(S.monster.length, 0);
    assert.equal(s.mine.besiegt.schleim, 1);
    assert.ok(s.spieler.xp.kampf > xp);
    assert.ok(L.hat(s, 'schleim'), 'Beute');
    assert.ok(Object.values(S.ort.welt.objekte).some((o) => o.t === 'leiter'), 'Leiter erscheint');
  });
  test('Bomben: zerstören Gestein im Radius und geben den Ertrag; Treppe setzt eine Leiter', () => {
    const s = inDerMine(15, 4);
    const ort = S.ort;
    const st = punkt(ort.def, 'start');
    const fern = { x: st.x, y: st.y };
    const steineVor = Object.entries(ort.welt.objekte).filter(([, o]) => o.t === 'mstein');
    const [kk] = steineVor[0];
    const [bx, by] = kk.split(',').map(Number);
    const erg = explosion(s, ort, { x: bx, y: by, radius: 2.5 }, () => 0.5);
    assert.ok(erg.zerstoert >= 1 && erg.items.length, 'Steine weg, Ertrag da');
    for (const [k2, o] of steineVor) {
      const [x, y] = k2.split(',').map(Number);
      if ((x - bx) ** 2 + (y - by) ** 2 <= 2.5 * 2.5) assert.notEqual(ort.welt.objekte[k2], o, `${k2} zerstört`);
      else assert.equal(ort.welt.objekte[k2], o, `${k2} unberührt`);
    }
    s.spieler.inv[3] = { id: 'kirschbombe', n: 2 };
    assert.equal(bombeLegen(s, ort, fern.x, fern.y, 3), true);
    assert.equal(s.spieler.inv[3].n, 1);
    assert.equal(KAMPF.bomben.length, 1);
    assert.notEqual(bombeLegen(s, ort, 0, 0, 3), true, 'nicht in die Wand');
    mitZufall(0.5, () => { for (let i = 0; i < 50; i++) kampfUpdate(0.05); });
    assert.equal(KAMPF.bomben.length, 0, 'explodiert');
    s.spieler.inv[4] = { id: 'treppe', n: 1 };
    const frei = [];
    for (let y = 0; y < ort.def.h; y++) for (let x = 0; x < ort.def.w; x++) if (freiesFeld(ort, x, y)) frei.push([x, y]);
    const [tx, ty] = frei[frei.length - 1];
    assert.equal(treppeSetzen(s, ort, tx, ty, 4), true);
    assert.equal(ort.welt.objekte[L.k(tx, ty)].t, 'leiter');
    assert.equal(s.spieler.inv[4], null);
  });
  test('Aktionstaste mit Waffe in der Hand auf einer Ebene: Spezialzug (Hinweis zeigt den Namen)', () => {
    const s = inDerMine(12, 8);
    inHand(s, 'holzknueppel');
    const st = punkt(S.ort.def, 'start');
    // auf ein Feld stellen, vor dem nichts liegt
    S.ort.welt.objekte = {};
    S.ort.def.deko = S.ort.def.deko.filter((d) => d.typ !== 'leiter_auf' && d.typ !== 'aufzug');
    L.kartenGeaendert();
    karteBetretenOhneNeu(st);
    schritte(1);
    assert.equal(S.hinweis, 'Stampfer');
    aktion();
    assert.equal(S.sp.aktion?.spezial, 'stampfer');
  });
});

/** Spielerin auf ein Feld der aktuellen Karte stellen, ohne sie neu zu erzeugen. */
function karteBetretenOhneNeu(p) {
  S.sp.x = p.x * T + 8;
  S.sp.y = p.y * T + 13;
  S.sp.blick = 'unten';
  S.ziel = { x: p.x, y: p.y + 1 };
}

gruppe('Ringe und Stiefel', () => {
  test('zwei Ringplätze: Anlegen, Wirkung über Modifikatoren, Ablegen, Tauschen', () => {
    const s = neues(41);
    const stufeVor = L.stufeWirksam(s, 'bergbau');
    const radiusVor = mod('sammelRadius', 22, { s });
    s.spieler.inv[5] = { id: 'kupferring', n: 1 };
    s.spieler.inv[6] = { id: 'magnetring', n: 1 };
    s.spieler.inv[7] = { id: 'lebensring', n: 1 };
    assert.equal(ringAnlegen(s, 5), true);
    assert.equal(ringAnlegen(s, 6), true);
    assert.deepEqual(s.mine.ringe, ['kupferring', 'magnetring']);
    assert.equal(L.stufeWirksam(s, 'bergbau'), stufeVor + 1);
    assert.equal(mod('sammelRadius', 22, { s }), radiusVor + 32);
    const hpVor = s.spieler.maxHp;
    assert.equal(ringAnlegen(s, 7, 0), true, 'tauscht Platz 1');
    assert.equal(s.spieler.inv[7].id, 'kupferring');
    assert.equal(s.spieler.maxHp, hpVor + 25);
    assert.equal(ringAblegen(s, 0), true);
    assert.equal(s.spieler.maxHp, hpVor);
    assert.equal(s.mine.ringe[0], null);
    assert.notEqual(ringAnlegen(s, 0), true, 'kein Ring');
  });
  test('Kampfringe: Schaden, Krit, Verteidigung, Energie, Waffentempo, Heilen', () => {
    const s = neues(42);
    const vorher = { schaden: mod('schaden', 10, { s }), vert: mod('verteidigung', 0, { s }), energie: L.energieKosten(s, 'hacke'), tempo: schwungDauer('stahlschwert', s) };
    s.mine.ringe = ['kriegerring', 'schutzring'];
    assert.equal(mod('schaden', 10, { s }), vorher.schaden * 1.1);
    assert.equal(mod('verteidigung', 0, { s }), vorher.vert + 2);
    s.mine.ringe = ['ruhering', 'smaragdring'];
    assert.ok(L.energieKosten(s, 'hacke') < vorher.energie);
    assert.ok(schwungDauer('stahlschwert', s) < vorher.tempo);
    s.mine.ringe = ['rubinring', 'vampirring'];
    assert.equal(mod('mine_krit', 0, { s }), 0.05);
    assert.equal(mod('mine_heilen', 0, { s }), 2);
  });
  test('Stiefel: anziehen, Verteidigung und Tempo, ausziehen', () => {
    const s = neues(43);
    s.spieler.inv[5] = { id: 'feuerstiefel', n: 1 };
    assert.equal(stiefelAnziehen(s, 5), true);
    assert.equal(s.spieler.inv[5], null);
    assert.equal(mod('verteidigung', 0, { s }), 4);
    assert.ok(mod('laufTempo', 76, { s }) > 76);
    assert.equal(stiefelAusziehen(s), true);
    assert.ok(L.hat(s, 'feuerstiefel'));
  });
});

gruppe('Geoden und Artefakte', () => {
  test('jede Geode enthält passende Mineralien, Erze und manchmal Artefakte', () => {
    for (const g of GEODEN) {
      const tab = geodenTabelle(g);
      assert.ok(tab.some(([id]) => ITEMS[id].kat === 'mineral'), `${g}: Mineralien`);
      assert.ok(tab.some(([id]) => ITEMS[id].kat === 'erz'), `${g}: Erz`);
      const r = zufall(GEODEN.indexOf(g) + 1);
      const gesehen = new Set();
      for (let i = 0; i < 400; i++) { const x = geodeInhalt(g, r); assert.ok(ITEMS[x.id] && x.n >= 1, x.id); gesehen.add(x.id); }
      assert.ok(gesehen.size >= 8, `${g}: Vielfalt ${gesehen.size}`);
    }
    assert.ok(geodenTabelle('omnigeode').some(([id]) => id === 'prismasplitter'), 'Omnigeode: Prismasplitter möglich');
    assert.ok(!geodenTabelle('geode').some(([id]) => id === 'obsidian'), 'Obsidian nur aus Magma- und Omnigeoden');
    for (const id of MINERALIEN) assert.ok(GEODEN.some((g) => geodenTabelle(g).some(([x]) => x === id)) || ['amethyst', 'topas', 'aquamarin', 'jade', 'smaragd', 'rubin', 'diamant'].includes(id), `${id}: irgendwo zu finden`);
  });
  test('Bruno knackt Geoden für 25 g; ohne Platz bleibt die Geode heil', () => {
    const s = neues(44);
    s.spieler.gold = 100;
    s.spieler.inv[2] = { id: 'frostgeode', n: 2 };
    const erg = geodeOeffnen(s, 2, () => 0.3);
    assert.ok(erg.slot && ITEMS[erg.slot.id]);
    assert.equal(s.spieler.gold, 75);
    assert.equal(s.spieler.inv[2].n, 1);
    assert.equal(s.mine.geoden, 1);
    for (let i = 0; i < s.spieler.inv.length; i++) if (i !== 2) s.spieler.inv[i] = { id: 'schwert', n: 1 };
    s.spieler.inv[2] = { id: 'frostgeode', n: 2 };
    const voll = geodeOeffnen(s, 2, () => 0.3);
    assert.ok(voll.grund, 'Rucksack voll');
    assert.equal(s.spieler.inv[2].n, 2, 'Geode bleibt');
    assert.equal(s.spieler.gold, 75, 'kein Gold weg');
    s.spieler.gold = 10;
    s.spieler.inv[3] = null;
    assert.ok(geodeOeffnen(s, 2).grund, 'zu wenig Gold');
    assert.ok(L.kauftKategorien('schmiede').includes('geode'));
  });
  test('Artefaktstellen auf Dorf, Wald, Strand, Berg und im Geheimen Wald; die Hacke gräbt sie aus', () => {
    const s = neues(45);
    for (const id of Object.keys(ARTEFAKT_KARTEN)) {
      if (!KARTEN[id]) continue;
      stellenSetzen(s, id, zufall(3), 3);
      const ort = L.ortVon(s, id);
      const stellen = Object.entries(ort.welt.objekte).filter(([, o]) => o.t === 'mine_artefaktstelle');
      assert.ok(stellen.length >= 1 && stellen.length <= 3, `${id}: ${stellen.length}`);
      const [kk] = stellen[0];
      const [x, y] = kk.split(',').map(Number);
      const erg = L.hacken(s, ort, [[x, y]], () => 0.1);
      assert.ok(!ort.welt.objekte[kk], `${id}: ausgegraben`);
      assert.ok(erg.items.length, `${id}: Fund`);
      if (ITEMS[erg.items[0].id].kat === 'artefakt') assert.ok(ITEMS[erg.items[0].id].fundorte.includes(ARTEFAKT_KARTEN[id]), `${id}: passendes Artefakt`);
    }
  });
});

gruppe('Abenteurergilde', () => {
  test('Alrik steht zu seiner Planzeit an der Theke der Gilde', () => {
    const l = LAEDEN.gilde;
    const o = L.ladenOrt('gilde');
    assert.equal(o.karte, 'gilde');
    assert.ok(NPCS[l.npc].plan.normal.some((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; }));
  });
  test('die Gilde verkauft mehr, je tiefer man war; Waffen, Stiefel und Ringe', () => {
    const s = neues(46);
    const anfang = L.ladenWare(s, 'gilde').map((w) => w.id);
    s.mine.tiefste = 120;
    const spaeter = L.ladenWare(s, 'gilde').map((w) => w.id);
    assert.ok(anfang.length < spaeter.length);
    assert.ok(spaeter.some((id) => ITEMS[id].kat === 'waffe') && spaeter.some((id) => ITEMS[id].kat === 'stiefel') && spaeter.some((id) => ITEMS[id].kat === 'ring'));
  });
  test('Monsterziele: erst nach genug besiegten Monstern, Belohnung einmal', () => {
    const s = neues(47);
    const z = ZIELE[0];
    assert.ok(zielAbholen(s, z.id).grund);
    s.mine.besiegt[z.typen[0]] = z.n;
    const erg = zielAbholen(s, z.id);
    assert.equal(erg.slot.id, z.belohnung);
    assert.ok(L.hat(s, z.belohnung));
    assert.ok(zielAbholen(s, z.id).grund, 'nur einmal');
    for (const x of ZIELE) assert.ok(ITEMS[x.belohnung] && x.typen.every((t) => MONSTER[t]), x.id);
  });
});

gruppe('Laufzeit', () => {
  test('Schwert nehmen, Leiter hinab, Ebene 1 mit Monstern, Förderkorb zurück', () => {
    const s = neues(5);
    s.zeit.minute = 600;
    spielStarten(s, {});
    karteBetreten('mine0', 3, 3, 'oben');
    aktion();
    assert.ok(L.hat(S.s, 'schwert'), 'Schwert');
    assert.ok(S.s.mine.schwert);
    const p = punkt('mine0', 'leiter');
    karteBetreten('mine0', p.x, p.y, 'oben');
    aktion();
    assert.equal(S.ort.def.id, 'mine1');
    assert.equal(S.mineEbene, 1);
    assert.ok(S.monster.length > 0, 'Monster');
    assert.equal(S.s.mine.tiefste, 1);
    const gesichert = zustandSichern();
    assert.equal(gesichert.spieler.karte, 'mine0');
    assert.deepEqual([gesichert.spieler.x, gesichert.spieler.y], [p.x, p.y]);
    for (let i = 0; i < 40; i++) update(0.05, E);
    aufzugFahren(0);
    assert.equal(S.ort.def.id, 'mine0');
    assert.equal(S.mineEbene, 0);
    assert.equal(S.monster.length, 0);
    aufzugFahren(55);
    assert.equal(S.ort.def.id, 'mine55');
    assert.equal(S.s.mine.tiefste, 55);
  });
  test('alle Ebenen laufen 2 Sekunden mit Monstern ohne Fehler', () => {
    const s = neues(9);
    s.zeit.minute = 600;
    spielStarten(s, {});
    for (let n = 1; n <= MINE_TIEFE; n += 7) {
      karteBetreten(`mine${n}`);
      s.spieler.hp = s.spieler.maxHp;
      S.sp.unverwundbar = 99;
      for (let i = 0; i < 40; i++) update(0.05, E);
    }
    S.sp.unverwundbar = 0;
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
