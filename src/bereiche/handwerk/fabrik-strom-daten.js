// Bereich „handwerk" – Fabrik Stufe 2: alle Zahlen für Strom, Rohrleitungen und das Handy an einer Stelle, dazu die
// Gegenstände und Bastelrezepte. DOM-frei. Die Rechnung steht in fabrik-strom.js (Netze, Leistung, Sicherung) und
// fabrik-rohre.js (Wasser), der Kauf in fabrik-handy.js.
//
// Einheiten: Leistung in MW, Energie in MJ (1 MW = 1 MJ pro Sekunde), Zeit in Sekunden Fabrik-Uhr (wie Stufe 1),
// Wasser in m³, Durchfluss in m³/min. Die Zahlen folgen Satisfactory (Biomasse-Brenner 30 MW, Kohlekraftwerk 75 MW mit
// 45 m³/min Wasser, Wasserpumpe 120 m³/min für 20 MW, Rohre Mk1 300 und Mk2 600 m³/min).

import { item, rezept, erwartet } from '../../daten.js';
import { MASCHINEN, FABRIK_TYPEN, SORTEN, VORKOMMEN_PREIS, REINHEIT, vorkommenItem } from './fabrik-daten.js';

erwartet('kupferdraht', 'eisenplatte', 'zahnrad', 'maschinenteil', 'antriebseinheit', 'schraube');

/** Stromnetz: Reichweite und Anschlüsse. */
export const STROM = {
  kabelReichweite: 10, // Felder, von Mitte zu Mitte der verbundenen Teile
  kabelJeFeld: 1, // ein Kabel je angefangenes Feld Länge
  drahtErsatz: 1, // fehlt ein Kabel, ersetzt es so viel Kupferdraht
  uebergangTage: 7, // so viele Tage laufen Maschinen ohne Netz noch mit Übergangsstrom (alte Stände, Spielbeginn)
  /** Anschlüsse je Objekttyp; Maschinen ohne Eintrag haben einen. */
  anschluesse: { strommast: 4, biomassebrenner: 2, kohlekraftwerk: 2, wasserrad: 2, assembler: 2 },
};

/**
 * Generatoren. `leistung` = höchste Erzeugung (MW). `brennstoffe`: Brennwert je Stück (MJ); ein Stück reicht bei voller
 * Last `Brennwert / Leistung` Sekunden, bei Teillast entsprechend länger. `wasser`: m³/min bei voller Last, `tank` m³.
 * `frei`: ohne Brennstoff (Wasserrad, nur am Wasser). `puffer`: so viele Stück je Brennstoff nimmt er an.
 */
export const GENERATOREN = {
  biomassebrenner: { name: 'Biomasse-Brenner', leistung: 30, flaeche: [2, 2], puffer: 100, brennstoffe: { holz: 100, hartholz: 300, faser: 15 } },
  kohlekraftwerk: { name: 'Kohlekraftwerk', leistung: 75, flaeche: [3, 3], puffer: 50, brennstoffe: { kohle: 300 }, wasser: 45, tank: 50 },
  wasserrad: { name: 'Wasserrad', leistung: 6, flaeche: [1, 1], frei: true },
};

/** Wasserpumpe (nur am Ufer): fördert `rate` m³/min und braucht dafür `leistung` MW. */
export const PUMPE = { name: 'Wasserpumpe', leistung: 20, rate: 120 };

/** Rohrleitungen je Stufe: Durchfluss-Grenze in m³/min (ein Netz ist so stark wie sein schwächstes Rohr). */
export const ROHR = {
  volumen: 1, // m³ je Rohrstück
  stufen: { 1: { name: 'Rohrleitung', grenze: 300 }, 2: { name: 'Rohrleitung Mk2', grenze: 600 } },
  durchflussFenster: 20, // Zeitkonstante (s) der Durchfluss-Anzeige
};

/** Verbraucher, die Strom brauchen, aber keine Bänder bedienen (die Maschinen tragen `leistung` in MASCHINEN). */
export const STROM_VERBRAUCHER = { wasserpumpe: PUMPE.leistung };

/** Freischaltung (Bergbau-Stufe) der Bastelrezepte. Im Handy ist alles jederzeit zu haben. */
export const FREISCHALT_STROM = {
  stromkabel: 4, strommast: 4, biomassebrenner: 4, wasserrad: 4,
  foerderband_mk2: 5, rohrleitung: 5, wasserpumpe: 6, kohlekraftwerk: 7, rohrleitung_mk2: 7, foerderband_mk3: 7,
};

// ─── Handy: Katalog „Fabrikbedarf" (Preise in Gold) ─────────────────────────────────────────────────

/** Preise im Handy, je Stück. Kleinteile ab 0,1 Mio, Maschinen bis 10 Mio, das Kraftwerk mehr. */
export const HANDY_PREISE = {
  foerderband: 100_000,
  foerderband_mk2: 250_000,
  foerderband_mk3: 600_000,
  splitter: 300_000,
  zusammenfuehrer: 300_000,
  lager: 800_000,
  erzbohrer: 2_500_000,
  schmelzer: 2_000_000,
  konstrukteur: 3_000_000,
  assembler: 8_000_000,
  stromkabel: 100_000,
  strommast: 500_000,
  wasserrad: 1_500_000,
  biomassebrenner: 4_000_000,
  kohlekraftwerk: 25_000_000,
  wasserpumpe: 3_000_000,
  rohrleitung: 150_000,
  rohrleitung_mk2: 400_000,
};
/** Gruppen im Katalog (Reihenfolge der Anzeige). */
export const HANDY_GRUPPEN = [
  { id: 'foerderung', name: 'Förderung', ids: ['foerderband', 'foerderband_mk2', 'foerderband_mk3', 'splitter', 'zusammenfuehrer', 'lager'] },
  { id: 'maschinen', name: 'Maschinen', ids: ['erzbohrer', 'schmelzer', 'konstrukteur', 'assembler'] },
  { id: 'strom', name: 'Strom', ids: ['biomassebrenner', 'wasserrad', 'kohlekraftwerk', 'strommast', 'stromkabel'] },
  { id: 'wasser', name: 'Wasser', ids: ['wasserpumpe', 'rohrleitung', 'rohrleitung_mk2'] },
];
/** Mengen im Handy (dazu „Max"). */
export const HANDY_MENGEN = [1, 10, 100];
/** Vorkommen im Handy: Sorte und Reinheit, Preis aus VORKOMMEN_PREIS. */
export const vorkommenPreis = (reinName) => VORKOMMEN_PREIS[reinName];
export const VORKOMMEN_SORTEN = Object.keys(SORTEN);
export const VORKOMMEN_REINHEIT = Object.keys(REINHEIT);
export { vorkommenItem };

/** Starterpaket (einmal je Spielstand, sobald die erste Maschine Strom braucht): Paketfach im Handy. */
export const STARTER = [{ id: 'biomassebrenner', n: 1 }, { id: 'strommast', n: 2 }, { id: 'stromkabel', n: 30 }, { id: 'holz', n: 60 }];

// ─── Generatoren als Maschinen der Fabrik (Brennstoff vom Band oder aus der Hand) ───────────────────

for (const [id, g] of Object.entries(GENERATOREN)) {
  if (g.frei) continue;
  const rezepte = {};
  for (const [b, mj] of Object.entries(g.brennstoffe)) rezepte[b] = { name: b, ein: { [b]: 1 }, aus: {}, zeit: mj / g.leistung, mj };
  MASCHINEN[id] = { name: g.name, flaeche: g.flaeche, leistung: 0, erzeugt: g.leistung, rezepte, puffer: g.puffer, generator: true };
  FABRIK_TYPEN.add(id);
}

// ─── Gegenstände ────────────────────────────────────────────────────────────

const platzTeil = (id, name, text, extra = {}) => item(id, { name, kat: 'platz', bild: { art: id }, aufstellbar: true, text, ...extra });

item('foerderband_mk2', {
  name: 'Band Mk2', kat: 'platz', bild: { art: 'foerderband_mk2' }, aufstellbar: 'foerderband', mk: 2,
  text: 'Förderband der zweiten Stufe: doppelt so schnell (3 Felder/s, bis 12 Waren/s). Legen und drehen wie das einfache Band.',
});
item('foerderband_mk3', {
  name: 'Band Mk3', kat: 'platz', bild: { art: 'foerderband_mk3' }, aufstellbar: 'foerderband', mk: 3,
  text: 'Förderband der dritten Stufe, das schnellste (5 Felder/s, bis 20 Waren/s). Legen und drehen wie das einfache Band.',
});
platzTeil('biomassebrenner', 'Biomasse-Brenner', 'Generator, 30 MW. Verbrennt Holz (100 MJ), Hartholz (300 MJ) oder Faser (15 MJ) – vom Band oder aus der Hand. Bei Teillast hält ein Stück länger. Zwei Kabelanschlüsse.');
platzTeil('kohlekraftwerk', 'Kohlekraftwerk', 'Generator, 75 MW. Braucht Kohle (300 MJ je Stück) vom Band und Wasser über Rohrleitungen (45 m³/min bei voller Last). Zwei Kabelanschlüsse.');
platzTeil('wasserrad', 'Wasserrad', 'Kleiner Generator am Ufer von Fluss, Teich oder See: 6 MW ohne Brennstoff. Muss direkt am Wasser stehen.');
platzTeil('strommast', 'Strommast', `Verteilt Strom: ${STROM.anschluesse.strommast} Kabelanschlüsse, Kabel bis ${STROM.kabelReichweite} Felder lang. Aktionstaste zeigt das Netz und schaltet die Sicherung wieder ein.`);
platzTeil('wasserpumpe', 'Wasserpumpe', `Muss direkt am Wasser stehen. Fördert ${PUMPE.rate} m³/min in angrenzende Rohrleitungen und braucht dafür ${PUMPE.leistung} MW Strom.`);
platzTeil('rohrleitung', 'Rohrleitung', `Für Wasser (nicht für Waren). Verbindet sich mit Nachbarrohren, Pumpen und Kraftwerken; höchstens ${ROHR.stufen[1].grenze} m³/min je Netz. Darüber kann man gehen.`);
item('rohrleitung_mk2', {
  name: 'Rohrleitung Mk2', kat: 'platz', bild: { art: 'rohrleitung_mk2' }, aufstellbar: 'rohrleitung', mk: 2,
  text: `Dicke Rohrleitung: höchstens ${ROHR.stufen[2].grenze} m³/min. Ein Netz ist so stark wie sein schwächstes Rohr.`,
});
item('stromkabel', {
  name: 'Stromkabel', kat: 'bauteil', preis: 15, bild: { art: 'stromkabel' }, werkzeug: 'handwerk_kabel',
  text: `In die Hand nehmen und auf einen Anschluss benutzen (Strommast, Generator, Maschine), dann auf den zweiten. Je Feld Länge ein Kabel, höchstens ${STROM.kabelReichweite} Felder.`,
});
item('handy', {
  name: 'Handy', kat: 'besonders', bild: { art: 'handy' }, werkzeug: 'handwerk_handy', stapel: false, verkaufbar: false,
  text: 'Benutzen öffnet das Handy: Fabrikbedarf und Vorkommen bestellen (Lieferung sofort in den Rucksack), Paketfach, Stromnetze. Geht auch über Menü › Handy.',
});

// ─── Bastelrezepte ─────────────────────────────────────────────────────────

const frei = (id) => ['bergbau', FREISCHALT_STROM[id]];
rezept('stromkabel', { menge: 2, zutaten: { kupferdraht: 1 }, stufe: frei('stromkabel') });
rezept('strommast', { zutaten: { holz: 8, kupferdraht: 2, stein: 4 }, stufe: frei('strommast') });
rezept('biomassebrenner', { zutaten: { eisenplatte: 8, kupferdraht: 6, stein: 30 }, stufe: frei('biomassebrenner') });
rezept('wasserrad', { zutaten: { holz: 60, zahnrad: 2, eisenplatte: 2 }, stufe: frei('wasserrad') });
// Mk2 ohne einfaches Band als Zutat (im Basteln-Menü bleibt „Förderband" so eindeutig)
rezept('foerderband_mk2', { menge: 2, zutaten: { eisenplatte: 1, schraube: 2, stein: 2 }, stufe: frei('foerderband_mk2') });
rezept('rohrleitung', { menge: 2, zutaten: { eisenplatte: 1 }, stufe: frei('rohrleitung') });
rezept('wasserpumpe', { zutaten: { eisenplatte: 10, zahnrad: 4, maschinenteil: 2 }, stufe: frei('wasserpumpe') });
rezept('kohlekraftwerk', { zutaten: { maschinenteil: 10, eisenplatte: 20, antriebseinheit: 2, stein: 100 }, stufe: frei('kohlekraftwerk') });
rezept('rohrleitung_mk2', { menge: 2, zutaten: { rohrleitung: 2, kupferbarren: 1 }, stufe: frei('rohrleitung_mk2') });
rezept('foerderband_mk3', { menge: 2, zutaten: { foerderband_mk2: 2, maschinenteil: 1 }, stufe: frei('foerderband_mk3') });

/** Anschlüsse eines Objekttyps (0 = kein Stromanschluss). */
export function anschluesseVon(t) {
  if (STROM.anschluesse[t] != null) return STROM.anschluesse[t];
  if (STROM_VERBRAUCHER[t] || MASCHINEN[t]?.leistung > 0) return 1;
  return 0;
}
/** Strombedarf eines Verbrauchers (MW), solange er arbeitet. */
export const bedarfVon = (t) => STROM_VERBRAUCHER[t] ?? (MASCHINEN[t]?.generator ? 0 : MASCHINEN[t]?.leistung ?? 0);
