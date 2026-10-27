// Bereich „handwerk" – Fabrik: Pixelkunst der Objekte auf der Karte. Förderband in vier Richtungen mit laufenden
// Rollen und Kurven (das Bild folgt den Nachbarn: `kv` im Objekt), Waren als kleine Symbole auf dem Band, Splitter,
// Zusammenführer, Vorkommen je Erz (die Reinheit sieht man an Menge, Größe und Punkten), Erzbohrer (Bohrkopf dreht
// sich), Schmelzer (Glut, Rauch), Konstrukteur (Presse), Assembler (Arme), Lager (Füllanzeige). Eine LED zeigt den
// Status (grün arbeitet, gelb wartet, rot Ausgang voll). Winter: Schnee auf den Kanten.
// Statisches wird gecacht (Schlüssel), nur `danach` läuft jedes Bild und zeichnet einfache Formen.

import { objektKunst, P, R, E, L as LINIE, mische, hell, dunkel } from '../../sprites.js';
import { SORTEN } from './fabrik-daten.js';
import { STAHL, STAHL_H, STAHL_D, STAHL_DD, GELB, ORANGE, Pr, platte, anschluesse, schnee, miniBild } from './fabrik-kunst.js';

const winter = (k) => k?.jz === 'winter';
const zeit = (k) => k?.t || 0;

// ─── Förderband ─────────────────────────────────────────────────────────────

/** Walzenstreifen: Lage s entlang des Wegs, frame = Verschiebung (4 Bilder, 4 Pixel Abstand). */
function walze(s, frame) {
  const m = (((s - frame) % 4) + 4) % 4;
  return m < 1 ? '#555a65' : m < 2 ? '#41454f' : '#34373f';
}

/** Band in „vorn = oben"-Koordinaten, dann um r gedreht. kv: 0 gerade, −1 Kurve von links, +1 Kurve von rechts. */
function bandFlaeche(g, r, kv, frame, schneit) {
  const spiegel = kv > 0;
  const f = (x, y, c) => Pr(g, 16, r, spiegel ? 15 - x : x, y, c);
  if (!kv) {
    for (let y = 0; y < 16; y++) {
      const c = walze(15 - y, frame);
      for (let x = 2; x < 14; x++) f(x, y, c);
      f(0, y, '#a9b0bb'); f(1, y, STAHL); f(14, y, STAHL_D); f(15, y, STAHL_DD);
    }
    for (const y of [3, 11]) { f(0, y, STAHL_D); f(15, y, STAHL_D); }
    for (const [x, y] of [[7, 6], [8, 6], [6, 7], [9, 7], [5, 8], [10, 8]]) f(x, y, '#8a7a3a');
  } else {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x + 0.5, y + 0.5);
        if (d < 2) f(x, y, x + y === 0 ? '#a9b0bb' : STAHL);
        else if (d <= 14) f(x, y, walze((Math.PI / 2 - Math.atan2(y + 0.5, x + 0.5)) * 8, frame));
        else if (d < 15) f(x, y, STAHL_D);
        else if (d < 16.2) f(x, y, STAHL_DD);
      }
    }
    for (const [x, y] of [[7, 3], [8, 3], [6, 4], [9, 4], [5, 5], [10, 5]]) f(x, y, '#8a7a3a');
  }
  if (schneit) for (const [x, y] of [[0, 1], [0, 6], [0, 12], [1, 9], [14, 4], [15, 10], [15, 14]]) if (!kv || x + y > 3) f(x, y, '#f4f8fb');
}

/** Lage einer Ware (0..1) im Feld, in Pixeln 0..16; Kurven laufen auf einem Viertelkreis. */
export function bandPosition(r, kv, p) {
  let x;
  let y;
  if (!kv) { x = 8; y = 16 * (1 - p); } else {
    const th = (Math.PI / 2) * (1 - p);
    x = 8 * Math.cos(th);
    y = 8 * Math.sin(th);
    if (kv > 0) x = 16 - x;
  }
  switch (r | 0) {
    case 1: return [16 - y, x];
    case 2: return [16 - x, 16 - y];
    case 3: return [y, 16 - x];
    default: return [x, y];
  }
}

function warenZeichnen(g, lage, o, liste) {
  for (const e of liste) {
    const [cx, cy] = bandPosition(o.r, o.kv || 0, e.p);
    g.drawImage(miniBild(e.id), Math.round(lage.x + cx - 3), Math.round(lage.y + cy - 3));
  }
}

objektKunst('foerderband', {
  b: 16, h: 16, umriss: false, tiefe: -15, wackeln: false,
  schluessel: (o, k) => `${o.r | 0}:${o.kv || 0}:${Math.floor(zeit(k) * 24) % 4}:${winter(k) ? 1 : 0}`,
  malen(g, o, k) { bandFlaeche(g, o.r | 0, o.kv || 0, Math.floor(zeit(k) * 24) % 4, winter(k)); },
  danach(g, o, lage) { if (o.w?.length) warenZeichnen(g, lage, o, o.w); },
});

// ─── Splitter und Zusammenführer ────────────────────────────────────────────

function teilerKoerper(g, o, k, farbe, seiten) {
  R(g, 1, 1, 14, 14, farbe);
  R(g, 1, 1, 14, 1, hell(farbe, 0.4)); R(g, 1, 1, 1, 14, hell(farbe, 0.25));
  R(g, 1, 14, 14, 1, dunkel(farbe, 0.45)); R(g, 14, 1, 1, 14, dunkel(farbe, 0.35));
  R(g, 5, 5, 6, 6, STAHL_DD); R(g, 6, 6, 4, 4, dunkel(farbe, 0.2));
  anschluesse(g, 16, o.r | 0, 1, { seiten });
  if (winter(k)) R(g, 2, 1, 12, 1, '#f4f8fb');
}
const teilerDanach = (g, o, lage) => { if (o.pf) g.drawImage(miniBild(o.pf.id), lage.x + 5, lage.y + 5); };
objektKunst('splitter', {
  b: 16, h: 16, tiefe: -8,
  schluessel: (o, k) => `${o.r | 0}:${winter(k) ? 1 : 0}`,
  malen: (g, o, k) => teilerKoerper(g, o, k, '#c8803a', ['aus', 'aus', 'ein', 'aus']),
  danach: teilerDanach,
});
objektKunst('zusammenfuehrer', {
  b: 16, h: 16, tiefe: -8,
  schluessel: (o, k) => `${o.r | 0}:${winter(k) ? 1 : 0}`,
  malen: (g, o, k) => teilerKoerper(g, o, k, '#3a8ea8', ['aus', 'ein', 'ein', 'ein']),
  danach: teilerDanach,
});

// ─── Vorkommen ──────────────────────────────────────────────────────────────

const BROCKEN = [[11, 12], [17, 10], [8, 17], [14, 15], [20, 15], [11, 21], [18, 20], [23, 19], [14, 8]];

function brocken(g, x, y, s, f) {
  R(g, x, y, s, s, dunkel(f, 0.3));
  R(g, x, y, s - 1, s - 1, f);
  P(g, x, y, hell(f, 0.6));
}

/** 2×2-Vorkommen: Felshügel mit Erzbrocken. Unrein: wenige, kleine, matte; normal: mittel; rein: viele, große, leuchtende. */
function vorkommenBild(g, erz, rein, schneit) {
  const f = SORTEN[erz]?.farbe ?? '#a8a29a';
  E(g, 16, 22, 14.5, 9, '#4d463e');
  E(g, 16, 20.5, 13.5, 8, '#6b6258');
  E(g, 13, 17.5, 9, 4.5, '#857a6c');
  for (const [x, y] of [[5, 23], [26, 22], [9, 27], [22, 27]]) { R(g, x, y, 3, 2, '#857a6c'); P(g, x, y, '#a89c8c'); }
  const n = rein < 1 ? 4 : rein > 1 ? 9 : 6;
  const gr = rein < 1 ? 2 : rein > 1 ? 4 : 3;
  const farbe = rein < 1 ? mische(f, '#6b6258', 0.28) : rein > 1 ? hell(f, 0.15) : f;
  for (let i = 0; i < n; i++) brocken(g, BROCKEN[i][0], BROCKEN[i][1], gr, farbe);
  // Reinheitspunkte unten: 1 (unrein), 2 (normal), 3 (rein)
  const punkte = rein < 1 ? 1 : rein > 1 ? 3 : 2;
  for (let i = 0; i < 3; i++) {
    const x = 11 + i * 4;
    R(g, x, 28, 3, 3, i < punkte ? hell(f, 0.35) : '#3a352f');
    if (i < punkte) P(g, x, 28, '#ffffff');
  }
  if (schneit) { R(g, 10, 13, 8, 2, '#f4f8fb'); R(g, 7, 15, 4, 1, '#e4ebf1'); R(g, 21, 14, 5, 2, '#f4f8fb'); }
}

objektKunst('vorkommen', {
  b: 32, h: 32,
  schatten: [13, 3, -2],
  schluessel: (o, k) => `${o.erz}:${o.rein ?? 1}:${winter(k) ? 1 : 0}`,
  malen: (g, o, k) => vorkommenBild(g, o.erz, o.rein ?? 1, winter(k)),
  danach(g, o, lage, k) {
    if ((o.rein ?? 1) <= 1) return;
    // reine Vorkommen funkeln
    const t = zeit(k) * 1.5;
    for (let i = 0; i < 3; i++) {
      const ph = (t + i * 0.37) % 1;
      if (ph > 0.25) continue;
      const [x, y] = BROCKEN[(i * 3 + Math.floor(t)) % 9];
      P(g, lage.x + x + 1, lage.y + y - 1, '#ffffff');
      P(g, lage.x + x, lage.y + y, '#ffffff');
    }
  },
});

// ─── Maschinen ──────────────────────────────────────────────────────────────

const LED = { a: '#6ad06a', e: '#e8c050', v: '#e84a3a', x: '#7a7a82' };
function led(g, lage, N, o) {
  R(g, lage.x + N - 8, lage.y + 4, 4, 4, '#1c1c22');
  R(g, lage.x + N - 7, lage.y + 5, 2, 2, LED[o.st] ?? LED.e);
}

function maschinenObjekt(typ, N, { koerper, danach }) {
  const n = N / 16;
  objektKunst(typ, {
    b: N, h: N,
    schatten: [N / 2 - 3, 3, -1],
    schluessel: (o, k) => `${o.r | 0}:${winter(k) ? 1 : 0}:${o.erz ?? ''}`,
    malen(g, o, k) {
      koerper(g, o, k, N);
      anschluesse(g, N, o.r | 0, n, typ === 'erzbohrer' ? { seiten: ['aus', null, null, null] } : undefined);
      if (winter(k)) schnee(g, N);
    },
    danach(g, o, lage, k) {
      danach?.(g, o, lage, k, N);
      if (typ !== 'lager') led(g, lage, N, o);
    },
  });
}

const arbeitet = (o) => o.st === 'a';

maschinenObjekt('erzbohrer', 32, {
  koerper(g, o) {
    platte(g, 32, '#6b6f7a');
    const erz = SORTEN[o.erz]?.farbe ?? STAHL;
    E(g, 16, 16, 10, 10, dunkel(STAHL_D, 0.4)); E(g, 16, 16, 9, 9, mische(STAHL, erz, 0.35));
    E(g, 16, 16, 7, 7, STAHL_DD); E(g, 16, 16, 6, 6, '#1c1c22');
    for (let a = 0; a < 8; a++) P(g, Math.round(16 + Math.cos((a * Math.PI) / 4) * 8.5) - 0, Math.round(16 + Math.sin((a * Math.PI) / 4) * 8.5), STAHL_H);
    R(g, 4, 25, 6, 3, STAHL); R(g, 4, 25, 6, 1, STAHL_H); // Schlauchanschluss
  },
  danach(g, o, lage, k) {
    const cx = lage.x + 16;
    const cy = lage.y + 16;
    const ph = arbeitet(o) ? Math.floor(zeit(k) * 12) % 4 : 0;
    const f = '#d8dce2';
    if (ph % 2 === 0) { R(g, cx - 5, cy - 1, 10, 2, f); R(g, cx - 1, cy - 5, 2, 10, f); } else {
      LINIE(g, cx - 4, cy - 4, cx + 4, cy + 4, f, 2); LINIE(g, cx + 4, cy - 4, cx - 4, cy + 4, f, 2);
    }
    R(g, cx - 1, cy - 1, 2, 2, ORANGE);
    if (arbeitet(o) && ph === 1) P(g, cx + 6, cy + 5, '#c8b898');
  },
});

maschinenObjekt('schmelzer', 32, {
  koerper(g) {
    platte(g, 32, '#6a4e44');
    R(g, 5, 8, 22, 19, '#7a4e3a'); R(g, 5, 8, 22, 2, '#a8705a'); R(g, 5, 25, 22, 2, '#4a2e22'); R(g, 25, 8, 2, 19, '#5a3a2a');
    for (let y = 12; y < 25; y += 4) R(g, 5, y, 22, 1, '#5a3a2a');
    R(g, 20, 3, 6, 6, STAHL_D); R(g, 20, 3, 6, 1, STAHL); R(g, 19, 2, 8, 2, STAHL_DD);
    R(g, 9, 14, 14, 9, '#1c0e0a'); R(g, 9, 14, 14, 1, '#6a6a74');
  },
  danach(g, o, lage, k) {
    const t = zeit(k);
    if (arbeitet(o)) {
      const fl = Math.sin(t * 9) > 0;
      R(g, lage.x + 11, lage.y + 17, 10, 5, fl ? ORANGE : '#d85a1a');
      R(g, lage.x + 13, lage.y + 17, 6, 2, GELB);
      P(g, lage.x + 12 + Math.floor(t * 5) % 7, lage.y + 16, '#f6c04a');
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.5 + i / 3) % 1;
        g.save();
        g.globalAlpha = 0.8 * (1 - p);
        g.fillStyle = k.nacht ? '#9aa0ac' : '#d8d8dc';
        const r = 1 + Math.round(p * 2);
        g.fillRect(Math.round(lage.x + 22 + Math.sin((t + i * 2) * 1.7) * 1.5 + p * 2), Math.round(lage.y + 1 - p * 9), r * 2, r * 2);
        g.restore();
      }
    } else R(g, lage.x + 11, lage.y + 19, 10, 3, '#4a1a10');
  },
});

maschinenObjekt('konstrukteur', 32, {
  koerper(g) {
    platte(g, 32, '#4a6a8a');
    R(g, 5, 5, 22, 22, '#35506f'); R(g, 5, 5, 22, 1, '#6a8aaa'); R(g, 5, 26, 22, 1, '#22364d');
    R(g, 10, 20, 12, 6, STAHL_DD); R(g, 10, 20, 12, 1, STAHL_D);
    R(g, 7, 7, 4, 3, GELB); R(g, 21, 7, 4, 3, ORANGE);
  },
  danach(g, o, lage, k) {
    const off = arbeitet(o) ? (Math.sin(zeit(k) * 8) > 0 ? 4 : 0) : 0;
    R(g, lage.x + 15, lage.y + 8, 2, 8 + off, STAHL);
    R(g, lage.x + 11, lage.y + 14 + off, 10, 4, STAHL_H); R(g, lage.x + 11, lage.y + 17 + off, 10, 1, STAHL_D);
  },
});

maschinenObjekt('assembler', 48, {
  koerper(g) {
    platte(g, 48, '#5a4a7a');
    R(g, 5, 5, 38, 38, '#403458'); R(g, 5, 5, 38, 1, '#7a6aa0'); R(g, 5, 42, 38, 1, '#2a2240');
    E(g, 24, 28, 11, 8, dunkel(STAHL_D, 0.2)); E(g, 24, 27, 10, 7, STAHL); E(g, 24, 27, 5, 3.5, STAHL_DD);
    R(g, 8, 8, 6, 6, STAHL_D); R(g, 34, 8, 6, 6, STAHL_D); R(g, 9, 9, 4, 4, ORANGE); R(g, 35, 9, 4, 4, ORANGE);
  },
  danach(g, o, lage, k) {
    const t = zeit(k);
    const an = arbeitet(o);
    for (const [bx, bf] of [[11, 0], [37, 2.1]]) {
      const w = an ? Math.sin(t * 3 + bf) : -0.4;
      const tx = 24 + Math.round(w * 7) + (bx < 24 ? -2 : 2);
      const ty = 24 + Math.round(Math.cos(t * 3 + bf) * (an ? 4 : 1));
      LINIE(g, lage.x + bx, lage.y + 11, lage.x + (bx + tx) / 2, lage.y + (11 + ty) / 2 - 3, STAHL_H, 2);
      LINIE(g, lage.x + (bx + tx) / 2, lage.y + (11 + ty) / 2 - 3, lage.x + tx, lage.y + ty, STAHL, 2);
      R(g, lage.x + tx - 1, lage.y + ty - 1, 3, 3, GELB);
    }
  },
});

maschinenObjekt('lager', 32, {
  koerper(g) {
    platte(g, 32, '#6a5a44');
    R(g, 4, 4, 24, 24, '#9a6a3a'); R(g, 4, 4, 24, 2, '#c8925a'); R(g, 4, 26, 24, 2, '#5a3a1a'); R(g, 26, 4, 2, 24, '#7a5028');
    for (const y of [10, 16, 22]) R(g, 4, y, 24, 1, '#5a3a1a');
    for (const x of [4, 14, 24]) R(g, x, 4, 4, 24, STAHL_D);
    R(g, 13, 13, 6, 5, GELB); P(g, 15, 15, '#7a5a1a'); P(g, 16, 15, '#7a5a1a');
  },
  danach(g, o, lage) {
    const belegt = (o.inv || []).filter(Boolean).length;
    R(g, lage.x + 6, lage.y + 24, 20, 3, '#1c1c22');
    if (belegt) R(g, lage.x + 7, lage.y + 25, Math.max(1, Math.round((18 * belegt) / 48)), 1, belegt >= 48 ? '#e84a3a' : '#6ad06a');
  },
});

