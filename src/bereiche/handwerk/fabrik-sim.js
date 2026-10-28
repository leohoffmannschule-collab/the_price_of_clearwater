// Bereich „handwerk" – Fabrik: die Simulation. DOM-frei und deterministisch (kein Zufall).
//
// Zustand liegt ausschließlich als Zahlen und kleine Listen in den Objekten der Karte (Format v2):
//   Band        { t: 'foerderband', r, w: [{ id, p, q?, von? }…] }  p = Lage 0..1 im Feld, vorderste Ware zuerst
//   Splitter    { t: 'splitter', r, pf, z, nx }                       pf = gehaltene Ware, z = Rest der Haltezeit
//   Zusammenf.  { t: 'zusammenfuehrer', r, pf, z, nx }
//   Maschinen   { t, r, ein: { id: n }, aus: { id: n }, arb, f, st, dr, … }  (Bohrer zusätzlich erz, rein)
//   Lager       { t: 'lager', r, inv: [Fach…] }
// r = Ausgangsrichtung 0..3 (oben, rechts, unten, links). Waren gehen nie verloren: kann ein Ziel nichts
// annehmen, bleibt die Ware liegen (Rückstau).
//
// Schritt: erst die Maschinen (arbeiten, abgeben), dann Bänder, Splitter und Zusammenführer in der Reihenfolge
// „stromabwärts zuerst". Nachholen: derselbe Schritt in größeren Stücken (FABRIK.nachholSchritt).

import { ITEMS } from '../../daten.js';
import * as L from '../../logik.js';
import { mod } from '../../system.js';
import { FABRIK, MASCHINEN, FABRIK_TYPEN, BAND, SPLITTER, MERGER, DX, DY, SORTEN, bandTempoVon } from './fabrik-daten.js';

const CACHES = new WeakMap();
let aenderung = 1;
/** Meldet, dass sich Fabrikobjekte geändert haben (aufgestellt, gedreht, entfernt): Verbindungen neu berechnen. */
export const fabrikAenderung = () => { aenderung++; };
/** Stand der Änderungen (für Caches anderer Fabrik-Dateien: Strom, Rohrleitungen). */
export const aenderungsStand = () => aenderung;

/**
 * Erweiterung: fn(s, ort, dt, c) läuft zu Beginn jedes Schritts, vor Bändern und Maschinen (auch beim Nachholen und auf
 * Karten ohne Bänder). Strom (Leistung, Sicherung) und Rohrleitungen (Wasser) rechnen so im selben Takt wie die Fabrik.
 */
const VORHER = [];
export function fabrikSchrittVorher(fn) { VORHER.push(fn); }

const hinten = (r) => (r + 2) % 4;

// ─── Verbindungen (Cache je Karte) ──────────────────────────────────────────

function hauptAn(welt, kk) {
  const o = welt.objekte[kk];
  if (!o) return null;
  return o.t === 'teil' ? welt.objekte[o.haupt] ?? null : o;
}

/** Gibt das Objekt am Nachbarfeld seine Ware in Richtung `rz` ab (also auf uns zu)? */
function gibtAb(o, rz) {
  if (!o) return false;
  if (o.t === SPLITTER) return rz !== hinten(o.r);
  return FABRIK_TYPEN.has(o.t) && o.r === rz;
}

/** Felder direkt vor der Ausgangsseite (Richtung r) einer Maschine ab (x, y) mit Fläche n×n. */
function randFelder(x, y, n, r) {
  const liste = [];
  for (let i = 0; i < n; i++) {
    if (r === 0) liste.push(L.k(x + i, y - 1));
    else if (r === 1) liste.push(L.k(x + n, y + i));
    else if (r === 2) liste.push(L.k(x + i, y + n));
    else liste.push(L.k(x - 1, y + i));
  }
  return liste;
}

function bauen(s, ort) {
  const { welt, def } = ort;
  const c = { ver: aenderung, welt, def, s, ort, alter: 0, fluss: [], maschinen: [], versand: new Set(), leistung: 0, anzahl: 0, tempoMax: FABRIK.bandTempo };
  const flussKnoten = new Map();
  for (const kk in welt.objekte) {
    const o = welt.objekte[kk];
    if (!FABRIK_TYPEN.has(o.t)) continue;
    const [x, y] = L.ausK(kk);
    o.r = ((o.r | 0) + 4) % 4;
    const n = { o, x, y, kk, t: o.t };
    c.anzahl++;
    if (o.t === BAND || o.t === SPLITTER || o.t === MERGER) {
      n.zk = L.k(x + DX[o.r], y + DY[o.r]);
      if (o.t === BAND) c.tempoMax = Math.max(c.tempoMax, bandTempoVon(o));
      flussKnoten.set(kk, n);
    } else {
      const f = MASCHINEN[o.t].flaeche[0];
      n.rand = randFelder(x, y, f, o.r);
      c.maschinen.push(n);
      c.leistung += MASCHINEN[o.t].leistung || 0;
    }
  }
  // Kurven: ein Band, das nur von einer Seite gespeist wird (nichts davor), ist eine Kurve (kv = -1 links, +1 rechts)
  for (const n of flussKnoten.values()) {
    if (n.t !== BAND) continue;
    const { o, x, y } = n;
    const vor = (dir) => hauptAn(welt, L.k(x + DX[dir], y + DY[dir]));
    const speist = (dir) => gibtAb(vor(dir), hinten(dir));
    const dahinter = speist(hinten(o.r));
    const links = speist((o.r + 3) % 4);
    const rechts = speist((o.r + 1) % 4);
    o.kv = !dahinter && links !== rechts ? (links ? -1 : 1) : 0;
  }
  // Reihenfolge: stromabwärts zuerst (Nachfolger vor Vorgänger), Zyklen werden gebrochen
  const zustand = new Map();
  for (const start of flussKnoten.values()) {
    if (zustand.has(start.kk)) continue;
    const stapel = [start];
    zustand.set(start.kk, 1);
    while (stapel.length) {
      const n = stapel[stapel.length - 1];
      const nachfolger = [];
      if (n.t === SPLITTER) {
        for (const d of [n.o.r, (n.o.r + 3) % 4, (n.o.r + 1) % 4]) nachfolger.push(L.k(n.x + DX[d], n.y + DY[d]));
      } else nachfolger.push(n.zk);
      let weiter = null;
      for (const kk of nachfolger) {
        const m = flussKnoten.get(kk);
        if (m && !zustand.has(kk)) { weiter = m; break; }
      }
      if (weiter) { zustand.set(weiter.kk, 1); stapel.push(weiter); } else { stapel.pop(); zustand.set(n.kk, 2); c.fluss.push(n); }
    }
  }
  for (const d of L.dekoListe(s, def)) {
    if (d.typ !== 'versandkiste') continue;
    for (let dy = 0; dy < (d.h || 1); dy++) for (let dx = 0; dx < (d.w || 1); dx++) c.versand.add(L.k(d.x + dx, d.y + dy));
  }
  return c;
}

/** Verbindungen der Karte (gecacht; neu bei Änderung und alle 120 Schritte zur Sicherheit). */
export function cacheVon(s, ort) {
  let c = CACHES.get(ort.welt);
  if (c && c.ver === aenderung && c.def === ort.def && c.s === s && c.alter < 120) { c.alter++; return c; }
  c = bauen(s, ort);
  CACHES.set(ort.welt, c);
  return c;
}

/** Gibt es Fabrikobjekte auf der Karte? */
export const hatFabrik = (s, ort) => cacheVon(s, ort).anzahl > 0;

/** Verbrauch der Karte in MW (Summe der `leistung` aller Maschinen; Stufe 1 erzwingt ihn nicht). */
export const leistungVon = (s, ort) => cacheVon(s, ort).leistung;

// ─── Annehmen ───────────────────────────────────────────────────────────────

const ctxTempo = { s: null, o: null, ort: null, leistung: 0 };
/** Taktfaktor 0..1 einer Maschine; Stufe 1: immer 1. Stufe 2 hängt sich über den Modifikator `fabrikTempo` an. */
export function tempoVon(c, o) {
  ctxTempo.s = c.s; ctxTempo.o = o; ctxTempo.ort = c.ort; ctxTempo.leistung = MASCHINEN[o.t]?.leistung || 0;
  const t = mod('fabrikTempo', 1, ctxTempo);
  return t >= 1 ? 1 : t > 0 ? t : 0;
}

function einfuegen(w, e) {
  let i = 0;
  while (i < w.length && w[i].p >= e.p) i++;
  w.splice(i, 0, e);
}

function bandAnnehmen(o, ware, d, ueber) {
  if (d === hinten(o.r)) return false;
  const w = (o.w ??= []);
  let p0 = 0;
  if (d !== o.r) {
    const vorzeichen = d === (o.r + 1) % 4 ? -1 : 1; // Zufuhr von links = -1
    p0 = o.kv === vorzeichen ? 0 : 0.5;
  }
  const A = FABRIK.abstand;
  if (w.length >= FABRIK.maxJeFeld) return false;
  let pa;
  if (p0 === 0) {
    pa = Math.min(ueber, 0.95);
    if (w.length) pa = Math.min(pa, w[w.length - 1].p - A);
    if (pa < -1e-9) return false;
    pa = Math.max(0, pa);
  } else {
    let vorn = Infinity;
    for (const e of w) {
      if (Math.abs(e.p - p0) < A - 1e-9) return false;
      if (e.p > p0 && e.p < vorn) vorn = e.p;
    }
    pa = Math.min(p0 + Math.min(ueber, 0.4), vorn - A, 0.95);
    if (pa < p0) pa = p0;
  }
  const e = { id: ware.id, p: pa };
  if (ware.q) e.q = ware.q;
  if (ware.von) e.von = ware.von;
  einfuegen(w, e);
  return true;
}

/** Ist eine Maschine ausgehungert (nichts in Arbeit, kein Rezept kann starten)? Dann darf sie über die Grenze annehmen. */
function hungert(o) {
  return !o.arb && !naechstesRezept(o);
}

/** Zutaten, die eine Maschine annimmt: Obergrenze je Gegenstand (3× Bedarf, mindestens 4). */
export function zutatenGrenze(o, id) {
  const def = MASCHINEN[o.t];
  if (!def?.rezepte) return 0;
  const liste = def.waehlbar ? [def.rezepte[o.rez ?? def.standard]].filter(Boolean) : Object.values(def.rezepte);
  let grenze = 0;
  for (const r of liste) if (r.ein[id]) grenze = Math.max(grenze, def.puffer ?? Math.max(4, r.ein[id] * 3));
  return grenze;
}

/**
 * Waren stromaufwärts eines Bandfelds (Bänder, Splitter, Zusammenführer bis 64 Felder weit; dazu der Inhalt eines Lagers oder
 * der Ausgang einer Maschine am Anfang): so sieht ein Mehr-Zutaten-Fertiger, dass die fehlende Zutat noch kommt, auch wenn das
 * Band vor ihm gerade nur eine Zutat trägt (Vorratslager gibt der Reihe nach ab).
 */
function stromauf(c, kk0) {
  const waren = [];
  const gesehen = new Set([kk0]);
  const stapel = [kk0];
  while (stapel.length && gesehen.size < 64) {
    const [x, y] = L.ausK(stapel.pop());
    for (let d = 0; d < 4; d++) {
      const kk = L.k(x + DX[d], y + DY[d]);
      if (gesehen.has(kk)) continue;
      const o = hauptAn(c.welt, kk);
      if (!o || !gibtAb(o, hinten(d))) continue;
      gesehen.add(kk);
      if (o.t === BAND) { waren.push(...(o.w || [])); stapel.push(kk); } else if (o.t === SPLITTER || o.t === MERGER) stapel.push(kk);
      else if (o.t === 'lager') { for (const f of o.inv || []) if (f) waren.push({ id: f.id, q: f.q, von: f.von }); } else for (const id in o.aus || {}) if (o.aus[id] > 0) waren.push({ id });
    }
  }
  return waren;
}

/** Wartet hinter der Ware auf dem Band (oder stromaufwärts) eine andere Zutat, die der Maschine fehlt? */
function blockiert(o, ware, dahinter) {
  if (!dahinter) return false;
  for (const e of typeof dahinter === 'function' ? dahinter() : dahinter) {
    if (e.id === ware.id || e.q || e.von) continue;
    const g = zutatenGrenze(o, e.id);
    if (g && (o.ein?.[e.id] || 0) < g) return true;
  }
  return false;
}

/**
 * Eine Ware in eine Maschine (oder ein Lager) legen. Über die Grenze hinaus nimmt eine Maschine eine Zutat nur an,
 * wenn sie sonst stillstünde (ausgehungert) UND die Ware vorn auf dem Band eine andere Zutat blockiert, die dahinter
 * wartet (`dahinter`: die übrigen Waren des liefernden Bands): so verklemmt ein gemischtes Band (Erz und Kohle) nicht.
 * Ein reines Kohleband füllt einen Schmelzer nur bis zur Grenze. Höchstens FABRIK.ueberlaufMax je Zutat.
 * Generatoren nehmen Brennstoff an allen vier Seiten an.
 * Abgewiesenes merkt sich die Maschine in `o.abg` ({ id, g: 'f' passt nicht | 'g' Grenze }) für das Info-Fenster.
 */
export function maschineAnnehmen(o, ware, d, dahinter = null) {
  if (d === hinten(o.r) && !MASCHINEN[o.t]?.generator) return false; // nicht durch die Ausgangsseite (Generatoren haben keine)
  if (o.t === 'lager') {
    const rest = L.inBehaelter((o.inv ??= Array(FABRIK.lagerFaecher).fill(null)), { id: ware.id, n: 1, q: ware.q, von: ware.von });
    return rest === 0;
  }
  const grenze = ware.q || ware.von ? 0 : zutatenGrenze(o, ware.id);
  if (!grenze) { o.abg = { id: ware.id, g: 'f' }; return false; }
  const ein = (o.ein ??= {});
  const n = ein[ware.id] || 0;
  if (n >= grenze && !(n < FABRIK.ueberlaufMax && hungert(o) && blockiert(o, ware, dahinter))) { o.abg = { id: ware.id, g: 'g' }; return false; }
  ein[ware.id] = n + 1;
  if (o.abg) delete o.abg;
  return true;
}

function versandAnnehmen(c, ware) {
  const slot = { id: ware.id, n: 1, ...(ware.q ? { q: ware.q } : {}), ...(ware.von ? { von: ware.von } : {}) };
  if (!ITEMS[slot.id] || !L.verkaufbar(slot)) return false; // Unverkäufliches (und Unbekanntes) bleibt im Rückstau
  L.versandHinzu(c.s, slot);
  return true;
}

/** Splitter: reicht eine Ware von hinten sofort an den nächsten freien Ausgang weiter (vorn, links, rechts, reihum). */
function splitterWeiter(c, tk, o, ware, d, ueber, tiefe) {
  if (d !== o.r || o.pf) return false;
  const [x, y] = L.ausK(tk);
  const richtungen = [o.r, (o.r + 3) % 4, (o.r + 1) % 4];
  const start = o.nx | 0;
  for (let j = 0; j < 3; j++) {
    const i = (start + j) % 3;
    const r = richtungen[i];
    if (annehmen(c, L.k(x + DX[r], y + DY[r]), ware, r, ueber, tiefe + 1)) { o.nx = (i + 1) % 3; return true; }
  }
  return false;
}

/** Wartet am Feld neben dem Zusammenführer (Seite sd) ein Zufluss, der ihn in diesem Schritt erreicht? */
function zuflussWartet(c, x, y, sd) {
  const b = hauptAn(c.welt, L.k(x + DX[sd], y + DY[sd]));
  if (!b || b.t !== BAND || b.r !== hinten(sd) || !b.w?.length) return false;
  return b.w[0].p + bandTempoVon(b) * c.dt >= 1 - 1e-9;
}
function hatZufluss(c, x, y, sd) {
  return gibtAb(hauptAn(c.welt, L.k(x + DX[sd], y + DY[sd])), hinten(sd));
}

/**
 * Zusammenführer: reicht eine Ware sofort nach vorn weiter. Gerecht reihum: Eine Seite, die nicht dran ist, kommt nur
 * durch, wenn auf der Seite, die dran ist, gerade nichts wartet.
 */
function mergerWeiter(c, tk, o, ware, d, ueber, tiefe) {
  if (d === hinten(o.r) || o.pf) return false;
  const [x, y] = L.ausK(tk);
  const seiten = [hinten(o.r), (o.r + 3) % 4, (o.r + 1) % 4];
  const i = seiten.indexOf(hinten(d));
  if (i < 0) return false;
  const dran = (o.nx | 0) % 3;
  if (i !== dran && zuflussWartet(c, x, y, seiten[dran])) return false;
  if (!annehmen(c, L.k(x + DX[o.r], y + DY[o.r]), ware, o.r, ueber, tiefe + 1)) return false;
  // nächste Seite mit Zufluss ist dran
  for (let j = 1; j <= 3; j++) {
    const k = (i + j) % 3;
    if (hatZufluss(c, x, y, seiten[k])) { o.nx = k; break; }
  }
  return true;
}

/** Ware an das Feld `tk` übergeben, Bewegungsrichtung d, `ueber` = schon zurückgelegter Weg im Zielfeld. */
function annehmen(c, tk, ware, d, ueber, tiefe = 0) {
  if (tiefe > 16) return false;
  const o = hauptAn(c.welt, tk);
  if (!o) return c.versand.has(tk) ? versandAnnehmen(c, ware) : false;
  switch (o.t) {
    case BAND: return bandAnnehmen(o, ware, d, ueber);
    case SPLITTER: return splitterWeiter(c, tk, o, ware, d, ueber, tiefe);
    case MERGER: return mergerWeiter(c, tk, o, ware, d, ueber, tiefe);
    case 'truhe': {
      if (!Array.isArray(o.inv)) return false;
      return L.inBehaelter(o.inv, { id: ware.id, n: 1, q: ware.q, von: ware.von }) === 0;
    }
    default: return MASCHINEN[o.t] && o.t !== 'erzbohrer' ? maschineAnnehmen(o, ware, d, c.dahinter) : false;
  }
}

// ─── Schritte ───────────────────────────────────────────────────────────────

function bandSchritt(c, n, dt) {
  const o = n.o;
  const w = o.w;
  if (!w || !w.length) return;
  const v = bandTempoVon(o) * dt;
  const A = FABRIK.abstand;
  let vorn = null;
  for (let i = 0; i < w.length;) {
    const e = w[i];
    let np = e.p + v;
    if (vorn !== null && np > vorn - A) np = vorn - A;
    if (np >= 1) {
      c.dahinter = i === 0 ? () => [...w, ...stromauf(c, n.kk)] : null; // die vorderste Ware: was dahinter wartet, zählt beim Überlauf
      const ok = annehmen(c, n.zk, e, o.r, np - 1);
      c.dahinter = null;
      if (ok) { w.splice(i, 1); continue; }
      np = 1;
    }
    e.p = np > e.p ? np : e.p;
    vorn = e.p;
    i++;
  }
}

/** Alte Stände: eine Ware, die ein Splitter/Zusammenführer noch hält, weiterreichen. */
function teilerLeeren(c, n) {
  const o = n.o;
  if (!o.pf) return;
  const ware = o.pf;
  o.pf = null;
  const ok = o.t === SPLITTER ? splitterWeiter(c, n.kk, o, ware, o.r, 0, 0) : annehmen(c, n.zk, ware, o.r, 0, 1);
  if (!ok) o.pf = ware;
}

const summe = (m) => { let n = 0; for (const id in m) n += m[id]; return n; };

function zaehlen(o, n) { o.zn = (o.zn || 0) + n; }

/** Durchsatz pro Minute als gleitendes Mittel (Zeitkonstante FABRIK.durchsatzFenster), unabhängig von der Schrittweite. */
function durchsatz(o, dt) {
  if (!(dt > 0)) return;
  const a = 1 - Math.exp(-dt / FABRIK.durchsatzFenster);
  o.dr = (o.dr || 0) * (1 - a) + ((o.zn || 0) / dt) * 60 * a;
  if (o.dr < 1e-3) o.dr = 0;
  o.zn = 0;
}

/** Ausgabe-Guthaben: höchstens FABRIK.ausgabeRate Stück pro Sekunde und Ausgangsfeld (Bänder begrenzen ohnehin). */
function guthaben(o, n, dt) {
  const max = FABRIK.ausgabeRate * n.rand.length;
  o.ak = Math.min((o.ak || 0) + dt * max, Math.max(1, max * dt) + 1);
  return o.ak;
}

/**
 * Fertige Ware an die Felder vor der Ausgangsseite abgeben, reihum. Läuft nach den Bändern; eine Ware, die in diesem
 * Schritt aufs Band kommt, hat dort schon bis zu Tempo·dt zurückgelegt (genau so viele wie live, egal wie groß dt ist).
 */
function abgeben(c, n, dt, naechste) {
  const o = n.o;
  if (!n.rand.length) return;
  // zurückgelegter Weg im Zielband: Tempo des Zielbands mal dt (schnelle Bänder nehmen je Schritt mehr Waren auf)
  const ueber = (tk) => { const z = c.welt.objekte[tk]; return (z?.t === BAND ? bandTempoVon(z) : FABRIK.bandTempo) * dt; };
  guthaben(o, n, dt);
  while (o.ak >= 1) {
    const ware = naechste();
    if (!ware) return;
    let ok = false;
    for (let j = 0; j < n.rand.length; j++) {
      const i = ((o.ei | 0) + j) % n.rand.length;
      if (annehmen(c, n.rand[i], ware, o.r, ueber(n.rand[i]))) { o.ei = (i + 1) % n.rand.length; ok = true; break; }
    }
    if (!ok) return;
    ware.weg();
    o.ak -= 1;
  }
}

function ausgabeAus(o) {
  const aus = o.aus;
  return () => {
    if (!aus) return null;
    for (const id in aus) if (aus[id] > 0) return { id, weg: () => { aus[id]--; if (aus[id] <= 0) delete aus[id]; } };
    return null;
  };
}

function ausgabeLager(o) {
  const inv = o.inv;
  return () => {
    if (!inv) return null;
    for (let i = 0; i < inv.length; i++) {
      const f = inv[i];
      if (f && f.n > 0) return { id: f.id, q: f.q, von: f.von, weg: () => { f.n--; if (f.n <= 0) inv[i] = null; } };
    }
    return null;
  };
}

function bohrerSchritt(c, n, dt, tempo) {
  const o = n.o;
  const aus = (o.aus ??= {});
  const sorte = SORTEN[o.erz];
  if (!sorte) { o.st = 'e'; return; }
  const rate = (o.rein ?? 1) / FABRIK.bohrerZeit;
  if (summe(aus) >= FABRIK.bohrerPuffer) { o.st = 'v'; return; }
  o.f = (o.f || 0) + dt * tempo * rate;
  o.st = tempo > 0 ? 'a' : 'x';
  while (o.f >= 1) {
    if (summe(aus) >= FABRIK.bohrerPuffer) { o.f = 1; o.st = 'v'; break; }
    o.f -= 1;
    aus[sorte.item] = (aus[sorte.item] || 0) + 1;
    zaehlen(o, 1);
  }
}

/** Rezept, das als Nächstes laufen kann (Zutaten da), oder null. */
export function naechstesRezept(o) {
  const def = MASCHINEN[o.t];
  const ein = o.ein || {};
  const geht = (r) => Object.entries(r.ein).every(([id, k]) => (ein[id] || 0) >= k);
  if (def.waehlbar) {
    const id = o.rez ?? def.standard;
    return def.rezepte[id] && geht(def.rezepte[id]) ? id : null;
  }
  for (const id in def.rezepte) if (geht(def.rezepte[id])) return id;
  return null;
}

function rezeptSchritt(c, n, dt, tempo) {
  const o = n.o;
  const def = MASCHINEN[o.t];
  const ein = (o.ein ??= {});
  const aus = (o.aus ??= {});
  if (tempo <= 0) { o.st = 'x'; return; }
  let rest = dt * tempo;
  o.st = 'a';
  for (let runde = 0; runde < 12; runde++) {
    if (!o.arb) {
      const id = naechstesRezept(o);
      if (!id) { o.st = 'e'; return; }
      const r = def.rezepte[id];
      if (summe(aus) + summe(r.aus) > FABRIK.ausPuffer) { o.st = 'v'; return; }
      for (const z in r.ein) ein[z] -= r.ein[z];
      o.arb = id;
      o.f = 0;
    }
    const r = def.rezepte[o.arb];
    if (!r) { o.arb = null; continue; }
    const braucht = r.zeit - (o.f || 0);
    if (rest < braucht - 1e-9) { o.f = (o.f || 0) + rest; return; }
    rest = Math.max(0, rest - braucht);
    for (const z in r.aus) { aus[z] = (aus[z] || 0) + r.aus[z]; zaehlen(o, r.aus[z]); }
    o.arb = null;
    o.f = 0;
  }
}

function maschinenSchritt(c, n, dt) {
  const o = n.o;
  if (o.t === 'lager') { abgeben(c, n, dt, ausgabeLager(o)); return; }
  const tempo = tempoVon(c, o);
  if (o.t === 'erzbohrer') bohrerSchritt(c, n, dt, tempo);
  else rezeptSchritt(c, n, dt, tempo);
  durchsatz(o, dt);
  abgeben(c, n, dt, ausgabeAus(o));
}

/**
 * Ein Simulationsschritt von dt Sekunden auf einer Karte: erst Bänder (stromabwärts zuerst; Splitter und Zusammenführer
 * reichen dabei sofort weiter), dann die Maschinen (arbeiten und geben ab).
 */
export function schritt(s, ort, dt) {
  const c = cacheVon(s, ort);
  c.dt = dt;
  for (const fn of VORHER) fn(s, ort, dt, c);
  if (!c.anzahl) return c;
  for (const n of c.fluss) {
    if (n.t === BAND) bandSchritt(c, n, dt);
    else teilerLeeren(c, n);
  }
  for (const n of c.maschinen) maschinenSchritt(c, n, dt);
  return c;
}

/**
 * Warum staut ein Band an seinem Ende? Text für den Hinweis (oder null, wenn nichts staut). Erklärt Band gegen Band,
 * Bandende ohne Ziel, Ausgangsseite einer Maschine, falsche Ware, volle Ziele und Unverkäufliches vor der Versandkiste.
 */
export function bandStau(s, ort, x, y, o) {
  const w = o.w;
  if (!w?.length || w[0].p < 0.999) return null;
  const ware = ITEMS[w[0].id]?.name ?? w[0].id;
  const tk = L.k(x + DX[o.r], y + DY[o.r]);
  const ziel = hauptAn(ort.welt, tk);
  if (!ziel) {
    if (!cacheVon(s, ort).versand.has(tk)) return 'Stau: am Bandende ist nichts';
    return ITEMS[w[0].id] && L.verkaufbar({ id: w[0].id, n: 1 }) ? null : `Stau: ${ware} lässt sich nicht verkaufen`;
  }
  const name = MASCHINEN[ziel.t]?.name;
  switch (ziel.t) {
    case BAND: return ziel.r === hinten(o.r) ? 'Stau: Band gegen Band (zeigen gegeneinander)' : 'Stau: das nächste Band ist voll';
    case SPLITTER: return ziel.r !== o.r ? 'Stau: der Splitter nimmt nur von hinten an' : 'Stau: alle Ausgänge des Splitters sind voll';
    case MERGER: return ziel.r === hinten(o.r) ? 'Stau: das Band zeigt in den Ausgang des Zusammenführers' : 'Stau: der Zusammenführer kann nicht weiter';
    case 'truhe': return 'Stau: die Truhe ist voll';
    case 'erzbohrer': return 'Stau: der Erzbohrer nimmt nichts an';
    case 'lager': return o.r === hinten(ziel.r) ? 'Stau: das Band zeigt in die Ausgangsseite des Lagers' : 'Stau: das Lager ist voll';
    default:
      if (!name) return 'Stau: dort kann nichts hinein';
      if (o.r === hinten(ziel.r) && !MASCHINEN[ziel.t]?.generator) return `Stau: das Band zeigt in die Ausgangsseite (${name})`;
      if (!zutatenGrenze(ziel, w[0].id)) return `Stau: ${ware} passt nicht zum Rezept (${name})`;
      return `Stau: der Eingang (${name}) ist voll`;
  }
}

const jetzt = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * `sek` Sekunden simulieren, in Schritten von `opt.schritt` (Standard: FABRIK.nachholSchritt).
 * Mit `opt.budgetMs` hört es früher auf; zurück kommt, was noch aussteht.
 */
export function simuliere(s, ort, sek, opt = {}) {
  // Schnelle Bänder (Mk2, Mk3): kleinere Schritte, damit eine Ware je Schritt höchstens ein Feld weit kommt
  const gross = Math.min(opt.schritt ?? FABRIK.nachholSchritt, 0.9 / cacheVon(s, ort).tempoMax);
  const t0 = opt.budgetMs ? jetzt() : 0;
  let rest = sek;
  while (rest > 1e-9) {
    const d = Math.min(rest, gross);
    schritt(s, ort, d);
    rest -= d;
    if (opt.budgetMs && jetzt() - t0 > opt.budgetMs) break;
  }
  return Math.max(0, rest);
}

/** Alle Waren auf der Karte zählen (für Prüfungen: nichts geht verloren). */
export function warenSumme(ort) {
  const summen = {};
  const plus = (id, n) => { summen[id] = (summen[id] || 0) + n; };
  for (const kk in ort.welt.objekte) {
    const o = ort.welt.objekte[kk];
    if (o.t === BAND) for (const e of o.w || []) plus(e.id, 1);
    else if (o.t === SPLITTER || o.t === MERGER) { if (o.pf) plus(o.pf.id, 1); }
    else if (MASCHINEN[o.t]) {
      for (const id in o.ein || {}) plus(id, o.ein[id]);
      for (const id in o.aus || {}) plus(id, o.aus[id]);
      if (o.arb) for (const id in MASCHINEN[o.t].rezepte[o.arb].ein) plus(id, MASCHINEN[o.t].rezepte[o.arb].ein[id]);
      for (const f of o.inv || []) if (f) plus(f.id, f.n);
    }
  }
  return summen;
}
