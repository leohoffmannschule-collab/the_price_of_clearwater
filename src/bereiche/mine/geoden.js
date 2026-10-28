// Bereich „mine" – Geoden: was in welcher Geode steckt, das Knacken (25 g bei Bruno in der Schmiede,
// Gesprächsoption über den Hook npcOptionen) und Brunos Ankauf von Geoden und Artefakten.

import { ITEMS } from '../../daten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { fenster, ladenGeoeffnetBei } from '../../spiel.js';
import { MINERALIEN, ARTEFAKTE } from './gegenstaende.js';

export const GEODEN = ['geode', 'frostgeode', 'magmageode', 'omnigeode'];
export const GEODE_PREIS = 25;

/** Grundinhalt je Geode: [id, Gewicht, von, bis]; Mineralien und Artefakte kommen dazu. */
const GRUND = {
  geode: [['stein', 14, 1, 3], ['kupfererz', 10, 3, 5], ['eisenerz', 4, 1, 3], ['kohle', 8, 1, 3]],
  frostgeode: [['stein', 12, 1, 3], ['eisenerz', 10, 2, 5], ['golderz', 3, 1, 3], ['kohle', 6, 1, 3]],
  magmageode: [['stein', 10, 1, 3], ['golderz', 10, 2, 5], ['eisenerz', 4, 2, 4], ['kohle', 6, 2, 4], ['iridiumerz', 0.8, 1, 1]],
  omnigeode: [['stein', 8, 1, 3], ['kupfererz', 4, 3, 5], ['eisenerz', 4, 2, 5], ['golderz', 4, 2, 4], ['iridiumerz', 1.2, 1, 2]],
};

/** Was in einer Geode stecken kann: [[id, gewicht, von, bis]…] */
export function geodenTabelle(geode) {
  const liste = [...(GRUND[geode] || [])].filter(([id]) => ITEMS[id]);
  const minerale = MINERALIEN.filter((id) => ITEMS[id].quelle?.includes(geode));
  const teuer = (id) => ITEMS[id].preis;
  for (const id of minerale) {
    // seltene (teure) Mineralien kommen seltener
    const w = id === 'prismasplitter' ? 0.15 : Math.max(0.6, 5 - teuer(id) / 80);
    liste.push([id, w, 1, 1]);
  }
  for (const id of ARTEFAKTE) if (ITEMS[id].geode) liste.push([id, geode === 'omnigeode' ? 0.8 : 0.4, 1, 1]);
  return liste;
}

/** Würfelt den Inhalt einer Geode: { id, n }. `glueck` verschiebt leicht zu seltenen Mineralien. */
export function geodeInhalt(geode, r = Math.random, glueck = 0) {
  const liste = geodenTabelle(geode).map(([id, w, a, b]) => [id, ITEMS[id].kat === 'mineral' || ITEMS[id].kat === 'artefakt' ? w * (1 + Math.max(0, glueck) * 0.1) : w, a, b]);
  const summe = liste.reduce((s, [, w]) => s + w, 0);
  let x = r() * summe;
  for (const [id, w, a, b] of liste) {
    if ((x -= w) < 0) return { id, n: a + Math.floor(r() * (b - a + 1)) };
  }
  const [id, , a] = liste[liste.length - 1];
  return { id, n: a };
}

/**
 * Bruno knackt eine Geode aus Platz idx. Gibt { slot, gold } oder { grund } zurück.
 * Der Inhalt landet im Rucksack (passt er nicht, bleibt die Geode heil).
 */
export function geodeOeffnen(s, idx, r = Math.random) {
  const slot = s.spieler.inv[idx];
  if (!slot || !GEODEN.includes(slot.id)) return { grund: 'Das ist keine Geode.' };
  if (s.spieler.gold < GEODE_PREIS) return { grund: `Das Knacken kostet ${GEODE_PREIS} g.` };
  const geode = slot.id;
  const inhalt = geodeInhalt(geode, r, L.glueck(s));
  L.entfernenAusSlot(s, idx, 1);
  const rest = L.hinzufuegen(s, inhalt);
  if (rest > 0) {
    // passt nicht: alles zurück, die Geode bleibt heil
    if (rest < inhalt.n) L.entfernen(s, inhalt.id, inhalt.n - rest);
    if (s.spieler.inv[idx]?.id === geode) s.spieler.inv[idx].n += 1;
    else if (!s.spieler.inv[idx]) s.spieler.inv[idx] = { id: geode, n: 1 };
    else L.hinzufuegen(s, { id: geode, n: 1 });
    return { grund: 'Dein Rucksack ist voll.' };
  }
  s.spieler.gold -= GEODE_PREIS;
  s.mine.geoden = (s.mine.geoden || 0) + 1;
  if (ITEMS[inhalt.id].museum) s.mine.gefunden[inhalt.id] = true;
  return { slot: inhalt, gold: GEODE_PREIS, geode };
}

export const hatGeode = (s) => s.spieler.inv.some((x) => x && GEODEN.includes(x.id));

system({
  name: 'mine-geoden',
  npcOptionen(n, s) {
    if (n.id !== 'bruno' || !hatGeode(s) || ladenGeoeffnetBei(n) !== 'schmiede') return undefined;
    return [['Geoden knacken', () => fenster('mine_geoden', {})]];
  },
  ladenKauft: (ladenId) => (ladenId === 'schmiede' ? ['geode'] : undefined),
});
