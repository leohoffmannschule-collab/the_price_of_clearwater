// Bereich „pflanzen" – Pflanzen auf dem Beet (16×24, Erde bei y = fuss = 21). Jede Feldfrucht hat
// ihr eigenes Bild in Phase 2 (jung), 3 (groß, oft mit Blüte) und 4 (reif). Keimling (Phase 0/1)
// und Verwelktes malt der Kern; Rankhilfe-Pflanzen malen mit { alle: true } ab Phase 0 ihr Gerüst.

import { PFLANZEN_BILD, pflanzenKunst, kunstMalen, P, R, E, L, POLY, kugel, mische, hell, dunkel, BLATT, BLATT_D, BLATT_H } from '../../sprites.js';
import { ITEMS } from '../../daten.js';

const HOLZ_R = '#a8784a';
const HOLZ_RD = '#7a5232';

// ─── Bausteine ──────────────────────────────────────────────────────────────

/** Ovales Blatt mit Mittelrippe und Licht oben links. */
function blatt(g, x, y, rx, ry, f = BLATT, rippe = true) {
  E(g, x, y, rx, ry, f);
  if (rx >= 1.5 && ry >= 1.5) E(g, x - rx * 0.3, y - ry * 0.35, rx * 0.45, ry * 0.4, hell(f, 0.25));
  if (rippe && rx >= 2) L(g, Math.round(x - rx + 1), Math.round(y), Math.round(x + rx - 1), Math.round(y), dunkel(f, 0.25), 1);
}
/** Grashalm-artiges Blatt (Linie) mit hellerer Spitze. */
function halm(g, x0, y0, x1, y1, f, d = 1) {
  L(g, x0, y0, x1, y1, f, d);
  P(g, x1, y1, hell(f, 0.35));
}
/** Rosette aus einzelnen Blättern mit Stielen: hinten dunkler, vorn heller; n Blätter, Höhe h. */
function rosette(g, fuss, n, h, breite, f, f2 = dunkel(f, 0.15), stiel = null) {
  stiel ??= dunkel(f, 0.2);
  const reihe = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    reihe.push([(t - 0.5) * breite * 2, Math.abs(t - 0.5)]);
  }
  // äußere Blätter zuerst (liegen tiefer und hinten)
  reihe.sort((a, b) => b[1] - a[1]);
  reihe.forEach(([dx, rand], i) => {
    const x = 8 + dx;
    const y = fuss - h * (1 - rand * 0.75);
    const ry = Math.max(1.5, h / 3.4);
    L(g, 8, fuss, Math.round(x), Math.round(y + ry), stiel, 1);
    const ff = rand > 0.3 ? f2 : i % 2 ? f : hell(f, 0.08);
    E(g, x, y, 1.9, ry, ff);
    L(g, Math.round(x), Math.round(y - ry + 1), Math.round(x), Math.round(y + ry), dunkel(ff, 0.28), 1);
    P(g, Math.round(x - 1), Math.round(y - ry / 2), hell(ff, 0.3));
  });
}

// ─── Wurzelgemüse ───────────────────────────────────────────────────────────

/** Breite Blätter, reif mit sichtbarer Rübenschulter. */
function ruebe({ laub = BLATT, stiel = null, ruebe: rf, form = 'rund' }) {
  return (g, { phase, f, fuss }) => {
    const farbe = rf ?? f;
    const h = [0, 0, 5, 8, 9][phase];
    if (phase === 4) {
      if (form === 'lang') { E(g, 8, fuss - 0.5, 2.6, 2, farbe); P(g, 7, fuss - 2, hell(farbe, 0.4)); }
      else { kugel(g, 8, fuss - 1.5, 3.4, 2.6, farbe); }
    }
    rosette(g, phase === 4 ? fuss - 2 : fuss, phase === 2 ? 3 : 5, h, phase === 2 ? 2.5 : 4.5, laub, dunkel(laub, 0.15), stiel);
  };
}
/** Möhre: fiedriges Laub. */
function fiederlaub(g, fuss, h, f) {
  for (const [dx, k] of [[-5, 0], [-2, 1], [0, 2], [3, 1], [5, 0]]) {
    if (Math.abs(dx) > h) continue;
    const x1 = 8 + dx;
    const y1 = fuss - h + k;
    L(g, 8, fuss, x1, y1, dunkel(f, 0.1), 1);
    for (let t = 0.35; t < 1; t += 0.22) {
      const x = Math.round(8 + dx * t);
      const y = Math.round(fuss + (y1 - fuss) * t);
      P(g, x - 1, y, f); P(g, x + 1, y - 1, hell(f, 0.25));
    }
  }
}

pflanzenKunst({
  pastinake: ruebe({ laub: '#6aa84f', ruebe: '#efe0a0', form: 'lang' }),
  zuckerruebe: ruebe({ laub: '#5c9a45', ruebe: '#f0e6c8' }),
  radieschen: ruebe({ laub: '#6aa84f', ruebe: '#e04a72' }),
  rotebete: ruebe({ laub: '#4f8a3a', stiel: '#a8304a', ruebe: '#8e2a4a' }),
  moehre(g, { phase, f, fuss }) {
    if (phase === 4) { E(g, 8, fuss - 0.5, 2.4, 2, f); P(g, 7, fuss - 1, hell(f, 0.4)); }
    fiederlaub(g, phase === 4 ? fuss - 2 : fuss, [0, 0, 5, 8, 10][phase], '#5fae3c');
  },
  knoblauch(g, { phase, fuss }) {
    const h = [0, 0, 6, 9, 10][phase];
    if (phase === 4) { kugel(g, 8, fuss - 1, 3, 2.4, '#f2ece0'); P(g, 7, fuss - 2, '#c8a8c8'); }
    for (const [dx, k] of [[-3, 2], [-1, 0], [1, 1], [3, 3]]) halm(g, 8 + Math.sign(dx), fuss - (phase === 4 ? 2 : 0), 8 + dx, fuss - h + k, k % 2 ? '#7aae5a' : '#5c9a45');
    if (phase >= 3) {
      L(g, 8, fuss - 2, 9, fuss - h - 3, '#8aba6a', 1);
      if (phase === 4) { kugel(g, 9, fuss - h - 4, 1.6, 1.6, '#c8a0d8'); P(g, 8, fuss - h - 6, '#e0c8f0'); }
      else P(g, 10, fuss - h - 3, '#8aba6a');
    }
  },
  yamswurzel(g, { phase, f, fuss }) {
    if (phase === 4) { E(g, 6, fuss - 0.5, 3.5, 1.8, f); E(g, 10.5, fuss, 2.5, 1.5, dunkel(f, 0.1)); P(g, 5, fuss - 1, hell(f, 0.35)); }
    const h = [0, 0, 6, 10, 11][phase];
    L(g, 8, fuss - 1, 8, fuss - h, '#6a8a3a', 1); L(g, 8, fuss - h / 2, 12, fuss - h + 2, '#6a8a3a', 1);
    for (const [x, y, r] of [[5, fuss - h / 2, 2.2], [11, fuss - h / 2 - 2, 2.2], [8, fuss - h, 2], [12, fuss - h + 2, 1.8], [5, fuss - 3, 2]]) {
      if (y < fuss - h - 1) continue;
      POLY(g, [[x - r, y - r * 0.6], [x + r, y - r * 0.6], [x, y + r]], (x + y) % 2 ? '#5c9a45' : '#4a8a3a');
      P(g, Math.round(x - r / 2), Math.round(y - r * 0.6), hell('#5c9a45', 0.3));
    }
  },
  kartoffel(g, { phase, fuss }) {
    const h = [0, 0, 6, 9, 10][phase];
    rosette(g, fuss, phase === 2 ? 3 : 5, h, phase === 2 ? 3 : 5, '#5a9a3a', '#4a8a32');
    blatt(g, 8, fuss - h + 1, 2.5, 2.2, '#6aaa48');
    if (phase === 4) for (const [x, y] of [[5, fuss - h + 1], [10, fuss - h], [8, fuss - h - 2], [12, fuss - h + 3]]) {
      bluete5(g, x, y, '#f2eef8', '#f2d24a');
    }
    if (phase === 4) { E(g, 4, fuss, 2, 1.2, '#c99a5b'); P(g, 3, fuss - 1, hell('#c99a5b', 0.4)); }
  },
});

/** Kleine Blüte aus vier Blättern um eine Mitte. */
function bluete5(g, x, y, f, mitte) {
  x = Math.round(x); y = Math.round(y);
  P(g, x - 1, y, f); P(g, x + 1, y, f); P(g, x, y - 1, f); P(g, x, y + 1, f); P(g, x, y, mitte);
}

// ─── Kohl und Blattgemüse ───────────────────────────────────────────────────

/** Kohlblätter am Boden. */
function kohlblaetter(g, fuss, groesse, f, f2) {
  const r = groesse;
  blatt(g, 8 - r * 0.9, fuss - r * 0.55, r * 0.75, r * 0.5, f2);
  blatt(g, 8 + r * 0.9, fuss - r * 0.55, r * 0.75, r * 0.5, f2);
  blatt(g, 8 - r * 0.45, fuss - r * 0.95, r * 0.6, r * 0.55, f);
  blatt(g, 8 + r * 0.5, fuss - r * 1, r * 0.6, r * 0.55, f);
}

pflanzenKunst({
  blumenkohl(g, { phase, f, fuss }) {
    kohlblaetter(g, fuss, [0, 0, 4, 6, 6.5][phase], '#6aaa52', '#4e8a3e');
    if (phase === 4) {
      for (const [x, y] of [[5.5, fuss - 6], [10.5, fuss - 6], [8, fuss - 8.5], [8, fuss - 5]]) kugel(g, x, y, 2.9, 2.5, f);
      for (const [x, y] of [[6, fuss - 7], [9, fuss - 9], [10, fuss - 5]]) P(g, x, y, dunkel(f, 0.12));
      blatt(g, 3.5, fuss - 5, 2, 3, '#5c9a45', false); blatt(g, 12.5, fuss - 5, 2, 3, '#4e8a3e', false);
    } else if (phase === 3) kugel(g, 8, fuss - 6, 2, 1.6, '#e8ecd0');
  },
  gruenkohl(g, { phase, f, fuss }) {
    const h = [0, 0, 6, 9, 11][phase];
    for (const [dx, k, ff] of [[-4, 3, f], [4, 3, dunkel(f, 0.12)], [-2, 0, hell(f, 0.1)], [2, 1, f], [0, -1, hell(f, 0.18)]]) {
      if (phase === 2 && Math.abs(dx) > 3) continue;
      const x = 8 + dx;
      const y = fuss - h + k + 3;
      L(g, 8, fuss, x, y + 2, '#a8c890', 1);
      E(g, x, y, 2.2, h / 3.3, ff);
      for (let yy = Math.round(y - h / 3.3); yy < y + h / 3.3; yy += 2) { P(g, Math.round(x - 2.6), yy, ff); P(g, Math.round(x + 2.4), yy + 1, ff); }
      L(g, x, Math.round(y - h / 3.3) + 1, x, Math.round(y + h / 3.3), dunkel(ff, 0.3), 1);
    }
  },
  rotkohl(g, { phase, f, fuss }) {
    kohlblaetter(g, fuss, [0, 0, 4, 6, 6.5][phase], mische(f, '#5a8a6a', 0.5), mische(f, '#3a6a5a', 0.6));
    if (phase >= 3) kugel(g, 8, fuss - 5.5, phase === 4 ? 4.2 : 2.6, phase === 4 ? 3.6 : 2.2, f);
    if (phase === 4) { L(g, 8, fuss - 9, 8, fuss - 3, '#b07ab8', 1); L(g, 5, fuss - 6, 8, fuss - 7, '#b07ab8', 1); }
  },
  brokkoli(g, { phase, f, fuss }) {
    kohlblaetter(g, fuss, [0, 0, 4, 6, 6.5][phase], '#5a9a4a', '#4a7a3e');
    if (phase >= 3) {
      R(g, 7, fuss - 8, 2, 5, '#8aba6a');
      const r = phase === 4 ? 1.9 : 1.2;
      for (const [x, y] of [[6, fuss - 9], [10, fuss - 9], [8, fuss - 11], [8, fuss - 8]]) kugel(g, x, y, r, r, phase === 4 ? '#2e5a3a' : '#6aa85a');
      if (phase === 4) for (const [x, y] of [[5, fuss - 10], [9, fuss - 12], [10, fuss - 9], [7, fuss - 8]]) P(g, x, y, '#5a9a5a');
    }
  },
  pakchoi(g, { phase, f, fuss }) {
    const h = [0, 0, 6, 9, 11][phase];
    for (const [dx, ff] of [[-3, dunkel(f, 0.12)], [3, dunkel(f, 0.12)], [-1, f], [1, hell(f, 0.1)]]) {
      if (phase === 2 && Math.abs(dx) > 2) continue;
      L(g, 8 + Math.sign(dx), fuss, 8 + dx, fuss - h / 2, '#eef5dc', 2);
      blatt(g, 8 + dx * 1.3, fuss - h + 2, 2.2, h / 3.4, ff);
    }
  },
  artischocke(g, { phase, f, fuss }) {
    const h = [0, 0, 6, 9, 9][phase];
    for (const [dx, k] of [[-5, 4], [5, 4], [-3, 1], [3, 1]]) {
      if (phase === 2 && Math.abs(dx) > 3) continue;
      L(g, 8, fuss, 8 + dx, fuss - h + k, '#8aa890', 2);
      for (let t = 0.3; t < 1; t += 0.3) P(g, Math.round(8 + dx * t + Math.sign(dx)), Math.round(fuss + (k - h) * t) - 1, '#a8c0a8');
    }
    if (phase >= 3) {
      L(g, 8, fuss, 8, fuss - h - 3, '#7a9a6a', 1);
      const r = phase === 4 ? 2.8 : 1.8;
      POLY(g, [[8, fuss - h - 3 - r * 1.6], [8 + r, fuss - h - 3], [8, fuss - h - 1], [8 - r, fuss - h - 3]], f);
      P(g, 7, fuss - h - 4, hell(f, 0.3)); P(g, 9, fuss - h - 3, dunkel(f, 0.2));
      if (phase === 4) { P(g, 8, fuss - h - 7, '#9a6aa8'); P(g, 7, fuss - h - 6, '#9a6aa8'); P(g, 9, fuss - h - 6, '#b88ac8'); }
    }
  },
});

// ─── Rankhilfe ──────────────────────────────────────────────────────────────

/** Holzgitter (ab dem ersten Tag sichtbar). */
function gitter(g, fuss) {
  R(g, 3, fuss - 19, 2, 20, HOLZ_R); R(g, 11, fuss - 19, 2, 20, HOLZ_R);
  R(g, 4, fuss - 19, 1, 20, HOLZ_RD); R(g, 12, fuss - 19, 1, 20, HOLZ_RD);
  for (const y of [fuss - 17, fuss - 11, fuss - 5]) { R(g, 2, y, 12, 1, HOLZ_R); P(g, 2, y + 1, HOLZ_RD); }
  L(g, 5, fuss - 17, 11, fuss - 11, '#c8a070', 1); L(g, 11, fuss - 17, 5, fuss - 11, '#c8a070', 1);
  L(g, 5, fuss - 11, 11, fuss - 5, '#c8a070', 1); L(g, 11, fuss - 11, 5, fuss - 5, '#c8a070', 1);
}
/** Ranke bis zur Höhe h mit Blättern; fruchte(g, x, y) malt die Früchte. */
function ranke(laub, frucht) {
  return {
    alle: true,
    malen(g, { phase, f, fuss }) {
      gitter(g, fuss);
      if (phase === 0) { P(g, 7, fuss - 1, '#5a3a20'); P(g, 9, fuss, '#5a3a20'); P(g, 8, fuss - 2, BLATT_H); return; }
      const h = [0, 4, 9, 14, 18][phase];
      for (let y = 0; y <= h; y++) {
        const x = 8 + Math.round(Math.sin(y * 0.7) * 2.2);
        P(g, x, fuss - y, dunkel(laub, 0.2));
      }
      for (let y = 2; y <= h; y += 3) {
        const x = 8 + Math.round(Math.sin(y * 0.7) * 2.2);
        blatt(g, x - 2, fuss - y, 2, 1.4, laub, false);
        blatt(g, x + 2, fuss - y - 1, 2, 1.4, dunkel(laub, 0.12), false);
      }
      if (phase === 3) for (const [x, y] of [[6, fuss - 9], [10, fuss - 13]]) P(g, x, y, '#f6f2e8');
      if (phase === 4) frucht(g, f, fuss);
    },
  };
}

pflanzenKunst({
  bohne: ranke('#4f9a3a', (g, f, fuss) => {
    for (const [x, y] of [[5, fuss - 15], [10, fuss - 12], [6, fuss - 8], [11, fuss - 6], [8, fuss - 17]]) { L(g, x, y, x, y + 4, f, 2); P(g, x, y + 1, hell(f, 0.4)); }
  }),
  erbse: ranke('#6aaa48', (g, f, fuss) => {
    for (const [x, y] of [[5, fuss - 14], [10, fuss - 10], [6, fuss - 6]]) { L(g, x, y, x + 1, y + 3, f, 2); P(g, x, y + 1, hell(f, 0.4)); }
    for (const [x, y] of [[10, fuss - 16], [6, fuss - 11], [11, fuss - 4]]) bluete5(g, x, y, '#f6f2f8', '#e8a8c8');
  }),
  hopfen: ranke('#3f8a3a', (g, f, fuss) => {
    for (const [x, y] of [[5, fuss - 16], [11, fuss - 14], [6, fuss - 10], [10, fuss - 7], [7, fuss - 4]]) {
      E(g, x, y, 1.5, 2.2, f); P(g, x - 1, y - 1, hell(f, 0.4)); P(g, x, y + 1, dunkel(f, 0.25));
    }
  }),
  trauben: ranke('#4a8a3a', (g, f, fuss) => {
    for (const [x, y] of [[5, fuss - 14], [10, fuss - 8]]) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [-1, 2], [1, 2], [0, 3], [0, 4]]) { P(g, x + dx, y + dy, f); }
      P(g, x - 1, y, hell(f, 0.35)); P(g, x, y + 3, dunkel(f, 0.25)); P(g, x, y - 1, '#6a5a2a');
    }
  }),
});

// ─── Tomate am Stab ─────────────────────────────────────────────────────────

pflanzenKunst('tomate', (g, { phase, f, fuss }) => {
  const h = [0, 0, 9, 14, 15][phase];
  R(g, 9, fuss - h - 2, 1, h + 2, HOLZ_R); P(g, 9, fuss - h - 2, HOLZ_RD);
  L(g, 8, fuss, 8, fuss - h, '#5a8a3a', 1);
  for (let y = 3; y <= h; y += 3) { blatt(g, 6, fuss - y, 2.2, 1.5, '#4a8a3a', false); blatt(g, 11, fuss - y + 1, 2.2, 1.5, '#5a9a42', false); P(g, 9, fuss - y, '#e8d8a0'); }
  if (phase === 3) for (const [x, y] of [[5, fuss - 8], [11, fuss - 11]]) bluete5(g, x, y, '#f2d24a', '#e8b030');
  if (phase === 4) for (const [x, y] of [[5.5, fuss - 6], [11, fuss - 9], [6, fuss - 12], [11, fuss - 4]]) kugel(g, x, y, 1.9, 1.8, f);
});

// ─── Büsche ─────────────────────────────────────────────────────────────────

/** Runder Busch aus Blattbällen. */
function buschform(g, fuss, r, f) {
  E(g, 8, fuss - r, r + 0.8, r, dunkel(f, 0.18));
  E(g, 7.5, fuss - r - 0.8, r, r - 0.6, f);
  for (const [dx, dy] of [[-0.5, -0.6], [0.4, -0.2], [-0.1, 0.3]]) E(g, 8 + dx * r, fuss - r + dy * r, 1.4, 1.1, hell(f, 0.2));
  for (let i = 0; i < 4; i++) P(g, Math.round(8 + Math.cos(i * 1.7) * r * 0.7), Math.round(fuss - r + Math.sin(i * 1.7) * r * 0.6), dunkel(f, 0.3));
}
function beerenbusch(beere, { laub = '#3f7a3a', bluete = '#f6f2e8', klein = false } = {}) {
  return (g, { phase, f, fuss }) => {
    const r = [0, 0, 3.5, 5, 5.5][phase] * (klein ? 0.8 : 1);
    buschform(g, fuss, r, laub);
    const pos = [[5, fuss - r - 2], [10, fuss - r - 1], [8, fuss - r + 1], [11, fuss - 3], [4, fuss - 3], [7, fuss - 2 * r + 1]];
    if (phase === 3) for (const [x, y] of pos.slice(0, 3)) P(g, x, y, bluete);
    if (phase === 4) for (const [x, y] of pos) beere(g, x, y, f);
  };
}

pflanzenKunst({
  blaubeere: beerenbusch((g, x, y, f) => { P(g, x, y, f); P(g, x + 1, y, dunkel(f, 0.2)); P(g, x, y + 1, dunkel(f, 0.25)); P(g, x + 1, y + 1, f); P(g, x, y, hell(f, 0.3)); }),
  preiselbeere: beerenbusch((g, x, y, f) => { P(g, x, y, f); P(g, x + 1, y + 1, dunkel(f, 0.15)); P(g, x, y, hell(f, 0.2)); }, { laub: '#4a7a3a', klein: true, bluete: '#f4c6d8' }),
  peperoni: beerenbusch((g, x, y, f) => { L(g, x, y, x, y + 3, f, 1); P(g, x + 1, y + 1, dunkel(f, 0.2)); P(g, x, y - 1, '#3a7a2a'); }, { laub: '#4a8a3a' }),
  aubergine(g, { phase, f, fuss }) {
    const r = [0, 0, 3.5, 5, 5.5][phase];
    buschform(g, fuss, r, '#4a7a4a');
    blatt(g, 4, fuss - r, 2.4, 1.6, '#5a8a52'); blatt(g, 12, fuss - r - 1, 2.4, 1.6, '#4a7a4a');
    if (phase === 3) { bluete5(g, 6, fuss - r - 2, '#a87ad8', '#f2d24a'); bluete5(g, 11, fuss - r, '#a87ad8', '#f2d24a'); }
    if (phase === 4) for (const [x, y] of [[5, fuss - 4], [10.5, fuss - 5], [8, fuss - 3]]) { kugel(g, x, y, 1.6, 2.6, f); P(g, Math.round(x), Math.round(y) - 3, '#4a8a3a'); }
  },
  erdbeere(g, { phase, f, fuss }) {
    const s = [0, 0, 0.7, 1, 1][phase];
    for (const [dx, dy] of [[-4, -2], [4, -2], [0, -4], [-2, -1], [2, -1]]) {
      L(g, 8, fuss, 8 + dx * s, fuss + dy * s - 1, '#5a8a3a', 1);
      for (const [lx, ly] of [[-1, -1], [1, -1], [0, -2]]) E(g, 8 + dx * s + lx, fuss + dy * s - 1 + ly, 1.2, 1, (dx + lx) % 2 ? '#4f9a3a' : '#3f8a34');
    }
    if (phase === 3) for (const [x, y] of [[4, fuss - 3], [11, fuss - 4]]) bluete5(g, x, y, '#ffffff', '#f2d24a');
    if (phase === 4) for (const [x, y] of [[4, fuss - 1], [11, fuss - 1], [7, fuss]]) {
      POLY(g, [[x - 1.5, y - 2], [x + 1.5, y - 2], [x, y + 1]], f); P(g, x - 1, y - 2, hell(f, 0.3)); P(g, x, y - 1, '#f6e07a'); P(g, x, y - 3, '#3f8f34');
    }
  },
  kaffeebohne(g, { phase, f, fuss }) {
    const h = [0, 0, 8, 12, 13][phase];
    L(g, 8, fuss, 8, fuss - h, '#7a5a3a', 1);
    for (let y = 2; y <= h; y += 3) {
      const w = Math.max(2, 5 - (y / h) * 3);
      L(g, 8, fuss - y, 8 - w, fuss - y + 1, '#7a5a3a', 1); L(g, 8, fuss - y - 1, 8 + w, fuss - y, '#7a5a3a', 1);
      blatt(g, 8 - w - 0.5, fuss - y + 0.5, 1.8, 1.2, '#4a9a48', false); blatt(g, 8 + w + 0.5, fuss - y - 0.5, 1.8, 1.2, '#5aaa52', false);
      if (phase === 3 && y % 2) { P(g, 8 - w + 1, fuss - y + 2, '#ffffff'); P(g, 8 + w - 1, fuss - y + 1, '#ffffff'); }
      if (phase === 4) { P(g, 8 - w + 1, fuss - y + 2, f); P(g, 8 - w + 2, fuss - y + 2, dunkel(f, 0.2)); P(g, 8 + w - 1, fuss - y + 1, f); }
    }
    blatt(g, 8, fuss - h - 1, 1.6, 1.6, '#4f9a4a', false);
  },
  rhabarber(g, { phase, f, fuss }) {
    const h = [0, 0, 6, 9, 11][phase];
    const stiel = phase === 4 ? f : mische(f, '#7aae5a', 0.55);
    const blaetter = phase === 2 ? [[-3, '#4e8a3e', 2.6], [3, '#5c9a45', 2.6]] : [[-4, '#4e8a3e', 3.4], [4, '#5c9a45', 3.4], [0, '#6aaa52', 3.6]];
    for (const [dx, ff, r] of blaetter) {
      const top = fuss - h + (dx ? 2 : 0);
      L(g, 8 + Math.sign(dx), fuss, 8 + dx, top + 2, stiel, 1);
      P(g, 8 + dx + (dx > 0 ? -1 : 1), top + 4, hell(stiel, 0.3));
      E(g, 8 + dx, top, r, r * 0.7, ff);
      for (const [px, py] of [[-r, 0], [r - 1, -1], [0, -r * 0.7]]) P(g, Math.round(8 + dx + px), Math.round(top + py), ff);
      L(g, Math.round(8 + dx - r + 1), top, Math.round(8 + dx + r - 1), top, dunkel(ff, 0.25), 1);
      L(g, 8 + dx, top, 8 + dx, Math.round(top - r * 0.6), dunkel(ff, 0.25), 1);
      E(g, 8 + dx - 1, top - 1, 1.2, 0.8, hell(ff, 0.3));
    }
  },
  sternfrucht(g, { phase, f, fuss }) {
    const r = [0, 0, 3.5, 5, 5.5][phase];
    buschform(g, fuss, r, '#4a8a3a');
    for (const [x, y] of [[3.5, fuss - 2], [12.5, fuss - 3], [8, fuss - 2 * r + 1]]) blatt(g, x, y, 2, 1.4, '#5a9a42');
    if (phase === 3) for (const [x, y] of [[5, fuss - 6], [10, fuss - 8]]) bluete5(g, x, y, '#f4c0e0', '#f2d24a');
    if (phase === 4) for (const [x, y] of [[5, fuss - 5], [11, fuss - 7]]) {
      POLY(g, [[x, y - 3], [x + 1, y - 1], [x + 3, y - 1], [x + 1.5, y + 0.5], [x + 2, y + 3], [x, y + 1.5], [x - 2, y + 3], [x - 1.5, y + 0.5], [x - 3, y - 1], [x - 1, y - 1]], f);
      P(g, x - 1, y - 1, hell(f, 0.5));
    }
  },
});

// ─── Am Boden rankend ───────────────────────────────────────────────────────

function bodenranke(g, fuss, phase) {
  const w = [0, 0, 4, 6, 6][phase];
  L(g, 8 - w, fuss - 1, 8 + w, fuss - 2, BLATT_D, 1);
  for (let x = 8 - w; x <= 8 + w; x += 3) blatt(g, x, fuss - 3 - ((x / 3) % 2), 2.2, 1.9, (x / 3) % 2 ? BLATT : '#5aa242');
}

pflanzenKunst({
  melone(g, { phase, f, fuss }) {
    bodenranke(g, fuss, phase);
    if (phase === 3) bluete5(g, 6, fuss - 6, '#f2d24a', '#e8a830');
    if (phase === 4) {
      kugel(g, 8, fuss - 5, 6.6, 5.2, f);
      for (const x of [4, 7, 10, 13]) for (let y = fuss - 9; y <= fuss - 1; y++) if (((x - 8) / 6.2) ** 2 + ((y - fuss + 5) / 4.8) ** 2 < 1) P(g, x + ((y >> 1) & 1), y, dunkel(f, 0.35));
      E(g, 5, fuss - 8, 1.6, 1, hell(f, 0.45));
    }
  },
  kuerbis(g, { phase, f, fuss }) {
    bodenranke(g, fuss, phase);
    if (phase === 3) { bluete5(g, 10, fuss - 6, '#f2c43a', '#e8a830'); kugel(g, 6, fuss - 2, 1.6, 1.4, '#9ac04a'); }
    if (phase === 4) {
      kugel(g, 5.5, fuss - 3.5, 3.3, 3.5, dunkel(f, 0.08)); kugel(g, 10.5, fuss - 3.5, 3.3, 3.5, dunkel(f, 0.08)); kugel(g, 8, fuss - 3.8, 3.4, 3.9, f);
      R(g, 7, fuss - 9, 2, 2, '#6a5a2a'); P(g, 9, fuss - 9, BLATT);
    }
  },
  zucchini(g, { phase, f, fuss }) {
    const r = [0, 0, 3, 5, 5][phase];
    for (const [dx, dy, ff] of [[-3, -1, '#4a8a3a'], [3, -1, '#5a9a42'], [0, -3, '#6aaa4a']]) {
      L(g, 8, fuss, 8 + dx, fuss - r + dy + 2, '#7aae5a', 1);
      E(g, 8 + dx * 1.2, fuss - r + dy, r * 0.65, r * 0.5, ff);
      L(g, Math.round(8 + dx * 1.2 - r * 0.4), fuss - r + dy, Math.round(8 + dx * 1.2 + r * 0.4), fuss - r + dy, dunkel(ff, 0.25), 1);
    }
    if (phase >= 3) bluete5(g, 8, fuss - r - 3, '#f2c43a', '#e89a20');
    if (phase === 4) { L(g, 3, fuss - 1, 7, fuss - 2, f, 2); L(g, 9, fuss - 1, 13, fuss, dunkel(f, 0.1), 2); P(g, 4, fuss - 2, hell(f, 0.4)); P(g, 10, fuss - 2, hell(f, 0.4)); }
  },
});

// ─── Hoch ───────────────────────────────────────────────────────────────────

pflanzenKunst({
  mais(g, { phase, f, fuss }) {
    const h = [0, 0, 11, 18, 20][phase];
    R(g, 7, fuss - h, 2, h, '#6a9a3a'); R(g, 8, fuss - h, 1, h, '#5a8a2a');
    for (let y = 3; y < h; y += 4) { halm(g, 8, fuss - y, 2, fuss - y - 4, '#5aa242'); halm(g, 8, fuss - y - 2, 14, fuss - y - 5, '#4a8a34'); }
    if (phase >= 3) for (const [dx, dy] of [[0, -1], [-1, -2], [1, -2], [0, -3]]) P(g, 8 + dx, fuss - h + dy, phase === 4 ? '#c8a050' : '#e8d88a');
    if (phase === 4) {
      for (const [x, y] of [[10.5, fuss - 10], [5.5, fuss - 14]]) { E(g, x, y, 1.6, 3.4, f); P(g, x - 0.5, y - 2, hell(f, 0.4)); POLY(g, [[x - 2, y + 4], [x, y - 1], [x + 2, y + 4]], '#7ab04a'); }
    }
  },
  sonnenblume(g, { phase, f, fuss }) {
    const h = [0, 0, 9, 15, 16][phase];
    L(g, 8, fuss, 8, fuss - h + 2, '#5a8a3a', 2);
    for (let y = 4; y < h - 2; y += 4) { blatt(g, 5, fuss - y, 2.6, 1.8, '#4f9a3a'); blatt(g, 11, fuss - y - 2, 2.6, 1.8, '#3f8a34'); }
    if (phase === 3) { kugel(g, 8, fuss - h, 2.2, 2, '#6aaa48'); for (const x of [6, 10]) P(g, x, fuss - h, '#f2d24a'); }
    if (phase === 4) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        E(g, 8 + Math.cos(a) * 4.2, fuss - h - 1 + Math.sin(a) * 4, 1.6, 1.6, i % 2 ? f : hell(f, 0.15));
      }
      kugel(g, 8, fuss - h - 1, 3, 3, '#6a4424');
      for (const [x, y] of [[7, fuss - h - 2], [9, fuss - h], [8, fuss - h - 1]]) P(g, x, y, '#4a2c14');
    }
  },
  amaranth(g, { phase, f, fuss }) {
    const h = [0, 0, 9, 14, 15][phase];
    L(g, 8, fuss, 8, fuss - h + 3, '#7a6a3a', 1);
    for (let y = 2; y < h - 3; y += 3) { blatt(g, 5.5, fuss - y, 2.4, 1.5, mische('#6a9a3a', f, 0.2)); blatt(g, 10.5, fuss - y - 1, 2.4, 1.5, '#5a8a32'); }
    const plume = phase === 4 ? f : phase === 3 ? mische(f, '#6a9a3a', 0.6) : '#6a9a3a';
    if (phase >= 3) {
      L(g, 8, fuss - h + 3, 8, fuss - h - 2, plume, 2);
      L(g, 8, fuss - h + 1, 4, fuss - h + 5, plume, 2); L(g, 9, fuss - h + 1, 12, fuss - h + 6, plume, 2);
      P(g, 8, fuss - h - 2, hell(plume, 0.3)); P(g, 4, fuss - h + 6, dunkel(plume, 0.2)); P(g, 12, fuss - h + 7, dunkel(plume, 0.2));
    }
  },
});

// ─── Getreide ───────────────────────────────────────────────────────────────

pflanzenKunst({
  weizen(g, { phase, fuss }) {
    const h = [0, 0, 8, 12, 13][phase];
    const farbe = phase === 4 ? '#c8a040' : phase === 3 ? '#8ab84a' : BLATT;
    for (const x of [3, 5, 7, 9, 11, 13]) halm(g, 8 + Math.sign(x - 8), fuss, x, fuss - h + Math.abs(x - 8) / 2, x % 4 === 1 ? dunkel(farbe, 0.15) : farbe);
    if (phase >= 3) for (const x of [3, 7, 11, 13, 5, 9]) {
      const y = fuss - h + Math.abs(x - 8) / 2 - 2;
      E(g, x, y, 1, 2.2, phase === 4 ? '#e8c860' : '#a8c860'); P(g, x, y - 3, phase === 4 ? '#f0d880' : '#b8d070');
    }
  },
  reis(g, { phase, fuss }) {
    const h = [0, 0, 7, 11, 11][phase];
    for (const [x0, x1] of [[6, 3], [7, 5], [8, 8], [9, 11], [10, 13]]) halm(g, x0, fuss, x1, fuss - h + Math.abs(x1 - 8) / 2, x0 % 2 ? '#6aaa48' : '#5a9a3e');
    if (phase === 4) for (const [x, y, dx] of [[5, fuss - h, -2], [11, fuss - h + 1, 2], [8, fuss - h - 1, 1]]) {
      L(g, x, y, x + dx, y + 4, '#c8b880', 1);
      for (let t = 1; t <= 4; t++) P(g, x + Math.round((dx * t) / 4) + (t % 2 ? -1 : 1), y + t, t % 2 ? '#efe0a0' : '#d8c070');
    }
  },
});

// ─── Blumen ─────────────────────────────────────────────────────────────────

function stielBlaetter(g, fuss, h, f = BLATT_D) {
  L(g, 8, fuss, 8, fuss - h, f, 1);
  blatt(g, 6, fuss - 3, 1.6, 3, BLATT, false); blatt(g, 10, fuss - 4, 1.6, 3, BLATT_H, false);
}

pflanzenKunst({
  tulpe(g, { phase, f, fuss }) {
    const h = [0, 0, 6, 9, 10][phase];
    L(g, 8, fuss, 8, fuss - h, BLATT_D, 1);
    blatt(g, 5.5, fuss - 4, 2, 4, '#5aa242', false); blatt(g, 10.5, fuss - 3, 2, 3.6, '#4a9a3a', false);
    if (phase === 3) { E(g, 8, fuss - h - 1, 1.6, 2.4, mische(f, '#7ab04a', 0.5)); }
    if (phase === 4) {
      E(g, 8, fuss - h - 2, 3, 3, f); P(g, 5, fuss - h - 5, f); P(g, 8, fuss - h - 6, f); P(g, 11, fuss - h - 5, f);
      R(g, 6, fuss - h - 4, 1, 3, hell(f, 0.35)); P(g, 10, fuss - h - 1, dunkel(f, 0.25));
    }
  },
  kornblume(g, { phase, f, fuss }) {
    const h = [0, 0, 7, 10, 11][phase];
    for (const [dx, k] of [[-3, 2], [0, 0], [3, 1]]) {
      L(g, 8, fuss, 8 + dx, fuss - h + k, '#7a9a6a', 1);
      if (phase === 4) { for (const [px, py] of [[-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]]) P(g, 8 + dx + px, fuss - h + k - 1 + py, f); P(g, 8 + dx, fuss - h + k - 1, dunkel(f, 0.4)); P(g, 8 + dx - 1, fuss - h + k - 2, hell(f, 0.4)); }
      else if (phase === 3) P(g, 8 + dx, fuss - h + k - 1, '#7aa86a');
    }
    for (const [x, y] of [[6, fuss - 3], [10, fuss - 4]]) halm(g, 8, fuss - 1, x, y, '#8aa87a');
  },
  mohn(g, { phase, f, fuss }) {
    const h = [0, 0, 7, 10, 11][phase];
    blatt(g, 6, fuss - 2, 2.4, 1.6, '#6a9a5a', false); blatt(g, 10, fuss - 2, 2.4, 1.6, '#5a8a4a', false);
    if (phase === 3) { L(g, 8, fuss, 9, fuss - h + 2, '#7aa86a', 1); L(g, 9, fuss - h + 2, 7, fuss - h, '#7aa86a', 1); E(g, 7, fuss - h, 1.4, 1.8, '#8ab86a'); }
    else L(g, 8, fuss, 8, fuss - h, '#7aa86a', 1);
    if (phase === 4) {
      E(g, 5.5, fuss - h - 1, 2.6, 2.6, dunkel(f, 0.12)); E(g, 10.5, fuss - h - 1, 2.6, 2.6, dunkel(f, 0.12)); E(g, 8, fuss - h - 2.5, 3, 2.4, f);
      E(g, 6.5, fuss - h - 3, 1, 0.8, hell(f, 0.4)); kugel(g, 8, fuss - h - 1, 1.3, 1.3, '#2a2026');
    }
  },
  sommerstern(g, { phase, f, fuss }) {
    const h = [0, 0, 6, 9, 9][phase];
    for (const [dx, k] of [[-4, 2], [-1, 0], [3, 1]]) {
      L(g, 8, fuss, 8 + dx, fuss - h + k, BLATT_D, 1);
      blatt(g, 8 + dx / 2 - 1, fuss - (h - k) / 2, 1.6, 1.1, BLATT, false);
      const x = 8 + dx;
      const y = fuss - h + k - 1;
      if (phase === 4) { for (const [px, py] of [[0, -2], [2, -1], [1, 1], [-1, 1], [-2, -1]]) L(g, x, y, x + px, y + py, f, 1); P(g, x, y, '#f6d84a'); }
      else if (phase === 3) P(g, x, y, mische(f, BLATT, 0.4));
    }
  },
  feenrose(g, { phase, f, fuss }) {
    const r = [0, 0, 3.5, 5, 5.5][phase];
    buschform(g, fuss, r, '#3f7a42');
    const pos = [[5, fuss - r - 1], [10.5, fuss - r - 2], [8, fuss - 2 * r + 1], [11, fuss - 3]];
    if (phase === 3) for (const [x, y] of pos.slice(0, 3)) { P(g, x, y, mische(f, '#5a9a4a', 0.4)); P(g, x, y - 1, f); }
    if (phase === 4) for (const [x, y] of pos) { kugel(g, x, y, 1.9, 1.8, f); P(g, Math.round(x), Math.round(y), dunkel(f, 0.25)); P(g, Math.round(x) - 1, Math.round(y) - 1, '#fbe0f4'); }
    if (phase === 4) { P(g, 3, fuss - 8, '#fff6c0'); P(g, 13, fuss - 10, '#fff6c0'); }
  },
});

// ─── Wildsamen: ein Büschel, reif mit dem Fund obenauf ──────────────────────

pflanzenKunst('pflanzen_wild', (g, { p, phase, fuss }) => {
  const h = [0, 0, 5, 7, 6][phase];
  for (const [dx, k] of [[-5, 2], [-3, 0], [-1, 1], [1, 0], [3, 1], [5, 2]]) halm(g, 8, fuss, 8 + dx, fuss - h + k, k ? '#5a9a3e' : '#7ab04a');
  if (phase === 3) for (const [x, y] of [[5, fuss - 6], [10, fuss - 7]]) P(g, x, y, '#f6f2e8');
  if (phase === 4) {
    const it = ITEMS[p.ernte];
    g.save();
    g.translate(0, fuss - 17);
    kunstMalen(g, it?.bild?.art ?? p.ernte, it?.bild ?? {});
    g.restore();
  }
});

// ─── Wuchsformen (für Pflanzen ohne eigenes Bild, auch aus anderen Bereichen) ─

for (const [wuchs, vorbild] of [
  ['wurzel', 'radieschen'], ['knolle', 'kartoffel'], ['kohl', 'blumenkohl'], ['rank', 'bohne'], ['stab', 'tomate'],
  ['busch', 'blaubeere'], ['gross', 'melone'], ['hoch', 'mais'], ['aehre', 'weizen'], ['blume', 'tulpe'],
]) pflanzenKunst(wuchs, PFLANZEN_BILD[vorbild]);
