// Inhaltstest: Prüft Karten, Verweise, Dialoge und Kampfaufbauten.
// Aufruf: node test/content.test.mjs
import assert from 'node:assert';
import { AREAS, kulisseFuerKarte } from '../src/data/areas.js';
import { CONTENT, pruefeVerweise } from '../src/content/index.js';
import { newGameState } from '../src/engine/state.js';
import { buildCharacter } from '../src/engine/character.js';
import { assignHooks } from '../src/engine/hooks.js';
import { DialogueRunner } from '../src/engine/dialogue.js';
import { Combat } from '../src/engine/combat.js';
import { reseed } from '../src/engine/rng.js';

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); } catch (e) {
    failed++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

reseed(4711);

function testGruppe(level = 3) {
  return [
    buildCharacter({ name: 'Anka', raceId: 'mensch', classId: 'schurke', backgroundId: 'scharlatan', baseScores: { st: 10, ge: 15, ko: 13, in: 12, we: 12, ch: 14 }, skills: ['heimlichkeit', 'ueberzeugen', 'wahrnehmung', 'fingerfertigkeit'], level }),
    buildCharacter({ name: 'Brom', raceId: 'zwerg', classId: 'kaempfer', backgroundId: 'soldat', baseScores: { st: 15, ge: 12, ko: 14, in: 10, we: 12, ch: 8 }, skills: ['athletik', 'einschuechtern'], level }),
    buildCharacter({ name: 'Cela', raceId: 'tiefling', classId: 'magier', backgroundId: 'gelehrter', baseScores: { st: 8, ge: 14, ko: 13, in: 15, we: 12, ch: 12 }, skills: ['arkane_kunde', 'untersuchen'], level }),
  ];
}

function testState(level = 3) {
  const s = newGameState(99);
  s.party = testGruppe(level);
  s.hooks = assignHooks(s.party);
  s.staff.bearer = s.party[0].id;
  return s;
}

const begehbar = (a, x, y) => {
  if (x < 0 || y < 0 || x >= a.w || y >= a.h) return false;
  const t = a.tiles[y * a.w + x];
  return t !== 1 && t !== 4 && t !== 6;
};
const nahBegehbar = (a, x, y) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (begehbar(a, x + dx, y + dy)) return true;
  return false;
};

/* ───────────── Karten ───────────── */
suite('Schauplätze', () => {
  test('Alle Karten sind wohlgeformt', () => {
    for (const a of Object.values(AREAS)) {
      assert.ok(a.w > 4 && a.h > 4, `${a.id}: ${a.w}×${a.h} zu klein`);
      assert.equal(a.tiles.length, a.w * a.h, `${a.id}: Kachelzahl passt nicht`);
      assert.ok(a.name && a.theme, `${a.id}: Name oder Farbwelt fehlt`);
    }
  });

  test('Startfelder der Gruppe sind begehbar', () => {
    for (const a of Object.values(AREAS)) {
      for (const sp of a.spawns.party) {
        assert.ok(begehbar(a, sp.x, sp.y), `${a.id}: Startfeld (${sp.x},${sp.y}) ist blockiert`);
      }
    }
  });

  test('Alle Interaktionspunkte sind erreichbar', () => {
    for (const a of Object.values(AREAS)) {
      for (const p of a.punkte) {
        assert.ok(nahBegehbar(a, p.x, p.y), `${a.id}/${p.id}: (${p.x},${p.y}) liegt eingemauert`);
      }
    }
  });

  test('Kulissen stehen innerhalb der Karte', () => {
    for (const a of Object.values(AREAS)) {
      for (const pr of a.props) {
        assert.ok(pr.x >= -1 && pr.y >= -1 && pr.x <= a.w && pr.y <= a.h,
          `${a.id}: Kulisse ${pr.type} bei (${pr.x},${pr.y}) außerhalb`);
      }
    }
  });

  test('Häuser stehen auf ihrem Grundriss', () => {
    for (const a of Object.values(AREAS)) {
      for (const pr of a.props.filter((x) => x.type === 'haus')) {
        const gx = Math.round(pr.x); const gy = Math.round(pr.y);
        const t = a.tiles[gy * a.w + gx];
        assert.equal(t, 6, `${a.id}: Haus bei (${gx},${gy}) steht nicht auf Gebäudekacheln`);
      }
    }
  });
});

/* ───────────── Verweise ───────────── */
suite('Verweise', () => {
  test('Dialoge, Ereignisse und Ausgänge zeigen nirgends ins Leere', () => {
    const fehler = pruefeVerweise(AREAS);
    assert.equal(fehler.length, 0, `\n      ${fehler.slice(0, 14).join('\n      ')}`);
  });

  test('Jeder Dialog hat einen erreichbaren Startknoten', () => {
    for (const [id, d] of Object.entries(CONTENT.dialogues)) {
      assert.ok(d.nodes[d.start], `${id}: Startknoten "${d.start}" fehlt`);
    }
  });

  test('Jeder Dialogknoten führt irgendwohin', () => {
    for (const [id, d] of Object.entries(CONTENT.dialogues)) {
      for (const [nid, n] of Object.entries(d.nodes)) {
        const weiter = n.end || n.to || (n.choices && n.choices.length > 0);
        assert.ok(weiter, `${id}/${nid}: Sackgasse ohne Ende`);
      }
    }
  });

  test('Ereignisse rufen nur vorhandene Ereignisse, Kämpfe und Enden auf', () => {
    const fehler = [];
    for (const [id, fn] of Object.entries(CONTENT.events)) {
      const src = fn.toString();
      for (const m of src.matchAll(/runEvent\('([a-z0-9_]+)'\)/g)) {
        if (!CONTENT.events[m[1]]) fehler.push(`${id} → Ereignis "${m[1]}"`);
      }
      for (const m of src.matchAll(/startCombat\('([a-z0-9_]+)'\)/g)) {
        if (!CONTENT.combats[m[1]]) fehler.push(`${id} → Kampf "${m[1]}"`);
      }
      for (const m of src.matchAll(/ending\('([a-z0-9_]+)'\)/g)) {
        if (!CONTENT.endings[m[1]]) fehler.push(`${id} → Ende "${m[1]}"`);
      }
      for (const m of src.matchAll(/goToArea\('([a-z0-9_]+)'/g)) {
        if (!AREAS[m[1]]) fehler.push(`${id} → Ort "${m[1]}"`);
      }
    }
    assert.equal(fehler.length, 0, `\n      ${fehler.join('\n      ')}`);
  });

  test('Dialoge rufen nur vorhandene Ereignisse auf', () => {
    const fehler = [];
    for (const [id, d] of Object.entries(CONTENT.dialogues)) {
      const src = JSON.stringify(d, (k, v) => (typeof v === 'function' ? v.toString() : v));
      for (const m of src.matchAll(/runEvent\(.([a-z0-9_]+)./g)) {
        if (!CONTENT.events[m[1]]) fehler.push(`Dialog ${id} → Ereignis "${m[1]}"`);
      }
    }
    assert.equal(fehler.length, 0, `\n      ${fehler.join('\n      ')}`);
  });

  test('Kampfaufbauten verweisen auf bekannte Gegner', async () => {
    const { CREATURES } = await import('../src/data/creatures.js');
    const s = testState(5);
    for (const [id, build] of Object.entries(CONTENT.combats)) {
      const setup = build({ state: s, flag: (k) => s.flags[k] });
      for (const e of [...(setup.enemies || []), ...(setup.allies || [])]) {
        assert.ok(CREATURES[e.id], `Kampf ${id}: unbekannter Gegner "${e.id}"`);
      }
      assert.ok(setup.map || setup.area, `Kampf ${id}: weder Karte noch Ort`);
    }
  });
});

/* ───────────── Dialoge durchspielen ───────────── */
suite('Dialoge durchspielen', () => {
  test('Jeder Dialog lässt sich ohne Absturz durchklicken', () => {
    for (const [id, d] of Object.entries(CONTENT.dialogues)) {
      for (let versuch = 0; versuch < 6; versuch++) {
        const s = testState();
        // ein paar Flags setzen, damit auch bedingte Zweige laufen
        for (const f of ['register_gelesen', 'gruenderformel', 'handout_a', 'gewaehlt_stab',
          'nella_zeile_gefunden', 'hesse_trinkt_nie', 'neunter_tisch_gesehen', 'perrick_da',
          'fasswagen_erfahren', 'tobrek_verhaspelt', 'ghortan_dabei', 'nella_fragt_jeden',
          'spiegelhof_besucht', 'befreit', 'l3_ordnung_verstanden', 'l6_lolth_gehoert']) {
          if (versuch % 2 === 0) s.flags[f] = true;
        }
        s.notes.namesKnown = versuch % 3 === 0 ? ['1049 · Aleth Grast'] : [];
        s.notes.namesCopied = versuch % 3 === 0;
        s.party_inventory.push({ id: 'wolfsfell', name: 'Wolfsfell', count: 2 });
        const ctx = { onQuest() {}, onEffect() {}, game: null };
        const r = new DialogueRunner(d, s, ctx);
        let guard = 0;
        while (!r.finished && guard++ < 120) {
          const wahl = r.choices();
          if (wahl.length === 0) { r.advance(); continue; }
          // Nach einer Weile den Ausstieg suchen, sonst dreht man sich in
          // absichtlichen Gesprächsschleifen ewig im Kreis.
          const endetHier = (w) => {
            const roh = d.nodes[r.nodeId].choices[w.index];
            if (!roh) return false;
            if (roh.exit) return true;
            const ziel = roh.to && d.nodes[roh.to];
            return !!(ziel && ziel.end);
          };
          const ausstieg = wahl.find(endetHier);
          const gewaehlt = guard > 30 ? (ausstieg || wahl[wahl.length - 1]) : wahl[versuch % wahl.length];
          const res = r.choose(gewaehlt.index);
          if (res.type === 'probe') r.resolveCheck();
        }
        assert.ok(guard < 120, `${id}: Dialog endet nicht (Schleife?)`);
      }
    }
  });
});

/* ───────────── Kämpfe durchspielen ───────────── */
suite('Kämpfe durchspielen', () => {
  test('Jeder Kampf läuft bis zu einem Ergebnis', () => {
    for (const [id, build] of Object.entries(CONTENT.combats)) {
      const s = testState(7);
      s.flags.ghortan_dabei = true;
      const setup = build({ state: s, flag: (k) => s.flags[k] });
      const area = AREAS[setup.area] || AREAS.dorfeingang;
      const map = setup.map || { w: area.w, h: area.h, tiles: area.tiles.slice(), webs: new Set() };
      let ende = null;
      const combat = new Combat(s, { ...setup, map }, { onEnd: (r) => { ende = r; } });
      combat.start();
      let guard = 0;
      while (!combat.over && guard++ < 900) {
        const c = combat.current;
        if (!c) break;
        if (c.isPlayer) {
          const feinde = combat.combatants.filter((x) => x.side === 'feind' && !combat.isDown(x));
          if (!feinde.length) break;
          const ziel = feinde[0];
          const atk = c.actions.find((a) => a.attack && a.cost === 'aktion');
          const spot = combat.stepToward(c, ziel, 1);
          if (spot) combat.move(c, spot.x, spot.y);
          if (atk && combat.inRange(c, atk, ziel)) combat.perform(c, atk, { target: ziel });
          combat.endTurn();
        } else {
          combat.runAiTurn(c);
        }
      }
      assert.ok(combat.over || guard >= 900, `Kampf ${id}: hängt`);
      assert.ok(guard < 900, `Kampf ${id}: kein Ergebnis nach 900 Schritten`);
    }
  });
});

suite('Kulisse eigener Kampfkarten', () => {
  test('Jeder Kampf mit eigener Karte bekommt passende Kulisse', () => {
    const s = testState(5);
    for (const [id, build] of Object.entries(CONTENT.combats)) {
      const setup = build({ state: s, flag: () => false, toast() {}, quest() {} });
      if (!setup?.map) continue;
      const basis = AREAS[setup.area] || AREAS.dorfeingang;
      const props = kulisseFuerKarte(basis, setup.map);
      for (const p of props) {
        const x = Math.round(p.x); const y = Math.round(p.y);
        assert.ok(x >= 0 && y >= 0 && x < setup.map.w && y < setup.map.h,
          `Kampf ${id}: Kulisse ${p.type} liegt außerhalb der Karte (${p.x},${p.y})`);
        const t = setup.map.tiles[y * setup.map.w + x];
        assert.notStrictEqual(t, 3, `Kampf ${id}: ${p.type} steht im Wasser`);
        if (['haus', 'baum', 'fels', 'ruine', 'kapelle', 'muehle'].includes(p.type)) {
          assert.ok([1, 5, 6].includes(t),
            `Kampf ${id}: ${p.type} versperrt begehbares Feld (${x},${y})`);
        }
      }
      // Deckungsfelder dürfen nicht unsichtbar bleiben
      const deckung = [];
      for (let y = 0; y < setup.map.h; y++) {
        for (let x = 0; x < setup.map.w; x++) if (setup.map.tiles[y * setup.map.w + x] === 5) deckung.push(`${x},${y}`);
      }
      const bestueckt = new Set(props.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`));
      for (const d of deckung) assert.ok(bestueckt.has(d), `Kampf ${id}: Deckung auf ${d} ohne Modell`);
      // Gebäudefelder brauchen ein Haus
      const gebaeude = setup.map.tiles.filter((t) => t === 6).length;
      if (gebaeude) assert.ok(props.some((p) => p.type === 'haus'), `Kampf ${id}: Gebäudefläche ohne Haus`);
    }
  });

  test('Kulisse ist reproduzierbar', () => {
    const basis = AREAS.waldweg || AREAS.dorfeingang;
    const map = { w: 20, h: 12, tiles: new Array(240).fill(0), webs: new Set() };
    for (let x = 0; x < 20; x++) { map.tiles[x] = 1; map.tiles[11 * 20 + x] = 1; }
    const a = kulisseFuerKarte(basis, map);
    const b = kulisseFuerKarte(basis, map);
    assert.deepStrictEqual(JSON.stringify(a), JSON.stringify(b), 'Kulisse würfelt bei jedem Aufruf neu');
  });
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen.\n`);
process.exit(failed > 0 ? 1 : 0);
