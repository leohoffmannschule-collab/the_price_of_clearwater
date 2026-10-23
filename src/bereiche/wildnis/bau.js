// Bereich „wildnis" – Hilfen zum Bauen der großen Karten: weiches Rauschen, Wege mit Brücken,
// ein Platz-Buch für Deko (nichts landet auf Wegen, Gebäuden, Punkten) und der dichte Wald.
// DOM-frei; benutzt nur karten.js und zufall.js.

import { rechteck, ellipse } from '../../karten.js';
import { hash } from '../../zufall.js';

/** Weiches Rauschen 0..1 (bilinear mit geglätteter Mischung). */
export function rauschen(x, y, s = 0) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, s);
  const b = hash(x0 + 1, y0, s);
  const c = hash(x0, y0 + 1, s);
  const d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Unregelmäßiger Fleck (wie `ellipse`, aber mit welligem Rand): Becken, Felsen, Wiesen. */
export function fleck(g, cx, cy, rx, ry, z, seed = 1, wellig = 0.7) {
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) {
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      if (y < 0 || x < 0 || y >= g.length || x >= g[0].length) continue;
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d + (rauschen(x / 2.3, y / 2.3, seed) - 0.5) * wellig <= 1) g[y][x] = z;
    }
  }
  return g;
}

/** Zeichen an (x, y), '#' außerhalb. */
export const zeichen = (g, x, y) => (y < 0 || x < 0 || y >= g.length || x >= g[0].length ? '#' : g[y][x]);

/**
 * Weg durch die Punkte; Wasserfelder darunter werden zur Brücke (Zeichen `bruecke`), andere Wege
 * und Pflaster bleiben unberührt, wenn `schonen` gesetzt ist. Die Breite wächst nach rechts/unten.
 */
export function strasse(g, punkte, breite = 2, z = ':', { bruecke = 'h', schonen = '' } = {}) {
  const setze = (x, y) => {
    const alt = zeichen(g, x, y);
    if (x < 0 || y < 0 || y >= g.length || x >= g[0].length) return;
    if (schonen.includes(alt)) return;
    g[y][x] = alt === '~' || alt === bruecke ? bruecke : z;
  };
  for (let i = 0; i < punkte.length - 1; i++) {
    const [x0, y0] = punkte[i];
    const [x1, y1] = punkte[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let j = 0; j <= n; j++) {
      const px = Math.round(x0 + ((x1 - x0) * j) / n);
      const py = Math.round(y0 + ((y1 - y0) * j) / n);
      for (let dy = 0; dy < breite; dy++) for (let dx = 0; dx < breite; dx++) setze(px + dx, py + dy);
    }
  }
  return g;
}

/** Wellige Kante: Tiefe y(x) aus mehreren Sinuswellen. */
export const welle = (x, mitte, a1, p1, a2, p2, ph = 0) => Math.round(mitte + a1 * Math.sin(x / p1 + ph) + a2 * Math.sin(x / p2 + ph * 2.3));

/**
 * Das Platz-Buch einer Karte: merkt, welche Felder schon belegt sind, und streut Deko nur auf freie
 * Felder der gewünschten Bodenart. So steht nie etwas auf einem Weg, vor einer Tür oder auf einem Punkt.
 */
export class Platz {
  constructor(g) {
    this.g = g;
    this.b = g[0].length;
    this.h = g.length;
    this.belegt = new Uint8Array(this.b * this.h);
    this.deko = [];
  }

  /** Fläche samt Rand sperren (nichts wird danach dort gestreut). */
  sperren(x, y, w = 1, h = 1, rand = 0) {
    for (let yy = y - rand; yy < y + h + rand; yy++) {
      for (let xx = x - rand; xx < x + w + rand; xx++) {
        if (xx >= 0 && yy >= 0 && xx < this.b && yy < this.h) this.belegt[yy * this.b + xx] = 1;
      }
    }
  }

  istFrei(x, y, w = 1, h = 1) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.b || yy >= this.h || this.belegt[yy * this.b + xx]) return false;
      }
    }
    return true;
  }

  /** Eine Deko fest setzen (sperrt ihre Fläche, mit `rand` auch ihre Umgebung). */
  setze(d, rand = 0) {
    this.deko.push(d);
    this.sperren(d.x, d.y, d.w || 1, d.h || 1, rand);
    return d;
  }

  /** Mehrere Dekos aus einer Liste. */
  setzeAlle(liste, rand = 0) {
    for (const d of liste) this.setze(d, rand);
  }

  /**
   * Deko streuen: n Versuche-Treffer auf Feldern mit Bodenzeichen aus `boden`, innerhalb `zone`
   * [x, y, b, h]. Optionen: abstand (freier Rand), seed, w, h, gruppe (n Nachbarn je Treffer),
   * weiter(x, y) → bool (zusätzliche Bedingung), neu(x, y, i) → Deko-Felder (z. B. art).
   */
  streuen(typ, n, { boden = '.', zone = [0, 0, this.b, this.h], abstand = 1, seed = 1, w = 1, h = 1, weiter, neu, versuche = n * 40, sperrt = true } = {}) {
    let da = 0;
    for (let i = 0; i < versuche && da < n; i++) {
      const x = zone[0] + Math.floor(hash(i, seed, 11) * zone[2]);
      const y = zone[1] + Math.floor(hash(i, seed, 12) * zone[3]);
      let ok = true;
      for (let yy = y; yy < y + h && ok; yy++) for (let xx = x; xx < x + w && ok; xx++) if (!boden.includes(zeichen(this.g, xx, yy))) ok = false;
      if (!ok || !this.istFrei(x - abstand, y - abstand, w + 2 * abstand, h + 2 * abstand)) continue;
      if (weiter && !weiter(x, y)) continue;
      const d = { typ, x, y, ...(w > 1 ? { w } : {}), ...(h > 1 ? { h } : {}), ...(neu ? neu(x, y, da) : {}) };
      this.deko.push(d);
      if (sperrt) this.sperren(x, y, w, h);
      da++;
    }
    return da;
  }
}

/**
 * Dichter Wald: Alle Felder weit weg von offenen Stellen (`offen[y][x]`) werden mit Rauschen zu
 * undurchdringlichem Laub ('#'). Je näher an Wegen und Wiesen, desto lichter der Wald.
 * Schreibt nur auf Gras ('.') und 'n'.
 */
export function waldDichte(g, offen, { seed = 3, ab = 2.2, staerke = 0.55, maximal = 9 } = {}) {
  const b = g[0].length;
  const h = g.length;
  const dist = new Int16Array(b * h).fill(maximal);
  const warteschlange = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      if (offen[y][x]) { dist[y * b + x] = 0; warteschlange.push(y * b + x); }
    }
  }
  for (let i = 0; i < warteschlange.length; i++) {
    const idx = warteschlange[i];
    const x = idx % b;
    const y = (idx - x) / b;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= b || ny >= h) continue;
      const j = ny * b + nx;
      if (dist[j] > dist[idx] + 1) { dist[j] = dist[idx] + 1; warteschlange.push(j); }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      const c = g[y][x];
      if (c !== '.' && c !== 'n') continue;
      const d = dist[y * b + x];
      if (d < 2) continue;
      const lage = rauschen(x / 5.5, y / 5.5, seed) * 0.9 + rauschen(x / 2.1, y / 2.1, seed + 9) * 0.35;
      if (d + lage * 3.2 * staerke > ab) g[y][x] = "#";
    }
  }
  return g;
}

/** Offen-Maske zum Waldfüllen: false überall, dann mit offenRechteck/offenEllipse/offenAusZeichen füllen. */
export function offenMaske(b, h) {
  return Array.from({ length: h }, () => Array(b).fill(false));
}
export function offenRechteck(m, x, y, b, h, rand = 0) {
  for (let yy = y - rand; yy < y + h + rand; yy++) for (let xx = x - rand; xx < x + b + rand; xx++) if (m[yy]?.[xx] !== undefined) m[yy][xx] = true;
}
export function offenEllipse(m, cx, cy, rx, ry) {
  const t = Array.from({ length: m.length }, () => Array(m[0].length).fill('.'));
  ellipse(t, cx, cy, rx, ry, 'o');
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m[0].length; x++) if (t[y][x] === 'o') m[y][x] = true;
}
/** Alles, was kein Gras und keine Wand ist (Wege, Wasser, Sand, Pflaster …), ist offen. */
export function offenAusZeichen(m, g, nicht = '.#n') {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (!nicht.includes(g[y][x])) m[y][x] = true;
}

export { rechteck, ellipse };
