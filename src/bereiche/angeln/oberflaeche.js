// Bereich „angeln" – der Menüreiter „Fangbuch": alle Fische und Krebskorb-Fänge als Sammlung aus
// s.angeln.gefangen (wie oft, größter Fang), nach Gewässer gefiltert; Ungefangenes als Schattenriss.
// Dazu die kleine Tabelle der Ruten und Köder.

import { ITEMS, FISCHE } from '../../daten.js';
import { S } from '../../spiel.js';
import { menueReiter, fensterNeu, el, zahl, stil, ton } from '../../ui.js';
import { itemBild, gecacht, leinwand } from '../../sprites.js';
import { ausruestungTabelle } from './ausruestung.js';
import { korbFaenge } from './krebskorb.js';

const GEWAESSER = [
  ['alle', 'Alle'], ['teich', 'Teich'], ['fluss', 'Fluss'], ['see', 'Bergsee'], ['waldsee', 'Waldsee'],
  ['meer', 'Meer'], ['geheimteich', 'Geheimteich'], ['mine', 'Mine'], ['korb', 'Krebskorb'],
];
const GEWAESSER_NAME = Object.fromEntries(GEWAESSER);
const JZ_KURZ = { fruehling: 'Frühling', sommer: 'Sommer', herbst: 'Herbst', winter: 'Winter' };

stil('angeln-fangbuch', `
.angeln-fb { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 12px; }
@media (max-width: 720px) { .angeln-fb { grid-template-columns: minmax(0, 1fr); } }
.angeln-fb-kopf { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-bottom: 8px; }
.angeln-fb-balken { flex: 1 1 140px; height: 10px; background: var(--mulde); border: 2px solid var(--holz-dunkel); border-radius: 3px; overflow: hidden; }
.angeln-fb-balken > span { display: block; height: 100%; width: var(--anteil); background: var(--gut); }
.angeln-fb-filter { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.angeln-fb-filter button { font: inherit; font-size: 13px; padding: 2px 8px; color: var(--text); background: var(--tafel); border: 2px solid var(--holz-dunkel); border-radius: 4px; cursor: pointer; }
.angeln-fb-filter button.aktiv { background: var(--holz); border-color: var(--messing); }
.angeln-fb-gitter { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); grid-auto-rows: min-content; align-content: start; gap: 6px; }
.angeln-fb-karte { position: relative; display: grid; justify-items: center; gap: 2px; padding: 5px 2px 3px; background: var(--mulde); border: 2px solid var(--holz-dunkel); border-radius: 4px; cursor: pointer; color: var(--text); font: inherit; }
.angeln-fb-karte img { width: 32px; height: 32px; image-rendering: pixelated; }
.angeln-fb-karte .name { font-size: 10px; line-height: 1.1; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.angeln-fb-karte.da { border-color: #5a7a4a; }
.angeln-fb-karte.legende { border-color: var(--messing); box-shadow: inset 0 0 0 1px var(--messing-hell); }
.angeln-fb-karte.gewaehlt { outline: 2px solid var(--messing-hell); outline-offset: 1px; }
.angeln-fb-karte .zahl { position: absolute; top: 1px; right: 3px; font-size: 10px; color: var(--leise); }
.angeln-fb-info { padding: 10px; display: flex; flex-direction: column; gap: 6px; align-self: start; }
.angeln-fb-info .gross { width: 64px; height: 64px; image-rendering: pixelated; align-self: center; }
.angeln-fb-info dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; margin: 0; font-size: 13px; }
.angeln-fb-info dt { color: var(--leise); }
.angeln-fb-info dd { margin: 0; }
.angeln-fb-tabelle { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
.angeln-fb-tabelle th, .angeln-fb-tabelle td { padding: 2px 6px; text-align: right; border-bottom: 1px solid var(--tafel-hell); }
.angeln-fb-tabelle th:first-child, .angeln-fb-tabelle td:first-child { text-align: left; }
.angeln-fb-tabelle td img { width: 16px; height: 16px; vertical-align: -3px; margin-right: 4px; image-rendering: pixelated; }
`);

/** Schattenriss eines Gegenstands (noch nicht gefangen). */
function schattenUrl(id) {
  return gecacht(`angeln_schatten:${id}`, () => {
    const [c, g] = leinwand(16, 16);
    g.drawImage(itemBild({ id }), 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#2e3c44';
    g.fillRect(0, 0, 16, 16);
    return c;
  }, [16, 16]).toDataURL();
}
const bildUrl = (id) => itemBild({ id }).toDataURL();

const uhrText = ([von, bis]) => (von <= 600 && bis >= 2600 ? 'den ganzen Tag' : `${Math.floor(von / 100)} bis ${Math.floor(bis / 100) % 24} Uhr`);
const jzText = (jz) => (jz.length === 4 ? 'das ganze Jahr' : jz.map((j) => JZ_KURZ[j]).join(', '));

/** Alle Einträge des Fangbuchs: Fische, dann Krebskorb-Fänge. */
function eintraege() {
  const fische = FISCHE.map((f) => ({ id: f.id, it: f, orte: f.fisch.orte, legende: !!f.legendaer }));
  const korb = korbFaenge().map((k) => ({ id: k.id, it: ITEMS[k.id], orte: ['korb'], korb: k }));
  return [...fische, ...korb];
}

function info(e, buch) {
  const it = e.it;
  const b = buch[e.id];
  const zeilen = [];
  if (e.korb) {
    zeilen.push(['Fang', e.korb.wasser === 'salz' ? 'Krebskorb im Meer' : 'Krebskorb im Süßwasser']);
  } else {
    const d = it.fisch;
    zeilen.push(['Gewässer', d.orte.map((o) => GEWAESSER_NAME[o] ?? o).join(', ')]);
    zeilen.push(['Jahreszeit', jzText(d.jz)]);
    if (b) {
      zeilen.push(['Uhrzeit', uhrText(d.zeit)]);
      zeilen.push(['Wetter', d.wetter === 'regen' ? 'nur bei Regen' : d.wetter === 'sonne' ? 'nur bei Sonne' : 'egal']);
      zeilen.push(['Länge', `${d.laenge[0]}–${d.laenge[1]} cm`]);
    }
    if (it.legendaer && it.abStufe) zeilen.push(['Ab Angelstufe', String(it.abStufe)]);
  }
  if (b) {
    zeilen.push(['Gefangen', `${zahl.format(b.n)}×`]);
    if (b.groesste) zeilen.push(['Größter', `${b.groesste} cm`]);
    zeilen.push(['Preis', `${zahl.format(it.preis)} g`]);
  }
  return el('div', { class: 'angeln-fb-info rahmen-leicht' },
    el('img', { class: 'gross', src: b ? bildUrl(e.id) : schattenUrl(e.id), alt: '' }),
    el('strong', {}, b ? it.name : e.legende ? 'Legendärer Fisch' : '???'),
    e.legende ? el('span', { class: 'chip' }, b ? 'Legendär – gefangen!' : 'Legendär') : null,
    el('p', { class: 'leise klein' }, b ? it.text ?? '' : e.legende ? it.fangHinweis ?? '' : 'Noch nicht gefangen.'),
    el('dl', {}, zeilen.map(([k, v]) => [el('dt', {}, k), el('dd', {}, v)])));
}

function tabelle() {
  const t = ausruestungTabelle();
  const pct = (x) => (x ? `+${Math.round(x * 1000) / 10} %` : '–');
  const sek = (x) => (x ? `+${x.toFixed(2).replace('.', ',')} s` : '–');
  const fak = (x) => `×${x.toFixed(2).replace('.', ',')}`;
  const zeile = (z) => el('tr', {}, el('td', {}, el('img', { src: bildUrl(z.id), alt: '' }), z.name), el('td', {}, fak(z.warten)), el('td', {}, sek(z.fenster)), el('td', {}, pct(z.schatz)), el('td', {}, z.abStufe ? `ab ${z.abStufe}` : '–'));
  return el('div', {},
    el('h3', {}, 'Ruten und Köder'),
    el('table', { class: 'angeln-fb-tabelle' },
      el('thead', {}, el('tr', {}, el('th', {}, ''), el('th', {}, 'Wartezeit'), el('th', {}, 'Einholen'), el('th', {}, 'Schatz'), el('th', {}, 'Stufe'))),
      el('tbody', {}, t.ruten.map(zeile), t.koeder.map(zeile))),
    el('p', { class: 'leise klein' }, 'Rute und Köder wirken zusammen: Die Wartezeit-Faktoren werden multipliziert, die Zuschläge addiert.'));
}

menueReiter({
  id: 'angeln_fangbuch', name: 'Fangbuch', reihe: 45,
  bauen(d) {
    const buch = S.s.angeln?.gefangen ?? {};
    const alle = eintraege();
    d.angelnFilter ??= 'alle';
    const liste = alle.filter((e) => d.angelnFilter === 'alle' || e.orte.includes(d.angelnFilter));
    const wahl = liste.find((e) => e.id === d.angelnWahl) ?? liste[0];
    const fischeDa = FISCHE.filter((f) => buch[f.id]).length;
    const legenden = FISCHE.filter((f) => f.legendaer);
    const legendenDa = legenden.filter((f) => buch[f.id]).length;
    const korbDa = alle.filter((e) => e.korb && buch[e.id]).length;
    return el('div', {},
      el('div', { class: 'angeln-fb-kopf' },
        el('strong', {}, `${fischeDa} von ${FISCHE.length} Fischen`),
        el('div', { class: 'angeln-fb-balken', vars: { '--anteil': `${Math.round((fischeDa / FISCHE.length) * 100)}%` } }, el('span')),
        el('span', { class: 'chip' }, `Legendär ${legendenDa}/${legenden.length}`),
        el('span', { class: 'chip' }, `Krebskorb ${korbDa}/${alle.filter((e) => e.korb).length}`)),
      el('div', { class: 'angeln-fb-filter' }, GEWAESSER.map(([id, name]) => el('button', {
        type: 'button', class: d.angelnFilter === id ? 'aktiv' : '', 'aria-pressed': d.angelnFilter === id ? 'true' : 'false',
        onclick: () => { d.angelnFilter = id; d.angelnWahl = null; ton('menue'); fensterNeu(); },
      }, name))),
      el('div', { class: 'angeln-fb' },
        el('div', { class: 'angeln-fb-gitter' }, liste.map((e) => {
          const b = buch[e.id];
          return el('button', {
            type: 'button', title: b ? e.it.name : '???',
            class: `angeln-fb-karte${b ? ' da' : ''}${e.legende ? ' legende' : ''}${wahl === e ? ' gewaehlt' : ''}`,
            onclick: () => { d.angelnWahl = e.id; ton('menue'); fensterNeu(); },
          }, el('img', { src: b ? bildUrl(e.id) : schattenUrl(e.id), alt: '' }), el('span', { class: 'name' }, b ? e.it.name : '???'), b ? el('span', { class: 'zahl' }, zahl.format(b.n)) : null);
        })),
        wahl ? info(wahl, buch) : el('p', { class: 'leise' }, 'Hier gibt es nichts.')),
      tabelle());
  },
});
