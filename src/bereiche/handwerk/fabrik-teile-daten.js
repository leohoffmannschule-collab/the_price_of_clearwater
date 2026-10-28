// Bereich „handwerk" – Fabrik Stufe 3: mehr herstellbare Teile. Alle Zahlen für die neuen Waren, ihre Rezepte in den
// Maschinen (Schmelzer, Konstrukteur, Assembler) und für die neuen Maschinen Mischer und Fertiger an einer Stelle,
// dazu die Gegenstände und die Bastelrezepte der Zwischenprodukte. DOM-frei.
//
// Die Rezept-Tabellen der Stufe 1 (SCHMELZ_REZEPTE …) bleiben unangetastet; die Maschinen bekommen erweiterte Kopien
// (`MASCHINEN[t].rezepte`). Diese Datei wird vor fabrik-objekte.js geladen (fabrik-inhalt.js), damit Mischer und Fertiger
// wie jede andere Maschine als Objekttyp registriert werden.
//
// Ketten (Menge je Durchgang, Sekunden):
//   Schmelzer     3 Eisenbarren + 1 Kohle → 2 Stahlbarren (8 s)
//   Konstrukteur  2 Stahlbarren → Stahlträger · 2 Eisenbarren → 3 Metallrohre · 3 Kupferdraht → Kabelrolle · 3 Eisenplatten →
//                 Rahmenplatte · 1 Eisenbarren → 8 Nägel · 1 Stahlbarren → Zahnstange
//   Assembler     Platine · Kühlkörper · Rotor · Stator · Rahmen (modular) · Motor (2 Rotoren + 2 Statoren)
//   Mischer       Beton (Stein + Wasser aus den Rohrleitungen) · Betonplatte  (Strom, Wasseranschluss)
//   Fertiger      Computer (Platine + Kabelrolle + Kühlkörper + Motor) · Antriebssystem (vier Zutaten)  (Strom)
// Von Hand herstellbar (Basteln) sind die einfachen Zwischenprodukte bis zum Rahmen; Motor, Computer, Antriebssystem, Beton,
// Betonplatte und Stahlbarren gibt es nur aus Maschinen.

import { item, rezept, erwartet } from '../../daten.js';
import { MASCHINEN, FABRIK_TYPEN, SCHMELZ_REZEPTE, KONSTRUKTEUR_REZEPTE, ASSEMBLER_REZEPTE } from './fabrik-daten.js';

erwartet('eisenbarren', 'kupferbarren', 'kohle', 'stein', 'holz', 'kupferdraht', 'eisenplatte', 'schraube', 'zahnrad', 'maschinenteil', 'antriebseinheit');

// ─── Verkaufspreise (G) und Freischaltung der Handarbeit (Bergbau-Stufe) ─────────────────────────

/**
 * Verkaufspreise der neuen Waren. Faustregel wie in Stufe 1: etwa ein Viertel mehr, als die Zutaten einzeln brächten
 * (Eisenbarren 120, Kupferbarren 60, Kohle 15, Stein 2), damit sich jede Stufe der Kette lohnt.
 */
export const PREISE_TEILE = {
  stahlbarren: 230,
  stahltraeger: 575,
  metallrohr: 100,
  kabelrolle: 150,
  rahmenplatte: 280,
  nagel: 20,
  zahnstange: 290,
  platine: 490,
  kuehlkoerper: 340,
  rotor: 780,
  stator: 760,
  rahmen: 1450,
  motor: 3850,
  beton: 16,
  betonplatte: 175,
  computer: 6900,
  antriebssystem: 17000,
};

/** Handarbeit im Basteln-Menü (Bergbau-Stufe); fehlt eine Ware hier, gibt es sie nur aus Maschinen. */
export const FREISCHALT_TEILE = {
  nagel: 4, metallrohr: 5, kabelrolle: 5, rahmenplatte: 6, stahltraeger: 6, zahnstange: 6,
  platine: 7, kuehlkoerper: 7, rotor: 7, stator: 7, rahmen: 8,
};

// ─── Rezepte der Maschinen ──────────────────────────────────────────────────────────────────────

/** Neue Rezepte im Schmelzer (der Stahl braucht fertige Eisenbarren und etwas Kohle). */
export const SCHMELZ_NEU = {
  stahlbarren: { name: 'Stahlbarren', ein: { eisenbarren: 3, kohle: 1 }, aus: { stahlbarren: 2 }, zeit: 8 },
};
/** Neue Rezepte im Konstrukteur (immer ein Eingang). */
export const KONSTRUKTEUR_NEU = {
  stahltraeger: { name: 'Stahlträger', ein: { stahlbarren: 2 }, aus: { stahltraeger: 1 }, zeit: 4 },
  metallrohr: { name: 'Metallrohr', ein: { eisenbarren: 2 }, aus: { metallrohr: 3 }, zeit: 3 },
  kabelrolle: { name: 'Kabelrolle', ein: { kupferdraht: 3 }, aus: { kabelrolle: 1 }, zeit: 3 },
  rahmenplatte: { name: 'Rahmenplatte', ein: { eisenplatte: 3 }, aus: { rahmenplatte: 1 }, zeit: 5 },
  nagel: { name: 'Nägel', ein: { eisenbarren: 1 }, aus: { nagel: 8 }, zeit: 2 },
  zahnstange: { name: 'Zahnstange', ein: { stahlbarren: 1 }, aus: { zahnstange: 1 }, zeit: 4 },
};
/** Neue Rezepte im Assembler (zwei Zutaten). */
export const ASSEMBLER_NEU = {
  platine: { name: 'Platine', ein: { kupferdraht: 6, eisenplatte: 2 }, aus: { platine: 1 }, zeit: 6 },
  kuehlkoerper: { name: 'Kühlkörper', ein: { kupferbarren: 2, eisenplatte: 2 }, aus: { kuehlkoerper: 1 }, zeit: 6 },
  rotor: { name: 'Rotor', ein: { metallrohr: 3, schraube: 8 }, aus: { rotor: 1 }, zeit: 8 },
  stator: { name: 'Stator', ein: { metallrohr: 3, kabelrolle: 2 }, aus: { stator: 1 }, zeit: 8 },
  rahmen: { name: 'Rahmen', ein: { rahmenplatte: 2, metallrohr: 6 }, aus: { rahmen: 1 }, zeit: 12 },
  motor: { name: 'Motor', ein: { rotor: 2, stator: 2 }, aus: { motor: 1 }, zeit: 14 },
};
/** Mischer: Wasser kommt nicht vom Band, sondern aus den Rohrleitungen (1 Einheit = 1 m³). */
export const MISCHER_REZEPTE = {
  beton: { name: 'Beton', ein: { stein: 4, wasser: 2 }, aus: { beton: 2 }, zeit: 4 },
  betonplatte: { name: 'Betonplatte', ein: { beton: 4, eisenplatte: 1, wasser: 1 }, aus: { betonplatte: 1 }, zeit: 6 },
};
/** Fertiger: bis zu vier verschiedene Eingänge. */
export const FERTIGER_REZEPTE = {
  computer: { name: 'Computer', ein: { platine: 2, kabelrolle: 2, kuehlkoerper: 1, motor: 1 }, aus: { computer: 1 }, zeit: 24 },
  antriebssystem: { name: 'Antriebssystem', ein: { motor: 2, rahmen: 2, antriebseinheit: 2, zahnstange: 6 }, aus: { antriebssystem: 1 }, zeit: 30 },
};

/** Zahlen des Mischers. */
export const MISCHER = {
  tank: 4, // m³, die der Mischer zwischenspeichert
  rate: 90, // m³/min, so schnell zieht er Wasser aus dem Rohrnetz
};

MASCHINEN.schmelzer.rezepte = { ...SCHMELZ_REZEPTE, ...SCHMELZ_NEU };
MASCHINEN.konstrukteur.rezepte = { ...KONSTRUKTEUR_REZEPTE, ...KONSTRUKTEUR_NEU };
MASCHINEN.assembler.rezepte = { ...ASSEMBLER_REZEPTE, ...ASSEMBLER_NEU };
MASCHINEN.mischer = { name: 'Mischer', flaeche: [2, 2], leistung: 8, rezepte: MISCHER_REZEPTE, waehlbar: true, standard: 'beton' };
MASCHINEN.fertiger = { name: 'Fertiger', flaeche: [3, 3], leistung: 30, rezepte: FERTIGER_REZEPTE, waehlbar: true, standard: 'computer' };
FABRIK_TYPEN.add('mischer');
FABRIK_TYPEN.add('fertiger');

// ─── Gegenstände ────────────────────────────────────────────────────────────────────────────────

const ware = (id, name, text, extra = {}) => item(id, { name, kat: 'bauteil', sorte: 'bauteil', preis: PREISE_TEILE[id], bild: { art: id }, text, ...extra });

item('stahlbarren', {
  name: 'Stahlbarren', kat: 'barren', sorte: 'barren', preis: PREISE_TEILE.stahlbarren, bild: { art: 'barren', f: '#7e8ca2' },
  text: 'Aus dem Schmelzer: Eisenbarren und etwas Kohle. Härter als Eisen.',
});
ware('stahltraeger', 'Stahlträger', 'Aus dem Konstrukteur: Stahlbarren zu einem tragenden Balken.');
ware('metallrohr', 'Metallrohr', 'Aus dem Konstrukteur: Eisenbarren zu glatten Rohren.');
ware('kabelrolle', 'Kabelrolle', 'Aus dem Konstrukteur: Kupferdraht auf eine Holztrommel gewickelt. (Das Stromkabel zum Verlegen ist etwas anderes.)');
ware('rahmenplatte', 'Rahmenplatte', 'Aus dem Konstrukteur: Eisenplatten, vernietet und verstärkt.');
ware('nagel', 'Nägel', 'Aus dem Konstrukteur: ein Barren gibt acht Nägel.');
ware('zahnstange', 'Zahnstange', 'Aus dem Konstrukteur: Stahl mit Zähnen, für Antriebe.');
ware('platine', 'Platine', 'Aus dem Assembler: Kupferdraht auf Eisenplatte, grün lackiert.');
ware('kuehlkoerper', 'Kühlkörper', 'Aus dem Assembler: Kupfer und Eisen mit vielen Rippen.');
ware('rotor', 'Rotor', 'Aus dem Assembler: Rohre und Schrauben, die sich drehen.');
ware('stator', 'Stator', 'Aus dem Assembler: Rohre und Kabelrollen, die stillstehen.');
ware('rahmen', 'Rahmen', 'Aus dem Assembler: ein modularer Rahmen für große Maschinen.');
ware('motor', 'Motor', 'Aus dem Assembler: Rotoren und Statoren. Nur aus Maschinen, nicht von Hand.');
ware('beton', 'Beton', 'Aus dem Mischer: Stein und Wasser. Nur aus Maschinen.');
ware('betonplatte', 'Betonplatte', 'Aus dem Mischer: Beton, mit Eisen verstärkt. Nur aus Maschinen.');
ware('computer', 'Computer', 'Aus dem Fertiger: Platinen, Kabelrollen, Kühlkörper und ein Motor. Hochwertigste Ware.');
ware('antriebssystem', 'Antriebssystem', 'Aus dem Fertiger: Motoren, Rahmen, Antriebseinheiten und Zahnstangen. Die wertvollste Ware der Fabrik.');

/** Wasser als „Zutat" des Mischers: gibt es nur im Mischer (kommt aus den Rohren), nie im Rucksack oder auf dem Band. */
item('wasser', {
  name: 'Wasser', kat: 'bauteil', sorte: 'fluessig', preis: 0, verkaufbar: false, fluessig: true, bild: { art: 'wasser_einheit' },
  text: 'Fließt aus den Rohrleitungen in den Mischer (1 m³). Lässt sich nicht tragen.',
});

const maschine = (id, name, text) => item(id, { name, kat: 'platz', bild: { art: id }, aufstellbar: true, text });
maschine('mischer', 'Mischer', 'Rührt Beton und Betonplatten an. Stein vom Band, Wasser aus einer Rohrleitung an einer beliebigen Seite, Strom 8 MW. Rezept wählbar. Ausgang vorn.');
maschine('fertiger', 'Fertiger', 'Montiert aus bis zu vier Zutaten die hochwertigsten Waren: Computer und Antriebssysteme. Strom 30 MW. Rezept wählbar. Ausgang vorn.');

// ─── Bastelrezepte der Zwischenprodukte (dasselbe Verhältnis wie in den Maschinen) ─────────────

const frei = (id) => ['bergbau', FREISCHALT_TEILE[id]];
const hand = (id, rez) => rezept(id, { menge: rez.aus[id], zutaten: rez.ein, stufe: frei(id) });
for (const id of ['nagel', 'metallrohr', 'kabelrolle', 'rahmenplatte', 'stahltraeger', 'zahnstange']) hand(id, KONSTRUKTEUR_NEU[id]);
for (const id of ['platine', 'kuehlkoerper', 'rotor', 'stator', 'rahmen']) hand(id, ASSEMBLER_NEU[id]);
