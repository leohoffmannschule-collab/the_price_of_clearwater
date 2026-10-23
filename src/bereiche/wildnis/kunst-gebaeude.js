// Bereich „wildnis" – Gebäude: Lenes Fischladen (huette), Hütte von Mats, Leuchtturm,
// Ranch mit Scheune, Turm des Einsiedlers und die Holzfällerhütte.

import { gebaeudeKunst, dach, fensterKasten, tuer, schrift, P, R, E, L, POLY, hell, dunkel } from '../../sprites.js';

/** Waagerechte Bretter mit Fugen. */
function bretter(g, x, y, w, h, f, abstand = 4) {
  R(g, x, y, w, h, f);
  for (let yy = y + abstand - 1; yy < y + h; yy += abstand) R(g, x, yy, w, 1, dunkel(f, 0.22));
  R(g, x, y, w, 1, hell(f, 0.16));
}
/** Senkrechte Bretter. */
function latten(g, x, y, w, h, f, abstand = 4) {
  R(g, x, y, w, h, f);
  for (let xx = x + abstand - 1; xx < x + w; xx += abstand) R(g, xx, y, 1, h, dunkel(f, 0.22));
}

// ─── Lenes Fischladen ───────────────────────────────────────────────────────

gebaeudeKunst('huette', {
  b: 96, h: 80, licht: [[20, 54], [76, 54]],
  malen(g, { winter, nacht }) {
    // Pfähle und Sockel
    R(g, 6, 70, 84, 8, '#6a6a72'); for (let x = 8; x < 90; x += 8) R(g, x, 71, 1, 7, '#56565e');
    bretter(g, 6, 26, 84, 46, '#8da4b4', 4);
    R(g, 6, 26, 3, 46, dunkel('#8da4b4', 0.15)); R(g, 87, 26, 3, 46, dunkel('#8da4b4', 0.15));
    // Dach mit Schornstein
    R(g, 66, 4, 9, 16, '#8a5a48'); R(g, 66, 4, 9, 2, '#a8745c'); R(g, 64, 2, 13, 3, '#5a5a62');
    dach(g, 0, 30, 96, 30, 4, 16, '#3e6a8a', winter);
    // Schild über der Tür
    R(g, 39, 35, 34, 12, '#4a3020'); R(g, 40, 36, 32, 10, '#7a5230'); R(g, 40, 36, 32, 1, '#a07848');
    schrift(g, 'ANGELN', 44, 39, '#f6ecd0');
    // Fisch als Zeichen
    E(g, 15, 40, 5, 3, '#e8c34a'); POLY(g, [[19, 40], [24, 36], [24, 44]], '#e8c34a'); P(g, 11, 39, '#2b1d1c'); R(g, 14, 40, 3, 1, '#f2e8a0');
    // Tür, Fenster
    tuer(g, 49, 50, 14, 28, '#c8553d');
    fensterKasten(g, 14, 48, 18, 14, nacht, '#f4f0e8'); fensterKasten(g, 70, 48, 18, 14, nacht, '#f4f0e8');
    R(g, 12, 62, 22, 3, '#6a4426'); R(g, 68, 62, 22, 3, '#6a4426');
    if (!nacht) { E(g, 20, 59, 2, 1.5, '#e8506a'); E(g, 26, 59, 2, 1.5, '#f2d24a'); E(g, 78, 59, 2, 1.5, '#7cc25a'); E(g, 84, 59, 2, 1.5, '#e5872a'); }
    // Rettungsring und Kork-Bojen
    E(g, 42, 58, 5, 5, '#f4f0e8'); E(g, 42, 58, 2.4, 2.4, '#8da4b4');
    for (const [x, y] of [[38, 56], [46, 60]]) R(g, x, y, 2, 2, '#e04a3a');
    for (const x of [74, 79, 84]) { E(g, x, 28, 1.8, 2.2, '#e04a3a'); R(g, x, 25, 1, 3, '#2b1d1c'); }
    // Netz am Rand
    for (let y = 33; y < 70; y += 4) L(g, 8, y, 13, y + 3, '#d8d0b0', 1);
    for (let x = 8; x < 13; x += 2) L(g, x, 31, x + 2, 70, '#d8d0b0', 1);
  },
});

// ─── Die Hütte von Mats ─────────────────────────────────────────────────────

gebaeudeKunst('wildnis_matshuette', {
  b: 80, h: 64, licht: [[22, 40], [60, 40]],
  malen(g, { winter, nacht }) {
    latten(g, 6, 22, 68, 40, '#b4986a', 4);
    R(g, 6, 22, 68, 2, hell('#b4986a', 0.2));
    R(g, 6, 58, 68, 5, '#6a5a44'); for (let x = 8; x < 74; x += 6) R(g, x, 59, 1, 4, '#4a3e2e');
    // Segeltuch-Dach: blau-weiß gestreift
    POLY(g, [[0, 26], [80, 26], [66, 4], [14, 4]], '#f0ece0');
    for (let i = 0; i < 9; i += 2) POLY(g, [[i * 9, 26], [i * 9 + 9, 26], [14 + i * 5.7 + 5.7, 4], [14 + i * 5.7, 4]], '#4a78b0');
    R(g, 0, 25, 80, 2, '#2f4f78'); R(g, 14, 3, 52, 2, '#d8d0c0');
    if (winter) POLY(g, [[12, 8], [68, 8], [74, 15], [6, 15]], '#f2f6fa');
    // Ofenrohr
    R(g, 60, 0, 4, 10, '#3a3a42'); R(g, 59, 0, 6, 2, '#56565e');
    tuer(g, 33, 38, 14, 26, '#3f7a8a');
    fensterKasten(g, 12, 34, 14, 12, nacht, '#f4f0e8'); fensterKasten(g, 54, 34, 14, 12, nacht, '#f4f0e8');
    // Bild neben dem Fenster und Farbtupfer an der Wand
    R(g, 14, 48, 10, 8, '#f4f0e8'); R(g, 15, 49, 8, 6, '#9ad0f0'); R(g, 15, 53, 8, 2, '#3d7dbf'); E(g, 19, 51, 1.4, 1.4, '#f2d24a');
    for (const [x, f] of [[56, '#e8506a'], [60, '#f2d24a'], [64, '#4a78b0']]) { R(g, x, 49, 3, 3, f); }
    // Treibholz-Bank
    R(g, 8, 56, 16, 3, '#a8a090'); R(g, 10, 59, 2, 4, '#6a5a44'); R(g, 20, 59, 2, 4, '#6a5a44');
  },
});

// ─── Leuchtturm ─────────────────────────────────────────────────────────────

gebaeudeKunst('wildnis_leuchtturm', {
  b: 48, h: 128, licht: [[24, 24], [24, 60]],
  malen(g, { winter, nacht }) {
    // Felsensockel
    E(g, 24, 120, 23, 9, '#6e6a62'); E(g, 24, 118, 20, 7, '#86817a'); E(g, 18, 116, 8, 3, '#9a948a');
    // Turm, nach oben schmaler, rot-weiß geringelt
    const ring = ['#f4f0e8', '#d8453a'];
    for (let y = 36; y < 122; y++) {
      const t = (y - 36) / 86;
      const halb = 7 + t * 8;
      const f = ring[Math.floor((y - 36) / 12) % 2];
      R(g, 24 - halb, y, halb * 2, 1, f);
      R(g, 24 + halb - 3, y, 3, 1, dunkel(f, 0.2));
      R(g, 24 - halb, y, 2, 1, hell(f, 0.2));
    }
    // Galerie
    R(g, 8, 30, 32, 6, '#4a4a54'); R(g, 8, 30, 32, 1, '#7a7a86');
    for (let x = 9; x < 40; x += 4) R(g, x, 24, 1, 6, '#2e2e36');
    R(g, 8, 24, 32, 1, '#2e2e36');
    // Laterne
    R(g, 15, 10, 18, 14, '#2e2e36');
    R(g, 17, 12, 14, 10, nacht ? '#fff3b0' : '#cfe6ee');
    if (nacht) { R(g, 20, 14, 8, 6, '#ffffff'); E(g, 24, 17, 14, 12, 'rgba(255,240,160,0.18)'); }
    R(g, 24, 12, 1, 10, '#2e2e36');
    POLY(g, [[24, 0], [12, 10], [36, 10]], winter ? '#f2f6fa' : '#b8453a'); R(g, 11, 9, 26, 2, '#2e2e36');
    // Fenster und Tür
    fensterKasten(g, 21, 52, 6, 8, nacht); fensterKasten(g, 21, 78, 6, 8, nacht);
    tuer(g, 19, 100, 10, 18, '#6a3a22');
    R(g, 8, 119, 8, 3, '#56524c'); R(g, 33, 120, 7, 3, '#56524c');
  },
});

// ─── Ranch mit Scheune ──────────────────────────────────────────────────────

gebaeudeKunst('ranch', {
  b: 96, h: 80, licht: [[16, 55], [71, 55]],
  malen(g, { winter, nacht }) {
    // Sockel, Wände, Ecken
    R(g, 6, 70, 84, 9, '#7a6a5e'); for (let x = 8; x < 90; x += 6) R(g, x, 71, 1, 8, '#5e5046');
    latten(g, 6, 28, 84, 44, '#b84a3c', 6);
    R(g, 6, 28, 3, 44, '#f2eadc'); R(g, 87, 28, 3, 44, '#f2eadc');
    // Walmdach mit Gaube und Schornstein
    R(g, 74, 4, 9, 18, '#8a5a48'); R(g, 72, 3, 13, 3, '#5a5a62');
    dach(g, 0, 34, 96, 34, 4, 16, '#6a4a3a', winter);
    // Giebelfenster mit Heuluke
    R(g, 30, 14, 20, 18, '#f2eadc'); R(g, 32, 16, 16, 14, '#5a3a24'); R(g, 33, 22, 14, 8, '#e8c860');
    for (const x of [35, 39, 43]) L(g, x, 24, x + 2, 29, '#c8a040', 1);
    // Schild
    R(g, 23, 36, 34, 12, '#f2eadc'); R(g, 24, 37, 32, 10, '#3a2a20');
    schrift(g, 'RANCH', 30, 40, '#f6e6b0');
    // Veranda
    R(g, 22, 66, 38, 5, '#9a6a3a'); R(g, 22, 66, 38, 1, '#c8925a');
    for (const x of [24, 56]) R(g, x, 52, 3, 15, '#f2eadc');
    tuer(g, 33, 52, 14, 26, '#3f7a5a');
    fensterKasten(g, 9, 48, 14, 14, nacht, '#f2eadc'); fensterKasten(g, 64, 48, 14, 14, nacht, '#f2eadc');
    R(g, 7, 62, 18, 4, '#9a6a3a'); R(g, 62, 62, 18, 4, '#9a6a3a');
    if (!nacht) {
      for (const [x, f] of [[9, '#e8506a'], [14, '#f2d24a'], [19, '#ec97be'], [64, '#f2d24a'], [69, '#e8506a'], [74, '#7cc25a']]) { R(g, x, 58, 3, 4, f); }
    }
    // Hufeisen über der Tür
    L(g, 37, 46, 37, 48, '#d8d8e0', 1); L(g, 43, 46, 43, 48, '#d8d8e0', 1); L(g, 38, 49, 42, 49, '#d8d8e0', 1);
  },
});

gebaeudeKunst('wildnis_scheune', {
  b: 112, h: 80, licht: [[56, 26]],
  malen(g, { winter, nacht }) {
    R(g, 4, 72, 104, 7, '#6e6258');
    latten(g, 6, 24, 100, 50, '#a8443a', 5);
    R(g, 6, 24, 3, 50, '#efe6d6'); R(g, 103, 24, 3, 50, '#efe6d6'); R(g, 6, 72, 100, 2, '#efe6d6');
    dach(g, 0, 28, 112, 28, 2, 20, '#59606a', winter);
    // Heuboden
    R(g, 44, 6, 24, 20, '#efe6d6'); R(g, 46, 8, 20, 16, '#4a2e1c'); R(g, 47, 14, 18, 10, '#e8c860');
    if (nacht) R(g, 52, 12, 8, 8, '#ffd47a');
    L(g, 46, 8, 65, 23, '#efe6d6', 1); L(g, 65, 8, 46, 23, '#efe6d6', 1);
    // Große Tore mit weißen Kreuzen
    for (const x0 of [30, 56]) {
      R(g, x0, 42, 26, 32, '#efe6d6'); R(g, x0 + 2, 44, 22, 30, '#7a2e26');
      L(g, x0 + 3, 45, x0 + 22, 73, '#efe6d6', 1); L(g, x0 + 22, 45, x0 + 3, 73, '#efe6d6', 1);
    }
    for (const x0 of [10, 90]) { fensterKasten(g, x0, 46, 10, 10, nacht, '#efe6d6'); }
    R(g, 80, 60, 12, 12, '#d8c070'); for (const x of [82, 86, 90]) L(g, x, 60, x, 71, '#a88c30', 1);
  },
});

// ─── Turm des Einsiedlers ───────────────────────────────────────────────────

gebaeudeKunst('turm', {
  b: 48, h: 112, licht: [[24, 40], [14, 68], [34, 68]],
  malen(g, { winter, nacht, jz }) {
    // Steinschaft
    R(g, 8, 34, 32, 78, '#8a8478');
    for (let y = 36; y < 110; y += 6) for (let x = 8 + ((y / 6) % 2) * 5; x < 40; x += 10) R(g, x, y, Math.min(9, 40 - x), 5, y % 12 ? '#9a9488' : '#948e82');
    R(g, 8, 34, 3, 78, '#6e685e'); R(g, 37, 34, 3, 78, '#6e685e'); R(g, 8, 34, 32, 2, '#a8a296');
    // Balkon
    R(g, 4, 56, 40, 4, '#6e685e'); for (let x = 5; x < 44; x += 5) R(g, x, 50, 2, 6, '#56524c'); R(g, 4, 50, 40, 1, '#56524c');
    // Kegeldach
    POLY(g, [[24, 0], [1, 36], [47, 36]], '#5a3a7a');
    for (let y = 8; y < 36; y += 5) L(g, 24 - (y / 36) * 23 + 1, y, 24 + (y / 36) * 23 - 1, y, '#46306a', 1);
    L(g, 24, 1, 5, 35, '#7a5a9a', 1);
    R(g, 0, 35, 48, 3, '#3a2c58');
    if (winter) POLY(g, [[24, 0], [16, 12], [32, 12]], '#f2f6fa');
    P(g, 24, 0, '#f2c94c'); P(g, 23, 1, '#f2c94c'); P(g, 25, 1, '#f2c94c');
    for (const [x, y] of [[19, 22], [29, 26], [24, 14]]) P(g, x, y, '#f2d24a');
    // Efeu
    if (jz !== 'winter') for (let y = 60; y < 108; y += 3) { P(g, 10 + Math.round(Math.sin(y) * 1.5), y, '#4f9a3a'); P(g, 11 + Math.round(Math.sin(y) * 1.5), y + 1, '#356f2a'); }
    fensterKasten(g, 19, 38, 10, 10, nacht); fensterKasten(g, 11, 66, 8, 12, nacht); fensterKasten(g, 30, 66, 8, 12, nacht);
    tuer(g, 17, 88, 14, 24, '#5a3a24');
    R(g, 8, 108, 6, 4, '#6e685e'); R(g, 34, 108, 6, 4, '#6e685e');
  },
});

// ─── Holzfällerhütte ────────────────────────────────────────────────────────

gebaeudeKunst('wildnis_holzhaus', {
  b: 64, h: 48, licht: [[16, 30]],
  malen(g, { winter, nacht }) {
    // Rundhölzer
    R(g, 4, 18, 56, 28, '#8a5a32');
    for (let y = 19; y < 46; y += 5) { R(g, 4, y, 56, 4, '#9a6a3a'); R(g, 4, y, 56, 1, '#b88a5a'); R(g, 4, y + 3, 56, 1, '#6a4024'); for (const x of [4, 58]) E(g, x, y + 2, 2, 2.2, '#d8b07a'); }
    dach(g, 0, 22, 64, 22, 3, 12, '#5a6a50', winter);
    R(g, 46, 0, 7, 12, '#7a7a82'); R(g, 45, 0, 9, 2, '#56565e');
    tuer(g, 25, 28, 12, 20, '#4a3020');
    fensterKasten(g, 10, 28, 10, 8, nacht);
    R(g, 44, 30, 10, 8, '#6a4426'); R(g, 45, 31, 8, 6, '#2a1a10');
  },
});
