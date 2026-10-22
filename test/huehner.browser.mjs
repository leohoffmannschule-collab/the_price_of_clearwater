// Browser-Test der Hühner und der Eierkiste (Chromium): Stall bauen lassen, Küken in Mengen über
// die Laden-Oberfläche kaufen, schlafen, Eierkiste vor dem Stall, Eier holen (auch mit vollem
// Rucksack), keine Hühner in der Welt, keine Konsolenfehler, danach läuft das Spiel weiter und die
// Figur kann sich bewegen. Dazu Hochformat 390×844 mit Touch.
//
// Aufruf: node test/huehner.browser.mjs
// Braucht Playwright. Ein eigener Chromium-Pfad geht über CHROMIUM=/pfad/zu/chrome; mit FOTOS=/ordner
// werden Bildschirmfotos abgelegt.
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
const foto = async (page, name) => { if (process.env.FOTOS) await page.screenshot({ path: `${process.env.FOTOS}/${name}.png` }); };

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

/** Schließt Post, Gespräche und Fenster, bis das Spiel wieder läuft. */
async function fensterZu(page) {
  for (let i = 0; i < 6; i++) {
    if (!(await page.evaluate(() => window.__klarwasser.S.pause))) return;
    const knopf = await page.$('#fenster:not([hidden]) .knopf, #dialog:not([hidden]) .knopf');
    if (knopf) await knopf.click(); else await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => { window.__klarwasser.S.pause = false; });
}

/** Schlafen bis zum Morgen; gibt die Zeilen des Morgenberichts zurück. */
async function schlafen(page) {
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.schlafen(false); });
  await page.waitForSelector('text=Guten Morgen!');
  const zeilen = await page.$$eval('.tag-ende p', (ps) => ps.map((p) => p.textContent));
  await page.click('text=Guten Morgen!');
  await page.waitForTimeout(250);
  await fensterZu(page);
  return zeilen;
}

const stall = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__klarwasser.S.s.stall)));
const zaehle = (page, id) => page.evaluate((i) => window.__klarwasser.L.anzahl(window.__klarwasser.S.s, i), id);
const figur = (page) => page.evaluate(() => { const { S } = window.__klarwasser; return { x: S.sp.x, y: S.sp.y }; });

/** Stellt die Figur auf das Feld unter der Eierkiste, den Blick nach oben. */
async function vorDieKiste(page) {
  return page.evaluate(async () => {
    const { S, L } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    const k = await import('/src/karten.js');
    const kiste = L.dekoListe(S.s, k.karteHolen('hof', S.s)).find((d) => d.typ === 'eierkiste');
    if (!kiste) return null;
    S.s.zeit.minute = 700;
    S.s.zeit.wetter = 'sonne';
    m.karteBetreten('hof', kiste.x, kiste.y + 1, 'oben');
    return { x: kiste.x, y: kiste.y };
  });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await neuesSpiel(page);

  console.log('\nStall bauen lassen');
  await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    S.s.spieler.gold = 800 * 400 + 3000;
    L.hinzufuegen(S.s, { id: 'holz', n: 150 });
    L.hinzufuegen(S.s, { id: 'stein', n: 50 });
    const stallWare = L.ladenWare(S.s, 'schmiede').find((w) => w.spezial === 'stall');
    window.__stallKauf = L.kaufen(S.s, stallWare);
  });
  pruefe(await page.evaluate(() => window.__stallKauf.ok === true), 'Bruno nimmt den Auftrag an');
  let bericht = await schlafen(page);
  pruefe(bericht.some((z) => /Eierkiste/.test(z)), 'der Morgenbericht erwähnt die Eierkiste vor dem Stall');
  pruefe((await stall(page)).gebaut === true, 'der Stall steht am Morgen');
  const kiste = await vorDieKiste(page);
  pruefe(!!kiste, 'die Eierkiste steht vor dem Stall');
  await page.waitForTimeout(400);
  await foto(page, 'stall-kiste-leer');
  pruefe((await page.evaluate(() => window.__klarwasser.S.hinweis)) === 'Eierkiste', 'die Aktionstaste zeigt „Eierkiste"');

  console.log('\nKüken in Menge kaufen (Laden-Oberfläche)');
  await page.evaluate(async () => {
    const m = await import('/src/spiel.js');
    m.fenster('laden', { laden: 'laden' });
  });
  await page.waitForSelector('.mengen-kauf');
  const knoepfe = await page.$$eval('.mengen-kauf button', (b) => b.map((x) => x.textContent));
  pruefe(knoepfe.join(' ') .startsWith('×1 ×10 ×100 Max'), `Mengenknöpfe: ${knoepfe.join(' ')}`);
  await foto(page, 'laden-mengen');
  await page.click('.mengen-kauf >> text=×10');
  pruefe((await stall(page)).anzahl === 10, '×10 kauft zehn Küken');
  await page.click('.mengen-kauf >> text=×100');
  pruefe((await stall(page)).anzahl === 110, '×100 kauft hundert Küken');
  await page.click('.mengen-kauf >> text=×1');
  pruefe((await stall(page)).anzahl === 111, '×1 kauft ein Küken');
  const gold = await page.evaluate(() => window.__klarwasser.S.s.spieler.gold);
  await page.click('.mengen-kauf >> text=/Max/');
  const nachMax = await stall(page);
  pruefe(nachMax.anzahl === 111 + Math.floor(gold / 800), `Max kauft so viele wie bezahlbar (${nachMax.anzahl} Hühner)`);
  pruefe((await page.evaluate(() => window.__klarwasser.S.s.spieler.gold)) === gold % 800, 'es bleibt nur Restgold');
  pruefe(await page.evaluate(() => [...document.querySelectorAll('.mengen-kauf button')].every((b) => b.disabled)), 'ohne Gold sind alle Mengenknöpfe gesperrt');
  await fensterZu(page);

  console.log('\nÜber Nacht legen die Hühner in die Kiste');
  bericht = await schlafen(page);
  pruefe((await stall(page)).eier.ei + (await stall(page)).eier.grossesei === 0, 'neue Küken legen in der ersten Nacht nichts');
  bericht = await schlafen(page);
  const nachNacht = await stall(page);
  const gesamt = nachNacht.eier.ei + nachNacht.eier.grossesei;
  pruefe(gesamt === nachNacht.anzahl, `zweite Nacht: ${gesamt} Eier für ${nachNacht.anzahl} Hühner`);
  pruefe(bericht.some((z) => /In der Eierkiste vor dem Stall liegen [\d.]+ frische Eier\./.test(z)), 'der Morgenbericht nennt den Bestand');
  await vorDieKiste(page);
  await page.waitForTimeout(500);
  await foto(page, 'stall-kiste-voll');
  pruefe((await page.evaluate(() => window.__klarwasser.S.hinweis)) === `Eier holen (${new Intl.NumberFormat('de-DE').format(gesamt)})`, 'der Hinweis nennt den Bestand');

  console.log('\nKeine Hühner in der Welt');
  const welt = await page.evaluate(async () => {
    const { S } = window.__klarwasser;
    const r = await import('/src/render.js');
    const namen = Object.values(r.ZEICHNER).flat().map((z) => z.name);
    return { huehner: S.huehner, namen, objekte: Object.values(S.ort.welt.objekte).filter((o) => o.t === 'sammel' && /ei$/.test(o.id)).length };
  });
  pruefe(welt.huehner === undefined && !welt.namen.includes('huehner'), 'weder Hühner-Zustand noch Hühner-Zeichner');
  pruefe(welt.objekte === 0, 'keine Eier am Boden');

  console.log('\nEier holen');
  const vorher = { ei: await zaehle(page, 'ei'), gross: await zaehle(page, 'grossesei') };
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  const nachher = { ei: await zaehle(page, 'ei'), gross: await zaehle(page, 'grossesei') };
  const rest = await stall(page);
  const genommen = nachher.ei - vorher.ei + nachher.gross - vorher.gross;
  pruefe(genommen > 0 && genommen + rest.eier.ei + rest.eier.grossesei === gesamt, `Eier wandern in den Rucksack (${genommen} von ${gesamt}), nichts geht verloren`);
  const meldungen = await page.evaluate(() => window.__meld);
  pruefe(meldungen.some((m) => /^Du nimmst .* aus der Kiste\.$/.test(m)), 'Meldung „Du nimmst … aus der Kiste."');
  await foto(page, 'stall-kiste-geleert');

  console.log('\nVoller Rucksack');
  await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    S.s.spieler.inv = S.s.spieler.inv.map((x) => x || { id: 'holz', n: 1 });
    for (const x of S.s.spieler.inv) if (x.id === 'holz') x.n = 999;
    for (const x of S.s.spieler.inv) if (x.id === 'ei' || x.id === 'grossesei') x.n = 999;
    S.s.stall.eier = { ei: 30, grossesei: 2 };
    window.__meld.length = 0;
    void L;
  });
  await page.waitForTimeout(1700);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  pruefe((await stall(page)).eier.ei + (await stall(page)).eier.grossesei === 32, 'bei vollem Rucksack bleibt alles in der Kiste');
  pruefe((await page.evaluate(() => window.__meld)).some((m) => m === 'Rucksack voll – der Rest bleibt in der Kiste.'), 'Meldung „Rucksack voll …"');

  console.log('\nStreicheln und Weiterspielen');
  await page.evaluate(async () => {
    const { S, L } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    S.s.spieler.inv = S.s.spieler.inv.map(() => null);
    const k = await import('/src/karten.js');
    const g = L.gebaeudeListe(S.s, k.karteHolen('hof', S.s)).find((x) => x.typ === 'stall');
    // vor der Stalltür stehen und nach oben schauen
    m.karteBetreten('hof', g.tuer.x, g.tuer.y + 1, 'oben');
  });
  await page.waitForTimeout(300);
  pruefe((await page.evaluate(() => window.__klarwasser.S.hinweis)) === 'Hühnerstall', 'vor dem Stall: „Hühnerstall"');
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  pruefe((await stall(page)).gestreichelt === true, 'die Aktion streichelt die ganze Herde');
  await foto(page, 'stall-streicheln');
  await fensterZu(page);
  const vor = await figur(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  const nach = await figur(page);
  pruefe(Math.abs(nach.x - vor.x) + Math.abs(nach.y - vor.y) > 4, 'die Figur kann sich danach bewegen');

  console.log('\nSpeichern und Neuladen');
  await schlafen(page);
  const gespeichert = await stall(page);
  await page.reload();
  await page.waitForSelector('text=Weiterspielen');
  await page.click('text=Weiterspielen');
  await page.waitForTimeout(600);
  const geladen = await stall(page);
  pruefe(JSON.stringify(geladen) === JSON.stringify(gespeichert), 'Herde und Kiste stehen nach dem Neuladen wieder da');
  pruefe(!!(await vorDieKiste(page)), 'die Eierkiste steht nach dem Neuladen');
  await page.waitForTimeout(400);
  await foto(page, 'nach-neuladen');
  await page.close();

  console.log('\nHandy im Hochformat (390×844, Touch)');
  const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const hp = await handy.newPage();
  await neuesSpiel(hp);
  await hp.evaluate(() => {
    const { S } = window.__klarwasser;
    S.s.stall.gebaut = true;
    S.s.stall.anzahl = 40;
    S.s.stall.eier = { ei: 25, grossesei: 4 };
    S.s.spieler.gold = 20000;
    window.__klarwasser.L.kartenGeaendert();
  });
  await vorDieKiste(hp);
  await hp.waitForTimeout(500);
  pruefe(await hp.evaluate(() => document.body.classList.contains('touch')), 'Touch-Oberfläche ist aktiv');
  pruefe((await hp.textContent('#tAktion')) === 'Eier holen (29)', 'der Aktion-Knopf zeigt „Eier holen (29)"');
  await foto(hp, 'handy-kiste');
  await hp.tap('#tAktion');
  await hp.waitForTimeout(300);
  pruefe((await hp.evaluate(() => window.__klarwasser.S.s.stall.eier.ei)) === 0, 'Touch: Eier geholt');
  await hp.evaluate(async () => { const m = await import('/src/spiel.js'); m.fenster('laden', { laden: 'laden' }); });
  await hp.waitForSelector('.mengen-kauf');
  const breite = await hp.evaluate(() => {
    const f = document.querySelector('#fenster');
    const knoepfe = [...document.querySelectorAll('.mengen-kauf button')].map((b) => b.getBoundingClientRect());
    return { seite: document.documentElement.scrollWidth, innen: window.innerWidth, ok: knoepfe.every((r) => r.left >= 0 && r.right <= window.innerWidth && r.height >= 30), f: !!f };
  });
  pruefe(breite.seite <= breite.innen && breite.ok, 'die Mengenknöpfe passen aufs Handy, kein Seitwärtsscrollen');
  await foto(hp, 'handy-laden');
  await hp.tap(".mengen-kauf button:text-is(\"×10\")");
  pruefe((await hp.evaluate(() => window.__klarwasser.S.s.stall.anzahl)) === 50, 'Touch: ×10 kauft zehn Küken');
  await handy.close();

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
console.log(ok ? '\nHühner im Browser: alles grün.\n' : '\nHühner im Browser: FEHLER.\n');
process.exit(ok ? 0 : 1);
