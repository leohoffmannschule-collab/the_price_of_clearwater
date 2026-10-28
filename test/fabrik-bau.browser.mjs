// Browser-Test der Fabrik Stufe 3 (Chromium): den Maschinenbauer von Hand basteln und aufstellen, im Fenster „Maschinenbau" Teile bauen
// (Mengenwahl, Zutaten aus dem Rucksack und aus einem Lager), Mischer und Fertiger bauen und aufstellen, Wasser aus Rohrleitungen, eine
// Linie bis zum Computer, Info-Fenster mit Mengen pro Minute, Handy-App „Bauplan" (Filter), Handy im Hochformat 390×844 (Touch),
// keine Konsolenfehler, danach läuft das Spiel weiter.
//
// Aufruf: node test/fabrik-bau.browser.mjs
// Braucht Playwright. Ein eigener Chromium-Pfad geht über CHROMIUM=/pfad/zu/chrome.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 9000 + Math.floor(Math.random() * 900);
const wurzel = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['tools/server.mjs', String(PORT)], { cwd: wurzel, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const BILDER = '/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/fabrik3/';

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
  await page.evaluate(() => {
    const { S } = window.__klarwasser;
    window.__meld = [];
    const m = S.hooks.meldung;
    S.hooks.meldung = (text, art) => { window.__meld.push(text); m(text, art); };
  });
}
const anzahl = (page, id) => page.evaluate((i) => window.__klarwasser.L.anzahl(window.__klarwasser.S.s, i), id);
const letzteMeldung = (page, n = 1) => page.evaluate((n) => window.__meld.slice(-n).join(' | '), n);
const geben = (page, id, n) => page.evaluate(({ id, n }) => { window.__klarwasser.L.hinzufuegen(window.__klarwasser.S.s, { id, n }); }, { id, n });
async function spielLaeuft(page, taste = 'a') {
  const vor = await page.evaluate(() => ({ x: window.__klarwasser.S.sp.x, y: window.__klarwasser.S.sp.y }));
  await page.keyboard.down(taste);
  await page.waitForTimeout(220);
  await page.keyboard.up(taste);
  const nach = await page.evaluate(() => ({ x: window.__klarwasser.S.sp.x, y: window.__klarwasser.S.sp.y }));
  return Math.hypot(nach.x - vor.x, nach.y - vor.y) > 3;
}
/** Spielerin auf Feld (x, y) mit Blick, Gegenstand id in die Hand, dann Leertaste (Benutzen). */
async function benutzeAn(page, id, x, y, blick) {
  await page.evaluate(async ({ id, x, y, blick }) => {
    const { S } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === id);
    m.karteBetreten('hof', x, y, blick);
  }, { id, x, y, blick });
  await page.waitForTimeout(160);
  await page.keyboard.press('Space');
  await page.waitForTimeout(140);
}
/** Spielerin an (x, y) mit Blick, nichts Passendes in der Hand (für Aktionstaste und Fenster). */
async function stelle(page, x, y, blick) {
  await page.evaluate(async ({ x, y, blick }) => {
    const { S } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => !i) >= 0 ? S.s.spieler.inv.findIndex((i) => !i) : 11;
    m.karteBetreten('hof', x, y, blick);
  }, { x, y, blick });
  await page.waitForTimeout(220);
}
const objekt = (page, x, y) => page.evaluate(({ x, y }) => JSON.parse(JSON.stringify(window.__klarwasser.S.s.welt.hof.objekte[`${x},${y}`] ?? null)), { x, y });
const lagerInhalt = (page, x, y, id) => page.evaluate(({ x, y, id }) => (window.__klarwasser.S.s.welt.hof.objekte[`${x},${y}`]?.inv ?? []).reduce((n, f) => n + (f?.id === id ? f.n : 0), 0), { x, y, id });

/** Freie Fläche 20×13 auf dem Hof suchen und räumen; gibt die Ecke zurück. */
async function raeumen(page) {
  return page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    const { def } = ort;
    const leer = { objekte: {}, felder: {}, belag: {} };
    let ux = 0;
    let uy = 0;
    for (let y = 4; y < def.h - 14 && !ux; y++) {
      for (let x = 4; x < def.w - 22; x++) {
        let frei = true;
        for (let dy = 0; dy < 13 && frei; dy++) for (let dx = 0; dx < 20 && frei; dx++) if (!L.begehbar(S.s, def, leer, x + dx, y + dy) || L.warpAn(def, x + dx, y + dy)) frei = false;
        if (frei) { ux = x; uy = y; break; }
      }
    }
    for (let dy = -1; dy < 14; dy++) for (let dx = -1; dx < 21; dx++) { const kk = L.k(ux + dx, uy + dy); delete ort.welt.objekte[kk]; delete ort.welt.felder[kk]; delete ort.welt.belag[kk]; }
    L.kartenGeaendert();
    return { ux, uy };
  });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await neuesSpiel(page);
  const { ux, uy } = await raeumen(page);
  pruefe(ux > 0, `Freie Fläche auf dem Hof (${ux},${uy})`);
  await page.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.xp.bergbau = 1e9; S.s.spieler.gold = 50_000_000; });

  console.log('\nMaschinenbauer basteln und aufstellen');
  for (const [id, n] of [['eisenplatte', 12], ['schraube', 24], ['zahnrad', 6], ['kupferdraht', 10], ['holz', 30]]) await geben(page, id, n);
  await page.keyboard.press('k');
  await page.waitForSelector('.zeile');
  const zeileBauer = page.locator('.zeile', { hasText: 'Maschinenbauer' }).first();
  pruefe(await zeileBauer.count() === 1, 'Im Basteln-Menü (K) steht der Maschinenbauer');
  await zeileBauer.locator('button.knopf').click();
  await page.waitForTimeout(150);
  pruefe((await anzahl(page, 'maschinenbauer')) === 1 && (await anzahl(page, 'eisenplatte')) === 0, 'Von Hand gebastelt: aus Platten, Schrauben, Zahnrädern, Draht und Holz');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await benutzeAn(page, 'maschinenbauer', ux + 1, uy + 3, 'rechts');
  pruefe((await objekt(page, ux + 2, uy + 3))?.t === 'maschinenbauer' && (await objekt(page, ux + 4, uy + 5))?.t === 'teil', 'Maschinenbauer steht (3×3, vor der Spielerin)');

  console.log('\nFenster Maschinenbau: Teile bauen');
  await stelle(page, ux + 2, uy + 6, 'oben');
  pruefe(/Maschinenbau öffnen/.test(await page.evaluate(() => window.__klarwasser.S.hinweis)), 'Hinweis: „Maschinenbau öffnen"');
  await geben(page, 'eisenplatte', 60);
  await geben(page, 'schraube', 120);
  await page.keyboard.press('e');
  await page.waitForSelector('.mb-zeile');
  const anzPlaene = await page.locator('.mb-zeile').count();
  pruefe(anzPlaene === 21, `Alle ${anzPlaene} Teile des Handys stehen mit ihrem Bauplan im Fenster`);
  pruefe(await page.locator('[data-plan="fertiger"] .zutat').count() === 5, 'Der Fertiger zeigt seine fünf Zutaten');
  await bild(page, 'browser-maschinenbau');
  await page.click('[data-menge="5"]');
  await page.waitForTimeout(80);
  await page.click('[data-bauen="foerderband"]');
  await page.waitForTimeout(120);
  pruefe((await anzahl(page, 'foerderband')) === 20 && (await anzahl(page, 'eisenplatte')) === 50, '×5: 20 Förderbänder gebaut, 10 Platten verbraucht');
  pruefe(/20× Förderband gebaut/.test(await letzteMeldung(page, 2)), 'Meldung: „20× Förderband gebaut"');
  await page.click('[data-menge="max"]');
  await page.waitForTimeout(80);
  await page.click('[data-bauen="foerderband"]');
  await page.waitForTimeout(120);
  pruefe((await anzahl(page, 'eisenplatte')) < 2 || (await anzahl(page, 'schraube')) < 4, 'Max: baut, bis die Zutaten aufgebraucht sind');
  const gesperrtBtn = await page.locator('[data-plan="splitter"] [data-bauen]').isDisabled();
  pruefe(gesperrtBtn, 'Ohne Kabelrolle lässt sich der Splitter nicht bauen (Knopf gesperrt, rote Zutat)');

  console.log('\nZutaten aus einem Lager in Reichweite, Mischer und Fertiger bauen');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.evaluate(({ ux, uy }) => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    const lager = { t: 'lager', r: 1, inv: Array(48).fill(null) };
    L.objektSetzen(ort, ux + 5, uy + 3, lager);
    const rein = (id, n) => L.inBehaelter(lager.inv, { id, n });
    for (const [id, n] of [['eisenplatte', 30], ['metallrohr', 20], ['zahnrad', 20], ['kabelrolle', 30], ['maschinenteil', 10], ['motor', 8], ['rahmen', 8], ['stahltraeger', 20], ['kupferdraht', 10], ['schraube', 40]]) rein(id, n);
    // Lager ohne Rucksack-Vorrat von diesen Teilen: der Rucksack hat von beidem nichts
    S.s.spieler.inv = S.s.spieler.inv.map((z) => (z && ['eisenplatte', 'schraube'].includes(z.id) ? null : z));
  }, { ux, uy });
  await stelle(page, ux + 2, uy + 6, 'oben');
  await page.keyboard.press('e');
  await page.waitForSelector('.mb-zeile');
  const kopfText = await page.textContent('.mb-kopf');
  pruefe(/1 Lager oder Truhe/.test(kopfText) && /bis 3 Felder/.test(kopfText), 'Das Fenster nennt das Lager in Reichweite');
  await page.click('[data-menge="1"]');
  await page.click('[data-bauen="mischer"]');
  await page.waitForTimeout(120);
  pruefe((await anzahl(page, 'mischer')) === 1 && (await lagerInhalt(page, ux + 5, uy + 3, 'eisenplatte')) === 22, 'Mischer gebaut: Zutaten kamen aus dem Lager (8 Platten)');
  await page.click('[data-bauen="fertiger"]');
  await page.waitForTimeout(120);
  pruefe((await anzahl(page, 'fertiger')) === 1 && (await lagerInhalt(page, ux + 5, uy + 3, 'motor')) === 4, 'Fertiger gebaut: 4 Motoren, 4 Rahmen aus dem Lager');
  await page.click('[data-bauen="kohlekraftwerk"]').catch(() => {});
  await bild(page, 'browser-maschinenbau-lager');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  console.log('\nMischer: Wasser aus Rohren');
  // Pumpe und Rohre per Skript (die Pumpe braucht sonst einen Uferplatz), Mischer von Hand aufgestellt
  await page.evaluate(({ ux, uy }) => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    L.objektSetzen(ort, ux + 10, uy + 10, { t: 'wasserpumpe', st: 'x' });
    for (let i = 0; i < 3; i++) L.objektSetzen(ort, ux + 11 + i, uy + 10, { t: 'rohrleitung', fl: 0 });
    L.kartenGeaendert();
  }, { ux, uy });
  await benutzeAn(page, 'mischer', ux + 13, uy + 10, 'rechts');
  pruefe((await objekt(page, ux + 14, uy + 10))?.t === 'mischer', 'Mischer steht (2×2) am Ende der Rohrleitung');
  await page.evaluate(({ ux, uy }) => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    const m = ort.welt.objekte[L.k(ux + 14, uy + 10)];
    m.ein = { stein: 40 };
    L.objektSetzen(ort, ux + 16, uy + 10, { t: 'lager', r: 1, inv: Array(48).fill(null) });
  }, { ux, uy });
  await page.evaluate(() => { window.__klarwasser.S.s.fabrik.t += 40; });
  await page.waitForTimeout(2200);
  const beton = await lagerInhalt(page, ux + 16, uy + 10, 'beton');
  pruefe(beton >= 4, `Der Mischer macht Beton aus Stein und Wasser (${beton})`);
  await stelle(page, ux + 14, uy + 12, 'oben');
  await page.keyboard.press('e');
  await page.waitForSelector('.fabrik-info');
  let text = await page.textContent('.fabrik-info');
  pruefe(/Rohr angeschlossen/.test(text) && /Was braucht dieses Rezept/.test(text) && /Strom/.test(text), 'Info-Fenster des Mischers: Wasser, Rezept-Mengen pro Minute, Strom');
  pruefe(await page.locator('[data-rezept]').count() === 2, 'Rezeptwahl: Beton und Betonplatte');
  await page.click('[data-rezept="betonplatte"]');
  await page.waitForTimeout(100);
  pruefe((await objekt(page, ux + 14, uy + 10)).rez === 'betonplatte', 'Rezept Betonplatte gewählt');
  await bild(page, 'browser-mischer-info');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  console.log('\nFertiger: eine Linie bis zum Computer');
  await benutzeAn(page, 'fertiger', ux + 8, uy + 4, 'rechts');
  pruefe((await objekt(page, ux + 9, uy + 4))?.t === 'fertiger' && (await objekt(page, ux + 11, uy + 6))?.t === 'teil', 'Fertiger steht (3×3)');
  await page.evaluate(({ ux, uy }) => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    // Vorratslager → zwei Bänder → Fertiger (rechts) → Lager
    const quelle = { t: 'lager', r: 1, inv: Array(48).fill(null) };
    L.objektSetzen(ort, ux + 5, uy + 8, quelle);
    for (const [id, n] of [['platine', 12], ['kabelrolle', 12], ['kuehlkoerper', 6], ['motor', 6]]) L.inBehaelter(quelle.inv, { id, n });
    L.objektSetzen(ort, ux + 7, uy + 8, { t: 'foerderband', r: 1, w: [] });
    L.objektSetzen(ort, ux + 8, uy + 8, { t: 'foerderband', r: 0, w: [] });
    L.objektSetzen(ort, ux + 8, uy + 7, { t: 'foerderband', r: 0, w: [] });
    L.objektSetzen(ort, ux + 8, uy + 6, { t: 'foerderband', r: 0, w: [] });
    L.objektSetzen(ort, ux + 8, uy + 5, { t: 'foerderband', r: 1, w: [] });
    L.objektSetzen(ort, ux + 12, uy + 5, { t: 'lager', r: 1, inv: Array(48).fill(null) });
    L.kartenGeaendert();
  }, { ux, uy });
  await page.evaluate(() => { window.__klarwasser.S.s.fabrik.t += 260; });
  await page.waitForTimeout(3500);
  const comp = await lagerInhalt(page, ux + 12, uy + 5, 'computer');
  pruefe(comp >= 3, `Computer kommen am Ende der Linie an (${comp}): Platine, Kabelrolle, Kühlkörper und Motor über ein gemischtes Band`);
  await stelle(page, ux + 10, uy + 7, 'oben');
  await page.keyboard.press('e');
  await page.waitForSelector('.fabrik-info');
  text = await page.textContent('.fabrik-info');
  pruefe(/Was braucht dieses Rezept/.test(text) && /Platine/.test(text) && /Motor/.test(text), 'Info-Fenster des Fertigers: vier Zutaten, Mengen pro Minute');
  pruefe(await page.locator('[data-rezept]').count() === 2, 'Rezeptwahl: Computer und Antriebssystem');
  await bild(page, 'browser-fertiger-info');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await bild(page, 'browser-linie');

  console.log('\nHandy: App Bauplan');
  await page.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === 'handy'); });
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await page.waitForSelector('.handy-schirm');
  pruefe(await page.locator('.handy-app').count() === 4, 'Startbildschirm: die vier Apps der Stufe 2 bleiben');
  pruefe(await page.locator('.handy-kachel[data-app="bauplan"]').count() === 1, 'Dazu die App „Bauplan"');
  await page.click('.handy-kachel[data-app="bauplan"]');
  await page.waitForSelector('.bp-karte');
  const kartenAlle = await page.locator('.bp-karte').count();
  pruefe(kartenAlle === 21, `Übersicht: alle ${kartenAlle} Bauteile mit Zutaten`);
  await page.click('[data-material="motor"]');
  await page.waitForTimeout(80);
  pruefe(await page.locator('.bp-karte').count() === 1 && await page.locator('[data-plan="fertiger"]').count() === 1, 'Filter Material „Motor": nur der Fertiger');
  await page.click('[data-bp-tab="rezepte"]');
  await page.waitForTimeout(80);
  pruefe(await page.locator('.bp-karte').count() === 3, 'Maschinenrezepte mit Motor: Motor, Computer, Antriebssystem');
  text = await page.textContent('.bp-rezept[data-rezept="assembler:motor"]');
  pruefe(/Pro Minute/.test(text) && /Assembler/.test(text), 'Rezept mit Maschine und Menge pro Minute');
  await bild(page, 'browser-bauplan-rezepte');
  await page.click('[data-bp-tab="teile"]');
  await page.click('[data-material="alle"]');
  await geben(page, 'eisenplatte', 4);
  await geben(page, 'schraube', 8);
  await page.click('[data-bp-nur="1"]');
  await page.waitForTimeout(80);
  const machbar = await page.locator('.bp-karte').count();
  pruefe(machbar >= 1 && machbar < 21, `„Nur, was ich jetzt bauen kann": ${machbar} von 21`);
  await bild(page, 'browser-bauplan');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  pruefe(await spielLaeuft(page), 'Das Spiel läuft weiter (die Spielerin bewegt sich)');

  console.log('\nHandy im Hochformat 390×844 (Touch)');
  const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const hp = await handy.newPage();
  await neuesSpiel(hp);
  await hp.evaluate(() => {
    const { S, L } = window.__klarwasser;
    S.s.spieler.xp.bergbau = 1e9;
    for (const [id, n] of [['eisenplatte', 30], ['schraube', 60], ['zahnrad', 6], ['kupferdraht', 12]]) L.hinzufuegen(S.s, { id, n });
  });
  const pos = await raeumen(hp);
  await hp.evaluate(async ({ ux, uy }) => {
    const { S, L } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    const ort = L.ortVon(S.s, 'hof');
    const o = { t: 'maschinenbauer', r: 1 };
    L.objektSetzen(ort, ux + 2, uy + 2, o);
    m.karteBetreten('hof', ux + 3, uy + 6, 'oben');
    m.fenster('handwerk_maschinenbau', { o, x: ux + 2, y: uy + 2 });
  }, pos);
  await hp.waitForSelector('.mb-zeile');
  const breite = await hp.evaluate(() => document.documentElement.scrollWidth);
  pruefe(breite <= 390, `Maschinenbau auf dem Handy: keine seitliche Rollleiste (${breite} px)`);
  const knopf = hp.locator('[data-bauen="foerderband"]');
  await knopf.scrollIntoViewIfNeeded();
  const kb = await knopf.boundingBox();
  pruefe(kb && kb.height >= 40 && kb.x >= 0 && kb.x + kb.width <= 390, `Bauen-Knopf groß genug und sichtbar (${Math.round(kb?.width ?? 0)}×${Math.round(kb?.height ?? 0)} px)`);
  await hp.locator('[data-menge="5"]').tap();
  await bild(hp, 'browser-maschinenbau-hochformat');
  await hp.locator('[data-bauen="foerderband"]').tap();
  await hp.waitForTimeout(150);
  pruefe((await anzahl(hp, 'foerderband')) === 20, '5 Bauten per Antippen: 20 Förderbänder');
  await hp.locator('.zu').tap();
  await hp.waitForTimeout(200);
  await hp.tap('#menueKnopf');
  await hp.waitForSelector('.fenster .reiter');
  await hp.locator('.reiter button', { hasText: 'Handy' }).tap();
  await hp.waitForSelector('.handy-schirm');
  await hp.locator('.handy-kachel[data-app="bauplan"]').tap();
  await hp.waitForSelector('.bp-karte');
  const b2 = await hp.evaluate(() => document.documentElement.scrollWidth);
  pruefe(b2 <= 390, `Bauplan-App auf dem Handy: keine seitliche Rollleiste (${b2} px)`);
  const geraet = await hp.locator('.handy-geraet').boundingBox();
  pruefe(geraet && geraet.x >= 0 && geraet.x + geraet.width <= 390, 'Das Handy passt auf den Bildschirm');
  await bild(hp, 'browser-bauplan-hochformat');
  await hp.locator('[data-bp-tab="rezepte"]').tap();
  await hp.waitForTimeout(100);
  await bild(hp, 'browser-bauplan-rezepte-hochformat');
  await handy.close();

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
console.log(ok ? '\nFabrik Stufe 3 im Browser: alles grün.\n' : '\nFabrik Stufe 3 im Browser: FEHLER.\n');
process.exit(ok ? 0 : 1);
