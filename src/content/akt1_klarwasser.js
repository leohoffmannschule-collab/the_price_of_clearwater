// AKT I — SITZUNG 2 & 3
// Ankunft, Erntefest, die Nassen Kleinen, Miris Verschwinden —
// und danach die Ermittlung: vier Knoten, jeder über mindestens zwei Wege lösbar.

import { makeMap, paintRect, TERRAIN } from '../engine/combat.js';
import { inputModal } from '../ui/panels.js';

export const ELF_NAMEN = [
  '1049 · Aleth Grast', '1066 · Iven Odowic', '1083 · Sarra Mohl', '1100 · Teodor Wahl',
  '1117 · Lin Brunnenmann', '1134 · Effe Grast', '1151 · Marrow Umbrecht', '1168 · Josta Vahl',
  '1185 · Renn Odowic', '1202 · Ilva Mohl', '1219 · Tam Grast',
];

export const dialogues = {
  /* ─────────────── Sitzung 2 — Ankunft ─────────────── */

  hesse_brunnen: {
    id: 'hesse_brunnen', speaker: 'Mutter Aldwina Hesse', portrait: 'hesse', start: 'a',
    nodes: {
      a: {
        narration: 'Am Brunnen kniet eine Frau in grauem Habit und wischt die Schale aus, obwohl sie makellos ist. Sie richtet sich auf, als ihr näherkommt, und lächelt so, wie man lächelt, wenn man sich wirklich freut.',
        text: '„Reisende. Wie schön. Trinkt, trinkt — es ist umsonst, und es tut gut."',
        choices: [
          { text: 'Trinken.', to: 'trinkt', onPick: (s, ctx) => ctx.game?.runEvent('brunnen_trinken') },
          { text: 'Danke, nein.', to: 'nicht_trinkt', flags: ['nicht_getrunken'] },
          { text: 'Wer seid Ihr?', to: 'wer' },
          { text: '[Wahrnehmung] Sie trinkt selbst nicht.', tag: '◈', check: { skill: 'wahrnehmung', dc: 14, success: 'trinkt_nie', fail: 'wer' } },
          { text: '[Motiv erkennen] Der Segen klingt zweimal.', tag: '◈', check: { skill: 'motiv_erkennen', dc: 13, success: 'zweimal', fail: 'wer' } },
        ],
      },
      wer: {
        text: '„Aldwina Hesse. Ich halte hier die Kapelle, seit Pater Melm gestorben ist — das ist jetzt vierunddreißig Jahre her, stellt euch das vor."\n(Sie berührt beim Sprechen den Unterarm der Person, die ihr am nächsten steht.)\n„Und ihr seid Reisende. Zum Erntefest. Wie gut das passt."',
        to: 'segen',
      },
      trinkt: {
        narration: 'Das Wasser ist kälter, als es sein dürfte, und schmeckt nach nichts. Nach überhaupt nichts. Danach ist einem wärmer.',
        text: '„Seht ihr? Es tut gut."',
        to: 'segen',
      },
      nicht_trinkt: {
        text: '„Natürlich. Verzeiht."\n(Sie merkt es sich. Man sieht genau, wie sie es sich merkt — nicht gekränkt, sondern sorgfältig.)\n„Ihr werdet euch wundern, wie oft man in dieser Stadt gefragt wird, ob man getrunken hat."',
        to: 'segen',
      },
      trinkt_nie: {
        narration: 'In der ganzen Zeit, die ihr ihr zuseht, führt sie die Schale kein einziges Mal an den eigenen Mund. Sie wischt sie aus, sie füllt sie nach, sie reicht sie herum.\n\nIn vierzig Jahren keinen Schluck.',
        text: '„Ihr seht mich an. Das tun wenige."\n(Das Lächeln bleibt.)\n„Es ist angenehm. Die meisten sehen das Wasser an."',
        flags: ['hesse_trinkt_nie'],
        to: 'segen',
      },
      zweimal: {
        narration: 'Sie segnet euch der Reihe nach und sagt dabei jeden Namen — einmal laut und einmal lautlos, mit den Lippen, danach.\n\nBei Ghortan zögert sie eine Sekunde zu lang.',
        text: '„Eine alte Angewohnheit. Man merkt sich Namen schlecht, wenn man sie nur einmal sagt."',
        flags: ['hesse_namen_zweimal'],
        to: 'segen',
      },
      segen: {
        text: '„Geht zum Markt. Das Fest ist schon im Gange, und Grust hat Bier, das besser ist als es sein müsste."\n(Sie wendet sich wieder der Schale zu.)\n„Und wenn ihr bleibt — bleibt ruhig. Klarwasser schließt nicht ab."',
        choices: [
          { text: 'Warum schließt hier niemand ab?', to: 'abschliessen' },
          { text: 'Zum Markt gehen.', exit: true },
        ],
      },
      abschliessen: {
        text: '„Weil nie etwas passiert, Kindchen."\n(Sie sagt es ohne jede Ironie.)\n„Seit zweihundert Jahren nicht. Keine Missernte, kein Fieber, kein Feuer. Manche Städte haben Glück. Wir haben sehr viel Glück."',
        flags: ['hesse_erstgespraech'],
        end: true,
      },
    },
  },

  nella_kiesel: {
    id: 'nella_kiesel', speaker: 'Ein Mädchen', portrait: 'nella', start: 'a',
    nodes: {
      a: {
        narration: 'Ein Mädchen, elf vielleicht, hat sich zwischen zwei Marktstände gesetzt und dreißig Kiesel aufgereiht. Sie schaut auf, mustert euch der Reihe nach und zeigt auf eine von euch.',
        text: '„Du. Ja, du. Ich wette einen Kupfer, dass du die nicht sortieren kannst."',
        choices: [
          { text: 'Nach Größe? Das ist einfach.', to: 'nicht_groesse' },
          { text: 'Wonach denn?', to: 'nicht_groesse' },
          { text: 'Wie heißt du?', to: 'name' },
          { text: 'Keine Zeit für Spiele.', to: 'keine_zeit' },
        ],
      },
      nicht_groesse: {
        text: '„Nach [[Gewicht]]."\n(Sie sagt es, als wäre alles andere albern.)\n„Größe kann jeder."',
        choices: [
          { text: 'Es versuchen.', to: 'versuch' },
          { text: 'Ohne Waage geht das nicht.', to: 'ohne_waage' },
        ],
      },
      versuch: {
        narration: 'Ihr wiegt drei Kiesel in der Hand und legt sie hin. Sie sieht kurz hin und schiebt zwei davon um.\n\nDann nimmt sie die restlichen siebenundzwanzig, wiegt jeden einzeln in der Hand und legt ihn hin, ohne zu zögern. Es dauert keine zwei Minuten.',
        text: '„Siehst du."',
        to: 'wie',
      },
      ohne_waage: {
        text: '„Doch."\n(Sie macht es vor. Sie braucht keine zwei Minuten.)',
        to: 'wie',
      },
      wie: {
        choices: [
          { text: 'Wie machst du das?', to: 'hoert' },
          { text: 'Wie heißt du?', to: 'name' },
        ],
        text: '',
      },
      hoert: {
        text: '„Weiß nicht. Ich hör\'s."\n(Pause.)\n„Nicht mit den Ohren. Anders."',
        to: 'name',
      },
      name: {
        text: '„Nella. Nella Vahl. Mein Vater ist der Bürgermeister, das ist langweiliger als es klingt."\n(Sie sortiert weiter, ohne aufzusehen.)\n„Ihr seid Reisende, oder? Richtige, die weiterziehen?"',
        choices: [
          { text: 'So ungefähr.', to: 'frage' },
          { text: 'Warum fragst du?', to: 'frage' },
        ],
      },
      frage: {
        text: '„Kommt ihr irgendwo her, wo man neu anfangen kann?"\n(Sie sagt es beiläufig. Sie hat das schon oft gesagt.)\n„Nur so. Also nicht wichtig."',
        choices: [
          { text: 'Willst du hier weg?', to: 'weg' },
          { text: '[Motiv erkennen] Sie fragt das nicht zum ersten Mal.', tag: '◈', check: { skill: 'motiv_erkennen', dc: 12, success: 'oft', fail: 'weg' } },
          { text: 'Klarwasser sieht doch schön aus.', to: 'schoen' },
        ],
      },
      weg: {
        text: '„Alle wollen hier weg. Nur keiner tut\'s."\n(Sie legt einen Kiesel hin, nimmt ihn wieder hoch, legt ihn woanders hin.)\n„Ich hab einen Plan. Ich sag ihn aber nicht."',
        flags: ['nella_plan_erwaehnt'],
        to: 'ende',
      },
      oft: {
        narration: 'Sie fragt das jeden Fremden. Seit etwa vier Monaten. Man sieht es daran, wie fertig der Satz ist.',
        text: '„Was guckst du so. — Ich frag das jeden. Irgendwann sagt einer ja."',
        flags: ['nella_plan_erwaehnt', 'nella_fragt_jeden'],
        to: 'ende',
      },
      schoen: {
        text: '„Ja."\n(Sie sagt es ohne jede Begeisterung.)\n„Sehr schön. Nie was kaputt. Nie wer krank."',
        to: 'ende',
      },
      keine_zeit: {
        text: '„Okay."\n(Sie sortiert weiter. Sie sieht nicht mehr auf.)',
        end: true,
      },
      ende: {
        narration: 'Sie hält euch einen Kiesel hin — grau, glatt, mit einem helleren Band.',
        text: '„Der da wiegt genau so viel wie ein Rotkehlchen. Sowas findet man nicht einfach so."\n(Sie steckt ihn wieder ein.)\n„Ich wollte nur, dass ihr das wisst."',
        flags: ['nella_kennengelernt'],
        end: true,
      },
    },
  },

  fest_auftritt: {
    id: 'fest_auftritt', speaker: 'Das Erntefest', start: 'a',
    nodes: {
      a: {
        narration: 'Auf dem Marktplatz spielt jemand entschlossen und schlecht auf einer Fiedel. Es riecht nach heißem Fett und Äpfeln. Wenn jemand aus eurer Gruppe etwas kann, ist jetzt der Moment.',
        text: '',
        choices: [
          { text: '[Auftreten] Auftreten.', tag: '◈', check: { skill: 'auftreten', hook: 'musiker', dc: 12, success: 'gut', fail: 'schlecht' } },
          { text: '[Überzeugen] Eine Rede auf die Stadt halten.', tag: '◈', check: { skill: 'ueberzeugen', dc: 13, success: 'rede', fail: 'schlecht' } },
          { text: 'Zusehen.', to: 'zusehen' },
        ],
      },
      gut: {
        narration: 'Die Fiedel hört auf. Zwei Kinder kommen näher. Dann noch eins. Nach der zweiten Strophe singt die halbe Stadt mit, und beim Schlussakkord ist es zwei Sekunden still, bevor sie klatschen.\n\nFünf Goldstücke landen in einem Hut, und Grust stellt wortlos einen Krug hin.\n\nAm Rand des Platzes steht ein sehniger, dünner Händler und starrt das Instrument an. Er sagt nichts. Er merkt es sich.',
        text: '',
        flags: ['auftritt_gelungen', 'perrick_hat_gesehen', 'perrick_da'],
        onEnter: (s, ctx) => ctx.game?.gold(5),
        end: true,
      },
      rede: {
        narration: 'Ihr sprecht über die Ernte, und die Leute hören zu, weil Fremde selten etwas über Klarwasser sagen. Als ihr sagt „zweihundert Jahre ohne Missernte", nicken alle.\n\nUnd ein halber Herzschlag lang nickt niemand.',
        text: '„Das stimmt", sagt eine Frau neben euch. Sie sagt es zu schnell.',
        flags: ['rede_gehalten', 'perrick_da'],
        end: true,
      },
      schlecht: {
        narration: 'Es ist nicht schlimm. Es ist nur nicht gut. Zwei Leute klatschen aus Höflichkeit, und die Fiedel fängt wieder an.',
        text: '',
        flags: ['perrick_da'],
        end: true,
      },
      zusehen: {
        narration: 'Ihr seht dem Fest zu, und das Fest ist gut. Die Leute sind freundlich zueinander, auf die selbstverständliche Art von Leuten, die einander seit hundert Jahren kennen.\n\nNiemand streitet. In drei Stunden streitet niemand.',
        text: '',
        flags: ['perrick_da'],
        end: true,
      },
    },
  },

  kaspar_fest: {
    id: 'kaspar_fest', speaker: 'Alter Kaspar', portrait: 'kaspar', start: 'a',
    nodes: {
      a: {
        narration: 'Ein Alter torkelt durchs Fest, zeigt auf den Weg zum Ortseingang und ruft.',
        text: '„Zwölf! Es sind zwölf! Nicht elf — ZWÖLF!"',
        choices: [
          { text: 'Zwölf was?', to: 'zwoelf' },
          { text: '[Wahrnehmung] Wie reagieren die anderen?', tag: '◈', check: { skill: 'wahrnehmung', dc: 12, success: 'lachen', fail: 'zwoelf' } },
          { text: 'Ihn stehen lassen.', to: 'weg' },
        ],
      },
      zwoelf: {
        narration: 'Zwei Nachbarn haben ihn schon untergehakt, freundlich, geübt.',
        text: '„Komm, Kaspar. Setz dich."\n„Zwölf, sag ich! Ich hab sie gezählt, ich zähl seit —"\n„Ja. Setz dich."',
        to: 'ab',
      },
      lachen: {
        narration: 'Alle lachen.\n\nAlle lachen ein bisschen zu schnell — eine Viertelsekunde zu früh, alle gleichzeitig, als hätte jemand ein Zeichen gegeben. Und danach reden sie sofort weiter, alle, über irgendetwas.',
        text: '„Der alte Kaspar", sagt jemand neben euch, ohne dass ihr gefragt habt. „Der zählt Steine. Seit Monaten. Traurig, aber harmlos."',
        flags: ['kaspar_gehoert', 'lachen_bemerkt'],
        to: 'ab',
      },
      ab: {
        text: '(Sie führen ihn zum Rand des Platzes. Er wehrt sich nicht. Auf halbem Weg dreht er sich noch einmal um und sieht euch an — nicht die Nachbarn. Euch.)',
        flags: ['kaspar_gehoert'],
        end: true,
      },
      weg: { text: '(Er ruft es noch zweimal. Beim dritten Mal hört er von selbst auf.)', flags: ['kaspar_gehoert'], end: true },
    },
  },

  tobrek_rede: {
    id: 'tobrek_rede', speaker: 'Bürgermeister Tobrek Vahl', portrait: 'tobrek', start: 'a',
    nodes: {
      a: {
        narration: 'Er steht auf einer umgedrehten Kiste und hält eine Rede, die er schon oft gehalten hat. Er wischt sich dabei Mehl von einer Jacke, an der kein Mehl ist.',
        text: '„…und so danken wir dem Boden, dem Wetter und einander. Und wie in jedem Jahr danken wir denen, die — die uns gegeben haben, was wir haben."',
        choices: [
          { text: '[Wahrnehmung] Er hat sich verhaspelt.', tag: '◈', check: { skill: 'wahrnehmung', dc: 12, success: 'verhaspelt', fail: 'normal' } },
          { text: 'Klatschen wie alle anderen.', to: 'normal' },
        ],
      },
      verhaspelt: {
        narration: 'Genau an dieser einen Stelle. Nirgends sonst.\n\nUnd während er es sagt, sieht er zu einem Mädchen mit Kieseln am Rand des Platzes. Er sieht sie die ganze Rede über an, alle vier Minuten, und er merkt es selbst nicht.',
        text: '(Er beendet die Rede. Die Leute klatschen. Er steigt von der Kiste und geht in die falsche Richtung, dreht um und geht wieder.)',
        flags: ['tobrek_verhaspelt'],
        end: true,
      },
      normal: {
        text: '(Die Leute klatschen. Es ist eine gute Rede für ein kleines Fest.)',
        end: true,
      },
    },
  },

  perrick: {
    id: 'perrick', speaker: 'Perrick', portrait: 'perrick', start: 'a',
    nodes: {
      a: {
        narration: 'Ein sehnig-dünner Mann mit einem Wagen voller Fässer. Er hat einen Blick, der überall gleichzeitig ist und nirgends lange bleibt.',
        text: '„Schöne Laute."\n(Er sagt es zu der Person, die sie trägt, ohne sie anzusehen.)\n„Die kenn ich. Nicht von hier."',
        choices: [
          { text: 'Sie war ein Geschenk.', to: 'geschenk' },
          { text: '[Täuschen] Alte Laute sehen alle gleich aus.', tag: '◈', check: { skill: 'taeuschen', dc: 13, success: 'geglaubt', fail: 'nicht_geglaubt' } },
          { text: 'Was fährst du in den Fässern?', to: 'faesser' },
          { text: '[Einschüchtern] Du hast nichts gesehen.', tag: '◈', check: { skill: 'einschuechtern', dc: 14, success: 'gedroht', fail: 'nicht_geglaubt' } },
        ],
      },
      geschenk: { text: '„Sicher."\n(Er lächelt freundlich und meint gar nichts damit.)', to: 'faesser' },
      geglaubt: { text: '„Wird wohl so sein. Ich vergess Gesichter besser als Sachen, aber ich vergess beides irgendwann."', to: 'faesser' },
      nicht_geglaubt: {
        text: '„Ist ja gut."\n(Er hebt die Hände.)\n„Ich sag doch nichts. Ich sag nie was. Das ist mein ganzes Geschäftsmodell."',
        flags: ['perrick_gewarnt'],
        to: 'faesser',
      },
      gedroht: {
        narration: 'Er wird sehr ruhig, und dann redet er zu schnell.',
        text: '„Nichts gesehen, klar. — Aber wenn ihr schon so anfangt: Ich hab hier auch nichts gemacht. Das mit dem Mädchen war ein Geschäft, und Geschäfte platzen."',
        flags: ['perrick_erpresst', 'fasswagen_erwaehnt'],
        choices: [
          { text: 'Welches Mädchen?', to: 'maedchen' },
          { text: 'Welches Geschäft?', to: 'maedchen' },
        ],
      },
      faesser: {
        text: '„Wein, Salz, Nägel. Was man so fährt."\n(Er klopft auf ein Fass. Es klingt voll.)\n„Ich bin morgen früh weg. Ich bin immer morgen früh weg."',
        choices: [
          { text: 'Du warst schon einmal hier, vor acht Tagen.', to: 'maedchen', if: (s) => s.flags.nella_fragt_jeden || s.flags.nella_plan_erwaehnt },
          { text: 'Gute Reise.', exit: true },
        ],
      },
      maedchen: {
        text: '„Die Kleine vom Müller."\n(Er zuckt mit den Schultern, und es ist die ehrlichste Bewegung, die er heute gemacht hat.)\n„Vier Silber und einen Stein hat sie mir gegeben, dafür sollt ich sie im Fasswagen rausfahren. Vier Silber! Von einem Kind!"\n\n„Ich hab das Geld genommen und bin ohne sie weiter. — Was denn? Sollte ich ein Kind entführen? Dann wär ich der Böse."',
        flags: ['fasswagen_erfahren'],
        choices: [
          { text: 'Du hast ein Kind betrogen, das fliehen wollte.', to: 'vorwurf' },
          { text: 'Wovor wollte sie weg?', to: 'wovor' },
        ],
      },
      vorwurf: {
        text: '„Ja."\n(Pause.)\n„Ich weiß. Ich hab drüber nachgedacht, auf dem ganzen Weg bis Marbruck und wieder zurück. Deswegen bin ich ja wieder hier."\n(Er holt vier Silberstücke heraus und legt sie auf das Fass.)\n„Gebt ihr das. Ich will nicht mit ihr reden."',
        onEnter: (s, ctx) => ctx.game?.gold(4),
        flags: ['perrick_silber'],
        end: true,
      },
      wovor: {
        text: '„Keine Ahnung. Hab ich nicht gefragt."\n(Er sieht zum ersten Mal woandershin.)\n„Kinder wollen immer weg. — Die hatte es aber eilig."',
        flags: ['fasswagen_erfahren'],
        end: true,
      },
    },
  },

  grust_tresen: {
    id: 'grust_tresen', speaker: 'Grust', portrait: 'grust', start: 'a',
    nodes: {
      a: {
        narration: 'Er ist sehr groß und sehr leise, und er wischt ein Glas, das schon sauber ist. Er begrüßt niemanden. Er wartet, bis man etwas sagt, und manchmal auch länger.',
        text: '„…"',
        choices: [
          { text: 'Zwei Wolfsfelle. Interesse?', to: 'felle', if: (s) => s.party_inventory.some((i) => i.id === 'wolfsfell') },
          { text: 'Ein Bier.', to: 'bier' },
          { text: 'Sich einfach dazusetzen und schweigen.', to: 'schweigen' },
          { text: 'Was ist mit dem Tisch dahinten?', to: 'tisch', if: (s) => s.flags.neunter_tisch_gesehen },
          {
            text: '„Renn Odowic."',
            if: (s) => s.notes.namesKnown?.length > 0 && !s.flags.grust_gestaendnis,
            to: 'renn',
          },
          {
            text: 'Ihm die abgeschriebene Namensliste hinlegen.',
            if: (s) => s.notes.namesCopied && !s.flags.grust_gestaendnis,
            to: 'liste',
          },
          { text: 'Gehen.', exit: true },
        ],
      },
      felle: {
        text: '„Acht Gold."\n(Er legt sie hin, ohne zu feilschen, ohne die Felle anzusehen.)\n„Ihr habt Wölfe getroffen. Auf dem Nordweg?"',
        onEnter: (s, ctx) => { ctx.game?.gold(8); s.party_inventory = s.party_inventory.filter((i) => i.id !== 'wolfsfell'); },
        flags: ['grust_gespraech_1'],
        choices: [
          { text: 'Auf dem Nordweg, ja.', to: 'nordweg' },
          { text: 'Danke.', to: 'a' },
        ],
      },
      nordweg: {
        text: '„Der ist kürzer."\n(Pause, lang.)\n„Ich bin den lange nicht mehr gegangen."',
        to: 'a',
      },
      bier: {
        narration: 'Das Bier ist besser, als es in einem Dorf dieser Größe sein müsste.',
        text: '„Zwei Kupfer."\n(Er stellt nach.)\n„Das dritte kostet nichts. So halte ich das."',
        flags: ['grust_gespraech_1'],
        to: 'a',
      },
      schweigen: {
        narration: 'Ihr sitzt zwanzig Minuten am Tresen und sagt nichts. Er wischt Gläser. Einmal stellt er euch ungefragt etwas hin.\n\nNach zwanzig Minuten sagt er einen Satz.',
        text: '„Ihr seid die mit dem Fleisch."\n(Pause.)\n„Das war anständig. Man kriegt hier selten was, das nicht schon jemandem gehört."',
        flags: ['grust_gespraech_1', 'grust_gespraech_2'],
        to: 'a',
      },
      tisch: {
        text: '„Der ist besetzt."',
        choices: [
          { text: 'Von wem?', to: 'von_wem' },
          { text: 'Er ist leer.', to: 'von_wem' },
        ],
      },
      von_wem: {
        text: '„…Weiß ich nicht."\n(Sehr lange Pause. Er wischt weiter.)\n„Wisch ihn trotzdem jeden Tag."',
        flags: ['grust_gespraech_2', 'neunter_tisch_gefragt'],
        end: true,
      },
      renn: {
        narration: 'Er stellt das Glas nicht ab. Er hört nur auf zu wischen, mitten in der Bewegung, und steht so da.',
        text: '„Sagt das nochmal."',
        choices: [
          { text: '„Renn Odowic. 1185. Er war fünf."', to: 'gestaendnis' },
          { text: 'Nichts mehr sagen und warten.', to: 'gestaendnis' },
        ],
      },
      liste: {
        narration: 'Ihr legt die Abschrift auf den Tresen und dreht sie um, damit er sie lesen kann.\n\nEr liest sie zweimal. Beim zweiten Mal mit dem Finger.',
        text: '„Der Neunte."\n(Er tippt auf die Zeile.)\n„Warum kenn ich den Neunten."',
        choices: [{ text: 'Nichts sagen.', to: 'gestaendnis' }],
      },
      gestaendnis: {
        text: '',
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('grust_gestaendnis'),
      },
    },
  },

  tisch_der_alten: {
    id: 'tisch_der_alten', speaker: 'Der Tisch der Alten', start: 'a',
    nodes: {
      a: {
        narration: 'Vier alte Leute, ein Krug in der Mitte, ein Kartenspiel, das niemand mehr zu Ende spielt. Sie rücken zusammen, als ihr euch setzt. Fremde sind hier ein Ereignis.',
        text: '„Fragt was. Wir wissen alles. Das Meiste davon stimmt sogar."',
        choices: [
          { text: 'Was sollten wir über Klarwasser wissen?', to: 'g1' },
          { text: 'Ist hier je etwas Schlimmes passiert?', to: 'g2' },
          { text: 'Wer ist die Frau am Brunnen?', to: 'g3' },
          { text: 'Was ist mit dem Tisch in der Ecke?', to: 'g4' },
          { text: 'Genug. Danke.', exit: true },
        ],
      },
      g1: {
        text: '„Das Wasser heilt Fieber." — „Das stimmt." — „Das stimmt wirklich." — „Alle sagen das."\n(Sie sagen es nacheinander, wie ein Gebet, das niemand mehr merkt.)',
        to: 'a',
      },
      g2: {
        narration: 'Sie überlegen. Sie überlegen ehrlich und lange.',
        text: '„Nein."\n„Die Mohls hatten mal einen Brand im Stall."\n„Das war in Dornfeld."\n„…Ja. In Dornfeld."\n\n(Eine sagt es stolz: „Klarwasser hatte noch nie eine Missernte. Noch nie." Und wird dann still.)',
        flags: ['gerucht_missernte'],
        to: 'a',
      },
      g3: {
        text: '„Mutter Hesse! Die war immer da."\n„Nicht immer. Sie war mal fort. Ein ganzes Jahr, in den Zweihundertern."\n„Ach, Unsinn."\n„Doch. Zwölfhundertzwei oder drei. Danach hat sie einen Monat nicht gesprochen."\n(Die anderen sehen sie an. Sie nimmt einen Schluck und sagt nichts mehr.)',
        flags: ['gerucht_hesse_fort'],
        to: 'a',
      },
      g4: {
        text: '(Sie reden über etwas anderes. Alle vier gleichzeitig, sofort, sehr freundlich.)\n\n„Habt ihr schon vom Fest gegessen? Das Fleisch ist gut dieses Jahr."',
        flags: ['neunter_tisch_gesehen'],
        to: 'a',
      },
    },
  },

  sarine_erstes: {
    id: 'sarine_erstes', speaker: 'Sarine Umbrecht', portrait: 'sarine', start: 'a',
    nodes: {
      a: {
        narration: 'Sie sitzt allein und schreibt. Als ihr euch meldet, nickt sie, streicht etwas in einer Liste durch und legt die Feder hin.',
        text: '„Sie sind also gekommen. Gut. Ich erkläre es einmal, dann fragen Sie.\n\nIn dieser Stadt existiert ein Vertrag. Zweihundert Jahre alt, in einer Bleiröhre, irgendwo unter dem Brunnen. Ich möchte ihn. Nicht vernichten — verzeichnen. Mein Orden sammelt so etwas.\n\nIch sage Ihnen nicht, was drinsteht. Nicht aus Bosheit — Sie würden mir nicht glauben, und dann müsste ich diskutieren."',
        choices: [
          { text: 'Was passiert hier?', to: 'f1' },
          { text: 'Welcher Orden?', to: 'f2' },
          { text: 'Warum holen Sie ihn nicht selbst?', to: 'f3' },
          { text: 'Einverstanden. Hundertfünfzig Gold.', to: 'deal' },
        ],
      },
      f1: {
        text: '„Etwas Altes und sehr Ordentliches."\n(Sie schreibt etwas mit, während sie spricht.)\n„Fragen Sie das Mädchen mit den Kieseln, wie viele Kinder in ihrer Klasse sind. Und dann fragen Sie ihre Mutter."',
        flags: ['sarine_hinweis_1'],
        to: 'rest',
      },
      f2: {
        text: '„Der Orden der Verzeichneten Wahrheit. Wir sammeln, was Städte über sich selbst nicht aufschreiben."\n(Pause.)\n„Neun weitere Städte stehen auf meiner Liste. Klarwasser ist Nummer drei."',
        flags: ['sarine_orden'],
        to: 'rest',
      },
      f3: {
        text: '„Weil ich Archivarin bin und nicht bewaffnet, und weil der Weg dorthin unter Wasser steht."\n(Sie sieht euch der Reihe nach an.)\n„Sie sind bewaffnet. Das ist die ganze Überlegung."',
        to: 'rest',
      },
      rest: {
        text: '„Ich beantworte drei Fragen am Tag. Sie haben heute noch welche übrig — oder heben Sie sie auf. Die meisten heben sie nicht auf und ärgern sich später."',
        choices: [
          { text: 'Was passiert hier?', to: 'f1', once: true },
          { text: 'Welcher Orden?', to: 'f2', once: true },
          { text: 'Einverstanden.', to: 'deal' },
          { text: 'Später.', exit: true },
        ],
      },
      deal: {
        text: '„Gut."\n(Sie schreibt es auf. Natürlich schreibt sie es auf.)\n„Hundertfünfzig bei Übergabe. Und ein Rat, den ich nicht als Frage zähle: Fangen Sie in der Kapelle an. Im Chorraum liegt etwas offen herum, das sehr lange niemand gelesen hat."',
        flags: ['sarine_auftrag', 'ermittlung_offen'],
        onEnter: (s, ctx) => ctx.game?.quest({
          id: 'vertrag', neu: true, titel: 'Der Pakt vom Klaren Wasser',
          text: 'Sarine Umbrecht zahlt 150 Gold für einen Vertrag in einer Bleiröhre, irgendwo unter dem Brunnen.',
        }),
        end: true,
      },
    },
  },

  ghortan_gespraech: {
    id: 'ghortan_gespraech', speaker: 'Ghortan', portrait: 'ghortan', start: 'a',
    nodes: {
      a: {
        text: (s) => (s.flags.register_gelesen
          ? '„Ihr habt etwas gefunden. Man sieht es euch an."\n(Er sitzt so, dass er die Tür im Blick hat. Das tut er immer.)'
          : '„Diese Stadt summt."\n(Er sagt es leise, als wäre es unhöflich.)\n„Nicht laut. Aber sie hört nicht auf."'),
        choices: [
          { text: 'Was hältst du von Klarwasser?', to: 'stadt' },
          { text: 'Was weißt du über die Kapelle?', to: 'kapelle' },
          { text: 'Trink etwas aus dem Brunnen.', to: 'brunnen' },
          { text: 'Kann ein guter Mensch etwas Böses tun?', to: 'frage', if: (s) => s.flags.register_gelesen },
          { text: 'Nichts weiter.', exit: true },
        ],
      },
      stadt: {
        text: '„Freundlich. Sehr freundlich."\n(Er dreht einen Becher, ohne daraus zu trinken.)\n„Ich war drei Jahre an einem Ort, an dem niemand freundlich war. Ich kann euch sagen, dass ich das hier schlechter aushalte."',
        to: 'a2',
      },
      kapelle: {
        text: '„Ich kenne diese Stadt nicht, aber ich kenne Magie. Unter dieser Kirche liegt etwas Altes und sehr Hungriges. Es beobachtet uns. Ich kann es [[fühlen]]."',
        flags: ['ghortan_warnung_kapelle'],
        to: 'a2',
      },
      brunnen: {
        text: '„Davon trinken? Würde ich nicht."\n(Er sieht in Richtung Ortseingang, obwohl von hier aus nichts zu sehen ist.)\n„Das Wasser ist nicht rein — es ist [[gezähmt]]."\n\n„Ich vertraue keinem Wasser, das mich anlächelt."',
        flags: ['ghortan_warnung_brunnen'],
        to: 'a2',
      },
      frage: {
        narration: 'Er wartet, bis die anderen weiter weg sind. Dann fragt er, und er fragt es sehr vorsichtig.',
        text: '„Darf ich euch etwas fragen? — Kann ein guter Mensch etwas Böses tun, ohne aufzuhören, gut zu sein?"\n\n(Er sieht dabei nicht in Richtung Kapelle. Er sieht auf seine eigenen Hände.)',
        flags: ['ghortan_frage_gestellt'],
        choices: [
          { text: 'Nein. Man ist, was man tut.', to: 'antwort_nein' },
          { text: 'Ja. Menschen sind nicht ihre schlimmste Stunde.', to: 'antwort_ja' },
          { text: 'Warum fragst du das?', to: 'warum' },
        ],
      },
      antwort_nein: { text: '„…Gut."\n(Er nickt langsam.)\n„Das ist eine saubere Antwort. Ich mag saubere Antworten."', flags: ['ghortan_antwort_hart'], to: 'a2' },
      antwort_ja: { text: '(Er sieht euch an, länger als nötig.)\n„Das ist freundlich. — Ich weiß nicht, ob es stimmt. Aber es ist freundlich."', flags: ['ghortan_antwort_weich'], to: 'a2' },
      warum: { text: '„Wegen der Priesterin."\n(Pause.)\n„Natürlich wegen der Priesterin. Wegen wem sonst."', to: 'a2' },
      a2: {
        text: '',
        choices: [
          { text: 'Was hältst du von Klarwasser?', to: 'stadt', once: true },
          { text: 'Was weißt du über die Kapelle?', to: 'kapelle', once: true },
          { text: 'Kann ein guter Mensch etwas Böses tun?', to: 'frage', once: true, if: (s) => s.flags.register_gelesen },
          { text: 'Genug für heute.', exit: true },
        ],
      },
    },
  },

  /* ─────────────── Sitzung 3 — Ermittlung ─────────────── */

  hesse_kapelle: {
    id: 'hesse_kapelle', speaker: 'Mutter Aldwina Hesse', portrait: 'hesse', start: 'a',
    nodes: {
      a: {
        narration: 'Sie kniet vor dem Altar, steht auf, als ihr eintretet, und wischt sich die Hände an der Schürze ab, obwohl sie sauber sind.',
        text: '„Ihr seid noch da. Das freut mich wirklich."',
        choices: [
          { text: 'Es verschwinden Kinder in Klarwasser.', to: 'kinder' },
          { text: 'Was bedeuten die elf Zeilen im Register?', to: 'register', if: (s) => s.flags.register_gelesen },
          { text: 'Warum trinkt Ihr selbst nie aus dem Brunnen?', to: 'riss', if: (s) => s.flags.hesse_trinkt_nie },
          { text: '[Motiv erkennen] Was treibt sie?', tag: '◈', check: { skill: 'motiv_erkennen', dc: 17, success: 'muede', fail: 'ausweich1' } },
          { text: 'Nichts. Verzeiht.', exit: true },
        ],
      },
      kinder: {
        text: '„Natürlich verschwinden hier Kinder. Es ist ein Bergdorf, Kindchen. Es gibt Schluchten. Es gibt Wölfe."\n(Beides wahr. Beides vollkommen irrelevant.)',
        choices: [
          { text: 'Alle siebzehn Jahre? Genau eines?', to: 'siebzehn', if: (s) => s.flags.register_gelesen },
          { text: 'Ihr weicht aus.', to: 'ausweich2' },
          { text: 'Und die elf Zeilen im Register?', to: 'register', if: (s) => s.flags.register_gelesen },
        ],
      },
      ausweich1: {
        text: '„Aber sagt mir doch erst — wie war eure Reise? Über den Kamm? Bei diesem Wetter?"\n(Und dann redet sie vier Minuten über das Wetter, und es ist angenehm, ihr zuzuhören.)',
        to: 'a',
      },
      ausweich2: {
        text: '„Ihr denkt, ich verberge etwas. Das ist klug von euch."\n(Sie sagt es ohne jede Schärfe.)\n„In jedem Dorf verbirgt jemand etwas. Meist ist es nur eine Schuld oder eine Affäre. Ich hoffe, ihr werdet nicht enttäuscht."',
        to: 'a',
      },
      register: {
        text: '„Das Register ist alt. Da steht viel drin."\n(Zum ersten Mal sieht sie weg, bevor sie antwortet.)\n„Wollt ihr mir sagen, wonach ihr sucht? Dann könnte ich helfen. Das wäre doch einfacher für alle."',
        choices: [
          { text: 'Elf Namen. Alle siebzehn Jahre. Und eine zwölfte Zeile.', to: 'zwoelfte', if: (s) => s.flags.nella_zeile_gefunden },
          { text: 'Elf Namen. Alle siebzehn Jahre.', to: 'siebzehn' },
          { text: '[Einschüchtern] Wir wissen, was Ihr tut.', tag: '◈', check: { skill: 'einschuechtern', dc: 16, success: 'gestellt', fail: 'kalt' } },
        ],
      },
      siebzehn: {
        text: '„Ja."\n(Sie sagt es einfach so. Kein Leugnen, kein Zittern.)\n„Und ihr wollt jetzt wissen, warum, und ich werde es euch sagen, aber nicht hier und nicht heute. Kommt heute Abend her. Ich mache Tee."\n\n(Sie wird heute Abend nicht hier sein.)',
        flags: ['hesse_konfrontiert', 'hesse_einladung'],
        end: true,
      },
      zwoelfte: {
        narration: 'Sie wird sehr still. Nicht erschrocken — still, wie jemand, der auf ein Geräusch wartet, das er kennt.',
        text: '„Ihr habt die zwölfte Zeile gelesen."\n(Pause.)\n„Dann wisst ihr mehr als ihr Vater."\n\n„Kommt heute Abend in die Kapelle. Ich mache Tee. Ich erkläre es euch, und dann entscheidet ihr, was ihr damit tut."',
        flags: ['hesse_konfrontiert', 'hesse_einladung', 'hesse_weiss_dass_ihr_wisst'],
        end: true,
      },
      gestellt: {
        narration: 'Sie weicht nicht zurück. Sie legt nur den Lappen hin, sehr ordentlich, an den Platz, wo er hingehört.',
        text: '„Gut."\n(Sie klingt erleichtert, und das ist das Schlimmste daran.)\n„Vierzig Jahre. Ich habe vierzig Jahre darauf gewartet, dass jemand das sagt, und jetzt ist es jemand, der übermorgen weiterzieht."\n\n„Kommt heute Abend. Ich erkläre es."',
        flags: ['hesse_konfrontiert', 'hesse_einladung', 'hesse_erleichtert'],
        end: true,
      },
      kalt: {
        text: '„Ihr erschreckt mich nicht, Kindchen. Ich bin einundsiebzig und habe Dinge getan, gegen die ihr wie Wetter aussieht."\n(Das Lächeln ist immer noch da.)\n„Aber ihr dürft es gern weiter versuchen."',
        to: 'a',
      },
      riss: {
        narration: 'Zum ersten Mal antwortet sie nicht sofort.',
        text: '„Weil ich nicht möchte, dass es mir gut geht."',
        flags: ['hesse_riss'],
        choices: [
          { text: 'Warum nicht?', to: 'warum_nicht' },
          { text: 'Nichts sagen und warten.', to: 'warum_nicht' },
        ],
      },
      warum_nicht: {
        text: '(Sie nimmt den Lappen wieder auf und wischt etwas, das sauber ist.)\n\n„Kommt heute Abend her. Ich mache Tee."',
        flags: ['hesse_einladung'],
        end: true,
      },
      muede: {
        narration: 'Sie ist nicht nervös. Das ist das Merkwürdige. Sie ist [[müde]] — nicht körperlich, sondern auf die Art, wie jemand müde ist, der seit vierzig Jahren dieselbe Rechnung nachrechnet und jedes Mal auf dasselbe Ergebnis kommt.\n\nUnd sie sieht euch an, als hätte sie darauf gewartet, dass endlich jemand fragt.',
        text: '„Ihr seht mich sehr genau an."\n(Pause.)\n„Das ist ungewohnt. Fahrt fort."',
        flags: ['hesse_muede_erkannt'],
        to: 'a',
      },
    },
  },

  kaspar_huette: {
    id: 'kaspar_huette', speaker: 'Alter Kaspar', portrait: 'kaspar', start: 'a',
    nodes: {
      a: {
        narration: 'Die Hütte liegt am Hang, ein gutes Stück außerhalb der Stadt. Von hier aus hört man die Kapellenglocke nicht mehr. Das ist Absicht — das merkt man daran, wie genau die Grenze verläuft.\n\nDrinnen sitzt ein sehr alter Mann und sieht euch an, als hätte er euch erwartet und als wäre das eine schlechte Nachricht.',
        text: '„Ihr seid die Fremden. — Habt ihr was dabei?"',
        choices: [
          { text: 'Eine Flasche Wein hinstellen.', to: 'wein', if: (s) => s.party_inventory.some((i) => i.id === 'wein') || s.party_gold >= 5 },
          { text: 'Wir wollen nur reden.', check: { skill: 'ueberzeugen', dc: 14, success: 'nuechtern', fail: 'abfuhr' }, tag: '◈' },
          { text: '[Untersuchen] Die Kerben an der Wand.', tag: '◈', check: { skill: 'untersuchen', dc: 13, success: 'kerben', fail: 'abfuhr' } },
          { text: '„Lin Brunnenmann."', to: 'zusammenbruch', if: (s) => s.notes.namesKnown?.length > 0 },
          { text: 'Gehen.', exit: true },
        ],
      },
      wein: {
        narration: 'Er sieht die Flasche an, dann euch, dann wieder die Flasche. Dann räumt er zwei Becher ab, die schon da stehen.',
        onEnter: (s, ctx) => { if (!s.party_inventory.some((i) => i.id === 'wein')) ctx.game?.gold(-5); },
        text: '„Setzt euch."\n(Nach dem dritten Becher fängt er an zu reimen. Es klingt wie ein Kinderlied, und er merkt nicht, dass er es tut.)',
        to: 'reim',
      },
      reim: {
        narration: '„Elf im Wasser, elf im Stein,\nelfmal siebzehn Jahr allein.\nWer den Zwölften zählen kann,\nfängt bei Ys, dann mer, dann eth —\nsprich den Namen, sprich ihn spät,\nund der Stein lässt ihn heran.\n\nGründer gaben, Gründer nahmen,\ndreimal klopf und sprich die Namen:\nWahl. Odowic. Brunnenmann."',
        text: '(Er sagt es dreimal. Beim dritten Mal schreibt jemand aus eurer Gruppe mit.)',
        flags: ['handout_a', 'gruenderformel'],
        onEnter: (s, ctx) => ctx.game?.quest({ id: 'ermittlung', text: 'Kaspars Reim: die Gründerformel — dreimal klopfen, dann „Wahl. Odowic. Brunnenmann." Und ein Name in drei Silben: Ys-mer-eth.' }),
        to: 'kammer',
      },
      nuechtern: {
        narration: 'Er redet nüchtern wie ein Buchhalter. Es dauert vier Stunden, und die Sonne steht anders, als ihr wieder hinausgeht.',
        text: '„1174. Da hab ich den Schacht neu verschalt. Elfter Mai, ich weiß das Datum, weil meine Frau Geburtstag hatte und ich zu spät kam."\n\n„Hinter der Brunnenwand ist eine zweite Kammer. Mit einer Steintür. Ich hab sie zugemauert, und ich hab niemandem gesagt, warum, weil ich es selber nicht weiß."',
        flags: ['zweite_kammer_bekannt'],
        onEnter: (s, ctx) => { ctx.game?.tick('kaspar_nuechtern'); },
        to: 'kammer',
      },
      kerben: {
        narration: 'An der Innenwand, über dem Bett, stehen Kerben. Sie sind in Gruppen zu elf geordnet, mit Kreide durchgestrichen und neu gezogen, weil er sich immer wieder verzählt.\n\nEs sind hundertsiebenundachtzig.\n\n187 = 11 × 17.',
        text: '„Ihr zählt mit."\n(Er sagt es, ohne sich umzudrehen.)\n„Gut. Dann zählt zu Ende."',
        flags: ['kerben_gezaehlt'],
        onEnter: (s, ctx) => ctx.game?.quest({ id: 'ermittlung', text: '187 Kerben in Elfergruppen an Kaspars Wand. 187 = 11 × 17.' }),
        to: 'kammer',
      },
      kammer: {
        text: '„Fragt mich was. Solange ich noch kann."',
        choices: [
          { text: '„Lin Brunnenmann."', to: 'zusammenbruch', if: (s) => s.notes.namesKnown?.length > 0 },
          { text: 'Was ist unter dem Brunnen?', to: 'unter' },
          { text: 'Warum wohnst du außerhalb der Glockenreichweite?', to: 'glocke' },
          { text: 'Danke. Das reicht.', exit: true },
        ],
      },
      unter: {
        text: '„Wasser. Und dahinter noch mal Wasser. Und dahinter eine Tür, die kein Mensch gebaut hat."\n(Er trinkt.)\n„Ich hab sie zugemauert. Ich hab dreißig Jahre gut geschlafen. Dann hab ich angefangen zu zählen."',
        flags: ['zweite_kammer_bekannt'],
        to: 'kammer',
      },
      glocke: {
        text: '„Weil ich hier oben denken kann."\n(Er sieht zum Fenster hinaus, hinunter auf die Stadt.)\n„Da unten denkt man freundlich. Hier oben denkt man richtig. — Probiert\'s aus. Geht runter und versucht, sich an das zu erinnern, was ich euch gesagt hab."',
        flags: ['glocke_hinweis'],
        to: 'kammer',
      },
      zusammenbruch: {
        narration: 'Er fällt vom Stuhl. Nicht dramatisch — er rutscht seitlich weg, als hätte ihm jemand die Knochen genommen, und bleibt auf dem Boden sitzen und sieht euch an.\n\nEr weiß nicht, wer Lin Brunnenmann ist. Er weiß nur, dass er diesen Namen sein Leben lang gesucht hat, ohne zu wissen, dass er sucht.',
        text: '„Ihr habt das grad gesagt, ja? Das Wort. Sagt\'s nochmal. — Nein. Nein, schreibt\'s auf. Schreibt\'s auf, und dann geht, und lasst mir den Zettel da, ja?\n\nLasst mir den Zettel da."',
        flags: ['kaspar_zusammenbruch', 'handout_a', 'gruenderformel', 'zweite_kammer_bekannt'],
        onEnter: (s, ctx) => {
          ctx.game?.quest({ id: 'ermittlung', text: 'Kaspar Brunnenmann ist ein Nachfahre der Familie, die den Bannkreis gegraben hat. 1117 wurde ein Lin Brunnenmann gegeben. Er weiß es nicht. Er sucht den Namen seit siebzig Jahren.' });
        },
        end: true,
      },
      abfuhr: {
        text: '„Dann nicht."\n(Er dreht sich zur Wand.)\n„Kommt wieder, wenn ihr was dabei habt. Oder wenn ihr einen Namen habt. Namen sind besser als Wein, aber die kriegt man hier nicht."',
        end: true,
      },
    },
  },

  tobrek_kontor: {
    id: 'tobrek_kontor', speaker: 'Bürgermeister Tobrek Vahl', portrait: 'tobrek', start: 'a',
    nodes: {
      a: {
        narration: 'Das Kontor ist ordentlich bis zur Angst. Er sitzt hinter einem Tisch, auf dem drei Stapel Papier liegen, die alle gleich hoch sind.',
        text: '„Der Bürgermeister hat heute wenig Zeit."\n(Er redet über sich in der dritten Person, wenn er nervös ist. Er ist nervös.)',
        choices: [
          { text: 'Es geht um Ihre Tochter.', to: 'nella_thema' },
          { text: 'Es geht um das Kirchenregister.', to: 'register', if: (s) => s.flags.register_gelesen },
          { text: '[Einschüchtern] Wir wissen es bereits.', tag: '◈', check: { skill: 'einschuechtern', dc: 16, success: 'bricht', fail: 'autoritaet' } },
          { text: '[Überzeugen] Reden Sie mit uns, solange es noch geht.', tag: '◈', check: { skill: 'ueberzeugen', dc: 13, advantage: (s) => !!s.flags.nella_dabei, success: 'bricht', fail: 'rational' } },
          { text: 'Nichts weiter.', exit: true },
        ],
      },
      autoritaet: {
        text: '„Der Bürgermeister lässt sich in seinem eigenen Kontor nicht —"\n(Er bricht ab. Er ordnet einen Stapel, der geordnet ist.)\n„Was wollt ihr?"',
        to: 'a',
      },
      rational: {
        text: '„Ihr versteht das nicht. Das ist ein alter Brauch. Ich habe ihn nicht erfunden, ich habe ihn geerbt, wie das Haus."\n(Er hört sich selbst zu und wird langsamer.)\n„…wie das Haus."',
        to: 'a',
      },
      nella_thema: {
        text: '„Nella ist elf. Elf ist ein schwieriges Alter."\n(Er wischt Mehl von einer Jacke, an der kein Mehl ist.)\n„Sie erzählt Geschichten. Das tun Kinder."',
        choices: [
          { text: 'Sie wollte mit einem Fasswagen fliehen.', to: 'bricht', if: (s) => s.flags.fasswagen_erfahren },
          { text: 'Warum haben Sie sie während Ihrer Rede angesehen?', to: 'bricht', if: (s) => s.flags.tobrek_verhaspelt },
          { text: 'Zurück.', to: 'a' },
        ],
      },
      register: {
        text: '„Das Register gehört der Kapelle. Fragt Mutter Hesse."\n(Zu schnell.)\n„Der Bürgermeister hat damit nichts zu tun."',
        choices: [
          { text: 'Sie haben es vor fünf Monaten gelesen.', to: 'bricht' },
          { text: 'Zurück.', to: 'a' },
        ],
      },
      bricht: {
        narration: 'Er sagt eine ganze Weile nichts. Dann geht er zur Tür, sieht hinaus, schließt sie und setzt sich wieder — und sieht dabei aus wie jemand, der etwas hinlegt, das er sehr lange getragen hat.',
        text: '(Sehr leise:)\n„Ich hab gehofft, es ist ein anderes Kind."',
        flags: ['tobrek_gebrochen'],
        choices: [
          { text: 'Erzählen Sie.', to: 'erzaehlt' },
          { text: 'Sie haben es aufgeschrieben, oder?', to: 'brief' },
        ],
      },
      erzaehlt: {
        text: '„Alle siebzehn Jahre gibt Klarwasser einen Namen her. Ein Kind. Es geht zum Brunnen und steigt hinein und ist weg, und am nächsten Morgen weiß niemand mehr, dass es da war.\n\nNicht einmal die Mutter. Das ist der Teil, den ihr nicht glauben werdet."\n\n„Ich hab es vor fünf Monaten im Register gefunden. Ich hab zwanzig Minuten gebraucht, um es zu verstehen. Ich hab es in derselben Nacht aufgeschrieben, versiegelt und unter die dritte Diele gelegt.\n\nUnd dann hab ich fünf Monate lang nichts getan."',
        flags: ['tobrek_gestaendnis', 'brief_bekannt'],
        to: 'brief',
      },
      brief: {
        text: '„Unter der dritten Diele. Nehmt ihn. Ich kann ihn nicht mehr ansehen."\n\n(Er dreht sich zum Fenster.)\n„Wenn ihr ihn lest — es steht am Ende ein Satz, den ich nicht mehr streichen konnte. Der ist an sie gerichtet, nicht an euch."',
        flags: ['brief_freigegeben', 'brief_bekannt'],
        end: true,
      },
    },
  },

  nella_fasswagen: {
    id: 'nella_fasswagen', speaker: 'Nella Vahl', portrait: 'nella', start: 'a',
    nodes: {
      a: {
        narration: 'Sie sitzt am Ortsrand auf einem gepackten Beutel und wartet auf einen Händler, der vor acht Tagen abgereist ist. Sie wartet seit Morgengrauen.',
        text: '„Er kommt noch. Er hat\'s versprochen. Ich hab ihm vier Silber gegeben und den besten Stein, den ich hatte, der wog genau so viel wie ein Rotkehlchen, das findet man nicht einfach so."',
        choices: [
          { text: 'Er ist weg, Nella. Vor acht Tagen.', to: 'weg' },
          { text: 'Wovor läufst du weg?', to: 'wovor' },
          { text: 'Hier — deine vier Silberstücke.', to: 'silber', if: (s) => s.flags.perrick_silber },
          { text: '[Motiv erkennen] Sie weiß es schon.', tag: '◈', check: { skill: 'motiv_erkennen', dc: 12, success: 'weiss', fail: 'weg' } },
        ],
      },
      weg: {
        text: '„Ich weiß."\n(Sie sieht die Straße hinunter.)\n„Ich sitz hier seit Sonnenaufgang und weiß das seit sechs Tagen."',
        to: 'wovor',
      },
      weiss: {
        narration: 'Sie weiß, dass er nicht kommt. Sie weiß es sehr genau, und sie sitzt trotzdem hier, weil Sitzen besser ist als nach Hause gehen.',
        text: '„Sag nichts."\n(Sie sagt es ruhig.)\n„Ich weiß es. Ich geh nur noch nicht rein."',
        to: 'wovor',
      },
      silber: {
        narration: 'Sie sieht die vier Silberstücke an und nimmt sie nicht.',
        text: '„Behaltet sie."\n(Pause.)\n„Der Stein war das Teure."',
        flags: ['nella_silber_zurueck'],
        to: 'wovor',
      },
      wovor: {
        text: '„Mutter Hesse hat mit mir geredet."\n(Sie sagt es, als wäre es nichts.)\n„Vor zwei Wochen. Sie war sehr nett. Sie ist immer nett.\n\nSie hat gesagt, ich könnte der Stadt etwas schenken, was sonst niemand kann. Und dass es nicht weh tut. Und dass sie mich sehr lieb hat."\n\n„Ich hab nein gesagt."',
        choices: [
          { text: 'Gut. Bleib dabei.', to: 'versprechen' },
          { text: 'Was hat sie dann gesagt?', to: 'dann' },
          { text: 'Weiß dein Vater das?', to: 'vater' },
        ],
      },
      dann: {
        text: '„Nichts. Sie war nicht mal böse."\n(Sie zieht die Schultern hoch.)\n„Sie hat gesagt, sie fragt nochmal. Sie fragt immer nochmal. Sie hat Zeit."',
        to: 'versprechen',
      },
      vater: {
        text: '„Der guckt mich nicht an."\n(Sie sagt es ohne Selbstmitleid, wie eine Wetterbeobachtung.)\n„Seit Monaten. Wenn er mich anguckt, guckt er knapp daneben."',
        to: 'versprechen',
      },
      versprechen: {
        text: '„Ihr geht auch wieder weg. Alle gehen wieder weg."\n(Sie sieht euch zum ersten Mal richtig an.)\n„Versprecht mir was. Egal was. Aber was Richtiges, nicht so ein Erwachsenending."',
        choices: [
          { text: '„Wir bringen dich hier raus."', to: 'ende', onPick: (s) => { s.notes.nellaPromise = 'Wir bringen dich hier raus.'; } },
          { text: '„Niemand nimmt dich mit, ohne dass wir es wissen."', to: 'ende', onPick: (s) => { s.notes.nellaPromise = 'Niemand nimmt dich mit, ohne dass wir es wissen.'; } },
          { text: '„Wir kommen zurück."', to: 'ende', onPick: (s) => { s.notes.nellaPromise = 'Wir kommen zurück.'; } },
          { text: '„Wir versprechen nichts, was wir nicht halten können."', to: 'ehrlich' },
        ],
      },
      ende: {
        narration: 'Sie nickt einmal, knapp, und steht auf und nimmt den Beutel.',
        text: '„Okay."\n(Sie geht drei Schritte und dreht sich um.)\n„Ich merk mir das wörtlich. Nur damit ihr\'s wisst."',
        flags: ['nella_versprechen', 'nella_zurueck'],
        end: true,
      },
      ehrlich: {
        narration: 'Sie sieht euch an und nickt langsam.',
        text: '„Das ist die ehrlichste Antwort, die ich je von Erwachsenen gekriegt hab."\n(Sie nimmt den Beutel.)\n„Ich hasse sie. Aber sie ist ehrlich."',
        flags: ['nella_zurueck'],
        onEnter: (s) => { s.notes.nellaPromise = '(nichts versprochen — die Wahrheit gesagt)'; },
        end: true,
      },
    },
  },

  steintuer: {
    id: 'steintuer', speaker: 'Die Steintür', start: 'a',
    nodes: {
      a: {
        narration: 'Hinter der zugemauerten Wand, die nicht mehr zugemauert ist, steht eine Tür aus einem Stein, den es in diesem Tal nicht gibt. Elf Runen sind eingeschnitten und leuchten schwach blau.\n\nEs gibt kein Schloss. Es gibt nur die Tür, und sie fühlt sich an, als würde sie zuhören.',
        text: '',
        choices: [
          { text: '[Arkane Kunde] Was öffnet sie?', tag: '◈', check: { skill: 'arkane_kunde', dc: 14, success: 'was', fail: 'nichts' } },
          { text: 'Dreimal klopfen und die Gründerformel sprechen.', to: 'formel', if: (s) => s.flags.gruenderformel },
          { text: 'Den Namen des Gefangenen aussprechen: „Ysmereth."', to: 'name', if: (s) => s.flags.handout_a },
          { text: 'Dagegenwerfen.', check: { skill: 'athletik', dc: 20, success: 'nichts', fail: 'nichts' }, tag: '◈' },
          { text: 'Zurücktreten.', exit: true },
        ],
      },
      was: {
        narration: 'Die Runen sind kein Schloss, sondern eine Rechnung. Was hier hineingeht, muss etwas dalassen — und zwar nichts Materielles.\n\nDie Tür öffnet sich für jemanden, der einen wahren Namen aufgibt. Nicht den eigenen. Einen, den er kennt und für immer vergessen wird.',
        text: '',
        flags: ['tuer_verstanden'],
        to: 'a',
      },
      nichts: {
        narration: 'Nichts geschieht. Die Tür ist einen Meter dick und interessiert sich nicht für Gewalt.',
        text: '',
        to: 'a',
      },
      formel: {
        narration: 'Dreimal klopfen. Dann, laut: „Wahl. Odowic. Brunnenmann."\n\nDie Runen erlöschen der Reihe nach, elf davon, von links nach rechts. Und die Tür geht auf, als hätte sie nie zugehabt.',
        text: '',
        flags: ['tuer_offen'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('abstieg'),
      },
      name: {
        narration: 'Jemand aus eurer Gruppe spricht den Namen aus, langsam, in drei Silben, so wie Kaspar ihn gereimt hat.\n\nDas Wasser in den Fugen hört auf zu tropfen. Alle elf Runen leuchten gleichzeitig auf — und dann öffnet sich die Tür nach innen, und dahinter ist kein Gang, sondern Licht von unten.',
        text: '',
        flags: ['tuer_offen', 'ysmereth_name_gesprochen'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('abstieg'),
      },
    },
  },
};

export const events = {
  brunnen_trinken: async (game) => {
    if (game.flag('brunnen_getrunken')) return;
    const wer = await game.ask({
      kapitel: 'Der Brunnen', titel: 'Wer trinkt?',
      text: 'Die Schale ist flach, und darin steht Wasser, das viel klarer ist, als Wasser sein sollte. Zwanzig Zentimeter tief, und man sieht keinen Boden.',
      optionen: [
        ...game.state.party.map((c) => ({ text: c.name, wert: c.id })),
        { text: 'Alle trinken.', wert: 'alle' },
        { text: 'Niemand.', wert: 'keiner', abschluss: true },
      ],
    });
    if (wer === 'keiner') {
      game.setFlag('niemand_getrunken');
      game.toast('Hesse merkt es sich. Sie fragt später beiläufig nach dem Grund.');
      return;
    }
    const { roll } = await import('../engine/rng.js');
    const trinker = wer === 'alle' ? game.state.party : game.state.party.filter((c) => c.id === wer);
    for (const c of trinker) {
      const tmp = roll('1W4').total;
      c.tempHp = Math.max(c.tempHp, tmp);
      game.state.notes.drankFromWell.push(c.name);
    }
    game.setFlag('brunnen_getrunken');
    await game.narration({
      kapitel: 'Der Brunnen', titel: 'Es tut gut',
      text: 'Das Wasser ist kälter, als es sein dürfte, und schmeckt nach nichts. Nach überhaupt nichts.\n\nDanach ist einem wärmer, und die Müdigkeit von zwei Tagen Kiefernwald ist weg.\n\n[[Und weit unter dem Stein, in einer Kammer, die seit zweihundert Jahren niemand betreten hat, hebt jemand den Kopf.]]',
    });
    game.toast(`${trinker.map((c) => c.name).join(', ')}: temporäre Trefferpunkte — und Ysmereth hat euch gesehen.`);
  },

  fest_fleisch: async (game) => {
    if (!game.state.party_inventory.some((i) => i.id === 'wolfsfleisch')) {
      game.toast('Ihr habt nichts, was ein Fest brauchen könnte.');
      return;
    }
    game.state.party_inventory = game.state.party_inventory.filter((i) => i.id !== 'wolfsfleisch');
    game.setFlag('wolfsleute');
    await game.narration({
      kapitel: 'Das Erntefest', titel: 'Neun Portionen',
      text: 'Ihr legt neun Portionen Wolfsfleisch auf den langen Tisch, und die Reaktion ist unangemessen groß.\n\nEine Frau umarmt eine von euch. Ein Mann sagt dreimal „das ist aber", ohne den Satz zu Ende zu bringen. Grust nickt einmal vom Tresen herüber, und das ist offenbar viel.\n\nAb jetzt seid ihr „die Wolfsleute". So werdet ihr in dieser Stadt genannt, bis ihr sie wieder verlasst.',
    });
    game.toast('Klarwasser mag euch. Das macht den späteren Bruch härter.');
  },

  steine_untersuchen: async (game) => {
    await game.narration({
      kapitel: 'Der Marktplatz', titel: 'Elf Steine',
      text: 'Wenn man darauf achtet, sieht man es: Im Kopfsteinpflaster liegen elf Steine aus anderem Material. Heller, glatter, größer. Sie sind nicht zufällig gesetzt — sie bilden einen sehr weiten Kreis um die Platzmitte.\n\nAm Rand des Platzes, halb unter einer Bank, liegt ein zwölfter. Ungesetzt. Als hätte jemand aufgehört.',
      knopf: 'Das ist auffällig.',
    });
    game.setFlag('gruendersteine_gesehen');
    game.quest({ id: 'ermittlung', neu: true, titel: 'Die ertrunkenen Namen', text: 'Elf Steine aus anderem Material im Pflaster des Marktplatzes. Ein zwölfter liegt ungesetzt am Rand.' });
  },

  neunter_tisch: async (game) => {
    game.setFlag('neunter_tisch_gesehen');
    await game.narration({
      kapitel: 'Zum Nassen Hut', titel: 'Der neunte Tisch',
      text: 'Neun Tische, acht benutzt.\n\nDer neunte steht sauber gewischt in der Ecke. Er ist kleiner als die anderen, und der Stuhl daran ist ein Kinderstuhl.\n\nWer sich hinsetzt, bekommt Besuch. Grust kommt, sagt nichts und wartet, bis die Person wieder aufsteht.',
    });
  },

  register: async (game) => {
    const s = game.state;
    if (s.flags.register_gelesen) {
      await game.narration({ kapitel: 'Die Kapelle', titel: 'Das Register', text: 'Ihr habt es bereits gelesen. Die elf Zeilen stehen in eurer Abschrift — oder sie stehen nirgends.' });
      return;
    }
    const { abilityCheck } = await import('../engine/rules.js');
    const leser = game.state.party.find((c) => c.id === game.state.hooks.auge) || game.state.party[0];

    const wahl = await game.ask({
      kapitel: 'Die Kapelle', titel: 'Das Kirchenregister',
      text: 'Es liegt offen im Chorraum, auf einem Pult, und es ist offensichtlich seit Jahrzehnten niemandem aufgefallen. Geburten, Hochzeiten, Sterbefälle, dreihundert Jahre lang, in vierzehn verschiedenen Handschriften.\n\nUnd dazwischen, in dunklerer Tinte, elf Zeilen, die nicht dazugehören.',
      optionen: [
        { text: 'Untersuchen — was steht da wirklich?', wert: 'lesen' },
        { text: 'Das Register stehlen. Schneller.', wert: 'stehlen', hinweis: 'Fingerfertigkeit SG 12' },
      ],
    });

    if (wahl === 'stehlen') {
      const p = abilityCheck(game.state.party.find((c) => c.id === game.state.hooks.dieb) || leser, 'fingerfertigkeit', 12);
      if (p.success) {
        s.notes.registerStolen = true;
        game.setFlag('register_gestohlen');
        game.toast('Das Register ist bei euch. Vor der versammelten Stadt wird es später fehlen.');
      } else {
        game.toast('Das Register rutscht. Eine Seite reißt. Ihr legt es zurück.');
      }
    }

    const p1 = abilityCheck(leser, 'untersuchen', 11);
    let text = 'Elf Zeilen in dunklerer Tinte, verteilt über dreihundert Jahre. Keine Geburt, keine Hochzeit, kein Sterbefall — nur ein Name und ein Datum.';
    if (!p1.success) {
      await game.narration({ kapitel: 'Die Kapelle', titel: 'Das Register', text: `${text}\n\nMehr könnt ihr im Halbdunkel des Chorraums nicht erkennen.` });
      game.setFlag('register_angesehen');
      return;
    }
    const p2 = abilityCheck(leser, 'untersuchen', 12);
    const p3 = abilityCheck(leser, 'untersuchen', 15);
    if (p2.success) {
      text += '\n\nUnd sie stehen in exakt gleichen Abständen: siebzehn Jahre. Elfmal hintereinander.\n\n' + ELF_NAMEN.join('\n');
      s.notes.namesKnown = ELF_NAMEN.slice();
    }
    if (p3.success) {
      text += '\n\nUnd darunter, in frischer Tinte, in Hesses Handschrift, zittriger als bei den anderen zehn:\n\n**1236 · Nella Vahl** — kommender Neumond, in fünf Tagen.\n\nDie Zeile wurde zweimal geschrieben und einmal ausradiert. Sie hat es zurückgenommen und dann doch wieder eingetragen.\n\nSie hat gezögert.';
      game.setFlag('nella_zeile_gefunden');
    }
    await game.narration({ kapitel: 'Die Kapelle', titel: 'Elf Zeilen', text });
    game.setFlag('register_gelesen');
    game.setFlag('ermittlung_offen');
    game.quest({ id: 'ermittlung', neu: true, titel: 'Die ertrunkenen Namen', text: 'Elf Zeilen im Kirchenregister, in Abständen von siebzehn Jahren. Die zwölfte trägt Nellas Namen.' });

    if (p2.success) await game.runEvent('registerfalle');
  },

  registerfalle: async (game) => {
    const s = game.state;
    const wahl = await game.ask({
      kapitel: 'Die Falle', titel: 'Elf Namen',
      text: 'Ihr habt sie gelesen. Ihr könntet sie laut vorlesen — oder abschreiben.\n\nAbschreiben dauert. Es ist Papier nötig, und Licht, und eine ruhige Hand.',
      optionen: [
        { text: 'Laut vorlesen, damit alle sie kennen.', wert: 'lesen' },
        { text: 'Abschreiben. Wort für Wort.', wert: 'schreiben', hinweis: 'dauert' },
      ],
    });
    if (wahl === 'lesen') {
      await game.narration({
        kapitel: 'Die Falle', titel: 'Eine Minute später',
        text: 'Du liest sie laut vor. Alle elf. Dein Begleiter nickt.\n\nDann fragst du ihn: „Wie hieß der Erste?"\n\nUnd er sagt: „Der… " und schaut dich an.\n\nUnd du siehst, dass er ihn eben noch wusste.',
      });
      s.notes.namesKnown = [];
      s.notes.namesCopied = false;
      game.setFlag('namen_verloren');
      game.toast('Die Namen sind weg. Ihr könnt es erneut versuchen — mit Feder und Papier.');
      return;
    }
    s.notes.namesCopied = true;
    s.notes.namesKnown = ELF_NAMEN.slice();
    game.setFlag('namen_abgeschrieben');
    if (game.state.flags.gewaehlt_stab) {
      await game.narration({
        kapitel: 'Die Falle', titel: 'Der Stab wird warm',
        text: 'Ihr schreibt sie ab, Wort für Wort, und als der letzte Name auf dem Papier steht, passiert etwas.\n\nDer Stab wird warm. Zum ersten Mal, seit ihr ihn habt.\n\nDie Kratzer auf dem Schaft sind keine Kratzer. Es sind elf Namen — und ihr habt sie gerade alle gelesen.',
      });
      game.staff(1);
    } else {
      await game.narration({
        kapitel: 'Die Falle', titel: 'Abgeschrieben',
        text: 'Ihr schreibt sie ab, Wort für Wort, und als der letzte Name auf dem Papier steht, bleibt er dort stehen.\n\nZwei Tagesmärsche von hier liegt ein Stab aus weißem Kieselstein in einem Steintrog, und in diesem Moment wird er ein Grad wärmer, als er sein dürfte.',
      });
    }
    game.quest({ id: 'ermittlung', text: 'Die elf Namen sind abgeschrieben. (Das zahlt sich dreimal aus: gegen die Ertrunkene Mutter, gegen die Fesseln, und im Endkampf.)' });
  },

  kiesel_schale: async (game) => {
    await game.narration({
      kapitel: 'Hesses Kammer', titel: 'Elf Kiesel',
      text: 'In ihrer Kammer, auf dem Fensterbrett, steht eine flache Schale mit elf Flusskieseln.\n\nSie sind nach Gewicht sortiert. Nicht nach Größe, nicht nach Farbe. Nach Gewicht.\n\n[[Nella sortiert Kiesel nach Gewicht. Niemand hat es ihr beigebracht.]]',
    });
    game.setFlag('kiesel_gesehen');
    game.quest({ id: 'ermittlung', text: 'Mutter Hesse bewahrt elf Flusskiesel auf, nach Gewicht sortiert. Genau wie Nella sie sortiert.' });
  },

  glocke: async (game) => {
    await game.narration({
      kapitel: 'Die Kapelle', titel: 'So weit ich klinge',
      text: 'Die Glocke ist von 1042 und hängt so tief, dass man die Inschrift lesen kann, wenn man den Kopf in den Nacken legt:\n\n**„so weit ich klinge"**\n\nKaspars Hütte liegt außerhalb ihrer Reichweite. Das ist keine Bequemlichkeit. Das ist eine Grenze.',
    });
    game.setFlag('glocke_untersucht');
    game.quest({ id: 'ermittlung', text: 'Die Kapellenglocke trägt die Inschrift „so weit ich klinge". Kaspar wohnt außerhalb ihrer Reichweite.' });
  },

  kerben: async (game) => {
    await game.narration({
      kapitel: 'Kaspars Hütte', titel: 'Hundertsiebenundachtzig',
      text: 'An der Innenwand stehen Kerben in Gruppen zu elf, mit Kreide durchgestrichen und neu gezogen, weil er sich immer wieder verzählt.\n\nEs sind hundertsiebenundachtzig.\n\n187 = 11 × 17.',
    });
    game.setFlag('kerben_gezaehlt');
    game.quest({ id: 'ermittlung', text: '187 Kerben in Elfergruppen. 187 = 11 × 17.' });
  },

  dritte_diele: async (game) => {
    const { abilityCheck } = await import('../engine/rules.js');
    const c = game.state.party.find((x) => x.id === game.state.hooks.dieb) || game.state.party[0];
    const p = abilityCheck(c, 'fingerfertigkeit', game.flag('brief_freigegeben') ? 5 : 14);
    if (!p.success) {
      game.toast('Die Diele sitzt fest. Vielleicht muss man ihn erst zum Reden bringen.');
      return;
    }
    await game.narration({
      kapitel: 'Die Vahl-Mühle', titel: 'Der versiegelte Brief',
      text: 'Unter der dritten Diele liegt ein Brief, zweimal gesiegelt, an eine Empfängerin adressiert, die ihn erst nach seinem Tod lesen soll.\n\nEr beschreibt den Pakt vollständig: die zweihundert Jahre, die siebzehn Jahre, den Brunnen, das Vergessen. Er ist in der Handschrift von jemandem geschrieben, dem beim Schreiben die Hand ruhiger wurde, nicht unruhiger.\n\nDer letzte Satz lautet:\n\n**„Wenn du das liest, dann verzeih mir, dass ich gehofft habe, es sei jemand anderes."**',
    });
    game.setFlag('brief_gefunden');
    game.item({ id: 'tobreks_brief', name: 'Tobreks versiegelter Brief', desc: 'Beschreibt den Pakt vollständig. In der Bürgerversammlung ein Beweisstück.' });
    game.quest({ id: 'ermittlung', text: 'Tobreks Brief beschreibt den Pakt vollständig. Er wusste es seit sieben Monaten.' });
  },

  lange_rast: async (game) => {
    if (!game.flag('nacht_der_kleinen') && game.flag('nella_kennengelernt')) {
      await game.runEvent('nacht_der_kleinen');
      return;
    }
    await game.rast(true);
  },

  /** Sitzung 2, Nacht: Die Nassen Kleinen — und am Morgen Miri. */
  nacht_der_kleinen: async (game) => {
    game.setFlag('nacht_der_kleinen');
    await game.narration({
      kapitel: 'Die Nacht', titel: 'Es hat geregnet',
      text: 'Ihr nehmt ein Zimmer im Nassen Hut. Es ist sauber und riecht nach Lavendel, und Grust nimmt weniger dafür, als er sollte.\n\nGegen zwei Uhr wacht eine von euch auf, weil unten auf der Straße Wasser läuft.\n\nEs hat nicht geregnet.',
      knopf: 'Hinuntergehen',
    });
    const r = await game.startCombat('nachtangriff');
    if (r === 'sieg') {
      await game.narration({
        kapitel: 'Die Nacht', titel: 'Niemand kommt heraus',
        text: 'Die halbe Straße hat es gehört. Zwei Fensterläden haben sich geöffnet und wieder geschlossen.\n\nNiemand kommt heraus. Niemand ruft. Niemand fragt am nächsten Morgen, was das war — bis auf einen Nachbarn, der beim Brotholen sagt, es seien wohl Marder gewesen.\n\nMarder.',
      });
    }
    await game.rast(true);
    await game.runEvent('miri');
  },

  miri: async (game) => {
    game.setFlag('miri_verschwunden');
    await game.narration({
      kapitel: 'Der Morgen', titel: 'Erster Schnitt',
      text: 'Früh. Eine Frau rennt durch die Gassen und ruft einen Namen.\n\n„MIRI! — MIRI!"\n\nNachbarn helfen suchen. Türen gehen auf. Jemand läuft zum Bach. Es ist völlig normal und völlig menschlich, und es ist das erste Mal, seit ihr hier seid, dass jemand in dieser Stadt laut ist.',
    });
    await game.narration({
      kapitel: 'Der Morgen', titel: 'Zweiter Schnitt',
      text: 'Mittag. Ihr seid irgendwo — es spielt keine Rolle, wo.\n\nDraußen ruft die Frau immer noch.\n\nUnd dann bricht der Ruf mitten im Wort ab.\n\n\n\n\n(Es bleibt still. Länger, als bequem ist.)',
    });
    await game.narration({
      kapitel: 'Der Morgen', titel: 'Dritter Schnitt',
      text: 'Danach.\n\nDie Frau steht mit einem Korb auf der Straße und schaut sich um wie jemand, der vergessen hat, warum er ein Zimmer betreten hat.\n\nSie sieht euch und lächelt entschuldigend.\n\n„Schöner Tag, nicht?"',
    });
    const antwort = await game.ask({
      kapitel: 'Haus Grast', titel: 'Zwei Betten',
      text: 'Die Tür steht offen. In der Stube rührt die Frau in einem Topf und summt.\n\nIn der Kammer stehen zwei Betten. Auf einem liegt eine Puppe.',
      optionen: [
        { text: '„Für wen ist das zweite Bett?"', wert: 'bett' },
        { text: '„Wie hieß Eure Tochter?"', wert: 'name' },
        { text: 'Nichts sagen und gehen.', wert: 'gehen', abschluss: true },
      ],
    });
    if (antwort === 'bett') {
      await game.narration({
        kapitel: 'Haus Grast', titel: '„Das war schon immer da."',
        text: '(Sie hält inne. Sie schaut das Bett an. Sie schaut lange.)\n\n„Das war schon immer da."\n\n(Und dann rührt sie weiter, und das Summen setzt genau in der Zeile wieder ein, in der es aufgehört hat.)',
      });
    } else if (antwort === 'name') {
      await game.narration({
        kapitel: 'Haus Grast', titel: 'Die falsche Frage',
        text: '„Meine Tochter?"\n\n(Sie lacht, freundlich, ein bisschen verwirrt.)\n\n„Ich hab keine Tochter, Kindchen. Ich hätte gern eine gehabt."\n\n(Und dann, viel leiser, ohne dass sie merkt, dass sie es sagt:)\n\n„…zwei sogar."',
      });
    }
    // Die eigentliche Frage geht an die Spielenden.
    const gemerkt = await game.ask({
      kapitel: 'Sitzungsende', titel: 'Wie hieß das Mädchen?',
      text: 'Ohne Wurf. Ohne Probe.\n\nWie hieß sie?',
      optionen: [
        { text: 'Miri. Miri Grast.', wert: true },
        { text: '…Ich weiß es nicht mehr.', wert: false, abschluss: true },
      ],
    });
    if (gemerkt) {
      game.setFlag('miri_name_behalten');
      game.state.notes.miri = 'Miri Grast, neun Jahre. Ihr habt euch den Namen aufgeschrieben.';
      game.quest({
        id: 'ermittlung', neu: true, titel: 'Die ertrunkenen Namen',
        text: 'Miri Grast, neun Jahre, ist verschwunden. Ihre Mutter weiß nicht mehr, dass sie existiert hat. Ihr habt den Namen aufgeschrieben — ihr seid die Einzigen, die ihn noch haben.',
      });
    } else {
      game.quest({
        id: 'ermittlung', neu: true, titel: 'Die ertrunkenen Namen',
        text: 'Ein Mädchen ist verschwunden. Niemand in Klarwasser erinnert sich an sie — und ihr habt euch den Namen nicht aufgeschrieben.',
      });
      game.tick('zeichen_ignoriert');
    }
    await game.narration({
      kapitel: 'Ende von Sitzung 2', titel: '',
      text: 'Ihr steht auf der Straße. Über euch hängen noch die Wimpel vom Erntefest.\n\n'
        + (game.flag('gewaehlt_stab')
          ? 'Und irgendwo in eurem Gepäck wird ein Stab aus weißem Stein ein bisschen wärmer.'
          : 'Und zwei Tagesmärsche von hier, in einem Steintrog, wird ein Stab aus weißem Stein ein bisschen wärmer.'),
      knopf: 'Weiter',
    });
    game.state.session = 3;
    game.setFlag('ermittlung_offen');
    game.setFlag('nella_wartet');
  },

  grust_gestaendnis: async (game) => {
    game.setFlag('grust_gestaendnis');
    await game.narration({
      kapitel: 'Zum Nassen Hut', titel: 'Renn',
      text: 'Er wischt während der ganzen Szene Gläser.\n\n„Fünf war er. Ich war vierzehn. Er konnte den Berg nicht hoch, also hab ich ihn getragen. Auf den Schultern. Er hat die ganze Zeit geredet, über irgendwas, ich weiß nicht mehr worüber."\n\n„Am Brunnen hab ich ihn abgesetzt. Und die Frau hat was gesagt, und er hat genickt, und dann ist er reingestiegen. In zwanzig Zentimeter Wasser. Und war weg."\n\n(Er stellt das Glas ab.)\n\n„Und dann bin ich nach Hause gegangen. Und meine Mutter hat gefragt, wo ich war. Nicht wo **er** war. Wo **ich** war."\n\n„Ich hab dreißig Jahre gedacht, ich hätt\'s mir eingebildet. Weil sonst wär ich ja jemand, der seinen Bruder getragen hat."',
      knopf: 'Nichts sagen',
    });
    game.item({ id: 'kellerschluessel', name: 'Schlüssel zu den Altkellern', desc: 'Grust hat ihn seit dreißig Jahren. Mitkommen will er noch nicht.' });
    game.setFlag('kellerschluessel');
    game.quest({ id: 'ermittlung', text: 'Grust hat 1185 seinen fünfjährigen Halbbruder Renn Odowic zum Brunnen getragen. Er erinnert sich an das Gewicht, aber nicht an das Gesicht. Er hat euch den Kellerschlüssel gegeben.' });
  },

  kellerkampf: async (game) => {
    const r = await game.startCombat('muehlkeller');
    if (r !== 'sieg') return;
    game.setFlag('kellerkampf');
    await game.narration({
      kapitel: 'Die Mühlkeller', titel: 'Danach',
      text: 'Das Wasser steht euch jetzt bis zur Hüfte und steigt weiter. Am Ostende der Kammer ist eine Öffnung im Mauerwerk, die nicht gemauert, sondern gebrochen wurde — von der anderen Seite.\n\nDahinter geht es weiter, auf den Brunnenschacht zu.',
    });
    await game.levelUp(3);
    game.quest({ id: 'ermittlung', text: 'Die Altkeller verbinden sich mit dem Brunnenschacht. Hinter der Brunnenwand liegt eine zweite Kammer.' });
  },

  kritzeleien: async (game) => {
    await game.narration({
      kapitel: 'Die Mühlkeller', titel: 'Kindshoch',
      text: 'An der Wand, einen knappen Meter über dem Wasserspiegel, stehen Kritzeleien. Sie sind mit einem Nagel in den Putz geritzt, in der Handschrift eines Kindes, das noch nicht lange schreiben kann.\n\n**EFFE WAR HIER**\n**TAG 1 · TAG 2 · TAG 3**\n\nDarunter, viel kleiner, mit sehr festem Druck:\n\n**sie suchen mich alle**',
    });
    game.setFlag('effe_kritzeleien');
    game.quest({ id: 'ermittlung', text: 'Effe Grast hat sich 1134 drei Tage in diesen Kellern versteckt. Die halbe Stadt hat sie gesucht. Und gefunden.' });
  },

  zaehlperlen: async (game) => {
    await game.narration({
      kapitel: 'Die Mühlkeller', titel: 'Sieben Perlen aus Flussstein',
      text: 'Im Schlamm neben einem umgestürzten Fass liegt eine Kette aus sieben Perlen.\n\nSie ist offensichtlich Mutter Hesses. Sie ist offensichtlich hier unten verloren worden. Und sie ist offensichtlich nicht erklärbar — denn eine einundsiebzigjährige Priesterin hat in überfluteten Altkellern nichts zu suchen.',
    });
    game.item({
      id: 'zaehlperlen', name: 'Zählperlen der Mutter',
      desc: 'Einmal pro langer Rast einen misslungenen Rettungswurf wiederholen. Bei der siebten Perle reißt die Kette.',
    });
    game.gold(90);
  },

  abstieg: async (game) => {
    const s = game.state;
    // Preis der Tür: ein wahrer Name, den jemand kennt und für immer vergisst.
    if (!s.flags.tuer_bezahlt) {
      const wer = await game.ask({
        kapitel: 'Die Steintür', titel: 'Der Preis',
        text: 'Die Tür ist offen. Aber der Gang dahinter ist es noch nicht — zwischen euch und dem Licht von unten liegt eine Schwelle, und die Schwelle will etwas.\n\nEinen wahren Namen. Nicht den eigenen, sondern einen, den ihr kennt und für immer vergessen werdet.',
        optionen: game.state.party.map((c) => ({ text: `${c.name} gibt einen Namen her.`, wert: c.id })),
      });
      const c = game.state.party.find((x) => x.id === wer);
      const name = await inputModal(game, {
        kapitel: 'Die Steintür', titel: `Welchen Namen gibt ${c.name} her?`,
        text: 'Schreibt ihn auf. Es muss jemand sein, den diese Figur kennt — eine Mutter, ein Bruder, eine Lehrerin, jemand aus dem Dorf, aus dem sie kommt.\n\n[[Ihr werdet diesen Namen im Epilog wiedersehen.]]',
        platzhalter: 'Ein Name',
        vorschlaege: ['Meine Mutter', 'Mein erster Lehrmeister', 'Die Frau, die mich aufgenommen hat', 'Mein Bruder'],
      });
      s.notes.sacrificedNames[c.name] = name;
      game.setFlag('tuer_bezahlt');
      await game.narration({
        kapitel: 'Die Steintür', titel: 'Gegeben',
        text: `${c.name} spricht den Namen aus, und dann ist er weg.\n\nNicht vergessen im gewöhnlichen Sinn — es ist kein Loch da, an dem man tasten könnte. Es ist einfach nichts, wo etwas war, und ${c.name} weiß, dass etwas fehlt, und kann nicht sagen, was.\n\n[[Notiert: ${name}]]`,
      });

      if (s.flags.ghortan_dabei) {
        await game.narration({
          kapitel: 'Die Steintür', titel: 'Ghortans Opfer',
          text: 'Ghortan tritt vor, bevor jemand ihn fragen kann, und nimmt die Hand der Person neben sich.\n\n„Meine Mutter… möge sie vergessen sein."\n\nSchwarze Flamme umhüllt seine Hand. Der Name geht weg. Er sackt in die Knie und bleibt dort, länger als nötig, und niemand sagt etwas.\n\nEs sieht aus wie eine schmerzliche Lossagung.\n\n[[Der Schmerz ist echt.]]',
        });
        game.setFlag('ghortan_opfer');
      }
    }
    await game.goToArea('spiegelhof');
  },
};

export const combats = {
  nachtangriff: (game) => {
    const map = makeMap(24, 14);
    paintRect(map, 6, 2, 8, 4, TERRAIN.WAND);
    paintRect(map, 16, 9, 19, 11, TERRAIN.WAND);
    paintRect(map, 11, 6, 13, 8, TERRAIN.WASSER);
    return {
      title: 'Die Nassen Kleinen',
      map,
      playerStart: [{ x: 4, y: 7 }, { x: 4, y: 8 }, { x: 5, y: 7 }],
      enemies: [
        { id: 'nasser_kleiner', x: 14, y: 5 }, { id: 'nasser_kleiner', x: 16, y: 7 }, { id: 'nasser_kleiner', x: 15, y: 9 },
      ],
      allies: game.state.flags.ghortan_dabei ? [{ id: 'ghortan_begleiter', x: 5, y: 9 }] : [],
      scenario: {
        onFlee: (combat, c) => {
          combat.logLine('gegner', `${c.name} taucht in zwanzig Zentimeter Wasser und ist weg. Wer nachfasst, greift auf Steinboden.`);
        },
      },
      intro: {
        kapitel: 'Die Nacht', titel: 'Drei Gestalten',
        text: 'Drei Gestalten, kniehoch, kommen aus dem Wasser. Sie tragen Kinderkleidung, durchweicht und viel zu alt geschnitten. Was darin steckt, ist Schlamm und Wasser und sonst nichts.\n\nEine legt den Kopf schief und spricht — und es klingt fast wie dein Name, nur falsch ausgesprochen.\n\n[[Sie sind verwundbar gegen Feuer. Und sie fliehen, sobald offenes Feuer entzündet wird.]]',
        knopf: 'Kämpfen',
      },
    };
  },

  muehlkeller: (game) => {
    const map = makeMap(30, 12);
    for (let y = 1; y < 11; y++) {
      for (let x = 1; x < 29; x++) {
        if (x < 8 || x > 22 || y < 3 || y > 8) map.tiles[y * 30 + x] = TERRAIN.WASSER;
      }
    }
    paintRect(map, 10, 4, 13, 5, TERRAIN.WAND);
    paintRect(map, 17, 6, 20, 7, TERRAIN.WAND);
    return {
      title: 'Die überfluteten Mühlkeller',
      map,
      playerStart: [{ x: 3, y: 5 }, { x: 3, y: 6 }, { x: 4, y: 5 }],
      enemies: [
        { id: 'ertrunkener_waechter', x: 20, y: 5 },
        { id: 'nasser_kleiner', x: 22, y: 3 },
        { id: 'nasser_kleiner', x: 21, y: 8 },
      ],
      allies: game.state.flags.ghortan_dabei ? [{ id: 'ghortan_begleiter', x: 4, y: 7 }] : [],
      scenario: {
        wet: true,
        onRoundStart: (combat, runde) => {
          if (runde === 3) {
            combat.logLine('umgebung', 'Das Wasser steigt. Der ganze Keller ist jetzt schwieriges Gelände.');
            for (let i = 0; i < combat.map.tiles.length; i++) {
              if (combat.map.tiles[i] === TERRAIN.FREI) combat.map.tiles[i] = TERRAIN.SCHWIERIG;
            }
          }
          if (runde === 5) {
            combat.logLine('umgebung', 'Hüfthoch. Ab jetzt wird geschwommen — halbe Bewegung für alle.');
            combat.scenario.deepWater = true;
            for (const c of combat.combatants) if (c.isPlayer) c.speed = Math.max(2, Math.floor(c.speed / 2));
          }
          if (runde === 8) combat.logLine('umgebung', 'Es ist Zeit, hier rauszukommen.');
        },
      },
      intro: {
        kapitel: 'Sitzung 3', titel: 'Kniehoch. Sicht drei Meter.',
        text: 'Der Kellerschlüssel passt, und dahinter steht das Wasser. Kniehoch, kalt, und es riecht nach Eisen.\n\nEtwas bewegt sich darin, und es bewegt sich nicht wie ein Tier — es bewegt sich wie jemand, der einen Auftrag hat.\n\n[[Das Wasser steigt. Ab Runde 3 ist alles schwieriges Gelände, ab Runde 5 wird geschwommen. Das ist Fluchtdruck, keine Todesfalle.]]',
        knopf: 'Hinabsteigen',
      },
    };
  },
};

export const areaEnter = {
  dorfeingang: async (game) => {
    if (game.flag('ankunft')) return;
    game.setFlag('ankunft');
    game.state.session = 2;
    await game.narration({
      kapitel: 'Sitzung 2 — Ankunft', titel: 'Klarwasser',
      text: 'Der Weg biegt aus dem Kiefernwald, und da liegt es: Klarwasser, in eine Mulde des Silberkamms geschmiegt, achtzig Häuser mit blaugrauen Schindeln. Zwischen den Dächern hängen Wimpel. Irgendwo spielt jemand entschlossen und schlecht auf einer Fiedel. Es riecht nach heißem Fett und Äpfeln.\n\nAm Ortseingang steht ein Brunnen aus weißem Stein — kein Eimer, kein Seil, nur eine flache Schale, in der Wasser steht, das viel klarer ist, als Wasser sein sollte.'
        + (game.flag('gewaehlt_stab')
          ? '\n\nUnd der Stab in eurem Gepäck, der seit dem Waldweg leise mitsummt, findet einen Ton und hält ihn.'
          : '\n\nUnd zwei Tagesmärsche hinter euch, in einem Steintrog an einer Weggabelung, fängt etwas an zu summen.'),
      knopf: 'Hineingehen',
    });
    game.setFlag('ankunft_erledigt');
  },

  marktplatz: async (game) => {
    if (game.flag('fest_begonnen')) return;
    game.setFlag('fest_begonnen');
    game.setFlag('perrick_da');
    await game.narration({
      kapitel: 'Das Erntefest', titel: 'Fünf Angebote',
      text: 'Der Marktplatz ist voll, und es ist die gute Art von voll. Drei Stände, ein Feuer, lange Tische. Ein Mädchen hat sich zwischen zwei Marktstände gesetzt und dreißig Kiesel aufgereiht.\n\nEin Alter torkelt durchs Fest und ruft etwas über Zahlen. Der Bürgermeister steigt auf eine Kiste.\n\nNiemand streitet. In drei Stunden wird niemand streiten.',
    });
  },

  nasser_hut: async (game) => {
    if (game.flag('hut_betreten')) return;
    game.setFlag('hut_betreten');
    await game.narration({
      kapitel: 'Zum Nassen Hut', titel: 'Neun Tische, acht benutzt',
      text: 'Grusts Reich. Warm, niedrig, gut gehalten. Der Wirt ist einen Kopf größer als alle anderen und leiser als alle anderen.\n\nNeun Tische. Acht davon sind besetzt oder abgewischt und bereit.\n\nDer neunte steht sauber gewischt in der Ecke, und der Stuhl daran ist ein Kinderstuhl.',
    });
  },

  muehlkeller: async (game) => {
    if (game.flag('keller_betreten')) return;
    game.setFlag('keller_betreten');
    await game.narration({
      kapitel: 'Die Altkeller', titel: 'Unter der Mühle',
      text: 'Die Luke gibt nach, und darunter ist kein Keller, sondern ein Gang. Er ist älter als die Mühle. Er ist älter als alles hier oben.\n\nDas Wasser steht kniehoch und ist vollkommen klar, und man sieht trotzdem nur drei Meter weit, weil es kein Licht gibt außer dem, das ihr mitbringt.',
    });
  },
};
