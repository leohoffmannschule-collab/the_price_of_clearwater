// Bereich „mine": Ebenen, Gestein, Leitern, Mineneingang, Schwert, Förderkorb, Alrik.
// Aufruf: node test/mine.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { LAEDEN, NPCS } from '../src/daten.js';
import { KARTEN, karteHolen, punkt } from '../src/karten.js';
import { mineErzeugen, MINE_TIEFE, aufzugFahren } from '../src/bereiche/mine/inhalt.js';
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

gruppe('Ebenen', () => {
  test('jede Ebene ist zusammenhängend und hat eine Leiter', () => {
    for (let n = 1; n <= MINE_TIEFE; n++) {
      for (let seed = 0; seed < 3; seed++) {
        const { def, welt, start, monster } = mineErzeugen(n, zufall(n * 100 + seed));
        const s = neues(1);
        assert.ok(L.begehbar(s, def, welt, start.x, start.y), `Ebene ${n}: Start`);
        const steine = Object.entries(welt.objekte).filter(([, o]) => o.t === 'mstein');
        assert.ok(steine.length > 10, `Ebene ${n}: nur ${steine.length} Steine`);
        if (n < MINE_TIEFE) assert.ok(steine.some(([, o]) => o.leiter), `Ebene ${n}: keine Leiter`);
        const ok = erreichbar(s, def, { ...welt, objekte: {} }, start.x, start.y);
        for (const [kk] of steine) assert.ok(ok.has(kk), `Ebene ${n}: Stein ${kk} unerreichbar`);
        for (const m of monster) assert.ok(def.grid[Math.floor((m.y - 2) / 16)][Math.floor(m.x / 16)] === 'm', `Ebene ${n}: Monster in der Wand`);
      }
    }
  });
  test('Steine geben Erz, der Leiterstein eine Leiter', () => {
    const s = neues(24);
    const { def, welt } = mineErzeugen(5, zufall(9));
    const ort = { def, welt };
    const [kk] = Object.entries(welt.objekte).find(([, o]) => o.leiter);
    const [x, y] = kk.split(',').map(Number);
    let erg;
    for (let i = 0; i < 5 && welt.objekte[kk]?.t === 'mstein'; i++) erg = L.spitzhackeHieb(s, ort, x, y, () => 0.5);
    assert.ok(erg.leiter);
    assert.equal(welt.objekte[kk].t, 'leiter');
  });
  test('Minenebenen kommen vom Kartenanbieter und sind flüchtig', () => {
    const s = neues();
    const d = karteHolen('mine3', s);
    assert.ok(d?.fluechtig && d.ebene === 3, 'mine3');
    assert.ok(!KARTEN.mine3, 'nicht in KARTEN');
    const st = punkt(d, 'start');
    assert.ok(L.begehbar(s, d, d.weltStart, st.x, st.y), 'Start begehbar');
    assert.equal(karteHolen(`mine${MINE_TIEFE + 1}`, s), null);
  });
  test('die Mine öffnet am vierten Tag, der Zustand wird beim Laden ergänzt', () => {
    const s = neues(23);
    for (let i = 0; i < 3; i++) L.tagBeenden(s, { r: () => 0.99 });
    assert.ok(s.flags.mineOffen);
    const t = JSON.parse(L.serialisieren(neues(27)));
    delete t.mine;
    assert.deepEqual(L.deserialisieren(JSON.stringify(t)).mine, { tiefste: 0, schwert: false, truhen: [] });
  });
});

gruppe('Laufzeit', () => {
  const E = {
    richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
    aktion: { gedrueckt: false }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
  };
  const aktion = () => { E.aktion.gedrueckt = true; update(0.05, E); E.aktion.gedrueckt = false; };
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
    for (let i = 0; i < 20; i++) update(0.05, E);
    aufzugFahren(0);
    assert.equal(S.ort.def.id, 'mine0');
    assert.equal(S.mineEbene, 0);
    assert.equal(S.monster.length, 0);
  });
});

gruppe('Abenteurergilde', () => {
  test('Alrik steht zu seiner Planzeit an der Theke der Gilde', () => {
    const l = LAEDEN.gilde;
    const o = L.ladenOrt('gilde');
    assert.equal(o.karte, 'gilde');
    assert.ok(NPCS[l.npc].plan.normal.some((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; }));
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
