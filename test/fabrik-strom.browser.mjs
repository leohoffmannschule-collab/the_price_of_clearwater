// Browser-Test der Fabrik Stufe 2 (Chromium): Handy aus dem Rucksack benutzen, im Fabrikbedarf Teile kaufen (Mengen,
// Gold), ein Vorkommen mit Sorte und Reinheit bestellen, auf dem Hof Biomasse-Brenner, Strommast, Vorkommen, Erzbohrer
// und Lager aus der Hand aufstellen, Kabel mit dem Kabel-Werkzeug verlegen, Holz einlegen: Strom fließt, der Bohrer
// fördert. Überlast mit weiteren Bohrern: die Sicherung fliegt, im Netzfenster einschalten (fliegt wieder), Kabel lösen,
// einschalten – Strom fließt. Pumpe am Teich, Rohrleitungen und Kohlekraftwerk: der Tank füllt sich, das Kraftwerk liefert.
// Handy im Hochformat 390×844 (Touch), keine Konsolenfehler, danach läuft das Spiel weiter.
//
// Aufruf: node test/fabrik-strom.browser.mjs
// Braucht Playwright. Ein eigener Chromium-Pfad geht über CHROMIUM=/pfad/zu/chrome.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const PORT = 9000 + Math.floor(Math.random() * 900);
const wurzel = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['tools/server.mjs', String(PORT)], { cwd: wurzel, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const BILDER = '/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/fabrik2/';

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
const gold = (page) => page.evaluate(() => window.__klarwasser.S.s.spieler.gold);
const letzteMeldung = (page, n = 1) => page.evaluate((n) => window.__meld.slice(-n).join(' | '), n);
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
/** Gegenstand in die Hand, Spielerin an (x, y) mit Blick, ohne zu benutzen (für Aktionstaste und Fenster). */
async function stelle(page, x, y, blick) {
  await page.evaluate(async ({ x, y, blick }) => { const m = await import('/src/spiel.js'); m.karteBetreten('hof', x, y, blick); }, { x, y, blick });
  await page.waitForTimeout(220);
}
const objekt = (page, x, y) => page.evaluate(({ x, y }) => JSON.parse(JSON.stringify(window.__klarwasser.S.s.welt.hof.objekte[`${x},${y}`] ?? null)), { x, y });
const status = (page, x, y) => page.evaluate(async ({ x, y }) => {
  const { S, L } = window.__klarwasser;
  const st = await import('/src/bereiche/handwerk/fabrik-strom.js');
  const u = st.netzUebersicht(S.s, L.ortVon(S.s, 'hof'), `${x},${y}`);
  return { status: u.status, kap: u.info?.kap ?? 0, erzeugt: u.info?.erzeugt ?? 0, bedarf: u.info?.bedarf ?? 0 };
}, { x, y });

async function kaufen(page, id, menge) {
  await page.click(`.handy-mengen [data-menge="${menge}"]`);
  await page.waitForTimeout(60);
  await page.click(`[data-kaufen="${id}"]`);
  await page.waitForTimeout(80);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await neuesSpiel(page);

  console.log('\nHandy öffnen und bestellen');
  pruefe((await anzahl(page, 'handy')) === 1, 'Das Handy liegt von Anfang an im Rucksack');
  await page.evaluate(() => { window.__klarwasser.S.s.spieler.gold = 200_000_000; });
  const g0 = await gold(page);
  // Handy in die Hand und benutzen: das Menü geht beim Reiter Handy auf
  await page.evaluate(() => { const { S } = window.__klarwasser; S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === 'handy'); });
  await page.waitForTimeout(100);
  await page.keyboard.press('Space');
  await page.waitForSelector('.handy-schirm');
  pruefe(await page.locator('.reiter button.aktiv', { hasText: 'Handy' }).count() === 1, 'Benutzen öffnet das Menü beim Reiter „Handy"');
  pruefe(await page.locator('.handy-app').count() === 4, 'Startbildschirm mit vier Apps');
  await page.click('[data-app="bedarf"]');
  await page.waitForSelector('.handy-ware');
  const preise = await page.evaluate(async () => (await import('/src/bereiche/handwerk/fabrik-strom-daten.js')).HANDY_PREISE);
  await kaufen(page, 'biomassebrenner', 1);
  await kaufen(page, 'strommast', 1);
  await kaufen(page, 'strommast', 1);
  await kaufen(page, 'erzbohrer', 1);
  await kaufen(page, 'lager', 1);
  await kaufen(page, 'stromkabel', 100);
  await kaufen(page, 'rohrleitung', 10);
  await kaufen(page, 'wasserpumpe', 1);
  await kaufen(page, 'kohlekraftwerk', 1);
  const kosten = preise.biomassebrenner + 2 * preise.strommast + preise.erzbohrer + preise.lager + 100 * preise.stromkabel + 10 * preise.rohrleitung + preise.wasserpumpe + preise.kohlekraftwerk;
  pruefe((await anzahl(page, 'stromkabel')) === 100 && (await anzahl(page, 'rohrleitung')) === 10 && (await anzahl(page, 'strommast')) === 2, 'Mengen ×1, ×10, ×100 geliefert, sofort im Rucksack');
  pruefe(g0 - (await gold(page)) === kosten, `Bezahlt genau ${kosten.toLocaleString('de-DE')} g`);
  await bild(page, 'browser-handy-bedarf');
  await page.click('[data-handy="zurueck"]');
  await page.click('[data-app="vorkommen"]');
  await page.click('[data-sorte="kupfer"]');
  await page.click('[data-rein="normal"]');
  const g1 = await gold(page);
  await page.click('[data-aktion="vorkommen-kaufen"]');
  await page.waitForTimeout(100);
  pruefe((await anzahl(page, 'vorkommen_kupfer_normal')) === 1 && g1 - (await gold(page)) === 50_000_000, 'Kupfer-Vorkommen (normal) für 50 Mio bestellt');
  await bild(page, 'browser-handy-vorkommen');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  pruefe(!(await page.locator('.handy-schirm').count()), 'Handy geschlossen');

  console.log('\nAufbau auf dem Hof: Brenner, Mast, Vorkommen, Bohrer, Lager, Kabel');
  const p = await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    const { def } = ort;
    // Ufer am Hofteich: Landfeld mit Wasser links; rechts davon Platz
    const istW = (x, y) => (def.grid[y]?.[x] === '~');
    // alle Felder, die der Aufbau belegt oder auf denen die Spielerin steht (relativ zur Pumpe am Ufer)
    const rect = (x0, y0, w, h) => { const r = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) r.push([x, y]); return r; };
    const FELDER = [[0, 0], ...rect(1, 0, 4, 1), ...rect(5, 0, 3, 3), ...rect(2, -6, 2, 2), [5, -4], ...rect(9, -7, 4, 2), [10, -2], [14, -2], [13, -8],
      ...rect(8, -1, 2, 2), ...rect(11, 0, 2, 2), ...rect(12, -4, 2, 2), ...rect(15, 0, 2, 2), ...rect(14, -5, 2, 2), ...rect(15, -8, 2, 2),
      [1, -6], [1, -5], [4, -4], [8, -7], [8, -6], [11, -5], [5, -3], [10, -1], [3, 1], [9, 4]];
    const leer = { objekte: {}, felder: {}, belag: {} };
    const passt = (x0, y0) => FELDER.every(([dx, dy]) => L.begehbar(S.s, def, leer, x0 + dx, y0 + dy) && !L.warpAn(def, x0 + dx, y0 + dy));
    let ux = 0;
    let uy = 0;
    for (let y = 2; y < def.h - 4 && !ux; y++) for (let x = 2; x < def.w - 18; x++) if (!istW(x, y) && istW(x - 1, y) && passt(x, y)) { ux = x; uy = y; break; }
    for (const [dx, dy] of FELDER) { const kk = L.k(ux + dx, uy + dy); delete ort.welt.objekte[kk]; delete ort.welt.felder[kk]; delete ort.welt.belag[kk]; }
    L.kartenGeaendert();
    const frei = !!ux && FELDER.every(([dx, dy]) => L.begehbar(S.s, def, ort.welt, ux + dx, uy + dy));
    L.hinzufuegen(S.s, { id: 'holz', n: 60 });
    L.hinzufuegen(S.s, { id: 'kohle', n: 40 });
    return { ux, uy, frei };
  });
  pruefe(p.ux > 0 && p.frei, `Platz am Teich (${p.ux},${p.uy})`);
  const { ux, uy } = p;
  await benutzeAn(page, 'biomassebrenner', ux + 1, uy - 6, 'rechts');
  pruefe((await objekt(page, ux + 2, uy - 6))?.t === 'biomassebrenner', 'Biomasse-Brenner steht (2×2, vor der Spielerin)');
  await benutzeAn(page, 'strommast', ux + 4, uy - 4, 'rechts');
  pruefe((await objekt(page, ux + 5, uy - 4))?.t === 'strommast', 'Strommast steht');
  await benutzeAn(page, 'vorkommen_kupfer_normal', ux + 8, uy - 7, 'rechts');
  pruefe((await objekt(page, ux + 9, uy - 7))?.t === 'vorkommen', 'Gekauftes Vorkommen aufgestellt');
  await benutzeAn(page, 'erzbohrer', ux + 8, uy - 7, 'rechts');
  pruefe((await objekt(page, ux + 9, uy - 7))?.t === 'erzbohrer', 'Erzbohrer auf dem Vorkommen');
  await benutzeAn(page, 'lager', ux + 11, uy - 5, 'oben');
  pruefe((await objekt(page, ux + 11, uy - 7))?.t === 'lager', 'Lager vor dem Bohrer');
  // ohne Strom steht der Bohrer? In der Übergangszeit nicht – für den Test beenden
  await page.evaluate(() => { window.__klarwasser.S.s.fabrik.strom.frist = 0; });
  await page.waitForTimeout(800);
  pruefe((await objekt(page, ux + 9, uy - 7)).st === 'x', 'Ohne Netz steht der Bohrer (nach der Übergangszeit)');
  // Kabel: Brenner → Mast → Bohrer
  await benutzeAn(page, 'stromkabel', ux + 1, uy - 5, 'rechts');
  pruefe(/Kabelanfang/.test(await letzteMeldung(page)), 'Kabel: Anfang am Brenner gewählt');
  await benutzeAn(page, 'stromkabel', ux + 4, uy - 4, 'rechts');
  pruefe(/Kabel verlegt/.test(await letzteMeldung(page)), 'Kabel zum Mast verlegt');
  await benutzeAn(page, 'stromkabel', ux + 4, uy - 4, 'rechts');
  await benutzeAn(page, 'stromkabel', ux + 8, uy - 6, 'rechts');
  pruefe(/Kabel verlegt/.test(await letzteMeldung(page)), 'Kabel vom Mast zum Bohrer verlegt');
  // Holz in den Brenner
  await benutzeAn(page, 'holz', ux + 1, uy - 6, 'rechts');
  pruefe((await objekt(page, ux + 2, uy - 6)).ein?.holz > 0 || (await objekt(page, ux + 2, uy - 6)).arb, 'Holz eingelegt');
  await page.waitForTimeout(2500);
  let st = await status(page, ux + 5, uy - 4);
  pruefe(st.status === 'an' && st.kap === 30 && st.erzeugt >= 5, `Strom fließt (${st.erzeugt} von ${st.kap} MW)`);
  const b = await objekt(page, ux + 9, uy - 7);
  pruefe(b.st === 'a', 'Der Bohrer arbeitet');
  pruefe(await page.evaluate(({ x, y }) => window.__klarwasser.S.s.welt.hof.objekte[`${x},${y}`].inv.some((f) => f?.id === 'kupfererz'), { x: ux + 11, y: uy - 7 }), 'Kupfererz kommt im Lager an');
  // Netzfenster am Mast
  await stelle(page, ux + 5, uy - 3, 'oben');
  pruefe(/Stromnetz ansehen/.test(await page.evaluate(() => window.__klarwasser.S.hinweis)), 'Hinweis am Mast: „Stromnetz ansehen"');
  await page.keyboard.press('e');
  await page.waitForSelector('.strom-info');
  let text = await page.textContent('.strom-info');
  pruefe(/Strom fließt/.test(text) && /Kapazität/.test(text) && /Kabel \(2 von 4\)/.test(text), 'Netzfenster: Status, Kapazität, Kabel 2 von 4');
  await bild(page, 'browser-netzfenster');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await bild(page, 'browser-aufbau');

  console.log('\nÜberlast und Sicherung');
  await page.evaluate(async ({ ux, uy }) => {
    const { S, L } = window.__klarwasser;
    const st = await import('/src/bereiche/handwerk/fabrik-strom.js');
    const sim = await import('/src/bereiche/handwerk/fabrik-sim.js');
    const ort = L.ortVon(S.s, 'hof');
    // drei weitere Masten und sechs weitere Bohrer (zusammen 7 × 5 = 35 MW am 30-MW-Brenner)
    for (const [x, y] of [[ux + 10, uy - 2], [ux + 14, uy - 2], [ux + 13, uy - 8]]) L.objektSetzen(ort, x, y, { t: 'strommast' });
    for (const [x, y] of [[ux + 8, uy - 1], [ux + 11, uy], [ux + 12, uy - 4], [ux + 15, uy], [ux + 14, uy - 5], [ux + 15, uy - 8]]) {
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) delete ort.welt.objekte[L.k(x + dx, y + dy)];
      L.objektSetzen(ort, x, y, { t: 'erzbohrer', r: 1, erz: 'eisen', rein: 1, ein: {}, aus: {}, f: 0 });
    }
    sim.fabrikAenderung();
    L.kartenGeaendert();
    const v = (a, b) => { const r = st.kabelVerbinden(S.s, ort, L.k(...a), L.k(...b)); if (!r.ok) throw new Error(r.grund); };
    v([ux + 2, uy - 6], [ux + 10, uy - 2]);
    v([ux + 10, uy - 2], [ux + 14, uy - 2]);
    v([ux + 14, uy - 2], [ux + 13, uy - 8]);
    v([ux + 10, uy - 2], [ux + 8, uy - 1]);
    v([ux + 10, uy - 2], [ux + 11, uy]);
    v([ux + 14, uy - 2], [ux + 12, uy - 4]);
    v([ux + 14, uy - 2], [ux + 15, uy]);
    v([ux + 13, uy - 8], [ux + 14, uy - 5]);
    v([ux + 13, uy - 8], [ux + 15, uy - 8]);
  }, { ux, uy });
  await page.waitForTimeout(600);
  st = await status(page, ux + 5, uy - 4);
  pruefe(st.status === 'sicherung', 'Überlast: die Sicherung fliegt');
  pruefe(await page.evaluate(() => window.__meld.some((t) => /Überlast/.test(t))), 'Meldung „Überlast …"');
  pruefe((await objekt(page, ux + 9, uy - 7)).st === 'x', 'Das ganze Netz steht (auch der erste Bohrer)');
  await bild(page, 'browser-ueberlast');
  await stelle(page, ux + 10, uy - 1, 'oben');
  await page.keyboard.press('e');
  await page.waitForSelector('[data-aktion="sicherung"]');
  await page.click('[data-aktion="sicherung"]');
  await page.waitForTimeout(150);
  pruefe(/fliegt sofort wieder/.test(await letzteMeldung(page, 3)), 'Einschalten bei zu viel Verbrauch: fliegt sofort wieder');
  // zwei Kabel am zweiten Mast lösen (zwei Bohrer abklemmen), dann einschalten
  const kabelVorher = await anzahl(page, 'stromkabel');
  for (let i = 0; i < 2; i++) {
    await page.locator('.strom-liste li', { hasText: 'Erzbohrer' }).first().locator('[data-aktion="kabel-loesen"]').click();
    await page.waitForTimeout(120);
  }
  pruefe((await anzahl(page, 'stromkabel')) > kabelVorher, 'Gelöste Kabel kommen zurück in den Rucksack');
  await page.click('[data-aktion="sicherung"]');
  await page.waitForTimeout(150);
  console.log('    Meldungen:', await letzteMeldung(page, 4));
  pruefe(/Sicherung eingeschaltet/.test(await letzteMeldung(page, 3)), 'Sicherung eingeschaltet');
  await bild(page, 'browser-sicherung');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  st = await status(page, ux + 5, uy - 4);
  pruefe(st.status === 'an' && st.bedarf <= 30, `Strom fließt wieder (${st.bedarf} von ${st.kap} MW)`);

  console.log('\nPumpe, Rohrleitungen, Kohlekraftwerk');
  // die übrigen Bohrer am zweiten Mast abklemmen (die Pumpe braucht 20 MW)
  await page.evaluate(async ({ ux, uy }) => {
    const { S, L } = window.__klarwasser;
    const st = await import('/src/bereiche/handwerk/fabrik-strom.js');
    const ort = L.ortVon(S.s, 'hof');
    st.kabelAlleLoesen(S.s, ort, L.k(ux + 10, uy - 2));
  }, { ux, uy });
  await benutzeAn(page, 'wasserpumpe', ux + 1, uy, 'links');
  pruefe((await objekt(page, ux, uy))?.t === 'wasserpumpe', 'Wasserpumpe am Ufer');
  for (let x = ux + 1; x <= ux + 4; x++) await benutzeAn(page, 'rohrleitung', x + 1, uy, 'links');
  pruefe((await objekt(page, ux + 4, uy))?.t === 'rohrleitung' && (await objekt(page, ux + 1, uy))?.t === 'rohrleitung', 'Vier Rohrleitungen verlegt');
  await benutzeAn(page, 'kohlekraftwerk', ux + 4, uy, 'rechts');
  pruefe((await objekt(page, ux + 5, uy))?.t === 'kohlekraftwerk', 'Kohlekraftwerk steht (3×3) am Rohrende');
  await benutzeAn(page, 'stromkabel', ux + 4, uy - 4, 'rechts');
  await benutzeAn(page, 'stromkabel', ux + 1, uy, 'links');
  pruefe(/Kabel verlegt/.test(await letzteMeldung(page)), 'Kabel vom Mast zur Pumpe');
  await benutzeAn(page, 'stromkabel', ux + 4, uy - 4, 'rechts');
  await benutzeAn(page, 'stromkabel', ux + 4, uy, 'rechts');
  pruefe(/Kabel verlegt/.test(await letzteMeldung(page)), 'Kabel vom Mast zum Kraftwerk');
  await benutzeAn(page, 'kohle', ux + 4, uy, 'rechts');
  pruefe((await objekt(page, ux + 5, uy)).ein?.kohle > 0, 'Kohle ins Kraftwerk gelegt');
  await page.waitForTimeout(3000);
  const pumpe = await objekt(page, ux, uy);
  const kw = await objekt(page, ux + 5, uy);
  pruefe(pumpe.st === 'a' || pumpe.st === 'v', `Die Pumpe pumpt (${pumpe.st})`);
  pruefe(kw.wa > 0, `Wasser im Tank des Kraftwerks (${Math.round(kw.wa * 10) / 10} m³)`);
  st = await status(page, ux + 5, uy - 4);
  pruefe(st.status === 'an' && st.kap === 105, `Brenner und Kraftwerk liefern (${st.kap} MW)`);
  await stelle(page, ux + 3, uy + 1, 'oben');
  await page.keyboard.press('e');
  await page.waitForSelector('.strom-info');
  text = await page.textContent('.strom-info');
  pruefe(/Füllstand/.test(text) && /m³\/min/.test(text) && /Kohlekraftwerk/.test(text), 'Rohrfenster: Füllstand, Durchfluss, Verbraucher');
  await bild(page, 'browser-rohrfenster');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await stelle(page, ux + 9, uy + 4, 'oben');
  await page.waitForTimeout(500);
  await bild(page, 'browser-kraftwerk');
  pruefe(await spielLaeuft(page), 'Das Spiel läuft weiter (die Spielerin bewegt sich)');

  console.log('\nHandy im Hochformat 390×844 (Touch)');
  const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const hp0 = null; void hp0;

  console.log('\nTouch im Hochformat 390×844: Kabel verlegen, Drehen, Kraftwerk-Anlauf');
  const tp = await handy.newPage();
  await neuesSpiel(tp);
  const tplan = await tp.evaluate(async () => {
    const { S, L } = window.__klarwasser;
    const sim = await import('/src/bereiche/handwerk/fabrik-sim.js');
    const ort = L.ortVon(S.s, 'hof');
    S.s.fabrik.strom.frist = 0;
    // freie Fläche vor dem Haus: Kiste als Anker
    const kiste = L.dekoListe(S.s, ort.def).find((d) => d.typ === 'versandkiste');
    const x0 = kiste.x - 12;
    const y0 = kiste.y + 2;
    for (let y = y0 - 3; y <= y0 + 8; y++) for (let x = x0; x <= x0 + 12; x++) { const kk = L.k(x, y); delete ort.welt.objekte[kk]; delete ort.welt.felder[kk]; delete ort.welt.belag[kk]; }
    L.kartenGeaendert();
    L.objektSetzen(ort, x0 + 2, y0, { t: 'biomassebrenner', r: 0, ein: { holz: 20 }, aus: {}, f: 0 });
    L.objektSetzen(ort, x0 + 8, y0, { t: 'strommast' });
    L.objektSetzen(ort, x0 + 5, y0 + 6, { t: 'foerderband', r: 1, w: [] });
    L.objektSetzen(ort, x0 + 10, y0 + 4, { t: 'erzbohrer', r: 1, erz: 'eisen', rein: 1, ein: {}, aus: {}, f: 0 });
    sim.fabrikAenderung();
    L.hinzufuegen(S.s, { id: 'stromkabel', n: 40 });
    S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === 'stromkabel');
    return { x0, y0 };
  });
  const { x0: tx0, y0: ty0 } = tplan;
  // neben den Brenner stellen (Feld unter dem Brenner), Blick nach oben: Ziel = Brenner
  const stelleTouch = async (x, y, blick) => {
    await tp.evaluate(async ({ x, y, blick }) => { const m = await import('/src/spiel.js'); m.karteBetreten('hof', x, y, blick); }, { x, y, blick });
    await tp.waitForTimeout(300);
  };
  const kabelAnz = () => tp.evaluate(() => (window.__klarwasser.S.s.fabrik.strom.kabel.hof ?? []).length);
  await stelleTouch(tx0 + 3, ty0 + 2, 'oben');
  const h1 = await tp.evaluate(() => window.__klarwasser.S.hinweis);
  pruefe(/^Kabel: Anfang/.test(h1), `Hinweis auf dem Aktion-Knopf: „${h1}"`);
  await tp.tap('#tAktion');
  await tp.waitForTimeout(200);
  pruefe((await tp.locator('.fenster').count()) === 0, 'Aktion mit Stromkabel öffnet kein Netzfenster');
  pruefe(/Kabelanfang/.test(await tp.evaluate(() => window.__meld.slice(-1)[0] ?? '')), 'Aktion-Knopf: Kabelanfang gewählt');
  // ein leeres Feld und ein Band tippen: der Anfang bleibt
  await stelleTouch(tx0 + 5, ty0 + 5, 'unten');
  await tp.tap('#tAktion');
  await tp.waitForTimeout(150);
  pruefe((await tp.evaluate(() => window.__meld.slice(-1)[0] ?? '')).startsWith('Hier ist kein Anschluss'), 'Band antippen: Hinweis, der Anfang bleibt');
  // zweiter Anschluss (Mast) per Aktion-Knopf: Kabel liegt
  await stelleTouch(tx0 + 8, ty0 + 1, 'oben');
  pruefe(/^Kabel verlegen/.test(await tp.evaluate(() => window.__klarwasser.S.hinweis)), 'Hinweis am Ziel: „Kabel verlegen (n Kabel)"');
  await tp.screenshot({ path: `${BILDER}touch-kabel-ziel.png` });
  await tp.tap('#tAktion');
  await tp.waitForTimeout(200);
  pruefe((await kabelAnz()) === 1, 'Zweiter Tipp verlegt das Kabel');
  // und einmal direkt auf die Welt tippen (Mast → Bohrer)
  await stelleTouch(tx0 + 8, ty0 + 1, 'oben');
  await tp.tap('#tAktion');
  await tp.waitForTimeout(120);
  await stelleTouch(tx0 + 9, ty0 + 4, 'rechts');
  const pos = await tp.evaluate(async ({ x, y }) => {
    const { S } = window.__klarwasser;
    const k = S.kamera;
    const px = ((x * 16 + 8 - k.x) * k.zoom) / k.dpr;
    const py = ((y * 16 + 8 - k.y) * k.zoom) / k.dpr;
    return { px, py };
  }, { x: tx0 + 10, y: ty0 + 4 });
  await tp.touchscreen.tap(pos.px, pos.py);
  await tp.waitForTimeout(250);
  pruefe((await kabelAnz()) === 2, 'Antippen des Bohrers in der Welt verlegt das zweite Kabel');
  await tp.waitForTimeout(1500);
  pruefe((await objekt(tp, tx0 + 10, ty0 + 4)).st === 'a', 'Der Bohrer arbeitet (Strom fließt)');
  await tp.screenshot({ path: `${BILDER}touch-kabel-fertig.png` });
  // Werkzeugwechsel bricht ein angefangenes Kabel ab
  await stelleTouch(tx0 + 3, ty0 + 2, 'oben');
  await tp.tap('#tAktion');
  await tp.waitForTimeout(100);
  await tp.evaluate(() => { window.__klarwasser.S.s.spieler.wahl = 0; });
  await tp.waitForTimeout(250);
  pruefe((await tp.evaluate(async () => (await import('/src/bereiche/handwerk/fabrik-strom-objekte.js')).kabelAnfang())) === null, 'Werkzeugwechsel bricht das Kabel ab');
  // Drehen vor dem Legen: Knopf ↻ erscheint nur mit drehbarem Teil
  pruefe(await tp.locator('#handwerk-drehen').isHidden(), 'Dreh-Knopf: ohne Fabrikteil in der Hand versteckt');
  await tp.evaluate(() => { const { S, L } = window.__klarwasser; L.hinzufuegen(S.s, { id: 'foerderband', n: 6 }); S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === 'foerderband'); });
  await tp.waitForTimeout(250);
  pruefe(await tp.locator('#handwerk-drehen').isVisible(), 'Dreh-Knopf: mit Förderband in der Hand sichtbar');
  const vorher = await tp.evaluate(async () => (await import('/src/bereiche/handwerk/fabrik-objekte.js')).blickR());
  await tp.locator('#handwerk-drehen').tap();
  await tp.waitForTimeout(150);
  const nachher = await tp.evaluate(async () => (await import('/src/bereiche/handwerk/fabrik-objekte.js')).blickR());
  pruefe(nachher === (vorher + 1) % 4, 'Knopf dreht die Richtung beim Legen um 90°');
  await tp.screenshot({ path: `${BILDER}touch-drehen.png` });
  await tp.keyboard.press('r');
  await tp.waitForTimeout(100);
  pruefe((await tp.evaluate(async () => (await import('/src/bereiche/handwerk/fabrik-objekte.js')).blickR())) === (vorher + 2) % 4, 'Taste R dreht ebenfalls (und wechselt nicht den Platz)');
  await tp.evaluate(async () => (await import('/src/bereiche/handwerk/fabrik-objekte.js')).drehungZuruecksetzen());
  // Kraftwerk-Anlauf im bestehenden Netz: Pumpen zuerst, keine Sicherung
  await tp.evaluate(async ({ x0, y0 }) => {
    const { S, L } = window.__klarwasser;
    const st = await import('/src/bereiche/handwerk/fabrik-strom.js');
    const sim = await import('/src/bereiche/handwerk/fabrik-sim.js');
    const ort = L.ortVon(S.s, 'hof');
    const set = (x, y, o) => L.objektSetzen(ort, x, y, o);
    // Wasserstelle: ein Ufer ist hier nicht nötig, die Pumpe wird direkt gesetzt (Platzregel prüft nur das Aufstellen)
    set(x0 + 11, y0 + 7, { t: 'wasserpumpe', st: 'x' });
    for (let x = x0 + 8; x <= x0 + 10; x++) set(x, y0 + 7, { t: 'rohrleitung', fl: 0 });
    set(x0 + 5, y0 + 6, { t: 'kohlekraftwerk', r: 0, ein: { kohle: 20 }, aus: {}, f: 0, wa: 0 });
    sim.fabrikAenderung();
    L.hinzufuegen(S.s, { id: 'stromkabel', n: 40 });
    const v = (a, b) => { const r = st.kabelVerbinden(S.s, ort, L.k(...a), L.k(...b)); if (!r.ok) throw new Error(r.grund); };
    v([x0 + 8, y0], [x0 + 11, y0 + 7]);
    v([x0 + 8, y0], [x0 + 5, y0 + 6]);
    // zusätzliche Last: zwei Bohrer, damit das Netz mehr will als 30 MW liefert, solange das Kraftwerk kein Wasser hat
    for (const [x, y] of [[x0 + 11, y0 - 3], [x0 + 11, y0 + 1]]) set(x, y, { t: 'assembler', r: 1, rez: 'maschinenteil', ein: { eisenplatte: 6, kupferdraht: 9 }, aus: {}, f: 0 });
    set(x0 + 10, y0 - 1, { t: 'strommast' });
    sim.fabrikAenderung();
    v([x0 + 2, y0], [x0 + 10, y0 - 1]);
    v([x0 + 10, y0 - 1], [x0 + 11, y0 - 3]);
  }, tplan);
  await stelleTouch(tx0 + 6, ty0 + 9, 'oben');
  await tp.waitForTimeout(500);
  const anlauf = await tp.evaluate(async ({ x0, y0 }) => {
    const { S, L } = window.__klarwasser;
    const st = await import('/src/bereiche/handwerk/fabrik-strom.js');
    const u = st.netzUebersicht(S.s, L.ortVon(S.s, 'hof'), L.k(x0 + 8, y0));
    return { status: u.status, fl: !!S.s.welt.hof.objekte[L.k(x0 + 2, y0)].fl };
  }, tplan);
  pruefe(!anlauf.fl, `Anlauf: die Sicherung fliegt nicht (Status ${anlauf.status})`);
  await tp.keyboard.press('e').catch(() => {});
  await tp.waitForTimeout(100);
  await tp.screenshot({ path: `${BILDER}touch-anlauf.png` });
  await tp.evaluate(async () => { const m = await import('/src/spiel.js'); m.karteBetreten('hof', 0, 0, 'unten'); }).catch(() => {});

  const hp = await handy.newPage();
  await neuesSpiel(hp);
  await hp.evaluate(() => { window.__klarwasser.S.s.spieler.gold = 60_000_000; });
  await hp.tap('#menueKnopf');
  await hp.waitForSelector('.fenster .reiter');
  await hp.locator('.reiter button', { hasText: 'Handy' }).tap();
  await hp.waitForSelector('.handy-schirm');
  const box = await hp.locator('.handy-geraet').boundingBox();
  pruefe(box && box.x >= 0 && box.x + box.width <= 390, `Das Handy passt auf den Bildschirm (${Math.round(box?.width ?? 0)} px)`);
  await hp.locator('[data-app="bedarf"]').tap();
  await hp.locator('[data-menge="10"]').tap();
  const k = hp.locator('[data-kaufen="stromkabel"]');
  await k.scrollIntoViewIfNeeded();
  const kb = await k.boundingBox();
  pruefe(kb && kb.height >= 36 && kb.x + kb.width <= 390, 'Kaufen-Knopf groß genug und sichtbar');
  await k.tap();
  await hp.waitForTimeout(150);
  pruefe((await anzahl(hp, 'stromkabel')) === 10, '10 Kabel per Antippen gekauft');
  await bild(hp, 'browser-handy-hochformat');
  await hp.locator('[data-handy="zurueck"]').tap();
  await hp.locator('[data-app="vorkommen"]').tap();
  await hp.locator('[data-sorte="eisen"]').tap();
  await hp.locator('[data-rein="rein"]').tap();
  const zuTeuer = await hp.locator('[data-aktion="vorkommen-kaufen"]').isDisabled();
  pruefe(zuTeuer, 'Reines Vorkommen (100 Mio) ist mit 59 Mio zu teuer: Knopf gesperrt');
  await hp.locator('[data-rein="normal"]').tap();
  await hp.locator('[data-aktion="vorkommen-kaufen"]').tap();
  await hp.waitForTimeout(150);
  pruefe((await anzahl(hp, 'vorkommen_eisen_normal')) === 1, 'Eisen-Vorkommen (normal) auf dem Handy bestellt');
  await bild(hp, 'browser-handy-vorkommen-hoch');
  await handy.close();

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
console.log(ok ? '\nFabrik Stufe 2 im Browser: alles grün.\n' : '\nFabrik Stufe 2 im Browser: FEHLER.\n');
process.exit(ok ? 0 : 1);
