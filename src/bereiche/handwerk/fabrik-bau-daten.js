// Bereich „handwerk" – Fabrik Stufe 3: der Maschinenbauer. Alle Zahlen an einer Stelle: die Baupläne (jedes Fabrikteil, das das
// Handy verkauft, aus herstellbaren Teilen), ihre Freischaltung nach Bergbau-Stufe, die Reichweite für Lager und Truhen, der
// Preis im Handy und das Basteln des Maschinenbauers selbst. DOM-frei.
//
// Selbst bauen ist die günstigere Alternative zum Kaufen: `rohstoffWert(id)` rechnet einen Bauplan bis zu den Barren, Steinen und
// Kohlen zurück (zu deren Verkaufspreis) und `selbstbauVerhaeltnis(id)` setzt das ins Verhältnis zum Handy-Preis; ein Test
// verlangt, dass es klar darunter liegt. Die Preise der Handy-Teile bleiben unverändert (fabrik-strom-daten.js).

import { item, rezept, erwartet, ITEMS } from '../../daten.js';
import { MASCHINEN } from './fabrik-daten.js';
import { HANDY_PREISE, HANDY_GRUPPEN } from './fabrik-strom-daten.js';
import './fabrik-teile-daten.js';

erwartet('holz', 'stein', 'kupferdraht', 'eisenplatte', 'schraube', 'zahnrad', 'maschinenteil');

/** Zahlen des Maschinenbauers. */
export const BAU = {
  flaeche: [3, 3],
  reichweite: 3, // Felder (Abstand zwischen den Flächen): Lager und Truhen so nah liefern Zutaten und nehmen Fertiges auf
  mengen: [1, 5, 10], // Mengenwahl im Fenster (dazu „Max")
  animation: 2.4, // Sekunden, die der Maschinenbauer nach dem Bauen arbeitet (nur Darstellung)
  basteln: 4, // ab dieser Bergbau-Stufe lässt sich der Maschinenbauer von Hand basteln
};
/** Preis des Maschinenbauers und der neuen Maschinen im Handy (Gold). Die Preise der übrigen Teile stehen in fabrik-strom-daten.js. */
export const HANDY_PREISE_NEU = { maschinenbauer: 3_500_000, mischer: 5_000_000, fertiger: 10_000_000 };

/**
 * Baupläne: `menge` Stück je Bau, `zutaten` aus dem Rucksack und aus Lagern/Truhen in Reichweite, `stufe` = ab dieser
 * Bergbau-Stufe sichtbar und baubar (gestaffelt: erst Teile aus Platten, Draht und Schrauben, dann Rohre, Kabelrollen,
 * Rahmen und Motoren), `gruppe` für die Anzeige.
 */
export const BAUPLAENE = {
  // Förderung
  foerderband: { gruppe: 'foerderung', stufe: 4, menge: 4, zutaten: { eisenplatte: 2, schraube: 4 } },
  foerderband_mk2: { gruppe: 'foerderung', stufe: 5, menge: 2, zutaten: { eisenplatte: 3, schraube: 6, zahnrad: 1 } },
  foerderband_mk3: { gruppe: 'foerderung', stufe: 7, menge: 2, zutaten: { rahmenplatte: 2, stahltraeger: 2, zahnrad: 2 } },
  splitter: { gruppe: 'foerderung', stufe: 5, menge: 1, zutaten: { eisenplatte: 3, kabelrolle: 1, schraube: 4 } },
  zusammenfuehrer: { gruppe: 'foerderung', stufe: 5, menge: 1, zutaten: { eisenplatte: 3, kabelrolle: 1, schraube: 4 } },
  lager: { gruppe: 'foerderung', stufe: 5, menge: 1, zutaten: { eisenplatte: 8, metallrohr: 4, schraube: 10 } },
  // Maschinen
  erzbohrer: { gruppe: 'maschinen', stufe: 5, menge: 1, zutaten: { eisenplatte: 6, zahnrad: 4, kabelrolle: 2, schraube: 12 } },
  schmelzer: { gruppe: 'maschinen', stufe: 5, menge: 1, zutaten: { eisenplatte: 4, metallrohr: 6, kabelrolle: 4 } },
  konstrukteur: { gruppe: 'maschinen', stufe: 5, menge: 1, zutaten: { eisenplatte: 8, kabelrolle: 6, zahnrad: 4, schraube: 10 } },
  mischer: { gruppe: 'maschinen', stufe: 6, menge: 1, zutaten: { eisenplatte: 8, metallrohr: 6, zahnrad: 4, kabelrolle: 3 } },
  assembler: { gruppe: 'maschinen', stufe: 7, menge: 1, zutaten: { maschinenteil: 8, rahmenplatte: 8, kabelrolle: 12, zahnrad: 8 } },
  fertiger: { gruppe: 'maschinen', stufe: 8, menge: 1, zutaten: { maschinenteil: 6, motor: 4, rahmen: 4, kabelrolle: 10, stahltraeger: 8 } },
  maschinenbauer: { gruppe: 'maschinen', stufe: 4, menge: 1, zutaten: { eisenplatte: 12, schraube: 24, zahnrad: 6, kupferdraht: 10 } },
  // Strom
  stromkabel: { gruppe: 'strom', stufe: 4, menge: 10, zutaten: { kupferdraht: 4 } },
  strommast: { gruppe: 'strom', stufe: 4, menge: 1, zutaten: { eisenplatte: 2, kupferdraht: 4, nagel: 6 } },
  biomassebrenner: { gruppe: 'strom', stufe: 5, menge: 1, zutaten: { eisenplatte: 6, metallrohr: 4, kabelrolle: 4, zahnrad: 2 } },
  wasserrad: { gruppe: 'strom', stufe: 5, menge: 1, zutaten: { eisenplatte: 4, zahnrad: 4, metallrohr: 4, nagel: 20 } },
  kohlekraftwerk: { gruppe: 'strom', stufe: 8, menge: 1, zutaten: { rahmen: 8, betonplatte: 20, stahltraeger: 16, kabelrolle: 24 } },
  // Wasser
  rohrleitung: { gruppe: 'wasser', stufe: 5, menge: 4, zutaten: { metallrohr: 2, schraube: 2 } },
  rohrleitung_mk2: { gruppe: 'wasser', stufe: 6, menge: 4, zutaten: { stahltraeger: 1, metallrohr: 4, schraube: 4 } },
  wasserpumpe: { gruppe: 'wasser', stufe: 6, menge: 1, zutaten: { metallrohr: 6, zahnrad: 4, kabelrolle: 4, maschinenteil: 2 } },
};
/** Gruppen im Fenster und im Handy (Reihenfolge der Anzeige). */
export const BAU_GRUPPEN = [
  { id: 'foerderung', name: 'Förderung' },
  { id: 'maschinen', name: 'Maschinen' },
  { id: 'strom', name: 'Strom' },
  { id: 'wasser', name: 'Wasser' },
];

// ─── Handy: die neuen Maschinen kommen in den Katalog ───────────────────────────────────────────

Object.assign(HANDY_PREISE, HANDY_PREISE_NEU);
const maschinenGruppe = HANDY_GRUPPEN.find((g) => g.id === 'maschinen');
for (const id of Object.keys(HANDY_PREISE_NEU)) if (maschinenGruppe && !maschinenGruppe.ids.includes(id)) maschinenGruppe.ids.push(id);

// ─── Gegenstand und Bastelrezept des Maschinenbauers ────────────────────────────────────────────

item('maschinenbauer', {
  name: 'Maschinenbauer', kat: 'platz', bild: { art: 'maschinenbauer' }, aufstellbar: true,
  text: `Werkbank für Fabrikteile (${BAU.flaeche[0]}×${BAU.flaeche[1]} Felder). Aktionstaste: Fenster „Maschinenbau" – baut Bänder, Maschinen, Strom- und Wasserteile aus Platten, Kabelrollen, Rohren und Motoren. Zutaten kommen aus dem Rucksack und aus Lagern und Truhen bis ${BAU.reichweite} Felder entfernt.`,
});
rezept('maschinenbauer', { zutaten: { eisenplatte: 12, schraube: 24, zahnrad: 6, kupferdraht: 10, holz: 30 }, stufe: ['bergbau', BAU.basteln] });

// ─── Auswertung der Pläne ───────────────────────────────────────────────────────────────────────

/** Grundstoffe der Rechnung: Barren zählen zu ihrem Verkaufspreis (der Schmelzer davor bleibt außen vor). */
const BARREN = new Set(['eisenbarren', 'kupferbarren', 'goldbarren']);
const REZEPT_QUELLEN = ['schmelzer', 'konstrukteur', 'assembler', 'mischer', 'fertiger'];

/** Alle Maschinenrezepte als flache Liste { maschine, id, name, ein, aus, zeit }. */
export function maschinenRezepte() {
  const liste = [];
  for (const m of REZEPT_QUELLEN) for (const [id, r] of Object.entries(MASCHINEN[m]?.rezepte || {})) liste.push({ maschine: m, id, name: r.name, ein: r.ein, aus: r.aus, zeit: r.zeit });
  return liste;
}
/** Maschinenrezept, das `id` herstellt (oder null: Grundstoff). */
export function herstellerVon(id) {
  return maschinenRezepte().find((r) => r.aus[id] > 0) ?? null;
}

/**
 * Wert eines Gegenstands in Gold, wenn man ihn bis zu den Grundstoffen zurückrechnet (Barren, Kohle, Stein, Holz zum
 * Verkaufspreis, Wasser umsonst). Stückzahlen je Durchgang sind eingerechnet.
 */
export function rohstoffWert(id, tiefe = 0) {
  if (id === 'wasser') return 0;
  const r = tiefe < 12 && !BARREN.has(id) ? herstellerVon(id) : null;
  if (!r) return ITEMS[id]?.preis ?? 0;
  let summe = 0;
  for (const [z, n] of Object.entries(r.ein)) summe += n * rohstoffWert(z, tiefe + 1);
  return summe / r.aus[id];
}
/** Rohstoffwert eines Bauplans (alle Zutaten, für `menge` Stück) je Stück. */
export function planWert(id) {
  const p = BAUPLAENE[id];
  let summe = 0;
  for (const [z, n] of Object.entries(p.zutaten)) summe += n * rohstoffWert(z);
  return summe / p.menge;
}
/** Selbstbau-Rohstoffwert geteilt durch den Handy-Preis (kleiner = günstiger). */
export const selbstbauVerhaeltnis = (id) => planWert(id) / HANDY_PREISE[id];

/** Gegenstände, die in Plänen oder Maschinenrezepten vorkommen (für den Materialfilter im Handy), sortiert nach Name. */
export function materialien() {
  const ids = new Set();
  for (const p of Object.values(BAUPLAENE)) for (const z of Object.keys(p.zutaten)) ids.add(z);
  for (const r of maschinenRezepte()) { for (const z of Object.keys(r.ein)) ids.add(z); for (const z of Object.keys(r.aus)) ids.add(z); }
  ids.delete('wasser');
  return [...ids].filter((id) => ITEMS[id]).sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name, 'de'));
}
