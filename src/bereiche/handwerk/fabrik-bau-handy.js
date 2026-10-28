// Bereich „handwerk" – Fabrik Stufe 3: die Handy-App „Bauplan". Übersicht aller Bauteile (mit Plan, Stufe und Handy-Preis) und aller
// Maschinenrezepte (Schmelzer, Konstrukteur, Assembler, Mischer, Fertiger) mit Mengen pro Minute, filterbar nach Material und
// auf „was ich mit dem Rucksack bauen kann". Hängt sich als weitere App an die Handy-Oberfläche (fabrik-handy-fenster.js).

import { ITEMS } from '../../daten.js';
import { fensterNeu, el, ton, itemIcon, symbol, stil } from '../../ui.js';
import { SEITEN } from './fabrik-handy-fenster.js';
import { goldText } from './fabrik-handy.js';
import { materialien } from './fabrik-bau-daten.js';
import { bauplanListe, rezeptListe } from './fabrik-bau.js';

stil('handwerk-bauplan', `
.handy-kachel { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border: none; border-radius: 14px; background: none; color: var(--text); cursor: pointer; font-size: 14px; }
.handy-kachel:hover, .handy-kachel:focus-visible { background: #ffffff14; }
.handy-kachel img { width: 56px; height: 56px; image-rendering: pixelated; border-radius: 12px; box-shadow: 0 3px 0 #0006; }
.bp-reiter { display: flex; gap: 4px; flex: none; }
.bp-reiter button { flex: 1; min-height: 40px; border-radius: 8px; border: 2px solid #0a141a; background: #24404f; color: var(--text); font-size: 14px; cursor: pointer; }
.bp-reiter button.aktiv { background: var(--messing); color: var(--tinte); font-weight: 700; }
.bp-filter { flex: none; display: flex; flex-wrap: nowrap; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin: 0 -10px; padding-left: 10px; padding-right: 10px; scrollbar-width: thin; overscroll-behavior-x: contain; }
.bp-filter button { flex: none; display: inline-flex; align-items: center; gap: 5px; min-height: 36px; padding: 2px 10px 2px 6px; border-radius: 18px; border: 2px solid #0a141a; background: #24404f; color: var(--text); font-size: 13px; cursor: pointer; }
.bp-filter button img { width: 22px; height: 22px; image-rendering: pixelated; }
.bp-filter button.aktiv { background: var(--messing); color: var(--tinte); font-weight: 700; }
.bp-schalter { flex: none; display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 4px 10px; border-radius: 10px; border: 2px solid #0a141a; background: #24404f; color: var(--text); font-size: 14px; cursor: pointer; text-align: left; }
.bp-schalter .kasten { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #0a141a; background: #14232d; flex: none; }
.bp-schalter.aktiv .kasten { background: var(--gut); }
.bp-karte { flex: none; display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 4px 10px; padding: 8px; border-radius: 10px; background: #ffffff0d; border: 2px solid #0a141a; }
.bp-karte > img { width: 36px; height: 36px; image-rendering: pixelated; }
.bp-karte.machbar { border-color: #4f8a3a; }
.bp-karte .name { font-weight: 600; }
.bp-karte .name small { font-weight: 400; color: var(--leise); margin-left: 6px; }
.bp-karte .zutaten { grid-column: 1 / -1; gap: 3px 10px; font-size: 13px; }
.bp-karte .leise { grid-column: 1 / -1; font-size: 12px; line-height: 1.35; }
.bp-karte .gesperrt-text { color: var(--warn); }
.bp-rezept .rate { grid-column: 1 / -1; font-size: 13px; line-height: 1.4; color: #d8ece8; }
.bp-rezept .rate b { color: var(--messing-hell); font-weight: 600; }
.bp-rezept .tag { display: inline-block; margin-left: 6px; padding: 0 7px; border-radius: 9px; background: #1a2e3c; color: var(--messing-hell); font-size: 11px; font-family: var(--etikett); letter-spacing: .04em; vertical-align: 1px; }
`);

// Die Kachel hängt sich an den Startbildschirm (kein Eintrag in der Liste der Apps der Stufe 2, deren Kacheln `.handy-app` heißen).
const startStufe2 = SEITEN.start;
SEITEN.start = (s, h) => {
  const seite = startStufe2(s, h);
  seite.querySelector?.('.handy-apps')?.append(el('button', {
    type: 'button', class: 'handy-kachel', 'data-app': 'bauplan', onclick: () => { h.app = 'bauplan'; ton('menue'); fensterNeu(); },
  }, symbol('handwerk_app_bauplan'), el('span', {}, 'Bauplan')));
  return seite;
};

const kopf = (h) => el('div', { class: 'handy-kopf' },
  el('button', { type: 'button', class: 'handy-zurueck', 'aria-label': 'Zurück zum Startbildschirm', 'data-handy': 'zurueck', onclick: () => { h.app = 'start'; ton('menue'); fensterNeu(); } }, '‹'),
  el('h3', {}, 'Bauplan'));

const mengeText = (liste) => liste.map((e) => `${e.proMin.toLocaleString('de-DE')}× ${e.name}`).join(' + ');
const zahlText = (n) => n.toLocaleString('de-DE');

function bauteile(s, h) {
  const liste = bauplanListe(s, { material: h.bpMaterial ?? null, nurMachbar: !!h.bpNur });
  if (!liste.length) return el('p', { class: 'handy-leer' }, h.bpNur ? 'Mit dem, was im Rucksack liegt, geht gerade nichts. Zutaten stellt der Konstrukteur oder der Assembler her.' : 'Kein Bauteil braucht dieses Material.');
  return liste.map((p) => el('div', { class: `bp-karte${p.frei && p.moeglich >= 1 ? ' machbar' : ''}`, 'data-plan': p.id },
    itemIcon({ id: p.id }),
    el('div', { class: 'name' }, p.name, p.menge > 1 ? el('small', {}, `×${p.menge} je Bau`) : null),
    el('div', { class: 'zutaten' }, p.zutaten.map((z) => el('span', { class: `zutat${z.hat >= z.braucht ? ' ok' : ''}` }, itemIcon({ id: z.id }), `${zahlText(Math.min(z.hat, z.braucht))}/${zahlText(z.braucht)} ${z.name}`))),
    el('div', { class: 'leise' },
      p.frei ? (p.moeglich >= 1 ? `Im Rucksack für ${zahlText(p.moeglich)} ${p.moeglich === 1 ? 'Bau' : 'Bauten'}.` : 'Es fehlen Zutaten.') : el('span', { class: 'gesperrt-text' }, `Baubar ab Bergbau Stufe ${p.stufe}.`),
      p.preis ? ` Im Handy: ${goldText(p.preis)}.` : '')));
}

function rezepte(h) {
  const liste = rezeptListe({ material: h.bpMaterial ?? null });
  if (!liste.length) return el('p', { class: 'handy-leer' }, 'Kein Maschinenrezept nutzt dieses Material.');
  return liste.map((r) => el('div', { class: 'bp-karte bp-rezept', 'data-rezept': `${r.maschine}:${r.id}` },
    itemIcon({ id: Object.keys(r.aus)[0] }),
    el('div', { class: 'name' }, r.name, el('span', { class: 'tag' }, r.maschinenName)),
    el('div', { class: 'zutaten' }, Object.entries(r.ein).map(([id, n]) => el('span', { class: 'zutat ok' }, itemIcon({ id }), `${n}× ${ITEMS[id]?.name ?? id}`))),
    el('div', { class: 'rate' }, `→ ${Object.entries(r.aus).map(([id, n]) => `${n}× ${ITEMS[id]?.name ?? id}`).join(' + ')} in ${r.zeit} s`),
    el('div', { class: 'rate' }, el('b', {}, 'Pro Minute: '), `${mengeText(r.raten.ein)} → ${mengeText(r.raten.aus)}`, r.raten.leistung ? ` · ${r.raten.leistung} MW` : '')));
}

SEITEN.bauplan = (s, h) => {
  h.bpTab ??= 'teile';
  const tab = (id, text) => el('button', { type: 'button', class: h.bpTab === id ? 'aktiv' : '', 'aria-pressed': h.bpTab === id ? 'true' : 'false', 'data-bp-tab': id, onclick: () => { h.bpTab = id; ton('menue'); fensterNeu(); } }, text);
  const mat = (id, text) => el('button', {
    type: 'button', class: (h.bpMaterial ?? null) === id ? 'aktiv' : '', 'aria-pressed': (h.bpMaterial ?? null) === id ? 'true' : 'false', 'data-material': id ?? 'alle',
    onclick: () => { h.bpMaterial = id; ton('menue'); fensterNeu(); },
  }, id ? itemIcon({ id }) : null, text);
  return [kopf(h), el('div', { class: 'handy-inhalt' },
    el('div', { class: 'bp-reiter', role: 'group', 'aria-label': 'Ansicht' }, tab('teile', 'Bauteile'), tab('rezepte', 'Maschinen')),
    el('div', { class: 'handy-gruppe' }, h.bpTab === 'rezepte' ? 'Material (braucht oder liefert)' : 'Material (Zutat)'),
    el('div', { class: 'bp-filter', role: 'group', 'aria-label': 'Material' }, mat(null, 'Alle'), materialien().map((id) => mat(id, ITEMS[id].name))),
    h.bpTab === 'rezepte' ? null : el('button', {
      type: 'button', class: `bp-schalter${h.bpNur ? ' aktiv' : ''}`, 'aria-pressed': h.bpNur ? 'true' : 'false', 'data-bp-nur': '1',
      onclick: () => { h.bpNur = !h.bpNur; ton('menue'); fensterNeu(); },
    }, el('span', { class: 'kasten' }), 'Nur, was ich jetzt bauen kann'),
    h.bpTab === 'rezepte' ? rezepte(h) : bauteile(s, h),
    el('p', { class: 'handy-gruss' }, 'Gebaut wird am Maschinenbauer (Basteln-Menü, ab Bergbau Stufe 4).'))];
};

