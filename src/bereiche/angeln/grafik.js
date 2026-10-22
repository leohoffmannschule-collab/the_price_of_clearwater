// Bereich „angeln" – Pixelkunst: Angel, Fische, Köder und Lenes Fischstand. Die Anzeige beim
// Angeln (Rute, Schnur, Schwimmer, Wellen, Blasenspur, Biss, Fang-Flug) malt anzeige.js.

import { kunst, dekoKunst, P, R, E, L, POLY, kugel, hell, dunkel } from '../../sprites.js';
import './anzeige.js';

kunst({
  angel(g) {
    L(g, 2, 14, 13, 2, '#d8c070', 1); L(g, 3, 14, 13, 3, '#a8903a', 1);
    for (const [x, y] of [[5, 11], [8, 8], [11, 5]]) P(g, x, y, '#7a6a2a');
    R(g, 2, 12, 2, 3, '#7a4a2a');
    L(g, 13, 3, 13, 9, '#e8eef4', 1); E(g, 13, 11, 1.6, 1.6, '#e04040'); P(g, 13, 10, '#ffffff');
  },
  koeder(g) {
    R(g, 3, 8, 10, 6, '#9aa0a8'); R(g, 3, 8, 10, 1, '#c8ccd2'); R(g, 3, 13, 10, 1, '#6a7078');
    L(g, 4, 7, 7, 5, '#e88a9a', 1); L(g, 7, 5, 9, 7, '#e88a9a', 1); L(g, 9, 7, 12, 4, '#d87a8a', 1);
  },
  /** Fisch nach bild.form: flach, aal, tinte, kugel, hoch, lang, klein, wels, sonst normal. */
  fisch(g, b) {
    const f = b.f;
    const bauch = b.f2;
    const auge = (x, y) => { P(g, x, y, '#ffffff'); P(g, x, y + 1, '#141414'); };
    switch (b.form) {
      case 'flach':
        POLY(g, [[2, 8], [8, 3], [13, 8], [8, 13]], f); POLY(g, [[2, 8], [13, 8], [8, 13]], dunkel(f, 0.12));
        POLY(g, [[12, 8], [15, 5], [15, 11]], dunkel(f, 0.25)); auge(6, 6); auge(8, 5);
        break;
      case 'aal': {
        const pts = [[2, 10], [5, 7], [8, 9], [11, 6], [14, 8]];
        for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], f, 3);
        for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, bauch, 1);
        auge(2, 8);
        break;
      }
      case 'tinte':
        E(g, 8, 5, 3.6, 4.6, f); E(g, 7, 4, 1.2, 2.2, hell(f, 0.4));
        for (const x of [5, 7, 9, 11]) L(g, x, 9, x + Math.round(Math.sin(x) * 1.5), 15, dunkel(f, 0.15), 1);
        P(g, 6, 7, '#141414'); P(g, 10, 7, '#141414');
        break;
      case 'kugel':
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          P(g, Math.round(8 + Math.cos(a) * 6.5), Math.round(8 + Math.sin(a) * 6.5), dunkel(f, 0.3));
        }
        kugel(g, 8, 8, 5.4, 5.4, f); E(g, 8, 10.5, 4, 2.4, bauch); auge(5, 6); P(g, 2, 8, f);
        break;
      default: {
        const ry = b.form === 'hoch' ? 4.4 : b.form === 'lang' ? 2.4 : b.form === 'klein' ? 2.4 : 3.3;
        const rx = b.form === 'lang' ? 6.4 : b.form === 'klein' ? 4.2 : 5.2;
        const cx = 7;
        POLY(g, [[cx + rx - 1, 8], [15, 8 - ry - 0.5], [14, 8], [15, 8 + ry + 0.5]], dunkel(f, 0.2));
        POLY(g, [[cx - 2, 8 - ry + 0.5], [cx + 2, 8 - ry - 2], [cx + 3, 8 - ry + 1]], dunkel(f, 0.25));
        E(g, cx, 8, rx, ry, f); E(g, cx, 8 + ry * 0.45, rx - 1, ry * 0.55, bauch);
        L(g, cx - rx + 2, 8 - 1, cx + rx - 2, 8 - 1, hell(f, 0.25), 1);
        auge(cx - rx + 2, 7);
        if (b.form === 'wels') { L(g, cx - rx + 1, 9, 1, 12, '#3a3a30', 1); L(g, cx - rx + 1, 9, 1, 10, '#3a3a30', 1); }
      }
    }
  },
});

/** Lenes Fischstand am Strand. */
dekoKunst('stand', (g) => {
  R(g, 1, 5, 14, 10, '#9a7a4a'); R(g, 1, 5, 14, 1, '#b8945a'); R(g, 2, 6, 12, 4, '#cfe8f2');
  for (const [x, f] of [[3, '#7aa8c8'], [7, '#c86a5a'], [10, '#a89a5a']]) { R(g, x, 7, 3, 2, f); P(g, x + 3, 7, f); }
  R(g, 1, 10, 14, 1, '#6a5030');
});
