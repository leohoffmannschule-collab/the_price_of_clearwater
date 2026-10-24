// Bereich „handwerk": Holzrohre. Ein Rohr ist ein begehbarer Bodenbelag (belagTyp), den man auf dem Hof
// verlegt. Zusammenhängende Rohre bilden ein Netz. Grenzt ein Netz an eine Versandkiste, schieben die
// Rohre jede Nacht vor dem Verkauf alles Verkäufliche aus den angrenzenden Quellen dorthin:
//   Truhen (nur Verkäufliches, der Rest bleibt liegen), die Eierkiste vor dem Stall, Fischfarmen und
//   den fertigen Teil von Räucheröfen. Das Netz muss die Quelle und die Versandkiste an einer Seite berühren.
// Berührt das Netz auch einen Räucherofen, gehen Fische (Fischfarm, Truhe) zuerst in dessen Eingabe-Fach
// (bis RAEUCHER_PRO_TAG je Ofen); was nicht mehr hineinpasst, läuft roh zur Versandkiste.
// Reihenfolge je Nacht: fertige Ware aus den Öfen zur Kiste, danach Fische in die Öfen, die sie über Nacht
// räuchern. Farm → Ofen → Kiste braucht deshalb zwei Nächte vom Fang bis zum Verkauf.
// Neue Quellen: in QUELLEN eintragen (Objekttyp → nehmen(o, s) gibt Waren zurück und leert die Quelle).

import { ITEMS, item, rezept, belagTyp } from '../../daten.js';
import * as L from '../../logik.js';
import { karteHolen } from '../../karten.js';
import { FISCHFARM_FISCH, vorratVon } from './fischfarm.js';
import { RAEUCHER_PRO_TAG } from './raeucherofen.js';

export const ROHR = 'holzrohr';

belagTyp(ROHR, { name: 'Holzrohr', item: ROHR, tempo: 1 });
item(ROHR, {
  name: 'Holzrohr',
  kat: 'platz',
  bild: { art: 'holzrohr' },
  belag: ROHR,
  text: 'Auf dem Hof verlegen. Ein Netz aus Rohren zwischen einer Kiste und der Versandkiste schickt jede Nacht deren verkaufbare Ware zum Verkauf. Mit der Spitzhacke wieder aufnehmen.',
});
rezept(ROHR, { menge: 2, zutaten: { holz: 1 } });

const KREUZ = [[0, -1], [-1, 0], [1, 0], [0, 1]];

/** Alles Verkäufliche aus einer Liste von Fächern nehmen (Truhe), der Rest bleibt. */
function ausFaechern(faecher) {
  const waren = [];
  for (let i = 0; i < faecher.length; i++) {
    const slot = faecher[i];
    if (!slot || !L.verkaufbar(slot)) continue;
    waren.push(L.slotKopie(slot, slot.n));
    faecher[i] = null;
  }
  return waren;
}

/** Objekttyp → nehmen(o) gibt die Waren zurück und leert die Quelle. */
export const QUELLEN = {
  truhe: (o) => (Array.isArray(o.inv) ? ausFaechern(o.inv) : []),
  fischfarm: (o) => {
    const n = vorratVon(o);
    o.fisch = 0;
    return n > 0 ? [{ id: FISCHFARM_FISCH, n }] : [];
  },
  raeucherofen: (o) => {
    if (!Array.isArray(o.aus)) return [];
    const waren = o.aus.filter((w) => w?.n > 0).map((w) => ({ ...w }));
    o.aus = [];
    return waren;
  },
};

/** Eierkiste (dynamische Deko des Bereichs tiere): der Bestand liegt in s.stall.eier. */
function eierNehmen(s) {
  const e = s.stall?.eier;
  if (!e) return [];
  const waren = [];
  for (const id of ['ei', 'grossesei']) {
    const n = Math.floor(Number(e[id]));
    if (n > 0) waren.push({ id, n });
    e[id] = 0;
  }
  return waren;
}

/** Felder, die ein Deko-Eintrag belegt. */
function* fussabdruck(d) {
  for (let dy = 0; dy < (d.h || 1); dy++) for (let dx = 0; dx < (d.w || 1); dx++) yield L.k(d.x + dx, d.y + dy);
}

/** Fische in die Eingabe-Fächer der Öfen legen (bis RAEUCHER_PRO_TAG je Ofen); gibt zurück, was nicht mehr passte. */
function inOefen(oefen, ware) {
  let rest = ware.n;
  for (const o of oefen) {
    if (!Array.isArray(o.ein)) o.ein = [];
    const belegt = o.ein.reduce((n, x) => n + x.n, 0);
    const n = Math.min(rest, Math.max(0, RAEUCHER_PRO_TAG - belegt));
    if (n <= 0) continue;
    const x = o.ein.find((y) => L.gleich(y, ware));
    if (x) x.n += n; else o.ein.push(L.slotKopie(ware, n));
    rest -= n;
  }
  return rest;
}

/** Zusammenhängende Rohrnetze einer Karte als Mengen von Feldschlüsseln. */
export function netze(belag) {
  const rohre = new Set(Object.keys(belag).filter((kk) => belag[kk]?.t === ROHR));
  const gesehen = new Set();
  const liste = [];
  for (const start of rohre) {
    if (gesehen.has(start)) continue;
    const netz = new Set([start]);
    const offen = [start];
    gesehen.add(start);
    while (offen.length) {
      const [x, y] = L.ausK(offen.pop());
      for (const [dx, dy] of KREUZ) {
        const kk = L.k(x + dx, y + dy);
        if (!rohre.has(kk) || gesehen.has(kk)) continue;
        gesehen.add(kk);
        netz.add(kk);
        offen.push(kk);
      }
    }
    liste.push(netz);
  }
  return liste;
}

/** Felder, die an das Netz grenzen (ohne das Netz selbst). */
function anliegend(netz) {
  const a = new Set();
  for (const kk of netz) {
    const [x, y] = L.ausK(kk);
    for (const [dx, dy] of KREUZ) {
      const nk = L.k(x + dx, y + dy);
      if (!netz.has(nk)) a.add(nk);
    }
  }
  return a;
}

/**
 * Schiebt auf allen Karten die Ware aus Quellen am Rohrnetz in die Versandkiste, an die das Netz grenzt.
 * Gibt die Zahl der bewegten Stücke zurück.
 */
export function rohreFliessen(s) {
  let stuecke = 0;
  for (const [id, w] of Object.entries(s.welt)) {
    if (!w.belag) continue;
    const def = karteHolen(id, s);
    if (!def) continue;
    const alleNetze = netze(w.belag);
    if (!alleNetze.length) continue;
    const deko = L.dekoListe(s, def);
    const senken = deko.filter((d) => d.typ === 'versandkiste');
    for (const netz of alleNetze) {
      const rand = anliegend(netz);
      const oefen = [];
      for (const [kk, o] of Object.entries(w.objekte)) if (rand.has(kk) && o.t === 'raeucherofen') oefen.push(o);
      // Stufe 1, auch ohne Versandkiste im Netz: Fischfarmen füllen angrenzende Öfen (Farm → Rohr → Ofen).
      // Was nicht mehr hineinpasst, bleibt in der Farm.
      if (oefen.length) {
        for (const [kk, o] of Object.entries(w.objekte)) {
          if (!rand.has(kk) || o.t !== 'fischfarm') continue;
          const vorrat = vorratVon(o);
          if (vorrat > 0) o.fisch = inOefen(oefen, { id: FISCHFARM_FISCH, n: vorrat });
        }
      }
      // Stufe 2: Netze an einer Versandkiste schieben alles Verkäufliche dorthin (Ofen → Rohr → Kiste).
      if (!senken.some((d) => [...fussabdruck(d)].some((kk) => rand.has(kk)))) continue;
      const waren = [];
      for (const [kk, o] of Object.entries(w.objekte)) {
        if (rand.has(kk) && QUELLEN[o.t]) waren.push(...QUELLEN[o.t](o, s));
      }
      for (const d of deko) {
        if (d.typ === 'eierkiste' && [...fussabdruck(d)].some((kk) => rand.has(kk))) waren.push(...eierNehmen(s));
      }
      if (oefen.length) {
        // frische Fische in die Öfen (fertige Ware aus den Öfen steht schon in waren, ihre Eingabe bleibt)
        for (let i = waren.length - 1; i >= 0; i--) {
          if (ITEMS[waren[i].id]?.kat !== 'fisch') continue;
          const rest = inOefen(oefen, waren[i]);
          if (rest <= 0) waren.splice(i, 1);
          else waren[i] = { ...waren[i], n: rest };
        }
      }
      for (const ware of waren) {
        if (!ware || !(ware.n > 0)) continue;
        L.versandHinzu(s, ware);
        stuecke += ware.n;
      }
    }
  }
  if (stuecke > 0) L.kartenGeaendert();
  return stuecke;
}

import { system } from '../../system.js';
system({
  name: 'handwerk-rohre',
  vorVerkauf(s, bericht) {
    const n = rohreFliessen(s);
    if (n > 0) bericht?.meldungen.push(`Die Rohre haben ${n.toLocaleString('de-DE')} Stück zur Versandkiste befördert.`);
  },
});
