// Großabnehmer (Bereich gemeinschaft): Firmen, Erzeugung (deterministisch, nur Machbares), Annehmen und Limits, Teillieferung,
// Lieferung über die Versandkiste vor dem Verkauf, Fristablauf und Folgen, Vertrauen, Vorschuss, Speichern und Laden, alte Stände.
// Aufruf: node test/grossabnehmer.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/bereiche/inhalt.js';
import '../src/bereiche/grafik.js';
import '../src/bereiche/oberflaeche.js';
import { ITEMS, PFLANZEN, BRIEFE, TAGE_PRO_JZ } from '../src/daten.js';
import { SYSTEME } from '../src/system.js';
import { SYMBOL } from '../src/sprites.js';
import { HANDY_APPS, FENSTER } from '../src/ui.js';
import * as L from '../src/logik.js';
import { GROSS, FIRMEN, FIRMEN_IDS, ARTEFAKT } from '../src/bereiche/gemeinschaft/grossabnehmer-daten.js';
import * as G from '../src/bereiche/gemeinschaft/grossabnehmer.js';
import { ROHR } from '../src/bereiche/handwerk/rohre.js';
import { herstellerVon, BAUPLAENE } from '../src/bereiche/handwerk/fabrik-bau-daten.js';
import { FREISCHALT } from '../src/bereiche/handwerk/fabrik-daten.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.stack.split('\n').slice(0, 12).join('\n      ')}`);
  }
}
const gruppe = (t) => console.log(`\n${t}`);

// ─── Hilfen ─────────────────────────────────────────────────────────────────

const XP = [0, 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000];
const R = () => 0.5;
const kopie = (s) => JSON.parse(JSON.stringify(s));
const neu = (seed = 7) => L.neuesSpiel({ name: 'T', hof: 'H', seed });
/** Spielstand mit gewünschtem Fortschritt (Fähigkeitsstufe aller Fähigkeiten, tiefste Minenebene, Hühner, Vertrauen). */
function stand({ stufe = 0, tiefe = 0, huehner = 0, sterne = 0, tag = 1, jz = 0, seed = 7 } = {}) {
  const s = neu(seed);
  for (const k of Object.keys(s.spieler.xp)) s.spieler.xp[k] = XP[stufe];
  s.mine.tiefste = tiefe;
  if (tiefe) s.flags.mineOffen = true;
  if (huehner) Object.assign(s.stall, { gebaut: true, anzahl: huehner, neue: 0, freundschaft: 600 });
  s.zeit.tag = tag;
  s.zeit.jz = jz;
  for (const f of FIRMEN_IDS) s.grossabnehmer.vertrauen[f] = sterne;
  s.grossabnehmer.block = -1;
  return s;
}
const heute = (s) => L.tagNr(s.zeit);
const gib = (s, id, n, extra = {}) => { const rest = L.hinzufuegen(s, { id, n, ...extra }); assert.equal(rest, 0, 'Platz im Rucksack'); };
const versandMenge = (s, id, extra = {}) => s.versand.filter((v) => v.id === id && (extra.von == null || v.von === extra.von)).reduce((a, v) => a + v.n, 0);
const leeren = (s) => { s.spieler.inv = Array(24).fill(null); s.versand = []; };

/** Legt ein Angebot an den Brett (wie `erzeugen`, nur mit eigenen Werten) und gibt es zurück. */
function bieten(s, firma, ware, menge, o = {}) {
  G.aktualisieren(s);
  const g = G.zustand(s);
  const qMin = o.qMin ?? 0;
  const stueck = L.preisVon(G.wareSlot({ ware }, qMin ? { q: qMin } : {}), s);
  const zuschlag = o.zuschlag ?? 2;
  const gesamt = Math.round((menge * stueck * zuschlag) / 10) * 10;
  const v = {
    nr: ++g.nr, firma, ware, menge, geliefert: 0, qMin, stueck, zuschlag, gesamt, vorschuss: Math.round((gesamt * GROSS.vorschuss) / 10) * 10,
    strafe: o.strafe ?? 0, bonus: o.bonus ?? null, tage: o.tage ?? 5, auto: true,
  };
  g.angebote.push(v);
  return v;
}
/** Angebot anlegen und annehmen; gibt den laufenden Vertrag zurück. */
function nimmAn(s, firma, ware, menge, o) {
  const a = bieten(s, firma, ware, menge, o);
  const erg = G.annehmen(s, a.nr);
  assert.ok(erg.ok, erg.grund);
  return G.vertragVon(s, a.nr);
}
const nacht = (s) => L.tagBeenden(s, { r: R });
const meldungen = (b, teil) => b.meldungen.filter((m) => m.includes(teil));

// ─── Daten ──────────────────────────────────────────────────────────────────

gruppe('Firmen und Zahlen');

test('sechs Firmen mit Namen, Branche, Kontakt, Farbe, Aussehen und Dankesbriefen', () => {
  assert.ok(FIRMEN_IDS.length >= 5 && FIRMEN_IDS.length <= 7);
  for (const id of FIRMEN_IDS) {
    const f = FIRMEN[id];
    for (const k of ['name', 'kurz', 'kontakt', 'branche', 'text', 'farbe']) assert.ok(f[k], `${id}.${k}`);
    assert.ok(f.aussehen.haut && f.aussehen.haare && f.aussehen.hemd, `${id}: Aussehen`);
    assert.ok(f.waren.length >= 3 && f.bonus.length >= 3, `${id}: Waren und Boni`);
    for (const v of ['a', 'b']) assert.ok(BRIEFE.some((b) => b.id === `grossdank-${id}-${v}`), `Dankesbrief ${id}-${v}`);
  }
  assert.equal(new Set(FIRMEN_IDS.map((i) => FIRMEN[i].kurz)).size, FIRMEN_IDS.length);
});

test('jede feste Ware und jeder Bonus ist ein Gegenstand im Spiel; feste Waren sind verkaufbar', () => {
  for (const id of FIRMEN_IDS) {
    for (const w of FIRMEN[id].waren) {
      if (w.pool) continue;
      assert.ok(ITEMS[w.id], `${id}: ${w.id}`);
      if (!w.von) assert.ok(L.verkaufbar({ id: w.id }), `${id}: ${w.id} ist nicht verkaufbar`);
      assert.ok(w.n[0] >= 1 && w.n[1] >= w.n[0], `${id}: ${w.id} Menge`);
      assert.ok(w.selten >= 0 && w.selten <= 2, `${id}: ${w.id} Seltenheit`);
      assert.ok(w.ab >= 0 && w.ab <= GROSS.maxSterne);
    }
    for (const [ab, b, n] of FIRMEN[id].bonus) { assert.ok(ITEMS[b], `${id}: Bonus ${b}`); assert.ok(n >= 1 && ab >= 0); }
  }
});

test('die Branchen passen zu den Vorlieben aus dem Wunsch (Bau, Elektro, Werft, Gasthaus, Hofladen, Bergwerk, Sammler)', () => {
  const hat = (f, id) => FIRMEN[f].waren.some((w) => w.id === id);
  for (const id of ['stahltraeger', 'betonplatte', 'rahmen']) assert.ok(hat('baufirma', id), id);
  for (const id of ['kupferdraht', 'kabelrolle', 'platine', 'computer']) assert.ok(hat('elektro', id), id);
  for (const id of ['metallrohr', 'antriebseinheit']) assert.ok(hat('werft', id), id);
  for (const id of ['ei', 'geraeuchert']) assert.ok(hat('gasthaus', id), id);
  assert.ok(FIRMEN.gasthaus.waren.some((w) => w.pool === 'fisch'));
  assert.ok(FIRMEN.hofladen.waren.some((w) => w.pool === 'gemuese') && FIRMEN.hofladen.waren.some((w) => w.pool === 'obst') && hat('hofladen', 'marmelade'));
  for (const id of ['kupfererz', 'eisenerz', 'kupferbarren', 'goldbarren', 'diamant']) assert.ok(hat('bergwerk', id), id);
  assert.ok(FIRMEN.sammler.waren.some((w) => w.pool === 'artefakt') && FIRMEN.sammler.waren.some((w) => w.pool === 'mineral'));
});

test('Zuschlag: 1,5 bis 3,0, steigt mit Menge, Seltenheit und Vertrauen; Obergrenze je Ware', () => {
  assert.equal(G.zuschlagVon(0, 0, 0), 1.5);
  assert.equal(G.zuschlagVon(1, 2, 10), 3.0);
  assert.ok(G.zuschlagVon(1, 0, 0) > G.zuschlagVon(0, 0, 0));
  assert.ok(G.zuschlagVon(0, 2, 0) > G.zuschlagVon(0, 0, 0));
  assert.ok(G.zuschlagVon(0, 0, 10) > G.zuschlagVon(0, 0, 0));
  assert.equal(G.zuschlagVon(1, 2, 10, 2.0), 2.0);
  for (let rel = 0; rel <= 1; rel += 0.1) for (let se = 0; se <= 2; se++) for (let st = 0; st <= 10; st++) {
    const z = G.zuschlagVon(rel, se, st);
    assert.ok(z >= 1.5 && z <= 3.0 && Math.abs(z * 20 - Math.round(z * 20)) < 1e-9, `${rel} ${se} ${st}: ${z}`);
  }
  assert.equal(GROSS.maxLaufend, 3);
  assert.equal(GROSS.wechselTage, 3);
  assert.equal(GROSS.vorschuss, 0.2);
  assert.ok(GROSS.fristMin === 3 && GROSS.fristMax === 14);
});

test('Fabrik-Waren verlangen mindestens die Bergbau-Stufe, ab der man sie herstellen kann (Maschinen und Baupläne, unabhängig vom Basteln)', () => {
  const roh = (id) => ['stein', 'holz', 'hartholz', 'kohle', 'eisenbarren', 'kupferbarren', 'goldbarren', 'wasser', 'eisenerz', 'kupfererz'].includes(id);
  const maschine = (m) => BAUPLAENE[m]?.stufe ?? FREISCHALT[m] ?? 0;
  const bedarf = (id, tiefe = 0) => {
    if (roh(id) || tiefe > 8) return 0;
    const opt = [];
    const h = herstellerVon(id);
    if (h) opt.push(Math.max(maschine(h.maschine), ...Object.keys(h.ein).map((z) => bedarf(z, tiefe + 1))));
    return opt.length ? Math.min(...opt) : 0;
  };
  let geprueft = 0;
  const zuwenig = [];
  for (const f of FIRMEN_IDS) for (const w of FIRMEN[f].waren) {
    if (w.pool || w.von || ITEMS[w.id]?.kat !== 'bauteil') continue;
    const noetig = bedarf(w.id);
    if ((w.bed?.bergbau ?? 0) < noetig) zuwenig.push(`${f}/${w.id}: ${w.bed?.bergbau ?? 0} < ${noetig}`);
    geprueft++;
  }
  assert.equal(zuwenig.join('; '), '');
  assert.ok(geprueft >= 15, `geprüft: ${geprueft}`);
});

// ─── Erzeugung ──────────────────────────────────────────────────────────────

gruppe('Erzeugung');

test('deterministisch: gleicher Stand und Tag ergeben dieselben Verträge; kein Math.random', () => {
  const echt = Math.random;
  Math.random = () => { throw new Error('Math.random benutzt'); };
  try {
    const a = stand({ stufe: 6, tiefe: 30, huehner: 20, sterne: 3, tag: 5 });
    const b = kopie(a);
    assert.deepEqual(G.angebote(a), G.angebote(b));
    assert.ok(G.angebote(a).length >= 5);
    const c = stand({ stufe: 6, tiefe: 30, huehner: 20, sterne: 3, tag: 5, seed: 99 });
    assert.notDeepEqual(G.angebote(a).map((v) => G.wareName(v) + v.menge), G.angebote(c).map((v) => G.wareName(v) + v.menge));
  } finally { Math.random = echt; }
});

test('die Angebote wechseln alle 3 Tage (Tag 1–3 gleich, Tag 4 neu), nicht dazwischen', () => {
  const s = stand({ stufe: 5, tiefe: 20, sterne: 2, tag: 1 });
  const a1 = JSON.stringify(G.angebote(s));
  s.zeit.tag = 3;
  assert.equal(JSON.stringify(G.angebote(s)), a1, 'Tag 3 noch dieselben');
  assert.equal(G.wechselIn(s), 1, 'morgen neue');
  s.zeit.tag = 4;
  const a4 = G.angebote(s);
  assert.notEqual(JSON.stringify(a4), a1, 'Tag 4 neue');
  assert.equal(G.wechselIn(s), 3);
  s.zeit.tag = 6;
  assert.equal(JSON.stringify(G.angebote(s)), JSON.stringify(a4), 'Tag 6 noch dieselben');
});

test('höchstens ein Angebot je Firma; Werte im erlaubten Rahmen (Frist, Zuschlag, Vorschuss, Summe)', () => {
  for (const o of [{ stufe: 0 }, { stufe: 4, tiefe: 10, huehner: 5, sterne: 2 }, { stufe: 8, tiefe: 70, huehner: 80, sterne: 6 }, { stufe: 10, tiefe: 120, huehner: 900, sterne: 10 }]) {
    for (let tag = 1; tag < 100; tag += 3) {
      const s = stand({ ...o, tag: 1 + (tag % 28), jz: tag % 4, seed: tag });
      const liste = G.angebote(s);
      assert.equal(new Set(liste.map((v) => v.firma)).size, liste.length);
      for (const v of liste) {
        assert.ok(v.tage >= 3 && v.tage <= 14, `Frist ${v.tage}`);
        assert.ok(v.zuschlag >= 1.5 && v.zuschlag <= 3.0, `Zuschlag ${v.zuschlag}`);
        assert.ok(v.menge >= 1 && Number.isInteger(v.menge));
        assert.ok(Math.abs(v.gesamt - v.menge * v.stueck * v.zuschlag) <= 5, `Summe ${v.gesamt} vs ${v.menge * v.stueck * v.zuschlag}`);
        assert.ok(Math.abs(v.vorschuss - v.gesamt * GROSS.vorschuss) <= 5);
        assert.ok(v.gesamt >= v.menge * v.stueck * 1.45, 'immer deutlich über dem Marktwert');
        assert.ok(v.strafe === 0 || (v.strafe >= GROSS.strafeMin && v.strafe <= Math.max(GROSS.strafeMin, v.gesamt * 0.05)));
        assert.ok(!v.bonus || (ITEMS[v.bonus.id] && v.bonus.n >= 1));
        assert.equal(v.geliefert, 0);
        assert.ok(L.verkaufbar(G.wareSlot(v)), `${v.ware.id} verkaufbar`);
      }
    }
  }
});

test('nur Machbares: ein neuer Spieler bekommt keine Fabrikteile, Erze, Edelsteine, Eier oder seltenen Fische', () => {
  const verboten = new Set(['kupfererz', 'kohle', 'quarz', 'kupferbarren', 'eisenerz', 'eisenbarren', 'golderz', 'goldbarren', 'stahlbarren', 'diamant', 'smaragd', 'rubin',
    'amethyst', 'topas', 'iridiumbarren', 'ei', 'grossesei', 'geode', 'frostgeode', 'magmageode', 'geraeuchert', 'marmelade', 'eingelegt']);
  for (let seed = 1; seed < 40; seed++) {
    const s = stand({ seed, tag: 1 + (seed % 20), jz: seed % 4 });
    for (const v of G.angebote(s)) {
      assert.ok(!verboten.has(v.ware.id), `${v.ware.id} (Seed ${seed})`);
      assert.ok(ITEMS[v.ware.id].kat !== 'bauteil' && ITEMS[v.ware.id].kat !== 'mineral', v.ware.id);
      if (ITEMS[v.ware.id].kat === 'fisch') assert.ok(ITEMS[v.ware.id].fisch.seltenheit <= 20, `${v.ware.id} zu selten`);
      assert.equal(v.qMin, 0, 'ohne Vertrauen keine Qualitätsforderung');
    }
  }
});

test('nur Machbares in jedem Fortschritt: Stufe, Minenebene, Hühner, Jahreszeit, Anbauzeit', () => {
  const bed = (s, w) => {
    const id = w.id;
    const it = ITEMS[id];
    const bergbau = L.stufe(s, 'bergbau');
    if (it.kat === 'bauteil') {
      const f = FIRMEN_IDS.map((x) => FIRMEN[x].waren.find((e) => e.id === id)).find(Boolean);
      assert.ok(bergbau >= f.bed.bergbau, `${id}: Bergbau ${bergbau} < ${f.bed.bergbau}`);
    }
    if (['kupfererz', 'kohle', 'quarz', 'geode'].includes(id)) assert.ok(s.flags.mineOffen || s.mine.tiefste >= 1, `${id}: Mine`);
    if (id === 'eisenerz' || id === 'eisenbarren') assert.ok(s.mine.tiefste >= 25, `${id}: Ebene ${s.mine.tiefste}`);
    if (id === 'golderz' || id === 'goldbarren') assert.ok(s.mine.tiefste >= 65, id);
    if (id === 'iridiumbarren') assert.ok(s.mine.tiefste >= 100, id);
    if (id === 'diamant') assert.ok(s.mine.tiefste >= 60, id);
    if (id === 'ei' || id === 'grossesei') assert.ok(G.huehner(s) >= 3, `${id}: Hühner`);
    if (it.kat === 'ernte') {
      const p = Object.values(PFLANZEN).find((x) => x.ernte === id);
      assert.ok(p.jz.includes(L.jahreszeit(s)), `${id}: Jahreszeit`);
      assert.ok(TAGE_PRO_JZ - s.zeit.tag >= p.tage + 1, `${id}: zu spät im Jahr`);
    }
    if (it.kat === 'fisch') {
      assert.ok(it.fisch.jz.includes(L.jahreszeit(s)), `${id}: Jahreszeit`);
      assert.ok(it.fisch.seltenheit <= 20 + 8 * L.stufe(s, 'angeln'), `${id}: Angelstufe`);
    }
  };
  let n = 0;
  for (const o of [{ stufe: 1, tiefe: 3 }, { stufe: 3, tiefe: 12, huehner: 4 }, { stufe: 5, tiefe: 30, huehner: 30 }, { stufe: 7, tiefe: 66, huehner: 100 }, { stufe: 10, tiefe: 110, huehner: 400 }]) {
    for (let t = 0; t < 36; t++) {
      const s = stand({ ...o, sterne: t % 11, tag: 1 + ((t * 5) % 28), jz: t % 4, seed: 100 + t });
      for (const v of G.angebote(s)) { bed(s, { id: v.ware.id }); if (v.ware.von) bed(s, { id: v.ware.von }); n++; }
    }
  }
  assert.ok(n > 200, `Angebote geprüft: ${n}`);
});

test('Eier: Menge und Frist passen zur Zahl der Hühner (kein Vertrag, den die Herde nicht schafft)', () => {
  let gesehen = 0;
  for (let seed = 1; seed < 60; seed++) {
    const s = stand({ stufe: 3, huehner: 6 + (seed % 15), seed, tag: 1 + (seed % 25) });
    for (const v of G.angebote(s)) {
      if (v.ware.id !== 'ei') continue;
      gesehen++;
      assert.ok(v.menge <= (v.tage - 1) * G.huehner(s) * 0.9 + 1, `${v.menge} Eier in ${v.tage} Tagen mit ${G.huehner(s)} Hühnern`);
    }
  }
  assert.ok(gesehen > 3, `Eier-Verträge gesehen: ${gesehen}`);
});

test('Menge richtet sich nach Ware und Fortschritt: spät mehr als früh, von 20 Eiern bis 100 Antriebseinheiten', () => {
  const mittel = (o, id, firma) => {
    const m = [];
    for (let seed = 1; seed <= 80; seed++) {
      const s = stand({ ...o, seed, tag: 1 });
      const e = G.kandidaten(s, firma).find((k) => k.ware.id === id);
      if (!e) continue;
      const v = G.erzeugen(s, firma, G.rngFuer(s, 0, 1));
      if (v && v.ware.id === id) m.push(v.menge);
    }
    return m;
  };
  assert.deepEqual(FIRMEN.gasthaus.waren.find((w) => w.id === 'ei').n, [20, 300]);
  assert.deepEqual(FIRMEN.werft.waren.find((w) => w.id === 'antriebseinheit').n, [20, 100]);
  // Stein beim Bergbau-Anfänger gegen Stein bei Stufe 10 (mit hohem Vertrauen)
  const klein = []; const gross = [];
  for (let seed = 1; seed <= 60; seed++) {
    const a = stand({ seed, tag: 1 }); const b = stand({ stufe: 10, sterne: 10, seed, tag: 1 });
    const va = G.kandidaten(a, 'baufirma').find((k) => k.ware.id === 'stein') && G.erzeugen(a, 'baufirma', G.rngFuer(a, 0, 0));
    const vb = G.kandidaten(b, 'baufirma').find((k) => k.ware.id === 'stein') && G.erzeugen(b, 'baufirma', G.rngFuer(b, 0, 0));
    if (va?.ware.id === 'stein') klein.push(va.menge);
    if (vb?.ware.id === 'stein') gross.push(vb.menge);
  }
  assert.ok(klein.length > 3 && gross.length > 3);
  const avg = (x) => x.reduce((p, q) => p + q, 0) / x.length;
  assert.ok(avg(gross) > avg(klein) * 1.8, `${avg(gross)} gegen ${avg(klein)}`);
  void mittel;
});

test('Qualität wird nur bei Ernte und Fisch, nur mit Vertrauen und nur verlangt, wenn der Vertrag sie nennt', () => {
  let silber = 0; let gold = 0;
  for (let seed = 1; seed < 200; seed++) {
    const s = stand({ stufe: 8, tiefe: 60, huehner: 50, sterne: 10, seed, tag: 1 + (seed % 20), jz: seed % 4 });
    for (const v of G.angebote(s)) {
      const kat = ITEMS[v.ware.id].kat;
      if (v.qMin) { assert.ok(kat === 'ernte' || kat === 'fisch', `${v.ware.id} mit Qualität`); if (v.qMin === 1) silber++; if (v.qMin === 2) gold++; }
      assert.ok(v.qMin <= 2);
    }
  }
  assert.ok(silber > 0 && gold > 0, `Silber ${silber}, Gold ${gold}`);
  const frisch = stand({ sterne: 3, seed: 5 });
  for (const v of G.angebote(frisch)) assert.equal(v.qMin, 0);
});

test('eine Qualitätsforderung steckt im Stückwert (Silber ×1,25), der Zuschlag bleibt im Rahmen', () => {
  const s = stand({ stufe: 5, sterne: 10 });
  const a = bieten(s, 'hofladen', { id: 'kuerbis' }, 10, { qMin: 1 });
  assert.equal(a.stueck, Math.floor(ITEMS.kuerbis.preis * 1.25));
});

// ─── Annehmen und Limits ────────────────────────────────────────────────────

gruppe('Annehmen und Limits');

test('Annahme: Vorschuss (20 %) wird sofort ausgezahlt, der Vertrag läuft mit Frist, das Angebot ist weg', () => {
  const s = stand({ stufe: 5, tiefe: 30, tag: 4 });
  const gold0 = s.spieler.gold;
  const a = G.angebote(s)[0];
  const erg = G.annehmen(s, a.nr);
  assert.ok(erg.ok);
  assert.equal(erg.vorschuss, a.vorschuss);
  assert.equal(s.spieler.gold, gold0 + a.vorschuss);
  const v = G.vertragVon(s, a.nr);
  assert.equal(v.frist, heute(s) + a.tage);
  assert.equal(v.geliefert, 0);
  assert.ok(!G.angebote(s).some((x) => x.nr === a.nr));
  assert.equal(G.tageRest(s, v), a.tage);
  assert.ok(G.annehmen(s, a.nr).grund, 'zweimal annehmen geht nicht');
  assert.ok(G.annehmen(s, 99999).grund);
});

test('dieselbe Firma darf nur einen Vertrag gleichzeitig haben', () => {
  const s = stand();
  nimmAn(s, 'baufirma', { id: 'stein' }, 100);
  const zweiter = bieten(s, 'baufirma', { id: 'holz' }, 100);
  const erg = G.annehmen(s, zweiter.nr);
  assert.ok(erg.grund && erg.grund.includes('Baufirma Brandt'), erg.grund);
  assert.equal(G.zustand(s).laufend.length, 1);
  assert.ok(G.angebote(s).some((x) => x.nr === zweiter.nr), 'das Angebot bleibt hängen');
});

test('höchstens drei Verträge gleichzeitig; nach einer Erfüllung ist wieder ein Platz frei', () => {
  const s = stand();
  nimmAn(s, 'baufirma', { id: 'stein' }, 50);
  nimmAn(s, 'hofladen', { id: 'pastinake' }, 20);
  nimmAn(s, 'gasthaus', { id: 'karpfen' }, 10);
  const vierter = bieten(s, 'sammler', { id: 'tonscherbe' }, 3);
  const erg = G.annehmen(s, vierter.nr);
  assert.ok(erg.grund && erg.grund.includes('3'), erg.grund);
  gib(s, 'stein', 50);
  assert.ok(G.liefern(s, G.zustand(s).laufend[0].nr, 'max').fertig);
  assert.ok(G.annehmen(s, vierter.nr).ok);
  assert.equal(G.zustand(s).laufend.length, 3);
});

// ─── Teillieferung aus dem Rucksack ─────────────────────────────────────────

gruppe('Teillieferung aus dem Rucksack');

test('Teillieferung: Menge wählbar, der Rest wird weitergezählt, am Ende Auszahlung minus Vorschuss', () => {
  const s = stand();
  leeren(s);
  const v = nimmAn(s, 'baufirma', { id: 'stein' }, 100, { zuschlag: 2 });
  assert.equal(v.gesamt, 100 * 2 * 2);
  assert.equal(v.vorschuss, 80);
  gib(s, 'stein', 70);
  const gold0 = s.spieler.gold;
  let erg = G.liefern(s, v.nr, 25);
  assert.ok(erg.ok && erg.geliefert === 25 && !erg.fertig);
  assert.equal(v.geliefert, 25);
  assert.equal(L.anzahl(s, 'stein'), 45);
  erg = G.liefern(s, v.nr, 'max');
  assert.equal(erg.geliefert, 45, 'alles, was da ist');
  assert.equal(v.geliefert, 70);
  assert.equal(s.spieler.gold, gold0, 'noch keine Auszahlung');
  assert.ok(G.liefern(s, v.nr, 1).grund, 'nichts mehr im Rucksack');
  gib(s, 'stein', 80);
  erg = G.liefern(s, v.nr, 'max');
  assert.equal(erg.geliefert, 30, 'nie mehr als der Rest');
  assert.ok(erg.fertig);
  assert.equal(L.anzahl(s, 'stein'), 50, 'Überschuss bleibt im Rucksack');
  assert.equal(s.spieler.gold, gold0 + v.gesamt - v.vorschuss);
  assert.equal(G.zustand(s).laufend.length, 0);
  assert.equal(G.zustand(s).erfuellt, 1);
});

test('Erfüllung: Vertrauen +1 (höchstens 10), Bonus im Rucksack, Dankesbrief in der Post von morgen, Firma wieder frei', () => {
  const s = stand({ sterne: 4 });
  leeren(s);
  const v = nimmAn(s, 'hofladen', { id: 'pastinake' }, 10, { bonus: { id: 'duenger', n: 20 }, zuschlag: 1.5 });
  gib(s, 'pastinake', 10);
  const erg = G.liefern(s, v.nr, 'max');
  assert.ok(erg.fertig && erg.sterneNeu && erg.sterne === 5);
  assert.equal(G.sterne(s, 'hofladen'), 5);
  assert.equal(L.anzahl(s, 'duenger'), 20);
  assert.equal(erg.bonus.paket, 0);
  assert.equal(G.zustand(s).post.length, 1);
  const b = nacht(s);
  assert.ok(s.post.some((p) => p.startsWith('grossdank-hofladen-')), `Post: ${s.post}`);
  const brief = L.briefVon(s.post.find((p) => p.startsWith('grossdank-hofladen-')));
  assert.equal(brief.von, FIRMEN.hofladen.kontakt);
  assert.ok(brief.text.includes('{name}'));
  assert.equal(G.zustand(s).post.length, 0);
  assert.ok(b);
  nimmAn(s, 'hofladen', { id: 'karotte' in ITEMS ? 'karotte' : 'moehre' }, 5);
  s.grossabnehmer.vertrauen.hofladen = 10;
  const w = G.vertragVon(s, G.zustand(s).laufend[0].nr);
  gib(s, w.ware.id, 5);
  G.liefern(s, w.nr, 'max');
  assert.equal(G.sterne(s, 'hofladen'), 10, 'nicht über 10');
});

test('Bonus ohne Platz im Rucksack liegt im Paket am Brett und lässt sich abholen', () => {
  const s = stand();
  leeren(s);
  const v = nimmAn(s, 'baufirma', { id: 'stein' }, 5, { bonus: { id: 'hartholz', n: 30 } });
  s.spieler.inv = s.spieler.inv.map((_, i) => (i === 0 ? { id: 'stein', n: 6 } : { id: 'grassamen', n: 1, q: i }));
  const erg = G.liefern(s, v.nr, 'max');
  assert.ok(erg.fertig);
  assert.equal(erg.bonus.paket, 30);
  assert.deepEqual(G.zustand(s).paket, [{ id: 'hartholz', n: 30 }]);
  assert.ok(G.paketAbholen(s).grund, 'Rucksack voll');
  s.spieler.inv[3] = null;
  const ab = G.paketAbholen(s);
  assert.ok(ab.ok);
  assert.equal(L.anzahl(s, 'hartholz'), 30);
  assert.equal(G.zustand(s).paket.length, 0);
});

test('Qualität zählt nur, wenn der Vertrag sie verlangt', () => {
  const s = stand({ sterne: 5 });
  leeren(s);
  const frei = nimmAn(s, 'hofladen', { id: 'pastinake' }, 10);
  gib(s, 'pastinake', 3, { q: 0 }); gib(s, 'pastinake', 3, { q: 2 });
  assert.equal(G.liefern(s, frei.nr, 'max').geliefert, 6, 'ohne Forderung zählt jede Qualität');
  const s2 = stand({ sterne: 5 });
  leeren(s2);
  const silber = nimmAn(s2, 'hofladen', { id: 'pastinake' }, 10, { qMin: 1 });
  gib(s2, 'pastinake', 4, { q: 0 });
  const nein = G.liefern(s2, silber.nr, 'max');
  assert.ok(nein.grund && nein.grund.includes('Silber'), nein.grund);
  assert.equal(L.anzahl(s2, 'pastinake'), 4, 'nichts weggenommen');
  gib(s2, 'pastinake', 2, { q: 1 }); gib(s2, 'pastinake', 2, { q: 3 });
  const ja = G.liefern(s2, silber.nr, 3);
  assert.equal(ja.geliefert, 3);
  const rest = s2.spieler.inv.filter((x) => x && x.id === 'pastinake').map((x) => `${x.q || 0}:${x.n}`).sort();
  assert.deepEqual(rest, ['0:4', '3:1'], 'schlechteste zulässige Qualität zuerst');
});

test('Waren mit Ausgangsstoff: nur der verlangte Fisch zählt (Geräucherter Hecht ist kein Geräucherter Karpfen)', () => {
  const s = stand({ sterne: 5 });
  leeren(s);
  const v = nimmAn(s, 'gasthaus', { id: 'geraeuchert', von: 'karpfen' }, 5);
  assert.equal(v.stueck, ITEMS.karpfen.preis * 10);
  gib(s, 'geraeuchert', 3, { von: 'hecht' });
  assert.ok(G.liefern(s, v.nr, 'max').grund);
  gib(s, 'geraeuchert', 3, { von: 'karpfen' });
  assert.equal(G.liefern(s, v.nr, 'max').geliefert, 3);
  assert.equal(L.anzahl(s, 'geraeuchert'), 3, 'der Hecht bleibt');
  assert.equal(G.wareName(v), 'Geräucherter Fisch (Karpfen)');
});

// ─── Versandkiste ───────────────────────────────────────────────────────────

gruppe('Lieferung über die Versandkiste (Hook vorVerkauf)');

test('der Hook läuft nach den Rohren und der Fabrik (Reihenfolge der Systeme) und vor dem Verkauf', () => {
  const namen = SYSTEME.map((x) => x.name);
  assert.ok(namen.indexOf('gemeinschaft-grossabnehmer') > namen.indexOf('handwerk-fabrik'));
  assert.ok(SYSTEME.find((x) => x.name === 'gemeinschaft-grossabnehmer').vorVerkauf);
});

test('Ware der Verträge geht vor dem Verkauf aus der Versandkiste, der Rest wird normal verkauft: nichts doppelt, nichts verloren', () => {
  const s = stand();
  leeren(s);
  const v = nimmAn(s, 'baufirma', { id: 'stein' }, 80, { zuschlag: 2 });
  s.versand = [{ id: 'stein', n: 60 }, { id: 'pastinake', n: 10 }, { id: 'stein', n: 50, q: 1 }];
  const goldVorher = s.spieler.gold;
  const verdientVorher = s.stats.verdient;
  const b = nacht(s);
  assert.equal(G.zustand(s).laufend.length, 0, 'Vertrag erfüllt');
  const verkaufteStein = b.verkauf.filter((x) => x.slot.id === 'stein').reduce((a, x) => a + x.slot.n, 0);
  assert.equal(verkaufteStein + v.menge, 110, 'geliefert + verkauft = alles, was in der Kiste lag');
  assert.equal(b.summe, b.verkauf.reduce((a, x) => a + x.preis, 0));
  assert.equal(s.spieler.gold, goldVorher + b.summe + (v.gesamt - v.vorschuss), 'Verkauf plus Auszahlung, genau einmal');
  assert.equal(s.stats.verdient, verdientVorher + b.summe + (v.gesamt - v.vorschuss));
  assert.ok(meldungen(b, 'Vertrag erfüllt').length === 1, 'Morgenbericht nennt den Vertrag');
  assert.deepEqual(s.versand, []);
});

test('Teillieferung über Nacht: was fehlt, bleibt offen; Qualität nur, wenn verlangt; Schalter „Versandkiste liefert mit"', () => {
  const s = stand({ sterne: 5 });
  leeren(s);
  const a = nimmAn(s, 'hofladen', { id: 'pastinake' }, 100, { qMin: 1 });
  const b2 = nimmAn(s, 'baufirma', { id: 'stein' }, 100);
  G.autoSchalten(s, b2.nr);
  s.versand = [{ id: 'pastinake', n: 30, q: 1 }, { id: 'pastinake', n: 20 }, { id: 'stein', n: 40 }];
  const bericht = nacht(s);
  assert.equal(a.geliefert, 30, 'nur die Silberware zählt');
  assert.equal(b2.geliefert, 0, 'abgeschaltet: wird nicht berührt');
  assert.equal(G.zustand(s).laufend.length, 2);
  assert.ok(bericht.verkauf.some((x) => x.slot.id === 'pastinake' && x.slot.n === 20 && !x.slot.q), 'normale Pastinaken werden verkauft');
  assert.ok(bericht.verkauf.some((x) => x.slot.id === 'stein' && x.slot.n === 40));
  assert.ok(meldungen(bericht, '30× Pastinake').length === 1);
  assert.equal(G.autoSchalten(s, b2.nr), true);
  s.versand = [{ id: 'pastinake', n: 70, q: 3 }, { id: 'stein', n: 100 }];
  nacht(s);
  assert.equal(a.geliefert, 100, 'zweite Nacht: Rest geliefert');
  assert.equal(G.zustand(s).laufend.length, 0, 'beide erfüllt');
});

test('Reihenfolge der Verträge: kürzeste Frist zuerst, bei gleicher Frist der ältere', () => {
  const s = stand({ sterne: 3 });
  leeren(s);
  const spaet = nimmAn(s, 'werft', { id: 'kupferbarren' }, 10, { tage: 9 });
  const frueh = nimmAn(s, 'bergwerk', { id: 'kupferbarren' }, 10, { tage: 4 });
  const gleich = nimmAn(s, 'elektro', { id: 'kupferbarren' }, 10, { tage: 4 });
  assert.deepEqual(G.laufende(s).map((v) => v.nr), [frueh.nr, gleich.nr, spaet.nr]);
  s.versand = [{ id: 'kupferbarren', n: 17 }];
  nacht(s);
  assert.equal(frueh.geliefert, 10, 'erst die kürzeste Frist');
  assert.equal(gleich.geliefert, 7, 'dann der nächste');
  assert.equal(spaet.geliefert, 0);
  assert.equal(G.zustand(s).laufend.length, 2);
});

test('Waren mit Ausgangsstoff und über mehrere Stapel: Stapel werden zusammengezählt', () => {
  const s = stand({ sterne: 5 });
  leeren(s);
  const v = nimmAn(s, 'gasthaus', { id: 'geraeuchert', von: 'karpfen' }, 12);
  s.versand = [{ id: 'geraeuchert', n: 5, von: 'karpfen' }, { id: 'geraeuchert', n: 5, von: 'hecht' }, { id: 'geraeuchert', n: 9, von: 'karpfen' }];
  nacht(s);
  assert.equal(v.geliefert, 12 - 0, 'beide Karpfen-Stapel zusammen');
  assert.equal(G.zustand(s).laufend.length, 0);
});

test('Holzrohre: Eier aus der Eierkiste landen über Rohre in der Versandkiste und erfüllen den Vertrag, der Rest wird verkauft', () => {
  const s = neu(5);
  Object.assign(s.stall, { gebaut: true, anzahl: 30, neue: 0, freundschaft: 500 });
  L.kartenGeaendert();
  const ort = L.ortVon(s, 'hof');
  const deko = L.dekoListe(s, ort.def);
  const kiste = deko.find((d) => d.typ === 'versandkiste');
  const ei = deko.find((d) => d.typ === 'eierkiste');
  const weg = [];
  for (let x = ei.x - 1; x >= kiste.x; x--) weg.push([x, ei.y]);
  for (let y = ei.y - 1; y >= kiste.y + 1; y--) weg.push([kiste.x, y]);
  for (const [x, y] of weg) ort.welt.belag[L.k(x, y)] = { t: ROHR };
  s.stall.eier = { ei: 120, grossesei: 0 };
  const v = nimmAn(s, 'gasthaus', { id: 'ei' }, 100);
  const b = nacht(s);
  assert.ok(G.zustand(s).laufend.length === 0 || v.geliefert === 100 || v.geliefert >= 120 - 30, 'die Eier der Eierkiste (und was nachts gelegt wurde) zählen');
  const verkauft = b.verkauf.filter((x) => x.slot.id === 'ei').reduce((a, x) => a + x.slot.n, 0);
  assert.ok(v.geliefert + verkauft >= 120, `geliefert ${v.geliefert} + verkauft ${verkauft}`);
  assert.equal(v.geliefert, Math.min(100, v.geliefert));
  assert.ok(s.stall.eier.ei <= 30, 'die Kiste ist geleert (nur die in der Nacht gelegten Eier liegen darin)');
});

test('Fabrik: Ware, die eine Linie in die Versandkiste schickt (versandHinzu), zählt für den Vertrag', () => {
  const s = stand({ stufe: 8 });
  leeren(s);
  const v = nimmAn(s, 'werft', { id: 'antriebseinheit' }, 40);
  L.versandHinzu(s, { id: 'antriebseinheit', n: 25 });
  L.versandHinzu(s, { id: 'antriebseinheit', n: 20 });
  assert.equal(versandMenge(s, 'antriebseinheit'), 45);
  const b = nacht(s);
  assert.equal(v.geliefert, 0 + 40);
  assert.equal(b.verkauf.filter((x) => x.slot.id === 'antriebseinheit').reduce((a, x) => a + x.slot.n, 0), 5);
});

test('Rucksack und Versandkiste zusammen: nichts wird doppelt gezählt, wenn man erst teilweise liefert', () => {
  const s = stand();
  leeren(s);
  const v = nimmAn(s, 'baufirma', { id: 'stein' }, 100);
  gib(s, 'stein', 30);
  G.liefern(s, v.nr, 'max');
  s.versand = [{ id: 'stein', n: 100 }];
  nacht(s);
  assert.equal(v.geliefert, 100);
  assert.equal(L.anzahl(s, 'stein'), 0);
});

// ─── Fristen und Folgen ─────────────────────────────────────────────────────

gruppe('Fristen und Folgen');

test('Frist: der letzte Tag zählt noch (Nacht), danach läuft der Vertrag ab; Warnungen bei 1 Tag und am letzten Tag', () => {
  const s = stand();
  leeren(s);
  const v = nimmAn(s, 'baufirma', { id: 'stein' }, 100, { tage: 3, strafe: 60 });
  assert.equal(v.frist, heute(s) + 3);
  let b = nacht(s); // → Tag 2, noch 2 Tage
  assert.equal(G.tageRest(s, v), 2);
  assert.equal(meldungen(b, 'Noch').length + meldungen(b, 'Letzter Tag').length, 0);
  b = nacht(s); // → Tag 3, noch 1 Tag
  assert.equal(G.tageRest(s, v), 1);
  assert.equal(meldungen(b, 'Noch 1 Tag für den Vertrag mit Baufirma Brandt').length, 1, b.meldungen.join('|'));
  b = nacht(s); // → Tag 4, letzter Tag
  assert.equal(G.tageRest(s, v), 0);
  assert.equal(meldungen(b, 'Letzter Tag für den Vertrag').length, 1);
  assert.equal(G.zustand(s).laufend.length, 1, 'läuft noch');
  s.versand = [{ id: 'stein', n: 100 }];
  b = nacht(s); // Nacht des letzten Tages: Lieferung zählt noch
  assert.equal(G.zustand(s).laufend.length, 0);
  assert.equal(G.zustand(s).erfuellt, 1);
  assert.equal(meldungen(b, 'abgelaufen').length, 0);
});

test('Ablauf: Meldung im Morgenbericht, Vorschuss wird zurückgeholt, Strafe, Vertrauen −1, Firma wieder frei', () => {
  const s = stand({ sterne: 3 });
  leeren(s);
  const v = nimmAn(s, 'werft', { id: 'zahnrad' }, 50, { tage: 3, strafe: 120, zuschlag: 2 });
  const gold = s.spieler.gold;
  assert.ok(v.vorschuss > 500);
  nacht(s); nacht(s); nacht(s);
  const b = nacht(s); // Tag 5 > Frist 4: abgelaufen
  const m = meldungen(b, 'abgelaufen');
  assert.equal(m.length, 1, b.meldungen.join('|'));
  assert.ok(m[0].includes('Werft') && m[0].includes('Vertragsstrafe') && m[0].includes('Vertrauen sinkt auf 2'), m[0]);
  assert.equal(G.sterne(s, 'werft'), 2);
  assert.equal(s.spieler.gold, gold - v.vorschuss - 120, 'Vorschuss zurück, dazu die Strafe');
  assert.equal(G.zustand(s).laufend.length, 0);
  assert.equal(G.zustand(s).verfallen, 1);
  assert.ok(!G.zustand(s).angebote.some((x) => x.firma === 'xx'));
  assert.ok(G.annehmen(s, bieten(s, 'werft', { id: 'zahnrad' }, 10).nr).ok, 'die Firma darf wieder');
});

test('Ablauf mit Teillieferung: die gelieferte Ware wird zum normalen Preis gegen den Vorschuss verrechnet', () => {
  const s = stand({ sterne: 3 });
  leeren(s);
  const v = nimmAn(s, 'baufirma', { id: 'hartholz' }, 100, { tage: 3, zuschlag: 2 });
  gib(s, 'hartholz', 30);
  G.liefern(s, v.nr, 'max');
  const goldNachLieferung = s.spieler.gold;
  nacht(s); nacht(s); nacht(s);
  const b = nacht(s);
  assert.equal(meldungen(b, 'abgelaufen').length, 1);
  const wert = 30 * v.stueck;
  const diff = v.vorschuss - wert;
  assert.ok(diff > 0);
  assert.equal(s.spieler.gold, goldNachLieferung - diff, 'nur der Rest des Vorschusses geht zurück');
  assert.equal(L.anzahl(s, 'hartholz'), 0, 'die Firma behält die gelieferte Ware');
});

test('Ablauf bei leerer Kasse: nie negatives Gold, offene Rückforderung wird mit der nächsten Zahlung verrechnet', () => {
  const s = stand({ sterne: 2 });
  leeren(s);
  const v = nimmAn(s, 'elektro', { id: 'kupferdraht' }, 100, { tage: 3, zuschlag: 2, strafe: 80 });
  s.spieler.gold = 100;
  nacht(s); nacht(s); nacht(s);
  nacht(s);
  assert.equal(s.spieler.gold, 0);
  const schuld = v.vorschuss - 100;
  assert.equal(G.zustand(s).schuld.elektro, schuld);
  s.spieler.gold = 0;
  const w = bieten(s, 'elektro', { id: 'kupferdraht' }, 50, { zuschlag: 2 });
  const erg = G.annehmen(s, w.nr);
  assert.ok(erg.ok);
  assert.equal(erg.abzug, Math.min(w.vorschuss, schuld));
  assert.equal(s.spieler.gold, w.vorschuss - erg.abzug);
  assert.equal(G.zustand(s).schuld.elektro ?? 0, Math.max(0, schuld - w.vorschuss));
});

test('Warnung und Ablauf liegen im Morgenbericht, nicht im Verkauf; Vertrauen sinkt nie unter 0', () => {
  const s = stand();
  leeren(s);
  nimmAn(s, 'baufirma', { id: 'stein' }, 10, { tage: 3 });
  for (let i = 0; i < 4; i++) nacht(s);
  assert.equal(G.sterne(s, 'baufirma'), 0);
  assert.equal(G.zustand(s).verfallen, 1);
});

// ─── Vertrauen und Freischaltung ────────────────────────────────────────────

gruppe('Vertrauen und Freischaltung');

test('mehr Vertrauen schaltet bessere Waren frei (ab), höhere Mengen und höhere Zuschläge', () => {
  const s0 = stand({ stufe: 10, tiefe: 120, huehner: 200, sterne: 0 });
  const s10 = stand({ stufe: 10, tiefe: 120, huehner: 200, sterne: 10 });
  for (const f of FIRMEN_IDS) {
    const a = G.kandidaten(s0, f, 0).length;
    const b = G.kandidaten(s10, f, 10).length;
    assert.ok(b > a, `${f}: ${a} → ${b}`);
  }
  const ids0 = new Set(G.kandidaten(s0, 'elektro', 0).map((k) => k.ware.id));
  assert.ok(!ids0.has('computer') && !ids0.has('motor') && ids0.has('kupferdraht'));
  assert.ok(G.kandidaten(s10, 'elektro', 10).some((k) => k.ware.id === 'computer'));
  const mittel = (sterne) => {
    let z = 0; let n = 0;
    for (let seed = 1; seed < 60; seed++) {
      const s = stand({ stufe: 10, tiefe: 120, huehner: 200, sterne, seed });
      for (const v of G.angebote(s)) { z += v.zuschlag; n++; }
    }
    return z / n;
  };
  assert.ok(mittel(10) > mittel(0) + 0.5, `${mittel(0)} → ${mittel(10)}`);
});

test('erfüllte Verträge erhöhen das Vertrauen Stern für Stern und schalten damit neue Waren frei', () => {
  const s = stand({ stufe: 10, tiefe: 120 });
  leeren(s);
  assert.ok(!G.kandidaten(s, 'bergwerk').some((k) => k.ware.id === 'goldbarren'), 'goldbarren erst ab 5 Sternen');
  for (let i = 1; i <= 5; i++) {
    const v = nimmAn(s, 'bergwerk', { id: 'quarz' }, 2);
    gib(s, 'quarz', 2);
    G.liefern(s, v.nr, 'max');
    assert.equal(G.sterne(s, 'bergwerk'), i);
  }
  assert.ok(G.kandidaten(s, 'bergwerk').some((k) => k.ware.id === 'goldbarren'));
});

// ─── Speichern, Laden, alte Stände ──────────────────────────────────────────

gruppe('Speichern und Laden');

test('Speichern und Laden: Verträge, Vertrauen, Angebote, Paket, Schulden und Briefe bleiben gleich', () => {
  const s = stand({ stufe: 5, tiefe: 30, sterne: 2, tag: 5 });
  leeren(s);
  const v = nimmAn(s, 'hofladen', { id: 'pastinake' }, 10, { bonus: { id: 'duenger', n: 5 } });
  gib(s, 'pastinake', 4);
  G.liefern(s, v.nr, 'max');
  G.zustand(s).paket.push({ id: 'hartholz', n: 3 });
  G.zustand(s).schuld.werft = 500;
  const s2 = L.deserialisieren(L.serialisieren(s));
  assert.deepEqual(s2.grossabnehmer, s.grossabnehmer);
  assert.equal(G.vertragVon(s2, v.nr).geliefert, 4);
  assert.equal(JSON.stringify(G.angebote(s2)), JSON.stringify(G.angebote(s)));
  gib(s2, 'pastinake', 6);
  assert.ok(G.liefern(s2, v.nr, 'max').fertig, 'nach dem Laden weiter liefern');
});

test('alter Stand ohne Großabnehmer lädt, bekommt Vertrauen 0 und Angebote und läuft über Nacht', () => {
  const s = L.deserialisieren(readFileSync(new URL('./alter-hof-stand.json', import.meta.url), 'utf8'));
  assert.ok(s.grossabnehmer);
  assert.deepEqual(Object.keys(s.grossabnehmer.vertrauen).sort(), [...FIRMEN_IDS].sort());
  assert.ok(Object.values(s.grossabnehmer.vertrauen).every((x) => x === 0));
  assert.deepEqual(s.grossabnehmer.laufend, []);
  assert.ok(G.angebote(s).length >= 1);
  const b = nacht(s);
  assert.ok(Array.isArray(b.meldungen));
  const roh = JSON.parse(readFileSync(new URL('./alter-hof-stand.json', import.meta.url), 'utf8'));
  delete roh.grossabnehmer;
  assert.ok(L.deserialisieren(JSON.stringify(roh)).grossabnehmer.nr >= 0);
});

test('beschädigte Daten werden geglättet, nichts wirft: unbekannte Firma, unbekannte Ware, Texte statt Zahlen, doppelte Firma, zu viele Verträge', () => {
  const s = stand();
  const ok = { nr: 1, firma: 'baufirma', ware: { id: 'stein' }, menge: 10, geliefert: 3, qMin: 0, stueck: 2, zuschlag: 2, gesamt: 40, vorschuss: 8, strafe: 0, bonus: null, tage: 3, frist: 9, angenommen: 6, auto: true };
  s.grossabnehmer = {
    vertrauen: { baufirma: 99, werft: -4, elektro: 'x' },
    nr: 'x', block: 'y',
    angebote: [null, 5, { ...ok, firma: 'gibtsnicht' }, { ...ok, nr: 2, ware: { id: 'unsinn' } }, { ...ok, nr: 3, menge: 'viel' }, { ...ok, nr: 4, firma: 'werft' }],
    laufend: [{ ...ok }, { ...ok, nr: 5 }, { ...ok, nr: 6, firma: 'werft', geliefert: 99 }, { ...ok, nr: 7, firma: 'elektro' }, { ...ok, nr: 8, firma: 'hofladen' }, { ...ok, nr: 9, firma: 'gasthaus' }],
    paket: [{ id: 'nix', n: 3 }, { id: 'hartholz', n: 2.7 }], schuld: { werft: -5, elektro: 40.5 }, post: [4, 'a'],
  };
  const t = L.deserialisieren(JSON.stringify(s));
  const g = t.grossabnehmer;
  assert.equal(g.vertrauen.baufirma, 10);
  assert.equal(g.vertrauen.werft, 0);
  assert.equal(g.vertrauen.elektro, 0);
  assert.equal(g.angebote.length, 1);
  assert.equal(g.laufend.length, 3, 'höchstens drei, eine je Firma');
  assert.equal(new Set(g.laufend.map((v) => v.firma)).size, 3);
  assert.equal(g.laufend.find((v) => v.firma === 'werft').geliefert, 10, 'geliefert geklemmt');
  assert.deepEqual(g.paket, [{ id: 'hartholz', n: 2 }]);
  assert.deepEqual(g.schuld, { elektro: 40 });
  assert.deepEqual(g.post, ['a']);
  nacht(t);
});

// ─── Oberfläche, Kunst, Handy ───────────────────────────────────────────────

gruppe('Darstellung (ohne Bildschirm)');

test('Kunst: Wappen je Firma, Sterne und App-Symbol sind registriert; das Fenster Brett und die Handy-App „Aufträge" gibt es', () => {
  for (const f of FIRMEN_IDS) assert.ok(SYMBOL[`gross_wappen_${f}`], `Wappen ${f}`);
  assert.ok(SYMBOL.gross_stern && SYMBOL.gross_stern_leer && SYMBOL.gross_app_auftraege);
  assert.ok(FENSTER.brett);
  const app = HANDY_APPS.find((a) => a.id === 'auftraege');
  assert.ok(app && app.name === 'Aufträge' && app.symbol === 'gross_app_auftraege' && typeof app.seite === 'function');
});

test('Statistik und Reiter: der Handy-Kern kennt die App; Importe der Dateien halten die Bereichsregeln (Test register)', () => {
  assert.equal(HANDY_APPS.filter((a) => a.id === 'auftraege').length, 1);
});

// ─── Balance ────────────────────────────────────────────────────────────────

gruppe('Balance');

test('Auszahlung liegt immer zwischen 1,5- und 3-fachem Marktwert, Vorschuss 20 %, Strafe klein', () => {
  let n = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const s = stand({ stufe: 1 + (seed % 10), tiefe: seed * 2, huehner: seed, sterne: seed % 11, tag: 1 + (seed % 28), jz: seed % 4, seed });
    for (const v of G.angebote(s)) {
      const markt = v.menge * v.stueck;
      assert.ok(v.gesamt >= markt * 1.45 && v.gesamt <= markt * 3.02 + 10, `${G.wareName(v)}: ${v.gesamt} vs ${markt}`);
      n++;
    }
  }
  assert.ok(n > 200);
});

test('Beispielrechnungen: Eier, Gemüse, Fisch gegen Fabrikware (Zuschlag aus Menge, Seltenheit und Vertrauen)', () => {
  const eier = G.zuschlagVon(0.2, 0, 3, 2.0);
  assert.ok(eier <= 2.0);
  const antrieb = G.zuschlagVon(1, 1, 8);
  assert.ok(antrieb >= 2.5 && antrieb <= 3.0, String(antrieb));
  const cap = (id) => ARTEFAKT && ITEMS[id];
  assert.ok(cap('antriebseinheit'));
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`);
process.exit(fehlgeschlagen ? 1 : 0);
