// Bereich „handwerk" – Fabrik: Pixelkunst der Gegenstände (Bauteile, Maschinen als Symbole) und die kleinen
// Warensymbole, die auf den Bändern laufen. Gemeinsame Zeichenhilfen (Drehen im Quadrat) für fabrik-kunst-objekte.js.

import { kunst, belagKunst, P, R, E, L as LINIE, POLY, hell, dunkel, gecacht, leinwand, itemBild, umriss } from '../../sprites.js';
import { ITEMS } from '../../daten.js';

export const STAHL = '#8a919c';
export const STAHL_H = '#b4bbc6';
export const STAHL_D = '#5a606c';
export const STAHL_DD = '#3a3e48';
export const GELB = '#e8c050';
export const BLAU = '#5aa8e0';
export const ORANGE = '#e8702a';

// ─── Drehen im Quadrat der Kantenlänge N (r × 90° im Uhrzeigersinn) ──────────

/** Pixel (x, y) eines Quadrats der Größe N um r × 90° gedreht. */
export function dreh(N, r, x, y) {
  switch (((r % 4) + 4) % 4) {
    case 1: return [N - 1 - y, x];
    case 2: return [N - 1 - x, N - 1 - y];
    case 3: return [y, N - 1 - x];
    default: return [x, y];
  }
}
/** Pixel in der Bildebene eines gedrehten Quadrats. */
export function Pr(g, N, r, x, y, f) {
  const [a, b] = dreh(N, r, x, y);
  P(g, a, b, f);
}
/** Rechteck (x, y, w, h) in „vorn = oben"-Koordinaten, gedreht in die Bildebene. */
export function Rr(g, N, r, x, y, w, h, f) {
  const [ax, ay] = dreh(N, r, x, y);
  const [bx, by] = dreh(N, r, x + w - 1, y + h - 1);
  R(g, Math.min(ax, bx), Math.min(ay, by), Math.abs(ax - bx) + 1, Math.abs(ay - by) + 1, f);
}

/**
 * Anschlüsse einer Maschine der Fläche n×n (Kantenlänge N = 16·n): vorn (r) ein gelber Pfeil nach außen je Feld,
 * auf den anderen drei Seiten ein blauer Pfeil nach innen. Die Seiten sind klar zu erkennen, auch ohne Fenster.
 */
export function anschluesse(g, N, r, n, { seiten = ['aus', 'ein', 'ein', 'ein'] } = {}) {
  // seiten[0] = vorn, [1] = rechts, [2] = hinten, [3] = links (relativ zur Ausgangsrichtung)
  for (let seite = 0; seite < 4; seite++) {
    const art = seiten[seite];
    if (!art) continue;
    const ausgang = art === 'aus';
    for (let i = 0; i < n; i++) {
      const cl = 7 + 16 * i;
      for (let k = 0; k < 3; k++) {
        // Pfeil an der oberen Kante: Spitze außen (Ausgang) bzw. innen (Eingang)
        const y = ausgang ? k : 2 - k;
        for (let x = cl - k; x <= cl + 1 + k; x++) {
          const [a, b] = dreh(N, seite, x, y);
          Pr(g, N, r, a, b, ausgang ? GELB : BLAU);
        }
      }
    }
  }
}

/** Grundplatte einer Maschine (N×N, 1 Pixel Rand bleibt frei für den Umriss). */
export function platte(g, N, farbe = STAHL_D) {
  R(g, 1, 1, N - 2, N - 2, farbe);
  R(g, 1, 1, N - 2, 1, hell(farbe, 0.35));
  R(g, 1, 1, 1, N - 2, hell(farbe, 0.2));
  R(g, 1, N - 2, N - 2, 1, dunkel(farbe, 0.4));
  R(g, N - 2, 1, 1, N - 2, dunkel(farbe, 0.3));
  for (const [x, y] of [[3, 3], [N - 4, 3], [3, N - 4], [N - 4, N - 4]]) { P(g, x, y, dunkel(farbe, 0.5)); P(g, x - 1, y - 1, hell(farbe, 0.4)); }
}

/** Schnee auf der Oberkante (Winter). */
export function schnee(g, N) {
  R(g, 2, 1, N - 4, 1, '#f4f8fb');
  R(g, 3, 2, Math.floor(N / 3), 1, '#e4ebf1');
  R(g, Math.floor(N / 2), 2, Math.floor(N / 4), 1, '#f4f8fb');
}

// ─── Warensymbole auf dem Band (8×8: Motiv 6×6 mit hellem Rand, damit es auf dem dunklen Band lesbar bleibt) ─

function klumpen(g, f) {
  E(g, 3, 3.2, 2.8, 2.4, dunkel(f, 0.35));
  E(g, 2.8, 2.9, 2.3, 1.9, f);
  P(g, 2, 2, hell(f, 0.6));
}
/** Erz: grauer Brocken mit Einschlüssen in der Farbe des Erzes (anders als Barren und Kohle). */
function erz(g, f) {
  klumpen(g, '#5e564c');
  for (const [x, y] of [[1, 2], [3, 1], [3, 4], [0, 4]]) R(g, x, y, 2, 1, f);
  P(g, 3, 1, hell(f, 0.5));
}
/** Barren: Trapez mit heller Oberseite. */
function barren(g, f) {
  R(g, 0, 3, 6, 2, dunkel(f, 0.3));
  R(g, 1, 2, 4, 1, hell(f, 0.5));
  R(g, 1, 3, 4, 1, f);
}
export const MINI = {
  kohle: (g) => { klumpen(g, '#2a2a32'); P(g, 4, 2, '#8a8a96'); P(g, 1, 3, '#5a5a66'); },
  stein: (g) => { klumpen(g, '#c4beb4'); P(g, 4, 4, '#8a8276'); },
  kupferdraht: (g) => { E(g, 3, 3, 2.9, 2.9, '#a85a28'); E(g, 3, 3, 1.9, 1.9, '#e8a060'); P(g, 2, 2, '#6a3a18'); P(g, 3, 3, '#6a3a18'); },
  eisenplatte: (g) => { R(g, 0, 0, 6, 6, '#7a828e'); R(g, 0, 0, 6, 1, '#eef2f6'); R(g, 1, 1, 4, 4, '#c8ced6'); P(g, 1, 1, '#4a505c'); P(g, 4, 4, '#4a505c'); },
  schraube: (g) => { R(g, 0, 0, 5, 2, '#d6dce4'); P(g, 2, 0, '#4a505c'); R(g, 1, 2, 3, 4, '#8a919c'); P(g, 1, 3, '#4a505c'); P(g, 3, 4, '#4a505c'); },
  zahnrad: (g) => { E(g, 3, 3, 2.4, 2.4, '#b4bbc6'); for (const [x, y] of [[0, 2], [5, 2], [2, 0], [2, 5], [3, 0], [3, 5], [0, 3], [5, 3]]) P(g, x, y, '#9aa3af'); P(g, 2, 2, '#3a3e48'); P(g, 3, 3, '#3a3e48'); },
  maschinenteil: (g) => { R(g, 0, 1, 6, 4, '#6a7482'); R(g, 0, 1, 6, 1, '#d6dce4'); R(g, 1, 3, 4, 1, ORANGE); P(g, 1, 2, '#3a3e48'); P(g, 4, 2, '#3a3e48'); },
  antriebseinheit: (g) => { E(g, 3, 3, 2.9, 2.6, '#3f6fa8'); E(g, 3, 2.6, 2.2, 1.8, '#7aaae0'); P(g, 3, 3, GELB); P(g, 2, 3, GELB); },
};

/** Kleines Symbol (8×8) einer Ware; unbekannte Dinge werden aus ihrem Gegenstandsbild verkleinert. */
export function miniBild(id) {
  return gecacht(`fabrik:mini:${id}`, () => {
    const [c, g] = leinwand(8, 8);
    const it = ITEMS[id];
    g.translate(1, 1);
    if (MINI[id]) MINI[id](g);
    else if (it?.kat === 'barren') barren(g, it.bild?.f || '#cfd7df');
    else if (it?.kat === 'erz') erz(g, it.bild?.f || '#a8a29a');
    else g.drawImage(itemBild({ id }), 1, 1, 14, 14, 0, 0, 6, 6);
    g.setTransform(1, 0, 0, 1, 0, 0);
    return umriss(c, '#e8e0c8');
  }, [8, 8]);
}

// ─── Gegenstände (16×16) ────────────────────────────────────────────────────

function bandStueck(g) {
  // Ein Stück Band, schräg gedacht: Schienen oben/unten, Rollen, Pfeil
  R(g, 1, 4, 14, 8, STAHL_DD);
  R(g, 1, 3, 14, 2, STAHL); R(g, 1, 3, 14, 1, STAHL_H);
  R(g, 1, 11, 14, 2, STAHL_D); R(g, 1, 12, 14, 1, STAHL_DD);
  for (let x = 2; x < 14; x += 4) R(g, x, 5, 1, 6, '#50555f');
  for (const [x, y] of [[9, 5], [10, 6], [11, 7], [10, 8], [9, 9]]) P(g, x, y, GELB);
  R(g, 4, 7, 6, 1, GELB);
}
function teiler(g, farbe, ausgaenge) {
  R(g, 2, 2, 12, 12, farbe); R(g, 2, 2, 12, 1, hell(farbe, 0.4)); R(g, 2, 13, 12, 1, dunkel(farbe, 0.4)); R(g, 13, 2, 1, 12, dunkel(farbe, 0.3));
  R(g, 5, 5, 6, 6, STAHL_DD);
  for (const [x, y, d] of ausgaenge) {
    // kleine Pfeile: d = 0 oben, 1 rechts, 2 unten, 3 links (zeigen aus dem Teil heraus)
    const pts = [[[7, 1], [8, 1], [6, 2], [7, 2], [8, 2], [9, 2]], [[14, 7], [14, 8], [13, 6], [13, 7], [13, 8], [13, 9]], [[7, 14], [8, 14], [6, 13], [7, 13], [8, 13], [9, 13]], [[1, 7], [1, 8], [2, 6], [2, 7], [2, 8], [2, 9]]][d];
    for (const [px, py] of pts) P(g, px + x, py + y, GELB);
  }
}
function kiste(g) {
  R(g, 1, 3, 14, 11, '#9a6a3a'); R(g, 1, 3, 14, 3, '#b07a48'); R(g, 1, 3, 14, 1, '#c8925a');
  R(g, 1, 13, 14, 1, '#5a3a1a'); R(g, 1, 6, 14, 1, '#5a3a1a');
  for (const x of [1, 7, 13]) R(g, x, 3, 2, 11, STAHL_D);
  R(g, 6, 8, 4, 3, GELB); P(g, 7, 9, '#7a5a1a');
}
function bohrer(g) {
  R(g, 2, 11, 12, 3, STAHL_D); R(g, 2, 11, 12, 1, STAHL_H);
  R(g, 4, 3, 8, 8, STAHL); R(g, 4, 3, 8, 1, STAHL_H); R(g, 11, 4, 1, 7, STAHL_D);
  POLY(g, [[5, 11], [11, 11], [8, 15]], '#d8b848');
  for (const [x, y] of [[7, 6], [8, 7], [7, 8], [8, 9]]) P(g, x, y, STAHL_DD);
  R(g, 6, 1, 4, 2, ORANGE);
}
function schmelzer(g) {
  R(g, 2, 4, 12, 10, '#7a4e3a'); R(g, 2, 4, 12, 1, '#a8705a'); R(g, 2, 13, 12, 1, '#4a2e22'); R(g, 13, 4, 1, 10, '#5a3a2a');
  R(g, 9, 1, 3, 4, STAHL_D); R(g, 9, 1, 3, 1, STAHL);
  R(g, 4, 7, 8, 5, '#2a1610'); R(g, 5, 9, 6, 3, ORANGE); R(g, 6, 9, 4, 1, GELB); P(g, 7, 8, '#f08a3a');
  for (let x = 2; x < 14; x += 3) P(g, x, 6, '#4a2e22');
}
function konstrukteur(g) {
  R(g, 2, 3, 12, 11, '#5a7aa0'); R(g, 2, 3, 12, 1, '#8aaad0'); R(g, 2, 13, 12, 1, '#35506f'); R(g, 13, 3, 1, 11, '#3f5c82');
  R(g, 5, 5, 6, 3, STAHL_DD); R(g, 7, 2, 2, 5, STAHL); R(g, 6, 8, 4, 3, GELB); R(g, 5, 11, 6, 1, STAHL_D);
}
function assembler(g) {
  R(g, 2, 8, 12, 6, '#6a5a8a'); R(g, 2, 8, 12, 1, '#9a8ac0'); R(g, 2, 13, 12, 1, '#403458');
  LINIE(g, 4, 9, 5, 3, STAHL_H, 1); LINIE(g, 5, 3, 9, 2, STAHL_H, 1);
  LINIE(g, 12, 9, 11, 4, STAHL_H, 1); P(g, 9, 2, ORANGE); P(g, 11, 4, ORANGE);
  E(g, 8, 11, 2, 1.2, STAHL_DD);
}
function vorkommenKlein(g, b) {
  const f = b.f || '#a8a29a';
  E(g, 8, 11, 7, 4, '#6b6258'); E(g, 8, 10, 6, 3.2, '#8a8074');
  for (const [x, y] of [[5, 8], [9, 7], [7, 10], [11, 10], [4, 11]]) { R(g, x, y, 3, 2, f); P(g, x, y, hell(f, 0.5)); }
}

kunst({
  foerderband: bandStueck,
  splitter: (g) => teiler(g, '#c8803a', [[0, 0, 0], [0, 0, 1], [0, 0, 3]]),
  zusammenfuehrer: (g) => teiler(g, '#3a8ea8', [[0, 0, 0]]),
  lager: kiste,
  erzbohrer: bohrer,
  schmelzer,
  konstrukteur,
  assembler,
  vorkommen: vorkommenKlein,
  kupferdraht(g) {
    E(g, 8, 8, 6, 5.5, '#a85a28'); E(g, 8, 8, 4.5, 4, '#d98a4e'); E(g, 8, 8, 2.2, 2, '#6a3a18');
    LINIE(g, 4, 6, 12, 5, '#f0b078', 1); LINIE(g, 4, 10, 11, 11, '#f0b078', 1);
  },
  eisenplatte(g) {
    R(g, 2, 5, 12, 8, '#7a828e'); R(g, 2, 4, 12, 3, '#d6dce4'); R(g, 3, 7, 10, 5, '#b4bbc6');
    for (const [x, y] of [[4, 8], [11, 8], [4, 11], [11, 11]]) P(g, x, y, '#4a505c');
  },
  schraube(g) {
    R(g, 3, 2, 10, 3, '#b4bbc6'); R(g, 3, 2, 10, 1, '#e4ebf2'); R(g, 7, 3, 2, 1, '#4a505c');
    R(g, 6, 5, 4, 9, '#8a919c'); R(g, 6, 5, 1, 9, '#c8ced6');
    for (let y = 6; y < 14; y += 2) R(g, 6, y, 4, 1, '#4a505c');
  },
  zahnrad(g) {
    const f = '#9aa3af';
    for (let a = 0; a < 8; a++) {
      const x = 8 + Math.cos((a * Math.PI) / 4) * 6;
      const y = 8 + Math.sin((a * Math.PI) / 4) * 6;
      R(g, Math.round(x) - 1, Math.round(y) - 1, 3, 3, f);
    }
    E(g, 8, 8, 5, 5, f); E(g, 8, 8, 4, 4, hell(f, 0.25)); E(g, 8, 8, 2, 2, STAHL_DD);
  },
  maschinenteil(g) {
    R(g, 1, 4, 14, 9, '#6a7482'); R(g, 1, 4, 14, 2, '#b4bbc6'); R(g, 1, 12, 14, 1, '#3a3e48');
    R(g, 3, 8, 10, 2, ORANGE); for (const x of [3, 7, 11]) P(g, x, 6, '#3a3e48');
    E(g, 8, 8, 2, 2, '#3a3e48'); P(g, 8, 7, '#8a919c');
  },
  antriebseinheit(g) {
    E(g, 7, 9, 6, 5, '#3f6fa8'); E(g, 6.5, 8, 5, 3.8, '#6a9ad0'); R(g, 3, 12, 8, 2, '#2a4a78');
    R(g, 12, 7, 3, 4, STAHL); R(g, 14, 8, 1, 2, STAHL_H);
    E(g, 7, 9, 2, 2, GELB); P(g, 7, 9, '#7a5a1a');
    for (const x of [3, 9]) P(g, x, 5, STAHL_H);
  },
});

/** Abraum vor einem Vorkommen im Steinbruch: lockerer Schotter mit Erzkrümeln (ohne Umriss). */
belagKunst('handwerk_abraum', (g, k) => {
  R(g, 0, 0, 16, 16, k?.winter ? '#d8dce2' : '#9a8e7e');
  for (const [x, y, f] of [[2, 3, '#7a6e60'], [9, 2, '#b4a894'], [5, 9, '#7a6e60'], [12, 11, '#b4a894'], [3, 13, '#867a6a'], [13, 5, '#867a6a'], [8, 6, '#c8b898'], [10, 14, '#7a6e60']]) R(g, x, y, 2, 1, f);
  for (const [x, y] of [[6, 4], [11, 8], [2, 10]]) P(g, x, y, '#d98a4e');
});
