// Bereich „tiere": der Hühnerstall (von Bruno gebaut, steht im Hof-Bereich „stall"),
// Küken aus dem Krämerladen (Hook ladenWare), Hühner im Auslauf, Streicheln, Eier am Morgen.
// Dazu Greta (Zimmerei am Berg) und Wilma (Ranch im Wald) als schlichte Platzhalter samt Läden;
// die Räume dafür bauen „berg" und „wildnis".

import { T, item, kategorie, spezialWare, bedingung, npc, laden } from '../../daten.js';
import { bereichVon } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { S, gebaeudeAktion, dialog, ton, herzchen, meldung } from '../../spiel.js';

/** Karte, auf der der Stall steht; dort braucht es die Bereiche „stall" und „auslauf". */
const STALL_KARTE = 'hof';

kategorie('tier', 'Tierprodukt');
item('ei', { name: 'Ei', kat: 'tier', preis: 50, bild: { art: 'ei', f: '#f4ede0' }, energie: 25, text: 'Frisch aus dem Hühnerstall.' });
item('grossesei', { name: 'Großes Ei', kat: 'tier', preis: 95, bild: { art: 'ei', f: '#f8f1e4', gross: true }, energie: 38, text: 'Von einer sehr glücklichen Henne.' });

export const HUEHNER_NAMEN = ['Henriette', 'Gackeline', 'Erna', 'Frau Pickel', 'Rosi', 'Berta', 'Klara', 'Hilde'];

bedingung('stall', (s) => !!s.stall?.gebaut);
bedingung('keinStall', (s) => !s.stall?.gebaut && !s.stall?.bauMorgen);

spezialWare('kueken', {
  name: 'Küken', preis: 800, text: 'Zieht sofort in deinen Hühnerstall. Legt jeden Morgen ein Ei.',
  verfuegbar: (s) => s.stall.gebaut && s.stall.huehner.length < 8,
  kaufen(s) {
    const name = HUEHNER_NAMEN[s.stall.huehner.length % HUEHNER_NAMEN.length];
    s.stall.huehner.push({ name, freundschaft: 0, gestreichelt: false, neu: true });
    return { text: 'Ein Küken ist in deinen Stall gezogen.' };
  },
});

spezialWare('stall', {
  name: 'Hühnerstall', preis: 3000, zutaten: { holz: 150, stein: 50 },
  text: 'Bruno baut ihn über Nacht neben dein Haus. Danach gibt es bei Ottilie Küken.',
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

// ─── Eier über Nacht ────────────────────────────────────────────────────────

function eierLegen(s, r, bericht) {
  const { def, welt: w } = L.ortVon(s, STALL_KARTE);
  const a = bereichVon(def, 'auslauf');
  if (!a) return;
  let gelegt = 0;
  for (const h of s.stall.huehner) {
    h.freundschaft = Math.max(0, Math.min(1000, h.freundschaft + (h.gestreichelt ? 15 : -5)));
    h.gestreichelt = false;
    if (h.neu) { h.neu = false; continue; }
    const id = r() < (h.freundschaft / 1000) * 0.6 ? 'grossesei' : 'ei';
    for (let versuch = 0; versuch < 40; versuch++) {
      const x = a.x + Math.floor(r() * a.w);
      const y = a.y + Math.floor(r() * a.h);
      const kk = L.k(x, y);
      if (w.objekte[kk] || w.felder[kk] || !L.begehbar(s, def, w, x, y)) continue;
      w.objekte[kk] = { t: 'sammel', id };
      gelegt++;
      break;
    }
  }
  if (gelegt) bericht.meldungen.push(gelegt === 1 ? 'Im Auslauf liegt ein frisches Ei.' : `Im Auslauf liegen ${gelegt} frische Eier.`);
}

// ─── Hühner im Auslauf (Laufzeit) ───────────────────────────────────────────

export function huehnerDraussen() {
  const s = S.s;
  return S.ort?.def.id === STALL_KARTE && !!s.stall?.gebaut && s.zeit.minute < 1110 && !L.regnet(s) && s.zeit.wetter !== 'schnee' && L.jahreszeit(s) !== 'winter';
}

function huehnerAufstellen() {
  S.huehner = [];
  if (S.ort.def.id !== STALL_KARTE || !S.s.stall.gebaut) return;
  const a = bereichVon(S.ort.def, 'auslauf');
  if (!a) return;
  S.s.stall.huehner.forEach((h, i) => {
    S.huehner.push({ i, x: (a.x + 1 + ((i * 3) % (a.w - 2))) * T + 8, y: (a.y + 1 + (i % 3)) * T + 12, zx: null, zy: null, t: Math.random() * 2, pick: 0, links: Math.random() < 0.5, anim: 0 });
  });
}

function huehnerUpdate(dt) {
  if (!huehnerDraussen()) return;
  const a = bereichVon(S.ort.def, 'auslauf');
  if (!a) return;
  for (const h of S.huehner) {
    h.t -= dt;
    h.anim += dt;
    if (h.pick > 0) h.pick -= dt;
    if (h.t <= 0) {
      if (Math.random() < 0.4) { h.pick = 0.9; h.zx = null; h.t = 1 + Math.random() * 2; }
      else { h.zx = (a.x + 0.5 + Math.random() * (a.w - 1)) * T; h.zy = (a.y + 0.5 + Math.random() * (a.h - 1)) * T + 6; h.t = 2 + Math.random() * 3; }
    }
    if (h.zx != null) {
      const dx = h.zx - h.x;
      const dy = h.zy - h.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) { h.zx = null; continue; }
      const nx = h.x + (dx / d) * 14 * dt;
      const ny = h.y + (dy / d) * 14 * dt;
      if (L.begehbar(S.s, S.ort.def, S.ort.welt, Math.floor(nx / T), Math.floor((ny - 3) / T))) { h.x = nx; h.y = ny; h.links = dx < 0; }
      else h.zx = null;
    }
  }
}

function huhnAn(x, y) {
  if (!huehnerDraussen()) return null;
  return S.huehner.find((h) => Math.abs(h.x - (x * T + 8)) < 12 && Math.abs(h.y - (y * T + 12)) < 12);
}

function huhnStreicheln(h) {
  const huhn = S.s.stall.huehner[h.i];
  if (huhn.gestreichelt) { dialog(null, [`${huhn.name} gackert zufrieden. Für heute ist sie glücklich.`]); return; }
  huhn.gestreichelt = true;
  h.pick = 0.6;
  ton('gack');
  herzchen(h.x, h.y);
  meldung(`${huhn.name} mag das.`);
}

gebaeudeAktion('stall', () => {
  const h = S.s.stall.huehner;
  if (!h.length) { dialog(null, ['Der Stall ist noch leer. Küken gibt es bei Ottilie im Krämerladen.']); return; }
  if (!huehnerDraussen()) {
    let n = 0;
    for (const huhn of h) {
      if (huhn.gestreichelt) continue;
      huhn.gestreichelt = true;
      n++;
    }
    if (n) { ton('gack'); herzchen(S.sp.x, S.sp.y); }
    dialog(null, [n ? `Du streichelst ${n === 1 ? 'dein Huhn' : `deine ${n} Hühner`} im Stall. Zufriedenes Gackern.` : 'Die Hühner dösen zufrieden im Stroh.']);
  } else {
    dialog(null, [`${h.length} ${h.length === 1 ? 'Huhn' : 'Hühner'}. Sie scharren draußen im Auslauf. Streicheln macht sie glücklich – glückliche Hühner legen große Eier.`]);
  }
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
    sommer: ['Im Sommer wollen die Tiere raus. Ich auch, ehrlich gesagt.'],
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
    s.stall ??= { gebaut: false, bauMorgen: false, huehner: [] };
  },
  ladenWare: (ladenId) => LADEN_WARE[ladenId],
  tagEnde(s, bericht, r) {
    if (s.stall.bauMorgen) {
      s.stall.gebaut = true;
      s.stall.bauMorgen = false;
      bericht.meldungen.push('Bruno hat über Nacht deinen Hühnerstall gebaut! Küken gibt es bei Ottilie.');
    }
    if (s.stall.gebaut) eierLegen(s, r, bericht);
  },
  gebaeude(ort, s) {
    if (ort.def.id !== STALL_KARTE || !s.stall?.gebaut) return undefined;
    return [stallGebaeude(ort.def)].filter(Boolean);
  },
  deko(ort, s) {
    if (ort.def.id !== STALL_KARTE || s.stall?.gebaut || s.stall?.bauMorgen) return undefined;
    const g = stallGebaeude(ort.def);
    return g ? [{ typ: 'schild', x: g.tuer.x, y: g.tuer.y, aktion: 'text', text: 'Bauplatz. Bruno, der Schmied im Dorf, kann hier einen Hühnerstall bauen.' }] : undefined;
  },
  karteBetreten() { huehnerAufstellen(); },
  update(dt) { huehnerUpdate(dt); },
  interagieren(ctx) {
    if (ctx.npc) return undefined;
    const h = huhnAn(ctx.x, ctx.y);
    if (!h) return undefined;
    huhnStreicheln(h);
    return true;
  },
  hinweis(ctx) {
    if (!ctx.npc && huhnAn(ctx.x, ctx.y)) return 'Huhn streicheln';
    return undefined;
  },
});
