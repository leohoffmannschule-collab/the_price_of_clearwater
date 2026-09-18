// Kopfloser Browsertest: startet das Spiel, spielt ein Stück und macht Bilder.
// Aufruf: node test/browser.mjs [schritte]
import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.SPIEL_URL || 'http://127.0.0.1:8099/index.html';
const OUT = process.env.SHOT_DIR || '/tmp/klarwasser-shots';
fs.mkdirSync(OUT, { recursive: true });

const fehler = [];
let schuss = 0;

async function shot(page, name) {
  const datei = `${OUT}/${String(++schuss).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: datei });
  console.log(`  ▸ ${datei}`);
  return datei;
}

async function klickText(page, text, opts = {}) {
  const el = page.locator(`text=${text}`).first();
  await el.waitFor({ state: 'visible', timeout: opts.timeout || 8000 });
  await el.click();
  await page.waitForTimeout(opts.warte ?? 450);
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

page.on('console', (m) => {
  if (m.type() === 'error') { fehler.push(m.text()); console.log(`  ✗ Konsole: ${m.text()}`); }
});
page.on('pageerror', (e) => { fehler.push(e.message); console.log(`  ✗ Seitenfehler: ${e.message}`); });

console.log('\n1. Laden');
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
await shot(page, 'menue');

const bootWeg = await page.evaluate(() => document.getElementById('boot')?.classList.contains('weg'));
console.log(`  Ladebildschirm verschwunden: ${bootWeg}`);
if (!bootWeg) fehler.push('Ladebildschirm blieb stehen');

console.log('\n2. Neues Spiel → Charaktererschaffung');
await klickText(page, 'Neues Spiel', { warte: 700 });
await shot(page, 'gruppe-leer');

await klickText(page, '+ Figur erstellen', { warte: 500 });
await shot(page, 'creator-volk');

await klickText(page, 'Zwerg', { warte: 300 });
await klickText(page, 'Weiter', { warte: 400 });
await shot(page, 'creator-klasse');
await klickText(page, 'Kämpfer', { warte: 300 });
await klickText(page, 'Weiter', { warte: 400 });
await klickText(page, 'Soldat', { warte: 300 });
await klickText(page, 'Weiter', { warte: 400 });
await shot(page, 'creator-attribute');
await klickText(page, 'Standardverteilung', { warte: 400 });
await klickText(page, 'Weiter', { warte: 400 });
await shot(page, 'creator-fertigkeiten');
// zwei Fertigkeiten wählen
const ferts = page.locator('.fert:not(.fest)');
await ferts.nth(0).click();
await ferts.nth(1).click();
await page.waitForTimeout(300);
await klickText(page, 'Weiter', { warte: 400 });
await shot(page, 'creator-name');
await klickText(page, 'Würfeln', { warte: 400 });
await klickText(page, 'Figur fertigstellen', { warte: 700 });
await shot(page, 'gruppe-eins');

console.log('\n3. Restliche Plätze auswürfeln');
await klickText(page, 'Die restlichen Plätze auswürfeln', { warte: 700 });
await shot(page, 'gruppe-voll');

console.log('\n4. Aufbrechen → Prolog');
await page.locator('button.haupt').last().click();
await page.waitForTimeout(1400);
await shot(page, 'intro');
await klickText(page, 'Den Schankraum betreten', { warte: 2200 });
await shot(page, 'taverne-narration');
const weiter = page.locator('.erzaehlkarte button').last();
if (await weiter.isVisible().catch(() => false)) { await weiter.click(); await page.waitForTimeout(1200); }
await shot(page, 'taverne-3d');

console.log('\n5. Zustand prüfen');
const zustand = await page.evaluate(() => {
  const g = window.spiel;
  return {
    modus: g.modus,
    ort: g.aktuellerOrt?.id,
    gruppe: g.state?.party.map((c) => `${c.name} (${c.raceName} ${c.className}, ${c.maxHp} TP)`),
    haken: g.state?.hooks,
    figuren: g.view.actors.size,
    marken: g.markers.length,
    meshes: g.view.scene.meshes.length,
    fps: Math.round(g.view.engine.getFps()),
  };
});
console.log(JSON.stringify(zustand, null, 2));
if (zustand.figuren < 3) fehler.push(`Nur ${zustand.figuren} Figuren in der Szene`);
if (zustand.meshes < 20) fehler.push(`Nur ${zustand.meshes} Meshes — Szene wirkt leer`);

console.log('\n6. Ein Gespräch führen');
const marke = page.locator('.welt-marke').first();
if (await marke.isVisible().catch(() => false)) {
  await marke.click();
  await page.waitForTimeout(1600);
  await shot(page, 'dialog');
  const antwort = page.locator('.antwort').first();
  if (await antwort.isVisible().catch(() => false)) {
    await antwort.click();
    await page.waitForTimeout(1500);
    await shot(page, 'dialog-2');
  }
}

console.log('\n7. Tafeln öffnen');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.keyboard.press('j');
await page.waitForTimeout(600);
await shot(page, 'journal');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.keyboard.press('c');
await page.waitForTimeout(600);
await shot(page, 'charakterbogen');
await page.keyboard.press('Escape');

console.log(`\n${fehler.length ? `✗ ${fehler.length} Fehler` : '✓ keine Konsolenfehler'}`);
if (fehler.length) fehler.slice(0, 12).forEach((f) => console.log(`   - ${f}`));

await browser.close();
process.exit(fehler.length ? 1 : 0);
