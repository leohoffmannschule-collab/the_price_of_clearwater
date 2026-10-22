// Bereich „tiere" – Pixelkunst: Eier, der Hühnerstall, die Eierkiste vor dem Stall (je nach Bestand
// leer, mit wenigen, einigen oder vielen Eiern und einer Blase mit Ei, solange etwas drin liegt; im
// Winter mit Schnee) und das Küken-Symbol für den Laden. Hühner gibt es in der Welt nicht.

import { kunst, gebaeudeKunst, dekoKunst, tierKunst, dach, fensterKasten, E, P, R, L, kugel } from '../../sprites.js';
import { kistenStufe } from './inhalt.js';

kunst('ei', (g, b) => {
  if (b.gross) kugel(g, 8, 9, 5, 6, b.f); else kugel(g, 8, 9.5, 4.2, 5, b.f);
});

gebaeudeKunst('stall', {
  b: 80, h: 64, licht: [[58, 34]],
  malen(g, { winter, nacht }) {
    R(g, 6, 24, 68, 40, '#b8483a'); for (let x = 10; x < 72; x += 6) R(g, x, 24, 1, 40, '#9a3a2e');
    R(g, 6, 24, 68, 2, '#f0e8d8'); R(g, 6, 62, 68, 2, '#6a5a4a');
    dach(g, 0, 28, 80, 28, 4, 10, '#5a3a3a', winter);
    R(g, 31, 40, 18, 24, '#f0e8d8'); R(g, 33, 42, 14, 22, '#8a3a2e'); L(g, 33, 42, 46, 63, '#f0e8d8', 1); L(g, 46, 42, 33, 63, '#f0e8d8', 1);
    fensterKasten(g, 54, 30, 10, 8, nacht); fensterKasten(g, 16, 30, 10, 8, nacht);
  },
});

/** Küken-Symbol 16×16 für die Ware im Laden (nach links, steht). */
tierKunst('huhn', (g) => {
  E(g, 8, 10, 5, 4, '#f4f0e8'); E(g, 7, 11, 3, 2, '#e0dacc'); P(g, 3, 7, '#f4f0e8'); P(g, 3, 8, '#e8e2d4'); P(g, 2, 7, '#e0dacc');
  E(g, 11, 6, 2.6, 2.6, '#f4f0e8'); R(g, 10, 2, 2, 2, '#d83a3a'); P(g, 14, 6, '#f2a03a'); P(g, 12, 5, '#141414');
  P(g, 12, 8, '#d83a3a');
  P(g, 7, 14, '#f2a03a'); P(g, 9, 14, '#f2a03a'); P(g, 7, 15, '#f2a03a'); P(g, 9, 15, '#f2a03a');
});

/** Ein Ei 3×4 Pixel mit Glanzpunkt, oben links bei (x, y). */
function ei(g, x, y, f) {
  R(g, x + 1, y, 1, 1, f); R(g, x, y + 1, 3, 2, f); R(g, x + 1, y + 3, 1, 1, f);
  P(g, x + 1, y + 1, '#ffffff'); P(g, x + 2, y + 2, '#bfa77e'); P(g, x + 1, y + 3, '#bfa77e');
}

/** Eierkiste: Holzkiste mit Strohbett, 16×16 Kiste plus Platz für Eierhaufen und Blase darüber. */
dekoKunst('eierkiste', {
  b: 16, h: 32,
  zustand: (d, k) => ({ stufe: kistenStufe(k.s) }),
  malen(g, d, { winter, zustand }) {
    const y0 = 17;
    const stufe = zustand.stufe;
    if (stufe > 0) {
      // Blase mit Ei: hier liegt etwas zum Abholen
      R(g, 3, 0, 10, 8, '#fffaf0'); R(g, 2, 1, 12, 6, '#fffaf0'); R(g, 7, 8, 3, 1, '#fffaf0'); P(g, 8, 9, '#fffaf0');
      ei(g, 6, 2, '#d9a566'); R(g, 9, 3, 1, 2, '#d9a566');
      R(g, 7, 2, 2, 1, '#e8c490');
    }
    // Strohbett (Blick leicht von oben in die Kiste)
    R(g, 1, y0 + 1, 14, 1, '#7a4e2a');
    R(g, 2, y0 + 2, 12, 3, '#e6c25a');
    for (const x of [2, 5, 8, 11, 13]) P(g, x, y0 + 2, '#f4dc82');
    for (const x of [3, 7, 10]) P(g, x, y0 + 3, '#c9a043');
    for (const [x, y] of [[1, y0 + 3], [14, y0 + 2], [4, y0 + 1], [9, y0 + 1]]) P(g, x, y, '#e6c25a');
    // Eier auf dem Stroh
    if (stufe === 1) ei(g, 6, y0 - 1, '#f4ede0');
    else if (stufe >= 2) {
      ei(g, 3, y0, '#f4ede0'); ei(g, 7, y0 - 1, '#d9a566'); ei(g, 10, y0, '#fbf6ea');
      if (stufe >= 3) { ei(g, 5, y0 - 3, '#fbf6ea'); ei(g, 9, y0 - 3, '#d9a566'); ei(g, 1, y0 - 1, '#d9a566'); ei(g, 12, y0 - 1, '#f4ede0'); }
    }
    // Vorderwand aus Brettern
    R(g, 1, y0 + 5, 14, 10, '#9a6a3a');
    R(g, 1, y0 + 8, 14, 1, '#7a4e2a'); R(g, 1, y0 + 11, 14, 1, '#7a4e2a');
    R(g, 0, y0 + 4, 16, 2, '#b07a48'); R(g, 0, y0 + 4, 16, 1, '#c8925a');
    R(g, 1, y0 + 5, 2, 10, '#6a4426'); R(g, 13, y0 + 5, 2, 10, '#6a4426');
    P(g, 2, y0 + 7, '#d8d8e0'); P(g, 13, y0 + 7, '#d8d8e0'); P(g, 2, y0 + 12, '#d8d8e0'); P(g, 13, y0 + 12, '#d8d8e0');
    R(g, 6, y0 + 7, 4, 3, '#f2ead8'); R(g, 7, y0 + 8, 2, 1, '#c8a050');
    if (winter) { R(g, 0, y0 + 3, 16, 2, '#f2f6fa'); R(g, 1, y0 + 2, 4, 1, '#ffffff'); R(g, 11, y0 + 2, 4, 1, '#ffffff'); R(g, 3, y0 + 5, 3, 1, '#e0eaf2'); }
  },
});
