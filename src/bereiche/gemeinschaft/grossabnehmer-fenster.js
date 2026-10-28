// Bereich „gemeinschaft" – Großabnehmer: Oberfläche. Der Reiter „Großabnehmer" im Fenster Schwarzes Brett (Vertragszettel mit
// Wappen, Fortschrittsbalken und Sternen), die Handy-App „Aufträge" (Ansicht und Teillieferung), der Abschnitt im Aufgaben-Reiter
// und eine Statistikzeile. Alles bedienbar im Hochformat 390×844.

import { ITEMS } from '../../daten.js';
import { S } from '../../spiel.js';
import { portraetBild } from '../../sprites.js';
import { el, symbol, leinwandBild, itemIcon, fensterNeu, meldung, fundeZeigen, ton, zahl, stil, statistik, handyApp } from '../../ui.js';
import { GROSS, FIRMEN, sternTitel } from './grossabnehmer-daten.js';
import * as G from './grossabnehmer.js';

stil('gemeinschaft-grossabnehmer', `
.ga { display: flex; flex-direction: column; gap: 12px; }
.ga p { margin: 0; }
.ga-kopfzeile { display: flex; align-items: baseline; justify-content: space-between; gap: 4px 12px; flex-wrap: wrap; }
.ga-kopfzeile h3 { margin: 6px 0 0; }
.ga-gitter { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr)); gap: 14px 12px; }
.ga-zettel { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 14px 12px 12px; background: var(--papier); color: var(--tinte);
  border: 2px solid var(--papier-rand); border-radius: 3px; box-shadow: 0 3px 0 rgba(0, 0, 0, .25); font-size: 15px; line-height: 1.35; min-width: 0; }
.ga-zettel::before { content: ''; position: absolute; top: -6px; left: 50%; width: 11px; height: 11px; border-radius: 50%; background: #c83a3a;
  box-shadow: inset -2px -2px 0 #8a2020, 0 2px 0 rgba(0, 0, 0, .3); transform: translateX(-50%); }
.ga-zettel.fertig { border-color: #4a8a4a; }
.ga-zettel.eilig { border-color: #c8553d; }
.ga-kopf { display: grid; grid-template-columns: 48px minmax(0, 1fr) 40px; gap: 8px; align-items: center; padding-bottom: 8px; border-bottom: 2px dashed var(--papier-rand); }
.ga-wappen { width: 48px; height: 48px; image-rendering: pixelated; }
.ga-portrait { width: 40px; height: 40px; image-rendering: pixelated; border: 2px solid var(--papier-rand); background: #d9c9a0; }
.ga-name { font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
.ga-sub { font-size: 12px; color: #6a5a48; }
.ga-sterne { display: flex; align-items: center; gap: 1px; margin-top: 3px; }
.ga-sterne img { width: 13px; height: 13px; image-rendering: pixelated; }
.ga-sterne img.leer { opacity: .55; }
.handy .ga-sterne { flex-wrap: wrap; }
.handy .ga-sterne img { width: 12px; height: 12px; }
.handy .ga-sterne img.leer { opacity: .3; }
.ga-sterne .titel { margin-left: 6px; font-size: 11px; color: #6a5a48; font-family: var(--etikett); letter-spacing: .03em; text-transform: uppercase; }
.ga-ware { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 2px 10px; align-items: center; }
.ga-ware > img { width: 40px; height: 40px; image-rendering: pixelated; grid-row: span 2; }
.ga-menge { font-size: 20px; font-weight: 700; line-height: 1.1; overflow-wrap: anywhere; }
.ga-preis { font-size: 12px; color: #6a5a48; }
.ga-zahlen { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; margin: 0; }
.ga-zahlen div { min-width: 0; }
.ga-zahlen dt { font-family: var(--etikett); font-size: 10px; letter-spacing: .05em; text-transform: uppercase; color: #8a7a62; }
.ga-zahlen dd { margin: 0 0 4px; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.ga-zahlen .gross { grid-column: 1 / -1; }
.ga-zahlen .gross dd { font-size: 22px; color: #2f6a2a; line-height: 1.15; }
.ga-zahlen .eilig dd { color: #b03a28; }
.ga-balken { position: relative; height: 16px; border: 2px solid #5a4a38; background: #e3d3ae; }
.ga-balken > i { display: block; height: 100%; background: repeating-linear-gradient(90deg, #5f9c3e 0 6px, #78bb50 6px 8px); }
.ga-balken > b { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: var(--tinte); text-shadow: 0 0 2px #fff, 0 0 2px #fff; }
.ga-vorrat { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: 12px; color: #6a5a48; }
.ga-marke { display: inline-block; padding: 1px 7px; border-radius: 9px; background: #e8d9b4; border: 1px solid var(--papier-rand); font-size: 12px; }
.ga-marken { display: flex; flex-wrap: wrap; gap: 4px; }
.ga-liefern { display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 2px dashed var(--papier-rand); }
.ga-mengen { display: flex; gap: 4px; }
.ga-mengen button { flex: 1; min-height: 38px; border-radius: 4px; border: 2px solid #8a7a62; background: #e8d9b4; color: var(--tinte); font-family: var(--etikett); font-size: 12px; cursor: pointer; }
.ga-mengen button.aktiv { background: var(--messing); border-color: var(--holz-dunkel); font-weight: 700; }
.ga-zettel .knopf { min-height: 42px; width: 100%; margin: 0; font-size: 15px; }
.ga-schalter { display: flex; align-items: center; gap: 8px; min-height: 38px; padding: 2px 4px; background: none; border: none; color: var(--tinte); font-size: 13px; text-align: left; cursor: pointer; }
.ga-schalter .kasten { flex: none; width: 18px; height: 18px; border: 2px solid #5a4a38; background: #e3d3ae; }
.ga-schalter.aktiv .kasten { background: #5f9c3e; box-shadow: inset 0 0 0 2px #e3d3ae; }
.ga-firmen { display: flex; flex-direction: column; gap: 4px; }
.ga-firma { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 2px 10px; align-items: center; padding: 6px 8px; background: var(--tafel-hell); border: 2px solid var(--holz-dunkel); border-radius: 4px; }
.ga-firma > img { width: 32px; height: 32px; image-rendering: pixelated; grid-row: span 2; }
.ga-firma .ga-sterne img { width: 12px; height: 12px; }
.ga-firma .ga-sterne .titel { color: var(--leise); }
.ga-firma .status { font-size: 12px; color: var(--leise); }
.ga-paket { padding: 8px 10px; background: #2f5a34; border: 2px solid #4a8a4a; border-radius: 4px; display: flex; flex-direction: column; gap: 6px; }
.ga-leer { padding: 14px; text-align: center; color: var(--leise); background: var(--mulde); border: 2px dashed var(--holz-dunkel); border-radius: 4px; }
.reiter button .ga-zahl { margin-left: 6px; padding: 0 6px; border-radius: 8px; background: var(--schlecht); color: #fff; }
.ga-aufgabe { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 0 10px; align-items: center; padding: 6px 8px; margin-bottom: 4px; }
.ga-aufgabe > img { width: 32px; height: 32px; image-rendering: pixelated; grid-row: span 2; }
/* Handy: dunkle Zettel */
.handy .ga { gap: 10px; }
.handy .ga-gitter { grid-template-columns: 1fr; gap: 10px; }
.handy .ga-zettel { background: #ffffff0d; color: var(--text); border: 2px solid #0a141a; box-shadow: none; padding: 10px; font-size: 14px; }
.handy .ga-zettel::before { display: none; }
.handy .ga-zettel.eilig { border-color: #c8553d; }
.handy .ga-kopf { grid-template-columns: 36px minmax(0, 1fr); border-bottom-color: #0a141a; padding-bottom: 6px; }
.handy .ga-wappen { width: 36px; height: 36px; }
.handy .ga-portrait { display: none; }
.handy .ga-sub, .handy .ga-preis, .handy .ga-vorrat, .handy .ga-sterne .titel { color: var(--leise); }
.handy .ga-zahlen dt { color: var(--leise); }
.handy .ga-zahlen .gross dd { color: var(--gut); font-size: 20px; }
.handy .ga-zahlen .eilig dd { color: #ff9a82; }
.handy .ga-menge { font-size: 18px; }
.handy .ga-marke { background: #1a2e3c; border-color: #0a141a; color: var(--text); }
.handy .ga-balken { border-color: #0a141a; background: #14232d; }
.handy .ga-balken > b { color: #fff; text-shadow: 0 1px 1px #000; }
.handy .ga-liefern { border-top-color: #0a141a; }
.handy .ga-mengen button { border-color: #0a141a; background: #24404f; color: var(--text); }
.handy .ga-mengen button.aktiv { background: var(--messing); color: var(--tinte); }
.handy .ga-schalter { color: var(--text); }
.handy .ga-schalter .kasten { border-color: #0a141a; background: #14232d; }
.handy .ga-schalter.aktiv .kasten { background: var(--gut); box-shadow: inset 0 0 0 2px #14232d; }
.handy-kachel .zahl { position: absolute; top: 4px; right: calc(50% - 38px); min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--schlecht); color: #fff; font-size: 12px; line-height: 22px; font-weight: 700; }
`);

const fmt = (n) => zahl.format(n);
const gold = (n) => `${fmt(n)} g`;
const tage = (n) => (n === 1 ? '1 Tag' : `${n} Tage`);
const faktor = (z) => `×${z.toFixed(2).replace('.', ',').replace(/0$/, '')}`;
const MENGEN = [1, 10, 100, 'max'];

// ─── Bausteine ──────────────────────────────────────────────────────────────

export function sterneZeile(n, mitTitel = true) {
  const sterne = [];
  for (let i = 0; i < GROSS.maxSterne; i++) sterne.push((i < n ? symbol('gross_stern') : symbol('gross_stern_leer', 'leer')));
  return el('div', { class: 'ga-sterne', role: 'img', 'aria-label': `Vertrauen: ${n} von ${GROSS.maxSterne} Sternen, ${sternTitel(n)}`, title: `${n} von ${GROSS.maxSterne} Sternen` },
    sterne, mitTitel ? el('span', { class: 'titel' }, sternTitel(n)) : null);
}

const kopf = (s, id) => {
  const f = FIRMEN[id];
  return el('div', { class: 'ga-kopf' },
    symbol(`gross_wappen_${id}`, 'ga-wappen'),
    el('div', {}, el('div', { class: 'ga-name' }, f.name), el('div', { class: 'ga-sub' }, `${f.kontakt} · ${f.branche}`), sterneZeile(G.sterne(s, id))),
    leinwandBild(portraetBild(f.aussehen), 'ga-portrait'));
};

function zeile(titel, wert, klasse = '') {
  return el('div', { class: klasse }, el('dt', {}, titel), el('dd', {}, wert));
}

function wareBlock(v) {
  const stk = Math.round(v.gesamt / v.menge);
  return el('div', { class: 'ga-ware' },
    itemIcon(G.wareSlot(v)),
    el('div', { class: 'ga-menge' }, `${fmt(v.menge)}× ${G.wareName(v)}`),
    el('div', { class: 'ga-preis' }, `Markt ${gold(v.stueck)} je Stück → ${gold(stk)} (${faktor(v.zuschlag)})`));
}

function marken(v) {
  const m = [];
  if (v.qMin) m.push(el('span', { class: 'ga-marke' }, `mind. ${G.qualiName(v.qMin)}qualität`));
  if (v.bonus) m.push(el('span', { class: 'ga-marke', title: 'Kommt dazu, wenn der Vertrag erfüllt ist' }, `Bonus: ${v.bonus.n}× ${ITEMS[v.bonus.id].name}`));
  if (v.strafe) m.push(el('span', { class: 'ga-marke' }, `Strafe ${gold(v.strafe)}`));
  return m.length ? el('div', { class: 'ga-marken' }, m) : null;
}

function balken(v) {
  const p = Math.min(100, Math.round((v.geliefert / v.menge) * 100));
  return el('div', { class: 'ga-balken', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': v.menge, 'aria-valuenow': v.geliefert, 'aria-label': 'Geliefert' },
    el('i', { style: `width:${p}%` }), el('b', {}, `${fmt(v.geliefert)} / ${fmt(v.menge)}`));
}

/** Ergebnis einer Lieferung als { text, art }. */
export function lieferText(erg) {
  if (erg.grund) return { text: erg.grund, art: 'warn' };
  const v = erg.vertrag;
  let text = `${fmt(erg.geliefert)}× ${G.wareName(v)} an ${FIRMEN[v.firma].kurz} geliefert (${fmt(v.geliefert)}/${fmt(v.menge)}).`;
  if (erg.fertig) {
    text += ` Vertrag erfüllt! +${gold(erg.netto)}`;
    if (erg.abzug) text += ` (${gold(erg.abzug)} offene Rückforderung abgezogen)`;
    text += `. Vertrauen: ${erg.sterne} ${erg.sterne === 1 ? 'Stern' : 'Sterne'}.`;
    if (erg.bonus) text += ` Dazu ${erg.bonus.n}× ${ITEMS[erg.bonus.id].name}${erg.bonus.paket ? ' (liegt bereit, Rucksack voll)' : ''}.`;
  }
  return { text, art: 'gut' };
}

/** Vertragszettel eines laufenden Vertrags mit Fortschritt und Lieferung. `w` = { menge, setzen(m), liefern(v), auto(v) }. */
function laufenderZettel(s, v, w) {
  const rest = v.menge - v.geliefert;
  const tr = G.tageRest(s, v);
  const da = G.imRucksack(s, v);
  const k = Math.min(rest, da, w.menge === 'max' ? Infinity : w.menge);
  return el('article', { class: `ga-zettel${tr <= GROSS.warnTage ? ' eilig' : ''}`, 'data-vertrag': v.nr, 'data-firma': v.firma },
    kopf(s, v.firma),
    wareBlock(v),
    balken(v),
    el('dl', { class: 'ga-zahlen' },
      zeile('Frist', tr === 0 ? 'Heute letzter Tag' : `noch ${tage(tr)}`, tr <= GROSS.warnTage ? 'eilig' : ''),
      zeile('Es fehlen', `${fmt(rest)}×`),
      zeile('Vorschuss erhalten', gold(v.vorschuss)),
      zeile('Bei Erfüllung', gold(v.gesamt - v.vorschuss)),
      zeile('Gesamt', gold(v.gesamt), 'gross')),
    marken(v),
    el('div', { class: 'ga-vorrat' }, el('span', {}, `Rucksack: ${fmt(da)}`), el('span', {}, `Versandkiste: ${fmt(G.imVersand(s, v))}`)),
    el('div', { class: 'ga-liefern' },
      el('div', { class: 'ga-mengen', role: 'group', 'aria-label': 'Menge' }, MENGEN.map((m) => el('button', {
        type: 'button', class: w.menge === m ? 'aktiv' : '', 'aria-pressed': w.menge === m ? 'true' : 'false', 'data-menge': m, onclick: () => { w.setzen(m); ton('menue'); },
      }, m === 'max' ? 'Alles' : `×${m}`))),
      el('button', { type: 'button', class: 'knopf', 'data-liefern': v.nr, disabled: k < 1, onclick: () => w.liefern(v) },
        k >= 1 ? `Liefern: ${fmt(k)}×` : da ? 'Nichts Passendes' : 'Nichts im Rucksack'),
      el('button', { type: 'button', class: `ga-schalter${v.auto ? ' aktiv' : ''}`, 'aria-pressed': v.auto ? 'true' : 'false', 'data-auto': v.nr, onclick: () => w.auto(v) },
        el('span', { class: 'kasten' }), 'Versandkiste liefert über Nacht mit')));
}

function angebotsZettel(s, v, annehmen) {
  const f = FIRMEN[v.firma];
  const belegt = s.grossabnehmer.laufend.some((x) => x.firma === v.firma);
  const voll = s.grossabnehmer.laufend.length >= GROSS.maxLaufend;
  return el('article', { class: 'ga-zettel', 'data-angebot': v.nr, 'data-firma': v.firma },
    kopf(s, v.firma),
    wareBlock(v),
    el('dl', { class: 'ga-zahlen' },
      zeile('Frist', `${tage(v.tage)} ab Annahme`),
      zeile('Vorschuss sofort', gold(v.vorschuss)),
      zeile('Gesamt', gold(v.gesamt), 'gross')),
    marken(v),
    el('button', { type: 'button', class: 'knopf', 'data-annehmen': v.nr, disabled: belegt || voll, title: f.text, onclick: () => annehmen(v) },
      belegt ? 'Mit dieser Firma läuft schon ein Vertrag' : voll ? `Schon ${GROSS.maxLaufend} Verträge laufen` : `Annehmen · ${gold(v.vorschuss)} sofort`));
}

function paketBlock(s, abholen) {
  const p = s.grossabnehmer.paket;
  if (!p.length) return null;
  return el('div', { class: 'ga-paket', 'data-paket': '1' },
    el('div', {}, `Die Firmen haben Ware für dich zurückgelegt: ${p.map((x) => `${fmt(x.n)}× ${ITEMS[x.id].name}`).join(', ')}.`),
    el('button', { type: 'button', class: 'knopf', 'data-aktion': 'gross-paket', onclick: abholen }, 'Abholen'));
}

function firmenListe(s) {
  return el('div', { class: 'ga-firmen' }, G.firmenUebersicht(s).map((z) => el('div', { class: 'ga-firma', 'data-firma': z.id },
    symbol(`gross_wappen_${z.id}`),
    el('div', {}, el('strong', {}, z.firma.kurz), sterneZeile(z.sterne)),
    el('div', { class: 'status' }, z.vertrag ? `Vertrag läuft: ${fmt(z.vertrag.menge)}× ${G.wareName(z.vertrag)}`
      : z.angebot ? 'Hat ein Angebot am Brett' : 'Heute kein passender Vertrag'))));
}

// ─── Aktionen (gemeinsam für Brett und Handy) ───────────────────────────────

function liefernUndZeigen(s, v, n, nachher) {
  const erg = G.liefern(s, v.nr, n);
  const t = lieferText(erg);
  ton(erg.grund ? 'dumpf' : erg.fertig ? 'fanfare' : 'pop');
  if (erg.fertig && erg.bonus && !erg.bonus.paket) fundeZeigen([{ id: erg.bonus.id, n: erg.bonus.n }]);
  nachher(t);
}
function annehmenUndZeigen(s, v, nachher) {
  const erg = G.annehmen(s, v.nr);
  ton(erg.grund ? 'dumpf' : 'geld');
  nachher(erg.grund ? { text: erg.grund, art: 'warn' } : { text: `Vertrag mit ${FIRMEN[v.firma].kurz} angenommen. Vorschuss ${gold(erg.netto)} ausgezahlt.`, art: 'gut' });
}
function paketUndZeigen(s, nachher) {
  const erg = G.paketAbholen(s);
  ton(erg.grund ? 'dumpf' : 'pop');
  nachher(erg.grund ? { text: erg.grund, art: 'warn' } : { text: `Abgeholt: ${erg.geholt.map((x) => `${fmt(x.n)}× ${ITEMS[x.id].name}`).join(', ')}${erg.voll ? ' – der Rest passt nicht in den Rucksack.' : '.'}`, art: 'gut' });
}

// ─── Reiter „Großabnehmer" im Schwarzen Brett ───────────────────────────────

/** Inhalt des Reiters; `d` ist der Zustand des Fensters (Mengenwahl bleibt erhalten). */
export function grossabnehmerSeite(d) {
  const s = S.s;
  d.gaMenge ??= 'max';
  const meld = (t) => { meldung(t.text, t.art); fensterNeu(); };
  const w = {
    menge: d.gaMenge,
    setzen: (m) => { d.gaMenge = m; fensterNeu(); },
    liefern: (v) => liefernUndZeigen(s, v, d.gaMenge, meld),
    auto: (v) => { G.autoSchalten(s, v.nr); ton('menue'); fensterNeu(); },
  };
  const laufend = G.laufende(s);
  const neu = G.angebote(s);
  return el('div', { class: 'ga' },
    el('p', { class: 'leise klein' }, `Großabnehmer zahlen bis zu dreimal den Marktpreis, wenn du viel auf einmal lieferst. Der Vorschuss kommt sofort, der Rest bei Erfüllung. `
      + 'Teillieferungen aus dem Rucksack gehen hier; was bis zur Nacht in der Versandkiste liegt, rechnet die Firma selbst an, bevor der Rest verkauft wird.'),
    paketBlock(s, () => paketUndZeigen(s, meld)),
    el('div', { class: 'ga-kopfzeile' }, el('h3', {}, 'Laufende Verträge'), el('span', { class: 'chip' }, `${laufend.length}/${GROSS.maxLaufend}`)),
    laufend.length ? el('div', { class: 'ga-gitter' }, laufend.map((v) => laufenderZettel(s, v, w)))
      : el('div', { class: 'ga-leer' }, 'Kein Vertrag läuft. Such dir unten einen aus.'),
    el('div', { class: 'ga-kopfzeile' }, el('h3', {}, 'Angebote'), el('span', { class: 'leise klein' }, `Neue in ${tage(G.wechselIn(s))}`)),
    neu.length ? el('div', { class: 'ga-gitter' }, neu.map((v) => angebotsZettel(s, v, (x) => annehmenUndZeigen(s, x, meld))))
      : el('div', { class: 'ga-leer' }, 'Im Moment hängt nichts aus. Mit mehr Erfahrung in Landwirtschaft, Angeln und Bergbau kommen Angebote dazu.'),
    el('h3', {}, 'Firmen'),
    firmenListe(s),
    s.grossabnehmer.erfuellt ? el('p', { class: 'leise klein' }, `Erfüllte Verträge: ${fmt(s.grossabnehmer.erfuellt)} · verdient: ${gold(s.grossabnehmer.verdient)}`) : null);
}

/** Reiter-Leiste des Fensters (Aufträge | Großabnehmer). */
export function brettReiter(d) {
  const n = G.zustand(S.s).laufend.length;
  const knopf = (id, text, extra) => el('button', {
    type: 'button', class: d.tab === id ? 'aktiv' : '', 'aria-pressed': d.tab === id ? 'true' : 'false', 'data-brett-tab': id,
    onclick: () => { d.tab = id; ton('menue'); fensterNeu(); },
  }, text, extra);
  return el('div', { class: 'reiter', role: 'group', 'aria-label': 'Brett' }, knopf('auftrag', 'Aufträge'), knopf('gross', 'Großabnehmer', n ? el('span', { class: 'ga-zahl' }, n) : null));
}

// ─── Handy-App „Aufträge" ───────────────────────────────────────────────────

handyApp({
  id: 'auftraege', name: 'Aufträge', symbol: 'gross_app_auftraege', reihe: 60,
  abzeichen: (s) => G.zustand(s).laufend.length,
  seite(s, h) {
    h.gaMenge ??= 'max';
    const meld = (t) => { h.nachricht = { text: t.text, art: t.art, n: (h.nachricht?.n ?? 0) + 1 }; fensterNeu(); };
    const w = {
      menge: h.gaMenge,
      setzen: (m) => { h.gaMenge = m; fensterNeu(); },
      liefern: (v) => liefernUndZeigen(s, v, h.gaMenge, meld),
      auto: (v) => { G.autoSchalten(s, v.nr); ton('menue'); fensterNeu(); },
    };
    const laufend = G.laufende(s);
    const neu = G.angebote(s).filter((v) => !laufend.some((x) => x.firma === v.firma));
    return el('div', { class: 'ga', 'data-ga-handy': '1' },
      paketBlock(s, () => paketUndZeigen(s, meld)),
      laufend.length ? el('div', { class: 'ga-gitter' }, laufend.map((v) => laufenderZettel(s, v, w)))
        : el('p', { class: 'handy-leer' }, 'Kein Vertrag läuft.'),
      el('p', { class: 'handy-gruss' }, neu.length
        ? `${neu.length} ${neu.length === 1 ? 'Angebot hängt' : 'Angebote hängen'} am Schwarzen Brett im Dorf. Annehmen geht nur dort.`
        : 'Neue Verträge hängen am Schwarzen Brett im Dorf.'));
  },
});

// ─── Aufgaben-Reiter und Statistik ──────────────────────────────────────────

/** Kurzliste der laufenden Verträge für den Menüreiter „Aufgaben". */
export function aufgabenTeil(s) {
  const laufend = G.laufende(s);
  const teile = [el('h3', {}, 'Großabnehmer')];
  if (!laufend.length) {
    teile.push(el('p', { class: 'leise' }, 'Kein Vertrag mit einem Großabnehmer. Die Angebote hängen am Schwarzen Brett.'));
    return teile;
  }
  for (const v of laufend) {
    const tr = G.tageRest(s, v);
    teile.push(el('div', { class: 'auftrag rahmen-leicht ga-aufgabe', 'data-vertrag': v.nr },
      symbol(`gross_wappen_${v.firma}`),
      el('strong', {}, `${fmt(v.menge)}× ${G.wareName(v)} für ${FIRMEN[v.firma].kurz}`),
      el('div', { class: 'leise klein' }, `${fmt(v.geliefert)}/${fmt(v.menge)} geliefert · ${tr === 0 ? 'heute letzter Tag' : `noch ${tage(tr)}`} · ${gold(v.gesamt)}`)));
  }
  return teile;
}

statistik({ id: 'gemeinschaft_gross', name: 'Großabnehmer-Verträge erfüllt', reihe: 75, wert: (s) => s.grossabnehmer?.erfuellt ?? 0 });
