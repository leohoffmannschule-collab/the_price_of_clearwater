// Bereich „mine" – die Monster der drei Schichten, ihr Verhalten (KI aus src/mine.js) und ihre Beute,
// dazu die Tabellen, welche Monster auf welcher Ebene vorkommen. Bilder in kunst-monster.js.

import { monster } from '../../mine.js';

// ─── Schicht 1: Erde (Ebene 1–39) ───────────────────────────────────────────

monster('schleim', {
  name: 'Grünschleim', hp: 24, schaden: 5, tempo: 34, xp: 3, farbe: '#6fc94a', art: 'schleim', ki: 'huepfer',
  beute: [['schleim', 0.8, 1, 2], ['kohle', 0.05, 1, 1], ['kupfererz', 0.05, 1, 2]],
});
monster('fledermaus', {
  name: 'Fledermaus', hp: 22, schaden: 6, tempo: 42, xp: 6, farbe: '#6a5878', art: 'fledermaus', ki: 'flatterer', fliegt: true,
  beute: [['fluegel', 0.35, 1, 1], ['kohle', 0.04, 1, 1]],
});
monster('felsenkrabbe', {
  name: 'Felsenkrabbe', hp: 30, schaden: 6, verteidigung: 3, tempo: 40, xp: 6, farbe: '#9a8a74', art: 'krabbe', ki: 'tarner', getarnt: true, schwer: 0.3,
  beute: [['stein', 0.6, 2, 4], ['kupfererz', 0.3, 1, 3], ['geode', 0.06, 1, 1]],
  text: 'Sieht aus wie ein Stein. Ist keiner.',
});
monster('larve', {
  name: 'Höhlenlarve', hp: 26, schaden: 5, tempo: 22, xp: 4, farbe: '#d8c890', art: 'larve', ki: 'kriecher',
  beute: [['faser', 0.3, 1, 2], ['kaeferpanzer', 0.08, 1, 1]],
});
monster('russwichtel', {
  name: 'Rußwichtel', hp: 18, schaden: 6, tempo: 48, xp: 4, farbe: '#2a2a30', art: 'wichtel', ki: 'huepfer',
  pause: [0.12, 0.45], sprung: 0.3, sammeln: 0.08, unruhig: true, radius: 8,
  beute: [['kohle', 0.55, 1, 2], ['geode', 0.02, 1, 1]],
});
monster('kaefer', {
  name: 'Panzerkäfer', hp: 45, schaden: 8, verteidigung: 1, tempo: 32, xp: 9, farbe: '#3a6a5a', art: 'kaefer', ki: 'anlauf', schwer: 0.3,
  beute: [['kaeferpanzer', 0.5, 1, 1], ['eisenerz', 0.05, 1, 2]],
});

// ─── Schicht 2: Eis (Ebene 40–79) ───────────────────────────────────────────

monster('frostschleim', {
  name: 'Frostschleim', hp: 60, schaden: 9, tempo: 38, xp: 8, farbe: '#7cc4ee', art: 'schleim', ki: 'huepfer',
  beute: [['schleim', 0.8, 1, 3], ['traene', 0.05, 1, 1], ['eisenerz', 0.06, 1, 2]],
});
monster('frostfledermaus', {
  name: 'Frostfledermaus', hp: 45, schaden: 10, tempo: 50, xp: 10, farbe: '#8eb0d0', art: 'fledermaus', ki: 'flatterer', fliegt: true,
  beute: [['fluegel', 0.4, 1, 2], ['traene', 0.03, 1, 1]],
});
monster('eiskrabbe', {
  name: 'Frostkrabbe', hp: 70, schaden: 11, verteidigung: 5, tempo: 44, xp: 12, farbe: '#a8b8c8', art: 'krabbe', ki: 'tarner', getarnt: true, schwer: 0.3,
  beute: [['stein', 0.5, 2, 5], ['eisenerz', 0.3, 1, 3], ['frostgeode', 0.08, 1, 1]],
});
monster('geist', {
  name: 'Geist', hp: 80, schaden: 12, tempo: 30, xp: 15, farbe: '#e8f0f8', art: 'geist', ki: 'geist', fliegt: true, durchWand: true, jagdWeite: 12 * 16,
  beute: [['geisterhauch', 0.5, 1, 1], ['frostgeode', 0.03, 1, 1]],
});
monster('skelett', {
  name: 'Skelett', hp: 90, schaden: 12, verteidigung: 1, tempo: 34, xp: 16, farbe: '#ece4d0', art: 'skelett', ki: 'werfer', geschoss: 'knochen', wurfSchaden: 10, wurfTempo: 120,
  beute: [['knochensplitter', 0.6, 1, 2], ['knochenkeule', 0.01, 1, 1], ['eisenerz', 0.05, 1, 2]],
});

// ─── Schicht 3: Lava (Ebene 80–120) ─────────────────────────────────────────

monster('lavaschleim', {
  name: 'Lavaschleim', hp: 120, schaden: 16, tempo: 42, xp: 18, farbe: '#e8603e', art: 'schleim', ki: 'huepfer',
  beute: [['schleim', 0.8, 2, 3], ['glutessenz', 0.1, 1, 1], ['golderz', 0.08, 1, 2]],
});
monster('lavafledermaus', {
  name: 'Lavafledermaus', hp: 90, schaden: 16, tempo: 58, xp: 20, farbe: '#b84a32', art: 'fledermaus', ki: 'flatterer', fliegt: true, sturz: true,
  beute: [['fluegel', 0.5, 1, 2], ['glutessenz', 0.05, 1, 1], ['rubin', 0.01, 1, 1]],
});
monster('lavakrabbe', {
  name: 'Magmakrabbe', hp: 140, schaden: 18, verteidigung: 8, tempo: 46, xp: 22, farbe: '#7a6460', art: 'krabbe', ki: 'tarner', getarnt: true, schwer: 0.3,
  beute: [['stein', 0.5, 2, 5], ['golderz', 0.35, 1, 3], ['magmageode', 0.1, 1, 1]],
});
monster('metallkopf', {
  name: 'Metallkopf', hp: 160, schaden: 15, verteidigung: 6, tempo: 26, xp: 22, farbe: '#8a92a0', art: 'metallkopf', ki: 'kriecher', schwer: 0.6,
  beute: [['eisenerz', 0.3, 1, 3], ['golderz', 0.3, 1, 2], ['iridiumerz', 0.02, 1, 1]],
});
monster('schattenwesen', {
  name: 'Schattenwesen', hp: 180, schaden: 22, verteidigung: 2, tempo: 46, xp: 28, farbe: '#3a2a5a', art: 'schatten', ki: 'springer', radius: 11,
  beute: [['schattenessenz', 0.5, 1, 1], ['kohle', 0.2, 1, 2], ['omnigeode', 0.02, 1, 1], ['schattendolch', 0.004, 1, 1]],
});
monster('schattenschamane', {
  name: 'Schattenschamane', hp: 110, schaden: 14, tempo: 30, xp: 26, farbe: '#4a3a6a', art: 'schamane', ki: 'werfer', geschoss: 'feuer', wurfSchaden: 18, wurfTempo: 105, wurfPause: 2.8,
  beute: [['schattenessenz', 0.4, 1, 1], ['glutessenz', 0.2, 1, 1], ['lavakatana', 0.003, 1, 1]],
});
monster('pilzling', {
  name: 'Pilzling', hp: 100, schaden: 14, verteidigung: 2, tempo: 40, xp: 16, farbe: '#a84ad8', art: 'pilzling', ki: 'tarner', getarnt: true, weckWeite: 2,
  beute: [['pilz', 0.5, 1, 2], ['geode', 0.05, 1, 1], ['magmageode', 0.05, 1, 1]],
});

// ─── Wer kommt wo vor ───────────────────────────────────────────────────────

/** [Monster-ID, Gewicht, ab Ebene] je Schicht; dazu besondere Ebenen. */
export const MONSTER_TABELLE = {
  erde: [['schleim', 5, 1], ['fledermaus', 3, 3], ['felsenkrabbe', 2, 5], ['larve', 3, 8], ['russwichtel', 2, 15], ['kaefer', 2, 25]],
  eis: [['frostschleim', 5, 40], ['frostfledermaus', 3, 40], ['eiskrabbe', 2, 42], ['russwichtel', 3, 40], ['geist', 1.5, 50], ['skelett', 1.5, 60]],
  lava: [['lavaschleim', 4, 80], ['lavafledermaus', 3, 80], ['lavakrabbe', 2, 82], ['metallkopf', 2, 85], ['schattenwesen', 2, 90], ['schattenschamane', 1.5, 95]],
  // Dunkle Ebenen: mehr von dem, was das Licht scheut
  dunkel_erde: [['fledermaus', 5, 1], ['russwichtel', 3, 1], ['larve', 2, 1]],
  dunkel_eis: [['geist', 4, 1], ['skelett', 3, 1], ['frostfledermaus', 2, 1]],
  dunkel_lava: [['schattenwesen', 4, 1], ['schattenschamane', 3, 1], ['lavafledermaus', 2, 1]],
  pilz: [['pilzling', 5, 1], ['lavafledermaus', 2, 1], ['schattenschamane', 1, 1]],
};
