// Bereich „pflanzen": Wildbäume (Eiche, Ahorn, Kiefer, Mahagoni) und ihre Wachstumsstufen.
//
//   Samen (eichel, ahornsamen, kiefernzapfen, mahagonisamen) aus der Hand auf den Hof säen →
//   { t: 'pflanzen_baumkeim', art, st: 0|1 }   Samen, Keimling (begehbar, Sense/Hacke/Axt entfernt ihn)
//   { t: 'pflanzen_jungbaum', art, st: 2|3|4, hp } Setzling, Busch, kleiner Baum (blockiert)
//   { t: 'baum', art, hp }                         ausgewachsen (so legen andere Bereiche Bäume an)
// Jede Nacht wächst ein junger Baum mit der Chance `wachsen` seiner Art um eine Stufe (nicht im
// Winter, außer auf ganzjährigen Karten); ausgewachsen wird er nur ohne ausgewachsenen Nachbarn.
// Ausgewachsene Bäume säen sich auf dem Hof selten selbst aus und tragen an manchen Tagen einen
// Samen, den man herunterschütteln kann (Aktionstaste).

import { ITEMS, OBJEKT_TYPEN, BAUM_ARTEN, item, kategorie, objektTyp, baumArt, itemBenutzen, erwartet } from '../../daten.js';
import { boden, karteHolen } from '../../karten.js';
import * as L from '../../logik.js';
import { ton, meldung, staub, blaetter } from '../../spiel.js';
import { ganz, hash } from '../../zufall.js';

kategorie('baumsamen', 'Baumsamen');

erwartet('eichenharz', 'ahornsirup', 'kiefernteer');

baumArt('eiche', { name: 'Eiche', samen: 'eichel', holz: [10, 14], beute: [['harz', 0.6, 1, 3], ['eichel', 0.5, 1, 2]], wachsen: 0.2, zapfen: { item: 'eichenharz', tage: 7 } });
baumArt('ahorn', { name: 'Ahorn', samen: 'ahornsamen', holz: [10, 14], beute: [['harz', 0.5, 1, 2], ['ahornsamen', 0.5, 1, 2]], wachsen: 0.2, zapfen: { item: 'ahornsirup', tage: 9 } });
baumArt('kiefer', { name: 'Kiefer', samen: 'kiefernzapfen', holz: [10, 14], beute: [['harz', 0.8, 1, 3], ['kiefernzapfen', 0.5, 1, 2]], wachsen: 0.2, zapfen: { item: 'kiefernteer', tage: 5 } });
baumArt('mahagoni', { name: 'Mahagoni', samen: 'mahagonisamen', holz: [8, 12], beute: [['hartholz', 1, 6, 8], ['harz', 0.4, 1, 2], ['mahagonisamen', 0.3, 1, 1]], wachsen: 0.15 });

/** Stufen 0–4 junger Bäume; ab Stufe 5 ist es ein Objekt „baum". */
export const BAUM_STUFEN = ['Samen', 'Keimling', 'Setzling', 'Busch', 'Kleiner Baum'];

item('eichel', { name: 'Eichel', kat: 'baumsamen', preis: 20, bild: { art: 'eichel', f: '#a8743a' }, baum: 'eiche', text: 'Auf dem Hof in die Erde gedrückt, wird daraus eine Eiche.' });
item('ahornsamen', { name: 'Ahornsamen', kat: 'baumsamen', preis: 5, bild: { art: 'ahornsamen', f: '#c89a5a' }, baum: 'ahorn', text: 'Fliegt wie ein kleiner Propeller. Wird zum Ahorn.' });
item('kiefernzapfen', { name: 'Kiefernzapfen', kat: 'baumsamen', preis: 5, bild: { art: 'kiefernzapfen', f: '#8a5a32' }, baum: 'kiefer', text: 'Gepflanzt wächst daraus eine Kiefer.' });
item('mahagonisamen', { name: 'Mahagonisamen', kat: 'baumsamen', preis: 50, bild: { art: 'mahagonisamen', f: '#7a3a2a' }, baum: 'mahagoni', text: 'Wächst langsam zu einem Baum voller Hartholz.' });

const istBaum = (o) => o && (o.t === 'baum' || o.t === 'pflanzen_jungbaum' || o.t === 'pflanzen_baumkeim');
const tagVon = (s) => L.tagNr(s.zeit);
/** Trägt ein ausgewachsener Baum heute einen Samen zum Schütteln? */
export const hatSamen = (s, x, y, o) => o.t === 'baum' && L.jahreszeit(s) !== 'winter' && o.gs !== tagVon(s) && hash(x, y, tagVon(s) * 7 + 3) < 0.12 && !!ITEMS[BAUM_ARTEN[o.art || 'eiche']?.samen];

// ─── Ausgewachsen ───────────────────────────────────────────────────────────

objektTyp('baum', {
  blockiert: true,
  axt({ s, ort, x, y, kk, o, erg, r, kraft }) {
    o.hp -= kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      const art = BAUM_ARTEN[o.art] ?? BAUM_ARTEN.eiche;
      L.geben(s, ort, x, y, { id: 'holz', n: ganz(r, art.holz[0], art.holz[1]) }, erg);
      for (const [id, chance, von, bis] of art.beute) if (r() < chance && ITEMS[id]) L.geben(s, ort, x, y, { id, n: ganz(r, von, bis) }, erg);
      L.xpGeben(s, 'sammeln', 12, erg);
      ort.welt.objekte[kk] = { t: 'stumpf', hp: 4, art: o.art };
      s.stats.baeume++;
      erg.gefallen = o.art || 'eiche';
    }
    return true;
  },
  interagieren({ s, ort, x, y, o }) {
    if (!hatSamen(s, x, y, o)) return;
    o.gs = tagVon(s);
    const id = BAUM_ARTEN[o.art || 'eiche'].samen;
    const erg = L.neuesErgebnis();
    L.geben(s, ort, x, y, { id, n: 1 }, erg);
    ton('pflueck');
    blaetter(x, y);
    meldung(`${ITEMS[id].name} heruntergeschüttelt.`);
  },
  hinweis: ({ s, x, y, o }) => (hatSamen(s, x, y, o) ? 'Baum schütteln' : ''),
});

objektTyp('stumpf', {
  blockiert: true,
  axt({ s, ort, x, y, kk, o, erg, r, kraft }) {
    o.hp -= kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      delete ort.welt.objekte[kk];
      L.geben(s, ort, x, y, { id: o.art === 'mahagoni' ? 'hartholz' : 'holz', n: o.art === 'mahagoni' ? 2 : ganz(r, 3, 5) }, erg);
      L.xpGeben(s, 'sammeln', 2, erg);
    }
    return true;
  },
});

// ─── Jung ───────────────────────────────────────────────────────────────────

function keimWeg({ s, ort, x, y, kk, o, erg }) {
  delete ort.welt.objekte[kk];
  const samen = BAUM_ARTEN[o.art]?.samen;
  if (o.st === 0 && ITEMS[samen]) L.geben(s, ort, x, y, { id: samen, n: 1 }, erg);
  erg.treffer = 'unkraut';
  return true;
}
objektTyp('pflanzen_baumkeim', {
  axt: keimWeg, hacke: keimWeg, sense: keimWeg, waffe: keimWeg, spitzhacke: keimWeg,
  hinweis: ({ o }) => `${BAUM_ARTEN[o.art]?.name ?? 'Baum'}: ${BAUM_STUFEN[o.st] ?? 'Keimling'}`,
});

objektTyp('pflanzen_jungbaum', {
  blockiert: true,
  axt({ s, ort, x, y, kk, o, erg, r, kraft }) {
    o.hp = (o.hp ?? o.st - 1) - kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      delete ort.welt.objekte[kk];
      const holz = [0, 0, 0, ganz(r, 1, 2), ganz(r, 2, 4)][o.st] ?? 0;
      if (holz) L.geben(s, ort, x, y, { id: o.art === 'mahagoni' ? 'hartholz' : 'holz', n: holz }, erg);
      L.xpGeben(s, 'sammeln', 1, erg);
    }
    return true;
  },
  sense({ ort, kk, o, erg }) {
    if (o.st > 2) return false;
    delete ort.welt.objekte[kk];
    erg.treffer = 'unkraut';
    return true;
  },
  hinweis: ({ o }) => `${BAUM_ARTEN[o.art]?.name ?? 'Baum'}: ${BAUM_STUFEN[o.st] ?? ''}`,
});

// ─── Säen ───────────────────────────────────────────────────────────────────

/** Baumsamen aus der Hand: auf farmbaren Karten auf freien Boden (oder ein leeres Beet). */
export function baumSaeen(s, ort, x, y, idx) {
  const slot = s.spieler.inv[idx];
  const art = ITEMS[slot?.id]?.baum;
  if (!BAUM_ARTEN[art]) return { grund: null };
  const { def, welt: w } = ort;
  if (!def.farmbar) return { grund: 'Bäume pflanzt du am besten auf deinem Hof.' };
  const kk = L.k(x, y);
  const f = w.felder[kk];
  if (f?.pflanze) return { grund: 'Hier wächst schon etwas.' };
  if (w.objekte[kk] || w.belag?.[kk] || !L.begehbar(s, def, w, x, y) || L.warpAn(def, x, y)) return { grund: 'Hier ist kein Platz.' };
  if (f) delete w.felder[kk];
  w.objekte[kk] = { t: 'pflanzen_baumkeim', art, st: 0 };
  L.entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

itemBenutzen((c) => !!c.it.baum && c.it.kat === 'baumsamen', (c) => {
  if (c.f.x === c.x && c.f.y === c.y) { meldung('Dort stehst du gerade selbst.'); return; }
  const r = baumSaeen(c.s, c.ort, c.x, c.y, c.idx);
  if (r.ok) { ton('saat'); staub(c.x, c.y, '#6a4a2a'); } else if (r.grund) meldung(r.grund);
});

// ─── Über Nacht ─────────────────────────────────────────────────────────────

function ausgewachsenerNachbar(w, x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && w.objekte[L.k(x + dx, y + dy)]?.t === 'baum') return true;
  return false;
}
function baumNah(w, x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (istBaum(w.objekte[L.k(x + dx, y + dy)])) return true;
  return false;
}

/** Junge Bäume wachsen, alte säen sich (auf farmbaren Außenkarten) aus. */
export function baeumeNacht(s, r) {
  const winter = L.jahreszeit(s) === 'winter';
  for (const [id, w] of Object.entries(s.welt)) {
    const def = karteHolen(id, s);
    if (!def) continue;
    if (winter && !def.ganzjaehrig) continue;
    const ort = { def, welt: w };
    const saeen = def.farmbar && def.aussen && !def.ganzjaehrig;
    const neu = [];
    for (const [kk, o] of Object.entries(w.objekte)) {
      if (o.t === 'pflanzen_baumkeim' || o.t === 'pflanzen_jungbaum') {
        const art = BAUM_ARTEN[o.art] ?? BAUM_ARTEN.eiche;
        if (r() >= (art.wachsen ?? 0.2)) continue;
        const [x, y] = L.ausK(kk);
        if (o.st >= 4) {
          if (ausgewachsenerNachbar(w, x, y)) continue;
          w.objekte[kk] = { t: 'baum', art: o.art, hp: 8 };
        } else if (o.st === 1) w.objekte[kk] = { t: 'pflanzen_jungbaum', art: o.art, st: 2, hp: 1 };
        else { o.st++; if (o.t === 'pflanzen_jungbaum') o.hp = o.st - 1; }
      } else if (o.t === 'baum' && saeen && r() < 0.02) neu.push([kk, o.art || 'eiche']);
    }
    for (const [kk, art] of neu) {
      const [x, y] = L.ausK(kk);
      const zx = x + ganz(r, -3, 3);
      const zy = y + ganz(r, -3, 3);
      if (boden(def, zx, zy) !== '.' || !L.feldFrei(s, ort, zx, zy) || baumNah(w, zx, zy)) continue;
      if (def.frei?.some((b) => L.imBereich(b, zx, zy))) continue;
      w.objekte[L.k(zx, zy)] = { t: 'pflanzen_baumkeim', art, st: 0 };
    }
  }
}

export const istJungerBaum = (o) => !!o && !!OBJEKT_TYPEN[o.t] && (o.t === 'pflanzen_baumkeim' || o.t === 'pflanzen_jungbaum');
