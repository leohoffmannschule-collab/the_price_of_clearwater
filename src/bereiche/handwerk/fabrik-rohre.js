// Bereich „handwerk" – Fabrik Stufe 2: Rohrleitungen für Wasser (nicht die Holzrohre für Waren aus rohre.js).
// DOM-frei und deterministisch.
//
// Objekte:  Rohr { t: 'rohrleitung', mk?, fl, dq, da }   fl = Wasser im Rohrstück (m³), dq/da = Zu-/Abfluss (gleitend, m³/min)
//           Pumpe { t: 'wasserpumpe', st }               nur am Ufer; fördert PUMPE.rate m³/min, braucht Strom
//           Kohlekraftwerk  o.wa = Wasser im Tank (m³), Tank GENERATOREN.kohlekraftwerk.tank
// Rohre verbinden sich mit den vier Nachbarfeldern: andere Rohre (beide Stufen), Pumpen und Kraftwerke (jede Seite).
// Ein Rohrnetz ist ein Behälter: Volumen = Rohre · ROHR.volumen, Inhalt = Summe der fl (nach jedem Schritt gleich
// verteilt). Je Schritt: Zufluss = Pumpen (mal Strom-Takt), höchstens freies Volumen und Grenze; Abfluss = freier Platz in
// den Tanks der Verbraucher (anteilig), höchstens Inhalt und Grenze. Die Grenze (m³/min) ist die des schwächsten Rohrs.
// Läuft im selben Fabrik-Schritt wie Strom und Bänder (fabrikSchrittVorher), also auch beim Nachholen.

import { ITEMS, OBJEKT_TYPEN, objektTyp } from '../../daten.js';
import * as L from '../../logik.js';
import { istWasser } from '../../karten.js';
import { ton, fenster } from '../../spiel.js';
import { fabrikSchrittVorher, aenderungsStand, fabrikAenderung } from './fabrik-sim.js';
import { ROHR, PUMPE, GENERATOREN } from './fabrik-strom-daten.js';
import { stromFaktor, stromWill, kabelAlleLoesen } from './fabrik-strom.js';
import { platzPruefen, uhrStarten, BAU_TYPEN } from './fabrik-objekte.js';

export const ROHR_T = 'rohrleitung';
export const PUMPE_T = 'wasserpumpe';
const KREUZ = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // oben, rechts, unten, links
const istVerbraucher = (o) => !!GENERATOREN[o?.t]?.wasser;
export const rohrGrenze = (o) => ROHR.stufen[o?.mk]?.grenze ?? ROHR.stufen[1].grenze;
const zahl = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);

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
  const pumpeNetz = new Map();
  const verbraucherNetz = new Map();
  for (const start of rohre.keys()) {
    if (netzVon.has(start)) continue;
    const netz = { id: start, rohre: [], pumpen: [], verbraucher: [], grenze: Infinity, info: null };
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
        if (h.o.t === PUMPE_T && !pumpeNetz.has(h.kk)) { pumpeNetz.set(h.kk, netz); netz.pumpen.push({ kk: h.kk, o: h.o }); }
        else if (istVerbraucher(h.o) && !verbraucherNetz.has(h.kk)) { verbraucherNetz.set(h.kk, netz); netz.verbraucher.push({ kk: h.kk, o: h.o }); }
      }
    }
    netz.rohre.sort((a, b) => (a.kk < b.kk ? -1 : 1)); // feste Reihenfolge (Verteilung, Anzeige)
    netze.push(netz);
  }
  return { stand: aenderungsStand(), s, netze, netzVon, pumpeNetz, verbraucherNetz };
}

/** Rohrnetze einer Karte (gecacht, neu nach jeder Änderung an Fabrikteilen). */
export function rohrNetze(s, ort) {
  let c = NETZE.get(ort.welt);
  if (c && c.stand === aenderungsStand() && c.s === s) {
    let gleich = true;
    for (const n of c.netze) for (const r of n.rohre) if (ort.welt.objekte[r.kk] !== r.o) { gleich = false; break; }
    if (gleich) return c;
  }
  c = bauen(s, ort);
  NETZE.set(ort.welt, c);
  return c;
}

const inhaltVon = (netz) => netz.rohre.reduce((n, r) => n + zahl(r.o.fl), 0);
const volumenVon = (netz) => netz.rohre.length * ROHR.volumen;

// ─── Schritt ────────────────────────────────────────────────────────────────

/** Ein Wasser-Schritt von dt Sekunden auf einer Karte. */
export function wasserSchritt(s, ort, dt) {
  const c = rohrNetze(s, ort);
  if (!c.netze.length) return c;
  const a = dt > 0 ? 1 - Math.exp(-dt / ROHR.durchflussFenster) : 0;
  for (const netz of c.netze) {
    const n = netz.rohre.length;
    const vol = volumenVon(netz);
    let inhalt = Math.min(vol, inhaltVon(netz));
    const lim = (netz.grenze / 60) * dt;
    let soll = 0;
    for (const p of netz.pumpen) { p.f = stromFaktor(s, ort, p.o); soll += (PUMPE.rate / 60) * p.f * dt; }
    const zu = Math.max(0, Math.min(soll, vol - inhalt, lim));
    inhalt += zu;
    for (const p of netz.pumpen) p.o.st = p.f <= 0 ? 'x' : zu + 1e-9 >= soll ? 'a' : 'v';
    let frei = 0;
    for (const v of netz.verbraucher) { v.frei = Math.max(0, GENERATOREN[v.o.t].tank - zahl(v.o.wa)); frei += v.frei; }
    const ab = Math.max(0, Math.min(inhalt, lim, frei));
    if (ab > 0) for (const v of netz.verbraucher) v.o.wa = Math.min(GENERATOREN[v.o.t].tank, zahl(v.o.wa) + (ab * v.frei) / frei);
    inhalt -= ab;
    for (const r of netz.rohre) {
      r.o.fl = inhalt / n;
      if (dt > 0) {
        r.o.dq = (zahl(r.o.dq) * (1 - a) + (zu / dt) * 60 * a);
        r.o.da = (zahl(r.o.da) * (1 - a) + (ab / dt) * 60 * a);
        if (r.o.dq < 0.05) r.o.dq = 0;
        if (r.o.da < 0.05) r.o.da = 0;
      }
    }
    netz.info = { zu: dt > 0 ? (zu / dt) * 60 : 0, ab: dt > 0 ? (ab / dt) * 60 : 0, soll: dt > 0 ? (soll / dt) * 60 : 0 };
  }
  return c;
}

fabrikSchrittVorher((s, ort, dt) => { wasserSchritt(s, ort, dt); });

/** Die Pumpe zieht nur Strom, wenn ihr Netz noch Platz hat. */
stromWill(PUMPE_T, (s, ort, o, kk) => {
  const netz = rohrNetze(s, ort).pumpeNetz.get(kk);
  return !!netz && inhaltVon(netz) < volumenVon(netz) - 1e-6;
});

/** Zahlen für das Rohr-Fenster (vom Rohr oder von der Pumpe kk aus). */
export function rohrInfo(s, ort, kk) {
  const c = rohrNetze(s, ort);
  const netz = c.netzVon.get(kk) ?? c.pumpeNetz.get(kk) ?? c.verbraucherNetz.get(kk);
  if (!netz) return null;
  const inhalt = inhaltVon(netz);
  const vol = volumenVon(netz);
  const r0 = netz.rohre[0]?.o;
  return {
    rohre: netz.rohre.length,
    grenze: netz.grenze,
    inhalt,
    volumen: vol,
    fuellung: vol ? inhalt / vol : 0,
    zufluss: zahl(r0?.dq),
    abfluss: zahl(r0?.da),
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
    if (h && (h.o.t === ROHR_T || h.o.t === PUMPE_T || istVerbraucher(h.o) || OBJEKT_TYPEN[h.o.t]?.wasseranschluss)) m |= 1 << i;
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
