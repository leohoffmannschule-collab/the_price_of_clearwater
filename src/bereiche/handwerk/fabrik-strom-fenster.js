// Bereich „handwerk" – Fabrik Stufe 2: Fenster des Stromnetzes (am Strommast, Generator, Wasserrad) und der
// Rohrleitungen (am Rohr, an der Pumpe). Das Netzfenster zeigt Status, Erzeugung, Verbrauch, Kapazität und
// Höchstbedarf, die Sicherung (einschalten), Brennstoff und Wassertank eines Generators, die Kabel des Anschlusses
// (lösen) und die Teilnehmer des Netzes. Das Rohrfenster zeigt Füllstand, Durchfluss, Grenze, Pumpen und Verbraucher.

import { ITEMS } from '../../daten.js';
import * as L from '../../logik.js';
import { S, meldung } from '../../spiel.js';
import { fensterArt, fensterRahmen, fensterNeu, el, ton, itemIcon, stil } from '../../ui.js';
import { GENERATOREN, PUMPE, ROHR } from './fabrik-strom-daten.js';
import { MASCHINEN, RICHTUNGEN } from './fabrik-daten.js';
import { netzUebersicht, sicherungEin, kabelAn, kabelLoesen, kabelLaenge, stromStand, anschlussStatus, mw } from './fabrik-strom.js';
import { rohrInfo } from './fabrik-rohre.js';
import { maschineDrehen } from './fabrik-objekte.js';
import { brennstoffText } from './fabrik-strom-objekte.js';

stil('handwerk-strom', `
.strom-info { display: flex; flex-direction: column; gap: 10px; padding: 4px 2px; }
.strom-status { display: flex; align-items: center; gap: 8px; font-size: 18px; }
.strom-led { width: 14px; height: 14px; flex: none; border: 2px solid var(--holz-dunkel); border-radius: 50%; background: var(--leise); }
.strom-led.an { background: var(--gut); box-shadow: 0 0 6px var(--gut); }
.strom-led.sicherung { background: var(--schlecht); box-shadow: 0 0 6px var(--schlecht); }
.strom-led.leer, .strom-led.ohne, .strom-led.uebergang { background: var(--warn); }
.strom-balken { position: relative; height: 18px; border: 2px solid var(--holz-dunkel); border-radius: 4px; background: var(--mulde); overflow: hidden; }
.strom-balken > span { position: absolute; inset: 0 auto 0 0; width: calc(var(--anteil, 0) * 100%); background: linear-gradient(#a8e87a, var(--gut)); }
.strom-balken.warn > span { background: linear-gradient(#f8d070, var(--warn)); }
.strom-balken.wasser > span { background: linear-gradient(#8ad0f8, #3a8ac8); }
.strom-balken > i { position: absolute; top: -2px; bottom: -2px; left: calc(var(--max, 0) * 100%); width: 2px; background: var(--schlecht); }
.strom-balken > b { position: relative; display: block; text-align: center; font-size: 12px; line-height: 14px; color: #fff; font-weight: 700; text-shadow: 1px 1px 0 #000, -1px 0 0 #000, 0 -1px 0 #000, 1px 0 0 #000; }
.strom-zeilen { display: grid; grid-template-columns: auto 1fr; gap: 2px 14px; margin: 0; font-variant-numeric: tabular-nums; }
.strom-zeilen dt { color: var(--leise); }
.strom-zeilen dd { margin: 0; }
.strom-warn { margin: 0; padding: 8px 10px; border-radius: 4px; background: #4a2a1a; border: 2px solid var(--holz-dunkel); color: #ffd8b0; }
.strom-liste { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.strom-liste li { display: flex; align-items: center; gap: 8px; padding: 4px 8px; background: var(--tafel-hell); border: 2px solid var(--holz-dunkel); border-radius: 4px; }
.strom-liste li > span:first-of-type { flex: 1; min-width: 0; }
.strom-liste img { width: 24px; height: 24px; image-rendering: pixelated; }
.strom-inhalt { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.strom-inhalt span { display: inline-flex; align-items: center; gap: 4px; }
.strom-inhalt img { width: 24px; height: 24px; image-rendering: pixelated; }
`);

const STATUS = {
  an: 'Strom fließt',
  sicherung: 'Sicherung geflogen',
  leer: 'Kein Strom – Brennstoff fehlt',
  ohne: 'Kein Generator im Netz',
  aus: 'Nicht angeschlossen',
  uebergang: 'Übergangsstrom aus dem Dorf',
  kein: 'Kein Anschluss',
};
const nameVon = (o) => (o.t === 'strommast' ? 'Strommast' : GENERATOREN[o.t]?.name ?? MASCHINEN[o.t]?.name ?? (o.t === 'wasserpumpe' ? PUMPE.name : ITEMS[o.t]?.name ?? o.t));
const pct = (x) => `${Math.round(Math.max(0, Math.min(1, x)) * 100)} %`;

function balken(anteil, text, { warn, wasser, max } = {}) {
  return el('div', { class: `strom-balken${warn ? ' warn' : ''}${wasser ? ' wasser' : ''}`, vars: { '--anteil': Math.max(0, Math.min(1, anteil || 0)), ...(max != null ? { '--max': Math.min(1, max) } : {}) } },
    el('span'), max != null && max <= 1 ? el('i') : null, el('b', {}, text));
}

function inhaltListe(m) {
  const paare = Object.entries(m || {}).filter(([, n]) => n > 0);
  if (!paare.length) return el('p', { class: 'leise' }, 'Kein Brennstoff im Eingang.');
  return el('div', { class: 'strom-inhalt' }, paare.map(([id, n]) => el('span', {}, itemIcon({ id }), `${n}× ${ITEMS[id]?.name ?? id}`)));
}

/** Teil des Fensters für einen Generator: Leistung, Brennstoff, Wassertank. */
function generatorTeil(s, ort, o, kk) {
  const g = GENERATOREN[o.t];
  const a = anschlussStatus(s, ort, kk);
  const n = a.n;
  const erzeugt = n?.erzeugt ?? 0;
  const teile = [el('h3', {}, g.name)];
  teile.push(el('dl', { class: 'strom-zeilen' },
    el('dt', {}, 'Leistung'), el('dd', {}, `${mw(erzeugt)} von ${mw(g.leistung)} MW`),
    g.frei ? [el('dt', {}, 'Antrieb'), el('dd', {}, 'Wasser, ohne Brennstoff')] : [el('dt', {}, 'Brennstoff'), el('dd', {}, brennstoffText(o.t))],
    o.arb && MASCHINEN[o.t]?.rezepte?.[o.arb] ? [el('dt', {}, 'Brennt'), el('dd', {}, `${ITEMS[o.arb]?.name ?? o.arb}: ${pct(1 - (o.f || 0) / MASCHINEN[o.t].rezepte[o.arb].zeit)} übrig`)] : null,
    !g.frei ? [el('dt', {}, 'Eingang'), el('dd', {}, `hinten, links und rechts (vorn zeigt ${RICHTUNGEN[o.r | 0]})`)] : null));
  if (!g.frei) teile.push(inhaltListe(o.ein));
  if (g.wasser) {
    teile.push(el('div', {}, el('div', { class: 'leise klein' }, `Wassertank (verbraucht ${g.wasser} m³/min bei voller Last)`),
      balken((o.wa || 0) / g.tank, `${mw(o.wa || 0)} / ${g.tank} m³`, { wasser: true })));
    if (!((o.wa || 0) > 0)) teile.push(el('p', { class: 'strom-warn' }, 'Kein Wasser: Eine Wasserpumpe am Ufer und Rohrleitungen bis ans Kraftwerk legen. Die Pumpe braucht selbst Strom – zum Anfahren einen Biomasse-Brenner oder ein Wasserrad ins Netz hängen.'));
  }
  if (!g.frei) {
    teile.push(el('div', { class: 'knopf-reihe' }, el('button', {
      type: 'button', class: 'knopf klein', 'data-aktion': 'drehen', onclick: () => { maschineDrehen(o); ton('menue'); fensterNeu(); },
    }, 'Drehen ↻')));
  }
  return teile;
}

function kabelTeil(s, ort, kk, max) {
  const liste = kabelAn(s, ort, kk);
  const teile = [el('h3', {}, `Kabel (${liste.length} von ${max})`)];
  if (!liste.length) {
    teile.push(el('p', { class: 'leise' }, 'Noch kein Kabel. Ein Stromkabel in die Hand nehmen, hier benutzen und dann auf das Ziel.'));
    return teile;
  }
  teile.push(el('ul', { class: 'strom-liste' }, liste.map((k) => {
    const anderes = ort.welt.objekte[k.anderes];
    return el('li', {},
      anderes ? itemIcon({ id: anderes.t === 'foerderband' ? 'foerderband' : anderes.t }) : null,
      el('span', {}, `${anderes ? nameVon(anderes) : '?'} · ${mw(kabelLaenge(ort, k.a, k.b))} Felder`),
      el('button', {
        type: 'button', class: 'knopf klein', 'data-aktion': 'kabel-loesen', onclick: () => {
          const erg = kabelLoesen(s, ort, k.i);
          ton('pop');
          meldung(erg.voll ? `Kabel gelöst – ${k.n} Kabel liegen am Boden (Rucksack voll).` : `Kabel gelöst – ${k.n} Kabel zurück im Rucksack.`);
          fensterNeu();
        },
      }, 'Lösen'));
  })));
  return teile;
}

fensterArt('handwerk_strom', (d) => {
  const s = S.s;
  const ort = S.ort;
  const kk = L.k(d.x | 0, d.y | 0);
  const o = d.o ?? ort?.welt.objekte[kk];
  if (!s || !ort || !o) return fensterRahmen('Stromnetz', el('p', { class: 'leise' }, 'Hier steht nichts mehr.'));
  stromStand(s, ort);
  const u = netzUebersicht(s, ort, kk);
  const i = u.info;
  const teile = [];
  teile.push(el('div', { class: 'strom-status' }, el('span', { class: `strom-led ${u.status}` }), el('strong', {}, STATUS[u.status] ?? u.status)));
  if (i) {
    const kap = i.kap || 0;
    teile.push(balken(kap ? i.erzeugt / kap : 0, kap ? `${mw(i.erzeugt)} / ${mw(kap)} MW` : '0 MW', { warn: i.max > kap, max: kap ? i.max / kap : null }));
    teile.push(el('dl', { class: 'strom-zeilen' },
      el('dt', {}, 'Erzeugung'), el('dd', {}, `${mw(i.erzeugt)} MW`),
      el('dt', {}, 'Verbrauch jetzt'), el('dd', {}, `${mw(u.status === 'an' ? i.bedarf : 0)} MW`),
      el('dt', {}, 'Kapazität'), el('dd', {}, `${mw(kap)} MW (Generatoren mit Brennstoff)`),
      el('dt', {}, 'Höchstbedarf'), el('dd', {}, `${mw(i.max)} MW, wenn alle Maschinen arbeiten`),
      el('dt', {}, 'Auslastung'), el('dd', {}, pct(i.last)),
      el('dt', {}, 'Netz'), el('dd', {}, `${u.gens.length} Generator${u.gens.length === 1 ? '' : 'en'}, ${u.verb.length} Verbraucher, ${u.masten} Mast${u.masten === 1 ? '' : 'en'}, ${u.kabel} Kabel`)));
    if (u.status === 'sicherung') {
      teile.push(el('p', { class: 'strom-warn' }, `Überlast: Die Maschinen wollten mehr Strom, als die Generatoren liefern. Das ganze Netz steht. Erst mehr Generatoren anschließen oder Maschinen abklemmen, dann die Sicherung einschalten.`));
      teile.push(el('div', { class: 'knopf-reihe' }, el('button', {
        type: 'button', class: 'knopf', 'data-aktion': 'sicherung', onclick: () => {
          const erg = sicherungEin(s, ort, kk);
          if (erg.grund) meldung(erg.grund); else { ton(erg.flog ? 'dumpf' : 'geld'); meldung(erg.text, erg.flog ? 'warn' : 'gut'); }
          fensterNeu();
        },
      }, 'Sicherung einschalten')));
    } else if (i.max > kap && kap > 0) {
      teile.push(el('p', { class: 'strom-warn' }, `Achtung: Arbeiten alle Maschinen gleichzeitig, brauchen sie ${mw(i.max)} MW – mehr als ${mw(kap)} MW. Dann fliegt die Sicherung.`));
    }
  } else if (u.text) teile.push(el('p', { class: 'leise' }, u.text));
  if (GENERATOREN[o.t]) teile.push(...generatorTeil(s, ort, o, kk));
  if (u.n) teile.push(...kabelTeil(s, ort, kk, u.n.max));
  if (u.gens?.length) {
    teile.push(el('h3', {}, 'Generatoren im Netz'));
    teile.push(el('ul', { class: 'strom-liste' }, u.gens.map((g) => el('li', {}, itemIcon({ id: g.o.t }), el('span', {}, g.name),
      el('span', { class: g.kann ? '' : 'leise' }, g.kann ? `${mw(g.erzeugt)} / ${mw(g.leistung)} MW` : (GENERATOREN[g.o.t].wasser && !(g.o.wa > 0) ? 'kein Wasser' : 'kein Brennstoff'))))));
  }
  if (u.verb?.length) {
    teile.push(el('h3', {}, 'Verbraucher im Netz'));
    teile.push(el('ul', { class: 'strom-liste' }, u.verb.map((v) => el('li', {}, itemIcon({ id: v.o.t }), el('span', {}, v.name),
      el('span', { class: v.will ? '' : 'leise' }, `${mw(v.leistung)} MW · ${v.will ? 'arbeitet' : 'wartet'}`)))));
  }
  return fensterRahmen(nameVon(o), el('div', { class: 'strom-info' }, teile), { klasse: 'breit' });
}, {
  beispiele: () => [
    { x: 0, y: 0, o: { t: 'strommast' } },
    { x: 0, y: 0, o: { t: 'biomassebrenner', r: 1, ein: { holz: 12 }, aus: {}, st: 'a' } },
    { x: 0, y: 0, o: { t: 'kohlekraftwerk', r: 2, ein: { kohle: 20 }, aus: {}, wa: 22, st: 'a' } },
  ],
});

// ─── Rohrleitungen ──────────────────────────────────────────────────────────

const PUMPE_STATUS = { a: 'pumpt', v: 'Netz voll oder Grenze erreicht', x: 'steht (kein Strom)' };

fensterArt('handwerk_rohrnetz', (d) => {
  const s = S.s;
  const ort = S.ort;
  const kk = L.k(d.x | 0, d.y | 0);
  const o = d.o ?? ort?.welt.objekte[kk];
  if (!s || !ort || !o) return fensterRahmen('Rohrleitung', el('p', { class: 'leise' }, 'Hier liegt nichts mehr.'));
  const titel = o.t === 'wasserpumpe' ? PUMPE.name : o.mk > 1 ? 'Rohrleitung Mk2' : 'Rohrleitung';
  const i = rohrInfo(s, ort, kk);
  const teile = [];
  if (o.t === 'wasserpumpe') {
    const a = anschlussStatus(s, ort, kk);
    teile.push(el('div', { class: 'strom-status' }, el('span', { class: `strom-led ${o.st === 'a' ? 'an' : o.st === 'v' ? 'leer' : 'aus'}` }), el('strong', {}, PUMPE_STATUS[o.st] ?? 'steht')));
    teile.push(el('dl', { class: 'strom-zeilen' },
      el('dt', {}, 'Förderung'), el('dd', {}, `${PUMPE.rate} m³/min bei vollem Strom`),
      el('dt', {}, 'Strom'), el('dd', {}, `${PUMPE.leistung} MW · ${a.text}`)));
    if (a.n) teile.push(...kabelTeil(s, ort, kk, a.n.max));
  }
  if (!i) {
    teile.push(el('p', { class: 'leise' }, o.t === 'wasserpumpe'
      ? 'Noch kein Rohr an der Pumpe. Rohrleitungen von der Pumpe bis zum Kohlekraftwerk legen.'
      : 'Dieses Rohr hängt an nichts.'));
  } else {
    teile.push(el('h3', {}, 'Rohrnetz'));
    teile.push(el('div', {}, el('div', { class: 'leise klein' }, 'Füllstand'), balken(i.fuellung, `${pct(i.fuellung)} · ${mw(i.inhalt)} / ${mw(i.volumen)} m³`, { wasser: true })));
    teile.push(el('dl', { class: 'strom-zeilen' },
      el('dt', {}, 'Zufluss'), el('dd', {}, `${Math.round(i.zufluss)} m³/min`),
      el('dt', {}, 'Abfluss'), el('dd', {}, `${Math.round(i.abfluss)} m³/min`),
      el('dt', {}, 'Grenze'), el('dd', {}, `${i.grenze} m³/min${i.stufenGemischt ? ' (das schwächste Rohr zählt)' : ''}`),
      el('dt', {}, 'Rohre'), el('dd', {}, `${i.rohre} (je ${ROHR.volumen} m³)`),
      el('dt', {}, 'Pumpen'), el('dd', {}, i.pumpen.length ? i.pumpen.map((p) => PUMPE_STATUS[p.st] ?? 'steht').join(', ') : 'keine')));
    if (i.verbraucher.length) {
      teile.push(el('h3', {}, 'Verbraucher'));
      teile.push(el('ul', { class: 'strom-liste' }, i.verbraucher.map((v) => el('li', {}, itemIcon({ id: 'kohlekraftwerk' }), el('span', {}, v.name),
        el('span', {}, `${mw(v.wasser)} / ${v.tank} m³`)))));
    } else teile.push(el('p', { class: 'leise' }, 'Kein Verbraucher am Netz. Das Kohlekraftwerk nimmt Wasser an jeder Seite an.'));
  }
  return fensterRahmen(titel, el('div', { class: 'strom-info' }, teile), { klasse: 'breit' });
}, {
  beispiele: () => [{ x: 0, y: 0, o: { t: 'rohrleitung', fl: 0.5 } }, { x: 0, y: 0, o: { t: 'wasserpumpe', st: 'a' } }],
});
