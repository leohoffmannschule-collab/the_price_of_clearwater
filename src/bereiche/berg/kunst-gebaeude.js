// Bereich „berg" – Pixelkunst: Mineneingang (mit Geröll, solange die Mine zu ist), Zimmerei und
// Abenteurergilde von außen.

import { gebaeudeKunst, dach, fensterKasten, tuer, schrift, P, R, E, L, POLY, kugel } from '../../sprites.js';

// ─── Mineneingang ───────────────────────────────────────────────────────────

gebaeudeKunst('hoehle', {
  b: 48, h: 32, licht: [[11, 13], [37, 13]],
  zustand: (s) => ({ offen: !!s.flags.mineOffen }),
  malen(g, { winter, nacht, zustand }) {
    // Steinfassung mit Fugen
    R(g, 6, 5, 36, 27, '#7d7a86'); R(g, 6, 5, 36, 2, '#9a97a4');
    for (let y = 8; y < 32; y += 5) { R(g, 6, y, 36, 1, '#66636f'); for (let x = 6 + ((y / 5) % 2) * 5; x < 42; x += 10) R(g, x, y, 1, 5, '#66636f'); }
    // Bogenöffnung
    R(g, 13, 14, 22, 18, '#140e0c'); E(g, 24, 15, 11, 7, '#140e0c');
    E(g, 24, 15, 12, 8, '#4e4c58'); E(g, 24, 15, 10.5, 6.8, '#140e0c'); R(g, 13, 15, 22, 17, '#140e0c');
    R(g, 14, 20, 20, 12, '#0c0806'); // tiefer Schatten
    // Stützen und Balken
    R(g, 11, 12, 4, 20, '#6a4a2a'); R(g, 33, 12, 4, 20, '#6a4a2a'); R(g, 11, 12, 1, 20, '#9a7a4a'); R(g, 33, 12, 1, 20, '#9a7a4a');
    R(g, 10, 9, 28, 4, '#7a5a32'); R(g, 10, 9, 28, 1, '#9a7a4a'); R(g, 10, 12, 28, 1, '#4e3418');
    for (const x of [14, 22, 30]) P(g, x, 10, '#4e3418');
    // Schild „MINE"
    R(g, 15, 1, 18, 8, '#5a3a22'); R(g, 15, 1, 18, 1, '#8a6a42'); R(g, 15, 8, 18, 1, '#3e2814');
    schrift(g, 'MINE', 17, 2, '#f2e2b8');
    R(g, 17, 9, 1, 1, '#2e2e36'); R(g, 30, 9, 1, 1, '#2e2e36');
    // Laternen an den Stützen
    for (const x of [9, 36]) {
      R(g, x, 12, 3, 5, '#2e2e36'); R(g, x + 1, 13, 1, 3, nacht ? '#ffe28a' : '#e0d6a8'); R(g, x, 11, 3, 1, '#2e2e36');
    }
    if (!zustand.offen) {
      for (const [x, y, r] of [[18, 28, 5], [27, 27, 6], [22, 22, 4.5], [31, 30, 4], [15, 30, 3.5], [25, 31, 5], [20, 17, 3.2], [29, 20, 3.4]]) kugel(g, x, y, r, r * 0.8, '#8a847a');
      for (const [x, y] of [[13, 25], [34, 24], [24, 18]]) kugel(g, x, y, 2.4, 2, '#9a948a');
    } else {
      // Schienen führen hinein
      R(g, 19, 29, 1, 3, '#6a6a72'); R(g, 28, 29, 1, 3, '#6a6a72');
      for (let y = 24; y < 32; y += 3) R(g, 17, y, 14, 1, '#4e3418');
    }
    if (winter) {
      R(g, 10, 8, 28, 1, '#ffffff'); R(g, 15, 0, 18, 1, '#ffffff'); R(g, 6, 4, 36, 1, '#ffffff');
      for (const x of [14, 26, 34]) R(g, x, 13, 2, 3, '#e8f4fa');
    }
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
    // Schornstein auf dem Dach, darüber Rauch
    R(g, 58, 7, 9, 15, '#8a847a'); R(g, 58, 7, 9, 2, '#a8a29a'); R(g, 66, 9, 1, 13, '#6e685e'); R(g, 56, 5, 13, 3, '#6e685e'); R(g, 56, 5, 13, 1, '#8a847a');
    for (let y = 11; y < 21; y += 4) R(g, 58, y, 9, 1, '#6e685e');
    for (const [x, y, r, a] of [[62, 3, 2.6, 0.9], [66, 1, 2.2, 0.6]]) { g.globalAlpha = a; E(g, x, y, r, r * 0.8, '#e2e0dc'); g.globalAlpha = 1; }
    // Schild mit Säge
    R(g, 25, 39, 30, 8, '#6a4426'); R(g, 26, 40, 28, 6, '#e8d8b0');
    R(g, 29, 42, 18, 2, '#9aa0a8'); for (let x = 29; x < 47; x += 2) P(g, x, 44, '#6a6e74'); R(g, 47, 41, 4, 4, '#8a5a32');
    // Fenster mit Läden und Blumenkasten
    for (const x of [12, 56]) {
      fensterKasten(g, x, 52, 12, 10, nacht, '#6a4426');
      R(g, x - 4, 51, 3, 12, '#4f7a4a'); R(g, x + 13, 51, 3, 12, '#4f7a4a');
      R(g, x - 1, 63, 14, 3, '#6a4426');
      if (!winter) for (const dx of [0, 3, 6, 9]) { P(g, x + dx, 62, ['#e8506a', '#f2d24a', '#f4f0f8', '#ec97be'][dx % 4]); P(g, x + dx + 1, 63, '#4f9a3a'); }
    }
    tuer(g, 33, 54, 14, 26, '#7a5232');
    // Holzstapel und Bretter neben der Tür
    for (const [x, y] of [[54, 66], [60, 66], [66, 66], [57, 62], [63, 62]]) { E(g, x + 2, y + 2, 2.6, 2.6, '#a8784a'); E(g, x + 2, y + 2, 1.2, 1.2, '#d8b07a'); }
    for (let i = 0; i < 4; i++) L(g, 8 + i * 2, 76, 14 + i * 2, 56, i % 2 ? '#c8986a' : '#a8784a', 2);
    if (winter) { R(g, 54, 61, 16, 1, '#ffffff'); R(g, 56, 5, 13, 1, '#ffffff'); }
  },
});

// ─── Abenteurergilde ────────────────────────────────────────────────────────

gebaeudeKunst('gilde', {
  b: 80, h: 80, licht: [[15, 51], [65, 51], [27, 59], [53, 59]],
  malen(g, { winter, nacht }) {
    R(g, 4, 32, 72, 48, '#6a6670');
    for (let y = 34; y < 76; y += 6) for (let x = 4 + ((y / 6) % 2) * 6; x < 76; x += 12) R(g, x, y, Math.min(11, 76 - x), 5, '#7a7680');
    R(g, 4, 76, 72, 4, '#4a4650');
    dach(g, 0, 36, 80, 36, 6, 14, '#3a3a4a', winter);
    // Wimpel auf dem Dach
    R(g, 39, 0, 2, 12, '#5a3a24'); POLY(g, [[41, 1], [52, 4], [41, 8]], '#b8303a'); R(g, 41, 1, 11, 1, '#e0606a');
    // Banner mit gekreuzten Schwertern
    R(g, 30, 38, 20, 14, '#8a2a3a'); R(g, 30, 38, 20, 2, '#c8a050'); POLY(g, [[30, 52], [40, 57], [50, 52]], '#8a2a3a');
    L(g, 34, 41, 46, 51, '#d8dce4', 1); L(g, 46, 41, 34, 51, '#d8dce4', 1);
    R(g, 35, 47, 3, 1, '#c8a050'); R(g, 42, 47, 3, 1, '#c8a050');
    fensterKasten(g, 10, 46, 10, 10, nacht, '#3a3a44'); fensterKasten(g, 60, 46, 10, 10, nacht, '#3a3a44');
    // Fackeln
    for (const x of [26, 54]) { R(g, x, 60, 2, 6, '#5a3a24'); E(g, x + 1, 58, 1.6, 2.2, nacht ? '#ffd47a' : '#f2a03a'); P(g, x + 1, 57, '#fff3b0'); }
    tuer(g, 33, 60, 14, 20, '#4a3a2a'); R(g, 33, 64, 14, 1, '#3a3a44'); R(g, 33, 72, 14, 1, '#3a3a44');
    // Schwerter an der Wand neben dem Fenster, Schild über der Tür
    R(g, 14, 62, 10, 1, '#5a3a24'); L(g, 15, 62, 15, 72, '#c8ccd2', 1); L(g, 18, 62, 18, 70, '#a8acb2', 1); L(g, 21, 62, 21, 71, '#c8ccd2', 1);
    R(g, 14, 70, 3, 1, '#8a6a32'); R(g, 17, 69, 3, 1, '#8a6a32'); R(g, 20, 70, 3, 1, '#8a6a32');
    if (winter) { R(g, 30, 37, 20, 1, '#ffffff'); R(g, 38, 0, 4, 1, '#ffffff'); }
  },
});
