# Klarwasser-Hof – Architektur

Dieses Dokument beschreibt, wie der Kern gebaut ist und wie Bereiche ihn erweitern, ohne
sich gegenseitig in die Quere zu kommen. Es ist die Grundlage für die parallele Arbeit:
Jeder Bereich arbeitet in seinem eigenen Ordner und dockt über Register, Hooks,
Modifikatoren und benannte Kartenpunkte an. Die Darstellung (sprites.js, render.js, ui.js:
Bild-Register, Zeichner-Ebenen, Fenster) steht in Abschnitt 9.

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
Welche Kunst und welche Fenster in `grafik.js` und `oberflaeche.js` liegen, steht in 9.4.

### Importregeln

* `bereiche/*/inhalt.js` importiert nur DOM-freie Kernmodule: `daten`, `karten`, `system`,
  `logik`, `spiel`, `mine`, `angeln`, `zufall`. Keine anderen Bereiche – Querverweise laufen über
  IDs (Item-IDs, Kartenpunkte, Bedingungsnamen), die erst nach dem Laden aufgelöst werden.
* `grafik.js` importiert den DOM-freien Kern, `sprites.js`, `render.js` und das eigene
  `./inhalt.js`; `oberflaeche.js` den DOM-freien Kern, `ui.js`, `sprites.js` und das eigene
  `./inhalt.js`. Andere Bereiche nie – auch Bilder und Fenster finden sich über Namen
  (`KUNST.truhe`, `fenster('laden')`, `WARE_BILD.kueken`).
* Der Kern importiert nie aus `bereiche/` – weder der DOM-freie noch `sprites.js`, `render.js`,
  `ui.js` (Tests prüfen beides).

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

Hier die Register der Spiellogik; die Register der Darstellung (Bilder, Zeichner, Fenster)
stehen in Abschnitt 9. Jede Registrierung wirft bei doppelter ID (`… gibt es schon`).
Absichtliches Überschreiben geht mit `ersetzen: true` im def (bei `bedingung`, `kategorie`,
`bodenTyp` als drittes Argument `{ ersetzen: true }`). Die bisherigen Exporte (`ITEMS`,
`PFLANZEN`, `FISCHE`, `REZEPTE`, `LAEDEN`, `NPCS`, `BUENDEL`, `BRIEFE`, `TIPPS`, …) bleiben
Objekte/Listen und werden über die Funktionen gefüllt. Abgeleitetes (`SAAT_ZU_PFLANZE`,
`FISCHE`, `AUFRUESTBAR`) entsteht beim Registrieren.

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
  kampf: true,                                     // Gesundheitsleiste zeigen (in der Mine immer)
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
| `darstellung.test.mjs` | Darstellung ohne Bildschirm (lädt auch `bereiche/grafik.js` und `bereiche/oberflaeche.js`): jedes Item, jede Deko, jedes Gebäude, jeder Objekttyp, jede Wuchsform, jedes Monster, jedes Bodenzeichen hat ein Bild; Innenraum-, Wasser- und Bandfarben; doppelte Bilder werfen; Zeichner-Ebenen und ihre Reihenfolge; jedes geöffnete Fenster ist registriert; Menüreiter; Warenbilder; Importregeln von grafik.js/oberflaeche.js |
| `browser.mjs` | Rauchtest in Chromium: neues Spiel, Feldarbeit, Menü, Rundgang bis in die Mine, jedes Item/jede Deko/jedes Gebäude/jedes Objekt/jede Pflanze malt ohne Ersatzbild (alle Jahreszeiten, Tag und Nacht), Ersatzbilder für Fehlendes, Kulling auf einer 100×72-Karte, alle Fenster öffnen sich, Schlafen, Speichern (v2), keine Konsolenfehler |

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
8. **Darstellung im eigenen Bereich.** Kunst über die Bild-Register in `grafik.js`, eigene
   Zeichenschritte als `zeichner` statt Sonderfällen in render.js, Fenster und Menüreiter über
   `fensterArt`/`menueReiter` in `oberflaeche.js`. Bildnamen sind global wie IDs.
9. **Vor dem Zusammenführen:** `npm test` und der Browser-Rauchtest sind grün.

---

## 9. Darstellung

Drei Kernmodule im Browser, jedes mit Registern, die die Bereiche füllen:
`sprites.js` (Bilder), `render.js` (Zeichner-Ebenen), `ui.js` (Fenster, Menü, Anzeige).
Die Kunst liegt in `bereiche/<bereich>/grafik.js`, die Fenster in `bereiche/<bereich>/oberflaeche.js`.
Alle Register lassen sich auch in Node laden (`test/darstellung.test.mjs`); erst das Malen
braucht eine Leinwand.

### 9.1 Bild-Register (sprites.js)

Jede Registrierfunktion wirft bei doppeltem Namen (außer mit `{ ersetzen: true }` als drittem
Argument) und nimmt auch ein Objekt mit vielen Einträgen: `kunst({ hacke(g, b, m) {…}, axt(…) {…} })`.

| Register | Füllen mit | Schlüssel | Eintrag | Kontext |
|---|---|---|---|---|
| `KUNST` | `kunst(art, fn)` | `item.bild.art`, sonst Item-ID | `(g, bild, metall)` malt 16×16; Umriss macht der Kern; `metall` = Farbe der Werkzeugstufe | `bild` = `item.bild` (bei Handwerkswaren mit `f` des Ausgangsstoffs) |
| `OBJEKT_BILD` | `objektKunst(t, def)` | Objekttyp (`welt.objekte[…].t`) | `(o, k) → Leinwand`, `{ bild(o, k) }` oder `{ b, h, schluessel(o, k), malen(g, o, k), umriss }`; dazu Darstellungsfelder (unten). Ohne Eintrag: das Bild des gleichnamigen Items | `{ jz, band, nacht, s, t, tx, ty }` |
| `DEKO_BILD` | `dekoKunst(typ, def)` | `deko[].typ` | `(g, d, k)` malt auf `w×16` oder `{ b(d), h, malen, umriss, zustand(d, k) }` bzw. `{ bild(d, k) }`; dazu Darstellungsfelder | `{ jz, winter, nacht, innen, s, w, zustand }` |
| `GEBAEUDE_BILD` | `gebaeudeKunst(typ, def)` | `gebaeude[].typ` | `{ b, h, malen(g, k), zustand(s) → Objekt, licht: [[px, py]…], umriss }` | `{ jz, winter, nacht, zustand }` |
| `GEBAEUDE_LICHT` | `gebaeudeKunst(…, { licht })` | Gebäudetyp | Fensterpunkte im Bild, die nachts leuchten | |
| `BODEN_BILD` | `bodenKunst(z, fn)` | Bodenzeichen, auch `'z:rand'` (`'#:wald'`) | `(g, x0, y0, k)` malt eine Kachel | `{ tx, ty, z, jz, winter, def, innen (Farben), mf (Bandfarben), rand, gras, nachbarn: { n, s, w, o }, at(x, y) }` |
| `PFLANZEN_BILD` | `pflanzenKunst(name, fn)` | Pflanzen-ID, sonst `wuchs` | `(g, k)` malt Phase 2–4 auf 16×24 (Keimling, Phase 1 und verwelkt macht der Kern) | `{ p, id, phase, f (Erntefarbe), fuss (21), gross (ab Phase 3) }` |
| `MONSTER_BILD` | `monsterKunst(art, fn)` | Monster-ID, sonst `art` | `(g, farbe, phase)` 16×16 | |
| `TIER_BILD` | `tierKunst(art, def)` | Tierart | `(g, schritt)` bzw. `{ b, h, malen }`, nach links schauend; rechts spiegelt der Kern | |
| `SYMBOL` | `symbolKunst(art, fn)` | Symbolname | `(g)` 16×16 für die Oberfläche (`symbolUrl`) | |

Paletten und Farbtabellen (Objekte, Bereiche ergänzen Einträge): `INNEN_FARBEN[def.innen]`
(Tapete, Leiste, Teppich; sonst `standard`), `WASSER_FARBE[def.wasser]`, `MINE_FARBEN[band]`,
`GRAS[jz]`, `LAUB[jz]`, `HOLZ`, `HOLZ_D`, `BLATT`, `BLATT_D`, `BLATT_H`.

**Darstellungsfelder** von Objekten und Deko (render.js wertet sie aus): `tiefe` (Sortier-y
relativ zur Unterkante, Standard −1), `schatten: [rx, ry, dy]`, `durchsichtig: [breite, hoehe]`
(halb durchsichtig, wenn die Spielerin dahinter steht), `danach(g, ding, lage, k)` (zeichnet
gleich danach, `lage = { x, y, bx, by, bild }`), nur Objekte: `versatz(o, k) → [dx, dy]`,
`wackeln` (Standard true, Axt-Treffer); nur Deko: `flach` (sortiert nach der Oberkante: Bett,
Leiter).

**Zwischenspeicher:** Jedes Bild wird einmal gemalt. Was das Aussehen ändert, muss in den
Schlüssel: Jahreszeit und Tag/Nacht nimmt der Kern auf, Deko liefert `zustand(d, k)`, Gebäude
`zustand(s)`, Objekte `schluessel(o, k)`. Eigene Leinwände mit `gecacht(schluessel, fn)` und
einem Präfix des Bereichs.

**Ersatzbild:** Fehlt ein Bild (unbekannte Kunst, Deko, Gebäude, Objekt, Wuchsform, Monster,
Tier, Boden, Symbol), malt der Kern ein magenta-schwarz kariertes Feld in passender Größe,
setzt `leinwand.ersatz = true` und warnt einmal in der Konsole. Es stürzt nichts ab; die Tests
finden das Feld trotzdem.

**Grundfunktionen** (alle exportiert): `leinwand(w, h)`, `gecacht`, `P` (Pixel), `R` (Rechteck),
`E` (Ellipse), `L` (Linie mit Dicke – in grafik.js deshalb logik.js als `* as Logik` holen),
`POLY`, `kugel`, `umriss`, `gespiegelt`, `schrift` (3×5-Großbuchstaben), `mische`, `hell`,
`dunkel`, Bausteine für Gebäude `dach`, `fensterKasten`, `tuer`, für Boden `grasKachel`,
`zackenRand`, `kunstMalen(g, art, bild)` (andere Kunst wiederverwenden), `ersatzBild`. Abrufen:
`itemBild`, `itemDatenUrl`, `objektBild`/`objektArt`, `dekoBild`/`dekoArt`, `gebaeudeBild`,
`pflanzeBild`, `tierBild`, `monsterBild`, `figurBild`, `portraetBild`, `symbolUrl`,
`bodenStueck`, `bodenBild`.

Beispiel (ein Fass als Maschine im Bereich handwerk):

```js
// bereiche/handwerk/grafik.js
import { kunst, objektKunst, R, E, P, dunkel } from '../../sprites.js';
import { blase } from '../../render.js';

kunst('fass', (g, b) => { E(g, 8, 9, 6, 6.5, '#8a5a32'); R(g, 2, 5, 12, 1, '#4a4a52'); });
objektKunst('fass', {
  b: 16, h: 24,                                              // ragt ein halbes Feld nach oben
  schluessel: (o) => (o.fertig ? 'fertig' : o.inhalt ? 'arbeit' : 'leer'),
  malen(g, o) { E(g, 8, 15, 6, 8, '#8a5a32'); if (o.inhalt) P(g, 8, 4, dunkel('#8a5a32')); },
  danach(g, o, { bx, y }) { if (o.fertig) blase(g, bx, y - 3, '!'); },
});
```

### 9.2 Ebenen und Zeichner (render.js)

Jedes Bild läuft so: Boden (nur die sichtbaren Stücke) → Ebene `boden` → Ebene `welt`
(alle Zeichenstücke sammeln, nach `y` sortieren, zeichnen) → `ueber` → `licht` → `bildschirm`.

```js
zeichner({ name, ebene: 'welt', reihe, sammeln(ort, sicht) → [{ y, f(g) }] })
zeichner({ name, ebene: 'boden' | 'ueber' | 'licht' | 'bildschirm', reihe, zeichnen(g, kamera, ort, sicht) })
```

| Ebene | Koordinaten | Kern (reihe) | Bereiche (reihe) |
|---|---|---|---|
| `boden` | Weltpixel | glitzern 10, beete 20, wanddeko 30 | |
| `welt` | Weltpixel, y-sortiert | objekte 10, pflanzen 20, deko 30, gebaeude 40, funde 50, npcs 60, spieler 90 | muehlrad 42 (gemeinschaft), fallend 45 (basis), huehner 70 (tiere), monster 80 (mine), fang 95 (angeln) |
| `ueber` | Weltpixel | ziel 10, partikel 30, texte 40 | angeln 20 (angeln) |
| `licht` | Bildschirmpixel | wetter 10, dunkel 50 | |
| `bildschirm` | Bildschirmpixel | blitz 10 | drill 20 (angeln) |

Innerhalb einer Ebene zählt `reihe`, bei gleichem `y` in der Welt die Reihenfolge der Zeichner.
Vor jedem Zeichner setzt der Kern Transformation, Deckkraft 1 und normales Überblenden.
`sicht = { x0, x1, y0, y1, sichtbar(tx, ty), imBild(px, py, b, h), def, s, jz, nacht, t, kamera }`
(Feldbereich mit Rand: 2 Felder links/rechts, 1 oben, 3 unten für hohe Bilder),
`kamera = { x, y, zoom, dpr, W, H, vw, vh }`. Helfer: `schatten(g, x, y, rx, ry)`,
`blase(g, x, y, '!' | '…')`, `spielerHinter(bx, by, b, h)`.

**Kulling:** Der Boden ist in Stücke zu 16×16 Feldern (`BODEN_STUECK`) geteilt, die erst
gemalt werden, wenn sie ins Bild kommen. Objekte, Pflanzen und Beete werden über die sichtbaren
Felder gesucht, nicht über alle Einträge; Deko, Gebäude, Figuren und Monster werden vorher gegen
das Bild geprüft. Eigene Zeichner tun dasselbe (`sicht.sichtbar`, `sicht.imBild`). Messung auf
einer 100×72-Karte mit 6000 Objekten: erstes Bild 25 ms statt 137 ms, danach 4 ms statt 8 ms.

**Licht:** Draußen wird es ab 18 Uhr dunkel (bei Regen immer etwas), drinnen halb so stark, in
der Mine nach `def.dunkel`. Lichtquellen: `GEBAEUDE_LICHT` jedes Gebäudes, Deko mit `licht`,
Objekttypen mit `licht` (`objektTyp('fackel', { licht: 3 })`, Radius in Feldern), eigene Quellen über
`lichtQuelle((ort, sicht) => [{ x, y, r, warm }])` und die Spielerin selbst.

Beispiel (vereinfacht nach den Hühnern im Bereich tiere):

```js
zeichner({
  name: 'huehner', ebene: 'welt', reihe: 70,
  sammeln(ort, v) {
    if (!huehnerDraussen()) return null;
    return S.huehner.filter((h) => v.imBild(h.x - 10, h.y - 18, 20, 22)).map((h) => ({
      y: h.y, f: (g) => { schatten(g, h.x, h.y, 4, 1.5); g.drawImage(tierBild('huhn', 0, h.links), h.x - 8, h.y - 15); },
    }));
  },
});
```

### 9.3 Oberfläche (ui.js)

| Register | Füllen mit | Eintrag |
|---|---|---|
| `FENSTER` | `fensterArt(name, bau)` | `bau(daten) → Element`, meist `fensterRahmen(titel, inhalt, { klasse: 'breit', kopfExtra })` |
| `MENUE_REITER` | `menueReiter({ id, name, bauen(d), reihe })` | Reiter im Menü; Kern: rucksack 10, basteln 20, faehigkeiten 30, freunde 40, optionen 90 |
| `HUD_ELEMENTE` | `hudElement({ id, bauen(), aktualisieren(el, s), reihe })` | eigene Anzeigen im HUD (Buffs, Fest-Uhr …); `aktualisieren` läuft jedes Bild |
| `WARE_BILD` | `wareBild(spezial, (ware) → Element)` | Bild einer Spezialware ohne Item im Laden |
| `STATISTIK` | `statistik({ id, name, wert(s), reihe })` | Zeilen unter „Bisher" im Reiter Fähigkeiten |

Geöffnet wird ein Fenster aus der Spiellogik mit `fenster(name, daten)` (spiel.js, über
`S.hooks`) – inhalt.js importiert ui.js nie. Fenster des Kerns: `menue`, `brief`, `tagEnde`.

**Bau-Helfer:** `el(tag, attrs, …kinder)`, `bild(src, klasse)`, `leinwandBild(c)`,
`symbol(art)`, `sternSymbol(q)`, `itemIcon(slot)`, `slotKnopf(slot, i, { klick, aktiv,
gedimmt, markiert, taste })`, `invGitter(klick, { markiere, dimme, aktivIdx })`,
`itemInfo(slot)`, `portraet(npcId)`, `goldAnzeige()`, `fensterRahmen`, `fensterOeffnen`,
`fensterNeu` (nach Änderungen neu bauen), `fensterSchliessen`, `offenesFenster()`,
`menueOeffnen(reiter)`, `dialog`/`dialogZeigen`, `frage`, `meldung`/`meldungZeigen`,
`fundeZeigen`, `ton`, `zahl` (Zahlenformat), `$`.

Beispiel:

```js
// bereiche/tiere/oberflaeche.js
import { fensterArt, menueReiter, fensterRahmen, el } from '../../ui.js';

fensterArt('tierinfo', (d) => fensterRahmen(d.tier.name, el('p', {}, `Freundschaft: ${d.tier.freundschaft}`)));
menueReiter({ id: 'tiere', name: 'Tiere', reihe: 45, bauen: () => el('div', { class: 'liste' }, '…') });
```

### 9.4 Kunst und Fenster je Bereich

| Bereich | grafik.js | oberflaeche.js |
|---|---|---|
| basis | Werkzeuge, Grundrohstoffe, Müll; Objekte baum, stumpf, grossstumpf, ast, stein, fels, unkraut, sammel; geteilte Deko baum, busch, felsen, laterne, schild, kiste, fenster, bild, kamin, pflanze, tisch; Zeichner fallend | – |
| hof | Gebäude haus; Innenfarben haus; Deko bett, tv, herd, versandkiste, briefkasten | Fenster versand |
| dorf | Essen aus dem Gasthaus; Gebäude laden, rathaus, gasthaus, schmiede, atelier; Innenfarben laden, gasthaus; Deko brunnen, bank, blumen, amboss, fass, theke, regal, saatregal, flaschen | Fenster laden (für alle Händler), Warenbilder upgrade, rucksack |
| wildnis | Gebäude huette; Deko strandkorb | – |
| pflanzen | Saatgut, Ernte, Wildpflanzen, Strandfunde, Dünger; Wuchsformen | – |
| angeln | Angel, Fische, Köder; Deko stand; Zeichner fang, angeln, drill | – |
| mine | Erze, Barren, Mineralien, Schwert; Minen-Bänder; Objekte mstein, leiter, schatz; Deko leiter_ab, leiter_auf, aufzug, schwertfund, wandlampe; Gebäude hoehle; Monster schleim, fledermaus; Zeichner monster | Fenster aufzug, Statistik tiefste |
| handwerk | Truhe, Vogelscheuche, Sprenger, Einmachglas, Marmelade, Eingelegtes; Objekt einmachglas | Fenster truhe |
| tiere | Eier; Gebäude stall; Tier huhn; Zeichner huehner | Warenbilder kueken, stall |
| gemeinschaft | Medaille; Gebäude muehle (verfallen/repariert); Deko brett; Zeichner muehlrad | Fenster muehle, brett; Menüreiter aufgaben |
| npcs, npcs2, feste | – (Figuren und Porträts malt der Kern aus `aussehen`) | – |

### 9.5 Konventionen für Pixelkunst

* **Raster:** Ein Feld ist 16×16 Pixel (`T`). Gezeichnet wird nur in ganzen Pixeln mit den
  Grundfunktionen, ohne Kantenglättung. Zufall nur über `hash(x, y, n)` aus zufall.js, damit
  Bilder stabil bleiben und gecacht werden können.
* **Gegenstände:** 16×16, Motiv innerhalb von x/y 1–14, den dunklen Umriss (`#2b1d1c`) setzt
  der Kern. Farben über `bild.f`/`bild.f2`, damit eine Kunst für viele Items reicht.
* **Figuren:** 16×24, Füße unten mittig (y 21–23), Blickrichtungen unten, oben, links
  (rechts gespiegelt), Schrittphasen 0–2. Gezeichnet mit dem Fuß auf der Position der Figur.
* **Porträts:** 32×32, Kopf und Schultern, gleicher Umriss.
* **Objekte und Deko** stehen unten mittig auf ihrem Feld (bzw. ihrer Fläche `w×h`); höhere
  Bilder ragen nach oben (Baum 32×44, Laterne 16×32). Sortiert wird nach der Unterkante.
* **Gebäude:** so breit wie `w×16`, unten bündig mit der letzten Reihe; Tür im Bild dort, wo
  `tuer` liegt. Fensterpunkte für die Nacht in `licht`.
* **Pflanzen:** 16×24, Erde bei y = 21 (`fuss`), Phasen 0–4 (4 = reif).
* **Boden:** Kacheln bleiben in ihrem Feld; höchstens ein Pixel Überstand nach links oder oben
  ist erlaubt (Waldrand), weil der Boden in Stücken gemalt wird.
* **Licht von oben links:** Grundfarbe, `hell()` oben links, `dunkel()` unten rechts; `kugel()`
  macht das für runde Formen.
* **Jahreszeiten:** Bilder bekommen `jz` (fruehling, sommer, herbst, winter) und malen
  Varianten: Laub aus `LAUB` (im Winter kahl), Gras aus `GRAS`, Schnee auf Dächern
  (`dach(…, winter)`), Kanten und Bänken im Winter. **Tag und Nacht:** `nacht` (draußen ab
  18:30, drinnen ab 19 Uhr) lässt Fenster (`fensterKasten(…, nacht)`) und Lampen leuchten.
* **Nie pro Bild malen:** Alles Gemalte wird gecacht; in Zeichnern nur fertige Leinwände
  zeichnen und einfache Formen (Schatten, Balken, Blasen).

Wer an der Darstellung des Kerns etwas ändert, vergleicht Bildschirmfotos fester Szenen vorher
und nachher (Playwright, eingefrorene Zeit `S.t`, `S.uebergang = true`, fester `Math.random`).
Beim Umbau auf die Register waren alle 56 Szenen (Hof in vier Jahreszeiten und nachts, Dorf, Strand,
Angeln, Wald, Berg, Mine in allen Bändern, Innenräume, alle Fenster und Reiter, Titel)
pixelgleich.
