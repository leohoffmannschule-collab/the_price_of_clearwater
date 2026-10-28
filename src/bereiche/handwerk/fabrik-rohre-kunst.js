// Bereich „handwerk" – Fabrik Stufe 2: Pixelkunst der Rohrleitungen und der Wasserpumpe. Ein Rohr verbindet sich im
// Bild mit seinen Nachbarn (Rohre beider Stufen, Pumpen, Kraftwerke: Maske aus fabrik-rohre.js), Mk1 in Stahlgrau
// mit blauen Ringen, Mk2 dicker in Kupfer. Fließt Wasser, wandern helle Pünktchen durch das Rohr (dezent), die
// Pumpe zeigt einen laufenden Kolben und eine Statuslampe. Winter: Reif auf dem Rohr.

import { objektKunst, P, R, hell, dunkel } from '../../sprites.js';
import { wasserSeite, rohrMaske, rohrFliesst } from './fabrik-rohre.js';
import { S } from '../../spiel.js';
import * as Logik from '../../logik.js';
import { STAHL, STAHL_H, STAHL_D, STAHL_DD } from './fabrik-kunst.js';

const winter = (k) => k?.jz === 'winter';
const zeit = (k) => k?.t || 0;
const FARBE = { 1: { f: '#8a96a4', ring: '#3f6f9a' }, 2: { f: '#c8743a', ring: '#7a3e1a' } };
const maskeVon = (k) => (k?.ort && k.tx != null ? rohrMaske(k.ort, k.tx, k.ty) : 0);

/** Rohrstück von der Mitte in Richtung i (0 oben, 1 rechts, 2 unten, 3 links); d = Dicke. */
function arm(g, i, d, f) {
  const a = 8 - d / 2;
  const h = hell(f, 0.45);
  const dd = dunkel(f, 0.4);
  if (i === 0 || i === 2) {
    const y0 = i === 0 ? 0 : 8;
    R(g, a, y0, d, 8, f); R(g, a, y0, 1, 8, h); R(g, a + d - 1, y0, 1, 8, dd);
  } else {
    const x0 = i === 3 ? 0 : 8;
    R(g, x0, a, 8, d, f); R(g, x0, a, 8, 1, h); R(g, x0, a + d - 1, 8, 1, dd);
  }
}
function ring(g, i, d, f) {
  const a = 8 - d / 2 - 1;
  if (i === 0) R(g, a, 2, d + 2, 2, f);
  else if (i === 2) R(g, a, 12, d + 2, 2, f);
  else if (i === 3) R(g, 2, a, 2, d + 2, f);
  else R(g, 12, a, 2, d + 2, f);
}

function rohrMalen(g, mk, m, schneit) {
  const { f, ring: rf } = FARBE[mk] ?? FARBE[1];
  const d = mk > 1 ? 8 : 6;
  const arme = [0, 1, 2, 3].filter((i) => m & (1 << i));
  // allein: ein waagerechtes Stück mit Kappen
  const zeigen = arme.length ? arme : [1, 3];
  for (const i of zeigen) arm(g, i, d, f);
  // Knoten in der Mitte
  const a = 8 - d / 2;
  R(g, a, a, d, d, f); R(g, a, a, d, 1, hell(f, 0.45)); R(g, a, a + d - 1, d, 1, dunkel(f, 0.4));
  if (arme.length !== 2 || (m !== 5 && m !== 10)) { R(g, a + 1, a + 1, d - 2, d - 2, dunkel(f, 0.12)); P(g, a + 1, a + 1, hell(f, 0.5)); }
  for (const i of zeigen) ring(g, i, d, rf);
  if (!arme.length) { R(g, 0, a, 1, d, STAHL_DD); R(g, 15, a, 1, d, STAHL_DD); }
  if (schneit) for (const i of zeigen) { if (i === 1 || i === 3) R(g, i === 3 ? 1 : 9, a, 6, 1, '#f4f8fb'); else R(g, a, i === 0 ? 1 : 9, 1, 5, '#f4f8fb'); }
}

objektKunst('rohrleitung', {
  b: 16, h: 16, tiefe: -14, wackeln: false,
  schluessel: (o, k) => `${o.mk || 1}:${maskeVon(k)}:${winter(k) ? 1 : 0}`,
  malen(g, o, k) { rohrMalen(g, o.mk || 1, maskeVon(k), winter(k)); },
  danach(g, o, lage, k) {
    const s = k?.s ?? S.s;
    if (!s || !k?.ort || k.tx == null || !rohrFliesst(s, k.ort, Logik.k(k.tx, k.ty))) return;
    // Fluss: helle Pünktchen wandern dezent die Arme entlang
    const m = maskeVon(k) || 10;
    const t = zeit(k);
    const ph = Math.floor(t * 10) % 8;
    g.fillStyle = '#c8f0ff';
    for (let i = 0; i < 4; i++) {
      if (!(m & (1 << i))) continue;
      for (const s of [ph, (ph + 4) % 8]) {
        const x = i === 1 ? 8 + s : i === 3 ? 7 - s : 7;
        const y = i === 2 ? 8 + s : i === 0 ? 7 - s : 7;
        g.fillRect(lage.x + x, lage.y + y, 1, 1);
      }
    }
  },
});

// ─── Wasserpumpe ────────────────────────────────────────────────────────────

const LED = { a: '#6ad06a', v: '#e8c050', x: '#7a7a82' };
objektKunst('wasserpumpe', {
  b: 16, h: 24,
  schatten: [6, 2, -1],
  schluessel: (o, k) => `${k?.ort && k.tx != null ? wasserSeite(k.ort.def, k.tx, k.ty) : 2}:${winter(k) ? 1 : 0}`,
  malen(g, o, k) {
    const seite = k?.ort && k.tx != null ? wasserSeite(k.ort.def, k.tx, k.ty) : 2;
    // Saugrohr zur Wasserseite
    const f = '#5a6a7a';
    if (seite === 2) R(g, 6, 18, 4, 6, f);
    else if (seite === 1) R(g, 12, 17, 4, 4, f);
    else if (seite === 3) R(g, 0, 17, 4, 4, f);
    else R(g, 6, 8, 4, 4, f);
    // Sockel und Gehäuse
    R(g, 2, 19, 12, 4, STAHL_D); R(g, 2, 19, 12, 1, STAHL_H);
    R(g, 3, 9, 10, 10, '#3f6f9a'); R(g, 3, 9, 10, 1, '#6a9ac8'); R(g, 3, 9, 1, 10, '#5a8ab8'); R(g, 12, 9, 1, 10, '#2a4a6a');
    R(g, 5, 12, 6, 4, '#1c2a38');
    // Motor oben mit Isolator fürs Kabel
    R(g, 4, 4, 8, 5, STAHL); R(g, 4, 4, 8, 1, STAHL_H); R(g, 11, 4, 1, 5, STAHL_D);
    for (let y = 5; y < 9; y += 2) R(g, 5, y, 6, 1, dunkel(STAHL, 0.2));
    R(g, 7, 1, 2, 3, '#e8f0e8'); R(g, 6, 2, 4, 1, '#b8d8c0');
    if (winter(k)) { R(g, 4, 3, 8, 1, '#f4f8fb'); R(g, 3, 8, 10, 1, '#f4f8fb'); }
  },
  danach(g, o, lage, k) {
    const t = zeit(k);
    const an = o.st === 'a';
    const hub = an ? (Math.sin(t * 10) > 0 ? 1 : 0) : 0;
    R(g, lage.x + 6, lage.y + 13 + hub, 4, 2, an ? '#8ad0f0' : '#3a5a7a');
    R(g, lage.x + 10, lage.y + 10, 2, 2, '#14141a');
    P(g, lage.x + 10, lage.y + 10, LED[o.st] ?? LED.x);
  },
});

