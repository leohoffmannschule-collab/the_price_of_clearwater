// Bereich „pflanzen" – Obstbäume (fünf Wachstumsstufen, Jahreszeiten, Blüte, 0–3 Früchte),
// Riesenpflanzen (3×3) und hohes Gras.

import { objektKunst, gecacht, leinwand, umriss, P, R, E, L, POLY, kugel, mische, hell, dunkel } from '../../sprites.js';
import { hash } from '../../zufall.js';
import { ITEMS } from '../../daten.js';

const SCHNEE = '#f4f8fb';
const SCHNEE_D = '#d8e4ee';
const OBST_JZ = { kirsche: 'fruehling', aprikose: 'fruehling', orange: 'sommer', pfirsich: 'sommer', apfel: 'herbst', granatapfel: 'herbst' };
const BLUETE = { kirsche: '#f8dce8', aprikose: '#fbeef0', orange: '#ffffff', pfirsich: '#f6b8cc', apfel: '#fbe8ee', granatapfel: '#f05a3a' };
const STAMM = ['#8a5a3a', '#6a4028', '#a87a52'];

/** Laub eines Obstbaums je Jahreszeit (die Orange bleibt grün). */
function laub(art, jz) {
  if (art === 'orange' && jz !== 'herbst') return { d: '#1f5a2a', b: '#2f7a36', h: '#4e9a48' };
  return {
    fruehling: { d: '#4a8a3a', b: '#6ab450', h: '#96d070' },
    sommer: { d: '#2e6a2c', b: '#43903a', h: '#68b04e' },
    herbst: art === 'apfel' || art === 'granatapfel' ? { d: '#4a6a2a', b: '#6a8a34', h: '#9aae48' } : { d: '#8a5a1e', b: '#c8902e', h: '#e8b84a' },
    winter: art === 'orange' ? { d: '#1f5a2a', b: '#2f7a36', h: '#4e9a48' } : null,
  }[jz];
}

function kroneMalen(g, p, ballen, seed) {
  for (const [x, y, rx, ry] of ballen) E(g, x, y + 1, rx + 0.6, ry + 0.6, p.d);
  for (const [x, y, rx, ry] of ballen) E(g, x - 0.4, y - 0.3, rx, ry, p.b);
  for (const [x, y, rx, ry] of ballen) E(g, x - rx * 0.3, y - ry * 0.35, rx * 0.5, ry * 0.42, p.h);
  let i = 0;
  for (const [x, y, rx, ry] of ballen) {
    for (let k = 0; k < Math.round(rx * ry / 7); k++, i++) {
      const a = hash(i, seed, 3) * Math.PI * 2;
      const r = Math.sqrt(hash(i, seed, 4));
      P(g, Math.round(x + Math.cos(a) * r * (rx - 1)), Math.round(y + Math.sin(a) * r * (ry - 1)), k % 2 ? p.d : p.h);
    }
  }
}

/** Eine Frucht (klein, 2–3 px) an (x, y). */
function frucht(g, art, x, y) {
  const f = ITEMS[art]?.bild?.f ?? '#d8302a';
  if (art === 'kirsche') {
    L(g, x, y - 2, x - 1, y, '#5a8a2a', 1); L(g, x, y - 2, x + 2, y, '#5a8a2a', 1);
    P(g, x - 1, y + 1, f); P(g, x - 2, y + 1, dunkel(f, 0.2)); P(g, x - 1, y, hell(f, 0.3));
    P(g, x + 2, y + 1, f); P(g, x + 3, y + 1, dunkel(f, 0.2)); P(g, x + 2, y, hell(f, 0.3));
    return;
  }
  kugel(g, x + 0.5, y + 0.5, 1.9, 1.9, f);
  if (art === 'granatapfel') P(g, x, y - 2, dunkel(f, 0.3));
  if (art === 'pfirsich') P(g, x + 1, y + 1, mische(f, '#e04a5a', 0.5));
}

const FRUCHT_POS = [[[10, 16], [21, 14]], [[15, 11], [25, 20]], [[7, 22], [18, 21]]];

/** Ein Punkt sicher innerhalb eines Kronenballens. */
function inKrone(ballen, i, seed) {
  const [x, y, rx, ry] = ballen[Math.floor(hash(i, seed, 1) * ballen.length)];
  const a = hash(i, seed, 2) * Math.PI * 2;
  const r = Math.sqrt(hash(i, seed, 3)) * 0.8;
  return [Math.round(x + Math.cos(a) * r * (rx - 1)), Math.round(y + Math.sin(a) * r * (ry - 1))];
}

/** Obstbaum: Stufe 0–4, Jahreszeit, hängende Früchte. */
function obstBild(art, stufe, jz, fr) {
  return gecacht(`pflanzen_obst:${art}:${stufe}:${jz}:${fr}`, () => {
    const [b, h] = [[16, 24], [20, 28], [24, 34], [28, 40], [32, 44]][stufe];
    const [c, g] = leinwand(b, h);
    const cx = Math.floor(b / 2);
    const grund = h - 1;
    const p = laub(art, jz);
    const stammH = [9, 11, 12, 13, 15][stufe];
    const sb = [1, 2, 3, 4, 6][stufe];
    const sx = cx - Math.floor(sb / 2);
    R(g, sx, grund - stammH, sb, stammH + 1, STAMM[0]);
    if (sb > 1) R(g, sx + sb - 1, grund - stammH, 1, stammH + 1, STAMM[1]);
    if (sb > 2) R(g, sx + 1, grund - stammH, 1, stammH + 1, STAMM[2]);
    if (stufe >= 3) { P(g, sx - 1, grund, STAMM[0]); P(g, sx + sb, grund, STAMM[1]); }
    if (stufe === 0) {
      // Pfahl mit Bast und ein paar Blättern
      R(g, cx + 3, grund - 12, 1, 13, '#c8a070'); P(g, cx + 2, grund - 7, '#e8d8a0'); P(g, cx + 1, grund - 7, '#e8d8a0');
      const f = p ?? { b: '#7a6a4a', h: '#9a8a6a', d: '#5a4a3a' };
      if (p) for (const [x, y] of [[cx - 3, grund - 10], [cx + 2, grund - 12], [cx, grund - 13], [cx - 2, grund - 7]]) { E(g, x, y, 2, 1.3, f.b); P(g, x - 1, y - 1, f.h); }
      else { L(g, cx, grund - 9, cx - 3, grund - 12, STAMM[1], 1); L(g, cx, grund - 8, cx + 2, grund - 11, STAMM[1], 1); P(g, cx, grund - 10, SCHNEE); }
      return umriss(c);
    }
    const o = grund - stammH;
    if (!p) {
      const ast = dunkel(STAMM[0], 0.1);
      const s = stufe / 4;
      const liste = [[cx, o + 3, cx, o - 12 * s, 2], [cx, o + 2, cx - 11 * s, o - 7 * s, 1 + (stufe > 2)], [cx, o + 1, cx + 11 * s, o - 8 * s, 1 + (stufe > 2)],
        [cx - 6 * s, o - 3 * s, cx - 8 * s, o - 13 * s, 1], [cx + 6 * s, o - 4 * s, cx + 7 * s, o - 14 * s, 1], [cx, o - 6 * s, cx - 4 * s, o - 15 * s, 1]].map((a) => a.map(Math.round));
      for (const [x0, y0, x1, y1, d] of liste) L(g, x0, y0, x1, y1, ast, d);
      for (const [x0, y0, x1, y1] of liste) { P(g, x1, y1 - 1, SCHNEE); P(g, Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2) - 1, SCHNEE_D); }
      return umriss(c);
    }
    const s = [0, 0.45, 0.62, 0.8, 1][stufe];
    const ballen = [[cx, o - 7 * s, 13 * s, 10 * s], [cx - 8 * s, o - 2 * s, 6 * s, 5 * s], [cx + 8 * s, o - 2 * s, 6 * s, 5 * s], [cx - 3 * s, o - 13 * s, 7 * s, 5 * s]];
    kroneMalen(g, p, ballen, art.length * 13 + stufe);
    if (stufe === 4) {
      const eigen = OBST_JZ[art] === jz;
      if (eigen && art !== 'orange' && art !== 'granatapfel' && jz === 'fruehling') {
        for (let i = 0; i < 26; i++) {
          const [x, y] = inKrone(ballen, i, 40 + art.length);
          P(g, x, y, BLUETE[art]); if (i % 3 === 0) P(g, x + 1, y, hell(BLUETE[art], 0.5));
        }
      } else if (eigen) {
        for (let i = 0; i < 8; i++) { const [x, y] = inKrone(ballen, i, 50 + art.length); P(g, x, y, BLUETE[art]); }
      }
      for (let i = 0; i < Math.min(3, fr); i++) for (const [x, y] of FRUCHT_POS[i]) frucht(g, art, x, y);
    }
    return umriss(c);
  });
}

const stufeVon = (o) => (o.tage >= 28 ? 4 : Math.floor(((o.tage || 0) / 28) * 4));

objektKunst('obstbaum', {
  bild: (o, k) => obstBild(o.art, stufeVon(o), k.jz ?? 'sommer', stufeVon(o) === 4 ? o.fr || 0 : 0),
  tiefe: 0, schatten: [7, 2.5, -2], durchsichtig: [28, 38],
});

// ─── Riesenpflanzen 48×56 ───────────────────────────────────────────────────

function rieseBild(art, winter) {
  return gecacht(`pflanzen_riese:${art}:${winter ? 1 : 0}`, () => {
    const [c, g] = leinwand(48, 56);
    const f = ITEMS[art]?.bild?.f ?? '#e5872a';
    if (art === 'blumenkohl') {
      for (const [x, y, rx, ry, ff] of [[8, 46, 9, 7, '#4e8a3e'], [40, 46, 9, 7, '#4e8a3e'], [24, 50, 14, 5, '#3e7a34'], [10, 36, 7, 9, '#5c9a45'], [38, 36, 7, 9, '#5c9a45']]) {
        E(g, x, y, rx, ry, ff); E(g, x - rx * 0.3, y - ry * 0.3, rx * 0.5, ry * 0.4, hell(ff, 0.25)); L(g, Math.round(x - rx + 2), y, Math.round(x + rx - 2), y - 2, dunkel(ff, 0.3), 1);
      }
      const knollen = [[24, 30, 10, 8], [14, 34, 7, 6], [34, 34, 7, 6], [19, 22, 7, 6], [30, 22, 7, 6], [24, 16, 7, 6], [24, 40, 10, 5]];
      for (const [x, y, rx, ry] of knollen) kugel(g, x, y, rx, ry, f);
      for (let i = 0; i < 30; i++) P(g, 12 + Math.floor(hash(i, 1, 9) * 24), 12 + Math.floor(hash(i, 2, 9) * 30), dunkel(f, 0.12));
    } else if (art === 'melone') {
      E(g, 24, 52, 21, 3, '#3e7a34');
      kugel(g, 24, 33, 21, 19, f);
      for (const x of [9, 16, 24, 32, 39]) for (let y = 15; y < 52; y++) {
        const dx = x + Math.sin((y - 15) / 6) * 1.2 + (x - 24) * ((y - 33) / 19) ** 2 * -0.3;
        if (((dx - 24) / 20) ** 2 + ((y - 33) / 18) ** 2 < 1) { P(g, Math.round(dx), y, dunkel(f, 0.35)); P(g, Math.round(dx) + 1, y, dunkel(f, 0.2)); }
      }
      E(g, 15, 22, 5, 3, hell(f, 0.45)); R(g, 23, 12, 3, 4, '#6a5a2a'); E(g, 30, 13, 4, 2, '#4f9a3a');
    } else {
      E(g, 24, 52, 21, 3, '#6a5a2a');
      kugel(g, 10, 36, 9, 16, dunkel(f, 0.12)); kugel(g, 38, 36, 9, 16, dunkel(f, 0.12));
      kugel(g, 17, 35, 10, 17, dunkel(f, 0.04)); kugel(g, 31, 35, 10, 17, dunkel(f, 0.04)); kugel(g, 24, 35, 9, 18, f);
      for (const x of [10, 17, 31, 38]) L(g, x, 24, x + (x < 24 ? -1 : 1), 50, dunkel(f, 0.3), 1);
      E(g, 20, 24, 3, 5, hell(f, 0.4));
      R(g, 22, 12, 4, 7, '#6a5a2a'); R(g, 23, 12, 1, 7, '#8a7a4a'); L(g, 26, 14, 32, 10, '#4f9a3a', 2); E(g, 33, 9, 3, 2, '#4f9a3a');
    }
    if (winter) {
      const [top, w] = art === 'blumenkohl' ? [10, 7] : art === 'melone' ? [14, 13] : [18, 14];
      E(g, 24, top + 3, w, 3.5, SCHNEE); E(g, 22, top + 2, w * 0.6, 1.8, '#ffffff');
      for (let x = 24 - w + 3; x < 24 + w - 2; x += 3) P(g, x, top + 6, SCHNEE_D);
    }
    return umriss(c);
  });
}

objektKunst('pflanzen_riese', {
  bild: (o, k) => rieseBild(o.art || 'kuerbis', k.jz === 'winter'),
  tiefe: 0, schatten: [20, 4, -3], durchsichtig: [46, 50],
});

// ─── Hohes Gras 16×20 ───────────────────────────────────────────────────────

const GRAS_FARBE = {
  fruehling: ['#4f9a3a', '#6ab84a', '#9ad86a', '#3e7a2c'],
  sommer: ['#3f8a34', '#559c3c', '#7cc25a', '#2e6a28'],
  herbst: ['#9a8a3a', '#b8a24a', '#d8c068', '#7a6a2a'],
  winter: ['#8aa8a0', '#a8c4bc', '#f4f8fb', '#6a8a84'],
};

function grasBild(v, jz) {
  return gecacht(`pflanzen_gras:${v}:${jz}`, () => {
    const [c, g] = leinwand(16, 20);
    const [m, b, h, d] = GRAS_FARBE[jz] ?? GRAS_FARBE.sommer;
    const halme = 13 + v * 3;
    for (let i = 0; i < halme; i++) {
      const x0 = 2 + Math.floor(hash(i, v, 61) * 12);
      const hoch = 7 + Math.floor(hash(i, v, 62) * 9);
      const neig = Math.round((hash(i, v, 63) - 0.5) * 6);
      const f = [d, m, b, m][i % 4];
      L(g, x0, 19, x0 + neig, 19 - hoch, f, 1);
      P(g, x0 + neig, 19 - hoch, i % 3 ? h : b);
    }
    for (let i = 0; i < 4; i++) { const x = 3 + Math.floor(hash(i, v, 64) * 10); L(g, x, 19, x + (i % 2 ? 1 : -1), 13, b, 2); }
    if (jz === 'winter') for (let i = 0; i < 5; i++) P(g, 3 + Math.floor(hash(i, v, 65) * 10), 6 + Math.floor(hash(i, v, 66) * 6), '#ffffff');
    if (jz === 'fruehling' && v === 2) { P(g, 5, 9, '#f4f0e0'); P(g, 11, 7, '#f2d24a'); }
    return umriss(c, dunkel(m, 0.55));
  });
}

objektKunst('hohesgras', { bild: (o, k) => grasBild(o.v ?? 0, k.jz ?? 'sommer'), tiefe: -3 });
