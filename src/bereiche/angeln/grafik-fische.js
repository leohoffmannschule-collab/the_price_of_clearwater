// Bereich „angeln" – Pixelkunst der Fische (16×16, Kopf links, Licht von oben links; den Umriss setzt
// der Kern). Eine Kunst „fisch" für alle, gesteuert über das Bild am Item:
//   f Rücken · f2 Bauch · f3 Flossen · form (Körperform) · muster + m, m2 (Musterfarben)
//   flosse (Rückenflosse: stachel, fahne) · bart (true: Barteln am Maul, 'kinn': eine am Kinn)
//   auge (rot, glas, blind, gross) · linie (helle Seitenlinie) · zaehne · legende (Glanz der Legendären)
// Der Körper ist ein Tropfen: vorne hoch, zum Schwanzstiel schmal (Höhe je Spalte aus FORMEN), der
// Schwanz eine eigene Form. So bleibt jeder Fisch an Umriss, Farbe und Zeichnung unterscheidbar.

import { kunst, P, R, E, L, POLY, kugel, hell, dunkel, mische } from '../../sprites.js';
import { hash } from '../../zufall.js';

/**
 * Körperformen: x0 Maul, x1 Schwanzstiel, cy Mittellinie, ry halbe Höhe, gipfel (0..1: wo der Körper
 * am höchsten ist), schwanz (Art), sh (halbe Schwanzhöhe), ruecken (Rückenflosse), kopf, schnauze.
 */
const FORMEN = {
  normal: { x0: 1, x1: 11, cy: 8, ry: 3.4, gipfel: 0.38, schwanz: 'gabel', sh: 3.6, ruecken: 'mitte' },
  dick: { x0: 1, x1: 11, cy: 8, ry: 4, gipfel: 0.42, schwanz: 'gabel', sh: 3.8, ruecken: 'mitte' },
  hoch: { x0: 1.5, x1: 11, cy: 8, ry: 4.7, gipfel: 0.45, schwanz: 'gerade', sh: 3.6, ruecken: 'stachel' },
  rund: { x0: 2, x1: 11, cy: 8, ry: 4.6, gipfel: 0.5, schwanz: 'rund', sh: 3.2, ruecken: 'mitte' },
  lang: { x0: 1, x1: 12, cy: 8, ry: 2.9, gipfel: 0.36, schwanz: 'gabel', sh: 3.4, ruecken: 'mitte' },
  schmal: { x0: 1, x1: 12, cy: 8, ry: 2.5, gipfel: 0.4, schwanz: 'gabel', sh: 3.2, ruecken: 'klein' },
  mini: { x0: 3, x1: 10.5, cy: 8, ry: 2.2, gipfel: 0.4, schwanz: 'gabel', sh: 2.4, ende: 13.5, ruecken: 'klein' },
  hecht: { x0: 2, x1: 12.5, cy: 8, ry: 2.5, gipfel: 0.55, schwanz: 'gerade', sh: 3, ruecken: 'hinten', schnauze: 'ente' },
  wels: { x0: 1, x1: 12.5, cy: 8.5, ry: 3.2, gipfel: 0.22, schwanz: 'rund', sh: 2.6, ruecken: 'kurz', kopf: 'breit' },
  quappe: { x0: 1, x1: 12.5, cy: 8, ry: 2.9, gipfel: 0.25, schwanz: 'rund', sh: 2.4, ruecken: 'saum', kopf: 'breit' },
  thun: { x0: 1, x1: 11.5, cy: 8, ry: 3.7, gipfel: 0.42, schwanz: 'sichel', sh: 4.8, ruecken: 'spitz', flossenpunkte: true },
  stoer: { x0: 2, x1: 12, cy: 8, ry: 2.5, gipfel: 0.35, schwanz: 'hai', sh: 3.4, ruecken: 'hinten', schnauze: 'spitz' },
  koenig: { x0: 1, x1: 10, cy: 8.5, ry: 4.6, gipfel: 0.45, schwanz: 'schleier', sh: 5, ruecken: 'krone' },
  koenigin: { x0: 1, x1: 10.5, cy: 8, ry: 3.3, gipfel: 0.38, schwanz: 'schleier', sh: 4.6, ruecken: 'schleier' },
};

/** Halbe Körperhöhe an der Stelle s (0 Maul … 1 Schwanzstiel). */
function hoehe(F, s) {
  if (s < 0 || s > 1) return 0;
  const p = Math.log(0.5) / Math.log(F.gipfel);
  const h = F.ry * Math.sin(Math.PI * Math.min(1, s ** p)) ** 0.7;
  return s > 0.75 ? Math.max(h, 1.1) : F.kopf === 'breit' && s < 0.2 ? Math.max(h, F.ry * 0.8) : h;
}

/** Maske des Körpers: (x, y) → { s, t } (t: −1 Rücken … 1 Bauch) oder null. */
function koerperMaske(F) {
  return (x, y) => {
    const s = (x + 0.5 - F.x0) / (F.x1 - F.x0);
    const h = hoehe(F, s);
    if (h < 0.5) return null;
    const dy = y + 0.5 - F.cy;
    if (dy < -h || dy > h * 0.95) return null;
    return { s, t: dy / h };
  };
}

/** Schwanzflosse Pixel für Pixel vom Stiel bis `ende`. */
function schwanz(g, F, farbe) {
  const x1 = Math.floor(F.x1);
  const ende = F.ende ?? 14.6;
  const strahl = hell(farbe, 0.18);
  for (let x = x1; x < 15; x++) {
    const d = (x + 0.5 - F.x1) / (ende - F.x1);
    if (d < 0 || d > 1) continue;
    for (let y = 0; y < 16; y++) {
      const dy = Math.abs(y + 0.5 - F.cy);
      let spread;
      let kerbe = -1;
      switch (F.schwanz) {
        case 'gerade': spread = 1 + d * (F.sh - 1); break;
        case 'rund': spread = 1 + (F.sh - 1) * Math.sin(Math.min(1, d * 1.15) * Math.PI * 0.62) - Math.max(0, d - 0.8) * 4; break;
        case 'sichel': spread = 0.8 + d * d * (F.sh - 0.8); kerbe = (d - 0.4) * F.sh * 0.95; break;
        case 'hai': {
          const oben = y + 0.5 < F.cy;
          spread = oben ? 1 + d * (F.sh - 0.5) : 1 + d * (F.sh * 0.5);
          kerbe = (d - 0.55) * F.sh;
          break;
        }
        case 'schleier': spread = 1.2 + d * (F.sh - 1) - Math.max(0, d - 0.85) * 3; kerbe = (d - 0.7) * F.sh * 0.8; break;
        default: spread = 1 + d * (F.sh - 1); kerbe = (d - 0.5) * F.sh * 1.2; // gabel
      }
      if (dy > spread || dy < kerbe) continue;
      P(g, x, y, Math.round(dy) % 2 === 0 && d > 0.3 ? strahl : farbe);
    }
  }
}

/** Rückenflosse über der Körperkante. */
function rueckenflosse(g, F, b, farbe) {
  const art = b.flosse || F.ruecken;
  const bereich = {
    mitte: [0.32, 0.62, 2.2], klein: [0.38, 0.58, 1.6], stachel: [0.25, 0.68, 2.6], fahne: [0.16, 0.7, 4],
    hinten: [0.62, 0.86, 2], kurz: [0.28, 0.42, 2], saum: [0.4, 0.98, 1.3], spitz: [0.35, 0.55, 3],
    krone: [0.18, 0.72, 4], schleier: [0.25, 1, 3.2],
  }[art] ?? [0.32, 0.62, 2.2];
  const [von, bis, hoch] = bereich;
  const spitze = hell(farbe, 0.3);
  for (let x = 0; x < 16; x++) {
    const s = (x + 0.5 - F.x0) / (F.x1 - F.x0);
    if (s < von || s > bis) continue;
    const v = (s - von) / (bis - von);
    let h;
    switch (art) {
      case 'stachel': h = hoch * (1 - v * 0.5) * (x % 2 ? 1 : 0.65); break;
      case 'fahne': h = hoch * Math.min(1, v * 3) * (1 - v * 0.15); break;
      case 'spitz': h = hoch * (1 - v); break;
      case 'krone': h = [3.6, 1.6, 4.2, 1.6, 3.6, 1.4, 3][Math.min(6, Math.floor(v * 7))]; break;
      case 'schleier': h = hoch * Math.sin(v * Math.PI) + (v > 0.6 ? 0.5 : 0); break;
      case 'saum': h = hoch; break;
      default: h = hoch * Math.sin(Math.min(1, v * 1.4) * Math.PI * 0.6 + 0.2) * (1 - v * 0.4);
    }
    const oben = Math.round(F.cy - hoehe(F, s));
    const n = Math.max(1, Math.round(h));
    for (let i = 1; i <= n; i++) P(g, x, oben - i, i === n && n > 1 ? spitze : farbe);
    if (art === 'fahne' && (x % 3 === 0)) P(g, x, oben - Math.max(1, n - 1), b.m || dunkel(farbe, 0.3));
    if (art === 'krone' && n > 3) P(g, x, oben - n, b.legende || hell(farbe, 0.6));
  }
}

/** Zeichnung auf dem Körper; `inn(x, y)` gibt { s, t } innerhalb des Körpers. */
function muster(g, F, b, inn) {
  const m = b.m || dunkel(b.f, 0.3);
  const n = (x, y, k = 0) => hash(x, y, 31 + k);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const p = inn(x, y);
      if (!p) continue;
      const { s, t } = p;
      const kopf = s < 0.2;
      const rand = Math.abs(t) > 0.8;
      switch (b.muster) {
        case 'schuppen': if (!kopf && t > -0.7 && t < 0.4 && (x + 2 * y) % 4 === 0) P(g, x, y, mische(b.f, m, 0.5)); break;
        case 'punkte': if (!kopf && t < 0.3 && !rand && n(x, y) < 0.2) P(g, x, y, m); break;
        case 'rotpunkte':
          if (!kopf && t < 0.4 && !rand && (x * 2 + y * 3) % 7 === 0) { P(g, x, y, m); if (b.saum !== false && inn(x - 1, y)) P(g, x - 1, y, hell(b.f, 0.55)); }
          break;
        case 'streifen': if (!kopf && t < 0.5 && s < 0.9 && (x - Math.round(F.x0)) % 2 === 1) P(g, x, y, m); break;
        case 'band': if (!kopf && t > -0.35 && t < 0.15) P(g, x, y, m); break;
        case 'linie': if (s > 0.15 && Math.abs(t + 0.1) < 0.2) P(g, x, y, m); break;
        case 'flecken': if (!kopf && t < 0.45 && !rand && n(Math.floor(x / 2), Math.floor(y / 2), 4) < 0.32) P(g, x, y, m); break;
        case 'glanz': if (s > 0.15 && t > -0.65 && t < -0.1 && (x + y) % 3 === 0) P(g, x, y, m); break;
        case 'kreuze': if (!kopf && t < 0.3 && !rand && (x + y * 2) % 5 === 0 && y % 2 === 0) { P(g, x, y, m); if (inn(x + 1, y + 1)) P(g, x + 1, y + 1, m); } break;
        case 'wellen': if (!kopf && t < 0 && Math.round(Math.sin(x * 1.2) * 1.2 + y) % 3 === 0) P(g, x, y, m); break;
        case 'koi':
          if (s > 0.1 && t < 0.55 && n(Math.floor((x + 1) / 3), Math.floor(y / 3), 7) < 0.5) P(g, x, y, m);
          else if (s > 0.35 && t < 0 && n(Math.floor(x / 2), Math.floor(y / 2), 9) < 0.15) P(g, x, y, b.m2 || '#222');
          break;
        case 'narben': if (!kopf && t < 0.2 && (x - y * 2) % 6 === 0 && n(x, y, 3) < 0.7) P(g, x, y, m); break;
        case 'frost': if (!kopf && t < 0.3 && (x + y) % 3 === 0 && n(x, y, 6) < 0.4) P(g, x, y, m); break;
        case 'mond': if (!kopf && (x * 3 + y) % 7 === 0 && t < -0.2) P(g, x, y, mische(b.f, m, 0.4)); break;
        case 'platten':
          if (!kopf && Math.abs(t + 0.6) < 0.2 && x % 2 === 0) P(g, x, y, m);
          if (!kopf && Math.abs(t - 0.15) < 0.2 && x % 2 === 1 && s < 0.9) P(g, x, y, mische(m, b.f, 0.35));
          break;
        default:
      }
    }
  }
}

/** Auge: groß genug für 2×2 (Glanz oben links), sonst ein Pixel. */
function auge(g, x, y, art, gross = true) {
  switch (art) {
    case 'blind': P(g, x, y, '#f4e0e0'); return;
    case 'rot': if (gross) { P(g, x, y, '#ffe0c8'); P(g, x + 1, y, '#c8202a'); P(g, x, y + 1, '#c8202a'); P(g, x + 1, y + 1, '#5a0a10'); } else P(g, x, y, '#c8202a'); return;
    case 'glas': if (gross) { P(g, x, y, '#ffffff'); P(g, x + 1, y, '#d8d8b8'); P(g, x, y + 1, '#d8d8b8'); P(g, x + 1, y + 1, '#8a8a70'); } else P(g, x, y, '#e8e8d0'); return;
    case 'gross': R(g, x, y, 2, 2, '#141414'); P(g, x, y, '#ffffff'); return;
    default:
      if (gross) { P(g, x, y, '#ffffff'); P(g, x + 1, y, '#141414'); P(g, x, y + 1, '#141414'); P(g, x + 1, y + 1, '#141414'); } else P(g, x, y, '#141414');
  }
}

/** Der übliche Fisch im Profil: Schwanz, Flossen, schattierter Körper, Zeichnung, Kopf, Auge, Barteln. */
function profilFisch(g, b) {
  const grund = FORMEN[b.form] ?? FORMEN.normal;
  // Legendäre Riesen füllen das Bild: höherer Körper, größerer Schwanz
  const F = b.gross ? { ...grund, ry: grund.ry * 1.3, sh: grund.sh * 1.2, x0: Math.max(1, grund.x0 - 0.5) } : grund;
  const f = b.f;
  const bauch = b.f2 ?? hell(f, 0.5);
  const flosse = b.f3 ?? dunkel(f, 0.2);
  const inn = koerperMaske(F);
  const xs = (s) => Math.round(F.x0 + s * (F.x1 - F.x0) - 0.5);
  schwanz(g, F, flosse);
  rueckenflosse(g, F, b, flosse);
  // Bauch- und Afterflosse: kleine, schräge Zipfel unter dem Körper
  for (const [s, breit] of [[0.36, 2], [0.72, 2]]) {
    const x = xs(s);
    const unten = Math.round(F.cy + hoehe(F, s) * 0.95);
    for (let i = 0; i < breit; i++) P(g, x + i, unten, flosse);
    if (F.ry > 2.6) P(g, x + breit - 1, unten + 1, dunkel(flosse, 0.1));
  }
  // Körper, schattiert: Rücken dunkler, Glanz vorne oben, Bauch hell, Schwanzstiel etwas dunkler
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const p = inn(x, y);
      if (!p) continue;
      const { s, t } = p;
      let farbe = t > 0.32 ? bauch : t > 0.08 ? mische(f, bauch, 0.5) : f;
      if (t < -0.68) farbe = dunkel(f, 0.12);
      if (t > 0.82) farbe = dunkel(bauch, 0.12);
      if (s > 0.85) farbe = dunkel(farbe, 0.1);
      P(g, x, y, farbe);
    }
  }
  // Glanzlinie vorne oben
  for (let x = xs(0.18); x <= xs(0.5); x++) {
    const s = (x + 0.5 - F.x0) / (F.x1 - F.x0);
    const y = Math.round(F.cy - hoehe(F, s) * 0.5);
    if (inn(x, y)) P(g, x, y, hell(f, 0.3));
  }
  if (b.linie) for (let x = xs(0.22); x <= xs(0.92); x++) if (inn(x, Math.round(F.cy - 0.5))) P(g, x, Math.round(F.cy - 0.5), b.linie);
  muster(g, F, b, inn);
  if (b.muster === 'mond') {
    // eine kleine Mondsichel mitten auf der Flanke
    const mx0 = Math.round(F.x0 + (F.x1 - F.x0) * 0.5) - 1;
    const my0 = Math.round(F.cy) - 2;
    for (const [x, y] of [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3]]) P(g, mx0 + x, my0 + y, b.m);
    P(g, mx0 + 1, my0 + 1, hell(b.m, 0.4)); P(g, mx0 + 1, my0 + 2, hell(b.m, 0.4));
  }
  // Kopf: Kiemenbogen, Brustflosse, Maul
  const kx = xs(F.kopf === 'breit' ? 0.24 : 0.2);
  const kh = hoehe(F, 0.2);
  for (let y = Math.round(F.cy - kh * 0.55); y <= Math.round(F.cy + kh * 0.5); y++) if (inn(kx, y)) P(g, kx, y, dunkel(f, 0.3));
  P(g, kx + 1, Math.round(F.cy + kh * 0.3), flosse); P(g, kx + 2, Math.round(F.cy + kh * 0.3), dunkel(flosse, 0.1));
  const mx = Math.round(F.x0);
  const my = Math.round(F.cy + (F.kopf === 'breit' ? 0.6 : 0.3));
  if (F.schnauze === 'ente') { R(g, 1, my - 1, 2, 2, hell(f, 0.1)); P(g, 1, my, dunkel(f, 0.35)); P(g, 2, my, dunkel(f, 0.35)); }
  else if (F.schnauze === 'spitz') { POLY(g, [[F.x0 + 1.2, F.cy - 1.4], [1, F.cy + 0.3], [F.x0 + 1.2, F.cy + 1.2]], hell(f, 0.12)); }
  else { P(g, mx, my, dunkel(f, 0.45)); P(g, mx + 1, my, dunkel(f, 0.25)); }
  if (b.zaehne) for (let x = Math.round(F.x0) - 1; x <= Math.round(F.x0) + 2; x += 1) if (x >= 1) P(g, x, my, x % 2 ? '#ffffff' : '#c8e8f8');
  const gross = F.ry >= 2.8;
  const ex = Math.round(F.x0 + (F.schnauze === 'ente' ? 2.2 : F.kopf === 'breit' ? 2.2 : 1.6));
  const ey = Math.round(F.cy - hoehe(F, 0.12) * 0.55 - (gross ? 0.5 : 0));
  auge(g, ex, ey, b.auge, gross);
  // Barteln
  if (b.bart === 'kinn') L(g, mx + 2, my + 1, mx + 1, my + 3, dunkel(f, 0.45), 1);
  else if (b.bart) {
    const lang = b.form === 'wels' ? 4 : 2;
    L(g, mx, my + 1, mx, my + lang, dunkel(f, 0.45), 1);
    L(g, mx + 2, my + 1, mx + 3, my + lang, dunkel(f, 0.35), 1);
    if (b.form === 'wels') L(g, mx + 1, my - 1, 0, my - 3, dunkel(f, 0.45), 1);
  }
  if (F.flossenpunkte) for (const s of [0.72, 0.86]) { const x = xs(s); const h = hoehe(F, s); P(g, x, Math.round(F.cy - h), flosse); P(g, x, Math.round(F.cy + h * 0.95) - 1, flosse); }
}

// ─── Besondere Formen ───────────────────────────────────────────────────────

/** Plattfisch von oben: ovaler Körper mit Flossensaum, beide Augen oben links. */
function plattfisch(g, b) {
  const f = b.f;
  const flosse = b.f3 ?? dunkel(f, 0.2);
  POLY(g, [[12, 8], [15, 5.5], [14.2, 8], [15, 10.5]], flosse);
  E(g, 7, 8, 6.3, 4.8, flosse);
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; P(g, Math.round(7 + Math.cos(a) * 5.8), Math.round(8 + Math.sin(a) * 4.3), hell(flosse, 0.2)); }
  kugel(g, 7, 8, 5, 3.5, f);
  const inn = (x, y) => { const u = (x + 0.5 - 7) / 5; const t = (y + 0.5 - 8) / 3.5; return u * u + t * t <= 0.8 ? { s: (u + 1) / 2, t } : null; };
  muster(g, { x0: 2, x1: 12, cy: 8 }, b, inn);
  L(g, 5, 8, 11, 8, dunkel(f, 0.15), 1); // Seitenlinie
  auge(g, 3, 5, b.auge, false); P(g, 3, 4, '#ffffff');
  auge(g, 4, 9, b.auge, false); P(g, 4, 8, '#ffffff');
  L(g, 1, 7, 2, 8, dunkel(f, 0.45), 1);
}

/** Rochen von oben: Raute mit langem, dünnem Schwanz. */
function rochen(g, b) {
  const f = b.f;
  L(g, 11, 9, 15, 14, dunkel(f, 0.25), 1);
  POLY(g, [[1, 8], [7, 1.8], [13, 8.5], [7, 13.5]], f);
  POLY(g, [[1, 8], [7, 8.6], [13, 8.5], [7, 13.5]], dunkel(f, 0.14));
  POLY(g, [[3.5, 7.5], [7, 3.8], [8.5, 7.5]], hell(f, 0.18));
  const inn = (x, y) => (Math.abs(x + 0.5 - 7) / 6 + Math.abs(y + 0.5 - 8) / 5.6 < 0.8 ? { s: (x - 1) / 12, t: (y - 8) / 5 } : null);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (inn(x, y) && hash(x, y, 50) < 0.13) P(g, x, y, b.m);
  P(g, 5, 6, '#141414'); P(g, 5, 5, '#ffffff'); P(g, 8, 5, '#141414'); P(g, 8, 4, '#ffffff');
}

/** Aal, Schlammpeitzger und Glasaal: schräg liegender, sanft geschwungener Körper (Kopf unten links). */
function aal(g, b) {
  const glas = b.form === 'glasaal';
  const [ax, ay, bx, by] = [1.5, 11.5, 14.5, 4];
  const lang = Math.hypot(bx - ax, by - ay);
  const [dx, dy] = [(bx - ax) / lang, (by - ay) / lang];
  const dick = glas ? 1.25 : 1.6;
  const lage = (x, y) => {
    const px = x + 0.5 - ax;
    const py = y + 0.5 - ay;
    const u = (px * dx + py * dy) / lang;
    const quer = px * -dy + py * dx; // > 0: Bauchseite (unten rechts)
    return { u, quer: quer - Math.sin(u * Math.PI * 2) * 1.3 };
  };
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const { u, quer } = lage(x, y);
      if (u < 0 || u > 1) continue;
      const d = u > 0.75 ? dick * (1 - (u - 0.75) / 0.3) + 0.3 : u < 0.12 ? dick + 0.25 : dick;
      if (Math.abs(quer) > d) continue;
      let farbe = quer > d * 0.3 ? b.f2 : b.f;
      if (quer < -d * 0.55) farbe = dunkel(b.f, 0.12);
      if (glas) farbe = Math.abs(quer) < 0.5 ? b.m : quer < 0 ? b.f : b.f2;
      if (b.muster === 'band' && Math.abs(quer) < 0.5 && u > 0.12) farbe = b.m;
      P(g, x, y, farbe);
    }
  }
  // Flossensaum auf dem Rücken, hintere Hälfte
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const { u, quer } = lage(x, y);
    if (u > 0.45 && u < 0.95 && quer < -dick && quer >= -dick - 1) P(g, x, y, b.f3 ?? hell(b.f, 0.2));
  }
  P(g, 3, 9, '#141414'); if (!glas) P(g, 2, 9, '#ffffff'); else P(g, 3, 8, '#141414');
  P(g, 1, 12, dunkel(b.f, 0.45));
  if (b.bart) { P(g, 1, 13, dunkel(b.f, 0.4)); P(g, 2, 14, dunkel(b.f, 0.4)); }
}

function tintenfisch(g, b) {
  const f = b.f;
  for (const [x, w] of [[5, 0.9], [7, -0.6], [9, 0.7], [11, -0.9]]) for (let y = 9; y < 15; y++) P(g, x + Math.round(Math.sin(y * 0.9) * w), y, y % 2 ? dunkel(f, 0.12) : f);
  POLY(g, [[8, 1], [12.5, 6], [3.5, 6]], hell(f, 0.1));
  kugel(g, 8, 6.5, 3.8, 3.6, f);
  for (const [x, y] of [[6, 4], [9, 5], [8, 3]]) P(g, x, y, dunkel(f, 0.2));
  auge(g, 5, 8, 'gross'); auge(g, 9, 8, 'gross');
}

function kugelfisch(g, b) {
  const f = b.f;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    L(g, Math.round(7.5 + Math.cos(a) * 5), Math.round(8 + Math.sin(a) * 5), Math.round(7.5 + Math.cos(a) * 6.6), Math.round(8 + Math.sin(a) * 6.6), dunkel(f, 0.32), 1);
  }
  POLY(g, [[12, 8], [14.8, 6], [14.8, 10]], dunkel(f, 0.15));
  kugel(g, 7.5, 8, 5.2, 5.2, f);
  E(g, 7.5, 10.6, 3.8, 2.2, b.f2);
  for (const [x, y] of [[8, 4], [10, 6], [6, 6], [11, 9]]) P(g, x, y, b.m || dunkel(f, 0.35));
  auge(g, 4, 6, 'gross'); P(g, 2, 9, dunkel(f, 0.45)); P(g, 3, 9, dunkel(f, 0.3));
}

function geisterfisch(g, b) {
  const f = b.f;
  for (let x = 9; x < 15; x++) {
    const d = (x - 9) / 6;
    for (let y = 0; y < 16; y++) {
      const dy = y + 0.5 - 8 - Math.sin(x * 1.3) * 0.8;
      if (Math.abs(dy) <= 1.5 + d * 3) P(g, x, y, Math.round(dy + x) % 3 === 0 ? b.f3 : hell(f, 0.3));
    }
  }
  kugel(g, 6.5, 8, 5, 4.2, f);
  E(g, 6, 10, 3.6, 1.8, b.f2);
  for (const [x, y] of [[8, 5], [9, 7], [10, 6]]) P(g, x, y, '#ffffff');
  auge(g, 3, 6, 'gross');
  P(g, 1, 9, dunkel(f, 0.4)); P(g, 2, 9, dunkel(f, 0.3));
}

function steinfisch(g, b) {
  const f = b.f;
  POLY(g, [[11, 9], [14.8, 6.2], [14.8, 12.4], [11, 11]], b.f3);
  for (const x of [4, 6, 8, 10]) L(g, x, 5, x + 1, 2, dunkel(b.f3, 0.1), 1);
  POLY(g, [[1.5, 10], [2.5, 6.5], [6, 4.5], [10, 5], [12, 8], [11.5, 12], [6, 13.2], [2.5, 12]], f);
  for (let y = 4; y < 14; y++) for (let x = 1; x < 13; x++) {
    const z = hash(x, y, 77);
    if (z < 0.14) P(g, x, y, b.m);
    else if (z > 0.88) P(g, x, y, b.f2);
  }
  for (const [x, y] of [[3, 7], [6, 5], [9, 5], [11, 8], [7, 12]]) P(g, x, y, hell(f, 0.25));
  auge(g, 3, 6, 'rot', false); auge(g, 6, 5, 'rot', false);
  L(g, 2, 10, 4, 10, dunkel(f, 0.45), 1);
}

/** Leuchtpunkte der Legendären: ein kleiner Stern oben links und ein Funkeln unten rechts. */
function legendenGlanz(g, b) {
  const c = b.legende;
  P(g, 2, 1, c); P(g, 1, 2, c); P(g, 2, 2, '#ffffff'); P(g, 3, 2, c); P(g, 2, 3, c);
  P(g, 14, 14, hell(c, 0.4));
}

kunst({
  /** Fisch nach bild.form (siehe FORMEN und die Sonderformen). */
  fisch(g, b) {
    switch (b.form) {
      case 'platt': case 'flach': plattfisch(g, b); break;
      case 'rochen': rochen(g, b); break;
      case 'aal': case 'glasaal': aal(g, b); break;
      case 'tinte': tintenfisch(g, b); break;
      case 'kugel': kugelfisch(g, b); break;
      case 'geist': geisterfisch(g, b); break;
      case 'stein': steinfisch(g, b); break;
      default: profilFisch(g, b);
    }
    if (b.legende) legendenGlanz(g, b);
  },
});

