// Bereich „wildnis" – Möbel und Zierrat der Innenräume (Fischladen, Hütte von Mats, Ranch, Turm)
// und die Farben dieser Räume. Theke, Tisch, Kamin, Fenster, Bild, Kiste und Topfpflanze sind
// geteilte Deko aus „basis".

import { dekoKunst, innenFarben, P, R, E, L, POLY, kugel, hell } from '../../sprites.js';
import { hash } from '../../zufall.js';

innenFarben('wildnis_fischladen', { tapete: '#a9c4c8', streifen: '#98b6bc', leiste: '#4a5e6a', teppich: '#3d7a96', muster: '#e8f0e8' });
innenFarben('wildnis_huette', { tapete: '#d8c49a', streifen: '#c8b186', leiste: '#6a5238', teppich: '#b8553d', muster: '#f2d99a' });
innenFarben('wildnis_ranch', { tapete: '#e6d3b0', streifen: '#d8c39c', leiste: '#7a3a2c', teppich: '#a8453f', muster: '#f2e0b0' });
innenFarben('wildnis_turm', { tapete: '#8a84a0', streifen: '#7a7490', leiste: '#3a3250', teppich: '#5a3a7a', muster: '#e8c860' });

const BUCH = ['#d8453a', '#3d7dbf', '#4aa86a', '#f2c94c', '#9a4a8a', '#e8a830', '#6a4426'];

dekoKunst({
  // ─── Fischladen ───────────────────────────────────────────────────────────

  wildnis_netzwand: {
    b: (d) => (d.w || 2) * 16, h: 16, umriss: false,
    malen(g, d, { w }) {
      for (let x = 2; x < w - 2; x += 3) L(g, x, 1, x, 12 + Math.floor(hash(x, 2, 3) * 3), '#6a98a8', 1);
      for (let y = 3; y < 13; y += 3) R(g, 2, y, w - 4, 1, '#7aa8b8');
      for (const x of [5, 14, 23]) if (x < w - 3) { E(g, x, 11, 1.8, 2.2, '#e04a3a'); R(g, x, 9, 1, 2, '#2b1d1c'); }
      E(g, w - 6, 12, 2.4, 1.6, '#e8c34a'); P(g, w - 8, 12, '#2b1d1c');
    },
  },
  wildnis_haengelampe: {
    h: 16, umriss: false,
    malen(g, d, { nacht }) {
      R(g, 8, 0, 1, 4, '#2e2e36'); R(g, 5, 4, 7, 2, '#2e2e36'); R(g, 6, 6, 5, 5, nacht ? '#ffe28a' : '#e8e0c0'); R(g, 7, 7, 3, 3, nacht ? '#ffffff' : '#f8f0d8'); R(g, 5, 11, 7, 1, '#2e2e36');
    },
  },
  wildnis_tafel: {
    b: (d) => (d.w || 2) * 16, h: 16, umriss: false,
    malen(g, d, { w }) {
      R(g, 1, 1, w - 2, 13, '#3a2a20'); R(g, 2, 2, w - 4, 11, '#2e4a3a');
      for (let y = 4; y < 12; y += 3) R(g, 4, y, w - 12, 1, '#d8d8c8');
      E(g, w - 8, 8, 4, 2.4, '#f4f0e8'); POLY(g, [[w - 4, 8], [w - 1, 5], [w - 1, 11]], '#f4f0e8'); P(g, w - 11, 7, '#2e4a3a');
      R(g, 1, 13, w - 2, 1, '#6a4426');
    },
  },
  wildnis_regal: {
    b: (d) => (d.w || 2) * 16, h: 32, schatten: [14, 2, 0],
    malen(g, d, { w }) {
      R(g, 1, 4, w - 2, 28, '#7a5230'); R(g, 1, 4, w - 2, 2, '#a07848'); R(g, 3, 8, w - 6, 20, '#4a3020');
      for (const y of [16, 24]) R(g, 2, y, w - 4, 2, '#8a5a32');
      const f = ['#e8c34a', '#4a78b0', '#e04a3a', '#7cc25a', '#d8d0b0', '#9a6ad8'];
      for (let i = 0; i < w - 8; i += 6) { const k = Math.floor(hash(i, 1, 9) * 6); R(g, 4 + i, 11, 4, 5, f[k]); P(g, 5 + i, 10, hell(f[k], 0.4)); R(g, 4 + i, 19, 4, 5, f[(k + 2) % 6]); }
      R(g, 4, 26, 6, 2, '#a89870'); R(g, w - 12, 26, 7, 2, '#5a8a6a');
    },
  },
  wildnis_aquarium: {
    b: (d) => (d.w || 2) * 16, h: 36, schatten: [14, 2, 0], zustand: () => ({}),
    malen(g, d, { w, nacht }) {
      R(g, 1, 14, w - 2, 20, '#4a3020'); R(g, 2, 8, w - 4, 20, '#cfeaf2'); R(g, 3, 9, w - 6, 18, '#6fb8d4');
      R(g, 3, 9, w - 6, 3, '#9ad8ec'); R(g, 3, 24, w - 6, 3, '#d8c08a');
      for (const [x, y] of [[8, 22], [20, 23]]) { L(g, x, y, x, y - 7, '#3a8a5a', 1); L(g, x + 1, y, x + 2, y - 5, '#2f7a4a', 1); }
      for (const [x, y, f] of [[9, 14, '#e8702a'], [18, 18, '#f2d24a'], [w - 10, 13, '#e04a3a']]) { E(g, x, y, 2.6, 1.6, f); POLY(g, [[x + 2, y], [x + 5, y - 2], [x + 5, y + 2]], f); P(g, x - 1, y - 1, '#2b1d1c'); }
      P(g, 14, 12, '#ffffff'); P(g, 15, 10, '#ffffff'); P(g, 25, 15, '#ffffff');
      R(g, 1, 7, w - 2, 2, '#3a2a1a'); R(g, 4, 5, 5, 3, nacht ? '#ffe28a' : '#e8e0c0');
      R(g, 4, 28, w - 8, 1, '#5aa0b8');
    },
  },
  wildnis_angelstaender: {
    h: 36, schatten: [7, 2, 0],
    malen(g) {
      R(g, 2, 28, 12, 5, '#6e4626'); R(g, 3, 20, 10, 9, '#8a5a32'); R(g, 3, 20, 10, 1, '#b07a48');
      for (const [x0, x1, f] of [[4, 2, '#c89a3a'], [7, 8, '#8a6a30'], [10, 14, '#b8803a'], [12, 12, '#6e4626']]) L(g, x0, 22, x1, 1, f, 1);
      P(g, 2, 1, '#e04a3a'); P(g, 14, 1, '#f2d24a'); R(g, 4, 24, 8, 1, '#4a3020');
    },
  },
  wildnis_fischkiste: {
    h: 18, schatten: [7, 2, 0],
    malen(g) {
      R(g, 1, 7, 14, 10, '#a8c0c8'); R(g, 1, 7, 14, 2, '#c8dce2'); R(g, 1, 15, 14, 2, '#7a98a2');
      for (const x of [4, 8, 12]) R(g, x, 9, 1, 6, '#7a98a2');
      E(g, 5, 6, 3, 1.6, '#c8d4dc'); E(g, 11, 5, 3, 1.6, '#b8c4cc'); P(g, 3, 5, '#2b1d1c'); P(g, 9, 4, '#2b1d1c');
      R(g, 6, 5, 2, 1, '#e8506a');
    },
  },
  wildnis_rettungsring: {
    h: 16, umriss: false,
    malen(g) {
      E(g, 8, 8, 6, 6, '#f4f0e8'); E(g, 8, 8, 2.8, 2.8, '#7a98a2');
      for (const [x, y] of [[8, 3], [8, 13], [3, 8], [13, 8]]) R(g, x - 1, y - 1, 3, 3, '#d8453a');
    },
  },
  wildnis_hocker: {
    h: 16, schatten: [5, 2, 0],
    malen(g) {
      L(g, 4, 14, 5, 9, '#6e4626', 1); L(g, 11, 14, 10, 9, '#6e4626', 1); R(g, 8, 9, 1, 5, '#6e4626');
      E(g, 8, 8, 5, 2.6, '#a87848'); E(g, 8, 7, 4, 1.6, '#c8925a');
    },
  },
  wildnis_bett: {
    b: 32, h: 34, flach: true, schatten: [14, 3, -2],
    malen(g) {
      R(g, 1, 4, 30, 30, '#8a5a32'); R(g, 1, 2, 30, 6, '#6e4626'); R(g, 1, 2, 30, 1, '#a87848');
      R(g, 3, 10, 26, 22, '#efe6d6'); R(g, 3, 20, 26, 12, '#5a8ac0'); R(g, 3, 20, 26, 2, '#7aa8d8');
      for (let x = 5; x < 28; x += 6) R(g, x, 24, 1, 8, '#4a78b0');
      E(g, 10, 14, 6, 3.4, '#ffffff'); E(g, 22, 14, 6, 3.4, '#f4eedc');
      R(g, 1, 30, 3, 4, '#5e3a1e'); R(g, 28, 30, 3, 4, '#5e3a1e');
    },
  },

  // ─── Hütte von Mats ───────────────────────────────────────────────────────

  wildnis_leinwand: {
    b: (d) => (d.w || 2) * 16, h: 16, umriss: false,
    malen(g, d, { w }) {
      R(g, 1, 1, w - 2, 13, '#c89a3a'); R(g, 3, 3, w - 6, 9, '#9ad0f0');
      R(g, 3, 8, w - 6, 4, '#3d7dbf'); E(g, 8, 5, 3, 1.6, '#f4f0e8'); E(g, w - 8, 6, 1.6, 1.6, '#f2d24a');
      POLY(g, [[w - 12, 8], [w - 9, 3], [w - 6, 8]], '#e8e0cc'); R(g, w - 9, 3, 1, 5, '#6e4626');
      for (let x = 6; x < w - 8; x += 5) R(g, x, 9, 3, 1, '#f4f0e8');
    },
  },
  wildnis_farbtisch: {
    b: (d) => (d.w || 2) * 16, h: 20, schatten: [12, 2, 0],
    malen(g, d, { w }) {
      R(g, 1, 6, w - 2, 5, '#9a6a3a'); R(g, 1, 6, w - 2, 1, '#c8925a'); R(g, 2, 11, 2, 8, '#6e4626'); R(g, w - 4, 11, 2, 8, '#6e4626');
      for (const [x, f] of [[4, '#d8453a'], [8, '#f2d24a'], [12, '#3d7dbf'], [16, '#4aa86a']]) if (x < w - 6) { R(g, x, 3, 3, 4, '#efe6d6'); R(g, x, 3, 3, 1, f); }
      L(g, w - 8, 5, w - 3, 0, '#8a5a32', 1); R(g, w - 4, 0, 2, 2, '#d8453a');
      E(g, w - 12, 8, 3, 1.4, '#e8e0cc'); P(g, w - 13, 8, '#d8453a'); P(g, w - 11, 8, '#3d7dbf');
    },
  },
  wildnis_leinwandstapel: {
    h: 20, schatten: [7, 2, 0],
    malen(g) {
      R(g, 2, 3, 3, 16, '#c89a3a'); R(g, 5, 4, 3, 15, '#a87848'); R(g, 8, 2, 3, 17, '#d8b070'); R(g, 11, 5, 3, 14, '#8a5a32');
      R(g, 3, 5, 1, 4, '#9ad0f0'); R(g, 6, 6, 1, 5, '#5aa83a'); R(g, 9, 4, 1, 6, '#e8506a'); R(g, 12, 8, 1, 5, '#f2d24a');
    },
  },
  wildnis_ofen: {
    b: (d) => (d.w || 1) * 16, h: 28, schatten: [10, 2, 0],
    malen(g, d, { w, nacht }) {
      R(g, 2, 10, w - 4, 17, '#4a4a54'); R(g, 2, 10, w - 4, 2, '#7a7a86'); R(g, 3, 12, w - 6, 15, '#3a3a42');
      R(g, 5, 16, w - 10, 8, '#1e1410'); R(g, 6, 20, w - 12, 3, nacht ? '#e8702a' : '#c84a2a'); P(g, 8, 19, '#f2c94c');
      R(g, w / 2 - 2, 0, 4, 11, '#3a3a42'); R(g, w / 2 - 3, 0, 6, 2, '#56565e');
      R(g, 3, 25, w - 6, 2, '#2a2a30');
    },
  },
  wildnis_milchkanne: {
    h: 20, schatten: [5, 2, 0],
    malen(g) {
      R(g, 4, 8, 8, 11, '#b8c0c8'); R(g, 4, 8, 3, 11, '#dde2e8'); R(g, 9, 9, 3, 10, '#8a929a'); R(g, 5, 4, 6, 5, '#b8c0c8'); R(g, 3, 3, 10, 2, '#8a929a');
      R(g, 4, 18, 8, 1, '#6a727a'); L(g, 12, 9, 14, 13, '#8a929a', 1); L(g, 3, 9, 1, 13, '#8a929a', 1);
    },
  },

  // ─── Turm ─────────────────────────────────────────────────────────────────

  wildnis_buecherregal: {
    b: (d) => (d.w || 2) * 16, h: 32, umriss: false,
    malen(g, d, { w }) {
      R(g, 1, 1, w - 2, 31, '#5a3a24'); R(g, 3, 3, w - 6, 27, '#2a1a10');
      for (const y of [3, 11, 19]) R(g, 2, y + 7, w - 4, 2, '#7a5230');
      for (let r = 0; r < 3; r++) {
        let x = 4;
        while (x < w - 7) {
          const k = Math.floor(hash(x, r, 4) * 7);
          const bw = 2 + Math.floor(hash(x, r, 5) * 2);
          const bh = 5 + Math.floor(hash(x, r, 6) * 3);
          R(g, x, 3 + r * 8 + 7 - bh, bw, bh, BUCH[k]); R(g, x, 3 + r * 8 + 7 - bh, 1, bh, hell(BUCH[k], 0.3));
          x += bw;
        }
      }
    },
  },
  wildnis_sternkarte: {
    b: (d) => (d.w || 2) * 16, h: 16, umriss: false,
    malen(g, d, { w }) {
      R(g, 1, 1, w - 2, 13, '#d8c49a'); R(g, 2, 2, w - 4, 11, '#1e2a4a');
      for (let i = 0; i < 12; i++) P(g, 3 + Math.floor(hash(i, 1, 6) * (w - 7)), 3 + Math.floor(hash(i, 2, 6) * 8), i % 3 ? '#f2e8a0' : '#ffffff');
      L(g, 6, 5, 12, 8, '#8a8ac8', 1); L(g, 12, 8, 17, 4, '#8a8ac8', 1); L(g, 17, 4, 24, 7, '#8a8ac8', 1);
      E(g, w - 8, 6, 2.6, 2.6, '#f4f0e0'); E(g, w - 7, 6, 2, 2.4, '#1e2a4a');
    },
  },
  wildnis_lesepult: {
    h: 28, schatten: [7, 2, 0],
    malen(g) {
      R(g, 7, 14, 2, 13, '#6e4626'); R(g, 4, 26, 8, 2, '#5e3a1e');
      POLY(g, [[2, 13], [14, 13], [12, 6], [4, 6]], '#8a5a32');
      R(g, 4, 7, 4, 5, '#efe6d6'); R(g, 8, 7, 4, 5, '#f4efdf'); R(g, 7, 7, 1, 5, '#a89870');
      for (const y of [8, 10]) { R(g, 5, y, 2, 1, '#6a5a44'); R(g, 9, y, 2, 1, '#6a5a44'); }
      R(g, 13, 2, 1, 6, '#e8e0c0'); P(g, 13, 1, '#f2c94c');
    },
  },
  wildnis_globus: {
    h: 28, schatten: [7, 2, 0],
    malen(g) {
      L(g, 8, 27, 4, 23, '#6e4626', 1); L(g, 8, 27, 12, 23, '#6e4626', 1); R(g, 7, 20, 2, 6, '#6e4626');
      kugel(g, 8, 11, 7, 7, '#3d7dbf');
      E(g, 6, 9, 3, 2.4, '#5aa83a'); E(g, 10, 13, 2.4, 2, '#5aa83a'); E(g, 5, 14, 1.6, 1.2, '#c8a84a');
      L(g, 2, 5, 14, 17, '#c89a3a', 1);
    },
  },
  wildnis_sternentisch: {
    h: 28, schatten: [8, 2, 0], umriss: true,
    malen(g, d, { nacht }) {
      R(g, 6, 14, 4, 12, '#5a3a7a'); R(g, 3, 25, 10, 3, '#46306a'); E(g, 8, 13, 7, 3, '#7a5a9a'); E(g, 8, 12, 6, 2.2, '#9a7aba');
      E(g, 8, 6, 4, 4, nacht ? '#bff6ff' : '#9ad8e8'); E(g, 7, 5, 1.6, 1.6, '#ffffff'); E(g, 8, 6, 5, 5, 'rgba(160,230,255,0.25)');
      P(g, 2, 3, '#f2e8a0'); P(g, 14, 2, '#f2e8a0'); P(g, 13, 9, '#f2e8a0');
    },
  },
  wildnis_alchemietisch: {
    b: (d) => (d.w || 2) * 16, h: 28, schatten: [12, 2, 0],
    malen(g, d, { w }) {
      R(g, 1, 12, w - 2, 5, '#8a5a32'); R(g, 1, 12, w - 2, 1, '#b07a48'); R(g, 2, 17, 2, 10, '#6e4626'); R(g, w - 4, 17, 2, 10, '#6e4626');
      // Kolben und Gläser
      E(g, 6, 8, 3, 3.4, '#9ae88a'); R(g, 5, 2, 2, 4, '#cfe6ee'); E(g, 6, 9, 1.6, 1.6, '#d8ffc8');
      R(g, 13, 5, 4, 7, '#cfe6ee'); R(g, 13, 8, 4, 4, '#e87ad8'); R(g, 20, 6, 3, 6, '#cfe6ee'); R(g, 20, 9, 3, 3, '#f2d24a');
      R(g, w - 9, 8, 6, 4, '#efe6d6'); R(g, w - 9, 8, 6, 1, '#ffffff'); P(g, w - 7, 9, '#6a5a44'); P(g, w - 5, 10, '#6a5a44');
      L(g, w - 12, 3, w - 12, 12, '#c8ccd8', 1);
    },
  },
  wildnis_buecherstapel: {
    h: 20, schatten: [7, 2, 0],
    malen(g) {
      R(g, 2, 14, 12, 4, '#6a4426'); R(g, 3, 10, 10, 4, '#3d7dbf'); R(g, 4, 7, 9, 3, '#d8453a'); R(g, 3, 4, 8, 3, '#4aa86a');
      for (const y of [15, 11, 8, 5]) R(g, 3, y, 1, 2, '#efe6d6');
      R(g, 11, 3, 3, 1, '#f2c94c');
    },
  },
});

