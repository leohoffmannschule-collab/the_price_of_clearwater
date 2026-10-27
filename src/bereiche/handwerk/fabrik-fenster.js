// Bereich „handwerk" – Fabrik: das Info-Fenster einer Maschine (Erzbohrer, Schmelzer, Konstrukteur, Assembler):
// Name, Rezept (beim Konstrukteur und Assembler wählbar, die Wahl bleibt im Spielstand), Status, Durchsatz pro Minute,
// Inhalt, Eingang und Ausgang in Worten, Zeilen (erweiterbar über fabrikInfoZeile) und die Knöpfe Drehen und
// Ausgang leeren. Das Spiel steht, solange das Fenster offen ist.

import { S, meldung } from '../../spiel.js';
import { fensterArt, fensterRahmen, fensterNeu, el, ton, itemIcon, stil } from '../../ui.js';
import { maschinenInfo } from './fabrik-info.js';
import { maschineDrehen, ausgangLeeren, rezeptWaehlen } from './fabrik-objekte.js';

stil('handwerk-fabrik', `
.fabrik-info { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
.fabrik-info h3 { margin: 4px 0 2px; }
.fabrik-status { display: flex; align-items: center; gap: 8px; font-size: 18px; }
.fabrik-led { width: 14px; height: 14px; border: 2px solid var(--holz-dunkel); border-radius: 50%; background: var(--warn); }
.fabrik-led.a { background: var(--gut); }
.fabrik-led.v { background: var(--schlecht); }
.fabrik-led.x { background: var(--leise); }
.fabrik-zeilen { display: grid; grid-template-columns: auto 1fr; gap: 2px 14px; margin: 0; }
.fabrik-zeilen dt { color: var(--leise); }
.fabrik-zeilen dd { margin: 0; }
.fabrik-rezepte { display: flex; flex-direction: column; gap: 6px; }
.fabrik-rezept { text-align: left; }
.fabrik-rezept.gewaehlt { outline: 3px solid var(--gut); }
.fabrik-inhalt { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.fabrik-inhalt span { display: inline-flex; align-items: center; gap: 4px; }
.fabrik-inhalt img { width: 24px; height: 24px; image-rendering: pixelated; }
`);

const STATUS_KLASSE = { arbeitet: 'a', 'Ausgang voll': 'v', 'steht still': 'x', voll: 'v' };

function inhaltListe(paare, leer) {
  if (!paare.length) return el('p', { class: 'leise' }, leer);
  return el('div', { class: 'fabrik-inhalt' }, paare.map(([name, n, id]) => el('span', {}, itemIcon({ id }), `${n}× ${name}`)));
}

fensterArt('handwerk_fabrik', (d) => {
  const s = S.s;
  const o = d.o;
  const info = maschinenInfo(o, s);
  const rezepte = info.rezepte.length
    ? el('div', { class: 'fabrik-rezepte' }, info.rezepte.map((r) => {
      const wahl = info.waehlbar;
      return el(wahl ? 'button' : 'div', {
        type: wahl ? 'button' : null,
        class: `${wahl ? 'knopf klein fabrik-rezept' : 'rahmen-leicht fabrik-rezept'}${r.id === info.gewaehlt ? ' gewaehlt' : ''}`,
        'data-rezept': r.id,
        onclick: wahl ? () => {
          const erg = rezeptWaehlen(s, o, r.id);
          if (erg.grund) meldung(erg.grund); else ton('menue');
          fensterNeu();
        } : null,
      }, `${r.name}: ${r.text}`);
    }))
    : null;
  return fensterRahmen(info.name, el('div', { class: 'fabrik-info' },
    el('div', { class: 'fabrik-status' }, el('span', { class: `fabrik-led ${info.code ?? STATUS_KLASSE[info.status] ?? ''}` }), el('strong', {}, info.status)),
    el('dl', { class: 'fabrik-zeilen' },
      el('dt', {}, 'Durchsatz'), el('dd', {}, `${info.durchsatz} pro Minute`),
      info.zeilen.map(([a, b]) => [el('dt', {}, a), el('dd', {}, b)])),
    el('div', {}, el('div', {}, info.eingang), el('div', {}, info.ausgang)),
    rezepte ? [el('h3', {}, info.waehlbar ? 'Rezept wählen' : 'Rezepte (automatisch)'), rezepte] : null,
    el('h3', {}, 'Eingang'), inhaltListe(info.ein, 'Nichts im Eingang.'),
    el('h3', {}, 'Ausgang'), inhaltListe(info.aus, 'Nichts im Ausgang.'),
    el('div', { class: 'knopf-reihe' },
      el('button', { type: 'button', class: 'knopf', 'data-aktion': 'drehen', onclick: () => { maschineDrehen(o); ton('menue'); fensterNeu(); } }, 'Drehen ↻'),
      el('button', { type: 'button', class: 'knopf', 'data-aktion': 'leeren', onclick: () => {
        const erg = ausgangLeeren(s, o);
        if (erg.ok) { ton('pop'); meldung('Ausgang geleert.'); } else if (erg.grund) meldung(erg.grund);
        fensterNeu();
      } }, 'Ausgang leeren'))), { klasse: 'breit' });
}, {
  beispiele: () => [
    { o: { t: 'schmelzer', r: 1, ein: { eisenerz: 3, kohle: 1 }, aus: {}, st: 'a' } },
    { o: { t: 'konstrukteur', r: 0, rez: 'schraube', ein: { eisenbarren: 2 }, aus: { schraube: 4 }, st: 'v' } },
    { o: { t: 'erzbohrer', r: 2, erz: 'kupfer', rein: 2, ein: {}, aus: {}, st: 'a' } },
  ],
});
