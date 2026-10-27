// Angeln wie in Minecraft: Schnur auswerfen, warten, bis der Schwimmer abtaucht, im richtigen
// Moment einholen. Kein Minispiel – nur Auswerfen, Geduld und Reaktion.
//
// Ablauf (S.angeln.phase):
//   wurf      die Schnur fliegt in einem Bogen aufs Wasserfeld (0,4 s)
//   warten    der Schwimmer wippt; die Wartezeit ist zufällig (Köder, Angelstufe, Regen verkürzen sie)
//   spur      eine Blasenspur zieht auf den Schwimmer zu (1,2 s) – wer jetzt einholt, ist zu früh
//   biss      der Schwimmer taucht ab; im Fenster von 1,0 s einholen (die ersten 0,35 s: „Perfekt")
//   einholen  kurze Einhol-Animation, der Fang fliegt zur Figur
//   fang      der Fang über dem Kopf; „Benutzen" wirft gleich wieder aus
// Laufen, ein anderes Werkzeug oder ein geöffnetes Fenster holt die Schnur ein, ohne Fang.
//
// Welche Fische wo beißen, steht im Register (daten.js: fisch); Köder sind Items mit `koeder`,
// Ruten Items mit `rute` (beide nur Zahlen, siehe ANGELN und wurfWerte). Dieses Modul gehört
// (wie mine.js) dem Bereich „angeln": Der Kern ruft es nicht auf. Der Bereich startet das Angeln
// (auswerfen) und lässt es über den Hook `eingabe` laufen (angelnUpdate).

import { T, ITEMS, FISCHE, MUELL, erwartet } from './daten.js';
import { istWasser, wasserArt } from './karten.js';
import { mod } from './system.js';
import * as L from './logik.js';
import { waehle, ganz } from './zufall.js';

/** Die Zahlen des Angelns an einer Stelle; Ruten und Köder verschieben sie nur (siehe wurfWerte). */
export const ANGELN = {
  reichweite: 6, // Felder
  wurf: 0.4, // s: Flug der Schnur
  warten: [5, 22], // s: Grundwert der Wartezeit, vor Köder, Angelstufe und Regen
  stufeAbzug: 0.04, // je Angelstufe kürzere Wartezeit
  regen: 0.8, // Faktor auf die Wartezeit bei Regen
  spur: 1.2, // s: Blasenspur bis zum Biss
  fenster: 1.0, // s: Zeit zum Einholen nach dem Biss
  perfekt: 0.35, // s: wer so schnell einholt, bekommt den Perfekt-Bonus
  einholen: 0.5, // s: Einhol-Animation mit Fang
  leer: 0.3, // s: Einholen ohne Fang
  fangZeit: 0.7, // s: der Fang über dem Kopf, bevor die Figur die Angel senkt
  schatz: { grund: 0.03, jeStufe: 0.004 }, // Chance auf eine Schatzkiste
  muell: { grund: 0.10, jeStufe: -0.005, min: 0.05 }, // Chance auf Müll statt Fisch
  legendaer: 4, // Gewicht eines legendären Fisches in der Fischwahl (ein gewöhnlicher: 110 − Seltenheit)
};

/** Was eine Rute ohne eigene Zahlen (`rute` am Item) mitbringt: Faktor auf die Wartezeit, Zusätze. */
const STANDARD_RUTE = { warten: 1, fenster: 0, schatz: 0 };

// Inhalt der Schatzkisten; Gegenstände anderer Bereiche werden erst beim Öffnen aufgelöst.
// [Gegenstand, ab Angelstufe]
const SCHATZ_ERZ = [['kupfererz', 0], ['eisenerz', 3], ['golderz', 7]];
const SCHATZ_STEINE = [['quarz', 0], ['topas', 3], ['amethyst', 3], ['smaragd', 7], ['rubin', 7]];
erwartet(...SCHATZ_ERZ.map((e) => e[0]), ...SCHATZ_STEINE.map((e) => e[0]));

// ─── Fang wählen und geben ──────────────────────────────────────────────────

/** Fang, der kein Fisch ist, für diese Gewässerart (sonst aus allen). */
export function muellFuer(art) {
  return MUELL[art]?.length ? MUELL[art] : Object.values(MUELL).flat();
}

/** Eine Zahl mit Untergrenze; NaN oder undefined (ein Modifikator ohne return) fallen auf `ersatz` zurück. */
const klemme = (x, min, ersatz) => (Number.isFinite(x) ? Math.max(min, x) : ersatz);

const rutenWerte = (id) => ({ ...STANDARD_RUTE, ...ITEMS[id]?.rute });

/**
 * Die Zahlen eines Wurfs aus Rute, Köder und Angelstufe: Faktor auf die Wartezeit, Länge des
 * Einhol-Fensters und Zuschlag auf die Schatzchance. Über die Modifikatoren `bissFenster` und
 * `schatzChance` (system.js) lassen sich Buffs und Ringe einhängen.
 */
export function wurfWerte(s, rute, koeder, wasser = null) {
  const lvl = L.stufeWirksam(s, 'angeln');
  const r = rutenWerte(rute);
  const k = koeder ? ITEMS[koeder]?.koeder : null;
  const kontext = { s, rute, koeder, wasser, stufe: lvl };
  const warten = r.warten * (k?.biss ?? 1) * Math.max(0.2, 1 - ANGELN.stufeAbzug * lvl) * (L.regnet(s) ? ANGELN.regen : 1);
  const fensterGrund = ANGELN.fenster + r.fenster + (k?.fenster ?? 0);
  const schatzGrund = ANGELN.schatz.grund + ANGELN.schatz.jeStufe * lvl + r.schatz + (k?.schatz ?? 0);
  const fenster = klemme(mod('bissFenster', fensterGrund, kontext), 0.2, fensterGrund);
  const schatz = klemme(mod('schatzChance', schatzGrund, kontext), 0, schatzGrund);
  return { warten, fenster, schatz, kontext };
}

/** Wartezeit in Sekunden bis zur Blasenspur (zufällig, Echtzeit). */
export function wartezeit(s, rute, koeder, wasser = null, r = Math.random) {
  const w = wurfWerte(s, rute, koeder, wasser);
  const [von, bis] = ANGELN.warten;
  const grund = (von + r() * (bis - von)) * w.warten;
  return klemme(mod('bissZeit', grund, w.kontext), 0.5, Math.max(0.5, grund));
}

/** Chance auf Müll statt Fisch; erfahrene Angler haken weniger davon. */
export function muellChance(s) {
  const m = ANGELN.muell;
  return Math.max(m.min, m.grund + m.jeStufe * L.stufeWirksam(s, 'angeln'));
}

/**
 * Legendäre Fische (Item-Feld `legendaer: true`) beißen nur ab `abStufe` (Angelstufe, Standard 0) und
 * nur, solange sie noch nicht im Fangbuch stehen: jeden gibt es genau einmal.
 */
export function legendaerFrei(s, f) {
  if (!f.legendaer) return true;
  return !s.angeln?.gefangen?.[f.id] && L.stufeWirksam(s, 'angeln') >= (f.abStufe ?? 0);
}

/** Fische, die jetzt an diesem Gewässer beißen (Gewässerart, Jahreszeit, Uhrzeit, Wetter; Legendäre nur einmal). */
export function fischePassend(s, art) {
  const jz = L.jahreszeit(s);
  const m = s.zeit.minute;
  const uhr = Math.floor(m / 60) * 100 + (m % 60);
  const wetter = L.regnet(s) ? 'regen' : 'sonne';
  return FISCHE.filter((f) => {
    const d = f.fisch;
    return d.orte.includes(art) && d.jz.includes(jz) && uhr >= d.zeit[0] && uhr < d.zeit[1] && (!d.wetter || d.wetter === wetter) && legendaerFrei(s, f);
  });
}

/** Was an diesem Gewässer gerade anbeißt: { fisch } oder { muell }. Seltene Fische beißen seltener. */
export function fischWaehlen(s, art, r = Math.random) {
  const pool = fischePassend(s, art);
  if (!pool.length || r() < muellChance(s)) return { muell: waehle(r, muellFuer(art)) };
  const gewicht = pool.map((f) => (f.legendaer ? ANGELN.legendaer : 110 - f.fisch.seltenheit));
  let z = r() * gewicht.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    z -= gewicht[i];
    if (z <= 0) return { fisch: pool[i] };
  }
  return { fisch: pool[pool.length - 1] };
}

/** Der Fang im Ganzen: selten eine Schatzkiste, sonst Fisch oder Müll. → { schatz: true } | { fisch } | { muell } */
export function fangWaehlen(s, art, r = Math.random, rute = 'angel', koeder = null) {
  if (r() < wurfWerte(s, rute, koeder, art).schatz) return { schatz: true };
  return fischWaehlen(s, art, r);
}

/** Zufällige Länge in cm: je besser die Qualität, desto größer der Fang. */
export function fischLaenge(it, q = 0, r = Math.random) {
  const [von, bis] = it.fisch.laenge;
  return Math.round(von + (bis - von) * Math.min(1, r() * 0.85 + q * 0.06));
}

/** Fangbuch: wie oft und wie groß; s.angeln.gefangen[fischId] = { n, groesste } (Länge in cm). */
export function fangBuchen(s, id, laenge) {
  const buch = ((s.angeln ??= {}).gefangen ??= {});
  const e = (buch[id] ??= { n: 0, groesste: 0 });
  e.n++;
  e.groesste = Math.max(e.groesste, laenge);
  return e;
}

/**
 * Einen Fisch oder Müll in den Rucksack (Qualität nach Angelstufe, perfekter Fang besser) und
 * Erfahrung geben. opt: { perfekt, r, feld: { x, y } } – ist der Rucksack voll, bleibt der Fang
 * auf `feld` liegen. → Ergebnis mit art ('fisch' | 'muell'), id, q, laenge, perfekt.
 */
export function fangGeben(s, ort, id, { perfekt = false, r = Math.random, feld = null } = {}) {
  const it = ITEMS[id];
  const erg = L.neuesErgebnis();
  const x = feld?.x ?? s.spieler.x;
  const y = feld?.y ?? s.spieler.y;
  erg.id = id;
  if (it.kat !== 'fisch') {
    erg.art = 'muell';
    L.geben(s, ort, x, y, { id, n: 1 }, erg);
    L.xpGeben(s, 'angeln', 3, erg);
    return erg;
  }
  const lvl = L.stufeWirksam(s, 'angeln');
  const z = r();
  let q = z < 0.03 + lvl * 0.03 ? 2 : z < 0.15 + lvl * 0.06 ? 1 : 0;
  if (perfekt && q < 2 && r() < 0.5) q++;
  L.geben(s, ort, x, y, { id, n: 1, q }, erg);
  L.xpGeben(s, 'angeln', ((q + 1) * 3 + it.fisch.seltenheit / 3) * (perfekt ? 2 : 1), erg);
  s.stats.gefangen++;
  erg.art = 'fisch';
  erg.q = q;
  erg.perfekt = perfekt;
  erg.laenge = fischLaenge(it, q, r);
  fangBuchen(s, id, erg.laenge);
  if (it.legendaer) {
    erg.legendaer = true;
    erg.text = `Legendär! ${it.name} – ${erg.laenge} cm. So einen fängt man nur einmal im Leben.`;
  }
  return erg;
}

/** Was eine Schatzkiste auf dieser Angelstufe enthält: Münzen, dazu Köder, Erz oder einen kleinen Edelstein. */
export function schatzInhalt(s, r = Math.random) {
  const lvl = L.stufeWirksam(s, 'angeln');
  const stufig = (liste) => liste.filter(([id, ab]) => ab <= lvl && ITEMS[id]).map(([id]) => id);
  const arten = {
    koeder: () => (ITEMS.koeder ? { id: 'koeder', n: ganz(r, 5, 10) + lvl } : null),
    erz: () => { const ids = stufig(SCHATZ_ERZ); return ids.length ? { id: waehle(r, ids), n: ganz(r, 2, 4) + Math.floor(lvl / 3) } : null; },
    stein: () => { const ids = stufig(SCHATZ_STEINE); return ids.length ? { id: waehle(r, ids), n: 1 + (lvl >= 8 && r() < 0.4 ? 1 : 0) } : null; },
  };
  // Mit Erfahrung steckt mehr in der Kiste: ab Stufe 5 zwei Sorten statt einer
  const frei = Object.keys(arten);
  const items = [];
  for (let i = lvl >= 5 ? 2 : 1; i > 0; i--) {
    const slot = arten[frei.splice(Math.min(frei.length - 1, Math.floor(r() * frei.length)), 1)[0]]();
    if (slot) items.push(slot);
  }
  return { gold: ganz(r, 25, 60) + 12 * lvl, items };
}

/** Eine Schatzkiste öffnen: Münzen und Gegenstände geben, etwas Erfahrung. opt wie bei fangGeben. */
export function schatzGeben(s, ort, { r = Math.random, feld = null } = {}) {
  const erg = L.neuesErgebnis();
  const inhalt = schatzInhalt(s, r);
  const x = feld?.x ?? s.spieler.x;
  const y = feld?.y ?? s.spieler.y;
  for (const slot of inhalt.items) L.geben(s, ort, x, y, slot, erg);
  s.spieler.gold += inhalt.gold;
  erg.art = 'schatz';
  erg.id = 'schatz';
  erg.gold = inhalt.gold;
  erg.text = `Eine Schatzkiste! +${inhalt.gold} Münzen`;
  L.xpGeben(s, 'angeln', 10, erg);
  return erg;
}

// ─── Wohin die Schnur fliegt ────────────────────────────────────────────────

/** Wo im Wasserfeld der Schwimmer landet: etwas zur fernen Seite, damit er nie hinter der Figur liegt. */
const SCHWIMMER_VERSATZ = { oben: [0, -6], unten: [0, 0], links: [-3, 0], rechts: [3, 0] };

const spielerFeld = (S) => ({ x: Math.floor(S.sp.x / T), y: Math.floor((S.sp.y - 3) / T) });

/** Wohin die Schnur fiele (wurfZiel), solange die Angel bereitliegt; null, wenn nicht. Füllt der Bereich je Bild, malt die Vorschau. */
export const VORSCHAU = { ziel: null };

/**
 * Das Wasserfeld, auf das ein Wurf fällt: das Feld unter dem Zeiger (`zeiger = { x, y }`, nur bei
 * Mausbedienung; `blickRichtung`: wohin die Figur schaut, Standard S.sp.blick), wenn es Wasser in Reichweite ist; sonst das nächste Wasserfeld in Blickrichtung
 * bis `ANGELN.reichweite` Felder weit. → { x, y, wasser, blick } oder { grund } (freundlicher Hinweis).
 */
export function wurfZiel(S, zeiger = null, blickRichtung = S.sp.blick) {
  const def = S.ort.def;
  const f = spielerFeld(S);
  const wasser = (x, y) => (istWasser(def, x, y) ? wasserArt(def, x, y) : null);
  let zuWeit = false;
  if (zeiger && wasser(zeiger.x, zeiger.y)) {
    const dx = zeiger.x - f.x;
    const dy = zeiger.y - f.y;
    if (Math.hypot(dx, dy) <= ANGELN.reichweite + 0.5) {
      const blick = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'links' : 'rechts') : dy !== 0 ? (dy < 0 ? 'oben' : 'unten') : blickRichtung;
      return { x: zeiger.x, y: zeiger.y, wasser: wasser(zeiger.x, zeiger.y), blick };
    }
    zuWeit = true;
  }
  const [dx, dy] = L.RICHTUNG[blickRichtung];
  for (let d = 1; d <= ANGELN.reichweite; d++) {
    const art = wasser(f.x + dx * d, f.y + dy * d);
    if (art) return { x: f.x + dx * d, y: f.y + dy * d, wasser: art, blick: blickRichtung };
  }
  return { grund: zuWeit ? 'Zu weit weg – geh näher ans Wasser.' : 'Kein Wasser in Reichweite. Stell dich ans Ufer und schau aufs Wasser.' };
}

// ─── Ablauf ─────────────────────────────────────────────────────────────────

/** Erster Köder im Rucksack (Item mit `koeder`). */
function koederImRucksack(s) {
  return s.spieler.inv.find((x) => x && ITEMS[x.id]?.koeder);
}

/** Die Richtung, aus der die Blasenspur kommt: ein Wasserfeld neben dem Schwimmer, sonst „von hinten". */
function spurWinkel(def, x, y, r) {
  const frei = [];
  for (let i = 0; i < 12; i++) {
    const w = (i / 12) * Math.PI * 2;
    if (istWasser(def, Math.floor(x + 0.5 + Math.cos(w) * 1.7), Math.floor(y + 0.5 + Math.sin(w) * 1.7))) frei.push(w);
  }
  return frei.length ? waehle(r, frei) : -Math.PI / 2;
}

/**
 * Die Schnur auswerfen (aus der Hand: Angel gewählt). opt: { zeiger: { x, y } (Mausfeld), blick (Blickrichtung
 * vor dem Drehen zum Ziel), r (Zufall) }.
 * Ohne Wasser in Reichweite: freundlicher Hinweis, nichts passiert (→ false). Köder aus dem Rucksack
 * wird erst beim Landen verbraucht (ein abgebrochener Flug kostet nichts). fx: { ton, meldung, ... } wie in angelnUpdate.
 */
export function auswerfen(S, fx, opt = {}) {
  const s = S.s;
  const ziel = wurfZiel(S, opt.zeiger, opt.blick);
  if (ziel.grund) { fx.meldung(ziel.grund); return false; }
  const r = opt.r ?? Math.random;
  const rute = s.spieler.inv[s.spieler.wahl]?.id;
  const koeder = koederImRucksack(s)?.id ?? null;
  const w = wurfWerte(s, rute, koeder, ziel.wasser);
  const warte = wartezeit(s, rute, koeder, ziel.wasser, r);
  S.sp.blick = ziel.blick;
  const versatz = SCHWIMMER_VERSATZ[ziel.blick];
  S.angeln = {
    phase: 'wurf', t: 0, r,
    rute, koeder, wasser: ziel.wasser,
    x: ziel.x, y: ziel.y, bx: ziel.x * T + 8 + versatz[0], by: ziel.y * T + 9 + versatz[1],
    warte, spur: ANGELN.spur, fenster: w.fenster, perfektZeit: ANGELN.perfekt,
    winkel: spurWinkel(S.ort.def, ziel.x, ziel.y, r),
    dauer: ANGELN.wurf, fang: null,
    // Wer die Laufrichtung zum Wasser beim Auswerfen weiter hält, holt nicht gleich wieder ein
    sperre: !!S.sp.bewegt,
  };
  fx.ton('wurf');
  return true;
}

/** Wasserspritzer als Partikel (spiel.js: partikel): beim Landen klein, beim Biss und Einholen groß. */
const SPRITZER = {
  klein: { f: ['#d8f2ff', '#9ad8f8'], v: 40, hoch: 1, streu: 3, streuY: 2, g: 260, dauer: 0.35 },
  gross: { f: ['#ffffff', '#d8f2ff', '#9ad8f8', '#5aa8e0'], v: 55, hoch: 1.4, streu: 4, streuY: 2, g: 260, dauer: 0.5 },
};

/**
 * Ein Bild lang weiterlaufen lassen. E: Eingabezustand (Benutzen und Aktion holen ein, Laufen und
 * Werkzeugwechsel brechen ab). fx: { ton(name), meldung(text), partikel(x, y, n, opt),
 * ergebnis(erg), feld() → Spielerfeld, zeiger() → Mausfeld }. → true, solange die Figur still am
 * Wasser steht; false, wenn das Angeln zu Ende ist (dann gilt die normale Steuerung wieder).
 */
export function angelnUpdate(S, dt, E, fx) {
  const a = S.angeln;
  if (!a) return false;
  const s = S.s;
  const slot = s.spieler.inv[s.spieler.wahl];
  const wechsel = !slot || slot.id !== a.rute || (E.slot != null && E.slot !== s.spieler.wahl) || !!E.rad;
  const lauf = Math.hypot(E.richtung.x, E.richtung.y) > 0.2;
  if (!lauf) a.sperre = false; // erst nach dem Loslassen zählt ein neuer Druck als Abbruch
  if (wechsel || (lauf && !a.sperre) || S.sp.stoss) {
    abbrechen(S, fx);
    return false;
  }
  a.t += dt;
  const druck = E.benutzen.gedrueckt || E.aktion.gedrueckt;
  switch (a.phase) {
    case 'wurf':
      if (a.t >= a.dauer) {
        a.t -= a.dauer;
        a.phase = 'warten';
        if (a.koeder) L.entfernen(s, a.koeder, 1);
        fx.ton('platsch');
        fx.partikel(a.bx, a.by, 6, SPRITZER.klein);
      }
      break;
    case 'warten':
      if (druck) leerEinholen(S, fx, 'Zu früh – da war noch nichts.');
      else if (a.t >= a.warte) { a.t -= a.warte; a.phase = 'spur'; fx.ton('blubb'); }
      break;
    case 'spur':
      if (druck) leerEinholen(S, fx, 'Zu früh – da war noch nichts.');
      else if (a.t >= a.spur) {
        a.t -= a.spur;
        a.phase = 'biss';
        fx.ton('platsch');
        fx.ton('biss');
        fx.partikel(a.bx, a.by - 2, 14, SPRITZER.gross);
      }
      break;
    case 'biss':
      if (druck) fangEinholen(S, fx, a.t <= a.perfektZeit);
      else if (a.t >= a.fenster) leerEinholen(S, fx, 'Zu spät – er ist weg.');
      break;
    case 'einholen':
      // Mit Fang läuft die Animation zu Ende; die leere Schnur darf man gleich wieder auswerfen.
      if (a.fang) {
        if (a.t >= a.dauer) { fangAnzeigen(S, fx); a.phase = 'fang'; a.t = 0; }
      } else if (druck) neuWurf(S, fx);
      else if (a.t >= a.dauer) S.angeln = null;
      break;
    case 'fang':
      if (druck) neuWurf(S, fx);
      else if (a.t >= ANGELN.fangZeit) S.angeln = null;
      break;
    default:
      S.angeln = null;
  }
  return !!S.angeln;
}

/** Gleich wieder auswerfen (nach Fang oder leerem Einholen); gelingt das nicht, ist das Angeln zu Ende. */
function neuWurf(S, fx) {
  const a = S.angeln;
  fangAnzeigen(S, fx);
  if (!auswerfen(S, fx, { zeiger: fx.zeiger?.(), r: a.r })) S.angeln = null;
}

/** Schnur einholen, ohne Fang: Laufen, Werkzeugwechsel, Fenster. */
function abbrechen(S, fx) {
  fangAnzeigen(S, fx);
  S.angeln = null;
}

/** Zu früh oder zu spät: die Schnur kommt leer zurück. */
function leerEinholen(S, fx, text) {
  const a = S.angeln;
  fx.meldung(text);
  fx.ton('einholen');
  a.phase = 'einholen';
  a.t = 0;
  a.dauer = ANGELN.leer;
  a.fang = null;
}

/** Im Fenster eingeholt: den Fang wählen und geben, dann fliegt er zur Figur. */
function fangEinholen(S, fx, perfekt) {
  const a = S.angeln;
  const s = S.s;
  const wahl = fangWaehlen(s, a.wasser, a.r, a.rute, a.koeder);
  const opt = { perfekt, r: a.r, feld: fx.feld?.() };
  const erg = wahl.schatz ? schatzGeben(s, S.ort, opt) : fangGeben(s, S.ort, wahl.fisch ? wahl.fisch.id : wahl.muell, opt);
  a.phase = 'einholen';
  a.t = 0;
  a.dauer = ANGELN.einholen;
  a.fang = { art: erg.art, id: erg.id, q: erg.q || 0, perfekt: !!erg.perfekt, erg, angezeigt: false };
  fx.ton('einholen');
  fx.partikel(a.bx, a.by - 2, 10, SPRITZER.gross);
}

/** Fund-Anzeige und Ton, sobald der Fang bei der Figur ist (oder früher, wenn sie weitermacht). */
function fangAnzeigen(S, fx) {
  const f = S.angeln?.fang;
  if (!f || f.angezeigt) return;
  f.angezeigt = true;
  fx.ton(f.art === 'schatz' ? 'schatz' : 'fang');
  fx.ergebnis(f.erg);
  if (f.perfekt) fx.meldung('Perfekt gefangen!');
}

/** Hinweis, was die Aktionstaste gerade täte (während S.angeln läuft). */
export function angelnHinweis(S) {
  const a = S.angeln;
  if (!a) return '';
  switch (a.phase) {
    case 'warten': case 'spur': return 'Einholen';
    case 'biss': return 'Einholen!';
    case 'fang': return 'Auswerfen';
    case 'einholen': return a.fang ? '' : 'Auswerfen';
    default: return '';
  }
}
