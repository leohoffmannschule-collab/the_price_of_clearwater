// AKT I — PROLOG
// Taverne, Waldweg, Weggabelung, Goblinlager, Lichtung.
// Im Kampagnenbuch war diese Sitzung bereits gespielt; hier spielt man sie selbst,
// weil hier die beiden Entscheidungen fallen, an denen alles Weitere hängt:
// welches der drei Dinge man nimmt — und wer den Ork losschneidet.

import { makeMap, paintRect, TERRAIN } from '../engine/combat.js';

export const dialogues = {
  prolog_wirt: {
    id: 'prolog_wirt', speaker: 'Der Wirt', start: 'a',
    nodes: {
      a: {
        narration: 'Der Schankraum riecht nach nassem Wollstoff und zu lang gekochtem Kohl. Der Wirt hat euch schon dreimal angesehen, ohne etwas zu sagen.',
        text: '„Ihr wollt nach Klarwasser. Das seh ich an den Stiefeln. — Kann ich euch nicht ausreden, also: zwei Tage durch den Kiefernwald, und nehmt den Südweg. Am Nordweg liegt seit Wochen ein Goblinlager, und die sind unruhig geworden."',
        choices: [
          { text: 'Warum unruhig?', to: 'unruhig' },
          { text: 'Was weißt du über Klarwasser?', to: 'klarwasser' },
          { text: '[Motiv erkennen] Er sagt nicht alles.', tag: '◈', check: { skill: 'motiv_erkennen', dc: 12, success: 'durchschaut', fail: 'nichts' } },
          { text: 'Danke. Wir sehen es uns an.', exit: true },
        ],
      },
      unruhig: {
        text: '„Sie haben was gefangen. Etwas Großes. Man hört es nachts bis hier runter, und es klingt nicht wie ein Tier."\n(Er wischt ein Glas, das schon sauber ist.)\n„Ich will das nicht wissen. Ihr wollt das auch nicht wissen."',
        to: 'a2',
      },
      klarwasser: {
        text: '„Achtzig Häuser, ein Brunnen, und seit ich denken kann keine einzige schlechte Ernte. Keine Seuche. Kein Feuer. — Das Wasser dort heilt Fieber, sagen sie."\n(Pause.)\n„Ich war zweimal da. Beim zweiten Mal hab ich nicht übernachtet."',
        to: 'a2',
      },
      durchschaut: {
        text: '„…Also gut. Meine Schwester hat in Klarwasser geheiratet. Sie schreibt jedes Jahr. Letztes Jahr stand in dem Brief ein Satz, den sie nicht erklären konnte, und seitdem schreibt sie wieder wie vorher.\nDer Satz war: ‚Es waren zwölf, und jetzt sind es elf, und niemand fragt.‘"',
        flags: ['wirt_satz'],
        to: 'a2',
      },
      nichts: { text: '„Mehr weiß ich nicht. Ich bin Wirt, kein Chronist."', to: 'a2' },
      a2: {
        text: '„Wollt ihr noch etwas? Der Krug kostet zwei Kupfer. Das Zimmer ist schon vergeben."',
        choices: [
          { text: 'Nichts mehr. Danke.', exit: true },
          { text: 'Was weißt du über Klarwasser?', to: 'klarwasser', once: true },
          { text: 'Warum sind die Goblins unruhig?', to: 'unruhig', once: true },
        ],
      },
    },
  },

  prolog_katze: {
    id: 'prolog_katze', speaker: 'Eine Katze', start: 'a',
    nodes: {
      a: {
        narration: 'Sie sitzt mitten auf dem Weg, als hätte sie gewartet. Grau, mager, mit einem weißen Fleck über dem linken Auge. Als ihr stehenbleibt, steht sie auf und kommt näher.',
        text: '(Sie schnurrt. Sie will offensichtlich mitgehen.)',
        choices: [
          { text: 'Sie mitnehmen. Warum nicht.', to: 'mit', flags: ['katze_mit'] },
          { text: 'Sie verscheuchen. Wir haben keine Zeit.', to: 'weg', flags: ['katze_weg'] },
          { text: '[Mit Tieren umgehen] Woher kommst du?', tag: '◈', check: { skill: 'mit_tieren_umgehen', dc: 12, success: 'woher', fail: 'mit' } },
          { text: 'Sie töten. Sie ist eine Last.', to: 'tot', flags: ['katze_tot'] },
        ],
      },
      mit: {
        text: '(Sie trottet ab jetzt hinter euch her, in einem Abstand, der genau so groß ist, dass es nicht wie Folgen aussieht.)',
        end: true,
      },
      woher: {
        narration: 'Sie ist gut genährt für eine Streunerin und hat keinen Bergstaub im Fell. Sie kommt nicht aus dem Wald. Sie kommt aus einem Tal — und zwar aus dem, in das ihr wollt.',
        text: '(Sie sieht euch an, als wäre die Frage unhöflich.)',
        flags: ['katze_mit', 'katze_herkunft'],
        end: true,
      },
      weg: { text: '(Sie geht drei Schritte zur Seite und setzt sich wieder. Sie sieht euch nach, bis ihr um die Biegung seid.)', end: true },
      tot: {
        narration: 'Es geht schnell. Es geht so schnell, dass niemand danach etwas sagt.\n\n[[Notiert.]]',
        text: '',
        end: true,
      },
    },
  },

  prolog_wahl: {
    id: 'prolog_wahl', speaker: 'Der Wegequell', portrait: null, start: 'a',
    nodes: {
      a: {
        narration: 'An der Weggabelung steht ein alter Steintrog für Reisende, gespeist aus einer Ader, die tief im Berg beginnt. Er ist bis zum Rand gefüllt, und das Wasser ist viel klarer, als Wasser sein sollte.\n\nIm Trog liegen drei Dinge nebeneinander, als hätte sie jemand hingelegt. Sie sind nicht nass.',
        text: 'Ein Stab aus weißem Kieselstein.\nEine Pergamentrolle mit drei alten Siegeln.\nEin schwarz gebundenes Buch mit goldenen Schnüren.',
        choices: [
          { text: 'Die drei Dinge zuerst genauer ansehen.', to: 'ansehen' },
          { text: '[Arkane Kunde] Was liegt hier?', tag: '◈', check: { skill: 'arkane_kunde', dc: 14, success: 'arkan', fail: 'ansehen' } },
          { text: 'Den Stab nehmen.', to: 'stab' },
          { text: 'Die Schriftrolle nehmen.', to: 'rolle' },
          { text: 'Das Buch nehmen.', to: 'buch' },
          { text: 'Alle drei nehmen.', to: 'alle' },
        ],
      },
      ansehen: {
        narration: 'Der Stab ist schwer wie Knochen und kalt, obwohl die Sonne auf ihm liegt. Elf Kratzer sind eingegraben, die keine Ordnung haben.\nDie Schriftrolle trägt drei Siegel, und die Tinte riecht nach kaltem Wasser und Stein.\nDas Buch ist leer — bis auf elf Einträge in elf verschiedenen Handschriften.',
        text: 'Drei Dinge. Und der Trog ist so schmal, dass eine Hand hineinpasst.',
        choices: [
          { text: 'Den Stab nehmen.', to: 'stab' },
          { text: 'Die Schriftrolle nehmen.', to: 'rolle' },
          { text: 'Das Buch nehmen.', to: 'buch' },
          { text: 'Alle drei nehmen.', to: 'alle' },
        ],
      },
      arkan: {
        narration: 'Alle drei sind legendär, und alle drei gehören zusammen — sie wurden im selben Jahrzehnt und gegen dieselbe Sache gemacht.\n\nUnd noch etwas: Sie sind nicht hier vergessen worden. Sie sind hier [[hingelegt]] worden, und zwar von unten, durch das Wasser.',
        text: 'Der Stab summt. Nur leise. Aber er summt.',
        flags: ['wahl_durchschaut'],
        choices: [
          { text: 'Den Stab nehmen.', to: 'stab' },
          { text: 'Die Schriftrolle nehmen.', to: 'rolle' },
          { text: 'Das Buch nehmen.', to: 'buch' },
          { text: 'Alle drei nehmen.', to: 'alle' },
        ],
      },
      alle: {
        narration: 'Ihr greift nach dem zweiten Gegenstand, und das Wasser im Trog wird für einen Moment undurchsichtig. Nicht trüb — [[verschlossen]]. Eure Hand findet den Rand des Trogs, wo eben noch Pergament lag.\n\nEin Feenfürst gibt nie drei Dinge. Er legt drei hin und lässt eines nehmen.',
        text: 'Ihr könnt genau eines mitnehmen.',
        choices: [
          { text: 'Den Stab.', to: 'stab' },
          { text: 'Die Schriftrolle.', to: 'rolle' },
          { text: 'Das Buch.', to: 'buch' },
        ],
      },
      stab: {
        narration: 'Ihr nehmt den Stab, und in dem Moment, in dem sich eure Hand schließt, ist ein Vertrag geschlossen, den niemand gelesen hat.\n\nDer Stab ist ein kalter, schwerer Stock. Weiter nichts. Aber wer ihn trägt, hört seit der Weggabelung einen Ton, den sonst niemand hört.',
        text: '',
        flags: ['gewaehlt_stab', 'wahl_getroffen'],
        onEnter: (s, ctx) => ctx.game?.effect({ typ: 'stab', stufe: 0 }),
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('wahl_abschluss'),
      },
      rolle: {
        narration: 'Ihr nehmt die Schriftrolle. Sie ist leichter, als sie aussieht, und das Pergament ist warm.\n\nDie beiden anderen Dinge bleiben liegen. Der Stab summt, als ihr euch abwendet. Ihr hört ihn noch eine ganze Weile.',
        text: '',
        flags: ['gewaehlt_rolle', 'wahl_getroffen'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('wahl_abschluss'),
      },
      buch: {
        narration: 'Ihr nehmt das Buch. Es wiegt mehr, als Papier wiegen darf, und beim Aufschlagen steht auf der ersten Seite ein Name, ein Datum und drei Zeilen über ein Kind, das es nicht mehr gibt.\n\nDie beiden anderen Dinge bleiben liegen.',
        text: '',
        flags: ['gewaehlt_buch', 'wahl_getroffen'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('wahl_abschluss'),
      },
    },
  },

  prolog_ghortan_ketten: {
    id: 'prolog_ghortan_ketten', speaker: 'Etwas in Ketten', portrait: 'ghortan', start: 'a',
    nodes: {
      a: {
        narration: 'Hinter dem Felsen liegt etwas, das größer ist als jeder Goblin. Grau-grüne Haut, Hörner statt Haar, und an den Handgelenken Ketten, die nicht aus Eisen sind — sie sind aus etwas, das leise brennt, ohne Licht zu machen.\n\nEs hebt den Kopf. Die Augen sind feuerrot und vollkommen wach.',
        text: '„Ihr seid keine Goblins."\n(Pause.)\n„Das ist die beste Nachricht seit drei Jahren. Schneidet mich los."',
        choices: [
          { text: 'Wer bist du?', to: 'wer' },
          { text: 'Warum sollten wir?', to: 'warum' },
          { text: '[Arkane Kunde] Diese Ketten sind nicht irdisch.', tag: '◈', check: { skill: 'arkane_kunde', dc: 13, success: 'ketten', fail: 'wer' } },
          { text: 'Losschneiden.', to: 'frei' },
          { text: 'Ihn liegen lassen.', to: 'liegen' },
        ],
      },
      wer: {
        text: '„Ghortan. Vom Stamm der Tanarukk, falls euch das etwas sagt. Falls nicht: ein Ork, dem jemand Feuer in die Adern gelegt hat, bevor er gefragt wurde."\n\n„Die Göttin Schar hat mich beansprucht, als ich klein war. Sie hat mich geformt. Und als ich nicht das Werkzeug wurde, das sie wollte, hat sie mich an diese hier verkauft. Werkzeuge, die zurückreden, verkauft man."',
        choices: [
          { text: 'Wie lange liegst du hier?', to: 'lange' },
          { text: 'Losschneiden.', to: 'frei' },
          { text: '[Motiv erkennen] Lügt er?', tag: '◈', check: { skill: 'motiv_erkennen', dc: 15, success: 'wahr', fail: 'unklar' } },
        ],
      },
      lange: {
        text: '„Drei Jahre. — Nein, das stimmt nicht. Drei Jahre in Ketten. Hier liege ich seit vier Wochen."\n(Er sieht auf seine Handgelenke.)\n„Die Narben sind älter als das Lager. Das könnt ihr nachsehen, wenn ihr mir nicht glaubt."',
        choices: [
          { text: '[Heilkunde] Die Narben ansehen.', tag: '◈', check: { skill: 'heilkunde', dc: 10, success: 'narben', fail: 'frei' } },
          { text: 'Losschneiden.', to: 'frei' },
        ],
      },
      narben: {
        narration: 'Die Brandnarben sind echt und mindestens zwei Jahre alt. Was er sagt, stimmt.',
        text: '„Gut. Dann müssen wir das nicht weiter besprechen."',
        flags: ['ghortan_narben'],
        choices: [{ text: 'Losschneiden.', to: 'frei' }, { text: 'Ihn liegen lassen.', to: 'liegen' }],
      },
      wahr: {
        narration: 'Er lügt nicht. Kein Zögern, keine gesuchten Worte, keine Geschichte, die zu glatt sitzt. Was er erzählt, ist ihm passiert.\n\n(Was er [[nicht]] erzählt, kann man nicht sehen.)',
        text: '„Ihr seht mich an wie jemand, der rechnet. Rechnet fertig. Ich habe Zeit — offensichtlich."',
        flags: ['ghortan_ehrlich'],
        choices: [{ text: 'Losschneiden.', to: 'frei' }, { text: 'Ihn liegen lassen.', to: 'liegen' }],
      },
      unklar: {
        text: '„Ihr wisst es nicht. Das ist fair. Ich wüsste es an eurer Stelle auch nicht."',
        choices: [{ text: 'Losschneiden.', to: 'frei' }, { text: 'Ihn liegen lassen.', to: 'liegen' }],
      },
      ketten: {
        narration: 'Abyssale Ketten. Sie fesseln nicht den Körper, sondern das, was in ihm brennt. Wer sie anlegt, muss gewusst haben, was er da hat — und was er verkauft.',
        text: '„Ihr kennt sie also. Dann wisst ihr auch, dass Goblins so etwas nicht schmieden. Sie haben mich nicht gefangen. Sie haben mich [[bekommen]]."',
        flags: ['ghortan_ketten_erkannt'],
        choices: [{ text: 'Von wem?', to: 'wer' }, { text: 'Losschneiden.', to: 'frei' }],
      },
      warum: {
        text: '„Weil ich euch dann nicht töten muss, wenn ich hier allein rauskomme. Das ist der ehrliche Grund."\n(Pause. Etwas leiser:)\n„Und weil ich seit drei Jahren niemanden mehr gefragt habe und nicht weiß, wie lange ich das noch kann."',
        choices: [{ text: 'Losschneiden.', to: 'frei' }, { text: 'Ihn liegen lassen.', to: 'liegen' }],
      },
      frei: {
        narration: 'Die Ketten geben nach, als hätten sie nur darauf gewartet, dass jemand fragt. Er steht auf — langsam, mit der Vorsicht von jemandem, der es lange nicht getan hat — und ist zwei Köpfe größer als eben noch.\n\nEr reibt sich die Handgelenke und sieht die Person an, die geschnitten hat. Er sagt ihren Namen. Einmal. Als würde er ihn sich merken.',
        text: '„Ghortan."\n(Er streckt die Hand aus, und es sieht ungeübt aus.)\n„Ich schulde euch etwas. Ich weiß nicht, wie viel. Ich komme ein Stück mit, bis ich es weiß."',
        flags: ['ghortan_befreit', 'ghortan_dabei'],
        onEnter: (s, ctx) => ctx.game?.runEvent('ghortan_notiert'),
        end: true,
      },
      liegen: {
        narration: 'Ihr geht weiter. Hinter euch sagt er nichts. Kein Fluchen, kein Betteln — nur ein sehr langes Schweigen, das sich anfühlt wie Zuhören.\n\nIn der Nacht seht ihr von der Lichtung aus Feuerschein über dem Lager. Am nächsten Morgen ist es still da unten.',
        text: '',
        flags: ['ghortan_zurueckgelassen'],
        end: true,
      },
    },
  },

  prolog_lagerfeuer: {
    id: 'prolog_lagerfeuer', speaker: 'Ghortan', portrait: 'ghortan', start: 'a',
    nodes: {
      a: {
        narration: 'Das Feuer ist klein und raucht. Ghortan sitzt mit dem Rücken zum Wald und den Händen zur Glut, obwohl ihm offensichtlich nicht kalt ist.',
        text: '„Also. Klarwasser."\n(Er dreht einen Ast im Feuer.)\n„Ich habe nichts Besseres vor und schulde euch etwas. Das reicht mir für ein paar Tage."',
        choices: [
          { text: 'Was willst du eigentlich?', to: 'will' },
          { text: 'Wer war deine Mutter?', to: 'mutter' },
          { text: 'Willst du dich rächen?', to: 'rache' },
          { text: 'Was ist das für ein Stab?', to: 'stab', if: (s) => s.flags.gewaehlt_stab },
          { text: 'Nichts. Gute Nacht.', to: 'ende' },
        ],
      },
      will: {
        text: '„Ich will, dass mich nie wieder jemand weiterreichen kann."\n(Lange Pause.)\n„Das ist etwas anderes als Rache. Es ist billiger."',
        to: 'a2',
      },
      mutter: {
        text: '„Kalt. Mächtig."\n(Er sieht ins Feuer.)\n„Sie hat mich nicht verkauft — sie hat nur zugesehen, wie es jemand anderes tat."',
        to: 'a2',
      },
      rache: {
        text: '(Lange Pause.)\n„Nein. Rache ist ein Plan für Leute mit Zeit. Ich hatte drei Jahre Zeit und habe sie damit verbracht, an nichts zu denken. Das kann ich empfehlen."',
        to: 'a2',
      },
      stab: {
        narration: 'Er streckt die Hand aus und berührt ihn beiläufig. Und zieht sie sofort wieder zurück.',
        text: '„Kalt."\n(Er sieht seine eigene Hand an.)\n„Was ist das für ein Ding?"',
        flags: ['ghortan_stab_gefragt'],
        to: 'a2',
      },
      a2: {
        text: '',
        narration: 'Eine Weile sagt niemand etwas. Das Feuer knackt. Irgendwo weit weg ruft ein Käuzchen und hört dann auf.',
        choices: [
          { text: 'Was willst du eigentlich?', to: 'will', once: true },
          { text: 'Wer war deine Mutter?', to: 'mutter', once: true },
          { text: 'Willst du dich rächen?', to: 'rache', once: true },
          { text: 'Was ist das für ein Stab?', to: 'stab', once: true, if: (s) => s.flags.gewaehlt_stab },
          { text: 'Schlafen gehen.', to: 'ende' },
        ],
      },
      ende: {
        text: '„Darf ich was Seltsames sagen?"\n(Er wartet nicht auf die Antwort.)\n„Ich hab drei Jahre in Ketten gelegen und ein paar Tage mit euch. Die Tage waren länger. Im guten Sinn."',
        narration: 'Er legt noch ein Scheit nach, obwohl das Feuer keines braucht.',
        flags: ['lagerfeuer_gesprochen'],
        end: true,
      },
    },
  },
};

export const events = {
  spiel_start: async (game) => {
    await game.narration({
      kapitel: 'Akt I — Klarwasser',
      titel: 'Der Preis',
      text: 'Klarwasser hat seit zweihundert Jahren keine Missernte erlebt. Keine Seuche. Kein Feuer. Das Brunnenwasser heilt Fieber.\n\nDie Stadt weiß, warum. Sie muss es nur alle siebzehn Jahre kurz vergessen.\n\nIhr wisst das noch nicht. Ihr wisst nur, dass jemand zahlt — hundertfünfzig Goldstücke für ein Dokument aus Familienbesitz, Diskretion vorausgesetzt, Fragen werden nicht beantwortet.\n\nZwei Tagesmärsche durch den Kiefernwald. Heute Abend noch der letzte Krug.',
      knopf: 'Den Schankraum betreten',
    });
    await game.goToArea('taverne');
  },

  prolog_diebstahl: async (game) => {
    const dieb = game.state.party.find((c) => c.id === game.state.hooks.dieb) || game.state.party[0];
    const { abilityCheck } = await import('../engine/rules.js');
    const probe = abilityCheck(dieb, 'fingerfertigkeit', 14);
    if (probe.success) {
      await game.narration({
        kapitel: 'Zum Krummen Nagel', titel: 'Sauber',
        text: `${dieb.name} nimmt den Beutel, ohne dass sich im Raum etwas ändert. Vier Silberstücke und ein Anhänger, der einmal jemandem wichtig war.\n\nNiemand sieht auf. Das ist das Beunruhigende: In Wirtshäusern sieht [[immer]] jemand auf.`,
      });
      game.gold(4);
      game.setFlag('diebstahl_gelungen');
    } else {
      await game.narration({
        kapitel: 'Zum Krummen Nagel', titel: 'Eine Hand am Handgelenk',
        text: `${dieb.name} hat den Beutel schon halb in der Hand, als sich eine sehr große Hand um das Handgelenk legt.\n\n„Raus", sagt der Wirt. Er sagt es nicht laut. Er sagt es wie jemand, der das öfter sagt und dem es jedes Mal leidtut.\n\n„Und zwar jetzt, und nicht wieder rein, und wenn ihr nach Klarwasser wollt, dann nehmt den Nordweg, damit die Goblins euch vor mir kriegen."`,
      });
      game.setFlag('rauswurf');
      game.setFlag('ruf_als_diebe');
    }
    game.setFlag('diebstahl_versucht');
  },

  prolog_laute: async (game) => {
    const musiker = game.state.party.find((c) => c.id === game.state.hooks.musiker) || game.state.party[0];
    const nimm = await game.ask({
      kapitel: 'Zum Krummen Nagel', titel: 'Eine Laute an der Wand',
      text: 'Sie hängt an einem Nagel über dem zweiten Tisch, hat drei heile Saiten und sieht aus, als hätte sie seit Jahren niemand angefasst.\n\nSie gehört jemandem. Das tun Dinge an Wänden.',
      optionen: [
        { text: `${musiker.name} nimmt sie mit.`, wert: 'nehmen' },
        { text: 'Fragen, ob man darauf spielen darf.', wert: 'fragen' },
        { text: 'Hängen lassen.', wert: 'nein' },
      ],
    });
    if (nimm === 'nehmen') {
      game.setFlag('laute_gestohlen');
      musiker.inventory.push({ id: 'laute', type: 'quest', name: 'Laute (gestohlen)', count: 1, desc: 'Drei heile Saiten. Jemand wird sie wiedererkennen.' });
      game.toast('Die Laute ist jetzt bei euch. Jemand wird sie wiedererkennen.');
    } else if (nimm === 'fragen') {
      await game.narration({
        titel: 'Ein Achselzucken',
        text: '„Die gehört keinem mehr", sagt der Wirt, ohne aufzusehen. „Der, dem sie gehört hat, kommt nicht wieder. Nehmt sie, wenn ihr sie spielt. Ich will sie nur nicht mehr da hängen sehen."',
      });
      game.setFlag('laute_geschenkt');
      musiker.inventory.push({ id: 'laute', type: 'quest', name: 'Laute', count: 1, desc: 'Ehrlich bekommen. Der Wirt wollte sie nicht mehr sehen.' });
    }
  },

  prolog_rauswurf: async (game) => {
    if (!game.flag('prolog_abend_gespielt')) {
      game.setFlag('prolog_abend_gespielt');
      await game.narration({
        kapitel: 'Der Waldweg', titel: 'Hinaus',
        text: 'Draußen ist es kälter als erwartet. Der Kiefernwald beginnt dreißig Schritte hinter dem letzten Haus und hört danach zwei Tage lang nicht mehr auf.\n\nDer Wirt hat den Südweg empfohlen. Ihr steht am Nordweg.',
      });
    }
  },

  prolog_woelfe: async (game) => {
    await game.startCombat('woelfe');
    game.setFlag('prolog_woelfe');
    await game.narration({
      kapitel: 'Der Waldweg', titel: 'Danach',
      text: 'Drei Wölfe, und der letzte hat sich nicht zurückgezogen, als es vernünftig gewesen wäre.\n\nAus dem, was übrig ist, lassen sich zwei brauchbare Felle schneiden und neun Portionen Fleisch. Das ist mehr, als ihr tragen wollt, und trotzdem nehmt ihr alles mit — der Wald ist lang.',
    });
    game.item({ id: 'wolfsfell', name: 'Wolfsfell', count: 2, desc: 'Grust im Nassen Hut kauft so etwas. Acht Goldstücke.' });
    game.item({ id: 'wolfsfleisch', name: 'Wolfsfleisch', count: 9, desc: 'Neun Portionen. Ein Erntefest kann so etwas gebrauchen.' });
    await game.levelUp(2);
  },

  prolog_rast: async (game) => {
    await game.rast(true);
    game.setFlag('prolog_gerastet');
  },

  schau_stab: async (game) => {
    await game.narration({
      kapitel: 'Der Wegequell', titel: 'Der Stab',
      text: 'Anderthalb Meter weißer Kieselstein, kalt und schwer wie Knochen. Das obere Ende ist mit Kupfer umwickelt, das nach Blut riecht, obwohl die Oberfläche sauber ist.\n\nElf Kratzer sind eingegraben. Sie sehen nicht aus wie Schrift. Sie sehen aus wie Kratzer.',
    });
  },
  schau_rolle: async (game) => {
    await game.narration({
      kapitel: 'Der Wegequell', titel: 'Die Schriftrolle',
      text: 'Pergament in einer Tinte, die es nur an einem Ort gibt: in den Felsspalten unter einer bestimmten Stadt. Drei Siegel, drei Namen, alle unleserlich bis auf den letzten Buchstaben.\n\nWas darauf steht, ist kurz. Es sieht aus wie etwas, das man einmal benutzt.',
    });
  },
  schau_buch: async (game) => {
    await game.narration({
      kapitel: 'Der Wegequell', titel: 'Das Buch',
      text: 'Weißes Papier, schwarz gebunden, goldene Schnüre. Die Seiten sind leer — bis auf elf Einträge in elf verschiedenen Handschriften, alle in derselben dunklen Tinte.\n\nJede Seite trägt einen Namen, ein Datum und eine kurze Erinnerung an ein Kind.\n\nDas Gras um den Trog ist auf einer Seite verkohlt. Als hätte jemand versucht, etwas zu verbrennen, und aufgegeben.',
    });
    game.setFlag('verkohltes_gras_gesehen');
  },

  wahl_abschluss: async (game) => {
    const s = game.state;
    if (s.flags.gewaehlt_stab) {
      s.staff.bearer = s.party[0].id;
      game.quest({ id: 'stab', neu: true, titel: 'Der Stab der Bindung', text: 'Ein kalter, schwerer Stock, der summt, wenn stehendes Wasser in der Nähe ist. Er schläft.' });
      game.state.party[0].inventory.push({ id: 'stab_der_bindung', type: 'waffe', name: 'Stab der Bindung', profile: 'kampfstab', equipped: false, legendaer: true, desc: 'Elf Runen. Noch unleserlich.' });
    }
    if (s.flags.gewaehlt_rolle) {
      game.item({ id: 'schriftrolle', name: 'Schriftrolle der Massenfesselung', count: 1, legendaer: true, desc: 'Bis zu 20 Ziele, STÄ-RW SG 18. Einmal. Danach zerfällt sie.' });
      game.quest({ id: 'stab', neu: true, titel: 'Was liegen blieb', text: 'Ein weißer Stab und ein schwarzes Buch liegen weiterhin am Wegequell.' });
    }
    if (s.flags.gewaehlt_buch) {
      game.item({ id: 'buch_der_namen', name: 'Das Buch der verlorenen Namen', count: 1, legendaer: true, desc: 'Elf Einträge in elf Handschriften. Tinte, die nicht lügen kann. −1 auf Charisma-Würfe pro Name.' });
      game.quest({ id: 'stab', neu: true, titel: 'Was liegen blieb', text: 'Ein weißer Stab und eine versiegelte Rolle liegen weiterhin am Wegequell.' });
    }
    await game.narration({
      kapitel: 'Die Weggabelung', titel: 'Weiter',
      text: 'Hinter den Bäumen im Norden steht Rauch. Nicht viel — der Rauch eines Lagers, das nicht gefunden werden will, und deshalb schlecht gemacht.\n\nDer Südweg führt an allem vorbei. Ihr könntet ihn nehmen.',
    });
  },

  prolog_goblins: async (game) => {
    await game.startCombat('goblins');
    game.setFlag('prolog_goblins');
    await game.narration({
      kapitel: 'Das Goblinlager', titel: 'Hinter dem Felsen',
      text: 'Das Lager ist kleiner, als es von außen aussah, und viel schlechter versorgt. Was die Goblins bewacht haben, war nicht ihr Vorrat.\n\nEs liegt hinter dem Felsen am Ostrand und atmet.',
    });
    game.gold(12);
  },

  ghortan_notiert: async (game) => {
    // Wer hat ihn losgeschnitten? Das zählt bis in den Endkampf und bis in Akt III.
    const wer = await game.ask({
      kapitel: 'Abyssale Ketten', titel: 'Wer schneidet?',
      text: 'Die Ketten sind heiß und geben nur der Hand nach, die sich wirklich entscheidet.',
      optionen: game.state.party.map((c) => ({ text: c.name, wert: c.id })),
    });
    game.setFlag('losgeschnitten_von', wer);
    const c = game.state.party.find((x) => x.id === wer);
    game.state.notes.freedBy = c?.name;
    game.toast(`Ghortan hat sich ${c?.name} gemerkt.`);
    game.quest({ id: 'ghortan', neu: true, titel: 'Ghortan von den Schatten', text: 'Ein Tanarukk, den die Göttin Schar an Goblins verkauft hat. Er kommt ein Stück mit.' });
  },
};

export const combats = {
  woelfe: (game) => {
    const map = makeMap(26, 14);
    paintRect(map, 8, 3, 10, 5, TERRAIN.SCHWIERIG);
    paintRect(map, 16, 7, 19, 9, TERRAIN.SCHWIERIG);
    return {
      title: 'Etwas im Unterholz',
      map,
      playerStart: [{ x: 3, y: 6 }, { x: 3, y: 7 }, { x: 2, y: 6 }],
      enemies: [
        { id: 'wolf', x: 16, y: 5 }, { id: 'wolf', x: 18, y: 7 }, { id: 'wolf', x: 17, y: 9 },
      ],
      allies: game.state.flags.ghortan_dabei ? [{ id: 'ghortan_begleiter', x: 4, y: 8 }] : [],
      intro: {
        kapitel: 'Der Waldweg', titel: 'Rudeltaktik',
        text: 'Sie kommen nicht von vorn. Sie kommen von drei Seiten, und sie haben das nicht heute gelernt.\n\n[[Rudeltaktik: Sie haben Vorteil auf Angriffe gegen ein Ziel, neben dem bereits ein zweiter Wolf steht. Bleibt nicht allein.]]',
        knopf: 'Kampf beginnen',
      },
    };
  },

  goblins: (game) => {
    const map = makeMap(26, 12);
    paintRect(map, 9, 2, 17, 2, TERRAIN.SCHWIERIG);
    paintRect(map, 9, 6, 17, 6, TERRAIN.SCHWIERIG);
    return {
      title: 'Das Goblinlager',
      map,
      playerStart: [{ x: 3, y: 4 }, { x: 3, y: 5 }, { x: 2, y: 4 }],
      enemies: [
        { id: 'goblin', x: 12, y: 3 }, { id: 'goblin', x: 14, y: 5 }, { id: 'goblin', x: 16, y: 4 },
        { id: 'goblin', x: 13, y: 7 }, { id: 'goblin', x: 18, y: 6 },
      ],
      allies: game.state.flags.ghortan_dabei ? [{ id: 'ghortan_begleiter', x: 4, y: 6 }] : [],
      intro: {
        kapitel: 'Das Goblinlager', titel: 'Fünf, und einer ruft',
        text: 'Sie sehen euch früher, als euch lieb ist. Einer rennt sofort — nicht weg, sondern zum Felsen am Ostrand, und schreit dabei etwas, das kein Warnruf ist.\n\nEs klingt eher wie eine Bitte.',
        knopf: 'Angreifen',
      },
    };
  },
};

export const areaEnter = {
  taverne: async (game) => {
    if (game.flag('taverne_betreten')) return;
    game.setFlag('taverne_betreten');
    await game.narration({
      kapitel: 'Zum Krummen Nagel', titel: 'Der letzte Krug',
      text: 'Zwölf Gäste, neun davon still. Der Rauch steht so tief im Raum, dass man die Balken nur ahnt.\n\nAn der Wand hängt eine Laute mit drei heilen Saiten. Auf dem zweiten Tisch liegt ein Beutel, den niemand bewacht.\n\nUnd hinter dem Tresen steht ein Mann, der euch schon dreimal angesehen hat, ohne etwas zu sagen.',
    });
  },
  waldweg: async (game) => {
    if (game.flag('waldweg_betreten')) return;
    game.setFlag('waldweg_betreten');
    await game.narration({
      kapitel: 'Der Waldweg', titel: 'Zwei Tage Kiefern',
      text: 'Der Nordweg ist schmaler als der Südweg und geht schneller bergauf. Nach einer Stunde hört der Wald auf, Geräusche zu machen.\n\nDas ist normal. Das machen Wälder, wenn etwas darin auf etwas anderes wartet.',
    });
  },
  weggabelung: async (game) => {
    if (game.flag('weggabelung_betreten')) {
      if (game.flag('rueckkehr_weggabelung')) await game.runEvent('weggabelung_rueckkehr');
      return;
    }
    game.setFlag('weggabelung_betreten');
    await game.narration({
      kapitel: 'Die Weggabelung', titel: 'Der Wegequell',
      text: 'Der Weg teilt sich an einem Steintrog, den irgendwann jemand für Reisende gesetzt hat. Er ist alt genug, dass die Inschrift nur noch eine Rille ist.\n\nEr ist bis zum Rand gefüllt. Es hat seit neun Tagen nicht geregnet.',
    });
  },
  goblinlager: async (game) => {
    if (game.flag('goblinlager_betreten')) return;
    game.setFlag('goblinlager_betreten');
    await game.narration({
      kapitel: 'Das Goblinlager', titel: 'Schlecht gemacht',
      text: 'Ein Ring aus Zelten um ein Feuer, das zu groß ist für so wenige. Keine Wachen an den Rändern — alle Blicke gehen nach innen, zum Felsen am Ostrand.\n\nSie bewachen nicht ihr Lager. Sie bewachen etwas darin.',
    });
  },
  lichtung: async (game) => {
    if (game.flag('lichtung_betreten')) return;
    game.setFlag('lichtung_betreten');
    await game.narration({
      kapitel: 'Die Lichtung', titel: 'Letzte Nacht vor Klarwasser',
      text: 'Morgen früh seid ihr da. Heute Nacht ist der Wald noch einmal still, und diesmal ist es die freundliche Stille.\n\nJemand hat Feuer gemacht. Es ist klein und raucht.',
    });
  },
};
