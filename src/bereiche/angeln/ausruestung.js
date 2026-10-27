// Bereich „angeln": Ruten und Köder – nur Zahlen. angeln.js (wurfWerte) liest sie am Item:
//   rute:   { warten (Faktor auf die Wartezeit), fenster (+ s zum Einholen), schatz (+ Schatzchance) }
//   koeder: { biss (Faktor auf die Wartezeit), fenster, schatz }
// und reicht sie durch die Modifikatoren bissZeit, bissFenster und schatzChance (Buffs, Ringe).
// Die Tabelle unten ist die eine Stelle zum Abstimmen; das Fangbuch zeigt sie an.

import { item } from '../../daten.js';

/** Ruten: Bambus → Glasfaser → Iridium. Preis bei Lene, ab Angelstufe. `farben` malt die Rute in der Hand. */
export const RUTEN = [
  {
    id: 'angel', name: 'Bambusangel', preis: 500, abStufe: 0,
    rute: { warten: 1, fenster: 0, schatz: 0 },
    bild: { art: 'angel' },
    farben: { griff: '#6a3e1e', mitte: '#c89a4c', spitze: '#ecd08a' },
    text: 'Am Wasser „Benutzen": Schnur auswerfen. Taucht der Schwimmer ab, sofort einholen!',
  },
  {
    id: 'glasfaserrute', name: 'Glasfaserrute', preis: 1800, abStufe: 2,
    rute: { warten: 0.85, fenster: 0.2, schatz: 0.01 },
    bild: { art: 'angel', f: '#e8e4d8', f2: '#ffffff', griff: '#2a3a5a', rolle: '#c8ccd2', faden: '#e8f4ff' },
    farben: { griff: '#2a3a5a', mitte: '#d8d4c8', spitze: '#ffffff' },
    text: 'Leicht und biegsam. Die Fische beißen etwas schneller, und du hast mehr Zeit zum Einholen.',
  },
  {
    id: 'iridiumrute', name: 'Iridiumrute', preis: 7500, abStufe: 6,
    rute: { warten: 0.7, fenster: 0.4, schatz: 0.03 },
    bild: { art: 'angel', f: '#9a6ad0', f2: '#e0c8ff', griff: '#3a2a4a', rolle: '#e8d06a', faden: '#f0e0ff' },
    farben: { griff: '#3a2a4a', mitte: '#9a6ad0', spitze: '#e0c8ff' },
    text: 'Glänzt violett und spürt jeden Biss. Kürzeste Wartezeit, längstes Einhol-Fenster, öfter Schätze.',
  },
];

/** Köder: verbraucht beim Auswerfen (der erste Köder im Rucksack). Auch für den Krebskorb. */
export const KOEDER = [
  {
    id: 'koeder', name: 'Köder', preis: 5, abStufe: 0, verkauf: 1,
    koeder: { biss: 0.5 },
    text: 'Wird beim Auswerfen verbraucht. Dafür beißen die Fische doppelt so schnell.',
  },
  {
    id: 'wildkoeder', name: 'Wildköder', preis: 15, abStufe: 2, verkauf: 3,
    koeder: { biss: 0.4, fenster: 0.15 },
    text: 'Würmer mit Waldkräutern. Noch schneller als Köder, und die Fische hängen fester am Haken.',
  },
  {
    id: 'magnetkoeder', name: 'Magnetköder', preis: 40, abStufe: 4, verkauf: 8,
    koeder: { biss: 0.8, schatz: 0.08 },
    text: 'Zieht alles an, was glänzt. Fische beißen kaum schneller, aber Schatzkisten viel öfter.',
  },
];

for (const r of RUTEN) {
  item(r.id, { name: r.name, kat: 'werkzeug', bild: r.bild, werkzeug: 'angel', rute: r.rute, ruteFarben: r.farben, text: r.text });
}
for (const k of KOEDER) {
  item(k.id, { name: k.name, kat: 'koeder', preis: k.verkauf, bild: { art: k.id }, koeder: k.koeder, text: k.text });
}

/** Zeilen für die kleine Tabelle im Fangbuch: { name, warten, fenster, schatz } (warten als Faktor). */
export function ausruestungTabelle() {
  const zeile = (x, z) => ({ id: x.id, name: x.name, warten: z.warten ?? z.biss ?? 1, fenster: z.fenster ?? 0, schatz: z.schatz ?? 0, preis: x.preis, abStufe: x.abStufe });
  return { ruten: RUTEN.map((r) => zeile(r, r.rute)), koeder: KOEDER.map((k) => zeile(k, k.koeder)) };
}
