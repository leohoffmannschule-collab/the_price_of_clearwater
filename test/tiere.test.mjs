// Bereich „tiere": Hühnerstall, Küken in beliebiger Menge, Eier in der Kiste vor dem Stall,
// Streicheln der ganzen Herde, Speicherformat samt Umwandlung alter Stände, Greta und Wilma.
// Aufruf: node test/tiere.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { LAEDEN, NPCS, BUENDEL, STAPEL_MAX } from '../src/daten.js';
import { punkt, bereichVon } from '../src/karten.js';
import * as L from '../src/logik.js';
import { zufall } from '../src/zufall.js';
import { S, spielStarten, update, karteBetreten, GEBAEUDE_AKTIONEN, DEKO_AKTIONEN } from '../src/spiel.js';
import { spenden } from '../src/bereiche/gemeinschaft/inhalt.js';
import { kistenFeld, eierHolen, eierGesamt, binomial, nachtImStall, kuekenMaximum, HUEHNER_MAX } from '../src/bereiche/tiere/inhalt.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }
const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
/** Ein Spiel mit gebautem Stall und viel Gold. */
function mitStall(seed = 7, gold = 1e12) {
  const s = neues(seed);
  s.stall.gebaut = true;
  s.spieler.gold = gold;
  return s;
}
const kueken = (s) => L.ladenWare(s, 'laden').find((w) => w.spezial === 'kueken');
const hof = (s) => L.ortVon(s, 'hof');
/** Eine Nacht mit festem Zufall. */
const nacht = (s, seed = 5) => L.tagBeenden(s, { r: zufall(seed) });

gruppe('Hühnerstall', () => {
  test('Stall über Nacht gebaut: steht am nächsten Morgen und blockiert', () => {
    const s = neues(26);
    s.spieler.gold = 10000;
    L.hinzufuegen(s, { id: 'holz', n: 150 });
    L.hinzufuegen(s, { id: 'stein', n: 50 });
    const stall = L.ladenWare(s, 'schmiede').find((w) => w.spezial === 'stall');
    assert.ok(L.kaufen(s, stall).ok);
    assert.ok(!L.ladenWare(s, 'schmiede').some((w) => w.spezial === 'stall'), 'Stall doppelt kaufbar');
    L.kartenStand(s, L.ortVon(s, 'hof').def);
    L.tagBeenden(s, { r: zufall(5) });
    assert.ok(s.stall.gebaut);
    // ohne zusätzliches kartenGeaendert(): der Tageswechsel meldet die Änderung selbst
    const g = L.gebaeudeListe(s, L.ortVon(s, 'hof').def).find((x) => x.typ === 'stall');
    assert.ok(g, 'Stall steht am Morgen nach dem Bau');
    assert.ok(!L.begehbar(s, L.ortVon(s, 'hof').def, L.welt(s, 'hof'), g.x, g.y), 'Stallfeld blockiert');
    const kiste = L.dekoListe(s, L.ortVon(s, 'hof').def).find((d) => d.typ === 'eierkiste');
    assert.ok(kiste, 'Eierkiste steht mit dem Stall');
  });
  test('Küken gibt es erst mit Stall', () => {
    const s = neues(27);
    assert.ok(!L.ladenWare(s, 'laden').some((w) => w.spezial === 'kueken'));
    s.stall.gebaut = true;
    assert.ok(kueken(s));
    assert.ok(L.ladenWare(s, 'laden').some((w) => w.spezial === 'kueken'));
  });
  test('der Stallzustand wird beim Laden ergänzt', () => {
    const t = JSON.parse(L.serialisieren(neues(28)));
    delete t.stall;
    const s = L.deserialisieren(JSON.stringify(t));
    assert.deepEqual(s.stall, { gebaut: false, bauMorgen: false, anzahl: 0, neue: 0, freundschaft: 0, gestreichelt: false, eier: { ei: 0, grossesei: 0 } });
  });
  test('der Stall führt keine Liste einzelner Hühner mehr', () => {
    const s = mitStall(29);
    assert.ok(L.kaufen(s, kueken(s), 3).ok);
    assert.equal(s.stall.huehner, undefined);
    assert.equal(s.stall.anzahl, 3);
    assert.equal(S.huehner, undefined, 'S.huehner gibt es nicht mehr');
  });
});

gruppe('Küken kaufen ohne Obergrenze', () => {
  test('ein Küken kostet 800 G und zieht sofort in den Stall', () => {
    const s = mitStall(30, 1000);
    const erg = L.kaufen(s, kueken(s));
    assert.ok(erg.ok);
    assert.equal(erg.text, 'Ein Küken ist in deinen Stall gezogen.');
    assert.equal(s.spieler.gold, 200);
    assert.equal(s.stall.anzahl, 1);
    assert.equal(s.stall.neue, 1);
  });
  test('mehr als acht, 100 und 10000 Küken gehen', () => {
    const s = mitStall(31, 800 * 20000);
    for (const n of [9, 100, 10000]) {
      const vor = s.stall.anzahl;
      const gold = s.spieler.gold;
      assert.ok(L.kaufen(s, kueken(s), n).ok, `${n} Küken`);
      assert.equal(s.stall.anzahl, vor + n);
      assert.equal(s.spieler.gold, gold - 800 * n);
    }
    assert.equal(s.stall.anzahl, 10109);
    assert.ok(kueken(s), 'Küken bleiben im Angebot');
  });
  test('Mengenkauf: Text nennt die Zahl, „so viele wie bezahlbar" passt zum Gold', () => {
    const s = mitStall(32, 800 * 37 + 799);
    const w = kueken(s);
    assert.deepEqual(w.mengen, [1, 10, 100]);
    assert.equal(w.hoechstmenge(s, w), 37);
    assert.equal(kuekenMaximum(s), 37);
    const erg = L.kaufen(s, w, 37);
    assert.ok(erg.ok);
    assert.equal(erg.text, '37 Küken sind in deinen Stall gezogen.');
    assert.equal(s.spieler.gold, 799);
    assert.equal(kuekenMaximum(s), 0);
  });
  test('reicht das Gold nicht, ändert sich nichts', () => {
    const s = mitStall(33, 800 * 5 - 1);
    const erg = L.kaufen(s, kueken(s), 5);
    assert.ok(erg.grund);
    assert.equal(s.stall.anzahl, 0);
    assert.equal(s.spieler.gold, 800 * 5 - 1);
  });
  test('ungültige Mengen kaufen nichts und kosten nichts', () => {
    const s = mitStall(34, 1e6);
    for (const n of [0, -3, NaN]) {
      const erg = L.kaufen(s, kueken(s), n);
      assert.ok(erg.grund || !erg.ok, `n=${n}`);
      assert.equal(s.stall.anzahl, 0, `n=${n}`);
      assert.ok(s.spieler.gold >= 1e6 - 0, `Gold nie weniger (n=${n})`);
    }
  });
  test('an der Obergrenze HUEHNER_MAX ist Schluss, ohne Gold zu verlieren', () => {
    const s = mitStall(35, 1e15);
    s.stall.anzahl = HUEHNER_MAX - 2;
    assert.equal(kuekenMaximum(s), 2);
    const gold = s.spieler.gold;
    assert.ok(L.kaufen(s, kueken(s), 3).grund);
    assert.equal(s.spieler.gold, gold);
    assert.ok(L.kaufen(s, kueken(s), 2).ok);
    assert.equal(s.stall.anzahl, HUEHNER_MAX);
    assert.ok(!kueken(s), 'nichts mehr im Angebot');
  });
  test('neue Küken ziehen die Zufriedenheit der Herde herunter', () => {
    const s = mitStall(36);
    s.stall.anzahl = 10;
    s.stall.freundschaft = 500;
    L.kaufen(s, kueken(s), 10);
    assert.equal(s.stall.freundschaft, 250);
    assert.equal(s.stall.anzahl, 20);
  });
});

gruppe('Eier über Nacht', () => {
  test('neue Küken legen in der ersten Nacht nichts, danach jedes eins', () => {
    const s = mitStall(40);
    L.kaufen(s, kueken(s), 10);
    nacht(s);
    assert.equal(eierGesamt(s), 0, 'erste Nacht');
    assert.equal(s.stall.neue, 0);
    nacht(s);
    assert.equal(eierGesamt(s), 10);
  });
  test('Eier pro Nacht = Anzahl minus Neue (Summe exakt), kleine und große Herde', () => {
    for (const [anzahl, neue] of [[7, 3], [500, 20], [501, 1], [100000, 99999], [10000000, 1234567]]) {
      const s = mitStall(41);
      s.stall.anzahl = anzahl;
      s.stall.neue = neue;
      s.stall.freundschaft = 400;
      const gelegt = nachtImStall(s, zufall(3));
      assert.equal(gelegt, anzahl - neue);
      assert.equal(eierGesamt(s), anzahl - neue, `${anzahl}/${neue}`);
      assert.ok(Number.isInteger(s.stall.eier.ei) && Number.isInteger(s.stall.eier.grossesei));
      assert.ok(s.stall.eier.ei >= 0 && s.stall.eier.grossesei >= 0);
    }
  });
  test('Anteil Großer Eier ist Zufriedenheit/1000 mal 0,6', () => {
    for (const [f, n] of [[0, 4000], [500, 4000], [1000, 4000], [500, 3000000]]) {
      const s = mitStall(42);
      s.stall.anzahl = n;
      s.stall.freundschaft = f + 5; // die Nacht zieht 5 ab, wenn nicht gestreichelt wurde
      nachtImStall(s, zufall(11));
      const soll = (f / 1000) * 0.6;
      const ist = s.stall.eier.grossesei / n;
      assert.ok(Math.abs(ist - soll) < 0.03, `Zufriedenheit ${f}: ${ist} statt ${soll}`);
    }
  });
  test('bei gleichem Seed kommt dasselbe heraus, bei anderem nicht immer', () => {
    const lauf = (seed, n) => { const s = mitStall(43); s.stall.anzahl = n; s.stall.freundschaft = 600; nachtImStall(s, zufall(seed)); return s.stall.eier.grossesei; };
    for (const n of [300, 80000]) {
      assert.equal(lauf(9, n), lauf(9, n));
      assert.ok(new Set([1, 2, 3, 4, 5, 6].map((sd) => lauf(sd, n))).size > 1, `Streuung bei ${n}`);
    }
  });
  test('binomial bleibt in 0..n, auch bei Randwerten', () => {
    const r = zufall(1);
    assert.equal(binomial(0, 0.5, r), 0);
    assert.equal(binomial(10, 0, r), 0);
    assert.equal(binomial(10, 1, r), 10);
    const gross = binomial(1e9, 0.0001, zufall(2));
    assert.ok(Number.isInteger(gross) && Math.abs(gross - 1e5) < 2000, `${gross}`);
    for (let i = 0; i < 200; i++) {
      const k = binomial(1000 + i, 0.001, r);
      assert.ok(k >= 0 && k <= 1000 + i);
    }
  });
  test('die Kiste füllt sich über mehrere Nächte und der Morgenbericht nennt den Bestand', () => {
    const s = mitStall(44);
    L.kaufen(s, kueken(s), 12);
    nacht(s);
    let bericht;
    for (let i = 1; i <= 4; i++) bericht = nacht(s, 5 + i);
    assert.equal(eierGesamt(s), 12 * 4);
    assert.ok(bericht.meldungen.includes('In der Eierkiste vor dem Stall liegen 48 frische Eier.'), bericht.meldungen.join('|'));
  });
  test('Streicheln hebt die Zufriedenheit um 15, fehlendes Streicheln senkt sie um 5', () => {
    const s = mitStall(45);
    s.stall.anzahl = 5;
    s.stall.freundschaft = 100;
    nachtImStall(s, zufall(1));
    assert.equal(s.stall.freundschaft, 95);
    s.stall.gestreichelt = true;
    nachtImStall(s, zufall(1));
    assert.equal(s.stall.freundschaft, 110);
    assert.equal(s.stall.gestreichelt, false);
    s.stall.freundschaft = 3;
    nachtImStall(s, zufall(1));
    assert.equal(s.stall.freundschaft, 0, 'nie unter 0');
    s.stall.freundschaft = 995;
    s.stall.gestreichelt = true;
    nachtImStall(s, zufall(1));
    assert.equal(s.stall.freundschaft, 1000, 'nie über 1000');
  });
  test('es liegen keine Eier mehr als Boden-Objekte im Auslauf', () => {
    const s = mitStall(46);
    L.kaufen(s, kueken(s), 20);
    for (let i = 0; i < 4; i++) nacht(s, 20 + i);
    assert.ok(eierGesamt(s) > 0);
    const sammel = Object.values(L.welt(s, 'hof').objekte).filter((o) => o.t === 'sammel' && (o.id === 'ei' || o.id === 'grossesei'));
    assert.equal(sammel.length, 0);
  });
  test('ohne Stall legt niemand Eier und der Zustand bleibt heil', () => {
    const s = neues(47);
    nacht(s);
    assert.equal(s.stall.anzahl, 0);
    assert.equal(eierGesamt(s), 0);
  });
});

gruppe('Eierkiste: Platz', () => {
  test('die Kiste steht unter der Gebäudezeile neben dem Eingang, nicht auf Tür und Weg', () => {
    const def = hof(neues(50)).def;
    const b = bereichVon(def, 'stall');
    const tuer = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
    const f = kistenFeld(def);
    assert.ok(f);
    assert.equal(f.y, b.y + b.h, 'direkt unter der Gebäudezeile');
    assert.ok(f.x >= b.x && f.x < b.x + b.w, 'seitlich neben dem Eingang, unter dem Stall');
    assert.notDeepEqual(f, tuer);
    assert.notDeepEqual(f, { x: tuer.x, y: tuer.y + 1 }, 'nicht auf dem Weg zur Tür');
    assert.ok(Math.abs(f.x - tuer.x) >= 1);
  });
  test('Stall mit Kiste: Tür bleibt erreichbar, die Kiste blockiert, davor kann man stehen', () => {
    const s = mitStall(51);
    L.kartenGeaendert();
    const { def, welt } = hof(s);
    const f = kistenFeld(def);
    const b = bereichVon(def, 'stall');
    const tuer = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
    assert.ok(!L.begehbar(s, def, welt, f.x, f.y), 'Kiste blockiert');
    assert.ok(L.begehbar(s, def, welt, tuer.x, tuer.y + 1), 'Weg zur Tür begehbar');
    assert.ok(L.begehbar(s, def, welt, f.x, f.y + 1), 'unter der Kiste kann man stehen');
    const d = L.dekoAn(s, def, f.x, f.y);
    assert.equal(d.typ, 'eierkiste');
    assert.equal(d.aktion, 'eierkiste');
    // erreichbar: Wegsuche vom Haus bis vor die Kiste
    const pruefer = L.begehbarPruefer(s, def, welt);
    const start = punkt('hof', 'vorHaus');
    const gesehen = new Set([`${start.x},${start.y}`]);
    const warte = [[start.x, start.y]];
    while (warte.length) {
      const [x, y] = warte.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (gesehen.has(`${nx},${ny}`) || !pruefer(nx, ny)) continue;
        gesehen.add(`${nx},${ny}`);
        warte.push([nx, ny]);
      }
    }
    assert.ok(gesehen.has(`${f.x},${f.y + 1}`), 'Feld vor der Kiste erreichbar');
    assert.ok(gesehen.has(`${tuer.x},${tuer.y + 1}`), 'Feld vor der Stalltür erreichbar');
  });
  test('ohne Stall keine Kiste, mit Stall genau eine', () => {
    const s = neues(52);
    const zaehle = () => L.dekoListe(s, hof(s).def).filter((d) => d.typ === 'eierkiste').length;
    assert.equal(zaehle(), 0);
    s.stall.gebaut = true;
    L.kartenGeaendert();
    assert.equal(zaehle(), 1);
  });
  test('die Kiste folgt einem anderen Stall-Bereich der Hofkarte', () => {
    const def = hof(neues(53)).def;
    const alt = def.bereiche.stall;
    try {
      def.bereiche.stall = [10, 12, 7, 4];
      const f = kistenFeld(def);
      assert.equal(f.y, 16);
      assert.ok(f.x >= 10 && f.x < 17);
      assert.notEqual(f.x, 13, 'nicht vor der Tür');
    } finally { def.bereiche.stall = alt; }
  });
  test('stand schon etwas auf dem Kistenfeld, räumt der Bau es weg', () => {
    const s = neues(54);
    const { def, welt } = hof(s);
    const f = kistenFeld(def);
    welt.objekte[L.k(f.x, f.y)] = { t: 'sammel', id: 'ei' };
    s.stall.bauMorgen = true;
    nacht(s);
    assert.ok(s.stall.gebaut);
    assert.equal(welt.objekte[L.k(f.x, f.y)], undefined);
  });
});

gruppe('Eierkiste: Einsammeln', () => {
  const rucksackLeeren = (s) => { s.spieler.inv = s.spieler.inv.map(() => null); };
  test('alles passt: alles geht in den Rucksack, die Kiste ist leer', () => {
    const s = mitStall(60);
    rucksackLeeren(s);
    s.stall.eier = { ei: 12, grossesei: 3 };
    const erg = eierHolen(s);
    assert.deepEqual(erg.meldungen, ['Du nimmst 12 Eier und 3 Große Eier aus der Kiste.']);
    assert.equal(L.anzahl(s, 'ei'), 12);
    assert.equal(L.anzahl(s, 'grossesei'), 3);
    assert.deepEqual(s.stall.eier, { ei: 0, grossesei: 0 });
  });
  test('Einzahl: ein Ei', () => {
    const s = mitStall(61);
    rucksackLeeren(s);
    s.stall.eier = { ei: 1, grossesei: 0 };
    assert.deepEqual(eierHolen(s).meldungen, ['Du nimmst 1 Ei aus der Kiste.']);
    s.stall.eier = { ei: 0, grossesei: 1 };
    assert.deepEqual(eierHolen(s).meldungen, ['Du nimmst 1 Großes Ei aus der Kiste.']);
  });
  test('leer: Hinweis, nichts passiert', () => {
    const s = mitStall(62);
    const vor = JSON.stringify(s.spieler.inv);
    const erg = eierHolen(s);
    assert.deepEqual(erg.meldungen, ['Noch keine Eier. Die Hühner legen sie über Nacht hierher.']);
    assert.equal(JSON.stringify(s.spieler.inv), vor);
  });
  test('Rucksack teilweise voll: es kommt mit, was passt, der Rest bleibt, nichts geht verloren', () => {
    const s = mitStall(63);
    rucksackLeeren(s);
    // alle Plätze bis auf einen mit Holz füllen
    for (let i = 0; i < s.spieler.inv.length - 1; i++) s.spieler.inv[i] = { id: 'holz', n: STAPEL_MAX };
    s.stall.eier = { ei: STAPEL_MAX + 40, grossesei: 5 };
    const vor = eierGesamt(s);
    const erg = eierHolen(s);
    assert.equal(L.anzahl(s, 'ei') + L.anzahl(s, 'grossesei') + eierGesamt(s), vor, 'Summe bleibt');
    assert.equal(L.anzahl(s, 'ei'), STAPEL_MAX);
    assert.equal(L.anzahl(s, 'grossesei'), 0);
    assert.equal(s.stall.eier.ei, 40);
    assert.equal(s.stall.eier.grossesei, 5);
    assert.deepEqual(erg.meldungen, [`Du nimmst ${STAPEL_MAX} Eier aus der Kiste.`, 'Rucksack voll – der Rest bleibt in der Kiste.']);
  });
  test('Rucksack ganz voll: nur die Meldung, der Bestand bleibt', () => {
    const s = mitStall(64);
    for (let i = 0; i < s.spieler.inv.length; i++) s.spieler.inv[i] = { id: 'holz', n: STAPEL_MAX };
    s.stall.eier = { ei: 10, grossesei: 2 };
    const erg = eierHolen(s);
    assert.deepEqual(erg.meldungen, ['Rucksack voll – der Rest bleibt in der Kiste.']);
    assert.deepEqual(s.stall.eier, { ei: 10, grossesei: 2 });
  });
  test('Eier im Rucksack stapeln sich auf vorhandene Stapel', () => {
    const s = mitStall(65);
    rucksackLeeren(s);
    s.spieler.inv[0] = { id: 'ei', n: STAPEL_MAX - 3 };
    s.stall.eier = { ei: 10, grossesei: 0 };
    eierHolen(s);
    assert.equal(L.anzahl(s, 'ei'), STAPEL_MAX + 7);
    assert.equal(s.stall.eier.ei, 0);
  });
  test('Millionen Eier in der Kiste: Einsammeln bleibt schnell und die Zahlen stimmen', () => {
    const s = mitStall(66);
    rucksackLeeren(s);
    s.stall.eier = { ei: 5e9, grossesei: 3e9 };
    const t0 = performance.now();
    eierHolen(s);
    assert.ok(performance.now() - t0 < 200);
    assert.ok(L.anzahl(s, 'ei') > 0 && L.anzahl(s, 'ei') <= STAPEL_MAX * s.spieler.inv.length);
    assert.equal(L.anzahl(s, 'ei') + s.stall.eier.ei, 5e9);
    assert.equal(L.anzahl(s, 'grossesei') + s.stall.eier.grossesei, 3e9);
  });
});

gruppe('Streicheln, Hinweise und Aktionen im Spiel', () => {
  const E = {
    richtung: { x: 0, y: 0 }, benutzen: { gedrueckt: false, gehalten: false, losgelassen: false },
    aktion: { gedrueckt: false }, maus: { x: 0, y: 0, aktiv: false }, slot: null, rad: 0, essen: false, tippen: null,
  };
  /** Startet das Spiel mit Stall und stellt die Spielerin vor die Eierkiste, den Blick nach oben. */
  function vorDieKiste(seed) {
    const s = neues(seed);
    s.zeit.minute = 600;
    spielStarten(s, {});
    S.s.stall.gebaut = true;
    S.s.zeit.wetter = 'sonne';
    L.kartenGeaendert();
    const f = kistenFeld(hof(S.s).def);
    karteBetreten('hof', f.x, f.y + 1, 'oben');
    return f;
  }
  test('es gibt keine Hühner in der Welt: S.huehner fehlt, auch im Auslauf bei Tag', () => {
    vorDieKiste(70);
    S.s.stall.anzahl = 50;
    update(0.05, E);
    assert.equal(S.huehner, undefined);
    assert.equal(S.hinweis, 'Eierkiste');
  });
  test('Aktionstaste auf die Kiste holt die Eier, der Hinweis nennt die Zahl', () => {
    vorDieKiste(71);
    S.s.spieler.inv = S.s.spieler.inv.map(() => null);
    S.s.stall.eier = { ei: 12, grossesei: 3 };
    update(0.05, E);
    assert.equal(S.hinweis, 'Eier holen (15)');
    E.aktion.gedrueckt = true;
    update(0.05, E);
    E.aktion.gedrueckt = false;
    assert.equal(L.anzahl(S.s, 'ei'), 12);
    assert.equal(L.anzahl(S.s, 'grossesei'), 3);
    assert.equal(eierGesamt(S.s), 0);
    update(0.05, E);
    assert.equal(S.hinweis, 'Eierkiste');
  });
  test('die Aktion auf den Stall streichelt alle auf einmal, nur einmal am Tag', () => {
    vorDieKiste(72);
    const texte = [];
    S.hooks.dialog = (npc, t) => texte.push(...t);
    S.s.stall.anzahl = 1200;
    GEBAEUDE_AKTIONEN.stall.fn({}, {});
    assert.ok(S.s.stall.gestreichelt);
    assert.match(texte.at(-1), /alle 1\.200 Hühner/);
    GEBAEUDE_AKTIONEN.stall.fn({}, {});
    assert.match(texte.at(-1), /heute schon gestreichelt/);
    S.s.stall.freundschaft = 100;
    nachtImStall(S.s, zufall(1));
    assert.equal(S.s.stall.freundschaft, 115, 'Streicheln hebt um 15');
    delete S.hooks.dialog;
  });
  test('leerer Stall: Hinweis auf Ottilie, nichts wird gestreichelt', () => {
    vorDieKiste(73);
    const texte = [];
    S.hooks.dialog = (npc, t) => texte.push(...t);
    GEBAEUDE_AKTIONEN.stall.fn({}, {});
    assert.match(texte[0], /Ottilie/);
    assert.equal(S.s.stall.gestreichelt, false);
    delete S.hooks.dialog;
  });
  test('die Deko-Aktion eierkiste gibt es, die alten Huhn-Aktionen nicht', () => {
    assert.ok(DEKO_AKTIONEN.eierkiste);
    assert.ok(!DEKO_AKTIONEN.huhn);
  });
});

gruppe('Speichern, Laden und alte Stände', () => {
  test('Speichern und Laden erhalten Herde, Zufriedenheit und Kiste', () => {
    const s = mitStall(80);
    L.kaufen(s, kueken(s), 25);
    nacht(s);
    nacht(s, 6);
    s.stall.gestreichelt = true;
    const t = L.deserialisieren(L.serialisieren(s));
    assert.deepEqual(t.stall, s.stall);
    L.kartenGeaendert();
    assert.ok(L.dekoListe(t, hof(t).def).some((d) => d.typ === 'eierkiste'), 'Kiste nach dem Laden da');
  });
  test('alter Stand mit Hühnerliste wird in Zahlen umgewandelt', () => {
    const s = neues(81);
    const t = JSON.parse(L.serialisieren(s));
    t.stall = {
      gebaut: true, bauMorgen: false,
      huehner: [
        { name: 'Erna', freundschaft: 100, gestreichelt: true, neu: false },
        { name: 'Rosi', freundschaft: 300, gestreichelt: true, neu: false },
        { name: 'Berta', freundschaft: 0, gestreichelt: true, neu: true },
      ],
    };
    // zwei Eier lagen noch im Auslauf, eines davon draußen im Wald
    const a = bereichVon('hof', 'auslauf');
    t.welt.hof.objekte[`${a.x + 1},${a.y + 1}`] = { t: 'sammel', id: 'ei' };
    t.welt.hof.objekte[`${a.x + 2},${a.y + 2}`] = { t: 'sammel', id: 'grossesei' };
    t.welt.hof.objekte['2,20'] = { t: 'sammel', id: 'ei' };
    const alt = L.deserialisieren(JSON.stringify(t));
    assert.equal(alt.stall.huehner, undefined, 'alte Liste entfernt');
    assert.equal(alt.stall.anzahl, 3);
    assert.equal(alt.stall.neue, 1);
    assert.equal(Math.round(alt.stall.freundschaft), 133);
    assert.equal(alt.stall.gestreichelt, true);
    assert.equal(alt.stall.gebaut, true);
    assert.deepEqual(alt.stall.eier, { ei: 1, grossesei: 1 }, 'Eier aus dem Auslauf liegen jetzt in der Kiste');
    assert.equal(alt.welt.hof.objekte[`${a.x + 1},${a.y + 1}`], undefined);
    assert.ok(alt.welt.hof.objekte['2,20'], 'Fund außerhalb des Auslaufs bleibt');
    // zweimal laden ändert nichts mehr
    const nochmal = L.deserialisieren(L.serialisieren(alt));
    assert.deepEqual(nochmal.stall, alt.stall);
  });
  test('alter Stand mit leerer Liste, ohne Stall, mit bauMorgen', () => {
    for (const alt of [{ gebaut: false, bauMorgen: false, huehner: [] }, { gebaut: false, bauMorgen: true, huehner: [] }, { gebaut: true, bauMorgen: false, huehner: [] }]) {
      const t = JSON.parse(L.serialisieren(neues(82)));
      t.stall = { ...alt };
      const s = L.deserialisieren(JSON.stringify(t));
      assert.deepEqual(s.stall, { gebaut: alt.gebaut, bauMorgen: alt.bauMorgen, anzahl: 0, neue: 0, freundschaft: 0, gestreichelt: false, eier: { ei: 0, grossesei: 0 } }, JSON.stringify(alt));
    }
  });
  test('kaputte Zahlen im Stand werden zu heilen Ganzzahlen', () => {
    const t = JSON.parse(L.serialisieren(neues(83)));
    t.stall = { gebaut: true, bauMorgen: false, anzahl: -5.7, neue: 99, freundschaft: 'x', gestreichelt: 1, eier: { ei: NaN, grossesei: 4.9 } };
    const s = L.deserialisieren(JSON.stringify(t));
    assert.equal(s.stall.anzahl, 0);
    assert.equal(s.stall.neue, 0);
    assert.equal(s.stall.freundschaft, 0);
    assert.equal(s.stall.gestreichelt, true);
    assert.deepEqual(s.stall.eier, { ei: 0, grossesei: 4 });
  });
  test('der Spielstand bleibt auch bei 100000 Hühnern klein', () => {
    const s = mitStall(84);
    s.stall.anzahl = 100000;
    nachtImStall(s, zufall(1));
    nachtImStall(s, zufall(2));
    const klein = L.serialisieren(neues(84)).length;
    const gross = L.serialisieren(s).length;
    assert.ok(gross - klein < 300, `Unterschied ${gross - klein} Zeichen`);
    assert.ok(gross < 256 * 1024, `${gross} Zeichen`);
  });
});

gruppe('Laufzeit', () => {
  test('eine Nacht mit 10 Millionen Hühnern dauert unter einer Sekunde', () => {
    const s = mitStall(90);
    s.stall.anzahl = 1e7;
    const t0 = performance.now();
    nacht(s);
    nacht(s, 6);
    const dauer = performance.now() - t0;
    assert.ok(dauer < 1000, `${Math.round(dauer)} ms`);
    assert.ok(eierGesamt(s) > 0);
  });
  test('Gold und Anzahl bleiben bei sehr vielen Käufen ganzzahlig und nie negativ', () => {
    const s = mitStall(91, 800 * 3e6);
    assert.ok(L.kaufen(s, kueken(s), 3e6).ok);
    assert.equal(s.spieler.gold, 0);
    assert.equal(s.stall.anzahl, 3e6);
    assert.ok(L.kaufen(s, kueken(s), 1).grund);
    assert.equal(s.spieler.gold, 0);
  });
});

gruppe('Greta und Wilma', () => {
  test('Zimmerei und Ranch haben eine Person an der Theke', () => {
    for (const id of ['zimmerei', 'ranch']) {
      const l = LAEDEN[id];
      assert.ok(NPCS[l.npc], id);
      const o = L.ladenOrt(id);
      assert.ok(NPCS[l.npc].plan.normal.some((e) => { const z = L.planZiel(e); return z && z.karte === o.karte && z.x === o.x && z.y === o.y; }), id);
    }
  });
  test('Wilma verkauft Küken in Mengen', () => {
    const s = mitStall(95);
    const w = L.ladenWare(s, 'ranch').find((x) => x.spezial === 'kueken');
    assert.ok(w);
    assert.deepEqual(w.mengen, [1, 10, 100]);
    assert.ok(L.kaufen(s, w, 10).ok);
    assert.equal(s.stall.anzahl, 10);
  });
  test('Eier aus der Kiste lassen sich ins Mühlen-Bündel „Vom Hühnerhof" geben', () => {
    const b = BUENDEL.find((x) => x.id === 'hof');
    assert.ok(b.items.includes('ei') && b.items.includes('grossesei'));
    const s = mitStall(96);
    s.spieler.inv = s.spieler.inv.map(() => null);
    s.stall.eier = { ei: 2, grossesei: 1 };
    eierHolen(s);
    for (const id of ['ei', 'grossesei']) {
      const idx = s.spieler.inv.findIndex((x) => x && x.id === id);
      const erg = spenden(s, 'hof', idx, hof(s));
      assert.ok(erg?.ok, id);
    }
    assert.equal(s.buendel.hof.length, 2);
    assert.equal(L.anzahl(s, 'ei'), 1);
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
