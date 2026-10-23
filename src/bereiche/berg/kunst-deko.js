// Bereich „berg" – Pixelkunst: Deko draußen (Holz, Loren, Bänke, Wegweiser, Feuer, Bewuchs, Schilf,
// Seerosen, Boot, Kran, Brücke, Übungspuppe …) und drinnen (Werkbank, Regale, Betten, Vitrinen …).
// Geteilte Deko (Baum, Busch, Felsen, Laterne, Schild, Kiste, Fenster, Bild, Kamin, Tisch, Theke) kommt
// aus „basis".

import { dekoKunst, gecacht, leinwand, WASSER_FARBE, P, R, E, L, POLY, kugel, mische, hell, dunkel } from '../../sprites.js';
import { hash } from '../../zufall.js';

const HOLZ = '#a8784a';
const HOLZ_H = '#c8986a';
const HOLZ_D = '#6e4626';
const HOLZ_DD = '#4e3018';
const EISEN = '#4a4a54';
const EISEN_H = '#9aa0a8';
const SCHNEE = '#ffffff';

/** Ein Baumstamm von vorn (Schnittfläche) mit Jahresringen. */
function stamm(g, cx, cy, r) {
  E(g, cx, cy, r, r, HOLZ_D);
  E(g, cx, cy, r - 0.6, r - 0.6, '#d8b07a');
  E(g, cx, cy, r * 0.55, r * 0.55, '#c0925c');
  P(g, Math.round(cx), Math.round(cy), HOLZ_D);
}

dekoKunst({
  // ─── Holz und Werkstatt ───────────────────────────────────────────────────
  /** Stapel Rundhölzer, von der Schnittseite gesehen. */
  berg_holzstapel(g, d, { winter }) {
    R(g, 1, 14, 14, 2, HOLZ_DD);
    for (const [x, y] of [[3.5, 12], [8, 12], [12.5, 12], [5.8, 8], [10.3, 8], [8, 4]]) stamm(g, x, y, 2.7);
    if (winter) { R(g, 5, 1, 7, 1, SCHNEE); R(g, 3, 5, 3, 1, SCHNEE); R(g, 10, 5, 3, 1, SCHNEE); }
  },
  /** Sägebock mit Stamm und Säge. */
  berg_saegebock(g, d, { winter }) {
    L(g, 2, 15, 6, 7, HOLZ_D, 2); L(g, 10, 15, 6, 7, HOLZ_D, 2); L(g, 6, 15, 10, 7, HOLZ, 2); L(g, 14, 15, 10, 7, HOLZ, 2);
    R(g, 3, 6, 11, 2, HOLZ_H);
    R(g, 2, 3, 12, 4, '#8a5a32'); R(g, 2, 3, 12, 1, HOLZ_H); R(g, 13, 3, 1, 4, '#d8b07a');
    R(g, 4, 1, 7, 1, EISEN_H); for (let x = 4; x < 11; x += 2) P(g, x, 2, '#6a6e74'); R(g, 11, 0, 2, 3, HOLZ_D);
    if (winter) R(g, 2, 2, 12, 1, SCHNEE);
  },
  /** Lore (Grubenwagen) auf Schienen, mit Erzbrocken; w Felder breit. */
  berg_loren(g, d, { w, winter }) {
    R(g, 0, 15, w, 1, '#6a6a72');
    for (let x = 3; x < w; x += 6) R(g, x, 15, 2, 1, HOLZ_DD);
    const l = Math.round(w / 2) - 14;
    POLY(g, [[l, 4], [l + 28, 4], [l + 24, 13], [l + 4, 13]], '#6a6a76');
    R(g, l, 4, 28, 2, '#8a8a96'); R(g, l, 4, 28, 1, '#aeaeb8');
    R(g, l + 3, 8, 22, 1, '#54545e'); for (const x of [l + 4, l + 12, l + 20]) P(g, x, 10, '#aeaeb8');
    for (const [x, y, r, f] of [[l + 7, 3, 3, '#7a7570'], [l + 13, 2, 3.6, '#8a6a4a'], [l + 19, 3, 3, '#7a7570'], [l + 23, 3, 2.4, '#c8a040']]) kugel(g, x, y, r, r * 0.8, f);
    P(g, l + 13, 1, '#d8a060'); P(g, l + 20, 2, '#f2d24a');
    for (const x of [l + 7, l + 21]) { E(g, x, 13.5, 2.5, 2.5, '#2e2e36'); P(g, x, 13, '#9aa0a8'); }
    if (winter) { R(g, l + 4, 0, 20, 1, SCHNEE); R(g, l, 3, 28, 1, SCHNEE); }
  },
  /** Bank aus Planken; w Felder breit. */
  berg_rastbank(g, d, { w, winter }) {
    R(g, 2, 3, w - 4, 3, HOLZ); R(g, 2, 3, w - 4, 1, HOLZ_H); R(g, 2, 5, w - 4, 1, HOLZ_D);
    R(g, 1, 8, w - 2, 3, HOLZ_H); R(g, 1, 8, w - 2, 1, '#dcb07e'); R(g, 1, 10, w - 2, 1, HOLZ_D);
    for (const x of [3, w - 6]) { R(g, x, 11, 3, 5, HOLZ_D); R(g, x, 6, 3, 2, HOLZ_D); }
    if (winter) { R(g, 2, 2, w - 4, 1, SCHNEE); R(g, 1, 7, w - 2, 1, SCHNEE); }
  },
  /** Wegweiser mit zwei Armen. */
  berg_wegweiser: {
    b: 16, h: 24,
    malen(g, d, { winter }) {
      R(g, 7, 5, 2, 19, HOLZ_D); R(g, 7, 5, 1, 19, HOLZ);
      R(g, 6, 22, 4, 2, '#7a7570');
      R(g, 1, 3, 11, 5, HOLZ_H); POLY(g, [[12, 3], [15, 5.5], [12, 8]], HOLZ_H); R(g, 1, 7, 11, 1, HOLZ); R(g, 3, 5, 7, 1, HOLZ_D);
      R(g, 4, 10, 11, 5, HOLZ); POLY(g, [[4, 10], [1, 12.5], [4, 15]], HOLZ); R(g, 4, 14, 11, 1, HOLZ_D); R(g, 6, 12, 7, 1, HOLZ_DD);
      if (winter) { R(g, 1, 2, 11, 1, SCHNEE); R(g, 4, 9, 11, 1, SCHNEE); }
    },
  },
  /** Übungspuppe. */
  berg_puppe: {
    b: 16, h: 24,
    malen(g) {
      R(g, 7, 6, 2, 17, HOLZ_D); R(g, 4, 21, 8, 3, HOLZ); R(g, 4, 21, 8, 1, HOLZ_H);
      R(g, 2, 11, 12, 2, '#8a5a32');
      E(g, 8, 15, 3.8, 5, '#d8bc7a'); E(g, 8, 15, 3.8, 5, '#d8bc7a');
      for (const [r, f] of [[3.2, '#b8303a'], [2.2, '#f4f0e0'], [1.2, '#b8303a']]) E(g, 8, 15, r, r * 1.2, f);
      E(g, 8, 7, 3.4, 3.4, '#c8a868'); P(g, 6, 6, '#3a2a1a'); P(g, 10, 6, '#3a2a1a'); R(g, 7, 9, 3, 1, '#3a2a1a');
      L(g, 12, 3, 12, 12, EISEN_H, 1); R(g, 11, 11, 3, 1, '#c8a050');
    },
  },
  /** Waffenständer mit Schwertern und Axt. */
  berg_waffenstaender: {
    b: 16, h: 24,
    malen(g) {
      R(g, 1, 21, 14, 3, HOLZ_D); R(g, 1, 21, 14, 1, HOLZ);
      R(g, 1, 8, 2, 14, HOLZ_D); R(g, 13, 8, 2, 14, HOLZ_D); R(g, 1, 9, 14, 2, HOLZ); R(g, 1, 16, 14, 2, HOLZ);
      for (const x of [4, 8]) { L(g, x, 2, x, 17, '#c8ccd2', 1); P(g, x + 1, 4, '#9aa0a8'); R(g, x - 2, 5, 5, 1, '#c8a050'); R(g, x, 1, 1, 2, '#6a3a22'); }
      L(g, 11, 2, 11, 17, '#6a3a22', 1); POLY(g, [[11, 2], [15, 3], [15, 8], [11, 8]], '#aeb4bc'); R(g, 14, 3, 1, 5, '#e0e4ea');
    },
  },
  /** Lagerfeuer in Steinring (Licht kommt vom Deko-Feld `licht`). */
  berg_lagerfeuer: {
    b: 16, h: 16,
    malen(g, d, { nacht, winter }) {
      for (const [x, y] of [[2, 12], [5, 14], [10, 14], [13, 12], [3, 9], [12, 9]]) kugel(g, x + 0.5, y, 2.2, 1.8, winter ? '#b8b8c0' : '#8a847a');
      L(g, 3, 13, 12, 9, HOLZ_D, 2); L(g, 12, 13, 4, 9, '#8a5a32', 2);
      E(g, 8, 8, 3.8, 4.4, '#e86a2a'); E(g, 8, 9, 2.6, 3.4, '#f2a03a'); E(g, 8, 10, 1.4, 2.2, '#fff3b0');
      P(g, 6, 3, '#e86a2a'); P(g, 10, 4, '#f2a03a');
      if (nacht) { g.globalAlpha = 0.28; E(g, 8, 9, 7.5, 6, '#ffd47a'); g.globalAlpha = 1; }
    },
  },

  // ─── Bewuchs ──────────────────────────────────────────────────────────────
  /** Farn, Enzian oder Pilze – begehbar, nur zum Anschauen. */
  berg_bewuchs: {
    b: 16, h: 16,
    zustand: (d) => ({ a: d.art ?? 'farn' }),
    malen(g, d, { zustand, jz, winter }) {
      const a = zustand.a;
      if (winter) {
        E(g, 8, 13, 5.5, 2.6, SCHNEE); E(g, 7, 12, 3.6, 1.8, '#eaf2f8');
        if (a === 'wiese') { P(g, 4, 9, '#5a7a4a'); P(g, 11, 10, '#5a7a4a'); }
        if (a === 'farn') { L(g, 5, 12, 3, 9, '#7a6a4a', 1); L(g, 10, 12, 12, 9, '#7a6a4a', 1); }
        if (a === 'pilz') { P(g, 8, 10, '#b8402a'); P(g, 9, 10, '#b8402a'); }
        return;
      }
      if (a === 'farn') {
        const f = jz === 'herbst' ? ['#a0602a', '#c8803a'] : ['#3e7a34', '#5fa84a'];
        for (const [ex, ey] of [[2, 6], [5, 3], [8, 2], [11, 3], [14, 6]]) {
          L(g, 8, 14, ex, ey, f[0], 1);
          for (let i = 1; i < 4; i++) { const px = 8 + ((ex - 8) * i) / 4; const py = 14 + ((ey - 14) * i) / 4; P(g, Math.round(px) - 1, Math.round(py), f[1]); P(g, Math.round(px) + 1, Math.round(py), f[1]); }
        }
        R(g, 7, 13, 2, 2, '#4a3a22');
      } else if (a === 'wiese') {
        for (const [x, y, f] of [[3, 10, '#f4f0e0'], [7, 7, '#f2d24a'], [11, 11, '#ec97be'], [5, 13, '#f2d24a'], [12, 6, '#f4f0e0'], [9, 13, '#9a7ad8'], [14, 9, '#ec97be']]) {
          P(g, x, y + 2, '#3e7a34'); P(g, x, y + 1, '#3e7a34');
          P(g, x, y, f); P(g, x - 1, y, hell(f, 0.2)); P(g, x + 1, y, hell(f, 0.2)); P(g, x, y - 1, hell(f, 0.2)); P(g, x, y + 0, f);
          P(g, x, y, '#f2c030');
        }
      } else if (a === 'enzian') {
        for (const [x, h, f] of [[4, 6, '#3a5ac8'], [8, 9, '#4a6ae0'], [12, 5, '#3a5ac8']]) {
          R(g, x, 14 - h, 1, h, '#3e7a34'); E(g, x + 0.5, 14 - h - 1, 2, 2.4, f); P(g, x, 14 - h - 2, hell(f, 0.5)); P(g, x + 1, 14 - h, '#1a2a8a');
        }
        P(g, 6, 13, '#5fa84a'); P(g, 10, 13, '#5fa84a'); P(g, 3, 13, '#5fa84a');
      } else {
        for (const [x, y, r] of [[5, 11, 3], [11, 12, 2.4], [8, 8, 2]]) {
          R(g, x - 1, y, 2, 4, '#e8dcc0');
          E(g, x, y, r, r * 0.7, '#b8402a'); P(g, x - 1, y - 1, '#ffffff'); P(g, x + 1, y, '#ffffff');
        }
      }
    },
  },
  /** Schilf mit Rohrkolben (ohne dunklen Umriss, damit die Halme einzeln lesbar bleiben). */
  berg_schilf: {
    b: 16, h: 24, umriss: false,
    malen(g, d, { winter, jz }) {
      const stiel = winter ? '#b8a878' : jz === 'herbst' ? '#c0a85e' : '#6aa844';
      const stielD = winter ? '#8a7a52' : jz === 'herbst' ? '#8a7438' : '#417a2c';
      for (const [x, h] of [[2, 11], [5, 17], [8, 21], [11, 15], [14, 10]]) {
        R(g, x, 23 - h, 1, h, stiel); R(g, x + 1, 23 - h + 3, 1, h - 3, stielD);
        if (h > 14) { R(g, x - 1, 23 - h, 2, 5, winter ? '#8a6a4a' : '#7a4a26'); R(g, x - 1, 23 - h, 1, 5, winter ? '#a8825a' : '#9a6234'); P(g, x - 0, 22 - h, stielD); }
        else L(g, x, 18, x + (x < 8 ? -2 : 2), 12, stiel, 1);
      }
      R(g, 0, 22, 16, 1, stielD);
      if (winter) { R(g, 1, 21, 14, 1, SCHNEE); P(g, 8, 2, SCHNEE); P(g, 5, 6, SCHNEE); }
    },
  },
  /** Seerosenblätter und eine Blüte auf dem Wasser. */
  berg_seerosen: {
    b: 16, h: 16, umriss: false,
    malen(g, d, { winter }) {
      if (winter) { g.globalAlpha = 0.8; E(g, 6, 9, 5, 3, '#e8f4fa'); E(g, 11, 6, 3, 2, '#cfe4f0'); g.globalAlpha = 1; return; }
      const pad = (cx, cy, rx, ry) => {
        E(g, cx, cy + 0.6, rx, ry, '#2e6a2e'); E(g, cx, cy, rx, ry, '#4f9a3a'); E(g, cx - 1, cy - 0.5, rx * 0.5, ry * 0.5, '#6cb84e');
        L(g, cx, cy, cx + rx, cy - 1, WASSER_FARBE.see, 1);
      };
      pad(5, 10, 4.4, 2.8); pad(11, 5, 3.4, 2.2);
      E(g, 5, 8.5, 1.6, 1.4, '#f4b8d0'); P(g, 5, 8, '#f2d24a'); P(g, 4, 9, '#fff0f6'); P(g, 6, 9, '#fff0f6');
    },
  },
  /** Ruderboot am Steg; w Felder breit. */
  berg_boot: {
    b: 32, h: 16,
    malen(g, d, { winter }) {
      POLY(g, [[2, 7], [30, 7], [26, 13], [6, 13]], '#8a5a32'); R(g, 2, 7, 28, 2, HOLZ_H); R(g, 3, 9, 26, 1, HOLZ_D);
      R(g, 6, 13, 20, 1, HOLZ_DD);
      POLY(g, [[5, 9], [27, 9], [24, 12], [8, 12]], '#4e3018');
      R(g, 12, 7, 2, 4, HOLZ_H); R(g, 20, 7, 2, 4, HOLZ_H);
      L(g, 9, 6, 2, 1, HOLZ_D, 1); R(g, 0, 0, 3, 2, HOLZ_H); L(g, 25, 6, 31, 1, HOLZ_D, 1); R(g, 29, 0, 3, 2, HOLZ_H);
      R(g, 14, 9, 4, 2, '#d8c8a0');
      if (winter) { R(g, 2, 6, 28, 1, SCHNEE); R(g, 5, 8, 20, 1, '#eaf2f8'); }
    },
  },

  // ─── Steinbruch ───────────────────────────────────────────────────────────
  /** Holzkran mit Seilzug und Steinblock; w Felder breit, 48 Pixel hoch. */
  berg_kran: {
    b: 32, h: 48,
    malen(g, d, { winter }) {
      R(g, 6, 44, 20, 4, '#7a7570'); R(g, 6, 44, 20, 1, '#9a948a');
      R(g, 20, 8, 4, 38, '#8a5a32'); R(g, 20, 8, 1, 38, HOLZ_H); R(g, 23, 8, 1, 38, HOLZ_D);
      L(g, 22, 40, 10, 28, HOLZ_D, 2); L(g, 22, 20, 8, 10, HOLZ_D, 2); L(g, 22, 40, 30, 28, HOLZ_D, 2);
      R(g, 2, 7, 22, 3, HOLZ); R(g, 2, 7, 22, 1, HOLZ_H); R(g, 2, 9, 22, 1, HOLZ_D);
      E(g, 5, 11, 2.4, 2.4, EISEN); E(g, 5, 11, 1, 1, EISEN_H);
      L(g, 5, 12, 5, 28, '#d8c8a0', 1); L(g, 7, 12, 7, 28, '#c8b890', 1);
      R(g, 1, 28, 8, 3, EISEN); R(g, 3, 30, 4, 2, EISEN_H);
      R(g, 0, 32, 10, 7, '#a8a29a'); R(g, 0, 32, 10, 2, '#c8c2b8'); R(g, 9, 34, 1, 5, '#6e685e'); R(g, 0, 38, 10, 1, '#6e685e');
      R(g, 22, 3, 1, 5, EISEN); P(g, 22, 2, '#e04040');
      if (winter) { R(g, 2, 6, 22, 1, SCHNEE); R(g, 0, 31, 10, 1, SCHNEE); R(g, 20, 7, 4, 1, SCHNEE); }
    },
  },
  /** Behauene Quader. */
  berg_steinblock(g, d, { winter }) {
    R(g, 1, 9, 14, 6, '#a8a29a'); R(g, 1, 9, 14, 2, '#c8c2b8'); R(g, 1, 14, 14, 1, '#6e685e'); R(g, 14, 10, 1, 5, '#7e786e');
    R(g, 2, 3, 10, 6, '#b8b2a8'); R(g, 2, 3, 10, 2, '#d4cec4'); R(g, 2, 8, 10, 1, '#7e786e'); R(g, 11, 4, 1, 5, '#8e887e');
    P(g, 5, 12, '#8e887e'); P(g, 9, 6, '#9a948a');
    if (winter) { R(g, 2, 2, 10, 1, SCHNEE); R(g, 1, 8, 14, 1, SCHNEE); }
  },

  /** Defekte Brücke über den Fluss (3×2): zwei Stümpfe, dazwischen Wasser und Treibgut. Fährt an die Stelle der heilen Brücke. */
  berg_bruecke_kaputt: {
    b: 48, h: 32, umriss: false, flach: true,
    malen(g, d, { winter }) {
      const basis = WASSER_FARBE.see;
      R(g, 0, 0, 48, 32, basis);
      for (let i = 0; i < 14; i++) R(g, Math.floor(hash(i, 3, 1) * 44), Math.floor(hash(i, 4, 2) * 31), 3, 1, mische(basis, '#ffffff', 0.2));
      R(g, 0, 0, 48, 3, mische(basis, '#123050', 0.3));
      const plank = winter ? '#c8b89c' : '#a87848';
      // linker Stumpf: Planken bis zum ausgefransten Ende
      for (let y = 3; y < 29; y++) {
        const ende = 12 + Math.floor(hash(1, y, 3) * 6);
        R(g, 0, y, ende, 1, plank);
        if (y % 5 === 0) R(g, 0, y, ende, 1, '#7a5230');
      }
      for (let x = 3; x < 17; x += 4) R(g, x, 3, 1, 25, '#7a5230');
      // rechter Stumpf
      for (let y = 3; y < 29; y++) {
        const anfang = 32 - Math.floor(hash(2, y, 3) * 5);
        R(g, anfang, y, 48 - anfang, 1, plank);
        if (y % 5 === 0) R(g, anfang, y, 48 - anfang, 1, '#7a5230');
      }
      for (let x = 36; x < 48; x += 4) R(g, x, 3, 1, 25, '#7a5230');
      // Geländerreste
      R(g, 0, 0, 14, 3, '#6a4426'); R(g, 0, 0, 14, 1, '#8a5e38'); R(g, 0, 29, 14, 3, '#6a4426'); R(g, 0, 31, 14, 1, '#3e2a14');
      R(g, 36, 0, 12, 3, '#6a4426'); R(g, 36, 0, 12, 1, '#8a5e38'); R(g, 34, 29, 14, 3, '#6a4426'); R(g, 34, 31, 14, 1, '#3e2a14');
      for (const [x, y] of [[2, -1], [10, -1], [38, -1], [45, -1], [2, 27], [10, 27], [38, 27], [45, 27]]) R(g, x, Math.max(0, y), 2, y < 0 ? 5 : 5, '#4e3018');
      // abgeknickte Pfosten und ein Seil
      L(g, 14, 2, 20, 6, HOLZ_D, 2); L(g, 33, 2, 28, 7, HOLZ_D, 2);
      L(g, 13, 14, 16, 22, '#6a4426', 2); L(g, 13, 14, 16, 24, '#3e2a14', 1);
      L(g, 34, 12, 31, 21, '#d8c8a0', 1);
      // Treibgut: Planken im Strudel
      L(g, 20, 14, 28, 17, plank, 2); L(g, 21, 15, 27, 18, '#7a5230', 1);
      L(g, 22, 23, 27, 21, plank, 2);
      E(g, 24, 19, 5, 1.4, mische(basis, '#ffffff', 0.35));
      if (winter) { R(g, 0, 3, 14, 1, SCHNEE); R(g, 36, 3, 12, 1, SCHNEE); R(g, 0, 0, 14, 1, SCHNEE); R(g, 36, 0, 12, 1, SCHNEE); }
    },
  },

  /** Fernrohr auf Dreibein. */
  berg_fernrohr: {
    b: 16, h: 24,
    malen(g, d, { winter }) {
      L(g, 8, 13, 3, 23, HOLZ_D, 2); L(g, 8, 13, 13, 23, HOLZ_D, 2); L(g, 8, 13, 8, 23, HOLZ, 1);
      POLY(g, [[3, 12], [12, 4], [14, 7], [5, 15]], '#b8863a'); L(g, 3, 12, 12, 4, '#e0b860', 1);
      R(g, 7, 9, 2, 3, '#7a5a22'); E(g, 13, 5.5, 2.2, 2.2, '#8ac0e0'); P(g, 12, 5, '#d8f0ff');
      R(g, 2, 12, 3, 4, '#2e2e36'); R(g, 8, 11, 2, 3, EISEN);
      if (winter) R(g, 6, 11, 5, 1, SCHNEE);
    },
  },

  // ─── Zimmerei innen ───────────────────────────────────────────────────────
  /** Werkzeugwand: Säge, Hammer, Zange, Winkel auf Brettern. */
  berg_saegewand: {
    b: 32, h: 16, umriss: false,
    malen(g) {
      R(g, 0, 1, 32, 14, '#9a6c40'); R(g, 0, 1, 32, 1, HOLZ_H); R(g, 0, 14, 32, 1, HOLZ_D);
      for (let x = 5; x < 32; x += 8) R(g, x, 1, 1, 14, '#7a5230');
      POLY(g, [[3, 5], [19, 3], [19, 9], [3, 8]], '#c8ccd2'); for (let x = 3; x < 19; x += 2) P(g, x, 9 - (x < 11 ? 1 : 0), '#6a6e74'); R(g, 1, 4, 3, 5, HOLZ_D);
      R(g, 22, 4, 2, 8, HOLZ_D); R(g, 20, 3, 6, 3, EISEN);
      L(g, 28, 3, 28, 12, EISEN_H, 1); R(g, 27, 3, 3, 2, EISEN);
      L(g, 22, 13, 30, 13, '#d8c8a0', 1);
    },
  },
  /** Regal mit Brettern, Rollen und Gläsern; w Felder breit (steht an der Wand). */
  berg_holzregal: {
    b: 32, h: 32,
    malen(g) {
      R(g, 0, 5, 32, 27, HOLZ_D); R(g, 1, 6, 30, 25, '#5a3a22');
      for (const y of [13, 21, 29]) { R(g, 0, y, 32, 3, HOLZ); R(g, 0, y, 32, 1, HOLZ_H); }
      R(g, 0, 5, 32, 2, HOLZ_H); R(g, 15, 6, 2, 25, HOLZ_D);
      // Bretterstapel
      for (let i = 0; i < 4; i++) R(g, 2, 8 + i * 1, 11, 1, i % 2 ? '#d8b07a' : '#c8986a');
      R(g, 3, 15, 10, 5, '#d8b07a'); R(g, 3, 15, 10, 1, '#e8c898'); R(g, 3, 18, 10, 1, '#b8885a');
      // Rollen, Hobel, Gläser
      E(g, 21, 10, 3, 2.6, '#c8a868'); E(g, 27, 10, 2.6, 2.4, '#b89858'); R(g, 19, 15, 5, 5, '#8ac0e0'); R(g, 19, 14, 5, 1, '#c8c2b8'); R(g, 26, 16, 4, 4, '#d8a040'); R(g, 26, 15, 4, 1, '#c8c2b8');
      R(g, 3, 23, 8, 4, '#8a5a32'); R(g, 3, 22, 3, 2, HOLZ_D); R(g, 14, 23, 10, 5, '#e8d8b0'); R(g, 14, 23, 10, 1, '#fffbea'); R(g, 26, 22, 4, 6, '#3a5a8a');
    },
  },
  /** Werkbank mit Schraubstock, Brett und Werkzeug; w Felder breit. */
  berg_werkbank: {
    b: 48, h: 24,
    malen(g) {
      R(g, 0, 9, 48, 4, HOLZ_H); R(g, 0, 9, 48, 1, '#dcb07e'); R(g, 0, 12, 48, 1, HOLZ);
      R(g, 1, 13, 46, 9, '#8a5a32'); R(g, 1, 13, 46, 1, HOLZ_D);
      for (const x of [16, 32]) R(g, x, 13, 1, 9, HOLZ_DD);
      for (const x of [8, 24, 40]) { R(g, x - 2, 15, 5, 3, HOLZ); R(g, x, 16, 1, 1, EISEN_H); }
      R(g, 1, 22, 3, 2, HOLZ_D); R(g, 44, 22, 3, 2, HOLZ_D);
      // Schraubstock
      R(g, 3, 5, 6, 5, EISEN); R(g, 3, 5, 6, 1, EISEN_H); R(g, 1, 7, 3, 1, EISEN_H); R(g, 0, 6, 1, 3, HOLZ_D);
      // Brett und Hobel
      R(g, 14, 6, 18, 3, '#e0c090'); R(g, 14, 6, 18, 1, '#f0d8a8'); R(g, 14, 8, 18, 1, '#b8885a');
      R(g, 22, 3, 8, 3, '#8a5a32'); R(g, 22, 3, 8, 1, HOLZ_H); R(g, 25, 2, 2, 2, HOLZ_D);
      // Hammer, Bleistift, Späne
      R(g, 36, 6, 6, 3, HOLZ_D); R(g, 41, 4, 4, 5, EISEN); R(g, 41, 4, 4, 1, EISEN_H);
      R(g, 34, 8, 4, 1, '#e8c840');
      for (const [x, y] of [[12, 9], [32, 10], [45, 9], [20, 20]]) { P(g, x, y, '#f0d8a8'); P(g, x + 1, y, '#e0c090'); }
    },
  },
  /** Kanonenofen mit Rohr durch die Wand. */
  berg_ofen: {
    b: 16, h: 32,
    malen(g, d, { nacht }) {
      R(g, 7, 0, 3, 17, '#3a3a44'); R(g, 7, 0, 1, 17, '#5a5a66'); R(g, 6, 11, 5, 2, '#2e2e36');
      R(g, 2, 17, 12, 12, EISEN); R(g, 2, 17, 12, 2, '#6a6a76'); R(g, 2, 27, 12, 2, '#33333c');
      R(g, 4, 20, 8, 6, '#2a2a32'); R(g, 5, 21, 6, 4, nacht ? '#ffb040' : '#d8641e'); R(g, 6, 22, 4, 2, '#ffe080');
      R(g, 3, 29, 2, 3, '#2e2e36'); R(g, 11, 29, 2, 3, '#2e2e36');
      R(g, 12, 21, 2, 1, EISEN_H);
    },
  },
  /** Dreibeiniger Hocker. */
  berg_hocker(g) {
    R(g, 4, 10, 1, 5, HOLZ_D); R(g, 11, 10, 1, 5, HOLZ_D); R(g, 7, 11, 2, 5, HOLZ_DD);
    E(g, 8, 9, 5.5, 2.8, HOLZ_D); E(g, 8, 8.4, 5.2, 2.4, HOLZ_H); E(g, 7, 8, 2.4, 1, '#dcb07e');
  },

  // ─── Wohnräume ────────────────────────────────────────────────────────────
  /** Bett (2×2), flach, Decke in der Farbe `farbe`. */
  berg_bett: {
    b: 32, h: 32, flach: true,
    zustand: (d) => ({ f: d.farbe ?? '#4a7ac0' }),
    malen(g, d, { zustand }) {
      const f = zustand.f;
      R(g, 1, 0, 30, 6, HOLZ_D); R(g, 1, 0, 30, 1, HOLZ);
      R(g, 2, 5, 28, 26, '#8a5a32'); R(g, 3, 5, 26, 7, '#f4f0e8'); R(g, 5, 6, 9, 5, '#ffffff'); R(g, 18, 6, 9, 5, '#ffffff');
      R(g, 3, 12, 26, 18, f);
      for (let y = 14; y < 30; y += 4) for (let x = 5; x < 29; x += 6) R(g, x, y, 3, 2, hell(f, 0.25));
      R(g, 3, 12, 26, 1, hell(f, 0.45)); R(g, 3, 29, 26, 1, dunkel(f, 0.3));
      R(g, 1, 28, 3, 4, HOLZ_D); R(g, 28, 28, 3, 4, HOLZ_D);
    },
  },
  /** Kinderbett (1×2) mit Gitter und Stoffbär. */
  berg_kinderbett: {
    b: 16, h: 32, flach: true,
    zustand: (d) => ({ f: d.farbe ?? '#e0b030' }),
    malen(g, d, { zustand }) {
      const f = zustand.f;
      R(g, 1, 1, 14, 30, '#c8986a'); R(g, 2, 3, 12, 26, '#f4f0e8'); R(g, 3, 4, 10, 5, '#ffffff');
      R(g, 2, 10, 12, 18, f); R(g, 2, 10, 12, 1, hell(f, 0.4));
      for (let y = 12; y < 28; y += 4) R(g, 4, y, 8, 1, hell(f, 0.25));
      for (let y = 3; y < 30; y += 3) R(g, 1, y, 1, 2, HOLZ_D);
      R(g, 1, 0, 14, 3, HOLZ_D); R(g, 1, 29, 14, 3, HOLZ_D);
      E(g, 9, 14, 2.6, 2.6, '#a8784a'); E(g, 7.4, 12, 1.2, 1.2, '#a8784a'); E(g, 10.6, 12, 1.2, 1.2, '#a8784a'); P(g, 8, 14, '#2a1a10'); P(g, 10, 14, '#2a1a10');
    },
  },
  /** Kleiderschrank. */
  berg_schrank: {
    b: 16, h: 32,
    malen(g) {
      R(g, 1, 4, 14, 28, '#8a5a32'); R(g, 0, 2, 16, 3, HOLZ); R(g, 0, 2, 16, 1, HOLZ_H); R(g, 1, 5, 14, 1, HOLZ_D);
      R(g, 2, 7, 5, 22, '#7a4a28'); R(g, 9, 7, 5, 22, '#7a4a28'); R(g, 2, 7, 5, 1, HOLZ); R(g, 9, 7, 5, 1, HOLZ);
      R(g, 7, 7, 2, 22, HOLZ_DD); P(g, 6, 17, '#e0c060'); P(g, 9, 17, '#e0c060');
      R(g, 3, 9, 3, 6, '#6a3a22'); R(g, 10, 9, 3, 6, '#6a3a22');
      R(g, 2, 30, 3, 2, HOLZ_D); R(g, 11, 30, 3, 2, HOLZ_D);
    },
  },
  /** Bücherregal. */
  berg_regal: {
    b: 16, h: 32,
    malen(g) {
      R(g, 1, 3, 14, 29, HOLZ_D); R(g, 2, 5, 12, 26, '#4e3018');
      R(g, 0, 2, 16, 2, HOLZ); R(g, 0, 2, 16, 1, HOLZ_H);
      const farben = ['#b8303a', '#3a5a8a', '#4f9a5a', '#d8a040', '#8a4a8a', '#e8e0c8'];
      for (let r = 0; r < 4; r++) {
        const y = 6 + r * 6;
        R(g, 2, y + 5, 12, 1, HOLZ);
        let x = 3;
        for (let i = 0; i < 5 && x < 13; i++) {
          const b = 2 + Math.floor(hash(r, i, 5) * 2);
          const h = 3 + Math.floor(hash(r, i, 6) * 3);
          R(g, x, y + 5 - h, b, h, farben[Math.floor(hash(r, i, 7) * farben.length)]);
          x += b;
        }
      }
    },
  },
  /** Holzspielzeug am Boden. */
  berg_spielzeug(g) {
    R(g, 2, 10, 5, 5, '#e8506a'); R(g, 2, 10, 5, 1, '#f4909c'); P(g, 4, 12, '#ffffff');
    R(g, 8, 10, 5, 5, '#4a7ac0'); R(g, 8, 10, 5, 1, '#7aa6e8'); P(g, 10, 12, '#ffffff');
    R(g, 5, 5, 5, 5, '#f2d24a'); R(g, 5, 5, 5, 1, '#fff08a'); P(g, 7, 7, '#a8700a');
  },

  // ─── Gilde innen ──────────────────────────────────────────────────────────
  /** Gildentafel mit Gesuchen (an der Wand). */
  berg_gildentafel: {
    b: 32, h: 16, umriss: false,
    malen(g) {
      R(g, 0, 0, 32, 15, HOLZ_D); R(g, 1, 1, 30, 13, '#c8a070'); R(g, 1, 1, 30, 1, '#dcb888');
      for (const [x, y, w, h, f] of [[3, 3, 7, 8, '#f4f0e0'], [12, 2, 6, 9, '#f2e8c8'], [20, 4, 8, 8, '#f4f0e0'], [14, 7, 7, 6, '#e8d8a8']]) {
        R(g, x, y, w, h, f); for (let l = y + 2; l < y + h - 1; l += 2) R(g, x + 1, l, w - 2, 1, '#9a8a6a'); P(g, x + 1, y, '#b8303a');
      }
      R(g, 24, 8, 3, 3, '#b8303a'); P(g, 25, 9, '#f4b0a8');
      L(g, 4, 4, 8, 8, '#6a3a22', 1);
    },
  },
  /** Trophäe auf Holzschild: Schleimkopf oder Fledermaus. */
  berg_trophaee: {
    b: 16, h: 16, umriss: false,
    zustand: (d) => ({ a: d.art ?? 'schleim' }),
    malen(g, d, { zustand }) {
      POLY(g, [[2, 1], [14, 1], [14, 10], [8, 15], [2, 10]], HOLZ_D); POLY(g, [[3, 2], [13, 2], [13, 9.5], [8, 14], [3, 9.5]], '#8a5a32');
      if (zustand.a === 'fledermaus') {
        POLY(g, [[3, 6], [6, 4], [8, 7], [10, 4], [13, 6], [11, 9], [8, 8], [5, 9]], '#4a3a5a');
        E(g, 8, 6, 2, 2, '#6a5a7a'); P(g, 7, 5, '#f2d24a'); P(g, 9, 5, '#f2d24a'); P(g, 7, 4, '#4a3a5a'); P(g, 9, 4, '#4a3a5a');
      } else {
        E(g, 8, 8, 4.4, 4, '#5fb85a'); E(g, 7, 7, 2, 1.4, '#9ae08a');
        P(g, 6, 8, '#1a2a1a'); P(g, 10, 8, '#1a2a1a'); R(g, 7, 10, 3, 1, '#1a2a1a');
      }
    },
  },
  /** Vitrine mit Schwertern oder Schilden; w Felder breit. */
  berg_vitrine: {
    b: 32, h: 32,
    zustand: (d) => ({ a: d.art ?? 'schwerter' }),
    malen(g, d, { zustand }) {
      R(g, 0, 4, 32, 28, HOLZ_D); R(g, 0, 4, 32, 2, HOLZ); R(g, 1, 7, 30, 22, '#2e3040');
      R(g, 2, 8, 28, 20, '#454a60'); R(g, 2, 8, 28, 2, '#5a6078');
      if (zustand.a === 'schwerter') {
        for (const [x, l, f] of [[7, 16, '#e0e4ea'], [14, 18, '#c8ccd2'], [21, 15, '#e0e4ea'], [27, 12, '#b8bcc4']]) {
          L(g, x, 11, x, 11 + l, f, 1); R(g, x - 2, 16, 5, 1, '#c8a050'); R(g, x, 12, 1, 4, '#6a3a22'); P(g, x, 11, '#d8c060');
        }
      } else {
        for (const [x, f, g2] of [[9, '#b8303a', '#d8a040'], [22, '#3a5a8a', '#e0e4ea']]) {
          POLY(g, [[x - 5, 11], [x + 5, 11], [x + 5, 19], [x, 25], [x - 5, 19]], f); POLY(g, [[x - 3, 13], [x + 3, 13], [x + 3, 18], [x, 22], [x - 3, 18]], g2); R(g, x - 1, 13, 2, 9, f);
        }
        L(g, 15, 10, 15, 26, HOLZ_D, 2); POLY(g, [[15, 11], [19, 12], [18, 18], [15, 17]], '#aeb4bc');
      }
      g.globalAlpha = 0.28; POLY(g, [[3, 8], [12, 8], [3, 22]], '#ffffff'); g.globalAlpha = 1;
      R(g, 15, 7, 2, 22, HOLZ_D); R(g, 0, 29, 32, 3, '#4e3018');
    },
  },
  /** Steinmännchen als Wegmarke. */
  berg_steinmann(g, d, { winter }) {
    kugel(g, 8, 13, 5.4, 2.8, '#9a948a'); kugel(g, 8, 10, 4, 2.2, '#aaa49a'); kugel(g, 8.5, 7.4, 2.9, 1.8, '#8a847a'); kugel(g, 8, 5, 1.8, 1.4, '#b4aea4');
    if (winter) { R(g, 6, 3, 4, 1, SCHNEE); R(g, 5, 8, 6, 1, SCHNEE); R(g, 4, 11, 8, 1, SCHNEE); }
  },
  /** Trennwand zwischen Räumen, senkrecht: Holzkante von oben, h Felder hoch. */
  berg_trennwand: {
    bild: (d, k) => gecacht(`berg:trennwand:${d.h || 1}:${k.innen || ''}`, () => {
      const h = (d.h || 1) * 16;
      const [c, g] = leinwand(16, h);
      R(g, 0, 0, 16, h, '#2e221d');
      R(g, 2, 0, 12, h, '#7a5232'); R(g, 2, 0, 1, h, '#a8784a'); R(g, 13, 0, 1, h, '#4e3018');
      for (let y = 5; y < h; y += 8) { R(g, 3, y, 10, 1, '#6a4426'); P(g, 5, y + 1, '#8a5e38'); }
      R(g, 4, 0, 1, h, '#8a5e38'); R(g, 10, 0, 1, h, '#6a4426');
      return c;
    }, [16, (d.h || 1) * 16]),
    umriss: false,
  },
  /** Landkarte der Berge (an der Wand). */
  berg_karte: {
    b: 32, h: 16, umriss: false,
    malen(g) {
      R(g, 0, 1, 32, 14, '#c8a868'); R(g, 1, 2, 30, 12, '#e8d8b0'); R(g, 0, 1, 32, 1, '#8a6a42'); R(g, 0, 14, 32, 1, '#8a6a42');
      for (const [x, y] of [[5, 9], [10, 7], [8, 11], [24, 6], [27, 9]]) { POLY(g, [[x - 3, y + 2], [x, y - 3], [x + 3, y + 2]], '#8a8478'); P(g, x, y - 3, '#ffffff'); }
      for (let x = 12; x < 24; x += 2) P(g, x, 11 - Math.round(Math.sin(x * 0.6) * 1.5), '#8a2a2a');
      L(g, 18, 3, 22, 7, '#b8303a', 1); L(g, 22, 3, 18, 7, '#b8303a', 1);
      E(g, 13, 5, 3, 1.4, '#7aa6c8');
    },
  },
});
