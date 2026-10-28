// Bereich „angeln": die Angel, Fische und Köder, Lenes Laden im Fischladen am Strand und
// Lenes Geschenk am zweiten Tag. Der Ablauf (Auswerfen, Warten, Biss, Einholen) steht in
// src/angeln.js, das in Welle 1 diesem Bereich gehört; er läuft über den Hook `eingabe`.
// Angeln wie in Minecraft: „Benutzen" wirft aus, „Benutzen" im richtigen Moment holt den Fang ein.

import { kategorie, laden, bedingung, werkzeugArt, OBJEKT_TYPEN, ITEMS } from '../../daten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { S, meldung, ton, partikel, ergebnisZeigen, spielerFeld, feldUnterZeiger } from '../../spiel.js';
import { auswerfen, angelnUpdate, angelnHinweis, wurfZiel, VORSCHAU } from '../../angeln.js';
import { RUTEN, KOEDER } from './ausruestung.js';
import './fische.js';
import './krebskorb.js';

kategorie('fisch', 'Fisch');
kategorie('koeder', 'Köder');

// Ruten und Köder (nur Zahlen, Tabelle in ausruestung.js), alle Fische (fische.js), Krebskorb samt
// Krebstieren und Müll (krebskorb.js). Die Rute benutzt der Ablauf in angeln.js.
werkzeugArt('angel', {
  benutzen() { auswerfen(S, fx, wurfOpt()); },
});

// ─── Lenes Laden im Fischladen ──────────────────────────────────────────────

bedingung('keineAngel', (s) => !L.hat(s, 'angel'));

laden('fischer', {
  name: 'Lenes Fischladen', npc: 'lene', ort: { karte: 'fischladen', punkt: 'theke' },
  kauft: ['fisch', 'muell', 'krebs'],
  ware: [
    { id: 'koeder', preis: 5, reihe: 10 },
    { id: 'angel', preis: 500, bedingung: 'keineAngel', reihe: 30 },
  ],
});

/** Ware ab Angelstufe: Ruten (nur, wenn man sie noch nicht hat), weitere Köder, der Krebskorb. */
function lenesWare(s) {
  const stufe = L.stufe(s, 'angeln');
  const ware = [];
  for (const k of KOEDER) if (k.id !== 'koeder' && stufe >= k.abStufe) ware.push({ id: k.id, preis: k.preis, reihe: 11 });
  for (const r of RUTEN) if (r.id !== 'angel' && stufe >= r.abStufe && !L.hat(s, r.id)) ware.push({ id: r.id, preis: r.preis, reihe: 31 });
  if (stufe >= 3) ware.push({ id: 'krebskorb', preis: 1500, reihe: 40 });
  return ware;
}

// ─── Anbindung an die Spielschleife ─────────────────────────────────────────

/** Der Eingabezustand des letzten Bildes: daraus kommt das Mausfeld für den Wurf. */
let eingabe = null;
/** Das Feld unter dem Mauszeiger, nur bei Mausbedienung. */
const zeiger = () => (eingabe?.maus.aktiv ? feldUnterZeiger(eingabe.maus.x, eingabe.maus.y) : null);
/** Töne, Meldungen und Spritzer, die der Ablauf in angeln.js braucht. */
/** Wurf-Optionen: Mausfeld und die Blickrichtung vom Bildanfang (Benutzen dreht die Figur sonst zum Zielfeld neben ihr, weg vom Wasser). */
const wurfOpt = () => ({ zeiger: zeiger(), blick: S.sp.blickVor });
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
  /** Das Fangbuch: s.angeln.gefangen[id] = { n, groesste (cm) } für Fische und Krebskorb-Fänge (Menüreiter „Fangbuch"). */
  ergaenzen(s) {
    s.angeln ??= {};
    s.angeln.gefangen ??= {};
  },
  ladenWare: (ladenId, s) => (ladenId === 'fischer' ? lenesWare(s) : undefined),
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
    if (S.angeln) return true; // im selben Bild schon ausgeworfen (Benutzen + Aktion): kein zweiter Wurf
    if (!istRute(c.slot) || fremdesZiel(c) || wurfZiel(S, zeiger(), S.sp.blickVor).grund) return undefined;
    auswerfen(S, fx, wurfOpt());
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
