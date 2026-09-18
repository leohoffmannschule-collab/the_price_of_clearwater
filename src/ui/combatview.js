// Die Kampfansicht: Initiative, Aktionsleiste, Zielen, Kampflog.

import { Combat } from '../engine/combat.js';
import { gridDistance } from '../engine/rules.js';
import { figureKindFor } from './figures.js';
import { PORTRAIT_PALETTES } from '../data/chargen.js';
import { symbolFor, flyingNumber } from './panels.js';
import { esc } from './screens.js';

export class CombatView {
  constructor(game) {
    this.game = game;
    this.zielModus = null;
    this.tags = [];
  }

  run(setup) {
    return new Promise((resolve) => {
      const g = this.game;
      this.resolve = resolve;
      this.setup = setup;
      this.combat = new Combat(g.state, setup, {
        onLog: (kind, text) => this.log(kind, text),
        onUpdate: () => this.zeichne(),
        onAiTurn: (c) => this.aiZug(c),
        onHit: (von, ziel, schaden, krit) => this.zeigeTreffer(von, ziel, schaden, krit),
        onAreaEffect: (tiles, action) => this.zeigeFlaeche(tiles, action),
        onDominate: (t) => g.toast(`${t.name} steht unter fremder Kontrolle.`),
        onForgetting: (c) => g.toast(`${c.name}: Vergessensgrad ${c.forgetting}.`),
        onEnd: (result) => this.beenden(result),
      });
      g.combat = this.combat;

      // Figuren in die Szene setzen
      g.view.clearAllHighlights();
      for (const [uid] of [...g.view.actors]) g.view.removeActor(uid);
      for (const c of this.combat.combatants) {
        const spec = c.isPlayer
          ? {
            uid: c.uid, side: 'held', x: c.x, y: c.y,
            raceId: c.ref.raceId, classId: c.ref.classId, kind: 'humanoid',
            palette: PORTRAIT_PALETTES[c.ref.portrait?.palette ?? 0],
          }
          : {
            uid: c.uid, side: c.side, x: c.x, y: c.y,
            creatureId: c.ref.id, tint: c.ref.tint, kind: figureKindFor(c.ref.id),
            large: c.large, scale: c.ref.huge ? 1.5 : 1,
            raceId: c.ref.id.startsWith('ghortan') ? 'halbork' : 'mensch',
            classId: 'hexenmeister',
            palette: { skin: c.ref.tint || '#8a7a6a', hair: '#2a1a14', cloth: '#3a2a28', accent: '#8a4a30' },
          };
        g.view.addActor(spec);
      }

      this.wurzel = document.createElement('div');
      this.wurzel.className = 'kampf-ui';
      g.hudRoot.appendChild(this.wurzel);
      this.logBox = document.createElement('div');
      this.logBox.className = 'kampflog scroll';
      g.hudRoot.appendChild(this.logBox);

      if (setup.intro) {
        g.narration(setup.intro).then(() => this.combat.start());
      } else {
        this.combat.start();
      }
      this.zeichne();
    });
  }

  beenden(result) {
    this.wurzel?.remove();
    this.logBox?.remove();
    // Die Verweise mit abräumen: die Bildschleife zeichnet sonst noch in der
    // Wartezeit bis zum Auflösen weiter und stellt die Namensschilder wieder
    // hin, die hier gerade entfernt wurden.
    this.wurzel = null;
    this.logBox = null;
    this.game.view.clearAllHighlights();
    this.tagsWeg();
    this.zielModus = null;
    const r = this.resolve;
    this.resolve = null;
    setTimeout(() => r?.(result), 900);
  }

  log(kind, text) {
    if (!this.logBox) return;
    const z = document.createElement('div');
    z.className = `z ${kind}`;
    z.textContent = text;
    this.logBox.appendChild(z);
    this.logBox.scrollTop = this.logBox.scrollHeight;
  }

  /* ─────────────────────── Zeichnen ─────────────────────── */

  zeichne() {
    const c = this.combat;
    if (!c || c.over || !this.wurzel) return;
    const cur = c.current;
    this.game.hud.render();

    // Figuren an ihre Felder setzen (falls die Engine sie versetzt hat)
    for (const k of c.combatants) {
      const a = this.game.view.actors.get(k.uid);
      if (!a) continue;
      if (c.isDown(k) && !a.tot) this.game.view.playDeath(k.uid);
      if (!a.gehen && (a.x !== k.x || a.y !== k.y)) this.game.view.setActorTile(k.uid, k.x, k.y);
    }
    if (cur) this.game.view.setSelected(cur.uid);

    this.wurzel.innerHTML = `
      <div class="initiative">
        ${c.order.map((k) => `
          <div class="init-eintrag ${k.side} ${k === cur ? 'dran' : ''} ${c.isDown(k) ? 'tot' : ''}">
            <span>${esc(k.name)}</span>
            <span class="ini-hp">${c.isDown(k) ? '—' : `${k.ref.hp}/${k.maxHp}`}</span>
          </div>`).join('')}
      </div>
      <div class="aktionsleiste">
        ${this.zielModus ? `<div class="ziel-hinweis">Ziel wählen für <b>${esc(this.zielModus.action.name)}</b>
          <span class="abbruch">Esc bricht ab</span></div>` : ''}
        <div class="zug-info">
          <span class="marke">${cur ? esc(cur.name) : ''}</span>
          <span>Runde ${c.round}</span>
          ${cur?.isPlayer ? `
            <span class="ressource">Aktion <span class="punkt ${cur.actionUsed && cur.extraActions <= 0 ? '' : 'frei'}"></span></span>
            <span class="ressource">Bonus <span class="punkt bonus ${cur.bonusUsed ? '' : 'frei'}"></span></span>
            <span class="bewegung-anzeige">Bewegung ${Math.max(0, Math.round((cur.movement || 0) * 1.5 * 10) / 10)} m</span>
            <button data-x="ende" style="padding:4px 12px;font-size:12px">Zug beenden ␣</button>
          ` : '<span style="color:var(--pergament-matt)">…</span>'}
        </div>
        <div class="slots"></div>
      </div>`;

    const slots = this.wurzel.querySelector('.slots');
    if (cur?.isPlayer) {
      const aktionen = [...cur.actions, ...(this.combat.scenario.specialActions || [])
        .filter((s) => !s.available || s.available(this.combat, cur))
        .map((s) => ({ ...s, scenario: true, icon: s.icon || 'merkmal' }))];
      aktionen.forEach((a, i) => {
        const el = document.createElement('div');
        const gesperrt = !this.kannNutzen(cur, a);
        el.className = `slot ${gesperrt ? 'gesperrt' : ''} ${this.zielModus?.action.id === a.id ? 'gewaehlt' : ''}`;
        const rest = a.remaining ?? (a.level > 0 ? cur.ref.slots?.[a.level - 1] : null);
        el.innerHTML = `
          <span class="sym">${symbolFor(a)}</span>
          <span class="kurz">${esc(a.name.slice(0, 11))}</span>
          ${a.level > 0 ? `<span class="grad">${a.level}</span>` : ''}
          ${rest !== null && rest !== undefined ? `<span class="zahl">${rest}</span>` : ''}`;
        el.onmouseenter = (e) => this.tooltip(e, a);
        el.onmouseleave = () => this.tooltipWeg();
        el.onclick = () => { if (!gesperrt) this.waehleAktion(cur, a); };
        slots.appendChild(el);
      });
      this.aktuelleAktionen = aktionen;
      this.zeigeBewegung(cur);
    } else {
      this.game.view.clearHighlight('bewegung');
    }

    this.wurzel.querySelector('[data-x=ende]')?.addEventListener('click', () => this.zugBeenden());
    this.updateTags();
  }

  kannNutzen(c, a) {
    if (a.scenario) return true;
    const cost = a.cost || 'aktion';
    if (cost === 'aktion' && c.actionUsed && c.extraActions <= 0) return false;
    if (cost === 'bonus' && c.bonusUsed) return false;
    if (cost === 'reaktion' || cost === 'frei') return false;
    if (a.level > 0 && a.kind === 'zauber' && (c.ref.slots?.[a.level - 1] ?? 0) <= 0) return false;
    if (a.maxUses && (c.ref.uses?.[a.id] ?? a.maxUses) <= 0) return false;
    if (a.remaining !== undefined && a.remaining <= 0) return false;
    return true;
  }

  zeigeBewegung(c) {
    if (this.zielModus) return;
    const { dist } = this.combat.reachable(c);
    const felder = [...dist.keys()].map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    });
    this.game.view.highlight('bewegung', felder, '#6aa8c0');
  }

  waehleAktion(c, a) {
    this.tooltipWeg();
    if (a.scenario) {
      if (a.needsTarget) { this.zielModus = { action: a, actor: c }; this.zeichne(); return; }
      a.run(this.combat, c, {});
      this.zeichne();
      return;
    }
    if (a.targets === 'selbst' || a.dodge || a.dash || a.grantAction) {
      this.ausfuehren(c, a, {});
      return;
    }
    this.zielModus = { action: a, actor: c };
    this.game.view.clearHighlight('bewegung');
    // Reichweite anzeigen
    const felder = [];
    const r = a.range ?? 1;
    for (let y = 0; y < this.combat.map.h; y++) {
      for (let x = 0; x < this.combat.map.w; x++) {
        const tv = this.combat.tileAt(x, y);
        if (tv === 1 || tv === 6) continue;
        if (gridDistance({ x, y }, c) <= r) felder.push({ x, y });
      }
    }
    this.game.view.highlight('ziel', felder, a.heal ? '#6fa85c' : '#c8a14a');
    this.zeichne();
  }

  onTileClick(x, y) {
    const c = this.combat?.current;
    if (!c || !c.isPlayer || this.combat.over) return;
    if (this.zielModus) {
      const a = this.zielModus.action;
      if (a.scenario) {
        const ziel = this.combat.occupant(x, y);
        a.run(this.combat, c, { target: ziel, point: { x, y } });
        this.zielAbbrechen();
        this.zeichne();
        return;
      }
      if (a.shape || a.targets === 'punkt') { this.ausfuehren(c, a, { x, y }); return; }
      const ziel = this.combat.occupant(x, y);
      if (ziel) this.ausfuehren(c, a, { target: ziel });
      return;
    }
    // Bewegung
    const pfad = this.combat.pathTo(c, x, y);
    if (!pfad) return;
    const r = this.combat.move(c, x, y);
    if (r.ok) {
      this.game.view.walk(c.uid, r.path, () => this.zeichne());
      this.game.view.focusOn(x, y);
    }
    this.zeichne();
  }

  onActorClick(uid) {
    const k = this.combat?.combatants.find((x) => x.uid === uid);
    if (!k) return;
    if (this.zielModus) { this.onTileClick(k.x, k.y); return; }
    this.game.view.focusOn(k.x, k.y);
  }

  ausfuehren(c, a, aim) {
    const ziel = aim.target || (aim.x !== undefined ? this.combat.occupant(aim.x, aim.y) : null);
    if (a.attack && ziel) this.game.view.playAttack(c.uid, ziel.uid);
    else if (a.kind === 'zauber' || a.shape) this.game.view.playCast(c.uid);
    const res = this.combat.perform(c, a, aim);
    if (!res.ok) { this.game.toast(res.reason || 'Nicht möglich.'); return; }
    if (a.shape && aim.x !== undefined) {
      const farbe = a.damage?.[0]?.type === 'feuer' ? '#ff8030'
        : a.damage?.[0]?.type === 'kaelte' ? '#8ad0e8'
          : a.damage?.[0]?.type === 'blitz' ? '#c0d8ff' : '#c8a14a';
      this.game.view.burst(aim.x, aim.y, farbe, a.shape.radius || 2);
    }
    this.zielAbbrechen();
    this.zeichne();
  }

  zielAbbrechen() {
    this.zielModus = null;
    this.game.view.clearHighlight('ziel');
  }

  zugBeenden() {
    if (!this.combat || this.combat.over) return;
    this.zielAbbrechen();
    this.combat.endTurn();
    this.zeichne();
  }

  /** Gegnerzug mit kurzer Verzögerung, damit man ihn lesen kann. */
  aiZug(c) {
    setTimeout(() => {
      if (!this.combat || this.combat.over) return;
      const vorher = { x: c.x, y: c.y };
      this.combat.runAiTurn(c);
      const a = this.game.view.actors.get(c.uid);
      if (a && (c.x !== vorher.x || c.y !== vorher.y)) {
        this.game.view.setActorTile(c.uid, c.x, c.y);
      }
      this.zeichne();
    }, 520);
  }

  zeigeTreffer(von, ziel, schaden, krit) {
    const v = this.game.view;
    v.playHit(ziel.uid, krit);
    const pos = v.actorScreenPos(ziel.uid, 1.05);
    flyingNumber(this.game, pos, `−${schaden}`, krit ? 'krit' : 'schaden');
    if (von && von.uid !== ziel.uid) v.playAttack(von.uid, ziel.uid);
  }

  zeigeFlaeche(tiles, action) {
    const typ = action.damage?.[0]?.type;
    const farbe = typ === 'feuer' ? '#ff8030' : typ === 'kaelte' ? '#8ad0e8'
      : typ === 'gift' ? '#7fa84a' : typ === 'nekrotisch' ? '#8a4ab0' : '#c8a14a';
    this.game.view.highlight('flaeche', tiles, farbe, 0.05);
    setTimeout(() => this.game.view.clearHighlight('flaeche'), 700);
  }

  /** Namensschilder über den Kämpfenden. */
  tagsWeg() {
    for (const t of this.tags) t.remove();
    this.tags = [];
  }

  updateTags() {
    const c = this.combat;
    if (!c || c.over || !this.wurzel || !this.game.view) { this.tagsWeg(); return; }
    while (this.tags.length < c.combatants.length) {
      const el = document.createElement('div');
      el.className = 'welt-name';
      this.game.overlay.appendChild(el);
      this.tags.push(el);
    }
    c.combatants.forEach((k, i) => {
      const el = this.tags[i];
      if (!el) return;
      const pos = this.game.view.actorScreenPos(k.uid, 1.25);
      if (!pos || pos.hinten || c.isDown(k)) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.className = `welt-name ${k.side === 'feind' ? 'feind' : ''}`;
      el.dataset.marke = k.uid;
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      const anteil = Math.max(0, k.ref.hp / k.maxHp);
      el.innerHTML = `${esc(k.name)}
        <div class="mini-balken"><i style="width:${anteil * 100}%"></i></div>`;
    });
  }

  tooltip(e, a) {
    this.tooltipWeg();
    const el = document.createElement('div');
    el.className = 'tooltip';
    const meta = [];
    if (a.cost) meta.push(a.cost === 'aktion' ? 'Aktion' : a.cost === 'bonus' ? 'Bonusaktion' : a.cost);
    if (a.range) meta.push(`Reichweite ${Math.round(a.range * 1.5)} m`);
    if (a.level > 0) meta.push(`Grad ${a.level}`);
    if (a.damage) meta.push(a.damage.map((d) => `${d.dice} ${d.type}`).join(' + '));
    if (a.save) meta.push(`${a.save.ability?.toUpperCase()}-RW gegen SG ${a.dc || a.save.dc}`);
    if (a.heal) meta.push(`Heilung ${a.heal}`);
    el.innerHTML = `<h4>${esc(a.name)}</h4>
      <div class="meta">${esc(meta.join(' · '))}</div>
      <p>${esc(a.desc || '')}</p>`;
    document.getElementById('toast').appendChild(el);
    const r = e.currentTarget.getBoundingClientRect();
    el.style.left = `${Math.min(window.innerWidth - 330, r.left)}px`;
    el.style.top = `${r.top - el.offsetHeight - 10}px`;
    this.tip = el;
  }

  tooltipWeg() {
    this.tip?.remove();
    this.tip = null;
  }

  handleKey(e) {
    if (!this.combat || this.combat.over) return;
    if (e.key === 'Escape') { this.zielAbbrechen(); this.zeichne(); return; }
    if (e.key === ' ') { e.preventDefault(); this.zugBeenden(); return; }
    const n = Number(e.key);
    const cur = this.combat.current;
    if (n >= 1 && n <= 9 && cur?.isPlayer && this.aktuelleAktionen) {
      const a = this.aktuelleAktionen[n - 1];
      if (a && this.kannNutzen(cur, a)) this.waehleAktion(cur, a);
    }
  }
}
