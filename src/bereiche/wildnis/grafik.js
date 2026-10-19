// Bereich „wildnis" – Pixelkunst: Lenes Hütte am Strand (vorerst der Fischladen), die
// Strandkörbe, Ranch und Turm im Wald (Platzhalter von außen).
// (Bäume, Büsche, Felsen, Zäune und die Möbel der Räume sind geteilte Deko aus „basis".)

import { gebaeudeKunst, dekoKunst, dach, fensterKasten, tuer, P, R, E, L, POLY } from '../../sprites.js';

gebaeudeKunst('huette', {
  b: 80, h: 64, licht: [[56, 38]],
  malen(g, { winter, nacht }) {
    R(g, 6, 24, 68, 36, '#9a8a6a'); for (let y = 26; y < 60; y += 4) R(g, 6, y, 68, 1, '#7a6a4e');
    for (const x of [8, 28, 50, 70]) R(g, x, 58, 3, 6, '#5a4a3a');
    dach(g, 0, 28, 80, 28, 6, 8, '#5a6a7a', winter);
    tuer(g, 33, 40, 14, 22, '#3a5a7a');
    fensterKasten(g, 52, 32, 10, 8, nacht);
    for (let x = 10; x < 28; x += 3) L(g, x, 30, x + 4, 46, '#d8d0b0', 1);
    for (let y = 32; y < 46; y += 4) L(g, 10, y, 28, y, '#d8d0b0', 1);
    E(g, 64, 50, 4, 4, '#e84a3a'); E(g, 64, 50, 2, 2, '#9a8a6a'); P(g, 60, 50, '#ffffff'); P(g, 68, 50, '#ffffff');
  },
});

dekoKunst('strandkorb', {
  b: 16, h: 24,
  malen(g) {
    R(g, 2, 4, 12, 18, '#e2cfa0'); for (let y = 6; y < 22; y += 2) R(g, 2, y, 12, 1, '#c8b480');
    R(g, 2, 2, 12, 4, '#3a7ac0'); for (const x of [4, 8, 12]) R(g, x, 2, 2, 4, '#f4f0e8');
    R(g, 4, 8, 8, 8, '#2f5f9a'); R(g, 4, 14, 8, 3, '#e8e0c8'); R(g, 2, 22, 12, 2, '#a8946a');
  },
});

// ─── Ranch im Wald ──────────────────────────────────────────────────────────

gebaeudeKunst('ranch', {
  b: 80, h: 76, licht: [[19, 50], [61, 50]],
  malen(g, { winter, nacht }) {
    R(g, 6, 32, 68, 44, '#a8443a'); for (let x = 10; x < 72; x += 6) R(g, x, 32, 1, 44, '#8a3630');
    R(g, 6, 32, 3, 44, '#efe6d6'); R(g, 71, 32, 3, 44, '#efe6d6'); R(g, 6, 72, 68, 4, '#6a4a3a');
    dach(g, 0, 36, 80, 36, 4, 12, '#6a4a3a', winter);
    // Heuluke im Giebel
    R(g, 34, 37, 12, 9, '#efe6d6'); R(g, 35, 38, 10, 7, '#5a3a24'); R(g, 36, 41, 8, 4, '#e8c860'); P(g, 38, 40, '#e8c860'); P(g, 42, 40, '#e8c860');
    fensterKasten(g, 14, 46, 10, 8, nacht); fensterKasten(g, 56, 46, 10, 8, nacht);
    // Stalltor mit Kreuzstreben
    R(g, 31, 54, 18, 22, '#efe6d6'); R(g, 33, 56, 14, 20, '#8a3630');
    L(g, 33, 56, 46, 75, '#efe6d6', 1); L(g, 46, 56, 33, 75, '#efe6d6', 1);
    // Schild mit Kuhflecken
    R(g, 54, 58, 12, 8, '#f4f0e8'); E(g, 57.5, 61, 2, 1.5, '#2a2a30'); E(g, 62.5, 63, 1.5, 1, '#2a2a30'); R(g, 59, 66, 2, 4, '#6a4a3a');
  },
});

// ─── Turm des Einsiedlers ───────────────────────────────────────────────────

gebaeudeKunst('turm', {
  b: 48, h: 88, licht: [[24, 38], [15, 58]],
  malen(g, { winter, nacht }) {
    R(g, 6, 26, 36, 62, '#8a8478');
    for (let y = 28; y < 86; y += 5) for (let x = 6 + ((y / 5) % 2) * 4; x < 42; x += 8) R(g, x, y, Math.min(7, 42 - x), 4, '#9a9488');
    R(g, 6, 26, 2, 62, '#6e685e'); R(g, 40, 26, 2, 62, '#6e685e');
    POLY(g, [[24, 1], [1, 30], [47, 30]], '#4a3a6a');
    for (let y = 8; y < 30; y += 5) L(g, 24 - (y - 1) * 0.79, y, 24 + (y - 1) * 0.79, y, '#3a2c58', 1);
    L(g, 24, 2, 4, 29, '#6a5a8a', 1);
    if (winter) POLY(g, [[24, 1], [14, 14], [34, 14]], '#f2f6fa');
    P(g, 24, 0, '#f2c94c'); P(g, 23, 1, '#f2c94c'); P(g, 25, 1, '#f2c94c');
    fensterKasten(g, 20, 34, 8, 8, nacht); fensterKasten(g, 12, 54, 6, 8, nacht);
    tuer(g, 17, 70, 14, 18, '#5a3a24');
  },
});
