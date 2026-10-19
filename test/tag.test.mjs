// Spielt ganze Tage ohne Bildschirm durch: Uhr, Wege der Dorfbewohner, Ohnmacht um zwei Uhr.
// Die Prüfungen lesen die Tagespläne der Dorfbewohner, statt Orte fest vorzugeben – so bleiben sie
// richtig, wenn Bereiche Karten umbauen oder Leute dazukommen.
// Aufruf: node test/tag.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { T, NPCS, LAEDEN } from '../src/daten.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, neuerMorgen, ladenGeoeffnetBei } from '../src/spiel.js';

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

/** Der Planeintrag, der um diese Minute gilt, und seit wann. */
function eintragUm(id, minute) {
  const plan = L.npcTagesplan(S.s, id);
  let e = plan[0];
  for (const x of plan) if (L.planMinute(x[0]) <= minute) e = x;
  return { ziel: L.planZiel(e), seit: L.planMinute(e[0]) };
}

/** Wer seit mindestens `vorlauf` Minuten unterwegs sein durfte, steht an seinem Planziel (oder ist zu Hause). */
function alleAmZiel(vorlauf) {
  const m = S.s.zeit.minute;
  let geprueft = 0;
  for (const id of Object.keys(NPCS)) {
    const { ziel, seit } = eintragUm(id, m);
    if (m - seit < vorlauf) continue;
    const n = npc(id);
    if (!ziel) { assert.equal(n.karte, null, `${id} sollte zu Hause sein, ist auf ${n.karte}`); continue; }
    assert.equal(n.karte, ziel.karte, `${id} (${L.uhrzeit(m)})`);
    assert.deepEqual(feldVon(n), [ziel.x, ziel.y], `${id} auf ${ziel.karte}`);
    geprueft++;
  }
  return geprueft;
}

console.log('\nEin Tag in Klarwasser');
const s = L.neuesSpiel({ seed: 99 });
let berichte = 0;
const hooks = { tagEnde: () => { berichte++; } };
spielStarten(s, hooks);

test('morgens um sechs steht jeder dort, wo sein Plan beginnt', () => {
  for (const n of S.npcs) {
    const { ziel } = eintragUm(n.id, S.s.zeit.minute);
    assert.equal(n.karte, ziel ? ziel.karte : null, n.id);
  }
});

test('um zehn steht jeder, der seit zwei Stunden unterwegs sein durfte, an seinem Planziel', () => {
  bis(600);
  assert.ok(alleAmZiel(120) >= 2, 'mindestens zwei Dorfbewohner geprüft');
});

test('Händler stehen zu ihren Planzeiten an der Theke, der Laden ist dann offen', () => {
  bis(720);
  alleAmZiel(120);
  let offen = 0;
  for (const [id, l] of Object.entries(LAEDEN)) {
    const { ziel, seit } = eintragUm(l.npc, S.s.zeit.minute);
    const o = L.ladenOrt(id);
    if (!ziel || ziel.karte !== o.karte || ziel.x !== o.x || ziel.y !== o.y || S.s.zeit.minute - seit < 120) continue;
    if (l.ruhetag === L.wochentag(S.s.zeit) || l.zeiten) continue;
    assert.equal(ladenGeoeffnetBei(npc(l.npc)), id, `${l.name} offen`);
    offen++;
  }
  assert.ok(offen >= 1, 'mindestens ein Laden geprüft');
});

test('abends gehen alle über mehrere Karten zu ihren Abendzielen', () => {
  bis(1290);
  alleAmZiel(90);
});

test('nach Mitternacht sind alle wieder daheim', () => {
  bis(1500);
  for (const n of S.npcs) assert.equal(n.karte, null, `${n.id} ist noch auf ${n.karte}`);
});

test('um zwei Uhr endet der Tag von selbst, morgens wacht man zu Hause auf', () => {
  bis(1600);
  assert.equal(berichte, 1);
  assert.ok(S.pause);
  assert.equal(S.s.zeit.tag, 2);
  neuerMorgen();
  const z = L.zuhause(S.s);
  assert.equal(S.ort.def.id, z.karte);
  assert.deepEqual([S.s.spieler.x, S.s.spieler.y], [z.x, z.y]);
  assert.ok(!S.pause);
});

test('an einem Regentag gelten die Regenpläne', () => {
  S.s.zeit.wetter = 'regen';
  assert.ok(Object.values(NPCS).some((n) => n.plan.regen), 'jemand hat einen Regenplan');
  bis(900);
  for (const [id, n] of Object.entries(NPCS)) if (n.plan.regen) assert.equal(L.npcTagesplan(S.s, id), n.plan.regen, id);
  alleAmZiel(120);
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
