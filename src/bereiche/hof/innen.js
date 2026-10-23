// Bereich „hof": das Wohnhaus von innen in drei Ausbaustufen (haus, haus1, haus2) und das Gewächshaus.
//
//   haus   (Stufe 0)  14×11  eine Stube mit Bett, Kamin, Fernseher und kleiner Kochecke
//   haus1  (Stufe 1)  26×11  Stube links, Küche mit Herd und Kühlschrank rechts
//   haus2  (Stufe 2)  26×20  unten Stube und Küche wie in Stufe 1, oben Schlafzimmer und Kinderzimmer
//
// Die Stube liegt in allen Stufen an derselben Stelle (x 1–12), die Haustür ebenso; Stufe 2 schiebt die
// untere Hälfte um STUFE2_VERSATZ Felder nach unten. So lassen sich aufgestellte Dinge beim Ausbau
// mitnehmen (siehe `uebertragen` in inhalt.js). Alle Karten tragen die Vertragspunkte eingang, bett,
// fernseher, kueche und partner.

import { karte, raster, rechteck, fertigRaster } from '../../karten.js';

export const STUFE2_VERSATZ = 9;
/** Feld des Kühlschranks (Behälter-Objekt) je Karte. */
export const KUEHLSCHRANK = { haus1: [14, 2], haus2: [14, 2 + STUFE2_VERSATZ] };
/** Karte des Wohnhauses je Ausbaustufe. */
export const HAUS_KARTEN = ['haus', 'haus1', 'haus2'];

const wand = (typ, x, y, extra = {}) => ({ typ, x, y, wand: true, ...extra });
const mb = (typ, x, y, extra = {}) => ({ typ, x, y, ...extra });

// ─── Raster ─────────────────────────────────────────────────────────────────

/** Innenraum aus Wänden; `unten` ist die Zeile der unteren Wand. */
function haupt(b, h, tuerX) {
  const g = raster(b, h, '_');
  rechteck(g, 0, 0, b, 2, '#');
  rechteck(g, 0, 0, 1, h, '#');
  rechteck(g, b - 1, 0, 1, h, '#');
  rechteck(g, 0, h - 1, b, 1, '#');
  g[h - 1][tuerX] = '_';
  return g;
}

function rasterStufe(stufe) {
  if (stufe === 0) {
    const g = haupt(14, 11, 6);
    rechteck(g, 3, 4, 6, 5, 't');
    return g;
  }
  const dy = stufe === 2 ? STUFE2_VERSATZ : 0;
  const g = haupt(26, 11 + dy, 6);
  // Trennwand zwischen Stube und Küche mit breiter Öffnung
  rechteck(g, 13, 2 + dy, 1, 8, '#');
  rechteck(g, 13, 6 + dy, 1, 3, '_');
  rechteck(g, 14, 2 + dy, 11, 8, 'd');
  rechteck(g, 3, 4 + dy, 6, 5, 't');
  rechteck(g, 17, 5 + dy, 4, 3, 't');
  if (stufe === 2) {
    // oben: Schlafzimmer und Kinderzimmer, getrennt durch eine Wand mit Tür
    rechteck(g, 0, 9, 26, 2, '#');
    rechteck(g, 13, 2, 1, 7, '#');
    rechteck(g, 13, 4, 1, 3, '_');
    rechteck(g, 6, 9, 1, 2, '_');      // Schlafzimmer ↔ Stube
    rechteck(g, 23, 9, 2, 2, '_');     // Kinderzimmer ↔ Küche
    rechteck(g, 4, 4, 5, 3, 't');
    rechteck(g, 16, 4, 6, 4, 't');
  }
  return g;
}

// ─── Möbel ──────────────────────────────────────────────────────────────────

function stube(stufe, dy) {
  const d = [
    wand('hof_fenster', 3, 1 + dy, { w: 2 }),
    wand('bild', 5, 1 + dy),
    wand('kamin', 7, 0 + dy, { w: 2, h: 2, licht: 3 }),
    mb('tv', 5, 2 + dy, { aktion: 'tv' }),
    mb('pflanze', 9, 2 + dy),
    mb('hof_sofa', 4, 6 + dy, { w: 3 }),
    mb('kiste', 1, 8 + dy),
    mb('pflanze', 12, 9 + dy),
  ];
  if (stufe === 0) {
    d.push(
      mb('bett', 1, 2, { w: 2, h: 2, aktion: 'bett' }),
      mb('hof_nachttisch', 3, 2, { licht: 3 }),
      mb('herd', 10, 2, { aktion: 'kochen' }),
      mb('hof_kuechenzeile', 11, 2, { w: 2 }),
      wand('hof_fenster', 11, 1, { w: 2 }),
      mb('hof_esstisch', 9, 7, { w: 2 }),
    );
  } else {
    d.push(
      mb('hof_buecherregal', 10, 2 + dy, { w: 3 }),
      mb('hof_stehlampe', 12, 8 + dy, { licht: 5 }),
    );
    if (stufe === 1) d.push(mb('bett', 1, 2, { w: 2, h: 2, aktion: 'bett' }), mb('hof_nachttisch', 3, 2, { licht: 3 }));
    else d.push(mb('hof_buecherregal', 1, 2 + dy, { w: 2 }), mb('hof_kommode', 3, 2 + dy));
  }
  return d;
}

function kueche(dy) {
  return [
    wand('hof_fenster', 15, 1 + dy, { w: 2 }),
    wand('hof_fenster', 21, 1 + dy, { w: 2 }),
    mb('hof_kuechenzeile', 15, 2 + dy, { w: 2 }),
    mb('herd', 17, 2 + dy, { aktion: 'kochen' }),
    mb('hof_kuechenzeile', 18, 2 + dy, { w: 2 }),
    mb('hof_kuechenzeile', 20, 2 + dy, { w: 2 }),
    mb('pflanze', 22, 2 + dy),
    mb('hof_esstisch', 18, 6 + dy, { w: 2 }),
    mb('hof_stehlampe', 24, 8 + dy, { licht: 5 }),
    mb('kiste', 14, 8 + dy),
  ];
}

const schlafzimmer = () => [
  wand('hof_fenster', 2, 1, { w: 2 }),
  wand('hof_fenster', 9, 1, { w: 2 }),
  wand('bild', 6, 1),
  mb('hof_kommode', 1, 2),
  mb('hof_nachttisch', 4, 2, { licht: 3 }),
  mb('hof_doppelbett', 5, 2, { w: 3, h: 2, aktion: 'bett' }),
  mb('hof_nachttisch', 8, 2, { licht: 3 }),
  mb('hof_schrank', 10, 2, { w: 2 }),
  mb('pflanze', 12, 2),
  mb('hof_stehlampe', 1, 7, { licht: 5 }),
  mb('kiste', 11, 7),
];

const kinderzimmer = () => [
  wand('hof_fenster', 19, 1, { w: 2 }),
  wand('bild', 16, 1),
  mb('hof_kinderbett', 15, 2, { h: 2 }),
  mb('hof_kinderbett', 17, 2, { h: 2 }),
  mb('hof_wiege', 22, 2),
  mb('pflanze', 24, 2),
  mb('hof_schaukelpferd', 15, 6),
  mb('hof_spielzeug', 21, 6, { w: 2 }),
];

// ─── Karten ─────────────────────────────────────────────────────────────────

const WARP_STUFE = (hoehe) => [{ x: 6, y: hoehe - 1, w: 1, h: 1, karte: 'hof', punkt: 'vorHaus' }];

karte({
  id: 'haus', name: 'Dein Haus', aussen: false, innen: 'haus', rand: 'hof_haus', npcWege: false, aufstellen: true, zuhause: true,
  grid: fertigRaster(rasterStufe(0)),
  deko: stube(0, 0),
  warps: WARP_STUFE(11),
  punkte: {
    eingang: [6, 9, 'oben'],
    bett: [3, 4, 'unten'],
    fernseher: [5, 3, 'oben'],
    kueche: [10, 3, 'oben'],
    partner: [8, 4, 'unten'],
  },
});

karte({
  id: 'haus1', name: 'Dein Haus', aussen: false, innen: 'haus', rand: 'hof_haus', npcWege: false, aufstellen: true, zuhause: true,
  grid: fertigRaster(rasterStufe(1)),
  deko: [...stube(1, 0), ...kueche(0)],
  warps: WARP_STUFE(11),
  punkte: {
    eingang: [6, 9, 'oben'],
    bett: [3, 4, 'unten'],
    fernseher: [5, 3, 'oben'],
    kueche: [17, 3, 'oben'],
    partner: [8, 4, 'unten'],
  },
});

const D = STUFE2_VERSATZ;
karte({
  id: 'haus2', name: 'Dein Haus', aussen: false, innen: 'haus', rand: 'hof_haus', npcWege: false, aufstellen: true, zuhause: true,
  grid: fertigRaster(rasterStufe(2)),
  deko: [...stube(2, D), ...kueche(D), ...schlafzimmer(), ...kinderzimmer()],
  warps: WARP_STUFE(11 + D),
  punkte: {
    eingang: [6, 9 + D, 'oben'],
    bett: [6, 4, 'unten'],
    fernseher: [5, 3 + D, 'oben'],
    kueche: [17, 3 + D, 'oben'],
    partner: [7, 4, 'unten'],
  },
});

// ─── Gewächshaus ────────────────────────────────────────────────────────────
// 18×15: 12×10 Erde in zwei Beeten links und rechts eines Mittelgangs, davor ein Gang und die Tür.

function gewaechshausRaster() {
  const g = haupt(18, 15, 8);
  rechteck(g, 1, 2, 16, 12, 'a');
  rechteck(g, 2, 2, 6, 10, 'c');
  rechteck(g, 10, 2, 6, 10, 'c');
  return g;
}

karte({
  id: 'gewaechshaus', name: 'Gewächshaus', aussen: false, innen: 'hof_gewaechshaus', rand: 'hof_glas', farmbar: true, ganzjaehrig: true,
  aufstellen: true, npcWege: false,
  grid: fertigRaster(gewaechshausRaster()),
  deko: [
    wand('hof_glasscheibe', 2, 1, { w: 3 }), wand('hof_glasscheibe', 7, 1, { w: 4 }), wand('hof_glasscheibe', 13, 1, { w: 3 }),
    mb('hof_regentonne', 1, 13), mb('pflanze', 16, 13), mb('hof_stehlampe', 16, 12, { licht: 5 }),
    mb('kiste', 1, 12),
  ],
  warps: [{ x: 8, y: 14, w: 1, h: 1, karte: 'hof', punkt: 'vorGewaechshaus' }],
  punkte: { eingang: [8, 13, 'oben'], beet1: [8, 6], beet2: [9, 6] },
});
