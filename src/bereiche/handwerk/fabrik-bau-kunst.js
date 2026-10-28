// Bereich „handwerk" – Fabrik Stufe 3: Pixelkunst. Gegenstände (die neuen Waren, Wasser, die drei Maschinen als Symbol),
// kleine Warensymbole für die Bänder (8×8), die Objekte auf der Karte (Maschinenbauer mit Hammer und Funken, Mischer mit
// kreisender Trommel, Fertiger mit Roboterarm, Bildschirm und vier Zutaten-Lampen), das Handy-Symbol der App Bauplan und
// das Licht der arbeitenden Maschinen in der Nacht. Statisches wird gecacht (Schlüssel), `danach` malt nur einfache Formen.

import { kunst, objektKunst, symbolKunst, P, R, E, L as LINIE, POLY, dunkel } from '../../sprites.js';
import { lichtQuelle } from '../../render.js';
import { T, OBJEKT_TYPEN } from '../../daten.js';
import * as Logik from '../../logik.js';
import { MASCHINEN } from './fabrik-daten.js';
import { STAHL, STAHL_H, STAHL_D, STAHL_DD, GELB, ORANGE, MINI, platte, anschluesse, schnee } from './fabrik-kunst.js';
import { bauAktiv } from './fabrik-bau.js';

const winter = (k) => k?.jz === 'winter';
const zeit = (k) => k?.t || 0;
const KUPFER = '#d98a4e';
const HOLZ = '#9a6a3a';
const HOLZ_H = '#c8925a';
const HOLZ_D = '#5a3a1a';
const BETON = '#9a978c';
const BETON_H = '#c4c0b2';
const BETON_D = '#6a675e';
const STAHLBLAU = '#6a7c94';

// ─── Gegenstände (16×16) ────────────────────────────────────────────────────

function stahltraeger(g) {
  R(g, 1, 3, 14, 3, '#8a9cb4'); R(g, 1, 3, 14, 1, '#d0dcec'); R(g, 1, 5, 14, 1, '#4a5a72');
  R(g, 6, 6, 4, 5, '#6a7c94'); R(g, 6, 6, 1, 5, '#8a9cb4'); R(g, 9, 6, 1, 5, '#4a5a72');
  R(g, 1, 11, 14, 3, '#7a8ca4'); R(g, 1, 11, 14, 1, '#c0ccdc'); R(g, 1, 13, 14, 1, '#3a4a62');
  for (const x of [3, 12]) { P(g, x, 4, '#3a4a62'); P(g, x, 12, '#3a4a62'); }
}
function metallrohr(g) {
  R(g, 1, 3, 12, 4, '#9aa3af'); R(g, 1, 3, 12, 1, '#e4ebf2'); R(g, 1, 6, 12, 1, '#5a606c');
  E(g, 13, 5, 2, 2.2, '#c8ced6'); E(g, 13, 5, 1.1, 1.3, STAHL_DD);
  R(g, 3, 9, 12, 4, '#8a919c'); R(g, 3, 9, 12, 1, '#d6dce4'); R(g, 3, 12, 12, 1, '#4a505c');
  E(g, 3, 11, 2, 2.2, '#b4bbc6'); E(g, 3, 11, 1.1, 1.3, STAHL_DD);
  for (const x of [6, 9]) R(g, x, 3, 1, 4, '#6a7078');
}
function kabelrolle(g) {
  E(g, 8, 8, 7, 7, HOLZ_D); E(g, 8, 8, 6.2, 6.2, HOLZ); E(g, 8, 7.6, 5.4, 5.2, HOLZ_H);
  E(g, 8, 8, 4.6, 4.6, '#b8642a');
  for (let i = 0; i < 3; i++) E(g, 8, 8, 4.2 - i * 1.2, 4.2 - i * 1.2, i % 2 ? '#d98a4e' : '#f0b078');
  E(g, 8, 8, 1.4, 1.4, HOLZ_D); P(g, 8, 8, '#1c1226');
  LINIE(g, 11, 11, 15, 14, '#d98a4e', 1); P(g, 15, 14, '#f0b078');
}
function rahmenplatte(g) {
  R(g, 1, 2, 14, 12, '#4a5a72'); R(g, 1, 2, 14, 1, '#b0c0d6'); R(g, 1, 13, 14, 1, '#2a3446');
  R(g, 2, 3, 12, 10, STAHLBLAU); R(g, 2, 3, 12, 1, '#98aac2');
  LINIE(g, 3, 4, 12, 12, '#3a4a62', 1); LINIE(g, 12, 4, 3, 12, '#3a4a62', 1);
  for (const [x, y] of [[3, 4], [12, 4], [3, 12], [12, 12]]) { P(g, x, y, '#e8c050'); }
}
function nagel(g) {
  for (const [x, y, l] of [[3, 3, 10], [7, 2, 11], [11, 4, 9]]) {
    R(g, x - 1, y, 3, 1, '#d6dce4'); R(g, x, y + 1, 1, l, '#8a919c'); P(g, x, y + l, '#c8ced6'); P(g, x + 1, y + 1, '#4a505c');
    R(g, x - 1, y, 1, 1, '#ffffff');
  }
}
function zahnstange(g) {
  R(g, 1, 8, 14, 4, STAHL); R(g, 1, 8, 14, 1, STAHL_H); R(g, 1, 11, 14, 1, STAHL_DD);
  for (let x = 1; x < 15; x += 3) { R(g, x, 5, 2, 3, STAHL_H); R(g, x + 1, 5, 1, 3, STAHL_D); P(g, x, 5, '#ffffff'); }
  for (const x of [4, 11]) { P(g, x, 10, STAHL_DD); }
}
function platine(g) {
  R(g, 1, 2, 14, 12, '#1f5a38'); R(g, 1, 2, 14, 1, '#4a9a68'); R(g, 1, 13, 14, 1, '#123a24');
  R(g, 2, 3, 12, 10, '#2f7a4a');
  for (const [x0, y0, x1, y1] of [[2, 6, 5, 6], [5, 6, 5, 11], [10, 4, 13, 4], [10, 4, 10, 8], [7, 12, 13, 12]]) LINIE(g, x0, y0, x1, y1, '#d8c070', 1);
  R(g, 6, 7, 4, 4, '#22242c'); R(g, 6, 7, 4, 1, '#4a4e5a');
  for (const x of [6, 9]) { P(g, x, 6, '#c8ced6'); P(g, x, 11, '#c8ced6'); }
  for (const [x, y] of [[3, 4], [12, 6], [12, 10], [3, 11]]) { R(g, x, y, 2, 2, '#e8c050'); P(g, x, y, '#fff2a8'); }
}
function kuehlkoerper(g) {
  R(g, 1, 11, 14, 3, '#b8642a'); R(g, 1, 11, 14, 1, '#f0b078'); R(g, 1, 13, 14, 1, '#6a3a18');
  for (let i = 0; i < 6; i++) { const x = 2 + i * 2; R(g, x, 2, 1, 9, '#d6dce4'); R(g, x + 1, 2, 1, 9, '#7a828e'); P(g, x, 2, '#ffffff'); }
}
function rotor(g) {
  E(g, 8, 8, 7, 7, '#3a4a62'); E(g, 8, 8, 6, 6, '#98aac2');
  for (let a = 0; a < 6; a++) {
    const w = (a * Math.PI) / 3;
    LINIE(g, 8, 8, Math.round(8 + Math.cos(w) * 6), Math.round(8 + Math.sin(w) * 6), '#3a4a62', 1);
  }
  E(g, 8, 8, 2.6, 2.6, ORANGE); E(g, 8, 8, 1.2, 1.2, STAHL_DD);
  for (const [x, y] of [[8, 2], [13, 5], [13, 11], [8, 14], [3, 11], [3, 5]]) P(g, x, y, '#e4ebf2');
}
function stator(g) {
  E(g, 8, 8, 7, 7, '#3a3e48'); E(g, 8, 8, 6.2, 6.2, STAHL);
  for (let a = 0; a < 8; a++) {
    const w = (a * Math.PI) / 4;
    const x = Math.round(8 + Math.cos(w) * 4.6);
    const y = Math.round(8 + Math.sin(w) * 4.6);
    R(g, x - 1, y - 1, 3, 3, a % 2 ? '#b8642a' : KUPFER); P(g, x - 1, y - 1, '#f0b078');
  }
  E(g, 8, 8, 2.6, 2.6, STAHL_DD); E(g, 8, 8, 1.4, 1.4, '#14161c');
}
function rahmen(g) {
  const b = '#7a8ca4';
  R(g, 1, 1, 14, 2, b); R(g, 1, 13, 14, 2, b); R(g, 1, 1, 2, 14, b); R(g, 13, 1, 2, 14, b);
  R(g, 1, 1, 14, 1, '#d0dcec'); R(g, 1, 1, 1, 14, '#b0c0d6'); R(g, 1, 14, 14, 1, '#3a4a62'); R(g, 14, 1, 1, 14, '#3a4a62');
  LINIE(g, 3, 3, 12, 12, '#98aac2', 1); LINIE(g, 12, 3, 3, 12, '#98aac2', 1);
  LINIE(g, 3, 4, 11, 12, '#4a5a72', 1);
  for (const [x, y] of [[1, 1], [13, 1], [1, 13], [13, 13]]) { R(g, x, y, 2, 2, ORANGE); P(g, x, y, '#f8b070'); }
}
function motor(g) {
  R(g, 1, 12, 11, 2, STAHL_DD); R(g, 2, 3, 10, 9, '#3f6fa8'); R(g, 2, 3, 10, 2, '#7aaae0'); R(g, 2, 11, 10, 1, '#22406a');
  for (const x of [4, 6, 8, 10]) R(g, x, 5, 1, 6, '#2a4a78');
  R(g, 12, 4, 2, 7, STAHL); R(g, 12, 4, 2, 1, STAHL_H); R(g, 14, 7, 2, 2, STAHL_H);
  R(g, 5, 1, 4, 2, STAHL_DD); P(g, 6, 1, ORANGE); P(g, 7, 1, GELB);
  R(g, 1, 4, 1, 7, STAHL_D);
}
function beton(g) {
  R(g, 2, 5, 12, 9, BETON); R(g, 2, 5, 12, 3, BETON_H); R(g, 2, 13, 12, 1, BETON_D); R(g, 13, 5, 1, 9, BETON_D);
  for (const [x, y] of [[4, 9], [7, 11], [10, 9], [5, 12], [11, 12], [8, 8]]) P(g, x, y, BETON_D);
  for (const [x, y] of [[3, 6], [9, 6], [12, 7]]) P(g, x, y, '#e6e2d4');
  R(g, 4, 3, 8, 2, '#8a877c'); R(g, 5, 2, 5, 1, '#7a776c');
}
function betonplatte(g) {
  R(g, 1, 6, 14, 3, '#c4c0b2'); R(g, 1, 9, 14, 4, BETON); R(g, 1, 12, 14, 1, BETON_D);
  R(g, 1, 6, 14, 1, '#e6e2d4');
  LINIE(g, 3, 7, 12, 8, '#9a978c', 1);
  for (const x of [3, 6, 9, 12]) { R(g, x, 10, 1, 2, '#8a5a32'); }
  for (const [x, y] of [[4, 11], [8, 11], [11, 10]]) P(g, x, y, BETON_D);
  R(g, 14, 9, 1, 3, '#8a5a32');
}
function computer(g) {
  R(g, 1, 1, 14, 10, '#2a2a34'); R(g, 1, 1, 14, 1, '#5a5a68'); R(g, 1, 10, 14, 1, '#14141a');
  R(g, 2, 2, 12, 8, '#0e2a3a'); R(g, 3, 3, 10, 6, '#3a9ad0');
  for (const [x, y, w] of [[4, 4, 5], [4, 6, 7], [4, 8, 3]]) R(g, x, y, w, 1, '#c8f0ff');
  P(g, 10, 4, '#6ad06a'); P(g, 11, 4, '#6ad06a');
  R(g, 6, 11, 4, 2, '#8a919c'); R(g, 3, 13, 10, 2, '#b4bbc6'); R(g, 3, 13, 10, 1, '#e4ebf2');
  for (const x of [4, 6, 8, 10]) P(g, x, 14, '#4a505c');
}
function antriebssystem(g) {
  R(g, 5, 3, 10, 9, '#2f3a58'); R(g, 5, 3, 10, 2, '#5a70a8'); R(g, 5, 11, 10, 1, '#161c30');
  for (const y of [6, 8, 10]) R(g, 9, y, 5, 1, '#3f4f78');
  E(g, 5, 9, 4.6, 4.6, '#d6dce4'); E(g, 5, 9, 3.4, 3.4, '#8a919c');
  for (let a = 0; a < 8; a++) { const w = (a * Math.PI) / 4; R(g, Math.round(5 + Math.cos(w) * 4.6) - 1, Math.round(9 + Math.sin(w) * 4.6) - 1, 2, 2, '#f2f6fa'); }
  E(g, 5, 9, 1.6, 1.6, GELB); P(g, 5, 9, '#7a5a1a');
  R(g, 1, 13, 14, 2, STAHL_D); for (let x = 1; x < 15; x += 2) P(g, x, 13, STAHL_H);
  R(g, 14, 6, 2, 4, GELB); P(g, 14, 6, '#fff2a8');
}
function wasserEinheit(g) {
  POLY(g, [[8, 1], [12, 8], [12, 11], [10, 14], [6, 14], [4, 11], [4, 8]], '#3a8ad0');
  POLY(g, [[8, 2], [11, 8], [11, 11], [9, 13], [7, 13], [5, 11], [5, 8]], '#6ab8f0');
  R(g, 6, 8, 1, 3, '#d8f0ff'); P(g, 7, 6, '#d8f0ff'); P(g, 7, 7, '#d8f0ff');
}

// Maschinen als Gegenstand (Symbol)
function maschinenbauerIcon(g) {
  R(g, 1, 6, 14, 3, HOLZ_H); R(g, 1, 6, 14, 1, '#e0bc8a'); R(g, 1, 8, 14, 1, HOLZ_D);
  R(g, 2, 9, 2, 5, HOLZ); R(g, 12, 9, 2, 5, HOLZ); R(g, 4, 11, 8, 1, HOLZ_D);
  R(g, 2, 3, 4, 3, STAHL_D); R(g, 2, 3, 4, 1, STAHL_H); R(g, 3, 2, 2, 1, STAHL);
  E(g, 10, 4, 2.4, 2.4, '#d6dce4'); E(g, 10, 4, 1, 1, STAHL_DD);
  for (const [x, y] of [[10, 1], [13, 4], [10, 7], [7, 4]]) P(g, x, y, '#b4bbc6');
  R(g, 6, 4, 3, 1, ORANGE);
}
function mischerIcon(g) {
  R(g, 2, 13, 12, 2, STAHL_DD); R(g, 4, 11, 2, 3, STAHL_D); R(g, 10, 11, 2, 3, STAHL_D);
  E(g, 8, 7, 6.5, 5.5, '#b4651c'); E(g, 8, 6.6, 5.7, 4.8, '#e8a030'); E(g, 7.4, 5.4, 3.6, 2.6, '#f8cc60');
  for (const y of [5, 7, 9]) R(g, 3, y, 10, 1, '#b4651c');
  E(g, 8, 2.6, 2.6, 1.3, STAHL_DD); E(g, 8, 2.8, 1.6, 0.8, '#6a6e7a');
  POLY(g, [[13, 8], [15, 10], [13, 11]], '#6ab8f0'); P(g, 14, 10, '#d8f0ff');
}
function fertigerIcon(g) {
  R(g, 1, 12, 14, 3, '#2f6a6a'); R(g, 1, 12, 14, 1, '#5aa8a8'); R(g, 1, 14, 14, 1, '#173838');
  R(g, 3, 9, 6, 3, STAHL_D); R(g, 3, 9, 6, 1, STAHL_H);
  LINIE(g, 5, 9, 5, 4, STAHL_H, 2); LINIE(g, 5, 4, 10, 3, STAHL, 2);
  R(g, 10, 2, 3, 3, GELB); P(g, 10, 2, '#fff2a8'); P(g, 12, 5, GELB);
  R(g, 10, 7, 5, 4, '#14202a'); R(g, 11, 8, 3, 2, '#3ac0e0'); P(g, 11, 8, '#c8f8ff');
}

kunst({
  stahltraeger, metallrohr, kabelrolle, rahmenplatte, nagel, zahnstange, platine, kuehlkoerper, rotor, stator, rahmen,
  motor, beton, betonplatte, computer, antriebssystem,
  wasser_einheit: wasserEinheit,
  maschinenbauer: maschinenbauerIcon,
  mischer: mischerIcon,
  fertiger: fertigerIcon,
});

// ─── Warensymbole auf dem Band (8×8, Motiv 6×6) ─────────────────────────────

Object.assign(MINI, {
  stahltraeger: (g) => { R(g, 0, 0, 6, 2, '#8a9cb4'); R(g, 0, 0, 6, 1, '#d0dcec'); R(g, 2, 2, 2, 2, '#5a6c84'); R(g, 0, 4, 6, 2, '#7a8ca4'); },
  metallrohr: (g) => { R(g, 0, 1, 6, 2, '#9aa3af'); R(g, 0, 1, 6, 1, '#e4ebf2'); R(g, 0, 4, 6, 2, '#8a919c'); P(g, 5, 2, STAHL_DD); P(g, 0, 5, STAHL_DD); },
  kabelrolle: (g) => { E(g, 3, 3, 2.9, 2.9, HOLZ); E(g, 3, 3, 2, 2, KUPFER); P(g, 2, 2, '#f0b078'); P(g, 3, 3, HOLZ_D); },
  rahmenplatte: (g) => { R(g, 0, 0, 6, 6, STAHLBLAU); R(g, 0, 0, 6, 1, '#b0c0d6'); LINIE(g, 1, 1, 4, 4, '#3a4a62', 1); LINIE(g, 4, 1, 1, 4, '#3a4a62', 1); P(g, 0, 0, '#e8c050'); P(g, 5, 5, '#e8c050'); },
  nagel: (g) => { for (const x of [0, 2, 4]) { R(g, x, 0, 2, 1, '#e4ebf2'); R(g, x, 1, 1, 5, '#8a919c'); } },
  zahnstange: (g) => { R(g, 0, 3, 6, 2, STAHL); R(g, 0, 3, 6, 1, STAHL_H); for (const x of [0, 2, 4]) R(g, x, 1, 1, 2, STAHL_H); },
  platine: (g) => { R(g, 0, 0, 6, 6, '#2f7a4a'); R(g, 0, 0, 6, 1, '#4a9a68'); R(g, 2, 2, 2, 2, '#22242c'); P(g, 0, 4, '#e8c050'); P(g, 5, 1, '#e8c050'); },
  kuehlkoerper: (g) => { R(g, 0, 4, 6, 2, '#b8642a'); for (const x of [0, 2, 4]) { R(g, x, 0, 1, 4, '#e4ebf2'); R(g, x + 1, 0, 1, 4, '#7a828e'); } },
  rotor: (g) => { E(g, 3, 3, 2.9, 2.9, '#98aac2'); R(g, 2, 2, 2, 2, ORANGE); for (const [x, y] of [[3, 0], [0, 3], [5, 3], [3, 5]]) P(g, x, y, '#3a4a62'); },
  stator: (g) => { E(g, 3, 3, 2.9, 2.9, STAHL); E(g, 3, 3, 1.2, 1.2, '#14161c'); for (const [x, y] of [[3, 0], [0, 3], [5, 3], [3, 5]]) P(g, x, y, KUPFER); },
  rahmen: (g) => { R(g, 0, 0, 6, 6, '#7a8ca4'); R(g, 1, 1, 4, 4, '#14202a'); LINIE(g, 1, 1, 4, 4, '#98aac2', 1); P(g, 0, 0, ORANGE); P(g, 5, 5, ORANGE); },
  motor: (g) => { R(g, 0, 1, 4, 4, '#3f6fa8'); R(g, 0, 1, 4, 1, '#7aaae0'); R(g, 4, 2, 2, 2, STAHL_H); P(g, 1, 0, ORANGE); },
  beton: (g) => { R(g, 0, 1, 6, 5, BETON); R(g, 0, 1, 6, 1, BETON_H); P(g, 2, 3, BETON_D); P(g, 4, 4, BETON_D); P(g, 1, 5, BETON_D); },
  betonplatte: (g) => { R(g, 0, 1, 6, 1, BETON_H); R(g, 0, 2, 6, 3, BETON); R(g, 0, 4, 6, 1, BETON_D); P(g, 1, 3, '#8a5a32'); P(g, 4, 3, '#8a5a32'); },
  computer: (g) => { R(g, 0, 0, 6, 4, '#2a2a34'); R(g, 1, 1, 4, 2, '#3a9ad0'); P(g, 1, 1, '#c8f0ff'); R(g, 2, 4, 2, 1, STAHL); R(g, 0, 5, 6, 1, '#b4bbc6'); },
  antriebssystem: (g) => { R(g, 2, 0, 4, 5, '#2f3a58'); E(g, 2, 3, 2, 2, '#d6dce4'); P(g, 2, 3, GELB); R(g, 0, 5, 6, 1, STAHL_D); R(g, 5, 1, 1, 2, GELB); },
});

// ─── Objekte auf der Karte ──────────────────────────────────────────────────

const LED = { a: '#6ad06a', e: '#e8c050', v: '#e84a3a', x: '#7a7a82' };
const arbeitet = (o) => o.st === 'a';
function led(g, lage, N, o) {
  R(g, lage.x + N - 8, lage.y + 4, 4, 4, '#1c1c22');
  R(g, lage.x + N - 7, lage.y + 5, 2, 2, LED[o.st] ?? LED.e);
}

/**
 * Maschinenbauer (48×48, Aufsicht): Werkbank aus Holz mit Amboss, Schraubstock, Bauplan, Werkzeugwand und Teilekisten.
 * Nach einem Bau schlägt der Hammer auf den Amboss und Funken fliegen.
 */
objektKunst('maschinenbauer', {
  b: 48, h: 48,
  schatten: [21, 4, -1],
  schluessel: (o, k) => `${winter(k) ? 1 : 0}`,
  malen(g, o, k) {
    platte(g, 48, '#6a4e34');
    // Werkbankplatte aus Brettern
    R(g, 4, 18, 40, 26, HOLZ_D); R(g, 4, 18, 40, 24, HOLZ);
    for (let y = 20; y < 42; y += 5) R(g, 4, y, 40, 1, dunkel(HOLZ, 0.35));
    R(g, 4, 18, 40, 2, HOLZ_H); R(g, 4, 41, 40, 3, dunkel(HOLZ, 0.55));
    for (const x of [10, 22, 36]) for (const y of [24, 31, 37]) P(g, x, y, dunkel(HOLZ, 0.25));
    // Werkzeugwand (hinten)
    R(g, 4, 4, 40, 12, '#4a3626'); R(g, 4, 4, 40, 1, '#7a5a3c'); R(g, 4, 15, 40, 1, '#2a1e14');
    R(g, 7, 6, 2, 8, STAHL); R(g, 6, 5, 4, 2, STAHL_H); // Zange
    LINIE(g, 14, 13, 18, 6, STAHL_H, 2); R(g, 17, 5, 3, 2, STAHL_D); // Schraubenschlüssel
    R(g, 23, 6, 2, 8, HOLZ_H); R(g, 21, 5, 6, 3, STAHL_D); // Hammer an der Wand
    R(g, 31, 6, 7, 1, STAHL_H); R(g, 31, 8, 7, 1, ORANGE); R(g, 31, 10, 7, 1, STAHL_H); R(g, 31, 12, 7, 1, ORANGE);
    // Bauplan (blau mit hellen Linien)
    R(g, 20, 24, 16, 12, '#2a5a98'); R(g, 20, 24, 16, 1, '#6aa0e0'); R(g, 20, 35, 16, 1, '#1a3a68');
    E(g, 26, 30, 3, 3, '#2a5a98'); // Kreis-Aussparung zum Zeichnen
    for (const [x0, y0, x1, y1] of [[22, 26, 33, 26], [22, 33, 30, 33], [31, 27, 34, 33]]) LINIE(g, x0, y0, x1, y1, '#cfe4ff', 1);
    E(g, 26, 30, 3, 3, '#2a5a98'); for (let a = 0; a < 8; a++) P(g, Math.round(26 + Math.cos((a * Math.PI) / 4) * 2.6), Math.round(30 + Math.sin((a * Math.PI) / 4) * 2.6), '#cfe4ff');
    // Schraubstock links
    R(g, 7, 22, 9, 8, STAHL_D); R(g, 7, 22, 9, 2, STAHL_H); R(g, 7, 29, 9, 1, STAHL_DD); R(g, 9, 25, 5, 2, STAHL_DD);
    LINIE(g, 6, 34, 16, 34, STAHL, 2); P(g, 5, 34, ORANGE);
    // Amboss rechts
    R(g, 38, 25, 5, 3, '#3a3e48'); R(g, 37, 28, 7, 3, '#2a2e38'); R(g, 38, 24, 5, 1, '#6a7078'); POLY(g, [[43, 25], [47, 27], [43, 28]], '#3a3e48');
    R(g, 39, 31, 3, 4, '#22252c'); R(g, 37, 35, 7, 2, '#2a2e38');
    // Teilekisten
    R(g, 6, 38, 9, 5, '#b07a48'); R(g, 6, 38, 9, 1, HOLZ_H); R(g, 7, 39, 7, 2, '#14100c');
    P(g, 8, 39, '#b4bbc6'); P(g, 10, 39, '#b4bbc6'); P(g, 12, 40, '#b4bbc6');
    R(g, 18, 38, 9, 5, '#a86a3a'); R(g, 18, 38, 9, 1, HOLZ_H); R(g, 19, 39, 7, 2, '#14100c');
    E(g, 21, 40, 1.4, 1, KUPFER); E(g, 24, 40, 1.4, 1, STAHL_H);
    if (winter(k)) schnee(g, 48);
  },
  danach(g, o, lage, k) {
    const p = bauAktiv(o, zeit(k));
    const t = zeit(k);
    // Hammer: ruht auf dem Amboss, beim Bauen hebt er sich und schlägt zu
    const schlag = p !== null ? Math.abs(Math.sin(p * Math.PI * 5)) : 1;
    const hy = Math.round(20 - (1 - schlag) * 8);
    R(g, lage.x + 41, lage.y + hy - 9, 2, 10, HOLZ_H); R(g, lage.x + 41, lage.y + hy - 9, 1, 10, dunkel(HOLZ_H, 0.25));
    R(g, lage.x + 38, lage.y + hy, 8, 4, STAHL); R(g, lage.x + 38, lage.y + hy, 8, 1, STAHL_H); R(g, lage.x + 38, lage.y + hy + 3, 8, 1, STAHL_DD);
    if (p !== null) {
      // Funken: zufällig wirkend, aber aus der Zeit berechnet
      const n = 7;
      for (let i = 0; i < n; i++) {
        const ph = (p * 5 + i / n) % 1;
        const w = i * 2.4 + Math.floor(p * 5) * 1.3;
        const x = lage.x + 40 + Math.cos(w) * ph * 9;
        const y = lage.y + 24 - Math.abs(Math.sin(w)) * ph * 12 + ph * ph * 6;
        P(g, Math.round(x), Math.round(y), ph < 0.5 ? '#fff2a8' : ORANGE);
      }
      R(g, lage.x + 21, lage.y + 24, 1, 1, '#ffffff');
    }
    // Kontrolllampe an der Werkzeugwand
    R(g, lage.x + 40, lage.y + 5, 3, 3, '#1c1c22');
    R(g, lage.x + 41, lage.y + 6, 1, 1, p !== null ? '#6ad06a' : (Math.sin(t * 2) > 0.2 ? '#e8c050' : '#7a6a30'));
  },
});

/** Mischer (32×32): Trommel mit kreisenden Schaufeln, blauer Wasseranschluss mit Tropfen, Eingänge links, hinten, rechts. */
objektKunst('mischer', {
  b: 32, h: 32,
  schatten: [13, 3, -1],
  schluessel: (o, k) => `${o.r | 0}:${winter(k) ? 1 : 0}`,
  malen(g, o, k) {
    platte(g, 32, '#6a6e7a');
    E(g, 16, 16, 12, 12, STAHL_DD); E(g, 16, 16, 11, 11, '#c8781c'); E(g, 16, 15.4, 10, 9.8, '#e8a030');
    E(g, 16, 16, 8.6, 8.6, '#7a7468'); E(g, 16, 16, 7.8, 7.8, '#9a9488');
    for (let a = 0; a < 12; a++) P(g, Math.round(16 + Math.cos((a * Math.PI) / 6) * 10.6), Math.round(16 + Math.sin((a * Math.PI) / 6) * 10.6), '#b4651c');
    // Wasseranschluss: blaues Ventil mit Tropfen unten links
    E(g, 6, 26, 4, 4, '#2a5a98'); E(g, 6, 26, 3.2, 3.2, '#5aa8e0'); POLY(g, [[6, 23], [8, 26], [6, 29], [4, 26]], '#d8f0ff');
    R(g, 3, 22, 6, 1, STAHL_H);
    // Betonrutsche vorn
    R(g, 11, 1, 10, 4, STAHL_D); R(g, 11, 1, 10, 1, STAHL_H); R(g, 12, 2, 8, 2, '#2a2e38');
    anschluesse(g, 32, o.r | 0, 2);
    if (winter(k)) schnee(g, 32);
  },
  danach(g, o, lage, k) {
    const t = zeit(k);
    const an = arbeitet(o);
    const w = an ? t * 3 : 0.6;
    for (let a = 0; a < 3; a++) {
      const ph = w + (a * Math.PI * 2) / 3;
      const x = Math.round(lage.x + 16 + Math.cos(ph) * 6.4);
      const y = Math.round(lage.y + 16 + Math.sin(ph) * 6.4);
      LINIE(g, lage.x + 16, lage.y + 16, x, y, a === 0 ? '#e8e2d0' : '#c0baa8', 2);
      R(g, x - 1, y - 1, 3, 3, '#f4efe0');
    }
    E(g, lage.x + 16, lage.y + 16, 2, 2, STAHL_DD); P(g, lage.x + 16, lage.y + 16, STAHL_H);
    if (an) {
      for (let i = 0; i < 2; i++) { const p = (t * 0.9 + i / 2) % 1; P(g, lage.x + 6, Math.round(lage.y + 29 + p * 2), `rgba(106,184,240,${1 - p})`); }
    }
    led(g, lage, 32, o);
  },
});

/** Fertiger (48×48): Drehteller mit Roboterarm, Bildschirm, vier Zutaten-Lampen (grün = genug im Eingang, rot = fehlt). */
objektKunst('fertiger', {
  b: 48, h: 48,
  schatten: [21, 4, -1],
  schluessel: (o, k) => `${o.r | 0}:${winter(k) ? 1 : 0}`,
  malen(g, o, k) {
    platte(g, 48, '#2f6a6a');
    R(g, 5, 5, 38, 38, '#1f4a52'); R(g, 5, 5, 38, 1, '#5aa8a8'); R(g, 5, 42, 38, 1, '#10282c');
    // Drehteller
    E(g, 24, 29, 13, 10, dunkel(STAHL_D, 0.3)); E(g, 24, 28, 12, 9, STAHL_D); E(g, 24, 28, 9.5, 7, STAHL); E(g, 24, 28, 9.5, 6.6, '#9aa3af');
    for (let a = 0; a < 12; a++) P(g, Math.round(24 + Math.cos((a * Math.PI) / 6) * 11.2), Math.round(28 + Math.sin((a * Math.PI) / 6) * 8.2), STAHL_H);
    E(g, 24, 28, 3, 2.4, STAHL_DD);
    // Bildschirm hinten rechts
    R(g, 29, 7, 12, 8, '#14141a'); R(g, 29, 7, 12, 1, '#5a5a68'); R(g, 30, 8, 10, 6, '#0e2a3a');
    // Zutaten-Fächer hinten links (Lampen malt `danach`)
    R(g, 7, 7, 20, 8, '#16363c'); R(g, 7, 7, 20, 1, '#3a7880'); R(g, 7, 14, 20, 1, '#0a1c20');
    for (let i = 0; i < 4; i++) R(g, 8 + i * 5, 9, 4, 4, '#0a1c20');
    anschluesse(g, 48, o.r | 0, 3);
    if (winter(k)) schnee(g, 48);
  },
  danach(g, o, lage, k) {
    const t = zeit(k);
    const an = arbeitet(o);
    const def = MASCHINEN.fertiger;
    const r = def.rezepte[o.rez ?? def.standard];
    // Lampen der Zutaten
    const ids = Object.entries(r?.ein || {});
    ids.forEach(([id, n], i) => {
      const ok = (o.ein?.[id] || 0) >= n || (o.arb && true);
      R(g, lage.x + 9 + i * 5, lage.y + 10, 2, 2, ok ? '#6ad06a' : '#e84a3a');
      P(g, lage.x + 9 + i * 5, lage.y + 10, ok ? '#c8ffc0' : '#ff9a8a');
    });
    // Bildschirm: laufende Zeilen
    const z = an ? Math.floor(t * 6) : 0;
    for (let i = 0; i < 4; i++) {
      const breit = 3 + ((z + i * 3) * 7) % 6;
      R(g, lage.x + 31, lage.y + 9 + i + (i > 1 ? 0 : 0), an ? breit : 3, 1, an ? '#7ae0ff' : '#2a5a6a');
    }
    // Roboterarm: Fuß in der Mitte, zwei Glieder, Greifer
    const w = an ? Math.sin(t * 2.4) : -0.3;
    const cx = lage.x + 24;
    const cy = lage.y + 28;
    const ex = cx + Math.round(Math.cos(0.6 + w) * 10);
    const ey = cy - 10 + Math.round(Math.sin(0.6 + w) * 4);
    const hx = cx + Math.round(Math.cos(2.4 - w * 1.2) * 11);
    const hy = cy - 3 + Math.round(Math.sin(2.4 - w * 1.2) * 4);
    LINIE(g, cx, cy - 4, ex, ey, '#14202a', 5);
    LINIE(g, ex, ey, hx, hy, '#14202a', 5);
    LINIE(g, cx, cy - 4, ex, ey, '#e8c050', 3);
    LINIE(g, ex, ey, hx, hy, '#f4d878', 3);
    R(g, ex - 2, ey - 2, 4, 4, '#14202a'); R(g, ex - 1, ey - 1, 2, 2, ORANGE);
    R(g, cx - 3, cy - 6, 7, 5, '#14202a'); R(g, cx - 2, cy - 5, 5, 3, STAHL); R(g, cx - 2, cy - 5, 5, 1, STAHL_H);
    R(g, hx - 3, hy - 2, 7, 5, '#14202a'); R(g, hx - 2, hy - 1, 5, 3, GELB); P(g, hx - 2, hy - 1, '#fff2a8');
    if (an && Math.sin(t * 9) > 0.7) { P(g, hx + 3, hy + 1, '#ffffff'); P(g, hx + 4, hy, ORANGE); P(g, hx - 3, hy + 2, '#ffffff'); }
    led(g, lage, 48, o);
  },
});

// ─── Symbol der App Bauplan (16×16, Handy) ──────────────────────────────────

symbolKunst({
  handwerk_app_bauplan(g) {
    R(g, 1, 1, 14, 14, '#2a5a98'); R(g, 1, 1, 14, 2, '#6aa0e0'); R(g, 1, 13, 14, 2, '#1a3a68');
    for (let x = 3; x < 14; x += 3) R(g, x, 3, 1, 10, '#3f74b8');
    for (let y = 5; y < 13; y += 3) R(g, 2, y, 12, 1, '#3f74b8');
    E(g, 6, 8, 2.6, 2.6, '#2a5a98'); for (let a = 0; a < 8; a++) P(g, Math.round(6 + Math.cos((a * Math.PI) / 4) * 2.5), Math.round(8 + Math.sin((a * Math.PI) / 4) * 2.5), '#e8f2ff');
    LINIE(g, 9, 5, 13, 5, '#e8f2ff', 1); LINIE(g, 9, 11, 12, 11, '#e8f2ff', 1);
    LINIE(g, 10, 12, 14, 8, GELB, 2); P(g, 14, 7, '#fff2a8');
  },
});

// ─── Licht: arbeitende Maschinen leuchten nachts ────────────────────────────

lichtQuelle((ort, v) => {
  if (!v.nacht) return null;
  const q = [];
  for (const kk in ort.welt.objekte) {
    const o = ort.welt.objekte[kk];
    if (o.t !== 'fertiger' && o.t !== 'mischer' && o.t !== 'maschinenbauer') continue;
    const aktiv = o.t === 'maschinenbauer' ? bauAktiv(o, v.t) !== null : o.st === 'a';
    if (!aktiv) continue;
    const [x, y] = Logik.ausK(kk);
    const [b, h] = OBJEKT_TYPEN[o.t]?.flaeche ?? [1, 1];
    q.push({ x: (x + b / 2) * T, y: (y + h) * T - 10, r: o.t === 'fertiger' ? 2.2 : 1.8, warm: o.t !== 'fertiger' });
  }
  return q;
});

