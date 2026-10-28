// Bereich „mine" – Pixelkunst der Monster. Jede Art hat Phasen (siehe `monsterPhase` in kunst-kampf.js):
// Schleim 0/1 ruhen, 2 sammeln, 3 springen · Fledermaus 0–2 Flügelschlag · Krabbe/Pilzling 0 getarnt,
// 1 aufwachen, 2/3 laufen · Larve 0/1 · Käfer 0/1 laufen, 2 zielen, 3 stürmen · Geist 0/1 · Skelett,
// Schatten, Schamane (16×24) 0/1 gehen, 2 werfen/zaubern · Wichtel 0 ruhen, 1 springen · Metallkopf 0/1.
// Die Bilder schauen nach links; nach rechts spiegelt der Zeichner.

import { monsterKunst, P, R, E, L, POLY, kugel, hell, dunkel, mische } from '../../sprites.js';

const AUGE = '#141414';

/** Steinbuckel wie ein Minenstein (Tarnung der Krabben). */
function buckel(g, f, cy = 10) {
  kugel(g, 8, cy, 6.6, 5.3, f);
  P(g, 7, cy, dunkel(f, 0.3)); P(g, 10, cy + 2, dunkel(f, 0.3)); P(g, 5, cy + 1, dunkel(f, 0.25));
}

monsterKunst({
  schleim(g, farbe, phase) {
    const [rx, ry, cy] = [[6, 4.6, 11], [6.3, 4.3, 11.2], [7.2, 3.4, 12.2], [4.8, 5.8, 9.6]][phase] || [6, 4.6, 11];
    E(g, 8, cy + 0.4, rx, ry, dunkel(farbe, 0.22));
    E(g, 8, cy - 0.4, rx - 0.8, ry - 0.8, farbe);
    E(g, 8.5, cy + ry * 0.35, rx - 2.2, ry * 0.35, mische(farbe, '#ffffff', 0.12));
    E(g, 5.6, cy - ry * 0.45, 1.6, 1.1, hell(farbe, 0.6)); P(g, 5, cy - ry * 0.55, '#ffffff');
    const ay = Math.round(cy - 1);
    R(g, 6, ay, 1, 2, AUGE); R(g, 10, ay, 1, 2, AUGE); P(g, 6, ay, '#ffffff');
    if (phase === 3) P(g, 8, ay + 3, dunkel(farbe, 0.5));
  },
  fledermaus(g, farbe, phase) {
    const f = dunkel(farbe, 0.1);
    E(g, 8, 8, 2.8, 3.2, farbe); POLY(g, [[6, 6], [6, 3], [7.5, 5]], farbe); POLY(g, [[10, 6], [10, 3], [8.5, 5]], farbe);
    if (phase === 0) { POLY(g, [[6, 8], [0, 2], [1, 6], [0, 9], [3, 8]], f); POLY(g, [[10, 8], [16, 2], [15, 6], [16, 9], [13, 8]], f); }
    else if (phase === 1) { POLY(g, [[6, 8], [0, 7], [2, 9], [1, 11], [4, 10]], f); POLY(g, [[10, 8], [16, 7], [14, 9], [15, 11], [12, 10]], f); }
    else { POLY(g, [[6, 8], [1, 12], [3, 12], [3, 14], [5, 11]], f); POLY(g, [[10, 8], [15, 12], [13, 12], [13, 14], [11, 11]], f); }
    E(g, 8, 9, 1.6, 1.8, hell(farbe, 0.2));
    P(g, 7, 7, '#f2d24a'); P(g, 9, 7, '#f2d24a'); P(g, 7, 10, '#ffffff'); P(g, 9, 10, '#ffffff');
  },
  krabbe(g, farbe, phase) {
    if (phase === 0) { buckel(g, farbe); return; }
    const hoch = phase === 2 ? 0 : 1;
    // Beine
    const bein = dunkel(farbe, 0.35);
    for (const [x0, x1, y] of [[3, 0, 10], [4, 1, 12], [12, 15, 10], [11, 14, 12]]) L(g, x0, y + hoch, x1, y + 2 - hoch * (x0 < 8 ? 1 : -1) + hoch, bein, 1);
    // Scheren
    E(g, 2, 7, 2, 1.8, hell(farbe, 0.1)); P(g, 1, 6, dunkel(farbe, 0.4));
    E(g, 14, 7, 2, 1.8, hell(farbe, 0.1)); P(g, 15, 6, dunkel(farbe, 0.4));
    buckel(g, farbe, 9);
    // Augen auf Stielen
    R(g, 5, 3, 1, 3, bein); R(g, 10, 3, 1, 3, bein);
    E(g, 5.5, 2.5, 1.3, 1.3, '#ffffff'); E(g, 10.5, 2.5, 1.3, 1.3, '#ffffff'); P(g, 5, 2, AUGE); P(g, 10, 2, AUGE);
    if (phase === 1) { P(g, 4, 1, '#ffffff'); P(g, 11, 1, '#ffffff'); }
  },
  larve(g, farbe, phase) {
    const d = phase ? 0.6 : 0;
    for (let i = 0; i < 4; i++) {
      const x = 4 + i * 2.6 + (i % 2 ? d : -d);
      const y = 11 - (i === 0 ? 1 : 0) + (i % 2 ? -d : d) * 0.5;
      kugel(g, x, y, 2.8 - i * 0.2, 2.6 - i * 0.15, i % 2 ? farbe : hell(farbe, 0.12));
    }
    E(g, 3.6, 9.5, 1, 1, AUGE); P(g, 3, 9, '#ffffff');
    L(g, 2, 7, 1, 5, dunkel(farbe, 0.4), 1);
    for (let i = 0; i < 4; i++) P(g, 4 + i * 2.6, 13.6, dunkel(farbe, 0.45));
  },
  kaefer(g, farbe, phase) {
    const s = phase === 1 || phase === 3 ? 1 : 0;
    const bein = '#1c2a24';
    for (const [x, y] of [[5, 13], [8, 13], [11, 13]]) { L(g, x, 11, x - 1 + s, y + 1, bein, 1); }
    E(g, 9, 9, 5.6, 4.2, farbe);
    E(g, 9, 7.6, 4.6, 2.6, hell(farbe, 0.25));
    L(g, 9, 5, 13, 10, dunkel(farbe, 0.3), 1);
    E(g, 3.5, 9.5, 2.4, 2.2, dunkel(farbe, 0.35));
    L(g, 2, 8, 0, 5, dunkel(farbe, 0.4), 1);
    const auge = phase === 2 || phase === 3 ? '#ff4a3a' : '#f8e070';
    P(g, 2, 9, auge); P(g, 3, 9, auge);
    P(g, 8, 6, '#ffffff');
  },
  geist: {
    b: 16, h: 18,
    malen(g, farbe, phase) {
      const w = phase ? 1 : 0;
      POLY(g, [[3, 8], [4, 4], [8, 1], [12, 4], [13, 8], [13, 15], [11, 13 + w], [9.5, 16 - w], [8, 13 + w], [6.5, 16 - w], [5, 13 + w], [3, 15]], farbe);
      POLY(g, [[3, 8], [4, 4], [8, 1], [8, 13], [5, 13], [3, 15]], hell(farbe, 0.4));
      E(g, 6, 7, 1.3, 1.8, '#2a3a5a'); E(g, 10, 7, 1.3, 1.8, '#2a3a5a');
      E(g, 8, 11, 1.2, 1.4 + w * 0.4, '#3a4a6a');
      P(g, 5, 4, '#ffffff');
    },
  },
  skelett: {
    b: 16, h: 24,
    malen(g, farbe, phase) {
      const kn = farbe;
      const dk = dunkel(kn, 0.3);
      const s = phase === 1 ? 1 : 0;
      // Beine
      L(g, 6, 15, 5 - s, 22, kn, 1); L(g, 9, 15, 10 + s, 22, kn, 1); R(g, 3 - s, 22, 3, 1, kn); R(g, 10 + s, 22, 3, 1, kn);
      // Becken, Wirbelsäule, Rippen
      R(g, 5, 14, 6, 2, kn); L(g, 8, 9, 8, 14, dk, 1);
      for (const y of [9, 11, 13]) { R(g, 5, y, 6, 1, kn); P(g, 4, y + 1, kn); P(g, 11, y + 1, kn); }
      // Arme
      if (phase === 2) { L(g, 5, 9, 2, 4, kn, 1); E(g, 2, 3, 1.6, 1.2, '#ece4d0'); }
      else { L(g, 5, 9, 3, 14 - s, kn, 1); }
      L(g, 11, 9, 12, 14 + s, kn, 1);
      // Schädel
      kugel(g, 8, 5, 4, 3.8, kn);
      R(g, 6, 8, 5, 2, kn);
      E(g, 6, 5, 1.2, 1.3, '#1a1414'); E(g, 10, 5, 1.2, 1.3, '#1a1414'); P(g, 6, 5, '#ff6a4a'); P(g, 10, 5, '#ff6a4a');
      P(g, 8, 7, dk); for (const x of [6, 8, 10]) P(g, x, 9, dk);
    },
  },
  wichtel(g, farbe, phase) {
    const cy = phase ? 7.5 : 9.5;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; L(g, 8, cy, 8 + Math.cos(a) * 6, cy + Math.sin(a) * 5.4, farbe, 1); }
    E(g, 8, cy, 4.6, 4.2, farbe);
    E(g, 6.5, cy - 1.6, 1.4, 1, hell(farbe, 0.25));
    E(g, 6, cy, 1.4, 1.6, '#ffffff'); E(g, 10, cy, 1.4, 1.6, '#ffffff'); P(g, 6, cy + 0.4, AUGE); P(g, 10, cy + 0.4, AUGE);
    if (!phase) { R(g, 5, 14, 2, 1, farbe); R(g, 9, 14, 2, 1, farbe); }
  },
  metallkopf(g, farbe, phase) {
    const s = phase ? 1 : 0;
    // Beinchen
    R(g, 4 + s, 13, 2, 2, '#3a3a42'); R(g, 10 - s, 13, 2, 2, '#3a3a42');
    // Helmkopf
    POLY(g, [[2, 12], [2, 6], [5, 2], [11, 2], [14, 6], [14, 12]], farbe);
    POLY(g, [[2, 12], [2, 6], [5, 2], [8, 2], [7, 12]], hell(farbe, 0.3));
    R(g, 2, 11, 12, 2, dunkel(farbe, 0.25));
    R(g, 4, 7, 8, 2, '#1a1a22');
    R(g, 5, 7, 2, 2, '#ff5a3a'); R(g, 9, 7, 2, 2, '#ff5a3a'); P(g, 5, 7, '#ffd0a0');
    for (const x of [4, 8, 12]) P(g, x, 4, dunkel(farbe, 0.4));
    L(g, 8, 2, 8, 0, '#3a3a42', 1); P(g, 8, 0, '#f8d070');
  },
  schatten: {
    b: 16, h: 24,
    malen(g, farbe, phase) {
      const s = phase === 1 ? 1 : 0;
      const d = dunkel(farbe, 0.3);
      // Beine
      POLY(g, [[5, 16], [7, 16], [6 - s, 23], [3 - s, 23]], d); POLY(g, [[9, 16], [11, 16], [13 + s, 23], [10 + s, 23]], d);
      // Körper, buckelig
      POLY(g, [[3, 17], [2, 10], [5, 5], [11, 5], [14, 10], [13, 17]], farbe);
      POLY(g, [[3, 17], [2, 10], [5, 5], [8, 5], [7, 17]], hell(farbe, 0.15));
      // Arme mit Krallen
      L(g, 3, 9, 1, 16 + s, farbe, 2); L(g, 13, 9, 15, 16 - s, farbe, 2);
      P(g, 0, 17 + s, '#c8b8f0'); P(g, 15, 17 - s, '#c8b8f0');
      // Kopf mit Hörnern
      kugel(g, 8, 5, 3.6, 3.2, farbe);
      L(g, 5, 3, 3, 0, d, 1); L(g, 11, 3, 13, 0, d, 1);
      R(g, 6, 5, 1, 1, '#f8e060'); R(g, 10, 5, 1, 1, '#f8e060'); P(g, 6, 4, '#fff8c0');
      R(g, 7, 7, 3, 1, '#1a1020');
      if (phase === 2) for (const [x, y] of [[1, 6], [15, 7], [3, 2]]) P(g, x, y, '#a888e0');
    },
  },
  schamane: {
    b: 16, h: 24,
    malen(g, farbe, phase) {
      const s = phase === 1 ? 1 : 0;
      // Robe
      POLY(g, [[4, 9], [12, 9], [14, 22], [2, 22]], farbe);
      POLY(g, [[4, 9], [8, 9], [7, 22], [2, 22]], hell(farbe, 0.15));
      R(g, 2, 21, 12, 1, dunkel(farbe, 0.3));
      for (const x of [4, 8, 12]) P(g, x, 18, '#c8a050');
      // Stab
      L(g, 13, 4, 13, 22, '#6a4a2a', 1);
      E(g, 13, 3, 1.8, 1.8, phase === 2 ? '#f8d070' : '#f8904a'); P(g, 13, 2, '#ffffff');
      // Kapuze
      POLY(g, [[4, 10], [4, 5], [8, 1], [12, 5], [12, 10]], dunkel(farbe, 0.15));
      E(g, 8, 7, 2.6, 2.4, '#140c1a');
      P(g, 7, 7, '#f86a3a'); P(g, 9, 7, '#f86a3a');
      // Arm
      L(g, 11, 11, 13, 9 + s, dunkel(farbe, 0.1), 2);
      if (phase === 2) for (const [x, y] of [[11, 1], [15, 2], [14, 0]]) P(g, x, y, '#f8d070');
    },
  },
  pilzling(g, farbe, phase) {
    const hut = farbe;
    if (phase === 0) {
      R(g, 6, 10, 4, 5, '#ece4d0'); R(g, 6, 10, 1, 5, '#ffffff');
      POLY(g, [[2, 10], [3, 6], [8, 3], [13, 6], [14, 10]], hut);
      POLY(g, [[2, 10], [3, 6], [8, 3], [8, 10]], hell(hut, 0.2));
      for (const [x, y] of [[5, 6], [9, 5], [11, 8], [6, 8]]) P(g, x, y, '#f8f0ff');
      return;
    }
    const s = phase === 3 ? 1 : 0;
    R(g, 5 - s, 13, 2, 2, '#c8bca0'); R(g, 9 + s, 13, 2, 2, '#c8bca0');
    R(g, 5, 9, 6, 5, '#ece4d0'); R(g, 5, 9, 1, 5, '#ffffff');
    P(g, 6, 11, AUGE); P(g, 9, 11, AUGE);
    if (phase === 1) { P(g, 6, 10, '#ffffff'); P(g, 9, 10, '#ffffff'); }
    R(g, 7, 12, 2, 1, '#8a4a5a');
    POLY(g, [[1, 9], [2, 5], [8, 1], [14, 5], [15, 9]], hut);
    POLY(g, [[1, 9], [2, 5], [8, 1], [8, 9]], hell(hut, 0.2));
    for (const [x, y] of [[4, 5], [9, 3], [12, 7], [6, 7]]) P(g, x, y, '#f8f0ff');
  },
});
