// Bereich „mine" – alle Gegenstände: Erze und Barren, Mineralien (museum), Artefakte (museum),
// Geoden, Monsterbeute, Waffen, Ringe, Stiefel, Bomben und die Treppe samt Bastelrezepten.
// Reine Daten (DOM-frei); Bilder in kunst-gegenstaende.js.

import { item, kategorie, rezept, REZEPTE, ITEMS } from '../../daten.js';
import { system } from '../../system.js';

kategorie('mineral', 'Mineral');
kategorie('erz', 'Erz');
kategorie('barren', 'Barren');
kategorie('artefakt', 'Artefakt');
kategorie('geode', 'Geode');
kategorie('waffe', 'Waffe');
kategorie('ring', 'Ring');
kategorie('stiefel', 'Stiefel');

// ─── Erze und Barren ────────────────────────────────────────────────────────

const barrenText = 'Fünf Erz und eine Kohle ergeben einen Barren.';
item('kupfererz', { name: 'Kupfererz', kat: 'erz', preis: 5, bild: { art: 'erz', f: '#d98a4e' }, text: barrenText });
item('eisenerz', { name: 'Eisenerz', kat: 'erz', preis: 10, bild: { art: 'erz', f: '#dfe6ee' }, text: barrenText });
item('golderz', { name: 'Golderz', kat: 'erz', preis: 25, bild: { art: 'erz', f: '#f2c94c' }, text: barrenText });
item('iridiumerz', { name: 'Iridiumerz', kat: 'erz', preis: 100, bild: { art: 'erz', f: '#b77ee0' }, text: 'Schimmert violett. Kommt nur ganz tief unten vor.' });
item('kupferbarren', { name: 'Kupferbarren', kat: 'barren', preis: 60, bild: { art: 'barren', f: '#d98a4e' }, text: 'Bruno macht daraus bessere Werkzeuge.' });
item('eisenbarren', { name: 'Eisenbarren', kat: 'barren', preis: 120, bild: { art: 'barren', f: '#cfd7df' }, text: 'Bruno macht daraus bessere Werkzeuge.' });
item('goldbarren', { name: 'Goldbarren', kat: 'barren', preis: 250, bild: { art: 'barren', f: '#f2c94c' }, text: 'Bruno macht daraus die besten Werkzeuge.' });
item('iridiumbarren', { name: 'Iridiumbarren', kat: 'barren', preis: 1000, bild: { art: 'barren', f: '#b77ee0' }, text: 'Schwer, kühl und ein bisschen unheimlich. Bruno macht daraus Werkzeuge für die Ewigkeit.' });

// ─── Mineralien (für das Museum) ────────────────────────────────────────────

/** Mineral mit Fundort-Text; `quelle`: Geoden, in denen es steckt (geoden.js liest das). */
function mineral(id, name, preis, bild, text, quelle = []) {
  item(id, { name, kat: 'mineral', preis, bild, text, museum: true, quelle });
}

// Edelsteine und Kristalle (aus Gestein, Edelsteinknoten und Geoden)
mineral('quarz', 'Quarz', 25, { art: 'kristall', f: '#eef2f6' }, 'Klar wie Klarwasser.', ['geode', 'omnigeode']);
mineral('erdkristall', 'Erdkristall', 50, { art: 'kristall', f: '#c9a45c' }, 'Riecht nach Regen.', ['geode', 'omnigeode']);
mineral('traene', 'Gefrorene Träne', 75, { art: 'traene', f: '#a8e0ff' }, 'Kalt, selbst in der Hand.', ['frostgeode', 'omnigeode']);
mineral('feuerquarz', 'Feuerquarz', 100, { art: 'kristall', f: '#f0604a' }, 'Innen flackert es. Nicht anfassen, wenn er wütend aussieht.', ['magmageode', 'omnigeode']);
mineral('amethyst', 'Amethyst', 100, { art: 'edelstein', f: '#a46ad8' }, 'Violett und vielflächig.');
mineral('topas', 'Topas', 80, { art: 'edelstein', f: '#f2b23a' }, 'Funkelt wie Honig.');
mineral('aquamarin', 'Aquamarin', 180, { art: 'edelstein', f: '#4ec8d8' }, 'Ein Stück Meer, das jemand fest gemacht hat.');
mineral('jade', 'Jade', 200, { art: 'mine_rund', f: '#5cb87a' }, 'Glatt und grün wie ein Teich im Frühling.');
mineral('smaragd', 'Smaragd', 250, { art: 'edelstein', f: '#3ac77a' }, 'Tiefes Grün.');
mineral('rubin', 'Rubin', 250, { art: 'edelstein', f: '#e0344a' }, 'Glüht im Dunkeln. Fast.');
mineral('diamant', 'Diamant', 750, { art: 'edelstein', f: '#e6f8ff' }, 'Selten und begehrt.');
mineral('prismasplitter', 'Prismasplitter', 2000, { art: 'mine_prisma', f: '#ffffff' }, 'Bricht das Licht in alle Farben, die es gibt – und ein paar mehr.', ['omnigeode']);
// aus der Geode (Erde)
mineral('kalzit', 'Kalzit', 75, { art: 'mine_rhombus', f: '#f0e2c0' }, 'Weich, hell und ein bisschen wie Zucker.', ['geode', 'omnigeode']);
mineral('pyrit', 'Pyrit', 120, { art: 'mine_wuerfel', f: '#d8b848' }, 'Auch Katzengold genannt. Die Katzen bestreiten das.', ['geode', 'omnigeode']);
mineral('malachit', 'Malachit', 100, { art: 'mine_gebaendert', f: '#2f9a6a', f2: '#7ad8a0' }, 'Grüne Ringe wie Jahresringe eines Steinbaums.', ['geode', 'omnigeode']);
mineral('jaspis', 'Jaspis', 150, { art: 'mine_rund', f: '#b84a3a' }, 'Rot mit Sprenkeln. Jeder ist ein bisschen anders.', ['geode', 'omnigeode']);
mineral('granit', 'Granit', 75, { art: 'mine_gesprenkelt', f: '#a8a0a0', f2: '#5a5050' }, 'Der Stein, aus dem Berge gemacht sind.', ['geode', 'omnigeode']);
mineral('marmor', 'Marmor', 110, { art: 'mine_geadert', f: '#f2f0ea', f2: '#9aa0b0' }, 'Kühl und geädert. Sehr vornehm.', ['geode', 'omnigeode']);
mineral('tigerauge', 'Tigerauge', 275, { art: 'mine_gebaendert', f: '#a8661a', f2: '#f2c060' }, 'Schaut zurück, wenn man es lange genug anschaut.', ['geode', 'omnigeode']);
mineral('achat', 'Achat', 90, { art: 'mine_gebaendert', f: '#c86a8a', f2: '#f2d0dc' }, 'Rosa Schichten, eine über der anderen.', ['geode', 'omnigeode']);
// aus der Frostgeode
mineral('kyanit', 'Kyanit', 150, { art: 'mine_stengel', f: '#3a6ad8' }, 'Lange blaue Nadeln. Pieksen nicht.', ['frostgeode', 'omnigeode']);
mineral('mondstein', 'Mondstein', 160, { art: 'mine_rund', f: '#dfe4f8' }, 'Leuchtet ein wenig, wenn niemand hinsieht.', ['frostgeode', 'omnigeode']);
mineral('geisterkristall', 'Geisterkristall', 200, { art: 'kristall', f: '#c8f0f0' }, 'Fast unsichtbar. Man muss ihm vertrauen, dass er da ist.', ['frostgeode', 'omnigeode']);
mineral('zoelestin', 'Zölestin', 125, { art: 'mine_stengel', f: '#9ac8f0' }, 'Himmelblau, als hätte jemand ein Stück davon abgebrochen.', ['frostgeode', 'omnigeode']);
mineral('fluorit', 'Fluorit', 250, { art: 'mine_wuerfel', f: '#8a6ae0' }, 'Würfel in Lila und Grün. Die Natur übt Geometrie.', ['frostgeode', 'omnigeode']);
mineral('opal', 'Opal', 150, { art: 'mine_opal', f: '#e8f0f8' }, 'Ein Regenbogen, eingeschlafen in einem Stein.', ['frostgeode', 'omnigeode']);
// aus der Magmageode
mineral('obsidian', 'Obsidian', 200, { art: 'mine_splitter', f: '#2a2238' }, 'Vulkanglas. Scharfkantig und glänzend.', ['magmageode', 'omnigeode']);
mineral('basalt', 'Basalt', 175, { art: 'mine_saeule', f: '#4a4a54' }, 'Erstarrte Lava in ordentlichen Säulen.', ['magmageode', 'omnigeode']);
mineral('feueropal', 'Feueropal', 350, { art: 'mine_opal', f: '#f08a3a' }, 'Ein kleines Lagerfeuer zum Mitnehmen.', ['magmageode', 'omnigeode']);
mineral('haematit', 'Hämatit', 150, { art: 'mine_rund', f: '#5a4a50' }, 'Silbrig grau, aber gerieben blutrot.', ['magmageode', 'omnigeode']);
mineral('zinnober', 'Zinnober', 160, { art: 'mine_gesprenkelt', f: '#d8402a', f2: '#7a1a1a' }, 'Leuchtend rot. Früher machte man Farbe daraus.', ['magmageode', 'omnigeode']);
mineral('donnerei', 'Donnerei', 100, { art: 'mine_donnerei', f: '#8a7a6a', f2: '#5ab8d8' }, 'Außen langweilig, innen ein Gewitter.', ['magmageode', 'omnigeode']);
mineral('sternensplitter', 'Sternensplitter', 500, { art: 'mine_stern', f: '#f8e070' }, 'Fiel vor langer Zeit vom Himmel und blieb.', ['omnigeode']);

export const MINERALIEN = Object.keys(ITEMS).filter((id) => ITEMS[id].kat === 'mineral' && ITEMS[id].museum);

// ─── Artefakte (für das Museum) ─────────────────────────────────────────────

/**
 * Artefakt; `fundorte` sind Kartenarten der Artefaktstellen (dorf, wald, strand, berg, geheimwald,
 * mine), `geode`: auch in Geoden (mit Gewicht).
 */
function artefakt(id, name, preis, text, fundorte, extra = {}) {
  item(id, { name, kat: 'artefakt', preis, bild: { art: id }, text, museum: true, fundorte, ...extra });
}
artefakt('tonscherbe', 'Alte Tonscherbe', 50, 'Ein Stück von einem Krug. Der Rest ist woanders. Oder weg.', ['dorf', 'wald', 'berg']);
artefakt('pfeilspitze', 'Steinpfeilspitze', 40, 'Sorgfältig zugeschlagen, lange bevor es Klarwasser gab.', ['wald', 'berg', 'geheimwald']);
artefakt('rostmuenze', 'Rostige Münze', 100, 'Kaum noch zu erkennen: ein Kopf mit einem sehr großen Hut.', ['dorf', 'strand']);
artefakt('knochenfloete', 'Knochenflöte', 100, 'Spielt nur noch einen einzigen, sehr traurigen Ton.', ['wald', 'geheimwald']);
artefakt('zwergenzahnrad', 'Zwergenzahnrad', 120, 'Gehörte zu einer Maschine, die niemand mehr kennt.', ['mine', 'berg'], { geode: true });
artefakt('ammonit', 'Ammonit', 150, 'Eine versteinerte Schnecke. Sie hat es nicht eilig.', ['berg', 'strand'], { geode: true });
artefakt('farnabdruck', 'Farnabdruck', 100, 'Ein Blatt, das sich im Stein verewigt hat.', ['wald', 'geheimwald'], { geode: true });
artefakt('trilobit', 'Trilobit', 150, 'Ein Urzeitkrebs mit sehr vielen Beinen und noch mehr Geduld.', ['strand', 'berg'], { geode: true });
artefakt('dinoei', 'Versteinertes Ei', 350, 'Was wohl daraus geschlüpft wäre? Lieber nicht drüber nachdenken.', ['berg', 'geheimwald']);
artefakt('drachenzahn', 'Drachenzahn', 300, 'Riesig und gebogen. Hoffentlich vom letzten seiner Art.', ['mine']);
artefakt('tonfigur', 'Kleine Tonfigur', 90, 'Eine dicke kleine Figur mit sehr zufriedenem Gesicht.', ['dorf', 'wald']);
artefakt('bronzespiegel', 'Bronzespiegel', 200, 'Blank geputzt würde er dich zeigen. Etwas verschwommen.', ['dorf']);
artefakt('glasperle', 'Antike Glasperle', 80, 'Blau mit gelben Punkten. Einmal Teil einer Kette.', ['dorf', 'strand']);
artefakt('faustkeil', 'Faustkeil', 60, 'Das Schweizer Messer der Steinzeit.', ['wald', 'berg']);
artefakt('zwergenrolle', 'Zwergenschriftrolle', 120, 'In einer Schrift, die nur aus Kanten besteht.', ['mine', 'berg'], { geode: true });
artefakt('zwergenhelm', 'Zwergenhelm', 250, 'Klein, verbeult und mit einer Kerze obendrauf.', ['mine']);
artefakt('krone', 'Verbeulte Krone', 400, 'Wer sie trug, hatte einen sehr runden Kopf.', ['mine', 'geheimwald']);
artefakt('holzpuppe', 'Alte Holzpuppe', 70, 'Ein Arm fehlt, das Lächeln ist geblieben.', ['dorf', 'geheimwald']);
artefakt('schiffsglocke', 'Kleine Schiffsglocke', 180, 'Klingt noch immer nach Salz und Abschied.', ['strand']);
artefakt('muschelamulett', 'Muschelamulett', 160, 'Eine Muschel an einem Lederband. Bringt angeblich Glück beim Angeln.', ['strand']);
artefakt('sternkarte', 'Sternkarte', 220, 'Ein Himmel auf Schiefer geritzt. Ein paar Sterne gibt es heute nicht mehr.', ['berg', 'geheimwald']);
artefakt('goldkelch', 'Goldener Kelch', 500, 'Für ganz besondere Anlässe. Oder Limonade.', ['mine']);

export const ARTEFAKTE = Object.keys(ITEMS).filter((id) => ITEMS[id].kat === 'artefakt');

// ─── Geoden ─────────────────────────────────────────────────────────────────

const geodeText = 'Bruno in der Schmiede knackt sie für 25 g.';
item('geode', { name: 'Geode', kat: 'geode', preis: 50, bild: { art: 'mine_geode', f: '#a08a70', f2: '#e8d8b0' }, text: `Ein runder Stein voller Überraschungen. ${geodeText}` });
item('frostgeode', { name: 'Frostgeode', kat: 'geode', preis: 100, bild: { art: 'mine_geode', f: '#8aa8c0', f2: '#d8f0ff' }, text: `Eiskalt und schwer. ${geodeText}` });
item('magmageode', { name: 'Magmageode', kat: 'geode', preis: 150, bild: { art: 'mine_geode', f: '#7a4a3a', f2: '#f8904a' }, text: `Noch ein bisschen warm. ${geodeText}` });
item('omnigeode', { name: 'Omnigeode', kat: 'geode', preis: 0, bild: { art: 'mine_geode', f: '#7a6a9a', f2: '#f0c8f8', omni: true }, text: `Darin kann einfach alles stecken. ${geodeText}`, verkaufbar: false });

// ─── Monsterbeute ───────────────────────────────────────────────────────────

item('schleim', { name: 'Schleim', kat: 'ressource', preis: 5, bild: { art: 'schleim', f: '#6fc94a' }, text: 'Klebt. Riecht. Wird trotzdem gekauft.' });
item('fluegel', { name: 'Fledermausflügel', kat: 'ressource', preis: 15, bild: { art: 'fluegel' }, text: 'Ledrig und leicht.' });
item('kaeferpanzer', { name: 'Käferpanzer', kat: 'ressource', preis: 20, bild: { art: 'kaeferpanzer' }, text: 'Hart, glänzend und überraschend leicht.' });
item('knochensplitter', { name: 'Knochensplitter', kat: 'ressource', preis: 12, bild: { art: 'knochensplitter' }, text: 'Hoffentlich nicht von jemandem, den man kannte.' });
item('geisterhauch', { name: 'Geisterhauch', kat: 'ressource', preis: 40, bild: { art: 'geisterhauch' }, text: 'Ein Wölkchen im Glas. Seufzt manchmal.' });
item('schattenessenz', { name: 'Schattenessenz', kat: 'ressource', preis: 60, bild: { art: 'essenz', f: '#4a3a6a', f2: '#a888e0' }, text: 'Ein Tropfen Dunkelheit. Saugt das Licht ein bisschen an.' });
item('glutessenz', { name: 'Glutessenz', kat: 'ressource', preis: 60, bild: { art: 'essenz', f: '#d8482a', f2: '#f8d070' }, text: 'Pulsiert warm in der Hand wie ein kleines Herz.' });

// ─── Waffen ─────────────────────────────────────────────────────────────────

/** Grundwerte je Waffenart: Schwungdauer (s), Rückstoß, Spezialzug (Name, Abklingzeit s). */
export const WAFFEN_ARTEN = {
  schwert: { werkzeug: 'waffe', dauer: 0.28, rueckstoss: 1, spezial: 'Block', abkuehlung: 3.5 },
  dolch: { werkzeug: 'mine_dolch', dauer: 0.18, rueckstoss: 0.6, spezial: 'Stichhagel', abkuehlung: 4 },
  keule: { werkzeug: 'mine_keule', dauer: 0.42, rueckstoss: 1.7, spezial: 'Stampfer', abkuehlung: 6 },
};

/**
 * waffe(id, name, art, [von, bis], { tempo (−2…+2), krit, kritFaktor, rueckstoss, preis, f, f2, f3, form, text })
 * f = Klinge/Kopf, f2 = Griff, f3 = Parierstange/Zier; form: gerade, krumm, breit, stern.
 */
function waffe(id, name, art, schaden, opt) {
  const a = WAFFEN_ARTEN[art];
  item(id, {
    name, kat: 'waffe', preis: opt.preis ?? 50, stapel: false, verschenkbar: false,
    bild: { art: `mine_${art}`, f: opt.f, f2: opt.f2, f3: opt.f3, form: opt.form ?? 'gerade' },
    werkzeug: a.werkzeug, text: opt.text,
    waffe: {
      art, schaden, tempo: opt.tempo ?? 0, krit: opt.krit ?? 0.02, kritFaktor: opt.kritFaktor ?? 1.5,
      rueckstoss: opt.rueckstoss ?? a.rueckstoss,
    },
  });
}
// Schwerter
waffe('schwert', 'Rostiges Schwert', 'schwert', [2, 5], { preis: 25, f: '#b8a890', f2: '#6a4a2a', f3: '#9a6a4a', text: 'Alt, aber scharf genug für Schleime.' });
waffe('holzklinge', 'Holzklinge', 'schwert', [3, 7], { preis: 50, f: '#c89a5a', f2: '#6a4a2a', f3: '#8a6a3a', text: 'Geschnitzt aus Eiche. Kratzt mehr, als es schneidet.' });
waffe('stahlschwert', 'Stahlschwert', 'schwert', [6, 11], { preis: 150, f: '#d8dee6', f2: '#4a3a5a', f3: '#8a8a9a', text: 'Ein ordentliches, ehrliches Schwert.' });
waffe('silbersaebel', 'Silbersäbel', 'schwert', [9, 15], { preis: 300, tempo: 1, f: '#eef2f8', f2: '#3a4a7a', f3: '#c8a050', form: 'krumm', text: 'Leicht gebogen und schnell. Pfeift beim Schwingen.' });
waffe('eisenklinge', 'Eisenklinge', 'schwert', [13, 24], { preis: 450, f: '#c0c8d0', f2: '#5a2a2a', f3: '#6a6a74', text: 'Schwer, verlässlich, kein Firlefanz.' });
waffe('bergbreitschwert', 'Bergbreitschwert', 'schwert', [20, 32], { preis: 600, tempo: -2, rueckstoss: 1.5, f: '#a8b0b8', f2: '#3a2a1a', f3: '#7a6a5a', form: 'breit', text: 'Breit wie eine Tür. Hält Monster auf Abstand.' });
waffe('templerklinge', 'Templerklinge', 'schwert', [22, 30], { preis: 800, krit: 0.04, f: '#f2f2f8', f2: '#6a1a2a', f3: '#e8c050', text: 'Glänzt so sauber, dass Schleime sich schämen.' });
waffe('obsidianklinge', 'Obsidianklinge', 'schwert', [30, 44], { preis: 1000, tempo: 1, krit: 0.05, kritFaktor: 1.8, f: '#3a2a4a', f2: '#1a1a22', f3: '#a888e0', text: 'Aus Vulkanglas. Schneidet die Luft in zwei Hälften.' });
waffe('lavakatana', 'Lava-Katana', 'schwert', [55, 66], { preis: 1500, tempo: 1, krit: 0.06, kritFaktor: 1.8, f: '#f86a3a', f2: '#2a1a1a', f3: '#f8d070', form: 'krumm', text: 'Die Klinge glüht noch. Bitte nicht in die Tasche stecken. Ach so.' });
waffe('sternenklinge', 'Sternenklinge', 'schwert', [60, 80], { preis: 2500, tempo: 1, krit: 0.05, kritFaktor: 2, f: '#c8a8f8', f2: '#2a2a5a', f3: '#f8e070', form: 'stern', text: 'Geschmiedet aus etwas, das vom Himmel fiel. Summt leise.' });
// Dolche
waffe('schnitzmesser', 'Schnitzmesser', 'dolch', [2, 5], { preis: 50, tempo: 2, krit: 0.05, f: '#c8c8c8', f2: '#8a5a2a', f3: '#5a3a1a', text: 'Eigentlich für Holzlöffel gedacht.' });
waffe('eisendolch', 'Eisendolch', 'dolch', [5, 9], { preis: 150, tempo: 2, krit: 0.06, f: '#d0d6de', f2: '#3a3a4a', f3: '#8a8a9a', text: 'Kurz, spitz und flink.' });
waffe('kristalldolch', 'Kristalldolch', 'dolch', [10, 16], { preis: 400, tempo: 2, krit: 0.08, kritFaktor: 1.8, f: '#a8e8f8', f2: '#3a5a7a', f3: '#e8f8ff', text: 'Aus einem einzigen Kristall geschliffen. Klirrt bei Treffern.' });
waffe('elfenklinge', 'Elfenklinge', 'dolch', [14, 22], { preis: 700, tempo: 2, krit: 0.1, kritFaktor: 1.8, f: '#b8f0a8', f2: '#4a6a3a', f3: '#e8d070', form: 'krumm', text: 'Leicht wie ein Blatt und genauso leise.' });
waffe('glutdolch', 'Glutdolch', 'dolch', [26, 34], { preis: 1000, tempo: 2, krit: 0.1, kritFaktor: 2, f: '#f8904a', f2: '#3a1a1a', f3: '#f8d070', text: 'Riecht nach Funkenflug.' });
waffe('schattendolch', 'Schattendolch', 'dolch', [40, 52], { preis: 1500, tempo: 2, krit: 0.12, kritFaktor: 2, f: '#5a4a8a', f2: '#1a1a2a', f3: '#c8a8f8', text: 'Man sieht ihn erst, wenn er schon getroffen hat.' });
// Keulen
waffe('holzknueppel', 'Holzknüppel', 'keule', [7, 14], { preis: 60, tempo: -1, f: '#a87a4a', f2: '#6a4a2a', f3: '#5a3a1a', text: 'Ein dicker Ast mit großen Plänen.' });
waffe('knochenkeule', 'Knochenkeule', 'keule', [12, 20], { preis: 200, tempo: -1, f: '#ece4d0', f2: '#8a7a5a', f3: '#c8bca0', text: 'Ein Oberschenkelknochen. Von wem, will man nicht wissen.' });
waffe('bleistab', 'Bleistab', 'keule', [18, 28], { preis: 400, tempo: -2, rueckstoss: 1.9, f: '#7a8088', f2: '#3a3a42', f3: '#9aa0a8', text: 'Sehr schwer. Sehr überzeugend.' });
waffe('kriegshammer', 'Kriegshammer', 'keule', [30, 46], { preis: 900, tempo: -2, rueckstoss: 2, f: '#8a92a0', f2: '#5a3a2a', f3: '#d8b048', form: 'breit', text: 'Ein Hammer, der nie einen Nagel gesehen hat.' });
waffe('magmahammer', 'Magmahammer', 'keule', [48, 66], { preis: 1600, tempo: -2, rueckstoss: 2.1, krit: 0.04, f: '#5a3a3a', f2: '#2a1a1a', f3: '#f8784a', form: 'breit', text: 'Im Kopf brodelt es. Bei jedem Schlag zischt die Luft.' });

export const WAFFEN = Object.keys(ITEMS).filter((id) => ITEMS[id].kat === 'waffe');

// ─── Ringe und Stiefel ──────────────────────────────────────────────────────

/** Ring: f = Stein, f2 = Band; `ring` beschreibt die Wirkung (ringe.js wertet sie aus). */
function ring(id, name, preis, f, f2, wirkung, text) {
  item(id, { name, kat: 'ring', preis, stapel: false, bild: { art: 'mine_ring', f, f2 }, ring: wirkung, text });
}
ring('kupferring', 'Kupferring', 100, '#d98a4e', '#b86a3a', { stufe: { bergbau: 1 } }, 'Bergbau +1. Riecht ein wenig nach Münzen.');
ring('glueckring', 'Glücksring', 500, '#5ac87a', '#e8c050', { glueck: 1 }, 'Mehr Glück unter Tage: öfter Leitern, bessere Funde.');
ring('magnetring', 'Magnetring', 200, '#c84a4a', '#a8b0b8', { sammelRadius: 32 }, 'Funde fliegen dir aus zwei Feldern Entfernung zu.');
ring('leuchtring', 'Leuchtring', 200, '#f8e07a', '#c8a050', { licht: 3 }, 'Ein warmes Licht begleitet dich durch die Dunkelheit.');
ring('schutzring', 'Schutzring', 400, '#4a8ad8', '#a8b0b8', { verteidigung: 2 }, 'Verteidigung +2. Fühlt sich an wie eine Umarmung von einer Ritterrüstung.');
ring('kriegerring', 'Kriegerring', 750, '#e8783a', '#6a6a74', { schaden: 0.1 }, 'Zehn Prozent mehr Schaden. Macht ein grimmiges Gesicht.');
ring('rubinring', 'Rubinring', 600, '#e0344a', '#e8c050', { krit: 0.05 }, 'Kritische Treffer werden häufiger.');
ring('smaragdring', 'Smaragdring', 600, '#3ac77a', '#e8c050', { waffenTempo: 0.12 }, 'Waffen schwingen spürbar schneller.');
ring('ruhering', 'Ruhering', 500, '#a8d8f0', '#d8d8e0', { energie: 0.15 }, 'Werkzeuge kosten weniger Energie. Atme tief durch.');
ring('lebensring', 'Lebensring', 900, '#f06a8a', '#e8c050', { gesundheit: 25 }, 'Höchste Gesundheit +25. Das Herz schlägt etwas ruhiger.');
ring('vampirring', 'Vampirring', 800, '#8a1a2a', '#3a3a42', { heilen: 2 }, 'Jedes besiegte Monster gibt dir 2 Gesundheit zurück.');
ring('anglerring', 'Anglerring', 400, '#5ab8d8', '#b8c0c8', { stufe: { angeln: 1 } }, 'Angeln +1. Ein kleiner Fisch ist eingraviert.');

export const RINGE = Object.keys(ITEMS).filter((id) => ITEMS[id].kat === 'ring');

/** Stiefel: f = Leder, f2 = Sohle/Beschlag; `stiefel` = { verteidigung, tempo } */
function stiefel(id, name, preis, f, f2, wirkung, text) {
  item(id, { name, kat: 'stiefel', preis, stapel: false, bild: { art: 'mine_stiefel', f, f2 }, stiefel: wirkung, text });
}
stiefel('lederstiefel', 'Lederstiefel', 250, '#9a6a3a', '#4a3020', { verteidigung: 1 }, 'Verteidigung +1. Bequem eingelaufen.');
stiefel('wanderstiefel', 'Wanderstiefel', 500, '#6a7a4a', '#3a2a1a', { verteidigung: 1, tempo: 0.05 }, 'Verteidigung +1, ein bisschen schneller zu Fuß.');
stiefel('eisenkappen', 'Eisenkappenstiefel', 800, '#5a5a62', '#a8b0b8', { verteidigung: 3 }, 'Verteidigung +3. Klonk, klonk.');
stiefel('feuerstiefel', 'Feuerläufer', 1200, '#b83a2a', '#f8b04a', { verteidigung: 4, tempo: 0.08 }, 'Verteidigung +4 und flinke Füße. Hinterlassen keine Brandflecken. Meistens.');

export const STIEFEL = Object.keys(ITEMS).filter((id) => ITEMS[id].kat === 'stiefel');

// ─── Bomben und Treppe ──────────────────────────────────────────────────────

item('kirschbombe', { name: 'Kirschbombe', kat: 'ressource', preis: 50, bild: { art: 'mine_bombe', f: '#d83a3a', groesse: 0 }, bombe: { radius: 2.5, schaden: 30 }, text: 'Klein, rund und laut. Auf ein Feld legen und Abstand halten.' });
item('bombe', { name: 'Bombe', kat: 'ressource', preis: 50, bild: { art: 'mine_bombe', f: '#3a3a4a', groesse: 1 }, bombe: { radius: 3.5, schaden: 60 }, text: 'Sprengt Gestein und schlechte Laune weg.' });
item('megabombe', { name: 'Megabombe', kat: 'ressource', preis: 50, bild: { art: 'mine_bombe', f: '#5a2a6a', groesse: 2 }, bombe: { radius: 5.5, schaden: 120 }, text: 'Sehr groß. Wirklich sehr. Weit weglaufen!' });
item('treppe', { name: 'Treppe', kat: 'ressource', preis: 1, bild: { art: 'mine_treppe' }, text: 'In der Mine benutzen: führt sofort eine Ebene tiefer.' });

rezept('kirschbombe', { art: 'basteln', zutaten: { kupfererz: 4, kohle: 1 }, stufe: ['bergbau', 1] });
rezept('bombe', { art: 'basteln', zutaten: { eisenerz: 4, kohle: 1 }, stufe: ['bergbau', 6] });
rezept('megabombe', { art: 'basteln', zutaten: { golderz: 4, glutessenz: 1, schattenessenz: 1 }, stufe: ['bergbau', 8] });
rezept('treppe', { art: 'basteln', zutaten: { stein: 99 }, stufe: ['bergbau', 2] });

// Den Iridiumbarren schmilzt man wie die anderen – solange niemand (handwerk) ein eigenes Rezept hat.
system({
  name: 'mine-rezepte',
  fertig() {
    if (!REZEPTE.some((r) => (r.ergebnis ?? r.id) === 'iridiumbarren')) rezept('iridiumbarren', { art: 'basteln', zutaten: { iridiumerz: 5, kohle: 1 } });
  },
});
