// Bereich „dorf" – Pixelkunst der Deko im Freien: Wegweiser, Marktstände, Mülltonne, Statue, Spielplatz,
// Gemeinschaftsgarten, Friedhof, Heu und Picknick.

import { dekoKunst, P, R, E, L, POLY, hell, dunkel, mische, LAUB, BLATT_D } from '../../sprites.js';
import { hash } from '../../zufall.js';

const HOLZ_M = '#a8784a';
const HOLZ_H = '#c8986a';
const HOLZ_S = '#6e4626';
const EISEN = '#4a4a54';
const STEIN = '#9a948a';

dekoKunst({
  // ─── Platz und Straßen ────────────────────────────────────────────────────
  dorf_wegweiser: {
    b: 16, h: 32,
    malen(g, d, { winter }) {
      R(g, 7, 6, 3, 26, HOLZ_S); R(g, 7, 6, 1, 26, HOLZ_M);
      const brett = (y, links, f) => {
        if (links) POLY(g, [[1, y], [12, y], [12, y + 5], [1, y + 5], [-1, y + 2.5]], f);
        else POLY(g, [[4, y], [15, y], [17, y + 2.5], [15, y + 5], [4, y + 5]], f);
        R(g, links ? 3 : 5, y + 2, 7, 1, dunkel(f, 0.45));
      };
      brett(5, false, HOLZ_H); brett(11, true, HOLZ_M); brett(17, false, HOLZ_H);
      if (winter) R(g, 5, 4, 8, 1, '#ffffff');
    },
  },
  dorf_marktstand: {
    h: 40,
    zustand: (d) => ({ art: (d.art ?? 0) % 6 }),
    malen(g, d, { w, zustand, winter }) {
      const art = zustand.art;
      const tuch = [['#d8403a', '#f6efdc'], ['#4f9a58', '#f6efdc'], ['#3a6aa8', '#f6efdc'], ['#e8b830', '#f6efdc'], ['#e07a30', '#f0e4c8'], ['#8a5aa8', '#f0e4c8']][art];
      R(g, 2, 10, 3, 30, HOLZ_S); R(g, w - 5, 10, 3, 30, HOLZ_S);
      // Theke
      R(g, 0, 27, w, 13, HOLZ_M); R(g, 0, 27, w, 2, HOLZ_H); R(g, 0, 38, w, 2, HOLZ_S);
      for (let x = 6; x < w; x += 8) R(g, x, 30, 1, 8, HOLZ_S);
      // Ware
      const ware = [
        () => { for (let x = 4; x < w - 6; x += 7) { R(g, x, 22, 6, 5, '#7a5230'); E(g, x + 2, 21, 2.4, 2.4, '#d8403a'); E(g, x + 5, 21, 2.2, 2.2, '#e88a3a'); P(g, x + 1, 20, '#f08a8a'); } },
        () => { for (let x = 5; x < w - 8; x += 9) { E(g, x + 4, 24, 4.5, 2.6, '#b8783a'); E(g, x + 4, 23, 4, 2, '#d29a5a'); L(g, x + 2, 22, x + 4, 24, '#f2d4a0', 1); } },
        () => { for (let x = 4; x < w - 5; x += 5) { L(g, x + 1, 26, x + 1, 19, '#3f7a3a', 1); E(g, x + 1, 18, 2, 2, ['#e8506a', '#f2d24a', '#c070e0', '#f4f0f8'][(x / 5) % 4 | 0]); } },
        () => { for (let x = 5; x < w - 9; x += 11) { E(g, x + 4, 24, 5, 2.2, '#8aa4b8'); POLY(g, [[x + 8, 24], [x + 12, 21], [x + 12, 27]], '#8aa4b8'); P(g, x + 2, 23, '#1c2a3a'); R(g, x + 1, 25, 6, 1, '#d8e4ec'); } },
        () => { for (let x = 5; x < w - 8; x += 9) { E(g, x + 3, 23, 3.4, 3.4, '#c8683a'); R(g, x + 1, 19, 4, 2, '#a85030'); E(g, x + 7, 24, 2.2, 2.4, '#d88a58'); } },
        () => { for (let x = 4; x < w - 8; x += 8) { R(g, x, 20, 6, 7, ['#c0405a', '#4a7ac0', '#e8c040', '#5aa070'][(x / 8) % 4 | 0]); R(g, x, 20, 6, 1, '#ffffff'); P(g, x + 3, 23, '#ffffff'); } },
      ][art];
      ware();
      // Stoffdach mit Zacken
      R(g, 0, 4, w, 8, tuch[0]);
      for (let x = 0; x < w; x += 6) R(g, x, 4, 3, 8, tuch[1]);
      for (let x = 0; x < w; x += 6) { POLY(g, [[x, 12], [x + 3, 12], [x + 1.5, 15]], tuch[1]); POLY(g, [[x + 3, 12], [x + 6, 12], [x + 4.5, 15]], tuch[0]); }
      R(g, 0, 4, w, 1, hell(tuch[0], 0.3));
      if (winter) R(g, 0, 3, w, 2, '#ffffff');
    },
  },
  dorf_muelltonne(g, d, { winter }) {
    R(g, 4, 5, 8, 10, '#7a8890'); R(g, 4, 5, 2, 10, '#9aa8b0'); R(g, 10, 5, 2, 10, '#5a6870');
    for (let x = 7; x < 11; x += 2) R(g, x, 7, 1, 7, '#5a6870');
    R(g, 3, 3, 10, 3, '#6a7880'); R(g, 3, 3, 10, 1, '#9aa8b0'); R(g, 7, 2, 2, 1, '#4a5860');
    if (winter) R(g, 3, 2, 10, 1, '#ffffff');
  },
  dorf_statue: {
    b: 16, h: 32,
    malen(g, d, { winter }) {
      R(g, 2, 24, 12, 8, '#a8a29a'); R(g, 2, 24, 12, 1, '#c8c2b8'); R(g, 3, 27, 10, 5, '#8f8981'); R(g, 4, 28, 8, 1, '#6e6860');
      R(g, 6, 12, 4, 12, '#7aa090'); R(g, 5, 13, 1, 8, '#7aa090'); R(g, 10, 13, 1, 6, '#7aa090');
      E(g, 8, 9, 3, 3.2, '#8ab0a0'); R(g, 6, 6, 4, 2, '#6a8e80'); P(g, 7, 9, '#4a6a5e');
      R(g, 4, 17, 3, 4, '#c8b080'); R(g, 4, 17, 3, 1, '#e8d0a0');
      for (const [x, y] of [[3, 29], [11, 26], [7, 20]]) P(g, x, y, '#5f8f50');
      if (winter) { R(g, 6, 5, 4, 2, '#ffffff'); R(g, 2, 23, 12, 1, '#ffffff'); }
    },
  },
  dorf_kohlehaufen(g) {
    E(g, 8, 11, 7, 4, '#26262c'); E(g, 7, 9, 5, 3.5, '#33333a');
    for (const [x, y] of [[4, 10], [8, 7], [11, 11], [6, 12], [9, 9]]) { R(g, x, y, 2, 2, '#4a4a54'); P(g, x, y, '#6a6a76'); }
  },
  dorf_holzstapel(g, d, { winter }) {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - (r === 2 ? 1 : 0); i++) {
      const x = 2 + i * 4 + (r === 2 ? 2 : 0) + (r === 1 ? 0 : 0);
      const y = 12 - r * 4;
      E(g, x + 2, y, 2.2, 2.2, '#b8864e'); E(g, x + 2, y, 1.2, 1.2, '#d8aa6c'); P(g, x + 2, y, '#8a5a32');
    }
    R(g, 1, 13, 14, 2, '#6a4426');
    if (winter) R(g, 1, 3, 14, 2, '#ffffff');
  },
  dorf_staffelei: {
    b: 16, h: 24,
    malen(g) {
      L(g, 3, 23, 6, 4, HOLZ_S, 1); L(g, 13, 23, 10, 4, HOLZ_S, 1); L(g, 8, 23, 8, 6, '#8a5a32', 1);
      R(g, 2, 5, 12, 10, '#f4ecd8'); R(g, 2, 5, 12, 1, '#fff'); R(g, 2, 14, 12, 1, '#c8c0a8');
      R(g, 3, 6, 10, 4, '#9ad0f0'); R(g, 3, 10, 10, 4, '#6fae48'); E(g, 10, 8, 1.6, 1.6, '#f2d24a'); R(g, 5, 9, 2, 3, '#a8784a');
      R(g, 5, 15, 6, 1, '#8a5a32');
    },
  },
  // ─── Spielplatz ───────────────────────────────────────────────────────────
  dorf_schaukel: {
    h: 32,
    malen(g, d, { w }) {
      R(g, 1, 3, w - 2, 3, '#3a6aa8'); R(g, 1, 3, w - 2, 1, '#5a8ac8');
      L(g, 3, 5, 1, 30, '#3a6aa8', 2); L(g, 3, 5, 6, 30, '#3a6aa8', 2); L(g, w - 4, 5, w - 2, 30, '#3a6aa8', 2); L(g, w - 4, 5, w - 7, 30, '#3a6aa8', 2);
      for (const x of [w / 2 - 8, w / 2 + 6]) {
        const cx = Math.round(x);
        L(g, cx, 6, cx, 22, '#8a8a92', 1); L(g, cx + 5, 6, cx + 5, 22, '#8a8a92', 1);
        R(g, cx - 1, 22, 8, 3, '#c8683a'); R(g, cx - 1, 22, 8, 1, '#e8885a');
      }
    },
  },
  dorf_rutsche: {
    h: 32,
    malen(g) {
      R(g, 3, 10, 9, 2, HOLZ_M); R(g, 3, 10, 9, 1, HOLZ_H);
      R(g, 3, 12, 2, 18, HOLZ_S); R(g, 10, 12, 2, 18, HOLZ_S);
      for (let y = 15; y < 30; y += 4) R(g, 4, y, 7, 1, HOLZ_M);
      POLY(g, [[11, 10], [14, 10], [30, 28], [26, 28]], '#e8b830');
      L(g, 12, 9, 28, 27, '#c89020', 1);
      R(g, 3, 4, 2, 7, '#c8683a'); R(g, 3, 4, 9, 2, '#c8683a'); R(g, 10, 4, 2, 7, '#c8683a');
    },
  },
  dorf_wippe: {
    h: 16,
    malen(g, d, { w }) {
      POLY(g, [[w / 2 - 4, 15], [w / 2 + 4, 15], [w / 2, 8]], '#6a6a74');
      POLY(g, [[3, 10], [w - 3, 4], [w - 3, 7], [3, 13]], '#c0405a');
      L(g, 3, 11, w - 3, 5, '#e0607a', 1);
      R(g, 4, 6, 1, 5, EISEN); R(g, w - 5, 2, 1, 5, EISEN);
    },
  },
  dorf_sandkasten: {
    h: 32,
    malen(g, d, { w }) {
      R(g, 0, 8, w, 24, HOLZ_M); R(g, 0, 8, w, 2, HOLZ_H); R(g, 0, 30, w, 2, HOLZ_S);
      R(g, 3, 12, w - 6, 16, '#ead6a2');
      for (let i = 0; i < 14; i++) P(g, 4 + Math.floor(hash(d.x, d.y, i) * (w - 8)), 13 + Math.floor(hash(d.x, d.y, i + 20) * 14), '#d6c08a');
      POLY(g, [[12, 26], [24, 26], [21, 17], [15, 17]], '#e0cb92'); R(g, 15, 14, 6, 3, '#e0cb92'); R(g, 17, 11, 2, 3, '#c8683a'); R(g, 17, 11, 4, 2, '#d8403a');
      R(g, 32, 21, 5, 5, '#d8403a'); R(g, 32, 21, 5, 1, '#f06a5a'); R(g, 38, 18, 1, 9, '#4a7ac0'); R(g, 37, 17, 3, 2, '#4a7ac0');
    },
  },
  dorf_klettergeruest: {
    h: 32,
    malen(g) {
      for (const x of [2, 28]) R(g, x, 6, 3, 26, HOLZ_S);
      R(g, 0, 4, 32, 3, HOLZ_M); R(g, 0, 4, 32, 1, HOLZ_H);
      for (let x = 7; x < 28; x += 4) L(g, x, 7, x, 30, '#c8b890', 1);
      for (let y = 10; y < 30; y += 4) R(g, 5, y, 22, 1, '#c8b890');
      R(g, 4, 1, 24, 3, '#3a6aa8'); POLY(g, [[2, 4], [30, 4], [24, 0], [8, 0]], '#d8403a');
    },
  },
  // ─── Gemeinschaftsgarten ──────────────────────────────────────────────────
  dorf_beet: {
    h: 24,
    zustand: (d) => ({ art: (d.art ?? 0) % 4 }),
    malen(g, d, { w, jz, zustand }) {
      R(g, 0, 11, w, 13, '#6a4426'); R(g, 0, 11, w, 2, '#8a5a32'); R(g, 0, 22, w, 2, '#4e3018');
      for (let x = 2; x < w - 1; x += 4) R(g, x, 14, 1, 7, '#523520');
      if (jz === 'winter') { R(g, 0, 10, w, 3, '#ffffff'); for (let x = 3; x < w; x += 6) { L(g, x, 14, x, 9, '#8a7a5a', 1); } return; }
      for (let x = 3; x < w - 2; x += 5) {
        const farbe = jz === 'herbst';
        switch (zustand.art) {
          case 0: E(g, x + 1, 13, 3, 3, farbe ? '#c8803a' : '#7cc25a'); E(g, x, 12, 1.6, 1.4, farbe ? '#e8a05a' : '#a0dc7a'); break;
          case 1: L(g, x, 14, x - 1, 9, BLATT_D, 1); L(g, x, 14, x + 2, 9, BLATT_D, 1); L(g, x + 1, 14, x + 1, 8, '#4f9a3a', 1); P(g, x + 1, 15, '#e88a2a'); break;
          case 2: L(g, x + 1, 19, x + 1, 5, '#8a5a32', 1); E(g, x + 1, 9, 2.4, 3, '#4f9a3a'); P(g, x, 10, '#d8302a'); P(g, x + 2, 12, '#d8302a'); P(g, x, 14, '#d8302a'); break;
          default: L(g, x + 1, 19, x + 1, 4, '#3f7a3a', 1); E(g, x + 1, 4, 3, 3, '#f2c030'); E(g, x + 1, 4, 1.4, 1.4, '#5a3a22'); break;
        }
      }
    },
  },
  dorf_vogelscheuche: {
    b: 16, h: 32,
    malen(g, d, { winter }) {
      R(g, 7, 8, 2, 24, HOLZ_S); R(g, 1, 13, 14, 2, HOLZ_S);
      R(g, 4, 14, 8, 9, '#4a6aa8'); R(g, 4, 14, 8, 1, '#6a8ac8'); R(g, 6, 17, 2, 2, '#e8c040'); R(g, 9, 20, 2, 2, '#e8c040');
      for (const x of [1, 14]) { R(g, x, 15, 1, 3, '#e8c870'); R(g, x - 1, 17, 1, 2, '#e8c870'); }
      E(g, 8, 10, 3, 3, '#e8c870'); P(g, 7, 9, '#2b1d1c'); P(g, 9, 9, '#2b1d1c'); R(g, 7, 12, 3, 1, '#a04030');
      R(g, 4, 7, 8, 2, '#5a3a22'); R(g, 6, 3, 4, 5, '#5a3a22');
      if (winter) R(g, 4, 6, 8, 1, '#ffffff');
    },
  },
  dorf_regentonne(g, d, { winter }) {
    E(g, 8, 9, 6, 6.5, '#8a5a32'); R(g, 2, 5, 12, 1, EISEN); R(g, 2, 12, 12, 1, EISEN); E(g, 8, 4, 5, 1.6, winter ? '#c8e4f2' : '#4a8ac2');
    L(g, 5, 5, 5, 14, '#6a4426', 1); L(g, 11, 5, 11, 14, '#6a4426', 1);
  },
  dorf_schubkarre(g) {
    POLY(g, [[2, 6], [12, 6], [10, 12], [4, 12]], '#6a8a58'); R(g, 2, 6, 10, 1, '#8aaa78');
    L(g, 12, 7, 15, 10, HOLZ_S, 1); E(g, 4, 13, 2.2, 2.2, '#2b2b32'); P(g, 4, 13, '#8a8a92');
    for (const [x, y] of [[5, 5], [8, 4], [10, 5]]) E(g, x, y, 1.6, 1.4, '#d8403a');
  },
  dorf_mehlsack(g) {
    POLY(g, [[3, 5], [13, 5], [14, 14], [2, 14]], '#e8dcc0'); R(g, 3, 5, 10, 1, '#f6efdc'); R(g, 5, 3, 6, 3, '#e8dcc0'); R(g, 6, 5, 4, 1, '#a07a50');
    L(g, 5, 8, 11, 8, '#c8b890', 1); P(g, 4, 11, '#f6efdc'); P(g, 11, 12, '#f6efdc');
  },
  dorf_heuballen(g) {
    E(g, 8, 8, 7, 7, '#d8b050'); E(g, 8, 8, 5, 5, '#e8c866'); E(g, 8, 8, 3, 3, '#c8a040'); E(g, 8, 8, 1, 1, '#a88030');
    R(g, 1, 13, 14, 2, '#c0983c');
  },
  dorf_picknick: {
    h: 32, flach: true, umriss: false,
    malen(g) {
      POLY(g, [[2, 6], [28, 4], [30, 29], [3, 30]], '#f6efdc');
      for (let y = 5; y < 30; y += 6) for (let x = 3; x < 29; x += 6) if (((x + y) / 6) % 2 | 0) R(g, x, y, 3, 3, '#d8403a');
      for (let y = 8; y < 30; y += 6) for (let x = 6; x < 29; x += 6) if (!(((x + y) / 6) % 2 | 0)) R(g, x, y, 3, 3, '#d8403a');
      E(g, 10, 14, 4.4, 3, '#a8784a'); R(g, 6, 13, 9, 1, '#c8986a'); L(g, 7, 12, 13, 9, HOLZ_S, 1);
      E(g, 22, 20, 2.4, 2.4, '#d8403a'); R(g, 20, 24, 3, 3, '#4a8ac2');
    },
  },
  dorf_kahn: {
    h: 32, umriss: true,
    malen(g, d, { w, winter }) {
      POLY(g, [[2, 14], [w - 2, 14], [w - 8, 28], [8, 28]], '#8a5a32');
      POLY(g, [[2, 14], [w - 2, 14], [w - 3, 17], [3, 17]], '#a87848');
      R(g, 9, 23, w - 18, 1, '#6a4426');
      L(g, 6, 10, 20, 24, '#8a5a32', 2);
      if (winter) R(g, 4, 13, w - 8, 2, '#ffffff');
    },
  },
  // ─── Friedhof ─────────────────────────────────────────────────────────────
  dorf_grabstein: {
    b: 16, h: 24,
    zustand: (d) => ({ art: (d.art ?? 0) % 4 }),
    malen(g, d, { jz, zustand }) {
      const gras = jz === 'winter' ? '#e8f0f4' : '#6f9a50';
      E(g, 8, 20, 6, 2.6, gras); R(g, 3, 20, 10, 3, mische(gras, '#3a2a1c', 0.5));
      switch (zustand.art) {
        case 0: R(g, 4, 6, 8, 14, '#a8a8ae'); E(g, 8, 6, 4, 3, '#a8a8ae'); R(g, 5, 7, 1, 11, '#c8c8d0'); R(g, 6, 9, 4, 1, '#6a6a74'); R(g, 6, 12, 4, 1, '#6a6a74'); break;
        case 1: R(g, 7, 2, 3, 18, '#9a9aa2'); R(g, 3, 6, 11, 3, '#9a9aa2'); R(g, 7, 2, 1, 18, '#c0c0c8'); break;
        case 2: POLY(g, [[5, 20], [11, 20], [10, 5], [8, 2], [6, 5]], '#b0aea8'); R(g, 6, 8, 1, 10, '#d0cec8'); R(g, 7, 12, 3, 1, '#7a7872'); break;
        default: R(g, 3, 13, 10, 7, '#8f8f96'); R(g, 3, 13, 10, 1, '#b0b0b8'); R(g, 4, 10, 8, 4, '#8f8f96'); for (const [x, y] of [[4, 18], [7, 19], [10, 18]]) P(g, x, y, jz === 'winter' ? '#e8f0f4' : ['#e8506a', '#f2d24a', '#f4f0f8'][(x + y) % 3]);
      }
      if (jz === 'winter') R(g, zustand.art === 1 ? 7 : 4, zustand.art === 1 ? 1 : 5, zustand.art === 1 ? 3 : 8, 2, '#ffffff');
    },
  },
  dorf_trauerbaum: {
    b: 48, h: 64,
    malen(g, d, { jz }) {
      const winter = jz === 'winter';
      const l = LAUB[jz] || { d: '#5a4a3a', b: '#6e5c48', h: '#8a7a64' };
      R(g, 21, 24, 6, 40, '#5a3a22'); R(g, 21, 24, 2, 40, '#7a5232'); R(g, 18, 56, 12, 8, '#4a2e18');
      if (!winter) { E(g, 24, 16, 22, 14, l.d); E(g, 23, 14, 19, 11, l.b); E(g, 19, 10, 8, 5, l.h); }
      else { for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.7; L(g, 24, 24, Math.round(24 + Math.cos(a) * 18), Math.round(24 + Math.sin(a) * 16), '#5a4a3a', 2); } }
      for (let i = 0; i < 17; i++) {
        const x = 4 + i * 2.5 + (hash(i, d.x, 3) - 0.5) * 2;
        const kurz = 16 + hash(i, d.y, 4) * 20;
        L(g, Math.round(x), winter ? 14 : 18, Math.round(x + (24 - x) * 0.04), Math.round(18 + kurz), i % 3 ? l.b : l.d, 1);
      }
      if (winter) { E(g, 24, 15, 14, 2.5, '#f2f6fa'); for (let i = 0; i < 6; i++) P(g, 8 + i * 6, 30, '#f2f6fa'); }
    },
  },
  dorf_waescheleine: {
    h: 24,
    malen(g, d, { w, winter }) {
      for (const x of [1, w - 3]) { R(g, x, 6, 2, 18, HOLZ_S); R(g, x, 6, 1, 18, HOLZ_M); }
      L(g, 2, 8, w - 2, 9, '#c8c0a8', 1);
      const farben = winter ? ['#d8e0e8', '#e8eef2', '#c0cad4'] : ['#f6efdc', '#e8506a', '#4a7ac0', '#f2d24a', '#7cc25a'];
      for (let x = 5, i = 0; x < w - 8; x += 9, i++) {
        const f = farben[(i + d.x) % farben.length];
        R(g, x, 9, 6, 8 + (i % 2) * 3, f); R(g, x, 9, 6, 1, hell(f, 0.3)); P(g, x + 1, 8, '#6a4426'); P(g, x + 4, 8, '#6a4426');
        if (winter) R(g, x, 8, 6, 1, '#ffffff');
      }
    },
  },
  dorf_bienenstock(g, d, { jz }) {
    R(g, 3, 13, 10, 2, '#6a4426'); R(g, 4, 9, 8, 4, '#e8c850'); R(g, 4, 9, 8, 1, '#f6e48a'); R(g, 4, 11, 8, 1, '#c8a030');
    R(g, 3, 6, 10, 3, '#b8864e'); R(g, 3, 6, 10, 1, '#d8aa6c'); R(g, 7, 12, 2, 1, '#2b1d1c');
    if (jz !== 'winter') { for (const [x, y] of [[12, 5], [14, 8], [1, 9]]) { P(g, x, y, '#2b1d1c'); P(g, x + 1, y, '#f2c030'); } }
    else R(g, 3, 5, 10, 1, '#ffffff');
  },
  dorf_fahrrad(g) {
    E(g, 4, 11, 3.4, 3.4, '#2b2b32'); E(g, 4, 11, 2.2, 2.2, '#c8ccd8'); E(g, 12, 11, 3.4, 3.4, '#2b2b32'); E(g, 12, 11, 2.2, 2.2, '#c8ccd8');
    L(g, 4, 11, 7, 6, '#c0405a', 1); L(g, 7, 6, 12, 11, '#c0405a', 1); L(g, 7, 6, 10, 6, '#c0405a', 1); L(g, 4, 11, 12, 11, '#c0405a', 1);
    R(g, 5, 4, 4, 2, '#4a3a2a'); R(g, 10, 4, 1, 3, '#6a6a74'); R(g, 9, 4, 3, 1, '#6a6a74');
  },
  dorf_urne(g, d, { jz }) {
    R(g, 3, 13, 10, 2, '#8f8981'); R(g, 5, 8, 6, 5, '#b5aea4'); E(g, 8, 8, 4.4, 2.4, '#c8c2b8'); R(g, 5, 8, 1, 5, '#d8d2c8');
    if (jz !== 'winter') { for (const [x, y, f] of [[6, 5, '#e8506a'], [8, 4, '#f2d24a'], [10, 5, '#f4f0f8']]) { P(g, x, y, f); P(g, x, y + 1, '#3f7a3a'); } }
  },
});

