// Bereich „handwerk" – Fabrik Stufe 3: das Objekt Maschinenbauer (Werkbank, Fenster „Maschinenbau"), das Wasser des Mischers
// (kommt aus angrenzenden Rohrleitungen, im selben Fabrik-Schritt wie Strom und Bänder) und die Info-Zeilen der Maschinen
// („Was braucht dieses Rezept?" mit Mengen pro Minute, Wasseranschluss des Mischers).
//
// Mischer und Fertiger selbst sind gewöhnliche Maschinen (fabrik-teile-daten.js, registriert in fabrik-objekte.js); hier
// kommen nur ihre Besonderheiten dazu: `wasseranschluss` (Rohre zeichnen den Anschluss), Stromanschlüsse des Fertigers.

import { objektTyp, OBJEKT_TYPEN } from '../../daten.js';
import * as L from '../../logik.js';
import { ton, fenster } from '../../spiel.js';
import { MASCHINEN } from './fabrik-daten.js';
import { MISCHER } from './fabrik-teile-daten.js';
import { BAU } from './fabrik-bau-daten.js';
import { fabrikSchrittVorher, fabrikAenderung, zutatenGrenze } from './fabrik-sim.js';
import { fabrikInfoZeile } from './fabrik-info.js';
import { platzPruefen, blickR, BAU_TYPEN, fabrikAufheben } from './fabrik-objekte.js';
import { STROM } from './fabrik-strom-daten.js';
import { rohrNetze, ROHR_T } from './fabrik-rohre.js';
import { findeObjekt } from './fabrik-strom-objekte.js';
import { rezeptRaten } from './fabrik-bau.js';

// ─── Maschinenbauer ─────────────────────────────────────────────────────────────────────────────

objektTyp('maschinenbauer', {
  blockiert: true,
  flaeche: BAU.flaeche,
  axt: fabrikAufheben,
  spitzhacke: fabrikAufheben,
  platz: (c) => platzPruefen(c, BAU.flaeche[0], BAU.flaeche[1], false),
  anlegen(o) { o.r = blickR(); fabrikAenderung(); },
  interagieren({ o, x, y }) { ton('menue'); fenster('handwerk_maschinenbau', { o, x, y }); },
  hinweis: 'Maschinenbau öffnen',
});
BAU_TYPEN.add('maschinenbauer');

// ─── Mischer und Fertiger: Besonderheiten ───────────────────────────────────────────────────────

if (OBJEKT_TYPEN.mischer) OBJEKT_TYPEN.mischer.wasseranschluss = true; // Rohrleitungen zeichnen ihr Anschlussstück
STROM.anschluesse.fertiger = 2; // wie der Assembler: zwei Kabelanschlüsse

const KREUZ_RAND = (x, y, b, h) => {
  const liste = [];
  for (let i = 0; i < b; i++) { liste.push([x + i, y - 1], [x + i, y + h]); }
  for (let j = 0; j < h; j++) { liste.push([x - 1, y + j], [x + b, y + j]); }
  return liste;
};

/** Rohrnetze, an die der Mischer bei (x, y) grenzt (Rohrleitung an einer beliebigen Seite). */
export function mischerNetze(s, ort, x, y) {
  const c = rohrNetze(s, ort);
  const [b, h] = MASCHINEN.mischer.flaeche;
  const netze = [];
  for (const [px, py] of KREUZ_RAND(x, y, b, h)) {
    const o = ort.welt.objekte[L.k(px, py)];
    if (o?.t !== ROHR_T) continue;
    const netz = c.netzVon.get(L.k(px, py));
    if (netz && !netze.includes(netz)) netze.push(netz);
  }
  return netze;
}

const zahl = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);

/**
 * Wasser für einen Mischer aus den angrenzenden Rohrnetzen holen (höchstens MISCHER.rate · dt, höchstens bis der Tank voll
 * ist) und ganze m³ als „Zutat" Wasser in den Eingang legen. Gibt die geholte Menge (m³) zurück.
 */
export function mischerWasser(s, ort, n, dt) {
  const o = n.o;
  if (!(dt > 0)) return 0;
  const netze = mischerNetze(s, ort, n.x, n.y);
  let geholt = 0;
  if (netze.length) {
    let want = Math.min(Math.max(0, MISCHER.tank - zahl(o.wt)), (MISCHER.rate / 60) * dt);
    for (const netz of netze) {
      if (want <= 1e-12) break;
      const inhalt = netz.rohre.reduce((sum, r) => sum + zahl(r.o.fl), 0);
      const nimm = Math.min(want, inhalt);
      if (nimm <= 0) continue;
      const je = nimm / netz.rohre.length;
      for (const r of netz.rohre) r.o.fl = Math.max(0, zahl(r.o.fl) - je);
      o.wt = zahl(o.wt) + nimm;
      want -= nimm;
      geholt += nimm;
    }
  }
  // ganze m³ in den Eingang (bis zur Grenze des gewählten Rezepts)
  const grenze = zutatenGrenze(o, 'wasser');
  const ein = (o.ein ??= {});
  while (zahl(o.wt) >= 1 - 1e-9 && (ein.wasser || 0) < grenze) {
    o.wt = Math.max(0, o.wt - 1);
    ein.wasser = (ein.wasser || 0) + 1;
  }
  return geholt;
}

fabrikSchrittVorher((s, ort, dt, c) => {
  if (!c) return;
  for (const n of c.maschinen) if (n.t === 'mischer') mischerWasser(s, ort, n, dt);
});

// ─── Info-Zeilen ────────────────────────────────────────────────────────────────────────────────

const mengeText = (liste) => liste.map((e) => `${e.proMin.toLocaleString('de-DE')}× ${e.name}`).join(' + ');

/** „Was braucht dieses Rezept?" – Mengen pro Minute bei vollem Takt (Schmelzer: alle Rezepte, sonst das gewählte). */
export function rezeptZeilen(o) {
  const def = MASCHINEN[o.t];
  if (!def?.rezepte || def.generator) return [];
  const ids = def.waehlbar ? [o.rez ?? def.standard] : Object.keys(def.rezepte);
  return ids.filter((id) => def.rezepte[id]).map((id) => {
    const r = def.rezepte[id];
    const a = rezeptRaten(o.t, r);
    return `${def.waehlbar ? '' : `${r.name}: `}${mengeText(a.ein)} → ${mengeText(a.aus)} pro Minute`;
  });
}

fabrikInfoZeile((o) => {
  const z = rezeptZeilen(o);
  return z.length ? ['Was braucht dieses Rezept?', z.join('\n')] : null;
});

fabrikInfoZeile((o, s) => {
  if (o.t !== 'mischer') return null;
  const wo = s ? findeObjekt(s, o) : null;
  const imTank = Math.round(zahl(o.wt) * 10) / 10;
  if (!wo) return ['Wasser', `${imTank} m³ im Tank`];
  const [x, y] = L.ausK(wo.kk);
  const netze = mischerNetze(s, wo.ort, x, y);
  if (!netze.length) return ['Wasser', 'kein Rohr angeschlossen – eine Rohrleitung an eine Seite legen'];
  const inhalt = netze.reduce((sum, nz) => sum + nz.rohre.reduce((a, r) => a + zahl(r.o.fl), 0), 0);
  return ['Wasser', `Rohr angeschlossen (${Math.round(inhalt * 10) / 10} m³ im Netz), ${imTank} m³ im Tank, bis ${MISCHER.rate} m³/min`];
});

