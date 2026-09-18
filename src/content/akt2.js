// AKT II — SITZUNG 6 & 7
// Gefesselt, die Flucht, und der Marktplatz unter dem Netz.

import { makeMap, paintRect, TERRAIN } from '../engine/combat.js';
import { spawnCreature } from '../data/creatures.js';
import { abilityCheck, savingThrow, applyDamage } from '../engine/rules.js';
import { roll } from '../engine/rng.js';

export const dialogues = {
  fesseln: {
    id: 'fesseln', speaker: 'Die Fesseln', start: 'a',
    nodes: {
      a: {
        narration: (s) => (s.flags.verrat_improvisiert
          ? 'Ihr seid nicht gefesselt. Ihr seid erpresst, und das ist unangenehmer.\n\nZwischen euch und dem Aufgang liegen dreißig Meter nasser Fels, und irgendwo darüber hält ein Tanarukk ein elfjähriges Mädchen am Handgelenk und wartet, ob ihr vernünftig seid.'
          : 'Ihr wacht in einer Kammer auf, die kein Mensch gebaut hat. Über euch ist Stein, unter euch ist Stein, und an euren Handgelenken liegt etwas, das aussieht wie Tinte und sich anfühlt wie ein Vertrag.\n\nDrei Meter weiter sitzt ein sehr großer, sehr höflicher Feenfürst, der genauso gefesselt ist wie ihr, und sieht euch beim Aufwachen zu.'),
        text: '',
        choices: [
          { text: '[Stärke] An den Fesseln reißen.', tag: '◈', check: { ability: 'st', dc: 18, success: 'gerissen', fail: 'nicht_gerissen' }, if: (s) => !s.flags.verrat_improvisiert },
          { text: 'Die elf Namen aufsagen. Alle.', to: 'namen', if: (s) => s.notes.namesCopied && !s.flags.verrat_improvisiert },
          { text: 'Den Feenfürsten ansprechen.', to: 'ysmereth', if: (s) => !s.flags.verrat_improvisiert },
          { text: 'Aufstehen und den Aufgang suchen.', to: 'gerissen', if: (s) => s.flags.verrat_improvisiert },
        ],
      },
      gerissen: {
        narration: 'Etwas gibt nach — nicht die Fesseln, die Wand dahinter. Ein Ring reißt aus dem Fels, und danach ist es Arbeit für zwei Minuten, den Rest aufzuschneiden.',
        text: '',
        flags: ['befreit'],
        end: true,
      },
      nicht_gerissen: {
        narration: 'Nichts. Die Rolle wurde von Gründerhand geschrieben, und Gründerhand rechnete mit Stärke.',
        text: '(Aus drei Metern Entfernung, sehr höflich:)\n„Das wird so nichts, Ihr Herrschaften."',
        choices: [
          { text: 'Die elf Namen aufsagen.', to: 'namen', if: (s) => s.notes.namesCopied },
          { text: 'Den Feenfürsten ansprechen.', to: 'ysmereth' },
          { text: 'Noch einmal reißen.', check: { ability: 'st', dc: 18, success: 'gerissen', fail: 'nicht_gerissen' }, tag: '◈' },
        ],
      },
      namen: {
        narration: 'Eine von euch sagt sie auf. Alle elf, in der richtigen Reihenfolge, laut, in einer Kammer unter zwanzig Zentimeter Wasser.\n\nAleth Grast. Iven Odowic. Sarra Mohl. Teodor Wahl. Lin Brunnenmann. Effe Grast. Marrow Umbrecht. Josta Vahl. Renn Odowic. Ilva Mohl. Tam Grast.\n\nBeim siebten Namen fängt die Tinte an zu verblassen. Beim elften reißt sie.\n\nAlle sind sofort frei.',
        text: '(Aus drei Metern Entfernung, nach einer langen Pause:)\n„…Ihr habt sie abgeschrieben."\n(Ysmereth klingt zum ersten Mal, seit ihr ihn kennt, tatsächlich überrascht.)\n„Das hat in zweihundert Jahren niemand getan."',
        flags: ['befreit', 'namen_haben_gewirkt'],
        end: true,
      },
      ysmereth: {
        text: '„Ich könnte euch helfen."\n(Er sitzt sehr gerade für jemanden in Ketten.)\n„Ein Tanarukk im Dienst Lolths ist mir deutlich unangenehmer als eine Handvoll Sterblicher. Das ist der ganze Grund. Erwartet keine Zuneigung."',
        choices: [
          { text: '„Dann hilf."', to: 'hilft', if: (s) => s.notes.ysmerethFair !== false && !s.flags.ysmereth_bezwungen && !s.flags.gegen_die_stadt },
          { text: '„Dann hilf."', to: 'schweigt', if: (s) => s.notes.ysmerethFair === false || s.flags.ysmereth_bezwungen || s.flags.gegen_die_stadt },
        ],
      },
      hilft: {
        narration: 'Er sagt drei Worte in einer Sprache, die aus Wasser besteht, und die Tinte an euren Handgelenken vergisst, was sie tun sollte.',
        text: '„Drei Ebenen tiefer fließt ein Fluss. Er kommt unter dieser Kammer durch. Die Gründer haben den Ausgang versiegelt — sie wollten ihn nicht.\n\nIch schon."',
        flags: ['befreit', 'ysmereth_hilft'],
        end: true,
      },
      schweigt: {
        narration: 'Er sagt nichts.\n\nEr sieht euch dabei zu, wie ihr euch abmüht, und er tut es ohne Genugtuung und ohne Mitleid, und das ist schlimmer als beides.',
        text: '„Ihr habt getan, was die Gründer taten. Ich habe euch dafür nicht zu hassen. Aber helfen muss ich auch nicht."',
        flags: ['ysmereth_schweigt'],
        choices: [
          { text: '[Stärke] Dann eben allein.', tag: '◈', check: { ability: 'st', dc: 18, success: 'gerissen', fail: 'nicht_gerissen' } },
          { text: 'Die elf Namen aufsagen.', to: 'namen', if: (s) => s.notes.namesCopied },
        ],
      },
    },
  },

  ysmereth_kammer: {
    id: 'ysmereth_kammer', speaker: 'Ysmereth', portrait: 'ysmereth', start: 'a',
    nodes: {
      a: {
        text: '„Wir sind beide unter einem Stein, Ihr Herrschaften. Ich habe darin mehr Übung."',
        choices: [
          { text: '„Was will er mit dem Stab?"', to: 'stab' },
          { text: '„Warum hat er dich nicht getötet?"', to: 'nicht_getoetet' },
          { text: '„Hilfst du uns oben?"', to: 'oben' },
          { text: 'Nichts weiter.', exit: true },
        ],
      },
      stab: {
        text: '„Er benutzt ihn nicht, um mich zu binden. Er benutzt ihn, um **durch mich hindurchzugreifen**."\n(Pause.)\n„Ein Stück meines Gefängnisses, geschlagen aus einem Stein, der beim Schlag geschrien hat, aufgeladen mit elf Namen. Das ist kein Werkzeug mehr, das ist eine Tür.\n\nUnd was er aufmacht, wohnt nicht in diesem Tal."',
        to: 'a',
      },
      nicht_getoetet: {
        text: '„Weil man mich nicht töten kann und weil er Zuschauer will."\n(Pause.)\n„Das Zweite ist das Gefährlichere. Wer Zuschauer will, hört nicht auf, bevor jemand zusieht."',
        to: 'a',
      },
      oben: {
        text: (s) => (s.notes.ysmerethFair === false || s.flags.ysmereth_bezwungen
          ? '„Ich werde da sein."\n(Pause.)\n„Ob ich etwas tue, entscheide ich, wenn ich sehe, wie ihr es anfangt. Ihr habt mich zurück in den Stein geschickt, Ihr Herrschaften. Das war die Wahl der Gründer, und ich habe zweihundert Jahre gebraucht, sie zu verzeihen. Gebt mir nicht wieder zweihundert."'
          : '„Vielleicht."\n(Er sieht zur Decke.)\n„Ich habe zweihundert Jahre in einem Loch gesessen, Junge. Wenn jemand dieses Loch aufreißt, um etwas Größeres hereinzulassen — dann ja. Dann werde ich da sein."'),
        flags: ['ysmereth_gefragt'],
        to: 'a',
      },
    },
  },

  wasserweg: {
    id: 'wasserweg', speaker: 'Die Versiegelung', start: 'a',
    nodes: {
      a: {
        narration: 'In der Ostwand der Kammer ist eine Öffnung, durch die ein erwachsener Mensch passt, und sie ist zu. Nicht zugemauert — **versiegelt**, mit derselben Handschrift, die den Bannkreis geschlagen hat.\n\nDie Gründer wollten diesen Ausgang nicht.',
        text: '',
        choices: [
          { text: '[Nachforschungen] Die Versiegelung überhaupt erst sehen.', tag: '◈', check: { skill: 'nachforschungen', dc: 16, success: 'gesehen', fail: 'nichts' } },
          { text: 'Die drei Gründernamen nennen.', to: 'namen', if: (s) => s.flags.gruenderformel },
          { text: 'Ysmereth bitten.', to: 'bitten', if: (s) => s.flags.ysmereth_hilft || s.flags.ysmereth_gefragt },
        ],
      },
      gesehen: {
        narration: 'Jetzt seht ihr sie: drei Zeichen, übereinandergelegt, und jedes davon ist ein Nachname.',
        text: '',
        choices: [
          { text: '„Wahl. Odowic. Brunnenmann."', to: 'namen' },
          { text: 'Ysmereth bitten.', to: 'bitten' },
        ],
      },
      nichts: {
        narration: 'Ihr seht eine Wand. Eine sehr gewöhnliche, sehr nasse Wand.',
        text: '',
        choices: [
          { text: 'Noch einmal suchen.', check: { skill: 'nachforschungen', dc: 16, success: 'gesehen', fail: 'nichts' }, tag: '◈' },
          { text: 'Ysmereth bitten.', to: 'bitten', if: (s) => s.flags.ysmereth_hilft },
          { text: '„Wahl. Odowic. Brunnenmann."', to: 'namen', if: (s) => s.flags.gruenderformel },
        ],
      },
      namen: {
        narration: 'Die drei Namen, in der Reihenfolge, in der sie unterschrieben haben.\n\nDie Versiegelung öffnet sich sofort, ohne Widerstand, fast erleichtert — als hätte sie zweihundert Jahre lang darauf gewartet, dass jemand die Formel kennt und trotzdem hindurchwill.',
        text: '',
        flags: ['wasserweg_offen'],
        end: true,
      },
      bitten: {
        narration: 'Er legt die Hand an den Stein, und der Stein hört auf, eine Wand zu sein.',
        text: '„Geht. Ich komme nach, oder ich komme nicht. Das hängt von euch ab und nicht von mir — was eine ungewohnte Lage für mich ist und mir überhaupt nicht gefällt."',
        flags: ['wasserweg_offen', 'ysmereth_hilft'],
        end: true,
      },
    },
  },
};

export const events = {
  erste_konfrontation: async (game) => {
    const r = await game.startCombat('ghortan_kammer');
    game.setFlag('erste_konfrontation');
    await game.narration({
      kapitel: 'Die zweite Kammer', titel: 'Genug',
      text: '„Genug."\n(Er lässt die Hände sinken, mitten in einer Bewegung, die gerade sehr teuer für euch geworden wäre.)\n\n„Ihr seid zäh — das wusste ich. Aber ich brauche nur Zeit, und Zeit habe ich euch gerade abgenommen."\n\nEr zieht sich in Flammen nach oben zurück. Der Aufgang bleibt offen.\n\nUnd dann fängt der Boden an, Geräusche zu machen.',
    });
    await game.runEvent('boden_gibt_nach');
  },

  boden_gibt_nach: async (game) => {
    const s = game.state;
    await game.narration({
      kapitel: 'Die zweite Kammer', titel: 'Fünf Runden',
      text: 'Was unter dieser Kammer liegt, ist kein Fels mehr. Es ist ein Riss, und er wird breiter.\n\nFünf Runden, dann gibt der Boden nach. Jede Runde eine Geschicklichkeitsprobe, um auf den Beinen zu bleiben und weiterzukommen.',
    });
    let gefallen = 0;
    for (let runde = 1; runde <= 3; runde++) {
      for (const c of s.party.filter((x) => !x.dead)) {
        const p = abilityCheck(c, 'ge', 14);
        if (!p.success) {
          const schaden = roll('2W6').total;
          applyDamage(c, schaden, 'wucht');
          gefallen++;
        }
      }
    }
    await game.narration({
      kapitel: 'Die zweite Kammer', titel: 'Oben',
      text: gefallen === 0
        ? 'Ihr kommt sauber durch. Hinter euch fällt ein Stück Kammerboden in etwas, das kein Boden mehr ist, und macht dabei kein Geräusch — weil das, wohinein es fällt, keine Geräusche zurückgibt.'
        : `Ihr kommt durch. Nicht sauber: ${gefallen}-mal geht jemand zu Boden und wird weitergezogen.\n\nHinter euch fällt ein Stück Kammerboden in etwas, das kein Boden mehr ist, und macht dabei kein Geräusch.`,
    });
    game.setFlag('flucht_geglueckt');
    await game.levelUp(6);
    game.state.session = 7;
    await game.goToArea('marktplatz_netz');
  },

  endkampf: async (game) => {
    const r = await game.startCombat('endkampf');
    if (r === 'niederlage') {
      await game.narration({
        kapitel: 'Der Riss', titel: 'Zuschauer',
        text: 'Er tötet euch nicht.\n\nEr lässt euch am Platzrand liegen, bei Bewusstsein, zwischen zwanzig anderen, die genauso liegen, und macht weiter.\n\nEr wollte Zuschauer. Ihr seid jetzt Zuschauer.',
      });
      await game.ending('akt2_zuschauer');
      return;
    }
    await game.runEvent('epilog');
  },

  epilog: async (game) => {
    const s = game.state;
    const ausgang = s.flags.ghortan_erschlagen ? 'erschlagen'
      : s.flags.ghortan_in_stab ? 'stab'
        : s.flags.ghortan_gebunden ? 'gebunden' : 'erschlagen';

    if (ausgang === 'erschlagen') {
      await game.narration({
        kapitel: 'Der letzte Atemzug', titel: 'Für einen Atemzug',
        text: `Die Beine zerfallen. Was übrigbleibt, kippt nach vorn und ist für einen Atemzug wieder der Ork vom Lagerfeuer — der, der um Erlaubnis gefragt hat, bevor er zauberte, und der einen orkischen Witz erzählt hat, der nicht funktioniert hat.\n\nEr sagt einen Namen. Den Namen der Person, die ihn losgeschnitten hat.\n\n**${s.notes.freedBy || s.party[0]?.name}.**\n\nDann nichts mehr.\n\nDer Riss schließt sich nur halb.\n\n[[Lolth hat jetzt eine Adresse.]]`,
      });
      s.flags.riss_halb_offen = true;
    } else if (ausgang === 'stab') {
      await game.narration({
        kapitel: 'Der letzte Atemzug', titel: 'Der zwölfte Platz',
        text: 'Ihr sprecht seinen Namen in den Stab.\n\nElf Runen. Elf Plätze. Alle belegt.\n\nSein Name geht trotzdem hinein — als zwölfter, wo nur elf Platz haben, und der weiße Stein nimmt ihn, weil er nicht anders kann.\n\nLolth verliert den Griff. Der Riss schließt sich vollständig, von der Mitte her, wie eine Naht.\n\nUnd Ghortan überlebt. Namenlos, machtlos, auf den Knien auf dem Pflaster des Marktplatzes von Klarwasser, zwischen zwanzig Leuten, die langsam wieder aufstehen.\n\nEr weiß nicht mehr, wie er heißt. Er weiß noch, wer ihr seid.\n\nDer Stab ist von da an ein Grad wärmer, als er sein dürfte.',
      });
      s.flags.riss_geschlossen = true;
      s.staff.names.push('(Ghortan — zwölfter Platz)');
    } else {
      await game.narration({
        kapitel: 'Der letzte Atemzug', titel: 'Genau der Fehler der Gründer',
        text: 'Ihr zieht den Stab aus dem zwölften Stein und richtet ihn gegen ihn.\n\nEs funktioniert. Es funktioniert genau so gut, wie es 1042 funktioniert hat.\n\nEr geht dorthin, wo Ysmereth zweihundert Jahre gesessen hat — in eine leere Tasche der Feenwelt, in der es nichts gibt und in der Zeit nicht vergeht und aus der man einmal alle siebzehn Jahre etwas hören kann, wenn man das Ohr an den richtigen Stein legt.\n\nEs ist poetisch.\n\nEs ist exakt der Fehler der Gründer.',
      });
      s.flags.ghortan_gebunden = true;
      s.flags.riss_geschlossen = true;
    }

    // Fünf Epilogfragen
    const fragen = [
      {
        titel: 'Der Marktplatz, ein Jahr später',
        text: 'Liegt der zwölfte Stein?',
        optionen: [
          { text: 'Ja. Tobrek Vahl hat ihn selbst gesetzt, allein, an einem Dienstag.', wert: 'tobrek' },
          { text: 'Ja. Die Stadt hat es gemeinsam getan, und es hat drei Monate gedauert, sich zu einigen.', wert: 'stadt' },
          { text: 'Nein. Er liegt noch am Rand. Niemand fasst ihn an.', wert: 'nein' },
        ],
      },
      {
        titel: 'Der neunte Tisch',
        text: 'Sitzt jemand dran?',
        optionen: [
          { text: 'Ja. Ein Kind, das seit zweihundert Jahren keine Suppe gegessen hat.', wert: 'kind', nur: 'kinder_zurueck' },
          { text: 'Grust hat ihn abgeräumt und verbrannt. Er sagt nicht, warum.', wert: 'weg' },
          { text: 'Er steht noch da. Er wird noch gewischt. Aber jetzt weiß Grust wieder, für wen.', wert: 'renn' },
        ],
      },
      {
        titel: 'Nella, mit einundzwanzig',
        text: 'Ist sie geblieben?',
        optionen: [
          { text: 'Sie ist geblieben und sortiert immer noch Kiesel.', wert: 'geblieben' },
          { text: 'Sie ist weg. Ohne Fasswagen, mit eigenem Geld, im Frühjahr.', wert: 'fort' },
          { text: 'Sie ist weg und wieder da. Zweimal. Bisher.', wert: 'beides' },
        ],
      },
    ];
    for (const f of fragen) {
      const opts = f.optionen.filter((o) => !o.nur || s.flags[o.nur]);
      await game.ask({ kapitel: 'Epilog', titel: f.titel, text: f.text, optionen: opts });
    }

    // Der geopferte Name
    const geopfert = Object.entries(s.notes.sacrificedNames || {});
    if (geopfert.length) {
      const [wer, was] = geopfert[0];
      await game.narration({
        kapitel: 'Epilog', titel: 'Der Name an der Steintür',
        text: `${wer} hat an der Steintür einen Namen gegeben: **${was}**.\n\nDiese Person lebt weiter. Sie steht morgens auf, sie arbeitet, sie isst zu Abend. Es fehlt ihr nichts — außer jemand, der sich an sie erinnert, und dieses Fehlen hat keine Form, in der man es bemerken könnte.\n\nSie wird nicht traurig sein. Sie wird nur, immer wieder, das Gefühl haben, dass sie jemanden anrufen wollte.`,
      });
    }

    await game.narration({
      kapitel: 'Epilog', titel: 'Sarines Bericht',
      text: 'Und in einem Archiv, zweihundert Meilen entfernt, liegt seit drei Monaten ein Bericht im Formularton:\n\n„**Klarwasser, Nr. 3 von 9.** Bindung gelöst am Neumond des Erntemonats. Gebundenes Wesen: Fürst der Stillen Tiefe, Klasse II. Beteiligte Sterbliche: drei, Namen anbei. Verhalten: ungewöhnlich sorgfältig.\n\nAnmerkung der Bearbeiterin: Die Gruppe hat sich in keinem Fall für die schnellste Lösung entschieden. Für die Bewertung des Ordens ist das unerheblich. Ich vermerke es trotzdem."',
    });

    await game.ending('akt2_ende');
    s.act = 3;
    await game.runEvent('akt3_start');
  },
};

export const combats = {
  ghortan_kammer: (game) => {
    const map = makeMap(26, 12);
    paintRect(map, 10, 3, 14, 4, TERRAIN.WAND);
    paintRect(map, 8, 7, 12, 8, TERRAIN.SCHWIERIG);
    return {
      title: 'Erste Konfrontation',
      map,
      playerStart: [{ x: 4, y: 5 }, { x: 4, y: 6 }, { x: 3, y: 5 }],
      enemies: [{ id: 'ghortan_p1', x: 20, y: 5, overrides: { hp: 45, maxHp: 45, name: 'Ghortan (schont sich)' } }],
      allies: game.state.flags.ysmereth_hilft ? [] : [],
      scenario: {
        onRoundEnd: (combat) => {
          const boss = combat.combatants.find((c) => c.side === 'feind' && !combat.isDown(c));
          if (boss && boss.ref.hp <= boss.maxHp * 0.5 && !combat.flags.abgebrochen) {
            combat.flags.abgebrochen = true;
            combat.logLine('stimme', '„Genug. Ihr seid zäh — das wusste ich. Aber ich brauche nur Zeit, und Zeit habe ich euch gerade abgenommen."');
            boss.ref.dead = true;
            combat.finish('sieg');
          }
        },
      },
      intro: {
        kapitel: 'Sitzung 6', titel: 'Er kämpft nicht zu Ende',
        text: 'Er steht im Aufgang und lässt euch nicht vorbei. Er wirkt keinen Feuerball — er schont sich.\n\n[[Er bricht bei der Hälfte seiner Trefferpunkte ab. Ihr müsst ihn nicht besiegen. Ihr müsst ihn nur beschäftigen.]]',
        knopf: 'Hindurch',
      },
    };
  },

  endkampf: (game) => {
    const s = game.state;
    const area = { w: 34, h: 14 };
    const map = makeMap(area.w, area.h);
    // Die Häuserblöcke des Marktplatzes
    paintRect(map, 3, 2, 5, 4, TERRAIN.GEBAEUDE);
    paintRect(map, 10, 2, 13, 3, TERRAIN.GEBAEUDE);
    paintRect(map, 21, 2, 23, 4, TERRAIN.GEBAEUDE);
    paintRect(map, 27, 2, 30, 3, TERRAIN.GEBAEUDE);
    paintRect(map, 3, 9, 6, 11, TERRAIN.GEBAEUDE);
    paintRect(map, 12, 9, 14, 11, TERRAIN.GEBAEUDE);
    paintRect(map, 21, 9, 24, 11, TERRAIN.GEBAEUDE);
    paintRect(map, 27, 9, 29, 11, TERRAIN.GEBAEUDE);

    // Die elf Gründersteine
    const steine = [
      { x: 12, y: 5 }, { x: 15, y: 4 }, { x: 20, y: 5 }, { x: 23, y: 6 },
      { x: 11, y: 8 }, { x: 14, y: 10 }, { x: 19, y: 10 }, { x: 22, y: 8 },
      { x: 13, y: 7 }, { x: 21, y: 7 }, { x: 17, y: 11 },
    ];

    return {
      title: 'Klarwasser unter dem Netz',
      area: 'marktplatz_netz',
      map,
      playerStart: [{ x: 17, y: 12 }, { x: 16, y: 12 }, { x: 18, y: 12 }],
      // Die Steine müssen sichtbar sein — sonst sucht man den Lösungsweg blind.
      kulisse: steine.map((st) => ({ type: 'gruenderstein', x: st.x, y: st.y })),
      enemies: [{ id: 'ghortan_p1', x: 17, y: 5 }],
      minionLimit: 3,
      lairActions: false,
      scenario: {
        steine,
        gesprochen: [],
        onStart: (combat) => {
          combat.flags.phase = 1;
          combat.flags.gruendersteine = [];
          combat.flags.stabFrei = false;
        },

        onRoundStart: (combat, runde) => {
          // Phase III: Schauplatz-Aktionen und Ysmereths Hilfe
          if (combat.flags.phase >= 3) combat.lairAction();
          const fair = combat.state.notes.ysmerethFair !== false
            && !combat.state.flags.ysmereth_bezwungen
            && !combat.state.flags.gegen_die_stadt;
          if (runde === 3 && fair && !combat.flags.ysmerethHelps && combat.flags.phase >= 2) {
            combat.flags.ysmerethHelps = true;
            combat.logLine('stimme', 'Aus dem Brunnen am Nordrand steigt etwas sehr Höfliches und sehr Nasses.');
            combat.logLine('stimme', '„Ich habe zweihundert Jahre in einem Loch gesessen, Junge. Du hältst keine zehn Minuten."');
            combat.ctx.onLog?.('schauplatz', 'Ysmereth hält den Riss zu: Ghortans Selbstschaden steigt von 8 auf 25 pro Runde.');
          }
          // Sicherheitsnetz: Grust reißt sich los
          if (runde === 4 && !combat.flags.grust) {
            const lebend = combat.combatants.filter((c) => c.side === 'held' && !combat.isDown(c)).length;
            if (lebend <= 1 && combat.state.flags.grust_gestaendnis) {
              combat.flags.grust = true;
              const g = spawnCreature('tanarukk_bruder', { name: 'Grust', hp: 30, maxHp: 30, tint: '#8a9a78' });
              const w = combat.wrapCreature(g, { x: 17, y: 11 }, 'verbuendet');
              combat.combatants.push(w);
              combat.order.push(w);
              combat.logLine('held', 'Grust reißt sich aus den Fäden los. Der größte Mann der Stadt hat sich entschieden.');
            }
          }
        },

        onDeath: (combat, target) => {
          if (target.side !== 'feind' || !target.ref.boss) return;
          const phase = combat.flags.phase;
          if (phase === 1) {
            combat.logLine('stimme', '„Gut. Sehr gut. Aber ich habe nie gesagt, dass ich allein bin."');
            naechstePhase(combat, target, 'ghortan_p2');
            // Diener erscheinen sofort
            for (const [id, count, ox] of [['tanarukk_bruder', 1, -3], ['spinnenbrut', 2, 3]]) {
              for (let i = 0; i < count; i++) {
                const spot = combat.freeSpotNear(target.x + ox + i, target.y, 4);
                if (!spot) continue;
                const cr = spawnCreature(id);
                const w = combat.wrapCreature(cr, spot, 'feind');
                w.summoned = true;
                combat.combatants.push(w);
                combat.order.splice(combat.order.indexOf(target) + 1, 0, w);
              }
            }
            combat.logLine('gegner', 'Aus den Fugen quillt schwarzes Gespinst. Zwei Gestalten steigen daraus hervor, mit Hörnern wie seinen.');
          } else if (phase === 2) {
            combat.logLine('stimme', '„Danke. Ich brauchte nur Zeit — und die habt ihr mir großzügig geschenkt."');
            combat.logLine('stimme', 'MUTTER. ICH HABE DEN RISS GEÖFFNET. KOMM UND SIEH, WAS DEIN WEGGEWORFENER SOHN GEBAUT HAT.');
            for (const c of combat.combatants) {
              if (c.summoned && !combat.isDown(c)) { c.ref.dead = true; c.ref.hp = 0; }
            }
            const extra = combat.state.counters.gesang >= 4 ? 25 : 0;
            naechstePhase(combat, target, 'ghortan_p3', extra);
            combat.flags.stabFrei = true;
            combat.logLine('schauplatz', 'Der Stab der Bindung steckt aufrecht im zwölften Gründerstein, Platzmitte. Erreichbar. Das ist Absicht.');
          }
        },

        specialActions: [
          {
            id: 'gruenderstein', name: 'Gründerstein', icon: 'merkmal', cost: 'aktion', needsTarget: true,
            desc: 'Einen der elf Steine berühren und einen der elf Namen laut sagen: −1 auf alle Angriffs- und Rettungswürfe Ghortans und auf seinen Zauber-SG, kumulativ, plus eine legendäre Aktion weniger. Bei fünf Namen verliert er Gewobene Dunkelheit, bei acht seine Resistenzen.',
            available: (combat) => combat.state.notes.namesCopied,
            run: (combat, actor, { point }) => {
              const stein = combat.scenario.steine.find((st) => Math.abs(st.x - point.x) <= 1 && Math.abs(st.y - point.y) <= 1
                && !combat.flags.gruendersteine.includes(`${st.x},${st.y}`));
              if (!stein) {
                combat.logLine('held', 'Dort liegt kein unbenutzter Gründerstein. (Die hellen Steine im Pflaster.)');
                return;
              }
              if (Math.max(Math.abs(actor.x - stein.x), Math.abs(actor.y - stein.y)) > 1) {
                combat.logLine('held', 'Zu weit weg — ihr müsst den Stein berühren können.');
                return;
              }
              combat.flags.gruendersteine.push(`${stein.x},${stein.y}`);
              const n = combat.flags.gruendersteine.length;
              const name = combat.state.notes.namesKnown[n - 1] || 'ein Name';
              combat.logLine('stimme', `${actor.name} legt die Hand auf den Stein und sagt: „${name}."`);
              const boss = combat.combatants.find((c) => c.side === 'feind' && c.ref.boss);
              if (boss) {
                for (const a of boss.actions) {
                  if (a.attackBonus) a.attackBonus -= 1;
                  if (a.save?.dc) a.save.dc -= 1;
                }
                boss.ref.spellDc = (boss.ref.spellDc || 17) - 1;
                boss.legendaryPenalty = (boss.legendaryPenalty || 0) + 1;
                combat.state.counters.gruendersteine = n;
                combat.logLine('schauplatz', `Ein Faden bricht. (${n}/11 Namen — Ghortan: −${n} auf Angriffe, Rettungswürfe und Zauber-SG.)`);
                if (n === 5) {
                  boss.actions = boss.actions.filter((a) => a.id !== 'gewobene_dunkelheit');
                  combat.logLine('schauplatz', 'Fünf Namen: Gewobene Dunkelheit fällt weg.');
                }
                if (n === 8) {
                  boss.ref.resistances = [];
                  combat.logLine('schauplatz', 'Acht Namen: Seine Resistenzen fallen.');
                }
              }
            },
          },
          {
            id: 'schriftrolle', name: 'Schriftrolle der Massenfesselung', icon: 'merkmal', cost: 'aktion',
            desc: 'Sie hält auch ein Gefäß der Spinnenkönigin: STÄ-RW SG 18, ohne Ausnahme für Größe oder Immunität. Bei Misserfolg eine Runde festgesetzt.',
            available: (combat) => combat.state.party_inventory.some((i) => i.id === 'schriftrolle'),
            run: (combat, actor) => {
              combat.state.party_inventory = combat.state.party_inventory.filter((i) => i.id !== 'schriftrolle');
              combat.logLine('stimme', `${actor.name} rollt das Pergament auf und liest vor. Es dauert keine acht Sekunden.`);
              const boss = combat.combatants.find((c) => c.side === 'feind' && c.ref.boss);
              if (!boss) return;
              const rw = savingThrow(boss.ref, 'st', 18);
              if (rw.success) {
                combat.logLine('gegner', `Ghortan besteht (${rw.total} gegen SG 18). „Gründerhand. Natürlich."`);
              } else {
                boss.ref.conditions.push({ id: 'festgesetzt', rounds: 2 });
                combat.logLine('schauplatz', 'Ghortan ist eine Runde festgesetzt. Lang genug, um ihm den Stab aus den Klauen zu nehmen.');
                combat.flags.stabGreifbar = true;
              }
            },
          },
          {
            id: 'stab_ziehen', name: 'Den Stab greifen', icon: 'merkmal', cost: 'aktion',
            desc: 'Den Stab aus dem zwölften Stein ziehen (Stärke SG 16) — oder ihn dem Festgesetzten aus den Klauen nehmen.',
            available: (combat) => combat.flags.stabFrei || combat.flags.stabGreifbar,
            run: (combat, actor) => {
              if (combat.flags.stabInHand) { combat.logLine('held', 'Ihr habt ihn bereits.'); return; }
              const p = abilityCheck(actor.ref, 'st', combat.flags.stabGreifbar ? 12 : 16);
              combat.logLine('probe', `${actor.name}: Stärke ${p.total} gegen SG ${combat.flags.stabGreifbar ? 12 : 16} — ${p.success ? 'Erfolg' : 'Misserfolg'}`);
              if (!p.success) return;
              combat.flags.stabInHand = actor.uid;
              combat.logLine('held', `${actor.name} hält den Stab der Bindung. Er ist warm. Er war noch nie warm.`);
            },
          },
          {
            id: 'namen_greifen', name: 'Namen greifen', icon: 'zauber', cost: 'aktion',
            desc: 'Den Stab gegen ihn richten (CHA-RW SG 17): Lolth verliert den Griff, alle Immunitäten und Resistenzen fallen, er stürzt auf 40 TP und kämpft als er selbst weiter.',
            available: (combat) => combat.flags.stabInHand,
            run: (combat, actor) => {
              const boss = combat.combatants.find((c) => c.side === 'feind' && c.ref.boss);
              if (!boss) return;
              const rw = savingThrow(boss.ref, 'ch', 17);
              combat.logLine('rettung', `Ghortan: CHA-RW ${rw.total} gegen SG 17 — ${rw.success ? 'bestanden' : 'misslungen'}`);
              if (rw.success) {
                combat.logLine('gegner', '„Nicht schlecht. Aber sie hält fest."');
                return;
              }
              boss.ref.immunities = [];
              boss.ref.resistances = [];
              boss.ref.legendary = null;
              boss.legendaryPenalty = 99;
              boss.ref.hp = Math.min(boss.ref.hp, 40);
              boss.ref.name = 'Ghortan von den Schatten';
              boss.name = 'Ghortan von den Schatten';
              combat.flags.lolthWeg = true;
              combat.logLine('stimme', 'Die Frauenstimme bricht ab, mitten in einem Wort.');
              combat.logLine('stimme', '„— oh. Oh, das war klug. Das war sehr klug von euch."');
              combat.logLine('schauplatz', 'Lolth verliert den Griff. Er kämpft mit seinen eigenen Werten weiter, auf 40 TP.');
            },
          },
          {
            id: 'in_den_stab', name: 'Seinen Namen in den Stab sprechen', icon: 'zauber', cost: 'aktion',
            desc: 'Statt ihn zu erschlagen: seinen Namen im Namen-Speicher ablegen. Als zwölfter, wo nur elf Plätze sind. Er überlebt — namenlos.',
            available: (combat) => combat.flags.stabInHand
              && combat.combatants.some((c) => c.side === 'feind' && c.ref.boss && c.ref.hp <= c.maxHp * 0.35),
            run: (combat, actor) => {
              const boss = combat.combatants.find((c) => c.side === 'feind' && c.ref.boss);
              if (!boss) return;
              combat.logLine('stimme', `${actor.name}: „Ghortan."`);
              combat.logLine('schauplatz', 'Der weiße Stein nimmt ihn. Als zwölften, wo nur elf Platz haben.');
              combat.state.flags.ghortan_in_stab = true;
              boss.ref.hp = 0;
              boss.ref.dead = true;
              combat.finish('sieg');
            },
          },
          {
            id: 'binden', name: 'Mit dem Stab binden', icon: 'zauber', cost: 'aktion',
            desc: 'Ihn dorthin schicken, wo Ysmereth zweihundert Jahre saß. Poetisch — und exakt der Fehler der Gründer.',
            available: (combat) => combat.flags.stabInHand
              && combat.combatants.some((c) => c.side === 'feind' && c.ref.boss && c.ref.hp <= c.maxHp * 0.35),
            run: (combat, actor) => {
              const boss = combat.combatants.find((c) => c.side === 'feind' && c.ref.boss);
              if (!boss) return;
              combat.logLine('schauplatz', `${actor.name} richtet den Stab, und der Marktplatz wird für einen Moment vollkommen still.`);
              combat.state.flags.ghortan_gebunden = true;
              boss.ref.hp = 0;
              boss.ref.dead = true;
              combat.finish('sieg');
            },
          },
        ],

        onEnd: (combat, result) => {
          if (result !== 'sieg') return;
          const s2 = combat.state;
          if (!s2.flags.ghortan_in_stab && !s2.flags.ghortan_gebunden) s2.flags.ghortan_erschlagen = true;
        },
      },
      intro: {
        kapitel: 'Sitzung 7 — Der Riss', titel: 'Der Himmel ist falsch',
        text: 'Ihr steigt aus dem Schacht, und der Himmel über Klarwasser ist falsch. Nicht dunkel — **gewebt**. Fäden aus schwarzem Licht spannen sich von Dach zu Dach.\n\nAuf dem Marktplatz, zwischen zwanzig reglosen Körpern, steht Ghortan. Der Stab der Bindung steckt im Pflaster vor ihm. Er dreht sich um, und zum ersten Mal, seit ihr ihn kennt, lächelt er nicht entschuldigend.\n\n„Ihr habt lange gebraucht. Gut. Ich wollte, dass ihr das seht."\n\n[[Drei Phasen. Im reinen Schadenswettlauf ist er nicht zu schlagen — das ist Absicht. Die Gegenmittel sind der Lösungsweg: die elf Gründersteine, die Schriftrolle, der Stab. Und Ysmereth, wenn ihr ihn fair behandelt habt.]]',
        knopf: 'Auf den Platz treten',
      },
    };
  },
};

function naechstePhase(combat, alt, neueId, extraHp = 0) {
  const cr = spawnCreature(neueId);
  cr.hp += extraHp;
  cr.maxHp += extraHp;
  const w = combat.wrapCreature(cr, { x: alt.x, y: alt.y }, 'feind');
  w.large = cr.large;
  combat.combatants.push(w);
  const i = combat.order.indexOf(alt);
  combat.order.splice(i + 1, 0, w);
  combat.flags.phase = cr.phase;
  combat.ctx.onPhase?.(w, cr.phase);
  combat.logLine('runde', `— Phase ${cr.phase}: ${cr.name} —`);
  if (cr.onEnter) combat.logLine('stimme', cr.onEnter);
}

export const endings = {
  akt2_zuschauer: {
    kapitel: 'Akt II — Niederlage', titel: 'Zuschauer',
    text: 'Das Netz liegt über Klarwasser, und danach über dem Tal, und danach weiter.\n\nEs geht nicht schnell. Das ist der Teil, den niemand erwartet hätte: Es dauert Jahre, und die meisten Leute merken es zuerst gar nicht, weil sich zuerst nur die Träume ändern.\n\nIhr seid dabei. Ihr seid die ganze Zeit dabei.',
    frage: 'Wolltet ihr das sehen?',
  },
  akt2_ende: {
    kapitel: 'Akt II — Ende', titel: 'Der Riss',
    text: 'Zwanzig Leute stehen langsam wieder auf und wissen nicht, wie lange sie gelegen haben.\n\nDie Fäden über den Dächern lösen sich nicht auf. Sie fallen — als schwarzer Staub, der drei Tage lang in allem ist, im Brot, im Wasser, in der Wäsche, und der am vierten Tag weg ist, als wäre nie etwas gewesen.\n\nKlarwasser wird darüber nicht sprechen. Das kann Klarwasser gut.',
    frage: 'Und wer trägt jetzt den Stab?',
  },
};

export const areaEnter = {
  zweite_kammer: async (game) => {
    if (game.flag('kammer_betreten')) return;
    game.setFlag('kammer_betreten');
    game.state.act = 2;
    await game.narration({
      kapitel: 'Akt II — Sitzung 6', titel: 'Gefesselt',
      text: game.flag('verrat_improvisiert')
        ? 'Ihr kommt wieder zu euch auf nassem Fels, dreißig Meter unter Klarwasser, und niemand hat euch gefesselt.\n\nDas ist schlimmer. Fesseln kann man durchschneiden.\n\nEr hat Nella.'
        : 'Ihr wacht in einer Kammer auf, die kein Mensch gebaut hat, mit etwas an den Handgelenken, das aussieht wie Tinte und sich anfühlt wie ein Vertrag.\n\nDrei Meter weiter sitzt ein sehr großer, sehr höflicher Feenfürst, genauso gefesselt wie ihr, und sieht euch beim Aufwachen zu.\n\n„Guten Morgen, Ihr Herrschaften. Ich nehme an, das war nicht der Plan."',
      knopf: 'Die Lage prüfen',
    });
  },

  marktplatz_netz: async (game) => {
    if (game.flag('netz_betreten')) return;
    game.setFlag('netz_betreten');
    await game.runEvent('endkampf');
  },
};
