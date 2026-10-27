// Bereich „pflanzen": Dünger-Arten. Je Beet höchstens ein Mittel, gestreut vor der Aussaat oder am
// Tag der Aussaat.
//   duenger (Kern: f.duenger = true)      bessere Qualität
//   qualitaetsduenger (f.duenger = 'qualitaet')   noch bessere Qualität (Modifikator ernteQualitaet)
//   beschleuniger, turbobeschleuniger (f.mittel)  wächst schneller (Modifikator wachstum)
//   feuchteerde, gute_feuchteerde (f.mittel)      bleibt über Nacht manchmal nass (tagEnde)

import { item, rezept } from '../../daten.js';
import { modifikator } from '../../system.js';
import * as L from '../../logik.js';
import { hash } from '../../zufall.js';

/** Was ein Mittel im Beet bewirkt: `duenger` (Qualität) oder `mittel` (Wachstum/Feuchte). */
export const DUENGER = {
  duenger: { feld: 'duenger', wert: true },
  qualitaetsduenger: { feld: 'duenger', wert: 'qualitaet' },
  beschleuniger: { feld: 'mittel', wert: 'beschleuniger', tempo: 1.1 },
  turbobeschleuniger: { feld: 'mittel', wert: 'turbo', tempo: 4 / 3 },
  feuchteerde: { feld: 'mittel', wert: 'feuchte', nass: 0.33 },
  gute_feuchteerde: { feld: 'mittel', wert: 'feuchte2', nass: 0.66 },
};
export const MITTEL = Object.fromEntries(Object.values(DUENGER).filter((d) => d.feld === 'mittel').map((d) => [d.wert, d]));

item('duenger', { name: 'Dünger', kat: 'duenger', preis: 5, bild: { art: 'sack', f: '#8a6a4a', f2: '#6aa84f' }, text: 'Vor der Aussaat aufs Beet streuen. Bessere Ernte-Qualität.' });
item('qualitaetsduenger', { name: 'Qualitätsdünger', kat: 'duenger', preis: 10, bild: { art: 'sack', f: '#5a6a9a', f2: '#f2c43a' }, text: 'Vor der Aussaat streuen. Viel öfter Silber und Gold.' });
item('beschleuniger', { name: 'Wachstumsbeschleuniger', kat: 'duenger', preis: 20, bild: { art: 'pflanzen_flasche', f: '#5ac85a' }, text: 'Vor der Aussaat streuen. Die Pflanze reift ein Zehntel schneller.' });
item('turbobeschleuniger', { name: 'Turbo-Beschleuniger', kat: 'duenger', preis: 40, bild: { art: 'pflanzen_flasche', f: '#e8603a' }, text: 'Vor der Aussaat streuen. Ein Viertel schneller reif. Nicht trinken.' });
item('feuchteerde', { name: 'Feuchteerde', kat: 'duenger', preis: 4, bild: { art: 'pflanzen_erdsack', f: '#7a5a3a', f2: '#6ab0d8' }, text: 'Vor der Aussaat streuen. Hält das Beet manchmal bis zum nächsten Morgen nass.' });
item('gute_feuchteerde', { name: 'Gute Feuchteerde', kat: 'duenger', preis: 5, bild: { art: 'pflanzen_erdsack', f: '#5a3e2a', f2: '#3a8ae0' }, text: 'Vor der Aussaat streuen. Hält das Beet oft bis zum nächsten Morgen nass.' });

rezept('qualitaetsduenger', { menge: 2, zutaten: { harz: 2, faser: 2 }, stufe: ['landwirtschaft', 6] });
rezept('beschleuniger', { menge: 5, zutaten: { harz: 1, muschel: 1 }, stufe: ['landwirtschaft', 3] });
rezept('turbobeschleuniger', { menge: 5, zutaten: { harz: 2, koralle: 1 }, stufe: ['landwirtschaft', 7] });
rezept('feuchteerde', { menge: 2, zutaten: { stein: 2 }, stufe: ['landwirtschaft', 2] });
rezept('gute_feuchteerde', { menge: 2, zutaten: { stein: 3, faser: 1 }, stufe: ['landwirtschaft', 5] });

/** Ein Mittel aus dem Rucksack (idx) aufs Beet streuen. */
export function streuen(s, ort, x, y, idx) {
  const slot = s.spieler.inv[idx];
  const art = DUENGER[slot?.id];
  if (!art) return { grund: null };
  const f = ort.welt.felder[L.k(x, y)];
  if (!f) return { grund: 'Dünger gehört auf ein gelockertes Beet.' };
  if (f.duenger || f.mittel) return { grund: 'Hier ist schon gedüngt.' };
  if (f.pflanze && f.pflanze.tage > 0) return { grund: 'Dünger wirkt nur vor der Aussaat oder direkt danach.' };
  f[art.feld] = art.wert;
  L.entfernenAusSlot(s, idx, 1);
  return { ok: true };
}

/** Beschleuniger: mehr Wachstum je gegossener Nacht. */
modifikator('wachstum', (wert, { feld }) => {
  const m = MITTEL[feld?.mittel];
  return m?.tempo ? wert * m.tempo : wert;
});

/** Qualitätsdünger: eine zweite Chance auf eine Stufe mehr (fest je Feld und Tag, ohne Zufallsquelle). */
modifikator('ernteQualitaet', (wert, { s, x, y, feld }) => {
  if (feld?.duenger !== 'qualitaet' || wert >= 2) return wert;
  return hash(x, y, L.tagNr(s.zeit) + 977) < 0.45 ? wert + 1 : wert;
});

/** Feuchteerde: nach der Nacht bleibt das Beet mit ihrer Chance nass. */
export function feuchteHalten(s, r) {
  for (const w of Object.values(s.welt)) {
    for (const f of Object.values(w.felder)) {
      const m = MITTEL[f.mittel];
      if (m?.nass && !f.nass && r() < m.nass) f.nass = true;
    }
  }
}
