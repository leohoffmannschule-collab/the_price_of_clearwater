// Die Innenräume der Wildnis: Lenes Fischladen, die Hütte von Mats, die Ranch und der Turm.
// Laden und Person im Fischladen kommen von „angeln", Wilma und die Ranch-Theke von „tiere".
// Pflicht-Punkte: fischladen eingang/theke/bett_lene, huetteMats eingang/staffelei/bett_mats,
// ranch eingang/theke/bett_wilma/bett_sanne, turm eingang/buch/bett_oswin.

import { karte, raum, rechteck, fertigRaster } from '../../karten.js';

function zimmer(id, name, b, h, { tuerX, innen, vor, punkte, deko, teppich = [] }) {
  const g = raum(b, h, { tuerX });
  for (const t of teppich) rechteck(g, ...t, 't');
  karte({
    id, name, aussen: false, innen, npcWege: true,
    grid: fertigRaster(g),
    deko,
    warps: [{ x: tuerX, y: h - 1, w: 1, h: 1, ...vor }],
    punkte: { eingang: [tuerX, h - 2, 'oben'], ...punkte },
  });
}

const fenster = (x, y = 1) => ({ typ: 'fenster', x, y, wand: true });

// ─── Lenes Fischladen ───────────────────────────────────────────────────────

zimmer('fischladen', 'Lenes Fischladen', 16, 12, {
  tuerX: 7, innen: 'wildnis_fischladen', vor: { karte: 'strand', punkt: 'vorFischladen' },
  punkte: { theke: [4, 3, 'unten'], bett_lene: [3, 8], regal: [8, 3], aquarium: [11, 3, 'oben'] },
  teppich: [[5, 6, 6, 3]],
  deko: [
    fenster(3), fenster(12),
    { typ: 'wildnis_netzwand', x: 5, y: 1, w: 2, wand: true },
    { typ: 'wildnis_haengelampe', x: 7, y: 1, wand: true, licht: 4 },
    { typ: 'wildnis_tafel', x: 9, y: 1, w: 2, wand: true },
    { typ: 'theke', x: 2, y: 4, w: 6, aktion: 'laden', laden: 'fischer' },
    { typ: 'wildnis_regal', x: 2, y: 2, w: 2 }, { typ: 'wildnis_regal', x: 6, y: 2, w: 2 },
    { typ: 'wildnis_aquarium', x: 11, y: 2, w: 2 },
    { typ: 'wildnis_angelstaender', x: 14, y: 2 },
    { typ: 'wildnis_fass', x: 14, y: 5 }, { typ: 'wildnis_fischkiste', x: 14, y: 6 }, { typ: 'wildnis_fischkiste', x: 13, y: 6 },
    { typ: 'wildnis_bett', x: 1, y: 8, w: 2, h: 2 },
    { typ: 'tisch', x: 11, y: 8 }, { typ: 'wildnis_hocker', x: 10, y: 8 }, { typ: 'wildnis_hocker', x: 12, y: 9 },
    { typ: 'pflanze', x: 1, y: 6 }, { typ: 'pflanze', x: 14, y: 9 },
    { typ: 'wildnis_rettungsring', x: 13, y: 1, wand: true },
  ],
});

// ─── Die Hütte von Mats ─────────────────────────────────────────────────────

zimmer('huetteMats', 'Hütte von Mats', 14, 11, {
  tuerX: 6, innen: 'wildnis_huette', vor: { karte: 'strand', punkt: 'vorHuetteMats' },
  punkte: { staffelei: [3, 4, 'oben'], bett_mats: [10, 4], fenster: [7, 3, 'oben'] },
  teppich: [[4, 5, 6, 3]],
  deko: [
    fenster(2), fenster(11),
    { typ: 'wildnis_leinwand', x: 6, y: 1, w: 2, wand: true },
    { typ: 'bild', x: 4, y: 1, wand: true }, { typ: 'bild', x: 9, y: 1, wand: true },
    { typ: 'wildnis_staffelei', x: 3, y: 3 },
    { typ: 'wildnis_farbtisch', x: 5, y: 3, w: 2 }, { typ: 'wildnis_hocker', x: 5, y: 4 },
    { typ: 'wildnis_bett', x: 10, y: 2, w: 2, h: 2 },
    { typ: 'wildnis_leinwandstapel', x: 1, y: 6 }, { typ: 'wildnis_leinwandstapel', x: 1, y: 7 },
    { typ: 'tisch', x: 9, y: 6 }, { typ: 'wildnis_hocker', x: 8, y: 6 },
    { typ: 'wildnis_ofen', x: 1, y: 2 },
    { typ: 'pflanze', x: 12, y: 6 }, { typ: 'kiste', x: 12, y: 8 },
  ],
});

// ─── Die Ranch ──────────────────────────────────────────────────────────────

zimmer('ranch', 'Ranch', 18, 13, {
  tuerX: 8, innen: 'wildnis_ranch', vor: { karte: 'wald', punkt: 'vorRanch' },
  punkte: { theke: [4, 4, 'unten'], bett_wilma: [14, 3], bett_sanne: [14, 8], kueche: [11, 4, 'oben'] },
  teppich: [[3, 8, 8, 3]],
  deko: [
    fenster(2), { typ: 'bild', x: 5, y: 1, wand: true },
    { typ: 'kamin', x: 9, y: 0, w: 2, h: 2, wand: true, licht: 3 },
    fenster(13),
    { typ: 'theke', x: 2, y: 5, w: 6, aktion: 'laden', laden: 'ranch' },
    { typ: 'wildnis_regal', x: 2, y: 3, w: 2 }, { typ: 'wildnis_regal', x: 5, y: 3, w: 2 }, { typ: 'wildnis_milchkanne', x: 7, y: 3 },
    { typ: 'wildnis_ofen', x: 12, y: 2, w: 2 },
    { typ: 'tisch', x: 11, y: 6 }, { typ: 'tisch', x: 12, y: 6 }, { typ: 'wildnis_hocker', x: 11, y: 7 }, { typ: 'wildnis_hocker', x: 12, y: 5 },
    { typ: 'wildnis_bett', x: 15, y: 2, w: 2, h: 2 }, { typ: 'wildnis_bett', x: 15, y: 7, w: 2, h: 2 },
    { typ: 'wildnis_milchkanne', x: 1, y: 8 }, { typ: 'wildnis_milchkanne', x: 1, y: 9 },
    { typ: 'kiste', x: 1, y: 11 }, { typ: 'wildnis_heuballen', x: 2, y: 11 },
    { typ: 'pflanze', x: 16, y: 10 }, { typ: 'pflanze', x: 14, y: 11 },
  ],
});

// ─── Der Turm ───────────────────────────────────────────────────────────────

zimmer('turm', 'Turm', 14, 14, {
  tuerX: 6, innen: 'wildnis_turm', vor: { karte: 'wald', punkt: 'vorTurm' },
  punkte: { buch: [3, 4, 'oben'], bett_oswin: [9, 5], fernrohr: [11, 8, 'rechts'] },
  teppich: [[3, 7, 7, 4]],
  deko: [
    { typ: 'wildnis_buecherregal', x: 1, y: 0, w: 2, h: 2, wand: true }, { typ: 'wildnis_buecherregal', x: 3, y: 0, w: 2, h: 2, wand: true },
    fenster(5), { typ: 'kamin', x: 6, y: 0, w: 2, h: 2, wand: true, licht: 3 }, fenster(8),
    { typ: 'wildnis_buecherregal', x: 9, y: 0, w: 2, h: 2, wand: true }, { typ: 'wildnis_buecherregal', x: 11, y: 0, w: 2, h: 2, wand: true },
    { typ: 'wildnis_sternkarte', x: 4, y: 3, w: 2, wand: true },
    { typ: 'wildnis_lesepult', x: 3, y: 3 },
    { typ: 'wildnis_bett', x: 10, y: 4, w: 2, h: 2 },
    { typ: 'wildnis_globus', x: 2, y: 7 },
    { typ: 'wildnis_sternentisch', x: 6, y: 8 },
    { typ: 'wildnis_alchemietisch', x: 10, y: 9, w: 2 },
    { typ: 'wildnis_fernrohr', x: 12, y: 8 },
    { typ: 'wildnis_buecherstapel', x: 1, y: 3 }, { typ: 'wildnis_buecherstapel', x: 12, y: 6 }, { typ: 'wildnis_buecherstapel', x: 1, y: 11 },
    { typ: 'wildnis_hocker', x: 5, y: 9 }, { typ: 'pflanze', x: 12, y: 11 },
  ],
});
