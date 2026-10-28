// Bereich „gemeinschaft" – Pixelkunst der Großabnehmer: ein Wappen (16×16) je Firma, Vertrauenssterne und das Symbol der
// Handy-App „Aufträge". Die Gesichter der Ansprechpartner (32×32) malt der Kern aus `aussehen` (portraetBild).
// Raster und Licht wie in ARCHITEKTUR 9.5: Motiv in x/y 1–14, Umriss macht der Kern, Licht von oben links.

import { symbolKunst, P, R, E, L, POLY, hell, dunkel, kugel } from '../../sprites.js';
import { FIRMEN } from './grossabnehmer-daten.js';

const CREME = '#fff3d0';
const GOLD = '#f2c94c';

/** Wappenschild in der Farbe der Firma. */
function schild(g, f) {
  POLY(g, [[1, 1], [15, 1], [15, 9], [8, 15], [1, 9]], dunkel(f, 0.4));
  POLY(g, [[2, 2], [14, 2], [14, 8.6], [8, 13.6], [2, 8.6]], f);
  R(g, 2, 2, 12, 1, hell(f, 0.35));
  R(g, 2, 3, 1, 5, hell(f, 0.15));
  R(g, 13, 3, 1, 5, dunkel(f, 0.18));
}

const WAPPEN = {
  // Mauer aus Ziegeln
  baufirma(g) {
    for (let r = 0; r < 4; r++) {
      const y = 3 + r * 2;
      const versatz = r % 2 ? 2 : 0;
      for (let x = 2 + versatz - 4; x < 14; x += 4) {
        const a = Math.max(3, x + 1);
        const b = Math.min(13, x + 4);
        if (b > a) R(g, a, y, b - a, 1, r % 2 ? '#fff3d0' : '#ffe0a0');
      }
    }
    R(g, 3, 11, 10, 1, dunkel('#e0a83a', 0.25));
    E(g, 8, 6.5, 1.2, 1.2, '#c8553d');
    R(g, 6, 7, 4, 1, '#c8553d');
  },
  // Blitz
  elektro(g) {
    POLY(g, [[9.5, 2.5], [4.5, 8], [7.4, 8], [6, 12.5], [11.5, 6.5], [8.6, 6.5]], '#ffe56a');
    POLY(g, [[9, 3.5], [6, 7.6], [8.2, 7.6]], '#fff9c0');
    P(g, 9, 6, '#d8a82a');
  },
  // Anker
  werft(g) {
    E(g, 8, 4, 1.3, 1.3, CREME);
    E(g, 8, 4, 0.5, 0.5, '#2f5f8f');
    R(g, 7, 5, 2, 7, CREME);
    R(g, 5, 6, 6, 1, CREME);
    L(g, 4, 8, 7, 11.5, CREME, 1); L(g, 12, 8, 9, 11.5, CREME, 1);
    P(g, 3, 8, CREME); P(g, 13, 8, CREME);
    R(g, 7, 11, 2, 1, hell(CREME, 0.3));
  },
  // goldener Löffel
  gasthaus(g) {
    E(g, 8, 5.5, 2.4, 3.2, GOLD);
    E(g, 7.4, 4.6, 1.2, 1.7, hell(GOLD, 0.55));
    R(g, 7, 8, 2, 4, dunkel(GOLD, 0.15));
    R(g, 7, 8, 1, 4, GOLD);
    P(g, 8, 12, dunkel(GOLD, 0.35));
  },
  // Apfel im Korb
  hofladen(g) {
    kugel(g, 8, 7.5, 3.6, 3.4, '#e0443a');
    R(g, 8, 2, 1, 2, '#6a4426');
    E(g, 10.2, 3.2, 1.6, 0.9, '#8fd06a');
    P(g, 6, 6, '#ffb0a0');
    R(g, 3, 11, 10, 1, '#c8a050');
  },
  // gekreuzte Spitzhacken
  bergwerk(g) {
    L(g, 4, 4, 11, 11, '#8a5a32', 1); L(g, 11, 4, 4, 11, '#8a5a32', 1);
    L(g, 3, 5, 6, 2.5, '#e8e8f0', 2); L(g, 12, 5, 9, 2.5, '#e8e8f0', 2);
    P(g, 3, 6, '#aab0bc'); P(g, 12, 6, '#aab0bc');
    L(g, 11, 11, 12, 12, '#6a4426', 1); L(g, 4, 11, 3, 12, '#6a4426', 1);
  },
  // Edelstein
  sammler(g) {
    POLY(g, [[8, 3], [12, 6.5], [8, 12.5], [4, 6.5]], '#8fe0f0');
    POLY(g, [[8, 3], [4, 6.5], [8, 6.5]], '#d8f8ff');
    POLY(g, [[8, 6.5], [12, 6.5], [8, 12.5]], '#4aa8c8');
    L(g, 4, 6.5, 12, 6.5, '#ffffff', 1);
    P(g, 6, 5, '#ffffff'); P(g, 5, 4, CREME); P(g, 12, 3, CREME); P(g, 3, 10, CREME);
  },
};

for (const [id, malen] of Object.entries(WAPPEN)) {
  symbolKunst(`gross_wappen_${id}`, (g) => {
    schild(g, FIRMEN[id].farbe);
    malen(g);
  });
}

// Vertrauenssterne: gefüllt (Gold) und leer (blasses Papier)
const stern = (g, f) => POLY(g, [[8, 1], [10, 6], [15, 6], [11, 9], [13, 15], [8, 11], [3, 15], [5, 9], [1, 6], [6, 6]], f);
symbolKunst('gross_stern', (g) => {
  stern(g, GOLD);
  POLY(g, [[8, 3], [9, 6.5], [6.6, 6.5]], '#fff3b0');
  P(g, 6, 8, '#fff3b0');
});
symbolKunst('gross_stern_leer', (g) => {
  stern(g, '#cbbb92');
  P(g, 7, 5, '#e2d6b4'); P(g, 6, 7, '#e2d6b4');
});

// Handy-App „Aufträge": Vertragsmappe mit Siegel
symbolKunst('gross_app_auftraege', (g) => {
  R(g, 1, 1, 14, 14, '#a8522c'); R(g, 1, 1, 14, 2, '#d8825a'); R(g, 1, 13, 14, 2, '#6a3018');
  R(g, 4, 3, 8, 10, '#f2ead8'); R(g, 4, 3, 8, 1, '#ffffff'); R(g, 11, 3, 1, 10, '#cdb688');
  R(g, 5, 5, 6, 1, '#8a6a4a'); R(g, 5, 7, 6, 1, '#b8a888'); R(g, 5, 9, 4, 1, '#b8a888');
  E(g, 11, 11, 2.6, 2.6, '#c83a3a'); E(g, 10.6, 10.6, 1.4, 1.4, '#ec6a52');
  R(g, 10, 12, 1, 2, '#c83a3a'); R(g, 12, 12, 1, 2, '#a02828');
});
