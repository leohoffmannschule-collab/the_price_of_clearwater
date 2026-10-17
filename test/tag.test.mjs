// Spielt ganze Tage ohne Bildschirm durch: Uhr, Wege der Dorfbewohner, Ohnmacht um zwei Uhr.
// Aufruf: node test/tag.test.mjs
import assert from 'node:assert/strict';
import { T } from '../src/daten.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, neuerMorgen } from '../src/spiel.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

const E = {
  richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
  aktion: { gedrueckt: false }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
};

function bis(minute, max = 60000) {
  for (let i = 0; i < max && S.s.zeit.minute < minute && !S.pause; i++) update(0.05, E);
}
const feldVon = (n) => [Math.floor(n.x / T), Math.floor((n.y - 3) / T)];
const npc = (id) => S.npcs.find((n) => n.id === id);

console.log('\nEin Tag in Klarwasser');
const s = L.neuesSpiel({ seed: 99 });
let berichte = 0;
const hooks = { tagEnde: () => { berichte++; } };
spielStarten(s, hooks);

test('morgens um sechs sind alle noch zu Hause', () => {
  for (const n of S.npcs) assert.equal(n.karte, null, n.id);
});

test('um zehn steht Ottilie hinter der Theke und Bruno am Amboss', () => {
  bis(600);
  assert.equal(npc('ottilie').karte, 'laden');
  assert.deepEqual(feldVon(npc('ottilie')), [3, 3]);
  assert.equal(npc('bruno').karte, 'dorf');
  assert.deepEqual(feldVon(npc('bruno')), [7, 24]);
  assert.equal(npc('lene').karte, 'strand');
  assert.deepEqual(feldVon(npc('lene')), [27, 10]);
});

test('mittags wechselt Hannes vom Dorf ins Gasthaus', () => {
  bis(720);
  assert.equal(npc('hannes').karte, 'gasthaus');
  assert.deepEqual(feldVon(npc('hannes')), [11, 3]);
});

test('Lene geht abends vom Strand durchs Dorf ins Gasthaus', () => {
  bis(1230);
  assert.equal(npc('lene').karte, 'gasthaus');
  assert.deepEqual(feldVon(npc('lene')), [12, 5]);
  assert.equal(npc('bruno').karte, 'gasthaus');
});

test('nach Mitternacht sind alle wieder daheim', () => {
  bis(1500);
  for (const n of S.npcs) assert.equal(n.karte, null, `${n.id} ist noch auf ${n.karte}`);
});

test('um zwei Uhr endet der Tag von selbst', () => {
  bis(1600);
  assert.equal(berichte, 1);
  assert.ok(S.pause);
  assert.equal(S.s.zeit.tag, 2);
  neuerMorgen();
  assert.equal(S.ort.def.id, 'haus');
  assert.ok(!S.pause);
});

test('an einem Regentag bleibt Mats im Gasthaus', () => {
  S.s.zeit.wetter = 'regen';
  bis(660);
  assert.equal(npc('mats').karte, 'gasthaus');
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
