// Browser-Test des Räucherofens (Chromium): Holz und Kohle geben, im Basteln-Menü (K) herstellen,
// aufstellen, 300 Karpfen in die Hand und einlegen (200 gehen hinein), schlafen, am Morgen abholen,
// Preis im Rucksack und in der Versandkiste zehnfach, Rucksack voll, keine Konsolenfehler, danach
// kann sich die Figur noch bewegen (die Spielschleife steht nicht still).
//
// Aufruf: node test/raeucherofen.browser.mjs
// Braucht Playwright. Ein eigener Chromium-Pfad geht über CHROMIUM=/pfad/zu/chrome.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 9900 + Math.floor(Math.random() * 90);
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
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /Ersatz/i.test(m.text()))) fehler.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForSelector('text=Neues Spiel');
  await page.click('text=Neues Spiel');
  await page.fill('#neuName', 'Testa');
  await page.click('text=Auf zum Hof');
  for (let i = 0; i < 2; i++) { await page.click('.papier .knopf'); await page.waitForTimeout(150); }
  await page.evaluate(() => {
    const { S } = window.__klarwasser;
    window.__meld = [];
    const m = S.hooks.meldung;
    S.hooks.meldung = (text, art) => { window.__meld.push(text); m(text, art); };
  });

  const halte = async (taste, ms) => { await page.keyboard.down(taste); await page.waitForTimeout(ms); await page.keyboard.up(taste); };
  const briefeWeg = async () => {
    for (let i = 0; i < 4 && await page.locator('.papier .knopf').count(); i++) { await page.click('.papier .knopf'); await page.waitForTimeout(200); }
  };
  const spielLaeuft = async () => {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const vor = await page.evaluate(() => window.__klarwasser.S.sp.y);
    await halte('w', 160);
    const nach = await page.evaluate(() => window.__klarwasser.S.sp.y);
    return vor - nach > 3;
  };
  const meldungen = () => page.evaluate(() => [...window.__meld]);

  // ─── Basteln: genau 1 Holz und 1 Kohle ──────────────────────────────────
  console.log('\nRäucherofen herstellen');
  await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    S.s.spieler.inv = S.s.spieler.inv.map(() => null);
    L.hinzufuegen(S.s, { id: 'holz', n: 3 });
    L.hinzufuegen(S.s, { id: 'kohle', n: 2 });
  });
  await page.keyboard.press('k');
  await page.waitForSelector('.zeile:has-text("Räucherofen")');
  const zeile = page.locator('.zeile', { hasText: 'Räucherofen' }).first();
  pruefe((await zeile.textContent()).includes('1/1 Holz') && (await zeile.textContent()).includes('1/1 Kohle'), 'Im Basteln-Menü: Räucherofen kostet 1 Holz und 1 Kohle');
  pruefe(!(await zeile.locator('button').isDisabled()), 'Der Knopf „Basteln" ist von Anfang an frei');
  await zeile.locator('button').click();
  await page.waitForTimeout(150);
  const nachBasteln = await page.evaluate(() => { const { S, L } = window.__klarwasser; return { holz: L.anzahl(S.s, 'holz'), kohle: L.anzahl(S.s, 'kohle'), ofen: L.anzahl(S.s, 'raeucherofen') }; });
  pruefe(nachBasteln.holz === 2 && nachBasteln.kohle === 1 && nachBasteln.ofen === 1, `Holz 3→${nachBasteln.holz}, Kohle 2→${nachBasteln.kohle}, ein Ofen im Rucksack`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  // ─── Aufstellen ──────────────────────────────────────────────────────────
  console.log('\nAufstellen');
  const ort = await page.evaluate(async () => {
    const { S, L } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    const o = L.ortVon(S.s, 'hof');
    for (let y = 6; y < o.def.h - 3; y++) {
      for (let x = 4; x < o.def.w - 4; x++) {
        let frei = true;
        for (let yy = y - 3; yy <= y; yy++) for (let xx = x - 1; xx <= x + 1; xx++) frei = frei && L.feldFrei(S.s, o, xx, yy);
        if (!frei) continue;
        m.karteBetreten('hof', x, y - 1, 'unten');
        S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === 'raeucherofen');
        return { x, y };
      }
    }
    return null;
  });
  pruefe(!!ort, 'ein freier Platz auf dem Hof ist gefunden');
  const vorOfen = async () => {
    await page.evaluate(async ([x, y]) => { const m = await import('/src/spiel.js'); m.karteBetreten('hof', x, y - 1, 'unten'); }, [ort.x, ort.y]);
    await page.waitForTimeout(150);
  };
  const ofen = () => page.evaluate(([x, y]) => { const { S, L } = window.__klarwasser; return JSON.parse(JSON.stringify(S.s.welt.hof.objekte[L.k(x, y)] ?? null)); }, [ort.x, ort.y]);
  await vorOfen();
  await page.keyboard.press(' ');
  await page.waitForTimeout(150);
  const aufgestellt = await ofen();
  pruefe(aufgestellt?.t === 'raeucherofen' && Array.isArray(aufgestellt.ein) && Array.isArray(aufgestellt.aus), 'Der Ofen steht auf dem Hof (Leertaste mit dem Ofen in der Hand)');
  pruefe(await page.evaluate(() => window.__klarwasser.L.anzahl(window.__klarwasser.S.s, 'raeucherofen') === 0), 'Der Ofen ist aus dem Rucksack');

  // ─── Einlegen ────────────────────────────────────────────────────────────
  console.log('\nEinlegen');
  const hand = (id, n, q = 0) => page.evaluate(([id, n, q]) => {
    const { S, L } = window.__klarwasser;
    L.hinzufuegen(S.s, { id, n, ...(q ? { q } : {}) });
    S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x && x.id === id && (x.q || 0) === q);
  }, [id, n, q]);
  await vorOfen();
  await hand('karpfen', 300);
  await page.waitForTimeout(150);
  pruefe((await page.textContent('#hinweis')).includes('Fisch räuchern'), 'Aktionshinweis „Fisch räuchern"');
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  let o = await ofen();
  const ein = o.ein.reduce((n, x) => n + x.n, 0);
  const inHand = await page.evaluate(() => { const { S, L } = window.__klarwasser; return L.anzahl(S.s, 'karpfen'); });
  pruefe(ein === 200 && inHand === 100, `200 Karpfen im Ofen, 100 bleiben in der Hand (${ein} / ${inHand})`);
  pruefe((await meldungen()).includes('200 Fische eingelegt (200 von 200). 100 bleiben in der Hand.'), 'Meldung: „200 Fische eingelegt (200 von 200). 100 bleiben in der Hand."');
  await page.waitForTimeout(100);
  pruefe((await page.textContent('#hinweis')).includes('Räuchert … (200)'), 'Aktionshinweis „Räuchert … (200)"');
  await page.evaluate(() => { window.__meld.length = 0; });
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  pruefe((await meldungen()).includes('Der Ofen ist voll (200 Fische).'), 'Voller Ofen: „Der Ofen ist voll (200 Fische)."');
  pruefe((await ofen()).ein.reduce((n, x) => n + x.n, 0) === 200, 'Der volle Ofen nimmt nichts mehr an');
  pruefe(await spielLaeuft(), 'Nach dem Einlegen läuft das Spiel');

  // ─── Schlafen und abholen ───────────────────────────────────────────────
  console.log('\nÜber Nacht und abholen');
  await vorOfen();
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.schlafen(false); });
  await page.waitForSelector('text=Guten Morgen!');
  await page.click('text=Guten Morgen!');
  await page.waitForTimeout(300);
  await briefeWeg();
  o = await ofen();
  pruefe(o.ein.length === 0 && o.aus.reduce((n, x) => n + x.n, 0) === 200 && o.aus[0].id === 'geraeuchert' && o.aus[0].von === 'karpfen', 'Am Morgen: Eingabe-Fach leer, 200 Geräucherte Karpfen warten');
  await vorOfen();
  await page.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => !x); window.__meld.length = 0; });
  await page.waitForTimeout(150);
  pruefe((await page.textContent('#hinweis')).includes('Geräuchertes holen (200)'), 'Aktionshinweis „Geräuchertes holen (200)"');
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  const rucksack = await page.evaluate(() => { const { S, L } = window.__klarwasser; return { n: L.anzahl(S.s, 'geraeuchert'), von: S.s.spieler.inv.find((x) => x?.id === 'geraeuchert')?.von }; });
  pruefe(rucksack.n === 200 && rucksack.von === 'karpfen', 'Im Rucksack: 200 Geräucherter Karpfen');
  pruefe((await meldungen()).includes('Du nimmst 200 geräucherte Karpfen.'), 'Meldung: „Du nimmst 200 geräucherte Karpfen."');
  pruefe((await ofen()).aus.length === 0, 'Das Ausgabe-Fach ist leer');
  pruefe((await page.locator('#funde .fund').count()) >= 1, 'Der Fund wird angezeigt');
  pruefe(await spielLaeuft(), 'Nach dem Abholen läuft das Spiel (Bild der Ware wird gezeichnet)');

  // ─── Preis zehnfach ──────────────────────────────────────────────────────
  console.log('\nPreis');
  await page.keyboard.press('i');
  await page.waitForSelector('.inv-gitter .slot[title="Geräucherter Fisch (Karpfen)"]');
  await page.click('.inv-gitter .slot[title="Geräucherter Fisch (Karpfen)"]');
  await page.waitForTimeout(100);
  const info = await page.textContent('.item-info');
  pruefe(/Wert\s*300 g/.test(info), `Rucksack-Beschreibung: Wert 300 g, Karpfen frisch 30 g (${info.replace(/\s+/g, ' ').slice(0, 90)})`);
  pruefe(info.includes('Zehnmal so viel wert wie frisch. Aus dem Räucherofen.'), 'Beschreibung auf Deutsch');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.fenster('versand'); });
  await page.waitForSelector('.inv-gitter .slot[title="Geräucherter Fisch (Karpfen)"]');
  await page.click('.inv-gitter .slot[title="Geräucherter Fisch (Karpfen)"]');
  await page.waitForTimeout(100);
  const zahl = await page.evaluate(() => new Intl.NumberFormat('de-DE').format(60000));
  pruefe((await page.textContent('.versand-zeile .preis')).includes(zahl), `Versandkiste: 200 Geräucherte Karpfen = ${zahl} g`);
  pruefe((await page.textContent('.summe')).includes(zahl), 'Erlös morgen früh stimmt');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const gold = await page.evaluate(() => window.__klarwasser.S.s.spieler.gold);
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.schlafen(false); });
  await page.waitForSelector('text=Guten Morgen!');
  await page.click('text=Guten Morgen!');
  await page.waitForTimeout(300);
  await briefeWeg();
  pruefe((await page.evaluate(() => window.__klarwasser.S.s.spieler.gold)) - gold === 60000, 'Nach der Nacht sind 60000 g mehr da');

  // ─── Rucksack voll ───────────────────────────────────────────────────────
  console.log('\nRucksack voll');
  await vorOfen();
  await page.evaluate(([x, y]) => {
    const { S, L } = window.__klarwasser;
    S.s.welt.hof.objekte[L.k(x, y)].aus = [{ id: 'geraeuchert', von: 'karpfen', n: 50 }];
    S.s.spieler.inv = S.s.spieler.inv.map(() => ({ id: 'holz', n: 999 }));
    S.s.spieler.wahl = 0;
    window.__meld.length = 0;
  }, [ort.x, ort.y]);
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  pruefe((await ofen()).aus.reduce((n, x) => n + x.n, 0) === 50, 'Voller Rucksack: die Ware bleibt im Ofen');
  pruefe((await meldungen()).includes('Dein Rucksack ist voll.'), 'Meldung „Dein Rucksack ist voll."');
  await page.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.inv = S.s.spieler.inv.map(() => null); });

  // ─── Axt: nur leer ───────────────────────────────────────────────────────
  console.log('\nAufheben');
  await page.evaluate(() => { const { S, L } = window.__klarwasser; L.hinzufuegen(S.s, { id: 'axt', n: 1 }); S.s.spieler.wahl = S.s.spieler.inv.findIndex((x) => x?.id === 'axt'); window.__meld.length = 0; });
  await vorOfen();
  await page.keyboard.press(' ');
  await page.waitForTimeout(700);
  pruefe((await ofen()) !== null, 'Mit Fischen im Ofen bleibt er stehen');
  pruefe((await meldungen()).includes('Im Räucherofen sind noch Fische.'), 'Meldung „Im Räucherofen sind noch Fische."');

  // ─── Speichern, Neuladen ────────────────────────────────────────────────
  await page.reload();
  await page.waitForSelector('text=Weiterspielen');
  pruefe(true, 'Nach dem Neuladen bietet der Titel „Weiterspielen" an');
  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
} finally {
  await browser.close();
  server.kill();
}
process.exit(ok ? 0 : 1);
