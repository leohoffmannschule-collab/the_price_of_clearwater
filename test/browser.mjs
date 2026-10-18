// Rauchtest im echten Browser: Titel → neues Spiel → Briefe → aus dem Haus laufen →
// hacken, säen, gießen → Menü → Rundgang durch den Weltgraphen bis in die Mine →
// jedes Item, jede Deko, jedes Gebäude hat ein Bild → Ersatzbilder → Kulling auf 100×72 →
// alle Fenster → schlafen → nächster Morgen. Bricht bei Konsolenfehlern ab.
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
  pruefe((await zustand()).karte === 'haus', 'Das Spiel beginnt im Haus');

  const halte = async (taste, ms) => { await page.keyboard.down(taste); await page.waitForTimeout(ms); await page.keyboard.up(taste); };
  await halte('d', 420);
  await halte('s', 1500);
  await page.waitForTimeout(400);
  pruefe((await zustand()).karte === 'hof', 'Durch die Haustür auf den Hof');

  await halte('s', 350);
  await halte('d', 260);
  await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    const f = { x: Math.floor(S.sp.x / 16) + 1, y: Math.floor((S.sp.y - 3) / 16) };
    delete S.s.welt.hof.objekte[L.k(f.x, f.y)];
    delete S.s.welt.hof.felder[L.k(f.x, f.y)];
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
    const m = await import('/src/spiel.js');
    m.karteBetreten('mine0', 9, 5, 'oben');
  });
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
  const mine = await page.evaluate(() => { const { S } = window.__klarwasser; return { karte: S.ort.def.id, ebene: S.mineEbene, monster: S.monster.length }; });
  pruefe(mine.karte === 'mine1' && mine.ebene === 1 && mine.monster > 0, 'Leiter hinab: Minenebene 1 mit Monstern');
  await page.evaluate(async () => { const m = await import('/src/bereiche/mine/inhalt.js'); m.aufzugFahren(0); });
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

  // Alle registrierten Fenster öffnen sich ohne Fehler
  const fensterFehler = await page.evaluate(async () => {
    const ui = await import('/src/ui.js');
    const { LAEDEN } = await import('/src/daten.js');
    const { S } = await import('/src/spiel.js');
    const daten = {
      laden: Object.keys(LAEDEN).map((laden) => ({ laden })),
      truhe: [{ truhe: { t: 'truhe', inv: Array(24).fill(null) } }],
      brief: [{ text: 'Hallo {name}', von: 'Test' }],
      tagEnde: [{ bericht: { verkauf: [], summe: 0, stufen: [], meldungen: ['Test'], ohnmacht: null } }],
      menue: ui.MENUE_REITER.map((r) => ({ reiter: r.id })),
    };
    const fehler = [];
    for (const name of Object.keys(ui.FENSTER)) {
      for (const d of daten[name] || [{}]) {
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
  pruefe(morgen.tag === 2 && morgen.karte === 'haus', 'Nach dem Schlafen beginnt Tag 2 im Haus');

  const gespeichert = await page.evaluate(() => !!localStorage.getItem('klarwasser-hof-v2'));
  pruefe(gespeichert, 'Der Morgen wurde gespeichert');
  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
} finally {
  await browser.close();
  server.kill();
}
process.exit(ok ? 0 : 1);
