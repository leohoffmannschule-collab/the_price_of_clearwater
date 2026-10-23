// Bereich „dorf": die große Dorfkarte Klarwasser, 100×72 Felder.
//
// Aufbau (Koordinaten in Feldern):
//   Marktplatz   x 33–66, y 23–40, Brunnen in der Mitte, Festplatz „fest" = [38, 25, 24, 14]
//   Nordstraße   x 49–51 vom Berg (y 0) auf den Platz; dort Rathaus, Krämerladen, Gasthaus, Arzt
//   Hauptstraße  y 29–31 vom Hof (x 0) über den Platz und die Hauptbrücke zum Ostufer
//   Südstraße    x 49–51 vom Platz zum Strand (y 71); Waldweg y 52–54 vom Wald (x 0)
//   Westviertel  Haus Rosa, Schmiede, Museum nördlich der Hauptstraße; Wohnhäuser, Spielplatz, Atelier südlich
//   Ostviertel   Gemeinschaftsgarten, die Mühle am Fluss, Streuobstwiese
//   Fluss        x ≈ 80–86 von Nord nach Süd, zwei Brücken; am Ostufer Friedhof und Wiesen
//
// Alle Namen, die keine Gegenstände sind, beginnen mit „dorf_" (Deko, Gebäude, Bedingungen, Aktionen).

import { karte, raster, rechteck, ellipse, pfad, fertigRaster } from '../../karten.js';
import { hash } from '../../zufall.js';

const B = 100;
const H = 72;
const g = raster(B, H, '.');

// ─── Wald als Rand: unregelmäßig 2–5 Felder dick ────────────────────────────

const dicke = (i, s) => Math.max(2, Math.min(5, 3 + Math.round(1.3 * Math.sin(i / 5.3 + s) + 0.9 * Math.sin(i / 2.1 + s * 2))));
for (let i = 0; i < B; i++) {
  rechteck(g, i, 0, 1, dicke(i, 0), '#');
  rechteck(g, i, H - dicke(i, 1), 1, dicke(i, 1), '#');
}
for (let j = 0; j < H; j++) {
  rechteck(g, 0, j, dicke(j, 2), 1, '#');
  rechteck(g, B - dicke(j, 3), j, dicke(j, 3), 1, '#');
}

// ─── Fluss, Brücken ─────────────────────────────────────────────────────────

pfad(g, [[80, 0], [80, 12], [82, 20], [82, 38], [80, 44], [80, 52], [77, 58], [77, 71]], 4, '~');
/** Erste Wasserspalte einer Zeile (Ufer), für Punkte am Fluss. */
const wasserAb = (y) => g[y].indexOf('~');

// ─── Wege ───────────────────────────────────────────────────────────────────

// Wege außerhalb des Platzes: Erde
rechteck(g, 49, 0, 3, 24, ':');                      // Nordstraße
rechteck(g, 49, 41, 3, 31, ':');                     // Südstraße
rechteck(g, 0, 29, 34, 3, ':');                      // Hauptstraße West
rechteck(g, 67, 29, 15, 3, ':');                     // Hauptstraße Ost bis zur Brücke
rechteck(g, 0, 52, 49, 3, ':');                      // Waldweg
rechteck(g, 4, 13, 74, 3, ':');                      // Obere Gasse
rechteck(g, 4, 13, 2, 42, ':');                      // Westgasse
rechteck(g, 4, 39, 29, 2, ':');                      // Mittelgasse
rechteck(g, 52, 51, 24, 2, ':');                     // Ostgasse
rechteck(g, 67, 39, 6, 2, ':');                      // zur Bäckerei
rechteck(g, 72, 32, 2, 19, ':');                     // Mühlweg
rechteck(g, 72, 49, 8, 2, ':');                      // Weg zur Mühle
rechteck(g, 77, 16, 2, 26, ':');                     // Uferweg
rechteck(g, 72, 40, 7, 2, ':');
rechteck(g, 74, 50, 2, 11, ':');                     // zur Südbrücke
rechteck(g, 74, 60, 8, 2, ':');
// Marktplatz: Pflaster, Zierpflaster um den Brunnen
rechteck(g, 33, 23, 34, 18, '=');
ellipse(g, 50, 32, 6.5, 5, 'j');
rechteck(g, 49, 23, 3, 8, 'j');                    // Zierpflaster-Streifen von Norden zum Brunnen
rechteck(g, 33, 29, 6, 3, 'j');
rechteck(g, 61, 29, 6, 3, 'j');
rechteck(g, 49, 23, 3, 3, '=');                      // Nordstraße läuft gepflastert auf den Platz
// Brücken
rechteck(g, 86, 29, 2, 3, ':');
rechteck(g, 82, 29, 4, 3, 'h');                      // Hauptbrücke (über das Wasser x 82–85)
rechteck(g, 77, 60, 4, 2, 'h');                      // Südbrücke (Wasser x 77–80)
// Ostufer
pfad(g, [[86, 30], [90, 30], [90, 25]], 2, ':');     // zum Friedhof
pfad(g, [[90, 31], [90, 44], [88, 56], [83, 60]], 2, ':');
// Friedhof (Kies innen, Wege)
rechteck(g, 87, 7, 8, 17, 'i');
rechteck(g, 90, 7, 2, 17, 'g');
rechteck(g, 87, 14, 8, 1, 'g');
// Spielplatz: Sand
rechteck(g, 7, 43, 16, 7, 's');
// Gemeinschaftsgarten: Erde und Kieswege
rechteck(g, 69, 19, 7, 8, ':');
rechteck(g, 72, 19, 1, 9, 'g');
// Blumenwiesen
for (const [x, y, b, h] of [[7, 17, 6, 3], [34, 4, 8, 3], [58, 4, 10, 3], [55, 56, 12, 4], [8, 58, 14, 5], [86, 36, 7, 5], [86, 64, 7, 4]]) rechteck(g, x, y, b, h, 'f');

// Ausgänge: Wege durch den Wald bis an den Rand
rechteck(g, 0, 29, 8, 3, ':');                       // Hof
rechteck(g, 0, 52, 8, 3, ':');                       // Wald
rechteck(g, 49, 0, 3, 7, ':');                       // Berg
rechteck(g, 49, 65, 3, 7, ':');                      // Strand

// ─── Gebäude ────────────────────────────────────────────────────────────────

const gebaeude = [];
/** Gebäude b×h, Tür in der unteren Reihe an Feld `t` (von links). */
function haus(typ, x, y, w, h, t, extra = {}) {
  const geb = { typ, x, y, w, h, tuer: { x: x + t, y: y + h - 1 }, ...extra };
  gebaeude.push(geb);
  return geb;
}

// Öffentliche Gebäude
haus('laden', 32, 17, 7, 6, 3, { ziel: { karte: 'laden', punkt: 'eingang' }, tuerWenn: 'dorf_ladenOffen', sonst: 'Der Krämerladen hat zu. Ein Schild verspricht: „Ab halb neun wieder Kunden, Kekse und Kleinkram. Bis fünf."' });
haus('rathaus', 41, 17, 5, 6, 2, { ziel: { karte: 'rathaus', punkt: 'eingang' }, tuerWenn: 'dorf_rathausOffen', sonst: 'Das Rathaus ist geschlossen. Zettel: „Sprechstunde auf dem Marktplatz. Wetter egal. – Frieda"' });
haus('gasthaus', 53, 16, 7, 7, 3, { ziel: { karte: 'gasthaus', punkt: 'eingang' }, tuerWenn: 'dorf_gasthausOffen', sonst: 'Das Gasthaus „Zum Krug" öffnet um elf. Hannes ist noch beim Gläserpolieren.' });
haus('dorf_arzt', 61, 18, 6, 5, 2, { ziel: { karte: 'arzt', punkt: 'eingang' }, tuerWenn: 'dorf_arztOffen', sonst: 'Die Praxis ist geschlossen. Am Fenster hängt ein Zettel: „Sprechstunde 9 bis 16 Uhr. Bei Notfällen: Pflaster liegen im Brunnenkasten. – Dr. Theo"' });
haus('dorf_museum', 22, 21, 9, 7, 4, { ziel: { karte: 'museum', punkt: 'eingang' }, tuerWenn: 'dorf_museumOffen', sonst: 'Das Museum ist geschlossen. „Geöffnet von zehn bis siebzehn Uhr. Bitte nicht an den Vitrinen klopfen. – Mira"' });
haus('schmiede', 15, 23, 6, 5, 2, { ziel: { karte: 'schmiede', punkt: 'eingang' }, tuerWenn: 'dorf_schmiedeOffen', sonst: 'Brunos Werkstatt ist zu. Die Esse glimmt noch leise vor sich hin.' });
haus('dorf_hausrosa', 7, 23, 6, 5, 2, { ziel: { karte: 'hausRosa', punkt: 'eingang' }, tuerWenn: 'dorf_hausRosaOffen', sonst: 'Bei Rosa brennt kein Licht. Wer so spät klopft, bekommt höchstens Pia zu hören, und die schläft.' });
haus('muehle', 75, 43, 5, 6, 2, { ziel: { karte: 'muehle', punkt: 'eingang' }, aktion: 'muehle' });
haus('atelier', 40, 46, 5, 5, 2, { zu: 'Mats’ Atelier. Ein Zettel an der Tür: „Bin draußen malen."' });

haus('dorf_baeckerei', 67, 34, 5, 5, 2, { zu: 'Die Bäckerei „Krümel“. Der Duft ist offiziell Eigentum der Gemeinde. Backstube ab fünf Uhr, Kundschaft nach Gefühl.' });

// Wohnhäuser als Kulisse: typ, x, y (obere Reihe), Breite, Höhe, Stil, Text an der Tür
const WOHN = [
  // Obere Gasse (Türen auf y 12)
  [7, 8, 5, 5, 0, 'Familie Wegener. „Bitte keine Hausierer – außer mit Kuchen."'],
  [14, 8, 6, 5, 1, 'Hier wohnt die alte Frau Lindner. Hinter der Tür schimpft ein Papagei auf Plattdeutsch.'],
  [22, 8, 5, 5, 2, 'Niemand zu Hause. Auf der Fußmatte steht: „Willkommen. Eigentlich."'],
  [29, 8, 6, 5, 3, 'Das Haus der Tischlerfamilie Brandt. Es riecht nach frischem Holz.'],
  [37, 9, 5, 4, 4, 'Der Briefträger hat „Zugestellt" an die Tür gekritzelt. Es ist unklar, an wen.'],
  [43, 8, 5, 5, 1, 'Ein Kranz hängt an der Tür. Es ist immer irgendein Fest, findet die Familie.'],
  [55, 8, 6, 5, 0, 'Familie Okafor. Aus dem Fenster duftet es nach Zimt und etwas Unerklärlichem.'],
  [63, 8, 5, 5, 3, 'Hier wohnt ein Imker. Die Klingel summt.'],
  [70, 9, 5, 4, 2, 'Abgeschlossen. Ein Zettel: „Bin im Garten. Im Garten ist es schöner."'],
  // Mittelgasse (Türen auf y 38)
  [7, 34, 5, 5, 4, 'Das Haus der Familie Brunner. Drinnen streiten zwei Kinder fröhlich über Murmeln.'],
  [14, 34, 6, 5, 2, 'Niemand antwortet, aber die Gardine bewegt sich verdächtig.'],
  [22, 35, 5, 4, 0, 'Ein kleines Haus mit großer Fußmatte. Darauf: „Schuhe aus, Herz auf."'],
  [28, 34, 5, 5, 1, 'Hier wohnt der Ratsherr. Er ist gerade im Rat, das heißt: im Gasthaus.'],
  // Streuobst (Türen auf y 50, zur Ostgasse und zum Waldweg)
  [27, 46, 5, 5, 3, 'Das Haus am Obstgarten. In der Tür steckt ein Korb Äpfel mit der Notiz: „Nimm dir einen."'],
  [34, 46, 5, 5, 1, 'Abgeschlossen. Ein Schaukelstuhl wippt auf der Veranda, ganz von allein. Wahrscheinlich der Wind.'],
  [56, 46, 5, 5, 0, 'Familie Haas. Ein Fahrrad lehnt am Zaun, und es hat schon bessere Tage gesehen.'],
  [63, 45, 6, 6, 4, 'Das Haus der Müllerin im Ruhestand. „Mehl ist auch nur Staub mit Karriere."'],
];
for (const [x, y, w, h, stil, text] of WOHN) {
  haus(`dorf_haus${w}x${h}`, x, y, w, h, 2, { stil, zu: text });
}

// ─── Deko ───────────────────────────────────────────────────────────────────

const deko = [];
const d = (typ, x, y, extra = {}) => { deko.push({ typ, x, y, ...extra }); };

// Platz
d('brunnen', 49, 31, { w: 2, h: 2 });
d('brett', 41, 26, { aktion: 'brett' });
d('dorf_wegweiser', 47, 27, { aktion: 'text', text: 'Nach Norden: Berge, Zimmerei, Gilde. Nach Süden: Strand. Nach Westen: Hof und Wald. Nach Osten: Fluss, Mühle, Friedhof. Und hier: Kuchen.' });
for (const [x, y] of [[44, 35], [56, 35]]) d('bank', x, y, { w: 2 });
for (const [x, y] of [[38, 25], [61, 25], [38, 38], [61, 38], [44, 29], [56, 29], [44, 34], [56, 34]]) d('laterne', x, y, { licht: 4 });
for (const [x, y] of [[47, 30], [52, 30], [47, 35], [52, 35]]) d('blumen', x, y);
// Marktstände (am Rand des Festplatzes, nicht darin)
d('dorf_marktstand', 34, 26, { w: 3, art: 0 });
d('dorf_marktstand', 34, 33, { w: 3, art: 1 });
d('dorf_marktstand', 63, 27, { w: 3, art: 2 });
d('dorf_marktstand', 63, 34, { w: 3, art: 3 });
d('dorf_marktstand', 39, 40, { w: 3, art: 4 });
d('dorf_marktstand', 58, 40, { w: 3, art: 5 });
d('dorf_muelltonne', 38, 23, { aktion: 'dorf_muelltonne' });
d('dorf_muelltonne', 46, 40, { aktion: 'dorf_muelltonne' });
d('fass', 37, 24);
// Vor den Häusern am Platz
d('blumen', 39, 22);             // ladenbeet
d('blumen', 31, 23);
d('blumen', 47, 22);
d('blumen', 52, 22);
d('blumen', 60, 22);
d('blumen', 67, 22);
d('bank', 54, 24, { w: 2 });
d('bank', 41, 24, { w: 2 });
d('laterne', 36, 24, { licht: 4 });
d('laterne', 58, 24, { licht: 4 });
// Schmiede: Amboss (Bruno arbeitet hier), Fässer, Kohle, Schild
d('amboss', 22, 28, { aktion: 'laden', laden: 'schmiede' });
d('fass', 14, 28);
d('fass', 13, 28);
d('dorf_kohlehaufen', 19, 28);
d('dorf_holzstapel', 13, 24);
d('blumen', 11, 28);
d('blumen', 6, 26);
d('dorf_muelltonne', 5, 28, { aktion: 'dorf_muelltonne' });
// Museum, Arzt
d('blumen', 23, 28);
d('blumen', 30, 28);
d('dorf_statue', 33, 28);
d('bank', 28, 28, { w: 2 });
d('dorf_muelltonne', 61, 23, { aktion: 'dorf_muelltonne' });
// Gasthaus: Bierbank, Fässer
d('tisch', 61, 24);
d('fass', 60, 25);
d('fass', 52, 24);
// Hauptstraße: Laternen
for (const x of [8, 16, 24, 69, 78]) d('laterne', x, 28, { licht: 4 });
for (const x of [12, 20, 28, 70, 76]) d('laterne', x, 32, { licht: 4 });
for (const x of [10, 18, 74]) d('bank', x, 32, { w: 2 });
// Nordstraße, Südstraße: Laternen, Wegweiser
for (const y of [5, 11, 17]) { d('laterne', 48, y, { licht: 4 }); d('laterne', 52, y, { licht: 4 }); }
for (const y of [45, 51, 58, 64]) { d('laterne', 48, y, { licht: 4 }); d('laterne', 52, y, { licht: 4 }); }
d('dorf_wegweiser', 53, 5, { aktion: 'text', text: 'Nach Norden geht es zu den Bergen: Zimmerei, Gilde, Bergsee und die alte Mine. Nach Süden: Marktplatz.' });
d('dorf_wegweiser', 53, 66, { aktion: 'text', text: 'Nach Süden liegt der Strand. Das Meer ist dort, wo das Wasser nicht mehr aufhört.' });
d('dorf_wegweiser', 7, 28, { aktion: 'text', text: 'Klarwasser! Westlich liegt dein Hof. Der Waldweg weiter südlich führt in den Wald. Der Marktplatz ist ausgeschildert: einfach dem Geruch von Kuchen nach.' });
d('dorf_wegweiser', 7, 56, { aktion: 'text', text: 'Der Waldweg: im Westen der Wald, im Osten der Marktplatz. Pilze bitte nur mit Gutachten.' });
d('schild', 3, 28, { aktion: 'text', text: 'Klarwasser. Willkommen – und bitte die Wiesen nicht zertrampeln. Die Hühner haben sie schon gebucht.' });
// Obere Gasse
for (const x of [10, 18, 26, 34, 42, 66, 74]) d('laterne', x, 16, { licht: 4 });
for (const x of [16, 31, 61]) d('bank', x, 16, { w: 2 });
// Mittelgasse
for (const x of [9, 17, 25, 31]) d('laterne', x, 41, { licht: 4 });
d('bank', 12, 41, { w: 2 });
// Waldweg
for (const x of [12, 22, 32, 42]) d('laterne', x, 55, { licht: 4 });
d('bank', 16, 55, { w: 2 });
d('dorf_muelltonne', 36, 55, { aktion: 'dorf_muelltonne' });

// Blumen vor den Wohnhäusern (links neben der Tür, so bleibt die Tür frei)
for (const [x, y, , h] of WOHN) d('blumen', x, y + h);
d('blumen', 67, 39);
d('laterne', 71, 39, { licht: 4 });
d('bank', 55, 43, { w: 2 });
d('dorf_picknick', 60, 42, { w: 2, h: 2 });
d('bank', 65, 43, { w: 2 });
d('dorf_muelltonne', 67, 41, { aktion: 'dorf_muelltonne' });

// Zäune und Gärten hinter den Häusern der Mittelgasse
for (const [x, y, b] of [[7, 33, 5], [14, 33, 6], [22, 34, 5], [28, 33, 5]]) d('zaun', x, y, { w: b });

// Atelier: Staffelei-Ecke
d('dorf_staffelei', 46, 49);
d('blumen', 40, 51);
d('dorf_muelltonne', 45, 51, { aktion: 'dorf_muelltonne' });

// ─ Spielplatz (x 6–23, y 42–50)
d('zaun', 6, 42, { w: 8 });
d('zaun', 16, 42, { w: 8 });
d('zaun', 6, 50, { w: 18 });
d('zaun', 6, 43, { h: 7 });
d('zaun', 23, 43, { h: 7 });
d('dorf_schaukel', 8, 44, { w: 3 });
d('dorf_rutsche', 13, 44, { w: 2 });
d('dorf_sandkasten', 17, 46, { w: 3, h: 2 });
d('dorf_wippe', 8, 47, { w: 3 });
d('dorf_klettergeruest', 12, 47, { w: 2, h: 2 });
d('bank', 20, 44, { w: 2 });
d('dorf_muelltonne', 22, 44, { aktion: 'dorf_muelltonne' });
d('busch', 7, 49);
d('busch', 21, 49);

// ─ Gemeinschaftsgarten (x 68–76, y 18–27)
d('zaun', 68, 18, { w: 9 });
d('zaun', 68, 27, { w: 3 });
d('zaun', 73, 27, { w: 4 });
d('zaun', 68, 19, { h: 8 });
d('zaun', 76, 19, { h: 8 });
for (const [x, y] of [[69, 20], [69, 23], [74, 20], [74, 23]]) d('dorf_beet', x, y, { w: 2, art: (x + y) % 4 });
d('dorf_vogelscheuche', 73, 25);
d('dorf_regentonne', 69, 26);
d('dorf_schubkarre', 75, 26);
d('dorf_beet', 69, 25, { w: 2, art: 1 });
d('dorf_beet', 74, 25, { w: 2, art: 3 });
d('laterne', 72, 17, { licht: 4 });

// ─ Mühle: Säcke, Kahn, Bank am Wasser
d('dorf_mehlsack', 74, 49);
d('dorf_mehlsack', 73, 49);
d('dorf_kahn', 80, 55, { w: 3, h: 2 });
d('bank', 75, 51, { w: 2 });
d('laterne', 77, 50, { licht: 4 });

// ─ Brücken: Geländer und Laternen
d('zaun', 82, 28, { w: 4 });
d('zaun', 82, 32, { w: 4 });
d('laterne', 81, 28, { licht: 4 });
d('laterne', 86, 28, { licht: 4 });
d('zaun', 77, 59, { w: 4 });
d('zaun', 77, 62, { w: 4 });
d('laterne', 76, 59, { licht: 4 });
d('laterne', 82, 59, { licht: 4 });

// ─ Friedhof (x 87–94, y 6–24): Zaun, Tor, Gräber, Kapelle, Bäume
d('zaun', 86, 6, { w: 9 });
d('zaun', 86, 24, { w: 4 });
d('zaun', 92, 24, { w: 3 });
d('zaun', 86, 7, { h: 17 });
d('zaun', 94, 7, { h: 17 });
d('laterne', 89, 25, { licht: 3 });
d('laterne', 92, 25, { licht: 3 });
const GRAEBER = [];
for (let y = 16; y <= 21; y += 2) for (const x of [88, 89, 93]) GRAEBER.push([x, y]);
for (let y = 8; y <= 12; y += 2) for (const x of [88, 93]) GRAEBER.push([x, y]);
GRAEBER.forEach(([x, y]) => d('dorf_grabstein', x, y, { art: Math.floor(hash(x, y, 4) * 4) }));
d('dorf_grabstein', 92, 9, { art: 3 });
d('bank', 88, 15, { w: 2 });
d('dorf_trauerbaum', 89, 22);
d('dorf_trauerbaum', 92, 13);
d('blumen', 91, 22);
d('blumen', 92, 22);
d('dorf_urne', 93, 17);
// Wegweiser zum Friedhof
d('dorf_wegweiser', 88, 29, { aktion: 'text', text: 'Nach Norden: der Friedhof. Ein ruhiger Ort. Die Eichhörnchen wissen das auch.' });

// ─ Kleinigkeiten: Wäscheleinen hinter den Häusern, Bienenstöcke beim Imker, ein Fahrrad
d('dorf_waescheleine', 9, 6, { w: 3 });
d('dorf_waescheleine', 24, 6, { w: 3 });
d('dorf_waescheleine', 72, 6, { w: 3 });
d('dorf_waescheleine', 39, 6, { w: 3 });
for (const x of [62, 64, 66]) d('dorf_bienenstock', x, 6);
d('dorf_fahrrad', 55, 51);

// ─ Streuobstwiese im Südosten, Südwesten: Heuballen, Holzstapel
for (let y = 56; y <= 66; y += 3) for (let x = 55; x <= 70; x += 4) {
  deko.push({ typ: 'baum', x: x + (y % 2), y, art: 'eiche' });
}
d('bank', 58, 60, { w: 2 });
d('dorf_heuballen', 64, 68);
d('dorf_heuballen', 65, 68);
d('dorf_picknick', 86, 38, { w: 2, h: 2 });
d('dorf_picknick', 86, 66, { w: 2, h: 2 });
d('dorf_holzstapel', 11, 56);
d('dorf_heuballen', 25, 62);
d('dorf_heuballen', 26, 62);
d('dorf_vogelscheuche', 14, 63);

// ─── Bäume, Büsche, Felsen (Streuung) ──────────────────────────────────────

const besetzt = new Set();
const markiere = (x, y, b = 1, h = 1, rand = 0) => {
  for (let j = y - rand; j < y + h + rand; j++) for (let i = x - rand; i < x + b + rand; i++) besetzt.add(`${i},${j}`);
};
for (const e of gebaeude) markiere(e.x, e.y, e.w, e.h + 2, 1);
for (const e of deko) markiere(e.x, e.y, e.w || 1, e.h || 1, 0);
// Gärten und Plätze freihalten
for (const [x, y, b, h] of [[68, 18, 9, 10], [86, 6, 9, 19], [6, 42, 18, 9], [33, 23, 34, 18]]) markiere(x, y, b, h, 1);

/** Streut Bäume in ein Rechteck; nur auf Gras, nie auf Wegen und nie auf besetzten Feldern. */
function streuen(x0, y0, b, h, dichte, { saat = 1, kiefern = 0.3, abstand = 2, busch = 0.15, art } = {}) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + b; x += 1) {
      if (g[y]?.[x] !== '.' && g[y]?.[x] !== 'f') continue;
      if (hash(x, y, saat) > dichte) continue;
      let frei = true;
      for (let j = -abstand + 1; j <= abstand - 1 && frei; j++) for (let i = -abstand + 1; i <= abstand - 1; i++) if (besetzt.has(`${x + i},${y + j}`)) { frei = false; break; }
      if (!frei) continue;
      const r = hash(x, y, saat + 9);
      if (r < busch) deko.push({ typ: 'busch', x, y });
      else deko.push({ typ: 'baum', x, y, art: art ?? (hash(x, y, saat + 3) < kiefern ? 'kiefer' : 'eiche') });
      besetzt.add(`${x},${y}`);
    }
  }
}
// Waldsaum innen am Rand und größere Wälder
streuen(2, 2, 96, 7, 0.34, { saat: 11, abstand: 2 });
streuen(2, 62, 96, 8, 0.34, { saat: 12, abstand: 2 });
streuen(2, 9, 6, 53, 0.30, { saat: 13, abstand: 2 });
streuen(86, 26, 11, 40, 0.20, { saat: 14, abstand: 2, kiefern: 0.2 });
streuen(78, 3, 5, 8, 0.4, { saat: 15 });
// Parks, Wiesen
streuen(7, 17, 24, 5, 0.18, { saat: 16, abstand: 3 });
streuen(7, 56, 38, 7, 0.25, { saat: 17, abstand: 2 });
streuen(36, 42, 12, 8, 0.12, { saat: 18, abstand: 3 });
streuen(54, 42, 17, 8, 0.12, { saat: 19, abstand: 3 });
streuen(56, 15, 4, 3, 0.2, { saat: 20 });
streuen(46, 56, 3, 14, 0.25, { saat: 21 });
streuen(53, 66, 22, 4, 0.3, { saat: 22 });
streuen(7, 66, 40, 4, 0.3, { saat: 23 });
streuen(62, 3, 14, 5, 0.3, { saat: 24 });
// Felsen am Fluss, Findlinge
for (const [x, y] of [[84, 13], [81, 43], [78, 63], [79, 7], [86, 44], [92, 50], [22, 59]]) {
  if ((g[y][x] === '.' || g[y][x] === 'f') && !besetzt.has(`${x},${y}`)) deko.push({ typ: 'felsen', x, y });
}

// ─── Punkte ─────────────────────────────────────────────────────────────────

const ufer1 = wasserAb(16) - 1;
const ufer2 = wasserAb(36) - 1;
const punkte = {
  vonHof: [2, 30, 'rechts'],
  vonStrand: [50, 69, 'oben'],
  vonBerg: [50, 2, 'unten'],
  vonWald: [2, 53, 'rechts'],
  brunnen: [48, 33],
  platz: [56, 31],
  brett: [41, 27, 'oben'],
  bank1: [44, 36, 'oben'],
  bank2: [56, 36, 'oben'],
  fluss1: [ufer1, 16, 'rechts'],
  fluss2: [ufer2, 36, 'rechts'],
  spielplatz: [14, 45],
  friedhof: [91, 21, 'oben'],
  garten: [72, 22],
  vorLaden: [35, 23, 'unten'],
  vorGasthaus: [56, 23, 'unten'],
  vorSchmiede: [17, 28, 'unten'],
  vorRathaus: [43, 23, 'unten'],
  vorArzt: [63, 23, 'unten'],
  vorMuseum: [26, 28, 'unten'],
  vorMuehle: [77, 49, 'oben'],
  vorHausRosa: [9, 28, 'unten'],
  vorAtelier: [42, 51, 'oben'],
  amboss: [21, 28, 'rechts'],
  ladenbeet: [39, 23],
  rathausweg: [45, 24],
  sprechstunde: [44, 31],
  muehlblick: [74, 46, 'rechts'],
};

karte({
  id: 'dorf', name: 'Klarwasser', aussen: true, wasser: 'fluss', rand: 'wald',
  grid: fertigRaster(g),
  gebaeude,
  deko,
  warps: [
    { x: 0, y: 29, w: 1, h: 3, karte: 'hof', punkt: 'vonDorf' },
    { x: 49, y: 71, w: 3, h: 1, karte: 'strand', punkt: 'vonDorf' },
    { x: 49, y: 0, w: 3, h: 1, karte: 'berg', punkt: 'vonDorf' },
    { x: 0, y: 52, w: 1, h: 3, karte: 'wald', punkt: 'vonDorf' },
  ],
  punkte,
  bereiche: { fest: [38, 25, 24, 14] },
  sammel: [
    // Wald: Pilze, Beeren, Kräuter
    { x: 2, y: 9, w: 5, h: 50, art: 'wald', max: 3 },
    { x: 86, y: 40, w: 9, h: 24, art: 'wald', max: 3 },
    { x: 8, y: 62, w: 38, h: 5, art: 'wald', max: 3 },
    { x: 6, y: 4, w: 30, h: 4, art: 'wald', max: 2 },
    // Wiesen im Dorf
    { x: 7, y: 17, w: 24, h: 5, art: 'dorf', max: 2 },
    { x: 34, y: 3, w: 40, h: 4, art: 'dorf', max: 2 },
    { x: 53, y: 42, w: 18, h: 8, art: 'dorf', max: 2 },
    { x: 54, y: 56, w: 20, h: 12, art: 'dorf', max: 3 },
    { x: 85, y: 33, w: 10, h: 12, art: 'dorf', max: 2 },
    { x: 85, y: 62, w: 10, h: 6, art: 'dorf', max: 2 },
    { x: 7, y: 56, w: 38, h: 6, art: 'dorf', max: 3 },
    { x: 24, y: 42, w: 14, h: 8, art: 'dorf', max: 2 },
  ],
});
