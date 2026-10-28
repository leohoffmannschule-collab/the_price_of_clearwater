// Bereich „pflanzen": alles, was wächst.
//   feldfruechte.js  41 Feldfrüchte samt Saat (Rankhilfen, Riesenpflanzen, Mehrfachernten)
//   sammelfunde.js   Sammelfunde je Zonenart und Jahreszeit, Strandfunde, Wildsamen
//   duenger.js       Dünger, Qualitätsdünger, Wachstumsbeschleuniger, Feuchteerde
//   baeume.js        Wildbäume (Eiche, Ahorn, Kiefer, Mahagoni) mit Wachstumsstufen aus Samen
//   obstbaeume.js    Obstbäume (Setzling, 28 Tage, Früchte in ihrer Jahreszeit)
//   riesen.js        Riesenpflanzen (3×3)
//   gras.js          hohes Gras (Hook grasGemaeht)
// Dazu hier: Säen und Düngen aus der Hand, Saatgut/Setzlinge/Dünger bei Ottilie und Grassamen auf
// der Ranch (Hook ladenWare), Krähen und die Nacht.
//
// Jede Ernte und jeder Sammelfund trägt `sorte` (gemuese, obst, blume, getreide, kraut, pilz).

import { ITEMS, OBJEKT_TYPEN, PFLANZEN, kategorie, spezialWare, itemBenutzen } from '../../daten.js';
import { karteHolen } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { ton, meldung, staub } from '../../spiel.js';
import { waehle } from '../../zufall.js';
import './feldfruechte.js';
import { WILDSAMEN } from './sammelfunde.js';
import { DUENGER, streuen, feuchteHalten } from './duenger.js';
import { baeumeNacht } from './baeume.js';
import { OBSTBAEUME, obstNacht } from './obstbaeume.js';
import { riesenNacht } from './riesen.js';
import { grasNacht } from './gras.js';

kategorie('saat', 'Saatgut');
kategorie('ernte', 'Ernte');
kategorie('sammel', 'Sammelfund');
kategorie('duenger', 'Dünger');

// ─── Säen und Düngen aus der Hand ───────────────────────────────────────────

/** Wildsamen: eine der Pflanzen dieser Saat zufällig wählen und säen. */
export function wildSaeen(s, ort, x, y, idx, r = Math.random) {
  const slot = s.spieler.inv[idx];
  const jz = ITEMS[slot?.id]?.wildsamen;
  if (!WILDSAMEN[jz]) return { grund: null };
  const f = ort.welt.felder[L.k(x, y)];
  if (!f) return { grund: ort.def.farmbar ? 'Erst mit der Hacke den Boden lockern.' : null };
  if (f.pflanze) return {};
  if (!ort.def.ganzjaehrig && L.jahreszeit(s) !== jz) return { grund: `${ITEMS[slot.id].name} gehen nur im passenden Wetter auf.` };
  const moegliche = Object.values(PFLANZEN).filter((p) => p.saat === slot.id);
  f.pflanze = { id: waehle(r, moegliche).id, tage: 0 };
  L.entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

itemBenutzen((c) => c.it.kat === 'saat', (c) => {
  const r = c.it.wildsamen ? wildSaeen(c.s, c.ort, c.x, c.y, c.idx) : L.saeen(c.s, c.ort, c.x, c.y, c.idx);
  if (r.ok) { ton('saat'); staub(c.x, c.y, '#6a4a2a'); } else if (r.grund) meldung(r.grund);
});
itemBenutzen((c) => c.it.kat === 'duenger', (c) => {
  const r = DUENGER[c.it.id] ? streuen(c.s, c.ort, c.x, c.y, c.idx) : L.duengen(c.s, c.ort, c.x, c.y, c.idx);
  if (r.ok) { ton('saat'); staub(c.x, c.y, '#9aa8b8'); } else if (r.grund) meldung(r.grund);
});

// ─── Ware in fremden Läden ──────────────────────────────────────────────────

const LADEN_WARE = {
  laden: [
    { spezial: 'saatgut', reihe: 10 },
    { id: 'duenger', preis: 100, reihe: 20 },
    { id: 'qualitaetsduenger', preis: 150, reihe: 21 },
    { id: 'beschleuniger', preis: 100, reihe: 22 },
    { id: 'feuchteerde', preis: 100, reihe: 23 },
    ...Object.entries(OBSTBAEUME).map(([id, o], i) => ({ id: `${id}setzling`, preis: o.kauf, reihe: 30 + i })),
  ],
  ranch: [{ id: 'grassamen', preis: 100, reihe: 15 }],
};

spezialWare('saatgut', {
  angebote(s) {
    const jz = L.jahreszeit(s);
    return Object.values(PFLANZEN).filter((p) => p.jz.includes(jz) && ITEMS[p.saat]?.kauf).map((p) => ({ id: p.saat, preis: ITEMS[p.saat].kauf }));
  },
});

// ─── Krähen ─────────────────────────────────────────────────────────────────

/** Ab 16 Pflanzen holt sich nachts manchmal eine Krähe eine ungeschützte (Objekte mit kraehenSchutz). */
function kraehen(s, bericht, r) {
  if (L.jahreszeit(s) === 'winter') return;
  for (const [id, w] of Object.entries(s.welt)) {
    const def = karteHolen(id, s);
    if (!def?.aussen || !def.farmbar || def.ganzjaehrig) continue;
    const pflanzen = Object.entries(w.felder).filter(([, f]) => f.pflanze && !f.pflanze.tot);
    if (pflanzen.length < 16 || r() >= 0.4) continue;
    const scheuchen = Object.entries(w.objekte)
      .filter(([, o]) => OBJEKT_TYPEN[o.t]?.kraehenSchutz)
      .map(([kk, o]) => [...L.ausK(kk), OBJEKT_TYPEN[o.t].kraehenSchutz]);
    const offen = pflanzen.filter(([kk]) => {
      const [x, y] = L.ausK(kk);
      return !scheuchen.some(([sx, sy, rad]) => (sx - x) ** 2 + (sy - y) ** 2 <= rad * rad);
    });
    if (!offen.length) continue;
    const [, f] = waehle(r, offen);
    bericht.meldungen.push(`Eine Krähe hat in der Nacht eine Pflanze gefressen (${ITEMS[PFLANZEN[f.pflanze.id].ernte].name}). Eine Vogelscheuche hält sie fern.`);
    f.pflanze = null;
  }
}

system({
  name: 'pflanzen',
  neuesSpiel(s) { L.hinzufuegen(s, { id: 'pastinake_saat', n: 15 }); },
  ladenWare: (ladenId) => LADEN_WARE[ladenId],
  tagEnde(s, bericht, r) {
    riesenNacht(s, bericht, r);
    kraehen(s, bericht, r);
    feuchteHalten(s, r);
    obstNacht(s, bericht.jzWechsel);
    baeumeNacht(s, r);
    grasNacht(s, r);
  },
});
