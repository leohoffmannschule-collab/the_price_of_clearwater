// Bereich „handwerk" – Fabrik Stufe 2: das Handy als Menüreiter. Ein Telefon im Stil des Spiels mit Statusleiste
// (Uhrzeit, Gold, Akku), Startbildschirm und vier Apps:
//   Fabrikbedarf  Katalog aller Fabrikteile mit Preisen, Mengen ×1 ×10 ×100 Max, Lieferung sofort in den Rucksack
//   Vorkommen     Sorte und Reinheit wählen, bestellen (Preis nach Reinheit)
//   Paketfach     wartende Lieferungen (Starterpaket, Handy alter Stände) abholen
//   Stromnetz     Netze der Karte, auf der man steht (nur lesen; die Sicherung schaltet man am Mast oder Generator)
// Geöffnet über Menü › Handy oder mit dem Gegenstand Handy (Benutzen). Bedienbar im Hochformat (390×844).

import { ITEMS } from '../../daten.js';
import * as L from '../../logik.js';
import { karteHolen } from '../../karten.js';
import { S } from '../../spiel.js';
import { menueReiter, fensterNeu, el, ton, itemIcon, symbol, stil, zahl, HANDY_APPS } from '../../ui.js';
import { HANDY_MENGEN, GENERATOREN } from './fabrik-strom-daten.js';
import { SORTEN, REINHEIT, FABRIK, MASCHINEN } from './fabrik-daten.js';
import { handyKatalog, handyKaufen, hoechstens, goldText, vorkommenAngebot, vorkommenKaufen, paketListe, paketAbholen } from './fabrik-handy.js';
import { stromStand, uebergang, uebergangRest, mw } from './fabrik-strom.js';
import { hatVerbraucher } from './fabrik-strom-objekte.js';

stil('handwerk-handy', `
.handy { display: flex; justify-content: center; }
.handy-geraet { width: min(100%, 400px); padding: 10px 9px 12px; border-radius: 26px; background: linear-gradient(160deg, #3a3e4a, #191b22 60%); border: 3px solid #101116; box-shadow: inset 0 0 0 2px #5a5e6c, 0 4px 0 rgba(0,0,0,.35); }
.handy-schirm { display: flex; flex-direction: column; min-height: 420px; max-height: min(66vh, 600px); border-radius: 16px; overflow: hidden; background: linear-gradient(#20384a, #142430); border: 2px solid #0a0c10; color: var(--text); }
.handy-leiste { display: flex; align-items: center; gap: 8px; padding: 5px 12px; font-family: var(--etikett); font-size: 11px; letter-spacing: .04em; background: #0e1a22; color: #cfe6ee; }
.handy-leiste .gold { margin-left: auto; color: var(--messing-hell); }
.handy-leiste img { width: 16px; height: 16px; image-rendering: pixelated; }
.handy-kopf { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #1a2e3c; border-bottom: 2px solid #0a141a; }
.handy-kopf h3 { margin: 0; flex: 1; min-width: 0; font-family: var(--schrift); font-size: 18px; letter-spacing: 0; text-transform: none; color: var(--messing-hell); }
.handy-zurueck { min-width: 40px; min-height: 36px; padding: 2px 10px; border-radius: 18px; border: 2px solid #0a141a; background: #2a4658; color: var(--text); font-size: 18px; cursor: pointer; }
.handy-inhalt { flex: 1; overflow: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; overscroll-behavior: contain; }
.handy-apps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 10px; padding: 18px 10px; }
.handy-app { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border: none; border-radius: 14px; background: none; color: var(--text); cursor: pointer; font-size: 14px; }
.handy-app:hover, .handy-app:focus-visible { background: #ffffff14; }
.handy-app img { width: 56px; height: 56px; image-rendering: pixelated; border-radius: 12px; box-shadow: 0 3px 0 #0006; }
.handy-app .zahl { position: absolute; top: 4px; right: calc(50% - 38px); min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--schlecht); color: #fff; font-size: 12px; line-height: 22px; font-weight: 700; }
.handy-gruss { margin: 0; padding: 0 14px; color: var(--leise); font-size: 14px; text-align: center; }
.handy-mengen { position: sticky; top: -10px; z-index: 1; display: flex; gap: 4px; margin: -10px -10px 0; padding: 8px 10px; background: #183040; border-bottom: 2px solid #0a141a; }
.handy-mengen button { flex: 1; min-height: 36px; border-radius: 8px; border: 2px solid #0a141a; background: #24404f; color: var(--leise); font-family: var(--etikett); font-size: 12px; cursor: pointer; }
.handy-mengen button.aktiv { background: var(--messing); color: var(--tinte); }
.handy-gruppe { margin: 6px 2px 0; font-family: var(--etikett); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--messing-hell); }
.handy-ware { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 4px 10px; padding: 8px; border-radius: 10px; background: #ffffff0d; border: 2px solid #0a141a; }
.handy-ware > img { width: 40px; height: 40px; image-rendering: pixelated; }
.handy-ware .handy-name { font-weight: 600; }
.handy-ware .handy-preis { color: var(--messing-hell); font-size: 13px; font-variant-numeric: tabular-nums; }
.handy-ware .handy-hat { color: var(--leise); font-size: 12px; }
.handy-ware .text { grid-column: 1 / -1; margin: 2px 0 0; color: var(--leise); font-size: 13px; line-height: 1.35; }
.handy-ware .knopf { min-height: 40px; min-width: 92px; font-size: 13px; line-height: 1.1; }
.handy-mehr { padding: 0; border: none; background: none; color: inherit; text-align: left; cursor: pointer; font: inherit; }
.handy-wahl { display: flex; flex-wrap: wrap; gap: 6px; }
.handy-wahl button { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 4px 10px; border-radius: 10px; border: 2px solid #0a141a; background: #24404f; color: var(--text); cursor: pointer; font-size: 14px; }
.handy-wahl button.aktiv { background: var(--messing); color: var(--tinte); font-weight: 700; }
.handy-wahl .punkt { width: 12px; height: 12px; border-radius: 50%; background: var(--farbe); border: 2px solid #0a141a; }
.handy-wahl small { opacity: .8; }
.handy-karte { display: flex; gap: 12px; align-items: center; padding: 10px; border-radius: 12px; background: #ffffff10; border: 2px solid #0a141a; }
.handy-karte > img { width: 64px; height: 64px; image-rendering: pixelated; flex: none; }
.handy-karte h4 { margin: 0 0 4px; font-size: 17px; }
.handy-karte p { margin: 2px 0; font-size: 13px; color: var(--leise); }
.handy-karte .handy-preis { color: var(--messing-hell); font-size: 16px; font-weight: 700; }
.handy-netz { padding: 8px 10px; border-radius: 10px; background: #ffffff0d; border: 2px solid #0a141a; }
.handy-netz .kopf { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.handy-netz .kopf .strom-led { margin-left: auto; }
.handy-hinweis { margin: 0 6px; padding: 8px 10px; border-radius: 10px; background: #4a3a1a; border: 2px solid #0a141a; color: #ffe4a8; font-size: 13px; line-height: 1.35; }
.handy-nachricht { margin: 0; padding: 7px 12px; font-size: 13px; line-height: 1.35; border-bottom: 2px solid #0a141a; }
.handy-nachricht.gut { background: #1f3a24; color: #d8f5c0; }
.handy-nachricht.warn { background: #4a2a1a; color: #ffd8b0; }
.handy-fuss { position: sticky; bottom: -10px; z-index: 1; display: flex; justify-content: center; margin: auto -10px -10px; padding: 10px; background: linear-gradient(transparent, #142430 30%); }
.handy-fuss .knopf { width: 100%; }
/* Schatten oben und unten, solange es noch etwas zu scrollen gibt */
.handy-inhalt {
  background:
    linear-gradient(#183040 40%, #18304000) top / 100% 24px no-repeat local,
    linear-gradient(#14243000, #142430 60%) bottom / 100% 24px no-repeat local,
    radial-gradient(farthest-side at 50% 0, #0008, #0000) top / 100% 10px no-repeat scroll,
    radial-gradient(farthest-side at 50% 100%, #000a, #0000) bottom / 100% 12px no-repeat scroll;
}
.handy-leer { margin: 18px 4px; color: var(--leise); text-align: center; }
.handy-home { width: 96px; height: 5px; margin: 9px auto 0; border-radius: 3px; background: #6a6e7a; }
@media (max-width: 480px) {
  .handy-geraet { padding: 6px 5px 8px; border-radius: 18px; }
  .handy-schirm { max-height: calc(100dvh - 360px); min-height: 300px; border-radius: 12px; }
  .handy-ware { grid-template-columns: 36px minmax(0, 1fr) auto; padding: 6px; }
  .handy-ware > img { width: 36px; height: 36px; }
}
`);

const APPS = [
  { id: 'bedarf', name: 'Fabrikbedarf', symbol: 'handwerk_app_bedarf' },
  { id: 'vorkommen', name: 'Vorkommen', symbol: 'handwerk_app_vorkommen' },
  { id: 'paket', name: 'Paketfach', symbol: 'handwerk_app_paket' },
  { id: 'strom', name: 'Stromnetz', symbol: 'handwerk_app_strom' },
];
let zuletzt = { app: 'start', menge: 1, sorte: 'eisen', rein: 'normal', offen: null };

function zustand(d) {
  d.handy ??= { ...zuletzt };
  zuletzt = d.handy;
  return d.handy;
}

/** Ergebnis eines Kaufs im Handy selbst zeigen (Leiste oben in der App), statt Meldungen zu stapeln. */
function ergebnis(h, erg) {
  h.nachricht = { text: erg.grund ?? erg.text ?? '', art: erg.grund ? 'warn' : 'gut', n: (h.nachricht?.n ?? 0) + 1 };
  ton(erg.grund ? 'dumpf' : 'geld');
  fensterNeu();
}
/** In eine andere App wechseln (die Nachricht der alten verschwindet). */
function oeffne(h, app) { h.app = app; h.nachricht = null; ton('menue'); fensterNeu(); }

function kopf(h, titel) {
  return el('div', { class: 'handy-kopf' },
    el('button', { type: 'button', class: 'handy-zurueck', 'aria-label': 'Zurück zum Startbildschirm', 'data-handy': 'zurueck', onclick: () => oeffne(h, 'start') }, '‹'),
    el('h3', {}, titel));
}

// ─── Startbildschirm ────────────────────────────────────────────────────────

function start(s, h) {
  const pakete = paketListe(s).length ? Math.max(1, s.fabrik.lieferungen | 0) : 0; // Zahl der Lieferungen, nicht der Stücke
  return el('div', { class: 'handy-inhalt' },
    el('div', { class: 'handy-apps' }, APPS.map((a) => el('button', {
      type: 'button', class: 'handy-app', 'data-app': a.id, 'aria-label': a.id === 'paket' && pakete ? `${a.name} (${pakete} ${pakete === 1 ? 'Lieferung' : 'Lieferungen'})` : a.name, onclick: () => oeffne(h, a.id),
    }, symbol(a.symbol), el('span', {}, a.name), a.id === 'paket' && pakete ? el('span', { class: 'zahl' }, zahl.format(pakete)) : null)),
      // Apps anderer Bereiche (ui.js › handyApp), als Kacheln hinter den vier eigenen
      HANDY_APPS.map((a) => {
        const n = a.abzeichen?.(s) ?? 0;
        return el('button', { type: 'button', class: 'handy-kachel', 'data-app': a.id, 'aria-label': n ? `${a.name} (${n})` : a.name, onclick: () => oeffne(h, a.id) },
          symbol(a.symbol), el('span', {}, a.name), n ? el('span', { class: 'zahl' }, zahl.format(n)) : null);
      })),
    uebergang(s) && hatVerbraucher(s)
      ? el('p', { class: 'handy-hinweis' }, `Übergangsstrom aus dem Dorf: noch ${uebergangRest(s)} ${uebergangRest(s) === 1 ? 'Tag' : 'Tage'}. Danach stehen Maschinen ohne Stromnetz still.`)
      : null,
    el('p', { class: 'handy-gruss' }, 'Bestellen geht immer – Tag und Nacht, auch in der Mine. Geliefert wird sofort in den Rucksack.'));
}

// ─── Fabrikbedarf ───────────────────────────────────────────────────────────

function bedarf(s, h) {
  const mengen = el('div', { class: 'handy-mengen', role: 'group', 'aria-label': 'Menge' },
    [...HANDY_MENGEN, 'max'].map((m) => el('button', {
      type: 'button', class: h.menge === m ? 'aktiv' : '', 'aria-pressed': h.menge === m ? 'true' : 'false', 'data-menge': m,
      onclick: () => { h.menge = m; ton('menue'); fensterNeu(); },
    }, m === 'max' ? 'Max' : `×${m}`)));
  const teile = [mengen];
  for (const g of handyKatalog()) {
    if (!g.eintraege.length) continue;
    teile.push(el('div', { class: 'handy-gruppe' }, g.name));
    for (const w of g.eintraege) {
      const max = hoechstens(s, w.id);
      const n = h.menge === 'max' ? max : h.menge;
      const geht = n >= 1 && max >= 1;
      const offen = h.offen === w.id;
      teile.push(el('div', { class: 'handy-ware', 'data-ware': w.id },
        itemIcon({ id: w.id }),
        el('button', { type: 'button', class: 'handy-mehr', 'aria-expanded': offen ? 'true' : 'false', onclick: () => { h.offen = offen ? null : w.id; fensterNeu(); } },
          el('div', { class: 'handy-name' }, w.name),
          el('div', { class: 'handy-preis' }, `je ${goldText(w.preis)}`),
          el('div', { class: 'handy-hat' }, `im Rucksack: ${zahl.format(L.anzahl(s, w.id))}`)),
        el('button', {
          type: 'button', class: 'knopf klein', disabled: !geht, 'data-kaufen': w.id,
          'aria-label': `${n || 0} ${w.name} kaufen`,
          onclick: () => ergebnis(h, handyKaufen(s, w.id, n)),
        }, geht ? [`${n > 1 ? `${zahl.format(n)}× ` : ''}Kaufen`, el('br'), goldText(w.preis * n)] : (s.spieler.gold < w.preis ? 'Zu teuer' : 'Kein Platz')),
        offen ? el('p', { class: 'text' }, w.text) : null));
    }
  }
  return [kopf(h, 'Fabrikbedarf'), el('div', { class: 'handy-inhalt' }, teile)];
}

// ─── Vorkommen ──────────────────────────────────────────────────────────────

function vorkommen(s, h) {
  const a = vorkommenAngebot(h.sorte, h.rein);
  const r = a.reinheiten.find((x) => x.id === h.rein) ?? a.reinheiten[1];
  const id = a.item;
  const it = ITEMS[id];
  const proMin = Math.round(((REINHEIT[h.rein] ?? 1) / FABRIK.bohrerZeit) * 60);
  const geht = !!it && s.spieler.gold >= r.preis && L.platzFuer(s, { id, n: 1 }) >= 1;
  return [kopf(h, 'Vorkommen'), el('div', { class: 'handy-inhalt' },
    el('div', { class: 'handy-gruppe' }, 'Sorte'),
    el('div', { class: 'handy-wahl', role: 'group', 'aria-label': 'Sorte' }, a.sorten.map((x) => el('button', {
      type: 'button', class: h.sorte === x.id ? 'aktiv' : '', 'aria-pressed': h.sorte === x.id ? 'true' : 'false', 'data-sorte': x.id,
      onclick: () => { h.sorte = x.id; ton('menue'); fensterNeu(); },
    }, el('span', { class: 'punkt', vars: { '--farbe': x.farbe } }), x.name))),
    el('div', { class: 'handy-gruppe' }, 'Reinheit'),
    el('div', { class: 'handy-wahl', role: 'group', 'aria-label': 'Reinheit' }, a.reinheiten.map((x) => el('button', {
      type: 'button', class: h.rein === x.id ? 'aktiv' : '', 'aria-pressed': h.rein === x.id ? 'true' : 'false', 'data-rein': x.id,
      onclick: () => { h.rein = x.id; ton('menue'); fensterNeu(); },
    }, x.id, el('small', {}, ` ${String(x.faktor).replace('.', ',')}×`)))),
    it ? el('div', { class: 'handy-karte' }, itemIcon({ id }),
      el('div', {},
        el('h4', {}, it.name),
        el('p', {}, `Ausbeute ${String(REINHEIT[h.rein]).replace('.', ',')}× – ein Erzbohrer fördert darauf ${proMin} ${ITEMS[SORTEN[h.sorte].item]?.name ?? 'Stück'} pro Minute.`),
        el('p', {}, '2×2 Felder. In die Hand nehmen und benutzen; mit Spitzhacke oder Axt wieder aufnehmen.'),
        el('p', {}, `Im Rucksack: ${L.anzahl(s, id)}`),
        el('div', { class: 'handy-preis' }, goldText(r.preis)))) : null,
    el('div', { class: 'handy-fuss' }, el('button', {
      type: 'button', class: 'knopf gross', disabled: !geht, 'data-aktion': 'vorkommen-kaufen',
      onclick: () => ergebnis(h, vorkommenKaufen(s, h.sorte, h.rein, 1)),
    }, geht ? `Bestellen · ${goldText(r.preis)}` : s.spieler.gold < r.preis ? `Zu teuer (${goldText(r.preis)})` : 'Rucksack voll')))];
}

// ─── Paketfach ──────────────────────────────────────────────────────────────

function paket(s, h) {
  const liste = paketListe(s);
  return [kopf(h, 'Paketfach'), el('div', { class: 'handy-inhalt' },
    liste.length
      ? [liste.map((p) => el('div', { class: 'handy-ware' }, itemIcon({ id: p.id }), el('div', {}, el('div', { class: 'handy-name' }, ITEMS[p.id]?.name ?? p.id), el('div', { class: 'handy-hat' }, `${zahl.format(p.n)} Stück`)), el('span'))),
        el('div', { class: 'handy-fuss' }, el('button', { type: 'button', class: 'knopf gross', 'data-aktion': 'paket-abholen', onclick: () => ergebnis(h, paketAbholen(s)) }, 'Alles abholen'))]
      : el('p', { class: 'handy-leer' }, 'Keine Lieferung wartet.'))];
}

// ─── Stromnetz ──────────────────────────────────────────────────────────────

const NETZ_TEXT = { an: 'Strom fließt', sicherung: 'Sicherung geflogen', leer: 'Brennstoff fehlt', ohne: 'kein Generator', vorrang: 'Anlauf: Pumpen zuerst' };

/** Karten mit Stromanschlüssen (die aktuelle zuerst). */
function kartenMitStrom(s) {
  const liste = [];
  for (const [id, welt] of Object.entries(s.welt || {})) {
    const def = S.ort?.def.id === id ? S.ort.def : karteHolen(id, s);
    if (!def || def.fluechtig) continue;
    const c = stromStand(s, { def, welt });
    if (c.knoten.size) liste.push({ def, c, hier: S.ort?.def.id === id });
  }
  return liste.sort((a, b) => (b.hier - a.hier) || a.def.name.localeCompare(b.def.name, 'de'));
}

function strom(s, h) {
  const teile = [];
  const karten = s.fabrik?.strom ? kartenMitStrom(s) : [];
  if (!karten.length) teile.push(el('p', { class: 'handy-leer' }, 'Du hast noch kein Stromnetz und keine Maschine mit Strombedarf.'));
  for (const { def, c, hier } of karten) {
    teile.push(el('div', { class: 'handy-gruppe' }, `${def.name}${hier ? ' · hier' : ''}`));
    c.netze.filter((n) => n.gens.length || n.verb.length).forEach((n, i) => {
      const info = n.info ?? { status: 'ohne', kap: 0, erzeugt: 0, max: 0 };
      teile.push(el('div', { class: 'handy-netz', 'data-netz': `${def.id}:${i}` },
        el('div', { class: 'kopf' }, `Netz ${i + 1}`, el('span', { class: 'leise' }, NETZ_TEXT[info.status] ?? ''), el('span', { class: `strom-led ${info.status}` })),
        el('div', { class: 'leise' }, `${mw(info.erzeugt)} / ${mw(info.kap)} MW · Höchstbedarf ${mw(info.max)} MW`),
        el('div', { class: 'leise' }, `${n.gens.map((g) => GENERATOREN[g.o.t].name).join(', ') || 'keine Generatoren'} · ${n.verb.length} Verbraucher`)));
    });
    if (c.ohne.length) {
      teile.push(el('div', { class: 'handy-netz' },
        el('div', { class: 'kopf' }, `${c.ohne.length} ohne Netz`, el('span', { class: `strom-led ${uebergang(s) ? 'uebergang' : 'aus'}` })),
        el('div', { class: 'leise' }, uebergang(s) ? `Laufen mit Übergangsstrom aus dem Dorf (noch ${uebergangRest(s)} ${uebergangRest(s) === 1 ? 'Tag' : 'Tage'}).` : 'Stehen still – mit einem Kabel anschließen.'),
        el('div', { class: 'leise' }, c.ohne.map((n) => MASCHINEN[n.o.t]?.name ?? 'Wasserpumpe').join(', '))));
    }
  }
  teile.push(el('p', { class: 'handy-gruss' }, 'Die Sicherung schaltest du am Generator oder Strommast wieder ein.'));
  return [kopf(h, 'Stromnetz'), el('div', { class: 'handy-inhalt' }, teile)];
}

// ─── Reiter ─────────────────────────────────────────────────────────────────

export const SEITEN = { start, bedarf, vorkommen, paket, strom };

function uhr(s) {
  return L.uhrzeit(s.zeit.minute);
}

menueReiter({
  id: 'handy',
  name: 'Handy',
  reihe: 85,
  bauen(d) {
    const s = S.s;
    const h = zustand(d);
    const fremd = HANDY_APPS.find((a) => a.id === h.app);
    const seite = fremd ? [kopf(h, fremd.name), el('div', { class: 'handy-inhalt' }, fremd.seite(s, h))] : (SEITEN[h.app] ?? start)(s, h);
    // Ergebnis des letzten Kaufs als Leiste unter dem Kopf der App
    if (h.nachricht?.text && Array.isArray(seite)) {
      seite.splice(1, 0, el('div', { class: `handy-nachricht ${h.nachricht.art}`, role: 'status', 'data-nachricht': h.nachricht.n }, h.nachricht.text));
    }
    return el('div', { class: 'handy' }, el('div', { class: 'handy-geraet' },
      el('div', { class: 'handy-schirm', 'data-handy-app': h.app },
        el('div', { class: 'handy-leiste' }, el('span', {}, uhr(s)), el('span', {}, '· Klarnetz'), el('span', { class: 'gold' }, goldText(s.spieler.gold)), symbol('handwerk_akku')),
        seite),
      el('div', { class: 'handy-home' })));
  },
});
