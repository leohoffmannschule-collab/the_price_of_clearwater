// Würfel & Zufall — deterministischer, seedbarer Zufallsgenerator.
// Alle Würfe der Kampagne laufen hier durch, damit Spielstände reproduzierbar sind.

/** mulberry32 — kleiner, schneller 32-Bit-PRNG. */
export function makeRng(seed = Date.now() >>> 0) {
  let a = seed >>> 0;
  const fn = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fn.seed = seed >>> 0;
  return fn;
}

/** Globaler Würfelbecher. Wird beim Laden eines Spielstands neu gesetzt. */
export let rng = makeRng();

export function reseed(seed) {
  rng = makeRng(seed);
  return rng;
}

/** Ganzzahl in [min, max] inklusive. */
export function randInt(min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Ein einzelner Würfel mit n Seiten. */
export function die(n) {
  return randInt(1, n);
}

/** Zufälliges Element einer Liste. */
export function pick(list) {
  return list[Math.floor(rng() * list.length)];
}

/** Liste an Ort und Stelle mischen (Fisher-Yates). */
export function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** Wahr mit Wahrscheinlichkeit p (0..1). */
export function chance(p) {
  return rng() < p;
}

const DICE_RE = /^\s*(\d*)\s*[wdWD]\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/;

/**
 * Würfelausdruck auswerten: "2W6+3", "1w8", "8W6", "4".
 * @returns {{total:number, rolls:number[], mod:number, notation:string}}
 */
export function roll(notation) {
  if (typeof notation === 'number') {
    return { total: notation, rolls: [], mod: notation, notation: String(notation) };
  }
  const flat = Number(notation);
  if (!Number.isNaN(flat)) {
    return { total: flat, rolls: [], mod: flat, notation: String(notation) };
  }
  const m = DICE_RE.exec(String(notation));
  if (!m) throw new Error(`Unbekannter Würfelausdruck: ${notation}`);
  const count = m[1] === '' ? 1 : parseInt(m[1], 10);
  const sides = parseInt(m[2], 10);
  const sign = m[3] === '-' ? -1 : 1;
  const mod = m[4] ? sign * parseInt(m[4], 10) : 0;
  const rolls = [];
  let total = mod;
  for (let i = 0; i < count; i++) {
    const r = die(sides);
    rolls.push(r);
    total += r;
  }
  return { total: Math.max(0, total), rolls, mod, notation: String(notation) };
}

/** Durchschnittswert eines Würfelausdrucks (für Vorschauen und Gegner-KI). */
export function average(notation) {
  if (typeof notation === 'number') return notation;
  const flat = Number(notation);
  if (!Number.isNaN(flat)) return flat;
  const m = DICE_RE.exec(String(notation));
  if (!m) return 0;
  const count = m[1] === '' ? 1 : parseInt(m[1], 10);
  const sides = parseInt(m[2], 10);
  const sign = m[3] === '-' ? -1 : 1;
  const mod = m[4] ? sign * parseInt(m[4], 10) : 0;
  return count * ((sides + 1) / 2) + mod;
}

/**
 * W20-Wurf mit Vorteil/Nachteil.
 * @param {number} bonus
 * @param {'normal'|'vorteil'|'nachteil'} mode
 */
export function d20(bonus = 0, mode = 'normal') {
  const a = die(20);
  const b = mode === 'normal' ? null : die(20);
  let natural = a;
  if (mode === 'vorteil') natural = Math.max(a, b);
  if (mode === 'nachteil') natural = Math.min(a, b);
  return {
    natural,
    both: b === null ? [a] : [a, b],
    bonus,
    total: natural + bonus,
    crit: natural === 20,
    fumble: natural === 1,
    mode,
  };
}

/** Vorteil und Nachteil heben sich gegenseitig auf (5E-Regel). */
export function combineMode(adv, dis) {
  if (adv && !dis) return 'vorteil';
  if (dis && !adv) return 'nachteil';
  return 'normal';
}
