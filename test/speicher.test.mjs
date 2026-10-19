// Der Spielstand: Datenbank des Artefakts pro Person, Browser-Speicher als Sicherung.
// Die Datenbank ist hier ein Nachbau mit demselben Verhalten wie im Artefakt (Dokumente unter
// data/users/<id>/…, Lesen einer Nichtexistenz, Fehler). Aufruf: node test/speicher.test.mjs
import assert from 'node:assert/strict';
import { neueSpeicherung, DOKUMENT } from '../src/speicher.js';

let bestanden = 0;
let fehlgeschlagen = 0;
async function test(name, fn) {
  try { await fn(); bestanden++; console.log(`  ✓ ${name}`); } catch (e) {
    fehlgeschlagen++; console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

/** Ein Browser-Speicher im Speicher, mit Schalter für Fehler. */
function lokalAus(start = null) {
  let wert = start;
  const l = { kaputt: false };
  l.lesen = () => (l.kaputt ? null : wert);
  l.schreiben = (t) => { if (l.kaputt) return false; wert = t; return true; };
  l.wert = () => wert;
  return l;
}

/** Ein db-Namespace mit Dokumenten unter Pfaden; `get` fällt auf Wunsch aus. */
function datenbank() {
  const dokumente = new Map();
  const db = { dokumente, ausfall: false, geschrieben: [] };
  db.doc = (pfad) => {
    const ref = {
      get: async () => {
        if (db.ausfall) throw Object.assign(new Error('x'), { code: 'unavailable' });
        const d = dokumente.get(pfad);
        return { exists: d !== undefined, data: () => d };
      },
      set: async (body) => { db.geschrieben.push(pfad); dokumente.set(pfad, structuredClone(body)); },
    };
    return ref;
  };
  return db;
}

/** window.claude mit Datenbank und Person; `null` heißt: nicht verfügbar. */
const claudeMit = (db, id = 'u_test') => () => (db ? {
  use: async (name) => (name === 'db' ? db : name === 'user' ? { id: async () => id } : null),
} : { use: async () => null });

console.log('Spielstand speichern und laden');

await test('ohne Artefakt-Umgebung bleibt alles beim Browser-Speicher', async () => {
  const lokal = lokalAus();
  const sp = neueSpeicherung({ claude: () => undefined, lokal });
  assert.equal(sp.schreiben('stand-1'), true);
  assert.equal(await sp.laden(), 'stand-1');
  assert.equal(lokal.wert(), 'stand-1');
});

await test('mit Datenbank liegt der Stand im Dokument der Person', async () => {
  const db = datenbank();
  const sp = neueSpeicherung({ claude: claudeMit(db, 'u_anna'), lokal: lokalAus() });
  sp.schreiben('stand-A');
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(db.geschrieben, [`data/users/u_anna/${DOKUMENT}`]);
  assert.deepEqual(db.dokumente.get(`data/users/u_anna/${DOKUMENT}`), { stand: 'stand-A' });
});

await test('Laden nimmt den Stand aus der Datenbank, nicht den Browser-Speicher', async () => {
  const db = datenbank();
  db.dokumente.set(`data/users/u_test/${DOKUMENT}`, { stand: 'aus-db' });
  const sp = neueSpeicherung({ claude: claudeMit(db), lokal: lokalAus('aus-browser') });
  assert.equal(await sp.laden(), 'aus-db');
});

await test('ein Stand nur im Browser wandert beim ersten Laden in die Datenbank', async () => {
  const db = datenbank();
  const sp = neueSpeicherung({ claude: claudeMit(db), lokal: lokalAus('alt') });
  assert.equal(await sp.laden(), 'alt');
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(db.dokumente.get(`data/users/u_test/${DOKUMENT}`), { stand: 'alt' });
});

await test('fällt die Datenbank aus, liest der Browser-Speicher weiter', async () => {
  const db = datenbank();
  db.ausfall = true;
  const sp = neueSpeicherung({ claude: claudeMit(db), lokal: lokalAus('sicher') });
  assert.equal(await sp.laden(), 'sicher');
});

await test('ist keine Person bekannt, bleibt es beim Browser-Speicher', async () => {
  const db = datenbank();
  const sp = neueSpeicherung({ claude: claudeMit(db, null), lokal: lokalAus('lokal') });
  sp.schreiben('neu');
  assert.equal(await sp.laden(), 'neu');
  assert.deepEqual(db.geschrieben, []);
});

await test('Schreibvorgänge kommen in der Reihenfolge an, und der neueste gewinnt', async () => {
  const db = datenbank();
  const langsam = db.doc;
  db.doc = (pfad) => {
    const ref = langsam(pfad);
    const set = ref.set;
    ref.set = async (body) => { await new Promise((r) => setTimeout(r, body.stand === 'eins' ? 30 : 0)); return set(body); };
    return ref;
  };
  const sp = neueSpeicherung({ claude: claudeMit(db), lokal: lokalAus() });
  sp.schreiben('eins');
  sp.schreiben('zwei');
  await new Promise((r) => setTimeout(r, 80));
  assert.deepEqual(db.dokumente.get(`data/users/u_test/${DOKUMENT}`), { stand: 'zwei' });
});

await test('ein fehlgeschlagener Browser-Speicher meldet das, die Datenbank bekommt den Stand trotzdem', async () => {
  const db = datenbank();
  const lokal = lokalAus();
  lokal.kaputt = true;
  const sp = neueSpeicherung({ claude: claudeMit(db), lokal });
  assert.equal(sp.schreiben('x'), false);
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(db.dokumente.get(`data/users/u_test/${DOKUMENT}`), { stand: 'x' });
});

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
