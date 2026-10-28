// Bereich „mine" – Zeichner des Kampfs: Monster (Schatten, Sprünge, Spiegeln, Treffer-Blitz, Lebensbalken,
// Betäubung), Geschosse, Bomben, Explosionen und Stampfer-Wellen, brodelnde Lava, Lichtquellen (Lava,
// Glut, Leuchtring) und die Schwünge der drei Waffenarten samt Spezialzügen (schwungKunst).

import { MONSTER } from '../../mine.js';
import { monsterBild, gecacht, leinwand, gespiegelt, itemBild } from '../../sprites.js';
import { zeichner, schatten, lichtQuelle, schwungKunst } from '../../render.js';
import { S } from '../../spiel.js';
import { hash } from '../../zufall.js';
import { KAMPF } from './kampf.js';
import { ringLicht } from './ringe.js';

const T = 16;

/** Bildphase eines Monsters aus seinem Zustand (siehe kunst-monster.js). */
export function monsterPhase(m, d) {
  const laeuft = Math.hypot(m.vx, m.vy) > 3;
  switch (d.art) {
    case 'schleim': return m.phase === 'sammeln' ? 2 : m.phase === 'sprung' ? 3 : Math.floor(m.anim * 2.5) % 2;
    case 'fledermaus': return Math.floor(m.anim * (m.phase === 'sturz' ? 16 : 10)) % 3;
    case 'krabbe': case 'pilzling':
      return m.phase === 'getarnt' ? 0 : m.phase === 'aufwachen' ? 1 : laeuft ? 2 + (Math.floor(m.anim * 8) % 2) : 2;
    case 'larve': return Math.floor(m.anim * 4) % 2;
    case 'kaefer': return m.phase === 'zielen' ? 2 : m.phase === 'sturm' ? (Math.floor(m.anim * 12) % 2 ? 3 : 2) : Math.floor(m.anim * 6) % 2;
    case 'geist': return Math.floor(m.anim * 3) % 2;
    case 'skelett': case 'schamane': return m.phase === 'werfen' ? 2 : laeuft ? Math.floor(m.anim * 6) % 2 : 0;
    case 'schatten': return m.phase === 'weg' || m.phase === 'auftauchen' ? 2 : laeuft ? Math.floor(m.anim * 6) % 2 : 0;
    case 'wichtel': return m.phase === 'sprung' ? 1 : 0;
    case 'metallkopf': return laeuft ? Math.floor(m.anim * 5) % 2 : 0;
    default: return Math.floor(m.anim * 3) % 2;
  }
}

/** Monsterbild in Blickrichtung (nach rechts gespiegelt) und als weiße Silhouette für den Treffer-Blitz. */
function monsterLeinwand(m, d, phase, weiss = false) {
  const rechts = m.blick > 0 && d.art !== 'schleim';
  return gecacht(`mine_mon:${m.typ}:${phase}:${rechts ? 1 : 0}:${weiss ? 1 : 0}`, () => {
    let c = monsterBild(m.typ, d.farbe, d.art, phase);
    if (rechts) c = gespiegelt(c);
    if (!weiss) return c;
    const [w, g] = leinwand(c.width, c.height);
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    return w;
  }, [16, 16]);
}

/** Höhe über dem Boden (Sprünge, Flug). */
function hoeheVon(m, d) {
  if (d.fliegt) return (d.art === 'geist' ? 6 : 8) + Math.sin(m.anim * 4) * 2;
  if (m.phase === 'sprung') {
    const dauer = d.sprung ?? 0.38;
    return Math.sin(Math.max(0, Math.min(1, 1 - m.uhr / dauer)) * Math.PI) * (d.art === 'wichtel' ? 7 : 5);
  }
  return 0;
}

zeichner({
  name: 'monster', ebene: 'welt', reihe: 80,
  sammeln(ort, v) {
    const teile = [];
    for (const m of S.monster) {
      if (!v.imBild(m.x - 14, m.y - 44, 28, 48)) continue;
      const d = MONSTER[m.typ];
      const phase = monsterPhase(m, d);
      teile.push({ y: m.y, f: (g) => {
        const bild = monsterLeinwand(m, d, phase);
        const hoch = hoeheVon(m, d);
        const alpha = m.alpha ?? 1;
        if (alpha <= 0.02) return;
        const rx = Math.max(4, bild.width / 2 - 2 - hoch * 0.2);
        if (m.phase !== 'getarnt') schatten(g, m.x, m.y, rx, 2);
        const x = Math.round(m.x - bild.width / 2);
        const y = Math.round(m.y - bild.height + 1 - hoch);
        g.globalAlpha = alpha;
        g.drawImage(bild, x, y);
        if (m.blitz > 0) { g.globalAlpha = Math.min(1, m.blitz * 6) * 0.85 * alpha; g.drawImage(monsterLeinwand(m, d, phase, true), x, y); }
        g.globalAlpha = 1;
        if (m.betaeubt > 0) {
          g.fillStyle = '#f8e070';
          for (let i = 0; i < 2; i++) {
            const a = S.t * 6 + i * Math.PI;
            g.fillRect(Math.round(m.x + Math.cos(a) * 5), Math.round(y - 3 + Math.sin(a) * 1.5), 1, 1);
          }
        }
        if (m.hp < m.max && m.phase !== 'getarnt') {
          const bx = Math.round(m.x - 8);
          const by = y - 4;
          g.fillStyle = '#1a1018'; g.fillRect(bx - 1, by - 1, 18, 4);
          g.fillStyle = '#5a2a2a'; g.fillRect(bx, by, 16, 2);
          const anteil = Math.max(0, m.hp / m.max);
          g.fillStyle = anteil > 0.5 ? '#7cc25a' : anteil > 0.25 ? '#f2b23a' : '#e8504a';
          g.fillRect(bx, by, Math.max(1, Math.round(16 * anteil)), 2);
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(bx, by, Math.round(16 * anteil), 1);
        }
      } });
    }
    // Bomben liegen in der Welt und werden mit sortiert
    for (const b of KAMPF.bomben) {
      const x = b.x * T;
      const y = b.y * T;
      if (!v.imBild(x, y - 8, 16, 24)) continue;
      teile.push({ y: y + 13, f: (g) => {
        const rest = b.zuender - b.t;
        const puls = rest < 0.6 ? 1 + Math.sin(b.t * 40) * 0.06 : 1;
        const bild = itemBild({ id: b.id });
        schatten(g, x + 8, y + 13, 5, 2);
        g.drawImage(bild, Math.round(x + 8 - 8 * puls), Math.round(y + 13 - 16 * puls), Math.round(16 * puls), Math.round(16 * puls));
        if (Math.floor(b.t * (rest < 0.6 ? 16 : 8)) % 2) {
          g.fillStyle = '#fff3b0'; g.fillRect(x + 11, y - 1, 2, 2);
          g.fillStyle = '#f8904a'; g.fillRect(x + 12, y - 2, 1, 1);
        }
        if (rest < 0.6) { g.globalAlpha = 0.25 + 0.25 * Math.sin(b.t * 40); g.fillStyle = '#ff4a3a'; g.beginPath(); g.arc(x + 8, y + 8, 6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
      } });
    }
    // Geschosse
    for (const s of KAMPF.geschosse) {
      if (!v.imBild(s.x - 6, s.y - 6, 12, 12)) continue;
      teile.push({ y: s.y + 10, f: (g) => geschossZeichnen(g, s) });
    }
    return teile;
  },
});

function geschossZeichnen(g, s) {
  schatten(g, s.x, s.y + 10, 3, 1);
  if (s.art === 'feuer') {
    for (let i = 3; i >= 1; i--) {
      g.fillStyle = ['#f8f0c0', '#f8d070', '#f8904a', '#e8502a'][i];
      g.beginPath(); g.arc(s.x - s.vx * 0.012 * i, s.y - s.vy * 0.012 * i, 1 + i * 1.1, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2);
    return;
  }
  g.save();
  g.translate(s.x, s.y);
  g.rotate(s.t * 14);
  g.fillStyle = '#ece4d0';
  g.fillRect(-4, -1, 8, 2);
  g.fillRect(-5, -2, 2, 2); g.fillRect(-5, 0, 2, 2); g.fillRect(3, -2, 2, 2); g.fillRect(3, 0, 2, 2);
  g.fillStyle = '#b8ac90'; g.fillRect(-4, 0, 8, 1);
  g.restore();
}

/** Explosionen und Stampfer-Wellen über der Welt. */
zeichner({
  name: 'mine_explosion', ebene: 'ueber', reihe: 25,
  zeichnen(g) {
    for (const e of KAMPF.explosionen) {
      // Feuerballen, die nach außen quellen und zu Rauch werden; dazu die Druckwelle
      const p = Math.min(1, e.t / 0.45);
      const farben = ['#fff8d0', '#f8d070', '#f8904a', '#e8502a', '#7a6060', '#5a4a4a'];
      const stufe = Math.min(farben.length - 1, Math.floor(e.t / 0.11));
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + e.r;
        const d = e.r * 0.55 * Math.sqrt(p) * (0.6 + 0.4 * ((i * 7) % 5) / 4);
        const rr = (e.r * 0.28) * (1 - p * 0.45) * (0.7 + ((i * 3) % 4) / 8);
        g.globalAlpha = Math.max(0, 1 - e.t / 0.7);
        g.fillStyle = farben[Math.min(farben.length - 1, stufe + (i % 2))];
        g.beginPath(); g.arc(Math.round(e.x + Math.cos(a) * d), Math.round(e.y - 4 + Math.sin(a) * d * 0.75 - p * 6), rr, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = farben[stufe];
      g.beginPath(); g.arc(e.x, e.y - 4 - p * 4, e.r * 0.3 * (1 - p * 0.6), 0, Math.PI * 2); g.fill();
      if (e.t < 0.3) {
        g.globalAlpha = 1 - e.t / 0.3;
        g.strokeStyle = '#fff3b0';
        g.lineWidth = 2;
        g.beginPath(); g.ellipse(e.x, e.y, e.r * (0.4 + p * 1.2), e.r * (0.4 + p * 1.2) * 0.6, 0, 0, Math.PI * 2); g.stroke();
      }
    }
    for (const w of KAMPF.wellen) {
      const p = w.t / 0.5;
      g.globalAlpha = Math.max(0, 0.8 - p);
      g.strokeStyle = '#e8d0a0';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(w.x, w.y, w.r * p, w.r * p * 0.55, 0, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1;
  },
});

/** Lava brodelt: kleine Blasen auf sichtbaren Lavafeldern. */
zeichner({
  name: 'mine_lava', ebene: 'boden', reihe: 15,
  zeichnen(g, kamera, ort, v) {
    const def = ort.def;
    if (def.schicht !== 2) return;
    for (let ty = Math.max(0, v.y0); ty <= Math.min(def.h - 1, v.y1); ty++) {
      const zeile = def.grid[ty];
      for (let tx = Math.max(0, v.x0); tx <= Math.min(def.w - 1, v.x1); tx++) {
        if (zeile[tx] !== 'z') continue;
        const p = (S.t * 0.7 + hash(tx, ty, 5)) % 1;
        if (p > 0.35) continue;
        const r = p < 0.3 ? 0.5 + p * 5 : 2.5;
        const x = tx * T + 3 + Math.floor(hash(tx, ty, 6) * 10);
        const y = ty * T + 3 + Math.floor(hash(tx, ty, 7) * 10);
        g.fillStyle = p < 0.3 ? '#f8d070' : '#fff0c0';
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    }
  },
});

// ─── Licht ──────────────────────────────────────────────────────────────────

lichtQuelle((ort, v) => {
  const q = [];
  const def = ort.def;
  if (def.schicht === 2) {
    for (let ty = Math.max(0, v.y0 - 2); ty <= Math.min(def.h - 1, v.y1 + 2); ty++) {
      const zeile = def.grid[ty];
      for (let tx = Math.max(0, v.x0 - 2); tx <= Math.min(def.w - 1, v.x1 + 2); tx++) {
        if (zeile[tx] === 'z' && (tx + ty) % 2 === 0) q.push({ x: tx * T + 8, y: ty * T + 8, r: 1.6, warm: true });
      }
    }
  }
  for (const b of KAMPF.bomben) q.push({ x: b.x * T + 12, y: b.y * T, r: 0.9, warm: true });
  for (const e of KAMPF.explosionen) if (e.t < 0.4) q.push({ x: e.x, y: e.y, r: (e.r / T) * 1.6 * (1 - e.t / 0.4), warm: true });
  for (const s of KAMPF.geschosse) if (s.art === 'feuer') q.push({ x: s.x, y: s.y, r: 1.4, warm: true });
  for (const m of S.monster) if (m.typ === 'lavaschleim' || m.typ === 'schattenschamane') q.push({ x: m.x, y: m.y - 8, r: 1.4, warm: true });
  const licht = v.s ? ringLicht(v.s) : 0;
  if (licht > 0) q.push({ x: S.sp.x, y: S.sp.y - 8, r: (def.innen === 'mine' ? 5.5 : 3) + licht, warm: true });
  return q;
});

// ─── Schwünge ───────────────────────────────────────────────────────────────

/** Hand der Spielerin je Blickrichtung; links wird gespiegelt gezeichnet. */
function hand(sp) {
  switch (sp.blick) {
    case 'rechts': return { hx: sp.x + 3, hy: sp.y - 11, sp: false, dir: 0 };
    case 'links': return { hx: sp.x - 3, hy: sp.y - 11, sp: true, dir: 0 };
    case 'unten': return { hx: sp.x + 3, hy: sp.y - 9, sp: false, dir: Math.PI / 2 };
    default: return { hx: sp.x - 2, hy: sp.y - 15, sp: false, dir: -Math.PI / 2 };
  }
}

/** Bogenwinkel (von, bis) je Blickrichtung; der Winkel dreht das Bild (Klinge zeigt bei 0 nach oben rechts). */
const BOGEN = {
  schwert: { rechts: [-2.3, 0.9], links: [-2.3, 0.9], unten: [-1.5, 1.7], oben: [0.3, -2] },
  keule: { rechts: [-2.7, 1.0], links: [-2.7, 1.0], unten: [-1.9, 1.8], oben: [0.6, -2.2] },
};

function bogenSchwung(g, a, sp, bild, art, p, spurFarbe) {
  const h = hand(sp);
  const [von, bis] = BOGEN[art][sp.blick];
  g.translate(Math.round(h.hx), Math.round(h.hy));
  if (h.sp) g.scale(-1, 1);
  const w = von + (bis - von) * p;
  if (p > 0.08 && p < 0.98) {
    g.globalAlpha = 0.5 * (1 - Math.abs(p - 0.55));
    g.strokeStyle = spurFarbe;
    g.lineWidth = art === 'keule' ? 3 : 2;
    g.beginPath();
    const r0 = Math.min(von, w) - Math.PI / 4;
    const r1 = Math.max(von, w) - Math.PI / 4;
    g.arc(0, 0, art === 'keule' ? 13 : 14, Math.max(r0, r1 - 1.8), r1);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.rotate(w);
  g.drawImage(bild, -3, -13);
}

function stoss(g, sp, bild, weite) {
  const h = hand(sp);
  g.translate(Math.round(h.hx), Math.round(h.hy));
  if (h.sp) g.scale(-1, 1);
  g.rotate(h.dir);
  g.translate(Math.round(weite) - 2, 0);
  g.rotate(Math.PI / 4);
  g.drawImage(bild, -3, -13);
}

const easeIn = (p) => p * p;

schwungKunst('waffe', (g, a, sp, bild) => {
  const p = Math.min(1, a.t / a.dauer);
  if (a.spezial === 'block') {
    const h = hand(sp);
    g.save();
    g.translate(Math.round(h.hx), Math.round(h.hy));
    if (h.sp) g.scale(-1, 1);
    g.rotate(h.dir);
    // Klinge quer vor dem Körper
    g.translate(5, 0);
    g.rotate(-Math.PI / 4 - Math.PI / 2 + 0.2);
    g.drawImage(bild, -3, -13);
    g.restore();
    const [dx, dy] = { rechts: [1, 0], links: [-1, 0], unten: [0, 1], oben: [0, -1] }[sp.blick];
    g.globalAlpha = 0.35 + 0.25 * Math.sin(a.t * 30);
    g.strokeStyle = '#bfe8ff';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(sp.x + dx * 4, sp.y - 9 + dy * 4, 12, Math.atan2(dy, dx) - 1.1, Math.atan2(dy, dx) + 1.1);
    g.stroke();
    g.globalAlpha = 1;
    return;
  }
  bogenSchwung(g, a, sp, bild, 'schwert', p, '#ffffff');
});

schwungKunst('mine_dolch', (g, a, sp, bild) => {
  if (a.spezial === 'hagel') {
    const q = (a.t * 7.7) % 1;
    stoss(g, sp, bild, 3 + Math.sin(q * Math.PI) * 8);
    return;
  }
  const p = Math.min(1, a.t / a.dauer);
  stoss(g, sp, bild, 2 + Math.sin(p * Math.PI) * 7);
});

schwungKunst('mine_keule', (g, a, sp, bild) => {
  if (a.spezial === 'stampfer') {
    // hoch über den Kopf heben, dann auf den Boden schmettern
    const h = hand(sp);
    g.translate(Math.round(h.hx), Math.round(h.hy - (a.t < 0.5 ? a.t * 6 : 0)));
    if (h.sp) g.scale(-1, 1);
    const w = a.t < 0.5 ? -0.6 - (a.t / 0.5) * 1.6 : a.t < 0.58 ? -2.2 + ((a.t - 0.5) / 0.08) * 3.4 : 1.2;
    g.rotate(w);
    g.drawImage(bild, -3, -13);
    return;
  }
  const p = Math.min(1, a.t / a.dauer);
  bogenSchwung(g, a, sp, bild, 'keule', easeIn(p), '#e8d0a0');
});
