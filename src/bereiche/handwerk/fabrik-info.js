// Bereich „handwerk" – Fabrik: was das Info-Fenster einer Maschine zeigt (DOM-frei, damit Tests es lesen).
// Erweiterbar: `fabrikInfoZeile(fn)` hängt eine Zeile an (fn(o, s) → [Bezeichnung, Wert] oder null), z. B. „Strom: …".

import { ITEMS } from '../../daten.js';
import { FABRIK, MASCHINEN, RICHTUNGEN, SORTEN, reinName } from './fabrik-daten.js';
import { zutatenGrenze } from './fabrik-sim.js';

const ZEILEN = [];
/** Eine zusätzliche Zeile im Info-Fenster (Stufe 2: Strom …). fn(o, s) → [Bezeichnung, Wert] | null. */
export function fabrikInfoZeile(fn) { ZEILEN.push(fn); }

const name = (id) => ITEMS[id]?.name ?? id;
const liste = (m) => Object.entries(m || {}).filter(([, n]) => n > 0).map(([id, n]) => [name(id), n, id]);
const text = (m) => Object.entries(m).map(([id, n]) => `${n}× ${name(id)}`).join(' + ');

export const STATUS_TEXT = {
  a: 'arbeitet',
  e: 'wartet auf Eingang',
  v: 'Ausgang voll',
  x: 'steht still',
};

/** Durchsatz pro Minute (gleitendes Mittel über etwa eine Minute), eine Nachkommastelle. */
export function durchsatzVon(o) {
  return Math.round((Number(o.dr) || 0) * 10) / 10;
}

/** Eingang und Ausgang in Worten. */
export function portText(o) {
  const r = o.r | 0;
  const aus = `Ausgang: vorn (${RICHTUNGEN[r]})`;
  if (o.t === 'erzbohrer') return { eingang: 'Eingang: keiner (fördert allein)', ausgang: aus };
  return { eingang: 'Eingang: hinten, links und rechts', ausgang: aus };
}

export function maschinenInfo(o, s) {
  const def = MASCHINEN[o.t];
  const info = {
    name: def.name,
    typ: o.t,
    waehlbar: !!def.waehlbar,
    rezepte: [],
    gewaehlt: null,
    status: STATUS_TEXT[o.st] ?? (o.t === 'lager' ? 'bereit' : 'wartet auf Eingang'),
    durchsatz: durchsatzVon(o),
    ein: liste(o.ein),
    aus: liste(o.aus),
    ...portText(o),
    zeilen: [],
  };
  if (def.rezepte) {
    for (const [id, r] of Object.entries(def.rezepte)) info.rezepte.push({ id, name: r.name, text: `${text(r.ein)} → ${text(r.aus)} (${r.zeit} s)` });
    info.gewaehlt = def.waehlbar ? (o.rez ?? def.standard) : null;
  }
  if (o.t === 'erzbohrer') {
    const sorte = SORTEN[o.erz];
    info.rezepte = [];
    info.zeilen.push(['Vorkommen', sorte ? `${sorte.name} (${reinName(o.rein ?? 1)}, ${o.rein ?? 1}×)` : 'keins']);
    info.zeilen.push(['Förderung', `${Math.round(((o.rein ?? 1) / FABRIK.bohrerZeit) * 600) / 10} Stück/min`]);
  }
  if (o.t === 'lager') {
    const belegt = (o.inv || []).filter(Boolean).length;
    info.zeilen.push(['Fächer', `${belegt} von ${FABRIK.lagerFaecher} belegt`]);
    info.status = belegt >= FABRIK.lagerFaecher ? 'voll' : 'bereit';
  }
  info.code = o.t === 'lager' ? null : (o.st ?? 'e');
  if (def.rezepte && !o.arb && info.code === 'e') {
    // Was fehlt? (gewähltes Rezept; beim Schmelzer das Rezept, zu dem schon etwas da ist)
    const ein = o.ein || {};
    const liste = def.waehlbar ? [def.rezepte[o.rez ?? def.standard]].filter(Boolean) : Object.values(def.rezepte);
    const r = liste.find((x) => Object.keys(x.ein).some((z) => z !== 'kohle' && ein[z] > 0)) ?? liste[0];
    const fehlt = r ? Object.entries(r.ein).filter(([z, n]) => (ein[z] || 0) < n).map(([z, n]) => `${name(z)} ${ein[z] || 0}/${n}`) : [];
    if (fehlt.length) info.status = `wartet auf Eingang: es fehlt ${fehlt.join(', ')}`;
  }
  if (o.abg && def.rezepte) {
    info.zeilen.push(o.abg.g === 'f'
      ? ['Blockiert', `${name(o.abg.id)} passt nicht zum Rezept – das Band davor staut.`]
      : ['Eingang voll', `${name(o.abg.id)}: genug im Eingang, das Band davor wartet.`]);
  }
  for (const [z, n] of Object.entries(o.ein || {})) {
    if (def.rezepte && n > zutatenGrenze(o, z) && zutatenGrenze(o, z) > 0) info.zeilen.push(['Überschuss', `${n}× ${name(z)} (mehr als gebraucht – Verhältnis der Zutaten prüfen)`]);
  }
  if (o.arb && def.rezepte?.[o.arb]) {
    const r = def.rezepte[o.arb];
    info.zeilen.push(['Fortschritt', `${Math.min(100, Math.round(((o.f || 0) / r.zeit) * 100))} %`]);
  }
  info.zeilen.push(['Leistung', `${def.leistung} MW (noch ohne Stromnetz)`]);
  for (const fn of ZEILEN) {
    const z = fn(o, s);
    if (z) info.zeilen.push(z);
  }
  return info;
}
