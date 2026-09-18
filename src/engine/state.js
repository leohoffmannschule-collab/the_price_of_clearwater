// Spielzustand: Gruppe, Flags, Uhren, Journal, Spielstände.
// Die gesamte Reaktivität der Kampagne hängt an genau zwei Dingen:
// den Flags und den beiden Uhren.

import { reseed } from './rng.js';

export const SAVE_KEY = 'klarwasser.saves.v1';
export const SAVE_VERSION = 3;

export function newGameState(seed = Date.now() >>> 0) {
  reseed(seed);
  return {
    version: SAVE_VERSION,
    seed,
    createdAt: Date.now(),
    party: [],
    companions: [],
    act: 1,
    session: 1,
    scene: 'prolog_weggabelung',
    area: null,
    flags: {},
    counters: {
      uhr_stille_tiefe: 0, // 6 Kästchen — bei 6/6 verschwindet Nella
      ascheuhr: 0,         // 8 Kästchen (Akt III)
      gesang: 0,           // Ghortans Beschwörungsgesang (Phase II)
      gerettete: 0,        // Menschen aus der brennenden Straße (A6)
      gruendersteine: 0,   // gesprochene Namen im Endkampf
    },
    party_gold: 40,
    party_inventory: [],
    journal: [],
    log: [],
    notes: {
      namesCopied: false,
      namesKnown: [],
      registerStolen: false,
      drankFromWell: [],
      sacrificedNames: {},
      nellaPromise: '',
      ysmerethFair: true,
      spokenNames: [],
      lostMemories: {},
      anchors: {},
      lastWords: {},
    },
    staff: {
      stage: 0,            // Stab der Bindung: 0..3
      names: [],           // belegte Runen
      bearer: null,
    },
    time: { day: 1, phase: 'nachmittag' },
    endings: {},
    stats: { kills: 0, checksPassed: 0, checksFailed: 0, rests: 0, combats: 0 },
  };
}

/* ───────────────────────────── Flags ───────────────────────────── */

export function setFlag(state, key, value = true) {
  state.flags[key] = value;
  return value;
}

export function flag(state, key) {
  return state.flags[key];
}

export function anyFlag(state, keys) {
  return keys.some((k) => !!state.flags[k]);
}

export function allFlags(state, keys) {
  return keys.every((k) => !!state.flags[k]);
}

/* ───────────────────────────── Uhren ───────────────────────────── */

export const CLOCK_REASONS = {
  lange_rast: 'Ihr habt in Klarwasser lange gerastet.',
  hesse_beschuldigt: 'Ihr habt Mutter Hesse öffentlich beschuldigt.',
  zeichen_ignoriert: 'Ein Sieben-Tage-Zeichen blieb unbeachtet.',
  kein_fortschritt: 'Ein Tag ohne Fortschritt in der Hauptspur.',
  zoellner_falsch: 'Der Zöllner hat eine Stunde genommen.',
  kaspar_nuechtern: 'Vier Stunden bei einem nüchternen alten Mann.',
  weggabelung: 'Zwei Tagesmärsche hin, zwei zurück.',
};

/**
 * Ein Kästchen der Uhr der Stillen Tiefe ankreuzen.
 * @returns {{value:number, full:boolean, reason:string}}
 */
export function tickClock(state, reason, amount = 1) {
  const before = state.counters.uhr_stille_tiefe;
  state.counters.uhr_stille_tiefe = Math.min(6, before + amount);
  const text = CLOCK_REASONS[reason] || reason;
  logEvent(state, 'uhr', `Uhr der Stillen Tiefe: ${state.counters.uhr_stille_tiefe}/6 — ${text}`);
  if (state.counters.uhr_stille_tiefe >= 6 && !state.flags.nella_verschwunden) {
    setFlag(state, 'nella_verschwunden');
    setFlag(state, 'harter_weg');
    logEvent(state, 'uhr', 'Die Uhr ist voll. Nella Vahl ist verschwunden. Es bleibt nur noch der harte Weg.');
  }
  return {
    value: state.counters.uhr_stille_tiefe,
    full: state.counters.uhr_stille_tiefe >= 6,
    reason: text,
  };
}

export function tickAshClock(state, reason, amount = 1) {
  state.counters.ascheuhr = Math.min(8, state.counters.ascheuhr + amount);
  logEvent(state, 'uhr', `Ascheuhr: ${state.counters.ascheuhr}/8 — ${reason}`);
  return { value: state.counters.ascheuhr, full: state.counters.ascheuhr >= 8 };
}

/* ───────────────────────────── Journal ───────────────────────────── */

export function addQuest(state, id, title, first) {
  if (state.journal.some((q) => q.id === id)) {
    if (first) addQuestEntry(state, id, first);
    return;
  }
  state.journal.push({ id, title, entries: first ? [first] : [], done: false, failed: false });
  logEvent(state, 'quest', `Neuer Auftrag: ${title}`);
}

export function addQuestEntry(state, id, text) {
  const q = state.journal.find((x) => x.id === id);
  if (!q) return;
  if (q.entries.includes(text)) return;
  q.entries.push(text);
}

export function completeQuest(state, id, text) {
  const q = state.journal.find((x) => x.id === id);
  if (!q) return;
  q.done = true;
  if (text) q.entries.push(text);
  logEvent(state, 'quest', `Abgeschlossen: ${q.title}`);
}

export function failQuest(state, id, text) {
  const q = state.journal.find((x) => x.id === id);
  if (!q) return;
  q.failed = true;
  q.done = true;
  if (text) q.entries.push(text);
}

/* ───────────────────────────── Log ───────────────────────────── */

export function logEvent(state, kind, text) {
  state.log.push({ kind, text, t: state.log.length });
  if (state.log.length > 400) state.log.splice(0, state.log.length - 400);
  return text;
}

/* ───────────────── Stab der Bindung ───────────────── */

export const STAFF_STAGES = [
  {
    stage: 0, name: 'Schlafend',
    desc: 'Kampfstab (1W6 Wucht), ungewöhnlich schwer, immer kalt. Zauberfokus ohne Bonus. Elf Runen, die wie Kratzer wirken.',
  },
  {
    stage: 1, name: 'Erwacht — die Namen sind lesbar',
    desc: 'Zauberfokus +1. Namen spüren: Du merkst, wenn jemand in 9 m lügt, indem er einen Namen verschweigt.',
  },
  {
    stage: 2, name: 'Macht der Stillen Tiefe',
    desc: 'Zauberfokus +2. Wassergestalt, Gedankenbund, Tiefenseher — je 1×/Tag. Rückstoß: jede Nutzung kostet 1W4 psychischen Schaden.',
  },
  {
    stage: 3, name: 'Volle Kraft',
    desc: 'Bindung, Namen greifen, Namen-Speicher. Diese Stufe erreicht der Stab erst im Endkampf.',
  },
];

export function awakenStaff(state, stage) {
  if (stage <= state.staff.stage) return null;
  state.staff.stage = stage;
  const info = STAFF_STAGES[stage];
  logEvent(state, 'stab', `Der Stab der Bindung erwacht: ${info.name}`);
  const bearer = state.party.find((c) => c.id === state.staff.bearer) || state.party[0];
  if (bearer) {
    bearer.spellFocusBonus = stage >= 2 ? 2 : stage === 1 ? 1 : 0;
  }
  return info;
}

export function staffBearer(state) {
  return state.party.find((c) => c.id === state.staff.bearer) || state.party[0] || null;
}

/* ───────────────────────────── Spielstände ───────────────────────────── */

function storage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (_) { /* privater Modus */ }
  return null;
}

export function listSaves() {
  const s = storage();
  if (!s) return [];
  try {
    return JSON.parse(s.getItem(SAVE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

export function saveGame(state, slotName) {
  const s = storage();
  if (!s) return { ok: false, error: 'Kein Speicher verfügbar.' };
  const saves = listSaves();
  const entry = {
    name: slotName || `${state.party[0]?.name || 'Gruppe'} — Akt ${romanAct(state.act)}, Sitzung ${state.session}`,
    at: Date.now(),
    act: state.act,
    session: state.session,
    scene: state.scene,
    level: state.party[0]?.level || 1,
    data: state,
  };
  const idx = saves.findIndex((x) => x.name === entry.name);
  if (idx >= 0) saves[idx] = entry;
  else saves.unshift(entry);
  while (saves.length > 12) saves.pop();
  try {
    s.setItem(SAVE_KEY, JSON.stringify(saves));
    return { ok: true, name: entry.name };
  } catch (e) {
    return { ok: false, error: 'Speicher voll.' };
  }
}

export function loadGame(name) {
  const saves = listSaves();
  const entry = saves.find((x) => x.name === name);
  if (!entry) return null;
  const state = entry.data;
  if (state.version !== SAVE_VERSION) migrate(state);
  reseed(state.seed || 1);
  return state;
}

export function deleteSave(name) {
  const s = storage();
  if (!s) return;
  const saves = listSaves().filter((x) => x.name !== name);
  s.setItem(SAVE_KEY, JSON.stringify(saves));
}

function migrate(state) {
  state.counters = { uhr_stille_tiefe: 0, ascheuhr: 0, gesang: 0, gerettete: 0, gruendersteine: 0, ...state.counters };
  state.notes = { namesCopied: false, namesKnown: [], drankFromWell: [], sacrificedNames: {}, spokenNames: [], anchors: {}, lastWords: {}, lostMemories: {}, ...state.notes };
  state.staff = { stage: 0, names: [], bearer: null, ...state.staff };
  state.version = SAVE_VERSION;
}

export function romanAct(n) {
  return ['—', 'I', 'II', 'III', 'IV'][n] || String(n);
}

/* ───────────── Gruppen-Hilfen ───────────── */

export function livingParty(state) {
  return state.party.filter((c) => !c.dead);
}

export function partyHasSkill(state, skill) {
  return state.party.some((c) => c.skills.includes(skill));
}

export function bestAt(state, skill) {
  let best = null;
  let bestVal = -99;
  for (const c of state.party) {
    if (c.dead) continue;
    const mod = Math.floor((c.abilities[skillAbility(skill)] - 10) / 2)
      + (c.skills.includes(skill) ? c.proficiency : 0);
    if (mod > bestVal) { bestVal = mod; best = c; }
  }
  return best;
}

function skillAbility(skill) {
  const map = {
    akrobatik: 'ge', arkane_kunde: 'in', athletik: 'st', auftreten: 'ch', einschuechtern: 'ch',
    fingerfertigkeit: 'ge', geschichte: 'in', heilkunde: 'we', heimlichkeit: 'ge',
    mit_tieren_umgehen: 'we', motiv_erkennen: 'we', nachforschungen: 'in', naturkunde: 'in',
    religion: 'in', taeuschen: 'ch', ueberleben: 'we', ueberzeugen: 'ch', untersuchen: 'in',
    wahrnehmung: 'we',
  };
  return map[skill] || skill;
}

export function addItem(state, item) {
  const existing = state.party_inventory.find((i) => i.id === item.id && i.stack !== false);
  if (existing && item.count) {
    existing.count = (existing.count || 1) + item.count;
    return existing;
  }
  state.party_inventory.push({ count: 1, ...item });
  logEvent(state, 'beute', `Erhalten: ${item.name}`);
  return item;
}

export function hasItem(state, id) {
  return state.party_inventory.some((i) => i.id === id)
    || state.party.some((c) => c.inventory.some((i) => i.id === id));
}

export function removeItem(state, id) {
  const i = state.party_inventory.findIndex((x) => x.id === id);
  if (i >= 0) state.party_inventory.splice(i, 1);
}
