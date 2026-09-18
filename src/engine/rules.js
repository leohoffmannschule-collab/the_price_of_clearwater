// Regelkern — eine schlanke, vollständig deutsche 5E-Variante.
// Alles, was an einem Charakterbogen abgelesen werden kann, steht hier.

import { d20, roll, combineMode } from './rng.js';

export const ABILITIES = ['st', 'ge', 'ko', 'in', 'we', 'ch'];

export const ABILITY_NAMES = {
  st: 'Stärke',
  ge: 'Geschicklichkeit',
  ko: 'Konstitution',
  in: 'Intelligenz',
  we: 'Weisheit',
  ch: 'Charisma',
};

export const ABILITY_SHORT = {
  st: 'STÄ', ge: 'GES', ko: 'KON', in: 'INT', we: 'WEI', ch: 'CHA',
};

/** Alle Fertigkeiten mit ihrem Leitattribut. */
export const SKILLS = {
  akrobatik: { name: 'Akrobatik', ability: 'ge' },
  arkane_kunde: { name: 'Arkane Kunde', ability: 'in' },
  athletik: { name: 'Athletik', ability: 'st' },
  auftreten: { name: 'Auftreten', ability: 'ch' },
  einschuechtern: { name: 'Einschüchtern', ability: 'ch' },
  fingerfertigkeit: { name: 'Fingerfertigkeit', ability: 'ge' },
  geschichte: { name: 'Geschichte', ability: 'in' },
  heilkunde: { name: 'Heilkunde', ability: 'we' },
  heimlichkeit: { name: 'Heimlichkeit', ability: 'ge' },
  mit_tieren_umgehen: { name: 'Mit Tieren umgehen', ability: 'we' },
  motiv_erkennen: { name: 'Motiv erkennen', ability: 'we' },
  nachforschungen: { name: 'Nachforschungen', ability: 'in' },
  naturkunde: { name: 'Naturkunde', ability: 'in' },
  religion: { name: 'Religion', ability: 'in' },
  taeuschen: { name: 'Täuschen', ability: 'ch' },
  ueberleben: { name: 'Überleben', ability: 'we' },
  ueberzeugen: { name: 'Überzeugen', ability: 'ch' },
  untersuchen: { name: 'Untersuchen', ability: 'in' },
  wahrnehmung: { name: 'Wahrnehmung', ability: 'we' },
};

export const SKILL_KEYS = Object.keys(SKILLS);

export const DAMAGE_TYPES = {
  hieb: 'Hiebschaden',
  stich: 'Stichschaden',
  wucht: 'Wuchtschaden',
  feuer: 'Feuerschaden',
  kaelte: 'Kälteschaden',
  blitz: 'Blitzschaden',
  saeure: 'Säureschaden',
  gift: 'Giftschaden',
  nekrotisch: 'nekrotischer Schaden',
  strahlend: 'strahlender Schaden',
  psychisch: 'psychischer Schaden',
  donner: 'Donnerschaden',
};

/** Zustände, die Kampf und Gespräch beeinflussen. */
export const CONDITIONS = {
  festgesetzt: {
    name: 'Festgesetzt',
    desc: 'Bewegung 0. Nachteil auf Angriffe und GES-Rettungswürfe; Angriffe gegen dich haben Vorteil.',
  },
  verangstigt: {
    name: 'Verängstigt',
    desc: 'Nachteil auf Angriffe und Attributsproben, solange die Quelle sichtbar ist.',
  },
  bezaubert: { name: 'Bezaubert', desc: 'Du kannst die Quelle nicht angreifen.' },
  gelaehmt: { name: 'Gelähmt', desc: 'Keine Aktionen. Angriffe gegen dich haben Vorteil und treffen aus 1,5 m kritisch.' },
  betaeubt: { name: 'Betäubt', desc: 'Keine Aktionen, automatischer Misserfolg bei STÄ- und GES-Rettungswürfen.' },
  liegend: { name: 'Liegend', desc: 'Nachteil auf Angriffe; Nahkampfangriffe gegen dich haben Vorteil.' },
  gepackt: { name: 'Gepackt', desc: 'Bewegung 0, bis du dich befreist.' },
  vergiftet: { name: 'Vergiftet', desc: 'Nachteil auf Angriffswürfe und Attributsproben.' },
  verlangsamt: { name: 'Verlangsamt', desc: 'Halbe Bewegung, −2 RK und GES-RW, nur eine Aktion pro Zug.' },
  namenlos: {
    name: 'Namenlos',
    desc: 'Verbündete können dich nicht als Ziel benennen; Nachteil auf alle Würfe.',
  },
  weinend: { name: 'Getröstet', desc: 'Du handelst nicht — du weinst.' },
  segen: { name: 'Gesegnet', desc: '+1W4 auf Angriffswürfe und Rettungswürfe.' },
  inspiriert: { name: 'Inspiriert', desc: 'Einmal einen Wurf wiederholen.' },
  schlafend: { name: 'Schlafend', desc: 'Bewusstlos, bis Schaden oder eine Aktion dich weckt.' },
  konzentriert: { name: 'Konzentriert', desc: 'Hält einen Zauber aufrecht.' },
};

/** Übungsbonus nach Stufe. */
export function proficiencyBonus(level) {
  return 2 + Math.floor((Math.min(20, Math.max(1, level)) - 1) / 4);
}

/** Attributsmodifikator. */
export function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}

export function formatMod(n) {
  return n >= 0 ? `+${n}` : String(n);
}

/** Erfahrungsstufe → maximale Zauberplätze (vereinfachte Vollzauberer-Tabelle). */
export const SLOT_TABLE = [
  [], // Stufe 0 gibt es nicht
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2],
  [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Halbzauberer (Paladin, Waldläufer) bekommen Plätze nach halber Stufe. */
export function slotsForCaster(level, casterType) {
  if (casterType === 'voll') return SLOT_TABLE[Math.min(20, level)].slice();
  if (casterType === 'halb') {
    const eff = Math.floor(level / 2);
    return eff < 1 ? [] : SLOT_TABLE[Math.min(20, eff)].slice(0, 5);
  }
  if (casterType === 'pakt') {
    // Hexenmeister: wenige Plätze, aber immer auf höchstem Grad.
    const n = level >= 11 ? 3 : level >= 2 ? 2 : 1;
    const grade = Math.min(5, Math.ceil(Math.min(9, level) / 2));
    const arr = [];
    for (let i = 0; i < grade - 1; i++) arr.push(0);
    arr.push(n);
    return arr;
  }
  return [];
}

/**
 * Attributsprobe oder Fertigkeitsprobe.
 * @param {object} actor  Charakter oder Kreatur
 * @param {string} key    Fertigkeitsschlüssel oder Attributskürzel
 * @param {number} dc     Schwierigkeitsgrad
 * @param {{advantage?:boolean, disadvantage?:boolean, bonus?:number}} opts
 */
export function abilityCheck(actor, key, dc, opts = {}) {
  const isSkill = !!SKILLS[key];
  const ability = isSkill ? SKILLS[key].ability : key;
  const mod = abilityMod(actor.abilities[ability]);
  const pb = proficiencyBonus(actor.level || 1);
  let prof = 0;
  if (isSkill) {
    if (actor.expertise?.includes(key)) prof = pb * 2;
    else if (actor.skills?.includes(key)) prof = pb;
  }
  const extra = (opts.bonus || 0) + (actor.checkBonus?.[key] || 0);
  const bonus = mod + prof + extra;
  let adv = !!opts.advantage;
  let dis = !!opts.disadvantage;
  if (hasCondition(actor, 'vergiftet') || hasCondition(actor, 'verangstigt')) dis = true;
  if (hasCondition(actor, 'namenlos')) dis = true;
  const r = d20(bonus, combineMode(adv, dis));
  return {
    ...r,
    dc,
    success: r.total >= dc,
    key,
    label: isSkill ? SKILLS[key].name : ABILITY_NAMES[ability],
    proficient: prof > 0,
  };
}

/**
 * Rettungswurf.
 * @param {object} actor
 * @param {string} ability  st|ge|ko|in|we|ch
 */
export function savingThrow(actor, ability, dc, opts = {}) {
  const mod = abilityMod(actor.abilities[ability]);
  const pb = proficiencyBonus(actor.level || 1);
  const prof = actor.saveProficiencies?.includes(ability) ? pb : 0;
  const flat = actor.saveBonus?.[ability] || 0;
  let bonus = mod + prof + flat + (opts.bonus || 0);
  if (hasCondition(actor, 'segen')) bonus += roll('1W4').total;
  let adv = !!opts.advantage;
  let dis = !!opts.disadvantage;
  if ((ability === 'st' || ability === 'ge') && (hasCondition(actor, 'gelaehmt') || hasCondition(actor, 'betaeubt'))) {
    return { natural: 1, total: 0, dc, success: false, auto: true, ability, label: ABILITY_SHORT[ability] };
  }
  if (ability === 'ge' && hasCondition(actor, 'festgesetzt')) dis = true;
  if (hasCondition(actor, 'verlangsamt') && ability === 'ge') bonus -= 2;
  const r = d20(bonus, combineMode(adv, dis));
  return { ...r, dc, success: r.total >= dc, ability, label: ABILITY_SHORT[ability] };
}

export function hasCondition(actor, cond) {
  return !!actor.conditions?.some((c) => (typeof c === 'string' ? c === cond : c.id === cond));
}

export function addCondition(actor, cond, rounds = 1, source = null) {
  actor.conditions = actor.conditions || [];
  const existing = actor.conditions.find((c) => c.id === cond);
  if (existing) {
    existing.rounds = Math.max(existing.rounds, rounds);
    return existing;
  }
  const entry = { id: cond, rounds, source };
  actor.conditions.push(entry);
  return entry;
}

export function removeCondition(actor, cond) {
  if (!actor.conditions) return;
  actor.conditions = actor.conditions.filter((c) => c.id !== cond);
}

/** Rüstungsklasse inklusive temporärer Effekte. */
export function armorClass(actor) {
  let ac = actor.ac ?? 10 + abilityMod(actor.abilities.ge);
  for (const c of actor.conditions || []) {
    if (c.id === 'verlangsamt') ac -= 2;
    if (c.acBonus) ac += c.acBonus;
  }
  if (actor.tempAc) ac += actor.tempAc;
  return ac;
}

/** Trefferwurf gegen ein Ziel. */
export function attackRoll(attacker, target, attackBonus, opts = {}) {
  let adv = !!opts.advantage;
  let dis = !!opts.disadvantage;
  if (hasCondition(target, 'festgesetzt') || hasCondition(target, 'gelaehmt') || hasCondition(target, 'liegend')) adv = true;
  if (hasCondition(attacker, 'verangstigt') || hasCondition(attacker, 'vergiftet')) dis = true;
  if (hasCondition(attacker, 'festgesetzt') || hasCondition(attacker, 'namenlos')) dis = true;
  const r = d20(attackBonus, combineMode(adv, dis));
  const ac = armorClass(target);
  return { ...r, ac, hit: r.crit || (!r.fumble && r.total >= ac) };
}

/** Schaden nach Resistenzen/Verwundbarkeit/Immunität. */
export function applyDamage(target, amount, type = 'wucht', opts = {}) {
  let dmg = Math.max(0, Math.floor(amount));
  const res = target.resistances || [];
  const vul = target.vulnerabilities || [];
  const imm = target.immunities || [];
  if (imm.includes(type)) dmg = 0;
  else {
    if (vul.includes(type)) dmg *= 2;
    if (res.includes(type) && !opts.ignoreResistance) dmg = Math.floor(dmg / 2);
    if (target.allResistance && !opts.ignoreResistance) dmg = Math.floor(dmg / 2);
  }
  if (target.tempHp > 0) {
    const absorbed = Math.min(target.tempHp, dmg);
    target.tempHp -= absorbed;
    dmg -= absorbed;
  }
  target.hp = Math.max(0, target.hp - dmg);
  if (dmg > 0 && hasCondition(target, 'schlafend')) removeCondition(target, 'schlafend');
  if (dmg > 0 && hasCondition(target, 'konzentriert')) {
    const dc = Math.max(10, Math.floor(dmg / 2));
    const s = savingThrow(target, 'ko', dc);
    if (!s.success) {
      removeCondition(target, 'konzentriert');
      target.concentration = null;
    }
  }
  if (target.hp === 0 && !target.isPlayer) target.dead = true;
  if (target.hp === 0 && target.isPlayer) {
    target.downed = true;
    target.deathSaves = target.deathSaves || { success: 0, fail: 0 };
  }
  return dmg;
}

export function heal(target, amount) {
  if (target.dead) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.floor(amount));
  if (target.hp > 0) {
    target.downed = false;
    target.deathSaves = { success: 0, fail: 0 };
  }
  return target.hp - before;
}

/** Trefferpunkte bei Stufenaufstieg (Durchschnitt, wie es die Hausregel vorsieht). */
export function hpForLevel(hitDie, level, conMod) {
  const avg = Math.floor(hitDie / 2) + 1;
  return hitDie + conMod + (level - 1) * (avg + conMod);
}

/** Entfernung in Feldern (1 Feld = 1,5 m), diagonal zählt wie gerade. */
export function gridDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function metersToTiles(m) {
  return Math.round(m / 1.5);
}

export function tilesToMeters(t) {
  return t * 1.5;
}

/** Schwierigkeitsgrade, wie sie im Kampagnenbuch verwendet werden. */
export const DC_LABELS = {
  5: 'sehr leicht', 10: 'leicht', 12: 'machbar', 13: 'machbar', 14: 'mittel',
  15: 'mittel', 16: 'schwer', 17: 'schwer', 18: 'sehr schwer', 20: 'fast unmöglich',
  22: 'heldenhaft',
};

export function dcLabel(dc) {
  const keys = Object.keys(DC_LABELS).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) if (dc >= k) best = k;
  return DC_LABELS[best];
}
