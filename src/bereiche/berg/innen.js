// Bereich „berg" – die Innenräume. Person und Laden der Zimmerei liefert „tiere" (Greta, Laden
// „zimmerei"), die der Gilde „mine" (Alrik, Laden „gilde"); hier stehen die Räume, Theken und Punkte.
//
// Zimmerei (19×13): links Werkstatt und Laden (Theke, Werkbank, Ofen, Holz), rechts oben Gretas
// Schlafkammer mit Neles Bettchen, rechts unten Kais Zimmer.
// Gilde (21×13): Halle mit Theke, Gildentafel, Vitrinen mit Waffen, Rundtischen und Übungspuppe,
// rechts Alriks Kammer.

import { karte, rechteck, raum, fertigRaster } from '../../karten.js';

// ─── Zimmerei ───────────────────────────────────────────────────────────────

const z = raum(19, 13, { tuerX: 6 });
rechteck(z, 11, 2, 1, 10, '#'); // Trennwand zwischen Werkstatt und Wohnräumen
z[4][11] = '_'; z[9][11] = '_'; // Durchgänge
rechteck(z, 12, 7, 6, 1, '#'); // Wand zwischen Schlafkammer und Kais Zimmer
rechteck(z, 2, 6, 5, 2, 't'); // Teppich vor der Theke
rechteck(z, 13, 4, 3, 2, 't'); // Teppich in der Schlafkammer
rechteck(z, 13, 9, 3, 2, 't'); // Teppich bei Kai

karte({
  id: 'zimmerei', name: 'Zimmerei', aussen: false, innen: 'zimmerei',
  grid: fertigRaster(z),
  deko: [
    // Trennwände aus Holz (zwischen den Durchgängen)
    { typ: 'berg_trennwand', x: 11, y: 2, h: 2, wand: true }, { typ: 'berg_trennwand', x: 11, y: 5, h: 4, wand: true }, { typ: 'berg_trennwand', x: 11, y: 10, h: 2, wand: true },
    // Werkstatt: Rückwand
    { typ: 'fenster', x: 3, y: 1, wand: true }, { typ: 'berg_saegewand', x: 5, y: 1, w: 2, wand: true }, { typ: 'fenster', x: 8, y: 1, wand: true },
    { typ: 'theke', x: 2, y: 4, w: 4, aktion: 'laden', laden: 'zimmerei' },
    { typ: 'berg_holzregal', x: 2, y: 2, w: 2 }, { typ: 'kiste', x: 5, y: 2 },
    { typ: 'berg_werkbank', x: 6, y: 2, w: 3, aktion: 'text', text: 'Greta hobelt hier Bretter, bis sie glatter sind als die Ausreden der Kunden. Der Schraubstock knarzt zufrieden.' },
    { typ: 'berg_ofen', x: 9, y: 2, licht: 3 },
    // Werkstatt: Mitte und Süden
    { typ: 'berg_saegebock', x: 8, y: 6 }, { typ: 'berg_saegebock', x: 9, y: 7 },
    { typ: 'berg_holzstapel', x: 9, y: 10 }, { typ: 'berg_holzstapel', x: 10, y: 10 }, { typ: 'berg_holzstapel', x: 9, y: 11 }, { typ: 'berg_holzstapel', x: 10, y: 11 },
    { typ: 'kiste', x: 1, y: 9 }, { typ: 'kiste', x: 1, y: 10 },
    { typ: 'tisch', x: 3, y: 9 }, { typ: 'berg_hocker', x: 2, y: 9 }, { typ: 'berg_hocker', x: 4, y: 9 },
    { typ: 'pflanze', x: 1, y: 7 },
    // Gretas Schlafkammer
    { typ: 'kamin', x: 14, y: 0, w: 2, h: 2, wand: true, licht: 3 },
    { typ: 'bild', x: 17, y: 1, wand: true }, { typ: 'fenster', x: 12, y: 1, wand: true },
    { typ: 'berg_kinderbett', x: 12, y: 2, h: 2, farbe: '#e0b030' },
    { typ: 'berg_schrank', x: 13, y: 2 },
    { typ: 'berg_bett', x: 16, y: 2, w: 2, h: 2, farbe: '#c8602f' },
    { typ: 'kiste', x: 17, y: 5 }, { typ: 'berg_spielzeug', x: 14, y: 5, begehbar: true },
    // Kais Zimmer
    { typ: 'bild', x: 14, y: 7, wand: true },
    { typ: 'tisch', x: 13, y: 8 }, { typ: 'tisch', x: 14, y: 8 }, { typ: 'berg_hocker', x: 13, y: 9 },
    { typ: 'berg_regal', x: 16, y: 8 }, { typ: 'berg_regal', x: 17, y: 8 },
    { typ: 'berg_bett', x: 16, y: 10, w: 2, h: 2, farbe: '#4f9a5a' },
    { typ: 'berg_spielzeug', x: 14, y: 11, begehbar: true },
  ],
  warps: [{ x: 6, y: 12, w: 1, h: 1, karte: 'berg', punkt: 'vorZimmerei' }],
  punkte: {
    eingang: [6, 11, 'oben'],
    theke: [3, 3, 'unten'],
    werkbank: [8, 3, 'oben'],
    bett_greta: [15, 3],
    bett_kai: [15, 10],
    bett_nele: [13, 3],
  },
});

// ─── Abenteurergilde ────────────────────────────────────────────────────────

const gi = raum(21, 13, { tuerX: 7 });
rechteck(gi, 15, 2, 1, 10, '#'); // Wand zu Alriks Kammer
gi[5][15] = '_';
rechteck(gi, 6, 5, 6, 4, 't'); // Teppich unter den Tischen
rechteck(gi, 17, 8, 2, 2, 't');

karte({
  id: 'gilde', name: 'Abenteurergilde', aussen: false, innen: 'gilde',
  grid: fertigRaster(gi),
  deko: [
    { typ: 'berg_trennwand', x: 15, y: 2, h: 3, wand: true }, { typ: 'berg_trennwand', x: 15, y: 6, h: 6, wand: true },
    { typ: 'bild', x: 3, y: 1, wand: true },
    {
      typ: 'berg_gildentafel', x: 5, y: 1, w: 2, wand: true, aktion: 'text',
      text: 'Gesuche: „Schleim in Ebene 3 – bitte freundlich entfernen." – „Wer hat meine Spitzhacke? Sie hat einen Namen." – „Gesucht: Mutige. Gefunden: Alrik." – „Suche Leiter. Nicht die Art, die man hochklettert."',
    },
    { typ: 'berg_trophaee', x: 7, y: 1, wand: true }, { typ: 'kamin', x: 8, y: 0, w: 2, h: 2, wand: true, licht: 3 }, { typ: 'berg_trophaee', x: 10, y: 1, wand: true, art: 'fledermaus' },
    { typ: 'theke', x: 2, y: 4, w: 4, aktion: 'laden', laden: 'gilde' },
    { typ: 'berg_waffenstaender', x: 2, y: 2 }, { typ: 'kiste', x: 7, y: 2 },
    {
      typ: 'berg_vitrine', x: 11, y: 2, w: 2, art: 'schwerter', aktion: 'text',
      text: 'Eine Vitrine voller Schwerter. Das größte hat ein Schildchen: „Nicht anfassen. Alrik meint das ernst."',
    },
    {
      typ: 'berg_vitrine', x: 13, y: 2, w: 2, art: 'schilde', aktion: 'text',
      text: 'Schilde und eine Axt. Auf dem Schildchen steht: „Beule gehört zum Stück."',
    },
    { typ: 'tisch', x: 8, y: 6 }, { typ: 'tisch', x: 9, y: 6 }, { typ: 'berg_hocker', x: 7, y: 6 }, { typ: 'berg_hocker', x: 10, y: 6 },
    { typ: 'berg_hocker', x: 8, y: 7 }, { typ: 'berg_hocker', x: 9, y: 5 },
    { typ: 'tisch', x: 12, y: 9 }, { typ: 'tisch', x: 13, y: 9 }, { typ: 'berg_hocker', x: 12, y: 10 }, { typ: 'berg_hocker', x: 13, y: 8 },
    { typ: 'berg_puppe', x: 2, y: 9 }, { typ: 'berg_puppe', x: 2, y: 10 }, { typ: 'berg_waffenstaender', x: 1, y: 7 },
    { typ: 'pflanze', x: 14, y: 3 }, { typ: 'kiste', x: 14, y: 11 },
    // Alriks Kammer
    { typ: 'berg_karte', x: 16, y: 1, w: 2, wand: true }, { typ: 'fenster', x: 19, y: 1, wand: true },
    { typ: 'berg_bett', x: 18, y: 2, w: 2, h: 2, farbe: '#3a5a8a' },
    { typ: 'berg_regal', x: 16, y: 2 },
    { typ: 'tisch', x: 18, y: 5 }, { typ: 'berg_hocker', x: 17, y: 5 }, { typ: 'kiste', x: 19, y: 6 },
    { typ: 'berg_waffenstaender', x: 19, y: 8 }, { typ: 'kiste', x: 16, y: 10 },
  ],
  warps: [{ x: 7, y: 12, w: 1, h: 1, karte: 'berg', punkt: 'vorGilde' }],
  punkte: {
    eingang: [7, 11, 'oben'],
    theke: [3, 3, 'unten'],
    bett_alrik: [17, 3],
    tafel: [5, 2, 'oben'],
  },
});
