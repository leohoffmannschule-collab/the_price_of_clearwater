// Browser-Test der Fischfarm (Chromium): Holz geben, im Basteln-Menü (Taste K) herstellen,
// auf der Wiese abgelehnt, am Hofteich aufgestellt, schlafen, am Morgen einsammeln (E), 200 Karpfen
// im Rucksack, Fund-Anzeige; Aktion-Knopf im Hochformat 390×844; keine Konsolenfehler; danach läuft
// das Spiel weiter (die Spielerin kann sich bewegen, nicht nur „die Seite antwortet").
//
// Aufruf: node test/fischfarm.browser.mjs
// Braucht Playwright. Ein eigener Chromium-Pfad geht über CHROMIUM=/pfad/zu/chrome.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 9000 + Math.floor(Math.random() * 900);
const wurzel = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['tools/server.mjs', String(PORT)], { cwd: wurzel, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));

const fehler = [];
let ok = true;
const pruefe = (bedingung, text) => {
  console.log(`  ${bedingung ? '✓' : '✗'} ${text}`);
  if (!bedingung) ok = false;
};

async function neuesSpiel(page) {
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
}

/** Briefe, die am Morgen aufgehen, wegklicken (sie halten das Spiel an und schlucken die Aktionstaste). */
const briefeWeg = async (page) => {
  for (let i = 0; i < 4 && await page.locator('.papier .knopf').count(); i++) { await page.click('.papier .knopf'); await page.waitForTimeout(200); }
};

/** Findet am Hofteich ein freies Uferfeld (ufer) bzw. ein Wiesenfeld (wiese), dazu ein freies Nachbarfeld davor. */
const plaetze = (page) => page.evaluate(async () => {
  const { S, L } = window.__klarwasser;
  const k = await import('/src/karten.js');
  const ort = L.ortVon(S.s, 'hof');
  const def = ort.def;
  const kreuz = [['oben', 0, -1], ['links', -1, 0], ['rechts', 1, 0], ['unten', 0, 1]];
  const suche = (ufer) => {
    for (let y = 3; y < def.h - 3; y++) {
      for (let x = 3; x < def.w - 3; x++) {
        if (!L.feldFrei(S.s, ort, x, y) || kreuz.some(([, dx, dy]) => k.istWasser(def, x + dx, y + dy)) !== ufer) continue;
        for (const [blick, dx, dy] of kreuz) {
          const qx = x - dx;
          const qy = y - dy;
          // Standplatz Q: frei, kein Wasser davor, und dahinter noch ein freies Feld zum Weiterlaufen
          if (L.feldFrei(S.s, ort, qx, qy) && L.feldFrei(S.s, ort, qx - dx, qy - dy)) return { x, y, qx, qy, blick };
        }
      }
    }
    return null;
  };
  return { ufer: suche(true), wiese: suche(false) };
});

const hin = (page, p) => page.evaluate(async ({ qx, qy, blick }) => {
  const m = await import('/src/spiel.js');
  m.karteBetreten('hof', qx, qy, blick);
}, p);

const farmen = (page) => page.evaluate(() => {
  const { S } = window.__klarwasser;
  return Object.entries(S.s.welt.hof.objekte).filter(([, o]) => o.t === 'fischfarm').map(([kk, o]) => ({ kk, fisch: o.fisch }));
});
const anzahl = (page, id) => page.evaluate((i) => window.__klarwasser.L.anzahl(window.__klarwasser.S.s, i), id);
const letzteMeldung = (page) => page.evaluate(() => window.__meld.slice(-3));
/** Läuft die Spielschleife noch? Die Spielerin muss sich bewegen können. */
async function spielLaeuft(page, taste = 'a') {
  const vor = await page.evaluate(() => ({ x: window.__klarwasser.S.sp.x, y: window.__klarwasser.S.sp.y }));
  await page.keyboard.down(taste);
  await page.waitForTimeout(220);
  await page.keyboard.up(taste);
  const nach = await page.evaluate(() => ({ x: window.__klarwasser.S.sp.x, y: window.__klarwasser.S.sp.y }));
  return Math.hypot(nach.x - vor.x, nach.y - vor.y) > 3;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await neuesSpiel(page);
  console.log('\nFischfarm herstellen (Taste K)');
  await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    S.s.spieler.inv = S.s.spieler.inv.map(() => null);
    L.hinzufuegen(S.s, { id: 'holz', n: 5 });
  });
  await page.keyboard.press('k');
  await page.waitForSelector('.fenster .reiter');
  const zeile = page.locator('.zeile', { hasText: 'Fischfarm' });
  pruefe((await zeile.count()) === 1, 'Das Basteln-Menü zeigt die Fischfarm von Anfang an');
  pruefe((await zeile.locator('.zutaten').textContent()).includes('3/3 Holz'), 'Kosten: 3 Holz');
  await zeile.locator('button:has-text("Basteln")').click();
  await page.waitForTimeout(150);
  pruefe((await anzahl(page, 'fischfarm')) === 1 && (await anzahl(page, 'holz')) === 2, 'Eine Fischfarm im Rucksack, genau 3 Holz weniger');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  console.log('\nAufstellen am Hofteich');
  const p = await plaetze(page);
  pruefe(!!p.ufer && !!p.wiese, 'Uferplatz und Wiesenplatz am Hof gefunden');
  await page.evaluate(() => {
    const { S } = window.__klarwasser;
    S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === 'fischfarm');
  });
  await hin(page, p.wiese);
  await page.waitForTimeout(250);
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  pruefe((await letzteMeldung(page)).includes('Die Fischfarm muss direkt am Wasser stehen.'), 'Auf der Wiese abgelehnt: „Die Fischfarm muss direkt am Wasser stehen."');
  pruefe((await farmen(page)).length === 0 && (await anzahl(page, 'fischfarm')) === 1, 'Nichts aufgestellt, die Farm bleibt im Rucksack');
  await hin(page, p.ufer);
  await page.waitForTimeout(250);
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  const steht = await farmen(page);
  pruefe(steht.length === 1 && steht[0].fisch === 0 && (await anzahl(page, 'fischfarm')) === 0, 'Am Ufer aufgestellt, leer');
  pruefe((await page.evaluate(() => window.__klarwasser.S.hinweis)) === 'Fischfarm', 'Aktionshinweis „Fischfarm" (leer)');
  await page.keyboard.press('e');
  await page.waitForTimeout(120);
  pruefe((await letzteMeldung(page)).includes('Noch keine Fische. Über Nacht kommen 200 Karpfen.'), 'Leer einsammeln: „Noch keine Fische…"');

  console.log('\nSchlafen und einsammeln');
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.schlafen(false); });
  await page.waitForSelector('text=Guten Morgen!');
  await page.click('text=Guten Morgen!');
  await page.waitForTimeout(300);
  await briefeWeg(page);
  pruefe((await farmen(page))[0]?.fisch === 200, 'Am Morgen sind 200 Karpfen in der Farm');
  await hin(page, p.ufer);
  await page.waitForTimeout(300);
  pruefe((await page.evaluate(() => window.__klarwasser.S.hinweis)) === 'Fische einsammeln (200)', 'Aktionshinweis „Fische einsammeln (200)"');
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  pruefe((await anzahl(page, 'karpfen')) === 200, '200 Karpfen im Rucksack');
  pruefe((await farmen(page))[0]?.fisch === 0, 'Die Farm ist leer');
  pruefe((await letzteMeldung(page)).includes('200 Karpfen eingesammelt.'), 'Meldung „200 Karpfen eingesammelt."');
  pruefe((await page.locator('#funde .fund').count()) >= 1, 'Die Fund-Anzeige erscheint');
  const q = await page.evaluate(() => { const i = window.__klarwasser.S.s.spieler.inv.find((x) => x?.id === 'karpfen'); return Object.keys(i).sort().join(','); });
  pruefe(q === 'id,n', 'Normaler Karpfen (ohne Qualität)');
  pruefe(await spielLaeuft(page, { oben: 's', unten: 'w', links: 'd', rechts: 'a' }[p.ufer.blick]), 'Danach läuft das Spiel weiter (die Spielerin bewegt sich)');

  console.log('\nHandy-Hochformat 390×844 (Touch)');
  const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const hp = await handy.newPage();
  await neuesSpiel(hp);
  const hpl = await plaetze(hp);
  await hp.evaluate(async ({ x, y }) => {
    const { S, L } = window.__klarwasser;
    L.ortVon(S.s, 'hof').welt.objekte[L.k(x, y)] = { t: 'fischfarm', fisch: 200 };
  }, hpl.ufer);
  await hin(hp, hpl.ufer);
  await hp.waitForTimeout(300);
  pruefe((await hp.textContent('#tAktion')).length > 0 && (await hp.evaluate(() => window.__klarwasser.S.hinweis)) === 'Fische einsammeln (200)', 'Hinweis im Hochformat');
  await hp.tap('#tAktion');
  await hp.waitForTimeout(150);
  pruefe((await anzahl(hp, 'karpfen')) === 200, 'Aktion-Knopf sammelt die 200 Karpfen ein');
  await handy.close();

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
console.log(ok ? '\nFischfarm im Browser: alles grün.\n' : '\nFischfarm im Browser: FEHLER.\n');
process.exit(ok ? 0 : 1);
