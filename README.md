# Der Preis von Klarwasser

Ein taktisches Rollenspiel im Stil von Baldur's Gate 3 — nach der Kampagne
**„Der Preis von Klarwasser"** (Band I: Kampagnenbuch, Band II/III: Begleitband mit Spielhilfen).

Vier Akte, Stufe 1 bis 20. Läuft vollständig im Browser, ohne Server, ohne Netz.

> Klarwasser hat seit zweihundert Jahren keine Missernte erlebt. Keine Seuche. Kein Feuer.
> Die Stadt weiß, warum. Sie muss es nur alle siebzehn Jahre kurz vergessen.

---

## Starten

```bash
python3 -m http.server 8080      # oder: npm start
```

Dann `http://localhost:8080` öffnen. Es wird nichts kompiliert und nichts installiert —
Babylon.js liegt fertig unter `vendor/`.

Tests:

```bash
npm test          # Regelkern + Inhalte (40 Prüfungen)
node test/playthrough.mjs   # Durchspiel-Test im echten Browser (braucht Playwright)
```

---

## Ohne feste Helden

Das Kampagnenbuch band seine drei Charakterhaken an Nyx, Kayn und Fibbel.
**Dieses Spiel kennt sie nicht.** Ihr erstellt bis zu drei eigene Figuren — zehn Völker,
zehn Klassen, acht Hintergründe, Punktekauf — und die Kampagne bindet sich zur Laufzeit neu:

| Haken | geht an |
|---|---|
| Der Brief | wer am ehesten liest (Gelehrter, sonst höchste Nachforschungen) |
| Das Register | wer am besten stiehlt |
| Das Instrument | wer auftreten kann — Perrick merkt es sich |
| Das Feuer | wer Feuerschaden wirken kann (die Nassen Kleinen sind dagegen verwundbar) |
| Die Stimme | wer in der Bürgerversammlung spricht |
| Das Auge | wer bemerkt, dass Mutter Hesse jeden Namen zweimal sagt |
| Der Krug | wen Grust beim Trinkspiel gewinnen lässt |
| Der Stein | wer spürt, dass der Stab nicht schweigt, sondern wartet |

Auch die beiden Session-Zero-Fragen aus Band I, Kapitel 3 gehören euch:

* **„Was bereut dein Charakter?"** — die Steinernen Zeugen im Spiegelhof sprechen es wörtlich aus.
* **„Was hat dein Charakter verloren?"** — im Spiegelgang seht ihr euch ohne diesen Verlust.

Nach der Erschaffung zeigt das Spiel, was es jetzt über euch weiß. Der Beutel (`I`) zeigt es später wieder.

**Auch zu zweit oder allein.** Die Begegnungen des Begleitbands sind für drei Charaktere
gerechnet. Zieht ihr mit weniger los, zieht die Gegenseite mit: Fußvolk wird in der Zahl
gekürzt, Bosse bleiben stehen und geben stattdessen Trefferpunkte ab. Eine Figur allein
bleibt trotzdem das härtere Spiel — eine Magierin mit sieben Trefferpunkten hat niemanden,
der vor ihr steht.

---

## Umfang

**Akt I — Klarwasser** (Stufe 1–5)
Prolog (Taverne, Waldweg, die Weggabelung mit den drei legendären Gegenständen, Goblinlager,
Lagerfeuer), Ankunft und Erntefest, die Nassen Kleinen, Miris Verschwinden, die Ermittlung mit
vier Knoten, die überfluteten Mühlkeller, der Spiegelhof mit vier Stationen und der Audienz,
die Neumondnacht mit **vier Auflösungen** und der Verrat.

**Akt II — Der Riss** (Stufe 5–7)
Gefesselt in der zweiten Kammer, drei Wege aus den Fesseln, der Wasserweg, die erste
Konfrontation, der Marktplatz unter dem Netz: **dreiphasiger Endkampf** mit allen drei
Gegenmitteln und drei Ausgängen. Epilog.

**Akt III — Die Asche des Klauth** (Stufe 7–13)
Aschfeld, die Aschespur, das Konsortium, Ysera Vohl, das Brutnest, der offene Angriff, der Hort.
Klauth ist verhandelbar — über genau einen Zugang.

**Akt IV — Das Buch und die Feder** (Stufe 13–20)
Vergessensgrade und Anker, die Aschenmark, die Bibliothek der Letzten Worte, ein Prozess vor
Kelemvor ohne einen einzigen Würfel für Schaden, der Federhof, die Spinne ohne Namen —
und der Name unter der Feder, mit **sechs Ausgängen**.

50 Dialoge · 76 Ereignisse · 20 Kämpfe · 18 Enden · 25 Schauplätze.

---

## Was das Spiel von der Vorlage übernimmt

* **Die Uhr der Stillen Tiefe.** Sechs Kästchen, oben rechts sichtbar. Sie füllt sich bei
  langen Rasten in Klarwasser, bei öffentlichen Anschuldigungen, bei ignorierten Zeichen und
  bei Tagen ohne Fortschritt. Bei 6/6 verschwindet Nella, und es bleibt der harte Weg.
* **Der Stab der Bindung** erwacht in Stufen: Stock → elf lesbare Namen → Macht der Stillen
  Tiefe → volle Kraft im Endkampf. Am Ende von Akt I wandern die elf Namen aus dem
  zerfallenden Buch in seine Runen. Ab da ist er das einzige Gefäß, das Namen halten kann —
  darauf beruht der gesamte Akt IV.
* **Abschreiben statt Vorlesen.** Wer die elf Namen im Kirchenregister nur laut liest,
  verliert sie eine Minute später. Wer sie abschreibt, gewinnt dreimal: gegen die Ertrunkene
  Mutter, gegen die Fesseln und im Endkampf an den Gründersteinen.
* **Verhandelbare Gegner.** Ysmereth ist bis zum letzten Trefferpunkt verhandelbar. Klauth
  auch. Die Steinernen Zeugen legen sich auf ein Klopfzeichen hin. Mutter Hesse gewinnt jede
  Rechnung — angreifbar ist nur die Freiwilligkeit.
* **Gegnerwerte** stammen unverändert aus den Bögen des Begleitbands, einschließlich der
  Skalierung für drei Charaktere.

## Was es anders macht

* Die Wahl an der Weggabelung ist **echt**: Stab, Schriftrolle oder Buch. Was liegen bleibt,
  liegt weiter dort — und Ghortan holt sich, was er kann. Die Rückkehr ist eine Nebenaufgabe,
  die die Uhr zweimal kostet.
* Die tote Katze auf dem Waldweg ist keine Vorgabe mehr, sondern eure Entscheidung. Die
  Auszahlung im Chor der Elf kommt trotzdem.
* Akt III tritt nur ein, wenn Ghortan wirklich erschlagen wurde — sonst führt der Weg direkt
  in Akt IV, wie es Band I vorsieht („ein Drache rächt keinen Nachfahren, der noch lebt").

---

## Steuerung

| | |
|---|---|
| Linksklick Boden | Die Gruppe geht dorthin |
| Linksklick Marke | Gespräch (❝), Untersuchen (✷), Kampf (⚔), Ausgang (➜) |
| Rechte Maustaste ziehen | Kamera drehen · Mausrad zoomt |
| `J` `C` `I` `H` `M` | Journal, Charakterbogen, Beutel, Hilfe, Karte |
| `Esc` | Menü / Zielmodus abbrechen |
| `1`–`9` | Aktion im Kampf wählen · `Leertaste` beendet den Zug |

---

## Technik

* **Babylon.js 7.54.3**, lokal unter `vendor/babylon.js` (MIT, Lizenz daneben).
  Kein Build, keine Abhängigkeiten zur Laufzeit, kein Netzzugriff.
* **Kein einziges geladenes 3D-Modell.** Jede Figur, jedes Haus, jeder Brunnen entsteht aus
  Grundkörpern: Volk bestimmt Statur, Klasse bestimmt Ausrüstung. Häuser werden aus ihrem
  Grundriss auf der Karte erzeugt, damit Modell und Kollision immer deckungsgleich sind.
* **Kämpfe mit eigenem Schlachtfeld** bekommen ihre Kulisse aus der Kampfkarte selbst:
  übernommen wird nur, was dort noch an seinem Platz steht, Deckung und Gebäude werden zum
  Thema passend nachgestellt. Was das Regelwerk als Deckung zählt, sieht man auch.
* **Sparmodus**: Erkennt das Spiel nach zwei Sekunden weniger als 22 Bilder/s, schaltet es
  Nachbearbeitung und Schatten ab und senkt die Auflösung.
* Spielstände liegen im `localStorage` (bis zu zwölf).

### Aufbau

```
index.html
vendor/babylon.js          Babylon.js (UMD), lokal
src/
  main.js                  Spielsteuerung, Bildschirme, Wegfindung
  engine/
    rng.js                 Seedbarer Zufall, Würfelausdrücke („2W6+3")
    rules.js               5E-Variante: Proben, Rettungswürfe, Zustände, Schaden
    character.js           Charakterbau, Stufenaufstieg, Aktionen, Rasten
    state.js               Flags, Uhren, Journal, Stab, Spielstände
    hooks.js               Umbindung der Charakterhaken auf eigene Figuren
    dialogue.js            Dialoggraph mit sichtbaren Proben
    combat.js              Rundenkampf, KI, legendäre & Schauplatz-Aktionen
  ui/
    view3d.js              Babylon-Szene, Kamera, Hervorhebungen, Effekte
    figures.js             Prozedurale Figuren + Porträts
    props.js               Prozedurale Kulissen
    theme.js               Farbwelten der Schauplätze
    screens.js hud.js dialogueview.js combatview.js panels.js style.css
  data/
    chargen.js spells.js creatures.js areas.js
  content/
    akt1_prolog.js akt1_klarwasser.js akt1_spiegelhof.js akt1_neumond.js
    akt2.js akt3.js akt4.js index.js
test/
  engine.test.mjs          29 Prüfungen: Würfel, Charaktere, Kampf, Zustand
  content.test.mjs         13 Prüfungen: Karten, Verweise, alle Dialoge, alle Kämpfe
  browser.mjs              Oberflächentest
  playthrough.mjs          Durchspiel-Test im echten Browser
```

### Inhalte erweitern

Ein Schauplatz ist ein lesbares Raster:

```js
add({
  id: 'kapelle', name: 'Kapelle der Morgenmutter', theme: 'keller',
  grid: [
    '####################',
    '#..................#',   // .  frei      ,  schwieriges Gelände
    '#..==....==....==..#',   // #  Wand      ~  Wasser
    '#..................#',   // B  Gebäude   =  Deckung
    '##########..########',
  ],
  props: [{ type: 'kerze', x: 4, y: 2 }],
  punkte: [{ id: 'register', x: 9, y: 2, label: 'Das Kirchenregister', typ: 'untersuchen', event: 'register' }],
});
```

Ein Dialog ist ein Graph; Proben sind sichtbar, mit Schwierigkeitsgrad und Erfolgschance:

```js
{ text: '[Überzeugen] Sagt mir die Wahrheit.',
  check: { skill: 'ueberzeugen', dc: 16, success: 'gestellt', fail: 'kalt' } }
```

Ein Kampfaufbau bringt sein Schlachtfeld selbst mit (`makeMap`) oder nimmt die Karte des
Schauplatzes. `kulisse: [...]` stellt zusätzliche Modelle darauf — nötig überall dort, wo
das Gelände Teil der Lösung ist, wie bei den elf Gründersteinen im Endkampf.
`niederlageErlaubt: true` unterdrückt die Wiederholen-Abfrage, wenn eine Niederlage als
Ausgang gemeint ist.

`node test/content.test.mjs` prüft danach automatisch, dass nichts ins Leere zeigt,
kein Dialog in einer Schleife hängenbleibt, jeder Kampf zu einem Ergebnis kommt und die
Kulisse jeder eigenen Kampfkarte auf der Karte bleibt. `node test/playthrough.mjs` spielt
dieselbe Strecke im echten Browser durch (Erschaffung → Probe → Kampf → Klarwasser) und
prüft dabei die Oberfläche mit.

---

## Herkunft

Spielmechanik und Texte folgen der Kampagne „Der Preis von Klarwasser", Band I (Struktur,
Regeln, Sitzungsabläufe, Enden) und Band II/III (Vorgeschichte, Vorlesetexte, Dialoge,
Tabellen, Handouts, Bögen). Vorlesetexte und Schlüsselsätze sind übernommen, wo sie im
Original stehen; alles, was eine Spielleitung am Tisch improvisiert hätte, ist ausgeschrieben.
