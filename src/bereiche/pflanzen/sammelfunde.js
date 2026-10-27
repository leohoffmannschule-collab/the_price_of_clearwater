// Bereich „pflanzen": Sammelfunde je Jahreszeit und Sammelzonen-Art (Kartenfeld `sammel[].art`:
// wiese, wald, strand, berg, dorf, geheimwald). Der Kern wählt aus dem Pool `L.sammelPool(art, jz)`;
// `fundort` darf eine Liste sein. Strandfunde bleiben beim Jahreszeitwechsel liegen (`saisonal: false`).
// Dazu die Wildsamen: aus vier Funden einer Jahreszeit gebastelt, wächst daraus einer davon.

import { JZ_NAME, item, pflanze, rezept } from '../../daten.js';
import { JZ_FARBE } from './feldfruechte.js';

/** Sammelfund; `sorte` folgt aus frucht/gemuese, wenn nicht angegeben. */
function wild(id, name, preis, bild, extra = {}) {
  const sorte = extra.sorte ?? (extra.frucht ? 'obst' : extra.gemuese ? 'gemuese' : undefined);
  item(id, { name, kat: 'sammel', preis, bild, fundort: 'wald', ...extra, sorte });
}
const strand = { fundort: 'strand', strand: true, saisonal: false };

// ─── Frühling ───────────────────────────────────────────────────────────────
wild('meerrettich', 'Wilder Meerrettich', 50, { art: 'wurzel', f: '#e6dcc2', f2: '#7ba05b' }, { energie: 13, jz: ['fruehling'], gemuese: true, fundort: ['wald', 'wiese'] });
wild('narzisse', 'Narzisse', 30, { art: 'bluete', f: '#f5d83a', f2: '#fbf3c4' }, { jz: ['fruehling'], sorte: 'blume', fundort: ['wiese', 'dorf'] });
wild('lauch', 'Lauch', 60, { art: 'lauch' }, { energie: 40, jz: ['fruehling'], gemuese: true, fundort: ['wald', 'wiese'] });
wild('loewenzahn', 'Löwenzahn', 40, { art: 'bluete', f: '#f2c12e', f2: '#f7d64a' }, { energie: 25, jz: ['fruehling'], sorte: 'kraut', fundort: ['wiese', 'dorf'] });
wild('fruehlingszwiebel', 'Frühlingszwiebel', 8, { art: 'fruehlingszwiebel', f: '#f4f2e4', f2: '#6ab04a' }, { energie: 13, jz: ['fruehling'], gemuese: true, fundort: ['wald', 'berg'], text: 'Wächst wild am Waldrand. Riecht nach Frühlingsfest.' });
wild('morchel', 'Morchel', 150, { art: 'morchel', f: '#a8885a' }, { energie: 20, jz: ['fruehling'], sorte: 'pilz', fundort: ['wald', 'geheimwald'], text: 'Sieht aus wie ein Schwamm, schmeckt wie ein Fest.' });
wild('baerlauch', 'Bärlauch', 45, { art: 'baerlauch', f: '#4ea84a', f2: '#f8f8f0' }, { energie: 25, jz: ['fruehling'], sorte: 'kraut', fundort: ['wald', 'geheimwald'], text: 'Würzig wie Knoblauch, nur freundlicher.' });
wild('enzian', 'Enzian', 70, { art: 'enzian', f: '#2f56c8', f2: '#5a86e8' }, { jz: ['fruehling', 'sommer'], sorte: 'blume', fundort: 'berg', text: 'So blau wie der Himmel über dem Berg.' });
// ─── Sommer ─────────────────────────────────────────────────────────────────
wild('gewuerzbeere', 'Gewürzbeere', 80, { art: 'beeren', f: '#d8402e' }, { energie: 63, jz: ['sommer'], frucht: true, fundort: ['wald', 'berg'] });
wild('wildtraube', 'Wildtraube', 80, { art: 'traube', f: '#7b4fae' }, { energie: 38, jz: ['sommer'], frucht: true, fundort: ['wiese', 'dorf'] });
wild('platterbse', 'Platterbse', 50, { art: 'bluete', f: '#e58fc8', f2: '#f7d0ea' }, { jz: ['sommer'], sorte: 'blume', fundort: ['wiese', 'dorf'] });
wild('holunder', 'Holunderbeeren', 60, { art: 'holunder', f: '#3a2a4e' }, { energie: 25, jz: ['sommer'], frucht: true, fundort: ['wald', 'dorf'], text: 'Dunkle Dolden vom Holunderstrauch. Roh lieber nicht.' });
wild('kamille', 'Kamille', 40, { art: 'kamille', f: '#f6f2e8', f2: '#f2c43a' }, { energie: 10, jz: ['sommer'], sorte: 'kraut', fundort: ['wiese', 'dorf'], text: 'Für Tee und gegen alles, sagt Frieda.' });
wild('walderdbeere', 'Walderdbeere', 70, { art: 'walderdbeere', f: '#e0303a' }, { energie: 20, jz: ['sommer'], frucht: true, fundort: ['wald', 'berg'], text: 'Winzig und doppelt so süß wie die große Schwester.' });
wild('edelweiss', 'Edelweiß', 120, { art: 'edelweiss', f: '#f4f4ec', f2: '#e8d860' }, { jz: ['sommer'], sorte: 'blume', fundort: 'berg', selten: true, text: 'Wächst nur, wo es sich verdient hat.' });
wild('farnspross', 'Farnspross', 90, { art: 'farnspross', f: '#6aa84a' }, { energie: 25, jz: ['sommer'], gemuese: true, fundort: ['geheimwald', 'wald'], text: 'Eingerollt wie ein schlafender Geiger.' });
wild('steinpilz', 'Steinpilz', 130, { art: 'steinpilz', f: '#8a5a32' }, { energie: 50, jz: ['sommer', 'herbst'], sorte: 'pilz', fundort: ['wald', 'geheimwald'], text: 'Der König im Körbchen.' });
// ─── Herbst ─────────────────────────────────────────────────────────────────
wild('brombeere', 'Brombeere', 20, { art: 'beeren', f: '#3b2a4f' }, { energie: 25, jz: ['herbst'], frucht: true, fundort: ['wald', 'wiese', 'dorf'] });
wild('haselnuss', 'Haselnuss', 90, { art: 'nuss', f: '#a8743f' }, { energie: 30, jz: ['herbst'], fundort: ['wald', 'dorf'], sorte: 'obst' });
wild('pilz', 'Wiesenchampignon', 40, { art: 'pilz', f: '#eadfce' }, { energie: 38, jz: ['herbst'], sorte: 'pilz', fundort: ['wiese', 'wald'] });
wild('pfifferling', 'Pfifferling', 160, { art: 'pfifferling', f: '#e8a13a' }, { energie: 75, jz: ['herbst'], sorte: 'pilz', fundort: ['wald', 'geheimwald'] });
wild('wildpflaume', 'Wilde Pflaume', 80, { art: 'pflaume', f: '#6b3d8f' }, { energie: 25, jz: ['herbst'], frucht: true, fundort: ['wald', 'wiese'] });
wild('hagebutte', 'Hagebutte', 50, { art: 'hagebutte', f: '#e04a2a' }, { energie: 15, jz: ['herbst'], frucht: true, fundort: ['wiese', 'dorf', 'berg'], text: 'Rot, rund und ein bisschen kratzig innen.' });
wild('wacholder', 'Wacholderbeeren', 70, { art: 'beeren', f: '#3a4a7a' }, { energie: 10, jz: ['herbst'], sorte: 'kraut', fundort: 'berg', text: 'Herb und harzig. Gut zu Wild – und zu Geschichten.' });
wild('fliegenpilz', 'Fliegenpilz', 60, { art: 'fliegenpilz', f: '#d8282a' }, { jz: ['herbst'], sorte: 'pilz', fundort: ['wald', 'geheimwald'], selten: true, text: 'Hübsch anzusehen. Nicht anbeißen.' });
// ─── Winter ─────────────────────────────────────────────────────────────────
wild('winterwurzel', 'Winterwurzel', 70, { art: 'knolle', f: '#a8865a' }, { energie: 25, jz: ['winter'], gemuese: true, fundort: ['wald', 'wiese'] });
wild('kristallfrucht', 'Kristallfrucht', 150, { art: 'kristallfrucht', f: '#9fe0f0' }, { energie: 63, jz: ['winter'], frucht: true, fundort: ['wald', 'berg'] });
wild('krokus', 'Krokus', 60, { art: 'tulpe', f: '#a77ad8' }, { jz: ['winter'], sorte: 'blume', fundort: ['wiese', 'dorf'] });
wild('stechpalme', 'Stechpalme', 80, { art: 'stechpalme' }, { jz: ['winter'], fundort: ['wald', 'dorf', 'geheimwald'], sorte: 'kraut' });
wild('schneeyams', 'Schneeyams', 100, { art: 'schneeyams', f: '#e8e0f0', f2: '#a88ab8' }, { energie: 30, jz: ['winter'], gemuese: true, fundort: ['wiese', 'berg'], text: 'Unter dem Schnee gefunden. Kalt, aber herzlich.' });
wild('mistel', 'Mistel', 90, { art: 'mistel', f: '#8ab84a', f2: '#f4f4ec' }, { jz: ['winter'], sorte: 'kraut', fundort: ['geheimwald', 'wald'], text: 'Wer darunter steht, wird rot. Angeblich.' });
// ─── Geheimer Wald, das ganze Jahr ──────────────────────────────────────────
wild('veilchenpilz', 'Veilchenpilz', 250, { art: 'pilz', f: '#8a4ac8' }, { energie: 63, sorte: 'pilz', fundort: 'geheimwald', selten: true, text: 'Leuchtet im Dunkeln ein ganz kleines bisschen.' });
// ─── Strand ─────────────────────────────────────────────────────────────────
wild('muschel', 'Venusmuschel', 50, { art: 'muschel', f: '#d8c8b0' }, { ...strand });
wild('herzmuschel', 'Herzmuschel', 50, { art: 'herzmuschel', f: '#e8b8a0' }, { ...strand });
wild('koralle', 'Koralle', 80, { art: 'koralle', f: '#f07a6a' }, { ...strand });
wild('seeigel', 'Seeigel', 160, { art: 'seeigel', f: '#6a3a7a' }, { ...strand, selten: true });
wild('nautilus', 'Nautilusschale', 120, { art: 'nautilus', f: '#f0e0d0', f2: '#c06a40' }, { ...strand, jz: ['winter'] });
wild('regenbogenmuschel', 'Regenbogenmuschel', 65, { art: 'regenbogenmuschel', f: '#f0c8d8' }, { ...strand, jz: ['sommer'], text: 'Schimmert in allen Farben, die der Sommer kennt.' });

// ─── Wildsamen ──────────────────────────────────────────────────────────────
// Aus vier Funden einer Jahreszeit: zehn Samen. Gesät wächst daraus zufällig einer der vier
// (eine Pflanze „pflanzen_wild_<fund>" je Fund, alle mit derselben Saat; inhalt.js sät).

export const WILDSAMEN = {
  fruehling: { name: 'Frühlings-Wildsamen', funde: ['meerrettich', 'narzisse', 'lauch', 'loewenzahn'], stufe: 1 },
  sommer: { name: 'Sommer-Wildsamen', funde: ['gewuerzbeere', 'wildtraube', 'platterbse'], stufe: 3 },
  herbst: { name: 'Herbst-Wildsamen', funde: ['pilz', 'wildpflaume', 'haselnuss', 'brombeere'], stufe: 5 },
  winter: { name: 'Winter-Wildsamen', funde: ['winterwurzel', 'kristallfrucht', 'schneeyams', 'krokus'], stufe: 6 },
};

for (const [jz, w] of Object.entries(WILDSAMEN)) {
  const saat = `wildsamen_${jz}`;
  item(saat, {
    name: w.name, kat: 'saat', preis: 30, bild: { art: 'pflanzen_wildsaat', f: JZ_FARBE[jz] }, wildsamen: jz,
    text: `${JZ_NAME[jz]}. Eine Handvoll Wildnis: Reift in 7 Tagen zu einem Sammelfund der Jahreszeit.`,
  });
  for (const fund of w.funde) pflanze(`pflanzen_wild_${fund}`, { saat, ernte: fund, tage: 7, jz: [jz], wuchs: 'pflanzen_wild' });
  rezept(saat, { art: 'basteln', menge: 10, zutaten: Object.fromEntries(w.funde.map((id) => [id, 1])), stufe: ['sammeln', w.stufe] });
}
