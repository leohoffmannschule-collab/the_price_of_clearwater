// Der Preis von Klarwasser — Einstieg und Spielsteuerung.
// Verbindet Regelkern, dreidimensionale Ansicht, Oberfläche und Inhalt.

import { View3D } from './ui/view3d.js';
import { newGameState, loadGame, saveGame, listSaves, setFlag, flag, tickClock, tickAshClock,
  addQuest, addQuestEntry, completeQuest, failQuest, awakenStaff, addItem, hasItem } from './engine/state.js';
import { levelUp as charLevelUp, longRest, shortRest } from './engine/character.js';
import { assignHooks, personalize } from './engine/hooks.js';
import { DialogueRunner } from './engine/dialogue.js';
import { getArea, kulisseFuerKarte } from './data/areas.js';
import { PORTRAIT_PALETTES } from './data/chargen.js';
import { mainMenu, characterCreator } from './ui/screens.js';
import { Hud } from './ui/hud.js';
import { DialogueView } from './ui/dialogueview.js';
import { CombatView } from './ui/combatview.js';
import { narration, toast, levelUpCard, endingCard, choiceModal, panel } from './ui/panels.js';
import { CONTENT } from './content/index.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('scene');
    this.overlay = document.getElementById('overlay');
    this.hudRoot = document.getElementById('hud');
    this.modal = document.getElementById('modal');
    this.toastRoot = document.getElementById('toast');
    this.view = new View3D(this.canvas);
    this.state = null;
    this.modus = 'menu'; // menu | erkundung | dialog | kampf
    this.combat = null;
    this.markers = [];
    this.hud = new Hud(this);
    this.dialogueView = new DialogueView(this);
    this.combatView = new CombatView(this);
    this.aktiveFigur = 0;
    this.busy = false;

    this.view.onTileClick = (x, y) => this.handleTileClick(x, y);
    this.view.onActorClick = (uid) => this.handleActorClick(uid);
    this.view.scene.registerBeforeRender(() => this.updateMarkers());
    window.addEventListener('keydown', (e) => this.handleKey(e));
  }

  /* ─────────────────────── Bildschirme ─────────────────────── */

  showMenu() {
    this.modus = 'menu';
    this.clearUi();
    this.view.clearArea();
    // Hintergrund: der Brunnen im Nebel
    this.view.buildArea({
      ...getArea('dorfeingang'), id: 'menu_hintergrund', theme: 'dorf', punkte: [],
      kameraRadius: 15,
    });
    this.view.camera.beta = 1.02;
    this.view.focusOn(14, 6, true);
    this.menuDreh = this.view.scene.registerBeforeRender(() => {
      this.view.camera.alpha += 0.0009;
    });
    mainMenu(this);
  }

  clearUi() {
    this.overlay.innerHTML = '';
    this.hudRoot.innerHTML = '';
    this.modal.innerHTML = '';
    this.clearMarkers();
  }

  async neuesSpiel() {
    if (this.menuDreh) { this.view.scene.unregisterBeforeRender(this.menuDreh); this.menuDreh = null; }
    this.clearUi();
    const party = await characterCreator(this);
    if (!party) { this.showMenu(); return; }
    const state = newGameState();
    state.party = party;
    state.hooks = assignHooks(party);
    state.staff.bearer = party[0].id;
    this.state = state;
    addQuest(state, 'klarwasser', 'Der Preis von Klarwasser',
      'Fibbels Brief spricht von einem Auftrag in Klarwasser. Zwei Tagesmärsche durch den Kiefernwald.');
    await this.runEvent('spiel_start');
  }

  async ladeSpiel(name) {
    const s = loadGame(name);
    if (!s) { this.toast('Spielstand nicht lesbar.'); return; }
    if (this.menuDreh) { this.view.scene.unregisterBeforeRender(this.menuDreh); this.menuDreh = null; }
    this.state = s;
    this.clearUi();
    await this.goToArea(s.area || 'dorfeingang', { stumm: true });
    this.toast('Spielstand geladen.');
  }

  speichern(name) {
    if (!this.state) return;
    this.state.area = this.state.area || null;
    const r = saveGame(this.state, name);
    this.toast(r.ok ? `Gespeichert: ${r.name}` : `Fehler: ${r.error}`);
    return r;
  }

  /* ─────────────────────── Erkundung ─────────────────────── */

  async goToArea(areaId, opts = {}) {
    const area = getArea(areaId);
    if (!area) { console.warn('Unbekannter Ort:', areaId); return; }
    this.modus = 'erkundung';
    this.state.area = areaId;
    this.clearMarkers();
    this.modal.innerHTML = '';
    this.view.buildArea(area);
    this.aktuellerOrt = area;

    // Gruppe aufstellen
    const spawns = area.spawns.party;
    this.state.party.forEach((c, i) => {
      if (c.dead) return;
      const p = spawns[i % spawns.length];
      this.view.addActor({
        uid: c.id, side: 'held', x: p.x + (i > spawns.length - 1 ? 1 : 0), y: p.y,
        raceId: c.raceId, classId: c.classId,
        palette: PORTRAIT_PALETTES[c.portrait?.palette ?? 0], kind: 'humanoid',
      });
    });
    // Ghortan als Begleiter
    if (this.state.flags.ghortan_dabei && !this.state.flags.ghortan_verrat) {
      const p = spawns[0];
      this.view.addActor({
        uid: 'ghortan', side: 'verbuendet', x: Math.max(1, p.x - 1), y: p.y + 1,
        raceId: 'halbork', classId: 'hexenmeister', kind: 'humanoid',
        palette: { skin: '#7a8a6a', hair: '#2a1a14', cloth: '#4a3a30', accent: '#8a4a30' },
      });
    }
    this.view.setSelected(this.state.party[0]?.id);

    this.hud.render();
    this.buildMarkers();

    if (!opts.stumm) {
      const enter = CONTENT.areaEnter?.[areaId];
      if (enter) await enter(this);
    }
    this.buildMarkers();
  }

  buildMarkers() {
    this.clearMarkers();
    if (this.modus !== 'erkundung' || !this.aktuellerOrt) return;
    for (const p of this.aktuellerOrt.punkte || []) {
      if (p.nur && !this.state.flags[p.nur]) continue;
      if (p.nach && !this.state.flags[p.nach]) continue;
      if (p.weg && this.state.flags[p.weg]) continue;
      const el = document.createElement('div');
      el.className = 'welt-marke';
      const erledigt = p.event && this.state.flags[`erledigt_${p.event}`];
      if (!erledigt && (p.typ === 'gespraech' || p.typ === 'untersuchen')) el.classList.add('neu');
      const sym = { gespraech: '❝', untersuchen: '✷', ausgang: '➜', kampf: '⚔' }[p.typ] || '•';
      el.textContent = `${sym} ${personalize(p.label, this.state)}`;
      el.onclick = (e) => { e.stopPropagation(); this.activatePoint(p); };
      this.overlay.appendChild(el);
      this.markers.push({ el, punkt: p });
    }
  }

  clearMarkers() {
    for (const m of this.markers) m.el.remove();
    this.markers = [];
    for (const n of this.nameTags || []) n.remove();
    this.nameTags = [];
  }

  updateMarkers() {
    if (this.modus === 'erkundung') {
      const sichtbar = [];
      for (const m of this.markers) {
        const pos = this.view.tileScreenPos(m.punkt.x, m.punkt.y, 1.7);
        if (!pos || pos.hinten) { m.el.style.display = 'none'; continue; }
        sichtbar.push({ m, x: Math.round(pos.x), y: Math.round(pos.y) });
      }
      // Entzerren: Marken, die übereinanderliegen, nach oben schieben.
      sichtbar.sort((a, b) => a.y - b.y);
      for (let i = 1; i < sichtbar.length; i++) {
        for (let j = 0; j < i; j++) {
          const dx = Math.abs(sichtbar[i].x - sichtbar[j].x);
          const dy = sichtbar[i].y - sichtbar[j].y;
          if (dx < 190 && dy < 26) sichtbar[i].y = sichtbar[j].y + 26;
        }
      }
      for (const s of sichtbar) {
        s.m.el.style.display = '';
        // Marken am Kartenrand ganz ins Bild holen — halb abgeschnittene
        // Beschriftungen sind nicht lesbar und nur schwer zu treffen.
        if (!s.m.halbeBreite) s.m.halbeBreite = s.m.el.offsetWidth / 2 || 60;
        const rand = 10;
        s.x = Math.round(Math.max(s.m.halbeBreite + rand,
          Math.min(window.innerWidth - s.m.halbeBreite - rand, s.x)));
        s.y = Math.round(Math.max(34, Math.min(window.innerHeight - 24, s.y)));
        // Ganzzahlig runden: sonst zittern die Marken bei jeder Kamerabewegung.
        if (s.m.lx === s.x && s.m.ly === s.y) continue;
        s.m.lx = s.x; s.m.ly = s.y;
        s.m.el.style.left = `${s.x}px`;
        s.m.el.style.top = `${s.y}px`;
      }
    }
    if (this.modus === 'kampf') this.combatView.updateTags();
  }

  async activatePoint(p) {
    if (this.busy) return;
    this.busy = true;
    try {
      // Anführerin hinlaufen lassen
      await this.walkPartyTo(p.x, p.y);
      if (p.typ === 'ausgang') {
        if (p.event) await this.runEvent(p.event);
        if (this.state.flags[`blockiere_${p.id}`]) return;
        await this.goToArea(p.ziel);
        return;
      }
      if (p.dialog) await this.startDialogue(p.dialog);
      else if (p.event) await this.runEvent(p.event);
      this.hud.render();
      this.buildMarkers();
    } finally {
      this.busy = false;
    }
  }

  handleTileClick(x, y) {
    if (this.modus === 'kampf') { this.combatView.onTileClick(x, y); return; }
    if (this.modus !== 'erkundung' || this.busy) return;
    this.walkPartyTo(x, y);
  }

  handleActorClick(uid) {
    if (this.modus === 'kampf') { this.combatView.onActorClick(uid); return; }
    const c = this.state?.party.find((p) => p.id === uid);
    if (c) { this.view.setSelected(uid); this.hud.render(); }
    if (uid === 'ghortan' && this.state.flags.ghortan_dabei) this.startDialogue('ghortan_gespraech');
  }

  /** Gruppe zu einem Feld laufen lassen (Anführerin zuerst, Rest folgt). */
  walkPartyTo(x, y) {
    return new Promise((resolve) => {
      const area = this.aktuellerOrt;
      if (!area) { resolve(); return; }
      const leben = this.state.party.filter((c) => !c.dead);
      if (!leben.length) { resolve(); return; }
      const grid = { w: area.w, h: area.h, tiles: area.tiles, webs: new Set() };
      const ziele = spreadTargets(grid, x, y, leben.length);
      let offen = 0;
      leben.forEach((c, i) => {
        const a = this.view.actors.get(c.id);
        if (!a) return;
        const ziel = ziele[i] || ziele[0];
        const pfad = findPath(grid, { x: a.x, y: a.y }, ziel);
        if (!pfad || pfad.length < 2) return;
        offen++;
        this.view.walk(c.id, pfad, () => { offen--; if (offen <= 0) resolve(); });
      });
      // Ghortan trottet hinterher
      const g = this.view.actors.get('ghortan');
      if (g) {
        const ziel = ziele[leben.length] || { x: Math.max(1, x - 1), y: Math.max(1, y - 1) };
        const pfad = findPath(grid, { x: g.x, y: g.y }, ziel);
        if (pfad && pfad.length > 1) this.view.walk('ghortan', pfad, () => {});
      }
      this.view.focusOn(x, y);
      if (offen === 0) setTimeout(resolve, 60);
    });
  }

  /* ─────────────────────── Dialog ─────────────────────── */

  startDialogue(dialogId) {
    const dlg = CONTENT.dialogues[dialogId];
    if (!dlg) { console.warn('Unbekannter Dialog:', dialogId); return Promise.resolve(); }
    this.modus = 'dialog';
    const runner = new DialogueRunner(dlg, this.state, {
      onQuest: (q) => this.quest(q),
      onEffect: (e) => this.effect(e),
      game: this,
    });
    return this.dialogueView.run(runner).then(async () => {
      this.modus = this.combat ? 'kampf' : 'erkundung';
      if (dlg.nach) await this.runEvent(dlg.nach);
      this.hud.render();
      this.buildMarkers();
    });
  }

  /* ─────────────────────── Ereignisse ─────────────────────── */

  async runEvent(id) {
    const fn = CONTENT.events[id];
    if (!fn) { console.warn('Unbekanntes Ereignis:', id); return; }
    const r = await fn(this);
    setFlag(this.state, `erledigt_${id}`);
    this.hud.render();
    this.buildMarkers();
    return r;
  }

  /* ─────────────────────── Kampf ─────────────────────── */

  async startCombat(setupId) {
    const build = CONTENT.combats[setupId];
    if (!build) { console.warn('Unbekannter Kampf:', setupId); return 'sieg'; }
    const setup = build(this);
    this.modus = 'kampf';
    this.clearMarkers();
    this.dialogueView.ende();
    const basis = setup.area ? (getArea(setup.area) || this.aktuellerOrt) : this.aktuellerOrt;
    if (setup.area) this.aktuellerOrt = basis;
    const area = this.aktuellerOrt;
    const map = setup.map || { w: area.w, h: area.h, tiles: area.tiles.slice(), webs: new Set() };

    // Kampfkarte und sichtbare Kulisse müssen deckungsgleich sein — sonst
    // stehen die Gegner neben dem Raum statt darin.
    const eigeneKarte = map.w !== basis.w || map.h !== basis.h || !!setup.map;
    this.view.buildArea({
      ...basis,
      id: `${basis.id}_kampf`,
      w: map.w, h: map.h, tiles: map.tiles,
      props: (eigeneKarte ? kulisseFuerKarte(basis, map) : basis.props)
        .concat(setup.kulisse || []),
      punkte: [],
      spawns: { party: setup.playerStart || basis.spawns.party },
    });
    let result = await this.combatView.run({ ...setup, map });
    this.combat = null;
    this.modus = 'erkundung';

    // Niederlage abfangen: Der Kampf ist verloren, die Kampagne nicht.
    if (result === 'niederlage' && !setup.niederlageErlaubt) {
      const wahl = await this.ask({
        kapitel: 'Gefallen', titel: 'Das war zu viel',
        text: 'Ihr liegt. Alle.\n\nDas ist in dieser Kampagne selten endgültig — es ist meistens nur der Hinweis, dass ein anderer Weg gemeint war.',
        optionen: [
          { text: 'Den Kampf noch einmal aufnehmen.', wert: 'nochmal' },
          { text: 'Den letzten Spielstand laden.', wert: 'laden' },
          { text: 'Es dabei belassen und weiterspielen.', wert: 'weiter', abschluss: true },
        ],
      });
      if (wahl === 'nochmal') {
        for (const c of this.state.party) {
          c.dead = false; c.downed = false; c.hp = c.maxHp;
          c.deathSaves = { success: 0, fail: 0 };
          c.conditions = (c.conditions || []).filter((x) => x.permanent);
        }
        return this.startCombat(setupId);
      }
      if (wahl === 'laden') {
        const letzte = listSaves()[0];
        if (letzte) { await this.ladeSpiel(letzte.name); return 'geladen'; }
        this.toast('Kein Spielstand vorhanden.');
      }
      for (const c of this.state.party) {
        if (c.dead) { c.dead = false; c.hp = 1; c.downed = false; }
      }
    }

    // Ort neu aufbauen, damit Marker und Kulisse wieder stimmen
    await this.goToArea(this.state.area, { stumm: true });
    return result;
  }

  /* ─────────────────────── Hilfen für Inhalte ─────────────────────── */

  narration(opts) { return narration(this, opts); }
  toast(text) { return toast(this, text); }
  ask(opts) { return choiceModal(this, opts); }
  panel(name) { return panel(this, name); }

  flag(k) { return flag(this.state, k); }
  setFlag(k, v = true) { setFlag(this.state, k, v); this.hud.render(); }
  tick(reason, n = 1) {
    const r = tickClock(this.state, reason, n);
    this.hud.render();
    if (r.value <= 6) this.toast(`Uhr der Stillen Tiefe: ${r.value}/6 — ${r.reason}`);
    return r;
  }
  tickAsh(reason, n = 1) { const r = tickAshClock(this.state, reason, n); this.hud.render(); return r; }
  quest(q) {
    if (q.neu) addQuest(this.state, q.id, q.titel, q.text);
    else if (q.fertig) completeQuest(this.state, q.id, q.text);
    else if (q.gescheitert) failQuest(this.state, q.id, q.text);
    else addQuestEntry(this.state, q.id, q.text);
    this.hud.render();
  }
  item(i) { addItem(this.state, i); this.toast(`Erhalten: ${i.name}`); }
  hat(id) { return hasItem(this.state, id); }
  staff(stage) {
    const info = awakenStaff(this.state, stage);
    if (info) this.toast(`Der Stab der Bindung erwacht — ${info.name}`);
    this.hud.render();
    return info;
  }
  gold(n) { this.state.party_gold += n; this.hud.render(); }

  async levelUp(stufe) {
    const infos = [];
    for (const c of this.state.party) {
      const r = charLevelUp(c, stufe);
      if (r) infos.push({ c, r });
    }
    if (!infos.length) return;
    this.state.session = Math.max(this.state.session, 1);
    await levelUpCard(this, stufe, infos);
    this.hud.render();
  }

  async rast(lang = true) {
    if (lang) {
      for (const c of this.state.party) longRest(c);
      this.state.stats.rests++;
      if (this.state.act === 1 && /dorf|markt|hut|kapelle|muehle/.test(this.state.area || '')) {
        this.tick('lange_rast');
      }
      await this.narration({
        kapitel: 'Lange Rast', titel: 'Der Morgen danach',
        text: 'Ihr schlaft, und ihr träumt dasselbe wie alle in dieser Stadt:\n\n„Du stehst in einer Reihe. Kinder rechts und links, du kannst ihre Gesichter nicht sehen. Vor euch eine Frau mit einem Buch. Sie geht die Reihe ab und sagt jedem Kind seinen Namen — und jedes nickt und geht. Dann steht sie vor dir. Sie sucht im Buch. Sie sieht dich an. Sie sagt: ‚Ich finde dich nicht.‘ Und sie klingt so unendlich erleichtert."',
      });
    } else {
      for (const c of this.state.party) shortRest(c);
    }
    this.hud.render();
  }

  effect(e) {
    if (!e) return;
    if (typeof e === 'function') return e(this);
    if (e.typ === 'gold') this.gold(e.wert);
    if (e.typ === 'item') this.item(e.item);
    if (e.typ === 'uhr') this.tick(e.grund || 'kein_fortschritt');
    if (e.typ === 'stab') this.staff(e.stufe);
    if (e.typ === 'toast') this.toast(e.text);
  }

  async ending(id) {
    const e = CONTENT.endings[id];
    if (!e) return;
    this.state.endings[id] = true;
    await endingCard(this, e);
  }

  handleKey(e) {
    if (this.modus === 'menu') return;
    if (e.key === 'Escape') {
      if (this.modal.querySelector('.panel-schicht')) { this.modal.innerHTML = ''; return; }
      if (this.modus === 'erkundung') this.panel('system');
      return;
    }
    if (this.modus !== 'erkundung' && this.modus !== 'kampf') return;
    const k = e.key.toLowerCase();
    if (k === 'j') this.panel('journal');
    if (k === 'c') this.panel('bogen');
    if (k === 'i') this.panel('beutel');
    if (k === 'h') this.panel('hilfe');
    if (k === 'm') this.panel('karte');
    if (this.modus === 'kampf') this.combatView.handleKey(e);
  }
}

/* ─────────────────────── Wegfindung für die Erkundung ─────────────────────── */

export function findPath(grid, von, nach) {
  const key = (p) => `${p.x},${p.y}`;
  const passierbar = (x, y) => {
    if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return false;
    const t = grid.tiles[y * grid.w + x];
    return t !== 1 && t !== 4 && t !== 6;
  };
  if (!passierbar(nach.x, nach.y)) {
    // nächstes freies Feld suchen
    let best = null;
    for (let r = 1; r <= 4 && !best; r++) {
      for (let dy = -r; dy <= r && !best; dy++) {
        for (let dx = -r; dx <= r && !best; dx++) {
          if (passierbar(nach.x + dx, nach.y + dy)) best = { x: nach.x + dx, y: nach.y + dy };
        }
      }
    }
    if (!best) return null;
    nach = best;
  }
  const offen = [{ ...von, f: 0, g: 0 }];
  const kam = new Map();
  const kosten = new Map([[key(von), 0]]);
  let guard = 0;
  while (offen.length && guard++ < 8000) {
    offen.sort((a, b) => a.f - b.f);
    const cur = offen.shift();
    if (cur.x === nach.x && cur.y === nach.y) {
      const pfad = [{ x: cur.x, y: cur.y }];
      let k = key(cur);
      while (kam.has(k)) {
        const p = kam.get(k);
        pfad.unshift(p);
        k = key(p);
      }
      return pfad;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cur.x + dx; const ny = cur.y + dy;
      if (!passierbar(nx, ny)) continue;
      const t = grid.tiles[ny * grid.w + nx];
      const g = cur.g + (t === 2 || t === 3 ? 1.8 : 1);
      const nk = `${nx},${ny}`;
      if (g < (kosten.get(nk) ?? Infinity)) {
        kosten.set(nk, g);
        kam.set(nk, { x: cur.x, y: cur.y });
        offen.push({ x: nx, y: ny, g, f: g + Math.hypot(nach.x - nx, nach.y - ny) });
      }
    }
  }
  return null;
}

function spreadTargets(grid, x, y, n) {
  const out = [];
  const passierbar = (px, py) => {
    if (px < 0 || py < 0 || px >= grid.w || py >= grid.h) return false;
    const t = grid.tiles[py * grid.w + px];
    return t !== 1 && t !== 4 && t !== 6;
  };
  const kandidaten = [{ x, y }];
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        kandidaten.push({ x: x + dx, y: y + dy });
      }
    }
  }
  for (const k of kandidaten) {
    if (out.length >= n + 1) break;
    if (passierbar(k.x, k.y) && !out.some((o) => o.x === k.x && o.y === k.y)) out.push(k);
  }
  return out;
}

/* ─────────────────────── Start ─────────────────────── */

window.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('boot-status');
  if (!window.BABYLON) {
    status.textContent = 'Babylon.js konnte nicht geladen werden.';
    return;
  }
  try {
    const game = new Game();
    window.spiel = game;
    status.textContent = 'Der Brunnen ist gefüllt.';
    setTimeout(() => {
      document.getElementById('boot').classList.add('weg');
      game.showMenu();
    }, 420);
  } catch (e) {
    console.error(e);
    status.textContent = `Fehler beim Start: ${e.message}`;
  }
});
