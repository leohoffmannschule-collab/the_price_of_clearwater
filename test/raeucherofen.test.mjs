// Räucherofen: Rezept (1 Holz + 1 Kohle), Einlegen (Grenze 200 je Ofen und Tag), Nacht, Preis genau
// zehnfach, Abholen, Aufheben, Speichern und Laden, Fischfarm-Karpfen, Bilder.
// Aufruf: node test/raeucherofen.test.mjs
import assert from 'node:assert/strict';

// Leinwand-Attrappe (Node hat kein Canvas); ungültige Farben werden gesammelt.
const ungueltigeFarben = [];
const farbeOk = (f) => typeof f === 'string' && /^#[0-9a-f]{6}$/i.test(f);
function leinwandAttrappe() {
  const g = {
    imageSmoothingEnabled: true,
    set fillStyle(f) { if (!farbeOk(f)) ungueltigeFarben.push(String(f)); },
    set strokeStyle(f) { if (!farbeOk(f)) ungueltigeFarben.push(String(f)); },
    globalAlpha: 1,
    fillRect() {}, strokeRect() {}, translate() {}, setTransform() {}, scale() {}, drawImage() {}, putImageData() {}, save() {}, restore() {},
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  };
  return { width: 0, height: 0, getContext: () => g, toDataURL: () => 'data:image/png;base64,' };
}
globalThis.document = { createElement: () => leinwandAttrappe() };

await import('../src/bereiche/inhalt.js');
await import('../src/bereiche/grafik.js');
const D = await import('../src/daten.js');
const SP = await import('../src/sprites.js');
const L = await import('../src/logik.js');
const { modifikator } = await import('../src/system.js');
const { karte, raster, rahmen, fertigRaster } = await import('../src/karten.js');
const { ofenBenutzen, ofenNacht, RAEUCHER_PRO_TAG, RAEUCHER_FAKTOR } = await import('../src/bereiche/handwerk/raeucherofen.js');
const { ITEMS, STAPEL_MAX, REZEPTE, OBJEKT_TYPEN, FISCHE, QUALITAET } = D;

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }

const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
karte({ id: 'testofen', name: 'Räucherstube', aussen: true, farmbar: true, grid: fertigRaster(rahmen(raster(10, 8, '.'), '#')) });
const OX = 4;
const OY = 4;
function mitOfen(seed) {
  const s = neues(seed);
  const ort = L.ortVon(s, 'testofen');
  ort.welt.objekte[L.k(OX, OY)] = { t: 'raeucherofen', ein: [], aus: [] };
  return { s, ort, ofen: () => ort.welt.objekte[L.k(OX, OY)] };
}
const summe = (liste) => liste.reduce((n, x) => n + x.n, 0);
/** Fisch in die Hand (neuer Platz) und Platznummer. */
function inHand(s, slot) {
  L.hinzufuegen(s, slot);
  const idx = s.spieler.inv.findIndex((x) => x && L.gleich(x, slot));
  s.spieler.wahl = idx;
  return idx;
}
/** Alle Fische (frisch und geräuchert) im Rucksack, Ofen und Versand, nach Sorte und Qualität. */
function fischBestand(s, ofenListe) {
  const m = {};
  const zaehle = (id, q, n) => { const k = `${id}:${q || 0}`; m[k] = (m[k] || 0) + n; };
  for (const x of s.spieler.inv) if (x && ITEMS[x.id].kat === 'fisch') zaehle(x.id, x.q, x.n);
  for (const o of ofenListe) {
    for (const x of o.ein) zaehle(x.id, x.q, x.n);
    for (const x of o.aus) zaehle(x.von, x.q, x.n);
  }
  for (const x of s.spieler.inv) if (x && x.id === 'geraeuchert') zaehle(x.von, x.q, x.n);
  return m;
}
const fisch1 = FISCHE[0].id;
const fisch2 = FISCHE[1].id;

gruppe('Gegenstand und Rezept', () => {
  test('Räucherofen ist ein aufstellbarer Gegenstand der Kategorie Aufstellbar', () => {
    assert.equal(ITEMS.raeucherofen.kat, 'platz');
    assert.equal(ITEMS.raeucherofen.aufstellbar, true);
    assert.ok(OBJEKT_TYPEN.raeucherofen);
  });
  test('Konstanten: 200 Fische je Tag, Faktor 10', () => {
    assert.equal(RAEUCHER_PRO_TAG, 200);
    assert.equal(RAEUCHER_FAKTOR, 10);
  });
  test('das Rezept kostet genau 1 Holz und 1 Kohle, ohne Fähigkeitsstufe, von Anfang an frei', () => {
    const r = REZEPTE.find((x) => x.id === 'raeucherofen');
    assert.deepEqual(r.zutaten, { holz: 1, kohle: 1 });
    assert.ok(!r.stufe && !r.lernen);
    assert.ok(L.rezepteVon('basteln').includes(r));
    assert.ok(L.rezeptFrei(neues(1), r));
  });
  test('Basteln zieht genau 1 Holz und 1 Kohle ab und gibt einen Ofen', () => {
    const s = neues(2);
    L.hinzufuegen(s, { id: 'holz', n: 5 });
    L.hinzufuegen(s, { id: 'kohle', n: 3 });
    const r = REZEPTE.find((x) => x.id === 'raeucherofen');
    assert.ok(L.basteln(s, r).ok);
    assert.equal(L.anzahl(s, 'holz'), 4);
    assert.equal(L.anzahl(s, 'kohle'), 2);
    assert.equal(L.anzahl(s, 'raeucherofen'), 1);
  });
  test('ohne Kohle oder ohne Holz geht es nicht', () => {
    const r = REZEPTE.find((x) => x.id === 'raeucherofen');
    const a = neues(3);
    L.hinzufuegen(a, { id: 'holz', n: 50 });
    assert.equal(L.basteln(a, r), null);
    const b = neues(4);
    L.hinzufuegen(b, { id: 'kohle', n: 50 });
    assert.equal(L.basteln(b, r), null);
  });
  test('Aufstellen auf freiem Feld, mehrere Öfen erlaubt, nicht auf Beeten', () => {
    const s = neues(5);
    const ort = L.ortVon(s, 'testofen');
    L.hinzufuegen(s, { id: 'raeucherofen', n: 2 });
    const idx = s.spieler.inv.findIndex((x) => x?.id === 'raeucherofen');
    assert.ok(L.aufstellen(s, ort, 2, 2, idx).ok);
    assert.ok(L.aufstellen(s, ort, 5, 2, idx).ok);
    assert.deepEqual(ort.welt.objekte[L.k(2, 2)], { t: 'raeucherofen', ein: [], aus: [] });
    L.hinzufuegen(s, { id: 'raeucherofen', n: 1 });
    ort.welt.felder[L.k(7, 5)] = { umgegraben: true };
    const i2 = s.spieler.inv.findIndex((x) => x?.id === 'raeucherofen');
    assert.ok(L.aufstellen(s, ort, 7, 5, i2).grund);
  });
});

gruppe('Einlegen', () => {
  test('ein Stapel kleiner als 200 geht ganz hinein', () => {
    const { s, ort, ofen } = mitOfen(10);
    const idx = inHand(s, { id: fisch1, n: 120 });
    const erg = ofenBenutzen(s, ort, OX, OY, idx);
    assert.ok(erg.ok);
    assert.equal(erg.text, '120 Fische eingelegt (120 von 200).');
    assert.equal(summe(ofen().ein), 120);
    assert.equal(s.spieler.inv[idx], null);
  });
  test('ein Stapel größer als 200: 200 gehen hinein, der Rest bleibt in der Hand', () => {
    const { s, ort, ofen } = mitOfen(11);
    const idx = inHand(s, { id: fisch1, n: 300 });
    const erg = ofenBenutzen(s, ort, OX, OY, idx);
    assert.equal(erg.text, '200 Fische eingelegt (200 von 200). 100 bleiben in der Hand.');
    assert.equal(summe(ofen().ein), 200);
    assert.equal(s.spieler.inv[idx].n, 100);
  });
  test('Meldung wie im Wunsch: 120 eingelegt bei 80 schon drin → 30 bleiben', () => {
    const { s, ort, ofen } = mitOfen(12);
    ofen().ein.push({ id: fisch1, n: 80 });
    const idx = inHand(s, { id: fisch1, n: 150 });
    const erg = ofenBenutzen(s, ort, OX, OY, idx);
    assert.equal(erg.text, '120 Fische eingelegt (200 von 200). 30 bleiben in der Hand.');
  });
  test('genau 200 füllen das Fach; ein einzelner Fisch heißt „1 Fisch"', () => {
    const { s, ort } = mitOfen(13);
    assert.equal(ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch1, n: 1 })).text, '1 Fisch eingelegt (1 von 200).');
    assert.ok(ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch1, n: 199 })).ok);
  });
  test('Gesamtgrenze 200 über mehrere Einlege-Vorgänge, Sorten und Qualitäten', () => {
    const { s, ort, ofen } = mitOfen(14);
    const vorher = fischBestand(s, [ofen()]);
    for (const slot of [{ id: fisch1, n: 70 }, { id: fisch2, n: 60, q: 2 }, { id: fisch1, n: 50, q: 1 }, { id: fisch2, n: 90 }]) {
      L.hinzufuegen(s, slot);
    }
    const summeVorher = Object.values(fischBestand(s, [ofen()])).reduce((a, b) => a + b, 0);
    assert.equal(summeVorher, 270);
    for (let i = 0; i < 6; i++) {
      const idx = s.spieler.inv.findIndex((x) => x && ITEMS[x.id].kat === 'fisch');
      if (idx < 0) break;
      s.spieler.wahl = idx;
      ofenBenutzen(s, ort, OX, OY, idx);
    }
    assert.equal(summe(ofen().ein), 200);
    assert.equal(Object.values(fischBestand(s, [ofen()])).reduce((a, b) => a + b, 0), 270);
    // Sorten und Qualitäten getrennt gezählt
    assert.ok(ofen().ein.length >= 2);
    assert.deepEqual(vorher, {});
  });
  test('ein voller Ofen sagt „Der Ofen ist voll (200 Fische)." und nimmt nichts', () => {
    const { s, ort, ofen } = mitOfen(15);
    ofen().ein.push({ id: fisch1, n: 200 });
    const idx = inHand(s, { id: fisch2, n: 10 });
    const erg = ofenBenutzen(s, ort, OX, OY, idx);
    assert.ok(!erg.ok);
    assert.equal(erg.grund, 'Der Ofen ist voll (200 Fische).');
    assert.equal(s.spieler.inv[idx].n, 10);
    assert.equal(summe(ofen().ein), 200);
  });
  test('Qualität bleibt im Fach erhalten, gleiche Sorte und Qualität werden zusammengezählt', () => {
    const { s, ort, ofen } = mitOfen(16);
    ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch1, n: 5, q: 2 }));
    ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch1, n: 7, q: 2 }));
    ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch1, n: 3 }));
    assert.deepEqual(ofen().ein, [{ id: fisch1, q: 2, n: 12 }, { id: fisch1, n: 3 }]);
  });
  test('Nicht-Fisch (Müll, Holz, Muschel …) wird abgewiesen, nichts geht verloren oder wird umgewandelt', () => {
    const { s, ort, ofen } = mitOfen(17);
    const kandidaten = Object.values(ITEMS).filter((it) => it.kat !== 'fisch' && it.kat !== 'platz' && it.kat !== 'werkzeug').slice(0, 60);
    assert.ok(kandidaten.length > 20);
    for (const it of kandidaten) {
      const mitStack = it.stapel === false ? 1 : 3;
      s.spieler.inv = s.spieler.inv.map(() => null);
      s.spieler.inv[0] = { id: it.id, n: mitStack };
      const erg = ofenBenutzen(s, ort, OX, OY, 0);
      assert.ok(!erg.ok && erg.grund, `${it.id}`);
      assert.deepEqual(s.spieler.inv[0], { id: it.id, n: mitStack }, `${it.id} unverändert`);
    }
    assert.deepEqual(ofen(), { t: 'raeucherofen', ein: [], aus: [] });
  });
  test('ohne etwas in der Hand und ohne Fertiges: freundlicher Hinweis', () => {
    const { s, ort } = mitOfen(18);
    const erg = ofenBenutzen(s, ort, OX, OY, null);
    assert.ok(!erg.ok && /Fisch/.test(erg.grund));
  });
  test('beschädigter Stand (fehlende Fächer) wird ergänzt', () => {
    const { s, ort, ofen } = mitOfen(19);
    ort.welt.objekte[L.k(OX, OY)] = { t: 'raeucherofen' };
    assert.ok(ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch1, n: 4 })).ok);
    assert.equal(summe(ofen().ein), 4);
    assert.deepEqual(ofen().aus, []);
  });
});

gruppe('Nacht', () => {
  test('über Nacht werden alle eingelegten Fische zu Geräuchertem, Menge und Qualität bleiben', () => {
    const { s, ort, ofen } = mitOfen(20);
    ofen().ein.push({ id: fisch1, n: 100 }, { id: fisch2, q: 2, n: 60 });
    L.tagBeenden(s, { r: () => 0.99 });
    assert.deepEqual(ofen().ein, []);
    assert.deepEqual(ofen().aus, [{ id: 'geraeuchert', von: fisch1, n: 100 }, { id: 'geraeuchert', von: fisch2, q: 2, n: 60 }]);
    assert.equal(ort.welt.objekte[L.k(OX, OY)], ofen());
  });
  test('auch auf Karten, auf denen man nicht ist, und für jeden Ofen', () => {
    const s = neues(21);
    const a = L.ortVon(s, 'testofen');
    const b = L.ortVon(s, 'hof');
    a.welt.objekte[L.k(2, 2)] = { t: 'raeucherofen', ein: [{ id: fisch1, n: 10 }], aus: [] };
    a.welt.objekte[L.k(6, 5)] = { t: 'raeucherofen', ein: [{ id: fisch2, n: 20 }], aus: [] };
    b.welt.objekte[L.k(3, 3)] = { t: 'raeucherofen', ein: [{ id: fisch1, n: 30 }], aus: [] };
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(summe(a.welt.objekte[L.k(2, 2)].aus), 10);
    assert.equal(summe(a.welt.objekte[L.k(6, 5)].aus), 20);
    assert.equal(summe(b.welt.objekte[L.k(3, 3)].aus), 30);
    for (const o of [a.welt.objekte[L.k(2, 2)], a.welt.objekte[L.k(6, 5)], b.welt.objekte[L.k(3, 3)]]) assert.deepEqual(o.ein, []);
  });
  test('mehrere Nächte (auch nach Ohnmacht) verarbeiten nichts doppelt, die Ausgabe wächst nur durch Neues', () => {
    const { s, ofen } = mitOfen(22);
    ofen().ein.push({ id: fisch1, n: 200 });
    L.tagBeenden(s, { r: () => 0.99 });
    L.tagBeenden(s, { r: () => 0.99, ohnmacht: true });
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(summe(ofen().aus), 200);
    ofen().ein.push({ id: fisch1, n: 50 });
    L.tagBeenden(s, { r: () => 0.99 });
    assert.deepEqual(ofen().aus, [{ id: 'geraeuchert', von: fisch1, n: 250 }]);
  });
  test('nach der Nacht können am selben Morgen neue Fische eingelegt werden (Fach wieder leer)', () => {
    const { s, ort, ofen } = mitOfen(23);
    ofen().ein.push({ id: fisch1, n: 200 });
    L.tagBeenden(s, { r: () => 0.99 });
    const erg = ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch2, n: 200 }));
    assert.ok(erg.ok);
    assert.equal(summe(ofen().ein), 200);
    assert.equal(summe(ofen().aus), 200);
  });
  test('ofenNacht allein: leerer Ofen bleibt leer', () => {
    const o = { t: 'raeucherofen' };
    ofenNacht(o);
    assert.deepEqual(o, { t: 'raeucherofen', ein: [], aus: [] });
  });
});

gruppe('Preis und Verkauf', () => {
  test('Geräucherter Fisch: genau das Zehnfache des frischen, für jeden Fisch und jede Qualität', () => {
    const s = neues(30);
    assert.ok(FISCHE.length >= 10);
    for (const f of FISCHE) {
      for (let q = 0; q < QUALITAET.length; q++) {
        const frisch = L.preisVon({ id: f.id, n: 1, ...(q ? { q } : {}) }, s);
        const rauch = L.preisVon({ id: 'geraeuchert', von: f.id, n: 1, ...(q ? { q } : {}) }, s);
        assert.equal(rauch, 10 * frisch, `${f.id} q${q}`);
        assert.ok(rauch > 0);
        assert.ok(L.verkaufbar({ id: 'geraeuchert', von: f.id, ...(q ? { q } : {}), n: 1 }));
      }
    }
  });
  test('Beispiel: Karpfen 30 g → 300 g, Silber 37 g → 370 g', () => {
    const s = neues(31);
    assert.equal(L.preisVon({ id: 'karpfen', n: 1 }, s), 30);
    assert.equal(L.preisVon({ id: 'geraeuchert', von: 'karpfen', n: 1 }, s), 300);
    assert.equal(L.preisVon({ id: 'geraeuchert', von: 'karpfen', q: 1, n: 1 }, s), 370);
  });
  test('ohne Ausgangsstoff ist die Ware nichts wert (kein Absturz)', () => {
    const s = neues(32);
    assert.equal(L.preisVon({ id: 'geraeuchert', n: 1 }, s), 0);
    assert.ok(!L.verkaufbar({ id: 'geraeuchert', n: 1 }));
  });
  test('Marmelade und Eingelegtes sind unverändert', () => {
    const s = neues(33);
    const frucht = Object.values(ITEMS).find((it) => it.frucht && ['ernte', 'sammel'].includes(it.kat));
    assert.equal(L.preisVon({ id: 'marmelade', von: frucht.id, n: 1 }, s), frucht.preis * 2 + 50);
  });
  test('Verkauf über die Versandkiste zahlt die erwartete Summe', () => {
    const { s } = mitOfen(35);
    const erwartet = 120 * 300 + 80 * 10 * L.preisVon({ id: 'karpfen', q: 2, n: 1 }, s);
    s.spieler.inv = s.spieler.inv.map(() => null);
    L.hinzufuegen(s, { id: 'geraeuchert', von: 'karpfen', n: 120 });
    L.hinzufuegen(s, { id: 'geraeuchert', von: 'karpfen', q: 2, n: 80 });
    for (let i = 0; i < s.spieler.inv.length; i++) if (s.spieler.inv[i]) L.versenden(s, i);
    assert.equal(L.versandWert(s), erwartet);
    const gold = s.spieler.gold;
    const bericht = L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(bericht.summe, erwartet);
    assert.equal(s.spieler.gold, gold + erwartet);
  });
  test('essbar mit der Energie des rohen Fischs, ohne Bonus; Name und Beschreibung deutsch', () => {
    const slot = { id: 'geraeuchert', von: 'karpfen', n: 1 };
    assert.equal(L.energieVon(slot), L.energieVon({ id: 'karpfen', n: 1 }));
    assert.equal(L.nameVon(slot), 'Geräucherter Fisch (Karpfen)');
    assert.equal(ITEMS.geraeuchert.kat, 'artisan');
    assert.equal(ITEMS.geraeuchert.text, 'Zehnmal so viel wert wie frisch. Aus dem Räucherofen.');
  });
  test('Fischfarm: ein Karpfen der Farm (Item karpfen) ist räucherbar, 200 Karpfen = 60000 g bei 300 g', () => {
    if (!ITEMS.karpfen) return;
    const { s, ort, ofen } = mitOfen(36);
    assert.ok(ofenBenutzen(s, ort, OX, OY, inHand(s, { id: 'karpfen', n: 200 })).ok);
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(summe(ofen().aus), 200);
    assert.equal(200 * L.preisVon({ id: 'geraeuchert', von: 'karpfen', n: 1 }, s), 60000);
  });
});

gruppe('Abholen', () => {
  test('alles abholen: „Du nimmst 200 geräucherte Karpfen."', () => {
    const { s, ort, ofen } = mitOfen(40);
    ofen().aus.push({ id: 'geraeuchert', von: 'karpfen', n: 200 });
    const erg = ofenBenutzen(s, ort, OX, OY, null);
    assert.ok(erg.ok);
    assert.equal(erg.text, 'Du nimmst 200 geräucherte Karpfen.');
    assert.equal(L.anzahl(s, 'geraeuchert'), 200);
    assert.deepEqual(ofen().aus, []);
  });
  test('Qualitäten bleiben getrennt im Rucksack, Stapelgrenze wird beachtet', () => {
    const { s, ort, ofen } = mitOfen(41);
    ofen().aus.push({ id: 'geraeuchert', von: 'karpfen', n: 100 }, { id: 'geraeuchert', von: 'karpfen', q: 2, n: 50 });
    ofenBenutzen(s, ort, OX, OY, null);
    const stapel = s.spieler.inv.filter((x) => x?.id === 'geraeuchert');
    assert.equal(stapel.length, 2);
    assert.deepEqual(stapel.map((x) => [x.q || 0, x.n]).sort(), [[0, 100], [2, 50]]);
    for (const x of stapel) assert.ok(x.n <= STAPEL_MAX);
  });
  test('Rucksack fast voll: nimmt, was passt, der Rest bleibt im Ofen', () => {
    const { s, ort, ofen } = mitOfen(42);
    s.spieler.inv = s.spieler.inv.map(() => ({ id: 'holz', n: STAPEL_MAX }));
    s.spieler.inv[3] = { id: 'geraeuchert', von: 'karpfen', n: STAPEL_MAX - 30 };
    ofen().aus.push({ id: 'geraeuchert', von: 'karpfen', n: 100 });
    const erg = ofenBenutzen(s, ort, OX, OY, null);
    assert.ok(erg.ok);
    assert.match(erg.text, /Rucksack voll – der Rest bleibt im Ofen\./);
    assert.equal(s.spieler.inv[3].n, STAPEL_MAX);
    assert.equal(summe(ofen().aus), 70);
  });
  test('Rucksack ganz voll: nichts passiert, nichts geht verloren', () => {
    const { s, ort, ofen } = mitOfen(43);
    s.spieler.inv = s.spieler.inv.map(() => ({ id: 'holz', n: STAPEL_MAX }));
    ofen().aus.push({ id: 'geraeuchert', von: 'karpfen', n: 100 });
    const erg = ofenBenutzen(s, ort, OX, OY, null);
    assert.ok(!erg.ok);
    assert.equal(erg.grund, 'Dein Rucksack ist voll.');
    assert.equal(summe(ofen().aus), 100);
  });
  test('Abholen ohne Fertiges ist ein Hinweis; mit Fisch in der Hand hat Einlegen Vorrang', () => {
    const { s, ort, ofen } = mitOfen(44);
    ofen().aus.push({ id: 'geraeuchert', von: 'karpfen', n: 10 });
    const idx = inHand(s, { id: fisch1, n: 5 });
    const erg = ofenBenutzen(s, ort, OX, OY, idx);
    assert.equal(summe(ofen().ein), 5);
    assert.equal(summe(ofen().aus), 10);
    assert.match(erg.text, /eingelegt/);
  });
  test('Fach voll und Fertiges da: mit Fisch in der Hand wird stattdessen abgeholt', () => {
    const { s, ort, ofen } = mitOfen(45);
    ofen().ein.push({ id: fisch1, n: 200 });
    ofen().aus.push({ id: 'geraeuchert', von: 'karpfen', n: 10 });
    const idx = inHand(s, { id: fisch2, n: 5 });
    const erg = ofenBenutzen(s, ort, OX, OY, idx);
    assert.ok(erg.ok);
    assert.equal(L.anzahl(s, 'geraeuchert'), 10);
    assert.equal(s.spieler.inv[idx].n, 5);
    assert.equal(summe(ofen().ein), 200);
  });
  test('ein anderer Gegenstand in der Hand hindert das Abholen nicht', () => {
    const { s, ort, ofen } = mitOfen(46);
    ofen().aus.push({ id: 'geraeuchert', von: 'karpfen', n: 7 });
    const idx = inHand(s, { id: 'holz', n: 5 });
    assert.ok(ofenBenutzen(s, ort, OX, OY, idx).ok);
    assert.equal(L.anzahl(s, 'holz'), 5);
    assert.equal(L.anzahl(s, 'geraeuchert'), 7);
  });
  test('Meldungstexte: ein Stück und gemischte Sorten', () => {
    const { s, ort, ofen } = mitOfen(47);
    ofen().aus.push({ id: 'geraeuchert', von: 'karpfen', n: 1 });
    assert.equal(ofenBenutzen(s, ort, OX, OY, null).text, 'Du nimmst 1× Geräucherter Fisch (Karpfen).');
    ofen().aus.push({ id: 'geraeuchert', von: fisch1, n: 4 }, { id: 'geraeuchert', von: fisch2, n: 5 });
    assert.equal(ofenBenutzen(s, ort, OX, OY, null).text, 'Du nimmst 9 geräucherte Fische.');
  });
});

gruppe('Hinweis und Aufheben', () => {
  const hinweis = (s, o) => OBJEKT_TYPEN.raeucherofen.hinweis({ s, o });
  test('Aktionshinweise je nach Zustand', () => {
    const { s, ofen } = mitOfen(50);
    s.spieler.wahl = 0;
    s.spieler.inv[0] = null;
    assert.equal(hinweis(s, ofen()), 'Fisch räuchern');
    ofen().ein.push({ id: fisch1, n: 120 });
    assert.equal(hinweis(s, ofen()), 'Räuchert … (120)');
    ofen().aus.push({ id: 'geraeuchert', von: fisch1, n: 200 });
    assert.equal(hinweis(s, ofen()), 'Geräuchertes holen (200)');
    s.spieler.inv[0] = { id: fisch1, n: 3 };
    assert.equal(hinweis(s, ofen()), 'Fisch räuchern');
    ofen().ein[0].n = 200;
    assert.equal(hinweis(s, ofen()), 'Geräuchertes holen (200)');
  });
  test('Aufheben nur, wenn Eingabe- und Ausgabe-Fach leer sind', () => {
    const { s, ort, ofen } = mitOfen(51);
    const lauf = () => { const erg = L.neuesErgebnis(); L.aufheben({ s, ort, x: OX, y: OY, o: ofen(), erg }); return erg; };
    ofen().ein.push({ id: fisch1, n: 1 });
    assert.equal(lauf().grund, 'Im Räucherofen sind noch Fische.');
    ofen().ein = [];
    ofen().aus.push({ id: 'geraeuchert', von: fisch1, n: 1 });
    assert.equal(lauf().grund, 'Im Räucherofen sind noch Fische.');
    assert.ok(ort.welt.objekte[L.k(OX, OY)]);
    ofen().aus = [];
    const erg = lauf();
    assert.ok(!erg.grund);
    assert.equal(ort.welt.objekte[L.k(OX, OY)], undefined);
    assert.equal(L.anzahl(s, 'raeucherofen'), 1);
  });
});

gruppe('Speichern und Laden', () => {
  const rundreise = (s) => L.deserialisieren(L.serialisieren(s));
  test('beide Fächer überstehen Speichern und Laden, das Format bleibt v2', () => {
    const { s, ort, ofen } = mitOfen(60);
    ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch1, n: 40, q: 1 }));
    L.tagBeenden(s, { r: () => 0.99 });
    ofenBenutzen(s, ort, OX, OY, inHand(s, { id: fisch2, n: 25 }));
    const roh = JSON.parse(L.serialisieren(s));
    assert.equal(roh.v ?? roh.version ?? 2, 2);
    const s2 = rundreise(s);
    const o2 = L.ortVon(s2, 'testofen').welt.objekte[L.k(OX, OY)];
    assert.deepEqual(o2, ofen());
    assert.deepEqual(o2.aus, [{ id: 'geraeuchert', von: fisch1, q: 1, n: 40 }]);
    assert.deepEqual(o2.ein, [{ id: fisch2, n: 25 }]);
  });
  test('alte Stände ohne Ofen laden wie vorher, Ware im Rucksack behält „von"', () => {
    const s = neues(61);
    L.hinzufuegen(s, { id: 'geraeuchert', von: 'karpfen', q: 2, n: 3 });
    const s2 = rundreise(s);
    const ware = s2.spieler.inv.find((x) => x?.id === 'geraeuchert');
    assert.equal(ware.von, 'karpfen');
    assert.equal(L.preisVon(ware, s2), 10 * L.preisVon({ id: 'karpfen', q: 2, n: 1 }, s2));
  });
});

gruppe('Bilder', () => {
  test('Ofen malt in jedem Zustand und jeder Jahreszeit ohne Ersatzbild, Item-Bilder für jeden Fisch', () => {
    const zustaende = [{}, { ein: [{ id: fisch1, n: 3 }] }, { aus: [{ id: 'geraeuchert', von: fisch1, n: 3 }] }, { ein: [{ id: fisch1, n: 3 }], aus: [{ id: 'geraeuchert', von: fisch1, n: 3 }] }];
    for (const jz of ['fruehling', 'sommer', 'herbst', 'winter']) {
      for (const z of zustaende) {
        const c = SP.objektBild({ t: 'raeucherofen', ein: [], aus: [], ...z }, { jz, nacht: false, t: 1 });
        assert.ok(!c.ersatz);
      }
    }
    assert.ok(!SP.itemBild({ id: 'raeucherofen', n: 1 }).ersatz);
    for (const f of FISCHE) assert.ok(!SP.itemBild({ id: 'geraeuchert', von: f.id, n: 1 }).ersatz, f.id);
    assert.deepEqual(ungueltigeFarben, []);
  });
  test('der Rauch zeichnet ohne Fehler (danach-Zeichner)', () => {
    const a = SP.objektArt('raeucherofen');
    const g = leinwandAttrappe().getContext();
    a.danach(g, { ein: [{ id: fisch1, n: 1 }] }, { x: 0, y: 0 }, { t: 3.3, nacht: true });
    a.danach(g, { ein: [] }, { x: 0, y: 0 }, { t: 3.3 });
    assert.deepEqual(ungueltigeFarben, []);
  });
});

// Zuletzt: der Modifikator bleibt für den ganzen Prozess registriert.
gruppe('Modifikatoren', () => {
  test('Modifikatoren (Berufe) wirken auf den Fisch, das Zehnfache bleibt genau', () => {
    const s = neues(34);
    modifikator('verkaufspreis', (w, k) => (ITEMS[k.slot.id]?.kat === 'fisch' ? w * 1.25 : w));
    for (const f of FISCHE) for (const q of [0, 1, 2, 3]) {
      const frisch = L.preisVon({ id: f.id, n: 1, q }, s);
      assert.equal(L.preisVon({ id: 'geraeuchert', von: f.id, n: 1, q }, s), 10 * frisch);
    }
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
