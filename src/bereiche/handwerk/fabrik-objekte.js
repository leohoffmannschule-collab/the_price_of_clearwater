// Bereich „handwerk" – Fabrik: die Objekttypen (Vorkommen, Förderband, Splitter, Zusammenführer, Erzbohrer,
// Schmelzer, Konstrukteur, Assembler, Lager), Aufstellen in Blickrichtung (auch große Teile), Vorschau-Daten,
// Drehen (Band: erst wählen, dann drehen), Befüllen aus der Hand, Aufheben ohne Verlust.
// Die Simulation (Bewegung, Takt) steht in fabrik-sim.js.

import { ITEMS, OBJEKT_TYPEN, objektTyp, itemBenutzen } from '../../daten.js';
import * as L from '../../logik.js';
import { S, ton, fenster, meldung, staub, ergebnisZeigen } from '../../spiel.js';
import { MASCHINEN, BAND, SPLITTER, MERGER, SORTEN, RICHTUNGEN, rVonBlick, reinName, vorkommenItem, FABRIK } from './fabrik-daten.js';
import { fabrikAenderung, zutatenGrenze, maschineAnnehmen, bandStau } from './fabrik-sim.js';

const ORTE = ['berg', 'wald', 'strand'];
/**
 * Wo Fabrik und Vorkommen stehen dürfen: auf dem Hof, auf Karten mit `aufstellen`, am Berg, im Wald, am Strand –
 * aber nie in einem Wohnhaus (`zuhause`): beim Hausausbau zieht der Hof nur kleine Dinge mit um.
 */
export const fabrikErlaubt = (def) => !def.zuhause && !!(def.farmbar || def.aufstellen || ORTE.includes(def.id));

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
  if (!fabrikErlaubt(def)) return def.zuhause ? 'Im Haus ist kein Platz für eine Fabrik.' : 'Hier lässt sich keine Fabrik bauen. Auf dem Hof, am Berg, im Wald und am Strand geht es.';
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < b; dx++) {
      const kk = L.k(x + dx, y + dy);
      if (w.objekte[kk] || w.felder[kk] || (!belagOk && w.belag?.[kk]) || !L.begehbar(s, def, w, x + dx, y + dy) || L.warpAn(def, x + dx, y + dy)) return 'Hier ist kein Platz.';
    }
  }
  if (b * h > 1 && spielerImFeld(ort, x, y, b, h)) return 'Dort stehst du gerade selbst.';
  return true;
}

// ─── Aufstellen in Blickrichtung und Vorschau ───────────────────────────────

/** Objekttyp, den ein Gegenstand aufstellt (oder null). */
export function bauTyp(it) {
  if (!it?.aufstellbar) return null;
  const t = typeof it.aufstellbar === 'string' ? it.aufstellbar : it.id;
  return MASCHINEN[t] || t === BAND || t === SPLITTER || t === MERGER || t === 'vorkommen' ? t : null;
}
const flaeche = (t) => OBJEKT_TYPEN[t]?.flaeche ?? [1, 1];

/**
 * Ecke oben links einer b×h-Fläche, die am Zielfeld (x, y) beginnt und sich vom Blick aus weg erstreckt: nach oben
 * geschaut liegt sie über dem Zielfeld, nach links links davon. So überdeckt sie nie das Feld der Spielerin.
 */
export function anker(b, h, x, y, blick) {
  if (blick === 'oben') return { x, y: y - h + 1 };
  if (blick === 'links') return { x: x - b + 1, y };
  return { x, y };
}

/**
 * Was beim Benutzen des Gegenstands `slot` auf das Zielfeld (x, y) entstünde: { t, x, y, b, h, r, ok, grund, o }.
 * Für die Vorschau (fabrik-kunst-objekte.js) und fürs Aufstellen. null, wenn der Gegenstand kein Fabrikteil ist.
 */
export function bauVorschau(s, ort, x, y, blick, slot) {
  const it = slot && ITEMS[slot.id];
  const t = bauTyp(it);
  if (!t) return null;
  const r = rVonBlick(blick);
  const [b, h] = flaeche(t);
  if (t === 'erzbohrer') {
    const ziel = L.hauptVon(ort, x, y, ort.welt.objekte[L.k(x, y)]);
    const ok = ziel.o?.t === 'vorkommen';
    return { t, x: ok ? ziel.x : x, y: ok ? ziel.y : y, b, h, r, ok, grund: ok ? null : 'Der Erzbohrer muss auf einem Vorkommen stehen.', o: { t, r, erz: ziel.o?.erz, rein: ziel.o?.rein } };
  }
  const a = anker(b, h, x, y, blick);
  const p = OBJEKT_TYPEN[t].platz({ s, ort, x: a.x, y: a.y, kk: L.k(a.x, a.y), slot, it });
  const o = { t, r };
  if (t === 'vorkommen') Object.assign(o, { erz: it.erz, rein: it.rein });
  return { t, ...a, b, h, r, ok: p === true, grund: p === true ? null : p, o };
}

/** Große Fabrikteile (und Vorkommen) in Blickrichtung aufstellen; vor dem allgemeinen Aufstellen des Bereichs basis. */
itemBenutzen((c) => {
  const t = bauTyp(c.it);
  return !!t && t !== 'erzbohrer' && (flaeche(t)[0] > 1 || flaeche(t)[1] > 1);
}, (c) => {
  const blick = c.S?.sp?.blick ?? 'rechts';
  const [b, h] = flaeche(bauTyp(c.it));
  const a = anker(b, h, c.x, c.y, blick);
  const r = L.aufstellen(c.s, c.ort, a.x, a.y, c.idx);
  if (r.ok) { ton('truhe'); staub(c.x, c.y, '#a8784a'); } else if (r.grund) meldung(r.grund);
}, { vorn: true });

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
 * Maschinen und Lager: nur, wenn alles hineinpasst, sonst bleibt alles stehen. Bänder: was nicht mehr hineinpasst,
 * fällt als Fund vor die Füße (nichts geht verloren). Ein Bohrer gibt sein Vorkommen frei.
 */
export function fabrikAufheben(c) {
  const { s, ort, x, y, o, erg } = c;
  const itemId = o.t;
  const waren = inhaltVon(o);
  const kopie = s.spieler.inv.map((z) => (z ? { ...z } : null));
  if (L.inBehaelter(kopie, { id: itemId, n: 1 }) > 0) { erg.grund = 'Dein Rucksack ist voll.'; return true; }
  if (!istLeitung(o)) {
    for (const w of waren) {
      if (L.inBehaelter(kopie, w) > 0) {
        erg.grund = 'Dein Rucksack ist zu voll, um den Inhalt zurückzugeben. Leere die Maschine erst.';
        return true;
      }
    }
  }
  L.objektEntfernen(ort, x, y);
  if (o.t === 'erzbohrer') L.objektSetzen(ort, x, y, { t: 'vorkommen', erz: o.erz, rein: o.rein ?? 1, ...(o.gk ? { gk: 1 } : {}) });
  L.geben(s, ort, x, y, { id: itemId, n: 1 }, erg);
  for (const w of waren) L.geben(s, ort, x, y, w, erg); // Rest als Fund auf den Boden (erg.voll)
  erg.treffer = 'aufheben';
  fabrikAenderung();
  return true;
}

const abbauen = { blockiert: false, axt: fabrikAufheben, spitzhacke: fabrikAufheben };

// ─── Vorkommen ──────────────────────────────────────────────────────────────

const vorkommenName = (o) => `${SORTEN[o.erz]?.name ?? 'Erz'}-Vorkommen (${reinName(o.rein ?? 1)})`;

/** Natürliche Vorkommen sind unzerstörbar; gekaufte (`gk`) nimmt man mit Spitzhacke oder Axt wieder auf. */
function vorkommenHieb(c) {
  const { s, ort, x, y, o, erg } = c;
  if (!o.gk) { erg.grund = 'Das Vorkommen ist unzerstörbar. Stelle einen Erzbohrer darauf.'; return true; }
  const id = vorkommenItem(o.erz, o.rein ?? 1);
  if (L.platzFuer(s, { id, n: 1 }) < 1) { erg.grund = 'Dein Rucksack ist voll.'; return true; }
  L.objektEntfernen(ort, x, y);
  L.geben(s, ort, x, y, { id, n: 1 }, erg);
  erg.treffer = 'aufheben';
  return true;
}

objektTyp('vorkommen', {
  blockiert: true,
  flaeche: [2, 2],
  spitzhacke: vorkommenHieb,
  axt: vorkommenHieb,
  hacke: (c) => { c.erg.grund = 'Das Vorkommen ist unzerstörbar.'; return true; },
  hinweis: ({ o }) => vorkommenName(o),
  interagieren({ o }) { meldung(`${vorkommenName(o)}. Erzbohrer in die Hand nehmen und benutzen.`); },
  /** Aus dem Rucksack aufgestellt (Items vorkommen_<sorte>_<reinheit>): Sorte und Reinheit (Faktor) ins Objekt. */
  anlegen(o, slot) {
    const it = ITEMS[slot?.id];
    o.erz = SORTEN[it?.erz] ? it.erz : 'stein';
    o.rein = [0.5, 1, 2].includes(it?.rein) ? it.rein : 1;
    o.gk = 1;
  },
  platz: (c) => platzPruefen(c, 2, 2, false),
  /** Gegenstand aus der Hand auf das Vorkommen benutzt: nur der Erzbohrer passt. */
  einlegen(c) {
    const { s, ort, x, y, o, slot, idx } = c;
    if (slot?.id !== 'erzbohrer') { meldung(`${vorkommenName(o)}. Nur ein Erzbohrer passt darauf.`); return; }
    L.objektSetzen(ort, x, y, bohrerAnlegen(o));
    L.entfernenAusSlot(s, idx, 1);
    uhrStarten();
    fabrikAenderung();
    ton('truhe');
  },
});

function bohrerAnlegen(v) {
  return { t: 'erzbohrer', r: blickR(), erz: v.erz, rein: v.rein ?? 1, ...(v.gk ? { gk: 1 } : {}), ein: {}, aus: {}, f: 0 };
}

// ─── Bänder, Splitter, Zusammenführer ───────────────────────────────────────

/**
 * Drehen mit Bestätigung: Die erste Aktionstaste (oder das erste Antippen) wählt das Teil, jede weitere innerhalb
 * von FABRIK.drehFenster Sekunden dreht es im Uhrzeigersinn. So dreht ein Tippen in Bandnähe nichts aus Versehen.
 */
const gewaehlt = { schluessel: null, bis: 0 };
const schluesselVon = (ort, x, y) => `${ort?.def?.id}:${x},${y}`;
const zeitJetzt = () => S.t || 0;
export const istGewaehlt = (ort, x, y) => gewaehlt.schluessel === schluesselVon(ort, x, y) && zeitJetzt() <= gewaehlt.bis;

export function leitungBedienen({ ort, x, y, o }) {
  const name = { [BAND]: 'Band', [SPLITTER]: 'Splitter', [MERGER]: 'Zusammenführer' }[o.t];
  if (istGewaehlt(ort, x, y)) {
    o.r = ((o.r | 0) + 1) % 4;
    fabrikAenderung();
    ton('menue');
  } else {
    ton('menue');
    meldung(`${name} gewählt (zeigt ${RICHTUNGEN[o.r | 0]}). Noch einmal: im Uhrzeigersinn drehen.`);
  }
  gewaehlt.schluessel = schluesselVon(ort, x, y);
  gewaehlt.bis = zeitJetzt() + FABRIK.drehFenster;
}

const leitung = (name) => ({
  ...abbauen,
  platz: (c) => platzPruefen(c, 1, 1, true),
  anlegen(o) { o.r = blickR(); if (o.t === BAND) o.w = []; else { o.pf = null; o.nx = 0; } uhrStarten(); fabrikAenderung(); },
  interagieren: leitungBedienen,
  hinweis({ s, ort, x, y, o }) {
    const was = istGewaehlt(ort, x, y) ? `${name} drehen ↻` : `${name} wählen (zeigt ${RICHTUNGEN[o.r | 0]})`;
    const stau = o.t === BAND && s && ort ? bandStau(s, ort, x, y, o) : null;
    return stau ? `${was} · ${stau}` : was;
  },
});
objektTyp(BAND, leitung('Band'));
objektTyp(SPLITTER, leitung('Splitter'));
objektTyp(MERGER, leitung('Zusammenführer'));

// ─── Maschinen ──────────────────────────────────────────────────────────────

const infoOeffnen = ({ o, x, y }) => { ton('menue'); fenster('handwerk_fabrik', { o, x, y }); };

/** Lager: das Truhenfenster mit Ein- und Ausgang und einem Knopf zum Drehen. */
export function lagerOeffnen({ o }) {
  ton('truhe');
  fenster('truhe', {
    truhe: o, titel: 'Lager', drin: 'Im Lager',
    zeilen: () => [`Eingang: hinten, links und rechts · Ausgang: vorn (${RICHTUNGEN[o.r | 0]})`],
    knoepfe: [{ text: 'Drehen ↻', aktion: 'drehen', tun: () => maschineDrehen(o) }],
  });
}

/**
 * Gegenstand aus der Hand in eine Maschine legen (passende Zutaten bis zur Grenze) oder in ein Lager (der ganze Stapel,
 * soweit Platz ist). Gibt ein Ergebnis zurück.
 */
export function befuellen(s, o, idx) {
  const erg = L.neuesErgebnis();
  const slot = idx != null ? s.spieler.inv[idx] : null;
  const name = MASCHINEN[o.t]?.name ?? 'Maschine';
  if (!slot) { erg.grund = `Halte eine Zutat in der Hand, um den ${name} zu befüllen.`; return erg; }
  const wname = ITEMS[slot.id]?.name ?? slot.id;
  if (o.t === 'erzbohrer') { erg.grund = 'Der Erzbohrer fördert allein und nimmt nichts an.'; return erg; }
  let n = 0;
  if (o.t === 'lager') {
    const rest = L.inBehaelter((o.inv ??= Array(FABRIK.lagerFaecher).fill(null)), L.slotKopie(slot, slot.n));
    n = slot.n - rest;
  } else {
    if (!zutatenGrenze(o, slot.id) || slot.q || slot.von) { erg.grund = `${wname} passt nicht zum Rezept des ${name}s.`; return erg; }
    const r = ((o.r | 0) + 1) % 4; // Eingangsseite
    const grenze = zutatenGrenze(o, slot.id);
    while (n < slot.n && (o.ein?.[slot.id] || 0) < grenze && maschineAnnehmen(o, { id: slot.id }, r)) n++;
    if (o.abg) delete o.abg;
  }
  if (!n) { erg.grund = o.t === 'lager' ? 'Das Lager ist voll.' : `Der Eingang ist voll (${wname}).`; return erg; }
  L.entfernenAusSlot(s, idx, n);
  erg.ok = true;
  erg.text = `${n}× ${wname} eingelegt.`;
  return erg;
}

const einlegen = ({ s, o }) => {
  const erg = befuellen(s, o, s.spieler.wahl);
  if (erg.ok) ton('pop');
  ergebnisZeigen(erg);
};

/** Hält die Spielerin eine passende Zutat für diese Maschine in der Hand? */
const zutatInHand = (s, o) => {
  const hand = s?.spieler?.inv[s.spieler.wahl];
  return !!hand && MASCHINEN[o.t]?.rezepte && !hand.q && !hand.von && zutatenGrenze(o, hand.id) > 0;
};

/** Aktionstaste auf eine Maschine: mit passender Zutat in der Hand befüllen, sonst das Info-Fenster. */
function maschineBedienen(c) {
  if (zutatInHand(c.s, c.o)) einlegen(c);
  else infoOeffnen(c);
}

function maschinenHinweis(id, def) {
  return ({ s, o }) => {
    if (zutatInHand(s, o)) return `${ITEMS[s.spieler.inv[s.spieler.wahl].id]?.name} einlegen`;
    if (id === 'lager') return 'Lager öffnen';
    if (id === 'erzbohrer') return `Erzbohrer (${SORTEN[o.erz]?.name ?? '?'}, ${reinName(o.rein ?? 1)}) ansehen`;
    return `${def.name} ansehen`;
  };
}

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
    interagieren: id === 'lager' ? lagerOeffnen : maschineBedienen,
    ...(id !== 'erzbohrer' ? { einlegen } : {}),
    hinweis: maschinenHinweis(id, def),
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
 * zurück (der Fortschritt verfällt); passt das nicht, bleibt das alte Rezept.
 */
export function rezeptWaehlen(s, o, id) {
  const erg = L.neuesErgebnis();
  const def = MASCHINEN[o.t];
  if (!def?.waehlbar || !def.rezepte[id]) { erg.grund = 'Dieses Rezept gibt es hier nicht.'; return erg; }
  if (o.rez === id) { erg.ok = true; return erg; }
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
  if (o.abg) delete o.abg;
  erg.items.push(...gaben);
  erg.ok = true;
  erg.text = gaben.length
    ? `Rezept: ${def.rezepte[id].name}. Die Zutaten (auch die angefangene Arbeit) sind zurück im Rucksack.`
    : `Rezept: ${def.rezepte[id].name}.`;
  return erg;
}
