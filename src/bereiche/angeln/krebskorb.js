// Bereich „angeln": der Krebskorb. Man stellt ihn direkt ins Wasser (auf jeder Karte mit Wasser),
// legt einen Köder hinein, und über Nacht krabbelt etwas hinein: im Meer Salzwasser-Krebstiere und
// Muscheln, in Teich, Fluss und Seen Flusskrebs und Schnecke – manchmal nur Müll.
//
// Objekt im Spielstand: { t: 'krebskorb', koeder: itemId | null, fang: itemId | null }.
// Krebstiere tragen `sorte: 'krebs'` und `krebs: { wasser: 'salz' | 'suess', laenge, gewicht }`; jeder
// Fang zählt im Fangbuch (s.angeln.gefangen) mit, wie Fische.

import { ITEMS, item, kategorie, rezept, objektTyp, muell, erwartet } from '../../daten.js';
import { istWasser, wasserArt } from '../../karten.js';
import * as L from '../../logik.js';
import { fangBuchen, muellFuer } from '../../angeln.js';
import { waehle } from '../../zufall.js';
import { ton, ergebnisZeigen } from '../../spiel.js';

kategorie('krebs', 'Krebstier');

/** Krebstiere: [id, name, preis, wasser, gewicht (Häufigkeit im Korb), laenge cm, bild, text]. */
const KREBSE = [
  ['krebs', 'Taschenkrebs', 100, 'salz', 22, [8, 20], { f: '#d8583a', f2: '#f0a070' }, 'Läuft lieber seitwärts. Hat es dabei aber nie eilig.'],
  ['garnele', 'Garnele', 60, 'salz', 20, [4, 9], { f: '#f08a7a', f2: '#f8c8b0' }, 'Klein, rosa und ständig in Bewegung.'],
  ['hummer', 'Hummer', 120, 'salz', 7, [25, 50], { f: '#2a4a7a', f2: '#c8503a' }, 'Ein gepanzerter Herr mit zwei kräftigen Scheren.'],
  ['miesmuschel', 'Miesmuschel', 30, 'salz', 18, [4, 8], { f: '#2a2a4a', f2: '#5a6a9a' }, 'Blauschwarz und glänzend. Hält sich mit Fäden am Stein fest.'],
  ['auster', 'Auster', 40, 'salz', 12, [6, 14], { f: '#9a9488', f2: '#e8e0d8' }, 'Rau von außen, perlmuttglänzend von innen.'],
  ['flusskrebs', 'Flusskrebs', 75, 'suess', 40, [8, 16], { f: '#7a4a2a', f2: '#c87a4a' }, 'Versteckt sich tagsüber unter Steinen im Bach.'],
  ['schnecke', 'Schnecke', 65, 'suess', 35, [2, 6], { f: '#9a6a3a', f2: '#e8d0a0' }, 'Trägt ihr Haus immer bei sich. Praktisch.'],
];
for (const [id, name, preis, wasser, gewicht, laenge, bild, text] of KREBSE) {
  item(id, { name, kat: 'krebs', sorte: 'krebs', preis, bild: { art: id, ...bild }, krebs: { wasser, gewicht, laenge }, text });
}
// Die Herzmuschel (Strandfund) gibt es schon im Bereich pflanzen; im Salzwasser-Korb kommt sie dazu.
erwartet('herzmuschel', 'eisenbarren');
const FREMDE_KREBSE = [['herzmuschel', 'salz', 15, [3, 7]]];

// ─── Müll aus Korb und Angel ────────────────────────────────────────────────

item('zeitung', { name: 'Aufgeweichte Zeitung', kat: 'muell', preis: 0, bild: { art: 'zeitung' }, text: 'Die Schlagzeile ist nicht mehr zu lesen. Schade, sie fing spannend an.' });
item('brille', { name: 'Verbogene Brille', kat: 'muell', preis: 0, bild: { art: 'brille' }, text: 'Irgendwer sucht die bestimmt. Ohne Brille aber schlecht.' });
item('gruenalgen', { name: 'Grünalgen', kat: 'muell', preis: 15, bild: { art: 'gruenalgen' }, text: 'Glitschige grüne Fäden. Riecht nach Teich.' });
muell('teich', ['gruenalgen', 'zeitung']);
muell('fluss', ['gruenalgen', 'zeitung']);
muell('see', ['stiefel', 'treibholz', 'gruenalgen', 'brille']);
muell('waldsee', ['treibholz', 'gruenalgen', 'zeitung']);
muell('meer', ['brille']);
muell('geheimteich', ['treibholz', 'gruenalgen']);
muell('mine', ['stiefel', 'brille']);

// ─── Der Korb ───────────────────────────────────────────────────────────────

/** Zahlen des Krebskorbs: Müllchance sinkt mit der Angelstufe. */
export const KREBSKORB = { muell: 0.2, muellJeStufe: -0.01, muellMin: 0.08, xp: 5 };

item('krebskorb', {
  name: 'Krebskorb', kat: 'platz', preis: 50, bild: { art: 'krebskorb' }, aufstellbar: true,
  text: 'Direkt ins Wasser stellen und einen Köder hineinlegen. Am Morgen sitzt etwas drin.',
});
rezept('krebskorb', { art: 'basteln', zutaten: { holz: 40, eisenbarren: 3 }, stufe: ['angeln', 3] });

/** Salz- oder Süßwasser? Nur das Meer ist salzig. */
export const salzig = (art) => art === 'meer';

/** Was in einem Korb in dieser Gewässerart landen kann: [{ id, gewicht }] (nur Gegenstände, die es gibt). */
export function korbTabelle(art) {
  const wasser = salzig(art) ? 'salz' : 'suess';
  const liste = KREBSE.filter((k) => k[3] === wasser).map((k) => ({ id: k[0], gewicht: k[4] }));
  for (const [id, w, gewicht] of FREMDE_KREBSE) if (w === wasser && ITEMS[id]) liste.push({ id, gewicht });
  return liste;
}

/** Alle Fänge des Korbs, fürs Fangbuch: [{ id, wasser, laenge }]. */
export function korbFaenge() {
  return [
    ...KREBSE.map(([id, , , wasser, , laenge]) => ({ id, wasser, laenge })),
    ...FREMDE_KREBSE.filter(([id]) => ITEMS[id]).map(([id, wasser, , laenge]) => ({ id, wasser, laenge })),
  ];
}

/** Chance auf Müll im Korb. */
export function korbMuellChance(s) {
  const k = KREBSKORB;
  return Math.max(k.muellMin, k.muell + k.muellJeStufe * L.stufeWirksam(s, 'angeln'));
}

/** Der Fang einer Nacht für diese Gewässerart → Item-ID. */
export function korbFang(s, art, r = Math.random) {
  const tabelle = korbTabelle(art);
  if (!tabelle.length || r() < korbMuellChance(s)) return waehle(r, muellFuer(art));
  let z = r() * tabelle.reduce((a, e) => a + e.gewicht, 0);
  for (const e of tabelle) { z -= e.gewicht; if (z <= 0) return e.id; }
  return tabelle[tabelle.length - 1].id;
}

const korbLaenge = (id, r) => {
  const l = korbFaenge().find((k) => k.id === id)?.laenge;
  return l ? Math.round(l[0] + (l[1] - l[0]) * r()) : 0;
};

/** Den Fang herausnehmen: in den Rucksack (sonst bleibt er im Korb), Fangbuch und Erfahrung. */
export function korbLeeren(s, o, r = Math.random) {
  const erg = L.neuesErgebnis();
  if (!o.fang) return erg;
  const id = o.fang;
  if (!ITEMS[id]) { o.fang = null; return erg; }
  if (L.platzFuer(s, { id, n: 1 }) < 1) { erg.grund = 'Dein Rucksack ist voll.'; return erg; }
  L.hinzufuegen(s, { id, n: 1 });
  erg.items.push({ id, n: 1 });
  erg.ok = true;
  o.fang = null;
  if (ITEMS[id].kat === 'krebs' || ITEMS[id].krebs || korbFaenge().some((k) => k.id === id)) fangBuchen(s, id, korbLaenge(id, r));
  L.xpGeben(s, 'angeln', KREBSKORB.xp, erg);
  return erg;
}

/** Einen Köder aus dem Platz `idx` in den Korb legen. */
export function korbKoedern(s, o, idx) {
  const erg = L.neuesErgebnis();
  const slot = s.spieler.inv[idx];
  if (!slot || !ITEMS[slot.id]?.koeder) { erg.grund = 'Halte einen Köder in der Hand und leg ihn hinein.'; return erg; }
  if (o.koeder) { erg.grund = 'Im Korb liegt schon ein Köder. Morgen früh schauen, was drin ist!'; return erg; }
  o.koeder = slot.id;
  L.entfernenAusSlot(s, idx, 1);
  erg.ok = true;
  erg.text = `${ITEMS[o.koeder].name} hineingelegt. Über Nacht kommt etwas in den Korb.`;
  return erg;
}

/** Aktionstaste oder Benutzen am Korb: erst leeren, dann ködern, sonst ein freundlicher Hinweis. */
export function korbBenutzen(s, o, idx) {
  if (o.fang) return korbLeeren(s, o);
  if (!o.koeder) return korbKoedern(s, o, idx);
  const erg = L.neuesErgebnis();
  erg.grund = 'Der Korb ist beködert. Morgen früh sitzt etwas drin.';
  return erg;
}

/** Aufstellen nur direkt ins Wasser, auf jeder Karte. */
function platz({ ort, x, y }) {
  if (!istWasser(ort.def, x, y)) return 'Der Krebskorb gehört ins Wasser. Stell dich ans Ufer und schau aufs Wasser.';
  if (ort.welt.objekte[L.k(x, y)]) return 'Hier steht schon etwas.';
  return true;
}

objektTyp('krebskorb', {
  blockiert: true,
  axt: L.aufheben,
  spitzhacke: L.aufheben,
  platz,
  anlegen(o) { o.koeder = null; o.fang = null; },
  nichtLeer: (o) => (o.fang ? 'Im Korb sitzt noch etwas. Erst herausnehmen!' : null),
  nacht({ s, ort, x, y, o, r }) {
    if (!o.koeder || o.fang) return;
    o.fang = korbFang(s, wasserArt(ort.def, x, y), r);
    o.koeder = null;
  },
  interagieren({ s, o, idx }) { korbZeigen(korbBenutzen(s, o, idx)); },
  einlegen({ s, o, idx }) { korbZeigen(korbBenutzen(s, o, idx)); },
  hinweis({ s, o }) {
    if (o.fang) return 'Leeren';
    if (o.koeder) return '';
    return ITEMS[s.spieler.inv[s.spieler.wahl]?.id]?.koeder ? 'Ködern' : 'Köder fehlt';
  },
});

function korbZeigen(erg) {
  if (erg.ok) ton(erg.items.length ? 'fang' : 'platsch');
  ergebnisZeigen(erg);
}
