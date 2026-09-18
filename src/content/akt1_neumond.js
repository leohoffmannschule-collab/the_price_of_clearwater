// AKT I — SITZUNG 5: DIE LETZTE GABE & DER VERRAT
// Vier Auflösungen. Plane keine. Lass die Gruppe wählen.

import { makeMap, paintRect, TERRAIN } from '../engine/combat.js';
import { abilityCheck } from '../engine/rules.js';
import { roll } from '../engine/rng.js';

export const dialogues = {
  neumond_hesse: {
    id: 'neumond_hesse', speaker: 'Mutter Aldwina Hesse', portrait: 'hesse', start: 'a',
    nodes: {
      a: {
        narration: 'Die Kapelle ist bis auf zwei Kerzen dunkel. Nella schläft auf einer Bank, den Kopf auf ihrem eigenen Arm, ordentlich zugedeckt mit einem Umhang, der Hesse gehört.\n\nHesse steht am Altar und dreht sich nicht um, als ihr eintretet.',
        text: '„Ihr seid pünktlich. Das ehrt euch."\n(Sie streicht eine Falte im Altartuch glatt.)\n„Setzt euch, oder bleibt stehen. Ich rede sowieso."',
        choices: [
          { text: 'Zuhören.', to: 'rechnung' },
          { text: '„Wecken Sie sie auf. Sofort."', to: 'sofort' },
          { text: '„Wie viele waren es, bevor Sie anfingen?"', to: 'vorher' },
        ],
      },
      sofort: {
        text: '„Nein."\n(Zum ersten Mal, seit ihr sie kennt, klingt sie hart.)\n„Sie schläft zum ersten Mal seit vier Tagen. Ihr lasst sie schlafen, und ihr hört mir zu, und danach tut ihr, was ihr für richtig haltet. Ich werde euch nicht aufhalten."',
        to: 'rechnung',
      },
      vorher: {
        text: '„Zehn. Ilva Mohl war meine erste, 1202. Ich war siebenunddreißig."\n(Pause.)\n„Mein Vorgänger, Pater Melm, war ein Jahr zuvor gestorben. Er hat mir das Register hinterlassen und ein einziges Wort:\n\n‚Rechne.‘"',
        flags: ['hesse_melm'],
        to: 'rechnung',
      },
      rechnung: {
        narration: 'Und dann rechnet sie vor. Sie hat es oft gerechnet. Sie braucht keine Zahlen von einem Zettel.',
        text: '„Wisst ihr, wie viele Kinder in Dornfeld letzten Winter am Fieber gestorben sind? Vierzig.\n\nVierzig, Kindchen. In einem Dorf, das halb so groß ist wie dieses.\n\nIch zahle einen alle siebzehn Jahre. Rechnet es mir vor, wenn ihr könnt."',
        choices: [
          { text: '[Überzeugen] Gegenrechnen: Zahlen gegen Zahlen.', tag: '◈', once: true, check: { skill: 'ueberzeugen', dc: 30, success: 'a2', fail: 'gegenrechnen' } },
          { text: '„Warum trinken Sie selbst nie?"', to: 'trinken', once: true },
          { text: '„Und wenn es diesmal aufhört?"', to: 'aufhoert', once: true },
          { text: '„Sie haben elf Kinder überredet. Sie sind gut darin."', to: 'freiwilligkeit' },
        ],
      },
      gegenrechnen: {
        narration: 'Ihr rechnet gegen. Ihr rechnet gut.\n\nSie hört zu, nickt an den richtigen Stellen, und am Ende hat sie immer noch recht. Das ist kein Wurf, den man gewinnen kann — die Rechnung geht auf. Sie geht seit zweihundert Jahren auf.',
        text: '„Seht ihr. Das ist das Schlimme daran."',
        to: 'rechnung',
      },
      trinken: {
        text: '„Weil ich nicht möchte, dass es mir gut geht."\n(Sie sagt es sofort, diesmal.)\n„Vierzig Jahre keinen Schluck. Das ist keine Buße, das ist Buchführung. Ich bezahle nicht mit, und deshalb darf ich auch nichts davon haben."',
        flags: ['hesse_riss'],
        to: 'rechnung',
      },
      aufhoert: {
        text: '„Dann verarmt Klarwasser über zehn Jahre, und in fünfzehn stirbt hier zum ersten Mal ein Kind am Fieber, und ich werde es nicht mehr erleben, und ihr auch nicht.\n\nDas ist keine Drohung. Das ist die andere Spalte."',
        to: 'rechnung',
      },
      freiwilligkeit: {
        narration: 'Und jetzt bricht sie. Nicht laut. Sie legt nur das Altartuch hin, sehr ordentlich, an die Stelle, wo es hingehört.',
        text: '„Ilva Mohl hat zweimal nein gesagt."\n(Pause.)\n„Beim dritten Mal habe ich ihr gesagt, dass ihre Mutter es sich wünscht.\n\nDas war gelogen. Das ist die einzige Lüge, die ich je gesagt habe.\n\nUnd danach bin ich still gewesen, weil ich es wusste."',
        flags: ['hesse_gebrochen'],
        choices: [
          { text: '„Dann war keine einzige Zahlung freiwillig."', to: 'nicht_freiwillig' },
          { text: 'Nichts sagen.', to: 'nicht_freiwillig' },
        ],
      },
      nicht_freiwillig: {
        narration: 'Sie setzt sich auf die Stufe vor dem Altar, einundsiebzig Jahre alt, und sieht zu dem Mädchen hinüber, das auf der Bank schläft.',
        text: '„Vielleicht.\n\nDer Vertrag sagt ‚gegeben, nicht genommen‘. Ich habe vierzig Jahre lang darauf geachtet, dass jedes Kind ja sagt. Ich war sehr gut darin, ein Kind zum Ja zu bringen.\n\nOb das dasselbe ist wie freiwillig — das ist eure Frage. Ich habe sie mir nicht gestellt. Ich hatte eine Stadt zu versorgen."\n\n(Sie steht wieder auf.)\n\n„Nella wacht in einer Stunde auf. Dann fragt sie mich zum dritten Mal, ob sie muss, und dann sagt sie ja.\n\nWas tut ihr?"',
        flags: ['aufloesung_bereit'],
        end: true,
        onExit: (s, ctx) => ctx.game?.runEvent('die_letzte_gabe'),
      },
      a2: { text: '(Sie sieht euch lange an.)\n„…Nein. Es geht nicht auf. Aber nicht, weil ihr besser gerechnet habt."', to: 'freiwilligkeit' },
    },
  },
};

export const events = {
  /* ─────────────── Die vier Auflösungen ─────────────── */
  die_letzte_gabe: async (game) => {
    const s = game.state;
    const optionen = [];
    optionen.push({
      text: 'Die Ersetzung — einer von uns gibt seinen Namen statt Nellas.',
      wert: 'A', hinweis: 'Der Vertrag sagt „ein Name", nicht „ein Kind"',
    });
    optionen.push({
      text: 'Die Befreiung — die Bindung brechen, was auch immer das kostet.',
      wert: 'B', hinweis: 'Klarwasser verarmt',
    });
    if (s.flags.luecke_schenken || s.flags.pakt_gelesen) {
      optionen.push({
        text: 'Der Bruch — Ysmereth beim Wort nehmen: schenken statt zurückverlangen.',
        wert: 'C', hinweis: 'Fertigkeitswettstreit, drei Erfolge',
      });
    }
    optionen.push({
      text: 'Die Stadt entscheidet — Bürgerversammlung, mitten in der Nacht.',
      wert: 'D', hinweis: 'Vier Runden vor zweihundert Leuten',
    });
    optionen.push({ text: 'Umdrehen und gehen. Sie hat gesagt, sie hält euch nicht auf.', wert: 'X', abschluss: true });

    const wahl = await game.ask({
      kapitel: 'Neumond', titel: 'Die letzte Gabe',
      text: 'Eine Stunde. Mehr habt ihr nicht.\n\nDraußen ist der Mond weg. Der Brunnen am Ortseingang steht voll bis zum Rand, obwohl es seit elf Tagen nicht geregnet hat.',
      optionen,
    });
    if (wahl === 'X') return game.runEvent('aufloesung_X');
    return game.runEvent(`aufloesung_${wahl}`);
  },

  aufloesung_A: async (game) => {
    const s = game.state;
    const wer = await game.ask({
      kapitel: 'Die Ersetzung', titel: 'Wer?',
      text: 'Der Vertrag sagt „ein Name aus Klarwasser". Nirgends steht **Kind**.\n\nWer ihn heute Nacht gibt, verschwindet aus jeder Erinnerung — außer aus der der eigenen Gefährten, und auch das nur, wenn sie den Namen aufgeschrieben haben.',
      optionen: [
        ...s.party.map((c) => ({ text: `${c.name} tritt vor.`, wert: c.id })),
        { text: 'Doch nicht. Anders.', wert: 'zurueck', abschluss: true },
      ],
    });
    if (wer === 'zurueck') return game.runEvent('die_letzte_gabe');
    const c = s.party.find((x) => x.id === wer);
    const aufgeschrieben = s.notes.namesCopied;
    await game.narration({
      kapitel: 'Die Ersetzung', titel: 'Gegeben, nicht genommen',
      text: `Der Brunnen am Ortseingang hat zwanzig Zentimeter Wasser und keinen sichtbaren Boden.\n\n${c.name} steigt hinein. Es ist lächerlich flach. Es sieht albern aus, bis zu dem Moment, in dem es das nicht mehr tut.\n\nEine sehr höfliche Stimme sagt: „Angenommen. Es war freiwillig. Das ist selten, und ich werde es mir merken."\n\nUnd dann ist da niemand mehr, und die Bindung hält weitere siebzehn Jahre, und Klarwasser wird morgen früh nicht wissen, dass es etwas bekommen hat.`
        + (aufgeschrieben
          ? `\n\n[[Ihr habt die Namen abgeschrieben. Ihr behaltet ${c.name}. Ihr seid die Einzigen.]]`
          : '\n\n[[Ihr habt nichts aufgeschrieben. In drei Tagen werdet ihr euch fragen, warum ihr zu dritt wart und jetzt zu zweit seid, und ihr werdet keine Antwort finden.]]'),
      knopf: 'Weiter',
    });
    c.dead = true;
    c.gegeben = true;
    s.notes.gegeben = c.name;
    game.setFlag('ende_a');
    game.setFlag('bindung_haelt');
    game.setFlag('akt1_geloest');
    game.quest({ id: 'ermittlung', fertig: true, text: `${c.name} hat seinen Namen gegeben. Die Bindung hält weitere siebzehn Jahre. Nella lebt.` });
    await game.ending('akt1_ersetzung');
    await game.runEvent('buch_zerfaellt');
    await game.runEvent('der_verrat');
  },

  aufloesung_B: async (game) => {
    await game.narration({
      kapitel: 'Die Befreiung', titel: 'Der Bannkreis',
      text: 'Ihr geht zum Brunnen und brecht auf, was drei Gründer in zwei Jahren gebaut haben.\n\nEs ist keine große Sache. Ein Bannkreis ist Handwerk, und Handwerk kann man zerstören.\n\nUnd während ihr dabei seid, kommt jemand die Straße herunter, sehr schnell für einundsiebzig Jahre.',
    });
    const r = await game.startCombat('ertrunkene_mutter');
    if (r !== 'sieg') {
      await game.narration({
        kapitel: 'Die Befreiung', titel: 'Sie hat gewonnen',
        text: 'Ihr wacht am Morgen auf der Straße auf. Der Brunnen ist heil. Der Bannkreis ist heil.\n\nUnd an Nella Vahl erinnert sich niemand mehr.',
      });
      game.setFlag('nella_verschwunden');
      game.setFlag('harter_weg');
    } else {
      await game.narration({
        kapitel: 'Die Befreiung', titel: 'Elf kommen zurück',
        text: 'Der Bannkreis reißt, und der Brunnen läuft über — nicht viel, nur ein Schwall, der über den Rand kommt und auf den Steinen stehen bleibt.\n\nUnd dann steigen elf Kinder heraus. Nacheinander. In Kleidung, die seit zweihundert Jahren aus der Mode ist.\n\nSie sehen sich um, in einer Stadt, die sie nicht kennt, vor Häusern, in denen ihre Familien vor sechs Generationen gewohnt haben.\n\nEines von ihnen sagt: „Unfair." Und diesmal weiß es, was das heißt.',
      });
      game.setFlag('kinder_zurueck');
    }
    game.setFlag('ende_b');
    game.setFlag('bindung_gebrochen');
    game.setFlag('akt1_geloest');
    await game.ending('akt1_befreiung');
    await game.runEvent('buch_zerfaellt');
    await game.runEvent('der_verrat');
  },

  aufloesung_C: async (game) => {
    const s = game.state;
    await game.narration({
      kapitel: 'Der Bruch', titel: 'Fragt mich richtig',
      text: 'Ihr geht hinunter, zum dritten Mal, und diesmal sitzt er nicht mit dem Rücken zu euch.\n\nEr hat die elf Gläser abgeräumt. Auf dem Tisch liegt nichts mehr.\n\n„Ihr wollt verhandeln. Gut. Ich bin verpflichtet, genau das zu tun, was gesagt wurde — also sagt es sorgfältig.\n\nDrei Punkte. Danach steht das Ergebnis."',
    });
    let erfolge = 0;
    const runden = [
      {
        titel: 'Erstens: die Formulierung',
        text: 'Der Vertrag verbietet das Zurückverlangen. Er verbietet nicht das Schenken.',
        optionen: [
          { text: '„Wir verlangen nichts. Wir bitten dich, sie zu schenken."', skill: 'ueberzeugen', dc: 15 },
          { text: '„Gib sie heraus, oder wir zwingen dich."', skill: 'einschuechtern', dc: 20 },
          { text: '„Der Vertrag sagt nirgends, dass du sie behalten musst."', skill: 'nachforschungen', dc: 15 },
        ],
      },
      {
        titel: 'Zweitens: die Gegenleistung',
        text: 'Ein Feenfürst schenkt nicht ohne Gegenleistung. Was bekommt er?',
        optionen: [
          { text: '„Deine Freiheit. Heute Nacht. Vor Zeugen."', skill: 'ueberzeugen', dc: 15 },
          { text: '„Unsere Namen, falls du je einen brauchst."', skill: 'taeuschen', dc: 18 },
          { text: '„Nichts. Du schuldest dieser Stadt zweihundert Jahre."', skill: 'einschuechtern', dc: 18 },
        ],
      },
      {
        titel: 'Drittens: die Glocke',
        text: 'Der Vertrag gilt „im Umkreis, den die Glocke erreicht". Die Glocke hängt seit 1042 im Kapellenturm.',
        optionen: [
          { text: '„Wir schaffen die Glocke fort. Dann endet der Vertragsraum."', skill: 'arkane_kunde', dc: 15 },
          { text: '„Wir läuten sie. Dann hört ganz Klarwasser, was hier geschieht."', skill: 'auftreten', dc: 15 },
          { text: '„Wir zerschlagen sie."', skill: 'athletik', dc: 16 },
        ],
      },
    ];
    for (const r of runden) {
      const wahl = await game.ask({ kapitel: 'Der Bruch', titel: r.titel, text: r.text, optionen: r.optionen.map((o, i) => ({ text: o.text, wert: i, hinweis: `${o.skill} SG ${o.dc}` })) });
      const o = r.optionen[wahl];
      const actor = s.party.reduce((best, c) => {
        const mod = (c.skills.includes(o.skill) ? c.proficiency : 0);
        return !best || mod > (best.skills.includes(o.skill) ? best.proficiency : 0) ? c : best;
      }, null);
      const bonus = s.flags.sarine_zeugin ? 2 : 0;
      const probe = abilityCheck(actor, o.skill, o.dc, { bonus });
      if (probe.success) erfolge++;
      await game.narration({
        kapitel: 'Der Bruch', titel: probe.success ? 'Er nickt' : 'Er wartet',
        text: `${actor.name}: ${probe.label} ${probe.total} gegen SG ${o.dc} — ${probe.success ? '**Erfolg**' : '**Misserfolg**'}.\n\n`
          + (probe.success
            ? '„Angenommen", sagt er. „Weiter."'
            : '„Das war unpräzise", sagt er. „Ich könnte es wörtlich nehmen. Ich tue es nicht — heute nicht. Weiter."'),
      });
    }
    if (erfolge >= 3) {
      await game.narration({
        kapitel: 'Der Bruch', titel: 'Geschenkt',
        text: 'Er steht auf und sagt einen Satz, den seit 1042 niemand mehr gehört hat: „Der Handel ist erfüllt."\n\nDann schenkt er sie. Elf Namen wandern nach oben durch zwanzig Zentimeter Wasser, und elf Kinder steigen aus einem Brunnen, in dem man den Boden sehen kann.\n\nUnd er geht mit ihnen hinaus, an ihnen vorbei, durch die Gasse, in der die Wimpel vom Erntefest noch hängen, und er dreht sich nicht um.\n\n„Ihr habt gut gefragt, Ihr Herrschaften. Das ist seltener als klug."',
      });
      game.setFlag('ende_c');
      game.setFlag('kinder_zurueck');
      game.setFlag('ysmereth_frei_fair');
      game.state.notes.ysmerethFair = true;
      await game.ending('akt1_bruch');
    } else {
      await game.narration({
        kapitel: 'Der Bruch', titel: 'Beleidigt',
        text: 'Er steht auf.\n\n„Ihr habt zweimal ungenau gesprochen und einmal gedroht. Ich bin an mein Wort gebunden, Ihr Herrschaften — nicht an eure Höflichkeit.\n\nDer Bannkreis ist offen. Ihr habt ihn geöffnet. Das war unvorsichtig."',
      });
      const r = await game.startCombat('ysmereth_befreit');
      game.state.notes.ysmerethFair = r === 'verhandelt';
      game.setFlag('ende_c');
      if (r === 'verhandelt') {
        game.setFlag('kinder_zurueck');
        game.setFlag('ysmereth_frei_fair');
      } else {
        game.setFlag('ysmereth_bezwungen');
      }
      await game.ending('akt1_bruch');
    }
    game.setFlag('bindung_gebrochen');
    game.setFlag('akt1_geloest');
    await game.runEvent('buch_zerfaellt');
    await game.runEvent('der_verrat');
  },

  aufloesung_D: async (game) => {
    const s = game.state;
    await game.narration({
      kapitel: 'Die Bürgerversammlung', titel: 'Mitten in der Nacht',
      text: 'Ihr lasst die Glocke läuten. Um drei Uhr nachts, in einer Stadt, in der nie etwas passiert.\n\nZweihundert Menschen stehen in Nachthemden auf dem Marktplatz, auf elf Steinen aus anderem Material, und niemand weiß, warum er hier ist.\n\nVier Runden. Dann stimmt Klarwasser über sich selbst ab.',
    });
    let erfolge = 0;
    const bonusSarine = s.flags.sarine_zeugin ? 2 : 0;

    // Runde 1 — Der Beweis
    const beweis = [];
    if (s.flags.brief_gefunden) beweis.push({ text: 'Tobrek liest seinen eigenen Brief vor.', wert: 'brief', hinweis: 'automatisch, wenn Nella dabeisteht' });
    if (s.notes.namesCopied) beweis.push({ text: 'Die elf Namen vorlesen. Laut. Alle.', wert: 'namen', hinweis: 'Auftreten SG 14' });
    if (s.notes.registerStolen) beweis.push({ text: 'Das Register hochhalten. (Es ist in eurer Tasche.)', wert: 'register_gestohlen', hinweis: 'schwierig' });
    else if (s.flags.register_gelesen) beweis.push({ text: 'Zum Register in der Kapelle führen.', wert: 'register', hinweis: 'Überzeugen SG 14' });
    beweis.push({ text: 'Ohne Beweis sprechen.', wert: 'nichts', hinweis: 'sehr schwer' });

    const w1 = await game.ask({ kapitel: 'Runde 1', titel: 'Der Beweis', text: 'Zweihundert Menschen wollen wissen, warum sie wach sind.', optionen: beweis });
    if (w1 === 'brief' && s.flags.nella_zurueck) {
      erfolge++;
      await game.narration({ kapitel: 'Runde 1', titel: 'Automatisch', text: 'Tobrek Vahl liest seinen eigenen versiegelten Brief vor, vor zweihundert Leuten, während seine Tochter danebensteht.\n\nEr kommt bis zum letzten Satz.\n\n„Wenn du das liest, dann verzeih mir, dass ich gehofft habe, es sei jemand anderes."\n\nDanach ist es sehr still.' });
    } else {
      const dc = w1 === 'nichts' ? 18 : w1 === 'register_gestohlen' ? 16 : 14;
      const skill = w1 === 'namen' ? 'auftreten' : 'ueberzeugen';
      const actor = besterFuer(s, skill);
      const p = abilityCheck(actor, skill, dc, { bonus: bonusSarine });
      if (p.success) erfolge++;
      await game.narration({ kapitel: 'Runde 1', titel: p.success ? 'Sie hören zu' : 'Gemurmel', text: `${actor.name}: ${p.label} ${p.total} gegen SG ${dc} — ${p.success ? '**Erfolg**' : '**Misserfolg**'}.` });
    }

    // Runde 2 — Das Zeugnis
    const zeugen = [];
    if (s.flags.grust_gestaendnis) zeugen.push({ text: 'Grust bitten, aufzustehen.', wert: 'grust', hinweis: '+5' });
    zeugen.push({ text: 'Kaspar holen. Er zählt seit Monaten laut.', wert: 'kaspar', hinweis: 'Überzeugen SG 15' });
    zeugen.push({ text: 'Selbst bezeugen, was ihr unten gesehen habt.', wert: 'selbst', hinweis: 'Überzeugen SG 15' });

    const w2 = await game.ask({ kapitel: 'Runde 2', titel: 'Das Zeugnis', text: 'Jemand muss zugeben, dass er sich erinnert.', optionen: zeugen });
    if (w2 === 'grust') {
      erfolge++;
      await game.narration({
        kapitel: 'Runde 2', titel: 'Der größte Mann der Stadt',
        text: 'Grust steht auf. Er sagt nichts über Verträge und nichts über Feenfürsten.\n\nEr erklärt zweihundert Leuten, wie schwer ein Fünfjähriger ist, wenn man ihn einen Berg hinaufträgt.\n\nEr braucht dafür vier Minuten. Es ist der längste Text, den irgendjemand hier je von ihm gehört hat.',
      });
    } else {
      const actor = besterFuer(s, 'ueberzeugen');
      const p = abilityCheck(actor, 'ueberzeugen', 15, { bonus: bonusSarine + (s.flags.kaspar_zusammenbruch && w2 === 'kaspar' ? 2 : 0) });
      if (p.success) erfolge++;
      await game.narration({ kapitel: 'Runde 2', titel: p.success ? 'Einer erinnert sich' : 'Niemand steht auf', text: `${actor.name}: ${p.label} ${p.total} gegen SG 15 — ${p.success ? '**Erfolg**' : '**Misserfolg**'}.` });
    }

    // Runde 3 — Die Rechnung
    await game.narration({
      kapitel: 'Runde 3', titel: 'Die Rechnung',
      text: 'Und dann tritt Mutter Hesse vor, und sie weint nicht und leugnet nicht.\n\nSie erklärt. Ruhig. Und sie überzeugt, weil ihre Rechnung aufgeht.\n\n„Vierzig Kinder in Dornfeld, letzten Winter. Eines hier, alle siebzehn Jahre. Rechnet es mir vor, wenn ihr könnt."\n\n[[Gegenrechnen scheitert automatisch. Es gibt genau einen Angriffspunkt.]]',
    });
    const w3 = await game.ask({
      kapitel: 'Runde 3', titel: 'Wogegen sprecht ihr?',
      optionen: [
        { text: 'Gegen die Zahl. Vierzig gegen eins ist trotzdem Mord.', wert: 'zahl', hinweis: 'scheitert automatisch' },
        { text: 'Gegen die Freiwilligkeit. Sie hat elf Kinder überredet — sie ist gut darin.', wert: 'freiwillig', hinweis: 'kein Wurf nötig' },
        { text: 'Gegen ihre Person. Vierzig Jahre Lügen.', wert: 'person', hinweis: 'sie hat nur einmal gelogen' },
      ],
    });
    if (w3 === 'freiwillig') {
      erfolge++;
      await game.narration({
        kapitel: 'Runde 3', titel: 'Der einzige Riss',
        text: 'Ihr rechnet nicht gegen. Ihr fragt, wie ein Kind ja sagt.\n\nUnd sie antwortet, weil sie nicht lügt, und weil sie seit vierzig Jahren auf jemanden gewartet hat, der genau das fragt:\n\n„Ilva Mohl hat zweimal nein gesagt. Beim dritten Mal habe ich ihr gesagt, dass ihre Mutter es sich wünscht. Das war gelogen. Das ist die einzige Lüge, die ich je gesagt habe."\n\nZweihundert Leute hören das. Vierzig Familien haben Kinder unter zwölf.',
      });
      game.setFlag('hesse_gebrochen');
    } else {
      await game.narration({
        kapitel: 'Runde 3', titel: 'Sie hat recht',
        text: (w3 === 'zahl'
          ? 'Ihr rechnet gegen, und ihr rechnet ordentlich, und die Rechnung geht trotzdem auf. Das ist der Punkt an dieser Rechnung.'
          : 'Ihr greift sie an, und die Stadt verteidigt sie — weil sie recht hat und weil sie vierzig Jahre lang Kranke gepflegt hat und weil alle sie kennen.')
          + '\n\n„Ich habe nichts anderes behauptet", sagt sie ruhig. „Ich habe nur gerechnet."',
      });
    }

    // Runde 4 — Die Entscheidung
    const wurf = roll('2W6').total + erfolge + (s.flags.sarine_zeugin ? 2 : 0);
    let ergebnis;
    if (wurf <= 7) ergebnis = 'pakt';
    else if (wurf <= 11) ergebnis = 'gespalten';
    else ergebnis = 'frei';

    await game.narration({
      kapitel: 'Runde 4', titel: 'Die Entscheidung',
      text: `2W6 + ${erfolge} Erfolge${s.flags.sarine_zeugin ? ' + 2 (Sarine als Zeugin)' : ''} = **${wurf}**\n\n`
        + (ergebnis === 'pakt'
          ? 'Klarwasser wählt den Pakt.\n\nEs ist keine böse Abstimmung. Es ist eine sehr menschliche: Zweihundert Leute, die eben erfahren haben, was sie bezahlen, entscheiden, dass sie weiterzahlen wollen.\n\nEine Frau sagt in die Stille hinein: „Aber es war doch immer gut hier."\n\nIhr könnt den Pakt trotzdem brechen. Dann brecht ihr ihn gegen die Stadt.'
          : ergebnis === 'gespalten'
            ? 'Gespalten.\n\nVierzig Familien stellen sich hinter euch. Der Rest nicht. Es gibt Geschrei, es gibt zwei Handgreiflichkeiten, es gibt keinen Toten.\n\nUm halb fünf steht Tobrek Vahl auf einer Kiste und sagt, dass er als Bürgermeister zurücktritt und als Vater weitermacht. Das entscheidet nichts. Es verschiebt nur, wer morgen redet.'
            : 'Klarwasser lässt ihn gehen.\n\nEs dauert bis zum Morgengrauen. Sie gehen alle mit zum Brunnen — zweihundert Leute in Nachthemden, schweigend, in einer Reihe, die von der Kapelle bis zum Ortseingang reicht.\n\nMutter Hesse geht vorneweg. Sie trägt das Register unter dem Arm, und am Brunnen legt sie es hin und tritt zurück.'),
    });

    game.setFlag('ende_d');
    game.setFlag(`versammlung_${ergebnis}`);
    game.setFlag('akt1_geloest');
    if (ergebnis === 'frei') {
      game.setFlag('bindung_gebrochen');
      game.setFlag('kinder_zurueck');
      game.setFlag('ysmereth_frei_fair');
    } else if (ergebnis === 'gespalten') {
      game.setFlag('bindung_gebrochen');
      game.setFlag('kinder_zurueck');
    } else {
      game.setFlag('bindung_haelt');
      const doch = await game.ask({
        kapitel: 'Nach der Abstimmung', titel: 'Gegen die Stadt?',
        text: 'Der Bannkreis liegt unter einem Brunnen, den heute Nacht niemand bewacht.',
        optionen: [
          { text: 'Trotzdem brechen. Gegen zweihundert Leute.', wert: true },
          { text: 'Es bei ihrer Entscheidung belassen.', wert: false, abschluss: true },
        ],
      });
      if (doch) {
        game.setFlag('bindung_gebrochen');
        game.setFlag('gegen_die_stadt');
        game.setFlag('bindung_haelt', false);
        game.setFlag('kinder_zurueck');
      }
    }
    await game.ending('akt1_versammlung');
    await game.runEvent('buch_zerfaellt');
    await game.runEvent('der_verrat');
  },

  aufloesung_X: async (game) => {
    await game.narration({
      kapitel: 'Neumond', titel: 'Umdrehen',
      text: 'Ihr dreht euch um und geht.\n\nSie hält euch nicht auf. Sie sagt nicht einmal etwas.\n\nAm nächsten Morgen ist die Straße voller Leute, die zum Fest aufräumen. Die Wimpel kommen ab. Jemand lacht über etwas.\n\nUnd im Gasthaus fragt ihr euch gegenseitig, wie das Mädchen mit den Kieseln hieß, und keiner von euch weiß es mehr.',
    });
    game.setFlag('nella_verschwunden');
    game.setFlag('bindung_haelt');
    game.setFlag('akt1_geloest');
    game.setFlag('weggesehen');
    await game.ending('akt1_weggesehen');
    await game.runEvent('buch_zerfaellt');
    await game.runEvent('der_verrat');
  },

  /* ─────────────── Das Buch zerfällt ─────────────── */
  buch_zerfaellt: async (game) => {
    const s = game.state;
    if (s.flags.bindung_haelt && !s.flags.bindung_gebrochen) {
      // Die Bindung hält — das Buch bleibt vorerst.
      return;
    }
    if (s.flags.buch_bei_gruppe || s.flags.gewaehlt_buch) {
      await game.narration({
        kapitel: 'In derselben Nacht', titel: 'Es hat aufgehört, gebraucht zu werden',
        text: 'Es fängt in der Tasche an. Nicht laut — als würde jemand sehr behutsam Seiten umblättern, und zwar viele auf einmal.\n\nWer nachsieht, findet das Buch offen, obwohl es geschlossen war, und die Tinte steht nicht mehr auf dem Papier. Sie steht darüber, einen Fingerbreit in der Luft, elf Zeilen in elf Handschriften, und sie hängen da wie Rauch, der sich nicht entscheiden kann.\n\nDann gehen sie. Alle elf gleichzeitig, quer durch den Raum, und sie gehen zum Stab.\n\nDie Kratzer im weißen Stein, die ihr seit der Weggabelung für Kratzer gehalten habt und seit dem Register für Namen, werden für einen Atemzug so hell, dass man sie durch die Hand sieht, die den Stab hält.\n\nUnd das Buch — der Deckel, die Schnüre, die goldenen Ecken — ist nicht mehr da. Nicht verbrannt. Nicht zerfallen.\n\nEs hat aufgehört, gebraucht zu werden.',
      });
    } else {
      await game.narration({
        kapitel: 'Zwei Wochen später', titel: 'Ein verkohlter Grasfleck',
        text: 'Ein Reisender erzählt beiläufig, an der Weggabelung sei ein verkohlter Grasfleck, und mittendrin sei etwas gewesen, das jetzt nicht mehr da sei.\n\nEr weiß nicht mehr, was.',
      });
    }
    // Die elf Namen wandern in den Stab.
    s.staff.names = [
      'Aleth Grast', 'Iven Odowic', 'Sarra Mohl', 'Teodor Wahl', 'Lin Brunnenmann', 'Effe Grast',
      'Marrow Umbrecht', 'Josta Vahl', 'Renn Odowic', 'Ilva Mohl', 'Tam Grast',
    ];
    game.setFlag('buch_zerfallen');
    if (s.flags.gewaehlt_buch || s.flags.buch_bei_gruppe) {
      s.party_inventory = s.party_inventory.filter((i) => i.id !== 'buch_der_namen');
    }
    game.quest({
      id: 'stab',
      text: 'Das Buch der verlorenen Namen ist zerfallen. Die elf Namen stehen jetzt in den Runen des Stabes. Ab hier ist der Stab das einzige Gefäß im Multiversum, das Namen halten kann, ohne sie zu verzehren.',
    });
  },

  /* ─────────────── Der Verrat ─────────────── */
  der_verrat: async (game) => {
    const s = game.state;
    if (!s.flags.ghortan_dabei) {
      // Ghortan wurde im Prolog liegen gelassen — er kommt trotzdem.
      await game.narration({
        kapitel: 'Der Verrat', titel: 'Er hat es allein geschafft',
        text: 'Auf dem Marktplatz steht jemand, den ihr zuletzt in Ketten gesehen habt. Er ist allein, und er hat keine Ketten mehr, und er hält etwas in der Hand, das ihr kennt.\n\n„Ihr habt mich liegen lassen."\n(Er sagt es ohne Vorwurf, fast anerkennend.)\n„Das war vernünftig. Es hat mich vier Wochen gekostet und ein Goblinlager, und es hat nichts geändert. Ich brauchte nur jemanden, der die Bindung aufbricht — und das habt ihr gerade getan."',
      });
    } else {
      await game.narration({
        kapitel: 'Der Verrat', titel: 'Er lächelt nicht entschuldigend',
        text: 'Ghortan steht allein am Altar. Die schwarzen Flammen in seinen Augen sind größer als je zuvor.\n\nAls ihr eintretet, dreht er sich um — und zum ersten Mal, seit ihr ihn kennt, lächelt er nicht entschuldigend.\n\nEr hält den Stab. Er hat ihn genommen, bevor ihr den Raum betreten habt.',
      });
      await game.narration({
        kapitel: 'Der Verrat', titel: 'Die Wahrheit ist schlicht',
        text: '„Ihr wundert euch sicher, warum ein Tanarukk sich mit euch herumgequält hat. Die Wahrheit ist schlicht: Ich brauchte euch. Ich brauchte jemanden, der stark genug ist, eine zweihundert Jahre alte Bindung aufzubrechen — und blöd genug, das Werkzeug dafür die ganze Zeit mitzuschleppen."\n\n„Wisst ihr, wann ich mich entschieden habe? An der Weggabelung. Drei Dinge lagen da, und ihr habt genau das genommen, was ich brauchte. Ich habe das für ein Zeichen gehalten. Vielleicht war es eins."\n\n„Das Zweite habe ich mir geholt, während ihr in der Kirche gegraben habt. Das Dritte lag noch dort, im Gras, und hat mich ausgelacht — ich konnte es nicht mal anfassen.\n\nUnd heute Nacht ist es einfach zerfallen. Von selbst. Ich habe Wochen damit verbracht, das zu schaffen, und eure Bindung hat es in drei Sekunden erledigt.\n\nManchmal frage ich mich, ob überhaupt irgendetwas an dieser Sache mir gehört."',
      });
    }

    s.flags.ghortan_verrat = true;
    s.flags.ghortan_dabei = false;
    s.flags.ghortan_hat_stab = true;

    const hatRolle = s.party_inventory.some((i) => i.id === 'schriftrolle') || s.flags.gewaehlt_rolle || s.flags.rolle_bei_gruppe;
    if (hatRolle) {
      await game.narration({
        kapitel: 'Der Verrat', titel: 'Er greift ins Leere',
        text: 'Er greift nach etwas an seinem Gürtel — und das, wonach er greift, ist nicht da.\n\nEine sehr kurze Pause. Man sieht ihm an, wie er umrechnet.\n\n„…Ihr seid zurückgegangen."\n(Er lacht, einmal, kurz und ohne Freude.)\n„Ihr seid tatsächlich zurückgegangen. Vier Tage. Für ein Stück Pergament."\n\nDann wird es sehr langsam und sehr kalt: **Verlangsamen**, dann **Schlaf**, dann ein Arm um ein elfjähriges Mädchen.\n\n„Dann machen wir es anders. Sie kommt mit. Ihr kommt nach. Ihr wisst, wo."',
      });
      s.flags.verrat_improvisiert = true;
      s.flags.nella_geisel = true;
    } else {
      await game.narration({
        kapitel: 'Der Verrat', titel: 'Bis zu zwanzig Ziele',
        text: 'Dann rollt er ein Pergament auf, das drei Siegel trägt, und liest vor.\n\nEs ist kurz. Es dauert keine acht Sekunden.\n\nUnd danach steht in Klarwasser niemand mehr aufrecht — nicht ihr, nicht Nella, nicht Tobrek, nicht Grust, nicht die einundsiebzigjährige Frau, die vor einer Stunde noch gerechnet hat.\n\nEr tötet niemanden. Er will Zuschauer.',
      });
      s.party_inventory = s.party_inventory.filter((i) => i.id !== 'schriftrolle');
      s.flags.ghortan_hat_rolle = true;
    }

    await game.narration({
      kapitel: 'Der Verrat', titel: 'Beim Abtransport',
      text: '„Schar hat mich geformt und dann verkauft. An Goblins. Wisst ihr, was das mit einem macht?\n\n— Lolth hat mich nicht geformt. Lolth hat nur zugesehen und gewartet, bis ich von allein zu ihr komme. Das nenne ich Respekt."\n\n„Wenn das Netz über allem liegt, kann mich niemand mehr weiterreichen. Das ist alles, was ich will. Es ist nicht einmal besonders originell."',
    });

    game.quest({ id: 'ghortan', text: 'Ghortan hat den Stab der Bindung genommen. Er braucht ihn, um durch Ysmereths Essenz hindurch in den Abyss zu greifen.' });
    s.act = 2;
    s.session = 6;
    await game.levelUp(5);
    await game.goToArea('zweite_kammer');
  },
};

function besterFuer(s, skill) {
  return s.party.filter((c) => !c.dead).reduce((best, c) => {
    const wert = (c.skills.includes(skill) ? c.proficiency : 0) + Math.floor((c.abilities.ch - 10) / 2);
    const bestWert = best ? (best.skills.includes(skill) ? best.proficiency : 0) + Math.floor((best.abilities.ch - 10) / 2) : -99;
    return wert > bestWert ? c : best;
  }, null) || s.party[0];
}

export const combats = {
  ertrunkene_mutter: (game) => {
    const map = makeMap(22, 14);
    paintRect(map, 9, 5, 13, 8, TERRAIN.WASSER);
    return {
      title: 'Die Ertrunkene Mutter',
      map,
      playerStart: [{ x: 3, y: 6 }, { x: 3, y: 7 }, { x: 2, y: 6 }],
      enemies: [{ id: 'ertrunkene_mutter', x: 16, y: 6 }],
      allies: [],
      minionLimit: 3,
      scenario: {
        wet: false,
        specialActions: [{
          id: 'namen_lesen', name: 'Einen Namen lesen', icon: 'merkmal', cost: 'frei',
          desc: 'Einen der elf Namen laut vorlesen: Sie verliert ihre Reaktion und hat bis zum Ende ihres nächsten Zuges Nachteil auf Angriffswürfe.',
          available: (combat) => combat.state.notes.namesCopied,
          run: (combat, actor) => {
            const s = combat.state;
            const offen = s.notes.namesKnown.filter((n) => !combat.flags[`gelesen_${n}`]);
            if (!offen.length) { combat.logLine('held', 'Alle elf Namen sind verbraucht.'); return; }
            const name = offen[0];
            combat.flags[`gelesen_${name}`] = true;
            combat.logLine('stimme', `${actor.name} liest: „${name}."`);
            for (const c of combat.combatants) {
              if (c.side !== 'feind') continue;
              c.reactionUsed = true;
              c.ref.conditions.push({ id: 'vergiftet', rounds: 2, quelle: 'name' });
              combat.logLine('gegner', `${c.name} zuckt zusammen. Nachteil auf Angriffswürfe.`);
            }
          },
        }],
      },
      intro: {
        kapitel: 'Ende B', titel: 'Sie will es verhindern',
        text: 'Was die Straße herunterkommt, ist nicht mehr ganz Mutter Hesse. Es ist das, was von Klarwassers Zwang übrigbleibt, sich selbst zu erhalten.\n\nJeder Satz, den sie sagt, klingt nach Fürsorge.\n\n[[Verwundbar gegen strahlenden Schaden. Auf nassem Boden heilt sie 10 TP pro Zug — in der trockenen Kapelle nicht. Wer die elf Namen abgeschrieben hat, kann sie vorlesen.]]',
        knopf: 'Sie aufhalten',
      },
    };
  },

  ysmereth_befreit: (game) => {
    const map = makeMap(22, 16);
    paintRect(map, 8, 6, 14, 10, TERRAIN.WASSER);
    return {
      title: 'Ysmereth, befreit',
      map,
      playerStart: [{ x: 3, y: 8 }, { x: 3, y: 9 }, { x: 2, y: 8 }],
      enemies: [{ id: 'ysmereth_befreit', x: 17, y: 8 }],
      scenario: {
        specialActions: [{
          id: 'titel', name: 'Mit vollem Titel ansprechen', icon: 'merkmal', cost: 'aktion',
          desc: '„Herr der Stillen Tiefe." Er senkt die Waffe und gewährt eine Runde Verhandlung. Er ist bis zum letzten Trefferpunkt verhandelbar.',
          run: (combat, actor) => {
            combat.logLine('stimme', `${actor.name}: „Herr der Stillen Tiefe."`);
            combat.logLine('gegner', '„…Ihr Herrschaften. Ihr habt dreimal ungenau gesprochen und einmal höflich. Das reicht."');
            const boss = combat.combatants.find((c) => c.side === 'feind');
            if (boss) { boss.ref.dead = true; boss.ref.hp = 0; }
            combat.result = 'verhandelt';
            combat.finish('verhandelt');
          },
        }],
      },
      intro: {
        kapitel: 'Ende C — Misserfolg', titel: 'Beleidigt',
        text: 'Er ist frei, und er ist nicht wütend — er ist **beleidigt**, und das ist bei einem Wesen, das nicht lügen kann, etwas anderes.\n\n[[Er ist bis zum letzten Trefferpunkt verhandelbar. Wer ihn mit vollem Titel anspricht, bekommt eine Runde Verhandlung. Eine Gruppe, die das nutzt, gewinnt, ohne ihn zu töten.]]',
        knopf: 'Ihm gegenübertreten',
      },
    };
  },
};

export const endings = {
  akt1_ersetzung: {
    kapitel: 'Akt I — Ende A', titel: 'Die Ersetzung',
    text: 'Nella Vahl wird einundzwanzig werden. Sie wird in Klarwasser bleiben oder nicht; das ist ihre Sache.\n\nDie Bindung hält weitere siebzehn Jahre. 1253 wird Mutter Hesse nicht mehr leben, und jemand anderes wird das Register aufschlagen und rechnen müssen.\n\nUnd im Gasthaus Zum Nassen Hut steht ab jetzt ein zehnter Tisch, den niemand benutzt und den Grust jeden Tag abwischt, ohne sagen zu können, warum.',
    frage: 'Wie hieß das Mädchen?',
  },
  akt1_befreiung: {
    kapitel: 'Akt I — Ende B', titel: 'Die Befreiung',
    text: 'Elf Kinder stehen auf einem Marktplatz, in einer Stadt, die sie nicht kennt.\n\nKlarwasser wird über zehn Jahre verarmen. Das erste Fieber kommt in drei Jahren, die erste Missernte in fünf. Die Leute werden nicht wissen, warum, und die, die es wissen, werden nicht darüber reden.\n\nDas ist der Preis, und ihr habt ihn nicht bezahlt. Bezahlt haben ihn die, die morgen früh aufwachen.',
    frage: 'War es das wert?',
  },
  akt1_bruch: {
    kapitel: 'Akt I — Ende C', titel: 'Der Bruch',
    text: 'Ein Feenfürst geht durch eine Gasse, in der die Wimpel vom Erntefest noch hängen, und dreht sich nicht um.\n\nHinter ihm stehen elf Kinder, die zweihundert Jahre lang Kiesel sortiert haben, und eine Stadt, die nicht weiß, wohin mit ihnen.\n\nNiemand ist gestorben. Das ist ungewöhnlich, und es ist euer Verdienst, und es wird euch niemand danken, weil niemand versteht, was gerade nicht passiert ist.',
    frage: 'Und wer sagt es den Familien?',
  },
  akt1_versammlung: {
    kapitel: 'Akt I — Ende D', titel: 'Die Stadt entscheidet',
    text: 'Zweihundert Leute in Nachthemden haben um vier Uhr morgens über einen Vertrag abgestimmt, den keiner von ihnen je gelesen hat.\n\nDas ist die schlechteste Art, so etwas zu entscheiden. Es ist auch die einzige, die Klarwasser danach noch ertragen kann.',
    frage: 'Und in siebzehn Jahren?',
  },
  akt1_weggesehen: {
    kapitel: 'Akt I — kein Ende', titel: 'Weggesehen',
    text: 'Man kann das tun. Sie hat es sogar angeboten, und sie hat es als Gnade gemeint.\n\nIn einer Woche werdet ihr euch an nichts erinnern.\n\nAußer, ihr habt es aufgeschrieben.',
    frage: 'Habt ihr es aufgeschrieben?',
  },
};

export const areaEnter = {
  kapelle_neumond: async (game) => {
    if (game.flag('neumond_betreten')) return;
    game.setFlag('neumond_betreten');
    game.state.session = 5;
    await game.narration({
      kapitel: 'Sitzung 5 — Neumond', titel: 'Freiwillig',
      text: 'Der Mond ist weg.\n\nNella Vahl ist mit Mutter Hesse zur Kapelle gegangen. Freiwillig — sie hat ihren Umhang selbst geholt und die Tür hinter sich zugezogen, und ihr Vater hat in der Küche gestanden und nichts gesagt.\n\nDie Kapellentür steht offen. Drinnen brennen zwei Kerzen.',
      knopf: 'Hineingehen',
    });
  },
};
