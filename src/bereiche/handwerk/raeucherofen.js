// Bereich „handwerk": der Räucherofen. Fisch in der Hand, Aktionstaste auf den Ofen: der Stapel wandert
// ins Eingabe-Fach (höchstens RAEUCHER_PRO_TAG Fische je Ofen). Über Nacht wird daraus „Geräucherter
// <Fisch>" (Ausgabe-Fach); mit der Aktionstaste ohne Fisch holt man die Ware ab. Preis: das Zehnfache
// des frischen Fischs (Item-Feld `preisVielfaches`, siehe L.preisVon).
// Zustand im Objekt: o.ein = [{ id, q?, n }] (Fisch), o.aus = [{ id: 'geraeuchert', von, q?, n }] (fertig).
// Welche Dinge Fisch sind, sagt die Kategorie 'fisch' (Bereich angeln); es gibt keinen Import von dort.

import { ITEMS, item, rezept, objektTyp } from '../../daten.js';
import * as L from '../../logik.js';
import { ton, ergebnisZeigen } from '../../spiel.js';

/** Fische je Ofen und Tag (Eingabe-Fach). */
export const RAEUCHER_PRO_TAG = 200;
/** Geräucherter Fisch ist so viel mal so viel wert wie der frische (bei gleicher Qualität). */
export const RAEUCHER_FAKTOR = 10;

item('raeucherofen', {
  name: 'Räucherofen', kat: 'platz', bild: { art: 'raeucherofen' }, aufstellbar: true,
  text: `Räuchert bis zu ${RAEUCHER_PRO_TAG} Fische am Tag. Über Nacht werden sie zu Geräuchertem. Leer mit der Axt wieder einsammeln.`,
});
item('geraeuchert', {
  name: 'Geräucherter Fisch', kat: 'artisan', bild: { art: 'geraeuchert', f: '#a88a5a' },
  preisVielfaches: RAEUCHER_FAKTOR,
  wert: (slot) => (slot.von && ITEMS[slot.von] ? ITEMS[slot.von].preis * RAEUCHER_FAKTOR : 0),
  energie: (slot) => (slot.von && ITEMS[slot.von] ? ITEMS[slot.von].energie || 0 : 0),
  text: 'Zehnmal so viel wert wie frisch. Aus dem Räucherofen.',
});
rezept('raeucherofen', { zutaten: { holz: 1, kohle: 1 } });

const istFisch = (slot) => !!slot && ITEMS[slot.id]?.kat === 'fisch';
const summe = (liste) => (liste || []).reduce((n, x) => n + x.n, 0);
const gleichSlot = (a, b) => a.id === b.id && (a.q || 0) === (b.q || 0) && (a.von || null) === (b.von || null);
const fische = (n) => `${n} ${n === 1 ? 'Fisch' : 'Fische'}`;

/** Stapel in ein Fach legen (gleiche Sorte, Qualität und Herkunft werden zusammengezählt). */
function ablegen(fach, slot) {
  const x = fach.find((y) => gleichSlot(y, slot));
  if (x) x.n += slot.n;
  else fach.push(L.slotKopie(slot, slot.n));
}

/** Fehlende Fächer anlegen (beschädigte oder von Hand gebaute Stände); gibt das Objekt zurück. */
function faecher(o) {
  if (!Array.isArray(o.ein)) o.ein = [];
  if (!Array.isArray(o.aus)) o.aus = [];
  return o;
}

/** Fertige Ware herausnehmen, soweit sie in den Rucksack passt (Qualitäten getrennt). Der Rest bleibt im Ofen. */
function abholen(s, o) {
  const erg = L.neuesErgebnis();
  const sorten = {};
  let genommen = 0;
  let blieb = false;
  for (const w of o.aus) {
    const n = Math.min(w.n, L.platzFuer(s, w));
    if (n < w.n) blieb = true;
    if (n <= 0) continue;
    L.hinzufuegen(s, L.slotKopie(w, n));
    erg.items.push(L.slotKopie(w, n));
    w.n -= n;
    genommen += n;
    sorten[w.von] = (sorten[w.von] || 0) + n;
  }
  o.aus = o.aus.filter((w) => w.n > 0);
  if (!genommen) return { grund: 'Dein Rucksack ist voll.', items: [] };
  erg.ok = true;
  const namen = Object.keys(sorten);
  const name = ITEMS[namen[0]]?.name ?? 'Fisch';
  erg.text = namen.length === 1
    ? (genommen === 1 ? `Du nimmst 1× ${ITEMS.geraeuchert.name} (${name}).` : `Du nimmst ${genommen} geräucherte ${name}.`)
    : `Du nimmst ${genommen} geräucherte Fische.`;
  if (blieb) erg.text += ' Rucksack voll – der Rest bleibt im Ofen.';
  return erg;
}

/**
 * Aktion auf den Ofen. Fisch in der Hand und Platz im Eingabe-Fach: einlegen. Ist das Fach voll (oder
 * ist kein Fisch in der Hand), wird abgeholt, falls etwas fertig ist; sonst gibt es einen Hinweis.
 * `idx`: Rucksackplatz der Hand.
 */
export function ofenBenutzen(s, ort, x, y, idx) {
  const o = faecher(ort.welt.objekte[L.k(x, y)]);
  const slot = idx != null ? s.spieler.inv[idx] : null;
  const drin = summe(o.ein);
  const platz = RAEUCHER_PRO_TAG - drin;
  if (istFisch(slot) && platz > 0) {
    const n = Math.min(slot.n, platz);
    const rest = slot.n - n;
    ablegen(o.ein, L.slotKopie(slot, n));
    L.entfernenAusSlot(s, idx, n);
    const erg = L.neuesErgebnis();
    erg.ok = true;
    erg.text = `${fische(n)} eingelegt (${drin + n} von ${RAEUCHER_PRO_TAG}).`;
    if (rest > 0) erg.text += ` ${rest} ${rest === 1 ? 'bleibt' : 'bleiben'} in der Hand.`;
    return erg;
  }
  if (summe(o.aus) > 0) return abholen(s, o);
  if (istFisch(slot)) return { grund: `Der Ofen ist voll (${RAEUCHER_PRO_TAG} Fische).`, items: [] };
  if (slot) return { grund: 'Das ist kein Fisch. Halte Fisch in der Hand und benutze den Ofen damit.', items: [] };
  if (drin > 0) return { grund: `Der Ofen räuchert noch (${fische(drin)}). Morgen früh ist alles fertig.`, items: [] };
  return { grund: 'Halte Fisch in der Hand und benutze den Räucherofen damit.', items: [] };
}

function benutzen({ s, ort, x, y }) {
  const erg = ofenBenutzen(s, ort, x, y, s.spieler.wahl);
  if (erg.ok) ton(erg.items.length ? 'pop' : 'glas');
  ergebnisZeigen(erg);
}

/** Über Nacht: alles Eingelegte wird zu Geräuchertem (gleiche Stückzahl und Qualität), das Eingabe-Fach ist leer. */
export function ofenNacht(o) {
  faecher(o);
  for (const f of o.ein) {
    if (f.n > 0) ablegen(o.aus, { id: 'geraeuchert', von: f.id, ...(f.q ? { q: f.q } : {}), n: f.n });
  }
  o.ein = [];
}

objektTyp('raeucherofen', {
  blockiert: true, axt: L.aufheben, spitzhacke: L.aufheben,
  anlegen(o) { o.ein = []; o.aus = []; },
  nichtLeer: (o) => (summe(o.ein) || summe(o.aus) ? 'Im Räucherofen sind noch Fische.' : null),
  interagieren: benutzen,
  einlegen: benutzen,
  nacht({ o }) { ofenNacht(o); },
  hinweis({ s, o }) {
    faecher(o);
    const drin = summe(o.ein);
    const fertig = summe(o.aus);
    if (istFisch(s.spieler.inv[s.spieler.wahl]) && drin < RAEUCHER_PRO_TAG) return 'Fisch räuchern';
    if (fertig > 0) return `Geräuchertes holen (${fertig})`;
    if (drin > 0) return `Räuchert … (${drin})`;
    return 'Fisch räuchern';
  },
});
