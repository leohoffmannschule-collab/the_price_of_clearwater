// AKT IV — DAS BUCH UND DIE FEDER
// Stufe 13–20. Die Gruppe tut hier von Anfang an das Falsche,
// und die Kampagne behauptet nie etwas anderes.

import { makeMap, paintRect, TERRAIN } from '../engine/combat.js';
import { abilityCheck } from '../engine/rules.js';
import { inputModal } from '../ui/panels.js';
import { pick } from '../engine/rng.js';

/** Vergessensgrade — funktioniert wie Erschöpfung, mit eigener Leiter. */
export const VERGESSEN = [
  null,
  'Du vergisst ein Gesicht aus deiner Vergangenheit. Nachteil auf Einsicht.',
  'Du vergisst einen Ort. −1 auf alle Rettungswürfe.',
  'Du vergisst eine Fertigkeit. Streiche eine Übung.',
  'Du vergisst, wie du etwas kannst. Verliere ein Klassenmerkmal.',
  'Du vergisst dein eigenes Gesicht. Trefferpunktemaximum halbiert.',
  'Du vergisst deinen Namen. Der Charakter wird ein Vergessener im Dienst der Rabenkönigin.',
];

export function vergessenSteigern(game, c, grade = 1) {
  c.forgetting = Math.min(6, (c.forgetting || 0) + grade);
  game.toast(`${c.name}: Vergessensgrad ${c.forgetting} — ${VERGESSEN[c.forgetting]}`);
  if (c.forgetting >= 2) c.saveBonus = { ...(c.saveBonus || {}), st: -1, ge: -1, ko: -1, in: -1, we: -1, ch: -1 };
  if (c.forgetting >= 5) c.maxHp = Math.max(1, Math.floor(c.maxHp / 2));
  if (c.forgetting >= 6) {
    c.dead = true;
    game.toast(`${c.name} vergisst den eigenen Namen und geht.`);
  }
  return c.forgetting;
}

export const dialogues = {
  l1_ysmereth: {
    id: 'l1_ysmereth', speaker: 'Ysmereth', portrait: 'ysmereth', start: 'a',
    nodes: {
      a: {
        narration: (s) => (s.flags.bindung_gebrochen
          ? 'Ihr steht vor einer Quelle, die aus schwarzem Fels tritt, und sprecht hinein. Es dauert drei Tage, bis geantwortet wird, und dann steht er neben euch, als wäre er die ganze Zeit dort gewesen.'
          : 'Ihr steigt noch einmal hinab zu dem, den ihr zurück in den Stein geschickt habt. Er sitzt, wo er seit zweihundert Jahren sitzt, und er hat kein Glas Wasser mehr vor sich stehen.'),
        text: (s) => (s.flags.bindung_gebrochen
          ? '„Ihr kommt also doch noch einmal zu mir. Gut. Ich mag es, wenn Dinge rund werden."'
          : '„Natürlich helfe ich euch. Ich helfe jedem, der hinabsteigt."\n(Pause.)\n„— Nein, kein Groll. Ihr habt getan, was die Gründer taten, und ihr habt es aus denselben Gründen getan."'),
        choices: [
          { text: '„Was ist da unten?"', to: 'unten', once: true },
          { text: '„Was kostet es?"', to: 'preis', once: true },
          { text: '„Bring uns hinunter."', to: 'hinunter' },
        ],
      },
      unten: {
        text: '„Eine Herrin, die nimmt, was niemand mehr hält."\n(Pause.)\n„Ich habe zweihundert Jahre in einem Loch gesessen und mich an jeden einzelnen Tag erinnert, Ihr Herrschaften. **Jeden.**\n\nEs gibt Schlimmeres als ein Loch."',
        flags: ['l1_gewarnt'],
        to: 'a',
      },
      preis: {
        text: (s) => (s.flags.bindung_gebrochen
          ? '„Ich verlange nichts."\n(Pause.)\n„— Nein, wirklich nichts, und ich weiß, dass euch das mehr beunruhigt als ein Preis. Setzt euch damit auseinander."'
          : '„Mein Preis ist klein: Wenn ihr zurückkommt, sagt mir, wie es dort unten aussieht.\n\nIch werde nie hinkommen. Ich möchte es trotzdem wissen."'),
        flags: ['l1_preis'],
        to: 'a',
      },
      hinunter: {
        narration: 'Er legt die Hand auf das Wasser, und das Wasser hört auf, Wasser zu sein.',
        text: '„Geht hinein. Und, Ihr Herrschaften — beim Durchschreiten löst sich etwas von euch ab und bleibt zurück.\n\nDas ist die Eintrittsgebühr. Sie wird nicht verhandelt."',
        flags: ['l1_tor_offen'],
        end: true,
      },
    },
  },

  l2_vergessener: {
    id: 'l2_vergessener', speaker: 'Jemand', portrait: 'vergessener', start: 'a',
    nodes: {
      a: {
        narration: 'Aus der Entfernung sieht es aus wie ein Mensch. Aus der Nähe auch. Es besteht aus einer einzigen Eigenschaft, weil alles andere gefressen wurde.',
        text: '„Oh! Hallo. Ich backe sehr gutes Brot."',
        choices: [
          { text: '„Wie heißt du?"', to: 'name', once: true },
          { text: '„Wo kommst du her?"', to: 'her', once: true },
          { text: '„Was ist mit dir passiert?"', to: 'passiert', once: true },
          { text: 'Weitergehen.', exit: true },
        ],
      },
      name: { text: '„Ich backe sehr gutes Brot. Mit Kümmel."', to: 'a' },
      her: { text: '(Pause. Er sieht ehrlich nach.)\n\n„Mit Kümmel."', to: 'a' },
      passiert: {
        narration: 'Er versteht die Frage nicht. Es ist nicht so, dass er ausweicht — es ist, als hättet ihr eine Farbe gefragt, die es nicht gibt.',
        text: '„Soll ich welches backen? Ich kann welches backen."\n(Er hat keinen Ofen. Er hat kein Mehl. Er hat seit sehr langer Zeit keine Hände, mit denen man kneten könnte, ohne dass es auffällt.)',
        flags: ['l2_vergessener_gesehen'],
        to: 'a',
      },
    },
  },

  l2_schlund: {
    id: 'l2_schlund', speaker: 'Ein Erinnerungsschlund', start: 'a',
    nodes: {
      a: {
        narration: 'Ein Trichter in der Asche, vier Schritt weit. Von unten steigt etwas auf, das kein Geruch sein dürfte, weil hier nichts riecht: nasser Stein und heißes Fett und Äpfel.\n\nUnd darunter, sehr weit unten, ruft jemand einen Namen. Nicht euren. Den von jemandem, der euch gehört.',
        text: '',
        choices: [
          { text: 'Hineinsteigen.', to: 'hinein', hinweis: '+1 Vergessensgrad' },
          { text: 'Nur hineinsehen.', to: 'sehen' },
          { text: 'Weitergehen.', exit: true },
        ],
      },
      sehen: {
        narration: 'Ihr seht hinein und hört jemanden, den ihr verloren habt. Es ist eindeutig die Stimme. Es ist eindeutig der Tonfall.\n\nDann hört es auf.',
        text: '',
        choices: [
          { text: 'Doch hineinsteigen.', to: 'hinein' },
          { text: 'Weitergehen.', exit: true },
        ],
      },
      hinein: {
        text: '',
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('l2_schlund_betreten'),
      },
    },
  },

  l2_rabe: {
    id: 'l2_rabe', speaker: 'Ein Rabe', start: 'a',
    nodes: {
      a: {
        narration: 'Ein einzelner Rabe landet drei Schritte vor euch, sieht euch der Reihe nach an — wirklich der Reihe nach, einen nach dem anderen — und spricht dann mit der Stimme von jemandem, den ihr in Klarwasser verloren habt.',
        text: '„Ihr kommt wegen der Spinne.\n\nIch sage euch gleich, was ihr vorfinden werdet, damit ihr euch die Enttäuschung einteilen könnt: Sie ist klein. Sie passt in ein Glas. Von dem, was ihr in Klarwasser gefürchtet habt, ist ungefähr so viel übrig wie von einem Brief, den man verbrannt hat.\n\nIhr könnt trotzdem weiterkommen. Ich halte niemanden auf. — Ich warte nur. Das ist mein ganzes Amt: Ich warte, bis niemand mehr hinsieht.\n\nBei euch wird das nicht lange dauern. Ihr habt schon angefangen zu vergessen."',
        choices: [
          { text: '„Wir haben nichts vergessen."', to: 'probe' },
          { text: 'Nichts sagen.', to: 'probe' },
        ],
      },
      probe: {
        text: '„Fragt euch gegenseitig nach dem Namen des Mädchens."',
        choices: [
          { text: '„Miri. Miri Grast."', to: 'gewusst', if: (s) => !!s.flags.miri_name_behalten },
          { text: '„…"', to: 'nicht_gewusst' },
        ],
      },
      gewusst: {
        text: '„Noch."\n\n(Er fliegt nicht weg. Er geht. Raben gehen selten.)',
        flags: ['l2_rabe'],
        end: true,
      },
      nicht_gewusst: {
        narration: 'Niemand weiß es. Drei erwachsene Menschen, die in einer Stadt waren, in der ein Kind verschwunden ist, und keiner von ihnen kann den Namen sagen.',
        text: '„Seht ihr."\n\n(Er fliegt nicht weg. Er geht.)',
        flags: ['l2_rabe'],
        end: true,
      },
    },
  },

  l3_ordnung: {
    id: 'l3_ordnung', speaker: 'Die Bibliothek', start: 'a',
    nodes: {
      a: {
        narration: 'Regale bis dorthin, wo Höhe aufhört. Und in jedem Fach ein Wort — nicht geschrieben, sondern aufbewahrt, so wie man einen Ton aufbewahren würde, wenn man könnte.\n\nÜber den Gängen hängen Schilder, aber sie tragen keine Buchstaben und keine Zahlen. Das erste, an dem ihr vorbeikommt, bedeutet **Erleichtert**. Das zweite bedeutet **Trotzig**. Das dritte bedeutet **Mitten im Satz**, und in diesem Gang stehen sehr, sehr viele Fächer.',
        text: '',
        choices: [
          { text: '[Nachforschungen] Die Ordnung begreifen.', tag: '◈', check: { skill: 'nachforschungen', dc: 20, success: 'verstanden', fail: 'nicht' } },
          { text: 'Sie ist nicht alphabetisch. Sie ist nach Tonfall geordnet.', to: 'verstanden' },
          { text: 'Einfach suchen.', to: 'nicht' },
        ],
      },
      verstanden: {
        narration: 'Nicht alphabetisch. Nicht nach Namen, nicht nach Zeit, nicht nach Ort.\n\nNach dem **Ton**, in dem es gesagt wurde.\n\nUnd damit stellt sich die eigentliche Frage: In welchem Ton sagt eine Göttin ihr letztes Wort?',
        text: '',
        flags: ['l3_ordnung_verstanden'],
        choices: [
          { text: '„Trotzig."', to: 'falsch' },
          { text: '„Ungläubig."', to: 'richtig' },
          { text: '„Zu jemandem, der nicht da ist."', to: 'falsch' },
          { text: '„Sehr leise."', to: 'falsch' },
        ],
      },
      nicht: {
        narration: 'Ihr sucht drei Stunden in einer Bibliothek, in der es kein Register gibt, und findet nichts, und danach seid ihr müder, als ihr sein solltet.',
        text: '',
        choices: [
          { text: 'Noch einmal versuchen.', check: { skill: 'nachforschungen', dc: 18, success: 'verstanden', fail: 'nicht' }, tag: '◈' },
          { text: 'Aufgeben und weitergehen.', exit: true },
        ],
      },
      richtig: {
        narration: 'Der Gang mit dem Schild, das **Ungläubig** bedeutet, ist lang und schmal und sehr voll.\n\nUnd am Ende steht ein Regal, das anders ist als die anderen: verschlossen, ohne Schloss.',
        text: '',
        flags: ['l3_regal_gefunden', 'l3_ordnung_verstanden'],
        onEnter: (s, ctx) => ctx.game?.quest({ id: 'feder', neu: true, titel: 'Das Buch und die Feder', text: 'Lolths letztes Wort liegt im Gang „Ungläubig". Das Regal öffnet sich nur für jemanden, der ein eigenes letztes Wort hinterlegt.' }),
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('l3_letztes_wort'),
      },
      falsch: {
        narration: 'Falsches Regal. Es kostet.',
        text: '',
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('l3_falsches_regal'),
      },
    },
  },

  l3_ghortan_fach: {
    id: 'l3_ghortan_fach', speaker: 'Ein Fach', start: 'a',
    nodes: {
      a: {
        narration: (s) => (s.flags.ghortan_erschlagen
          ? 'In einem Gang, dessen Schild **Mitten im Satz** bedeutet, gibt es ein Fach, das ihr sucht, ohne es besprochen zu haben.\n\nDarin liegt ein einzelnes Wort.'
          : 'Ihr sucht ein Fach, das es nicht gibt. Wer nicht gestorben ist, hat kein letztes Wort — und der, an den ihr denkt, lebt.\n\nNamenlos. Machtlos. Aber er lebt.'),
        text: (s) => (s.flags.ghortan_erschlagen
          ? `Es ist der Name eines Charakters aus eurer Gruppe.\n\n**${s.notes.freedBy || s.party[0]?.name}.**`
          : '(Das Regal an dieser Stelle ist leer und nicht freigehalten. Es ist einfach leer.)'),
        flags: ['l3_ghortan_fach'],
        choices: [
          { text: 'Es mitnehmen.', to: 'mitnehmen', if: (s) => !!s.flags.ghortan_erschlagen },
          { text: 'Es liegen lassen.', exit: true },
        ],
      },
      mitnehmen: {
        narration: 'Ihr nehmt es. Es lässt sich nehmen, als hätte es darauf gewartet.',
        text: '[[Ghortans letztes Wort. Es ist ein Name, und es ist einer von euren.]]',
        flags: ['ghortans_wort'],
        onEnter: (s, ctx) => ctx.game?.item({ id: 'ghortans_wort', name: 'Ghortans letztes Wort', desc: 'Ein Name. Einer von euren.' }),
        end: true,
      },
    },
  },

  l3_ungesprochen: {
    id: 'l3_ungesprochen', speaker: 'Ein leeres Regal', start: 'a',
    nodes: {
      a: {
        narration: 'Ein Gang, kürzer als die anderen, mit einem einzigen Fach. Das Schild bedeutet **Ungesprochen**.\n\nDas Fach ist leer. Es ist nicht staubig — es ist **freigehalten**. Etwas soll hier hinein und ist nie gekommen.',
        text: '',
        choices: [
          { text: 'Den Stab davor halten.', to: 'stab', if: (s) => s.staff.stage > 0 || s.flags.gewaehlt_stab },
          { text: 'Hineingreifen.', to: 'greifen' },
          { text: 'Es dabei belassen.', exit: true },
        ],
      },
      stab: {
        narration: 'Ihr haltet den Stab vor das Fach, und beide Dinge wollen dasselbe. Man spürt es körperlich — wie zwei Magnete, die man einander nähert, kurz bevor sie zusammenschlagen.\n\nDas Fach öffnet sich nicht. Aber es ist jetzt klar, dass es sich öffnen **würde**.',
        text: '[[Es öffnet sich für den Stab der Bindung. Für nichts sonst. Und es ist für die Rabenkönigin reserviert.]]',
        flags: ['l3_ungesprochen_erkannt'],
        onEnter: (s, ctx) => ctx.game?.quest({ id: 'feder', text: 'Das leere Regal „Ungesprochen" ist für den Namen der Rabenkönigin reserviert. Es öffnet sich nur für den Stab der Bindung.' }),
        end: true,
      },
      greifen: {
        narration: 'Eure Hand geht hindurch. Das Fach ist nicht leer wie ein leerer Kasten — es ist leer wie eine Stelle, an der nie etwas war.\n\nAuf dem Rückweg fehlt einer von euch etwas, das er hatte, und er merkt es erst drei Szenen später.',
        text: '',
        flags: ['l3_gegriffen'],
        end: true,
      },
    },
  },

  l4_prozess: {
    id: 'l4_prozess', speaker: 'Kelemvor', portrait: 'kelemvor', start: 'a',
    nodes: {
      a: {
        narration: 'Die Stadt der Urteile hat keine Tore und keine Wachen. Sie hat einen Saal, und der Saal ist voll, und alle darin warten seit sehr langer Zeit und beschweren sich nicht.\n\nEr gewährt Anhörung, weil das Gesetz es vorsieht.',
        text: '„Antrag auf Aufhebung eines Urteils. Angenommen zur Verhandlung.\n\nVier Punkte. Ich unterbreche nicht, und ich helfe nicht."',
        choices: [{ text: 'Beginnen.', to: 'r1' }],
      },
      r1: {
        narration: '**Erstens: Zulässigkeit.** Warum dürft gerade ihr das beantragen?',
        text: '',
        choices: [
          { text: '„Weil wir ihren Boten getötet haben. Wir haben sie dorthin gebracht."', to: 'r2', flags: ['l4_r1'] },
          { text: '[Überzeugen] „Weil sonst niemand da ist."', tag: '◈', check: { skill: 'ueberzeugen', dc: 18, success: 'r2_ok', fail: 'r2_fail' } },
        ],
      },
      r2_ok: { text: '„Zulässig."', flags: ['l4_r1'], to: 'r2' },
      r2_fail: { text: '„Grenzwertig. Ich lasse es zu, weil die Alternative ist, dass niemand es beantragt."', to: 'r2' },
      r2: {
        narration: '**Zweitens: Der Fehler.** War das Urteil unrichtig?',
        text: '',
        choices: [
          { text: '„Ja. Sie lebt."', to: 'r2_falsch' },
          { text: '„Nein. Aber sie wurde nie gehört."', to: 'r3', flags: ['l4_r2'] },
          { text: '[Nachforschungen] Nach einem Verfahrensfehler suchen.', tag: '◈', check: { skill: 'nachforschungen', dc: 20, success: 'r3_ok', fail: 'r2_falsch' } },
        ],
      },
      r2_falsch: {
        text: '„Das Urteil war nicht unrichtig. Ich habe es selbst gesprochen, und ich habe es korrekt gesprochen, und wer etwas anderes behauptet, scheitert an dieser Stelle."\n(Pause.)\n„Der Punkt geht nicht an euch. Weiter."',
        to: 'r3',
      },
      r3_ok: {
        narration: 'Ihr findet ihn. Er ist klein und er ist da: Es gab nie eine Anhörung.',
        text: '„…Richtig."\n(Er blättert nicht nach. Er weiß es.)\n„Sie wurde nie gehört. Das ist kein Fehler im Urteil. Das ist ein Fehler im Verfahren. Der Punkt geht an euch."',
        flags: ['l4_r2'],
        to: 'r3',
      },
      r3: {
        narration: '**Drittens: Die Rabenkönigin.** Was tut sie mit der Verurteilten?',
        text: '',
        choices: [
          { text: '„Sie frisst sie. Und du hast sie für tot befunden, nicht für essbar."', to: 'r4', flags: ['l4_r3'] },
          { text: '„Sie verwahrt sie."', to: 'r4' },
          { text: '[Motiv erkennen] Warum fragt er das?', tag: '◈', check: { skill: 'motiv_erkennen', dc: 18, success: 'r3_hebel', fail: 'r4' } },
        ],
      },
      r3_hebel: {
        narration: 'Er fragt es nicht, weil er es nicht weiß. Er fragt es, weil er will, dass **ihr** es aussprecht — vor Zeugen, in einem Saal, in dem alles protokolliert wird.\n\nEr wartet seit vierzehnhundert Jahren darauf, dass jemand seine Schwester anklagt, damit er es nicht selbst tun muss.',
        text: '„Antwortet."',
        choices: [{ text: '„Sie frisst sie. Du hast sie für tot befunden, nicht für essbar."', to: 'r4', flags: ['l4_r3', 'l4_hebel'] }],
      },
      r4: {
        narration: '**Viertens: Der Preis.**\n\nEr schreibt etwas. Es ist das erste Mal, dass er etwas schreibt.',
        text: '„Das Hauptbuch gleicht sich aus. Wenn eine daraus verschwindet, tritt eine ein.\n\nIch frage nicht, wer von euch. Ich sage euch nur, dass ich es aufschreiben werde."',
        choices: [
          { text: '„Wir vertagen die Antwort."', to: 'vertagt' },
          { text: '„Ich."', to: 'sofort' },
          { text: '„Hast du eine Schwester?"', to: 'geschwister' },
        ],
      },
      geschwister: {
        narration: 'Er sieht auf. Es ist die einzige Bewegung, die er in diesem ganzen Verfahren nicht geplant hat.',
        text: '„Ich habe eine Schwester gehabt."\n(Pause.)\n„Ob sie es noch ist, entscheidet nicht ich — das entscheidet, was sie noch weiß."',
        flags: ['geschwisterfrage'],
        choices: [
          { text: '„Wir vertagen."', to: 'vertagt' },
          { text: '„Ich trete ein."', to: 'sofort' },
        ],
      },
      vertagt: {
        text: '„Angenommen. Ich bin geduldig, und ich vergesse nichts."\n(Er schreibt es auf.)\n„Der Antrag ist zulässig, das Verfahren war fehlerhaft, und was die Herrin der Federn mit der Verurteilten tut, geht über das Urteil hinaus.\n\nGeht. Holt sie. Ich halte euch nicht auf — ich rechne nur mit."',
        flags: ['l4_prozess_beendet', 'l4_vertagt'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('l4_abschluss'),
      },
      sofort: {
        narration: 'Jemand aus eurer Gruppe tritt vor und sagt es, und Kelemvor schreibt es auf, und danach ist es wahr.',
        text: '„Aufgenommen. Ihr werdet nicht merken, wann es gilt.\n\nDas ist keine Grausamkeit. Das ist die Natur der Sache."',
        flags: ['l4_prozess_beendet', 'l4_bezahlt'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('l4_abschluss'),
      },
    },
  },

  l5_federfeld: {
    id: 'l5_federfeld', speaker: 'Der Federhof', start: 'a',
    nodes: {
      a: {
        narration: 'Ein Feld aus schwarzen Federn, das bis zum Horizont reicht, und jede Feder ist ein Name, den niemand mehr weiß.\n\nEs ist kein Kampf. Es ist ein Marsch.',
        text: '',
        choices: [
          { text: 'Losgehen.', to: 'marsch' },
          { text: 'Die Anker in die Hand nehmen und dann losgehen.', to: 'marsch', flags: ['anker_bereit'] },
        ],
      },
      marsch: {
        text: '',
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('l5_marsch'),
      },
    },
  },

  l5_aspekt: {
    id: 'l5_aspekt', speaker: 'Die Rabenkönigin', portrait: 'rabenkoenigin', start: 'a',
    nodes: {
      a: {
        narration: 'Sie steht mitten im Feld, und das Feld ist um sie herum etwas leerer, als es sein müsste.\n\nSie ist nicht groß. Das überrascht am meisten.',
        text: '„Ihr habt einen weiten Weg gemacht, um eine Vorratskammer auszuräumen.\n\nIch bin euch nicht böse. Ich bin niemandem böse; das setzt voraus, dass man jemanden lange genug behält. Ich wollte euch nur einmal sehen, bevor ich euch nehme, weil ihr etwas Ungewöhnliches tragt.\n\nEin Gefäß, in dem Namen nicht verwesen. Wisst ihr, wie lange ich gesucht habe? — Nein, das könnt ihr nicht wissen. Ihr habt keine Zahl dafür."',
        choices: [
          { text: '„Warum frisst du sie?"', to: 'warum' },
          { text: '„Das ist Mord."', to: 'mord' },
          { text: '„Genießt du das?"', to: 'geniesst' },
          { text: 'Nichts sagen.', to: 'schluss' },
        ],
      },
      warum: {
        text: '„Weil sie verurteilt ist und niemand mehr an sie denkt. Nach dem Urteil gehört sie zu dem, was fällt.\n\nIch tue buchstäblich meine Arbeit."',
        to: 'a2',
      },
      mord: {
        narration: 'Und jetzt argumentiert sie, und ihr Argument ist gut, und das ist das Problem mit dieser ganzen Kampagne.',
        text: '„Ihr nennt es fressen. Es ist **Bestattung**.\n\nEine Erinnerung, die niemand mehr hält, verwest. Sie wird zu einem Schmerz ohne Ursache, zu einem Traum, aus dem jemand weinend aufwacht und nicht weiß, warum. Das ist es, was ihr wollt, wenn ihr mich aufhaltet: dass es weh tut und niemand mehr weiß, wovon.\n\nIch nehme es weg. Sauber. Ohne Rest.\n\n— Ihr wart in einer Stadt, in der Mütter ihre Kinder vergessen haben, und es war Folter. Wisst ihr, warum? **Weil es schlampig gemacht war.** Ich mache es nicht schlampig."',
        flags: ['rabenkoenigin_argument'],
        to: 'a2',
      },
      geniesst: {
        narration: 'Später, leiser, ohne Publikum.',
        text: '„Ich weiß es nicht. Ich habe keinen Vergleich.\n\nIch weiß nicht, was ich vorher war, und ich kann es auch nicht nachsehen — ich bin das einzige Fach in dieser Bibliothek, das ich nicht öffnen kann."',
        flags: ['rabenkoenigin_schwaeche'],
        to: 'a2',
      },
      a2: {
        text: '„Also machen wir es so: Ihr geht weiter. Ich nehme währenddessen ein bisschen. Nicht viel. Nur, was ihr ohnehin nicht mehr benutzt.\n\nUnd irgendwann steht ihr vor der Kammer und wisst nicht mehr, warum ihr gekommen seid. Das ist der Moment, auf den ich warte. Ich warte immer auf diesen Moment. Er kommt immer."',
        choices: [
          { text: '„Warum frisst du sie?"', to: 'warum', once: true },
          { text: '„Das ist Mord."', to: 'mord', once: true },
          { text: '„Genießt du das?"', to: 'geniesst', once: true },
          { text: 'Weitergehen.', to: 'schluss' },
        ],
      },
      schluss: {
        narration: 'Sie tritt zur Seite. Sie greift nicht an. Sie prüft nur, was ihr aushaltet, und was sie sieht, gefällt ihr offenbar.',
        text: '(Beim Weitergehen, hinter euch, ohne dass jemand die Stimme hebt:)\n\n„Die Kammer ist die dritte links. Ich sage es euch, weil ich nichts davon habe, wenn ihr sucht."',
        flags: ['l5_aspekt_erledigt'],
        end: true,
      },
    },
  },

  l6_lolth: {
    id: 'l6_lolth', speaker: 'Etwas in einem Glas', portrait: 'lolth', start: 'a',
    nodes: {
      a: {
        narration: 'Ein Zimmer, das aussieht wie eine Vorratskammer. Regale, Gläser, ordentlich beschriftet.\n\nIn einem davon sitzt eine Spinne von der Größe einer Faust. Sie ist fast vollständig aufgegessen.\n\nSie hat noch drei Sätze. Sie weiß es.',
        text: '(Sie wartet, bis ihr nah genug seid. Dann benutzt sie den ersten.)',
        choices: [
          { text: 'Zuhören.', to: 's1' },
        ],
      },
      s1: {
        text: '„Du fragst dich, wer sein Vater war. Der Drache.\n\nVierhundert Jahre lang hat er nicht gefragt, ob es einen gibt, und ich habe es ihm nicht gesagt, weil ich sehen wollte, wie lange er braucht.\n\nEr hat nie gefragt. Das war das Interessanteste an ihm."',
        flags: ['lolth_satz1'],
        choices: [{ text: 'Weiter.', to: 's2' }],
      },
      s2: {
        text: '„Gebt mir zurück, was mir gehört, und ich vergesse, dass ihr es wart.\n\nDas ist kein Angebot, das ist eine Vorhersage. Ich bin sehr gut darin, Dinge zu vergessen, wenn sie mir nützen."',
        flags: ['lolth_satz2'],
        choices: [{ text: 'Weiter.', to: 's3' }],
      },
      s3: {
        narration: 'Und dann der dritte, und der ist der schlimmste.',
        text: '„Wenn ihr mich nicht befreit — **nehmt mich trotzdem mit**.\n\nSie frisst nicht schnell. Sie frisst ordentlich. Und wenn nichts mehr da ist, wird da auch kein Ende sein, weil ein Ende etwas ist, das jemand bemerkt.\n\nIch will nicht zurück auf einen Thron. Ich will nur, dass jemand daneben steht."',
        flags: ['lolth_satz3', 'l6_lolth_gehoert'],
        choices: [{ text: 'Etwas fragen.', to: 'stumm' }, { text: 'Nichts sagen.', to: 'rechnung' }],
      },
      stumm: {
        narration: 'Sie antwortet nicht mehr. Sie hat keine Sätze mehr.',
        text: '',
        to: 'rechnung',
      },
      rechnung: {
        narration: 'Und hier ist die Rechnung, die vier Akte lang vorbereitet wurde:\n\nLolth wiederherzustellen bedeutet, ihr Namen **zurückzugeben**. Und seit dem Ende von Akt I gibt es Namen nur noch an einem Ort: in den elf Runen des Stabes.\n\nJeder Name, den ihr ihr gebt, ist ein Name, der einem anderen genommen wird.\n\nDie elf Runen sind die elf Kinder aus Klarwasser.\n\nDie Rechnung geht auf. Genau das ist das Grauen.',
        text: '',
        flags: ['l6_rechnung'],
        end: true,
      },
    },
  },

  l7_name: {
    id: 'l7_name', speaker: 'Der Name unter der Feder', start: 'a',
    nodes: {
      a: {
        narration: 'Die Rabenkönigin kann sich an alles erinnern, was je vergessen wurde — mit **einer** Ausnahme: ihren eigenen Namen.\n\nSie hat ihn aufgegeben, um ihr Amt anzutreten, und ist seitdem die einzige Person im Multiversum, die sich selbst nicht weiß.\n\nUnd der Namen-Speicher des Stabes kann ihn halten. Seit das Buch zerfallen ist, ist er das einzige Ding, das kann.',
        text: 'Elf Plätze. Keiner frei.\n\nFür ihren Namen muss ein Kind weichen.',
        choices: [
          { text: 'Das leere Regal „Ungesprochen" öffnen — mit dem Stab als Schlüssel.', to: 'regal', if: (s) => s.flags.l3_ungesprochen_erkannt },
          { text: 'Kelemvor fragen.', to: 'kelemvor', if: (s) => s.flags.l4_prozess_beendet },
          { text: 'Lolths dritten Satz einlösen.', to: 'lolth', if: (s) => s.flags.lolth_satz3 },
        ],
      },
      regal: {
        narration: 'Ihr haltet den Stab vor das Fach, und diesmal öffnet es sich.\n\nDarin liegt ein Wort, das noch nie jemand gesagt hat.',
        text: '',
        flags: ['name_erhalten'],
        to: 'wahl',
      },
      kelemvor: {
        narration: 'Ihr fragt ihn, und er sagt ihn.\n\nOhne Zögern. Ohne Bedingung. Ohne die kleinste Pause.\n\nUnd genau das verrät, was er die ganze Zeit gehofft hat.',
        text: '(Er hat ihn vierzehnhundert Jahre bereitgehalten und darauf gewartet, dass jemand fragt.)',
        flags: ['name_erhalten', 'kelemvor_gefragt'],
        to: 'wahl',
      },
      lolth: {
        narration: 'Die Spinne im Glas hat keine Sätze mehr. Aber sie hat noch einen Rest von etwas anderem.\n\nSie schreibt ihn. In Faden. An die Innenseite des Glases, spiegelverkehrt, damit ihr ihn von außen lesen könnt.',
        text: '',
        flags: ['name_erhalten', 'lolth_geholfen'],
        to: 'wahl',
      },
      wahl: {
        narration: 'Ihr habt ihren Namen.\n\nUnd damit habt ihr zum ersten Mal in vier Akten wirklich alles in der Hand.',
        text: '',
        choices: [
          { text: 'Ihr den Namen zurückgeben.', to: 'ende_zurueck', tag: '◈' },
          { text: 'Den Namen in den Stab sprechen. Sie verliert ihn endgültig.', to: 'ende_stab' },
          { text: 'Ihn als Druckmittel behalten. Sie verhandelt.', to: 'ende_druck' },
          { text: 'Sie bekämpfen. Ohne Namen, ohne Trick.', to: 'ende_kampf' },
          { text: 'Lolth wiederherstellen — es kostet alle elf Runen.', to: 'ende_lolth' },
          { text: 'Den Handel mit Klauth brechen. Lolth bleibt im Glas.', to: 'ende_brechen', if: (s) => !!s.flags.klauth_handel },
        ],
      },
      ende_stab: { text: '', end: true, onExit: (s, ctx) => ctx.game?.runEvent('l8_stab') },
      ende_zurueck: { text: '', end: true, onExit: (s, ctx) => ctx.game?.runEvent('l8_zurueck') },
      ende_druck: { text: '', end: true, onExit: (s, ctx) => ctx.game?.runEvent('l8_druck') },
      ende_kampf: { text: '', end: true, onExit: (s, ctx) => ctx.game?.runEvent('l8_kampf') },
      ende_lolth: { text: '', end: true, onExit: (s, ctx) => ctx.game?.runEvent('l8_lolth_wiederherstellen') },
      ende_brechen: { text: '', end: true, onExit: (s, ctx) => ctx.game?.runEvent('l8_handel_brechen') },
    },
  },
};

export const events = {
  akt4_start: async (game) => {
    const s = game.state;
    s.act = 4;
    await game.narration({
      kapitel: 'Akt IV', titel: 'Das Buch und die Feder',
      text: s.flags.klauth_handel
        ? 'Ihr habt einem Drachen versprochen, eine Göttin aus einer Ebene zu holen, aus der man nicht zurückredet.\n\nDie unbequeme Wahrheit vorweg: Das ist keine gute Idee, und niemand behauptet etwas anderes. Auch ihr nicht.\n\nDer Reiz besteht darin, dass ihr unterwegs Gelegenheit bekommt, den Handel zu brechen — und dass es euch dann etwas kostet.'
        : 'Es gibt einen Namen, der an einer Steintür unter Klarwasser abgegeben wurde, und er ist nicht verschwunden.\n\nEr ist irgendwo. Und es gibt genau einen Ort, an dem etwas landet, das niemand mehr hält.',
      knopf: 'Hinabsteigen',
    });
    if (s.party[0].level < 13) await game.levelUp(13);
    await game.runEvent('anker_waehlen');
    await game.goToArea('schwarze_quelle');
  },

  anker_waehlen: async (game) => {
    const s = game.state;
    const moeglich = [
      'Die Laute, die in einem Wirtshaus an einem Nagel hing',
      'Ein Flusskiesel, der genau so viel wiegt wie ein Rotkehlchen',
      'Sarines Brief, zweimal gefaltet',
      'Ein Streitkolben, dessen Griff jemand anderes gewickelt hat',
      'Das abgeschriebene Blatt mit elf Namen',
      'Der Kellerschlüssel, den ein Wirt dreißig Jahre getragen hat',
    ];
    await game.narration({
      kapitel: 'Vor dem Abstieg', titel: 'Die Anker',
      text: 'In der Schattenebene zerfällt Erinnerung wie anderswo Brot.\n\nJede Figur wählt vor dem Abstieg **einen Gegenstand**, der sie hält. Er muss eine Geschichte haben, kein Preisschild.\n\n[[Ein Anker kann zerstört werden. Die Rabenkönigin weiß das. Wenn ein Anker fällt, steigt der Träger sofort um zwei Vergessensgrade.]]',
    });
    for (const c of s.party.filter((x) => !x.dead)) {
      const anker = await game.ask({
        kapitel: 'Anker', titel: `Was hält ${c.name}?`,
        optionen: moeglich.map((m) => ({ text: m, wert: m })),
      });
      s.notes.anchors[c.name] = anker;
      c.anchor = anker;
    }
    game.quest({ id: 'feder', neu: true, titel: 'Das Buch und die Feder', text: 'Jede Figur trägt einen Anker. Fällt er, steigen zwei Vergessensgrade.' });
  },

  l1_eintrittsgebuehr: async (game) => {
    const s = game.state;
    if (s.flags.eintrittsgebuehr) return;
    s.flags.eintrittsgebuehr = true;
    for (const c of s.party.filter((x) => !x.dead)) {
      const erinnerung = await inputModal(game, {
        kapitel: 'Die Eintrittsgebühr', titel: `Was lässt ${c.name} zurück?`,
        text: 'Beim Durchschreiten löst sich etwas ab und bleibt.\n\nEine Erinnerung, dauerhaft. Kein Wurf. Sie wird nicht verhandelt.',
        platzhalter: 'Eine Erinnerung',
        vorschlaege: ['Den Geruch des Hauses, in dem ich aufgewachsen bin', 'Das Gesicht meiner Mutter', 'Warum ich angefangen habe', 'Meinen ersten Winter allein'],
      });
      s.notes.lostMemories[c.name] = erinnerung;
    }
    await game.narration({
      kapitel: 'Die Eintrittsgebühr', titel: 'Bezahlt',
      text: 'Ihr geht hindurch, und es tut nicht weh, und danach ist etwas weniger da.\n\nNicht als Loch. Als Stelle, an der nie etwas war.',
    });
    await game.levelUp(14);
  },

  l2_schlund_betreten: async (game) => {
    const c = pick(game.state.party.filter((x) => !x.dead));
    vergessenSteigern(game, c);
    const funde = [
      'Ein Kinderschuh, nass, obwohl es hier kein Wasser gibt.',
      'Ein Krug Bier, frisch gezapft, mit Schaum. Er ist noch kalt.',
      'Ein Blatt Papier mit einer Zeichnung, die zu groß für das Blatt war.',
      'Ein zweites Bett.',
      'Eine Laute. Nicht eine ähnliche — die.',
    ];
    await game.narration({
      kapitel: 'Ein Erinnerungsschlund', titel: 'Am Grund liegt jedes Mal etwas Echtes',
      text: `${c.name} steigt hinein und kommt wieder heraus, und in der Hand liegt:\n\n**${pick(funde)}**\n\n[[${c.name}: Vergessensgrad ${c.forgetting}.]]`,
    });
  },

  l2_kampf: async (game) => {
    const r = await game.startCombat('aschenmark_kampf');
    if (r !== 'sieg') return;
    game.setFlag('l2_kampf');
    await game.narration({
      kapitel: 'Die Aschenmark', titel: 'Sie greifen die Anker an',
      text: 'Die Federwächter gehen nicht auf euch los. Sie gehen auf das los, was ihr tragt.\n\nDas lernt ihr hier, und ab jetzt ist jeder Kampf ein Schutzkampf.',
    });
    await game.levelUp(15);
  },

  l3_falsches_regal: async (game) => {
    const c = pick(game.state.party.filter((x) => !x.dead));
    vergessenSteigern(game, c);
    await game.narration({
      kapitel: 'Die Bibliothek', titel: 'Falscher Ton',
      text: `Ihr greift in ein Fach, in dem etwas anderes liegt, und für einen Moment ist das fremde letzte Wort in eurem Kopf und eures nicht.\n\n[[${c.name}: Vergessensgrad ${c.forgetting}.]]`,
    });
  },

  l3_letztes_wort: async (game) => {
    const s = game.state;
    const wer = await game.ask({
      kapitel: 'Das Regal', titel: 'Es öffnet sich nur für jemanden, der etwas hinterlegt',
      text: 'Ein eigenes letztes Wort. Einen Satz, den diese Figur **nie wieder sagen darf**.',
      optionen: s.party.filter((c) => !c.dead).map((c) => ({ text: c.name, wert: c.id })),
    });
    const c = s.party.find((x) => x.id === wer);
    const satz = await inputModal(game, {
      kapitel: 'Das Regal', titel: `${c.name} hinterlegt ein letztes Wort`,
      text: 'Schreibt den Satz auf. Er wird notiert. Wenn er später doch fällt, kostet es einen weiteren Vergessensgrad.',
      platzhalter: 'Ein Satz',
      vorschlaege: ['„Ich komme wieder."', '„Es tut mir leid."', '„Ich bin da."', '„Vertrau mir."'],
    });
    s.notes.lastWords[c.name] = satz;
    await game.narration({
      kapitel: 'Das Regal', titel: 'Es öffnet sich',
      text: `${c.name} sagt den Satz, und er ist danach fort.\n\nIm Fach liegt Lolths letztes Wort. Es klingt, wie der Gang heißt: **ungläubig**.`,
    });
    game.setFlag('lolth_ort_bekannt');
    game.quest({ id: 'feder', text: `${c.name} hat ein letztes Wort hinterlegt: „${satz}" — und darf es nie wieder sagen.` });
    await game.levelUp(16);
  },

  l3_bibliothekar: async (game) => {
    const r = await game.startCombat('bibliothekar');
    if (r !== 'sieg') return;
    game.setFlag('l3_bibliothekar');
    await game.narration({
      kapitel: 'Die Bibliothek', titel: 'Er hört auf zu zitieren',
      text: 'Er kämpft nicht. Er zitiert — jede Runde das letzte Wort einer Person, die einer von euch verloren hat, mit genau dem Tonfall, in dem es gesagt wurde.\n\nAls er aufhört, ist es sehr still, und die Stille ist schlimmer.',
    });
  },

  l4_abschluss: async (game) => {
    await game.levelUp(17);
    game.setFlag('l4_prozess_beendet');
  },

  l5_marsch: async (game) => {
    const s = game.state;
    await game.narration({
      kapitel: 'Der Federhof', titel: 'Jede Stunde',
      text: 'Jede Stunde: WEI-Rettungswurf SG 20 oder ein Vergessensgrad.\n\nAnker helfen. Der Stab hilft mehr.',
    });
    for (const c of s.party.filter((x) => !x.dead)) {
      const bonus = (c.anchor ? 3 : 0) + (s.staff.stage >= 2 ? 2 : 0);
      const p = abilityCheck(c, 'we', 20, { bonus });
      if (!p.success) vergessenSteigern(game, c);
    }
    game.setFlag('l5_marsch');
    await game.levelUp(18);
  },

  l5_ankerjagd: async (game) => {
    const r = await game.startCombat('ankerjagd');
    game.setFlag('l5_ankerjagd');
    if (r !== 'sieg') return;
    await game.narration({
      kapitel: 'Der Federhof', titel: 'Was noch steht',
      text: 'Ihr habt sie abgewehrt. Nicht alle Anker.\n\nWer einen verloren hat, weiß es sofort — nicht weil etwas fehlt, sondern weil plötzlich nichts mehr zieht.',
    });
  },

  /* ─────────────── Die vier Ausgänge ─────────────── */
  l8_stab: async (game) => {
    const s = game.state;
    const kind = await game.ask({
      kapitel: 'L7 — Der Preis', titel: 'Elf Plätze. Keiner frei.',
      text: 'Für ihren Namen muss ein Kind weichen. Ihr wählt, welches.',
      optionen: (s.staff.names.length ? s.staff.names : ['Aleth Grast']).slice(0, 11).map((n) => ({ text: n, wert: n })),
    });
    s.staff.names = s.staff.names.filter((n) => n !== kind);
    await game.narration({
      kapitel: 'L8', titel: 'Ohne Geräusch',
      text: `Ihr sprecht ihn aus, und der Stab wird warm — nicht heiß, warm, so wie er an dem Abend in Klarwasser war, als ihr zum ersten Mal die elf Namen abgeschrieben habt.\n\nDann erlischt eine der elf Runen. Einfach so, ohne Geräusch. Ihr habt vorher entschieden, welche, und jetzt ist sie weg, und keiner von euch weiß mehr genau, was dort stand.\n\nAn ihrer Stelle brennt sich eine zwölfte Rune in den weißen Stein. Es ist ein kurzer Name. Zwei Silben, nichts Besonderes, so einer, wie ihn eine Bauernfamilie vergibt.\n\nUnd dahinter steht noch etwas. Ein zweiter Name, ein Familienname, und den kennt ihr.\n\nIhr habt ihn auf einer Waage gelesen, in einer Stadt aus Urteilen, unter einem Richter, der nichts vergisst.`,
    });
    s.staff.names.push('(der zwölfte Name — mit Kelemvors Familiennamen)');
    game.setFlag('ende_l8_stab');
    await game.ending('l8_stab');
    await game.runEvent('kampagnenende');
  },

  l8_zurueck: async (game) => {
    await game.narration({
      kapitel: 'L8', titel: 'Es klingt wie Regen',
      text: 'Sie sagt ihn nicht sofort. Sie steht sehr lange da, mit dem Wort im Mund, wie jemand, der einen Schluck zu heißen Tee nicht schlucken und nicht ausspucken kann.\n\nDann sagt sie ihn. Einmal, leise, zu sich selbst.\n\nUnd in der ganzen Schattenebene, gleichzeitig, auf dem Federhof und in der Aschenmark und in jedem Gang der Bibliothek, fällt jede Feder zu Boden.\n\nEs klingt wie Regen.\n\nEs hat hier noch nie geregnet.',
    });
    await game.narration({
      kapitel: 'L8', titel: 'Ohne Bedingung',
      text: 'Sie erinnert sich an sich. An ihren Bruder. Daran, warum sie das Amt genommen hat.\n\nSie hört auf zu fressen — nicht aus Gnade, sondern weil sie nicht mehr muss.\n\nDann gibt sie Lolth heraus. Ohne Bedingung, ohne Gegenforderung, ohne ein Wort dazu.\n\nWeil sie sich erinnert, wie es war, jemanden zurückhaben zu wollen.',
    });
    game.setFlag('ende_l8_zurueck');
    game.setFlag('bestes_ende');
    await game.ending('l8_zurueck');
    await game.runEvent('kampagnenende');
  },

  l8_druck: async (game) => {
    await game.narration({
      kapitel: 'L8', titel: 'Sie verhandelt',
      text: 'Ihr behaltet ihn.\n\nSie verhandelt — höflich, sachlich, ohne jede Drohung, und sie gibt Lolth heraus, weil ihr etwas habt, das sie mehr braucht.\n\nUnd danach wird sie euch jagen. Bis ans Ende der Zeit.\n\nSie hat Zeit. Das ist ihr ganzes Amt.',
    });
    game.setFlag('ende_l8_druck');
    await game.ending('l8_druck');
    await game.runEvent('kampagnenende');
  },

  l8_lolth_wiederherstellen: async (game) => {
    const s = game.state;
    await game.narration({
      kapitel: 'L8 — Der vierte Ausgang', titel: 'Es kostet alle elf',
      text: 'Es funktioniert.\n\nEs kostet alle elf Runen des Stabes — die elf Kinder aus Klarwasser. Einen nach dem anderen, und bei jedem wird der weiße Stein ein bisschen glatter.\n\nUnd im Spiegelhof, in einem Hof unter einem See, in einem Tal drei Tagesmärsche unterhalb eines leeren Drachenhorts, hebt ein elfjähriges Mädchen den Kopf, als hätte jemand seinen Namen gerufen.\n\nUnd hört auf zu existieren.\n\nDer Stab ist danach ein glatter weißer Stock ohne ein einziges Zeichen.',
    });
    s.staff.names = [];
    game.setFlag('ende_l8_lolth');
    await game.ending('l8_lolth');
    await game.runEvent('kampagnenende');
  },

  l8_kampf: async (game) => {
    const r = await game.startCombat('rabenkoenigin');
    if (r !== 'sieg') {
      await game.narration({
        kapitel: 'L8', titel: 'Sie wartet immer auf diesen Moment',
        text: 'Sie nimmt euch. Nicht zornig, nicht triumphierend — sorgfältig, so wie man etwas wegräumt, das lange herumlag.\n\nEs tut nicht weh. Das ist der Teil, den sie für Barmherzigkeit hält, und vielleicht hat sie recht.',
      });
      await game.ending('l8_verloren');
      await game.runEvent('kampagnenende');
      return;
    }
    await game.narration({
      kapitel: 'L8', titel: 'Der Federhof steht still',
      text: 'Sie fällt, und sie fällt leise, und auf dem ganzen Federhof bewegt sich nichts mehr.\n\nDas Amt ist unbesetzt. Es bleibt unbesetzt, bis jemand es übernimmt, und irgendjemand wird es übernehmen müssen, und alle im Saal der Urteile wissen das.\n\nKelemvor schreibt etwas auf. Es dauert lange.',
    });
    game.setFlag('ende_l8_kampf');
    await game.ending('l8_kampf');
    await game.runEvent('kampagnenende');
  },

  l8_handel_brechen: async (game) => {
    await game.narration({
      kapitel: 'L8 — Ausgang 3', titel: 'Das Glas bleibt stehen',
      text: 'Ihr stellt das Glas zurück ins Regal.\n\nEs ist eine sehr kleine Bewegung für eine Entscheidung dieser Größe. Zwei Sekunden, eine Hand, ein Regalbrett.\n\nDie Spinne darin hat keine Sätze mehr. Sie kann nicht einmal mehr fragen.\n\nUnd draußen, drei Ebenen höher, in einer Halle voller Gold, wird ein alter Wyrm in etwa vierzehn Tagen erfahren, dass ihr nicht wiederkommt.',
    });
    game.setFlag('ende_l8_brechen');
    game.setFlag('klauth_betrogen');
    await game.ending('l8_brechen');
    await game.runEvent('kampagnenende');
  },

  kampagnenende: async (game) => {
    const s = game.state;
    await game.levelUp(20);
    // Vier Epilogfragen
    await game.narration({
      kapitel: 'Epilog', titel: 'Welche Runen stehen am Ende noch auf dem Stab?',
      text: s.staff.names.length
        ? `${s.staff.names.join('\n')}\n\nZählt nach, was fehlt.`
        : 'Keine.\n\nEr ist ein glatter weißer Stock, anderthalb Meter lang, kalt und schwer wie Knochen.\n\nEr war einmal aus einem Stein geschlagen, der beim Schlag geschrien hat. Man sieht es ihm nicht mehr an.',
    });
    const narben = s.party.filter((c) => c.forgetting > 0);
    await game.narration({
      kapitel: 'Epilog', titel: 'Was hat jeder vergessen?',
      text: narben.length
        ? narben.map((c) => `**${c.name}** — Vergessensgrad ${c.forgetting}\n${VERGESSEN[c.forgetting]}`).join('\n\n')
          + '\n\nDas sind die Narben. Sie heilen nicht mehr.'
        : 'Nichts, was geblieben ist. Das ist selten genug, dass es aufgeschrieben gehört.\n\nJemand wird es aufschreiben. Sie hat ein Formular dafür.',
    });
    if (s.notes.anchors && Object.keys(s.notes.anchors).length) {
      await game.ask({
        kapitel: 'Epilog', titel: 'Wer trägt den Stab jetzt?',
        text: 'Er ist seit der Weggabelung bei euch, durch vier Akte, und niemand hat ihn je freiwillig abgegeben.',
        optionen: [
          ...s.party.filter((c) => !c.dead).map((c) => ({ text: `${c.name} behält ihn.`, wert: c.id })),
          { text: 'Niemand. Er wird eingemauert. Wie 1042.', wert: 'mauer' },
          { text: 'Er geht an Sarines Orden.', wert: 'orden' },
        ],
      });
    }
    if (s.flags.kiesel) {
      await game.ask({
        kapitel: 'Epilog', titel: 'Der schwarze Kiesel',
        text: 'Er wiegt immer noch genau so viel wie ein Rotkehlchen.',
        optionen: [
          ...s.party.filter((c) => !c.dead).map((c) => ({ text: `${c.name} behält ihn.`, wert: c.id })),
          { text: 'Er geht zurück nach Klarwasser, zu dem Mädchen, dem er gehört hat.', wert: 'nella' },
        ],
      });
    }
    await game.ending('kampagne_ende');
  },
};

export const combats = {
  aschenmark_kampf: () => {
    const map = makeMap(26, 14);
    paintRect(map, 8, 4, 11, 6, TERRAIN.SCHWIERIG);
    paintRect(map, 16, 8, 19, 10, TERRAIN.SCHWIERIG);
    return {
      title: 'Federwächter und Vergessene Klingen',
      map,
      playerStart: [{ x: 3, y: 7 }, { x: 3, y: 8 }, { x: 2, y: 7 }],
      enemies: [
        { id: 'federwaechter', x: 18, y: 5 },
        { id: 'vergessene_klinge', x: 16, y: 7 },
        { id: 'vergessene_klinge', x: 19, y: 9 },
        { id: 'vergessene_klinge', x: 21, y: 6 },
      ],
      intro: {
        kapitel: 'L2 — Die Aschenmark', titel: 'Sie greifen die Anker an',
        text: 'Ein Federwächter-Schwarm und drei Klingen, die nicht mehr wissen, gegen wen sie kämpfen. Es stört sie nicht.\n\n[[Die Federwächter greifen bevorzugt **Anker** an, nicht Charaktere. Ab jetzt ist jeder Kampf ein Schutzkampf.]]',
        knopf: 'Verteidigen',
      },
    };
  },

  bibliothekar: () => {
    const map = makeMap(28, 14);
    for (let x = 4; x < 25; x += 5) paintRect(map, x, 2, x + 1, 4, TERRAIN.WAND);
    for (let x = 4; x < 25; x += 5) paintRect(map, x, 9, x + 1, 11, TERRAIN.WAND);
    return {
      title: 'Der Bibliothekar',
      map,
      playerStart: [{ x: 3, y: 7 }, { x: 3, y: 6 }, { x: 2, y: 7 }],
      enemies: [{ id: 'bibliothekar', x: 23, y: 7 }],
      scenario: {
        onTurnStart: (combat, c) => {
          if (c.isPlayer || c.ref.id !== 'bibliothekar') return;
          const held = pick(combat.combatants.filter((x) => x.isPlayer && !combat.isDown(x)));
          if (!held) return;
          const verloren = combat.state.notes.lostMemories?.[held.ref.name]
            || combat.state.notes.sacrificedNames?.[held.ref.name]
            || held.ref.loss;
          if (verloren) combat.logLine('stimme', `Der Bibliothekar zitiert, mit genau dem richtigen Tonfall: „${verloren}"`);
        },
      },
      intro: {
        kapitel: 'L3', titel: 'Er kämpft nicht — er zitiert',
        text: 'Er tritt zwischen zwei Regale und ist plötzlich da, und er hat keine Waffe und braucht keine.\n\nJede Runde spricht er das letzte Wort einer Person, die einer von euch verloren hat.\n\n[[Es ist kein Zauber. Es ist nur wahr.]]',
        knopf: 'Ihn aufhalten',
      },
    };
  },

  ankerjagd: () => {
    const map = makeMap(30, 14);
    paintRect(map, 8, 3, 22, 10, TERRAIN.SCHWIERIG);
    return {
      title: 'Die Ankerjagd',
      map,
      playerStart: [{ x: 3, y: 7 }, { x: 3, y: 8 }, { x: 2, y: 7 }],
      enemies: [
        { id: 'federwaechter', x: 14, y: 5 }, { id: 'federwaechter', x: 18, y: 8 },
        { id: 'federwaechter', x: 22, y: 6 }, { id: 'vergessene_klinge', x: 20, y: 10 },
      ],
      scenario: {
        onRoundEnd: (combat, runde) => {
          if (runde % 2 !== 0) return;
          const held = pick(combat.combatants.filter((c) => c.isPlayer && !combat.isDown(c) && c.ref.anchor));
          if (!held) return;
          const rw = abilityCheck(held.ref, 'ge', 16);
          if (!rw.success) {
            combat.logLine('vergessen', `Ein Schwarm greift nach ${held.ref.name}s Anker: ${held.ref.anchor}.`);
            held.ref.anchor = null;
            held.ref.forgetting = Math.min(6, (held.ref.forgetting || 0) + 2);
            combat.logLine('vergessen', `${held.ref.name}: Vergessensgrad ${held.ref.forgetting}.`);
          }
        },
      },
      intro: {
        kapitel: 'L5', titel: 'Sie greifen nicht euch an',
        text: 'Federwächter in großer Zahl. Sie kommen nicht auf euch zu — sie kommen auf das zu, was ihr in der Hand haltet.\n\n[[Wer einen Anker verliert, steigt sofort um zwei Vergessensgrade.]]',
        knopf: 'Festhalten',
      },
    };
  },

  rabenkoenigin: () => {
    const map = makeMap(32, 18);
    return {
      title: 'Die Rabenkönigin',
      area: 'letzte_seite',
      map,
      playerStart: [{ x: 4, y: 9 }, { x: 4, y: 10 }, { x: 3, y: 9 }],
      enemies: [{ id: 'rabenkoenigin', x: 25, y: 9 }],
      scenario: {
        onRoundEnd: (combat) => {
          const held = pick(combat.combatants.filter((c) => c.isPlayer && !combat.isDown(c)));
          if (!held) return;
          const kleinigkeiten = [
            'den Namen des ersten Haustiers',
            'den Weg zum eigenen Elternhaus — nicht das Haus, den Weg',
            'eine Zahl, die er oft gebraucht hat',
            'das Gesicht des Menschen, der ihm das Lesen beigebracht hat',
            'warum er Abenteurer geworden ist',
            'einen Witz, den er sein Leben lang erzählt hat — die Pointe, nicht den Anfang',
          ];
          combat.logLine('vergessen', `Sie nimmt ein bisschen von ${held.ref.name}: ${pick(kleinigkeiten)}.`);
        },
      },
      intro: {
        kapitel: 'L8 — Ausgang 1', titel: 'Die stärkste Gegnerin dieser Kampagne',
        text: 'Sie ist die stärkste Gegnerin der gesamten Kampagne, und sie ist es aus Gründen, denen man zustimmen kann.\n\n„Ihr wollt kämpfen. Gut. Das habe ich lange nicht gehabt."',
        knopf: 'Kämpfen',
      },
    };
  },
};

export const endings = {
  l8_stab: {
    kapitel: 'Akt IV — Ausgang 1', titel: 'Der Federhof zerfällt',
    text: 'Sie verliert ihn endgültig.\n\nDer Federhof zerfällt. Alle Vergessenen erwachen — Zehntausende, auf einer grauen Ebene, alle gleichzeitig, und keiner von ihnen weiß, wer er ist.\n\nDie Schattenebene verliert ihre Herrin.\n\nUnd niemand hütet mehr, was vergessen wird. Von jetzt an verwest es einfach, und irgendwo wacht jemand weinend auf und weiß nicht, wovon.',
    frage: 'War das besser?',
  },
  l8_zurueck: {
    kapitel: 'Akt IV — Ausgang 2', titel: 'Sie erinnert sich an sich',
    text: 'Das beste Ende.\n\nEs ist auch das leiseste. Es gibt kein Beben, keinen zerfallenden Thron, keine Armee, die sich auflöst.\n\nEs gibt eine Frau in einem Feld aus Federn, die einen Namen sagt, den sie seit Äonen nicht gehört hat, und dann sehr lange nichts sagt.\n\nUnd einen Richter, drei Ebenen entfernt, der aufhört zu schreiben, mitten in einem Wort.',
    frage: 'Und Kelemvors Rechnung?',
  },
  l8_druck: {
    kapitel: 'Akt IV — Ausgang 3', titel: 'Ein Druckmittel',
    text: 'Es funktioniert. Genau deshalb ist es so schlimm.\n\nIhr habt den Namen einer Gottheit in der Tasche, und solange ihr ihn habt, tut sie, was ihr wollt.\n\nSie hat Zeit. Sie hat nichts als Zeit. Und irgendwann, in fünfzig oder zweihundert Jahren, wird jemand aus eurer Blutlinie nicht mehr wissen, warum er nachts aufschreckt.',
    frage: 'Wie lange haltet ihr das?',
  },
  l8_lolth: {
    kapitel: 'Akt IV — Ausgang 4', titel: 'Die Spinnenkönigin ist wieder da',
    text: 'Sie funktioniert wieder. Vollständig.\n\nEs hat alle elf Runen gekostet, und der Stab ist ein glatter weißer Stock, und in einem Hof unter einem See sind elf Plätze im Kreis frei geworden.\n\nDie Spinnenkönigin schuldet euch etwas. Das ist eine gefährliche Position — die gefährlichste in diesem ganzen Multiversum.\n\nSie wird sich revanchieren. Sie ist sehr gut darin, sich zu revanchieren.',
    frage: 'Wie hieß das Mädchen?',
  },
  l8_kampf: {
    kapitel: 'Akt IV — Ausgang 1b', titel: 'Das Amt ist unbesetzt',
    text: 'Ihr habt die stärkste Gegnerin dieser Kampagne erschlagen, und sie hatte in jedem einzelnen Punkt ein Argument.\n\nWas vergessen wird, fällt jetzt niemandem mehr zu. Es bleibt einfach liegen und verwest, und in den nächsten hundert Jahren wird das Multiversum langsam voller Schmerz ohne Ursache.\n\nNiemand wird wissen, warum. Das ist das Ergebnis.',
    frage: 'Wer übernimmt das Amt?',
  },
  l8_verloren: {
    kapitel: 'Akt IV — Niederlage', titel: 'Sauber. Ohne Rest.',
    text: 'Sie hat euch gewarnt. Sie hat es sogar erklärt, ausführlich, und sie hatte in allem recht, was sie gesagt hat.\n\nEs tut nicht weh.\n\nUnd irgendwann steht jemand in einer Stadt namens Klarwasser und fragt sich, warum der neunte Tisch abgewischt wird.',
    frage: 'Wie hieß das Mädchen?',
  },
  l8_brechen: {
    kapitel: 'Akt IV — Ausgang 3', titel: 'Den Handel brechen',
    text: 'Es war immer möglich. Bis zur letzten Minute.\n\nIhr habt eine Göttin in einem Glas stehen lassen, in einer Vorratskammer, bei jemandem, der ordentlich frisst.\n\nUnd ihr habt einem Drachen etwas versprochen und es nicht gehalten. Der Preis dafür steht noch aus: Akt III beginnt von vorn, diesmal ohne Verhandlungsspielraum.\n\nIhr habt euch für das kleinere Unrecht entschieden. Das ist selten das bequemere.',
    frage: 'Und wenn er kommt?',
  },
  kampagne_ende: {
    kapitel: 'Der Preis von Klarwasser', titel: 'Der allerletzte Satz',
    text: 'Vier Akte. Zwanzig Stufen. Ein Brunnen mit zwanzig Zentimeter Wasser, in dem man den Boden nicht sieht.\n\nZwischen dem ersten Abend im Krummen Nagel und hier liegen: eine Priesterin, die recht hatte. Ein Feenfürst, der nicht lügen konnte. Ein Ork, der euch gemocht hat und es trotzdem getan hat. Ein Drache, der sich langweilte. Eine Herrin, die ihren eigenen Namen nicht kannte.\n\nUnd elf Namen auf einem weißen Stein.\n\nEs schließt mit derselben Frage, mit der Klarwasser begonnen hat:',
    frage: 'Wie hieß das Mädchen?',
  },
};

export const areaEnter = {
  schwarze_quelle: async (game) => {
    if (game.flag('quelle_betreten')) return;
    game.setFlag('quelle_betreten');
    await game.narration({
      kapitel: 'L1 — Die schwarze Quelle', titel: 'Drei Tore, und alle drei sind schlecht',
      text: 'Es gibt drei Tore in die Schattenebene.\n\nYsmereths Hof grenzt überall dort an, wo Wasser aus Fels tritt — auch an die schwarzen Quellen dort unten.\n\nUnter Klauths Gold liegt ein Riss, den Lolth selbst geschlagen hat, als sie ihn noch besuchte. Er ist schmal und alt und tut weh.\n\nUnd in Klarwasser gibt es einen zwölften Gründerstein, der nie gesetzt wurde. Wer sich darunterlegt und seinen Namen laut sagt, wacht in der Aschenmark auf. Einbahnstraße.',
    });
  },
  aschenmark: async (game) => {
    if (game.flag('aschenmark_betreten')) return;
    game.setFlag('aschenmark_betreten');
    await game.narration({
      kapitel: 'L2 — Die Aschenmark', titel: 'Ein Himmel ohne Quelle',
      text: 'Es gibt hier keinen Himmel, sondern eine Höhe, in der das Grau aufhört, genauer zu werden.\n\nDer Boden ist Asche, aber sie ist kalt und uralt, und sie liegt so tief, dass eure Schritte kein Geräusch machen.\n\nIn alle Richtungen: nichts, bis auf einzelne aufrecht stehende Dinge, die aus der Entfernung wie Menschen aussehen und aus der Nähe auch.\n\nEs ist nicht still. Es ist etwas anderes — als hätte jemand vergessen, wie Geräusche gehen, und behilft sich seitdem.',
    });
  },
  bibliothek: async (game) => {
    if (game.flag('bibliothek_betreten')) return;
    game.setFlag('bibliothek_betreten');
    await game.narration({
      kapitel: 'L3 — Die Bibliothek der Letzten Worte', titel: 'Jedes letzte Wort, das je gesprochen wurde',
      text: 'Hier liegt jedes letzte Wort, das je gesprochen wurde.\n\nGeordnet nicht nach Namen, nicht nach Zeit, nicht nach Ort.\n\nSondern nach dem Ton, in dem es gesagt wurde.',
    });
  },
  stadt_der_urteile: async (game) => {
    if (game.flag('urteile_betreten')) return;
    game.setFlag('urteile_betreten');
    await game.narration({
      kapitel: 'L4 — Die Stadt der Urteile', titel: 'Diese Sitzung hat keinen Kampf',
      text: 'Diese Sitzung hat keinen Kampf. Das ist der Punkt.\n\nKelemvor hat Lolth als „vergangen" befunden, nachdem ihr Bote vernichtet und ihr Anker in der materiellen Welt gebrochen war. Das Urteil war formal korrekt.\n\nEs war nur nie eine Anhörung.\n\n[[Er ist der einzige Gegner dieser gesamten Kampagne, der von Anfang bis Ende vollständig im Recht ist. Das macht ihn zum schwersten.]]',
    });
  },
  federhof: async (game) => {
    if (game.flag('federhof_betreten')) return;
    game.setFlag('federhof_betreten');
    await game.narration({
      kapitel: 'L5 — Der Federhof', titel: 'Jede Feder ist ein Name',
      text: 'Ein Feld aus schwarzen Federn, das bis zum Horizont reicht.\n\nJede Feder ist ein Name, den niemand mehr weiß.\n\nEs sind sehr viele Federn.',
    });
  },
  vorratskammer: async (game) => {
    if (game.flag('kammer4_betreten')) return;
    game.setFlag('kammer4_betreten');
    await game.narration({
      kapitel: 'L6 — Die Spinne ohne Namen', titel: 'Ein Zimmer, das aussieht wie eine Vorratskammer',
      text: 'Kein Thron. Kein Netz. Keine Wachen.\n\nEin Zimmer mit Regalen, in dem es leicht nach Staub riecht, und auf einem der Regale steht ein Glas.\n\nDarin sitzt eine Spinne von der Größe einer Faust, und sie ist fast vollständig aufgegessen.',
    });
  },
};
