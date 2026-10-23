// Bereich „hof": die große Hofkarte (80×64). Oben die Anhöhe mit Klippen und Treppen und dem Weg zum Berg,
// darunter das Wohnhaus (Mitte), das Gewächshaus (links), der Stall (rechts), der Hofplatz mit Versandkiste
// und Briefkasten; weiter unten Ackerland, im Südwesten der große Teich, im Südosten das Bauland.
// Ausgänge: Ost → Dorf, Süd → Wald, Nord → Berg (Punkte-Vertrag, ARCHITEKTUR 5).

import { karte, bodenTyp, raster, rechteck, ellipse, pfad, fertigRaster } from '../../karten.js';
import { hash } from '../../zufall.js';

// ─── Bodenzeichen des Hofs (Vorrat a b c d e) ───────────────────────────────

bodenTyp('a', { name: 'hofkies', begehbar: true });                    // Kies und Platten rund ums Haus
bodenTyp('b', { name: 'ufer', begehbar: true });                       // Teichufer: Kiesel und feuchter Sand
bodenTyp('c', { name: 'gewaechshauserde', begehbar: true, farmbar: true });
bodenTyp('d', { name: 'fliesen', begehbar: true });                    // Küche und Bad im Haus

// ─── Maße und Orte ──────────────────────────────────────────────────────────

export const HOF_B = 80;
export const HOF_H = 64;
/** Türfeld des Wohnhauses; das Haus wächst mit der Ausbaustufe nach beiden Seiten um diese Mitte. */
export const HAUS_TUER = { x: 40, y: 16 };
/** Breite des Wohnhauses je Ausbaustufe (Felder). */
export const HAUS_BREITE = [5, 7, 9];
export const GEWAECHSHAUS = { x: 26, y: 12, w: 7, h: 5, tuer: { x: 29, y: 16 } };
export const BEREICHE = {
  bauland: [46, 41, 24, 16],
  stall: [54, 13, 5, 4],
  auslauf: [51, 19, 15, 7],
};
/** Flächen, die beim Verwildern frei bleiben (Platz ums Haus, Stall, Startacker, Bauland, Ausgänge). */
export const FREI = [
  { x: 23, y: 11, w: 44, h: 9 },    // Haus, Gewächshaus, Hofplatz, Stall und Versandkiste
  { x: 50, y: 18, w: 18, h: 9 },    // Auslauf vor dem Stall
  { x: 29, y: 20, w: 12, h: 11 },   // Startacker links der Hofstraße
  { x: 42, y: 20, w: 7, h: 7 },     // und rechts davon
  { x: 46, y: 41, w: 24, h: 16 },   // Bauland
  { x: 66, y: 34, w: 14, h: 9 },    // Ausgang ins Dorf
  { x: 35, y: 54, w: 12, h: 10 },   // Ausgang zum Wald
  { x: 34, y: 0, w: 12, h: 8 },     // Ausgang zum Berg
  { x: 6, y: 11, w: 10, h: 8 },     // Wiese am Fuß der Westtreppe
  { x: 29, y: 40, w: 5, h: 8 },     // Landeplatz des Stegs am Teich
  { x: 18, y: 6, w: 6, h: 6 },      // Treppen
  { x: 60, y: 6, w: 6, h: 6 },
];

// ─── Bauen ──────────────────────────────────────────────────────────────────

/** Setzt z nur auf Felder, die gerade eines der Zeichen aus `wo` tragen. */
function nurWo(g, x, y, b, h, z, wo = '.') {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + b; xx++) if (g[yy]?.[xx] !== undefined && wo.includes(g[yy][xx])) g[yy][xx] = z;
  }
}
function nurWoEllipse(g, cx, cy, rx, ry, z, wo = '.') {
  const kopie = g.map((zeile) => zeile.slice());
  ellipse(kopie, cx, cy, rx, ry, z);
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (kopie[y][x] !== g[y][x] && wo.includes(g[y][x])) g[y][x] = z;
}
/** Wellige Randdicke an der Stelle i. */
const dicke = (i, basis, amp, ph) => Math.max(2, Math.round(basis + amp * Math.sin(i * 0.31 + ph) + amp * 0.6 * Math.sin(i * 0.77 + ph * 2.1)));

/** Ufer: jedes Grasfeld neben Wasser (auch schräg) wird Uferboden. */
function ufer(g, wasser = '~') {
  const neu = [];
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[y].length; x++) {
      if (g[y][x] !== '.') continue;
      let nah = false;
      for (let dy = -1; dy <= 1 && !nah; dy++) for (let dx = -1; dx <= 1; dx++) if (g[y + dy]?.[x + dx] === wasser) { nah = true; break; }
      if (nah) neu.push([x, y]);
    }
  }
  for (const [x, y] of neu) g[y][x] = 'b';
}

/** Entfernt einzelne Grasflecken im Wald und einzelne Waldfelder im Gras. */
function glaetten(g) {
  for (let runde = 0; runde < 2; runde++) {
    for (let y = 1; y < g.length - 1; y++) {
      for (let x = 1; x < g[y].length - 1; x++) {
        const n = [g[y - 1][x], g[y + 1][x], g[y][x - 1], g[y][x + 1]];
        if (g[y][x] === '.' && n.filter((c) => c === '#').length >= 3) g[y][x] = '#';
        else if (g[y][x] === '#' && n.filter((c) => c === '.').length >= 3) g[y][x] = '.';
      }
    }
  }
}

function hofRaster() {
  const g = raster(HOF_B, HOF_H, '.');

  // Waldrand rundum, wellig
  for (let x = 0; x < HOF_B; x++) {
    rechteck(g, x, 0, 1, dicke(x, 2.2, 0.9, 0.3), '#');
    const u = dicke(x, 3, 1.2, 1.7);
    rechteck(g, x, HOF_H - u, 1, u, '#');
  }
  for (let y = 0; y < HOF_H; y++) {
    rechteck(g, 0, y, dicke(y, 3.6, 1.6, 0.9), 1, '#');
    const r = dicke(y, 3.4, 1.5, 2.6);
    rechteck(g, HOF_B - r, y, r, 1, '#');
  }
  // Waldbuchten ins Land hinein
  for (const [cx, cy, rx, ry] of [
    [3, 26, 7, 5], [2, 52, 9, 6], [77, 24, 6, 5], [78, 55, 9, 6], [60, 62, 9, 3.5], [14, 62, 8, 3.2], [1, 40, 5, 4],
    [76, 12, 5, 4],
  ]) nurWoEllipse(g, cx, cy, rx, ry, '#');

  // Anhöhe im Norden: zwei Reihen Klippe, dahinter höheres Land
  nurWo(g, 3, 9, 74, 2, 'X');
  // Wäldchen auf der Anhöhe
  for (const [cx, cy, rx, ry] of [[29, 3, 5, 2.2], [48, 3, 7, 2.4], [72, 6, 5, 3.4], [6, 4, 4, 2.4], [26, 8, 3.4, 1.4], [54, 7, 2.6, 1.3]]) nurWoEllipse(g, cx, cy, rx, ry, '#');

  // Teiche: der kleine oben auf der Anhöhe, der große im Südwesten
  nurWoEllipse(g, 11.5, 6, 4.6, 2.6, '~', '.#');
  nurWoEllipse(g, 17.5, 45.5, 10.4, 7.2, '~', '.#');
  nurWoEllipse(g, 22, 49, 3.5, 2.6, '~', '.#');
  ufer(g);
  // kleiner Steg in den großen Teich
  rechteck(g, 22, 43, 9, 1, 'h');

  // Hofplatz vor Haus, Gewächshaus und Stall
  rechteck(g, 25, 17, 38, 2, 'a');
  rechteck(g, 36, 15, 9, 2, 'a');            // vor dem Haus, auch beim ausgebauten Haus
  // Wege (zwei Felder breit)
  pfad(g, [[20, 18], [20, 11]], 2, ':');      // zur Westtreppe
  pfad(g, [[24, 18], [20, 18]], 2, ':');
  pfad(g, [[62, 18], [62, 11]], 2, ':');      // zur Osttreppe
  pfad(g, [[40, 19], [40, 27], [43, 32], [43, 38], [41, 46], [40, 52], [40, 62]], 2, ':');      // Hofstraße nach Süden bis zum Wald
  pfad(g, [[41, 38], [78, 38]], 2, ':');      // Straße ins Dorf
  // Wege oben auf der Anhöhe
  pfad(g, [[20, 7], [20, 5], [38, 5], [38, 0]], 2, ':');
  pfad(g, [[62, 7], [62, 5], [39, 5]], 2, ':');
  // Klippen: nur die Treppen (zwei Reihen), nicht der Weg
  rechteck(g, 20, 9, 2, 2, 'T');
  rechteck(g, 62, 9, 2, 2, 'T');
  rechteck(g, 20, 8, 2, 1, ':');
  rechteck(g, 62, 8, 2, 1, ':');
  // Ausgänge durch den Waldrand
  nurWo(g, 36, 0, 6, 3, '.', '#');
  rechteck(g, 38, 0, 2, 3, ':');
  nurWo(g, 75, 35, 5, 7, '.', '#');
  rechteck(g, 75, 38, 5, 2, ':');
  nurWo(g, 37, 60, 7, 4, '.', '#');
  rechteck(g, 40, 58, 2, 6, ':');
  glaetten(g);
  return g;
}

export const HOF_GRID = fertigRaster(hofRaster());

// ─── Gebäude und Deko ───────────────────────────────────────────────────────

const hausGebaeude = (stufe, ziel) => ({
  typ: stufe === 0 ? 'haus' : `hof_haus${stufe}`,
  x: HAUS_TUER.x - Math.floor(HAUS_BREITE[stufe] / 2), y: HAUS_TUER.y - 4, w: HAUS_BREITE[stufe], h: 5,
  tuer: { ...HAUS_TUER }, ziel: { karte: ziel, punkt: 'eingang' }, nurWenn: `hof_haus${stufe}`,
});

/** Baum, Busch, Findling usw. als Kulisse an einer festen Stelle (keine Hindernisse zum Fällen). */
const k = (typ, x, y, extra = {}) => ({ typ, x, y, ...extra });

const DEKO = [
  { typ: 'versandkiste', x: 46, y: 16, w: 2, aktion: 'versand' },
  { typ: 'briefkasten', x: 34, y: 16, aktion: 'post' },
  // Wegweiser an den Ausgängen
  k('schild', 37, 3, { aktion: 'text', text: 'Nach Norden geht es zum Berg: Zimmerei, Gilde und die alte Mine.' }),
  k('schild', 39, 60, { aktion: 'text', text: 'Nach Süden liegt der Wald. Dort wohnt auch Wilma mit ihren Tieren.' }),
  k('schild', 74, 36, { aktion: 'text', text: 'Hier geht es ins Dorf Klarwasser. Ottilies Laden öffnet früh.' }),
  // Hofplatz
  k('laterne', 33, 18, { licht: 5 }), k('laterne', 48, 18, { licht: 5 }), k('laterne', 60, 18, { licht: 5 }), k('laterne', 24, 18, { licht: 5 }),
  k('hof_regentonne', 33, 16),
  k('hof_holzstapel', 49, 15, { w: 2 }),
  k('hof_karren', 60, 15, { w: 2 }),
  k('hof_blumenbeet', 33, 13, { w: 2 }), k('hof_blumenbeet', 46, 13, { w: 2 }),
  k('hof_bank', 30, 19, { w: 2 }),
  k('hof_vogelhaus', 35, 14),
  // am Stall: der Auslauf mit Zaun, im Süden ein Tor (Lücke)
  k('hof_heuballen', 53, 15), k('hof_heuballen', 59, 16),
  k('zaun', 50, 26, { w: 7 }), k('zaun', 59, 26, { w: 8 }), k('zaun', 50, 19, { h: 7 }), k('zaun', 66, 19, { h: 7 }),
  // Teich
  k('hof_bank', 27, 37, { w: 2 }),
  k('hof_schilf', 8, 41), k('hof_schilf', 9, 41), k('hof_schilf', 11, 40), k('hof_schilf', 24, 40), k('hof_schilf', 26, 41), k('hof_schilf', 7, 47), k('hof_schilf', 8, 49),
  k('hof_schilf', 13, 51), k('hof_schilf', 26, 47), k('hof_schilf', 27, 52),
  k('hof_seerosen', 14, 43), k('hof_seerosen', 20, 41), k('hof_seerosen', 12, 46), k('hof_seerosen', 19, 48), k('hof_seerosen', 16, 50), k('hof_seerosen', 22, 46),
  k('hof_schilf', 7, 6), k('hof_schilf', 15, 7), k('hof_seerosen', 11, 6), k('hof_seerosen', 10, 5),
  k('hof_bank', 16, 3, { w: 2 }),
  // Waldrand, Findlinge
  k('felsen', 31, 44), k('felsen', 67, 20), k('felsen', 9, 20), k('felsen', 69, 14), k('felsen', 71, 16), k('felsen', 70, 12), k('felsen', 6, 17),
  k('busch', 32, 41), k('busch', 30, 41), k('busch', 6, 33), k('busch', 7, 34), k('busch', 74, 30),
  k('hof_blumenbeet', 25, 21, { w: 2 }),
];

const gewaechshausGebaeude = {
  typ: 'hof_gewaechshaus', ...GEWAECHSHAUS,
  ziel: { karte: 'gewaechshaus', punkt: 'eingang' }, tuerWenn: 'gewaechshaus',
  sonst: 'Die Tür klemmt, hinter den blinden Scheiben wuchert es. So kommst du nicht hinein. Vielleicht kennt jemand im Dorf einen Weg?',
};

karte({
  id: 'hof', name: 'Dein Hof', aussen: true, farmbar: true, wasser: 'teich', rand: 'wald', npcWege: false, zuhause: false,
  grid: HOF_GRID,
  gebaeude: [hausGebaeude(0, 'haus'), hausGebaeude(1, 'haus1'), hausGebaeude(2, 'haus2'), gewaechshausGebaeude],
  deko: DEKO,
  warps: [
    { x: 79, y: 38, w: 1, h: 2, karte: 'dorf', punkt: 'vonHof' },
    { x: 38, y: 0, w: 2, h: 1, karte: 'berg', punkt: 'vonHof' },
    { x: 40, y: 63, w: 2, h: 1, karte: 'wald', punkt: 'vonHof' },
  ],
  punkte: {
    vonDorf: [77, 38, 'links'],
    vonWald: [40, 61, 'oben'],
    vonBerg: [38, 2, 'unten'],
    vorHaus: [HAUS_TUER.x, HAUS_TUER.y + 1, 'unten'],
    vorGewaechshaus: [GEWAECHSHAUS.tuer.x, GEWAECHSHAUS.tuer.y + 1, 'oben'],
    versandkiste: [46, 17, 'oben'],
    briefkasten: [34, 17, 'oben'],
    teich: [31, 46, 'links'],
    steg: [30, 43, 'links'],
    anhoehe: [30, 5, 'unten'],
    startacker: [34, 24, 'unten'],
  },
  bereiche: BEREICHE,
  gewaesser: [
    { x: 6, y: 38, b: 23, h: 15, art: 'teich' },
    { x: 6, y: 3, b: 12, h: 6, art: 'teich' },
  ],
  sammel: [
    { x: 4, y: 2, w: 36, h: 7, art: 'wald', max: 4 },
    { x: 42, y: 2, w: 34, h: 7, art: 'wiese', max: 4 },
    { x: 4, y: 20, w: 24, h: 17, art: 'wiese', max: 5 },
    { x: 4, y: 53, w: 34, h: 8, art: 'wald', max: 4 },
    { x: 43, y: 58, w: 30, h: 4, art: 'wiese', max: 3 },
    { x: 44, y: 22, w: 26, h: 14, art: 'wiese', max: 5 },
    { x: 70, y: 40, w: 6, h: 12, art: 'wald', max: 3 },
  ],
  frei: FREI,
});
