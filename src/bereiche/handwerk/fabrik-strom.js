// Bereich „handwerk" – Fabrik Stufe 2: das Stromnetz wie in Satisfactory. DOM-frei und deterministisch.
//
// Anschlüsse sind Strommasten, Generatoren und alle Verbraucher (Maschinen mit `leistung`, Wasserpumpe). Kabel verbinden
// zwei Anschlüsse durch die Luft (höchstens STROM.kabelReichweite Felder, je Anschluss höchstens STROM.anschluesse);
// gespeichert als Liste je Karte:  s.fabrik.strom.kabel[karte] = [[a, b, n]…]  (a, b = "x,y" der Hauptobjekte,
// n = verbaute Kabel, die man beim Lösen zurückbekommt). Ein Netz ist eine Zusammenhangskomponente dieses Graphen.
//
// In jedem Fabrik-Schritt (fabrikSchrittVorher, also auch beim Nachholen über Nacht und auf anderen Karten):
//   Kapazität = Summe der Generatoren, die jetzt liefern können (Brennstoff da, beim Kraftwerk auch Wasser)
//   Bedarf    = Summe der Verbraucher, die jetzt arbeiten wollen (Rezept kann laufen, Ausgang nicht voll)
//   Bedarf > Kapazität > 0  →  die Sicherung fliegt (o.fl an allen Generatoren des Netzes): das ganze Netz steht, bis man
//   sie am Generator oder Mast wieder einschaltet. Kapazität 0 → kein Strom (ohne Sicherung).
//   Sonst laufen alle Verbraucher (Takt 1), die Generatoren mit der Auslastung Bedarf/Kapazität: ein Brennstoff hält bei
//   Teillast entsprechend länger (die Generatoren verbrennen über die Rezept-Mechanik der Fabrik, Takt = Auslastung).
// Maschinen ohne Netz stehen – außer in der Übergangszeit (s.fabrik.strom.frist, siehe fabrik-strom-objekte.js).
// Der Takt geht über den Modifikator `fabrikTempo` an die Fabrik.

import * as L from '../../logik.js';
import { OBJEKT_TYPEN } from '../../daten.js';
import { modifikator } from '../../system.js';
import { S, meldung } from '../../spiel.js';
import { FABRIK, MASCHINEN, SORTEN } from './fabrik-daten.js';
import { fabrikSchrittVorher, naechstesRezept, aenderungsStand } from './fabrik-sim.js';
import { STROM, GENERATOREN, anschluesseVon, bedarfVon } from './fabrik-strom-daten.js';

let kabelStand = 1;
/** Kabel haben sich geändert: Netze neu bilden. */
export const kabelGeaendert = () => { kabelStand++; };

const zahl = (x) => (Number.isFinite(Number(x)) ? Number(x) : NaN);
const summe = (m) => { let n = 0; for (const id in m || {}) n += m[id]; return n; };
/** MW lesbar: ganze Zahlen ohne, sonst eine Nachkommastelle. */
export const mw = (x) => (Math.round(x * 10) / 10).toLocaleString('de-DE');

// ─── Zustand ────────────────────────────────────────────────────────────────

/** `s.fabrik.strom` anlegen und glätten: { frist, starter, kabel: { <karte>: [[a, b, n]…] } }. */
export function stromZustand(s) {
  const f = s.fabrik && typeof s.fabrik === 'object' ? s.fabrik : (s.fabrik = {});
  const st = f.strom && typeof f.strom === 'object' ? f.strom : (f.strom = {});
  if (!Number.isFinite(zahl(st.frist))) st.frist = L.tagNr(s.zeit) + STROM.uebergangTage - 1;
  st.starter = st.starter ? 1 : 0;
  if (!st.kabel || typeof st.kabel !== 'object' || Array.isArray(st.kabel)) st.kabel = {};
  for (const id of Object.keys(st.kabel)) {
    const liste = Array.isArray(st.kabel[id]) ? st.kabel[id] : [];
    st.kabel[id] = liste.filter((e) => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'string' && e[0] !== e[1])
      .map(([a, b, n]) => [a, b, Math.max(1, Math.round(zahl(n)) || 1)]);
  }
  return st;
}

/** Läuft die Übergangszeit noch (Maschinen ohne Netz arbeiten)? */
export const uebergang = (s) => !!s.fabrik?.strom && L.tagNr(s.zeit) <= s.fabrik.strom.frist;
/** Tage Übergangszeit, die noch bleiben (heute mitgezählt). */
export const uebergangRest = (s) => (s.fabrik?.strom ? Math.max(0, s.fabrik.strom.frist - L.tagNr(s.zeit) + 1) : 0);

/** Kabel einer Karte (die Liste im Spielstand, ohne Kopie). */
export function kabelListe(s, ort) {
  const st = s.fabrik?.strom?.kabel ? s.fabrik.strom : stromZustand(s);
  return (st.kabel[ort.def.id] ??= []);
}

// ─── Netze (Cache je Karte) ─────────────────────────────────────────────────

const NETZE = new WeakMap();
const flaeche = (o) => OBJEKT_TYPEN[o.t]?.flaeche ?? [1, 1];

/** Mitte eines Anschlusses in Feldern (für die Kabellänge). */
export function anschlussMitte(kk, o) {
  const [x, y] = L.ausK(kk);
  const [b, h] = flaeche(o);
  return [x + b / 2, y + h / 2];
}

function artVon(t) {
  if (t === 'strommast') return 'mast';
  if (GENERATOREN[t]) return 'gen';
  return 'verb';
}

function bauen(s, ort) {
  const { welt } = ort;
  const knoten = new Map();
  for (const kk in welt.objekte) {
    const o = welt.objekte[kk];
    const max = anschluesseVon(o.t);
    if (!max) continue;
    const art = artVon(o.t);
    knoten.set(kk, { kk, o, art, max, kabel: [], netz: null, leistung: art === 'verb' ? bedarfVon(o.t) : 0, gen: GENERATOREN[o.t] ?? null });
  }
  const liste = s.fabrik?.strom?.kabel?.[ort.def.id] ?? [];
  // Kabel, deren Enden fehlen (Teil ersetzt oder entfernt), fallen weg
  for (let i = liste.length - 1; i >= 0; i--) {
    const [a, b] = liste[i];
    if (!knoten.has(a) || !knoten.has(b) || a === b) liste.splice(i, 1);
  }
  const eltern = new Map();
  const finde = (k) => { let r = k; while (eltern.has(r) && eltern.get(r) !== r) r = eltern.get(r); eltern.set(k, r); return r; };
  for (const kk of knoten.keys()) eltern.set(kk, kk);
  for (const [a, b] of liste) {
    knoten.get(a).kabel.push(b);
    knoten.get(b).kabel.push(a);
    const ra = finde(a);
    const rb = finde(b);
    if (ra !== rb) eltern.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  }
  const netze = new Map();
  const ohne = [];
  let verbraucher = 0;
  for (const n of knoten.values()) {
    if (n.art === 'verb') verbraucher++;
    if (n.art === 'verb' && !n.kabel.length) { ohne.push(n); continue; }
    const r = finde(n.kk);
    let netz = netze.get(r);
    if (!netz) { netz = { id: r, knoten: [], gens: [], verb: [], masten: [], info: null }; netze.set(r, netz); }
    netz.knoten.push(n);
    n.netz = netz;
    if (n.art === 'gen') netz.gens.push(n);
    else if (n.art === 'verb') netz.verb.push(n);
    else netz.masten.push(n);
  }
  return { stand: `${aenderungsStand()}:${kabelStand}`, s, welt, knoten, netze: [...netze.values()], ohne, kabel: liste, verbraucher };
}

/** Netze einer Karte (gecacht; neu bei Änderungen an Fabrik oder Kabeln, oder wenn ein Teil verschwunden ist). */
export function stromNetze(s, ort) {
  let c = NETZE.get(ort.welt);
  const stand = `${aenderungsStand()}:${kabelStand}`;
  if (c && c.stand === stand && c.s === s) {
    let gleich = true;
    for (const n of c.knoten.values()) if (ort.welt.objekte[n.kk] !== n.o) { gleich = false; break; }
    if (gleich) return c;
  }
  c = bauen(s, ort);
  NETZE.set(ort.welt, c);
  return c;
}

// ─── Leistung je Schritt ────────────────────────────────────────────────────

const FAKTOR = new WeakMap(); // Objekt → Takt 0..1 im laufenden Schritt (Verbraucher 0/1, Generatoren = Auslastung)
const WILL = {}; // Objekttyp → (s, ort, o, kk) → will arbeiten (für Verbraucher ohne Rezept, z. B. Pumpe)
const BEDARF = {}; // Objekttyp → (o) → MW jetzt (sonst die volle Leistung), z. B. Pumpe nach Förderung
/** Eigene Regel, wann ein Verbraucher Strom zieht: stromWill('wasserpumpe', (s, ort, o, kk) => …). */
export function stromWill(t, fn) { WILL[t] = fn; }
/** Eigener Bedarf eines Verbrauchers (MW), solange er arbeiten will: stromBedarf('wasserpumpe', (o) => …). */
export function stromBedarf(t, fn) { BEDARF[t] = fn; }
/** Verbraucher mit Vorrang: reicht die Leistung nicht für alle, laufen sie allein weiter (Anlauf eines Kraftwerks). */
export const VORRANG = new Set(['wasserpumpe']);
const bedarfJetzt = (v) => (BEDARF[v.o.t] ? BEDARF[v.o.t](v.o) : v.leistung);

/** Reihenfolge, in der Generatoren die Last übernehmen: ohne Brennstoff zuerst, dann das Kraftwerk, Brenner als Reserve. */
const rang = (g) => (g.gen.frei ? 0 : g.gen.wasser ? 1 : 2);

/** Kann ein Generator jetzt liefern? (Brennstoff in Arbeit oder im Eingang; beim Kraftwerk auch Wasser im Tank) */
export function genKann(o) {
  const g = GENERATOREN[o.t];
  if (!g) return false;
  if (g.frei) return true;
  if (g.wasser && !((o.wa || 0) > 1e-6)) return false;
  return !!o.arb || !!naechstesRezept(o);
}

/** Will ein Verbraucher jetzt arbeiten? Stehende Maschinen (Eingang fehlt, Ausgang voll) ziehen keinen Strom. */
export function willArbeiten(s, ort, o, kk) {
  if (o.t === 'erzbohrer') return !!SORTEN[o.erz] && summe(o.aus) < FABRIK.bohrerPuffer;
  const def = MASCHINEN[o.t];
  if (def?.rezepte) {
    if (o.arb) return true;
    const id = naechstesRezept(o);
    return !!id && summe(o.aus) + summe(def.rezepte[id].aus) <= FABRIK.ausPuffer;
  }
  const fn = WILL[o.t];
  return fn ? !!fn(s, ort, o, kk) : true;
}

/** Bedarf, Vorrang-Bedarf und Kapazität eines Netzes jetzt (ohne etwas zu ändern). */
function netzRechnen(s, ort, netz) {
  let kap = 0;
  let bedarf = 0;
  let vorrang = 0;
  let max = 0;
  for (const g of netz.gens) { g.kann = genKann(g.o); if (g.kann) kap += g.gen.leistung; }
  for (const v of netz.verb) {
    max += v.leistung;
    v.will = willArbeiten(s, ort, v.o, v.kk);
    v.jetzt = v.will ? bedarfJetzt(v) : 0;
    bedarf += v.jetzt;
    if (VORRANG.has(v.o.t)) vorrang += v.jetzt;
  }
  return { kap, bedarf, vorrang, max };
}

function sicherungGeflogen(s, ort, bedarf, kap) {
  if (S.s === s && S.ort?.welt === ort.welt) {
    meldung(`Überlast: ${mw(bedarf)} MW Bedarf, aber nur ${mw(kap)} MW Leistung. Die Sicherung ist geflogen – am Generator oder Strommast wieder einschalten.`, 'warn');
  }
}

function netzSchritt(s, ort, netz, dt) {
  const { kap, bedarf, vorrang: vBedarf, max } = netzRechnen(s, ort, netz);
  let geflogen = netz.gens.some((g) => g.o.fl);
  let vorrang = false;
  if (!geflogen && kap > 0 && bedarf > kap + 1e-9) {
    if (vBedarf > 1e-9 && vBedarf <= kap + 1e-9) vorrang = true; // Lastabwurf: nur die Pumpen laufen
    else {
      geflogen = true;
      for (const g of netz.gens) { g.o.fl = 1; g.o.flg = [Math.round(bedarf * 10) / 10, kap]; }
      sicherungGeflogen(s, ort, bedarf, kap);
    }
  }
  const status = geflogen ? 'sicherung' : !netz.gens.length ? 'ohne' : kap <= 0 ? 'leer' : vorrang ? 'vorrang' : 'an';
  const laeuft = status === 'an' || status === 'vorrang';
  const last = status === 'an' ? bedarf : vorrang ? vBedarf : 0;
  for (const v of netz.verb) {
    const f = status === 'an' || (vorrang && VORRANG.has(v.o.t)) ? 1 : 0;
    FAKTOR.set(v.o, f);
    v.lauf = f > 0 && v.will;
  }
  // Last verteilen: Wasserrad zuerst, dann Kraftwerk, Brenner als Reserve (verheizt nur, was gebraucht wird)
  let rest = last;
  let erzeugt = 0;
  const reihe = netz.gens.slice().sort((a, b) => rang(a) - rang(b));
  for (const g of reihe) {
    let f = 0;
    if (laeuft && g.kann && rest > 1e-9) { const teil = Math.min(g.gen.leistung, rest); f = teil / g.gen.leistung; rest -= teil; }
    FAKTOR.set(g.o, f);
    if (g.gen.frei) g.o.st = f > 0 ? 'a' : 'x';
    if (g.gen.wasser && f > 0 && dt > 0) g.o.wa = Math.max(0, (g.o.wa || 0) - (g.gen.wasser / 60) * f * dt);
    g.erzeugt = f * g.gen.leistung;
    g.reserve = laeuft && g.kann && f === 0;
    erzeugt += g.erzeugt;
  }
  netz.info = { status, kap, bedarf, vorrang: vBedarf, max, last: kap > 0 ? last / kap : 0, erzeugt };
}

/** Ein Strom-Schritt auf einer Karte (dt = 0: nur rechnen, nichts verbrauchen). Gibt den Netz-Cache zurück. */
export function stromSchritt(s, ort, dt) {
  if (!s.fabrik?.strom) return null;
  const c = stromNetze(s, ort);
  if (!c.knoten.size) return c;
  const ueb = uebergang(s);
  for (const n of c.ohne) FAKTOR.set(n.o, ueb ? 1 : 0);
  for (const netz of c.netze) netzSchritt(s, ort, netz, dt);
  c.gerechnet = true;
  if (c.verbraucher && !s.fabrik.strom.starter) for (const fn of BEIM_ERSTEN) fn(s);
  return c;
}

const BEIM_ERSTEN = [];
/** fn(s) läuft, sobald es auf einer Karte zum ersten Mal einen Verbraucher gibt (Starterpaket). */
export function stromErsterVerbraucher(fn) { BEIM_ERSTEN.push(fn); }

/** Netz-Cache mit berechneten Werten (rechnet einmal ohne Verbrauch, wenn noch nichts gerechnet ist). */
export function stromStand(s, ort) {
  const c = stromNetze(s, ort);
  if (!c.gerechnet) stromSchritt(s, ort, 0);
  return c;
}

/** Takt 0..1 eines Objekts aus dem laufenden Schritt (Pumpe, Wasserrad); ohne Strom-Zustand 1. */
export function stromFaktor(s, ort, o) {
  if (!s.fabrik?.strom) return 1;
  let f = FAKTOR.get(o);
  if (f === undefined) { stromSchritt(s, ort, 0); f = FAKTOR.get(o); }
  return f ?? 1;
}

fabrikSchrittVorher((s, ort, dt) => { stromSchritt(s, ort, dt); });

modifikator('fabrikTempo', (w, k) => {
  const o = k.o;
  if (!o || !k.s?.fabrik?.strom || !k.ort) return w;
  if (!(bedarfVon(o.t) > 0) && !GENERATOREN[o.t]) return w;
  return w * stromFaktor(k.s, k.ort, o);
});

// ─── Abfragen für Fenster, Info und Kunst ───────────────────────────────────

const KURZ = { an: 'an', sicherung: 'Sicherung', leer: 'leer', ohne: 'ohne Generator', vorrang: 'Vorrang Pumpen' };

/** Wie steht ein Anschluss da? { art, netz, status, text, kurz } – für Info-Zeilen, LEDs und das Netzfenster. */
export function anschlussStatus(s, ort, kk) {
  const c = stromStand(s, ort);
  const n = c.knoten.get(kk);
  if (!n) return { status: 'kein', text: 'kein Stromanschluss', kurz: '–' };
  if (!n.netz) {
    if (uebergang(s)) {
      const rest = uebergangRest(s);
      return { n, status: 'uebergang', kurz: 'Übergang', text: `Übergangsstrom aus dem Dorf (noch ${rest} ${rest === 1 ? 'Tag' : 'Tage'}) – mit einem Kabel an ein Stromnetz anschließen` };
    }
    return { n, status: 'aus', kurz: 'kein Netz', text: 'kein Strom: nicht angeschlossen. Ein Kabel zu einem Strommast oder Generator legen.' };
  }
  const i = n.netz.info ?? { status: 'ohne', kap: 0, bedarf: 0, max: 0, last: 0, erzeugt: 0 };
  const pumpe = VORRANG.has(n.o.t);
  const text = {
    an: `versorgt · Netz ${mw(i.erzeugt)} von ${mw(i.kap)} MW`,
    vorrang: pumpe
      ? `versorgt (Vorrang) · Netz ${mw(i.erzeugt)} von ${mw(i.kap)} MW`
      : `wartet: Pumpen haben Vorrang – die Leistung reicht nicht für alle (es fehlen ${mw(i.bedarf - i.kap)} MW)`,
    sicherung: 'Sicherung geflogen – am Generator oder Strommast wieder einschalten',
    leer: 'kein Strom: den Generatoren fehlt Brennstoff (das Kraftwerk braucht auch Wasser)',
    ohne: 'kein Strom: in diesem Netz ist kein Generator',
  }[i.status];
  return { n, netz: n.netz, info: i, status: i.status, kurz: KURZ[i.status], text };
}

/** Was jetzt zu tun ist, wenn die Sicherung geflogen ist (rechnet mit dem Stand von jetzt). */
function rat(s, ort, netz) {
  const { kap, bedarf, vorrang } = netzRechnen(s, ort, netz);
  if (kap <= 0) return 'Den Generatoren fehlt Brennstoff (oder Wasser) – erst nachlegen, dann einschalten.';
  if (bedarf <= kap + 1e-9 || (vorrang > 0 && vorrang <= kap)) return `Leistung reicht jetzt (${mw(bedarf)} von ${mw(kap)} MW) – Sicherung einschalten.`;
  return `Es fehlen ${mw(bedarf - kap)} MW: mehr Generatoren anschließen oder Maschinen abklemmen, dann einschalten.`;
}

const ZUSTAND = { sicherung: 'steht (Sicherung)', leer: 'steht (kein Strom)', ohne: 'steht (kein Strom)' };

/** Übersicht eines Netzes (vom Anschluss kk aus): Zahlen und Listen für das Netzfenster. */
export function netzUebersicht(s, ort, kk) {
  const a = anschlussStatus(s, ort, kk);
  if (!a.netz) return { ...a, gens: [], verb: [], masten: 0, kabel: 0 };
  const netz = a.netz;
  let kabel = 0;
  for (const n of netz.knoten) kabel += n.kabel.length;
  const st = a.status;
  const zustand = (v) => ZUSTAND[st]
    ?? (st === 'vorrang' && !VORRANG.has(v.o.t) ? 'wartet (Pumpen haben Vorrang)' : v.will ? 'arbeitet' : 'wartet');
  return {
    ...a,
    rat: st === 'sicherung' ? rat(s, ort, netz) : null,
    gens: netz.gens.map((g) => ({ kk: g.kk, o: g.o, name: g.gen.name, leistung: g.gen.leistung, erzeugt: g.erzeugt || 0, kann: !!g.kann, reserve: !!g.reserve })),
    verb: netz.verb.map((v) => ({
      kk: v.kk, o: v.o, name: MASCHINEN[v.o.t]?.name ?? (v.o.t === 'wasserpumpe' ? 'Wasserpumpe' : v.o.t),
      leistung: v.leistung, jetzt: v.jetzt ?? 0, will: !!v.will, zustand: zustand(v),
    })),
    masten: netz.masten.length,
    kabel: kabel / 2,
  };
}

/** Sicherung des Netzes am Anschluss kk wieder einschalten. Ergebnis { ok, text } oder { grund }. */
export function sicherungEin(s, ort, kk) {
  const c = stromNetze(s, ort);
  const n = c.knoten.get(kk);
  if (!n?.netz) return { grund: 'Hier hängt kein Netz.' };
  const netz = n.netz;
  if (!netz.gens.some((g) => g.o.fl)) return { grund: 'Die Sicherung ist drin.' };
  for (const g of netz.gens) { delete g.o.fl; delete g.o.flg; }
  const { kap, bedarf, vorrang, max } = netzRechnen(s, ort, netz);
  stromSchritt(s, ort, 0);
  if (kap <= 0) return { ok: true, text: 'Sicherung eingeschaltet – aber den Generatoren fehlt Brennstoff (das Kraftwerk braucht auch Wasser). Erst nachlegen.' };
  if (bedarf > kap + 1e-9 && !(vorrang > 0 && vorrang <= kap + 1e-9)) {
    return { ok: true, flog: true, text: `Die Sicherung fliegt sofort wieder: ${mw(bedarf)} MW Bedarf, ${mw(kap)} MW Leistung. Mehr Generatoren anschließen oder Maschinen abklemmen.` };
  }
  if (bedarf > kap + 1e-9) return { ok: true, text: `Sicherung eingeschaltet. Die Leistung reicht noch nicht für alle: erst laufen die Pumpen (${mw(vorrang)} MW), die anderen warten.` };
  if (max > kap) return { ok: true, text: `Sicherung eingeschaltet. Achtung: Arbeiten alle Maschinen gleichzeitig, brauchen sie ${mw(max)} MW – mehr als ${mw(kap)} MW.` };
  return { ok: true, text: 'Sicherung eingeschaltet. Der Strom fließt wieder.' };
}

// ─── Kabel ──────────────────────────────────────────────────────────────────

/** Kabel am Anschluss kk: [{ i, a, b, n, anderes }]. */
export function kabelAn(s, ort, kk) {
  const liste = kabelListe(s, ort);
  const r = [];
  liste.forEach(([a, b, n], i) => { if (a === kk || b === kk) r.push({ i, a, b, n, anderes: a === kk ? b : a }); });
  return r;
}

/** Länge zwischen zwei Anschlüssen (Felder, Mitte zu Mitte). */
export function kabelLaenge(ort, a, b) {
  const oa = ort.welt.objekte[a];
  const ob = ort.welt.objekte[b];
  if (!oa || !ob) return Infinity;
  const [ax, ay] = anschlussMitte(a, oa);
  const [bx, by] = anschlussMitte(b, ob);
  return Math.hypot(ax - bx, ay - by);
}
/** Kabel, die eine Verbindung dieser Länge kostet. */
export const kabelKosten = (laenge) => Math.max(1, Math.ceil(laenge - 1e-9)) * STROM.kabelJeFeld;

/** Darf a mit b verbunden werden? { ok, laenge, kosten } oder { grund }. */
export function kabelPruefen(s, ort, a, b) {
  const c = stromNetze(s, ort);
  const na = c.knoten.get(a);
  const nb = c.knoten.get(b);
  if (!na || !nb) return { grund: 'Kabel verbinden nur Strommasten, Generatoren und Maschinen.' };
  if (a === b) return { grund: 'Ein Kabel braucht zwei verschiedene Anschlüsse.' };
  const liste = kabelListe(s, ort);
  if (liste.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return { grund: 'Die beiden sind schon verbunden.' };
  const laenge = kabelLaenge(ort, a, b);
  if (laenge > STROM.kabelReichweite + 1e-9) return { grund: `Zu weit: ${mw(laenge)} Felder (höchstens ${STROM.kabelReichweite}). Einen Strommast dazwischen stellen.`, laenge };
  for (const n of [na, nb]) {
    if (n.kabel.length >= n.max) return { grund: `${n.o.t === 'strommast' ? 'Der Strommast' : 'Dieser Anschluss'} hat keinen freien Platz mehr (${n.max} ${n.max === 1 ? 'Anschluss' : 'Anschlüsse'}).` };
  }
  return { ok: true, laenge, kosten: kabelKosten(laenge) };
}

/**
 * a und b mit einem Kabel verbinden. Bezahlt wird mit Stromkabeln aus dem Rucksack (je Feld eins); fehlen welche,
 * ersetzt Kupferdraht sie. Ergebnis { ok, text, kosten } oder { grund }.
 */
export function kabelVerbinden(s, ort, a, b) {
  const p = kabelPruefen(s, ort, a, b);
  if (!p.ok) return p;
  const kabel = L.anzahl(s, 'stromkabel');
  const draht = L.anzahl(s, 'kupferdraht');
  if (kabel + draht * STROM.drahtErsatz < p.kosten) return { grund: `Zu wenig Kabel: ${p.kosten} nötig, ${kabel} im Rucksack${draht ? ` (dazu ${draht} Kupferdraht)` : ''}.` };
  const ausKabel = Math.min(kabel, p.kosten);
  if (ausKabel) L.entfernen(s, 'stromkabel', ausKabel);
  const rest = p.kosten - ausKabel;
  if (rest > 0) L.entfernen(s, 'kupferdraht', Math.ceil(rest / STROM.drahtErsatz));
  kabelListe(s, ort).push([a, b, p.kosten]);
  kabelGeaendert();
  const f = s.fabrik;
  if (f.zeit && f.zeit[ort.def.id] == null) f.zeit[ort.def.id] = f.t || 0;
  return { ok: true, kosten: p.kosten, laenge: p.laenge, text: `Kabel verlegt (${mw(p.laenge)} Felder, ${p.kosten} Kabel).` };
}

/** Ein Kabel (Index in der Liste der Karte) lösen; die Kabel kommen zurück (Rucksack, sonst vor die Füße). */
export function kabelLoesen(s, ort, i, erg = L.neuesErgebnis()) {
  const liste = kabelListe(s, ort);
  const e = liste[i];
  if (!e) return erg;
  liste.splice(i, 1);
  const [x, y] = L.ausK(e[0]);
  L.geben(s, ort, x, y, { id: 'stromkabel', n: e[2] }, erg);
  kabelGeaendert();
  erg.ok = true;
  return erg;
}

/** Alle Kabel an kk lösen (beim Aufheben eines Teils). */
export function kabelAlleLoesen(s, ort, kk, erg = L.neuesErgebnis()) {
  if (!s.fabrik?.strom?.kabel?.[ort.def.id]) return erg;
  const liste = kabelListe(s, ort);
  for (let i = liste.length - 1; i >= 0; i--) if (liste[i][0] === kk || liste[i][1] === kk) kabelLoesen(s, ort, i, erg);
  return erg;
}
