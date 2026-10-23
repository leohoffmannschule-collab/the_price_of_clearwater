// Bereich „hof" – Pixelkunst: Bodenzeichen des Hofs (Hofkies a, Teichufer b, Gewächshauserde c, Fliesen d)
// und die Innenraumfarben des Gewächshauses.

import { T } from '../../daten.js';
import { bodenKunst, innenFarben, zackenRand, P, R, E } from '../../sprites.js';
import { hash } from '../../zufall.js';

innenFarben('hof_gewaechshaus', { tapete: '#cfe6dc', streifen: '#eef8f2', leiste: '#5c7a68', teppich: '#a8453f', muster: '#e0b060' });

bodenKunst({
  /** Hofkies: helle, unregelmäßige Pflastersteine mit dunklen Fugen; Gras franst am Rand aus. */
  a(g, x0, y0, { tx, ty, winter, gras, nachbarn }) {
    R(g, x0, y0, T, T, winter ? '#a8a8a8' : '#9d927f');
    const farben = winter ? ['#e6eaee', '#dde2e8', '#f0f3f6'] : ['#bdb19c', '#b5a994', '#c4b8a2'];
    for (let r = 0; r < 3; r++) {
      const y = y0 + [0, 5, 11][r];
      const h = [4, 5, 5][r];
      let x = x0 - 2 + Math.floor(hash(tx, ty, r) * 4);
      while (x < x0 + T) {
        const b = 4 + Math.floor(hash(tx * 9 + x, ty * 5 + r, 11) * 4);
        const f = farben[Math.floor(hash(x, y, 3) * 3)];
        const von = Math.max(x, x0);
        const bis = Math.min(x + b - 1, x0 + T);
        if (bis > von) {
          R(g, von, y, bis - von, h, f);
          R(g, von, y, bis - von, 1, winter ? '#ffffff' : '#d4c9b4');
          if (bis - von > 3) P(g, bis - 1, y + h - 1, winter ? '#c4ccd4' : '#a4987f');
        }
        x += b;
      }
    }
    for (const [s, n] of Object.entries(nachbarn)) if (n === '.') zackenRand(g, x0, y0, s, gras.b, tx, ty);
  },

  /** Teichufer: feuchter Sand mit Kieseln, im Winter überfroren. */
  b(g, x0, y0, { tx, ty, winter, gras, nachbarn }) {
    R(g, x0, y0, T, T, winter ? '#d6dde4' : '#b3a47c');
    for (let i = 0; i < 9; i++) {
      const x = x0 + Math.floor(hash(tx, ty, i) * 14);
      const y = y0 + Math.floor(hash(tx, ty, i + 9) * 14);
      R(g, x, y, 2 + (i % 2), 2, winter ? '#c4ced8' : '#968860');
    }
    for (let i = 0; i < 6; i++) {
      const x = x0 + 1 + Math.floor(hash(tx, ty, i + 30) * 13);
      const y = y0 + 1 + Math.floor(hash(tx, ty, i + 40) * 13);
      E(g, x, y, 1.4, 1, winter ? '#f4f7fa' : ['#cfc6b0', '#8c8a86', '#d8d0bc'][i % 3]);
    }
    if (hash(tx, ty, 77) < 0.3) { P(g, x0 + 4, y0 + 12, winter ? '#9aa8b4' : '#5a8a3a'); P(g, x0 + 5, y0 + 11, winter ? '#9aa8b4' : '#5a8a3a'); }
    for (const [s, n] of Object.entries(nachbarn)) if (n === '.') zackenRand(g, x0, y0, s, gras.b, tx, ty);
  },

  /** Gewächshauserde: dunkle, krümelige Erde. */
  c(g, x0, y0, { tx, ty, nachbarn }) {
    R(g, x0, y0, T, T, '#6a4a32');
    for (let i = 0; i < 12; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), '#563a26');
    for (let i = 0; i < 6; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), '#82603e');
    if (hash(tx, ty, 61) < 0.2) { R(g, x0 + 4, y0 + 9, 3, 1, '#7a5a3a'); P(g, x0 + 5, y0 + 8, '#7a5a3a'); }
    // Beetkanten aus Holzbrettern zum Gang hin
    if (nachbarn.w !== 'c') { R(g, x0, y0, 2, T, '#8a5a32'); R(g, x0, y0, 1, T, '#a87848'); }
    if (nachbarn.o !== 'c') { R(g, x0 + 14, y0, 2, T, '#6e4626'); R(g, x0 + 14, y0, 1, T, '#8a5a32'); }
    if (nachbarn.s !== 'c') { R(g, x0, y0 + 14, T, 2, '#6e4626'); R(g, x0, y0 + 14, T, 1, '#8a5a32'); }
    if (nachbarn.n !== 'c') { R(g, x0, y0, T, 2, '#a87848'); R(g, x0, y0, T, 1, '#c8986a'); }
  },

  /** Küchenfliesen: helle Quadrate im Schachbrett mit Fuge. */
  d(g, x0, y0, { tx, ty }) {
    R(g, x0, y0, T, T, '#b8ac98');
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const heller = (tx + ty + i + j) % 2 === 0;
        R(g, x0 + i * 8, y0 + j * 8, 7, 7, heller ? '#ebe2d0' : '#dfd5c0');
        R(g, x0 + i * 8, y0 + j * 8, 7, 1, heller ? '#f8f1e2' : '#e9dfcb');
      }
    }
  },

  /**
   * Wände im Wohnhaus (def.rand 'hof_haus'): die Tapetenwand wie im Kern, aber Trennwände und Außenkanten als
   * dunkles Holz mit hellen Kanten zum Raum hin statt als schwarze Fläche.
   */
  '#:hof_haus'(g, x0, y0, { tx, ty, innen, nachbarn }) {
    const t = innen || { tapete: '#d7b98c', streifen: '#c9a676', leiste: '#7a4e2c' };
    if (nachbarn.s !== '#' && ty > 0) {
      R(g, x0, y0, T, T, t.tapete);
      for (let i = 0; i < 4; i++) R(g, x0 + i * 4 + 1, y0, 1, 13, t.streifen);
      R(g, x0, y0 + 12, T, 4, t.leiste); R(g, x0, y0 + 12, T, 1, '#9a6a3a');
      R(g, x0, y0, T, 1, '#b89a70');
      return;
    }
    R(g, x0, y0, T, T, '#3c281e');
    for (let i = 0; i < 4; i++) R(g, x0 + 2 + i * 4, y0, 1, T, '#2e1e16');
    for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 5) * 16), '#4a3226');
    if (nachbarn.n !== '#') { R(g, x0, y0, T, 2, '#6a4a36'); R(g, x0, y0 + 2, T, 1, '#2a1a12'); }
    if (nachbarn.w !== '#') { R(g, x0, y0, 2, T, '#6a4a36'); }
    if (nachbarn.o !== '#') { R(g, x0 + 14, y0, 2, T, '#241610'); }
  },

  /** Glaswände im Gewächshaus (def.rand 'hof_glas'): Scheiben in hellen Rahmen, unten ein Backsteinsockel. */
  '#:hof_glas'(g, x0, y0, { tx, ty, nachbarn }) {
    const vorn = nachbarn.s !== '#' && ty > 0;
    const hoehe = vorn ? 12 : T;
    const glas = vorn ? ['#a6dccd', '#8ec8b8'] : ['#7fb8a8', '#6aa292'];
    R(g, x0, y0, T, T, '#5e8878');
    R(g, x0, y0, T, hoehe / 2, glas[0]); R(g, x0, y0 + hoehe / 2, T, hoehe - hoehe / 2, glas[1]);
    for (let i = 0; i < 2; i++) {
      const dx = x0 + 3 + i * 8;
      for (let j = 0; j < 4; j++) P(g, dx + j, y0 + 7 - j * 2 + (hoehe < T ? 0 : 2), vorn ? '#e4faf2' : '#a8d8c8');
    }
    for (let i = 0; i < 5; i++) P(g, x0 + 2 + Math.floor(hash(tx, ty, i) * 12), y0 + 2 + Math.floor(hash(tx, ty, i + 9) * Math.max(1, hoehe - 4)), vorn ? '#bfe6da' : '#8cc0b0');
    R(g, x0, y0, 1, hoehe, '#f1efe6'); R(g, x0 + 8, y0, 1, hoehe, '#f1efe6'); R(g, x0 + 1, y0, 1, hoehe, '#c4cfc6');
    R(g, x0, y0, T, 1, '#f1efe6');
    if (vorn) {
      R(g, x0, y0 + 11, T, 1, '#f1efe6');
      R(g, x0, y0 + 12, T, 4, '#a8604a'); R(g, x0, y0 + 12, T, 1, '#c8806a');
      for (let i = 0; i < 2; i++) R(g, x0 + (tx % 2 ? 4 : 0) + i * 8, y0 + 13, 1, 3, '#7a3e2e');
      R(g, x0, y0 + 14, T, 1, '#8a4a38');
    } else {
      if (nachbarn.n !== '#') R(g, x0, y0, T, 2, '#f1efe6');
      if (nachbarn.w !== '#') R(g, x0, y0, 2, T, '#f1efe6');
      if (nachbarn.o !== '#') { R(g, x0 + 14, y0, 2, T, '#c4cfc6'); R(g, x0 + 15, y0, 1, T, '#8aa092'); }
    }
  },
});
