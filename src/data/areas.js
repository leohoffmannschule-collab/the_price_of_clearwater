// Schauplätze. Jede Karte ist als lesbares Raster geschrieben:
//   #  Wand / undurchdringlich      .  freier Boden
//   ,  schwieriges Gelände          ~  Wasser
//   =  Deckung (halbhoch)
// Alles andere ist Kulisse und wird über props gesetzt.

import { makeRng } from '../engine/rng.js';

// B = Gebäude: blockiert wie eine Wand, wird aber nicht als Mauerblock gezeichnet
// (darüber steht ein Haus-, Kapellen- oder Mühlen-Modell).
const LEGEND = { '#': 1, '.': 0, ',': 2, '~': 3, '=': 5, 'B': 6, ' ': 0 };

export function defineArea(def) {
  const rows = def.grid;
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const tiles = new Array(w * h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] ?? '#';
      tiles[y * w + x] = LEGEND[ch] ?? 0;
    }
  }
  const area = {
    ...def, w, h, tiles,
    seed: def.seed ?? hashString(def.id),
    props: def.props || [],
    punkte: def.punkte || [],
    spawns: def.spawns || { party: [{ x: 2, y: 2 }] },
  };
  // Aus jedem zusammenhängenden B-Grundriss wird genau ein Haus gebaut,
  // damit Modell und Kollision immer deckungsgleich sind.
  if (!def.keineAutoHaeuser) area.props = gebaeudeAusGrundriss(area).concat(area.props);
  return area;
}

/** Zusammenhängende Gebäudeflächen finden und passende Häuser setzen. */
function gebaeudeAusGrundriss(area) {
  const gesehen = new Set();
  const haeuser = [];
  const rng = makeRng(area.seed ^ 0x9e37);
  const wandFarben = ['#b8a888', '#c0b090', '#ab9b7c', '#c8b898'];
  const dachFarben = ['#5a6a74', '#4e5e6a', '#63717c', '#556672'];

  for (let y = 0; y < area.h; y++) {
    for (let x = 0; x < area.w; x++) {
      const i = y * area.w + x;
      if (area.tiles[i] !== 6 || gesehen.has(i)) continue;
      // Flutfüllung über die Gebäudefläche
      const stapel = [i];
      const feld = [];
      gesehen.add(i);
      while (stapel.length) {
        const k = stapel.pop();
        feld.push(k);
        const kx = k % area.w; const ky = Math.floor(k / area.w);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = kx + dx; const ny = ky + dy;
          if (nx < 0 || ny < 0 || nx >= area.w || ny >= area.h) continue;
          const ni = ny * area.w + nx;
          if (area.tiles[ni] !== 6 || gesehen.has(ni)) continue;
          gesehen.add(ni);
          stapel.push(ni);
        }
      }
      const xs = feld.map((k) => k % area.w);
      const ys = feld.map((k) => Math.floor(k / area.w));
      const x0 = Math.min(...xs); const x1 = Math.max(...xs);
      const y0 = Math.min(...ys); const y1 = Math.max(...ys);
      const breite = x1 - x0 + 1; const tiefe = y1 - y0 + 1;
      const idx = Math.floor(rng() * 4);
      haeuser.push({
        type: 'haus',
        x: (x0 + x1) / 2, y: (y0 + y1) / 2,
        opts: {
          w: breite * 0.97, d: tiefe * 0.97,
          h: 1.9 + rng() * 0.6,
          wand: wandFarben[idx], dach: dachFarben[idx],
          licht: rng() < 0.45,
        },
      });
    }
  }
  return haeuser;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Bäume/Felsen zufällig, aber reproduzierbar auf freie Randfelder streuen. */
function streue(area, typ, anzahl, seed, opts = {}) {
  const rng = makeRng(seed);
  const out = [];
  let versuche = 0;
  while (out.length < anzahl && versuche++ < anzahl * 40) {
    const x = Math.floor(rng() * area.w);
    const y = Math.floor(rng() * area.h);
    const t = area.tiles[y * area.w + x];
    if (t !== 1) continue;
    if (out.some((p) => Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 2)) continue;
    out.push({ type: typ, x, y, rot: rng() * 6, opts: { ...opts, h: opts.h ?? (3 + rng() * 3) } });
  }
  return out;
}

/* ═══════════════════════════ AKT I — PROLOG ═══════════════════════════ */

export const AREAS = {};

function add(def) {
  const a = defineArea(def);
  if (def.streuen) for (const s of def.streuen) a.props = a.props.concat(streue(a, s.typ, s.n, a.seed + (s.o || 0), s.opts));
  AREAS[a.id] = a;
  return a;
}

add({
  id: 'taverne', name: 'Zum Krummen Nagel', untertitel: 'Irgendwo vor Klarwasser', theme: 'dorf_nacht',
  wandHoehe: 3.2,
  grid: [
    '####################',
    '#..................#',
    '#..................#',
    '#....====..........#',
    '#..................#',
    '#..........===.....#',
    '#..................#',
    '#...===............#',
    '#..................#',
    '#..................#',
    '#........####......#',
    '#........#..#......#',
    '##########..########',
  ],
  props: [
    { type: 'tisch', x: 5, y: 3 }, { type: 'tisch', x: 11, y: 5 }, { type: 'tisch', x: 4, y: 7 },
    { type: 'fass', x: 16, y: 2 }, { type: 'fass', x: 17, y: 3 }, { type: 'kiste', x: 2, y: 9 },
    { type: 'kerze', x: 5, y: 2, h: 0.85 }, { type: 'kerze', x: 11, y: 4, h: 0.85 },
    { type: 'lagerfeuer', x: 17, y: 10 },
  ],
  spawns: { party: [{ x: 10, y: 11 }, { x: 11, y: 11 }, { x: 10, y: 9 }] },
  punkte: [
    { id: 'wirt', x: 15, y: 6, label: 'Der Wirt', typ: 'gespraech', dialog: 'prolog_wirt' },
    { id: 'beutel', x: 5, y: 2, label: 'Ein unbeaufsichtigter Beutel', typ: 'untersuchen', event: 'prolog_diebstahl' },
    { id: 'laute', x: 11, y: 4, label: 'Eine Laute an der Wand', typ: 'untersuchen', event: 'prolog_laute' },
    { id: 'raus', x: 10, y: 11, label: 'Hinaus in die Nacht', typ: 'ausgang', ziel: 'waldweg', event: 'prolog_rauswurf' },
  ],
});

add({
  id: 'waldweg', name: 'Der Waldweg', untertitel: 'Kiefernwald, Silberkamm', theme: 'wald',
  wandHoehe: 0.9,
  grid: [
    '####################################',
    '###..............................###',
    '##................................##',
    '#..................................#',
    '#....,,,...........................#',
    '#....,,,.........,,,,..............#',
    '#................,,,,..............#',
    '#..................................#',
    '##.............,,,.................#',
    '###............,,,...............###',
    '####...........................#####',
    '####################################',
  ],
  streuen: [{ typ: 'baum', n: 26, o: 3, opts: { laub: '#33502e' } }, { typ: 'fels', n: 7, o: 9 }],
  props: [{ type: 'lagerfeuer', x: 30, y: 5 }],
  spawns: { party: [{ x: 3, y: 5 }, { x: 3, y: 6 }, { x: 2, y: 5 }] },
  punkte: [
    { id: 'woelfe', x: 17, y: 5, label: 'Etwas bewegt sich im Unterholz', typ: 'kampf', event: 'prolog_woelfe' },
    { id: 'katze', x: 24, y: 7, label: 'Eine Katze sitzt am Weg', typ: 'gespraech', dialog: 'prolog_katze', nach: 'prolog_woelfe' },
    { id: 'rast', x: 30, y: 5, label: 'Rast am Feuer', typ: 'untersuchen', event: 'prolog_rast', nach: 'prolog_woelfe' },
    { id: 'weiter', x: 34, y: 5, label: 'Weiter zur Weggabelung', typ: 'ausgang', ziel: 'weggabelung', nach: 'prolog_woelfe' },
  ],
});

add({
  id: 'weggabelung', name: 'Die Weggabelung', untertitel: 'Ein alter Wegequell', theme: 'wald',
  wandHoehe: 0.9,
  grid: [
    '##############################',
    '###........................###',
    '##..........................##',
    '#............................#',
    '#....,,,.........,,,.........#',
    '#............................#',
    '#............................#',
    '#....,,,,....................#',
    '##...........................#',
    '###........................###',
    '##############################',
  ],
  streuen: [{ typ: 'baum', n: 18, o: 5, opts: { laub: '#2e4a2a' } }, { typ: 'fels', n: 5, o: 11 }],
  props: [
    { type: 'brunnen', x: 14, y: 5, opts: { stein: '#a8a090', wasser: '#7ab0c0' } },
    { type: 'fels', x: 11, y: 4, opts: { s: 0.5 } },
    { type: 'fels', x: 17, y: 4, opts: { s: 0.5 } },
    { type: 'fels', x: 14, y: 3, opts: { s: 0.5 } },
  ],
  spawns: { party: [{ x: 3, y: 5 }, { x: 3, y: 6 }, { x: 2, y: 5 }] },
  punkte: [
    { id: 'wegequell', x: 14, y: 5, label: 'Der Wegequell — drei Dinge liegen darin', typ: 'gespraech', dialog: 'prolog_wahl' },
    { id: 'stab_liegt', x: 11, y: 4, label: 'Ein Stab aus weißem Kieselstein', typ: 'untersuchen', event: 'schau_stab' },
    { id: 'rolle_liegt', x: 17, y: 4, label: 'Eine Pergamentrolle mit drei Siegeln', typ: 'untersuchen', event: 'schau_rolle' },
    { id: 'buch_liegt', x: 14, y: 3, label: 'Ein schwarz gebundenes Buch', typ: 'untersuchen', event: 'schau_buch' },
    { id: 'weiter_gob', x: 28, y: 5, label: 'Rauch über den Bäumen — dem Feuerschein nach', typ: 'ausgang', ziel: 'goblinlager', nach: 'wahl_getroffen' },
    { id: 'zurueck_spaet', x: 1, y: 5, label: 'Zurück nach Klarwasser', typ: 'ausgang', ziel: 'dorfeingang', nur: 'rueckkehr_weggabelung' },
  ],
});

add({
  id: 'goblinlager', name: 'Das Goblinlager', untertitel: 'Eine Senke im Kiefernwald', theme: 'wald',
  wandHoehe: 1.2,
  grid: [
    '##############################',
    '###........................###',
    '##.......,,,,,,,,,..........##',
    '#........,.......,...........#',
    '#........,.......,...........#',
    '#........,.......,...........#',
    '#........,,,,,,,,,...........#',
    '##...........................#',
    '###........................###',
    '##############################',
  ],
  streuen: [{ typ: 'baum', n: 14, o: 7 }],
  props: [
    { type: 'lagerfeuer', x: 13, y: 4 },
    { type: 'kiste', x: 10, y: 3 }, { type: 'kiste', x: 16, y: 6 }, { type: 'fass', x: 17, y: 3 },
    { type: 'fels', x: 20, y: 4, opts: { s: 1.3 } },
  ],
  spawns: { party: [{ x: 3, y: 4 }, { x: 3, y: 5 }, { x: 2, y: 4 }] },
  punkte: [
    { id: 'goblins', x: 12, y: 4, label: 'Das Lager', typ: 'kampf', event: 'prolog_goblins' },
    { id: 'gefangener', x: 20, y: 4, label: 'Etwas Großes liegt in abyssalen Ketten', typ: 'gespraech', dialog: 'prolog_ghortan_ketten', nach: 'prolog_goblins' },
    { id: 'weiter_licht', x: 28, y: 4, label: 'Weiter zur Lichtung', typ: 'ausgang', ziel: 'lichtung', nach: 'ghortan_befreit' },
  ],
});

add({
  id: 'lichtung', name: 'Die Lichtung', untertitel: 'Letzte Nacht vor Klarwasser', theme: 'wald',
  wandHoehe: 0.9,
  grid: [
    '########################',
    '###..................###',
    '##....................##',
    '#......................#',
    '#......................#',
    '#......................#',
    '##....................##',
    '###..................###',
    '########################',
  ],
  streuen: [{ typ: 'baum', n: 16, o: 13 }],
  props: [{ type: 'lagerfeuer', x: 11, y: 4 }],
  spawns: { party: [{ x: 8, y: 4 }, { x: 8, y: 5 }, { x: 7, y: 4 }] },
  punkte: [
    { id: 'feuer_gespraech', x: 11, y: 4, label: 'Ghortan sitzt am Feuer', typ: 'gespraech', dialog: 'prolog_lagerfeuer' },
    { id: 'nach_klarwasser', x: 22, y: 4, label: 'Nach Klarwasser', typ: 'ausgang', ziel: 'dorfeingang', nach: 'lagerfeuer_gesprochen' },
  ],
});

/* ═══════════════════════════ AKT I — KLARWASSER ═══════════════════════════ */

add({
  id: 'dorfeingang', name: 'Klarwasser — Ortseingang', untertitel: 'Später Nachmittag, Erntefest', theme: 'dorf',
  pflaster: true, wandHoehe: 2.2,
  grid: [
    '##############################',
    '##..........................##',
    '#...BBB...BBBB.....BBB.......#',
    '#...BBB...BBBB.....BBB.......#',
    '#...BBB............BBB.......#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#.....BBBB....BBB....BBBB....#',
    '#.....BBBB....BBB....BBBB....#',
    '#.............BBB............#',
    '##..........................##',
    '##############################',
  ],
  props: [
    { type: 'brunnen', x: 14, y: 6 },
    { type: 'wimpelkette', x: 14, y: 2, h: 0 },
    { type: 'wimpelkette', x: 14, y: 10, h: 0 },
    { type: 'baum', x: 27, y: 2, opts: { h: 5 } },
    { type: 'baum', x: 2, y: 10, opts: { h: 4.5 } },
  ],
  spawns: { party: [{ x: 2, y: 6 }, { x: 2, y: 7 }, { x: 3, y: 6 }] },
  punkte: [
    { id: 'hesse_brunnen', x: 14, y: 6, label: 'Eine Frau in grauem Habit', typ: 'gespraech', dialog: 'hesse_brunnen' },
    { id: 'trinken', x: 13, y: 6, label: 'Aus dem Brunnen trinken', typ: 'untersuchen', event: 'brunnen_trinken' },
    { id: 'zum_markt', x: 28, y: 6, label: 'Zum Marktplatz — das Fest ist im Gange', typ: 'ausgang', ziel: 'marktplatz' },
    { id: 'zur_weggabelung', x: 1, y: 6, label: 'Zurück zur Weggabelung (zwei Tagesmärsche)', typ: 'ausgang', ziel: 'weggabelung', event: 'reise_weggabelung', nach: 'ankunft_erledigt' },
  ],
});

add({
  id: 'marktplatz', name: 'Der Marktplatz', untertitel: 'Erntefest', theme: 'dorf',
  pflaster: true, wandHoehe: 2.6,
  grid: [
    '##################################',
    '##..............................##',
    '#..BBB....BBBB.......BBB...BBBB..#',
    '#..BBB....BBBB.......BBB...BBBB..#',
    '#..BBB...............BBB.........#',
    '#................................#',
    '#................................#',
    '#................................#',
    '#................................#',
    '#..BBBB.....BBB......BBBB..BBB...#',
    '#..BBBB.....BBB......BBBB..BBB...#',
    '#...........BBB............BBB...#',
    '##..............................##',
    '##################################',
  ],
  props: [
    { type: 'marktstand', x: 8, y: 6, opts: { farbe: '#a84838' } },
    { type: 'marktstand', x: 12, y: 8, opts: { farbe: '#3a6a5a' } },
    { type: 'marktstand', x: 22, y: 6, opts: { farbe: '#8a4a70' } },
    { type: 'lagerfeuer', x: 17, y: 6 },
    { type: 'tisch', x: 19, y: 9 }, { type: 'tisch', x: 21, y: 10 }, { type: 'tisch', x: 14, y: 4 },
    { type: 'fass', x: 6, y: 11 }, { type: 'fass', x: 7, y: 11 },
    { type: 'wimpelkette', x: 17, y: 2 }, { type: 'wimpelkette', x: 17, y: 11 },
    { type: 'gruenderstein', x: 16, y: 7 }, { type: 'gruenderstein', x: 18, y: 7 },
    { type: 'gruenderstein', x: 17, y: 8 }, { type: 'gruenderstein', x: 15, y: 8 },
  ],
  spawns: { party: [{ x: 2, y: 6 }, { x: 2, y: 7 }, { x: 3, y: 6 }] },
  punkte: [
    { id: 'nella_kiesel', x: 10, y: 7, label: 'Ein Mädchen mit dreißig Kieseln', typ: 'gespraech', dialog: 'nella_kiesel' },
    { id: 'auftritt', x: 17, y: 6, label: 'Auftreten — die Bühne ist frei', typ: 'gespraech', dialog: 'fest_auftritt' },
    { id: 'wolfsfleisch', x: 19, y: 9, label: 'Das Wolfsfleisch abgeben', typ: 'untersuchen', event: 'fest_fleisch' },
    { id: 'kaspar_fest', x: 24, y: 4, label: 'Ein Alter ruft etwas über Zahlen', typ: 'gespraech', dialog: 'kaspar_fest' },
    { id: 'tobrek_rede', x: 21, y: 10, label: 'Der Bürgermeister hält eine Rede', typ: 'gespraech', dialog: 'tobrek_rede' },
    { id: 'perrick', x: 6, y: 10, label: 'Ein sehnig-dünner Händler', typ: 'gespraech', dialog: 'perrick', nur: 'perrick_da' },
    { id: 'gruendersteine_markt', x: 17, y: 7, label: 'Elf Steine aus anderem Material', typ: 'untersuchen', event: 'steine_untersuchen' },
    { id: 'zum_gasthaus', x: 32, y: 6, label: 'Zum Gasthaus „Zum Nassen Hut“', typ: 'ausgang', ziel: 'nasser_hut' },
    { id: 'zur_kapelle', x: 17, y: 1, label: 'Zur Kapelle der Morgenmutter', typ: 'ausgang', ziel: 'kapelle' },
    { id: 'zur_muehle', x: 17, y: 12, label: 'Zur Vahl-Mühle', typ: 'ausgang', ziel: 'muehle' },
    { id: 'zum_eingang', x: 1, y: 6, label: 'Zurück zum Ortseingang', typ: 'ausgang', ziel: 'dorfeingang' },
    { id: 'zu_kaspar', x: 32, y: 2, label: 'Den Hang hinauf zu Kaspars Hütte', typ: 'ausgang', ziel: 'kaspars_huette', nach: 'ermittlung_offen' },
  ],
});

add({
  id: 'nasser_hut', name: 'Zum Nassen Hut', untertitel: 'Neun Tische, acht benutzt', theme: 'dorf_nacht',
  wandHoehe: 3.4,
  grid: [
    '########################',
    '#......................#',
    '#..====.......====.....#',
    '#......................#',
    '#..====.......====.....#',
    '#......................#',
    '#..====.......====.....#',
    '#......................#',
    '#..................=...#',
    '#......................#',
    '##########....##########',
  ],
  props: [
    { type: 'tisch', x: 4, y: 2 }, { type: 'tisch', x: 14, y: 2 },
    { type: 'tisch', x: 4, y: 4 }, { type: 'tisch', x: 14, y: 4 },
    { type: 'tisch', x: 4, y: 6 }, { type: 'tisch', x: 14, y: 6 },
    { type: 'tisch', x: 19, y: 8 },
    { type: 'fass', x: 21, y: 1 }, { type: 'fass', x: 21, y: 2 }, { type: 'kiste', x: 2, y: 9 },
    { type: 'lagerfeuer', x: 11, y: 1 },
    { type: 'kerze', x: 4, y: 1, h: 0.9 }, { type: 'kerze', x: 14, y: 3, h: 0.9 },
  ],
  spawns: { party: [{ x: 11, y: 9 }, { x: 12, y: 9 }, { x: 10, y: 9 }] },
  punkte: [
    { id: 'grust', x: 18, y: 4, label: 'Grust, der Wirt', typ: 'gespraech', dialog: 'grust_tresen' },
    { id: 'neunter_tisch', x: 19, y: 8, label: 'Der neunte Tisch — sauber gewischt, ein kleiner Stuhl', typ: 'untersuchen', event: 'neunter_tisch' },
    { id: 'sarine', x: 3, y: 2, label: 'Eine Fremde, die schreibt', typ: 'gespraech', dialog: 'sarine_erstes' },
    { id: 'alte', x: 14, y: 6, label: 'Der Tisch der Alten', typ: 'gespraech', dialog: 'tisch_der_alten' },
    { id: 'ghortan_feuer', x: 11, y: 2, label: 'Ghortan am Feuer', typ: 'gespraech', dialog: 'ghortan_gespraech' },
    { id: 'rasten', x: 2, y: 7, label: 'Ein Zimmer nehmen (Lange Rast)', typ: 'untersuchen', event: 'lange_rast' },
    { id: 'raus_hut', x: 11, y: 10, label: 'Hinaus auf den Marktplatz', typ: 'ausgang', ziel: 'marktplatz' },
  ],
});

add({
  id: 'kapelle', name: 'Kapelle der Morgenmutter', untertitel: 'Im Chorraum liegt das Register offen', theme: 'keller',
  wandHoehe: 5.5,
  grid: [
    '####################',
    '#..................#',
    '#..==....==....==..#',
    '#..................#',
    '#..==....==....==..#',
    '#..................#',
    '#..==....==....==..#',
    '#..................#',
    '#........==........#',
    '#..................#',
    '##########..########',
  ],
  props: [
    { type: 'kerze', x: 4, y: 2, h: 0.9 }, { type: 'kerze', x: 15, y: 2, h: 0.9 },
    { type: 'kerze', x: 4, y: 6, h: 0.9 }, { type: 'kerze', x: 15, y: 6, h: 0.9 },
    { type: 'kerze', x: 9, y: 1, h: 1.2 }, { type: 'kerze', x: 10, y: 1, h: 1.2 },
    { type: 'tisch', x: 9, y: 2 },
  ],
  spawns: { party: [{ x: 10, y: 9 }, { x: 9, y: 9 }, { x: 11, y: 9 }] },
  punkte: [
    { id: 'register', x: 9, y: 2, label: 'Das Kirchenregister, offen', typ: 'untersuchen', event: 'register' },
    { id: 'hesse_kapelle', x: 12, y: 3, label: 'Mutter Hesse', typ: 'gespraech', dialog: 'hesse_kapelle' },
    { id: 'kiesel_schale', x: 6, y: 2, label: 'Elf Kiesel in einer Schale, nach Gewicht sortiert', typ: 'untersuchen', event: 'kiesel_schale' },
    { id: 'glocke_pruefen', x: 3, y: 1, label: 'Die Glocke von 1042', typ: 'untersuchen', event: 'glocke' },
    { id: 'raus_kapelle', x: 10, y: 10, label: 'Hinaus', typ: 'ausgang', ziel: 'marktplatz' },
  ],
});

add({
  id: 'kaspars_huette', name: 'Kaspars Hütte', untertitel: 'Am Hang, außerhalb der Glockenreichweite', theme: 'dorf_nacht',
  wandHoehe: 2.8,
  grid: [
    '################',
    '#..............#',
    '#..............#',
    '#....=====.....#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#######..#######',
  ],
  props: [
    { type: 'tisch', x: 7, y: 3 }, { type: 'fass', x: 2, y: 5 },
    { type: 'kerze', x: 7, y: 2, h: 0.9 }, { type: 'kiste', x: 13, y: 1 },
  ],
  spawns: { party: [{ x: 7, y: 6 }, { x: 8, y: 6 }, { x: 6, y: 6 }] },
  punkte: [
    { id: 'kaspar', x: 7, y: 3, label: 'Der alte Kaspar', typ: 'gespraech', dialog: 'kaspar_huette' },
    { id: 'kerben', x: 2, y: 2, label: '187 Kerben in Elfergruppen', typ: 'untersuchen', event: 'kerben' },
    { id: 'raus_kaspar', x: 7, y: 7, label: 'Den Hang hinunter', typ: 'ausgang', ziel: 'marktplatz' },
  ],
});

add({
  id: 'muehle', name: 'Die Vahl-Mühle', untertitel: 'Wohnhaus und Kontor', theme: 'dorf',
  wandHoehe: 3.0,
  grid: [
    '##########################',
    '#........................#',
    '#...####.......=====.....#',
    '#...####.................#',
    '#........................#',
    '#..............,,,,,,....#',
    '#..............,,~~,,....#',
    '#...####.......,,~~,,....#',
    '#...####.......,,,,,,....#',
    '#........................#',
    '############..############',
  ],
  props: [
    { type: 'muehle', x: 5, y: 2 },
    { type: 'tisch', x: 16, y: 2 },
    { type: 'kiste', x: 20, y: 8 }, { type: 'fass', x: 22, y: 4 },
    { type: 'baum', x: 2, y: 9, opts: { h: 4 } },
  ],
  spawns: { party: [{ x: 12, y: 9 }, { x: 13, y: 9 }, { x: 11, y: 9 }] },
  punkte: [
    { id: 'tobrek', x: 16, y: 2, label: 'Bürgermeister Tobrek Vahl', typ: 'gespraech', dialog: 'tobrek_kontor' },
    { id: 'dritte_diele', x: 18, y: 3, label: 'Die dritte Diele liegt anders als die anderen', typ: 'untersuchen', event: 'dritte_diele' },
    { id: 'nella_fasswagen', x: 21, y: 6, label: 'Nella wartet mit einem gepackten Beutel', typ: 'gespraech', dialog: 'nella_fasswagen', nur: 'nella_wartet' },
    { id: 'kellerluke', x: 17, y: 6, label: 'Eine Luke in den überfluteten Altkeller', typ: 'ausgang', ziel: 'muehlkeller', nur: 'kellerschluessel' },
    { id: 'raus_muehle', x: 12, y: 10, label: 'Zurück zum Marktplatz', typ: 'ausgang', ziel: 'marktplatz' },
  ],
});

add({
  id: 'muehlkeller', name: 'Die überfluteten Mühlkeller', untertitel: 'Kniehoch. Sicht drei Meter.', theme: 'keller',
  wandHoehe: 2.4,
  grid: [
    '##############################',
    '#~~~~~~~..........~~~~~~~~~~~#',
    '#~~~~~~~..........~~~~~~~~~~~#',
    '#~~~~..................~~~~~~#',
    '#~~~~...####....####...~~~~~~#',
    '#~~.....####....####......~~~#',
    '#~~....................~~~~~~#',
    '#~~~~~~~.........~~~~~~~~~~~~#',
    '#~~~~~~~.........~~~~~~~~~~~~#',
    '##############################',
  ],
  props: [
    { type: 'fass', x: 6, y: 3 }, { type: 'kiste', x: 22, y: 6 }, { type: 'fass', x: 24, y: 2 },
    { type: 'kerze', x: 3, y: 1, h: 1.4, opts: { licht: true } },
  ],
  spawns: { party: [{ x: 2, y: 5 }, { x: 2, y: 6 }, { x: 3, y: 5 }] },
  punkte: [
    { id: 'kellerkampf', x: 14, y: 5, label: 'Etwas bewegt sich im trüben Wasser', typ: 'kampf', event: 'kellerkampf' },
    { id: 'kritzeleien', x: 9, y: 4, label: 'Kritzeleien an der Wand, kindshoch', typ: 'untersuchen', event: 'kritzeleien', nach: 'kellerkampf' },
    { id: 'zaehlperlen', x: 22, y: 6, label: 'Etwas Glänzendes im Schlamm', typ: 'untersuchen', event: 'zaehlperlen', nach: 'kellerkampf' },
    { id: 'brunnenschacht', x: 27, y: 5, label: 'Die Verbindung zum Brunnenschacht', typ: 'ausgang', ziel: 'schacht', nach: 'kellerkampf' },
    { id: 'raus_keller', x: 1, y: 5, label: 'Zurück nach oben', typ: 'ausgang', ziel: 'muehle' },
  ],
});

add({
  id: 'schacht', name: 'Der Brunnenschacht', untertitel: 'Hinter der zugemauerten Wand', theme: 'keller',
  wandHoehe: 4.0,
  grid: [
    '####################',
    '#..................#',
    '#....####..####....#',
    '#....####..####....#',
    '#..................#',
    '#..................#',
    '#....####..####....#',
    '#....####..####....#',
    '#..................#',
    '#########..#########',
  ],
  props: [
    { type: 'steintuer', x: 10, y: 1, rot: 0 },
    { type: 'kerze', x: 4, y: 4, h: 0.9 }, { type: 'kerze', x: 15, y: 4, h: 0.9 },
    { type: 'fels', x: 3, y: 8, opts: { s: 0.7 } },
  ],
  spawns: { party: [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 11, y: 8 }] },
  punkte: [
    { id: 'steintuer', x: 10, y: 2, label: 'Eine Steintür mit elf Runen', typ: 'gespraech', dialog: 'steintuer' },
    { id: 'sarine_schacht', x: 5, y: 5, label: 'Sarine Umbrecht, mit einer Bleiröhre', typ: 'gespraech', dialog: 'sarine_schacht', nur: 'spiegelhof_besucht' },
    { id: 'raus_schacht', x: 10, y: 9, label: 'Zurück in die Keller', typ: 'ausgang', ziel: 'muehlkeller' },
  ],
});

add({
  id: 'spiegelhof', name: 'Der Spiegelhof', untertitel: 'Ein See, der über euch hängt', theme: 'spiegelhof',
  wandHoehe: 1.6,
  grid: [
    '################################',
    '#..............................#',
    '#..#..#..#..#..................#',
    '#..............................#',
    '#..#..#..#..#........,,,,,.....#',
    '#....................,,,,,.....#',
    '#..#..#..#..#........,,,,,.....#',
    '#..............................#',
    '#..............................#',
    '################################',
  ],
  props: [
    { type: 'spiegel', x: 3, y: 2 }, { type: 'spiegel', x: 6, y: 2 }, { type: 'spiegel', x: 9, y: 2 }, { type: 'spiegel', x: 12, y: 2 },
    { type: 'spiegel', x: 3, y: 4, rot: Math.PI }, { type: 'spiegel', x: 6, y: 4, rot: Math.PI },
    { type: 'spiegel', x: 9, y: 4, rot: Math.PI }, { type: 'spiegel', x: 12, y: 4, rot: Math.PI },
    { type: 'spiegel', x: 3, y: 6 }, { type: 'spiegel', x: 6, y: 6 }, { type: 'spiegel', x: 9, y: 6 }, { type: 'spiegel', x: 12, y: 6 },
    { type: 'kerze', x: 17, y: 3 }, { type: 'kerze', x: 18, y: 7 }, { type: 'kerze', x: 25, y: 2 },
    { type: 'kerze', x: 28, y: 6 }, { type: 'kerze', x: 20, y: 1 }, { type: 'kerze', x: 24, y: 8 },
    { type: 'tisch', x: 27, y: 5 },
  ],
  spawns: { party: [{ x: 1, y: 4 }, { x: 1, y: 5 }, { x: 1, y: 3 }] },
  punkte: [
    { id: 'spiegelgang', x: 7, y: 4, label: 'Der Spiegelgang', typ: 'gespraech', dialog: 'spiegelgang' },
    { id: 'zoellner', x: 16, y: 4, label: 'Der Zöllner', typ: 'gespraech', dialog: 'zoellner' },
    { id: 'waage', x: 19, y: 7, label: 'Die Waage der Gaben', typ: 'gespraech', dialog: 'waage' },
    { id: 'chor', x: 22, y: 5, label: 'Elf Kinder sitzen im Kreis', typ: 'gespraech', dialog: 'chor_der_elf' },
    { id: 'zeugen', x: 26, y: 2, label: 'Zwei Gestalten aus Stein', typ: 'kampf', event: 'steinerne_zeugen' },
    { id: 'audienz', x: 28, y: 5, label: 'Ein Stuhl mit dem Rücken zu euch. Elf Gläser.', typ: 'gespraech', dialog: 'ysmereth_audienz', nach: 'zeugen_erledigt' },
    { id: 'raus_hof', x: 1, y: 8, label: 'Zurück nach oben', typ: 'ausgang', ziel: 'schacht', nach: 'audienz_gehalten' },
  ],
});

add({
  id: 'kapelle_neumond', name: 'Die Kapelle, Neumond', untertitel: 'Nella ist freiwillig mitgegangen', theme: 'dorf_nacht',
  wandHoehe: 5.5,
  grid: [
    '####################',
    '#..................#',
    '#..==....==....==..#',
    '#..................#',
    '#..==....==....==..#',
    '#..................#',
    '#..==....==....==..#',
    '#..................#',
    '#..................#',
    '##########..########',
  ],
  props: [
    { type: 'kerze', x: 4, y: 2, h: 0.9 }, { type: 'kerze', x: 15, y: 2, h: 0.9 },
    { type: 'kerze', x: 9, y: 1, h: 1.2 }, { type: 'kerze', x: 10, y: 1, h: 1.2 },
    { type: 'kerze', x: 4, y: 6, h: 0.9 }, { type: 'kerze', x: 15, y: 6, h: 0.9 },
    { type: 'tisch', x: 9, y: 2 },
  ],
  spawns: { party: [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 11, y: 8 }] },
  punkte: [
    { id: 'hesse_neumond', x: 9, y: 3, label: 'Mutter Hesse steht am Altar', typ: 'gespraech', dialog: 'neumond_hesse' },
  ],
});

/* ═══════════════════════════ AKT II ═══════════════════════════ */

add({
  id: 'zweite_kammer', name: 'Die zweite Kammer', untertitel: 'Gefesselt, neben Ysmereth', theme: 'keller',
  wandHoehe: 3.6,
  grid: [
    '##########################',
    '#........................#',
    '#...####..........####...#',
    '#...####..........####...#',
    '#........................#',
    '#........................#',
    '#...####..........####...#',
    '#...####..........####...#',
    '#........................#',
    '#########....#############',
  ],
  props: [
    { type: 'kerze', x: 3, y: 1, h: 1.3 }, { type: 'kerze', x: 22, y: 8, h: 1.3 },
    { type: 'fels', x: 11, y: 2, opts: { s: 0.8 } },
    { type: 'steintuer', x: 12, y: 1 },
  ],
  spawns: { party: [{ x: 12, y: 5 }, { x: 13, y: 5 }, { x: 11, y: 5 }] },
  punkte: [
    { id: 'fesseln', x: 12, y: 5, label: 'Die Fesseln', typ: 'gespraech', dialog: 'fesseln' },
    { id: 'ysmereth_gefangen', x: 5, y: 5, label: 'Ysmereth sitzt neben euch', typ: 'gespraech', dialog: 'ysmereth_kammer', nach: 'befreit' },
    { id: 'wasserweg', x: 20, y: 5, label: 'Eine versiegelte Öffnung im Fels', typ: 'gespraech', dialog: 'wasserweg', nach: 'befreit' },
    { id: 'ghortan_kammer', x: 12, y: 1, label: 'Ghortan versperrt den Aufgang', typ: 'kampf', event: 'erste_konfrontation', nach: 'wasserweg_offen' },
  ],
});

add({
  id: 'marktplatz_netz', name: 'Klarwasser unter dem Netz', untertitel: 'Mittag wirkt wie Dämmerung', theme: 'marktplatz_netz',
  pflaster: true, wandHoehe: 2.8,
  grid: [
    '##################################',
    '##..............................##',
    '#..BBB....BBBB.......BBB...BBBB..#',
    '#..BBB....BBBB.......BBB...BBBB..#',
    '#..BBB...............BBB.........#',
    '#................................#',
    '#................................#',
    '#................................#',
    '#................................#',
    '#..BBBB.....BBB......BBBB..BBB...#',
    '#..BBBB.....BBB......BBBB..BBB...#',
    '#...........BBB............BBB...#',
    '##..............................##',
    '##################################',
  ],
  props: [
    { type: 'brunnen', x: 17, y: 2, opts: { wasser: '#3a2a3a', dunkel: true } },
    { type: 'stabImStein', x: 17, y: 7 },
    { type: 'gruenderstein', x: 12, y: 5 }, { type: 'gruenderstein', x: 15, y: 4 },
    { type: 'gruenderstein', x: 20, y: 5 }, { type: 'gruenderstein', x: 23, y: 6 },
    { type: 'gruenderstein', x: 11, y: 9 }, { type: 'gruenderstein', x: 14, y: 10 },
    { type: 'gruenderstein', x: 19, y: 10 }, { type: 'gruenderstein', x: 22, y: 9 },
    { type: 'gruenderstein', x: 13, y: 7 }, { type: 'gruenderstein', x: 21, y: 7 },
    { type: 'gruenderstein', x: 17, y: 11 },
  ],
  spawns: { party: [{ x: 17, y: 12 }, { x: 16, y: 12 }, { x: 18, y: 12 }] },
  punkte: [],
});

/* ═══════════════════════════ AKT III ═══════════════════════════ */

add({
  id: 'aschfeld', name: 'Aschfeld', untertitel: 'Vierzig Häuser, davon stehen noch vier', theme: 'asche',
  wandHoehe: 1.8,
  grid: [
    '##############################',
    '#............................#',
    '#...,,,......,,,.......,,,...#',
    '#............................#',
    '#......,,,........,,,........#',
    '#............................#',
    '#...,,,.......,,,......,,,...#',
    '#............................#',
    '#............................#',
    '##############################',
  ],
  props: [
    { type: 'ruine', x: 5, y: 2 }, { type: 'ruine', x: 13, y: 2 }, { type: 'ruine', x: 22, y: 3 },
    { type: 'ruine', x: 8, y: 6 }, { type: 'ruine', x: 18, y: 7 }, { type: 'ruine', x: 25, y: 6 },
    { type: 'lagerfeuer', x: 15, y: 4 },
    { type: 'fels', x: 3, y: 8 }, { type: 'fels', x: 27, y: 1 },
  ],
  spawns: { party: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 4 }] },
  punkte: [
    { id: 'ueberlebende', x: 15, y: 4, label: 'Neun Menschen sitzen im Kreis um nichts', typ: 'gespraech', dialog: 'aschfeld_ueberlebende' },
    { id: 'drakelinge', x: 18, y: 5, label: 'Zwischen den Balken bewegt sich etwas', typ: 'kampf', event: 'a1_drakelinge', nach: 'aschfeld_gesehen' },
    { id: 'sarrek', x: 25, y: 4, label: 'Ein Dragonborn steckt den Speicher an', typ: 'gespraech', dialog: 'sarrek', nach: 'a1_drakelinge' },
    { id: 'weiter_a2', x: 28, y: 4, label: 'Weiter — irgendwohin', typ: 'ausgang', ziel: 'aschespur', nach: 'sarrek_erledigt' },
  ],
});

add({
  id: 'aschespur', name: 'Die zweite Asche', untertitel: 'Auf eurer eigenen Route', theme: 'asche',
  wandHoehe: 1.6,
  grid: [
    '##############################',
    '#............................#',
    '#....,,,..........,,,,.......#',
    '#............................#',
    '#............................#',
    '#.......,,,,.........,,,.....#',
    '#............................#',
    '#............................#',
    '##############################',
  ],
  props: [
    { type: 'ruine', x: 7, y: 2 }, { type: 'ruine', x: 19, y: 3 }, { type: 'ruine', x: 12, y: 6 },
    { type: 'fels', x: 24, y: 2 }, { type: 'fels', x: 4, y: 6 },
  ],
  spawns: { party: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 4 }] },
  punkte: [
    { id: 'karte', x: 10, y: 4, label: 'Eine Karte, eure Route, ein Muster', typ: 'gespraech', dialog: 'a2_karte' },
    { id: 'kind_zeichnung', x: 16, y: 3, label: 'Ein Kind zeichnet etwas, das zu groß für das Blatt ist', typ: 'gespraech', dialog: 'a2_kind' },
    { id: 'brutmutter_kampf', x: 21, y: 4, label: 'Zwölf Drakelinge und etwas, das sie zusammenhält', typ: 'kampf', event: 'a2_brutmutter' },
    { id: 'weiter_a3', x: 28, y: 4, label: 'Der Geldspur folgen', typ: 'ausgang', ziel: 'kontor', nach: 'a2_brutmutter' },
  ],
});

add({
  id: 'kontor', name: 'Konsortium Grauberg & Teilhaber', untertitel: 'Marbruck, ordentlich beurkundet', theme: 'dorf_nacht',
  wandHoehe: 3.4,
  grid: [
    '########################',
    '#......................#',
    '#..===......===........#',
    '#......................#',
    '#..===......===........#',
    '#......................#',
    '#..===......===........#',
    '#......................#',
    '###########..###########',
  ],
  props: [
    { type: 'tisch', x: 4, y: 2 }, { type: 'tisch', x: 12, y: 2 },
    { type: 'tisch', x: 4, y: 4 }, { type: 'tisch', x: 12, y: 4 },
    { type: 'tisch', x: 4, y: 6 }, { type: 'tisch', x: 12, y: 6 },
    { type: 'kiste', x: 19, y: 2 }, { type: 'kiste', x: 20, y: 5 },
    { type: 'kerze', x: 8, y: 1, h: 0.9 },
  ],
  spawns: { party: [{ x: 11, y: 7 }, { x: 12, y: 7 }, { x: 10, y: 7 }] },
  punkte: [
    { id: 'geschaeftsfuehrer', x: 18, y: 4, label: 'Ein Geschäftsführer, der nichts weiß', typ: 'gespraech', dialog: 'a3_kontor' },
    { id: 'akten', x: 12, y: 2, label: 'Sechzehn Kaufverträge', typ: 'untersuchen', event: 'a3_akten' },
    { id: 'brand_kampf', x: 6, y: 5, label: 'Jemand zündet die Aktenbündel an', typ: 'kampf', event: 'a3_brandstifter', nach: 'a3_akten' },
    { id: 'weiter_a4', x: 11, y: 8, label: 'Hinaus', typ: 'ausgang', ziel: 'brutnest', nach: 'a3_brandstifter' },
  ],
});

add({
  id: 'brutnest', name: 'Der ausgebrannte Klosterhof', untertitel: 'Hier werden sie gezüchtet', theme: 'asche',
  wandHoehe: 3.2,
  grid: [
    '##############################',
    '#............................#',
    '#..####...........####.......#',
    '#..####...........####.......#',
    '#............................#',
    '#............................#',
    '#..####...........####.......#',
    '#..####...........####.......#',
    '#............................#',
    '#########..###################',
  ],
  props: [
    { type: 'ruine', x: 5, y: 2 }, { type: 'ruine', x: 19, y: 7 },
    { type: 'goldhaufen', x: 25, y: 5, opts: { r: 1.4 } },
    { type: 'lagerfeuer', x: 14, y: 4 },
    { type: 'kiste', x: 23, y: 2 },
  ],
  spawns: { party: [{ x: 9, y: 8 }, { x: 10, y: 8 }, { x: 8, y: 8 }] },
  punkte: [
    { id: 'ysera', x: 6, y: 5, label: 'Ysera Vohl wartet', typ: 'gespraech', dialog: 'a4_ysera', nur: 'ysera_dabei' },
    { id: 'aussenhof', x: 14, y: 4, label: 'Der Außenhof — sechzehn Drakelinge', typ: 'kampf', event: 'a5_aussenhof' },
    { id: 'staelle', x: 20, y: 4, label: 'Die Ställe', typ: 'kampf', event: 'a5_staelle', nach: 'a5_aussenhof' },
    { id: 'krypta', x: 25, y: 5, label: 'In Krallenschrift an der Wand: ein Name', typ: 'gespraech', dialog: 'a5_krypta', nach: 'a5_staelle' },
    { id: 'zum_hort', x: 28, y: 5, label: 'In den Silberkamm', typ: 'ausgang', ziel: 'hort', nach: 'a6_erledigt' },
  ],
});

add({
  id: 'brennende_stadt', name: 'Die brennende Straße', untertitel: 'Er greift nicht an. Er spricht.', theme: 'asche',
  wandHoehe: 2.6,
  grid: [
    '##############################',
    '#............................#',
    '#..####......####.....####...#',
    '#..####......####.....####...#',
    '#............................#',
    '#............................#',
    '#..####......####.....####...#',
    '#..####......####.....####...#',
    '#............................#',
    '##############################',
  ],
  props: [
    { type: 'lagerfeuer', x: 9, y: 5 }, { type: 'lagerfeuer', x: 17, y: 4 }, { type: 'lagerfeuer', x: 23, y: 8 },
    { type: 'ruine', x: 13, y: 8 },
  ],
  spawns: { party: [{ x: 3, y: 4 }, { x: 3, y: 5 }, { x: 2, y: 4 }] },
  punkte: [],
});

add({
  id: 'hort', name: 'Klauths Hort', untertitel: 'Drei Tagesmärsche über dem Tal', theme: 'hort',
  wandHoehe: 6.0,
  grid: [
    '##################################',
    '#................................#',
    '#................................#',
    '#....,,,,,,..........,,,,,,......#',
    '#....,,,,,,..........,,,,,,......#',
    '#................................#',
    '#................................#',
    '#....,,,,,,..........,,,,,,......#',
    '#....,,,,,,..........,,,,,,......#',
    '#................................#',
    '##################################',
  ],
  props: [
    { type: 'goldhaufen', x: 7, y: 3, opts: { r: 2.6 } },
    { type: 'goldhaufen', x: 23, y: 3, opts: { r: 2.4 } },
    { type: 'goldhaufen', x: 7, y: 8, opts: { r: 2.2 } },
    { type: 'goldhaufen', x: 23, y: 8, opts: { r: 2.8 } },
    { type: 'fels', x: 2, y: 1, opts: { s: 1.8 } }, { type: 'fels', x: 31, y: 9, opts: { s: 1.6 } },
  ],
  spawns: { party: [{ x: 3, y: 5 }, { x: 3, y: 6 }, { x: 2, y: 5 }] },
  punkte: [
    { id: 'klauth', x: 24, y: 5, label: 'Etwas Rotes, das von innen glüht', typ: 'gespraech', dialog: 'a7_klauth' },
    { id: 'kiesel_hort', x: 23, y: 8, label: 'Unter vierhundert Jahren Gold: ein schwarzer Kiesel', typ: 'untersuchen', event: 'schwarzer_kiesel', nach: 'klauth_erledigt' },
  ],
});

/* ═══════════════════════════ AKT IV ═══════════════════════════ */

add({
  id: 'schwarze_quelle', name: 'Die schwarze Quelle', untertitel: 'Drei Tore, und alle drei sind schlecht', theme: 'keller',
  wandHoehe: 4.0,
  grid: [
    '########################',
    '#......................#',
    '#....####......####....#',
    '#....####......####....#',
    '#.........~~~~.........#',
    '#.........~~~~.........#',
    '#....####......####....#',
    '#....####......####....#',
    '#......................#',
    '########################',
  ],
  props: [
    { type: 'brunnen', x: 11, y: 4, opts: { wasser: '#1a1a24', dunkel: true, stein: '#4a4650' } },
    { type: 'kerze', x: 3, y: 2, h: 1.2 }, { type: 'kerze', x: 20, y: 7, h: 1.2 },
  ],
  spawns: { party: [{ x: 3, y: 5 }, { x: 3, y: 6 }, { x: 2, y: 5 }] },
  punkte: [
    { id: 'ysmereth_tor', x: 11, y: 5, label: 'Das Wasser antwortet', typ: 'gespraech', dialog: 'l1_ysmereth' },
    { id: 'abstieg', x: 11, y: 4, label: 'Hinabsteigen', typ: 'ausgang', ziel: 'aschenmark', event: 'l1_eintrittsgebuehr', nach: 'l1_tor_offen' },
  ],
});

add({
  id: 'aschenmark', name: 'Die Aschenmark', untertitel: 'Ein Himmel ohne Quelle', theme: 'aschenmark',
  wandHoehe: 0.6,
  grid: [
    '##################################',
    '#................................#',
    '#........,,,,....................#',
    '#........,,,,.........,,,,.......#',
    '#.....................,,,,.......#',
    '#................................#',
    '#.......,,,,.....................#',
    '#.......,,,,.....................#',
    '#................................#',
    '##################################',
  ],
  props: [
    { type: 'fels', x: 6, y: 2, opts: { farbe: '#4a4a4e' } }, { type: 'fels', x: 20, y: 7, opts: { farbe: '#4a4a4e' } },
    { type: 'fels', x: 28, y: 3, opts: { farbe: '#52525a' } },
  ],
  spawns: { party: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 4 }] },
  punkte: [
    { id: 'vergessener', x: 9, y: 3, label: 'Jemand, der sehr gutes Brot backt', typ: 'gespraech', dialog: 'l2_vergessener' },
    { id: 'schlund', x: 15, y: 6, label: 'Ein Trichter, aus dem es nach Zuhause riecht', typ: 'gespraech', dialog: 'l2_schlund' },
    { id: 'l2_kampf', x: 22, y: 4, label: 'Federn, die keine Vögel sind', typ: 'kampf', event: 'l2_kampf' },
    { id: 'rabe', x: 26, y: 4, label: 'Ein einzelner Rabe landet', typ: 'gespraech', dialog: 'l2_rabe', nach: 'l2_kampf' },
    { id: 'zur_bibliothek', x: 32, y: 4, label: 'Zur Bibliothek der Letzten Worte', typ: 'ausgang', ziel: 'bibliothek', nach: 'l2_rabe' },
  ],
});

add({
  id: 'bibliothek', name: 'Die Bibliothek der Letzten Worte', untertitel: 'Geordnet nach dem Ton, in dem es gesagt wurde', theme: 'bibliothek',
  wandHoehe: 7.0,
  grid: [
    '##############################',
    '#............................#',
    '#..##..##..##..##..##..##....#',
    '#..##..##..##..##..##..##....#',
    '#............................#',
    '#............................#',
    '#..##..##..##..##..##..##....#',
    '#..##..##..##..##..##..##....#',
    '#............................#',
    '##############################',
  ],
  props: [
    { type: 'regal', x: 3, y: 2 }, { type: 'regal', x: 7, y: 2 }, { type: 'regal', x: 11, y: 2 },
    { type: 'regal', x: 15, y: 2 }, { type: 'regal', x: 19, y: 2 }, { type: 'regal', x: 23, y: 2 },
    { type: 'regal', x: 3, y: 6 }, { type: 'regal', x: 7, y: 6 }, { type: 'regal', x: 11, y: 6 },
    { type: 'regal', x: 15, y: 6 }, { type: 'regal', x: 19, y: 6 },
    { type: 'regal', x: 23, y: 6, opts: { leer: true, h: 3.2 } },
    { type: 'kerze', x: 14, y: 4, h: 1.0 },
  ],
  spawns: { party: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 4 }] },
  punkte: [
    { id: 'ordnung', x: 8, y: 4, label: 'Die Schilder tragen keine Buchstaben', typ: 'gespraech', dialog: 'l3_ordnung' },
    { id: 'ghortans_fach', x: 16, y: 4, label: 'Ein Fach, in dem ein einzelnes Wort liegt', typ: 'gespraech', dialog: 'l3_ghortan_fach', nach: 'l3_ordnung_verstanden' },
    { id: 'leeres_regal', x: 23, y: 5, label: 'Ein Gang, kürzer als die anderen. Das Schild bedeutet: Ungesprochen.', typ: 'gespraech', dialog: 'l3_ungesprochen', nach: 'l3_ordnung_verstanden' },
    { id: 'bibliothekar', x: 20, y: 4, label: 'Etwas, das nicht kämpft, sondern zitiert', typ: 'kampf', event: 'l3_bibliothekar', nach: 'l3_ordnung_verstanden' },
    { id: 'zur_stadt', x: 28, y: 4, label: 'Zur Stadt der Urteile', typ: 'ausgang', ziel: 'stadt_der_urteile', nach: 'l3_bibliothekar' },
  ],
});

add({
  id: 'stadt_der_urteile', name: 'Die Stadt der Urteile', untertitel: 'Diese Sitzung hat keinen Kampf. Das ist der Punkt.', theme: 'urteil',
  wandHoehe: 8.0,
  grid: [
    '##########################',
    '#........................#',
    '#..##................##..#',
    '#..##................##..#',
    '#........................#',
    '#........................#',
    '#..##................##..#',
    '#..##................##..#',
    '#........................#',
    '##########################',
  ],
  props: [
    { type: 'fels', x: 4, y: 2, opts: { s: 2.2, farbe: '#6a6c74' } },
    { type: 'fels', x: 21, y: 2, opts: { s: 2.2, farbe: '#6a6c74' } },
    { type: 'fels', x: 4, y: 7, opts: { s: 2.2, farbe: '#6a6c74' } },
    { type: 'fels', x: 21, y: 7, opts: { s: 2.2, farbe: '#6a6c74' } },
    { type: 'tisch', x: 19, y: 4 },
  ],
  spawns: { party: [{ x: 4, y: 4 }, { x: 4, y: 5 }, { x: 3, y: 4 }] },
  punkte: [
    { id: 'kelemvor', x: 19, y: 4, label: 'Der Richter gewährt Anhörung', typ: 'gespraech', dialog: 'l4_prozess' },
    { id: 'zum_federhof', x: 12, y: 8, label: 'Zum Federhof', typ: 'ausgang', ziel: 'federhof', nach: 'l4_prozess_beendet' },
  ],
});

add({
  id: 'federhof', name: 'Der Federhof', untertitel: 'Jede Feder ist ein Name, den niemand mehr weiß', theme: 'federhof',
  wandHoehe: 0.4,
  grid: [
    '##################################',
    '#................................#',
    '#................................#',
    '#........,,,,,,,,,,,,,,..........#',
    '#........,,,,,,,,,,,,,,..........#',
    '#........,,,,,,,,,,,,,,..........#',
    '#................................#',
    '#................................#',
    '##################################',
  ],
  spawns: { party: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 3, y: 4 }] },
  punkte: [
    { id: 'federfeld', x: 12, y: 4, label: 'Das Federfeld — kein Kampf, ein Marsch', typ: 'gespraech', dialog: 'l5_federfeld' },
    { id: 'ankerjagd', x: 20, y: 4, label: 'Sie greifen nicht euch an', typ: 'kampf', event: 'l5_ankerjagd', nach: 'l5_marsch' },
    { id: 'aspekt', x: 27, y: 4, label: 'Sie hat bis hierher nur beobachtet', typ: 'gespraech', dialog: 'l5_aspekt', nach: 'l5_ankerjagd' },
    { id: 'zur_kammer', x: 32, y: 4, label: 'Zur Vorratskammer', typ: 'ausgang', ziel: 'vorratskammer', nach: 'l5_aspekt' },
  ],
});

add({
  id: 'vorratskammer', name: 'Die Vorratskammer', untertitel: 'Ein Zimmer, das aussieht wie eine Vorratskammer', theme: 'bibliothek',
  wandHoehe: 4.0,
  grid: [
    '####################',
    '#..................#',
    '#..##..##..##..##..#',
    '#..##..##..##..##..#',
    '#..................#',
    '#..##..##..##..##..#',
    '#..##..##..##..##..#',
    '#..................#',
    '#########..#########',
  ],
  props: [
    { type: 'regal', x: 3, y: 2, opts: { h: 3.5 } }, { type: 'regal', x: 7, y: 2, opts: { h: 3.5 } },
    { type: 'regal', x: 11, y: 2, opts: { h: 3.5 } }, { type: 'regal', x: 15, y: 2, opts: { h: 3.5 } },
    { type: 'regal', x: 3, y: 5, opts: { h: 3.5 } }, { type: 'regal', x: 7, y: 5, opts: { h: 3.5 } },
    { type: 'regal', x: 11, y: 5, opts: { h: 3.5 } }, { type: 'regal', x: 15, y: 5, opts: { h: 3.5 } },
    { type: 'kerze', x: 9, y: 4, h: 0.9 },
  ],
  spawns: { party: [{ x: 9, y: 7 }, { x: 10, y: 7 }, { x: 8, y: 7 }] },
  punkte: [
    { id: 'lolth', x: 11, y: 4, label: 'Ein Glas in einem Regal', typ: 'gespraech', dialog: 'l6_lolth' },
    { id: 'entscheidung', x: 15, y: 4, label: 'Der Name unter der Feder', typ: 'gespraech', dialog: 'l7_name', nach: 'l6_lolth_gehoert' },
  ],
});

add({
  id: 'letzte_seite', name: 'Die letzte Seite', untertitel: 'Es hat hier noch nie geregnet', theme: 'federhof',
  wandHoehe: 0.4,
  grid: [
    '##############################',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '#............................#',
    '##############################',
  ],
  spawns: { party: [{ x: 4, y: 4 }, { x: 4, y: 5 }, { x: 3, y: 4 }] },
  punkte: [],
});

export function getArea(id) {
  return AREAS[id] || null;
}

/* ═════════════════════ Kulisse für eigene Kampfkarten ═════════════════════ */

// Was als fester Körper gelesen wird und deshalb nur auf blockierenden
// Feldern stehen darf — sonst liefe die Gruppe mitten durch ein Haus.
const SOLIDE_PROPS = new Set([
  'haus', 'kapelle', 'muehle', 'ruine', 'fels', 'baum', 'steintuer',
  'stabImStein', 'gruenderstein', 'brunnen', 'marktstand', 'regal',
]);

// Womit ein Kampfplatz je nach Farbwelt möbliert wird:
// `rand` steht auf Wandfeldern, `deckung` auf halbhohen Deckungsfeldern.
const KULISSE_NACH_THEMA = {
  wald: { rand: ['baum', 'baum', 'fels'], deckung: ['fels', 'baum'] },
  dorf: { rand: ['baum', 'fass', 'kiste'], deckung: ['fass', 'kiste'] },
  dorf_nacht: { rand: ['fass', 'kiste', 'regal'], deckung: ['tisch', 'fass'] },
  keller: { rand: ['fass', 'kiste'], deckung: ['kiste', 'fass'] },
  spiegelhof: { rand: ['kerze', 'spiegel'], deckung: ['spiegel', 'kerze'] },
  marktplatz_netz: { rand: ['marktstand', 'fass'], deckung: ['marktstand', 'kiste'] },
  asche: { rand: ['ruine', 'fels'], deckung: ['ruine', 'fels'] },
  berg: { rand: ['fels', 'fels', 'baum'], deckung: ['fels'] },
  hort: { rand: ['fels', 'goldhaufen'], deckung: ['goldhaufen', 'fels'] },
  aschenmark: { rand: ['ruine', 'fels'], deckung: ['ruine'] },
  bibliothek: { rand: ['regal', 'regal', 'kerze'], deckung: ['regal', 'tisch'] },
  federhof: { rand: ['fels'], deckung: ['fels'] },
  urteil: { rand: ['fels', 'gruenderstein'], deckung: ['fels'] },
};

function feldAuf(map, x, y) {
  const fx = Math.round(x); const fy = Math.round(y);
  if (fx < 0 || fy < 0 || fx >= map.w || fy >= map.h) return null;
  return map.tiles[fy * map.w + fx];
}

/**
 * Kulisse für eine selbstgebaute Kampfkarte.
 *
 * Viele Kämpfe stecken ihr Schlachtfeld selbst ab (makeMap). Dann passt die
 * Kulisse des Schauplatzes nicht mehr: Häuser stünden auf freiem Feld, Tische
 * außerhalb der Karte. Übernommen wird deshalb nur, was auf der neuen Karte
 * noch stimmt; der Rest wird zum Thema passend nachgestreut, damit Wände,
 * Deckung und Gebäude auch dort etwas Sichtbares sind.
 */
export function kulisseFuerKarte(basis, map) {
  const rng = makeRng((basis.seed ?? 0) ^ (map.w * 73856093) ^ (map.h * 19349663));
  const belegt = new Set();
  const merke = (x, y) => belegt.add(`${Math.round(x)},${Math.round(y)}`);
  const frei = (x, y) => !belegt.has(`${Math.round(x)},${Math.round(y)}`);
  const umgebungFrei = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!frei(x + dx, y + dy)) return false;
    return true;
  };
  const out = [];

  // 1. Gebäude aus den Grundrissen der neuen Karte — Modell und Kollision
  //    bleiben so zwangsläufig deckungsgleich.
  const haeuser = gebaeudeAusGrundriss({ w: map.w, h: map.h, tiles: map.tiles, seed: basis.seed ?? 1 });
  for (const haus of haeuser) { out.push(haus); merke(haus.x, haus.y); }

  // 2. Alles übernehmen, was auf der neuen Karte noch an seinem Platz steht.
  for (const p of basis.props || []) {
    const t = feldAuf(map, p.x, p.y);
    if (t === null) continue;                       // liegt außerhalb
    if (t === 3) continue;                          // stünde im Wasser
    if (t === 6) continue;                          // dort steht jetzt ein Haus
    if (SOLIDE_PROPS.has(p.type) && t !== 1 && t !== 5) continue; // stünde im Weg
    if (!frei(p.x, p.y)) continue;
    out.push(p);
    merke(p.x, p.y);
  }

  const satz = KULISSE_NACH_THEMA[basis.theme] || KULISSE_NACH_THEMA.dorf;

  // 3. Deckungsfelder bekommen etwas, hinter dem man sich ducken kann —
  //    ohne Modell wäre die halbe Deckung im Regelwerk unsichtbar.
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (map.tiles[y * map.w + x] !== 5 || !frei(x, y)) continue;
      out.push({ type: satz.deckung[Math.floor(rng() * satz.deckung.length)], x, y, rot: rng() * 6 });
      merke(x, y);
    }
  }

  // 4. Den Rand locker bestücken, damit die Karte nicht im Nichts endet.
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (map.tiles[y * map.w + x] !== 1 || !frei(x, y)) continue;
      if (rng() > 0.22) continue;
      if (!umgebungFrei(x, y)) continue;   // nicht klumpen
      const typ = satz.rand[Math.floor(rng() * satz.rand.length)];
      out.push({ type: typ, x, y, rot: rng() * 6, opts: typ === 'baum' ? { h: 3 + rng() * 3 } : {} });
      merke(x, y);
    }
  }
  return out;
}
