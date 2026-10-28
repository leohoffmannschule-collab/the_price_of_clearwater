// Bereich „gemeinschaft" – Großabnehmer: Verträge erzeugen, annehmen, liefern, abrechnen (DOM-frei, kein Math.random).
//
// Zustand (JSON, Format v2): s.grossabnehmer = {
//   vertrauen: { <firma>: 0–10 },
//   angebote:  [Vertrag …]        was gerade am Schwarzen Brett hängt (wechselt alle `wechselTage` Tage)
//   laufend:   [Vertrag …]        angenommen, höchstens `maxLaufend`, je Firma höchstens einer
//   block:     Nummer des Dreitageblocks, für den `angebote` erzeugt wurden
//   nr:        Zähler für Vertragsnummern
//   paket:     [{ id, n }]        Boni, die nicht in den Rucksack passten (Abholen am Brett)
//   schuld:    { <firma>: g }     Rückforderung eines Vorschusses, die noch nicht bezahlt werden konnte
//   post:      [Brief-ID …]       Dankesbriefe, die morgen mit der Post kommen
//   erfuellt, verfallen, verdient  Zähler fürs Statistik-Zeile
// }
// Vertrag: { nr, firma, ware: { id, von? }, menge, geliefert, qMin, stueck (normaler Verkaufswert je Stück),
//            zuschlag, gesamt, vorschuss, strafe, bonus: { id, n } | null, tage, frist, angenommen, auto }
//
// REIHENFOLGE bei der Lieferung über die Versandkiste (Hook vorVerkauf): erst die Verträge mit der kürzesten Frist,
// bei gleicher Frist der ältere (kleinere Nummer). Jede Ware wird einmal gezählt: was ein Vertrag aus s.versand
// nimmt, ist weg, bevor der nächste Vertrag und danach der normale Verkauf an die Reihe kommen.

import { ITEMS, PFLANZEN, TAGE_PRO_JZ } from '../../daten.js';
import * as L from '../../logik.js';
import { zufall } from '../../zufall.js';
import { GROSS, FIRMEN, FIRMEN_IDS, POOLS, FISCH_ORTE, FISCH_SELTEN, POOL_SELTEN, ARTEFAKT, GEODE_TIEFE } from './grossabnehmer-daten.js';

const klemme = (x, a, b) => Math.max(a, Math.min(b, x));
const ganzZahl = (x, vorgabe = 0) => (Number.isFinite(x) ? Math.floor(x) : vorgabe);
export const heute = (s) => L.tagNr(s.zeit);

// ─── Zustand ────────────────────────────────────────────────────────────────

function istWare(w) {
  return !!w && typeof w === 'object' && !!ITEMS[w.id] && (w.von == null || !!ITEMS[w.von]);
}
function istVertrag(v, laufend) {
  if (!v || typeof v !== 'object' || !FIRMEN[v.firma] || !istWare(v.ware)) return false;
  for (const f of ['nr', 'menge', 'stueck', 'zuschlag', 'gesamt', 'vorschuss', 'tage']) if (!Number.isFinite(v[f])) return false;
  if (v.menge < 1) return false;
  return !laufend || Number.isFinite(v.frist);
}
function bereinigen(v, laufend) {
  v.menge = Math.floor(v.menge);
  v.geliefert = klemme(ganzZahl(v.geliefert), 0, v.menge);
  v.qMin = klemme(ganzZahl(v.qMin), 0, 3);
  v.strafe = Math.max(0, ganzZahl(v.strafe));
  v.vorschuss = Math.max(0, Math.floor(v.vorschuss));
  v.gesamt = Math.max(0, Math.floor(v.gesamt));
  v.tage = Math.max(1, Math.floor(v.tage));
  v.bonus = v.bonus && ITEMS[v.bonus.id] && v.bonus.n > 0 ? { id: v.bonus.id, n: Math.floor(v.bonus.n) } : null;
  v.auto = v.auto !== false;
  if (laufend) v.angenommen = ganzZahl(v.angenommen, v.frist - v.tage);
  return v;
}

/** Legt s.grossabnehmer an bzw. glättet es (Hook ergaenzen, auch für alte und beschädigte Stände). */
export function zustand(s) {
  const alt = s.grossabnehmer && typeof s.grossabnehmer === 'object' ? s.grossabnehmer : {};
  const g = (s.grossabnehmer = alt);
  const v0 = g.vertrauen && typeof g.vertrauen === 'object' ? g.vertrauen : {};
  g.vertrauen = Object.fromEntries(FIRMEN_IDS.map((f) => [f, klemme(ganzZahl(v0[f]), 0, GROSS.maxSterne)]));
  g.nr = Math.max(0, ganzZahl(g.nr));
  g.block = ganzZahl(g.block, -1);
  g.angebote = (Array.isArray(g.angebote) ? g.angebote : []).filter((v) => istVertrag(v, false)).map((v) => bereinigen(v, false));
  const gesehen = new Set();
  g.laufend = (Array.isArray(g.laufend) ? g.laufend : [])
    .filter((v) => istVertrag(v, true) && !gesehen.has(v.firma) && gesehen.add(v.firma))
    .slice(0, GROSS.maxLaufend).map((v) => bereinigen(v, true));
  g.paket = (Array.isArray(g.paket) ? g.paket : []).filter((p) => p && ITEMS[p.id] && p.n > 0).map((p) => ({ id: p.id, n: Math.floor(p.n) }));
  const sch = g.schuld && typeof g.schuld === 'object' ? g.schuld : {};
  g.schuld = Object.fromEntries(FIRMEN_IDS.filter((f) => sch[f] > 0).map((f) => [f, Math.floor(sch[f])]));
  g.post = (Array.isArray(g.post) ? g.post : []).filter((p) => typeof p === 'string');
  g.erfuellt = Math.max(0, ganzZahl(g.erfuellt));
  g.verfallen = Math.max(0, ganzZahl(g.verfallen));
  g.verdient = Math.max(0, ganzZahl(g.verdient));
  return g;
}

export const sterne = (s, firma) => zustand(s).vertrauen[firma] ?? 0;

/** Laufende Verträge in der Reihenfolge der Lieferung: kürzeste Frist zuerst, dann die kleinere Nummer. */
export function laufende(s) {
  return [...zustand(s).laufend].sort((a, b) => a.frist - b.frist || a.nr - b.nr);
}
export const vertragVon = (s, nr) => zustand(s).laufend.find((v) => v.nr === nr) ?? null;
export const tageRest = (s, v) => Math.max(0, v.frist - heute(s));
export const wareSlot = (v, extra = {}) => ({ id: v.ware.id, n: 1, ...(v.ware.von ? { von: v.ware.von } : {}), ...extra });
export function wareName(v) {
  const it = ITEMS[v.ware.id];
  return v.ware.von ? `${it.name} (${ITEMS[v.ware.von].name})` : it.name;
}
export const qualiName = (q) => ['', 'Silber', 'Gold', 'Iridium'][q] || '';

// ─── Waren im Rucksack und in der Versandkiste ─────────────────────────────

const passt = (x, ware, qMin) => !!x && x.id === ware.id && (!ware.von || x.von === ware.von) && (x.q || 0) >= qMin;
export const zaehle = (liste, ware, qMin = 0) => liste.reduce((n, x) => n + (passt(x, ware, qMin) ? x.n : 0), 0);
export const imRucksack = (s, v) => zaehle(s.spieler.inv, v.ware, v.qMin);
export const imVersand = (s, v) => zaehle(s.versand, v.ware, v.qMin);

/** Nimmt bis zu `max` passende Stück aus einer Fächerliste (schlechteste zulässige Qualität zuerst). Gibt die Zahl zurück. */
function nimm(liste, ware, qMin, max, rucksack) {
  const idx = liste.map((_, i) => i).filter((i) => passt(liste[i], ware, qMin)).sort((a, b) => (liste[a].q || 0) - (liste[b].q || 0) || a - b);
  let rest = max;
  for (const i of idx) {
    if (rest <= 0) break;
    const w = Math.min(rest, liste[i].n);
    liste[i].n -= w;
    rest -= w;
  }
  for (let i = liste.length - 1; i >= 0; i--) {
    if (liste[i] && liste[i].n <= 0) {
      if (rucksack) liste[i] = null; else liste.splice(i, 1);
    }
  }
  return max - rest;
}

// ─── Was es für den Spieler gibt ────────────────────────────────────────────

export function huehner(s) {
  return s.stall?.gebaut ? Math.max(0, ganzZahl(s.stall.anzahl) - ganzZahl(s.stall.neue)) : 0;
}
const FAEHIG = ['landwirtschaft', 'angeln', 'sammeln', 'bergbau', 'kampf'];
const tiefste = (s) => ganzZahl(s.mine?.tiefste);

/** Sind alle Voraussetzungen der Ware (`bed`) erfüllt? Ohne `bed` gibt es die Ware für jeden. */
export function machbar(s, bed = {}) {
  for (const [k, v] of Object.entries(bed)) {
    if (FAEHIG.includes(k)) { if (L.stufe(s, k) < v) return false; }
    else if (k === 'tiefe') { if (v === 0 ? !(s.flags?.mineOffen || tiefste(s) >= 1) : tiefste(s) < v) return false; }
    else if (k === 'stall') { if (huehner(s) < v) return false; }
    else if (k === 'freundschaft') { if (ganzZahl(s.stall?.freundschaft) < v) return false; }
    else return false; // unbekannte Bedingung: lieber nichts anbieten
  }
  return true;
}

/** Fortschritt 0..1 für die Menge. */
export function fortschritt(s, skill) {
  if (skill === 'huehner') return klemme(Math.log10(Math.max(1, huehner(s))) / 3, 0, 1);
  return klemme(L.stufe(s, skill) / 10, 0, 1);
}

const seltenVonPreis = (preis) => (preis >= POOL_SELTEN[1] ? 2 : preis >= POOL_SELTEN[0] ? 1 : 0);

function poolN(preis, pool) {
  const [a, b, c, d] = POOLS[pool].nGrenzen;
  const n0 = klemme(Math.round(POOLS[pool].n[0] / preis), a, b);
  const n1 = Math.max(n0 + 5, klemme(Math.round(POOLS[pool].n[1] / preis), c, d));
  return [n0, n1];
}

function saisonOk(s, p) {
  if (s.flags?.gewaechshaus) return true;
  return p.jz.includes(L.jahreszeit(s)) && TAGE_PRO_JZ - s.zeit.tag >= p.tage + 1;
}

/** Ernte, die der Spieler jetzt anbauen kann: Pool „gemuese" oder „obst". */
function ernteKandidaten(s, pool) {
  const liste = [];
  for (const p of Object.values(PFLANZEN)) {
    const it = ITEMS[p.ernte];
    if (!it || it.kat !== 'ernte' || it.sorte !== pool || !L.verkaufbar({ id: it.id }) || !saisonOk(s, p)) continue;
    liste.push({
      ware: { id: it.id }, n: poolN(L.preisVon({ id: it.id, n: 1 }, s), pool), selten: seltenVonPreis(it.preis), skill: POOLS[pool].skill,
      tageMin: p.tage + 3, q: true,
    });
  }
  return liste;
}

/** Fische, die der Spieler jetzt fangen kann (Jahreszeit, Gewässer, Angelstufe). */
function fischKandidaten(s) {
  const jz = L.jahreszeit(s);
  const maxSelt = FISCH_SELTEN.grund + FISCH_SELTEN.jeStufe * L.stufe(s, 'angeln');
  const liste = [];
  for (const it of Object.values(ITEMS)) {
    if (it.kat !== 'fisch' || !it.fisch || it.preis > FISCH_SELTEN.maxPreis || it.fisch.seltenheit > maxSelt) continue;
    if (!it.fisch.jz.includes(jz) || !it.fisch.orte.some((o) => FISCH_ORTE.includes(o)) || !L.verkaufbar({ id: it.id })) continue;
    liste.push({
      ware: { id: it.id }, n: poolN(L.preisVon({ id: it.id, n: 1 }, s), 'fisch'), selten: it.fisch.seltenheit >= 60 ? 2 : it.fisch.seltenheit >= 35 ? 1 : 0,
      skill: 'angeln', q: true,
    });
  }
  return liste;
}

function artefaktKandidaten() {
  const liste = [];
  for (const it of Object.values(ITEMS)) {
    if (it.kat !== 'artefakt' || !L.verkaufbar({ id: it.id })) continue;
    const ab = ARTEFAKT.sterne.filter(([w]) => it.preis >= w).at(-1)[1];
    liste.push({ ware: { id: it.id }, n: ARTEFAKT.menge, selten: it.preis >= ARTEFAKT.selten[1] ? 2 : it.preis >= ARTEFAKT.selten[0] ? 1 : 0, skill: 'sammeln', ab });
  }
  return liste;
}

/** Mineralien aus Geoden: erst, wenn der Spieler tief genug war, die Geode zu finden. */
function mineralKandidaten() {
  const liste = [];
  for (const it of Object.values(ITEMS)) {
    if (it.kat !== 'mineral' || !Array.isArray(it.quelle) || !L.verkaufbar({ id: it.id })) continue;
    const tiefen = it.quelle.filter((q) => q in GEODE_TIEFE).map((q) => GEODE_TIEFE[q]);
    if (!tiefen.length) continue;
    const ab = ARTEFAKT.sterne.filter(([w]) => it.preis >= w).at(-1)[1];
    liste.push({
      ware: { id: it.id }, n: ARTEFAKT.menge, selten: it.preis >= ARTEFAKT.selten[1] ? 2 : it.preis >= ARTEFAKT.selten[0] ? 1 : 0, skill: 'bergbau', ab,
      bed: { tiefe: Math.min(...tiefen) },
    });
  }
  return liste;
}

/** Eier: Hühner legen eine bestimmte Menge am Tag – danach richtet sich die kürzeste Frist. */
function tempoVon(s, id) {
  if (id === 'ei') return huehner(s);
  if (id === 'grossesei') return huehner(s) * klemme(ganzZahl(s.stall?.freundschaft) / 1000, 0, 1) * 0.6;
  return null;
}

/** Alle Waren, die diese Firma dem Spieler jetzt anbieten könnte (bei diesem Vertrauen). */
export function kandidaten(s, firmaId, sterneAnz = sterne(s, firmaId)) {
  const out = [];
  const pools = {};
  const poolHolen = (p) => (pools[p] ??= p === 'fisch' ? fischKandidaten(s) : p === 'artefakt' ? artefaktKandidaten() : p === 'mineral' ? mineralKandidaten() : ernteKandidaten(s, p));
  for (const e of FIRMEN[firmaId].waren) {
    if (e.pool) {
      for (const k of poolHolen(e.pool)) out.push({ ab: e.ab, ...k });
    } else if (e.von) {
      for (const k of poolHolen(e.von)) {
        const ware = { id: e.id, von: k.ware.id };
        if (!ITEMS[e.id] || (e.von === 'fisch' && ITEMS[k.ware.id].preis > 100)) continue;
        out.push({ ...e, ware, q: false, tageMin: k.tageMin });
      }
    } else if (ITEMS[e.id]) {
      out.push({ ...e, ware: { id: e.id } });
    }
  }
  return out.filter((k) => k.ab <= sterneAnz && machbar(s, k.bed) && ITEMS[k.ware.id] && L.verkaufbar(wareSlot({ ware: k.ware })));
}

// ─── Erzeugung ──────────────────────────────────────────────────────────────

const schoen = (n) => (n >= 300 ? Math.round(n / 50) * 50 : n >= 100 ? Math.round(n / 10) * 10 : n >= 30 ? Math.round(n / 5) * 5 : Math.round(n));
const zehner = (x) => Math.round(x / 10) * 10;

/** Zufallsstrom für (Spielstand-Seed, Block, Firma): gleiche Eingabe, gleiche Verträge. */
export function rngFuer(s, block, firmaIdx) {
  let h = (s.seed | 0) ^ Math.imul(block + 1, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) ^ Math.imul(firmaIdx + 1, 0xc2b2ae35);
  return zufall(h >>> 0);
}

/** Zuschlag auf den normalen Verkaufswert (1,5 … 3,0, in Schritten von 0,05). */
export function zuschlagVon(rel, selten, sterneAnz, zmax = GROSS.zuschlagMax) {
  const z = GROSS.zuschlagMin + GROSS.zuschlagMenge * rel + GROSS.zuschlagSelten * selten + GROSS.zuschlagStern * sterneAnz;
  return Math.round(klemme(z, GROSS.zuschlagMin, Math.min(zmax, GROSS.zuschlagMax)) * 20) / 20;
}

/** Ein Vertrag der Firma für diesen Spieler oder null, wenn es nichts Passendes gibt. `nr` wird erst vom Aufrufer vergeben. */
export function erzeugen(s, firmaId, r) {
  const sterneAnz = sterne(s, firmaId);
  const liste = kandidaten(s, firmaId, sterneAnz);
  for (let versuch = 0; versuch < 6 && liste.length; versuch++) {
    const k = liste.splice(Math.floor(r() * liste.length), 1)[0];
    const [n0, n1] = k.n;
    const f = fortschritt(s, k.skill);
    const x = klemme(GROSS.mengeGrund + GROSS.mengeFortschritt * f + GROSS.mengeStern * (sterneAnz / GROSS.maxSterne) + (r() - 0.5) * GROSS.mengeZufall, 0, 1);
    let menge = klemme(schoen(n0 + x * (n1 - n0)), n0, n1);
    const rel = n1 > n0 ? (menge - n0) / (n1 - n0) : 0;
    let tage = klemme(GROSS.fristMin + Math.round(rel * 8) + (k.selten >= 2 ? 1 : 0), GROSS.fristMin, GROSS.fristMax);
    tage = Math.max(tage, k.tageMin ?? 0);
    const tempo = tempoVon(s, k.ware.id);
    if (tempo != null) {
      const proTag = Math.max(0.1, tempo * 0.9);
      if (Math.ceil(menge / proTag) + 1 > GROSS.fristMax) menge = Math.min(menge, Math.floor((GROSS.fristMax - 1) * proTag));
      if (menge < n0) continue;
      tage = Math.max(tage, Math.ceil(menge / proTag) + 1);
    }
    if (tage > GROSS.fristMax) continue;
    let qMin = 0;
    const rq = r();
    if (k.q) {
      if (sterneAnz >= GROSS.qualiGoldAb && rq < GROSS.qualiChance * 0.6) qMin = 2;
      else if (sterneAnz >= GROSS.qualiSilberAb && rq < GROSS.qualiChance) qMin = 1;
    }
    const stueck = L.preisVon(wareSlot({ ware: k.ware }, qMin ? { q: qMin } : {}), s);
    if (!(stueck > 0)) continue;
    const zuschlag = zuschlagVon(rel, k.selten, sterneAnz, k.zmax);
    const gesamt = Math.max(10, zehner(menge * stueck * zuschlag));
    const vorschuss = zehner(gesamt * GROSS.vorschuss);
    const strafe = r() < GROSS.strafeChance ? Math.max(GROSS.strafeMin, zehner(gesamt * GROSS.strafeAnteil)) : 0;
    const bonusWurf = r();
    const bonusWahl = r();
    let bonus = null;
    if (bonusWurf < GROSS.bonusChance + GROSS.bonusChanceStern * sterneAnz) {
      const moeglich = FIRMEN[firmaId].bonus.filter(([ab, id]) => ab <= sterneAnz && ITEMS[id]);
      if (moeglich.length) {
        const [, id, n] = moeglich[Math.floor(bonusWahl * moeglich.length)];
        bonus = { id, n };
      }
    }
    return { firma: firmaId, ware: k.ware, menge, geliefert: 0, qMin, stueck, zuschlag, gesamt, vorschuss, strafe, bonus, tage, auto: true };
  }
  return null;
}

export const blockVon = (s) => Math.floor((heute(s) - 1) / GROSS.wechselTage);
/** Tage, bis die Angebote wechseln (1 = morgen früh gibt es neue). */
export const wechselIn = (s) => (zustand(s).block + 1) * GROSS.wechselTage + 1 - heute(s);

/** Sorgt dafür, dass die Angebote zum aktuellen Dreitageblock gehören. Gibt true zurück, wenn neu gewürfelt wurde. */
export function aktualisieren(s) {
  const g = zustand(s);
  const b = blockVon(s);
  if (g.block === b) return false;
  g.block = b;
  g.angebote = [];
  FIRMEN_IDS.forEach((f, i) => {
    const v = erzeugen(s, f, rngFuer(s, b, i));
    if (v) g.angebote.push({ nr: ++g.nr, ...v });
  });
  return true;
}
export function angebote(s) {
  aktualisieren(s);
  return zustand(s).angebote;
}

// ─── Annehmen ───────────────────────────────────────────────────────────────

/** Zahlt der Spieler aus; offene Rückforderung der Firma wird zuerst abgezogen. Gibt zurück, was ankommt. */
function auszahlen(s, firma, betrag) {
  const g = zustand(s);
  const abzug = Math.min(betrag, g.schuld[firma] || 0);
  if (abzug > 0) {
    g.schuld[firma] -= abzug;
    if (g.schuld[firma] <= 0) delete g.schuld[firma];
  }
  const netto = betrag - abzug;
  s.spieler.gold += netto;
  s.stats.verdient += netto;
  return { netto, abzug };
}

export function annehmen(s, nr) {
  const g = zustand(s);
  aktualisieren(s);
  const i = g.angebote.findIndex((v) => v.nr === nr);
  if (i < 0) return { grund: 'Dieses Angebot hängt nicht mehr am Brett.' };
  const o = g.angebote[i];
  const f = FIRMEN[o.firma];
  if (g.laufend.some((v) => v.firma === o.firma)) return { grund: `Mit ${f.kurz} läuft schon ein Vertrag.` };
  if (g.laufend.length >= GROSS.maxLaufend) return { grund: `Es laufen schon ${GROSS.maxLaufend} Verträge. Erst einen erfüllen.` };
  g.angebote.splice(i, 1);
  const tag = heute(s);
  const v = { ...o, geliefert: 0, angenommen: tag, frist: tag + o.tage, auto: true };
  g.laufend.push(v);
  const z = auszahlen(s, o.firma, v.vorschuss);
  return { ok: true, vertrag: v, vorschuss: v.vorschuss, netto: z.netto, abzug: z.abzug };
}

export function autoSchalten(s, nr) {
  const v = vertragVon(s, nr);
  if (!v) return null;
  v.auto = !v.auto;
  return v.auto;
}

// ─── Abschluss ──────────────────────────────────────────────────────────────

const dankId = (v) => `grossdank-${v.firma}-${v.nr % 2 ? 'a' : 'b'}_${v.nr}`;

/** Bonus in den Rucksack, was nicht passt ins Paket am Brett. Gibt { ok, paket } zurück. */
function bonusGeben(s, bonus) {
  if (!bonus) return null;
  const rest = L.hinzufuegen(s, { id: bonus.id, n: bonus.n });
  if (rest > 0) {
    const p = zustand(s).paket.find((x) => x.id === bonus.id);
    if (p) p.n += rest; else zustand(s).paket.push({ id: bonus.id, n: rest });
  }
  return { ...bonus, paket: rest };
}

function abschliessen(s, v) {
  const g = zustand(s);
  g.laufend = g.laufend.filter((x) => x !== v);
  const z = auszahlen(s, v.firma, v.gesamt - v.vorschuss);
  const alt = g.vertrauen[v.firma];
  g.vertrauen[v.firma] = Math.min(GROSS.maxSterne, alt + GROSS.vertrauenErfuellt);
  g.erfuellt++;
  g.verdient += v.gesamt;
  const bonus = bonusGeben(s, v.bonus);
  g.post.push(dankId(v));
  return { fertig: true, vertrag: v, auszahlung: v.gesamt - v.vorschuss, netto: z.netto, abzug: z.abzug, bonus, sterne: g.vertrauen[v.firma], sterneNeu: g.vertrauen[v.firma] > alt };
}

/** Abgelaufen: Vorschuss gegen gelieferte Ware verrechnen, Strafe, Vertrauen −1. */
function verfallen(s, v) {
  const g = zustand(s);
  g.laufend = g.laufend.filter((x) => x !== v);
  const wertGeliefert = v.geliefert * v.stueck;
  const diff = v.vorschuss - wertGeliefert; // > 0: Firma will Geld zurück, < 0: Firma zahlt die gelieferte Ware
  let zurueck = 0;
  let schuld = 0;
  if (diff > 0) {
    zurueck = Math.min(s.spieler.gold, diff);
    s.spieler.gold -= zurueck;
    schuld = diff - zurueck;
    if (schuld > 0) g.schuld[v.firma] = (g.schuld[v.firma] || 0) + schuld;
    s.stats.verdient = Math.max(0, s.stats.verdient - zurueck);
  } else if (diff < 0) {
    s.spieler.gold += -diff;
    s.stats.verdient += -diff;
  }
  const strafe = Math.min(s.spieler.gold, v.strafe);
  s.spieler.gold -= strafe;
  const alt = g.vertrauen[v.firma];
  g.vertrauen[v.firma] = Math.max(0, alt + GROSS.vertrauenVerfall);
  g.verfallen++;
  return { vertrag: v, zurueck, schuld, nachzahlung: diff < 0 ? -diff : 0, strafe, sterne: g.vertrauen[v.firma], sterneAlt: alt };
}

// ─── Lieferung ──────────────────────────────────────────────────────────────

/** Teillieferung aus dem Rucksack. `n` = Zahl oder 'max'. */
export function liefern(s, nr, n) {
  const v = vertragVon(s, nr);
  if (!v) return { grund: 'Diesen Vertrag gibt es nicht mehr.' };
  const rest = v.menge - v.geliefert;
  const da = imRucksack(s, v);
  if (da <= 0) {
    const schlechter = v.qMin ? zaehle(s.spieler.inv, v.ware, 0) : 0;
    return { grund: schlechter ? `Deine ${wareName(v)} sind nicht gut genug (${qualiName(v.qMin)}qualität verlangt).` : `Du hast keine ${wareName(v)} im Rucksack.` };
  }
  const k = Math.min(rest, da, n === 'max' ? Infinity : Math.max(1, ganzZahl(n, 1)));
  const genommen = nimm(s.spieler.inv, v.ware, v.qMin, k, true);
  v.geliefert += genommen;
  const erg = { ok: true, geliefert: genommen, vertrag: v };
  if (v.geliefert >= v.menge) Object.assign(erg, abschliessen(s, v));
  return erg;
}

/** Holt, was die Firma als Bonus bereitgelegt hat und noch nicht in den Rucksack passte. */
export function paketAbholen(s) {
  const g = zustand(s);
  if (!g.paket.length) return { grund: 'Nichts zum Abholen.' };
  const geholt = [];
  let voll = false;
  for (const p of g.paket) {
    const rest = L.hinzufuegen(s, { id: p.id, n: p.n });
    if (p.n - rest > 0) geholt.push({ id: p.id, n: p.n - rest });
    p.n = rest;
    if (rest > 0) voll = true;
  }
  g.paket = g.paket.filter((p) => p.n > 0);
  return geholt.length ? { ok: true, geholt, voll } : { grund: 'Der Rucksack ist voll.' };
}

/**
 * Hook vorVerkauf: Die Ware der offenen Verträge kommt aus der Versandkiste, bevor der Rest normal verkauft wird.
 * Reihenfolge: siehe Kopf der Datei. Meldungen gehen in den Morgenbericht.
 */
export function versandAbzug(s, bericht) {
  for (const v of laufende(s)) {
    if (!v.auto) continue;
    const rest = v.menge - v.geliefert;
    if (rest <= 0) continue;
    const k = nimm(s.versand, v.ware, v.qMin, rest, false);
    if (k <= 0) continue;
    v.geliefert += k;
    const f = FIRMEN[v.firma];
    if (v.geliefert >= v.menge) {
      const erg = abschliessen(s, v);
      bericht.meldungen.push(`Vertrag erfüllt: ${f.name} hat ${k}× ${wareName(v)} aus der Versandkiste geholt und zahlt ${erg.auszahlung.toLocaleString('de-DE')} g aus`
        + `${erg.abzug ? ` (davon ${erg.abzug.toLocaleString('de-DE')} g für offene Rückforderung abgezogen)` : ''}. Vertrauen: ${erg.sterne} ${erg.sterne === 1 ? 'Stern' : 'Sterne'}.`);
      if (erg.bonus) bericht.meldungen.push(`${f.kurz} legt ${erg.bonus.n}× ${ITEMS[erg.bonus.id].name} dazu${erg.bonus.paket ? ' (liegt am Schwarzen Brett bereit, im Rucksack ist kein Platz)' : ''}.`);
    } else {
      bericht.meldungen.push(`${f.kurz}: ${k}× ${wareName(v)} aus der Versandkiste geliefert (${v.geliefert}/${v.menge}).`);
    }
  }
}

// ─── Tageswechsel ───────────────────────────────────────────────────────────

/** Hook tagEnde (nach dem Tageswechsel): Fristen prüfen, warnen, neue Angebote. */
export function tagWechsel(s, bericht) {
  const g = zustand(s);
  const tag = heute(s);
  for (const v of laufende(s)) {
    if (tag <= v.frist) continue;
    const f = FIRMEN[v.firma];
    const e = verfallen(s, v);
    const teile = [`Der Vertrag mit ${f.name} (${v.menge}× ${wareName(v)}) ist abgelaufen${v.geliefert ? `, ${v.geliefert} von ${v.menge} waren geliefert` : ''}.`];
    if (e.zurueck) teile.push(`Die Firma verrechnet den Vorschuss und holt ${e.zurueck.toLocaleString('de-DE')} g zurück.`);
    if (e.schuld) teile.push(`${e.schuld.toLocaleString('de-DE')} g bleiben offen und werden mit der nächsten Zahlung verrechnet.`);
    if (e.nachzahlung) teile.push(`Die gelieferte Ware zahlt sie zum normalen Preis (${e.nachzahlung.toLocaleString('de-DE')} g).`);
    if (e.strafe) teile.push(`Vertragsstrafe: ${e.strafe.toLocaleString('de-DE')} g.`);
    teile.push(e.sterne < e.sterneAlt ? `Vertrauen sinkt auf ${e.sterne} ${e.sterne === 1 ? 'Stern' : 'Sterne'}.` : 'Das Vertrauen ist ohnehin am Boden.');
    bericht.meldungen.push(teile.join(' '));
  }
  for (const v of laufende(s)) {
    const rest = v.frist - tag;
    if (rest > GROSS.warnTage) continue;
    const fehlt = v.menge - v.geliefert;
    bericht.meldungen.push(rest <= 0
      ? `Letzter Tag für den Vertrag mit ${FIRMEN[v.firma].kurz}: es fehlen noch ${fehlt}× ${wareName(v)}. Heute Nacht holt die Firma, was in der Versandkiste liegt; danach ist er abgelaufen.`
      : `Noch ${rest} Tag für den Vertrag mit ${FIRMEN[v.firma].kurz}: es fehlen noch ${fehlt}× ${wareName(v)}.`);
  }
  const neu = g.block >= 0 && blockVon(s) !== g.block;
  aktualisieren(s);
  if (neu && g.angebote.length) bericht.meldungen.push(`Am Schwarzen Brett hängen neue Großabnehmer-Verträge (${g.angebote.length}).`);
}

/** Hook morgen: Dankesbriefe in die Post legen (nach der Berechnung der Post des Kerns). */
export function briefeZustellen(s) {
  const g = zustand(s);
  for (const id of g.post) if (!s.post.includes(id) && !s.briefe.includes(id)) s.post.push(id);
  g.post = [];
}

/** Die letzten Dankesbriefe bleiben im Aufgaben-Reiter erreichbar, ältere nicht (sonst wird die Liste endlos lang). */
export function briefeSichtbar(ids) {
  const dank = ids.filter((id) => id.startsWith('grossdank-'));
  const weg = new Set(dank.slice(0, Math.max(0, dank.length - GROSS.briefeSichtbar)));
  return ids.filter((id) => !weg.has(id));
}

/** Zeilen für die Übersicht: je Firma Sterne, Vertrag, Angebot. */
export function firmenUebersicht(s) {
  const g = zustand(s);
  aktualisieren(s);
  return FIRMEN_IDS.map((id) => ({
    id, firma: FIRMEN[id], sterne: g.vertrauen[id], vertrag: g.laufend.find((v) => v.firma === id) ?? null, angebot: g.angebote.find((v) => v.firma === id) ?? null,
    schuld: g.schuld[id] || 0,
  }));
}
