// Spielschleife ohne Absturz. Die Schleife (index.js) bestellt das nächste Bild, bevor sie arbeitet,
// und führt jeden Schritt (Eingabe, Spiel, Zeichnen, Oberfläche) für sich aus: Wirft einer, wird der
// Fehler einmal gemeldet und das Spiel läuft weiter. Ohne das genügte eine einzige Ausnahme
// (z. B. ein Maler, der mit einer fehlenden Farbe rechnet), und das Spiel stand für immer still,
// obwohl der Browser weiter antwortete.
//
// DOM-frei, damit die Tests es in Node prüfen können (test/einmachglas.test.mjs).

/** Wie viele verschiedene Fehler einzeln gemeldet werden; weitere meldet nur ein Sammelhinweis. */
export const MAX_MELDUNGEN = 20;

const gesehen = new Map();
let ueberlauf = false;

/**
 * Schritt `fn` ausführen. Gibt true zurück, wenn er durchlief, false, wenn er warf.
 * Jeder Fehler (Schritt + Text) erscheint nur einmal in `melden` (Standard: Konsole): ein Fehler,
 * der in jedem Bild auftritt, soll die Konsole nicht mit 60 Zeilen pro Sekunde füllen.
 */
export function schrittSicher(name, fn, melden = console.error) {
  try {
    fn();
    return true;
  } catch (e) {
    const text = e?.message ?? String(e);
    const schluessel = `${name}: ${text}`;
    if (gesehen.has(schluessel)) {
      gesehen.set(schluessel, gesehen.get(schluessel) + 1);
    } else if (gesehen.size < MAX_MELDUNGEN) {
      gesehen.set(schluessel, 1);
      melden(`Klarwasser: Fehler im Schritt „${name}" – das Spiel läuft weiter. ${text}`, e);
    } else if (!ueberlauf) {
      ueberlauf = true;
      melden('Klarwasser: Weitere Fehler in der Spielschleife werden nicht mehr einzeln gemeldet.');
    }
    return false;
  }
}

/** Für Tests: vergisst, welche Fehler schon gemeldet wurden. */
export function meldungenVergessen() {
  gesehen.clear();
  ueberlauf = false;
}

/** Für Tests und Diagnose: wie oft welcher Fehler aufgetreten ist ({ "Schritt: Text": Anzahl }). */
export const fehlerZaehler = () => Object.fromEntries(gesehen);
