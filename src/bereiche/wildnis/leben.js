// Bereich „wildnis" – was in der Wildnis wächst und geschieht:
//  * Besiedlung: Bäume, Steine, Äste, Unkraut und Hartholz-Stümpfe auf Strand, Wald und im Geheimen
//    Wald (zu Spielbeginn, für ältere Stände beim ersten Betreten), über Nacht kommt etwas nach
//  * die kaputte Brücke zum Gezeitenbecken (300 Holz → Flagge `strandbruecke`)
//  * der umgestürzte Stamm vor dem Geheimen Wald (Stahlaxt → Flagge `geheimwald`)
//  * Hartholz-Stümpfe im Geheimen Wald wachsen nach

import { objektTyp, bedingung, BAUM_ARTEN } from '../../daten.js';
import { karteHolen } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { S, ton, meldung, dialog, frage, dekoAktion, splitter } from '../../spiel.js';
import { zufall, ganz } from '../../zufall.js';
import { rauschen } from './bau.js';
import { WILD_WALD } from './karte-wald.js';
import { STUMPF_PLAETZE } from './karte-geheimwald.js';

export const BRUECKE_HOLZ = 300;
export const STAMM_STUFE = 2; // Eisen: die „Stahlaxt"
export const STAMM_FLAECHE = [3, 2];
export const STAMM_ORT = [2, 62];

bedingung('wildnis_strandbruecke', (s) => !!s.flags.strandbruecke);
bedingung('wildnis_geheimwald', (s) => !!s.flags.geheimwald);

// ─── Die Brücke zum Gezeitenbecken ──────────────────────────────────────────

function brueckeReparieren(s) {
  if (L.anzahl(s, 'holz') < BRUECKE_HOLZ) return false;
  L.entfernen(s, 'holz', BRUECKE_HOLZ);
  s.flags.strandbruecke = true;
  L.kartenGeaendert();
  ton('axt');
  ton('fanfare');
  for (const x of [66, 67, 68]) splitter(x, 18, '#c8925a');
  meldung('Die Brücke ist wieder heil! Im Osten wartet das Gezeitenbecken.');
  return true;
}

dekoAktion('wildnis_bruecke', (d, { s }) => {
  if (s.flags.strandbruecke) { dialog(null, ['Die Brücke trägt wieder. Jemand hat sogar das Geländer abgestaubt.']); return; }
  const hat = L.anzahl(s, 'holz');
  if (hat < BRUECKE_HOLZ) {
    dialog(null, [
      'Die Brücke ins Gezeitenbecken ist morsch. Zwei Bretter fehlen, den Rest hält nur noch die Gewohnheit zusammen.',
      `Für eine neue brauchst du ${BRUECKE_HOLZ} Holz. Du hast ${hat}.`,
    ]);
    return;
  }
  frage(`Die Brücke reparieren? Das kostet ${BRUECKE_HOLZ} Holz (du hast ${hat}).`, [
    ['Reparieren', () => brueckeReparieren(S.s)],
    ['Später', null],
  ]);
}, (d, s) => (s.flags.strandbruecke ? '' : `Brücke reparieren (${BRUECKE_HOLZ} Holz)`));

// ─── Der umgestürzte Stamm ──────────────────────────────────────────────────

objektTyp('wildnis_stamm', {
  blockiert: true,
  flaeche: STAMM_FLAECHE,
  hinweis: 'Umgestürzter Riesenstamm',
  axt({ s, ort, x, y, o, erg, stufe, kraft }) {
    if (stufe < STAMM_STUFE) {
      erg.grund = 'Der Stamm ist dick wie ein Haus und hart wie Eisen. Mit der Stahlaxt vielleicht. Bruno kann deine Axt verbessern.';
      erg.treffer = 'abprall';
      return true;
    }
    o.hp -= kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      L.objektEntfernen(ort, x, y);
      L.geben(s, ort, x, y, { id: 'holz', n: 40 }, erg);
      L.geben(s, ort, x, y, { id: 'hartholz', n: 6 }, erg);
      L.xpGeben(s, 'sammeln', 60, erg);
      if (!s.flags.geheimwald) {
        s.flags.geheimwald = true;
        meldung('Der Weg in den Geheimen Wald ist frei!');
      }
    }
    return true;
  },
});

// ─── Besiedlung ─────────────────────────────────────────────────────────────

const imRect = (rects, x, y) => rects.some((b) => L.imBereich(b, x, y));
const BAUMARTEN = ['eiche', 'kiefer', 'ahorn'];

/** Ein Hindernis wie in hof: Baum, Stein, Ast, Unkraut, Fels, Stumpf. */
const hindernis = {
  baum: (r, art) => ({ t: 'baum', hp: 8, art: art ?? waehleArt(r) }),
  stein: (r) => ({ t: 'stein', hp: 2, v: ganz(r, 0, 2) }),
  ast: (r) => ({ t: 'ast', v: ganz(r, 0, 1) }),
  unkraut: (r) => ({ t: 'unkraut', v: ganz(r, 0, 2) }),
  fels: () => ({ t: 'fels', hp: 6 }),
  grossstumpf: () => ({ t: 'grossstumpf', hp: 8 }),
};
function waehleArt(r) {
  const arten = BAUMARTEN.filter((a) => BAUM_ARTEN[a]);
  const z = r();
  if (arten.includes('kiefer') && z < 0.3) return 'kiefer';
  if (arten.includes('ahorn') && z < 0.5) return 'ahorn';
  return 'eiche';
}

const FELD_CACHE = new Map();
/**
 * Felder, auf denen die Wildnis wachsen darf: Bodenzeichen, Abstand zu Wegen, Wasser, Punkten, Toren,
 * Gebäuden und blockierender Deko, dazu freie Plätze. Hängt nur von der festen Karte ab und wird
 * deshalb einmal berechnet (neuesSpiel läuft in den Tests hunderte Male).
 */
function wachsFelder(id, boeden, frei, abstandPunkt = 3) {
  const schluessel = `${id}|${boeden}|${abstandPunkt}|${JSON.stringify(frei)}`;
  let felder = FELD_CACHE.get(schluessel);
  if (felder) return felder;
  const def = karteHolen(id);
  const gesperrt = new Uint8Array(def.w * def.h);
  for (const d of def.deko) {
    if (d.wand || d.begehbar) continue;
    for (let y = d.y; y < d.y + (d.h || 1); y++) for (let x = d.x; x < d.x + (d.w || 1); x++) if (x >= 0 && y >= 0 && x < def.w && y < def.h) gesperrt[y * def.w + x] = 1;
  }
  felder = [];
  const punkte = Object.values(def.punkte);
  for (let y = 2; y < def.h - 2; y++) {
    for (let x = 2; x < def.w - 2; x++) {
      if (!boeden.includes(def.grid[y][x]) || gesperrt[y * def.w + x] || imRect(frei, x, y)) continue;
      // nicht direkt am Weg, am Wasser oder an der Wand von Gebäuden
      let nah = false;
      for (let dy = -1; dy <= 1 && !nah; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const z = def.grid[y + dy]?.[x + dx];
          if (z && !'.n#sqXp'.includes(z)) { nah = true; break; }
        }
      }
      if (nah) continue;
      if (punkte.some(([px, py]) => Math.abs(px - x) < abstandPunkt && Math.abs(py - y) < abstandPunkt)) continue;
      if (def.warps.some((w) => x >= w.x - 3 && x < w.x + w.w + 3 && y >= w.y - 3 && y < w.y + w.h + 3)) continue;
      if (def.gebaeude.some((g) => x >= g.x - 1 && x < g.x + g.w + 1 && y >= g.y - 1 && y < g.y + g.h + 2)) continue;
      felder.push([x, y]);
    }
  }
  FELD_CACHE.set(schluessel, felder);
  return felder;
}

function waldBesiedeln(s, r) {
  const def = karteHolen('wald');
  const w = L.welt(s, 'wald');
  const nachbarWand = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => def.grid[y + dy]?.[x + dx] === '#');
  for (const [x, y] of wachsFelder('wald', '.n', WILD_WALD.frei)) {
    const dicht = rauschen(x / 6.5, y / 6.5, 11);
    let p = dicht > 0.55 ? 0.4 : dicht > 0.42 ? 0.14 : 0.03;
    if (nachbarWand(x, y)) p += 0.25;
    const z = r();
    let o = null;
    if (z < p) o = hindernis.baum(r);
    else if (z < p + 0.014) o = hindernis.stein(r);
    else if (z < p + 0.03) o = hindernis.ast(r);
    else if (z < p + 0.07) o = def.grid[y][x] === '.' ? hindernis.unkraut(r) : null;
    else if (z < p + 0.0735) o = hindernis.fels();
    else if (z < p + 0.0765) o = hindernis.grossstumpf();
    if (o) w.objekte[L.k(x, y)] = o;
  }
  if (!s.flags.geheimwald) L.objektSetzen(L.ortVon(s, 'wald'), STAMM_ORT[0], STAMM_ORT[1], { t: 'wildnis_stamm', hp: 36 });
}

const STRAND_FREI = [{ x: 20, y: 18, w: 16, h: 8 }, { x: 62, y: 14, w: 8, h: 10 }, { x: 0, y: 27, w: 4, h: 6 }];
function strandBesiedeln(s, r) {
  const def = karteHolen('strand');
  const w = L.welt(s, 'strand');
  for (const [x, y] of wachsFelder('strand', 's.p', STRAND_FREI, 3)) {
    const z = r();
    const gras = def.grid[y][x] === '.';
    let o = null;
    if (z < 0.012) o = hindernis.stein(r);
    else if (z < 0.032) o = hindernis.ast(r);
    else if (z < 0.05) o = x > 69 ? hindernis.stein(r) : null;
    else if (z < 0.1) o = gras ? hindernis.unkraut(r) : null;
    else if (z < 0.1015) o = hindernis.fels();
    if (o) w.objekte[L.k(x, y)] = o;
  }
}

function geheimwaldBesiedeln(s, r) {
  const w = L.welt(s, 'geheimwald');
  for (const [x, y] of STUMPF_PLAETZE) w.objekte[L.k(x, y)] = hindernis.grossstumpf();
  for (const [x, y] of wachsFelder('geheimwald', '.nq', [], 2)) {
    if (w.objekte[L.k(x, y)]) continue;
    const z = r();
    if (z < 0.03) w.objekte[L.k(x, y)] = hindernis.ast(r);
    else if (z < 0.045) w.objekte[L.k(x, y)] = hindernis.stein(r);
    else if (z < 0.1) w.objekte[L.k(x, y)] = hindernis.unkraut(r);
  }
}

/** Alles Wilde anlegen (einmal je Spielstand); die früheren Platzhalter-Karten werden geleert. */
export function besiedeln(s) {
  s.wildnis ??= { besiedelt: false };
  const r = zufall(((s.seed ?? 1) ^ 0x57494c44) >>> 0);
  for (const id of ['strand', 'wald', 'geheimwald']) {
    const w = L.welt(s, id);
    w.objekte = {};
    w.funde = [];
  }
  L.kartenGeaendert();
  strandBesiedeln(s, r);
  waldBesiedeln(s, r);
  geheimwaldBesiedeln(s, r);
  s.wildnis.besiedelt = true;
  L.kartenGeaendert();
}

/** Über Nacht: etwas Neues am Strand und im Wald, die Stümpfe im Geheimen Wald wachsen nach. */
function nachwuchs(s, r) {
  const winter = L.jahreszeit(s) === 'winter';
  for (const [id, boden, frei] of [['wald', '.', WILD_WALD.frei], ['strand', 's', [{ x: 20, y: 18, w: 16, h: 8 }]]]) {
    const def = karteHolen(id, s);
    const ort = L.ortVon(s, id);
    let gesetzt = 0;
    const ziel = ganz(r, 1, 4);
    for (let i = 0; i < 60 && gesetzt < ziel; i++) {
      const x = ganz(r, 2, def.w - 3);
      const y = ganz(r, 2, def.h - 3);
      if (def.grid[y][x] !== boden || imRect(frei, x, y) || !L.feldFrei(s, ort, x, y)) continue;
      const z = r();
      ort.welt.objekte[L.k(x, y)] = winter ? (z < 0.5 ? hindernis.stein(r) : hindernis.ast(r)) : z < 0.55 ? hindernis.unkraut(r) : z < 0.8 ? hindernis.stein(r) : hindernis.ast(r);
      gesetzt++;
    }
  }
  const ort = L.ortVon(s, 'geheimwald');
  for (const [x, y] of STUMPF_PLAETZE) {
    if (ort.welt.objekte[L.k(x, y)] || ort.welt.felder[L.k(x, y)]) continue;
    if (r() < 0.2) ort.welt.objekte[L.k(x, y)] = hindernis.grossstumpf();
  }
}

system({
  name: 'wildnis',
  ergaenzen(s) { s.wildnis ??= { besiedelt: false }; },
  neuesSpiel(s) { besiedeln(s); },
  // Ältere Stände kannten nur die kleinen Platzhalter: beim ersten Betreten wächst alles
  karteBetreten(ort) {
    const s = S.s;
    if (s.wildnis && !s.wildnis.besiedelt && ['strand', 'wald', 'geheimwald'].includes(ort.def.id)) besiedeln(s);
  },
  tagEnde(s, bericht, r) { if (s.wildnis?.besiedelt) nachwuchs(s, r); },
});
