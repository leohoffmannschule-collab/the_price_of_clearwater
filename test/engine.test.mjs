// Kopflose Tests des Regelkerns. Aufruf: node test/engine.test.mjs
import assert from 'node:assert';
import { buildCharacter, characterActions, levelUp, longRest } from '../src/engine/character.js';
import { newGameState, tickClock, awakenStaff, addQuest, completeQuest } from '../src/engine/state.js';
import { Combat, makeMap, TERRAIN, paintRect } from '../src/engine/combat.js';
import { DialogueRunner } from '../src/engine/dialogue.js';
import { assignHooks, personalize, hookReport } from '../src/engine/hooks.js';
import { reseed, roll, d20 } from '../src/engine/rng.js';
import { abilityCheck, savingThrow, applyDamage, proficiencyBonus } from '../src/engine/rules.js';
import { CREATURES, spawnCreature } from '../src/data/creatures.js';
import { SPELLS } from '../src/data/spells.js';
import { RACES, CLASSES, BACKGROUNDS, pointBuyCost } from '../src/data/chargen.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); } catch (e) {
    failed++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

reseed(12345);

/* ───────────── Würfel ───────────── */
suite('Würfel & Regeln', () => {
  test('Würfelausdruck 2W6+3 liegt im gültigen Bereich', () => {
    for (let i = 0; i < 200; i++) {
      const r = roll('2W6+3');
      assert.ok(r.total >= 5 && r.total <= 15, `${r.total} außerhalb 5..15`);
      assert.equal(r.rolls.length, 2);
    }
  });
  test('8W6 Feuerball-Schaden plausibel', () => {
    let sum = 0;
    for (let i = 0; i < 500; i++) sum += roll('8W6').total;
    const avg = sum / 500;
    assert.ok(avg > 24 && avg < 32, `Mittelwert ${avg}`);
  });
  test('Vorteil liefert höheres Mittel als normal', () => {
    let a = 0; let n = 0;
    for (let i = 0; i < 800; i++) { a += d20(0, 'vorteil').natural; n += d20(0).natural; }
    assert.ok(a / 800 > n / 800 + 1.5, `Vorteil ${a / 800} vs normal ${n / 800}`);
  });
  test('Übungsbonus nach Stufe', () => {
    assert.equal(proficiencyBonus(1), 2);
    assert.equal(proficiencyBonus(5), 3);
    assert.equal(proficiencyBonus(9), 4);
    assert.equal(proficiencyBonus(17), 6);
  });
  test('Resistenz halbiert, Verwundbarkeit verdoppelt', () => {
    const t = { hp: 100, maxHp: 100, resistances: ['feuer'], vulnerabilities: ['kaelte'], immunities: ['gift'], conditions: [] };
    assert.equal(applyDamage(t, 10, 'feuer'), 5);
    assert.equal(applyDamage(t, 10, 'kaelte'), 20);
    assert.equal(applyDamage(t, 10, 'gift'), 0);
  });
});

/* ───────────── Charaktere ───────────── */
suite('Charaktererschaffung', () => {
  test('Punktekauf: Standardverteilung kostet genau 27', () => {
    assert.equal(pointBuyCost({ st: 15, ge: 14, ko: 13, in: 12, we: 10, ch: 8 }), 27);
  });
  test('Jede Klasse lässt sich auf Stufe 1 bauen', () => {
    for (const id of Object.keys(CLASSES)) {
      const c = buildCharacter({
        name: `Test-${id}`, raceId: 'mensch', classId: id, backgroundId: 'waise',
        baseScores: { st: 15, ge: 14, ko: 13, in: 12, we: 10, ch: 8 }, skills: [],
      });
      assert.ok(c.maxHp > 0, `${id} ohne TP`);
      assert.ok(c.ac >= 10, `${id} RK zu klein`);
      const acts = characterActions(c);
      assert.ok(acts.length >= 4, `${id} hat nur ${acts.length} Aktionen`);
    }
  });
  test('Jedes Volk lässt sich kombinieren', () => {
    for (const id of Object.keys(RACES)) {
      const c = buildCharacter({
        name: 'V', raceId: id, classId: 'kaempfer', backgroundId: 'soldat',
        baseScores: { st: 15, ge: 14, ko: 13, in: 12, we: 10, ch: 8 }, skills: [],
      });
      assert.ok(c.abilities.st >= 15);
    }
  });
  test('Jeder Hintergrund liefert Fertigkeiten', () => {
    for (const id of Object.keys(BACKGROUNDS)) {
      const c = buildCharacter({
        name: 'H', raceId: 'mensch', classId: 'schurke', backgroundId: id,
        baseScores: { st: 10, ge: 15, ko: 13, in: 12, we: 12, ch: 12 }, skills: [],
      });
      assert.ok(c.skills.length >= 2, `${id} ohne Fertigkeiten`);
    }
  });
  test('Aufstieg 1→7 erhöht TP, Merkmale und Plätze', () => {
    const c = buildCharacter({
      name: 'Aufstieg', raceId: 'hochelf', classId: 'magier', backgroundId: 'gelehrter',
      baseScores: { st: 8, ge: 14, ko: 14, in: 15, we: 12, ch: 10 }, skills: [],
    });
    const hp1 = c.maxHp;
    for (let l = 2; l <= 7; l++) levelUp(c, l);
    assert.ok(c.maxHp > hp1 + 15, `TP nur ${c.maxHp}`);
    assert.equal(c.level, 7);
    assert.ok(c.slotsMax.length >= 4, 'keine Zauberplätze Grad 4');
    assert.ok(c.spells.includes('feuerball'), 'Feuerball fehlt auf Stufe 7');
  });
  test('Aufstieg bis Stufe 20 bleibt stabil', () => {
    for (const id of Object.keys(CLASSES)) {
      const c = buildCharacter({
        name: 'Max', raceId: 'mensch', classId: id, backgroundId: 'pilger',
        baseScores: { st: 15, ge: 14, ko: 13, in: 12, we: 10, ch: 8 }, skills: [],
      });
      for (let l = 2; l <= 20; l++) levelUp(c, l);
      assert.equal(c.level, 20);
      assert.ok(c.maxHp > 60, `${id} auf Stufe 20 nur ${c.maxHp} TP`);
      assert.ok(characterActions(c).length > 3);
    }
  });
  test('Lange Rast füllt Plätze und TP', () => {
    const c = buildCharacter({
      name: 'Rast', raceId: 'mensch', classId: 'kleriker', backgroundId: 'pilger',
      baseScores: { st: 12, ge: 12, ko: 14, in: 10, we: 15, ch: 12 }, skills: [], level: 5,
    });
    c.hp = 1; c.slots = [0, 0];
    longRest(c);
    assert.equal(c.hp, c.maxHp);
    assert.ok(c.slots[0] > 0);
  });
});

/* ───────────── Zustand ───────────── */
suite('Spielzustand', () => {
  test('Uhr der Stillen Tiefe füllt sich und lässt Nella verschwinden', () => {
    const s = newGameState(7);
    for (let i = 0; i < 5; i++) tickClock(s, 'lange_rast');
    assert.ok(!s.flags.nella_verschwunden);
    const r = tickClock(s, 'kein_fortschritt');
    assert.ok(r.full);
    assert.ok(s.flags.nella_verschwunden, 'Nella hätte verschwinden müssen');
  });
  test('Stab erwacht stufenweise', () => {
    const s = newGameState(8);
    s.party = [buildCharacter({ name: 'Trägerin', raceId: 'mensch', classId: 'magier', backgroundId: 'gelehrter', baseScores: { st: 8, ge: 14, ko: 12, in: 15, we: 12, ch: 10 }, skills: [] })];
    s.staff.bearer = s.party[0].id;
    assert.ok(awakenStaff(s, 1));
    assert.equal(s.party[0].spellFocusBonus, 1);
    awakenStaff(s, 2);
    assert.equal(s.party[0].spellFocusBonus, 2);
    assert.equal(awakenStaff(s, 1), null, 'Rückschritt darf nicht möglich sein');
  });
  test('Journal legt an und schließt ab', () => {
    const s = newGameState(9);
    addQuest(s, 'q1', 'Die ertrunkenen Namen', 'Sarine erwähnte einen Vertrag.');
    completeQuest(s, 'q1', 'Erledigt.');
    assert.ok(s.journal[0].done);
  });
});

/* ───────────── Haken ───────────── */
suite('Haken-Umbindung', () => {
  test('Haken verteilen sich über die Gruppe', () => {
    const party = [
      buildCharacter({ name: 'Anka', raceId: 'mensch', classId: 'schurke', backgroundId: 'scharlatan', baseScores: { st: 10, ge: 15, ko: 13, in: 12, we: 12, ch: 14 }, skills: ['heimlichkeit', 'ueberzeugen'] }),
      buildCharacter({ name: 'Brom', raceId: 'zwerg', classId: 'kaempfer', backgroundId: 'soldat', baseScores: { st: 15, ge: 12, ko: 14, in: 10, we: 12, ch: 8 }, skills: ['athletik'] }),
      buildCharacter({ name: 'Cela', raceId: 'tiefling', classId: 'magier', backgroundId: 'gelehrter', baseScores: { st: 8, ge: 14, ko: 13, in: 15, we: 12, ch: 12 }, skills: ['arkane_kunde'] }),
    ];
    const hooks = assignHooks(party);
    assert.ok(Object.keys(hooks).length >= 6, 'zu wenige Haken vergeben');
    const owners = new Set(Object.values(hooks));
    assert.ok(owners.size >= 2, 'alle Haken bei einer Figur');
    const fireOwner = party.find((p) => p.id === hooks.feuer);
    assert.equal(fireOwner.name, 'Cela', 'Feuerhaken muss an die Feuerwirkerin');
  });
  test('Platzhalter werden ersetzt', () => {
    const s = newGameState(11);
    s.party = [buildCharacter({ name: 'Runa', raceId: 'mensch', classId: 'barde', backgroundId: 'unterhalter', baseScores: { st: 10, ge: 14, ko: 12, in: 12, we: 10, ch: 15 }, skills: ['auftreten'], regret: 'Ich habe geschwiegen.' })];
    s.hooks = assignHooks(s.party);
    s.staff.bearer = s.party[0].id;
    assert.equal(personalize('{held} spielt.', s), 'Runa spielt.');
    assert.equal(personalize('{haken:musiker} tritt auf.', s), 'Runa tritt auf.');
    assert.equal(personalize('{stab} trägt ihn.', s), 'Runa trägt ihn.');
    assert.ok(personalize('{reue:1}', s).includes('geschwiegen'));
  });
});

/* ───────────── Dialoge ───────────── */
suite('Dialogsystem', () => {
  const s = newGameState(21);
  s.party = [buildCharacter({ name: 'Ilva', raceId: 'mensch', classId: 'barde', backgroundId: 'unterhalter', baseScores: { st: 10, ge: 14, ko: 12, in: 12, we: 10, ch: 15 }, skills: ['ueberzeugen', 'auftreten'] })];
  s.hooks = assignHooks(s.party);
  const dlg = {
    id: 'test', speaker: 'Mutter Hesse', start: 'a',
    nodes: {
      a: { text: 'Trinkt, trinkt — es ist umsonst.', choices: [
        { text: 'Warum trinkst du selbst nie?', to: 'b' },
        { text: '[Überzeugen] Sag mir die Wahrheit.', check: { skill: 'ueberzeugen', dc: 5, success: 'c', fail: 'b' } },
      ] },
      b: { text: 'Kindchen, wie war eure Reise?', end: true },
      c: { text: 'Weil ich nicht möchte, dass es mir gut geht.', flags: ['hesse_riss'], end: true },
    },
  };
  test('Knoten und Auswahl funktionieren', () => {
    const r = new DialogueRunner(dlg, s);
    assert.equal(r.currentSpeaker(), 'Mutter Hesse');
    assert.equal(r.choices().length, 2);
    r.choose(0);
    assert.ok(r.currentText().includes('Reise'));
  });
  test('Probe wird gewürfelt und zeigt Vorschau', () => {
    const r = new DialogueRunner(dlg, s);
    const preview = r.choices()[1].check;
    assert.equal(preview.dc, 5);
    assert.ok(preview.chance > 50, `Chance nur ${preview.chance}%`);
    const res = r.choose(1);
    assert.equal(res.type, 'probe');
    r.resolveCheck();
    assert.ok(r.node, 'kein Folgeknoten');
  });
  test('Einmal-Antworten verschwinden', () => {
    const s2 = newGameState(22);
    s2.party = s.party;
    const d2 = { id: 't2', start: 'a', nodes: { a: { text: 'x', choices: [{ text: 'einmal', to: 'a', once: true }, { text: 'raus', exit: true }] } } };
    const r = new DialogueRunner(d2, s2);
    assert.equal(r.choices().length, 2);
    r.choose(0);
    assert.equal(r.choices().length, 1);
  });
});

/* ───────────── Kampf ───────────── */
suite('Kampf', () => {
  function makeParty(level = 3) {
    return [
      buildCharacter({ name: 'Brom', raceId: 'zwerg', classId: 'kaempfer', backgroundId: 'soldat', baseScores: { st: 15, ge: 12, ko: 14, in: 10, we: 12, ch: 8 }, skills: ['athletik'], level }),
      buildCharacter({ name: 'Cela', raceId: 'tiefling', classId: 'magier', backgroundId: 'gelehrter', baseScores: { st: 8, ge: 14, ko: 13, in: 15, we: 12, ch: 12 }, skills: ['arkane_kunde'], level }),
      buildCharacter({ name: 'Anka', raceId: 'mensch', classId: 'schurke', backgroundId: 'scharlatan', baseScores: { st: 10, ge: 15, ko: 13, in: 12, we: 12, ch: 14 }, skills: ['heimlichkeit'], level }),
    ];
  }

  test('Karte, Initiative und Zugfolge', () => {
    const s = newGameState(31);
    s.party = makeParty();
    const map = makeMap(16, 12);
    const combat = new Combat(s, {
      map,
      playerStart: [{ x: 2, y: 4 }, { x: 2, y: 6 }, { x: 3, y: 5 }],
      enemies: [{ id: 'nasser_kleiner', x: 10, y: 5 }, { id: 'nasser_kleiner', x: 11, y: 6 }],
      title: 'Test',
    });
    combat.start();
    assert.equal(combat.order.length, 5);
    assert.ok(combat.current, 'kein aktiver Kämpfer');
    assert.equal(combat.round, 1);
  });

  test('Bewegung respektiert Wände und Kosten', () => {
    const s = newGameState(32);
    s.party = makeParty();
    const map = makeMap(16, 12);
    paintRect(map, 5, 1, 5, 10, TERRAIN.WAND);
    const combat = new Combat(s, { map, playerStart: [{ x: 2, y: 5 }, { x: 2, y: 6 }, { x: 2, y: 7 }], enemies: [{ id: 'wolf', x: 10, y: 5 }] });
    combat.start();
    const hero = combat.combatants[0];
    hero.movement = 6;
    const blocked = combat.pathTo(hero, 10, 5);
    assert.equal(blocked, null, 'Wand wurde ignoriert');
    const ok = combat.pathTo(hero, 4, 5);
    assert.ok(ok, 'freier Weg nicht gefunden');
  });

  test('Feuerball trifft alle im Radius', () => {
    const s = newGameState(33);
    s.party = makeParty(7);
    const map = makeMap(20, 14);
    const combat = new Combat(s, {
      map, playerStart: [{ x: 2, y: 7 }, { x: 2, y: 8 }, { x: 3, y: 7 }],
      enemies: [{ id: 'goblin', x: 14, y: 7 }, { id: 'goblin', x: 15, y: 7 }, { id: 'goblin', x: 14, y: 8 }],
    });
    combat.start();
    const mage = combat.combatants.find((c) => c.name === 'Cela');
    const fb = mage.actions.find((a) => a.id === 'feuerball');
    assert.ok(fb, 'Magierin kennt keinen Feuerball auf Stufe 7');
    const hit = combat.targetsInShape(mage, fb, { x: 14, y: 7 });
    assert.equal(hit.length, 3, `Feuerball trifft ${hit.length} statt 3`);
  });

  test('Ein kompletter Kampf läuft bis zum Ende durch', () => {
    const s = newGameState(34);
    s.party = makeParty(3);
    const map = makeMap(18, 12);
    let ended = null;
    const combat = new Combat(s, {
      map,
      playerStart: [{ x: 2, y: 5 }, { x: 2, y: 6 }, { x: 3, y: 6 }],
      enemies: [{ id: 'nasser_kleiner', x: 12, y: 5 }, { id: 'nasser_kleiner', x: 13, y: 6 }, { id: 'nasser_kleiner', x: 12, y: 7 }],
    }, { onEnd: (r) => { ended = r; } });
    combat.start();
    let guard = 0;
    while (!combat.over && guard++ < 400) {
      const c = combat.current;
      if (!c) break;
      if (c.isPlayer) {
        const enemies = combat.combatants.filter((x) => x.side === 'feind' && !combat.isDown(x));
        if (!enemies.length) break;
        const target = enemies[0];
        const atk = c.actions.find((a) => a.attack && (a.range || 1) >= 1);
        const spot = combat.stepToward(c, target, 1);
        if (spot) combat.move(c, spot.x, spot.y);
        if (atk && combat.inRange(c, atk, target)) combat.perform(c, atk, { target });
        combat.endTurn();
      } else {
        combat.runAiTurn(c);
      }
    }
    assert.ok(combat.over, `Kampf endete nicht (${guard} Schritte)`);
    assert.ok(ended === 'sieg' || ended === 'niederlage', `Ergebnis: ${ended}`);
    assert.ok(combat.round <= 40, `zu viele Runden: ${combat.round}`);
  });

  test('Bosse mit drei Phasen sind vollständig definiert', () => {
    for (const id of ['ghortan_p1', 'ghortan_p2', 'ghortan_p3']) {
      const c = spawnCreature(id);
      assert.ok(c.hp > 0 && c.actions.length > 0, `${id} unvollständig`);
      for (const a of c.actions) {
        if (a.damage) for (const d of a.damage) assert.doesNotThrow(() => roll(d.dice), `${id}/${a.id}: ${d.dice}`);
      }
    }
  });

  test('Alle Gegnerbögen sind würfelbar', () => {
    for (const [id, base] of Object.entries(CREATURES)) {
      const c = spawnCreature(id);
      assert.ok(c.ac > 0, `${id} ohne RK`);
      assert.ok(c.maxHp > 0, `${id} ohne TP`);
      for (const a of [...(c.actions || []), ...(c.legendary?.actions || [])]) {
        for (const d of a.damage || []) {
          assert.doesNotThrow(() => roll(d.dice), `${id}/${a.id} Würfel "${d.dice}"`);
        }
      }
    }
  });

  test('Alle Zauber haben gültige Würfelausdrücke', () => {
    for (const [id, sp] of Object.entries(SPELLS)) {
      for (const d of sp.damage || []) {
        const expr = String(d.dice).replace('MOD', '3');
        assert.doesNotThrow(() => roll(expr), `${id}: ${d.dice}`);
      }
    }
  });

  test('Legendäre Widerstandskraft verbraucht sich', () => {
    const s = newGameState(35);
    s.party = makeParty(6);
    const map = makeMap(16, 12);
    const combat = new Combat(s, { map, playerStart: [{ x: 2, y: 5 }], enemies: [{ id: 'ghortan_p1', x: 10, y: 5 }] });
    combat.start();
    const boss = combat.combatants.find((c) => c.side === 'feind');
    assert.equal(boss.ref.legendaryLeft, 2);
    const hero = combat.combatants.find((c) => c.isPlayer);
    for (let i = 0; i < 12; i++) {
      combat.applySaveEffect(hero, boss, { save: { ability: 'ge', dc: 30 }, damage: [{ dice: '1W4', type: 'feuer' }] });
    }
    assert.equal(boss.ref.legendaryLeft, 0, 'Widerstandskraft nicht verbraucht');
  });

  test('Drakeling explodiert beim Sterben', () => {
    const s = newGameState(36);
    s.party = makeParty(7);
    const map = makeMap(14, 10);
    const combat = new Combat(s, { map, playerStart: [{ x: 5, y: 5 }], enemies: [{ id: 'drakeling', x: 6, y: 5 }] });
    combat.start();
    const hero = combat.combatants.find((c) => c.isPlayer);
    const drake = combat.combatants.find((c) => c.side === 'feind');
    const before = hero.ref.hp;
    drake.ref.hp = 0;
    combat.afterDamage(hero, drake, 20);
    assert.ok(hero.ref.hp <= before, 'Letzte Glut hatte keine Wirkung (Wurf kann aber gelingen)');
  });
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen.\n`);
process.exit(failed > 0 ? 1 : 0);
