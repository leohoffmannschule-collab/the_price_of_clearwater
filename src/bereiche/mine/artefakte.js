// Bereich „mine" – Artefaktstellen: Würmer im Boden auf Dorf, Wald, Strand, Berg und im Geheimen Wald
// (selten auch in der Mine). Mit der Hacke ausgraben: ein Artefakt des Ortes, eine Geode oder Krimskrams.
// Neue Stellen kommen über Nacht (tagEnde) auf freie Gras- und Sandfelder (L.feldFrei).

import { ITEMS, objektTyp } from '../../daten.js';
import { KARTEN } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { zufall, ganz, waehle } from '../../zufall.js';
import { ARTEFAKTE } from './gegenstaende.js';

/** Karten mit Artefaktstellen und welche Fundort-Art sie haben. */
export const ARTEFAKT_KARTEN = { dorf: 'dorf', wald: 'wald', strand: 'strand', berg: 'berg', geheimwald: 'geheimwald' };
export const ARTEFAKT_STELLEN_MAX = 3;
const BODEN = new Set(['.', 's']);

/** Was eine Stelle hergibt (Fundort-Art `ort`). */
export function stellenFund(ort, r) {
  const x = r();
  const hier = ARTEFAKTE.filter((id) => ITEMS[id].fundorte?.includes(ort));
  if (x < 0.42 && hier.length) return [{ id: waehle(r, hier), n: 1 }];
  if (x < 0.55) return [{ id: ort === 'mine' ? 'omnigeode' : 'geode', n: 1 }];
  if (x < 0.7) return [{ id: 'stein', n: ganz(r, 2, 4) }];
  if (x < 0.8) return [{ id: 'kupfererz', n: ganz(r, 1, 3) }];
  if (x < 0.9) return [{ id: 'kohle', n: ganz(r, 1, 2) }];
  return [{ id: 'faser', n: ganz(r, 2, 4) }];
}

objektTyp('mine_artefaktstelle', {
  blockiert: false,
  hacke({ s, ort, x, y, kk, o, erg, r }) {
    delete ort.welt.objekte[kk];
    for (const it of stellenFund(o.ort || ARTEFAKT_KARTEN[ort.def.id] || 'dorf', r)) {
      if (!ITEMS[it.id]) continue;
      L.geben(s, ort, x, y, it, erg);
      if (ITEMS[it.id].museum) s.mine.gefunden[it.id] = true;
    }
    L.xpGeben(s, 'sammeln', 3, erg);
    erg.treffer = 'erde';
    erg.n = (erg.n || 0) + 1;
    return true;
  },
});

/** Legt auf einer Karte bis zu `n` neue Stellen an; gibt die Zahl der neuen zurück. */
export function stellenSetzen(s, kartenId, r, n = 1) {
  const def = KARTEN[kartenId];
  if (!def) return 0;
  const ort = L.ortVon(s, kartenId);
  const schon = Object.values(ort.welt.objekte).filter((o) => o.t === 'mine_artefaktstelle').length;
  let neu = 0;
  for (let v = 0; v < 80 && neu < n && schon + neu < ARTEFAKT_STELLEN_MAX; v++) {
    const x = ganz(r, 1, def.w - 2);
    const y = ganz(r, 1, def.h - 2);
    if (!BODEN.has(def.grid[y][x]) || !L.feldFrei(s, ort, x, y)) continue;
    if (L.dekoAn(s, def, x, y) || L.gebaeudeAn(s, def, x, y)) continue;
    ort.welt.objekte[L.k(x, y)] = { t: 'mine_artefaktstelle', ort: ARTEFAKT_KARTEN[kartenId] };
    neu++;
  }
  return neu;
}

system({
  name: 'mine-artefakte',
  // eigener Zufall aus Spielstand und Tag, damit die gemeinsame Zufallsfolge der anderen Bereiche gleich bleibt
  neuesSpiel(s) {
    const r = zufall((s.seed ^ 0x5a17) >>> 0);
    for (const id of Object.keys(ARTEFAKT_KARTEN)) stellenSetzen(s, id, r, 1);
  },
  tagEnde(s) {
    const r = zufall(((s.seed ?? 1) * 31 + L.tagNr(s.zeit) * 7919) >>> 0);
    for (const id of Object.keys(ARTEFAKT_KARTEN)) if (r() < 0.55) stellenSetzen(s, id, r, 1);
    // Museumsfunde im Rucksack merken (Welle 2 baut die Ausstellung)
    for (const x of s.spieler.inv) if (x && ITEMS[x.id]?.museum) s.mine.gefunden[x.id] = true;
  },
});
