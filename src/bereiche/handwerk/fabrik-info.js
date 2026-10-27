// Bereich „handwerk" – Fabrik: was das Info-Fenster einer Maschine zeigt (DOM-frei, damit Tests es lesen).
// Erweiterbar: `fabrikInfoZeile(fn)` hängt eine Zeile an (fn(o, s) → [Bezeichnung, Wert] oder null), z. B. „Strom: …".

import { ITEMS } from '../../daten.js';
import { FABRIK, MASCHINEN, RICHTUNGEN, SORTEN, reinName } from './fabrik-daten.js';

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

/** Durchsatz pro Minute: letzter Messwert, sonst die laufende Schätzung. */
export function durchsatzVon(o) {
  if (o.dr != null) return o.dr;
  return o.zt > 1 ? Math.round(((o.zn || 0) / o.zt) * 600) / 10 : 0;
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
