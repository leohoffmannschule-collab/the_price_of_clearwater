// Bereich „berg" – Zeichner: der Wasserfall fließt (helle Streifen laufen herab) und stäubt am Fuß.
// Im Winter steht er still als Eis und glitzert nur.

import { zeichner } from '../../render.js';
import { hash } from '../../zufall.js';

const T = 16;
const cache = new WeakMap();

/** Alle Wasserfall-Felder der Karte: [tx, ty, Fuß?]. */
function faelleVon(def) {
  let l = cache.get(def);
  if (l) return l;
  l = [];
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) if (def.grid[y][x] === 'v') l.push([x, y, def.grid[y + 1]?.[x] !== 'v']);
  }
  cache.set(def, l);
  return l;
}

zeichner({
  name: 'berg_wasserfall', ebene: 'boden', reihe: 12,
  zeichnen(g, kamera, ort, v) {
    if (ort.def.id !== 'berg') return;
    const winter = v.jz === 'winter';
    const t = v.t;
    for (const [tx, ty, fuss] of faelleVon(ort.def)) {
      if (!v.sichtbar(tx, ty)) continue;
      const x0 = tx * T;
      const y0 = ty * T;
      if (winter) {
        for (let i = 0; i < 3; i++) {
          if (Math.floor(t * 2 + hash(tx, ty, i) * 9) % 5 === 0) { g.fillStyle = '#ffffff'; g.fillRect(x0 + 3 + Math.floor(hash(tx, ty, i + 5) * 10), y0 + 2 + Math.floor(hash(tx, ty, i + 8) * 12), 1, 1); }
        }
        continue;
      }
      // herabfließende Streifen
      for (let i = 0; i < 4; i++) {
        const sx = x0 + 2 + i * 3 + Math.floor(hash(tx, ty, i) * 2);
        const tempo = 38 + hash(tx, ty, i + 10) * 30;
        const lang = 4 + Math.floor(hash(tx, ty, i + 20) * 4);
        const pos = ((t * tempo + hash(tx, ty, i + 30) * 40) % 28) - 6;
        const von = Math.max(0, pos);
        const bis = Math.min(16, pos + lang);
        if (bis > von) { g.fillStyle = '#ffffff'; g.fillRect(sx, y0 + von, 1, bis - von); }
        const von2 = Math.max(0, pos - 3);
        const bis2 = Math.min(16, pos);
        if (bis2 > von2) { g.fillStyle = '#d6eef8'; g.fillRect(sx, y0 + von2, 1, bis2 - von2); }
      }
      // Gischt am Fuß
      if (fuss) {
        const atem = 0.5 + 0.5 * Math.sin(t * 5 + tx);
        g.globalAlpha = 0.45 + 0.25 * atem;
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
          const cx = x0 + 1 + i * 3.4;
          const r = 2.4 + Math.sin(t * 6 + i + tx) * 0.9;
          g.beginPath(); g.ellipse(cx, y0 + 16 + 1.5, r, r * 0.65, 0, 0, 7); g.fill();
        }
        g.globalAlpha = 0.9;
        for (let i = 0; i < 4; i++) {
          const ph = (t * 1.6 + hash(tx, ty, 40 + i)) % 1;
          g.fillRect(Math.round(x0 + 2 + hash(tx, ty, 44 + i) * 12 + Math.sin(ph * 6 + i) * 2), Math.round(y0 + 15 - ph * 9), 1, 1);
        }
        g.globalAlpha = 1;
      }
    }
  },
});
