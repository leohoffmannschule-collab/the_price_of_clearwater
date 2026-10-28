// Bereich „pflanzen": hohes Gras { t: 'hohesgras', v } – begehbar, die Sense (auch Waffe und
// Hacke) schneidet es und ruft dabei `alle('grasGemaeht', { s, ort, x, y, erg, r })` (tiere macht
// daraus Heu). Über Nacht breitet es sich auf freiem Wiesenboden aus (nicht im Winter), auf
// Wiesen-Sammelzonen sprießen neue Büschel. Grassamen gibt es auf der Ranch.

import { item, objektTyp, itemBenutzen } from '../../daten.js';
import { boden, karteHolen } from '../../karten.js';
import { alle } from '../../system.js';
import * as L from '../../logik.js';
import { ton, meldung, halme } from '../../spiel.js';
import { ganz } from '../../zufall.js';

export const GRAS_MAX = 900;           // höchstens so viele Büschel je Karte
export const GRAS_VERBREITEN = 0.06;   // Chance je Büschel und Nacht, ein Nachbarfeld zu bewachsen

item('grassamen', { name: 'Grassamen', kat: 'ressource', preis: 50, bild: { art: 'grassamen', f: '#6aa84a' }, text: 'Auf freien Boden streuen: Bald steht dort hohes Gras.' });

function maehen(c) {
  const { s, ort, x, y, kk, erg, r } = c;
  delete ort.welt.objekte[kk];
  erg.treffer = 'unkraut';
  erg.gras = (erg.gras || 0) + 1;
  alle('grasGemaeht', { s, ort, x, y, erg, r });
  return true;
}

objektTyp('hohesgras', {
  sense: maehen, waffe: maehen, hacke: maehen,
  hinweis: '',
});

const grasBoden = (def, x, y) => boden(def, x, y) === '.';

/** Ein Büschel samt ein paar Nachbarn setzen (nur auf freiem Wiesenboden). */
export function grasSetzen(s, ort, x, y, r, n = 1) {
  let gesetzt = 0;
  const offen = [[x, y]];
  for (let i = 0; i < n * 4 && offen.length && gesetzt < n; i++) {
    const [px, py] = offen.shift();
    if (grasBoden(ort.def, px, py) && L.feldFrei(s, ort, px, py) && !ort.def.frei?.some((b) => L.imBereich(b, px, py))) {
      ort.welt.objekte[L.k(px, py)] = { t: 'hohesgras', v: ganz(r, 0, 2) };
      gesetzt++;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (r() < 0.6) offen.push([px + dx, py + dy]);
  }
  return gesetzt;
}

/** Über Nacht: ausbreiten und auf Wiesen nachwachsen. */
export function grasNacht(s, r) {
  if (L.jahreszeit(s) === 'winter') return;
  for (const [id, w] of Object.entries(s.welt)) {
    const def = karteHolen(id, s);
    if (!def?.aussen || def.ganzjaehrig || def.fluechtig) continue;
    const ort = { def, welt: w };
    const gras = Object.keys(w.objekte).filter((kk) => w.objekte[kk].t === 'hohesgras');
    let n = gras.length;
    for (const kk of gras) {
      if (n >= GRAS_MAX) break;
      if (r() >= GRAS_VERBREITEN) continue;
      const [x, y] = L.ausK(kk);
      const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][ganz(r, 0, 3)];
      n += grasSetzen(s, ort, x + dx, y + dy, r, 1);
    }
    for (const zone of def.sammel ?? []) {
      if (zone.art !== 'wiese' || n >= GRAS_MAX || r() > 0.35) continue;
      n += grasSetzen(s, ort, zone.x + ganz(r, 0, zone.w - 1), zone.y + ganz(r, 0, zone.h - 1), r, ganz(r, 2, 5));
    }
  }
}

itemBenutzen((c) => c.it.id === 'grassamen', (c) => {
  const { s, ort, x, y } = c;
  if (!grasBoden(ort.def, x, y) || !L.feldFrei(s, ort, x, y)) { meldung('Grassamen brauchen freien Wiesenboden.'); return; }
  const n = grasSetzen(s, ort, x, y, Math.random, 5);
  if (!n) return;
  L.entfernenAusSlot(s, c.idx, 1);
  ton('saat');
  halme(x, y);
});
