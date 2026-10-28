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

Der Spielstand liegt im Artefakt in der Datenbank, pro Person privat. Ohne Artefakt, etwa beim
lokalen Server, liegt er im `localStorage` des Browsers. Gespeichert wird jeden Morgen
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
Nachbarfeld, sonst wirkt das Werkzeug auf das Feld vor der Figur. Die Angel wirft „Benutzen"
(oder „Aktion") bis sechs Felder weit aufs Wasser und holt mit demselben Knopf wieder ein;
Laufen oder ein anderes Werkzeug holt die Schnur ohne Fang ein.

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
| Ottilie | Krämerladen | Saatgut der Jahreszeit, Dünger, Küken (auch ×10, ×100 oder so viele wie bezahlbar), größerer Rucksack |
| Bruno | Schmiede | Kohle und Erz, Werkzeuge verbessern, Hühnerstall bauen |
| Lene | Strand | Köder, die Angel (ab Tag 2 geschenkt) |
| Hannes | Gasthaus „Zum Krug" | Brot, Salat, Kaffee, Fischsuppe |
| Frieda | Bürgermeisterin, viel unterwegs | das Schwarze Brett, die Mühle |
| Mats | Maler, mal am Strand, mal am Fluss | – |

**Angeln.** Wie in Minecraft: Angel in die Hand, aufs Wasser schauen und „Benutzen"
(Leertaste, Linksklick oder der Knopf auf dem Handy) – die Schnur fliegt aufs nächste
Wasserfeld, mit der Maus aufs angeklickte. Dann warten: der Schwimmer wippt, irgendwann
zieht eine Blasenspur heran, und taucht er ab, heißt es sofort einholen. Zu früh oder zu
spät gibt keinen Fang. Wer in der ersten Drittelsekunde reagiert, fängt „perfekt".
Köder im Rucksack halbiert die Wartezeit, jede Angelstufe und Regen verkürzen sie weiter.
18 Fische in Teich, Fluss und Meer, je nach Jahreszeit, Uhrzeit und Wetter – seltene
beißen seltener. Dazu Müll und manchmal eine Schatzkiste mit Münzen, Erz, Köder oder
einem kleinen Edelstein. Das Fangbuch merkt sich, wie viele und wie große Fische du hast.

**Die alte Mine.** Am Berg nördlich des Hofs, ab Tag 4 offen. 30 Ebenen, bei jedem Besuch neu gegraben: Kupfer,
Eisen, Gold, Edelsteine und Schleime in drei Gesteinsschichten. Die Leiter liegt unter
einem der Steine, der Förderkorb merkt sich jede fünfte Ebene, auf Ebene 10, 20 und 30
wartet eine Schatztruhe.

**Basteln.** Barren, Truhe, Vogelscheuche, Sprenger, Qualitätssprenger, Einmachglas,
Dünger, Köder – manche erst ab einer bestimmten Fähigkeitsstufe.

**Holzrohre.** 1 Holz ergibt 2 Rohre (Basteln, K). Auf dem Hof legst du sie wie einen Weg; sie
verbinden sich zu einem Netz. Berührt ein Netz eine Versandkiste, schickt es jede Nacht vor dem Verkauf
alles Verkäufliche aus angrenzenden Truhen, der Eierkiste vor dem Stall, Fischfarmen und fertigen
Räucheröfen dorthin. Liegt ein Räucherofen am Netz, wandern Fische (Fischfarm, Truhe) zuerst in den Ofen
(bis 200 je Ofen), und das Geräucherte geht in der nächsten Nacht zur Versandkiste: Fischfarm → Ofen →
Kiste. Der Ofen darf auch zwischen zwei getrennten Rohrstücken stehen (Farm → Rohr → Ofen → Rohr → Kiste). Mit der Spitzhacke nimmst du Rohre wieder auf. Achtung: In einer Truhe am Rohr
wird alles Verkäufliche mitverkauft, auch Saatgut und Barren.

**Der Räucherofen.** Kostet 1 Holz und 1 Kohle, von Anfang an im Basteln-Menü (K). Fisch in die Hand,
Aktionstaste auf den Ofen: bis zu 200 Fische je Ofen und Tag wandern hinein, über Nacht werden
sie zu Geräuchertem. Das ist zehnmal so viel wert wie der frische Fisch (bei gleicher Qualität).
Aktionstaste ohne Fisch holt es ab.

**Fischfarm.** Für 3 Holz von Anfang an im Basteln-Menü. Sie steht direkt am Wasser (auf jeder
Karte mit Wasser, mehrere sind erlaubt) und fängt jede Nacht 200 normale Karpfen, auch wenn du
nicht dort bist. Mit der Aktionstaste (E, Rechtsklick, Aktion-Knopf) sammelst du ein, was in den
Rucksack passt; leer hebst du sie mit Axt oder Spitzhacke wieder auf. Zahlen: `FISCHFARM_PRO_TAG`
und `FISCHFARM_FISCH` in `src/bereiche/handwerk/fischfarm.js`.

**Fabrik.** Eine kleine Automatisierung im Stil von Satisfactory, freigeschaltet über die Fähigkeit Bergbau
(Band Stufe 2, Splitter, Zusammenführer, Lager und Erzbohrer Stufe 3, Schmelzer 4, Konstrukteur 5, Assembler 7; alles im
Basteln-Menü K). Auf Hof, Berg, Wald und Strand liegen sichtbare **Vorkommen** (Kupfer, Eisen, Kohle, Stein, selten Gold;
2×2 Felder) im Steinbruch am Berg, auf der Anhöhe des Hofs und am Rand von Wald und Strand. Ihre Reinheit (unrein 0,5×,
normal 1×, rein 2×) sieht man an den Brocken und den Punkten darunter. Vorkommen sind unzerstörbar. Der **Erzbohrer** (Bohrer
in die Hand, auf das Vorkommen benutzen) fördert ein Stück je 2 Sekunden mal Reinheit; wie alle Maschinen braucht er Strom (siehe **Strom**).
**Förderbänder** zeigen dorthin, wohin du beim Legen schaust; die erste Aktionstaste (oder das erste Antippen) wählt ein Band,
jede weitere dreht es im Uhrzeigersinn. Spitzhacke oder Axt nimmt es samt Ladung wieder auf (was nicht in den Rucksack passt,
liegt danach am Boden). Hältst du ein Fabrikteil in der Hand, zeigt eine Vorschau die ganze Fläche mit Ein- und Ausgängen,
grün mit Platz, rot ohne; große Teile liegen immer vor dir in Blickrichtung. Der Hinweis über der Leiste sagt, warum ein Band staut. Waren laufen mit 1,5 Feldern pro Sekunde (höchstens 4 je Feld), stauen sich am Ende, wenn
das Ziel voll ist (nichts geht verloren) und rutschen in das nächste Band, in eine Maschine, ein **Lager** (48 Fächer, öffnet
mit der Aktionstaste, mit Knopf zum Drehen), eine Truhe oder die **Versandkiste** (verkauft über Nacht; Unverkäufliches bleibt auf dem Band). Ein Band, das nur von der Seite gespeist wird,
ist eine Kurve; Band gegen Band gegenüber nimmt nicht an. **Splitter** teilen eine Zufuhr gleichmäßig auf drei Ausgänge,
**Zusammenführer** führen drei Zuflüsse reihum auf ein Band. Maschinen haben vorn (gelber Pfeil) den Ausgang und an den
anderen Seiten (blaue Pfeile) den Eingang; ein Bild-Info-Fenster (Aktionstaste) zeigt Rezept, Status (arbeitet, wartet auf
Eingang, Ausgang voll), Durchsatz pro Minute und Inhalt, dreht die Maschine und leert den Ausgang. **Schmelzer:** 5 Erz + 1 Kohle
→ 1 Barren (4 / 6 / 10 s für Kupfer / Eisen / Gold). **Konstrukteur** (Rezept wählbar): Kupferbarren → 2 Kupferdraht, Eisenbarren
→ 2 Eisenplatten, → 4 Schrauben oder → 1 Zahnrad. **Assembler** (Rezept wählbar): 2 Eisenplatten + 3 Kupferdraht → Maschinenteil,
2 Zahnräder + 4 Schrauben → Antriebseinheit. Erz und Kohle dürfen auf einem Band kommen; zu viel von einer Zutat sammelt die Maschine im Eingang (das
Info-Fenster zeigt den Überschuss). Mit einer passenden Zutat in der Hand befüllst du Maschinen auch von Hand. In Wohnhäusern
lässt sich keine Fabrik bauen. Die Fabrik läuft in Echtzeit, solange du auf der Karte bist (ein Fenster oder die Pause hält sie an); auf
anderen Karten und über Nacht holt sie nach, höchstens 10 Minuten Echtzeit-Äquivalent je Nachholen. Alle Zahlen stehen in
`src/bereiche/handwerk/fabrik-daten.js`. Vor dem Legen dreht die Taste R (auf Touch der Knopf ↻) die Richtung eines Bands, Splitters, Zusammenführers, einer Maschine oder eines Lagers; die Meldung beim Drehen nennt die neue Richtung. Bänder gibt es in drei Stufen: **Mk1** 1,5 Felder/s, **Mk2** 3 Felder/s, **Mk3**
5 Felder/s (bis 6, 12 und 20 Waren pro Sekunde; im Basteln-Menü oder im Handy).

**Handy.** Du hast es von Anfang an im Rucksack (letzter Platz der Leiste; ältere Spielstände bekommen es beim Laden, bei vollem
Rucksack liegt es im Paketfach). Benutzen öffnet es, ebenso Menü › Handy (auf dem Handy-Bildschirm über den Menü-Knopf). Die App
**Fabrikbedarf** verkauft jederzeit – nachts, in der Mine, unterwegs – alle Fabrikteile gegen Gold: Bänder 0,1 / 0,25 / 0,6 Mio,
Splitter und Zusammenführer 0,3 Mio, Lager 0,8 Mio, Erzbohrer 2,5 Mio, Schmelzer 2 Mio, Konstrukteur 3 Mio, Assembler 8 Mio,
Biomasse-Brenner 4 Mio, Wasserrad 1,5 Mio, Kohlekraftwerk 25 Mio, Strommast 0,5 Mio, Stromkabel 0,1 Mio, Wasserpumpe 3 Mio,
Rohrleitung 0,15 / 0,4 Mio (je Stück). Mengen ×1, ×10, ×100 oder Max; geliefert wird sofort in den Rucksack, und bezahlt wird nur,
was hineinpasst und was das Gold hergibt. Die App **Vorkommen** liefert ein Vorkommen deiner Wahl: Sorte (Kupfer, Eisen, Kohle,
Stein, Gold) und Reinheit – unrein 25 Mio, normal 50 Mio, rein 100 Mio. In die Hand nehmen und benutzen stellt es auf (2×2),
Spitzhacke oder Axt nimmt es wieder auf. Dazu das **Paketfach** (Starterpaket) und **Stromnetz** (Netze der aktuellen Karte).
Preise: `HANDY_PREISE` in `src/bereiche/handwerk/fabrik-strom-daten.js`. Ergebnisse eines Kaufs stehen als Leiste im Handy, der Bestell- und der Abholknopf bleiben unten sichtbar.

**Strom.** Wie in Satisfactory: Erzbohrer (5 MW), Schmelzer (4 MW), Konstrukteur (4 MW), Assembler (15 MW) und Wasserpumpe
(20 MW) brauchen Strom, solange sie arbeiten; Bänder, Splitter, Zusammenführer und Lager nicht. Strom liefern der
**Biomasse-Brenner** (30 MW; Holz 100 MJ, Hartholz 300 MJ, Faser 15 MJ – vom Band oder aus der Hand, bis 100 Stück Vorrat),
das **Wasserrad** (6 MW ohne Brennstoff, nur direkt am Wasser) und das **Kohlekraftwerk** (75 MW; Kohle 300 MJ und Wasser
45 m³/min bei voller Last). Bei Teillast hält ein Brennstoff entsprechend länger (ein Brenner unter voller Last verbrennt 18 Holz
pro Minute, bei einem Sechstel Last 3); der Brenner ist dabei Reserve: reichen Wasserrad und Kraftwerk, verheizt er nichts. **Kabel** verlegst du mit dem Stromkabel in der Hand: auf den ersten Anschluss benutzen
(Strommast, Generator, Maschine), dann auf den zweiten; eine gestrichelte Linie zeigt vorher, ob es passt. Auf dem Handy-Bildschirm tippst du den Anschluss an oder nimmst den Aktion-Knopf (der zeigt „Kabel: Anfang“, „Kabel verlegen (n Kabel)“); ein Werkzeugwechsel bricht ab. Ein Kabel ist höchstens
10 Felder lang und kostet je angefangenes Feld ein Stromkabel (fehlen welche, Kupferdraht). Ein **Strommast** hat 4 Anschlüsse,
Generatoren und der Assembler 2, alle anderen Maschinen 1. Was über Kabel zusammenhängt, ist ein Netz. Will das Netz mehr
Leistung, als die Generatoren gerade liefern können, **fliegt die Sicherung**: das ganze Netz steht, bis du sie im Netzfenster
(Aktionstaste am Mast oder Generator) wieder einschaltest – und das hält nur, wenn der Verbrauch passt. Das Netzfenster zeigt
Erzeugung, Verbrauch, Kapazität, Höchstbedarf, Brennstoff, Wassertank und die Kabel (zum Lösen); das Info-Fenster jeder Maschine
zeigt ihren Strom. Alles läuft auch beim Nachholen auf anderen Karten und über Nacht mit; eine geflogene Sicherung steht morgens
im Bericht. **Übergang:** Damit ältere Fabriken nicht schlagartig stehen, laufen Maschinen ohne Netz noch 7 Tage mit
„Übergangsstrom aus dem Dorf" (ab dem ersten Laden, bei neuen Spielen ab Spielbeginn). Sobald es die erste Maschine gibt, liegt
einmal ein Starterpaket im Paketfach (Biomasse-Brenner, 2 Strommasten, 30 Kabel, 60 Holz), dazu ein Brief von Bruno.

**Rohrleitungen.** Für Wasser (die Holzrohre für Waren sind etwas anderes). Die **Wasserpumpe** steht direkt am Ufer und fördert
120 m³/min in angrenzende Rohrleitungen. Rohre verbinden sich mit ihren Nachbarn, mit Pumpen und mit dem Kohlekraftwerk (jede
Seite); man kann darüber gehen. Ein Rohrnetz ist ein Behälter (1 m³ je Rohr) mit Zu- und Abfluss; **Mk1** schafft 300 m³/min,
**Mk2** 600 m³/min, und ein Netz ist so stark wie sein schwächstes Rohr. Ist das Netz voll, steht die Pumpe und zieht keinen
Strom. Fließt Wasser, sieht man es im Rohr; die Aktionstaste am Rohr oder an der Pumpe zeigt Füllstand, Zu- und Abfluss und die
Grenze. Die Pumpe braucht selbst Strom (bis 20 MW, je nachdem, wie viel sie fördert): Ein Kohlekraftwerk fährt man mit einem
Biomasse-Brenner (30 MW) oder vier Wasserrädern (je 6 MW) im selben Netz an. Pumpen haben dabei Vorrang: reicht die Leistung
nicht für alle, laufen erst die Pumpen und die übrigen Maschinen warten (ohne dass die Sicherung fliegt), bis das Kraftwerk
Wasser hat. Eine Pumpe oder ein Kraftwerk darf an mehreren Rohrnetzen hängen.

**Maschinenbau.** Der **Maschinenbauer** (3×3, Werkbank mit Hammer und Funken; Basteln-Menü K aus 12 Eisenplatten,
24 Schrauben, 6 Zahnrädern, 10 Kupferdraht und 30 Holz, oder im Handy für 3,5 Mio) baut jedes Fabrikteil, das das Handy verkauft, aus
herstellbaren Teilen selbst: Aktionstaste öffnet das Fenster „Maschinenbau" mit allen 21 Bauplänen, ihren Zutaten (grün = genug, rot =
zu wenig) und der Mengenwahl ×1, ×5, ×10 und Max. Zutaten kommen aus dem Rucksack und aus Lagern und Truhen bis 3 Felder entfernt
(Rucksack zuerst); das Ergebnis liegt im Rucksack, ist er voll, im Lager in Reichweite – gebaut wird nur, was ganz hineinpasst.
Alle Baupläne sind von Anfang an frei; die Bergbau-Stufen 4 bis 8 in den Daten sind nur eine Empfehlung, wie weit man etwa sein sollte.

**Großabnehmer.** Am Schwarzen Brett im Dorf gibt es neben dem Einzelauftrag den Reiter **Großabnehmer**: sechs Firmen kaufen Waren in
großer Menge und zahlen dafür **das 1,5- bis 3-Fache des Marktwerts**. Brandt & Söhne Bau (Stein, Holz, Nägel, Beton, Stahlträger, Rahmen),
Funkel Elektro (Draht, Kabelrollen, Platinen, Computer), Möwenstein Werft (Rohre, Zahnräder, Antriebseinheiten, Antriebssysteme), Einkaufsring
Goldener Löffel (Eier, Fisch, Geräucherter Fisch), Hofladen-Kette Grüner Korb (Gemüse, Obst, Marmelade, Eingelegtes) und die Bergwerksgilde
(Erz, Barren, Edelsteine); dazu das Kuriositätenkabinett Wunderkammer (Artefakte, Mineralien, Geoden). Jede Firma hat ein **Vertrauen von 0 bis 10 Sternen**:
jeder erfüllte Vertrag gibt einen Stern, ein verfallener nimmt einen; mehr Sterne schalten seltenere Waren, größere Mengen und höhere Zuschläge frei.
Es gibt nur Waren, die du schon herstellen kannst (Bergbau-Stufe für Fabrikteile, tiefste Minenebene für Erze, Hühner für Eier, Jahreszeit und
Anbauzeit für Ernte, Angelstufe für Fische). Höchstens 3 Verträge laufen gleichzeitig, mit jeder Firma nur einer; die Angebote wechseln alle 3 Tage.
Bei der Annahme zahlt die Firma **20 % Vorschuss** sofort aus (wird bei Erfüllung verrechnet). Geliefert wird **aus dem Rucksack** (Teillieferungen, Menge
×1/×10/×100/Alles) am Brett oder in der Handy-App **Aufträge**, oder **automatisch über die Versandkiste**: vor dem nächtlichen Verkauf zieht jeder offene
Vertrag seine Ware aus der Kiste (zuerst die kürzeste Frist, dann der ältere Vertrag), erst der Rest wird normal verkauft – Fabrik-Linien und Holzrohre liefern also
von selbst. Qualität zählt nur, wenn der Vertrag sie nennt. Wer die Frist (3–14 Tage) verpasst, verliert den Vorschuss (gelieferte Ware wird zum normalen
Preis dagegen gerechnet), zahlt eine kleine Vertragsstrafe, wenn der Vertrag eine hat, und verliert einen Stern; der Morgenbericht warnt einen Tag vorher.
Bei Erfüllung gibt es die Auszahlung, manchmal einen Bonus und am nächsten Morgen einen Dankesbrief. Alle Zahlen: `GROSS` und `FIRMEN` in
`src/bereiche/gemeinschaft/grossabnehmer-daten.js`.

**Fähigkeiten.** Landwirtschaft, Angeln, Sammeln, Bergbau und Kampf steigen bis Stufe 10
und machen Werkzeuge sparsamer, Ernten besser, die Wartezeit beim Angeln kürzer und die Gesundheit größer.

**Die Welt.** Hof 80×64 (Anhöhe, Teich, Bauland, Wohnhaus in drei Ausbaustufen, Gewächshaus), Dorf
100×72 (Marktplatz, Fluss mit Brücken, Friedhof, Spielplatz, Läden und Häuser), Strand 90×44 (Steg,
Fischladen, Gezeitenbecken hinter einer kaputten Brücke), Wald 90×70 (Ranch, Turm, Händlerplatz, Waldsee,
Geheimer Wald hinter einem umgestürzten Stamm) und Berg 80×52 (Bergsee, Wasserfall, Zimmerei, Gilde,
Steinbruch hinter einer kaputten Brücke, Mineneingang). Spielstände der kleinen Karten sind nicht
kompatibel; die Äcker ziehen nicht mit um.

**Die Mühle.** Alternativ lässt sie sich für 100.000.000 g sofort reparieren (Knopf im Mühlenfenster).
**Die Mühle.** Acht Bündel aus Feld, Wald, Wasser, Tiefe und Stall. Jedes volle Bündel
bringt eine Belohnung, alle zusammen bringen das Rad wieder zum Drehen.

**Wald und Berg.** Südlich des Hofs liegt der Wald, nördlich von Hof und Dorf der Berg mit
dem Mineneingang – beide noch klein und ruhig, sie wachsen mit den nächsten Ausbaustufen.

Außerdem: Tag und Nacht mit Licht aus Fenstern und Laternen, Regen, Gewitter und Schnee,
Wettervorhersage im Fernseher, Briefe in der Post, ein Hühnerstall (so viele Hühner, wie du bezahlen kannst – Küken gibt es auch
in Mengen) mit einer Eierkiste davor, in der die Eier über Nacht landen,
Aufträge vom Schwarzen Brett und eine Ohnmacht, wenn man um zwei Uhr nachts noch draußen ist.

---

## Technik

* Reine ES-Module, Canvas 2D für die Welt, DOM für die Oberfläche. Kein Build, keine
  Abhängigkeiten zur Laufzeit. Nur die Schriften (Pixelify Sans, Silkscreen) kommen von
  Google Fonts; ohne Netz greift eine Ersatzschrift.
* Die Spiellogik (`logik.js`, `mine.js`, `spiel.js`) kommt ohne DOM aus und lässt sich
  direkt in Node testen.
* Der Kern enthält nur Mechanik. Die Inhalte – Karten, Gegenstände, Pflanzen, Fische, Läden,
  Dorfbewohner, Bündel, Briefe – liegen in `src/bereiche/<bereich>/` und docken über Register,
  Hooks und benannte Kartenpunkte an. Wie das geht, steht in [ARCHITEKTUR.md](ARCHITEKTUR.md).

```
index.html
src/
  index.js       Einstieg: lädt die Bereiche, dann Spielschleife – das einzige Skript von index.html
  daten.js       Register: Gegenstände, Pflanzen, Fische, Rezepte, Läden, Leute, Objekttypen …
  karten.js      Kartenformat, Bodenarten, Punkte, Bereiche, Gewässer, dynamische Karten
  system.js      Hooks und Modifikatoren
  logik.js       Rucksack, Feldarbeit, Tageswechsel, Freundschaft, Läden, Wege, Speichern
  speicher.js    Spielstand: Datenbank des Artefakts pro Person, Browser-Speicher als Sicherung
  mine.js        Höhlenform und Monster-Verhalten
  spiel.js       Laufzeit: Bewegung, Werkzeuge, Interaktion, Uhr, Wege der Dorfbewohner
  angeln.js      Angeln: Auswerfen, Warten, Biss, Einholen, Fang und Schatzkisten
  sprites.js     Pixelkunst-Kern: Zeichen-Grundfunktionen, Bild-Register, Boden, Figuren
  render.js      Kamera, Ebenen mit Zeichnern, Tiefensortierung, Kulling, Wetter, Licht
  ui.js          Anzeige, Werkzeugleiste, Gespräche, Fenster- und Menü-Register, Titel
  eingabe.js     Tastatur, Maus, Touch
  ton.js         Geräusche und Musik mit WebAudio
  zufall.js      Seedbarer Zufall
  schleife.js    Spielschleife ohne Absturz: ein werfender Schritt hält das Spiel nicht an
  bereiche/      basis, hof, dorf, wildnis, pflanzen, angeln, mine, handwerk, tiere,
                 npcs, npcs2, feste, gemeinschaft – je inhalt.js (Inhalte),
                 grafik.js (Pixelkunst, Zeichner), oberflaeche.js (Fenster, Menüreiter)
  index.css      das einzige Stylesheet von index.html, holt auch die Schriften
test/
  alle.mjs       führt alle *.test.mjs aus
  *.test.mjs     Register, Karten und Punkte, Logik, ganze Tage, Laufzeit, Darstellung
  browser.mjs    Rauchtest im echten Browser (braucht Playwright)
tools/server.mjs Kleiner Dateiserver
```

### Tests

```bash
npm test                 # alle Tests in Node (test/alle.mjs)
npm run test:browser     # Browser-Tests (Rauchtest, Angeln, Räucherofen, Fischfarm, Hühner, Fabrik, Strom, Maschinenbau, Großabnehmer; Playwright, optional CHROMIUM=/pfad/zu/chrome)
```

### Karten bearbeiten

Ein Schauplatz ist ein Raster aus Zeichen (`.` Gras, `:` Weg, `=` Pflaster, `s` Sand,
`~` Wasser, `h` Steg, `#` Wald oder Wand, `X` Klippe), für große Karten auch per Bau-Helfer
gezeichnet. Gebäude, Deko, Übergänge und benannte Punkte stehen daneben. Türen, Übergänge und
Tagespläne verweisen auf Punkte. `npm test` prüft danach, dass jede Tür und jeder Übergang auf
ein begehbares Feld führt, alle Pflicht-Punkte da sind und alle Dorfbewohner ihre Ziele erreichen.

---

Das frühere taktische Rollenspiel „Der Preis von Klarwasser" liegt weiter in der
Git-Historie (Commit `376743f`).
