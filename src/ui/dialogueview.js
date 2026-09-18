// Die Gesprächsansicht: Sprecher, Vorlesetext, Antworten — und der Würfel.

import { drawPortrait } from './figures.js';
import { PORTRAIT_PALETTES } from '../data/chargen.js';
import { dcLabel } from '../engine/rules.js';
import { esc } from './screens.js';
import { formatText } from './panels.js';

/** Gesichter der wichtigen Nichtspielerfiguren. */
export const NSC_BILDER = {
  hesse: { raceId: 'mensch', classId: 'kleriker', rolle: 'Priesterin, 71',
    palette: { skin: '#cbb49a', hair: '#c8c4bc', cloth: '#5a5a62', accent: '#a8a49c' } },
  nella: { raceId: 'halbling', classId: 'schurke', rolle: 'Elf Jahre',
    palette: { skin: '#d8b892', hair: '#6a4a28', cloth: '#7a8a5a', accent: '#c8a14a' } },
  tobrek: { raceId: 'mensch', classId: 'kaempfer', rolle: 'Bürgermeister, Müller',
    palette: { skin: '#c0a078', hair: '#4a3a2a', cloth: '#6a5a44', accent: '#8a7a5a' } },
  kaspar: { raceId: 'gnom', classId: 'druide', rolle: 'Brunnengräber a. D.',
    palette: { skin: '#b09880', hair: '#d0ccc4', cloth: '#4a4238', accent: '#7a6a50' } },
  grust: { raceId: 'halbork', classId: 'kaempfer', rolle: 'Wirt',
    palette: { skin: '#8a9a78', hair: '#2a2018', cloth: '#5a4a3a', accent: '#7a6a4a' } },
  sarine: { raceId: 'mensch', classId: 'magier', rolle: 'Archivarin, Orden der Verzeichneten Wahrheit',
    palette: { skin: '#d0bca4', hair: '#3a2e28', cloth: '#3a4450', accent: '#8a8478' } },
  ghortan: { raceId: 'halbork', classId: 'hexenmeister', rolle: 'Tanarukk',
    palette: { skin: '#7a8a6a', hair: '#2a1a14', cloth: '#4a3a30', accent: '#8a4a30' } },
  ysmereth: { raceId: 'hochelf', classId: 'magier', rolle: 'Herr der Stillen Tiefe',
    palette: { skin: '#c8d8dc', hair: '#8ab0c0', cloth: '#2a4a58', accent: '#a8d8e8' } },
  perrick: { raceId: 'mensch', classId: 'schurke', rolle: 'Wanderhändler',
    palette: { skin: '#c8a880', hair: '#5a4a38', cloth: '#6a5a48', accent: '#a89060' } },
  sarrek: { raceId: 'drachenblut', classId: 'kaempfer', rolle: 'Brandstifter',
    palette: { skin: '#b07848', hair: '#4a2a18', cloth: '#6a4a30', accent: '#c88040' } },
  ysera: { raceId: 'drachenblut', classId: 'waldlaeufer', rolle: 'Überläuferin',
    palette: { skin: '#a88858', hair: '#3a2a18', cloth: '#5a4a38', accent: '#b09050' } },
  klauth: { raceId: 'drachenblut', classId: 'barbar', rolle: 'Roter Wyrm des Silberkamms',
    palette: { skin: '#b03818', hair: '#5a1a08', cloth: '#7a2810', accent: '#e06030' } },
  rabenkoenigin: { raceId: 'hochelf', classId: 'hexenmeister', rolle: 'Herrin der Schattenebene',
    palette: { skin: '#b0aab8', hair: '#14141c', cloth: '#1a1a24', accent: '#5a5a7a' } },
  kelemvor: { raceId: 'mensch', classId: 'paladin', rolle: 'Richter der Fugenebene',
    palette: { skin: '#a8a8b0', hair: '#c0c0c8', cloth: '#4a4c54', accent: '#c8c8d0' } },
  lolth: { raceId: 'hochelf', classId: 'hexenmeister', rolle: 'Was übrig ist',
    palette: { skin: '#6a5a6a', hair: '#1a1018', cloth: '#3a2038', accent: '#7a3a5a' } },
  vergessener: { raceId: 'mensch', classId: 'kaempfer', rolle: 'Jemand',
    palette: { skin: '#8a8a8e', hair: '#6a6a6e', cloth: '#5a5a5e', accent: '#7a7a7e' } },
  erzaehler: null,
};

export class DialogueView {
  constructor(game) {
    this.game = game;
  }

  run(runner) {
    return new Promise((resolve) => {
      this.runner = runner;
      this.resolve = resolve;
      this.schicht = document.createElement('div');
      this.schicht.className = 'dialog-schicht';
      this.game.overlay.appendChild(this.schicht);
      this.zeichne();
    });
  }

  ende() {
    this.schicht?.remove();
    this.schicht = null;
    this.resolve?.();
    this.resolve = null;
  }

  zeichne() {
    const r = this.runner;
    if (!r || r.finished || !r.node) { this.ende(); return; }
    const state = this.game.state;
    const sprecherName = r.currentSpeaker();
    const bildId = r.currentPortrait();
    const bild = NSC_BILDER[bildId];
    const erzaehlung = r.currentNarration();
    const text = r.currentText();
    const wahl = r.choices();

    this.schicht.innerHTML = `
      <div class="dialog-box">
        ${sprecherName ? `<div class="sprecher">
          ${bild ? '<canvas width="128" height="128"></canvas>' : ''}
          <div><div class="sprecher-name">${esc(sprecherName)}</div>
            ${bild?.rolle ? `<div class="sprecher-rolle">${esc(bild.rolle)}</div>` : ''}</div>
        </div>` : ''}
        ${erzaehlung ? `<div class="erzaehlung">${formatText(erzaehlung)}</div>` : ''}
        ${text ? `<div class="rede">${formatText(text)}</div>` : ''}
        <div class="antworten"></div>
        ${wahl.length === 0 ? '<div class="weiter-hinweis">Weiter · Leertaste oder Klick</div>' : ''}
      </div>`;

    const cv = this.schicht.querySelector('canvas');
    if (cv && bild) drawPortrait(cv, bild);

    const liste = this.schicht.querySelector('.antworten');
    wahl.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = `antwort ${c.isEnd ? 'abschluss' : ''}`;
      let probe = '';
      if (c.check) {
        const schwer = c.check.chance < 45 ? 'schwer' : c.check.chance > 74 ? 'leicht' : '';
        probe = `<span class="probe ${schwer}" title="${esc(c.check.actorName)} würfelt W20 ${c.check.mod >= 0 ? '+' : ''}${c.check.mod}">
          ${esc(c.check.label)} SG ${c.check.dc}
          ${c.check.advantage ? ' ▲' : ''}${c.check.disadvantage ? ' ▼' : ''}
          · ${c.check.chance}%</span>`;
      }
      el.innerHTML = `<span class="nummer">${i + 1}</span>
        <span>${c.tag ? `<span class="haken-marke">${esc(c.tag)}</span> ` : ''}${esc(c.text)}</span>${probe}`;
      el.onclick = () => this.waehle(c.index);
      liste.appendChild(el);
    });

    this.schicht.onclick = (e) => {
      if (wahl.length === 0 && !e.target.closest('.antwort')) this.weiter();
    };
    this.keyHandler = (e) => {
      if (!this.schicht) return;
      if (wahl.length === 0 && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.weiter(); }
      const n = Number(e.key);
      if (n >= 1 && n <= wahl.length) this.waehle(wahl[n - 1].index);
    };
    window.removeEventListener('keydown', this._kh || (() => {}));
    this._kh = this.keyHandler;
    window.addEventListener('keydown', this._kh);
  }

  weiter() {
    const res = this.runner.advance();
    if (res.type === 'ende') { this.abschliessen(); return; }
    this.zeichne();
  }

  async waehle(index) {
    const res = this.runner.choose(index);
    if (res.type === 'probe') {
      await this.zeigeWurf(res.roll, res.actor);
      const nach = this.runner.resolveCheck();
      if (nach.type === 'ende') { this.abschliessen(); return; }
      this.zeichne();
      return;
    }
    if (res.type === 'ende') { this.abschliessen(); return; }
    this.zeichne();
  }

  abschliessen() {
    window.removeEventListener('keydown', this._kh);
    this._kh = null;
    this.ende();
  }

  /** Die Würfelszene: W20, Modifikator, Ergebnis. */
  zeigeWurf(roll, actor) {
    return new Promise((resolve) => {
      const schicht = document.createElement('div');
      schicht.className = 'wurf-schicht';
      const erfolg = roll.success;
      const krit = roll.crit || roll.fumble;
      schicht.innerHTML = `
        <div class="wurf-box tafel">
          <div class="wurf-titel">${esc(roll.label)}</div>
          <div class="wurf-wer">${esc(actor.name)} · Schwierigkeitsgrad ${roll.dc} (${dcLabel(roll.dc)})
            ${roll.mode !== 'normal' ? ` · ${roll.mode === 'vorteil' ? 'mit Vorteil' : 'mit Nachteil'}` : ''}</div>
          <div class="wuerfel rollt">
            <svg viewBox="0 0 100 100">
              <polygon points="50,4 94,78 6,78" fill="none" stroke="#c8a14a" stroke-width="2.5"/>
              <polygon points="50,20 80,72 20,72" fill="rgba(200,161,74,.1)" stroke="rgba(200,161,74,.45)" stroke-width="1.2"/>
            </svg>
            <span class="zahl">?</span>
          </div>
          <div class="wurf-rechnung"></div>
          <div class="wurf-ergebnis"></div>
          <div class="wurf-zusatz"></div>
        </div>`;
      this.game.modal.appendChild(schicht);

      const zahl = schicht.querySelector('.zahl');
      const rechnung = schicht.querySelector('.wurf-rechnung');
      const ergebnis = schicht.querySelector('.wurf-ergebnis');
      const zusatz = schicht.querySelector('.wurf-zusatz');

      let t = 0;
      const dreh = setInterval(() => {
        zahl.textContent = String(1 + Math.floor(Math.random() * 20));
        t++;
      }, 55);

      setTimeout(() => {
        clearInterval(dreh);
        zahl.textContent = String(roll.natural);
        if (roll.mode !== 'normal') {
          zusatz.textContent = `Gewürfelt: ${roll.both.join(' und ')} — ${roll.mode === 'vorteil' ? 'der höhere' : 'der niedrigere'} zählt.`;
        }
        rechnung.innerHTML = `${roll.natural} ${roll.bonus >= 0 ? '+' : '−'} ${Math.abs(roll.bonus)} = <b>${roll.total}</b> gegen ${roll.dc}`;
        ergebnis.className = `wurf-ergebnis ${krit && erfolg ? 'krit' : erfolg ? 'erfolg' : 'fehl'}`;
        ergebnis.textContent = roll.crit ? 'KRITISCHER ERFOLG'
          : roll.fumble ? 'PATZER'
            : erfolg ? 'ERFOLG' : 'MISSERFOLG';
        setTimeout(() => { schicht.remove(); resolve(); }, 1150);
      }, 780);

      schicht.onclick = () => {
        clearInterval(dreh);
        schicht.remove();
        resolve();
      };
    });
  }
}
