// Bereich „handwerk" – Fabrik: Zustand `s.fabrik`, laufende Simulation (Hook update), Nachholen beim Betreten einer
// Karte und über Nacht (Hook vorVerkauf, vor dem Verkauf der Versandkiste) und das Anlegen der Vorkommen.
//
//   s.fabrik = { t, zeit: { <karte>: Zahl }, vk, vkb }
//     t     laufende Fabrik-Uhr in Sekunden Echtzeit-Äquivalent (zählt, solange das Spiel läuft, und springt über Nacht)
//     zeit  je Karte mit Fabrik: bis wohin sie simuliert ist; t − zeit = Rückstand, höchstens FABRIK.nachholMax
//     vk    Vorkommen von Hof, Wald und Strand sind angelegt, vkb die im Steinbruch
// Live läuft nur die Karte, auf der die Spielerin ist (Bild für Bild, mit Zeitbudget für Rückstand); alle anderen
// holen beim Betreten oder über Nacht nach. Alles als Zahlen im Spielstand (Format v2), alte Stände ohne Fabrik gelten.

import * as L from '../../logik.js';
import { karteHolen } from '../../karten.js';
import { system } from '../../system.js';
import { S } from '../../spiel.js';
import { FABRIK } from './fabrik-daten.js';
import { simuliere } from './fabrik-sim.js';
import { vorkommenAnlegen } from './fabrik-vorkommen.js';

const zahl = (x, vorgabe = 0) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Number(x) : vorgabe);

/** `s.fabrik` anlegen und beschädigte Werte glätten. */
export function fabrikZustand(s) {
  const f = (s.fabrik && typeof s.fabrik === 'object' ? s.fabrik : (s.fabrik = {}));
  f.t = zahl(f.t);
  if (!f.zeit || typeof f.zeit !== 'object') f.zeit = {};
  for (const id of Object.keys(f.zeit)) f.zeit[id] = Math.min(zahl(f.zeit[id], f.t), f.t);
  f.vk = !!f.vk;
  f.vkb = !!f.vkb;
  return f;
}

/** Rückstand einer Karte in Sekunden (gedeckelt auf FABRIK.nachholMax; die Uhr der Karte rückt dann nach). */
export function rueckstand(s, id) {
  const f = s.fabrik;
  if (f.zeit[id] == null) return 0;
  const r = f.t - f.zeit[id];
  if (r > FABRIK.nachholMax) { f.zeit[id] = f.t - FABRIK.nachholMax; return FABRIK.nachholMax; }
  return Math.max(0, r);
}

/**
 * Eine Karte bis zur Fabrik-Uhr nachholen. `budgetMs` begrenzt die Rechenzeit (der Rest bleibt für das nächste Bild);
 * ohne Budget wird alles sofort nachgeholt. Gibt die verbleibenden Sekunden zurück.
 */
export function nachholen(s, ort, opt = {}) {
  const f = fabrikZustand(s);
  const id = ort.def.id;
  const r = rueckstand(s, id);
  if (r <= 0) return 0;
  const rest = simuliere(s, ort, r, { schritt: r > FABRIK.schritt * 2 ? FABRIK.nachholSchritt : FABRIK.schritt, ...opt });
  f.zeit[id] = f.t - rest;
  return rest;
}

/** Die Nacht: die Uhr springt um die verschlafene Zeit, jede Karte mit Fabrik holt nach (Verkauf folgt danach). */
export function nacht(s, minuten) {
  const f = fabrikZustand(s);
  f.t += Math.max(0, minuten || 0) * FABRIK.sekProMinute;
  for (const id of Object.keys(f.zeit)) {
    const def = karteHolen(id, s);
    if (!def || def.fluechtig) { delete f.zeit[id]; continue; }
    nachholen(s, { def, welt: L.welt(s, id) });
  }
}

function update(dt) {
  const s = S.s;
  if (!s?.fabrik || !S.ort) return;
  const f = s.fabrik;
  f.t += dt;
  const ort = S.ort;
  if (ort.def.fluechtig || f.zeit[ort.def.id] == null) return;
  nachholen(s, ort, { budgetMs: FABRIK.budgetMs });
}

system({
  name: 'handwerk-fabrik',
  ergaenzen(s) {
    const f = fabrikZustand(s);
    // Der Steinbruch bekommt seine Vorkommen zuerst: der Berg füllt sich im neuen Spiel erst danach und lässt sie frei.
    if (!f.vkb) { vorkommenAnlegen(s, 'berg'); f.vkb = true; }
    // Älterer Stand ohne Vorkommen: auch Hof, Wald und Strand gleich. Ein neues Spiel tut das erst in neuesSpiel, wenn alle
    // Karten bewachsen sind (am ersten Morgen ist `s.stats.tage` 1); wer am ersten Tag speichert, bekommt sie in der ersten Nacht.
    if (!f.vk && s.stats?.tage > 1) { vorkommenAnlegen(s, 'rest'); f.vk = true; }
  },
  neuesSpiel(s) {
    const f = fabrikZustand(s);
    if (!f.vk) { vorkommenAnlegen(s, 'rest'); f.vk = true; }
  },
  tagEnde(s) {
    const f = fabrikZustand(s);
    if (!f.vk) { vorkommenAnlegen(s, 'rest'); f.vk = true; }
  },
  update,
  vorVerkauf(s, bericht) { nacht(s, bericht?.nachtMinuten ?? 0); },
});
