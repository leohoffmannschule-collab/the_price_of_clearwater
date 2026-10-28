// Bereich „angeln": Angeln wie in Minecraft – Auswerfen, Warten, Blasenspur, Biss, Einholen;
// Fischwahl, Schatzkisten, Fangbuch, Lenes Angel und Laden.
// Aufruf: node test/angeln.test.mjs
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import '../src/bereiche/inhalt.js';
import { T, ITEMS, LAEDEN, NPCS, FISCHE, XP_STUFEN, REZEPTE, OBJEKT_TYPEN, JZ, item, fisch } from '../src/daten.js';
const fischRegistrieren = (extra) => fisch('altfisch', { name: 'Altfisch', preis: 1, bild: { art: 'fisch' }, orte: ['teich'], jz: ['sommer'], ...extra });
import { karte, raster, rahmen, rechteck, fertigRaster } from '../src/karten.js';
import { BEKANNTE_MODIFIKATOREN, modifikator, system } from '../src/system.js';
import {
  ANGELN, VORSCHAU, angelnHinweis, wurfZiel, wartezeit, wurfWerte, muellChance,
  fischWaehlen, fangWaehlen, fangGeben, schatzInhalt, schatzGeben, fischLaenge, fischePassend, muellFuer,
} from '../src/angeln.js';
import { ausruestungTabelle } from '../src/bereiche/angeln/ausruestung.js';
import { korbFang, korbTabelle, korbMuellChance, korbLeeren, korbBenutzen, KREBSKORB } from '../src/bereiche/angeln/krebskorb.js';
import { zufall } from '../src/zufall.js';
import * as L from '../src/logik.js';
import { S, spielStarten, update, karteBetreten, wechseln, schlafen } from '../src/spiel.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.stack?.split('\n').slice(0, 3).join('\n      ') ?? e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
const stufeAuf = (s, n) => { s.spieler.xp.angeln = n ? XP_STUFEN[n - 1] : 0; };

// ─── Eine Testkarte mit Wasser: Land bis x = 7, Wasser ab x = 8 (Teich), ab x = 12 Meer ────────────────
const g = rahmen(raster(30, 10, '.'), '#');
rechteck(g, 8, 1, 21, 8, '~');
karte({ id: 'angeltest', name: 'Angeltest', aussen: true, wasser: 'teich', npcWege: false, gewaesser: [{ x: 12, y: 1, b: 17, h: 8, art: 'meer' }], grid: fertigRaster(g) });

// ─── Laufzeit ohne Bildschirm ───────────────────────────────────────────────
const E = {
  richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
  aktion: { gedrueckt: false }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
};
const prot = { toene: [], meldungen: [], funde: [] };
const hooks = {
  ton: (n) => prot.toene.push(n),
  meldung: (t) => prot.meldungen.push(t),
  funde: (items) => prot.funde.push(items),
};
/** Ein Bild: Zustand der Eingabe wirkt genau ein Bild lang. */
function bild(dt = 0.05) {
  update(dt, E);
  E.benutzen.gedrueckt = false;
  E.aktion.gedrueckt = false;
  E.slot = null;
  E.rad = 0;
}
function bilder(sek, dt = 0.05) { for (let t = 0; t < sek - 1e-9; t += dt) bild(dt); }
function druecken() { E.benutzen.gedrueckt = true; bild(); }
/** Neues Spiel am Ufer: Angel in der Hand, Blick nach rechts, 10 Uhr, Frühling, Sonne. */
function frisch({ x = 2, y = 4, blick = 'rechts', stufe = 0, koeder = 0, minute = 600 } = {}) {
  const s = neues(11);
  s.zeit.minute = minute;
  s.zeit.wetter = 'sonne';
  L.hinzufuegen(s, { id: 'angel', n: 1 });
  if (koeder) L.hinzufuegen(s, { id: 'koeder', n: koeder });
  stufeAuf(s, stufe);
  spielStarten(s, hooks);
  karteBetreten('angeltest', x, y, blick);
  s.spieler.wahl = s.spieler.inv.findIndex((it) => it?.id === 'angel');
  prot.toene.length = 0;
  prot.meldungen.length = 0;
  prot.funde.length = 0;
  S.meldungZeit = {}; // gleiche Meldungen innerhalb von 1,5 s zeigt das Spiel nur einmal
  E.richtung.x = 0; E.richtung.y = 0;
  E.maus.aktiv = false;
  return s;
}
/** Wirft aus (wie die Taste) und gibt dem Wurf feste Zahlen für Wartezeit und Zufall. */
function wurf(opt = {}) {
  druecken();
  const a = S.angeln;
  assert.ok(a, 'Der Wurf läuft');
  if (opt.warte != null) a.warte = opt.warte;
  if (opt.r) a.r = opt.r;
  return a;
}
/** Bilder, bis die Phase erreicht ist; gibt die vergangene Zeit zurück. */
function bis(phase, max = 60) {
  let t = 0;
  while (S.angeln?.phase !== phase && t < max) { bild(); t += 0.05; }
  assert.equal(S.angeln?.phase, phase, `Phase ${phase} erreicht`);
  return t;
}
const anzahlImRucksack = (s) => s.spieler.inv.filter((x) => x && x.id !== 'angel').length;

// ─── Fischwahl und Fang ─────────────────────────────────────────────────────
gruppe('Fischwahl und Fang', () => {
  test('Fischwahl richtet sich nach Gewässer, Jahreszeit und Uhrzeit', () => {
    const s = neues(1);
    s.zeit.minute = 600;
    for (let i = 0; i < 40; i++) {
      const w = fischWaehlen(s, 'meer', () => (i + 0.5) / 40);
      if (w.fisch) {
        const d = w.fisch.fisch;
        assert.ok(d.orte.includes('meer') && d.jz.includes('fruehling'), w.fisch.id);
      } else assert.ok(ITEMS[w.muell], w.muell);
    }
  });
  test('Wetter und Uhrzeit sperren Fische: Wels nur bei Regen, Brasse nur abends', () => {
    const s = neues(3);
    s.zeit.minute = 720;
    s.zeit.wetter = 'sonne';
    const r = zufall(5);
    const gesehen = new Set();
    for (let i = 0; i < 600; i++) { const w = fischWaehlen(s, 'fluss', r); if (w.fisch) gesehen.add(w.fisch.id); }
    assert.ok(!gesehen.has('wels') && !gesehen.has('brasse'), [...gesehen].join());
    s.zeit.wetter = 'regen';
    s.zeit.minute = 1140; // 19 Uhr
    const nass = new Set();
    for (let i = 0; i < 1500; i++) { const w = fischWaehlen(s, 'fluss', r); if (w.fisch) nass.add(w.fisch.id); }
    assert.ok(nass.has('wels') && nass.has('brasse'), [...nass].join());
  });
  test('seltene Fische beißen seltener (Seltenheit statt Schwierigkeit)', () => {
    const s = neues(3);
    s.zeit.jz = 1;
    s.zeit.minute = 720;
    s.zeit.wetter = 'sonne';
    const r = zufall(9);
    const zaehler = {};
    for (let i = 0; i < 20000; i++) { const w = fischWaehlen(s, 'fluss', r); if (w.fisch) zaehler[w.fisch.id] = (zaehler[w.fisch.id] || 0) + 1; }
    assert.ok(zaehler.karpfen > zaehler.doebel && zaehler.doebel > zaehler.forelle && zaehler.forelle > zaehler.hecht, JSON.stringify(zaehler));
    assert.ok(ITEMS.karpfen.fisch.seltenheit < ITEMS.hecht.fisch.seltenheit);
  });
  test('ohne passenden Fisch beißt Müll', () => {
    const s = neues(4);
    s.zeit.minute = 600;
    const w = fischWaehlen(s, 'gibtesnicht', () => 0.5);
    assert.ok(w.muell && ITEMS[w.muell].kat !== 'fisch', JSON.stringify(w));
  });
  test('ein Fang landet mit Qualität im Rucksack und gibt Erfahrung', () => {
    const s = neues(2);
    const erg = fangGeben(s, null, 'karpfen', { perfekt: true, r: () => 0.01 });
    assert.ok(L.hat(s, 'karpfen'));
    assert.ok(erg.q >= 1);
    assert.ok(s.spieler.xp.angeln > 0);
    assert.equal(s.stats.gefangen, 1);
    assert.equal(erg.art, 'fisch');
  });
  test('Müll gibt Erfahrung, zählt aber nicht als Fisch', () => {
    const s = neues(2);
    const erg = fangGeben(s, null, 'stiefel');
    assert.ok(L.hat(s, 'stiefel'));
    assert.equal(erg.art, 'muell');
    assert.equal(s.spieler.xp.angeln, 3);
    assert.equal(s.stats.gefangen, 0);
    assert.deepEqual(s.angeln.gefangen, {});
  });
  test('ein voller Rucksack lässt den Fang auf dem Feld der Figur liegen', () => {
    const s = neues(2);
    s.spieler.inv.fill({ id: 'holz', n: 1 });
    const ort = L.ortVon(s, 'hof');
    const erg = fangGeben(s, ort, 'karpfen', { feld: { x: 5, y: 6 } });
    assert.ok(erg.voll);
    assert.ok(ort.welt.funde.some((f) => f.x === 5 && f.y === 6 && f.slot.id === 'karpfen'));
  });
  test('Länge liegt im Bereich des Fisches, bessere Qualität gibt größere Fänge', () => {
    const it = ITEMS.hecht;
    const [von, bis] = it.fisch.laenge;
    for (const q of [0, 1, 2]) for (let i = 0; i < 50; i++) { const l = fischLaenge(it, q, zufall(i)); assert.ok(l >= von && l <= bis, `${q}: ${l}`); }
    assert.ok(fischLaenge(it, 2, () => 0.5) > fischLaenge(it, 0, () => 0.5));
  });
  test('Perfekt: bessere Qualität und doppelte Erfahrung', () => {
    const a = neues(8);
    const b = neues(8);
    fangGeben(a, null, 'karpfen', { perfekt: false, r: () => 0.3 });
    const erg = fangGeben(b, null, 'karpfen', { perfekt: true, r: () => 0.3 });
    assert.equal(a.spieler.inv.find((x) => x?.id === 'karpfen').q || 0, 0);
    assert.equal(b.spieler.inv.find((x) => x?.id === 'karpfen').q, 1);
    assert.equal(a.spieler.xp.angeln, 8);
    assert.equal(b.spieler.xp.angeln, 22);
    assert.ok(erg.perfekt);
    // über viele Fänge: mit Perfekt deutlich öfter Silber oder Gold
    const r = zufall(3);
    let normal = 0;
    let perfekt = 0;
    for (let i = 0; i < 3000; i++) {
      if (fangGeben(neues(1), null, 'karpfen', { perfekt: false, r }).q > 0) normal++;
      if (fangGeben(neues(1), null, 'karpfen', { perfekt: true, r }).q > 0) perfekt++;
    }
    assert.ok(normal / 3000 < 0.25 && perfekt / 3000 > 0.45, `${normal} / ${perfekt}`);
  });
  test('Lene schenkt die Angel ab dem zweiten Tag', () => {
    const s = neues(20);
    const ort = L.ortVon(s, 'strand');
    L.gespraech(s, 'lene', ort);
    assert.ok(!L.hat(s, 'angel'));
    s.npcs.lene.gesprochen = false;
    s.zeit.tag = 2;
    const erg = L.gespraech(s, 'lene', ort);
    assert.ok(L.hat(s, 'angel'));
    assert.ok(erg.texte.some((t) => /einholen/i.test(t)), 'Lene erklärt das Einholen');
    assert.ok(!erg.texte.some((t) => /Balken|gedrückt/.test(t)));
  });
  test('Lenes Laden ist im Fischladen, dort steht sie tagsüber', () => {
    const o = L.ladenOrt('fischer');
    assert.equal(o.karte, 'fischladen');
    assert.ok(NPCS[LAEDEN.fischer.npc].plan.normal.some((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; }));
    assert.ok(LAEDEN.fischer.ware.some((w) => w.id === 'koeder'));
  });
});

// ─── Auswerfen ──────────────────────────────────────────────────────────────
gruppe('Auswerfen', () => {
  test('Benutzen am Wasser wirft die Schnur aufs nächste Wasserfeld in Blickrichtung', () => {
    frisch({ x: 5, y: 4 });
    const a = wurf();
    assert.equal(a.phase, 'wurf');
    assert.equal(a.x, 8);
    assert.equal(a.y, 4);
    assert.equal(a.wasser, 'teich');
    assert.ok(a.bx > 8 * T && a.bx < 9 * T && a.by > 4 * T && a.by < 5 * T, 'der Schwimmer liegt im Wasserfeld');
    assert.ok(prot.toene.includes('wurf'));
  });
  test('kein Kraftbalken: ein Druck genügt, die Schnur fliegt ca. 0,4 s und landet mit Platscher', () => {
    frisch();
    wurf();
    assert.equal(ANGELN.wurf, 0.4);
    bilder(0.3);
    assert.equal(S.angeln.phase, 'wurf');
    bilder(0.15);
    assert.equal(S.angeln.phase, 'warten');
    assert.ok(prot.toene.includes('platsch'));
    assert.ok(!('kraft' in S.angeln) && !('drill' in S.angeln));
  });
  test('bis zu 6 Felder weit; weiter weg ist freundlicher Hinweis, nichts passiert', () => {
    frisch({ x: 2, y: 4 }); // Wasser bei x = 8: genau 6 Felder
    assert.equal(wurfZiel(S).x, 8);
    druecken();
    assert.ok(S.angeln);
    frisch({ x: 1, y: 4 }); // 7 Felder
    assert.ok(wurfZiel(S).grund);
    druecken();
    assert.equal(S.angeln, null);
    assert.ok(prot.meldungen.some((m) => /Kein Wasser in Reichweite/.test(m)), prot.meldungen.join());
  });
  test('ohne Wasser in Blickrichtung: Hinweis, kein Köder weg, keine Wartezeit', () => {
    const s = frisch({ x: 3, y: 4, blick: 'links', koeder: 3 });
    druecken();
    assert.equal(S.angeln, null);
    assert.equal(L.anzahl(s, 'koeder'), 3);
    assert.ok(prot.meldungen.length === 1);
  });
  test('mit der Maus: das angeklickte Wasserfeld in Reichweite, die Figur dreht sich dorthin', () => {
    frisch({ x: 7, y: 4, blick: 'unten' });
    const z = wurfZiel(S, { x: 10, y: 5 });
    assert.deepEqual([z.x, z.y, z.blick, z.wasser], [10, 5, 'rechts', 'teich']);
    assert.equal(wurfZiel(S, { x: 13, y: 4 }).wasser, 'meer', 'die Gewässerart gehört zum angeklickten Feld');
    assert.ok(wurfZiel(S, { x: 6, y: 4 }).grund, 'Land unter dem Zeiger und nichts in Blickrichtung (unten)');
    assert.match(wurfZiel(S, { x: 20, y: 4 }).grund, /Zu weit/);
    S.sp.blick = 'rechts';
    assert.deepEqual([wurfZiel(S, { x: 6, y: 4 }).x, wurfZiel(S, { x: 6, y: 4 }).blick], [8, 'rechts'], 'Land unter dem Zeiger: Blickrichtung zählt');
  });
  test('Mausklick im Spiel: Schwimmer landet auf dem angeklickten Wasserfeld', () => {
    frisch({ x: 4, y: 4, blick: 'unten' });
    S.kamera.zoom = 4;
    S.kamera.dpr = 1;
    S.kamera.x = 0;
    S.kamera.y = 0;
    E.maus.aktiv = true;
    E.maus.x = 10 * T * 4 + 20;
    E.maus.y = 5 * T * 4 + 20;
    bild(); // der Hook merkt sich die Eingabe des Bildes
    druecken();
    assert.deepEqual([S.angeln.x, S.angeln.y], [10, 5]);
    assert.equal(S.sp.blick, 'rechts');
    E.maus.aktiv = false;
  });
  test('Köder im Rucksack wird beim Wurf verbraucht, einer je Wurf', () => {
    const s = frisch({ koeder: 2, x: 5 });
    wurf();
    assert.equal(L.anzahl(s, 'koeder'), 2, 'im Flug noch nicht');
    assert.equal(S.angeln.koeder, 'koeder');
    bis('warten');
    assert.equal(L.anzahl(s, 'koeder'), 1, 'beim Landen verbraucht');
    druecken(); // zu früh: leer eingeholt
    druecken(); // gleich wieder auswerfen, mit dem zweiten Köder
    assert.equal(S.angeln.koeder, 'koeder');
    bis('warten');
    assert.equal(L.anzahl(s, 'koeder'), 0);
    druecken();
    druecken(); // jetzt ohne Köder
    assert.equal(S.angeln.phase, 'wurf');
    assert.equal(S.angeln.koeder, null);
  });
  test('die Aktionstaste (E, Rechtsklick, „Aktion") wirft ebenfalls aus', () => {
    frisch({ x: 5 });
    E.aktion.gedrueckt = true;
    bild();
    assert.equal(S.angeln?.phase, 'wurf');
  });
  test('bei der Aktionstaste hat eine Person vor dem Wasser Vorrang', () => {
    frisch({ x: 5 });
    const n = S.npcs[0];
    Object.assign(n, { karte: 'angeltest', x: 6 * T + 8, y: 4 * T + 13, pause: 99, pfad: [] });
    bild();
    assert.notEqual(S.hinweis, 'Auswerfen');
    n.karte = null;
  });
});

// ─── Warten ─────────────────────────────────────────────────────────────────
gruppe('Wartezeit', () => {
  test('Grundwert 5 bis 22 Sekunden, zufällig', () => {
    const s = neues(1);
    assert.equal(wartezeit(s, 'angel', null, 'teich', () => 0), 5);
    assert.equal(wartezeit(s, 'angel', null, 'teich', () => 1), 22);
    assert.equal(wartezeit(s, 'angel', null, 'teich', () => 0.5), 13.5);
    const r = zufall(2);
    const w = Array.from({ length: 500 }, () => wartezeit(s, 'angel', null, 'teich', r));
    assert.ok(Math.min(...w) >= 5 && Math.max(...w) <= 22 && new Set(w).size > 100);
  });
  test('Köder halbiert die Wartezeit', () => {
    const s = neues(1);
    assert.equal(wartezeit(s, 'angel', 'koeder', 'teich', () => 1), 11);
  });
  test('4 Prozent weniger je Angelstufe', () => {
    const s = neues(1);
    for (const n of [1, 5, 10]) {
      stufeAuf(s, n);
      assert.ok(Math.abs(wartezeit(s, 'angel', null, 'teich', () => 1) - 22 * (1 - 0.04 * n)) < 1e-9, `Stufe ${n}`);
    }
  });
  test('bei Regen mal 0,8, alles zusammen multipliziert sich', () => {
    const s = neues(1);
    s.zeit.wetter = 'regen';
    assert.ok(Math.abs(wartezeit(s, 'angel', null, 'teich', () => 1) - 17.6) < 1e-9);
    stufeAuf(s, 5);
    assert.ok(Math.abs(wartezeit(s, 'angel', 'koeder', 'teich', () => 1) - 22 * 0.5 * 0.8 * 0.8) < 1e-9);
  });
  test('der Wurf rechnet mit der Wartezeit seiner Umstände', () => {
    frisch({ koeder: 1, stufe: 5 });
    const a = wurf();
    assert.ok(a.warte >= 5 * 0.5 * 0.8 - 1e-9 && a.warte <= 22 * 0.5 * 0.8 + 1e-9, String(a.warte));
  });
  test('Ruten und Köder verschieben nur Zahlen: Rute mit eigenen Werten, Modifikatoren', () => {
    const s = neues(1);
    item('testrute', { name: 'Testrute', kat: 'werkzeug', bild: { art: 'angel' }, werkzeug: 'angel', rute: { warten: 0.5, fenster: 0.5, schatz: 0.1 } });
    item('testkoeder', { name: 'Testköder', kat: 'koeder', bild: { art: 'koeder' }, koeder: { biss: 0.25, fenster: 0.2, schatz: 0.02 } });
    const w = wurfWerte(s, 'testrute', 'testkoeder');
    assert.equal(w.warten, 0.5 * 0.25);
    assert.ok(Math.abs(w.fenster - (ANGELN.fenster + 0.5 + 0.2)) < 1e-9);
    assert.ok(Math.abs(w.schatz - (ANGELN.schatz.grund + 0.1 + 0.02)) < 1e-9);
    modifikator('bissZeit', (v, k) => (k.s.flags.testBiss ? v + 100 : v));
    modifikator('bissFenster', (v, k) => (k.s.flags.testBiss ? v * 2 : v));
    modifikator('schatzChance', (v, k) => (k.s.flags.testBiss ? 1 : v));
    s.flags.testBiss = true;
    assert.equal(wartezeit(s, 'angel', null, 'teich', () => 0), 105);
    assert.equal(wurfWerte(s, 'angel', null).fenster, ANGELN.fenster * 2);
    assert.equal(wurfWerte(s, 'angel', null).schatz, 1);
    assert.ok(['bissZeit', 'bissFenster', 'schatzChance'].every((m) => BEKANNTE_MODIFIKATOREN.includes(m)));
  });
});

// ─── Biss und Einholen ──────────────────────────────────────────────────────
gruppe('Biss und Einholen', () => {
  test('Ablauf: Warten, Blasenspur (1,2 s), Biss mit Einhol-Fenster (1,0 s), dann „Zu spät"', () => {
    const vorher = anzahlImRucksack(frisch());
    wurf({ warte: 2 });
    const wartend = bis('warten');
    assert.ok(wartend <= 0.5 + 1e-9);
    const t1 = bis('spur');
    assert.ok(Math.abs(t1 - 2) <= 0.1 + 1e-9, `Wartezeit ${t1}`);
    assert.ok(prot.toene.includes('blubb'));
    const t2 = bis('biss');
    assert.ok(Math.abs(t2 - 1.2) <= 0.1 + 1e-9, `Blasenspur ${t2}`);
    assert.ok(prot.toene.includes('biss'));
    const t3 = bis('einholen');
    assert.ok(Math.abs(t3 - 1.0) <= 0.1 + 1e-9, `Fenster ${t3}`);
    assert.ok(prot.meldungen.includes('Zu spät – er ist weg.'), prot.meldungen.join());
    assert.equal(S.angeln.fang, null);
    assert.equal(anzahlImRucksack(S.s), vorher, 'kein Fang');
  });
  test('die Zeit läuft über die dt der Spielschleife: ohne Zeit keine Fortschritte', () => {
    frisch();
    wurf({ warte: 1 });
    for (let i = 0; i < 100; i++) bild(0);
    assert.equal(S.angeln.phase, 'wurf');
    assert.equal(S.angeln.t, 0);
  });
  test('zu früh im Warten: leer eingeholt, „Zu früh", kein Fang', () => {
    const s = frisch();
    wurf({ warte: 10 });
    bis('warten');
    const vorher = JSON.stringify(s.spieler.inv);
    druecken();
    assert.equal(S.angeln.phase, 'einholen');
    assert.equal(S.angeln.fang, null);
    assert.ok(prot.meldungen.some((m) => /^Zu früh/.test(m)), prot.meldungen.join());
    bilder(0.4);
    assert.equal(S.angeln, null);
    assert.equal(JSON.stringify(s.spieler.inv), vorher);
    assert.equal(s.stats.gefangen, 0);
  });
  test('zu früh in der Blasenspur: ebenfalls „Zu früh"', () => {
    frisch();
    wurf({ warte: 0.3 });
    bis('spur');
    druecken();
    assert.equal(S.angeln.phase, 'einholen');
    assert.ok(prot.meldungen.some((m) => /^Zu früh/.test(m)));
  });
  test('im Fenster eingeholt: der Fang fliegt zur Figur, dann die Fund-Anzeige', () => {
    const s = frisch();
    const vorher = anzahlImRucksack(s);
    wurf({ warte: 0.3, r: zufall(4) });
    bis('biss');
    bilder(0.5); // nicht mehr perfekt
    druecken();
    const a = S.angeln;
    assert.equal(a.phase, 'einholen');
    assert.ok(a.fang && a.fang.erg.items.length >= 1, 'Fang gewählt');
    assert.ok(!a.fang.angezeigt, 'noch im Flug');
    assert.equal(prot.funde.length, 0);
    bilder(0.55);
    assert.equal(S.angeln.phase, 'fang');
    assert.equal(prot.funde.length, 1);
    assert.ok(prot.toene.includes('fang') || prot.toene.includes('schatz'));
    assert.ok(anzahlImRucksack(s) > vorher, 'im Rucksack');
    bilder(ANGELN.fangZeit + 0.1);
    assert.equal(S.angeln, null);
  });
  test('Fenster: ein Fisch kommt in den Rucksack, mit Fangbuch und Erfahrung', () => {
    const s = frisch();
    wurf({ warte: 0.3, r: () => 0.9 }); // r 0.9: kein Schatz, kein Müll
    bis('biss');
    bilder(0.5);
    const xp = s.spieler.xp.angeln;
    druecken();
    const id = S.angeln.fang.id;
    assert.ok(ITEMS[id].kat === 'fisch', id);
    assert.ok(L.hat(s, id));
    assert.ok(s.spieler.xp.angeln > xp);
    assert.equal(s.angeln.gefangen[id].n, 1);
    assert.ok(s.angeln.gefangen[id].groesste > 0);
    assert.equal(s.stats.gefangen, 1);
  });
  test('Perfekt in den ersten 0,35 s des Fensters, später nicht', () => {
    const r = () => 0.3;
    frisch();
    wurf({ warte: 0.3, r });
    bis('biss');
    bild(); // 0,05 s
    druecken(); // 0,10 s
    assert.ok(S.angeln.fang.perfekt, 'schnell: perfekt');
    bilder(0.6);
    assert.ok(prot.meldungen.includes('Perfekt gefangen!'));
    frisch();
    wurf({ warte: 0.3, r });
    bis('biss');
    bilder(0.4);
    druecken(); // 0,45 s
    assert.ok(!S.angeln.fang.perfekt, 'langsam: nicht perfekt');
    bilder(0.6);
    assert.ok(!prot.meldungen.includes('Perfekt gefangen!'));
  });
  test('Aktionstaste holt ebenfalls ein', () => {
    frisch();
    wurf({ warte: 0.3, r: () => 0.9 });
    bis('biss');
    E.aktion.gedrueckt = true;
    bild();
    assert.equal(S.angeln.phase, 'einholen');
    assert.ok(S.angeln.fang);
  });
  test('nach dem Fang gleich wieder auswerfen; die Animation darf man nicht abkürzen', () => {
    frisch();
    wurf({ warte: 0.3, r: () => 0.9 });
    bis('biss');
    druecken();
    druecken(); // zweiter Klick mitten in der Animation: ignoriert
    assert.equal(S.angeln.phase, 'einholen');
    assert.ok(S.angeln.fang);
    bis('fang');
    druecken();
    assert.equal(S.angeln.phase, 'wurf');
    assert.equal(S.angeln.fang, null);
  });
  test('nach „Zu spät" sofort wieder auswerfen', () => {
    frisch();
    wurf({ warte: 0.3 });
    bis('einholen');
    assert.equal(S.angeln.fang, null);
    druecken();
    assert.equal(S.angeln.phase, 'wurf');
  });
  test('Aktionshinweise: Auswerfen, Einholen, Einholen!', () => {
    frisch({ x: 5 });
    bild();
    assert.equal(S.hinweis, 'Auswerfen');
    assert.ok(VORSCHAU.ziel && VORSCHAU.ziel.x === 8);
    wurf({ warte: 3 });
    bis('warten');
    bild();
    assert.equal(S.hinweis, 'Einholen');
    bis('biss');
    bild();
    assert.equal(S.hinweis, 'Einholen!');
    assert.equal(angelnHinweis(S), 'Einholen!');
    bis('einholen');
    bild();
    assert.equal(S.hinweis, 'Auswerfen');
  });
  test('ohne Wasser in Reichweite kein „Auswerfen" und keine Vorschau', () => {
    frisch({ x: 1, y: 4 });
    bild();
    assert.notEqual(S.hinweis, 'Auswerfen');
    assert.equal(VORSCHAU.ziel, null);
  });
});

// ─── Abbruch ────────────────────────────────────────────────────────────────
gruppe('Abbruch ohne Fang', () => {
  for (const phase of ['wurf', 'warten', 'spur', 'biss']) {
    test(`Laufen holt die Schnur ein (${phase})`, () => {
      const s = frisch();
      wurf({ warte: 0.5 });
      if (phase !== 'wurf') bis(phase);
      const vorher = JSON.stringify(s.spieler.inv);
      E.richtung.x = -1;
      bild();
      E.richtung.x = 0;
      assert.equal(S.angeln, null);
      assert.equal(JSON.stringify(s.spieler.inv), vorher);
      assert.ok(S.sp.x < 2 * T + 8, 'die Figur läuft gleich los');
    });
  }
  test('Laufen im selben Bild geht sofort los', () => {
    frisch({ x: 4 });
    wurf();
    const x0 = S.sp.x;
    E.richtung.x = -1;
    bild();
    E.richtung.x = 0;
    assert.ok(S.sp.x < x0);
  });
  test('Werkzeugwechsel holt die Schnur ein (Taste, Mausrad, anderes Werkzeug im Rucksack)', () => {
    const s = frisch();
    wurf();
    E.slot = 0;
    bild();
    assert.equal(S.angeln, null);
    assert.equal(s.spieler.wahl, 0, 'das neue Werkzeug gilt sofort');
    s.spieler.wahl = s.spieler.inv.findIndex((x) => x?.id === 'angel');
    wurf();
    E.rad = 1;
    bild();
    assert.equal(S.angeln, null);
    s.spieler.wahl = s.spieler.inv.findIndex((x) => x?.id === 'angel');
    wurf();
    s.spieler.wahl = 0; // etwa ein Klick auf die Hotbar
    bild();
    assert.equal(S.angeln, null);
  });
  test('ein geöffnetes Fenster oder Gespräch holt die Schnur ein', () => {
    frisch();
    wurf({ warte: 3 });
    bis('warten');
    S.pause = true;
    bild();
    assert.equal(S.angeln, null);
    S.pause = false;
  });
  test('ein Kartenwechsel beendet das Angeln', () => {
    frisch();
    wurf();
    karteBetreten('hof', 5, 5, 'unten');
    assert.equal(S.angeln, null);
  });
  test('wer die Angel verliert, holt sie nicht weiter aus', () => {
    const s = frisch();
    wurf();
    s.spieler.inv[s.spieler.wahl] = null;
    bild();
    assert.equal(S.angeln, null);
  });
});

// ─── Fisch, Müll, Schatz ────────────────────────────────────────────────────
gruppe('Fisch, Müll und Schatzkisten', () => {
  const verteilung = (stufe, n, minute = 720, wasser = 'teich') => {
    const s = neues(5);
    s.zeit.minute = minute;
    s.zeit.wetter = 'sonne';
    stufeAuf(s, stufe);
    const r = zufall(100 + stufe);
    const z = { fisch: 0, muell: 0, schatz: 0 };
    for (let i = 0; i < n; i++) {
      const w = fangWaehlen(s, wasser, r);
      z[w.schatz ? 'schatz' : w.fisch ? 'fisch' : 'muell']++;
    }
    return { fisch: z.fisch / n, muell: z.muell / n, schatz: z.schatz / n };
  };
  test('meist Fisch, manchmal Müll, selten eine Schatzkiste (Stufe 0)', () => {
    const v = verteilung(0, 30000);
    assert.ok(Math.abs(v.schatz - 0.03) < 0.006, `Schatz ${v.schatz}`);
    assert.ok(Math.abs(v.muell - 0.097) < 0.012, `Müll ${v.muell}`);
    assert.ok(v.fisch > 0.84 && v.fisch < 0.9, `Fisch ${v.fisch}`);
  });
  test('Schatzchance: 3 Prozent plus 0,4 Prozent je Stufe', () => {
    const s = neues(1);
    for (const n of [0, 1, 5, 10]) {
      stufeAuf(s, n);
      assert.ok(Math.abs(wurfWerte(s, 'angel', null).schatz - (0.03 + 0.004 * n)) < 1e-9, `Stufe ${n}`);
    }
    const v = verteilung(10, 30000);
    assert.ok(Math.abs(v.schatz - 0.07) < 0.008, `Schatz Stufe 10: ${v.schatz}`);
  });
  test('mit der Stufe weniger Müll', () => {
    const s = neues(1);
    stufeAuf(s, 0);
    const m0 = muellChance(s);
    stufeAuf(s, 10);
    assert.ok(muellChance(s) < m0 && muellChance(s) >= 0.05);
    assert.ok(verteilung(10, 30000).muell < verteilung(0, 30000).muell);
  });
  test('Müll passt zum Gewässer, Fisch zur Zeit', () => {
    const s = neues(5);
    s.zeit.minute = 720;
    const r = zufall(8);
    for (let i = 0; i < 400; i++) {
      const w = fangWaehlen(s, 'meer', r);
      if (w.muell) assert.ok(['seetang', 'treibholz', 'stiefel', 'brille'].includes(w.muell), w.muell);
      if (w.fisch) assert.ok(w.fisch.fisch.orte.includes('meer') && w.fisch.fisch.zeit[0] <= 1200 && w.fisch.fisch.zeit[1] > 1200);
    }
  });
  test('Schatzkiste: Münzen, dazu Köder, Erz oder ein kleiner Edelstein – nach Stufe gestaffelt', () => {
    const erlaubt0 = new Set(['koeder', 'kupfererz', 'quarz']);
    const s = neues(6);
    stufeAuf(s, 0);
    const r = zufall(12);
    for (let i = 0; i < 300; i++) {
      const k = schatzInhalt(s, r);
      assert.ok(k.gold >= 25 && k.gold <= 60, `Gold ${k.gold}`);
      assert.equal(k.items.length, 1);
      for (const it of k.items) { assert.ok(erlaubt0.has(it.id), it.id); assert.ok(it.n >= 1); }
    }
    stufeAuf(s, 10);
    const ids = new Set();
    for (let i = 0; i < 600; i++) {
      const k = schatzInhalt(s, r);
      assert.ok(k.gold >= 145 && k.gold <= 180, `Gold ${k.gold}`);
      assert.equal(k.items.length, 2);
      for (const it of k.items) ids.add(it.id);
    }
    for (const id of ['golderz', 'rubin', 'smaragd', 'eisenerz', 'topas', 'amethyst', 'koeder']) assert.ok(ids.has(id), `Stufe 10 findet ${id}: ${[...ids].join()}`);
    for (const id of ids) assert.ok(ITEMS[id], id);
  });
  test('Schatzkiste öffnen: Gold und Gegenstände, Erfahrung, Meldung', () => {
    const s = neues(6);
    const gold = s.spieler.gold;
    const erg = schatzGeben(s, null, { r: zufall(3) });
    assert.equal(erg.art, 'schatz');
    assert.equal(s.spieler.gold, gold + erg.gold);
    assert.ok(erg.items.length >= 1 && erg.items.every((it) => L.hat(s, it.id)));
    assert.match(erg.text, /Schatzkiste/);
    assert.ok(s.spieler.xp.angeln > 0);
    assert.deepEqual(s.angeln.gefangen, {}, 'kein Fisch im Fangbuch');
  });
  test('im Spiel: eine Schatzkiste beim Einholen', () => {
    const s = frisch();
    const gold = s.spieler.gold;
    wurf({ warte: 0.3, r: () => 0.001 });
    bis('biss');
    druecken();
    assert.equal(S.angeln.fang.art, 'schatz');
    bis('fang');
    assert.ok(prot.toene.includes('schatz'));
    assert.ok(prot.meldungen.some((m) => /^Eine Schatzkiste!/.test(m)), prot.meldungen.join());
    assert.ok(s.spieler.gold > gold);
  });
  test('im Spiel: Müll beim Einholen (kein Fisch im Fangbuch)', () => {
    const s = frisch();
    let n = 0;
    const r = () => [0.5, 0.05, 0.5][n++ % 3]; // kein Schatz, aber Müll
    wurf({ warte: 0.3, r });
    bis('biss');
    druecken();
    assert.equal(S.angeln.fang.art, 'muell');
    assert.ok(ITEMS[S.angeln.fang.id].kat !== 'fisch');
    assert.deepEqual(s.angeln.gefangen, {});
  });
});

// ─── Fangbuch und alte Spielstände ──────────────────────────────────────────
gruppe('Fangbuch', () => {
  test('neues Spiel: s.angeln.gefangen ist leer da', () => {
    assert.deepEqual(neues(1).angeln, { gefangen: {} });
  });
  test('zählt je Fisch, merkt sich die größte Länge', () => {
    const s = neues(1);
    const laengen = [];
    for (const r of [0.1, 0.9, 0.5]) laengen.push(fangGeben(s, null, 'hecht', { r: () => r }).laenge);
    fangGeben(s, null, 'karpfen');
    assert.equal(s.angeln.gefangen.hecht.n, 3);
    assert.equal(s.angeln.gefangen.hecht.groesste, Math.max(...laengen));
    assert.equal(s.angeln.gefangen.karpfen.n, 1);
    assert.deepEqual(Object.keys(s.angeln.gefangen).sort(), ['hecht', 'karpfen']);
  });
  test('ein alter Spielstand ohne s.angeln bekommt das Fangbuch beim Laden', () => {
    const s = neues(1);
    fangGeben(s, null, 'karpfen');
    const t = JSON.parse(L.serialisieren(s));
    delete t.angeln;
    const u = L.deserialisieren(JSON.stringify(t));
    assert.deepEqual(u.angeln, { gefangen: {} });
    const v = L.deserialisieren(L.serialisieren(s));
    assert.equal(v.angeln.gefangen.karpfen.n, 1, 'ein vorhandenes Fangbuch bleibt');
  });
  test('ein alter Spielstand mit s.angeln ohne gefangen wird ergänzt', () => {
    const t = JSON.parse(L.serialisieren(neues(1)));
    t.angeln = {};
    assert.deepEqual(L.deserialisieren(JSON.stringify(t)).angeln, { gefangen: {} });
  });
});

// ─── Entfernt: Kraftbalken und Drill ────────────────────────────────────────
gruppe('Kraftbalken und Drill sind weg', () => {
  test('keine Felder für Verhalten oder Schwierigkeit an den Fischen', () => {
    for (const f of FISCHE) {
      assert.ok(!('verhalten' in f.fisch) && !('schwierigkeit' in f.fisch), f.id);
      assert.ok(f.fisch.seltenheit >= 0 && f.fisch.laenge[0] > 0 && f.fisch.laenge[1] > f.fisch.laenge[0], f.id);
    }
  });
  test('der Modifikator fangBalken gibt es nicht mehr', () => {
    assert.ok(!BEKANNTE_MODIFIKATOREN.includes('fangBalken'));
  });
  test('Quelltext, README und Architektur kennen keinen Drill, Kraftbalken oder Fangbalken mehr', () => {
    const wurzel = fileURLToPath(new URL('..', import.meta.url));
    const dateien = [];
    const sammeln = (ordner) => {
      for (const n of readdirSync(ordner)) {
        const p = `${ordner}/${n}`;
        if (statSync(p).isDirectory()) sammeln(p);
        else if (/\.(js|css|html)$/.test(n)) dateien.push(p);
      }
    };
    sammeln(`${wurzel}src`);
    dateien.push(`${wurzel}README.md`, `${wurzel}ARCHITEKTUR.md`, `${wurzel}index.html`);
    const tot = /Drill|drill|Kraftbalken|Fangbalken|fangBalken|schwierigkeit|grünen Balken|Gedrückt halten zum Auswerfen/;
    for (const d of dateien) {
      const t = readFileSync(d, 'utf8');
      const m = t.match(tot);
      assert.ok(!m, `${d}: „${m?.[0]}"`);
    }
  });
});

// ─── Befunde aus dem Code-Review ────────────────────────────────────────────
gruppe('Review: Eingabe beim Auswerfen', () => {
  test('gehaltene Laufrichtung zum Wasser + Benutzen: der Wurf bleibt, der Köder wird beim Landen verbraucht', () => {
    const s = frisch({ koeder: 2, x: 5 });
    E.richtung.x = 1; // Taste weiter gedrückt
    druecken();
    assert.ok(S.angeln, 'ausgeworfen');
    bilder(0.6);
    assert.equal(S.angeln?.phase, 'warten', 'die gehaltene Taste holt die Schnur nicht ein');
    assert.equal(L.anzahl(s, 'koeder'), 1);
    E.richtung.x = 0;
    bild();
    assert.ok(S.angeln, 'Loslassen ändert nichts');
    E.richtung.x = 1; // erneut gedrückt: Laufen holt ein
    bild();
    E.richtung.x = 0;
    assert.equal(S.angeln, null);
  });
  test('ein abgebrochener Flug kostet keinen Köder', () => {
    const s = frisch({ koeder: 2, x: 5 });
    wurf();
    E.richtung.x = -1;
    bild();
    E.richtung.x = 0;
    assert.equal(S.angeln, null);
    assert.equal(L.anzahl(s, 'koeder'), 2);
  });
  test('Maus auf dem Landfeld neben der Figur: Benutzen wirft zum Wasser, die Figur dreht sich nicht weg', () => {
    const s = frisch({ x: 6, y: 4, blick: 'rechts', koeder: 1 });
    S.kamera.zoom = 4;
    S.kamera.dpr = 1;
    S.kamera.x = 0;
    S.kamera.y = 0;
    E.maus.aktiv = true;
    E.maus.x = 5 * T * 4 + 20; // Feld x = 5, links neben der Figur
    E.maus.y = 4 * T * 4 + 20;
    bild();
    assert.ok(VORSCHAU.ziel, 'die Vorschau zeigt das Wasser');
    druecken();
    E.maus.aktiv = false;
    assert.ok(S.angeln, `ausgeworfen: ${prot.meldungen.join()}`);
    assert.equal(S.sp.blick, 'rechts');
    assert.equal(S.angeln.x, 8);
    assert.equal(L.anzahl(s, 'koeder'), 1, 'noch im Flug');
  });
  test('Benutzen und Aktionstaste im selben Bild werfen nur einmal aus', () => {
    frisch({ koeder: 2, x: 5 });
    E.benutzen.gedrueckt = true;
    E.aktion.gedrueckt = true;
    bild();
    assert.equal(prot.toene.filter((t) => t === 'wurf').length, 1);
    bis('warten');
    assert.equal(L.anzahl(S.s, 'koeder'), 1);
  });
});

gruppe('Review: Ausnahmen bleiben nicht hängen', () => {
  const still = (fn) => {
    const alt = console.error;
    const meldungen = [];
    console.error = (...a) => meldungen.push(a.join(' '));
    try { fn(); } finally { console.error = alt; }
    return meldungen;
  };
  let werfen = null;
  system({
    name: 'test_review_wirft',
    karteBetreten() { if (werfen === 'karte') throw new Error('Karte kaputt'); },
    tagEnde() { if (werfen === 'tag') throw new Error('Tag kaputt'); },
    update() { if (werfen === 'update') throw new Error('Update kaputt'); },
  });
  test('wirft das Betreten einer Karte, bleibt S.uebergang nicht gesetzt', () => {
    frisch();
    werfen = 'karte';
    assert.throws(() => wechseln('angeltest', 3, 4, 'unten'), /Karte kaputt/);
    werfen = null;
    assert.equal(S.uebergang, false);
    const t = S.s.zeit.minute;
    bilder(15);
    assert.ok(S.s.zeit.minute > t, 'die Uhr läuft wieder');
  });
  test('wirft ein Hook beim Schlafen, bleibt S.pause nicht gesetzt', () => {
    frisch();
    werfen = 'tag';
    assert.throws(() => schlafen(), /Tag kaputt/);
    werfen = null;
    assert.equal(S.pause, false);
  });
  test('ein dauerhaft werfender update-Hook friert die Figur nicht ein', () => {
    frisch({ x: 4 });
    werfen = 'update';
    const x0 = S.sp.x;
    E.richtung.x = -1;
    const m = still(() => bilder(0.5));
    E.richtung.x = 0;
    werfen = null;
    assert.ok(S.sp.x < x0 - 5, 'die Figur läuft trotzdem');
    assert.ok(m.some((z) => /update/.test(z) && /Update kaputt/.test(z)), m.join());
  });
});

// ─── Inhalt: Fische, Legendäre, Ruten und Köder, Lenes Ware, Krebskorb, Fangbuch ────────────────────
gruppe('Inhalt: Fische', () => {
  const ARTEN = ['teich', 'fluss', 'see', 'waldsee', 'meer', 'geheimteich', 'mine'];
  test('rund 45 Fische, jede Gewässerart hat in jeder Jahreszeit zu jeder vollen Stunde einen Fisch', () => {
    assert.ok(FISCHE.length >= 40 && FISCHE.length <= 55, `${FISCHE.length} Fische`);
    for (const f of FISCHE) for (const o of f.fisch.orte) assert.ok(ARTEN.includes(o), `${f.id}: ${o}`);
    const s = neues(1);
    for (const art of ARTEN) for (let jz = 0; jz < 4; jz++) for (let h = 6; h < 26; h++) for (const wetter of ['sonne', 'regen']) {
      s.zeit.jz = jz; s.zeit.minute = h * 60; s.zeit.wetter = wetter;
      assert.ok(fischePassend(s, art).some((f) => !f.legendaer), `${art}, Jahreszeit ${jz}, ${h} Uhr, ${wetter}`);
    }
  });
  test('jede Gewässerart hat mindestens drei eigene Fische', () => {
    for (const art of ARTEN) assert.ok(FISCHE.filter((f) => f.fisch.orte.includes(art)).length >= 3, art);
  });
  test('die IDs, auf die andere Bereiche verweisen, bleiben (Fischfarm, Räucherofen, Bündel, Geschenke)', () => {
    for (const id of ['karpfen', 'sonnenbarsch', 'forelle', 'sardine', 'hering', 'hecht', 'lachs', 'wels', 'thunfisch', 'tintenfisch', 'kugelfisch', 'aal']) {
      assert.equal(ITEMS[id]?.kat, 'fisch', id);
      assert.equal(ITEMS[id].sorte, 'fisch', id);
    }
    assert.ok(ITEMS.karpfen.fisch.orte.includes('teich'));
  });
  test('Fische haben Preis, Länge, Text und ein eigenes Bild (Form, Farben, Zeichnung unterscheiden sich)', () => {
    const gesehen = new Map();
    for (const f of FISCHE) {
      if (f.id === 'altfisch') continue;
      assert.ok(f.preis > 0 && f.fisch.laenge[0] < f.fisch.laenge[1] && f.text, f.id);
      const b = f.bild;
      const k = [b.form, b.f, b.f2, b.muster].join('|');
      assert.ok(!gesehen.has(k), `${f.id} sieht aus wie ${gesehen.get(k)}`);
      gesehen.set(k, f.id);
    }
  });
  test('Preise nach Seltenheit: seltene Fische sind im Mittel teurer', () => {
    const normal = FISCHE.filter((f) => !f.legendaer);
    const mittel = (l) => l.reduce((a, f) => a + f.preis, 0) / l.length;
    assert.ok(mittel(normal.filter((f) => f.fisch.seltenheit >= 60)) > mittel(normal.filter((f) => f.fisch.seltenheit < 40)) * 2);
  });
});

gruppe('Inhalt: Legendäre Fische', () => {
  const LEG = FISCHE.filter((f) => f.legendaer);
  /** Ein Spielstand genau zur Zeit des Legendären. */
  const zurZeit = (f, stufe = 10) => {
    const s = neues(4);
    stufeAuf(s, stufe);
    s.zeit.jz = JZ.indexOf(f.fisch.jz[0]);
    s.zeit.minute = Math.floor(f.fisch.zeit[0] / 100) * 60 + 30;
    s.zeit.wetter = f.fisch.wetter === 'regen' ? 'regen' : 'sonne';
    return s;
  };
  test('fünf Legendäre, jeder in einem anderen Gewässer, sehr selten, teuer', () => {
    assert.equal(LEG.length, 5);
    assert.equal(new Set(LEG.map((f) => f.fisch.orte.join())).size, 5);
    for (const f of LEG) {
      assert.equal(f.fisch.seltenheit, 100, f.id);
      assert.ok(f.preis >= 1000 && f.abStufe > 0 && f.fangHinweis, f.id);
    }
  });
  test('beißen nur zu ihrer Zeit und erst ab ihrer Angelstufe', () => {
    for (const f of LEG) {
      const art = f.fisch.orte[0];
      assert.ok(fischePassend(zurZeit(f), art).includes(f), `${f.id} zur Zeit`);
      assert.ok(!fischePassend(zurZeit(f, f.abStufe - 1), art).includes(f), `${f.id} zu niedrige Stufe`);
      const s = zurZeit(f);
      s.zeit.jz = (s.zeit.jz + 1) % 4;
      if (f.fisch.jz.length < 4) assert.ok(!fischePassend(s, art).includes(f), `${f.id} andere Jahreszeit`);
    }
  });
  test('sehr selten: höchstens wenige Prozent der Fänge', () => {
    for (const f of LEG) {
      const s = zurZeit(f);
      const r = zufall(17);
      let n = 0;
      for (let i = 0; i < 4000; i++) if (fischWaehlen(s, f.fisch.orte[0], r).fisch === f) n++;
      assert.ok(n > 0 && n / 4000 < 0.05, `${f.id}: ${n}`);
    }
  });
  test('nur einmal: nach dem Fang beißt er nicht mehr, die Meldung sagt „Legendär"', () => {
    const f = LEG[0];
    const s = zurZeit(f);
    const erg = fangGeben(s, null, f.id, { r: () => 0.5 });
    assert.ok(erg.legendaer && /Legendär/.test(erg.text), erg.text);
    assert.equal(s.angeln.gefangen[f.id].n, 1);
    assert.ok(!fischePassend(s, f.fisch.orte[0]).includes(f));
    const r = zufall(3);
    for (let i = 0; i < 3000; i++) assert.notEqual(fischWaehlen(s, f.fisch.orte[0], r).fisch, f);
  });
});

gruppe('Inhalt: Ruten und Köder', () => {
  test('Bambus, Glasfaser, Iridium: immer kürzer warten, länger einholen, mehr Schätze', () => {
    const s = neues(1);
    const w = ['angel', 'glasfaserrute', 'iridiumrute'].map((id) => wurfWerte(s, id, null, 'teich'));
    assert.ok(w[0].warten > w[1].warten && w[1].warten > w[2].warten);
    assert.ok(w[0].fenster < w[1].fenster && w[1].fenster < w[2].fenster);
    assert.ok(w[0].schatz < w[1].schatz && w[1].schatz < w[2].schatz);
    for (const id of ['glasfaserrute', 'iridiumrute']) assert.equal(ITEMS[id].werkzeug, 'angel');
  });
  test('Köderarten sind nur Zahlen: Wildköder schneller mit längerem Fenster, Magnetköder mehr Schätze', () => {
    const s = neues(1);
    const ohne = wurfWerte(s, 'angel', null);
    const k = wurfWerte(s, 'angel', 'koeder');
    const wild = wurfWerte(s, 'angel', 'wildkoeder');
    const magnet = wurfWerte(s, 'angel', 'magnetkoeder');
    assert.ok(wild.warten < k.warten && k.warten < ohne.warten);
    assert.ok(wild.fenster > k.fenster);
    assert.ok(magnet.schatz > ohne.schatz + 0.05);
    assert.ok(Math.abs(wurfWerte(s, 'iridiumrute', 'wildkoeder').warten - 0.7 * 0.4) < 1e-9, 'Faktoren multiplizieren sich');
  });
  test('die Tabelle im Fangbuch passt zu den Items', () => {
    const t = ausruestungTabelle();
    assert.equal(t.ruten.length, 3);
    assert.equal(t.koeder.length, 3);
    for (const z of t.ruten) assert.equal(z.warten, ITEMS[z.id].rute.warten);
    for (const z of t.koeder) assert.equal(z.warten, ITEMS[z.id].koeder.biss);
  });
  test('Lene verkauft über ladenWare je nach Angelstufe Köder, Ruten und den Krebskorb', () => {
    const s = neues(2);
    const ids = () => L.ladenWare(s, 'fischer').map((w) => w.id);
    assert.ok(ids().includes('koeder') && !ids().includes('glasfaserrute') && !ids().includes('krebskorb'));
    stufeAuf(s, 3);
    assert.ok(ids().includes('glasfaserrute') && ids().includes('wildkoeder') && ids().includes('krebskorb'));
    assert.ok(!ids().includes('iridiumrute'));
    stufeAuf(s, 6);
    assert.ok(ids().includes('iridiumrute') && ids().includes('magnetkoeder'));
    L.hinzufuegen(s, { id: 'iridiumrute', n: 1 });
    assert.ok(!ids().includes('iridiumrute'), 'eine Rute, die man schon hat, gibt es nicht noch einmal');
    assert.ok(L.kauftKategorien('fischer').includes('krebs'));
  });
});

gruppe('Inhalt: Krebskorb', () => {
  const amWasser = () => {
    const s = neues(6);
    const ort = L.ortVon(s, 'angeltest');
    s.spieler.inv.fill(null);
    L.hinzufuegen(s, { id: 'krebskorb', n: 2 });
    L.hinzufuegen(s, { id: 'koeder', n: 5 });
    return { s, ort };
  };
  test('Bastelrezept 40 Holz und 3 Eisenbarren ab Angelstufe 3', () => {
    const r = REZEPTE.find((x) => x.id === 'krebskorb');
    assert.deepEqual(r.zutaten, { holz: 40, eisenbarren: 3 });
    assert.deepEqual(r.stufe, ['angeln', 3]);
  });
  test('nur ins Wasser, auch auf Karten, auf denen man sonst nichts aufstellen darf', () => {
    const { s, ort } = amWasser();
    assert.match(L.aufstellen(s, ort, 3, 3, 0).grund, /ins Wasser/);
    assert.ok(L.aufstellen(s, ort, 9, 3, 0).ok);
    assert.equal(ort.welt.objekte[L.k(9, 3)].t, 'krebskorb');
    assert.ok(L.aufstellen(s, ort, 9, 3, 0).grund, 'besetzt');
  });
  const korbMit = (art) => {
    const { s, ort } = amWasser();
    const x = art === 'meer' ? 14 : 9;
    L.aufstellen(s, ort, x, 3, 0);
    return { s, ort, x, o: ort.welt.objekte[L.k(x, 3)] };
  };
  test('ohne Köder fängt der Korb nichts; mit Köder über Nacht etwas, der Köder ist weg', () => {
    const { s, ort, x, o } = korbMit('teich');
    const typ = OBJEKT_TYPEN.krebskorb;
    typ.nacht({ s, ort, x, y: 3, o, r: zufall(1) });
    assert.equal(o.fang, null);
    const idx = s.spieler.inv.findIndex((it) => it?.id === 'koeder');
    assert.ok(korbBenutzen(s, o, idx).ok);
    assert.equal(o.koeder, 'koeder');
    assert.equal(L.anzahl(s, 'koeder'), 4);
    assert.match(korbBenutzen(s, o, idx).grund, /beködert/);
    L.tagBeenden(s, { r: zufall(2) });
    assert.ok(o.fang && ITEMS[o.fang], JSON.stringify(o));
    assert.equal(o.koeder, null);
  });
  test('Salzwasser: Krebs, Garnele, Hummer, Muscheln, Auster; Süßwasser: Flusskrebs und Schnecke; sonst Müll', () => {
    const s = neues(1);
    const r = zufall(8);
    const meer = new Set();
    const teich = new Set();
    for (let i = 0; i < 3000; i++) { meer.add(korbFang(s, 'meer', r)); teich.add(korbFang(s, 'teich', r)); }
    for (const id of ['krebs', 'garnele', 'hummer', 'miesmuschel', 'auster', 'herzmuschel']) assert.ok(meer.has(id), id);
    for (const id of ['flusskrebs', 'schnecke']) assert.ok(teich.has(id) && !meer.has(id), id);
    for (const id of meer) assert.ok(korbTabelle('meer').some((e) => e.id === id) || muellFuer('meer').includes(id), id);
    for (const id of teich) assert.ok(korbTabelle('teich').some((e) => e.id === id) || muellFuer('teich').includes(id), id);
    let muell = 0;
    for (let i = 0; i < 5000; i++) if (ITEMS[korbFang(s, 'see', r)].kat === 'muell') muell++;
    assert.ok(Math.abs(muell / 5000 - korbMuellChance(s)) < 0.03, `${muell}`);
    for (const id of ['krebs', 'garnele', 'hummer', 'miesmuschel', 'auster', 'flusskrebs', 'schnecke']) {
      assert.equal(ITEMS[id].sorte, 'krebs', id);
      assert.equal(ITEMS[id].kat, 'krebs', id);
    }
  });
  test('leeren: in den Rucksack, ins Fangbuch, Erfahrung; voller Rucksack lässt den Fang im Korb', () => {
    const { s, o } = korbMit('meer');
    o.fang = 'hummer';
    const voll = structuredClone(s.spieler.inv);
    s.spieler.inv.fill({ id: 'holz', n: 1 });
    assert.match(korbLeeren(s, o).grund, /voll/);
    assert.equal(o.fang, 'hummer');
    s.spieler.inv = voll;
    const erg = korbLeeren(s, o, () => 0.5);
    assert.ok(erg.ok && L.hat(s, 'hummer'));
    assert.equal(o.fang, null);
    assert.equal(s.angeln.gefangen.hummer.n, 1);
    assert.ok(s.angeln.gefangen.hummer.groesste >= 25);
    assert.equal(s.spieler.xp.angeln, KREBSKORB.xp);
  });
  test('mit Fang nicht aufhebbar, leer zurück in den Rucksack', () => {
    const { s, ort, x, o } = korbMit('teich');
    o.fang = 'schnecke';
    assert.ok(OBJEKT_TYPEN.krebskorb.nichtLeer(o));
    o.fang = null;
    const vorher = L.anzahl(s, 'krebskorb');
    L.aufheben({ s, ort, x, y: 3, kk: L.k(x, 3), o, erg: L.neuesErgebnis() });
    assert.ok(!ort.welt.objekte[L.k(x, 3)]);
    assert.equal(L.anzahl(s, 'krebskorb'), vorher + 1);
  });
  test('Korb und Fangbuch überstehen Speichern und Laden', () => {
    const { s, o } = korbMit('meer');
    o.koeder = 'koeder';
    fangGeben(s, null, 'karpfen', { r: () => 0.5 });
    const t = JSON.parse(JSON.stringify(s));
    L.ergaenzen(t);
    assert.deepEqual(t.angeln, s.angeln);
    assert.equal(t.welt.angeltest.objekte[L.k(14, 3)].koeder, 'koeder');
  });
});

gruppe('Review: Zahlen und Registrierung', () => {
  test('Modifikatoren ohne Rückgabe oder mit negativem Wert machen weder NaN noch ein negatives Fenster', () => {
    const s = neues(2);
    const alt = BEKANNTE_MODIFIKATOREN;
    assert.ok(alt.includes('bissFenster'));
    modifikator('bissFenster', () => undefined);
    modifikator('bissZeit', () => NaN);
    modifikator('schatzChance', () => -5);
    const w = wurfWerte(s, 'angel', null, 'teich');
    assert.ok(Number.isFinite(w.fenster) && w.fenster >= 0.2, `Fenster ${w.fenster}`);
    assert.ok(Number.isFinite(wartezeit(s, 'angel', null, 'teich', () => 0.5)));
    assert.equal(w.schatz, 0);
  });
  test('fisch() weist die alten Felder schwierigkeit/verhalten ab', () => {
    assert.throws(() => fischRegistrieren({ schwierigkeit: 90 }), /seltenheit und laenge/);
    assert.throws(() => fischRegistrieren({ verhalten: 'flink' }), /seltenheit und laenge/);
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
