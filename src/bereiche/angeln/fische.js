// Bereich „angeln": alle Fische nach Gewässerart, Jahreszeit, Uhrzeit und Wetter.
//
// Spalten: Preis · Seltenheit (0–100; je höher, desto seltener beißt der Fisch: Gewicht 110 − Seltenheit)
// · Länge [von, bis] in cm · Gewässer · Jahreszeiten · Uhrzeit [von, bis) · Wetter (sonne/regen, leer = egal)
// Bild: f Rücken, f2 Bauch, f3 Flossen, form (Körperform), muster + m (Musterfarbe); siehe grafik-fische.js.
//
// Die IDs der ersten Fische (karpfen …) benutzen andere Bereiche (Fischfarm, Räucherofen, Bündel,
// Geschenke) – nicht umbenennen. Legendäre Fische (`legendaer: true`) beißen nur ab `abStufe`
// (Angelstufe) und nur, bis man sie einmal gefangen hat (angeln.js: fischePassend).

import { fisch } from '../../daten.js';

const FR = 'fruehling';
const SO = 'sommer';
const HE = 'herbst';
const WI = 'winter';
const ALLE = [FR, SO, HE, WI];
const TAG = [600, 2600];

/** f(id, name, preis, [seltenheit, laenge, orte, jz, zeit, wetter], bild, extra) */
function f(id, name, preis, [seltenheit, laenge, orte, jz, zeit = TAG, wetter], bild, extra = {}) {
  fisch(id, { name, preis, bild: { art: 'fisch', ...bild }, seltenheit, laenge, orte, jz, zeit, wetter, ...extra });
}

// ─── Teich, Fluss und Seen (Süßwasser) ──────────────────────────────────────

f('karpfen', 'Karpfen', 30, [15, [30, 75], ['teich', 'fluss', 'see', 'waldsee', 'geheimteich'], ALLE],
  { f: '#a08a4a', f2: '#e8d898', f3: '#8a6a3a', form: 'dick', muster: 'schuppen', m: '#7a6a32' },
  { text: 'Genügsam und überall zu Hause. Schmeckt nach Teich, sagen die einen; nach Heimat, sagen die anderen.' });
f('sonnenbarsch', 'Sonnenbarsch', 30, [30, [10, 25], ['fluss', 'teich'], [FR, SO], [600, 1900], 'sonne'],
  { f: '#e8b83a', f2: '#f0d878', f3: '#d8883a', form: 'hoch', muster: 'punkte', m: '#5ab0d0' },
  { text: 'Glänzt wie ein Sommermorgen. Beißt nur, wenn die Sonne scheint.' });
f('wels', 'Wels', 200, [75, [60, 140], ['fluss', 'teich', 'waldsee'], [FR, HE], [600, 2400], 'regen'],
  { f: '#5a5a48', f2: '#c8c0a0', f3: '#3a3a30', form: 'wels', muster: 'flecken', m: '#44443a' },
  { text: 'Ein schwerer Brocken mit Bart. Kommt bei Regen aus dem Schlamm.' });
f('doebel', 'Döbel', 50, [35, [20, 45], ['fluss', 'teich', 'see'], ALLE],
  { f: '#7a8a98', f2: '#e0e8e8', f3: '#c86a4a', form: 'normal', muster: 'schuppen', m: '#5a6a78' },
  { text: 'Frisst alles, was ins Wasser fällt – auch Kirschen.' });
f('forelle', 'Regenbogenforelle', 65, [45, [25, 55], ['fluss', 'see'], [SO], [600, 1900], 'sonne'],
  { f: '#7aa060', f2: '#f0e8d8', f3: '#8a9a5a', form: 'normal', muster: 'band', m: '#e87a98' },
  { text: 'Ein rosa Streifen wie ein kleiner Regenbogen.' });
f('lachs', 'Lachs', 75, [50, [50, 90], ['fluss'], [HE], [600, 1900]],
  { f: '#8a7a8a', f2: '#f0a888', f3: '#6a5a6a', form: 'lang', muster: 'punkte', m: '#4a3a4a' },
  { text: 'Schwimmt im Herbst den Fluss hinauf, heim zu seinem Kiesbett.' });
f('hecht', 'Hecht', 100, [60, [45, 110], ['fluss', 'teich', 'waldsee'], [SO, WI], TAG],
  { f: '#5a7a3a', f2: '#e0e0a0', f3: '#9a8a3a', form: 'hecht', muster: 'flecken', m: '#c8d07a' },
  { text: 'Lauert im Schilf. Hat mehr Zähne, als einem lieb ist.' });
f('zander', 'Zander', 105, [45, [40, 80], ['fluss', 'teich', 'see'], [HE, WI], [1200, 2600], 'regen'],
  { f: '#9a9a70', f2: '#e8e0c0', f3: '#7a7a58', form: 'lang', muster: 'streifen', m: '#6a6a48', flosse: 'stachel', auge: 'glas' },
  { text: 'Glasige Augen, sieht im trüben Wasser alles.' });
f('barsch', 'Flussbarsch', 55, [35, [15, 35], ['fluss', 'teich', 'see'], [WI], TAG],
  { f: '#7aa040', f2: '#e8d898', f3: '#e86a3a', form: 'hoch', muster: 'streifen', m: '#3a5a2a', flosse: 'stachel' },
  { text: 'Grüne Streifen, rote Flossen und ein stacheliges Gemüt.' });
f('brasse', 'Brasse', 45, [35, [25, 55], ['fluss'], ALLE, [1800, 2600]],
  { f: '#9a9a90', f2: '#e0e0d8', f3: '#6a6a68', form: 'hoch', muster: 'schuppen', m: '#7a7a72' },
  { text: 'Kommt erst abends aus der Tiefe. Schleimig, aber gutmütig.' });
f('schleie', 'Schleie', 60, [40, [20, 50], ['teich', 'waldsee'], [FR, SO, HE]],
  { f: '#5a7a2a', f2: '#c8b848', f3: '#3a4a1a', form: 'dick', muster: 'glanz', m: '#c8a83a', auge: 'rot' },
  { text: 'Olivgrün mit goldenem Schimmer und roten Augen. Ein Teichfisch wie aus dem Bilderbuch.' });
f('rotfeder', 'Rotfeder', 35, [25, [15, 30], ['teich', 'fluss'], [FR, SO], [600, 1900]],
  { f: '#a8a070', f2: '#f0e8c8', f3: '#e04a3a', form: 'normal', muster: 'schuppen', m: '#887a4a' },
  { text: 'Leuchtend rote Flossen, als hätte sie sich herausgeputzt.' });
f('karausche', 'Karausche', 40, [30, [15, 35], ['teich', 'see'], ALLE],
  { f: '#b8943a', f2: '#f0d890', f3: '#9a7a3a', form: 'rund', muster: 'schuppen', m: '#8a6a2a' },
  { text: 'Klein, rund und zäh. Übersteht sogar einen zugefrorenen Teich.' });
f('moderlieschen', 'Moderlieschen', 25, [20, [6, 10], ['teich', 'waldsee'], [FR, SO, HE], [600, 1900], 'sonne'],
  { f: '#9ab0b8', f2: '#f0f8f8', f3: '#c8d8d8', form: 'mini', muster: 'linie', m: '#4a8aa8' },
  { text: 'Winzig und silbern. Die Kinder im Dorf halten es für einen Glücksbringer.' });
f('aesche', 'Äsche', 70, [45, [25, 50], ['fluss', 'see'], [FR, HE, WI], [600, 1400]],
  { f: '#7a8aa0', f2: '#e8e8f0', f3: '#a85a8a', form: 'normal', muster: 'punkte', m: '#3a3a5a', flosse: 'fahne' },
  { text: 'Trägt eine riesige Rückenflosse wie eine Fahne. Riecht leicht nach Thymian, sagen Kenner.' });
f('barbe', 'Barbe', 60, [40, [30, 70], ['fluss'], [SO, HE], [600, 2000]],
  { f: '#a89060', f2: '#f0e0b8', f3: '#c8784a', form: 'lang', muster: 'schuppen', m: '#887048', bart: true },
  { text: 'Wühlt mit vier Barteln im Kies nach Leckerbissen.' });
f('quappe', 'Quappe', 90, [55, [30, 60], ['fluss', 'see'], [HE, WI], [1800, 2600]],
  { f: '#7a6a3a', f2: '#d8c890', f3: '#5a4a2a', form: 'quappe', muster: 'flecken', m: '#4a3a1a', bart: true },
  { text: 'Der einzige Dorsch im Süßwasser. Liebt kalte, dunkle Nächte.' });
f('huchen', 'Huchen', 180, [80, [70, 140], ['fluss'], [WI], [600, 1600]],
  { f: '#8a6a6a', f2: '#f0d0c0', f3: '#7a5050', form: 'lang', muster: 'punkte', m: '#3a2a2a' },
  { text: 'Der König des Gebirgsflusses. Lässt sich nur im Winter blicken.' });
f('bachforelle', 'Bachforelle', 55, [35, [20, 45], ['fluss', 'waldsee'], [FR, SO], [600, 1900]],
  { f: '#9a8a4a', f2: '#f0e0b0', f3: '#8a7a3a', form: 'normal', muster: 'rotpunkte', m: '#d8403a' },
  { text: 'Rote Tupfen mit hellem Rand – jede Forelle ein Unikat.' });
f('elritze', 'Elritze', 20, [15, [5, 10], ['fluss', 'waldsee'], ALLE, [600, 2000]],
  { f: '#6a8a5a', f2: '#e86a4a', f3: '#8aa07a', form: 'mini', muster: 'streifen', m: '#3a4a2a' },
  { text: 'Klein, flink und im Frühling mit knallrotem Bauch.' });
f('saibling', 'Saibling', 90, [50, [25, 60], ['see'], [HE, WI]],
  { f: '#5a6a5a', f2: '#e86a3a', f3: '#e8783a', form: 'normal', muster: 'punkte', m: '#f0d8a0', saum: '#ffffff' },
  { text: 'Lebt im kalten Bergsee. Im Herbst glüht sein Bauch orangerot.' });
f('renke', 'Renke', 60, [35, [25, 45], ['see'], [FR, SO], [600, 1800]],
  { f: '#8aa0b0', f2: '#f0f4f8', f3: '#a8b8c8', form: 'schmal', muster: 'glanz', m: '#ffffff' },
  { text: 'Schlank und silbern. Zieht in Schwärmen durch den Bergsee.' });
f('seeforelle', 'Seeforelle', 120, [60, [40, 90], ['see'], [FR, HE], [600, 1800]],
  { f: '#6a7a8a', f2: '#e8e8e0', f3: '#5a6a78', form: 'lang', muster: 'kreuze', m: '#2a2a3a' },
  { text: 'Groß, scheu und mit kleinen schwarzen Kreuzen gezeichnet.' });
f('stoer', 'Stör', 200, [75, [80, 180], ['see'], [SO, WI], [600, 1900]],
  { f: '#6a7078', f2: '#d8d8d0', f3: '#5a6068', form: 'stoer', muster: 'platten', m: '#c8c8b8', bart: true },
  { text: 'Sieht aus wie aus der Zeit der Dinosaurier. Ist es auch, fast.' });
f('schlammpeitzger', 'Schlammpeitzger', 75, [50, [15, 30], ['waldsee', 'teich'], [SO, HE], TAG, 'regen'],
  { f: '#8a6a3a', f2: '#e0c890', f3: '#6a5030', form: 'aal', muster: 'band', m: '#4a3018', bart: true },
  { text: 'Spürt Gewitter, bevor sie kommen, und wird dann ganz unruhig.' });

// ─── Meer ───────────────────────────────────────────────────────────────────

f('sardine', 'Sardine', 40, [30, [12, 22], ['meer'], [FR, HE, WI], [600, 1900]],
  { f: '#4a7aa8', f2: '#e8f0f8', f3: '#8ab0d0', form: 'mini', muster: 'punkte', m: '#2a4a7a' },
  { text: 'Kommt selten allein.' });
f('hering', 'Hering', 30, [25, [18, 32], ['meer'], ALLE],
  { f: '#3a5a8a', f2: '#d8e4f0', f3: '#8aa0c0', form: 'schmal', muster: 'glanz', m: '#c8e0f8' },
  { text: 'Der Brotfisch der Küste. Immer da, immer hungrig.' });
f('heilbutt', 'Heilbutt', 80, [50, [50, 120], ['meer'], [FR, SO, WI]],
  { f: '#7a6a50', f2: '#e8e0d0', f3: '#5a4a38', form: 'platt', muster: 'flecken', m: '#5a4a34' },
  { text: 'Liegt flach am Meeresgrund und schaut mit beiden Augen nach oben.' });
f('thunfisch', 'Thunfisch', 100, [70, [100, 200], ['meer'], [SO, WI], [600, 1900]],
  { f: '#2a3a6a', f2: '#c8d4e4', f3: '#e8c83a', form: 'thun', muster: 'glanz', m: '#6a8ac8' },
  { text: 'Ein Kraftpaket aus der Hochsee. Gelbe Flossen wie Wimpel.' });
f('rotbarbe', 'Rotbarbe', 75, [55, [15, 30], ['meer'], [SO, WI], [600, 1900]],
  { f: '#e0504a', f2: '#f8d0b8', f3: '#e8a050', form: 'normal', muster: 'band', m: '#f0c040', bart: true },
  { text: 'Rot wie ein Feuerwehrauto, mit gelbem Längsstreifen.' });
f('aal', 'Aal', 85, [70, [50, 100], ['meer'], [FR, HE], [1600, 2600], 'regen'],
  { f: '#3a4a2a', f2: '#c8c080', f3: '#2a3a1a', form: 'aal' },
  { text: 'Glatt wie Seife. Wandert in Regennächten.' });
f('tintenfisch', 'Tintenfisch', 80, [75, [20, 60], ['meer'], [WI], [1800, 2600]],
  { f: '#e890a8', f2: '#f8d8e0', form: 'tinte' },
  { text: 'Wer ihn ärgert, bekommt Tinte ins Gesicht.' });
f('kugelfisch', 'Kugelfisch', 200, [80, [15, 40], ['meer'], [SO], [1200, 1600], 'sonne'],
  { f: '#e8c85a', f2: '#f8f0d0', form: 'kugel', m: '#8a6a2a' },
  { text: 'Bläst sich auf, wenn er sich erschreckt. Bitte nicht essen.' });
f('makrele', 'Makrele', 55, [30, [25, 45], ['meer'], [SO, HE], [600, 1900]],
  { f: '#3a7a8a', f2: '#e8f0f0', f3: '#6a9aa8', form: 'thun', muster: 'wellen', m: '#1a3a4a' },
  { text: 'Wilde Tigerstreifen auf blaugrünem Rücken.' });
f('scholle', 'Scholle', 100, [45, [20, 50], ['meer'], [FR, SO, HE], [600, 2000]],
  { f: '#8a7a5a', f2: '#e8e0c8', f3: '#6a5a40', form: 'platt', muster: 'rotpunkte', m: '#e8783a' },
  { text: 'Flach wie ein Pfannkuchen, mit orangen Tupfen.' });
f('dorsch', 'Dorsch', 120, [50, [40, 100], ['meer'], [HE, WI]],
  { f: '#8a8a5a', f2: '#f0ecd8', f3: '#6a6a48', form: 'dick', muster: 'punkte', m: '#5a5a38', bart: 'kinn', linie: '#f0ecd8' },
  { text: 'Hat einen Bart am Kinn und eine helle Seitenlinie. Mag kaltes Wasser.' });
f('rochen', 'Rochen', 150, [70, [50, 120], ['meer'], [SO], [1600, 2600]],
  { f: '#6a6a7a', f2: '#e8e0e8', form: 'rochen', muster: 'punkte', m: '#9a9aa8' },
  { text: 'Gleitet über den Sand wie ein Drachen über die Wiese.' });

// ─── Geheimteich und Mine ───────────────────────────────────────────────────

f('koi', 'Koi', 250, [70, [40, 90], ['geheimteich'], ALLE],
  { f: '#f4f0e8', f2: '#ffffff', f3: '#f4f0e8', form: 'dick', muster: 'koi', m: '#e8582a', m2: '#2a2a2a' },
  { text: 'Wer hat ihn hier ausgesetzt? Im Geheimen Wald fragt man so etwas nicht.' });
f('goldschleie', 'Goldschleie', 110, [55, [20, 45], ['geheimteich'], [FR, SO, HE], [600, 2000]],
  { f: '#e8a83a', f2: '#f8e8a0', f3: '#c87a2a', form: 'dick', muster: 'glanz', m: '#fff0b0', auge: 'rot' },
  { text: 'Golden wie ein Herbstblatt. Die Geheimnisvolle unter den Schleien.' });
f('glasaal', 'Glasaal', 140, [65, [6, 9], ['geheimteich'], [FR, HE], [1800, 2600]],
  { f: '#c8e8f0', f2: '#f0fbff', form: 'glasaal', m: '#3a4a5a' },
  { text: 'Durchsichtig wie Glas. Man sieht ihm beim Denken zu.' });
f('hoehlensalmler', 'Höhlensalmler', 60, [30, [6, 12], ['mine'], ALLE],
  { f: '#e8b8b8', f2: '#f8e0e0', f3: '#e8c8c8', form: 'normal', muster: 'glanz', m: '#ffffff', auge: 'blind' },
  { text: 'Hat nie Licht gesehen und braucht darum keine Augen.' });
f('geisterfisch', 'Geisterfisch', 45, [40, [10, 35], ['mine'], ALLE],
  { f: '#d8e0e8', f2: '#ffffff', f3: '#b8c8d8', form: 'geist', auge: 'gross' },
  { text: 'Bleich wie ein Bettlaken. Huuuh.' });
f('steinfisch', 'Steinfisch', 300, [75, [15, 30], ['mine'], ALLE],
  { f: '#8a7a6a', f2: '#a89a88', f3: '#6a5a4a', form: 'stein', m: '#5a4a3a' },
  { text: 'Sieht aus wie ein Stein. Bis der Stein zurückschaut.' });

// ─── Die fünf Legendären: je an einem besonderen Ort, zu besonderer Zeit, nur einmal ─────

const LEGENDE = { legendaer: true };
f('altwaller', 'Der Alte Waller', 1000, [100, [190, 260], ['fluss'], [HE], [1800, 2600], 'regen'],
  { f: '#3a3a30', f2: '#a8a088', f3: '#2a2a22', form: 'wels', muster: 'narben', m: '#8a8270', legende: '#c8a050', gross: true, bart: true },
  { ...LEGENDE, abStufe: 5, fangHinweis: 'In regnerischen Herbstnächten zieht etwas Großes den Fluss entlang.',
    text: 'Älter als die Mühle und schwerer als ein Kalb. Die Alten im Dorf erzählen sich von ihm.' });
f('sonnenkoenig', 'Sonnenkönig', 1500, [100, [90, 140], ['meer'], [SO], [1000, 1400], 'sonne'],
  { f: '#f0a020', f2: '#fff0a0', f3: '#e04830', form: 'koenig', muster: 'glanz', m: '#fff8d0', legende: '#ffe060' },
  { ...LEGENDE, abStufe: 5, fangHinweis: 'An heißen Sommermittagen funkelt draußen vor dem Strand etwas wie Gold.',
    text: 'Er trägt eine Krone aus Flossen und glänzt wie die Mittagssonne.' });
f('eiszahn', 'Eiszahnhecht', 1000, [100, [100, 150], ['waldsee'], [WI], [600, 2000]],
  { f: '#6ab0d8', f2: '#e8f8ff', f3: '#a8e0f8', form: 'hecht', muster: 'frost', m: '#ffffff', legende: '#c8f0ff', zaehne: true, gross: true },
  { ...LEGENDE, abStufe: 6, fangHinweis: 'Wenn der Waldsee am kältesten ist, knackt unter dem Eis etwas mit den Zähnen.',
    text: 'Kalt wie ein Wintermorgen. Seine Zähne klirren wie Eiszapfen.' });
f('bergkoenigin', 'Bergseekönigin', 1500, [100, [80, 120], ['see'], [FR], [600, 2000], 'regen'],
  { f: '#7a4aa0', f2: '#f0d8f8', f3: '#3ac0b0', form: 'koenigin', muster: 'punkte', m: '#e8f8ff', legende: '#e8a8ff' },
  { ...LEGENDE, abStufe: 8, fangHinweis: 'Im Frühlingsregen soll im Bergsee eine Fürstin mit Schleierflossen schwimmen.',
    text: 'Ihre Flossen wehen wie Seide. Sie lässt sich nur von den Geduldigsten fangen.' });
f('mondkarpfen', 'Mondkarpfen', 1200, [100, [60, 100], ['geheimteich'], ALLE, [2200, 2600]],
  { f: '#3a4a8a', f2: '#c8d0f0', f3: '#5a6ab0', form: 'dick', muster: 'mond', m: '#f0f0c8', legende: '#d8e0ff', gross: true },
  { ...LEGENDE, abStufe: 4, fangHinweis: 'Spät in der Nacht spiegelt sich im Geheimteich ein zweiter Mond.',
    text: 'Auf seinen Schuppen leuchtet eine kleine Mondsichel.' });
