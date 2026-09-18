// Zauber & Kampfaktionen.
// Ein einziges Aktionsschema für Spielercharaktere UND Gegner — die Kampf-KI
// und die Spieleroberfläche lesen beide dieselben Felder.
//
// Schema:
//   id, name, kind: 'zauber'|'waffe'|'merkmal'
//   level     0 = Zaubertrick
//   cost      'aktion' | 'bonus' | 'reaktion' | 'frei'
//   range     in Feldern (1 Feld = 1,5 m). 0 = Selbst, 1 = Nahkampf
//   targets   'kreatur' | 'punkt' | 'selbst' | 'verbuendeter' | 'alle'
//   shape     { type:'kugel'|'linie'|'kegel', radius|length|width }
//   attack    true  → Angriffswurf gegen RK
//   save      { ability, half:boolean }
//   damage    [{ dice, type }]
//   heal      Würfelausdruck
//   effects   [{ condition, rounds, saveEnds, escapeDc }]
//   uses      { max, per:'kampf'|'rast'|'tag' }  (sonst Zauberplatz)

export const SPELLS = {
  // ─────────────────────────── Zaubertricks ───────────────────────────
  feuerpfeil: {
    id: 'feuerpfeil', name: 'Feuerpfeil', kind: 'zauber', level: 0, cost: 'aktion',
    range: 8, targets: 'kreatur', attack: true, school: 'Hervorrufung',
    damage: [{ dice: '1W10', type: 'feuer' }], scaling: { 5: '2W10', 11: '3W10', 17: '4W10' },
    desc: 'Ein Strahl Feuer. Entzündet brennbares Material, das niemand trägt.',
  },
  schauriger_strahl: {
    id: 'schauriger_strahl', name: 'Schauriger Strahl', kind: 'zauber', level: 0, cost: 'aktion',
    range: 8, targets: 'kreatur', attack: true, school: 'Hervorrufung',
    damage: [{ dice: '1W10', type: 'kraft' }], scaling: { 5: '2W10', 11: '3W10', 17: '4W10' },
    desc: 'Ein Strahl knisternder Energie aus der Anderswelt.',
  },
  saeurespritzer: {
    id: 'saeurespritzer', name: 'Säurespritzer', kind: 'zauber', level: 0, cost: 'aktion',
    range: 8, targets: 'punkt', shape: { type: 'kugel', radius: 1 },
    save: { ability: 'ge', half: false }, school: 'Hervorrufung',
    damage: [{ dice: '1W6', type: 'saeure' }], scaling: { 5: '2W6', 11: '3W6', 17: '4W6' },
    desc: 'Eine Blase Säure, die zwei nebeneinanderstehende Ziele erwischt.',
  },
  frostberuehrung: {
    id: 'frostberuehrung', name: 'Frostberührung', kind: 'zauber', level: 0, cost: 'aktion',
    range: 8, targets: 'kreatur', attack: true, school: 'Nekromantie',
    damage: [{ dice: '1W8', type: 'nekrotisch' }], scaling: { 5: '2W8', 11: '3W8', 17: '4W8' },
    effects: [{ condition: 'verlangsamt', rounds: 1 }],
    desc: 'Eine Hand aus Grabesfrost. Das Ziel kann sich bis zu seinem nächsten Zug nicht heilen.',
  },
  heilige_flamme: {
    id: 'heilige_flamme', name: 'Heilige Flamme', kind: 'zauber', level: 0, cost: 'aktion',
    range: 12, targets: 'kreatur', save: { ability: 'ge', half: false }, school: 'Hervorrufung',
    damage: [{ dice: '1W8', type: 'strahlend' }], scaling: { 5: '2W8', 11: '3W8', 17: '4W8' },
    desc: 'Licht fällt auf das Ziel. Deckung hilft nicht.',
  },
  seelenglut_trick: {
    id: 'seelenglut_trick', name: 'Seelenglut', kind: 'zauber', level: 0, cost: 'aktion',
    range: 12, targets: 'kreatur', save: { ability: 'ch', half: false }, school: 'Nekromantie',
    damage: [{ dice: '1W8', type: 'nekrotisch' }], scaling: { 5: '2W8', 11: '3W8', 17: '4W8' },
    desc: 'Schwarze Glut, die nach dem Namen greift statt nach dem Fleisch.',
  },
  gifthauch: {
    id: 'gifthauch', name: 'Gifthauch', kind: 'zauber', level: 0, cost: 'aktion',
    range: 6, targets: 'kreatur', save: { ability: 'ko', half: false }, school: 'Nekromantie',
    damage: [{ dice: '1W12', type: 'gift' }], scaling: { 5: '2W12', 11: '3W12', 17: '4W12' },
    desc: 'Ein Nebel aus grünem Gift. Kreaturen, die nicht atmen, lachen darüber.',
  },
  magierhand: {
    id: 'magierhand', name: 'Schockgriff', kind: 'zauber', level: 0, cost: 'aktion',
    range: 1, targets: 'kreatur', attack: true, school: 'Hervorrufung',
    damage: [{ dice: '1W8', type: 'blitz' }], scaling: { 5: '2W8', 11: '3W8', 17: '4W8' },
    advantageVsMetal: true,
    desc: 'Blitz aus der Handfläche. Das Ziel verliert seine Reaktion.',
  },

  // ─────────────────────────── Grad 1 ───────────────────────────
  magisches_geschoss: {
    id: 'magisches_geschoss', name: 'Magisches Geschoss', kind: 'zauber', level: 1, cost: 'aktion',
    range: 24, targets: 'kreatur', autoHit: true, missiles: 3, school: 'Hervorrufung',
    damage: [{ dice: '1W4+1', type: 'kraft' }], upcast: { missilesPerLevel: 1 },
    desc: 'Drei Pfeile aus purer Kraft. Sie verfehlen niemals.',
  },
  brennende_haende: {
    id: 'brennende_haende', name: 'Brennende Hände', kind: 'zauber', level: 1, cost: 'aktion',
    range: 0, targets: 'punkt', shape: { type: 'kegel', length: 3 },
    save: { ability: 'ge', half: true }, school: 'Hervorrufung',
    damage: [{ dice: '3W6', type: 'feuer' }], upcast: { dicePerLevel: '1W6' },
    desc: 'Ein Fächer aus Feuer aus den Fingerspitzen.',
  },
  wunden_heilen: {
    id: 'wunden_heilen', name: 'Wunden heilen', kind: 'zauber', level: 1, cost: 'aktion',
    range: 1, targets: 'verbuendeter', heal: '1W8+MOD', school: 'Hervorrufung',
    upcast: { healPerLevel: '1W8' },
    desc: 'Berührung schließt Fleisch. Nicht bei Konstrukten und Untoten.',
  },
  heilendes_wort: {
    id: 'heilendes_wort', name: 'Heilendes Wort', kind: 'zauber', level: 1, cost: 'bonus',
    range: 12, targets: 'verbuendeter', heal: '1W4+MOD', school: 'Hervorrufung',
    upcast: { healPerLevel: '1W4' },
    desc: 'Ein Wort über die Entfernung. Reicht, um jemanden wieder auf die Beine zu bringen.',
  },
  segnen: {
    id: 'segnen', name: 'Segnen', kind: 'zauber', level: 1, cost: 'aktion', concentration: true,
    range: 6, targets: 'verbuendeter', multiTarget: 3, school: 'Bannmagie',
    effects: [{ condition: 'segen', rounds: 10 }],
    desc: 'Bis zu drei Verbündete würfeln 1W4 zusätzlich auf Angriffe und Rettungswürfe.',
  },
  schild: {
    id: 'schild', name: 'Schild', kind: 'zauber', level: 1, cost: 'reaktion',
    range: 0, targets: 'selbst', school: 'Bannmagie',
    effects: [{ condition: 'schild', rounds: 1, acBonus: 5 }],
    desc: '+5 RK bis zum Beginn deines nächsten Zuges — auch noch, nachdem du den Trefferwurf gesehen hast.',
  },
  fesselnder_schlag: {
    id: 'fesselnder_schlag', name: 'Ranken', kind: 'zauber', level: 1, cost: 'aktion', concentration: true,
    range: 6, targets: 'kreatur', save: { ability: 'st', half: false }, school: 'Beschwörung',
    effects: [{ condition: 'festgesetzt', rounds: 10, saveEnds: 'st' }],
    desc: 'Dornenranken brechen aus dem Boden und halten fest.',
  },
  schlaf: {
    id: 'schlaf', name: 'Schlaf', kind: 'zauber', level: 1, cost: 'aktion',
    range: 18, targets: 'punkt', shape: { type: 'kugel', radius: 2 }, school: 'Verzauberung',
    sleepPool: '5W8', upcast: { poolPerLevel: '2W8' },
    desc: 'Kreaturen mit den wenigsten Trefferpunkten schlafen ein, bis der Vorrat erschöpft ist.',
  },
  donnerwoge: {
    id: 'donnerwoge', name: 'Donnerwoge', kind: 'zauber', level: 1, cost: 'aktion',
    range: 0, targets: 'punkt', shape: { type: 'kugel', radius: 2 },
    save: { ability: 'ko', half: true }, school: 'Hervorrufung',
    damage: [{ dice: '2W8', type: 'donner' }], push: 4, upcast: { dicePerLevel: '1W8' },
    desc: 'Eine Welle aus Lärm stößt alles von dir weg.',
  },
  goettliche_gunst: {
    id: 'goettliche_gunst', name: 'Göttliche Gunst', kind: 'zauber', level: 1, cost: 'bonus', concentration: true,
    range: 0, targets: 'selbst', school: 'Hervorrufung',
    effects: [{ condition: 'goettliche_gunst', rounds: 10, bonusDamage: { dice: '1W4', type: 'strahlend' } }],
    desc: 'Deine Waffe trägt Licht: +1W4 strahlender Schaden pro Treffer.',
  },
  jaegerszeichen: {
    id: 'jaegerszeichen', name: 'Jägerzeichen', kind: 'zauber', level: 1, cost: 'bonus', concentration: true,
    range: 18, targets: 'kreatur', school: 'Weissagung',
    effects: [{ condition: 'markiert', rounds: 10, markDamage: { dice: '1W6', type: 'stich' } }],
    desc: 'Du markierst ein Ziel: +1W6 Schaden bei jedem deiner Treffer.',
  },
  person_bezaubern: {
    id: 'person_bezaubern', name: 'Person bezaubern', kind: 'zauber', level: 1, cost: 'aktion',
    range: 6, targets: 'kreatur', save: { ability: 'we', half: false }, school: 'Verzauberung',
    effects: [{ condition: 'bezaubert', rounds: 10 }], humanoidOnly: true,
    desc: 'Das Ziel hält dich für einen Freund. Es merkt es später.',
  },
  dissonantes_fluestern: {
    id: 'dissonantes_fluestern', name: 'Dissonantes Flüstern', kind: 'zauber', level: 1, cost: 'aktion',
    range: 12, targets: 'kreatur', save: { ability: 'we', half: true }, school: 'Verzauberung',
    damage: [{ dice: '3W6', type: 'psychisch' }], fleeOnFail: true, upcast: { dicePerLevel: '1W6' },
    desc: 'Eine Melodie, die nur das Ziel hört. Es rennt weg.',
  },

  // ─────────────────────────── Grad 2 ───────────────────────────
  brennender_strahl: {
    id: 'brennender_strahl', name: 'Sengender Strahl', kind: 'zauber', level: 2, cost: 'aktion',
    range: 24, targets: 'kreatur', attack: true, missiles: 3, perMissileAttack: true, school: 'Hervorrufung',
    damage: [{ dice: '2W6', type: 'feuer' }], upcast: { missilesPerLevel: 1 },
    desc: 'Drei Strahlen, jeder mit eigenem Angriffswurf.',
  },
  unsichtbarkeit: {
    id: 'unsichtbarkeit', name: 'Unsichtbarkeit', kind: 'zauber', level: 2, cost: 'aktion', concentration: true,
    range: 1, targets: 'verbuendeter', school: 'Illusion',
    effects: [{ condition: 'unsichtbar', rounds: 10 }],
    desc: 'Bis zum ersten Angriff oder Zauber bist du nicht da.',
  },
  person_festhalten: {
    id: 'person_festhalten', name: 'Person festhalten', kind: 'zauber', level: 2, cost: 'aktion', concentration: true,
    range: 12, targets: 'kreatur', save: { ability: 'we', half: false }, school: 'Verzauberung',
    effects: [{ condition: 'gelaehmt', rounds: 10, saveEnds: 'we' }], humanoidOnly: true,
    desc: 'Das Ziel ist gelähmt. Nahkampftreffer werden automatisch kritisch.',
  },
  spirituelle_waffe: {
    id: 'spirituelle_waffe', name: 'Spirituelle Waffe', kind: 'zauber', level: 2, cost: 'bonus',
    range: 12, targets: 'kreatur', attack: true, school: 'Hervorrufung',
    damage: [{ dice: '1W8+MOD', type: 'wucht' }], recurring: true,
    desc: 'Eine schwebende Klinge, die jede Runde als Bonusaktion zuschlägt.',
  },
  hitzemetall: {
    id: 'hitzemetall', name: 'Metall erhitzen', kind: 'zauber', level: 2, cost: 'aktion', concentration: true,
    range: 12, targets: 'kreatur', school: 'Verwandlung',
    damage: [{ dice: '2W8', type: 'feuer' }], save: { ability: 'ko', half: false }, dropWeapon: true,
    upcast: { dicePerLevel: '1W8' },
    desc: 'Rüstung und Klinge glühen. Wer den Rettungswurf verpatzt, lässt fallen, was er hält.',
  },
  hilfe: {
    id: 'hilfe', name: 'Hilfe', kind: 'zauber', level: 2, cost: 'aktion',
    range: 6, targets: 'verbuendeter', multiTarget: 3, tempHp: 5, school: 'Bannmagie',
    desc: 'Drei Verbündete bekommen 5 temporäre Trefferpunkte.',
  },
  misty_step: {
    id: 'misty_step', name: 'Nebelschritt', kind: 'zauber', level: 2, cost: 'bonus',
    range: 6, targets: 'punkt', teleport: true, school: 'Beschwörung',
    desc: 'Du verschwindest in silbrigem Nebel und stehst 9 m weiter.',
  },
  schattenklinge: {
    id: 'schattenklinge', name: 'Schattenklinge', kind: 'zauber', level: 2, cost: 'bonus', concentration: true,
    range: 1, targets: 'kreatur', attack: true, school: 'Illusion',
    damage: [{ dice: '2W8', type: 'psychisch' }], advInDark: true,
    desc: 'Eine Klinge aus verdichteter Finsternis. Im Dunkeln mit Vorteil.',
  },

  // ─────────────────────────── Grad 3 ───────────────────────────
  feuerball: {
    id: 'feuerball', name: 'Feuerball', kind: 'zauber', level: 3, cost: 'aktion',
    range: 30, targets: 'punkt', shape: { type: 'kugel', radius: 4 },
    save: { ability: 'ge', half: true }, school: 'Hervorrufung',
    damage: [{ dice: '8W6', type: 'feuer' }], upcast: { dicePerLevel: '1W6' },
    desc: 'Eine Kugel Feuer mit 6 m Radius. Der Klassiker, aus gutem Grund.',
  },
  blitz: {
    id: 'blitz', name: 'Blitz', kind: 'zauber', level: 3, cost: 'aktion',
    range: 0, targets: 'punkt', shape: { type: 'linie', length: 20 },
    save: { ability: 'ge', half: true }, school: 'Hervorrufung',
    damage: [{ dice: '8W6', type: 'blitz' }], upcast: { dicePerLevel: '1W6' },
    desc: 'Eine 30 m lange Linie aus weißem Licht.',
  },
  gegenzauber: {
    id: 'gegenzauber', name: 'Gegenzauber', kind: 'zauber', level: 3, cost: 'reaktion',
    range: 12, targets: 'kreatur', counterspell: true, school: 'Bannmagie',
    desc: 'Zauber bis Grad 3 scheitern automatisch, höhere nach Probe.',
  },
  wiederbelebung: {
    id: 'wiederbelebung', name: 'Wiederbeleben', kind: 'zauber', level: 3, cost: 'aktion',
    range: 1, targets: 'verbuendeter', revive: true, heal: '1', school: 'Nekromantie',
    desc: 'Bringt einen Gefährten zurück auf die Beine, mit 1 TP.',
  },
  massenheilendes_wort: {
    id: 'massenheilendes_wort', name: 'Heilendes Wort der Menge', kind: 'zauber', level: 3, cost: 'bonus',
    range: 12, targets: 'verbuendeter', multiTarget: 6, heal: '1W4+MOD', school: 'Hervorrufung',
    upcast: { healPerLevel: '1W4' },
    desc: 'Sechs Verbündete auf einmal.',
  },
  verlangsamen: {
    id: 'verlangsamen', name: 'Verlangsamen', kind: 'zauber', level: 3, cost: 'aktion', concentration: true,
    range: 24, targets: 'punkt', shape: { type: 'kugel', radius: 3 },
    save: { ability: 'we', half: false }, school: 'Verwandlung',
    effects: [{ condition: 'verlangsamt', rounds: 10, saveEnds: 'we' }],
    desc: 'Bis zu sechs Kreaturen bewegen sich wie durch Sirup.',
  },
  hast: {
    id: 'hast', name: 'Hast', kind: 'zauber', level: 3, cost: 'aktion', concentration: true,
    range: 6, targets: 'verbuendeter', school: 'Verwandlung',
    effects: [{ condition: 'gehastet', rounds: 10, acBonus: 2, extraAction: true }],
    desc: 'Doppelte Bewegung, +2 RK und eine zusätzliche Aktion pro Zug.',
  },

  // ─────────────────────────── Grad 4–5 ───────────────────────────
  eissturm: {
    id: 'eissturm', name: 'Eissturm', kind: 'zauber', level: 4, cost: 'aktion',
    range: 30, targets: 'punkt', shape: { type: 'kugel', radius: 4 },
    save: { ability: 'ge', half: true }, school: 'Hervorrufung',
    damage: [{ dice: '2W8', type: 'wucht' }, { dice: '4W6', type: 'kaelte' }],
    difficultTerrain: true, upcast: { dicePerLevel: '1W8' },
    desc: 'Hagel und Frost; der Boden bleibt danach schwieriges Gelände.',
  },
  seelenverzehr: {
    id: 'seelenverzehr', name: 'Blutsauger', kind: 'zauber', level: 4, cost: 'aktion',
    range: 6, targets: 'kreatur', save: { ability: 'ko', half: true }, school: 'Nekromantie',
    damage: [{ dice: '6W8', type: 'nekrotisch' }], drain: 0.5, upcast: { dicePerLevel: '1W8' },
    desc: 'Du trinkst das Leben des Ziels und heilst die Hälfte des Schadens.',
  },
  todeswolke: {
    id: 'todeswolke', name: 'Wolkentod', kind: 'zauber', level: 5, cost: 'aktion', concentration: true,
    range: 24, targets: 'punkt', shape: { type: 'kugel', radius: 4 },
    save: { ability: 'ko', half: true }, school: 'Beschwörung',
    damage: [{ dice: '5W8', type: 'gift' }], lingering: 5,
    desc: 'Eine Wolke aus gelbgrünem Gift, die bleibt und jede Runde erneut wirkt.',
  },
  kegel_der_kaelte: {
    id: 'kegel_der_kaelte', name: 'Kältekegel', kind: 'zauber', level: 5, cost: 'aktion',
    range: 0, targets: 'punkt', shape: { type: 'kegel', length: 6 },
    save: { ability: 'ko', half: true }, school: 'Hervorrufung',
    damage: [{ dice: '8W8', type: 'kaelte' }], upcast: { dicePerLevel: '1W8' },
    desc: 'Ein 18-m-Kegel aus absolutem Frost.',
  },
  wunden_heilen_gross: {
    id: 'wunden_heilen_gross', name: 'Große Heilung', kind: 'zauber', level: 5, cost: 'aktion',
    range: 1, targets: 'verbuendeter', heal: '70', school: 'Hervorrufung',
    desc: 'Siebzig Trefferpunkte. Keine Würfel, keine Diskussion.',
  },

  // ─────────────────────────── Grad 6–9 (Akt III/IV) ───────────────────────────
  kettenblitz: {
    id: 'kettenblitz', name: 'Kettenblitz', kind: 'zauber', level: 6, cost: 'aktion',
    range: 30, targets: 'kreatur', chain: 3, save: { ability: 'ge', half: true }, school: 'Hervorrufung',
    damage: [{ dice: '10W8', type: 'blitz' }],
    desc: 'Ein Blitz, der auf bis zu drei weitere Ziele überspringt.',
  },
  desintegration: {
    id: 'desintegration', name: 'Zerfall', kind: 'zauber', level: 6, cost: 'aktion',
    range: 24, targets: 'kreatur', save: { ability: 'ge', half: false }, school: 'Verwandlung',
    damage: [{ dice: '10W6+40', type: 'kraft' }],
    desc: 'Ein dünner grüner Strahl. Was auf 0 TP fällt, wird zu grauem Staub.',
  },
  feuersturm: {
    id: 'feuersturm', name: 'Feuersturm', kind: 'zauber', level: 7, cost: 'aktion',
    range: 30, targets: 'punkt', shape: { type: 'kugel', radius: 5 },
    save: { ability: 'ge', half: true }, school: 'Hervorrufung',
    damage: [{ dice: '7W10', type: 'feuer' }], sparesAllies: true,
    desc: 'Flammensäulen, die du so setzen kannst, dass Verbündete verschont bleiben.',
  },
  wort_der_macht_toeten: {
    id: 'wort_der_macht_toeten', name: 'Machtwort: Töten', kind: 'zauber', level: 9, cost: 'aktion',
    range: 12, targets: 'kreatur', instantKillBelow: 100, school: 'Verzauberung',
    damage: [{ dice: '12W12', type: 'psychisch' }],
    desc: 'Ein Wort. Wer darunter 100 TP hat, stirbt.',
  },
  massenheilung: {
    id: 'massenheilung', name: 'Massenheilung', kind: 'zauber', level: 9, cost: 'aktion',
    range: 12, targets: 'verbuendeter', multiTarget: 6, heal: '700', divided: true, school: 'Hervorrufung',
    desc: 'Ein Strom aus Heilung, verteilt auf die ganze Gruppe.',
  },
  zeitstopp: {
    id: 'zeitstopp', name: 'Zeitstopp', kind: 'zauber', level: 9, cost: 'aktion',
    range: 0, targets: 'selbst', extraTurns: 2, school: 'Verwandlung',
    desc: 'Zwei zusätzliche Züge, bevor die Welt merkt, dass du dich bewegt hast.',
  },
};

/** Waffenangriffe und Klassenmerkmale, die wie Zauber abgehandelt werden. */
export const FEATURES = {
  zweiter_wind: {
    id: 'zweiter_wind', name: 'Zweiter Wind', kind: 'merkmal', cost: 'bonus',
    range: 0, targets: 'selbst', heal: '1W10+STUFE', uses: { max: 1, per: 'kampf' },
    desc: 'Du schöpfst Atem und heilst dich selbst.',
  },
  aktionsschub: {
    id: 'aktionsschub', name: 'Handlungsrausch', kind: 'merkmal', cost: 'bonus',
    range: 0, targets: 'selbst', grantAction: true, uses: { max: 1, per: 'kampf' },
    desc: 'Eine zusätzliche Aktion in diesem Zug.',
  },
  hinterhaeltiger_angriff: {
    id: 'hinterhaeltiger_angriff', name: 'Hinterhältiger Angriff', kind: 'passiv',
    desc: 'Zusätzlicher Schaden, wenn du Vorteil hast oder ein Verbündeter neben dem Ziel steht.',
  },
  rasender_angriff: {
    id: 'rasender_angriff', name: 'Kampfrausch', kind: 'merkmal', cost: 'bonus',
    range: 0, targets: 'selbst', uses: { max: 2, per: 'rast' },
    effects: [{ condition: 'rasend', rounds: 10, damageBonus: 2, resistPhysical: true }],
    desc: 'Resistenz gegen Hieb-, Stich- und Wuchtschaden, Vorteil auf Stärkeproben, +2 Schaden.',
  },
  gottheit_kanalisieren: {
    id: 'gottheit_kanalisieren', name: 'Göttlichkeit kanalisieren', kind: 'merkmal', cost: 'aktion',
    range: 6, targets: 'punkt', shape: { type: 'kugel', radius: 4 },
    save: { ability: 'we', half: false }, uses: { max: 1, per: 'rast' },
    turnUndead: true,
    desc: 'Untote und Feenwesen im Umkreis fliehen vor dem Licht deines Gottes.',
  },
  goettliches_geschmetter: {
    id: 'goettliches_geschmetter', name: 'Göttliches Schmettern', kind: 'merkmal', cost: 'frei',
    smite: true, damage: [{ dice: '2W8', type: 'strahlend' }], usesSlot: true,
    desc: 'Verbrenne einen Zauberplatz für zusätzlichen strahlenden Schaden bei einem Treffer.',
  },
  barden_inspiration: {
    id: 'barden_inspiration', name: 'Bardische Inspiration', kind: 'merkmal', cost: 'bonus',
    range: 12, targets: 'verbuendeter', uses: { max: 3, per: 'rast' },
    effects: [{ condition: 'inspiriert', rounds: 10, inspirationDie: '1W6' }],
    desc: 'Ein Verbündeter darf einen Würfel zu einem Wurf addieren.',
  },
  wildgestalt_baer: {
    id: 'wildgestalt_baer', name: 'Wildgestalt: Bär', kind: 'merkmal', cost: 'aktion',
    range: 0, targets: 'selbst', uses: { max: 2, per: 'rast' }, wildshape: 'baer',
    desc: 'Du wirst zum Bären: mehr Trefferpunkte, Klauen, kein Zaubern.',
  },
  finsteres_geschenk: {
    id: 'finsteres_geschenk', name: 'Finstere Gabe', kind: 'merkmal', cost: 'bonus',
    range: 0, targets: 'selbst', tempHp: 'STUFE+CH', uses: { max: 1, per: 'rast' },
    desc: 'Dein Patron schenkt dir temporäre Trefferpunkte, wenn du ein Ziel fällst.',
  },
};

/** Waffenprofile. */
export const WEAPON_PROFILES = {
  langschwert: { name: 'Langschwert', damage: '1W8', type: 'hieb', ability: 'st', range: 1, versatile: '1W10' },
  kurzschwert: { name: 'Kurzschwert', damage: '1W6', type: 'stich', ability: 'ge', range: 1, finesse: true, light: true },
  dolch: { name: 'Dolch', damage: '1W4', type: 'stich', ability: 'ge', range: 1, finesse: true, light: true, thrown: 12 },
  grossaxt: { name: 'Großaxt', damage: '1W12', type: 'hieb', ability: 'st', range: 1, heavy: true, twoHanded: true },
  streitkolben: { name: 'Streitkolben', damage: '1W6', type: 'wucht', ability: 'st', range: 1 },
  kriegshammer: { name: 'Kriegshammer', damage: '1W8', type: 'wucht', ability: 'st', range: 1, versatile: '1W10' },
  speer: { name: 'Speer', damage: '1W6', type: 'stich', ability: 'st', range: 1, thrown: 12, versatile: '1W8' },
  rapier: { name: 'Rapier', damage: '1W8', type: 'stich', ability: 'ge', range: 1, finesse: true },
  kurzbogen: { name: 'Kurzbogen', damage: '1W6', type: 'stich', ability: 'ge', range: 32, ranged: true },
  langbogen: { name: 'Langbogen', damage: '1W8', type: 'stich', ability: 'ge', range: 40, ranged: true, heavy: true },
  armbrust: { name: 'Leichte Armbrust', damage: '1W8', type: 'stich', ability: 'ge', range: 26, ranged: true },
  kampfstab: { name: 'Kampfstab', damage: '1W6', type: 'wucht', ability: 'st', range: 1, versatile: '1W8' },
  sichel: { name: 'Sichel', damage: '1W4', type: 'hieb', ability: 'st', range: 1, light: true },
  faust: { name: 'Faustschlag', damage: '1', type: 'wucht', ability: 'st', range: 1 },
};

export function getSpell(id) {
  return SPELLS[id] || FEATURES[id] || null;
}

/** Zaubertrick-Skalierung nach Charakterstufe. */
export function scaledDamage(spell, level) {
  if (!spell.damage) return null;
  if (!spell.scaling) return spell.damage;
  let dice = spell.damage[0].dice;
  for (const threshold of Object.keys(spell.scaling).map(Number).sort((a, b) => a - b)) {
    if (level >= threshold) dice = spell.scaling[threshold];
  }
  return [{ dice, type: spell.damage[0].type }];
}
