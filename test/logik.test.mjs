// Prüft Daten und Spiellogik ohne Browser. (Karten, Punkte und Wege: karten.test.mjs)
// Feldarbeit läuft auf einer eigenen Testkarte, damit die Tests nicht von der Hofkarte abhängen.
// Was zu einem Bereich gehört (Stall, Maschinen, Mine, Angeln …), prüft test/<bereich>.test.mjs.
// Aufruf: node test/logik.test.mjs  (STRENG=1: erwartete fremde IDs müssen alle da sein)
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import {
  ITEMS, PFLANZEN, NPCS, LAEDEN, REZEPTE, BUENDEL, BRIEFE, FISCHE, JZ, TAGE_PRO_JZ, SPEZIAL_WARE, ERWARTET,
  item, rezept,
} from '../src/daten.js';
import { KARTEN, karte, wasserArt, raster, rechteck, fertigRaster } from '../src/karten.js';
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
const STRENG = !!process.env.STRENG;
/** Gibt es den Gegenstand – oder ist er als fremde ID erwartet (bis alles zusammengeführt ist)? */
const gibtEs = (id) => !!ITEMS[id] || (!STRENG && ERWARTET.has(id));

// Testacker: farmbar, draußen, mit Teich (12×8), damit Feldarbeit nicht von der Hofkarte abhängt
const acker = raster(14, 10, '.');
rechteck(acker, 0, 0, 14, 1, '#');
rechteck(acker, 0, 9, 14, 1, '#');
rechteck(acker, 0, 0, 1, 10, '#');
rechteck(acker, 13, 0, 1, 10, '#');
rechteck(acker, 10, 6, 3, 3, '~');
karte({ id: 'testacker', name: 'Testacker', aussen: true, farmbar: true, wasser: 'teich', npcWege: false, grid: fertigRaster(acker) });
const ackerVon = (s) => L.ortVon(s, 'testacker');

gruppe('Daten', () => {
  test('jede Pflanze hat Saat und Ernte als Gegenstand', () => {
    for (const p of Object.values(PFLANZEN)) {
      assert.ok(ITEMS[p.saat], p.saat);
      assert.ok(ITEMS[p.ernte], p.ernte);
      assert.ok(p.jz.every((j) => JZ.includes(j)), p.id);
    }
  });
  test('Rezepte, Läden, Bündel und Dorfbewohner verweisen auf echte (oder erwartete) Gegenstände', () => {
    for (const r of REZEPTE) {
      assert.ok(gibtEs(r.ergebnis), r.id);
      for (const id of Object.keys(r.zutaten)) assert.ok(gibtEs(id), `${r.id}: ${id}`);
    }
    for (const L2 of Object.values(LAEDEN)) {
      for (const w of typeof L2.ware === 'function' ? [] : L2.ware) {
        if (w.id) assert.ok(gibtEs(w.id), w.id);
        if (w.spezial) assert.ok(SPEZIAL_WARE[w.spezial], `Spezialware ${w.spezial}`);
      }
      assert.ok(NPCS[L2.npc], `${L2.name}: Dorfbewohner ${L2.npc}`);
    }
    for (const b of BUENDEL) {
      for (const e of G.buendelEintraege(b)) assert.ok(gibtEs(e.id), `${b.id}: ${e.id}`);
      if (b.belohnung.id) assert.ok(gibtEs(b.belohnung.id), b.belohnung.id);
    }
    for (const [id, n] of Object.entries(NPCS)) {
      for (const liste of ['liebt', 'mag', 'magNicht', 'hasst']) {
        for (const e of n[liste] || []) if (!e.startsWith('kat:')) assert.ok(gibtEs(e), `${id}.${liste}: ${e}`);
      }
      for (const g of Object.values(n.herzGeschenk || {})) assert.ok(gibtEs(g.id), `${id}: ${g.id}`);
      for (const jz of JZ) assert.ok(n.zeilen[jz]?.length, `${id}: Zeilen für ${jz}`);
    }
    const fehlen = [...ERWARTET].filter((id) => !ITEMS[id]);
    if (fehlen.length) console.log(`      (erwartet, noch nicht da: ${fehlen.join(', ')})`);
  });
  test('jedes Gewässer auf den Karten hat in jeder Jahreszeit mindestens einen Fisch', () => {
    const arten = new Set(['teich', 'fluss', 'meer', 'see', 'waldsee', 'geheimteich', 'mine']);
    for (const def of Object.values(KARTEN)) {
      if (def.wasser) arten.add(def.wasser);
      for (const g of def.gewaesser) arten.add(g.art);
    }
    for (const ort of arten) {
      for (const jz of JZ) assert.ok(FISCHE.some((f) => f.fisch.orte.includes(ort) && f.fisch.jz.includes(jz)), `${ort}/${jz}`);
    }
  });
  test('Gewässerart je Feld: Rechtecke vor dem Standard der Karte', () => {
    const def = karte({
      id: 'testgewaesser', name: 'Test', grid: ['~~~~', '~~~~'], wasser: 'fluss', gewaesser: [{ x: 2, y: 0, b: 2, h: 2, art: 'waldsee' }],
    });
    assert.equal(wasserArt(def, 0, 0), 'fluss');
    assert.equal(wasserArt({ def }, 3, 1), 'waldsee');
    assert.equal(wasserArt({ def: { gewaesser: [] } }, 0, 0), null);
  });
  test('Briefe haben Absender und Text, genau einer ist der Startbrief', () => {
    for (const b of BRIEFE) assert.ok(b.von && b.text.length > 20, b.id);
    assert.equal(BRIEFE.filter((b) => b.start).length, 1);
  });
  test('Iridium steht in den Tabellen, Upgrades nur mit vorhandenem Barren', () => {
    assert.equal(L.werkzeugName('hacke', 4), 'Iridiumhacke');
    const s = neues(30);
    s.spieler.werkzeug.hacke = 3;
    if (!ITEMS.iridiumbarren) assert.ok(!L.ladenWare(s, 'schmiede').some((w) => w.werkzeug === 'hacke'), 'Iridium-Upgrade ohne Iridiumbarren');
    assert.equal(L.preisVon({ id: 'pastinake', n: 1, q: 3 }), ITEMS.pastinake.preis * 2);
    assert.equal(L.werkzeugFelder(5, 5, 'unten', 4).length, 18);
  });
});

gruppe('Neues Spiel', () => {
  const s = neues();
  test('Startausrüstung und Geld', () => {
    for (const id of ['hacke', 'giesskanne', 'axt', 'spitzhacke', 'sense']) assert.ok(L.hat(s, id), id);
    assert.ok(s.spieler.inv.some((x) => x && ITEMS[x.id].kat === 'saat'), 'Saatgut zum Start');
    assert.equal(s.spieler.gold, 500);
  });
  test('man beginnt zu Hause', () => {
    const z = L.zuhause(s);
    assert.deepEqual([s.spieler.karte, s.spieler.x, s.spieler.y], [z.karte, z.x, z.y]);
  });
  test('der erste Brief liegt bereit', () => {
    assert.ok(s.post.length >= 1);
    assert.ok(s.post.every((id) => L.briefVon(id)));
  });
});

gruppe('Feldarbeit', () => {
  test('Hacken, säen, gießen, wachsen, ernten', () => {
    const s = neues(3);
    const ort = ackerVon(s);
    const [x, y] = [3, 3];
    assert.equal(L.hacken(s, ort, [[x, y]]).n, 1);
    L.hinzufuegen(s, { id: 'pastinake_saat', n: 1 });
    const vorher = L.anzahl(s, 'pastinake_saat');
    assert.ok(L.saeen(s, ort, x, y, s.spieler.inv.findIndex((i) => i?.id === 'pastinake_saat')).ok);
    assert.equal(L.anzahl(s, 'pastinake_saat'), vorher - 1);
    s.zeit.jz = 0;
    for (let tag = 0; tag < PFLANZEN.pastinake.tage; tag++) {
      L.giessen(s, ort, [[x, y]]);
      assert.equal(L.ernten(s, ort, x, y), null, `Tag ${tag} schon reif?`);
      s.zeit.tag = 2;
      L.tagBeenden(s, { r: zufall(tag) });
    }
    const n = L.anzahl(s, 'pastinake');
    const erg = L.ernten(s, ort, x, y, zufall(1));
    assert.ok(erg?.ok, 'nicht reif nach genug gegossenen Tagen');
    assert.ok(L.anzahl(s, 'pastinake') > n);
    assert.ok(s.spieler.xp.landwirtschaft > 0);
  });
  test('ungegossene Pflanzen wachsen nicht', () => {
    const s = neues(4);
    const ort = ackerVon(s);
    L.hacken(s, ort, [[4, 3]]);
    L.hinzufuegen(s, { id: 'pastinake_saat', n: 1 });
    L.saeen(s, ort, 4, 3, s.spieler.inv.findIndex((i) => i?.id === 'pastinake_saat'));
    s.zeit.morgen = 'sonne';
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(ort.welt.felder[L.k(4, 3)].pflanze.tage, 0);
  });
  test('Mehrfach-Ernten tragen nach der Ernte erneut', () => {
    const s = neues(5);
    const p = Object.values(PFLANZEN).find((x) => x.nach > 0);
    s.zeit.jz = JZ.indexOf(p.jz[0]);
    const ort = ackerVon(s);
    ort.welt.felder[L.k(5, 3)] = { nass: false, pflanze: { id: p.id, tage: p.tage } };
    const erg = L.ernten(s, ort, 5, 3, () => 0.5);
    assert.ok(erg.ok);
    assert.ok(L.anzahl(s, p.ernte) >= p.menge);
    assert.equal(ort.welt.felder[L.k(5, 3)].pflanze.tage, p.tage - p.nach);
  });
  test('Saat außerhalb ihrer Jahreszeit wird abgelehnt, auf ganzjährigen Karten nicht', () => {
    const s = neues(6);
    const ort = ackerVon(s);
    const p = Object.values(PFLANZEN).find((x) => !x.jz.includes('fruehling'));
    ort.welt.felder[L.k(6, 3)] = { nass: false };
    L.hinzufuegen(s, { id: p.saat, n: 2 });
    const erg = L.saeen(s, ort, 6, 3, s.spieler.inv.findIndex((i) => i?.id === p.saat));
    assert.ok(erg.grund);
    const haus = { def: { ...ort.def, ganzjaehrig: true }, welt: ort.welt };
    assert.ok(L.saeen(s, haus, 6, 3, s.spieler.inv.findIndex((i) => i?.id === p.saat)).ok);
  });
  test('am Ende der Jahreszeit welken Pflanzen anderer Jahreszeiten (nicht auf ganzjährigen Karten)', () => {
    const s = neues(8);
    const ort = ackerVon(s);
    const p = Object.values(PFLANZEN).find((x) => x.jz.includes('fruehling') && !x.jz.includes('sommer'));
    ort.welt.felder[L.k(7, 3)] = { nass: true, pflanze: { id: p.id, tage: 1 } };
    karte({ id: 'testglashaus', name: 'Glashaus', aussen: true, farmbar: true, ganzjaehrig: true, grid: ['...'] });
    L.ortVon(s, 'testglashaus').welt.felder[L.k(1, 0)] = { nass: true, pflanze: { id: p.id, tage: 1 } };
    s.zeit.tag = TAGE_PRO_JZ;
    const bericht = L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(s.zeit.jz, 1);
    assert.ok(ort.welt.felder[L.k(7, 3)].pflanze.tot);
    assert.ok(!L.ortVon(s, 'testglashaus').welt.felder[L.k(1, 0)].pflanze.tot, 'ganzjährig welkt nicht');
    assert.ok(bericht.meldungen.some((m) => m.includes('verwelkt')));
  });
  test('Regen gießt alle Beete draußen', () => {
    const s = neues(9);
    const ort = ackerVon(s);
    for (const [x, y] of [[3, 5], [4, 5]]) ort.welt.felder[L.k(x, y)] = { nass: false, pflanze: { id: 'pastinake', tage: 0 } };
    s.zeit.morgen = 'regen';
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(ort.welt.felder[L.k(3, 5)].nass, true);
  });
  test('Felsbrocken brauchen eine bessere Spitzhacke', () => {
    const s = neues(11);
    const ort = ackerVon(s);
    ort.welt.objekte[L.k(8, 4)] = { t: 'fels', hp: 6 };
    assert.ok(L.spitzhackeHieb(s, ort, 8, 4).grund);
    s.spieler.werkzeug.spitzhacke = 2;
    L.spitzhackeHieb(s, ort, 8, 4);
    L.spitzhackeHieb(s, ort, 8, 4);
    assert.ok(!ort.welt.objekte[L.k(8, 4)]);
    assert.ok(L.anzahl(s, 'stein') >= 10);
  });
  test('aufgeladene Werkzeuge treffen mehrere Felder', () => {
    assert.equal(L.werkzeugFelder(5, 5, 'unten', 0).length, 1);
    assert.deepEqual(L.werkzeugFelder(5, 5, 'rechts', 1), [[5, 5], [6, 5], [7, 5]]);
    assert.equal(L.werkzeugFelder(5, 5, 'oben', 3).length, 9);
  });
  test('die Gießkanne füllt sich am Wasser', () => {
    const s = neues(12);
    s.spieler.wasser = 0;
    assert.ok(L.giessen(s, ackerVon(s), [[11, 7]]).gefuellt);
    assert.ok(s.spieler.wasser > 0);
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
    assert.equal(L.preisVon({ id: 'pastinake', n: 1, q: 2 }), Math.floor(ITEMS.pastinake.preis * 1.5));
  });
  test('Versandkiste zahlt über Nacht aus', () => {
    const s = neues(13);
    L.hinzufuegen(s, { id: 'blumenkohl', n: 2 });
    const gold = s.spieler.gold;
    const wert = ITEMS.blumenkohl.preis * 2;
    L.versenden(s, s.spieler.inv.findIndex((x) => x?.id === 'blumenkohl'));
    assert.equal(L.versandWert(s), wert);
    const bericht = L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(bericht.summe, wert);
    assert.equal(s.spieler.gold, gold + wert);
  });
  test('Versand lässt sich zurücknehmen', () => {
    const s = neues(14);
    L.hinzufuegen(s, { id: 'holz', n: 20 });
    const vorher = L.anzahl(s, 'holz');
    L.versenden(s, s.spieler.inv.findIndex((x) => x?.id === 'holz'));
    assert.equal(L.anzahl(s, 'holz'), 0);
    L.versandZurueck(s);
    assert.equal(L.anzahl(s, 'holz'), vorher);
    assert.equal(s.versand.length, 0);
  });
  test('Saatgut bei Ottilie kaufen, Werkzeug bei Bruno verbessern', () => {
    const s = neues(15);
    const ware = L.ladenWare(s, 'laden');
    const saat = ware.find((w) => w.id && ITEMS[w.id].kat === 'saat');
    assert.ok(saat, 'Saatgut im Laden');
    const gold = s.spieler.gold;
    assert.ok(L.kaufen(s, saat, 2).ok);
    assert.equal(s.spieler.gold, gold - 2 * saat.preis);
    s.spieler.gold = 5000;
    L.hinzufuegen(s, { id: 'kupferbarren', n: 5 });
    const up = L.ladenWare(s, 'schmiede').find((w) => w.werkzeug === 'hacke');
    assert.ok(L.kaufen(s, up).ok);
    assert.equal(s.spieler.werkzeug.hacke, 1);
    assert.equal(L.anzahl(s, 'kupferbarren'), 0);
  });
  test('Basteln verbraucht Zutaten', () => {
    item('testbrett', { name: 'Testbrett', kat: 'ressource', preis: 1, bild: { art: 'holz' } });
    const r = rezept('testbrett', { zutaten: { holz: 5 } });
    const s = neues(16);
    for (const [i, x] of s.spieler.inv.entries()) if (x?.id === 'holz') s.spieler.inv[i] = null;
    L.hinzufuegen(s, { id: 'holz', n: 7 });
    assert.ok(L.basteln(s, r).ok);
    assert.equal(L.anzahl(s, 'holz'), 2);
    assert.equal(L.anzahl(s, 'testbrett'), 1);
    assert.equal(L.basteln(s, r), null);
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
    const lieb = NPCS.ottilie.liebt.find((id) => ITEMS[id]);
    L.hinzufuegen(s, { id: lieb, n: 2 });
    const erg = L.schenken(s, 'ottilie', s.spieler.inv.findIndex((x) => x?.id === lieb));
    assert.equal(erg.art, 'liebt');
    assert.equal(s.npcs.ottilie.punkte, 80);
    assert.ok(L.schenken(s, 'ottilie', s.spieler.inv.findIndex((x) => x?.id === lieb)).grund);
    s.zeit.jz = JZ.indexOf(NPCS.ottilie.geburtstag.jz);
    s.zeit.tag = NPCS.ottilie.geburtstag.tag;
    s.npcs.ottilie.beschenkt = false;
    L.schenken(s, 'ottilie', s.spieler.inv.findIndex((x) => x?.id === lieb));
    assert.equal(s.npcs.ottilie.punkte, 80 + 640);
  });
  test('Bruno mag keine Blumen, aber Erz', () => {
    assert.equal(L.reaktion('bruno', { id: 'tulpe' }), 'hasst');
    assert.equal(L.reaktion('bruno', { id: 'kupfererz' }), 'mag');
    assert.equal(L.reaktion('bruno', { id: 'diamant' }), 'liebt');
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
  test('die Mühle lässt sich für 100.000.000 g reparieren', () => {
    const s = neues(24);
    const ort = L.ortVon(s, 'dorf');
    assert.equal(G.MUEHLE_PREIS, 100000000);
    s.spieler.gold = G.MUEHLE_PREIS - 1;
    const zuWenig = G.muehleKaufen(s, ort);
    assert.ok(zuWenig.grund && !s.muehle, 'ein Gold zu wenig: nichts passiert');
    assert.equal(s.spieler.gold, G.MUEHLE_PREIS - 1);
    s.spieler.gold = G.MUEHLE_PREIS + 5;
    const erg = G.muehleKaufen(s, ort);
    assert.ok(erg.ok && erg.muehle && s.muehle);
    assert.equal(s.spieler.gold, 5);
    assert.ok(L.hat(s, 'medaille'));
    const nochmal = G.muehleKaufen(s, ort);
    assert.ok(nochmal.grund && s.spieler.gold === 5, 'zweiter Kauf kostet nichts');
    assert.equal(L.hat(s, 'medaille'), true);
  });
  test('Briefe kommen an ihrem Tag', () => {
    const s = neues(23);
    for (const id of [...s.post]) L.briefGelesen(s, id);
    L.tagBeenden(s, { r: () => 0.99 });
    const erwartet = BRIEFE.filter((b) => b.tagNr === 2).map((b) => b.id);
    for (const id of erwartet) assert.ok(s.post.includes(id), id);
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
  test('Bereichszustand liegt in eigenen Schlüsseln und wird beim Laden (ergaenzen) wieder angelegt', () => {
    const s = neues(27);
    const KERN = ['version', 'seed', 'spieler', 'zeit', 'welt', 'npcs', 'briefe', 'post', 'versand', 'stufeNeu', 'flags', 'haus', 'rezepte', 'stats'];
    for (const k of KERN) assert.ok(k in s, k);
    const t = JSON.parse(L.serialisieren(s));
    const bereichsSchluessel = Object.keys(t).filter((k) => !KERN.includes(k));
    assert.ok(bereichsSchluessel.length > 0);
    for (const k of bereichsSchluessel) delete t[k];
    const u = L.deserialisieren(JSON.stringify(t));
    for (const k of bereichsSchluessel) assert.ok(k in u, `${k} wird in ergaenzen angelegt`);
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
