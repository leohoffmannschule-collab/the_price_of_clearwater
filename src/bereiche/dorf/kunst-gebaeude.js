// Bereich „dorf" – Pixelkunst der Gebäude: Wohnhäuser als Kulisse (vier Größen, fünf Stile), Arztpraxis,
// Museum und Haus Rosa. Dächer tragen im Winter Schnee, Fenster leuchten nachts (Gebäudelicht).

import { gebaeudeKunst, dach, fensterKasten, tuer, schrift, P, R, E, L, POLY, hell, dunkel } from '../../sprites.js';

// ─── Wohnhäuser ─────────────────────────────────────────────────────────────

const STILE = [
  { wand: '#eadcb4', dach: '#a8442f', tuer: '#6a4a2e', rahmen: '#f6efdc', sockel: '#9a948a', laden: '#4f7a5a' },
  { wand: '#c8d8a6', dach: '#56668c', tuer: '#8a3a2a', rahmen: '#f6efdc', sockel: '#8e8a82', laden: '#8a3a2a' },
  { wand: '#e6c4a2', dach: '#7a4a38', tuer: '#3f6a58', rahmen: '#fbf3e4', sockel: '#948c80', laden: '#3f6a58' },
  { wand: '#bdd2e6', dach: '#8e3c3c', tuer: '#e0b24a', rahmen: '#f8f4ea', sockel: '#8c9096', laden: '#5a7ab0' },
  { wand: '#d9cae2', dach: '#456c4c', tuer: '#6a4a2e', rahmen: '#f8f4ea', sockel: '#948e96', laden: '#8a5aa8' },
];
const BLUMEN = ['#e8506a', '#f2d24a', '#f4f0f8', '#c070e0'];

/** Mauerwerk-Sockel mit Fugen. */
function sockel(g, b, h, f) {
  R(g, 4, h - 8, b - 8, 8, f);
  for (let x = 4; x < b - 4; x += 8) R(g, x, h - 8, 1, 8, dunkel(f, 0.2));
  R(g, 4, h - 8, b - 8, 1, hell(f, 0.2));
}
/** Blumenkasten unter einem Fenster. */
function blumenkasten(g, x, y, w, nacht) {
  R(g, x - 1, y, w + 2, 4, '#7a4e2c'); R(g, x - 1, y, w + 2, 1, '#9a6a3a');
  for (let i = 0; i < w; i += 3) {
    P(g, x + i, y - 1, nacht ? '#4a7a3a' : BLUMEN[(i + x) % 4]); P(g, x + i + 1, y - 2, nacht ? '#3a5a2a' : BLUMEN[(i + x + 1) % 4]);
  }
}
function schornstein(g, x, bis, winter) {
  R(g, x, 0, 9, bis, '#8a5a48'); R(g, x, 0, 9, 3, '#6a4638'); R(g, x + 1, 0, 3, bis, '#a06c58');
  for (let y = 5; y < bis; y += 4) R(g, x, y, 9, 1, '#6a4638');
  if (winter) R(g, x - 1, 0, 11, 2, '#f2f6fa');
}
function rauch(g, x, winter) {
  const f = winter ? 'rgba(235,240,245,0.7)' : 'rgba(220,220,225,0.6)';
  E(g, x + 4, -1, 2, 1.4, f);
}

function wohnhaus(g, b, h, st, { winter, nacht }) {
  const dachU = Math.round(h * 0.44);
  schornstein(g, b - 26, dachU - 4, winter);
  // Wand mit Brettern
  R(g, 4, dachU - 4, b - 8, h - dachU + 4, st.wand);
  for (let y = dachU + 3; y < h - 9; y += 5) R(g, 4, y, b - 8, 1, dunkel(st.wand, 0.1));
  R(g, 4, dachU - 4, 2, h - dachU + 4, hell(st.wand, 0.2)); R(g, b - 6, dachU - 4, 2, h - dachU + 4, dunkel(st.wand, 0.2));
  sockel(g, b, h, st.sockel);
  dach(g, 0, dachU, b, dachU, 4, 12, st.dach, winter);
  // Giebelfenster
  fensterKasten(g, b / 2 - 5, dachU - 17, 10, 9, nacht, st.rahmen);
  // Tür (Feld 2) mit Vordach
  R(g, 30, h - 33, 20, 3, dunkel(st.dach, 0.1)); R(g, 30, h - 33, 20, 1, hell(st.dach, 0.2));
  tuer(g, 33, h - 26, 14, 26, st.tuer);
  R(g, 28, h - 3, 24, 3, '#a8a29a'); R(g, 28, h - 3, 24, 1, '#c8c2b8');
  // Fenster links und rechts der Tür
  const fy = h - 40;
  fensterKasten(g, 9, fy, 14, 14, nacht, st.rahmen);
  blumenkasten(g, 9, fy + 15, 14, nacht);
  const fx = b >= 96 ? 64 : 59;
  fensterKasten(g, fx, fy, 14, 14, nacht, st.rahmen);
  blumenkasten(g, fx, fy + 15, 14, nacht);
  if (b >= 96) { fensterKasten(g, b - 20, fy, 10, 14, nacht, st.rahmen); R(g, b - 22, fy, 2, 14, st.laden); R(g, b - 10, fy, 2, 14, st.laden); }
  // Fensterläden links
  R(g, 5, fy, 3, 14, st.laden); R(g, 24, fy, 3, 14, st.laden);
  rauch(g, b - 26, winter);
}

for (const [w, hh] of [[5, 5], [6, 5], [5, 4], [6, 6]]) {
  const b = w * 16;
  const h = hh * 16;
  const fy = h - 33;
  gebaeudeKunst(`dorf_haus${w}x${hh}`, {
    b, h,
    licht: [[16, fy], [66, fy], ...(b >= 96 ? [[b - 15, fy]] : [])],
    zustand: (s, geb) => ({ stil: geb.stil ?? 0 }),
    malen(g, k) { wohnhaus(g, b, h, STILE[k.zustand.stil % STILE.length], k); },
  });
}

// ─── Arztpraxis (Dr. Theo) ──────────────────────────────────────────────────

gebaeudeKunst('dorf_arzt', {
  b: 96, h: 80, licht: [[16, 52], [78, 52]],
  malen(g, { winter, nacht }) {
    const wand = '#f0ece4';
    schornstein(g, 70, 28, winter);
    R(g, 4, 30, 88, 50, wand);
    for (let y = 34; y < 70; y += 6) R(g, 4, y, 88, 1, dunkel(wand, 0.07));
    sockel(g, 96, 80, '#a8b0a8');
    dach(g, 0, 36, 96, 36, 4, 12, '#4f8a86', winter);
    // Schild mit Kreuz
    R(g, 34, 38, 28, 10, '#fbfaf6'); R(g, 34, 38, 28, 1, '#c8c4bc'); R(g, 34, 47, 28, 1, '#c8c4bc');
    R(g, 40, 40, 6, 6, '#d8403a'); R(g, 42, 39, 2, 8, '#d8403a'); R(g, 39, 42, 8, 2, '#d8403a');
    schrift(g, 'ARZT', 49, 40, '#4f8a86');
    // Fenster mit Vorhang
    fensterKasten(g, 10, 52, 14, 14, nacht, '#fbfaf6'); fensterKasten(g, 71, 52, 14, 14, nacht, '#fbfaf6');
    R(g, 9, 51, 16, 2, '#4f8a86'); R(g, 70, 51, 16, 2, '#4f8a86');
    blumenkasten(g, 10, 67, 14, nacht); blumenkasten(g, 71, 67, 14, nacht);
    // Markise über der Tür
    for (let x = 28; x < 68; x += 6) { R(g, x, 51, 3, 6, '#4f8a86'); R(g, x + 3, 51, 3, 6, '#fbfaf6'); }
    R(g, 28, 56, 40, 1, dunkel('#4f8a86', 0.3));
    tuer(g, 33, 58, 14, 22, '#e6e0d0');
    R(g, 28, 77, 24, 3, '#a8a29a');
    // Bank vor der Praxis fehlt bewusst: wartet drinnen
  },
});

// ─── Museum mit Bibliothek (Mira) ───────────────────────────────────────────

gebaeudeKunst('dorf_museum', {
  b: 144, h: 112, licht: [[28, 72], [116, 72], [28, 40], [116, 40]],
  malen(g, { winter, nacht }) {
    const stein = '#d8d0c0';
    // Hauptbau
    R(g, 4, 42, 136, 70, stein);
    for (let y = 46; y < 108; y += 8) { R(g, 4, y, 136, 1, dunkel(stein, 0.1)); for (let x = 4 + ((y / 8) % 2) * 8; x < 140; x += 16) R(g, x, y, 1, 8, dunkel(stein, 0.1)); }
    sockel(g, 144, 112, '#a39c90');
    // Giebel mit Dreieck
    POLY(g, [[0, 44], [144, 44], [72, 6]], '#8e8aa0');
    POLY(g, [[8, 42], [136, 42], [72, 12]], '#c0bcd0');
    POLY(g, [[18, 40], [126, 40], [72, 16]], '#d8d4e4');
    R(g, 0, 42, 144, 4, '#6e6a80'); R(g, 0, 42, 144, 1, '#9a96b0');
    if (winter) { POLY(g, [[0, 44], [144, 44], [72, 6]], '#f2f6fa'); POLY(g, [[10, 43], [134, 43], [72, 14]], '#c0bcd0'); R(g, 0, 44, 144, 2, '#f2f6fa'); }
    E(g, 72, 30, 7, 7, '#6e6a80'); E(g, 72, 30, 5.5, 5.5, '#f4efe0');
    L(g, 72, 30, 72, 26, '#3a3a3a', 1); L(g, 72, 30, 75, 31, '#3a3a3a', 1);
    // Säulen
    for (const x of [30, 52, 84, 106]) {
      R(g, x, 48, 8, 60, '#ece6d8'); R(g, x, 48, 2, 60, '#fbf8ee'); R(g, x + 6, 48, 2, 60, '#b8b0a0');
      R(g, x - 2, 46, 12, 4, '#f4efe0'); R(g, x - 2, 106, 12, 4, '#f4efe0');
      for (let y = 54; y < 104; y += 12) R(g, x + 3, y, 1, 7, '#cfc8b8');
    }
    // Schriftband
    R(g, 40, 49, 64, 11, '#5a4a6a'); R(g, 40, 49, 64, 1, '#8a7aa0');
    schrift(g, 'MUSEUM', 48, 52, '#f2e8c8'); P(g, 90, 54, '#f2c94c'); P(g, 94, 54, '#f2c94c');
    // Fenster zwischen den Säulen und an den Flügeln
    fensterKasten(g, 12, 66, 14, 22, nacht, '#f6efdc'); fensterKasten(g, 118, 66, 14, 22, nacht, '#f6efdc');
    fensterKasten(g, 12, 52, 14, 8, nacht, '#f6efdc'); fensterKasten(g, 118, 52, 14, 8, nacht, '#f6efdc');
    // Banner
    R(g, 38, 64, 8, 22, '#b4483a'); POLY(g, [[38, 86], [46, 86], [42, 80]], '#d8d0c0');
    R(g, 98, 64, 8, 22, '#3a6aa8'); POLY(g, [[98, 86], [106, 86], [102, 80]], '#d8d0c0');
    // Tür (Feld 4) mit Flügeln
    R(g, 62, 66, 20, 3, '#6e6a80');
    tuer(g, 65, 70, 14, 42, '#7a4a2e');
    R(g, 71, 70, 2, 42, '#4a2e18');
    // Stufen
    R(g, 56, 106, 32, 3, '#c8c2b4'); R(g, 52, 109, 40, 3, '#b8b2a4');
  },
});

// ─── Haus Rosa ──────────────────────────────────────────────────────────────

gebaeudeKunst('dorf_hausrosa', {
  b: 96, h: 80, licht: [[16, 50], [78, 50]],
  malen(g, { winter, nacht, jz }) {
    const rosa = '#efb8c4';
    schornstein(g, 68, 28, winter);
    R(g, 4, 30, 88, 50, rosa);
    for (let x = 6; x < 92; x += 6) R(g, x, 30, 1, 50, dunkel(rosa, 0.08));
    R(g, 4, 30, 2, 50, hell(rosa, 0.25)); R(g, 90, 30, 2, 50, dunkel(rosa, 0.2));
    sockel(g, 96, 80, '#a89aa0');
    dach(g, 0, 36, 96, 36, 4, 12, '#7a3a48', winter);
    // Herzfenster oben
    E(g, 48, 22, 5.5, 5.5, '#fbf3e4'); E(g, 48, 22, 4, 4, nacht ? '#ffd47a' : '#8ac0e0');
    P(g, 47, 21, '#e8506a'); P(g, 49, 21, '#e8506a'); R(g, 47, 22, 3, 1, '#e8506a'); P(g, 48, 23, '#e8506a');
    // Fenster mit Läden
    fensterKasten(g, 11, 50, 14, 14, nacht, '#fbf3e4'); fensterKasten(g, 71, 50, 14, 14, nacht, '#fbf3e4');
    for (const x of [6, 26, 66, 86]) R(g, x - 1, 49, 3, 16, '#fbf3e4');
    blumenkasten(g, 11, 65, 14, nacht); blumenkasten(g, 71, 65, 14, nacht);
    // Rosen am Haus
    if (jz !== 'winter') {
      for (const [x, y] of [[28, 44], [30, 52], [27, 60], [32, 70], [64, 46], [62, 58], [66, 68], [29, 74], [26, 66]]) {
        R(g, x, y, 3, 3, '#3f7a3a'); P(g, x + 1, y + 1, jz === 'herbst' ? '#c05a38' : '#e83a6a');
      }
      L(g, 29, 44, 30, 76, '#3f7a3a', 1); L(g, 65, 44, 64, 70, '#3f7a3a', 1);
    }
    tuer(g, 33, 56, 14, 24, '#4f9a68');
    E(g, 40, 62, 3, 3, '#fbf3e4'); P(g, 40, 62, '#e8506a');
    R(g, 28, 77, 24, 3, '#c0b0b6');
  },
});

// ─── Bäckerei (Kulisse mit Duft) ────────────────────────────────────────────

gebaeudeKunst('dorf_baeckerei', {
  b: 80, h: 80, licht: [[20, 54], [60, 54]],
  malen(g, { winter, nacht }) {
    const wand = '#f0d8a8';
    schornstein(g, 56, 24, winter);
    R(g, 4, 28, 72, 52, wand);
    for (let y = 32; y < 70; y += 5) R(g, 4, y, 72, 1, dunkel(wand, 0.1));
    sockel(g, 80, 80, '#9a8a78');
    dach(g, 0, 34, 80, 34, 4, 10, '#b4602f', winter);
    // Brezel-Schild
    R(g, 20, 36, 40, 9, '#6a4426'); R(g, 21, 37, 38, 7, '#8a5a32'); schrift(g, 'KUCHEN', 30, 39, '#f6e8c0');
    E(g, 25, 40, 3, 2.4, '#c88a48'); P(g, 25, 40, '#8a5a32');
    // Fenster mit Auslage
    fensterKasten(g, 8, 50, 18, 14, nacht, '#fbf3e4'); fensterKasten(g, 54, 50, 18, 14, nacht, '#fbf3e4');
    if (!nacht) { for (const x of [11, 17, 23]) { E(g, x, 61, 3, 2, '#c88a48'); P(g, x - 1, 60, '#e8c080'); } for (const x of [57, 63, 69]) { E(g, x, 61, 3, 2, '#d29a5a'); } }
    R(g, 7, 64, 20, 2, '#8a5a32'); R(g, 53, 64, 20, 2, '#8a5a32');
    // Markise
    for (let x = 30; x < 52; x += 6) { R(g, x, 49, 3, 6, '#e07a30'); R(g, x + 3, 49, 3, 6, '#fbf3e4'); }
    tuer(g, 33, 56, 14, 24, '#7a4a2e');
    R(g, 28, 77, 24, 3, '#b0a090');
    if (!winter) { E(g, 59, -1, 3, 1.6, 'rgba(240,240,240,0.7)'); }
  },
});

