// Einmachglas: alles, was passiert, wenn man etwas aus dem Glas holt – und warum das Spiel dabei
// nie wieder stehen bleiben darf.
//
// Fehlerbild: Wer ein fertiges Glas mit Eingelegtem aus Lauch leerte, hatte plötzlich das Spiel
// „eingefroren". Die Logik lief durch; erst das Bild der Ware (Marmelade/Eingelegtes nimmt die Farbe
// des Ausgangsstoffs, Lauch hat keine) warf eine Ausnahme, und die Spielschleife (index.js) endete
// damit für immer. Der Browser selbst antwortete weiter, nur das Spiel stand still.
//
// Geprüft wird: alle Früchte und Gemüse durch den ganzen Ablauf (einlegen, Nacht, leeren, doppelt
// leeren, voller Rucksack, speichern und laden), die Bilder der Waren aller Sorten (mit einer
// Leinwand-Attrappe, denn Node hat kein Canvas), Maler, die werfen, und die Spielschleife.
// Der Browser-Teil steht am Ende von test/browser.mjs.
// Aufruf: node test/einmachglas.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Leinwand-Attrappe vor allem anderen: Zeichnen läuft, nichts wird wirklich gemalt. Ungültige Farben
// (ein echtes Canvas ignoriert sie stillschweigend) landen in `ungueltigeFarben`.
const ungueltigeFarben = [];
const farbeOk = (f) => typeof f === 'string' && /^#[0-9a-f]{6}$/i.test(f);
function leinwandAttrappe() {
  const g = {
    imageSmoothingEnabled: true,
    set fillStyle(f) { if (!farbeOk(f)) ungueltigeFarben.push(String(f)); },
    set strokeStyle(f) { if (!farbeOk(f)) ungueltigeFarben.push(String(f)); },
    fillRect() {}, strokeRect() {}, translate() {}, setTransform() {}, scale() {}, drawImage() {}, putImageData() {},
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
const { karte, raster, rahmen, fertigRaster } = await import('../src/karten.js');
const { glasBenutzen } = await import('../src/bereiche/handwerk/inhalt.js');
// Die Datei gehört zur Reparatur; fehlt sie (alter Stand), sollen die Tests einzeln fehlschlagen, nicht beim Laden.
const schleife = await import('../src/schleife.js').catch(() => null);
const { ITEMS, STAPEL_MAX } = D;

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }

const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
karte({ id: 'testglas', name: 'Glasstube', aussen: true, farmbar: true, grid: fertigRaster(rahmen(raster(10, 8, '.'), '#')) });
const GX = 4;
const GY = 4;
/** Spielstand mit einem leeren Einmachglas auf (GX, GY). */
function mitGlas(seed) {
  const s = neues(seed);
  const ort = L.ortVon(s, 'testglas');
  ort.welt.objekte[L.k(GX, GY)] = { t: 'einmachglas', inhalt: null, fertig: false };
  return { s, ort, glas: () => ort.welt.objekte[L.k(GX, GY)] };
}
const leeren = (s, ort) => glasBenutzen(s, ort, GX, GY, null);
const einlegen = (s, ort, idx) => glasBenutzen(s, ort, GX, GY, idx);
/** Alles, was das Glas annimmt: Früchte und Gemüse als Ernte oder Fund. */
const sorten = Object.values(ITEMS).filter((it) => (it.frucht || it.gemuese) && ['ernte', 'sammel'].includes(it.kat)).map((it) => it.id);
/** Konsolenfehler abfangen, solange fn läuft. */
function mitKonsole(fn) {
  const meldungen = [];
  const alt = console.error;
  console.error = (...a) => meldungen.push(a.map(String).join(' '));
  try { fn(); } finally { console.error = alt; }
  return meldungen;
}

gruppe('Ablauf: einlegen, Nacht, leeren', () => {
  test('es gibt Früchte und Gemüse zum Einlegen, auch Wildes (Lauch, Wildtraube)', () => {
    assert.ok(sorten.length >= 10);
    for (const id of ['lauch', 'wildtraube', 'tomate', 'blaubeere']) assert.ok(sorten.includes(id), id);
  });
  for (const id of sorten) {
    test(`${id}: einlegen, über Nacht fertig, leeren – Ware stimmt`, () => {
      const { s, ort, glas } = mitGlas(21);
      const frucht = !!ITEMS[id].frucht;
      L.hinzufuegen(s, { id, n: 3 });
      const idx = s.spieler.inv.findIndex((x) => x?.id === id);
      const e = einlegen(s, ort, idx);
      assert.ok(e.ok, e.grund);
      assert.deepEqual(glas().inhalt, { id: frucht ? 'marmelade' : 'eingelegt', von: id });
      assert.equal(s.spieler.inv[idx].n, 2, 'genau eines verbraucht');
      // solange es arbeitet, gibt es nichts
      const zu = leeren(s, ort);
      assert.ok(!zu.ok && /eingemacht/.test(zu.grund), zu.grund);
      L.tagBeenden(s, { r: () => 0.99 });
      assert.equal(glas().fertig, true);
      const erg = leeren(s, ort);
      assert.ok(erg.ok, erg.grund);
      assert.equal(erg.items.length, 1);
      const ware = s.spieler.inv.find((x) => x?.id === (frucht ? 'marmelade' : 'eingelegt'));
      assert.equal(ware.von, id);
      assert.equal(ware.n, 1);
      assert.equal(glas().inhalt, null);
      assert.equal(glas().fertig, false);
      // alles, was die Oberfläche von der Ware liest, geht ohne Ausnahme
      assert.ok(L.nameVon(ware, s).includes(ITEMS[id].name));
      assert.ok(Number.isFinite(L.preisVon(ware, s)) && L.preisVon(ware, s) > 0);
      assert.ok(Number.isFinite(L.energieVon(ware)) && L.energieVon(ware) > 0);
    });
  }
  test('Qualitätsstufen und Stapelgrößen: genau ein Stück wandert ins Glas', () => {
    for (const q of [0, 1, 2, 3]) {
      for (const n of [1, 2, 99, STAPEL_MAX]) {
        const { s, ort, glas } = mitGlas(22);
        s.spieler.inv = s.spieler.inv.map(() => null);
        s.spieler.inv[5] = { id: 'tomate', n, ...(q ? { q } : {}) };
        assert.ok(einlegen(s, ort, 5).ok, `q${q} n${n}`);
        assert.equal(s.spieler.inv[5]?.n ?? 0, n - 1);
        L.tagBeenden(s, { r: () => 0.99 });
        assert.ok(leeren(s, ort).ok);
        assert.equal(glas().inhalt, null);
      }
    }
  });
  test('doppeltes Leeren: das zweite Mal gibt nichts und wirft nicht', () => {
    const { s, ort, glas } = mitGlas(23);
    L.hinzufuegen(s, { id: 'blaubeere', n: 1 });
    einlegen(s, ort, s.spieler.inv.findIndex((x) => x?.id === 'blaubeere'));
    L.tagBeenden(s, { r: () => 0.99 });
    assert.ok(leeren(s, ort).ok);
    const vorher = JSON.stringify(s.spieler.inv);
    const nochmal = leeren(s, ort);
    assert.ok(!nochmal.ok && nochmal.grund);
    assert.equal(JSON.stringify(s.spieler.inv), vorher);
    assert.equal(L.anzahl(s, 'marmelade'), 1);
    assert.equal(glas().inhalt, null);
  });
  test('Dinge, die kein Obst oder Gemüse sind, nimmt das Glas nicht', () => {
    const { s, ort, glas } = mitGlas(24);
    for (const id of ['holz', 'hacke', 'marmelade', 'eingelegt']) {
      s.spieler.inv[0] = id === 'marmelade' || id === 'eingelegt' ? { id, n: 1, von: 'tomate' } : { id, n: 1 };
      const e = einlegen(s, ort, 0);
      assert.ok(!e.ok && e.grund, id);
    }
    assert.equal(glas().inhalt, null);
  });
  test('Marmelade und Eingelegtes verschiedener Sorten stapeln nicht und behalten ihre Sorte', () => {
    const s = neues(25);
    assert.equal(L.hinzufuegen(s, { id: 'eingelegt', von: 'lauch', n: 2 }), 0);
    assert.equal(L.hinzufuegen(s, { id: 'eingelegt', von: 'tomate', n: 1 }), 0);
    assert.equal(L.hinzufuegen(s, { id: 'eingelegt', von: 'lauch', n: 1 }), 0);
    const e = s.spieler.inv.filter((x) => x?.id === 'eingelegt');
    assert.deepEqual(e.map((x) => [x.von, x.n]).sort(), [['lauch', 3], ['tomate', 1]]);
  });
});

gruppe('Voller Rucksack', () => {
  const fertigesGlas = (seed, id = 'lauch') => {
    const g = mitGlas(seed);
    L.hinzufuegen(g.s, { id, n: 1 });
    einlegen(g.s, g.ort, g.s.spieler.inv.findIndex((x) => x?.id === id));
    L.tagBeenden(g.s, { r: () => 0.99 });
    return g;
  };
  const vollmachen = (s) => { s.spieler.inv = s.spieler.inv.map(() => ({ id: 'holz', n: STAPEL_MAX })); };
  test('voll: das Glas bleibt voll, nichts fällt zu Boden, nichts wirft', () => {
    const { s, ort, glas } = fertigesGlas(31);
    vollmachen(s);
    const erg = leeren(s, ort);
    assert.ok(!erg.ok);
    assert.equal(erg.grund, 'Dein Rucksack ist voll.');
    assert.deepEqual(erg.items, []);
    assert.deepEqual(glas().inhalt, { id: 'eingelegt', von: 'lauch' });
    assert.equal(glas().fertig, true);
    assert.equal(ort.welt.funde.length, 0);
    // wieder Platz: jetzt geht es
    s.spieler.inv[3] = null;
    assert.ok(leeren(s, ort).ok);
    assert.equal(L.anzahl(s, 'eingelegt'), 1);
  });
  test('voll, aber ein gleicher Stapel hat Platz: die Ware passt dazu', () => {
    const { s, ort, glas } = fertigesGlas(32);
    vollmachen(s);
    s.spieler.inv[7] = { id: 'eingelegt', von: 'lauch', n: STAPEL_MAX - 1 };
    assert.ok(leeren(s, ort).ok);
    assert.equal(s.spieler.inv[7].n, STAPEL_MAX);
    assert.equal(glas().inhalt, null);
  });
  test('voll, der gleiche Stapel ist randvoll: abgelehnt', () => {
    const { s, ort, glas } = fertigesGlas(33);
    vollmachen(s);
    s.spieler.inv[7] = { id: 'eingelegt', von: 'lauch', n: STAPEL_MAX };
    assert.ok(!leeren(s, ort).ok);
    assert.equal(glas().fertig, true);
  });
  test('voll, nur ein Stapel einer anderen Sorte hat Platz: abgelehnt (andere Sorte stapelt nicht)', () => {
    const { s, ort } = fertigesGlas(34);
    vollmachen(s);
    s.spieler.inv[7] = { id: 'eingelegt', von: 'tomate', n: 5 };
    assert.ok(!leeren(s, ort).ok);
    assert.equal(s.spieler.inv[7].n, 5);
  });
  test('voll beim Einlegen: das Obst bleibt im Rucksack, das Glas arbeitet', () => {
    const { s, ort, glas } = mitGlas(35);
    vollmachen(s);
    s.spieler.inv[2] = { id: 'tomate', n: 1 };
    assert.ok(einlegen(s, ort, 2).ok);
    assert.equal(s.spieler.inv[2], null);
    assert.equal(glas().fertig, false);
  });
});

gruppe('Nacht', () => {
  test('über Nacht wird nur ein gefülltes Glas fertig; ein leeres bleibt leer', () => {
    const { s, ort, glas } = mitGlas(41);
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(glas().fertig, false);
    assert.equal(glas().inhalt, null);
    L.hinzufuegen(s, { id: 'wildtraube', n: 1 });
    einlegen(s, ort, s.spieler.inv.findIndex((x) => x?.id === 'wildtraube'));
    assert.equal(glas().fertig, false, 'noch am selben Tag nicht fertig');
    L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(glas().fertig, true);
    assert.equal(glas().inhalt.von, 'wildtraube');
  });
  test('ein fertiges Glas bleibt über viele Nächte fertig und voll', () => {
    const { s, ort, glas } = mitGlas(42);
    L.hinzufuegen(s, { id: 'lauch', n: 1 });
    einlegen(s, ort, s.spieler.inv.findIndex((x) => x?.id === 'lauch'));
    for (let i = 0; i < 4; i++) L.tagBeenden(s, { r: () => 0.99 });
    assert.equal(glas().fertig, true);
    assert.deepEqual(glas().inhalt, { id: 'eingelegt', von: 'lauch' });
    assert.ok(leeren(s, ort).ok);
  });
  test('mehrere Gläser in einer Nacht, jedes mit anderer Sorte', () => {
    const s = neues(43);
    const ort = L.ortVon(s, 'testglas');
    const ids = sorten.slice(0, 6);
    ids.forEach((id, i) => { ort.welt.objekte[L.k(2 + i, 2)] = { t: 'einmachglas', inhalt: { id: ITEMS[id].frucht ? 'marmelade' : 'eingelegt', von: id }, fertig: false }; });
    L.tagBeenden(s, { r: () => 0.99 });
    ids.forEach((id, i) => {
      const o = ort.welt.objekte[L.k(2 + i, 2)];
      assert.equal(o.fertig, true, id);
      assert.ok(glasBenutzen(s, ort, 2 + i, 2, null).ok, id);
    });
    assert.equal(s.spieler.inv.filter((x) => x && ['marmelade', 'eingelegt'].includes(x.id)).length, ids.length);
  });
});

gruppe('Speichern und Laden', () => {
  const rundreise = (s) => L.deserialisieren(L.serialisieren(s));
  for (const id of ['lauch', 'tomate', 'wildtraube']) {
    test(`${id}: Glas in Arbeit, fertig und Ware im Rucksack überstehen Speichern und Laden`, () => {
      const { s, ort } = mitGlas(51);
      L.hinzufuegen(s, { id, n: 1 });
      einlegen(s, ort, s.spieler.inv.findIndex((x) => x?.id === id));
      // in Arbeit speichern, laden, Nacht, leeren
      const s2 = rundreise(s);
      const ort2 = L.ortVon(s2, 'testglas');
      assert.equal(ort2.welt.objekte[L.k(GX, GY)].inhalt.von, id);
      assert.equal(ort2.welt.objekte[L.k(GX, GY)].fertig, false);
      L.tagBeenden(s2, { r: () => 0.99 });
      // fertig speichern und laden
      const s3 = rundreise(s2);
      const ort3 = L.ortVon(s3, 'testglas');
      assert.equal(ort3.welt.objekte[L.k(GX, GY)].fertig, true);
      assert.ok(leeren(s3, ort3).ok);
      // die Ware im Rucksack mit „von" überlebt ein weiteres Mal
      const s4 = rundreise(s3);
      const ware = s4.spieler.inv.find((x) => x && ['marmelade', 'eingelegt'].includes(x.id));
      assert.equal(ware.von, id);
      assert.ok(L.preisVon(ware, s4) > 0);
    });
  }
  test('der gespeicherte Stand enthält keine Funktionen oder Sonderwerte im Glas', () => {
    const { s, ort } = mitGlas(52);
    L.hinzufuegen(s, { id: 'lauch', n: 1 });
    einlegen(s, ort, s.spieler.inv.findIndex((x) => x?.id === 'lauch'));
    L.tagBeenden(s, { r: () => 0.99 });
    const o = JSON.parse(L.serialisieren(s)).welt.testglas.objekte[L.k(GX, GY)];
    assert.deepEqual(o, { t: 'einmachglas', inhalt: { id: 'eingelegt', von: 'lauch' }, fertig: true });
  });
});

gruppe('Beschädigte Stände werfen nicht', () => {
  test('Ausgangsstoff, den es nicht mehr gibt: Hinweis statt Ausnahme, Leeren geht', () => {
    const { s, ort, glas } = mitGlas(61);
    glas().inhalt = { id: 'marmelade', von: 'gibtsnicht' };
    const arbeit = leeren(s, ort);
    assert.ok(!arbeit.ok && /eingemacht/.test(arbeit.grund));
    L.tagBeenden(s, { r: () => 0.99 });
    assert.ok(leeren(s, ort).ok);
    const ware = s.spieler.inv.find((x) => x?.id === 'marmelade');
    assert.doesNotThrow(() => { L.nameVon(ware, s); L.preisVon(ware, s); L.energieVon(ware); });
  });
  test('„fertig" ohne Inhalt wird zurückgesetzt, statt zu werfen', () => {
    const { s, ort, glas } = mitGlas(62);
    glas().fertig = true;
    const erg = leeren(s, ort);
    assert.ok(!erg.ok);
    assert.equal(glas().fertig, false);
  });
});

gruppe('Bilder der Handwerkswaren (Leinwand-Attrappe)', () => {
  const artisan = Object.values(ITEMS).filter((it) => it.kat === 'artisan').map((it) => it.id);
  test('Marmelade und Eingelegtes gibt es als Handwerkswaren', () => {
    assert.ok(artisan.includes('marmelade') && artisan.includes('eingelegt'));
  });
  test('jede Handwerksware zeichnet für jeden Ausgangsstoff (Lauch, Wildes, alles) ohne Ausnahme und ohne Ersatzbild', () => {
    const fehler = [];
    for (const id of artisan) {
      for (const von of [undefined, ...sorten]) {
        ungueltigeFarben.length = 0;
        try {
          const c = SP.itemBild({ id, ...(von ? { von } : {}) });
          if (c.ersatz) fehler.push(`${id} aus ${von}: Ersatzbild`);
          if (ungueltigeFarben.length) fehler.push(`${id} aus ${von}: ungültige Farbe ${ungueltigeFarben[0]}`);
          SP.itemDatenUrl({ id, ...(von ? { von } : {}) });
        } catch (e) { fehler.push(`${id} aus ${von}: ${e.message}`); }
      }
    }
    assert.deepEqual(fehler, []);
  });
  test('die Farbe kommt vom Ausgangsstoff; hat er keine (Lauch), bleibt es bei der eigenen Farbe der Ware', () => {
    const marmelade = ITEMS.marmelade;
    const eigen = SP.artisanBild(marmelade, marmelade.bild, { id: 'marmelade' });
    assert.equal(eigen.f, marmelade.bild.f);
    assert.equal(SP.artisanBild(marmelade, marmelade.bild, { id: 'marmelade', von: 'blaubeere' }).f, ITEMS.blaubeere.bild.f);
    const ohneFarbe = sorten.filter((id) => !ITEMS[id].bild?.f);
    for (const id of ohneFarbe) assert.equal(SP.artisanBild(marmelade, marmelade.bild, { id: 'marmelade', von: id }).f, marmelade.bild.f, id);
    assert.equal(SP.artisanBild(marmelade, marmelade.bild, { id: 'marmelade', von: 'gibtsnicht' }).f, marmelade.bild.f);
  });
  test('jeder Ausgangsstoff ergibt eine gültige Farbe für den Maler', () => {
    for (const id of artisan) {
      for (const von of sorten) {
        const b = SP.artisanBild(ITEMS[id], ITEMS[id].bild, { id, von });
        assert.ok(farbeOk(b.f), `${id} aus ${von}: ${b.f}`);
      }
    }
  });
  test('das aufgestellte Glas malt in allen drei Zuständen', () => {
    for (const o of [{ t: 'einmachglas', inhalt: null, fertig: false }, { t: 'einmachglas', inhalt: { id: 'eingelegt', von: 'lauch' }, fertig: false }, { t: 'einmachglas', inhalt: { id: 'eingelegt', von: 'lauch' }, fertig: true }]) {
      const c = SP.objektBild(o, { jz: 'sommer', band: 1 });
      assert.ok(!c.ersatz);
    }
  });
});

gruppe('Maler, die werfen, bringen das Spiel nicht zum Stehen', () => {
  test('Gegenstand: Ersatzbild statt Ausnahme, einmal gemeldet, danach aus dem Zwischenspeicher', () => {
    let aufrufe = 0;
    SP.kunst('test_wirft', () => { aufrufe++; throw new Error('Farbe fehlt'); });
    D.item('test_wirft', { name: 'Wirft', kat: 'ernte', preis: 1, bild: { art: 'test_wirft' } });
    const meldungen = mitKonsole(() => {
      for (let i = 0; i < 5; i++) assert.ok(SP.itemBild({ id: 'test_wirft' }).ersatz);
    });
    assert.equal(aufrufe, 1, 'der Maler läuft nur einmal');
    assert.equal(meldungen.length, 1);
    assert.match(meldungen[0], /Farbe fehlt/);
  });
  test('Objekt, Deko und Gebäude: ebenso', () => {
    SP.objektKunst('test_wirft_obj', { b: 16, h: 20, malen() { throw new Error('kaputt'); } });
    SP.dekoKunst('test_wirft_deko', { malen() { throw new Error('kaputt'); } });
    SP.gebaeudeKunst('test_wirft_geb', { b: 48, h: 32, malen() { throw new Error('kaputt'); } });
    mitKonsole(() => {
      const o = SP.objektBild({ t: 'test_wirft_obj' }, { jz: 'sommer' });
      const d = SP.dekoBild({ typ: 'test_wirft_deko', w: 2 }, { jz: 'sommer' });
      const g = SP.gebaeudeBild({ typ: 'test_wirft_geb', w: 3, h: 2 }, { jz: 'sommer' });
      assert.ok(o.ersatz && d.ersatz && g.ersatz);
    });
  });
  test('ohne Ersatzgröße bleibt gecacht strikt: die Ausnahme geht weiter (für eigene Aufrufer)', () => {
    assert.throws(() => SP.gecacht('test:strikt', () => { throw new Error('x'); }), /x/);
  });
});

gruppe('Spielschleife', () => {
  const modul = () => {
    assert.ok(schleife, 'src/schleife.js fehlt');
    return schleife;
  };
  test('ein werfender Schritt stoppt die anderen nicht und wird einmal gemeldet', () => {
    const { schrittSicher, meldungenVergessen, fehlerZaehler } = modul();
    meldungenVergessen();
    const gemeldet = [];
    const reihenfolge = [];
    const bild = () => {
      schrittSicher('Eingabe', () => reihenfolge.push('eingabe'), (m) => gemeldet.push(m));
      schrittSicher('Spiel', () => { reihenfolge.push('spiel'); throw new TypeError('Cannot read properties of undefined'); }, (m) => gemeldet.push(m));
      schrittSicher('Zeichnen', () => reihenfolge.push('zeichnen'), (m) => gemeldet.push(m));
    };
    for (let i = 0; i < 60; i++) bild();
    assert.equal(reihenfolge.filter((x) => x === 'zeichnen').length, 60, 'alle 60 Bilder wurden gezeichnet');
    assert.equal(reihenfolge.filter((x) => x === 'eingabe').length, 60);
    assert.equal(gemeldet.length, 1, 'ein Fehler in jedem Bild wird nur einmal gemeldet');
    assert.match(gemeldet[0], /Spiel/);
    assert.equal(fehlerZaehler()['Spiel: Cannot read properties of undefined'], 60);
  });
  test('schrittSicher meldet, ob der Schritt durchlief', () => {
    const { schrittSicher } = modul();
    assert.equal(schrittSicher('a', () => {}, () => {}), true);
    assert.equal(schrittSicher('b', () => { throw new Error('x'); }, () => {}), false);
  });
  test('viele verschiedene Fehler: nach MAX_MELDUNGEN nur noch ein Sammelhinweis, nichts wächst', () => {
    const { schrittSicher, meldungenVergessen, fehlerZaehler, MAX_MELDUNGEN } = modul();
    meldungenVergessen();
    const gemeldet = [];
    for (let i = 0; i < MAX_MELDUNGEN * 3; i++) schrittSicher('Spiel', () => { throw new Error(`Fehler ${i}`); }, (m) => gemeldet.push(m));
    assert.equal(gemeldet.length, MAX_MELDUNGEN + 1);
    assert.equal(Object.keys(fehlerZaehler()).length, MAX_MELDUNGEN);
    meldungenVergessen();
  });
  test('index.js bestellt das nächste Bild zuerst und führt jeden Schritt nur abgesichert aus', () => {
    const quelle = readFileSync(fileURLToPath(new URL('../src/index.js', import.meta.url)), 'utf8');
    const schleife = /function schleife\([^)]*\) \{([\s\S]*?)\n  \}\n/.exec(quelle)?.[1];
    assert.ok(schleife, 'schleife() in index.js gefunden');
    const rufe = schleife.split('\n').map((z) => z.trim());
    const erster = rufe.findIndex((z) => z.startsWith('schrittSicher('));
    const bestellt = rufe.findIndex((z) => z.startsWith('requestAnimationFrame(schleife)'));
    assert.ok(bestellt >= 0 && bestellt < erster, 'requestAnimationFrame(schleife) steht vor den Schritten');
    for (const name of ['eingabeLesen', 'eingabeVerarbeiten', 'update', 'zeichnen', 'hudAktualisieren', 'eingabeZuruecksetzen']) {
      assert.ok(!rufe.some((z) => z.startsWith(`${name}(`)), `${name} läuft nicht ungeschützt in der Schleife`);
      assert.ok(rufe.some((z) => z.startsWith('schrittSicher(') && z.includes(name)), `${name} läuft in schrittSicher`);
    }
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
