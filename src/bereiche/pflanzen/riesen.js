// Bereich „pflanzen": Riesenpflanzen. Stehen 3×3 reife gleiche Pflanzen mit `riesig` (Blumenkohl,
// Melone, Kürbis) beisammen, verschmelzen sie über Nacht mit der Chance RIESE_CHANCE zu einem großen
// Objekt { t: 'pflanzen_riese', art, hp } mit Fläche 3×3 (nur draußen, nicht im Gewächshaus).
// Mit der Axt gefällt gibt es 15–21 Ernten.

import { ITEMS, PFLANZEN, objektTyp } from '../../daten.js';
import { karteHolen } from '../../karten.js';
import * as L from '../../logik.js';
import { ganz } from '../../zufall.js';

export const RIESE_CHANCE = 0.01;
export const RIESE_HP = 9;

objektTyp('pflanzen_riese', {
  blockiert: true,
  flaeche: [3, 3],
  axt({ s, ort, x, y, o, erg, r, kraft }) {
    o.hp = (o.hp ?? RIESE_HP) - kraft;
    erg.treffer = 'holz';
    if (o.hp > 0) return true;
    L.objektEntfernen(ort, x, y);
    const id = PFLANZEN[o.art]?.ernte ?? o.art;
    if (ITEMS[id]) {
      const n = ganz(r, 15, 21);
      const gold = ganz(r, 0, 2);
      if (gold) L.geben(s, ort, x + 1, y + 1, { id, n: gold, q: 2 }, erg);
      L.geben(s, ort, x + 1, y + 1, { id, n: n - gold }, erg);
      s.stats.geerntet += n;
    }
    L.xpGeben(s, 'landwirtschaft', 60, erg);
    erg.riese = o.art;
    return true;
  },
  hinweis: ({ o }) => `Riesen-${ITEMS[PFLANZEN[o.art]?.ernte]?.name ?? 'Pflanze'} – mit der Axt fällen`,
});

/** Passt ab (x, y) ein Block aus 3×3 reifen Pflanzen der Art id? */
function blockReif(w, x, y, id) {
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
    const kk = L.k(x + dx, y + dy);
    const f = w.felder[kk];
    if (!L.reif(f) || f.pflanze.id !== id || w.objekte[kk]) return false;
  }
  return true;
}

/** Über Nacht: Riesen wachsen lassen. Gibt die Zahl neuer Riesen zurück. */
export function riesenNacht(s, bericht, r) {
  let neu = 0;
  for (const [kid, w] of Object.entries(s.welt)) {
    const def = karteHolen(kid, s);
    if (!def?.farmbar || !def.aussen || def.ganzjaehrig) continue;
    const ort = { def, welt: w };
    for (const kk of Object.keys(w.felder)) {
      const f = w.felder[kk];
      const pid = f?.pflanze?.id;
      if (!pid || !PFLANZEN[pid]?.riesig || !L.reif(f)) continue;
      const [x, y] = L.ausK(kk);
      if (!blockReif(w, x, y, pid) || r() >= RIESE_CHANCE) continue;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) w.felder[L.k(x + dx, y + dy)].pflanze = null;
      L.objektSetzen(ort, x, y, { t: 'pflanzen_riese', art: pid, hp: RIESE_HP });
      neu++;
      bericht?.meldungen.push(`Über Nacht ist auf deinem Feld etwas Riesiges gewachsen: ein Riesen-${ITEMS[PFLANZEN[pid].ernte].name}!`);
    }
  }
  return neu;
}
