// Erzählkarten, Tafeln (Journal, Bogen, Beutel, Hilfe, System) und Meldungen.

import { SKILLS, ABILITY_SHORT, abilityMod, formatMod } from '../engine/rules.js';
import { RACES, CLASSES } from '../data/chargen.js';
import { STAFF_STAGES } from '../engine/state.js';
import { personalize, hookReport } from '../engine/hooks.js';
import { characterActions } from '../engine/character.js';
import { esc } from './screens.js';

/** Vorlesetext als Karte. Gibt ein Promise zurück, das beim Weiterklicken auflöst. */
export function narration(game, opts) {
  return new Promise((resolve) => {
    const schicht = document.createElement('div');
    schicht.className = 'erzaehlkarte-schicht';
    const knoepfe = opts.optionen || [{ text: opts.knopf || 'Weiter', wert: true }];
    schicht.innerHTML = `
      <div class="erzaehlkarte tafel">
        ${opts.kapitel ? `<div class="kapitel">${esc(opts.kapitel)}</div>` : ''}
        ${opts.titel ? `<h2>${esc(opts.titel)}</h2>` : ''}
        <div class="text">${opts.roh ? personalize(opts.text, game.state) : format(personalize(opts.text, game.state))}</div>
        <div class="knoepfe">
          ${knoepfe.map((k, i) => `<button class="${i === knoepfe.length - 1 ? 'haupt' : ''}" data-i="${i}">${esc(k.text)}</button>`).join('')}
        </div>
      </div>`;
    game.modal.appendChild(schicht);
    schicht.querySelectorAll('[data-i]').forEach((b) => {
      b.onclick = () => {
        schicht.remove();
        resolve(knoepfe[Number(b.dataset.i)].wert);
      };
    });
  });
}

/** Freie Auswahl (für Entscheidungen außerhalb von Dialogen). */
export function choiceModal(game, opts) {
  return new Promise((resolve) => {
    const schicht = document.createElement('div');
    schicht.className = 'erzaehlkarte-schicht';
    schicht.innerHTML = `
      <div class="erzaehlkarte tafel" style="max-width:700px">
        ${opts.kapitel ? `<div class="kapitel">${esc(opts.kapitel)}</div>` : ''}
        ${opts.titel ? `<h2>${esc(opts.titel)}</h2>` : ''}
        ${opts.text ? `<div class="text" style="margin-bottom:22px">${format(personalize(opts.text, game.state))}</div>` : ''}
        <div class="antworten">
          ${opts.optionen.map((o, i) => `
            <div class="antwort ${o.abschluss ? 'abschluss' : ''}" data-i="${i}">
              <span class="nummer">${i + 1}</span>
              <span>${esc(personalize(o.text, game.state))}</span>
              ${o.hinweis ? `<span class="probe">${esc(o.hinweis)}</span>` : ''}
            </div>`).join('')}
        </div>
      </div>`;
    game.modal.appendChild(schicht);
    schicht.querySelectorAll('[data-i]').forEach((b) => {
      b.onclick = () => {
        schicht.remove();
        const o = opts.optionen[Number(b.dataset.i)];
        resolve(o.wert !== undefined ? o.wert : Number(b.dataset.i));
      };
    });
  });
}

/** Texteingabe (z. B. ein Name, den man aufgibt). */
export function inputModal(game, opts) {
  return new Promise((resolve) => {
    const schicht = document.createElement('div');
    schicht.className = 'erzaehlkarte-schicht';
    schicht.innerHTML = `
      <div class="erzaehlkarte tafel" style="max-width:620px">
        ${opts.kapitel ? `<div class="kapitel">${esc(opts.kapitel)}</div>` : ''}
        <h2>${esc(opts.titel)}</h2>
        ${opts.text ? `<div class="text" style="margin-bottom:20px">${format(personalize(opts.text, game.state))}</div>` : ''}
        <input type="text" id="eingabe" placeholder="${esc(opts.platzhalter || '')}" maxlength="60" value="${esc(opts.vorgabe || '')}">
        ${opts.vorschlaege ? `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap" id="vs">
          ${opts.vorschlaege.map((v) => `<button style="font-size:12px;padding:4px 10px">${esc(v)}</button>`).join('')}</div>` : ''}
        <div class="knoepfe"><button class="haupt" data-ok>Bestätigen</button></div>
      </div>`;
    game.modal.appendChild(schicht);
    const inp = schicht.querySelector('#eingabe');
    inp.focus();
    schicht.querySelectorAll('#vs button').forEach((b) => {
      b.onclick = () => { inp.value = b.textContent; };
    });
    const fertig = () => {
      const v = inp.value.trim();
      if (!v) return;
      schicht.remove();
      resolve(v);
    };
    schicht.querySelector('[data-ok]').onclick = fertig;
    inp.onkeydown = (e) => { if (e.key === 'Enter') fertig(); };
  });
}

export function toast(game, text) {
  const el = document.createElement('div');
  el.className = 'toast-box';
  el.textContent = personalize(text, game.state || {});
  game.toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

export function flyingNumber(game, screenPos, text, klasse = 'schaden') {
  if (!screenPos) return;
  const el = document.createElement('div');
  el.className = `flug-zahl ${klasse}`;
  el.textContent = text;
  el.style.left = `${screenPos.x}px`;
  el.style.top = `${screenPos.y}px`;
  game.toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

export async function levelUpCard(game, stufe, infos) {
  const neu = infos[0]?.r.newFeatures || [];
  await narration(game, {
    kapitel: 'Meilenstein',
    titel: 'Stufenaufstieg',
    text: `<div class="aufstieg"><div class="stufe">${stufe}</div>`
      + `<p>Keine Erfahrungspunkte. Die Gruppe steigt an narrativen Wendepunkten auf — sofort, damit die neuen Mittel in die nächste Szene gehen.</p>`
      + `<div class="neu">${infos.map((i) => `<b>${esc(i.c.name)}</b> +${i.r.hpGain} TP`).join('<br>')}`
      + (neu.length ? `<br><br><b>Neu</b><br>${neu.map((f) => esc(f.name)).join('<br>')}` : '')
      + '</div></div>',
    roh: true,
    knopf: 'Weiter',
  });
}

export async function endingCard(game, ende) {
  return new Promise((resolve) => {
    const schicht = document.createElement('div');
    schicht.className = 'ende-schicht';
    schicht.innerHTML = `
      <div class="ende">
        <div class="kapitel">${esc(ende.kapitel || 'Ende')}</div>
        <h1>${esc(ende.titel)}</h1>
        <div class="text">${format(personalize(ende.text, game.state))}</div>
        ${ende.frage ? `<div class="frage">${esc(personalize(ende.frage, game.state))}</div>` : ''}
        <div style="margin-top:38px"><button class="haupt" data-w>Weiter</button></div>
      </div>`;
    game.modal.appendChild(schicht);
    schicht.querySelector('[data-w]').onclick = () => { schicht.remove(); resolve(); };
  });
}

/* ═══════════════════════ Tafeln ═══════════════════════ */

export function panel(game, name, arg) {
  game.modal.innerHTML = '';
  const schicht = document.createElement('div');
  schicht.className = 'panel-schicht';
  const box = document.createElement('div');
  box.className = 'panel tafel';
  schicht.appendChild(box);
  game.modal.appendChild(schicht);

  const kopf = (titel, reiter = []) => `
    <div class="panel-kopf">
      <h2>${esc(titel)}</h2>
      <div class="panel-reiter">${reiter.map((r) => `<div class="reiter ${r.aktiv ? 'aktiv' : ''}" data-r="${r.id}">${esc(r.name)}</div>`).join('')}</div>
      <button class="panel-schliessen" data-x>Schließen</button>
    </div>`;

  const schliessen = () => schicht.remove();

  if (name === 'journal') box.innerHTML = kopf('Journal') + journalKoerper(game);
  else if (name === 'bogen') box.innerHTML = bogenTafel(game, arg);
  else if (name === 'beutel') box.innerHTML = kopf('Beutel') + beutelKoerper(game);
  else if (name === 'hilfe') box.innerHTML = kopf('Wie man spielt') + hilfeKoerper();
  else if (name === 'ueber') box.innerHTML = kopf('Über diese Kampagne') + ueberKoerper();
  else if (name === 'karte') box.innerHTML = kopf('Wohin?') + karteKoerper(game);
  else if (name === 'system') box.innerHTML = kopf('Menü') + systemKoerper(game);

  box.querySelector('[data-x]')?.addEventListener('click', schliessen);
  schicht.onclick = (e) => { if (e.target === schicht) schliessen(); };

  // Reiterwechsel im Bogen
  box.querySelectorAll('[data-held]').forEach((b) => {
    b.onclick = () => { schicht.remove(); panel(game, 'bogen', b.dataset.held); };
  });
  // Systemknöpfe
  box.querySelector('[data-s=speichern]')?.addEventListener('click', () => {
    game.speichern();
    schliessen();
  });
  box.querySelector('[data-s=rast]')?.addEventListener('click', async () => {
    schliessen();
    await game.rast(true);
  });
  box.querySelector('[data-s=kurzrast]')?.addEventListener('click', async () => {
    schliessen();
    await game.rast(false);
    toast(game, 'Kurze Rast: ein Viertel der Trefferpunkte und einige Ressourcen kehren zurück.');
  });
  box.querySelector('[data-s=menu]')?.addEventListener('click', () => {
    schliessen();
    game.showMenu();
  });
  box.querySelectorAll('[data-reise]').forEach((b) => {
    b.onclick = () => { schliessen(); game.goToArea(b.dataset.reise); };
  });
  return schicht;
}

function journalKoerper(game) {
  const s = game.state;
  const q = s.journal;
  const notizen = [];
  if (s.notes.namesCopied) notizen.push('Ihr habt die elf Namen <b>abgeschrieben</b>. Das zahlt sich dreimal aus.');
  if (s.notes.registerStolen) notizen.push('Das Register ist in eurem Besitz — als Beweisstück vor der Stadt fehlt es später.');
  if (s.notes.drankFromWell.length) notizen.push(`Aus dem Brunnen getrunken: ${s.notes.drankFromWell.map(esc).join(', ')}. Ysmereth hat euch gesehen.`);
  if (s.notes.nellaPromise) notizen.push(`Nella versprochen: „${esc(s.notes.nellaPromise)}"`);
  for (const [wer, was] of Object.entries(s.notes.sacrificedNames || {})) {
    notizen.push(`${esc(wer)} hat einen Namen an der Steintür aufgegeben: <b>${esc(was)}</b>`);
  }
  const stab = STAFF_STAGES[s.staff.stage];
  return `<div class="panel-koerper">
    <div style="display:grid;grid-template-columns:1fr 320px;gap:26px">
      <div>
        ${q.length ? q.map((x) => `
          <div class="quest ${x.failed ? 'gescheitert' : x.done ? 'fertig' : 'offen'}">
            <h3>${esc(x.title)} <span class="stand">${x.failed ? '· gescheitert' : x.done ? '· abgeschlossen' : ''}</span></h3>
            <ul>${x.entries.map((e) => `<li>${format(personalize(e, s))}</li>`).join('')}</ul>
          </div>`).join('') : '<p>Noch keine Einträge.</p>'}
      </div>
      <div>
        <h3>Der Stab der Bindung</h3>
        <p style="font-size:13px;color:var(--pergament-matt)">
          <b style="color:var(--messing-hell)">Stufe ${s.staff.stage} — ${esc(stab.name)}</b><br>${esc(stab.desc)}
        </p>
        ${s.staff.names.length ? `<p style="font-size:12.5px"><b>Belegte Runen:</b><br>${s.staff.names.map(esc).join('<br>')}</p>` : ''}
        <h3 style="margin-top:22px">Notizen</h3>
        <div class="vorschau-liste">${notizen.length ? notizen.map((n) => `<div style="margin-bottom:8px">${n}</div>`).join('') : 'Nichts Besonderes.'}</div>
        <h3 style="margin-top:22px">Chronik</h3>
        <div class="vorschau-liste" style="max-height:220px;overflow-y:auto;font-size:12px">
          ${s.log.slice(-26).reverse().map((l) => `<div style="margin-bottom:4px;color:var(--pergament-matt)">${esc(l.text)}</div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function bogenTafel(game, id) {
  const s = game.state;
  const c = s.party.find((x) => x.id === id) || s.party[0];
  if (!c) return '<div class="panel-koerper"><p>Keine Figur.</p></div>';
  const race = RACES[c.raceId];
  const cls = CLASSES[c.classId];
  const aktionen = characterActions(c);
  return `
    <div class="panel-kopf">
      <h2>${esc(c.name)}</h2>
      <div class="panel-reiter">
        ${s.party.map((p) => `<div class="reiter ${p.id === c.id ? 'aktiv' : ''}" data-held="${p.id}">${esc(p.name)}</div>`).join('')}
      </div>
      <button class="panel-schliessen" data-x>Schließen</button>
    </div>
    <div class="panel-koerper">
      <div class="bogen">
        <div class="bogen-links">
          <canvas width="336" height="336" id="bogenbild"></canvas>
          <div class="vorschau-klasse">${esc(race.name)} · ${esc(cls.name)} · Stufe ${c.level}</div>
          <div class="wertblock">
            ${['st', 'ge', 'ko', 'in', 'we', 'ch'].map((a) => `
              <div class="werttafel"><div class="k">${ABILITY_SHORT[a]}</div>
                <div class="v">${c.abilities[a]}</div>
                <div class="m">${formatMod(abilityMod(c.abilities[a]))}</div></div>`).join('')}
          </div>
          <div class="zeile-paar"><span>Trefferpunkte</span><span>${c.hp} / ${c.maxHp}</span></div>
          <div class="zeile-paar"><span>Rüstungsklasse</span><span>${c.ac}</span></div>
          <div class="zeile-paar"><span>Übungsbonus</span><span>${formatMod(c.proficiency)}</span></div>
          ${c.spellDc ? `<div class="zeile-paar"><span>Zauber-SG</span><span>${c.spellDc}</span></div>` : ''}
          <div class="zeile-paar"><span>Passive Wahrnehmung</span><span>${c.passivePerception}</span></div>
          ${c.forgetting ? `<div class="zeile-paar"><span>Vergessensgrad</span><span style="color:var(--fehl)">${c.forgetting}</span></div>` : ''}
        </div>
        <div>
          <h3>Fertigkeiten</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 22px;margin-bottom:20px">
            ${Object.entries(SKILLS).map(([k, v]) => {
              const mod = abilityMod(c.abilities[v.ability]) + (c.skills.includes(k) ? c.proficiency : 0);
              const geuebt = c.skills.includes(k);
              return `<div class="zeile-paar" style="${geuebt ? 'color:var(--pergament)' : 'opacity:.62'}">
                <span>${geuebt ? '◆ ' : '◇ '}${v.name}</span><span>${formatMod(mod)}</span></div>`;
            }).join('')}
          </div>
          <h3>Merkmale</h3>
          <div class="vorschau-liste" style="margin-bottom:18px">
            ${race.traits.map((t) => `<div>· ${esc(t)}</div>`).join('')}
            ${c.features.map((f) => `<div>· ${esc(f.name)}</div>`).join('')}
          </div>
          ${c.slotsMax?.length ? `<h3>Zauberplätze</h3><div class="vorschau-liste" style="margin-bottom:18px">
            ${c.slotsMax.map((m, i) => m ? `<div>Grad ${i + 1}: ${c.slots[i]} / ${m}</div>` : '').join('')}</div>` : ''}
          <h3>Aktionen im Kampf</h3>
          <div class="beutel-liste">
            ${aktionen.filter((a) => a.kind !== 'aktion').slice(0, 14).map((a) => `
              <div class="gegenstand"><span class="sym">${symbolFor(a)}</span>
                <div><h4>${esc(a.name)}</h4><p>${esc(a.desc || '')}</p></div></div>`).join('')}
          </div>
          <h3 style="margin-top:20px">Session Zero</h3>
          <div class="vorschau-liste">
            <div><b>Bereut:</b> ${esc(c.regret || '—')}</div>
            <div><b>Verloren:</b> ${esc(c.loss || '—')}</div>
            ${s.notes.sacrificedNames?.[c.name] ? `<div><b>An der Steintür gegeben:</b> ${esc(s.notes.sacrificedNames[c.name])}</div>` : ''}
            ${s.notes.anchors?.[c.name] ? `<div><b>Anker:</b> ${esc(s.notes.anchors[c.name])}</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

function beutelKoerper(game) {
  const s = game.state;
  const alle = [
    ...s.party_inventory.map((i) => ({ ...i, wer: 'Gruppe' })),
    ...s.party.flatMap((c) => c.inventory.map((i) => ({ ...i, wer: c.name }))),
  ];
  return `<div class="panel-koerper">
    <p style="color:var(--pergament-matt)">Gold: <b style="color:var(--messing-hell)">${s.party_gold}</b> GM</p>
    <div class="beutel-liste">
      ${alle.map((i) => `
        <div class="gegenstand ${i.legendaer ? 'legendaer' : ''}">
          <span class="sym">${i.legendaer ? '✦' : i.type === 'waffe' ? '⚔' : i.type === 'trank' ? '⚗' : '◈'}</span>
          <div><h4>${esc(i.name)}${i.count > 1 ? ` ×${i.count}` : ''}</h4>
            <p>${esc(i.desc || '')}${i.wer !== 'Gruppe' ? `<br><em>bei ${esc(i.wer)}</em>` : ''}</p></div>
        </div>`).join('') || '<p>Der Beutel ist leer.</p>'}
    </div>
    <h3 style="margin-top:26px">Die Haken dieser Gruppe</h3>
    <div class="vorschau-liste">
      ${hookReport(s).map((h) => `<div style="margin-bottom:7px"><b>${esc(h.title)}</b> — ${esc(h.text)}</div>`).join('')}
    </div>
  </div>`;
}

function hilfeKoerper() {
  return `<div class="panel-koerper">
    <div class="hilfe-raster">
      <div class="hilfe-block">
        <h3>Erkundung</h3>
        <dl>
          <dt>Linksklick auf den Boden</dt><dd>Die Gruppe geht dorthin.</dd>
          <dt>Linksklick auf eine Marke</dt><dd>Gespräch (❝), Untersuchen (✷), Kampf (⚔) oder Ausgang (➜).</dd>
          <dt>Rechte Maustaste ziehen</dt><dd>Kamera drehen. Mausrad zoomt.</dd>
          <dt><kbd>J</kbd> <kbd>C</kbd> <kbd>I</kbd> <kbd>H</kbd></dt><dd>Journal, Charakterbogen, Beutel, Hilfe.</dd>
        </dl>
      </div>
      <div class="hilfe-block">
        <h3>Gespräche</h3>
        <dl>
          <dt>Proben</dt><dd>Antworten mit einer Marke rechts würfeln W20 + Modifikator gegen einen Schwierigkeitsgrad. Es würfelt automatisch die Figur mit dem besten Wert.</dd>
          <dt>Misserfolg</dt><dd>ist kein Spielende. Fast jede Szene hat zwei Wege.</dd>
          <dt>Merken</dt><dd>Wer Namen <em>abschreibt</em>, statt sie nur zu lesen, gewinnt später dreimal.</dd>
        </dl>
      </div>
      <div class="hilfe-block">
        <h3>Kampf</h3>
        <dl>
          <dt>Ein Feld</dt><dd>entspricht 1,5 m. Blaue Felder sind erreichbar.</dd>
          <dt>Aktion / Bonusaktion</dt><dd>Je eine pro Zug, dazu Bewegung. Die Punkte oben in der Leiste zeigen, was übrig ist.</dd>
          <dt><kbd>1</kbd>–<kbd>9</kbd></dt><dd>Aktion wählen. <kbd>Leertaste</kbd> beendet den Zug. <kbd>Esc</kbd> bricht das Zielen ab.</dd>
          <dt>Gelegenheitsangriffe</dt><dd>Wer aus dem Nahkampf herausläuft, wird angegriffen.</dd>
        </dl>
      </div>
      <div class="hilfe-block">
        <h3>Die Uhr der Stillen Tiefe</h3>
        <dl>
          <dt>Sechs Kästchen</dt><dd>Sie füllt sich bei langen Rasten in Klarwasser, bei öffentlichen Anschuldigungen, bei ignorierten Zeichen und bei Tagen ohne Fortschritt.</dd>
          <dt>Bei 6/6</dt><dd>verschwindet Nella Vahl, und es bleibt nur der harte Weg. Die Kampagne geht weiter — sie wird nur kälter.</dd>
        </dl>
      </div>
      <div class="hilfe-block">
        <h3>Stufenaufstieg</h3>
        <dl>
          <dt>Keine Erfahrungspunkte</dt><dd>Ihr steigt an narrativen Wendepunkten auf, sofort.</dd>
          <dt>Rasten</dt><dd>Lange Rast heilt alles — kostet in Klarwasser aber ein Kästchen der Uhr.</dd>
        </dl>
      </div>
      <div class="hilfe-block">
        <h3>Was diese Kampagne anders macht</h3>
        <dl>
          <dt>Kein Bösewicht in Akt I</dt><dd>Die Antagonistin hat wahrscheinlich recht. Das ist das Problem.</dd>
          <dt>Verhandeln</dt><dd>Fast jeder Gegner ist bis zum letzten Trefferpunkt verhandelbar — auch der Feenfürst, auch der Drache.</dd>
          <dt>Namen</dt><dd>sind in diesem Spiel eine Währung. Geht sparsam damit um.</dd>
        </dl>
      </div>
    </div>
  </div>`;
}

function ueberKoerper() {
  return `<div class="panel-koerper">
    <div style="max-width:760px">
      <h3>Der Preis von Klarwasser</h3>
      <p>Ein Videospiel nach der vierbändigen Kampagne — Band I (Kampagnenbuch) und Band II/III (Begleitband mit Spielhilfen).
      Vier Akte, Stufe 1 bis 20: <b>Klarwasser</b>, <b>Der Riss</b>, <b>Die Asche des Klauth</b>, <b>Das Buch und die Feder</b>.</p>
      <h3>Ohne feste Helden</h3>
      <p>Das Kampagnenbuch band seine Haken an drei Figuren: Nyx, Kayn und Fibbel. Dieses Spiel kennt sie nicht.
      Stattdessen erstellt ihr eure eigene Gruppe, und die Haken werden zur Laufzeit neu vergeben — der Brief an die,
      die am ehesten liest; das Feuer an die, die es wirken kann; die Stimme in der Bürgerversammlung an die,
      der man zuhört. Auch die beiden Session-Zero-Fragen gehören euch: Was ihr bereut, sprechen die Steinernen Zeugen
      im Spiegelhof laut aus. Was ihr verloren habt, seht ihr im Spiegelgang.</p>
      <h3>Regeln</h3>
      <p>Eine schlanke, vollständig deutsche 5E-Variante: W20 gegen Schwierigkeitsgrade, Vorteil und Nachteil,
      Rettungswürfe, Konzentration, legendäre Aktionen, Schauplatz-Aktionen. Die Gegnerwerte stammen unverändert
      aus den Bögen des Begleitbands.</p>
      <h3>Technik</h3>
      <p>Babylon.js für die dreidimensionale Darstellung. Kein einziges geladenes Modell — jede Figur, jedes Haus
      und jeder Brunnen entsteht aus Grundkörpern. Das Spiel läuft vollständig lokal und braucht kein Netz.</p>
    </div>
  </div>`;
}

function karteKoerper(game) {
  const s = game.state;
  const ziele = erreichbareOrte(s);
  return `<div class="panel-koerper">
    <p style="color:var(--pergament-matt)">Orte, die ihr kennt. Reisen innerhalb Klarwassers kostet keine Zeit — der Weg zur Weggabelung schon.</p>
    <div class="reise-liste">
      ${ziele.map((z) => `
        <div class="reise-ziel ${z.gesperrt ? 'gesperrt' : ''}" ${z.gesperrt ? '' : `data-reise="${z.id}"`}>
          <span class="sym">${z.sym}</span>
          <div><h4>${esc(z.name)}</h4><p>${esc(z.text)}</p></div>
          ${z.kosten ? `<span class="kosten">${esc(z.kosten)}</span>` : ''}
        </div>`).join('')}
    </div>
  </div>`;
}

function erreichbareOrte(s) {
  const alle = [
    { id: 'dorfeingang', name: 'Ortseingang', sym: '⌂', text: 'Der Brunnen aus weißem Stein.', akt: 1 },
    { id: 'marktplatz', name: 'Marktplatz', sym: '⌘', text: 'Elf Steine aus anderem Material im Pflaster.', akt: 1 },
    { id: 'nasser_hut', name: 'Zum Nassen Hut', sym: '⌸', text: 'Neun Tische, acht benutzt.', akt: 1 },
    { id: 'kapelle', name: 'Kapelle', sym: '✝', text: 'Im Chorraum liegt das Register offen.', akt: 1 },
    { id: 'muehle', name: 'Vahl-Mühle', sym: '⚙', text: 'Wohnhaus und Kontor.', akt: 1 },
    { id: 'kaspars_huette', name: 'Kaspars Hütte', sym: '△', text: 'Außerhalb der Glockenreichweite. Das ist Absicht.', akt: 1, nur: 'ermittlung_offen' },
    { id: 'weggabelung', name: 'Die Weggabelung', sym: '⤬', text: 'Zwei Dinge liegen noch dort.', akt: 1, kosten: 'Uhr ×2', nur: 'ankunft_erledigt' },
  ];
  return alle
    .filter((o) => (o.akt || 1) <= s.act)
    .filter((o) => !o.nur || s.flags[o.nur])
    .map((o) => ({ ...o, gesperrt: o.id === s.area }));
}

function systemKoerper(game) {
  return `<div class="panel-koerper">
    <div style="display:flex;flex-direction:column;gap:10px;max-width:340px">
      <button data-s="speichern">Spiel speichern</button>
      <button data-s="rast">Lange Rast</button>
      <button data-s="kurzrast">Kurze Rast</button>
      <button data-s="menu" class="gefahr">Zurück zum Hauptmenü</button>
    </div>
    <p style="margin-top:22px;color:var(--pergament-matt);font-size:13px;max-width:420px">
      Eine lange Rast in Klarwasser kreuzt ein Kästchen der Uhr der Stillen Tiefe an.
      Das ist keine Strafe, sondern der Preis: Während ihr schlaft, rückt der Neumond näher.
    </p>
  </div>`;
}

export function symbolFor(a) {
  const map = {
    klinge: '⚔', bogen: '➶', funke: '✧', zauber: '✦', merkmal: '❖',
    schild: '⛨', stiefel: '⇉', hand: '✋', trank: '⚗',
  };
  return map[a.icon] || (a.kind === 'zauber' ? '✦' : '⚔');
}

function format(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[\[(.+?)\]\]/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

export { format as formatText };
