// Wo der Spielstand liegt.
//
// Im Artefakt ist das die Datenbank des Artefakts, pro Person privat: das Dokument
// data/users/<id>/spielstand. Der Browser-Speicher bleibt als Sicherung und für alles,
// was außerhalb des Artefakts läuft (lokaler Server, Tests).
//
// Schreiben geht sofort in den Browser-Speicher und danach nacheinander in die Datenbank.
// Lesen nimmt die Datenbank und fällt ohne sie auf den Browser-Speicher zurück. Ein Stand,
// der nur im Browser liegt, wandert beim ersten Lesen in die Datenbank.

import { SPEICHER_SCHLUESSEL } from './logik.js';

export const DOKUMENT = 'spielstand';

/** Browser-Speicher. Schlägt er fehl (privates Fenster, gesperrte Website-Daten), bleibt er leer. */
export const browserSpeicher = {
  lesen() {
    try { return localStorage.getItem(SPEICHER_SCHLUESSEL); } catch { return null; }
  },
  schreiben(text) {
    try { localStorage.setItem(SPEICHER_SCHLUESSEL, text); return true; } catch { return false; }
  },
};

/**
 * Speicherung mit Datenbank. `claude()` liefert `window.claude` oder nichts, `lokal` ist der
 * Browser-Speicher. Ohne Artefakt-Umgebung bleibt alles beim Browser-Speicher.
 */
export function neueSpeicherung({ claude = () => undefined, lokal = browserSpeicher } = {}) {
  let ablage = null;   // db-Namespace, sobald verbunden
  let person = null;   // Kennung der Person in diesem Artefakt (user.id)
  let verbunden = null;
  let schlange = Promise.resolve();

  const verbinden = () => (verbunden ??= (async () => {
    try {
      const c = claude();
      if (!c?.use) return false;
      const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
      const id = db && user ? await user.id() : null;
      if (!db || !id) return false;
      ablage = db;
      person = id;
      return true;
    } catch {
      return false;
    }
  })());

  const dokument = () => ablage.doc(`data/users/${person}/${DOKUMENT}`);

  // Nacheinander, damit ein älterer Stand nie einen neueren überschreibt.
  const dbSchreiben = (text) => {
    schlange = schlange.then(() => dokument().set({ stand: text })).catch(() => {});
  };

  return {
    /** Text des gespeicherten Stands oder null. */
    async laden() {
      await verbinden();
      if (!ablage) return lokal.lesen();
      try {
        const snap = await dokument().get();
        if (snap.exists) return snap.data()?.stand ?? null;
      } catch {
        return lokal.lesen();
      }
      const alt = lokal.lesen();
      if (alt) dbSchreiben(alt);
      return alt;
    },

    /** Stand sichern. Gibt zurück, ob der Browser-Speicher mitgemacht hat. */
    schreiben(text) {
      const lokalOk = lokal.schreiben(text);
      verbinden().then((ok) => { if (ok) dbSchreiben(text); });
      return lokalOk;
    },
  };
}

export const speicherung = neueSpeicherung({ claude: () => globalThis.window?.claude });
