// Bereich „mine": Mineneingang (Karte mine0), 120 Ebenen in drei Schichten als Kartenanbieter, Gestein,
// Erze, Barren, Mineralien und Artefakte (museum), Geoden (Bruno), Monster mit KI, Kampf mit Waffenarten
// und Spezialzügen, Ringe und Stiefel, Bomben und Treppe, Artefaktstellen, Alrik und die Gilde.
//
// Dateien: gegenstaende.js (alle Items, Rezepte), monster.js (Monster, Tabellen), ebenen.js (Generator,
// Gestein, Leitern, Truhen, Förderkorb), kampf.js (Laufzeit des Kampfs, Waffen, Bomben, Treppe),
// ringe.js (Ringplätze, Stiefel, Modifikatoren), geoden.js (Inhalt, Knacken bei Bruno), artefakte.js
// (Würmer im Boden), gilde.js (Alrik, Laden, Monsterziele). Kunst: grafik.js, Fenster: oberflaeche.js.

import { OBJEKT_TYPEN, bedingung } from '../../daten.js';
import { karte } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { S, dekoAktion, ton, dialog, fenster, ergebnisZeigen, spielerFeld, meldung } from '../../spiel.js';
import './gegenstaende.js';
import './monster.js';
import './ringe.js';
import './geoden.js';
import './artefakte.js';
import './gilde.js';
import { mineAb, mineAuf } from './ebenen.js';
import { kampfUpdate, kampfZuruecksetzen, werkzeugGegenMonster, spezialInfo, spezialStarten, kampfOrt } from './kampf.js';

export { MINE_TIEFE, mineErzeugen, aufzugFahren, SCHICHTEN, BAENDER, bandVon, schichtVon, STEINARTEN, SCHATZ, steinErtrag, schatzOeffnen } from './ebenen.js';

// ─── Mineneingang ───────────────────────────────────────────────────────────

karte({
  id: 'mine0', name: 'Alte Mine', aussen: false, innen: 'mine', rand: 'mine', dunkel: 0.25, npcWege: false,
  grid: [
    '##############',
    '##############',
    '#mmmmmmmmDDDD#',
    '#mmmmmmmmDDDD#',
    '#mmmCmmmmDDDm#',
    '#mmCCmmmmDDDm#',
    '#mmmmmmmmmmmm#',
    '#mmmmmmmmmmCm#',
    '#mCmmmmmmmmmm#',
    '#mmmmmmmmmmmm#',
    '######mm######',
  ],
  deko: [
    { typ: 'leiter_ab', x: 9, y: 4, aktion: 'mine_ab', begehbar: true },
    { typ: 'aufzug', x: 11, y: 2, aktion: 'aufzug' },
    { typ: 'schwertfund', x: 3, y: 2, aktion: 'schwert', nurWenn: 'keinSchwert' },
    { typ: 'wandlampe', x: 5, y: 1, wand: true, licht: 4 },
    { typ: 'wandlampe', x: 9, y: 1, wand: true, licht: 4 },
    { typ: 'felsen', x: 1, y: 8 }, { typ: 'felsen', x: 12, y: 7 },
    { typ: 'kiste', x: 2, y: 5 },
    { typ: 'mine_lore', x: 12, y: 5 },
    { typ: 'mine_tropfstein', x: 1, y: 2, begehbar: true, v: 1 },
    {
      typ: 'mine_tafel', x: 7, y: 1, wand: true, aktion: 'text',
      text: '„Willkommen in der Alten Mine. Erde bis Ebene 39, dann Eis, ab 80 wird es heiß. Waffen in der Gilde. Bitte keine Schleime mit nach Hause nehmen. – A."',
    },
  ],
  warps: [{ x: 6, y: 10, w: 2, h: 1, karte: 'berg', punkt: 'vorMine' }],
  punkte: {
    eingang: [6, 9, 'oben'],
    leiter: [9, 5, 'unten'],
  },
});

bedingung('mineOffen', (s) => !!s.flags.mineOffen);
bedingung('keinSchwert', (s) => !s.mine.schwert);

dekoAktion('mine_ab', () => mineAb(), 'Hinabsteigen');
dekoAktion('mine_auf', () => mineAuf(), 'Hinaufsteigen');
dekoAktion('aufzug', () => fenster('aufzug'), 'Förderkorb');
dekoAktion('schwert', () => {
  const s = S.s;
  s.mine.schwert = true;
  const erg = { items: [] };
  const f = spielerFeld();
  L.geben(s, S.ort, f.x, f.y, { id: 'schwert', n: 1 }, erg);
  ton('fanfare');
  dialog(null, [
    'Du nimmst das rostige Schwert. Es liegt erstaunlich gut in der Hand.',
    'Wähle es in der Werkzeugleiste und schlag damit nach Monstern. Mit der Aktionstaste blockst du Angriffe.',
  ]);
  ergebnisZeigen(erg);
}, 'Schwert nehmen');

// ─── Spezialzug über die Aktionstaste ───────────────────────────────────────

/** Liegt vor der Spielerin nichts, womit die Aktionstaste sonst etwas täte? */
function nichtsAnderes({ s, ort, x, y, f, npc }) {
  if (npc) return false;
  const o = L.objektAn(s, ort, x, y);
  const typ = o && OBJEKT_TYPEN[o.t];
  if (typ && (typ.hinweis || typ.interagieren || typ.aufnehmen)) return false;
  const d = L.dekoAn(s, ort.def, x, y) || L.dekoAn(s, ort.def, f.x, f.y);
  return !d?.aktion;
}

const spezialHier = (ctx) => kampfOrt() && !S.angeln && !S.modus && nichtsAnderes(ctx) && spezialInfo(ctx.s);

// ─── System ─────────────────────────────────────────────────────────────────

/** Zustand des Bereichs (s.mine), auch für ältere Stände ergänzt. */
export function mineZustand(s) {
  s.mine ??= {};
  const m = s.mine;
  m.tiefste ??= 0;
  m.schwert ??= false;
  m.truhen ??= [];
  m.ringe ??= [null, null];
  while (m.ringe.length < 2) m.ringe.push(null);
  m.stiefel ??= null;
  m.besiegt ??= {};
  m.belohnt ??= [];
  m.gefunden ??= {};
  m.monster ??= 0;
  m.geoden ??= 0;
  return m;
}

system({
  name: 'mine',
  ergaenzen(s) { mineZustand(s); },
  tagEnde(s) {
    if (L.tagNr(s.zeit) >= 4) s.flags.mineOffen = true;
  },
  karteBetreten(ort) {
    kampfZuruecksetzen();
    S.mineEbene = ort.def.ebene || 0;
    if (!S.mineEbene) return;
    S.monster = (ort.def.monsterStart || []).map((m) => ({ ...m }));
    if (S.mineEbene > S.s.mine.tiefste) S.s.mine.tiefste = S.mineEbene;
    if (ort.def.befallen) meldung('Diese Ebene ist befallen! Besiege alle Monster, dann taucht die Leiter auf.', 'warn');
    else if (ort.def.art === 'dunkel') meldung('Hier ist es unheimlich dunkel …', 'warn');
    else if (ort.def.wasser === 'mine') meldung('Ein unterirdischer See! Vielleicht beißt hier etwas.');
  },
  update(dt) { kampfUpdate(dt); },
  /** Sense und Spitzhacke gegen Monster (Waffen treffen in ihrer eigenen Wirkung). */
  schwung(ctx) { werkzeugGegenMonster(ctx); },
  interagieren(ctx) {
    if (!spezialHier(ctx)) return undefined;
    spezialStarten();
    return true;
  },
  hinweis(ctx) {
    if (!spezialHier(ctx)) return undefined;
    const info = spezialInfo(ctx.s);
    return info.bereit ? info.name : `${info.name} (${Math.ceil(info.abk)} s)`;
  },
});
