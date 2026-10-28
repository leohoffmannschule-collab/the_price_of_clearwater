// Bereich „mine" – die 120 Ebenen in drei Schichten: Generator (Höhle, Böden, Seen, Lava, Gestein,
// Leiter, Truhen, Kisten, Monster), Kartenanbieter, Gestein und Erträge, Leitern, Löcher und der
// Förderkorb. Alles, was eine Ebene enthält, entsteht aus (n, r) – damit lässt es sich testen.

import { T, ITEMS, objektTyp } from '../../daten.js';
import { karteVorbereiten, kartenAnbieter, bodenTyp } from '../../karten.js';
import { mod } from '../../system.js';
import * as L from '../../logik.js';
import { hoehleGraben, neuesMonster, MONSTER } from '../../mine.js';
import { zufall, ganz, waehle } from '../../zufall.js';
import { S, ton, wechseln, wechselnZu, ergebnisZeigen, meldung, schwebeText } from '../../spiel.js';
import { MONSTER_TABELLE } from './monster.js';
import { ARTEFAKTE } from './gegenstaende.js';

export const MINE_TIEFE = 120;

/** Die drei Schichten; `dunkel` ist die Grunddunkelheit (render.js, `def.dunkel`). */
export const SCHICHTEN = [
  { id: 'erde', name: 'Erdschicht', von: 1, bis: 39, dunkel: 0.42 },
  { id: 'eis', name: 'Eisschicht', von: 40, bis: 79, dunkel: 0.5 },
  { id: 'lava', name: 'Lavaschicht', von: 80, bis: MINE_TIEFE, dunkel: 0.55 },
];
export const schichtVon = (n) => (n <= 39 ? 0 : n <= 79 ? 1 : 2);
/** Farbband (MINE_FARBEN): 0 Erde, 1 Eis, 2 Lava, 3 Pilz. */
export const bandVon = schichtVon;
export const BAENDER = SCHICHTEN;

/** Ebenen mit unterirdischem See (Gewässer „mine"). */
export const SEE_EBENEN = [20, 60, 100];

// Bodenzeichen aus dem Vorrat des Bereichs (ARCHITEKTUR §5): z A B C D
bodenTyp('z', { name: 'mine_lava' });
bodenTyp('A', { name: 'mine_eisboden', begehbar: true });
bodenTyp('B', { name: 'mine_moos', begehbar: true });
bodenTyp('C', { name: 'mine_kies', begehbar: true });
bodenTyp('D', { name: 'mine_bohlen', begehbar: true });

const BODEN_FREI = new Set(['m', 'A', 'B', 'C', 'D']);

// ─── Gestein ────────────────────────────────────────────────────────────────

/** Trefferpunkte je Steinart und Schicht. */
export const STEINARTEN = {
  stein: { hp: [1, 2, 3] },
  kohle: { hp: [2, 2, 3] },
  kupfer: { hp: [2, 2, 2] },
  eisen: { hp: [3, 3, 3] },
  gold: { hp: [4, 4, 4] },
  iridium: { hp: [6, 6, 6] },
  edel: { hp: [3, 3, 3] },
  geode: { hp: [3, 3, 4] },
};

/** Anteile der Steinarten je Schicht (Rest ist gewöhnlicher Stein). */
function steinArt(n, r, art) {
  const sch = schichtVon(n);
  const tief = (n - SCHICHTEN[sch].von) / 40;
  const anteile = [
    { kupfer: 0.09, eisen: n >= 25 ? 0.012 : 0, kohle: 0.04, edel: 0.014, geode: 0.03 },
    { kupfer: 0.02, eisen: 0.085, gold: n >= 65 ? 0.01 : 0, kohle: 0.05, edel: 0.02, geode: 0.032 },
    { eisen: 0.02, gold: 0.085, iridium: n >= 100 ? 0.004 + (n - 100) * 0.0004 : 0, kohle: 0.05, edel: 0.026, geode: 0.034 },
  ][sch];
  if (art === 'pilz') { anteile.edel *= 1.5; anteile.geode *= 1.3; }
  const x = r();
  let p = 0;
  for (const [a, w] of Object.entries(anteile)) if (x < (p += w * (1 + tief * 0.3))) return a;
  return 'stein';
}

/** Was ein zerschlagener Stein hergibt. `n` = Ebene (0 außerhalb der Mine, etwa im Steinbruch). */
export function steinErtrag(art, n, r, bergbau, s) {
  const sch = schichtVon(Math.max(1, n));
  const items = [];
  let xp = 1;
  const bonus = () => (r() < bergbau * 0.04 ? 1 : 0);
  const erz = (id, menge) => ({ id, n: Math.max(1, Math.round(mod('erzMenge', menge, { s, id }))) });
  if (art === 'stein') {
    items.push({ id: 'stein', n: 1 + bonus() });
    if (r() < 0.04 + sch * 0.02) items.push({ id: 'kohle', n: 1 });
    if (r() < 0.02) items.push({ id: waehle(r, [['erdkristall', 'quarz'], ['traene', 'quarz'], ['feuerquarz', 'quarz']][sch]), n: 1 });
  } else if (art === 'kohle') {
    items.push({ id: 'kohle', n: ganz(r, 1, 2) + bonus() });
    xp = 3;
  } else if (art === 'kupfer') {
    items.push(erz('kupfererz', ganz(r, 1, 3) + bonus()));
    xp = 5;
  } else if (art === 'eisen') {
    items.push(erz('eisenerz', ganz(r, 1, 3) + bonus()));
    xp = 12;
  } else if (art === 'gold') {
    items.push(erz('golderz', ganz(r, 1, 3) + bonus()));
    xp = 18;
  } else if (art === 'iridium') {
    items.push(erz('iridiumerz', ganz(r, 1, 2) + bonus()));
    xp = 50;
  } else if (art === 'edel') {
    const pool = [['amethyst', 'topas', 'quarz', 'jade'], ['topas', 'aquamarin', 'smaragd', 'amethyst', 'jade'], ['rubin', 'smaragd', 'aquamarin', 'topas']][sch];
    let id = waehle(r, pool);
    if (sch === 2 && r() < 0.12) id = 'diamant';
    items.push({ id, n: 1 });
    xp = 12;
  } else if (art === 'geode') {
    items.push({ id: r() < 0.04 ? 'omnigeode' : ['geode', 'frostgeode', 'magmageode'][sch], n: 1 });
    if (r() < 0.25) items.push({ id: 'stein', n: 1 });
    xp = 8;
  }
  return { items, xp };
}

/** Glück in der Mine: Tagesglück plus Glücksringe (ringe.js setzt `mineGlueckBonus`). */
let glueckBonus = () => 0;
export function mineGlueckBonus(fn) { glueckBonus = fn; }
export const mineGlueck = (s) => L.glueck(s) + glueckBonus(s);

/** Setzt nach einem zerbrochenen Stein auf Minenebenen eine Leiter oder (tief unten, selten) ein Loch. */
function leiterWuerfeln(s, ort, kk, o, r, erg) {
  const n = ort.def.ebene;
  if (!n || n >= MINE_TIEFE || ort.def.befallen) return;
  const g = mineGlueck(s);
  if (n >= 30 && n % 10 !== 9 && n < MINE_TIEFE - 2 && !o.leiter && r() < 0.005 + Math.max(0, g) * 0.002) {
    ort.welt.objekte[kk] = { t: 'mine_loch' };
    erg.loch = true;
    return;
  }
  if (o.leiter || r() < 0.02 + g * 0.01) {
    ort.welt.objekte[kk] = { t: 'leiter' };
    erg.leiter = true;
  }
}

/** Stein zerbrechen: Ertrag geben, Erfahrung, Leiter würfeln (gemeinsam für Spitzhacke und Bomben). */
export function steinZerbrechen(s, ort, x, y, o, r, erg) {
  const kk = L.k(x, y);
  const n = ort.def.ebene || 0;
  const ertrag = steinErtrag(o.art, n, r, L.stufeWirksam(s, 'bergbau'), s);
  delete ort.welt.objekte[kk];
  for (const it of ertrag.items) L.geben(s, ort, x, y, it, erg);
  L.xpGeben(s, 'bergbau', ertrag.xp, erg);
  erg.zerbrochen = o.art;
  leiterWuerfeln(s, ort, kk, o, r, erg);
}

objektTyp('mstein', {
  blockiert: true,
  spitzhacke({ s, ort, x, y, o, erg, r, kraft }) {
    o.hp -= kraft;
    erg.treffer = 'stein';
    if (o.hp <= 0) steinZerbrechen(s, ort, x, y, o, r, erg);
    return true;
  },
});

objektTyp('leiter', { interagieren: () => mineAb(), hinweis: 'Hinabsteigen' });

objektTyp('mine_loch', {
  interagieren: () => insLoch(),
  hinweis: 'In die Tiefe springen',
});

// ─── Schatztruhen alle zehn Ebenen ──────────────────────────────────────────

/** Belohnungen der Truhen; jede Truhe gibt es einmal (`s.mine.truhen`). */
export const SCHATZ = {
  10: [{ id: 'stahlschwert', n: 1 }, { id: 'kupferbarren', n: 5 }],
  20: [{ id: 'lederstiefel', n: 1 }, { id: 'geode', n: 5 }],
  30: [{ id: 'knochenkeule', n: 1 }, { id: 'kupferring', n: 1 }],
  40: [{ id: 'kristalldolch', n: 1 }, { id: 'aquamarin', n: 2 }],
  50: [{ id: 'glueckring', n: 1 }, { id: 'eisenbarren', n: 5 }],
  60: [{ id: 'eisenklinge', n: 1 }, { id: 'frostgeode', n: 5 }],
  70: [{ id: 'wanderstiefel', n: 1 }, { id: 'smaragd', n: 2 }],
  80: [{ id: 'feuerstiefel', n: 1 }, { id: 'goldbarren', n: 5 }],
  90: [{ id: 'obsidianklinge', n: 1 }, { id: 'magmageode', n: 5 }],
  100: [{ id: 'lebensring', n: 1 }, { id: 'diamant', n: 2 }],
  110: [{ id: 'glutdolch', n: 1 }, { id: 'iridiumbarren', n: 3 }],
  120: [{ id: 'sternenklinge', n: 1 }, { id: 'omnigeode', n: 5 }, { id: 'krone', n: 1 }],
};

export function schatzOeffnen(s, ort, x, y) {
  const o = ort.welt.objekte[L.k(x, y)];
  const erg = L.neuesErgebnis();
  for (const it of SCHATZ[o.ebene] || []) if (ITEMS[it.id]) L.geben(s, ort, x, y, it, erg);
  if (!s.mine.truhen.includes(o.ebene)) s.mine.truhen.push(o.ebene);
  delete ort.welt.objekte[L.k(x, y)];
  erg.ok = true;
  return erg;
}

objektTyp('schatz', {
  blockiert: true,
  interagieren({ s, ort, x, y }) {
    const erg = schatzOeffnen(s, ort, x, y);
    ton('schatz');
    ergebnisZeigen(erg);
  },
  hinweis: 'Schatztruhe öffnen',
});

// ─── Kisten auf den Ebenen ──────────────────────────────────────────────────

/** Inhalt einer zerschlagenen Kiste (Ebene n). */
export function kistenInhalt(n, r) {
  const sch = schichtVon(n);
  const x = r();
  if (x < 0.25) return [{ id: 'kohle', n: ganz(r, 1, 3) }];
  if (x < 0.45) return [{ id: ['kupfererz', 'eisenerz', 'golderz'][sch], n: ganz(r, 2, 4) }];
  if (x < 0.58) return [{ id: ['geode', 'frostgeode', 'magmageode'][sch], n: 1 }];
  if (x < 0.66) return [{ id: 'kirschbombe', n: ganz(r, 1, 2) }];
  if (x < 0.72) return [{ id: waehle(r, ARTEFAKTE.filter((id) => ITEMS[id].fundorte.includes('mine'))), n: 1 }];
  if (x < 0.8) return [{ id: 'faser', n: ganz(r, 2, 5) }];
  return [];
}

function kisteZerschlagen({ s, ort, x, y, kk, erg, r }) {
  delete ort.welt.objekte[kk];
  const inhalt = kistenInhalt(ort.def.ebene || 1, r);
  for (const it of inhalt) if (ITEMS[it.id]) L.geben(s, ort, x, y, it, erg);
  if (!inhalt.length) erg.text = 'Nur Staub und eine sehr alte Spinne.';
  erg.treffer = 'holz';
  erg.kiste = true;
  return true;
}
objektTyp('mine_kiste', { blockiert: true, waffe: kisteZerschlagen, axt: kisteZerschlagen, spitzhacke: kisteZerschlagen, mine_dolch: kisteZerschlagen, mine_keule: kisteZerschlagen });

// ─── Generator ──────────────────────────────────────────────────────────────

/** Welche Sonderart eine Ebene hat: schatz (alle zehn), befallen, dunkel, pilz oder normal. */
export function ebenenArt(n, r) {
  if (n % 10 === 0) return 'schatz';
  if (n % 5 === 0 || n < 6) return 'normal';
  const x = r();
  if (n >= 10 && x < 0.07) return 'befallen';
  if (x < 0.15) return 'dunkel';
  if (schichtVon(n) === 2 && x < 0.3) return 'pilz';
  return 'normal';
}

function wiegen(r, liste) {
  const summe = liste.reduce((a, [, w]) => a + w, 0);
  let x = r() * summe;
  for (const [id, w] of liste) if ((x -= w) < 0) return id;
  return liste[liste.length - 1][0];
}

/** Monsterliste für Ebene n und Ebenenart. */
export function monsterAuswahl(n, art) {
  const sch = SCHICHTEN[schichtVon(n)].id;
  const liste = art === 'pilz' ? MONSTER_TABELLE.pilz : art === 'dunkel' ? MONSTER_TABELLE[`dunkel_${sch}`] : MONSTER_TABELLE[sch];
  return liste.filter(([, , ab]) => n >= ab);
}

/** Flutfüllung über begehbare Felder (ohne Objekte): Menge der erreichbaren Indizes. */
function erreichbar(g, W, H, sx, sy) {
  const ok = new Uint8Array(W * H);
  const offen = [sy * W + sx];
  ok[sy * W + sx] = 1;
  let n = 1;
  while (offen.length) {
    const i = offen.pop();
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (ok[j] || !BODEN_FREI.has(g[ny][nx])) continue;
      ok[j] = 1;
      n++;
      offen.push(j);
    }
  }
  return { ok, n };
}
const bodenZahl = (g) => g.reduce((a, z) => a + z.filter((c) => BODEN_FREI.has(c)).length, 0);

/** Malt eine Ellipse aus z auf Bodenfelder; nimmt sie zurück, wenn danach nicht mehr alles erreichbar ist. */
function flaecheVersuchen(g, W, H, start, cx, cy, rx, ry, z, schuetzen) {
  const alt = [];
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      if (!BODEN_FREI.has(g[y][x]) || schuetzen(x, y)) continue;
      alt.push([x, y, g[y][x]]);
      g[y][x] = z;
    }
  }
  if (!alt.length) return false;
  if (BODEN_FREI.has(z)) return true;
  if (erreichbar(g, W, H, start.x, start.y).n === bodenZahl(g)) return true;
  for (const [x, y, c] of alt) g[y][x] = c;
  return false;
}

/**
 * Gräbt Ebene n. `opt`: { schatzGeholt: [Ebenen mit leerer Truhe], art (erzwingen) }.
 * Ergebnis: { def, welt, start, monster }
 */
export function mineErzeugen(n, r, opt = {}) {
  if (Array.isArray(opt)) opt = { schatzGeholt: opt };
  const schatzGeholt = opt.schatzGeholt ?? [];
  const sch = schichtVon(n);
  const art = opt.art ?? ebenenArt(n, r);
  const schatz = art === 'schatz';
  const see = SEE_EBENEN.includes(n);
  const W = schatz && !see ? 28 : see ? 40 + ganz(r, 0, 4) : 30 + ganz(r, 0, 12) + sch * 2;
  const H = schatz && !see ? 22 : see ? 30 + ganz(r, 0, 3) : 22 + ganz(r, 0, 9);
  const hoehle = hoehleGraben(r, { breite: W, hoehe: H, dichte: schatz ? 0.4 : 0.44, mindestens: Math.floor(W * H * 0.32) });
  const g = hoehle.grid.map((z) => z.split(''));
  const offen = (x, y) => x >= 0 && y >= 0 && x < W && y < H && BODEN_FREI.has(g[y][x]);

  // Start: ein Feld mit viel Platz drumherum
  const platzRings = (x, y) => [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].every(([dx, dy]) => offen(x + dx, y + dy));
  const kandidaten = hoehle.flaeche.filter(([x, y]) => platzRings(x, y) && offen(x, y + 2));
  const [sx, sy] = waehle(r, kandidaten.length ? kandidaten : hoehle.flaeche);
  const start = { x: sx, y: offen(sx, sy + 1) ? sy + 1 : sy };
  const abstand = (x, y) => Math.abs(x - sx) + Math.abs(y - sy);
  const nahStart = (x, y) => abstand(x, y) <= 3;

  // Bodenbild: Kies (Erde), Eis, Moos (Pilz), dazu Lava und der See
  const flecken = (z, anzahl, rmin, rmax) => {
    for (let i = 0; i < anzahl; i++) {
      const [cx, cy] = waehle(r, hoehle.flaeche);
      flaecheVersuchen(g, W, H, start, cx, cy, rmin + r() * (rmax - rmin), rmin + r() * (rmax - rmin) * 0.7, z, () => false);
    }
  };
  if (art === 'pilz') flecken('B', 6, 2, 4.5);
  else if (sch === 0) flecken('C', 4, 1.5, 3);
  else if (sch === 1) flecken('A', 6, 2, 4);
  let seeDa = false;
  if (see) {
    for (let v = 0; v < 25 && !seeDa; v++) {
      const [cx, cy] = waehle(r, hoehle.flaeche);
      if (abstand(cx, cy) < 9) continue;
      seeDa = flaecheVersuchen(g, W, H, start, cx, cy, 4 + r() * 3, 3 + r() * 2, '~', nahStart);
    }
  }
  if (sch === 2 && art !== 'pilz') {
    let pools = 0;
    for (let v = 0; v < 30 && pools < 3 + ganz(r, 0, 2); v++) {
      const [cx, cy] = waehle(r, hoehle.flaeche);
      if (abstand(cx, cy) < 5) continue;
      if (flaecheVersuchen(g, W, H, start, cx, cy, 1 + r() * 1.6, 1 + r() * 1.2, 'z', nahStart)) pools++;
    }
  }
  // Holzbohlen unter dem Start (Leiter, Förderkorb)
  for (let y = start.y - 1; y <= start.y + 1; y++) for (let x = sx - 1; x <= sx + 1; x++) if (offen(x, y)) g[y][x] = 'D';

  const frei = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (offen(x, y)) frei.push([x, y]);

  // Deko
  const deko = [{ typ: 'leiter_auf', x: sx, y: sy, aktion: 'mine_auf', begehbar: true }];
  const dekoFeld = new Set([L.k(sx, sy)]);
  if (n % 5 === 0) {
    const plaetze = [[sx + 2, sy - 1], [sx - 2, sy - 1], [sx + 2, sy], [sx - 2, sy], [sx + 1, sy - 1], [sx - 1, sy - 1]];
    // der Korb blockiert sein Feld: nur dort, wo danach noch alles erreichbar bleibt
    const sperrtNichts = ([x, y]) => {
      const alt = g[y][x];
      g[y][x] = '#';
      const ok = erreichbar(g, W, H, start.x, start.y).n === bodenZahl(g);
      g[y][x] = alt;
      return ok;
    };
    const kand = plaetze.filter(([x, y]) => offen(x, y) && offen(x, y + 1) && (x !== start.x || y !== start.y));
    const p = kand.find((q) => !offen(q[0], q[1] - 1) && sperrtNichts(q)) || kand.find(sperrtNichts);
    if (p) { deko.push({ typ: 'aufzug', x: p[0], y: p[1], aktion: 'aufzug' }); dekoFeld.add(L.k(p[0], p[1])); }
  }
  // Wandlampen: an Wänden, unter denen Boden liegt
  const waende = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '#' && offen(x, y + 1) && g[y - 1][x] === '#') waende.push([x, y]);
  const lampen = art === 'dunkel' ? 1 : Math.max(2, Math.round(waende.length / 22));
  for (let i = 0; i < lampen && waende.length; i++) {
    const [x, y] = waende.splice(Math.floor(r() * waende.length), 1)[0];
    if (deko.some((d) => d.typ === 'wandlampe' && Math.abs(d.x - x) + Math.abs(d.y - y) < 5)) continue;
    deko.push({ typ: 'wandlampe', x, y, wand: true, licht: 3.5 });
  }
  // Kristalle (Eis) und Leuchtpilze (Pilz) als begehbare Deko am Rand
  const nische = (x, y) => [[0, 1], [1, 0], [-1, 0], [0, -1]].filter(([dx, dy]) => !offen(x + dx, y + dy)).length >= 2;
  const zierArt = art === 'pilz' ? 'mine_leuchtpilz' : sch === 1 ? 'mine_eiskristall' : sch === 2 ? 'mine_glutkristall' : 'mine_tropfstein';
  const zier = frei.filter(([x, y]) => nische(x, y) && !nahStart(x, y));
  for (let i = 0; i < Math.round(zier.length / (art === 'pilz' ? 5 : 12)) && zier.length; i++) {
    const [x, y] = zier.splice(Math.floor(r() * zier.length), 1)[0];
    const d = { typ: zierArt, x, y, begehbar: true, v: ganz(r, 0, 3) };
    if (zierArt === 'mine_leuchtpilz' || zierArt === 'mine_glutkristall') d.licht = 1.6;
    deko.push(d);
    dekoFeld.add(L.k(x, y));
  }

  // Gestein
  const objekte = {};
  const steine = [];
  const dichte = schatz ? 0.08 : art === 'befallen' ? 0.07 : 0.17 + Math.min(0.08, n * 0.0008) + (art === 'pilz' ? 0.03 : 0);
  for (const [x, y] of frei) {
    if (nahStart(x, y) || dekoFeld.has(L.k(x, y)) || g[y][x] === 'D') continue;
    if (r() < dichte) {
      const a = steinArt(n, r, art);
      const o = { t: 'mstein', art: a, hp: STEINARTEN[a].hp[sch], v: ganz(r, 0, 3) };
      objekte[L.k(x, y)] = o;
      steine.push([x, y, o]);
    }
  }
  // Leiter: unter einem fernen Stein, auf Truhenebenen offen sichtbar, auf befallenen erst nach dem Kampf
  let leiterFeld = null;
  if (n < MINE_TIEFE) {
    const fern = (liste, d) => liste.filter(([x, y]) => abstand(x, y) >= d);
    if (schatz || art === 'befallen') {
      const kand = fern(frei.filter(([x, y]) => !objekte[L.k(x, y)] && !dekoFeld.has(L.k(x, y)) && platzRings(x, y)), 6);
      const [x, y] = waehle(r, kand.length ? kand : fern(frei.filter(([x2, y2]) => !objekte[L.k(x2, y2)] && !dekoFeld.has(L.k(x2, y2))), 3));
      leiterFeld = { x, y };
      if (schatz) objekte[L.k(x, y)] = { t: 'leiter' };
    } else if (steine.length) {
      const kand = fern(steine, 7);
      const [, , o] = waehle(r, kand.length ? kand : steine);
      o.leiter = true;
    }
  }
  // Schatztruhe auf jeder zehnten Ebene
  if (SCHATZ[n] && !schatzGeholt.includes(n)) {
    const kand = frei.filter(([x, y]) => !objekte[L.k(x, y)] && !dekoFeld.has(L.k(x, y)) && abstand(x, y) >= 4 && offen(x, y + 1) && platzRings(x, y));
    const liste = kand.length ? kand : frei.filter(([x, y]) => !objekte[L.k(x, y)] && !dekoFeld.has(L.k(x, y)) && abstand(x, y) >= 3);
    if (liste.length) {
      // die Truhe möglichst mittig zwischen Start und Leiter
      liste.sort((a, b) => Math.abs(abstand(a[0], a[1]) - 7) - Math.abs(abstand(b[0], b[1]) - 7));
      const [x, y] = liste[Math.floor(r() * Math.min(6, liste.length))];
      objekte[L.k(x, y)] = { t: 'schatz', ebene: n };
    }
  }
  // Kisten in Nischen
  if (!schatz) {
    const nischen = frei.filter(([x, y]) => nische(x, y) && !objekte[L.k(x, y)] && !dekoFeld.has(L.k(x, y)) && abstand(x, y) >= 4);
    for (let i = ganz(r, 0, 2); i > 0 && nischen.length; i--) {
      const [x, y] = nischen.splice(Math.floor(r() * nischen.length), 1)[0];
      objekte[L.k(x, y)] = { t: 'mine_kiste', v: ganz(r, 0, 1) };
    }
  }
  // Würmer im Boden (Artefaktstelle), selten
  if (r() < 0.12) {
    const kand = frei.filter(([x, y]) => !objekte[L.k(x, y)] && !dekoFeld.has(L.k(x, y)) && abstand(x, y) >= 3);
    if (kand.length) { const [x, y] = waehle(r, kand); objekte[L.k(x, y)] = { t: 'mine_artefaktstelle', ort: 'mine' }; }
  }

  // Monster
  const liste = [];
  if (!schatz || see) {
    const auswahl = monsterAuswahl(n, art);
    let anzahl = Math.min(3 + Math.floor(n / 7), 14);
    if (art === 'befallen') anzahl = Math.round(anzahl * 2.5) + 4;
    if (schatz) anzahl = 2;
    const platz = frei.filter(([x, y]) => !objekte[L.k(x, y)] && !dekoFeld.has(L.k(x, y)) && abstand(x, y) >= 6);
    for (let i = 0; i < anzahl && platz.length && auswahl.length; i++) {
      const [x, y] = platz.splice(Math.floor(r() * platz.length), 1)[0];
      let typ = wiegen(r, auswahl);
      if (MONSTER[typ].fliegt && n < 3) typ = auswahl[0][0];
      liste.push(neuesMonster(typ, x, y, r));
    }
  }

  const s0 = SCHICHTEN[sch];
  const zusatz = { befallen: 'befallen', dunkel: 'dunkel', pilz: 'Pilzhöhle', schatz: 'Schatzkammer' }[art];
  const def = karteVorbereiten({
    id: `mine${n}`, name: `Mine · Ebene ${n}${art === 'pilz' || art === 'schatz' ? ` · ${zusatz}` : ''}`,
    grid: g.map((z) => z.join('')), aussen: false, innen: 'mine', rand: 'mine', npcWege: false,
    ebene: n, schicht: sch, band: art === 'pilz' ? 3 : sch, art,
    dunkel: art === 'dunkel' ? 0.82 : schatz ? s0.dunkel - 0.08 : s0.dunkel,
    befallen: art === 'befallen', leiterFeld,
    wasser: seeDa ? 'mine' : undefined,
    deko,
    punkte: { start: [start.x, start.y, 'unten'] },
  });
  return { def, welt: { objekte, felder: {}, funde: [] }, start, monster: liste };
}

export const mineEbeneVon = (id) => (/^mine\d+$/.test(id) ? Number(id.slice(4)) : 0);

kartenAnbieter((id) => mineEbeneVon(id) >= 1 && mineEbeneVon(id) <= MINE_TIEFE, (id, s) => {
  const gen = mineErzeugen(mineEbeneVon(id), zufall(Math.floor(Math.random() * 2 ** 31)), { schatzGeholt: s?.mine?.truhen ?? [] });
  return { ...gen.def, fluechtig: true, weltStart: gen.welt, monsterStart: gen.monster, speicherOrt: { karte: 'mine0', punkt: 'leiter' } };
});

// ─── Wege durch die Mine ────────────────────────────────────────────────────

export function mineAb(tiefer = 1) {
  const n = Math.min(MINE_TIEFE, S.mineEbene + tiefer);
  if (n <= S.mineEbene) return;
  ton('leiter');
  wechseln(`mine${n}`);
}
export function mineAuf() {
  ton('leiter');
  wechselnZu({ karte: 'mine0', punkt: 'leiter' });
}
/** Förderkorb: 0 ist der Eingang, sonst die Ebene. */
export function aufzugFahren(n) {
  if (n === 0) wechselnZu({ karte: 'mine0', punkt: 'leiter' });
  else wechseln(`mine${n}`);
}
/** Durchs Loch: zwei bis drei Ebenen tiefer, unsanft gelandet. */
function insLoch() {
  const s = S.s;
  const tiefer = 2 + (Math.random() < 0.4 ? 1 : 0);
  const schaden = Math.min(s.spieler.hp - 1, 4 * tiefer);
  if (schaden > 0) {
    s.spieler.hp -= schaden;
    schwebeText(`-${schaden}`, S.sp.x, S.sp.y - 26, '#ff7a6a');
  }
  meldung(`Uff! Du fällst ${tiefer} Ebenen tief.`, 'warn');
  mineAb(tiefer);
}

export const freiesFeld = (ort, x, y) => {
  const z = ort.def.grid[y]?.[x];
  return BODEN_FREI.has(z) && !ort.welt.objekte[L.k(x, y)];
};
export { T };
