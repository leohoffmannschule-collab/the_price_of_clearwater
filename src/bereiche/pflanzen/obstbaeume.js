// Bereich „pflanzen": Obstbäume. Setzling aus Ottilies Laden aufstellen (auf farmbaren Karten,
// ringsum acht freie Felder), 28 Nächte Wachstum (auch im Winter), dann trägt der Baum in seiner
// Jahreszeit jede Nacht eine Frucht mehr, höchstens drei. Auf ganzjährigen Karten trägt er immer.
// Die Qualität der Früchte steigt mit jedem Jahr nach der Reife (Silber, Gold, Iridium).
//
// Objekt { t: 'obstbaum', art, tage, fr, alt }: art = Frucht-ID, tage = Wachstumsnächte,
// fr = hängende Früchte, alt = Nächte seit der Reife.

import { ITEMS, JZ_NAME, item, kategorie, objektTyp } from '../../daten.js';
import { karteHolen } from '../../karten.js';
import * as L from '../../logik.js';
import { ton, meldung, blaetter, ergebnisZeigen } from '../../spiel.js';
import { ganz } from '../../zufall.js';

kategorie('setzling', 'Setzling');

export const OBST_REIF = 28;
export const OBST_MAX = 3;
const TAGE_JAHR = 112;

/** Frucht-ID → Baum. */
export const OBSTBAEUME = {
  kirsche: { name: 'Kirsche', baum: 'Kirschbaum', jz: 'fruehling', kauf: 3400, preis: 80, f: '#c81e3a', energie: 38 },
  aprikose: { name: 'Aprikose', baum: 'Aprikosenbaum', jz: 'fruehling', kauf: 2000, preis: 50, f: '#f2a03a', energie: 38 },
  orange: { name: 'Orange', baum: 'Orangenbaum', jz: 'sommer', kauf: 4000, preis: 100, f: '#f2861e', energie: 38 },
  pfirsich: { name: 'Pfirsich', baum: 'Pfirsichbaum', jz: 'sommer', kauf: 6000, preis: 140, f: '#f6a07a', energie: 38 },
  apfel: { name: 'Apfel', baum: 'Apfelbaum', jz: 'herbst', kauf: 4000, preis: 100, f: '#d8302a', energie: 38 },
  granatapfel: { name: 'Granatapfel', baum: 'Granatapfelbaum', jz: 'herbst', kauf: 6000, preis: 140, f: '#a8203a', energie: 38 },
};

for (const [id, o] of Object.entries(OBSTBAEUME)) {
  item(id, { name: o.name, kat: 'ernte', preis: o.preis, bild: { art: id, f: o.f }, energie: o.energie, frucht: true, sorte: 'obst', text: `Vom ${o.baum}. Reif im ${JZ_NAME[o.jz]}.` });
  item(`${id}setzling`, {
    name: `${o.baum}-Setzling`, kat: 'setzling', preis: Math.floor(o.kauf / 2), kauf: o.kauf, bild: { art: 'pflanzen_setzling', f: o.f },
    aufstellbar: 'obstbaum', obstbaum: id,
    text: `Braucht ringsum ein freies Feld. Nach ${OBST_REIF} Tagen trägt er im ${JZ_NAME[o.jz]} jeden Tag eine ${o.name}.`,
  });
}

/** Wachstumsstufe 0–4 (4 = ausgewachsen). */
export const obstStufe = (o) => (o.tage >= OBST_REIF ? 4 : Math.floor((o.tage / OBST_REIF) * 4));
/** Qualität der Früchte nach dem Alter. */
export const obstQualitaet = (o) => Math.min(3, Math.floor((o.alt || 0) / TAGE_JAHR));

const NACHBARN = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const stoert = (o) => o && o.t !== 'hohesgras' && o.t !== 'sammel';

/** Liegt um (x, y) etwas im Weg? */
function eng(w, x, y) {
  return NACHBARN.some(([dx, dy]) => {
    const kk = L.k(x + dx, y + dy);
    const f = w.felder[kk];
    return stoert(w.objekte[kk]) || (f?.pflanze && !f.pflanze.tot);
  });
}

/** Früchte ernten (alle, die hängen). */
export function obstPfluecken(s, ort, x, y, o, erg = L.neuesErgebnis()) {
  if (!o.fr) return erg;
  const q = obstQualitaet(o);
  if (L.platzFuer(s, { id: o.art, n: 1, q }) < 1) { erg.grund = 'Dein Rucksack ist voll.'; return erg; }
  L.geben(s, ort, x, y, { id: o.art, n: o.fr, q }, erg);
  L.xpGeben(s, 'sammeln', 3 * o.fr, erg);
  o.fr = 0;
  erg.ok = true;
  return erg;
}

objektTyp('obstbaum', {
  blockiert: true,
  anlegen(o, slot) { o.art = ITEMS[slot.id].obstbaum; o.tage = 0; o.fr = 0; o.alt = 0; },
  platz({ s, ort, x, y }) {
    const { def, welt: w } = ort;
    if (!def.farmbar) return 'Obstbäume gedeihen nur auf deinem Hof.';
    const kk = L.k(x, y);
    if (w.felder[kk] || w.belag?.[kk] || !L.begehbar(s, def, w, x, y) || L.warpAn(def, x, y)) return 'Hier ist kein Platz.';
    if (eng(w, x, y)) return 'Ein Obstbaum braucht ringsum ein freies Feld.';
    return true;
  },
  interagieren({ s, ort, x, y, o }) {
    if (!o.fr) {
      if (obstStufe(o) < 4) meldung(`Der ${OBSTBAEUME[o.art]?.baum ?? 'Baum'} wächst noch – in ${OBST_REIF - o.tage} Tagen ist er groß.`);
      return;
    }
    const erg = obstPfluecken(s, ort, x, y, o);
    if (erg.ok) { ton('pflueck'); blaetter(x, y); }
    ergebnisZeigen(erg);
  },
  hinweis: ({ o }) => (o.fr ? `${ITEMS[o.art]?.name ?? 'Obst'} pflücken` : ''),
  axt({ s, ort, x, y, kk, o, erg, r, kraft }) {
    if (o.fr) obstPfluecken(s, ort, x, y, o, erg);
    const st = obstStufe(o);
    if (st === 0) {
      delete ort.welt.objekte[kk];
      L.geben(s, ort, x, y, { id: `${o.art}setzling`, n: 1 }, erg);
      erg.treffer = 'aufheben';
      return true;
    }
    o.hp = (o.hp ?? [0, 2, 4, 6, 10][st]) - kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      delete ort.welt.objekte[kk];
      L.geben(s, ort, x, y, { id: 'holz', n: st === 4 ? ganz(r, 8, 12) : st * 2 }, erg);
      if (st === 4) L.geben(s, ort, x, y, { id: 'harz', n: ganz(r, 1, 2) }, erg);
      L.xpGeben(s, 'sammeln', 4 * st, erg);
    }
    return true;
  },
});

/** Obstbäume über Nacht: wachsen, altern, tragen; beim Jahreszeitwechsel fällt fremdes Obst ab. */
export function obstNacht(s, jzWechsel) {
  const jz = L.jahreszeit(s);
  for (const [id, w] of Object.entries(s.welt)) {
    const def = karteHolen(id, s);
    if (!def) continue;
    for (const [kk, o] of Object.entries(w.objekte)) {
      if (o.t !== 'obstbaum') continue;
      const baum = OBSTBAEUME[o.art];
      if (!baum) continue;
      if (o.tage < OBST_REIF) {
        const [x, y] = L.ausK(kk);
        if (!eng(w, x, y)) { o.tage++; delete o.hp; }
        continue;
      }
      o.alt = (o.alt || 0) + 1;
      const saison = def.ganzjaehrig || baum.jz === jz;
      if (jzWechsel && !saison) o.fr = 0;
      if (saison) o.fr = Math.min(OBST_MAX, (o.fr || 0) + 1);
    }
  }
}
