// Bereich „mine" – Ringe (zwei Ringplätze) und Stiefel (ein Platz). Angelegtes liegt in
// `s.mine.ringe` ([id | null, id | null]) und `s.mine.stiefel` (id | null); die Wirkung kommt über
// Modifikatoren: stufe, sammelRadius, verteidigung, schaden, energieKosten, maxGesundheit, laufTempo
// und die bereichseigenen mine_krit, mine_waffenTempo, mine_heilen. Die Plätze zeigt oberflaeche.js.

import { ITEMS } from '../../daten.js';
import { modifikator } from '../../system.js';
import * as L from '../../logik.js';
import { mineGlueckBonus } from './ebenen.js';

export const RING_PLAETZE = 2;

/** Wirkungen aller angelegten Ringe (Liste der `ring`-Felder). */
export function ringWirkungen(s) {
  const liste = [];
  for (const id of s?.mine?.ringe || []) if (id && ITEMS[id]?.ring) liste.push(ITEMS[id].ring);
  return liste;
}
const summe = (s, feld) => ringWirkungen(s).reduce((a, w) => a + (w[feld] || 0), 0);
const stiefelVon = (s) => (s?.mine?.stiefel && ITEMS[s.mine.stiefel]?.stiefel) || null;

export const traegt = (s, id) => !!s?.mine?.ringe?.includes(id);

modifikator('stufe', (w, k) => {
  let plus = 0;
  for (const r of ringWirkungen(k.s)) plus += r.stufe?.[k.skill] || 0;
  return w + plus;
});
modifikator('sammelRadius', (w, k) => w + summe(k.s, 'sammelRadius'));
modifikator('verteidigung', (w, k) => w + summe(k.s, 'verteidigung') + (stiefelVon(k.s)?.verteidigung || 0));
modifikator('schaden', (w, k) => w * (1 + summe(k.s, 'schaden')));
modifikator('energieKosten', (w, k) => w * (1 - Math.min(0.5, summe(k.s, 'energie'))));
modifikator('maxGesundheit', (w, k) => w + summe(k.s, 'gesundheit'));
modifikator('laufTempo', (w, k) => w * (1 + (stiefelVon(k.s)?.tempo || 0)));
modifikator('mine_krit', (w, k) => w + summe(k.s, 'krit'));
modifikator('mine_waffenTempo', (w, k) => w + summe(k.s, 'waffenTempo'));
modifikator('mine_heilen', (w, k) => w + summe(k.s, 'heilen'));
mineGlueckBonus((s) => summe(s, 'glueck'));

/** Leuchtradius in Feldern (0 = kein Leuchtring). */
export const ringLicht = (s) => summe(s, 'licht');

/** Ring aus dem Rucksack (Platz idx) anlegen; `platz` 0/1 oder der erste freie. Gibt Text bei Fehler. */
export function ringAnlegen(s, idx, platz = null) {
  const slot = s.spieler.inv[idx];
  if (!slot || ITEMS[slot.id]?.kat !== 'ring') return 'Das ist kein Ring.';
  const ringe = s.mine.ringe;
  let p = platz ?? ringe.findIndex((x) => !x);
  if (p < 0) p = 0;
  const alt = ringe[p];
  ringe[p] = slot.id;
  s.spieler.inv[idx] = alt ? { id: alt, n: 1 } : null;
  L.werteAktualisieren(s);
  if (s.spieler.hp > s.spieler.maxHp) s.spieler.hp = s.spieler.maxHp;
  return true;
}

/** Ring von Platz p ablegen (in den Rucksack). */
export function ringAblegen(s, p) {
  const id = s.mine.ringe[p];
  if (!id) return 'Da steckt kein Ring.';
  if (L.platzFuer(s, { id, n: 1 }) < 1) return 'Dein Rucksack ist voll.';
  s.mine.ringe[p] = null;
  L.hinzufuegen(s, { id, n: 1 });
  L.werteAktualisieren(s);
  if (s.spieler.hp > s.spieler.maxHp) s.spieler.hp = s.spieler.maxHp;
  return true;
}

export function stiefelAnziehen(s, idx) {
  const slot = s.spieler.inv[idx];
  if (!slot || ITEMS[slot.id]?.kat !== 'stiefel') return 'Das sind keine Stiefel.';
  const alt = s.mine.stiefel;
  s.mine.stiefel = slot.id;
  s.spieler.inv[idx] = alt ? { id: alt, n: 1 } : null;
  return true;
}

export function stiefelAusziehen(s) {
  const id = s.mine.stiefel;
  if (!id) return 'Du trägst keine besonderen Stiefel.';
  if (L.platzFuer(s, { id, n: 1 }) < 1) return 'Dein Rucksack ist voll.';
  s.mine.stiefel = null;
  L.hinzufuegen(s, { id, n: 1 });
  return true;
}
