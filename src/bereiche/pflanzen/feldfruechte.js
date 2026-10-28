// Bereich „pflanzen": die Feldfrüchte (Frühling, Sommer, Herbst) samt Saat.
// Werte nach Stardew-Art: Kaufpreis der Saat, Tage bis zur Ernte, Nachwachsen, Verkaufspreis.
// Rankhilfen (`rankhilfe`) versperren ihr Beet, Riesenpflanzen (`riesig`) verschmelzen über Nacht
// zu 3×3 (riesen.js). Jede Ernte trägt `sorte`.

import { JZ_NAME, item, pflanze } from '../../daten.js';

/** Farbe des Saattüten-Streifens je Jahreszeit (die erste Jahreszeit der Pflanze zählt). */
export const JZ_FARBE = { fruehling: '#7cc25a', sommer: '#f2c43a', herbst: '#d8742f', winter: '#8ab8e0' };

/** Feldfrucht samt Ernte- und Saat-Gegenstand. */
function frucht(id, { name, saatName, kauf, tage, nach = 0, jz, preis, menge = 1, wuchs, bild, energie, obst = false, extra = 0, sorte, rankhilfe, riesig, text }) {
  pflanze(id, { saat: `${id}_saat`, ernte: id, tage, nach, jz, menge, wuchs, extra, farbe: bild.f, rankhilfe: !!rankhilfe, riesig: !!riesig });
  const zeiten = jz.map((j) => JZ_NAME[j]).join(' & ');
  item(id, {
    name, kat: 'ernte', preis, bild, energie, frucht: obst, gemuese: !obst && !sorte, sorte: sorte ?? (obst ? 'obst' : 'gemuese'),
    text: text ?? `${zeiten}-Ernte.`,
  });
  const zusatz = [rankhilfe ? 'Wächst an einer Rankhilfe, die das Beet versperrt.' : '', riesig ? 'Neun reife nebeneinander werden manchmal riesig.' : ''].filter(Boolean).join(' ');
  item(`${id}_saat`, {
    name: saatName, kat: 'saat', preis: Math.floor(kauf / 2), bild: { art: 'saat', f: bild.f, f2: JZ_FARBE[jz[0]], f3: bild.f2, ernte: id }, kauf, pflanze: id,
    text: `${zeiten}. Reift in ${tage} Tagen${nach ? `, trägt danach alle ${nach} Tage` : ''}.${zusatz ? ' ' + zusatz : ''}`,
  });
}

// id, Name, Saat, Kaufpreis, Tage, Nachwuchs, Jahreszeiten, Verkauf, Menge, Wuchsform, Bild, Extra
const F = ['fruehling'];
const S = ['sommer'];
const H = ['herbst'];
export const FRUECHTE = [
  // Frühling
  ['pastinake', 'Pastinake', 'Pastinakensamen', 20, 4, 0, F, 35, 1, 'wurzel', { art: 'wurzel', f: '#efe0a0', f2: '#6aa84f' }, { energie: 25 }],
  ['bohne', 'Grüne Bohne', 'Bohnenkerne', 60, 10, 3, F, 40, 1, 'rank', { art: 'schote', f: '#5fae3c' }, { energie: 25, rankhilfe: true }],
  ['blumenkohl', 'Blumenkohl', 'Blumenkohlsamen', 80, 12, 0, F, 175, 1, 'kohl', { art: 'blumenkohl', f: '#f4f0e0', f2: '#5c9a45' }, { energie: 75, riesig: true }],
  ['kartoffel', 'Kartoffel', 'Saatkartoffeln', 50, 6, 0, F, 80, 1, 'knolle', { art: 'knolle', f: '#c99a5b' }, { energie: 25, extra: 0.25 }],
  ['gruenkohl', 'Grünkohl', 'Grünkohlsamen', 70, 6, 0, F, 110, 1, 'kohl', { art: 'blattkohl', f: '#3f8a4a' }, { energie: 50 }],
  ['tulpe', 'Tulpe', 'Tulpenzwiebeln', 20, 6, 0, F, 30, 1, 'blume', { art: 'tulpe', f: '#e0475b' }, { energie: 18, sorte: 'blume' }],
  ['knoblauch', 'Knoblauch', 'Knoblauchzehen', 40, 4, 0, F, 60, 1, 'wurzel', { art: 'knoblauch', f: '#f2ece0', f2: '#b88ab8' }, { energie: 20, text: 'Frühlings-Ernte. Vertreibt Vampire und Verabredungen.' }],
  ['rhabarber', 'Rhabarber', 'Rhabarberwurzeln', 100, 13, 0, F, 220, 1, 'busch', { art: 'rhabarber', f: '#d8384a', f2: '#5c9a45' }, { obst: true, text: 'Frühlings-Ernte. Sauer macht lustig – mit Zucker erst recht.' }],
  ['erdbeere', 'Erdbeere', 'Erdbeersamen', 100, 8, 4, F, 120, 1, 'busch', { art: 'erdbeere', f: '#e8323e' }, { energie: 50, obst: true, extra: 0.02 }],
  ['reis', 'Reis', 'Saatreis', 40, 8, 0, F, 30, 1, 'aehre', { art: 'reis', f: '#efe6c8', f2: '#9ab85a' }, { energie: 3, sorte: 'getreide', extra: 0.1, text: 'Frühlings-Ernte. Ungeschält – Körner für die Mühle.' }],
  ['kornblume', 'Kornblume', 'Kornblumensamen', 30, 7, 0, F, 50, 1, 'blume', { art: 'kornblume', f: '#4a7ae0', f2: '#9ab8f4' }, { energie: 45, sorte: 'blume' }],
  ['moehre', 'Möhre', 'Möhrensamen', 30, 3, 0, F, 35, 1, 'wurzel', { art: 'moehre', f: '#f08a2a', f2: '#5fae3c' }, { energie: 75 }],
  ['erbse', 'Zuckererbse', 'Erbsensamen', 50, 9, 3, F, 40, 1, 'rank', { art: 'erbse', f: '#8fd05a' }, { energie: 30, rankhilfe: true }],
  ['kaffeebohne', 'Kaffeebohne', 'Kaffeepflänzchen', 200, 10, 2, ['fruehling', 'sommer'], 15, 4, 'busch', { art: 'kaffeebohne', f: '#c0302a', f2: '#5a3a24' }, { sorte: 'kraut', text: 'Frühlings- & Sommer-Ernte. Fünf davon und ein Fass – Morgenmuffel danken.' }],
  // Sommer
  ['melone', 'Melone', 'Melonensamen', 80, 12, 0, S, 250, 1, 'gross', { art: 'melone', f: '#6fb648', f2: '#e8506a' }, { energie: 113, obst: true, riesig: true }],
  ['tomate', 'Tomate', 'Tomatensamen', 50, 11, 4, S, 60, 1, 'stab', { art: 'tomate', f: '#e2412f' }, { energie: 20 }],
  ['blaubeere', 'Blaubeere', 'Blaubeersamen', 80, 13, 4, S, 50, 3, 'busch', { art: 'beeren', f: '#4a63c9' }, { energie: 25, obst: true, extra: 0.02 }],
  ['peperoni', 'Peperoni', 'Peperonisamen', 40, 5, 3, S, 40, 1, 'busch', { art: 'peperoni', f: '#d8342a' }, { energie: 13, obst: true, extra: 0.03 }],
  ['radieschen', 'Radieschen', 'Radieschensamen', 40, 6, 0, S, 90, 1, 'wurzel', { art: 'rundwurzel', f: '#e04a72', f2: '#6aa84f' }, { energie: 45 }],
  ['mais', 'Mais', 'Maiskörner', 150, 14, 4, ['sommer', 'herbst'], 50, 1, 'hoch', { art: 'kolben', f: '#f2cf45' }, { energie: 25 }],
  ['weizen', 'Weizen', 'Weizensamen', 10, 4, 0, ['sommer', 'herbst'], 25, 1, 'aehre', { art: 'aehre', f: '#d9b45a' }, { sorte: 'getreide' }],
  ['hopfen', 'Hopfen', 'Hopfenstecklinge', 60, 11, 1, S, 25, 1, 'rank', { art: 'hopfen', f: '#a8d050' }, { energie: 45, rankhilfe: true, sorte: 'kraut', text: 'Sommer-Ernte. Duftet bitter. Wird gern zu Bier.' }],
  ['rotkohl', 'Rotkohl', 'Rotkohlsamen', 100, 9, 0, S, 260, 1, 'kohl', { art: 'rotkohl', f: '#8a3a8e', f2: '#b07ab8' }, { energie: 75 }],
  ['sternfrucht', 'Sternfrucht', 'Sternfruchtsamen', 400, 13, 0, S, 750, 1, 'busch', { art: 'sternfrucht', f: '#f4d23a' }, { energie: 125, obst: true, text: 'Sommer-Ernte. So saftig, dass sie leuchtet. Fast.' }],
  ['sonnenblume', 'Sonnenblume', 'Sonnenblumenkerne', 200, 8, 0, ['sommer', 'herbst'], 80, 1, 'hoch', { art: 'sonnenblume', f: '#f6c22a', f2: '#6a4424' }, { energie: 45, sorte: 'blume' }],
  ['mohn', 'Mohn', 'Mohnsamen', 100, 7, 0, S, 140, 1, 'blume', { art: 'mohn', f: '#e8382e', f2: '#2a2026' }, { energie: 45, sorte: 'blume' }],
  ['zucchini', 'Zucchini', 'Zucchinisamen', 40, 6, 3, S, 45, 1, 'gross', { art: 'zucchini', f: '#4e9a3a', f2: '#f2c43a' }, { energie: 25 }],
  ['sommerstern', 'Sommerstern', 'Sommersternsamen', 50, 8, 0, S, 90, 1, 'blume', { art: 'sommerstern', f: '#f28a3a', f2: '#f6d84a' }, { energie: 45, sorte: 'blume', text: 'Sommer-Ernte. Blüht, als hätte die Sonne gelacht.' }],
  // Herbst
  ['kuerbis', 'Kürbis', 'Kürbiskerne', 100, 13, 0, H, 320, 1, 'gross', { art: 'kuerbis', f: '#e5872a' }, { riesig: true }],
  ['aubergine', 'Aubergine', 'Auberginensamen', 20, 5, 5, H, 60, 1, 'busch', { art: 'aubergine', f: '#6b3a8f' }, { energie: 20, extra: 0.02 }],
  ['preiselbeere', 'Preiselbeere', 'Preiselbeersamen', 240, 7, 5, H, 75, 2, 'busch', { art: 'beeren', f: '#c2283f' }, { energie: 38, obst: true, extra: 0.1 }],
  ['rotebete', 'Rote Bete', 'Rote-Bete-Samen', 30, 6, 0, H, 70, 1, 'wurzel', { art: 'rundwurzel', f: '#8e2a4a', f2: '#5c9a45' }, { energie: 30 }],
  ['pakchoi', 'Pak Choi', 'Pak-Choi-Samen', 50, 4, 0, H, 80, 1, 'kohl', { art: 'pakchoi', f: '#8fcf6a', f2: '#eef5dc' }, { energie: 25 }],
  ['trauben', 'Weintrauben', 'Rebstecklinge', 60, 10, 3, H, 80, 1, 'rank', { art: 'traube', f: '#5a3a9a' }, { energie: 38, obst: true, rankhilfe: true }],
  ['artischocke', 'Artischocke', 'Artischockensamen', 30, 8, 0, H, 160, 1, 'kohl', { art: 'artischocke', f: '#6a9a5a', f2: '#9a6aa8' }, { energie: 30 }],
  ['yamswurzel', 'Yamswurzel', 'Yamsknollen', 60, 10, 0, H, 160, 1, 'wurzel', { art: 'yamswurzel', f: '#c8603a', f2: '#5c9a45' }, { energie: 45 }],
  ['amaranth', 'Amaranth', 'Amaranthsamen', 70, 7, 0, H, 150, 1, 'hoch', { art: 'amaranth', f: '#b8285a', f2: '#6a9a3a' }, { energie: 50, sorte: 'getreide' }],
  ['feenrose', 'Feenrose', 'Feenrosensamen', 200, 12, 0, H, 290, 1, 'blume', { art: 'feenrose', f: '#e88ad8', f2: '#fbe0f4' }, { energie: 45, sorte: 'blume', text: 'Herbst-Ernte. Bienen werden bei ihr ganz sentimental.' }],
  ['brokkoli', 'Brokkoli', 'Brokkolisamen', 80, 8, 4, H, 70, 1, 'kohl', { art: 'brokkoli', f: '#3e7a3a' }, { energie: 63 }],
  ['zuckerruebe', 'Zuckerrübe', 'Zuckerrübensamen', 40, 9, 0, H, 90, 1, 'wurzel', { art: 'wurzel', f: '#f0e6c8', f2: '#5c9a45' }, { energie: 30, text: 'Herbst-Ernte. Süß wie ein Sonntagmorgen.' }],
];

for (const [id, name, saatName, kauf, tage, nach, jz, preis, menge, wuchs, bild, extra] of FRUECHTE) {
  frucht(id, { name, saatName, kauf, tage, nach, jz, preis, menge, wuchs, bild, ...extra });
}
