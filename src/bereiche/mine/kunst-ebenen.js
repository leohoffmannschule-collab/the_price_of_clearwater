// Bereich „mine" – Pixelkunst der Ebenen: Farben der Schichten (Erde, Eis, Lava, Pilz), Boden und Wände,
// Lava, Eis, Moos, Kies und Bohlen, Gestein je Art und Schicht, Leiter, Loch, Schatztruhe, Kisten,
// Artefaktstellen (Würmer), dazu die Deko: Leitern, Förderkorb, Schwert, Wandlampe, Tropfsteine,
// Eis- und Glutkristalle, Leuchtpilze, Lore und Tafel.

import {
  objektKunst, dekoKunst, bodenKunst, MINE_FARBEN, mineFarben, objektBild,
  P, R, E, L, POLY, kugel, mische, hell, dunkel,
} from '../../sprites.js';
import { hash } from '../../zufall.js';
import { S } from '../../spiel.js';

// Schichten: 0 Erde (Ebene 1–39 und Eingang), 1 Eis, 2 Lava, 3 Pilzhöhle
MINE_FARBEN.push(
  { boden: '#8a6c50', d: '#735840', h: '#a3845f', wand: '#4a3628', wandH: '#6a5040', stein: '#9a8a74', akzent: '#c8a070' },
  { boden: '#6f8296', d: '#5b6c80', h: '#8b9db0', wand: '#2f4054', wandH: '#4a5e76', stein: '#a8b8c8', akzent: '#d8f0ff' },
  { boden: '#5a3a34', d: '#48302a', h: '#74504a', wand: '#2a1816', wandH: '#4a2a24', stein: '#7a6460', akzent: '#f8784a' },
  { boden: '#4e4058', d: '#3e3248', h: '#685878', wand: '#241a2e', wandH: '#3e3050', stein: '#8a7a8e', akzent: '#c88af0' },
);

const band = (k) => k.def?.band ?? 0;

/**
 * Weicher Rand eines Bodenflecks (Eis, Moos, Kies): wo daneben gewöhnlicher Boden liegt, wird der Rand
 * mit Pixeln der Bodenfarbe aufgelöst, damit die Flecken nicht als Kästchen erscheinen.
 */
function weicherRand(g, x0, y0, k, z) {
  const { tx, ty, nachbarn, mf } = k;
  const anders = (n) => n !== z && n !== '#' && n !== 'z' && n !== '~';
  const pixel = (x, y, tiefe) => {
    if (hash(tx * 16 + x, ty * 16 + y, 3) < 1 - tiefe / 4) P(g, x0 + x, y0 + y, (x + y) % 3 ? mf.boden : mf.d);
  };
  for (let i = 0; i < 16; i++) {
    for (let t = 0; t < 4; t++) {
      if (anders(nachbarn.n)) pixel(i, t, t);
      if (anders(nachbarn.s)) pixel(i, 15 - t, t);
      if (anders(nachbarn.w)) pixel(t, i, t);
      if (anders(nachbarn.o)) pixel(15 - t, i, t);
    }
  }
}

// ─── Boden ──────────────────────────────────────────────────────────────────

bodenKunst('m:mine', (g, x0, y0, k) => {
  const { tx, ty, mf } = k;
  R(g, x0, y0, 16, 16, mf.boden);
  for (let i = 0; i < 8; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), mf.d);
  for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 20) * 16), y0 + Math.floor(hash(tx, ty, i + 30) * 16), mf.h);
  // kleine Kiesel
  if (hash(tx, ty, 41) < 0.45) {
    const x = x0 + 2 + Math.floor(hash(tx, ty, 42) * 11);
    const y = y0 + 2 + Math.floor(hash(tx, ty, 43) * 11);
    R(g, x, y, 2, 1, mf.h); R(g, x, y + 1, 2, 1, mf.d);
  }
  if (hash(tx, ty, 77) < 0.15) L(g, x0 + 3, y0 + 10, x0 + 9, y0 + 7, mf.d, 1);
  // Schatten unter der Wand darüber
  if (k.nachbarn.n === '#') R(g, x0, y0, 16, 2, mische(mf.boden, '#000000', 0.25));
  const b = band(k);
  if (b === 1 && hash(tx, ty, 51) < 0.3) { P(g, x0 + Math.floor(hash(tx, ty, 52) * 14) + 1, y0 + Math.floor(hash(tx, ty, 53) * 14) + 1, '#e8f6ff'); }
  if (b === 2 && hash(tx, ty, 61) < 0.18) {
    const x = x0 + 2 + Math.floor(hash(tx, ty, 62) * 10);
    const y = y0 + 3 + Math.floor(hash(tx, ty, 63) * 10);
    L(g, x, y, x + 3, y + 1, '#c8482a', 1); P(g, x + 1, y, '#f8904a');
  }
  if (b === 3 && hash(tx, ty, 71) < 0.3) { const x = x0 + 2 + Math.floor(hash(tx, ty, 72) * 12); R(g, x, y0 + 8, 2, 2, '#6a8a4a'); }
});

/** Wände: Fels mit Schichten; an der Kante zum Boden eine Felswand mit Licht von oben. */
bodenKunst('#:mine', (g, x0, y0, k) => {
  const { tx, ty, mf, nachbarn } = k;
  const flaeche = nachbarn.s !== '#';
  R(g, x0, y0, 16, 16, flaeche ? mf.wandH : mf.wand);
  for (let i = 0; i < 5; i++) P(g, x0 + Math.floor(hash(tx, ty, i) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), dunkel(mf.wand, 0.3));
  if (!flaeche) {
    // Deckfels: Brocken mit hellen Kanten
    for (let i = 0; i < 2; i++) {
      const x = x0 + Math.floor(hash(tx, ty, i + 40) * 12);
      const y = y0 + Math.floor(hash(tx, ty, i + 44) * 12);
      R(g, x, y, 4, 1, mische(mf.wand, mf.wandH, 0.5));
    }
    return;
  }
  for (let i = 0; i < 3; i++) R(g, x0 + Math.floor(hash(tx, ty, i + 20) * 12), y0 + 4 + i * 4, 4, 1, hell(mf.wandH, 0.15));
  R(g, x0, y0 + 13, 16, 2, dunkel(mf.wandH, 0.2));
  R(g, x0, y0 + 15, 16, 1, dunkel(mf.wand, 0.45));
  const b = band(k);
  if (b === 1) {
    // Eiszapfen
    for (let i = 0; i < 3; i++) {
      const x = x0 + 1 + Math.floor(hash(tx, ty, i + 80) * 13);
      const l = 2 + Math.floor(hash(tx, ty, i + 83) * 4);
      R(g, x, y0 + 13, 3, 1, '#d8f0ff');
      R(g, x, y0 + 14, 2, Math.max(1, l - 2), '#d8f0ff'); P(g, x, y0 + 14, '#ffffff');
      P(g, x, y0 + 14 + Math.max(1, l - 2), '#a8d0f0');
    }
  } else if (b === 2) {
    if (hash(tx, ty, 90) < 0.5) {
      const x = x0 + 2 + Math.floor(hash(tx, ty, 91) * 10);
      L(g, x, y0 + 3, x + 2, y0 + 8, '#e8502a', 1); L(g, x + 2, y0 + 8, x + 1, y0 + 12, '#f8904a', 1);
    }
  } else if (b === 3) {
    for (let i = 0; i < 4; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 95) * 16), y0 + 12 + Math.floor(hash(tx, ty, i + 99) * 3), '#7aa858');
  } else if (hash(tx, ty, 93) < 0.25) {
    // Wurzeln in der Erdschicht
    const x = x0 + 3 + Math.floor(hash(tx, ty, 94) * 10);
    L(g, x, y0 + 2, x - 1, y0 + 9, '#5a4028', 1); P(g, x - 2, y0 + 10, '#5a4028');
  }
}, { ersetzen: true });

/** Lava: glühend, Kruste am Rand, wo Fels daneben liegt. */
bodenKunst('z', (g, x0, y0, { tx, ty, nachbarn }) => {
  R(g, x0, y0, 16, 16, '#e8502a');
  for (let i = 0; i < 5; i++) {
    const x = x0 + Math.floor(hash(tx, ty, i) * 13);
    const y = y0 + Math.floor(hash(tx, ty, i + 7) * 14);
    R(g, x, y, 3, 2, '#f8904a'); P(g, x + 1, y, '#f8d070');
  }
  for (let i = 0; i < 3; i++) {
    const x = x0 + Math.floor(hash(tx, ty, i + 20) * 12);
    const y = y0 + Math.floor(hash(tx, ty, i + 24) * 12);
    R(g, x, y, 4, 3, '#a8301a'); R(g, x + 1, y + 1, 2, 1, '#6a2014');
  }
  const kruste = '#3a2018';
  if (nachbarn.n !== 'z') { R(g, x0, y0, 16, 2, kruste); R(g, x0, y0 + 2, 16, 1, '#a8301a'); }
  if (nachbarn.s !== 'z') R(g, x0, y0 + 15, 16, 1, '#f8d070');
  if (nachbarn.w !== 'z') R(g, x0, y0, 1, 16, kruste);
  if (nachbarn.o !== 'z') R(g, x0 + 15, y0, 1, 16, kruste);
  // runde Ecken, wo zwei Seiten an Fels grenzen
  const ecke = (cx, cy, sx, sy) => { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [2, 0], [0, 2], [1, 1]]) P(g, cx + dx * sx, cy + dy * sy, kruste); };
  if (nachbarn.n !== 'z' && nachbarn.w !== 'z') ecke(x0, y0, 1, 1);
  if (nachbarn.n !== 'z' && nachbarn.o !== 'z') ecke(x0 + 15, y0, -1, 1);
  if (nachbarn.s !== 'z' && nachbarn.w !== 'z') ecke(x0, y0 + 15, 1, -1);
  if (nachbarn.s !== 'z' && nachbarn.o !== 'z') ecke(x0 + 15, y0 + 15, -1, -1);
});

/** Eisboden: glatt, mit Glanzstreifen. */
bodenKunst('A', (g, x0, y0, k) => {
  const { tx, ty, nachbarn } = k;
  R(g, x0, y0, 16, 16, '#90aec6');
  if (hash(tx, ty, 4) < 0.5) R(g, x0 + 2, y0 + 3, 9, 4, '#9cbad0');
  if (hash(tx, ty, 1) < 0.35) L(g, x0 + 3, y0 + 11, x0 + 8, y0 + 6, '#c8e2f2', 1);
  if (hash(tx, ty, 2) < 0.2) { L(g, x0 + 9, y0 + 13, x0 + 12, y0 + 10, '#d8eefa', 1); P(g, x0 + 12, y0 + 10, '#ffffff'); }
  for (let i = 0; i < 3; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 5) * 16), y0 + Math.floor(hash(tx, ty, i + 9) * 16), '#7894aa');
  weicherRand(g, x0, y0, k, 'A');
  if (nachbarn.n === '#') R(g, x0, y0, 16, 2, '#5c7088');
});

/** Moos in der Pilzhöhle. */
bodenKunst('B', (g, x0, y0, k) => {
  const { tx, ty, nachbarn } = k;
  R(g, x0, y0, 16, 16, '#4a5a48');
  for (let i = 0; i < 10; i++) {
    const x = x0 + Math.floor(hash(tx, ty, i) * 15);
    const y = y0 + Math.floor(hash(tx, ty, i + 11) * 15);
    R(g, x, y, 2, 1, i % 3 ? '#566a4c' : '#68825a');
  }
  for (let i = 0; i < 2; i++) P(g, x0 + Math.floor(hash(tx, ty, i + 30) * 16), y0 + Math.floor(hash(tx, ty, i + 33) * 16), '#c88af0');
  weicherRand(g, x0, y0, k, 'B');
  if (nachbarn.n === '#') R(g, x0, y0, 16, 2, '#2e3a2c');
});

/** Kies in der Erdschicht. */
bodenKunst('C', (g, x0, y0, k) => {
  const { tx, ty, mf } = k;
  R(g, x0, y0, 16, 16, mische(mf.boden, '#a09080', 0.12));
  for (let i = 0; i < 9; i++) {
    const x = x0 + Math.floor(hash(tx, ty, i) * 15);
    const y = y0 + Math.floor(hash(tx, ty, i + 13) * 15);
    R(g, x, y, 2, 1, i % 2 ? mf.h : mische(mf.h, '#ffffff', 0.15)); P(g, x, y + 1, mf.d);
  }
  weicherRand(g, x0, y0, k, 'C');
  if (k.nachbarn.n === '#') R(g, x0, y0, 16, 2, mische(mf.boden, '#000000', 0.25));
});

/** Holzbohlen unter Leiter und Förderkorb. */
bodenKunst('D', (g, x0, y0, { tx, ty, nachbarn }) => {
  R(g, x0, y0, 16, 16, '#8a6038');
  for (let i = 0; i < 4; i++) {
    R(g, x0, y0 + i * 4, 16, 1, '#a87a4a');
    R(g, x0, y0 + i * 4 + 3, 16, 1, '#5a3a22');
    const fuge = x0 + 3 + Math.floor(hash(tx, ty + i, 3) * 10);
    R(g, fuge, y0 + i * 4, 1, 3, '#5a3a22');
  }
  P(g, x0 + 2, y0 + 1, '#3a2a1a'); P(g, x0 + 13, y0 + 9, '#3a2a1a');
  if (nachbarn.n === '#') R(g, x0, y0, 16, 2, '#4a3020');
});

// ─── Gestein ────────────────────────────────────────────────────────────────

const FLECKEN = { kupfer: '#d98a4e', eisen: '#e8eef4', gold: '#f2c94c', iridium: '#c88af0', kohle: '#1e1e24' };

objektKunst({
  /** Minenstein; o.art: stein, kohle, kupfer, eisen, gold, iridium, edel, geode. Farbe nach Schicht. */
  mstein: {
    schluessel: (o, k) => `${o.art}:${k.band ?? 0}:${o.v || 0}`,
    malen(g, o, k) {
      const b = k.band ?? 0;
      const f = mische(mineFarben(b).stein, '#000000', (o.v || 0) * 0.05);
      const v = o.v || 0;
      if (o.art === 'geode') {
        kugel(g, 8, 10, 6, 5.2, mische(f, '#c8a878', 0.35));
        E(g, 8, 10, 3.4, 2.8, dunkel(f, 0.15)); E(g, 8, 10, 2.2, 1.6, ['#e8d8b0', '#d8f0ff', '#f8904a', '#e0c8f8'][b] || '#e8d8b0');
        P(g, 7, 9, '#ffffff');
        return;
      }
      // Grundform: zwei Varianten
      if (v % 2) { kugel(g, 8, 10.5, 6.8, 4.8, f); kugel(g, 5.5, 8.5, 3.2, 3, hell(f, 0.06)); }
      else { kugel(g, 8, 10, 6.6, 5.3, f); }
      if (b === 1) { E(g, 7, 6.2, 4.2, 1.4, '#e8f6ff'); P(g, 5, 6, '#ffffff'); }
      if (b === 2) { L(g, 4, 12, 8, 10, '#c8482a', 1); P(g, 9, 9, '#f8904a'); }
      if (b === 3) { P(g, 4, 9, '#7aa858'); P(g, 11, 7, '#7aa858'); }
      if (o.art === 'edel') {
        const farben = ['#c07af0', '#7ad8f0', '#f05a6a', '#c88af0'];
        const fe = farben[b] || farben[0];
        POLY(g, [[5, 9], [7, 4], [9, 9]], fe); POLY(g, [[5, 9], [7, 4], [7, 9]], hell(fe, 0.4));
        POLY(g, [[9, 11], [11, 6], [13, 11]], dunkel(fe, 0.05)); P(g, 10, 8, '#ffffff');
        return;
      }
      const fl = FLECKEN[o.art];
      if (fl) {
        const punkte = o.art === 'kohle' ? [[5, 8], [9, 7], [7, 11], [11, 10], [4, 11]] : [[5, 8], [9, 7], [7, 11], [11, 10]];
        for (const [x, y] of punkte) {
          R(g, x, y, 2, 2, fl);
          if (o.art !== 'kohle') { P(g, x, y, hell(fl, 0.6)); P(g, x + 1, y + 1, dunkel(fl, 0.3)); } else P(g, x, y, '#4a4a54');
        }
      } else { P(g, 7, 10, dunkel(f, 0.3)); P(g, 10, 12, dunkel(f, 0.3)); L(g, 5, 12, 7, 11, dunkel(f, 0.25), 1); }
    },
    danach(g, o, { bx, by }) {
      // Iridium funkelt
      if (o.art !== 'iridium') return;
      const t = (S.t * 2 + bx * 0.1) % 2;
      if (t < 0.3) { g.fillStyle = '#ffffff'; g.fillRect(bx - 2, by - 10, 1, 1); g.fillRect(bx - 3, by - 10, 3, 0.5); }
    },
  },
  /** Loch mit Leiter nach unten; liegt flach im Boden. */
  leiter: {
    umriss: false, tiefe: -15,
    malen(g) {
      E(g, 8, 10, 6.8, 4.8, '#3a2a20'); E(g, 8, 10, 6, 4.2, '#120c0a');
      E(g, 8, 11, 4.5, 2.6, '#060404');
      R(g, 5, 3, 1, 10, '#a8763e'); R(g, 10, 3, 1, 10, '#a8763e');
      R(g, 5, 3, 1, 1, '#c8925a'); R(g, 10, 3, 1, 1, '#c8925a');
      for (const y of [4, 7, 10]) { R(g, 5, y, 6, 1, '#c8925a'); R(g, 6, y + 1, 4, 1, '#6a4422'); }
    },
  },
  mine_loch: {
    umriss: false, tiefe: -15,
    malen(g) {
      E(g, 8, 10, 7, 5, '#5a4030');
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; R(g, Math.round(8 + Math.cos(a) * 6.5), Math.round(10 + Math.sin(a) * 4.5), 2, 1, '#7a5a40'); }
      E(g, 8, 10, 5.6, 3.8, '#120c0a');
      E(g, 8, 10.6, 4, 2.6, '#000000');
      P(g, 5, 9, '#2a1a12'); P(g, 11, 11, '#2a1a12');
    },
  },
  schatz: {
    b: 16, h: 16,
    malen(g) {
      R(g, 1, 6, 14, 9, '#8a4a22'); R(g, 1, 6, 14, 1, '#a8602e');
      POLY(g, [[1, 7], [2, 3], [5, 1], [11, 1], [14, 3], [15, 7]], '#a85a2a');
      POLY(g, [[2, 6], [3, 3], [5, 2], [8, 2], [8, 6]], '#c8783a');
      R(g, 1, 7, 14, 2, '#f2c94c'); R(g, 1, 7, 14, 1, '#fff0a0');
      R(g, 3, 1, 1, 14, '#f2c94c'); R(g, 12, 1, 1, 14, '#f2c94c');
      R(g, 6, 7, 4, 4, '#f2c94c'); R(g, 7, 9, 2, 1, '#3a2010');
      R(g, 1, 14, 14, 1, '#5a2a12');
    },
    danach(g, o, { bx, by }) {
      const t = (S.t * 1.3) % 3;
      if (t < 0.5) { g.fillStyle = 'rgba(255,248,200,0.9)'; const x = bx + 5; const y = by - 14; g.fillRect(x, y - 1, 1, 3); g.fillRect(x - 1, y, 3, 1); }
    },
  },
  mine_kiste: {
    schluessel: (o, k) => `${o.v || 0}:${k.band ?? 0}`,
    malen(g, o) {
      if (o.v) {
        // Fass
        E(g, 8, 9, 6, 6.4, '#8a5a32');
        for (const x of [4, 8, 12]) R(g, x, 3, 1, 12, '#6a4022');
        R(g, 2, 5, 12, 1, '#4a4a52'); R(g, 2, 12, 12, 1, '#4a4a52');
        E(g, 8, 3.5, 4.5, 1.4, '#a8763e'); E(g, 6, 7, 1, 3, '#a8763e');
      } else {
        R(g, 2, 4, 12, 11, '#a8763e'); R(g, 2, 4, 12, 1, '#c8925a');
        R(g, 2, 4, 1, 11, '#6a4422'); R(g, 13, 4, 1, 11, '#6a4422'); R(g, 2, 14, 12, 1, '#5a3a1e');
        L(g, 3, 5, 12, 13, '#6a4422', 1); L(g, 3, 13, 12, 5, '#6a4422', 1);
        R(g, 2, 9, 12, 1, '#7a5030');
      }
    },
  },
  /** Würmer im Boden: Erdhügel, die Würmer wackeln (danach, ohne Neuzeichnen). */
  mine_artefaktstelle: {
    umriss: false, tiefe: -14,
    malen(g) {
      E(g, 8, 11, 6, 3, '#6a4a2e'); E(g, 8, 10.5, 5, 2.2, '#8a6440');
      for (const [x, y] of [[5, 10], [10, 11], [8, 9]]) P(g, x, y, '#4a3020');
    },
    danach(g, o, { bx, by }) {
      const t = S.t * 4 + bx * 0.37;
      g.fillStyle = '#e08a8a';
      for (let i = 0; i < 2; i++) {
        const x = bx - 3 + i * 5;
        const h = 2 + Math.round((Math.sin(t + i * 2) + 1) * 1.5);
        g.fillRect(x, by - 6 - h, 1, h);
        g.fillRect(x + (Math.sin(t * 1.7 + i) > 0 ? 1 : -1), by - 6 - h, 1, 1);
      }
    },
  },
});

// ─── Deko ───────────────────────────────────────────────────────────────────

dekoKunst({
  leiter_ab: { bild: (d, k) => objektBild({ t: 'leiter' }, k), flach: true },
  leiter_auf: {
    b: 16, h: 32, umriss: false,
    malen(g) {
      E(g, 8, 30, 6, 2, 'rgba(0,0,0,0.35)');
      R(g, 3, 0, 2, 31, '#a8763e'); R(g, 11, 0, 2, 31, '#a8763e');
      R(g, 3, 0, 1, 31, '#c8925a'); R(g, 12, 0, 1, 31, '#6a4422');
      for (let y = 2; y < 30; y += 4) { R(g, 5, y, 6, 1, '#c8925a'); R(g, 5, y + 1, 6, 1, '#6a4422'); }
    },
  },
  aufzug: {
    b: 16, h: 32,
    malen(g) {
      R(g, 1, 0, 2, 32, '#5a5a62'); R(g, 13, 0, 2, 32, '#5a5a62'); R(g, 1, 0, 14, 2, '#5a5a62');
      R(g, 1, 0, 1, 32, '#7a7a82');
      E(g, 8, 4, 3, 3, '#8a8a92'); E(g, 8, 4, 1, 1, '#3a3a40'); L(g, 8, 6, 8, 16, '#3a3a40', 1);
      R(g, 2, 16, 12, 13, '#8a6a3a'); R(g, 2, 16, 12, 1, '#a8885a'); R(g, 2, 20, 12, 1, '#6a4a2a'); R(g, 2, 28, 12, 1, '#5a3a1a');
      for (const x of [4, 8, 11]) R(g, x, 17, 1, 11, '#6a4a2a');
      R(g, 4, 23, 3, 3, '#f2c94c'); P(g, 4, 23, '#fff0a0');
    },
  },
  schwertfund: {
    b: 16, h: 24,
    malen(g) {
      E(g, 8, 21, 5, 2, '#5a4030');
      L(g, 5, 20, 11, 4, '#b8a890', 2); L(g, 6, 19, 11, 5, '#e0d8c8', 1);
      L(g, 3, 18, 8, 21, '#9a6a4a', 2); L(g, 4, 21, 3, 23, '#4a3020', 2);
      P(g, 12, 3, '#ffffff'); P(g, 13, 2, '#ffffff'); P(g, 11, 2, '#fff3b0');
    },
  },
  wandlampe: {
    umriss: false,
    malen(g) {
      R(g, 7, 8, 2, 6, '#5a3a24'); R(g, 5, 7, 6, 2, '#4a4a52');
      E(g, 8, 5, 2.4, 3, '#f2a03a'); E(g, 8, 5.5, 1.4, 2, '#fff3b0');
    },
  },
  mine_tropfstein: {
    b: 16, h: 24,
    zustand: (d) => ({ v: d.v || 0, b: S.ort?.def?.band ?? 0 }),
    malen(g, d, k) {
      const mf = mineFarben(k.zustand?.b ?? 0);
      const f = mf.stein;
      const h = [14, 18, 11, 16][d.v || 0];
      POLY(g, [[3, 23], [7, 23 - h], [9, 23 - h], [13, 23]], f);
      POLY(g, [[3, 23], [7, 23 - h], [8, 23 - h], [7, 23]], hell(f, 0.2));
      POLY(g, [[9, 23 - h], [13, 23], [10, 23]], dunkel(f, 0.2));
      if ((d.v || 0) % 2) POLY(g, [[10, 23], [12, 17], [14, 23]], dunkel(f, 0.08));
    },
  },
  mine_eiskristall: {
    b: 16, h: 24,
    zustand: (d) => ({ v: d.v || 0 }),
    malen(g, d) {
      const spitze = (x, y, h, f) => { POLY(g, [[x - 2, y], [x, y - h], [x + 2, y]], f); L(g, x - 1, y - 1, x, y - h + 1, '#ffffff', 1); };
      const v = d.v || 0;
      spitze(8, 23, 12 + v * 2, '#a8e0f8');
      spitze(4, 23, 7 + v, '#c8f0ff');
      spitze(12, 23, 8 + (3 - v), '#8ac8f0');
    },
  },
  mine_glutkristall: {
    b: 16, h: 24,
    zustand: (d) => ({ v: d.v || 0 }),
    malen(g, d) {
      const spitze = (x, y, h, f) => { POLY(g, [[x - 2, y], [x, y - h], [x + 2, y]], f); P(g, x, y - h + 2, '#fff0c0'); };
      const v = d.v || 0;
      E(g, 8, 22, 6, 2, '#3a2018');
      spitze(8, 23, 10 + v * 2, '#f86a3a');
      spitze(4, 23, 6 + v, '#f8904a');
      spitze(12, 23, 7 + (3 - v), '#e8402a');
    },
  },
  mine_leuchtpilz: {
    b: 16, h: 16,
    zustand: (d) => ({ v: d.v || 0 }),
    malen(g, d) {
      const pilz = (x, y, r, f) => {
        R(g, x - 1, y - r, 2, r + 1, '#e8e0f0');
        E(g, x, y - r, r + 1, r * 0.7, f); E(g, x - 1, y - r - 0.5, r * 0.5, r * 0.3, hell(f, 0.5));
      };
      const farben = ['#c88af0', '#7ae8d8', '#f0a0e0', '#a8f07a'];
      const f = farben[d.v || 0];
      pilz(6, 15, 4, f); pilz(11, 15, 3, hell(f, 0.1)); pilz(3, 15, 2, dunkel(f, 0.1));
    },
  },
  mine_lore: {
    b: 16, h: 16,
    malen(g) {
      R(g, 1, 13, 14, 2, '#5a5a62');
      POLY(g, [[1, 5], [15, 5], [14, 12], [2, 12]], '#7a5a3a');
      R(g, 1, 5, 14, 1, '#9a7a5a'); R(g, 2, 8, 12, 1, '#5a3a22');
      for (const [x, y] of [[4, 4], [7, 3], [10, 4], [6, 4]]) { E(g, x, y, 2, 1.6, '#8a8078'); P(g, x - 1, y - 1, '#d98a4e'); }
      E(g, 4, 13, 1.8, 1.8, '#3a3a42'); E(g, 12, 13, 1.8, 1.8, '#3a3a42');
    },
  },
  mine_tafel: {
    malen(g) {
      R(g, 2, 3, 12, 9, '#6a4a2a'); R(g, 3, 4, 10, 7, '#e8dcc0');
      for (const y of [5, 7, 9]) R(g, 4, y, 6 + (y % 3), 1, '#7a6a5a');
      P(g, 12, 9, '#c83a2a');
    },
  },
});
