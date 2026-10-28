// Browser-Test der Großabnehmer (Chromium): Schwarzes Brett öffnen, Reiter „Großabnehmer", Vertrag annehmen (Vorschuss), aus dem
// Rucksack liefern (Teillieferung, Rest bleibt), über die Versandkiste liefern (schlafen, Morgenbericht, Auszahlung, Brief),
// Handy-App „Aufträge" (Ansicht und Teillieferung), Hochformat 390×844 mit Touch, keine Konsolenfehler, das Spiel läuft weiter.
//
// Aufruf: node test/grossabnehmer.browser.mjs
// Braucht Playwright. Ein eigener Chromium-Pfad geht über CHROMIUM=/pfad/zu/chrome.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 9000 + Math.floor(Math.random() * 900);
const wurzel = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['tools/server.mjs', String(PORT)], { cwd: wurzel, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const BILDER = '/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/grossabnehmer/';

const fehler = [];
let ok = true;
const pruefe = (bedingung, text) => {
  console.log(`  ${bedingung ? '✓' : '✗'} ${text}`);
  if (!bedingung) ok = false;
};
const bild = async (page, name) => { try { await page.screenshot({ path: `${BILDER}${name}.png` }); } catch { /* Ordner fehlt: egal */ } };

async function neuesSpiel(page) {
  page.on('pageerror', (e) => fehler.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /Ersatz/i.test(m.text()))) fehler.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForSelector('text=Neues Spiel');
  await page.click('text=Neues Spiel');
  await page.fill('#neuName', 'Testa');
  await page.click('text=Auf zum Hof');
  for (let i = 0; i < 2; i++) { await page.click('.papier .knopf'); await page.waitForTimeout(150); }
}
const anzahl = (page, id) => page.evaluate((i) => window.__klarwasser.L.anzahl(window.__klarwasser.S.s, i), id);
const gold = (page) => page.evaluate(() => window.__klarwasser.S.s.spieler.gold);
const geben = (page, id, n, extra = {}) => page.evaluate(({ id, n, extra }) => { window.__klarwasser.L.hinzufuegen(window.__klarwasser.S.s, { id, n, ...extra }); }, { id, n, extra });
async function spielLaeuft(page, taste = 'a') {
  const vor = await page.evaluate(() => ({ x: window.__klarwasser.S.sp.x, y: window.__klarwasser.S.sp.y }));
  await page.keyboard.down(taste);
  await page.waitForTimeout(220);
  await page.keyboard.up(taste);
  const nach = await page.evaluate(() => ({ x: window.__klarwasser.S.sp.x, y: window.__klarwasser.S.sp.y }));
  return Math.hypot(nach.x - vor.x, nach.y - vor.y) > 3;
}
/** Angebot der Firma mit festen Werten ans Brett hängen (Nummer zurück). */
const anbieten = (page, firma, ware, menge, extra = {}) => page.evaluate(async ({ firma, ware, menge, extra }) => {
  const G = await import('/src/bereiche/gemeinschaft/grossabnehmer.js');
  const { S, L } = window.__klarwasser;
  const s = S.s;
  G.aktualisieren(s);
  const g = G.zustand(s);
  const stueck = L.preisVon(G.wareSlot({ ware }), s);
  const gesamt = Math.round((menge * stueck * 2) / 10) * 10;
  const v = { nr: ++g.nr, firma, ware, menge, geliefert: 0, qMin: 0, stueck, zuschlag: 2, gesamt, vorschuss: Math.round(gesamt * 0.2 / 10) * 10, strafe: 0, bonus: null, tage: 5, auto: true, ...extra };
  g.angebote = g.angebote.filter((a) => a.firma !== firma);
  g.angebote.push(v);
  return v.nr;
}, { firma, ware, menge, extra });
const vertrag = (page, nr) => page.evaluate(async (nr) => {
  const G = await import('/src/bereiche/gemeinschaft/grossabnehmer.js');
  return JSON.parse(JSON.stringify(G.vertragVon(window.__klarwasser.S.s, nr)));
}, nr);
const brettOeffnen = async (page) => {
  await page.evaluate(async () => {
    const m = await import('/src/spiel.js');
    const { punkt } = await import('/src/karten.js');
    const { S } = window.__klarwasser;
    const p = punkt('dorf', 'brett', S.s);
    m.karteBetreten('dorf', p.x, p.y, p.blick);
    m.fenster('brett');
  });
  await page.waitForSelector('[data-brett-tab="gross"]');
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await neuesSpiel(page);
  await page.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.gold = 1000; S.s.spieler.inv = Array(24).fill(null); S.s.spieler.xp.bergbau = 3300; });

  console.log('\nSchwarzes Brett');
  await brettOeffnen(page);
  pruefe(await page.locator('.fenster .papier').count() >= 1, 'Das Brett zeigt weiter den Einzelauftrag (Reiter „Aufträge")');
  await page.click('[data-brett-tab="gross"]');
  await page.waitForSelector('.ga-zettel');
  const echteAngebote = await page.locator('[data-angebot]').count();
  pruefe(echteAngebote >= 2, `Reiter „Großabnehmer" zeigt Angebote (${echteAngebote})`);
  pruefe(await page.locator('.ga-wappen').count() >= echteAngebote && await page.locator('.ga-portrait').count() >= echteAngebote, 'Jeder Zettel hat Wappen und Porträt');
  await bild(page, 'brett-gross-desktop');
  const nr1 = await anbieten(page, 'baufirma', { id: 'stein' }, 100);
  const nr2 = await anbieten(page, 'hofladen', { id: 'pastinake' }, 40);
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.fenster('brett', { tab: 'gross' }); });
  await page.waitForSelector(`[data-annehmen="${nr1}"]`);

  console.log('\nAnnehmen');
  const g0 = await gold(page);
  await page.click(`[data-annehmen="${nr1}"]`);
  await page.waitForSelector(`[data-vertrag="${nr1}"]`);
  const v1 = await vertrag(page, nr1);
  pruefe(v1 && v1.vorschuss > 0 && (await gold(page)) === g0 + v1.vorschuss, `Vorschuss ausgezahlt (+${v1?.vorschuss} g)`);
  pruefe(await page.locator(`[data-annehmen="${nr1}"]`).count() === 0, 'Das Angebot ist vom Brett verschwunden');
  await page.click(`[data-annehmen="${nr2}"]`);
  await page.waitForSelector(`[data-vertrag="${nr2}"]`);
  pruefe(await page.locator('.ga-gitter .ga-zettel[data-vertrag]').count() === 2, 'Zwei laufende Verträge');
  const nr3 = await anbieten(page, 'baufirma', { id: 'holz' }, 10);
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.fenster('brett', { tab: 'gross' }); });
  await page.waitForSelector(`[data-annehmen="${nr3}"]`);
  pruefe(await page.locator(`[data-annehmen="${nr3}"]`).isDisabled(), 'Zweiter Vertrag mit derselben Firma ist gesperrt');

  console.log('\nAus dem Rucksack liefern');
  await geben(page, 'stein', 60);
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.fenster('brett', { tab: 'gross' }); });
  await page.waitForSelector(`[data-liefern="${nr1}"]`);
  await page.locator(`[data-vertrag="${nr1}"] [data-menge="10"]`).click();
  await page.click(`[data-liefern="${nr1}"]`);
  await page.waitForTimeout(150);
  pruefe((await vertrag(page, nr1)).geliefert === 10 && (await anzahl(page, 'stein')) === 50, 'Teillieferung ×10: 10 geliefert, 50 bleiben im Rucksack');
  await page.locator(`[data-vertrag="${nr1}"] [data-menge="max"]`).click();
  await page.click(`[data-liefern="${nr1}"]`);
  await page.waitForTimeout(150);
  const t1 = await vertrag(page, nr1);
  pruefe(t1.geliefert === 60 && (await anzahl(page, 'stein')) === 0, 'Alles geliefert: 60 von 100');
  pruefe(await page.locator(`[data-vertrag="${nr1}"] .ga-balken`).textContent().then((t) => t.includes('60') && t.includes('100')), 'Fortschrittsbalken zeigt 60 / 100');
  await bild(page, 'brett-gross-laufend-desktop');

  console.log('\nÜber die Versandkiste liefern');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.evaluate(() => { const { S, L } = window.__klarwasser; L.versandHinzu(S.s, { id: 'stein', n: 55 }); L.versandHinzu(S.s, { id: 'pastinake', n: 70 }); });
  const gVor = await gold(page);
  const vor2 = await vertrag(page, nr2);
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.schlafen(false); });
  await page.waitForSelector('text=Guten Morgen!');
  const bericht = await page.locator('.tag-ende').innerText();
  pruefe(bericht.includes('Vertrag erfüllt') && bericht.includes('Brandt'), 'Morgenbericht nennt den erfüllten Vertrag der Baufirma');
  pruefe(bericht.includes('Pastinake') && bericht.includes('Hofladen') || bericht.includes('Grüner Korb'), 'Morgenbericht nennt auch den Hofladen-Vertrag');
  await bild(page, 'morgenbericht');
  await page.click('text=Guten Morgen!');
  await page.waitForTimeout(300);
  const nachher = await page.evaluate(async () => {
    const G = await import('/src/bereiche/gemeinschaft/grossabnehmer.js');
    const s = window.__klarwasser.S.s;
    return { laufend: G.zustand(s).laufend.length, erfuellt: G.zustand(s).erfuellt, gold: s.spieler.gold, post: s.post.filter((p) => p.startsWith('grossdank')) };
  });
  pruefe(nachher.erfuellt === 2 && nachher.laufend === 0, 'Beide Verträge erfüllt (stein 40 + pastinake 40 aus der Versandkiste)');
  pruefe(nachher.gold > gVor, `Auszahlung kam an (Gold ${gVor} → ${nachher.gold})`);
  pruefe(nachher.post.length >= 1 || await page.locator('.papier.brief').count() > 0, 'Ein Dankesbrief kam mit der Post');
  void vor2;
  for (let i = 0; i < 8 && await page.evaluate(() => window.__klarwasser.S.pause); i++) {
    if (await page.locator('.papier .knopf').count()) await page.locator('.papier .knopf').first().click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  pruefe(await spielLaeuft(page), 'Das Spiel läuft weiter (die Spielerin bewegt sich)');

  console.log('\nHandy-App „Aufträge"');
  const nr4 = await anbieten(page, 'gasthaus', { id: 'karpfen' }, 30);
  await page.evaluate(async (nr) => { const G = await import('/src/bereiche/gemeinschaft/grossabnehmer.js'); G.annehmen(window.__klarwasser.S.s, nr); }, nr4);
  await geben(page, 'karpfen', 12);
  await geben(page, 'handy', 1);
  await page.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === 'handy'); });
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await page.waitForSelector('.handy-schirm');
  pruefe(await page.locator('.handy-app').count() === 4, 'Die vier Apps der Stufe 2 bleiben');
  pruefe(await page.locator('.handy-kachel[data-app="bauplan"]').count() === 1 && await page.locator('.handy-kachel[data-app="auftraege"]').count() === 1, 'Kacheln „Bauplan" und „Aufträge" sind da');
  await page.click('.handy-kachel[data-app="auftraege"]');
  await page.waitForSelector(`[data-vertrag="${nr4}"]`);
  pruefe((await page.locator('[data-handy-app="auftraege"]').count()) === 1, 'Die App zeigt den laufenden Vertrag');
  await bild(page, 'handy-app-desktop');
  await page.click(`[data-liefern="${nr4}"]`);
  await page.waitForSelector('.handy-nachricht');
  pruefe((await vertrag(page, nr4)).geliefert === 12 && (await anzahl(page, 'karpfen')) === 0, 'Teillieferung am Handy: 12 Karpfen geliefert');
  pruefe((await page.locator('.handy-nachricht').innerText()).includes('12×'), 'Das Handy meldet die Lieferung');
  await page.click('[data-handy="zurueck"]');
  pruefe(await page.locator('.handy-kachel[data-app="auftraege"] .zahl').count() === 1, 'Das Abzeichen zählt die laufenden Verträge');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  console.log('\nHochformat 390×844 (Touch)');
  const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const hp = await handy.newPage();
  await neuesSpiel(hp);
  await hp.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.gold = 1000; S.s.spieler.inv = Array(24).fill(null); S.s.spieler.xp.bergbau = 3300; });
  await brettOeffnen(hp);
  await hp.locator('[data-brett-tab="gross"]').tap();
  await hp.waitForSelector('.ga-zettel');
  const b1 = await hp.evaluate(() => document.documentElement.scrollWidth);
  pruefe(b1 <= 390, `Brett auf dem Handy: keine seitliche Rollleiste (${b1} px)`);
  await bild(hp, 'brett-gross-hochformat');
  const n1 = await anbieten(hp, 'baufirma', { id: 'stein' }, 80);
  await anbieten(hp, 'gasthaus', { id: 'karpfen' }, 25);
  await hp.evaluate(async () => { const m = await import('/src/spiel.js'); m.fenster('brett', { tab: 'gross' }); });
  const annehmenKnopf = hp.locator(`[data-annehmen="${n1}"]`);
  await annehmenKnopf.scrollIntoViewIfNeeded();
  const ab = await annehmenKnopf.boundingBox();
  pruefe(ab && ab.height >= 40 && ab.x >= 0 && ab.x + ab.width <= 390, `Annehmen-Knopf groß genug und sichtbar (${Math.round(ab?.width ?? 0)}×${Math.round(ab?.height ?? 0)} px)`);
  await annehmenKnopf.tap();
  await hp.waitForSelector(`[data-vertrag="${n1}"]`);
  await geben(hp, 'stein', 30);
  await hp.evaluate(async () => { const m = await import('/src/spiel.js'); m.fenster('brett', { tab: 'gross' }); });
  await hp.locator(`[data-vertrag="${n1}"] [data-menge="max"]`).tap();
  const lk = hp.locator(`[data-liefern="${n1}"]`);
  await lk.scrollIntoViewIfNeeded();
  const lb = await lk.boundingBox();
  pruefe(lb && lb.height >= 40 && lb.x + lb.width <= 390, 'Liefern-Knopf groß genug');
  await lk.tap();
  await hp.waitForTimeout(150);
  pruefe((await vertrag(hp, n1)).geliefert === 30, 'Per Antippen 30 Steine geliefert');
  await hp.locator(`[data-vertrag="${n1}"]`).scrollIntoViewIfNeeded();
  await bild(hp, 'brett-gross-laufend-hochformat');
  const b2 = await hp.evaluate(() => document.documentElement.scrollWidth);
  pruefe(b2 <= 390, `Mit laufendem Vertrag: keine seitliche Rollleiste (${b2} px)`);
  await hp.locator('.zu').tap();
  await hp.waitForTimeout(200);
  await hp.tap('#menueKnopf');
  await hp.waitForSelector('.fenster .reiter');
  await hp.locator('.reiter button', { hasText: 'Handy' }).tap();
  await hp.waitForSelector('.handy-schirm');
  await bild(hp, 'handy-start-hochformat');
  await hp.locator('.handy-kachel[data-app="auftraege"]').tap();
  await hp.waitForSelector('.ga-zettel');
  const b3 = await hp.evaluate(() => document.documentElement.scrollWidth);
  pruefe(b3 <= 390, `Handy-App auf dem Handy: keine seitliche Rollleiste (${b3} px)`);
  const geraet = await hp.locator('.handy-geraet').boundingBox();
  pruefe(geraet && geraet.x >= 0 && geraet.x + geraet.width <= 390, 'Das Handy passt auf den Bildschirm');
  await bild(hp, 'handy-app-hochformat');
  await hp.locator('.reiter button', { hasText: 'Aufgaben' }).tap();
  await hp.waitForSelector('.ga-aufgabe');
  await bild(hp, 'aufgaben-hochformat');
  await handy.close();

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
console.log(ok ? '\nGroßabnehmer im Browser: alles grün.\n' : '\nGroßabnehmer im Browser: FEHLER.\n');
process.exit(ok ? 0 : 1);
