// Bereich „angeln": die Angel, Fische und Köder, Lenes Laden im Fischladen am Strand und
// Lenes Geschenk am zweiten Tag. Der Ablauf (Auswerfen, Warten, Biss, Einholen) steht in
// src/angeln.js, das in Welle 1 diesem Bereich gehört; er läuft über den Hook `eingabe`.
// Angeln wie in Minecraft: „Benutzen" wirft aus, „Benutzen" im richtigen Moment holt den Fang ein.

import { item, kategorie, fisch, laden, bedingung, werkzeugArt, OBJEKT_TYPEN, ITEMS } from '../../daten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { S, meldung, ton, partikel, ergebnisZeigen, spielerFeld, feldUnterZeiger } from '../../spiel.js';
import { auswerfen, angelnUpdate, angelnHinweis, wurfZiel, VORSCHAU } from '../../angeln.js';

kategorie('fisch', 'Fisch');
kategorie('koeder', 'Köder');

// `rute` sind die Zahlen der Angel: Faktor auf die Wartezeit, Zusatz zum Einhol-Fenster (s), Zusatz
// zur Schatzchance. Eine bessere Rute ist ein weiteres Item mit `werkzeug: 'angel'` und anderen Zahlen.
// Köder: `koeder: { biss }` ist der Faktor auf die Wartezeit (dazu optional `fenster`, `schatz`).
item('angel', {
  name: 'Bambusangel', kat: 'werkzeug', bild: { art: 'angel' }, werkzeug: 'angel',
  rute: { warten: 1, fenster: 0, schatz: 0 },
  text: 'Am Wasser „Benutzen": Schnur auswerfen. Taucht der Schwimmer ab, sofort einholen!',
});
werkzeugArt('angel', {
  benutzen() { auswerfen(S, fx, { zeiger: zeiger() }); },
});

item('koeder', {
  name: 'Köder', kat: 'koeder', preis: 1, bild: { art: 'koeder' }, koeder: { biss: 0.5 },
  text: 'Wird beim Auswerfen verbraucht. Dafür beißen die Fische doppelt so schnell.',
});

// ─── Fische ─────────────────────────────────────────────────────────────────
// seltenheit 0–100 (seltene Fische beißen seltener, geben aber mehr Erfahrung) · laenge [von, bis] in cm
// (fürs Fangbuch) · orte: Gewässerarten · zeit: [von, bis) als Uhrzeit
// Der Karpfen beißt vorerst in allen Gewässerarten aus dem Punkte-Vertrag (Platzhalter für see,
// waldsee, geheimteich, mine), damit jede Karte in jeder Jahreszeit einen Fisch hat.

const ALLE = ['fruehling', 'sommer', 'herbst', 'winter'];
function f(id, name, preis, [seltenheit, laenge, orte, jz, zeit, wetter], bild) {
  fisch(id, { name, preis, bild: { art: 'fisch', ...bild }, seltenheit, laenge, orte, jz, zeit, wetter });
}
f('karpfen', 'Karpfen', 30, [15, [30, 75], ['teich', 'fluss', 'see', 'waldsee', 'geheimteich', 'mine'], ALLE, [600, 2600]], { f: '#a89a5a', f2: '#e0d8a0' });
f('sonnenbarsch', 'Sonnenbarsch', 30, [30, [10, 25], ['fluss', 'teich'], ['fruehling', 'sommer'], [600, 1900], 'sonne'], { f: '#e8b83a', f2: '#7ac0d8', form: 'hoch' });
f('wels', 'Wels', 200, [75, [60, 140], ['fluss', 'teich'], ['fruehling', 'herbst'], [600, 2400], 'regen'], { f: '#6a6a5a', f2: '#c8c0a0', form: 'wels' });
f('doebel', 'Döbel', 50, [35, [20, 45], ['fluss', 'teich'], ALLE, [600, 2600]], { f: '#8aa0a8', f2: '#e0e8e8' });
f('forelle', 'Regenbogenforelle', 65, [45, [25, 55], ['fluss'], ['sommer'], [600, 1900], 'sonne'], { f: '#8ab06a', f2: '#e88aa0' });
f('lachs', 'Lachs', 75, [50, [50, 90], ['fluss'], ['herbst'], [600, 1900]], { f: '#c86a5a', f2: '#f0b8a0' });
f('hecht', 'Hecht', 100, [60, [45, 110], ['fluss', 'teich'], ['sommer', 'winter'], [600, 2600]], { f: '#6a8a4a', f2: '#d8e0a0', form: 'lang' });
f('zander', 'Zander', 105, [45, [40, 80], ['fluss', 'teich'], ['herbst', 'winter'], [1200, 2600], 'regen'], { f: '#a8a070', f2: '#e8e0c0', form: 'lang' });
f('barsch', 'Flussbarsch', 55, [35, [15, 35], ['fluss', 'teich'], ['winter'], [600, 2600]], { f: '#8ab04a', f2: '#e8a050', form: 'hoch' });
f('brasse', 'Brasse', 45, [35, [25, 55], ['fluss'], ALLE, [1800, 2600]], { f: '#a8a8a0', f2: '#e0e0d8', form: 'hoch' });
f('sardine', 'Sardine', 40, [30, [12, 22], ['meer'], ['fruehling', 'herbst', 'winter'], [600, 1900]], { f: '#7aa8c8', f2: '#e8f0f8', form: 'klein' });
f('hering', 'Hering', 30, [25, [18, 32], ['meer'], ALLE, [600, 2600]], { f: '#6a8ab0', f2: '#d8e0f0', form: 'klein' });
f('heilbutt', 'Heilbutt', 80, [50, [50, 120], ['meer'], ['fruehling', 'sommer', 'winter'], [600, 2600]], { f: '#9a8a6a', f2: '#e8e0d0', form: 'flach' });
f('thunfisch', 'Thunfisch', 100, [70, [100, 200], ['meer'], ['sommer', 'winter'], [600, 1900]], { f: '#3a5a8a', f2: '#c8d8e8' });
f('rotbarbe', 'Rotbarbe', 75, [55, [15, 30], ['meer'], ['sommer', 'winter'], [600, 1900]], { f: '#e0605a', f2: '#f8d0c0' });
f('aal', 'Aal', 85, [70, [50, 100], ['meer'], ['fruehling', 'herbst'], [1600, 2600], 'regen'], { f: '#4a5a3a', f2: '#a8b080', form: 'aal' });
f('tintenfisch', 'Tintenfisch', 80, [75, [20, 60], ['meer'], ['winter'], [1800, 2600]], { f: '#e8a0b0', f2: '#f8d8e0', form: 'tinte' });
f('kugelfisch', 'Kugelfisch', 200, [80, [15, 40], ['meer'], ['sommer'], [1200, 1600], 'sonne'], { f: '#e8d06a', f2: '#f8f0d0', form: 'kugel' });

// ─── Lenes Laden im Fischladen ──────────────────────────────────────────────

bedingung('keineAngel', (s) => !L.hat(s, 'angel'));

laden('fischer', {
  name: 'Lenes Fischladen', npc: 'lene', ort: { karte: 'fischladen', punkt: 'theke' },
  kauft: ['fisch', 'muell'],
  ware: [
    { id: 'koeder', preis: 5 },
    { id: 'angel', preis: 500, bedingung: 'keineAngel' },
  ],
});

// ─── Anbindung an die Spielschleife ─────────────────────────────────────────

/** Der Eingabezustand des letzten Bildes: daraus kommt das Mausfeld für den Wurf. */
let eingabe = null;
/** Das Feld unter dem Mauszeiger, nur bei Mausbedienung. */
const zeiger = () => (eingabe?.maus.aktiv ? feldUnterZeiger(eingabe.maus.x, eingabe.maus.y) : null);
/** Töne, Meldungen und Spritzer, die der Ablauf in angeln.js braucht. */
const fx = { ton, meldung, partikel, ergebnis: ergebnisZeigen, feld: spielerFeld, zeiger };

const istRute = (slot) => !!slot && ITEMS[slot.id]?.werkzeug === 'angel';

/** Wartet am Zielfeld etwas anderes auf die Aktionstaste (Person, Tür, Kiste, reifes Beet …)? */
function fremdesZiel({ s, ort, x, y, f, npc }) {
  if (npc) return true;
  const typ = OBJEKT_TYPEN[L.objektAn(s, ort, x, y)?.t];
  if (typ && (typ.interagieren || typ.aufnehmen || typ.hinweis)) return true;
  if (L.reif(ort.welt.felder[L.k(x, y)])) return true;
  if (L.dekoAn(s, ort.def, x, y)?.aktion || L.dekoAn(s, ort.def, f.x, f.y)?.aktion) return true;
  return !!L.gebaeudeAn(s, ort.def, x, y);
}

system({
  name: 'angeln',
  /** Das Fangbuch: s.angeln.gefangen[fischId] = { n, groesste (cm) } – für eine spätere Sammlungsseite. */
  ergaenzen(s) {
    s.angeln ??= {};
    s.angeln.gefangen ??= {};
  },
  /** Die Vorschau, wohin die Schnur fiele, solange die Angel in der Hand liegt. */
  update() {
    const slot = S.s.spieler.inv[S.s.spieler.wahl];
    const ziel = !S.angeln && !S.sp.aktion && istRute(slot) ? wurfZiel(S, zeiger()) : null;
    VORSCHAU.ziel = ziel && !ziel.grund ? ziel : null;
  },
  /** Solange geangelt wird, steuert der Ablauf in angeln.js die Eingaben. */
  eingabe({ E, dt }) {
    eingabe = E;
    if (!S.angeln) return undefined;
    return angelnUpdate(S, dt, E, fx) ? true : undefined;
  },
  /** Aktionstaste (E, Rechtsklick, „Aktion"): wirft aus, wenn dort nichts anderes zu tun ist. */
  interagieren(c) {
    if (!istRute(c.slot) || fremdesZiel(c) || wurfZiel(S, zeiger()).grund) return undefined;
    auswerfen(S, fx, { zeiger: zeiger() });
    return true;
  },
  hinweis(c) {
    if (S.angeln) return angelnHinweis(S);
    if (!istRute(c.slot) || fremdesZiel(c) || wurfZiel(S, zeiger()).grund) return undefined;
    return 'Auswerfen';
  },
  /** Lene schenkt ab dem zweiten Tag die alte Angel. */
  gespraech({ s, id, ort }) {
    if (id !== 'lene' || L.hat(s, 'angel') || s.flags.angelBekommen || L.tagNr(s.zeit) < 2) return undefined;
    const erg = { texte: [], items: [] };
    erg.texte.push(L.textErsetzen(s, 'Ah, du bist {name}! Hier – die alte Bambusangel meines Großvaters. Hat lange genug in der Ecke gestanden.'));
    erg.texte.push('Stell dich ans Ufer, schau aufs Wasser und wirf aus. Wenn der Schwimmer abtaucht: sofort einholen!');
    L.geben(s, ort, s.spieler.x, s.spieler.y, { id: 'angel', n: 1 }, erg);
    s.flags.angelBekommen = true;
    const st = s.npcs.lene;
    if (!st.gesprochen) { st.gesprochen = true; L.freundschaft(s, 'lene', 20); }
    return erg;
  },
});
