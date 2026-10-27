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

import * as L from '../../logik.js';
import { mod } from '../../system.js';
import { FABRIK, MASCHINEN, FABRIK_TYPEN, BAND, SPLITTER, MERGER, DX, DY, SORTEN } from './fabrik-daten.js';

const CACHES = new WeakMap();
let aenderung = 1;
/** Meldet, dass sich Fabrikobjekte geändert haben (aufgestellt, gedreht, entfernt): Verbindungen neu berechnen. */
export const fabrikAenderung = () => { aenderung++; };

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
  const c = { ver: aenderung, welt, def, s, ort, alter: 0, fluss: [], maschinen: [], versand: new Set(), leistung: 0, anzahl: 0 };
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

function teilerAnnehmen(o, ware, d) {
  if (o.pf || d === hinten(o.r)) return false;
  // Splitter nehmen nur von hinten (Bewegung in Richtung r); Zusammenführer auch von den Seiten
  if (o.t === SPLITTER && d !== o.r) return false;
  o.pf = { id: ware.id };
  if (ware.q) o.pf.q = ware.q;
  if (ware.von) o.pf.von = ware.von;
  o.z = FABRIK.teilerZeit;
  return true;
}

/** Zutaten, die eine Maschine annimmt: Obergrenze je Gegenstand (3× Bedarf, mindestens 4). */
function zutatenGrenze(o, id) {
  const def = MASCHINEN[o.t];
  if (!def?.rezepte) return 0;
  const liste = def.waehlbar ? [def.rezepte[o.rez ?? def.standard]].filter(Boolean) : Object.values(def.rezepte);
  let grenze = 0;
  for (const r of liste) if (r.ein[id]) grenze = Math.max(grenze, Math.max(4, r.ein[id] * 3));
  return grenze;
}

function maschineAnnehmen(o, ware, d) {
  if (d === hinten(o.r)) return false; // nicht durch die Ausgangsseite
  if (o.t === 'lager') {
    const rest = L.inBehaelter((o.inv ??= Array(FABRIK.lagerFaecher).fill(null)), { id: ware.id, n: 1, q: ware.q, von: ware.von });
    return rest === 0;
  }
  if (ware.q || ware.von) return false;
  const grenze = zutatenGrenze(o, ware.id);
  if (!grenze) return false;
  const ein = (o.ein ??= {});
  if ((ein[ware.id] || 0) >= grenze) return false;
  ein[ware.id] = (ein[ware.id] || 0) + 1;
  return true;
}

function versandAnnehmen(c, ware) {
  L.versandHinzu(c.s, { id: ware.id, n: 1, ...(ware.q ? { q: ware.q } : {}), ...(ware.von ? { von: ware.von } : {}) });
  return true;
}

/** Ware an das Feld `tk` übergeben, Bewegungsrichtung d, `ueber` = schon zurückgelegter Weg im Zielfeld. */
function annehmen(c, tk, ware, d, ueber, vonBand = false) {
  const o = hauptAn(c.welt, tk);
  if (!o) return c.versand.has(tk) ? versandAnnehmen(c, ware) : false;
  switch (o.t) {
    case BAND: return bandAnnehmen(o, ware, d, ueber);
    case SPLITTER: return teilerAnnehmen(o, ware, d);
    case MERGER: return vonBand ? false : teilerAnnehmen(o, ware, d);
    case 'truhe': {
      if (!Array.isArray(o.inv)) return false;
      return L.inBehaelter(o.inv, { id: ware.id, n: 1, q: ware.q, von: ware.von }) === 0;
    }
    default: return MASCHINEN[o.t] && o.t !== 'erzbohrer' ? maschineAnnehmen(o, ware, d) : false;
  }
}

// ─── Schritte ───────────────────────────────────────────────────────────────

function bandSchritt(c, n, dt) {
  const o = n.o;
  const w = o.w;
  if (!w || !w.length) return;
  const v = FABRIK.bandTempo * dt;
  const A = FABRIK.abstand;
  let vorn = null;
  for (let i = 0; i < w.length;) {
    const e = w[i];
    let np = e.p + v;
    if (vorn !== null && np > vorn - A) np = vorn - A;
    if (np >= 1) {
      if (annehmen(c, n.zk, e, o.r, np - 1, true)) { w.splice(i, 1); continue; }
      np = 1;
    }
    e.p = np > e.p ? np : e.p;
    vorn = e.p;
    i++;
  }
}

function teilerSchritt(c, n, dt) {
  const o = n.o;
  if (!o.pf) return;
  o.z -= dt;
  if (o.z > 0) return;
  o.z = 0;
  if (o.t === SPLITTER) {
    const richtungen = [o.r, (o.r + 3) % 4, (o.r + 1) % 4];
    const start = o.nx | 0;
    for (let j = 0; j < 3; j++) {
      const i = (start + j) % 3;
      const d = richtungen[i];
      if (annehmen(c, L.k(n.x + DX[d], n.y + DY[d]), o.pf, d, 0)) { o.pf = null; o.nx = (i + 1) % 3; return; }
    }
  } else if (annehmen(c, n.zk, o.pf, o.r, 0)) o.pf = null;
}

/** Zusammenführer: holt reihum die vorderste Ware eines wartenden Bandes von hinten, links oder rechts. */
function mergerHolen(c, n) {
  const o = n.o;
  if (o.pf) return;
  const seiten = [hinten(o.r), (o.r + 3) % 4, (o.r + 1) % 4];
  const start = o.nx | 0;
  for (let j = 0; j < 3; j++) {
    const i = (start + j) % 3;
    const sd = seiten[i];
    const b = hauptAn(c.welt, L.k(n.x + DX[sd], n.y + DY[sd]));
    if (!b || b.t !== BAND || b.r !== hinten(sd) || !b.w?.length) continue;
    const e = b.w[0];
    if (e.p < 0.999) continue;
    b.w.shift();
    o.pf = { id: e.id };
    if (e.q) o.pf.q = e.q;
    if (e.von) o.pf.von = e.von;
    o.z = FABRIK.teilerZeit;
    o.nx = (i + 1) % 3;
    return;
  }
}

const summe = (m) => { let n = 0; for (const id in m) n += m[id]; return n; };

function zaehlen(o, n) { o.zn = (o.zn || 0) + n; }

function durchsatz(o, dt) {
  o.zt = (o.zt || 0) + dt;
  if (o.zt >= FABRIK.durchsatzFenster) {
    o.dr = Math.round(((o.zn || 0) / o.zt) * 600) / 10;
    o.zn = 0;
    o.zt = 0;
  }
}

/** Fertige Ware an die Felder vor der Ausgangsseite abgeben (höchstens 6 Stück je Schritt). */
function abgeben(c, n) {
  const o = n.o;
  const aus = o.aus;
  if (!aus || !n.rand.length) return;
  let versuche = 0;
  for (const id in aus) {
    while (aus[id] > 0 && versuche < 6) {
      let ok = false;
      for (let j = 0; j < n.rand.length; j++) {
        const i = ((o.ei | 0) + j) % n.rand.length;
        if (annehmen(c, n.rand[i], { id }, o.r, 0)) { o.ei = (i + 1) % n.rand.length; ok = true; break; }
      }
      if (!ok) break;
      aus[id]--;
      versuche++;
    }
  }
}

function lagerSchritt(c, n) {
  const o = n.o;
  const inv = o.inv;
  if (!inv) return;
  let versuche = 0;
  for (let i = 0; i < inv.length && versuche < 6; i++) {
    const fach = inv[i];
    if (!fach) continue;
    while (fach.n > 0 && versuche < 6) {
      let ok = false;
      for (let j = 0; j < n.rand.length; j++) {
        const m = ((o.ei | 0) + j) % n.rand.length;
        if (annehmen(c, n.rand[m], fach, o.r, 0)) { o.ei = (m + 1) % n.rand.length; ok = true; break; }
      }
      if (!ok) return;
      fach.n--;
      versuche++;
    }
    if (fach.n <= 0) inv[i] = null;
  }
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
  if (o.t === 'lager') { lagerSchritt(c, n); return; }
  const tempo = tempoVon(c, o);
  if (o.t === 'erzbohrer') bohrerSchritt(c, n, dt, tempo);
  else rezeptSchritt(c, n, dt, tempo);
  durchsatz(o, dt);
  abgeben(c, n);
}

/** Ein Simulationsschritt von dt Sekunden auf einer Karte. */
export function schritt(s, ort, dt) {
  const c = cacheVon(s, ort);
  if (!c.anzahl) return c;
  for (const n of c.maschinen) maschinenSchritt(c, n, dt);
  for (const n of c.fluss) {
    if (n.t === BAND) bandSchritt(c, n, dt);
    else {
      if (n.t === MERGER) mergerHolen(c, n);
      teilerSchritt(c, n, dt);
    }
  }
  return c;
}

const jetzt = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * `sek` Sekunden simulieren, in Schritten von `opt.schritt` (Standard: FABRIK.nachholSchritt).
 * Mit `opt.budgetMs` hört es früher auf; zurück kommt, was noch aussteht.
 */
export function simuliere(s, ort, sek, opt = {}) {
  const gross = opt.schritt ?? FABRIK.nachholSchritt;
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
