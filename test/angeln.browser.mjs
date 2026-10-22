// Browser-Test des Angelns (Chromium): ans Wasser laufen, auswerfen, die Wartezeit abkürzen,
// einholen, Fang im Rucksack; zu früh, zu spät, Abbruch durch Laufen und durch ein Fenster;
// Mausklick aufs Wasser; Nacht und Regen; Hochformat 390×844 mit Touch; wildes Tastendrücken,
// danach kann die Figur laufen (kein Hängenbleiben). Bricht bei Konsolenfehlern ab.
//
// Aufruf: node test/angeln.browser.mjs
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

/** Neues Spiel bis zum Hof; Meldungen und Töne werden mitgeschrieben. */
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
    window.__toene = [];
    const m = S.hooks.meldung;
    const t = S.hooks.ton;
    S.hooks.meldung = (text, art) => { window.__meld.push(text); m(text, art); };
    S.hooks.ton = (name) => { window.__toene.push(name); t(name); };
  });
}

/** Angel in die Hand, Köder und Zeit nach Wunsch, drei Felder über einem Wasserfeld des Hofteichs. */
async function ansWasser(page, { minute = 720, wetter = 'sonne', koeder = 0 } = {}) {
  return page.evaluate(async ({ minute, wetter, koeder }) => {
    const { S, L } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    const k = await import('/src/karten.js');
    S.s.zeit.minute = minute;
    S.s.zeit.wetter = wetter;
    S.s.zeit.jz = 0;
    if (!L.hat(S.s, 'angel')) L.hinzufuegen(S.s, { id: 'angel', n: 1 });
    if (koeder) L.hinzufuegen(S.s, { id: 'koeder', n: koeder });
    const start = k.punkt('hof', 'vorHaus');
    m.karteBetreten('hof', start.x, start.y, 'unten');
    const def = S.ort.def;
    const w = S.ort.welt;
    // Ein Platz mit zwei freien Feldern über dem Wasser: von dort läuft man ans Ufer
    for (let y = 1; y < def.h - 4; y++) {
      for (let x = 1; x < def.w - 1; x++) {
        const frei = [0, 1, 2].every((d) => L.begehbar(S.s, def, w, x, y + d));
        if (!frei || !k.istWasser(def, x, y + 3) || !k.istWasser(def, x, y + 4)) continue;
        m.karteBetreten('hof', x, y, 'unten');
        S.s.spieler.wahl = S.s.spieler.inv.findIndex((it) => it && it.id === 'angel');
        window.__meld.length = 0;
        window.__toene.length = 0;
        return { x, y };
      }
    }
    return null;
  }, { minute, wetter, koeder });
}

const stand = (page) => page.evaluate(() => {
  const { S, L } = window.__klarwasser;
  const a = S.angeln;
  const sp = S.sp;
  return {
    phase: a?.phase ?? null, t: a?.t ?? 0, warte: a?.warte ?? 0, fang: a?.fang ? { art: a.fang.art, id: a.fang.id } : null,
    x: Math.floor(sp.x / 16), y: Math.floor((sp.y - 3) / 16), blick: sp.blick, pause: S.pause, hinweis: S.hinweis,
    gold: S.s.spieler.gold, inv: JSON.stringify(S.s.spieler.inv), koeder: L.anzahl(S.s, 'koeder'),
    buch: JSON.stringify(S.s.angeln), meld: [...window.__meld], toene: [...window.__toene], ziel: a ? { x: a.x, y: a.y } : null,
  };
});
const phase = (page, name, timeout = 12000) => page.waitForFunction((p) => window.__klarwasser.S.angeln?.phase === p, name, { timeout });
const kuerzen = (page, s = 0.1) => page.evaluate((sek) => { const a = window.__klarwasser.S.angeln; a.warte = a.t + sek; }, s);
const hotbarOben = (page) => page.evaluate(() => document.querySelector('#hotbar').getBoundingClientRect().top);
const schwimmerBild = (page) => page.evaluate(() => {
  const { S } = window.__klarwasser;
  const a = S.angeln;
  const k = S.kamera;
  return { x: ((a.bx - k.x) * k.zoom) / k.dpr, y: ((a.by - k.y) * k.zoom) / k.dpr };
});

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--no-sandbox'] });
try {
  // ─── Computer: Tastatur und Maus ──────────────────────────────────────────
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await neuesSpiel(page);
  console.log('\nAngeln am Hofteich (Tastatur)');
  const ufer = await ansWasser(page);
  pruefe(!!ufer, 'ein Uferplatz am Hofteich ist gefunden');
  await page.waitForTimeout(300);

  // Ans Wasser laufen: die Figur bleibt am Ufer stehen und schaut aufs Wasser
  await page.keyboard.down('s');
  await page.waitForTimeout(900);
  await page.keyboard.up('s');
  await page.waitForTimeout(150);
  let z = await stand(page);
  const amUfer = await page.evaluate(async () => {
    const { S } = window.__klarwasser;
    const k = await import('/src/karten.js');
    const f = { x: Math.floor(S.sp.x / 16), y: Math.floor((S.sp.y - 3) / 16) };
    return k.istWasser(S.ort.def, f.x, f.y + 1);
  });
  pruefe(z.y > ufer.y && amUfer && z.blick === 'unten', `ans Wasser gelaufen, Wasser vor der Figur (${z.x},${z.y})`);
  pruefe(z.hinweis === 'Auswerfen', `Aktionshinweis „${z.hinweis}"`);
  pruefe((await page.textContent('#hinweis')).includes('Auswerfen'), 'die Anzeige zeigt „Auswerfen"');

  // Auswerfen
  const rucksackVor = z.inv;
  const goldVor = z.gold;
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  z = await stand(page);
  pruefe(z.phase === 'wurf' && z.toene.includes('wurf'), 'Leertaste wirft aus (Bogen, Ton), kein Kraftbalken');
  await phase(page, 'warten');
  z = await stand(page);
  pruefe(z.warte >= 5 && z.warte <= 22, `Wartezeit zwischen 5 und 22 s (${z.warte.toFixed(1)} s)`);
  pruefe(z.toene.includes('platsch') && z.hinweis === 'Einholen', 'Schwimmer landet mit Platscher, Hinweis „Einholen"');
  await page.waitForTimeout(1200);
  const t1 = (await stand(page)).t;
  pruefe(t1 > 0.8 && t1 < 2.5, `die Wartezeit läuft in Echtzeit (${t1.toFixed(2)} s nach 1,2 s)`);

  // Die Wartezeit abkürzen, dann Blasenspur und Biss
  await kuerzen(page);
  await phase(page, 'spur');
  pruefe((await stand(page)).toene.includes('blubb'), 'Blasenspur mit Ton');
  await phase(page, 'biss');
  z = await stand(page);
  pruefe(z.hinweis === 'Einholen!' && z.toene.includes('biss'), 'Biss: Platscher, Ton und Hinweis „Einholen!"');
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
  z = await stand(page);
  pruefe(z.phase === 'einholen' && !!z.fang, `im Fenster eingeholt: ${z.fang?.art} ${z.fang?.id ?? ''}`);
  await phase(page, 'fang');
  z = await stand(page);
  pruefe(z.inv !== rucksackVor || z.gold > goldVor, 'der Fang ist im Rucksack (oder Münzen aus der Schatzkiste)');
  pruefe(z.fang.art !== 'fisch' || JSON.parse(z.buch).gefangen[z.fang.id]?.n >= 1, 'ein Fisch steht im Fangbuch');
  await page.waitForTimeout(1000);
  z = await stand(page);
  pruefe(z.phase === null, 'danach ist das Angeln zu Ende, nichts hängt');

  // Zu früh
  console.log('\nZu früh, zu spät, Abbruch');
  const vorFrueh = (await stand(page)).inv;
  await page.keyboard.press('Space');
  await phase(page, 'warten');
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  z = await stand(page);
  pruefe(z.meld.some((m) => /^Zu früh/.test(m)) && z.inv === vorFrueh, 'zu früh eingeholt: „Zu früh", kein Fang');
  await page.waitForTimeout(500);
  pruefe((await stand(page)).phase === null, 'die leere Schnur ist wieder drin');

  // Zu spät
  await page.keyboard.press('Space');
  await phase(page, 'warten');
  await kuerzen(page);
  await phase(page, 'biss');
  await page.waitForFunction(() => window.__klarwasser.S.angeln?.phase === 'einholen', null, { timeout: 4000 });
  z = await stand(page);
  pruefe(z.meld.includes('Zu spät – er ist weg.') && !z.fang, 'Fenster verpasst: „Zu spät – er ist weg."');
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  pruefe((await stand(page)).phase === 'wurf', 'danach sofort wieder auswerfen');

  // Laufen holt ein
  const yVor = (await stand(page)).y;
  await page.keyboard.down('w');
  await page.waitForTimeout(250);
  await page.keyboard.up('w');
  z = await stand(page);
  pruefe(z.phase === null && z.y < yVor, 'Laufen holt die Schnur ein, die Figur geht sofort los');

  // Ein Fenster holt ein
  await page.keyboard.down('s');
  await page.waitForTimeout(400);
  await page.keyboard.up('s');
  await page.keyboard.press('Space');
  await phase(page, 'warten');
  await page.click('#menueKnopf');
  await page.waitForTimeout(150);
  z = await stand(page);
  pruefe(z.phase === null && z.pause, 'ein geöffnetes Fenster holt die Schnur ein');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  pruefe(!(await stand(page)).pause, 'Esc schließt das Menü, das Spiel läuft weiter');

  // Werkzeugwechsel holt ein
  await page.keyboard.press('Space');
  await phase(page, 'warten');
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  pruefe((await stand(page)).phase === null, 'ein anderes Werkzeug holt die Schnur ein');
  await page.keyboard.press('7');

  // Köder wird beim Wurf verbraucht
  console.log('\nKöder, Nacht, Regen');
  await ansWasser(page, { koeder: 3 });
  await page.keyboard.down('s'); await page.waitForTimeout(900); await page.keyboard.up('s');
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  z = await stand(page);
  pruefe(z.koeder === 3 && z.phase === 'wurf', 'im Flug ist der Köder noch da');
  await phase(page, 'warten');
  z = await stand(page);
  pruefe(z.koeder === 2, 'Köder wird beim Landen verbraucht');
  await phase(page, 'warten');
  pruefe((await stand(page)).warte <= 11 + 1e-9, 'mit Köder höchstens die halbe Wartezeit (11 s)');

  // Nacht und Regen: ein ganzer Durchgang ohne Fehler
  await ansWasser(page, { minute: 1300, wetter: 'regen' });
  await page.keyboard.down('s'); await page.waitForTimeout(900); await page.keyboard.up('s');
  await page.keyboard.press('Space');
  await phase(page, 'warten');
  pruefe((await stand(page)).warte <= 22 * 0.8 + 1e-9, 'bei Regen höchstens 0,8 × 22 s');
  await kuerzen(page);
  await phase(page, 'biss');
  await page.keyboard.press('Space');
  await phase(page, 'fang');
  pruefe(true, 'Nacht und Regen: Wurf, Biss und Fang laufen durch');
  await page.waitForTimeout(900);

  // Mausklick aufs Wasser
  console.log('\nMaus');
  await ansWasser(page);
  await page.keyboard.down('s'); await page.waitForTimeout(900); await page.keyboard.up('s');
  const klick = await page.evaluate(async () => {
    const { S } = window.__klarwasser;
    const k = await import('/src/karten.js');
    const f = { x: Math.floor(S.sp.x / 16), y: Math.floor((S.sp.y - 3) / 16) };
    // ein Wasserfeld schräg unten, 2 Felder weiter als das erste
    for (const [dx, dy] of [[1, 2], [-1, 2], [0, 3], [1, 3], [-1, 3], [0, 2]]) {
      if (k.istWasser(S.ort.def, f.x + dx, f.y + dy) && k.istWasser(S.ort.def, f.x, f.y + 1)) {
        const c = S.kamera;
        return { x: f.x + dx, y: f.y + dy, px: (((f.x + dx) * 16 + 8 - c.x) * c.zoom) / c.dpr, py: (((f.y + dy) * 16 + 8 - c.y) * c.zoom) / c.dpr };
      }
    }
    return null;
  });
  pruefe(!!klick, 'ein weiteres Wasserfeld in Reichweite ist da');
  await page.mouse.move(klick.px, klick.py);
  await page.waitForTimeout(120);
  pruefe((await page.evaluate(() => window.__klarwasser.S.hinweis)) === 'Auswerfen', 'mit der Maus über Wasser: „Auswerfen"');
  await page.mouse.click(klick.px, klick.py);
  await page.waitForTimeout(150);
  z = await stand(page);
  pruefe(z.phase === 'wurf' && z.ziel.x === klick.x && z.ziel.y === klick.y, `Linksklick wirft auf das angeklickte Wasserfeld (${klick.x},${klick.y})`);
  await page.mouse.move(20, 20); // vom Spielfeld weg (Menü-Knopf)
  await page.keyboard.down('w'); await page.waitForTimeout(250); await page.keyboard.up('w');

  // Wildes Tastendrücken, danach hängt nichts
  console.log('\nWildes Drücken, kein Hängenbleiben');
  await ansWasser(page);
  await page.keyboard.down('s'); await page.waitForTimeout(900); await page.keyboard.up('s');
  const tasten = ['Space', 'Space', 'e', 'a', 'd', 's', 'w', '1', '7', 'Space', 'c', 'x', '7', 'Space'];
  let zufall = 12345;
  const zahl = () => { zufall = (zufall * 1103515245 + 12345) & 0x7fffffff; return zufall / 0x7fffffff; };
  for (let i = 0; i < 90; i++) {
    const t = tasten[Math.floor(zahl() * tasten.length)];
    if (zahl() < 0.25) { await page.keyboard.down(t); await page.waitForTimeout(40 + zahl() * 120); await page.keyboard.up(t); } else await page.keyboard.press(t);
    await page.waitForTimeout(30 + zahl() * 90);
    if (zahl() < 0.1) await kuerzen(page, 0.1).catch(() => {});
  }
  await page.keyboard.press('7');
  // sich selbst überlassen: spätestens nach Wartezeit, Spur, Biss und leerem Einholen ist Schluss
  for (let i = 0; i < 40 && (await stand(page)).phase; i++) { await kuerzen(page).catch(() => {}); await page.waitForTimeout(400); }
  z = await stand(page);
  pruefe(z.phase === null && !z.pause, 'sich selbst überlassen endet das Angeln von allein');
  const vor = await stand(page);
  let bewegt = false;
  for (const t of ['w', 'a', 'd', 's']) {
    await page.keyboard.down(t); await page.waitForTimeout(300); await page.keyboard.up(t);
    const nach = await stand(page);
    if (nach.x !== vor.x || nach.y !== vor.y) bewegt = true;
  }
  pruefe(bewegt, 'die Figur kann danach laufen');
  await page.close();

  // ─── Handy: Hochformat mit Touch ──────────────────────────────────────────
  console.log('\nHandy-Hochformat 390×844');
  const handy = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const hp = await handy.newPage();
  await neuesSpiel(hp);
  await ansWasser(hp);
  await hp.waitForTimeout(300);
  await hp.evaluate(async () => {
    // wie zu Fuß ans Ufer: zwei Felder vor das Wasser
    const { S } = window.__klarwasser;
    const m = await import('/src/spiel.js');
    m.karteBetreten('hof', Math.floor(S.sp.x / 16), Math.floor((S.sp.y - 3) / 16) + 1, 'unten');
    S.s.spieler.wahl = S.s.spieler.inv.findIndex((it) => it && it.id === 'angel');
  });
  await hp.waitForTimeout(300);
  pruefe(await hp.evaluate(() => document.body.classList.contains('touch')), 'Touch-Oberfläche ist aktiv');
  pruefe((await hp.textContent('#tAktion')) === 'Auswerfen', 'der Aktion-Knopf zeigt „Auswerfen"');
  const knopf = await hp.evaluate(() => { const r = document.querySelector('#tBenutzen').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  pruefe(knopf.x >= 0 && knopf.x + knopf.w <= 390 && knopf.y + knopf.h <= 844 && knopf.w >= 56 && knopf.h >= 56, `Benutzen-Knopf passt aufs Handy (${Math.round(knopf.w)}×${Math.round(knopf.h)})`);
  await hp.tap('#tBenutzen');
  await hp.waitForTimeout(150);
  pruefe((await stand(hp)).phase === 'wurf', 'Touch-Knopf „Benutzen" wirft aus');
  await phase(hp, 'warten');
  pruefe((await hp.textContent('#tAktion')) === 'Einholen', 'der Aktion-Knopf zeigt „Einholen"');
  const bild = await schwimmerBild(hp);
  const oben = await hotbarOben(hp);
  pruefe(bild.x > 0 && bild.x < 390 && bild.y > 0 && bild.y < oben, `der Schwimmer liegt sichtbar über der Leiste (${Math.round(bild.x)},${Math.round(bild.y)} < ${Math.round(oben)})`);
  await kuerzen(hp);
  await phase(hp, 'biss');
  pruefe((await hp.textContent('#tAktion')) === 'Einholen!', 'im Biss zeigt der Knopf „Einholen!"');
  await hp.tap('#tBenutzen');
  await phase(hp, 'fang');
  pruefe((await stand(hp)).fang !== null, 'Touch: Fang eingeholt');
  await hp.waitForTimeout(900);
  pruefe((await stand(hp)).phase === null, 'danach nichts hängen geblieben');
  await handy.close();

  pruefe(fehler.length === 0, `Keine Fehler in der Konsole${fehler.length ? `: ${fehler.slice(0, 3).join(' | ')}` : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}
console.log(ok ? '\nAngeln im Browser: alles grün.\n' : '\nAngeln im Browser: FEHLER.\n');
process.exit(ok ? 0 : 1);
