// Bereich „wildnis" – Deko draußen: Strand (Reusen, Boote, Schirme, Lagerfeuer, Brücke),
// Wald (Märkte, Ranch, Lichtung, Pilze, Farn, Schilf) und Geheimer Wald (Schrein, Leuchtpilze).
// Tun-nichts-Schmuck (Blumen, Farn, Gras) ist `begehbar` und liegt flach auf dem Boden.

import {
  dekoKunst, P, R, E, L, POLY, kugel, hell, dunkel, mische, LAUB, WASSER_FARBE,
} from '../../sprites.js';
import { hash } from '../../zufall.js';

const art = (d) => ({ art: d.art ?? 0 });
const SCHNEE = '#f4f8fb';

/** Schneehaube auf einer Oberkante. */
const schnee = (g, x, y, w) => { R(g, x, y, w, 2, SCHNEE); R(g, x + 1, y + 2, Math.max(0, w - 2), 1, '#dfe8f0'); };
/** Kleines Boot (Rumpf von der Seite) in Breite b, Höhe 12 ab y0. */
function rumpf(g, x, y, b, farbe, streifen) {
  POLY(g, [[x, y], [x + b, y], [x + b - 5, y + 9], [x + 5, y + 9]], farbe);
  R(g, x, y, b, 2, hell(farbe, 0.25));
  R(g, x + 3, y + 4, b - 6, 2, streifen);
  R(g, x + 5, y + 8, b - 10, 1, dunkel(farbe, 0.35));
}

dekoKunst({
  // ─── Strand ───────────────────────────────────────────────────────────────

  /** Strandkorb: Korbgeflecht mit gestreifter Kapuze, Fußstütze und Kissen. */
  strandkorb: {
    h: 28, schatten: [8, 2.5, 0], durchsichtig: [16, 24],
    malen(g, d, { winter }) {
      R(g, 1, 6, 14, 20, '#e2cfa0'); for (let y = 8; y < 24; y += 2) R(g, 1, y, 14, 1, '#c8b480');
      R(g, 1, 6, 2, 20, '#f0e0b8'); R(g, 13, 6, 2, 20, '#bfa972');
      R(g, 0, 2, 16, 6, '#3a7ac0'); for (const x of [2, 7, 12]) R(g, x, 2, 3, 6, '#f4f0e8'); R(g, 0, 2, 16, 1, '#5a98d8');
      R(g, 3, 11, 10, 9, '#2f5f9a'); R(g, 3, 17, 10, 4, '#e8e0c8'); R(g, 3, 11, 10, 1, '#4a7ac0');
      R(g, 1, 25, 14, 2, '#a8946a'); R(g, 3, 27, 2, 1, '#7a6a48'); R(g, 11, 27, 2, 1, '#7a6a48');
      if (winter) schnee(g, 0, 0, 16);
    },
  },
  wildnis_reuse: {
    h: 20, schatten: [6, 2, 0],
    malen(g) {
      E(g, 8, 12, 5.5, 6, '#b8924e'); E(g, 8, 12, 3.4, 4, '#8a6a30'); E(g, 8, 9, 4.5, 1.6, '#d6b46a');
      for (const x of [4, 7, 10, 12]) L(g, x, 7, x + 1, 17, '#7a5a28', 1);
      for (const y of [10, 14]) R(g, 3, y, 10, 1, '#7a5a28');
      L(g, 12, 5, 14, 2, '#d8c8a0', 1); P(g, 14, 2, '#e8506a');
    },
  },
  wildnis_netz: {
    h: 40, schatten: [14, 3, 0], durchsichtig: [32, 36],
    malen(g, d, { winter }) {
      R(g, 2, 8, 3, 32, '#6e4626'); R(g, 27, 8, 3, 32, '#6e4626'); R(g, 1, 6, 30, 3, '#8a5a32'); R(g, 1, 6, 30, 1, '#b07a48');
      for (let x = 5; x < 27; x += 3) L(g, x, 9, x, 22 + Math.floor(hash(x, 3, 1) * 8), '#6a98a8', 1);
      for (let y = 11; y < 28; y += 3) R(g, 5, y, 22, 1, y % 2 ? '#7aa8b8' : '#6a98a8');
      for (const x of [8, 15, 22]) { E(g, x, 21 + (x % 5), 1.6, 2, '#e04a3a'); }
      R(g, 8, 36, 16, 1, '#a89870'); // Schatten des Netzes
      if (winter) schnee(g, 1, 4, 30);
    },
  },
  wildnis_fass: {
    h: 20, schatten: [6, 2, 0],
    malen(g, d, { winter }) {
      R(g, 3, 5, 10, 14, '#8a5a32'); R(g, 2, 8, 12, 8, '#8a5a32'); R(g, 4, 5, 2, 14, '#a8784a'); R(g, 11, 6, 2, 12, '#6e4626');
      E(g, 8, 5, 5, 2, '#c8985a'); E(g, 8, 5, 3.4, 1.2, '#7a5230');
      for (const y of [8, 15]) R(g, 2, y, 12, 1, '#4a4a54');
      if (winter) schnee(g, 3, 3, 10);
    },
  },
  wildnis_boot: {
    b: (d) => (d.w || 3) * 16, h: 28, schatten: [20, 3, -1],
    zustand: art,
    malen(g, d, { w }) {
      rumpf(g, 1, 12, w - 2, '#4a78b0', '#f4f0e8');
      R(g, 6, 8, 3, 6, '#9a6a3a'); R(g, w - 10, 8, 3, 6, '#9a6a3a');
      L(g, w - 4, 4, w - 14, 18, '#a8784a', 1); R(g, w - 18, 17, 6, 2, '#a8784a');
      R(g, 4, 12, w - 8, 1, '#2f4f78');
    },
  },
  wildnis_ruderboot: {
    b: (d) => (d.w || 2) * 16, h: 24, schatten: [12, 2.5, -1],
    malen(g, d, { w }) {
      rumpf(g, 1, 9, w - 2, '#a8784a', '#5a8a6a');
      R(g, Math.floor(w / 2) - 1, 6, 3, 6, '#7a5230');
      L(g, 3, 6, w - 3, 3, '#6e4626', 1);
    },
  },
  wildnis_staffelei: {
    h: 32, schatten: [6, 2, 0], durchsichtig: [16, 28],
    malen(g, d, { jz }) {
      L(g, 3, 31, 6, 8, '#8a5a32', 2); L(g, 12, 31, 9, 8, '#8a5a32', 2); L(g, 8, 31, 8, 14, '#6e4626', 1);
      R(g, 2, 1, 12, 15, '#f4f0e8'); R(g, 3, 2, 10, 13, '#9ad0f0'); R(g, 3, 8, 10, 7, '#3d7dbf');
      R(g, 3, 6, 10, 2, '#f4f0e8'); E(g, 10, 5, 1.4, 1.4, '#f2d24a');
      L(g, 4, 12, 12, 10, '#f4f0e8', 1); R(g, 6, 10, 3, 1, '#d8453a');
      R(g, 1, 16, 14, 1, '#8a5a32');
      R(g, 11, 26, 4, 5, '#f4f0e8'); R(g, 12, 25, 2, 1, '#d8453a'); P(g, 12, 27, '#4a78b0'); P(g, 13, 29, '#f2d24a');
      if (jz === 'winter') schnee(g, 2, 0, 12);
    },
  },
  wildnis_sitzstamm: {
    b: (d) => (d.w || 2) * 16, h: 16, schatten: [10, 2, 0],
    malen(g, d, { w, winter }) {
      R(g, 1, 6, w - 2, 9, '#8a5a32'); R(g, 1, 6, w - 2, 2, '#b07a48'); R(g, 1, 13, w - 2, 2, '#5e3a1e');
      for (let x = 5; x < w - 4; x += 7) L(g, x, 9, x + 2, 11, '#6a4024', 1);
      E(g, 2, 10.5, 2, 4.4, '#d8b07a'); E(g, 2, 10.5, 1, 2.4, '#b08a5a');
      E(g, w - 3, 10.5, 2, 4.4, '#d8b07a'); E(g, w - 3, 10.5, 1, 2.4, '#b08a5a');
      if (winter) schnee(g, 1, 4, w - 2);
    },
  },
  wildnis_poller: {
    h: 20, schatten: [5, 2, 0],
    malen(g, d, { winter }) {
      R(g, 5, 6, 6, 12, '#5a3a24'); R(g, 5, 6, 2, 12, '#7a5230'); E(g, 8, 6, 4.5, 2, '#7a5230'); E(g, 8, 6, 3, 1.2, '#4a3020');
      L(g, 4, 11, 12, 14, '#d8c8a0', 1); L(g, 4, 13, 12, 11, '#c8b890', 1);
      if (winter) schnee(g, 4, 3, 8);
    },
  },
  /** Die Glut: Steinring, Scheite, Asche. Die Flammen zeichnet animation.js. */
  wildnis_lagerfeuer: {
    h: 16, schatten: [8, 3, 0],
    malen(g) {
      for (let i = 0; i < 9; i++) {
        const w = (i / 9) * Math.PI * 2;
        kugel(g, 8 + Math.cos(w) * 6.2, 11 + Math.sin(w) * 3.4, 2.1, 1.7, i % 2 ? '#8f8a82' : '#a6a096');
      }
      E(g, 8, 11, 4.6, 2.2, '#2a1e18');
      L(g, 4, 12, 12, 9, '#7a5230', 2); L(g, 12, 12, 4, 9, '#6a4426', 2);
      P(g, 8, 10, '#e8702a'); P(g, 6, 11, '#f2a03a'); P(g, 10, 11, '#d8452a');
    },
  },
  wildnis_leuchtfeuer: { h: 16, umriss: false, malen(g) { P(g, 8, 8, '#fff3b0'); } },

  wildnis_sonnenschirm: {
    h: 36, schatten: [8, 2.5, 0], zustand: art,
    malen(g, d) {
      const f = [['#e04a3a', '#f4f0e8'], ['#3d7dbf', '#f4f0e8'], ['#f2c94c', '#f4f0e8']][(d.art ?? 0) % 3];
      R(g, 7, 12, 2, 24, '#c8c0b0'); R(g, 7, 12, 1, 24, '#e8e0d0');
      POLY(g, [[8, 0], [0, 14], [16, 14]], f[0]);
      POLY(g, [[8, 0], [5, 14], [8, 14]], f[1]); POLY(g, [[8, 0], [11, 14], [14, 14]], f[1]);
      for (let x = 1; x < 16; x += 3) E(g, x + 1, 14, 1.6, 1.2, f[(x / 3) % 2 ? 1 : 0]);
    },
  },
  wildnis_handtuch: {
    h: 16, flach: true, umriss: false, zustand: art,
    malen(g, d) {
      const f = [['#e04a3a', '#f4f0e8'], ['#3d7dbf', '#f2c94c'], ['#4aa86a', '#f4f0e8']][(d.art ?? 0) % 3];
      R(g, 2, 2, 12, 13, f[0]); for (let y = 3; y < 14; y += 3) R(g, 2, y, 12, 1, f[1]);
      for (let y = 2; y < 15; y += 2) { P(g, 1, y, f[1]); P(g, 14, y, f[1]); }
      R(g, 2, 14, 12, 1, dunkel(f[0], 0.3));
    },
  },
  wildnis_sandburg: {
    h: 20, flach: true,
    malen(g, d, { winter }) {
      R(g, 2, 12, 12, 6, '#d8c08a'); R(g, 4, 8, 3, 5, '#e2cc98'); R(g, 9, 8, 3, 5, '#e2cc98'); R(g, 6, 5, 4, 8, '#e8d4a2');
      for (const x of [4, 6, 9, 11]) P(g, x, 7, '#d8c08a');
      P(g, 8, 4, '#d8c08a'); L(g, 8, 1, 8, 4, '#8a5a32', 1); R(g, 9, 1, 3, 2, '#e04a3a');
      R(g, 7, 15, 2, 3, '#b8a070'); P(g, 3, 16, '#e8e0d0');
      if (winter) R(g, 2, 17, 12, 1, SCHNEE);
    },
  },
  wildnis_duenengras: {
    h: 24, umriss: false, flach: true,
    malen(g, d, { jz }) {
      const f = { fruehling: ['#a8c060', '#c8d880'], sommer: ['#c8c070', '#e0d890'], herbst: ['#c8a050', '#e0c070'], winter: ['#c8c0a0', '#f2f0e4'] }[jz];
      for (let i = 0; i < 6; i++) {
        const x = 2 + i * 2.4;
        const h = 8 + Math.floor(hash(i, 3, 5) * 8);
        L(g, x, 22, x + (i % 2 ? 2 : -2), 22 - h, f[i % 2], 1);
      }
      if (jz === 'winter') { P(g, 5, 14, '#ffffff'); P(g, 11, 12, '#ffffff'); }
    },
  },
  wildnis_treibholz: {
    b: (d) => (d.w || 2) * 16, h: 18, schatten: [10, 2, 0],
    malen(g, d, { w, winter }) {
      R(g, 1, 9, w - 4, 6, '#b8b0a0'); R(g, 1, 9, w - 4, 2, '#d8d0c0'); R(g, 1, 14, w - 4, 1, '#8a8274');
      E(g, w - 4, 12, 2.4, 3, '#cfc6b4'); L(g, 5, 9, 8, 3, '#a8a090', 2); L(g, w - 12, 9, w - 10, 5, '#a8a090', 1);
      for (let x = 4; x < w - 8; x += 6) P(g, x, 12, '#8a8274');
      if (winter) schnee(g, 2, 7, w - 6);
    },
  },
  wildnis_seetang: {
    h: 16, umriss: false, flach: true,
    malen(g) {
      for (const [x, f] of [[3, '#2f7a4a'], [8, '#3a8a5a'], [12, '#2a6a40']]) {
        for (let y = 5; y < 15; y++) P(g, x + Math.round(Math.sin(y * 0.9 + x) * 1.4), y, f);
      }
      P(g, 6, 14, '#2a6a40'); P(g, 10, 13, '#3a8a5a');
    },
  },
  wildnis_muschelhaufen: {
    h: 16, umriss: false, flach: true,
    malen(g) {
      E(g, 5, 10, 2.4, 1.8, '#e8d8c0'); E(g, 5, 10, 1.4, 1, '#f4e8d4');
      E(g, 10, 12, 2, 1.6, '#e8b8a0'); E(g, 9, 7, 1.8, 1.4, '#f0e0d0');
      P(g, 13, 10, '#d8c8b0'); P(g, 4, 13, '#d8c8b0');
      L(g, 5, 8, 5, 12, '#c8b090', 1);
    },
  },
  wildnis_seestern: {
    h: 16, umriss: false, flach: true, zustand: art,
    malen(g, d) {
      const f = ['#e8702a', '#d8453a', '#b070c8'][(d.art ?? 0) % 3];
      const cx = 8; const cy = 9;
      for (let i = 0; i < 5; i++) {
        const w = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        L(g, cx, cy, Math.round(cx + Math.cos(w) * 5), Math.round(cy + Math.sin(w) * 5), f, 2);
      }
      E(g, cx, cy, 2, 2, hell(f, 0.2)); P(g, cx, cy, hell(f, 0.5));
      for (let i = 0; i < 5; i++) { const w = -Math.PI / 2 + (i / 5) * Math.PI * 2; P(g, Math.round(cx + Math.cos(w) * 3.5), Math.round(cy + Math.sin(w) * 3.5), dunkel(f, 0.3)); }
    },
  },

  // ─── Die Brücke zum Gezeitenbecken ────────────────────────────────────────

  wildnis_bruecke_kaputt: {
    b: 48, h: 32, flach: true, umriss: false,
    malen(g, d, { winter }) {
      const wasser = WASSER_FARBE.meer;
      R(g, 0, 0, 48, 32, wasser);
      for (let i = 0; i < 8; i++) R(g, 2 + Math.floor(hash(i, 1, 3) * 38), 2 + Math.floor(hash(i, 2, 3) * 28), 5, 1, hell(wasser, 0.25));
      // Längsbalken
      R(g, 0, 3, 48, 3, '#6a4426'); R(g, 0, 26, 48, 3, '#6a4426');
      // übrig gebliebene Bretter, quer zur Gehrichtung
      const fehlt = { 2: 1, 4: 1, 5: 1, 7: 1 };
      for (let i = 0; i < 12; i++) {
        if (fehlt[i]) continue;
        const x = i * 4;
        const lang = i === 3 || i === 8 ? 12 : 22;
        const y = i === 3 || i === 8 ? 5 : 5;
        R(g, x, y, 3, lang, i % 2 ? '#a87848' : '#9a6a3a'); R(g, x, y, 3, 1, '#c8925a'); R(g, x + 2, y, 1, lang, '#7a5230');
        if (lang < 22) { P(g, x, y + lang, '#7a5230'); P(g, x + 1, y + lang + 1, '#7a5230'); }
      }
      // abgebrochene Bretter, die ins Wasser hängen
      L(g, 22, 22, 26, 29, '#7a5230', 2); L(g, 33, 18, 36, 27, '#7a5230', 2);
      // Pfosten mit Seil
      for (const x of [1, 44]) { R(g, x, 0, 3, 8, '#5a3a24'); R(g, x, 24, 3, 8, '#5a3a24'); }
      L(g, 3, 3, 14, 5, '#d8c8a0', 1); L(g, 44, 3, 36, 6, '#d8c8a0', 1);
      // Wellen um die Lücken
      for (const [x, y] of [[8, 14], [18, 18], [28, 10], [40, 17]]) { R(g, x, y, 4, 1, '#ffffff'); R(g, x + 1, y + 1, 2, 1, hell(wasser, 0.45)); }
      if (winter) { schnee(g, 0, 1, 12); schnee(g, 36, 1, 10); }
    },
  },
  wildnis_bruecke: {
    b: 48, h: 32, flach: true, umriss: false,
    malen(g, d, { winter }) {
      R(g, 0, 3, 48, 3, '#5a3a24'); R(g, 0, 26, 48, 3, '#5a3a24');
      for (let i = 0; i < 12; i++) { const x = i * 4; R(g, x, 5, 3, 22, i % 2 ? '#b08050' : '#a87848'); R(g, x, 5, 3, 1, '#d09a60'); R(g, x + 2, 5, 1, 22, '#7a5230'); }
      // Geländer: Pfosten und Holm (hinten hoch, vorne niedrig)
      for (const x of [0, 15, 30, 45]) { R(g, x, 0, 3, 9, '#6e4626'); R(g, x, 0, 3, 1, '#c8925a'); R(g, x, 25, 3, 7, '#6e4626'); }
      R(g, 0, 1, 48, 2, '#8a5a32'); R(g, 0, 28, 48, 2, '#8a5a32'); R(g, 0, 5, 48, 1, '#5a3a24');
      if (winter) for (let x = 0; x < 48; x += 5) P(g, x + 1, 6, '#ffffff');
    },
  },

  // ─── Wald: Holzfäller, Markt, Turm, Ranch ─────────────────────────────────

  wildnis_holzstapel: {
    b: (d) => (d.w || 2) * 16, h: 28, schatten: [14, 3, 0],
    malen(g, d, { w, winter }) {
      for (let r = 0; r < 3; r++) {
        for (let x = 1 + (r % 2) * 3; x < w - 3; x += 6) {
          E(g, x + 3, 22 - r * 6, 3.2, 3.2, '#8a5a32'); E(g, x + 3, 22 - r * 6, 2.2, 2.2, '#d8b07a'); E(g, x + 3, 22 - r * 6, 1, 1, '#b08a5a');
        }
      }
      R(g, 1, 24, w - 2, 3, '#6e4626'); R(g, 0, 8, 2, 20, '#5a3a24'); R(g, w - 2, 8, 2, 20, '#5a3a24');
      if (winter) schnee(g, 1, 5, w - 2);
    },
  },
  wildnis_saegebock: {
    h: 24, schatten: [7, 2, 0],
    malen(g, d, { winter }) {
      L(g, 3, 22, 6, 12, '#8a5a32', 2); L(g, 13, 22, 10, 12, '#8a5a32', 2); L(g, 3, 22, 5, 22, '#8a5a32', 1);
      R(g, 1, 9, 14, 5, '#a87848'); R(g, 1, 9, 14, 1, '#c8925a'); E(g, 14, 11.5, 1.6, 2.4, '#d8b07a');
      L(g, 4, 6, 12, 4, '#c8ccd8', 1); R(g, 3, 5, 2, 3, '#7a5230');
      if (winter) schnee(g, 1, 7, 14);
    },
  },
  wildnis_marktstand: {
    b: (d) => (d.w || 3) * 16, h: 52, schatten: [20, 4, -2], durchsichtig: [40, 40], zustand: art,
    malen(g, d, { w, winter }) {
      const f = [['#d8453a', '#f4f0e8'], ['#3d7dbf', '#f4f0e8'], ['#4aa86a', '#f4f0e8'], ['#e8a830', '#f4f0e8']][(d.art ?? 0) % 4];
      // Pfosten und Auslage
      for (const x of [2, w - 5]) R(g, x, 12, 3, 38, '#6e4626');
      R(g, 2, 30, w - 4, 20, '#8a5a32'); R(g, 2, 30, w - 4, 2, '#b07a48'); R(g, 2, 46, w - 4, 4, '#5e3a1e');
      for (let x = 8; x < w - 4; x += 9) R(g, x, 33, 1, 13, '#6e4626');
      // Ware je nach Stand
      const ware = [['#e04a3a', '#7cc25a', '#f2c94c'], ['#e8c860', '#c88038', '#efe6d6'], ['#7cc25a', '#e87a2a', '#9a4a8a'], ['#c8925a', '#f2d24a', '#e8506a']][(d.art ?? 0) % 4];
      for (let i = 0; i < 4; i++) { const x = 6 + i * ((w - 18) / 3); E(g, x + 3, 28, 3.2, 2.6, ware[i % 3]); P(g, x + 2, 27, hell(ware[i % 3], 0.5)); }
      R(g, 6, 38, 8, 7, '#a87848'); R(g, w - 16, 38, 9, 7, '#a87848'); R(g, 6, 38, 8, 1, '#c8925a');
      // Markise mit Streifen und Zacken
      POLY(g, [[0, 14], [w, 14], [w - 3, 2], [3, 2]], f[1]);
      for (let x = 0; x < w; x += 8) POLY(g, [[x, 14], [x + 4, 14], [x + 4 - (x / w) * 3 + 1, 2], [x - (x / w) * 3 + 1, 2]], f[0]);
      for (let x = 0; x < w; x += 8) { E(g, x + 2, 15, 2, 1.6, f[0]); E(g, x + 6, 15, 2, 1.6, f[1]); }
      R(g, 3, 2, w - 6, 1, hell(f[1], 0.1));
      if (winter) schnee(g, 3, 0, w - 6);
    },
  },
  wildnis_karren: {
    b: (d) => (d.w || 3) * 16, h: 40, schatten: [20, 3, -1], durchsichtig: [40, 30],
    malen(g, d, { w, winter }) {
      R(g, 4, 18, w - 8, 12, '#8a5a32'); R(g, 4, 18, w - 8, 2, '#b07a48'); R(g, 4, 28, w - 8, 2, '#5e3a1e');
      for (let x = 8; x < w - 6; x += 8) R(g, x, 20, 1, 9, '#6e4626');
      // Plane
      POLY(g, [[6, 18], [w - 6, 18], [w - 10, 5], [10, 5]], '#e8e0cc');
      for (let x = 12; x < w - 10; x += 8) L(g, x, 6, x - 3, 17, '#c8bea4', 1);
      R(g, 10, 4, w - 20, 2, '#c8bea4');
      if (winter) schnee(g, 10, 2, w - 20);
      // Räder
      for (const x of [10, w - 12]) { E(g, x, 31, 6, 6, '#6e4626'); E(g, x, 31, 4.6, 4.6, '#a87848'); E(g, x, 31, 1.4, 1.4, '#4a3020'); L(g, x - 4, 31, x + 4, 31, '#6e4626', 1); L(g, x, 27, x, 35, '#6e4626', 1); }
      // Deichsel
      L(g, 3, 24, 0, 30, '#6e4626', 2);
      // Fässer und Säcke
      R(g, w - 22, 12, 7, 8, '#a87848'); E(g, w - 18, 12, 3.5, 1.4, '#c8985a'); R(g, w - 30, 14, 7, 6, '#c8b070');
    },
  },
  wildnis_fernrohr: {
    h: 32, schatten: [6, 2, 0], durchsichtig: [16, 28],
    malen(g) {
      L(g, 8, 18, 3, 31, '#6e4626', 2); L(g, 8, 18, 13, 31, '#6e4626', 2); L(g, 8, 18, 8, 31, '#8a5a32', 1);
      L(g, 3, 19, 13, 4, '#c89a3a', 3); L(g, 3, 19, 13, 4, '#f2c94c', 1);
      E(g, 13, 4, 2.4, 2.4, '#2e2e36'); E(g, 13, 4, 1.2, 1.2, '#9ad0f0'); R(g, 6, 17, 4, 3, '#8a6a20');
    },
  },
  wildnis_regentonne: {
    h: 24, schatten: [6, 2, 0],
    malen(g, d, { winter }) {
      R(g, 3, 6, 10, 16, '#7a5230'); R(g, 2, 9, 12, 10, '#7a5230'); R(g, 4, 6, 2, 16, '#9a6a3a');
      E(g, 8, 6, 5, 2.4, winter ? '#dfeef7' : '#6fb0d8'); R(g, 3, 5, 10, 1, '#4a4a54');
      for (const y of [10, 18]) R(g, 2, y, 12, 1, '#4a4a54');
      L(g, 14, 4, 12, 7, '#7a8a96', 1);
    },
  },
  wildnis_kraeuterbeet: {
    b: (d) => (d.w || 3) * 16, h: 20, schatten: [16, 2, 0],
    malen(g, d, { w, jz }) {
      R(g, 1, 6, w - 2, 12, '#7a5230'); R(g, 1, 6, w - 2, 2, '#a87848'); R(g, 1, 16, w - 2, 2, '#5e3a1e');
      R(g, 2, 8, w - 4, 8, jz === 'winter' ? '#e4ebf1' : '#5a4028');
      if (jz !== 'winter') {
        const f = jz === 'herbst' ? ['#a08a3a', '#c88038'] : ['#5aa83a', '#7cc25a', '#9a4a8a', '#f2d24a'];
        for (let x = 4; x < w - 4; x += 4) { const h = 3 + Math.floor(hash(x, 3, 2) * 4); R(g, x, 12 - h, 2, h + 1, f[(x / 4) % f.length | 0]); P(g, x - 1, 12 - h + 1, f[0]); P(g, x + 2, 12 - h + 2, f[1]); }
      }
      for (let x = 6; x < w - 4; x += 14) { R(g, x, 4, 1, 4, '#c8b070'); R(g, x - 1, 3, 3, 2, '#f4f0e8'); }
    },
  },
  wildnis_buecherkarren: {
    b: (d) => (d.w || 2) * 16, h: 26, schatten: [12, 2, 0],
    malen(g, d, { w, winter }) {
      R(g, 3, 12, w - 6, 8, '#8a5a32'); R(g, 3, 12, w - 6, 1, '#b07a48'); L(g, 3, 16, 0, 11, '#6e4626', 2);
      for (let i = 0; i < 6; i++) R(g, 5 + i * 3, 5 + (i % 2), 3, 7 - (i % 2), ['#d8453a', '#3d7dbf', '#4aa86a', '#f2c94c', '#9a4a8a', '#e8a830'][i]);
      for (const x of [8, w - 8]) { E(g, x, 22, 4, 4, '#6e4626'); E(g, x, 22, 2.6, 2.6, '#a87848'); }
      if (winter) schnee(g, 4, 3, w - 8);
    },
  },
  wildnis_briefkasten: {
    h: 28, schatten: [5, 2, 0],
    malen(g) {
      R(g, 7, 12, 2, 16, '#6e4626'); R(g, 3, 4, 10, 8, '#3d7dbf'); E(g, 8, 4, 5, 2, '#3d7dbf'); R(g, 3, 11, 10, 1, '#2f5f9a'); R(g, 4, 5, 8, 1, '#6a9ad0');
      R(g, 12, 2, 2, 6, '#d8453a'); R(g, 12, 2, 3, 2, '#d8453a'); R(g, 5, 8, 4, 3, '#f4f0e8');
    },
  },
  wildnis_silo: {
    b: 32, h: 72, schatten: [14, 3, -2], durchsichtig: [32, 60],
    malen(g, d, { winter }) {
      R(g, 3, 14, 26, 56, '#9aa6b4');
      for (let y = 18; y < 70; y += 8) R(g, 3, y, 26, 1, '#7a8694');
      R(g, 3, 14, 6, 56, '#b6c0cc'); R(g, 23, 14, 6, 56, '#7a8694'); R(g, 5, 14, 2, 56, '#c8d0da');
      E(g, 16, 14, 13, 8, '#c8d0da'); E(g, 16, 13, 13, 7, '#d8e0e8'); E(g, 12, 10, 4, 3, '#eef2f6');
      R(g, 15, 0, 2, 8, '#6a7480'); P(g, 16, 0, '#d8453a');
      if (winter) E(g, 16, 8, 11, 5, SCHNEE);
      R(g, 12, 52, 8, 18, '#6a4426'); R(g, 13, 53, 6, 16, '#8a5a32');
      for (let y = 18; y < 52; y += 4) R(g, 24, y, 4, 1, '#4a5460');
      R(g, 2, 69, 28, 3, '#6e6258');
    },
  },
  wildnis_heuballen: {
    h: 20, schatten: [7, 2, 0],
    malen(g, d, { winter }) {
      E(g, 8, 11, 7, 7, '#d8b050'); E(g, 8, 11, 5.4, 5.4, '#e8c860'); E(g, 8, 11, 3, 3, '#d8b050'); E(g, 8, 11, 1, 1, '#a88c30');
      for (const a of [0.3, 1.4, 2.6, 4.0]) L(g, 8, 11, Math.round(8 + Math.cos(a) * 6), Math.round(11 + Math.sin(a) * 6), '#c8a040', 1);
      R(g, 6, 3, 4, 1, '#a88c30'); P(g, 5, 4, '#e8c860'); P(g, 11, 5, '#e8c860');
      if (winter) schnee(g, 4, 3, 8);
    },
  },
  wildnis_traenke: {
    b: (d) => (d.w || 2) * 16, h: 18, schatten: [12, 2, 0],
    malen(g, d, { w, winter }) {
      R(g, 1, 6, w - 2, 10, '#8a5a32'); R(g, 1, 6, w - 2, 2, '#b07a48'); R(g, 1, 14, w - 2, 2, '#5e3a1e');
      R(g, 3, 8, w - 6, 5, winter ? '#dfeef7' : '#5a9ac8'); R(g, 5, 9, 5, 1, hell('#5a9ac8', 0.45));
      R(g, 2, 15, 3, 3, '#5e3a1e'); R(g, w - 5, 15, 3, 3, '#5e3a1e');
    },
  },
  wildnis_pumpe: {
    h: 28, schatten: [5, 2, 0],
    malen(g) {
      R(g, 6, 8, 5, 16, '#4a6a8a'); R(g, 6, 8, 2, 16, '#6a8aaa'); R(g, 5, 4, 7, 5, '#4a6a8a'); R(g, 4, 3, 9, 2, '#5a7a9a');
      L(g, 13, 5, 15, 2, '#2e2e36', 2); L(g, 5, 18, 2, 20, '#4a6a8a', 2); R(g, 0, 20, 4, 3, '#3a4a5a');
      R(g, 4, 24, 9, 3, '#7a7a82'); R(g, 11, 22, 4, 5, '#a8784a'); R(g, 11, 22, 4, 1, '#c8925a');
    },
  },
  wildnis_blumenbeet: {
    b: (d) => (d.w || 2) * 16, h: 20, schatten: [12, 2, 0],
    malen(g, d, { w, jz }) {
      R(g, 1, 8, w - 2, 10, '#8a8478'); R(g, 1, 8, w - 2, 2, '#b0a898'); R(g, 1, 16, w - 2, 2, '#5e5a52');
      R(g, 2, 10, w - 4, 6, jz === 'winter' ? '#e4ebf1' : '#5a4028');
      if (jz === 'winter') { for (let x = 4; x < w - 3; x += 5) { L(g, x, 14, x, 8, '#8a7a5a', 1); P(g, x, 7, '#ffffff'); } return; }
      const fs = jz === 'herbst' ? ['#d8742f', '#b8452f', '#e8c050'] : ['#e8506a', '#f2d24a', '#ec97be', '#f4f0e8', '#9a6ad8'];
      for (let x = 3; x < w - 3; x += 3) {
        const h = 3 + Math.floor(hash(x, 7, 1) * 4);
        L(g, x, 14, x, 14 - h, '#4f9a3a', 1);
        const f = fs[Math.floor(hash(x, 8, 1) * fs.length)];
        E(g, x, 13 - h, 1.8, 1.8, f); P(g, x, 13 - h, '#f2d24a');
      }
    },
  },
  wildnis_uralteiche: {
    b: 64, h: 84, schatten: [20, 5, -3], durchsichtig: [56, 70], tiefe: 0,
    malen(g, d, { jz, nacht }) {
      const l = LAUB[jz];
      // Stamm mit Wurzeln und Höhle
      POLY(g, [[22, 84], [26, 60], [27, 44], [37, 44], [38, 60], [42, 84], [36, 80], [32, 83], [28, 80]], '#5a3a24');
      R(g, 27, 44, 4, 38, '#7a5230'); R(g, 35, 46, 3, 36, '#46301e');
      for (const y of [52, 62, 72]) L(g, 29, y, 33, y + 2, '#46301e', 1);
      E(g, 32, 70, 3, 5, '#1e140e'); E(g, 32, 72, 1.6, 2.4, nacht ? '#ffd47a' : '#3a2a1a');
      L(g, 27, 50, 14, 38, '#5a3a24', 3); L(g, 37, 50, 52, 36, '#5a3a24', 3); L(g, 32, 46, 32, 30, '#5a3a24', 3);
      if (l) {
        for (const [cx, cy, rx, ry] of [[32, 26, 28, 20], [14, 36, 14, 12], [50, 34, 14, 12], [32, 12, 20, 12]]) E(g, cx, cy, rx, ry, l.d);
        for (const [cx, cy, rx, ry] of [[30, 24, 24, 16], [14, 34, 11, 9], [49, 32, 11, 9], [32, 11, 16, 9]]) E(g, cx, cy, rx, ry, l.b);
        for (const [cx, cy, rx, ry] of [[24, 14, 12, 6], [12, 30, 6, 4], [44, 28, 7, 4]]) E(g, cx, cy, rx, ry, l.h);
        for (let i = 0; i < 18; i++) P(g, 6 + Math.floor(hash(i, 3, 4) * 52), 6 + Math.floor(hash(i, 4, 4) * 40), l.d);
      } else {
        for (const [x0, y0, x1, y1] of [[14, 38, 6, 20], [14, 38, 22, 22], [52, 36, 58, 18], [52, 36, 44, 20], [32, 30, 24, 8], [32, 30, 40, 6], [24, 8, 18, 2], [40, 6, 48, 0]]) L(g, x0, y0, x1, y1, '#5a3a24', 2);
        for (const [x, y] of [[8, 22], [20, 24], [58, 20], [46, 22], [26, 10]]) R(g, x - 2, y, 5, 1, SCHNEE);
      }
    },
  },
  wildnis_bienenstock: {
    h: 24, schatten: [6, 2, 0],
    malen(g, d, { jz, nacht }) {
      R(g, 4, 14, 2, 8, '#6e4626'); R(g, 10, 14, 2, 8, '#6e4626');
      R(g, 2, 8, 12, 7, '#e8c860'); R(g, 2, 11, 12, 1, '#c8a040'); R(g, 2, 8, 12, 1, '#f4dc88');
      R(g, 1, 5, 14, 3, '#efe6d6'); R(g, 1, 5, 14, 1, '#ffffff'); R(g, 6, 12, 4, 2, '#3a2a1a');
      if (jz === 'winter') schnee(g, 1, 3, 14);
      else if (!nacht) for (const [x, y] of [[12, 9], [4, 4], [14, 12]]) { P(g, x, y, '#f2c94c'); P(g, x + 1, y, '#2b1d1c'); }
    },
  },
  wildnis_pilzring: {
    b: (d) => (d.w || 3) * 16, h: 32, flach: true, umriss: false,
    malen(g, d, { w }) {
      const cx = w / 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = Math.round(cx + Math.cos(a) * (w / 2 - 6));
        const y = Math.round(18 + Math.sin(a) * 8);
        R(g, x - 1, y, 2, 3, '#efe6d6'); E(g, x, y, 2.4, 1.6, '#d8453a'); P(g, x - 1, y - 1, '#ffffff'); P(g, x + 1, y, '#ffffff');
      }
    },
  },
  wildnis_decke: {
    b: (d) => (d.w || 2) * 16, h: 16, flach: true,
    malen(g, d, { w }) {
      R(g, 1, 3, w - 2, 12, '#e8e0cc');
      for (let y = 3; y < 15; y += 4) for (let x = 1; x < w - 1; x += 4) if (((x + y) / 4) % 2 < 1) R(g, x, y, 4, 4, '#d8453a');
      R(g, w - 12, 4, 7, 5, '#a87848'); R(g, w - 12, 4, 7, 1, '#c8925a'); L(g, w - 11, 4, w - 9, 1, '#6e4626', 1); L(g, w - 6, 4, w - 8, 1, '#6e4626', 1);
      E(g, 6, 9, 2, 1.4, '#e04a3a'); P(g, 10, 7, '#7cc25a'); R(g, 14, 8, 3, 3, '#f2d24a');
    },
  },
  wildnis_findling: {
    h: 20, schatten: [8, 3, 0], durchsichtig: [16, 16],
    malen(g, d, { jz }) {
      kugel(g, 8, 11, 7.2, 6.4, '#8f8a82'); kugel(g, 5, 14, 3.4, 2.6, '#a09a90');
      if (jz === 'winter') E(g, 8, 6, 5.4, 2, SCHNEE);
      else { E(g, 6, 7, 4, 2, '#5f9a3a'); E(g, 11, 9, 2, 1.4, '#4f8a3a'); P(g, 5, 6, '#8ad06a'); }
      L(g, 10, 10, 12, 14, '#6a6458', 1);
    },
  },
  wildnis_wildblumen: {
    h: 16, umriss: false, flach: true, zustand: (d) => ({ art: d.art ?? 0 }),
    malen(g, d, { jz }) {
      if (jz === 'winter') { for (const x of [4, 8, 12]) { L(g, x, 14, x, 9, '#9a8a62', 1); P(g, x, 8, '#ffffff'); } return; }
      const sets = {
        fruehling: [['#f4f0e0', '#f2d24a'], ['#ec97be', '#f4f0e0'], ['#9a6ad8', '#f4f0e0'], ['#f2d24a', '#f4f0e0']],
        sommer: [['#e8506a', '#f2d24a'], ['#f2d24a', '#e8a830'], ['#3d7dbf', '#9ad0f0'], ['#ec97be', '#f4f0e0']],
        herbst: [['#d8742f', '#e8c050'], ['#b8452f', '#e8c050'], ['#e8c050', '#a08a3a'], ['#9a6ad8', '#d8c8f0']],
      }[jz];
      const f = sets[(d.art ?? 0) % 4];
      for (const [x, y, k] of [[4, 12, 0], [9, 10, 1], [12, 13, 0], [6, 8, 1]]) {
        L(g, x, 15, x, y + 1, '#4f9a3a', 1); P(g, x, y, f[k]); P(g, x - 1, y, f[k]); P(g, x + 1, y, f[k]); P(g, x, y - 1, f[k]); P(g, x, y + 1, f[k] === f[0] ? f[1] : f[0]);
      }
    },
  },
  wildnis_farn: {
    h: 16, umriss: false, flach: true,
    malen(g, d, { jz }) {
      const f = { fruehling: ['#6ab04a', '#8ccd68'], sommer: ['#3f8a3a', '#62a84a'], herbst: ['#a8782a', '#c88a3a'], winter: ['#b8c0b0', '#dfe6dc'] }[jz];
      for (const [a, len] of [[-2.2, 7], [-1.6, 8], [-1.0, 7], [-2.7, 5], [-0.5, 5]]) {
        const x1 = 8 + Math.cos(a) * len;
        const y1 = 15 + Math.sin(a) * len;
        L(g, 8, 15, Math.round(x1), Math.round(y1), f[0], 1);
        for (let t = 0.35; t < 1; t += 0.2) P(g, Math.round(8 + Math.cos(a) * len * t) + 1, Math.round(15 + Math.sin(a) * len * t), f[1]);
      }
    },
  },
  wildnis_pilze: {
    h: 16, umriss: false, flach: true, zustand: art,
    malen(g, d) {
      const hut = ['#8a5a32', '#d8453a', '#e8c050'][(d.art ?? 0) % 3];
      for (const [x, y, r] of [[5, 11, 2.6], [10, 9, 2], [11, 13, 1.6]]) {
        R(g, x - 1, y, 2, 3, '#efe6d6'); E(g, x, y, r, r * 0.7, hut);
        if (hut === '#d8453a') { P(g, x - 1, y - 1, '#ffffff'); P(g, x + 1, y, '#ffffff'); }
      }
    },
  },
  wildnis_schilf: {
    h: 28, umriss: false,
    malen(g, d, { jz }) {
      const f = { fruehling: '#7aa84a', sommer: '#5a983a', herbst: '#b8a050', winter: '#c8c0a0' }[jz];
      for (let i = 0; i < 6; i++) {
        const x = 3 + i * 2;
        const h = 14 + Math.floor(hash(i, 5, 2) * 10);
        L(g, x, 26, x + (i % 2 ? 1 : -1), 26 - h, f, 1);
        if (i % 3 === 0) { R(g, x - 1 + (i % 2 ? 1 : -1), 26 - h - 3, 2, 4, '#7a5230'); }
      }
      if (jz === 'winter') { P(g, 6, 12, '#ffffff'); P(g, 11, 9, '#ffffff'); }
    },
  },
  wildnis_seerose: {
    h: 16, umriss: false, flach: true, zustand: (d) => ({ art: d.art ?? 0 }),
    malen(g, d, { jz }) {
      if (jz === 'winter') { E(g, 8, 9, 4, 2.4, '#e4f0f6'); return; }
      E(g, 8, 9, 5, 3, '#3f8a3a'); E(g, 7, 8, 4, 2, '#5aa84a'); P(g, 13, 8, '#2a6a30');
      if ((d.art ?? 0) === 0 && jz !== 'herbst') { E(g, 8, 8, 2, 1.6, '#f4c0d8'); P(g, 8, 7, '#f2d24a'); }
    },
  },
  wildnis_baumstumpf: {
    h: 20, schatten: [7, 2, 0], zustand: art,
    malen(g, d, { jz }) {
      R(g, 3, 8, 10, 10, '#6a4428'); R(g, 11, 8, 2, 10, '#4e3018'); E(g, 8, 8, 5, 2.2, '#c09464'); E(g, 8, 8, 3, 1.2, '#9a7046'); E(g, 8, 8, 1, 0.6, '#c09464');
      L(g, 3, 17, 1, 19, '#6a4428', 1); L(g, 13, 17, 15, 19, '#6a4428', 1);
      if ((d.art ?? 0) === 1 && jz !== 'winter') { E(g, 11, 17, 1.8, 1.2, '#d8453a'); R(g, 11, 17, 1, 2, '#efe6d6'); E(g, 5, 10, 2, 1, '#5f9a3a'); }
      if (jz === 'winter') schnee(g, 4, 5, 8);
    },
  },

  // ─── Geheimer Wald ────────────────────────────────────────────────────────

  wildnis_schrein: {
    b: 32, h: 52, schatten: [14, 3, -2], durchsichtig: [32, 44],
    malen(g, d, { jz, nacht }) {
      R(g, 2, 40, 28, 10, '#7a7a76'); R(g, 4, 36, 24, 6, '#8a8a84');
      R(g, 5, 14, 4, 24, '#8f8d86'); R(g, 23, 14, 4, 24, '#8f8d86'); R(g, 5, 14, 1, 24, '#aaa8a0'); R(g, 26, 14, 1, 24, '#6e6c66');
      R(g, 3, 10, 26, 5, '#8f8d86'); R(g, 3, 10, 26, 1, '#b0aea6'); R(g, 6, 6, 20, 5, '#7a7872');
      // Kristall im Bogen
      POLY(g, [[16, 18], [11, 26], [16, 36], [21, 26]], nacht ? '#a8f0e0' : '#7ad8c8');
      POLY(g, [[16, 18], [11, 26], [16, 27]], hell('#7ad8c8', 0.5));
      for (const [x, y] of [[13, 34], [19, 33], [16, 12]]) P(g, x, y, '#b6f08a');
      // Moos und Ranken
      if (jz !== 'winter') for (const [x, y, w] of [[3, 10, 10], [18, 10, 9], [4, 36, 8], [22, 40, 7], [8, 46, 14]]) { R(g, x, y, w, 2, '#4f8a3a'); R(g, x + 1, y + 2, w - 3, 1, '#3f7a30'); }
      else { schnee(g, 3, 8, 26); R(g, 3, 38, 24, 2, SCHNEE); }
      for (const x of [8, 12, 21]) L(g, x, 15, x + 1, 22 + (x % 5), '#4f8a3a', 1);
    },
  },
  wildnis_leuchtpilz: {
    h: 20, umriss: false, flach: false, zustand: art,
    malen(g, d, { nacht }) {
      const f = [['#6ad8e8', '#b8f4ff'], ['#9ae86a', '#d8ffb0'], ['#e87ad8', '#ffc8f0']][(d.art ?? 0) % 3];
      E(g, 8, 13, 7, 4, mische(f[0], '#000000', 0.3));
      for (const [x, y, r] of [[5, 13, 2.8], [10, 11, 3.4], [12, 15, 2]]) {
        R(g, x - 1, y, 2, 4, '#e8f0e0'); E(g, x, y, r, r * 0.7, f[0]); P(g, x - 1, y - 1, f[1]); P(g, x + 1, y, f[1]);
      }
      if (nacht) { for (const [x, y] of [[3, 7], [14, 6], [8, 3]]) P(g, x, y, f[1]); }
    },
  },
});

