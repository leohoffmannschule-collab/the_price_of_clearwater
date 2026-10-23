// Bereich „wildnis" – der umgestürzte Riesenstamm vor dem Geheimen Wald (großes Objekt 3×2).

import { objektKunst, P, R, E, L, LAUB } from '../../sprites.js';
import { hash } from '../../zufall.js';

objektKunst('wildnis_stamm', {
  b: 48, h: 52,
  /** Je weniger Holz übrig ist, desto mehr Späne und Kerben. */
  schluessel: (o, k) => `${Math.min(3, Math.floor(((36 - (o.hp ?? 36)) / 36) * 4))}:${k.jz}`,
  malen(g, o, k) {
    const schaden = Math.min(3, Math.floor(((36 - (o.hp ?? 36)) / 36) * 4));
    const jz = k.jz;
    const laub = LAUB[jz];
    // Zweige mit Laub hinten rechts
    if (laub) {
      for (const [cx, cy, rx, ry] of [[38, 18, 9, 7], [44, 26, 6, 5], [30, 14, 7, 5]]) { E(g, cx, cy, rx, ry, laub.d); E(g, cx - 1, cy - 1, rx - 2, ry - 2, laub.b); }
      for (const [cx, cy] of [[34, 12], [42, 20]]) E(g, cx, cy, 3, 2, laub.h);
    } else {
      for (const [x0, y0, x1, y1] of [[30, 28, 40, 12], [38, 22, 46, 14], [32, 26, 28, 12]]) L(g, x0, y0, x1, y1, '#4e3018', 2);
    }
    // Stamm: dicker, liegender Zylinder
    R(g, 8, 24, 36, 22, '#6a4428');
    for (let y = 25; y < 46; y += 4) R(g, 8, y, 36, 1, '#4e3018');
    R(g, 8, 24, 36, 4, '#8a5a34'); R(g, 8, 24, 36, 1, '#a87848'); R(g, 8, 42, 36, 4, '#4e3018');
    for (let i = 0; i < 9; i++) P(g, 10 + Math.floor(hash(i, 1, 7) * 32), 29 + Math.floor(hash(i, 2, 7) * 12), '#3e2614');
    // Moos auf dem Rücken
    if (jz !== 'winter') for (const [x, w] of [[12, 8], [24, 12], [38, 5]]) { R(g, x, 23, w, 3, '#4f8a3a'); R(g, x + 1, 22, w - 3, 1, '#62a84a'); }
    else { R(g, 8, 22, 36, 3, '#f4f8fb'); R(g, 10, 25, 30, 1, '#dfe8f0'); }
    // Schnittfläche rechts
    E(g, 44, 35, 4.6, 11.4, '#d8b07a'); E(g, 44, 35, 3.4, 9, '#c09464'); E(g, 44, 35, 2, 5.4, '#b08a5a'); E(g, 44, 35, 0.8, 1.8, '#8a6038');
    // Wurzelballen links: aufgerissen, mit Erde
    E(g, 8, 32, 7, 13, '#5a3a24'); E(g, 6, 32, 5, 11, '#6a4428');
    for (const [x0, y0, x1, y1] of [[5, 24, 0, 14], [4, 30, 0, 26], [4, 36, 0, 42], [6, 42, 2, 50], [8, 22, 8, 12]]) L(g, x0, y0, x1, y1, '#4e3018', 2);
    for (const [x, y] of [[2, 22], [1, 38], [5, 46], [10, 18]]) E(g, x, y, 2, 1.4, '#5a4028');
    R(g, 0, 46, 14, 5, '#4a3626'); R(g, 14, 46, 28, 2, '#2e2018');
    // Schaden: Kerben und Späne
    if (schaden >= 1) { L(g, 20, 30, 26, 36, '#d8b07a', 1); L(g, 26, 30, 20, 36, '#d8b07a', 1); }
    if (schaden >= 2) { E(g, 30, 36, 4, 3, '#c09464'); L(g, 32, 28, 38, 40, '#d8b07a', 1); }
    if (schaden >= 3) { E(g, 16, 38, 4, 3, '#d8b07a'); for (const [x, y] of [[4, 49], [12, 48], [18, 50]]) R(g, x, y, 3, 1, '#d8b07a'); }
  },
  schatten: [22, 4, -2],
  durchsichtig: [44, 40],
});
