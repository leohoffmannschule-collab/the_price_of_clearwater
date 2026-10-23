// Bereich „dorf" – Pixelkunst der Innenräume: Farben, Möbel (Lampe, Hocker, Billard, Esse, Schreibtisch,
// Vitrinen …) und die Bodenzeichen des Dorfs (Blumenwiese, Kies, Friedhofserde, Zierpflaster).

import { dekoKunst, innenFarben, bodenKunst, grasKachel, P, R, E, L, POLY, hell } from '../../sprites.js';
import { hash } from '../../zufall.js';

innenFarben('schmiede', { tapete: '#8a8480', streifen: '#7c7672', leiste: '#3a3430', teppich: '#5a4a44', muster: '#a89a90' });
innenFarben('rathaus', { tapete: '#c9b88e', streifen: '#bba97c', leiste: '#4a3a52', teppich: '#7a2f3f', muster: '#e8c870' });
innenFarben('arzt', { tapete: '#d4e6e0', streifen: '#c4dad2', leiste: '#4f7a76', teppich: '#6a9a98', muster: '#e8f2ee' });
innenFarben('museum', { tapete: '#d9d2c0', streifen: '#cbc4b0', leiste: '#5a4a6a', teppich: '#5a4a7a', muster: '#d8c070' });
innenFarben('wohnhaus', { tapete: '#f0cfd0', streifen: '#e6bfc2', leiste: '#7a4a52', teppich: '#c0707a', muster: '#fbe8d8' });
innenFarben('muehle', { tapete: '#b79a72', streifen: '#a68a62', leiste: '#5a4028', teppich: '#7a6a52', muster: '#c8b48a' });

// ─── Bodenzeichen ───────────────────────────────────────────────────────────

bodenKunst({
  /** Blumenwiese: Gras mit vielen bunten Blüten. */
  f(g, x0, y0, k) {
    grasKachel(g, x0, y0, k.jz, k.tx, k.ty);
    if (k.winter) return;
    const farben = { fruehling: ['#f4f0f8', '#f2a0c0', '#f2d24a'], sommer: ['#e8506a', '#f2d24a', '#8a5ad8', '#f4f0f8'], herbst: ['#d8742f', '#b8452f', '#f2c94c'] }[k.jz];
    for (let i = 0; i < 6; i++) {
      const x = x0 + 1 + Math.floor(hash(k.tx, k.ty, i + 100) * 13);
      const y = y0 + 2 + Math.floor(hash(k.tx, k.ty, i + 120) * 12);
      const f = farben[Math.floor(hash(k.tx, k.ty, i + 140) * farben.length)];
      P(g, x, y, f); P(g, x - 1, y + 1, f); P(g, x + 1, y + 1, f); P(g, x, y + 2, f); P(g, x, y + 1, '#f2d24a');
    }
  },
  /** Kies: helle Körnchen, Wege im Friedhof und im Garten. */
  g(g, x0, y0, { tx, ty, winter }) {
    R(g, x0, y0, 16, 16, winter ? '#dcdad6' : '#c8c0b0');
    for (let i = 0; i < 16; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), winter ? '#c4c2be' : ['#b0a898', '#d8d0c0', '#a89e8e'][i % 3]);
    for (let i = 0; i < 4; i++) { const x = x0 + Math.floor(hash(tx, ty, i + 60) * 14); const y = y0 + Math.floor(hash(tx, ty, i + 70) * 14); R(g, x, y, 2, 1, winter ? '#ffffff' : '#e8e2d4'); }
  },
  /** Friedhofserde: dunkles Gras mit Moos. */
  i(g, x0, y0, k) {
    grasKachel(g, x0, y0, k.jz, k.tx, k.ty);
    if (!k.winter) { R(g, x0, y0, 16, 16, 'rgba(40,50,60,0.12)'); for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(k.tx, k.ty, i + 200) * 16), y0 + Math.floor(hash(k.tx, k.ty, i + 210) * 16), '#4a6a3a'); }
  },
  /** Zierpflaster um den Brunnen: helle und dunkle Steine im Rautenmuster. */
  j(g, x0, y0, { tx, ty, winter }) {
    R(g, x0, y0, 16, 16, '#8b857c');
    const hell1 = winter ? '#e4e8ec' : '#c4bdb0';
    const dunkel1 = winter ? '#cdd4da' : '#a39c8e';
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const f = (r + c + tx + ty) % 2 ? hell1 : dunkel1;
      R(g, x0 + c * 8 + 1, y0 + r * 8 + 1, 7, 7, f);
      R(g, x0 + c * 8 + 1, y0 + r * 8 + 1, 7, 1, hell(f, 0.3));
    }
    P(g, x0 + 8, y0 + 8, '#f2c94c');
  },
});

// ─── Möbel ──────────────────────────────────────────────────────────────────

const HOLZ_M = '#a8784a';
const HOLZ_H = '#c8986a';
const HOLZ_S = '#6e4626';

dekoKunst({
  dorf_lampe: {
    umriss: false,
    malen(g, d, { nacht }) {
      R(g, 7, 0, 2, 5, '#3a3a40');
      R(g, 4, 5, 8, 2, '#3a3a40'); POLY(g, [[3, 12], [13, 12], [11, 7], [5, 7]], nacht ? '#ffe28a' : '#e8dcc0');
      R(g, 3, 12, 10, 1, '#3a3a40');
      if (nacht) { P(g, 7, 9, '#ffffff'); P(g, 8, 9, '#fff3b0'); }
    },
  },
  dorf_hocker(g) {
    E(g, 8, 8, 5, 2.6, HOLZ_H); E(g, 8, 8, 4, 1.8, HOLZ_M); R(g, 4, 9, 8, 1, HOLZ_S);
    R(g, 4, 10, 1, 5, HOLZ_S); R(g, 11, 10, 1, 5, HOLZ_S); R(g, 7, 10, 1, 4, HOLZ_S);
  },
  dorf_tafel: {
    b: 16, h: 24,
    malen(g, d) {
      L(g, 3, 23, 5, 14, HOLZ_S, 1); L(g, 12, 23, 10, 14, HOLZ_S, 1);
      R(g, 1, 3, 14, 13, HOLZ_M); R(g, 2, 4, 12, 11, '#2f4a3a'); R(g, 2, 4, 12, 1, '#4a6a54');
      for (let i = 0; i < 4; i++) R(g, 3, 6 + i * 2, 4 + Math.floor(hash(d.x, d.y, i) * 7), 1, '#e8e4d0');
      R(g, 3, 15, 3, 1, '#f6efdc'); P(g, 11, 12, '#e8c040'); P(g, 12, 12, '#e8c040');
    },
  },
  dorf_billard: {
    h: 32,
    malen(g, d, { w }) {
      R(g, 1, 12, w - 2, 16, '#5a3a22'); R(g, 1, 12, w - 2, 2, HOLZ_M);
      R(g, 3, 14, w - 6, 11, '#3f8a5a'); R(g, 3, 14, w - 6, 1, '#5ca878');
      for (const x of [2, w - 5]) R(g, x, 27, 3, 5, '#3a2616');
      for (const [x, y, f] of [[12, 19, '#d8403a'], [15, 17, '#f2d24a'], [17, 20, '#3a6aa8'], [14, 21, '#f6efdc'], [33, 19, '#e88a2a']]) { E(g, x, y, 1.3, 1.3, f); P(g, x - 1, y - 1, '#ffffff'); }
      L(g, 24, 24, w - 8, 15, '#d8b070', 1); P(g, 24, 24, '#6a4426');
      for (const [x, y] of [[3, 14], [w - 4, 14], [3, 24], [w - 4, 24]]) R(g, x, y, 2, 2, '#1c1410');
    },
  },
  dorf_werkzeugwand: {
    umriss: false,
    malen(g, d, { w }) {
      R(g, 0, 2, w, 12, '#4a3a30'); R(g, 0, 2, w, 1, '#6a5a4a');
      for (let x = 4; x < w - 4; x += 10) {
        const t = (x / 10) | 0;
        R(g, x, 4, 2, 7, '#8a5a32');
        if (t % 3 === 0) { R(g, x - 2, 3, 6, 3, '#8a8a96'); R(g, x - 2, 3, 6, 1, '#c0c0cc'); }
        else if (t % 3 === 1) { L(g, x, 3, x + 3, 12, '#8a8a96', 1); L(g, x + 4, 3, x + 1, 12, '#8a8a96', 1); }
        else { R(g, x - 1, 3, 4, 3, '#6a6a76'); R(g, x, 2, 2, 1, '#8a8a96'); }
      }
    },
  },
  dorf_esse: {
    h: 32,
    malen(g) {
      R(g, 1, 4, 30, 28, '#6a6460'); for (let y = 6; y < 30; y += 5) for (let x = 2 + ((y / 5) % 2) * 3; x < 30; x += 7) R(g, x, y, 6, 4, '#7a746e');
      R(g, 0, 2, 32, 4, '#3a3634'); R(g, 4, 0, 8, 3, '#2e2a28');
      R(g, 5, 12, 22, 17, '#1e1612'); R(g, 6, 13, 20, 1, '#3a2c24');
      E(g, 16, 26, 8, 3.4, '#e8602a'); E(g, 16, 25, 6, 2.6, '#f29a3a'); E(g, 16, 24, 3.4, 2, '#fff0a0');
      R(g, 8, 20, 3, 3, '#e8602a'); P(g, 10, 19, '#f2c94c'); R(g, 21, 21, 3, 2, '#e8602a');
      R(g, 4, 28, 24, 2, '#4a4a54');
    },
  },
  dorf_schreibtisch: {
    h: 24,
    malen(g, d, { w }) {
      R(g, 0, 8, w, 6, '#7a4e2c'); R(g, 0, 8, w, 1, '#9a6a3a'); R(g, 1, 14, w - 2, 9, '#5a3a22');
      R(g, w - 14, 15, 11, 7, '#6a4426'); R(g, w - 13, 17, 9, 1, '#9a6a3a'); R(g, w - 13, 20, 9, 1, '#9a6a3a');
      R(g, 5, 12, 12, 1, '#2b1d1c');
      R(g, 6, 5, 12, 4, '#f6efdc'); R(g, 8, 4, 12, 4, '#fbf8ee'); L(g, 9, 6, 18, 6, '#8a8a96', 1);
      R(g, w - 12, 5, 3, 4, '#2a2a40'); L(g, w - 11, 5, w - 8, 0, '#e8e0d0', 1);
      R(g, 24, 6, 5, 3, '#3a6a4a'); R(g, 24, 5, 5, 1, '#e8c040');
    },
  },
  dorf_ratstisch: {
    h: 24,
    malen(g, d, { w }) {
      R(g, 0, 8, w, 6, '#3f6a4a'); R(g, 0, 8, w, 1, '#5a8a62'); R(g, 0, 13, w, 3, '#2a4a32');
      R(g, 2, 16, 3, 7, '#5a3a22'); R(g, w - 5, 16, 3, 7, '#5a3a22'); R(g, w / 2 - 1, 16, 3, 7, '#5a3a22');
      for (const x of [8, 30, 54, 76]) { if (x + 9 > w) continue; R(g, x, 5, 9, 4, '#f6efdc'); L(g, x + 1, 7, x + 7, 7, '#8a8a96', 1); }
      R(g, w / 2 - 3, 2, 6, 6, '#a05a38'); R(g, w / 2 - 4, 2, 8, 1, '#c07a50');
      R(g, 18, 3, 2, 5, '#d8d0b8'); P(g, 18, 2, '#e8c040');
    },
  },
  dorf_wappen: {
    umriss: false,
    malen(g) {
      L(g, 3, 4, 28, 4, '#6a4a2e', 1);
      POLY(g, [[6, 6], [26, 6], [26, 19], [16, 27], [6, 19]], '#2f5a9a');
      POLY(g, [[8, 8], [24, 8], [24, 18], [16, 25], [8, 18]], '#3a6ab0');
      for (const y of [12, 16, 20]) L(g, 9, y, 23, y, '#e8f0f8', 1);
      R(g, 6, 6, 20, 1, '#e8c040'); P(g, 16, 27, '#e8c040');
      E(g, 16, 14, 3, 2.4, '#e8c040');
    },
  },
  dorf_fahne: {
    b: 16, h: 32,
    malen(g) {
      R(g, 3, 4, 2, 28, HOLZ_S); E(g, 4, 3, 2, 2, '#e8c040'); R(g, 1, 29, 6, 3, '#4a3a2a');
      R(g, 5, 5, 9, 12, '#3a6ab0'); R(g, 5, 5, 9, 1, '#5a8ad0'); POLY(g, [[5, 17], [14, 17], [14, 20], [9, 17]], '#3a6ab0');
      L(g, 6, 9, 13, 9, '#f6efdc', 1); L(g, 6, 12, 13, 12, '#f6efdc', 1);
    },
  },
  dorf_medschrank: {
    b: 16, h: 24,
    malen(g) {
      R(g, 2, 2, 12, 22, '#eceae4'); R(g, 2, 2, 12, 1, '#fff'); R(g, 13, 3, 1, 21, '#b8b4a8'); R(g, 7, 3, 1, 20, '#c8c4b8');
      R(g, 3, 5, 3, 4, '#a8d0e8'); R(g, 9, 5, 3, 4, '#a8d0e8'); R(g, 3, 5, 3, 1, '#d8f0f8');
      R(g, 3, 13, 4, 3, '#d8403a'); R(g, 4, 12, 2, 5, '#d8403a'); R(g, 3, 14, 4, 1, '#d8403a');
      R(g, 9, 14, 3, 5, '#f2c94c'); R(g, 6, 12, 1, 3, '#a0a0a8'); R(g, 6, 19, 1, 3, '#a0a0a8');
    },
  },
  dorf_liege: {
    h: 24,
    malen(g, d, { w }) {
      R(g, 1, 12, w - 2, 7, '#e8f2ee'); R(g, 1, 12, w - 2, 1, '#ffffff'); R(g, 1, 17, w - 2, 2, '#b8d0c8');
      R(g, 2, 7, 7, 5, '#a8c8c0'); R(g, 2, 7, 7, 1, '#c8e0d8');
      R(g, 2, 19, 2, 5, '#6a6a74'); R(g, w - 4, 19, 2, 5, '#6a6a74');
    },
  },
  dorf_skelett: {
    b: 16, h: 32,
    malen(g) {
      L(g, 8, 3, 8, 8, '#8a8a92', 1);
      R(g, 3, 29, 10, 3, '#5a3a22'); R(g, 7, 12, 2, 17, '#7a5232');
      E(g, 8, 8, 3.4, 3.6, '#f2eee0'); R(g, 6, 7, 1, 2, '#2b1d1c'); R(g, 9, 7, 1, 2, '#2b1d1c'); R(g, 7, 11, 3, 1, '#f2eee0'); P(g, 8, 10, '#8a8a82');
      R(g, 6, 14, 5, 1, '#f2eee0'); R(g, 6, 17, 5, 1, '#f2eee0'); R(g, 6, 20, 5, 1, '#f2eee0'); R(g, 7, 13, 2, 12, '#e8e4d4');
      L(g, 5, 14, 3, 22, '#f2eee0', 1); L(g, 11, 14, 13, 22, '#f2eee0', 1);
      L(g, 7, 25, 5, 29, '#f2eee0', 1); L(g, 9, 25, 11, 29, '#f2eee0', 1);
      R(g, 4, 3, 8, 2, '#d8403a'); R(g, 6, 1, 4, 3, '#d8403a');
    },
  },
  dorf_waage: {
    b: 16, h: 24,
    malen(g) {
      R(g, 4, 20, 8, 3, '#5a5a64'); R(g, 7, 6, 2, 15, '#8a8a92'); R(g, 5, 3, 7, 4, '#e8e4d8'); R(g, 6, 4, 3, 1, '#2b1d1c');
      R(g, 9, 9, 5, 1, '#6a6a74'); R(g, 13, 8, 1, 3, '#d8403a'); R(g, 9, 13, 4, 1, '#6a6a74'); R(g, 12, 12, 1, 3, '#3a6aa8');
    },
  },
  dorf_vitrine: {
    h: 28,
    zustand: (d) => ({ v: (d.x * 3 + d.y * 5) % 4 }),
    malen(g, d, { w, zustand }) {
      R(g, 1, 20, w - 2, 8, '#5a3a5a'); R(g, 1, 20, w - 2, 1, '#8a5a8a'); R(g, 3, 23, w - 6, 1, '#7a4a7a');
      R(g, 2, 3, w - 4, 17, 'rgba(198,230,242,0.55)'); R(g, 2, 3, w - 4, 1, '#e8f6fc'); R(g, 2, 3, 1, 17, '#e8f6fc'); R(g, w - 3, 3, 1, 17, '#9ac0d0');
      R(g, 2, 17, w - 4, 3, '#4a3050');
      switch (zustand.v) {
        case 0: for (const [x, y] of [[7, 14], [13, 12], [19, 14], [24, 11]]) { E(g, x, y, 2.4, 2.4, '#e8c040'); P(g, x - 1, y - 1, '#fff3b0'); } break;
        case 1: for (const [x, y] of [[8, 14], [15, 13], [23, 14]]) { E(g, x, y, 3, 2.4, '#f0d0c0'); L(g, x - 2, y, x + 2, y, '#d09a8a', 1); } break;
        case 2: POLY(g, [[6, 16], [12, 16], [10, 9], [7, 11]], '#b87848'); POLY(g, [[16, 16], [26, 16], [22, 10]], '#9a6a4a'); R(g, 8, 11, 1, 3, '#d8a070'); break;
        default: L(g, 8, 16, 8, 8, '#ece6d0', 2); E(g, 8, 7, 2, 1.6, '#ece6d0'); L(g, 14, 16, 22, 9, '#ece6d0', 2); R(g, 22, 8, 4, 2, '#ece6d0');
      }
    },
  },
  dorf_fossil: {
    h: 32,
    malen(g, d, { w }) {
      R(g, 1, 24, w - 2, 8, '#6a6a74'); R(g, 1, 24, w - 2, 1, '#8a8a96');
      for (const x of [8, 20, 32]) R(g, x, 18, 1, 6, '#8a8a92');
      const bein = '#ece6d0';
      for (let i = 0; i < 6; i++) { const x = 12 + i * 4; L(g, x, 14, x - 2, 20, bein, 1); }
      L(g, 9, 13, 36, 11, bein, 2);
      L(g, 36, 12, 44, 15, bein, 2); L(g, 9, 14, 3, 20, bein, 2);
      E(g, 6, 8, 5, 3.4, bein); R(g, 2, 9, 7, 2, bein); for (let x = 2; x < 8; x += 2) P(g, x, 11, '#2b1d1c'); P(g, 7, 6, '#2b1d1c');
      L(g, 6, 11, 10, 14, bein, 2);
    },
  },
  dorf_lesepult: {
    b: 16, h: 24,
    malen(g) {
      R(g, 6, 14, 4, 9, HOLZ_S); R(g, 3, 21, 10, 3, '#5a3a22');
      POLY(g, [[2, 12], [14, 12], [13, 6], [3, 6]], '#7a4e2c');
      R(g, 3, 6, 5, 6, '#f6efdc'); R(g, 8, 6, 5, 6, '#fbf8ee'); R(g, 8, 6, 1, 6, '#c8c0a8'); for (const y of [8, 10]) { L(g, 4, y, 7, y, '#8a8a96', 1); L(g, 9, y, 12, y, '#8a8a96', 1); }
    },
  },
  dorf_kuechenzeile: {
    h: 28,
    malen(g, d, { w }) {
      R(g, 0, 8, w, 20, '#c8a070'); R(g, 0, 8, w, 3, '#e8dcc8'); R(g, 0, 11, w, 1, '#8a6a42');
      for (let x = 2; x < w - 14; x += 14) { R(g, x, 14, 12, 12, '#b88a58'); R(g, x + 1, 15, 10, 10, '#c8986a'); P(g, x + 9, 19, '#4a3220'); }
      // Spüle
      R(g, 4, 6, 14, 3, '#9ab0b8'); R(g, 6, 6, 10, 2, '#4a8ac2'); R(g, 10, 3, 2, 3, '#8a8a92'); R(g, 9, 3, 4, 1, '#8a8a92');
      // Herdplatte mit Topf
      R(g, w - 18, 7, 16, 3, '#3a3a40'); E(g, w - 14, 6, 3, 1.2, '#1c1c20'); E(g, w - 7, 6, 3, 1.2, '#1c1c20');
      R(g, w - 17, 1, 8, 6, '#a8a8b0'); R(g, w - 17, 1, 8, 1, '#d0d0d8'); R(g, w - 18, 3, 1, 2, '#6a6a74');
      for (const [x, y] of [[w - 15, -1], [w - 13, 0]]) P(g, x, Math.max(y, 0), '#e0e4ea');
      R(g, w - 14, 16, 10, 8, '#5a5a62'); R(g, w - 13, 17, 8, 5, '#2e2e34');
      // Töpfe an der Wand
      for (const x of [26, 32]) { R(g, x, 0, 1, 4, '#6a6a74'); E(g, x, 5, 2, 1.6, '#c8683a'); }
    },
  },
  dorf_esstisch: {
    h: 20,
    malen(g, d, { w }) {
      R(g, 0, 6, w, 5, '#f4d6dc'); R(g, 0, 6, w, 1, '#ffffff'); R(g, 0, 10, w, 2, '#d8a0ac');
      for (let x = 1; x < w; x += 4) R(g, x, 12, 2, 2, '#d8a0ac');
      R(g, 2, 12, 2, 8, HOLZ_S); R(g, w - 4, 12, 2, 8, HOLZ_S);
      E(g, 9, 5, 3, 1.4, '#f6efdc'); R(g, 8, 1, 2, 4, '#4f9a3a'); E(g, 9, 1, 2, 1.6, '#e8506a');
      E(g, 23, 5, 3.4, 1.8, '#d29a5a');
    },
  },
  dorf_sofa: {
    h: 20,
    malen(g, d, { w }) {
      R(g, 1, 6, w - 2, 8, '#c0707a'); R(g, 1, 6, w - 2, 2, '#d8909a'); R(g, 0, 8, 4, 10, '#b0606a'); R(g, w - 4, 8, 4, 10, '#b0606a');
      R(g, 4, 13, w - 8, 5, '#d8808c'); R(g, 4, 13, w - 8, 1, '#e8a0aa'); L(g, w / 2, 13, w / 2, 18, '#b0606a', 1);
      R(g, 3, 18, 2, 2, HOLZ_S); R(g, w - 5, 18, 2, 2, HOLZ_S);
      R(g, 6, 10, 5, 4, '#f2d890'); R(g, 6, 10, 5, 1, '#fff0b0');
    },
  },
  dorf_muehlstein: {
    h: 32,
    zustand: (d, k) => ({ ok: !!k.s?.muehle }),
    malen(g, d, { zustand }) {
      const ok = zustand.ok;
      // Trichter und Mehlkasten
      POLY(g, [[6, 0], [26, 0], [21, 9], [11, 9]], HOLZ_M); R(g, 6, 0, 20, 1, HOLZ_H); R(g, 11, 9, 10, 2, HOLZ_S);
      if (ok) { E(g, 16, 1, 8, 1.4, '#f6efdc'); }
      // Steine
      R(g, 2, 18, 28, 12, '#8f8981'); R(g, 2, 18, 28, 1, '#b5aea4'); R(g, 2, 29, 28, 3, '#6e6860');
      E(g, 16, 18, 14, 4.6, '#a39c92'); E(g, 16, 17, 12, 3.6, '#b9b2a6');
      for (let a = 0; a < 7; a++) L(g, 16, 17, Math.round(16 + Math.cos(a) * 11), Math.round(17 + Math.sin(a) * 3), '#8f8981', 1);
      R(g, 14, 10, 4, 7, '#6a4426'); R(g, 14, 10, 1, 7, '#8a5a32');
      if (ok) { R(g, 6, 28, 8, 2, '#f6efdc'); R(g, 20, 27, 6, 3, '#f6efdc'); P(g, 10, 26, '#f6efdc'); }
      else { L(g, 8, 17, 14, 20, '#4a4a54', 1); L(g, 20, 16, 24, 21, '#4a4a54', 1); for (const [x, y] of [[4, 20], [27, 21]]) { L(g, x, y, x + 2, y + 5, '#d8d4cc', 1); } }
    },
  },
  dorf_buendeltafel: {
    b: 16, h: 24,
    zustand: (d, k) => ({ ok: !!k.s?.muehle }),
    malen(g, d, { zustand }) {
      R(g, 2, 14, 2, 10, HOLZ_S); R(g, 12, 14, 2, 10, HOLZ_S);
      R(g, 1, 2, 14, 13, HOLZ_M); R(g, 1, 2, 14, 1, HOLZ_H); R(g, 1, 14, 14, 1, HOLZ_S);
      R(g, 3, 4, 10, 9, '#f6efdc');
      for (let i = 0; i < 4; i++) { R(g, 4, 5 + i * 2, 4, 1, '#8a8a96'); P(g, 10, 5 + i * 2, zustand.ok || i < 2 ? '#4f9a3a' : '#d8403a'); P(g, 11, 5 + i * 2, zustand.ok || i < 2 ? '#4f9a3a' : '#d8403a'); }
    },
  },
});

