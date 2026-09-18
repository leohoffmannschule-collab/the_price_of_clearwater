// Dialogsystem.
// Ein Dialog ist ein Graph aus Knoten. Antwortmöglichkeiten können Bedingungen
// tragen, Flags setzen und Fertigkeitsproben auslösen — sichtbar, mit Würfel,
// mit Modifikator und mit Konsequenz.

import { abilityCheck, SKILLS, abilityMod, ABILITY_NAMES } from './rules.js';
import { personalize } from './hooks.js';
import { setFlag, logEvent } from './state.js';

export class DialogueRunner {
  /**
   * @param {object} dialogue Dialoggraph
   * @param {object} state    Spielzustand
   * @param {object} ctx      { onFlag, onEvent, game }
   */
  constructor(dialogue, state, ctx = {}) {
    this.dialogue = dialogue;
    this.state = state;
    this.ctx = ctx;
    this.nodeId = dialogue.start;
    this.history = [];
    this.pendingCheck = null;
    this.usedChoices = new Set(state.flags[`_dlg_${dialogue.id}_used`] || []);
    this.finished = false;
    this.enter(this.nodeId);
  }

  get node() {
    return this.dialogue.nodes[this.nodeId];
  }

  enter(id) {
    this.nodeId = id;
    const node = this.node;
    if (!node) {
      this.finished = true;
      return;
    }
    if (node.onEnter) node.onEnter(this.state, this.ctx);
    if (node.flags) for (const f of node.flags) setFlag(this.state, f);
    if (node.quest) this.ctx.onQuest?.(node.quest);
    if (node.effect) this.ctx.onEffect?.(node.effect);
    this.history.push(id);
  }

  /** Der aktuelle Text, personalisiert. */
  currentText() {
    const node = this.node;
    if (!node) return '';
    const t = typeof node.text === 'function' ? node.text(this.state) : node.text;
    return personalize(t, this.state);
  }

  currentNarration() {
    const node = this.node;
    if (!node?.narration) return null;
    const t = typeof node.narration === 'function' ? node.narration(this.state) : node.narration;
    return personalize(t, this.state);
  }

  currentSpeaker() {
    const node = this.node;
    const sp = node?.speaker ?? this.dialogue.speaker;
    return typeof sp === 'function' ? sp(this.state) : sp;
  }

  currentPortrait() {
    return this.node?.portrait ?? this.dialogue.portrait ?? null;
  }

  /** Auswählbare Antworten mit aufbereiteten Probeninformationen. */
  choices() {
    const node = this.node;
    if (!node || node.end) return [];
    const list = [];
    (node.choices || []).forEach((c, index) => {
      if (c.if && !c.if(this.state)) return;
      if (c.once && this.usedChoices.has(`${this.nodeId}:${index}`)) return;
      const entry = {
        index,
        text: personalize(typeof c.text === 'function' ? c.text(this.state) : c.text, this.state),
        tag: c.tag || null,
        check: null,
        isEnd: !!c.exit,
      };
      if (c.check) {
        const actor = this.pickActor(c.check);
        const info = checkPreview(actor, c.check, this.state);
        entry.check = { ...info, actorName: actor?.name ?? '—', actorId: actor?.id };
      }
      list.push(entry);
    });
    return list;
  }

  /** Wer würfelt? Der Charakter mit dem besten Wert, sofern nicht festgelegt. */
  pickActor(check) {
    if (check.who) {
      const c = this.state.party.find((p) => p.id === check.who || p.name === check.who);
      if (c) return c;
    }
    if (check.hook) {
      const id = this.state.hooks?.[check.hook];
      const c = this.state.party.find((p) => p.id === id);
      if (c) return c;
    }
    const key = check.skill || check.ability;
    let best = null;
    let bestVal = -99;
    for (const c of this.state.party) {
      if (c.dead) continue;
      const v = rawMod(c, key);
      if (v > bestVal) { bestVal = v; best = c; }
    }
    return best || this.state.party[0];
  }

  /**
   * Eine Antwort wählen.
   * @returns {{type:'weiter'} | {type:'probe', roll:object, choice:object} | {type:'ende'}}
   */
  choose(index) {
    const node = this.node;
    const c = (node.choices || [])[index];
    if (!c) return { type: 'ende' };
    this.usedChoices.add(`${this.nodeId}:${index}`);
    this.state.flags[`_dlg_${this.dialogue.id}_used`] = [...this.usedChoices];

    if (c.flags) for (const f of c.flags) setFlag(this.state, f);
    if (c.onPick) c.onPick(this.state, this.ctx);
    if (c.effect) this.ctx.onEffect?.(c.effect);

    if (c.check) {
      const actor = this.pickActor(c.check);
      const opts = {
        advantage: typeof c.check.advantage === 'function' ? c.check.advantage(this.state) : c.check.advantage,
        disadvantage: typeof c.check.disadvantage === 'function' ? c.check.disadvantage(this.state) : c.check.disadvantage,
        bonus: typeof c.check.bonus === 'function' ? c.check.bonus(this.state) : c.check.bonus,
      };
      const key = c.check.skill || c.check.ability;
      const result = abilityCheck(actor, key, c.check.dc, opts);
      this.state.stats[result.success ? 'checksPassed' : 'checksFailed']++;
      logEvent(this.state, 'probe',
        `${actor.name}: ${result.label} ${result.total} gegen SG ${c.check.dc} — ${result.success ? 'Erfolg' : 'Misserfolg'}`);
      this.pendingCheck = {
        roll: result,
        actor,
        next: result.success ? c.check.success : c.check.fail,
        success: result.success,
        successFlags: result.success ? c.check.successFlags : c.check.failFlags,
        onResult: result.success ? c.check.onSuccess : c.check.onFail,
      };
      return { type: 'probe', roll: result, actor, choice: c };
    }

    if (c.exit || !c.to) {
      this.finished = true;
      return { type: 'ende' };
    }
    this.enter(c.to);
    return { type: 'weiter' };
  }

  /** Nach der Würfelanimation: Ergebnis anwenden. */
  resolveCheck() {
    const p = this.pendingCheck;
    this.pendingCheck = null;
    if (!p) return { type: 'ende' };
    if (p.successFlags) for (const f of p.successFlags) setFlag(this.state, f);
    if (p.onResult) p.onResult(this.state, this.ctx);
    if (!p.next) {
      this.finished = true;
      return { type: 'ende' };
    }
    this.enter(p.next);
    return { type: 'weiter' };
  }

  /** Fortsetzen bei Knoten ohne Auswahl. */
  advance() {
    const node = this.node;
    if (!node) return { type: 'ende' };
    if (node.end) {
      this.finished = true;
      if (node.onExit) node.onExit(this.state, this.ctx);
      return { type: 'ende' };
    }
    if (node.to) {
      this.enter(node.to);
      return { type: 'weiter' };
    }
    // Wichtig: die *gefilterte* Liste prüfen. Fallen alle Antworten durch ihre
    // Bedingungen weg, gibt es nichts mehr zu wählen — dann ist das Gespräch
    // vorbei, statt ohne Ausweg stehen zu bleiben.
    if (!node.choices || node.choices.length === 0 || this.choices().length === 0) {
      this.finished = true;
      if (node.onExit) node.onExit(this.state, this.ctx);
      return { type: 'ende' };
    }
    return { type: 'warte' };
  }
}

function rawMod(char, key) {
  if (SKILLS[key]) {
    return abilityMod(char.abilities[SKILLS[key].ability]) + (char.skills.includes(key) ? char.proficiency : 0);
  }
  return abilityMod(char.abilities[key] ?? 10);
}

/** Vorschau für die Oberfläche: Bonus, SG, Erfolgschance. */
export function checkPreview(actor, check, state) {
  const key = check.skill || check.ability;
  const isSkill = !!SKILLS[key];
  const mod = rawMod(actor, key);
  const extra = typeof check.bonus === 'function' ? check.bonus(state) : (check.bonus || 0);
  const total = mod + extra;
  const adv = typeof check.advantage === 'function' ? check.advantage(state) : !!check.advantage;
  const dis = typeof check.disadvantage === 'function' ? check.disadvantage(state) : !!check.disadvantage;
  const need = Math.max(2, Math.min(20, check.dc - total));
  let p = (21 - need) / 20;
  if (adv && !dis) p = 1 - (1 - p) ** 2;
  if (dis && !adv) p = p ** 2;
  return {
    label: isSkill ? SKILLS[key].name : ABILITY_NAMES[key],
    dc: check.dc,
    mod: total,
    advantage: adv && !dis,
    disadvantage: dis && !adv,
    chance: Math.round(p * 100),
    key,
  };
}
