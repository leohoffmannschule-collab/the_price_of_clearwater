// Durchspiel-Test im echten Browser: Menü → Erschaffung → Prolog → Kampf → Klarwasser.
// Aufruf: node test/playthrough.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.SPIEL_URL || 'http://127.0.0.1:8099/index.html';
const OUT = process.env.SHOT_DIR || '/tmp/klarwasser-play';
fs.mkdirSync(OUT, { recursive: true });

const fehler = [];
let n = 0;
const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png` });
};

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => { fehler.push(`Seitenfehler: ${e.message}`); });
page.on('console', (m) => { if (m.type() === 'error') fehler.push(`Konsole: ${m.text()}`); });

async function klick(sel, warte = 500) {
  const el = page.locator(sel).first();
  await el.waitFor({ state: 'visible', timeout: 12000 });
  await el.click({ force: true });
  await page.waitForTimeout(warte);
}
async function klickText(text, warte = 500) {
  await klick(`text=${text}`, warte);
}
/** Erzählkarten und Auswahlmodale wegklicken, bis nichts mehr da ist. */
async function durchklicken(max = 14, wahlIndex = 0) {
  for (let i = 0; i < max; i++) {
    const karte = page.locator('.erzaehlkarte').first();
    if (!(await karte.isVisible().catch(() => false))) return i;
    const antworten = page.locator('.erzaehlkarte .antwort');
    if (await antworten.count() > 0) {
      const idx = Math.min(wahlIndex, (await antworten.count()) - 1);
      await antworten.nth(idx).click();
    } else {
      await page.locator('.erzaehlkarte .knoepfe button').last().click();
    }
    await page.waitForTimeout(650);
  }
  return max;
}

console.log('\n1. Laden und Gruppe erstellen');
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2800);
await klickText('Neues Spiel', 800);
await klickText('Die restlichen Plätze auswürfeln', 900);
await shot(page, 'gruppe');
const gruppe = await page.evaluate(() => document.querySelectorAll('.gruppe-slot.voll').length);
console.log(`   ${gruppe} Figuren erstellt`);
if (gruppe !== 3) fehler.push(`Nur ${gruppe} Figuren`);

console.log('\n2. Aufbrechen → Prolog');
await page.locator('.creator-fuss button.haupt').click();
await page.waitForTimeout(1600);
await durchklicken(3);
await page.waitForTimeout(1800);
await durchklicken(3);
await shot(page, 'taverne');
let zustand = await page.evaluate(() => {
  const g = window.spiel;
  const sichtbar = [...g.view.actors.keys()].filter((uid) => {
    const p = g.view.actorScreenPos(uid);
    return p && !p.hinten && p.x > 0 && p.y > 0 && p.x < window.innerWidth && p.y < window.innerHeight;
  }).length;
  return { modus: g.modus, ort: g.aktuellerOrt?.id, figuren: g.view.actors.size, sichtbar };
});
console.log(`   Modus ${zustand.modus}, Ort ${zustand.ort}, ${zustand.figuren} Figuren (${zustand.sichtbar} im Bild)`);
if (zustand.sichtbar < 3) fehler.push(`Nur ${zustand.sichtbar} von ${zustand.figuren} Figuren im Bild`);

console.log('\n3. Gespräch mit dem Wirt (mit Probe)');
await page.evaluate(() => { window.spiel.startDialogue('prolog_wirt'); return true; });
await page.waitForTimeout(1200);
await shot(page, 'dialog');
// Antwort mit Probe suchen
const probeAntwort = page.locator('.antwort:has(.probe)').first();
if (await probeAntwort.isVisible().catch(() => false)) {
  await probeAntwort.click();
  // Die Würfelanzeige blendet sich nach rund zwei Sekunden selbst aus —
  // also darauf warten statt blind zu prüfen, sonst schluckt der
  // Bildschirmabzug das Zeitfenster.
  const wurfDa = await page.locator('.wurf-box')
    .waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  console.log(`   Würfelanzeige sichtbar: ${wurfDa}`);
  if (!wurfDa) fehler.push('Würfelprobe wurde nicht angezeigt');
  await shot(page, 'wuerfelprobe');
  const ergebnis = await page.locator('.wurf-ergebnis').textContent().catch(() => '');
  if (ergebnis) console.log(`   Ergebnis: ${ergebnis}`);
  await page.waitForTimeout(2200);
}
// Dialog zu Ende klicken
for (let i = 0; i < 12; i++) {
  const a = page.locator('.dialog-schicht .antwort').last();
  if (!(await a.isVisible().catch(() => false))) break;
  await a.click();
  await page.waitForTimeout(700);
}
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

console.log('\n4. Wolfskampf');
await page.evaluate(() => {
  const g = window.spiel;
  g.state.flags.wahl_getroffen = true;
  g.goToArea('waldweg', { stumm: true });
  return true;
});
await page.waitForTimeout(1500);
await page.evaluate(() => { window.spiel.runEvent('prolog_woelfe'); return true; });
await page.waitForTimeout(1200);
await durchklicken(2);
await page.waitForTimeout(2000);
await shot(page, 'kampf');
const kampf = await page.evaluate(() => {
  const c = window.spiel.combat;
  return c ? {
    modus: window.spiel.modus, runde: c.round, kaempfer: c.combatants.length,
    dran: c.current?.name, aktionen: document.querySelectorAll('.slot').length,
    initiative: document.querySelectorAll('.init-eintrag').length,
  } : null;
});
console.log(`   ${JSON.stringify(kampf)}`);
if (!kampf) fehler.push('Kampf wurde nicht gestartet');
else {
  if (kampf.initiative < 4) fehler.push('Initiativeliste unvollständig');
  if (kampf.modus !== 'kampf') fehler.push(`Falscher Modus: ${kampf.modus}`);
}

// Namensschilder müssen auf ihren Figuren sitzen, nicht daneben.
const schilder = await page.evaluate(() => {
  const g = window.spiel;
  const raus = [];
  for (const [uid, a] of g.view.actors) {
    const el = document.querySelector(`.welt-name[data-marke="${uid}"]`);
    if (!el || el.style.display === 'none') continue;
    const r = el.getBoundingClientRect();
    const p = g.view.actorScreenPos(uid);
    if (!p || p.hinten) continue;
    const dx = Math.abs(r.left + r.width / 2 - p.x);
    const dy = Math.abs(r.top + r.height / 2 - p.y);
    if (dx > 60 || dy > 60) raus.push(`${uid}: ${Math.round(dx)}/${Math.round(dy)} px daneben`);
  }
  return { geprueft: g.view.actors.size, raus };
});
console.log(`   Namensschilder: ${schilder.geprueft} geprüft, ${schilder.raus.length} verrutscht`);
if (schilder.raus.length) fehler.push(`Namensschilder verrutscht: ${schilder.raus.slice(0, 3).join('; ')}`);

console.log('\n5. Eine Kampfrunde spielen');
// Bewegen
const felder = await page.evaluate(() => {
  const g = window.spiel;
  const c = g.combat?.current;
  if (!c?.isPlayer) return null;
  const { dist } = g.combat.reachable(c);
  // So weit wie möglich auf den nächsten Gegner zu — der Zug, den auch ein
  // Spieler machen würde, und er geht über den Klickweg der Oberfläche.
  const feind = g.combat.combatants.find((x) => x.side === 'feind' && !g.combat.isDown(x));
  const ziel = feind && g.combat.stepToward(c, feind, 1);
  const [x, y] = ziel ? [ziel.x, ziel.y] : [...dist.keys()][0].split(',').map(Number);
  g.combatView.onTileClick(x, y);
  return { x, y, felder: dist.size };
});
console.log(`   Bewegung auf ${felder ? `${felder.x},${felder.y} (${felder.felder} Felder erreichbar)` : '—'}`);
await page.waitForTimeout(1400);
await shot(page, 'kampf-bewegt');

// Angriff auf den nächsten Gegner
const angriff = await page.evaluate(() => {
  const g = window.spiel;
  const c = g.combat?.current;
  if (!c?.isPlayer) return 'nicht dran';
  const feind = g.combat.combatants.find((x) => x.side === 'feind' && !g.combat.isDown(x));
  const atk = c.actions.find((a) => a.attack && a.cost === 'aktion');
  if (!atk || !feind) return 'keine Aktion';
  const inReichweite = g.combat.inRange(c, atk, feind);
  const vorher = feind.ref.hp;
  g.combatView.ausfuehren(c, atk, { target: feind });
  const nachher = feind.ref.hp;
  // Nach einem vollen Bewegungszug ist der Gegner oft noch zu weit weg —
  // das ist Regelwerk, kein Fehler. Getestet wird, dass der Weg durch die
  // Oberfläche sauber bis zur Kampfmechanik durchläuft.
  const ausgang = !inReichweite ? 'noch außer Reichweite'
    : nachher < vorher ? `Treffer, ${vorher} → ${nachher} TP` : 'Fehlschlag';
  return { text: `${atk.name} gegen ${feind.name}: ${ausgang}` };
});
console.log(`   ${angriff?.text ?? angriff}`);
await page.waitForTimeout(1200);
await shot(page, 'kampf-angriff');

// Kampf zu Ende automatisieren
const ergebnis = await page.evaluate(async () => {
  const g = window.spiel;
  const warte = (ms) => new Promise((r) => setTimeout(r, ms));
  let guard = 0; let treffer = 0; let runde = 0;
  while (g.combat && !g.combat.over && guard++ < 220) {
    runde = g.combat.round;
    const c = g.combat.current;
    if (!c) break;
    if (c.isPlayer) {
      const feinde = g.combat.combatants.filter((x) => x.side === 'feind' && !g.combat.isDown(x));
      if (!feinde.length) break;
      const atk = c.actions.find((a) => a.attack && a.cost === 'aktion');
      const spot = g.combat.stepToward(c, feinde[0], 1);
      if (spot) g.combat.move(c, spot.x, spot.y);
      if (atk && g.combat.inRange(c, atk, feinde[0])) {
        const vorher = feinde[0].ref.hp;
        g.combat.perform(c, atk, { target: feinde[0] });
        if (feinde[0].ref.hp < vorher) treffer++;
      }
      g.combat.endTurn();
    }
    await warte(30);
  }
  return { ergebnis: g.combat ? g.combat.result || 'läuft noch' : 'beendet', treffer, runden: runde };
});
console.log(`   Kampfergebnis: ${ergebnis.ergebnis} (${ergebnis.treffer} Treffer über ${ergebnis.runden} Runden)`);
if (!ergebnis.treffer) fehler.push('Kein einziger Angriff hat im ganzen Kampf Schaden gemacht');
if (!['sieg', 'niederlage', 'beendet', 'flucht'].includes(ergebnis.ergebnis)) {
  fehler.push(`Kampf endete nicht sauber: ${ergebnis.ergebnis}`);
}
await page.waitForTimeout(2500);
// Bei einer Niederlage bietet das Spiel Wiederholen / Laden / Weiterspielen an.
// Für den Test soll es weitergehen, also die letzte (abschließende) Antwort.
await durchklicken(4, 99);
await page.waitForTimeout(2500);
await shot(page, 'nach-kampf');

// Nach dem Kampf darf keine Kampfoberfläche mehr stehen bleiben.
const restKampf = await page.evaluate(() => ({
  modus: window.spiel.modus,
  combat: !!window.spiel.combat,
  slots: document.querySelectorAll('.slot').length,
  init: document.querySelectorAll('.init-eintrag').length,
  tags: [...document.querySelectorAll('.welt-name')].filter((e) => e.style.display !== 'none').length,
}));
console.log(`   Nach dem Kampf: ${JSON.stringify(restKampf)}`);
if (restKampf.combat || restKampf.slots || restKampf.init || restKampf.tags) {
  fehler.push(`Kampfoberfläche bleibt stehen: ${JSON.stringify(restKampf)}`);
}

console.log('\n6. Tafeln und Speichern');
await page.keyboard.press('j');
await page.waitForTimeout(700);
await shot(page, 'journal');
const questsDa = await page.locator('.quest').count();
console.log(`   ${questsDa} Journaleinträge`);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.keyboard.press('c');
await page.waitForTimeout(700);
await shot(page, 'bogen');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const gespeichert = await page.evaluate(() => {
  const r = window.spiel.speichern('Testspielstand');
  return r?.ok;
});
console.log(`   Gespeichert: ${gespeichert}`);
if (!gespeichert) fehler.push('Speichern fehlgeschlagen');

console.log('\n7. Klarwasser betreten');
await page.evaluate(() => {
  const g = window.spiel;
  g.state.flags.gewaehlt_stab = true;
  g.state.flags.ghortan_dabei = true;
  g.goToArea('dorfeingang');
  return true;
});
await page.waitForTimeout(1600);
await durchklicken(3);
await page.waitForTimeout(1500);
await shot(page, 'klarwasser');
const ende = await page.evaluate(() => ({
  ort: window.spiel.aktuellerOrt?.name,
  marken: window.spiel.markers.length,
  abgeschnitten: window.spiel.markers.filter((m) => {
    if (m.el.style.display === 'none') return false;
    const r = m.el.getBoundingClientRect();
    return r.left < 0 || r.top < 0 || r.right > window.innerWidth || r.bottom > window.innerHeight;
  }).length,
  figuren: window.spiel.view.actors.size,
  fps: Math.round(window.spiel.view.engine.getFps()),
  meshes: window.spiel.view.scene.meshes.length,
}));
console.log(`   ${JSON.stringify(ende)}`);
if (ende.marken < 2) fehler.push('Zu wenige Interaktionsmarken');
if (ende.figuren < 4) fehler.push('Ghortan fehlt in der Szene');
if (ende.abgeschnitten) fehler.push(`${ende.abgeschnitten} Marke(n) ragen aus dem Bild`);

console.log(`\n${fehler.length ? `✗ ${fehler.length} Fehler:` : '✓ Durchspielen ohne Fehler'}`);
fehler.slice(0, 15).forEach((f) => console.log(`   - ${f}`));
await browser.close();
process.exit(fehler.length ? 1 : 0);
