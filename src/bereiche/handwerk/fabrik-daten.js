// Bereich „handwerk" – Fabrik: alle Zahlen an einer Stelle (Tempo, Rezepte, Preise, Freischaltung)
// und die Gegenstände samt Bastelrezepten. DOM-frei. Die Simulation steht in fabrik-sim.js, die
// Objekte in fabrik-objekte.js, die Vorkommen in fabrik-vorkommen.js.
//
// Freischaltung über die Fähigkeit Bergbau (FREISCHALT): Band 2, Splitter/Zusammenführer/Lager/Bohrer 3,
// Schmelzer und Handfertigung der Bauteile 4, Konstrukteur 5, Maschinenteil von Hand 6, Assembler 7.

import { item, kategorie, rezept, erwartet } from '../../daten.js';
import { MS_PRO_MINUTE } from '../../daten.js';

erwartet('kupferbarren', 'eisenbarren', 'goldbarren', 'kupfererz', 'eisenerz', 'golderz');

export const RICHTUNGEN = ['oben', 'rechts', 'unten', 'links']; // r = 0..3, Drehen im Uhrzeigersinn: r + 1
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
/** Blickrichtung (Text) → r. */
export const rVonBlick = (blick) => Math.max(0, RICHTUNGEN.indexOf(blick));

/** Zahlen der Fabrik. Zeiten in Sekunden Echtzeit (Spielzeit: 1 Spielminute = MS_PRO_MINUTE ms). */
export const FABRIK = {
  bandTempo: 1.5, // Felder pro Sekunde
  abstand: 0.25, // kleinster Abstand zweier Waren auf einem Band (Feld = 1) → höchstens 4 je Feld
  maxJeFeld: 4,
  ausgabeRate: 8, // Maschinen und Lager geben höchstens so viel pro Sekunde und Ausgangsfeld ab
  ueberlaufMax: 999, // eine ausgehungerte Maschine nimmt eine Zutat bis hierhin über ihre Grenze an (gemischte Bänder)
  bohrerZeit: 2, // Sekunden je Stück bei normaler Reinheit
  bohrerPuffer: 4, // Stücke im Ausgang des Bohrers
  ausPuffer: 24, // Stücke im Ausgang von Schmelzer, Konstrukteur, Assembler
  lagerFaecher: 48,
  drehFenster: 4, // Sekunden: so lange bleibt ein Band gewählt; jede weitere Aktion dreht es
  schritt: 0.1, // größter Schritt im Echtzeit-Betrieb (s)
  nachholSchritt: 0.5, // Schritt beim Nachholen (s)
  nachholMax: 600, // höchstens so viel Echtzeit-Äquivalent (s) wird je Nachholen nachgeholt
  budgetMs: 4, // Zeitbudget für Rückstand je Bild (ms)
  sekProMinute: MS_PRO_MINUTE / 1000, // Spielminute in Echtzeit-Sekunden
  durchsatzFenster: 60, // Zeitkonstante (s) des gleitenden Mittels für „Durchsatz pro Minute"
};

/** Vorkommen: Sorten (Erz → Gegenstand) und Reinheit (Ausbeute-Faktor). */
export const SORTEN = {
  kupfer: { name: 'Kupfer', item: 'kupfererz', farbe: '#d98a4e' },
  eisen: { name: 'Eisen', item: 'eisenerz', farbe: '#8fb2d8' },
  kohle: { name: 'Kohle', item: 'kohle', farbe: '#3a3a42' },
  stein: { name: 'Stein', item: 'stein', farbe: '#d2caae' },
  gold: { name: 'Gold', item: 'golderz', farbe: '#f2c94c' },
};
export const REINHEIT = { unrein: 0.5, normal: 1, rein: 2 };
export const reinName = (f) => (f < 1 ? 'unrein' : f > 1 ? 'rein' : 'normal');
/** Preis eines Vorkommens im Handy-Kauf (Stufe 2), je Reinheit. */
export const VORKOMMEN_PREIS = { unrein: 25_000_000, normal: 50_000_000, rein: 100_000_000 };

// ─── Rezepte der Maschinen (ein: Zutaten, aus: Ergebnis, zeit: Sekunden je Durchgang) ─────────────

export const SCHMELZ_REZEPTE = {
  kupferbarren: { name: 'Kupferbarren', ein: { kupfererz: 5, kohle: 1 }, aus: { kupferbarren: 1 }, zeit: 4 },
  eisenbarren: { name: 'Eisenbarren', ein: { eisenerz: 5, kohle: 1 }, aus: { eisenbarren: 1 }, zeit: 6 },
  goldbarren: { name: 'Goldbarren', ein: { golderz: 5, kohle: 1 }, aus: { goldbarren: 1 }, zeit: 10 },
};
export const KONSTRUKTEUR_REZEPTE = {
  kupferdraht: { name: 'Kupferdraht', ein: { kupferbarren: 1 }, aus: { kupferdraht: 2 }, zeit: 2 },
  eisenplatte: { name: 'Eisenplatte', ein: { eisenbarren: 1 }, aus: { eisenplatte: 2 }, zeit: 3 },
  schraube: { name: 'Schraube', ein: { eisenbarren: 1 }, aus: { schraube: 4 }, zeit: 3 },
  zahnrad: { name: 'Zahnrad', ein: { eisenbarren: 1 }, aus: { zahnrad: 1 }, zeit: 4 },
};
export const ASSEMBLER_REZEPTE = {
  maschinenteil: { name: 'Maschinenteil', ein: { eisenplatte: 2, kupferdraht: 3 }, aus: { maschinenteil: 1 }, zeit: 6 },
  antriebseinheit: { name: 'Antriebseinheit', ein: { zahnrad: 2, schraube: 4 }, aus: { antriebseinheit: 1 }, zeit: 8 },
};

/**
 * Die Maschinen. `leistung` (MW) liest die Simulation, erzwungen wird sie in Stufe 1 nicht (kein Stromnetz).
 * `flaeche` ist quadratisch, damit Drehen die Fläche nicht ändert.
 */
export const MASCHINEN = {
  erzbohrer: { name: 'Erzbohrer', flaeche: [2, 2], leistung: 5 },
  schmelzer: { name: 'Schmelzer', flaeche: [2, 2], leistung: 4, rezepte: SCHMELZ_REZEPTE },
  konstrukteur: { name: 'Konstrukteur', flaeche: [2, 2], leistung: 4, rezepte: KONSTRUKTEUR_REZEPTE, waehlbar: true, standard: 'kupferdraht' },
  assembler: { name: 'Assembler', flaeche: [3, 3], leistung: 15, rezepte: ASSEMBLER_REZEPTE, waehlbar: true, standard: 'maschinenteil' },
  lager: { name: 'Lager', flaeche: [2, 2], leistung: 0 },
};
/** Objekttypen der Fabrik, die die Simulation bewegt. */
export const BAND = 'foerderband';
export const SPLITTER = 'splitter';
export const MERGER = 'zusammenfuehrer';
export const FABRIK_TYPEN = new Set([BAND, SPLITTER, MERGER, ...Object.keys(MASCHINEN)]);

// ─── Freischaltung (Bergbau-Stufe) und Verkaufspreise ───────────────────────────────────────────

export const FREISCHALT = {
  foerderband: 2, splitter: 3, zusammenfuehrer: 3, lager: 3, erzbohrer: 3,
  schmelzer: 4, kupferdraht: 4, eisenplatte: 4, schraube: 4, zahnrad: 4,
  konstrukteur: 5, maschinenteil: 6, assembler: 7,
};
/** Verkaufspreise der neuen Waren (G). Ein Eisenbarren bringt 120, ein Kupferbarren 60. */
export const PREISE = { kupferdraht: 40, eisenplatte: 75, schraube: 40, zahnrad: 160, maschinenteil: 330, antriebseinheit: 600 };

// ─── Gegenstände ────────────────────────────────────────────────────────────

kategorie('bauteil', 'Bauteil');

const ware = (id, name, text) => item(id, { name, kat: 'bauteil', preis: PREISE[id], bild: { art: id }, text });
ware('kupferdraht', 'Kupferdraht', 'Aus dem Konstrukteur. Dünn, biegsam, leitet gut.');
ware('eisenplatte', 'Eisenplatte', 'Aus dem Konstrukteur. Flach und stabil.');
ware('schraube', 'Schraube', 'Aus dem Konstrukteur. Hält alles zusammen.');
ware('zahnrad', 'Zahnrad', 'Aus dem Konstrukteur. Dreht sich und dreht weiter.');
ware('maschinenteil', 'Maschinenteil', 'Aus dem Assembler (oder von Hand). Für den Bau größerer Maschinen.');
ware('antriebseinheit', 'Antriebseinheit', 'Aus dem Assembler: Zahnräder und Schrauben zu einem Antrieb. Sehr wertvoll.');

const bauteil = (id, name, text, extra = {}) => item(id, { name, kat: 'platz', bild: { art: id }, aufstellbar: true, text, ...extra });
bauteil('foerderband', 'Förderband', 'Transportiert Waren. Richtung = Blickrichtung beim Legen; mit der Aktionstaste im Uhrzeigersinn drehen, mit Spitzhacke oder Axt aufnehmen.');
bauteil('splitter', 'Splitter', 'Teilt eine Zufuhr (hinten) gleichmäßig auf drei Ausgänge (vorn, links, rechts). Aktionstaste dreht.');
bauteil('zusammenfuehrer', 'Zusammenführer', 'Führt drei Zuflüsse (hinten, links, rechts) auf ein Band (vorn) zusammen. Aktionstaste dreht.');
bauteil('lager', 'Lager', `Nimmt Waren vom Band an (Eingang hinten und seitlich), hat ${FABRIK.lagerFaecher} Fächer und gibt vorn wieder ab. Aktionstaste öffnet.`);
bauteil('erzbohrer', 'Erzbohrer', 'Muss auf einem Vorkommen stehen: im Rucksack wählen und auf das Vorkommen benutzen. Fördert allein, ohne Strom und Treibstoff.');
bauteil('schmelzer', 'Schmelzer', 'Erz und Kohle zu Barren: 5 Erz + 1 Kohle ergeben 1 Barren. Eingang hinten und seitlich, Ausgang vorn.');
bauteil('konstrukteur', 'Konstrukteur', 'Ein Eingang, ein Ausgang. Rezept wählbar: Draht, Platte, Schraube, Zahnrad.');
bauteil('assembler', 'Assembler', 'Zwei Zutaten zu einem Bauteil: Maschinenteil oder Antriebseinheit. Rezept wählbar.');

/** Gegenstand eines Vorkommens je Sorte und Reinheit (für den Kauf in Stufe 2; aufgestellt wieder aufnehmbar). */
export const vorkommenItem = (erz, rein = 1) => `vorkommen_${erz}_${reinName(rein)}`;
for (const id of Object.keys(SORTEN)) {
  for (const [rn, f] of Object.entries(REINHEIT)) {
    item(vorkommenItem(id, f), {
      name: `${SORTEN[id].name}-Vorkommen (${rn})`, kat: 'platz', bild: { art: 'vorkommen', f: SORTEN[id].farbe, rein: f },
      aufstellbar: 'vorkommen', verkaufbar: false, erz: id, rein: f,
      text: `Ein Rohstoffvorkommen (2×2 Felder, Ausbeute ${String(f).replace('.', ',')}×). Darauf kann ein Erzbohrer stehen; mit Spitzhacke oder Axt wieder aufnehmen.`,
    });
  }
}

// ─── Bastelrezepte (gestaffelt) ─────────────────────────────────────────────

const frei = (id) => ['bergbau', FREISCHALT[id]];
rezept('foerderband', { menge: 4, zutaten: { holz: 2, stein: 2 }, stufe: frei('foerderband') });
rezept('splitter', { zutaten: { eisenbarren: 1, holz: 4 }, stufe: frei('splitter') });
rezept('zusammenfuehrer', { zutaten: { eisenbarren: 1, holz: 4 }, stufe: frei('zusammenfuehrer') });
rezept('lager', { zutaten: { holz: 40, stein: 20, eisenbarren: 2 }, stufe: frei('lager') });
rezept('erzbohrer', { zutaten: { eisenbarren: 4, kupferbarren: 2, stein: 20 }, stufe: frei('erzbohrer') });
rezept('schmelzer', { zutaten: { eisenbarren: 3, stein: 40, kohle: 5 }, stufe: frei('schmelzer') });
// Handfertigung der Bauteile (dasselbe Verhältnis wie im Konstrukteur): damit der erste Konstrukteur gebaut werden kann
rezept('kupferdraht', { menge: 2, zutaten: { kupferbarren: 1 }, stufe: frei('kupferdraht') });
rezept('eisenplatte', { menge: 2, zutaten: { eisenbarren: 1 }, stufe: frei('eisenplatte') });
rezept('schraube', { menge: 4, zutaten: { eisenbarren: 1 }, stufe: frei('schraube') });
rezept('zahnrad', { zutaten: { eisenbarren: 1 }, stufe: frei('zahnrad') });
rezept('konstrukteur', { zutaten: { eisenplatte: 6, kupferdraht: 6, holz: 20 }, stufe: frei('konstrukteur') });
rezept('maschinenteil', { zutaten: { eisenplatte: 2, kupferdraht: 3 }, stufe: frei('maschinenteil') });
rezept('assembler', { zutaten: { maschinenteil: 4, eisenbarren: 10, goldbarren: 2 }, stufe: frei('assembler') });
