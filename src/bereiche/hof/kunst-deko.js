// Bereich „hof" – Pixelkunst der Hofdeko: Regentonne, Holzstapel, Karren, Blumenbeet, Bank, Vogelhaus,
// Heuballen, Schilf und Seerosen am Teich. Alle mit Jahreszeiten-Varianten, soweit sie etwas zeigen.

import { dekoKunst, P, R, E, L, POLY, hell, dunkel } from '../../sprites.js';
import { hash } from '../../zufall.js';

const SCHNEE = '#f4f8fb';
const HOLZ = '#9a6a3a';
const HOLZ_L = '#c8925a';
const HOLZ_D = '#6e4626';

dekoKunst({
  hof_regentonne: {
    b: 16, h: 22,
    malen(g, d, { jz }) {
      R(g, 2, 6, 12, 15, '#8a5a32');
      for (const x of [4, 7, 10, 13]) R(g, x, 6, 1, 15, HOLZ_D);
      R(g, 2, 6, 1, 15, '#a87848'); R(g, 13, 6, 1, 15, '#6e4626');
      R(g, 1, 9, 14, 2, '#4a4a52'); R(g, 1, 17, 14, 2, '#4a4a52'); R(g, 1, 9, 14, 1, '#6a6a74'); R(g, 1, 17, 14, 1, '#6a6a74');
      E(g, 8, 6, 6.4, 2.6, HOLZ_D);
      E(g, 8, 6, 5, 1.9, jz === 'winter' ? '#e4f2f8' : '#4c97a6');
      if (jz !== 'winter') { P(g, 6, 5, '#8cc4d0'); P(g, 7, 5, '#8cc4d0'); P(g, 10, 6, '#3a7a88'); }
      R(g, 3, 20, 10, 1, '#4a2e18');
      if (jz === 'winter') { R(g, 2, 5, 12, 1, SCHNEE); }
    },
  },

  /** Holzstapel (2 Felder breit): Stammenden in drei Lagen, im Winter mit Schneehaube. */
  hof_holzstapel: {
    b: 32, h: 22,
    malen(g, d, { jz }) {
      R(g, 1, 19, 30, 2, HOLZ_D);
      R(g, 1, 6, 2, 14, '#6a4426'); R(g, 29, 6, 2, 14, '#6a4426');
      const lage = (y, n, x0) => {
        for (let i = 0; i < n; i++) {
          const x = x0 + i * 6.6;
          E(g, x, y, 3.6, 3.6, '#7a4e2a');
          E(g, x, y, 2.9, 2.9, ['#d8b078', '#d0a468', '#e0bc84'][(i + Math.floor(y)) % 3]);
          E(g, x, y, 1.6, 1.6, '#b88a52'); P(g, Math.round(x), Math.round(y), '#9a7040');
        }
      };
      lage(16, 4, 5.5); lage(10.5, 3, 8.8); lage(5, 2, 12);
      if (jz === 'winter') { R(g, 0, 2, 32, 2, SCHNEE); R(g, 3, 1, 26, 1, SCHNEE); }
    },
  },

  /** Handkarren mit Heu. */
  hof_karren: {
    b: 32, h: 26,
    malen(g, d, { jz }) {
      // Griffe
      L(g, 0, 15, 8, 12, HOLZ_D, 2); L(g, 0, 14, 8, 11, HOLZ, 1);
      // Kasten
      R(g, 7, 7, 22, 11, HOLZ); R(g, 7, 7, 22, 1, HOLZ_L);
      for (const y of [10, 13, 16]) R(g, 7, y, 22, 1, HOLZ_D);
      R(g, 7, 7, 2, 11, '#7a5232'); R(g, 27, 7, 2, 11, '#7a5232');
      // Heu
      E(g, 18, 6, 10, 3.4, '#d8b24a'); E(g, 16, 5, 6, 2, '#ecc860');
      for (const x of [10, 15, 21, 25]) L(g, x, 6, x + 2, 3, '#b8902e', 1);
      // Rad
      E(g, 17, 20, 6, 6, '#4a2e18'); E(g, 17, 20, 5, 5, '#8a5a32'); E(g, 17, 20, 3, 3, '#4a2e18');
      L(g, 17, 15, 17, 25, '#a87848', 1); L(g, 12, 20, 22, 20, '#a87848', 1); L(g, 13, 16, 21, 24, '#a87848', 1); L(g, 21, 16, 13, 24, '#a87848', 1);
      P(g, 17, 20, '#4a4a52'); P(g, 16, 20, '#6a6a74');
      if (jz === 'winter') { R(g, 7, 3, 22, 2, SCHNEE); R(g, 10, 2, 16, 1, SCHNEE); }
    },
  },

  /** Blumenbeet (2 Felder breit) mit Steineinfassung. */
  hof_blumenbeet: {
    b: 32, h: 18,
    umriss: false,
    malen(g, d, { jz, w }) {
      R(g, 1, 8, w - 2, 9, '#5a3c28');
      R(g, 1, 8, w - 2, 1, '#6e4a32');
      // Einfassung aus Steinen
      for (let x = 0; x < w - 2; x += 5) {
        const f = hash(x, d.x, 2) < 0.5 ? '#9a948c' : '#aaa49a';
        R(g, x, 13, 5, 4, dunkel(f, 0.32)); R(g, x, 13, 4, 3, f); R(g, x, 13, 4, 1, hell(f, 0.3));
      }
      R(g, 0, 8, 1, 8, '#8a847c'); R(g, w - 1, 8, 1, 8, '#7a746c');
      const farben = {
        fruehling: ['#f06a9a', '#f4f0e0', '#f2d24a', '#b48ae0'],
        sommer: ['#f2d24a', '#e84a3a', '#f4f0e8', '#d86ad0'],
        herbst: ['#d8742f', '#b8452f', '#f2b24a', '#8a3a5a'],
      }[jz];
      for (let i = 0; i < Math.floor((w - 4) / 3.5); i++) {
        const x = 3 + Math.floor(i * 3.5);
        const hoch = 3 + Math.floor(hash(x, d.x, 4) * 5);
        const y = 11 - hoch;
        if (!farben) { L(g, x, 11, x + (i % 2 ? 1 : -1), 6 + (i % 3), '#6a5a4a', 1); continue; }
        L(g, x, 11, x, y + 1, '#3e7a34', 1);
        P(g, x - 1, y + 3, '#4f9a3a'); P(g, x + 1, y + 4, '#4f9a3a');
        const f = farben[(i + Math.floor(hash(x, d.x, 6) * 3)) % farben.length];
        P(g, x, y, f); P(g, x - 1, y, f); P(g, x + 1, y, f); P(g, x, y - 1, f); P(g, x, y + 1, f);
        P(g, x, y, jz === 'sommer' ? '#7a4a1e' : '#f2d24a');
      }
      if (!farben) { R(g, 1, 6, w - 2, 2, SCHNEE); R(g, 3, 5, w - 6, 1, SCHNEE); }
    },
  },

  /** Gartenbank (2 Felder breit). */
  hof_bank: {
    b: 32, h: 20,
    malen(g, d, { jz }) {
      R(g, 3, 12, 3, 7, HOLZ_D); R(g, 26, 12, 3, 7, HOLZ_D);
      R(g, 1, 9, 30, 4, HOLZ); R(g, 1, 9, 30, 1, HOLZ_L); R(g, 1, 12, 30, 1, '#7a5232');
      for (const x of [10, 21]) R(g, x, 9, 1, 4, '#7a5232');
      R(g, 2, 2, 28, 3, HOLZ); R(g, 2, 2, 28, 1, HOLZ_L); R(g, 2, 6, 28, 3, HOLZ); R(g, 2, 8, 28, 1, '#7a5232');
      R(g, 2, 1, 3, 10, '#7a5232'); R(g, 27, 1, 3, 10, '#7a5232'); R(g, 2, 1, 1, 10, HOLZ);
      if (jz === 'winter') { R(g, 1, 8, 30, 2, SCHNEE); R(g, 2, 0, 28, 2, SCHNEE); R(g, 3, 5, 26, 1, SCHNEE); }
    },
  },

  hof_vogelhaus: {
    b: 16, h: 30,
    malen(g, d, { jz }) {
      R(g, 7, 12, 3, 18, HOLZ_D); R(g, 7, 12, 1, 18, '#8a5a32');
      R(g, 3, 6, 11, 8, '#c89a62'); R(g, 3, 6, 11, 1, '#e0b27a'); R(g, 13, 6, 1, 8, '#9a7240');
      E(g, 8, 10, 2, 2, '#3a2a18'); R(g, 5, 13, 7, 1, HOLZ_D); R(g, 6, 14, 5, 1, '#6a4426');
      POLY(g, [[1, 7], [16, 7], [12, 1], [5, 1]], '#a8452f'); R(g, 5, 1, 7, 1, hell('#a8452f', 0.35)); R(g, 1, 6, 15, 1, '#7a2e20');
      if (jz === 'winter') { R(g, 5, 0, 7, 2, SCHNEE); R(g, 1, 6, 15, 1, SCHNEE); }
      else { E(g, 13, 4, 2, 1.6, '#4a7ac0'); P(g, 15, 4, '#f2c94c'); P(g, 12, 3, '#f4f0e8'); }
    },
  },

  hof_heuballen: {
    b: 16, h: 16,
    malen(g, d, { jz }) {
      R(g, 1, 5, 14, 10, '#d8b24a'); R(g, 2, 4, 12, 2, '#ecc860'); R(g, 1, 13, 14, 2, '#b8902e');
      for (let i = 0; i < 9; i++) L(g, 2 + i * 1.5, 6 + (i % 3) * 2, 4 + i * 1.5, 7 + (i % 3) * 2, '#b8902e', 1);
      R(g, 4, 4, 1, 11, '#7a5a2a'); R(g, 11, 4, 1, 11, '#7a5a2a');
      if (jz === 'winter') { R(g, 1, 3, 14, 2, SCHNEE); R(g, 3, 2, 10, 1, SCHNEE); }
    },
  },

  /** Schilf mit Kolben am Teichrand. */
  hof_schilf: {
    b: 16, h: 26, umriss: false,
    malen(g, d, { jz }) {
      const winter = jz === 'winter';
      const halm = winter ? ['#b8a878', '#d8c898'] : jz === 'herbst' ? ['#a89040', '#c8b058'] : ['#4f8a3a', '#6aa84a'];
      for (let i = 0; i < 6; i++) {
        const x = 2 + Math.floor(hash(d.x, d.y, i) * 11);
        const hoch = 12 + Math.floor(hash(d.x, d.y, i + 7) * 12);
        const neig = hash(d.x, d.y, i + 14) < 0.5 ? -1 : 1;
        L(g, x, 25, x + neig, 25 - hoch, halm[i % 2], 1);
        if (i % 3 === 0) { R(g, x + neig - 1, 25 - hoch - 3, 2, 4, winter ? '#8a6a4a' : '#6a3e22'); P(g, x + neig - 1, 25 - hoch - 3, '#8a5a32'); }
        else if (i % 3 === 1) { L(g, x + neig, 25 - hoch, x + neig * 3, 25 - hoch + 4, halm[1], 1); }
      }
      if (!winter) for (let x = 3; x < 14; x += 4) P(g, x, 25, '#356f2a');
    },
  },

  /** Seerosenblätter mit Blüte; im Winter nur Eisschollen. */
  hof_seerosen: {
    b: 16, h: 16, umriss: false,
    malen(g, d, { jz }) {
      if (jz === 'winter') {
        E(g, 6, 9, 5, 2.6, '#e8f2f8'); E(g, 11, 6, 3, 1.8, '#d8e8f2'); R(g, 3, 9, 6, 1, '#ffffff');
        return;
      }
      const blatt = (cx, cy, rx, ry, k) => {
        E(g, cx, cy, rx, ry, '#2f6a2c'); E(g, cx - 0.4, cy - 0.5, rx - 0.8, ry - 0.7, k ? '#4f9a3a' : '#5aa844');
        L(g, cx, cy, cx + rx, cy - 1, '#4c97a6', 1);
        P(g, cx - rx / 2, cy - ry / 2, '#8ccd68');
      };
      blatt(5, 10, 4.4, 2.6, 0); blatt(11, 7, 3.6, 2.2, 1); blatt(10, 12, 3, 1.8, 0);
      if (hash(d.x, d.y, 3) < 0.7) {
        const f = jz === 'herbst' ? '#f2b24a' : '#f27aa8';
        for (const [x, y] of [[10, 5], [12, 6], [11, 4], [9, 6]]) P(g, x, y, f);
        P(g, 11, 5, '#f2d24a'); P(g, 11, 6, hell(f, 0.4));
      }
    },
  },
});
