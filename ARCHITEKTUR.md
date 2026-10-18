# Klarwasser-Hof – Architektur

Dieses Dokument beschreibt, wie der Kern gebaut ist und wie Bereiche ihn erweitern, ohne
sich gegenseitig in die Quere zu kommen. Es ist die Grundlage für die parallele Arbeit:
Jeder Bereich arbeitet in seinem eigenen Ordner und dockt über Register, Hooks,
Modifikatoren und benannte Kartenpunkte an. Den Teil über die Darstellung (sprites.js,
render.js, ui.js: Bild-Register, Zeichner, Fenster) ergänzt Teil B weiter unten.

Sprache im Code ist Deutsch. Reine ES-Module, kein Build, keine Abhängigkeiten.

---

## 1. Ordner und Besitz

```
src/
  daten.js  karten.js  system.js  logik.js  spiel.js  mine.js  angeln.js     Kern, DOM-frei
  sprites.js  render.js  ui.js  eingabe.js  ton.js  zufall.js  main.js        Kern, Browser
  bereiche/
    inhalt.js        lädt alle bereiche/*/inhalt.js, dann fertig()   (DOM-frei, auch in Node)
    grafik.js        lädt alle bereiche/*/grafik.js                  (Pixelkunst)
    oberflaeche.js   lädt alle bereiche/*/oberflaeche.js             (Fenster, Menüreiter)
    <bereich>/inhalt.js  grafik.js  oberflaeche.js
```

| Bereich | Besitzt (inhalt.js) | Karten | Zustand in `s` |
|---|---|---|---|
| basis | Werkzeuge (Items + `werkzeugArt` hacke, giesskanne, axt, spitzhacke, sense), Grundrohstoffe, Müll, Hindernisse (`objektTyp` baum, stumpf, ast, stein, fels, grossstumpf, unkraut, sammel), Aufstellen aus der Hand, Tipps, Startwerkzeug | – | – |
| hof | Hof und Wohnhaus, Verwildern (neuesSpiel), Nachwachsen (tagEnde), Bett, Fernseher, Versandkiste, Briefkasten | hof, haus (später gewaechshaus) | – |
| dorf | Dorfkarte, Krämerladen, Gasthaus, Mühle als Gebäude, Läden von Ottilie/Bruno/Hannes, Gasthaus-Essen, Spezialware rucksack und upgrade | dorf, laden, gasthaus (später schmiede, rathaus, arzt, museum, hausRosa, muehle) | – |
| wildnis | Strand, Wald und Berg (Platzhalter), Mineneingang am Berg | strand, wald, berg (später fischladen, huetteMats, ranch, turm, geheimwald, zimmerei, gilde) | – |
| pflanzen | Feldfrüchte samt Saat, Wildpflanzen und Strandfunde, Dünger, Säen/Düngen aus der Hand, Spezialware saatgut, Krähen (tagEnde), Startsaat | – | – |
| angeln | Angel (`werkzeugArt` angel), Fische, Köder, Lenes Fischstand, Lenes Angel-Geschenk (Hook gespraech) | – | `s.flags.angelBekommen` |
| mine | Erze, Barren, Mineralien, Schwert (`werkzeugArt` waffe), Monster, Minenebenen (`kartenAnbieter`), Gestein (`objektTyp` mstein, leiter, schatz), Förderkorb, Kampf | mine0, mine1 … mine30 (dynamisch) | `s.mine`, `s.flags.mineOffen` |
| handwerk | Rezepte, Aufstellbares (`objektTyp` truhe, vogelscheuche, sprenger, qsprenger, einmachglas), Marmelade/Eingelegtes | – | – |
| tiere | Hühnerstall (dynamisches Gebäude im Hof-Bereich „stall"), Küken, Hühner im Auslauf, Eier, Spezialware kueken/stall | – | `s.stall` |
| npcs | die sechs Dorfbewohner (Ottilie, Bruno, Lene, Frieda, Mats, Hannes) | – | (`s.npcs` gehört dem Kern) |
| npcs2 | weitere Dorfbewohner (leer) | – | – |
| feste | Feste (leer) | – | `s.feste` (geplant) |
| gemeinschaft | Mühle und Bündel, Schwarzes Brett und Aufträge, Briefe samt Startbrief, Medaille | – | `s.quest`, `s.brett`, `s.buendel`, `s.muehle` |

Was die Bereiche nicht besitzen, gehört dem Kern: `s.spieler`, `s.zeit`, `s.welt`, `s.npcs`
(Freundschaft), `s.versand`, `s.briefe`, `s.post`, `s.stats`, `s.flags`, `s.stufeNeu`.

### Importregeln

* `bereiche/*/inhalt.js` importiert nur DOM-freie Kernmodule: `daten`, `karten`, `system`,
  `logik`, `spiel`, `mine`, `angeln`, `zufall`. Keine anderen Bereiche – Querverweise laufen über
  IDs (Item-IDs, Kartenpunkte, Bedingungsnamen), die erst nach dem Laden aufgelöst werden.
* `grafik.js` darf zusätzlich `sprites.js` und `render.js` importieren, `oberflaeche.js` `ui.js`.
* Der DOM-freie Kern importiert nie aus `bereiche/` (ein Test prüft beides).
* Übergang bis Teil B: `render.js` holt `huehnerDraussen` aus `bereiche/tiere/inhalt.js`,
  `ui.js` holt Mühle/Brett-Logik aus `bereiche/gemeinschaft/inhalt.js` und den Förderkorb aus
  `bereiche/mine/inhalt.js`. Diese Importe verschwinden, sobald die Fenster und Zeichner in die
  Bereiche ziehen.

### Laden

`main.js` importiert zuerst `bereiche/inhalt.js`, `bereiche/grafik.js`, `bereiche/oberflaeche.js`,
dann den Rest. `bereiche/inhalt.js` importiert die Bereiche in dieser festen Reihenfolge und ruft
danach `fertig()` (daten.js), das den Hook `fertig` auslöst:

```
basis, hof, dorf, wildnis, pflanzen, angeln, mine, handwerk, tiere, npcs, npcs2, feste, gemeinschaft
```

Die Reihenfolge bestimmt auch die Reihenfolge der Hooks und der `itemBenutzen`-Kette. Die
Sammeldateien muss niemand ändern; jeder Bereich hat seinen Ordner schon. Tests laden
`bereiche/inhalt.js` genauso.

---

## 2. Register

Jede Registrierung wirft bei doppelter ID (`… gibt es schon`). Absichtliches Überschreiben geht
mit `ersetzen: true` im def (bei `bedingung`, `kategorie`, `bodenTyp` als drittes Argument
`{ ersetzen: true }`). Die bisherigen Exporte (`ITEMS`, `PFLANZEN`, `FISCHE`, `REZEPTE`,
`LAEDEN`, `NPCS`, `BUENDEL`, `BRIEFE`, `TIPPS`, …) bleiben Objekte/Listen und werden über die
Funktionen gefüllt. Abgeleitetes (`SAAT_ZU_PFLANZE`, `FISCHE`, `AUFRUESTBAR`) entsteht beim
Registrieren.

### daten.js

| Funktion | Felder | Beispiel |
|---|---|---|
| `kategorie(id, name)` | Anzeigename einer Item-Kategorie (`KATEGORIE_NAME`) | `kategorie('ring', 'Ring')` |
| `item(id, def)` | `name, kat, preis, bild: { art, f, f2 }, text`/`beschreibung, energie, gesundheit, buff, tempo, stapel` (Standard: alles außer Werkzeug), `verkaufbar` (Standard: nicht werkzeug/platz/besonders), `verschenkbar, aufstellbar` (true oder Objekttyp), `aufruestbar, werkzeug` (Werkzeugart), `waffe: { schaden: [von, bis] }, koeder: { biss }, fundort, saisonal, strand, selten, kauf, pflanze, frucht, gemuese` und beliebige Zusatzfelder. `energie` und `wert` dürfen `(slot) => Zahl` sein. Alte Form `item(id, name, kat, preis, bild, extra)` geht weiter. | `item('rubinring', { name: 'Rubinring', kat: 'ring', preis: 300, bild: { art: 'ring', f: '#e0344a' }, ring: { schaden: 0.1 } })` |
| `pflanze(id, def)` | `saat, ernte, tage, nach`/`nachwachsen, jz: [...], menge, extra` (Chance auf +1), `wuchs, farbe, rankhilfe, riesig` | `pflanze('erdbeere', { tage: 8, nach: 4, jz: ['fruehling'], wuchs: 'busch' })` |
| `fisch(id, def)` | `name, preis, bild, schwierigkeit` (0–100), `verhalten` (ruhig/gemischt/flink/sinker), `orte` (Gewässerarten: teich, fluss, see, waldsee, meer, geheimteich, mine), `jz, zeit: [von, bis)` als Uhrzeit 600–2600, `wetter` (sonne/regen) | `fisch('saibling', { name: 'Saibling', preis: 90, bild: {…}, schwierigkeit: 50, verhalten: 'flink', orte: ['see'], jz: ['herbst'] })` |
| `muell(art, ids)` | Fang, der kein Fisch ist, je Gewässerart | `muell('see', ['stiefel'])` |
| `rezept(id, def)` | `art: 'basteln' \| 'kochen', zutaten: { id: n }, ergebnis` (Standard id), `menge, stufe: [skill, n]` oder `frei(s)` | `rezept('pilzpfanne', { art: 'kochen', zutaten: { pilz: 2 } })` |
| `laden(id, def)` | `name, npc, ort: { karte, punkt }` (Theke), `kauft: [Kategorien], ware: [...]` oder `ware(s)`, `zeiten: [von, bis]`, `ruhetag: 'Mittwoch'`. Ware: `{ id, preis, bedingung }` oder `{ spezial }`. Offen ist, wenn die Person an der Theke steht. | `laden('ranch', { name: 'Ranch', npc: 'wilma', ort: { karte: 'ranch', punkt: 'theke' }, ware: [{ spezial: 'kuh' }] })` |
| `spezialWare(id, def)` | Käufe mit Sonderwirkung: `name, preis, text, zutaten, verfuegbar(s, ware)`, `angebote(s, ware) → [ware…]` (ersetzt den Eintrag durch mehrere), `kaufen(s, { ware, n }) → { text }` oder `{ grund }` | siehe dorf: `upgrade`, tiere: `kueken` |
| `npc(id, def)` | `name, voll, rolle, aussehen, geburtstag, liebt, mag, magNicht, hasst, heim: { karte, punkt }, plan: { normal, regen }, zeilen, antwort, herzGeschenk` | siehe npcs/inhalt.js |
| `buendel(id, def)` | `name, raum, items: [id \| { id, n }], noetig, belohnung: { id, n } \| { gold }` | siehe gemeinschaft |
| `brief(id, def)` | `von, text` (`{name}`, `{hof}`), und `tagNr` (einmal ab Tag) oder `jz`+`tag` (jährlich) oder `wann(s)` (einmal, sobald wahr); `start: true` = Brief zum Spielbeginn | `brief('wilma_kuh', { von: 'Wilma', text: '…', wann: (s) => s.tiere?.stall })` |
| `tipp(text)` | Tipp des Tages im Fernseher | |
| `objektTyp(t, def)` | Objekte auf der Karte (`welt.objekte["x,y"] = { t, … }`): `blockiert, axt(c), spitzhacke(c), sense(c), hacke(c), waffe(c)` (geben `true` zurück, wenn getroffen), `interagieren(c), einlegen(c)` (Gegenstand aus der Hand), `aufnehmen(c) → erg` (Aktionstaste und Drüberlaufen), `nacht(c), minuten(c, n), hinweis` (Text oder `(c) => Text`), `licht, anlegen(o, slot), nichtLeer(o) → Grund, item` (was man beim Aufheben bekommt), `kraehenSchutz` (Radius) | `objektTyp('fass', { blockiert: true, axt: L.aufheben, spitzhacke: L.aufheben, minuten(c, n) {…} })` |
| `bedingung(name, fn(s))` | für `nurWenn`, `tuerWenn`, `bedingung` an Ware. Statt eines Namens geht auch `'!name'`, eine Funktion oder eine Liste (alle) | `bedingung('scheune', (s) => !!s.tiere?.scheune)` |
| `werkzeugArt(art, def)` | `skill` (Energiekosten), `wiederholbar, aufladbar, dauer, schwungTon, schaden: [von, bis], upgradeText, felder(zx, zy, blick, ladung)`, `wirkung(ctx) → erg` (ctx: `s, ort, id, art, felder, zx, zy, ladung, S`), oder `benutzen(ctx)` statt Schwung | `werkzeugArt('melkeimer', { wirkung(c) {…} })`; Item: `werkzeug: 'melkeimer'` |
| `itemBenutzen(pruefen, fn)` | Gegenstand aus der Hand benutzen (Leertaste). Der erste Handler, dessen `pruefen(c)` stimmt, läuft. c: `s, ort, x, y, kk, o, slot, idx, it, f` (Spielerfeld), `S` | `itemBenutzen((c) => c.it.id === 'totem', (c) => …)` |
| `fertig()` | einmal nach dem Laden aller Bereiche (macht `bereiche/inhalt.js`) | |

Tabellen im Kern: `WERKZEUG_STUFEN` (Basis, Kupfer, Eisen, Gold, Iridium – ein Upgrade wird nur
angeboten, wenn sein Barren als Item existiert), `QUALITAET` (normal, Silber, Gold, Iridium mit
Faktor 2), `KANNE_INHALT` (40 … 100), `FAEHIGKEITEN`, `XP_STUFEN`.

### karten.js

| Funktion | Zweck |
|---|---|
| `karte(def)` | feste Karte registrieren (Format siehe 5.) |
| `bodenTyp(z, def)` (= `bodenArt`) | Bodenzeichen: `{ name, begehbar, farmbar, wasser, wand }` |
| `kartenAnbieter(pruefen(id), erzeugen(id, s) → def)` | Karten, die erst bei Bedarf entstehen |

### mine.js

| Funktion | Zweck |
|---|---|
| `monster(id, def)` | `name, hp, schaden, tempo, xp, farbe, art` (schleim/fledermaus), `fliegt, beute: [[id, chance, von, bis]]`, optional `schritt(m, dt, spieler, frei)` für eigenes Verhalten |
| `hoehleGraben(r, { breite, hoehe, dichte, mindestens, boden })` | Höhlenform (zellulärer Automat, größte Fläche) für eigene Ebenen |

### spiel.js (Laufzeit)

| Funktion | Zweck |
|---|---|
| `dekoAktion(name, fn(d, ctx), hinweis)` | Deko mit `aktion: name`; `hinweis` ist Text oder `(d, s) => Text` |
| `gebaeudeAktion(name, fn(g, ctx), hinweis)` | Gebäude mit `aktion: name` |

Kern-Aktionen: `laden` (Theke, `d.laden`), `text` (Schild, `d.text`).

Helfer für Bereiche: `S` (Laufzeit), `ton, meldung, dialog(npcId, texte, optionen, danach),
frage(text, optionen), fenster(name, daten), fundeZeigen`/`fundeAnzeigen, ergebnisZeigen(erg),
geben(slot), spielerFeld, blickZu, schwebeText, partikel, staub, spritzer, splitter, halme,
blaetter, puff, ringe, herzchen, karteBetreten(id, x, y, blick), wechseln(karte, x, y, blick),
wechselnZu({ karte, punkt }), schieben, schlafen, postZeigen, npcAnsprechen, ladenOeffnen`.
Die Oberfläche hängt sich über `S.hooks` an (dialog, frage, fenster, meldung, funde, ton,
tagEnde, stufe, ueberblende, karteGewechselt); Bereiche rufen die Helfer, nie `S.hooks` direkt.

---

## 3. Hooks (system.js)

```js
import { system } from '../../system.js';
system({ name: 'tiere', ergaenzen(s) { s.tiere ??= { … }; }, tagEnde(s, bericht, r) { … } });
```

`alle(name, …)` ruft jeden Hook, `erster(name, …)` liefert den ersten Rückgabewert
`!== undefined`, `sammle(name, …)` hängt zurückgegebene Listen aneinander. Neue Hook-Namen
gehören in `BEKANNTE_HOOKS` (sonst schlägt ein Test an).

| Hook | Art | Aufrufstelle |
|---|---|---|
| `neuesSpiel(s, r)` | alle | Ende von `L.neuesSpiel`, vor den ersten Sammelfunden und der Post |
| `ergaenzen(s)` | alle | `L.ergaenzen` – nach dem Anlegen und nach jedem Laden; fehlende Felder nachtragen (`??=`) |
| `tagEnde(s, bericht, r)` | alle | `L.tagBeenden`, nach Kalender, Wetter, Wachstum, Regen und Objekt-`nacht`, vor Sammelfunden, Post und Speichern; `bericht.meldungen` sammelt Zeilen |
| `morgen(s, bericht)` | alle | Ende von `L.tagBeenden` (neuer Tag, Wetter steht fest) |
| `minuten(s, n)` | alle | `L.zeitVergeht` alle 10 Spielminuten (spiel.js), nach Objekt-`minuten` |
| `fertig()` | alle | `fertig()` nach dem Laden aller Bereiche |
| `karteBetreten(ort)` / `karteVerlassen(ort)` | alle | `karteBetreten` in spiel.js |
| `update(dt)` | alle | jedes Bild, wenn das Spiel läuft (nach den Dorfbewohnern, vor der Spielerin) |
| `interagieren(ctx)` | erster | Aktionstaste, vor der Standardbehandlung; ctx: `s, ort, x, y, f, npc, slot, idx, S` |
| `hinweis(ctx)` | erster | jedes Bild: Text, was die Aktionstaste täte (wie interagieren) |
| `schwung(ctx)` | alle | nach der Wirkung eines Werkzeugs (Monster treffen …); ctx wie `wirkung` plus `erg` |
| `npcAnsprechen(npc, ctx)` | erster | bevor das Gesprächsmenü aufgeht (Auftrag abgeben) |
| `npcOptionen(npc, s)` | sammle | zusätzliche Auswahlpunkte `[text, fn]` im Gespräch |
| `npcPlan(npcDef, s)` | erster | ersetzt den Tagesplan (Feste, Ehe) |
| `gespraech({ s, id, ort, r })` | erster | ersetzt ein Gespräch (Geschenke, Ereignisse); Rückgabe `{ texte, items }` |
| `gegessen(s, slot)` | alle | nach dem Essen (Buffs) |
| `gebaeude(ort, s)` / `deko(ort, s)` / `objekteDynamisch(ort, s)` | sammle | zusätzliche Gebäude, Deko, Objekte (`{ x, y, t, … }`) je Karte – gebaute Ställe, Festaufbauten |

Gebäude, Deko und dynamische Objekte landen im **Kartenstand** (`L.kartenStand(s, def)`), der
Blockaden und Feld-Indizes cacht. Er wird neu berechnet, wenn sich eine Bedingung der festen
Gebäude/Deko oder der Tag ändert. Ändert ein Bereich seine dynamischen Gebäude mitten am Tag
(Kauf, Fest beginnt), ruft er `L.kartenGeaendert()`.

## 4. Modifikatoren

```js
import { modifikator } from '../../system.js';
modifikator('energieKosten', (wert, k) => (k.s.flags.buffKaffee ? wert * 0.8 : wert));
```

`mod(name, wert, kontext)` faltet alle Modifikatoren in Registrierungsreihenfolge.

| Name | Aufrufstelle | Kontext |
|---|---|---|
| `energieKosten` | `L.energieKosten` (Werkzeuge) | `s, werkzeug, ladung` |
| `laufTempo` | Bewegung in spiel.js (Pixel/s, Grund 76) | `s` |
| `verkaufspreis` | `L.preisVon(slot, s)` (Versand, Laden, Anzeige) | `s, slot` |
| `xp` | `L.xpGeben` | `s, skill` |
| `ernteQualitaet` | `L.ernten` (0–3) | `s, ort, x, y, feld, pflanze` |
| `wachstum` | Nachtwachstum je gegossenem Beet (Tage, Grund 1) | `s, ort, feld, pflanze` |
| `fangBalken` | Größe des grünen Balkens (angeln.js) | `s, fisch` |
| `bissZeit` | Sekunden bis zum Anbiss (angeln.js) | `s, koeder, wasser` |
| `schaden` | Schaden der Spielerin an Monstern (mine) | `s, monster, waffe` |
| `verteidigung` | wird vom Monsterschaden abgezogen (mine) | `s, monster` |
| `maxEnergie` / `maxGesundheit` | `L.werteAktualisieren` (Laden, Stufenaufstieg, Morgen) | `s` |
| `glueck` | Tagesglück `s.zeit.glueck` (Morgen), wirkt auf Leitern in der Mine | `s, r` |
| `erzMenge` | Erz aus Gestein und Felsbrocken | `s, id` |

---

## 5. Karten

### Format

```js
karte({
  id: 'wald', name: 'Wald', aussen: true, farmbar: false, innen: 'haus', rand: 'wald',
  wasser: 'fluss',                                 // Standard-Gewässerart
  grid: [...Zeilen] | fertigRaster(g),
  gebaeude: [{ typ, x, y, w, h, tuer: { x, y }, ziel: { karte, punkt }, zu, aktion, nurWenn, tuerWenn, sonst }],
  deko: [{ typ, x, y, w, h, aktion, wand, begehbar, licht, nurWenn, … }],
  warps: [{ x, y, w, h, karte, punkt }],           // Streifen am Rand
  punkte: { vonHof: [14, 2, 'unten'] },            // [x, y, blick?]
  bereiche: { fest: [17, 2, 11, 6] },              // [x, y, b, h]
  gewaesser: [{ x, y, b, h, art: 'waldsee' }],
  sammel: [{ x, y, w, h, art: 'wald', max: 3, boden: '.' }],
  npcWege: false,                                  // Dorfbewohner gehen hier nicht durch
});
```

Gebäude blockieren ihr Rechteck; die Tür liegt in der untersten Reihe und ist begehbar, wenn
das Gebäude ein `ziel` hat und `tuerWenn` stimmt. Deko blockiert, außer `wand` oder
`begehbar`. Bodenzeichen: `. : = s ~ h _ t m # X` (siehe karten.js), weitere über `bodenTyp`.

### Bau-Helfer für große Karten

`raster(b, h, z)` → Feld aus Zeichen, `rechteck(g, x, y, b, h, z)`, `ellipse(g, cx, cy, rx, ry, z)`,
`pfad(g, [[x, y], …], breite, z)` (Breite wächst nach rechts/unten), `rahmen(g, z, dicke)`,
`fertigRaster(g)` → Zeilen. Beispiel: Wald und Berg in `bereiche/wildnis/inhalt.js`.

### Punkte, Bereiche, Gewässer

* `punkt(karte, name)` → `{ x, y, blick }`, `bereichVon(karte, name)` → `{ x, y, w, h }`.
* Warps (`{ karte, punkt }`), Türen (`ziel: { karte, punkt }`), NPC-Pläne (`[zeit, karte, punkt]`),
  NPC-Zuhause (`heim: { karte, punkt }`) und Läden (`ort: { karte, punkt }`) verweisen über
  Punkte. **Andere Bereiche verweisen nur über Punkte auf eine Karte, nie über Koordinaten.**
  Koordinaten-Formen (`zx/zy`, `{ x, y }`, `[zeit, karte, x, y]`) gehen weiter, aber nur innerhalb
  des eigenen Bereichs.
* `wasserArt(ort, x, y)` liefert die Gewässerart eines Felds (Rechteck aus `gewaesser`, sonst
  `wasser`). Jede auf Karten benutzte Art braucht in jeder Jahreszeit einen Fisch (Test).

### Dynamische Karten

`kartenAnbieter(pruefen, erzeugen)`; `karteHolen(id, s)` liefert feste oder erzeugte Karten
(gecacht, `karteVergessen(id)` verwirft). Mit `fluechtig: true` entsteht die Karte bei jedem
Betreten neu; dann gehören dazu `weltStart` (Objekte), optional `monsterStart`, Punkt `start` und
`speicherOrt: { karte, punkt }` (dort steht man nach dem Laden). Nicht flüchtige dynamische Karten
(Stall-Innenräume) speichern ihren Zustand wie feste Karten in `s.welt[id]`.

### Verbindungen und Wege

`verbindungen()` listet alle Warps und Türen fester Karten (gecacht, neu nach jeder
Kartenregistrierung). `L.wegPlanen(s, von, ziel)` sucht Kartenfolge und Felder (Breitensuche,
numerische Indizes) und gibt `{ schritte, ok }` zurück; `ok: false` heißt, dass gesprungen wird.

### Weltgraph

Warp-Streifen am Kartenrand, Ankunftspunkt 1–2 Felder innen:

| von | Rand | nach Punkt | Rückweg landet auf |
|---|---|---|---|
| hof | Ost | dorf `vonHof` | hof `vonDorf` |
| hof | Süd | wald `vonHof` | hof `vonWald` |
| hof | Nord | berg `vonHof` | hof `vonBerg` |
| dorf | Süd | strand `vonDorf` | dorf `vonStrand` |
| dorf | Nord | berg `vonDorf` | dorf `vonBerg` |
| dorf | West, untere Hälfte | wald `vonDorf` | dorf `vonWald` |

Der Mineneingang (Höhle mit `tuerWenn: 'mineOffen'`) liegt am Berg vor Punkt `vorMine` und führt
auf `mine0.eingang`.

### Punkte-Vertrag

Jeder Bereich liefert die Punkte seiner Karten, sobald es die Karte gibt; NPC-Pläne, Läden und
Feste anderer Bereiche benutzen sie. Der Test `test/karten.test.mjs` prüft die Liste.

| Karte | Pflicht-Punkte | Bereiche |
|---|---|---|
| hof | vonDorf vonWald vonBerg vorHaus vorGewaechshaus versandkiste briefkasten | bauland (dazu stall, auslauf) |
| haus | eingang bett fernseher kueche partner | |
| gewaechshaus | eingang | |
| dorf | vonHof vonStrand vonBerg vonWald brunnen platz brett bank1 bank2 fluss1 fluss2 spielplatz friedhof garten vorLaden vorGasthaus vorSchmiede vorRathaus vorArzt vorMuseum vorMuehle vorHausRosa | fest (≥ 16×12) |
| laden | eingang theke regal bett_ottilie bett_jonas | |
| gasthaus | eingang theke tisch1 tisch2 tisch3 kamin billard bett_hannes | |
| schmiede | eingang theke amboss bett_bruno | |
| rathaus | eingang schreibtisch bett_frieda | |
| arzt | eingang theke bett_theo | |
| museum | eingang theke lesesaal bett_mira | |
| hausRosa | eingang kueche bett_rosa bett_pia | |
| muehle | eingang | |
| strand | vonDorf steg vorFischladen vorHuetteMats strand1 strand2 gezeiten lagerfeuer | fest |
| fischladen | eingang theke bett_lene | |
| huetteMats | eingang staffelei bett_mats | |
| wald | vonHof vonDorf vorRanch vorTurm haendler see1 fluss1 lichtung vorGeheimwald | fest |
| ranch | eingang theke bett_wilma bett_sanne | |
| turm | eingang buch bett_oswin | |
| geheimwald | vonWald | |
| berg | vonHof vonDorf vorMine vorZimmerei vorGilde see1 steinbruch | |
| zimmerei | eingang theke werkbank bett_greta bett_kai bett_nele | |
| gilde | eingang theke bett_alrik | |
| mine0 | eingang (dazu leiter) | |

Zusätzliche Punkte sind erlaubt (das Dorf hat etwa `amboss`, `ladenbeet`, `sprechstunde`,
`muehlblick`, `vorAtelier`, der Strand `stand`, das Gasthaus `tresen1`, `tresen2`). Wer eine Karte
neu baut, behält alle Punkte, die andere benutzen – die Tests zeigen, wenn einer fehlt.
Geplante Dorfbewohner (für Heime und Betten): Jonas, Theo, Mira, Rosa, Pia, Wilma, Sanne, Oswin,
Greta, Kai, Nele, Alrik.

---

## 6. Spielstand

* `SPEICHER_SCHLUESSEL = 'klarwasser-hof-v2'`, `SPEICHER_VERSION = 2`. Ältere Stände werden
  ignoriert (anderer Schlüssel) bzw. beim Laden abgelehnt.
* Gespeichert wird `JSON.stringify(s)` jeden Morgen und auf Wunsch. Laufzeitzustand (`S`) wird
  nicht gespeichert; `zustandSichern()` überträgt die Position.
* Bereichszustand liegt in eigenen Schlüsseln (Tabelle in 1.) und wird im Hook `ergaenzen`
  mit `??=` angelegt, damit auch ältere v2-Stände die neuen Felder bekommen. Freischaltungen
  kommen nach `s.flags`. Ein Bereich ändert nie die Schlüssel eines anderen.
* Was in `s` liegt, muss JSON-fähig sein (keine Funktionen, keine Map/Set). Ein Test lädt und
  speichert einen Stand und vergleicht.

---

## 7. Tests

```bash
npm test                    # node test/alle.mjs: jede test/*.test.mjs nacheinander
node test/alle.mjs karten   # nur Dateien, deren Name „karten" enthält
CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node test/browser.mjs
```

| Datei | Prüft |
|---|---|
| `register.test.mjs` | doppelte IDs, `ersetzen`, Vollständigkeit der Items, Bedingungen, Aktionen, Objekttypen, Hooks werden gerufen, Modifikatoren wirken, Ordner und Importregeln |
| `karten.test.mjs` | Raster und Bodenzeichen, Punkte-Vertrag, Weltgraph, jeder Warp/jede Tür auf begehbarem Feld, alle Punkte begehbar, jeder NPC erreicht alle Planziele, Läden, Kartenanbieter, Caches, Wegsuche auf 100×72 |
| `logik.test.mjs` | Daten, Feldarbeit, Rucksack, Versand, Läden, Stall, Basteln, Dorf, Aufträge, Mühle, Mine, Speichern |
| `tag.test.mjs` | ganze Tage: Wege der Dorfbewohner, Ohnmacht um zwei Uhr |
| `laufzeit.test.mjs` | Laufzeit ohne Bildschirm: Rundgang durch den Weltgraphen, Mine, Werkzeuge, Gespräche, Hühner |
| `browser.mjs` | Rauchtest in Chromium: neues Spiel, Feldarbeit, Menü, Rundgang bis in die Mine, jedes Item hat ein Bild, Schlafen, Speichern (v2), keine Konsolenfehler |

Bereiche legen eigene `test/<bereich>.test.mjs` an (Vorlage: Kopf mit `test()`/`gruppe()` wie in
den vorhandenen Dateien, erste Zeile `import '../src/bereiche/inhalt.js';`). `alle.mjs` findet sie
von selbst.

Playwright liegt unter `/opt/node22/lib/node_modules/playwright`. Scheitert `import 'playwright'`,
hilft ein Symlink `node_modules/playwright -> /opt/node22/lib/node_modules/playwright`
(`node_modules/` ist in `.gitignore`).

---

## 8. Regeln für parallele Arbeit

1. **Nur im eigenen Bereich ändern.** Inhalte, Karten, Kunst und Fenster eines Bereichs liegen
   in seinem Ordner. Querverweise auf andere Bereiche nur über IDs und Kartenpunkte.
2. **Kernänderungen klein halten** und als neuen Hook, neues Register-Feld oder neuen
   Modifikator einbauen – nie als Sonderfall für einen Bereich (`if (id === 'lene')` gehört in
   den Bereich, nicht in den Kern). Neue Hook-Namen in `BEKANNTE_HOOKS` eintragen.
3. **Punkte-Vertrag halten.** Wer eine Karte umbaut, behält alle Pflicht-Punkte und alle Punkte,
   die andere benutzen; Warps und Ankunftspunkte des Weltgraphen bleiben am selben Rand.
4. **IDs sind global.** Vor dem Anlegen prüfen, ob es die ID schon gibt; Präfixe helfen
   (`fest_…`, `brief_wilma_…`). Doppelte IDs brechen beim Laden ab.
5. **Zustand im eigenen Schlüssel**, angelegt in `ergaenzen`. Nie fremde Schlüssel umbauen.
6. **Sammeldateien nicht anfassen**; die Reihenfolge der Bereiche ist fest.
7. **Leistung für große Karten (bis 100×72):** keine Arbeit pro Feld und Bild. Begehbarkeit,
   Gebäude, Deko und Bodenflags sind gecacht (`kartenStand`, `bodenRaster`); dynamische
   Änderungen mit `L.kartenGeaendert()` melden. Für viele Prüfungen `L.begehbarPruefer` nehmen,
   für Feldsuchen Indizes `y * w + x`. `update`- und `hinweis`-Hooks früh verlassen, wenn sie auf
   der aktuellen Karte nichts zu tun haben.
8. **Vor dem Zusammenführen:** `npm test` und der Browser-Rauchtest sind grün.

---

## 9. Darstellung

*(ergänzt Teil B: Bild-Register in sprites.js, Zeichner-Ebenen in render.js, Fenster und
Menüreiter in ui.js, Kulling für große Karten.)*
