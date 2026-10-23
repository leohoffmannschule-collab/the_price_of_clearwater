// Bereich „wildnis" – Bodenkacheln: Brandung (l), Waldboden (n), Kies (o), Felsplatte (p), Moos (q).

import { bodenKunst, zackenRand, P, R, E, mische, hell, dunkel } from '../../sprites.js';
import { hash } from '../../zufall.js';

const T = 16;
const streu = (g, x0, y0, tx, ty, n, f, s, breit = 1, hoch = 1) => {
  for (let i = 0; i < n; i++) R(g, x0 + Math.floor(hash(tx, ty, i + s) * (T - breit)), y0 + Math.floor(hash(tx, ty, i + s + 40) * (T - hoch)), breit, hoch, f);
};
const NASS = { sommer: '#cdb88a', fruehling: '#cdb88a', herbst: '#c2ac7c', winter: '#c6c4b8' };

bodenKunst({
  /** Nasser Sand mit Schaumsaum: unten (Richtung Meer) hell und zackig, oben fließend in den trockenen Sand. */
  l(g, x0, y0, { tx, ty, jz, winter, nachbarn }) {
    const nass = NASS[jz];
    R(g, x0, y0, T, T, nass);
    streu(g, x0, y0, tx, ty, 8, dunkel(nass, 0.1), 3, 2, 1);
    streu(g, x0, y0, tx, ty, 4, hell(nass, 0.35), 20, 1, 1);
    if (nachbarn.n !== '~' && nachbarn.n !== 'l') zackenRand(g, x0, y0, 'n', winter ? '#e4e2d6' : '#ead6a2', tx, ty);
    const meer = nachbarn.s === '~' || nachbarn.s === 'h';
    if (meer) {
      // nasser Streifen und Schaumsaum
      R(g, x0, y0 + 10, T, 6, dunkel(nass, 0.14));
      for (let i = 0; i < T; i++) {
        const t = 1 + Math.floor(hash(tx * 3 + i, ty, 7) * 3);
        R(g, x0 + i, y0 + 16 - t, 1, t, '#f4fbff');
      }
      R(g, x0, y0 + 11, T, 1, mische(nass, '#7a5a3a', 0.3));
    } else if (nachbarn.s === 'l') {
      R(g, x0, y0 + 13, T, 1, dunkel(nass, 0.08));
    }
    if (nachbarn.w === 's' || nachbarn.w === '.') R(g, x0, y0, 1, T, hell(nass, 0.18));
  },

  /** Waldboden: Laub, Nadeln, Erde. Im Herbst bunt, im Winter mit Schnee getupft. */
  n(g, x0, y0, { tx, ty, jz, winter, gras, nachbarn }) {
    const basis = { fruehling: '#6e5a38', sommer: '#65522f', herbst: '#7a5a34', winter: '#8a8478' }[jz];
    R(g, x0, y0, T, T, basis);
    const laub = { fruehling: ['#5f8a3a', '#8a6a3a'], sommer: ['#4f7a30', '#7a5a2e'], herbst: ['#c8782a', '#a8452a', '#e8b040'], winter: ['#f2f6fa', '#b8c2cc'] }[jz];
    for (let i = 0; i < 9; i++) {
      const x = x0 + Math.floor(hash(tx, ty, i) * 14);
      const y = y0 + Math.floor(hash(tx, ty, i + 9) * 14);
      R(g, x, y, 2, 1, laub[i % laub.length]);
      if (i % 3 === 0) P(g, x + 1, y + 1, dunkel(basis, 0.2));
    }
    for (let i = 0; i < 5; i++) {
      const x = x0 + Math.floor(hash(tx, ty, i + 30) * 14);
      const y = y0 + Math.floor(hash(tx, ty, i + 40) * 14);
      P(g, x, y, dunkel(basis, 0.3)); P(g, x + 1, y + 1, dunkel(basis, 0.3));
    }
    if (hash(tx, ty, 99) < 0.12) { P(g, x0 + 5, y0 + 6, '#9a3a2a'); P(g, x0 + 5, y0 + 7, '#efe6d6'); }
    for (const [s, n] of Object.entries(nachbarn)) if (n === '.') zackenRand(g, x0, y0, s, gras.b, tx, ty);
  },

  /** Kies am Ufer und rund um den Turm. */
  o(g, x0, y0, { tx, ty, winter, gras, nachbarn }) {
    const basis = winter ? '#b9b8b0' : '#a8a08e';
    R(g, x0, y0, T, T, basis);
    for (let i = 0; i < 12; i++) {
      const x = x0 + Math.floor(hash(tx, ty, i) * 14);
      const y = y0 + Math.floor(hash(tx, ty, i + 12) * 14);
      const f = [hell(basis, 0.25), dunkel(basis, 0.2), '#c8bea8', '#8a8274'][i % 4];
      R(g, x, y, 2, 2, f); P(g, x, y, hell(f, 0.3));
    }
    streu(g, x0, y0, tx, ty, 6, dunkel(basis, 0.12), 60);
    for (const [s, n] of Object.entries(nachbarn)) {
      if (n === '.' || n === 'n') zackenRand(g, x0, y0, s, n === '.' ? gras.b : '#65522f', tx, ty);
      if (n === '~') R(g, x0 + (s === 'w' ? 0 : s === 'o' ? 13 : 0), y0 + (s === 'n' ? 0 : s === 's' ? 13 : 0), s === 'w' || s === 'o' ? 3 : T, s === 'n' || s === 's' ? 3 : T, dunkel(basis, 0.25));
    }
    if (winter) for (let i = 0; i < 6; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 70) * 16), y0 + Math.floor(hash(tx, ty, i + 80) * 16), '#ffffff');
  },

  /** Glatte Felsplatte: Risse, Flechten, Gezeitentümpel am Rand zum Wasser. */
  p(g, x0, y0, { tx, ty, winter, nachbarn }) {
    const basis = winter ? '#a4a6a8' : '#8f8a82';
    R(g, x0, y0, T, T, basis);
    streu(g, x0, y0, tx, ty, 10, hell(basis, 0.14), 5, 3, 1);
    streu(g, x0, y0, tx, ty, 8, dunkel(basis, 0.16), 25, 2, 1);
    if (hash(tx, ty, 3) < 0.5) {
      const x = x0 + 2 + Math.floor(hash(tx, ty, 4) * 8);
      const y = y0 + 3 + Math.floor(hash(tx, ty, 5) * 8);
      R(g, x, y, 5, 1, dunkel(basis, 0.35)); R(g, x + 4, y + 1, 3, 1, dunkel(basis, 0.35)); P(g, x + 6, y + 2, dunkel(basis, 0.35));
    }
    if (!winter && hash(tx, ty, 8) < 0.3) { E(g, x0 + 4 + Math.floor(hash(tx, ty, 9) * 8), y0 + 4 + Math.floor(hash(tx, ty, 10) * 8), 2, 1.3, '#8aa860'); }
    for (const [s, n] of Object.entries(nachbarn)) {
      if (n === '~') {
        const nass = dunkel(basis, 0.32);
        if (s === 'n') R(g, x0, y0, T, 3, nass);
        if (s === 's') R(g, x0, y0 + 13, T, 3, nass);
        if (s === 'w') R(g, x0, y0, 3, T, nass);
        if (s === 'o') R(g, x0 + 13, y0, 3, T, nass);
      }
      if (n === 's') zackenRand(g, x0, y0, s, '#ead6a2', tx, ty);
      if (n === 'l') zackenRand(g, x0, y0, s, '#cdb88a', tx, ty);
    }
  },

  /** Dichtes Moos mit Klee, Tupfen und seltenen Leuchtsporen. */
  q(g, x0, y0, { tx, ty, jz, winter, nachbarn }) {
    const basis = winter ? '#6a8a7c' : { fruehling: '#4a7a3e', sommer: '#3f7038', herbst: '#58702e' }[jz];
    R(g, x0, y0, T, T, basis);
    for (let i = 0; i < 14; i++) {
      const x = x0 + Math.floor(hash(tx, ty, i) * 14);
      const y = y0 + Math.floor(hash(tx, ty, i + 14) * 14);
      E(g, x + 1, y + 1, 1.6, 1.2, i % 3 ? hell(basis, 0.14) : dunkel(basis, 0.2));
    }
    if (winter) streu(g, x0, y0, tx, ty, 8, '#ffffff', 50);
    if (hash(tx, ty, 5) < 0.1) {
      const x = x0 + 3 + Math.floor(hash(tx, ty, 6) * 9);
      const y = y0 + 3 + Math.floor(hash(tx, ty, 7) * 9);
      P(g, x, y, '#b6f08a'); P(g, x + 1, y, '#8ad06a');
    }
    for (const [s, n] of Object.entries(nachbarn)) if (n === '#') zackenRand(g, x0, y0, s, dunkel(basis, 0.45), tx, ty);
  },
});
