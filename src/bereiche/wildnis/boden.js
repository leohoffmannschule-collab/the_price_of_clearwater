// Bereich „wildnis" – eigene Bodenzeichen (Vorrat `l n o p q`, siehe ARCHITEKTUR 5.).

import { bodenTyp } from '../../karten.js';

bodenTyp('l', { name: 'brandung', begehbar: true });    // nasser Sand mit Schaumsaum am Meer
bodenTyp('n', { name: 'waldboden', begehbar: true });   // Laub und Nadeln im Wald
bodenTyp('o', { name: 'kies', begehbar: true });        // Kies am Flussufer, Pfade am Turm
bodenTyp('p', { name: 'felsplatte', begehbar: true });  // glatter Fels, Gezeitenbecken, Klippen
bodenTyp('q', { name: 'moos', begehbar: true });        // Moos im Geheimen Wald
