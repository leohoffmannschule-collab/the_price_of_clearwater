// Rauchtest im echten Browser: Titel → neues Spiel → Briefe → aus dem Haus laufen →
// hacken, säen, gießen → Menü → Rundgang durch den Weltgraphen bis in die Mine →
// jedes Item hat ein Bild → schlafen → nächster Morgen. Bricht bei Konsolenfehlern ab.
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
      try { const c = SP.itemBild({ id }); if (!c || c.width !== 16) fehlt.push(id); } catch (e) { fehlt.push(`${id}: ${e.message}`); }
    }
    return fehlt;
  });
  pruefe(ohneBild.length === 0, `Jedes Item hat ein Bild${ohneBild.length ? `: ${ohneBild.join(', ')}` : ''}`);

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
