// Bereich „berg" – Pixelkunst: Mineneingang am Berg (mit Geröll, solange die Mine zu ist),
// Zimmerei und Abenteurergilde von außen. (Bäume, Felsen, Theken, Kisten und Kamine der Räume
// sind geteilte Deko aus „basis".)

import { gebaeudeKunst, dach, fensterKasten, tuer, P, R, E, L, POLY, kugel } from '../../sprites.js';

// ─── Mineneingang ───────────────────────────────────────────────────────────

gebaeudeKunst('hoehle', {
  b: 48, h: 32,
  zustand: (s) => ({ offen: !!s.flags.mineOffen }),
  malen(g, { winter, zustand }) {
    E(g, 24, 28, 10, 14, '#140e0c'); R(g, 14, 28, 20, 4, '#140e0c');
    R(g, 12, 8, 4, 24, '#6a4a2a'); R(g, 32, 8, 4, 24, '#6a4a2a'); R(g, 10, 6, 28, 4, '#7a5a32'); R(g, 10, 6, 28, 1, '#9a7a4a');
    if (!zustand.offen) {
      for (const [x, y, r] of [[18, 26, 5], [27, 25, 6], [22, 20, 4], [31, 28, 4], [15, 29, 3]]) kugel(g, x, y, r, r * 0.8, '#8a847a');
    }
    if (winter) R(g, 10, 5, 28, 1, '#ffffff');
  },
});

// ─── Zimmerei ───────────────────────────────────────────────────────────────

gebaeudeKunst('zimmerei', {
  b: 80, h: 80, licht: [[18, 57], [62, 57]],
  malen(g, { winter, nacht }) {
    // Steinsockel
    R(g, 4, 70, 72, 10, '#8a847a'); R(g, 4, 74, 72, 1, '#6e685e');
    for (let x = 8; x < 76; x += 9) R(g, x, 70, 1, 10, '#6e685e');
    // Bretterwand mit Fachwerk
    R(g, 6, 34, 68, 36, '#b88654'); for (let x = 9; x < 74; x += 5) R(g, x, 34, 1, 36, '#9a6c40');
    R(g, 6, 34, 3, 36, '#6a4426'); R(g, 71, 34, 3, 36, '#6a4426'); R(g, 6, 48, 68, 2, '#6a4426');
    dach(g, 0, 38, 80, 38, 6, 12, '#5a6a4a', winter);
    // Schild mit Säge
    R(g, 25, 39, 30, 8, '#6a4426'); R(g, 26, 40, 28, 6, '#e8d8b0');
    R(g, 29, 42, 18, 2, '#9aa0a8'); for (let x = 29; x < 47; x += 2) P(g, x, 44, '#6a6e74'); R(g, 47, 41, 4, 4, '#8a5a32');
    fensterKasten(g, 12, 52, 12, 10, nacht, '#6a4426'); fensterKasten(g, 56, 52, 12, 10, nacht, '#6a4426');
    tuer(g, 33, 54, 14, 26, '#7a5232');
    // Holzstapel neben der Tür
    for (const [x, y] of [[54, 66], [60, 66], [66, 66], [57, 62], [63, 62]]) { E(g, x + 2, y + 2, 2.6, 2.6, '#a8784a'); E(g, x + 2, y + 2, 1.2, 1.2, '#d8b07a'); }
    if (winter) R(g, 54, 61, 16, 1, '#ffffff');
  },
});

// ─── Abenteurergilde ────────────────────────────────────────────────────────

gebaeudeKunst('gilde', {
  b: 80, h: 80, licht: [[15, 51], [65, 51]],
  malen(g, { winter, nacht }) {
    R(g, 4, 32, 72, 48, '#6a6670');
    for (let y = 34; y < 76; y += 6) for (let x = 4 + ((y / 6) % 2) * 6; x < 76; x += 12) R(g, x, y, Math.min(11, 76 - x), 5, '#7a7680');
    R(g, 4, 76, 72, 4, '#4a4650');
    dach(g, 0, 36, 80, 36, 6, 14, '#3a3a4a', winter);
    // Banner mit gekreuzten Schwertern
    R(g, 30, 38, 20, 14, '#8a2a3a'); R(g, 30, 38, 20, 2, '#c8a050'); POLY(g, [[30, 52], [40, 57], [50, 52]], '#8a2a3a');
    L(g, 34, 41, 46, 51, '#d8dce4', 1); L(g, 46, 41, 34, 51, '#d8dce4', 1);
    R(g, 35, 47, 3, 1, '#c8a050'); R(g, 42, 47, 3, 1, '#c8a050');
    fensterKasten(g, 10, 46, 10, 10, nacht, '#3a3a44'); fensterKasten(g, 60, 46, 10, 10, nacht, '#3a3a44');
    // Fackeln
    for (const x of [26, 54]) { R(g, x, 60, 2, 6, '#5a3a24'); E(g, x + 1, 58, 1.6, 2.2, nacht ? '#ffd47a' : '#f2a03a'); }
    tuer(g, 33, 60, 14, 20, '#4a3a2a'); R(g, 33, 64, 14, 1, '#3a3a44'); R(g, 33, 72, 14, 1, '#3a3a44');
  },
});
