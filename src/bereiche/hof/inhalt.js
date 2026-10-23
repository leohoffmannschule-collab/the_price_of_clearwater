// Bereich „hof": die große Hofkarte (karte-hof.js), das Wohnhaus in drei Ausbaustufen und das
// Gewächshaus (innen.js), Verwildern und Nachwachsen (verwildern.js), Bett, Fernseher (mit Sendern anderer
// Bereiche über den Hook `fernsehen`), Versandkiste, Briefkasten, der Kühlschrank in der Küche.
// Der Herd in der Küche hat die Aktion „kochen" (Bereich handwerk). Den Ausbau des Hauses verkauft „tiere"
// und setzt `s.haus.stufe`; hier hängen Haustür, Innenraum und der Ort zum Aufwachen daran.
//
// Zustand: `s.hof = { uebernommen }` merkt sich, welche Hausstufen schon Möbel und Aufgestelltes der
// kleineren Stufe bekommen haben. `s.flags.gewaechshaus` liest dieser Bereich (und setzt sie vorerst selbst).

import { TIPPS, bedingung, objektTyp, brief } from '../../daten.js';
import { KARTEN, punkt } from '../../karten.js';
import { system, sammle } from '../../system.js';
import * as L from '../../logik.js';
import { S, dekoAktion, frage, fenster, dialog, ton, schlafen, postZeigen } from '../../spiel.js';
import './karte-hof.js';
import { HAUS_KARTEN, KUEHLSCHRANK, STUFE2_VERSATZ } from './innen.js';
import { verwildern, nachwachsen } from './verwildern.js';

// ─── Ausbaustufen und Gewächshaus ───────────────────────────────────────────

const stufe = (s) => Math.max(0, Math.min(2, s.haus?.stufe ?? 0));
bedingung('hof_haus0', (s) => stufe(s) === 0);
bedingung('hof_haus1', (s) => stufe(s) === 1);
bedingung('hof_haus2', (s) => stufe(s) === 2);
/** Das Gewächshaus ist repariert und offen, sobald die Flagge gesetzt ist. */
bedingung('gewaechshaus', (s) => !!s.flags?.gewaechshaus);

/**
 * Notbehelf bis zur Mühle (Welle 2): das Gewächshaus öffnet am Tag GEWAECHSHAUS_TAG, mit einem Brief davor.
 * Wer die Flagge später anders setzt (Mühlen-Bündel), streicht diese Zeilen.
 */
const GEWAECHSHAUS_TAG = 14;
brief('hof_gewaechshaus', {
  von: 'Oma Liesel', tagNr: GEWAECHSHAUS_TAG,
  text: 'Liebes {name},\n\nhinter dem Haus steht noch mein altes Gewächshaus. Die Scheiben sind blind und die Tür klemmt, aber das Gerüst ist gut. Ich habe ein paar Nachbarn gebeten, es herzurichten, solange du dich einlebst.\n\nIm Glashaus wächst alles, auch im tiefsten Winter. Frag mich nicht, wie. Es hat nur immer funktioniert.\n\nDeine Oma Liesel',
});

// ─── Kühlschrank ────────────────────────────────────────────────────────────

objektTyp('kuehlschrank', {
  blockiert: true,
  interagieren({ o }) { ton('truhe'); fenster('truhe', { truhe: o, titel: 'Kühlschrank', drin: 'Im Kühlschrank' }); },
  hinweis: 'Kühlschrank öffnen',
});

const kuehlschrankNeu = () => ({ t: 'kuehlschrank', inv: Array(24).fill(null) });

/** Legt in haus1 und haus2 je einen Kühlschrank an die feste Stelle (auch für ältere Stände). */
function kuehlschraenke(s) {
  for (const [id, [x, y]] of Object.entries(KUEHLSCHRANK)) {
    const w = L.welt(s, id);
    const kk = L.k(x, y);
    if (w.objekte[kk]?.t !== 'kuehlschrank') w.objekte[kk] = kuehlschrankNeu();
    else if (!Array.isArray(w.objekte[kk].inv)) w.objekte[kk].inv = Array(24).fill(null);
  }
}

/**
 * Ältere Stände stammen von den kleinen Karten: steht die Spielerin auf einem Feld, das es hier nicht mehr
 * begehbar gibt (Baum, Klippe, Wand), stellt sie sich vor die Haustür bzw. an den Eingang.
 */
function sicherStehen(s) {
  const sp = s.spieler;
  const ziel = { hof: 'vorHaus', gewaechshaus: 'eingang', haus: 'eingang', haus1: 'eingang', haus2: 'eingang' }[sp.karte];
  const def = ziel && KARTEN[sp.karte];
  if (!def || L.begehbar(s, def, L.welt(s, sp.karte), sp.x, sp.y)) return;
  const p = punkt(sp.karte, ziel);
  Object.assign(sp, { x: p.x, y: p.y, blick: p.blick ?? 'unten' });
}

// ─── Beim Ausbau mitnehmen ──────────────────────────────────────────────────

/** Von welchen kleineren Stufen eine Karte Aufgestelltes übernimmt: [Karte, Versatz nach unten]. */
const VORGAENGER = { haus1: [['haus', 0]], haus2: [['haus1', STUFE2_VERSATZ], ['haus', STUFE2_VERSATZ]] };

/** Nächstes freies Feld zu (x, y) im selben Haus, in wachsendem Abstand; null, wenn nichts frei ist. */
function freiesFeld(s, ort, x, y) {
  for (let d = 0; d <= 8; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        if (L.feldFrei(s, ort, x + dx, y + dy)) return [x + dx, y + dy];
      }
    }
  }
  return null;
}

/**
 * Beim ersten Betreten einer größeren Hausstufe wandern aufgestellte Truhen, Sprenger und Beläge der
 * kleineren Stufe mit (an dieselbe Stelle, sonst ins nächste freie Feld), der Inhalt der alten
 * Kühlschränke in den neuen. Alles, was nicht mehr hineinpasst, bleibt in der alten Karte liegen.
 */
export function uebertragen(s, nach) {
  const quellen = VORGAENGER[nach];
  if (!quellen || s.hof.uebernommen[nach]) return;
  s.hof.uebernommen[nach] = true;
  const ziel = L.ortVon(s, nach);
  for (const [von, dy] of quellen) {
    const alt = s.welt[von];
    if (!alt) continue;
    for (const [kk, o] of Object.entries(alt.objekte)) {
      if (!o || o.t === 'teil') continue;
      const [x, y] = L.ausK(kk);
      if (o.t === 'kuehlschrank') {
        const neu = ziel.welt.objekte[L.k(...KUEHLSCHRANK[nach])];
        for (const st of o.inv ?? []) {
          if (!st) continue;
          const platz = neu.inv.indexOf(null);
          if (platz < 0) break;
          neu.inv[platz] = st;
        }
        delete alt.objekte[kk];
        continue;
      }
      if (OBJEKT_GROSS(o)) continue;
      const f = freiesFeld(s, ziel, x, y + dy);
      if (!f) continue;
      ziel.welt.objekte[L.k(...f)] = o;
      delete alt.objekte[kk];
    }
    for (const [kk, b] of Object.entries(alt.belag ?? {})) {
      const [x, y] = L.ausK(kk);
      if (!L.feldFrei(s, ziel, x, y + dy)) continue;
      ziel.welt.belag[L.k(x, y + dy)] = b;
      delete alt.belag[kk];
    }
  }
}
/** Große Objekte (Fläche > 1×1) bleiben, wo sie sind. */
const OBJEKT_GROSS = (o) => { const [b, h] = L.flaecheVon(o); return b > 1 || h > 1; };

// ─── System ─────────────────────────────────────────────────────────────────

system({
  name: 'hof',
  ergaenzen(s) {
    s.hof ??= {};
    s.hof.uebernommen ??= {};
    kuehlschraenke(s);
    sicherStehen(s);
  },
  neuesSpiel(s, r) { verwildern(s, r); },
  tagEnde(s, bericht, r) {
    nachwachsen(s, r);
    if (!s.flags.gewaechshaus && L.tagNr(s.zeit) >= GEWAECHSHAUS_TAG) {
      s.flags.gewaechshaus = true;
      bericht.meldungen.push('Das alte Gewächshaus hinter dem Haus ist hergerichtet. Die Tür geht wieder auf!');
    }
  },
  /** Wo man wohnt und aufwacht: das Bett der aktuellen Hausstufe (Stufe 0: Standard, Karte „haus"). */
  zuhause(s) { return stufe(s) > 0 ? { karte: HAUS_KARTEN[stufe(s)], punkt: 'bett' } : undefined; },
  karteBetreten(ort) {
    if (ort.def.id === 'haus1' || ort.def.id === 'haus2') uebertragen(S.s, ort.def.id);
  },
});

// ─── Möbel und Kisten ───────────────────────────────────────────────────────

/** Fernseher: Wetter und Tipp; andere Bereiche hängen eigene Sender an (Hook fernsehen → [[name, fn]…]). */
function fernsehen() {
  const sender = sammle('fernsehen', S.s);
  if (!sender.length) { wetterbericht(); return; }
  frage('Was läuft heute?', [['Wetter und Tipp', wetterbericht], ...sender, ['Ausschalten', null]]);
}

function wetterbericht() {
  const s = S.s;
  const vorhersage = {
    sonne: 'Morgen scheint die Sonne. Gießkanne bereithalten!',
    regen: 'Morgen regnet es. Die Felder gießen sich von selbst.',
    sturm: 'Morgen ziehen Gewitter auf. Bleibt bei Blitzen lieber in der Nähe eines Daches.',
    schnee: 'Morgen schneit es. Warm anziehen!',
  }[s.zeit.morgen];
  const tipp = TIPPS.length ? TIPPS[(L.tagNr(s.zeit) - 1) % TIPPS.length] : '';
  dialog(null, [`Klarwasser-Wetter: ${vorhersage}`, ...(tipp ? [`Tipp des Tages: ${tipp}`] : [])]);
}

dekoAktion('bett', () => frage('Schlafen gehen und den Tag beenden?', [['Schlafen', () => schlafen(false)], ['Noch nicht', null]]), 'Schlafen');
dekoAktion('tv', fernsehen, 'Fernsehen');
dekoAktion('versand', () => { ton('truhe'); fenster('versand'); }, 'Versandkiste');
dekoAktion('post', () => postZeigen(true), 'Briefkasten');
