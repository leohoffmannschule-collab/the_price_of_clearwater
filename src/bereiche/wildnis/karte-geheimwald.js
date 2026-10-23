// Der Geheime Wald: 40×30 Felder hinter dem umgestürzten Stamm. Moos, ein stilles Teichlein,
// ein verwitterter Schrein, leuchtende Pilze und große Hartholz-Stümpfe, die jede Woche
// ein Stück nachwachsen.

import { karte, raster, rechteck, ellipse, pfad, fertigRaster } from '../../karten.js';
import { Platz, rauschen } from './bau.js';
import { hash } from '../../zufall.js';

const B = 40;
const H = 30;

const g = raster(B, H, '#');
ellipse(g, 20, 15, 17.5, 11.5, 'q');
ellipse(g, 12, 10, 8, 6, 'q');
ellipse(g, 28, 20, 9, 6, 'q');
ellipse(g, 9, 21, 5, 4, 'q');
ellipse(g, 31, 8, 6, 4, 'q');
pfad(g, [[39, 14], [30, 15]], 2, 'n');
// Gras und Waldboden im Moos
for (let y = 2; y < H - 2; y++) {
  for (let x = 2; x < B - 2; x++) {
    if (g[y][x] !== 'q') continue;
    const r = rauschen(x / 4, y / 4, 61);
    if (r > 0.62) g[y][x] = '.';
    else if (r < 0.22) g[y][x] = 'n';
  }
}
ellipse(g, 17, 13, 7, 4.6, 'o');
ellipse(g, 17, 13, 5.6, 3.4, '~');
pfad(g, [[39, 14], [30, 15]], 2, 'n');
rechteck(g, 38, 14, 2, 2, 'n');

const PUNKTE = {
  vonWald: [37, 14, 'links'],
  teich: [24, 13, 'links'],
  schrein: [19, 6, 'oben'],
  lichtung: [8, 21],
};
for (const [x, y] of Object.values(PUNKTE)) if (g[y][x] === '#') g[y][x] = 'q';
// Teichufer, kleiner Schreinplatz
rechteck(g, 17, 5, 5, 3, 'q');

/** Plätze der großen Hartholz-Stümpfe: feste Felder, die nachts nachwachsen (leben.js). */
export const STUMPF_PLAETZE = [];
for (let i = 0; STUMPF_PLAETZE.length < 18 && i < 600; i++) {
  const x = 3 + Math.floor(hash(i, 1, 90) * (B - 6));
  const y = 3 + Math.floor(hash(i, 2, 90) * (H - 6));
  if (!'.qn'.includes(g[y][x])) continue;
  if (STUMPF_PLAETZE.some(([a, b]) => Math.abs(a - x) < 4 && Math.abs(b - y) < 3)) continue;
  if (Object.values(PUNKTE).some(([a, b]) => Math.abs(a - x) < 3 && Math.abs(b - y) < 3)) continue;
  if (x > 27 && y > 11 && y < 18) continue;
  if (g[y][x - 1] === '~' || g[y][x + 1] === '~' || g[y - 1][x] === '~' || g[y + 1][x] === '~') continue;
  STUMPF_PLAETZE.push([x, y]);
}

const platz = new Platz(g);
for (const [x, y] of Object.values(PUNKTE)) platz.sperren(x, y, 1, 1, 2);
for (const [x, y] of STUMPF_PLAETZE) platz.sperren(x, y, 1, 1, 1);
platz.sperren(28, 12, 12, 6, 0);

platz.setzeAlle([
  { typ: 'wildnis_schrein', x: 19, y: 4, w: 2, h: 2, licht: 4 },
  { typ: 'wildnis_uralteiche', x: 5, y: 5, w: 2, h: 2 }, { typ: 'wildnis_uralteiche', x: 33, y: 22, w: 2, h: 2 },
  { typ: 'wildnis_uralteiche', x: 28, y: 5, w: 2, h: 2 },
  { typ: 'wildnis_sitzstamm', x: 23, y: 15, w: 2 },
]);
platz.streuen('wildnis_leuchtpilz', 26, { boden: 'qn.', zone: [3, 3, 34, 24], seed: 62, abstand: 1, neu: (x, y, i) => ({ art: i % 3, licht: 3 }) });
platz.streuen('wildnis_findling', 8, { boden: 'q.', zone: [3, 3, 34, 24], seed: 63, abstand: 2 });
platz.streuen('wildnis_farn', 90, { boden: 'qn.', zone: [3, 3, 34, 24], seed: 64, abstand: 0, neu: () => ({ begehbar: true }), sperrt: false, versuche: 1500 });
platz.streuen('wildnis_wildblumen', 50, { boden: 'q.', zone: [3, 3, 34, 24], seed: 65, abstand: 0, neu: (x, y, i) => ({ art: i % 4, begehbar: true }), sperrt: false, versuche: 800 });
platz.streuen('wildnis_pilze', 30, { boden: 'qn', zone: [3, 3, 34, 24], seed: 66, abstand: 0, neu: (x, y, i) => ({ art: i % 3, begehbar: true }), sperrt: false, versuche: 800 });
platz.streuen('wildnis_schilf', 24, { boden: 'o', zone: [8, 7, 20, 14], seed: 67, abstand: 0, neu: () => ({ begehbar: true }), sperrt: false, versuche: 400 });
platz.streuen('wildnis_seerose', 10, { boden: '~', zone: [12, 9, 11, 8], seed: 68, abstand: 0, neu: (x, y, i) => ({ art: i % 2, begehbar: true }), sperrt: false, versuche: 200 });
platz.streuen('baum', 22, { boden: 'q.n', zone: [3, 3, 34, 24], seed: 69, abstand: 1, neu: (x, y) => ({ art: rauschen(x / 5, y / 5, 8) > 0.5 ? 'kiefer' : undefined }) });
platz.streuen('busch', 20, { boden: 'q.', zone: [3, 3, 34, 24], seed: 70, abstand: 1 });

karte({
  id: 'geheimwald', name: 'Geheimer Wald', aussen: true, wasser: 'geheimteich', rand: 'wald', npcWege: false,
  grid: fertigRaster(g),
  gewaesser: [{ x: 10, y: 8, b: 15, h: 11, art: 'geheimteich' }],
  deko: platz.deko,
  warps: [{ x: 39, y: 14, w: 1, h: 2, karte: 'wald', punkt: 'vorGeheimwald' }],
  punkte: PUNKTE,
  bereiche: { teich: [10, 8, 15, 11], hain: [3, 3, 34, 24] },
  sammel: [
    { x: 3, y: 3, w: 34, h: 24, art: 'geheimwald', max: 12 },
    { x: 3, y: 3, w: 34, h: 24, art: 'geheimwald', max: 8, boden: 'q' },
    { x: 3, y: 3, w: 34, h: 24, art: 'geheimwald', max: 4, boden: 'n' },
  ],
});
