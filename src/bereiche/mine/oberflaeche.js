// Bereich „mine" – Fenster und Anzeigen: Förderkorb (alle fünf Ebenen), Geoden knacken bei Bruno
// (mit Animation), Alriks Monsterziele, Ringplätze und Stiefel im Rucksack (rucksackTeil/-Aktion),
// die Anzeige des Spezialzugs im HUD und die Statistik.

import { ITEMS } from '../../daten.js';
import { MONSTER } from '../../mine.js';
import { S } from '../../spiel.js';
import {
  fensterArt, fensterRahmen, fensterSchliessen, fensterNeu, statistik, rucksackTeil, rucksackAktion, hudElement, stil,
  el, bild, itemIcon, goldAnzeige, portraet, meldung, ton, zahl,
} from '../../ui.js';
import { itemDatenUrl } from '../../sprites.js';
import { MINE_TIEFE, aufzugFahren, SCHICHTEN, schichtVon } from './ebenen.js';
import { GEODEN, GEODE_PREIS, geodeOeffnen } from './geoden.js';
import { ZIELE, zielStand, zielAbholbar, zielAbholen } from './gilde.js';
import { ringAnlegen, ringAblegen, stiefelAnziehen, stiefelAusziehen, RING_PLAETZE } from './ringe.js';
import { spezialInfo, kampfOrt } from './kampf.js';

stil('mine', `
.mine-korb { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 6px; margin-top: 8px; }
.mine-korb .knopf { min-height: 44px; padding: 4px; font-variant-numeric: tabular-nums; }
.mine-korb .knopf.s0 { border-color: #a3845f; } .mine-korb .knopf.s1 { border-color: #8bb8d8; } .mine-korb .knopf.s2 { border-color: #e8703a; }
.mine-korb-schicht { grid-column: 1 / -1; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--messing-hell); margin-top: 6px; }
.mine-geoden { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; align-items: start; }
@media (max-width: 560px) { .mine-geoden { grid-template-columns: 1fr; } }
.mine-buehne { position: relative; height: 150px; display: grid; place-items: center; background: radial-gradient(circle at 50% 60%, #3a4a50, var(--mulde) 70%); border: 2px solid var(--holz-dunkel); border-radius: 6px; overflow: hidden; }
.mine-buehne img { width: 64px; height: 64px; image-rendering: pixelated; }
.mine-buehne .geode { position: absolute; animation: mine-wackeln .55s ease-in forwards; }
.mine-buehne .fund { position: absolute; opacity: 0; animation: mine-auf .45s .55s ease-out forwards; }
.mine-buehne .funke { position: absolute; width: 6px; height: 6px; background: #fff3b0; opacity: 0; animation: mine-funke .5s .5s ease-out forwards; }
.mine-buehne .name { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center; opacity: 0; animation: mine-auf .3s .8s forwards; }
.mine-buehne .neu { color: var(--gut); font-weight: 700; }
@keyframes mine-wackeln { 0% { transform: rotate(0) } 20% { transform: rotate(-8deg) } 40% { transform: rotate(8deg) } 60% { transform: rotate(-10deg) scale(1.05) } 85% { transform: rotate(6deg) scale(1.1); opacity: 1 } 100% { transform: scale(1.4); opacity: 0 } }
@keyframes mine-auf { from { opacity: 0; transform: translateY(10px) scale(.6) } to { opacity: 1; transform: none } }
@keyframes mine-funke { from { opacity: 1; transform: translate(0, 0) } to { opacity: 0; transform: translate(var(--dx), var(--dy)) } }
.mine-ziel { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.mine-balken { height: 8px; background: var(--mulde); border-radius: 4px; overflow: hidden; margin-top: 4px; }
.mine-balken > div { height: 100%; background: linear-gradient(90deg, #d8463a, #f2b23a); }
.mine-balken.voll > div { background: linear-gradient(90deg, #6fbf4c, #a8e07a); }
.mine-ausruestung { margin-top: 10px; }
.mine-ausruestung h4 { margin: 0 0 6px; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--messing-hell); }
.mine-plaetze { display: flex; gap: 8px; flex-wrap: wrap; }
.mine-platz { width: 52px; height: 52px; display: grid; place-items: center; background: var(--mulde); border: 2px dashed #4a6068; border-radius: 6px; cursor: pointer; padding: 0; color: var(--leise); font-size: 10px; }
.mine-platz.voll { border-style: solid; border-color: var(--messing); }
.mine-platz img { width: 36px; height: 36px; image-rendering: pixelated; }
#mine_spezial { position: absolute; right: calc(var(--rand-r) + 76px); bottom: var(--unten); display: grid; justify-items: center; gap: 2px; pointer-events: none; }
#mine_spezial .rund { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(rgba(10,16,20,.75) calc(var(--abk, 0) * 1turn), transparent 0), var(--tafel); border: 3px solid var(--holz); box-shadow: inset 0 0 0 2px var(--messing); }
#mine_spezial.bereit .rund { box-shadow: inset 0 0 0 2px var(--messing-hell), 0 0 10px rgba(242, 211, 138, .6); }
#mine_spezial img { width: 26px; height: 26px; image-rendering: pixelated; }
#mine_spezial .etikett { font-size: 11px; padding: 1px 6px; background: rgba(16, 26, 32, .84); border-radius: 3px; }
body.touch #mine_spezial { bottom: calc(env(safe-area-inset-bottom, 0px) + 168px + var(--slot)); }
@media (max-height: 540px) { body.touch #mine_spezial { bottom: calc(env(safe-area-inset-bottom, 0px) + 150px); } }
`);

// ─── Förderkorb ─────────────────────────────────────────────────────────────

fensterArt('aufzug', () => {
  const s = S.s;
  const knopf = (n, text) => el('button', {
    type: 'button', class: `knopf s${n ? schichtVon(n) : 0}`, onclick: () => { fensterSchliessen(); aufzugFahren(n); },
  }, text);
  const reihen = [];
  let schicht = -1;
  for (let n = 5; n <= Math.min(MINE_TIEFE, s.mine.tiefste); n += 5) {
    if (schichtVon(n) !== schicht) { schicht = schichtVon(n); reihen.push(el('div', { class: 'mine-korb-schicht' }, SCHICHTEN[schicht].name)); }
    reihen.push(knopf(n, String(n)));
  }
  return fensterRahmen('Förderkorb', el('div', {},
    el('p', { class: 'leise' }, `Tiefste erreichte Ebene: ${s.mine.tiefste} von ${MINE_TIEFE}. Der Korb hält alle fünf Ebenen.`),
    el('div', { class: 'mine-korb' }, S.mineEbene ? knopf(0, 'Eingang') : null, knopf(1, '1'), reihen)));
}, { beispiele: () => [{}] });

// ─── Geoden knacken (Bruno) ─────────────────────────────────────────────────

fensterArt('mine_geoden', (d) => {
  const s = S.s;
  const liste = [];
  s.spieler.inv.forEach((slot, idx) => {
    if (!slot || !GEODEN.includes(slot.id)) return;
    liste.push(el('div', { class: 'zeile' },
      itemIcon(slot),
      el('div', { class: 'zeile-text' }, el('strong', {}, ITEMS[slot.id].name), el('div', { class: 'leise klein' }, `${slot.n}× im Rucksack`)),
      el('button', {
        type: 'button', class: 'knopf', disabled: s.spieler.gold < GEODE_PREIS,
        onclick: () => {
          const vorher = { ...s.mine.gefunden };
          const erg = geodeOeffnen(s, idx);
          if (erg.grund) { meldung(erg.grund, 'warn'); ton('dumpf'); return; }
          ton('geode');
          d.ergebnis = { ...erg, neu: !!ITEMS[erg.slot.id].museum && !vorher[erg.slot.id] };
          fensterNeu();
        },
      }, `Knacken · ${GEODE_PREIS} g`)));
  });
  const e = d.ergebnis;
  const funken = [[-40, -30], [40, -34], [-46, 10], [44, 14], [0, -48], [-20, 40], [24, 38]];
  const buehne = el('div', { class: 'mine-buehne', 'aria-live': 'polite' },
    e ? [
      bild(itemDatenUrl({ id: e.geode }), 'pixel geode'),
      funken.map(([dx, dy]) => el('span', { class: 'funke', style: `--dx:${dx}px;--dy:${dy}px` })),
      bild(itemDatenUrl(e.slot), 'pixel fund'),
      el('div', { class: 'name' }, el('strong', {}, `${e.slot.n > 1 ? `${e.slot.n}× ` : ''}${ITEMS[e.slot.id].name}`),
        ITEMS[e.slot.id].museum ? el('div', { class: `klein ${e.neu ? 'neu' : 'leise'}` }, `${e.neu ? 'Neu! ' : ''}${ITEMS[e.slot.id].kat === 'artefakt' ? 'Artefakt' : 'Mineral'} fürs Museum`) : null),
    ] : el('p', { class: 'leise' }, 'Leg eine Geode auf den Amboss.'));
  return fensterRahmen('Geoden knacken', el('div', {},
    el('div', { class: 'laden-kopf' }, bild(portraet('bruno'), 'pixel portraet-klein'),
      el('p', { class: 'leise' }, '„Gib her. Ein Schlag mit dem Hammer, und wir wissen mehr. 25 Gold, Freundschaftspreis."')),
    el('div', { class: 'mine-geoden' },
      el('div', { class: 'liste' }, liste.length ? liste : el('p', { class: 'leise' }, 'Du hast keine Geoden dabei.')),
      buehne)), { klasse: 'breit', kopfExtra: goldAnzeige() });
}, {
  beispiele: () => [{}, { ergebnis: { geode: 'geode', slot: { id: 'amethyst', n: 1 } } }, { ergebnis: { geode: 'omnigeode', slot: { id: 'kupfererz', n: 4 } } }],
});

// ─── Monsterziele (Alrik) ───────────────────────────────────────────────────

fensterArt('mine_ziele', () => {
  const s = S.s;
  const zeilen = ZIELE.map((z) => {
    const stand = Math.min(z.n, zielStand(s, z));
    const fertig = s.mine.belohnt.includes(z.id);
    const abholbar = zielAbholbar(s, z);
    const namen = z.typen.map((t) => MONSTER[t]?.name).filter(Boolean).join(', ');
    return el('div', { class: 'zeile mine-ziel' },
      itemIcon({ id: z.belohnung }),
      el('div', { class: 'zeile-text' },
        el('strong', {}, z.name), el('div', { class: 'leise klein' }, `${namen} · Belohnung: ${ITEMS[z.belohnung]?.name ?? '?'}`),
        el('div', { class: `mine-balken${stand >= z.n ? ' voll' : ''}`, role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(z.n), 'aria-valuenow': String(stand) },
          el('div', { style: `width:${(stand / z.n) * 100}%` })),
        el('div', { class: 'leise klein' }, `${zahl.format(stand)} / ${zahl.format(z.n)}`)),
      fertig ? el('span', { class: 'chip' }, 'Erhalten')
        : el('button', {
          type: 'button', class: 'knopf', disabled: !abholbar,
          onclick: () => {
            const erg = zielAbholen(s, z.id);
            if (erg.grund) { meldung(erg.grund, 'warn'); ton('dumpf'); } else { ton('fanfare'); meldung(`Alrik gibt dir: ${ITEMS[erg.slot.id].name}!`, 'gut'); }
            fensterNeu();
          },
        }, 'Abholen'));
  });
  return fensterRahmen('Monsterziele', el('div', {},
    el('div', { class: 'laden-kopf' }, bild(portraet('alrik'), 'pixel portraet-klein'),
      el('p', { class: 'leise' }, '„Halt die Mine sauber, dann halt ich was für dich bereit."')),
    el('div', { class: 'liste' }, zeilen)), { klasse: 'breit' });
}, { beispiele: () => [{}] });

// ─── Ringe und Stiefel im Rucksack ──────────────────────────────────────────

function platzKnopf(id, leer, klick, titel) {
  return el('button', { type: 'button', class: `mine-platz${id ? ' voll' : ''}`, title: titel, 'aria-label': titel, onclick: klick },
    id ? bild(itemDatenUrl({ id })) : leer);
}

rucksackTeil({
  id: 'mine_ausruestung', reihe: 40,
  bauen(d, { slot, idx }) {
    const s = S.s;
    const m = s.mine;
    const ringe = [];
    for (let p = 0; p < RING_PLAETZE; p++) {
      const id = m.ringe[p];
      ringe.push(platzKnopf(id, 'Ring', () => {
        let erg;
        if (id) erg = ringAblegen(s, p);
        else if (slot && ITEMS[slot.id]?.kat === 'ring') erg = ringAnlegen(s, idx, p);
        else { meldung('Wähle einen Ring im Rucksack und tippe dann auf einen freien Platz.'); return; }
        if (erg !== true) meldung(erg, 'warn'); else ton('menue');
        d.auswahl = null; d.aufgenommen = null;
        fensterNeu();
      }, id ? `${ITEMS[id].name} ablegen` : `Ringplatz ${p + 1}`));
    }
    const st = m.stiefel;
    const stiefel = platzKnopf(st, 'Stiefel', () => {
      let erg;
      if (st) erg = stiefelAusziehen(s);
      else if (slot && ITEMS[slot.id]?.kat === 'stiefel') erg = stiefelAnziehen(s, idx);
      else { meldung('Wähle Stiefel im Rucksack und tippe dann auf den Platz.'); return; }
      if (erg !== true) meldung(erg, 'warn'); else ton('menue');
      d.auswahl = null; d.aufgenommen = null;
      fensterNeu();
    }, st ? `${ITEMS[st].name} ausziehen` : 'Stiefelplatz');
    return el('div', { class: 'mine-ausruestung' }, el('h4', {}, 'Ausrüstung'), el('div', { class: 'mine-plaetze' }, ringe, stiefel));
  },
});

rucksackAktion({
  id: 'mine_anlegen', name: 'Anlegen', reihe: 20,
  wenn: (slot) => ITEMS[slot.id]?.kat === 'ring',
  tun(d, { idx }) {
    const erg = ringAnlegen(S.s, idx);
    if (erg !== true) meldung(erg, 'warn'); else ton('menue');
    d.auswahl = null; d.aufgenommen = null;
  },
});
rucksackAktion({
  id: 'mine_anziehen', name: 'Anziehen', reihe: 21,
  wenn: (slot) => ITEMS[slot.id]?.kat === 'stiefel',
  tun(d, { idx }) {
    const erg = stiefelAnziehen(S.s, idx);
    if (erg !== true) meldung(erg, 'warn'); else ton('menue');
    d.auswahl = null; d.aufgenommen = null;
  },
});

// ─── Spezialzug im HUD ──────────────────────────────────────────────────────

hudElement({
  id: 'mine_spezial', reihe: 60,
  bauen() {
    const img = el('img', { class: 'pixel', alt: '' });
    return el('div', { id: 'mine_spezial', hidden: true }, el('div', { class: 'rund' }, img), el('div', { class: 'etikett' }));
  },
  aktualisieren(e, s) {
    const info = kampfOrt() && !S.pause ? spezialInfo(s) : null;
    e.hidden = !info;
    if (!info) return;
    const slot = s.spieler.inv[s.spieler.wahl];
    const sig = `${slot.id}|${info.name}`;
    if (e.dataset.sig !== sig) {
      e.dataset.sig = sig;
      e.querySelector('img').src = itemDatenUrl({ id: slot.id });
      e.querySelector('.etikett').textContent = info.name;
    }
    const anteil = info.bereit ? 0 : Math.min(1, info.abk / info.max);
    e.style.setProperty('--abk', anteil.toFixed(3));
    e.classList.toggle('bereit', info.bereit);
  },
});

statistik({ id: 'tiefste', name: 'Tiefste Minenebene', reihe: 60, wert: (s) => s.mine?.tiefste ?? 0 });
statistik({ id: 'mine_monster', name: 'Besiegte Monster', reihe: 61, wert: (s) => s.mine?.monster ?? 0 });
statistik({ id: 'mine_geoden', name: 'Geknackte Geoden', reihe: 62, wert: (s) => s.mine?.geoden ?? 0 });
