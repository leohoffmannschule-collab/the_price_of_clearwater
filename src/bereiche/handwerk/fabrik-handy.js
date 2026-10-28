// Bereich „handwerk" – Fabrik Stufe 2: das Handy. Bestellen jederzeit und überall (auch nachts, in der Mine), bezahlt
// wird in Gold, geliefert sofort in den Rucksack. Passt nicht alles hinein (oder reicht das Gold nicht), wird nur
// geliefert und bezahlt, was geht. Dazu das Paketfach (Starterpaket, Handy für alte Stände), das abholt, was passt.
// DOM-frei; die Oberfläche steht in fabrik-handy-fenster.js.
//
//   s.fabrik.paket = [{ id, n }…]   wartende Lieferungen
//   s.fabrik.handy = 1              das Handy wurde ausgegeben (einmal je Spielstand)
//   s.fabrik.lieferungen = n        wartende Lieferungen (Abzeichen der App Paketfach)

import { ITEMS, STAPEL_MAX } from '../../daten.js';
import * as L from '../../logik.js';
import { HANDY_PREISE, HANDY_GRUPPEN, VORKOMMEN_SORTEN, VORKOMMEN_REINHEIT, vorkommenPreis, vorkommenItem } from './fabrik-strom-daten.js';
import { REINHEIT, SORTEN } from './fabrik-daten.js';

/** Gold lesbar: ab einer Million in Mio. */
export function goldText(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio. g`;
  return `${Math.round(n).toLocaleString('de-DE')} g`;
}

/** Preis eines Gegenstands im Handy (Fabrikbedarf oder Vorkommen), sonst null. */
export function handyPreis(id) {
  if (HANDY_PREISE[id] != null) return HANDY_PREISE[id];
  const it = ITEMS[id];
  if (it?.aufstellbar === 'vorkommen' && SORTEN[it.erz]) {
    const rn = Object.entries(REINHEIT).find(([, f]) => f === it.rein)?.[0];
    return rn ? vorkommenPreis(rn) : null;
  }
  return null;
}

/** Katalog „Fabrikbedarf": Gruppen mit Einträgen { id, name, preis, text } (nur Gegenstände, die es gibt). */
export function handyKatalog() {
  return HANDY_GRUPPEN.map((g) => ({
    id: g.id,
    name: g.name,
    eintraege: g.ids.filter((id) => ITEMS[id]).map((id) => ({ id, name: ITEMS[id].name, preis: HANDY_PREISE[id], text: ITEMS[id].text })),
  }));
}

/** Vorkommen zum Kaufen: Sorten, Reinheiten (mit Preis) und der Gegenstand zur Wahl. */
export function vorkommenAngebot(sorte, rein) {
  return {
    sorten: VORKOMMEN_SORTEN.map((id) => ({ id, name: SORTEN[id].name, farbe: SORTEN[id].farbe })),
    reinheiten: VORKOMMEN_REINHEIT.map((id) => ({ id, name: id, faktor: REINHEIT[id], preis: vorkommenPreis(id) })),
    item: SORTEN[sorte] && REINHEIT[rein] ? vorkommenItem(sorte, REINHEIT[rein]) : null,
  };
}

/** Platz im Rucksack für id (Stück). */
const platz = (s, id) => L.platzFuer(s, { id, n: 1 });

/** Wie viele Stück gingen höchstens (Gold und Rucksack)? */
export function hoechstens(s, id) {
  const preis = handyPreis(id);
  if (!preis || !ITEMS[id]) return 0;
  return Math.max(0, Math.min(Math.floor(s.spieler.gold / preis), platz(s, id), ITEMS[id].stapel === false ? 1 : 99 * STAPEL_MAX));
}

/**
 * n Stück bestellen. Geliefert wird, was Gold und Rucksack hergeben (höchstens n); bezahlt nur das Gelieferte.
 * Ergebnis { ok, geliefert, bezahlt, items, text } oder { grund }.
 */
export function handyKaufen(s, id, n = 1) {
  const preis = handyPreis(id);
  const it = ITEMS[id];
  const erg = L.neuesErgebnis();
  n = Math.floor(Number(n));
  if (!preis || !it) { erg.grund = 'Das gibt es im Handy nicht.'; return erg; }
  if (!(n >= 1)) { erg.grund = 'Wie viele?'; return erg; }
  const leistbar = Math.floor(s.spieler.gold / preis);
  if (leistbar < 1) { erg.grund = `Zu wenig Gold: ${it.name} kostet ${goldText(preis)}.`; return erg; }
  const m = Math.min(n, leistbar, platz(s, id));
  if (m < 1) { erg.grund = 'Dein Rucksack ist voll – nichts geliefert, nichts bezahlt.'; return erg; }
  const rest = L.hinzufuegen(s, { id, n: m });
  const geliefert = m - rest;
  const bezahlt = geliefert * preis;
  s.spieler.gold -= bezahlt;
  erg.ok = geliefert > 0;
  erg.geliefert = geliefert;
  erg.bezahlt = bezahlt;
  erg.items.push({ id, n: geliefert });
  const warum = geliefert < n ? (geliefert === leistbar && leistbar < n ? ' – mehr Gold war nicht da' : ' – mehr passte nicht in den Rucksack') : '';
  erg.text = `${geliefert < n ? `${geliefert} von ${n}` : geliefert}× ${it.name} geliefert${warum}. Bezahlt: ${goldText(bezahlt)}.`;
  return erg;
}

/** Ein Vorkommen bestellen (Sorte: kupfer, eisen, kohle, stein, gold; Reinheit: unrein, normal, rein). */
export function vorkommenKaufen(s, sorte, rein, n = 1) {
  if (!SORTEN[sorte] || !REINHEIT[rein]) { const erg = L.neuesErgebnis(); erg.grund = 'Dieses Vorkommen gibt es nicht.'; return erg; }
  return handyKaufen(s, vorkommenItem(sorte, REINHEIT[rein]), n);
}

// ─── Paketfach ──────────────────────────────────────────────────────────────

export function paketListe(s) {
  const f = s.fabrik ?? (s.fabrik = {});
  if (!Array.isArray(f.paket)) f.paket = [];
  f.paket = f.paket.filter((p) => p && ITEMS[p.id] && p.n > 0).map((p) => ({ id: p.id, n: Math.floor(p.n) }));
  return f.paket;
}

/** Waren ins Paketfach legen. */
export function paketDazu(s, liste) {
  const p = paketListe(s);
  for (const w of liste) {
    if (!ITEMS[w.id] || !(w.n > 0)) continue;
    const da = p.find((x) => x.id === w.id);
    if (da) da.n += w.n; else p.push({ id: w.id, n: w.n });
  }
  s.fabrik.lieferungen = (s.fabrik.lieferungen | 0) + 1; // für das Abzeichen: Lieferungen, nicht Stücke
}

/** Alles aus dem Paketfach in den Rucksack, was passt; der Rest bleibt. */
export function paketAbholen(s) {
  const p = paketListe(s);
  const erg = L.neuesErgebnis();
  if (!p.length) { erg.grund = 'Das Paketfach ist leer.'; return erg; }
  for (const w of p) {
    const rest = L.hinzufuegen(s, { id: w.id, n: w.n });
    if (w.n - rest > 0) erg.items.push({ id: w.id, n: w.n - rest });
    w.n = rest;
  }
  s.fabrik.paket = p.filter((w) => w.n > 0);
  if (!s.fabrik.paket.length) s.fabrik.lieferungen = 0;
  erg.ok = erg.items.length > 0;
  if (!erg.ok) erg.grund = 'Dein Rucksack ist voll.';
  else if (s.fabrik.paket.length) erg.text = 'Ein Teil liegt noch im Paketfach – der Rucksack ist voll.';
  else erg.text = 'Paket abgeholt.';
  return erg;
}
