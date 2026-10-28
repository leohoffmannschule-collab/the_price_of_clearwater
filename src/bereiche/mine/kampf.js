// Bereich „mine" – der Kampf zur Laufzeit: Monster bewegen, Treffer an der Spielerin (Unverwundbarkeit,
// Rückstoß, Verteidigung, Block), Waffentreffer an Monstern (Krit, Rückstoß, Panzer), Spezialzüge
// (Block, Stichhagel, Stampfer), Geschosse, Bomben und Explosionen, die Treppe, befallene Ebenen.
// Der Zustand liegt in `KAMPF` (nur Laufzeit, wird nicht gespeichert).

import { T, ITEMS, OBJEKT_TYPEN, WERKZEUG_ARTEN, werkzeugArt, itemBenutzen } from '../../daten.js';
import { bodenVon } from '../../karten.js';
import { mod } from '../../system.js';
import * as L from '../../logik.js';
import { MONSTER, monsterSchritt, geschossSchritt } from '../../mine.js';
import {
  S, ton, meldung, dialog, schwebeText, puff, partikel, staub, splitter, halme, ergebnisZeigen, schlafen, spielerFeld,
} from '../../spiel.js';
import { WAFFEN_ARTEN } from './gegenstaende.js';
import { MINE_TIEFE, steinZerbrechen, mineGlueck } from './ebenen.js';

/** Laufzeit des Kampfs: Geschosse, Bomben, Explosionen, Abklingzeiten der Spezialzüge, Stöße. */
export const KAMPF = { geschosse: [], bomben: [], explosionen: [], abk: { schwert: 0, dolch: 0, keule: 0 }, wellen: [] };

export function kampfZuruecksetzen() {
  KAMPF.geschosse = [];
  KAMPF.bomben = [];
  KAMPF.explosionen = [];
  KAMPF.wellen = [];
}

/** Waffe in der Hand (Item-Def mit `waffe`) oder null. */
export function waffeInHand(s = S.s) {
  const slot = s?.spieler.inv[s.spieler.wahl];
  const it = slot && ITEMS[slot.id];
  return it?.waffe ? it : null;
}

/** Ort mit Kampf: Minenebenen (dort gibt es Monster). */
export const kampfOrt = () => S.mineEbene > 0;

// ─── Begehbarkeit für Monster und Geschosse ─────────────────────────────────

function freiPruefer() {
  const def = S.ort.def;
  const w = S.ort.welt;
  return (px, py, fliegt) => {
    const tx = Math.floor(px / T);
    const ty = Math.floor((py - 4) / T);
    if (tx < 0 || ty < 0 || tx >= def.w || ty >= def.h) return false;
    const b = bodenVon(def, tx, ty);
    if (b.wand) return false;
    if (fliegt) return true;
    return L.begehbar(S.s, def, w, tx, ty);
  };
}

/** Ein freies Feld nahe der Spielerin (für Schattenwesen, die hinter ihr auftauchen). */
function platzNahe(weite) {
  const f = spielerFeld();
  const [bx, by] = L.RICHTUNG[S.sp.blick];
  const versuche = [[-bx * weite, -by * weite], [weite, 0], [-weite, 0], [0, weite], [0, -weite], [-bx, -by]];
  for (const [dx, dy] of versuche) {
    const x = f.x + dx;
    const y = f.y + dy;
    if (L.begehbar(S.s, S.ort.def, S.ort.welt, x, y)) return { x: x * T + 8, y: y * T + 10 };
  }
  return null;
}

// ─── Laufzeit-Schritt ───────────────────────────────────────────────────────

export function kampfUpdate(dt) {
  if (!S.ort) return;
  for (const k of Object.keys(KAMPF.abk)) if (KAMPF.abk[k] > 0) KAMPF.abk[k] = Math.max(0, KAMPF.abk[k] - dt);
  spezialUpdate(dt);
  if (KAMPF.bomben.length) bombenUpdate(dt);
  for (const e of KAMPF.explosionen) e.t += dt;
  KAMPF.explosionen = KAMPF.explosionen.filter((e) => e.t < 0.7);
  for (const w of KAMPF.wellen) w.t += dt;
  KAMPF.wellen = KAMPF.wellen.filter((w) => w.t < 0.5);
  if (!S.mineEbene) return;
  const frei = freiPruefer();
  const sp = S.sp;
  const extra = {
    r: Math.random, platzNahe, breite: S.ort.def.w * T, hoehe: S.ort.def.h * T,
    schiessen: (g) => { KAMPF.geschosse.push(g); ton(g.art === 'feuer' ? 'zischen' : 'schwung'); },
  };
  for (const m of [...S.monster]) {
    const trifft = monsterSchritt(m, dt, sp, frei, extra);
    if (m.sprungEin) { m.sprungEin = false; puff(m.x, m.y, '#3a2a5a'); }
    if (m.sprungAus) { m.sprungAus = false; puff(m.x, m.y, '#6a4a9a'); }
    if (trifft) spielerGetroffen(MONSTER[m.typ].schaden, m.x, m.y, m);
  }
  for (const g of [...KAMPF.geschosse]) {
    const e = geschossSchritt(g, dt, sp, frei);
    if (e === 'weg') { entfernen(KAMPF.geschosse, g); partikel(g.x, g.y, 4, { f: g.art === 'feuer' ? ['#f8904a', '#f8d070'] : ['#ece4d0'], v: 40, dauer: 0.3 }); }
    else if (e === 'treffer') { entfernen(KAMPF.geschosse, g); spielerGetroffen(g.schaden, g.x, g.y, null, g); }
  }
}

const entfernen = (liste, x) => { const i = liste.indexOf(x); if (i >= 0) liste.splice(i, 1); };

// ─── Die Spielerin wird getroffen ───────────────────────────────────────────

/** Gibt true zurück, wenn Schaden genommen wurde. */
export function spielerGetroffen(schaden, x, y, m = null, geschoss = null) {
  const sp = S.sp;
  const s = S.s;
  if (sp.unverwundbar > 0 || S.pause || s.spieler.hp <= 0) return false;
  if (sp.aktion?.spezial === 'block') {
    ton('block');
    schwebeText('Pariert!', sp.x, sp.y - 28, '#bfe8ff');
    partikel(sp.x + L.RICHTUNG[sp.blick][0] * 8, sp.y - 10, 8, { f: ['#ffffff', '#bfe8ff'], v: 70, dauer: 0.35 });
    if (m) { m.betaeubt = 1.2; stossen(m, sp.x, sp.y, 220); }
    sp.unverwundbar = 0.25;
    return false;
  }
  const abwehr = mod('verteidigung', 0, { s, monster: m, geschoss });
  const wirklich = Math.max(1, Math.round(schaden - abwehr));
  s.spieler.hp = Math.max(0, s.spieler.hp - wirklich);
  sp.unverwundbar = 1.1;
  ton('au');
  schwebeText(`-${wirklich}`, sp.x, sp.y - 26, '#ff7a6a');
  const dx = sp.x - x;
  const dy = sp.y - y;
  const l = Math.hypot(dx, dy) || 1;
  sp.stoss = { vx: (dx / l) * 150, vy: (dy / l) * 150, t: 0.15 };
  if (s.spieler.hp <= 0) ohnmacht();
  return true;
}

function ohnmacht() {
  S.pause = true;
  kampfZuruecksetzen();
  dialog(null, ['Alles wird schwarz…', 'Jemand hat dich aus der Mine nach Hause getragen. Unterwegs ist ein Teil deines Geldes verloren gegangen.'], null, () => schlafen(true));
}

// ─── Treffer an Monstern ────────────────────────────────────────────────────

/** Rückstoß weg von (vx, vy). */
function stossen(m, vonX, vonY, staerke) {
  const d = MONSTER[m.typ];
  const l = Math.hypot(m.x - vonX, m.y - vonY) || 1;
  const v = staerke * (1 - (d.schwer || 0));
  m.vx = ((m.x - vonX) / l) * v;
  m.vy = ((m.y - vonY) / l) * v;
  m.stoss = 0.22;
}

/**
 * Schaden an einem Monster. opt: { waffe (Item-ID), krit (Chance), kritFaktor, rueckstoss, vonX, vonY, faktor, spitzhacke }
 * Gibt den Schaden zurück (0 = abgeprallt/unverwundbar).
 */
export function monsterTreffen(m, grund, opt = {}) {
  const s = S.s;
  const d = MONSTER[m.typ];
  if (m.unverw > 0 || m.hp <= 0) return 0;
  if (m.phase === 'weg') return 0;
  if (opt.spitzhacke && d.getarnt && m.panzer > 0) {
    m.panzer = 0;
    m.geweckt = true;
    m.schaleAb = true;
    ton('stein');
    splitter(Math.floor(m.x / T), Math.floor(m.y / T), d.farbe);
    schwebeText('Schale ab!', m.x, m.y - 18, '#fff3b0');
  }
  if (d.getarnt) m.geweckt = true;
  const krit = Math.random() < (opt.krit ?? 0);
  let wert = mod('schaden', grund, { s, monster: m, waffe: opt.waffe });
  if (krit) wert *= opt.kritFaktor ?? 1.5;
  wert *= opt.faktor ?? 1;
  const schaden = Math.max(1, Math.round(wert - (m.panzer || 0)));
  m.hp -= schaden;
  m.blitz = 0.15;
  m.unverw = opt.unverw ?? 0.12;
  stossen(m, opt.vonX ?? S.sp.x, opt.vonY ?? S.sp.y, 165 * (opt.rueckstoss ?? 1));
  schwebeText(krit ? `${schaden}!` : String(schaden), m.x, m.y - 16, krit ? '#ffd23a' : '#fff3b0');
  if (krit) { ton('krit'); partikel(m.x, m.y - 8, 10, { f: ['#ffd23a', '#ffffff', '#ff9a3a'], v: 110, hoch: 0.9, dauer: 0.4 }); }
  else ton(d.art === 'metallkopf' ? 'abprall' : 'treffer');
  if (m.hp <= 0) monsterBesiegt(m);
  return schaden;
}

/** Trifft alle Monster in einem Rechteck vor der Spielerin; Kasten = { vor, quer, laengs }. */
function monsterImKasten(kasten, fn) {
  const sp = S.sp;
  const [dx, dy] = L.RICHTUNG[sp.blick];
  const cx = sp.x + dx * kasten.vor;
  const cy = sp.y - 6 + dy * kasten.vor;
  const hx = dx ? kasten.laengs : kasten.quer;
  const hy = dx ? kasten.quer : kasten.laengs;
  let n = 0;
  for (const m of [...S.monster]) {
    const my = m.y - 5 - (MONSTER[m.typ].fliegt ? 6 : 0);
    if (Math.abs(m.x - cx) < hx + 5 && Math.abs(my - cy) < hy + 5) { fn(m); n++; }
  }
  return n;
}

export const KAESTEN = {
  schwert: { vor: 14, quer: 20, laengs: 13 },
  dolch: { vor: 17, quer: 9, laengs: 13 },
  keule: { vor: 13, quer: 22, laengs: 15 },
  sense: { vor: 14, quer: 20, laengs: 12 },
  spitzhacke: { vor: 14, quer: 9, laengs: 10 },
};

/** Grundschaden einer Waffe: Würfel plus etwas Kampfstufe. */
function grundSchaden([von, bis], s) {
  return von + Math.floor(Math.random() * (bis - von + 1)) + Math.floor(L.stufeWirksam(s, 'kampf') / 2);
}

/** Schwung einer Waffe (oder Sense) gegen Monster. Gibt die Zahl der Treffer zurück. */
export function waffeSchwingt(id, faktor = 1) {
  const s = S.s;
  const it = ITEMS[id];
  const w = it?.waffe;
  if (!w) return 0;
  const krit = w.krit + mod('mine_krit', 0, { s, waffe: id }) + Math.max(0, mineGlueck(s)) * 0.01;
  return monsterImKasten(KAESTEN[w.art], (m) => monsterTreffen(m, grundSchaden(w.schaden, s), {
    waffe: id, krit, kritFaktor: w.kritFaktor, rueckstoss: w.rueckstoss, faktor,
  }));
}

// ─── Monster besiegt ────────────────────────────────────────────────────────

export function monsterBesiegt(m) {
  const s = S.s;
  S.monster = S.monster.filter((x) => x !== m);
  const d = MONSTER[m.typ];
  const erg = L.neuesErgebnis();
  const tx = Math.floor(m.x / T);
  const ty = Math.floor((m.y - 3) / T);
  const glueck = 1 + Math.max(0, mineGlueck(s)) * 0.15;
  for (const [id, chance, a, b] of d.beute) {
    if (ITEMS[id] && Math.random() < chance * glueck) L.geben(s, S.ort, tx, ty, { id, n: a + Math.floor(Math.random() * (b - a + 1)) }, erg);
  }
  L.xpGeben(s, 'kampf', d.xp, erg);
  s.mine.besiegt[m.typ] = (s.mine.besiegt[m.typ] || 0) + 1;
  s.mine.monster = (s.mine.monster || 0) + 1;
  const heilen = mod('mine_heilen', 0, { s, monster: m });
  if (heilen > 0 && s.spieler.hp < s.spieler.maxHp) {
    s.spieler.hp = Math.min(s.spieler.maxHp, s.spieler.hp + heilen);
    schwebeText(`+${heilen}`, S.sp.x, S.sp.y - 26, '#8ef08a');
  }
  puff(m.x, m.y, d.farbe);
  ton('besiegt');
  ergebnisZeigen(erg);
  if (S.ort.def.befallen && !S.monster.length) befallenGeschafft();
}

function befallenGeschafft() {
  const ort = S.ort;
  let f = ort.def.leiterFeld;
  if (!f || ort.welt.objekte[L.k(f.x, f.y)]) f = spielerFeld();
  if (ort.def.ebene < MINE_TIEFE) {
    ort.welt.objekte[L.k(f.x, f.y)] = { t: 'leiter' };
    staub(f.x, f.y, '#c8a070');
  }
  ton('fanfare');
  meldung('Die Ebene ist frei! Eine Leiter ist aufgetaucht.', 'gut');
}

// ─── Spezialzüge ────────────────────────────────────────────────────────────

/** Name des Spezialzugs der Waffe in der Hand und ob er bereit ist. */
export function spezialInfo(s = S.s) {
  const it = waffeInHand(s);
  if (!it) return null;
  const a = WAFFEN_ARTEN[it.waffe.art];
  return { art: it.waffe.art, name: a.spezial, abk: KAMPF.abk[it.waffe.art], max: a.abkuehlung, bereit: KAMPF.abk[it.waffe.art] <= 0 };
}

export function spezialStarten() {
  const s = S.s;
  const it = waffeInHand(s);
  if (!it || S.sp.aktion || S.sp.laden) return false;
  const art = it.waffe.art;
  if (KAMPF.abk[art] > 0) { ton('dumpf'); return false; }
  const dauer = { schwert: 0.9, dolch: 0.6, keule: 0.75 }[art];
  const spezial = { schwert: 'block', dolch: 'hagel', keule: 'stampfer' }[art];
  S.sp.aktion = { art: 'werkzeug', id: it.id, werkzeugArt: it.werkzeug, t: 0, dauer, ladung: 0, felder: [], getan: true, kosten: 0, spezial, stiche: 0, gestampft: false };
  KAMPF.abk[art] = WAFFEN_ARTEN[art].abkuehlung + dauer;
  ton(spezial === 'block' ? 'block' : 'schwung');
  return true;
}

function spezialUpdate() {
  const a = S.sp.aktion;
  if (!a?.spezial) return;
  if (a.spezial === 'hagel') {
    const faellig = Math.min(4, Math.floor((a.t - 0.04) / 0.13) + 1);
    while (a.stiche < faellig) {
      a.stiche++;
      ton('schwung');
      waffeSchwingt(a.id, 0.8);
    }
  } else if (a.spezial === 'stampfer' && !a.gestampft && a.t >= 0.5) {
    a.gestampft = true;
    stampfen(a.id);
  }
}

function stampfen(id) {
  const s = S.s;
  const sp = S.sp;
  const w = ITEMS[id].waffe;
  const radius = 2.6 * T;
  ton('stampfer');
  KAMPF.wellen.push({ x: sp.x, y: sp.y - 2, r: radius, t: 0 });
  partikel(sp.x, sp.y - 2, 18, { f: ['#c8a070', '#8a6a4a', '#e8d0a0'], v: 140, hoch: 0.6, streu: 14, dauer: 0.5 });
  for (const m of [...S.monster]) {
    if (Math.hypot(m.x - sp.x, m.y - sp.y) > radius) continue;
    monsterTreffen(m, grundSchaden(w.schaden, s), { waffe: id, krit: 0, faktor: 1.4, rueckstoss: 2.2, vonX: sp.x, vonY: sp.y });
    if (m.hp > 0) m.betaeubt = 0.8;
  }
}

// ─── Waffen als Werkzeugarten ───────────────────────────────────────────────

/** Schwungdauer einer Waffe (Tempo der Waffe, Ringe über `mine_waffenTempo`). */
export function schwungDauer(id, s = S.s) {
  const w = ITEMS[id].waffe;
  const grund = WAFFEN_ARTEN[w.art].dauer * (1 - 0.08 * (w.tempo || 0));
  return grund / (1 + Math.max(0, mod('mine_waffenTempo', 0, { s, waffe: id })));
}

function waffeBenutzen(c) {
  const sp = S.sp;
  if (sp.aktion || sp.laden) return;
  const it = ITEMS[c.slot.id];
  const art = it.waffe.art;
  const felder = art === 'dolch' ? [[S.ziel.x, S.ziel.y]] : L.senseFelder(S.ziel.x, S.ziel.y, sp.blick);
  sp.aktion = { art: 'werkzeug', id: it.id, werkzeugArt: it.werkzeug, t: 0, dauer: schwungDauer(it.id), ladung: 0, felder, getan: false, kosten: 0 };
  ton('schwung');
}

function waffeWirkung({ s, ort, id, felder }) {
  // Gras, Unkraut und Kisten auf den getroffenen Feldern (wie die Sense), dann Monster
  const erg = L.senseSchnitt(s, ort, felder, Math.random, 'waffe');
  if (erg.n) for (const [x, y] of felder) halme(x, y);
  waffeSchwingt(id);
  return erg;
}

for (const [art, a] of Object.entries(WAFFEN_ARTEN)) {
  werkzeugArt(a.werkzeug, {
    wiederholbar: true, dauer: a.dauer, schwungTon: 'schwung', felder: art === 'dolch' ? (zx, zy) => [[zx, zy]] : L.senseFelder,
    benutzen: waffeBenutzen, wirkung: waffeWirkung,
  });
}

/** Andere Werkzeuge in der Mine: die Sense kratzt Monster an, die Spitzhacke knackt Krabbenschalen. */
export function werkzeugGegenMonster(ctx) {
  if (!S.mineEbene || ITEMS[ctx.id]?.waffe) return;
  if (ctx.art === 'sense') {
    const sch = WERKZEUG_ARTEN.sense?.schaden || [1, 2];
    monsterImKasten(KAESTEN.sense, (m) => monsterTreffen(m, grundSchaden(sch, S.s), { rueckstoss: 0.6 }));
  } else if (ctx.art === 'spitzhacke') {
    monsterImKasten(KAESTEN.spitzhacke, (m) => monsterTreffen(m, 1 + (S.s.spieler.werkzeug.spitzhacke || 0), { rueckstoss: 0.5, spitzhacke: true }));
  }
}

// ─── Bomben ─────────────────────────────────────────────────────────────────

/** Was Bomben zerstören (Objekttypen); Gestein auf Minenebenen und draußen. */
export const BOMBE_ZIELE = new Set(['mstein', 'stein', 'fels', 'ast', 'unkraut', 'mine_kiste']);

/** Darf hier eine Bombe liegen? Text = Grund, true = ja. */
export function bombePlatz(s, ort, x, y) {
  const def = ort.def;
  if (!def.aussen && def.innen !== 'mine') return 'Hier drinnen lieber nicht.';
  const b = bodenVon(def, x, y);
  if (!b.begehbar) return 'Da kann keine Bombe liegen.';
  const o = L.objektAn(s, ort, x, y);
  if (o && OBJEKT_TYPEN[o.t]?.blockiert) return 'Da liegt schon etwas.';
  if (KAMPF.bomben.some((bo) => bo.x === x && bo.y === y)) return 'Da tickt schon eine.';
  return true;
}

export function bombeLegen(s, ort, x, y, idx) {
  const slot = s.spieler.inv[idx];
  const it = slot && ITEMS[slot.id];
  if (!it?.bombe) return 'Das ist keine Bombe.';
  const ok = bombePlatz(s, ort, x, y);
  if (ok !== true) return ok;
  L.entfernenAusSlot(s, idx, 1);
  KAMPF.bomben.push({ id: it.id, x, y, t: 0, zuender: 1.8, radius: it.bombe.radius, schaden: it.bombe.schaden });
  ton('zischen');
  return true;
}

function bombenUpdate(dt) {
  for (const b of [...KAMPF.bomben]) {
    b.t += dt;
    if (b.t >= b.zuender) { entfernen(KAMPF.bomben, b); explodieren(b); }
  }
}

/** Lässt eine Bombe hochgehen (auch ohne Laufzeit-Spielerin nutzbar für Tests: s, ort, r). */
export function explosion(s, ort, b, r = Math.random) {
  const erg = L.neuesErgebnis();
  const rr = b.radius;
  let zerstoert = 0;
  for (let y = Math.floor(b.y - rr); y <= Math.ceil(b.y + rr); y++) {
    for (let x = Math.floor(b.x - rr); x <= Math.ceil(b.x + rr); x++) {
      if ((x - b.x) ** 2 + (y - b.y) ** 2 > rr * rr) continue;
      const kk = L.k(x, y);
      const o = ort.welt.objekte[kk];
      if (!o || !BOMBE_ZIELE.has(o.t)) continue;
      if (o.t === 'mstein') { steinZerbrechen(s, ort, x, y, o, r, erg); zerstoert++; continue; }
      const typ = OBJEKT_TYPEN[o.t];
      const c = { s, ort, x, y, kk, o, erg, r, art: 'spitzhacke', stufe: 4, kraft: 99 };
      for (let i = 0; i < 3 && ort.welt.objekte[kk] === o; i++) (typ.spitzhacke || typ.axt || typ.waffe)?.(c);
      if (ort.welt.objekte[kk] !== o) zerstoert++;
    }
  }
  erg.zerstoert = zerstoert;
  return erg;
}

function explodieren(b) {
  const s = S.s;
  const ort = S.ort;
  const px = b.x * T + 8;
  const py = b.y * T + 10;
  ton('explosion');
  S.blitz = Math.max(S.blitz, b.radius > 4 ? 0.5 : 0.3);
  KAMPF.explosionen.push({ x: px, y: py, r: b.radius * T, t: 0 });
  partikel(px, py - 4, 26, { f: ['#f8d070', '#f8904a', '#e8503a', '#5a4a4a'], v: 60 + b.radius * 30, hoch: 0.9, streu: 10, dauer: 0.6 });
  partikel(px, py - 6, 14, { f: ['#6a6060', '#8a8080', '#4a4040'], v: 40, hoch: 0.6, streu: 16, g: -20, dauer: 1, s: 2 });
  const erg = explosion(s, ort, b);
  // Monster und die Spielerin selbst
  for (const m of [...S.monster]) {
    const d = Math.hypot(m.x - px, m.y - py);
    if (d > b.radius * T) continue;
    m.unverw = 0;
    monsterTreffen(m, b.schaden * (1 - (d / (b.radius * T)) * 0.5), { rueckstoss: 2, vonX: px, vonY: py, krit: 0 });
  }
  const sp = S.sp;
  const d = Math.hypot(sp.x - px, sp.y - py);
  if (d < b.radius * T * 0.8 && sp.unverwundbar <= 0) {
    const schaden = Math.max(1, Math.round(b.schaden * 0.3 * (1 - d / (b.radius * T))));
    s.spieler.hp = Math.max(1, s.spieler.hp - schaden);
    sp.unverwundbar = 1;
    ton('au');
    schwebeText(`-${schaden}`, sp.x, sp.y - 26, '#ff7a6a');
    const l = d || 1;
    sp.stoss = { vx: ((sp.x - px) / l) * 180, vy: ((sp.y - py) / l) * 180, t: 0.18 };
  }
  ergebnisZeigen(erg);
}

itemBenutzen((c) => !!c.it?.bombe, (c) => {
  const ziel = bombePlatz(c.s, c.ort, c.x, c.y) === true ? { x: c.x, y: c.y } : c.f;
  const ok = bombeLegen(c.s, c.ort, ziel.x, ziel.y, c.idx);
  if (ok !== true) meldung(ok);
});

// ─── Treppe ─────────────────────────────────────────────────────────────────

/** Treppe benutzen: legt auf Minenebenen sofort eine Leiter aufs Zielfeld (oder unter die Füße). */
export function treppeSetzen(s, ort, x, y, idx) {
  const n = ort.def.ebene;
  if (!n) return 'Die Treppe funktioniert nur in der Mine.';
  if (n >= MINE_TIEFE) return 'Tiefer geht es nicht. Wirklich nicht.';
  const frei = (fx, fy) => bodenVon(ort.def, fx, fy).begehbar && !ort.welt.objekte[L.k(fx, fy)];
  if (!frei(x, y)) return 'Dafür braucht es ein freies Feld.';
  L.entfernenAusSlot(s, idx, 1);
  ort.welt.objekte[L.k(x, y)] = { t: 'leiter' };
  return true;
}

itemBenutzen((c) => c.it?.id === 'treppe', (c) => {
  const ok = treppeSetzen(c.s, c.ort, c.x, c.y, c.idx);
  if (ok === true) { ton('leiter'); staub(c.x, c.y, '#c8a070'); } else meldung(ok);
});

export { splitter };
