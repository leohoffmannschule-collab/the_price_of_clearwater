// Gegner- und Begleiterbögen aus Band III.
// Werte 1:1 aus dem Begleitband, Skalierung für 3 Charaktere ist bereits eingerechnet.

export const CREATURES = {
  // ───────────────────────────── Prolog ─────────────────────────────
  wolf: {
    id: 'wolf', name: 'Wolf', type: 'Bestie', ac: 13, hp: 11, speed: 8,
    abilities: { st: 12, ge: 15, ko: 12, in: 3, we: 12, ch: 6 },
    traits: [{ name: 'Rudeltaktik', desc: 'Vorteil, wenn ein Verbündeter neben dem Ziel steht.', packTactics: true }],
    actions: [{
      id: 'biss', name: 'Biss', cost: 'aktion', range: 1, targets: 'kreatur', attack: true,
      attackBonus: 4, damage: [{ dice: '2W4+2', type: 'stich' }],
      effects: [{ condition: 'liegend', rounds: 1, save: { ability: 'st', dc: 11 } }],
    }],
    ai: { role: 'nahkampf', focus: 'naechster' },
    tint: '#6a6258',
  },
  goblin: {
    id: 'goblin', name: 'Goblin', type: 'Humanoider', ac: 15, hp: 7, speed: 6,
    abilities: { st: 8, ge: 14, ko: 10, in: 10, we: 8, ch: 8 },
    traits: [{ name: 'Flinker Rückzug', desc: 'Rückzug als Bonusaktion.', nimble: true }],
    actions: [
      { id: 'krummsaebel', name: 'Krummsäbel', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 4, damage: [{ dice: '1W6+2', type: 'hieb' }] },
      { id: 'kurzbogen_g', name: 'Kurzbogen', cost: 'aktion', range: 20, targets: 'kreatur', attack: true, attackBonus: 4, damage: [{ dice: '1W6+2', type: 'stich' }], ranged: true },
    ],
    ai: { role: 'fernkampf', focus: 'schwaechster' },
    tint: '#7a8a50',
  },

  // ───────────────────────── Akt I — Klarwasser ─────────────────────────
  nasser_kleiner: {
    id: 'nasser_kleiner', name: 'Nasser Kleiner', type: 'Feenwesen', ac: 12, hp: 9, speed: 4, swim: 6,
    abilities: { st: 8, ge: 14, ko: 10, in: 11, we: 12, ch: 7 },
    immunities: ['gift'], vulnerabilities: ['feuer'],
    traits: [
      { name: 'Wasserleib', desc: 'Immun gegen Gift, verwundbar gegen Feuer. Verschwindet in wenigen Zentimetern Wasser.' },
      { name: 'Schwarmsinn', desc: 'Vorteil gegen ein Ziel, das bereits von einem anderen Nassen Kleinen bedrängt wird.', packTactics: true },
    ],
    actions: [
      { id: 'nasse_klauen', name: 'Nasse Klauen', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 4, damage: [{ dice: '1W6+2', type: 'hieb' }] },
      {
        id: 'namensdiebstahl', name: 'Namensdiebstahl', cost: 'aktion', range: 3, targets: 'kreatur',
        save: { ability: 'we', dc: 11 }, effects: [{ condition: 'namenlos', rounds: 2 }],
        desc: 'Es spricht etwas, das fast wie dein Name klingt, nur falsch ausgesprochen.',
      },
    ],
    fleeAt: 0.5, fleeTo: 'brunnen',
    ai: { role: 'nahkampf', focus: 'schwaechster' },
    tint: '#5a7a80',
  },
  ertrunkener_waechter: {
    id: 'ertrunkener_waechter', name: 'Ertrunkener Wächter', type: 'Untoter', ac: 13, hp: 32, speed: 4, swim: 8,
    abilities: { st: 14, ge: 8, ko: 16, in: 3, we: 6, ch: 5 },
    immunities: ['gift'], vulnerabilities: ['feuer'],
    conditionImmunities: ['vergiftet', 'verangstigt', 'bezaubert'],
    traits: [
      { name: 'Untote Natur', desc: 'Immun gegen Gift, Furcht und Erschöpfung. Verwundbar gegen Feuer.' },
      { name: 'Einfaches Programm', desc: 'Er verhandelt nicht und flieht nie. Sein Auftrag ist zweihundert Jahre alt.' },
    ],
    actions: [
      {
        id: 'ergreifen', name: 'Ergreifen', cost: 'aktion', range: 1, targets: 'kreatur', attack: true,
        attackBonus: 4, damage: [{ dice: '1W8+2', type: 'wucht' }],
        effects: [{ condition: 'gepackt', rounds: 99, escapeDc: 13 }],
      },
      {
        id: 'ertraenken', name: 'Ertränken', cost: 'aktion', range: 1, targets: 'gepackt',
        save: { ability: 'st', dc: 13 }, damage: [{ dice: '2W6', type: 'wucht' }],
        desc: 'Er drückt dich unter zwanzig Zentimeter Wasser. Das reicht.',
      },
    ],
    ai: { role: 'nahkampf', focus: 'naechster' },
    tint: '#4a5a58',
  },
  steinerner_zeuge: {
    id: 'steinerner_zeuge', name: 'Steinerner Zeuge', type: 'Konstrukt', ac: 17, hp: 40, speed: 4,
    abilities: { st: 16, ge: 10, ko: 14, in: 12, we: 14, ch: 8 },
    immunities: ['gift'], resistances: ['psychisch'],
    conditionImmunities: ['verangstigt', 'bezaubert', 'gelaehmt'],
    traits: [
      { name: 'Gründerschrift', desc: 'Dreimal klopfen, dann „Wahl. Odowic. Brunnenmann." — er legt sich nieder. Kein Wurf.', formulaShutdown: true },
      { name: 'Konstrukt-Natur', desc: 'Immun gegen Gift, Furcht, Bezauberung und Lähmung.' },
    ],
    actions: [{
      id: 'steinschwert', name: 'Steinschwert', cost: 'aktion', range: 1, targets: 'kreatur', attack: true,
      attackBonus: 5, damage: [{ dice: '1W8+3', type: 'hieb' }], attacks: 2,
    }],
    reactions: [{
      id: 'zeugnis', name: 'Zeugnis', uses: 3,
      save: { ability: 'we', dc: 13 }, damage: [{ dice: '1W6', type: 'psychisch' }],
      testimony: true,
      desc: 'Er spricht eine wahre Anschuldigung aus — deine eigene.',
    }],
    ai: { role: 'nahkampf', focus: 'naechster' },
    tint: '#8a8578',
  },
  ertrunkene_mutter: {
    id: 'ertrunkene_mutter', name: 'Die Ertrunkene Mutter', type: 'Untoter', ac: 14, hp: 90, speed: 6, boss: true,
    abilities: { st: 8, ge: 12, ko: 15, in: 10, we: 16, ch: 13 },
    immunities: ['gift'], vulnerabilities: ['strahlend'],
    conditionImmunities: ['verangstigt', 'bezaubert', 'gelaehmt'],
    traits: [
      { name: 'Namensschwäche', desc: 'Wird einer der elf Namen laut vorgelesen, verliert sie ihre Reaktion und hat Nachteil auf Angriffe.', nameWeakness: true },
      { name: 'Feuchte Regeneration', desc: 'Heilt 10 TP pro Zug auf nassem Boden. In der trockenen Kapelle nicht.', regen: 10, regenOnWet: true },
    ],
    actions: [
      { id: 'kalte_hand', name: 'Kalte Hand', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 6, damage: [{ dice: '2W6+3', type: 'kaelte' }], attacks: 2 },
      {
        id: 'segen_m', name: 'Segen', cost: 'aktion', range: 6, targets: 'kreatur', uses: 2,
        save: { ability: 'we', dc: 14 }, effects: [{ condition: 'weinend', rounds: 2, saveEnds: 'we' }],
        desc: 'Sie greift nicht an. Sie tröstet.',
      },
    ],
    bloodied: { at: 45, id: 'mutterschuld', heal: 20, summon: { id: 'nasser_kleiner', count: 2 }, once: true,
      text: '„Nicht weinen, Kindchen. Es geht schnell." — Sie zieht zwei kleine Gestalten aus dem nassen Stein.' },
    ai: { role: 'nahkampf', focus: 'schwaechster' },
    tint: '#6a7a88',
  },
  ysmereth_befreit: {
    id: 'ysmereth_befreit', name: 'Ysmereth, befreit', type: 'Feenwesen', ac: 16, hp: 90, speed: 8, boss: true,
    abilities: { st: 16, ge: 18, ko: 17, in: 18, we: 20, ch: 16 },
    resistances: ['kaelte'],
    saveBonus: { ge: 3, we: 1 },
    legendaryResistance: 1,
    traits: [
      { name: 'Höflichkeit', desc: 'Mit vollem Titel angesprochen („Herr der Stillen Tiefe") senkt er die Waffe.', negotiable: true },
      { name: 'Feenwesen-Natur', desc: 'Resistent gegen Kälte und nichtmagische Waffen.' },
    ],
    actions: [
      { id: 'tiefenlanze', name: 'Tiefenlanze', cost: 'aktion', range: 2, targets: 'kreatur', attack: true, attackBonus: 8, damage: [{ dice: '2W8+5', type: 'kaelte' }], attacks: 2 },
      {
        id: 'namensruf', name: 'Namensruf', cost: 'aktion', range: 12, targets: 'kreatur', recharge: 5,
        save: { ability: 'ch', dc: 16 }, damage: [{ dice: '4W8', type: 'psychisch' }],
        effects: [{ condition: 'namenlos', rounds: 1 }],
      },
      { id: 'spiegelschritt', name: 'Spiegelschritt', cost: 'bonus', range: 12, targets: 'punkt', teleport: true },
    ],
    legendary: {
      count: 2,
      actions: [
        { id: 'flut', name: 'Flut', cost: 1, range: 12, targets: 'punkt', shape: { type: 'kugel', radius: 2 }, difficultTerrain: true },
        { id: 'ein_wort', name: 'Ein Wort', cost: 1, range: 18, targets: 'kreatur', memoryPrice: true, desc: 'Nenne eine Erinnerung, die du verlieren würdest.' },
      ],
    },
    ai: { role: 'kontrolle', focus: 'staerkster' },
    tint: '#4a8090',
  },
  tanarukk_bruder: {
    id: 'tanarukk_bruder', name: 'Tanarukk-Bruder', type: 'Dämon', ac: 15, hp: 40, speed: 6,
    abilities: { st: 18, ge: 12, ko: 17, in: 9, we: 11, ch: 10 },
    resistances: ['feuer'],
    traits: [{ name: 'Abyssaler Trotz', desc: 'Fällt er auf 0 TP, bleibt er mit 1 TP stehen, solange Ghortan in 9 m ist.', lastStand: true }],
    actions: [{ id: 'glutklinge', name: 'Glutklinge', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 6, damage: [{ dice: '2W6+4', type: 'hieb' }] }],
    ai: { role: 'nahkampf', focus: 'naechster' },
    tint: '#8a4a30',
  },
  spinnenbrut: {
    id: 'spinnenbrut', name: 'Spinnenbrut', type: 'Dämon', ac: 14, hp: 22, speed: 6, climb: 6,
    abilities: { st: 12, ge: 16, ko: 13, in: 4, we: 10, ch: 6 },
    traits: [{ name: 'Spinnenklettern', desc: 'Bewegt sich an Wänden und Decken ohne Probe.' }],
    actions: [
      { id: 'giftbiss', name: 'Giftbiss', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 5, damage: [{ dice: '1W6+3', type: 'stich' }, { dice: '1W6', type: 'gift' }] },
      {
        id: 'fadenwurf', name: 'Fadenwurf', cost: 'aktion', range: 6, targets: 'kreatur',
        save: { ability: 'ge', dc: 13 }, effects: [{ condition: 'festgesetzt', rounds: 99, escapeDc: 13 }],
      },
    ],
    ai: { role: 'kontrolle', focus: 'schwaechster' },
    tint: '#503a60',
  },

  // ───────────────────────── Ghortan ─────────────────────────
  ghortan_begleiter: {
    id: 'ghortan_begleiter', name: 'Ghortan', type: 'Tanarukk', ac: 14, hp: 35, speed: 6,
    abilities: { st: 17, ge: 14, ko: 16, in: 15, we: 13, ch: 18 },
    resistances: ['feuer'],
    companion: true,
    traits: [{ name: 'Zurückhaltung', desc: 'Er fragt um Erlaubnis, bevor er in eurer Nähe zaubert. In Akt I wirkt er nie Feuerball, Schlaf oder Gegenzauber.' }],
    actions: [
      { id: 'klauen_b', name: 'Klauen', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 5, damage: [{ dice: '1W8+3', type: 'hieb' }] },
      { id: 'seelenglut_b', name: 'Seelenglut', cost: 'aktion', range: 12, targets: 'kreatur', uses: 1, save: { ability: 'ch', dc: 13 }, damage: [{ dice: '1W6', type: 'nekrotisch' }] },
    ],
    reactions: [{ id: 'schuetzen', name: 'Schützen', uses: 1, protect: true, desc: 'Ein Angriff gegen einen benachbarten Verbündeten trifft stattdessen ihn.' }],
    ai: { role: 'nahkampf', focus: 'bedroht_verbuendete' },
    tint: '#7a6a4a',
  },
  ghortan_p1: {
    id: 'ghortan_p1', name: 'Ghortan, der Entfesselte', type: 'Tanarukk-Zauberer', ac: 17, hp: 90, speed: 6, boss: true, phase: 1,
    abilities: { st: 17, ge: 18, ko: 18, in: 17, we: 17, ch: 20 },
    resistances: ['feuer', 'gift'],
    saveBonus: { ko: 4, ch: 4, we: 3 },
    legendaryResistance: 2,
    spellDc: 17, spellAttack: 9,
    traits: [
      { name: 'Beschleunigter Zauber', desc: 'Er wirkt zwei Zauber pro Runde — einen als Aktion, einen als Bonusaktion.', quickened: 3 },
      { name: 'Kaltblütiger Verrat', desc: 'Vorteil auf einen Angriff gegen den Charakter, der ihn losgeschnitten hat.', betrayal: true, uses: 1 },
      { name: 'Abyssales Blut', desc: 'Natürliche Panzerung, magische Klauen, immun gegen Erschöpfung.' },
    ],
    actions: [
      { id: 'klauen_1', name: 'Klauen', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 8, damage: [{ dice: '2W6+3', type: 'hieb' }, { dice: '2W6', type: 'feuer' }] },
      { id: 'seelenglut_1', name: 'Seelenglut', cost: 'aktion', range: 12, targets: 'kreatur', save: { ability: 'ch', dc: 17 }, damage: [{ dice: '3W8', type: 'nekrotisch' }] },
      { id: 'feuerball_1', name: 'Feuerball', cost: 'aktion', range: 30, targets: 'punkt', shape: { type: 'kugel', radius: 4 }, uses: 2, save: { ability: 'ge', dc: 17, half: true }, damage: [{ dice: '6W6', type: 'feuer' }], desc: 'Schwarze Flammen, die keine Asche hinterlassen.' },
      { id: 'blitz_1', name: 'Blitz', cost: 'aktion', range: 0, targets: 'punkt', shape: { type: 'linie', length: 20 }, uses: 1, save: { ability: 'ge', dc: 17, half: true }, damage: [{ dice: '8W6', type: 'blitz' }] },
      { id: 'schattenklinge_1', name: 'Schattenklinge', cost: 'bonus', range: 1, targets: 'kreatur', attack: true, attackBonus: 9, damage: [{ dice: '3W8+5', type: 'psychisch' }] },
      { id: 'nebelschritt_1', name: 'Nebelschritt', cost: 'bonus', range: 6, targets: 'punkt', teleport: true, uses: 3 },
    ],
    reactions: [
      { id: 'schild_1', name: 'Schild', uses: 3, acBonus: 5, shieldReaction: true },
      { id: 'gegenzauber_1', name: 'Gegenzauber', uses: 2, counterspell: 4 },
    ],
    banter: [
      '„Wisst ihr, was das Schlimmste war? Es hat mir gefallen. Das Lagerfeuer. Die Witze. Ich habe fast vergessen, warum ich hier bin."',
      '„Ihr habt mich losgeschnitten und geglaubt, das wäre Gnade. Es war ein Handel, und ihr habt nicht nach dem Preis gefragt."',
      '„Nein, ich hasse euch nicht. Ihr seid das Beste, was mir passiert ist. Deshalb taugt ihr auch."',
      '„Genau wie ein Hirtenjunge vor zweihundert Jahren."',
    ],
    onDefeat: '„Gut. Sehr gut. Aber ich habe nie gesagt, dass ich allein bin."',
    ai: { role: 'kontrolle', focus: 'gruppen' },
    tint: '#8a3a2a',
  },
  ghortan_p2: {
    id: 'ghortan_p2', name: 'Ghortan, Herold der Spinne', type: 'Tanarukk', ac: 18, hp: 80, speed: 6, climb: 6, boss: true, phase: 2,
    abilities: { st: 18, ge: 19, ko: 19, in: 18, we: 18, ch: 22 },
    resistances: ['feuer', 'gift'],
    saveBonus: { ko: 5, ch: 6, we: 5 },
    legendaryResistance: 2,
    spellDc: 18, spellAttack: 10,
    traits: [
      { name: 'Netz der Fäden', desc: 'Solange ein Diener lebt: Resistenz gegen alle Schadensarten.', webResistance: true },
      { name: 'Beschleunigter Zauber', quickened: 3, desc: 'Zwei Zauber pro Runde.' },
      { name: 'Der Gesang', desc: 'Vier ungestörte Runden Gesang lösen Phase III sofort aus — mit 25 zusätzlichen TP.', songTimer: 4 },
    ],
    actions: [
      { id: 'klauen_2', name: 'Klauen', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 9, damage: [{ dice: '2W6+4', type: 'hieb' }, { dice: '2W6', type: 'feuer' }] },
      { id: 'seelenglut_2', name: 'Seelenglut', cost: 'aktion', range: 12, targets: 'kreatur', save: { ability: 'ch', dc: 18 }, damage: [{ dice: '4W8', type: 'nekrotisch' }] },
      { id: 'feuerball_2', name: 'Feuerball', cost: 'aktion', range: 30, targets: 'punkt', shape: { type: 'kugel', radius: 4 }, uses: 2, save: { ability: 'ge', dc: 18, half: true }, damage: [{ dice: '9W6', type: 'feuer' }] },
      { id: 'verlangsamen_2', name: 'Verlangsamen', cost: 'aktion', range: 24, targets: 'punkt', shape: { type: 'kugel', radius: 3 }, uses: 1, save: { ability: 'we', dc: 18 }, effects: [{ condition: 'verlangsamt', rounds: 5, saveEnds: 'we' }] },
      { id: 'ruf_aus_der_tiefe', name: 'Ruf aus der Tiefe', cost: 'aktion', summon: { options: [{ id: 'tanarukk_bruder', count: 1 }, { id: 'spinnenbrut', count: 2 }] }, everyOtherRound: true },
      { id: 'opfergabe', name: 'Opfergabe', cost: 'bonus', sacrificeMinion: true, heal: 20, desc: '„Sie sind Material. Ihr auch."' },
    ],
    legendary: {
      count: 1,
      actions: [
        { id: 'fadenzug', name: 'Fadenzug', cost: 1, minionActs: true },
        { id: 'glutfunke', name: 'Glutfunke', cost: 1, range: 12, targets: 'kreatur', save: { ability: 'ge', dc: 18 }, damage: [{ dice: '2W6', type: 'feuer' }] },
      ],
    },
    onEnter: 'Ghortan reißt den Stab aus dem Pflaster und stößt ihn zurück hinein — und der Marktplatz antwortet.',
    onDefeat: '„Danke. Ich brauchte nur Zeit — und die habt ihr mir großzügig geschenkt.\n\nMUTTER. ICH HABE DEN RISS GEÖFFNET. KOMM UND SIEH, WAS DEIN WEGGEWORFENER SOHN GEBAUT HAT."',
    ai: { role: 'beschwoerer', focus: 'gruppen' },
    tint: '#6a2a4a',
  },
  ghortan_p3: {
    id: 'ghortan_p3', name: 'Ghortan, Gefäß Lolths', type: 'Dämon (Gefäß)', ac: 19, hp: 130, speed: 8, climb: 8, boss: true, phase: 3, large: true,
    abilities: { st: 22, ge: 20, ko: 21, in: 20, we: 20, ch: 24 },
    resistances: ['kaelte', 'blitz', 'nekrotisch'],
    immunities: ['gift', 'feuer'],
    conditionImmunities: ['bezaubert', 'verangstigt', 'gelaehmt', 'betaeubt'],
    saveBonus: { st: 5, ko: 5, we: 5, ch: 5 },
    legendaryResistance: 3,
    spellDc: 19, spellAttack: 12,
    traits: [
      { name: 'Kanalisierte Göttlichkeit', desc: 'Immun gegen Gift, Feuer, Bezauberung, Furcht, Lähmung.' },
      { name: 'Zwei Stimmen', desc: 'Zu Beginn jedes Zuges 1W6. Bei einer 1 bricht Ghortans eigene Stimme durch.', twoVoices: true },
      { name: 'Das Gefäß hält nicht ewig', desc: 'Am Ende jedes Zuges erleidet er 8 unvermeidbaren Schaden. Lolths Macht zerreißt ihn.', selfDamage: 8 },
    ],
    actions: [
      { id: 'chitinbein', name: 'Chitinbein', cost: 'aktion', range: 2, targets: 'kreatur', attack: true, attackBonus: 11, damage: [{ dice: '2W8+6', type: 'stich' }], attacks: 3, bonusVsRestrained: { dice: '3W6', type: 'gift' } },
      { id: 'gewobene_dunkelheit', name: 'Gewobene Dunkelheit', cost: 'aktion', range: 12, targets: 'punkt', shape: { type: 'kugel', radius: 4 }, recharge: 5, save: { ability: 'ge', dc: 19, half: true }, damage: [{ dice: '8W6', type: 'nekrotisch' }], effects: [{ condition: 'festgesetzt', rounds: 99, escapeDc: 17 }] },
      { id: 'wort_der_spinnenkoenigin', name: 'Wort der Spinnenkönigin', cost: 'aktion', range: 12, targets: 'kreatur', uses: 2, save: { ability: 'we', dc: 19 }, dominate: true, desc: 'Lass die Spielerin selbst würfeln — das schmerzt mehr.' },
      { id: 'seelenglut_entfesselt', name: 'Seelenglut, entfesselt', cost: 'aktion', range: 12, targets: 'kreatur', multiTarget: 3, save: { ability: 'ch', dc: 19 }, damage: [{ dice: '5W8', type: 'nekrotisch' }] },
    ],
    legendary: {
      count: 2,
      actions: [
        { id: 'netzschritt', name: 'Netzschritt', cost: 1, range: 8, targets: 'punkt', teleport: true },
        { id: 'fadenriss', name: 'Fadenriss', cost: 1, range: 2, targets: 'kreatur', attack: true, attackBonus: 11, damage: [{ dice: '2W8+6', type: 'stich' }] },
        { id: 'namen_fressen', name: 'Namen fressen', cost: 2, range: 8, targets: 'kreatur', save: { ability: 'ch', dc: 19 }, effects: [{ condition: 'namenlos', rounds: 99 }] },
        { id: 'mutterstimme', name: 'Mutterstimme', cost: 2, uses: 1, range: 6, targets: 'alle', save: { ability: 'we', dc: 19 }, damage: [{ dice: '4W8', type: 'psychisch' }], effects: [{ condition: 'verangstigt', rounds: 2 }] },
      ],
    },
    lairActions: true,
    onEnter: 'Was aus seinem Rücken bricht, sind Beine. Acht davon, jedes so lang wie ein Wagenbaum.',
    voiceBreaks: [
      '„— nein, wartet, ich — " (Die Stimme kippt zurück.) „Wie hübsch."',
      '„Das Lagerfeuer. Die Tage waren länger. Im guten —" ',
      '„Ich hab drei Jahre in Ketten gelegen und ein paar Tage mit —"',
    ],
    ai: { role: 'kontrolle', focus: 'gruppen' },
    tint: '#3a1a3a',
  },

  // ───────────────────────── Akt III ─────────────────────────
  drakeling: {
    id: 'drakeling', name: 'Drakeling', type: 'Drache', ac: 14, hp: 18, speed: 6, climb: 4,
    abilities: { st: 11, ge: 16, ko: 14, in: 5, we: 10, ch: 7 },
    immunities: ['feuer'],
    traits: [
      { name: 'Rudelsinn', desc: 'Vorteil, wenn ein weiterer Drakeling neben dem Ziel steht.', packTactics: true },
      { name: 'Letzte Glut', desc: 'Bei 0 TP platzt er: alle in 1,5 m, GES-RW SG 12 oder 1W6 Feuerschaden.', deathBurst: { radius: 1, dice: '1W6', type: 'feuer', dc: 12, save: 'ge' } },
      { name: 'Keine Furcht', desc: 'Sie fliehen nie. Angst ist etwas, das man lernen muss.' },
    ],
    actions: [
      { id: 'zuendbiss', name: 'Zündbiss', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 5, damage: [{ dice: '1W6+3', type: 'stich' }, { dice: '1W4', type: 'feuer' }] },
      { id: 'funkenspucken', name: 'Funkenspucken', cost: 'aktion', range: 4, targets: 'punkt', shape: { type: 'kugel', radius: 1 }, recharge: 6, save: { ability: 'ge', dc: 12, half: true }, damage: [{ dice: '2W6', type: 'feuer' }] },
    ],
    ai: { role: 'nahkampf', focus: 'naechster' },
    tint: '#9a5030',
  },
  brutmutter: {
    id: 'brutmutter', name: 'Drakeling-Brutmutter', type: 'Drache', ac: 16, hp: 95, speed: 8, boss: true,
    abilities: { st: 18, ge: 14, ko: 18, in: 7, we: 13, ch: 10 },
    immunities: ['feuer'],
    traits: [{ name: 'Rudelführerin', desc: 'Stirbt sie, verlieren alle Drakelinge den Rudelsinn.', packLeader: true }],
    actions: [
      { id: 'klauen_bm', name: 'Klauen', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 7, damage: [{ dice: '2W6+4', type: 'hieb' }], attacks: 2 },
      { id: 'brandodem', name: 'Brandodem', cost: 'aktion', range: 0, targets: 'punkt', shape: { type: 'kegel', length: 5 }, recharge: 5, save: { ability: 'ge', dc: 15, half: true }, damage: [{ dice: '6W6', type: 'feuer' }] },
      { id: 'brutruf', name: 'Brutruf', cost: 'bonus', summon: { options: [{ id: 'drakeling', count: 2 }] }, everyOtherRound: true },
    ],
    ai: { role: 'beschwoerer', focus: 'gruppen' },
    tint: '#b05028',
  },
  brandstifter: {
    id: 'brandstifter', name: 'Dragonborn-Brandstifter', type: 'Humanoider', ac: 16, hp: 52, speed: 6,
    abilities: { st: 16, ge: 14, ko: 15, in: 11, we: 12, ch: 13 },
    resistances: ['feuer'],
    traits: [{ name: 'Angestellter', desc: 'Er hat Papiere. Er zeigt sie wirklich, wenn man fragt.', talkable: true }],
    actions: [
      { id: 'kriegspickel', name: 'Kriegspickel', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 6, damage: [{ dice: '1W8+3', type: 'stich' }], attacks: 2 },
      { id: 'odem_bs', name: 'Feueratem', cost: 'aktion', range: 0, targets: 'punkt', shape: { type: 'kegel', length: 3 }, recharge: 5, save: { ability: 'ge', dc: 14, half: true }, damage: [{ dice: '4W6', type: 'feuer' }] },
      { id: 'brandpfeil', name: 'Brandpfeil', cost: 'aktion', range: 24, targets: 'kreatur', attack: true, attackBonus: 6, damage: [{ dice: '1W8+3', type: 'stich' }, { dice: '1W6', type: 'feuer' }], ranged: true },
    ],
    fleeAt: 0.25,
    ai: { role: 'nahkampf', focus: 'schwaechster' },
    tint: '#a06a30',
  },
  klauth: {
    id: 'klauth', name: 'Klauth, der Alte Zorn', type: 'Drache, uralt', ac: 21, hp: 350, speed: 8, fly: 16, boss: true, huge: true,
    abilities: { st: 27, ge: 12, ko: 25, in: 18, we: 17, ch: 21 },
    immunities: ['feuer'],
    saveBonus: { ge: 7, ko: 13, we: 9, ch: 11 },
    legendaryResistance: 3,
    traits: [
      { name: 'Schreckliche Gegenwart', desc: 'Alle in 36 m: WEI-RW SG 19 oder verängstigt.', frightfulPresence: true },
      { name: 'Verhandelbar', desc: 'Über genau einen Zugang: Ghortan. Wer ehrlich erzählt, wie sein Nachfahre starb, kommt an ihn heran.', negotiable: true },
    ],
    actions: [
      { id: 'biss_k', name: 'Biss', cost: 'aktion', range: 3, targets: 'kreatur', attack: true, attackBonus: 15, damage: [{ dice: '2W10+8', type: 'stich' }, { dice: '2W6', type: 'feuer' }] },
      { id: 'klaue_k', name: 'Klaue', cost: 'aktion', range: 2, targets: 'kreatur', attack: true, attackBonus: 15, damage: [{ dice: '2W6+8', type: 'hieb' }], attacks: 2 },
      { id: 'feueratem_k', name: 'Feueratem', cost: 'aktion', range: 0, targets: 'punkt', shape: { type: 'kegel', length: 12 }, recharge: 5, save: { ability: 'ge', dc: 22, half: true }, damage: [{ dice: '15W6', type: 'feuer' }] },
      { id: 'schwanz_k', name: 'Schwanzhieb', cost: 'aktion', range: 4, targets: 'kreatur', attack: true, attackBonus: 15, damage: [{ dice: '2W8+8', type: 'wucht' }], push: 4 },
    ],
    legendary: {
      count: 3,
      actions: [
        { id: 'fluegelschlag', name: 'Flügelschlag', cost: 2, range: 3, targets: 'alle', save: { ability: 'ge', dc: 21 }, damage: [{ dice: '2W6+8', type: 'wucht' }], knockdown: true },
        { id: 'schweifhieb', name: 'Schweifhieb', cost: 1, range: 4, targets: 'kreatur', attack: true, attackBonus: 15, damage: [{ dice: '2W8+8', type: 'wucht' }] },
        { id: 'blick', name: 'Blick', cost: 1, range: 24, targets: 'kreatur', save: { ability: 'we', dc: 19 }, effects: [{ condition: 'verangstigt', rounds: 2 }] },
      ],
    },
    banter: [
      '„Ihr wart es also. Kleiner, als ich dachte."',
      '„Ich habe vierhundert Jahre lang nichts getan, weil nichts es wert war."',
      '„Ihr seid das Interessanteste, was mir seit vierhundert Jahren passiert ist. Ich werde das nicht in zehn Sekunden beenden."',
    ],
    ai: { role: 'nahkampf', focus: 'gruppen' },
    tint: '#c03818',
  },

  // ───────────────────────── Akt IV ─────────────────────────
  vergessene_klinge: {
    id: 'vergessene_klinge', name: 'Vergessene Klinge', type: 'Untoter', ac: 16, hp: 68, speed: 6,
    abilities: { st: 17, ge: 16, ko: 16, in: 6, we: 12, ch: 5 },
    resistances: ['nekrotisch', 'kaelte'],
    traits: [{ name: 'Namenlos', desc: 'Sie weiß nicht mehr, gegen wen sie kämpft. Es stört sie nicht.' }],
    actions: [
      { id: 'grauklinge', name: 'Grauklinge', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 8, damage: [{ dice: '2W8+4', type: 'hieb' }], attacks: 2 },
      { id: 'vergessensschnitt', name: 'Vergessensschnitt', cost: 'aktion', range: 1, targets: 'kreatur', recharge: 5, save: { ability: 'we', dc: 15 }, forgetting: 1, damage: [{ dice: '3W6', type: 'psychisch' }] },
    ],
    ai: { role: 'nahkampf', focus: 'naechster' },
    tint: '#5a5a62',
  },
  federwaechter: {
    id: 'federwaechter', name: 'Federwächter-Schwarm', type: 'Konstrukt', ac: 15, hp: 45, speed: 4, fly: 12,
    abilities: { st: 8, ge: 20, ko: 14, in: 6, we: 16, ch: 8 },
    resistances: ['hieb', 'stich', 'wucht'],
    traits: [{ name: 'Ankerjagd', desc: 'Der Schwarm greift bevorzugt Anker an, nicht Charaktere.', anchorHunter: true }],
    actions: [
      { id: 'federschnitt', name: 'Federschnitt', cost: 'aktion', range: 1, targets: 'kreatur', attack: true, attackBonus: 8, damage: [{ dice: '4W4', type: 'hieb' }] },
      { id: 'ankerriss', name: 'Ankerriss', cost: 'aktion', range: 1, targets: 'kreatur', anchorAttack: true, save: { ability: 'ge', dc: 16 }, desc: 'Der Schwarm greift nach dem, was dich hält.' },
    ],
    ai: { role: 'anker', focus: 'anker' },
    tint: '#2a2a32',
  },
  bibliothekar: {
    id: 'bibliothekar', name: 'Der Bibliothekar', type: 'Aspekt', ac: 18, hp: 140, speed: 6, boss: true,
    abilities: { st: 12, ge: 16, ko: 18, in: 22, we: 20, ch: 18 },
    resistances: ['psychisch', 'nekrotisch'],
    legendaryResistance: 2,
    traits: [{ name: 'Er kämpft nicht — er zitiert', desc: 'Jede Runde spricht er das letzte Wort einer Person, die ein Charakter verloren hat.', quotes: true }],
    actions: [
      { id: 'letztes_wort', name: 'Letztes Wort', cost: 'aktion', range: 18, targets: 'kreatur', save: { ability: 'we', dc: 18 }, damage: [{ dice: '6W8', type: 'psychisch' }], quoteLine: true },
      { id: 'regalsturz', name: 'Regalsturz', cost: 'aktion', range: 12, targets: 'punkt', shape: { type: 'linie', length: 8 }, save: { ability: 'ge', dc: 18, half: true }, damage: [{ dice: '5W10', type: 'wucht' }] },
      { id: 'streichen', name: 'Streichen', cost: 'aktion', range: 12, targets: 'kreatur', uses: 2, save: { ability: 'in', dc: 18 }, forgetting: 1 },
    ],
    ai: { role: 'kontrolle', focus: 'gruppen' },
    tint: '#3a3448',
  },
  rabenkoenigin: {
    id: 'rabenkoenigin', name: 'Die Rabenkönigin', type: 'Gottheit', ac: 22, hp: 420, speed: 10, fly: 18, boss: true,
    abilities: { st: 20, ge: 24, ko: 24, in: 25, we: 26, ch: 24 },
    resistances: ['hieb', 'stich', 'wucht'],
    immunities: ['nekrotisch', 'psychisch', 'kaelte'],
    conditionImmunities: ['bezaubert', 'verangstigt', 'gelaehmt', 'betaeubt'],
    saveBonus: { ge: 8, we: 10, ch: 9, in: 9 },
    legendaryResistance: 3,
    traits: [
      { name: 'Amt statt Zorn', desc: 'Sie ist niemandem böse. Das setzt voraus, dass man jemanden lange genug behält.' },
      { name: 'Sie nimmt nur ein bisschen', desc: 'Am Ende jeder Runde verliert ein Charakter eine Kleinigkeit. Es summiert sich.', nibble: true },
    ],
    actions: [
      { id: 'federsturm', name: 'Federsturm', cost: 'aktion', range: 18, targets: 'punkt', shape: { type: 'kugel', radius: 5 }, save: { ability: 'ge', dc: 21, half: true }, damage: [{ dice: '10W8', type: 'hieb' }] },
      { id: 'was_niemand_haelt', name: 'Was niemand hält', cost: 'aktion', range: 18, targets: 'kreatur', save: { ability: 'we', dc: 21 }, forgetting: 1, damage: [{ dice: '8W10', type: 'psychisch' }] },
      { id: 'bestattung', name: 'Bestattung', cost: 'aktion', range: 12, targets: 'kreatur', recharge: 5, save: { ability: 'ko', dc: 21, half: true }, damage: [{ dice: '12W8', type: 'nekrotisch' }] },
    ],
    legendary: {
      count: 3,
      actions: [
        { id: 'federzug', name: 'Federzug', cost: 1, range: 18, targets: 'punkt', teleport: true },
        { id: 'ein_name_weniger', name: 'Ein Name weniger', cost: 2, range: 18, targets: 'kreatur', save: { ability: 'ch', dc: 21 }, effects: [{ condition: 'namenlos', rounds: 99 }] },
        { id: 'stille', name: 'Stille', cost: 1, range: 12, targets: 'alle', save: { ability: 'we', dc: 21 }, damage: [{ dice: '4W8', type: 'psychisch' }] },
      ],
    },
    banter: [
      '„Ihr nennt es fressen. Es ist Bestattung."',
      '„Ihr wart in einer Stadt, in der Mütter ihre Kinder vergessen haben, und es war Folter. Wisst ihr, warum? Weil es schlampig gemacht war."',
      '„Ich bin das einzige Fach in dieser Bibliothek, das ich nicht öffnen kann."',
    ],
    ai: { role: 'kontrolle', focus: 'gruppen' },
    tint: '#1a1a24',
  },
};

/** Eine kampfbereite Instanz eines Bogens erzeugen. */
export function spawnCreature(id, overrides = {}) {
  const base = CREATURES[id];
  if (!base) throw new Error(`Unbekannter Gegner: ${id}`);
  const c = JSON.parse(JSON.stringify(base));
  Object.assign(c, overrides);
  c.uid = `${id}_${Math.random().toString(36).slice(2, 8)}`;
  c.maxHp = c.hp;
  c.tempHp = 0;
  c.conditions = [];
  c.level = c.level || 5;
  c.skills = c.skills || [];
  c.saveProficiencies = c.saveProficiencies || [];
  c.usesLeft = {};
  for (const a of [...(c.actions || []), ...(c.reactions || [])]) {
    if (a.uses) c.usesLeft[a.id] = a.uses;
  }
  if (c.legendaryResistance) c.legendaryLeft = c.legendaryResistance;
  c.legendaryActionsLeft = c.legendary?.count || 0;
  return c;
}
