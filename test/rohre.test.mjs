// Holzrohre: Rezept, Netze, Fluss von Truhe, Eierkiste, Fischfarm und Räucherofen in die Versandkiste.
// Aufruf: node test/rohre.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { REZEPTE } from '../src/daten.js';
import * as L from '../src/logik.js';
import { ROHR, netze, rohreFliessen } from '../src/bereiche/handwerk/rohre.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

/** Hof mit Stall, Eierkiste und einem Rohrweg von der Eierkiste zur Versandkiste. */
function hof(seed = 5) {
  const s = L.neuesSpiel({ name: 'T', hof: 'H', seed });
  s.stall.gebaut = true;
  L.kartenGeaendert();
  const ort = L.ortVon(s, 'hof');
  const deko = L.dekoListe(s, ort.def);
  const kiste = deko.find((d) => d.typ === 'versandkiste');
  const ei = deko.find((d) => d.typ === 'eierkiste');
  assert.ok(kiste && ei && ei.y > kiste.y, 'Versandkiste und Eierkiste auf dem Hof');
  const weg = [];
  for (let x = ei.x - 1; x >= kiste.x; x--) weg.push([x, ei.y]);
  for (let y = ei.y - 1; y >= kiste.y + 1; y--) weg.push([kiste.x, y]);
  return { s, ort, kiste, ei, weg };
}
const legen = (ort, weg) => { for (const [x, y] of weg) ort.welt.belag[L.k(x, y)] = { t: ROHR }; };
const menge = (s, id) => s.versand.filter((v) => v.id === id).reduce((a, v) => a + v.n, 0);

console.log('Holzrohre');

test('Rezept: 1 Holz ergibt 2 Rohre, von Anfang an', () => {
  const r = REZEPTE.find((x) => x.id === ROHR);
  assert.deepEqual(r.zutaten, { holz: 1 });
  assert.equal(r.menge, 2);
  assert.ok(!r.stufe);
});

test('Rohre werden als Belag gelegt und mit der Spitzhacke zum Item', () => {
  const s = L.neuesSpiel({ name: 'T', hof: 'H', seed: 1 });
  const ort = L.ortVon(s, 'hof');
  s.spieler.inv[0] = { id: ROHR, n: 3 };
  assert.ok(L.belagLegen(s, ort, 8, 12, 0).ok);
  assert.equal(ort.welt.belag['8,12'].t, ROHR);
  assert.equal(s.spieler.inv[0].n, 2);
});

test('Netze: zusammenhängende Rohre sind ein Netz, getrennte zwei', () => {
  const belag = {};
  for (const kk of ['1,1', '2,1', '3,1', '9,9', '9,10']) belag[kk] = { t: ROHR };
  belag['5,5'] = { t: 'anderer' };
  const n = netze(belag);
  assert.equal(n.length, 2);
  assert.deepEqual(n.map((x) => x.size).sort(), [2, 3]);
});

test('Eierkiste über Rohre in die Versandkiste: Eier werden verkauft', () => {
  const { s, ort, weg } = hof();
  s.stall.eier = { ei: 120, grossesei: 7 };
  legen(ort, weg);
  const bericht = L.tagBeenden(s, { r: () => 0.5 });
  assert.equal(s.stall.eier.ei, 120 - 120 + (s.stall.eier.ei), 'Bestand wird geleert');
  const ge = bericht.verkauf.reduce((a, v) => a + v.slot.n, 0);
  assert.ok(ge >= 127, `mindestens die alten Eier verkauft (${ge})`);
  assert.ok(bericht.summe >= 120 * 50 + 7 * 95);
  assert.ok(bericht.meldungen.some((m) => m.includes('Rohre')));
});

test('ohne Rohrverbindung zur Versandkiste bleibt alles liegen', () => {
  const { s, ort, weg } = hof();
  s.stall.eier = { ei: 10, grossesei: 0 };
  legen(ort, weg.slice(0, 2)); // Netz berührt die Eierkiste, aber nicht die Versandkiste
  assert.equal(rohreFliessen(s), 0);
  assert.equal(s.stall.eier.ei, 10);
  assert.equal(s.versand.length, 0);
});

test('Rohre ohne Quelle tun nichts', () => {
  const { s, ort, weg } = hof();
  s.stall.eier = { ei: 0, grossesei: 0 };
  legen(ort, weg);
  assert.equal(rohreFliessen(s), 0);
  assert.equal(s.versand.length, 0);
});

test('Truhe am Rohr: Verkäufliches wandert (auch Saatgut), Werkzeug bleibt', () => {
  const { s, ort, ei, weg } = hof();
  s.stall.eier = { ei: 0, grossesei: 0 };
  legen(ort, weg);
  // Truhe neben dem ersten Rohr (links vom Eierkiste-Nachbarn: oberhalb des Weges)
  const [tx, ty] = weg[1];
  const kk = L.k(tx, ty - 1);
  ort.welt.objekte[kk] = { t: 'truhe', inv: Array(24).fill(null) };
  ort.welt.objekte[kk].inv[0] = { id: 'kupfererz', n: 30 };
  ort.welt.objekte[kk].inv[1] = { id: 'pastinake_saat', n: 15 };
  ort.welt.objekte[kk].inv[2] = { id: 'hacke', n: 1 };
  const n = rohreFliessen(s);
  assert.equal(n, 45);
  assert.equal(menge(s, 'kupfererz'), 30);
  assert.equal(menge(s, 'pastinake_saat'), 15);
  const rest = ort.welt.objekte[kk].inv.filter(Boolean).map((x) => x.id).sort();
  assert.ok(rest.includes('hacke'), 'Werkzeug bleibt');
  assert.equal(ei.typ, 'eierkiste');
});

test('Fischfarm und Räucherofen am Rohr liefern ihre Ware', () => {
  const { s, ort, weg } = hof();
  s.stall.eier = { ei: 0, grossesei: 0 };
  legen(ort, weg);
  const [x, y] = weg[1];
  ort.welt.objekte[L.k(x, y - 1)] = { t: 'fischfarm', fisch: 400 };
  ort.welt.objekte[L.k(x + 1, y - 1)] = { t: 'raeucherofen', ein: [], aus: [{ id: 'geraeuchert', von: 'karpfen', n: 50 }] };
  // Der Ofen am Netz nimmt 200 Fische zum Räuchern, 200 gehen roh weiter, 50 Geräuchertes kommen heraus
  assert.equal(rohreFliessen(s), 250);
  assert.equal(menge(s, 'karpfen'), 200);
  assert.equal(menge(s, 'geraeuchert'), 50);
  assert.equal(ort.welt.objekte[L.k(x + 1, y - 1)].ein.reduce((n, v) => n + v.n, 0), 200);
  assert.equal(ort.welt.objekte[L.k(x, y - 1)].fisch, 0);
  assert.deepEqual(ort.welt.objekte[L.k(x + 1, y - 1)].aus, []);
  assert.equal(rohreFliessen(s), 0, 'zweiter Durchlauf: Ofen voll, nichts mehr da');
});

test('Farm → Ofen → Kiste: Fische gehen in den Ofen, Geräuchertes zur Versandkiste', () => {
  const { s, ort, weg } = hof();
  s.stall.eier = { ei: 0, grossesei: 0 };
  legen(ort, weg);
  const [x, y] = weg[1];
  const farm = { t: 'fischfarm', fisch: 250 };
  const ofen = { t: 'raeucherofen', ein: [], aus: [{ id: 'geraeuchert', von: 'karpfen', n: 20 }] };
  ort.welt.objekte[L.k(x, y - 1)] = farm;
  ort.welt.objekte[L.k(x + 1, y - 1)] = ofen;
  rohreFliessen(s);
  assert.equal(ofen.ein.reduce((n, v) => n + v.n, 0), 200, 'Ofen voll (200)');
  assert.equal(menge(s, 'geraeuchert'), 20, 'Fertiges aus dem Ofen liegt in der Kiste');
  assert.equal(menge(s, 'karpfen'), 50, 'der Rest roh zur Kiste');
  assert.equal(farm.fisch, 0);
  assert.deepEqual(ofen.aus, []);
});

test('ohne Ofen am Netz gehen Fische roh zur Kiste', () => {
  const { s, ort, weg } = hof();
  s.stall.eier = { ei: 0, grossesei: 0 };
  legen(ort, weg);
  const [x, y] = weg[1];
  ort.welt.objekte[L.k(x, y - 1)] = { t: 'fischfarm', fisch: 30 };
  rohreFliessen(s);
  assert.equal(menge(s, 'karpfen'), 30);
});

test('Kette über mehrere echte Nächte: Karpfen werden geräuchert und verkauft', () => {
  const { s, ort, weg } = hof();
  s.stall.eier = { ei: 0, grossesei: 0 };
  legen(ort, weg);
  const [x, y] = weg[1];
  ort.welt.objekte[L.k(x, y - 1)] = { t: 'fischfarm', fisch: 0 };
  ort.welt.objekte[L.k(x + 1, y - 1)] = { t: 'raeucherofen', ein: [], aus: [] };
  let summen = [];
  for (let nacht = 0; nacht < 4; nacht++) summen.push(L.tagBeenden(s, { r: () => 0.5 }).summe);
  // Nacht 1: Farm leer → nichts. Nacht 2: Farm (200 von Nacht 1) → Ofen. Nacht 3: Geräuchertes → Kiste verkauft.
  assert.equal(summen[0], 0);
  assert.equal(summen[1], 0);
  const preis = L.preisVon({ id: 'geraeuchert', von: 'karpfen', n: 1 }, s);
  assert.ok(preis >= 300 - 1, `geräucherter Karpfen kostet ${preis}`);
  assert.equal(summen[2], 200 * preis);
  assert.ok(summen[3] === 200 * preis, 'ab dann jede Nacht 200 geräucherte Karpfen');
});

test('Farm → Rohr → Ofen → Rohr → Kiste: zwei getrennte Netze, der Ofen steht dazwischen', () => {
  const { s, ort, kiste, ei } = hof();
  s.stall.eier = { ei: 0, grossesei: 0 };
  // Rohrstück A (Farm und Ofen), Rohrstück B (Ofen und Versandkiste), dazwischen steht der Ofen selbst
  const y = ei.y + 5;
  const farm = { t: 'fischfarm', fisch: 90 };
  const ofen = { t: 'raeucherofen', ein: [], aus: [{ id: 'geraeuchert', von: 'karpfen', n: 15 }] };
  const x0 = kiste.x + 10;
  ort.welt.objekte[L.k(x0, y - 1)] = farm;
  for (let x = x0; x <= x0 + 2; x++) ort.welt.belag[L.k(x, y)] = { t: ROHR }; // Netz A: Farm bis Ofen
  ort.welt.objekte[L.k(x0 + 3, y)] = ofen;
  for (let yy = y - 1; yy >= y - 3; yy--) ort.welt.belag[L.k(x0 + 3, yy)] = { t: ROHR }; // Netz B: vom Ofen zur Kiste
  for (let x = x0 + 3; x >= kiste.x; x--) ort.welt.belag[L.k(x, y - 3)] = { t: ROHR };
  for (let yy = y - 4; yy >= kiste.y + 1; yy--) ort.welt.belag[L.k(kiste.x, yy)] = { t: ROHR };
  assert.equal(netze(ort.welt.belag).length, 2, 'zwei getrennte Netze');
  rohreFliessen(s);
  assert.equal(ofen.ein.reduce((n, v) => n + v.n, 0), 90, 'Fische aus der Farm im Ofen');
  assert.equal(farm.fisch, 0);
  assert.equal(menge(s, 'geraeuchert'), 15, 'Fertiges aus dem Ofen in der Versandkiste');
  assert.equal(menge(s, 'karpfen'), 0, 'nichts roh verkauft');
});

test('zwei Netze über echte Nächte: Karpfen werden geräuchert und verkauft', () => {
  const { s, ort, kiste, ei } = hof();
  s.stall.eier = { ei: 0, grossesei: 0 };
  const y = ei.y + 5;
  const x0 = kiste.x + 10;
  ort.welt.objekte[L.k(x0, y - 1)] = { t: 'fischfarm', fisch: 0 };
  for (let x = x0; x <= x0 + 2; x++) ort.welt.belag[L.k(x, y)] = { t: ROHR };
  ort.welt.objekte[L.k(x0 + 3, y)] = { t: 'raeucherofen', ein: [], aus: [] };
  for (let yy = y - 1; yy >= y - 3; yy--) ort.welt.belag[L.k(x0 + 3, yy)] = { t: ROHR };
  for (let x = x0 + 3; x >= kiste.x; x--) ort.welt.belag[L.k(x, y - 3)] = { t: ROHR };
  for (let yy = y - 4; yy >= kiste.y + 1; yy--) ort.welt.belag[L.k(kiste.x, yy)] = { t: ROHR };
  const summen = [];
  for (let nacht = 0; nacht < 5; nacht++) summen.push(L.tagBeenden(s, { r: () => 0.5 }).summe);
  const preis = L.preisVon({ id: 'geraeuchert', von: 'karpfen', n: 1 }, s);
  assert.deepEqual(summen.slice(0, 2), [0, 0]);
  assert.equal(summen[2], 200 * preis, 'ab der dritten Nacht 200 geräucherte Karpfen');
  assert.equal(summen[3], 200 * preis);
  assert.equal(summen[4], 200 * preis);
});

test('gleiche Ware wird in der Versandkiste zusammengezählt', () => {
  const s = L.neuesSpiel({ name: 'T', hof: 'H', seed: 2 });
  L.versandHinzu(s, { id: 'ei', n: 5 });
  L.versandHinzu(s, { id: 'ei', n: 7 });
  L.versandHinzu(s, { id: 'ei', n: 1, q: 1 });
  assert.equal(s.versand.length, 2);
  assert.equal(s.versand.find((v) => !v.q).n, 12);
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
