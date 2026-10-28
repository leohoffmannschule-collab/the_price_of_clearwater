// Bereich „handwerk" – Fabrik Stufe 3: das Fenster „Maschinenbau" des Maschinenbauers. Alle Fabrikteile des Handys mit ihrem
// Bauplan: Zutaten (grün genug, rot zu wenig – Rucksack und Lager in Reichweite zusammen), Mengenwahl ×1 ×5 ×10 Max, Freischaltung
// nach Bergbau-Stufe. Das Spiel steht, solange das Fenster offen ist. Rechnung: fabrik-bau.js.

import { ITEMS } from '../../daten.js';
import * as L from '../../logik.js';
import { S, meldung } from '../../spiel.js';
import { fensterArt, fensterRahmen, fensterNeu, el, ton, itemIcon, stil, zahl } from '../../ui.js';
import { BAU, BAUPLAENE, BAU_GRUPPEN } from './fabrik-bau-daten.js';
import { quellen, planStatus, maxBauten, bauen, bauAktivSetzen } from './fabrik-bau.js';

stil('handwerk-bau', `
.fabrik-zeilen dd { white-space: pre-line; } /* mehrzeilige Info-Zeilen (Was braucht dieses Rezept?) */
.mb-kopf { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.mb-kopf p { margin: 0; font-size: 14px; }
.mb-mengen { position: sticky; top: -14px; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 -18px 6px; padding: 8px 18px; background: var(--tafel); border-bottom: 2px solid var(--holz-dunkel); }
.mb-mengen > span { color: var(--leise); font-size: 14px; margin-right: 2px; }
.mb-mengen button { min-width: 52px; min-height: 40px; }
.mb-mengen button.aktiv { background: var(--messing); color: var(--tinte); }
.mb-zeile { align-items: flex-start; }
.mb-zeile > img { width: 40px; height: 40px; margin-top: 2px; }
.mb-zeile .zeile-text strong small { font-weight: 400; color: var(--leise); margin-left: 6px; }
.mb-zeile .mb-stufe { color: var(--warn); font-size: 14px; }
.mb-zeile .mb-bauen { flex: none; min-width: 112px; min-height: 48px; line-height: 1.15; }
.mb-zeile .mb-ergebnis { font-size: 13px; color: var(--leise); }
.mb-zeile .zutat small { color: var(--leise); }
.mb-zeile.mb-ok { border-color: var(--gut); }
@media (max-width: 560px) {
  .mb-zeile { display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: start; gap: 6px 10px; }
  .mb-zeile .mb-bauen { grid-column: 1 / -1; width: 100%; }
  .mb-zeile .mb-ergebnis { display: none; }
  .mb-mengen { margin: 0 -12px 6px; padding: 8px 12px; }
}
`);

/** Gewählte Menge (bleibt zwischen den Öffnungen erhalten): 1, 5, 10 oder 'max'. */
let menge = 1;
export const mengeWaehlen = (m) => { menge = BAU.mengen.includes(m) || m === 'max' ? m : 1; };
export const gewaehlteMenge = () => menge;

function ergebnis(erg, o) {
  if (erg.grund) { meldung(erg.grund, 'warn'); ton('dumpf'); } else {
    ton('pop');
    if (erg.text) meldung(erg.text, 'gut');
    bauAktivSetzen(o, (S.t || 0) + BAU.animation);
  }
  fensterNeu();
}

function zeile(s, qs, d, id, p) {
  const st = planStatus(s, qs, id);
  const it = ITEMS[id];
  const n = menge === 'max' ? Math.max(1, maxBauten(s, qs, id)) : menge;
  const geht = st.frei && maxBauten(s, qs, id, n) >= 1;
  const max = st.frei ? maxBauten(s, qs, id) : 0;
  const anzahl = menge === 'max' ? max : Math.min(n, max);
  const stueck = (anzahl || n) * p.menge;
  const grund = !st.frei ? null : st.moeglich < 1 ? 'Es fehlen Zutaten' : max < 1 ? 'Kein Platz' : null;
  return el('div', { class: `zeile mb-zeile${geht ? ' mb-ok' : ''}${st.frei ? '' : ' gesperrt'}`, 'data-plan': id },
    itemIcon({ id }),
    el('div', { class: 'zeile-text' },
      el('strong', {}, it.name, p.menge > 1 ? el('small', {}, `×${p.menge} je Bau`) : null, el('small', {}, `im Rucksack: ${zahl.format(L.anzahl(s, id))}`)),
      st.frei
        ? el('div', { class: 'zutaten' }, st.zutaten.map((z) => {
          const braucht = z.braucht * n;
          return el('span', { class: `zutat${z.hat >= braucht ? ' ok' : ''}`, 'data-zutat': z.id }, itemIcon({ id: z.id }), `${zahl.format(Math.min(z.hat, braucht))}/${zahl.format(braucht)} ${z.name}`);
        }))
        : el('div', { class: 'mb-stufe' }, `Baubar ab Bergbau Stufe ${p.stufe}`),
      st.frei ? el('div', { class: 'mb-ergebnis' }, it.text) : null),
    st.frei ? el('button', {
      type: 'button', class: 'knopf mb-bauen', disabled: !geht, 'data-bauen': id,
      'aria-label': `${stueck} ${it.name} bauen`,
      onclick: () => ergebnis(bauen(s, S.ort, L.k(d.x, d.y), id, menge === 'max' ? 'max' : n), d.o),
    }, geht ? [`${menge === 'max' ? `Max: ${zahl.format(stueck)}×` : `${zahl.format(stueck)}×`}`, el('br'), 'Bauen'] : (grund ?? 'Bauen')) : null);
}

fensterArt('handwerk_maschinenbau', (d) => {
  const s = S.s;
  const ort = S.ort;
  const qs = quellen(s, ort, L.k(d.x ?? 0, d.y ?? 0));
  const behaelter = qs.length - 1;
  const stufe = L.stufe(s, 'bergbau');
  return fensterRahmen('Maschinenbau', el('div', {},
    el('div', { class: 'mb-kopf' },
      el('p', { class: 'leise' }, `Zutaten aus dem Rucksack und aus ${behaelter ? `${behaelter} ${behaelter === 1 ? 'Lager oder Truhe' : 'Lagern und Truhen'}` : 'Lagern und Truhen'} bis ${BAU.reichweite} Felder entfernt. Das Ergebnis kommt in den Rucksack, sonst ins Lager.`),
      el('p', { class: 'leise' }, `Bergbau Stufe ${stufe}: ${Object.keys(BAUPLAENE).filter((id) => BAUPLAENE[id].stufe <= stufe && ITEMS[id]).length} von ${Object.keys(BAUPLAENE).filter((id) => ITEMS[id]).length} Teilen baubar.`)),
    el('div', { class: 'mb-mengen', role: 'group', 'aria-label': 'Menge' },
      el('span', {}, 'Menge'),
      [...BAU.mengen, 'max'].map((m) => el('button', {
        type: 'button', class: `knopf klein${menge === m ? ' aktiv' : ''}`, 'aria-pressed': menge === m ? 'true' : 'false', 'data-menge': m,
        onclick: () => { menge = m; ton('menue'); fensterNeu(); },
      }, m === 'max' ? 'Max' : `×${m}`))),
    BAU_GRUPPEN.map((g) => {
      const ids = Object.keys(BAUPLAENE).filter((id) => BAUPLAENE[id].gruppe === g.id && ITEMS[id]);
      if (!ids.length) return null;
      return [el('h3', {}, g.name), el('div', { class: 'liste' }, ids.map((id) => zeile(s, qs, d, id, BAUPLAENE[id])))];
    })), { klasse: 'breit' });
}, {
  beispiele: () => [{ o: { t: 'maschinenbauer', r: 0 }, x: 5, y: 5 }],
});
