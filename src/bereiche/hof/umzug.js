// Bereich „hof": Umzug alter Spielstände von der kleinen Hofkarte (40×30) auf die große (80×64).
// Alte Stände haben kein `s.hof`; neue Spiele legen es in `neuesSpiel` an. Beim Laden eines alten Stands
// wandert alles, was die Spielerin gemacht hat, auf die große Karte: aufgestellte Gegenstände (Truhe,
// Sprenger, Vogelscheuche, Einmachglas, Fischfarm, Ofen …), Beete mit ihren Pflanzen, Wege und Rohre und
// liegengebliebene Funde. Der alte Bewuchs (Bäume, Steine, Unkraut) bleibt zurück; die große Karte wird
// frisch verwildert.
//
// Versatz: Das Gefüge bleibt zusammen. Gesucht wird der Versatz (dx, dy) um das Wohnhaus herum
// (alte Tür → neue Tür), bei dem die meisten Teile auf geeigneten Feldern landen; was trotzdem auf einem
// ungeeigneten Feld läge (Wasser, Gebäude, Klippe, Stall, Beet auf Weg), wird zum nächsten freien Feld
// versetzt, Beete nur auf Ackerboden. Was gar nicht unterkommt, geht in den Rucksack zurück.

import { ITEMS, OBJEKT_TYPEN, BELAG_TYPEN } from '../../daten.js';
import { KARTEN, bodenFlag, B_FARMBAR, istWasser } from '../../karten.js';
import * as L from '../../logik.js';
import { zufall } from '../../zufall.js';
import { verwildern } from './verwildern.js';

const ALT_TUER = [20, 6]; // Haustür der alten 40×30-Karte
const SUCHRADIUS = 24;

/** Gehört das Objekt der Spielerin (aufgestellt) und nicht der Landschaft? */
export function istAufgestellt(o) {
  if (!o || typeof o.t !== 'string') return false;
  const typ = OBJEKT_TYPEN[o.t];
  return !!ITEMS[typ?.item ?? o.t]?.aufstellbar;
}

/** Alter Stand? Ohne `s.hof`, aber mit besuchtem Hof. */
export const istAlterStand = (s) => !s.hof && !!s.welt?.hof;

/**
 * Sammelt, was umziehen soll: [{ art: 'objekt'|'feld'|'belag'|'fund', x, y, wert }].
 */
function einsammeln(alt) {
  const teile = [];
  for (const [kk, o] of Object.entries(alt.objekte || {})) {
    if (istAufgestellt(o)) { const [x, y] = L.ausK(kk); teile.push({ art: 'objekt', x, y, wert: o }); }
  }
  for (const [kk, f] of Object.entries(alt.felder || {})) { const [x, y] = L.ausK(kk); teile.push({ art: 'feld', x, y, wert: f }); }
  for (const [kk, b] of Object.entries(alt.belag || {})) { const [x, y] = L.ausK(kk); teile.push({ art: 'belag', x, y, wert: b }); }
  for (const fund of alt.funde || []) teile.push({ art: 'fund', x: fund.x, y: fund.y, wert: fund });
  return teile;
}

const KREUZ = [[0, -1], [-1, 0], [1, 0], [0, 1]];
const amUfer = (def, x, y) => KREUZ.some(([dx, dy]) => istWasser(def, x + dx, y + dy));

/** Darf das Teil auf dieses Feld der neuen Karte? */
function passt(s, ort, teil, x, y, belegt) {
  const { def } = ort;
  if (x < 1 || y < 1 || x >= def.w - 1 || y >= def.h - 1) return false;
  if (belegt.has(L.k(x, y))) return false;
  if (!L.feldFrei(s, ort, x, y)) return false;
  if (teil.art === 'feld') return !!bodenFlag(def, x, y, B_FARMBAR);
  if (teil.art === 'objekt' && teil.wert.t === 'fischfarm') return amUfer(def, x, y); // Platzregel der Fischfarm
  return true;
}

/** Nächstes passendes Feld in wachsendem Abstand um (x, y); null, wenn keines frei ist. */
function naechstes(s, ort, teil, x0, y0, belegt) {
  for (let r = 0; r <= SUCHRADIUS; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (passt(s, ort, teil, x0 + dx, y0 + dy, belegt)) return [x0 + dx, y0 + dy];
      }
    }
  }
  return null;
}

/** Bester Versatz: wo landen die meisten Teile unmittelbar auf passenden Feldern? */
function besterVersatz(s, ort, teile, neueTuer) {
  const mx = neueTuer[0] - ALT_TUER[0];
  const my = neueTuer[1] - ALT_TUER[1];
  let beste = { dx: mx, dy: my, punkte: -1, abstand: Infinity };
  const leer = new Set();
  for (let dy = my - 12; dy <= my + 12; dy++) {
    for (let dx = mx - 14; dx <= mx + 14; dx++) {
      let punkte = 0;
      for (const t of teile) if (t.art !== 'fund' && passt(s, ort, t, t.x + dx, t.y + dy, leer)) punkte++;
      const abstand = Math.abs(dx - mx) + Math.abs(dy - my);
      if (punkte > beste.punkte || (punkte === beste.punkte && abstand < beste.abstand)) beste = { dx, dy, punkte, abstand };
    }
  }
  return beste;
}

/**
 * Zieht einen alten Stand auf die große Hofkarte um. Gibt { versetzt, verloren, bewegt } zurück.
 * `s.hof` wird dabei angelegt (kartenV: 2), damit es nur einmal geschieht.
 */
export function kartenUmzug(s) {
  const alt = s.welt.hof;
  const teile = einsammeln(alt);
  const def = KARTEN.hof;
  const neu = { objekte: {}, felder: {}, funde: [], belag: {} };
  s.welt.hof = neu;
  const ort = { def, welt: neu };
  s.hof = { uebernommen: {}, kartenV: 2 };

  const bericht = { versetzt: 0, verloren: 0, bewegt: teile.length };
  if (teile.length) {
    const tuer = def.gebaeude.find((g) => g.typ === 'haus')?.tuer;
    const { dx, dy } = besterVersatz(s, ort, teile, tuer ? [tuer.x, tuer.y] : [40, 16]);
    const belegt = new Set();
    // Felder zuerst (ihr Ackerboden ist knapp), dann Belag, Objekte, Funde.
    const reihe = { feld: 0, belag: 1, objekt: 2, fund: 3 };
    for (const t of [...teile].sort((a, b) => reihe[a.art] - reihe[b.art])) {
      let ziel = [t.x + dx, t.y + dy];
      if (!passt(s, ort, t, ziel[0], ziel[1], belegt)) {
        bericht.versetzt++;
        ziel = naechstes(s, ort, t, ziel[0], ziel[1], belegt);
      }
      if (!ziel) {
        bericht.verloren++;
        zurueckgeben(s, t);
        continue;
      }
      const kk = L.k(ziel[0], ziel[1]);
      belegt.add(kk);
      if (t.art === 'feld') neu.felder[kk] = t.wert;
      else if (t.art === 'belag') neu.belag[kk] = t.wert;
      else if (t.art === 'objekt') neu.objekte[kk] = t.wert;
      else neu.funde.push({ ...t.wert, x: ziel[0], y: ziel[1] });
    }
    // Landschaft auf der großen Karte, ohne Beete, Wege und Aufgestelltes zu überwuchern
    verwildern(s, zufall((s.seed ^ 0x5eed) >>> 0));
    for (const kk of belegt) {
      if (neu.felder[kk] || neu.belag[kk]) {
        const o = neu.objekte[kk];
        if (o && !istAufgestellt(o)) delete neu.objekte[kk];
      }
    }
  } else {
    verwildern(s, zufall((s.seed ^ 0x5eed) >>> 0));
  }
  L.kartenGeaendert();
  return bericht;
}

/** Was nirgends mehr hinpasst, kommt als Gegenstand in den Rucksack zurück (Beete und Wege verfallen). */
function zurueckgeben(s, t) {
  let id = null;
  if (t.art === 'objekt') id = OBJEKT_TYPEN[t.wert.t]?.item ?? t.wert.t;
  else if (t.art === 'belag') id = BELAG_TYPEN[t.wert.t]?.item ?? null;
  else if (t.art === 'fund' && t.wert.slot) { L.hinzufuegen(s, t.wert.slot); return; }
  if (id && ITEMS[id]) L.hinzufuegen(s, { id, n: 1 });
}

/** Text für den ersten Besuch des Hofs nach dem Umzug. */
export function umzugText(b) {
  if (!b || !b.bewegt) return 'Dein Hof ist gewachsen. Die alte Parzelle ist jetzt mitten im neuen Land.';
  const teile = [`Dein Hof ist gewachsen: ${b.bewegt} Teile (Beete, Wege, Aufgestelltes) sind mit umgezogen.`];
  if (b.versetzt) teile.push(`${b.versetzt} davon standen im Weg und wurden zum nächsten freien Feld versetzt.`);
  if (b.verloren) teile.push(`${b.verloren} fanden keinen Platz und liegen wieder im Rucksack.`);
  return teile.join(' ');
}
