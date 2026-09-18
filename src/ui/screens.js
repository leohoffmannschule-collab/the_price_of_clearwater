// Hauptmenü und Charaktererschaffung.

import { RACES, CLASSES, BACKGROUNDS, POINT_BUY_TOTAL, pointBuyCost,
  SESSION_ZERO, PORTRAIT_PALETTES } from '../data/chargen.js';
import { SKILLS, abilityMod, formatMod, ABILITY_NAMES, ABILITY_SHORT } from '../engine/rules.js';
import { buildCharacter } from '../engine/character.js';
import { drawPortrait } from './figures.js';
import { listSaves, deleteSave } from '../engine/state.js';
import { pick, randInt } from '../engine/rng.js';

const NAMEN = {
  vorne: ['Anka', 'Brom', 'Cela', 'Doran', 'Elsbeth', 'Faren', 'Gisla', 'Hendrik', 'Ilva', 'Jorin',
    'Kella', 'Lorn', 'Mira', 'Nevin', 'Odile', 'Perrin', 'Quenn', 'Runa', 'Sivert', 'Tamsin',
    'Ulf', 'Vesna', 'Wendel', 'Yrsa', 'Zelda', 'Halvar', 'Sable', 'Thessa', 'Korrin', 'Marlein'],
  hinten: ['Grast', 'Odowic', 'Mohl', 'Wahl', 'Brunnenmann', 'Umbrecht', 'Vahl', 'Kessler',
    'vom Silberkamm', 'Aschbach', 'Reuter', 'Steinborn', 'Kaltwasser', 'Dorn', 'Falkenhain'],
};

export function mainMenu(game) {
  const root = document.createElement('div');
  root.id = 'menu';
  const saves = listSaves();
  root.innerHTML = `
    <div class="menu-box tafel">
      <div class="titel">Der Preis von<br>Klarwasser</div>
      <div class="unter">„Wie hieß das Mädchen?"</div>
      <div class="zeile">VIER AKTE · STUFE 1–20 · EIGENE CHARAKTERE</div>
      <div class="menu-knoepfe">
        <button class="haupt" data-a="neu">Neues Spiel</button>
        ${saves.length ? '<button data-a="laden">Spiel laden</button>' : ''}
        <button data-a="hilfe">Wie man spielt</button>
        <button data-a="ueber">Über diese Kampagne</button>
      </div>
      <div class="menu-fuss">
        Klarwasser hat seit zweihundert Jahren keine Missernte erlebt. Keine Seuche. Kein Feuer.<br>
        Die Stadt weiß, warum. Sie muss es nur alle siebzehn Jahre kurz vergessen.
      </div>
    </div>`;
  game.overlay.appendChild(root);

  root.querySelector('[data-a=neu]').onclick = () => game.neuesSpiel();
  root.querySelector('[data-a=hilfe]').onclick = () => game.panel('hilfe');
  root.querySelector('[data-a=ueber]').onclick = () => game.panel('ueber');
  const laden = root.querySelector('[data-a=laden]');
  if (laden) laden.onclick = () => zeigeSpielstaende(game, root);
}

function zeigeSpielstaende(game, menuRoot) {
  const saves = listSaves();
  const box = document.createElement('div');
  box.className = 'panel-schicht';
  box.innerHTML = `
    <div class="panel tafel" style="height:auto;max-height:70vh">
      <div class="panel-kopf"><h2>Spielstände</h2>
        <button class="panel-schliessen" data-x>Schließen</button></div>
      <div class="panel-koerper">
        <div class="reise-liste">
          ${saves.map((s, i) => `
            <div class="reise-ziel" data-load="${i}">
              <span class="sym">✦</span>
              <div><h4>${esc(s.name)}</h4>
                <p>Akt ${s.act} · Sitzung ${s.session} · Stufe ${s.level} · ${new Date(s.at).toLocaleString('de-DE')}</p></div>
              <span class="kosten" data-del="${i}">löschen</span>
            </div>`).join('') || '<p>Keine Spielstände.</p>'}
        </div>
      </div>
    </div>`;
  game.modal.appendChild(box);
  box.querySelector('[data-x]').onclick = () => box.remove();
  box.querySelectorAll('[data-load]').forEach((el) => {
    el.onclick = (e) => {
      if (e.target.dataset.del !== undefined) {
        deleteSave(saves[Number(e.target.dataset.del)].name);
        box.remove();
        menuRoot.remove();
        mainMenu(game);
        return;
      }
      box.remove();
      menuRoot.remove();
      game.ladeSpiel(saves[Number(el.dataset.load)].name);
    };
  });
}

/* ═══════════════════════ Charaktererschaffung ═══════════════════════ */

export function characterCreator(game) {
  return new Promise((resolve) => {
    const party = [];
    const root = document.createElement('div');
    root.id = 'creator';
    game.overlay.appendChild(root);

    const zeigeGruppe = () => {
      root.innerHTML = `
        <div class="creator-kopf">
          <h2>Eure Gruppe</h2>
          <div class="schritte"><div class="schritt aktiv">Drei Plätze am Feuer</div></div>
        </div>
        <div class="creator-koerper" style="grid-template-columns:1fr">
          <div class="creator-inhalt">
            <p style="max-width:720px;color:var(--pergament-matt)">
              Diese Kampagne hatte einmal feste Helden. Sie hat jetzt keine mehr.
              Stellt eure eigene Gruppe zusammen — bis zu drei Figuren. Alles, was das Kampagnenbuch
              an Nyx, Kayn und Fibbel gebunden hatte, wird danach <em>neu vergeben</em>: der Brief,
              das Instrument, das Feuer, die Stimme in der Bürgerversammlung.
            </p>
            <div class="gruppe-leiste" id="slots"></div>
            <div style="display:flex;gap:10px;margin-top:8px">
              <button data-a="schnell">Die restlichen Plätze auswürfeln</button>
            </div>
            <div id="haken-vorschau" style="margin-top:28px"></div>
          </div>
        </div>
        <div class="creator-fuss">
          <button data-a="zurueck">Zurück zum Menü</button>
          <button class="haupt" data-a="los" ${party.length ? '' : 'disabled'}>
            ${party.length ? `Mit ${party.length === 1 ? 'dieser Figur' : `diesen ${party.length}`} aufbrechen` : 'Mindestens eine Figur erstellen'}
          </button>
        </div>`;

      const slots = root.querySelector('#slots');
      for (let i = 0; i < 3; i++) {
        const c = party[i];
        const el = document.createElement('div');
        el.className = `gruppe-slot ${c ? 'voll' : ''}`;
        if (c) {
          const cv = document.createElement('canvas');
          cv.width = 124; cv.height = 124;
          drawPortrait(cv, { raceId: c.raceId, classId: c.classId, palette: PORTRAIT_PALETTES[c.portrait.palette] });
          el.appendChild(cv);
          const n = document.createElement('div');
          n.className = 'slotname';
          n.textContent = c.name;
          el.appendChild(n);
          el.title = `${c.raceName} ${c.className} — klicken zum Entfernen`;
          el.onclick = () => { party.splice(i, 1); zeigeGruppe(); };
        } else {
          el.textContent = '+ Figur erstellen';
          el.onclick = () => zeigeErschaffung(i);
        }
        slots.appendChild(el);
      }

      if (party.length) {
        const vs = root.querySelector('#haken-vorschau');
        vs.innerHTML = '<h3>Was die Kampagne über euch wissen wird</h3>';
        const liste = document.createElement('div');
        liste.className = 'vorschau-liste';
        liste.style.maxWidth = '720px';
        import('../engine/hooks.js').then(({ assignHooks, HOOK_DEFS }) => {
          const hooks = assignHooks(party);
          liste.innerHTML = HOOK_DEFS.map((h) => {
            const o = party.find((p) => p.id === hooks[h.id]);
            return o ? `<div style="margin-bottom:9px"><b>${h.title}</b> — ${esc(h.describe(o))}</div>` : '';
          }).join('');
        });
        vs.appendChild(liste);
      }

      root.querySelector('[data-a=schnell]').onclick = () => {
        while (party.length < 3) party.push(wuerfelCharakter(party));
        zeigeGruppe();
      };
      root.querySelector('[data-a=zurueck]').onclick = () => { root.remove(); resolve(null); };
      root.querySelector('[data-a=los]').onclick = () => { root.remove(); resolve(party); };
    };

    const zeigeErschaffung = (slotIndex) => {
      erstelleFigur(root, (char) => {
        if (char) party[slotIndex] = char;
        // Lücken schließen
        for (let i = 0; i < party.length; i++) if (!party[i]) party.splice(i, 1);
        zeigeGruppe();
      });
    };

    zeigeGruppe();
  });
}

/** Eine einzelne Figur bauen. */
function erstelleFigur(root, fertig) {
  const entwurf = {
    name: '',
    raceId: null, classId: null, backgroundId: null,
    baseScores: { st: 10, ge: 10, ko: 10, in: 10, we: 10, ch: 10 },
    skills: [],
    portrait: { palette: randInt(0, PORTRAIT_PALETTES.length - 1) },
    regret: '', loss: '',
  };
  const SCHRITTE = ['Volk', 'Klasse', 'Hintergrund', 'Attribute', 'Fertigkeiten', 'Name & Erinnerung'];
  let schritt = 0;

  const zeichne = () => {
    root.innerHTML = `
      <div class="creator-kopf">
        <h2>Figur erschaffen</h2>
        <div class="schritte">
          ${SCHRITTE.map((s, i) => `<div class="schritt ${i === schritt ? 'aktiv' : i < schritt ? 'fertig' : ''}">${s}</div>`).join('')}
        </div>
      </div>
      <div class="creator-koerper">
        <div class="creator-inhalt" id="inhalt"></div>
        <div class="creator-vorschau" id="vorschau"></div>
      </div>
      <div class="creator-fuss">
        <button data-a="zurueck">${schritt === 0 ? 'Abbrechen' : 'Zurück'}</button>
        <button class="haupt" data-a="weiter">${schritt === SCHRITTE.length - 1 ? 'Figur fertigstellen' : 'Weiter'}</button>
      </div>`;

    const inhalt = root.querySelector('#inhalt');
    switch (schritt) {
      case 0: schrittVolk(inhalt); break;
      case 1: schrittKlasse(inhalt); break;
      case 2: schrittHintergrund(inhalt); break;
      case 3: schrittAttribute(inhalt); break;
      case 4: schrittFertigkeiten(inhalt); break;
      case 5: schrittName(inhalt); break;
    }
    zeichneVorschau();

    root.querySelector('[data-a=zurueck]').onclick = () => {
      if (schritt === 0) { fertig(null); return; }
      schritt--; zeichne();
    };
    const weiter = root.querySelector('[data-a=weiter]');
    weiter.disabled = !schrittGueltig();
    weiter.onclick = () => {
      if (!schrittGueltig()) return;
      if (schritt === SCHRITTE.length - 1) {
        fertig(buildCharacter(entwurf));
        return;
      }
      schritt++;
      zeichne();
    };
  };

  const schrittGueltig = () => {
    if (schritt === 0) return !!entwurf.raceId;
    if (schritt === 1) return !!entwurf.classId;
    if (schritt === 2) return !!entwurf.backgroundId;
    if (schritt === 3) return pointBuyCost(entwurf.baseScores) === POINT_BUY_TOTAL;
    if (schritt === 4) return entwurf.skills.length === offeneFertigkeiten();
    if (schritt === 5) return entwurf.name.trim().length > 0;
    return true;
  };

  const offeneFertigkeiten = () => {
    const cls = CLASSES[entwurf.classId];
    const race = RACES[entwurf.raceId];
    return (cls?.skillCount || 0) + (race?.extraSkills || 0);
  };

  const schrittVolk = (el) => {
    el.innerHTML = '<h3>Wähle dein Volk</h3><div class="karten" id="k"></div>';
    const k = el.querySelector('#k');
    for (const r of Object.values(RACES)) {
      const c = document.createElement('div');
      c.className = `karte ${entwurf.raceId === r.id ? 'gewaehlt' : ''}`;
      const boni = Object.entries(r.bonuses).map(([a, v]) => `${ABILITY_SHORT[a]} +${v}`).join(' · ');
      c.innerHTML = `<h4>${r.name}</h4><p>${esc(r.desc)}</p><div class="werte">${boni}</div>`;
      c.onclick = () => { entwurf.raceId = r.id; zeichne(); };
      k.appendChild(c);
    }
  };

  const schrittKlasse = (el) => {
    el.innerHTML = '<h3>Wähle deine Klasse</h3><div class="karten" id="k"></div>';
    const k = el.querySelector('#k');
    for (const c of Object.values(CLASSES)) {
      const d = document.createElement('div');
      d.className = `karte ${entwurf.classId === c.id ? 'gewaehlt' : ''}`;
      d.innerHTML = `<h4>${c.name}</h4><p>${esc(c.desc)}</p>
        <div class="werte">W${c.hitDie} Trefferwürfel · RK ${c.armor} · ${c.casterType === 'keiner' ? 'kein Zauberwirker' : 'Zauber über ' + ABILITY_NAMES[c.spellAbility]}</div>`;
      d.onclick = () => {
        entwurf.classId = c.id;
        entwurf.skills = [];
        zeichne();
      };
      k.appendChild(d);
    }
  };

  const schrittHintergrund = (el) => {
    el.innerHTML = '<h3>Woher kommst du?</h3><div class="karten" id="k"></div>';
    const k = el.querySelector('#k');
    for (const b of Object.values(BACKGROUNDS)) {
      const d = document.createElement('div');
      d.className = `karte ${entwurf.backgroundId === b.id ? 'gewaehlt' : ''}`;
      d.innerHTML = `<h4>${b.name}</h4><p>${esc(b.desc)}</p>
        <div class="werte">${b.skills.map((s) => SKILLS[s].name).join(' · ')}</div>`;
      d.onclick = () => { entwurf.backgroundId = b.id; entwurf.skills = []; zeichne(); };
      k.appendChild(d);
    }
  };

  const schrittAttribute = (el) => {
    const kosten = pointBuyCost(entwurf.baseScores);
    el.innerHTML = `<h3>Attribute verteilen</h3>
      <div class="punkte">Punkte: <b>${POINT_BUY_TOTAL - kosten}</b> von ${POINT_BUY_TOTAL} übrig
        &nbsp;·&nbsp; Werte von 8 bis 15, Volksboni kommen danach obendrauf.</div>
      <div class="attribute" id="a"></div>
      <div style="margin-top:18px"><button data-a="std">Standardverteilung</button>
        <button data-a="zufall">Auswürfeln</button></div>`;
    const a = el.querySelector('#a');
    for (const ab of ['st', 'ge', 'ko', 'in', 'we', 'ch']) {
      const wert = entwurf.baseScores[ab];
      const bonus = RACES[entwurf.raceId]?.bonuses[ab] || 0;
      const z = document.createElement('div');
      z.className = 'attr-zeile';
      z.innerHTML = `
        <div class="attr-name">${ABILITY_NAMES[ab]}${bonus ? ` <span style="color:var(--wasser);font-size:12px">+${bonus}</span>` : ''}</div>
        <div class="attr-wert">${wert}</div>
        <div class="attr-knoepfe">
          <button data-m="-">−</button><button data-p="+">+</button>
        </div>
        <div class="attr-mod">${formatMod(abilityMod(wert + bonus))}</div>`;
      z.querySelector('[data-m]').onclick = () => {
        if (wert > 8) { entwurf.baseScores[ab]--; zeichne(); }
      };
      z.querySelector('[data-p]').onclick = () => {
        if (wert >= 15) return;
        const test = { ...entwurf.baseScores, [ab]: wert + 1 };
        if (pointBuyCost(test) <= POINT_BUY_TOTAL) { entwurf.baseScores = test; zeichne(); }
      };
      a.appendChild(z);
    }
    el.querySelector('[data-a=std]').onclick = () => {
      const cls = CLASSES[entwurf.classId];
      const reihe = [15, 14, 13, 12, 10, 8];
      const prio = [cls.primary, cls.saves[0] === cls.primary ? cls.saves[1] : cls.saves[0], 'ko',
        ...['st', 'ge', 'ko', 'in', 'we', 'ch'].filter((x) => x !== cls.primary && x !== 'ko')];
      const uniq = [...new Set(prio)];
      entwurf.baseScores = {};
      uniq.forEach((k, i) => { entwurf.baseScores[k] = reihe[i] ?? 8; });
      zeichne();
    };
    el.querySelector('[data-a=zufall]').onclick = () => {
      const keys = ['st', 'ge', 'ko', 'in', 'we', 'ch'];
      let scores;
      do {
        scores = {};
        for (const k of keys) scores[k] = randInt(8, 15);
      } while (pointBuyCost(scores) !== POINT_BUY_TOTAL);
      entwurf.baseScores = scores;
      zeichne();
    };
  };

  const schrittFertigkeiten = (el) => {
    const cls = CLASSES[entwurf.classId];
    const race = RACES[entwurf.raceId];
    const bg = BACKGROUNDS[entwurf.backgroundId];
    const fest = [...(race.skills || []), ...(bg.skills || [])];
    const offen = offeneFertigkeiten();
    const auswahl = new Set([...cls.skillChoices, ...Object.keys(SKILLS).slice(0, race.extraSkills ? 99 : 0)]);
    el.innerHTML = `<h3>Fertigkeiten wählen</h3>
      <div class="punkte">Noch <b>${offen - entwurf.skills.length}</b> von ${offen} zu wählen.
        Aus Volk und Hintergrund bringst du bereits mit: ${fest.map((s) => SKILLS[s].name).join(', ') || '—'}</div>
      <div class="fert-liste" id="f"></div>`;
    const f = el.querySelector('#f');
    for (const key of Object.keys(SKILLS)) {
      const istFest = fest.includes(key);
      const waehlbar = auswahl.has(key) || race.extraSkills;
      if (!istFest && !waehlbar) continue;
      const an = entwurf.skills.includes(key);
      const d = document.createElement('div');
      d.className = `fert ${istFest ? 'fest' : ''} ${an ? 'an' : ''}`;
      d.innerHTML = `<span class="kasten"></span><span>${SKILLS[key].name}</span>
        <span style="margin-left:auto;color:var(--wasser);font-size:11px">${ABILITY_SHORT[SKILLS[key].ability]}</span>`;
      if (!istFest) {
        d.onclick = () => {
          if (an) entwurf.skills = entwurf.skills.filter((s) => s !== key);
          else if (entwurf.skills.length < offen) entwurf.skills.push(key);
          zeichne();
        };
      }
      f.appendChild(d);
    }
  };

  const schrittName = (el) => {
    const bg = BACKGROUNDS[entwurf.backgroundId];
    el.innerHTML = `
      <h3>Name, Gesicht und zwei Fragen</h3>
      <div class="feld"><label>Name</label>
        <div style="display:flex;gap:9px">
          <input type="text" id="name" value="${esc(entwurf.name)}" placeholder="Wie nennt man dich?" maxlength="28">
          <button data-a="wuerfel" style="white-space:nowrap">Würfeln</button>
        </div></div>
      <div class="feld"><label>Farbton</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap" id="pal"></div></div>
      <div class="feld">
        <label>${SESSION_ZERO.regret.question}</label>
        <div style="font-size:12px;color:var(--pergament-matt);margin-bottom:7px">${SESSION_ZERO.regret.hint}</div>
        <input type="text" id="reue" value="${esc(entwurf.regret)}" placeholder="In einem Satz." maxlength="120">
        <div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap" id="reue-v"></div>
      </div>
      <div class="feld">
        <label>${SESSION_ZERO.loss.question}</label>
        <div style="font-size:12px;color:var(--pergament-matt);margin-bottom:7px">${SESSION_ZERO.loss.hint}</div>
        <input type="text" id="verlust" value="${esc(entwurf.loss)}" placeholder="In einem Satz." maxlength="120">
        <div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap" id="verlust-v"></div>
      </div>`;

    const nameEl = el.querySelector('#name');
    nameEl.oninput = () => { entwurf.name = nameEl.value; root.querySelector('[data-a=weiter]').disabled = !schrittGueltig(); zeichneVorschau(); };
    el.querySelector('[data-a=wuerfel]').onclick = () => {
      entwurf.name = `${pick(NAMEN.vorne)} ${pick(NAMEN.hinten)}`;
      zeichne();
    };
    const pal = el.querySelector('#pal');
    PORTRAIT_PALETTES.forEach((p, i) => {
      const b = document.createElement('div');
      b.style.cssText = `width:34px;height:34px;border-radius:3px;cursor:pointer;background:linear-gradient(135deg,${p.skin},${p.cloth});border:2px solid ${entwurf.portrait.palette === i ? 'var(--messing)' : 'transparent'}`;
      b.onclick = () => { entwurf.portrait.palette = i; zeichne(); };
      pal.appendChild(b);
    });
    const vorschlaege = (containerId, inputId, liste, feld) => {
      const c = el.querySelector(containerId);
      const inp = el.querySelector(inputId);
      inp.oninput = () => { entwurf[feld] = inp.value; };
      for (const v of liste) {
        const b = document.createElement('button');
        b.style.cssText = 'font-size:11.5px;padding:4px 10px';
        b.textContent = v.length > 46 ? `${v.slice(0, 44)}…` : v;
        b.title = v;
        b.onclick = () => { entwurf[feld] = v; inp.value = v; };
        c.appendChild(b);
      }
    };
    vorschlaege('#reue-v', '#reue', [...SESSION_ZERO.regret.presets, bg.regretHint], 'regret');
    vorschlaege('#verlust-v', '#verlust', SESSION_ZERO.loss.presets, 'loss');
  };

  const zeichneVorschau = () => {
    const v = root.querySelector('#vorschau');
    if (!v) return;
    if (!entwurf.raceId || !entwurf.classId) {
      v.innerHTML = '<p style="color:var(--pergament-matt);font-size:13px">Wähle Volk und Klasse, dann erscheint hier dein Bogen.</p>';
      return;
    }
    const race = RACES[entwurf.raceId];
    const cls = CLASSES[entwurf.classId];
    v.innerHTML = `
      <canvas class="portrait-vorschau" width="256" height="256"></canvas>
      <div class="vorschau-name">${esc(entwurf.name || 'Namenlos')}</div>
      <div class="vorschau-klasse">${race.name} · ${cls.name}</div>
      <div class="vorschau-werte">
        ${['st', 'ge', 'ko', 'in', 'we', 'ch'].map((a) => {
          const w = entwurf.baseScores[a] + (race.bonuses[a] || 0);
          return `<div class="vorschau-wert"><div class="k">${ABILITY_SHORT[a]}</div>
            <div class="v">${w}</div><div class="m">${formatMod(abilityMod(w))}</div></div>`;
        }).join('')}
      </div>
      <div class="vorschau-liste">
        <div><b>Trefferpunkte</b> ${cls.hitDie + abilityMod(entwurf.baseScores.ko + (race.bonuses.ko || 0)) + (race.hpPerLevel || 0)}</div>
        <div><b>Rüstungsklasse</b> ${cls.armor}</div>
        <div><b>Rettungswürfe</b> ${cls.saves.map((s) => ABILITY_SHORT[s]).join(', ')}</div>
        <div style="margin-top:10px"><b>Volksmerkmale</b><br>${race.traits.join('<br>')}</div>
        ${entwurf.skills.length ? `<div style="margin-top:10px"><b>Fertigkeiten</b><br>${entwurf.skills.map((s) => SKILLS[s].name).join(', ')}</div>` : ''}
      </div>`;
    const cv = v.querySelector('canvas');
    drawPortrait(cv, { raceId: entwurf.raceId, classId: entwurf.classId, palette: PORTRAIT_PALETTES[entwurf.portrait.palette] });
  };

  zeichne();
}

/** Eine zufällige, aber sinnvolle Figur. */
export function wuerfelCharakter(vorhanden = []) {
  const genutzteKlassen = new Set(vorhanden.map((c) => c.classId));
  const klassen = Object.keys(CLASSES).filter((k) => !genutzteKlassen.has(k));
  const classId = pick(klassen.length ? klassen : Object.keys(CLASSES));
  const cls = CLASSES[classId];
  const raceId = pick(Object.keys(RACES));
  const backgroundId = pick(Object.keys(BACKGROUNDS));
  const reihe = [15, 14, 13, 12, 10, 8];
  const prio = [...new Set([cls.primary, 'ko', ...['st', 'ge', 'in', 'we', 'ch'].filter((x) => x !== cls.primary)])];
  const baseScores = {};
  prio.forEach((k, i) => { baseScores[k] = reihe[i] ?? 8; });
  const anzahl = (cls.skillCount || 2) + (RACES[raceId].extraSkills || 0);
  const skills = [];
  const pool = [...cls.skillChoices];
  while (skills.length < anzahl && pool.length) {
    const s = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (!skills.includes(s)) skills.push(s);
  }
  return buildCharacter({
    name: `${pick(NAMEN.vorne)} ${pick(NAMEN.hinten)}`,
    raceId, classId, backgroundId, baseScores, skills,
    portrait: { palette: randInt(0, PORTRAIT_PALETTES.length - 1) },
    regret: pick(SESSION_ZERO.regret.presets),
    loss: pick(SESSION_ZERO.loss.presets),
  });
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
