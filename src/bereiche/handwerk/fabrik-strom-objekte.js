// Bereich „handwerk" – Fabrik Stufe 2: die Objekte des Stromnetzes (Strommast, Biomasse-Brenner, Kohlekraftwerk,
// Wasserrad), das Kabel-Werkzeug, das Handy als Gegenstand, die Strom-Zeile im Info-Fenster der Maschinen, das
// Starterpaket und der Übergang für alte Stände.
//
// Übergang (entschieden): Ab Stufe 2 brauchen Bohrer und alle anderen Maschinen Strom. Damit nichts schlagartig stehen
// bleibt, laufen Maschinen ohne Netz noch STROM.uebergangTage (7) Tage mit „Übergangsstrom aus dem Dorf" – gezählt ab dem
// ersten Laden mit Stufe 2 (alte Stände) bzw. ab Spielbeginn (s.fabrik.strom.frist). Sobald es die erste Maschine mit
// Strombedarf gibt, liegt einmal ein Starterpaket im Paketfach des Handys (Biomasse-Brenner, 2 Strommasten, 30 Kabel,
// 60 Holz), dazu ein Brief von Bruno. Maschinen in einem Netz folgen immer dem Netz (auch in der Übergangszeit).

import { ITEMS, objektTyp, werkzeugArt, brief } from '../../daten.js';
import * as L from '../../logik.js';
import { karteHolen } from '../../karten.js';
import { system } from '../../system.js';
import { S, ton, fenster, meldung, ergebnisZeigen } from '../../spiel.js';
import { STROM, GENERATOREN, STARTER, bedarfVon } from './fabrik-strom-daten.js';
import { fabrikAenderung } from './fabrik-sim.js';
import { platzPruefen, uhrStarten, BAU_TYPEN, blickR, befuellen, fabrikAufheben, fabrikBeimAufheben } from './fabrik-objekte.js';
import { fabrikInfoZeile } from './fabrik-info.js';
import {
  stromZustand, stromNetze, anschlussStatus, kabelVerbinden, kabelPruefen, kabelAlleLoesen, stromErsterVerbraucher, stromStand, mw,
  uebergang, uebergangRest,
} from './fabrik-strom.js';
import { uferPlatz, teilAufheben } from './fabrik-rohre.js';
import { paketDazu, paketListe } from './fabrik-handy.js';

// ─── Kabel-Werkzeug ─────────────────────────────────────────────────────────

let kabelStart = null; // { s, karte, kk }: gewählter Anfang eines Kabels (nur Laufzeit, gehört zu einem Spielstand)
/** Gewählter Kabelanfang ({ karte, kk } oder null) im Spielstand s (Standard: der laufende), für Vorschau und Hinweis. */
export const kabelAnfang = (s = S.s) => (kabelStart && kabelStart.s === s ? kabelStart : null);
export const kabelAbbrechen = () => { kabelStart = null; };

const anschlussName = (o) => (o.t === 'strommast' ? 'Strommast' : GENERATOREN[o.t]?.name ?? ITEMS[o.t]?.name ?? 'Anschluss');

/** Anschluss am Feld (x, y) (auch auf dem Teil eines großen Objekts) oder null. */
function anschlussAn(s, ort, x, y) {
  const h = L.hauptVon(ort, x, y);
  const n = h.o ? stromNetze(s, ort).knoten.get(h.kk) : null;
  return n ? { h, n } : null;
}

/**
 * Kabel-Werkzeug auf das Feld (x, y): erster Anschluss = Anfang, zweiter = Kabel verlegen. Derselbe Anschluss noch einmal
 * bricht ab (ebenso ein Werkzeugwechsel). Ein Feld ohne Anschluss (leer, Band …) und jeder Fehler (zu weit, belegt, zu wenig
 * Kabel) lassen den Anfang stehen. Ergebnis { ok, start, text } oder { grund }.
 */
export function kabelWaehlen(s, ort, x, y) {
  const a = anschlussAn(s, ort, x, y);
  const start = kabelAnfang(s);
  if (!a) {
    if (start) return { grund: 'Hier ist kein Anschluss. Das Kabel endet an einem Strommast, Generator oder einer Maschine mit Strombedarf.' };
    return { grund: 'Ein Kabel verbindet Strommasten, Generatoren und Maschinen mit Strombedarf. Benutze es auf einem davon.' };
  }
  const { h, n } = a;
  if (!start || start.karte !== ort.def.id) {
    if (n.kabel.length >= n.max) return { grund: `${anschlussName(h.o)}: alle ${n.max} ${n.max === 1 ? 'Anschluss ist' : 'Anschlüsse sind'} belegt.` };
    kabelStart = { s, karte: ort.def.id, kk: h.kk };
    return { ok: true, start: true, text: `Kabelanfang: ${anschlussName(h.o)}. Jetzt das Ziel antippen oder benutzen (höchstens ${STROM.kabelReichweite} Felder).` };
  }
  if (start.kk === h.kk) { kabelStart = null; return { text: 'Kabel abgebrochen.' }; }
  const erg = kabelVerbinden(s, ort, start.kk, h.kk);
  if (erg.ok) kabelStart = null;
  return erg;
}

/** Ergebnis des Kabel-Werkzeugs zeigen (Meldung und Ton). */
function kabelZeigen(r) {
  if (r.grund) { meldung(r.grund, 'warn'); ton('dumpf'); return; }
  ton(r.start ? 'menue' : r.ok ? 'truhe' : 'menue');
  if (r.text) meldung(r.text, r.ok && !r.start ? 'gut' : undefined);
}

werkzeugArt('handwerk_kabel', {
  benutzen(c) { kabelZeigen(kabelWaehlen(c.s, c.ort, c.x, c.y)); },
  anzeige: (s) => (kabelAnfang(s) ? 'Anfang gewählt – Ziel antippen oder benutzen' : 'Anschluss antippen oder benutzen'),
});

/** Hinweis (und Aktion-Knopf auf Touch), solange das Stromkabel in der Hand ist. */
function kabelHinweis({ s, ort, x, y, slot }) {
  if (slot?.id !== 'stromkabel' || !s || !ort) return undefined;
  const a = anschlussAn(s, ort, x, y);
  const start = kabelAnfang(s);
  if (!a) return start ? 'Kabel: Ziel wählen' : undefined;
  if (!start) return `Kabel: Anfang (${anschlussName(a.h.o)})`;
  if (start.kk === a.h.kk) return 'Kabel abbrechen';
  const p = kabelPruefen(s, ort, start.kk, a.h.kk);
  return p.ok ? `Kabel verlegen (${p.kosten} Kabel)` : `Kabel: ${p.laenge > STROM.kabelReichweite ? 'zu weit' : 'geht nicht'}`;
}

// ─── Handy als Gegenstand ───────────────────────────────────────────────────

/** Öffnet das Handy (Menü, Reiter Handy). */
export function handyOeffnen() {
  ton('menue');
  fenster('menue', { reiter: 'handy', auswahl: null, aufgenommen: null });
}
werkzeugArt('handwerk_handy', { benutzen: handyOeffnen, anzeige: () => 'Benutzen öffnet das Handy' });

/** Platz des Handys im Rucksack: der letzte der Werkzeugleiste (12 Plätze). */
const HANDY_PLATZ = 11;

/** Das Handy ausgeben (einmal je Stand): in den Rucksack, sonst ins Paketfach (mit Brief). */
export function handyGeben(s) {
  const f = s.fabrik;
  if (f.handy) return false;
  f.handy = 1;
  if (L.hat(s, 'handy')) return false;
  // auf den letzten Platz der Leiste (Taste ´), damit es die übrigen Plätze nicht verschiebt; sonst der erste freie
  const inv = s.spieler.inv;
  if (inv.length > HANDY_PLATZ && !inv[HANDY_PLATZ]) inv[HANDY_PLATZ] = { id: 'handy', n: 1 };
  else if (L.hinzufuegen(s, { id: 'handy', n: 1 }) > 0) { paketDazu(s, [{ id: 'handy', n: 1 }]); f.handyPost = 1; }
  return true;
}

// ─── Starterpaket ───────────────────────────────────────────────────────────

export function starterGeben(s) {
  const st = stromZustand(s);
  if (st.starter) return false;
  st.starter = 1;
  paketDazu(s, STARTER);
  if (S.s === s) meldung('Ein Paket ist da: Biomasse-Brenner, Strommasten und Kabel. Handy › Paketfach.', 'gut');
  return true;
}
stromErsterVerbraucher(starterGeben);

/** Gibt es irgendwo einen Verbraucher (Maschine mit Strombedarf)? */
export function hatVerbraucher(s) {
  for (const w of Object.values(s.welt || {})) for (const o of Object.values(w?.objekte || {})) if (bedarfVon(o?.t) > 0) return true;
  return false;
}

brief('handwerk_strom_starter', {
  von: 'Bruno',
  wann: (s) => s.fabrik?.strom?.starter === 1,
  text: 'Hallo {name},\n\nhab gehört, du baust Maschinen. Die laufen nicht von allein – die brauchen Strom.\n\nIm Paketfach deines Handys liegt ein Biomasse-Brenner, zwei Strommasten und Kabel. Brenner aufstellen, Holz rein, Kabel in die Hand und erst auf den Brenner, dann auf einen Mast, dann vom Mast zur Maschine. Ein Kabel reicht höchstens zehn Felder.\n\nZieht das Netz mehr, als der Brenner hergibt, fliegt die Sicherung. Dann am Brenner oder Mast wieder einschalten.\n\nEine Woche lang hängen deine Maschinen noch am Dorfnetz. Danach nicht mehr.\n\nBruno',
});
brief('handwerk_handy', {
  von: 'Klarwasser Fabrikbedarf',
  wann: (s) => s.fabrik?.handyPost === 1,
  text: 'Liebe(r) {name},\n\nunser neues Handy für dich liegt im Paketfach – dein Rucksack war leider voll. Du erreichst es jederzeit über Menü › Handy und holst es dort ab.\n\nIm Handy bestellst du Fabrikteile und Vorkommen, Tag und Nacht, Lieferung sofort.\n\nDein Fabrikbedarf',
});

// ─── Netzfenster öffnen, Generatoren befüllen ───────────────────────────────

const netzFenster = ({ x, y }) => { ton('menue'); fenster('handwerk_strom', { x, y }); };

/** Brennstoff in der Hand, der in diesen Generator passt? */
function brennstoffInHand(s, o) {
  const hand = s?.spieler?.inv[s.spieler.wahl];
  return hand && !hand.q && !hand.von && GENERATOREN[o.t]?.brennstoffe?.[hand.id] ? hand : null;
}
export const brennstoffText = (t) => Object.entries(GENERATOREN[t]?.brennstoffe || {}).map(([id, mj]) => `${ITEMS[id]?.name ?? id} (${mj} MJ)`).join(', ');

function generatorEinlegen({ s, o }) {
  const hand = s.spieler.inv[s.spieler.wahl];
  if (!brennstoffInHand(s, o)) {
    const g = GENERATOREN[o.t];
    meldung(g.wasser
      ? `${hand ? `${ITEMS[hand.id]?.name ?? 'Das'} brennt hier nicht. ` : ''}Das Kohlekraftwerk braucht Kohle (vom Band oder aus der Hand) und Wasser über Rohrleitungen.`
      : `${hand ? `${ITEMS[hand.id]?.name ?? 'Das'} brennt hier nicht. ` : ''}Brennstoff: ${brennstoffText(o.t)}.`, 'warn');
    return;
  }
  const erg = befuellen(s, o, s.spieler.wahl);
  if (erg.ok) ton('pop');
  ergebnisZeigen(erg);
}
function generatorBedienen(c) {
  if (brennstoffInHand(c.s, c.o)) generatorEinlegen(c);
  else netzFenster(c);
}

// ─── Objekttypen ────────────────────────────────────────────────────────────

const statusKurz = (s, ort, x, y) => (s && ort ? anschlussStatus(s, ort, L.k(x, y)).kurz : '');

objektTyp('strommast', {
  blockiert: true,
  axt: teilAufheben,
  spitzhacke: teilAufheben,
  platz: (c) => platzPruefen(c, 1, 1, false),
  anlegen() { uhrStarten(); fabrikAenderung(); },
  interagieren: netzFenster,
  hinweis: ({ s, ort, x, y }) => `Stromnetz ansehen (${statusKurz(s, ort, x, y)})`,
});

for (const id of ['biomassebrenner', 'kohlekraftwerk']) {
  const g = GENERATOREN[id];
  objektTyp(id, {
    blockiert: true,
    flaeche: g.flaeche,
    axt: fabrikAufheben,
    spitzhacke: fabrikAufheben,
    leistung: 0, // verbraucht nichts
    erzeugt: g.leistung,
    platz: (c) => platzPruefen(c, g.flaeche[0], g.flaeche[1], false),
    anlegen(o) {
      o.r = blickR();
      o.ein = {};
      o.aus = {};
      o.f = 0;
      if (g.wasser) o.wa = 0;
      uhrStarten();
      fabrikAenderung();
    },
    interagieren: generatorBedienen,
    einlegen: generatorEinlegen,
    hinweis({ s, o }) {
      const hand = brennstoffInHand(s, o);
      return hand ? `${ITEMS[hand.id].name} einlegen` : `${g.name} ansehen`;
    },
  });
}

objektTyp('wasserrad', {
  blockiert: true,
  axt: teilAufheben,
  spitzhacke: teilAufheben,
  erzeugt: GENERATOREN.wasserrad.leistung,
  platz: (c) => uferPlatz(c, 'Das Wasserrad'),
  anlegen(o) { o.st = 'x'; uhrStarten(); fabrikAenderung(); },
  interagieren: netzFenster,
  hinweis: ({ s, ort, x, y }) => `Wasserrad ansehen (${statusKurz(s, ort, x, y)})`,
});

BAU_TYPEN.add('strommast');
BAU_TYPEN.add('wasserrad');

/** Beim Aufheben einer Maschine oder eines Generators lösen sich seine Kabel (sie kommen zurück). */
fabrikBeimAufheben((c) => { if (c.s.fabrik?.strom) kabelAlleLoesen(c.s, c.ort, L.k(c.x, c.y), c.erg); });

// ─── Info-Zeile der Maschinen ───────────────────────────────────────────────

/** Karte und Feld eines Objekts suchen (zuerst die aktuelle Karte). */
export function findeObjekt(s, o) {
  const suche = (id, welt) => {
    for (const kk in welt?.objekte || {}) if (welt.objekte[kk] === o) return kk;
    return null;
  };
  if (S.s === s && S.ort) { const kk = suche(S.ort.def.id, S.ort.welt); if (kk) return { ort: S.ort, kk }; }
  for (const [id, welt] of Object.entries(s.welt || {})) {
    const kk = suche(id, welt);
    if (!kk) continue;
    const def = karteHolen(id, s);
    if (def) return { ort: { def, welt }, kk };
  }
  return null;
}

fabrikInfoZeile((o, s) => {
  const mwBedarf = bedarfVon(o.t);
  if (!(mwBedarf > 0) || !s?.fabrik?.strom) return null;
  const wo = findeObjekt(s, o);
  if (!wo) return ['Strom', `${mw(mwBedarf)} MW`];
  const a = anschlussStatus(s, wo.ort, wo.kk);
  return ['Strom', `${mw(mwBedarf)} MW · ${a.text}`];
});

// ─── System: Zustand, alte Stände, Morgenbericht ────────────────────────────

/** Maschinen ohne Kabel auf allen Karten (für die Warnung vor dem Ende des Übergangs). */
export function ohneNetz(s) {
  let n = 0;
  for (const [id, welt] of Object.entries(s.welt || {})) {
    if (!Object.values(welt?.objekte || {}).some((o) => bedarfVon(o?.t) > 0)) continue;
    const def = karteHolen(id, s);
    if (def) n += stromNetze(s, { def, welt }).ohne.length;
  }
  return n;
}

system({
  name: 'handwerk-strom',
  ergaenzen(s) {
    kabelStart = null;
    stromZustand(s);
    paketListe(s);
    const alt = s.stats?.tage > 1 || s.spieler?.inv?.some(Boolean);
    if (alt) handyGeben(s);
    if (!s.fabrik.strom.starter && hatVerbraucher(s)) starterGeben(s);
  },
  neuesSpiel(s) {
    kabelStart = null;
    stromZustand(s);
    handyGeben(s);
  },
  /** Auf einer anderen Karte gilt ein gewählter Kabelanfang nicht mehr. */
  karteBetreten(ort) { if (kabelStart && kabelStart.karte !== ort?.def?.id) kabelStart = null; },
  /** Werkzeugwechsel (oder ein anderer Spielstand) bricht ein angefangenes Kabel ab. */
  update() {
    if (!kabelStart) return;
    const s = S.s;
    if (!s || kabelStart.s !== s || s.spieler.inv[s.spieler.wahl]?.id !== 'stromkabel') kabelStart = null;
  },
  /** Mit dem Stromkabel in der Hand wirkt die Aktion (auch Antippen) auf einen Anschluss wie Benutzen – kein Netzfenster. */
  interagieren(ctx) {
    if (ctx.slot?.id !== 'stromkabel' || !ctx.s || !ctx.ort) return undefined;
    if (!anschlussAn(ctx.s, ctx.ort, ctx.x, ctx.y) && !kabelAnfang(ctx.s)) return undefined;
    kabelZeigen(kabelWaehlen(ctx.s, ctx.ort, ctx.x, ctx.y));
    return true;
  },
  hinweis: kabelHinweis,
  /** Nach dem Nachholen der Nacht (das System der Fabrik läuft vorher): geflogene Sicherungen und das Ende des Übergangs. */
  vorVerkauf(s, bericht) {
    if (!s.fabrik?.strom || !bericht) return;
    for (const [id, welt] of Object.entries(s.welt || {})) {
      if (!s.fabrik.strom.kabel[id]?.length) continue;
      const def = karteHolen(id, s);
      if (!def) continue;
      const c = stromStand(s, { def, welt });
      for (const n of c.netze) {
        if (n.info?.status !== 'sicherung') continue;
        const g = n.gens.find((x) => x.o.flg)?.o.flg;
        bericht.meldungen.push(`Stromnetz (${def.name}): Die Sicherung ist geflogen${g ? ` – ${mw(g[0])} MW Bedarf, aber nur ${mw(g[1])} MW Leistung` : ''}. Die Fabrik steht, bis du sie wieder einschaltest.`);
        break;
      }
    }
    if (uebergang(s) && hatVerbraucher(s)) {
      const morgen = uebergangRest(s) - 1; // Resttage ab dem neuen Morgen
      const n = morgen <= 2 ? ohneNetz(s) : 0;
      const masch = `${n} ${n === 1 ? 'Maschine hat' : 'Maschinen haben'} noch kein Stromnetz`;
      if (morgen === 2 && n) bericht.meldungen.push(`Noch 2 Tage Übergangsstrom aus dem Dorf: ${masch}.`);
      else if (morgen === 1 && n) bericht.meldungen.push(`Heute ist der letzte Tag mit Übergangsstrom: ${masch} und stehen ab morgen still.`);
      else if (morgen === 0) bericht.meldungen.push('Ab heute gibt es keinen Übergangsstrom mehr: Maschinen ohne Stromnetz stehen still.');
    }
  },
});
