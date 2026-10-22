// Bereich „tiere": der Hühnerstall (von Bruno gebaut, steht im Hof-Bereich „stall"), Küken aus dem
// Krämerladen (Hook ladenWare, auch in Mengen), die Herde als Zahlen und die Eierkiste vor dem Stall.
// Es gibt keine einzelnen Hühner: Der Stall kennt nur die Anzahl, die Zufriedenheit der Herde und
// den Eierbestand. Dazu Greta (Zimmerei am Berg) und Wilma (Ranch im Wald) als schlichte Platzhalter
// samt Läden; die Räume dafür bauen „berg" und „wildnis".
//
// s.stall = { gebaut, bauMorgen, anzahl, neue, freundschaft, gestreichelt, eier: { ei, grossesei } }
//   anzahl        Hühner im Stall (höchstens HUEHNER_MAX)
//   neue          davon heute gekauft – legen in der ersten Nacht noch nicht
//   freundschaft  Zufriedenheit der Herde, 0 bis 1000 (Durchschnitt)
//   gestreichelt  heute schon gestreichelt (alle auf einmal)
//   eier          Bestand in der Eierkiste vor dem Stall

import { item, kategorie, spezialWare, bedingung, npc, laden } from '../../daten.js';
import { bereichVon, bodenVon } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { S, gebaeudeAktion, dekoAktion, dialog, ton, meldung } from '../../spiel.js';

/** Karte, auf der der Stall steht; dort braucht es die Bereiche „stall" und „auslauf". */
const STALL_KARTE = 'hof';

/** Obergrenzen, damit alle Rechnungen in sicheren Ganzzahlen bleiben. */
export const HUEHNER_MAX = 1e9;
export const EIER_MAX = 1e12;
/** Bis zu dieser Zahl wird jedes Huhn einzeln gewürfelt, darüber näherungsweise (Normalverteilung). */
const EINZELN_BIS = 500;
const KUEKEN_PREIS = 800;

kategorie('tier', 'Tierprodukt');
item('ei', { name: 'Ei', kat: 'tier', preis: 50, bild: { art: 'ei', f: '#f4ede0' }, energie: 25, text: 'Frisch aus dem Hühnerstall.' });
item('grossesei', { name: 'Großes Ei', kat: 'tier', preis: 95, bild: { art: 'ei', f: '#f8f1e4', gross: true }, energie: 38, text: 'Von einer sehr glücklichen Henne.' });

bedingung('stall', (s) => !!s.stall?.gebaut);
bedingung('keinStall', (s) => !s.stall?.gebaut && !s.stall?.bauMorgen);

const zahlen = new Intl.NumberFormat('de-DE');
const ganz = (v, max, vorgabe = 0) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : vorgabe);

/** Wie viele Küken sich jetzt kaufen lassen (Gold und Obergrenze). */
export function kuekenMaximum(s, preis = KUEKEN_PREIS) {
  if (!s.stall?.gebaut) return 0;
  return Math.max(0, Math.min(HUEHNER_MAX - s.stall.anzahl, Math.floor(s.spieler.gold / preis)));
}

spezialWare('kueken', {
  name: 'Küken', preis: KUEKEN_PREIS, text: 'Ziehen sofort in deinen Hühnerstall, so viele du willst. Jedes legt ab der zweiten Nacht ein Ei in die Kiste.',
  mengen: [1, 10, 100],
  hoechstmenge: (s, ware) => kuekenMaximum(s, ware.preis),
  verfuegbar: (s) => s.stall.gebaut && s.stall.anzahl < HUEHNER_MAX,
  kaufen(s, { n = 1 } = {}) {
    n = Math.floor(n);
    if (!(n >= 1)) return { grund: 'So wenige Küken gibt es nicht.' };
    if (s.stall.anzahl + n > HUEHNER_MAX) return { grund: 'So viele Hühner passen nicht in einen Stall.' };
    const st = s.stall;
    // neue Küken sind noch nicht zufrieden: sie ziehen den Durchschnitt der Herde herunter
    st.freundschaft = Math.round((st.freundschaft * st.anzahl) / (st.anzahl + n) * 100) / 100;
    st.anzahl += n;
    st.neue += n;
    return { text: n === 1 ? 'Ein Küken ist in deinen Stall gezogen.' : `${zahlen.format(n)} Küken sind in deinen Stall gezogen.` };
  },
});

spezialWare('stall', {
  name: 'Hühnerstall', preis: 3000, zutaten: { holz: 150, stein: 50 },
  text: 'Bruno baut ihn über Nacht neben dein Haus, mit einer Eierkiste davor. Danach gibt es bei Ottilie Küken.',
  verfuegbar: (s) => !s.stall.gebaut && !s.stall.bauMorgen,
  kaufen(s) {
    s.stall.bauMorgen = true;
    L.kartenGeaendert();
    return { text: 'Bruno baut deinen Hühnerstall heute Nacht.' };
  },
});

/** Was dieser Bereich in fremden Läden anbietet (Hook ladenWare). */
const LADEN_WARE = {
  laden: [{ spezial: 'kueken', reihe: 30 }],
  schmiede: [{ spezial: 'stall', reihe: 60 }],
};

function stallGebaeude(def) {
  const b = bereichVon(def, 'stall');
  if (!b) return null;
  return { typ: 'stall', x: b.x, y: b.y, w: b.w, h: b.h, tuer: { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 }, aktion: 'stall' };
}

// ─── Die Eierkiste ──────────────────────────────────────────────────────────

/**
 * Feld der Eierkiste: direkt unter der Gebäudezeile des Stalls, seitlich neben dem Eingang – nie auf
 * dem Eingangsfeld und nie auf dem Feld davor (dem Weg zur Tür). Rechts zuerst, dann links, dann
 * jeweils ein Feld näher; nur auf begehbarem Boden. Null, wenn die Karte keinen Stall kennt.
 */
export function kistenFeld(def) {
  const g = stallGebaeude(def);
  if (!g) return null;
  const y = g.y + g.h;
  for (const dx of [2, -2, 1, -1]) {
    const x = g.tuer.x + dx;
    if (x < g.x || x >= g.x + g.w) continue;
    if (bodenVon(def, x, y).begehbar) return { x, y };
  }
  return null;
}

/** Eierbestand der Kiste insgesamt. */
export const eierGesamt = (s) => (s.stall?.eier?.ei ?? 0) + (s.stall?.eier?.grossesei ?? 0);

/** Wie voll die Kiste aussieht: 0 leer, 1 wenige, 2 einige, 3 viele (für das Bild). */
export function kistenStufe(s) {
  const n = eierGesamt(s);
  return n <= 0 ? 0 : n < 10 ? 1 : n < 100 ? 2 : 3;
}

/** Räumt Beet, Belag und Objekt vom Kistenfeld (wenn dort schon etwas aufgestellt war). */
function kisteFreiRaeumen(s) {
  const ort = L.ortVon(s, STALL_KARTE);
  const f = kistenFeld(ort.def);
  if (!f) return;
  const kk = L.k(f.x, f.y);
  delete ort.welt.objekte[kk];
  if (ort.welt.felder) delete ort.welt.felder[kk];
  if (ort.welt.belag) delete ort.welt.belag[kk];
}

const eierText = (n, id) => (id === 'ei' ? (n === 1 ? '1 Ei' : `${zahlen.format(n)} Eier`) : (n === 1 ? '1 Großes Ei' : `${zahlen.format(n)} Große Eier`));

/**
 * Nimmt aus der Kiste, was in den Rucksack passt. Gibt { ei, grossesei, rest, meldungen } zurück.
 * Der Rest bleibt in der Kiste.
 */
export function eierHolen(s) {
  const e = s.stall.eier;
  const genommen = { ei: 0, grossesei: 0 };
  for (const id of ['ei', 'grossesei']) {
    const n = Math.min(e[id], L.platzFuer(s, { id, n: e[id] }));
    if (n <= 0) continue;
    L.hinzufuegen(s, { id, n });
    e[id] -= n;
    genommen[id] = n;
  }
  const rest = e.ei + e.grossesei;
  const teile = ['ei', 'grossesei'].filter((id) => genommen[id] > 0).map((id) => eierText(genommen[id], id));
  const meldungen = [];
  if (teile.length) meldungen.push(`Du nimmst ${teile.join(' und ')} aus der Kiste.`);
  if (rest > 0) meldungen.push('Rucksack voll – der Rest bleibt in der Kiste.');
  if (!teile.length && !rest) meldungen.push('Noch keine Eier. Die Hühner legen sie über Nacht hierher.');
  return { ...genommen, rest, meldungen };
}

dekoAktion('eierkiste', () => {
  const erg = eierHolen(S.s);
  if (erg.ei || erg.grossesei) { ton('pflueck'); L.kartenGeaendert(); }
  for (const m of erg.meldungen) meldung(m);
}, (d, s) => (eierGesamt(s) > 0 ? `Eier holen (${zahlen.format(eierGesamt(s))})` : 'Eierkiste'));

// ─── Eier über Nacht ────────────────────────────────────────────────────────

/** Anzahl der Erfolge bei n Versuchen mit Wahrscheinlichkeit p. Gleiche Zufallsfolge, gleiche Zahl. */
export function binomial(n, p, r) {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  if (n <= EINZELN_BIS) {
    let k = 0;
    for (let i = 0; i < n; i++) if (r() < p) k++;
    return k;
  }
  const u1 = Math.max(r(), 1e-12);
  const u2 = r();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const k = Math.round(n * p + z * Math.sqrt(n * p * (1 - p)));
  return Math.max(0, Math.min(n, k));
}

/** Die Nacht im Stall: Zufriedenheit nachziehen, Eier in die Kiste legen. Gibt die Zahl der gelegten Eier zurück. */
export function nachtImStall(s, r) {
  const st = s.stall;
  if (st.anzahl > 0) st.freundschaft = Math.round(Math.max(0, Math.min(1000, st.freundschaft + (st.gestreichelt ? 15 : -5))) * 100) / 100;
  st.gestreichelt = false;
  const legend = Math.max(0, st.anzahl - st.neue);
  st.neue = 0;
  const gross = binomial(legend, (st.freundschaft / 1000) * 0.6, r);
  const e = st.eier;
  e.grossesei = Math.min(EIER_MAX, e.grossesei + gross);
  e.ei = Math.min(EIER_MAX, e.ei + (legend - gross));
  return legend;
}

// ─── Der Stall: alle Hühner auf einmal streicheln ───────────────────────────

gebaeudeAktion('stall', () => {
  const st = S.s.stall;
  if (!st.anzahl) { dialog(null, ['Der Stall ist noch leer. Küken gibt es bei Ottilie im Krämerladen.']); return; }
  const wer = st.anzahl === 1 ? 'dein Huhn' : `alle ${zahlen.format(st.anzahl)} Hühner`;
  if (st.gestreichelt) {
    dialog(null, [`Du hast ${wer} heute schon gestreichelt. Sie dösen zufrieden im Stroh. Die Eier liegen in der Kiste vor dem Stall.`]);
    return;
  }
  st.gestreichelt = true;
  ton('gack');
  dialog(null, [`Du streichelst ${wer} im Stall. Zufriedenes Gackern – glückliche Hühner legen große Eier. Die Eier findest du in der Kiste vor dem Stall.`]);
}, 'Hühnerstall');

// ─── Greta und Wilma (Platzhalter) ──────────────────────────────────────────

npc('greta', {
  name: 'Greta', voll: 'Greta Zimmermann', rolle: 'Zimmerin',
  aussehen: { haut: '#e8b48a', haare: '#b8542a', frisur: 'zopf', hemd: '#c87a3a', hose: '#4a3a2a', schuerze: '#8a6a4a' },
  geburtstag: { jz: 'herbst', tag: 21 },
  liebt: ['hartholz', 'kaffee'], mag: ['kat:ressource', 'brot'], magNicht: ['kat:fisch'], hasst: ['schleim', 'stiefel'],
  heim: { karte: 'zimmerei', punkt: 'bett_greta' },
  plan: { normal: [[600, null], [900, 'zimmerei', 'theke'], [1700, null]] },
  zeilen: {
    allgemein: [
      'Holz, Stein, ein bisschen Geduld – mehr braucht ein gutes Haus nicht. Na gut, Nägel.',
      'Wenn du einen Stall willst, komm vorbei. Ich messe zweimal und säge einmal.',
      'Die Zimmerei riecht nach Harz. Ich finde, so sollte jeder Morgen riechen.',
    ],
    fruehling: ['Frühling heißt Dachrinnen. Alle wollen sie gleichzeitig.'],
    sommer: ['Im Sommer trocknet das Holz am besten. Ich auch.'],
    herbst: ['Herbststürme prüfen jedes Dach. Meine bestehen.'],
    winter: ['Im Winter baue ich Möbel. Draußen friert der Leim.'],
    regen: ['Regen ist gut. Da sieht man, welches Dach dicht ist.'],
    herz: {
      2: 'Du hast einen guten Blick für gerade Linien, {name}.',
      4: 'Meine Mutter war auch Zimmerin. Sie hat mir den ersten Hobel geschenkt. Ich hab ihn noch.',
      6: 'Ich wollte immer eine Brücke bauen. Eine richtig große. Vielleicht am Berg.',
      8: 'Wenn dein Haus mal knarzt, sag Bescheid. Für dich komme ich auch sonntags.',
      10: 'Du gehörst zu Klarwasser wie der Dachfirst zum Haus, {name}.',
    },
    geburtstag: 'Mein Geburtstag! Und du hast an mich gedacht. Das nagle ich mir an die Wand.',
    wieder: ['Die Säge wartet.', 'Bis bald, {name}!'],
  },
  antwort: { liebt: 'Oh, das ist ja wunderbar! Danke!', mag: 'Schön, danke dir.', neutral: 'Danke.', magNicht: 'Hm. Na ja.', hasst: 'Was soll ich denn damit?' },
});

npc('wilma', {
  name: 'Wilma', voll: 'Wilma Weidegrund', rolle: 'Rancherin',
  aussehen: { haut: '#f0c8a0', haare: '#6a4428', frisur: 'lang', hemd: '#5a8a4a', hose: '#3a4a6a', muetze: '#c8a050' },
  geburtstag: { jz: 'fruehling', tag: 18 },
  liebt: ['grossesei', 'kuerbis'], mag: ['kat:tier', 'kat:ernte'], magNicht: ['kat:mineral'], hasst: ['schleim', 'fluegel'],
  heim: { karte: 'ranch', punkt: 'bett_wilma' },
  plan: { normal: [[600, null], [900, 'ranch', 'theke'], [1600, null]] },
  zeilen: {
    allgemein: [
      'Tiere wissen, wer es gut mit ihnen meint. Hühner merken sich Gesichter. Und Krümel.',
      'Ein Huhn, das gestreichelt wird, legt größere Eier. Das ist Wissenschaft. Fast.',
      'Die Ranch liegt mitten im Wald. Die Füchse finden das auch gut. Ich weniger.',
    ],
    fruehling: ['Frühling! Die Küken schlüpfen, und alle wollen eins.'],
    sommer: ['Im Sommer sind die Hühner besonders gut drauf. Die Eier auch.'],
    herbst: ['Im Herbst sammle ich Heu für den Winter. Viel Heu.'],
    winter: ['Im Winter bleiben die Tiere drinnen. Dann ist es im Stall gemütlicher als bei mir.'],
    regen: ['Bei Regen bleiben die Tiere im Stall. Nasse Hühner sind schlecht gelaunt.'],
    herz: {
      2: 'Du riechst ein bisschen nach Stall. Das ist ein Kompliment.',
      4: 'Meine erste Kuh hieß Berta. Sie hat mich jeden Morgen geweckt. Um vier.',
      6: 'Manchmal rede ich mit den Hühnern. Sie hören besser zu als die meisten Leute.',
      8: 'Wenn du mal ein Tier brauchst, das besonders lieb ist, such ich dir eins aus.',
      10: 'Du bist ein guter Mensch, {name}. Die Hühner sagen das auch.',
    },
    geburtstag: 'Mein Geburtstag? Wie lieb! Die Hühner haben es vergessen.',
    wieder: ['Die Tiere warten.', 'Bis später!'],
  },
  antwort: { liebt: 'Wie schön! Danke!', mag: 'Oh, danke!', neutral: 'Danke dir.', magNicht: 'Hm, das brauche ich nicht.', hasst: 'Igitt! Nimm das weg.' },
});

laden('zimmerei', {
  name: 'Zimmerei', npc: 'greta', ort: { karte: 'zimmerei', punkt: 'theke' },
  ware: [{ id: 'holz', preis: 10 }, { id: 'stein', preis: 20 }],
});

laden('ranch', {
  name: 'Ranch', npc: 'wilma', ort: { karte: 'ranch', punkt: 'theke' },
  ware: [{ spezial: 'kueken' }],
});


system({
  name: 'tiere',
  ergaenzen(s) {
    s.stall ??= {};
    const st = s.stall;
    st.gebaut = !!st.gebaut;
    st.bauMorgen = !!st.bauMorgen;
    if (Array.isArray(st.huehner)) {
      // alter Stand: Liste einzelner Hühner → Zahlen (die Namen gehen verloren)
      const h = st.huehner;
      st.anzahl = h.length;
      st.neue = h.filter((x) => x?.neu).length;
      st.freundschaft = h.length ? h.reduce((a, x) => a + ganz(x?.freundschaft, 1000), 0) / h.length : 0;
      st.gestreichelt = h.length > 0 && h.every((x) => x?.gestreichelt);
      delete st.huehner;
      // Eier, die noch im Auslauf lagen, wandern in die Kiste
      const w = s.welt?.[STALL_KARTE];
      const a = bereichVon(STALL_KARTE, 'auslauf');
      if (w && a) {
        st.eier = { ...st.eier };
        for (const [kk, o] of Object.entries(w.objekte)) {
          if (o?.t !== 'sammel' || (o.id !== 'ei' && o.id !== 'grossesei')) continue;
          const [x, y] = kk.split(',').map(Number);
          if (x < a.x || y < a.y || x >= a.x + a.w || y >= a.y + a.h) continue;
          st.eier[o.id] = ganz(st.eier[o.id], EIER_MAX) + 1;
          delete w.objekte[kk];
        }
      }
    }
    st.anzahl = ganz(st.anzahl, HUEHNER_MAX);
    st.neue = ganz(st.neue, st.anzahl);
    st.freundschaft = Number.isFinite(st.freundschaft) ? Math.max(0, Math.min(1000, st.freundschaft)) : 0;
    st.gestreichelt = !!st.gestreichelt;
    st.eier = { ei: ganz(st.eier?.ei, EIER_MAX), grossesei: ganz(st.eier?.grossesei, EIER_MAX) };
  },
  ladenWare: (ladenId) => LADEN_WARE[ladenId],
  tagEnde(s, bericht, r) {
    if (s.stall.bauMorgen) {
      s.stall.gebaut = true;
      s.stall.bauMorgen = false;
      kisteFreiRaeumen(s);
      bericht.meldungen.push('Bruno hat über Nacht deinen Hühnerstall gebaut! Davor steht die Eierkiste. Küken gibt es bei Ottilie.');
    }
    if (!s.stall.gebaut) return;
    nachtImStall(s, r);
    const n = eierGesamt(s);
    if (n > 0) bericht.meldungen.push(n === 1 ? 'In der Eierkiste vor dem Stall liegt 1 frisches Ei.' : `In der Eierkiste vor dem Stall liegen ${zahlen.format(n)} frische Eier.`);
  },
  gebaeude(ort, s) {
    if (ort.def.id !== STALL_KARTE || !s.stall?.gebaut) return undefined;
    return [stallGebaeude(ort.def)].filter(Boolean);
  },
  deko(ort, s) {
    if (ort.def.id !== STALL_KARTE) return undefined;
    if (s.stall?.gebaut) {
      const f = kistenFeld(ort.def);
      return f ? [{ typ: 'eierkiste', x: f.x, y: f.y, aktion: 'eierkiste' }] : undefined;
    }
    if (s.stall?.bauMorgen) return undefined;
    const g = stallGebaeude(ort.def);
    return g ? [{ typ: 'schild', x: g.tuer.x, y: g.tuer.y, aktion: 'text', text: 'Bauplatz. Bruno, der Schmied im Dorf, kann hier einen Hühnerstall bauen.' }] : undefined;
  },
});
