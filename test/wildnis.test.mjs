// Bereich „wildnis": Strand (90×44), Wald (90×70), Geheimer Wald, die Innenräume, die Besiedlung
// (Bäume, Steine, Hartholz-Stümpfe), die Brücke zum Gezeitenbecken und der umgestürzte Stamm.
// Aufruf: node test/wildnis.test.mjs
import assert from 'node:assert/strict';
import '../src/bereiche/inhalt.js';
import { T, ITEMS, LAEDEN, FISCHE, OBJEKT_TYPEN } from '../src/daten.js';
import { KARTEN, BODEN, punkt, bereichVon, karteHolen, wasserArt, istWasser } from '../src/karten.js';
import * as L from '../src/logik.js';
import { S, DEKO_AKTIONEN, spielStarten, karteBetreten } from '../src/spiel.js';
import { wurfZiel, fischePassend } from '../src/angeln.js';
import { besiedeln, BRUECKE_HOLZ, STAMM_ORT, STAMM_FLAECHE } from '../src/bereiche/wildnis/leben.js';
import { STUMPF_PLAETZE } from '../src/bereiche/wildnis/karte-geheimwald.js';

let bestanden = 0;
let fehlgeschlagen = 0;
function test(name, fn) {
  try { fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.stack?.split('\n').slice(0, 3).join('\n      ') ?? e.message}`);
  }
}
function gruppe(name, fn) { console.log(`\n${name}`); fn(); }

const neues = (seed = 7) => L.neuesSpiel({ name: 'Testa', hof: 'Testhof', seed });
const k = L.k;

/** Felder, die von (sx, sy) zu Fuß erreichbar sind – mit den echten Objekten des Spielstands. */
function erreichbar(s, id, sx, sy) {
  const def = karteHolen(id, s);
  const w = L.welt(s, id);
  const gesehen = new Set([k(sx, sy)]);
  const offen = [[sx, sy]];
  while (offen.length) {
    const [x, y] = offen.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const kk = k(x + dx, y + dy);
      if (gesehen.has(kk) || !L.begehbar(s, def, w, x + dx, y + dy)) continue;
      gesehen.add(kk);
      offen.push([x + dx, y + dy]);
    }
  }
  return gesehen;
}
const hat = (ok, x, y) => ok.has(k(x, y));
const zaehle = (s, id) => {
  const z = {};
  for (const o of Object.values(L.welt(s, id).objekte)) z[o.t] = (z[o.t] || 0) + 1;
  return z;
};

// ─── Karten ─────────────────────────────────────────────────────────────────

gruppe('Die Karten', () => {
  test('Strand 90×44, Wald 90×70, Geheimer Wald mindestens 40×30', () => {
    assert.deepEqual([KARTEN.strand.w, KARTEN.strand.h], [90, 44]);
    assert.deepEqual([KARTEN.wald.w, KARTEN.wald.h], [90, 70]);
    assert.ok(KARTEN.geheimwald.w >= 40 && KARTEN.geheimwald.h >= 30);
  });
  test('die eigenen Bodenzeichen l n o p q sind begehbar und haben Namen', () => {
    for (const z of 'lnopq') assert.ok(BODEN[z]?.begehbar && BODEN[z].name, z);
  });
  test('Strand: Meer, Steg, Fischladen, Hütte, Leuchtturm, Gezeitenbecken, Lagerfeuer', () => {
    const s = KARTEN.strand;
    assert.equal(s.wasser, 'meer');
    assert.ok(s.gebaeude.some((g) => g.typ === 'huette' && g.ziel.karte === 'fischladen' && g.ziel.punkt === 'eingang'));
    assert.ok(s.gebaeude.some((g) => g.ziel?.karte === 'huetteMats'));
    assert.ok(s.gebaeude.some((g) => g.typ === 'wildnis_leuchtturm'));
    assert.ok(s.deko.some((d) => d.typ === 'wildnis_lagerfeuer'));
    assert.ok(bereichVon('strand', 'fest') && bereichVon('strand', 'gezeitenbecken'));
    const steg = punkt('strand', 'steg');
    assert.equal(s.grid[steg.y][steg.x], 'h', 'Lene steht auf dem Steg');
    assert.ok(s.grid.some((z) => z.includes('l')), 'Brandung');
    assert.ok(s.sammel.some((z) => z.art === 'strand') && s.sammel.some((z) => z.art === 'wiese'));
  });
  test('Wald: Ranch, Turm, Händlerplatz, Fluss, Waldsee, Lichtung, Sammelzonen wald und wiese', () => {
    const w = KARTEN.wald;
    assert.equal(w.wasser, 'fluss');
    assert.ok(w.gewaesser.some((g) => g.art === 'waldsee'));
    assert.ok(w.gebaeude.some((g) => g.typ === 'ranch' && g.ziel.karte === 'ranch'));
    assert.ok(w.gebaeude.some((g) => g.typ === 'turm' && g.ziel.karte === 'turm'));
    for (const n of ['haendler', 'see1', 'fluss1', 'lichtung', 'vorGeheimwald']) assert.ok(punkt('wald', n), n);
    assert.ok(w.sammel.some((z) => z.art === 'wald') && w.sammel.some((z) => z.art === 'wiese'));
    assert.ok(w.deko.some((d) => d.typ === 'wildnis_marktstand') && w.deko.some((d) => d.typ === 'zaun'));
    const wasserFelder = w.grid.join('').split('').filter((c) => c === '~').length;
    assert.ok(wasserFelder > 400, 'See und Fluss');
  });
  test('Wald: Ausgänge Nord → Hof und Ost → Dorf, dazu der Weg in den Geheimen Wald', () => {
    const w = KARTEN.wald;
    const nord = w.warps.find((x) => x.karte === 'hof');
    assert.equal(nord.y, 0);
    assert.equal(nord.punkt, 'vonWald');
    const ost = w.warps.find((x) => x.karte === 'dorf');
    assert.equal(ost.x, w.w - 1);
    assert.equal(ost.punkt, 'vonWald');
    assert.ok(w.warps.some((x) => x.karte === 'geheimwald' && x.punkt === 'vonWald'));
  });
  test('Geheimer Wald: Teich (geheimteich), Sammelzone geheimwald, Rückweg zum Wald', () => {
    const g = KARTEN.geheimwald;
    assert.equal(g.wasser, 'geheimteich');
    assert.ok(g.sammel.every((z) => z.art === 'geheimwald'));
    assert.ok(g.warps.some((x) => x.karte === 'wald' && x.punkt === 'vorGeheimwald'));
    assert.equal(STUMPF_PLAETZE.length, 18);
  });
  test('Gewässerarten: jedes Wasserfeld hat eine Art mit Fischtabelle in jeder Jahreszeit', () => {
    const s = neues(3);
    const arten = new Set();
    for (const id of ['strand', 'wald', 'geheimwald']) {
      const def = KARTEN[id];
      for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) if (istWasser(def, x, y)) arten.add(wasserArt(def, x, y));
    }
    assert.deepEqual([...arten].sort(), ['fluss', 'geheimteich', 'meer', 'waldsee']);
    for (const art of arten) {
      for (let jz = 0; jz < 4; jz++) {
        s.zeit.jz = jz;
        const zeiten = [600, 900, 1200, 1500, 1800, 2100, 2400].filter((minute) => { s.zeit.minute = minute; return fischePassend(s, art).length > 0; });
        assert.ok(zeiten.length > 0, `${art} hat in Jahreszeit ${jz} zu keiner Uhrzeit einen Fisch`);
      }
    }
    assert.ok(Object.values(FISCHE).length > 0);
  });
  test('Festplätze von Strand und Wald sind groß und frei', () => {
    for (const id of ['strand', 'wald']) {
      const f = bereichVon(id, 'fest');
      assert.ok(f.w * f.h >= 100, `${id}: ${f.w}×${f.h}`);
    }
  });
});

// ─── Wege und Erreichbarkeit mit den echten Objekten ────────────────────────

gruppe('Wege zu Fuß', () => {
  test('Wald: von der Waldstraße kommt man zu allen Punkten außer hinter dem Stamm', () => {
    const s = neues(21);
    const v = punkt('wald', 'vonHof');
    const ok = erreichbar(s, 'wald', v.x, v.y);
    for (const [name, p] of Object.entries(KARTEN.wald.punkte)) assert.ok(hat(ok, p[0], p[1]), `wald.${name}`);
    for (const w of KARTEN.wald.warps) {
      if (w.karte === 'geheimwald') continue;
      assert.ok(hat(ok, w.x, w.y), `Warp nach ${w.karte}`);
    }
  });
  test('der umgestürzte Stamm versperrt den Weg in den Geheimen Wald, bis er zerlegt ist', () => {
    const s = neues(22);
    const v = punkt('wald', 'vonHof');
    const warp = KARTEN.wald.warps.find((w) => w.karte === 'geheimwald');
    assert.ok(!hat(erreichbar(s, 'wald', v.x, v.y), warp.x, warp.y), 'zu');
    L.objektEntfernen(L.ortVon(s, 'wald'), STAMM_ORT[0], STAMM_ORT[1]);
    assert.ok(hat(erreichbar(s, 'wald', v.x, v.y), warp.x, warp.y), 'offen');
  });
  test('Strand: alles erreichbar, nur das Gezeitenbecken liegt hinter der kaputten Brücke', () => {
    const s = neues(23);
    const v = punkt('strand', 'vonDorf');
    const ok = erreichbar(s, 'strand', v.x, v.y);
    for (const [name, p] of Object.entries(KARTEN.strand.punkte)) assert.ok(hat(ok, p[0], p[1]), `strand.${name}`);
    const becken = bereichVon('strand', 'gezeitenbecken');
    let drueben = 0;
    for (let y = becken.y; y < becken.y + becken.h; y++) for (let x = becken.x; x < becken.x + becken.w; x++) if (hat(ok, x, y)) drueben++;
    assert.equal(drueben, 0, 'ohne Brücke kommt man nicht hinüber');
    s.flags.strandbruecke = true;
    L.kartenGeaendert();
    const neu = erreichbar(s, 'strand', v.x, v.y);
    let hinueber = 0;
    for (let y = becken.y; y < becken.y + becken.h; y++) for (let x = becken.x; x < becken.x + becken.w; x++) if (hat(neu, x, y)) hinueber++;
    assert.ok(hinueber > 150, `mit Brücke: ${hinueber} Felder im Gezeitenbecken`);
  });
  test('Geheimer Wald: Teich, Schrein und jeder Hartholz-Stumpf sind erreichbar', () => {
    const s = neues(24);
    const v = punkt('geheimwald', 'vonWald');
    const ok = erreichbar(s, 'geheimwald', v.x, v.y);
    for (const [name, p] of Object.entries(KARTEN.geheimwald.punkte)) assert.ok(hat(ok, p[0], p[1]), `geheimwald.${name}`);
    for (const [x, y] of STUMPF_PLAETZE) {
      assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => hat(ok, x + dx, y + dy)), `Stumpf ${x},${y} ist anzufassen`);
    }
  });
  test('Lene, Wilma und Mats erreichen ihre Plätze', () => {
    const s = neues(25);
    const heim = L.npcHeim('lene');
    const steg = { karte: 'strand', ...punkt('strand', 'steg') };
    assert.ok(L.wegPlanen(s, heim, steg).ok, 'Lene: Bett → Steg');
    assert.ok(L.wegPlanen(s, steg, L.ladenOrt('fischer')).ok, 'Lene: Steg → Theke');
    const mats = L.npcHeim('mats');
    assert.ok(L.wegPlanen(s, mats, { karte: 'strand', ...punkt('strand', 'strand1') }).ok, 'Mats: Hütte → Strand');
    const wilma = L.npcHeim('wilma');
    assert.ok(L.wegPlanen(s, wilma, L.ladenOrt('ranch')).ok, 'Wilma: Bett → Theke');
  });
  test('der Weg vom Hof durch den Wald ins Dorf führt über die Karten', () => {
    const s = neues(26);
    const weg = L.kartenWeg(s, 'wald', 'dorf');
    assert.ok(weg?.length, 'Wald → Dorf');
    assert.ok(L.kartenWeg(s, 'strand', 'wald'), 'Strand → Wald über das Dorf');
  });
  test('Wege auf den großen Karten bleiben schnell', () => {
    const s = neues(27);
    const t = performance.now();
    const w = L.wegPlanen(s, { karte: 'wald', ...punkt('wald', 'vonHof') }, { karte: 'wald', ...punkt('wald', 'vonDorf') });
    assert.ok(w.ok);
    const w2 = L.wegPlanen(s, { karte: 'strand', ...punkt('strand', 'vonDorf') }, { karte: 'strand', ...punkt('strand', 'steg') });
    assert.ok(w2.ok);
    assert.ok(performance.now() - t < 800, `${Math.round(performance.now() - t)} ms`);
  });
});

// ─── Besiedlung ─────────────────────────────────────────────────────────────

gruppe('Bäume, Steine und Stümpfe', () => {
  test('ein neues Spiel besiedelt Wald, Strand und Geheimen Wald', () => {
    const s = neues(31);
    const wald = zaehle(s, 'wald');
    assert.ok(wald.baum >= 250, `Bäume im Wald: ${wald.baum}`);
    assert.ok(wald.stein > 0 && wald.ast > 0 && wald.unkraut > 0);
    assert.equal(wald.wildnis_stamm, 1);
    assert.equal(wald.teil, STAMM_FLAECHE[0] * STAMM_FLAECHE[1] - 1);
    const strand = zaehle(s, 'strand');
    assert.ok(strand.stein > 0 && strand.ast > 0 && strand.unkraut > 0);
    assert.equal(zaehle(s, 'geheimwald').grossstumpf, 18);
    assert.ok(s.wildnis.besiedelt);
  });
  test('Bäume stehen nie auf Wegen, Punkten, Toren, vor Türen oder in Festplätzen', () => {
    const s = neues(32);
    for (const id of ['wald', 'strand', 'geheimwald']) {
      const def = KARTEN[id];
      for (const kk of Object.keys(L.welt(s, id).objekte)) {
        const [x, y] = L.ausK(kk);
        const o = L.welt(s, id).objekte[kk];
        if (o.t === 'sammel' || o.t === 'teil' || o.t === 'wildnis_stamm') continue;
        assert.ok(BODEN[def.grid[y][x]].begehbar, `${id} ${x},${y}`);
        assert.ok(!':=ho'.includes(def.grid[y][x]), `${id}: ${o.t} auf Weg ${x},${y}`);
        for (const [n, p] of Object.entries(def.punkte)) assert.ok(!(p[0] === x && p[1] === y), `${id}.${n} belegt von ${o.t}`);
        assert.ok(!L.warpAn(def, x, y), `${id}: ${o.t} auf Warp`);
      }
    }
    for (const id of ['wald', 'strand']) {
      const f = bereichVon(id, 'fest');
      const welt = L.welt(s, id).objekte;
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) assert.ok(!welt[k(x, y)] || welt[k(x, y)].t === 'sammel', `${id}: Fest ${x},${y}`);
    }
  });
  test('alle Hindernisarten gibt es als Objekttyp', () => {
    const s = neues(33);
    for (const id of ['wald', 'strand', 'geheimwald']) for (const o of Object.values(L.welt(s, id).objekte)) assert.ok(OBJEKT_TYPEN[o.t], o.t);
  });
  test('die Besiedlung ist je Seed gleich und hängt nicht vom Zufall der Sitzung ab', () => {
    const a = neues(34);
    const b = neues(34);
    assert.equal(JSON.stringify(L.welt(a, 'wald').objekte).length > 1000, true);
    const baeume = (s) => Object.entries(L.welt(s, 'wald').objekte).filter(([, o]) => o.t === 'baum').map(([kk]) => kk).join();
    assert.equal(baeume(a), baeume(b));
  });
  test('über Nacht kommt etwas nach, und Hartholz-Stümpfe wachsen im Geheimen Wald nach', () => {
    const s = neues(35);
    const w = L.welt(s, 'geheimwald');
    for (const [x, y] of STUMPF_PLAETZE.slice(0, 10)) delete w.objekte[k(x, y)];
    assert.equal(zaehle(s, 'geheimwald').grossstumpf, 8);
    const vorher = Object.keys(L.welt(s, 'wald').objekte).length;
    for (let i = 0; i < 40; i++) L.tagBeenden(s, { r: Math.random });
    assert.equal(zaehle(s, 'geheimwald').grossstumpf, 18, 'alle Stümpfe sind wieder da');
    assert.ok(Object.keys(L.welt(s, 'wald').objekte).length >= vorher - 0, 'der Wald verliert nichts');
    // sie wachsen nicht alle auf einmal nach
    const t = neues(36);
    for (const [x, y] of STUMPF_PLAETZE) delete L.welt(t, 'geheimwald').objekte[k(x, y)];
    L.tagBeenden(t, { r: () => 0.5 });
    assert.ok(zaehle(t, 'geheimwald').grossstumpf === undefined || zaehle(t, 'geheimwald').grossstumpf < 18);
  });
  test('Hartholz-Stumpf: nur mit Kupferaxt oder besser', () => {
    const s = neues(37);
    const ort = L.ortVon(s, 'geheimwald');
    const [x, y] = STUMPF_PLAETZE[0];
    const e0 = L.axtHieb(s, ort, x, y);
    assert.equal(e0.treffer, 'abprall');
    s.spieler.werkzeug.axt = 1;
    let erg;
    for (let i = 0; i < 6 && ort.welt.objekte[k(x, y)]; i++) erg = L.axtHieb(s, ort, x, y);
    assert.ok(!ort.welt.objekte[k(x, y)], 'zerlegt');
    assert.ok(L.anzahl(s, 'hartholz') >= 2 || erg.items.some((i) => i.id === 'hartholz'));
  });
  test('ältere Stände: beim Betreten der Wildnis wächst alles an, die Platzhalter-Objekte verschwinden', () => {
    const s = neues(38);
    const alt = JSON.parse(L.serialisieren(s));
    delete alt.wildnis;
    alt.welt.wald.objekte = { '3,3': { t: 'sammel', id: 'pilz', wild: true } };
    alt.welt.strand.objekte = {};
    alt.welt.geheimwald.objekte = {};
    const u = L.deserialisieren(JSON.stringify(alt));
    assert.equal(u.wildnis.besiedelt, false);
    spielStarten(u, {});
    karteBetreten('wald', 44, 30, 'unten');
    assert.ok(u.wildnis.besiedelt);
    assert.ok(zaehle(u, 'wald').baum >= 250);
    assert.ok(!L.welt(u, 'wald').objekte['3,3']);
    // ein zweites Betreten legt nichts neu an
    const vorher = JSON.stringify(L.welt(u, 'wald').objekte);
    karteBetreten('strand', 40, 2, 'unten');
    karteBetreten('wald', 44, 30, 'unten');
    assert.equal(JSON.stringify(L.welt(u, 'wald').objekte), vorher);
  });
  test('Speichern und Laden behält Besiedlung, Stamm und Flaggen', () => {
    const s = neues(39);
    s.flags.strandbruecke = true;
    const u = L.deserialisieren(L.serialisieren(s));
    assert.equal(JSON.stringify(L.welt(u, 'wald').objekte), JSON.stringify(L.welt(s, 'wald').objekte));
    assert.ok(u.flags.strandbruecke);
    assert.ok(L.serialisieren(s).length < 160000, `Stand ${L.serialisieren(s).length} Zeichen`);
  });
  test('ein neues Spiel mit Besiedlung dauert nicht lange', () => {
    neues(40);
    const t = performance.now();
    for (let i = 0; i < 5; i++) neues(41 + i);
    assert.ok((performance.now() - t) / 5 < 150, `${Math.round((performance.now() - t) / 5)} ms je Spiel`);
  });
});

// ─── Brücke und Stamm ───────────────────────────────────────────────────────

gruppe('Die Brücke zum Gezeitenbecken', () => {
  const sicht = { dialoge: [], fragen: [], meldungen: [] };
  const hooks = { dialog: (n, texte) => sicht.dialoge.push(texte), frage: (t, o) => sicht.fragen.push([t, o]), meldung: (t) => sicht.meldungen.push(t), ton() {} };
  const brueckeDeko = (s) => KARTEN.strand.deko.find((d) => d.aktion === 'wildnis_bruecke' && d.typ === 'wildnis_bruecke_kaputt');
  test('kaputt blockiert sie, heil ist sie begehbar (Bedingung wildnis_strandbruecke)', () => {
    const s = neues(51);
    const def = KARTEN.strand;
    const b = brueckeDeko(s);
    assert.ok(b);
    assert.ok(!L.begehbar(s, def, L.welt(s, 'strand'), b.x + 1, b.y));
    s.flags.strandbruecke = true;
    assert.ok(L.begehbar(s, def, L.welt(s, 'strand'), b.x + 1, b.y));
    assert.ok(L.begehbar(s, def, L.welt(s, 'strand'), b.x + 2, b.y + 1));
  });
  test('ohne 300 Holz sagt das Schild, was fehlt', () => {
    const s = neues(52);
    spielStarten(s, hooks);
    sicht.dialoge.length = 0;
    DEKO_AKTIONEN.wildnis_bruecke.fn({}, { s });
    assert.equal(sicht.dialoge.length, 1);
    assert.ok(sicht.dialoge[0].join(' ').includes(String(BRUECKE_HOLZ)));
    assert.ok(!s.flags.strandbruecke);
  });
  test('mit 300 Holz: fragen, bezahlen, Flagge, Brücke begehbar; „Später" kostet nichts', () => {
    const s = neues(53);
    spielStarten(s, hooks);
    s.spieler.inv.fill(null);
    L.hinzufuegen(s, { id: 'holz', n: 350 });
    sicht.fragen.length = 0;
    DEKO_AKTIONEN.wildnis_bruecke.fn({}, { s });
    assert.equal(sicht.fragen.length, 1);
    const [text, optionen] = sicht.fragen[0];
    assert.ok(text.includes('300'));
    assert.equal(optionen[1][1], null);
    assert.equal(L.anzahl(s, 'holz'), 350);
    optionen[0][1]();
    assert.equal(L.anzahl(s, 'holz'), 50);
    assert.ok(s.flags.strandbruecke);
    const b = brueckeDeko(s);
    assert.ok(L.begehbar(s, KARTEN.strand, L.welt(s, 'strand'), b.x + 1, b.y));
    // danach: kein zweites Mal bezahlen
    sicht.dialoge.length = 0;
    DEKO_AKTIONEN.wildnis_bruecke.fn({}, { s });
    assert.equal(sicht.dialoge.length, 1);
    assert.equal(L.anzahl(s, 'holz'), 50);
  });
  test('der Hinweis der Aktionstaste verschwindet, wenn die Brücke heil ist', () => {
    const s = neues(54);
    const h = DEKO_AKTIONEN.wildnis_bruecke.hinweis;
    assert.ok(h({}, s).includes('300'));
    s.flags.strandbruecke = true;
    assert.equal(h({}, s), '');
  });
});

gruppe('Der umgestürzte Stamm', () => {
  const hooks = { meldung() {}, ton() {} };
  test('Stamm: 3×2 große Objekte, blockierend, mit Hinweis', () => {
    const t = OBJEKT_TYPEN.wildnis_stamm;
    assert.deepEqual(t.flaeche, STAMM_FLAECHE);
    assert.ok(t.blockiert && t.hinweis);
  });
  test('mit Basis- oder Kupferaxt prallt man ab, die Stahlaxt zerlegt ihn und öffnet den Wald', () => {
    const s = neues(61);
    spielStarten(s, hooks);
    const ort = L.ortVon(s, 'wald');
    const [x, y] = STAMM_ORT;
    for (const stufe of [0, 1]) {
      s.spieler.werkzeug.axt = stufe;
      const e = L.axtHieb(s, ort, x, y);
      assert.equal(e.treffer, 'abprall');
      assert.ok(e.grund.includes('Stahlaxt'));
    }
    assert.ok(!s.flags.geheimwald);
    s.spieler.werkzeug.axt = 2;
    // auch ein Hieb auf ein Randfeld des Stamms trifft das große Objekt
    let hiebe = 0;
    while (ort.welt.objekte[k(x, y)] && hiebe < 40) { L.axtHieb(s, ort, x + 2, y + 1); hiebe++; }
    assert.ok(hiebe > 3 && hiebe <= 40, `${hiebe} Hiebe`);
    assert.ok(s.flags.geheimwald);
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) assert.ok(!ort.welt.objekte[k(x + dx, y + dy)], 'alle Teile weg');
    assert.ok(L.anzahl(s, 'holz') >= 40 && L.anzahl(s, 'hartholz') >= 6);
    const v = punkt('wald', 'vonHof');
    const warp = KARTEN.wald.warps.find((w) => w.karte === 'geheimwald');
    assert.ok(hat(erreichbar(s, 'wald', v.x, v.y), warp.x, warp.y));
  });
  test('der Stamm kommt nicht zurück, auch nicht in einem älteren Stand', () => {
    const s = neues(62);
    s.flags.geheimwald = true;
    L.objektEntfernen(L.ortVon(s, 'wald'), STAMM_ORT[0], STAMM_ORT[1]);
    for (let i = 0; i < 5; i++) L.tagBeenden(s, { r: Math.random });
    assert.ok(!L.welt(s, 'wald').objekte[k(STAMM_ORT[0], STAMM_ORT[1])]);
    besiedeln(s);
    assert.ok(!L.welt(s, 'wald').objekte[k(STAMM_ORT[0], STAMM_ORT[1])], 'besiedeln lässt ihn weg, wenn der Weg schon frei ist');
  });
  test('ein neues Spiel beginnt mit verschlossenem Geheimen Wald und kaputter Brücke', () => {
    const s = neues(63);
    assert.ok(!s.flags.geheimwald && !s.flags.strandbruecke);
  });
});

// ─── Angeln am neuen Steg, Waldsee und Fluss ────────────────────────────────

gruppe('Angeln an den neuen Gewässern', () => {
  const hooks = { meldung() {}, ton() {}, funde() {} };
  function stehen(id, p) {
    const s = neues(71);
    spielStarten(s, hooks);
    karteBetreten(id, p.x, p.y, p.blick);
    return s;
  }
  test('Steg: die Schnur fällt aufs Meer, von der Spitze aus in jede Richtung', () => {
    stehen('strand', punkt('strand', 'steg'));
    const z = wurfZiel(S);
    assert.equal(z.wasser, 'meer');
    assert.ok(z.y > punkt('strand', 'steg').y);
    for (const blick of ['links', 'rechts']) assert.equal(wurfZiel(S, null, blick).wasser, 'meer', blick);
  });
  test('Waldsee, Seesteg, Fluss und Geheimteich haben jeweils ihre Art', () => {
    stehen('wald', punkt('wald', 'see1'));
    assert.equal(wurfZiel(S).wasser, 'waldsee');
    stehen('wald', punkt('wald', 'seesteg'));
    assert.equal(wurfZiel(S).wasser, 'waldsee');
    stehen('wald', punkt('wald', 'fluss1'));
    assert.equal(wurfZiel(S).wasser, 'fluss');
    stehen('geheimwald', punkt('geheimwald', 'teich'));
    assert.equal(wurfZiel(S).wasser, 'geheimteich');
  });
  test('Gezeitenbecken und Strandbucht: Fische des Meeres', () => {
    const s = neues(72);
    s.flags.strandbruecke = true;
    spielStarten(s, hooks);
    karteBetreten('strand', 80, 25, 'unten');
    const z = wurfZiel(S);
    assert.ok(z.wasser === 'meer' || z.grund, 'Wasser in der Nähe');
  });
});

// ─── Innenräume und Läden ───────────────────────────────────────────────────

gruppe('Innenräume', () => {
  const innen = { fischladen: 16, huetteMats: 14, ranch: 18, turm: 14 };
  test('alle vier Räume sind größer als die Platzhalter und führen nach draußen', () => {
    for (const [id, b] of Object.entries(innen)) {
      assert.equal(KARTEN[id].w, b, id);
      assert.equal(KARTEN[id].aussen, false);
      assert.ok(KARTEN[id].deko.length >= 12, `${id}: eingerichtet`);
      assert.ok(KARTEN[id].warps.length === 1 && KARTEN[id].warps[0].punkt, id);
    }
    assert.equal(KARTEN.fischladen.warps[0].karte, 'strand');
    assert.equal(KARTEN.huetteMats.warps[0].karte, 'strand');
    assert.equal(KARTEN.ranch.warps[0].karte, 'wald');
    assert.equal(KARTEN.turm.warps[0].karte, 'wald');
  });
  test('Fischladen: Theke mit Laden „fischer", Lene hinter der Theke, Bett', () => {
    const t = KARTEN.fischladen.deko.find((d) => d.aktion === 'laden');
    assert.equal(t.laden, 'fischer');
    const ort = L.ladenOrt('fischer');
    assert.equal(ort.karte, 'fischladen');
    assert.deepEqual([ort.x, ort.y], [punkt('fischladen', 'theke').x, punkt('fischladen', 'theke').y]);
    const th = punkt('fischladen', 'theke');
    assert.equal(th.y, t.y - 1, 'Lene steht direkt hinter der Theke');
    assert.ok(th.x >= t.x && th.x < t.x + t.w);
    assert.ok(punkt('fischladen', 'bett_lene'));
  });
  test('Ranch: Theke mit Laden „ranch", Wilma dahinter, zwei Betten', () => {
    const t = KARTEN.ranch.deko.find((d) => d.aktion === 'laden');
    assert.equal(t.laden, 'ranch');
    assert.equal(LAEDEN.ranch.ort.punkt, 'theke');
    assert.equal(punkt('ranch', 'theke').y, t.y - 1);
    assert.ok(punkt('ranch', 'bett_wilma') && punkt('ranch', 'bett_sanne'));
  });
  test('man kommt in jedem Raum zu allen Punkten und vor jede Theke', () => {
    const s = neues(81);
    for (const id of Object.keys(innen)) {
      const e = punkt(id, 'eingang');
      const ok = erreichbar(s, id, e.x, e.y);
      for (const [name, p] of Object.entries(KARTEN[id].punkte)) assert.ok(hat(ok, p[0], p[1]), `${id}.${name}`);
      const theke = KARTEN[id].deko.find((d) => d.aktion === 'laden');
      if (theke) for (let x = theke.x; x < theke.x + theke.w; x++) assert.ok(hat(ok, x, theke.y + 1), `${id}: vor der Theke bei x=${x}`);
    }
  });
  test('Turm und Hütte haben ihre Pflicht-Punkte an den richtigen Möbeln', () => {
    const buch = punkt('turm', 'buch');
    assert.ok(KARTEN.turm.deko.some((d) => d.typ === 'wildnis_lesepult' && d.x === buch.x && d.y === buch.y - 1), 'Lesepult am Punkt buch');
    const st = punkt('huetteMats', 'staffelei');
    assert.ok(KARTEN.huetteMats.deko.some((d) => d.typ === 'wildnis_staffelei' && d.x === st.x && d.y === st.y - 1), 'Staffelei am Punkt staffelei');
  });
  test('die Räume tragen eigene Innenfarben', () => {
    for (const id of Object.keys(innen)) assert.ok(KARTEN[id].innen?.startsWith('wildnis_'), id);
  });
});

gruppe('Namen und Größen', () => {
  test('alle neuen Namen außer Gegenständen beginnen mit „wildnis_" (oder gehören zum Vertrag)', () => {
    const erlaubt = new Set(['huette', 'ranch', 'turm', 'strandkorb', 'baum', 'busch', 'felsen', 'schild', 'laterne', 'kiste', 'zaun', 'tisch', 'theke', 'fenster', 'bild', 'kamin', 'pflanze']);
    for (const id of ['strand', 'wald', 'geheimwald', 'fischladen', 'huetteMats', 'ranch', 'turm']) {
      for (const d of KARTEN[id].deko) assert.ok(erlaubt.has(d.typ) || d.typ.startsWith('wildnis_'), `${id}: ${d.typ}`);
      for (const g of KARTEN[id].gebaeude) assert.ok(erlaubt.has(g.typ) || g.typ.startsWith('wildnis_'), `${id}: ${g.typ}`);
    }
    assert.ok(ITEMS.hartholz && ITEMS.holz);
    assert.equal(T, 16);
  });
  test('Kartenstand: auch große Karten bauen ihn schnell', () => {
    const s = neues(91);
    const t = performance.now();
    for (const id of ['strand', 'wald', 'geheimwald']) { L.kartenGeaendert(); L.kartenStand(s, KARTEN[id]); }
    assert.ok(performance.now() - t < 300, `${Math.round(performance.now() - t)} ms`);
  });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
