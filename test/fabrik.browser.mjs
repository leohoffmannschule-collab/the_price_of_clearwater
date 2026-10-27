// Browser-Test der Fabrik (Chromium): Förderband im Basteln-Menü (Taste K), auf dem Hof ein Vorkommen, darauf ein
// Erzbohrer, Bänder, ein Schmelzer und die Versandkiste (alles mit der Leertaste aus der Hand aufgestellt, die
// Richtung folgt dem Blick). Ein paar Sekunden warten: das Erz läuft, der Schmelzer macht Barren, sie landen in der
// Versandkiste. Info-Fenster des Schmelzers, Band drehen, schlafen (Verkauf), Handy-Hochformat 390×844 mit
// Aktion-Knopf, keine Konsolenfehler, danach läuft das Spiel weiter (die Spielerin bewegt sich).
//
// Aufruf: node test/fabrik.browser.mjs
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
const briefeWeg = async (page) => {
  for (let i = 0; i < 4 && await page.locator('.papier .knopf').count(); i++) { await page.click('.papier .knopf'); await page.waitForTimeout(200); }
};
const anzahl = (page, id) => page.evaluate((i) => window.__klarwasser.L.anzahl(window.__klarwasser.S.s, i), id);
const objekte = (page, typ) => page.evaluate((t) => {
  const { S } = window.__klarwasser;
  return Object.entries(S.s.welt.hof.objekte).filter(([, o]) => o.t === t).map(([kk, o]) => ({ kk, ...JSON.parse(JSON.stringify(o)) }));
}, typ);
async function spielLaeuft(page, taste = 'a') {
  const vor = await page.evaluate(() => ({ x: window.__klarwasser.S.sp.x, y: window.__klarwasser.S.sp.y }));
  await page.keyboard.down(taste);
  await page.waitForTimeout(220);
  await page.keyboard.up(taste);
  const nach = await page.evaluate(() => ({ x: window.__klarwasser.S.sp.x, y: window.__klarwasser.S.sp.y }));
  return Math.hypot(nach.x - vor.x, nach.y - vor.y) > 3;
}

/** Item in die Hand (Leiste), Spielerin auf Feld (x, y) mit Blick, dann Leertaste. */
async function benutzeAn(page, id, x, y, blick) {
  await page.evaluate(async ({ id, x, y, blick }) => {
    const { S } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === id);
    m.karteBetreten('hof', x, y, blick);
  }, { id, x, y, blick });
  await page.waitForTimeout(180);
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await neuesSpiel(page);

  console.log('\nFörderband herstellen (Taste K)');
  await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    S.s.spieler.inv = S.s.spieler.inv.map(() => null);
    L.hinzufuegen(S.s, { id: 'holz', n: 2 });
    L.hinzufuegen(S.s, { id: 'stein', n: 2 });
  });
  await page.keyboard.press('k');
  await page.waitForSelector('.fenster .reiter');
  let zeile = page.locator('.zeile', { hasText: 'Förderband' });
  pruefe((await zeile.count()) === 1, 'Das Basteln-Menü zeigt das Förderband');
  pruefe((await zeile.locator('button:has-text("Basteln")').isDisabled()), 'Noch gesperrt: Bergbau Stufe 2 fehlt');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__klarwasser.S.s.spieler.xp.bergbau = 400; });
  await page.keyboard.press('k');
  await page.waitForSelector('.fenster .reiter');
  zeile = page.locator('.zeile', { hasText: 'Förderband' });
  pruefe((await zeile.locator('.zutaten').textContent()).includes('2/2 Holz'), 'Kosten: 2 Holz und 2 Stein');
  await zeile.locator('button:has-text("Basteln")').click();
  await page.waitForTimeout(150);
  pruefe((await anzahl(page, 'foerderband')) === 4 && (await anzahl(page, 'holz')) === 0, 'Vier Förderbänder für 2 Holz und 2 Stein');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  console.log('\nLinie auf dem Hof bauen: Bohrer → Bänder → Schmelzer → Bänder → Versandkiste');
  const plan = await page.evaluate(() => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    const kiste = L.dekoListe(S.s, ort.def).find((d) => d.typ === 'versandkiste');
    const kx = kiste.x;
    // Streifen links der Kiste leeren (Bewuchs) und prüfen, dass er begehbar ist
    // Die Kiste steht unter dem Haus; die Linie läuft eine Reihe darunter und biegt vor der Kiste nach oben
    const ry = kiste.y + 1;
    for (let y = ry - 1; y <= ry + 3; y++) {
      for (let x = kx - 13; x <= kx + 1; x++) {
        const kk = L.k(x, y);
        delete ort.welt.objekte[kk]; delete ort.welt.felder[kk]; delete ort.welt.belag[kk];
      }
    }
    L.kartenGeaendert();
    let frei = true;
    for (let y = ry; y <= ry + 2; y++) for (let x = kx - 12; x <= kx; x++) if (!L.begehbar(S.s, ort.def, ort.welt, x, y)) frei = false;
    S.s.spieler.inv = S.s.spieler.inv.map(() => null);
    L.hinzufuegen(S.s, { id: 'foerderband', n: 7 });
    L.hinzufuegen(S.s, { id: 'schmelzer', n: 1 });
    L.hinzufuegen(S.s, { id: 'erzbohrer', n: 1 });
    return { kx, ky: ry, frei };
  });
  pruefe(plan.frei, 'Der Streifen links der Versandkiste ist frei und begehbar');
  const { kx, ky } = plan;
  // Bänder vor dem Schmelzer (kx-8 … kx-5), von links nach rechts blickend
  for (let x = kx - 8; x <= kx - 5; x++) await benutzeAn(page, 'foerderband', x - 1, ky, 'rechts');
  pruefe((await objekte(page, 'foerderband')).length === 4, 'Vier Bänder liegen');
  pruefe((await objekte(page, 'foerderband')).every((b) => b.r === 1), 'Alle zeigen nach rechts (Blickrichtung)');
  // Schmelzer 2×2 links oben bei (kx-4, ky)
  await benutzeAn(page, 'schmelzer', kx - 5, ky, 'rechts');
  const sm = await objekte(page, 'schmelzer');
  pruefe(sm.length === 1 && sm[0].kk === `${kx - 4},${ky}` && sm[0].r === 1, 'Der Schmelzer steht (2×2), Ausgang nach rechts');
  for (const x of [kx - 2, kx - 1]) await benutzeAn(page, 'foerderband', x - 1, ky, 'rechts');
  await benutzeAn(page, 'foerderband', kx, ky + 1, 'oben'); // letztes Band zeigt nach oben in die Versandkiste
  const bandListe = await objekte(page, 'foerderband');
  pruefe(bandListe.length === 7 && bandListe.find((b) => b.kk === `${kx},${ky}`)?.r === 0, 'Drei Bänder zur Versandkiste, das letzte zeigt nach oben hinein');
  // Bohrer ohne Vorkommen abgelehnt
  await benutzeAn(page, 'erzbohrer', kx - 11, ky + 3, 'rechts');
  pruefe((await objekte(page, 'erzbohrer')).length === 0 && (await page.evaluate(() => window.__meld.slice(-2).some((t) => /Vorkommen/.test(t)))), 'Ohne Vorkommen abgelehnt: „… muss auf einem Vorkommen stehen"');
  // Reines Kupfer-Vorkommen setzen, Bohrer darauf benutzen
  await page.evaluate(({ kx, ky }) => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    L.objektSetzen(ort, kx - 10, ky, { t: 'vorkommen', erz: 'kupfer', rein: 2 });
    L.kartenGeaendert();
    // Kohle für den Schmelzer (statt zweiter Linie)
    ort.welt.objekte[`${kx - 4},${ky}`].ein = { kohle: 4 };
  }, { kx, ky });
  await benutzeAn(page, 'erzbohrer', kx - 11, ky, 'rechts');
  const bohrer = await objekte(page, 'erzbohrer');
  pruefe(bohrer.length === 1 && bohrer[0].erz === 'kupfer' && bohrer[0].rein === 2, 'Der Bohrer steht auf dem Vorkommen und erbt Kupfer, rein (2×)');
  pruefe((await anzahl(page, 'erzbohrer')) === 0, 'Genau ein Bohrer verbraucht');

  console.log('\nEin paar Sekunden laufen lassen');
  await page.evaluate(async ({ kx, ky }) => { const m = await import('/src/spiel.js'); m.karteBetreten('hof', kx - 6, ky + 3, 'oben'); }, { kx, ky });
  await page.waitForTimeout(3000);
  const inBand = await page.evaluate(() => Object.values(window.__klarwasser.S.s.welt.hof.objekte).filter((o) => o.t === 'foerderband').reduce((n, b) => n + (b.w?.length || 0), 0));
  pruefe(inBand > 0, `Erz läuft auf den Bändern (${inBand} Stück)`);
  await page.waitForTimeout(14000);
  const barren = await page.evaluate(() => window.__klarwasser.S.s.versand.filter((v) => v.id === 'kupferbarren').reduce((n, v) => n + v.n, 0));
  pruefe(barren >= 1, `Kupferbarren erreichen die Versandkiste (${barren})`);
  pruefe((await objekte(page, 'schmelzer'))[0].st !== undefined, 'Der Schmelzer meldet einen Status');

  console.log('\nInfo-Fenster des Schmelzers');
  await page.evaluate(async ({ kx, ky }) => {
    const m = await import('/src/spiel.js');
    m.karteBetreten('hof', kx - 4, ky + 2, 'oben');
  }, { kx, ky });
  await page.waitForTimeout(250);
  pruefe((await page.evaluate(() => window.__klarwasser.S.hinweis)) === 'Schmelzer ansehen', 'Hinweis „Schmelzer ansehen" (Teil des großen Objekts)');
  await page.keyboard.press('e');
  await page.waitForSelector('.fabrik-info');
  const text = await page.textContent('.fabrik-info');
  pruefe(/pro Minute/.test(text) && /Eingang/.test(text) && /Ausgang: vorn \(rechts\)/.test(text), 'Fenster zeigt Durchsatz, Eingang und Ausgang');
  pruefe(/Kupferbarren: 5× Kupfererz \+ 1× Kohle/.test(text), 'Rezepte des Schmelzers');
  pruefe(['arbeitet', 'wartet auf Eingang', 'Ausgang voll'].some((t) => text.includes(t)), 'Status sichtbar');
  await page.screenshot({ path: '/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/fabrik/browser-info.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  console.log('\nBand drehen');
  await page.evaluate(async ({ kx, ky }) => {
    const m = await import('/src/spiel.js');
    m.karteBetreten('hof', kx - 1, ky + 1, 'oben');
  }, { kx, ky });
  await page.waitForTimeout(250);
  const vorher = (await objekte(page, 'foerderband')).find((b) => b.kk === `${kx - 1},${ky}`).r;
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  const gewaehlt = (await objekte(page, 'foerderband')).find((b) => b.kk === `${kx - 1},${ky}`).r;
  pruefe(gewaehlt === vorher && /drehen/.test(await page.evaluate(() => window.__klarwasser.S.hinweis)), 'Erste Aktionstaste wählt das Band nur (Hinweis „Band drehen")');
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  const nachher = (await objekte(page, 'foerderband')).find((b) => b.kk === `${kx - 1},${ky}`).r;
  pruefe(nachher === (vorher + 1) % 4, 'Zweite Aktionstaste dreht das Band im Uhrzeigersinn');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('e'); await page.waitForTimeout(150); }
  const zurueck = (await objekte(page, 'foerderband')).find((b) => b.kk === `${kx - 1},${ky}`).r;
  pruefe(zurueck === vorher, 'Nach vier Mal Drehen zeigt das Band wieder nach rechts');

  console.log('\nAufstellen in allen vier Richtungen, mit Vorschau');
  const flaeche = await page.evaluate(({ kx, ky }) => {
    const { S, L } = window.__klarwasser;
    const ort = L.ortVon(S.s, 'hof');
    for (let y = ky + 4; y <= ky + 16; y++) for (let x = kx - 14; x <= kx + 3; x++) { const kk = L.k(x, y); delete ort.welt.objekte[kk]; delete ort.welt.felder[kk]; delete ort.welt.belag[kk]; }
    L.kartenGeaendert();
    let frei = true;
    for (let y = ky + 5; y <= ky + 15; y++) for (let x = kx - 13; x <= kx + 2; x++) if (!L.begehbar(S.s, ort.def, ort.welt, x, y)) frei = false;
    S.s.spieler.inv = S.s.spieler.inv.map(() => null);
    L.hinzufuegen(S.s, { id: 'konstrukteur', n: 6 });
    return frei;
  }, { kx, ky });
  pruefe(flaeche, 'Freie Fläche für die vier Richtungen');
  const richtungen = [['oben', kx - 11, ky + 9, 0, -1], ['rechts', kx - 7, ky + 9, 1, 0], ['unten', kx - 2, ky + 6, 0, 1], ['links', kx - 8, ky + 14, -1, 0]];
  for (const [blick, px, py, dx, dy] of richtungen) {
    await page.evaluate(async ({ px, py, blick }) => {
      const { S } = window.__klarwasser;
      const m = await import('/src/spiel.js');
      S.s.spieler.wahl = S.s.spieler.inv.findIndex((i) => i?.id === 'konstrukteur');
      m.karteBetreten('hof', px, py, blick);
    }, { px, py, blick });
    await page.waitForTimeout(250);
    const v = await page.evaluate(async ({ blick }) => {
      const { S } = window.__klarwasser;
      const o = await import('/src/bereiche/handwerk/fabrik-objekte.js');
      const r = o.bauVorschau(S.s, S.ort, S.ziel.x, S.ziel.y, blick, S.s.spieler.inv[S.s.spieler.wahl]);
      return { x: r.x, y: r.y, ok: r.ok };
    }, { blick });
    await page.screenshot({ path: `${'/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/fabrik/'}vorschau-${blick}.png` });
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    const k = (await objekte(page, 'konstrukteur')).find((o) => o.kk === `${v.x},${v.y}`);
    const deckt = k && px >= v.x && px <= v.x + 1 && py >= v.y && py <= v.y + 1;
    pruefe(v.ok && !!k && !deckt && k.r === ['oben', 'rechts', 'unten', 'links'].indexOf(blick) && ((dx && (dx > 0 ? v.x === px + 1 : v.x === px - 2)) || (dy && (dy > 0 ? v.y === py + 1 : v.y === py - 2))),
      `Blick ${blick}: Vorschau grün, Konstrukteur steht vor der Spielerin (${v.x},${v.y}), Ausgang ${blick}`);
  }
  // Vorschau rot: noch einmal auf dieselbe Stelle
  await page.evaluate(async ({ px, py }) => { const m = await import('/src/spiel.js'); m.karteBetreten('hof', px, py, 'oben'); }, { px: richtungen[0][1], py: richtungen[0][2] });
  await page.waitForTimeout(250);
  const rot = await page.evaluate(async () => {
    const { S } = window.__klarwasser;
    const o = await import('/src/bereiche/handwerk/fabrik-objekte.js');
    return o.bauVorschau(S.s, S.ort, S.ziel.x, S.ziel.y, 'oben', S.s.spieler.inv[S.s.spieler.wahl]).ok;
  });
  await page.screenshot({ path: `${'/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/fabrik/'}vorschau-rot.png` });
  pruefe(rot === false, 'Vorschau ohne Platz ist rot');

  console.log('\nSchlafen und Verkauf');
  const gold = await page.evaluate(() => window.__klarwasser.S.s.spieler.gold);
  const inKiste = await page.evaluate(() => window.__klarwasser.S.s.versand.reduce((n, v) => n + v.n, 0));
  await page.evaluate(async () => { const m = await import('/src/spiel.js'); m.schlafen(false); });
  await page.waitForSelector('text=Guten Morgen!');
  const nachGold = await page.evaluate(() => window.__klarwasser.S.s.spieler.gold);
  pruefe(nachGold - gold > 100, `Die Ware aus der Fabrik wurde über Nacht hergestellt und verkauft (${gold} → ${nachGold} G, ${inKiste} Stück vorher in der Kiste)`);
  await page.click('text=Guten Morgen!');
  await page.waitForTimeout(300);
  await briefeWeg(page);
  pruefe((await objekte(page, 'erzbohrer')).length === 1, 'Die Fabrik steht nach dem Morgen noch');
  pruefe(await spielLaeuft(page), 'Danach läuft das Spiel weiter (die Spielerin bewegt sich)');

  console.log('\nHandy-Hochformat 390×844 (Touch)');
  const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const hp = await handy.newPage();
  await neuesSpiel(hp);
  const hplan = await hp.evaluate(async () => {
    const { S, L } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    const ort = L.ortVon(S.s, 'hof');
    const kiste = L.dekoListe(S.s, ort.def).find((d) => d.typ === 'versandkiste');
    for (let y = kiste.y - 1; y <= kiste.y + 3; y++) for (let x = kiste.x - 8; x < kiste.x; x++) { const kk = L.k(x, y); delete ort.welt.objekte[kk]; delete ort.welt.felder[kk]; delete ort.welt.belag[kk]; }
    L.kartenGeaendert();
    const kx = kiste.x;
    const ky = kiste.y;
    L.objektSetzen(ort, kx - 7, ky, { t: 'konstrukteur', r: 1, rez: 'schraube', ein: { eisenbarren: 3 }, aus: {}, f: 0 });
    for (const x of [kx - 5, kx - 4, kx - 3, kx - 2, kx - 1]) L.objektSetzen(ort, x, ky, { t: 'foerderband', r: 1, w: [] });
    L.kartenGeaendert();
    m.karteBetreten('hof', kx - 6, ky + 2, 'oben');
    return { kx, ky };
  });
  await hp.waitForTimeout(600);
  pruefe((await hp.evaluate(() => window.__klarwasser.S.hinweis)) === 'Konstrukteur ansehen', 'Hinweis im Hochformat');
  await hp.tap('#tAktion');
  await hp.waitForSelector('.fabrik-info');
  const box = await hp.locator('.fabrik-info').boundingBox();
  pruefe(box.width <= 390 && box.x >= 0, `Das Fenster passt auf das Handy (${Math.round(box.width)} px breit)`);
  const dreh = hp.locator('button[data-aktion="drehen"]');
  pruefe(await dreh.isVisible(), 'Knopf „Drehen" ist bedienbar');
  await hp.locator('.fabrik-rezept', { hasText: 'Zahnrad' }).tap();
  await hp.waitForTimeout(150);
  pruefe((await hp.evaluate(() => Object.values(window.__klarwasser.S.s.welt.hof.objekte).find((o) => o.t === 'konstrukteur').rez)) === 'zahnrad', 'Rezept auf dem Handy gewählt (bleibt im Spielstand)');
  await hp.screenshot({ path: '/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/fabrik/handy-info.png' });
  await hp.locator('.fenster .schliessen, .fenster button[aria-label="Schließen"]').first().tap().catch(async () => { await hp.keyboard.press('Escape'); });
  await hp.waitForTimeout(200);
  if (await hp.locator('.fabrik-info').count()) { await hp.keyboard.press('Escape'); await hp.waitForTimeout(200); }
  // Band auf dem Handy: erstes Antippen wählt, zweites dreht
  await hp.evaluate(async ({ kx, ky }) => { const m = await import('/src/spiel.js'); m.karteBetreten('hof', kx - 3, ky + 1, 'oben'); }, hplan);
  await hp.waitForTimeout(400);
  const bandR = () => hp.evaluate(({ kx, ky }) => window.__klarwasser.S.s.welt.hof.objekte[`${kx - 3},${ky}`].r, hplan);
  const r0 = await bandR();
  await hp.tap('#tAktion');
  await hp.waitForTimeout(200);
  pruefe((await bandR()) === r0, 'Handy: erstes Antippen dreht das Band nicht (es wählt nur)');
  await hp.tap('#tAktion');
  await hp.waitForTimeout(200);
  pruefe((await bandR()) === (r0 + 1) % 4, 'Handy: zweites Antippen dreht das Band');
  await hp.screenshot({ path: '/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/fabrik/handy-band.png' });
  // Vorschau auf dem Handy
  await hp.evaluate(async ({ kx, ky }) => {
    const { S, L } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    S.s.spieler.inv[0] = { id: 'assembler', n: 1 };
    S.s.spieler.wahl = 0;
    m.karteBetreten('hof', kx - 4, ky + 2, 'unten');
  }, hplan);
  await hp.waitForTimeout(400);
  await hp.screenshot({ path: '/tmp/claude-0/-home-user-the-price-of-clearwater/97d8fb58-e058-5e55-b265-4e4b15c06457/scratchpad/fabrik/handy-vorschau.png' });
  await handy.close();

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
console.log(ok ? '\nFabrik im Browser: alles grün.\n' : '\nFabrik im Browser: FEHLER.\n');
process.exit(ok ? 0 : 1);
