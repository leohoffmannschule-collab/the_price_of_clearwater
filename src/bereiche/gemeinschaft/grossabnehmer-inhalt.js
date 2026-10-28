// Bereich „gemeinschaft" – Großabnehmer: Dankesbriefe und das System (Zustand, Hooks). Zahlen: grossabnehmer-daten.js,
// Regeln: grossabnehmer.js, Fenster: grossabnehmer-fenster.js, Kunst: grossabnehmer-kunst.js.

import { brief } from '../../daten.js';
import { system } from '../../system.js';
import { FIRMEN, FIRMEN_IDS, DANK } from './grossabnehmer-daten.js';
import { zustand, aktualisieren, versandAbzug, tagWechsel, briefeZustellen } from './grossabnehmer.js';

// Zwei Fassungen je Firma; der Kern findet sie über das Präfix der Instanz-ID („grossdank-baufirma-a_17").
for (const f of FIRMEN_IDS) {
  DANK[f].forEach((text, i) => brief(`grossdank-${f}-${'ab'[i]}`, { von: FIRMEN[f].kontakt, text }));
}

system({
  name: 'gemeinschaft-grossabnehmer',
  ergaenzen(s) {
    zustand(s);
  },
  neuesSpiel(s) {
    aktualisieren(s);
  },
  /** Vor dem nächtlichen Verkauf: Ware der offenen Verträge aus der Versandkiste (nach den Rohren und der Fabrik). */
  vorVerkauf(s, bericht) {
    versandAbzug(s, bericht);
  },
  tagEnde(s, bericht) {
    tagWechsel(s, bericht);
  },
  morgen(s) {
    briefeZustellen(s);
  },
});
