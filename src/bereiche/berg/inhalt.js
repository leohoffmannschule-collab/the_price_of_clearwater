// Bereich „berg": der Berg nördlich von Hof und Dorf (vorerst ein kleiner Platzhalter mit allen
// Rand-Punkten des Weltgraphen) mit Mineneingang, Bergsee, Zimmerei und Abenteurergilde, dazu
// die Platzhalter-Innenräume zimmerei und gilde mit ihren Pflicht-Punkten. Person und Laden der
// Zimmerei liefert „tiere", die der Gilde „mine"; der Mineneingang führt auf mine0 (Bereich mine).

import { karte, raster, rechteck, ellipse, pfad, raum, fertigRaster } from '../../karten.js';

// ─── Berg (Platzhalter) ─────────────────────────────────────────────────────

const berg = raster(30, 20, '.');
rechteck(berg, 0, 0, 30, 2, '#');
rechteck(berg, 0, 18, 30, 2, '#');
rechteck(berg, 0, 0, 1, 20, '#');
rechteck(berg, 29, 0, 1, 20, '#');
rechteck(berg, 1, 2, 28, 2, 'X');
pfad(berg, [[5, 19], [5, 8], [24, 8], [24, 19]], 2, ':');
// Weg zum Mineneingang; in der Klippe nur das Türfeld, damit kein Weg neben der Höhle durchscheint
pfad(berg, [[8, 4], [8, 8]], 2, ':');
rechteck(berg, 8, 3, 1, 1, ':');
ellipse(berg, 21, 5, 3.4, 1.4, '~');

karte({
  id: 'berg', name: 'Am Berg', aussen: true, wasser: 'see', rand: 'fels',
  grid: fertigRaster(berg),
  gebaeude: [
    {
      typ: 'hoehle', x: 7, y: 2, w: 3, h: 2, tuer: { x: 8, y: 3 }, ziel: { karte: 'mine0', punkt: 'eingang' }, tuerWenn: 'mineOffen',
      sonst: 'Geröll versperrt den Eingang. Jemand mit kräftigen Armen müsste es wegräumen.',
    },
    { typ: 'zimmerei', x: 11, y: 4, w: 5, h: 4, tuer: { x: 13, y: 7 }, ziel: { karte: 'zimmerei', punkt: 'eingang' } },
    { typ: 'gilde', x: 17, y: 11, w: 5, h: 4, tuer: { x: 19, y: 14 }, ziel: { karte: 'gilde', punkt: 'eingang' } },
  ],
  deko: [
    { typ: 'schild', x: 7, y: 10, aktion: 'text', text: 'Am Berg. Oben die alte Mine, unten links dein Hof, unten rechts das Dorf.' },
    { typ: 'felsen', x: 3, y: 5 }, { typ: 'felsen', x: 13, y: 15 }, { typ: 'felsen', x: 11, y: 14 },
    { typ: 'felsen', x: 10, y: 11 }, { typ: 'felsen', x: 27, y: 11 },
    { typ: 'baum', x: 2, y: 13, art: 'kiefer' }, { typ: 'baum', x: 27, y: 5, art: 'kiefer' }, { typ: 'busch', x: 27, y: 15 },
  ],
  warps: [
    { x: 5, y: 19, w: 2, h: 1, karte: 'hof', punkt: 'vonBerg' },
    { x: 24, y: 19, w: 2, h: 1, karte: 'dorf', punkt: 'vonBerg' },
  ],
  punkte: {
    vonHof: [5, 17, 'oben'],
    vonDorf: [24, 17, 'oben'],
    vorMine: [8, 4, 'unten'],
    vorZimmerei: [13, 8],
    vorGilde: [19, 15],
    see1: [21, 7, 'oben'],
    steinbruch: [12, 16],
  },
  sammel: [{ x: 1, y: 10, w: 28, h: 8, art: 'berg', max: 2 }],
});

// ─── Platzhalter-Innenräume ─────────────────────────────────────────────────

karte({
  id: 'zimmerei', name: 'Zimmerei', aussen: false,
  grid: fertigRaster(raum(12, 9)),
  deko: [
    { typ: 'theke', x: 2, y: 4, w: 4, aktion: 'laden', laden: 'zimmerei' },
    { typ: 'fenster', x: 3, y: 1, wand: true }, { typ: 'fenster', x: 8, y: 1, wand: true },
    { typ: 'tisch', x: 8, y: 2 }, { typ: 'kiste', x: 10, y: 2 }, { typ: 'kiste', x: 1, y: 7 },
  ],
  warps: [{ x: 5, y: 8, w: 1, h: 1, karte: 'berg', punkt: 'vorZimmerei' }],
  punkte: {
    eingang: [5, 7, 'oben'],
    theke: [3, 3, 'unten'],
    werkbank: [8, 3, 'oben'],
    bett_greta: [9, 5],
    bett_kai: [10, 7],
    bett_nele: [7, 6],
  },
});

karte({
  id: 'gilde', name: 'Abenteurergilde', aussen: false,
  grid: fertigRaster(raum(12, 9)),
  deko: [
    { typ: 'theke', x: 2, y: 4, w: 4, aktion: 'laden', laden: 'gilde' },
    { typ: 'kamin', x: 7, y: 0, w: 2, h: 2, wand: true, licht: 3 },
    { typ: 'bild', x: 3, y: 1, wand: true }, { typ: 'kiste', x: 10, y: 2 }, { typ: 'tisch', x: 9, y: 5 },
  ],
  warps: [{ x: 5, y: 8, w: 1, h: 1, karte: 'berg', punkt: 'vorGilde' }],
  punkte: {
    eingang: [5, 7, 'oben'],
    theke: [3, 3, 'unten'],
    bett_alrik: [9, 3],
  },
});
