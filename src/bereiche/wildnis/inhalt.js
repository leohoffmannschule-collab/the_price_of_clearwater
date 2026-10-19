// Bereich „wildnis": Strand und Wald (der Wald vorerst als kleiner Platzhalter mit allen
// Rand-Punkten des Weltgraphen), dazu Platzhalter-Innenräume mit den Pflicht-Punkten:
// Fischladen (Lenes Laden, Tür am Strand), Ranch und Turm (Türen im Wald), Hütte von Mats und
// der Geheime Wald (noch ohne Zugang). Den Laden im Fischladen liefert „angeln", Person und
// Laden der Ranch „tiere".

import { karte, raster, rechteck, ellipse, pfad, raum, fertigRaster } from '../../karten.js';

karte({
  id: 'strand', name: 'Strand', aussen: true, wasser: 'meer', rand: 'fels',
  grid: [
    '#################::#################',
    '#################::#################',
    '#................::................#',
    '#................::................#',
    '#................::................#',
    '#ssssssssssssssss::ssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssssssssssssss#',
    '#ssssssssssssssssssssssshhsssssssss#',
    '#ssssssssssssssssssssssshhsssssssss#',
    '~~~~~~~~~~~~~~~~~~~~~~~~hh~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~hh~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~hh~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~hh~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  gebaeude: [
    // Lenes Hütte ist vorerst der Fischladen
    { typ: 'huette', x: 26, y: 5, w: 5, h: 4, tuer: { x: 28, y: 8 }, ziel: { karte: 'fischladen', punkt: 'eingang' } },
  ],
  deko: [
    { typ: 'strandkorb', x: 20, y: 7 },
    { typ: 'strandkorb', x: 8, y: 9 },
    { typ: 'felsen', x: 3, y: 6 }, { typ: 'felsen', x: 5, y: 11 }, { typ: 'felsen', x: 33, y: 7 },
    { typ: 'felsen', x: 13, y: 12 },
    { typ: 'busch', x: 4, y: 3 }, { typ: 'busch', x: 12, y: 2 }, { typ: 'busch', x: 30, y: 3 },
    { typ: 'laterne', x: 23, y: 11, licht: 4 },
  ],
  warps: [{ x: 17, y: 0, w: 2, h: 1, karte: 'dorf', punkt: 'vonStrand' }],
  punkte: {
    vonDorf: [17, 2, 'unten'],
    steg: [24, 16, 'unten'],
    stand: [27, 10, 'rechts'],
    vorFischladen: [28, 9, 'unten'],
    vorHuetteMats: [10, 4],
    strand1: [8, 6],
    strand2: [20, 9],
    gezeiten: [4, 12],
    lagerfeuer: [14, 8],
  },
  bereiche: {
    fest: [2, 6, 18, 6],
  },
  sammel: [{ x: 1, y: 6, w: 34, h: 7, art: 'strand', max: 6 }],
});

// ─── Wald (Platzhalter) ─────────────────────────────────────────────────────

const wald = raster(30, 20, '.');
rechteck(wald, 0, 0, 30, 2, '#');
rechteck(wald, 0, 18, 30, 2, '#');
rechteck(wald, 0, 0, 1, 20, '#');
rechteck(wald, 29, 0, 1, 20, '#');
pfad(wald, [[14, 0], [14, 9], [29, 9]], 2, ':');
pfad(wald, [[14, 11], [14, 16]], 2, ':');
ellipse(wald, 5.5, 5.5, 3.6, 2.4, '~');
rechteck(wald, 1, 14, 28, 1, '~');
rechteck(wald, 14, 14, 2, 1, 'h');

karte({
  id: 'wald', name: 'Wald', aussen: true, wasser: 'fluss', rand: 'wald',
  grid: fertigRaster(wald),
  gewaesser: [{ x: 1, y: 2, b: 10, h: 7, art: 'waldsee' }],
  gebaeude: [
    { typ: 'ranch', x: 18, y: 3, w: 5, h: 4, tuer: { x: 20, y: 6 }, ziel: { karte: 'ranch', punkt: 'eingang' } },
    { typ: 'turm', x: 3, y: 10, w: 3, h: 3, tuer: { x: 4, y: 12 }, ziel: { karte: 'turm', punkt: 'eingang' } },
  ],
  deko: [
    { typ: 'schild', x: 16, y: 3, aktion: 'text', text: 'Der Wald. Nördlich liegt dein Hof, östlich das Dorf. Tiefer hinein führt noch kein Weg.' },
    { typ: 'zaun', x: 23, y: 6, w: 4 },
    { typ: 'baum', x: 9, y: 11 }, { typ: 'baum', x: 26, y: 3, art: 'kiefer' },
    { typ: 'baum', x: 6, y: 16 }, { typ: 'baum', x: 22, y: 16 }, { typ: 'baum', x: 1, y: 16, art: 'kiefer' },
    { typ: 'busch', x: 11, y: 3 }, { typ: 'busch', x: 27, y: 16 },
  ],
  warps: [
    { x: 14, y: 0, w: 2, h: 1, karte: 'hof', punkt: 'vonWald' },
    { x: 29, y: 9, w: 1, h: 2, karte: 'dorf', punkt: 'vonWald' },
  ],
  punkte: {
    vonHof: [14, 2, 'unten'],
    vonDorf: [27, 9, 'links'],
    vorRanch: [20, 7],
    vorTurm: [4, 13],
    haendler: [20, 11],
    see1: [10, 5, 'links'],
    fluss1: [20, 13, 'unten'],
    lichtung: [9, 16],
    vorGeheimwald: [2, 16, 'links'],
  },
  bereiche: {
    fest: [17, 11, 11, 3],
  },
  sammel: [{ x: 1, y: 15, w: 28, h: 3, art: 'wald', max: 3 }],
});

// ─── Platzhalter-Innenräume ─────────────────────────────────────────────────

/** Kleiner Raum 12×9 mit Ausgang unten in der Mitte; weitere Deko und Punkte nach Bedarf. */
function platzhalterRaum(id, name, vor, punkte, deko = []) {
  karte({
    id, name, aussen: false,
    grid: fertigRaster(raum(12, 9)),
    deko: [{ typ: 'fenster', x: 3, y: 1, wand: true }, { typ: 'fenster', x: 8, y: 1, wand: true }, ...deko],
    warps: [{ x: 5, y: 8, w: 1, h: 1, ...vor }],
    punkte: { eingang: [5, 7, 'oben'], ...punkte },
  });
}

platzhalterRaum('fischladen', 'Lenes Fischladen', { karte: 'strand', punkt: 'vorFischladen' },
  { theke: [3, 3, 'unten'], bett_lene: [9, 5] },
  [{ typ: 'theke', x: 2, y: 4, w: 4, aktion: 'laden', laden: 'fischer' }, { typ: 'kiste', x: 10, y: 2 }, { typ: 'pflanze', x: 1, y: 6 }]);
platzhalterRaum('ranch', 'Ranch', { karte: 'wald', punkt: 'vorRanch' },
  { theke: [3, 3, 'unten'], bett_wilma: [9, 5], bett_sanne: [9, 7] },
  [{ typ: 'theke', x: 2, y: 4, w: 4, aktion: 'laden', laden: 'ranch' }, { typ: 'kiste', x: 10, y: 2 }, { typ: 'tisch', x: 7, y: 5 }]);
platzhalterRaum('turm', 'Turm', { karte: 'wald', punkt: 'vorTurm' },
  { buch: [3, 3], bett_oswin: [9, 5] },
  [{ typ: 'kamin', x: 5, y: 0, w: 2, h: 2, wand: true, licht: 3 }, { typ: 'tisch', x: 3, y: 4 }]);
platzhalterRaum('huetteMats', 'Hütte von Mats', { karte: 'strand', punkt: 'vorHuetteMats' },
  { staffelei: [3, 4], bett_mats: [9, 5] },
  [{ typ: 'bild', x: 5, y: 1, wand: true }, { typ: 'pflanze', x: 10, y: 2 }]);

// Geheimer Wald: noch ohne Zugang (später hinter einem umgestürzten Stamm im Wald)
const geheim = raster(24, 16, '.');
rechteck(geheim, 0, 0, 24, 2, '#');
rechteck(geheim, 0, 14, 24, 2, '#');
rechteck(geheim, 0, 0, 1, 16, '#');
rechteck(geheim, 23, 0, 1, 16, '#');
ellipse(geheim, 16, 7, 3.4, 2.2, '~');
rechteck(geheim, 23, 7, 1, 2, '.');

karte({
  id: 'geheimwald', name: 'Geheimer Wald', aussen: true, wasser: 'geheimteich', rand: 'wald', npcWege: false,
  grid: fertigRaster(geheim),
  deko: [{ typ: 'baum', x: 4, y: 4 }, { typ: 'baum', x: 8, y: 11, art: 'kiefer' }, { typ: 'busch', x: 19, y: 12 }],
  warps: [{ x: 23, y: 7, w: 1, h: 2, karte: 'wald', punkt: 'vorGeheimwald' }],
  punkte: { vonWald: [21, 8, 'links'] },
  sammel: [{ x: 1, y: 2, w: 22, h: 12, art: 'geheimwald', max: 3 }],
});
