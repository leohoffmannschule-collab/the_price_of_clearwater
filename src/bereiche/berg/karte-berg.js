// Bereich „berg" – die große Bergkarte (80×52): Bergsee mit Insel und Steg, Wasserfall samt Becken
// und Bach, Mineneingang im Felsen, Zimmerei und Gilde an der Talstraße, ein Aussichtsplateau
// hinter Klippen mit Treppe, der Steinbruch im Osten hinter einem Fluss mit kaputter Brücke,
// Kiefernwälder, ein Teich im Südosten. Weltgraph: Süd-West → Hof, Süd-Ost → Dorf.
//
// Bodenzeichen des Bereichs (ARCHITEKTUR 5.):
//   r  Klippenfuß (Gras im Schatten der Wand)     u  Schotter und Steinbruchboden
//   v  Wasserfall (nicht begehbar, kein Fischwasser)   w  Holzbrücke über Wasser (waagerecht)
//   y  Granitwand (Klippe, nicht begehbar)

import { karte, bodenTyp, raster, rechteck, ellipse, pfad, fertigRaster } from '../../karten.js';
import { hash } from '../../zufall.js';

bodenTyp('r', { name: 'klippenfuss', begehbar: true, farmbar: true });
bodenTyp('u', { name: 'schotter', begehbar: true });
bodenTyp('v', { name: 'wasserfall' });
bodenTyp('w', { name: 'bruecke', begehbar: true });
bodenTyp('y', { name: 'granit' });

export const B = 80;
export const H = 52;

// Orte, auf die auch Inhalt und Tests zugreifen
export const ORTE = {
  hoehle: { x: 14, y: 5, w: 3, h: 2, tuer: [15, 6] },
  zimmerei: { x: 18, y: 38, w: 5, h: 4, tuer: [20, 41] },
  gilde: { x: 52, y: 38, w: 5, h: 4, tuer: [54, 41] },
  fall: [33, 2, 4, 5], // großer Wasserfall x, y, b, h
  quelle: [62, 4, 3, 3], // kleiner Wasserfall am Fluss
  bruecke: [62, 21, 3, 2],
  steinbruch: [65, 7, 13, 29],
  plateau: [48, 8, 11, 8],
};

/** Unregelmäßige Fläche statt glatter Ellipse (Seen, Teiche, Plätze): Rand wellt sich je nach `seed`. */
function blob(g, cx, cy, rx, ry, z, seed = 1, wob = 0.13) {
  const p1 = hash(seed, 1, 1) * 6.283;
  const p2 = hash(seed, 2, 1) * 6.283;
  const p3 = hash(seed, 3, 1) * 6.283;
  for (let y = Math.floor(cy - ry * 1.4); y <= Math.ceil(cy + ry * 1.4); y++) {
    for (let x = Math.floor(cx - rx * 1.4); x <= Math.ceil(cx + rx * 1.4); x++) {
      if (y < 0 || y >= H || x < 0 || x >= B) continue;
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const a = Math.atan2(dy, dx);
      const grenze = 1 + wob * (0.6 * Math.sin(2 * a + p1) + 0.45 * Math.sin(3 * a + p2) + 0.3 * Math.sin(5 * a + p3));
      if (dx * dx + dy * dy <= grenze * grenze) g[y][x] = z;
    }
  }
}

const yKlippe = (x) => {
  if (x >= 12 && x <= 18) return 6; // Mineneingang
  if (x >= 31 && x <= 38) return 6; // Wasserfall
  if (x >= 61) return 6; // Quelle und Steinbruch
  return Math.max(4, Math.round(4.6 + 1.3 * Math.sin(x * 0.33 + 1) + 0.9 * Math.sin(x * 0.81)));
};

function gelaende() {
  const g = raster(B, H, '.');

  // Rand aus Fels
  rechteck(g, 0, 0, B, 2, '#'); rechteck(g, 0, H - 2, B, 2, '#');
  rechteck(g, 0, 0, 2, H, '#'); rechteck(g, B - 2, 0, 2, H, '#');
  // Steinwall zum Nachbartal: nach Süden etwas ausgefranst
  for (let x = 2; x < B - 2; x++) {
    if (hash(x, 3, 9) < 0.35) g[H - 3][x] = '#';
    if (hash(x, 4, 9) < 0.18) g[H - 4][x] = '#';
  }

  // Nordgrat: Granitwand quer über die Karte
  for (let x = 2; x < B - 2; x++) for (let y = 2; y <= yKlippe(x); y++) g[y][x] = 'y';

  // Steinbruch: Schotterboden, Felsnasen, Südwand
  rechteck(g, 65, 7, 13, 29, 'u');
  rechteck(g, 65, 36, 13, 3, 'y');
  for (const [cx, cy, rx, ry] of [[73, 12, 2.3, 1.5], [69, 16, 1.7, 1.2], [75, 19, 2.2, 1.6], [67, 28, 1.8, 1.3], [75, 30, 2.4, 1.5], [71, 24, 1.5, 1]]) ellipse(g, cx, cy, rx, ry, '#');
  rechteck(g, 76, 7, 2, 4, 'y');

  // Aussichtsplateau: Klippen ringsum, Treppe im Süden
  rechteck(g, 46, 8, 2, 10, 'y'); rechteck(g, 59, 8, 2, 10, 'y'); rechteck(g, 46, 16, 15, 2, 'y');

  // Sandstrand um den See, dann der See mit Insel, dann Wasserfallbecken und Bach
  blob(g, 30, 27, 12.8, 8.6, 's', 1, 0.11);
  blob(g, 30, 27, 11, 7, '~', 1, 0.11);
  blob(g, 29, 26, 3.8, 2.6, 's', 2, 0.1); blob(g, 29, 26, 2.8, 1.8, '.', 2, 0.1);
  blob(g, 34.5, 10, 5.3, 3.3, '~', 3, 0.1);
  pfad(g, [[34, 11], [34, 14], [33, 17], [33, 20]], 2, '~');

  // Fluss aus der Quelle, Teich am Flussende
  rechteck(g, 62, 7, 3, 25, '~');
  blob(g, 63.5, 34.5, 5.4, 4, '~', 4, 0.1);
  // Teich im Südosten
  blob(g, 71, 44, 4.6, 2.9, '~', 5, 0.1);

  // Wasserfälle: der große über dem Becken, ein kleiner an der Quelle des Flusses
  rechteck(g, ORTE.fall[0], ORTE.fall[1], ORTE.fall[2], ORTE.fall[3], 'v');
  rechteck(g, ORTE.quelle[0], ORTE.quelle[1], ORTE.quelle[2], ORTE.quelle[3], 'v');

  // Wege (2 Felder breit)
  pfad(g, [[8, 51], [8, 45]], 2, ':'); // vom Hof
  pfad(g, [[62, 51], [62, 45]], 2, ':'); // vom Dorf
  pfad(g, [[8, 44], [63, 44]], 2, ':'); // Talstraße
  pfad(g, [[14, 44], [14, 30], [15, 16], [15, 7]], 2, ':'); // Nordweg zur Mine
  pfad(g, [[15, 18], [34, 18], [44, 19], [58, 19]], 2, ':'); // Seeweg
  pfad(g, [[58, 44], [58, 24], [58, 21], [61, 21]], 2, ':'); // Ostweg zur Brücke
  pfad(g, [[20, 42], [20, 44]], 2, ':'); // zur Zimmerei
  pfad(g, [[54, 42], [54, 44]], 2, ':'); // zur Gilde
  pfad(g, [[38, 18], [41, 14], [41, 9]], 2, ':'); // zum Becken
  blob(g, 53.5, 10.5, 4.4, 2.9, 'u', 7, 0.09); // Platz auf dem Plateau
  pfad(g, [[52, 14], [52, 12]], 2, ':');
  pfad(g, [[52, 18], [52, 19]], 2, ':');
  rechteck(g, 52, 16, 2, 2, 'T'); // Treppe in der Südwand des Plateaus
  g[ORTE.hoehle.tuer[1]][ORTE.hoehle.tuer[0]] = ':'; // Tür des Mineneingangs
  pfad(g, [[65, 21], [70, 21], [70, 10]], 2, ':'); // im Steinbruch
  pfad(g, [[70, 21], [70, 27], [72, 33]], 2, ':');

  // Pflaster vor den Häusern, Rastplatz an der Talstraße
  rechteck(g, 17, 42, 7, 2, '=');
  rechteck(g, 51, 42, 7, 2, '=');
  blob(g, 39, 41, 4.6, 2.5, '=', 6, 0.08);
  pfad(g, [[39, 43], [39, 44]], 2, ':');

  // See-Steg und Uferstege
  rechteck(g, 29, 30, 2, 5, 'h');
  rechteck(g, 70, 41, 1, 3, 'h');
  // Brücken (Bach, Fluss)
  rechteck(g, 33, 18, 2, 2, 'w');
  rechteck(g, 62, 21, 3, 2, 'w');

  // Schatten am Fuß der Wände: Gras unter Granit wird Klippenfuß
  for (let y = 1; y < H; y++) for (let x = 0; x < B; x++) if (g[y][x] === '.' && g[y - 1][x] === 'y') g[y][x] = 'r';
  return g;
}

const grid = gelaende();
const zeichen = (x, y) => grid[y]?.[x] ?? '#';

// ─── Kulissen: Kiefernwälder, Büsche, Felsen, Bewuchs ──────────────────────

/** Gras-ähnliche Felder, auf denen Kulisse stehen darf (nicht an Wegen, Türen, Punkten). */
const PUNKTE = {
  vonHof: [8, 49, 'oben'],
  vonDorf: [62, 49, 'oben'],
  vorMine: [15, 7, 'unten'],
  vorZimmerei: [20, 42],
  vorGilde: [54, 42],
  see1: [29, 30, 'oben'],
  steinbruch: [61, 21, 'rechts'],
  wasserfall: [41, 11, 'links'],
  aussicht: [56, 9, 'rechts'],
  rastplatz: [39, 41, 'oben'],
  teich: [70, 40, 'unten'],
};

const sperr = new Set();
for (const [x, y] of Object.values(PUNKTE)) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) sperr.add(`${x + dx},${y + dy}`);
for (const [x, y] of [PUNKTE.vorMine, PUNKTE.vorZimmerei, PUNKTE.vorGilde]) for (let dy = -4; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) sperr.add(`${x + dx},${y + dy}`);
for (const o of [ORTE.hoehle, ORTE.zimmerei, ORTE.gilde]) for (let y = o.y - 1; y <= o.y + o.h + 1; y++) for (let x = o.x - 1; x <= o.x + o.w; x++) sperr.add(`${x},${y}`);

const WIESE = new Set(['.', 'r']);
const wegNah = (x, y) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (':=hwTu~sv'.includes(zeichen(x + dx, y + dy))) return true;
  }
  return false;
};
export const kulissenFrei = (x, y) => WIESE.has(zeichen(x, y)) && !sperr.has(`${x},${y}`) && !wegNah(x, y);

const deko = [];
const belegt = new Set();
function stelle(d) {
  for (let yy = d.y; yy < d.y + (d.h || 1); yy++) for (let xx = d.x; xx < d.x + (d.w || 1); xx++) belegt.add(`${xx},${yy}`);
  deko.push(d);
}
const freiFuer = (x, y, w = 1, h = 1) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!kulissenFrei(xx, yy) || belegt.has(`${xx},${yy}`)) return false;
  return true;
};

// Feste Stücke
const fest = [
  // Mineneingang
  { typ: 'berg_loren', x: 11, y: 8, w: 2 }, { typ: 'laterne', x: 13, y: 7, licht: 4 }, { typ: 'laterne', x: 18, y: 7, licht: 4 },
  { typ: 'berg_holzstapel', x: 18, y: 9 }, { typ: 'berg_holzstapel', x: 19, y: 9 },
  { typ: 'berg_wegweiser', x: 17, y: 11, aktion: 'text', text: 'Nach Norden: die Alte Mine, wenn du kräftige Arme hast. Nach Süden: Talstraße. Dazwischen: Aussicht.' },
  // Talstraße, Weggabelung am Nordweg
  { typ: 'berg_wegweiser', x: 12, y: 43, aktion: 'text', text: 'Westen: Hof und Dorf. Norden: Mine und Bergsee. Osten: Gilde, Aussichtsplateau und Steinbruch. Süden: Hosentaschen.' },
  { typ: 'berg_wegweiser', x: 10, y: 46, aktion: 'text', text: 'Zum Hof geht es hier hinunter. Zurück den Berg hinauf nimmst du am besten die Beine.' },
  { typ: 'berg_wegweiser', x: 64, y: 46, aktion: 'text', text: 'Hinunter ins Dorf Klarwasser. Dort gibt es Kuchen. Vermutlich.' },
  // Zimmerei
  { typ: 'berg_holzstapel', x: 24, y: 38, w: 1 }, { typ: 'berg_holzstapel', x: 25, y: 38 }, { typ: 'berg_holzstapel', x: 24, y: 39 },
  { typ: 'berg_holzstapel', x: 25, y: 39 }, { typ: 'berg_holzstapel', x: 25, y: 40 },
  { typ: 'berg_saegebock', x: 16, y: 39 }, { typ: 'berg_saegebock', x: 17, y: 41 },
  { typ: 'laterne', x: 17, y: 43, licht: 4 }, { typ: 'laterne', x: 23, y: 43, licht: 4 },
  { typ: 'schild', x: 22, y: 42, aktion: 'text', text: 'Zimmerei Zimmermann. Wir bauen Ställe, Scheunen, Anbauten und Ausreden. Auf Wunsch auch Häuser.' },
  // Gilde
  { typ: 'berg_puppe', x: 49, y: 40 }, { typ: 'berg_puppe', x: 50, y: 42 },
  { typ: 'laterne', x: 51, y: 43, licht: 4 }, { typ: 'laterne', x: 57, y: 43, licht: 4 },
  { typ: 'schild', x: 56, y: 42, aktion: 'text', text: 'Abenteurergilde. Eintritt für Mutige. Für alle anderen gibt es Kekse.' },
  { typ: 'berg_waffenstaender', x: 50, y: 38 },
  // Rastplatz
  { typ: 'berg_lagerfeuer', x: 39, y: 40, licht: 5 },
  { typ: 'berg_rastbank', x: 36, y: 40, w: 2 }, { typ: 'berg_rastbank', x: 41, y: 40, w: 2 },
  { typ: 'berg_wegweiser', x: 35, y: 43, aktion: 'text', text: 'Rastplatz der Bergwanderer. Das Feuer brennt nur, weil jemand es heimlich anzündet.' },
  // Bergsee: Boot am Steg, Seerosen, Schilf, Bank am Ufer
  { typ: 'berg_boot', x: 31, y: 32, w: 2 },
  { typ: 'berg_seerosen', x: 24, y: 29 }, { typ: 'berg_seerosen', x: 25, y: 30 }, { typ: 'berg_seerosen', x: 35, y: 24 }, { typ: 'berg_seerosen', x: 36, y: 25 }, { typ: 'berg_seerosen', x: 22, y: 25 },
  { typ: 'berg_rastbank', x: 26, y: 36, w: 2 }, { typ: 'berg_rastbank', x: 33, y: 36, w: 2 },
  { typ: 'berg_wegweiser', x: 27, y: 33, aktion: 'text', text: 'Bergsee. Tief, kalt und voller Fische mit eigener Meinung.' },
  // Wasserfall und Becken
  { typ: 'berg_rastbank', x: 43, y: 11, w: 2 },
  { typ: 'berg_seerosen', x: 32, y: 10 }, { typ: 'berg_seerosen', x: 37, y: 11 },
  // Plateau: Feuerstelle in der Mitte, Bänke ringsum, Fernrohr an der Kante
  { typ: 'berg_fernrohr', x: 57, y: 9, aktion: 'text', text: 'Durch das Fernrohr siehst du den Hof, das Dorf mit dem Mühlenrad und eine Möwe, die sich verirrt hat.' },
  { typ: 'berg_lagerfeuer', x: 53, y: 10, licht: 5 },
  { typ: 'berg_rastbank', x: 50, y: 10, w: 2 }, { typ: 'berg_rastbank', x: 55, y: 11, w: 2 }, { typ: 'berg_rastbank', x: 52, y: 8, w: 2 },
  { typ: 'berg_wegweiser', x: 54, y: 14, aktion: 'text', text: 'Aussichtspunkt „Hoch hinaus". Bitte nicht weiter als bis zur Kante hinauslehnen.' },
  // Steinbruch
  { typ: 'berg_kran', x: 66, y: 12, w: 2 }, { typ: 'berg_loren', x: 68, y: 24, w: 2 }, { typ: 'berg_loren', x: 73, y: 27, w: 2 },
  { typ: 'berg_steinblock', x: 76, y: 22 }, { typ: 'berg_steinblock', x: 76, y: 23 }, { typ: 'berg_steinblock', x: 75, y: 23 },
  { typ: 'berg_holzstapel', x: 66, y: 25 }, { typ: 'berg_holzstapel', x: 66, y: 26 }, { typ: 'kiste', x: 67, y: 25 },
  { typ: 'laterne', x: 69, y: 20, licht: 4 }, { typ: 'laterne', x: 74, y: 34, licht: 4 }, { typ: 'laterne', x: 69, y: 9, licht: 4 },
  { typ: 'schild', x: 66, y: 20, aktion: 'text', text: 'Alter Steinbruch. Steine nachwachsen lassen ist keine Hexerei, nur Geduld. Hut tragen!' },
  // Brücke (kaputt, bis das Flag gesetzt ist)
  { typ: 'berg_bruecke_kaputt', x: 62, y: 21, w: 3, h: 2, aktion: 'berg_bruecke', nurWenn: '!berg_steinbruch' },
  { typ: 'schild', x: 60, y: 23, aktion: 'text', text: 'ACHTUNG! Brücke morsch. Zum Reparieren: 60 Holz und 30 Stein. Danach geht es zum Steinbruch.', nurWenn: '!berg_steinbruch' },
  // Teich
  { typ: 'berg_schilf', x: 67, y: 44 }, { typ: 'berg_schilf', x: 68, y: 46 }, { typ: 'berg_schilf', x: 75, y: 43 }, { typ: 'berg_schilf', x: 74, y: 46 },
  { typ: 'berg_seerosen', x: 71, y: 44 }, { typ: 'berg_seerosen', x: 73, y: 45 },
  { typ: 'berg_wegweiser', x: 68, y: 40, aktion: 'text', text: 'Der Teich hinter der Wegbiegung. Die Frösche haben Hausrecht.' },
];
for (const d of fest) stelle(d);

// Die Insel im See: Kiefern, Busch und Felsen auf den Grasfeldern, die das Gelände dort übrig lässt
{
  const gras = [];
  for (let y = 22; y <= 30; y++) for (let x = 24; x <= 34; x++) if (zeichen(x, y) === '.') gras.push([x, y]);
  gras.sort((a, b) => (Math.abs(a[0] - 29) + Math.abs(a[1] - 26)) - (Math.abs(b[0] - 29) + Math.abs(b[1] - 26)) || a[0] - b[0]);
  const innen = gras.slice(0, 7);
  const [kiefer1, bus, kiefer2, fels] = [innen[0], innen[2], innen[4], innen[5]].filter(Boolean);
  if (kiefer1) stelle({ typ: 'baum', x: kiefer1[0], y: kiefer1[1], art: 'kiefer' });
  if (kiefer2 && Math.abs(kiefer2[0] - kiefer1[0]) + Math.abs(kiefer2[1] - kiefer1[1]) > 1) stelle({ typ: 'baum', x: kiefer2[0], y: kiefer2[1], art: 'kiefer' });
  if (bus) stelle({ typ: 'busch', x: bus[0], y: bus[1] });
  if (fels) stelle({ typ: 'felsen', x: fels[0], y: fels[1] });
}
// Uferschilf am See (auf Sand und Gras direkt am Wasser, nicht an Wegen und Steg)
for (let y = 17; y < 38; y++) for (let x = 15; x < 46; x++) {
  const z = zeichen(x, y);
  if ((z !== 's' && z !== '.') || belegt.has(`${x},${y}`) || sperr.has(`${x},${y}`) || hash(x, y, 31) >= 0.1) continue;
  let wasser = false;
  let weg = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const n = zeichen(x + dx, y + dy);
    if (n === '~') wasser = true;
    if (':=hwT'.includes(n)) weg = true;
  }
  if (wasser && !weg) stelle({ typ: 'berg_schilf', x, y });
}

// Wälder: west (gesamter Streifen), nördlich unter der Wand, Südwest, Plateau-Ränder, Osten unten
const WAELDER = [
  { x: 2, y: 8, w: 11, h: 34, p: 0.34 },
  { x: 2, y: 42, w: 4, h: 8, p: 0.4 },
  { x: 16, y: 8, w: 13, h: 8, p: 0.3 },
  { x: 38, y: 12, w: 8, h: 5, p: 0.28 },
  { x: 48, y: 8, w: 4, h: 8, p: 0.22 },
  { x: 56, y: 8, w: 3, h: 8, p: 0.25 },
  { x: 44, y: 20, w: 13, h: 16, p: 0.2 },
  { x: 42, y: 45, w: 20, h: 5, p: 0.3 },
  { x: 64, y: 45, w: 14, h: 5, p: 0.28 },
  { x: 59, y: 24, w: 3, h: 18, p: 0.25 },
  { x: 16, y: 45, w: 24, h: 5, p: 0.26 },
  { x: 66, y: 38, w: 12, h: 5, p: 0.25 },
  { x: 8, y: 20, w: 5, h: 22, p: 0.4 },
];
for (const wd of WAELDER) {
  for (let y = wd.y; y < wd.y + wd.h; y++) {
    for (let x = wd.x; x < wd.x + wd.w; x++) {
      if (!kulissenFrei(x, y) || belegt.has(`${x},${y}`)) continue;
      if (hash(x, y, 17) >= wd.p) continue;
      const h = hash(x, y, 18);
      if (h < 0.1) stelle({ typ: 'busch', x, y });
      else if (h < 0.15 && y > 30) stelle({ typ: 'baum', x, y, art: 'eiche' });
      else stelle({ typ: 'baum', x, y, art: 'kiefer' });
    }
  }
}

// Bewuchs ohne Hindernis: Farn, Enzian, Pilze (begehbar)
for (let y = 7; y < 50; y++) for (let x = 3; x < 77; x++) {
  if (!kulissenFrei(x, y) || belegt.has(`${x},${y}`)) continue;
  const h = hash(x, y, 55);
  if (h < 0.022) stelle({ typ: 'berg_bewuchs', x, y, art: 'farn', begehbar: true });
  else if (h < 0.034) stelle({ typ: 'berg_bewuchs', x, y, art: 'enzian', begehbar: true });
  else if (h < 0.040 && x < 14) stelle({ typ: 'berg_bewuchs', x, y, art: 'pilz', begehbar: true });
}
// Blumenwiesen: kleine Flecken aus Wildblumen auf offenem Gras
for (let y = 8; y < 49; y++) for (let x = 3; x < 77; x++) {
  if (!kulissenFrei(x, y) || belegt.has(`${x},${y}`) || zeichen(x, y) !== '.') continue;
  const n = Math.sin(x * 0.31) + Math.sin(y * 0.27 + 1) + Math.sin((x + y) * 0.19 + 2);
  if (n > 1.2 && hash(x, y, 61) < 0.4) stelle({ typ: 'berg_bewuchs', x, y, art: 'wiese', begehbar: true });
}
// Steinmännchen als Wegmarken an den Weggabelungen
for (const [x, y] of [[13, 36], [17, 17], [28, 17], [44, 17], [57, 21], [38, 47], [60, 46], [13, 20], [41, 16]]) {
  if (WIESE.has(zeichen(x, y)) && !belegt.has(`${x},${y}`)) stelle({ typ: 'berg_steinmann', x, y });
}
// Felsen als Felsnasen am Fuß der Wände
for (let x = 3; x < 77; x++) {
  const y = yKlippe(x) + 2;
  if (kulissenFrei(x, y) && !belegt.has(`${x},${y}`) && hash(x, y, 77) < 0.07) stelle({ typ: 'felsen', x, y });
}

export const KULISSEN = deko;

// ─── Karte ──────────────────────────────────────────────────────────────────

const H0 = ORTE.hoehle;
const Z0 = ORTE.zimmerei;
const G0 = ORTE.gilde;

karte({
  id: 'berg', name: 'Am Berg', aussen: true, wasser: 'see', rand: 'fels',
  grid: fertigRaster(grid),
  gewaesser: [{ x: 62, y: 7, b: 3, h: 25, art: 'fluss' }],
  gebaeude: [
    {
      typ: 'hoehle', x: H0.x, y: H0.y, w: H0.w, h: H0.h, tuer: { x: H0.tuer[0], y: H0.tuer[1] }, ziel: { karte: 'mine0', punkt: 'eingang' }, tuerWenn: 'mineOffen',
      sonst: 'Geröll versperrt den Eingang. Jemand mit kräftigen Armen müsste es wegräumen.',
    },
    { typ: 'zimmerei', x: Z0.x, y: Z0.y, w: Z0.w, h: Z0.h, tuer: { x: Z0.tuer[0], y: Z0.tuer[1] }, ziel: { karte: 'zimmerei', punkt: 'eingang' } },
    { typ: 'gilde', x: G0.x, y: G0.y, w: G0.w, h: G0.h, tuer: { x: G0.tuer[0], y: G0.tuer[1] }, ziel: { karte: 'gilde', punkt: 'eingang' } },
  ],
  deko: [
    { typ: 'schild', x: 13, y: 9, aktion: 'text', text: 'Am Berg. Oben die alte Mine, unten links dein Hof, unten rechts das Dorf. Dazwischen viel Gestein.' },
    ...deko,
  ],
  warps: [
    { x: 8, y: 51, w: 2, h: 1, karte: 'hof', punkt: 'vonBerg' },
    { x: 62, y: 51, w: 2, h: 1, karte: 'dorf', punkt: 'vonBerg' },
  ],
  punkte: PUNKTE,
  bereiche: {
    steinbruch: ORTE.steinbruch,
    wasserfall: [30, 2, 10, 11],
    plateau: ORTE.plateau,
    talstrasse: [8, 44, 56, 2],
  },
  sammel: [
    { x: 3, y: 8, w: 10, h: 36, art: 'wald', max: 6 },
    { x: 16, y: 8, w: 24, h: 8, art: 'wald', max: 4 },
    { x: 16, y: 36, w: 44, h: 10, art: 'berg', max: 5 },
    { x: 48, y: 8, w: 11, h: 8, art: 'berg', max: 4 },
    { x: 44, y: 20, w: 14, h: 16, art: 'berg', max: 3 },
    { x: 66, y: 8, w: 11, h: 28, art: 'berg', boden: 'u', max: 3 },
  ],
});
