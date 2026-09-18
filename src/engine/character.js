// Charakterbau und Stufenaufstieg.
// Aus den Entscheidungen der Erschaffung wird ein vollständiger Bogen —
// inklusive aller Kampfaktionen, die die Kampf-Engine später nur noch ausführt.

import { RACES, CLASSES, BACKGROUNDS } from '../data/chargen.js';
import { SPELLS, FEATURES, WEAPON_PROFILES, scaledDamage } from '../data/spells.js';
import { abilityMod, proficiencyBonus, slotsForCaster, hpForLevel } from './rules.js';

let nextId = 1;
export function freshId(prefix = 'sc') {
  return `${prefix}_${nextId++}`;
}

/**
 * Vollständigen Charakter aus den Erschaffungsdaten bauen.
 * @param {object} draft {name, raceId, classId, backgroundId, baseScores, skills, portrait, regret, loss, level}
 */
export function buildCharacter(draft) {
  const race = RACES[draft.raceId];
  const cls = CLASSES[draft.classId];
  const bg = BACKGROUNDS[draft.backgroundId];
  const level = draft.level || 1;

  const abilities = { st: 8, ge: 8, ko: 8, in: 8, we: 8, ch: 8, ...draft.baseScores };
  for (const [k, v] of Object.entries(race.bonuses || {})) abilities[k] += v;
  // Attributssteigerungen auf Stufe 4/8/12/16/19 gehen in das Leitattribut.
  const asiLevels = [4, 8, 12, 16, 19].filter((l) => l <= level).length;
  for (let i = 0; i < asiLevels; i++) {
    const primary = cls.primary;
    if (abilities[primary] < 20) abilities[primary] = Math.min(20, abilities[primary] + 2);
    else if (abilities.ko < 20) abilities.ko = Math.min(20, abilities.ko + 2);
  }

  const skills = new Set([
    ...(race.skills || []),
    ...(bg?.skills || []),
    ...(draft.skills || []),
  ]);

  const conMod = abilityMod(abilities.ko);
  const maxHp = hpForLevel(cls.hitDie, level, conMod) + (race.hpPerLevel || 0) * level;

  const char = {
    id: draft.id || freshId('sc'),
    isPlayer: true,
    name: draft.name,
    raceId: race.id, raceName: race.name,
    classId: cls.id, className: cls.name,
    backgroundId: bg?.id, backgroundName: bg?.name,
    level,
    abilities,
    skills: [...skills],
    expertise: draft.expertise || [],
    saveProficiencies: cls.saves,
    hp: maxHp, maxHp, tempHp: 0,
    ac: cls.armor + (cls.features.some((f) => f.level <= level && f.passive?.ac) ? 1 : 0),
    speed: race.speed,
    darkvision: race.darkvision || 0,
    resistances: [...(race.resistances || [])],
    vulnerabilities: [],
    immunities: [],
    conditions: [],
    portrait: draft.portrait || { palette: 0, shape: 0 },
    regret: draft.regret || '',
    loss: draft.loss || '',
    inventory: [],
    gold: 15,
    hooks: [...(bg?.hooks || [])],
    approval: {},
    notes: [],
    deathSaves: { success: 0, fail: 0 },
    // Kampfressourcen
    uses: {},
    slots: [], slotsMax: [],
    concentration: null,
    sacrificedName: null,
    forgetting: 0, // Vergessensgrade (Akt IV)
    anchor: null,
  };

  applyClassProgression(char);
  recomputeDerived(char);
  giveStartingGear(char, cls, bg);
  return char;
}

/** Klassenmerkmale, Zauber und Plätze für die aktuelle Stufe setzen. */
export function applyClassProgression(char) {
  const cls = CLASSES[char.classId];
  const race = RACES[char.raceId];
  char.features = cls.features.filter((f) => f.level <= char.level);
  char.attacksPerAction = 1;
  char.sneakDice = 0;
  for (const f of char.features) {
    if (f.passive?.attacks) char.attacksPerAction = Math.max(char.attacksPerAction, f.passive.attacks);
    if (f.sneak) char.sneakDice = Math.max(char.sneakDice, f.sneak);
  }

  // Zaubertricks
  const cantrips = new Set(cls.cantrips || []);
  if (race.grantedCantrip) cantrips.add(race.grantedCantrip);
  char.cantrips = [...cantrips];

  // Zauberplätze
  char.slotsMax = slotsForCaster(char.level, cls.casterType);
  char.slots = char.slotsMax.slice();
  char.spellAbility = cls.spellAbility || null;

  // Bekannte Zauber: alles aus der Liste, dessen Grad die Figur wirken kann.
  const maxGrade = char.slotsMax.length;
  char.spells = (cls.spellList || []).filter((id) => {
    const s = SPELLS[id] || FEATURES[id];
    if (!s) return false;
    if (s.kind === 'merkmal') return cls.features.some((f) => f.id === id && f.level <= char.level);
    return (s.level || 0) <= maxGrade;
  });

  // Verbrauchbare Merkmale
  char.uses = char.uses || {};
  for (const f of char.features) {
    const feat = FEATURES[f.id];
    if (feat?.uses) {
      char.uses[f.id] = char.uses[f.id] ?? feat.uses.max;
    }
  }
  if (race.breathWeapon) char.uses.odem = char.uses.odem ?? 1;
  if (race.relentless) char.uses.unerbittlich = char.uses.unerbittlich ?? 1;
}

/** Abgeleitete Werte: Zauber-SG, Angriffsboni, Initiative. */
export function recomputeDerived(char) {
  const pb = proficiencyBonus(char.level);
  char.proficiency = pb;
  char.initiativeBonus = abilityMod(char.abilities.ge);
  if (char.spellAbility) {
    char.spellDc = 8 + pb + abilityMod(char.abilities[char.spellAbility]) + (char.spellFocusBonus || 0);
    char.spellAttack = pb + abilityMod(char.abilities[char.spellAbility]) + (char.spellFocusBonus || 0);
  }
  char.passivePerception = 10 + abilityMod(char.abilities.we) + (char.skills.includes('wahrnehmung') ? pb : 0);
  char.passiveInsight = 10 + abilityMod(char.abilities.we) + (char.skills.includes('motiv_erkennen') ? pb : 0);
  return char;
}

function giveStartingGear(char, cls, bg) {
  for (const w of cls.weapons) {
    char.inventory.push({ id: w, type: 'waffe', name: WEAPON_PROFILES[w].name, profile: w, equipped: char.inventory.filter((i) => i.type === 'waffe' && i.equipped).length === 0 });
  }
  char.inventory.push({ id: 'traenk_heilung', type: 'trank', name: 'Heiltrank', heal: '2W4+2', count: 2 });
  if (bg?.item) char.inventory.push({ id: bg.item, type: 'quest', name: itemLabel(bg.item), count: 1 });
}

/** "1W6" + (-1) → "1W6-1"; + 0 → "1W6". */
function withMod(dice, mod) {
  if (!mod) return dice;
  return mod > 0 ? `${dice}+${mod}` : `${dice}-${Math.abs(mod)}`;
}

function itemLabel(id) {
  const map = {
    gezinkte_wuerfel: 'Gezinkte Würfel',
    laute: 'Laute (Herkunft unklar)',
    rangabzeichen: 'Rangabzeichen',
    tintenfass: 'Tintenfass und Feder',
    flusskiesel: 'Ein Flusskiesel',
    sense: 'Abgenutzte Sense',
    gebetskette: 'Gebetskette',
    fasswagen_schluessel: 'Ein Schlüssel ohne Schloss',
  };
  return map[id] || id;
}

/** Alle Kampfaktionen, die dieser Charakter gerade wählen kann. */
export function characterActions(char) {
  const out = [];
  const pb = char.proficiency;

  // Waffenangriffe
  for (const item of char.inventory) {
    if (item.type !== 'waffe' || !item.equipped) continue;
    const p = WEAPON_PROFILES[item.profile];
    const useDex = p.finesse || p.ranged;
    const abil = useDex
      ? (abilityMod(char.abilities.ge) >= abilityMod(char.abilities.st) ? 'ge' : 'st')
      : p.ability;
    const mod = abilityMod(char.abilities[abil]);
    out.push({
      id: `waffe_${item.id}`,
      name: p.name,
      kind: 'waffe',
      cost: 'aktion',
      range: p.range,
      ranged: !!p.ranged,
      targets: 'kreatur',
      attack: true,
      attackBonus: mod + pb + (item.bonus || 0),
      damage: [{ dice: withMod(p.damage, mod + (item.bonus || 0)), type: item.damageType || p.type }],
      attacks: char.attacksPerAction,
      desc: item.desc || `Angriff mit ${p.name}.`,
      icon: p.ranged ? 'bogen' : 'klinge',
    });
  }

  // Zaubertricks
  for (const id of char.cantrips || []) {
    const s = SPELLS[id];
    if (!s) continue;
    out.push({
      ...s,
      damage: scaledDamage(s, char.level),
      attackBonus: char.spellAttack,
      dc: char.spellDc,
      icon: 'funke',
    });
  }

  // Zauber mit Plätzen
  for (const id of char.spells || []) {
    const s = SPELLS[id] || FEATURES[id];
    if (!s) continue;
    if (s.kind === 'merkmal') {
      const max = FEATURES[id]?.uses?.max ?? 1;
      out.push({ ...s, remaining: char.uses[id] ?? max, maxUses: max, dc: char.spellDc, attackBonus: char.spellAttack, icon: 'merkmal' });
    } else {
      out.push({ ...s, attackBonus: char.spellAttack, dc: char.spellDc, icon: 'zauber' });
    }
  }

  // Merkmale, die keine Zauber sind
  for (const f of char.features) {
    const feat = FEATURES[f.id];
    if (!feat || feat.kind === 'passiv') continue;
    if (out.some((a) => a.id === f.id)) continue;
    out.push({
      ...feat,
      remaining: char.uses[f.id] ?? feat.uses?.max ?? 1,
      maxUses: feat.uses?.max ?? 1,
      dc: 8 + pb + abilityMod(char.abilities[CLASSES[char.classId].primary]),
      icon: 'merkmal',
    });
  }

  // Volksfähigkeit: Odem
  const race = RACES[char.raceId];
  if (race.breathWeapon) {
    out.push({
      id: 'odem', name: 'Odemwaffe', kind: 'merkmal', cost: 'aktion',
      range: 0, targets: 'punkt', shape: { type: 'kegel', length: 3 },
      save: { ability: race.breathWeapon.save, half: true },
      damage: [{ dice: race.breathWeapon.damage, type: race.breathWeapon.type }],
      dc: 8 + pb + abilityMod(char.abilities.ko),
      remaining: char.uses.odem ?? 1, maxUses: 1,
      desc: 'Ein Kegel aus Drachenatem.', icon: 'merkmal',
    });
  }

  // Immer verfügbar
  out.push({
    id: 'ausweichen', name: 'Ausweichen', kind: 'aktion', cost: 'aktion',
    targets: 'selbst', dodge: true, icon: 'schild',
    desc: 'Angriffe gegen dich haben Nachteil bis zu deinem nächsten Zug.',
  });
  out.push({
    id: 'spurt', name: 'Spurt', kind: 'aktion', cost: 'aktion',
    targets: 'selbst', dash: true, icon: 'stiefel',
    desc: 'Doppelte Bewegung in diesem Zug.',
  });
  out.push({
    id: 'helfen', name: 'Helfen', kind: 'aktion', cost: 'aktion',
    targets: 'verbuendeter', range: 1, help: true, icon: 'hand',
    desc: 'Der Verbündete hat Vorteil auf seinen nächsten Angriff.',
  });

  // Tränke
  for (const item of char.inventory) {
    if (item.type === 'trank' && item.count > 0) {
      out.push({
        id: `trank_${item.id}`, name: item.name, kind: 'gegenstand', cost: 'bonus',
        targets: 'verbuendeter', range: 1, heal: item.heal, consume: item.id,
        remaining: item.count, icon: 'trank',
        desc: `Heilt ${item.heal} Trefferpunkte.`,
      });
    }
  }

  return out;
}

/** Stufenaufstieg an einem narrativen Wendepunkt. */
export function levelUp(char, toLevel) {
  const before = char.level;
  char.level = Math.min(20, toLevel ?? char.level + 1);
  if (char.level === before) return null;
  const cls = CLASSES[char.classId];
  const conMod = abilityMod(char.abilities.ko);
  const race = RACES[char.raceId];
  const oldMax = char.maxHp;

  // Attributssteigerung neu anwenden (buildCharacter-Logik nachziehen)
  const asiBefore = [4, 8, 12, 16, 19].filter((l) => l <= before).length;
  const asiNow = [4, 8, 12, 16, 19].filter((l) => l <= char.level).length;
  for (let i = asiBefore; i < asiNow; i++) {
    if (char.abilities[cls.primary] < 20) char.abilities[cls.primary] += 2;
    else if (char.abilities.ko < 20) char.abilities.ko += 2;
  }

  char.maxHp = hpForLevel(cls.hitDie, char.level, abilityMod(char.abilities.ko)) + (race.hpPerLevel || 0) * char.level;
  char.hp += char.maxHp - oldMax;
  applyClassProgression(char);
  recomputeDerived(char);
  const newFeatures = cls.features.filter((f) => f.level > before && f.level <= char.level);
  return { from: before, to: char.level, hpGain: char.maxHp - oldMax, newFeatures };
}

/** Kurze Rast: einige Ressourcen kehren zurück. */
export function shortRest(char) {
  const cls = CLASSES[char.classId];
  for (const f of char.features) {
    const feat = FEATURES[f.id];
    if (feat?.uses?.per === 'rast' || feat?.uses?.per === 'kampf') char.uses[f.id] = feat.uses.max;
  }
  if (cls.casterType === 'pakt') char.slots = char.slotsMax.slice();
  char.uses.odem = char.uses.odem !== undefined ? 1 : undefined;
  char.uses.unerbittlich = char.uses.unerbittlich !== undefined ? 1 : undefined;
  const healed = Math.floor(char.maxHp * 0.25);
  char.hp = Math.min(char.maxHp, char.hp + healed);
  return healed;
}

/** Lange Rast: alles zurück. In Klarwasser kostet sie ein Kästchen der Uhr. */
export function longRest(char) {
  char.hp = char.maxHp;
  char.tempHp = 0;
  char.downed = false;
  char.deathSaves = { success: 0, fail: 0 };
  char.conditions = char.conditions.filter((c) => c.permanent);
  char.slots = char.slotsMax.slice();
  char.concentration = null;
  for (const f of char.features) {
    const feat = FEATURES[f.id];
    if (feat?.uses) char.uses[f.id] = feat.uses.max;
  }
  if (char.uses.odem !== undefined) char.uses.odem = 1;
  if (char.uses.unerbittlich !== undefined) char.uses.unerbittlich = 1;
  return char;
}

/** Kampfbeginn: Ressourcen mit Reichweite "kampf" auffrischen. */
export function startCombat(char) {
  for (const f of char.features || []) {
    const feat = FEATURES[f.id];
    if (feat?.uses?.per === 'kampf') char.uses[f.id] = feat.uses.max;
  }
  char.usedSpellsThisCombat = {};
  char.tempAc = 0;
}
