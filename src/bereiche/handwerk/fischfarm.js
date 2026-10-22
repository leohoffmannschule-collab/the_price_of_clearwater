// Bereich „handwerk": die Fischfarm. Ein Netzkasten am Ufer, der jede Nacht Karpfen fängt – auf
// jeder Karte, auch wenn man nicht dort ist (Objekt-Hook `nacht` läuft für alle Karten in s.welt).
// Der Vorrat liegt als Zahl in der Farm (`o.fisch`, im Spielstand, Format bleibt v2); alte
// Stände ohne Farm bleiben gültig. Der Fisch ist immer der normale Karpfen (Item aus dem Bereich
// angeln, nur über die ID): ohne Qualität, ohne Größe, kein Angel-XP, kein Fangbuch (`s.angeln`).
//
// Zum Ändern: FISCHFARM_PRO_TAG (Karpfen je Nacht und Farm) und FISCHFARM_FISCH (Item-ID).

import { ITEMS, item, rezept, objektTyp } from '../../daten.js';
import * as L from '../../logik.js';
import { istWasser } from '../../karten.js';
import { ton, ergebnisZeigen } from '../../spiel.js';

export const FISCHFARM_PRO_TAG = 200;
export const FISCHFARM_FISCH = 'karpfen';

const fischName = () => ITEMS[FISCHFARM_FISCH]?.name ?? 'Fisch';

/** Vorrat als ganze, nicht negative Zahl (beschädigte Stände: null, NaN, Text, negativ → 0). */
export function vorratVon(o) {
  const n = Math.floor(Number(o?.fisch));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

item('fischfarm', {
  name: 'Fischfarm',
  kat: 'platz',
  bild: { art: 'fischfarm' },
  aufstellbar: true,
  text: `Muss direkt am Wasser stehen. Fängt jede Nacht ${FISCHFARM_PRO_TAG} ${fischName()}. Mit der Aktionstaste einsammeln, leer mit der Axt wieder aufheben.`,
});

rezept('fischfarm', { zutaten: { holz: 3 } });

const KREUZ = [[0, -1], [-1, 0], [1, 0], [0, 1]];

/** Ufer-Regel: freies, begehbares Landfeld (kein Beet, kein Objekt) mit Wasser in der 4er-Nachbarschaft. */
function platz({ s, ort, x, y }) {
  const { def, welt: w } = ort;
  const kk = L.k(x, y);
  if (w.objekte[kk] || w.felder[kk] || !L.begehbar(s, def, w, x, y) || L.warpAn(def, x, y)) return 'Hier ist kein Platz.';
  return KREUZ.some(([dx, dy]) => istWasser(def, x + dx, y + dy)) ? true : 'Die Fischfarm muss direkt am Wasser stehen.';
}

/**
 * Alles einsammeln, was in den Rucksack passt (Stapel bis STAPEL_MAX); der Rest bleibt in der Farm.
 * Ergebnis: `items` (Fund-Anzeige), `text`/`grund` (Meldung), `ok`, wenn etwas genommen wurde.
 */
export function farmEinsammeln(s, o) {
  const erg = L.neuesErgebnis();
  const vorrat = vorratVon(o);
  o.fisch = vorrat;
  const name = fischName();
  if (vorrat <= 0) {
    erg.grund = `Noch keine Fische. Über Nacht kommen ${FISCHFARM_PRO_TAG} ${name}.`;
    return erg;
  }
  const n = Math.min(vorrat, L.platzFuer(s, { id: FISCHFARM_FISCH, n: 1 }));
  const rest = n > 0 ? L.hinzufuegen(s, { id: FISCHFARM_FISCH, n }) : 0;
  const genommen = n - rest;
  o.fisch = vorrat - genommen;
  if (genommen > 0) {
    erg.ok = true;
    erg.items.push({ id: FISCHFARM_FISCH, n: genommen });
  }
  if (o.fisch > 0) erg.grund = `Rucksack voll – ${o.fisch} ${name} bleiben in der Farm.`;
  else erg.text = `${genommen} ${name} eingesammelt.`;
  return erg;
}

objektTyp('fischfarm', {
  blockiert: true,
  axt: L.aufheben,
  spitzhacke: L.aufheben,
  anlegen(o) { o.fisch = 0; },
  platz,
  nichtLeer: (o) => (vorratVon(o) > 0 ? 'In der Fischfarm sind noch Fische.' : null),
  nacht({ o }) { o.fisch = vorratVon(o) + FISCHFARM_PRO_TAG; },
  interagieren({ s, o }) {
    const erg = farmEinsammeln(s, o);
    if (erg.ok) ton('pop');
    ergebnisZeigen(erg);
  },
  hinweis: ({ o }) => (vorratVon(o) > 0 ? `Fische einsammeln (${vorratVon(o)})` : 'Fischfarm'),
});
