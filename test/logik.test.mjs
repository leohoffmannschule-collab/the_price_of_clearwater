// Prüft Daten und Spiellogik ohne Browser. (Karten, Punkte und Wege: karten.test.mjs)
// Aufruf: node test/logik.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { ITEMS, PFLANZEN, NPCS, LAEDEN, REZEPTE, BUENDEL, BRIEFE, FISCHE, JZ, TAGE_PRO_JZ, SPEZIAL_WARE } from '../src/daten.js';
import { KARTEN, punkt, wasserArt } from '../src/karten.js';
import { mineErzeugen, MINE_TIEFE } from '../src/bereiche/mine/inhalt.js';
import { glasBenutzen } from '../src/bereiche/handwerk/inhalt.js';
import * as G from '../src/bereiche/gemeinschaft/inhalt.js';
import { zufall } from '../src/zufall.js';
import * as L from '../src/logik.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }

const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });

/** Felder, die von (sx, sy) aus erreichbar sind. */
function erreichbar(s, def, w, sx, sy) {
  const gesehen = new Set([L.k(sx, sy)]);
  const offen = [[sx, sy]];
  while (offen.length) {
    const [x, y] = offen.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const kk = L.k(nx, ny);
      if (gesehen.has(kk) || !L.begehbar(s, def, w, nx, ny)) continue;
      gesehen.add(kk);
      offen.push([nx, ny]);
    }
  }
  return gesehen;
}

gruppe('Daten', () => {
  test('jede Pflanze hat Saat und Ernte als Gegenstand', () => {
    for (const p of Object.values(PFLANZEN)) {
      assert.ok(ITEMS[p.saat], p.saat);
      assert.ok(ITEMS[p.ernte], p.ernte);
      assert.ok(p.jz.every((j) => JZ.includes(j)), p.id);
    }
  });
  test('Rezepte, Läden, Bündel und Dorfbewohner verweisen auf echte Gegenstände', () => {
    for (const r of REZEPTE) {
      assert.ok(ITEMS[r.ergebnis], r.id);
      for (const id of Object.keys(r.zutaten)) assert.ok(ITEMS[id], `${r.id}: ${id}`);
    }
    for (const L2 of Object.values(LAEDEN)) {
      for (const w of L2.ware) {
        if (w.id) assert.ok(ITEMS[w.id], w.id);
        if (w.spezial) assert.ok(SPEZIAL_WARE[w.spezial], `Spezialware ${w.spezial}`);
      }
    }
    for (const b of BUENDEL) {
      for (const e of G.buendelEintraege(b)) assert.ok(ITEMS[e.id], `${b.id}: ${e.id}`);
      if (b.belohnung.id) assert.ok(ITEMS[b.belohnung.id], b.belohnung.id);
    }
    for (const [id, n] of Object.entries(NPCS)) {
      for (const liste of ['liebt', 'mag', 'magNicht', 'hasst']) {
        for (const e of n[liste] || []) if (!e.startsWith('kat:')) assert.ok(ITEMS[e], `${id}.${liste}: ${e}`);
      }
      for (const g of Object.values(n.herzGeschenk || {})) assert.ok(ITEMS[g.id], `${id}: ${g.id}`);
      for (const jz of JZ) assert.ok(n.zeilen[jz]?.length, `${id}: Zeilen für ${jz}`);
    }
  });
  test('jedes Gewässer auf den Karten hat in jeder Jahreszeit mindestens einen Fisch', () => {
    const arten = new Set(['teich', 'fluss', 'meer']);
    for (const def of Object.values(KARTEN)) {
      if (def.wasser) arten.add(def.wasser);
      for (const g of def.gewaesser) arten.add(g.art);
    }
    for (const ort of arten) {
      for (const jz of JZ) assert.ok(FISCHE.some((f) => f.fisch.orte.includes(ort) && f.fisch.jz.includes(jz)), `${ort}/${jz}`);
    }
  });
  test('Gewässerart je Feld: Rechtecke vor dem Standard der Karte', () => {
    assert.equal(wasserArt(KARTEN.strand, 5, 15), 'meer');
    const see = KARTEN.wald.gewaesser[0];
    assert.equal(wasserArt({ def: KARTEN.wald }, see.x + 1, see.y + 1), see.art);
    assert.equal(wasserArt(KARTEN.wald, 5, 14), 'fluss');
  });
  test('Briefe haben Absender und Text, genau einer ist der Startbrief', () => {
    for (const b of BRIEFE) assert.ok(b.von && b.text.length > 20, b.id);
    assert.equal(BRIEFE.filter((b) => b.start).length, 1);
  });
  test('Iridium steht in den Tabellen, Upgrades nur mit vorhandenem Barren', () => {
    assert.equal(L.werkzeugName('hacke', 4), 'Iridiumhacke');
    const s = neues(30);
    s.spieler.werkzeug.hacke = 3;
    assert.ok(!L.ladenWare(s, 'schmiede').some((w) => w.werkzeug === 'hacke'), 'Iridium-Upgrade ohne Iridiumbarren');
    assert.equal(L.preisVon({ id: 'pastinake', n: 1, q: 3 }), 70);
    assert.equal(L.werkzeugFelder(5, 5, 'unten', 4).length, 18);
  });
});

gruppe('Neues Spiel', () => {
  const s = neues();
  test('Startausrüstung und Geld', () => {
    for (const id of ['hacke', 'giesskanne', 'axt', 'spitzhacke', 'sense']) assert.ok(L.hat(s, id), id);
    assert.equal(L.anzahl(s, 'pastinake_saat'), 15);
    assert.equal(s.spieler.gold, 500);
  });
  test('der Hof ist verwildert, das Haus aber frei', () => {
    const w = L.welt(s, 'hof');
    const anzahl = Object.values(w.objekte).filter((o) => ['baum', 'stein', 'unkraut', 'ast'].includes(o.t)).length;
    assert.ok(anzahl > 60, `nur ${anzahl} Hindernisse`);
    const vor = punkt('hof', 'vorHaus');
    assert.ok(!w.objekte[L.k(vor.x, vor.y)], 'vor der Haustür');
  });
  test('der erste Brief liegt bereit', () => {
    assert.deepEqual(s.post, ['frieda_willkommen']);
  });
});

gruppe('Feldarbeit', () => {
  test('Hacken, säen, gießen, wachsen, ernten', () => {
    const s = neues(3);
    const ort = L.ortVon(s, 'hof');
    const x = 21;
    const y = 12;
    delete ort.welt.objekte[L.k(x, y)];
    assert.equal(L.hacken(s, ort, [[x, y]]).n, 1);
    const idx = s.spieler.inv.findIndex((i) => i?.id === 'pastinake_saat');
    assert.ok(L.saeen(s, ort, x, y, idx).ok);
    assert.equal(L.anzahl(s, 'pastinake_saat'), 14);
    for (let tag = 0; tag < 4; tag++) {
      L.giessen(s, ort, [[x, y]]);
      assert.equal(L.ernten(s, ort, x, y), null, `Tag ${tag} schon reif?`);
      L.tagBeenden(s, { r: zufall(tag) });
    }
    const erg = L.ernten(s, ort, x, y, zufall(1));
    assert.ok(erg?.ok, 'nicht reif nach 4 gegossenen Tagen');
    assert.equal(L.anzahl(s, 'pastinake'), 1);
    assert.ok(s.spieler.xp.landwirtschaft > 0);
  });
  test('ungegossene Pflanzen wachsen nicht', () => {
    const s = neues(4);
    const ort = L.ortVon(s, 'hof');
    delete ort.welt.objekte[L.k(22, 12)];
    L.hacken(s, ort, [[22, 12]]);
    L.saeen(s, ort, 22, 12, s.spieler.inv.findIndex((i) => i?.id === 'pastinake_saat'));
    s.zeit.morgen = 'sonne';
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(ort.welt.felder[L.k(22, 12)].pflanze.tage, 0);
  });
  test('Blaubeeren tragen nach der Ernte erneut', () => {
    const s = neues(5);
    s.zeit.jz = 1;
    const ort = L.ortVon(s, 'hof');
    ort.welt.felder[L.k(25, 20)] = { nass: false, pflanze: { id: 'blaubeere', tage: 13 } };
    const erg = L.ernten(s, ort, 25, 20, () => 0.5);
    assert.ok(erg.ok);
    assert.equal(L.anzahl(s, 'blaubeere'), 3);
    assert.equal(ort.welt.felder[L.k(25, 20)].pflanze.tage, 9);
  });
  test('Saat außerhalb ihrer Jahreszeit wird abgelehnt', () => {
    const s = neues(6);
    const ort = L.ortVon(s, 'hof');
    ort.welt.felder[L.k(25, 21)] = { nass: false };
    L.hinzufuegen(s, { id: 'melone_saat', n: 1 });
    const erg = L.saeen(s, ort, 25, 21, s.spieler.inv.findIndex((i) => i?.id === 'melone_saat'));
    assert.match(erg.grund, /Sommer/);
  });
  test('am Ende der Jahreszeit welken Frühlingspflanzen', () => {
    const s = neues(8);
    const ort = L.ortVon(s, 'hof');
    ort.welt.felder[L.k(25, 22)] = { nass: true, pflanze: { id: 'pastinake', tage: 1 } };
    s.zeit.tag = TAGE_PRO_JZ;
    const bericht = L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(s.zeit.jz, 1);
    assert.ok(ort.welt.felder[L.k(25, 22)].pflanze.tot);
    assert.ok(bericht.meldungen.some((m) => m.includes('verwelkt')));
  });
  test('Regen gießt, Sprenger gießen ihre Nachbarn', () => {
    const s = neues(9);
    const ort = L.ortVon(s, 'hof');
    for (const [x, y] of [[30, 20], [31, 20], [32, 20], [31, 19], [30, 19]]) ort.welt.felder[L.k(x, y)] = { nass: false };
    ort.welt.objekte[L.k(31, 21)] = { t: 'sprenger' };
    delete ort.welt.felder[L.k(31, 21)];
    s.zeit.morgen = 'sonne';
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(ort.welt.felder[L.k(31, 20)].nass, true);
    assert.equal(ort.welt.felder[L.k(30, 20)].nass, false);
    s.zeit.morgen = 'regen';
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(ort.welt.felder[L.k(30, 20)].nass, true);
  });
  test('Bäume fallen nach genug Axthieben und geben Holz', () => {
    const s = neues(10);
    const ort = L.ortVon(s, 'hof');
    ort.welt.objekte[L.k(30, 25)] = { t: 'baum', hp: 8, art: 'eiche' };
    let erg;
    for (let i = 0; i < 8; i++) erg = L.axtHieb(s, ort, 30, 25, () => 0.5);
    assert.ok(erg.gefallen);
    assert.ok(L.anzahl(s, 'holz') >= 10);
    assert.equal(ort.welt.objekte[L.k(30, 25)].t, 'stumpf');
  });
  test('Felsbrocken brauchen eine bessere Spitzhacke', () => {
    const s = neues(11);
    const ort = L.ortVon(s, 'hof');
    ort.welt.objekte[L.k(30, 26)] = { t: 'fels', hp: 6 };
    assert.match(L.spitzhackeHieb(s, ort, 30, 26).grund, /Bruno/);
    s.spieler.werkzeug.spitzhacke = 2;
    L.spitzhackeHieb(s, ort, 30, 26);
    L.spitzhackeHieb(s, ort, 30, 26);
    assert.ok(!ort.welt.objekte[L.k(30, 26)]);
    assert.ok(L.anzahl(s, 'stein') >= 10);
  });
  test('aufgeladene Werkzeuge treffen mehrere Felder', () => {
    assert.equal(L.werkzeugFelder(5, 5, 'unten', 0).length, 1);
    assert.deepEqual(L.werkzeugFelder(5, 5, 'rechts', 1), [[5, 5], [6, 5], [7, 5]]);
    assert.equal(L.werkzeugFelder(5, 5, 'oben', 3).length, 9);
  });
});

gruppe('Rucksack, Versand, Läden', () => {
  test('Stapeln nach Qualität', () => {
    const s = neues(12);
    L.hinzufuegen(s, { id: 'pastinake', n: 3 });
    L.hinzufuegen(s, { id: 'pastinake', n: 2, q: 2 });
    L.hinzufuegen(s, { id: 'pastinake', n: 1 });
    assert.equal(s.spieler.inv.filter((x) => x?.id === 'pastinake').length, 2);
    assert.equal(L.anzahl(s, 'pastinake'), 6);
    assert.equal(L.preisVon({ id: 'pastinake', n: 1, q: 2 }), 52);
  });
  test('Versandkiste zahlt über Nacht aus', () => {
    const s = neues(13);
    L.hinzufuegen(s, { id: 'blumenkohl', n: 2 });
    const gold = s.spieler.gold;
    L.versenden(s, s.spieler.inv.findIndex((x) => x?.id === 'blumenkohl'));
    assert.equal(L.versandWert(s), 350);
    const bericht = L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(bericht.summe, 350);
    assert.equal(s.spieler.gold, gold + 350);
  });
  test('Versand lässt sich zurücknehmen', () => {
    const s = neues(14);
    L.hinzufuegen(s, { id: 'holz', n: 20 });
    L.versenden(s, s.spieler.inv.findIndex((x) => x?.id === 'holz'));
    assert.equal(L.anzahl(s, 'holz'), 0);
    L.versandZurueck(s);
    assert.equal(L.anzahl(s, 'holz'), 20);
    assert.equal(s.versand.length, 0);
  });
  test('Saatgut kaufen, Werkzeug verbessern', () => {
    const s = neues(15);
    const ware = L.ladenWare(s, 'laden');
    const kohl = ware.find((w) => w.id === 'blumenkohl_saat');
    assert.ok(kohl);
    assert.ok(!ware.some((w) => w.id === 'melone_saat'));
    assert.ok(L.kaufen(s, kohl, 5).ok);
    assert.equal(s.spieler.gold, 100);
    s.spieler.gold = 5000;
    L.hinzufuegen(s, { id: 'kupferbarren', n: 5 });
    const up = L.ladenWare(s, 'schmiede').find((w) => w.werkzeug === 'hacke');
    assert.ok(L.kaufen(s, up).ok);
    assert.equal(s.spieler.werkzeug.hacke, 1);
    assert.equal(L.anzahl(s, 'kupferbarren'), 0);
  });
  test('Hühnerstall über Nacht, Küken, dann jeden Morgen Eier', () => {
    const s = neues(26);
    s.spieler.gold = 10000;
    L.hinzufuegen(s, { id: 'holz', n: 150 });
    L.hinzufuegen(s, { id: 'stein', n: 50 });
    assert.ok(!L.ladenWare(s, 'laden').some((w) => w.spezial === 'kueken'));
    const stall = L.ladenWare(s, 'schmiede').find((w) => w.spezial === 'stall');
    assert.ok(L.kaufen(s, stall).ok);
    assert.ok(!L.ladenWare(s, 'schmiede').some((w) => w.spezial === 'stall'), 'Stall doppelt kaufbar');
    L.tagBeenden(s, { r: () => 0.5 });
    assert.ok(s.stall.gebaut);
    const kueken = L.ladenWare(s, 'laden').find((w) => w.spezial === 'kueken');
    assert.ok(L.kaufen(s, kueken).ok);
    L.tagBeenden(s, { r: () => 0.5 });
    const eier = () => Object.values(L.welt(s, 'hof').objekte).filter((o) => o.t === 'sammel' && (o.id === 'ei' || o.id === 'grossesei')).length;
    assert.equal(eier(), 0, 'Küken legt in der ersten Nacht schon');
    L.tagBeenden(s, { r: () => 0.5 });
    assert.equal(eier(), 1);
  });
  test('Basteln verbraucht Zutaten', () => {
    const s = neues(16);
    L.hinzufuegen(s, { id: 'kupfererz', n: 7 });
    L.hinzufuegen(s, { id: 'kohle', n: 1 });
    const r = REZEPTE.find((x) => x.id === 'kupferbarren');
    assert.ok(L.basteln(s, r).ok);
    assert.equal(L.anzahl(s, 'kupfererz'), 2);
    assert.equal(L.anzahl(s, 'kupferbarren'), 1);
    assert.equal(L.basteln(s, r), null);
  });
  test('Einmachglas macht über Nacht Marmelade', () => {
    const s = neues(17);
    const ort = L.ortVon(s, 'hof');
    ort.welt.objekte[L.k(25, 24)] = { t: 'einmachglas', inhalt: null, fertig: false };
    L.hinzufuegen(s, { id: 'blaubeere', n: 1 });
    assert.ok(glasBenutzen(s, ort, 25, 24, s.spieler.inv.findIndex((x) => x?.id === 'blaubeere')).ok);
    L.tagBeenden(s, { r: () => 0.99 });
    assert.ok(glasBenutzen(s, ort, 25, 24, null).ok);
    const glas = s.spieler.inv.find((x) => x?.id === 'marmelade');
    assert.equal(glas.von, 'blaubeere');
    assert.equal(L.preisVon(glas), 150);
  });
});

gruppe('Dorf', () => {
  test('Gespräch gibt einmal am Tag Punkte', () => {
    const s = neues(18);
    const ort = L.ortVon(s, 'dorf');
    L.gespraech(s, 'ottilie', ort);
    L.gespraech(s, 'ottilie', ort);
    assert.equal(s.npcs.ottilie.punkte, 20);
  });
  test('Lieblingsgeschenke zählen viel, am Geburtstag achtfach', () => {
    const s = neues(19);
    L.hinzufuegen(s, { id: 'blumenkohl', n: 2 });
    const erg = L.schenken(s, 'ottilie', s.spieler.inv.findIndex((x) => x?.id === 'blumenkohl'));
    assert.equal(erg.art, 'liebt');
    assert.equal(s.npcs.ottilie.punkte, 80);
    assert.ok(L.schenken(s, 'ottilie', s.spieler.inv.findIndex((x) => x?.id === 'blumenkohl')).grund);
    s.zeit.tag = 12;
    s.npcs.ottilie.beschenkt = false;
    L.schenken(s, 'ottilie', s.spieler.inv.findIndex((x) => x?.id === 'blumenkohl'));
    assert.equal(s.npcs.ottilie.punkte, 80 + 640);
  });
  test('Bruno mag keine Blumen, aber Erz', () => {
    assert.equal(L.reaktion('bruno', { id: 'tulpe' }), 'hasst');
    assert.equal(L.reaktion('bruno', { id: 'kupfererz' }), 'mag');
    assert.equal(L.reaktion('bruno', { id: 'diamant' }), 'liebt');
  });
  test('Lene schenkt die Angel ab dem zweiten Tag', () => {
    const s = neues(20);
    const ort = L.ortVon(s, 'strand');
    L.gespraech(s, 'lene', ort);
    assert.ok(!L.hat(s, 'angel'));
    s.npcs.lene.gesprochen = false;
    s.zeit.tag = 2;
    L.gespraech(s, 'lene', ort);
    assert.ok(L.hat(s, 'angel'));
  });
  test('Aufträge lassen sich annehmen und abgeben', () => {
    const s = neues(21);
    s.brett = G.questErzeugen(s, zufall(3));
    assert.ok(ITEMS[s.brett.id] && NPCS[s.brett.npc]);
    G.questAnnehmen(s);
    L.hinzufuegen(s, { id: s.quest.id, n: s.quest.n });
    const gold = s.spieler.gold;
    const belohnung = s.quest.belohnung;
    const erg = G.questAbgeben(s, s.quest.npc);
    assert.equal(s.spieler.gold, gold + belohnung);
    assert.ok(erg && !s.quest);
  });
  test('die Mühle läuft, wenn alle Bündel voll sind', () => {
    const s = neues(22);
    s.spieler.invGroesse = 36;
    while (s.spieler.inv.length < 36) s.spieler.inv.push(null);
    const ort = L.ortVon(s, 'dorf');
    let letztes;
    for (const b of BUENDEL) {
      const eintraege = G.buendelEintraege(b).slice(0, G.buendelNoetig(b));
      for (const e of eintraege) {
        s.spieler.inv[30] = { id: e.id, n: e.n };
        letztes = G.spenden(s, b.id, 30, ort);
        assert.ok(letztes?.ok, `${b.id}: ${e.id}`);
      }
      assert.ok(G.buendelFertig(s, b));
    }
    assert.ok(letztes.muehle);
    assert.ok(s.muehle);
    assert.ok(L.hat(s, 'medaille'));
  });
  test('Briefe kommen an ihrem Tag, Mine öffnet am vierten', () => {
    const s = neues(23);
    L.briefGelesen(s, 'frieda_willkommen');
    L.tagBeenden(s, { r: () => 0.99 });
    assert.deepEqual(s.post, ['lene_angel']);
    L.tagBeenden(s, { r: () => 0.99 });
    L.tagBeenden(s, { r: () => 0.99 });
    assert.ok(s.flags.mineOffen);
  });
});

gruppe('Mine', () => {
  test('jede Ebene ist zusammenhängend und hat eine Leiter', () => {
    for (let n = 1; n <= MINE_TIEFE; n++) {
      for (let seed = 0; seed < 3; seed++) {
        const r = zufall(n * 100 + seed);
        const { def, welt, start, monster } = mineErzeugen(n, r);
        const s = neues(1);
        assert.ok(L.begehbar(s, def, welt, start.x, start.y), `Ebene ${n}: Start`);
        const steine = Object.entries(welt.objekte).filter(([, o]) => o.t === 'mstein');
        assert.ok(steine.length > 10, `Ebene ${n}: nur ${steine.length} Steine`);
        if (n < MINE_TIEFE) assert.ok(steine.some(([, o]) => o.leiter), `Ebene ${n}: keine Leiter`);
        // Ohne Steine ist jedes Bodenfeld erreichbar
        const leer = { ...welt, objekte: {} };
        const ok = erreichbar(s, def, leer, start.x, start.y);
        for (const [kk] of steine) assert.ok(ok.has(kk), `Ebene ${n}: Stein ${kk} unerreichbar`);
        for (const m of monster) assert.ok(def.grid[Math.floor((m.y - 2) / 16)][Math.floor(m.x / 16)] === 'm', `Ebene ${n}: Monster in der Wand`);
      }
    }
  });
  test('Steine geben Erz, der Leiterstein eine Leiter', () => {
    const s = neues(24);
    const { def, welt } = mineErzeugen(5, zufall(9));
    const ort = { def, welt };
    const [kk] = Object.entries(welt.objekte).find(([, o]) => o.leiter);
    const [x, y] = kk.split(',').map(Number);
    let erg;
    for (let i = 0; i < 5 && welt.objekte[kk]?.t === 'mstein'; i++) erg = L.spitzhackeHieb(s, ort, x, y, () => 0.5);
    assert.ok(erg.leiter);
    assert.equal(welt.objekte[kk].t, 'leiter');
  });
});

gruppe('Speichern', () => {
  test('Spielstand übersteht Hin- und Rückweg', () => {
    const s = neues(25);
    L.tagBeenden(s, { r: zufall(2) });
    const text = L.serialisieren(s);
    const t = L.deserialisieren(text);
    assert.deepEqual(t, JSON.parse(text));
    assert.equal(L.serialisieren(t), text);
  });
  test('fremde Daten und alte v1-Stände werden abgelehnt', () => {
    assert.throws(() => L.deserialisieren('{"version":99}'));
    const alt = JSON.parse(L.serialisieren(neues(26)));
    alt.version = 1;
    assert.throws(() => L.deserialisieren(JSON.stringify(alt)));
    assert.equal(L.SPEICHER_SCHLUESSEL, 'klarwasser-hof-v2');
  });
  test('Bereichszustand liegt in eigenen Schlüsseln und wird beim Laden ergänzt', () => {
    const s = neues(27);
    for (const k of ['mine', 'stall', 'buendel', 'flags']) assert.ok(s[k], k);
    const t = JSON.parse(L.serialisieren(s));
    delete t.mine;
    delete t.stall;
    const u = L.deserialisieren(JSON.stringify(t));
    assert.deepEqual(u.mine, { tiefste: 0, schwert: false, truhen: [] });
    assert.equal(u.stall.gebaut, false);
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
