// Bereich „angeln" – Pixelkunst: Krebskorb (Gegenstand und im Wasser), Krebstiere und der Müll aus
// dem Wasser. Der Korb im Wasser wippt leicht, zeigt den Köder als Blase und den Fang über sich.

import { kunst, objektKunst, itemBild, P, R, E, L, POLY, kugel, hell, dunkel } from '../../sprites.js';
import { ITEMS } from '../../daten.js';

const SEIL = '#c8a870';
const auge = (g, x, y) => { P(g, x, y, '#141414'); };
const HOLZ = '#a8743a';

/** Der Korb: Holzrahmen mit Netz, `h` Pixel hoch ab `y0`. */
function korb(g, x0, y0, w, h) {
  R(g, x0, y0, w, h, '#5a3a1e');
  for (let y = y0 + 1; y < y0 + h - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) if ((x + y) % 2 === 0) P(g, x, y, '#c8b088');
  R(g, x0, y0, w, 1, hell(HOLZ, 0.15)); R(g, x0, y0 + h - 1, w, 1, dunkel(HOLZ, 0.2));
  R(g, x0, y0, 1, h, HOLZ); R(g, x0 + w - 1, y0, 1, h, dunkel(HOLZ, 0.25));
  R(g, x0 + Math.floor(w / 2), y0, 1, h, HOLZ);
}

kunst({
  krebskorb(g) {
    korb(g, 2, 6, 12, 8);
    E(g, 8, 10, 2, 1.6, '#3a2414'); // Eingang
    L(g, 8, 6, 8, 3, SEIL, 1); L(g, 8, 3, 12, 1, SEIL, 1);
    kugel(g, 12, 2.5, 1.6, 1.6, '#e04040'); P(g, 12, 3, '#ffffff');
  },
  // ─── Krebstiere ───────────────────────────────────────────────────────────
  krebs(g, b) {
    const f = b.f;
    for (const s of [-1, 1]) for (const [dx, dy] of [[4, 2], [5, 4], [4, 6]]) L(g, 8 + s * 3, 8 + dy - 2, 8 + s * (dx + 2), 8 + dy, dunkel(f, 0.15), 1);
    for (const s of [-1, 1]) { L(g, 8 + s * 3, 7, 8 + s * 5, 4, f, 1); kugel(g, 8 + s * 5.5, 3.5, 1.8, 1.5, f); P(g, Math.round(8 + s * 5.5), 2, dunkel(f, 0.4)); }
    kugel(g, 8, 8.5, 4.6, 3.3, f);
    E(g, 8, 10, 3.4, 1.4, b.f2);
    P(g, 6, 6, '#141414'); P(g, 10, 6, '#141414'); P(g, 6, 5, '#ffffff'); P(g, 10, 5, '#ffffff');
  },
  garnele(g, b) {
    const f = b.f;
    // gekrümmter Körper aus Segmenten
    const seg = [[4, 6, 2.4], [6, 5, 2.4], [8.5, 5, 2.3], [10.5, 6.5, 2], [11.5, 9, 1.8], [10.5, 11, 1.5]];
    for (const [x, y, r] of seg) kugel(g, x, y, r, r, f);
    for (const [x, y] of [[6, 5], [8, 5], [10, 6], [11, 8]]) P(g, x, y, dunkel(f, 0.2));
    POLY(g, [[9, 11], [7, 13.5], [10.5, 12.5], [12, 14]], b.f2);
    L(g, 3, 5, 1, 1, dunkel(f, 0.2), 1); L(g, 3, 6, 1, 3, dunkel(f, 0.2), 1);
    for (const x of [5, 7, 9]) L(g, x, 8, x - 1, 10, b.f2, 1);
    P(g, 3, 5, '#141414');
  },
  hummer(g, b) {
    const f = b.f;
    const r = b.f2;
    L(g, 6, 4, 2, 1, dunkel(f, 0.2), 1); L(g, 7, 4, 4, 1, dunkel(f, 0.2), 1);
    for (const s of [-1, 1]) {
      L(g, 8 + s * 2, 6, 8 + s * 4, 4, f, 1);
      kugel(g, 8 + s * 4.6, 3, 2, 2.2, f);
      P(g, Math.round(8 + s * 4.6), 1, r);
    }
    kugel(g, 8, 7, 2.6, 2.4, f);
    for (let i = 0; i < 4; i++) { E(g, 8, 9.6 + i * 1.3, 2.2 - i * 0.25, 1, i % 2 ? dunkel(f, 0.12) : f); }
    POLY(g, [[5.5, 14.5], [8, 12.5], [10.5, 14.5]], r);
    for (const s of [-1, 1]) for (const y of [8, 10]) P(g, 8 + s * 3, y, r);
    P(g, 7, 6, '#141414'); P(g, 9, 6, '#141414');
  },
  miesmuschel(g, b) {
    POLY(g, [[3, 12], [5, 4], [9, 2], [13, 4], [11, 10], [5, 13]], b.f);
    POLY(g, [[5, 11], [6, 5], [9, 3.5], [11, 5], [9, 9]], b.f2);
    for (const [x, y] of [[7, 5], [8, 7], [6, 9]]) P(g, x, y, hell(b.f2, 0.4));
    L(g, 4, 12, 10, 9, dunkel(b.f, 0.3), 1);
    L(g, 3, 13, 1, 14, '#c8b878', 1);
  },
  auster(g, b) {
    E(g, 8, 9, 6, 4.4, b.f);
    for (let i = 0; i < 4; i++) E(g, 8 - i * 0.4, 9 - i * 0.6, 5.4 - i * 1.2, 3.8 - i * 0.8, i % 2 ? hell(b.f, 0.12) : dunkel(b.f, 0.08));
    E(g, 8, 8.6, 3, 1.6, b.f2); E(g, 7.5, 8.3, 1.6, 0.9, hell(b.f2, 0.5));
    kugel(g, 9, 8.6, 1, 1, '#f8f4ff');
    P(g, 3, 12, dunkel(b.f, 0.3)); P(g, 12, 11, dunkel(b.f, 0.3));
  },
  flusskrebs(g, b) {
    const f = b.f;
    const d = dunkel(f, 0.25);
    // Fühler, Beine
    L(g, 4, 6, 1, 2, d, 1); L(g, 5, 6, 3, 1, d, 1);
    for (const x of [6, 8, 10]) L(g, x, 10, x - 1, 12, d, 1);
    // Schwanzfächer und Hinterleib (Segmente)
    POLY(g, [[12.5, 8], [14.8, 5.8], [14.8, 11.2]], b.f2);
    for (let i = 0; i < 4; i++) E(g, 8.6 + i * 1.3, 8.3, 1, 1.9 - i * 0.15, i % 2 ? dunkel(f, 0.1) : f);
    // Panzer
    kugel(g, 6, 8, 2.8, 2.2, f);
    L(g, 4, 7, 8, 7, hell(f, 0.3), 1);
    // große Schere nach vorne
    L(g, 4, 10, 2, 11, f, 1);
    kugel(g, 2.5, 12.3, 1.6, 1.3, f);
    P(g, 1, 11, b.f2); P(g, 1, 13, dunkel(f, 0.2));
    auge(g, 4, 6);
  },
  schnecke(g, b) {
    // Körper unten, Haus mit Spirale
    R(g, 2, 12, 12, 2, b.f2); L(g, 2, 12, 1, 9, b.f2, 1); P(g, 1, 8, '#3a2a1a'); L(g, 3, 12, 3, 10, b.f2, 1); P(g, 3, 9, '#3a2a1a');
    kugel(g, 9, 8, 5, 4.6, b.f);
    const sp = [[9, 8], [10, 8], [10, 7], [9, 6], [8, 6], [7, 7], [7, 8], [7, 9], [8, 10], [10, 10], [11, 9], [12, 7]];
    for (const [x, y] of sp) P(g, x, y, dunkel(b.f, 0.35));
    P(g, 8, 5, hell(b.f, 0.4)); P(g, 7, 6, hell(b.f, 0.3));
  },
  // ─── Müll ─────────────────────────────────────────────────────────────────
  zeitung(g) {
    POLY(g, [[2, 5], [12, 3], [14, 11], [4, 13]], '#d8d0b8');
    POLY(g, [[2, 5], [8, 4], [9, 12], [4, 13]], '#c8c0a4');
    for (const y of [6, 8, 10]) L(g, 4, y + 0.5, 7, y, '#8a8478', 1);
    for (const y of [5, 7, 9]) L(g, 10, y, 12, y - 0.3, '#8a8478', 1);
    R(g, 10, 9, 2, 2, '#a89a80');
    for (const [x, y] of [[5, 11], [11, 6], [6, 7]]) P(g, x, y, '#9ab0b8');
  },
  brille(g) {
    for (const cx of [4.5, 11]) { E(g, cx, 9, 3, 2.6, '#2a2a30'); E(g, cx, 9, 2, 1.6, '#a8c8d8'); P(g, Math.round(cx - 1), 8, '#ffffff'); }
    L(g, 7, 8, 9, 9, '#2a2a30', 1);
    L(g, 1, 8, 1, 4, '#2a2a30', 1); L(g, 14, 8, 13, 13, '#2a2a30', 1);
    L(g, 10, 7, 12, 11, '#e8f0f4', 1);
  },
  gruenalgen(g) {
    for (const [x0, f] of [[4, '#3a7a2a'], [7, '#5aa03a'], [10, '#2a6a3a'], [12, '#6ab04a']]) {
      for (let y = 2; y < 14; y++) P(g, x0 + Math.round(Math.sin(y * 0.8 + x0) * 1.3), y, f);
      for (let y = 4; y < 13; y += 3) P(g, x0 + 1 + Math.round(Math.sin(y * 0.8 + x0) * 1.3), y, hell(f, 0.3));
    }
    R(g, 3, 13, 11, 1, '#2a5a2a');
  },
});

// ─── Der Korb im Wasser ─────────────────────────────────────────────────────

const zustandVon = (o) => (o.fang ? 'voll' : o.koeder ? 'koeder' : 'leer');

objektKunst('krebskorb', {
  b: 16, h: 20,
  schluessel: (o) => zustandVon(o),
  schatten: null,
  umriss: false,
  malen(g, o) {
    const U = '#2b1d1c';
    // Seil und Schwimmer (eigener Umriss, weil der Korb zum Teil unter Wasser liegt)
    L(g, 8, 8, 9, 6, U, 2); L(g, 9, 6, 11, 5, U, 2);
    E(g, 12, 4.5, 2.9, 2.9, U);
    L(g, 8, 8, 9, 6, SEIL, 1); L(g, 9, 6, 11, 5, SEIL, 1);
    kugel(g, 12, 4.5, 2, 2, '#e04040'); R(g, 10, 4, 4, 1, '#ffffff');
    // über Wasser: Oberkante des Korbs mit Umriss
    R(g, 1, 7, 14, 7, U);
    korb(g, 2, 8, 12, 9);
    g.clearRect(0, 14, 16, 6);
    if (o.koeder) { P(g, 6, 10, '#e88a9a'); P(g, 7, 11, '#d87a8a'); P(g, 10, 10, '#e88a9a'); }
    if (o.fang) { P(g, 5, 10, '#d8583a'); P(g, 10, 11, '#d8583a'); P(g, 11, 10, '#f0a070'); }
    // unter Wasser: nur ein Schimmer
    g.globalAlpha = 0.28;
    R(g, 2, 14, 12, 4, '#3a2414');
    for (let y = 14; y < 18; y++) for (let x = 3; x < 13; x++) if ((x + y) % 2 === 0) P(g, x, y, '#c8b088');
    g.globalAlpha = 0.75;
    R(g, 1, 14, 14, 1, '#e8f8ff');
    g.globalAlpha = 1;
  },
  /** Leicht wippen; jeder Korb in eigenem Takt. */
  versatz(o, k) { return [0, Math.round(Math.sin((k.t ?? 0) * 2.2 + k.tx * 1.7 + k.ty) * 0.7)]; },
  wackeln: false,
  /** Wellenringe und – sobald etwas drin ist – der Fang in einer Blase über dem Korb. */
  danach(g, o, { bx, by }, k) {
    const t = k.t ?? 0;
    g.fillStyle = '#e8f8ff';
    g.globalAlpha = 0.55 + Math.sin(t * 3 + k.tx) * 0.25;
    const w = 7 + Math.round((Math.sin(t * 1.6 + k.tx) + 1) * 0.8);
    g.fillRect(Math.round(bx - w), Math.round(by - 3), 2, 1);
    g.fillRect(Math.round(bx + w - 2), Math.round(by - 3), 2, 1);
    g.globalAlpha = 1;
    if (!o.fang || !ITEMS[o.fang]) return;
    const hoch = Math.round(Math.sin(t * 2.5) * 1.5);
    const x = Math.round(bx - 9);
    const y = Math.round(by - 40 + hoch);
    g.fillStyle = '#2b1d1c';
    g.fillRect(x, y, 18, 18);
    g.fillRect(x + 8, y + 18, 3, 2);
    g.fillStyle = '#fbf6e8';
    g.fillRect(x + 1, y + 1, 16, 16);
    g.fillRect(x + 9, y + 17, 1, 2);
    g.drawImage(itemBild({ id: o.fang }), x + 1, y + 1);
  },
});
