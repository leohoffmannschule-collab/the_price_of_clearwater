// Rundenbasierter Kampf auf dem Raster.
// 1 Feld = 1,5 m. Initiative, Aktion / Bonusaktion / Reaktion / Bewegung,
// Flächen, Zustände, Konzentration, legendäre Aktionen, Schauplatz-Aktionen
// und die Sondermechaniken der Kampagne (Gründersteine, Schriftrolle, Stab).

import { roll, d20, die, pick, randInt, average } from './rng.js';
import {
  attackRoll, savingThrow, applyDamage, heal, armorClass, abilityMod,
  addCondition, removeCondition, hasCondition, gridDistance, proficiencyBonus,
} from './rules.js';
import { characterActions, startCombat as prepChar } from './character.js';
import { spawnCreature, CREATURES } from '../data/creatures.js';

export const TERRAIN = { FREI: 0, WAND: 1, SCHWIERIG: 2, WASSER: 3, ABGRUND: 4, DECKUNG: 5, GEBAEUDE: 6 };

export class Combat {
  /**
   * @param {object} state Spielzustand
   * @param {object} setup { map, enemies, allies, scenario, title, music }
   * @param {object} ctx   { onLog, onUpdate, onEnd, onPrompt }
   */
  constructor(state, setup, ctx = {}) {
    this.state = state;
    this.setup = setup;
    this.ctx = ctx;
    this.map = setup.map;
    this.round = 0;
    // Bezugsgröße der Kampagne ist die volle Gruppe aus drei Figuren.
    const stark = Math.max(1, state.party.filter((c) => !c.dead).length);
    this.gruppenFaktor = Math.min(1, stark / 3);
    this.turnIndex = 0;
    this.order = [];
    this.combatants = [];
    this.log = [];
    this.over = false;
    this.result = null;
    this.scenario = setup.scenario || {};
    this.flags = {};
    this.pendingReaction = null;
    this.build();
  }

  /* ─────────────────────── Aufbau ─────────────────────── */

  build() {
    const starts = this.setup.playerStart || [];
    this.state.party.forEach((char, i) => {
      if (char.dead) return;
      prepChar(char);
      const pos = starts[i] || { x: 2, y: 4 + i };
      this.combatants.push(this.wrapPlayer(char, pos));
    });
    for (const a of this.setup.allies || []) {
      const c = spawnCreature(a.id, a.overrides || {});
      this.combatants.push(this.wrapCreature(c, a, 'verbuendet'));
    }
    for (const e of this.skaliereGegner(this.setup.enemies || [])) {
      const c = spawnCreature(e.id, e.overrides || {});
      this.combatants.push(this.wrapCreature(c, e, 'feind'));
    }
  }

  /**
   * Die Begegnungen sind für eine volle Gruppe von drei Figuren geschrieben.
   * Wer allein oder zu zweit loszieht, stünde sonst vor Kämpfen, die schon
   * als Zwischenstation tödlich wären — also zieht die Gegnerseite mit.
   *
   * Fußvolk wird in der Zahl gekürzt (die Aktionsrechnung bleibt so heil),
   * Bosse bleiben stehen und geben stattdessen Trefferpunkte ab — sie sind
   * jeweils der ganze Kampf, und ein halber Boss wäre keiner mehr.
   */
  skaliereGegner(enemies) {
    if (this.gruppenFaktor >= 1 || !enemies.length) return enemies;
    const fussvolk = enemies.filter((e) => !CREATURES[e.id]?.boss);
    const bosse = enemies.filter((e) => CREATURES[e.id]?.boss);
    const behalten = Math.max(bosse.length ? 0 : 1, Math.round(fussvolk.length * this.gruppenFaktor));
    return [...bosse, ...fussvolk.slice(0, behalten)];
  }

  wrapPlayer(char, pos) {
    return {
      uid: char.id,
      ref: char,
      isPlayer: true,
      side: 'held',
      name: char.name,
      x: pos.x, y: pos.y,
      get hp() { return char.hp; },
      set hp(v) { char.hp = v; },
      maxHp: char.maxHp,
      speed: char.speed,
      tint: null,
      conditions: char.conditions,
      actions: characterActions(char),
    };
  }

  wrapCreature(c, placement, side) {
    // Bosse tragen den Kampf allein — für eine kleinere Gruppe geben sie
    // Trefferpunkte ab, statt dass einer von ihnen wegfällt.
    if (side === 'feind' && c.boss && this.gruppenFaktor < 1 && !c.skaliert) {
      c.hp = Math.max(1, Math.round(c.hp * this.gruppenFaktor));
      c.maxHp = c.hp;
      c.skaliert = true;
    }
    return {
      uid: c.uid,
      ref: c,
      isPlayer: false,
      side,
      name: c.name,
      x: placement.x ?? randInt(1, this.map.w - 2),
      y: placement.y ?? randInt(1, this.map.h - 2),
      get hp() { return c.hp; },
      set hp(v) { c.hp = v; },
      maxHp: c.maxHp,
      speed: Math.round((c.speed || 6)),
      tint: c.tint,
      conditions: c.conditions,
      actions: c.actions || [],
      large: c.large || c.huge,
    };
  }

  /* ─────────────────────── Initiative ─────────────────────── */

  start() {
    this.round = 1;
    this.order = this.combatants.map((c) => {
      const bonus = c.isPlayer ? c.ref.initiativeBonus : abilityMod(c.ref.abilities.ge);
      const r = d20(bonus);
      return { c, init: r.total, tiebreak: bonus };
    }).sort((a, b) => b.init - a.init || b.tiebreak - a.tiebreak).map((x) => x.c);
    this.state.stats.combats++;
    this.logLine('kampf', `Kampf beginnt — ${this.setup.title || 'Begegnung'}`);
    this.scenario.onStart?.(this);
    this.turnIndex = -1;
    this.nextTurn();
    return this;
  }

  get current() {
    return this.order[this.turnIndex];
  }

  nextTurn() {
    if (this.over) return;
    // Legendäre Aktionen zwischen den Zügen
    this.turnIndex++;
    if (this.turnIndex >= this.order.length) {
      this.endRound();
      if (this.over) return;
      this.turnIndex = 0;
      this.round++;
      this.startRound();
      if (this.over) return;
    }
    const c = this.current;
    if (!c) return;
    if (this.isDown(c)) { this.nextTurn(); return; }
    this.beginTurn(c);
  }

  startRound() {
    this.logLine('runde', `— Runde ${this.round} —`);
    this.scenario.onRoundStart?.(this, this.round);
    if (this.setup.lairActions && this.round > 1) this.lairAction();
    this.checkEnd();
  }

  endRound() {
    for (const c of this.combatants) {
      if (this.isDown(c)) continue;
      const cr = c.ref;
      if (!c.isPlayer && cr.traits?.some((t) => t.selfDamage)) {
        const d = cr.traits.find((t) => t.selfDamage).selfDamage;
        const extra = this.flags.ysmerethHelps ? 25 : d;
        applyDamage(cr, extra, 'unvermeidbar', { ignoreResistance: true });
        this.logLine('umgebung', `${c.name} erleidet ${extra} unvermeidbaren Schaden — die Macht zerreißt ihn von innen.`);
      }
    }
    this.scenario.onRoundEnd?.(this, this.round);
    this.checkEnd();
  }

  beginTurn(c) {
    c.movement = this.effectiveSpeed(c);
    c.actionUsed = false;
    c.bonusUsed = false;
    c.reactionUsed = false;
    c.extraActions = 0;
    c.dodging = false;
    c.helpedBy = null;
    c.movedFrom = { x: c.x, y: c.y };
    const cr = c.ref;

    if (hasCondition(cr, 'schlafend') || hasCondition(cr, 'gelaehmt') || hasCondition(cr, 'betaeubt') || hasCondition(cr, 'weinend')) {
      this.logLine('zustand', `${c.name} kann nicht handeln.`);
      this.endTurn();
      return;
    }
    if (c.isPlayer && cr.downed) {
      this.deathSave(c);
      this.endTurn();
      return;
    }

    // Aufladungswürfe (Aufladung 5–6)
    for (const a of c.actions) {
      if (a.recharge && c.rechargeUsed?.[a.id]) {
        if (die(6) >= a.recharge) {
          c.rechargeUsed[a.id] = false;
          this.logLine('gegner', `${c.name}: ${a.name} ist wieder bereit.`);
        }
      }
    }

    // Regeneration
    const regenTrait = cr.traits?.find((t) => t.regen);
    if (regenTrait) {
      const wet = this.tileAt(c.x, c.y) === TERRAIN.WASSER || this.scenario.wet;
      if (!regenTrait.regenOnWet || wet) {
        const got = heal(cr, regenTrait.regen);
        if (got) this.logLine('gegner', `${c.name} heilt ${got} TP im nassen Stein.`);
      }
    }

    // Zwei Stimmen (Ghortan Phase III)
    if (cr.traits?.some((t) => t.twoVoices) && die(6) === 1) {
      const line = pick(cr.voiceBreaks || ['„— wartet —"']);
      this.logLine('stimme', line);
    }

    this.scenario.onTurnStart?.(this, c);
    this.ctx.onUpdate?.();

    if (!c.isPlayer) {
      // Gegnerzug wird vom Aufrufer über runAiTurn() getaktet (Animation).
      this.ctx.onAiTurn?.(c);
    }
  }

  endTurn() {
    const c = this.current;
    if (c) {
      this.tickConditions(c);
      this.scenario.onTurnEnd?.(this, c);
      // Legendäre Aktionen der Bosse nach jedem fremden Zug
      if (c.isPlayer) this.legendaryPhase();
    }
    this.checkEnd();
    if (!this.over) this.nextTurn();
  }

  tickConditions(c) {
    const cr = c.ref;
    const keep = [];
    for (const cond of cr.conditions || []) {
      if (cond.saveEnds) {
        const s = savingThrow(cr, cond.saveEnds, cond.dc || 13);
        if (s.success) {
          this.logLine('zustand', `${c.name} schüttelt ${cond.id} ab (${s.total} gegen SG ${cond.dc || 13}).`);
          continue;
        }
      }
      cond.rounds--;
      if (cond.rounds > 0) keep.push(cond);
      else this.logLine('zustand', `${c.name}: ${cond.id} endet.`);
    }
    cr.conditions = keep;
  }

  /* ─────────────────────── Karte & Bewegung ─────────────────────── */

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return TERRAIN.WAND;
    return this.map.tiles[y * this.map.w + x];
  }

  occupant(x, y) {
    return this.combatants.find((c) => !this.isDown(c) && c.x === x && c.y === y) || null;
  }

  passable(x, y, mover) {
    const t = this.tileAt(x, y);
    if (t === TERRAIN.WAND || t === TERRAIN.ABGRUND || t === TERRAIN.GEBAEUDE) return false;
    const occ = this.occupant(x, y);
    if (occ && occ !== mover) return false;
    return true;
  }

  moveCost(x, y) {
    const t = this.tileAt(x, y);
    if (t === TERRAIN.SCHWIERIG) return 2;
    if (t === TERRAIN.WASSER) return this.scenario.deepWater ? 3 : 2;
    if (this.map.webs?.has(`${x},${y}`)) return 2;
    return 1;
  }

  effectiveSpeed(c) {
    let s = c.speed;
    const cr = c.ref;
    if (hasCondition(cr, 'verlangsamt')) s = Math.floor(s / 2);
    if (hasCondition(cr, 'festgesetzt') || hasCondition(cr, 'gepackt')) s = 0;
    for (const cond of cr.conditions || []) if (cond.id === 'gehastet') s *= 2;
    return s;
  }

  /** Erreichbare Felder mit Restbewegung (Dijkstra auf kleinem Raster). */
  reachable(c, budget = null) {
    const max = budget ?? c.movement ?? 0;
    const start = `${c.x},${c.y}`;
    const dist = new Map([[start, 0]]);
    const prev = new Map();
    const queue = [{ x: c.x, y: c.y, d: 0 }];
    while (queue.length) {
      queue.sort((a, b) => a.d - b.d);
      const cur = queue.shift();
      if (cur.d > (dist.get(`${cur.x},${cur.y}`) ?? Infinity)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cur.x + dx; const ny = cur.y + dy;
        if (!this.passable(nx, ny, c)) continue;
        const nd = cur.d + this.moveCost(nx, ny);
        if (nd > max) continue;
        const key = `${nx},${ny}`;
        if (nd < (dist.get(key) ?? Infinity)) {
          dist.set(key, nd);
          prev.set(key, `${cur.x},${cur.y}`);
          queue.push({ x: nx, y: ny, d: nd });
        }
      }
    }
    dist.delete(start);
    return { dist, prev };
  }

  pathTo(c, tx, ty, budget = null) {
    const { dist, prev } = this.reachable(c, budget);
    const goal = `${tx},${ty}`;
    if (!dist.has(goal)) return null;
    const path = [goal];
    let cur = goal;
    while (prev.has(cur)) { cur = prev.get(cur); path.unshift(cur); }
    return { path: path.map((s) => { const [x, y] = s.split(',').map(Number); return { x, y }; }), cost: dist.get(goal) };
  }

  /** Bewegung ausführen, inklusive Gelegenheitsangriffen. */
  move(c, tx, ty) {
    const res = this.pathTo(c, tx, ty);
    if (!res) return { ok: false, reason: 'Zu weit oder versperrt.' };
    const threatsBefore = this.threateningEnemies(c);
    c.x = tx; c.y = ty;
    c.movement -= res.cost;
    const threatsAfter = new Set(this.threateningEnemies(c).map((e) => e.uid));
    for (const e of threatsBefore) {
      if (!threatsAfter.has(e.uid) && !e.reactionUsed && !this.isDown(e)) {
        this.opportunityAttack(e, c);
      }
    }
    this.scenario.onMove?.(this, c);
    this.ctx.onUpdate?.();
    return { ok: true, path: res.path, cost: res.cost };
  }

  threateningEnemies(c) {
    return this.combatants.filter((e) => !this.isDown(e) && e.side !== c.side
      && gridDistance(e, c) <= 1 && !hasCondition(e.ref, 'gelaehmt'));
  }

  opportunityAttack(attacker, target) {
    const atk = (attacker.actions || []).find((a) => a.attack && (a.range ?? 1) <= 2);
    if (!atk) return;
    attacker.reactionUsed = true;
    this.logLine('reaktion', `${attacker.name} nutzt einen Gelegenheitsangriff.`);
    this.resolveAttack(attacker, target, atk, { single: true });
  }

  /* ─────────────────────── Ziele & Flächen ─────────────────────── */

  tilesInShape(origin, shape, aimAt) {
    const out = [];
    if (!shape) return [{ x: aimAt.x, y: aimAt.y }];
    if (shape.type === 'kugel') {
      for (let y = aimAt.y - shape.radius; y <= aimAt.y + shape.radius; y++) {
        for (let x = aimAt.x - shape.radius; x <= aimAt.x + shape.radius; x++) {
          if (Math.hypot(x - aimAt.x, y - aimAt.y) <= shape.radius + 0.35) out.push({ x, y });
        }
      }
    } else if (shape.type === 'linie') {
      const dx = aimAt.x - origin.x; const dy = aimAt.y - origin.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      for (let i = 1; i <= shape.length; i++) {
        out.push({ x: Math.round(origin.x + (dx / len) * i), y: Math.round(origin.y + (dy / len) * i) });
      }
    } else if (shape.type === 'kegel') {
      const ang = Math.atan2(aimAt.y - origin.y, aimAt.x - origin.x);
      for (let y = origin.y - shape.length; y <= origin.y + shape.length; y++) {
        for (let x = origin.x - shape.length; x <= origin.x + shape.length; x++) {
          const d = Math.hypot(x - origin.x, y - origin.y);
          if (d > shape.length + 0.3 || d < 0.5) continue;
          let a = Math.atan2(y - origin.y, x - origin.x) - ang;
          while (a > Math.PI) a -= 2 * Math.PI;
          while (a < -Math.PI) a += 2 * Math.PI;
          if (Math.abs(a) <= Math.PI / 4.5) out.push({ x, y });
        }
      }
    }
    return out.filter((t) => {
      const v = this.tileAt(t.x, t.y);
      return v !== TERRAIN.WAND && v !== TERRAIN.GEBAEUDE;
    });
  }

  targetsInShape(actor, action, aimAt) {
    if (action.shape) {
      const tiles = this.tilesInShape(actor, action.shape, aimAt);
      const keys = new Set(tiles.map((t) => `${t.x},${t.y}`));
      return this.combatants.filter((c) => !this.isDown(c) && keys.has(`${c.x},${c.y}`));
    }
    const t = this.occupant(aimAt.x, aimAt.y);
    return t ? [t] : [];
  }

  inRange(actor, action, target) {
    const r = action.range ?? 1;
    if (r === 0) return true;
    return gridDistance(actor, target) <= r;
  }

  /* ─────────────────────── Aktionen ausführen ─────────────────────── */

  /**
   * Eine Aktion ausführen.
   * @param {object} c       Handelnder
   * @param {object} action  Aktionsbeschreibung
   * @param {object} aim     { x, y } oder { target: combatant }
   */
  perform(c, action, aim = {}) {
    if (this.over) return { ok: false };
    const cost = action.cost || 'aktion';
    if (cost === 'aktion' && c.actionUsed && c.extraActions <= 0) return { ok: false, reason: 'Aktion bereits verbraucht.' };
    if (cost === 'bonus' && c.bonusUsed) return { ok: false, reason: 'Bonusaktion bereits verbraucht.' };

    // Ressourcen prüfen
    if (action.level > 0 && c.isPlayer && action.kind === 'zauber') {
      const idx = action.level - 1;
      if ((c.ref.slots[idx] ?? 0) <= 0) return { ok: false, reason: 'Kein Zauberplatz dieses Grades.' };
    }
    if (action.maxUses && c.isPlayer) {
      const left = c.ref.uses[action.id] ?? action.maxUses;
      if (left <= 0) return { ok: false, reason: 'Keine Anwendungen übrig.' };
    }
    if (!c.isPlayer && action.uses) {
      if ((c.ref.usesLeft[action.id] ?? action.uses) <= 0) return { ok: false, reason: 'verbraucht' };
    }
    if (!c.isPlayer && action.recharge && c.rechargeUsed?.[action.id]) return { ok: false, reason: 'nicht aufgeladen' };

    const target = aim.target || (aim.x !== undefined ? this.occupant(aim.x, aim.y) : null);
    const point = aim.x !== undefined ? { x: aim.x, y: aim.y } : (target ? { x: target.x, y: target.y } : { x: c.x, y: c.y });

    if (action.targets === 'kreatur' && !target) return { ok: false, reason: 'Kein Ziel.' };
    if (target && !this.inRange(c, action, target) && !action.shape) return { ok: false, reason: 'Außer Reichweite.' };

    // Verbrauch buchen
    if (cost === 'aktion') { if (c.extraActions > 0) c.extraActions--; else c.actionUsed = true; }
    if (cost === 'bonus') c.bonusUsed = true;
    if (action.level > 0 && c.isPlayer && action.kind === 'zauber') c.ref.slots[action.level - 1]--;
    if (action.maxUses && c.isPlayer) c.ref.uses[action.id] = (c.ref.uses[action.id] ?? action.maxUses) - 1;
    if (!c.isPlayer && action.uses) c.ref.usesLeft[action.id] = (c.ref.usesLeft[action.id] ?? action.uses) - 1;
    if (!c.isPlayer && action.recharge) { c.rechargeUsed = c.rechargeUsed || {}; c.rechargeUsed[action.id] = true; }
    if (action.consume) {
      const item = c.ref.inventory?.find((i) => i.id === action.consume);
      if (item) item.count--;
      c.actions = characterActions(c.ref);
    }

    // Konzentration
    if (action.concentration) {
      if (c.ref.concentration) removeCondition(c.ref, 'konzentriert');
      c.ref.concentration = action.id;
      addCondition(c.ref, 'konzentriert', 99);
    }

    const result = this.resolveAction(c, action, target, point);
    this.ctx.onUpdate?.();
    this.checkEnd();
    return { ok: true, ...result };
  }

  resolveAction(c, action, target, point) {
    // Sonderaktionen des Szenarios
    if (action.scenario) {
      const res = this.scenario.specialActions?.find((s) => s.id === action.id)?.run(this, c, { target, point });
      return res || {};
    }
    if (action.dodge) { c.dodging = true; this.logLine('aktion', `${c.name} weicht aus.`); return {}; }
    if (action.dash) { c.movement += this.effectiveSpeed(c); this.logLine('aktion', `${c.name} spurtet.`); return {}; }
    if (action.help && target) { target.helpedBy = c.uid; this.logLine('aktion', `${c.name} hilft ${target.name}.`); return {}; }
    if (action.teleport) {
      if (this.passable(point.x, point.y, c)) { c.x = point.x; c.y = point.y; this.logLine('aktion', `${c.name}: ${action.name}.`); }
      return {};
    }
    if (action.grantAction) { c.extraActions++; this.logLine('aktion', `${c.name}: ${action.name} — eine zusätzliche Aktion.`); return {}; }
    if (action.summon) { return this.doSummon(c, action); }
    if (action.sacrificeMinion) { return this.doSacrifice(c, action); }
    if (action.wildshape) { return this.doWildshape(c, action); }

    const outcomes = [];

    // Heilung
    if (action.heal) {
      const targets = action.multiTarget
        ? this.combatants.filter((x) => x.side === c.side && !this.isDown(x) && gridDistance(x, c) <= (action.range || 6)).slice(0, action.multiTarget)
        : [target || c];
      for (const t of targets) {
        const expr = String(action.heal)
          .replace('MOD', String(abilityMod(c.ref.abilities?.[c.ref.spellAbility || 'we'] ?? 10)))
          .replace('STUFE', String(c.ref.level || 1));
        const amount = evalExpr(expr);
        if (t.ref.downed) { t.ref.downed = false; t.ref.deathSaves = { success: 0, fail: 0 }; }
        const got = heal(t.ref, amount);
        this.logLine('heilung', `${c.name} heilt ${t.name} um ${got} TP.`);
        outcomes.push({ type: 'heilung', target: t.uid, amount: got });
      }
    }

    if (action.tempHp) {
      const t = target || c;
      const v = typeof action.tempHp === 'number' ? action.tempHp : evalExpr(String(action.tempHp).replace('STUFE', c.ref.level || 1).replace('CH', abilityMod(c.ref.abilities.ch)));
      t.ref.tempHp = Math.max(t.ref.tempHp || 0, v);
      this.logLine('heilung', `${t.name} erhält ${v} temporäre TP.`);
    }

    // Angriffswurf
    if (action.attack) {
      const n = action.attacks || 1;
      for (let i = 0; i < n; i++) {
        if (!target || this.isDown(target)) break;
        outcomes.push(this.resolveAttack(c, target, action));
      }
      return { outcomes };
    }

    // Automatischer Treffer (Magisches Geschoss)
    if (action.autoHit && target) {
      const missiles = action.missiles || 1;
      let total = 0;
      for (let i = 0; i < missiles; i++) total += roll(action.damage[0].dice).total;
      const dealt = applyDamage(target.ref, total, action.damage[0].type);
      this.logLine('schaden', `${c.name}: ${action.name} — ${dealt} Schaden an ${target.name}. Sie verfehlen nie.`);
      this.afterDamage(c, target, dealt);
      return { outcomes: [{ type: 'schaden', target: target.uid, amount: dealt }] };
    }

    // Rettungswurf-Effekte (Fläche oder Einzelziel)
    if (action.save || action.damage || action.effects) {
      let targets;
      if (action.shape) targets = this.targetsInShape(c, action, point);
      else if (action.targets === 'alle') targets = this.combatants.filter((t) => !this.isDown(t) && gridDistance(t, c) <= (action.range || 6) && t !== c);
      else targets = target ? [target] : [];
      if (action.sparesAllies) targets = targets.filter((t) => t.side !== c.side);

      if (action.shape) {
        this.logLine('aktion', `${c.name} wirkt ${action.name}.`);
        this.ctx.onAreaEffect?.(this.tilesInShape(c, action.shape, point), action);
      }

      for (const t of targets) {
        outcomes.push(this.applySaveEffect(c, t, action));
      }
      if (action.difficultTerrain) {
        for (const tile of this.tilesInShape(c, action.shape, point)) {
          const i = tile.y * this.map.w + tile.x;
          if (this.map.tiles[i] === TERRAIN.FREI) this.map.tiles[i] = TERRAIN.SCHWIERIG;
        }
      }
      return { outcomes };
    }

    this.logLine('aktion', `${c.name}: ${action.name}.`);
    return { outcomes };
  }

  resolveAttack(c, target, action, opts = {}) {
    const cr = c.ref;
    let advantage = !!opts.advantage;
    let disadvantage = !!opts.disadvantage;
    if (target.dodging) disadvantage = true;
    if (c.helpedBy) { advantage = true; c.helpedBy = null; }
    // Rudeltaktik
    if (cr.traits?.some((t) => t.packTactics)) {
      const ally = this.combatants.find((a) => a !== c && a.side === c.side && !this.isDown(a) && gridDistance(a, target) <= 1);
      if (ally) advantage = true;
    }
    // Kaltblütiger Verrat
    const betrayal = cr.traits?.find((t) => t.betrayal);
    if (betrayal && !this.flags.betrayalUsed && target.uid === this.state.flags.losgeschnitten_von) {
      advantage = true;
      this.flags.betrayalUsed = true;
      this.logLine('stimme', '„Du hast mich als Erster losgebunden."');
    }
    if (action.ranged && this.threateningEnemies(c).length > 0) disadvantage = true;

    const bonus = action.attackBonus ?? (c.isPlayer ? (cr.spellAttack || 0) : 5);
    const atk = attackRoll(cr, target.ref, bonus, { advantage, disadvantage });
    if (!atk.hit) {
      this.logLine('angriff', `${c.name} → ${target.name}: ${atk.total} gegen RK ${atk.ac} — verfehlt.`);
      // Reaktion: Schild
      return { type: 'fehlschlag', target: target.uid, roll: atk };
    }
    // Reaktion: Schild des Gegners
    if (this.tryShieldReaction(target, atk)) {
      this.logLine('reaktion', `${target.name} wirkt Schild — der Angriff geht ins Leere.`);
      return { type: 'fehlschlag', target: target.uid, roll: atk, shielded: true };
    }
    // Reaktion: Schützen (Ghortan als Begleiter)
    const protector = this.findProtector(target);
    if (protector) {
      this.logLine('reaktion', `${protector.name} wirft sich dazwischen.`);
      target = protector;
    }

    let total = 0;
    let mainType = 'wucht';
    for (const d of action.damage || [{ dice: '1W4', type: 'wucht' }]) {
      let r = roll(d.dice);
      let dmg = r.total;
      if (atk.crit) dmg += roll(d.dice.replace(/\+\d+/, '')).total;
      total += dmg;
      mainType = d.type;
    }
    // Zusatzschaden gegen Festgesetzte
    if (action.bonusVsRestrained && hasCondition(target.ref, 'festgesetzt')) {
      total += roll(action.bonusVsRestrained.dice).total;
    }
    // Hinterhältiger Angriff
    if (c.isPlayer && cr.sneakDice > 0 && !this.flags[`sneak_${c.uid}_${this.round}`]) {
      const ally = this.combatants.find((a) => a !== c && a.side === c.side && !this.isDown(a) && gridDistance(a, target) <= 1);
      if (advantage || ally) {
        const sneak = roll(`${cr.sneakDice}W6`).total;
        total += sneak;
        this.flags[`sneak_${c.uid}_${this.round}`] = true;
        this.logLine('angriff', `Hinterhältiger Angriff: +${sneak}`);
      }
    }
    // Markierung / Göttliche Gunst
    for (const cond of cr.conditions || []) {
      if (cond.bonusDamage) total += roll(cond.bonusDamage.dice).total;
      if (cond.damageBonus) total += cond.damageBonus;
    }
    if (hasCondition(target.ref, 'markiert')) total += roll('1W6').total;

    const dealt = applyDamage(target.ref, total, mainType);
    this.logLine('angriff',
      `${c.name} → ${target.name}: ${atk.total} gegen RK ${atk.ac} — ${atk.crit ? 'KRITISCHER TREFFER! ' : 'Treffer. '}${dealt} ${mainType === 'wucht' ? 'Schaden' : mainType}.`);
    this.ctx.onHit?.(c, target, dealt, atk.crit);

    for (const e of action.effects || []) {
      if (e.save) {
        const s = savingThrow(target.ref, e.save.ability, e.save.dc);
        if (s.success) continue;
      }
      addCondition(target.ref, e.condition, e.rounds ?? 1, c.uid);
      if (e.escapeDc) {
        const cond = target.ref.conditions.find((x) => x.id === e.condition);
        if (cond) cond.escapeDc = e.escapeDc;
      }
      this.logLine('zustand', `${target.name} ist ${e.condition}.`);
    }
    this.afterDamage(c, target, dealt);
    return { type: 'treffer', target: target.uid, amount: dealt, crit: atk.crit, roll: atk };
  }

  applySaveEffect(c, t, action) {
    const cr = c.ref;
    const dc = action.save?.dc || action.dc || (cr.spellDc ?? 13);
    let dealt = 0;
    let saved = true;
    if (action.save) {
      const adv = this.flags.glockeLaeutet && t.side === 'held';
      const s = savingThrow(t.ref, action.save.ability, dc, { advantage: adv });
      saved = s.success;
      if (!saved && t.ref.legendaryLeft > 0) {
        t.ref.legendaryLeft--;
        saved = true;
        this.logLine('gegner', `${t.name} nutzt Legendäre Widerstandskraft (${t.ref.legendaryLeft} übrig).`);
      }
      this.logLine('rettung', `${t.name}: ${s.label}-RW ${s.total} gegen SG ${dc} — ${saved ? 'bestanden' : 'misslungen'}.`);
    } else {
      saved = false;
    }
    for (const d of action.damage || []) {
      let amount = roll(d.dice).total;
      if (saved) {
        if (action.save?.half || action.half) amount = Math.floor(amount / 2);
        else amount = 0;
      }
      if (amount > 0) dealt += applyDamage(t.ref, amount, d.type);
    }
    if (dealt > 0) {
      this.logLine('schaden', `${t.name} erleidet ${dealt} Schaden.`);
      this.ctx.onHit?.(c, t, dealt, false);
      if (action.drain) heal(cr, Math.floor(dealt * action.drain));
    }
    if (!saved) {
      for (const e of action.effects || []) {
        addCondition(t.ref, e.condition, e.rounds ?? 1, c.uid);
        const cond = t.ref.conditions.find((x) => x.id === e.condition);
        if (cond) {
          if (e.escapeDc) cond.escapeDc = e.escapeDc;
          if (e.saveEnds) { cond.saveEnds = e.saveEnds; cond.dc = dc; }
          if (e.acBonus) cond.acBonus = e.acBonus;
          if (e.inspirationDie) cond.inspirationDie = e.inspirationDie;
          if (e.bonusDamage) cond.bonusDamage = e.bonusDamage;
          if (e.damageBonus) cond.damageBonus = e.damageBonus;
          if (e.markDamage) cond.markDamage = e.markDamage;
        }
        this.logLine('zustand', `${t.name}: ${e.condition}.`);
      }
      if (action.forgetting && t.isPlayer) {
        t.ref.forgetting = (t.ref.forgetting || 0) + action.forgetting;
        this.logLine('vergessen', `${t.name} steigt auf Vergessensgrad ${t.ref.forgetting}.`);
        this.ctx.onForgetting?.(t.ref);
      }
      if (action.dominate && t.isPlayer) {
        addCondition(t.ref, 'bezaubert', 2, c.uid);
        this.logLine('stimme', `„Du gehörst mir, Kind." — ${t.name} wendet sich gegen die eigenen Gefährten.`);
        this.ctx.onDominate?.(t);
      }
      if (action.push) this.pushAway(c, t, action.push);
      if (action.knockdown) addCondition(t.ref, 'liegend', 1);
    }
    this.afterDamage(c, t, dealt);
    return { type: saved ? 'gerettet' : 'getroffen', target: t.uid, amount: dealt };
  }

  pushAway(from, target, tiles) {
    const dx = Math.sign(target.x - from.x);
    const dy = Math.sign(target.y - from.y);
    for (let i = 0; i < tiles; i++) {
      const nx = target.x + dx; const ny = target.y + dy;
      if (!this.passable(nx, ny, target)) break;
      target.x = nx; target.y = ny;
    }
  }

  tryShieldReaction(target, atk) {
    if (target.reactionUsed || this.isDown(target)) return false;
    const shield = (target.ref.reactions || []).find((r) => r.shieldReaction);
    if (!shield) return false;
    const left = target.ref.usesLeft?.[shield.id] ?? shield.uses ?? 0;
    if (left <= 0) return false;
    if (atk.total >= armorClass(target.ref) && atk.total < armorClass(target.ref) + (shield.acBonus || 5)) {
      target.ref.usesLeft[shield.id] = left - 1;
      target.reactionUsed = true;
      return true;
    }
    return false;
  }

  findProtector(target) {
    for (const c of this.combatants) {
      if (c === target || c.side !== target.side || this.isDown(c) || c.reactionUsed) continue;
      const prot = (c.ref.reactions || []).find((r) => r.protect);
      if (!prot) continue;
      const left = c.ref.usesLeft?.[prot.id] ?? prot.uses ?? 0;
      if (left <= 0) continue;
      if (gridDistance(c, target) > 1) continue;
      c.ref.usesLeft[prot.id] = left - 1;
      c.reactionUsed = true;
      return c;
    }
    return null;
  }

  afterDamage(source, target, dealt) {
    const cr = target.ref;
    if (cr.hp > 0) return;
    // Letzte Glut
    const burst = cr.traits?.find((t) => t.deathBurst)?.deathBurst;
    if (burst) {
      this.logLine('umgebung', `${target.name} platzt.`);
      for (const c of this.combatants) {
        if (this.isDown(c) || gridDistance(c, target) > burst.radius) continue;
        const s = savingThrow(c.ref, burst.save, burst.dc);
        const dmg = s.success ? 0 : roll(burst.dice).total;
        if (dmg) { applyDamage(c.ref, dmg, burst.type); this.logLine('schaden', `${c.name} erleidet ${dmg} Feuerschaden.`); }
      }
    }
    // Abyssaler Trotz
    const stand = cr.traits?.find((t) => t.lastStand);
    if (stand && !cr.usedLastStand) {
      const boss = this.combatants.find((c) => c.ref.boss && c.side === target.side && !this.isDown(c));
      if (boss && gridDistance(boss, target) <= 6) {
        cr.usedLastStand = true;
        cr.hp = 1;
        cr.dead = false;
        this.logLine('gegner', `${target.name} bleibt stehen. Abyssaler Trotz.`);
        return;
      }
    }
    // Unerbittliche Ausdauer
    if (target.isPlayer && cr.uses?.unerbittlich > 0) {
      cr.uses.unerbittlich = 0;
      cr.hp = 1;
      cr.downed = false;
      this.logLine('held', `${target.name} bleibt stehen. Unerbittliche Ausdauer.`);
      return;
    }
    if (!target.isPlayer) {
      this.state.stats.kills++;
      this.logLine('tod', `${target.name} fällt.`);
      this.scenario.onDeath?.(this, target, source);
      // Rudelführerin
      if (cr.traits?.some((t) => t.packLeader)) {
        for (const c of this.combatants) {
          if (c.side === target.side && c.ref.traits) c.ref.traits = c.ref.traits.filter((t) => !t.packTactics);
        }
        this.logLine('gegner', 'Die übrigen verlieren den Rudelsinn.');
      }
    } else {
      this.logLine('held', `${target.name} geht zu Boden.`);
    }
  }

  deathSave(c) {
    const cr = c.ref;
    const r = d20(0);
    if (r.natural === 20) {
      cr.hp = 1; cr.downed = false; cr.deathSaves = { success: 0, fail: 0 };
      this.logLine('held', `${c.name}: natürliche 20 — wieder auf den Beinen.`);
      return;
    }
    if (r.natural === 1) cr.deathSaves.fail += 2;
    else if (r.total >= 10) cr.deathSaves.success++;
    else cr.deathSaves.fail++;
    this.logLine('held', `${c.name}: Todesrettungswurf ${r.total} (${cr.deathSaves.success} Erfolge / ${cr.deathSaves.fail} Fehlschläge).`);
    if (cr.deathSaves.fail >= 3) {
      cr.dead = true;
      this.logLine('tod', `${c.name} stirbt.`);
    }
    if (cr.deathSaves.success >= 3) {
      cr.downed = true;
      cr.stable = true;
      this.logLine('held', `${c.name} ist stabil.`);
    }
  }

  doSummon(c, action) {
    const opt = pick(action.summon.options || [action.summon]);
    const limit = this.setup.minionLimit ?? 3;
    const alive = this.combatants.filter((x) => x.side === c.side && x.summoned && !this.isDown(x)).length;
    if (alive >= limit) { this.logLine('gegner', `${c.name} ruft — aber die Feldgrenze ist erreicht.`); return {}; }
    for (let i = 0; i < opt.count; i++) {
      if (this.combatants.filter((x) => x.side === c.side && x.summoned && !this.isDown(x)).length >= limit) break;
      const spot = this.freeSpotNear(c.x, c.y, 4);
      if (!spot) break;
      const cr = spawnCreature(opt.id);
      const w = this.wrapCreature(cr, spot, c.side);
      w.summoned = true;
      this.combatants.push(w);
      this.order.splice(this.order.indexOf(c) + 1, 0, w);
      this.logLine('gegner', `${cr.name} steigt aus den Fugen.`);
    }
    return {};
  }

  doSacrifice(c, action) {
    const minion = this.combatants.find((x) => x.side === c.side && x.summoned && !this.isDown(x));
    if (!minion) return {};
    minion.ref.hp = 0;
    minion.ref.dead = true;
    const got = heal(c.ref, action.heal || 20);
    this.logLine('gegner', `${c.name} zerreißt ${minion.name} und heilt ${got} TP. „Sie sind Material. Ihr auch."`);
    return {};
  }

  doWildshape(c, action) {
    const cr = c.ref;
    cr.wildshaped = true;
    cr.tempHp = 30;
    this.logLine('held', `${c.name} nimmt Wildgestalt an.`);
    return {};
  }

  freeSpotNear(x, y, radius) {
    for (let r = 1; r <= radius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx; const ny = y + dy;
          if (this.passable(nx, ny, null)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  /* ─────────────────────── Legendäre & Schauplatz-Aktionen ─────────────────────── */

  legendaryPhase() {
    for (const c of this.combatants) {
      const leg = c.ref.legendary;
      if (!leg || this.isDown(c) || c === this.current) continue;
      let budget = c.legendaryPenalty ? Math.max(0, leg.count - c.legendaryPenalty) : leg.count;
      if (budget <= 0) continue;
      let guard = 0;
      while (budget > 0 && guard++ < 4) {
        const options = leg.actions.filter((a) => (a.cost || 1) <= budget
          && (!a.uses || (c.ref.usesLeft[a.id] ?? a.uses) > 0));
        if (!options.length) break;
        const a = pick(options);
        const targets = this.combatants.filter((t) => t.side !== c.side && !this.isDown(t));
        if (!targets.length) break;
        const t = pick(targets);
        budget -= a.cost || 1;
        if (a.uses) c.ref.usesLeft[a.id] = (c.ref.usesLeft[a.id] ?? a.uses) - 1;
        this.logLine('legendaer', `Legendäre Aktion: ${a.name}`);
        if (a.minionActs) {
          const m = this.combatants.find((x) => x.side === c.side && x.summoned && !this.isDown(x));
          if (m) {
            const atk = m.actions.find((x) => x.attack);
            const near = this.combatants.filter((x) => x.side !== m.side && !this.isDown(x))
              .sort((x, y) => gridDistance(m, x) - gridDistance(m, y))[0];
            if (atk && near) this.resolveAttack(m, near, atk);
          }
        } else if (a.teleport) {
          const spot = this.freeSpotNear(t.x, t.y, 2);
          if (spot) { c.x = spot.x; c.y = spot.y; }
        } else if (a.attack) {
          if (gridDistance(c, t) <= (a.range || 1)) this.resolveAttack(c, t, a);
        } else {
          if (a.targets === 'alle') {
            for (const x of this.combatants.filter((v) => v.side !== c.side && !this.isDown(v) && gridDistance(v, c) <= (a.range || 6))) {
              this.applySaveEffect(c, x, a);
            }
          } else {
            this.applySaveEffect(c, t, a);
          }
        }
      }
    }
    this.ctx.onUpdate?.();
  }

  lairAction() {
    const r = die(4);
    const texts = {
      1: 'Fäden fallen: ein Feld wird schwieriges Gelände.',
      2: 'Der Himmel atmet: alle auf dem Platz, KON-RW SG 14 oder 2W6 Giftschaden.',
      3: 'Ein Gründerstein glüht weiß auf.',
      4: 'Die Gefesselten schreien — einer wird Richtung Brunnen gezogen.',
    };
    this.logLine('schauplatz', `Schauplatz-Aktion: ${texts[r]}`);
    if (r === 1) {
      const spot = this.freeSpotNear(Math.floor(this.map.w / 2), Math.floor(this.map.h / 2), 5);
      if (spot) this.map.tiles[spot.y * this.map.w + spot.x] = TERRAIN.SCHWIERIG;
    } else if (r === 2) {
      for (const c of this.combatants) {
        if (this.isDown(c)) continue;
        const s = savingThrow(c.ref, 'ko', 14);
        if (!s.success) {
          const d = roll('2W6').total;
          applyDamage(c.ref, d, 'gift');
          this.logLine('schaden', `${c.name}: ${d} Giftschaden.`);
        }
      }
    } else if (r === 3) {
      this.flags.steinLeuchtet = true;
      this.scenario.onStoneGlow?.(this);
    } else if (r === 4) {
      this.flags.buergerGezogen = (this.flags.buergerGezogen || 0) + 1;
      this.scenario.onCitizenDragged?.(this);
    }
    this.ctx.onUpdate?.();
  }

  /* ─────────────────────── Gegner-KI ─────────────────────── */

  runAiTurn(c) {
    if (this.over || this.isDown(c)) { this.endTurn(); return; }
    const cr = c.ref;

    // Fliehen
    if (cr.fleeAt && cr.hp / cr.maxHp <= cr.fleeAt && !c.fleeing) {
      const losses = this.combatants.filter((x) => x.side === c.side && this.isDown(x)).length;
      const total = this.combatants.filter((x) => x.side === c.side).length;
      if (cr.id === 'nasser_kleiner' ? losses / total >= 0.5 || this.flags.feuerEntzuendet : true) {
        c.fleeing = true;
        this.logLine('gegner', `${c.name} flieht.`);
        this.scenario.onFlee?.(this, c);
        c.ref.dead = true;
        this.endTurn();
        return;
      }
    }

    const enemies = this.combatants.filter((x) => x.side !== c.side && !this.isDown(x));
    if (!enemies.length) { this.endTurn(); return; }

    // Beschwören / Opfergabe zuerst
    const summonAction = c.actions.find((a) => a.summon);
    if (summonAction && (!summonAction.everyOtherRound || this.round % 2 === 1)) {
      const alive = this.combatants.filter((x) => x.side === c.side && x.summoned && !this.isDown(x)).length;
      if (alive < (this.setup.minionLimit ?? 3)) this.perform(c, summonAction, {});
    }
    const sac = c.actions.find((a) => a.sacrificeMinion);
    if (sac && cr.hp / cr.maxHp < 0.4 && this.combatants.some((x) => x.side === c.side && x.summoned && !this.isDown(x))) {
      this.perform(c, sac, {});
    }

    const target = this.pickTarget(c, enemies);

    // Flächenzauber, wenn er mehrere trifft
    const areaActions = c.actions.filter((a) => a.shape && this.canUse(c, a));
    let usedArea = false;
    for (const a of areaActions) {
      const best = this.bestAreaPoint(c, a);
      if (best && best.count >= 2) {
        // Er zielt auch dann, wenn Gefesselte im Radius liegen — aber nie zweimal auf dieselbe Figur.
        this.perform(c, a, best.point);
        usedArea = true;
        break;
      }
    }

    if (!usedArea && !c.actionUsed) {
      const ranged = c.actions.filter((a) => (a.attack || a.save) && !a.shape && this.canUse(c, a) && (a.range || 1) > 2);
      const melee = c.actions.filter((a) => a.attack && this.canUse(c, a) && (a.range || 1) <= 2);
      const dist = gridDistance(c, target);
      const preferRanged = cr.ai?.role === 'fernkampf' || cr.ai?.role === 'kontrolle' || cr.ai?.role === 'beschwoerer';

      if (preferRanged && ranged.length && dist <= (ranged[0].range || 12)) {
        this.perform(c, ranged.sort((a, b) => this.actionValue(b) - this.actionValue(a))[0], { target });
      } else if (dist <= 1 && melee.length) {
        this.perform(c, melee.sort((a, b) => this.actionValue(b) - this.actionValue(a))[0], { target });
      } else {
        // Hinbewegen
        const spot = this.stepToward(c, target, melee.length ? 1 : (ranged[0]?.range || 6));
        if (spot) this.move(c, spot.x, spot.y);
        const d2 = gridDistance(c, target);
        if (d2 <= 1 && melee.length) this.perform(c, melee[0], { target });
        else if (ranged.length && d2 <= (ranged[0].range || 12)) this.perform(c, ranged[0], { target });
      }
    }

    // Bonusaktion
    if (!c.bonusUsed) {
      const bonus = c.actions.filter((a) => a.cost === 'bonus' && this.canUse(c, a) && !a.summon && !a.sacrificeMinion);
      if (bonus.length) {
        const b = bonus[0];
        if (b.teleport) {
          const spot = this.freeSpotNear(target.x, target.y, 3);
          if (spot && gridDistance(c, target) > 3) this.perform(c, b, spot);
        } else if (b.attack && gridDistance(c, target) <= (b.range || 1)) {
          this.perform(c, b, { target });
        }
      }
    }

    // Gesang (Ghortan Phase II)
    const song = cr.traits?.find((t) => t.songTimer);
    if (song) {
      if (!c.hitThisRound) {
        this.state.counters.gesang = Math.min(song.songTimer, this.state.counters.gesang + 1);
        this.logLine('gesang', `Ghortan singt ungestört. (${this.state.counters.gesang}/${song.songTimer})`);
        if (this.state.counters.gesang >= song.songTimer) this.scenario.onSongComplete?.(this, c);
      } else {
        this.logLine('gesang', 'Der Gesang bricht ab.');
      }
      c.hitThisRound = false;
    }

    this.endTurn();
  }

  canUse(c, a) {
    if (a.uses && (c.ref.usesLeft?.[a.id] ?? a.uses) <= 0) return false;
    if (a.recharge && c.rechargeUsed?.[a.id]) return false;
    if (a.cost === 'aktion' && c.actionUsed && c.extraActions <= 0) return false;
    if (a.cost === 'bonus' && c.bonusUsed) return false;
    if (a.cost === 'reaktion') return false;
    return true;
  }

  actionValue(a) {
    let v = 0;
    for (const d of a.damage || []) v += average(d.dice);
    if (a.effects?.length) v += 6;
    if (a.dominate) v += 20;
    return v;
  }

  pickTarget(c, enemies) {
    const focus = c.ref.ai?.focus || 'naechster';
    const sorted = [...enemies];
    if (focus === 'schwaechster') sorted.sort((a, b) => a.ref.hp - b.ref.hp);
    else if (focus === 'staerkster') sorted.sort((a, b) => b.ref.hp - a.ref.hp);
    else if (focus === 'anker') {
      const anchored = sorted.filter((x) => x.ref.anchor);
      if (anchored.length) return anchored[0];
      sorted.sort((a, b) => gridDistance(c, a) - gridDistance(c, b));
    } else sorted.sort((a, b) => gridDistance(c, a) - gridDistance(c, b));
    // Nie zweimal hintereinander dieselbe Figur mit einem Flächenzauber (Sicherheitsnetz Band III)
    if (c.lastTarget && sorted.length > 1 && sorted[0].uid === c.lastTarget && c.ref.boss) {
      c.lastTarget = sorted[1].uid;
      return sorted[1];
    }
    c.lastTarget = sorted[0].uid;
    return sorted[0];
  }

  bestAreaPoint(c, action) {
    let best = null;
    const enemies = this.combatants.filter((x) => x.side !== c.side && !this.isDown(x));
    for (const e of enemies) {
      const point = { x: e.x, y: e.y };
      if ((action.range ?? 0) > 0 && gridDistance(c, point) > action.range) continue;
      const hit = this.targetsInShape(c, action, point);
      const foes = hit.filter((h) => h.side !== c.side).length;
      const friends = hit.filter((h) => h.side === c.side).length;
      const score = foes - friends * 1.5;
      if (!best || score > best.score) best = { point, score, count: foes };
    }
    return best;
  }

  stepToward(c, target, desired) {
    const { dist } = this.reachable(c);
    let best = null;
    for (const [key, cost] of dist) {
      const [x, y] = key.split(',').map(Number);
      const d = gridDistance({ x, y }, target);
      const score = Math.abs(d - desired) * 10 + cost * 0.1;
      if (!best || score < best.score) best = { x, y, score };
    }
    return best;
  }

  /* ─────────────────────── Ende ─────────────────────── */

  isDown(c) {
    return c.ref.dead || c.ref.hp <= 0;
  }

  checkEnd() {
    if (this.over) return;
    const heroesUp = this.combatants.some((c) => c.side === 'held' && !this.isDown(c));
    const foesUp = this.combatants.some((c) => c.side === 'feind' && !this.isDown(c));
    if (!foesUp) this.finish('sieg');
    else if (!heroesUp) this.finish('niederlage');
  }

  finish(result) {
    if (this.over) return;
    this.over = true;
    this.result = result;
    this.logLine('kampf', result === 'sieg' ? 'Der Kampf ist vorbei.' : 'Die Gruppe ist gefallen.');
    // Nach dem Kampf: Gestürzte stabilisieren sich
    for (const c of this.combatants) {
      if (c.isPlayer && c.ref.hp <= 0 && !c.ref.dead) {
        c.ref.hp = 1;
        c.ref.downed = false;
        c.ref.deathSaves = { success: 0, fail: 0 };
      }
      if (c.isPlayer) {
        c.ref.conditions = (c.ref.conditions || []).filter((x) => x.permanent);
        c.ref.concentration = null;
        c.ref.tempAc = 0;
      }
    }
    this.scenario.onEnd?.(this, result);
    this.ctx.onEnd?.(result, this);
  }

  logLine(kind, text) {
    this.log.push({ kind, text });
    if (this.log.length > 300) this.log.shift();
    this.ctx.onLog?.(kind, text);
  }
}

/** "2W6+3" oder "12" auswerten. */
function evalExpr(expr) {
  if (/^\d+$/.test(String(expr).trim())) return Number(expr);
  // Additionsketten wie "1W10+5"
  return roll(String(expr)).total;
}

/** Leere Karte mit Rahmen bauen. */
export function makeMap(w, h, fill = TERRAIN.FREI) {
  const tiles = new Array(w * h).fill(fill);
  for (let x = 0; x < w; x++) { tiles[x] = TERRAIN.WAND; tiles[(h - 1) * w + x] = TERRAIN.WAND; }
  for (let y = 0; y < h; y++) { tiles[y * w] = TERRAIN.WAND; tiles[y * w + w - 1] = TERRAIN.WAND; }
  return { w, h, tiles, webs: new Set() };
}

export function paintRect(map, x0, y0, x1, y1, value) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x > 0 && y > 0 && x < map.w - 1 && y < map.h - 1) map.tiles[y * map.w + x] = value;
    }
  }
}
