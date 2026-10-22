// Rauchtest im echten Browser: Titel → neues Spiel → Briefe → aus dem Haus laufen →
// hacken, säen, gießen → Menü → Rundgang durch den Weltgraphen bis in die Mine →
// jedes Item, jede Deko, jedes Gebäude hat ein Bild → Ersatzbilder → Kulling auf 100×72 →
// große Objekte, Beläge, Pflanzenkunst, Kameraführung → alle Fenster (mit ihren Beispieldaten
// aus fensterArt) → schlafen → nächster Morgen. Bricht bei Konsolenfehlern ab.
// Orte kommen aus dem Punkte-Vertrag, nicht aus festen Koordinaten.
//
// Aufruf: node test/browser.mjs
// Braucht Playwright. Ein eigener Chromium-Pfad geht über CHROMIUM=/pfad/zu/chrome.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 8000 + Math.floor(Math.random() * 900);
const wurzel = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['tools/server.mjs', String(PORT)], { cwd: wurzel, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

const fehler = [];
let ok = true;
const pruefe = (bedingung, text) => {
  console.log(`  ${bedingung ? '✓' : '✗'} ${text}`);
  if (!bedingung) ok = false;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('pageerror', (e) => fehler.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForSelector('text=Neues Spiel');
  pruefe(true, 'Titelbild erscheint');

  await page.click('text=Neues Spiel');
  await page.fill('#neuName', 'Testa');
  await page.click('text=Auf zum Hof');
  for (let i = 0; i < 2; i++) { await page.click('.papier .knopf'); await page.waitForTimeout(150); }
  const zustand = () => page.evaluate(() => {
    const { S } = window.__klarwasser;
    return { karte: S.ort.def.id, x: Math.floor(S.sp.x / 16), y: Math.floor((S.sp.y - 3) / 16), tag: S.s.zeit.tag, pause: S.pause };
  });
  const start = await page.evaluate(() => { const { S, L } = window.__klarwasser; return [S.ort.def.id, L.zuhause(S.s).karte]; });
  pruefe(start[0] === start[1], 'Das Spiel beginnt zu Hause');

  const halte = async (taste, ms) => { await page.keyboard.down(taste); await page.waitForTimeout(ms); await page.keyboard.up(taste); };
  await page.evaluate(async () => {
    const m = await import('/src/spiel.js');
    const k = await import('/src/karten.js');
    const p = k.punkt('haus', 'eingang');
    m.karteBetreten('haus', p.x, p.y, 'unten');
  });
  await halte('s', 900);
  await page.waitForTimeout(400);
  pruefe((await zustand()).karte === 'hof', 'Durch die Haustür auf den Hof');

  // Ein freies Stück Acker nahe am Haus suchen und dort Feldarbeit tun
  await page.evaluate(async () => {
    const { S, L } = window.__klarwasser;
    const k = await import('/src/karten.js');
    const m = await import('/src/spiel.js');
    const def = S.ort.def;
    const vor = k.punkt('hof', 'vorHaus');
    let beste = null;
    for (let y = 1; y < def.h - 1; y++) {
      for (let x = 1; x < def.w - 2; x++) {
        if (!k.bodenFlag(def, x + 1, y, k.B_FARMBAR) || L.warpAn(def, x, y) || L.warpAn(def, x + 1, y)) continue;
        // begehbar ohne Objekte und Beete (welt = null); die räumen wir gleich weg
        if (!L.begehbar(S.s, def, null, x, y) || !L.begehbar(S.s, def, null, x + 1, y)) continue;
        const d = Math.abs(x - vor.x) + Math.abs(y - vor.y);
        if (!beste || d < beste.d) beste = { x, y, d };
      }
    }
    for (const xx of [beste.x, beste.x + 1]) { delete S.s.welt.hof.objekte[L.k(xx, beste.y)]; delete S.s.welt.hof.felder[L.k(xx, beste.y)]; }
    m.karteBetreten('hof', beste.x, beste.y, 'rechts');
  });
  await page.keyboard.press('1'); await page.keyboard.press('Space'); await page.waitForTimeout(450);
  await page.keyboard.press('6'); await page.keyboard.press('Space'); await page.waitForTimeout(200);
  await page.keyboard.press('2'); await page.keyboard.press('Space'); await page.waitForTimeout(450);
  const beet = await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    const f = { x: Math.floor(S.sp.x / 16) + 1, y: Math.floor((S.sp.y - 3) / 16) };
    return S.s.welt.hof.felder[L.k(f.x, f.y)];
  });
  pruefe(!!beet, 'Hacke lockert ein Beet');
  pruefe(beet?.pflanze?.id === 'pastinake', 'Pastinake gesät');
  pruefe(beet?.nass === true, 'Beet gegossen');

  await page.keyboard.press('i');
  await page.waitForSelector('.fenster .reiter');
  for (const r of ['Basteln', 'Fähigkeiten', 'Freunde', 'Aufgaben', 'Optionen']) await page.click(`.reiter button:has-text("${r}")`);
  await page.keyboard.press('Escape');
  pruefe(true, 'Alle Menüreiter öffnen sich');

  // Rundgang: an den Rand stellen und über den Warp laufen
  const rundgang = [
    ['hof', 'vonDorf', 'd', 'dorf'],
    ['dorf', 'vonStrand', 's', 'strand'],
    ['strand', 'vonDorf', 'w', 'dorf'],
    ['dorf', 'vonWald', 'a', 'wald'],
    ['wald', 'vonDorf', 'd', 'dorf'],
    ['dorf', 'vonBerg', 'w', 'berg'],
    ['berg', 'vonHof', 's', 'hof'],
    ['hof', 'vonWald', 's', 'wald'],
    ['wald', 'vonHof', 'w', 'hof'],
    ['hof', 'vonBerg', 'w', 'berg'],
    ['berg', 'vorMine', 'w', 'mine0'],
  ];
  for (const [karte, name, taste, ziel] of rundgang) {
    await page.evaluate(async ([karte, name]) => {
      const m = await import('/src/spiel.js');
      const k = await import('/src/karten.js');
      const p = k.punkt(karte, name);
      m.S.s.flags.mineOffen = true;
      m.S.s.zeit.minute = 600;
      m.karteBetreten(karte, p.x, p.y, 'unten');
    }, [karte, name]);
    await page.keyboard.down(taste);
    let jetzt = karte;
    for (let i = 0; i < 30 && jetzt !== ziel; i++) { await page.waitForTimeout(100); jetzt = (await zustand()).karte; }
    await page.keyboard.up(taste);
    await page.waitForTimeout(350);
    pruefe((await zustand()).karte === ziel, `Rundgang: ${karte} → ${ziel}`);
  }
  await page.evaluate(async () => {
    // vor die Leiter nach unten stellen (Deko mit aktion „mine_ab")
    const m = await import('/src/spiel.js');
    const { KARTEN } = await import('/src/karten.js');
    const leiter = KARTEN.mine0.deko.find((d) => d.aktion === 'mine_ab');
    m.karteBetreten('mine0', leiter.x, leiter.y + 1, 'oben');
  });
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
  const mine = await page.evaluate(() => { const { S } = window.__klarwasser; return { karte: S.ort.def.id, ebene: S.mineEbene, monster: S.monster.length }; });
  pruefe(mine.karte !== 'mine0' && mine.ebene === 1 && mine.monster > 0, 'Leiter hinab: Minenebene 1 mit Monstern');
  await page.evaluate(async () => {
    const m = await import('/src/bereiche/mine/inhalt.js');
    const sp = await import('/src/spiel.js');
    if (m.aufzugFahren) m.aufzugFahren(0); else sp.wechselnZu({ karte: 'mine0', punkt: 'eingang' });
  });
  await page.waitForTimeout(500);
  pruefe((await zustand()).karte === 'mine0', 'Förderkorb fährt zurück zum Eingang');

  const ohneBild = await page.evaluate(async () => {
    const SP = await import('/src/sprites.js');
    const { ITEMS } = await import('/src/daten.js');
    const fehlt = [];
    for (const id of Object.keys(ITEMS)) {
      try { const c = SP.itemBild({ id }); if (!c || c.width !== 16 || c.ersatz) fehlt.push(id); } catch (e) { fehlt.push(`${id}: ${e.message}`); }
    }
    return fehlt;
  });
  pruefe(ohneBild.length === 0, `Jedes Item hat ein Bild${ohneBild.length ? `: ${ohneBild.join(', ')}` : ''}`);

  // Jede Deko, jedes Gebäude und jedes Objekt aller Karten in allen Jahreszeiten, Tag und Nacht
  const kartenOhneBild = await page.evaluate(async () => {
    const SP = await import('/src/sprites.js');
    const { KARTEN } = await import('/src/karten.js');
    const { OBJEKT_TYPEN, PFLANZEN } = await import('/src/daten.js');
    const { S } = await import('/src/spiel.js');
    const fehlt = new Set();
    const pruefen = (was, fn) => { try { if (fn()?.ersatz) fehlt.add(was); } catch (e) { fehlt.add(`${was}: ${e.message}`); } };
    for (const jz of ['fruehling', 'sommer', 'herbst', 'winter']) {
      for (const nacht of [false, true]) {
        for (const def of Object.values(KARTEN)) {
          for (const d of def.deko) pruefen(`Deko ${d.typ}`, () => SP.dekoBild(d, { jz, nacht, innen: def.innen, s: S.s }));
          for (const g of def.gebaeude) pruefen(`Gebäude ${g.typ}`, () => SP.gebaeudeBild(g, { jz, nacht, s: S.s }));
        }
        for (const t of Object.keys(OBJEKT_TYPEN)) pruefen(`Objekt ${t}`, () => SP.objektBild({ t, id: 'holz', art: 'stein', v: 1 }, { jz, band: 1 }));
      }
    }
    for (const id of Object.keys(PFLANZEN)) for (let p = 0; p <= 4; p++) pruefen(`Pflanze ${id}`, () => SP.pflanzeBild(id, p, false));
    return [...fehlt];
  });
  pruefe(kartenOhneBild.length === 0, `Deko, Gebäude, Objekte und Pflanzen haben Bilder${kartenOhneBild.length ? `: ${kartenOhneBild.join(', ')}` : ''}`);

  const ersatz = await page.evaluate(async () => {
    const SP = await import('/src/sprites.js');
    const bilder = [
      SP.itemBild({ id: 'gibtsnicht' }), SP.dekoBild({ typ: 'gibtsnicht', w: 2 }, { jz: 'sommer' }),
      SP.gebaeudeBild({ typ: 'gibtsnicht', w: 3, h: 2 }, { jz: 'sommer' }), SP.objektBild({ t: 'gibtsnicht' }, {}),
      SP.pflanzeBild('gibtsnicht', 2, false), SP.monsterBild('gibtsnicht', '#ffffff', 'gibtsnicht', 0), SP.tierBild('gibtsnicht', 0, true),
    ];
    return { alle: bilder.every((c) => c.ersatz), groessen: bilder.map((c) => `${c.width}×${c.height}`).join(' ') };
  });
  pruefe(ersatz.alle && ersatz.groessen === '16×16 32×16 48×32 16×16 16×24 16×16 16×16', `Fehlende Bilder werden zum Ersatzbild (${ersatz.groessen})`);

  // Kulling: auf einer 100×72-Karte sammelt der Objekt-Zeichner nur, was im Bild liegt
  const gross = await page.evaluate(async () => {
    const R = await import('/src/render.js');
    const K = await import('/src/karten.js');
    const m = await import('/src/spiel.js');
    const L = await import('/src/logik.js');
    const g = K.rahmen(K.raster(100, 72, '.'), '#');
    K.karte({ id: 'testgross', name: 'Testkarte', aussen: true, rand: 'wald', grid: K.fertigRaster(g), punkte: { start: [50, 36] }, npcWege: false });
    const w = L.welt(m.S.s, 'testgross');
    for (let i = 0; i < 6000; i++) w.objekte[L.k(1 + (i % 98), 1 + Math.floor(i / 98))] = { t: 'stein', hp: 2, v: i % 3 };
    m.karteBetreten('testgross');
    let sicht = null;
    R.zeichner({ name: 'test_sicht', ebene: 'welt', reihe: 0, sammeln(ort, v) { sicht = v; return null; } });
    R.zeichnen();
    const teile = R.ZEICHNER.welt.find((z) => z.name === 'objekte').sammeln(m.S.ort, sicht).length;
    const t0 = performance.now();
    for (let i = 0; i < 30; i++) R.zeichnen();
    const ms = (performance.now() - t0) / 30;
    m.karteBetreten('hof', 20, 9, 'unten');
    return { teile, gesamt: Object.keys(w.objekte).length, ms: Math.round(ms * 10) / 10 };
  });
  pruefe(gross.teile > 0 && gross.teile < gross.gesamt / 4, `Kulling auf 100×72: ${gross.teile} von ${gross.gesamt} Objekten gesammelt, ${gross.ms} ms je Bild`);

  // Werfende Zeichner löschen nicht den Rest des Bildes: spätere Teile und Ebenen werden trotzdem gemalt
  const zeichnerWirft = await page.evaluate(async () => {
    const R = await import('/src/render.js');
    const gemalt = { welt: false, ueber: false, bildschirm: false };
    const alt = console.error;
    const meldungen = [];
    console.error = (...a) => meldungen.push(a.join(' '));
    const namen = ['test_wirft_boden', 'test_wirft_welt', 'test_welt_danach', 'test_wirft_ueber', 'test_ueber_danach', 'test_bildschirm_danach'];
    try {
      R.zeichner({ name: 'test_wirft_boden', ebene: 'boden', reihe: 99, zeichnen() { throw new Error('Boden kaputt'); } });
      R.zeichner({ name: 'test_wirft_welt', ebene: 'welt', reihe: 0, sammeln() { return [{ y: -1e6, f() { throw new Error('Teil kaputt'); } }]; } });
      R.zeichner({ name: 'test_welt_danach', ebene: 'welt', reihe: 0, sammeln() { return [{ y: 1e6, f() { gemalt.welt = true; } }]; } });
      R.zeichner({ name: 'test_wirft_ueber', ebene: 'ueber', reihe: 0, zeichnen() { throw new Error('Ebene kaputt'); } });
      R.zeichner({ name: 'test_ueber_danach', ebene: 'ueber', reihe: 99, zeichnen() { gemalt.ueber = true; } });
      R.zeichner({ name: 'test_bildschirm_danach', ebene: 'bildschirm', reihe: 99, zeichnen() { gemalt.bildschirm = true; } });
      R.zeichnen();
    } finally {
      console.error = alt;
      for (const e of R.EBENEN) R.ZEICHNER[e] = R.ZEICHNER[e].filter((z) => !namen.includes(z.name));
    }
    return { gemalt, meldungen: meldungen.length };
  });
  pruefe(zeichnerWirft.gemalt.welt && zeichnerWirft.gemalt.ueber && zeichnerWirft.gemalt.bildschirm, `Werfende Zeichner löschen den Rest des Bildes nicht (${JSON.stringify(zeichnerWirft.gemalt)})`);
  pruefe(zeichnerWirft.meldungen >= 3, 'die Fehler der Zeichner werden gemeldet');

  // Große Objekte, Bodenbeläge und Pflanzenkunst für alle Phasen zeichnen ohne Fehler
  const erweiterung = await page.evaluate(async () => {
    const D = await import('/src/daten.js');
    const K = await import('/src/karten.js');
    const SP = await import('/src/sprites.js');
    const R = await import('/src/render.js');
    const m = await import('/src/spiel.js');
    const L = await import('/src/logik.js');
    D.objektTyp('test_gross', { blockiert: true, flaeche: [3, 2] });
    SP.objektKunst('test_gross', { b: 48, h: 40, malen(g) { SP.R(g, 2, 4, 44, 34, '#7cc25a'); } });
    D.belagTyp('test_kies', { name: 'Kies' });
    SP.belagKunst('test_kies', (g, k) => { SP.R(g, 0, 0, 16, 16, k.o ? '#a8a29a' : '#8a847a'); });
    let alle = 0;
    SP.pflanzenKunst('test_ranke', { alle: true, malen(g, k) { alle++; SP.R(g, 7, 2, 2, k.fuss - 2, '#8a5a32'); } });
    D.item('test_rankenfrucht', { name: 'Rankenfrucht', kat: 'ernte', bild: { art: 'beeren', f: '#a03a8a' } });
    D.pflanze('test_ranke', { saat: 'test_rankensaat', ernte: 'test_rankenfrucht', tage: 4, jz: ['fruehling'], rankhilfe: true });
    const bild0 = SP.pflanzeBild('test_ranke', 0, false);
    K.karte({ id: 'testerweiterung', name: 'Test', aussen: true, grid: K.fertigRaster(K.rahmen(K.raster(20, 14, '.'), '#')), punkte: { start: [10, 10] } });
    const ort = L.ortVon(m.S.s, 'testerweiterung');
    L.objektSetzen(ort, 4, 3, { t: 'test_gross' });
    for (let x = 3; x < 12; x++) ort.welt.belag[L.k(x, 9)] = { t: 'test_kies' };
    ort.welt.felder[L.k(14, 8)] = { pflanze: { id: 'test_ranke', tage: 0 } };
    m.karteBetreten('testerweiterung', 6, 6, 'unten');
    R.zeichnen();
    m.S.kameraFokus = { x: 0, y: 0 };
    R.zeichnen();
    const kameraLinks = m.S.kamera.x === 0;
    m.karteBetreten('hof', 20, 9, 'unten');
    return { alle, bild0: !bild0.ersatz && bild0.width === 16, kameraLinks };
  });
  pruefe(erweiterung.alle >= 1 && erweiterung.bild0, 'Pflanzenkunst mit { alle: true } malt auch den Keimling');
  pruefe(erweiterung.kameraLinks, 'S.kameraFokus lenkt die Kamera');

  // Alle registrierten Fenster öffnen sich ohne Fehler (Beispieldaten aus fensterArt(…, { beispiele }))
  const fensterFehler = await page.evaluate(async () => {
    const ui = await import('/src/ui.js');
    const { S } = await import('/src/spiel.js');
    const fehler = [];
    for (const name of Object.keys(ui.FENSTER)) {
      for (const d of ui.FENSTER_OPT[name]?.beispiele?.() ?? [{}]) {
        try {
          ui.fensterOeffnen(name, d);
          if (!document.querySelector('#fenster .fenster')) fehler.push(`${name}: leer`);
        } catch (e) { fehler.push(`${name}: ${e.message}`); }
        document.querySelector('#fenster').hidden = true;
        document.querySelector('#fenster').replaceChildren();
      }
    }
    ui.fensterSchliessen();
    S.pause = false;
    return fehler;
  });
  pruefe(fensterFehler.length === 0, `Alle Fenster öffnen sich${fensterFehler.length ? `: ${fensterFehler.join(', ')}` : ''}`);

  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.schlafen(false); });
  await page.waitForSelector('text=Guten Morgen!');
  await page.click('text=Guten Morgen!');
  await page.waitForTimeout(300);
  const morgen = await zustand();
  const daheim = await page.evaluate(() => { const { S, L } = window.__klarwasser; return L.zuhause(S.s).karte; });
  pruefe(morgen.tag === 2 && morgen.karte === daheim, 'Nach dem Schlafen beginnt Tag 2 zu Hause');

  const gespeichert = await page.evaluate(() => !!localStorage.getItem('klarwasser-hof-v2'));
  pruefe(gespeichert, 'Der Morgen wurde gespeichert');

  // Einmachglas leeren. Fehlerbild: Ein Glas mit Eingelegtem aus Lauch stoppte beim Leeren die Spielschleife
  // (der Maler der Ware warf), das Spiel stand still, der Browser antwortete weiter. Darum reicht
  // „antwortet die Seite" nicht: Die Spielerin muss sich danach noch bewegen können.
  const waren = await page.evaluate(async () => {
    const SP = await import('/src/sprites.js');
    const { ITEMS } = await import('/src/daten.js');
    const sorten = Object.keys(ITEMS).filter((id) => (ITEMS[id].frucht || ITEMS[id].gemuese) && ['ernte', 'sammel'].includes(ITEMS[id].kat));
    const fehlt = [];
    for (const id of Object.keys(ITEMS).filter((i) => ITEMS[i].kat === 'artisan')) {
      for (const von of sorten) {
        try { const c = SP.itemBild({ id, von }); if (c.width !== 16 || c.ersatz) fehlt.push(`${id} aus ${von}`); SP.itemDatenUrl({ id, von }); } catch (e) { fehlt.push(`${id} aus ${von}: ${e.message}`); }
      }
    }
    return { sorten, fehlt };
  });
  pruefe(waren.fehlt.length === 0, `Handwerkswaren malen für jeden Ausgangsstoff (${waren.sorten.length} Sorten)${waren.fehlt.length ? `: ${waren.fehlt.join(', ')}` : ''}`);

  /** Briefe, die am Morgen aufgehen, wegklicken (sie halten das Spiel an und schlucken die Aktionstaste). */
  const briefeWeg = async () => {
    for (let i = 0; i < 4 && await page.locator('.papier .knopf').count(); i++) { await page.click('.papier .knopf'); await page.waitForTimeout(200); }
  };
  await briefeWeg();

  // ein Glas mit freiem Platz dahinter, damit die Spielerin sich bewegen kann
  const glasOrt = await page.evaluate(async () => {
    const { S, L } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    const ort = L.ortVon(S.s, 'hof');
    for (let y = 4; y < ort.def.h - 3; y++) {
      for (let x = 4; x < ort.def.w - 4; x++) {
        let frei = true;
        for (let yy = y - 3; yy <= y; yy++) for (let xx = x - 1; xx <= x + 1; xx++) frei = frei && L.feldFrei(S.s, ort, xx, yy);
        if (!frei) continue;
        ort.welt.objekte[L.k(x, y)] = { t: 'einmachglas', inhalt: null, fertig: false };
        m.karteBetreten('hof', x, y - 1, 'unten');
        return { x, y };
      }
    }
    return null;
  });
  pruefe(!!glasOrt, 'Ein Einmachglas steht auf dem Hof');
  const vorGlas = async () => {
    await page.evaluate(async ([x, y]) => { const m = await import('/src/spiel.js'); m.karteBetreten('hof', x, y - 1, 'unten'); }, [glasOrt.x, glasOrt.y]);
    await page.waitForTimeout(150);
  };
  /** Läuft das Spiel noch? Die Spielerin geht nach oben und muss dabei von der Stelle kommen. */
  const spielLaeuft = async () => {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const vor = await page.evaluate(() => window.__klarwasser.S.sp.y);
    await halte('w', 160);
    const nach = await page.evaluate(() => window.__klarwasser.S.sp.y);
    return vor - nach > 3;
  };
  const glasZustand = () => page.evaluate(([x, y]) => { const { S, L } = window.__klarwasser; const o = S.s.welt.hof.objekte[L.k(x, y)]; return o && { inhalt: o.inhalt, fertig: o.fertig }; }, [glasOrt.x, glasOrt.y]);

  // der ganze Weg wie im Spiel: Lauch in die Hand, E, schlafen, am Morgen E
  await vorGlas();
  await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    L.hinzufuegen(S.s, { id: 'lauch', n: 20, q: 2 });
    S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'lauch');
  });
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  const eingelegt = await glasZustand();
  pruefe(eingelegt?.inhalt?.von === 'lauch' && eingelegt.fertig === false, 'Lauch ins Einmachglas gelegt');
  pruefe(await spielLaeuft(), 'Nach dem Einlegen läuft das Spiel');
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.schlafen(false); });
  await page.waitForSelector('text=Guten Morgen!');
  await page.click('text=Guten Morgen!');
  await page.waitForTimeout(300);
  await briefeWeg();
  pruefe((await glasZustand())?.fertig === true, 'Am Morgen ist das Glas fertig');
  await vorGlas();
  await page.keyboard.press('e');
  await page.waitForTimeout(100);
  const geleert = await page.evaluate(() => { const { S } = window.__klarwasser; return S.s.spieler.inv.find((x) => x?.id === 'eingelegt'); });
  pruefe(geleert?.von === 'lauch', 'Glas geleert: Eingelegtes aus Lauch im Rucksack');
  pruefe(await spielLaeuft(), 'Nach dem Leeren läuft das Spiel weiter (Bilder werden noch gezeichnet)');
  pruefe((await page.locator('#funde .fund').count()) >= 1, 'Der Fund wird angezeigt');
  const hotbarBilder = await page.evaluate(() => [...document.querySelectorAll('#hud .slot[title="Eingelegtes (Lauch)"] img')].filter((i) => i.complete && i.naturalWidth > 0).length);
  pruefe(hotbarBilder === 1, 'Die Werkzeugleiste zeigt „Eingelegtes (Lauch)“ mit Bild');

  // jede Sorte einzeln: das Spiel läuft nach jedem Leeren weiter
  const nichtGelaufen = [];
  for (const sorte of waren.sorten) {
    if (nichtGelaufen.length) break;
    await vorGlas();
    await page.evaluate(async ([x, y, sorte]) => {
      const { S, L } = window.__klarwasser;
      const { ITEMS } = await import('/src/daten.js');
      S.s.spieler.inv = S.s.spieler.inv.map(() => null);
      S.s.spieler.wahl = 0;
      S.s.welt.hof.objekte[L.k(x, y)] = { t: 'einmachglas', inhalt: { id: ITEMS[sorte].frucht ? 'marmelade' : 'eingelegt', von: sorte }, fertig: true };
    }, [glasOrt.x, glasOrt.y, sorte]);
    await page.keyboard.press('e');
    await page.waitForTimeout(60);
    if (!(await spielLaeuft())) nichtGelaufen.push(sorte);
  }
  pruefe(nichtGelaufen.length === 0, `Nach dem Leeren läuft das Spiel für jede Sorte weiter (${waren.sorten.length})${nichtGelaufen.length ? `: steht still bei ${nichtGelaufen[0]}` : ''}`);

  // voller Rucksack: das Glas bleibt voll, das Spiel läuft
  if (!nichtGelaufen.length) {
    await vorGlas();
    await page.evaluate(async ([x, y]) => {
      const { S, L } = window.__klarwasser;
      S.s.spieler.inv = S.s.spieler.inv.map(() => ({ id: 'holz', n: 999 }));
      S.s.welt.hof.objekte[L.k(x, y)] = { t: 'einmachglas', inhalt: { id: 'eingelegt', von: 'lauch' }, fertig: true };
    }, [glasOrt.x, glasOrt.y]);
    await page.keyboard.press('e');
    await page.waitForTimeout(100);
    pruefe((await glasZustand())?.fertig === true && await spielLaeuft(), 'Voller Rucksack: das Glas bleibt voll und das Spiel läuft');
    await page.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.inv = S.s.spieler.inv.map(() => null); });
  }

  await page.reload();
  await page.waitForSelector('text=Weiterspielen');
  pruefe(true, 'Nach dem Neuladen bietet der Titel „Weiterspielen“ an');
  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
} finally {
  await browser.close();
  server.kill();
}
process.exit(ok ? 0 : 1);
