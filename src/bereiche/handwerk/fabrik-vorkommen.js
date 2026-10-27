// Bereich „handwerk" – Fabrik: Rohstoff-Vorkommen anlegen. Beim neuen Spiel (Hook neuesSpiel) und beim Laden
// eines älteren Stands ohne Fabrik (Hook ergaenzen/tagEnde) entstehen sie an benannten Orten, ohne die Kartendateien
// anderer Bereiche anzufassen: im Steinbruch am Berg (auch vor der Reparatur der Brücke), auf der Anhöhe des Hofs und
// am Rand von Wald und Strand. Jedes Vorkommen ist ein 2×2-Objekt `{ t: 'vorkommen', erz, rein }` (rein = 0,5 / 1 / 2).
//
// Regeln: nur Felder ohne Weg (Erdweg, Pflaster, Steg …), mindestens 2 Felder von jedem benannten Punkt, Abstand zu
// jedem Warp und jeder Gebäudekante, und der Ring um das Vorkommen bleibt begehbar. Fehlen höchstens 2 von 12 Ringfeldern,
// prüft eine Wegsuche, dass alle bisher erreichbaren benannten Punkte erreichbar bleiben. Im Steinbruch weichen Steine,
// Felsen und Erzbrocken (sie wachsen nach). Zufall nur seedbar (zufall.js).

import { belagTyp } from '../../daten.js';
import * as L from '../../logik.js';
import { karteHolen, punkt, bereichVon } from '../../karten.js';
import { zufall } from '../../zufall.js';

/**
 * Wo welche Vorkommen entstehen: [Sorte, Reinheit]. rMin/rMax = Abstand vom Punkt in Feldern; `ersatz` = größerer Radius,
 * falls nahe am Punkt kein Platz ist (der Hof ist dicht bewachsen). `raeumen`: Steine, Äste und Unkraut weichen.
 */
export const ANLAGE = [
  { karte: 'berg', bereich: 'steinbruch', raeumen: true, liste: [['eisen', 1], ['eisen', 2], ['kupfer', 1], ['kupfer', 0.5], ['kohle', 1], ['stein', 1], ['stein', 1], ['gold', 1]] },
  { karte: 'hof', punkt: 'anhoehe', raeumen: true, rMin: 3, rMax: 14, ersatz: 40, liste: [['kupfer', 1], ['stein', 1], ['eisen', 0.5]] },
  { karte: 'wald', punkt: 'lichtung', rMin: 4, rMax: 14, ersatz: 30, liste: [['kohle', 1]] },
  { karte: 'wald', punkt: 'fluss1', rMin: 4, rMax: 14, ersatz: 30, liste: [['kupfer', 0.5]] },
  { karte: 'strand', punkt: 'strand1', rMin: 4, rMax: 14, ersatz: 30, liste: [['stein', 1]] },
  { karte: 'strand', punkt: 'strand2', rMin: 4, rMax: 14, ersatz: 30, liste: [['eisen', 0.5]] },
];

const WEG = ':=hT_tm';
const SPERR_BEREICHE = ['bauland', 'stall', 'auslauf', 'fest'];
const WEICH = new Set(['stein', 'fels', 'mstein', 'ast', 'unkraut']); // weicht, wo `raeumen` gilt (Steinbruch, Anhöhe)

const ueberlappt = (a, b, rand = 0) => a.x < b.x + b.w + rand && a.x + a.w > b.x - rand && a.y < b.y + b.h + rand && a.y + a.h > b.y - rand;
const LEER = { objekte: {}, felder: {}, belag: {} };

function mischen(r, liste) {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }
  return liste;
}

/** Wie viele benannte Punkte erreicht man vom ersten begehbaren Punkt aus? (Wegsuche über begehbare Felder) */
export function erreichbarePunkte(s, ort) {
  const { def, welt } = ort;
  const punkte = Object.values(def.punkte);
  const geht = L.begehbarPruefer(s, def, welt);
  const start = punkte.find((p) => geht(p[0], p[1]));
  if (!start) return 0;
  const W = def.w;
  const gesehen = new Uint8Array(W * def.h);
  const stapel = [start[1] * W + start[0]];
  gesehen[stapel[0]] = 1;
  while (stapel.length) {
    const i = stapel.pop();
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= def.h) continue;
      const j = ny * W + nx;
      if (gesehen[j] || !geht(nx, ny)) continue;
      gesehen[j] = 1;
      stapel.push(j);
    }
  }
  return punkte.filter((p) => gesehen[p[1] * W + p[0]]).length;
}

/** Passt ein 2×2-Vorkommen mit der Ecke oben links bei (x, y)? `raeumen`: Steine/Erzbrocken dürfen weichen. */
export function vorkommenPasst(s, ort, x, y, sperren = [], raeumen = false) {
  const { def, welt } = ort;
  const block = { x, y, w: 2, h: 2 };
  const weich = (dx, dy) => raeumen && WEICH.has(welt.objekte[L.k(x + dx, y + dy)]?.t) && L.begehbar(s, def, LEER, x + dx, y + dy);
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      if (!L.feldFrei(s, ort, x + dx, y + dy) && !weich(dx, dy)) return false;
      if (WEG.includes(def.grid[y + dy][x + dx])) return false;
    }
  }
  let fehlt = 0;
  for (let dy = -1; dy <= 2; dy++) {
    for (let dx = -1; dx <= 2; dx++) {
      if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1) continue;
      if (L.tuerAn(s, def, x + dx, y + dy)) return false;
      if (L.begehbar(s, def, welt, x + dx, y + dy) || weich(dx, dy)) continue;
      fehlt++;
    }
  }
  if (fehlt > (raeumen ? 4 : 2)) return false;
  // keine Deko darunter oder direkt daneben (Muscheln, Dünengras, Loren …)
  for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) if (L.dekoAn(s, def, x + dx, y + dy)) return false;
  for (const p of Object.values(def.punkte)) if (ueberlappt(block, { x: p[0], y: p[1], w: 1, h: 1 }, 2)) return false;
  for (const w of def.warps) if (ueberlappt(block, w, 3)) return false;
  for (const g of L.gebaeudeListe(s, def)) if (ueberlappt(block, g, 2)) return false;
  for (const b of sperren) if (ueberlappt(block, b, 1)) return false;
  return true;
}

function kandidaten(s, ort, a, r, rMax = a.rMax) {
  const { def } = ort;
  if (a.bereich) {
    const b = bereichVon(a.karte, a.bereich, s);
    const liste = [];
    if (b) for (let y = b.y; y < b.y + b.h - 1; y++) for (let x = b.x; x < b.x + b.w - 1; x++) liste.push([x, y]);
    return mischen(r, liste);
  }
  const p = punkt(a.karte, a.punkt, s);
  if (!p) return [];
  // nach Abstand gestaffelt (Stufen zu 4 Feldern): erst nah am Punkt, innerhalb einer Stufe gemischt
  const stufen = [];
  for (let y = p.y - rMax; y <= p.y + rMax; y++) {
    for (let x = p.x - rMax; x <= p.x + rMax; x++) {
      const d = Math.max(Math.abs(x + 0.5 - p.x), Math.abs(y + 0.5 - p.y));
      if (d >= a.rMin && d <= rMax && x >= 1 && y >= 1 && x < def.w - 2 && y < def.h - 2) (stufen[Math.floor(d / 4)] ??= []).push([x, y]);
    }
  }
  return stufen.filter(Boolean).flatMap((st) => mischen(r, st));
}

/** Setzt ein Vorkommen; weichende Steine werden entfernt. */
function setzen(ort, x, y, v) {
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) delete ort.welt.objekte[L.k(x + dx, y + dy)];
  L.objektSetzen(ort, x, y, v);
}

/** Belag „Abraum": hält eine Seite eines Vorkommens im Steinbruch frei (der Berg füllt nur freie Felder nach). */
export const ABRAUM = 'handwerk_abraum';
belagTyp(ABRAUM, { name: 'Abraum', item: null, tempo: 1 });

/**
 * Eine Seite des Vorkommens zugänglich halten: liegt dort schon ein Weg, genügt das; sonst bekommen die zwei Felder
 * (unten, links, rechts oder oben, das erste, das geht) Abraum, und Steine darauf weichen.
 */
function schuerze(s, ort, x, y) {
  const { def, welt } = ort;
  const seiten = [[[x, y + 2], [x + 1, y + 2]], [[x - 1, y], [x - 1, y + 1]], [[x + 2, y], [x + 2, y + 1]], [[x, y - 1], [x + 1, y - 1]]];
  for (const felder of seiten) {
    const geht = felder.every(([fx, fy]) => L.begehbar(s, def, LEER, fx, fy) && !L.dekoAn(s, def, fx, fy) && !L.warpAn(def, fx, fy)
      && (!welt.objekte[L.k(fx, fy)] || WEICH.has(welt.objekte[L.k(fx, fy)].t)) && !welt.felder[L.k(fx, fy)]);
    if (!geht) continue;
    if (felder.every(([fx, fy]) => WEG.includes(def.grid[fy][fx]))) return;
    for (const [fx, fy] of felder) {
      const kk = L.k(fx, fy);
      delete welt.objekte[kk];
      if (!welt.belag[kk] && !WEG.includes(def.grid[fy][fx])) welt.belag[kk] = { t: ABRAUM };
    }
    return;
  }
}

/**
 * Legt die Vorkommen der ANLAGE an, wo Platz ist. `teil`: 'berg' (Steinbruch, vor dem Auffüllen des Bergs), 'rest'
 * (Hof, Wald, Strand, nachdem sie bewachsen sind) oder 'alle'. Gibt die gelegten zurück ({ karte, x, y, erz, rein }).
 */
export function vorkommenAnlegen(s, teil = 'alle') {
  const gelegt = [];
  for (const a of ANLAGE) {
    if (teil === 'berg' ? a.karte !== 'berg' : teil === 'rest' ? a.karte === 'berg' : false) continue;
    const def = karteHolen(a.karte, s);
    if (!def) continue;
    const r = zufall((s.seed ^ 0x7ef1a5 ^ (a.karte.length * 977 + (a.punkt || a.bereich).length * 31)) >>> 0);
    const ort = L.ortVon(s, a.karte);
    // Bauland, Stall, Auslauf und Festplätze bleiben frei
    const sperren = Object.entries(def.bereiche ?? {}).filter(([n]) => SPERR_BEREICHE.includes(n)).map(([, b]) => ({ x: b[0], y: b[1], w: b[2], h: b[3] }));
    for (const b of def.frei ?? []) sperren.push({ x: b.x, y: b.y, w: b.w, h: b.h }); // freie Plätze des Hofs
    const versuch = (erz, rein, rMax) => {
      for (const [x, y] of kandidaten(s, ort, a, r, rMax)) {
        if (!vorkommenPasst(s, ort, x, y, sperren, !!a.raeumen)) continue;
        const vorher = a.bereich ? 0 : erreichbarePunkte(s, ort);
        const alt = [];
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) alt.push([L.k(x + dx, y + dy), ort.welt.objekte[L.k(x + dx, y + dy)]]);
        setzen(ort, x, y, { t: 'vorkommen', erz, rein });
        L.kartenGeaendert();
        if (!a.bereich && erreichbarePunkte(s, ort) < vorher) {
          // hätte einen Punkt abgeschnitten: zurück
          for (const [kk, o] of alt) { if (o) ort.welt.objekte[kk] = o; else delete ort.welt.objekte[kk]; }
          L.kartenGeaendert();
          continue;
        }
        if (a.bereich) schuerze(s, ort, x, y);
        gelegt.push({ karte: a.karte, x, y, erz, rein });
        return true;
      }
      return false;
    };
    for (const [erz, rein] of a.liste) {
      if (!versuch(erz, rein, a.rMax) && a.ersatz) versuch(erz, rein, a.ersatz);
    }
  }
  if (gelegt.length) L.kartenGeaendert();
  return gelegt;
}
