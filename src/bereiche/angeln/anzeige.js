// Bereich „angeln" – die Anzeige beim Angeln, alles in ganzen Pixeln wie der Rest des Spiels:
// Rute in der Hand (hinter oder vor der Figur), Schnur mit Durchhang, rot-weißer Schwimmer,
// Wellenringe, Blasenspur, Platscher und „!" beim Biss, der Fang, der zur Figur fliegt.
// Gelesen wird nur S.angeln (angeln.js); gemalt wird in zwei Zeichnern:
//   angelrute  (welt, 91)   die Rute, sortiert mit der Figur
//   angeln     (ueber, 20)  Vorschau, Wellen, Spur, Schnur, Schwimmer, „!", Fang im Flug

import { itemBild, gecacht, leinwand, umriss, R, P } from '../../sprites.js';
import { zeichner } from '../../render.js';
import { S } from '../../spiel.js';
import { T, ITEMS } from '../../daten.js';
import { istWasser } from '../../karten.js';
import { ANGELN, VORSCHAU } from '../../angeln.js';

const lerp = (a, b, u) => a + (b - a) * u;
const u01 = (u) => Math.max(0, Math.min(1, u));
const aus = (u) => 1 - (1 - u) * (1 - u); // bremst am Ende
const UMRISS = '#2b1d1c';

/** Ein Pixel mit Deckkraft. */
function px(g, x, y, f, a = 1) {
  g.globalAlpha = a;
  g.fillStyle = f;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

// ─── Rute ───────────────────────────────────────────────────────────────────
// Die Hand der Figur und die Winkel der Rute (Bogenmaß, y nach unten) je Blickrichtung; links
// ist rechts gespiegelt. „ruhe" ist die Haltung beim Warten, „hinten" der Schwung nach hinten.

const HALTUNG = {
  rechts: { hx: 2, hy: -7, laenge: 16, ruhe: -0.8, hinten: -2.4, spiegel: 1 },
  links: { hx: -2, hy: -7, laenge: 16, ruhe: -0.8, hinten: -2.4, spiegel: -1 },
  unten: { hx: 4, hy: -7, laenge: 14, ruhe: 0.6, hinten: -1.3, spiegel: 1 },
  oben: { hx: -4, hy: -8, laenge: 15, ruhe: -1.0, hinten: -2.0, spiegel: -1 },
};

/** Wo Hand und Rutenspitze gerade sind: { hx, hy, ex, ey (gerades Ende), biegung, tx, ty (Spitze) }. */
function ruteLage() {
  const a = S.angeln;
  const sp = S.sp;
  const h = HALTUNG[sp.blick] || HALTUNG.unten;
  const p = u01(a.t / (a.dauer || 1));
  let w = h.ruhe;
  let biegung = 1.5;
  switch (a.phase) {
    case 'wurf': w = lerp(h.hinten, h.ruhe, aus(u01(a.t / 0.26))); break;
    case 'warten': w += Math.sin(S.t * 1.7) * 0.03; break;
    case 'spur': w += Math.sin(S.t * 11) * 0.025; biegung = 2.5; break;
    case 'biss': w += 0.1 + Math.sin(S.t * 42) * 0.05; biegung = 4.5; break;
    case 'einholen': w = lerp(h.ruhe, lerp(h.ruhe, h.hinten, 0.3), Math.sin(p * Math.PI)); biegung = a.fang ? 3.5 : 1.5; break;
    case 'fang': w = lerp(h.ruhe, h.hinten, 0.3); break;
    default:
  }
  const hx = sp.x + h.hx;
  const hy = sp.y + h.hy;
  const ex = hx + Math.cos(w) * h.spiegel * h.laenge;
  const ey = hy + Math.sin(w) * h.laenge;
  return { hx, hy, ex, ey, biegung, tx: ex, ty: ey + biegung };
}

/** Die Rute: dunkler Griff, heller Bambus, an der Spitze gebogen; ein Schattenpixel gibt den Umriss. */
/** Farben der Rute (Item-Feld `ruteFarben`, ausruestung.js); ohne Angabe Bambus. */
const BAMBUS = { griff: '#6a3e1e', mitte: '#c89a4c', spitze: '#ecd08a' };

function ruteMalen(g, l) {
  const farben = ITEMS[S.angeln?.rute]?.ruteFarben ?? BAMBUS;
  const n = Math.ceil(Math.hypot(l.ex - l.hx, l.ey - l.hy)) + 2;
  const punkt = (u) => [l.hx + (l.ex - l.hx) * u, l.hy + (l.ey - l.hy) * u + l.biegung * u * u * u];
  for (let i = 0; i <= n * 0.9; i++) {
    const [x, y] = punkt(i / n);
    px(g, x + 1, y + 1, UMRISS);
  }
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const [x, y] = punkt(u);
    px(g, x, y, u < 0.26 ? farben.griff : u > 0.82 ? farben.spitze : farben.mitte);
  }
  const [rx, ry] = punkt(0.18);
  px(g, rx, ry + 1, '#8a9098'); // Rolle
  g.globalAlpha = 1;
}

zeichner({
  name: 'angelrute', ebene: 'welt', reihe: 91,
  sammeln() {
    if (S.demo || !S.angeln) return null;
    // Blickt die Figur nach oben, steht die Rute hinter ihr
    return [{ y: S.sp.y + (S.sp.blick === 'oben' ? -0.5 : 0.5), f: (g) => ruteMalen(g, ruteLage()) }];
  },
});

// ─── Schnur ─────────────────────────────────────────────────────────────────

/** Die Schnur: quadratische Kurve mit Durchhang, 1 Pixel dick, mit zarter Schattenkante. */
function schnur(g, x0, y0, x1, y1, durchhang) {
  const laenge = Math.hypot(x1 - x0, y1 - y0);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + Math.min(durchhang, laenge * 0.3) * 2; // Kontrollpunkt; die Kurve hängt in der Mitte um `durchhang` durch
  const n = Math.ceil(laenge * 1.6) + 2;
  const feld = new Map();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const v = 1 - u;
    const x = Math.round(v * v * x0 + 2 * u * v * mx + u * u * x1);
    const y = Math.round(v * v * y0 + 2 * u * v * my + u * u * y1);
    feld.set(x * 10000 + y, [x, y]);
  }
  for (const [x, y] of feld.values()) px(g, x, y + 1, '#22314f', 0.5);
  for (const [x, y] of feld.values()) px(g, x, y, '#f4f7fb', 0.95);
  g.globalAlpha = 1;
}

// ─── Schwimmer ──────────────────────────────────────────────────────────────

const SCHWIMMER = ['..w..', '.rrr.', 'rrrrr', 'wwwww', '.www.'];
const SCHWIMMER_FARBE = { r: '#e23c3c', w: '#f7f3e6' };

/** Der rot-weiße Schwimmer, Wasserlinie bei y; `tief` Pixel unter Wasser (beim Biss). */
function schwimmer(g, x, y, tief = 0, wasser = true) {
  const x0 = Math.round(x) - 2;
  const y0 = Math.round(y) - 4 + tief;
  const wl = Math.round(y);
  const da = new Set();
  const feld = [];
  SCHWIMMER.forEach((zeile, cy) => {
    for (let cx = 0; cx < 5; cx++) {
      const z = zeile[cx];
      const yy = y0 + cy;
      if (z === '.' || (wasser && yy > wl)) continue;
      da.add((x0 + cx) * 10000 + yy);
      feld.push([cx, cy, x0 + cx, yy, z]);
    }
  });
  for (const [, , xx, yy] of feld) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = xx + dx;
      const ny = yy + dy;
      if (da.has(nx * 10000 + ny) || (wasser && ny > wl)) continue;
      px(g, nx, ny, UMRISS);
    }
  }
  for (const [cx, cy, xx, yy, z] of feld) {
    let f = SCHWIMMER_FARBE[z];
    if (z === 'r' && cy === 2) f = '#b82a2a';
    if (z === 'r' && cx === 1 && cy === 1) f = '#ff8f80';
    if (z === 'w' && cy === 4) f = '#c9c3b0';
    if (wasser && yy === wl && tief === 0 && cy === 4) { px(g, xx, yy, '#8fb4d0', 1); continue; } // taucht ein
    px(g, xx, yy, f);
  }
  g.globalAlpha = 1;
}

// ─── Wasser: Wellen, Blasen, Platscher ──────────────────────────────────────

const aufWasser = (def, x, y) => istWasser(def, Math.floor(x / T), Math.floor(y / T));

/** Ein Wellenring als Ellipsenlinie (Wasser im Schrägblick), nur auf Wasserfeldern. */
function ring(g, def, cx, cy, rx, alpha, f = '#e9f7ff') {
  const ry = rx * 0.5;
  const n = Math.ceil((rx + ry) * 5);
  const gesehen = new Set();
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(w) * rx);
    const y = Math.round(cy + Math.sin(w) * ry);
    const k = x * 10000 + y;
    if (gesehen.has(k) || !aufWasser(def, x, y)) continue;
    gesehen.add(k);
    px(g, x, y, f, alpha);
  }
  g.globalAlpha = 1;
}

/** Leichte, sich ausbreitende Ringe um den Schwimmer. */
function wellen(g, def, x, y, anzahl, tempo, staerke) {
  for (let k = 0; k < anzahl; k++) {
    const u = (S.t * tempo + k / anzahl) % 1;
    ring(g, def, x, y + 1, 2.5 + u * 9.5, (1 - u) * staerke);
  }
}

/** Eine Blase (Größe 3: Ring, 2: Viereck, 1: Punkt), nur auf Wasser. */
function blase(g, def, x, y, groesse, alpha) {
  if (!aufWasser(def, x, y)) return;
  const hellF = '#f2fcff';
  const kern = '#8fd0f0';
  if (groesse >= 3) {
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) px(g, x + dx, y + dy, hellF, alpha);
    px(g, x, y, kern, alpha);
  } else if (groesse === 2) {
    px(g, x, y, hellF, alpha); px(g, x + 1, y, hellF, alpha); px(g, x, y + 1, hellF, alpha); px(g, x + 1, y + 1, kern, alpha);
  } else px(g, x, y, hellF, alpha);
  g.globalAlpha = 1;
}

/** Die Blasenspur: eine Kette Blasen zieht aus der Tiefe auf den Schwimmer zu. */
function blasenspur(g, def, a) {
  const q = u01(a.t / a.spur);
  const x0 = a.bx + Math.cos(a.winkel) * 27;
  const y0 = a.by + Math.sin(a.winkel) * 27;
  const dx = a.bx - x0;
  const dy = a.by - y0;
  const len = Math.hypot(dx, dy) || 1;
  for (let k = 0; k < 7; k++) {
    const u = q - k * 0.07;
    if (u < 0) continue;
    const zitter = Math.sin(S.t * 13 + k * 1.7) * 1.3;
    const x = x0 + dx * u - (dy / len) * zitter;
    const y = y0 + dy * u + (dx / len) * zitter;
    blase(g, def, Math.round(x), Math.round(y), k === 0 ? 3 : k < 3 ? 2 : 1, 1 - k * 0.12);
  }
}

/** Platscher: eine Krone aus Tropfen, die hochspritzen und zurückfallen (age in s). */
function krone(g, x, y, age, groesse = 1) {
  const dauer = 0.5;
  if (age < 0 || age > dauer) return;
  const alpha = 1 - age / dauer;
  for (let k = -3; k <= 3; k++) {
    const vx = (k * 11 + (k % 2 ? 3 : -2)) * groesse;
    const vy = -(70 - Math.abs(k) * 8) * groesse;
    const tx = x + vx * age;
    const ty = y + vy * age + 0.5 * 190 * age * age;
    px(g, tx, ty, '#ffffff', alpha);
    px(g, tx, ty + 1, '#9ad8f8', alpha * 0.9);
  }
  g.globalAlpha = 1;
}

// ─── Der Biss: „!" über dem Kopf ────────────────────────────────────────────

/** Sprechblase mit rotem Ausrufezeichen; springt beim Erscheinen kurz hoch. */
function ausruf(g, x, y, age) {
  const hoch = Math.round(Math.sin(u01(age / 0.25) * Math.PI) * 3);
  const bx = Math.round(x) - 4;
  const by = Math.round(y) - 12 - hoch;
  g.fillStyle = UMRISS;
  g.fillRect(bx - 1, by - 1, 11, 13);
  g.fillRect(bx + 3, by + 12, 3, 2);
  g.fillStyle = '#fbf6e8';
  g.fillRect(bx, by, 9, 11);
  g.fillRect(bx + 4, by + 11, 1, 2);
  g.fillStyle = '#d83a3a';
  g.fillRect(bx + 3, by + 1, 3, 6);
  g.fillRect(bx + 3, by + 8, 3, 2);
  g.fillStyle = '#ff8f80';
  g.fillRect(bx + 3, by + 1, 1, 6);
  g.globalAlpha = 1;
}

// ─── Der Fang ───────────────────────────────────────────────────────────────

/** Schatzkiste (16×16): Holz mit Eisenbändern und goldenem Schloss. */
function kisteBild() {
  return gecacht('angeln:schatzkiste', () => {
    const [c, g] = leinwand(16, 16);
    R(g, 2, 8, 12, 6, '#8a5428'); R(g, 2, 8, 12, 1, '#a8703a'); R(g, 2, 13, 12, 1, '#5e3a1a');
    R(g, 3, 4, 10, 4, '#b87a3a'); R(g, 4, 3, 8, 1, '#c88a46'); R(g, 3, 4, 10, 1, '#d89a56');
    R(g, 3, 7, 10, 1, '#6a4420');
    R(g, 4, 3, 2, 11, '#5a5e68'); R(g, 10, 3, 2, 11, '#5a5e68'); R(g, 4, 3, 1, 11, '#8a8e98'); R(g, 10, 3, 1, 11, '#8a8e98');
    R(g, 7, 7, 2, 3, '#f2c94c'); P(g, 7, 7, '#fff0a0'); P(g, 8, 9, '#a87a10');
    P(g, 6, 2, '#fff6a0'); P(g, 9, 1, '#fff6a0'); P(g, 12, 2, '#ffe070');
    return umriss(c);
  });
}

const fangBild = (f) => (f.art === 'schatz' ? kisteBild() : itemBild({ id: f.id }));

/** Funkeln um den Fang: kleine Kreuze, die zwischendurch aufblitzen. */
function funkeln(g, x, y, anzahl) {
  for (let k = 0; k < anzahl; k++) {
    const t = S.t * 6 + k * 2.1;
    if (Math.sin(t) < 0.2) continue;
    const fx = x + Math.cos(k * 2.4) * 11;
    const fy = y + Math.sin(k * 3.1) * 8;
    px(g, fx, fy, '#fff6a0');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(g, fx + dx, fy + dy, '#ffe070', 0.7);
  }
  g.globalAlpha = 1;
}

function bildZeichnen(g, bild, x, y, spiegeln = false) {
  const bx = Math.round(x) - 8;
  const by = Math.round(y) - 8;
  if (!spiegeln) { g.drawImage(bild, bx, by); return; }
  g.save();
  g.translate(bx + 16, by);
  g.scale(-1, 1);
  g.drawImage(bild, 0, 0);
  g.restore();
}

// ─── Vorschau: wohin die Schnur fiele ───────────────────────────────────────

function vorschau(g) {
  const z = VORSCHAU.ziel;
  if (!z || S.angeln || S.pause) return;
  const a = 0.5 + 0.25 * Math.sin(S.t * 5);
  const x = z.x * T;
  const y = z.y * T;
  for (const [ex, ey, sx, sy] of [[x + 2, y + 2, 1, 1], [x + 13, y + 2, -1, 1], [x + 2, y + 13, 1, -1], [x + 13, y + 13, -1, -1]]) {
    for (let i = 0; i < 3; i++) { px(g, ex + sx * i, ey, '#ffffff', a); px(g, ex, ey + sy * i, '#ffffff', a); }
  }
  g.globalAlpha = 1;
}

// ─── Zeichner ───────────────────────────────────────────────────────────────

zeichner({
  name: 'angeln', ebene: 'ueber', reihe: 20,
  zeichnen(g, k, ort) {
    if (S.demo) return;
    vorschau(g);
    const a = S.angeln;
    if (!a) return;
    const def = ort.def;
    const sp = S.sp;
    const l = ruteLage();
    const p = u01(a.t / (a.dauer || 1));

    if (a.phase === 'wurf') {
      // Der Schwimmer fliegt im Bogen von der Rutenspitze aufs Wasserfeld
      const e = p;
      const bogen = Math.sin(p * Math.PI) * (16 + Math.hypot(a.bx - l.tx, a.by - l.ty) * 0.18);
      const x = lerp(l.tx, a.bx, e);
      const y = lerp(l.ty, a.by, e) - bogen;
      schnur(g, l.tx, l.ty, x, y, 9 * (1 - p) + 2);
      schwimmer(g, x, y, 0, false);
      return;
    }

    if (a.phase === 'warten') {
      wellen(g, def, a.bx, a.by, 2, 0.55, 0.5);
      krone(g, a.bx, a.by, a.t, 0.5);
      const wipp = Math.round(Math.sin(S.t * 2.6) * 0.75);
      schnur(g, l.tx, l.ty, a.bx, a.by + wipp - 3, 2 + 0.11 * Math.hypot(a.bx - l.tx, a.by - l.ty) + Math.sin(S.t * 1.3) * 0.6);
      schwimmer(g, a.bx, a.by + wipp, 0);
      return;
    }

    if (a.phase === 'spur') {
      blasenspur(g, def, a);
      wellen(g, def, a.bx, a.by, 2, 0.8 + u01(a.t / a.spur), 0.55);
      const zucken = a.t / a.spur > 0.75 ? Math.round(Math.sin(S.t * 30)) : 0;
      schnur(g, l.tx, l.ty, a.bx + zucken, a.by - 3, 1.6 + 0.08 * Math.hypot(a.bx - l.tx, a.by - l.ty));
      schwimmer(g, a.bx + zucken, a.by, 0);
      return;
    }

    if (a.phase === 'biss') {
      // Der Schwimmer taucht ab, das Wasser spritzt, über dem Kopf der Figur steht ein „!"
      const zittern = Math.round(Math.sin(S.t * 50));
      wellen(g, def, a.bx, a.by, 3, 1.8, 0.7);
      krone(g, a.bx, a.by, a.t);
      schnur(g, l.tx, l.ty, a.bx + zittern, a.by + 1, 0.8);
      schwimmer(g, a.bx + zittern, a.by, 2);
      ausruf(g, sp.x, sp.y - 26, a.t);
      return;
    }

    if (a.phase === 'einholen') {
      krone(g, a.bx, a.by, a.t, 0.8);
      const zielX = sp.x;
      const zielY = sp.y - 30;
      if (a.fang) {
        // Der Fang fliegt im Bogen zur Figur
        const x = lerp(a.bx, zielX, aus(p));
        const y = lerp(a.by - 4, zielY, aus(p)) - Math.sin(p * Math.PI) * (16 + Math.abs(zielY - a.by) * 0.1);
        schnur(g, l.tx, l.ty, x, y, 1.5);
        bildZeichnen(g, fangBild(a.fang), x, y, Math.floor(a.t * 14) % 2 === 1);
        if (a.fang.art === 'schatz' || a.fang.q > 0 || a.fang.perfekt) funkeln(g, x, y, 3);
      } else {
        // Leer: der Schwimmer springt zurück zur Rutenspitze
        const x = lerp(a.bx, l.tx, aus(p));
        const y = lerp(a.by, l.ty, aus(p)) - Math.sin(p * Math.PI) * 10;
        schnur(g, l.tx, l.ty, x, y, 1.5 * (1 - p));
        schwimmer(g, x, y, 0, p < 0.1);
      }
      return;
    }

    if (a.phase === 'fang' && a.fang) {
      // Der Fang über dem Kopf, bevor er verblasst
      const bob = Math.round(Math.sin(S.t * 7) * 1);
      const y = sp.y - 31 + bob;
      g.globalAlpha = a.t > ANGELN.fangZeit - 0.15 ? Math.max(0, (ANGELN.fangZeit - a.t) / 0.15) : 1;
      bildZeichnen(g, fangBild(a.fang), sp.x, y);
      g.globalAlpha = 1;
      funkeln(g, sp.x, y, a.fang.art === 'schatz' || a.fang.q > 0 || a.fang.perfekt ? 4 : 2);
    }
  },
});
