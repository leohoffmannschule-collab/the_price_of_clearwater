// Bereich „handwerk" – Pixelkunst der Fischfarm: ein Holzgehege (Netzkasten) mit Wasser darin,
// als Gegenstand im Rucksack und aufgestellt am Ufer. Dezent animiert: Wellenringe, ab und zu
// springt ein Karpfen; mit Vorrat schwimmen mehr Fische darin und eine Blase „!" steht darüber.
// Winter: Schnee auf dem Holz, Eis auf dem Wasser (kein Springen, keine Wellen).
// Das Bild selbst ist gecacht (Jahreszeit steckt im Schlüssel des Kerns); nur `danach` läuft
// jedes Bild und zeichnet einfache Formen.

import { kunst, objektKunst, P, R, mische, hell, dunkel } from '../../sprites.js';
import { blase } from '../../render.js';

const WASSER = '#3f8fb4';
const WASSER_H = '#74c0d8';
const EIS = '#cfe4f0';

/** Das Gehege, 16×16: Pfosten und Bohlen aus Holz, innen Wasser mit Netzmaschen. */
function farm(g, winter) {
  R(g, 1, 3, 14, 12, '#6e4626');
  // Pfosten links und rechts
  R(g, 1, 2, 2, 13, '#8a5a32'); R(g, 1, 2, 1, 13, '#b07a48');
  R(g, 13, 2, 2, 13, '#8a5a32'); R(g, 13, 2, 1, 13, '#a87848');
  // hintere Bohle
  R(g, 3, 2, 10, 3, '#b07a48'); R(g, 3, 2, 10, 1, '#c8925a'); R(g, 3, 4, 10, 1, '#7a5028');
  // Wasser
  R(g, 3, 5, 10, 6, WASSER);
  R(g, 3, 5, 10, 1, dunkel(WASSER, 0.25));
  for (const [x, y] of [[4, 7], [5, 7], [9, 9], [10, 9], [7, 6]]) P(g, x, y, WASSER_H);
  // Netzmaschen
  const netz = mische(WASSER, '#ffffff', 0.4);
  for (let x = 4; x <= 12; x += 3) for (let y = 5; y <= 10; y++) P(g, x, y, netz);
  for (let y = 7; y <= 10; y += 3) for (let x = 3; x <= 12; x++) if (x % 3 !== 1) P(g, x, y, netz);
  // vordere Bohle mit Nägeln
  R(g, 1, 11, 14, 4, '#9a6a3a'); R(g, 1, 11, 14, 1, '#c8925a'); R(g, 1, 14, 14, 1, '#5a3a1a');
  R(g, 5, 12, 1, 2, '#7a5028'); R(g, 10, 12, 1, 2, '#7a5028');
  P(g, 2, 12, '#e8d8b0'); P(g, 13, 12, '#e8d8b0');
  if (winter) {
    R(g, 3, 5, 10, 2, EIS); R(g, 4, 7, 4, 1, EIS); P(g, 10, 8, EIS); P(g, 11, 9, EIS);
    R(g, 0, 1, 4, 2, '#f4f8fb'); R(g, 12, 1, 4, 2, '#f4f8fb'); R(g, 3, 1, 10, 1, '#f4f8fb');
    R(g, 1, 11, 14, 1, '#f4f8fb'); R(g, 3, 5, 10, 1, hell(EIS, 0.6));
  }
}

kunst('fischfarm', (g) => farm(g, false));

// ─── Animation (danach): nur Rechtecke ──────────────────────────────────────

const FISCH = '#d49a3a';
const FISCH_D = '#8a5a22';

/** Kleiner Karpfen, 4 breit, schaut nach rechts. */
function fisch(g, x, y, f = FISCH) {
  R(g, x, y, 3, 2, f); P(g, x + 3, y, f); P(g, x - 1, y - 1, f); P(g, x - 1, y + 1, f);
  P(g, x + 2, y, '#2b1d1c'); P(g, x, y + 1, hell(f, 0.4));
}

function bewegung(g, o, { x, y, bx }, k) {
  const winter = k.jz === 'winter';
  const wx = x + 3;
  const wy = y + 5;
  const t = (k.t || 0) + (k.tx || 0) * 0.73 + (k.ty || 0) * 1.31;
  const vorrat = Number(o.fisch) > 0 ? Number(o.fisch) : 0;

  // Fische im Wasser: mit Vorrat mehr (bis drei), im Winter still unter dem Eis
  const anzahl = vorrat > 0 ? Math.min(3, 1 + Math.floor(vorrat / 200)) : 1;
  for (let i = 0; i < anzahl; i++) {
    const lauf = winter ? 0.5 : (Math.sin(t * 0.6 + i * 2.1) + 1) / 2;
    const fx = wx + 2 + Math.round(lauf * 5);
    const fy = wy + 1 + i * 2;
    if (winter) {
      if (vorrat > 0) { g.globalAlpha = 0.6; R(g, fx - 1, fy + 1, 4, 1, FISCH_D); g.globalAlpha = 1; }
    } else if (vorrat > 0 || i === 0) {
      g.globalAlpha = vorrat > 0 ? 1 : 0.55;
      fisch(g, fx, fy, vorrat > 0 ? FISCH : FISCH_D);
      g.globalAlpha = 1;
    }
  }

  if (!winter) {
    // Wellenring: wächst und verblasst
    const p = (t * 0.45) % 1;
    const r = 1 + Math.round(p * 2);
    const cx = wx + 7;
    const cy = wy + 3;
    g.globalAlpha = (1 - p) * 0.85;
    g.fillStyle = '#d8eefa';
    for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r + 1], [0, r - 1]]) g.fillRect(cx + dx, cy + dy, 1, 1);
    g.globalAlpha = 1;

    // ab und zu springt ein Karpfen im Bogen (alle sechs Sekunden eine knappe halbe Sekunde)
    const u = (t % 6) / 6;
    if (u < 0.09) {
      const j = u / 0.09;
      const hoch = Math.round(Math.sin(j * Math.PI) * 6);
      const jx = wx + 2 + Math.round(j * 5);
      fisch(g, jx, wy + 3 - hoch);
      if (j < 0.25 || j > 0.75) { P(g, jx - 1, wy + 4, '#ffffff'); P(g, jx + 4, wy + 4, '#ffffff'); }
    }
  }

  if (vorrat > 0) blase(g, bx, y - 3 + Math.round(Math.sin(t * 3)), '!');
}

objektKunst('fischfarm', {
  b: 16, h: 16,
  schluessel: () => 'farm',
  malen(g, o, k) { farm(g, k.jz === 'winter'); },
  schatten: [7, 2, -1],
  danach: bewegung,
});
