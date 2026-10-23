// Bereich „hof" – Pixelkunst der Gebäude: das Wohnhaus in drei Ausbaustufen (haus, hof_haus1, hof_haus2) und
// das Gewächshaus (hof_gewaechshaus: verfallen, bis es hergerichtet ist). Alle mit Schnee im Winter und
// beleuchteten Fenstern nachts.

import { gebaeudeKunst, innenFarben, dach, fensterKasten, tuer, P, R, E, L, POLY, hell, dunkel } from '../../sprites.js';
import { hash } from '../../zufall.js';

innenFarben('haus', { tapete: '#d7b98c', streifen: '#c9a676', leiste: '#7a4e2c', teppich: '#a8453f', muster: '#e0b060' });

// ─── Wohnhaus ───────────────────────────────────────────────────────────────

const WAND = '#d6b383';
const WAND_D = '#bf9a6a';
const BALKEN = '#7a5232';
const ZIEGEL = '#a8452f';

function schornstein(g, x, winter, hoehe = 18) {
  R(g, x, 2, 10, hoehe, '#8a6a5a');
  for (let y = 5; y < 2 + hoehe; y += 4) R(g, x, y, 10, 1, '#6e5244');
  R(g, x + 7, 2, 3, hoehe, '#74564a');
  R(g, x - 1, 1, 12, 3, '#5e4438'); R(g, x - 1, 1, 12, 1, '#7a5a4c');
  if (winter) R(g, x - 1, 0, 12, 2, '#f4f8fb');
}

function blumenkasten(g, x, y, b, winter) {
  R(g, x - 1, y, b + 2, 4, '#7a4e2c'); R(g, x - 1, y, b + 2, 1, '#9a6a3a');
  if (winter) { R(g, x, y - 1, b, 1, '#ffffff'); return; }
  for (let i = 0; i < b; i += 3) {
    P(g, x + i, y - 1, ['#e8506a', '#f2d24a', '#f4f0f8'][(x + i) % 3]);
    P(g, x + i + 1, y - 2, '#4f9a3a'); P(g, x + i + 1, y - 1, '#4f9a3a');
  }
}

/** Gaube im Dach mit einem Fenster. */
function gaube(g, cx, winter, nacht) {
  R(g, cx - 8, 24, 16, 14, WAND); R(g, cx - 8, 24, 2, 14, BALKEN); R(g, cx + 6, 24, 2, 14, BALKEN);
  fensterKasten(g, cx - 4, 27, 8, 8, nacht);
  POLY(g, [[cx - 11, 25], [cx + 11, 25], [cx + 6, 16], [cx - 6, 16]], '#8a3524');
  R(g, cx - 6, 16, 12, 2, hell('#8a3524', 0.3)); R(g, cx - 11, 24, 22, 2, dunkel('#8a3524', 0.35));
  for (let y = 19; y < 25; y += 3) R(g, cx - 10 + (y - 19) / 2, y, 20 - (y - 19), 1, dunkel('#8a3524', 0.2));
  if (winter) { POLY(g, [[cx - 8, 20], [cx + 8, 20], [cx + 6, 16], [cx - 6, 16]], '#f2f6fa'); R(g, cx - 12, 24, 24, 1, '#f2f6fa'); }
}

/** Vordach über der Haustür mit zwei Pfosten und einer Laterne. */
function vordach(g, cx, winter, nacht) {
  R(g, cx - 17, 52, 3, 28, BALKEN); R(g, cx + 14, 52, 3, 28, BALKEN);
  R(g, cx - 17, 52, 1, 28, hell(BALKEN, 0.25));
  POLY(g, [[cx - 22, 53], [cx + 22, 53], [cx + 16, 43], [cx - 16, 43]], '#8a3524');
  for (let y = 46; y < 53; y += 3) R(g, cx - 18 + (y - 46), y, 36 - 2 * (y - 46), 1, dunkel('#8a3524', 0.22));
  R(g, cx - 16, 43, 32, 2, hell('#8a3524', 0.3)); R(g, cx - 22, 52, 44, 2, dunkel('#8a3524', 0.4));
  if (winter) { POLY(g, [[cx - 17, 46], [cx + 17, 46], [cx + 16, 43], [cx - 16, 43]], '#f2f6fa'); R(g, cx - 22, 53, 44, 1, '#f2f6fa'); }
  // Laterne
  R(g, cx + 10, 54, 1, 3, '#2e2e36'); R(g, cx + 8, 57, 5, 6, '#2e2e36'); R(g, cx + 9, 58, 3, 4, nacht ? '#ffe28a' : '#d8e4ea');
}

/** Wohnhaus b px breit (80, 112 oder 144), Stufe 0–2. */
function wohnhaus(g, { b, stufe, winter, nacht }) {
  const cx = b / 2;
  const fenster = stufe === 0 ? [15, 53] : stufe === 1 ? [cx - 44, cx + 32] : [cx - 56, cx - 38, cx + 26, cx + 44];
  // Wand aus Brettern, Eckbalken, Sockel
  R(g, 6, 34, b - 12, 46, WAND);
  for (let x = 10; x < b - 8; x += 5) R(g, x, 34, 1, 46, WAND_D);
  R(g, 6, 34, 4, 46, BALKEN); R(g, b - 10, 34, 4, 46, BALKEN);
  R(g, 6, 34, 1, 46, hell(BALKEN, 0.2));
  R(g, 6, 75, b - 12, 5, '#8a7a6a');
  for (let x = 8; x < b - 8; x += 7) R(g, x, 75, 1, 5, '#6e6254');
  R(g, 6, 75, b - 12, 1, '#a89a88');
  // Schornsteine
  if (stufe === 0) schornstein(g, 54, winter);
  else { schornstein(g, b - 32, winter, 20); schornstein(g, 22, winter, stufe === 2 ? 20 : 14); }
  dach(g, 0, 38, b, 38, 8, 12, ZIEGEL, winter);
  if (stufe >= 1) gaube(g, cx, winter, nacht);
  if (stufe === 2) { gaube(g, cx - 36, winter, nacht); gaube(g, cx + 36, winter, nacht); }
  // Fenster samt Blumenkästen
  for (const x of fenster) {
    fensterKasten(g, x, 47, 12, 10, nacht);
    blumenkasten(g, x, 59, 12, winter);
    R(g, x - 3, 46, 2, 14, '#7a4e2c'); R(g, x + 13, 46, 2, 14, '#7a4e2c');   // Fensterläden
    R(g, x - 3, 46, 1, 14, hell('#7a4e2c', 0.25));
  }
  if (stufe === 0) tuer(g, cx - 7, 56, 14, 24, '#7a4a2a');
  else { tuer(g, cx - 7, 56, 14, 24, '#7a4a2a'); vordach(g, cx, winter, nacht); R(g, cx - 10, 78, 20, 2, '#9a8a78'); R(g, cx - 10, 78, 20, 1, '#b8a890'); }
  // Fußmatte
  R(g, cx - 6, 79, 12, 1, '#6a8a4a');
  if (stufe === 2) {
    // Regenrinne und Efeu am Rand
    R(g, 4, 38, 2, 40, '#6a6a72'); R(g, b - 6, 38, 2, 40, '#6a6a72');
    if (!winter) for (let i = 0; i < 12; i++) { P(g, 8 + (hash(i, 1, 2) * 8 | 0), 40 + i * 3, '#4f9a3a'); P(g, b - 12 + (hash(i, 2, 3) * 8 | 0), 44 + i * 3, '#3e7a34'); }
  }
}

const lichtPunkte = (b, stufe) => {
  const cx = b / 2;
  const f = stufe === 0 ? [15, 53] : stufe === 1 ? [cx - 44, cx + 32] : [cx - 56, cx - 38, cx + 26, cx + 44];
  const l = f.map((x) => [x + 6, 52]);
  if (stufe >= 1) l.push([cx + 10, 60]);
  return l;
};

gebaeudeKunst('haus', { b: 80, h: 80, licht: lichtPunkte(80, 0), malen: (g, k) => wohnhaus(g, { b: 80, stufe: 0, ...k }) });
gebaeudeKunst('hof_haus1', { b: 112, h: 80, licht: lichtPunkte(112, 1), malen: (g, k) => wohnhaus(g, { b: 112, stufe: 1, ...k }) });
gebaeudeKunst('hof_haus2', { b: 144, h: 80, licht: lichtPunkte(144, 2), malen: (g, k) => wohnhaus(g, { b: 144, stufe: 2, ...k }) });

// ─── Gewächshaus ────────────────────────────────────────────────────────────

const RAHMEN_HEIL = '#f1efe6';
const RAHMEN_ALT = '#7a6a58';

/** Eine Scheibe: heil und hell, oder verschmutzt, gesprungen, zerbrochen. */
function scheibe(g, x, y, w, h, o) {
  if (w <= 0) return;
  if (o.heil) {
    const f = o.nacht ? '#e8f2a8' : y < 24 ? '#cdeee4' : '#b8e0d6';
    R(g, x, y, w, h, f); R(g, x, y, w, 1, hell(f, 0.45)); R(g, x, y + h - 1, w, 1, dunkel(f, 0.12));
    if (w > 5) { L(g, x + 2, y + h - 2, x + 5, y + 1, o.nacht ? '#fffbd0' : '#f4fffb', 1); }
    return;
  }
  const z = hash(x, y, 5);
  if (z < 0.34) {
    R(g, x, y, w, h, '#1c2822');
    if (hash(x, y, 8) < 0.5) { P(g, x + 2, y + h - 2, '#4f7a3a'); P(g, x + 3, y + h - 3, '#4f7a3a'); P(g, x + 3, y + h - 2, '#6a9a4a'); }
    R(g, x, y, 1, h, '#3a4a3e');
    L(g, x, y, x + 2, y + 3, '#a8b8b0', 1);
  } else {
    R(g, x, y, w, h, o.nacht ? '#5a6a64' : '#8fa89c');
    R(g, x, y + h - 2, w, 2, '#6a8a5a');
    P(g, x + 1, y + 1, '#c4d4cc');
    if (z < 0.66) { L(g, x + 1, y + 1, x + w - 2, y + h - 2, '#4a5a52', 1); L(g, x + w / 2, y + 1, x + w / 2 + 2, y + h - 3, '#4a5a52', 1); }
  }
}

function gewaechshaus(g, { winter, nacht, zustand }) {
  const heil = !!zustand.heil;
  const o = { heil, nacht };
  const rahmen = heil ? RAHMEN_HEIL : RAHMEN_ALT;
  const rahmenD = heil ? '#b8c0b8' : '#4a3e32';
  // Sockel aus Backstein
  R(g, 4, 62, 104, 18, heil ? '#b0583e' : '#8a5a48');
  for (let y = 64; y < 80; y += 4) R(g, 4, y, 104, 1, heil ? '#8a3e2e' : '#5e3e30');
  for (let y = 62; y < 80; y += 4) for (let x = 6 + ((y / 4) % 2) * 4; x < 106; x += 8) R(g, x, y, 1, 4, heil ? '#8a3e2e' : '#5e3e30');
  R(g, 4, 62, 104, 2, heil ? '#c8705a' : '#9a6a58');
  // Innenleben hinter den unteren Scheiben
  R(g, 6, 42, 100, 20, heil ? '#8ab8a0' : '#2a3a30');
  if (heil) {
    for (let x = 8; x < 104; x += 6) {
      const hoch = 4 + Math.floor(hash(x, 3, 1) * 8);
      E(g, x + 2, 62 - hoch / 2, 3, hoch / 2 + 1, ['#4f9a3a', '#3e7a34', '#62a84a'][x % 3]);
      if (hash(x, 4, 2) < 0.4) P(g, x + 2, 62 - hoch, ['#d8302a', '#f2c94c', '#f06a9a'][x % 3]);
    }
  }
  // untere Glaswand
  for (let x = 6; x < 106; x += 12) {
    if (x >= 46 && x < 66) continue;
    scheibe(g, x + 1, 42, Math.min(11, 106 - x - 1), 19, o);
  }
  // Dach: vier Reihen Scheiben im Trapez
  for (let r = 0; r < 4; r++) {
    const y = 11 + r * 8;
    const xl = Math.round(12 - 12 * ((y + 4 - 10) / 30));
    const xr = 112 - xl;
    for (let x = xl; x < xr; x += 14) scheibe(g, x + 1, y, Math.min(13, xr - x - 1), 7, o);
  }
  // Rahmen
  for (let r = 0; r <= 4; r++) {
    const y = 10 + r * 8;
    const xl = Math.round(12 - 12 * ((y - 10) / 30));
    R(g, xl, y, 112 - 2 * xl, 1, rahmen); R(g, xl, y + 1, 112 - 2 * xl, 1, rahmenD);
  }
  for (let r = 0; r < 4; r++) {
    const y = 10 + r * 8;
    const xl = Math.round(12 - 12 * ((y + 4 - 10) / 30));
    for (let x = xl; x < 112 - xl; x += 14) R(g, x, y, 1, 8, rahmen);
    R(g, 112 - xl - 1, y, 1, 8, rahmen);
  }
  L(g, 12, 10, 0, 40, rahmen, 2); L(g, 100, 10, 112, 40, rahmen, 2);
  R(g, 12, 9, 88, 2, rahmen);                      // First
  R(g, 12, 8, 88, 1, heil ? '#ffffff' : '#9a8a78');
  R(g, 4, 40, 104, 2, rahmen); R(g, 4, 41, 104, 1, rahmenD);   // Traufe
  for (let x = 6; x <= 106; x += 12) { R(g, x, 42, 1, 20, rahmen); }
  R(g, 4, 42, 2, 20, rahmen); R(g, 106, 42, 2, 20, rahmen);
  R(g, 4, 60, 104, 2, rahmen);
  // Tür
  R(g, 46, 54, 20, 26, rahmen); R(g, 46, 54, 20, 1, hell(rahmen, 0.2));
  if (heil) {
    R(g, 48, 58, 16, 22, nacht ? '#e8f2a8' : '#b8e0d6'); R(g, 55, 58, 2, 22, rahmen); R(g, 48, 66, 16, 1, rahmen);
    R(g, 48, 74, 16, 6, '#3e8a72'); R(g, 60, 70, 2, 3, '#f2c94c');
    L(g, 50, 77, 53, 59, nacht ? '#fffbd0' : '#f4fffb', 1);
  } else {
    R(g, 48, 58, 16, 22, '#3a3228');
    for (const y of [60, 66, 72]) { R(g, 47, y, 18, 3, '#8a6a42'); R(g, 47, y, 18, 1, '#a88858'); P(g, 49, y + 1, '#3a3228'); P(g, 62, y + 1, '#3a3228'); }
    R(g, 55, 69, 4, 5, '#6a5a4a'); R(g, 56, 67, 2, 3, '#8a8a90');       // Vorhängeschloss
  }
  // Bewuchs: Ranken, Unkraut, Büsche
  if (!heil && !winter) {
    for (const [x0, y0, x1, y1] of [[10, 78, 14, 44], [100, 78, 96, 46], [40, 12, 52, 38], [78, 11, 70, 36], [26, 62, 30, 46]]) {
      L(g, x0, y0, x1, y1, '#3e7a34', 1);
      for (let i = 0; i < 6; i++) { const t = i / 6; P(g, Math.round(x0 + (x1 - x0) * t) + 1, Math.round(y0 + (y1 - y0) * t), '#62a84a'); P(g, Math.round(x0 + (x1 - x0) * t) - 1, Math.round(y0 + (y1 - y0) * t) + 1, '#4f9a3a'); }
    }
  }
  const gras = winter ? ['#cfd8de', '#e8eef2'] : heil ? ['#4f9a3a', '#7cc25a'] : ['#3a6a2c', '#62a84a'];
  for (let x = 2; x < 110; x += 5 + Math.floor(hash(x, 9, 4) * 4)) {
    if (x > 44 && x < 68) continue;
    if (heil && hash(x, 1, 6) < 0.5) continue;
    const h = 4 + Math.floor(hash(x, 2, 3) * 5);
    L(g, x, 79, x - 1, 79 - h, gras[0], 1); L(g, x + 2, 79, x + 3, 79 - h + 1, gras[1], 1);
  }
  if (!heil) { E(g, 6, 76, 7, 5, winter ? '#dfe6ea' : '#3a6a2c'); E(g, 104, 76, 7, 5, winter ? '#dfe6ea' : '#356f2a'); E(g, 5, 74, 3, 2, winter ? '#fff' : '#62a84a'); }
  if (winter) {
    R(g, 14, 8, 84, 2, '#f4f8fb'); R(g, 4, 39, 104, 2, '#f4f8fb');
    for (let r = 0; r < 3; r++) { const y = 12 + r * 8; const xl = Math.round(12 - 12 * ((y - 10) / 30)); for (let x = xl + 2; x < 110 - xl; x += 14) R(g, x, y, heil ? 6 : 10, 2, '#f4f8fb'); }
  }
}

gebaeudeKunst('hof_gewaechshaus', {
  b: 112, h: 80,
  zustand: (s) => ({ heil: !!s.flags?.gewaechshaus }),
  malen: gewaechshaus,
});
