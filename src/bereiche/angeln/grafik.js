// Bereich „angeln" – Pixelkunst: Ruten, Köder und Lenes Fischstand. Die Fische malt grafik-fische.js,
// Krebskorb, Krebstiere und Müll grafik-korb.js; die Anzeige beim Angeln (Rute, Schnur, Schwimmer,
// Wellen, Blasenspur, Biss, Fang-Flug) anzeige.js.

import { kunst, dekoKunst, P, R, E, L, dunkel } from '../../sprites.js';
import './anzeige.js';
import './grafik-fische.js';
import './grafik-korb.js';

kunst({
  /** Rute: f Schaft, f2 Glanz, griff, rolle, faden (Bambus ohne Angaben). */
  angel(g, b) {
    const schaft = b.f ?? '#d8c070';
    const schatten = b.f ? dunkel(b.f, 0.3) : '#a8903a';
    L(g, 2, 14, 13, 2, schaft, 1); L(g, 3, 14, 13, 3, schatten, 1);
    if (!b.f) for (const [x, y] of [[5, 11], [8, 8], [11, 5]]) P(g, x, y, '#7a6a2a');
    else for (const [x, y] of [[6, 10], [9, 7]]) P(g, x, y, b.f2);
    R(g, 2, 12, 2, 3, b.griff ?? '#7a4a2a');
    E(g, 5, 12, 1.4, 1.4, b.rolle ?? '#8a9098'); P(g, 5, 12, dunkel(b.rolle ?? '#8a9098', 0.4));
    L(g, 13, 3, 13, 9, b.faden ?? '#e8eef4', 1); E(g, 13, 11, 1.6, 1.6, '#e04040'); P(g, 13, 10, '#ffffff');
  },
  /** Köder: Blechdose mit Würmern. */
  koeder(g) {
    R(g, 3, 8, 10, 6, '#9aa0a8'); R(g, 3, 8, 10, 1, '#c8ccd2'); R(g, 3, 13, 10, 1, '#6a7078');
    L(g, 4, 7, 7, 5, '#e88a9a', 1); L(g, 7, 5, 9, 7, '#e88a9a', 1); L(g, 9, 7, 12, 4, '#d87a8a', 1);
  },
  /** Wildköder: Holzschale mit Würmern und Waldkräutern. */
  wildkoeder(g) {
    E(g, 8, 11, 6, 3.2, '#8a5a32'); E(g, 8, 10, 5, 1.6, '#4a2e1a'); R(g, 3, 12, 10, 1, '#6a4224');
    L(g, 4, 9, 6, 6, '#e88a9a', 1); L(g, 6, 6, 8, 8, '#e88a9a', 1);
    L(g, 9, 9, 11, 6, '#5a9a3a', 1); P(g, 12, 5, '#7aba4a'); P(g, 10, 6, '#7aba4a');
    E(g, 11, 8, 1.2, 1, '#c84a5a'); P(g, 11, 7, '#f0a0a8');
  },
  /** Magnetköder: rot-silberner Hufeisenmagnet mit Funken. */
  magnetkoeder(g) {
    // Hufeisen: zwei Schenkel und ein Bogen unten (Ring aus zwei Ellipsen, Pixel für Pixel)
    for (let y = 2; y < 15; y++) for (let x = 1; x < 15; x++) {
      const au = ((x + 0.5 - 8) / 5.4) ** 2 + ((y + 0.5 - 8.5) / 5) ** 2;
      const in_ = ((x + 0.5 - 8) / 2.3) ** 2 + ((y + 0.5 - 8.5) / 2.2) ** 2;
      const schenkel = y < 9 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12));
      const bogen = y >= 8 && au <= 1 && in_ > 1;
      if (!schenkel && !bogen) continue;
      const hellPx = x === 3 || (bogen && y === 9 && x < 8) || (bogen && x === 4 && y > 8);
      P(g, x, y, y < 5 ? (x === 3 || x === 10 ? '#ffffff' : '#c8ccd4') : hellPx ? '#f07a6a' : x >= 11 || y >= 13 ? '#a82a2a' : '#d83a3a');
    }
    for (const [x, y] of [[7, 1], [8, 3], [9, 1]]) P(g, x, y, '#ffe060');
  },
});

/** Lenes Fischstand am Strand. */
dekoKunst('stand', (g) => {
  R(g, 1, 5, 14, 10, '#9a7a4a'); R(g, 1, 5, 14, 1, '#b8945a'); R(g, 2, 6, 12, 4, '#cfe8f2');
  for (const [x, f] of [[3, '#7aa8c8'], [7, '#c86a5a'], [10, '#a89a5a']]) { R(g, x, 7, 3, 2, f); P(g, x + 3, 7, f); }
  R(g, 1, 10, 14, 1, '#6a5030');
});

