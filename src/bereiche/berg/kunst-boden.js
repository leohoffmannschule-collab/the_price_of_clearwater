// Bereich „berg" – Pixelkunst: Boden. Granitwand (y), Klippenfuß (r), Schotter (u), Wasserfall (v),
// Holzbrücke (w) und die Farben der Innenräume von Zimmerei und Gilde.

import { bodenKunst, innenFarben, grasKachel, zackenRand, WASSER_FARBE, P, R, E, L, mische } from '../../sprites.js';
import { hash } from '../../zufall.js';

innenFarben('zimmerei', { tapete: '#cfa972', streifen: '#bd945c', leiste: '#6a4426', teppich: '#6a8a5a', muster: '#d8c088' });
innenFarben('gilde', { tapete: '#8e8c9c', streifen: '#7e7c8e', leiste: '#3a3a48', teppich: '#8a2a3a', muster: '#c8a050' });

/** Wasserfläche in der Farbe der Karte (wie der Kern sie für '~' malt, ohne Ränder). */
function wasserGrund(g, x0, y0, tx, ty, def) {
  const basis = WASSER_FARBE[def.wasser] || WASSER_FARBE.fluss;
  R(g, x0, y0, 16, 16, basis);
  for (let i = 0; i < 4; i++) {
    R(g, x0 + Math.floor(hash(tx, ty, i) * 12), y0 + Math.floor(hash(tx, ty, i + 9) * 15), 3, 1, mische(basis, '#ffffff', 0.18));
  }
  return basis;
}

const GRANIT = { b: '#8f8d96', d: '#6e6c76', h: '#aeacb4', riss: '#585660', moos: '#6a8e4a', fuss: '#46444e' };

bodenKunst({
  /** Granitwand: senkrechte Schichten, Risse, Moos; oben ein Rasenrand, wenn dort Wiese liegt; Schnee im Winter. */
  y(g, x0, y0, { tx, ty, winter, jz, gras, nachbarn: n }) {
    const hoch = n.n === 'y' || n.n === '#';
    R(g, x0, y0, 16, 16, GRANIT.b);
    // senkrechte Gesteinsbahnen (heller / dunkler)
    for (let i = 0; i < 4; i++) {
      const bx = x0 + i * 4 + Math.floor(hash(tx, ty, i + 3) * 2);
      const f = hash(tx, ty, i + 11) < 0.5 ? GRANIT.h : GRANIT.d;
      R(g, bx, y0, 1 + Math.floor(hash(tx, ty, i + 21) * 2), 16, mische(GRANIT.b, f, 0.5));
    }
    // waagerechte Bänder: jede Schicht hat eine Kante und einen Schatten darunter
    const lage = Math.floor(hash(tx, ty, 40) * 5);
    for (let r = 0; r < 3; r++) {
      const yy = y0 + ((lage + r * 5) % 15) + 1;
      R(g, x0, yy, 16, 1, GRANIT.h);
      R(g, x0, yy + 1, 16, 1, GRANIT.d);
    }
    // Risse und Kerben
    for (let i = 0; i < 2; i++) {
      if (hash(tx, ty, 50 + i) < 0.55) {
        const sx = x0 + 2 + Math.floor(hash(tx, ty, 60 + i) * 11);
        const sy = y0 + 1 + Math.floor(hash(tx, ty, 70 + i) * 8);
        L(g, sx, sy, sx + (hash(tx, ty, 80 + i) < 0.5 ? -2 : 2), sy + 5, GRANIT.riss, 1);
      }
    }
    for (let i = 0; i < 6; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 99) * 16), hash(tx, ty, i + 5) < 0.5 ? GRANIT.h : GRANIT.d);
    if (!winter && hash(tx, ty, 90) < 0.3) {
      const mx = x0 + Math.floor(hash(tx, ty, 91) * 10);
      const my = y0 + 4 + Math.floor(hash(tx, ty, 92) * 8);
      R(g, mx, my, 3, 1, GRANIT.moos); R(g, mx + 1, my + 1, 4, 1, GRANIT.moos); P(g, mx + 2, my + 2, GRANIT.moos);
    }
    // links Licht, rechts Schatten, wo die Wand endet
    if (n.w !== 'y' && n.w !== '#') R(g, x0, y0, 1, 16, GRANIT.h);
    if (n.o !== 'y' && n.o !== '#') R(g, x0 + 15, y0, 1, 16, GRANIT.d);
    // Kopf: Oberkante der Wand
    if (!hoch) {
      R(g, x0, y0, 16, 3, mische(GRANIT.h, '#fffbea', 0.15));
      R(g, x0, y0 + 3, 16, 1, GRANIT.d);
      if (winter) {
        R(g, x0, y0, 16, 3, '#ffffff');
        for (let i = 0; i < 16; i++) if (hash(tx * 7 + i, ty, 5) < 0.5) P(g, x0 + i, y0 + 3, '#e8f0f6');
      } else {
        zackenRand(g, x0, y0, 'n', gras.b, tx, ty);
        for (let i = 0; i < 4; i++) P(g, x0 + Math.floor(hash(tx, ty, 120 + i) * 16), y0 + 3, gras.d);
      }
    } else if (winter && hash(tx, ty, 130) < 0.4) {
      R(g, x0 + Math.floor(hash(tx, ty, 131) * 10), y0 + 4, 5, 1, '#f4f8fb');
    }
    // Fuß: dunkler Sockel mit Geröll
    if (n.s !== 'y' && n.s !== '#') {
      R(g, x0, y0 + 13, 16, 3, GRANIT.fuss);
      R(g, x0, y0 + 13, 16, 1, GRANIT.d);
      for (let i = 0; i < 3; i++) P(g, x0 + 1 + Math.floor(hash(tx, ty, 140 + i) * 14), y0 + 14, GRANIT.riss);
      if (winter) for (let i = 0; i < 5; i++) P(g, x0 + Math.floor(hash(tx, ty, 150 + i) * 16), y0 + 13, '#f4f8fb');
    }
    if (jz === 'herbst' && !hoch && hash(tx, ty, 160) < 0.35) P(g, x0 + 4, y0 + 2, '#d07a2a');
  },

  /** Klippenfuß: Wiese im Schatten der Wand (oben dunkel), mit Steinchen. */
  r(g, x0, y0, { tx, ty, jz, winter }) {
    grasKachel(g, x0, y0, jz, tx, ty);
    const schatten = winter ? '#6a7a92' : '#1a2a3a';
    g.globalAlpha = 0.42; R(g, x0, y0, 16, 3, schatten);
    g.globalAlpha = 0.26; R(g, x0, y0 + 3, 16, 3, schatten);
    g.globalAlpha = 0.12; R(g, x0, y0 + 6, 16, 3, schatten);
    g.globalAlpha = 1;
    for (let i = 0; i < 2; i++) {
      if (hash(tx, ty, 30 + i) < 0.5) {
        const sx = x0 + 1 + Math.floor(hash(tx, ty, 33 + i) * 13);
        const sy = y0 + 4 + Math.floor(hash(tx, ty, 36 + i) * 9);
        R(g, sx, sy, 2, 1, '#a8a6ae'); P(g, sx, sy + 1, '#6e6c76'); P(g, sx + 1, sy + 1, '#6e6c76');
      }
    }
  },

  /** Schotter: Bergpfade und Steinbruchboden. */
  u(g, x0, y0, { tx, ty, winter, gras, nachbarn }) {
    const f = winter
      ? { b: '#dde2e6', d: '#c0c8cf', h: '#ffffff', k: '#a9b2ba' }
      : { b: '#a39d92', d: '#8a8479', h: '#bdb7aa', k: '#716b61' };
    R(g, x0, y0, 16, 16, f.b);
    for (let i = 0; i < 12; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), f.d);
    for (let i = 0; i < 6; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), f.h);
    // größere Kiesel
    for (let i = 0; i < 3; i++) {
      if (hash(tx, ty, 40 + i) < 0.7) {
        const sx = x0 + 1 + Math.floor(hash(tx, ty, 43 + i) * 13);
        const sy = y0 + 1 + Math.floor(hash(tx, ty, 46 + i) * 13);
        R(g, sx, sy, 2, 2, f.h); R(g, sx + 1, sy + 1, 1, 1, f.k); P(g, sx, sy + 1, f.d);
      }
    }
    if (hash(tx, ty, 77) < 0.12) L(g, x0 + 3, y0 + 11, x0 + 10, y0 + 8, f.k, 1);
    for (const [s, n] of Object.entries(nachbarn)) if (n === '.' || n === 'r') zackenRand(g, x0, y0, s, gras.b, tx, ty);
  },

  /** Wasserfall: Wasserschleier vor nassem Fels. Das Fließen malt der Zeichner berg_wasserfall darüber. */
  v(g, x0, y0, { tx, ty, winter, nachbarn: n }) {
    if (winter) {
      R(g, x0, y0, 16, 16, '#cfe4f0');
      for (let i = 0; i < 8; i++) R(g, x0 + i * 2, y0, 1, 16, i % 2 ? '#e8f4fa' : '#b4d2e4');
      R(g, x0, y0, 16, 2, '#ffffff');
      // Eiszapfen am unteren Ende
      if (n.s !== 'v') for (let i = 0; i < 16; i += 3) { R(g, x0 + i, y0 + 12, 2, 4, '#e8f4fa'); P(g, x0 + i, y0 + 15, '#b4d2e4'); }
    } else {
      R(g, x0, y0, 16, 16, '#4f6a82');
      for (let i = 0; i < 16; i++) {
        const f = hash(tx * 3 + i, ty, 4);
        R(g, x0 + i, y0, 1, 16, f < 0.3 ? '#8cc4e4' : f < 0.7 ? '#a8d6ee' : '#d6eef8');
      }
      for (let i = 0; i < 5; i++) {
        const sx = x0 + Math.floor(hash(tx, ty, 10 + i) * 16);
        R(g, sx, y0 + Math.floor(hash(tx, ty, 20 + i) * 12), 1, 4, '#ffffff');
      }
    }
    // Felsränder links und rechts
    if (n.w !== 'v') { R(g, x0, y0, 3, 16, GRANIT.d); R(g, x0 + 3, y0, 1, 16, GRANIT.riss); R(g, x0, y0, 1, 16, GRANIT.b); }
    if (n.o !== 'v') { R(g, x0 + 13, y0, 3, 16, GRANIT.d); R(g, x0 + 12, y0, 1, 16, GRANIT.riss); R(g, x0 + 15, y0, 1, 16, GRANIT.fuss); }
    // Kante oben und Gischt unten
    if (n.n !== 'v') { R(g, x0, y0, 16, 3, GRANIT.d); R(g, x0, y0 + 3, 16, 1, winter ? '#ffffff' : '#e8f4fa'); }
    if (n.s !== 'v' && !winter) {
      g.globalAlpha = 0.7;
      for (let i = 0; i < 6; i++) E(g, x0 + 2 + i * 2.4, y0 + 15, 2.2, 1.6, '#ffffff');
      g.globalAlpha = 1;
    }
  },

  /** Holzbrücke über Wasser, waagerecht: Planken, Geländer oben und unten. */
  w(g, x0, y0, { tx, ty, winter, def, nachbarn: n }) {
    wasserGrund(g, x0, y0, tx, ty, def);
    const plank = winter ? '#c8b89c' : '#a87848';
    const fuge = '#7a5230';
    const oben = n.n !== 'w';
    const unten = n.s !== 'w';
    const y1 = oben ? 3 : 0;
    const y2 = unten ? 12 : 16;
    R(g, x0, y0 + y1, 16, y2 - y1, plank);
    for (let i = 0; i < 4; i++) R(g, x0 + i * 4 + 3, y0 + y1, 1, y2 - y1, fuge);
    for (let i = 0; i < 3; i++) P(g, x0 + 1 + Math.floor(hash(tx, ty, i) * 14), y0 + y1 + 2 + Math.floor(hash(tx, ty, i + 5) * 4), fuge);
    R(g, x0, y0 + y1, 16, 1, '#c8986a');
    if (oben) {
      R(g, x0, y0, 16, 3, '#6a4426'); R(g, x0, y0, 16, 1, '#8a5e38');
      for (const px of [0, 8, 14]) R(g, x0 + px, y0 - 0, 2, 5, '#4e3018');
    }
    if (unten) {
      R(g, x0, y0 + 12, 16, 4, '#6a4426'); R(g, x0, y0 + 12, 16, 1, '#8a5e38'); R(g, x0, y0 + 15, 16, 1, '#3e2a14');
      for (const px of [0, 8, 14]) R(g, x0 + px, y0 + 10, 2, 6, '#4e3018');
    }
    if (n.w !== 'w') { R(g, x0, y0, 2, 16, '#6a4426'); }
    if (n.o !== 'w') { R(g, x0 + 14, y0, 2, 16, '#6a4426'); }
    if (winter) {
      for (let i = 0; i < 8; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 40) * 16), y0 + y1 + Math.floor(hash(tx, ty, i + 50) * (y2 - y1)), '#ffffff');
      if (oben) R(g, x0, y0, 16, 1, '#ffffff');
    }
  },
});
