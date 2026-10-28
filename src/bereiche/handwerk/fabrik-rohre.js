// Bereich „handwerk" – Fabrik Stufe 2: Rohrleitungen für Wasser (nicht die Holzrohre für Waren aus rohre.js).
// DOM-frei und deterministisch.
//
// Objekte:  Rohr { t: 'rohrleitung', mk?, fl }   fl = Wasser im Rohrstück (m³, auf 1 l gerundet); das erste Rohr eines
//                                                Netzes (nach Feldschlüssel) trägt dazu dq/da = Zu-/Abfluss (m³/min, gleitend)
//           Pumpe { t: 'wasserpumpe', st, pa }   nur am Ufer; fördert PUMPE.rate m³/min, braucht Strom; pa = Förderanteil
//           Kohlekraftwerk  o.wa = Wasser im Tank (m³), Tank GENERATOREN.kohlekraftwerk.tank
// Rohre verbinden sich mit den vier Nachbarfeldern: andere Rohre (beide Stufen), Pumpen und Kraftwerke (jede Seite).
// Eine Pumpe oder ein Kraftwerk darf an mehreren getrennten Netzen hängen: die Pumpe teilt ihre Förderung gleich auf
// ihre Netze auf, das Kraftwerk nimmt aus jedem Netz, solange sein Tank Platz hat.
// Ein Rohrnetz ist ein Behälter: Volumen = Rohre · ROHR.volumen. Den Inhalt führt der Netz-Cache (netz.inhalt), die Rohre
// bekommen ihn nach jedem Schritt gleich verteilt (für Speichern und Umbauen). Je Schritt: Zufluss = Pumpen (mal Strom-Takt),
// höchstens freies Volumen und Grenze; Abfluss = freier Platz in den Tanks der Verbraucher (anteilig), höchstens Inhalt und
// Grenze. Die Grenze (m³/min) ist die des schwächsten Rohrs. Läuft im selben Fabrik-Schritt wie Strom und Bänder
// (fabrikSchrittVorher), also auch beim Nachholen. Aufwand je Schritt: O(Rohre + Pumpen), keine Suche je Pumpe.

import { ITEMS, objektTyp } from '../../daten.js';
import * as L from '../../logik.js';
import { istWasser } from '../../karten.js';
import { ton, fenster } from '../../spiel.js';
import { fabrikSchrittVorher, aenderungsStand, fabrikAenderung } from './fabrik-sim.js';
import { ROHR, PUMPE, GENERATOREN } from './fabrik-strom-daten.js';
import { stromFaktor, stromWill, stromBedarf, kabelAlleLoesen } from './fabrik-strom.js';
import { platzPruefen, uhrStarten, BAU_TYPEN } from './fabrik-objekte.js';

export const ROHR_T = 'rohrleitung';
export const PUMPE_T = 'wasserpumpe';
const KREUZ = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // oben, rechts, unten, links
const istVerbraucher = (o) => !!GENERATOREN[o?.t]?.wasser;
export const rohrGrenze = (o) => ROHR.stufen[o?.mk]?.grenze ?? ROHR.stufen[1].grenze;
const zahl = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);
const rund = (x, n) => Math.round(x * n) / n;
/** Anzeige: kleine Restwerte des gleitenden Mittels gelten als 0 (gespeichert wird der volle Wert). */
const anzeige = (x) => (x < 0.05 ? 0 : x);

// ─── Netze (Cache je Karte) ─────────────────────────────────────────────────

const NETZE = new WeakMap();

/** Hauptobjekt an einem Nachbarfeld ({ kk, o } oder null). */
function hauptAn(ort, x, y) {
  const o = ort.welt.objekte[L.k(x, y)];
  if (!o) return null;
  const h = L.hauptVon(ort, x, y, o);
  return h.o ? h : null;
}

function bauen(s, ort) {
  const { welt } = ort;
  const rohre = new Map();
  for (const kk in welt.objekte) if (welt.objekte[kk].t === ROHR_T) rohre.set(kk, welt.objekte[kk]);
  const netze = [];
  const netzVon = new Map();
  const pumpen = new Map(); // kk → { kk, o, netze }
  const verbraucher = new Map();
  const anhaengen = (map, h, netz, liste) => {
    let e = map.get(h.kk);
    if (!e) { e = { kk: h.kk, o: h.o, netze: [] }; map.set(h.kk, e); }
    if (!e.netze.includes(netz)) { e.netze.push(netz); liste.push(e); }
  };
  for (const start of rohre.keys()) {
    if (netzVon.has(start)) continue;
    const netz = { id: start, rohre: [], pumpen: [], verbraucher: [], grenze: Infinity, inhalt: 0, dq: 0, da: 0, info: null };
    const offen = [start];
    netzVon.set(start, netz);
    while (offen.length) {
      const kk = offen.pop();
      const o = rohre.get(kk);
      netz.rohre.push({ kk, o });
      netz.grenze = Math.min(netz.grenze, rohrGrenze(o));
      const [x, y] = L.ausK(kk);
      for (const [dx, dy] of KREUZ) {
        const nk = L.k(x + dx, y + dy);
        if (rohre.has(nk)) { if (!netzVon.has(nk)) { netzVon.set(nk, netz); offen.push(nk); } continue; }
        const h = hauptAn(ort, x + dx, y + dy);
        if (!h) continue;
        if (h.o.t === PUMPE_T) anhaengen(pumpen, h, netz, netz.pumpen);
        else if (istVerbraucher(h.o)) anhaengen(verbraucher, h, netz, netz.verbraucher);
      }
    }
    netz.rohre.sort((a, b) => (a.kk < b.kk ? -1 : 1)); // feste Reihenfolge (Verteilung, Anzeige)
    // Inhalt und Durchfluss aus den Rohren übernehmen (nach dem Laden oder Umbauen); Durchfluss nur am ersten Rohr
    for (const r of netz.rohre) {
      netz.inhalt += zahl(r.o.fl);
      netz.dq = Math.max(netz.dq, zahl(r.o.dq));
      netz.da = Math.max(netz.da, zahl(r.o.da));
    }
    netz.inhalt = Math.min(netz.inhalt, netz.rohre.length * ROHR.volumen);
    for (const r of netz.rohre.slice(1)) { delete r.o.dq; delete r.o.da; }
    netze.push(netz);
  }
  return { stand: aenderungsStand(), s, alter: 0, netze, netzVon, pumpen, verbraucher };
}

/** Rohrnetze einer Karte (gecacht, neu nach jeder Änderung an Fabrikteilen; ab und zu wird nachgeprüft). */
export function rohrNetze(s, ort) {
  let c = NETZE.get(ort.welt);
  if (c && c.stand === aenderungsStand() && c.s === s) {
    if (++c.alter % 64) return c;
    let gleich = true;
    for (const n of c.netze) for (const r of n.rohre) if (ort.welt.objekte[r.kk] !== r.o) { gleich = false; break; }
    for (const p of c.pumpen.values()) if (ort.welt.objekte[p.kk] !== p.o) gleich = false;
    if (gleich) return c;
  }
  c = bauen(s, ort);
  NETZE.set(ort.welt, c);
  return c;
}

const volumenVon = (netz) => netz.rohre.length * ROHR.volumen;

// ─── Schritt ────────────────────────────────────────────────────────────────

/** Ein Wasser-Schritt von dt Sekunden auf einer Karte. */
export function wasserSchritt(s, ort, dt) {
  const c = rohrNetze(s, ort);
  if (!c.netze.length) return c;
  const a = dt > 0 ? 1 - Math.exp(-dt / ROHR.durchflussFenster) : 0;
  for (const p of c.pumpen.values()) { p.f = stromFaktor(s, ort, p.o); p.soll = (PUMPE.rate / 60) * p.f * dt; p.geliefert = 0; }
  for (const netz of c.netze) {
    const vol = volumenVon(netz);
    let inhalt = Math.min(vol, netz.inhalt);
    const lim = (netz.grenze / 60) * dt;
    let soll = 0;
    for (const p of netz.pumpen) soll += p.soll / p.netze.length;
    const zu = Math.max(0, Math.min(soll, vol - inhalt, lim));
    inhalt += zu;
    if (soll > 0) for (const p of netz.pumpen) p.geliefert += (zu * (p.soll / p.netze.length)) / soll;
    let frei = 0;
    for (const v of netz.verbraucher) { v.frei = Math.max(0, GENERATOREN[v.o.t].tank - zahl(v.o.wa)); frei += v.frei; }
    const ab = Math.max(0, Math.min(inhalt, lim, frei));
    if (ab > 0) for (const v of netz.verbraucher) v.o.wa = Math.min(GENERATOREN[v.o.t].tank, zahl(v.o.wa) + (ab * v.frei) / frei);
    inhalt -= ab;
    netz.inhalt = inhalt;
    if (dt > 0) {
      netz.dq = netz.dq * (1 - a) + (zu / dt) * 60 * a;
      netz.da = netz.da * (1 - a) + (ab / dt) * 60 * a;
    }
    // für Speichern und Umbauen: gleich verteilt und gerundet in die Rohre, Durchfluss nur ins erste
    const je = rund(inhalt / netz.rohre.length, 1000);
    for (const r of netz.rohre) r.o.fl = je;
    const erstes = netz.rohre[0].o;
    if (netz.dq >= 0.05) erstes.dq = rund(netz.dq, 10); else delete erstes.dq;
    if (netz.da >= 0.05) erstes.da = rund(netz.da, 10); else delete erstes.da;
    netz.info = { zu: dt > 0 ? (zu / dt) * 60 : 0, ab: dt > 0 ? (ab / dt) * 60 : 0, soll: dt > 0 ? (soll / dt) * 60 : 0 };
  }
  for (const p of c.pumpen.values()) {
    p.o.st = p.f <= 0 ? 'x' : p.geliefert + 1e-9 >= p.soll ? 'a' : 'v';
    if (p.soll > 1e-9) p.o.pa = rund(Math.min(1, p.geliefert / p.soll), 100);
  }
  return c;
}

fabrikSchrittVorher((s, ort, dt) => { wasserSchritt(s, ort, dt); });

/** Die Pumpe zieht nur Strom, wenn eines ihrer Netze noch Platz hat … */
stromWill(PUMPE_T, (s, ort, o, kk) => {
  const p = rohrNetze(s, ort).pumpen.get(kk);
  return !!p && p.netze.some((n) => n.inhalt < volumenVon(n) - 1e-6);
});
/** … und nur so viel, wie sie zuletzt fördern konnte (ein voller Tank, der langsam leert, braucht wenig). */
stromBedarf(PUMPE_T, (o) => PUMPE.leistung * (o.pa ?? 1));

/** Fließt im Netz des Rohrs kk gerade Wasser? (für die Animation im Bild) */
export function rohrFliesst(s, ort, kk) {
  const n = rohrNetze(s, ort).netzVon.get(kk);
  return !!n && (n.dq > 0.5 || n.da > 0.5);
}

/** Zahlen für das Rohr-Fenster (vom Rohr, von der Pumpe oder vom Kraftwerk kk aus). */
export function rohrInfo(s, ort, kk) {
  const c = rohrNetze(s, ort);
  const netz = c.netzVon.get(kk) ?? c.pumpen.get(kk)?.netze[0] ?? c.verbraucher.get(kk)?.netze[0];
  if (!netz) return null;
  const vol = volumenVon(netz);
  return {
    rohre: netz.rohre.length,
    grenze: netz.grenze,
    inhalt: netz.inhalt,
    volumen: vol,
    fuellung: vol ? netz.inhalt / vol : 0,
    zufluss: anzeige(netz.dq),
    abfluss: anzeige(netz.da),
    netzeAnPumpe: c.pumpen.get(kk)?.netze.length ?? 0,
    pumpen: netz.pumpen.map((p) => ({ kk: p.kk, st: p.o.st ?? 'x' })),
    verbraucher: netz.verbraucher.map((v) => ({ kk: v.kk, name: GENERATOREN[v.o.t].name, wasser: zahl(v.o.wa), tank: GENERATOREN[v.o.t].tank })),
    stufenGemischt: new Set(netz.rohre.map((r) => rohrGrenze(r.o))).size > 1,
  };
}

/** Nachbarmaske eines Rohrs für das Bild (1 oben, 2 rechts, 4 unten, 8 links): Rohre, Pumpen, Kraftwerke. */
export function rohrMaske(ort, x, y) {
  let m = 0;
  KREUZ.forEach(([dx, dy], i) => {
    const h = hauptAn(ort, x + dx, y + dy);
    if (h && (h.o.t === ROHR_T || h.o.t === PUMPE_T || istVerbraucher(h.o))) m |= 1 << i;
  });
  return m;
}

// ─── Objekte ────────────────────────────────────────────────────────────────

/** Am Ufer: ein Landfeld mit Wasser in der 4er-Nachbarschaft (wie die Fischfarm). Gibt die Wasserseite zurück oder -1. */
export function wasserSeite(def, x, y) {
  for (let i = 0; i < 4; i++) if (istWasser(def, x + KREUZ[i][0], y + KREUZ[i][1])) return i;
  return -1;
}

/** Platzregel für Pumpe und Wasserrad: freies Feld direkt am Wasser auf einer Fabrik-Karte. */
export function uferPlatz(c, name) {
  const p = platzPruefen(c, 1, 1, false);
  if (p !== true) return p;
  return wasserSeite(c.ort.def, c.x, c.y) >= 0 ? true : `${name} muss direkt am Wasser stehen.`;
}

/** Pumpe, Wasserrad, Strommast einsammeln: Kabel zurück, Objekt in den Rucksack. */
export function teilAufheben(c) {
  const { s, ort, x, y, o, erg } = c;
  if (L.platzFuer(s, { id: o.t, n: 1 }) < 1) { erg.grund = 'Dein Rucksack ist voll.'; return true; }
  kabelAlleLoesen(s, ort, L.k(x, y), erg);
  L.objektEntfernen(ort, x, y);
  L.geben(s, ort, x, y, { id: o.t, n: 1 }, erg);
  erg.treffer = 'aufheben';
  fabrikAenderung();
  return true;
}

function rohrAufheben(c) {
  const { s, ort, x, y, o, erg } = c;
  const id = o.mk > 1 ? 'rohrleitung_mk2' : ROHR_T;
  if (L.platzFuer(s, { id, n: 1 }) < 1) { erg.grund = 'Dein Rucksack ist voll.'; return true; }
  L.objektEntfernen(ort, x, y);
  L.geben(s, ort, x, y, { id, n: 1 }, erg);
  erg.treffer = 'aufheben';
  fabrikAenderung();
  return true;
}

const rohrFenster = ({ x, y }) => { ton('menue'); fenster('handwerk_rohrnetz', { x, y }); };

objektTyp(ROHR_T, {
  blockiert: false,
  axt: rohrAufheben,
  spitzhacke: rohrAufheben,
  platz: (c) => platzPruefen(c, 1, 1, true),
  anlegen(o, slot) {
    const mk = ITEMS[slot?.id]?.mk;
    if (mk > 1) o.mk = mk;
    o.fl = 0;
    uhrStarten();
    fabrikAenderung();
  },
  interagieren: rohrFenster,
  hinweis({ s, ort, x, y, o }) {
    const i = s && ort ? rohrInfo(s, ort, L.k(x, y)) : null;
    const name = o.mk > 1 ? 'Rohrleitung Mk2' : 'Rohrleitung';
    return i ? `${name}: ${Math.round(i.fuellung * 100)} % voll · ${Math.round(i.abfluss)} m³/min` : name;
  },
});

objektTyp(PUMPE_T, {
  blockiert: true,
  axt: teilAufheben,
  spitzhacke: teilAufheben,
  leistung: PUMPE.leistung,
  platz: (c) => uferPlatz(c, 'Die Wasserpumpe'),
  anlegen(o) { o.st = 'x'; uhrStarten(); fabrikAenderung(); },
  interagieren: rohrFenster,
  hinweis: ({ o }) => `Wasserpumpe ansehen (${{ a: 'pumpt', v: 'Netz voll', x: 'steht' }[o.st] ?? 'steht'})`,
});

BAU_TYPEN.add(ROHR_T);
BAU_TYPEN.add(PUMPE_T);
