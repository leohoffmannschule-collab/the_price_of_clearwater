// Bereich „handwerk" – Pixelkunst des Räucherofens: Gegenstand, aufgestellter Ofen (leer, räuchernd mit
// Glut und Rauch aus dem Schornstein, fertig mit Blase, im Winter mit Schnee) und Geräucherter Fisch.

import { kunst, objektKunst, P, R, E, L, POLY, mische, hell, dunkel, HOLZ } from '../../sprites.js';

const STEIN = '#9a8f84';
const STEIN_H = '#b4aa9e';
const STEIN_D = '#6e665e';
const FUGE = '#7a7066';
const EISEN = '#4a4a52';

/** Ofen in 16×24: Schornstein oben rechts, gemauerter Korpus mit Eisentür. `glut` zeigt Feuer in der Tür. */
function ofen(g, { glut = false, winter = false } = {}) {
  // Schornstein
  R(g, 10, 3, 4, 8, STEIN); R(g, 10, 3, 1, 8, STEIN_H); R(g, 13, 3, 1, 8, STEIN_D);
  R(g, 9, 1, 6, 2, STEIN_D); R(g, 9, 1, 6, 1, STEIN);
  for (const y of [5, 8]) R(g, 11, y, 2, 1, FUGE);
  // Korpus
  R(g, 2, 10, 12, 12, STEIN); R(g, 2, 10, 12, 1, STEIN_H); R(g, 2, 20, 12, 2, STEIN_D);
  R(g, 1, 9, 14, 2, STEIN_D); R(g, 1, 9, 14, 1, STEIN);
  for (const y of [13, 16, 19]) R(g, 2, y, 12, 1, FUGE);
  for (const [x, y] of [[4, 11], [9, 11], [12, 14], [3, 14], [10, 17], [4, 20], [8, 20]]) R(g, x, y, 1, 2, FUGE);
  // Tür mit Eisenrahmen und Lüftungsschlitzen
  R(g, 4, 13, 8, 7, EISEN); R(g, 5, 14, 6, 5, glut ? '#2a1610' : '#2a2420');
  R(g, 4, 13, 8, 1, '#6a6a74');
  if (glut) {
    R(g, 6, 17, 4, 2, '#e8702a'); R(g, 7, 17, 2, 1, '#f6c04a'); P(g, 6, 15, '#f08a3a'); P(g, 9, 14, '#f6c04a');
  } else {
    for (const y of [15, 17]) R(g, 6, y, 4, 1, '#3a342e');
  }
  P(g, 11, 16, '#c8ccd2'); // Griff
  if (winter) {
    R(g, 1, 8, 14, 1, '#ffffff'); R(g, 2, 7, 6, 1, '#ffffff'); R(g, 9, 0, 6, 1, '#ffffff'); R(g, 10, 1, 4, 1, '#e4ebf1');
  }
}

/** Kleiner Ofen für das Gegenstandsbild (16×16). */
function ofenKlein(g) {
  R(g, 9, 1, 3, 6, STEIN); R(g, 9, 1, 1, 6, STEIN_H); R(g, 8, 0, 5, 2, STEIN_D);
  R(g, 2, 6, 12, 9, STEIN); R(g, 2, 6, 12, 1, STEIN_H); R(g, 1, 5, 14, 2, STEIN_D); R(g, 1, 5, 14, 1, STEIN);
  R(g, 2, 13, 12, 2, STEIN_D);
  for (const y of [9, 12]) R(g, 2, y, 12, 1, FUGE);
  R(g, 4, 8, 8, 6, EISEN); R(g, 5, 9, 6, 4, '#2a1610'); R(g, 6, 11, 4, 2, '#e8702a'); R(g, 7, 11, 2, 1, '#f6c04a');
  R(g, 4, 8, 8, 1, '#6a6a74');
}

/** Fisch am Stab in geräucherter Tönung (Farbe des Fischs, dunkler und goldbraun). */
function geraeuchert(g, b) {
  const f = b.f || '#a88a5a';
  const haut = mische(f, '#8a5a2a', 0.6);
  const bauch = mische(b.f2 || f, '#e0a850', 0.6);
  L(g, 1, 13, 14, 3, HOLZ, 1);
  POLY(g, [[11, 9], [15, 6], [15, 12]], dunkel(haut, 0.2));
  E(g, 7, 9, 5.5, 3.2, haut);
  E(g, 7, 10.4, 4.6, 1.5, bauch);
  R(g, 5, 7, 5, 1, hell(haut, 0.25));
  P(g, 3, 8, '#141414');
  for (let i = 0; i < 3; i++) P(g, 6 + i * 2, 9, dunkel(haut, 0.3)); // Seitenlinie
  for (const [x, y] of [[4, 3], [5, 1], [3, 5]]) P(g, x, y, '#cfc8c0'); // Rauchfäden
}

kunst({
  raeucherofen: ofenKlein,
  geraeuchert,
});

/** Rauch: kleine graue Wölkchen steigen über dem Schornstein auf, versetzt und verblassend. */
function rauch(g, o, lage, k) {
  const t = k.t || 0;
  g.save();
  for (let i = 0; i < 3; i++) {
    const p = ((t * 0.45 + i / 3) % 1);
    const x = lage.x + 11.5 + Math.sin((t + i * 2.1) * 1.7) * 1.6 + p * 2.5;
    const y = lage.y + 1 - p * 11;
    const r = 1.4 + p * 1.6;
    g.globalAlpha = 0.85 * (1 - p * 0.8);
    g.fillStyle = k.nacht ? '#9aa0ac' : '#d8d8dc';
    g.fillRect(Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
  }
  g.restore();
}

/** Aufgestellter Ofen: Glut in der Tür, solange etwas räuchert; Blase mit Fisch, wenn Fertiges wartet. */
objektKunst('raeucherofen', {
  b: 16, h: 24,
  schluessel: (o, k) => {
    const ein = (o.ein || []).some((x) => x.n > 0);
    const aus = (o.aus || []).some((x) => x.n > 0);
    return `${aus ? 'fertig' : ein ? 'arbeit' : 'leer'}${ein ? '+' : ''}:${k?.jz === 'winter' ? 'w' : 's'}`;
  },
  malen(g, o, k) {
    const ein = (o.ein || []).some((x) => x.n > 0);
    const aus = (o.aus || []).some((x) => x.n > 0);
    ofen(g, { glut: ein, winter: k?.jz === 'winter' });
    if (aus) {
      R(g, 0, 0, 9, 8, '#e8c870'); R(g, 1, 1, 7, 6, '#f6ecc8');
      E(g, 4.5, 3.6, 2.4, 1.4, '#a8723a'); POLY(g, [[6, 3.6], [8, 2], [8, 5]], '#8a5a2a'); P(g, 3, 3, '#141414');
      P(g, 3, 8, '#e8c870'); P(g, 4, 8, '#e8c870');
    }
  },
  danach(g, o, lage, k) {
    if ((o.ein || []).some((x) => x.n > 0)) rauch(g, o, lage, k);
  },
});
