// Bereich „handwerk" – Fabrik: die Objekttypen (Vorkommen, Förderband, Splitter, Zusammenführer, Erzbohrer,
// Schmelzer, Konstrukteur, Assembler, Lager), Aufstellen, Drehen, Aufheben ohne Verlust.
// Die Simulation (Bewegung, Takt) steht in fabrik-sim.js.

import { objektTyp } from '../../daten.js';
import * as L from '../../logik.js';
import { S, ton, fenster, meldung } from '../../spiel.js';
import { MASCHINEN, BAND, SPLITTER, MERGER, SORTEN, RICHTUNGEN, rVonBlick, reinName } from './fabrik-daten.js';
import { fabrikAenderung } from './fabrik-sim.js';

const ORTE = ['berg', 'wald', 'strand'];
/** Wo Fabrik und Vorkommen stehen dürfen: auf dem Hof, auf Karten mit `aufstellen`, am Berg, im Wald, am Strand. */
export const fabrikErlaubt = (def) => !!(def.farmbar || def.aufstellen || ORTE.includes(def.id));

/** Blickrichtung der Spielerin als r (beim Legen); ohne laufendes Spiel: rechts. */
function blickR() {
  return S.s && S.sp ? rVonBlick(S.sp.blick) : 1;
}

/** Beim ersten Bau auf einer Karte beginnt ihre Fabrik-Uhr (damit nichts „nachgeholt" wird, was nie lief). */
export function uhrStarten(id = S.ort?.def?.id) {
  const f = S.s?.fabrik;
  if (f && id && f.zeit[id] == null) f.zeit[id] = f.t;
}

function spielerImFeld(ort, x, y, b, h) {
  if (!S.s || S.ort !== ort || !S.sp) return false;
  const px = Math.floor(S.sp.x / 16);
  const py = Math.floor(S.sp.y / 16);
  return px >= x && px < x + b && py >= y && py < y + h;
}

/** Platzregel: freie Fläche b×h auf einer erlaubten Karte (Bänder dürfen auf Belag, der Rest nicht). */
function platzPruefen({ s, ort, x, y }, b, h, belagOk) {
  const { def, welt: w } = ort;
  if (!fabrikErlaubt(def)) return 'Hier lässt sich keine Fabrik bauen. Auf dem Hof, am Berg, im Wald und am Strand geht es.';
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < b; dx++) {
      const kk = L.k(x + dx, y + dy);
      if (w.objekte[kk] || w.felder[kk] || (!belagOk && w.belag?.[kk]) || !L.begehbar(s, def, w, x + dx, y + dy) || L.warpAn(def, x + dx, y + dy)) return 'Hier ist kein Platz.';
    }
  }
  if (b * h > 1 && spielerImFeld(ort, x, y, b, h)) return 'Dort stehst du gerade selbst.';
  return true;
}

// ─── Inhalt und Aufheben ────────────────────────────────────────────────────

const plus = (liste, id, n, extra) => { if (n > 0) liste.push({ id, n, ...(extra?.q ? { q: extra.q } : {}), ...(extra?.von ? { von: extra.von } : {}) }); };

/** Alles, was in einem Fabrikobjekt steckt, als Stapel (für Aufheben und Prüfungen). */
export function inhaltVon(o) {
  const liste = [];
  if (o.t === BAND) for (const e of o.w || []) plus(liste, e.id, 1, e);
  else if (o.t === SPLITTER || o.t === MERGER) { if (o.pf) plus(liste, o.pf.id, 1, o.pf); }
  else if (MASCHINEN[o.t]) {
    for (const id in o.ein || {}) plus(liste, id, o.ein[id]);
    for (const id in o.aus || {}) plus(liste, id, o.aus[id]);
    const r = o.arb && MASCHINEN[o.t].rezepte?.[o.arb];
    if (r) for (const id in r.ein) plus(liste, id, r.ein[id]);
    for (const f of o.inv || []) if (f) plus(liste, f.id, f.n, f);
  }
  return liste;
}

const istLeitung = (o) => o.t === BAND || o.t === SPLITTER || o.t === MERGER;

/**
 * Fabrikobjekt einsammeln (Spitzhacke/Axt). Das Objekt kommt in den Rucksack, der Inhalt ebenfalls.
 * Maschinen und Lager: nur, wenn alles hineinpasst, sonst bleibt alles stehen. Bänder: was nicht mehr
 * hineinpasst, fällt weg. Ein Bohrer gibt sein Vorkommen frei.
 */
export function fabrikAufheben(c) {
  const { s, ort, x, y, o, erg } = c;
  const itemId = o.t;
  const waren = inhaltVon(o);
  const kopie = s.spieler.inv.map((z) => (z ? { ...z } : null));
  if (L.inBehaelter(kopie, { id: itemId, n: 1 }) > 0) { erg.grund = 'Dein Rucksack ist voll.'; return true; }
  const lose = istLeitung(o);
  for (const w of waren) {
    if (L.inBehaelter(kopie, w) > 0 && !lose) {
      erg.grund = 'Dein Rucksack ist zu voll, um den Inhalt zurückzugeben. Leere die Maschine erst.';
      return true;
    }
  }
  if (o.t === 'erzbohrer') {
    L.objektEntfernen(ort, x, y);
    L.objektSetzen(ort, x, y, { t: 'vorkommen', erz: o.erz, rein: o.rein ?? 1 });
  } else L.objektEntfernen(ort, x, y);
  L.hinzufuegen(s, { id: itemId, n: 1 });
  erg.items.push({ id: itemId, n: 1 });
  let verloren = 0;
  for (const w of waren) {
    const rest = L.hinzufuegen(s, w);
    verloren += rest;
    if (w.n - rest > 0) erg.items.push({ ...w, n: w.n - rest });
  }
  if (verloren > 0) erg.text = `${verloren} Ware${verloren === 1 ? '' : 'n'} vom Band ${verloren === 1 ? 'ist' : 'sind'} heruntergefallen.`;
  erg.treffer = 'aufheben';
  fabrikAenderung();
  return true;
}

const abbauen = { blockiert: false, axt: fabrikAufheben, spitzhacke: fabrikAufheben };

// ─── Vorkommen ──────────────────────────────────────────────────────────────

/** Bild und Namen: das Vorkommen steht fest; Spitzhacke und Axt tun nichts außer einem Hinweis. */
const vorkommenName = (o) => `${SORTEN[o.erz]?.name ?? 'Erz'}-Vorkommen (${reinName(o.rein ?? 1)})`;
const unzerstoerbar = (c) => { c.erg.grund = 'Das Vorkommen ist unzerstörbar. Stelle einen Erzbohrer darauf.'; return true; };

objektTyp('vorkommen', {
  blockiert: true,
  flaeche: [2, 2],
  spitzhacke: unzerstoerbar,
  axt: unzerstoerbar,
  hacke: unzerstoerbar,
  hinweis: ({ o }) => vorkommenName(o),
  interagieren({ o }) { meldung(`${vorkommenName(o)}. Erzbohrer in die Hand nehmen und benutzen.`); },
  /** Aus dem Rucksack aufgestellt (Items vorkommen_<sorte>); die Reinheit steht im Objekt (0,5 / 1 / 2). */
  anlegen(o, slot) { o.erz = String(slot?.id ?? '').replace('vorkommen_', '') || 'stein'; o.rein = 1; },
  platz: (c) => platzPruefen(c, 2, 2, false),
  /** Gegenstand aus der Hand auf das Vorkommen benutzt: nur der Erzbohrer passt. */
  einlegen(c) {
    const { s, ort, x, y, o, slot, idx } = c;
    if (slot?.id !== 'erzbohrer') { meldung(`${vorkommenName(o)}. Nur ein Erzbohrer passt darauf.`); return; }
    const bohrer = bohrerAnlegen(o);
    L.objektSetzen(ort, x, y, bohrer);
    L.entfernenAusSlot(s, idx, 1);
    uhrStarten();
    fabrikAenderung();
    ton('truhe');
  },
});

function bohrerAnlegen(vorkommen) {
  return { t: 'erzbohrer', r: blickR(), erz: vorkommen.erz, rein: vorkommen.rein ?? 1, ein: {}, aus: {}, f: 0 };
}

// ─── Bänder, Splitter, Zusammenführer ───────────────────────────────────────

function drehen({ o }) {
  o.r = ((o.r | 0) + 1) % 4;
  fabrikAenderung();
  ton('menue');
}

const leitung = (name) => ({
  ...abbauen,
  platz: (c) => platzPruefen(c, 1, 1, true),
  anlegen(o) { o.r = blickR(); if (o.t === BAND) o.w = []; else { o.pf = null; o.z = 0; o.nx = 0; } uhrStarten(); fabrikAenderung(); },
  interagieren: drehen,
  hinweis: ({ o }) => `${name} drehen (zeigt ${RICHTUNGEN[o.r | 0]})`,
});
objektTyp(BAND, leitung('Band'));
objektTyp(SPLITTER, leitung('Splitter'));
objektTyp(MERGER, leitung('Zusammenführer'));

// ─── Maschinen ──────────────────────────────────────────────────────────────

const infoOeffnen = ({ o, x, y }) => { ton('menue'); fenster('handwerk_fabrik', { o, x, y }); };

for (const [id, def] of Object.entries(MASCHINEN)) {
  objektTyp(id, {
    ...abbauen,
    blockiert: true,
    flaeche: def.flaeche,
    leistung: def.leistung, // MW, wird gelesen, in Stufe 1 nicht erzwungen
    ...(id === 'schmelzer' ? { licht: 2 } : {}), // die Glut leuchtet nachts
    platz: id === 'erzbohrer'
      ? () => 'Der Erzbohrer muss auf einem Vorkommen stehen: im Rucksack wählen und auf das Vorkommen benutzen.'
      : (c) => platzPruefen(c, def.flaeche[0], def.flaeche[1], false),
    anlegen(o) {
      o.r = blickR();
      if (id === 'lager') o.inv = Array(48).fill(null);
      else { o.ein = {}; o.aus = {}; o.f = 0; }
      if (def.waehlbar) o.rez = def.standard;
      uhrStarten();
      fabrikAenderung();
    },
    interagieren: id === 'lager'
      ? ({ o }) => { ton('truhe'); fenster('truhe', { truhe: o, titel: 'Lager', drin: 'Im Lager' }); }
      : infoOeffnen,
    hinweis: ({ o }) => (id === 'lager' ? 'Lager öffnen' : `${def.name} ansehen`),
  });
}

// ─── Aktionen aus dem Fenster (auch für Tests) ──────────────────────────────

/** Maschine im Uhrzeigersinn drehen. */
export function maschineDrehen(o) {
  o.r = ((o.r | 0) + 1) % 4;
  fabrikAenderung();
}

/** Inhalt (Eingang und Ausgang) in den Rucksack zurückgeben; gibt zurück, ob alles passte (sonst bleibt alles). */
function leeren(s, o, nur) {
  const kopie = s.spieler.inv.map((z) => (z ? { ...z } : null));
  const waren = [];
  for (const art of nur) for (const id in o[art] || {}) plus(waren, id, o[art][id]);
  for (const w of waren) if (L.inBehaelter(kopie, w) > 0) return false;
  for (const w of waren) L.hinzufuegen(s, w);
  for (const art of nur) o[art] = {};
  return waren;
}

/** Fertige Ware aus dem Ausgang nehmen (Knopf „Ausgang leeren"). */
export function ausgangLeeren(s, o) {
  const erg = L.neuesErgebnis();
  const waren = leeren(s, o, ['aus']);
  if (waren === false) { erg.grund = 'Dein Rucksack ist voll.'; return erg; }
  if (!waren.length) { erg.grund = 'Der Ausgang ist leer.'; return erg; }
  erg.items.push(...waren);
  erg.ok = true;
  return erg;
}

/**
 * Rezept wählen (Konstrukteur, Assembler). Zutaten des alten Rezepts und angefangene Arbeit gehen in den Rucksack
 * zurück; passt das nicht, bleibt das alte Rezept.
 */
export function rezeptWaehlen(s, o, id) {
  const erg = L.neuesErgebnis();
  const def = MASCHINEN[o.t];
  if (!def?.waehlbar || !def.rezepte[id]) { erg.grund = 'Dieses Rezept gibt es hier nicht.'; return erg; }
  if (o.rez === id) { erg.ok = true; return erg; }
  // angefangene Arbeit zurücklegen
  const alt = o.arb && def.rezepte[o.arb];
  if (alt) for (const z in alt.ein) (o.ein ??= {})[z] = (o.ein[z] || 0) + alt.ein[z];
  const gaben = leeren(s, o, ['ein']);
  if (gaben === false) {
    if (alt) for (const z in alt.ein) o.ein[z] -= alt.ein[z];
    erg.grund = 'Dein Rucksack ist zu voll, um die Zutaten zurückzugeben.';
    return erg;
  }
  o.arb = null;
  o.f = 0;
  o.rez = id;
  erg.items.push(...gaben);
  erg.ok = true;
  return erg;
}
