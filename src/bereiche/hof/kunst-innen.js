// Bereich „hof" – Pixelkunst der Wohnhaus-Einrichtung: Fenster mit Vorhängen, Sofa, Esstisch, Küchenzeile,
// Regal, Kommode, Schrank, Betten, Wiege, Spielzeug, Lampen und der Kühlschrank (Objekt). Nachts
// leuchten Lampen und die Vorhänge zeigen das Dunkel draußen.

import { dekoKunst, objektKunst, P, R, E, L, POLY, hell, dunkel } from '../../sprites.js';
import { hash } from '../../zufall.js';

const HOLZ = '#a8784a';
const HOLZ_L = '#c8986a';
const HOLZ_D = '#7a5232';
const HOLZ_DD = '#4a2e18';

/** Sterne und Wolken im Fensterausschnitt. */
function himmel(g, x, y, b, h, nacht, seed) {
  if (nacht) {
    R(g, x, y, b, h, '#22305a');
    R(g, x, y + h - 3, b, 3, '#1a2442');
    for (let i = 0; i < 4; i++) P(g, x + 1 + Math.floor(hash(seed, i, 1) * (b - 2)), y + 1 + Math.floor(hash(seed, i, 2) * (h - 5)), '#f8f0c0');
  } else {
    R(g, x, y, b, h, '#9ad0f0'); R(g, x, y, b, 2, '#8ac0e8');
    R(g, x, y + h - 3, b, 3, '#6aa850'); E(g, x + b * 0.7, y + h - 3, b * 0.4, 2, '#78b85c');
    E(g, x + 4 + (seed % 5), y + 3, 3, 1.4, '#ffffff'); E(g, x + 6 + (seed % 5), y + 2.6, 2, 1.2, '#f0f8ff');
  }
}

dekoKunst({
  /** Fenster in der Wand mit Vorhängen (1–3 Felder breit). */
  hof_fenster: {
    umriss: false, h: 16,
    malen(g, d, { nacht, w }) {
      const x0 = 5;
      const b = w - 10;
      R(g, x0 - 1, 1, b + 2, 12, '#f0e8d8');
      himmel(g, x0, 2, b, 10, nacht, d.x);
      const m = Math.floor(b / 2);
      R(g, x0 + m - 1, 2, 2, 10, '#f0e8d8'); R(g, x0, 6, b, 1, '#f0e8d8');
      R(g, x0 - 2, 12, b + 4, 2, HOLZ); R(g, x0 - 2, 12, b + 4, 1, HOLZ_L); R(g, x0 - 2, 14, b + 4, 1, HOLZ_D);
      const vorhang = nacht ? '#a8453f' : '#c84a3a';
      for (const [vx, vb] of [[0, 5], [w - 5, 5]]) {
        R(g, vx, 0, vb, 13, vorhang); R(g, vx + 1, 0, 1, 13, hell(vorhang, 0.25)); R(g, vx + vb - 1, 0, 1, 13, dunkel(vorhang, 0.3));
        R(g, vx, 7, vb, 1, dunkel(vorhang, 0.35));
      }
      R(g, 0, 0, w, 1, HOLZ_D);
    },
  },

  /** Große Glaswand im Gewächshaus. */
  hof_glasscheibe: {
    umriss: false, h: 16,
    malen(g, d, { nacht, w }) {
      R(g, 1, 0, w - 2, 14, '#f4f4ea');
      himmel(g, 3, 1, w - 6, 11, nacht, d.x + 3);
      for (let x = 3 + 12; x < w - 4; x += 12) R(g, x, 1, 1, 11, '#f4f4ea');
      R(g, 1, 6, w - 2, 1, '#f4f4ea');
      R(g, 1, 12, w - 2, 2, '#c8d0c8');
      R(g, 1, 14, w - 2, 1, '#8a9a90');
    },
  },

  hof_nachttisch: {
    b: 16, h: 27,
    malen(g, d, { nacht }) {
      R(g, 2, 17, 12, 9, HOLZ); R(g, 2, 17, 12, 1, HOLZ_L); R(g, 13, 17, 1, 9, HOLZ_D);
      R(g, 3, 20, 10, 5, '#8a5a32'); R(g, 3, 20, 10, 1, HOLZ_D); P(g, 8, 22, '#f2c94c'); P(g, 8, 23, '#c8a030');
      R(g, 3, 26, 2, 1, HOLZ_DD); R(g, 11, 26, 2, 1, HOLZ_DD);
      R(g, 7, 13, 2, 4, '#6a6a74'); R(g, 5, 16, 6, 1, '#4a4a52');
      POLY(g, [[3, 13], [13, 13], [11, 5], [5, 5]], nacht ? '#ffe9a0' : '#f2d8a0');
      R(g, 5, 5, 6, 1, hell(nacht ? '#ffe9a0' : '#f2d8a0', 0.4)); R(g, 3, 12, 10, 1, dunkel('#f2d8a0', 0.2));
      if (nacht) { R(g, 6, 7, 4, 4, '#fff6c8'); }
    },
  },

  hof_stehlampe: {
    b: 16, h: 34,
    malen(g, d, { nacht }) {
      R(g, 7, 12, 2, 20, '#4a4a52'); R(g, 7, 12, 1, 20, '#6a6a74');
      E(g, 8, 32, 4.5, 1.6, '#3a3a42');
      const f = nacht ? '#ffe9a0' : '#f4e4b8';
      POLY(g, [[2, 12], [14, 12], [11, 2], [5, 2]], f);
      R(g, 5, 2, 6, 1, hell(f, 0.45)); R(g, 2, 11, 12, 1, dunkel(f, 0.25)); R(g, 12, 3, 1, 8, dunkel(f, 0.12));
      if (nacht) { R(g, 6, 4, 4, 6, '#fff8d8'); }
    },
  },

  /** Sofa (3 Felder breit), von hinten gesehen: Rückenlehne vorn, die Sitzpolster dahinter. */
  hof_sofa: {
    b: 48, h: 28,
    malen(g, d, { w }) {
      const f = '#5a7aa8';
      const fd = dunkel(f, 0.28);
      const fh = hell(f, 0.28);
      R(g, 1, 3, w - 2, 7, hell(f, 0.12));                       // Sitzfläche (von oben)
      for (let x = 4; x < w - 3; x += Math.floor((w - 8) / 3)) R(g, x, 3, 1, 7, fd);
      R(g, 0, 2, 5, 25, fd); R(g, w - 5, 2, 5, 25, fd);          // Armlehnen
      R(g, 0, 2, 5, 3, fh); R(g, w - 5, 2, 5, 3, fh);
      R(g, 5, 9, w - 10, 15, f);                                 // Rückenlehne
      R(g, 5, 9, w - 10, 2, fh);
      for (let x = 10; x < w - 8; x += 12) { R(g, x, 12, 1, 10, fd); }
      R(g, 5, 22, w - 10, 3, fd);
      R(g, 2, 26, 3, 2, HOLZ_DD); R(g, w - 5, 26, 3, 2, HOLZ_DD);
      // Kissen
      R(g, 8, 6, 8, 6, '#e8c870'); R(g, 8, 6, 8, 1, '#f4dc90'); P(g, 12, 9, '#c8a030');
    },
  },

  /** Esstisch (2 Felder breit) mit zwei Stühlen, Läufer und Obstschale. */
  hof_esstisch: {
    b: 32, h: 28,
    malen(g) {
      // Stühle
      R(g, 0, 10, 4, 13, HOLZ_D); R(g, 0, 10, 4, 2, HOLZ); R(g, 1, 20, 3, 6, HOLZ_DD);
      R(g, 28, 10, 4, 13, HOLZ_D); R(g, 28, 10, 4, 2, HOLZ); R(g, 28, 20, 3, 6, HOLZ_DD);
      // Beine
      R(g, 5, 20, 3, 7, HOLZ_DD); R(g, 24, 20, 3, 7, HOLZ_DD);
      // Platte
      R(g, 3, 6, 26, 14, HOLZ); R(g, 3, 6, 26, 1, HOLZ_L); R(g, 3, 18, 26, 2, HOLZ_D); R(g, 28, 7, 1, 11, HOLZ_D);
      // Läufer
      R(g, 6, 8, 20, 9, '#f4f0e8');
      for (let x = 6; x < 26; x += 4) { R(g, x, 8, 2, 9, '#c84a3a'); }
      for (let y = 8; y < 17; y += 4) { R(g, 6, y, 20, 2, 'rgba(200,74,58,0.5)'); }
      // Obstschale
      E(g, 16, 11, 5, 2.4, '#8a5a32'); E(g, 16, 10.5, 4.2, 1.8, '#a8784a');
      E(g, 14, 9, 2, 1.8, '#d8302a'); E(g, 17, 8.6, 2, 1.8, '#f2c94c'); E(g, 18.5, 10, 1.6, 1.4, '#7cc25a'); P(g, 14, 8, '#f08a7a');
    },
  },

  /** Küchenzeile: Unterschränke mit Arbeitsplatte und Fliesenspiegel; je Feld eine andere Kleinigkeit. */
  hof_kuechenzeile: {
    b: (d) => (d.w || 1) * 16, h: 28,
    malen(g, d, { w }) {
      const n = Math.round(w / 16);
      // Fliesenspiegel
      R(g, 0, 2, w, 8, '#e8f0f4');
      for (let x = 0; x < w; x += 4) R(g, x, 2, 1, 8, '#c8d6dc');
      for (let y = 5; y < 10; y += 4) R(g, 0, y, w, 1, '#c8d6dc');
      R(g, 0, 2, w, 1, '#6a8aa8'); R(g, 0, 10, w, 1, '#8aa0b0');
      // Unterschrank
      R(g, 0, 14, w, 13, '#c8a070'); R(g, 0, 14, w, 1, HOLZ_L);
      for (let i = 0; i < n; i++) {
        R(g, i * 16 + 1, 17, 14, 9, '#b08a58'); R(g, i * 16 + 1, 17, 14, 1, '#d2b080'); R(g, i * 16 + 14, 17, 1, 9, '#8a6a40');
        R(g, i * 16 + 11, 20, 2, 1, '#f2c94c');
      }
      R(g, 0, 26, w, 2, HOLZ_DD);
      // Arbeitsplatte
      R(g, 0, 11, w, 4, '#efe9dc'); R(g, 0, 11, w, 1, '#ffffff'); R(g, 0, 14, w, 1, '#b8ac98');
      // Kleinigkeiten
      for (let i = 0; i < n; i++) {
        const x = i * 16;
        const art = Math.floor(hash(d.x + i, d.y, 9) * 4);
        if (art === 0) { R(g, x + 3, 7, 10, 4, '#9aa8b4'); R(g, x + 4, 8, 8, 2, '#5a7a90'); R(g, x + 8, 4, 1, 4, '#c8ccd2'); R(g, x + 8, 4, 3, 1, '#c8ccd2'); }
        else if (art === 1) { R(g, x + 3, 9, 10, 2, '#a8784a'); R(g, x + 4, 8, 7, 1, '#c8986a'); L(g, x + 12, 9, x + 14, 6, '#c8ccd2', 1); }
        else if (art === 2) { R(g, x + 4, 6, 8, 5, '#4a4a52'); R(g, x + 3, 5, 10, 1, '#6a6a74'); R(g, x + 12, 7, 2, 1, '#4a4a52'); }
        else { E(g, x + 8, 9, 4, 2, '#8a5a32'); E(g, x + 7, 8, 2, 1.4, '#e8c070'); E(g, x + 10, 8, 2, 1.4, '#d29a5a'); }
      }
    },
  },

  /** Bücherregal (1–3 Felder breit). */
  hof_buecherregal: {
    b: (d) => (d.w || 1) * 16, h: 38,
    malen(g, d, { w }) {
      R(g, 0, 2, w, 36, HOLZ_D); R(g, 0, 2, w, 2, '#9a6a3a'); R(g, 0, 1, w, 1, HOLZ_L);
      R(g, 2, 5, w - 4, 31, '#3e2818');
      const farben = ['#c84a3a', '#4a7ac0', '#e8c070', '#4f9a3a', '#8a5aa8', '#f4f0e0', '#d8742f', '#2a6a6a'];
      for (let r = 0; r < 3; r++) {
        const y = 5 + r * 10.5;
        let x = 3;
        while (x < w - 5) {
          const bb = 2 + Math.floor(hash(x, y, r) * 2);
          const hh = 6 + Math.floor(hash(x, y, r + 5) * 4);
          const f = farben[Math.floor(hash(x, y, r + 9) * farben.length)];
          if (hash(x, y, 3) < 0.12) { x += 4; continue; }
          R(g, x, y + 9 - hh, bb, hh, f); R(g, x, y + 9 - hh, 1, hh, hell(f, 0.3)); P(g, x + bb - 1, y + 3, dunkel(f, 0.3));
          x += bb;
        }
        R(g, 1, y + 9, w - 2, 2, HOLZ); R(g, 1, y + 9, w - 2, 1, HOLZ_L);
      }
      if (w >= 32) { R(g, w - 12, 15, 6, 5, '#f0e8d8'); R(g, w - 11, 16, 4, 3, '#9ad0f0'); }
      R(g, 0, 36, w, 2, HOLZ_DD);
    },
  },

  hof_kommode: {
    b: 16, h: 26,
    malen(g, d) {
      R(g, 1, 12, 14, 13, HOLZ); R(g, 0, 11, 16, 2, HOLZ_L); R(g, 14, 12, 1, 13, HOLZ_D);
      for (const y of [14, 20]) { R(g, 2, y, 12, 5, '#8a5a32'); R(g, 2, y, 12, 1, HOLZ_D); R(g, 7, y + 2, 2, 1, '#f2c94c'); }
      R(g, 2, 25, 2, 1, HOLZ_DD); R(g, 12, 25, 2, 1, HOLZ_DD);
      R(g, 2, 4, 5, 7, '#f0e8d8'); R(g, 3, 5, 3, 5, hash(d.x, d.y, 1) < 0.5 ? '#9ad0f0' : '#f2c8a0');
      E(g, 12, 8, 2.2, 2.6, '#5a7aa8'); L(g, 12, 6, 12, 2, '#4f9a3a', 1); P(g, 12, 1, '#e8506a'); P(g, 11, 2, '#f2d24a'); P(g, 13, 3, '#e8506a');
    },
  },

  hof_schrank: {
    b: 32, h: 44,
    malen(g) {
      R(g, 1, 6, 30, 36, '#8a5a32'); R(g, 0, 2, 32, 5, HOLZ); R(g, 0, 2, 32, 1, HOLZ_L); R(g, 0, 6, 32, 1, HOLZ_D);
      for (const x of [3, 17]) {
        R(g, x, 9, 12, 30, HOLZ_D); R(g, x + 1, 10, 10, 28, '#9a6a3a');
        R(g, x + 2, 12, 8, 11, '#a87848'); R(g, x + 2, 26, 8, 9, '#a87848');
        R(g, x + 2, 12, 8, 1, HOLZ_L); R(g, x + 2, 26, 8, 1, HOLZ_L);
      }
      R(g, 14, 22, 1, 3, '#f2c94c'); R(g, 17, 22, 1, 3, '#f2c94c');
      R(g, 2, 42, 4, 2, HOLZ_DD); R(g, 26, 42, 4, 2, HOLZ_DD); R(g, 15, 9, 2, 30, HOLZ_DD);
    },
  },

  /** Doppelbett (3×2 Felder). */
  hof_doppelbett: {
    b: 48, h: 32, flach: true,
    malen(g) {
      R(g, 1, 0, 46, 7, HOLZ_D); R(g, 1, 0, 46, 1, '#9a6a3a'); R(g, 3, 1, 42, 5, '#8a5a32');
      R(g, 2, 6, 44, 25, '#8a5a32');
      R(g, 3, 6, 42, 8, '#f4f0e8');
      R(g, 5, 7, 17, 6, '#ffffff'); R(g, 26, 7, 17, 6, '#ffffff'); R(g, 5, 12, 17, 1, '#e0dcd0'); R(g, 26, 12, 17, 1, '#e0dcd0');
      R(g, 3, 14, 42, 16, '#c85a4a');
      for (let y = 16; y < 30; y += 4) for (let x = 5 + ((y / 4) % 2) * 3; x < 44; x += 6) { R(g, x, y, 3, 2, '#e8c070'); P(g, x + 1, y - 1, '#e8c070'); }
      R(g, 3, 14, 42, 1, '#e8806a'); R(g, 3, 29, 42, 1, '#8a3a30');
    },
  },

  /** Kinderbett (1×2 Felder). */
  hof_kinderbett: {
    b: 16, h: 32, flach: true,
    malen(g) {
      R(g, 1, 0, 14, 31, '#d8b078'); R(g, 1, 0, 14, 4, '#f2c94c'); R(g, 1, 0, 14, 1, '#f8dc78'); R(g, 1, 3, 14, 1, '#c8a030');
      R(g, 2, 4, 12, 26, '#d8b078');
      R(g, 3, 5, 10, 7, '#f4f0e8'); R(g, 4, 6, 8, 5, '#ffffff');
      R(g, 3, 12, 10, 17, '#6aa8d8');
      for (const [x, y] of [[5, 15], [9, 18], [6, 22], [10, 25]]) { P(g, x, y, '#f2d24a'); P(g, x + 1, y, '#f2d24a'); P(g, x, y + 1, '#f2d24a'); }
      R(g, 3, 12, 10, 1, '#8ac4f0'); R(g, 3, 29, 10, 1, '#4a88b8');
      E(g, 8, 8, 2, 1.6, '#c8926a'); P(g, 7, 7, '#3a2a1a'); P(g, 9, 7, '#3a2a1a');
    },
  },

  hof_wiege: {
    b: 16, h: 20,
    malen(g) {
      E(g, 8, 12, 7, 5, '#8a5a32'); E(g, 8, 11, 6.2, 4.2, HOLZ);
      R(g, 2, 6, 12, 5, '#f4c8d4'); R(g, 2, 6, 12, 1, '#fce4ec'); E(g, 8, 7, 3, 1.6, '#f8f0e8');
      POLY(g, [[2, 8], [2, 3], [6, 2], [6, 8]], '#f4f0e8'); R(g, 2, 3, 4, 1, '#ffffff');
      L(g, 2, 17, 14, 17, HOLZ_DD, 1); P(g, 1, 16, HOLZ_DD); P(g, 14, 16, HOLZ_DD);
      P(g, 9, 6, '#f2d24a'); P(g, 11, 7, '#f2d24a');
    },
  },

  hof_schaukelpferd: {
    b: 16, h: 24,
    malen(g) {
      L(g, 1, 21, 15, 21, HOLZ_D, 2); L(g, 2, 22, 14, 22, HOLZ_DD, 1);
      R(g, 4, 14, 2, 7, HOLZ_D); R(g, 10, 14, 2, 7, HOLZ_D);
      E(g, 8, 12, 6, 3.4, '#c8926a'); E(g, 7, 11, 4, 2, '#dcae84');
      POLY(g, [[11, 9], [14, 4], [15, 8], [13, 11]], '#c8926a');
      E(g, 13, 5, 2.2, 1.8, '#c8926a'); P(g, 14, 4, '#2b1d1c'); P(g, 15, 6, '#8a5a32');
      L(g, 11, 4, 9, 9, '#4a2e18', 2); L(g, 3, 10, 1, 14, '#4a2e18', 1);
      R(g, 6, 8, 4, 2, '#c84a3a'); L(g, 12, 7, 12, 9, '#8a5a32', 1);
    },
  },

  /** Spielzeugkiste (2 Felder breit) mit Bauklötzen und Ball. */
  hof_spielzeug: {
    b: 32, h: 20,
    malen(g) {
      R(g, 1, 8, 14, 11, '#c84a3a'); R(g, 1, 8, 14, 2, '#e0705a'); R(g, 1, 14, 14, 1, '#8a3a30'); R(g, 7, 12, 2, 3, '#f2c94c');
      R(g, 0, 7, 16, 2, '#a83a30');
      R(g, 3, 3, 4, 4, '#4a7ac0'); R(g, 3, 3, 4, 1, '#7aa6e8'); R(g, 8, 4, 4, 3, '#f2d24a'); R(g, 8, 4, 4, 1, '#f8e88a');
      E(g, 24, 15, 3.4, 3.4, '#e8506a'); L(g, 21, 14, 27, 14, '#f4f0e8', 1); P(g, 23, 13, '#ffffff');
      R(g, 18, 15, 3, 4, '#4f9a3a'); R(g, 28, 16, 3, 3, '#f2d24a'); R(g, 18, 15, 3, 1, '#7cc25a');
      L(g, 17, 18, 31, 18, 'rgba(0,0,0,0.18)', 1);
    },
  },
});

// ─── Kühlschrank (Objekt in der Küche) ──────────────────────────────────────

objektKunst('kuehlschrank', {
  b: 16, h: 34,
  malen(g) {
    const f = '#e8eef0';
    R(g, 1, 2, 14, 31, f); R(g, 1, 2, 14, 2, '#ffffff'); R(g, 13, 3, 2, 30, '#b8c4ca'); R(g, 1, 32, 14, 1, '#8a9aa4');
    R(g, 1, 12, 13, 1, '#8a9aa4'); R(g, 1, 13, 13, 1, '#ffffff');
    R(g, 11, 6, 1, 4, '#6a7a84'); R(g, 11, 16, 1, 10, '#6a7a84');
    R(g, 3, 6, 4, 4, '#f2c94c'); P(g, 4, 7, '#c84a3a');
    R(g, 3, 17, 5, 5, '#f4f0e0'); R(g, 4, 18, 3, 1, '#c84a3a'); R(g, 4, 20, 3, 1, '#4a7ac0');
    R(g, 2, 33, 2, 1, HOLZ_DD); R(g, 12, 33, 2, 1, HOLZ_DD);
  },
});
