# Klarwasser-Hof

Ein Hofspiel im Browser, angelehnt an Stardew Valley. Du erbst den verwilderten Hof
deiner Großmutter am Rand von Klarwasser: Unkraut, Steine, ein paar Bäume zu viel.
Daraus machst du Felder, verkaufst die Ernte, angelst am Strand, gräbst in der alten Mine
und lernst die Leute im Dorf kennen. Gemeinsam bringt ihr die stillgelegte Mühle wieder zum Laufen.

Alles läuft im Browser, ohne Installation und ohne Kompilieren. Es gibt keine einzige
Bilddatei: Figuren, Häuser, Pflanzen und Fische sind Pixelkunst aus Code, Musik und
Geräusche entstehen mit WebAudio.

---

## Starten

Gebraucht wird nur [Node.js](https://nodejs.org) (Version 18 oder neuer):

```bash
git clone https://github.com/leohoffmannschule-collab/the_price_of_clearwater.git
cd the_price_of_clearwater
npm start
```

Dann `http://localhost:8080` im Browser öffnen. `npm start` startet nur einen kleinen
Dateiserver (`tools/server.mjs`, ohne Fremdpakete). `python3 -m http.server 8080` tut dasselbe.
Ein Doppelklick auf `index.html` reicht nicht, weil Browser ES-Module nicht über `file://` laden.

Der Spielstand liegt im `localStorage` des Browsers. Gespeichert wird jeden Morgen
und auf Wunsch im Menü unter „Optionen".

---

## Steuerung

| | Tastatur und Maus | Touch |
|---|---|---|
| Laufen | WASD oder Pfeiltasten | Stick links |
| Werkzeug benutzen | Linksklick, Leertaste oder C | „Benutzen" |
| Reden, ernten, öffnen | Rechtsklick, E oder X | „Aktion" oder aufs Nachbarfeld tippen |
| Werkzeug wählen | 1–0, ß, ´ · Mausrad · Q und R | auf die Leiste tippen |
| Essen | F | „Essen" |
| Rucksack · Basteln · Menü | I oder Tab · K · Esc | „Menü" |

Gedrückt halten wiederholt Axt, Spitzhacke und Sense. Hacke und Gießkanne laden ab der
Kupferstufe auf und treffen dann 3, 5 oder 9 Felder. Mit der Maus zielt man auf jedes
Nachbarfeld, sonst wirkt das Werkzeug auf das Feld vor der Figur.

---

## Was es gibt

**Der Hof.** 18 Pflanzen über drei Jahreszeiten, manche tragen mehrfach. Nur gegossene
Beete wachsen über Nacht, Regen gießt mit. Am Ende einer Jahreszeit welkt, was im neuen
Wetter nicht gedeiht. Dünger hebt die Erntequalität (Silber, Gold), Krähen holen sich
ungeschützte Pflanzen, eine Vogelscheuche hält sie fern. Was in der Versandkiste liegt,
wird über Nacht verkauft.

**Das Dorf.** Sechs Leute mit eigenem Tagesplan, die zu Fuß zwischen Laden, Schmiede,
Strand, Marktplatz und Gasthaus unterwegs sind – bei Regen anders als bei Sonne.
Einmal am Tag reden, einmal am Tag schenken. Jede Person hat Lieblingsgeschenke,
Geburtstage zählen achtfach, und mit wachsender Freundschaft erzählen sie mehr und
schenken auch mal zurück.

| Person | Wo | Was es dort gibt |
|---|---|---|
| Ottilie | Krämerladen | Saatgut der Jahreszeit, Dünger, Küken, größerer Rucksack |
| Bruno | Schmiede | Kohle und Erz, Werkzeuge verbessern, Hühnerstall bauen |
| Lene | Strand | Köder, die Angel (ab Tag 2 geschenkt) |
| Hannes | Gasthaus „Zum Krug" | Brot, Salat, Kaffee, Fischsuppe |
| Frieda | Bürgermeisterin, viel unterwegs | das Schwarze Brett, die Mühle |
| Mats | Maler, mal am Strand, mal am Fluss | – |

**Angeln.** Auswerfen mit Kraftbalken, beim Anbiss sofort ziehen, dann den grünen Balken
über dem Fisch halten. 18 Fische in Teich, Fluss und Meer, je nach Jahreszeit,
Uhrzeit und Wetter.

**Die alte Mine.** Ab Tag 4 offen. 30 Ebenen, bei jedem Besuch neu gegraben: Kupfer,
Eisen, Gold, Edelsteine und Schleime in drei Gesteinsschichten. Die Leiter liegt unter
einem der Steine, der Förderkorb merkt sich jede fünfte Ebene, auf Ebene 10, 20 und 30
wartet eine Schatztruhe.

**Basteln.** Barren, Truhe, Vogelscheuche, Sprenger, Qualitätssprenger, Einmachglas,
Dünger, Köder – manche erst ab einer bestimmten Fähigkeitsstufe.

**Fähigkeiten.** Landwirtschaft, Angeln, Sammeln, Bergbau und Kampf steigen bis Stufe 10
und machen Werkzeuge sparsamer, Ernten besser, Fangbalken breiter und die Gesundheit größer.

**Die Mühle.** Acht Bündel aus Feld, Wald, Wasser, Tiefe und Stall. Jedes volle Bündel
bringt eine Belohnung, alle zusammen bringen das Rad wieder zum Drehen.

Außerdem: Tag und Nacht mit Licht aus Fenstern und Laternen, Regen, Gewitter und Schnee,
Wettervorhersage im Fernseher, Briefe in der Post, ein Hühnerstall mit Eiern,
Aufträge vom Schwarzen Brett und eine Ohnmacht, wenn man um zwei Uhr nachts noch draußen ist.

---

## Technik

* Reine ES-Module, Canvas 2D für die Welt, DOM für die Oberfläche. Kein Build, keine
  Abhängigkeiten zur Laufzeit. Nur die Schriften (Pixelify Sans, Silkscreen) kommen von
  Google Fonts; ohne Netz greift eine Ersatzschrift.
* Die Spiellogik (`logik.js`, `mine.js`, `spiel.js`) kommt ohne DOM aus und lässt sich
  direkt in Node testen.

```
index.html
src/
  main.js        Einstieg und Spielschleife
  daten.js       Gegenstände, Pflanzen, Fische, Rezepte, Läden, Dorfbewohner, Bündel, Briefe
  karten.js      Hof, Dorf, Strand, Innenräume, Mineneingang als lesbare Raster
  logik.js       Rucksack, Feldarbeit, Tageswechsel, Freundschaft, Aufträge, Mühle, Speichern
  mine.js        Höhlengenerator, Gestein, Schleime und Fledermäuse
  spiel.js       Laufzeit: Bewegung, Werkzeuge, Interaktion, Uhr, Wege der Dorfbewohner
  angeln.js      Auswerfen, Anbiss, Drill
  sprites.js     Pixelkunst aus Code
  render.js      Kamera, Tiefensortierung, Wetter, Licht
  ui.js          Anzeige, Werkzeugleiste, Gespräche, Fenster, Titel
  eingabe.js     Tastatur, Maus, Touch
  ton.js         Geräusche und Musik mit WebAudio
  zufall.js      Seedbarer Zufall
  style.css
test/
  logik.test.mjs Daten, Karten, Feldarbeit, Läden, Dorf, Mine, Speichern
  tag.test.mjs   Ganze Tage ohne Bildschirm, Wege der Dorfbewohner
  browser.mjs    Rauchtest im echten Browser (braucht Playwright)
tools/server.mjs Kleiner Dateiserver
```

### Tests

```bash
npm test                 # Logik und ganze Spieltage in Node
npm run test:browser     # Rauchtest im Browser (Playwright, optional CHROMIUM=/pfad/zu/chrome)
```

### Karten bearbeiten

Ein Schauplatz ist ein Raster aus Zeichen (`.` Gras, `:` Weg, `=` Pflaster, `s` Sand,
`~` Wasser, `h` Steg, `#` Wald oder Wand, `X` Klippe). Gebäude, Deko und Übergänge
stehen daneben als Listen. `npm test` prüft danach, dass jede Tür und jeder Übergang
auf ein begehbares Feld führt und alle Dorfbewohner ihre Ziele erreichen.

---

Das frühere taktische Rollenspiel „Der Preis von Klarwasser" liegt weiter in der
Git-Historie (Commit `376743f`).
