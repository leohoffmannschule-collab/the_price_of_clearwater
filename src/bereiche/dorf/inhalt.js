// Bereich „dorf": die große Dorfkarte (karte-dorf.js) und ihre Innenräume (innen.js), die Mühle als
// Gebäude und von innen, die Läden von Ottilie, Bruno und Hannes, Rucksack und Werkzeug-Upgrades,
// Öffnungszeiten der Türen und die Mülltonnen. Ware anderer Bereiche in diesen Läden (Saatgut,
// Küken, Stall …) kommt über den Hook ladenWare.

import { ITEMS, WERKZEUG_STUFEN, AUFRUESTBAR, KANNE_INHALT, WERKZEUG_ARTEN, item, kategorie, laden, spezialWare, bedingung } from '../../daten.js';
import { bodenTyp } from '../../karten.js';
import { system } from '../../system.js';
import { S, dekoAktion, fenster, dialog, geben } from '../../spiel.js';
import { zufall } from '../../zufall.js';
import * as L from '../../logik.js';
import './karte-dorf.js';
import './innen.js';

// ─── Bodenzeichen des Dorfs ─────────────────────────────────────────────────

bodenTyp('f', { name: 'blumenwiese', begehbar: true });
bodenTyp('g', { name: 'kies', begehbar: true });
bodenTyp('i', { name: 'friedhofserde', begehbar: true });
bodenTyp('j', { name: 'zierpflaster', begehbar: true });

// ─── Öffnungszeiten der Türen (nur für die Spielerin; Dorfbewohner gehen immer durch) ──

const offen = (von, bis) => (s) => {
  const m = s.zeit.minute;
  return m >= L.planMinute(von) && m < L.planMinute(bis);
};
bedingung('dorf_ladenOffen', offen(830, 1730));
bedingung('dorf_rathausOffen', offen(800, 1700));
bedingung('dorf_gasthausOffen', offen(1100, 2600));
bedingung('dorf_arztOffen', offen(900, 1600));
bedingung('dorf_museumOffen', offen(1000, 1700));
bedingung('dorf_schmiedeOffen', offen(800, 1800));
bedingung('dorf_hausRosaOffen', offen(800, 2000));

// ─── Zustand ────────────────────────────────────────────────────────────────

system({
  name: 'dorf',
  ergaenzen(s) { s.dorf ??= { muell: {} }; s.dorf.muell ??= {}; },
});

// ─── Die Mühle von innen: Mühlstein und Bündel-Tafel öffnen dasselbe Fenster wie das Gebäude ──

dekoAktion('dorf_muehle', () => fenster('muehle'), (d, s) => (s.muehle ? 'Der Mühlstein dreht sich' : 'Die alte Mühle'));

// ─── Mülltonnen: einmal am Tag durchsuchbar, mit kleiner Fundchance ─────────

const MUELL_FUNDE = ['faser', 'kohle', 'stein', 'holz', 'harz', 'stiefel', 'treibholz', 'kaffee', 'brot'];
dekoAktion('dorf_muelltonne', (d) => {
  const s = S.s;
  s.dorf ??= { muell: {} };
  const key = `${S.ort.def.id}:${d.x},${d.y}`;
  const tag = L.tagNr(s.zeit);
  if (s.dorf.muell[key] === tag) { dialog(null, ['Hier hast du heute schon gewühlt. Der Deckel klappert vorwurfsvoll.']); return; }
  s.dorf.muell[key] = tag;
  const r = zufall(tag * 7919 + d.x * 131 + d.y * 17 + 5);
  const w = r();
  if (w < 0.55) { dialog(null, [['Nur Apfelgriebsche und eine leere Dose.', 'Eine Fischgräte. Sie hat ihr Leben gelebt.', 'Zeitungen von gestern. Alles halb so schlimm.', 'Ein einzelner Socke. Der andere ist sicher auch irgendwo.'][Math.floor(r() * 4)]]); return; }
  if (w < 0.8) {
    const n = 1 + Math.floor(r() * 12);
    s.spieler.gold += n;
    dialog(null, [`Zwischen den Resten klimpert etwas: ${n} Gold!`]);
    return;
  }
  const pool = MUELL_FUNDE.filter((id) => ITEMS[id]);
  if (!pool.length) { dialog(null, ['Nichts als Müll.']); return; }
  const id = pool[Math.floor(r() * pool.length)];
  geben({ id, n: 1 });
}, 'Durchsuchen');

// ─── Gasthaus-Küche ─────────────────────────────────────────────────────────

kategorie('essen', 'Essen');
item('brot', { name: 'Brot', kat: 'essen', preis: 60, bild: { art: 'brot' }, energie: 50, text: 'Knusprige Kruste.' });
item('salat', { name: 'Salat', kat: 'essen', preis: 110, bild: { art: 'salat' }, energie: 113, text: 'Frisch und knackig.' });
item('kaffee', { name: 'Kaffee', kat: 'essen', preis: 150, bild: { art: 'kaffee' }, energie: 3, tempo: 120, text: 'Zwei Stunden lang flinke Füße.' });
item('fischsuppe', { name: 'Fischsuppe', kat: 'essen', preis: 125, bild: { art: 'suppe' }, energie: 150, text: 'Nach Lenes Rezept. Mit Butter.' });

// ─── Läden ──────────────────────────────────────────────────────────────────

laden('laden', {
  name: 'Krämerladen', npc: 'ottilie', ort: { karte: 'laden', punkt: 'theke' },
  kauft: ['ernte', 'sammel', 'artisan', 'tier'],
  ware: [
    { spezial: 'rucksack', reihe: 90 },
  ],
});

laden('schmiede', {
  name: 'Schmiede', npc: 'bruno', ort: { karte: 'dorf', punkt: 'amboss' },
  kauft: ['erz', 'barren', 'mineral'],
  ware: [
    { id: 'kohle', preis: 60 },
    { id: 'kupfererz', preis: 75 },
    { id: 'eisenerz', preis: 150 },
    { id: 'golderz', preis: 400 },
    { spezial: 'upgrade' },
  ],
});

laden('gasthaus', {
  name: 'Gasthaus „Zum Krug"', npc: 'hannes', ort: { karte: 'gasthaus', punkt: 'theke' },
  kauft: ['fisch', 'ernte'],
  ware: [
    { id: 'brot', preis: 120 },
    { id: 'salat', preis: 220 },
    { id: 'kaffee', preis: 300 },
    { id: 'fischsuppe', preis: 250 },
  ],
});

spezialWare('rucksack', {
  name: 'Großer Rucksack', preis: 2000, text: '36 statt 24 Plätze.',
  verfuegbar: (s) => s.spieler.invGroesse < 36,
  kaufen(s) {
    const sp = s.spieler;
    sp.invGroesse = 36;
    while (sp.inv.length < 36) sp.inv.push(null);
    return { text: 'Dein Rucksack hat jetzt 36 Plätze.' };
  },
});

/** Bruno verbessert Werkzeuge um eine Stufe – nur, wenn es den Barren dafür gibt. */
spezialWare('upgrade', {
  angebote(s) {
    const liste = [];
    for (const wz of AUFRUESTBAR) {
      const l = s.spieler.werkzeug[wz] || 0;
      const st = WERKZEUG_STUFEN[l + 1];
      if (!st || !ITEMS[st.barren] || !L.hat(s, wz)) continue;
      liste.push({
        spezial: 'upgrade', werkzeug: wz, stufe: l + 1, name: L.werkzeugName(wz, l + 1), preis: st.kosten,
        zutaten: { [st.barren]: 5 }, text: WERKZEUG_ARTEN[ITEMS[wz].werkzeug]?.upgradeText || '',
      });
    }
    return liste;
  },
  kaufen(s, { ware }) {
    s.spieler.werkzeug[ware.werkzeug] = ware.stufe;
    if (ware.werkzeug === 'giesskanne') s.spieler.wasser = KANNE_INHALT[ware.stufe];
    return { text: `Fertig! Deine ${ware.name} fühlt sich gleich ganz anders an.` };
  },
});
