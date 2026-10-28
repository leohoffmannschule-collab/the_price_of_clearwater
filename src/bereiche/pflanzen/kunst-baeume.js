// Bereich „pflanzen" – Wildbäume: Eiche, Ahorn, Kiefer, Mahagoni je Jahreszeit (Herbstlaub, im
// Winter kahl mit Schnee; Kiefer und Mahagoni bleiben grün), junge Stufen (Samen, Keimling,
// Setzling, Busch, kleiner Baum), Stümpfe und der Zeichner „fallend" für umstürzende Bäume.

import { objektKunst, objektBild, gecacht, leinwand, umriss, P, R, E, L, POLY, mische, hell, dunkel } from '../../sprites.js';
import { zeichner } from '../../render.js';
import { S } from '../../spiel.js';
import { T } from '../../daten.js';
import { hash } from '../../zufall.js';

const SCHNEE = '#f4f8fb';
const SCHNEE_D = '#d8e4ee';

/** Laubfarben je Art und Jahreszeit: d(unkel), b(asis), h(ell), dazu Sprenkel. */
const LAUB = {
  eiche: {
    fruehling: { d: '#3e7a34', b: '#5fa84a', h: '#8ccd68', punkt: '#b8e08a' },
    sommer: { d: '#2b682b', b: '#3f8a3a', h: '#62a84a', punkt: '#7cc25a' },
    herbst: { d: '#8a4a1e', b: '#c0702a', h: '#e09a40', punkt: '#f0c060' },
  },
  ahorn: {
    fruehling: { d: '#4a8a34', b: '#6cb84e', h: '#9ad870', punkt: '#f4d0a0' },
    sommer: { d: '#2f6e2a', b: '#45923c', h: '#6cb450', punkt: '#88c860' },
    herbst: { d: '#9a2a1a', b: '#d8482a', h: '#f2802a', punkt: '#f6c840' },
  },
  mahagoni: {
    fruehling: { d: '#1f4e2e', b: '#2f6a3a', h: '#4a8a4a', punkt: '#6aa860' },
    sommer: { d: '#1a4628', b: '#2a6034', h: '#3f7e44', punkt: '#5a9a52' },
    herbst: { d: '#3a4a22', b: '#5a6a2a', h: '#7a8a3a', punkt: '#a89a4a' },
    winter: { d: '#1f4e2e', b: '#2f6a3a', h: '#4a8a4a', punkt: '#6aa860' },
  },
};
const STAMM = {
  eiche: ['#7a5232', '#5a3a22', '#9a6e44'],
  ahorn: ['#8a6a4a', '#6a4e34', '#aa8a62'],
  kiefer: ['#7a4a2a', '#5a321a', '#9a6440'],
  mahagoni: ['#6a2e22', '#4a1e16', '#8a4434'],
};
const stammVon = (art) => STAMM[art] ?? STAMM.eiche;

/** Stamm mit Wurzelansatz, Rinde und Licht links. */
function stamm(g, art, x, y, b, h) {
  const [m, d, l] = stammVon(art);
  R(g, x, y, b, h, m); R(g, x + b - 2, y, 2, h, d); R(g, x + 1, y, 1, h, l);
  P(g, x - 1, y + h - 1, m); P(g, x + b, y + h - 1, d);
  for (let i = 0; i < Math.floor(h / 4); i++) P(g, x + 2 + (i % Math.max(1, b - 3)), y + 2 + i * 4, d);
}

/** Wolkige Krone aus Blattballen. */
function krone(g, p, ballen, seed) {
  for (const [x, y, rx, ry] of ballen) E(g, x, y + 1, rx + 0.6, ry + 0.6, p.d);
  for (const [x, y, rx, ry] of ballen) E(g, x - 0.4, y - 0.3, rx, ry, p.b);
  for (const [x, y, rx, ry] of ballen) E(g, x - rx * 0.3, y - ry * 0.35, rx * 0.5, ry * 0.42, p.h);
  // Blattstruktur: helle und dunkle Sprenkel innerhalb der Ballen
  let i = 0;
  for (const [x, y, rx, ry] of ballen) {
    for (let k = 0; k < Math.round(rx * ry / 6); k++, i++) {
      const a = hash(i, seed, 5) * Math.PI * 2;
      const r = Math.sqrt(hash(i, seed, 9));
      const px = Math.round(x + Math.cos(a) * r * (rx - 1));
      const py = Math.round(y + Math.sin(a) * r * (ry - 1));
      P(g, px, py, k % 3 ? p.d : p.punkt);
      if (k % 3 === 1) P(g, px + 1, py, p.h);
    }
  }
}

/** Kahle Äste (Winter) mit Schnee auf den Oberseiten. */
function aeste(g, art, liste, schnee = true) {
  const [m] = stammVon(art);
  const ast = dunkel(m, 0.1);
  for (const [x0, y0, x1, y1, d] of liste) L(g, x0, y0, x1, y1, ast, d);
  if (schnee) for (const [x0, y0, x1, y1] of liste) {
    // Schnee nur auf schrägen Ästen, in kleinen Polstern zur Spitze hin
    if (Math.abs(x1 - x0) < 2) { P(g, x1, y1 - 1, SCHNEE); continue; }
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let t = Math.ceil(n * 0.35); t <= n; t += 3) {
      const x = Math.round(x0 + ((x1 - x0) * t) / n);
      const y = Math.round(y0 + ((y1 - y0) * t) / n) - 1;
      P(g, x, y, SCHNEE); P(g, x + Math.sign(x1 - x0), y, SCHNEE_D);
    }
  }
}

/** Kiefer: Stockwerke aus Nadelzweigen (b = halbe Breite unten). */
function kiefernkrone(g, cx, unten, oben, b, jz) {
  const gruen = jz === 'herbst' ? ['#1f4e34', '#2f6a44', '#4a8458'] : jz === 'fruehling' ? ['#24603e', '#358a52', '#5aac6a'] : ['#1f583a', '#2f7a4c', '#46945e'];
  const stufen = 4;
  for (let i = 0; i < stufen; i++) {
    const t = i / (stufen - 1);
    const y = Math.round(unten - (unten - oben) * t * 0.78);
    const w = Math.max(2, Math.round(b * (1 - t * 0.72)));
    const hoch = Math.round((unten - oben) * 0.36);
    POLY(g, [[cx, y - hoch], [cx - w, y + 1], [cx + w, y + 1]], gruen[0]);
    POLY(g, [[cx, y - hoch + 1], [cx - w + 1, y], [cx + w - 3, y]], gruen[1]);
    L(g, cx, y - hoch + 2, cx - w + 3, y - 1, gruen[2], 1);
    for (let x = cx - w + 1; x < cx + w; x += 3) P(g, x, y + 1, gruen[0]);
    if (jz === 'winter') {
      L(g, cx, y - hoch + 1, cx - w + 1, y, SCHNEE, 1);
      L(g, cx, y - hoch + 1, cx + w - 2, y - 1, SCHNEE_D, 1);
      for (let x = cx - w + 2; x < cx + w - 2; x += 3) P(g, x, y - 1, SCHNEE);
    }
  }
  if (jz === 'winter') P(g, cx, oben, SCHNEE);
}

// ─── Ausgewachsen 32×44 ─────────────────────────────────────────────────────

function baumBild(art, jz) {
  return gecacht(`pflanzen_baum:${art}:${jz}`, () => {
    const [c, g] = leinwand(32, 44);
    if (art === 'kiefer') {
      stamm(g, art, 14, 32, 4, 12);
      kiefernkrone(g, 16, 34, 1, 13, jz);
      return umriss(c);
    }
    if (art === 'mahagoni') {
      stamm(g, art, 13, 18, 6, 26);
      L(g, 15, 22, 7, 14, stammVon(art)[0], 2); L(g, 17, 20, 25, 12, stammVon(art)[0], 2);
      const p = LAUB.mahagoni[jz];
      krone(g, p, [[16, 9, 13, 6], [7, 13, 6, 4], [25, 12, 6, 4], [16, 5, 8, 4]], 31);
      if (jz === 'winter') { for (const [x, y, w] of [[6, 3, 20], [2, 9, 7], [22, 8, 8]]) { R(g, x, y, w, 1, SCHNEE); for (let i = 0; i < w; i += 3) P(g, x + i, y + 1, SCHNEE_D); } }
      return umriss(c);
    }
    if (art === 'ahorn') {
      stamm(g, art, 13, 28, 6, 16);
      if (jz === 'winter') {
        aeste(g, art, [[16, 30, 16, 6, 2], [16, 22, 6, 12, 2], [16, 20, 26, 10, 2], [8, 14, 4, 7, 1], [24, 12, 28, 6, 1], [16, 12, 12, 3, 1], [16, 12, 21, 2, 1], [10, 15, 8, 8, 1]]);
        return umriss(c);
      }
      const p = LAUB.ahorn[jz];
      krone(g, p, [[16, 15, 13, 12], [8, 19, 6, 6], [24, 19, 6, 6], [16, 7, 9, 6]], 17);
      if (jz === 'herbst') for (let i = 0; i < 8; i++) P(g, 5 + Math.floor(hash(i, 4, 7) * 22), 6 + Math.floor(hash(i, 8, 7) * 20), '#f6d040');
      return umriss(c);
    }
    // Eiche
    stamm(g, art, 13, 29, 6, 15);
    if (jz === 'winter') {
      aeste(g, art, [[16, 30, 16, 8, 2], [16, 22, 7, 12, 2], [16, 18, 25, 9, 2], [10, 15, 6, 6, 1], [22, 12, 27, 5, 1], [16, 12, 13, 4, 1], [16, 12, 20, 3, 1]]);
      return umriss(c);
    }
    const p = LAUB.eiche[jz];
    krone(g, p, [[16, 16, 13, 11], [8, 20, 7, 6], [24, 20, 7, 6], [12, 9, 7, 5], [21, 10, 6, 5]], 11);
    if (jz === 'fruehling') for (let i = 0; i < 10; i++) P(g, 5 + Math.floor(hash(i, 11, 1) * 22), 4 + Math.floor(hash(i, 13, 1) * 20), '#f4c6d8');
    if (jz === 'herbst') for (let i = 0; i < 6; i++) P(g, 4 + Math.floor(hash(i, 21, 3) * 24), 6 + Math.floor(hash(i, 23, 3) * 22), '#5a8a3a');
    return umriss(c);
  });
}

// ─── Junge Stufen ───────────────────────────────────────────────────────────

/** Samen (st 0) und Keimling (st 1), 16×16. */
function keimBild(art, st, jz) {
  return gecacht(`pflanzen_keim:${art}:${st}:${jz === 'winter' ? 'w' : ''}`, () => {
    const [c, g] = leinwand(16, 16);
    E(g, 8, 13, 4, 1.6, '#6a4a2a'); E(g, 8, 12.6, 3, 1, '#7e5a36');
    if (st === 0) {
      if (art === 'eiche') { E(g, 8, 11.5, 1.6, 2, '#a8743a'); R(g, 7, 9, 3, 1, '#6a4a2a'); }
      else if (art === 'kiefer') { E(g, 8, 11, 1.8, 2.6, '#8a5a32'); P(g, 7, 10, '#b8844a'); P(g, 9, 12, '#5a3a1e'); }
      else if (art === 'ahorn') { L(g, 6, 12, 4, 8, '#c89a5a', 1); L(g, 7, 12, 5, 8, '#d8ae6a', 1); P(g, 7, 12, '#8a6a3a'); }
      else { E(g, 8, 11.5, 2, 1.5, '#7a3a2a'); P(g, 7, 11, '#a85a42'); }
      return umriss(c);
    }
    const blattF = art === 'kiefer' ? '#2f7a4c' : art === 'mahagoni' ? '#2f6a3a' : '#5fa84a';
    L(g, 8, 13, 8, 7, '#7a6a3a', 1);
    if (art === 'kiefer') for (const [x, y] of [[6, 7], [10, 7], [7, 6], [9, 6], [8, 5]]) L(g, 8, 8, x, y, blattF, 1);
    else { E(g, 6, 7, 2, 1.3, blattF); E(g, 10, 6.5, 2, 1.3, dunkel(blattF, 0.1)); P(g, 5, 6, hell(blattF, 0.3)); }
    if (jz === 'winter') P(g, 8, 4, SCHNEE);
    return umriss(c);
  });
}

/** Setzling (st 2, 16×24), Busch (st 3, 20×30), kleiner Baum (st 4, 24×36). */
function jungBild(art, st, jz) {
  return gecacht(`pflanzen_jung:${art}:${st}:${jz}`, () => {
    const [b, h] = [[16, 24], [20, 30], [24, 36]][st - 2];
    const [c, g] = leinwand(b, h);
    const cx = Math.floor(b / 2);
    const grund = h - 1;
    if (art === 'kiefer') {
      stamm(g, art, cx - 1, grund - [3, 4, 6][st - 2], 2, [3, 4, 6][st - 2] + 1);
      kiefernkrone(g, cx, grund - [3, 4, 6][st - 2], [8, 3, 2][st - 2], [4, 6, 9][st - 2], jz);
      return umriss(c);
    }
    const stammH = [10, 10, 14][st - 2];
    const stammB = [1, 2, 3][st - 2];
    stamm(g, art, cx - Math.floor(stammB / 2), grund - stammH, stammB, stammH + 1);
    const winterKahl = jz === 'winter' && art !== 'mahagoni';
    const p = (LAUB[art] ?? LAUB.eiche)[jz] ?? LAUB.eiche.sommer;
    if (st === 2) {
      if (winterKahl) { aeste(g, art, [[cx, grund - 10, cx - 3, grund - 14, 1], [cx, grund - 9, cx + 3, grund - 13, 1]]); return umriss(c); }
      for (const [x, y, rx] of [[cx - 3, grund - 11, 2.4], [cx + 3, grund - 12, 2.4], [cx, grund - 15, 2.6], [cx - 2, grund - 7, 1.8], [cx + 2, grund - 8, 1.8]]) {
        E(g, x, y, rx, rx * 0.7, p.b); P(g, Math.round(x - 1), Math.round(y - 1), p.h); P(g, Math.round(x + 1), Math.round(y), p.d);
      }
      L(g, cx, grund - 10, cx - 3, grund - 11, stammVon(art)[0], 1); L(g, cx, grund - 9, cx + 3, grund - 12, stammVon(art)[0], 1);
      return umriss(c);
    }
    if (winterKahl) {
      const o = grund - stammH;
      aeste(g, art, [[cx, o + 2, cx, o - 8, 1], [cx, o + 1, cx - 6, o - 5, 1], [cx, o, cx + 6, o - 6, 1], [cx - 3, o - 3, cx - 5, o - 9, 1], [cx + 3, o - 3, cx + 4, o - 10, 1]]);
      return umriss(c);
    }
    const o = grund - stammH;
    const ballen = st === 3
      ? [[cx, o - 3, 7, 6], [cx - 4, o, 4, 3], [cx + 4, o, 4, 3]]
      : [[cx, o - 6, 9.5, 8], [cx - 6, o - 1, 5, 4], [cx + 6, o - 1, 5, 4], [cx - 2, o - 12, 5, 4]];
    krone(g, p, ballen, art.length * 7 + st);
    if (jz === 'winter') { const y = o - (st === 3 ? 9 : 14); E(g, cx - 1, y, st === 3 ? 4 : 6, 1.4, SCHNEE); P(g, cx + 3, y + 1, SCHNEE_D); }
    return umriss(c);
  });
}

/** Baumstumpf je Art. */
function stumpfBild(art) {
  return gecacht(`pflanzen_stumpf:${art}`, () => {
    const [c, g] = leinwand(16, 16);
    const [m, d, l] = stammVon(art);
    R(g, 4, 8, 8, 6, m); R(g, 10, 8, 2, 6, d); R(g, 5, 8, 1, 6, l);
    P(g, 3, 13, m); P(g, 12, 13, d); P(g, 2, 14, d);
    E(g, 8, 8, 4, 2, mische(m, '#e8c890', 0.6)); E(g, 8, 8, 2.4, 1.2, mische(m, '#c8a070', 0.5)); P(g, 8, 8, d);
    if (art === 'kiefer') P(g, 6, 11, '#e8c860');
    return umriss(c);
  });
}

objektKunst({
  baum: { bild: (o, k) => baumBild(o.art || 'eiche', k.jz), tiefe: 0, schatten: [7, 2.5, -2], durchsichtig: [30, 40] },
  stumpf: { bild: (o) => stumpfBild(o.art || 'eiche') },
  pflanzen_baumkeim: { bild: (o, k) => keimBild(o.art || 'eiche', o.st ?? 0, k.jz), tiefe: -2 },
  pflanzen_jungbaum: { bild: (o, k) => jungBild(o.art || 'eiche', Math.min(4, Math.max(2, o.st ?? 2)), k.jz), tiefe: 0, schatten: [5, 2, -2], durchsichtig: [20, 30] },
});

/** Fallende Bäume (S.fallend, von der Axt angestoßen); das Bild kommt aus dem Objektbild „baum". */
zeichner({
  name: 'fallend', ebene: 'welt', reihe: 45,
  sammeln(ort, v) {
    const teile = [];
    for (const f of S.fallend) {
      const bx = f.x * T + 8;
      const by = (f.y + 1) * T;
      if (!v.imBild(bx - 48, by - 48, 96, 56)) continue;
      const bild = objektBild({ t: 'baum', art: f.art }, { jz: v.jz, s: v.s, ort });
      teile.push({ y: by, f: (g) => {
        const w = Math.min(1, f.t / 0.75);
        g.save();
        g.globalAlpha = f.t > 0.75 ? Math.max(0, 1 - (f.t - 0.75) / 0.35) : 1;
        g.translate(bx, by - 4);
        g.rotate(f.richtung * w * w * 1.45);
        g.drawImage(bild, -bild.width / 2, 4 - bild.height);
        g.restore();
      } });
    }
    return teile;
  },
});
