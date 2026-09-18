// AKT I — SITZUNG 4: DER SPIEGELHOF
// Vier Stationen, eine Audienz und der einzige Warnhinweis der ganzen Kampagne.

import { makeMap, paintRect, TERRAIN } from '../engine/combat.js';

export const dialogues = {
  spiegelgang: {
    id: 'spiegelgang', speaker: 'Der Spiegelgang', start: 'a',
    nodes: {
      a: {
        narration: 'Der Weg führt zwischen Spiegeln hindurch, die nur eine Rückseite haben. Und trotzdem seht ihr euch darin.\n\nNicht so, wie ihr seid.',
        text: (s) => {
          const c = s.party[0];
          return `Ihr seht euch, wie ihr wärt, wenn es nie passiert wäre.\n\n${s.party.map((p) => `**${p.name}** sieht sich ohne ${p.loss || 'das, was fehlt'}.`).join('\n')}`;
        },
        choices: [
          { text: 'Stehenbleiben und hinsehen.', to: 'hinsehen' },
          { text: 'Weitergehen, ohne den Kopf zu drehen.', to: 'weiter' },
          { text: 'Einen Spiegel zerschlagen.', to: 'schlagen' },
        ],
      },
      hinsehen: {
        narration: 'Ihr bleibt stehen. Alle drei. Es dauert länger, als angenehm ist.\n\nDas Bild verändert sich nicht, während ihr hinseht — das ist das Schlimme daran. Es wartet einfach.\n\nAls ihr weitergeht, seid ihr kein bisschen getröstet. Aber ihr wisst jetzt sehr genau, was ihr hier unten verteidigt.',
        text: '[[Inspiration: Jede Figur darf einmal einen Wurf wiederholen.]]',
        flags: ['spiegelgang_inspiration'],
        onEnter: (s) => {
          for (const c of s.party) {
            c.conditions = c.conditions || [];
            if (!c.conditions.some((x) => x.id === 'inspiriert')) {
              c.conditions.push({ id: 'inspiriert', rounds: 999, permanent: true });
            }
          }
        },
        end: true,
      },
      weiter: {
        narration: 'Ihr geht weiter, mit dem Blick auf dem weißen Kies. Es funktioniert.\n\nFast.',
        text: '',
        end: true,
      },
      schlagen: {
        narration: 'Der Spiegel zerspringt nicht. Er gibt nach wie Wasser und ist danach wieder da, und darin steht dieselbe Person wie eben, nur jetzt mit einer erhobenen Faust.\n\nIm Hof, weit vorn, sagt eine sehr höfliche Stimme, ohne die Stimme zu heben:\n\n„Die sind alt, Ihr Herrschaften. Bitte."',
        text: '',
        flags: ['spiegel_geschlagen'],
        end: true,
      },
    },
  },

  zoellner: {
    id: 'zoellner', speaker: 'Der Zöllner', start: 'a',
    nodes: {
      a: {
        narration: 'Auf halbem Weg steht eine Gestalt, die aus demselben weißen Kies zu bestehen scheint wie der Pfad. Sie hat keine Augen. Sie sieht euch trotzdem an.',
        text: '„Ein Rätsel, und ihr geht weiter. Eine falsche Antwort, und ihr geht auch weiter — nur eine Stunde später."\n\n„Es gehört dir, doch andere gebrauchen es weit häufiger als du. Man kann es dir nehmen, ohne dich zu berühren. Und wenn du es verlierst, bist du noch da — aber niemand findet dich."',
        choices: [
          { text: '„Mein Name."', to: 'richtig' },
          { text: '„Mein Schatten."', to: 'falsch' },
          { text: '„Mein Ruf."', to: 'falsch' },
          { text: '„Mein Herz."', to: 'falsch' },
          { text: '[Motiv erkennen] Was fragt es wirklich?', tag: '◈', check: { skill: 'motiv_erkennen', dc: 13, success: 'hinweis', fail: 'falsch' } },
        ],
      },
      hinweis: {
        narration: 'Es fragt nicht nach einem Besitz. Es fragt nach dem, worüber diese ganze Stadt gebaut ist — nach dem, was Ysmereth nimmt und was Klarwasser bezahlt.',
        text: '„Du zögerst. Das tun die Klugen."',
        choices: [{ text: '„Mein Name."', to: 'richtig' }],
      },
      richtig: {
        narration: 'Die Gestalt tritt zur Seite, sehr genau, wie jemand, der Platz macht und nicht weicht.',
        text: '„Richtig. Ihr dürft weiter. — Merkt euch, wie leicht euch das fiel. Da unten wird es schwerer."',
        flags: ['zoellner_geloest'],
        end: true,
      },
      falsch: {
        narration: 'Die Gestalt sagt nichts. Sie steht einfach im Weg, und der Weg ist schmal, und ihr steht eine Stunde.\n\nEine ganze Stunde.',
        text: (s) => (s.flags.zoellner_zweimal
          ? '„Das war der zweite Versuch."\n(Es tritt zur Seite.)\n„Geht. Ich nehme keine dritte Stunde — ich bin ein Zöllner, kein Wärter. Aber merkt euch, dass ihr die Antwort nicht wusstet. Das wird da unten noch wichtig."'
          : '„Versucht es noch einmal."'),
        onEnter: (s, ctx) => {
          ctx.game?.tick('zoellner_falsch');
          if (s.flags.zoellner_einmal) s.flags.zoellner_zweimal = true;
          s.flags.zoellner_einmal = true;
        },
        choices: [
          { text: '„Mein Name."', to: 'richtig' },
          { text: '„Mein Schatten."', to: 'falsch', if: (s) => !s.flags.zoellner_zweimal },
          { text: 'Weitergehen.', exit: true, if: (s) => !!s.flags.zoellner_zweimal },
        ],
      },
    },
  },

  waage: {
    id: 'waage', speaker: 'Die Waage der Gaben', start: 'a',
    nodes: {
      a: {
        narration: 'Eine Waage aus schwarzem Holz, mannshoch, in der Mitte des Wegs. Auf der einen Schale liegt nichts. Auf der anderen steht, in die Bronze geschlagen:\n\n**„Legt etwas auf, das schwerer wiegt als ein Name."**',
        text: '',
        choices: [
          { text: 'Gold auflegen. Alles, was ihr habt.', to: 'material' },
          { text: 'Eine Waffe auflegen.', to: 'material' },
          { text: 'Den Stab auflegen.', to: 'stab', if: (s) => s.flags.gewaehlt_stab },
          { text: 'Ein Versprechen geben.', to: 'versprechen' },
          { text: 'Eine Erinnerung aufgeben.', to: 'erinnerung' },
        ],
      },
      material: {
        narration: 'Die Schale bewegt sich nicht. Nicht ein bisschen. Das Gold liegt darin wie Staub auf einem Tisch.',
        text: '',
        to: 'a2',
      },
      stab: {
        narration: 'Die Schale senkt sich — einen Fingerbreit, und hebt sich sofort wieder.\n\nDer Stab wiegt fast genug. Das ist an sich schon eine Auskunft.',
        text: '',
        flags: ['waage_stab_probiert'],
        to: 'a2',
      },
      a2: {
        text: 'Die Waage wartet. Sie hat Zeit.',
        choices: [
          { text: 'Umkehren und außen herumgehen.', to: 'herum', once: true },
          { text: 'Ein Versprechen geben.', to: 'versprechen' },
          { text: 'Eine Erinnerung aufgeben.', to: 'erinnerung' },
        ],
      },
      versprechen: {
        narration: 'Eine von euch spricht ein Versprechen aus — laut, in einen Hof, in dem es außer Kies und Kerzen nichts gibt, was zuhören könnte.\n\nDie Schale senkt sich langsam und bleibt unten.',
        text: '[[Notiert. Der Hof merkt sich Versprechen besser als Klarwasser.]]',
        flags: ['waage_versprechen'],
        onEnter: (s, ctx) => ctx.game?.quest({ id: 'ermittlung', text: 'Auf der Waage der Gaben liegt ein Versprechen von euch. Ysmereths Hof hat es angenommen.' }),
        end: true,
      },
      erinnerung: {
        narration: 'Eine von euch legt eine Erinnerung in die Schale. Sie sagt sie laut, damit die anderen sie hören — und danach ist sie weg, und die anderen behalten sie, und das ist ab jetzt die einzige Stelle, an der es sie noch gibt.',
        text: 'Die Schale senkt sich sofort.',
        flags: ['waage_erinnerung'],
        end: true,
      },
      herum: {
        narration: 'Der Hof ist größer, als er aussah. Ihr geht zwanzig Minuten außen herum, über Kies, an Kerzen vorbei, die nicht flackern.\n\nDann steht ihr wieder vor der Waage.',
        text: '',
        to: 'a2',
      },
    },
  },

  chor_der_elf: {
    id: 'chor_der_elf', speaker: 'Elf Kinder', start: 'a',
    nodes: {
      a: {
        narration: 'Elf Kinder sitzen im Kreis auf weißem Kies. Sie spielen ein Spiel, dessen Regeln ihr nicht versteht, und sie spielen es sehr gut. Keines sieht auf, als ihr näherkommt. Keines von ihnen ist unglücklich.\n\nZwischen ihnen sitzt eine Katze und schnurrt.',
        text: '',
        choices: [
          { text: '„Wie heißt ihr?"', to: 'wie_heisst' },
          { text: '„Wie lange seid ihr schon hier?"', to: 'wie_lange' },
          { text: '„Wollt ihr weg?"', to: 'wollt_ihr' },
          { text: 'Einen Namen von der Liste laut aussprechen.', to: 'name', if: (s) => s.notes.namesCopied },
          { text: 'Die Katze ansehen.', to: 'katze', if: (s) => s.flags.katze_tot || s.flags.katze_mit || s.flags.katze_weg },
          { text: 'Nichts sagen und weitergehen.', to: 'ende' },
        ],
      },
      wie_heisst: {
        text: '„Ich weiß nicht."\n(Das Kind sieht auf, freundlich.)\n„Wie heißt du?"\n\n(Ihr sagt es. Zwei Züge später fragt dasselbe Kind noch einmal.)',
        to: 'a',
      },
      wie_lange: { text: '„Immer."\n(Es sagt das, ohne zu überlegen, so wie man „blau" sagt, wenn jemand nach dem Himmel fragt.)', to: 'a' },
      wollt_ihr: {
        narration: 'Sie sehen sich an. Alle elf gleichzeitig, wie ein Vogelschwarm, der abbiegt.',
        text: '„Wohin denn?"\n\n(Und die anderen lachen, weil es lustig klingt.)',
        to: 'a',
      },
      name: {
        narration: 'Ihr lest einen Namen von eurer Abschrift ab und sprecht ihn aus.\n\nGenau ein Kind hebt den Kopf.\n\nEs weint. Es weiß nicht, warum, und es kann nicht aufhören, und die anderen zehn rücken zusammen und trösten es, weil sie das offenbar geübt haben.',
        text: '',
        flags: ['chor_name_gesprochen'],
        choices: [
          { text: 'Weitermachen. Alle elf Namen.', to: 'alle_elf' },
          { text: 'Aufhören.', to: 'sarra' },
        ],
      },
      alle_elf: {
        narration: 'Ihr lest alle elf Namen vor.\n\nElf Kinder heben nacheinander den Kopf. Am Ende weinen elf Kinder auf weißem Kies in einem Hof unter einem See, und niemand von ihnen weiß, warum, und niemand von ihnen hört auf.\n\nEs ist das Lauteste, was in zweihundert Jahren hier unten passiert ist.',
        text: '',
        flags: ['chor_alle_namen'],
        to: 'sarra',
      },
      sarra: {
        narration: 'Ein älteres Mädchen — zwölf vielleicht, die Älteste im Kreis — steht auf, kommt zu euch und bleibt sehr nah stehen.',
        text: '„Unfair."\n(Pause. Sie sieht euch an, ehrlich verwirrt.)\n„Was heißt das?"',
        flags: ['sarra_gesprochen'],
        choices: [
          { text: 'Es erklären.', to: 'erklaert' },
          { text: 'Nichts sagen.', to: 'ende' },
        ],
      },
      erklaert: {
        narration: 'Ihr versucht es. Es dauert lange, und sie hört zu, und am Ende nickt sie langsam.',
        text: '„Okay."\n(Sie geht zurück in den Kreis und setzt sich.)\n„Sagt das dem Mann da vorne. Der redet gern."',
        flags: ['sarra_verstanden'],
        end: true,
      },
      katze: {
        narration: (s) => (s.flags.katze_tot
          ? 'Zwischen den Kindern sitzt eine Katze. Grau, mager, mit einem weißen Fleck über dem linken Auge.\n\nSie ist nicht dieselbe. Sie kann nicht dieselbe sein.\n\nSie sieht genauso aus.'
          : 'Zwischen den Kindern sitzt eine Katze und schnurrt. Sie sieht aus wie die vom Waldweg, und vielleicht ist sie das auch — hier unten stimmen solche Fragen nicht.'),
        text: (s) => (s.flags.katze_tot
          ? 'Vom anderen Ende des Hofes, ohne aufzusehen, sagt eine höfliche Stimme:\n\n„Die kam von hier. Sie wollte nur mitgehen. Das tun sie manchmal."'
          : '„Die kam von hier", sagt eine Stimme vom anderen Ende des Hofes, ohne aufzusehen. „Sie wollte nur mitgehen. Das tun sie manchmal."'),
        flags: ['katze_aufloesung'],
        end: true,
      },
      ende: {
        narration: 'Ihr geht weiter. Hinter euch geht das Spiel weiter, dessen Regeln ihr nicht versteht.',
        text: '',
        flags: ['chor_besucht'],
        end: true,
      },
    },
  },

  ysmereth_audienz: {
    id: 'ysmereth_audienz', speaker: 'Ysmereth, Herr der Stillen Tiefe', portrait: 'ysmereth', start: 'a',
    nodes: {
      a: {
        narration: 'Am Ende des Hofes steht ein einzelner Stuhl mit dem Rücken zu euch. Davor ein langer Tisch, und auf dem Tisch stehen elf Gläser Wasser, jedes bis zum selben Strich gefüllt.\n\nEr dreht sich nicht um.',
        text: '„Elf. Ich habe elf Gläser gestellt. Ihr seid weniger."\n(Pause.)\n„Setzt euch trotzdem, Ihr Herrschaften — es ist eine alte Gewohnheit, und ich habe wenig andere."',
        choices: [
          { text: 'Sich setzen.', to: 'gesetzt' },
          { text: 'Stehen bleiben.', to: 'gesetzt' },
        ],
      },
      gesetzt: {
        text: (s) => {
          const getrunken = s.notes.drankFromWell[0];
          return getrunken
            ? `„${getrunken}."\n(Er sagt den Namen, bevor irgendjemand ihn genannt hat.)\n„Ihr habt aus meinem Wasser getrunken. Das war unhöflich von mir — ich habe Euch dabei gesehen. Verzeiht."`
            : '„Ihr habt nicht getrunken. Keiner von euch."\n(Pause.)\n„Das ist selten. Das ist sogar klug. Fragt."';
        },
        choices: [
          { text: '„Sind die Kinder tot?"', to: 'tot' },
          { text: '„Was willst du?"', to: 'will' },
          { text: '„Wirst du Klarwasser zerstören?"', to: 'zerstoeren' },
          { text: '„Warum hast du unterschrieben?"', to: 'unterschrieben' },
          { text: '„Was war mit dem Hirtenjungen?"', to: 'hirtenjunge' },
          { text: '„Wer ist der Ork bei uns?"', to: 'ork', if: (s) => s.flags.ghortan_dabei },
          { text: '„Was ist das für ein Stab?"', to: 'stab', if: (s) => s.flags.gewaehlt_stab },
          { text: '„Wer hat die drei Dinge an die Weggabelung gelegt?"', to: 'weggabelung' },
          { text: '„Gib sie zurück."', to: 'zurueck' },
          { text: 'Genug gefragt.', to: 'schluss' },
        ],
      },
      tot: {
        text: '„Nein."\n(Zum ersten Mal klingt er beinahe verärgert.)\n„Das habe ich nie behauptet. Das hat Klarwasser behauptet, weil es bequemer war."',
        flags: ['ysmereth_kinder_leben'],
        to: 'gesetzt',
      },
      will: {
        text: '„Hinaus."\n(Pause.)\n„Und danach nichts von euch. Ich habe zweihundert Jahre gelernt, dass Menschen ihre Schulden von allein bezahlen."',
        to: 'gesetzt',
      },
      zerstoeren: {
        text: '„Nein."\n(Pause. Eine lange.)\n„Ihr habt gut gefragt. Fragt weiter."',
        flags: ['ysmereth_kein_zerstoeren'],
        choices: [
          { text: '„Wirst du Klarwasser schaden?"', to: 'schaden' },
          { text: 'Etwas anderes fragen.', to: 'gesetzt' },
        ],
      },
      schaden: {
        narration: 'Jetzt dreht er den Kopf. Nur ein Stück. Genug, dass man sieht, dass er lächelt.',
        text: '„Ich werde nehmen, was ich gegeben habe. Zweihundert Jahre ohne Fieber, ohne Missernte. Dann ist Klarwasser eine Stadt wie jede andere. Menschen sterben, wie Menschen sterben."\n\n„Nennt Ihr das Schaden? Ich nenne es das Wetter."',
        flags: ['ysmereth_preis_bekannt'],
        to: 'gesetzt',
      },
      unterschrieben: {
        text: '„Weil ich lesen kann und Aleth Wahl es eilig hatte."',
        flags: ['ysmereth_luecke_ahnung'],
        to: 'gesetzt',
      },
      hirtenjunge: {
        narration: 'Er antwortet sofort, ohne die kleinste Beschönigung.',
        text: '„1029. Ein Junge namens Tam hütete Ziegen am Silberkamm. Eine fiel in die Quellspalte. Ich bot einen Handel an: die Ziege zurück gegen etwas, das er nicht braucht.\n\nEr war zwölf und erleichtert und sagte: ‚Nimm meinen Namen, den brauch ich nicht.‘ Er meinte es als Scherz."\n\n„Ich habe den Handel angeboten. Er hat ihn angenommen. Ich habe nicht gefragt, ob er versteht, was er gibt.\n\nDas, Ihr Herrschaften, ist das Einzige, was ich bedaure — und selbst das bedaure ich nur, weil es teuer war."',
        flags: ['ysmereth_hirtenjunge'],
        to: 'gesetzt',
      },
      ork: {
        narration: 'Eine Pause, die länger ist als alle anderen.',
        text: '„Etwas, das sehr weit von zuhause ist und sich sehr gut benimmt."\n(Pause.)\n„Ich würde ihm nicht den Rücken zudrehen. Aber das würde ich euch auch nicht raten."',
        flags: ['warnung_ghortan'],
        onEnter: (s, ctx) => ctx.game?.quest({ id: 'ghortan', text: 'Ysmereth über Ghortan: „Ich würde ihm nicht den Rücken zudrehen. Aber das würde ich euch auch nicht raten."' }),
        to: 'gesetzt',
      },
      stab: {
        text: '„Ihr tragt ein Stück meines Gefängnisses mit euch herum und fragt mich, was es ist."\n(Pause.)\n„Er wacht auf. Fragt lieber, wer darauf wartet."',
        flags: ['stab_herkunft'],
        to: 'gesetzt',
      },
      weggabelung: {
        text: '„Ich. Alle drei."\n(Er sagt es, als hätte er darauf gewartet.)\n„Ich habe zweihundert Jahre gehabt und nichts als Wasser, durch das ich greifen kann. Der Wegequell an eurer Gabelung wird aus derselben Ader gespeist wie der Brunnen dort oben.\n\n— Ihr habt gut gewählt, Ihr Herrschaften. Nicht klug. Gut. Das ist nicht dasselbe, und es ist seltener."',
        flags: ['ysmereth_hat_gelegt'],
        choices: [
          { text: '„Dann haben wir schon von dir genommen?"', to: 'genommen' },
          { text: 'Etwas anderes fragen.', to: 'gesetzt' },
        ],
      },
      genommen: {
        text: '„Ja."\n(Pause.)\n„Das beunruhigt euch. Das ist vernünftig. Es ändert nichts."',
        flags: ['handel_erkannt'],
        to: 'gesetzt',
      },
      zurueck: {
        narration: 'Und jetzt steht er auf. Er ist größer, als der Stuhl vermuten ließ, und er dreht sich um, und sein Gesicht ist höflich bis zur Grausamkeit.',
        text: '„Fünftens: Was gegeben wurde, wird nicht zurückverlangt."\n(Pause.)\n„— Aber ich habe nie geschworen, es nicht zu **schenken**.\n\nFragt mich richtig."',
        flags: ['luecke_schenken'],
        choices: [
          { text: '„Dann schenke sie uns."', to: 'schenken' },
          { text: '„Was kostet das Schenken?"', to: 'kosten' },
          { text: 'Nachdenken und später wiederkommen.', to: 'gesetzt' },
        ],
      },
      kosten: {
        text: '„Meine Freiheit. Das ist der ganze Preis, und er ist nicht verhandelbar, und er ist auch nicht unfair — ich gebe elf zurück und bekomme einen heraus."\n(Pause.)\n„Rechnet nach. Ihr werdet feststellen, dass ihr das Angebot mögt, und dann werdet ihr euch fragen, warum ihr es mögt."',
        to: 'zurueck',
      },
      schenken: {
        narration: 'Er setzt sich wieder. Er rückt ein Glas Wasser einen Fingerbreit nach links, bis es genau dort steht, wo es stehen soll.',
        text: '„Gut. Wir sind im Geschäft, Ihr Herrschaften.\n\nIn der Neumondnacht endet die Bindung, oder sie hält weitere siebzehn Jahre. Das entscheidet ihr, nicht ich. Ich sage euch nur, was möglich ist, und ich lüge dabei nicht, weil ich es nicht kann.\n\nKommt wieder, wenn der Mond weg ist. Und bringt die Priesterin mit. Ich habe sie nie gesehen und würde gern wissen, wie jemand aussieht, der vierzig Jahre lang das Richtige tut."',
        flags: ['ysmereth_abmachung', 'audienz_gehalten'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('nach_audienz'),
      },
      schluss: {
        narration: 'Er hebt die Hand, und es ist eine Verabschiedung und keine Drohung.',
        text: '„Dann geht. Der Mond ist in fünf Tagen weg, und ihr habt eine Stadt zu befragen."\n\n„Und, Ihr Herrschaften — wenn ihr wiederkommt und mich um etwas bittet: formuliert es sorgfältig. Ich bin verpflichtet, genau das zu tun, was gesagt wurde. Das ist kein Trick. Das ist mein ganzes Wesen."',
        flags: ['audienz_gehalten'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('nach_audienz'),
      },
    },
  },

  sarine_schacht: {
    id: 'sarine_schacht', speaker: 'Sarine Umbrecht', portrait: 'sarine', start: 'a',
    nodes: {
      a: {
        narration: 'Sie sitzt am Fuß des Schachts auf einer umgedrehten Kiste, nass bis zur Hüfte, und schreibt. Neben ihr liegt eine Bleiröhre, aufgebrochen, und daneben ein Bogen Pergament, der zweihundert Jahre alt ist.',
        text: '„Sie waren unten. Gut. Dann kann ich mir das Fragen sparen."\n\n„Ich nehme den Vertrag mit. Sie können versuchen, ihn mir abzunehmen — ich werde mich nicht wehren, ich bin Archivarin.\n\nAber überlegen Sie: Solange dieses Papier existiert, gibt es einen Beweis. Und mein Orden hat neun weitere Städte auf der Liste."',
        choices: [
          { text: 'Lesen Sie vor.', to: 'vorlesen' },
          { text: 'Behalten Sie ihn. Aber sagen Sie in der Versammlung aus.', to: 'zeugin' },
          { text: 'Wir nehmen ihn. Er gehört dieser Stadt.', to: 'genommen' },
          { text: 'Warum interessiert Sie das wirklich?', to: 'warum' },
        ],
      },
      vorlesen: {
        narration: 'Sie liest mit der Stimme, mit der man Rechnungen vorliest.',
        text: '„**Erstens.** Ysmereth, Herr der Stillen Tiefe, verbleibt im Stein unter der Quelle, solange die Zahlung geleistet wird.\n**Zweitens.** Solange er verbleibt, ist das Wasser rein, das Korn sicher und das Fieber fern, im Umkreis, den die Glocke erreicht.\n**Drittens.** Alle siebzehn Jahre, zum Neumond, wird ihm ein Name aus Klarwasser gegeben. Gegeben, nicht genommen. Der Träger des Namens folgt ihm nach.\n**Viertens.** Der Pakt endet, wenn Klarwasser endet.\n**Fünftens.** Was gegeben wurde, ist gegeben. Es wird nicht zurückverlangt."',
        flags: ['pakt_gelesen'],
        onEnter: (s, ctx) => ctx.game?.quest({
          id: 'vertrag',
          text: 'Der Pakt hat vier Lücken: (1) „ein Name aus Klarwasser" — nirgends steht Kind. (2) „Gegeben, nicht genommen" — die Zahlung muss freiwillig sein. (3) „Im Umkreis, den die Glocke erreicht". (4) „Es wird nicht zurückverlangt" — verbietet Fordern, nicht Schenken.',
        }),
        choices: [
          { text: '„Nirgends steht Kind."', to: 'luecke' },
          { text: 'Behalten Sie ihn. Sagen Sie aber aus.', to: 'zeugin' },
          { text: 'Wir nehmen ihn.', to: 'genommen' },
        ],
      },
      luecke: {
        narration: 'Sie sieht zum ersten Mal von ihren Notizen auf.',
        text: '„Nein. Nirgends."\n(Sie schreibt etwas.)\n„Sie sind die Ersten, denen das auffällt, und ich bin seit sechs Wochen hier. Das spricht nicht für diese Stadt."',
        flags: ['luecke_kind'],
        to: 'a2',
      },
      warum: {
        text: '„Mein Vorfahre hieß Marrow Umbrecht. 1151. Achte Zeile im Register."\n(Sie sagt es ohne jede Bewegung im Gesicht.)\n„Meine Familie ist danach fortgezogen und hat drei Generationen später einen Orden gegründet, der aufschreibt, was Städte über sich selbst nicht aufschreiben.\n\nIch bin nicht gekommen, um das hier zu beenden. Ich bin gekommen, um es zu verzeichnen. Das ist ein Unterschied, und er gefällt mir selbst nicht besonders."',
        flags: ['sarine_wahrheit'],
        to: 'a2',
      },
      a2: {
        text: '„Also: Papier zu mir, oder Papier zu Ihnen?"',
        choices: [
          { text: 'Behalten Sie ihn. Sagen Sie aber aus.', to: 'zeugin' },
          { text: 'Wir nehmen ihn.', to: 'genommen' },
        ],
      },
      zeugin: {
        text: '„Angenommen."\n(Sie streicht etwas durch und schreibt darüber.)\n„Ich stehe in Ihrer Versammlung auf und bestätige, was in diesem Papier steht. Mein Orden gilt etwas, auch in Dörfern, die noch nie von ihm gehört haben — vor allem in solchen."',
        flags: ['sarine_zeugin'],
        onEnter: (s, ctx) => ctx.game?.toast('Sarine sagt in der Bürgerversammlung aus: +2 auf alle Überzeugen-Würfe.'),
        end: true,
      },
      genommen: {
        narration: 'Sie wehrt sich nicht. Sie hält das Pergament sogar fest, damit es beim Übergeben nicht reißt.',
        text: '„Wie Sie wollen. Für mein Archiv reicht die Abschrift, die ich bereits angefertigt habe — ich bin Archivarin, nicht naiv."\n(Sie steht auf und wringt ihren Rock aus.)\n„Aber in Ihrer Versammlung stehe ich dann nicht auf. Ich bezeuge, was in meinem Archiv liegt. Nicht, was in Ihrer Tasche liegt."',
        flags: ['vertrag_bei_gruppe'],
        onEnter: (s, ctx) => ctx.game?.item({ id: 'pakt', name: 'Der Pakt vom Klaren Wasser', legendaer: true, desc: 'Das Original. Zweihundert Jahre alt, in einer Bleiröhre gefunden.' }),
        end: true,
      },
    },
  },
};

export const events = {
  steinerne_zeugen: async (game) => {
    if (game.flag('gruenderformel')) {
      const wahl = await game.ask({
        kapitel: 'Der Spiegelhof', titel: 'Zwei Gestalten aus Stein',
        text: 'Zwei Wächter treten aus den Spiegeln, und sie sind nicht aus dem Hof — sie sind aus Klarwassers Fels geschlagen, von Händen, die vor zweihundert Jahren gestorben sind.\n\nSie heben Steinschwerter. Und ihr kennt einen Reim.',
        optionen: [
          { text: 'Dreimal klopfen. „Wahl. Odowic. Brunnenmann."', wert: 'formel', hinweis: 'Kaspars Reim' },
          { text: 'Kämpfen.', wert: 'kampf' },
        ],
      });
      if (wahl === 'formel') {
        await game.narration({
          kapitel: 'Der Spiegelhof', titel: 'Gründerschrift',
          text: 'Dreimal klopfen. Dann die drei Namen, in der richtigen Reihenfolge.\n\nDie beiden Wächter legen die Schwerter auf den Kies, setzen sich hin und werden wieder zu dem, was sie zwischen den Einsätzen sind: zwei Steine mit einem Auftrag, der gerade nicht gilt.\n\nSie sind kein Feind. Ihr seid der Feind. Sie halten Ysmereth seit zweihundert Jahren fest und tun genau das, wofür sie gebaut wurden.',
        });
        game.setFlag('zeugen_erledigt');
        game.setFlag('zeugen_umgangen');
        return;
      }
    }
    const r = await game.startCombat('steinerne_zeugen');
    if (r === 'sieg') game.setFlag('zeugen_erledigt');
  },

  nach_audienz: async (game) => {
    if (game.flag('nach_audienz_erledigt')) return;
    game.setFlag('nach_audienz_erledigt');
    game.setFlag('spiegelhof_besucht');
    if (game.flag('gewaehlt_stab')) {
      await game.narration({
        kapitel: 'Der Aufstieg', titel: 'Der Stab erwacht',
        text: 'Auf dem Rückweg über den weißen Kies wird der Stab warm, und diesmal bleibt er es.\n\nDie elf Runen stehen jetzt so deutlich im Stein, dass man sie im Dunkeln lesen könnte. Und wer ihn trägt, merkt, dass er drei Dinge könnte, die er gestern nicht konnte — und dass jedes davon wehtut.',
      });
      game.staff(2);
    }
    game.item({ id: 'ertrunkenes_silber', name: 'Ertrunkenes Silber', desc: 'Waffe +1, +2 gegen Feenwesen. Die Klinge ist immer nass und gibt kein Geräusch, wenn man sie zieht.' });
    game.gold(150);
    await game.levelUp(4);
    game.quest({ id: 'ermittlung', text: 'Ysmereth kann die elf Kinder schenken statt sie festzuhalten — gegen seine Freiheit. In fünf Tagen ist Neumond.' });
    game.setFlag('neumond_bereit');
  },

  reise_weggabelung: async (game) => {
    const ja = await game.ask({
      kapitel: 'Der Weg zurück', titel: 'Zwei Tagesmärsche hin, zwei zurück',
      text: 'An der Weggabelung liegen noch zwei Dinge in einem Steintrog.\n\nDer Weg dorthin kostet vier Tage. Der Neumond wartet nicht.',
      optionen: [
        { text: 'Losgehen. Die Uhr tickt zweimal.', wert: true, hinweis: 'Uhr +2' },
        { text: 'Doch nicht. Nicht jetzt.', wert: false, abschluss: true },
      ],
    });
    if (!ja) { game.setFlag('blockiere_zur_weggabelung'); return; }
    game.setFlag('blockiere_zur_weggabelung', false);
    game.setFlag('rueckkehr_weggabelung');
    game.tick('weggabelung', 2);
  },

  weggabelung_rueckkehr: async (game) => {
    const s = game.state;
    if (s.flags.weggabelung_geplündert) return;
    const nochDa = [];
    if (!s.flags.gewaehlt_stab && !s.flags.ghortan_hat_stab) nochDa.push('stab');
    if (!s.flags.gewaehlt_rolle && !s.flags.ghortan_hat_rolle) nochDa.push('rolle');
    if (!s.flags.gewaehlt_buch) nochDa.push('buch');

    if (!nochDa.length) {
      await game.narration({
        kapitel: 'Die Weggabelung', titel: 'Angesengtes Gras',
        text: 'Der Steintrog ist leer. Wo die Schriftrolle lag, ist das Gras angesengt — als hätte jemand etwas herausgenommen und es dabei eilig gehabt.\n\nVier Tage. Für nichts.',
      });
      return;
    }
    const text = ['Der Trog ist nicht leer.', ''];
    if (nochDa.includes('stab')) text.push('· Ein Stab aus weißem Kieselstein. Er summt jetzt so laut, dass man ihn zwei Schritte weit hört.');
    if (nochDa.includes('rolle')) text.push('· Eine Pergamentrolle mit drei Siegeln.');
    if (nochDa.includes('buch')) text.push('· Ein schwarz gebundenes Buch — im Gras daneben ein verkohlter Kreis. Das Buch selbst ist unversehrt.');
    text.push('', 'Und diesmal schließt sich das Wasser nicht. Der Handel ist längst geschlossen; was hier liegt, ist nur noch Auslage.');
    await game.narration({ kapitel: 'Die Weggabelung', titel: 'Was liegen blieb', text: text.join('\n') });

    for (const d of nochDa) {
      if (d === 'stab') {
        game.item({ id: 'stab_der_bindung', name: 'Stab der Bindung', legendaer: true, desc: 'Elf Runen aus weißem Kieselstein.' });
        game.setFlag('gewaehlt_stab');
        game.staff(game.state.notes.namesCopied ? 1 : 0);
      }
      if (d === 'rolle') {
        game.item({ id: 'schriftrolle', name: 'Schriftrolle der Massenfesselung', legendaer: true, desc: 'Bis zu 20 Ziele, STÄ-RW SG 18. Einmal.' });
        game.setFlag('rolle_bei_gruppe');
      }
      if (d === 'buch') {
        game.item({ id: 'buch_der_namen', name: 'Das Buch der verlorenen Namen', legendaer: true, desc: 'Tinte, die nicht lügen kann. −1 auf Charisma-Würfe pro eingetragenem Namen.' });
        game.setFlag('buch_bei_gruppe');
        await game.narration({
          kapitel: 'Das verkohlte Gras', titel: 'Jemand hat es versucht',
          text: 'Ihr hebt das Buch auf, und es geht ohne Weiteres. Ringsum ist das Gras schwarz in einem sauberen Kreis, als hätte dort etwas sehr Heißes sehr lange gestanden und es immer wieder versucht.\n\nDas Buch ist unversehrt. Nicht einmal angesengt.\n\n[[Die Tinte der Wahrheit nimmt keinen Dämon an.]]',
        });
        game.setFlag('verkohltes_gras_gesehen');
      }
    }
    game.setFlag('weggabelung_geplündert');
  },
};

export const combats = {
  steinerne_zeugen: (game) => {
    const map = makeMap(20, 14);
    paintRect(map, 8, 5, 11, 8, TERRAIN.SCHWIERIG);
    return {
      title: 'Steinerne Zeugen',
      map,
      playerStart: [{ x: 3, y: 6 }, { x: 3, y: 7 }, { x: 2, y: 6 }],
      enemies: [{ id: 'steinerner_zeuge', x: 15, y: 6 }, { id: 'steinerner_zeuge', x: 15, y: 8 }],
      allies: game.state.flags.ghortan_dabei ? [{ id: 'ghortan_begleiter', x: 4, y: 8 }] : [],
      scenario: {
        specialActions: [{
          id: 'gruenderformel', name: 'Gründerformel', icon: 'merkmal', cost: 'aktion',
          desc: 'Dreimal klopfen, dann „Wahl. Odowic. Brunnenmann." — die Zeugen legen sich nieder. Kein Wurf.',
          available: (combat) => !!combat.state.flags.gruenderformel,
          run: (combat) => {
            combat.logLine('schauplatz', 'Dreimal klopfen. „Wahl. Odowic. Brunnenmann."');
            for (const c of combat.combatants) {
              if (c.side === 'feind') { c.ref.hp = 0; c.ref.dead = true; }
            }
            combat.logLine('gegner', 'Die Zeugen legen die Schwerter auf den Kies und setzen sich hin.');
            combat.checkEnd();
          },
        }],
        onTurnStart: (combat, c) => {
          // Zeugnis: Die Zeugen sprechen aus, was die Figur bereut.
          if (c.isPlayer || combat.flags[`zeugnis_${c.uid}`]) return;
          const ziel = combat.combatants.find((x) => x.isPlayer && !combat.isDown(x) && x.ref.regret);
          if (!ziel || combat.round < 2) return;
          combat.flags[`zeugnis_${c.uid}`] = true;
          combat.logLine('stimme', `Der Zeuge spricht, und es ist keine Drohung, sondern ein Protokoll: „${ziel.ref.regret}"`);
        },
      },
      intro: {
        kapitel: 'Station 4', titel: 'Zeugnis',
        text: 'Zwei Gestalten aus Stein stehen zwischen euch und dem Ende des Hofes. Sie sind nicht aus dieser Tiefe — sie sind aus Klarwassers Fels geschlagen, von Händen, die seit zweihundert Jahren tot sind.\n\nSie greifen an, wenn ihr weitergeht. Und wenn ihr sie angreift, sprechen sie — und was sie sagen, ist wahr, und es ist von euch.\n\n[[Sie sind kein Feind der Gruppe. Die Gruppe ist der Feind.]]',
        knopf: 'Weitergehen',
      },
    };
  },
};

export const areaEnter = {
  spiegelhof: async (game) => {
    if (game.flag('spiegelhof_betreten')) return;
    game.setFlag('spiegelhof_betreten');
    game.state.session = 4;
    await game.narration({
      kapitel: 'Sitzung 4 — Der Spiegelhof', titel: 'Ein See, der über euch hängt',
      text: 'Der Schacht endet nicht in Wasser. Er endet an einer Wasseroberfläche, die von unten kommt — ein See, der über euch hängt. Ihr steht auf ihm.\n\nUnter euren Stiefeln, in einer Tiefe, die es nicht geben dürfte, brennen Kerzen.\n\nVor euch führt ein Weg aus weißem Kies durch einen Hof aus Spiegeln, die keine Vorderseite haben. Und überall auf dem Kies: Kiesel.\n\nNach Gewicht sortiert.',
      knopf: 'Den Weg betreten',
    });
  },
  weggabelung: async (game) => {
    if (game.flag('rueckkehr_weggabelung') && !game.flag('weggabelung_geplündert')) {
      await game.runEvent('weggabelung_rueckkehr');
    }
  },
};
