// Höhlen-Mechanik: Höhlenform per zellulärem Automaten, Monster-Register, Monster-KI und Geschosse.
// Was in einer Ebene liegt (Steine, Erze, Schätze, welche Monster wo), legt der Bereich „mine"
// fest (bereiche/mine/). Alles hier ist DOM-frei und ohne Laufzeitzustand: die KI bekommt die
// Spielerin, eine Begehbarkeitsprüfung und einen Zufall und gibt Bewegung und Wünsche zurück.

import { T } from './daten.js';

export const MONSTER = {};
export const MONSTER_KI = {};

/**
 * monster(id, { name, hp, schaden, verteidigung, tempo, xp, farbe, art, ki, fliegt, durchWand,
 *   schwer (0..1, weniger Rückstoß), radius (Berührung in px), geschoss, beute: [[id, chance, von, bis]…] })
 * `art` wählt das Bild, `ki` das Verhalten (Standard: `art`, sonst über `MONSTER_KI`);
 * eigenes Verhalten geht weiter über `schritt(m, dt, spieler, frei)`.
 */
export function monster(id, def) {
  const { ersetzen, ...d } = def;
  if (MONSTER[id] && !ersetzen) throw new Error(`Monster „${id}" gibt es schon.`);
  MONSTER[id] = { id, verteidigung: 0, schwer: 0, radius: 10, ...d };
  return MONSTER[id];
}

/** monsterKI(name, (m, dt, u) => …) – Verhalten; u siehe `monsterSchritt`. Setzt m.vx/m.vy (px/s). */
export function monsterKI(name, fn, opt = {}) {
  if (MONSTER_KI[name] && !opt.ersetzen) throw new Error(`Monster-KI „${name}" gibt es schon.`);
  MONSTER_KI[name] = fn;
}

function automat(r, W, H, dichte) {
  let g = [];
  for (let y = 0; y < H; y++) {
    g.push([]);
    for (let x = 0; x < W; x++) {
      const rand = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      g[y].push(rand || r() < dichte);
    }
  }
  for (let runde = 0; runde < 4; runde++) {
    const neu = g.map((z) => z.slice());
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[y + dy][x + dx]) n++;
        neu[y][x] = n >= 5;
      }
    }
    g = neu;
  }
  return g;
}

function groessteFlaeche(g, W, H) {
  const gesehen = new Uint8Array(W * H);
  let beste = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (g[y][x] || gesehen[y * W + x]) continue;
      const flaeche = [];
      const offen = [[x, y]];
      gesehen[y * W + x] = 1;
      while (offen.length) {
        const [cx, cy] = offen.pop();
        flaeche.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (g[ny][nx] || gesehen[ny * W + nx]) continue;
          gesehen[ny * W + nx] = 1;
          offen.push([nx, ny]);
        }
      }
      if (flaeche.length > beste.length) beste = flaeche;
    }
  }
  return beste;
}

/**
 * Gräbt eine Höhle: größte zusammenhängende Fläche, alles andere Fels.
 * Ergebnis: { grid (Zeilen aus boden/'#'), flaeche: [[x, y]…], offen(x, y) }.
 */
export function hoehleGraben(r, { breite = 26, hoehe = 20, dichte = 0.43, mindestens = 150, boden = 'm' } = {}) {
  let g;
  let flaeche;
  for (let versuch = 0; versuch < 30; versuch++) {
    g = automat(r, breite, hoehe, dichte);
    flaeche = groessteFlaeche(g, breite, hoehe);
    if (flaeche.length >= mindestens) break;
  }
  const inFlaeche = new Uint8Array(breite * hoehe);
  for (const [x, y] of flaeche) inFlaeche[y * breite + x] = 1;
  const grid = [];
  for (let y = 0; y < hoehe; y++) {
    let z = '';
    for (let x = 0; x < breite; x++) z += inFlaeche[y * breite + x] ? boden : '#';
    grid.push(z);
  }
  return { grid, flaeche, offen: (x, y) => x >= 0 && y >= 0 && x < breite && y < hoehe && inFlaeche[y * breite + x] === 1 };
}

export function neuesMonster(typ, tx, ty, r = Math.random) {
  const d = MONSTER[typ];
  return {
    typ, x: tx * T + T / 2, y: ty * T + T / 2 + 2, hp: d.hp, max: d.hp,
    vx: 0, vy: 0, uhr: r() * 1.5, phase: d.getarnt ? 'getarnt' : 'ruhe', stoss: 0, blitz: 0, anim: r() * 10,
    blick: r() < 0.5 ? -1 : 1, abk: 1 + r() * 2, unverw: 0, alpha: 1, panzer: d.verteidigung,
  };
}

// ─── Verhalten ──────────────────────────────────────────────────────────────

const jagdWeite = 9 * T;

/** Hüpfer (Schleime, Rußwichtel): sammeln sich, springen ab, landen. */
monsterKI('huepfer', (m, dt, u) => {
  const { d } = u;
  m.uhr -= dt;
  const pause = d.pause ?? [0.5, 1.2];
  const sprung = d.sprung ?? 0.38;
  if (m.phase === 'ruhe' && m.uhr <= 0) {
    m.phase = 'sammeln';
    m.uhr = d.sammeln ?? 0.18;
  } else if (m.phase === 'sammeln' && m.uhr <= 0) {
    m.phase = 'sprung';
    m.uhr = sprung;
    const streu = d.unruhig ? (u.r() - 0.5) * 1.6 : (u.r() - 0.5) * 0.4;
    const ziel = u.jagt ? Math.atan2(u.dy, u.dx) + streu : u.r() * Math.PI * 2;
    m.vx = Math.cos(ziel) * d.tempo * 2.2;
    m.vy = Math.sin(ziel) * d.tempo * 2.2;
  } else if (m.phase === 'sprung' && m.uhr <= 0) {
    m.phase = 'ruhe';
    m.uhr = pause[0] + u.r() * (pause[1] - pause[0]);
    m.vx = 0;
    m.vy = 0;
    m.gelandet = 0.15;
  }
  if (m.gelandet > 0) m.gelandet -= dt;
});

/** Flatterer (Fledermäuse): in Wellen auf die Spielerin zu; manche stürzen sich zwischendurch hinab. */
monsterKI('flatterer', (m, dt, u) => {
  const { d } = u;
  if (m.phase === 'sturz') {
    m.uhr -= dt;
    if (m.uhr <= 0) { m.phase = 'ruhe'; m.abk = 2.5 + u.r() * 2; }
    return;
  }
  m.abk -= dt;
  if (d.sturz && u.jagt && u.dist < 5 * T && m.abk <= 0) {
    m.phase = 'sturz';
    m.uhr = 0.55;
    const w = Math.atan2(u.dy, u.dx);
    m.vx = Math.cos(w) * d.tempo * 2.4;
    m.vy = Math.sin(w) * d.tempo * 2.4;
    return;
  }
  const winkel = u.jagt ? Math.atan2(u.dy, u.dx) + Math.sin(m.anim * 3) * 0.6 : m.anim * 0.8;
  m.vx = Math.cos(winkel) * d.tempo;
  m.vy = Math.sin(winkel) * d.tempo;
});

/** Tarner (Felsenkrabbe, Pilzling): reglos wie ein Stein, bis man zu nah kommt oder zuschlägt. */
monsterKI('tarner', (m, dt, u) => {
  const { d } = u;
  if (m.phase === 'getarnt') {
    m.vx = 0;
    m.vy = 0;
    if (u.dist < (d.weckWeite ?? 1.4) * T || m.geweckt) { m.phase = 'aufwachen'; m.uhr = 0.45; }
    return;
  }
  m.uhr -= dt;
  if (m.phase === 'aufwachen') { if (m.uhr <= 0) { m.phase = 'laufen'; m.uhr = 0.6; } return; }
  if (m.phase === 'laufen') {
    const w = Math.atan2(u.dy, u.dx);
    m.vx = Math.cos(w) * d.tempo;
    m.vy = Math.sin(w) * d.tempo;
    if (m.uhr <= 0) { m.phase = 'pause'; m.uhr = 0.25 + u.r() * 0.3; }
  } else {
    m.vx = 0;
    m.vy = 0;
    if (m.uhr <= 0) { m.phase = 'laufen'; m.uhr = 0.6 + u.r() * 0.6; }
  }
});

/** Kriecher (Larve, Metallkopf): stetig heran, wenn nah; sonst ziellos. */
monsterKI('kriecher', (m, dt, u) => {
  const { d } = u;
  m.uhr -= dt;
  if (u.jagt) {
    const w = Math.atan2(u.dy, u.dx) + Math.sin(m.anim * 2.2) * 0.35;
    m.vx = Math.cos(w) * d.tempo;
    m.vy = Math.sin(w) * d.tempo;
  } else if (m.uhr <= 0) {
    m.uhr = 1 + u.r() * 2;
    const w = u.r() * Math.PI * 2;
    const geht = u.r() < 0.6;
    m.vx = geht ? Math.cos(w) * d.tempo * 0.5 : 0;
    m.vy = geht ? Math.sin(w) * d.tempo * 0.5 : 0;
  }
});

/** Anläufer (Käfer): schleicht, zielt kurz und stürmt dann geradeaus los. */
monsterKI('anlauf', (m, dt, u) => {
  const { d } = u;
  m.uhr -= dt;
  m.abk -= dt;
  if (m.phase === 'zielen') {
    m.vx = 0;
    m.vy = 0;
    if (m.uhr <= 0) {
      m.phase = 'sturm';
      m.uhr = 0.7;
      m.vx = Math.cos(m.winkel) * d.tempo * 3.4;
      m.vy = Math.sin(m.winkel) * d.tempo * 3.4;
    }
    return;
  }
  if (m.phase === 'sturm') {
    if (m.uhr <= 0 || m.prallte) { m.phase = 'ruhe'; m.uhr = 0.8; m.abk = 1.5 + u.r(); m.vx = 0; m.vy = 0; m.prallte = false; }
    return;
  }
  if (u.jagt && u.dist < 5.5 * T && m.abk <= 0 && u.sichtfrei()) {
    m.phase = 'zielen';
    m.uhr = 0.6;
    m.winkel = Math.atan2(u.dy, u.dx);
    return;
  }
  if (m.uhr <= 0) {
    m.uhr = 0.8 + u.r();
    const w = u.jagt ? Math.atan2(u.dy, u.dx) : u.r() * Math.PI * 2;
    m.vx = Math.cos(w) * d.tempo * 0.6;
    m.vy = Math.sin(w) * d.tempo * 0.6;
  }
});

/** Geist: schwebt durch Wände heran, wird mal blasser, mal deutlicher. */
monsterKI('geist', (m, dt, u) => {
  const { d } = u;
  m.alpha = 0.55 + Math.sin(m.anim * 1.7) * 0.3;
  const w = u.jagt || u.dist < 14 * T ? Math.atan2(u.dy, u.dx) + Math.sin(m.anim * 1.3) * 0.8 : m.anim * 0.4;
  const v = d.tempo * (0.7 + Math.max(0, Math.sin(m.anim * 0.9)) * 0.8);
  m.vx = Math.cos(w) * v;
  m.vy = Math.sin(w) * v;
});

/** Werfer (Skelett, Schattenschamane): hält Abstand und wirft, wenn die Sicht frei ist. */
monsterKI('werfer', (m, dt, u) => {
  const { d } = u;
  m.uhr -= dt;
  m.abk -= dt;
  if (m.phase === 'werfen') {
    m.vx = 0;
    m.vy = 0;
    if (m.uhr <= 0) {
      m.phase = 'ruhe';
      const w = Math.atan2(u.dy - 6, u.dx);
      const v = d.wurfTempo ?? 120;
      u.schiessen({ art: d.geschoss || 'knochen', x: m.x, y: m.y - 8, vx: Math.cos(w) * v, vy: Math.sin(w) * v, schaden: d.wurfSchaden ?? d.schaden, t: 0 });
    }
    return;
  }
  if (u.jagt && m.abk <= 0 && u.dist < 7 * T && u.sichtfrei()) {
    m.phase = 'werfen';
    m.uhr = 0.35;
    m.abk = (d.wurfPause ?? 2.4) + u.r() * 0.8;
    return;
  }
  if (!u.jagt) {
    if (m.uhr <= 0) { m.uhr = 1 + u.r() * 1.5; const w = u.r() * Math.PI * 2; m.vx = Math.cos(w) * d.tempo * 0.4; m.vy = Math.sin(w) * d.tempo * 0.4; }
    return;
  }
  const w = Math.atan2(u.dy, u.dx);
  const richtung = u.dist < 3 * T ? -1 : u.dist > 5 * T ? 1 : 0;
  const quer = Math.sin(m.anim * 0.7) > 0 ? 1 : -1;
  m.vx = (Math.cos(w) * richtung + -Math.sin(w) * quer * 0.5) * d.tempo;
  m.vy = (Math.sin(w) * richtung + Math.cos(w) * quer * 0.5) * d.tempo;
});

/** Springer (Schattenwesen): läuft heran und verschwindet, um hinter der Spielerin aufzutauchen. */
monsterKI('springer', (m, dt, u) => {
  const { d } = u;
  m.uhr -= dt;
  m.abk -= dt;
  if (m.phase === 'weg') {
    m.alpha = Math.max(0, m.uhr / 0.3);
    if (m.uhr <= 0) {
      const ziel = u.platzNahe(2);
      if (ziel) { m.x = ziel.x; m.y = ziel.y; }
      m.phase = 'auftauchen';
      m.uhr = 0.35;
      m.sprungAus = true;
    }
    m.vx = 0;
    m.vy = 0;
    return;
  }
  if (m.phase === 'auftauchen') {
    m.alpha = 1 - Math.max(0, m.uhr / 0.35);
    m.vx = 0;
    m.vy = 0;
    if (m.uhr <= 0) { m.phase = 'ruhe'; m.alpha = 1; }
    return;
  }
  if (u.jagt && u.dist > 3.5 * T && m.abk <= 0) {
    m.phase = 'weg';
    m.uhr = 0.3;
    m.abk = 4 + u.r() * 2;
    m.sprungEin = true;
    return;
  }
  const w = u.jagt ? Math.atan2(u.dy, u.dx) : m.anim * 0.5;
  m.vx = Math.cos(w) * d.tempo * (u.jagt ? 1 : 0.4);
  m.vy = Math.sin(w) * d.tempo * (u.jagt ? 1 : 0.4);
});

// Alte Namen (art) als Verhalten
MONSTER_KI.schleim = MONSTER_KI.huepfer;
MONSTER_KI.fledermaus = MONSTER_KI.flatterer;

/**
 * Hat die Linie zwischen zwei Punkten freie Sicht (keine Wand)? Prüft in 6-px-Schritten.
 */
export function sichtFrei(x0, y0, x1, y1, frei) {
  const l = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(l / 6));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (!frei(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, true)) return false;
  }
  return true;
}

/**
 * Ein Schritt Monster-Verhalten. `frei(px, py, fliegt)` sagt, ob ein Punkt begehbar ist.
 * `extra`: { r, schiessen(geschoss), platzNahe(felder) → { x, y } | null, breite, hoehe } (Weltgröße in px).
 * Gibt true zurück, wenn das Monster die Spielerin berührt.
 */
export function monsterSchritt(m, dt, spieler, frei, extra = {}) {
  const d = MONSTER[m.typ];
  if (d.schritt) return d.schritt(m, dt, spieler, frei);
  const r = extra.r || Math.random;
  m.anim += dt;
  if (m.blitz > 0) m.blitz -= dt;
  if (m.unverw > 0) m.unverw -= dt;
  if (m.betaeubt > 0) m.betaeubt -= dt;
  const dx = spieler.x - m.x;
  const dy = spieler.y - m.y;
  const dist = Math.hypot(dx, dy) || 1;
  const u = {
    d, r, dx, dy, dist, jagt: dist < (d.jagdWeite ?? jagdWeite),
    schiessen: extra.schiessen || (() => {}),
    platzNahe: extra.platzNahe || (() => null),
    sichtfrei: () => sichtFrei(m.x, m.y - 6, spieler.x, spieler.y - 6, frei),
  };

  if (m.stoss > 0) {
    m.stoss -= dt;
    m.vx *= Math.max(0, 1 - dt * 6);
    m.vy *= Math.max(0, 1 - dt * 6);
  } else if (m.betaeubt > 0) {
    m.vx = 0;
    m.vy = 0;
  } else {
    (MONSTER_KI[d.ki ?? d.art] ?? MONSTER_KI.huepfer)(m, dt, u);
  }
  if (Math.abs(m.vx) > 4) m.blick = m.vx < 0 ? -1 : 1;

  const durch = d.durchWand && m.stoss <= 0;
  const nx = m.x + m.vx * dt;
  const ny0 = m.y;
  if (durch ? innen(nx, ny0, extra) : frei(nx, ny0, d.fliegt)) m.x = nx; else { m.vx = -m.vx * 0.5; m.prallte = true; }
  const ny = m.y + m.vy * dt;
  if (durch ? innen(m.x, ny, extra) : frei(m.x, ny, d.fliegt)) m.y = ny; else { m.vy = -m.vy * 0.5; m.prallte = true; }

  if (m.phase === 'getarnt' || m.phase === 'aufwachen' || m.phase === 'weg' || (m.alpha ?? 1) < 0.25) return false;
  return Math.hypot(spieler.x - m.x, spieler.y - 4 - m.y) < d.radius + 1;
}

function innen(px, py, extra) {
  if (!extra.breite) return true;
  return px > 8 && py > 8 && px < extra.breite - 8 && py < extra.hoehe - 4;
}

/**
 * Ein Schritt eines Geschosses ({ x, y, vx, vy, t, schaden, art }). Gibt 'weg' zurück, wenn es an
 * eine Wand prallt oder zu alt ist, 'treffer', wenn es die Spielerin trifft, sonst undefined.
 */
export function geschossSchritt(g, dt, spieler, frei) {
  g.t += dt;
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  if (g.t > 3 || !frei(g.x, g.y + 6, true)) return 'weg';
  if (Math.hypot(spieler.x - g.x, spieler.y - 10 - g.y) < 8) return 'treffer';
  return undefined;
}
