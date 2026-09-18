// HAKEN — die Umbindung der Kampagne auf selbst erstellte Charaktere.
//
// Band I, Kapitel 6 verteilt drei feste Charakterhaken an Fibbel, Kayn und Nyx.
// Diese Fassung kennt keine festen Helden. Stattdessen wird jeder Haken zur
// Laufzeit an die Figur vergeben, zu der er am besten passt — und jede Szene,
// die im Buch einen Namen nennt, fragt hier nach, wen sie ansprechen soll.

import { abilityMod } from './rules.js';

/** Fertigkeitsmodifikator inklusive Übung. */
function skillMod(char, skill, ability) {
  return abilityMod(char.abilities[ability]) + (char.skills.includes(skill) ? char.proficiency : 0);
}

/** Kann diese Figur Feuerschaden austeilen? Die Nassen Kleinen sind dagegen verwundbar. */
function hasFire(char) {
  if (char.raceId === 'drachenblut' || char.raceId === 'tiefling') return true;
  const all = [...(char.cantrips || []), ...(char.spells || [])];
  return all.some((id) => ['feuerpfeil', 'brennende_haende', 'feuerball', 'hitzemetall', 'feuersturm'].includes(id));
}

const HOOK_DEFS = [
  {
    id: 'brief',
    title: 'Der Brief',
    score: (c) => (c.hooks.includes('schreiber') ? 10 : 0) + skillMod(c, 'nachforschungen', 'in'),
    describe: (c) => `${c.name} trägt den Brief. Absenderin ist Sarine Umbrecht — 150 Goldstücke für ein Dokument aus Familienbesitz, Diskretion vorausgesetzt. Das ist der kürzeste Weg in die Ermittlung.`,
  },
  {
    id: 'dieb',
    title: 'Das Register',
    score: (c) => (c.hooks.includes('dieb') || c.hooks.includes('haendler') ? 8 : 0) + skillMod(c, 'fingerfertigkeit', 'ge'),
    describe: (c) => `Das Kirchenregister liegt offen im Chorraum. ${c.name} kann es lesen — oder mitnehmen. Der Preis für das Mitnehmen kommt in Sitzung 5.`,
  },
  {
    id: 'musiker',
    title: 'Das Instrument',
    score: (c) => (c.hooks.includes('musiker') ? 12 : 0) + skillMod(c, 'auftreten', 'ch'),
    describe: (c) => `${c.name} kann beim Erntefest auftreten. Der Händler Perrick wird zuhören. Er sagt nichts. Er merkt es sich.`,
  },
  {
    id: 'feuer',
    title: 'Das Feuer',
    score: (c) => (hasFire(c) ? 15 : 0) + abilityMod(c.abilities.in),
    describe: (c) => `Etwas, das aus dem Bach kommt, wird vor ${c.name} zurückweichen. Warum, merkt ${c.name} am zweiten Würfel.`,
    requires: hasFire,
  },
  {
    id: 'stimme',
    title: 'Die Stimme',
    score: (c) => skillMod(c, 'ueberzeugen', 'ch') * 2,
    describe: (c) => `Wenn Klarwasser über sich selbst abstimmt, wird ${c.name} sprechen müssen. Vier Runden, zweihundert Zuhörer.`,
  },
  {
    id: 'auge',
    title: 'Das Auge',
    score: (c) => skillMod(c, 'wahrnehmung', 'we') + skillMod(c, 'motiv_erkennen', 'we'),
    describe: (c) => `${c.name} bemerkt Dinge, die niemand erklären will: dass Mutter Hesse jeden Namen zweimal sagt, einmal lautlos. Dass sie selbst nie trinkt.`,
  },
  {
    id: 'trinker',
    title: 'Der Krug',
    score: (c) => (c.hooks.includes('veteran') || c.hooks.includes('dorf') ? 6 : 0) + abilityMod(c.abilities.ko) * 2,
    describe: (c) => `Grust verliert beim Trinkspiel absichtlich gegen jeden, der vorher nett war. ${c.name} wird es nicht merken.`,
  },
  {
    id: 'stein',
    title: 'Der Stein',
    score: (c) => (c.raceId === 'zwerg' ? 10 : 0) + (c.hooks.includes('glaeubig') ? 4 : 0) + abilityMod(c.abilities.we),
    describe: (c) => `${c.name} wird spüren, dass der Stab nicht schweigt, sondern wartet. Ab dem Dorfeingang ist das Summen ein Dauerton.`,
  },
];

/**
 * Haken auf die Gruppe verteilen: jeder Haken an die passendste Figur,
 * möglichst breit gestreut, damit niemand leer ausgeht.
 * @returns {{[hookId:string]: string}} HakenID → CharakterID
 */
export function assignHooks(party) {
  const assigned = {};
  const load = {};
  for (const c of party) load[c.id] = 0;

  for (const hook of HOOK_DEFS) {
    let best = null;
    let bestScore = -Infinity;
    for (const c of party) {
      if (hook.requires && !hook.requires(c)) continue;
      // Wer schon viel trägt, wird leicht benachteiligt — die Gruppe soll sich teilen.
      const score = hook.score(c) - load[c.id] * 1.5;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (best) {
      assigned[hook.id] = best.id;
      load[best.id]++;
    }
  }
  return assigned;
}

/** Wer trägt diesen Haken? */
export function hookOwner(state, hookId) {
  const id = state.hooks?.[hookId];
  return state.party.find((c) => c.id === id) || state.party[0] || null;
}

/** Trägt diese Figur diesen Haken? */
export function hasHook(state, char, hookId) {
  return state.hooks?.[hookId] === char.id;
}

/** Lesbarer Bericht nach der Erschaffung: was die Kampagne über die Gruppe weiß. */
export function hookReport(state) {
  const out = [];
  for (const hook of HOOK_DEFS) {
    const owner = hookOwner(state, hook.id);
    if (!owner) continue;
    out.push({ id: hook.id, title: hook.title, who: owner.name, text: hook.describe(owner) });
  }
  return out;
}

export { HOOK_DEFS };

/**
 * Personalisierung von Vorlesetexten.
 * Platzhalter im Text:
 *   {held}          → erster Charakter
 *   {haken:dieb}    → Träger des Hakens
 *   {stab}          → Träger des Stabs
 *   {gruppe}        → Aufzählung aller Namen
 *   {reue:2}        → das Bereuen des zweiten Charakters
 */
export function personalize(text, state) {
  if (!text) return text;
  return String(text).replace(/\{([a-zäöüß_]+)(?::([a-z0-9_]+))?\}/gi, (match, key, arg) => {
    switch (key.toLowerCase()) {
      case 'held':
        return state.party[0]?.name ?? 'ihr';
      case 'haken': {
        const o = hookOwner(state, arg);
        return o ? o.name : state.party[0]?.name ?? 'jemand';
      }
      case 'stab': {
        const b = state.party.find((c) => c.id === state.staff.bearer) || state.party[0];
        return b ? b.name : 'die Gruppe';
      }
      case 'gruppe':
        return listNames(state.party.map((c) => c.name));
      case 'reue': {
        const c = state.party[Number(arg || 1) - 1] || state.party[0];
        return c?.regret || 'etwas, worüber niemand redet';
      }
      case 'verlust': {
        const c = state.party[Number(arg || 1) - 1] || state.party[0];
        return c?.loss || 'etwas, das nicht mehr da ist';
      }
      case 'klasse': {
        const c = state.party[Number(arg || 1) - 1] || state.party[0];
        return c?.className ?? 'Abenteurer';
      }
      default:
        return match;
    }
  });
}

function listNames(names) {
  if (names.length === 0) return 'niemand';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`;
}
