// Bereich „handwerk" – Fabrik Stufe 2: Pixelkunst des Stromnetzes. Gegenstände (Bänder Mk2/Mk3, Generatoren, Mast,
// Kabelrolle, Handy), Objekte auf der Karte (Strommast mit Statuslampe, Biomasse-Brenner mit Glut und Rauch,
// Kohlekraftwerk mit Kühlturm und Dampf, Wasserrad, das sich dreht), Kabel durch die Luft (Durchhang, nachts dezent),
// die Vorschau beim Verlegen und das Glühen der Generatoren in der Nacht.
// Statisches wird gecacht (Schlüssel), `danach` und die Zeichner malen nur einfache Formen.

import { kunst, objektKunst, P, R, E, L as LINIE, POLY, hell, dunkel } from '../../sprites.js';
import { zeichner, lichtQuelle } from '../../render.js';
import { T, OBJEKT_TYPEN } from '../../daten.js';
import * as Logik from '../../logik.js';
import { S } from '../../spiel.js';
import { STAHL, STAHL_H, STAHL_D, STAHL_DD, GELB, ORANGE, platte, anschluesse, schnee } from './fabrik-kunst.js';
import { anschlussStatus, stromNetze, kabelPruefen, kabelLaenge } from './fabrik-strom.js';
import { kabelAnfang } from './fabrik-strom-objekte.js';
import { STROM } from './fabrik-strom-daten.js';

const winter = (k) => k?.jz === 'winter';
const zeit = (k) => k?.t || 0;
const KUPFER = '#d98a4e';
const ZIEGEL = '#9a4e36';
const ZIEGEL_H = '#c06a4a';
const ZIEGEL_D = '#6a3426';
const BETON = '#9a978c';
const BETON_H = '#c4c0b2';
const BETON_D = '#6a675e';

// ─── Gegenstände (16×16) ────────────────────────────────────────────────────

function bandIcon(g, kante, kanteD) {
  R(g, 1, 4, 14, 8, STAHL_DD);
  R(g, 1, 3, 14, 2, kante); R(g, 1, 3, 14, 1, hell(kante, 0.4));
  R(g, 1, 11, 14, 2, kanteD); R(g, 1, 12, 14, 1, STAHL_DD);
  for (let x = 2; x < 14; x += 3) R(g, x, 5, 1, 6, '#50555f');
  for (const [x, y] of [[8, 5], [9, 6], [10, 7], [9, 8], [8, 9]]) P(g, x, y, '#ffffff');
  for (const [x, y] of [[5, 5], [6, 6], [7, 7], [6, 8], [5, 9]]) P(g, x, y, '#ffffff');
}

function handyIcon(g) {
  R(g, 4, 1, 8, 14, '#22242c'); R(g, 4, 1, 8, 1, '#4a4e5a'); R(g, 4, 1, 1, 14, '#3a3e48');
  R(g, 5, 3, 6, 9, '#3a8ac8'); R(g, 5, 3, 6, 3, '#6ac0f0');
  for (const [x, y, f] of [[6, 7, GELB], [9, 7, '#8fd06a'], [6, 9, ORANGE], [9, 9, '#e84a6a']]) R(g, x, y, 2, 1, f);
  R(g, 7, 13, 2, 1, '#6a6e7a');
  P(g, 7, 2, '#6a6e7a'); P(g, 8, 2, '#6a6e7a');
}

function kabelrolle(g) {
  E(g, 8, 8.5, 6.5, 6, '#1e1e24'); E(g, 8, 8.5, 5.4, 4.9, '#34343c');
  for (let i = 0; i < 4; i++) E(g, 8, 8.5, 4.6 - i * 1.1, 4.2 - i, i % 2 ? '#2a2a32' : '#44444e');
  E(g, 8, 8.5, 1.4, 1.3, '#7a7a86');
  LINIE(g, 13, 6, 15, 2, '#1e1e24', 1);
  R(g, 13, 1, 3, 2, KUPFER); P(g, 14, 0, '#f0b078');
}

function mastIcon(g) {
  R(g, 7, 3, 2, 12, '#7a5a3a'); R(g, 7, 3, 1, 12, '#9a7a52');
  R(g, 2, 3, 12, 2, '#6a4a2e'); R(g, 2, 3, 12, 1, '#8a6a46');
  for (const x of [3, 12]) { R(g, x, 5, 1, 2, '#e8f0e8'); P(g, x, 7, '#8ac0a0'); }
  R(g, 5, 14, 6, 1, BETON_D);
  LINIE(g, 0, 9, 3, 7, '#24242c', 1); LINIE(g, 12, 7, 15, 9, '#24242c', 1);
}

function brennerIcon(g) {
  R(g, 2, 5, 12, 9, ZIEGEL); R(g, 2, 5, 12, 1, ZIEGEL_H); R(g, 2, 13, 12, 1, ZIEGEL_D);
  for (let y = 7; y < 13; y += 2) for (let x = 2 + ((y / 2) % 2) * 2; x < 14; x += 4) P(g, x, y, ZIEGEL_D);
  R(g, 10, 1, 3, 4, STAHL_D); R(g, 10, 1, 3, 1, STAHL);
  R(g, 5, 8, 6, 4, '#1c0e0a'); R(g, 6, 9, 4, 3, ORANGE); R(g, 7, 9, 2, 1, GELB);
}

function kraftwerkIcon(g) {
  POLY(g, [[2, 14], [3, 9], [2, 4], [8, 4], [7, 9], [8, 14]], BETON); R(g, 2, 4, 6, 1, BETON_H);
  R(g, 8, 8, 7, 6, '#5a6a7a'); R(g, 8, 8, 7, 1, '#8a9aaa'); R(g, 12, 3, 2, 5, STAHL_D);
  R(g, 9, 10, 2, 2, GELB); R(g, 12, 10, 2, 2, GELB);
  E(g, 5, 2.5, 3, 1.6, '#e8ecf0');
}

function radIcon(g) {
  E(g, 8, 8, 6.5, 6.5, '#6a4a2e'); E(g, 8, 8, 5, 5, '#3a6a8a');
  for (let a = 0; a < 8; a++) {
    const x = 8 + Math.cos((a * Math.PI) / 4) * 6;
    const y = 8 + Math.sin((a * Math.PI) / 4) * 6;
    LINIE(g, 8, 8, Math.round(x), Math.round(y), '#9a7a52', 1);
    R(g, Math.round(x) - 1, Math.round(y) - 1, 2, 2, '#8a6a46');
  }
  E(g, 8, 8, 1.5, 1.5, STAHL_D);
  R(g, 1, 13, 14, 2, '#4a8ac8'); P(g, 3, 13, '#a8d8f0'); P(g, 10, 14, '#a8d8f0');
}

function pumpeIcon(g) {
  R(g, 3, 4, 10, 8, '#3f6f9a'); R(g, 3, 4, 10, 1, '#6a9ac8'); R(g, 3, 11, 10, 1, '#2a4a6a');
  R(g, 5, 1, 6, 3, STAHL); R(g, 5, 1, 6, 1, STAHL_H);
  R(g, 7, 12, 2, 3, STAHL_D);
  R(g, 1, 14, 14, 2, '#4a8ac8'); P(g, 4, 14, '#a8d8f0');
  R(g, 6, 6, 4, 3, '#1c2a38'); P(g, 7, 7, '#8ad0f0');
}

function rohrIcon(g, f, dick) {
  const d = dick ? 8 : 6;
  const y = 8 - d / 2;
  R(g, 1, y, 14, d, f); R(g, 1, y, 14, 1, hell(f, 0.45)); R(g, 1, y + d - 1, 14, 1, dunkel(f, 0.4));
  for (const x of [3, 11]) { R(g, x, y - 1, 2, d + 2, dunkel(f, 0.2)); R(g, x, y - 1, 2, 1, hell(f, 0.3)); }
  R(g, 6, y + 2, 4, 1, '#bfefff');
}

kunst({
  foerderband_mk2: (g) => bandIcon(g, '#e8b840', '#a87a1a'),
  foerderband_mk3: (g) => bandIcon(g, '#5aa8e0', '#2a5a98'),
  handy: handyIcon,
  stromkabel: kabelrolle,
  strommast: mastIcon,
  biomassebrenner: brennerIcon,
  kohlekraftwerk: kraftwerkIcon,
  wasserrad: radIcon,
  wasserpumpe: pumpeIcon,
  rohrleitung: (g) => rohrIcon(g, '#8a96a4', false),
  rohrleitung_mk2: (g) => rohrIcon(g, '#c8743a', true),
});

// ─── Strommast ──────────────────────────────────────────────────────────────

const MAST_H = 44;
objektKunst('strommast', {
  b: 16, h: MAST_H,
  schatten: [4, 2, -1],
  schluessel: (o, k) => `${winter(k) ? 1 : 0}`,
  malen(g, o, k) {
    const holz = '#7a5a3a';
    R(g, 4, 40, 8, 4, BETON_D); R(g, 4, 40, 8, 1, BETON_H); R(g, 5, 41, 6, 2, BETON);
    R(g, 7, 6, 3, 35, holz); R(g, 7, 6, 1, 35, '#9a7a52'); R(g, 9, 6, 1, 35, '#5a3e26');
    for (let y = 12; y < 38; y += 7) P(g, 8, y, '#5a3e26');
    R(g, 1, 6, 14, 2, '#6a4a2e'); R(g, 1, 6, 14, 1, '#8a6a46');
    LINIE(g, 4, 8, 7, 12, '#5a3e26', 1); LINIE(g, 12, 8, 9, 12, '#5a3e26', 1);
    for (const x of [2, 13]) { R(g, x, 3, 1, 3, '#e8f0e8'); R(g, x - 1, 4, 3, 1, '#b8d8c0'); }
    R(g, 7, 1, 3, 5, STAHL_D); R(g, 7, 1, 3, 1, STAHL_H);
    if (winter(k)) { R(g, 1, 5, 14, 1, '#f4f8fb'); R(g, 7, 0, 3, 1, '#f4f8fb'); R(g, 4, 39, 8, 1, '#f4f8fb'); }
  },
  danach(g, o, lage, k) {
    const s = k?.s ?? S.s;
    if (!s || !k?.ort || k.tx == null) return;
    const st = anschlussStatus(s, k.ort, Logik.k(k.tx, k.ty)).status;
    const t = zeit(k);
    const f = st === 'an' ? '#6ad06a' : st === 'sicherung' ? (Math.floor(t * 3) % 2 ? '#ff4a3a' : '#5a1a14') : st === 'leer' || st === 'ohne' || st === 'vorrang' ? '#e8a040' : '#5a5a62';
    R(g, lage.x + 7, lage.y + 2, 3, 2, '#14141a');
    R(g, lage.x + 8, lage.y + 2, 1, 2, f);
  },
});

// ─── Generatoren ────────────────────────────────────────────────────────────

const LED = { a: '#6ad06a', e: '#e8c050', v: '#e84a3a', x: '#7a7a82' };
function led(g, x, y, st) {
  R(g, x, y, 4, 4, '#1c1c22');
  R(g, x + 1, y + 1, 2, 2, LED[st] ?? LED.e);
}
const arbeitet = (o) => o.st === 'a';

/** Rauchwölkchen über (x, y), dichter mit `stark`. */
function rauch(g, x, y, t, nacht, n = 3, hoch = 12, farbe) {
  for (let i = 0; i < n; i++) {
    const p = (t * 0.45 + i / n) % 1;
    g.save();
    g.globalAlpha = 0.75 * (1 - p);
    g.fillStyle = farbe ?? (nacht ? '#8a909c' : '#d0d0d6');
    const r = 1 + Math.round(p * 2.5);
    g.fillRect(Math.round(x + Math.sin((t + i * 2.1) * 1.3) * 2 + p * 3 - r), Math.round(y - p * hoch - r), r * 2, r * 2);
    g.restore();
  }
}

const BRENNER_H = 44;
objektKunst('biomassebrenner', {
  b: 32, h: BRENNER_H,
  schatten: [13, 3, -1],
  schluessel: (o, k) => `${o.r | 0}:${winter(k) ? 1 : 0}:${k?.nacht ? 1 : 0}`,
  malen(g, o, k) {
    const dy = BRENNER_H - 32;
    // Schornstein (hinten rechts)
    R(g, 21, 0, 6, 18, '#5a5e68'); R(g, 21, 0, 6, 1, '#8a8e98'); R(g, 21, 0, 1, 18, '#7a7e88'); R(g, 26, 0, 1, 18, '#3a3e48');
    R(g, 20, 3, 8, 2, '#3a3e48');
    g.translate(0, dy);
    platte(g, 32, '#5a4e46');
    // Ziegelkörper
    R(g, 4, 3, 24, 24, ZIEGEL); R(g, 4, 3, 24, 2, ZIEGEL_H); R(g, 4, 25, 24, 2, ZIEGEL_D); R(g, 26, 3, 2, 24, ZIEGEL_D);
    for (let y = 7; y < 25; y += 3) {
      R(g, 4, y, 22, 1, dunkel(ZIEGEL, 0.25));
      for (let x = 6 + ((y / 3) % 2) * 3; x < 26; x += 6) P(g, x, y + 1, dunkel(ZIEGEL, 0.25));
    }
    // Feuertür
    R(g, 9, 12, 14, 11, '#2a2a30'); R(g, 9, 12, 14, 1, '#5a5a64');
    R(g, 11, 14, 10, 7, '#1c0e0a');
    for (let x = 12; x < 21; x += 2) R(g, x, 14, 1, 7, '#3a2a24');
    // Isolator fürs Kabel auf dem Dach (links)
    R(g, 6, 0, 3, 3, STAHL); R(g, 7, -1, 1, 1, '#e8f0e8'); R(g, 5, 1, 5, 1, '#b8d8c0');
    anschluesse(g, 32, 0, 2, { seiten: ['ein', 'ein', 'ein', 'ein'] }); // Brennstoff von allen Seiten
    if (winter(k)) schnee(g, 32);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (winter(k)) R(g, 21, 0, 6, 1, '#f4f8fb');
  },
  danach(g, o, lage, k) {
    const t = zeit(k);
    const y0 = lage.y + BRENNER_H - 32;
    if (arbeitet(o)) {
      const fl = Math.sin(t * 11) > 0;
      R(g, lage.x + 12, y0 + 16, 8, 5, fl ? ORANGE : '#d85a1a');
      R(g, lage.x + 13, y0 + 18, 6, 2, GELB);
      P(g, lage.x + 13 + (Math.floor(t * 6) % 6), y0 + 15, '#f6c04a');
      for (let x = lage.x + 12; x < lage.x + 21; x += 2) R(g, x, y0 + 14, 1, 7, '#3a2a24');
      rauch(g, lage.x + 24, lage.y + 1, t, k?.nacht);
    } else {
      R(g, lage.x + 12, y0 + 19, 8, 2, (o.ein && Object.values(o.ein).some((n) => n > 0)) ? '#5a2a1a' : '#2a1a14');
    }
    led(g, lage.x + 24, y0 + 5, o.fl ? 'v' : o.st);
  },
});

const KW_H = 80;
const KW_DY = KW_H - 48;
/** Kühlturm (geschwungen) von y0 bis y1 im Bild, Mitte cx. */
function kuehlturm(g, cx, y0, y1, schneit) {
  for (let y = y0; y < y1; y++) {
    // Hyperboloid: oben 7, Taille 5,5 bei einem Drittel, unten 11 Pixel halbe Breite
    const u = (y - y0) / (y1 - y0 - 1);
    const halb = u < 0.33 ? 5.5 + ((0.33 - u) / 0.33) * 1.5 : 5.5 + ((u - 0.33) / 0.67) ** 1.7 * 5.5;
    const x0 = Math.round(cx - halb);
    const w = Math.round(halb * 2);
    R(g, x0, y, w, 1, BETON);
    R(g, x0, y, 2, 1, BETON_H);
    R(g, x0 + 2, y, 2, 1, hell(BETON, 0.12));
    R(g, x0 + w - 4, y, 2, 1, dunkel(BETON, 0.12));
    R(g, x0 + w - 2, y, 2, 1, BETON_D);
    if ((y - y0) % 8 === 4) R(g, x0 + 2, y, w - 4, 1, dunkel(BETON, 0.08));
  }
  R(g, cx - 7, y0, 14, 1, BETON_H);
  R(g, cx - 6, y0 + 1, 12, 2, '#2e2e34');
  if (schneit) R(g, cx - 7, y0, 14, 1, '#f4f8fb');
}

objektKunst('kohlekraftwerk', {
  b: 48, h: KW_H,
  schatten: [21, 4, -1],
  schluessel: (o, k) => `${o.r | 0}:${winter(k) ? 1 : 0}:${k?.nacht ? 1 : 0}`,
  malen(g, o, k) {
    // Schornstein auf dem Maschinenhaus (rechts hinten)
    R(g, 38, 6, 4, KW_DY + 2, '#b8b4a8'); R(g, 38, 6, 4, 1, '#e4e0d4'); R(g, 41, 6, 1, KW_DY + 2, '#7a776e');
    for (const y of [9, 10, 17, 18]) R(g, 38, y, 4, 1, '#c8403a');
    g.translate(0, KW_DY);
    platte(g, 48, '#5a5e64');
    // Maschinenhaus (rechts)
    R(g, 22, 4, 22, 36, '#5a6a7a'); R(g, 22, 4, 22, 2, '#8a9aaa'); R(g, 22, 38, 22, 2, '#3a4a5a'); R(g, 42, 4, 2, 36, '#3a4a5a');
    for (let x = 26; x < 42; x += 5) R(g, x, 6, 1, 32, '#4e5e6e');
    const fenster = k?.nacht ? '#f6d070' : '#2a3a4a';
    for (const [x, y] of [[25, 9], [31, 9], [37, 9]]) { R(g, x, y, 4, 4, fenster); R(g, x, y, 4, 1, k?.nacht ? '#fff0b0' : '#4a5a6a'); }
    // Kohlebunker vorn am Haus
    R(g, 25, 22, 16, 14, '#2a2a30'); R(g, 25, 22, 16, 2, '#4a4a54');
    for (const [x, y] of [[27, 26], [31, 25], [35, 27], [29, 30], [34, 31], [37, 29]]) R(g, x, y, 3, 2, '#14141a');
    // Wasseranschlüsse (blaue Stutzen) an den Seiten
    for (const [x, y, w, h] of [[1, 30, 3, 6], [44, 20, 3, 6], [10, 44, 6, 3], [30, 44, 6, 3]]) { R(g, x, y, w, h, '#3f6f9a'); R(g, x, y, w, 1, '#8ac0e8'); }
    // Rohr vom Kühlturm ins Haus
    R(g, 18, 30, 5, 4, '#3f6f9a'); R(g, 18, 30, 5, 1, '#8ac0e8');
    // Isolatoren fürs Kabel auf dem Dach
    for (const x of [28, 32]) { R(g, x, 1, 2, 4, STAHL); R(g, x - 1, 2, 4, 1, '#b8d8c0'); P(g, x, 0, '#e8f0e8'); }
    anschluesse(g, 48, 0, 3, { seiten: ['ein', 'ein', 'ein', 'ein'] }); // Kohle von allen Seiten
    if (winter(k)) { schnee(g, 48); R(g, 22, 4, 22, 1, '#f4f8fb'); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    // Kühlturm (links), steht auf der Platte und ragt hoch hinaus
    kuehlturm(g, 12, 8, KW_DY + 42, winter(k));
    if (winter(k)) R(g, 38, 6, 4, 1, '#f4f8fb');
  },
  danach(g, o, lage, k) {
    const t = zeit(k);
    const y0 = lage.y + KW_DY;
    if (arbeitet(o)) {
      // Dampf aus dem Kühlturm, Rauch aus dem Schornstein
      for (let i = 0; i < 5; i++) {
        const p = (t * 0.25 + i / 5) % 1;
        g.save();
        g.globalAlpha = 0.85 * (1 - p);
        g.fillStyle = k?.nacht ? '#aab0bc' : '#f2f4f6';
        const r = 3 + Math.round(p * 5);
        g.fillRect(Math.round(lage.x + 12 + Math.sin((t * 0.7 + i) * 1.1) * 3 - r), Math.round(lage.y + 8 - p * 20 - r), r * 2, Math.round(r * 1.6));
        g.restore();
      }
      rauch(g, lage.x + 40, lage.y + 6, t, k?.nacht, 3, 10);
      const glut = Math.sin(t * 7) > 0 ? ORANGE : '#d85a1a';
      R(g, lage.x + 27, y0 + 34, 12, 1, glut);
    }
    // Wasserstand im Tank (Balken am Fuß des Kühlturms)
    const tank = o.wa || 0;
    R(g, lage.x + 4, y0 + 40, 16, 3, '#1c1c22');
    if (tank > 0) R(g, lage.x + 5, y0 + 41, Math.max(1, Math.round(14 * Math.min(1, tank / 50))), 1, '#5ab8f0');
    led(g, lage.x + 38, y0 + 14, o.fl ? 'v' : o.st);
  },
});

// ─── Wasserrad ──────────────────────────────────────────────────────────────

objektKunst('wasserrad', {
  b: 16, h: 26,
  schatten: [6, 2, -1],
  schluessel: (o, k) => `${arbeitet(o) ? Math.floor(zeit(k) * 4) % 4 : 0}:${winter(k) ? 1 : 0}`,
  malen(g, o, k) {
    const ph = arbeitet(o) ? Math.floor(zeit(k) * 4) % 4 : 0;
    const cx = 8;
    const cy = 15;
    // Gestell
    R(g, 1, 9, 2, 16, '#5a3e26'); R(g, 13, 9, 2, 16, '#5a3e26'); R(g, 1, 9, 14, 1, '#7a5a3a');
    // Rad
    E(g, cx, cy, 7, 7, '#6a4a2e'); E(g, cx, cy, 5.6, 5.6, '#4a7a9a');
    for (let a = 0; a < 8; a++) {
      const w = ((a + ph / 4) * Math.PI) / 4;
      const x = Math.round(cx + Math.cos(w) * 6);
      const y = Math.round(cy + Math.sin(w) * 6);
      LINIE(g, cx, cy, x, y, '#9a7a52', 1);
      R(g, x - 1, y - 1, 2, 2, '#b08a5a');
    }
    E(g, cx, cy, 1.6, 1.6, STAHL_D); P(g, cx - 1, cy - 1, STAHL_H);
    // Generatorkasten mit Isolator
    R(g, 9, 2, 6, 6, STAHL_D); R(g, 9, 2, 6, 1, STAHL_H); R(g, 11, 0, 2, 2, '#e8f0e8');
    if (winter(k)) R(g, 1, 8, 14, 1, '#f4f8fb');
  },
  danach(g, o, lage, k) {
    if (!arbeitet(o)) return;
    const t = zeit(k);
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.3 + i / 3) % 1;
      P(g, Math.round(lage.x + 2 + p * 12), lage.y + 24 - Math.round(Math.sin(p * Math.PI) * 2), '#d8f0ff');
    }
  },
});

// ─── Kabel durch die Luft ───────────────────────────────────────────────────

/** Weltpixel, an dem ein Kabel an diesem Anschluss hängt (Isolator, Dach), oder null. */
export function anker(ort, kk) {
  const o = ort.welt.objekte[kk];
  if (!o) return null;
  const [x, y] = Logik.ausK(kk);
  const [b] = OBJEKT_TYPEN[o.t]?.flaeche ?? [1, 1];
  switch (o.t) {
    case 'strommast': return [x * T + 8, (y + 1) * T - MAST_H + 4];
    case 'biomassebrenner': return [x * T + 7, y * T - 1];
    case 'kohlekraftwerk': return [x * T + 30, y * T + 2];
    case 'wasserrad': return [x * T + 12, (y + 1) * T - 26 + 1];
    case 'wasserpumpe': return [x * T + 8, (y + 1) * T - 24 + 2];
    default: return [x * T + (b * T) / 2, y * T + 4];
  }
}

/** Kabel mit Durchhang von a nach b (Weltpixel), 1 Pixel breit. */
function kabelLinie(g, ax, ay, bx, by, farbe, strich = 0) {
  const d = Math.hypot(bx - ax, by - ay);
  const sag = 3 + d * 0.09;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2 + sag;
  const n = Math.max(2, Math.ceil(d));
  g.fillStyle = farbe;
  let lx = null;
  let ly = null;
  for (let i = 0; i <= n; i++) {
    if (strich && Math.floor(i / strich) % 2) continue;
    const u = i / n;
    const x = Math.round((1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx);
    const y = Math.round((1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by);
    if (x === lx && y === ly) continue;
    g.fillRect(x, y, 1, 1);
    lx = x;
    ly = y;
  }
}

zeichner({
  name: 'handwerk_strom_kabel', ebene: 'ueber', reihe: 5,
  zeichnen(g, kamera, ort, sicht) {
    const s = sicht.s;
    const liste = s?.fabrik?.strom?.kabel?.[ort.def.id];
    if (liste?.length) {
      const farbe = sicht.nacht ? '#0c0c12' : '#22222a';
      g.save();
      g.globalAlpha = sicht.nacht ? 0.55 : 0.92;
      for (const [a, b] of liste) {
        const pa = anker(ort, a);
        const pb = anker(ort, b);
        if (!pa || !pb) continue;
        const x0 = Math.min(pa[0], pb[0]);
        const y0 = Math.min(pa[1], pb[1]);
        if (!sicht.imBild(x0, y0, Math.abs(pa[0] - pb[0]) + 2, Math.abs(pa[1] - pb[1]) + 24)) continue;
        kabelLinie(g, pa[0], pa[1], pb[0], pb[1], farbe);
      }
      g.restore();
    }
    // Vorschau: gewählter Anfang → Ziel (grün, wenn es geht; rot mit Grund)
    const start = kabelAnfang();
    const hand = s?.spieler?.inv[s.spieler.wahl];
    if (!start || start.karte !== ort.def.id || hand?.id !== 'stromkabel' || S.pause || !S.ziel) return;
    const pa = anker(ort, start.kk);
    if (!pa) return;
    const h = Logik.hauptVon(ort, S.ziel.x, S.ziel.y);
    const ziel = h.o && h.kk !== start.kk && stromNetze(s, ort).knoten.has(h.kk) ? h.kk : null;
    const pb = ziel ? anker(ort, ziel) : [S.ziel.x * T + 8, S.ziel.y * T + 8];
    const ok = ziel ? kabelPruefen(s, ort, start.kk, ziel).ok : false;
    const nah = ziel ? kabelLaenge(ort, start.kk, ziel) <= STROM.kabelReichweite : true;
    g.save();
    g.globalAlpha = 0.9;
    kabelLinie(g, pa[0], pa[1], pb[0], pb[1], ok ? '#8ff08f' : ziel || !nah ? '#ff5a4a' : '#f2d38a', 3);
    g.restore();
  },
});

/** Glut der arbeitenden Generatoren leuchtet nachts. */
lichtQuelle((ort, v) => {
  if (!v.nacht || !v.s?.fabrik?.strom) return null;
  const c = stromNetze(v.s, ort);
  const q = [];
  for (const n of c.knoten.values()) {
    if (n.art !== 'gen' || n.o.st !== 'a' || n.o.t === 'wasserrad') continue;
    const [x, y] = Logik.ausK(n.kk);
    const [b, h] = OBJEKT_TYPEN[n.o.t]?.flaeche ?? [1, 1];
    q.push({ x: (x + b / 2) * T, y: (y + h) * T - 10, r: n.o.t === 'kohlekraftwerk' ? 3.2 : 2.2, warm: true });
  }
  return q;
});

