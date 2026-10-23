// Der Wald: 90×70 Felder. Vom Hof im Norden führt die Waldstraße zum Händlerplatz in der Mitte;
// im Nordosten liegt Wilmas Ranch, im Nordwesten der Turm des Einsiedlers, im Südwesten der
// Waldsee, im Südosten die Lichtung. Ein Fluss schneidet den Süden ab, und ganz im Südwesten
// versperrt ein umgestürzter Stamm den Weg in den Geheimen Wald.

import { karte, raster, rechteck, ellipse, pfad, fertigRaster } from '../../karten.js';
import { Platz, strasse, waldDichte, offenMaske, offenRechteck, offenEllipse, offenAusZeichen, rauschen } from './bau.js';

const B = 90;
const H = 70;
export const WALD = { b: B, h: H };

const g = raster(B, H, '.');
rechteck(g, 0, 0, B, 2, '#');
rechteck(g, 0, H - 2, B, 2, '#');
rechteck(g, 0, 0, 2, H, '#');
rechteck(g, B - 2, 0, 2, H, '#');

// ─── Landschaft ─────────────────────────────────────────────────────────────

// Waldsee im Südwesten (Kiesufer ringsum) und der Fluss, der von dort nach Osten zieht
ellipse(g, 20, 53, 13, 8.8, 'o');
ellipse(g, 20, 53, 11, 7, '~');
const FLUSS = [[31, 51], [40, 54], [50, 56], [60, 55], [70, 58], [80, 57], [89, 56]];
const ufer = FLUSS.map(([x, y]) => [x, y - 1]);
for (let i = 0; i < ufer.length - 1; i++) {
  const [x0, y0] = ufer[i];
  const [x1, y1] = ufer[i + 1];
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let j = 0; j <= n; j++) {
    const px = Math.round(x0 + ((x1 - x0) * j) / n);
    const py = Math.round(y0 + ((y1 - y0) * j) / n);
    for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 2; dx++) if (g[py + dy]?.[px + dx] === '.') g[py + dy][px + dx] = 'o';
  }
}
pfad(g, FLUSS, 3, '~');

// Aussichtsterrasse hinter dem Turm: Klippen mit Treppe
rechteck(g, 7, 8, 18, 3, 'X');
ellipse(g, 16, 5, 8.5, 3.4, 'n');
rechteck(g, 15, 8, 2, 3, 'T');
// Terrasse um den Turm
ellipse(g, 16, 15, 7.5, 4.6, 'p');

// Händlerplatz
rechteck(g, 32, 24, 24, 13, '=');
// Lichtung und Weide (nur offenes Gras, die Dichte lässt sie frei)
const LICHTUNG = { cx: 73, cy: 47, rx: 11.5, ry: 7.5 };

// Straßen und Wege
const w = (punkte, breite = 2, z = ':', opt) => strasse(g, punkte, breite, z, opt);
w([[44, 2], [44, 24]]);
w([[44, 36], [44, 62], [3, 62]]);
w([[55, 30], [89, 30]]);
w([[46, 14], [56, 15], [61, 16]]);
w([[33, 29], [24, 27], [18, 21], [15, 17]]);
w([[33, 33], [31, 41], [30, 47]]);
w([[46, 41], [58, 44], [66, 47]]);
w([[44, 12], [38, 14], [36, 16]], 2, ':');
w([[46, 22], [58, 24], [60, 20]], 1, 'n');
w([[40, 40], [36, 46]], 1, 'n');
w([[48, 48], [52, 52]], 1, 'n');
w([[38, 6], [30, 5], [22, 4]], 1, 'n');
w([[50, 8], [52, 5], [58, 3]], 1, 'n');
w([[56, 40], [60, 36], [70, 36], [80, 40]], 1, 'n');
w([[70, 62], [60, 62], [48, 64]], 1, 'n');
// Ranch-Innenweg
w([[60, 16], [64, 16], [64, 14]], 2, ':');
// Der Steg im Waldsee
rechteck(g, 20, 43, 2, 8, 'h');
rechteck(g, 18, 49, 6, 2, 'h');
// Warps
rechteck(g, 44, 0, 2, 2, ':');
rechteck(g, 88, 30, 2, 2, ':');
rechteck(g, 0, 62, 2, 2, ':');

// ─── Dichter Wald ───────────────────────────────────────────────────────────

const offen = offenMaske(B, H);
offenAusZeichen(offen, g, '.#');
offenRechteck(offen, 58, 4, 29, 22, 1);
offenEllipse(offen, LICHTUNG.cx, LICHTUNG.cy, LICHTUNG.rx + 1, LICHTUNG.ry + 1);
offenEllipse(offen, 16, 5, 9, 4);
offenEllipse(offen, 16, 15, 9, 6);
offenEllipse(offen, 20, 53, 15, 11);
offenRechteck(offen, 33, 12, 8, 6, 0);
// kleine Waldwiesen
for (const [cx, cy, rx, ry] of [[10, 30, 4, 3], [24, 38, 4, 3], [70, 12, 0, 0], [64, 66, 5, 1.6], [34, 8, 3, 2], [52, 64, 4, 1.4], [78, 36, 5, 2.5], [6, 52, 3, 4], [60, 48, 3, 2.5], [20, 66, 6, 1.4]]) {
  if (rx) offenEllipse(offen, cx, cy, rx, ry);
}
waldDichte(g, offen, { seed: 5, ab: 4.3, staerke: 1 });
// Kleine Waldwiesen bleiben Gras (die Dichte hat sie bis auf Reste ausgespart)

// Rand wieder sauber
rechteck(g, 0, 0, B, 2, '#');
rechteck(g, 0, H - 2, B, 2, '#');
rechteck(g, 0, 0, 2, H, '#');
rechteck(g, B - 2, 0, 2, H, '#');
for (const [x, y, bb, hh] of [[44, 0, 2, 2], [88, 30, 2, 2], [0, 62, 2, 2]]) rechteck(g, x, y, bb, hh, ':');
// Waldboden unter den Bäumen: Gras neben dichtem Wald wird zu Waldboden
for (let y = 2; y < H - 2; y++) {
  for (let x = 2; x < B - 2; x++) {
    if (g[y][x] !== '.') continue;
    if (rauschen(x / 6, y / 6, 77) > 0.62 && (g[y - 1][x] === '#' || g[y][x - 1] === '#' || g[y + 1][x] === '#' || g[y][x + 1] === '#' || rauschen(x / 3, y / 3, 78) > 0.55)) {
      if (!(x >= 58 && x < 88 && y >= 4 && y < 26) && !(x >= 58 && x <= 86 && y >= 40 && y < 56)) g[y][x] = 'n';
    }
  }
}

// ─── Gebäude und Punkte ─────────────────────────────────────────────────────

const GEBAEUDE = [
  { typ: 'ranch', x: 62, y: 9, w: 6, h: 5, tuer: { x: 64, y: 13 }, ziel: { karte: 'ranch', punkt: 'eingang' } },
  { typ: 'wildnis_scheune', x: 72, y: 6, w: 7, h: 5, zu: 'Wilmas Scheune. Abends sind die Tiere müde, morgens hungrig und mittags wählerisch.' },
  { typ: 'turm', x: 14, y: 13, w: 3, h: 3, tuer: { x: 15, y: 15 }, ziel: { karte: 'turm', punkt: 'eingang' } },
  { typ: 'wildnis_holzhaus', x: 34, y: 11, w: 4, h: 3, zu: 'Die Hütte der Holzfäller. Sie sind seit Jahren fort, aber der Schornstein raucht manchmal. Niemand fragt.' },
];

const PUNKTE = {
  vonHof: [44, 2, 'unten'],
  vonDorf: [87, 30, 'links'],
  vorRanch: [64, 14, 'unten'],
  vorTurm: [15, 16, 'unten'],
  haendler: [44, 30, 'unten'],
  see1: [31, 49, 'links'],
  fluss1: [60, 54, 'unten'],
  lichtung: [73, 47],
  vorGeheimwald: [6, 62, 'links'],
  camp: [38, 17],
  seesteg: [21, 50, 'unten'],
  terrasse: [16, 5, 'unten'],
  weide: [72, 18],
  bruecke: [44, 53, 'unten'],
};

const FEST = [35, 27, 18, 8];

// ─── Deko ───────────────────────────────────────────────────────────────────

const platz = new Platz(g);
for (const geb of GEBAEUDE) platz.sperren(geb.x, geb.y, geb.w, geb.h, 1);
for (const [x, y] of Object.values(PUNKTE)) platz.sperren(x, y, 1, 1, 2);
platz.sperren(44, 0, 2, 5, 1);
platz.sperren(86, 28, 4, 6, 1);
platz.sperren(0, 60, 8, 6, 0);
platz.sperren(...FEST, 0);
platz.sperren(60, 15, 3, 3, 1);

const farbstand = (art) => ({ art });

platz.setzeAlle([
  // Wegweiser an den Kreuzungen
  { typ: 'schild', x: 46, y: 5, aktion: 'text', text: 'Waldstraße. Nach Norden liegt dein Hof, nach Süden der Händlerplatz.' },
  { typ: 'schild', x: 43, y: 22, aktion: 'text', text: 'Nach Westen zum Turm des Einsiedlers. Nach Osten zur Ranch. Geradeaus der Händlerplatz.' },
  { typ: 'schild', x: 46, y: 34, aktion: 'text', text: 'Händlerplatz. Südlich: Waldsee, Lichtung und der Fluss. Östlich: Weg ins Dorf.' },
  { typ: 'schild', x: 84, y: 33, aktion: 'text', text: 'Ins Dorf geht es nach Osten. Wer dem Fluss folgt, kommt nie an.' },
  { typ: 'schild', x: 8, y: 61, aktion: 'text', text: 'Hier endet der Weg. Der Stamm da vorn liegt seit Menschengedenken quer. Dahinter soll es schön sein.' },
  // Holzfällerlager
  { typ: 'wildnis_holzstapel', x: 38, y: 15, w: 2 }, { typ: 'wildnis_saegebock', x: 32, y: 14 },
  { typ: 'wildnis_lagerfeuer', x: 36, y: 18, licht: 6 }, { typ: 'wildnis_sitzstamm', x: 34, y: 18, w: 2 },
  { typ: 'wildnis_fass', x: 33, y: 16 },
  // Händlerplatz: Stände, Wagen, Laternen
  { typ: 'wildnis_marktstand', x: 33, y: 24, w: 3, h: 2, art: 0 }, { typ: 'wildnis_marktstand', x: 37, y: 24, w: 3, h: 2, art: 1 },
  { typ: 'wildnis_marktstand', x: 48, y: 24, w: 3, h: 2, art: 2 }, { typ: 'wildnis_marktstand', x: 52, y: 24, w: 3, h: 2, art: 3 },
  { typ: 'wildnis_marktstand', x: 33, y: 35, w: 3, h: 2, art: 3 }, { typ: 'wildnis_marktstand', x: 52, y: 35, w: 3, h: 2, art: 0 },
  { typ: 'wildnis_karren', x: 40, y: 35, w: 3, h: 2 }, { typ: 'wildnis_karren', x: 47, y: 35, w: 3, h: 2 },
  { typ: 'laterne', x: 34, y: 27, licht: 5 }, { typ: 'laterne', x: 53, y: 27, licht: 5 },
  { typ: 'laterne', x: 34, y: 34, licht: 5 }, { typ: 'laterne', x: 53, y: 34, licht: 5 },
  { typ: 'wildnis_fass', x: 41, y: 24 }, { typ: 'kiste', x: 46, y: 24 }, { typ: 'wildnis_fass', x: 45, y: 24 },
  { typ: 'wildnis_sitzstamm', x: 36, y: 30, w: 2 }, { typ: 'wildnis_sitzstamm', x: 50, y: 31, w: 2 },
  // Turm und Terrasse
  { typ: 'wildnis_fernrohr', x: 18, y: 4 }, { typ: 'wildnis_sitzstamm', x: 12, y: 5, w: 2 }, { typ: 'laterne', x: 19, y: 6, licht: 5 },
  { typ: 'wildnis_regentonne', x: 19, y: 15 }, { typ: 'wildnis_kraeuterbeet', x: 10, y: 15, w: 3 }, { typ: 'wildnis_kraeuterbeet', x: 10, y: 17, w: 3 },
  { typ: 'wildnis_buecherkarren', x: 19, y: 17, w: 2 },
  { typ: 'laterne', x: 13, y: 17, licht: 4 },
  // Ranch: Zäune, Tor, Silo, Heu, Tränke
  { typ: 'zaun', x: 58, y: 4, w: 29 }, { typ: 'zaun', x: 58, y: 25, w: 29 },
  { typ: 'zaun', x: 58, y: 5, h: 10 }, { typ: 'zaun', x: 58, y: 17, h: 8 }, { typ: 'zaun', x: 86, y: 5, h: 20 },
  { typ: 'wildnis_briefkasten', x: 57, y: 14 },
  { typ: 'schild', x: 57, y: 17, aktion: 'text', text: 'Wilmas Ranch. Tore bitte schließen. Die Kühe merken sich, wer es vergisst.' },
  { typ: 'wildnis_silo', x: 80, y: 8, w: 2, h: 2 },
  { typ: 'wildnis_heuballen', x: 76, y: 12 }, { typ: 'wildnis_heuballen', x: 77, y: 12 }, { typ: 'wildnis_heuballen', x: 76, y: 13 },
  { typ: 'wildnis_heuballen', x: 83, y: 12 }, { typ: 'wildnis_heuballen', x: 83, y: 13 },
  { typ: 'wildnis_traenke', x: 68, y: 19, w: 2 }, { typ: 'wildnis_traenke', x: 78, y: 20, w: 2 },
  { typ: 'wildnis_pumpe', x: 70, y: 14 },
  { typ: 'wildnis_blumenbeet', x: 62, y: 14, w: 2 }, { typ: 'wildnis_blumenbeet', x: 66, y: 14, w: 2 },
  { typ: 'wildnis_karren', x: 69, y: 11, w: 3, h: 2 },
  { typ: 'laterne', x: 66, y: 15, licht: 4 }, { typ: 'laterne', x: 71, y: 12, licht: 4 },
  // Lichtung: uralte Eiche, Bienenstöcke, Pilzring, Decke
  { typ: 'wildnis_uralteiche', x: 72, y: 44, w: 2, h: 2 },
  { typ: 'wildnis_bienenstock', x: 68, y: 43 }, { typ: 'wildnis_bienenstock', x: 69, y: 43 }, { typ: 'wildnis_bienenstock', x: 80, y: 44 },
  { typ: 'wildnis_pilzring', x: 77, y: 50, w: 3, h: 2, begehbar: true },
  { typ: 'wildnis_decke', x: 70, y: 49, w: 2, begehbar: true },
  { typ: 'wildnis_sitzstamm', x: 68, y: 51, w: 2 },
  // Waldsee: Boot, Steg
  { typ: 'wildnis_ruderboot', x: 14, y: 53, w: 2 },
  { typ: 'wildnis_poller', x: 19, y: 44 }, { typ: 'laterne', x: 22, y: 49, licht: 5 },
  { typ: 'wildnis_sitzstamm', x: 26, y: 44, w: 2 },
  // Umgestürzter Stamm: eigenes Objekt (leben.js)
]);

// Felsen und Findlinge
platz.streuen('wildnis_findling', 16, { boden: '.n', zone: [4, 4, 82, 62], seed: 40, abstand: 2 });
platz.streuen('felsen', 22, { boden: '.n', zone: [4, 4, 82, 62], seed: 41, abstand: 1 });
platz.streuen('busch', 40, { boden: '.n', zone: [4, 4, 82, 62], seed: 42, abstand: 1 });
// Blumen, Farn, Pilze (begehbar, nur Schmuck)
platz.streuen('wildnis_wildblumen', 120, { boden: '.', zone: [4, 4, 82, 62], seed: 43, abstand: 0, neu: (x, y, i) => ({ art: i % 4, begehbar: true }), sperrt: false, versuche: 2000 });
platz.streuen('wildnis_farn', 80, { boden: 'n.', zone: [4, 4, 82, 62], seed: 44, abstand: 0, neu: () => ({ begehbar: true }), sperrt: false, versuche: 1500 });
platz.streuen('wildnis_pilze', 40, { boden: 'n', zone: [4, 4, 82, 62], seed: 45, abstand: 0, neu: (x, y, i) => ({ art: i % 3, begehbar: true }), sperrt: false, versuche: 1500 });
platz.streuen('wildnis_schilf', 40, { boden: 'o', zone: [8, 44, 80, 20], seed: 46, abstand: 0, neu: () => ({ begehbar: true }), sperrt: false, versuche: 800 });
platz.streuen('wildnis_seerose', 26, { boden: '~', zone: [10, 47, 20, 12], seed: 47, abstand: 0, neu: (x, y, i) => ({ art: i % 2, begehbar: true }), sperrt: false, versuche: 600 });
platz.streuen('wildnis_baumstumpf', 22, { boden: '.n', zone: [4, 4, 82, 62], seed: 48, abstand: 2, neu: (x, y, i) => ({ art: i % 2 }) });

// Alte Bäume: Kulissenbäume und Nadelbäume, aber nicht mitten auf der Weide und der Lichtung
platz.sperren(59, 5, 27, 20);
platz.sperren(64, 42, 18, 10);
platz.streuen('baum', 70, { boden: '.n', zone: [4, 4, 82, 62], seed: 50, abstand: 1, neu: (x, y) => ({ art: rauschen(x / 7, y / 7, 3) > 0.55 ? 'kiefer' : undefined }) });

const bereiche = {
  fest: FEST,
  weide: [59, 5, 27, 20],
  lichtung: [62, 40, 22, 14],
  haendlerplatz: [32, 24, 24, 13],
  terrasse: [8, 3, 17, 5],
};

karte({
  id: 'wald', name: 'Wald', aussen: true, wasser: 'fluss', rand: 'wald',
  grid: fertigRaster(g),
  gewaesser: [{ x: 8, y: 44, b: 24, h: 18, art: 'waldsee' }],
  gebaeude: GEBAEUDE,
  deko: platz.deko,
  warps: [
    { x: 44, y: 0, w: 2, h: 1, karte: 'hof', punkt: 'vonWald' },
    { x: 89, y: 30, w: 1, h: 2, karte: 'dorf', punkt: 'vonWald' },
    { x: 0, y: 62, w: 1, h: 2, karte: 'geheimwald', punkt: 'vonWald' },
  ],
  punkte: PUNKTE,
  bereiche,
  sammel: [
    { x: 2, y: 2, w: 40, h: 40, art: 'wald', max: 14 },
    { x: 46, y: 36, w: 42, h: 18, art: 'wald', max: 10 },
    { x: 2, y: 58, w: 86, h: 10, art: 'wald', max: 8 },
    { x: 58, y: 4, w: 28, h: 21, art: 'wiese', max: 6 },
    { x: 62, y: 40, w: 22, h: 14, art: 'wiese', max: 8 },
    { x: 46, y: 2, w: 40, h: 22, art: 'wald', max: 8 },
    { x: 4, y: 28, w: 30, h: 16, art: 'wiese', max: 5 },
    { x: 7, y: 3, w: 20, h: 6, art: 'wiese', max: 3, boden: 'n' },
    { x: 4, y: 4, w: 82, h: 58, art: 'wald', max: 8, boden: 'n' },
  ],
});

/** Für die Besiedlung (leben.js): was frei bleibt, wenn Bäume und Steine wachsen. */
export const WILD_WALD = {
  frei: [
    { x: 58, y: 4, w: 29, h: 22 },    // Ranchweide
    { x: 32, y: 24, w: 24, h: 13 },   // Händlerplatz
    { x: 32, y: 10, w: 9, h: 9 },     // Holzfällerlager
    { x: 8, y: 2, w: 18, h: 8 },      // Aussichtsterrasse
    { x: 6, y: 9, w: 20, h: 12 },     // Turm
    { x: 62, y: 40, w: 22, h: 14 },   // Lichtung
    { x: 8, y: 42, w: 24, h: 18 },    // Waldsee
    { x: 0, y: 58, w: 12, h: 10 },    // Weg zum Geheimen Wald
    { x: 84, y: 26, w: 6, h: 10 },    // Ausgang ins Dorf
    { x: 42, y: 0, w: 6, h: 8 },      // Eingang vom Hof
  ],
};
