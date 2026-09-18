// Alle Inhalte der Kampagne, zusammengeführt.
// Jedes Modul liefert dialogues, events, combats, endings und areaEnter.

import * as prolog from './akt1_prolog.js';
import * as klarwasser from './akt1_klarwasser.js';
import * as spiegelhof from './akt1_spiegelhof.js';
import * as neumond from './akt1_neumond.js';
import * as akt2 from './akt2.js';
import * as akt3 from './akt3.js';
import * as akt4 from './akt4.js';

const MODULE = [prolog, klarwasser, spiegelhof, neumond, akt2, akt3, akt4];

function sammle(schluessel) {
  const out = {};
  for (const m of MODULE) Object.assign(out, m[schluessel] || {});
  return out;
}

export const CONTENT = {
  dialogues: sammle('dialogues'),
  events: sammle('events'),
  combats: sammle('combats'),
  endings: sammle('endings'),
  areaEnter: sammle('areaEnter'),
};

/** Für Tests: prüft, dass alle Verweise ins Leere zeigen. */
export function pruefeVerweise(areas) {
  const fehler = [];
  for (const [id, d] of Object.entries(CONTENT.dialogues)) {
    for (const [nid, n] of Object.entries(d.nodes)) {
      if (n.to && !d.nodes[n.to]) fehler.push(`Dialog ${id}: Knoten ${nid} → unbekannt "${n.to}"`);
      for (const c of n.choices || []) {
        if (c.to && !d.nodes[c.to]) fehler.push(`Dialog ${id}: ${nid} Antwort → unbekannt "${c.to}"`);
        if (c.check?.success && !d.nodes[c.check.success]) fehler.push(`Dialog ${id}: ${nid} Probe-Erfolg → "${c.check.success}"`);
        if (c.check?.fail && !d.nodes[c.check.fail]) fehler.push(`Dialog ${id}: ${nid} Probe-Misserfolg → "${c.check.fail}"`);
      }
    }
  }
  if (areas) {
    for (const a of Object.values(areas)) {
      for (const p of a.punkte || []) {
        if (p.dialog && !CONTENT.dialogues[p.dialog]) fehler.push(`Ort ${a.id}: Punkt ${p.id} → Dialog "${p.dialog}" fehlt`);
        if (p.event && !CONTENT.events[p.event]) fehler.push(`Ort ${a.id}: Punkt ${p.id} → Ereignis "${p.event}" fehlt`);
        if (p.ziel && !areas[p.ziel]) fehler.push(`Ort ${a.id}: Punkt ${p.id} → Ort "${p.ziel}" fehlt`);
      }
    }
  }
  return fehler;
}
