// Bereich „handwerk" – Fenster: die Truhe (24 Plätze, Stapel zwischen Truhe und Rucksack umlagern).

import * as L from '../../logik.js';
import { S } from '../../spiel.js';
import { fensterArt, fensterRahmen, fensterNeu, el, slotKnopf, invGitter, ton } from '../../ui.js';

/**
 * daten: { truhe, titel, drin, zeilen, knoepfe } – ein Behälter-Objekt mit `inv` aus welt.objekte (Truhe, Kühlschrank,
 * Lager der Fabrik …); titel und drin (Überschrift über dem Inhalt, z. B. „Im Kühlschrank") sind frei wählbar.
 * zeilen: () => [Text…] (oben, leise), knoepfe: [{ text, aktion, tun }] (z. B. „Drehen" beim Lager).
 */
fensterArt('truhe', (d) => {
  const s = S.s;
  const t = d.truhe;
  return fensterRahmen(d.titel || 'Truhe', el('div', {},
    el('p', { class: 'leise' }, 'Tippe einen Stapel an, um ihn umzulagern.'),
    (d.zeilen?.() ?? []).map((z) => el('p', { class: 'leise' }, z)),
    d.knoepfe?.length ? el('div', { class: 'knopf-reihe' }, d.knoepfe.map((k) => el('button', {
      type: 'button', class: 'knopf', 'data-aktion': k.aktion, onclick: () => { k.tun(); ton('menue'); fensterNeu(); },
    }, k.text))) : null,
    el('h3', {}, d.drin || 'In der Truhe'),
    el('div', { class: 'inv-gitter' }, t.inv.map((slot, i) => slotKnopf(slot, i, { klick: () => { L.umlagern(t.inv, i, s.spieler.inv); ton('menue'); fensterNeu(); } }))),
    el('h3', {}, 'Rucksack'),
    invGitter((i) => { L.umlagern(s.spieler.inv, i, t.inv); ton('menue'); fensterNeu(); })), { klasse: 'breit' });
}, {
  beispiele: () => [
    { truhe: { t: 'truhe', inv: Array(24).fill(null) } },
    {
      truhe: { t: 'lager', r: 1, inv: Array(48).fill(null) }, titel: 'Lager', drin: 'Im Lager',
      zeilen: () => ['Eingang: hinten, links und rechts · Ausgang: vorn (rechts)'],
      knoepfe: [{ text: 'Drehen ↻', aktion: 'drehen', tun: () => {} }],
    },
  ],
});
import './fabrik-fenster.js'; // Fabrik: Info-Fenster der Maschinen
