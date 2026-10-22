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
  sprites.js  render.js  ui.js  eingabe.js  ton.js  zufall.js  schleife.js  index.js   Kern, Browser
  bereiche/
    inhalt.js        lädt alle bereiche/*/inhalt.js, dann fertig()   (DOM-frei, auch in Node)
    grafik.js        lädt alle bereiche/*/grafik.js                  (Pixelkunst)
    oberflaeche.js   lädt alle bereiche/*/oberflaeche.js             (Fenster, Menüreiter)
    <bereich>/inhalt.js  grafik.js  oberflaeche.js
```

| Bereich | Besitzt (inhalt.js) | Karten | Zustand in `s` |
|---|---|---|---|
| basis | Werkzeuge (Items + `werkzeugArt` hacke, giesskanne, axt, spitzhacke, sense), Grundrohstoffe (holz, hartholz, stein, faser, harz, kohle), Müll, Hindernisse (`objektTyp` ast, stein, fels, grossstumpf, unkraut, sammel), Aufstellen und Belag legen aus der Hand, Tipps, Startwerkzeug | – | – |
| hof | Hof und Wohnhaus, Gewächshaus, Verwildern (neuesSpiel), Nachwachsen (tagEnde), Bett, Fernseher (Hook `fernsehen`), Versandkiste, Briefkasten, Herd-Deko (`aktion: 'kochen'`) | hof, haus, gewaechshaus (Platzhalter) | liest `s.haus.stufe`, `s.flags.gewaechshaus` |
| dorf | Dorfkarte, Krämerladen, Gasthaus, Mühle als Gebäude, Läden von Ottilie/Bruno/Hannes, Gasthaus-Essen, Spezialware rucksack und upgrade | dorf, laden, gasthaus; Platzhalter schmiede, rathaus, arzt, museum, hausRosa, muehle | – |
| wildnis | Strand und Wald (Platzhalter), Lenes Hütte als Fischladen | strand, wald; Platzhalter fischladen, huetteMats, ranch, turm, geheimwald | – |
| berg | Berg (Platzhalter) mit Mineneingang, Bergsee, Zimmerei und Gilde | berg; Platzhalter zimmerei, gilde | – |
| pflanzen | Feldfrüchte samt Saat (mit `sorte`), Wildpflanzen und Strandfunde, Dünger, Säen/Düngen aus der Hand, Spezialware saatgut, Saatgut und Dünger bei Ottilie (Hook `ladenWare`), Krähen (tagEnde), Startsaat, Bäume (`objektTyp` baum, stumpf; `baumArt` eiche, kiefer) | – | – |
| angeln | Angel (`werkzeugArt` angel), Fische, Köder, Laden „fischer" (Lene, im Fischladen), Lenes Angel-Geschenk (Hook gespraech), in Welle 1 auch **src/angeln.js** (Auswerfen, Warten, Biss, Einholen, Fischwahl, Fang, Schatzkisten; läuft über den Hook `eingabe`, siehe „Angeln" in 2.) | – | `s.flags.angelBekommen`, `s.angeln` (Fangbuch) |
| mine | Erze, Barren, Mineralien, Schwert (`werkzeugArt` waffe), Monster, Minenebenen (`kartenAnbieter`), Gestein (`objektTyp` mstein, leiter, schatz), Förderkorb, Kampf, Alrik und Laden „gilde" (Platzhalter), in Welle 1 auch **src/mine.js** | mine0, mine1 … mine30 (dynamisch) | `s.mine`, `s.flags.mineOffen` |
| handwerk | Rezepte, Aufstellbares (`objektTyp` truhe, vogelscheuche, sprenger, qsprenger, einmachglas), Marmelade/Eingelegtes, Deko-Aktion `kochen` (Platzhalter), Fenster truhe (für alle Behälter) | – | – |
| tiere | Hühnerstall (dynamisches Gebäude im Hof-Bereich „stall"), Küken, Hühner im Auslauf, Eier, Spezialware kueken/stall (in fremden Läden über `ladenWare`), Greta und Wilma samt Läden „zimmerei" und „ranch" (Platzhalter) | – | `s.stall`; setzt `s.haus.stufe` |
| npcs | die sechs Dorfbewohner (Ottilie, Bruno, Lene, Frieda, Mats, Hannes) – in Welle 1 unverändert | – | (`s.npcs` gehört dem Kern) |
| npcs2 | weitere Dorfbewohner (leer) | – | – |
| feste | Feste (leer) | – | `s.feste` (geplant) |
| gemeinschaft | Mühle und Bündel, Schwarzes Brett und Aufträge, Briefe samt Startbrief, Medaille | – | `s.quest`, `s.brett`, `s.buendel`, `s.muehle` |

Was die Bereiche nicht besitzen, gehört dem Kern: `s.spieler`, `s.zeit`, `s.welt`, `s.npcs`
(Freundschaft), `s.versand`, `s.briefe`, `s.post`, `s.stats`, `s.flags`, `s.stufeNeu`,
`s.haus` (`{ stufe }`: Ausbaustufe des Wohnhauses; tiere setzt sie, hof liest sie) und
`s.rezepte` (gelernte Rezepte, `L.rezeptLernen`). `s.flags` ist für Freischaltungen aller
Bereiche da (`mineOffen`, `gewaechshaus`, `steinbruch`, `strandbruecke`, `geheimwald` …);
jede Flagge hat genau einen Bereich, der sie setzt.
Welche Kunst und welche Fenster in `grafik.js` und `oberflaeche.js` liegen, steht in 9.4.

**Platzhalter:** Jede Karte des Punkte-Vertrags gibt es schon, auch wenn sie noch klein ist; dazu
die Personen und Läden, auf die andere Bereiche verweisen (Greta, Wilma, Alrik; Läden zimmerei,
ranch, gilde), die Deko-Aktion `kochen` und je ein Fisch für jede Gewässerart (der Karpfen). Wer
einen Platzhalter besitzt, baut ihn **in seinem Ordner** aus, statt einen zweiten anzulegen.

### Importregeln

* `bereiche/*/inhalt.js` importiert nur DOM-freie Kernmodule: `daten`, `karten`, `system`,
  `logik`, `spiel`, `mine`, `angeln`, `zufall`. Keine anderen Bereiche – Querverweise laufen über
  IDs (Item-IDs, Kartenpunkte, Bedingungsnamen), die erst nach dem Laden aufgelöst werden.
* `grafik.js` importiert den DOM-freien Kern, `sprites.js`, `render.js` und Dateien im eigenen
  Ordner; `oberflaeche.js` den DOM-freien Kern, `ui.js`, `sprites.js` und Dateien im eigenen
  Ordner. Andere Bereiche nie – auch Bilder und Fenster finden sich über Namen
  (`KUNST.truhe`, `fenster('laden')`, `WARE_BILD.kueken`).
* **Unterdateien:** Ein Bereich darf seinen Inhalt auf mehrere Dateien im eigenen Ordner (auch in
  Unterordnern) verteilen, z. B. `karte-dorf.js`, `innen.js`, `kunst-gebaeude.js`, eingebunden über
  `inhalt.js`, `grafik.js` oder `oberflaeche.js` (`import './karte-dorf.js';`). Für jede so erreichte
  Datei gilt die Regel ihres Einstiegs: was `inhalt.js` einbindet, bleibt DOM-frei; was `grafik.js`
  einbindet, darf zusätzlich `sprites.js`/`render.js` nutzen; was `oberflaeche.js` einbindet,
  `ui.js`/`sprites.js`. Die Tests verfolgen die Importe rekursiv.
* Der Kern importiert nie aus `bereiche/` – weder der DOM-freie noch `sprites.js`, `render.js`,
  `ui.js` (Tests prüfen beides).

### Laden

`index.js` importiert zuerst `bereiche/inhalt.js`, `bereiche/grafik.js`, `bereiche/oberflaeche.js`,
dann den Rest. `bereiche/inhalt.js` importiert die Bereiche in dieser festen Reihenfolge und ruft
danach `fertig()` (daten.js), das den Hook `fertig` auslöst:

```
basis, hof, dorf, wildnis, berg, pflanzen, angeln, mine, handwerk, tiere, npcs, npcs2, feste, gemeinschaft
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
| `item(id, def)` | `name, kat, preis, bild: { art, f, f2 }, text`/`beschreibung, energie, gesundheit, buff, tempo, stapel` (Standard: alles außer Werkzeug), `verkaufbar` (Standard: nicht werkzeug/platz/besonders), `verschenkbar, aufstellbar` (true oder Objekttyp), `belag` (Belagtyp, wird beim Benutzen gelegt), `aufruestbar, werkzeug` (Werkzeugart), `waffe: { schaden: [von, bis] }, koeder: { biss }, fundort` (Text oder Liste von Sammelzonen-Arten), `saisonal, strand, selten, kauf, pflanze, frucht, gemuese, sorte` (gemuese, obst, blume, getreide, kraut, pilz, fisch, krebs – Maschinen fragen danach) und beliebige Zusatzfelder. `energie` und `wert` dürfen `(slot) => Zahl` sein. Alte Form `item(id, name, kat, preis, bild, extra)` geht weiter. | `item('rubinring', { name: 'Rubinring', kat: 'ring', preis: 300, bild: { art: 'ring', f: '#e0344a' }, ring: { schaden: 0.1 } })` |
| `pflanze(id, def)` | `saat, ernte, tage, nach`/`nachwachsen, jz: [...], menge, extra` (Chance auf +1), `wuchs, farbe`; `rankhilfe: true` – die Pflanze versperrt ihr Beet (Kern); `riesig` ist ein Datenfeld für den Bereich pflanzen (Riesenpflanzen verschmelzen in dessen tagEnde) | `pflanze('erdbeere', { tage: 8, nach: 4, jz: ['fruehling'], wuchs: 'busch' })` |
| `fisch(id, def)` | `name, preis, bild, seltenheit` (0–100; je höher, desto seltener beißt der Fisch), `laenge: [von, bis]` (cm, fürs Fangbuch), `orte` (Gewässerarten: teich, fluss, see, waldsee, meer, geheimteich, mine), `jz, zeit: [von, bis)` als Uhrzeit 600–2600, `wetter` (sonne/regen); `sorte` ist `'fisch'`, wenn nicht anders angegeben | `fisch('saibling', { name: 'Saibling', preis: 90, bild: {…}, seltenheit: 50, laenge: [25, 60], orte: ['see'], jz: ['herbst'] })` |
| `muell(art, ids)` | Fang, der kein Fisch ist, je Gewässerart | `muell('see', ['stiefel'])` |
| `rezept(id, def)` | `art: 'basteln' \| 'kochen', zutaten: { id: n }, ergebnis` (Standard id), `menge, stufe: [skill, n]` oder `frei(s)`; `lernen: true` = nur durch `L.rezeptLernen(s, id)` (Fernsehen, Briefe). Gelernte Rezepte (`s.rezepte`) sind immer frei. Rezepte mit fehlenden Gegenständen blendet der Kern aus (`L.rezepteVon(art)`). | `rezept('pilzpfanne', { art: 'kochen', zutaten: { pilz: 2 }, lernen: true })` |
| `laden(id, def)` | `name, npc, ort: { karte, punkt }` (Theke), `kauft: [Kategorien], ware: [...]` oder `ware(s)`, `zeiten: [von, bis]`, `ruhetag: 'Mittwoch'`. Ware: `{ id, preis, bedingung, reihe }` oder `{ spezial, reihe }` (`reihe` sortiert, Standard 50). Offen ist, wenn die Person an der Theke steht. Ware und Ankauf anderer Bereiche: Hooks `ladenWare`, `ladenKauft` (unten). | `laden('ranch', { name: 'Ranch', npc: 'wilma', ort: { karte: 'ranch', punkt: 'theke' }, ware: [{ spezial: 'kuh' }] })` |
| `spezialWare(id, def)` | Käufe mit Sonderwirkung: `name, preis, text, zutaten, verfuegbar(s, ware, ladenId)`, `angebote(s, ware, ladenId) → [ware…]` (ersetzt den Eintrag durch mehrere), `kaufen(s, { ware, n }) → { text }` oder `{ grund }` | siehe dorf: `upgrade`, tiere: `kueken` |
| `npc(id, def)` | `name, voll, rolle, aussehen, geburtstag, liebt, mag, magNicht, hasst, heim: { karte, punkt }, plan: { normal, regen }, zeilen, antwort, herzGeschenk` | siehe npcs/inhalt.js |
| `buendel(id, def)` | `name, raum, items: [id \| { id, n }], noetig, belohnung: { id, n } \| { gold }` | siehe gemeinschaft |
| `brief(id, def)` | `von, text` (`{name}`, `{hof}`), und `tagNr` (einmal ab Tag) oder `jz`+`tag` (jährlich) oder `wann(s)` (einmal, sobald wahr); `start: true` = Brief zum Spielbeginn | `brief('wilma_kuh', { von: 'Wilma', text: '…', wann: (s) => s.tiere?.stall })` |
| `tipp(text)` | Tipp des Tages im Fernseher | |
| `objektTyp(t, def)` | Objekte auf der Karte (`welt.objekte["x,y"] = { t, … }`): `blockiert, axt(c), spitzhacke(c), sense(c), hacke(c), waffe(c)` (geben `true` zurück, wenn getroffen; die Hacke erreicht Objekte auf jeder Karte, z. B. Artefaktstellen), `interagieren(c), einlegen(c)` (Gegenstand aus der Hand), `aufnehmen(c) → erg` (Aktionstaste und Drüberlaufen), `nacht(c)` (c mit `bericht, r, nachtMinuten`), `minuten(c, n), hinweis` (Text oder `(c) => Text`), `licht, anlegen(o, slot), nichtLeer(o) → Grund, item` (was man beim Aufheben bekommt), `kraehenSchutz` (Radius), `flaeche: [b, h]` (großes Objekt, siehe unten), `platz(c) → true \| 'Grund' \| undefined` (eigene Platzregel beim Aufstellen: true = erlaubt, Text = abgelehnt, undefined = Standard) | `objektTyp('fass', { blockiert: true, axt: L.aufheben, spitzhacke: L.aufheben, minuten(c, n) {…} })` |
| `bedingung(name, fn(s))` | für `nurWenn`, `tuerWenn`, `npcWenn`, `bedingung` an Ware. Statt eines Namens geht auch `'!name'`, eine Funktion oder eine Liste (alle) | `bedingung('scheune', (s) => !!s.tiere?.scheune)` |
| `werkzeugArt(art, def)` | `skill` (Energiekosten), `wiederholbar, aufladbar, dauer, schwungTon, schaden: [von, bis], upgradeText, felder(zx, zy, blick, ladung)`, `wirkung(ctx) → erg` (ctx: `s, ort, id, art, felder, zx, zy, ladung, S`), oder `benutzen(ctx)` statt Schwung; `haltung: 'giessen'` (Kanne statt Schwungbogen), `anzeige(s, slot) → Text` (Zusatz im Hinweis, z. B. Wasserstand). Eigene Schwung-Bilder: `schwungKunst` (9.2). | `werkzeugArt('melkeimer', { wirkung(c) {…} })`; Item: `werkzeug: 'melkeimer'` |
| `itemBenutzen(pruefen, fn)` | Gegenstand aus der Hand benutzen (Leertaste). Der erste Handler, dessen `pruefen(c)` stimmt, läuft. c: `s, ort, x, y, kk, o, slot, idx, it, f` (Spielerfeld), `S` | `itemBenutzen((c) => c.it.id === 'totem', (c) => …)` |
| `baumArt(id, def)` | Arten des Objekts `{ t: 'baum', art, hp }`: `name, holz: [von, bis], beute: [[id, chance, von, bis]…], samen, zapfen: { item, tage }` (liest der Zapfhahn), `stufen` und weitere Felder des Bereichs pflanzen | `baumArt('ahorn', { name: 'Ahorn', samen: 'ahornsamen', zapfen: { item: 'ahornsirup', tage: 9 } })` |
| `belagTyp(id, def)` | Bodenbelag (Wege, Böden) in `welt.belag["x,y"] = { t }`: `name, item` (kommt beim Aufheben zurück), `tempo` (Lauf-Faktor). Liegt unter Objekten, verhindert Beete; legen über ein Item mit `belag: id` (basis), aufheben mit der Spitzhacke (Kern). Bild: `belagKunst` (9.1). | `belagTyp('kiesweg', { name: 'Kiesweg', tempo: 1.1 })` |
| `erwartet(...ids)` | IDs anderer Bereiche, auf die man schon verweist (Rezept-Zutaten, Geschenke, Ware), bevor sie zusammengeführt sind. Die Tests lassen sie gelten (außer mit `STRENG=1`), der Kern blendet Rezepte und Ware mit fehlenden Gegenständen aus. | `erwartet('milch', 'wein')` |
| `fertig()` | einmal nach dem Laden aller Bereiche (macht `bereiche/inhalt.js`) | |

Tabellen im Kern: `WERKZEUG_STUFEN` (Basis, Kupfer, Eisen, Gold, Iridium – ein Upgrade wird nur
angeboten, wenn sein Barren als Item existiert), `QUALITAET` (normal, Silber, Gold, Iridium mit
Faktor 2), `KANNE_INHALT` (40 … 100), `FAEHIGKEITEN`, `XP_STUFEN`.

### Ware und Ankauf in fremden Läden

Ein Laden gehört dem Bereich, der ihn anlegt; andere Bereiche geben Ware dazu, ohne seine Datei
zu ändern:

```js
system({
  name: 'pflanzen',
  ladenWare: (ladenId, s) => (ladenId === 'laden' ? [{ spezial: 'saatgut', reihe: 10 }, { id: 'duenger', preis: 100 }] : undefined),
  ladenKauft: (ladenId) => (ladenId === 'schmiede' ? ['geode'] : undefined),
});
```

`L.ladenWare(s, ladenId)` = eigene Ware + Hook `ladenWare`, sortiert nach `reihe`; Ware mit
fehlendem Gegenstand fällt weg. `L.kauftKategorien(ladenId)` = `kauft` + Hook `ladenKauft`.
Spezialwaren bekommen den Laden als drittes Argument (`verfuegbar(s, ware, ladenId)`), so kann
ein Bereich eigene Spezialware in einem bestimmten Laden zeigen oder verbergen. Laden-IDs:
`laden` (Ottilie), `schmiede` (Bruno), `gasthaus` (Hannes), `fischer` (Lene, im Fischladen),
`zimmerei` (Greta), `ranch` (Wilma), `gilde` (Alrik).

### Helfer in logik.js für Bereiche

| Funktion | Zweck |
|---|---|
| `zuhause(s)` | `{ karte, x, y, blick }`: wo man wohnt und aufwacht (Hook `zuhause`, sonst `haus.bett`) |
| `stufeWirksam(s, skill)` | Fähigkeitsstufe plus Modifikator `stufe` (Buffs, Ringe); für Rechnungen statt `stufe` |
| `objektSetzen(ort, x, y, o)`, `objektEntfernen(ort, x, y)`, `hauptVon(ort, x, y)`, `flaecheVon(o)`, `flaecheFrei(s, ort, x, y, b, h)` | große Objekte (siehe unten) |
| `feldFrei(s, ort, x, y)` | frei für Neues: begehbar, ohne Objekt, Beet, Belag und Warp (Nachwachsen, Funde, Bauen) |
| `aufstellen(s, ort, x, y, idx)`, `belagLegen(s, ort, x, y, idx)`, `aufheben(c)` | Aufstellen, Belag legen, Aufgestelltes einsammeln |
| `rezeptLernen(s, id)`, `rezeptFrei(s, r)`, `rezeptVollstaendig(r)`, `rezepteVon(art)` | Rezepte |
| `kauftKategorien(ladenId)`, `ladenWare(s, ladenId)` | Läden |
| `kartenGeaendert()` | dynamische Gebäude/Deko/Objekte haben sich mitten am Tag geändert |

**Große Objekte** (Riesenpflanze, umgestürzter Stamm, Gebäude-Baustelle): Objekttyp mit
`flaeche: [b, h]`. `L.objektSetzen(ort, x, y, o)` legt das Objekt oben links bei (x, y) ab und
`{ t: 'teil', haupt: 'x,y' }` auf die übrigen Felder. Teile blockieren; Werkzeuge, Aktionstaste,
Hinweis und Benutzen aus der Hand wirken auf dem Teil wie auf dem Hauptobjekt (Kontext mit dessen
x, y, kk, o). `L.objektEntfernen` und `L.aufheben` nehmen alle Teile mit. Gezeichnet wird das
Hauptobjekt einmal, unten mittig auf seiner Fläche.

**Behälter:** Objekte mit `inv` (Liste von Stapeln) sind Behälter – Truhe, Kühlschrank. Das
Fenster `truhe` (handwerk) zeigt jeden Behälter: `fenster('truhe', { truhe: o, titel, drin })`.
Zutaten beim Kochen dürfen aus dem Rucksack und aus Behältern auf der Karte kommen.

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
| `dekoAktion(name, fn(d, ctx), hinweis, { ersetzen })` | Deko mit `aktion: name`; `hinweis` ist Text oder `(d, s) => Text`; `ersetzen` übernimmt eine Platzhalter-Aktion |
| `gebaeudeAktion(name, fn(g, ctx), hinweis, { ersetzen })` | Gebäude mit `aktion: name` |

Kern-Aktionen: `laden` (Theke, `d.laden`), `text` (Schild, `d.text`). Platzhalter: `kochen`
(handwerk, für den Herd von hof).

**Eigene Spielmodi** (Angeln, Baumodus, Fenster ohne Pause): Der Hook `eingabe({ E, dt, S })`
(erster) läuft jedes Bild vor der Steuerung der Spielerin; gibt er `true` zurück, steht sie still
und der Modus wertet `E` selbst aus (`E.richtung`, `E.benutzen`, `E.aktion`, `E.maus`, `E.tippen`,
`E.esc`). Dazu:
* `S.modus` (Text) – solange gesetzt: kein Zielrahmen, und Esc/I/K öffnen nicht das Menü, sondern
  bleiben in `E` für den Modus. `karteBetreten` und `schlafen` setzen ihn zurück.
* `S.kameraFokus = { x, y }` (Weltpixel) – die Kamera folgt diesem Punkt statt der Spielerin
  (zurück mit `null`, `karteBetreten` setzt zurück).
* `feldUnterZeiger(px, py)` → `{ x, y }`: Feld unter Maus oder Finger (`E.maus`, `E.tippen`).
* Knöpfe zum Bestätigen und Abbrechen kommen als `hudElement` (9.3); ein Fenster pausiert das Spiel.

Angeln ist so ein Modus (`S.angeln`, Hook `eingabe` des Bereichs angeln). Ein Fenster oder Gespräch
(`S.pause`) holt die Schnur ein: der Kern setzt dann `S.angeln` zurück, wie bei `karteBetreten` und `schlafen`.

### Angeln

Angeln wie in Minecraft, ohne Kraftmessung und ohne Minispiel. Ablauf (`S.angeln.phase`, src/angeln.js):

| Phase | Dauer | Was passiert |
|---|---|---|
| `wurf` | 0,4 s | „Benutzen" (Leertaste, Linksklick, Touch-Knopf; auch die Aktionstaste) bei gewählter Angel: die Schnur fliegt im Bogen aufs nächste Wasserfeld in Blickrichtung (bis 6 Felder), mit der Maus aufs angeklickte Wasserfeld in Reichweite. Köder aus dem Rucksack wird verbraucht. Ohne Wasser in Reichweite: Hinweis, nichts passiert. |
| `warten` | zufällig, Echtzeit | Grundwert 5 bis 22 s, mal 0,5 mit Köder, mal (1 − 0,04 je Angelstufe), mal 0,8 bei Regen (`wartezeit`, Modifikator `bissZeit`). |
| `spur` | 1,2 s | Blasenspur zieht auf den Schwimmer zu. „Benutzen" holt leer ein: „Zu früh". |
| `biss` | Fenster 1,0 s | Der Schwimmer taucht ab (Platscher, Ton, „!" über der Figur). „Benutzen" holt den Fang ein; in den ersten 0,35 s ist er „perfekt". Verpasst: „Zu spät – er ist weg." |
| `einholen` | 0,5 s (leer 0,3 s) | Einhol-Animation, der Fang fliegt zur Figur, dann die Fund-Anzeige. Leer darf man gleich wieder auswerfen. |
| `fang` | 0,7 s | Der Fang über dem Kopf; „Benutzen" wirft gleich wieder aus. |

Laufen (Stick, WASD), Werkzeugwechsel (Taste, Mausrad, Hotbar), Stoß und jedes Fenster holen die
Schnur ohne Fang ein. Die Zeit läuft über das `dt` der Spielschleife.

* **Fang** (`fangWaehlen`): zuerst Schatzkiste (3 % plus 0,4 % je Angelstufe, `schatzInhalt`: Münzen und
  Köder, Erz oder ein kleiner Edelstein, nach Stufe gestaffelt, ab Stufe 5 zwei Sorten), dann Müll
  (10 % minus 0,5 % je Stufe, mindestens 5 %), sonst ein Fisch aus der Tabelle (`fischWaehlen`:
  Gewässerart, Jahreszeit, Uhrzeit, Wetter; Gewicht 110 − `seltenheit`). Qualität nach Angelstufe, „perfekt"
  hebt sie öfter an und verdoppelt die Erfahrung (`fangGeben`).
* **Fangbuch:** `s.angeln = { gefangen: { <fischId>: { n, groesste } } }` (Länge in cm, nur Fische);
  der Hook `ergaenzen` legt es an, auch für ältere Stände. Angezeigt wird es noch nirgends; eine
  Sammlungsseite kann es später lesen.
* **Ruten und Köder sind nur Zahlen:** `item('angel', { rute: { warten: 1, fenster: 0, schatz: 0 } })`
  (Faktor auf die Wartezeit, Zusatz zum Einhol-Fenster in s, Zusatz zur Schatzchance), Köder
  `koeder: { biss: 0.5, fenster, schatz }` (`biss` ist der Faktor auf die Wartezeit). Eine bessere Rute ist ein
  weiteres Item mit `werkzeug: 'angel'`. Dazu die Modifikatoren `bissZeit`, `bissFenster`, `schatzChance` (4.)
  für Buffs und Ringe. Alle Zahlen stehen in `ANGELN` (angeln.js).
* **Hooks des Bereichs:** `eingabe` (Ablauf), `interagieren` und `hinweis` (Aktionstaste: „Auswerfen",
  „Einholen", „Einholen!"; eine Person, Tür oder Kiste vor dem Wasser geht vor), `update` (Vorschau
  `VORSCHAU.ziel`, wohin die Schnur fiele), `ergaenzen`, `gespraech` (Lenes Angel).

Helfer für Bereiche: `S` (Laufzeit), `ton, meldung, dialog(npcId, texte, optionen, danach),
frage(text, optionen), fenster(name, daten), fundeZeigen`/`fundeAnzeigen, ergebnisZeigen(erg),
geben(slot), spielerFeld, feldUnterZeiger, blickZu, schwebeText, partikel, staub, spritzer,
splitter, halme, blaetter, puff, ringe, herzchen, karteBetreten(id, x, y, blick),
wechseln(karte, x, y, blick), wechselnZu({ karte, punkt }), schieben, schlafen, postZeigen,
npcAnsprechen, ladenOeffnen, ladenGeoeffnetBei`.
Die Oberfläche hängt sich über `S.hooks` an (dialog, frage, fenster, meldung, funde, ton,
tagEnde, stufe, ueberblende, karteGewechselt); Bereiche rufen die Helfer, nie `S.hooks` direkt.

---

## 3. Hooks (system.js)

```js
import { system } from '../../system.js';
system({ name: 'tiere', ergaenzen(s) { s.tiere ??= { … }; }, tagEnde(s, bericht, r) { … } });
```

`alle(name, …)` ruft jeden Hook, `erster(name, …)` liefert den ersten Rückgabewert
`!== undefined`, `sammle(name, …)` hängt zurückgegebene Listen aneinander. Ein System darf nur
bekannte Hook-Namen tragen (Test). Die Namen des Kerns und die zwischen Bereichen vereinbarten
stehen in `BEKANNTE_HOOKS` (system.js); einen **neuen eigenen** Hook meldet ein Bereich in seiner
`inhalt.js` an – ohne den Kern zu ändern:

```js
import { hookBekannt, alle } from '../../system.js';
hookBekannt('tierGestreichelt');                 // vor dem ersten system(), das ihn nutzt
alle('tierGestreichelt', s, tier);               // aufrufen, wo es passiert
```

| Hook | Art | Aufrufstelle |
|---|---|---|
| `neuesSpiel(s, r)` | alle | Ende von `L.neuesSpiel`, vor den ersten Sammelfunden und der Post |
| `ergaenzen(s)` | alle | `L.ergaenzen` – nach dem Anlegen und nach jedem Laden; fehlende Felder nachtragen (`??=`) |
| `tagEnde(s, bericht, r)` | alle | `L.tagBeenden`, nach Kalender, Wetter, Wachstum, Regen und Objekt-`nacht`, vor Sammelfunden, Post und Speichern; `bericht.meldungen` sammelt Zeilen, `bericht.nachtMinuten` sind die verschlafenen Minuten, in `bericht.wahlen` hängt ein Bereich Fenster `{ fenster, daten }` an, die vor dem Morgen nacheinander aufgehen (Berufswahl). Danach meldet der Kern `kartenGeaendert()`. |
| `morgen(s, bericht)` | alle | Ende von `L.tagBeenden` (neuer Tag, Wetter steht fest) |
| `minuten(s, n)` | alle | `L.zeitVergeht` alle 10 Spielminuten (spiel.js), nach Objekt-`minuten` |
| `fertig()` | alle | `fertig()` nach dem Laden aller Bereiche |
| `karteBetreten(ort)` / `karteVerlassen(ort)` | alle | `karteBetreten` in spiel.js |
| `update(dt)` | alle | jedes Bild, wenn das Spiel läuft (nach den Dorfbewohnern, vor der Spielerin) |
| `eingabe({ E, dt, S })` | erster | jedes Bild vor der Steuerung der Spielerin; `true` = der Bereich steuert (Angeln, Baumodus; siehe „Eigene Spielmodi") |
| `interagieren(ctx)` | erster | Aktionstaste, vor der Standardbehandlung; ctx: `s, ort, x, y, f, npc, slot, idx, S` |
| `hinweis(ctx)` | erster | jedes Bild: Text, was die Aktionstaste täte (wie interagieren) |
| `schwung(ctx)` | alle | nach der Wirkung eines Werkzeugs (Monster treffen …); ctx wie `wirkung` plus `erg` |
| `npcAnsprechen(npc, ctx)` | erster | bevor das Gesprächsmenü aufgeht (Auftrag abgeben) |
| `npcOptionen(npc, s)` | sammle | zusätzliche Auswahlpunkte `[text, fn]` im Gespräch |
| `npcPlan(npcDef, s)` | erster | ersetzt den Tagesplan (Feste, Ehe) |
| `gespraech({ s, id, ort, r })` | erster | ersetzt ein Gespräch (Geschenke, Ereignisse); Rückgabe `{ texte, items }` |
| `gegessen(s, slot)` | alle | nach dem Essen (Buffs) |
| `gebaeude(ort, s)` / `deko(ort, s)` / `objekteDynamisch(ort, s)` | sammle | zusätzliche Gebäude, Deko, Objekte (`{ x, y, t, … }`) je Karte – gebaute Ställe, Festaufbauten |
| `ladenWare(ladenId, s)` | sammle | Ware für fremde Läden (`[{ id, preis, reihe } \| { spezial }]`) |
| `ladenKauft(ladenId)` | sammle | zusätzliche Kategorien, die ein fremder Laden ankauft |
| `zuhause(s)` | erster | `{ karte, punkt }` oder `{ karte, x, y }`: wo man wohnt und aufwacht (Hausstufen); gilt für Spielbeginn, Morgen, Laden ohne gültigen Ort und „daheim eingeschlafen" |

Zwischen Bereichen vereinbart (ein Bereich ruft, andere hören zu):

| Hook | Art | Ruft | Bedeutung |
|---|---|---|---|
| `fernsehen(s)` | sammle | hof (Fernseher) | Sender `[[name, fn]…]`; mit Sendern fragt der Fernseher, was laufen soll (Kochsendung von handwerk) |
| `grasGemaeht({ s, ort, x, y, erg, r })` | alle | pflanzen (hohes Gras gemäht) | z. B. tiere füllt das Silo mit Heu |

Gebäude, Deko und dynamische Objekte landen im **Kartenstand** (`L.kartenStand(s, def)`), der
Blockaden und Feld-Indizes cacht. Er wird neu berechnet, wenn sich eine Bedingung (`nurWenn`,
`tuerWenn`) der festen oder der zuletzt gelieferten dynamischen Gebäude/Deko ändert, wenn der Tag
wechselt oder nach `L.kartenGeaendert()`. Über Nacht ruft der Kern es selbst (nach `tagEnde` und
`morgen`); ändert ein Bereich seine dynamischen Gebäude mitten am Tag (Kauf, Fest beginnt) aus
anderem Grund als einer Bedingung, ruft er `L.kartenGeaendert()`.

## 4. Modifikatoren

```js
import { modifikator } from '../../system.js';
modifikator('energieKosten', (wert, k) => (k.s.flags.buffKaffee ? wert * 0.8 : wert));
```

`mod(name, wert, kontext)` faltet alle Modifikatoren in Registrierungsreihenfolge.

| Name | Aufrufstelle | Kontext |
|---|---|---|
| `energieKosten` | `L.energieKosten` (Werkzeuge) | `s, werkzeug, ladung` |
| `laufTempo` | Bewegung in spiel.js (Pixel/s, Grund 76 mal `tempo` des Belags) | `s, belag` |
| `stufe` | `L.stufeWirksam` – die Fähigkeitsstufe, mit der Ernte, Energie, Sammeln, Angeln, Bergbau und Kampf rechnen (Erfahrung und Stufenaufstieg nutzen die erreichte Stufe) | `s, skill` |
| `sammelRadius` | Abstand in Pixeln, ab dem Funde am Boden eingesammelt werden (Grund 22) | `s` |
| `verkaufspreis` | `L.preisVon(slot, s)` (Versand, Laden, Anzeige) | `s, slot` |
| `xp` | `L.xpGeben` | `s, skill` |
| `ernteQualitaet` | `L.ernten` (0–3) | `s, ort, x, y, feld, pflanze` |
| `wachstum` | Nachtwachstum je gegossenem Beet (Tage, Grund 1) | `s, ort, feld, pflanze` |
| `bissZeit` | Wartezeit in Sekunden bis zur Blasenspur, nach Köder, Angelstufe und Regen (angeln.js) | `s, rute, koeder, wasser, stufe` |
| `bissFenster` | Sekunden zum Einholen nach dem Biss (Standard 1,0, angeln.js) | `s, rute, koeder, wasser, stufe` |
| `schatzChance` | Chance auf eine Schatzkiste statt Fisch oder Müll (angeln.js) | `s, rute, koeder, wasser, stufe` |
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
  ganzjaehrig: true,                               // jede Saat geht, nichts welkt (Gewächshaus)
  aufstellen: true,                                // Aufstellen und Belag legen wie auf dem Hof (Haus, Schuppen)
  zuhause: true,                                   // hier um zwei Uhr einschlafen ist keine Ohnmacht
});
```

Gebäude blockieren ihr Rechteck; die Tür liegt in der untersten Reihe und ist begehbar, wenn
das Gebäude ein `ziel` hat und `tuerWenn` stimmt. `tuerWenn` gilt nur für die Spielerin (mit
`sonst` als Text an der verschlossenen Tür); Dorfbewohner gehen durch, außer `npcWenn` stimmt
nicht. Deko blockiert, außer `wand` oder `begehbar`. Bodenzeichen: `. : = s ~ h _ t m # X T`
(siehe karten.js; `T` ist eine Steintreppe für Klippen), weitere über `bodenTyp`.
Ganzjährige Karten: Saat jeder Jahreszeit geht (`L.saeen`), nichts welkt beim Jahreszeitwechsel.
Drinnen (`aussen: false`) regnet es nicht und es kommen keine Krähen.

**Bodenzeichen je Bereich.** Bodenzeichen sind global. Damit parallel niemand dasselbe Zeichen
vergibt, hat jeder Bereich einen eigenen Vorrat; geteilte Zeichen legt nur der Kern an.

| Bereich | freie Zeichen |
|---|---|
| hof | `a b c d e` |
| dorf | `f g i j k` |
| wildnis | `l n o p q` |
| berg | `r u v w y` |
| mine | `z A B C D` |
| pflanzen, angeln, handwerk, tiere | `F G` · `H I` · `J K` · `L M` |
| Welle 2 | `N`–`Z` außer `T` und `X` |

### Bau-Helfer für große Karten

`raster(b, h, z)` → Feld aus Zeichen, `rechteck(g, x, y, b, h, z)`, `ellipse(g, cx, cy, rx, ry, z)`,
`pfad(g, [[x, y], …], breite, z)` (Breite wächst nach rechts/unten – in Klippen nur das Türfeld
setzen, sonst scheint der Weg neben der Tür durch), `rahmen(g, z, dicke)`,
`raum(b, h, { tuerX, boden })` (Innenraum mit Wänden und Türlücke unten), `fertigRaster(g)` →
Zeilen. Beispiele: Wald in `bereiche/wildnis/inhalt.js`, Berg in `bereiche/berg/inhalt.js`.

### Punkte, Bereiche, Gewässer

* `punkt(karte, name, s)` → `{ x, y, blick }`, `bereichVon(karte, name, s)` → `{ x, y, w, h }`,
  `zielVon({ karte, punkt }, s)`; `s` braucht es nur für Karten aus einem Kartenanbieter.
* Warps (`{ karte, punkt }`), Türen (`ziel: { karte, punkt }`), NPC-Pläne (`[zeit, karte, punkt]`),
  NPC-Zuhause (`heim: { karte, punkt }`) und Läden (`ort: { karte, punkt }`) verweisen über
  Punkte. **Andere Bereiche verweisen nur über Punkte auf eine Karte, nie über Koordinaten.**
  Koordinaten-Formen (`zx/zy`, `{ x, y }`, `[zeit, karte, x, y]`) gehen weiter, aber nur innerhalb
  des eigenen Bereichs.
* `wasserArt(ort, x, y)` liefert die Gewässerart eines Felds (Rechteck aus `gewaesser`, sonst
  `wasser`). Jede auf Karten benutzte Art braucht in jeder Jahreszeit einen Fisch (Test).

### Dynamische Karten

`kartenAnbieter(pruefen, erzeugen)`; `karteHolen(id, s)` liefert feste oder erzeugte Karten,
**gecacht nach ID**: `erzeugen(id, s)` muss aus id und s eindeutig sein; ändert sich die Karte
(Stall ausgebaut), ruft der Bereich `karteVergessen(id)`. Türen, Warps und `wechselnZu` reichen
den Spielstand weiter. Mit `fluechtig: true` entsteht die Karte bei jedem Betreten neu; dann
gehören dazu `weltStart` (Objekte), optional `monsterStart`, Punkt `start` und
`speicherOrt: { karte, punkt }` (dort steht man nach dem Laden). Nicht flüchtige dynamische Karten
(Stall-Innenräume) speichern ihren Zustand wie feste Karten in `s.welt[id]`.

### Verbindungen und Wege

`verbindungen()` listet alle Warps und Türen fester Karten (gecacht, neu nach jeder
Kartenregistrierung) mit `nurWenn` und `npcWenn` der Türen. Türen aus dem Hook `gebaeude` und
Türen auf dynamischen Karten fehlen dort – dahin gehen keine Dorfbewohner.
`L.wegPlanen(s, von, ziel)` sucht Kartenfolge und Felder (Breitensuche, numerische Indizes) und
gibt `{ schritte, ok }` zurück; `ok: false` heißt, dass gesprungen wird. Eine Tür ist für
Dorfbewohner offen, wenn ihr Gebäude steht (`nurWenn`) und `npcWenn` stimmt – `tuerWenn`
(Öffnungszeiten, Freischaltungen) gilt nur für die Spielerin. Felder mit Rankhilfe-Pflanzen und
blockierende Objekte sind für Wege gesperrt.

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
| hof | vonDorf vonWald vonBerg vorHaus vorGewaechshaus versandkiste briefkasten | bauland, stall, auslauf |
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

Zusätzliche Punkte sind erlaubt (das Dorf hat etwa `amboss`, `ladenbeet`, `rathausweg`,
`sprechstunde`, `muehlblick`, `vorAtelier`, der Strand `stand`, das Gasthaus `tresen1`, `tresen2`).
Wer eine Karte neu baut, behält alle Punkte, die andere benutzen – die Tests zeigen, wenn einer
fehlt. Die Tagespläne der sechs Dorfbewohner (npcs) bleiben in Welle 1, wie sie sind; wer eine
Karte umbaut, legt deren Punkte an passende Stellen (Bruno arbeitet am Punkt `dorf.amboss`, Lene
an `fischladen.theke` und `strand.steg`).
Alle Karten der Tabelle gibt es (Test); noch nicht ausgebaute sind kleine Platzhalter mit Türen
(Fischladen, Ranch, Turm, Zimmerei, Gilde) oder ohne (Gewächshaus, Hütte von Mats, Geheimer Wald,
die Innenräume im Dorf). Personen und Läden dazu: Greta und Laden `zimmerei`, Wilma und Laden
`ranch` (tiere), Alrik und Laden `gilde` (mine), Lene und Laden `fischer` (npcs/angeln).
Geplante Dorfbewohner (für Heime und Betten): Jonas, Theo, Mira, Rosa, Pia, Sanne, Oswin, Kai, Nele.

Gewässerarten: `teich` (Hof), `fluss` (Dorf, Wald), `see` (Berg), `waldsee` (Wald), `meer`
(Strand), `geheimteich` (Geheimer Wald), `mine` (Seen in der Mine). Jede hat eine Wasserfarbe
(sprites.js) und in jeder Jahreszeit einen Fisch (vorerst den Karpfen).

---

## 6. Spielstand

* `SPEICHER_SCHLUESSEL = 'klarwasser-hof-v2'`, `SPEICHER_VERSION = 2`. Ältere Stände werden
  ignoriert (anderer Schlüssel) bzw. beim Laden abgelehnt.
* Gespeichert wird `JSON.stringify(s)` jeden Morgen und auf Wunsch. Laufzeitzustand (`S`) wird
  nicht gespeichert; `zustandSichern()` überträgt die Position.
* Wohin: `src/speicher.js`. Im Artefakt liegt der Stand in der Datenbank (`db`-Fähigkeit) als
  Dokument `data/users/<id>/spielstand` mit dem Feld `stand`; `<id>` kommt von `user.id()`, so bleibt
  jede Person für die anderen unsichtbar. Der Browser-Speicher (`klarwasser-hof-v2`) geht immer
  mit, als Sicherung und für den lokalen Server. Lesen: Datenbank, sonst Browser; ein Stand nur im
  Browser wandert beim ersten Lesen in die Datenbank. `speichern()` bleibt synchron; das
  Schreiben in die Datenbank läuft im Hintergrund, nacheinander. Ein Spielstand ist rund 8 KB groß
  (Limit pro Dokument 256 KiB).
* Einstellungen (Lautstärke) bleiben im Browser (`klarwasser-hof-einstellungen`).
* Das Artefakt braucht `capabilities: { db: {}, user: {} }`. Ohne sie fällt alles auf den Browser zurück.
* Bereichszustand liegt in eigenen Schlüsseln (Tabelle in 1.) und wird im Hook `ergaenzen`
  mit `??=` angelegt, damit auch ältere v2-Stände die neuen Felder bekommen (ein Test löscht alle
  Bereichsschlüssel und prüft, dass sie beim Laden wiederkommen). Freischaltungen kommen nach
  `s.flags`. Ein Bereich ändert nie die Schlüssel eines anderen – außer den geteilten des Kerns,
  wie in 1. beschrieben (`s.haus.stufe` setzt tiere, `s.rezepte` über `L.rezeptLernen`).
* Je Karte liegt in `s.welt[id]`: `objekte`, `felder` (Beete), `funde`, `belag`.
* Was in `s` liegt, muss JSON-fähig sein (keine Funktionen, keine Map/Set). Ein Test lädt und
  speichert einen Stand und vergleicht.

---

## 7. Tests

```bash
npm test                    # node test/alle.mjs: jede test/*.test.mjs nacheinander
node test/alle.mjs karten   # nur Dateien, deren Name „karten" enthält
CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node test/browser.mjs
CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node test/angeln.browser.mjs
```

| Datei | Prüft |
|---|---|
| `register.test.mjs` | doppelte IDs, `ersetzen`, Vollständigkeit der Items, Bedingungen, Aktionen, Objekttypen, Hooks werden gerufen, `hookBekannt`, Modifikatoren wirken, Ordner und Importregeln (rekursiv über Dateien im eigenen Ordner) |
| `karten.test.mjs` | Raster und Bodenzeichen, Bau-Helfer, Punkte-Vertrag (alle Karten da), Weltgraph, jeder Warp/jede Tür auf begehbarem Feld, alle Punkte begehbar, jeder NPC erreicht alle Planziele, Läden, Kartenanbieter mit Spielstand, Kartenstand-Cache (auch Bedingungen dynamischer Gebäude), Wegsuche auf 100×72 |
| `logik.test.mjs` | Daten und Verweise (mit `erwartet`), Neues Spiel, Feldarbeit auf einer Testkarte, ganzjährige Karten, Rucksack, Versand, Läden, Basteln, Dorf, Aufträge, Mühle, Briefe, Speichern |
| `erweiterung.test.mjs` | die Erweiterungspunkte mit Testinhalten: Ware/Ankauf in fremden Läden, Zuhause, eigene Spielmodi, große Objekte, Aufstellen und Platzregeln, Rankhilfe, Beläge, Hacke auf Objekten, Wege durch Türen, Wahlfenster und Nachtminuten, Stufe/Sammelradius, Fundorte, Rezepte lernen, Deko-Aktionen ersetzen |
| `tag.test.mjs` | ganze Tage nach den Tagesplänen (ohne feste Orte): jeder am Planziel, Läden offen, Regenpläne, alle daheim, Ohnmacht um zwei Uhr, Aufwachen zu Hause |
| `laufzeit.test.mjs` | Laufzeit ohne Bildschirm: Rundgang durch den Weltgraphen, Mineneingang, Werkzeuge, Laden und Auftrag (Orte aus Punkten und Theken-Deko) |
| `darstellung.test.mjs` | Darstellung ohne Bildschirm (lädt auch `bereiche/grafik.js` und `bereiche/oberflaeche.js`): jedes Item, jede Deko, jedes Gebäude, jeder Objekttyp, jede Wuchsform, jedes Monster, jedes Bodenzeichen hat ein Bild; Innenraum-, Wasser- und Bandfarben; doppelte Bilder werfen; Zeichner des Kerns in fester Reihenfolge; jedes geöffnete Fenster ist registriert; Fenster-Optionen; Menüreiter und Statistik des Kerns; Rucksack-Teile, Stile; Warenbilder; Importregeln von grafik.js/oberflaeche.js |
| `<bereich>.test.mjs` | hof, berg, pflanzen, angeln, mine, handwerk, tiere: was nur diesen Bereich betrifft (Stall über Nacht, Barren, Ebenen, Wurf, Wartezeit, Biss und Fang, Bäume …) |
| `einmachglas.test.mjs` | das Einmachglas durch den ganzen Ablauf mit jeder Frucht und jedem Gemüse (einlegen, Nacht, leeren, doppelt leeren, voller Rucksack, Speichern und Laden, beschädigte Stände), die Bilder der Handwerkswaren für jeden Ausgangsstoff (mit einer Leinwand-Attrappe), werfende Maler (Ersatzbild statt Ausnahme) und die Spielschleife (`schleife.js`) |
| `angeln.browser.mjs` | Browser-Test des Angelns (Chromium, eigener Server): ans Wasser laufen, werfen, die Wartezeit abkürzen, einholen, Fang im Rucksack, Mausklick, Abbruch, Hochformat 390×844, keine Konsolenfehler; läuft mit `npm run test:browser` hinter dem Rauchtest |
| `browser.mjs` | Rauchtest in Chromium: neues Spiel, Feldarbeit, Menü, Rundgang bis in die Mine (Orte aus dem Punkte-Vertrag), jedes Item/jede Deko/jedes Gebäude/jedes Objekt/jede Pflanze malt ohne Ersatzbild (alle Jahreszeiten, Tag und Nacht), Ersatzbilder für Fehlendes, Kulling auf einer 100×72-Karte, große Objekte, Beläge, Pflanzenkunst mit `alle`, Kameraführung, alle Fenster öffnen sich mit ihren Beispieldaten, Schlafen, Speichern (v2), Einmachglas leeren (jede Sorte, voller Rucksack; danach muss sich die Spielerin noch bewegen können, denn „die Seite antwortet" genügt nicht: die Spielschleife kann stehen, während der Browser läuft), keine Konsolenfehler |

**Kerntests prüfen keine Bereichsinhalte.** Sie arbeiten mit Testkarten, Testinhalten und den
Punkten des Vertrags; was ein Bereich liefert, prüft `test/<bereich>.test.mjs`. Bereiche legen ihre
Testdatei selbst an oder erweitern sie (Vorlage: Kopf mit `test()`/`gruppe()` wie in den
vorhandenen Dateien, erste Zeile `import '../src/bereiche/inhalt.js';`). `alle.mjs` findet sie
von selbst. Braucht ein Bereichstest einen Gegenstand eines anderen Bereichs, der in diesem Zweig
noch fehlt, legt er ihn im Test an (`if (!ITEMS.milch) item('milch', { … })`).

`STRENG=1 npm test` prüft zusätzlich, dass jede mit `erwartet` angekündigte ID wirklich da ist –
nach dem Zusammenführen einer Welle.

Neue Fenster bringen ihre Beispieldaten für den Rauchtest selbst mit:
`fensterArt('tierinfo', bau, { beispiele: () => [{ tier: { name: 'Berta', … } }] })`.

Playwright liegt unter `/opt/node22/lib/node_modules/playwright`. Scheitert `import 'playwright'`,
hilft ein Symlink `node_modules/playwright -> /opt/node22/lib/node_modules/playwright`
(`node_modules/` ist in `.gitignore`).

---

## 8. Regeln für parallele Arbeit

1. **Nur im eigenen Bereich ändern.** Inhalte, Karten, Kunst, Fenster, Stile und Tests eines
   Bereichs liegen in seinem Ordner (und `test/<bereich>.test.mjs`). Querverweise auf andere
   Bereiche nur über IDs und Kartenpunkte. In Welle 1 gehören `src/mine.js` dem Bereich mine und
   `src/angeln.js` dem Bereich angeln.
2. **Kernänderungen klein halten** und als neuen Hook, neues Register-Feld oder neuen
   Modifikator einbauen – nie als Sonderfall für einen Bereich (`if (id === 'lene')` gehört in
   den Bereich, nicht in den Kern). Neue eigene Hook-Namen mit `hookBekannt()` aus der eigenen
   `inhalt.js` anmelden, nicht in `BEKANNTE_HOOKS` eintragen. Modifikator-Namen sind frei.
3. **Punkte-Vertrag halten.** Wer eine Karte umbaut, behält alle Pflicht-Punkte und alle Punkte,
   die andere benutzen; Warps und Ankunftspunkte des Weltgraphen bleiben am selben Rand.
4. **Namen sind global** – IDs, Bild-, Deko-, Gebäude-, Bedingungs-, Aktions-, Fenster- und
   Stilnamen. In parallelen Zweigen sieht niemand die neuen Namen der anderen; doppelte brechen
   erst beim Zusammenführen ab. Darum: Namen aus dem Vertrag (Karten, Punkte, Laden-IDs, die
   festen Item-IDs der Spezifikation) gelten wie vereinbart. **Jeder andere neue Name, der kein
   Gegenstand ist, beginnt mit dem Bereichsnamen** (`berg_bruecke`, `hof_teichufer`,
   `dorf_vitrine`, Bedingung `wildnis_strandbruecke`). Neue Gegenstände tragen sprechende
   deutsche IDs ohne Präfix und gehören klar zum Bereich (Fische, Gerichte, Mineralien …).
   Geteilte Deko (Baum mit `art`, Busch, Felsen, Laterne, Schild, Kiste, Fenster, Bild, Kamin,
   Topfpflanze, Tisch, Theke, Zaun) und Bodenzeichen (Tabelle in 5.) liegen in basis bzw. im Kern.
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
10. **Verweise auf noch fehlende IDs** anderer Bereiche mit `erwartet(...)` ankündigen und nur
   beim Benutzen auflösen (nie beim Laden); Rezepte und Ware damit blendet der Kern aus, bis es sie
   gibt. Platzhalter eines anderen Bereichs (Personen, Läden, Karten, die Aktion `kochen`) nicht
   nachbauen, sondern nutzen – der Besitzer baut sie aus.

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
| `KUNST` | `kunst(art, fn)` | `item.bild.art`, sonst Item-ID | `(g, bild, metall)` malt 16×16; Umriss macht der Kern; `metall` = Farbe der Werkzeugstufe | `bild` = `item.bild`; bei Handwerkswaren (Kategorie `artisan`) mit der Farbe `f` des Ausgangsstoffs (`slot.von`), und nur, wenn dessen Bild eine hat – sonst bleibt die eigene Farbe der Ware (`artisanBild`) |
| `OBJEKT_BILD` | `objektKunst(t, def)` | Objekttyp (`welt.objekte[…].t`) | `(o, k) → Leinwand`, `{ bild(o, k) }` oder `{ b, h, schluessel(o, k), malen(g, o, k), umriss }`; dazu Darstellungsfelder (unten). Ohne Eintrag: das Bild des gleichnamigen Items. Große Objekte (`flaeche`) stehen unten mittig auf ihrer Fläche. | `{ jz, band, nacht, s, t, tx, ty, ort }` – `ort.welt.objekte` für Nachbarn (Zaun: Nachbarmaske in den `schluessel`) |
| `DEKO_BILD` | `dekoKunst(typ, def)` | `deko[].typ` | `(g, d, k)` malt auf `w×16` oder `{ b(d), h, malen, umriss, zustand(d, k) }` bzw. `{ bild(d, k) }`; dazu Darstellungsfelder | `{ jz, winter, nacht, innen, s, w, zustand }` |
| `GEBAEUDE_BILD` | `gebaeudeKunst(typ, def)` | `gebaeude[].typ` | `{ b, h, malen(g, k), zustand(s, geb) → Objekt, licht: [[px, py]…], umriss }`; `zustand` bekommt das Gebäude (Stufe, Bauzustand) und geht in den Schlüssel | `{ jz, winter, nacht, zustand }` |
| `GEBAEUDE_LICHT` | `gebaeudeKunst(…, { licht })` | Gebäudetyp | Fensterpunkte im Bild, die nachts leuchten | |
| `BODEN_BILD` | `bodenKunst(z, fn)` | Bodenzeichen, auch `'z:rand'` (`'#:wald'`) | `(g, x0, y0, k)` malt eine Kachel | `{ tx, ty, z, jz, winter, def, innen (Farben), mf (Bandfarben), rand, gras, nachbarn: { n, s, w, o }, at(x, y) }` |
| `PFLANZEN_BILD` | `pflanzenKunst(name, fn)` | Pflanzen-ID, sonst `wuchs` | `(g, k)` malt Phase 2–4 auf 16×24 (Keimling, Phase 1 und verwelkt macht der Kern); `{ alle: true, malen(g, k), umriss }` malt auch Phase 0 und 1 (Rankhilfe ab dem ersten Tag) | `{ p, id, phase, f (Erntefarbe), fuss (21), gross (ab Phase 3) }` |
| `MONSTER_BILD` | `monsterKunst(art, fn)` | Monster-ID, sonst `art` | `(g, farbe, phase)` 16×16 | |
| `TIER_BILD` | `tierKunst(art, def)` | Tierart | `(g, schritt)` bzw. `{ b, h, malen }`, nach links schauend; rechts spiegelt der Kern | |
| `SYMBOL` | `symbolKunst(art, fn)` | Symbolname | `(g)` 16×16 für die Oberfläche (`symbolUrl`) | |
| `BELAG_BILD` | `belagKunst(t, fn)` | Belagtyp (`welt.belag[…].t`) | `(g, k)` 16×16 ohne Umriss | `{ maske, n, o, s, w (gleicher Belag daneben), jz, winter }` |
| `INNEN_FARBEN` | `innenFarben(name, def)` | `def.innen` | `{ tapete, streifen, leiste, teppich, muster }`; sonst `standard` | |
| `WASSER_FARBE` | `wasserFarbe(art, farbe)` | `def.wasser` | Farbe; alle Gewässerarten des Vertrags sind schon da | |

Paletten und Farbtabellen: `MINE_FARBEN[band]` (Liste, Bereich mine), `GRAS[jz]`, `LAUB[jz]`,
`HOLZ`, `HOLZ_D`, `BLATT`, `BLATT_D`, `BLATT_H`. Innenraum- und Wasserfarben nur über die
Funktionen eintragen (sie werfen bei doppelten Namen), nie per Zuweisung.

**Darstellungsfelder** von Objekten und Deko (render.js wertet sie aus): `tiefe` (Sortier-y
relativ zur Unterkante, Standard −1), `schatten: [rx, ry, dy]`, `durchsichtig: [breite, hoehe]`
(halb durchsichtig, wenn die Spielerin dahinter steht), `danach(g, ding, lage, k)` (zeichnet
gleich danach, `lage = { x, y, bx, by, bild }`), nur Objekte: `versatz(o, k) → [dx, dy]`,
`wackeln` (Standard true, Axt-Treffer); nur Deko: `flach` (sortiert nach der Oberkante: Bett,
Leiter). Teile großer Objekte (`t: 'teil'`) haben ein leeres Bild; gezeichnet wird ihr
Hauptobjekt.

**Zwischenspeicher:** Jedes Bild wird einmal gemalt. Was das Aussehen ändert, muss in den
Schlüssel: Jahreszeit und Tag/Nacht nimmt der Kern auf, Deko liefert `zustand(d, k)`, Gebäude
`zustand(s)`, Objekte `schluessel(o, k)`. Eigene Leinwände mit `gecacht(schluessel, fn)` und
einem Präfix des Bereichs.

**Ersatzbild:** Fehlt ein Bild (unbekannte Kunst, Deko, Gebäude, Objekt, Wuchsform, Monster,
Tier, Boden, Symbol), malt der Kern ein magenta-schwarz kariertes Feld in passender Größe,
setzt `leinwand.ersatz = true` und warnt einmal in der Konsole. Es stürzt nichts ab; die Tests
finden das Feld trotzdem. Dasselbe gilt, wenn ein **Maler wirft** (kaputte Daten, fehlende
Farbe): `gecacht(schluessel, fn, [b, h])` meldet es einmal als Konsolenfehler und legt das
Ersatzbild in den Zwischenspeicher, statt in jedem Bild neu zu werfen. Die Bild-Abrufe des Kerns
(`itemBild`, `objektBild`, `dekoBild`, `gebaeudeBild`, `pflanzeBild`, `belagBild`, `tierBild`,
`monsterBild`) tun das; eigene `gecacht`-Aufrufe dürfen eine Ersatzgröße angeben.
Malt ein Bereich Handwerkswaren aus Ausgangsstoffen, rechnet er nicht mit `bild.f` des
Ausgangsstoffs, ohne sie zu prüfen: nicht jedes Item hat eine Farbe (Lauch malt seine eigenen).

**Spielschleife** (`index.js`, Hilfe in `schleife.js`): Jedes Bild bestellt zuerst das nächste
und führt Eingabe, Spiel, Zeichnen und Oberfläche je in `schrittSicher(name, fn)` aus. Eine
Ausnahme wird einmal als Konsolenfehler gemeldet und beendet die Schleife nie; früher stand das
ganze Spiel still (der Browser antwortete weiter), sobald irgendwo ein Maler oder ein Hook warf.

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
| `boden` | Weltpixel | glitzern 10, beete 20, belag 25, wanddeko 30 | |
| `welt` | Weltpixel, y-sortiert | objekte 10, pflanzen 20, deko 30, gebaeude 40, funde 50, npcs 60, spieler 90 | muehlrad 42 (gemeinschaft), fallend 45 (pflanzen), huehner 70 (tiere), monster 80 (mine), angelrute 91 (angeln) |
| `ueber` | Weltpixel | ziel 10, partikel 30, texte 40 | angeln 20 (angeln) |
| `licht` | Bildschirmpixel | wetter 10, dunkel 50 | |
| `bildschirm` | Bildschirmpixel | blitz 10 | |

Innerhalb einer Ebene zählt `reihe`, bei gleichem `y` in der Welt die Reihenfolge der Zeichner.
Vor jedem Zeichner setzt der Kern Transformation, Deckkraft 1 und normales Überblenden.
`sicht = { x0, x1, y0, y1, sichtbar(tx, ty), imBild(px, py, b, h), def, s, jz, nacht, t, kamera }`
(Feldbereich mit Rand: 2 Felder links/rechts, 1 oben, 3 unten für hohe Bilder),
`kamera = { x, y, zoom, dpr, W, H, vw, vh }`. Helfer: `schatten(g, x, y, rx, ry)`,
`blase(g, x, y, '!' | '…')`, `spielerHinter(bx, by, b, h)`. Die Kamera folgt der Spielerin oder
`S.kameraFokus` (siehe „Eigene Spielmodi" in 2.).

**Werkzeugschwung:** Ohne Eintrag zeichnet der Kern einen Bogen (bzw. die Kanne bei
`werkzeugArt` mit `haltung: 'giessen'`). Eigene Bewegungen (Dolch-Stoß, Keule, Melkeimer,
Schere) registriert ein Bereich in grafik.js:
`schwungKunst('dolch', (g, aktion, sp, bild) => { … })` – g in Weltkoordinaten, `aktion.t /
aktion.dauer` ist der Fortschritt, `sp` die Spielerin (`x, y, blick`), `bild` das Item-Bild.

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
| `FENSTER` | `fensterArt(name, bau, { fest, beispiele })` | `bau(daten) → Element`, meist `fensterRahmen(titel, inhalt, { klasse: 'breit', kopfExtra })`; `fest`: Esc und Klick daneben schließen nicht (Wahlfenster); `beispiele: () => [daten…]` für den Rauchtest |
| `MENUE_REITER` | `menueReiter({ id, name, bauen(d), reihe })` | Reiter im Menü; Kern: rucksack 10, basteln 20, faehigkeiten 30, freunde 40, optionen 90 |
| `HUD_ELEMENTE` | `hudElement({ id, bauen(), aktualisieren(el, s), reihe })` | eigene Anzeigen im HUD (Buffs, Fest-Uhr, Knöpfe eines Baumodus …); `aktualisieren` läuft jedes Bild |
| `WARE_BILD` | `wareBild(spezial, (ware) → Element)` | Bild einer Spezialware ohne Item im Laden |
| `STATISTIK` | `statistik({ id, name, wert(s), reihe })` | Zeilen unter „Bisher" im Reiter Fähigkeiten |
| `RUCKSACK_TEILE` | `rucksackTeil({ id, reihe, bauen(d, { slot, idx }) })` | Teile in der Rucksack-Ansicht unter der Info zum gewählten Platz (Ringplätze, Stiefel) |
| `RUCKSACK_AKTIONEN` | `rucksackAktion({ id, name, wenn(slot, s), tun(d, { slot, idx }), reihe })` | Knöpfe für den gewählten Platz („Anlegen") |
| `STILE` | `stil(id, css)` | CSS eines Bereichs; hängt einmal ein `<style>` an den Kopf (in Node: nichts). Fensterstile gehören in den Bereich, nicht in `index.css` |

Geöffnet wird ein Fenster aus der Spiellogik mit `fenster(name, daten)` (spiel.js, über
`S.hooks`) – inhalt.js importiert ui.js nie. Fenster des Kerns: `menue`, `brief`, `tagEnde`.
`daten.danach` läuft beim Schließen. Nach dem Tagesabschluss öffnet „Guten Morgen!" erst die
Fenster aus `bericht.wahlen` nacheinander (jedes bekommt `danach` für das nächste), dann beginnt
der Morgen und es wird gespeichert. Ein Wahlfenster ist `fest` und schließt sich selbst mit
`fensterSchliessen()`, wenn gewählt ist.

Meldungen: Eine gleiche Meldung, die gerade steht oder zuletzt wartet, wird nicht noch einmal
eingereiht; der Tagesabschluss leert die Schlange. Der runde Aktion-Knopf (Touch) zeigt den
ganzen Hinweis und wird bei langem Text zur Pille.

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
| basis | Werkzeuge, Grundrohstoffe, Müll; Objekte grossstumpf, ast, stein, fels, unkraut, sammel; geteilte Deko baum (Bild aus dem Objekt „baum", `art` wählbar), busch, felsen, laterne, schild, kiste, fenster, bild, kamin, pflanze, tisch, theke, zaun (waagerecht `w` oder senkrecht `h`) | – |
| hof | Gebäude haus; Innenfarben haus; Deko bett, tv, herd, versandkiste, briefkasten | Fenster versand; Stil hof-versand |
| dorf | Essen aus dem Gasthaus; Gebäude laden, rathaus, gasthaus, schmiede, atelier; Innenfarben laden, gasthaus; Deko brunnen, bank, blumen, amboss, fass, regal, saatregal, flaschen | Fenster laden (für alle Händler), Warenbilder upgrade, rucksack; Stil dorf-laden |
| wildnis | Gebäude huette (Fischladen), ranch, turm; Deko strandkorb | – |
| berg | Gebäude hoehle (Mineneingang, mit Geröll solange zu), zimmerei, gilde | – |
| pflanzen | Saatgut, Ernte, Wildpflanzen, Strandfunde, Dünger; Wuchsformen; Objekte baum, stumpf; Zeichner fallend | – |
| angeln | Angel, Fische, Köder; Deko stand; Zeichner angelrute und angeln (Rute, Schnur, Schwimmer, Wellen, Blasenspur, Biss, Fang im Flug; anzeige.js) | – |
| mine | Erze, Barren, Mineralien, Schwert; Minen-Bänder; Objekte mstein, leiter, schatz; Deko leiter_ab, leiter_auf, aufzug, schwertfund, wandlampe; Monster schleim, fledermaus; Zeichner monster | Fenster aufzug, Statistik tiefste |
| handwerk | Truhe, Vogelscheuche, Sprenger, Einmachglas, Marmelade, Eingelegtes; Objekt einmachglas | Fenster truhe (alle Behälter) |
| tiere | Eier; Gebäude stall; Tier huhn; Zeichner huehner | Warenbilder kueken, stall |
| gemeinschaft | Medaille; Gebäude muehle (verfallen/repariert); Deko brett; Zeichner muehlrad | Fenster muehle, brett; Menüreiter aufgaben; Stil gemeinschaft-buendel |
| npcs, npcs2, feste | – (Figuren und Porträts malt der Kern aus `aussehen`) | – |

Der Kern malt außerdem die Steintreppe (Boden `T`) und das leere Bild der Teile großer Objekte.

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

---

## 10. Absprachen für Welle 1

Was zwei oder mehr Bereiche gemeinsam brauchen, ist hier festgelegt; der Kern hat die
Erweiterungspunkte dafür. Damit lässt sich jeder Auftrag nur im eigenen Ordner umsetzen.

| Thema | Wer was tut | Kern |
|---|---|---|
| Hausstufen | tiere verkauft den Ausbau und setzt `s.haus.stufe` (0–2); hof baut die Innenräume (z. B. Karten `haus`, `haus1`, `haus2`, alle mit `zuhause: true`, `aufstellen: true` und den Vertragspunkten), führt die Haustür je Stufe (Gebäude-Varianten mit `nurWenn`) und liefert über den Hook `zuhause` die Karte der aktuellen Stufe | `L.zuhause`, Hook `zuhause`, Kartenfelder `zuhause`, `aufstellen` |
| Herd und Kochen | hof stellt die Deko `{ typ: 'herd', aktion: 'kochen' }` an den Punkt `kueche`; handwerk ersetzt die Platzhalter-Aktion (`dekoAktion('kochen', …, { ersetzen: true })`) und baut Kochfenster und Rezepte (`art: 'kochen'`, `lernen`) | `rezeptLernen`, `rezepteVon`, `ersetzen` |
| Kühlschrank | hof legt in der Küche (ab Stufe 1) ein Behälter-Objekt `{ t: 'kuehlschrank', inv }` an (eigener Objekttyp, öffnet `fenster('truhe', { truhe: o, titel: 'Kühlschrank', drin: 'Im Kühlschrank' })`); handwerk nimmt beim Kochen Zutaten aus dem Rucksack und allen Behältern (`o.inv`) der aktuellen Karte | Behälter-Konvention |
| Fernseher | Deko-Aktion heißt `tv` (hof); weitere Sender über den Hook `fernsehen` → `[[name, fn]]` (handwerk: Kochsendung sonntags) | Hook `fernsehen` |
| Gewächshaus | hof baut außen (kaputt bis `s.flags.gewaechshaus`, Bedingung `gewaechshaus` in hof) und innen (Karte `gewaechshaus` mit `farmbar`, `ganzjaehrig`); die Flagge setzt in Welle 2 die Mühle, bis dahin ein Brief von hof | Kartenfeld `ganzjaehrig` |
| Ställe | tiere baut Ställe und Scheunen als dynamische Gebäude (Hook `gebaeude`) mit dynamischen Innenräumen (`kartenAnbieter`, `karteVergessen` beim Ausbau) im Hof-Bereich `bauland`; Baumodus über Hook `eingabe`, `S.modus`, `S.kameraFokus`, `feldUnterZeiger`, Knöpfe als `hudElement`. hof behält die Bereiche `bauland`, `stall`, `auslauf` | Hook `eingabe`, Kamera |
| Heu | pflanzen ruft beim Mähen von hohem Gras `alle('grasGemaeht', { s, ort, x, y, erg, r })`; tiere füllt damit das Silo | vereinbarter Hook |
| Bäume | pflanzen besitzt die Objekte `baum` und `stumpf`, die Baumarten (`baumArt`) und den Zeichner `fallend`; andere Bereiche legen Bäume als `{ t: 'baum', art, hp }` an (ausgewachsen) und Kulissenbäume als Deko `{ typ: 'baum', art }`; der Zapfhahn (handwerk) liest `BAUM_ARTEN[o.art].zapfen` | `baumArt` |
| Große Objekte | Riesenpflanzen (pflanzen), der Stamm vor dem Geheimen Wald (wildnis), Baustellen (tiere) über `flaeche` und `L.objektSetzen` | große Objekte |
| Rankhilfe | Pflanzen mit `rankhilfe: true` versperren ihr Beet; ihr Bild ab dem ersten Tag über `pflanzenKunst(…, { alle: true })` | Kern |
| Böden und Wege | handwerk registriert `belagTyp` samt Items (`belag: 'id'`) und `belagKunst`; legen und aufheben macht der Kern | `belagTyp`, `welt.belag` |
| Zäune | handwerk baut Zäune als aufstellbare Objekte (Bild mit Nachbarmaske über `k.ort`); die Deko `zaun` (basis) ist Kulisse für Karten | `k.ort` |
| Waffen, Werkzeuge | mine: eigene Schwünge mit `schwungKunst`; tiere: Melkeimer und Schere als `werkzeugArt` | `schwungKunst` |
| Ringe und Buffs | mine: Ringplätze als `rucksackTeil`/`rucksackAktion`; Wirkung (auch handwerks Buffs und Berufe) über Modifikatoren, Fähigkeits-Boni über `stufe`, Magnet über `sammelRadius` | Register, Modifikatoren |
| Berufe | handwerk hängt im Hook `tagEnde` an `bericht.wahlen` ein festes Wahlfenster an | `bericht.wahlen`, `fest` |
| Maschinen | handwerk; Laufzeit über Objekt-`minuten`, über Nacht `nacht` mit `nachtMinuten`; Eingaben nach `sorte` (pflanzen, angeln) oder Item-ID | `nachtMinuten` |
| Artefaktstellen | mine legt Objekte mit `hacke(c)` auf Dorf, Wald, Strand und Berg (über `objekteDynamisch` oder `tagEnde`), die Hacke erreicht sie überall | Hacke |
| Läden | Personen und Läden: Greta/`zimmerei`, Wilma/`ranch` (tiere), Alrik/`gilde` (mine), Lene/`fischer` (angeln, Laden im Fischladen); Räume und Theken bauen berg und wildnis. Ware in fremden Läden über `ladenWare`/`ladenKauft` (pflanzen: Saatgut, Setzlinge bei Ottilie; angeln: bei Lene; mine: Geoden bei Bruno; tiere: Küken bei Ottilie bis Wilma übernimmt) | Hooks |
| Dorfbewohner | npcs bleibt in Welle 1 unverändert; neue schlichte Personen legt der Bereich an, der ihren Laden betreibt | – |
| Steinbruch | berg füllt Steine und Erze über `tagEnde` nach (Objekte `stein`, `fels` aus basis; Erzbrocken `mstein` mit `art` aus mine) und nutzt `L.feldFrei` | `feldFrei` |
| Namen | Präfixregel aus 8.4, Bodenzeichen aus der Tabelle in 5. | – |
