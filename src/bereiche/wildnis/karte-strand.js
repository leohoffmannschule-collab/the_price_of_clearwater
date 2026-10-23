// Der Strand: 90×44 Felder. Dünengras und Sand, Meer im Süden, ein langer Steg, Lenes Fischladen,
// die Hütte von Mats, ein Leuchtturm auf den Klippen, Lagerfeuer, Liegestühle, und im Osten das
// Gezeitenbecken hinter einer kaputten Brücke (300 Holz, dann gehört es dir).

import { karte, raster, rechteck, ellipse, pfad, fertigRaster } from '../../karten.js';
import { Platz, welle, fleck } from './bau.js';

const B = 90;
const H = 44;
export const STRAND = { b: B, h: H };

/** Erste Wasserreihe in Spalte x (die Küstenlinie, mit einer Bucht im Osten). */
export const kueste = (x) => welle(x, 32, 2.2, 9, 1.3, 3.3, 1.2) + (x > 70 && x < 87 ? Math.round(2.6 * Math.sin(((x - 70) / 16) * Math.PI)) : 0);
/** Letzte Grasreihe in Spalte x (darunter beginnt der Sand). */
const grasEnde = (x) => welle(x, 9, 1.8, 6.5, 1.1, 2.7, 0.5);

const g = raster(B, H, '.');
for (let x = 0; x < B; x++) {
  const k = kueste(x);
  const gr = grasEnde(x);
  for (let y = 2; y < H; y++) {
    g[y][x] = y >= k ? '~' : y >= k - 2 ? 'l' : y > gr ? 's' : '.';
  }
}
rechteck(g, 0, 0, B, 2, '#');
for (let y = 2; y < H; y++) { if (g[y][0] !== '~') g[y][0] = '#'; if (g[y][B - 1] !== '~') g[y][B - 1] = '#'; }

// Dünen im Gras und Grasbüschel im Sand
for (const [cx, cy, rx, ry] of [[14, 8, 4, 1.6], [50, 7, 6, 1.8], [30, 10, 3, 1.4], [76, 7, 5, 1.7], [22, 6, 3, 1.3], [60, 10, 3, 1.2]]) ellipse(g, cx, cy, rx, ry, 's');

// Klippen im Nordwesten mit dem Leuchtturm-Felsen
fleck(g, 5, 22, 7.5, 7, 'p', 3);
fleck(g, 1, 19, 4.5, 8, '#', 4);
fleck(g, 6, 15.5, 4, 2.2, '#', 5);
rechteck(g, 0, 0, 2, 30, '#');

// Gezeitenbecken im Osten: Felsplatten mit Becken, Klippen am Rand
fleck(g, 79, 26, 9.5, 5.5, 'p', 6);
fleck(g, 83, 20, 5, 3, 'p', 7);
[[75, 27, 3.4, 2.1], [82, 25, 3.2, 2], [79, 30.5, 2.8, 1.5], [85, 21, 2.4, 1.4], [71, 23, 2, 1.4]].forEach(([cx, cy, rx, ry], i) => {
  fleck(g, cx, cy, rx + 1.6, ry + 1.5, 'p', 20 + i);
  fleck(g, cx, cy, rx, ry, '~', 30 + i);
});
fleck(g, 86, 12, 3, 3.5, '#', 8);
fleck(g, 71, 9, 2.6, 1.8, '#', 9);

// Meeresfelsen
[[24, 37, 2.6, 1.8], [58, 38, 3.2, 2.2], [31, 41, 2.2, 1.4], [74, 40, 2.8, 1.8], [8, 38, 2.4, 2], [86, 40, 2.2, 1.6]].forEach(([cx, cy, rx, ry], i) => {
  fleck(g, cx, cy, rx + 1, ry + 0.8, 'p', 40 + i);
  fleck(g, cx, cy, rx, ry, '#', 50 + i);
});

// Die Rinne zum Gezeitenbecken (66–68) trennt den Osten vom Rest; die Brücke liegt bei y 18–19
for (let y = 2; y < H; y++) for (let x = 66; x <= 68; x++) g[y][x] = '~';
rechteck(g, 66, 18, 3, 2, 'h');

// Wege
rechteck(g, 40, 0, 2, 2, ':');
pfad(g, [[40, 2], [40, 9]], 2, ':');
pfad(g, [[40, 9], [41, 16]], 2, ':');
pfad(g, [[41, 17], [37, 17]], 2, ':');
pfad(g, [[42, 17], [45, 24], [45, 29]], 2, ':');
pfad(g, [[36, 18], [24, 19], [13, 18]], 2, ':');
pfad(g, [[47, 22], [64, 19]], 2, ':');
rechteck(g, 38, 16, 2, 1, ':');
// Steg mit Kopf, und der kleine Steg von Mats
rechteck(g, 45, 29, 2, 11, 'h');
rechteck(g, 41, 38, 10, 2, 'h');
rechteck(g, 17, 29, 2, 7, 'h');
rechteck(g, 16, 34, 4, 2, 'h');

const GEBAEUDE = [
  { typ: 'huette', x: 35, y: 11, w: 6, h: 5, tuer: { x: 38, y: 15 }, ziel: { karte: 'fischladen', punkt: 'eingang' } },
  { typ: 'wildnis_matshuette', x: 11, y: 14, w: 5, h: 4, tuer: { x: 13, y: 17 }, ziel: { karte: 'huetteMats', punkt: 'eingang' } },
  {
    typ: 'wildnis_leuchtturm', x: 3, y: 21, w: 3, h: 3,
    zu: 'Der Leuchtturm ist abgeschlossen. Das Licht brennt trotzdem jede Nacht, sagt Lene. Von selbst.',
  },
];

const PUNKTE = {
  vonDorf: [40, 2, 'unten'],
  steg: [46, 39, 'unten'],
  stand: [38, 18, 'oben'],
  vorFischladen: [38, 16, 'unten'],
  vorHuetteMats: [13, 18, 'unten'],
  strand1: [26, 20],
  strand2: [52, 24],
  gezeiten: [65, 19, 'rechts'],
  lagerfeuer: [57, 27],
  leuchtturm: [8, 23, 'links'],
  jetty: [17, 35, 'unten'],
};

// ─── Deko ───────────────────────────────────────────────────────────────────

const platz = new Platz(g);
for (const geb of GEBAEUDE) platz.sperren(geb.x, geb.y, geb.w, geb.h, 1);
for (const [x, y] of Object.values(PUNKTE)) platz.sperren(x, y, 1, 1, 2);
platz.sperren(40, 0, 2, 4, 2);
platz.sperren(20, 18, 16, 8, 0);

const FEST = [20, 18, 16, 8];

platz.setzeAlle([
  // Fischladen: Reusen, Netze, Fässer, Boot, Schilder
  { typ: 'wildnis_reuse', x: 34, y: 15 }, { typ: 'wildnis_reuse', x: 34, y: 14 },
  { typ: 'wildnis_netz', x: 41, y: 12, w: 2, h: 2 },
  { typ: 'wildnis_fass', x: 41, y: 15 }, { typ: 'kiste', x: 42, y: 15 },
  { typ: 'wildnis_fass', x: 34, y: 16 },
  { typ: 'schild', x: 36, y: 17, aktion: 'text', text: 'Lenes Fischladen. Köder, Ruten, Netze. Fisch am besten frisch aus dem Meer.' },
  { typ: 'wildnis_boot', x: 29, y: 21, w: 3, h: 1 },
  { typ: 'laterne', x: 36, y: 16, licht: 4 },
  { typ: 'busch', x: 33, y: 12 }, { typ: 'busch', x: 43, y: 11 },
  // Mats' Hütte: Staffelei, Wäscheleine aus Wimpeln, Bank
  { typ: 'wildnis_staffelei', x: 17, y: 17 },
  { typ: 'wildnis_sitzstamm', x: 9, y: 18, w: 2 },
  { typ: 'busch', x: 10, y: 14 }, { typ: 'busch', x: 17, y: 14 },
  { typ: 'wildnis_fass', x: 16, y: 18 },
  // Stege
  { typ: 'laterne', x: 45, y: 38, licht: 5 }, { typ: 'laterne', x: 50, y: 38, licht: 5 }, { typ: 'laterne', x: 41, y: 38, licht: 5 },
  { typ: 'wildnis_poller', x: 45, y: 31 }, { typ: 'wildnis_poller', x: 46, y: 35 },
  { typ: 'wildnis_ruderboot', x: 15, y: 36, w: 2 },
  { typ: 'wildnis_poller', x: 18, y: 30 },
  // Lagerfeuer mit Sitzstämmen
  { typ: 'wildnis_lagerfeuer', x: 57, y: 26, licht: 7 },
  { typ: 'wildnis_sitzstamm', x: 54, y: 26, w: 2 }, { typ: 'wildnis_sitzstamm', x: 59, y: 26, w: 2 }, { typ: 'wildnis_sitzstamm', x: 56, y: 29, w: 2 },
  // Brücke ins Gezeitenbecken und ihr Schild
  { typ: 'wildnis_bruecke_kaputt', x: 66, y: 18, w: 3, h: 2, aktion: 'wildnis_bruecke', nurWenn: '!wildnis_strandbruecke' },
  { typ: 'wildnis_bruecke', x: 66, y: 18, w: 3, h: 2, begehbar: true, nurWenn: 'wildnis_strandbruecke' },
  { typ: 'schild', x: 64, y: 17, aktion: 'wildnis_bruecke' },
  // Leuchtturm: das Feuer oben
  { typ: 'wildnis_leuchtfeuer', x: 4, y: 17, begehbar: true, licht: 9 },
  { typ: 'felsen', x: 9, y: 19 }, { typ: 'felsen', x: 10, y: 26 }, { typ: 'felsen', x: 2, y: 29 },
]);

// Liegestühle, Schirme und Handtücher in der Mitte des Strands
for (const [x, y, art] of [[48, 20, 0], [52, 21, 1], [56, 21, 2], [50, 25, 1], [60, 23, 0]]) platz.setze({ typ: 'strandkorb', x, y });
for (const [x, y, art] of [[49, 23, 0], [53, 24, 1], [58, 22, 2], [47, 27, 1]]) platz.setze({ typ: 'wildnis_sonnenschirm', x, y, art });
for (const [x, y, art] of [[50, 23, 0], [54, 22, 2], [62, 25, 1], [48, 26, 2]]) platz.setze({ typ: 'wildnis_handtuch', x, y, art, begehbar: true });
for (const [x, y] of [[30, 27], [43, 30], [22, 27]]) platz.setze({ typ: 'wildnis_sandburg', x, y, begehbar: true });

// Gezeitenbecken: Seesterne und Felsbrocken
// Streuen: Dünengras, Büsche, Treibholz, Seetang, Felsen
platz.streuen('wildnis_duenengras', 90, { boden: 's.', zone: [2, 4, 62, 12], abstand: 0, seed: 21, neu: () => ({ begehbar: true }), sperrt: false, versuche: 800 });
platz.streuen('busch', 14, { boden: '.', zone: [2, 3, 62, 7], seed: 22 });
platz.streuen('baum', 7, { boden: '.', zone: [2, 3, 62, 6], seed: 23, neu: () => ({ art: 'kiefer' }), abstand: 2 });
platz.streuen('wildnis_treibholz', 9, { boden: 's', zone: [2, 14, 62, 15], seed: 24, w: 2 });
platz.streuen('wildnis_seetang', 38, { boden: 'l', zone: [2, 24, 62, 14], seed: 25, abstand: 0, neu: () => ({ begehbar: true }), sperrt: false, versuche: 400 });
platz.streuen('felsen', 8, { boden: 's', zone: [2, 14, 62, 17], seed: 26 });
platz.streuen('wildnis_muschelhaufen', 12, { boden: 's', zone: [2, 18, 62, 12], seed: 27, abstand: 0, neu: () => ({ begehbar: true }) });

// Im Osten
const O = new Platz(g);
O.sperren(62, 14, 4, 10);
O.sperren(66, 0, 3, H);
O.streuen('wildnis_seestern', 14, { boden: 'p', zone: [70, 18, 18, 16], abstand: 0, seed: 31, neu: (x, y, i) => ({ art: i % 3, begehbar: true }) });
O.streuen('felsen', 10, { boden: 'sp', zone: [70, 5, 18, 28], seed: 32 });
O.streuen('wildnis_treibholz', 4, { boden: 's', zone: [70, 8, 17, 18], seed: 33, w: 2 });
O.streuen('wildnis_duenengras', 50, { boden: 's.', zone: [70, 3, 18, 18], abstand: 0, seed: 34, neu: () => ({ begehbar: true }), sperrt: false, versuche: 500 });
O.streuen('busch', 7, { boden: '.', zone: [70, 3, 17, 8], seed: 35 });
O.streuen('wildnis_seetang', 12, { boden: 'l', zone: [70, 28, 18, 10], seed: 36, abstand: 0, neu: () => ({ begehbar: true }), sperrt: false });
O.setzeAlle([
  { typ: 'wildnis_sitzstamm', x: 72, y: 17, w: 2 },
  { typ: 'schild', x: 70, y: 16, aktion: 'text', text: 'Das Gezeitenbecken. Bei Ebbe liegen hier Muscheln, Seesterne und manchmal ein Schatz. Bitte nichts mitnehmen, das nicht ohnehin im Eimer liegt.' },
]);

karte({
  id: 'strand', name: 'Strand', aussen: true, wasser: 'meer', rand: 'fels', npcWege: true,
  grid: fertigRaster(g),
  gebaeude: GEBAEUDE,
  deko: [...platz.deko, ...O.deko],
  warps: [{ x: 40, y: 0, w: 2, h: 1, karte: 'dorf', punkt: 'vonStrand' }],
  punkte: PUNKTE,
  bereiche: {
    fest: FEST,
    gezeitenbecken: [69, 2, 20, 33],
    badestrand: [46, 19, 18, 12],
  },
  sammel: [
    { x: 2, y: 9, w: 62, h: 22, art: 'strand', max: 12, boden: 's' },
    { x: 2, y: 2, w: 62, h: 9, art: 'wiese', max: 4, boden: '.' },
    { x: 69, y: 2, w: 20, h: 28, art: 'strand', max: 10, boden: 's' },
    { x: 69, y: 18, w: 20, h: 16, art: 'strand', max: 6, boden: 'p' },
  ],
});
