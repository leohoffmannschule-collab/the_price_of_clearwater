// Bereich „handwerk" – Fabrik Stufe 3: die Rechnung des Maschinenbauers. DOM-frei und deterministisch.
//
// Ein Bau nimmt die Zutaten aus dem Rucksack und aus Lagern und Truhen in Reichweite (BAU.reichweite Felder Abstand zur Fläche
// des Maschinenbauers, Rucksack zuerst) und legt das Teil in den Rucksack; passt es dort nicht mehr hinein, in ein Lager oder
// eine Truhe in Reichweite. Es wird nur gebaut, was ganz hineinpasst: sonst weniger oder gar nichts, nie ein Verlust. Der Bau
// läuft auf Kopien der Fächer und wird erst am Ende übernommen.

import { ITEMS, OBJEKT_TYPEN } from '../../daten.js';
import * as L from '../../logik.js';
import { BAU, BAUPLAENE, maschinenRezepte } from './fabrik-bau-daten.js';
import { MASCHINEN } from './fabrik-daten.js';
import { HANDY_PREISE } from './fabrik-strom-daten.js';

const BEHAELTER = new Set(['truhe', 'lager']);

/** Bauplan eines Gegenstands (oder null). */
export const planVon = (id) => BAUPLAENE[id] ?? null;

// ─── Quellen: Rucksack, Lager und Truhen in Reichweite ───────────────────────────────────────────

/** Lücke zwischen zwei Rechtecken in Feldern (0 = berühren sich oder überlappen). */
function luecke(ax, ay, ab, ah, bx, by, bb, bh) {
  const dx = Math.max(0, ax - (bx + bb), bx - (ax + ab));
  const dy = Math.max(0, ay - (by + bh), by - (ay + ah));
  return Math.max(dx, dy);
}

/**
 * Lager und Truhen in Reichweite des Maschinenbauers am Feld `kk`: [{ kk, o, inv, name, abstand }], nach Abstand und Feld sortiert.
 * (Der Abstand ist die Lücke zwischen den Flächen: ein Lager direkt daneben hat 0.)
 */
export function behaelterInReichweite(ort, kk) {
  const haupt = ort.welt.objekte[kk];
  const [x, y] = L.ausK(kk);
  const [b, h] = (haupt && L.flaecheVon(haupt)) || BAU.flaeche;
  const liste = [];
  for (const k2 in ort.welt.objekte) {
    const o = ort.welt.objekte[k2];
    if (!BEHAELTER.has(o.t) || !Array.isArray(o.inv)) continue;
    const [cx, cy] = L.ausK(k2);
    const [cb, ch] = L.flaecheVon(o);
    const abstand = luecke(x, y, b, h, cx, cy, cb, ch);
    if (abstand <= BAU.reichweite) liste.push({ kk: k2, o, inv: o.inv, name: o.t === 'lager' ? 'Lager' : 'Truhe', abstand });
  }
  liste.sort((a, c) => a.abstand - c.abstand || (a.kk < c.kk ? -1 : 1));
  return liste;
}

/** Alle Fächerlisten, aus denen gebaut wird: zuerst der Rucksack, dann die Behälter in Reichweite (ohne Ort nur der Rucksack). */
export function quellen(s, ort, kk) {
  const liste = [{ art: 'rucksack', name: 'Rucksack', inv: s.spieler.inv }];
  if (ort && kk) liste.push(...behaelterInReichweite(ort, kk).map((b) => ({ art: 'behaelter', name: b.name, inv: b.inv, kk: b.kk })));
  return liste;
}

const zaehle = (inv, id) => { let n = 0; for (const f of inv) if (f && f.id === id) n += f.n; return n; };
/** So viele Stück eines Gegenstands liegen in Reichweite (Rucksack und Behälter zusammen). */
export const vorratVon = (qs, id) => qs.reduce((n, q) => n + zaehle(q.inv, id), 0);

/** Aus einer Fächerliste n Stück nehmen (schlechteste Qualität zuerst); gibt zurück, wie viele wirklich genommen wurden. */
function nimm(inv, id, n) {
  const reihenfolge = inv.map((x, i) => [x, i]).filter(([x]) => x && x.id === id).sort((a, c) => (a[0].q || 0) - (c[0].q || 0));
  let genommen = 0;
  for (const [x, i] of reihenfolge) {
    if (genommen >= n) break;
    const weg = Math.min(n - genommen, x.n);
    x.n -= weg;
    genommen += weg;
    if (x.n <= 0) inv[i] = null;
  }
  return genommen;
}
const kopie = (inv) => inv.map((z) => (z ? { ...z } : null));

// ─── Status eines Plans ──────────────────────────────────────────────────────────────────────────

/** Freigeschaltet (Bergbau-Stufe)? */
export const planFrei = (s, id) => !!BAUPLAENE[id] && L.stufe(s, 'bergbau') >= BAUPLAENE[id].stufe;

/**
 * Zustand eines Plans: { frei, stufe, menge, zutaten: [{ id, name, braucht, hat, fehlt }], moeglich (so viele Bauten gingen
 * nach Zutaten) }.
 */
export function planStatus(s, qs, id) {
  const p = BAUPLAENE[id];
  const zutaten = Object.entries(p.zutaten).map(([z, braucht]) => {
    const hat = vorratVon(qs, z);
    return { id: z, name: ITEMS[z]?.name ?? z, braucht, hat, fehlt: Math.max(0, braucht - hat) };
  });
  const moeglich = Math.min(...zutaten.map((z) => Math.floor(z.hat / z.braucht)));
  return { id, frei: planFrei(s, id), stufe: p.stufe, menge: p.menge, zutaten, moeglich: Math.max(0, moeglich) };
}

/** Probebau von n Bauten auf Kopien: { ok, kopien, imRucksack, imLager } oder { ok: false, grund }. */
function probe(qs, id, n) {
  const p = BAUPLAENE[id];
  const kopien = qs.map((q) => kopie(q.inv));
  for (const [z, k] of Object.entries(p.zutaten)) {
    let rest = k * n;
    for (const kp of kopien) { if (rest <= 0) break; rest -= nimm(kp, z, rest); }
    if (rest > 0) return { ok: false, grund: 'zutaten' };
  }
  let rest = p.menge * n;
  let imRucksack = 0;
  for (let i = 0; i < kopien.length && rest > 0; i++) {
    const neu = L.inBehaelter(kopien[i], { id, n: rest });
    if (i === 0) imRucksack = rest - neu;
    rest = neu;
  }
  if (rest > 0) return { ok: false, grund: 'platz' };
  return { ok: true, kopien, imRucksack, imLager: p.menge * n - imRucksack };
}

/** Wie viele Bauten gehen höchstens (Zutaten und Platz, höchstens `grenze`)? */
export function maxBauten(s, qs, id, grenze = 9999) {
  if (!planFrei(s, id)) return 0;
  const st = planStatus(s, qs, id);
  let hi = Math.min(st.moeglich, grenze);
  if (hi < 1) return 0;
  if (probe(qs, id, hi).ok) return hi;
  let lo = 0; // lo geht (oder 0), hi geht nicht
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (probe(qs, id, mid).ok) lo = mid; else hi = mid;
  }
  return lo;
}

/**
 * n Bauten ausführen (n = 'max': so viele wie möglich). Ergebnis (L.neuesErgebnis) mit `ok`, `gebaut` (Stück), `bauten`,
 * `imRucksack`, `imLager`, `text`; bei Misserfolg `grund`.
 */
export function bauen(s, ort, kk, id, n = 1) {
  const erg = L.neuesErgebnis();
  const p = BAUPLAENE[id];
  if (!p || !ITEMS[id]) { erg.grund = 'Diesen Bauplan gibt es nicht.'; return erg; }
  if (!planFrei(s, id)) { erg.grund = `${ITEMS[id].name}: baubar ab Bergbau Stufe ${p.stufe}.`; return erg; }
  const qs = quellen(s, ort, kk);
  const st = planStatus(s, qs, id);
  const wunsch = n === 'max' ? 9999 : Math.max(1, Math.floor(Number(n)) || 1);
  if (st.moeglich < 1) {
    const fehlt = st.zutaten.filter((z) => z.fehlt > 0).map((z) => `${z.fehlt}× ${z.name}`).join(', ');
    erg.grund = `Es fehlt: ${fehlt}.`;
    return erg;
  }
  const bauten = maxBauten(s, qs, id, wunsch);
  if (bauten < 1) { erg.grund = 'Kein Platz für das Ergebnis: Rucksack und Lager in Reichweite sind voll.'; return erg; }
  const pr = probe(qs, id, bauten);
  qs.forEach((q, i) => { for (let j = 0; j < q.inv.length; j++) q.inv[j] = pr.kopien[i][j]; });
  const stueck = p.menge * bauten;
  erg.ok = true;
  erg.gebaut = stueck;
  erg.bauten = bauten;
  erg.imRucksack = pr.imRucksack;
  erg.imLager = pr.imLager;
  erg.items.push({ id, n: stueck });
  const wo = pr.imLager > 0 ? (pr.imRucksack > 0 ? ` (${pr.imRucksack} im Rucksack, ${pr.imLager} ins Lager)` : ' (ins Lager gelegt, der Rucksack war voll)') : '';
  const weniger = wunsch !== 9999 && bauten < wunsch ? ` – mehr ging nicht (${bauten} von ${wunsch} Bauten)` : '';
  erg.text = `${stueck}× ${ITEMS[id].name} gebaut${wo}${weniger}.`;
  return erg;
}

// ─── Übersicht für das Handy (Bauplan-App) ───────────────────────────────────────────────────────

/**
 * Baupläne für die Übersicht, gefiltert: `material` (Zutat), `nurMachbar` (nach Zutaten im Rucksack und Bergbau-Stufe).
 * [{ id, name, gruppe, stufe, menge, frei, preis, zutaten, moeglich }] in der Reihenfolge der Pläne.
 */
export function bauplanListe(s, { material = null, nurMachbar = false } = {}) {
  const qs = quellen(s);
  const liste = [];
  for (const id of Object.keys(BAUPLAENE)) {
    if (!ITEMS[id]) continue;
    const p = BAUPLAENE[id];
    if (material && !(material in p.zutaten)) continue;
    const st = planStatus(s, qs, id);
    if (nurMachbar && !(st.frei && st.moeglich >= 1)) continue;
    liste.push({ id, name: ITEMS[id].name, gruppe: p.gruppe, preis: HANDY_PREISE[id] ?? null, ...st });
  }
  return liste;
}

/** Rate pro Minute eines Maschinenrezepts bei vollem Takt: { ein: [{ id, name, proMin }], aus: [...], leistung }. */
export function rezeptRaten(maschine, r) {
  const f = 60 / r.zeit;
  const liste = (m) => Object.entries(m).map(([id, n]) => ({ id, name: ITEMS[id]?.name ?? id, proMin: Math.round(n * f * 10) / 10 }));
  return { ein: liste(r.ein), aus: liste(r.aus), leistung: MASCHINEN[maschine]?.leistung || 0 };
}

/** Maschinenrezepte für die Übersicht, mit Material-Filter (Zutat oder Ergebnis) und Raten. */
export function rezeptListe({ material = null } = {}) {
  const liste = [];
  for (const r of maschinenRezepte()) {
    if (material && !(material in r.ein) && !(material in r.aus)) continue;
    if (!MASCHINEN[r.maschine]) continue;
    liste.push({ ...r, maschinenName: MASCHINEN[r.maschine].name, raten: rezeptRaten(r.maschine, r) });
  }
  return liste;
}

// ─── Arbeitsanimation (nur Darstellung, wird nicht gespeichert) ─────────────────────────────────

const AKTIV = new WeakMap();
/** Der Maschinenbauer `o` arbeitet bis zur Zeit `bis` (S.t-Sekunden). */
export const bauAktivSetzen = (o, bis) => { AKTIV.set(o, bis); };
/** Wie weit ist die Animation (0..1 = läuft, null = ruht)? */
export function bauAktiv(o, t) {
  const bis = AKTIV.get(o);
  if (bis == null || t >= bis) return null;
  return 1 - (bis - t) / BAU.animation;
}

/** Breite und Höhe des Maschinenbauers. */
export const bauFlaeche = () => OBJEKT_TYPEN.maschinenbauer?.flaeche ?? BAU.flaeche;
