// Die stets sichtbare Oberfläche: Ort, Uhren, Gruppe, Knöpfe.

import { PORTRAIT_PALETTES } from '../data/chargen.js';
import { drawPortrait } from './figures.js';
import { CONDITIONS } from '../engine/rules.js';
import { esc } from './screens.js';

export class Hud {
  constructor(game) {
    this.game = game;
  }

  render() {
    const g = this.game;
    if (!g.state || g.modus === 'menu') return;
    const root = g.hudRoot;
    root.innerHTML = '';

    root.appendChild(this.oben());
    root.appendChild(this.gruppe());
  }

  oben() {
    const g = this.game;
    const s = g.state;
    const el = document.createElement('div');
    el.className = 'hud-oben';
    const ort = g.aktuellerOrt;
    const uhr = s.counters.uhr_stille_tiefe;
    const asche = s.counters.ascheuhr;
    const zeigeAsche = s.act >= 3;

    el.innerHTML = `
      <div class="ort-anzeige">
        ${esc(ort?.name || '—')}
        <small>Akt ${romanNum(s.act)} · ${esc(ort?.untertitel || '')}</small>
      </div>
      <div class="uhr-tafel">
        <div class="uhr">
          <span class="uhr-titel">${zeigeAsche ? 'Ascheuhr' : 'Uhr der Stillen Tiefe'}</span>
          <span class="uhr-kaesten">
            ${Array.from({ length: zeigeAsche ? 8 : 6 }, (_, i) =>
              `<span class="uhr-kasten ${i < (zeigeAsche ? asche : uhr) ? 'voll' : ''}"></span>`).join('')}
          </span>
        </div>
        <div class="hud-knoepfe">
          <div class="hud-knopf" data-p="journal" title="Journal (J)">✦</div>
          <div class="hud-knopf" data-p="bogen" title="Charakterbogen (C)">☰</div>
          <div class="hud-knopf" data-p="beutel" title="Beutel (I)">⬦</div>
          <div class="hud-knopf" data-p="hilfe" title="Hilfe (H)">?</div>
          <div class="hud-knopf" data-p="system" title="Menü (Esc)">≡</div>
        </div>
      </div>`;
    el.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => g.panel(b.dataset.p);
    });
    return el;
  }

  gruppe() {
    const g = this.game;
    const el = document.createElement('div');
    el.className = 'gruppe-hud';
    for (const c of g.state.party) {
      const karte = document.createElement('div');
      const aktiv = g.modus === 'kampf'
        ? g.combat?.current?.uid === c.id
        : g.view.actors.get(c.id)?.ausgewaehlt;
      karte.className = `held-karte ${aktiv ? 'aktiv' : ''} ${c.dead ? 'gefallen' : ''}`;
      const tpAnteil = Math.max(0, c.hp / c.maxHp);
      const tpKlasse = tpAnteil <= 0.25 ? 'kritisch' : tpAnteil <= 0.5 ? 'warn' : '';
      const slots = (c.slots || []).reduce((a, b) => a + b, 0);
      const slotsMax = (c.slotsMax || []).reduce((a, b) => a + b, 0);
      karte.innerHTML = `
        <canvas width="92" height="92"></canvas>
        <div class="held-info">
          <div class="held-name">${esc(c.name)}${c.dead ? ' †' : ''}</div>
          <div class="balken tp ${tpKlasse}"><i style="width:${tpAnteil * 100}%"></i></div>
          <div class="held-zahlen"><span>${c.hp}/${c.maxHp} TP</span><span>St. ${c.level}</span></div>
          ${slotsMax ? `<div class="balken zauber"><i style="width:${(slots / slotsMax) * 100}%"></i></div>` : ''}
          <div class="zustaende">
            ${(c.conditions || []).slice(0, 4).map((k) => {
              const def = CONDITIONS[k.id];
              const gut = ['segen', 'inspiriert', 'gehastet'].includes(k.id);
              return `<span class="zustand ${gut ? 'gut' : ''}" title="${esc(def?.desc || '')}">${esc(def?.name || k.id)}</span>`;
            }).join('')}
            ${c.forgetting > 0 ? `<span class="zustand" title="Vergessensgrad ${c.forgetting}">Vergessen ${c.forgetting}</span>` : ''}
          </div>
        </div>`;
      const cv = karte.querySelector('canvas');
      drawPortrait(cv, { raceId: c.raceId, classId: c.classId, palette: PORTRAIT_PALETTES[c.portrait?.palette ?? 0] });
      karte.onclick = () => {
        if (g.modus === 'kampf') {
          const a = g.view.actors.get(c.id);
          if (a) g.view.focusOn(a.x, a.y);
        } else {
          g.view.setSelected(c.id);
          g.panel('bogen', c.id);
        }
      };
      el.appendChild(karte);
    }

    if (g.state.flags.ghortan_dabei && !g.state.flags.ghortan_verrat) {
      const k = document.createElement('div');
      k.className = 'held-karte';
      k.style.opacity = '.92';
      k.innerHTML = `
        <canvas width="92" height="92"></canvas>
        <div class="held-info">
          <div class="held-name" style="color:var(--messing-hell)">Ghortan</div>
          <div class="held-zahlen"><span>Begleiter</span><span>Tanarukk</span></div>
        </div>`;
      drawPortrait(k.querySelector('canvas'), {
        raceId: 'halbork', classId: 'hexenmeister',
        palette: { skin: '#7a8a6a', hair: '#2a1a14', cloth: '#4a3a30', accent: '#8a4a30' },
      });
      k.onclick = () => g.startDialogue('ghortan_gespraech');
      el.appendChild(k);
    }
    return el;
  }
}

function romanNum(n) {
  return ['—', 'I', 'II', 'III', 'IV'][n] || String(n);
}
