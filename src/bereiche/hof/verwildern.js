// Bereich „hof": Verwildern zu Spielbeginn und Nachwachsen über Nacht auf der großen Hofkarte.
// Der Bewuchs liegt in Gruppen: Wäldchen aus Bäumen, Stümpfen und Ästen, Geröllfelder, verkrautete
// Wiesen. Wege, der Platz ums Haus, der Startacker und das Bauland bleiben frei (`def.frei`).

import { OBJEKT_TYPEN, BAUM_ARTEN } from '../../daten.js';
import { boden } from '../../karten.js';
import * as L from '../../logik.js';
import { ganz } from '../../zufall.js';

const WEG_ZEICHEN = ':ab h~T=dc';
const glatt = (t) => t * t * (3 - 2 * t);
const zwischen = (v, von, bis) => glatt(Math.max(0, Math.min(1, (v - von) / (bis - von))));

/** Weiches Rauschen 0..1 über die Karte (Wertrauschen auf einem groben Gitter). */
function rauschfeld(r, b, h, zelle) {
  const gb = Math.ceil(b / zelle) + 2;
  const gh = Math.ceil(h / zelle) + 2;
  const gitter = Array.from({ length: gh }, () => Array.from({ length: gb }, () => r()));
  return (x, y) => {
    const fx = x / zelle;
    const fy = y / zelle;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = glatt(fx - x0);
    const ty = glatt(fy - y0);
    const o = gitter[y0][x0] * (1 - tx) + gitter[y0][x0 + 1] * tx;
    const u = gitter[y0 + 1][x0] * (1 - tx) + gitter[y0 + 1][x0 + 1] * tx;
    return o * (1 - ty) + u * ty;
  };
}

export const imFrei = (def, x, y) => def.frei.some((b) => L.imBereich(b, x, y));

/** Liegt in der Nähe (8er-Nachbarschaft) ein Weg, Ufer, Wasser oder eine Treppe? */
function nahWeg(def, x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (WEG_ZEICHEN.includes(boden(def, x + dx, y + dy))) return true;
  return false;
}
/** Abstand zum nächsten Waldrand oder Felsen (bis 4 Felder, sonst 5). */
function randAbstand(def, x, y) {
  for (let d = 1; d <= 4; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        const z = boden(def, x + dx, y + dy);
        if (z === '#' || z === 'X') return d;
      }
    }
  }
  return 5;
}

/** Der Hof ist zu Beginn zugewachsen: Wäldchen, Geröll, Unkraut, Äste. */
export function verwildern(s, r) {
  const { def, welt: w } = L.ortVon(s, 'hof');
  const wald = rauschfeld(r, def.w, def.h, 9);
  const fels = rauschfeld(r, def.w, def.h, 7);
  const kraut = rauschfeld(r, def.w, def.h, 6);
  const arten = ['eiche', 'eiche', 'kiefer'];
  if (BAUM_ARTEN.ahorn) arten.push('ahorn', 'ahorn');
  const gras = OBJEKT_TYPEN.hohesgras ? 'hohesgras' : null;
  for (let y = 2; y < def.h - 2; y++) {
    for (let x = 2; x < def.w - 2; x++) {
      if (boden(def, x, y) !== '.' || imFrei(def, x, y) || nahWeg(def, x, y)) continue;
      const kk = L.k(x, y);
      if (w.objekte[kk] || !L.begehbar(s, def, w, x, y)) continue;
      const fw = wald(x, y);
      const ff = fels(x, y);
      const fk = kraut(x, y);
      const rand = randAbstand(def, x, y);
      const z = r();
      let t = 0;
      const wahl = (p) => { t += p; return z < t; };
      let o = null;
      if (wahl(0.5 * zwischen(fw, 0.55, 0.8) + (rand <= 2 ? 0.16 : rand <= 4 ? 0.07 : 0) + 0.008)) {
        o = { t: 'baum', hp: 8, art: arten[ganz(r, 0, arten.length - 1)] };
      } else if (wahl(0.004 + 0.06 * zwischen(ff, 0.78, 0.95))) o = { t: 'fels', hp: 6 };
      else if (wahl(0.012 + 0.2 * zwischen(ff, 0.6, 0.85))) o = { t: 'stein', hp: 2, v: ganz(r, 0, 2) };
      else if (wahl(0.003 + (fw > 0.5 ? 0.02 : 0))) o = { t: 'grossstumpf', hp: 8 };
      else if (wahl(0.018 + (fw > 0.5 ? 0.05 : 0))) o = { t: 'ast', v: ganz(r, 0, 1) };
      else if (gras && wahl(0.09 * zwischen(fk, 0.45, 0.7))) o = { t: gras };
      else if (wahl(0.035 + 0.3 * zwischen(fk, 0.45, 0.8))) o = { t: 'unkraut', v: ganz(r, 0, 2) };
      if (o) w.objekte[kk] = o;
    }
  }
}

/** Über Nacht kommen ein paar Hindernisse nach (auf freiem Gras, nie auf Wegen und freien Plätzen). */
export function nachwachsen(s, r) {
  const ort = L.ortVon(s, 'hof');
  const { def } = ort;
  const winter = L.jahreszeit(s) === 'winter';
  const ziel = ganz(r, 4, 9);
  let gesetzt = 0;
  for (let i = 0; i < 400 && gesetzt < ziel; i++) {
    const x = ganz(r, 2, def.w - 3);
    const y = ganz(r, 2, def.h - 3);
    if (boden(def, x, y) !== '.' || imFrei(def, x, y) || !L.feldFrei(s, ort, x, y)) continue;
    const kk = L.k(x, y);
    const z = r();
    if (winter) ort.welt.objekte[kk] = z < 0.5 ? { t: 'stein', hp: 2, v: ganz(r, 0, 2) } : { t: 'ast', v: ganz(r, 0, 1) };
    else ort.welt.objekte[kk] = z < 0.6 ? { t: 'unkraut', v: ganz(r, 0, 2) } : z < 0.85 ? { t: 'stein', hp: 2, v: ganz(r, 0, 2) } : { t: 'ast', v: ganz(r, 0, 1) };
    gesetzt++;
  }
}
