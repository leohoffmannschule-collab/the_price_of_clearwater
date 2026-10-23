// Bereich „berg" – Spielstand und Mechanik: die Brücke zum Steinbruch (Flagge `steinbruch`), das
// Auffüllen des Steinbruchs und der Bergwiesen, und eine Sicherung gegen Leitern am Berg.
//
// Zustand: s.berg = { gefuellt, letzter } – `gefuellt`: Wiesen und Steinbruch haben ihre Anfangs-
// objekte; `letzter`: Tagesnummer des letzten Nachwuchses im Steinbruch.

import { system } from '../../system.js';
import { bedingung } from '../../daten.js';
import { bereichVon } from '../../karten.js';
import * as L from '../../logik.js';
import { zufall, ganz } from '../../zufall.js';
import { S, dekoAktion, dialog, frage, ton, meldung, staub } from '../../spiel.js';

bedingung('berg_steinbruch', (s) => !!s.flags.steinbruch);

/** Was die Brücke zum Steinbruch kostet. */
export const BRUECKE_KOSTEN = { holz: 60, stein: 30 };
/** So viel liegt im Steinbruch, wenn er voll ist (Steine, Felsbrocken, Erzbrocken je Art). */
export const STEINBRUCH_ZIEL = { stein: 55, fels: 9, kupfer: 14, eisen: 8, gold: 4 };
/** Alle so viele Tage wächst der Steinbruch nach, höchstens so viele Stücke auf einmal. */
export const NACHWUCHS_TAGE = 3;
export const NACHWUCHS_MAX = 24;
const ERZ_HP = { kupfer: 2, eisen: 3, gold: 4 };

// ─── Brücke ─────────────────────────────────────────────────────────────────

const kostenText = () => Object.entries(BRUECKE_KOSTEN).map(([id, n]) => `${n} ${id === 'holz' ? 'Holz' : 'Stein'}`).join(' und ');

export function brueckeReparieren(s) {
  if (s.flags.steinbruch) return { ok: false, grund: 'fertig' };
  for (const [id, n] of Object.entries(BRUECKE_KOSTEN)) if (L.anzahl(s, id) < n) return { ok: false, grund: 'material' };
  for (const [id, n] of Object.entries(BRUECKE_KOSTEN)) L.entfernen(s, id, n);
  s.flags.steinbruch = true;
  L.kartenGeaendert();
  steinbruchFuellen(s, zufall(Math.floor(Math.random() * 2 ** 31)), { voll: true });
  return { ok: true };
}

dekoAktion('berg_bruecke', () => {
  const s = S.s;
  if (s.flags.steinbruch) { dialog(null, ['Die Brücke steht wieder. Sie knarzt stolz.']); return; }
  const hat = Object.entries(BRUECKE_KOSTEN).every(([id, n]) => L.anzahl(s, id) >= n);
  if (!hat) {
    dialog(null, [
      'Die Brücke über den Fluss ist morsch und mittendrin einfach weg. Drüben liegt der alte Steinbruch.',
      `Zum Reparieren brauchst du ${kostenText()}.`,
    ]);
    return;
  }
  frage(`Die Brücke reparieren? Das kostet ${kostenText()}.`, [
    ['Reparieren', () => {
      const r = brueckeReparieren(s);
      if (!r.ok) { meldung('Dir fehlt noch Material.'); return; }
      ton('truhe');
      staub(63, 21, '#a8784a');
      dialog(null, ['Hämmern, sägen, noch ein Nagel – und die Brücke hält! Drüben im Steinbruch liegen Steine und Erz in Hülle und Fülle.']);
    }],
    ['Noch nicht', null],
  ]);
}, (d, s) => (s?.flags.steinbruch ? 'Brücke' : 'Kaputte Brücke ausbessern'));

// ─── Objekte am Berg ────────────────────────────────────────────────────────

function mischen(r, liste) {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste;
}

function neuesStueck(r, art) {
  if (art === 'stein') return { t: 'stein', hp: 2, v: ganz(r, 0, 2) };
  if (art === 'fels') return { t: 'fels', hp: 6 };
  return { t: 'mstein', art, hp: ERZ_HP[art], v: ganz(r, 0, 3) };
}

/** Was gerade im Steinbruch liegt, je Art. */
export function steinbruchBestand(s) {
  const { welt } = L.ortVon(s, 'berg');
  const b = bereichVon('berg', 'steinbruch');
  const n = { stein: 0, fels: 0, kupfer: 0, eisen: 0, gold: 0 };
  for (const [kk, o] of Object.entries(welt.objekte)) {
    const [x, y] = L.ausK(kk);
    if (!L.imBereich(b, x, y)) continue;
    if (o.t === 'stein') n.stein++;
    else if (o.t === 'fels') n.fels++;
    else if (o.t === 'mstein' && n[o.art] != null) n[o.art]++;
  }
  return n;
}

/**
 * Legt Steine und Erzbrocken auf freie Schotterfelder des Steinbruchs, bis der Zielbestand erreicht
 * ist (`voll`) oder höchstens NACHWUCHS_MAX Stück. Die Wege (Erdweg) bleiben frei.
 */
export function steinbruchFuellen(s, r, { voll = false } = {}) {
  const ort = L.ortVon(s, 'berg');
  const b = bereichVon('berg', 'steinbruch');
  const bestand = steinbruchBestand(s);
  const frei = [];
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) if (ort.def.grid[y][x] === 'u' && L.feldFrei(s, ort, x, y)) frei.push([x, y]);
  }
  mischen(r, frei);
  let rest = voll ? Infinity : NACHWUCHS_MAX;
  let gelegt = 0;
  // Erz zuerst, damit es bei knappem Platz nicht fehlt
  for (const art of ['gold', 'eisen', 'kupfer', 'fels', 'stein']) {
    let fehlt = STEINBRUCH_ZIEL[art] - bestand[art];
    while (fehlt > 0 && rest > 0 && frei.length) {
      const [x, y] = frei.pop();
      ort.welt.objekte[L.k(x, y)] = neuesStueck(r, art);
      fehlt--;
      rest--;
      gelegt++;
    }
  }
  if (gelegt) L.kartenGeaendert();
  return gelegt;
}

/** Anfangsbestand der Wiesen: Steine, Unkraut, Äste, einzelne Kiefern und Felsbrocken am Wandfuß. */
export function wiesenFuellen(s, r) {
  const ort = L.ortVon(s, 'berg');
  const { def, welt: w } = ort;
  const nahe = new Set();
  for (const p of Object.values(def.punkte)) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) nahe.add(`${p[0] + dx},${p[1] + dy}`);
  for (const wp of def.warps) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) nahe.add(`${wp.x + dx},${wp.y + dy}`);
  for (let y = 2; y < def.h - 2; y++) {
    for (let x = 2; x < def.w - 2; x++) {
      const z = def.grid[y][x];
      if (z !== '.' && z !== 'r') continue;
      if (nahe.has(`${x},${y}`) || w.objekte[L.k(x, y)] || !L.begehbar(s, def, w, x, y)) continue;
      let weg = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (':=hwT'.includes(def.grid[y + dy]?.[x + dx] ?? '#')) weg = true;
      if (weg) continue;
      const q = r();
      let o = null;
      if (z === 'r') {
        if (q < 0.05) o = { t: 'fels', hp: 6 };
        else if (q < 0.12) o = { t: 'stein', hp: 2, v: ganz(r, 0, 2) };
        else if (q < 0.16) o = { t: 'ast', v: ganz(r, 0, 1) };
      } else if (q < 0.03) o = { t: 'stein', hp: 2, v: ganz(r, 0, 2) };
      else if (q < 0.075) o = { t: 'unkraut', v: ganz(r, 0, 2) };
      else if (q < 0.105) o = { t: 'ast', v: ganz(r, 0, 1) };
      else if (q < 0.125) o = { t: 'baum', hp: 8, art: 'kiefer' };
      else if (q < 0.133) o = { t: 'fels', hp: 6 };
      if (o) w.objekte[L.k(x, y)] = o;
    }
  }
}

// ─── Sicherung: keine Leitern am Berg ───────────────────────────────────────

/**
 * Erzbrocken (aus „mine") lassen manchmal eine Leiter nach unten zurück. Am Berg führt keine hinab:
 * nach jedem Schwung auf dieser Karte verschwindet sie wieder, ohne Meldung.
 */
function leiterEntfernen(c) {
  if (c.ort?.def?.id !== 'berg') return;
  for (const [x, y] of c.felder || []) {
    const kk = L.k(x, y);
    if (c.ort.welt.objekte[kk]?.t === 'leiter') delete c.ort.welt.objekte[kk];
  }
  if (c.erg) c.erg.leiter = false;
}

// ─── System ─────────────────────────────────────────────────────────────────

system({
  name: 'berg',
  ergaenzen(s) {
    s.berg ??= { gefuellt: false, letzter: 0 };
    s.berg.gefuellt ??= false;
    s.berg.letzter ??= 0;
  },
  neuesSpiel(s, r) {
    wiesenFuellen(s, r);
    steinbruchFuellen(s, r, { voll: true });
    s.berg.gefuellt = true;
    s.berg.letzter = L.tagNr(s.zeit);
  },
  tagEnde(s, bericht, r) {
    if (!s.berg.gefuellt) {
      // älterer Spielstand ohne Berg-Objekte
      wiesenFuellen(s, r);
      steinbruchFuellen(s, r, { voll: true });
      s.berg.gefuellt = true;
      s.berg.letzter = L.tagNr(s.zeit);
      return;
    }
    if (!s.flags.steinbruch) return;
    if (L.tagNr(s.zeit) - s.berg.letzter < NACHWUCHS_TAGE) return;
    s.berg.letzter = L.tagNr(s.zeit);
    steinbruchFuellen(s, r);
  },
  schwung: leiterEntfernen,
});
