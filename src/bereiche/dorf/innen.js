// Bereich „dorf": die Innenräume – Krämerladen, Gasthaus, Schmiede, Rathaus, Arztpraxis, Museum mit
// Bibliothek, Haus Rosa und die Mühle. Alle haben die Pflicht-Punkte des Punkte-Vertrags; Theken,
// Betten und Möbel stehen so, dass an den Punkten Platz zum Stehen bleibt.

import { karte, raum, rechteck, fertigRaster } from '../../karten.js';

/**
 * Innenraum b×h: Wand oben (zwei Reihen), Türlücke unten bei tuerX, Ausgang vor das Gebäude.
 * `teppich`: Rechtecke [x, y, b, h] mit Teppichboden.
 */
function innenraum({ id, name, innen, b, h, tuerX, vor, teppich = [], deko, punkte, boden }) {
  const g = raum(b, h, { tuerX, boden });
  for (const [x, y, w, hh] of teppich) rechteck(g, x, y, w, hh, 't');
  karte({
    id, name, aussen: false, innen,
    grid: fertigRaster(g),
    deko,
    warps: [{ x: tuerX, y: h - 1, w: 1, h: 1, karte: 'dorf', punkt: vor }],
    punkte: { eingang: [tuerX, h - 2, 'oben'], ...punkte },
  });
}

const fenster = (x) => ({ typ: 'fenster', x, y: 1, wand: true });
const lampe = (x, licht = 5) => ({ typ: 'dorf_lampe', x, y: 1, wand: true, licht });
const bett = (x, y) => ({ typ: 'bett', x, y, w: 2, h: 2 });

// ─── Krämerladen (Ottilie) ──────────────────────────────────────────────────

innenraum({
  id: 'laden', name: 'Krämerladen', innen: 'laden', b: 18, h: 11, tuerX: 8, vor: 'vorLaden',
  teppich: [[7, 5, 3, 5], [12, 5, 5, 4]],
  deko: [
    fenster(3), fenster(6), fenster(13), lampe(5), lampe(11),
    { typ: 'theke', x: 3, y: 5, w: 5, aktion: 'laden', laden: 'laden' },
    { typ: 'regal', x: 2, y: 2, w: 2 }, { typ: 'regal', x: 5, y: 2, w: 2 }, { typ: 'regal', x: 8, y: 2, w: 2 },
    { typ: 'saatregal', x: 10, y: 2, w: 2 },
    { typ: 'saatregal', x: 11, y: 6, w: 1 },
    bett(12, 2), bett(14, 2),
    { typ: 'tisch', x: 14, y: 7 },
    { typ: 'dorf_hocker', x: 13, y: 7 }, { typ: 'dorf_hocker', x: 15, y: 7 },
    { typ: 'kiste', x: 16, y: 5 },
    { typ: 'fass', x: 1, y: 8 }, { typ: 'fass', x: 1, y: 7 }, { typ: 'fass', x: 16, y: 9 },
    { typ: 'pflanze', x: 1, y: 2 }, { typ: 'pflanze', x: 16, y: 2 },
    { typ: 'dorf_tafel', x: 5, y: 7, text: 'Heute im Angebot: Saatgut, Dünger und gute Laune. Der Dünger riecht nach beidem.' , aktion: 'text' },
  ],
  punkte: { theke: [4, 4, 'unten'], regal: [9, 3, 'oben'], bett_ottilie: [13, 4, 'oben'], bett_jonas: [15, 4, 'oben'] },
});

// ─── Gasthaus „Zum Krug" (Hannes) ───────────────────────────────────────────

innenraum({
  id: 'gasthaus', name: 'Gasthaus „Zum Krug"', innen: 'gasthaus', b: 20, h: 13, tuerX: 9, vor: 'vorGasthaus',
  teppich: [[2, 5, 8, 6], [8, 9, 3, 3]],
  deko: [
    { typ: 'kamin', x: 2, y: 0, w: 2, h: 2, wand: true, licht: 3 },
    fenster(6), fenster(17), lampe(7), lampe(14),
    { typ: 'bild', x: 5, y: 1, wand: true },
    { typ: 'flaschen', x: 10, y: 1, w: 6, wand: true },
    { typ: 'theke', x: 10, y: 4, w: 7, art: 'krug', aktion: 'laden', laden: 'gasthaus' },
    { typ: 'dorf_hocker', x: 10, y: 5 }, { typ: 'dorf_hocker', x: 12, y: 5 }, { typ: 'dorf_hocker', x: 15, y: 5 },
    { typ: 'tisch', x: 4, y: 6 }, { typ: 'dorf_hocker', x: 3, y: 6 }, { typ: 'dorf_hocker', x: 5, y: 6 }, { typ: 'dorf_hocker', x: 4, y: 7 },
    { typ: 'tisch', x: 7, y: 9 }, { typ: 'dorf_hocker', x: 6, y: 9 }, { typ: 'dorf_hocker', x: 8, y: 9 }, { typ: 'dorf_hocker', x: 7, y: 10 },
    { typ: 'tisch', x: 3, y: 10 }, { typ: 'dorf_hocker', x: 2, y: 10 }, { typ: 'dorf_hocker', x: 4, y: 10 },
    { typ: 'dorf_billard', x: 13, y: 8, w: 3, h: 2 },
    { typ: 'dorf_tafel', x: 12, y: 11, text: 'Tagesgericht: Fischsuppe. Nach Lenes Rezept. Beschwerden an Lene.', aktion: 'text' },
    bett(17, 2),
    { typ: 'fass', x: 18, y: 6 }, { typ: 'fass', x: 18, y: 7 }, { typ: 'kiste', x: 18, y: 9 },
    { typ: 'pflanze', x: 1, y: 2 }, { typ: 'pflanze', x: 1, y: 11 }, { typ: 'pflanze', x: 18, y: 11 },
  ],
  punkte: {
    theke: [13, 3, 'unten'], tisch1: [4, 5], tisch2: [7, 8], tisch3: [3, 4], kamin: [3, 3], billard: [12, 8, 'rechts'],
    bett_hannes: [16, 3], tresen1: [11, 5, 'oben'], tresen2: [14, 5, 'oben'],
  },
});

// ─── Schmiede (Bruno) ───────────────────────────────────────────────────────

innenraum({
  id: 'schmiede', name: 'Schmiede', innen: 'schmiede', b: 14, h: 10, tuerX: 6, vor: 'vorSchmiede', boden: '=',
  teppich: [],
  deko: [
    fenster(4), lampe(7, 4),
    { typ: 'dorf_werkzeugwand', x: 1, y: 1, w: 3, wand: true },
    { typ: 'theke', x: 2, y: 4, w: 3 },
    { typ: 'dorf_esse', x: 9, y: 2, w: 2, h: 2, licht: 5 },
    { typ: 'dorf_kohlehaufen', x: 11, y: 2 },
    { typ: 'amboss', x: 7, y: 5 }, { typ: 'fass', x: 8, y: 6 },
    bett(11, 5),
    { typ: 'kiste', x: 1, y: 7 }, { typ: 'kiste', x: 2, y: 7 }, { typ: 'dorf_holzstapel', x: 12, y: 8 },
    { typ: 'pflanze', x: 1, y: 2 },
  ],
  punkte: { theke: [3, 3, 'unten'], amboss: [6, 5, 'rechts'], bett_bruno: [10, 5] },
});

// ─── Rathaus (Frieda) ───────────────────────────────────────────────────────

innenraum({
  id: 'rathaus', name: 'Rathaus', innen: 'rathaus', b: 16, h: 11, tuerX: 7, vor: 'vorRathaus',
  teppich: [[5, 4, 6, 3], [6, 7, 3, 3]],
  deko: [
    fenster(3), fenster(11), lampe(5), lampe(10),
    { typ: 'dorf_wappen', x: 7, y: 0, w: 2, h: 2, wand: true },
    { typ: 'bild', x: 3, y: 1, wand: true }, { typ: 'bild', x: 12, y: 1, wand: true },
    { typ: 'regal', x: 1, y: 2, w: 2 }, { typ: 'regal', x: 11, y: 2, w: 2 },
    { typ: 'dorf_schreibtisch', x: 6, y: 3, w: 3 },
    { typ: 'dorf_ratstisch', x: 5, y: 7, w: 6 },
    { typ: 'dorf_hocker', x: 4, y: 7 }, { typ: 'dorf_hocker', x: 11, y: 7 },
    { typ: 'dorf_hocker', x: 6, y: 8 }, { typ: 'dorf_hocker', x: 8, y: 8 }, { typ: 'dorf_hocker', x: 10, y: 8 },
    { typ: 'dorf_fahne', x: 4, y: 2 }, { typ: 'dorf_fahne', x: 11, y: 4 },
    bett(13, 2),
    { typ: 'pflanze', x: 1, y: 8 }, { typ: 'pflanze', x: 14, y: 8 },
    { typ: 'kiste', x: 14, y: 5 },
  ],
  punkte: { schreibtisch: [7, 4, 'oben'], bett_frieda: [13, 4, 'oben'] },
});

// ─── Arztpraxis (Theo) ──────────────────────────────────────────────────────

innenraum({
  id: 'arzt', name: 'Arztpraxis', innen: 'arzt', b: 13, h: 10, tuerX: 6, vor: 'vorArzt',
  teppich: [[2, 6, 7, 3]],
  deko: [
    fenster(5), fenster(9), lampe(3),
    { typ: 'theke', x: 2, y: 4, w: 3 },
    { typ: 'dorf_medschrank', x: 6, y: 2 }, { typ: 'dorf_medschrank', x: 8, y: 2 },
    { typ: 'dorf_liege', x: 10, y: 2, w: 2 },
    { typ: 'dorf_skelett', x: 1, y: 2 },
    { typ: 'bank', x: 2, y: 7, w: 2 }, { typ: 'bank', x: 5, y: 7, w: 2 },
    { typ: 'dorf_waage', x: 8, y: 6 },
    bett(10, 5),
    { typ: 'pflanze', x: 1, y: 8 }, { typ: 'pflanze', x: 11, y: 8 },
  ],
  punkte: { theke: [3, 3, 'unten'], bett_theo: [9, 5] },
});

// ─── Museum mit Bibliothek (Mira) ───────────────────────────────────────────

innenraum({
  id: 'museum', name: 'Museum', innen: 'museum', b: 20, h: 13, tuerX: 9, vor: 'vorMuseum',
  teppich: [[5, 4, 8, 6], [13, 4, 5, 5]],
  deko: [
    fenster(3), fenster(9), fenster(17), lampe(6), lampe(12), lampe(16),
    { typ: 'bild', x: 5, y: 1, wand: true }, { typ: 'bild', x: 13, y: 1, wand: true },
    { typ: 'theke', x: 2, y: 4, w: 4 },
    { typ: 'dorf_vitrine', x: 6, y: 2, w: 2 }, { typ: 'dorf_vitrine', x: 9, y: 2, w: 2 },
    { typ: 'dorf_vitrine', x: 6, y: 6, w: 2 }, { typ: 'dorf_vitrine', x: 9, y: 6, w: 2 },
    { typ: 'dorf_vitrine', x: 6, y: 9, w: 2 }, { typ: 'dorf_vitrine', x: 9, y: 9, w: 2 },
    { typ: 'dorf_fossil', x: 1, y: 8, w: 3, h: 2 },
    { typ: 'regal', x: 12, y: 2, w: 2 }, { typ: 'regal', x: 14, y: 2, w: 2 }, { typ: 'regal', x: 16, y: 2, w: 2 },
    { typ: 'tisch', x: 14, y: 5 }, { typ: 'tisch', x: 17, y: 5 }, { typ: 'dorf_hocker', x: 13, y: 5 }, { typ: 'dorf_hocker', x: 16, y: 5 },
    { typ: 'dorf_lesepult', x: 13, y: 8 },
    bett(17, 9),
    { typ: 'pflanze', x: 1, y: 2 }, { typ: 'pflanze', x: 1, y: 11 }, { typ: 'pflanze', x: 18, y: 11 },
    { typ: 'dorf_tafel', x: 4, y: 11, text: 'Die Ausstellung wächst, sobald du Fundstücke bringst. Mira freut sich über alles, was glitzert, rostet oder alt riecht.', aktion: 'text' },
  ],
  punkte: { theke: [3, 3, 'unten'], lesesaal: [15, 6, 'oben'], bett_mira: [16, 9] },
});

// ─── Haus Rosa ──────────────────────────────────────────────────────────────

innenraum({
  id: 'hausRosa', name: 'Haus Rosa', innen: 'wohnhaus', b: 14, h: 11, tuerX: 6, vor: 'vorHausRosa',
  teppich: [[2, 6, 5, 3]],
  deko: [
    fenster(4), fenster(8), lampe(6, 4),
    { typ: 'kamin', x: 9, y: 0, w: 2, h: 2, wand: true, licht: 3 },
    { typ: 'dorf_kuechenzeile', x: 2, y: 2, w: 4 },
    { typ: 'dorf_esstisch', x: 6, y: 5, w: 2 },
    { typ: 'dorf_hocker', x: 5, y: 5 }, { typ: 'dorf_hocker', x: 8, y: 5 }, { typ: 'dorf_hocker', x: 6, y: 6 }, { typ: 'dorf_hocker', x: 7, y: 6 },
    { typ: 'dorf_sofa', x: 2, y: 7, w: 2 },
    bett(10, 5), bett(11, 2),
    { typ: 'pflanze', x: 1, y: 2 }, { typ: 'pflanze', x: 12, y: 9 }, { typ: 'pflanze', x: 1, y: 9 },
  ],
  punkte: { kueche: [3, 3], bett_rosa: [9, 5], bett_pia: [10, 3] },
});

// ─── Mühle ──────────────────────────────────────────────────────────────────

innenraum({
  id: 'muehle', name: 'Mühle', innen: 'muehle', b: 13, h: 10, tuerX: 6, vor: 'vorMuehle',
  teppich: [],
  deko: [
    fenster(3), fenster(9), lampe(6, 4),
    { typ: 'dorf_muehlstein', x: 5, y: 3, w: 2, h: 2, aktion: 'dorf_muehle' },
    { typ: 'dorf_buendeltafel', x: 9, y: 3, aktion: 'dorf_muehle' },
    { typ: 'dorf_mehlsack', x: 1, y: 2 }, { typ: 'dorf_mehlsack', x: 2, y: 2 }, { typ: 'dorf_mehlsack', x: 1, y: 3 },
    { typ: 'dorf_mehlsack', x: 11, y: 2 }, { typ: 'dorf_mehlsack', x: 11, y: 3 },
    { typ: 'kiste', x: 11, y: 6 }, { typ: 'fass', x: 1, y: 7 }, { typ: 'fass', x: 11, y: 7 },
    { typ: 'dorf_holzstapel', x: 2, y: 6 },
  ],
  punkte: { muehlstein: [6, 5, 'oben'] },
});
