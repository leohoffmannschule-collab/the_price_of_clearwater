// Bereich „pflanzen" – Pixelkunst der Gegenstände (16×16, Umriss macht der Kern): Saattüten,
// Ernten, Obst, Sammelfunde, Strandfunde, Dünger, Baumsamen, Setzlinge.

import { ITEMS } from '../../daten.js';
import { kunst, KUNST, kunstMalen, leinwand, umriss, P, R, E, L, POLY, kugel, mische, hell, dunkel, HOLZ_D, BLATT, BLATT_D, BLATT_H } from '../../sprites.js';

/** Kleines Blatt von (x0, y0) Richtung (x1, y1). */
function blatt(g, x0, y0, x1, y1, f = BLATT) {
  L(g, x0, y0, x1, y1, f, 2);
  P(g, Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2) - 1, hell(f, 0.3));
}
/** Fünfzackiger Stern. */
function stern(g, cx, cy, ra, ri, f, dreh = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = dreh + (i * Math.PI) / 5;
    const r = i % 2 ? ri : ra;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  POLY(g, pts, f);
}
/** Blüte aus n Blättern um (cx, cy). */
function bluetenkranz(g, cx, cy, n, r, rb, f, mitte, mr = 1.5) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    E(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, rb, rb, f);
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    P(g, Math.round(cx + Math.cos(a) * (r + 0.5) - 0.5), Math.round(cy + Math.sin(a) * (r + 0.5) - 0.5), hell(f, 0.35));
  }
  if (mitte) kugel(g, cx, cy, mr, mr, mitte);
}

kunst({
  // ─── Tüten und Säcke ─────────────────────────────────────────────────────
  /** Saattüte: Papier, Streifen in der Farbe der Jahreszeit (f2), Bild der Frucht (f). */
  saat(g, b) {
    const papier = '#efe2bd';
    R(g, 3, 2, 10, 13, papier); R(g, 12, 3, 1, 12, '#d8c698'); R(g, 3, 14, 10, 1, '#cdb684');
    R(g, 3, 1, 10, 2, '#e2d2a6'); for (const x of [4, 6, 8, 10]) P(g, x + 1, 1, '#c8b480');
    R(g, 3, 3, 10, 2, b.f2 || '#7cc25a'); R(g, 3, 5, 10, 1, dunkel(b.f2 || '#7cc25a', 0.25));
    R(g, 4, 6, 8, 7, mische(papier, b.f, 0.15));
    const it = b.ernte && ITEMS[b.ernte];
    if (it && KUNST[it.bild.art]) {
      // Bild der Ernte, auf halbe Größe verkleinert
      const [c, gg] = leinwand(16, 16);
      kunstMalen(gg, it.bild.art, it.bild);
      g.imageSmoothingEnabled = false;
      g.drawImage(umriss(c), 0, 0, 16, 16, 4, 5, 8, 8);
    } else {
      kugel(g, 8, 10, 2.6, 2.5, b.f);
      L(g, 8, 7, 10, 6, b.f3 && b.f3 !== b.f ? b.f3 : BLATT, 1); P(g, 7, 7, BLATT_D);
    }
    for (const [x, y] of [[5, 13], [8, 13], [11, 13]]) P(g, x, y, '#7a5a3a');
  },
  /** Wildsamen: Stoffbeutel mit bunten Körnern. */
  pflanzen_wildsaat(g, b) {
    E(g, 8, 10.5, 5.5, 4.5, '#c8a878'); E(g, 7, 9.5, 3.5, 2.5, '#dcc094');
    R(g, 6, 4, 4, 3, '#c8a878'); R(g, 5, 6, 6, 1, b.f); P(g, 11, 5, b.f); P(g, 12, 4, b.f);
    POLY(g, [[5, 4], [11, 4], [10, 2], [6, 2]], '#b89868');
    for (const [x, y, f] of [[6, 10, '#7a5a3a'], [9, 11, b.f], [8, 13, '#a8743a'], [11, 10, '#5a3a24'], [6, 13, b.f]]) P(g, x, y, f);
  },
  /** Düngersack mit farbigem Etikett. */
  sack(g, b) {
    E(g, 8, 10.5, 5.5, 4.5, b.f); R(g, 5, 3, 6, 4, b.f); R(g, 4, 2, 8, 2, hell(b.f, 0.2)); R(g, 5, 6, 6, 1, '#4a3018');
    E(g, 6, 8.5, 1.4, 2.2, hell(b.f, 0.3));
    R(g, 6, 9, 5, 4, '#f2ead0'); R(g, 7, 10, 3, 2, b.f2 || '#6aa84f'); P(g, 8, 9, b.f2 || '#6aa84f');
  },
  /** Fläschchen mit Wachstumsmittel. */
  pflanzen_flasche(g, b) {
    R(g, 7, 1, 2, 2, '#8a5a32'); R(g, 6, 3, 4, 2, '#d8e8f0');
    E(g, 8, 10, 5, 5, '#d8e8f0'); E(g, 8, 11, 4, 3.6, b.f); E(g, 8, 9, 3.6, 1, hell(b.f, 0.4));
    E(g, 6, 8, 1, 2, '#ffffff'); P(g, 10, 13, dunkel(b.f, 0.3));
  },
  /** Säckchen Erde mit Wassertropfen. */
  pflanzen_erdsack(g, b) {
    E(g, 8, 11, 6, 4, '#c8a878'); R(g, 4, 6, 8, 5, '#c8a878'); E(g, 8, 6, 4, 1.5, b.f); E(g, 8, 6, 3, 1, dunkel(b.f, 0.25));
    R(g, 4, 8, 8, 1, '#a88858');
    POLY(g, [[8, 9], [10, 12.5], [8, 14], [6, 12.5]], b.f2); P(g, 7, 12, hell(b.f2, 0.5));
  },
  grassamen(g, b) {
    E(g, 8, 11, 5.5, 4, '#d8c49a'); R(g, 5, 5, 6, 5, '#d8c49a'); R(g, 5, 7, 6, 1, '#a88858');
    for (const [x, h] of [[5, 5], [7, 7], [9, 6], [11, 4]]) L(g, x, 6, x + (x > 8 ? 1 : -1), 6 - h, x % 4 ? b.f : hell(b.f, 0.3), 1);
    for (const [x, y] of [[6, 11], [9, 12], [8, 10], [10, 10]]) P(g, x, y, '#8a6a3a');
  },
  /** Setzling im Wurzelballen; f = Fruchtfarbe. */
  pflanzen_setzling(g, b) {
    E(g, 8, 12.5, 4.5, 2.5, '#a8885a'); E(g, 8, 12, 3.5, 1.6, '#7a5a3a'); L(g, 5, 13, 11, 13, '#8a6a3a', 1);
    L(g, 8, 12, 8, 4, '#7a5232', 1); L(g, 8, 8, 5, 6, '#7a5232', 1);
    E(g, 5, 4.5, 2.2, 1.6, BLATT); E(g, 11, 5, 2.4, 1.6, BLATT_D); E(g, 8, 2.5, 2, 1.6, BLATT_H);
    kugel(g, 11, 8.5, 1.7, 1.7, b.f);
  },

  // ─── Gemüse ──────────────────────────────────────────────────────────────
  wurzel(g, b) {
    L(g, 8, 6, 5, 1, b.f2 || BLATT, 2); L(g, 8, 6, 8, 0, BLATT_D, 2); L(g, 8, 6, 11, 1, b.f2 || BLATT, 2);
    POLY(g, [[5, 5], [11, 5], [10, 10], [8, 15], [7, 15], [6, 10]], b.f);
    L(g, 10, 6, 8, 14, dunkel(b.f, 0.2), 1); L(g, 6, 6, 7, 10, hell(b.f, 0.4), 1);
    P(g, 7, 9, dunkel(b.f, 0.35)); P(g, 9, 11, dunkel(b.f, 0.35));
  },
  moehre(g, b) {
    for (const [x, y] of [[4, 1], [7, 0], [10, 1], [12, 3]]) L(g, 8, 5, x, y, x % 2 ? b.f2 : dunkel(b.f2, 0.2), 1);
    POLY(g, [[5, 4], [11, 4], [9, 11], [7, 15]], b.f);
    L(g, 6, 5, 7, 11, hell(b.f, 0.35), 1);
    for (const [x, y] of [[9, 6], [7, 8], [9, 9], [8, 12]]) P(g, x, y, dunkel(b.f, 0.3));
  },
  rundwurzel(g, b) {
    L(g, 8, 6, 5, 1, b.f2 || BLATT, 2); L(g, 8, 6, 11, 1, b.f2 || BLATT, 2); L(g, 8, 6, 8, 2, BLATT_D, 1);
    kugel(g, 8, 10, 4.5, 4.2, b.f); L(g, 8, 14, 8, 15, dunkel(b.f, 0.3), 1);
  },
  knoblauch(g, b) {
    L(g, 8, 6, 8, 1, '#b8c898', 2); P(g, 8, 0, '#d8e0c0');
    kugel(g, 8, 10.5, 5, 4.3, b.f);
    for (const x of [6, 8, 10]) L(g, x, 7, x + (x - 8) / 2, 13, mische(b.f, b.f2, 0.55), 1);
    R(g, 6, 14, 4, 1, '#c8b890'); P(g, 5, 15, '#c8b890'); P(g, 10, 15, '#c8b890');
  },
  yamswurzel(g, b) {
    L(g, 11, 4, 13, 1, b.f2, 1); E(g, 13, 1.5, 1.5, 1, b.f2);
    POLY(g, [[3, 12], [5, 8], [9, 5], [12, 4], [13, 6], [11, 10], [7, 13], [4, 14]], b.f);
    L(g, 5, 9, 10, 5, hell(b.f, 0.35), 1);
    for (const [x, y] of [[6, 11], [9, 9], [11, 7], [5, 13]]) P(g, x, y, dunkel(b.f, 0.35));
  },
  knolle(g, b) {
    kugel(g, 8, 9, 5.8, 4.6, b.f);
    for (const [x, y] of [[6, 8], [10, 10], [8, 11], [11, 7]]) P(g, x, y, dunkel(b.f, 0.35));
  },
  blumenkohl(g, b) {
    E(g, 8, 11, 7, 3.6, b.f2); E(g, 8, 11.5, 6, 2.5, dunkel(b.f2, 0.2));
    kugel(g, 5.5, 7.5, 3, 3, b.f); kugel(g, 10.5, 7.5, 3, 3, b.f); kugel(g, 8, 5, 3, 3, b.f); kugel(g, 8, 9, 3.5, 2.6, b.f);
  },
  brokkoli(g, b) {
    R(g, 7, 9, 3, 6, '#7aae5a'); R(g, 9, 9, 1, 6, '#5a8e3a'); L(g, 8, 11, 5, 9, '#7aae5a', 1); L(g, 9, 11, 12, 9, '#6a9e4a', 1);
    for (const [x, y, r] of [[5, 7, 2.6], [11, 7, 2.6], [8, 4.5, 3], [8, 8, 2.6]]) kugel(g, x, y, r, r - 0.3, b.f);
    for (const [x, y] of [[5, 6], [8, 3], [11, 6], [7, 8]]) P(g, x, y, hell(b.f, 0.45));
  },
  blattkohl(g, b) {
    R(g, 7, 11, 2, 4, '#b8d098');
    E(g, 4.5, 7, 3.2, 4.5, b.f); E(g, 11.5, 7, 3.2, 4.5, b.f); E(g, 8, 5.5, 3.5, 4.8, hell(b.f, 0.15));
    L(g, 8, 2, 8, 11, dunkel(b.f, 0.35), 1);
    for (const [x, y] of [[2, 5], [13, 5], [6, 1], [10, 1], [1, 8], [14, 8]]) P(g, x, y, b.f);
  },
  rotkohl(g, b) {
    kugel(g, 8, 9, 6.5, 5.8, b.f);
    E(g, 4, 11, 3, 3.5, dunkel(b.f, 0.12)); E(g, 12, 11, 3, 3.5, dunkel(b.f, 0.12));
    for (const [x0, y0, x1, y1] of [[8, 4, 8, 13], [8, 8, 4, 6], [8, 8, 12, 6], [4, 10, 2, 13], [12, 10, 14, 13]]) L(g, x0, y0, x1, y1, b.f2, 1);
    E(g, 6, 6, 1.5, 1, hell(b.f, 0.4));
  },
  pakchoi(g, b) {
    R(g, 5, 8, 2, 7, b.f2); R(g, 9, 8, 2, 7, b.f2); R(g, 7, 9, 2, 6, hell(b.f2, 0.3));
    E(g, 5, 5, 3, 4, b.f); E(g, 11, 5, 3, 4, b.f); E(g, 8, 4, 3, 4, hell(b.f, 0.15));
  },
  artischocke(g, b) {
    R(g, 7, 12, 2, 3, '#7a9a5a');
    POLY(g, [[8, 1], [12.5, 6], [12, 11], [8, 13], [4, 11], [3.5, 6]], b.f);
    for (const [y, w] of [[4, 2], [7, 3], [10, 3]]) for (let x = -w; x <= w; x += 2) {
      P(g, 8 + x, y, hell(b.f, 0.3)); P(g, 8 + x, y + 1, mische(b.f, b.f2, 0.6));
    }
    P(g, 8, 1, b.f2); P(g, 8, 2, b.f2);
  },
  schote(g, b) {
    L(g, 3, 12, 12, 3, b.f, 3); L(g, 3, 11, 11, 3, hell(b.f, 0.35), 1);
    for (const [x, y] of [[5, 10], [8, 7], [10, 5]]) P(g, x, y, hell(b.f, 0.5));
    L(g, 12, 3, 14, 1, BLATT_D, 1);
  },
  erbse(g, b) {
    POLY(g, [[2, 11], [5, 7], [10, 4], [13, 3], [12, 6], [8, 10], [4, 12]], dunkel(b.f, 0.15));
    for (const [x, y] of [[5, 9], [7.5, 7.5], [10, 6]]) kugel(g, x, y, 1.6, 1.6, hell(b.f, 0.1));
    L(g, 13, 3, 14, 1, BLATT_D, 1); L(g, 2, 12, 5, 12, dunkel(b.f, 0.3), 1);
  },
  peperoni(g, b) {
    L(g, 4, 13, 9, 6, b.f, 3); L(g, 9, 6, 10, 4, b.f, 2); L(g, 5, 11, 8, 7, hell(b.f, 0.4), 1);
    R(g, 10, 2, 2, 3, '#4a8a3a'); P(g, 12, 2, '#4a8a3a');
  },
  tomate(g, b) {
    kugel(g, 8, 9, 5.5, 4.8, b.f);
    R(g, 6, 5, 5, 1, '#3f8f34'); P(g, 8, 4, '#3f8f34'); P(g, 7, 6, '#3f8f34'); P(g, 9, 6, '#3f8f34'); P(g, 8, 3, '#2f6f24');
  },
  zucchini(g, b) {
    L(g, 3, 13, 11, 5, b.f, 4); L(g, 3, 12, 10, 5, hell(b.f, 0.25), 1);
    for (const [x, y] of [[5, 11], [7, 9], [9, 7]]) P(g, x, y, hell(b.f, 0.5));
    R(g, 11, 3, 2, 3, '#7a9a4a');
    POLY(g, [[12, 3], [15, 1], [14, 4]], b.f2); P(g, 13, 2, hell(b.f2, 0.4));
  },
  aubergine(g, b) {
    kugel(g, 8, 10, 4.6, 5.5, b.f);
    R(g, 5, 4, 6, 2, '#4a8a3a'); P(g, 8, 2, '#3a7a2a'); P(g, 8, 3, '#3a7a2a'); P(g, 5, 6, '#4a8a3a'); P(g, 10, 6, '#4a8a3a');
  },
  rhabarber(g, b) {
    for (const [x0, x1, f] of [[3, 5, dunkel(b.f, 0.15)], [7, 8, b.f], [11, 11, dunkel(b.f, 0.08)]]) {
      L(g, x0, 15, x1, 6, f, 2); L(g, x0, 14, x1, 7, hell(b.f, 0.35), 1); P(g, x0 + 1, 15, mische(b.f, '#f0e0c0', 0.5));
    }
    E(g, 6, 4, 4, 2.6, b.f2); E(g, 11, 4.5, 3.6, 2.4, dunkel(b.f2, 0.12)); L(g, 3, 4, 13, 4, dunkel(b.f2, 0.3), 1);
  },
  kolben(g, b) {
    POLY(g, [[3, 15], [6, 4], [8, 14]], BLATT); POLY(g, [[13, 15], [10, 4], [8, 14]], BLATT_D);
    E(g, 8, 8, 3, 6, b.f);
    for (let y = 3; y < 14; y += 2) for (let x = 6; x < 11; x += 2) P(g, x + ((y >> 1) & 1), y, dunkel(b.f, 0.2));
    E(g, 7, 6, 1, 2, hell(b.f, 0.4));
  },
  aehre(g, b) {
    L(g, 5, 15, 6, 5, '#b89048', 1); L(g, 8, 15, 8, 3, '#b89048', 1); L(g, 11, 15, 10, 5, '#b89048', 1);
    for (const [x, y] of [[6, 4], [8, 2], [10, 4]]) { E(g, x, y + 1, 1.6, 3, b.f); P(g, x - 1, y, hell(b.f, 0.4)); }
  },
  reis(g, b) {
    L(g, 9, 15, 7, 4, b.f2, 1); L(g, 10, 15, 11, 6, dunkel(b.f2, 0.15), 1);
    for (const [x0, y0, x1, y1] of [[7, 4, 3, 9], [7, 4, 5, 11], [11, 6, 13, 11], [7, 4, 9, 9]]) {
      L(g, x0, y0, x1, y1, '#c8b880', 1);
      for (let t = 0.35; t <= 1; t += 0.3) P(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), b.f);
    }
    for (const [x, y] of [[3, 10], [5, 12], [13, 12], [9, 10]]) { P(g, x, y, b.f); P(g, x, y - 1, hell(b.f, 0.4)); }
  },
  amaranth(g, b) {
    L(g, 8, 15, 8, 8, b.f2, 1); E(g, 5.5, 12, 2, 1.2, b.f2); E(g, 10.5, 11, 2, 1.2, dunkel(b.f2, 0.15));
    for (const [x0, y0, x1, y1] of [[8, 8, 4, 2], [8, 8, 8, 1], [8, 8, 12, 3], [8, 8, 13, 9]]) L(g, x0, y0, x1, y1, b.f, 2);
    for (const [x, y] of [[5, 3], [8, 2], [11, 4], [12, 8]]) P(g, x, y, hell(b.f, 0.4));
  },
  hopfen(g, b) {
    L(g, 8, 0, 8, 3, HOLZ_D, 1); E(g, 11, 2, 2.2, 1.3, BLATT);
    POLY(g, [[8, 3], [12, 8], [11, 12], [8, 15], [5, 12], [4, 8]], b.f);
    for (const [y, xs] of [[6, [7, 9]], [9, [6, 8, 10]], [12, [7, 9]]]) for (const x of xs) { P(g, x, y, dunkel(b.f, 0.3)); P(g, x, y - 1, hell(b.f, 0.35)); }
  },
  kaffeebohne(g, b) {
    for (const [x, y] of [[5.5, 10], [10.5, 9]]) { kugel(g, x, y, 3.2, 4, b.f2); L(g, Math.round(x), Math.round(y) - 3, Math.round(x), Math.round(y) + 3, dunkel(b.f2, 0.45), 1); }
    kugel(g, 9, 4, 2.2, 2.2, b.f); L(g, 9, 2, 11, 0, HOLZ_D, 1); E(g, 12, 1.5, 1.8, 1, BLATT);
  },

  // ─── Obst und Beeren ─────────────────────────────────────────────────────
  melone(g, b) {
    kugel(g, 8, 9, 6.8, 5.3, b.f);
    for (const x of [4, 7, 10, 13]) for (let y = 5; y < 14; y++) {
      if (((x + 0.5 - 8) / 6.3) ** 2 + ((y + 0.5 - 9) / 4.8) ** 2 < 1) P(g, x + ((y >> 1) & 1), y, dunkel(b.f, 0.35));
    }
    E(g, 5, 6, 1.5, 1, hell(b.f, 0.45));
  },
  kuerbis(g, b) {
    kugel(g, 4.8, 10, 3.6, 4.5, dunkel(b.f, 0.08)); kugel(g, 11.2, 10, 3.6, 4.5, dunkel(b.f, 0.08)); kugel(g, 8, 10, 3.6, 5, b.f);
    R(g, 7, 3, 2, 3, '#6a5a2a'); P(g, 9, 3, '#4a8a3a'); P(g, 10, 4, '#4a8a3a');
  },
  beeren(g, b) {
    for (const [x, y] of [[5, 10], [10.5, 9.5], [7.5, 6], [8, 12.5]]) kugel(g, x, y, 2.6, 2.6, b.f);
    P(g, 7, 3, BLATT); P(g, 8, 3, BLATT); P(g, 8, 2, BLATT_D);
  },
  erdbeere(g, b) {
    POLY(g, [[3, 6], [13, 6], [12, 10], [8, 15], [4, 10]], b.f);
    E(g, 6, 8, 1.5, 1.5, hell(b.f, 0.3));
    for (const [x, y] of [[5, 7], [8, 8], [11, 7], [6, 10], [10, 10], [8, 12], [7, 6]]) P(g, x, y, '#f6e07a');
    POLY(g, [[4, 6], [6, 3], [8, 5], [10, 3], [12, 6]], '#3f8f34'); R(g, 7, 1, 2, 3, '#2f6f24');
  },
  walderdbeere(g, b) {
    L(g, 8, 1, 5, 6, BLATT_D, 1); L(g, 8, 1, 11, 7, BLATT_D, 1); E(g, 9, 2, 2, 1.2, BLATT);
    for (const [x, y] of [[5, 9], [11, 10]]) {
      POLY(g, [[x - 2.5, y - 2], [x + 2.5, y - 2], [x, y + 3.5]], b.f); P(g, x - 1, y - 1, hell(b.f, 0.4)); P(g, x, y, '#f6e07a');
      R(g, x - 1, y - 3, 3, 1, '#3f8f34');
    }
  },
  traube(g, b) {
    L(g, 8, 1, 8, 4, HOLZ_D, 1); E(g, 10.5, 2.5, 2, 1.4, BLATT);
    for (const [x, y] of [[5, 6], [8, 6], [11, 6], [6.5, 9], [9.5, 9], [8, 12]]) kugel(g, x, y, 2, 2, b.f);
  },
  holunder(g, b) {
    L(g, 8, 1, 8, 5, '#8a3a4a', 1);
    for (const [x, y] of [[3, 8], [13, 8], [6, 12], [10, 12], [8, 9]]) L(g, 8, 5, x, y, '#8a3a4a', 1);
    for (const [x, y] of [[3, 8], [4, 10], [13, 8], [12, 10], [6, 12], [5, 13], [10, 12], [11, 13], [8, 9], [7, 10], [9, 10], [8, 12]]) { R(g, x, y, 2, 2, b.f); P(g, x, y, hell(b.f, 0.4)); }
  },
  hagebutte(g, b) {
    for (const [x, y] of [[5.5, 10], [10.5, 8]]) {
      E(g, x, y, 2.6, 3.4, b.f); E(g, x - 0.8, y - 1.2, 0.9, 1.2, hell(b.f, 0.45));
      P(g, Math.round(x) - 1, Math.round(y) - 4, '#3a2a1a'); P(g, Math.round(x), Math.round(y) - 4, '#3a2a1a');
    }
    L(g, 5, 6, 8, 2, HOLZ_D, 1); L(g, 10, 4, 8, 2, HOLZ_D, 1); E(g, 9, 1.5, 2, 1, BLATT);
  },
  pflaume(g, b) {
    kugel(g, 8, 9.5, 5, 5, b.f); E(g, 6, 7, 1.6, 2, mische(b.f, '#c8b8e8', 0.5));
    L(g, 8, 4, 9, 2, HOLZ_D, 1); E(g, 11, 2.5, 2, 1.2, BLATT);
  },
  sternfrucht(g, b) {
    stern(g, 8, 8.5, 7, 3.4, dunkel(b.f, 0.12)); stern(g, 7.6, 8, 5.8, 2.8, b.f);
    E(g, 6, 6.5, 1.5, 1, hell(b.f, 0.5)); P(g, 8, 8, dunkel(b.f, 0.3)); P(g, 8, 1, '#7a8a3a');
  },
  kirsche(g, b) {
    L(g, 9, 2, 5, 9, '#5a8a2a', 1); L(g, 9, 2, 11, 10, '#5a8a2a', 1); E(g, 11, 2, 2.4, 1.3, BLATT);
    kugel(g, 5, 11, 3, 3, b.f); kugel(g, 11, 12, 3, 3, dunkel(b.f, 0.08));
  },
  aprikose(g, b) {
    kugel(g, 8, 9, 5.6, 5.4, b.f); L(g, 9, 4, 10, 13, dunkel(b.f, 0.15), 1);
    E(g, 11, 10, 2, 2.4, mische(b.f, '#e8503a', 0.35)); L(g, 8, 4, 8, 2, HOLZ_D, 1); E(g, 10, 2, 2, 1.1, BLATT);
  },
  orange(g, b) {
    kugel(g, 8, 9.5, 5.8, 5.6, b.f);
    for (const [x, y] of [[6, 9], [9, 12], [11, 8], [7, 12], [10, 10]]) P(g, x, y, dunkel(b.f, 0.18));
    R(g, 7, 3, 2, 2, '#4a7a2a'); E(g, 11, 3, 2.6, 1.4, BLATT); P(g, 12, 2, BLATT_H);
  },
  pfirsich(g, b) {
    kugel(g, 8, 9.5, 5.8, 5.4, b.f); E(g, 10, 11, 3, 2.8, mische(b.f, '#e04a5a', 0.4));
    L(g, 8, 4, 7, 14, dunkel(b.f, 0.2), 1); E(g, 5, 7, 1.3, 1.7, hell(b.f, 0.5));
    L(g, 8, 4, 8, 2, HOLZ_D, 1); E(g, 5.5, 2.5, 2.4, 1.2, BLATT);
  },
  apfel(g, b) {
    kugel(g, 5.5, 9.5, 4, 4.8, b.f); kugel(g, 10.5, 9.5, 4, 4.8, b.f); kugel(g, 8, 10, 4.2, 4.8, b.f);
    E(g, 5, 8, 1.4, 2, hell(b.f, 0.5)); P(g, 8, 5, dunkel(b.f, 0.4));
    L(g, 8, 5, 9, 2, HOLZ_D, 1); E(g, 11, 2.5, 2.2, 1.2, BLATT);
  },
  granatapfel(g, b) {
    kugel(g, 8, 9.5, 5.8, 5.4, b.f);
    POLY(g, [[6, 4], [7, 2], [8, 3.5], [9, 2], [10, 4]], dunkel(b.f, 0.2));
    E(g, 6, 8, 1.6, 2, hell(b.f, 0.45)); for (const [x, y] of [[10, 12], [11, 9]]) P(g, x, y, mische(b.f, '#f0d080', 0.4));
  },
  kristallfrucht(g, b) {
    POLY(g, [[8, 1], [13, 6], [11, 14], [5, 14], [3, 6]], b.f);
    POLY(g, [[8, 1], [8, 14], [5, 14], [3, 6]], hell(b.f, 0.25)); L(g, 3, 6, 13, 6, dunkel(b.f, 0.15), 1);
    P(g, 6, 4, '#ffffff'); P(g, 5, 5, '#ffffff');
  },
  nuss(g, b) {
    kugel(g, 8, 10, 4.6, 4.2, b.f); E(g, 8, 6, 4, 2.4, '#8a7a4a'); R(g, 7, 2, 2, 3, '#6a5a3a');
    for (const x of [5, 7, 9, 11]) P(g, x, 8, '#6a5a2a');
  },

  // ─── Blumen ──────────────────────────────────────────────────────────────
  tulpe(g, b) {
    L(g, 8, 15, 8, 7, BLATT_D, 1); E(g, 5.5, 12, 1.6, 3, BLATT); E(g, 10.5, 12, 1.6, 3, BLATT);
    E(g, 8, 5, 3.3, 3.3, b.f); P(g, 5, 2, b.f); P(g, 8, 1, b.f); P(g, 11, 2, b.f); R(g, 6, 3, 1, 3, hell(b.f, 0.35));
  },
  bluete(g, b) {
    L(g, 8, 15, 8, 8, BLATT_D, 1); E(g, 10, 12, 2, 1.2, BLATT);
    for (const [x, y] of [[5, 5], [11, 5], [8, 2], [8, 8], [6, 3], [10, 3], [6, 7], [10, 7]]) E(g, x, y, 1.6, 1.6, b.f2);
    kugel(g, 8, 5, 2.2, 2.2, b.f);
  },
  kornblume(g, b) {
    L(g, 8, 15, 8, 9, BLATT_D, 1); L(g, 8, 12, 11, 10, BLATT, 1);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      L(g, 8, 6, Math.round(8 + Math.cos(a) * 5), Math.round(6 + Math.sin(a) * 4.5), i % 2 ? b.f : b.f2, 1);
    }
    E(g, 8, 6, 2.4, 2.2, b.f); P(g, 8, 6, dunkel(b.f, 0.5)); P(g, 7, 5, b.f2);
  },
  mohn(g, b) {
    L(g, 8, 15, 8, 9, '#5a8a3a', 1); L(g, 8, 13, 5, 11, '#6a9a4a', 1);
    E(g, 5.5, 6, 3.4, 3.4, dunkel(b.f, 0.12)); E(g, 10.5, 6, 3.4, 3.4, dunkel(b.f, 0.12)); E(g, 8, 4.5, 3.6, 3, b.f); E(g, 8, 7.5, 3.6, 2.4, b.f);
    E(g, 6.5, 4, 1.4, 1, hell(b.f, 0.35)); kugel(g, 8, 6, 1.7, 1.6, b.f2);
  },
  sonnenblume(g, b) {
    L(g, 9, 15, 9, 11, '#5a8a3a', 2); E(g, 12, 13, 2, 1.2, BLATT);
    bluetenkranz(g, 8, 6.5, 11, 4.4, 1.6, b.f);
    kugel(g, 8, 6.5, 3.1, 3.1, b.f2);
    for (const [x, y] of [[7, 6], [9, 7], [8, 5]]) P(g, x, y, dunkel(b.f2, 0.35));
  },
  sommerstern(g, b) {
    L(g, 8, 15, 8, 10, BLATT_D, 1); E(g, 5.5, 13, 2, 1, BLATT);
    stern(g, 8, 6.5, 6.4, 2.6, b.f); stern(g, 8, 6.5, 3.4, 1.4, hell(b.f, 0.3), Math.PI / 2);
    kugel(g, 8, 6.5, 1.6, 1.6, b.f2);
  },
  feenrose(g, b) {
    L(g, 8, 15, 8, 10, '#4a7a3a', 1); E(g, 10.5, 12.5, 2, 1.2, BLATT); P(g, 7, 12, '#4a7a3a');
    kugel(g, 8, 6.5, 5.6, 5, b.f);
    for (const [x0, y0, x1, y1] of [[4, 6, 7, 3], [12, 7, 9, 3], [5, 9, 10, 9], [6, 5, 10, 6]]) L(g, x0, y0, x1, y1, dunkel(b.f, 0.18), 1);
    E(g, 8, 6, 1.5, 1.2, b.f2); P(g, 3, 3, b.f2); P(g, 13, 2, b.f2); P(g, 13, 11, '#ffffff');
  },
  kamille(g, b) {
    L(g, 6, 15, 5, 9, BLATT_D, 1); L(g, 9, 15, 11, 6, BLATT_D, 1); for (const [x, y] of [[4, 12], [11, 11]]) P(g, x, y, BLATT);
    for (const [cx, cy, r] of [[5, 7, 3], [11, 4, 3]]) bluetenkranz(g, cx, cy, 7, r - 0.6, 1.1, b.f, b.f2, 1.3);
  },
  enzian(g, b) {
    L(g, 8, 15, 8, 10, BLATT_D, 1); E(g, 5.5, 13, 2.2, 1, BLATT); E(g, 10.5, 12, 2.2, 1, BLATT);
    POLY(g, [[4, 2], [12, 2], [10.5, 10], [5.5, 10]], b.f); POLY(g, [[4, 2], [6, 4], [8, 2], [10, 4], [12, 2], [12, 1], [4, 1]], b.f2);
    L(g, 6, 4, 7, 9, hell(b.f, 0.3), 1); L(g, 10, 5, 9, 9, dunkel(b.f, 0.3), 1);
  },
  edelweiss(g, b) {
    L(g, 8, 15, 8, 10, '#8a9a7a', 1);
    stern(g, 8, 7, 6.5, 2.4, b.f); stern(g, 8, 7, 6.5, 2.4, b.f, -Math.PI / 2 + Math.PI / 5);
    for (const [x, y] of [[7, 6], [9, 6], [8, 8]]) kugel(g, x, y, 1, 1, b.f2);
    P(g, 3, 5, '#d8d8c8'); P(g, 13, 9, '#d8d8c8');
  },

  // ─── Wildkräuter und Pilze ───────────────────────────────────────────────
  lauch(g) {
    R(g, 6, 6, 4, 9, '#f0f0d8'); R(g, 6, 6, 4, 3, '#c8e0a0'); R(g, 9, 6, 1, 9, '#d8d8c0');
    L(g, 7, 6, 4, 1, BLATT, 2); L(g, 9, 6, 12, 1, BLATT_D, 2);
    for (const x of [6, 8, 9]) P(g, x, 15, '#c8b890');
  },
  fruehlingszwiebel(g, b) {
    for (const [x0, x1] of [[6, 3], [8, 8], [9, 13]]) L(g, x0, 8, x1, 0, b.f2, 1);
    L(g, 7, 8, 5, 1, dunkel(b.f2, 0.15), 1);
    kugel(g, 7.5, 11, 2.8, 3, b.f); R(g, 6, 8, 3, 2, mische(b.f, b.f2, 0.4));
    for (const x of [6, 7, 8, 9]) P(g, x, 14 + (x % 2), '#c8b890');
  },
  baerlauch(g, b) {
    L(g, 8, 15, 8, 12, '#c8d8b0', 1);
    E(g, 5, 7, 2.2, 5.5, b.f); E(g, 11, 7, 2.2, 5.5, dunkel(b.f, 0.1)); E(g, 8, 6, 2, 5.5, hell(b.f, 0.1));
    L(g, 5, 3, 5, 11, dunkel(b.f, 0.25), 1); L(g, 11, 3, 11, 11, dunkel(b.f, 0.3), 1);
    for (const [x, y] of [[12, 2], [13, 3], [14, 2], [13, 1]]) P(g, x, y, b.f2);
  },
  farnspross(g, b) {
    L(g, 6, 15, 6, 7, b.f, 2);
    E(g, 8, 5, 4, 3.6, b.f); E(g, 8.5, 5, 2.4, 2, dunkel(b.f, 0.3)); E(g, 9, 5, 1.2, 1, hell(b.f, 0.35));
    L(g, 11, 13, 11, 9, dunkel(b.f, 0.1), 1); E(g, 12, 8, 1.6, 1.4, b.f);
    for (const [x, y] of [[5, 10], [7, 12], [5, 13]]) P(g, x, y, hell(b.f, 0.35));
  },
  stechpalme(g) {
    E(g, 5, 10, 4, 2.4, '#2a6a3a'); E(g, 11, 10, 4, 2.4, '#2f7a42');
    for (const [x, y] of [[1, 9], [3, 12], [6, 13], [9, 7], [13, 12], [15, 9]]) P(g, x, y, '#2a6a3a');
    kugel(g, 6.5, 6.5, 1.7, 1.7, '#d02030'); kugel(g, 9.5, 6, 1.7, 1.7, '#d02030'); kugel(g, 8, 8.5, 1.7, 1.7, '#d02030');
  },
  mistel(g, b) {
    L(g, 8, 1, 8, 5, '#8a6a3a', 1); L(g, 6, 1, 10, 1, '#c83a3a', 1);
    E(g, 4.5, 8, 3.6, 1.8, b.f); E(g, 11.5, 8, 3.6, 1.8, dunkel(b.f, 0.12)); E(g, 6, 11, 3, 1.6, dunkel(b.f, 0.06)); E(g, 10, 11.5, 3, 1.6, b.f);
    for (const [x, y] of [[7, 7], [9, 8], [8, 10]]) kugel(g, x, y, 1.4, 1.4, b.f2);
  },
  schneeyams(g, b) {
    E(g, 8, 12, 6.5, 2.5, '#f4f8fb');
    kugel(g, 8, 9, 5, 4, b.f); for (const [x, y] of [[6, 8], [10, 10], [8, 11]]) P(g, x, y, b.f2);
    E(g, 6, 5.5, 3.5, 1.4, '#ffffff'); P(g, 11, 6, '#ffffff');
  },
  pilz(g, b) {
    E(g, 8, 9, 6.5, 5.5, b.f);
    g.clearRect(0, 9, 16, 7);
    R(g, 6, 9, 4, 6, '#f0e8d8'); R(g, 9, 9, 1, 6, '#d8ccb8');
    R(g, 2, 8, 12, 1, dunkel(b.f, 0.3));
    E(g, 6, 5.5, 2, 1.2, hell(b.f, 0.45));
  },
  steinpilz(g, b) {
    E(g, 8, 13, 4.2, 2.6, '#e8dcc0'); R(g, 5, 8, 6, 5, '#e8dcc0'); R(g, 9, 8, 2, 6, '#cdbd9a');
    E(g, 8, 6.5, 6.6, 4.4, b.f); g.clearRect(0, 8, 16, 1); R(g, 3, 7, 10, 2, '#d8c890');
    E(g, 6, 4.5, 2.4, 1.2, hell(b.f, 0.35)); R(g, 5, 8, 6, 1, '#cdbd9a');
  },
  pfifferling(g, b) {
    POLY(g, [[2, 4], [14, 4], [10, 9], [9, 15], [7, 15], [6, 9]], b.f);
    E(g, 8, 4.5, 6, 1.6, hell(b.f, 0.25)); E(g, 8, 4.5, 4, 0.8, dunkel(b.f, 0.12));
    for (const x of [6, 8, 10]) L(g, x, 6, 8, 12, dunkel(b.f, 0.18), 1);
  },
  morchel(g, b) {
    R(g, 6, 11, 4, 4, '#ece0c8'); R(g, 9, 11, 1, 4, '#d0c4a8');
    E(g, 8, 6.5, 4, 5.5, b.f);
    for (const [x, y] of [[6, 4], [9, 3], [7, 7], [10, 6], [6, 9], [9, 9], [8, 5]]) { P(g, x, y, dunkel(b.f, 0.45)); P(g, x + 1, y, dunkel(b.f, 0.2)); }
    P(g, 7, 2, hell(b.f, 0.3));
  },
  fliegenpilz(g, b) {
    R(g, 6, 9, 4, 6, '#f4f0e4'); R(g, 9, 9, 1, 6, '#dcd4c4'); R(g, 5, 11, 6, 1, '#f4f0e4');
    E(g, 8, 8, 6.6, 5.4, b.f); g.clearRect(0, 9, 16, 1); R(g, 6, 9, 4, 1, '#f4f0e4');
    for (const [x, y] of [[5, 5], [9, 4], [11, 7], [7, 7], [3, 7]]) { P(g, x, y, '#ffffff'); P(g, x + 1, y, '#f0ece0'); }
  },

  // ─── Strand ──────────────────────────────────────────────────────────────
  muschel(g, b) {
    E(g, 8, 11, 6.5, 6, b.f);
    g.clearRect(0, 12, 16, 4);
    for (const x of [3, 5, 8, 11, 13]) L(g, 8, 12, x, 6, dunkel(b.f, 0.18), 1);
    R(g, 5, 12, 6, 2, dunkel(b.f, 0.3));
  },
  regenbogenmuschel(g, b) {
    E(g, 8, 11, 6.5, 6, b.f); g.clearRect(0, 12, 16, 4);
    const farben = ['#e86a8a', '#f2b24a', '#f2e05a', '#7ac86a', '#5aa8e0', '#9a7ae0'];
    farben.forEach((f, i) => L(g, 8, 12, 2 + i * 2.4, 6 + Math.abs(i - 2.5) * 0.8, f, 1));
    R(g, 5, 12, 6, 2, dunkel(b.f, 0.3)); P(g, 6, 7, '#ffffff');
  },
  herzmuschel(g, b) {
    kugel(g, 8, 9, 5.5, 5, b.f);
    for (const x of [5, 7, 9, 11]) L(g, x, 5, x, 13, dunkel(b.f, 0.2), 1);
    R(g, 6, 2, 4, 2, dunkel(b.f, 0.2));
  },
  koralle(g, b) {
    L(g, 8, 15, 8, 8, b.f, 2); L(g, 8, 10, 4, 5, b.f, 2); L(g, 8, 9, 12, 4, b.f, 2);
    L(g, 5, 7, 3, 2, hell(b.f, 0.2), 1); L(g, 11, 6, 13, 2, hell(b.f, 0.2), 1); L(g, 8, 8, 8, 3, b.f, 1);
  },
  seeigel(g, b) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      L(g, 8, 9, Math.round(8 + Math.cos(a) * 7), Math.round(9 + Math.sin(a) * 6), dunkel(b.f, 0.25), 1);
    }
    kugel(g, 8, 9, 4, 4, b.f);
  },
  nautilus(g, b) {
    kugel(g, 8, 8, 6.5, 6.5, b.f);
    for (let i = 0; i < 5; i++) L(g, 8, 8, 8 + Math.round(Math.cos(i * 1.1 + 0.5) * 6), 8 + Math.round(Math.sin(i * 1.1 + 0.5) * 6), b.f2, 1);
    E(g, 8.5, 8.5, 2.2, 2.2, dunkel(b.f, 0.35)); E(g, 9, 9, 1, 1, dunkel(b.f, 0.6));
  },

  // ─── Baumsamen ───────────────────────────────────────────────────────────
  eichel(g, b) {
    E(g, 8, 10, 3.8, 4.4, b.f); E(g, 7, 9, 1.2, 2, hell(b.f, 0.35)); P(g, 8, 14, dunkel(b.f, 0.4));
    E(g, 8, 6, 5, 2.6, '#7a5a3a'); for (const x of [5, 7, 9, 11]) P(g, x, 6, '#5a3e24'); for (const x of [6, 8, 10]) P(g, x, 5, '#9a7a52');
    L(g, 8, 3, 9, 1, '#5a3e24', 1);
  },
  ahornsamen(g, b) {
    kugel(g, 5, 11, 2.2, 2, dunkel(b.f, 0.2)); kugel(g, 11, 11, 2.2, 2, dunkel(b.f, 0.2));
    POLY(g, [[5, 10], [2, 2], [5, 1], [7, 9]], b.f); POLY(g, [[11, 10], [14, 2], [11, 1], [9, 9]], b.f);
    L(g, 4, 3, 6, 9, hell(b.f, 0.35), 1); L(g, 12, 3, 10, 9, hell(b.f, 0.35), 1);
  },
  kiefernzapfen(g, b) {
    E(g, 8, 8.5, 4.4, 6, b.f);
    for (let y = 4; y <= 13; y += 2) for (let x = 5 + (y % 4 ? 1 : 0); x <= 11; x += 2) { P(g, x, y, dunkel(b.f, 0.35)); P(g, x, y - 1, hell(b.f, 0.3)); }
    R(g, 7, 1, 2, 2, '#5a3e24');
  },
  mahagonisamen(g, b) {
    E(g, 8, 9.5, 4, 5, b.f); L(g, 8, 5, 8, 14, dunkel(b.f, 0.35), 1); E(g, 6.5, 8, 1, 2.5, hell(b.f, 0.35));
    POLY(g, [[8, 5], [11, 1], [12, 3]], '#c8a070');
  },
});
