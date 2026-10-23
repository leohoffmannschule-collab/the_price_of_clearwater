// Bereich „wildnis" – was sich bewegt: Brandung und Schaum, Möwen, Krabben, Schmetterlinge,
// Glühwürmchen, fallendes Laub, Rauch aus den Schornsteinen, das Lagerfeuer und der Strahl
// des Leuchtturms. Alles zeichnet nur einfache Formen; Bilder kommen aus dem Zwischenspeicher.

import { zeichner } from '../../render.js';
import { S } from '../../spiel.js';
import { leinwand, gecacht, P, R, E, L, POLY, umriss } from '../../sprites.js';
import { hash } from '../../zufall.js';
import * as Logik from '../../logik.js';

const T = 16;

// ─── Brandung: Schaum läuft am Ufer auf und ab ──────────────────────────────

zeichner({
  name: 'wildnis_brandung', ebene: 'boden', reihe: 12,
  zeichnen(g, k, ort, v) {
    const def = ort.def;
    if (def.id !== 'strand') return;
    const t = S.t;
    for (let ty = v.y0; ty <= v.y1; ty++) {
      const zeile = def.grid[ty];
      if (!zeile) continue;
      for (let tx = v.x0; tx <= v.x1; tx++) {
        if (zeile[tx] !== '~') continue;
        const oben = def.grid[ty - 1]?.[tx];
        if (oben === 'l') {
          // Schaumzunge, die vor- und zurückläuft
          g.fillStyle = 'rgba(255,255,255,0.85)';
          for (let i = 0; i < T; i += 1) {
            const lauf = (Math.sin(t * 1.5 + (tx * T + i) * 0.33 + ty) + 1) * 0.5;
            R(g, tx * T + i, ty * T, 1, 1 + Math.round(lauf * 4), g.fillStyle);
          }
          g.fillStyle = 'rgba(255,255,255,0.35)';
          const welle = 6 + Math.round(((Math.sin(t * 1.5 + tx * 0.9 + 1.7) + 1) * 0.5) * 6);
          g.fillRect(tx * T + 2, ty * T + welle, 11, 1);
        } else if ((ty + Math.floor(t * 0.5)) % 5 === 0 && (tx * 7 + ty) % 3 === 0) {
          // draußen: laufende Wellenkämme
          const x = ((tx * T + t * 9 + ty * 5) % T);
          g.fillStyle = 'rgba(255,255,255,0.28)';
          g.fillRect(tx * T + x, ty * T + 7, 6, 1);
        }
      }
    }
  },
});

// ─── Möwen ──────────────────────────────────────────────────────────────────

const MOEWEN = [
  { cx: 22, cy: 24, rx: 14, ry: 3.5, v: 0.5, p: 0 }, { cx: 58, cy: 33, rx: 16, ry: 4, v: 0.4, p: 2 },
  { cx: 46, cy: 12, rx: 11, ry: 3, v: 0.62, p: 4 }, { cx: 78, cy: 35, rx: 9, ry: 3, v: 0.45, p: 1 },
  { cx: 36, cy: 36, rx: 12, ry: 3, v: 0.55, p: 3 },
];
const moewe = (g, x, y, flügel, dir) => {
  const f = '#f6f8fa';
  const dunkelF = '#6a7480';
  R(g, x - 2, y, 5, 2, f);
  R(g, x + dir * 3, y, 2, 2, f); P(g, x + dir * 4, y + 1, '#e8a830');
  const o = flügel ? -3 : 1;
  L(g, x - 1, y, x - 5, y + o, f, 1); L(g, x + 1, y, x + 5, y + o, f, 1);
  P(g, x - 5, y + o, dunkelF); P(g, x + 5, y + o, dunkelF);
};
zeichner({
  name: 'wildnis_moewen', ebene: 'ueber', reihe: 22,
  zeichnen(g, k, ort, v) {
    if (ort.def.id !== 'strand' || v.nacht) return;
    for (const m of MOEWEN) {
      const u = S.t * m.v * 0.5 + m.p;
      const x = (m.cx + Math.cos(u) * m.rx) * T;
      const y = (m.cy + Math.sin(u * 1.7) * m.ry) * T;
      if (!v.imBild(x - 8, y - 8, 16, 16)) continue;
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(x - 3, y + 26, 6, 1);
      moewe(g, Math.round(x), Math.round(y), Math.floor(S.t * 5 + m.p * 3) % 2, -Math.sin(u) > 0 ? 1 : -1);
    }
  },
});

// ─── Krabben ────────────────────────────────────────────────────────────────

const KRABBEN = [[30, 29], [52, 30], [12, 31], [72, 33], [60, 31], [26, 28], [80, 30]];
const krabbeBild = (phase) => gecacht(`wildnis:krabbe:${phase}`, () => {
  const [c, g] = leinwand(11, 8);
  E(g, 5.5, 4.5, 3.2, 2.2, '#d8552f'); E(g, 5, 3.8, 2, 1.2, '#f0805a');
  P(g, 3, 1, '#2b1d1c'); P(g, 8, 1, '#2b1d1c');
  R(g, 0, 2 + phase, 2, 2, '#e8683a'); R(g, 9, 2 + (1 - phase), 2, 2, '#e8683a');
  for (const x of [2, 4, 7, 9]) P(g, x, 6 + ((x + phase) % 2), '#a8381c');
  return umriss(c);
}, [11, 8]);
zeichner({
  name: 'wildnis_krabben', ebene: 'welt', reihe: 46,
  sammeln(ort, v) {
    if (ort.def.id !== 'strand' || v.jz === 'winter' || v.nacht) return [];
    const teile = [];
    KRABBEN.forEach(([tx, ty], i) => {
      const u = S.t * 0.35 + i * 2.1;
      const x = tx * T + Math.sin(u) * 22;
      const y = ty * T + 8 + Math.sin(u * 0.7 + i) * 3;
      if (!v.imBild(x - 6, y - 8, 12, 12)) return;
      const phase = Math.floor(S.t * 6 + i) % 2;
      teile.push({ y: y + 1, f: (g) => {
        g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(Math.round(x) - 4, Math.round(y) - 1, 9, 2);
        g.drawImage(krabbeBild(phase), Math.round(x) - 5, Math.round(y) - 7);
      } });
    });
    return teile;
  },
});

// ─── Schmetterlinge ─────────────────────────────────────────────────────────

const FALTER = ['#f2d24a', '#ec97be', '#9ad0f0', '#f4f0e8', '#e8702a'];
const FALTER_KARTEN = { wald: [4, 4, 82, 62], geheimwald: [3, 3, 34, 24], strand: [2, 3, 62, 8] };
zeichner({
  name: 'wildnis_falter', ebene: 'ueber', reihe: 24,
  zeichnen(g, k, ort, v) {
    const z = FALTER_KARTEN[ort.def.id];
    if (!z || v.nacht || v.jz === 'winter' || v.jz === 'herbst') return;
    const klar = S.s?.zeit?.wetter === 'regen' || S.s?.zeit?.wetter === 'sturm';
    if (klar) return;
    // Nur die Falter im Bild: Ankerpunkte aus dem Rauschen, jeder Falter kreist um seinen Anker
    const n = ort.def.id === 'geheimwald' ? 14 : 40;
    for (let i = 0; i < n; i++) {
      const ax = (z[0] + hash(i, 1, 33) * z[2]) * T;
      const ay = (z[1] + hash(i, 2, 33) * z[3]) * T;
      const u = S.t * (0.6 + hash(i, 3, 33) * 0.6) + i * 3.7;
      const x = ax + Math.sin(u) * 18 + Math.sin(u * 2.3) * 5;
      const y = ay + Math.cos(u * 0.8) * 12 + Math.sin(u * 3.1) * 3;
      if (!v.imBild(x - 4, y - 4, 8, 8)) continue;
      const f = FALTER[i % FALTER.length];
      const auf = Math.floor(S.t * 9 + i) % 2;
      const xi = Math.round(x);
      const yi = Math.round(y);
      R(g, xi, yi, 1, 2, '#2b1d1c');
      R(g, xi - 2, yi - (auf ? 2 : 1), 2, auf ? 3 : 2, f); R(g, xi + 1, yi - (auf ? 2 : 1), 2, auf ? 3 : 2, f);
      P(g, xi - 1, yi, '#ffffff');
    }
  },
});

// ─── Glühwürmchen und Leuchtsporen ──────────────────────────────────────────

zeichner({
  name: 'wildnis_gluehwuermchen', ebene: 'ueber', reihe: 26,
  zeichnen(g, k, ort, v) {
    const z = FALTER_KARTEN[ort.def.id];
    if (!z || !v.nacht || ort.def.id === 'strand') return;
    if (v.jz === 'winter') return;
    const n = ort.def.id === 'geheimwald' ? 46 : 70;
    for (let i = 0; i < n; i++) {
      const ax = (z[0] + hash(i, 4, 33) * z[2]) * T;
      const ay = (z[1] + hash(i, 5, 33) * z[3]) * T;
      const u = S.t * (0.3 + hash(i, 6, 33) * 0.4) + i * 5.3;
      const x = ax + Math.sin(u) * 20 + Math.sin(u * 1.9) * 6;
      const y = ay + Math.cos(u * 0.9) * 14;
      if (!v.imBild(x - 4, y - 4, 8, 8)) continue;
      const puls = 0.35 + 0.65 * Math.max(0, Math.sin(S.t * 2.2 + i * 1.7));
      g.fillStyle = `rgba(190,255,120,${(0.18 * puls).toFixed(3)})`;
      g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5);
      g.fillStyle = `rgba(240,255,170,${puls.toFixed(3)})`;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  },
});

// ─── Laubfall im Herbst ─────────────────────────────────────────────────────

const LAUB_FARBEN = ['#d8742f', '#b8452f', '#e8b040', '#a8782a'];
zeichner({
  name: 'wildnis_laubfall', ebene: 'ueber', reihe: 28,
  zeichnen(g, k, ort, v) {
    if (ort.def.id !== 'wald' && ort.def.id !== 'geheimwald') return;
    if (v.jz !== 'herbst') return;
    const breite = v.x1 * T - v.x0 * T + T;
    const hoehe = v.y1 * T - v.y0 * T + T;
    for (let i = 0; i < 38; i++) {
      const fall = 14 + hash(i, 1, 55) * 12;
      const y = v.y0 * T + ((hash(i, 2, 55) * hoehe + S.t * fall) % hoehe);
      const x = v.x0 * T + ((hash(i, 3, 55) * breite + Math.sin(S.t * 0.9 + i) * 10 + S.t * 3) % breite);
      const f = LAUB_FARBEN[i % LAUB_FARBEN.length];
      const kippt = Math.floor(S.t * 3 + i) % 2;
      R(g, Math.round(x), Math.round(y), kippt ? 3 : 2, kippt ? 2 : 3, f);
    }
  },
});

// ─── Rauch aus den Schornsteinen ────────────────────────────────────────────

/** Schornstein-Ausgang im Gebäudebild: [x, y] ab links oben, und wie hoch das Bild ist. */
const SCHORNSTEINE = {
  huette: { x: 71, y: 2, h: 80 }, ranch: { x: 78, y: 3, h: 80 }, wildnis_matshuette: { x: 62, y: 0, h: 64 }, wildnis_holzhaus: { x: 49, y: 0, h: 48 },
};
zeichner({
  name: 'wildnis_rauch', ebene: 'ueber', reihe: 21,
  zeichnen(g, k, ort, v) {
    if (v.jz === 'sommer' && !v.nacht && S.s?.zeit?.minute > 900 && S.s?.zeit?.minute < 1700) return;
    for (const geb of Logik.gebaeudeListe(v.s, ort.def)) {
      const sch = SCHORNSTEINE[geb.typ];
      if (!sch) continue;
      const x0 = geb.x * T + sch.x;
      const y0 = (geb.y + geb.h) * T - sch.h + sch.y;
      if (!v.imBild(x0 - 10, y0 - 30, 20, 34)) continue;
      for (let i = 0; i < 5; i++) {
        const t = ((S.t * 0.35 + i / 5) % 1);
        const x = x0 + Math.sin(t * 5 + i) * 2 + t * 6;
        const y = y0 - t * 26;
        const r = 1.4 + t * 2.6;
        g.fillStyle = `rgba(220,222,228,${(0.55 * (1 - t)).toFixed(3)})`;
        g.fillRect(Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 1.6));
      }
    }
  },
});

// ─── Lagerfeuer ─────────────────────────────────────────────────────────────

const flammeBild = (phase) => gecacht(`wildnis:flamme:${phase}`, () => {
  const [c, g] = leinwand(16, 22);
  const h = [11, 13, 10][phase];
  const w = [4.2, 3.6, 4.6][phase];
  POLY(g, [[8, 21 - h], [8 - w, 20], [8 + w, 20]], '#e8702a');
  POLY(g, [[8 + (phase - 1), 22 - h], [8 - w * 0.6, 20], [8 + w * 0.6, 20]], '#f2a03a');
  POLY(g, [[8, 25 - h], [8 - w * 0.3, 20], [8 + w * 0.3, 20]], '#fff3b0');
  P(g, 5 + phase, 9, '#f2a03a'); P(g, 11 - phase, 12, '#e8702a');
  return c;
}, [16, 22]);
zeichner({
  name: 'wildnis_feuer', ebene: 'welt', reihe: 47,
  sammeln(ort, v) {
    const teile = [];
    for (const d of Logik.dekoListe(v.s, ort.def)) {
      if (d.typ !== 'wildnis_lagerfeuer') continue;
      if (!v.sichtbar(d.x, d.y)) continue;
      const phase = Math.floor(S.t * 7 + d.x) % 3;
      teile.push({ y: (d.y + 1) * T + 1, f: (g) => {
        g.drawImage(flammeBild(phase), d.x * T, d.y * T - 8);
        if (Math.floor(S.t * 11 + d.x * 3) % 7 === 0) P(g, d.x * T + 6 + (Math.floor(S.t * 5) % 5), d.y * T - 10 - (Math.floor(S.t * 9) % 6), '#ffd47a');
      } });
    }
    return teile;
  },
});

// ─── Leuchtturm ─────────────────────────────────────────────────────────────

zeichner({
  name: 'wildnis_leuchtturmstrahl', ebene: 'ueber', reihe: 29,
  zeichnen(g, k, ort, v) {
    if (ort.def.id !== 'strand' || !v.nacht) return;
    const x = 3 * T + 24;
    const y = 24 * T - 128 + 18;
    const a = S.t * 0.6;
    for (const richtung of [a, a + Math.PI]) {
      const laenge = 340;
      g.fillStyle = 'rgba(255,244,170,0.13)';
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(richtung - 0.1) * laenge, y + Math.sin(richtung - 0.1) * laenge * 0.6);
      g.lineTo(x + Math.cos(richtung + 0.1) * laenge, y + Math.sin(richtung + 0.1) * laenge * 0.6);
      g.closePath();
      g.fill();
    }
  },
});
