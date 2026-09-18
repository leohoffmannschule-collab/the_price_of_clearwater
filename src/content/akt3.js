// AKT III — DIE ASCHE DES KLAUTH
// Stufe 7–13. Eine Jagd, in der die Gruppe lange nicht weiß, dass sie das Wild ist.

import { makeMap, paintRect, TERRAIN } from '../engine/combat.js';
import { abilityCheck, savingThrow } from '../engine/rules.js';
import { roll } from '../engine/rng.js';

export const dialogues = {
  aschfeld_ueberlebende: {
    id: 'aschfeld_ueberlebende', speaker: 'Neun Menschen', start: 'a',
    nodes: {
      a: {
        narration: 'Auf dem Dorfplatz sitzen neun Menschen im Kreis um nichts, weil das Feuer noch vor drei Stunden dort war und sie es nicht schaffen, weiter wegzugehen als bis zur Stelle, wo es warm war.\n\nEine ältere Frau mit verbundenen Händen. Ein Mann, der die Namen der Toten in eine Hauswand ritzt und bei jedem dritten neu anfangen muss. Ein Kind, sieben oder acht, das nichts sagt.',
        text: '„Ihr kommt aus der falschen Richtung."\n(Die Frau sagt es ohne Vorwurf.)\n„Aus der Richtung kommt keine Hilfe. Aus der Richtung kam das hier."',
        choices: [
          { text: 'Was ist passiert?', to: 'passiert' },
          { text: '[Heilkunde] Die Verbrennungen versorgen.', tag: '◈', check: { skill: 'heilkunde', dc: 12, success: 'versorgt', fail: 'passiert' } },
          { text: 'Wie viele fehlen?', to: 'fehlen' },
        ],
      },
      passiert: {
        text: '„Sie kamen zu dritt, zu Fuß, mit Fackeln. Dragonborn. Sie haben vorher angeklopft — bei den ersten vier Häusern haben sie tatsächlich angeklopft.\n\nDanach nicht mehr, weil sie gemerkt haben, dass es schneller geht."',
        to: 'a2',
      },
      versorgt: {
        narration: 'Ihr verbindet, was zu verbinden ist. Es dauert zwei Stunden und ändert für sieben von neun etwas.',
        text: '„Danke."\n(Sie sieht euch dabei zu, wie ihr arbeitet.)\n„Ihr macht das oft. — Das ist keine schöne Sache, oft zu können."',
        flags: ['aschfeld_geholfen'],
        to: 'a2',
      },
      fehlen: {
        text: '„Einunddreißig."\n(Der Mann an der Wand hört auf zu ritzen.)\n„Ich hab vierzig angefangen und komm auf einunddreißig, und dann fang ich wieder an, weil ich mich verzähle."',
        to: 'a2',
      },
      a2: {
        narration: 'Das Kind zieht an einem Ärmel. Es hat etwas gesehen und findet keine Worte dafür.',
        text: '(Es zeigt nach oben. Es zeigt lange nach oben.)',
        flags: ['aschfeld_gesehen'],
        end: true,
      },
    },
  },

  sarrek: {
    id: 'sarrek', speaker: 'Sarrek Vohl', portrait: 'sarrek', start: 'a',
    nodes: {
      a: {
        narration: 'Ein Dragonborn steht am Speicher, in dem die Überlebenden Vorräte gelagert haben, und hält eine Fackel an den Türrahmen. Er wartet nicht, bis man ihn fragt. Er hat das schon oft erklärt und findet es selbst vernünftig.',
        text: '„Bevor Sie etwas Unüberlegtes tun: Ich handle im Auftrag. Konsortium Grauberg und Teilhaber, eingetragen in Marbruck, ordentlich beurkundet. Ich habe die Papiere hier, wenn Sie sie sehen möchten — nein, ernsthaft, ich habe sie wirklich hier.\n\nDie Rechnung ist simpel. Verbranntes Land geht für ein Achtel des Preises weg. In zwanzig Jahren steht hier wieder ein Dorf, und es gehört jemandem, der klüger war als Sie.\n\nIch mache das seit elf Monaten. Es ist kein schöner Beruf. Es ist auch kein besonders seltener."',
        choices: [
          { text: 'Die Papiere sehen wollen.', to: 'papiere' },
          { text: 'Auf die Menschen im Speicher zeigen.', to: 'speicher' },
          { text: '[Motiv erkennen] Glaubt er das selbst?', tag: '◈', check: { skill: 'motiv_erkennen', dc: 14, success: 'glaubt', fail: 'papiere' } },
          { text: 'Angreifen.', to: 'kampf' },
        ],
      },
      papiere: {
        narration: 'Er hat sie wirklich dabei. Ein gesiegelter Vertrag, ein Notariatsvermerk aus Marbruck, eine Quittung über zweihundert Goldstücke.\n\nAlles echt.',
        text: '„Sehen Sie. Kein Ungeheuer. Ein Angestellter."',
        flags: ['papiere_gesehen'],
        to: 'a2',
      },
      speicher: {
        text: '„Ja."\n(Er sieht kurz hin, dann wieder weg.)\n„Das ist der unschöne Teil. Ich habe nicht gesagt, dass es ein schöner Beruf ist."',
        to: 'a2',
      },
      glaubt: {
        narration: 'Er glaubt es vollständig. Kein Zögern, keine Schutzbehauptung — er hat sich das nicht zurechtgelegt, er hat es gelernt und wiederholt es, und zwischen den Sätzen ist nichts, wo eine Lüge Platz hätte.\n\nUnd genau deshalb stimmt an dieser Geschichte etwas nicht.',
        text: '„Sie sehen mich komisch an."',
        flags: ['sarrek_ehrlich'],
        to: 'a2',
      },
      a2: {
        text: '„Also: Gehen Sie mir aus dem Weg, oder machen wir das Andere?"',
        choices: [
          { text: 'Angreifen.', to: 'kampf' },
          { text: 'Zur Seite treten.', to: 'gehen' },
        ],
      },
      kampf: {
        text: '',
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('a1_sarrek_kampf'),
      },
      gehen: {
        narration: 'Er zündet den Speicher an, verbeugt sich knapp und geht.\n\nDrei Meter weiter dreht er sich noch einmal um und ruft euch etwas über die Schulter zu — einen einzigen Satz, der überhaupt nicht in seine Geldgeschichte passt:',
        text: '„Ihr solltet wirklich aufhören zu reisen!"',
        flags: ['sarrek_satz', 'sarrek_erledigt', 'speicher_verbrannt'],
        onEnter: (s, ctx) => ctx.game?.tickAsh('Ein Brandstifter ist entkommen.'),
        end: true,
      },
    },
  },

  a2_karte: {
    id: 'a2_karte', speaker: 'Die Karte', start: 'a',
    nodes: {
      a: {
        narration: 'Ihr breitet eine Karte des Tieflands aus und markiert, was ihr wisst: Aschfeld. Das zweite Dorf. Das dritte.',
        text: '',
        choices: [
          { text: '[Nachforschungen] Die Brandorte vergleichen.', tag: '◈', check: { skill: 'nachforschungen', dc: 15, success: 'muster', fail: 'nichts' } },
          { text: 'Den Wirt fragen, der sich erinnert.', to: 'wirt' },
        ],
      },
      muster: {
        narration: 'Alle Brandorte liegen auf einer Linie.\n\nAuf **eurer** Linie. Auf der Route, die ihr vor zwei Wochen genommen habt, in der Reihenfolge, in der ihr sie genommen habt.\n\nKeiner davor. Nicht ein einziger.',
        text: 'Jeder Ort, den ihr verlassen habt, brennt innerhalb von drei Tagen. Jeder Ort, den ihr noch nicht betreten habt, ist unversehrt.',
        flags: ['aschespur_erkannt'],
        onEnter: (s, ctx) => {
          ctx.game?.quest({ id: 'asche', neu: true, titel: 'Die Aschespur', text: 'Alle niedergebrannten Ortschaften liegen auf eurer eigenen Reiseroute. Jeder Ort, den ihr verlasst, brennt innerhalb von drei Tagen.' });
          ctx.game?.toast('Inspiration: Ihr habt die zentrale Entdeckung der ersten Hälfte gemacht.');
        },
        end: true,
      },
      nichts: {
        narration: 'Drei Punkte auf einer Karte. Es könnte ein Muster sein. Es könnte auch nur eine Straße sein.',
        text: '',
        choices: [
          { text: 'Den Wirt fragen.', to: 'wirt' },
          { text: 'Noch einmal vergleichen.', check: { skill: 'nachforschungen', dc: 15, success: 'muster', fail: 'nichts' }, tag: '◈' },
        ],
      },
      wirt: {
        text: '„Nach euch hat noch einer nach euch gefragt."\n(Er wischt nichts. Er hat keinen Lappen. Sein Gasthaus ist abgebrannt.)\n„Groß. Hat nicht gesagt, wozu."',
        choices: [{ text: 'Die Karte noch einmal ansehen.', check: { skill: 'nachforschungen', dc: 13, success: 'muster', fail: 'nichts' }, tag: '◈' }],
      },
    },
  },

  a2_kind: {
    id: 'a2_kind', speaker: 'Ein Kind', start: 'a',
    nodes: {
      a: {
        narration: 'Ein überlebendes Kind, sieben oder acht, hat etwas am Himmel gesehen und findet keine Worte. Ihr gebt ihm ein Stück Kohle und ein Blatt.',
        text: 'Es zeichnet eine Linie über das ganze Blatt, von links nach rechts, und dann noch eine darunter.\n\nDann dreht es das Blatt um und zeichnet weiter, weil es nicht draufpasst.\n\nDann dreht es das Blatt nochmal und schaut euch an und sagt:\n\n„Das Papier ist zu klein."',
        flags: ['kind_zeichnung'],
        choices: [
          { text: 'Ein größeres Blatt suchen.', to: 'groesser' },
          { text: 'Nichts sagen.', to: 'ende' },
        ],
      },
      groesser: {
        narration: 'Ihr legt vier Blätter aneinander. Es fängt von vorn an und braucht alle vier, und es ist immer noch nicht fertig.',
        text: '(Es zeigt nach oben und dann in beide Richtungen, so weit die Arme reichen.)\n„So."',
        flags: ['kind_zeichnung_gross'],
        end: true,
      },
      ende: { text: '(Es behält das Blatt. Es faltet es sehr sorgfältig zusammen.)', end: true },
    },
  },

  a3_kontor: {
    id: 'a3_kontor', speaker: 'Der Geschäftsführer', start: 'a',
    nodes: {
      a: {
        narration: 'Ein reales Handelskontor in einer realen Stadt, mit Schreibern, Siegeln und Kaufverträgen. Der Geschäftsführer ist Mitte fünfzig, trägt eine gute Jacke und weiß tatsächlich nichts.',
        text: '„Sechzehn Ländereien, ja. Alles beurkundet. Wollen Sie die Akten sehen? — Sie dürfen die Akten sehen, ich habe nichts zu verbergen, ich habe sogar ausdrücklich Weisung, jedem alles zu zeigen, der fragt."\n\n(Er hört sich selbst zu und wird langsamer.)\n\n„…was, wenn ich darüber nachdenke, eine ungewöhnliche Weisung ist."',
        choices: [
          { text: 'Wer zahlt?', to: 'zahlt' },
          { text: '[Nachforschungen] Die Zahlungen prüfen.', tag: '◈', check: { skill: 'nachforschungen', dc: 16, success: 'muenzen', fail: 'zahlt' } },
          { text: 'Was passiert mit dem Land?', to: 'land' },
        ],
      },
      zahlt: {
        text: '„Ein stiller Teilhaber. Ich habe ihn nie gesehen. Das Geld kommt pünktlich, in Truhen, immer nachts, und der Bote spricht nicht.\n\nDas ist im Handel nicht ungewöhnlich. — Das ist im Handel überhaupt nicht ungewöhnlich."',
        to: 'a2',
      },
      muenzen: {
        narration: 'Die Zahlungen kommen in alten Münzen. Prägungen, die seit dreihundert Jahren außer Umlauf sind — in einwandfreiem Zustand, als hätte jemand sie gelagert und nicht benutzt.\n\nDreihundert Jahre gelagert.',
        text: '„Die sind schwerer als unsere", sagt der Geschäftsführer hilfsbereit. „Wir wiegen sie um. Das ist für uns sogar günstig."',
        flags: ['alte_muenzen'],
        to: 'a2',
      },
      land: {
        text: '„Nichts."\n(Er blättert.)\n„Es wird nicht bewirtschaftet, nicht weiterverkauft, nicht betreten. Ich habe zweimal nachgefragt, ob wir Pächter suchen sollen.\n\nBeide Male kam die Antwort: nein. — Beide Male am selben Tag, obwohl der Bote drei Wochen brauchen müsste."',
        flags: ['land_unbenutzt'],
        to: 'a2',
      },
      a2: {
        text: '„Wollen Sie jetzt die Akten?"',
        choices: [
          { text: 'Ja. Die Akten.', exit: true },
          { text: 'Wer zahlt?', to: 'zahlt', once: true },
          { text: 'Was passiert mit dem Land?', to: 'land', once: true },
        ],
      },
    },
  },

  a4_ysera: {
    id: 'a4_ysera', speaker: 'Ysera Vohl', portrait: 'ysera', start: 'a',
    nodes: {
      a: {
        narration: 'Sie kniet neben etwas, das nicht mehr erkennbar ist, und versucht, es mit den Händen in ein Tuch zu bekommen. Es geht nicht. Es ist zu wenig da.',
        text: '„Das war mein Bruder. Er war feuerfest. Wir sind alle feuerfest, das ist der Punkt an uns, deshalb nimmt man uns für diese Arbeit.\n\nEr wollte aufhören. Er hat es letzte Woche gesagt, laut, vor den anderen.\n\nDas hier ist, was Aufhören kostet."',
        choices: [
          { text: 'Wie viele seid ihr?', to: 'sechzehn' },
          { text: 'Wer zahlt euch?', to: 'auftraggeber' },
          { text: 'Nichts sagen und beim Einsammeln helfen.', to: 'helfen' },
        ],
      },
      helfen: {
        narration: 'Ihr helft ihr. Es dauert lange und bringt nicht viel, und sie sagt die ganze Zeit nichts.\n\nAls das Tuch zugebunden ist, setzt sie sich hin und redet, ohne dass jemand fragt.',
        text: '',
        flags: ['ysera_geholfen'],
        to: 'sechzehn',
      },
      sechzehn: {
        text: '„Wir sind sechzehn. Waren.\n\nAngeworben in Hafenstädten, alle mit Vertrag, alle mit Siegel. Elf Monate lang war es ein Job wie jeder andere, nur schlechter."',
        to: 'auftraggeber',
      },
      auftraggeber: {
        text: '„Und dann kam vor vier Monaten der Auftraggeber zum ersten Mal selbst.\n\nIch habe ihn nicht gesehen. Ich habe ihn **gehört**. Und seitdem verlieren wir Leute."',
        choices: [
          { text: 'Wie heißt er?', to: 'name' },
          { text: 'Was habt ihr gehört?', to: 'name' },
        ],
      },
      name: {
        text: '„Ich kenne seinen Namen nicht. Ich kenne eine Zahl.\n\nEr hat einmal gesagt, er habe vierhundert Jahre gewartet, und ich habe gedacht, das sei so ein Spruch.\n\nEs war kein Spruch. Ich hab\'s an der Art gemerkt, wie er die Zahl gesagt hat. So sagt man Zahlen, die man **gezählt** hat."',
        flags: ['vierhundert_jahre'],
        to: 'angebot',
      },
      angebot: {
        text: '„Ich bring euch hin. Ich will nichts dafür. Ich will nur, dass jemand sieht, was da ist, und es nicht vergisst.\n\n— Ihr seid doch die, die von den Vergessenen kommen? Das hat man erzählt. Von einer Stadt, in der die Kinder weg waren."',
        choices: [
          { text: '„Ja. Das sind wir."', to: 'ja' },
          { text: '„Woher weiß man das?"', to: 'woher' },
        ],
      },
      woher: {
        text: '„Aus Klarwasser. Da reden sie jetzt darüber. Angeblich in einem fort."\n(Sie wischt sich die Hände an der Hose ab.)\n„Also: ja oder nein?"',
        choices: [{ text: '„Ja."', to: 'ja' }],
      },
      ja: {
        narration: 'Sie nickt einmal und steht auf, und ab hier geht sie voran.',
        text: '„Gut. Dann sind wir zu viert."',
        flags: ['ysera_dabei'],
        onEnter: (s, ctx) => ctx.game?.quest({ id: 'asche', text: 'Ysera Vohl führt euch zum Sammelplatz. Sie will nichts dafür.' }),
        end: true,
      },
    },
  },

  a5_krypta: {
    id: 'a5_krypta', speaker: 'Die Krypta', start: 'a',
    nodes: {
      a: {
        narration: 'Unter dem Klosterhof liegt eine Krypta, und darin liegt das Gold. Truhen, Säcke, lose Haufen — alles in Prägungen, die seit dreihundert Jahren niemand mehr ausgibt.\n\nUnd an der Wand, in Krallenschrift, ein Wort. Es steht etwa vier Meter über dem Boden.',
        text: '**KLAUTH**',
        choices: [
          { text: '[Geschichte] Den Namen kennen.', tag: '◈', check: { skill: 'geschichte', dc: 17, success: 'gewusst', fail: 'nicht_gewusst' } },
          { text: 'Ysera fragen.', to: 'ysera', if: (s) => s.flags.ysera_dabei },
          { text: 'Das Wort abschreiben und weitergehen.', to: 'abschreiben' },
        ],
      },
      gewusst: {
        narration: 'Klauth. Roter Wyrm des Silberkamms. Seit vierhundert Jahren nicht gesichtet, in keiner Chronik, in keinem Bericht, von keinem Reisenden.\n\nUnd in den alten Chroniken steht zweimal ein zweiter Name neben seinem.\n\nEinen davon kennt ihr.',
        text: '**Lolth.**',
        flags: ['klauth_erkannt'],
        onEnter: (s, ctx) => ctx.game?.quest({
          id: 'asche', titel: 'Die Asche des Klauth',
          text: 'Klauth, roter Wyrm des Silberkamms. Ghortans Urahn — und vierzig Jahre lang Lolths Geliebter. Er hat sechzehn Ortschaften angezündet, um herauszufinden, wohin ihr geht.',
        }),
        to: 'moment',
      },
      nicht_gewusst: {
        narration: 'Ein Name in Krallenschrift, vier Meter über dem Boden. Mehr könnt ihr nicht dazu sagen.\n\nAber ihr könnt lesen, wie hoch er steht.',
        text: '',
        to: 'moment',
      },
      ysera: {
        text: '„Das stand da schon, als wir zum ersten Mal hier waren."\n(Sie sieht nach oben.)\n„Ich hab gedacht, das ist der Name vom Konsortium."',
        to: 'moment',
      },
      abschreiben: { text: '(Ihr schreibt es ab. Es ist nicht viel, aber es ist das Erste, was dieser Auftraggeber von sich selbst preisgibt.)', to: 'moment' },
      moment: {
        narration: 'Und das ist der Moment, in dem ihr begreift, was ihr getan habt.\n\nNicht, was euch droht — **was ihr getan habt**.\n\nAn einem einzigen Abend, auf einem Marktplatz in einem Tal, das hier drei Tagesmärsche entfernt liegt.',
        text: '',
        flags: ['a5_krypta_erledigt', 'a6_bereit'],
        end: true,
      },
    },
  },

  a7_klauth: {
    id: 'a7_klauth', speaker: 'Klauth, der Alte Zorn', portrait: 'klauth', start: 'a',
    nodes: {
      a: {
        narration: 'Der Hort ist eine Halle, die kein Baumeister gebaut hat, und darin liegt vierhundert Jahre Gold, und darauf liegt er.\n\nVon den Krallen bis zum Kamm ist er so hoch wie eine Kirche. Er ist rot wie etwas, das von innen glüht, und er ist alt genug, dass Teile von ihm grau sind.\n\nEr hebt den Kopf nicht.',
        text: '„Ihr seid gekommen."\n(Pause.)\n„Ich hätte darauf gewettet. Ich habe niemanden, mit dem ich wetten könnte, aber ich hätte darauf gewettet."',
        choices: [
          { text: '„Sechzehn Ortschaften. Wofür?"', to: 'wofuer', once: true },
          { text: '„Wir bieten dir einen Handel an."', to: 'handel' },
          { text: 'Angreifen.', to: 'kampf' },
          { text: 'Ihm erzählen, wie Ghortan gestorben ist. Ehrlich.', to: 'ehrlich' },
        ],
      },
      wofuer: {
        text: '„Um herauszufinden, wohin ihr geht."\n(Er klingt beinahe entschuldigend.)\n„Das war unelegant, ich weiß. Aber ihr seid schwer zu verfolgen — ihr habt keinen Plan, ihr habt nur Richtungen.\n\nIch habe vierhundert Jahre lang nichts getan, weil nichts es wert war. Und dann seid ihr gekommen und habt an einem einzigen Abend alles genommen, was mir noch gehört hat."',
        to: 'a',
      },
      ehrlich: {
        narration: 'Ihr erzählt es. Alles. Die sechs Tage, das Lagerfeuer, die Witze, die nicht funktioniert haben, den Verrat, den Marktplatz, die acht Beine, die Frauenstimme.\n\nUnd ihr beschönigt nichts, und ihr lasst nichts weg.',
        text: '(Lange Stille. Dann, ohne den Kopf zu heben:)\n\n„Hat er gekämpft?"',
        choices: [
          { text: '„Ja."', to: 'ja_gekaempft' },
          { text: '„Am Ende nicht mehr."', to: 'ja_gekaempft' },
        ],
      },
      ja_gekaempft: {
        text: '„Gut."\n(Pause.)\n„— Nein, nicht gut. Ich weiß nicht, warum ich das gesagt habe."',
        choices: [
          { text: (s) => `„Sein letztes Wort war ein Name. ${s.notes.freedBy || s.party[0]?.name}."`, to: 'letztes_wort', if: (s) => !!s.flags.ghortan_erschlagen },
          { text: '[Überzeugen] „Lass die sechzehn frei und lass uns gehen."', tag: '◈', check: { skill: 'ueberzeugen', dc: 22, advantage: (s) => !!s.flags.zugegeben_toedlich, success: 'ueberzeugt', fail: 'nicht_ueberzeugt' } },
          { text: '„Ich habe den tödlichen Schlag geführt."', to: 'zugegeben' },
        ],
      },
      zugegeben: {
        narration: 'Jemand aus eurer Gruppe sagt es. Einfach so, ohne Absicherung, in einer Halle, in der etwas liegt, das eine Stadt ausatmen könnte.',
        text: '(Er hebt den Kopf. Zum ersten Mal.)\n„…Das war mutig. Oder dumm. Bei euch ist das anscheinend dasselbe."',
        flags: ['zugegeben_toedlich'],
        choices: [
          { text: '[Überzeugen] „Lass die sechzehn frei und lass uns gehen."', tag: '◈', check: { skill: 'ueberzeugen', dc: 22, advantage: () => true, success: 'ueberzeugt', fail: 'nicht_ueberzeugt' } },
          { text: (s) => `„Sein letztes Wort war ein Name. ${s.notes.freedBy || s.party[0]?.name}."`, to: 'letztes_wort', if: (s) => !!s.flags.ghortan_erschlagen },
        ],
      },
      letztes_wort: {
        narration: 'Er legt den Kopf auf die Vorderklauen, wie ein Hund, der aufgibt.',
        text: '„Er hat deinen Namen gesagt."\n\n„Vierhundert Jahre. Wisst ihr, was ich in vierhundert Jahren getan habe? Nichts. Ich habe auf Gold gelegen und gewartet, ob noch etwas kommt. Und als endlich etwas kam, war es die Nachricht, dass alles weg ist.\n\nIch bin nicht hinter euch her, weil ihr sie mir genommen habt. Ich bin hinter euch her, weil ihr das Einzige wart, was noch passiert ist."',
        flags: ['klauth_offen'],
        to: 'ueberzeugt',
      },
      ueberzeugt: {
        narration: 'Er verlangt genau eine Sache. Und es ist nicht Gold.',
        text: '„Dann erzählt mir von ihm. Alles. Die sechs Tage, die ihr mit ihm hattet, bevor er euch verraten hat. Jeden Abend am Feuer. Jeden Witz, der nicht funktioniert hat.\n\nIch habe meinen letzten Nachfahren nie getroffen. Ihr schon.\n\n— Setzt euch. Wir haben Zeit."',
        flags: ['klauth_geredet', 'klauth_erledigt'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('a7_abschluss'),
      },
      nicht_ueberzeugt: {
        text: '„Nein."\n(Er steht auf, und die Halle wird kleiner.)\n„Ihr redet gut. Das haben schon andere getan, in vierhundert Jahren, und ich habe sie ausreden lassen.\n\nAber ihr habt mir noch nichts gegeben, was ich nicht schon hatte."',
        choices: [
          { text: '„Ich habe den tödlichen Schlag geführt."', to: 'zugegeben', if: (s) => !s.flags.zugegeben_toedlich },
          { text: 'Kämpfen.', to: 'kampf' },
          { text: '„Wir holen Lolth zurück."', to: 'handel' },
        ],
      },
      handel: {
        narration: 'Ihr bietet ihm das Einzige an, was er will und nicht selbst holen kann.',
        text: '„…Wiederholt das."\n(Er ist sehr still geworden.)\n„Ihr wollt in die Schattenebene steigen und sie herausholen. Aus einer Ebene, aus der man nicht zurückredet.\n\nIhr wisst, dass das eine furchtbare Idee ist."',
        choices: [
          { text: 'Doch nicht.', to: 'a', once: true },
          { text: '„Wir wissen es."', to: 'handel_ja' },
        ],
      },
      handel_ja: {
        narration: 'Er legt sich wieder hin. Sehr langsam, wie jemand, der sich eine Entscheidung nicht anmerken lassen will.',
        text: '„Angenommen.\n\nDie sechzehn gehören mir und bleiben mir — darum müsst ihr extra verhandeln, ein andermal. Aber ihr geht heute lebend hier raus, und ich zünde nichts mehr an, solange ihr unterwegs seid.\n\nUnd wenn ihr nicht wiederkommt, dann komme ich."',
        flags: ['klauth_handel', 'klauth_erledigt'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('a7_abschluss'),
      },
      kampf: {
        text: '',
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('a7_kampf'),
      },
    },
  },
};

export const events = {
  akt3_start: async (game) => {
    const s = game.state;
    if (!s.flags.ghortan_erschlagen) {
      // Akt III ergibt keinen Sinn — ein Drache rächt keinen Nachfahren, der noch lebt.
      await game.narration({
        kapitel: 'Zwischen den Akten', titel: 'Ein Drache rächt keinen Nachfahren, der noch lebt',
        text: 'In den Bergen im Nordosten liegt seit vierhundert Jahren etwas auf einem Goldhaufen und wartet, ob noch etwas kommt.\n\nEs kommt nichts. Sein letzter Nachfahre lebt — namenlos oder gebunden, aber er lebt, und die Nachricht, die einen alten Wyrm aus vier Jahrhunderten Desinteresse gerissen hätte, wird nie geschrieben.\n\nStattdessen wird etwas anderes wichtig.',
      });
      s.act = 4;
      await game.runEvent('akt4_start');
      return;
    }
    s.act = 3;
    await game.narration({
      kapitel: 'Akt III', titel: 'Die Asche des Klauth',
      text: 'Sechs Wochen später.\n\nIhr reist. Wohin, ist eure Sache — die Welt ist groß und ihr habt Geld und niemand hält euch auf.\n\nUnd eines Nachmittags riecht ihr es eine halbe Stunde, bevor ihr es seht. Nicht Rauch — Rauch ist scharf und ehrlich. Das hier ist süßlich, fettig, und es legt sich auf den Gaumen wie ein Film.',
      knopf: 'Aus dem Wald treten',
    });
    await game.levelUp(7);
    await game.goToArea('aschfeld');
  },

  a1_drakelinge: async (game) => {
    const r = await game.startCombat('drakelinge_a1');
    if (r !== 'sieg') return;
    game.setFlag('a1_drakelinge');
    await game.narration({
      kapitel: 'Aschfeld', titel: 'Letzte Glut',
      text: 'Sie fliehen nie. Nicht einer. Und jeder, der fällt, platzt.\n\nDas ist kein Kampfverhalten. Das ist Biologie: Sie sind Zündmittel mit Beinen.\n\nAls es vorbei ist, steht am Ostrand des Platzes jemand an einem Speicher, in dem neun Menschen sitzen, und hält eine Fackel an den Türrahmen.',
    });
    await game.levelUp(8);
  },

  a1_sarrek_kampf: async (game) => {
    const r = await game.startCombat('sarrek_kampf');
    game.setFlag('sarrek_erledigt');
    if (r === 'sieg') {
      await game.narration({
        kapitel: 'Aschfeld', titel: 'Er kommt davon',
        text: 'Bei einem Viertel seiner Kraft bricht er ab, ohne Umschweife, wie jemand, der das eingerechnet hat.\n\nUnd bei der Flucht ruft er euch über die Schulter etwas zu, das überhaupt nicht in seine Geldgeschichte passt. Genau einen Satz:\n\n„Ihr solltet wirklich aufhören zu reisen!"\n\n(Er meint es als Warnung. Er weiß selbst nicht genau, warum.)',
      });
      game.setFlag('sarrek_satz');
      game.tickAsh('Ein Brandstifter ist entkommen.');
    }
  },

  a2_brutmutter: async (game) => {
    const r = await game.startCombat('brutmutter_a2');
    if (r !== 'sieg') return;
    game.setFlag('a2_brutmutter');
    const tote = 31 + 44 + 19;
    await game.narration({
      kapitel: 'Die zweite Asche', titel: 'Rechnet nach',
      text: `Stirbt die Brutmutter, verlieren die übrigen den Rudelsinn. Danach ist es Arbeit, keine Gefahr.\n\nAm Abend sitzt ihr an einem Feuer und rechnet nach, wie viele Menschen gestorben sind, seit ihr Klarwasser verlassen habt.\n\nAschfeld: einunddreißig.\nDas zweite Dorf: vierundvierzig.\nDas dritte: neunzehn.\n\n**${tote}.**\n\nNiemand sagt die Zahl laut.`,
    });
    await game.levelUp(9);
    game.tickAsh('Eine Sitzung ohne Untersuchung der Aschespur.');
  },

  a3_akten: async (game) => {
    const c = game.state.party.find((x) => x.skills.includes('nachforschungen')) || game.state.party[0];
    const erfolge = [16, 16, 16].filter(() => abilityCheck(c, 'nachforschungen', 16).success).length;
    const details = [
      '1. Die Ländereien wurden nie bewirtschaftet, nie weiterverkauft, nie betreten.',
      '2. Die Zahlungen kommen in alten Münzen — Prägungen, die seit dreihundert Jahren außer Umlauf sind.',
      '3. Alle sechzehn Grundstücke bilden auf der Karte keine Fläche, sondern **eine Linie**. Sie zeigt nach Nordosten, in den Silberkamm.',
    ];
    await game.narration({
      kapitel: 'Das Konsortium', titel: `${erfolge} von 3 auffälligen Details`,
      text: `${c.name} arbeitet sich durch sechzehn Kaufverträge.\n\n${details.slice(0, Math.max(1, erfolge)).join('\n\n')}`
        + (erfolge >= 3
          ? '\n\nUnd dann legt jemand die Karte des Konsortiums über eure eigene Reiseroute.\n\nSie sind deckungsgleich.'
          : '\n\nMehr ist aus den Akten nicht herauszuholen — jedenfalls nicht heute.'),
    });
    game.setFlag('a3_akten');
    if (erfolge >= 3) {
      game.setFlag('linie_erkannt');
      game.quest({ id: 'asche', text: 'Die sechzehn Grundstücke bilden eine Linie nach Nordosten, in den Silberkamm. Sie ist deckungsgleich mit eurer Reiseroute.' });
    }
  },

  a3_brandstifter: async (game) => {
    const r = await game.startCombat('kontor_brand');
    game.setFlag('a3_brandstifter');
    if (r === 'sieg') {
      await game.narration({
        kapitel: 'Das Konsortium', titel: 'Gerettet, was zu retten war',
        text: 'Zwei Brandstifter, fünf Runden, und in jeder Runde verbrennen Aktenbündel.\n\nWas übrig ist, reicht. Es reicht knapp, und es reicht nur, weil jemand von euch beim Löschen wichtiger war als beim Kämpfen.',
      });
      await game.levelUp(10);
    }
  },

  a5_aussenhof: async (game) => {
    const r = await game.startCombat('brutnest_hof');
    if (r !== 'sieg') return;
    game.setFlag('a5_aussenhof');
    await game.levelUp(11);
    await game.narration({
      kapitel: 'Das Brutnest', titel: 'Der Hof füllt sich mit Feuer',
      text: 'Sechzehn Drakelinge in Wellen, und jeder, der fällt, zündet den nächsten Fleck an. Am Ende steht ihr auf dem einzigen Stück Hof, das nicht brennt.\n\nAus den Ställen kommt ein Geräusch, das größer ist.',
    });
  },

  a5_staelle: async (game) => {
    const r = await game.startCombat('brutnest_staelle');
    if (r !== 'sieg') return;
    game.setFlag('a5_staelle');
    await game.levelUp(12);
    game.setFlag('a6_bereit');
  },

  a6_angriff: async (game) => {
    const s = game.state;
    s.session = 6;
    await game.narration({
      kapitel: 'A6 — Der offene Angriff', titel: 'Der Schatten',
      text: 'Es wird dunkel. Nicht langsam — auf einen Schlag, so wie wenn jemand eine Hand über eine Kerze legt.\n\nUnd es ist keine Wolke da. Der Himmel ist blau. Er ist nur an einer Stelle nicht mehr Himmel.',
    });
    await game.narration({
      kapitel: 'A6', titel: 'Der erste Atem',
      text: 'Ein Geräusch wie ein Ofen, der aufgerissen wird, und dann ist die Gerberstraße weg.\n\nNicht brennend — **weg**. Der Boden ist Glas.',
    });
    // Vier Runden: retten oder angreifen
    let gerettet = 0;
    for (let runde = 3; runde <= 6; runde++) {
      const wahl = await game.ask({
        kapitel: `A6 — Runde ${runde}`, titel: 'Angreifen oder retten?',
        text: runde === 3 ? 'Über euch kreist etwas, das so groß ist, dass man es für Wetter halten könnte. Unter euch brennt eine Straße.'
          : gerettet > 0 ? `Bisher habt ihr ${gerettet} Menschen herausgeholt. Es sind noch welche drin.`
            : 'Noch niemand ist draußen.',
        optionen: [
          { text: 'Retten. So viele wie möglich.', wert: 'retten' },
          { text: 'Angreifen. Irgendetwas muss man tun.', wert: 'angreifen' },
        ],
      });
      if (wahl === 'retten') {
        const c = game.state.party[runde % game.state.party.length];
        const p = abilityCheck(c, 'athletik', 14);
        const n = p.success ? roll('1W6+2').total : roll('1W4').total;
        gerettet += n;
        await game.narration({ kapitel: `Runde ${runde}`, titel: `${n} Menschen`, text: `${c.name} holt ${n} Menschen aus dem, was gerade noch ein Haus war.` });
      } else {
        await game.narration({
          kapitel: `Runde ${runde}`, titel: 'Wie wenig es ändert',
          text: 'Ihr trefft. Ihr trefft sogar mehrfach, und zwei von euch treffen gut.\n\nEs ändert nichts. Es ändert so wenig, dass er es nicht einmal bemerkt.',
        });
      }
    }
    game.state.counters.gerettete = gerettet;
    await game.narration({
      kapitel: 'A6 — Runde 7', titel: 'Er setzt sich hin',
      text: 'Er landet auf dem Kornspeicher, und der Speicher hält es nicht aus, und das scheint ihn nicht zu interessieren.\n\nVon den Krallen bis zum Kamm ist er so hoch wie die Kirche. Er ist rot wie etwas, das von innen glüht, und er ist alt genug, dass Teile von ihm grau sind.\n\nEr faltet die Flügel. Er sieht euch an. Und dann tut er etwas, womit niemand gerechnet hat:\n\nEr setzt sich hin.',
    });
    await game.narration({
      kapitel: 'A6', titel: 'Kommt, oder kommt nicht',
      text: '„Ihr wart es also. Kleiner, als ich dachte."\n\n„Nein — steht ruhig. Ich bin nicht hier, um das zu beenden. Ich hätte das von oben erledigen können, vor zwei Wochen, während ihr geschlafen habt. Ich wollte euch erst ansehen.\n\nIhr habt an einem einzigen Abend meinen letzten Nachfahren erschlagen und die einzige Person, mit der ich je geredet habe, in eine Ebene gestoßen, aus der man nicht zurückredet. In vierhundert Jahren hat mich nichts so interessiert wie ihr.\n\nIch habe sechzehn Ortschaften angezündet, um herauszufinden, wohin ihr geht. Das war unelegant, aber ihr seid schwer zu verfolgen — ihr habt keinen Plan, ihr habt nur Richtungen.\n\nAlso mache ich es euch einfach. Ich bin im Silberkamm. Über dem Tal, aus dem ihr gekommen seid.\n\nKommt, oder kommt nicht. Wenn ihr nicht kommt, brenne ich weiter, und irgendwann seid ihr wieder in der Nähe. Ich habe Zeit. Ich habe nichts als Zeit, und genau das ist das Problem."',
    });
    await game.narration({
      kapitel: 'A6 — Danach', titel: 'Löschen und zählen',
      text: `Der Rest des Tages ist Löschen und Zählen.\n\nIhr habt **${gerettet}** Menschen aus der brennenden Straße geholt.\n\n[[Merkt euch die Zahl. In seinem Hort stehen genau so viele als Freiwillige bereit, wenn ihr Hilfe braucht.]]`,
    });
    game.setFlag('a6_erledigt');
    game.setFlag('a6_bereit');
    await game.goToArea('hort');
  },

  a7_kampf: async (game) => {
    const r = await game.startCombat('klauth_hort');
    if (r !== 'sieg') {
      await game.narration({
        kapitel: 'Der Hort', titel: 'Vierhundert Jahre',
        text: 'Er tötet euch nicht sofort. Er sieht euch beim Sterben zu und ist dabei aufmerksam, wie jemand, der ein Buch zu Ende liest, das er nicht mochte.\n\nDanach legt er sich wieder hin.',
      });
      await game.ending('akt3_hort');
      return;
    }
    game.setFlag('klauth_getoetet');
    game.setFlag('klauth_erledigt');
    await game.narration({
      kapitel: 'Der Hort', titel: 'Er fällt langsam',
      text: 'Er fällt langsam, weil alles an ihm groß ist, und als er liegt, dauert es noch eine Weile, bis er aufhört zu atmen.\n\nZum Schluss sagt er etwas, das an niemanden gerichtet ist:\n\n„Endlich."',
    });
    await game.runEvent('a7_abschluss');
  },

  a7_abschluss: async (game) => {
    const s = game.state;
    await game.levelUp(13);
    if (s.flags.klauth_getoetet) {
      await game.narration({
        kapitel: 'Epilog Akt III', titel: 'Der schwarze Kiesel',
        text: 'In seinem Hort liegt, unter vierhundert Jahren Gold, ein einzelner schwarzer Kiesel.\n\nEr wiegt genau so viel wie ein Rotkehlchen.',
      });
      game.item({ id: 'schwarzer_kiesel', name: 'Ein schwarzer Kiesel', desc: 'Er wiegt genau so viel wie ein Rotkehlchen. Sowas findet man nicht einfach so.' });
      game.setFlag('kiesel');
    }
    await game.narration({
      kapitel: 'Epilog Akt III', titel: 'Zwei Zahlen',
      text: `Sechzehn Orte sind niedergebrannt.\n\nIhr habt in der brennenden Straße **${s.counters.gerettete}** Menschen herausgeholt.\n\nSeit Aschfeld sind **vierundneunzig** gestorben.\n\nDie beiden Zahlen stehen nebeneinander. Es gibt nichts dazu zu sagen.`,
    });
    await game.ending('akt3_ende');
    if (s.flags.klauth_handel) {
      s.act = 4;
      await game.runEvent('akt4_start');
    } else {
      const weiter = await game.ask({
        kapitel: 'Danach', titel: 'Und jetzt?',
        text: Object.keys(s.notes.sacrificedNames || {}).length
          ? 'Es gibt noch etwas Offenes. An einer Steintür unter Klarwasser hat jemand von euch einen Namen gegeben, und dieser Name ist nicht verschwunden — er ist irgendwo.\n\nUnd es gibt genau einen Ort, an dem etwas landet, das niemand mehr hält.'
          : 'Es gibt noch etwas Offenes. Eine Göttin liegt in einer Ebene, aus der man nicht zurückredet, und ihr habt sie dorthin gestoßen.',
        optionen: [
          { text: 'Hinabsteigen. Aus eigenem Antrieb.', wert: true },
          { text: 'Nein. Hier ist Schluss.', wert: false, abschluss: true },
        ],
      });
      if (weiter) {
        s.act = 4;
        await game.runEvent('akt4_start');
      } else {
        await game.ending('kampagne_ende_hier');
      }
    }
  },

  schwarzer_kiesel: async (game) => {
    if (game.hat('schwarzer_kiesel')) { game.toast('Ihr habt ihn bereits.'); return; }
    game.item({ id: 'schwarzer_kiesel', name: 'Ein schwarzer Kiesel', desc: 'Er wiegt genau so viel wie ein Rotkehlchen.' });
    game.setFlag('kiesel');
    await game.narration({
      kapitel: 'Klauths Hort', titel: 'Unter vierhundert Jahren Gold',
      text: 'Ein einzelner schwarzer Kiesel, glatt, mit einem helleren Band.\n\nEr wiegt genau so viel wie ein Rotkehlchen. Sowas findet man nicht einfach so.',
    });
  },
};

export const combats = {
  drakelinge_a1: () => {
    const map = makeMap(26, 14);
    paintRect(map, 6, 3, 8, 5, TERRAIN.GEBAEUDE);
    paintRect(map, 16, 8, 19, 10, TERRAIN.GEBAEUDE);
    paintRect(map, 11, 6, 14, 7, TERRAIN.SCHWIERIG);
    return {
      title: 'Das Drakeling-Rudel',
      map,
      playerStart: [{ x: 3, y: 7 }, { x: 3, y: 8 }, { x: 2, y: 7 }],
      enemies: Array.from({ length: 8 }, (_, i) => ({
        id: 'drakeling', x: 15 + (i % 4) * 2, y: 4 + Math.floor(i / 4) * 5,
      })),
      intro: {
        kapitel: 'Aschfeld', titel: 'Zwischen den Balken',
        text: 'Zwischen den Balken bewegt sich etwas. Hüfthoch, vier Beine, ein Kamm aus schwarzen Schuppen — und es zieht einen Faden Rauch hinter sich her wie eine Schnecke ihre Spur.\n\nDann steht das nächste auf. Und das nächste.\n\nEs sind viele, und sie haben keine Angst vor euch, weil Angst etwas ist, das man lernen muss.\n\n[[Letzte Glut: Jeder Drakeling platzt bei 0 TP. Nahkämpfer lernen das in der ersten Runde. Das ist Absicht.]]',
        knopf: 'Kämpfen',
      },
    };
  },

  sarrek_kampf: () => {
    const map = makeMap(22, 12);
    paintRect(map, 14, 3, 18, 6, TERRAIN.GEBAEUDE);
    return {
      title: 'Sarrek Vohl',
      map,
      playerStart: [{ x: 4, y: 6 }, { x: 4, y: 7 }, { x: 3, y: 6 }],
      enemies: [{ id: 'brandstifter', x: 13, y: 7, overrides: { name: 'Sarrek Vohl' } }, { id: 'drakeling', x: 12, y: 4 }],
      intro: {
        kapitel: 'Aschfeld', titel: 'Geschäftsmäßig',
        text: 'Er stellt die Fackel ab — sorgfältig, damit sie nicht umfällt — und zieht dann erst die Waffe.\n\n[[Er kämpft, bis er auf ein Viertel fällt, dann flieht er.]]',
        knopf: 'Angreifen',
      },
    };
  },

  brutmutter_a2: () => {
    const map = makeMap(28, 14);
    paintRect(map, 8, 3, 10, 5, TERRAIN.GEBAEUDE);
    paintRect(map, 18, 8, 21, 10, TERRAIN.GEBAEUDE);
    return {
      title: 'Die Brutmutter',
      map,
      playerStart: [{ x: 3, y: 7 }, { x: 3, y: 8 }, { x: 2, y: 7 }],
      enemies: [
        { id: 'brutmutter', x: 22, y: 7 },
        ...Array.from({ length: 6 }, (_, i) => ({ id: 'drakeling', x: 16 + (i % 3) * 2, y: 4 + (i % 2) * 6 })),
      ],
      minionLimit: 5,
      intro: {
        kapitel: 'Die zweite Asche', titel: 'Etwas hält sie zusammen',
        text: 'Zwölf Drakelinge in zwei Wellen — und etwas, das größer ist und ruhig bleibt und sie in Formation hält.\n\n[[Stirbt die Brutmutter, verlieren die übrigen den Rudelsinn.]]',
        knopf: 'Kämpfen',
      },
    };
  },

  kontor_brand: () => {
    const map = makeMap(22, 12);
    paintRect(map, 4, 2, 6, 3, TERRAIN.DECKUNG);
    paintRect(map, 12, 2, 14, 3, TERRAIN.DECKUNG);
    paintRect(map, 4, 7, 6, 8, TERRAIN.DECKUNG);
    paintRect(map, 12, 7, 14, 8, TERRAIN.DECKUNG);
    return {
      title: 'Zeitdruck im Kontor',
      map,
      playerStart: [{ x: 10, y: 9 }, { x: 11, y: 9 }, { x: 9, y: 9 }],
      enemies: [{ id: 'brandstifter', x: 6, y: 4 }, { id: 'brandstifter', x: 16, y: 5 }],
      scenario: {
        onRoundStart: (combat, runde) => {
          const verbrannt = roll('1W4').total;
          combat.flags.akten = (combat.flags.akten || 0) + verbrannt;
          combat.logLine('umgebung', `${verbrannt} Aktenbündel verbrennen. (${combat.flags.akten} insgesamt)`);
          if (runde >= 5) {
            combat.logLine('umgebung', 'Es ist alles weg. Was ihr jetzt noch wisst, wisst ihr aus dem Kopf.');
            combat.state.flags.akten_verbrannt = true;
          }
        },
      },
      intro: {
        kapitel: 'Das Konsortium', titel: 'Fünf Runden',
        text: 'Zwei Dragonborn versuchen, das Kontor anzuzünden, bevor ihr die Unterlagen sichert.\n\n[[Jede Runde verbrennen 1W4 Aktenbündel. Nach fünf Runden ist alles weg.]]',
        knopf: 'Löschen und kämpfen',
      },
    };
  },

  brutnest_hof: (game) => {
    const map = makeMap(26, 14);
    paintRect(map, 4, 3, 7, 5, TERRAIN.GEBAEUDE);
    paintRect(map, 18, 8, 21, 10, TERRAIN.GEBAEUDE);
    return {
      title: 'Der Außenhof',
      map,
      playerStart: [{ x: 12, y: 12 }, { x: 13, y: 12 }, { x: 11, y: 12 }],
      enemies: Array.from({ length: 10 }, (_, i) => ({
        id: 'drakeling', x: 5 + (i % 5) * 4, y: 3 + Math.floor(i / 5) * 4,
      })),
      allies: game.state.flags.ysera_dabei ? [{ id: 'brandstifter', x: 14, y: 12, overrides: { name: 'Ysera Vohl', tint: '#a88858' } }] : [],
      scenario: {
        onDeath: (combat, target) => {
          if (target.ref.id !== 'drakeling') return;
          const i = target.y * combat.map.w + target.x;
          if (combat.map.tiles[i] === TERRAIN.FREI) combat.map.tiles[i] = TERRAIN.SCHWIERIG;
        },
      },
      intro: {
        kapitel: 'Das Brutnest', titel: 'Der Hof füllt sich mit Feuer',
        text: 'Sechzehn Drakelinge, in Wellen, in einem ausgebrannten Klosterhof.\n\n[[Jeder, der fällt, macht das Feld unter sich zu Feuer. Der Hof wird enger, je länger ihr kämpft.]]',
        knopf: 'Hinein',
      },
    };
  },

  brutnest_staelle: (game) => {
    const map = makeMap(22, 12);
    paintRect(map, 8, 2, 10, 3, TERRAIN.GEBAEUDE);
    paintRect(map, 8, 8, 10, 9, TERRAIN.GEBAEUDE);
    return {
      title: 'Die Ställe',
      map,
      playerStart: [{ x: 3, y: 5 }, { x: 3, y: 6 }, { x: 2, y: 5 }],
      enemies: [
        { id: 'brutmutter', x: 17, y: 5, overrides: { hp: 130, maxHp: 130, name: 'Die Brutmutter' } },
        { id: 'brandstifter', x: 14, y: 3 }, { id: 'brandstifter', x: 14, y: 8 },
      ],
      allies: game.state.flags.ysera_dabei ? [{ id: 'brandstifter', x: 4, y: 7, overrides: { name: 'Ysera Vohl', tint: '#a88858' } }] : [],
      minionLimit: 4,
      intro: {
        kapitel: 'Das Brutnest', titel: 'Deutlich stärker als in der Asche',
        text: 'Sie ist gewachsen. Oder es ist eine andere, und dann gibt es mehr als eine.\n\nZwei Brandstifter stehen als Wächter davor, und sie zeigen keine Papiere.',
        knopf: 'Angreifen',
      },
    };
  },

  klauth_hort: (game) => {
    const map = makeMap(34, 16);
    paintRect(map, 5, 3, 9, 5, TERRAIN.SCHWIERIG);
    paintRect(map, 24, 3, 28, 5, TERRAIN.SCHWIERIG);
    paintRect(map, 5, 10, 9, 12, TERRAIN.SCHWIERIG);
    paintRect(map, 24, 10, 28, 12, TERRAIN.SCHWIERIG);
    const helfer = [];
    if (game.state.flags.ysera_dabei) {
      helfer.push({ id: 'brandstifter', x: 4, y: 9, overrides: { name: 'Ysera Vohl', tint: '#a88858' } });
      if (game.state.flags.aschenbund) {
        for (let i = 0; i < 3; i++) helfer.push({ id: 'brandstifter', x: 3 + i, y: 10, overrides: { name: `Aschenbund ${i + 1}`, hp: 40, maxHp: 40 } });
      }
    }
    return {
      title: 'Klauth, der Alte Zorn',
      area: 'hort',
      map,
      playerStart: [{ x: 3, y: 7 }, { x: 3, y: 8 }, { x: 2, y: 7 }],
      enemies: [{ id: 'klauth', x: 26, y: 8 }],
      allies: helfer,
      scenario: {
        onRoundStart: (combat, runde) => {
          if (runde === 1 && !combat.flags.schrecken) {
            combat.flags.schrecken = true;
            combat.logLine('gegner', 'Schreckliche Gegenwart: Alle in 36 m — WEI-RW SG 19 oder verängstigt.');
            for (const c of combat.combatants.filter((x) => x.side !== 'feind')) {
              const rw = savingThrow(c.ref, 'we', 19);
              if (!rw.success) {
                c.ref.conditions.push({ id: 'verangstigt', rounds: 3, saveEnds: 'we', dc: 19 });
                combat.logLine('zustand', `${c.name} ist verängstigt.`);
              }
            }
          }
          if (runde === 4 && combat.state.counters.gerettete > 0 && !combat.flags.freiwillige) {
            combat.flags.freiwillige = true;
            combat.logLine('held', `${combat.state.counters.gerettete} Freiwillige aus der brennenden Straße stehen am Eingang. Sie haben keine Rüstung. Sie sind trotzdem gekommen.`);
            for (const c of combat.combatants.filter((x) => x.side === 'held')) {
              c.ref.tempHp = Math.max(c.ref.tempHp || 0, Math.min(30, combat.state.counters.gerettete * 2));
            }
          }
        },
      },
      intro: {
        kapitel: 'A7 — Der Hort', titel: 'Er steht auf',
        text: 'Er steht auf, und die Halle wird kleiner.\n\n[[350 Trefferpunkte, legendäre Aktionen, Feueratem. Mit Yseras Hilfe und den Freiwilligen aus der brennenden Straße ist er schaffbar — aber knapp.]]',
        knopf: 'Kämpfen',
      },
    };
  },
};

export const endings = {
  akt3_hort: {
    kapitel: 'Akt III — Niederlage', titel: 'Endlich etwas',
    text: 'Vierhundert Jahre lang ist nichts passiert.\n\nDann seid ihr gekommen, und es ist etwas passiert, und jetzt ist es vorbei, und er legt sich wieder hin und wartet, ob noch etwas kommt.\n\nEs wird nichts mehr kommen. Das ist die eigentliche Strafe, und sie trifft ihn, nicht euch.',
    frage: 'Wer erzählt es Ysera?',
  },
  akt3_ende: {
    kapitel: 'Akt III — Ende', titel: 'Die Asche des Klauth',
    text: 'Sechzehn Orte werden wieder aufgebaut. Das Konsortium zahlt weiter — jetzt für Ziegel statt für Fackeln, weil niemand die Zahlungen gestoppt hat und niemand mehr da ist, der sie stoppen könnte.\n\nYsera Vohl hat ihren Bruder nicht beerdigen können. Sie hat inzwischen etwas gefunden, das sie begraben kann: seinen Vertrag, gesiegelt, mit seinem Namen darauf.\n\nSie hat ihn in Aschfeld eingegraben, zwischen einunddreißig anderen.',
    frage: 'Und die Zahl, die ihr nicht laut gesagt habt?',
  },
  kampagne_ende_hier: {
    kapitel: 'Ende', titel: 'Hier ist Schluss',
    text: 'Man kann aufhören. Die meisten Gruppen tun das nicht, und das ist nicht immer eine Tugend.\n\nWas offen bleibt, bleibt offen: ein Name an einer Steintür, eine Göttin in einer Vorratskammer, und ein weißer Stab mit elf Runen, den ab jetzt eine ganze Reihe Leute suchen werden.\n\nNekromanten. Liche. Sarines Orden.\n\nUnd am Ende eine, die seit Äonen genau so ein Gefäß braucht.',
    frage: 'Wie hieß das Mädchen?',
  },
};

export const areaEnter = {
  aschfeld: async (game) => {
    if (game.flag('aschfeld_betreten')) return;
    game.setFlag('aschfeld_betreten');
    await game.narration({
      kapitel: 'A1 — Aschfeld', titel: 'Vierzig Häuser, davon stehen noch vier',
      text: 'Der Weg kommt aus dem Wald, und da unten liegt, was gestern noch Aschfeld war. Vierzig Häuser, davon stehen noch vier.\n\nDer Kirchturm steht auch, aber ohne Glocke — die ist geschmolzen und liegt als silbriger Fladen im Chorraum.\n\nAuf dem Dorfplatz sitzen neun Menschen im Kreis um nichts, weil das Feuer noch vor drei Stunden dort war und sie es nicht schaffen, weiter wegzugehen als bis zur Stelle, wo es warm war.',
      knopf: 'Hinuntergehen',
    });
    game.setFlag('aschfeld_gesehen');
  },
  aschespur: async (game) => {
    if (game.flag('aschespur_betreten')) return;
    game.setFlag('aschespur_betreten');
    game.tickAsh('Ihr habt eine Ortschaft verlassen, in der ihr übernachtet habt.');
    await game.narration({
      kapitel: 'A2 — Die zweite Asche', titel: 'Auf eurer Route',
      text: 'Die zweite niedergebrannte Ortschaft liegt auf der Route, die ihr vor zwei Wochen genommen habt.\n\nDie dritte auch.',
    });
  },
  brutnest: async (game) => {
    if (game.flag('brutnest_betreten')) return;
    game.setFlag('brutnest_betreten');
    await game.narration({
      kapitel: 'A5 — Das Brutnest', titel: 'Werkzeuge',
      text: 'Der Sammelplatz ist ein ausgebrannter Klosterhof. Hier werden die Drakelinge gezüchtet.\n\nSie sind keine Kreaturen des Drachen, sondern seine **Werkzeuge**: kleine, dumme, brennbare Boten, die eine Landkarte in Feuer schreiben.',
    });
  },
  hort: async (game) => {
    if (game.flag('hort_betreten')) return;
    game.setFlag('hort_betreten');
    if (!game.flag('a6_erledigt')) { await game.runEvent('a6_angriff'); return; }
    await game.narration({
      kapitel: 'A7 — Der Hort', titel: 'Von oben',
      text: 'Klauths Hort liegt im Silberkamm — drei Tagesmärsche über dem Tal, in dem Klarwasser liegt.\n\nAuf dem letzten Stück seht ihr die Stadt von oben. Sie ist winzig und steht noch.\n\nDann geht ihr hinein.',
    });
  },
};
