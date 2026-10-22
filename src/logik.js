// Spiellogik ohne Bildschirm: Spielstand, Rucksack, Feldarbeit, Tageswechsel,
// Freundschaften, Läden, Basteln, Wege, Speichern. Nur Mechanik – die Inhalte (welche
// Objekte, Pflanzen, Leute, Läden es gibt) kommen aus den Registern in daten.js.
//
// Ein „Ort" ist { def, welt }: die feste Kartenbeschreibung und ihr veränderlicher Teil
// (Objekte, Beete, liegengebliebene Funde). Für flüchtige Karten (Minenebenen) kommt beides
// vom Kartenanbieter.

import {
  ITEMS, PFLANZEN, SAAT_ZU_PFLANZE, JZ, JZ_NAME, TAGE_PRO_JZ, TAG_BEGINN, MAX_ENERGIE, MAX_HP,
  STAPEL_MAX, XP_STUFEN, QUALITAET, KANNE_INHALT, WERKZEUG_STUFEN, AUFRUESTBAR, LAEDEN, NPCS,
  PUNKTE_PRO_HERZ, MAX_HERZEN, GESCHENK_PUNKTE, BRIEFE, WOCHENTAGE, FAEHIGKEITEN, REZEPTE,
  OBJEKT_TYPEN, BEDINGUNGEN, WERKZEUG_ARTEN, SPEZIAL_WARE, BELAG_TYPEN, objektTyp,
} from './daten.js';
import {
  KARTEN, boden, bodenRaster, bodenFlag, B_BEGEHBAR, B_FARMBAR, istWasser, karteHolen, punkt, zielVon,
  verbindungen,
} from './karten.js';
import { alle, erster, sammle, mod } from './system.js';
import { zufall, waehle } from './zufall.js';

export const SPEICHER_VERSION = 2;
export const SPEICHER_SCHLUESSEL = 'klarwasser-hof-v2';
export const k = (x, y) => `${x},${y}`;
export const ausK = (kk) => kk.split(',').map(Number);
export const RICHTUNG = { oben: [0, -1], unten: [0, 1], links: [-1, 0], rechts: [1, 0] };
export const MAX_PUNKTE = MAX_HERZEN * PUNKTE_PRO_HERZ;

// ─── Neues Spiel ────────────────────────────────────────────────────────────

/** Punkt „bett" im Haus (Standard für zuhause). */
export function bettPunkt() {
  return punkt('haus', 'bett') || { x: 3, y: 4, blick: 'unten' };
}

/**
 * Wo man wohnt und aufwacht: { karte, x, y, blick }. Der Hook `zuhause(s)` darf eine andere
 * Karte liefern (Hausstufen); sonst Punkt „bett" der Karte „haus".
 */
export function zuhause(s) {
  const z = erster('zuhause', s);
  if (z) return { blick: 'unten', ...(z.punkt ? zielVon(z, s) : z) };
  return { karte: 'haus', blick: 'unten', ...bettPunkt() };
}

export function neuesSpiel({ name = 'Liesel', hof = 'Sonnenhof', aussehen = {}, seed } = {}) {
  seed ??= Math.floor(Math.random() * 2 ** 31);
  const r = zufall(seed);
  const bett = bettPunkt();
  const s = {
    version: SPEICHER_VERSION,
    seed,
    spieler: {
      name, hof,
      aussehen: { haut: '#f0c8a0', haare: '#6b4428', frisur: 'kurz', hemd: '#c8553d', hose: '#3b4a6b', ...aussehen },
      gold: 500, energie: MAX_ENERGIE, maxEnergie: MAX_ENERGIE, hp: MAX_HP, maxHp: MAX_HP,
      inv: Array(24).fill(null), invGroesse: 24, wahl: 0,
      werkzeug: Object.fromEntries(AUFRUESTBAR.map((id) => [id, 0])),
      wasser: KANNE_INHALT[0],
      xp: Object.fromEntries(Object.keys(FAEHIGKEITEN).map((id) => [id, 0])),
      karte: 'haus', x: bett.x, y: bett.y, blick: 'unten', tempoBis: 0,
    },
    zeit: { tag: 1, jz: 0, jahr: 1, minute: TAG_BEGINN, wetter: 'sonne', morgen: 'sonne', glueck: 0 },
    welt: {},
    npcs: {},
    briefe: [],
    post: [],
    versand: [],
    stufeNeu: [],
    flags: {},
    haus: { stufe: 0 },
    rezepte: [],
    stats: { verdient: 0, geerntet: 0, gefangen: 0, baeume: 0, auftraege: 0, tage: 1 },
  };
  ergaenzen(s);
  alle('neuesSpiel', s, r);
  const z = zuhause(s);
  Object.assign(s.spieler, { karte: z.karte, x: z.x, y: z.y, blick: z.blick });
  for (const def of Object.values(KARTEN)) if (def.sammel.length) sammelSpawnen(s, def.id, r, 3);
  s.post = postFuerHeute(s);
  return s;
}

/** Fehlende Felder nachtragen – nach dem Anlegen und nach dem Laden. */
export function ergaenzen(s) {
  s.welt ??= {};
  for (const id of Object.keys(KARTEN)) welt(s, id);
  s.npcs ??= {};
  for (const id of Object.keys(NPCS)) {
    s.npcs[id] ??= {};
    const n = s.npcs[id];
    n.punkte ??= 0;
    n.gesprochen ??= false;
    n.beschenkt ??= false;
    n.herzGesehen ??= [];
    n.herzGeschenke ??= [];
  }
  const sp = s.spieler;
  for (const id of AUFRUESTBAR) sp.werkzeug[id] ??= 0;
  for (const id of Object.keys(FAEHIGKEITEN)) sp.xp[id] ??= 0;
  s.stufeNeu ??= [];
  s.flags ??= {};
  s.haus ??= { stufe: 0 };
  s.rezepte ??= [];
  s.versand ??= [];
  s.post ??= [];
  s.briefe ??= [];
  alle('ergaenzen', s);
  werteAktualisieren(s);
}

export function welt(s, id) {
  s.welt[id] ??= { objekte: {}, felder: {}, funde: [], belag: {} };
  s.welt[id].funde ??= [];
  s.welt[id].felder ??= {};
  s.welt[id].belag ??= {};
  return s.welt[id];
}
export const ortVon = (s, id) => ({ def: karteHolen(id, s), welt: welt(s, id) });

export const imBereich = (b, x, y) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

// ─── Bedingungen ────────────────────────────────────────────────────────────

/** Prüft eine Bedingung: Name aus dem Register, „!name", Funktion (s) => bool oder Liste (alle). */
export function erfuellt(s, b) {
  if (b == null) return true;
  if (typeof b === 'function') return !!b(s);
  if (Array.isArray(b)) return b.every((x) => erfuellt(s, x));
  const nicht = b.startsWith('!');
  const fn = BEDINGUNGEN[nicht ? b.slice(1) : b];
  if (!fn) return true;
  return nicht ? !fn(s) : !!fn(s);
}

// ─── Kartenstand: Gebäude, Deko, Blockaden je Karte (gecacht) ───────────────

let aenderung = 0;
/** Bereiche rufen das, wenn sich ihre dynamischen Gebäude/Deko/Objekte mitten am Tag ändern. */
export const kartenGeaendert = () => { aenderung++; };

const bedCache = new WeakMap();
function bedingungenVon(def) {
  const n = def.gebaeude.length + def.deko.length;
  const c = bedCache.get(def);
  if (c && c.n === n) return c.liste;
  const menge = new Set();
  for (const g of def.gebaeude) {
    if (g.nurWenn != null) menge.add(g.nurWenn);
    if (g.tuerWenn != null) menge.add(g.tuerWenn);
  }
  for (const d of def.deko) if (d.nurWenn != null) menge.add(d.nurWenn);
  const liste = [...menge];
  bedCache.set(def, { n, liste });
  return liste;
}

const standCache = new WeakMap();

const bedSchluessel = (s, liste) => {
  let t = '';
  for (const b of liste) t += erfuellt(s, b) ? '1' : '0';
  return t;
};

/**
 * Was auf einer Karte gerade steht: feste plus dynamische Gebäude/Deko (Hooks), Blockaden,
 * Feld-Index für Deko und Gebäude, offene Türen, dynamische Objekte. Neu berechnet, wenn sich
 * eine Bedingung (auch die der zuletzt gelieferten dynamischen Gebäude/Deko), der Tag oder
 * kartenGeaendert() ändert.
 */
export function kartenStand(s, def) {
  const z = s.zeit;
  const basis = `${aenderung}|${z.jahr}|${z.jz}|${z.tag}|${bedSchluessel(s, bedingungenVon(def))}|`;
  const c = standCache.get(def);
  if (c && c.s === s && c.schluessel === basis + bedSchluessel(s, c.dynBed)) return c;

  const ort = { def, welt: s.welt?.[def.id] };
  const dynGeb = sammle('gebaeude', ort, s);
  const dynDeko = sammle('deko', ort, s);
  const dynBed = [];
  for (const e of [...dynGeb, ...dynDeko]) {
    if (e.nurWenn != null && !dynBed.includes(e.nurWenn)) dynBed.push(e.nurWenn);
    if (e.tuerWenn != null && !dynBed.includes(e.tuerWenn)) dynBed.push(e.tuerWenn);
  }
  const schluessel = basis + bedSchluessel(s, dynBed);
  const gebaeude = [...def.gebaeude, ...dynGeb].filter((g) => erfuellt(s, g.nurWenn));
  const deko = [...def.deko, ...dynDeko].filter((d) => erfuellt(s, d.nurWenn));
  const W = def.w;
  const n = def.w * def.h;
  const blockiert = new Uint8Array(n);
  const dekoFeld = new Array(n);
  const gebaeudeFeld = new Array(n);
  const tuerFeld = new Map();
  const drin = (x, y) => x >= 0 && y >= 0 && x < def.w && y < def.h;
  for (const g of gebaeude) {
    for (let y = g.y; y < g.y + g.h; y++) {
      for (let x = g.x; x < g.x + g.w; x++) {
        if (!drin(x, y)) continue;
        blockiert[y * W + x] = 1;
        gebaeudeFeld[y * W + x] ??= g;
      }
    }
    if (g.ziel && g.tuer && erfuellt(s, g.tuerWenn) && drin(g.tuer.x, g.tuer.y)) {
      blockiert[g.tuer.y * W + g.tuer.x] = 0;
      tuerFeld.set(g.tuer.y * W + g.tuer.x, g);
    }
  }
  for (const d of deko) {
    for (let y = d.y; y < d.y + (d.h || 1); y++) {
      for (let x = d.x; x < d.x + (d.w || 1); x++) {
        if (!drin(x, y)) continue;
        dekoFeld[y * W + x] ??= d;
        if (!d.wand && !d.begehbar) blockiert[y * W + x] = 1;
      }
    }
  }
  const objekte = new Map();
  for (const o of sammle('objekteDynamisch', ort, s)) objekte.set(k(o.x, o.y), o);
  const stand = { s, schluessel, dynBed, gebaeude, deko, blockiert, dekoFeld, gebaeudeFeld, tuerFeld, objekte };
  standCache.set(def, stand);
  return stand;
}

export const gebaeudeListe = (s, def) => kartenStand(s, def).gebaeude;
export const dekoListe = (s, def) => kartenStand(s, def).deko;

const objektBlockiert = (o) => !!(o && OBJEKT_TYPEN[o.t]?.blockiert);
/** Pflanzen an einer Rankhilfe versperren ihr Beet. */
const feldBlockiert = (f) => !!f?.pflanze && !f.pflanze.tot && !!PFLANZEN[f.pflanze.id]?.rankhilfe;

export function begehbar(s, def, w, x, y) {
  if (x < 0 || y < 0 || x >= def.w || y >= def.h) return false;
  const i = y * def.w + x;
  if (!(bodenRaster(def)[i] & B_BEGEHBAR)) return false;
  const st = kartenStand(s, def);
  if (st.blockiert[i]) return false;
  const kk = k(x, y);
  if (feldBlockiert(w?.felder?.[kk])) return false;
  return !objektBlockiert(w?.objekte[kk] ?? st.objekte.get(kk));
}

/** Schnelle Prüf-Funktion (x, y) => bool für Wegsuchen über viele Felder. */
export function begehbarPruefer(s, def, w) {
  const flags = bodenRaster(def);
  const st = kartenStand(s, def);
  const objekte = w?.objekte || {};
  const felder = w?.felder || {};
  const W = def.w;
  return (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= def.h) return false;
    const i = y * W + x;
    if (!(flags[i] & B_BEGEHBAR) || st.blockiert[i]) return false;
    const kk = k(x, y);
    if (feldBlockiert(felder[kk])) return false;
    return !objektBlockiert(objekte[kk] ?? st.objekte.get(kk));
  };
}

/** Frei für Neues (Sammelfund, Nachwuchs, Aufstellen): begehbar, ohne Objekt, Beet, Belag und Warp. */
export function feldFrei(s, ort, x, y) {
  const kk = k(x, y);
  const w = ort.welt;
  return !w.objekte[kk] && !w.felder[kk] && !w.belag?.[kk] && begehbar(s, ort.def, w, x, y) && !warpAn(ort.def, x, y);
}

const feldIndex = (def, x, y) => (x < 0 || y < 0 || x >= def.w || y >= def.h ? -1 : y * def.w + x);
export function dekoAn(s, def, x, y) {
  const i = feldIndex(def, x, y);
  return i < 0 ? undefined : kartenStand(s, def).dekoFeld[i];
}
export function gebaeudeAn(s, def, x, y) {
  const i = feldIndex(def, x, y);
  return i < 0 ? undefined : kartenStand(s, def).gebaeudeFeld[i];
}
/** Offene Tür (mit Ziel) auf diesem Feld. */
export function tuerAn(s, def, x, y) {
  const i = feldIndex(def, x, y);
  return i < 0 ? undefined : kartenStand(s, def).tuerFeld.get(i);
}
export function warpAn(def, x, y) {
  return def.warps.find((w) => imBereich(w, x, y));
}
/** Objekt auf einem Feld: gespeichert oder dynamisch (Hook objekteDynamisch); Teile großer Objekte roh. */
export function objektAn(s, ort, x, y) {
  const kk = k(x, y);
  return ort.welt.objekte[kk] ?? kartenStand(s, ort.def).objekte.get(kk);
}

// ─── Große Objekte (Fläche b×h) ─────────────────────────────────────────────
// Das Hauptobjekt liegt oben links bei (x, y); die anderen Felder tragen { t: 'teil', haupt: 'x,y' }.

/** Hauptobjekt eines Felds: { x, y, kk, o } (bei einem Teil das große Objekt, zu dem es gehört). */
export function hauptVon(ort, x, y, o = ort.welt.objekte[k(x, y)]) {
  if (o?.t !== 'teil') return { x, y, kk: k(x, y), o };
  const [hx, hy] = ausK(o.haupt);
  return { x: hx, y: hy, kk: o.haupt, o: ort.welt.objekte[o.haupt] };
}

/** Fläche [b, h] eines Objekts (Objekttyp-Feld `flaeche`, sonst 1×1). */
export const flaecheVon = (o) => (o && (o.flaeche ?? OBJEKT_TYPEN[o.t]?.flaeche)) || [1, 1];

/** Legt ein Objekt ab, große über ihre ganze Fläche. Überschreibt, was dort liegt. */
export function objektSetzen(ort, x, y, o) {
  const [b, h] = flaecheVon(o);
  const haupt = k(x, y);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < b; dx++) {
    ort.welt.objekte[k(x + dx, y + dy)] = dx || dy ? { t: 'teil', haupt } : o;
  }
  return o;
}

/** Entfernt ein Objekt samt aller Teile; (x, y) darf auch ein Teil sein. Gibt das Hauptobjekt zurück. */
export function objektEntfernen(ort, x, y) {
  const h = hauptVon(ort, x, y);
  if (!h.o) { delete ort.welt.objekte[k(x, y)]; return null; }
  const [b, hh] = flaecheVon(h.o);
  for (let dy = 0; dy < hh; dy++) for (let dx = 0; dx < b; dx++) {
    const kk = k(h.x + dx, h.y + dy);
    const o = ort.welt.objekte[kk];
    if (o === h.o || (o?.t === 'teil' && o.haupt === h.kk)) delete ort.welt.objekte[kk];
  }
  return h.o;
}

/** Ist die Fläche b×h ab (x, y) frei (feldFrei für jedes Feld)? */
export function flaecheFrei(s, ort, x, y, b = 1, h = 1) {
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < b; dx++) if (!feldFrei(s, ort, x + dx, y + dy)) return false;
  return true;
}

/** Teile reichen Aktionstaste, Hinweis und Benutzen an ihr großes Objekt weiter (Werkzeuge: werkzeugKontext). */
const anHaupt = (name) => (c) => {
  const h = hauptVon(c.ort, c.x, c.y, c.o);
  const typ = h.o && OBJEKT_TYPEN[h.o.t];
  const fn = typ?.[name];
  if (typeof fn === 'function') return fn({ ...c, ...h });
  return name === 'hinweis' ? fn : undefined;
};
objektTyp('teil', {
  blockiert: true,
  interagieren: anHaupt('interagieren'),
  einlegen: anHaupt('einlegen'),
  hinweis: anHaupt('hinweis'),
});
/** Alle Objekte eines Orts als [schlüssel, objekt], dynamische eingeschlossen. */
export function alleObjekte(s, ort) {
  const liste = Object.entries(ort.welt.objekte);
  const dyn = kartenStand(s, ort.def).objekte;
  if (dyn.size) for (const e of dyn) liste.push(e);
  return liste;
}

// ─── Zeit ───────────────────────────────────────────────────────────────────

export const tagNr = (z) => (z.jahr - 1) * TAGE_PRO_JZ * 4 + z.jz * TAGE_PRO_JZ + z.tag;
export const wochentag = (z) => WOCHENTAGE[(tagNr(z) - 1) % 7];
export function uhrzeit(minute) {
  const h = Math.floor(minute / 60) % 24;
  return `${h}:${String(minute % 60).padStart(2, '0')}`;
}
export const regnet = (s) => s.zeit.wetter === 'regen' || s.zeit.wetter === 'sturm';
export const jahreszeit = (s) => JZ[s.zeit.jz];
export const glueck = (s) => s.zeit.glueck ?? 0;
/** Plan-Uhrzeit 1730 → Minuten seit Mitternacht. */
export const planMinute = (zeit) => Math.floor(zeit / 100) * 60 + (zeit % 100);

let minutenStand = -1;
let minutenTypen = new Set();
/** Die Spielzeit rückt um n Minuten vor: Objekte mit `minuten` und der Hook `minuten`. */
export function zeitVergeht(s, n) {
  const anzahl = Object.keys(OBJEKT_TYPEN).length;
  if (anzahl !== minutenStand) {
    minutenStand = anzahl;
    minutenTypen = new Set(Object.values(OBJEKT_TYPEN).filter((t) => t.minuten).map((t) => t.t));
  }
  if (minutenTypen.size) {
    for (const [id, w] of Object.entries(s.welt)) {
      const def = karteHolen(id, s);
      if (!def) continue;
      for (const [kk, o] of Object.entries(w.objekte)) {
        if (!minutenTypen.has(o.t)) continue;
        const [x, y] = ausK(kk);
        OBJEKT_TYPEN[o.t].minuten({ s, ort: { def, welt: w }, x, y, kk, o }, n);
      }
    }
  }
  alle('minuten', s, n);
}

// ─── Rucksack ───────────────────────────────────────────────────────────────

export const stapelbar = (id) => ITEMS[id]?.stapel !== false;
export const gleich = (a, b) => a.id === b.id && (a.q || 0) === (b.q || 0) && (a.von || null) === (b.von || null);
export const hat = (s, id) => s.spieler.inv.some((x) => x && x.id === id);

export function slotKopie(slot, n) {
  const neu = { id: slot.id, n };
  if (slot.q) neu.q = slot.q;
  if (slot.von) neu.von = slot.von;
  return neu;
}

export function platzFuer(s, slot) {
  const inv = s.spieler.inv;
  if (!stapelbar(slot.id)) return inv.some((x) => !x) ? 1 : 0;
  let platz = 0;
  for (const x of inv) {
    if (!x) platz += STAPEL_MAX;
    else if (gleich(x, slot)) platz += STAPEL_MAX - x.n;
  }
  return platz;
}

/** Legt einen Stapel in den Rucksack. Gibt zurück, wie viel nicht hineinpasste. */
export function hinzufuegen(s, slot) {
  return inBehaelter(s.spieler.inv, slot);
}

export function inBehaelter(inv, slot) {
  let rest = slot.n;
  if (stapelbar(slot.id)) {
    for (const x of inv) {
      if (rest <= 0) break;
      if (x && gleich(x, slot) && x.n < STAPEL_MAX) {
        const dazu = Math.min(rest, STAPEL_MAX - x.n);
        x.n += dazu;
        rest -= dazu;
      }
    }
  }
  for (let i = 0; i < inv.length && rest > 0; i++) {
    if (inv[i]) continue;
    const dazu = stapelbar(slot.id) ? Math.min(rest, STAPEL_MAX) : 1;
    inv[i] = slotKopie(slot, dazu);
    rest -= dazu;
  }
  return rest;
}

export function anzahl(s, id) {
  return s.spieler.inv.reduce((n, x) => n + (x && x.id === id ? x.n : 0), 0);
}

/** Nimmt n Stück einer Sorte heraus, schlechteste Qualität zuerst. */
export function entfernen(s, id, n) {
  if (anzahl(s, id) < n) return false;
  const inv = s.spieler.inv;
  const reihenfolge = inv.map((x, i) => [x, i]).filter(([x]) => x && x.id === id).sort((a, b) => (a[0].q || 0) - (b[0].q || 0));
  for (const [x, i] of reihenfolge) {
    if (n <= 0) break;
    const weg = Math.min(n, x.n);
    x.n -= weg;
    n -= weg;
    if (x.n <= 0) inv[i] = null;
  }
  return true;
}

export function entfernenAusSlot(s, idx, n = 1) {
  const x = s.spieler.inv[idx];
  if (!x) return;
  x.n -= n;
  if (x.n <= 0) s.spieler.inv[idx] = null;
}

export function tauschen(s, a, b) {
  const inv = s.spieler.inv;
  if (inv[a] && inv[b] && a !== b && gleich(inv[a], inv[b]) && stapelbar(inv[a].id)) {
    const dazu = Math.min(inv[a].n, STAPEL_MAX - inv[b].n);
    inv[b].n += dazu;
    inv[a].n -= dazu;
    if (inv[a].n <= 0) inv[a] = null;
    return;
  }
  [inv[a], inv[b]] = [inv[b], inv[a]];
}

/** Grundpreis ohne Qualität; Items mit `wert(slot)` rechnen selbst (Marmelade aus Obst …). */
export function grundpreis(slot) {
  const it = ITEMS[slot.id];
  return typeof it.wert === 'function' ? it.wert(slot) : it.preis;
}
const mitQualitaet = (slot) => Math.floor(grundpreis(slot) * QUALITAET[slot.q || 0].faktor);
/** Verkaufspreis eines Stücks; `s` reicht den Spielstand an den Modifikator weiter. */
export function preisVon(slot, s) {
  const it = ITEMS[slot.id];
  // Ware mit `preisVielfaches: n` und Ausgangsstoff (slot.von): genau n-mal der Verkaufspreis des Ausgangsstoffs
  // bei gleicher Qualität (Geräucherter Fisch); Modifikatoren wirken auf den Ausgangsstoff.
  if (it.preisVielfaches && slot.von && ITEMS[slot.von]) {
    return it.preisVielfaches * preisVon({ id: slot.von, n: slot.n, ...(slot.q ? { q: slot.q } : {}) }, s);
  }
  return Math.floor(mod('verkaufspreis', mitQualitaet(slot), { s, slot }));
}

export function nameVon(slot, s) {
  const it = ITEMS[slot.id];
  if (slot.von && ITEMS[slot.von]) return `${it.name} (${ITEMS[slot.von].name})`;
  if (s && it.kat === 'werkzeug' && AUFRUESTBAR.includes(slot.id)) return werkzeugName(slot.id, s.spieler.werkzeug[slot.id]);
  return it.name;
}

export function werkzeugName(id, stufe) {
  if (!stufe) return ITEMS[id].name;
  return `${WERKZEUG_STUFEN[stufe].name}${ITEMS[id].name.toLowerCase()}`;
}

export function energieVon(slot) {
  const it = ITEMS[slot.id];
  const e = typeof it.energie === 'function' ? it.energie(slot) : it.energie || 0;
  return Math.round(e * (1 + 0.4 * (slot.q || 0)));
}
export const essbar = (slot) => !!slot && (energieVon(slot) > 0 || !!ITEMS[slot.id].tempo || !!ITEMS[slot.id].buff);

export function verkaufbar(slot) {
  return !!ITEMS[slot.id].verkaufbar && mitQualitaet(slot) > 0;
}

// ─── Fähigkeiten ────────────────────────────────────────────────────────────

/** Erreichte Stufe einer Fähigkeit (0–10) aus der Erfahrung. */
export function stufe(s, skill) {
  const xp = s.spieler.xp[skill] || 0;
  let l = 0;
  while (l < 10 && xp >= XP_STUFEN[l]) l++;
  return l;
}
/** Stufe, mit der gerechnet wird: erreichte Stufe plus Modifikator `stufe` (Buffs, Ringe). */
export const stufeWirksam = (s, skill) => Math.max(0, Math.round(mod('stufe', stufe(s, skill), { s, skill })));

/** Höchstwerte neu berechnen (Kampfstufe, Modifikatoren maxEnergie/maxGesundheit). */
export function werteAktualisieren(s) {
  const sp = s.spieler;
  sp.maxEnergie = Math.round(mod('maxEnergie', MAX_ENERGIE, { s }));
  sp.maxHp = Math.round(mod('maxGesundheit', MAX_HP + 5 * stufe(s, 'kampf'), { s }));
}

export function xpGeben(s, skill, n, erg) {
  const vor = stufe(s, skill);
  s.spieler.xp[skill] += Math.round(mod('xp', n, { s, skill }));
  const nach = stufe(s, skill);
  if (nach > vor) {
    s.stufeNeu.push({ skill, stufe: nach });
    if (erg) erg.stufe = { skill, stufe: nach };
    werteAktualisieren(s);
  }
}

export function energieKosten(s, id, ladung = 0) {
  const art = WERKZEUG_ARTEN[ITEMS[id]?.werkzeug];
  if (!art?.skill) return 0;
  return mod('energieKosten', Math.max(0.5, 2 - 0.1 * stufeWirksam(s, art.skill)) * (ladung + 1), { s, werkzeug: id, ladung });
}

// ─── Feldarbeit ─────────────────────────────────────────────────────────────

/** Welche Felder ein (aufgeladenes) Werkzeug trifft, beginnend beim Zielfeld. */
export function werkzeugFelder(zx, zy, blick, ladung = 0) {
  const [dx, dy] = RICHTUNG[blick];
  const quer = [dy !== 0 ? 1 : 0, dx !== 0 ? 1 : 0];
  const felder = [];
  if (ladung <= 0) return [[zx, zy]];
  if (ladung <= 2) {
    const lang = ladung === 1 ? 3 : 5;
    for (let i = 0; i < lang; i++) felder.push([zx + dx * i, zy + dy * i]);
  } else {
    const lang = ladung === 3 ? 3 : 6;
    for (let i = 0; i < lang; i++) for (let j = -1; j <= 1; j++) felder.push([zx + dx * i + quer[0] * j, zy + dy * i + quer[1] * j]);
  }
  return felder;
}

export function senseFelder(zx, zy, blick) {
  const [dx, dy] = RICHTUNG[blick];
  const qx = dy !== 0 ? 1 : 0;
  const qy = dx !== 0 ? 1 : 0;
  return [[zx, zy], [zx + qx, zy + qy], [zx - qx, zy - qy]];
}

/** Gibt einen Stapel in den Rucksack; was nicht passt, bleibt auf dem Boden liegen. */
export function geben(s, ort, x, y, slot, erg) {
  const rest = hinzufuegen(s, slot);
  if (erg) erg.items.push(slotKopie(slot, slot.n));
  if (rest > 0) {
    if (ort) ort.welt.funde.push({ x, y, slot: slotKopie(slot, rest) });
    if (erg) erg.voll = true;
  }
}

export const neuesErgebnis = () => ({ items: [] });

/** Kontext für Werkzeug-Handler; auf dem Teil eines großen Objekts gilt das große Objekt. */
function werkzeugKontext(s, ort, x, y, art, r, erg) {
  const h = hauptVon(ort, x, y);
  const stufe = s.spieler.werkzeug[art] || 0;
  return { s, ort, x: h.x, y: h.y, kk: h.kk, o: h.o, erg, r, art, stufe, kraft: 1 + stufe };
}

/** Hacke: Objekte (Artefaktstellen …) überall, Beete nur auf farmbaren Karten. */
export function hacken(s, ort, felder, r = Math.random) {
  const { def, welt: w } = ort;
  const erg = neuesErgebnis();
  erg.n = 0;
  let nichtFarmbar = false;
  for (const [x, y] of felder) {
    const c = werkzeugKontext(s, ort, x, y, 'hacke', r, erg);
    if (c.o) { OBJEKT_TYPEN[c.o.t]?.hacke?.(c); continue; }
    if (!def.farmbar) { nichtFarmbar = true; continue; }
    if (!bodenFlag(def, x, y, B_FARMBAR)) continue;
    if (w.felder[c.kk] || w.belag?.[c.kk] || !begehbar(s, def, w, x, y) || warpAn(def, x, y)) continue;
    w.felder[c.kk] = { nass: regnet(s) };
    erg.n++;
  }
  if (nichtFarmbar && !erg.treffer && !erg.items.length) erg.grund = 'Hier lässt sich nichts anbauen. Dafür ist dein Hof da.';
  return erg;
}

export function giessen(s, ort, felder) {
  const { def, welt: w } = ort;
  const sp = s.spieler;
  const erg = neuesErgebnis();
  const [fx, fy] = felder[0];
  if (istWasser(def, fx, fy)) {
    sp.wasser = KANNE_INHALT[sp.werkzeug.giesskanne || 0];
    erg.gefuellt = true;
    return erg;
  }
  if (sp.wasser <= 0) { erg.leer = true; return erg; }
  erg.n = 0;
  for (const [x, y] of felder) {
    if (sp.wasser <= 0) break;
    const f = w.felder[k(x, y)];
    if (!f) continue;
    f.nass = true;
    sp.wasser--;
    erg.n++;
  }
  return erg;
}

export function saeen(s, ort, x, y, idx) {
  const slot = s.spieler.inv[idx];
  const pid = SAAT_ZU_PFLANZE[slot.id];
  const p = PFLANZEN[pid];
  const f = ort.welt.felder[k(x, y)];
  if (!f) return { grund: ort.def.farmbar ? 'Erst mit der Hacke den Boden lockern.' : null };
  if (f.pflanze) return {};
  const jz = jahreszeit(s);
  if (!ort.def.ganzjaehrig && !p.jz.includes(jz)) {
    return { grund: `${ITEMS[slot.id].name} wachsen nur im ${p.jz.map((j) => JZ_NAME[j]).join(' und ')}.` };
  }
  f.pflanze = { id: pid, tage: 0 };
  entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

export function duengen(s, ort, x, y, idx) {
  const f = ort.welt.felder[k(x, y)];
  if (!f) return { grund: 'Dünger gehört auf ein gelockertes Beet.' };
  if (f.duenger) return { grund: 'Hier ist schon gedüngt.' };
  if (f.pflanze && f.pflanze.tage > 0) return { grund: 'Dünger wirkt nur vor der Aussaat oder direkt danach.' };
  f.duenger = true;
  entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

export const reif = (f) => !!f?.pflanze && !f.pflanze.tot && f.pflanze.tage >= PFLANZEN[f.pflanze.id].tage;

export function qualitaetWuerfeln(lvl, duenger, r = Math.random) {
  const gold = 0.01 + lvl * 0.02 + (duenger ? 0.12 : 0);
  const silber = Math.min(0.75, gold * 2 + (duenger ? 0.15 : 0));
  const z = r();
  return z < gold ? 2 : z < silber ? 1 : 0;
}

export function ernten(s, ort, x, y, r = Math.random) {
  const f = ort.welt.felder[k(x, y)];
  if (!reif(f)) return null;
  const p = f.pflanze;
  const def = PFLANZEN[p.id];
  if (platzFuer(s, { id: def.ernte, n: 1 }) < 1) return { grund: 'Dein Rucksack ist voll.', items: [] };
  const erg = neuesErgebnis();
  const q = mod('ernteQualitaet', qualitaetWuerfeln(stufeWirksam(s, 'landwirtschaft'), f.duenger, r), { s, ort, x, y, feld: f, pflanze: def });
  let n = def.menge;
  if (def.extra && r() < def.extra) n++;
  geben(s, ort, x, y, { id: def.ernte, n: 1, q }, erg);
  if (n > 1) geben(s, ort, x, y, { id: def.ernte, n: n - 1 }, erg);
  xpGeben(s, 'landwirtschaft', 16 * Math.log(0.018 * ITEMS[def.ernte].preis + 1), erg);
  if (def.nach) p.tage = def.tage - def.nach;
  else f.pflanze = null;
  s.stats.geerntet += n;
  erg.ok = true;
  return erg;
}

// Werkzeuge auf Objekten: was passiert, entscheidet der Objekttyp (daten.js: objektTyp).

export function axtHieb(s, ort, x, y, r = Math.random) {
  const erg = neuesErgebnis();
  const c = werkzeugKontext(s, ort, x, y, 'axt', r, erg);
  if (c.o) OBJEKT_TYPEN[c.o.t]?.axt?.(c);
  return erg;
}

export function spitzhackeHieb(s, ort, x, y, r = Math.random) {
  const erg = neuesErgebnis();
  const c = werkzeugKontext(s, ort, x, y, 'spitzhacke', r, erg);
  if (!c.o) {
    const b = ort.welt.belag?.[c.kk];
    if (b) {
      const item = BELAG_TYPEN[b.t]?.item;
      delete ort.welt.belag[c.kk];
      if (item && ITEMS[item]) geben(s, ort, x, y, { id: item, n: 1 }, erg);
      erg.treffer = 'aufheben';
      return erg;
    }
    const f = ort.welt.felder[c.kk];
    if (f && !f.pflanze) {
      delete ort.welt.felder[c.kk];
      erg.treffer = 'erde';
    }
    return erg;
  }
  OBJEKT_TYPEN[c.o.t]?.spitzhacke?.(c);
  return erg;
}

/** Sense (oder Waffe) im Bogen: Objekte nach ihrem Typ, verwelkte Pflanzen weg. */
export function senseSchnitt(s, ort, felder, r = Math.random, art = 'sense') {
  const w = ort.welt;
  const erg = neuesErgebnis();
  erg.n = 0;
  for (const [x, y] of felder) {
    const c = werkzeugKontext(s, ort, x, y, art, r, erg);
    if (c.o && OBJEKT_TYPEN[c.o.t]?.[art]?.(c)) erg.n++;
    const f = w.felder[c.kk];
    if (f?.pflanze?.tot) {
      f.pflanze = null;
      erg.n++;
    }
  }
  return erg;
}

/** Aufgestelltes wieder einsammeln (Axt/Spitzhacke). Für Objekttypen wie Truhe oder Glas. */
export function aufheben(c) {
  const { s, ort, x, y, o, erg } = c;
  const typ = OBJEKT_TYPEN[o.t];
  const grund = typ?.nichtLeer?.(o);
  if (grund) { erg.grund = grund; return true; }
  const id = typ?.item ?? o.t;
  if (platzFuer(s, { id, n: 1 }) < 1) { erg.grund = 'Dein Rucksack ist voll.'; return true; }
  objektEntfernen(ort, x, y);
  geben(s, ort, x, y, { id, n: 1 }, erg);
  erg.treffer = 'aufheben';
  return true;
}

/**
 * Gegenstand aus der Hand aufstellen. Erlaubt auf farmbaren Karten und Karten mit `aufstellen: true`
 * auf freien Feldern; der Objekttyp darf mit platz(ctx) eigene Regeln haben (true = erlaubt,
 * Text = abgelehnt, undefined = Standard). Große Objekte (flaeche) brauchen ihre ganze Fläche.
 */
export function aufstellen(s, ort, x, y, idx) {
  const slot = s.spieler.inv[idx];
  const it = ITEMS[slot.id];
  const { def, welt: w } = ort;
  const t = typeof it.aufstellbar === 'string' ? it.aufstellbar : slot.id;
  const typ = OBJEKT_TYPEN[t];
  const [b, h] = typ?.flaeche || [1, 1];
  const kk = k(x, y);
  const eigen = typ?.platz?.({ s, ort, x, y, kk, slot, it });
  if (typeof eigen === 'string') return { grund: eigen };
  if (eigen === true) {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < b; dx++) if (w.objekte[k(x + dx, y + dy)]) return { grund: 'Hier ist kein Platz.' };
  } else {
    if (!def.farmbar && !def.aufstellen) return { grund: 'Das kannst du nur auf deinem Hof aufstellen.' };
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < b; dx++) {
      const fk = k(x + dx, y + dy);
      if (w.objekte[fk] || w.felder[fk] || !begehbar(s, def, w, x + dx, y + dy) || warpAn(def, x + dx, y + dy)) return { grund: 'Hier ist kein Platz.' };
    }
  }
  const o = { t };
  typ?.anlegen?.(o, slot);
  objektSetzen(ort, x, y, o);
  entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

/** Bodenbelag aus der Hand legen (Item mit `belag: 'typ'`): wie Aufstellen, aber begehbar und unter Objekten. */
export function belagLegen(s, ort, x, y, idx) {
  const slot = s.spieler.inv[idx];
  const t = ITEMS[slot.id]?.belag;
  const { def, welt: w } = ort;
  if (!BELAG_TYPEN[t]) return { grund: null };
  if (!def.farmbar && !def.aufstellen) return { grund: 'Das kannst du nur auf deinem Hof legen.' };
  const kk = k(x, y);
  if (w.belag[kk] || w.objekte[kk] || w.felder[kk] || !begehbar(s, def, w, x, y) || warpAn(def, x, y)) return { grund: 'Hier ist kein Platz.' };
  w.belag[kk] = { t };
  entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

/** Sammelfund (Objekt „sammel" mit id) aufheben. */
export function aufsammeln(s, ort, x, y, r = Math.random) {
  const o = ort.welt.objekte[k(x, y)];
  if (!o || o.t !== 'sammel') return null;
  if (platzFuer(s, { id: o.id, n: 1 }) < 1) return { grund: 'Dein Rucksack ist voll.', items: [] };
  const erg = neuesErgebnis();
  const it = ITEMS[o.id];
  let q = 0;
  if (it.kat === 'sammel') {
    const lvl = stufeWirksam(s, 'sammeln');
    const z = r();
    q = z < lvl * 0.02 ? 2 : z < lvl * 0.07 ? 1 : 0;
  }
  delete ort.welt.objekte[k(x, y)];
  geben(s, ort, x, y, { id: o.id, n: 1, q }, erg);
  xpGeben(s, it.xp?.[0] ?? (it.kat === 'tier' ? 'landwirtschaft' : 'sammeln'), it.xp?.[1] ?? (it.kat === 'tier' ? 5 : 7), erg);
  erg.ok = true;
  return erg;
}

export function essen(s, idx) {
  const slot = s.spieler.inv[idx];
  if (!essbar(slot)) return null;
  const sp = s.spieler;
  const it = ITEMS[slot.id];
  const e = energieVon(slot);
  const name = nameVon(slot);
  const g = typeof it.gesundheit === 'function' ? it.gesundheit(slot) : it.gesundheit ?? Math.round(e * 0.45);
  sp.energie = Math.min(sp.maxEnergie, sp.energie + e);
  sp.hp = Math.min(sp.maxHp, sp.hp + g);
  if (it.tempo) sp.tempoBis = s.zeit.minute + it.tempo;
  entfernenAusSlot(s, idx, 1);
  alle('gegessen', s, slot);
  return { energie: e, name, tempo: !!it.tempo };
}

// ─── Versand und Truhen ─────────────────────────────────────────────────────

export function versenden(s, idx) {
  const slot = s.spieler.inv[idx];
  if (!slot || !verkaufbar(slot)) return null;
  s.spieler.inv[idx] = null;
  const rest = inBehaelter(s.versand, slot);
  if (rest > 0) s.versand.push(slotKopie(slot, rest));
  s.versandLetztes = slotKopie(slot, slot.n);
  return slot;
}

export function versandZurueck(s) {
  const slot = s.versandLetztes;
  if (!slot) return null;
  const i = s.versand.findIndex((x) => x && gleich(x, slot));
  if (i < 0) return null;
  const stapel = s.versand[i];
  const n = Math.min(slot.n, stapel.n);
  const rest = hinzufuegen(s, slotKopie(stapel, n));
  stapel.n -= n - rest;
  if (stapel.n <= 0) s.versand.splice(i, 1);
  s.versandLetztes = null;
  return true;
}

export const versandWert = (s) => s.versand.reduce((g, x) => g + preisVon(x, s) * x.n, 0);

/** Verschiebt einen ganzen Stapel zwischen Rucksack und Truhe. */
export function umlagern(von, idx, nach) {
  const slot = von[idx];
  if (!slot) return;
  const rest = inBehaelter(nach, slot);
  if (rest <= 0) von[idx] = null;
  else slot.n = rest;
}

// ─── Tageswechsel ───────────────────────────────────────────────────────────

export function wetterWuerfeln(s, r = Math.random) {
  let tag = s.zeit.tag + 1;
  let jz = s.zeit.jz;
  if (tag > TAGE_PRO_JZ) { tag = 1; jz = (jz + 1) % 4; }
  if (tag === 1 || tagNr(s.zeit) + 1 <= 3) return 'sonne';
  const j = JZ[jz];
  const z = r();
  if (j === 'winter') return z < 0.3 ? 'schnee' : 'sonne';
  const regen = { fruehling: 0.2, sommer: 0.12, herbst: 0.22 }[j];
  const sturm = { fruehling: 0.03, sommer: 0.08, herbst: 0.04 }[j];
  return z < sturm ? 'sturm' : z < sturm + regen ? 'regen' : 'sonne';
}

/** Sammelfunde, die in einer Zone dieser Art wachsen (Item-Feld `fundort`: Text oder Liste, Standard „wald"). */
export function sammelPool(art, jz) {
  return Object.values(ITEMS)
    .filter((i) => i.kat === 'sammel' && [].concat(i.fundort ?? 'wald').includes(art) && (!i.jz || i.jz.includes(jz)))
    .map((i) => i.id);
}

export function sammelSpawnen(s, id, r, anzahlNeu) {
  const def = karteHolen(id, s);
  const w = welt(s, id);
  const jz = jahreszeit(s);
  if (!def.sammel.length) return;
  const da = def.sammel.map(() => 0);
  for (const [kk, o] of Object.entries(w.objekte)) {
    if (o.t !== 'sammel' || !o.wild) continue;
    const [x, y] = ausK(kk);
    def.sammel.forEach((zone, i) => { if (imBereich(zone, x, y)) da[i]++; });
  }
  def.sammel.forEach((zone, zi) => {
    const pool = sammelPool(zone.art, jz);
    if (!pool.length) return;
    const zielBoden = zone.boden ?? (zone.art === 'strand' ? 's' : '.');
    let n = Math.min(anzahlNeu, zone.max - da[zi]);
    for (let versuch = 0; versuch < 60 && n > 0; versuch++) {
      const x = zone.x + Math.floor(r() * zone.w);
      const y = zone.y + Math.floor(r() * zone.h);
      if (boden(def, x, y) !== zielBoden) continue;
      const kk = k(x, y);
      if (w.objekte[kk] || w.felder[kk] || w.belag?.[kk] || !begehbar(s, def, w, x, y)) continue;
      let wahl = waehle(r, pool);
      if (ITEMS[wahl].selten && r() > 0.25) wahl = waehle(r, pool.filter((p) => !ITEMS[p].selten));
      w.objekte[kk] = { t: 'sammel', id: wahl, wild: true };
      n--;
    }
  });
}

export function postFuerHeute(s) {
  const heute = tagNr(s.zeit);
  const jz = jahreszeit(s);
  const post = [];
  for (const b of BRIEFE) {
    if (b.start) continue;
    if (b.tagNr && b.tagNr <= heute && !s.briefe.includes(b.id)) post.push(b.id);
    if (b.wann && !s.briefe.includes(b.id) && b.wann(s)) post.push(b.id);
    const jahresId = `${b.id}_${s.zeit.jahr}`;
    if (b.jz && b.jz === jz && b.tag === s.zeit.tag && !s.briefe.includes(jahresId)) post.push(jahresId);
  }
  return post;
}

export function briefGelesen(s, id) {
  if (!s.briefe.includes(id)) s.briefe.push(id);
  s.post = s.post.filter((p) => p !== id);
}

export function briefVon(id) {
  return BRIEFE.find((b) => b.id === id || id.startsWith(`${b.id}_`));
}

/**
 * Die Nacht: Versand auszahlen, Kalender und Wetter weiter, Pflanzen wachsen lassen,
 * Regen, Objekte über Nacht (Sprenger, Gläser …), dann der Hook `tagEnde` der Bereiche,
 * Sammelfunde, Post und am Ende `morgen`. Gibt einen Bericht für den Tagesabschluss zurück:
 * { verkauf, summe, meldungen, stufen, jzWechsel, nachtMinuten, wahlen, ohnmacht }.
 * `nachtMinuten`: verschlafene Minuten bis 6 Uhr. `wahlen`: Fenster, die vor dem Morgen
 * nacheinander aufgehen ({ fenster, daten }, Bereiche hängen sie im Hook tagEnde an).
 */
export function tagBeenden(s, { ohnmacht = false, r = Math.random } = {}) {
  const sp = s.spieler;
  const bericht = { verkauf: [], summe: 0, meldungen: [], stufen: [], wahlen: [] };
  bericht.nachtMinuten = Math.max(0, TAG_BEGINN + 1440 - s.zeit.minute);

  for (const slot of s.versand) {
    const preis = preisVon(slot, s) * slot.n;
    bericht.summe += preis;
    bericht.verkauf.push({ slot, preis });
  }
  sp.gold += bericht.summe;
  s.stats.verdient += bericht.summe;
  s.versand = [];
  s.versandLetztes = null;

  if (ohnmacht) {
    const verlust = Math.min(1000, Math.floor(sp.gold * 0.1));
    sp.gold -= verlust;
    bericht.ohnmacht = verlust;
  }

  const z = s.zeit;
  const alteJz = z.jz;
  z.tag++;
  if (z.tag > TAGE_PRO_JZ) {
    z.tag = 1;
    z.jz++;
    if (z.jz > 3) { z.jz = 0; z.jahr++; }
  }
  const neueJz = JZ[z.jz];
  const jzWechsel = z.jz !== alteJz;
  bericht.jzWechsel = jzWechsel;
  z.minute = TAG_BEGINN;
  z.wetter = z.morgen;
  z.morgen = wetterWuerfeln(s, r);

  // Pflanzen auf allen Karten mit Beeten
  let verwelkt = 0;
  for (const [id, w] of Object.entries(s.welt)) {
    const def = karteHolen(id, s);
    if (!def) continue;
    const ort = { def, welt: w };
    for (const [kk, f] of Object.entries(w.felder)) {
      const p = f.pflanze;
      if (p && !p.tot) {
        const pd = PFLANZEN[p.id];
        if (f.nass && p.tage < pd.tage) p.tage = Math.min(pd.tage, p.tage + mod('wachstum', 1, { s, ort, feld: f, pflanze: pd }));
        if (jzWechsel && def.aussen && !def.ganzjaehrig && !pd.jz.includes(neueJz)) { p.tot = true; verwelkt++; }
      }
      if (!f.pflanze && !f.nass && r() < 0.1) { delete w.felder[kk]; continue; }
      f.nass = false;
    }
  }
  if (jzWechsel) {
    bericht.meldungen.push(`Der ${JZ_NAME[neueJz]} beginnt.`);
    if (verwelkt) bericht.meldungen.push(`${verwelkt} ${verwelkt === 1 ? 'Pflanze ist' : 'Pflanzen sind'} über Nacht verwelkt – sie wachsen nicht im ${JZ_NAME[neueJz]}.`);
  }

  // Regen und Objekte über Nacht
  for (const [id, w] of Object.entries(s.welt)) {
    const def = karteHolen(id, s);
    if (!def) continue;
    if (regnet(s) && def.aussen) for (const f of Object.values(w.felder)) f.nass = true;
    const ort = { def, welt: w };
    for (const [kk, o] of Object.entries(w.objekte)) {
      const typ = OBJEKT_TYPEN[o.t];
      if (!typ?.nacht) continue;
      const [x, y] = ausK(kk);
      typ.nacht({ s, ort, x, y, kk, o, bericht, r, nachtMinuten: bericht.nachtMinuten });
    }
  }

  alle('tagEnde', s, bericht, r);
  // Bereiche ändern über Nacht dynamische Gebäude, Deko und Objekte (Ställe fertig, Feste …)
  kartenGeaendert();

  if (jzWechsel) {
    for (const w of Object.values(s.welt)) {
      for (const [kk, o] of Object.entries(w.objekte)) if (o.t === 'sammel' && o.wild && ITEMS[o.id]?.saisonal !== false) delete w.objekte[kk];
    }
  }
  for (const def of Object.values(KARTEN)) if (def.sammel.length) sammelSpawnen(s, def.id, r, 2);

  for (const n of Object.values(s.npcs)) { n.gesprochen = false; n.beschenkt = false; }
  s.post = postFuerHeute(s);
  z.glueck = mod('glueck', 0, { s, r });

  werteAktualisieren(s);
  sp.energie = ohnmacht ? Math.round(sp.maxEnergie / 2) : sp.maxEnergie;
  sp.hp = sp.maxHp;
  sp.tempoBis = 0;

  bericht.stufen = s.stufeNeu;
  s.stufeNeu = [];
  s.stats.tage++;
  alle('morgen', s, bericht);
  kartenGeaendert();
  const z2 = zuhause(s);
  Object.assign(sp, { karte: z2.karte, x: z2.x, y: z2.y, blick: z2.blick });
  return bericht;
}

// ─── Dorfbewohner ───────────────────────────────────────────────────────────

export const herzen = (s, id) => Math.floor(s.npcs[id].punkte / PUNKTE_PRO_HERZ);
export function geburtstagHeute(s, id) {
  const g = NPCS[id].geburtstag;
  return jahreszeit(s) === g.jz && s.zeit.tag === g.tag;
}
export const textErsetzen = (s, t) => t.replaceAll('{name}', s.spieler.name).replaceAll('{hof}', s.spieler.hof);
/** Freundschaftspunkte ändern (auf 0 … MAX_PUNKTE begrenzt). */
export const freundschaft = (s, id, punkte) => {
  const st = s.npcs[id];
  st.punkte = Math.max(0, Math.min(MAX_PUNKTE, st.punkte + punkte));
};

export function gespraech(s, id, ort, r = Math.random) {
  const sonder = erster('gespraech', { s, id, ort, r });
  if (sonder) return sonder;
  const n = NPCS[id];
  const st = s.npcs[id];
  const erg = { texte: [], items: [] };
  const px = s.spieler.x;
  const py = s.spieler.y;
  if (st.gesprochen) {
    erg.texte.push(textErsetzen(s, waehle(r, n.zeilen.wieder)));
    return erg;
  }
  st.gesprochen = true;
  freundschaft(s, id, 20);
  const h = herzen(s, id);
  const offen = [2, 4, 6, 8, 10].find((l) => h >= l && !st.herzGesehen.includes(l));
  let text;
  if (offen) {
    text = n.zeilen.herz[offen];
    st.herzGesehen.push(offen);
  } else if (regnet(s) && n.zeilen.regen && r() < 0.5) {
    text = waehle(r, n.zeilen.regen);
  } else if (r() < 0.35) {
    text = waehle(r, n.zeilen[jahreszeit(s)]);
  } else {
    const liste = n.zeilen.allgemein;
    text = liste[(tagNr(s.zeit) + Object.keys(NPCS).indexOf(id)) % liste.length];
  }
  erg.texte.push(textErsetzen(s, text));
  if (geburtstagHeute(s, id)) erg.texte.push('Heute ist übrigens mein Geburtstag.');
  for (const [lvl, g] of Object.entries(n.herzGeschenk || {})) {
    if (h >= Number(lvl) && !st.herzGeschenke.includes(Number(lvl))) {
      st.herzGeschenke.push(Number(lvl));
      geben(s, ort, px, py, { id: g.id, n: g.n }, erg);
    }
  }
  return erg;
}

export function reaktion(id, slot) {
  const n = NPCS[id];
  const kat = `kat:${ITEMS[slot.id].kat}`;
  const arten = ['liebt', 'hasst', 'mag', 'magNicht'];
  for (const art of arten) if ((n[art] || []).includes(slot.id)) return art;
  for (const art of arten) if ((n[art] || []).includes(kat)) return art;
  return 'neutral';
}

export const verschenkbar = (slot) => !!slot && ITEMS[slot.id].kat !== 'werkzeug' && ITEMS[slot.id].verschenkbar !== false;

export function schenken(s, id, idx) {
  const st = s.npcs[id];
  const slot = s.spieler.inv[idx];
  if (!verschenkbar(slot)) return null;
  if (st.beschenkt) return { grund: `Du hast ${NPCS[id].name} heute schon etwas geschenkt.` };
  const art = reaktion(id, slot);
  const gb = geburtstagHeute(s, id);
  let punkte = GESCHENK_PUNKTE[art];
  if (gb) punkte *= 8;
  freundschaft(s, id, punkte);
  st.beschenkt = true;
  entfernenAusSlot(s, idx, 1);
  const gut = art === 'liebt' || art === 'mag' || art === 'neutral';
  const text = gb && gut ? NPCS[id].zeilen.geburtstag : NPCS[id].antwort[art];
  return { art, text: textErsetzen(s, text), punkte };
}

// ─── Pläne und Wege der Dorfbewohner ────────────────────────────────────────

/** Plan-Eintrag [zeit, karte, punkt] oder [zeit, karte, x, y] → { karte, x, y }; null = zu Hause. */
export function planZiel(eintrag) {
  const [, karte, a, b] = eintrag;
  if (!karte) return null;
  if (typeof a === 'string') {
    const z = zielVon({ karte, punkt: a });
    return { karte, x: z.x, y: z.y };
  }
  return { karte, x: a, y: b };
}

/** Wo jemand wohnt: heim { karte, punkt } (oder { karte, x, y }). */
export function npcHeim(id) {
  const h = NPCS[id].heim;
  const z = zielVon(h);
  return { karte: z.karte, x: z.x, y: z.y };
}

/** Der Tagesplan; der Hook `npcPlan` darf ihn ersetzen (Feste, Ehe). */
export function npcTagesplan(s, id) {
  const n = NPCS[id];
  return erster('npcPlan', n, s) ?? ((regnet(s) && n.plan.regen) || n.plan.normal);
}

/** Folge von Karten-Übergängen von → nach (Breitensuche über verbindungen()). */
export function kartenWeg(s, von, nach) {
  const vorher = { [von]: null };
  const offen = [von];
  const v = verbindungen();
  while (offen.length) {
    const kk = offen.shift();
    if (kk === nach) break;
    for (const l of v) {
      if (l.von !== kk || l.nach in vorher) continue;
      if (karteHolen(l.nach, s)?.npcWege === false || !erfuellt(s, l.nurWenn) || !erfuellt(s, l.npcWenn)) continue;
      vorher[l.nach] = l;
      offen.push(l.nach);
    }
  }
  if (!(nach in vorher)) return null;
  const weg = [];
  for (let kk = nach; vorher[kk]; kk = vorher[kk].von) weg.unshift(vorher[kk]);
  return weg;
}

/** Kürzester Weg auf einer Karte (Felder ohne Start, mit Ziel); das Ziel darf blockiert sein. */
export function feldWeg(s, kartenId, sx, sy, zx, zy) {
  const def = karteHolen(kartenId, s);
  const W = def.w;
  const H = def.h;
  if (sx < 0 || sy < 0 || sx >= W || sy >= H || zx < 0 || zy < 0 || zx >= W || zy >= H) return null;
  const frei = begehbarPruefer(s, def, s.welt[kartenId]);
  const start = sy * W + sx;
  const ziel = zy * W + zx;
  const vorher = new Int32Array(W * H).fill(-1);
  vorher[start] = start;
  const offen = new Int32Array(W * H);
  let kopf = 0;
  let ende = 0;
  offen[ende++] = start;
  const SCHRITTE = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (kopf < ende) {
    const i = offen[kopf++];
    if (i === ziel) break;
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of SCHRITTE) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (vorher[j] !== -1) continue;
      if (j !== ziel && !frei(nx, ny)) continue;
      vorher[j] = i;
      offen[ende++] = j;
    }
  }
  if (vorher[ziel] === -1) return null;
  const weg = [];
  for (let i = ziel; i !== start; i = vorher[i]) weg.push([i % W, Math.floor(i / W)]);
  return weg.reverse();
}

/**
 * Weg von { karte, x, y } nach { karte, x, y }: Schritte { x, y } und Kartenwechsel
 * { sprung: { karte, x, y } }. `ok` ist false, wenn ein Stück fehlt und gesprungen wird.
 */
export function wegPlanen(s, von, ziel) {
  const schritte = [];
  let karte = von.karte;
  let { x, y } = von;
  const sprung = { sprung: { karte: ziel.karte, x: ziel.x, y: ziel.y } };
  if (karte !== ziel.karte) {
    const links = kartenWeg(s, karte, ziel.karte);
    if (!links) return { schritte: [sprung], ok: false };
    for (const l of links) {
      const weg = feldWeg(s, karte, x, y, l.x, l.y);
      if (!weg) return { schritte: [sprung], ok: false };
      for (const [fx, fy] of weg) schritte.push({ x: fx, y: fy });
      schritte.push({ sprung: { karte: l.nach, x: l.zx, y: l.zy } });
      karte = l.nach;
      x = l.zx;
      y = l.zy;
    }
  }
  const weg = feldWeg(s, karte, x, y, ziel.x, ziel.y);
  if (!weg) return { schritte: [...schritte, sprung], ok: false };
  for (const [fx, fy] of weg) schritte.push({ x: fx, y: fy });
  return { schritte, ok: true };
}

// ─── Basteln und Läden ──────────────────────────────────────────────────────

/** Gibt es Ergebnis und alle Zutaten als Gegenstand? (Fremde IDs fehlen, bis alles zusammengeführt ist.) */
export const rezeptVollstaendig = (r) => !!ITEMS[r.ergebnis ?? r.id] && Object.keys(r.zutaten).every((id) => ITEMS[id]);
/** Rezepte einer Art ('basteln', 'kochen'), ohne unvollständige. */
export const rezepteVon = (art) => REZEPTE.filter((r) => (r.art ?? 'basteln') === art && rezeptVollstaendig(r));

export function rezeptFrei(s, r) {
  if (s.rezepte?.includes(r.id)) return true;
  if (r.frei) return !!r.frei(s);
  if (r.stufe) return stufe(s, r.stufe[0]) >= r.stufe[1];
  return !r.lernen;
}
/** Ein Rezept lernen (Fernsehen, Briefe, Belohnungen). Gibt true zurück, wenn es neu war. */
export function rezeptLernen(s, id) {
  s.rezepte ??= [];
  if (s.rezepte.includes(id)) return false;
  s.rezepte.push(id);
  return true;
}
export const kannBasteln = (s, r) => rezeptVollstaendig(r) && rezeptFrei(s, r) && Object.entries(r.zutaten).every(([id, n]) => anzahl(s, id) >= n);

export function basteln(s, rezept) {
  if (!kannBasteln(s, rezept)) return null;
  const slot = { id: rezept.ergebnis ?? rezept.id, n: rezept.menge || 1 };
  if (platzFuer(s, slot) < slot.n) return { grund: 'Kein Platz im Rucksack.' };
  for (const [id, n] of Object.entries(rezept.zutaten)) entfernen(s, id, n);
  hinzufuegen(s, slot);
  return { ok: true, slot };
}

/** Wo die Theke eines Ladens ist: { karte, x, y }. */
export function ladenOrt(ladenId) {
  const z = zielVon(LAEDEN[ladenId].ort);
  return { karte: z.karte, x: z.x, y: z.y };
}

/**
 * Was ein Laden heute anbietet: seine eigene Ware plus die aus dem Hook ladenWare(ladenId, s)
 * (Ware anderer Bereiche in fremden Läden), sortiert nach `reihe` (Standard 50). Spezialwaren
 * bekommen den Laden mit; Ware mit fehlendem Gegenstand wird ausgeblendet.
 */
export function ladenWare(s, ladenId) {
  const L = LAEDEN[ladenId];
  const quelle = [...(typeof L.ware === 'function' ? L.ware(s) : L.ware), ...sammle('ladenWare', ladenId, s)];
  const liste = [];
  for (const w of quelle) {
    if (w.bedingung && !erfuellt(s, w.bedingung)) continue;
    if (w.spezial) {
      const sw = SPEZIAL_WARE[w.spezial];
      if (!sw) continue;
      if (sw.angebote) { liste.push(...sw.angebote(s, w, ladenId).filter((a) => !a.id || ITEMS[a.id])); continue; }
      if (sw.verfuegbar && !sw.verfuegbar(s, w, ladenId)) continue;
      const { id, kaufen: _k, verfuegbar: _v, angebote: _a, ...vorgabe } = sw;
      liste.push({ ...vorgabe, ...w });
      continue;
    }
    if (w.id && !ITEMS[w.id]) continue;
    liste.push({ ...w });
  }
  return liste.map((w, i) => [w, i]).sort((a, b) => (a[0].reihe ?? 50) - (b[0].reihe ?? 50) || a[1] - b[1]).map(([w]) => w);
}

export function kaufen(s, ware, n = 1) {
  const sp = s.spieler;
  const kosten = ware.preis * n;
  if (sp.gold < kosten) return { grund: 'Dafür reicht dein Geld nicht.' };
  for (const [id, m] of Object.entries(ware.zutaten || {})) {
    if (anzahl(s, id) < m * n) return { grund: `Dafür brauchst du ${m * n}× ${ITEMS[id].name}.` };
  }
  let text;
  if (ware.spezial) {
    const e = SPEZIAL_WARE[ware.spezial]?.kaufen?.(s, { ware, n });
    if (e?.grund) return e;
    text = e?.text;
  } else if (ware.id) {
    if (platzFuer(s, { id: ware.id, n }) < n) return { grund: 'Kein Platz im Rucksack.' };
    hinzufuegen(s, { id: ware.id, n });
  }
  for (const [id, m] of Object.entries(ware.zutaten || {})) entfernen(s, id, m * n);
  sp.gold -= kosten;
  return { ok: true, text };
}

/** Kategorien, die ein Laden ankauft: eigene plus Hook ladenKauft(ladenId). */
export const kauftKategorien = (ladenId) => [...LAEDEN[ladenId].kauft, ...sammle('ladenKauft', ladenId)];

export function kauftLaden(ladenId, slot) {
  return !!slot && kauftKategorien(ladenId).includes(ITEMS[slot.id].kat) && verkaufbar(slot);
}

export function verkaufen(s, ladenId, idx, n = 1) {
  const slot = s.spieler.inv[idx];
  if (!kauftLaden(ladenId, slot)) return null;
  n = Math.min(n, slot.n);
  const gold = preisVon(slot, s) * n;
  s.spieler.gold += gold;
  s.stats.verdient += gold;
  entfernenAusSlot(s, idx, n);
  return { gold };
}

// ─── Speichern ──────────────────────────────────────────────────────────────

export function serialisieren(s) {
  return JSON.stringify(s);
}

export function deserialisieren(text) {
  const s = JSON.parse(text);
  if (!s || s.version !== SPEICHER_VERSION || !s.spieler || !s.zeit) throw new Error('Dieser Spielstand passt nicht zu dieser Version.');
  ergaenzen(s);
  return s;
}

export { zufall };
