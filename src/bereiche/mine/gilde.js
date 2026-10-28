// Bereich „mine" – Alrik und die Abenteurergilde am Berg: Laden „gilde" (Waffen, Stiefel, Ringe,
// Bomben – je nach tiefster Ebene) und die Monsterziele mit Belohnungen. Den Raum mit Theke baut „berg".

import { ITEMS, npc, laden } from '../../daten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { fenster } from '../../spiel.js';

npc('alrik', {
  name: 'Alrik', voll: 'Alrik Steinhauer', rolle: 'Abenteurer',
  aussehen: { haut: '#d8a070', haare: '#2a2a30', frisur: 'kurz', hemd: '#5a5a6a', hose: '#2a2a30', bart: '#2a2a30' },
  geburtstag: { jz: 'winter', tag: 7 },
  liebt: ['diamant', 'rubin', 'drachenzahn'], mag: ['kat:mineral', 'kat:barren', 'kat:artefakt', 'fluegel'], magNicht: ['kat:ernte'], hasst: ['tulpe', 'narzisse'],
  heim: { karte: 'gilde', punkt: 'bett_alrik' },
  plan: { normal: [[600, null], [1200, 'gilde', 'theke'], [2200, null]] },
  zeilen: {
    allgemein: [
      'Die Mine hat hundertzwanzig Ebenen. Ich weiß das, weil ich bei hunderteinundzwanzig mit dem Kopf gegen den Boden gestoßen bin.',
      'Schleime sind nicht böse. Nur klebrig und hungrig. Wie Leute vor dem Frühstück.',
      'Felsenkrabben erkennst du daran, dass sie dich anschauen. Steine machen das selten.',
      'Hol dir eine ordentliche Waffe, bevor du ins Eis gehst. Die Frostschleime sind nicht nur kalt, sie sind auch unhöflich.',
      'Mit der Aktionstaste machst du mit deiner Waffe einen Spezialzug. Schwert: Block. Dolch: Stichhagel. Keule: Stampfer.',
      'Ganz unten, in der Lava, glühen die Steine. Und die Monster. Und manchmal die Schuhe.',
    ],
    fruehling: ['Frühling. Die Fledermäuse sind wieder wach. Leider.'],
    sommer: ['Im Sommer ist es in der Mine angenehm kühl. Bis zur Lava jedenfalls.'],
    herbst: ['Herbst ist Abenteuerzeit. Eigentlich ist immer Abenteuerzeit.'],
    winter: ['Im Winter bin ich am liebsten unter der Erde. Da schneit es nie.'],
    regen: ['Regen? Unten in der Mine merkt man davon nichts.'],
    herz: {
      2: 'Du hast Mut, {name}. Das sieht man an den Kratzern.',
      4: 'Ich hab mal einen Schleim gezähmt. Er hieß Klebi. Er ist dann weggeschleimt.',
      6: 'Mein Knie knackt, wenn ich die Leiter runtersteige. Erzähl das niemandem.',
      8: 'Wenn du ganz unten ankommst, erzähl mir, wie es da aussieht. Ich hab mich nie ganz getraut.',
      10: 'Niemand in Klarwasser ist so mutig wie du, {name}. Abgesehen von mir. Knapp.',
    },
    geburtstag: 'Mein Geburtstag! Ein Geschenk? Für mich? Ich bin gerührt. Kurz.',
    wieder: ['Pass auf dich auf da unten.', 'Bis zum nächsten Abenteuer!'],
  },
  antwort: { liebt: 'Ein Prachtstück! Danke!', mag: 'Gutes Zeug. Danke.', neutral: 'Danke.', magNicht: 'Hm. Brauch ich nicht.', hasst: 'Damit kann ich nichts anfangen.' },
});

const ab = (n) => (s) => (s.mine?.tiefste ?? 0) >= n;

/** Ware der Gilde: Preis in Gold, ab welcher tiefsten Ebene sie im Regal liegt. */
export const GILDE_WARE = [
  ['holzklinge', 250, 0], ['holzknueppel', 350, 5], ['eisendolch', 500, 10], ['stahlschwert', 800, 15],
  ['silbersaebel', 1500, 30], ['bleistab', 1800, 40], ['elfenklinge', 2500, 55], ['bergbreitschwert', 3400, 65],
  ['templerklinge', 4000, 80], ['lavakatana', 9000, 110],
  ['lederstiefel', 500, 10], ['wanderstiefel', 1200, 40],
  ['leuchtring', 1000, 10], ['magnetring', 1000, 20], ['anglerring', 1500, 20], ['schutzring', 1500, 40],
  ['kirschbombe', 150, 20], ['bombe', 400, 60],
];

laden('gilde', {
  name: 'Abenteurergilde', npc: 'alrik', ort: { karte: 'gilde', punkt: 'theke' },
  kauft: ['waffe', 'ring', 'stiefel'],
  ware: GILDE_WARE.map(([id, preis, n], i) => ({ id, preis, bedingung: ab(n), reihe: 10 + i })),
});

// ─── Monsterziele ───────────────────────────────────────────────────────────

/** Ziele: so viele Monster dieser Arten besiegen, dann gibt Alrik die Belohnung. */
export const ZIELE = [
  { id: 'schleime', name: 'Schleimjagd', typen: ['schleim', 'frostschleim', 'lavaschleim'], n: 150, belohnung: 'kriegerring' },
  { id: 'fledermaeuse', name: 'Flattern verboten', typen: ['fledermaus', 'frostfledermaus', 'lavafledermaus'], n: 80, belohnung: 'vampirring' },
  { id: 'krabben', name: 'Steine, die beißen', typen: ['felsenkrabbe', 'eiskrabbe', 'lavakrabbe'], n: 40, belohnung: 'eisenkappen' },
  { id: 'krabbeltiere', name: 'Krabbeltiere', typen: ['larve', 'kaefer', 'pilzling'], n: 60, belohnung: 'smaragdring' },
  { id: 'russ', name: 'Große Kehrwoche', typen: ['russwichtel'], n: 100, belohnung: 'ruhering' },
  { id: 'spuk', name: 'Spukende Gestalten', typen: ['geist', 'skelett'], n: 50, belohnung: 'rubinring' },
  { id: 'blech', name: 'Blechschaden', typen: ['metallkopf'], n: 30, belohnung: 'kriegshammer' },
  { id: 'schatten', name: 'Licht ins Dunkel', typen: ['schattenwesen', 'schattenschamane'], n: 40, belohnung: 'schattendolch' },
];

export const zielStand = (s, z) => z.typen.reduce((a, t) => a + (s.mine.besiegt[t] || 0), 0);
export const zielErreicht = (s, z) => zielStand(s, z) >= z.n;
export const zielAbholbar = (s, z) => zielErreicht(s, z) && !s.mine.belohnt.includes(z.id);

/** Belohnung abholen: { slot } oder { grund }. */
export function zielAbholen(s, id) {
  const z = ZIELE.find((x) => x.id === id);
  if (!z) return { grund: 'Dieses Ziel gibt es nicht.' };
  if (s.mine.belohnt.includes(id)) return { grund: 'Die Belohnung hast du schon.' };
  if (!zielErreicht(s, z)) return { grund: `Noch ${z.n - zielStand(s, z)} Monster.` };
  const slot = { id: z.belohnung, n: 1 };
  if (!ITEMS[slot.id]) return { grund: 'Alrik findet die Belohnung gerade nicht.' };
  if (L.platzFuer(s, slot) < 1) return { grund: 'Dein Rucksack ist voll.' };
  L.hinzufuegen(s, slot);
  s.mine.belohnt.push(id);
  return { slot };
}

system({
  name: 'mine-gilde',
  npcOptionen(n) {
    if (n.id !== 'alrik') return undefined;
    return [['Monsterziele', () => fenster('mine_ziele', {})]];
  },
});
