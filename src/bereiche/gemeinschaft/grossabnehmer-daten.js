// Bereich „gemeinschaft" – Großabnehmer: alle Zahlen und Tabellen an einer Stelle (DOM-frei, ohne Logik).
//
// Sechs Firmen kaufen Waren in großer Menge und zahlen dafür einen Zuschlag auf den normalen Verkaufswert.
// Was eine Firma will, steht in `waren`: feste Einträge ({ id, n: [von, bis], ab, selten, bed … }) und
// Sammelposten (`pool`: Gemüse, Obst, Fische … – daraus sucht die Logik aus, was es für den Spieler gerade gibt).
//
//   id      Item-ID (bei Waren mit Ausgangsstoff wie Marmelade zusammen mit `von`)
//   n       Menge von … bis (der Vertrag liegt je nach Fortschritt, Vertrauen und Zufall dazwischen)
//   ab      ab so vielen Vertrauenssternen (0–10) bietet die Firma die Ware an
//   selten  0–2: Seltenheit, +0,2 Zuschlag je Stufe
//   von     Ware mit Ausgangsstoff (Geräucherter Fisch, Marmelade, Eingelegtes): aus welchem Pool der Ausgangsstoff kommt
//   skill   Fortschrittsmaß 0..1 für die Menge: 'bergbau' | 'landwirtschaft' | 'angeln' | 'sammeln' | 'huehner'
//   bed     Voraussetzung, damit es die Ware für den Spieler gibt (siehe `machbar` in grossabnehmer.js):
//             bergbau/landwirtschaft/angeln/sammeln: Fähigkeitsstufe · tiefe: tiefste Minenebene (0 = Mine offen)
//             stall: Hühner (ohne Küken der letzten Nacht) · freundschaft: Zufriedenheit der Herde
//   zmax    Obergrenze des Zuschlags für Waren, die sich fast von selbst herstellen (Eier, Karpfen …)
//   q       Qualität kann verlangt werden (nur Ernte und Fisch)

export const GROSS = {
  maxLaufend: 3, // gleichzeitig laufende Verträge
  wechselTage: 3, // so lange hängen die Angebote, dann gibt es neue
  maxSterne: 10, // Vertrauen je Firma: 0–10
  fristMin: 3,
  fristMax: 14,
  vorschuss: 0.2, // Anteil der Gesamtsumme, der bei Annahme sofort ausgezahlt und bei Erfüllung verrechnet wird
  // Zuschlag auf den normalen Verkaufswert: 1,5 + Menge + Seltenheit + Vertrauen, höchstens 3,0
  zuschlagMin: 1.5,
  zuschlagMax: 3.0,
  zuschlagMenge: 0.5, // bis zu +0,5 für die größte Menge der Ware
  zuschlagSelten: 0.2, // je Seltenheitsstufe (0–2)
  zuschlagStern: 0.06, // je Vertrauensstern
  zuschlagQualitaet: 0, // Qualität steckt schon im Stückwert (Silber ×1,25 …), kein weiterer Aufschlag
  // Menge: Lage zwischen `n[0]` und `n[1]` = Grundlage + Fortschritt + Vertrauen + Zufall
  mengeGrund: 0.12,
  mengeFortschritt: 0.5,
  mengeStern: 0.3,
  mengeZufall: 0.25, // ± die Hälfte davon
  // Vertragsstrafe (kleines Gold) bei Nichterfüllung; nicht jeder Vertrag hat eine
  strafeChance: 0.5,
  strafeAnteil: 0.04,
  strafeMin: 50,
  // Bonus bei Erfüllung (seltener Gegenstand der Firma)
  bonusChance: 0.2,
  bonusChanceStern: 0.03,
  // Qualitätsverlangen
  qualiSilberAb: 4, // ab so vielen Sternen kann Silber verlangt werden (Chance qualiChance)
  qualiGoldAb: 8,
  qualiChance: 0.3,
  // Vertrauen
  vertrauenErfuellt: 1,
  vertrauenVerfall: -1,
  // Warnung im Morgenbericht, wenn so wenige Tage übrig sind
  warnTage: 1,
  // Briefe: so viele Dankesbriefe bleiben im Aufgaben-Reiter sichtbar
  briefeSichtbar: 3,
};

export const STERN_TITEL = [
  [0, 'Unbekannt'], [1, 'Lieferant'], [3, 'Stammlieferant'], [5, 'Bevorzugter Partner'], [7, 'Vertrauter Partner'], [10, 'Hoflieferant'],
];
export const sternTitel = (n) => STERN_TITEL.filter(([ab]) => n >= ab).at(-1)[1];

/** Pools: Sammelposten, aus denen die Logik die gerade möglichen Waren zusammensucht. */
export const POOLS = {
  gemuese: { n: [1200, 24000], nGrenzen: [5, 30, 25, 250], skill: 'landwirtschaft', q: true },
  obst: { n: [1200, 24000], nGrenzen: [5, 30, 25, 250], skill: 'landwirtschaft', q: true },
  fisch: { n: [600, 8000], nGrenzen: [5, 20, 15, 120], skill: 'angeln', q: true },
};
/** Gewässerarten, an denen man Fische für Verträge fängt (Teich, Fluss, See, Waldsee, Meer). */
export const FISCH_ORTE = ['teich', 'fluss', 'see', 'waldsee', 'meer'];
/** Höchste Seltenheit eines Vertragsfischs: Grund + Angelstufe × Schritt; teurere Fische werden nicht verlangt. */
export const FISCH_SELTEN = { grund: 20, jeStufe: 8, maxPreis: 300 };
/** Ab diesem Verkaufswert gilt eine Pool-Ware als selten (Stufe 1 bzw. 2). */
export const POOL_SELTEN = [200, 500];

export const FIRMEN = {
  baufirma: {
    name: 'Brandt & Söhne Bau', kurz: 'Baufirma Brandt', kontakt: 'Bauleiter Brandt', branche: 'Hoch- und Tiefbau',
    text: 'Wir bauen, was Klarwasser wachsen lässt, und brauchen dafür Material. Viel Material.',
    farbe: '#e0a83a',
    aussehen: { haut: '#d8a070', haare: '#4a3a2a', frisur: 'kurz', hemd: '#e0a83a', hose: '#3a4a6a', muetze: '#f2c23a', bart: '#4a3a2a' },
    waren: [
      { id: 'stein', n: [100, 1000], ab: 0, selten: 0, skill: 'bergbau' },
      { id: 'holz', n: [100, 1000], ab: 0, selten: 0, skill: 'sammeln' },
      { id: 'hartholz', n: [30, 300], ab: 1, selten: 0, skill: 'sammeln' },
      { id: 'nagel', n: [100, 800], ab: 1, selten: 0, skill: 'bergbau', bed: { bergbau: 5 } },
      { id: 'beton', n: [40, 400], ab: 1, selten: 0, skill: 'bergbau', bed: { bergbau: 6 } },
      { id: 'stahltraeger', n: [10, 120], ab: 2, selten: 1, skill: 'bergbau', bed: { bergbau: 6 } },
      { id: 'rahmenplatte', n: [10, 120], ab: 3, selten: 1, skill: 'bergbau', bed: { bergbau: 6 } },
      { id: 'betonplatte', n: [20, 200], ab: 4, selten: 1, skill: 'bergbau', bed: { bergbau: 6 } },
      { id: 'rahmen', n: [5, 60], ab: 6, selten: 2, skill: 'bergbau', bed: { bergbau: 8 } },
    ],
    bonus: [[0, 'hartholz', 30], [3, 'stahlbarren', 5], [6, 'goldbarren', 3], [9, 'sprenger', 5]],
  },
  elektro: {
    name: 'Funkel Elektrogroßhandel', kurz: 'Elektro Funkel', kontakt: 'Frau Funkel', branche: 'Elektrohandel',
    text: 'Ohne Draht kein Strom, ohne Strom kein Licht. Wir liefern an halb Klarwasser und brauchen Nachschub.',
    farbe: '#3a8ac8',
    aussehen: { haut: '#f0c8a8', haare: '#7a3a2a', frisur: 'dutt', hemd: '#3a8ac8', hose: '#2a3a5a', brille: true },
    waren: [
      { id: 'kupferdraht', n: [50, 600], ab: 0, selten: 0, skill: 'bergbau', bed: { bergbau: 5 } },
      { id: 'stromkabel', n: [50, 500], ab: 0, selten: 0, skill: 'bergbau', bed: { bergbau: 4 } },
      { id: 'kabelrolle', n: [20, 300], ab: 1, selten: 0, skill: 'bergbau', bed: { bergbau: 5 } },
      { id: 'platine', n: [10, 150], ab: 3, selten: 1, skill: 'bergbau', bed: { bergbau: 7 } },
      { id: 'kuehlkoerper', n: [10, 120], ab: 3, selten: 1, skill: 'bergbau', bed: { bergbau: 7 } },
      { id: 'motor', n: [5, 50], ab: 6, selten: 2, skill: 'bergbau', bed: { bergbau: 8 } },
      { id: 'computer', n: [3, 40], ab: 7, selten: 2, skill: 'bergbau', bed: { bergbau: 8 } },
    ],
    bonus: [[0, 'kupferbarren', 10], [3, 'maschinenteil', 5], [6, 'goldbarren', 3], [9, 'leuchtring', 1]],
  },
  werft: {
    name: 'Möwenstein Werft', kurz: 'Werft Möwenstein', kontakt: 'Werftmeister Ohlsen', branche: 'Schiffbau',
    text: 'Unsere Kutter laufen vom Stapel, wenn die Teile pünktlich kommen. Rohre, Getriebe, Antriebe: her damit.',
    farbe: '#2f5f8f',
    aussehen: { haut: '#e8b890', haare: '#c8c8c8', frisur: 'kurz', hemd: '#2f5f8f', hose: '#22303f', muetze: '#1f3f6f', bart: '#d8d8d8' },
    waren: [
      { id: 'eisenplatte', n: [50, 500], ab: 0, selten: 0, skill: 'bergbau', bed: { bergbau: 5 } },
      { id: 'schraube', n: [100, 1000], ab: 0, selten: 0, skill: 'bergbau', bed: { bergbau: 5 } },
      { id: 'zahnrad', n: [20, 300], ab: 0, selten: 0, skill: 'bergbau', bed: { bergbau: 5 } },
      { id: 'metallrohr', n: [20, 300], ab: 1, selten: 0, skill: 'bergbau', bed: { bergbau: 5 } },
      { id: 'maschinenteil', n: [10, 150], ab: 2, selten: 1, skill: 'bergbau', bed: { bergbau: 7 } },
      { id: 'zahnstange', n: [20, 200], ab: 3, selten: 1, skill: 'bergbau', bed: { bergbau: 6 } },
      { id: 'antriebseinheit', n: [20, 100], ab: 3, selten: 1, skill: 'bergbau', bed: { bergbau: 7 } },
      { id: 'motor', n: [5, 60], ab: 6, selten: 2, skill: 'bergbau', bed: { bergbau: 8 } },
      { id: 'antriebssystem', n: [2, 25], ab: 8, selten: 2, skill: 'bergbau', bed: { bergbau: 8 } },
    ],
    bonus: [[0, 'koeder', 50], [3, 'magnetkoeder', 30], [6, 'anglerring', 1], [9, 'glasfaserrute', 1]],
  },
  gasthaus: {
    name: 'Einkaufsring Goldener Löffel', kurz: 'Goldener Löffel', kontakt: 'Wirtin Hedwig', branche: 'Gasthaus-Einkauf',
    text: 'Fünfzig Gasthäuser, ein Einkauf. Wir nehmen Eier, Fisch und Geräuchertes, solange es frisch ist.',
    farbe: '#c8553d',
    aussehen: { haut: '#f0c8a8', haare: '#8a5a3a', frisur: 'locken', hemd: '#c8553d', hose: '#3a2a2a', schuerze: '#f2eee6' },
    waren: [
      { id: 'ei', n: [20, 300], ab: 0, selten: 0, skill: 'huehner', bed: { stall: 3 }, zmax: 2.0 },
      { id: 'grossesei', n: [10, 120], ab: 2, selten: 1, skill: 'huehner', bed: { stall: 5, freundschaft: 300 }, zmax: 2.4 },
      { pool: 'fisch', ab: 0 },
      { id: 'geraeuchert', von: 'fisch', n: [5, 60], ab: 4, selten: 1, skill: 'angeln', zmax: 2.2 },
    ],
    bonus: [[0, 'brot', 5], [3, 'kaffee', 5], [6, 'fischsuppe', 5], [9, 'koi', 2]],
  },
  hofladen: {
    name: 'Hofladen-Kette Grüner Korb', kurz: 'Grüner Korb', kontakt: 'Herr Kornblum', branche: 'Lebensmittelhandel',
    text: 'Unsere Regale leeren sich schneller, als der Bauer nachlegt. Wir zahlen gut für alles, was frisch vom Feld kommt.',
    farbe: '#5a9a3a',
    aussehen: { haut: '#e8b890', haare: '#d0b070', frisur: 'kurz', hemd: '#5a9a3a', hose: '#4a3a2a', schuerze: '#8a5a2a', muetze: '#c8a050' },
    waren: [
      { pool: 'gemuese', ab: 0 },
      { pool: 'obst', ab: 1 },
      { id: 'eingelegt', von: 'gemuese', n: [10, 80], ab: 4, selten: 1, skill: 'landwirtschaft', bed: { landwirtschaft: 4 } },
      { id: 'marmelade', von: 'obst', n: [10, 80], ab: 4, selten: 1, skill: 'landwirtschaft', bed: { landwirtschaft: 4 } },
    ],
    bonus: [[0, 'duenger', 20], [3, 'qualitaetsduenger', 20], [6, 'beschleuniger', 15], [9, 'turbobeschleuniger', 10]],
  },
  bergwerk: {
    name: 'Bergwerksgilde Tiefenrat', kurz: 'Tiefenrat', kontakt: 'Obersteiger Falk', branche: 'Bergbau und Hüttenwesen',
    text: 'Was unten gebrochen wird, wandert durch unsere Hände. Erz, Barren, Steine: Menge zählt.',
    farbe: '#8a8a96',
    aussehen: { haut: '#b97f58', haare: '#2a2a30', frisur: 'kurz', hemd: '#6a6a78', hose: '#2a2a34', muetze: '#8a8a96', bart: '#2a2a30' },
    waren: [
      { id: 'kupfererz', n: [100, 1000], ab: 0, selten: 0, skill: 'bergbau', bed: { tiefe: 0 } },
      { id: 'kohle', n: [60, 600], ab: 0, selten: 0, skill: 'bergbau', bed: { tiefe: 0 } },
      { id: 'quarz', n: [20, 200], ab: 0, selten: 0, skill: 'bergbau', bed: { tiefe: 0 } },
      { id: 'kupferbarren', n: [30, 400], ab: 1, selten: 0, skill: 'bergbau', bed: { tiefe: 3 } },
      { id: 'eisenerz', n: [60, 600], ab: 1, selten: 0, skill: 'bergbau', bed: { tiefe: 25 } },
      { id: 'eisenbarren', n: [20, 300], ab: 2, selten: 1, skill: 'bergbau', bed: { tiefe: 25 } },
      { id: 'amethyst', n: [5, 60], ab: 3, selten: 1, skill: 'bergbau', bed: { tiefe: 10 } },
      { id: 'topas', n: [5, 60], ab: 3, selten: 1, skill: 'bergbau', bed: { tiefe: 10 } },
      { id: 'golderz', n: [20, 300], ab: 3, selten: 1, skill: 'bergbau', bed: { tiefe: 65 } },
      { id: 'stahlbarren', n: [10, 200], ab: 4, selten: 1, skill: 'bergbau', bed: { tiefe: 25, bergbau: 4 } },
      { id: 'goldbarren', n: [10, 150], ab: 5, selten: 1, skill: 'bergbau', bed: { tiefe: 65 } },
      { id: 'smaragd', n: [3, 30], ab: 6, selten: 2, skill: 'bergbau', bed: { tiefe: 40 } },
      { id: 'rubin', n: [3, 30], ab: 6, selten: 2, skill: 'bergbau', bed: { tiefe: 40 } },
      { id: 'diamant', n: [2, 15], ab: 8, selten: 2, skill: 'bergbau', bed: { tiefe: 60 } },
      { id: 'iridiumbarren', n: [2, 20], ab: 8, selten: 2, skill: 'bergbau', bed: { tiefe: 100 } },
    ],
    bonus: [[0, 'kohle', 30], [3, 'eisenbarren', 5], [6, 'goldbarren', 3], [9, 'diamant', 1]],
  },
  sammler: {
    name: 'Kuriositätenkabinett Wunderkammer', kurz: 'Wunderkammer', kontakt: 'Fräulein Mirabell', branche: 'Sammlungen und Geschenke',
    text: 'Für Museen, Sammler und Leute, die das Besondere verschenken. Bitte nur Echtes, gern auch Altes.',
    farbe: '#7a4a9a',
    aussehen: { haut: '#f0c8a8', haare: '#e8e8f0', frisur: 'lang', hemd: '#7a4a9a', hose: '#3a2a4a', brille: true },
    waren: [
      { id: 'geode', n: [3, 30], ab: 0, selten: 0, skill: 'bergbau', bed: { tiefe: 0 } },
      { id: 'frostgeode', n: [3, 25], ab: 3, selten: 1, skill: 'bergbau', bed: { tiefe: 40 } },
      { id: 'magmageode', n: [3, 20], ab: 6, selten: 2, skill: 'bergbau', bed: { tiefe: 80 } },
      { pool: 'artefakt', ab: 0 },
      { pool: 'mineral', ab: 0 },
    ],
    bonus: [[0, 'geode', 3], [3, 'frostgeode', 2], [6, 'schutzring', 1], [9, 'sternensplitter', 2]],
  },
};
export const FIRMEN_IDS = Object.keys(FIRMEN);

/**
 * Artefakte und Mineralien der Wunderkammer: `menge` von … bis, `sterne` = ab welchem Verkaufswert wie viele Vertrauenssterne
 * nötig sind, `selten` = ab welchem Verkaufswert Seltenheit 1 bzw. 2 gilt.
 */
export const ARTEFAKT = { menge: [2, 10], sterne: [[0, 0], [150, 2], [250, 4], [400, 6]], selten: [150, 300] };
/** Mineralien kommen aus Geoden; die Geode-Art bestimmt, ab welcher Minenebene es sie gibt (Omnigeoden zählen nicht). */
export const GEODE_TIEFE = { geode: 0, frostgeode: 40, magmageode: 80 };

/** Texte der Dankesbriefe (je Firma zwei Fassungen). {name} setzt der Kern ein. */
export const DANK = {
  baufirma: [
    'Lieber {name},\n\ndas Material ist da, pünktlich und in bester Qualität. Meine Leute haben schon angefangen zu mauern.\n\nMit Leuten wie Ihnen baut man ein Dorf. Beim nächsten Auftrag denken wir wieder zuerst an Sie.\n\nBrandt',
    'Hallo {name},\n\nder Polier hat die Lieferung abgenommen und nichts zu meckern gefunden. Das ist selten.\n\nDie Rechnung ist beglichen. Bis zum nächsten Bau!\n\nBrandt & Söhne',
  ],
  elektro: [
    'Sehr geehrte(r) {name},\n\ndie Lieferung ist eingetroffen und hat jede Prüfung bestanden. Unsere Regale sind wieder voll, und die Kunden müssen nicht im Dunkeln sitzen.\n\nIch freue mich auf die nächste Zusammenarbeit.\n\nFunkel',
    'Liebe(r) {name},\n\nmit Ihrer Ware läuft hier alles wie geschmiert, im wahrsten Sinne: Es fließt.\n\nDanke für die Zuverlässigkeit.\n\nIhre Funkel',
  ],
  werft: [
    'Moin {name},\n\ndie Teile sind an Bord, der Kutter läuft pünktlich vom Stapel. Das habe ich auch Ihnen zu verdanken.\n\nHand drauf: Beim nächsten Schiff sind Sie wieder dabei.\n\nOhlsen, Werftmeister',
    'Moin {name},\n\nalles geliefert, alles dicht, alles wie bestellt. Mehr kann ein Werftmeister nicht verlangen.\n\nMast- und Schotbruch!\n\nOhlsen',
  ],
  gasthaus: [
    'Liebe(r) {name},\n\nunsere Köche waren begeistert. Die Ware war frisch, und die Gäste haben nachgeordert.\n\nSie sind jederzeit willkommen: Ein Teller geht aufs Haus.\n\nWirtin Hedwig',
    'Hallo {name},\n\ndie Gasthäuser sind versorgt, die Küchen dampfen. Besser hätte es nicht laufen können.\n\nBis zur nächsten Bestellung!\n\nHedwig vom Goldenen Löffel',
  ],
  hofladen: [
    'Lieber {name},\n\ndie Kisten sind in allen Läden angekommen und waren in einer Stunde leer. So muss das sein.\n\nBitte wieder so frisch!\n\nKornblum',
    'Liebe(r) {name},\n\nunsere Kundschaft fragt schon nach „Ihrem Gemüse“. Was Besseres kann einem Händler nicht passieren.\n\nDanke und bis bald.\n\nKornblum, Grüner Korb',
  ],
  bergwerk: [
    'Glück auf, {name}!\n\nDie Lieferung ist verbucht, die Gilde ist zufrieden. Wer so zuverlässig liefert, hat unten wie oben einen Namen.\n\nFalk, Obersteiger',
    'Glück auf, {name}!\n\nErz ist Erz, aber pünktliches Erz ist Gold wert. Die Gilde dankt.\n\nObersteiger Falk',
  ],
  sammler: [
    'Verehrte(r) {name},\n\ndie Stücke sind unversehrt eingetroffen und schmücken nun unsere Vitrinen. Ein Sammler weiß, was ein gutes Auge wert ist.\n\nIn Hochachtung,\nMirabell',
    'Liebe(r) {name},\n\nwie wunderbar! Jedes Stück ein Kleinod. Die Besucher sind entzückt.\n\nBeehren Sie uns bald wieder.\n\nMirabell',
  ],
};
