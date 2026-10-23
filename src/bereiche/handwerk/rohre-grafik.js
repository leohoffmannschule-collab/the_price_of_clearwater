// Bereich „handwerk" – Pixelkunst der Holzrohre: das Item und der Belag, der sich mit Nachbarrohren verbindet.

import { kunst, belagKunst, R } from '../../sprites.js';

const HELL = '#b98a56';
const MITTE = '#98693a';
const DUNKEL = '#6a4527';
const RING = '#3e3a40';
const LOCH = '#2a1c12';

/** Waagerechtes Rohrstück von x0 bis x1 (ausschließlich x1), auf Höhe y. */
function waagerecht(g, x0, x1, y) {
  R(g, x0, y, x1 - x0, 6, MITTE);
  R(g, x0, y, x1 - x0, 1, HELL);
  R(g, x0, y + 5, x1 - x0, 1, DUNKEL);
}
function senkrecht(g, y0, y1, x) {
  R(g, x, y0, 6, y1 - y0, MITTE);
  R(g, x, y0, 1, y1 - y0, HELL);
  R(g, x + 5, y0, 1, y1 - y0, DUNKEL);
}

kunst('holzrohr', (g) => {
  waagerecht(g, 1, 15, 5);
  R(g, 4, 5, 1, 6, RING); R(g, 11, 5, 1, 6, RING);
  R(g, 1, 6, 1, 4, LOCH); R(g, 14, 6, 1, 4, LOCH);
  waagerecht(g, 5, 11, 9);
  R(g, 5, 9, 6, 1, MITTE);
});

belagKunst('holzrohr', (g, k) => {
  const { n, o, s, w } = k;
  senkrecht(g, 5, 11, 5);
  R(g, 5, 5, 6, 6, MITTE);
  R(g, 5, 5, 6, 1, HELL); R(g, 5, 10, 6, 1, DUNKEL);
  if (n) senkrecht(g, 0, 5, 5);
  if (s) senkrecht(g, 11, 16, 5);
  if (w) waagerecht(g, 0, 5, 5);
  if (o) waagerecht(g, 11, 16, 5);
  // Eisenringe an jedem Anschluss, Mitte als Muffe
  if (n) R(g, 5, 3, 6, 1, RING);
  if (s) R(g, 5, 12, 6, 1, RING);
  if (w) R(g, 3, 5, 1, 6, RING);
  if (o) R(g, 12, 5, 1, 6, RING);
  R(g, 6, 6, 4, 4, DUNKEL); R(g, 7, 7, 2, 2, MITTE);
  // freie Enden zeigen ein dunkles Loch
  if (!n && !s && !w && !o) R(g, 7, 7, 2, 2, LOCH);
});
