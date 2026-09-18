// Prozedurale Kulissen. Klarwasser hat achtzig Häuser mit blaugrauen Schindeln,
// und keines davon ist eine geladene Datei.

import { shadeHex } from './figures.js';

const B = () => window.BABYLON;

function m(scene, name, hex, opts = {}) {
  const BJS = B();
  const mat = new BJS.StandardMaterial(name, scene);
  mat.diffuseColor = BJS.Color3.FromHexString(hex);
  mat.specularColor = new BJS.Color3(opts.spec ?? 0.04, opts.spec ?? 0.04, opts.spec ?? 0.05);
  if (opts.emissive) mat.emissiveColor = BJS.Color3.FromHexString(opts.emissive).scale(opts.glow ?? 0.5);
  if (opts.alpha !== undefined) mat.alpha = opts.alpha;
  if (opts.doppelseitig) mat.backFaceCulling = false;
  return mat;
}

/**
 * Satteldach. Der First läuft immer über die längere Hausachse, die Traufe
 * über die kürzere — sonst sieht jedes zweite Haus aus wie umgekippt.
 */
export function satteldach(scene, root, { w, d, h, farbe, giebelFarbe, neigung = 0.62, ueberstand = 0.22 }) {
  const BJS = B();
  const entlangX = w >= d;
  const lang = (entlangX ? w : d) + ueberstand * 2;
  const kurz = entlangX ? d : w;
  const halb = kurz / 2 + ueberstand;
  const schenkel = halb / Math.cos(neigung);
  const hoehe = halb * Math.tan(neigung);
  const dachM = m(scene, 'dachM', farbe);

  for (const s of [-1, 1]) {
    const flaeche = BJS.MeshBuilder.CreateBox('dachflaeche', {
      width: entlangX ? lang : schenkel,
      height: 0.12,
      depth: entlangX ? schenkel : lang,
    }, scene);
    flaeche.parent = root;
    if (entlangX) {
      flaeche.rotation.x = s * neigung;
      flaeche.position.set(0, h + hoehe / 2, s * halb / 2);
    } else {
      flaeche.rotation.z = -s * neigung;
      flaeche.position.set(s * halb / 2, h + hoehe / 2, 0);
    }
    flaeche.material = dachM;
  }

  const first = BJS.MeshBuilder.CreateBox('first', {
    width: entlangX ? lang : 0.16, height: 0.13, depth: entlangX ? 0.16 : lang,
  }, scene);
  first.parent = root;
  first.position.y = h + hoehe;
  first.material = m(scene, 'firstM', shadeHex(farbe, -0.12));

  // Giebeldreiecke an den Stirnseiten schließen das Dach.
  if (giebelFarbe) {
    const giebelM = m(scene, 'giebelM', giebelFarbe, { doppelseitig: true });
    for (const s of [-1, 1]) {
      const g = BJS.MeshBuilder.CreateCylinder('giebel', {
        height: 0.08, diameterTop: 0, diameterBottom: kurz, tessellation: 3,
      }, scene);
      g.parent = root;
      g.rotation.x = Math.PI / 2;
      g.scaling.y = hoehe / (kurz * 0.5);
      if (entlangX) g.position.set(s * (lang / 2 - ueberstand), h + hoehe / 2, 0);
      else { g.rotation.y = Math.PI / 2; g.position.set(0, h + hoehe / 2, s * (lang / 2 - ueberstand)); }
      g.material = giebelM;
    }
  }
  return root;
}

/** Wohnhaus mit Schindeldach. */
export function haus(scene, opts = {}) {
  const BJS = B();
  const root = new BJS.TransformNode('haus', scene);
  const w = opts.w ?? 3.2; const d = opts.d ?? 2.8; const h = opts.h ?? 2.4;
  const wandFarbe = opts.wand ?? '#b8a888';
  const dachFarbe = opts.dach ?? '#5a6a74';

  const wand = BJS.MeshBuilder.CreateBox('wand', { width: w, height: h, depth: d }, scene);
  wand.position.y = h / 2;
  wand.parent = root;
  wand.material = m(scene, 'hausWand', wandFarbe);
  wand.checkCollisions = true;

  // Fachwerkbalken
  const balkenM = m(scene, 'balken', '#4a3628');
  for (let i = 0; i < 3; i++) {
    const b = BJS.MeshBuilder.CreateBox('bl', { width: 0.11, height: h, depth: 0.09 }, scene);
    b.parent = root;
    b.position.set(-w / 2 + 0.25 + i * (w - 0.5) / 2, h / 2, d / 2 + 0.01);
    b.material = balkenM;
  }
  const quer = BJS.MeshBuilder.CreateBox('quer', { width: w, height: 0.12, depth: 0.09 }, scene);
  quer.parent = root; quer.position.set(0, h * 0.55, d / 2 + 0.01); quer.material = balkenM;

  satteldach(scene, root, { w, d, h, farbe: dachFarbe, giebelFarbe: wandFarbe });

  // Fenster
  const fensterM = m(scene, 'fenster', opts.licht ? '#ffc870' : '#2a2a34',
    opts.licht ? { emissive: '#ffb050', glow: 0.9 } : {});
  for (const s of [-1, 1]) {
    const f = BJS.MeshBuilder.CreatePlane('f', { width: 0.5, height: 0.6 }, scene);
    f.parent = root;
    f.position.set(s * w * 0.26, h * 0.6, d / 2 + 0.02);
    f.material = fensterM;
  }
  const tuer = BJS.MeshBuilder.CreatePlane('tuer', { width: 0.72, height: 1.35 }, scene);
  tuer.parent = root; tuer.position.set(0, 0.68, d / 2 + 0.02);
  tuer.material = m(scene, 'tuerM', '#3a2a1c');

  if (opts.licht) {
    const l = new BJS.PointLight('hausLicht', new BJS.Vector3(0, h * 0.6, d / 2 + 0.4), scene);
    l.parent = root;
    l.diffuse = BJS.Color3.FromHexString('#ffb050');
    l.intensity = 0.32; l.range = 6;
  }
  return root;
}

/** Der Brunnen am Ortseingang: weißer Stein, flache Schale, zwanzig Zentimeter Wasser. */
export function brunnen(scene, opts = {}) {
  const BJS = B();
  const root = new BJS.TransformNode('brunnen', scene);
  const steinM = m(scene, 'brunnenStein', opts.stein ?? '#ded8c8', { spec: 0.1 });

  const schale = BJS.MeshBuilder.CreateCylinder('schale', { height: 0.62, diameter: 2.5, tessellation: 20 }, scene);
  schale.parent = root; schale.position.y = 0.31; schale.material = steinM;
  const rand = BJS.MeshBuilder.CreateTorus('rand', { diameter: 2.5, thickness: 0.2, tessellation: 22 }, scene);
  rand.parent = root; rand.position.y = 0.62; rand.material = steinM;

  const wasser = BJS.MeshBuilder.CreateDisc('wasserflaeche', { radius: 1.12, tessellation: 22 }, scene);
  wasser.parent = root; wasser.rotation.x = Math.PI / 2; wasser.position.y = 0.6;
  const wm = m(scene, 'brunnenWasser', opts.wasser ?? '#9fd8e8', { emissive: opts.wasser ?? '#7ac0d8', glow: 0.35, alpha: 0.92, spec: 0.8 });
  wasser.material = wm;
  root.wasser = wasser;

  // Schwaches Licht aus dem Wasser — es ist klarer, als Wasser sein sollte.
  const l = new BJS.PointLight('brunnenLicht', new BJS.Vector3(0, 0.9, 0), scene);
  l.parent = root;
  l.diffuse = BJS.Color3.FromHexString(opts.wasser ?? '#8ac8e0');
  l.intensity = opts.dunkel ? 0.55 : 0.28;
  l.range = 7;
  root.licht = l;
  return root;
}

/** Die Kapelle der Morgenmutter — kalkweiß, eine Glocke von 1042. */
export function kapelle(scene, opts = {}) {
  const BJS = B();
  const root = new BJS.TransformNode('kapelle', scene);
  const kalk = m(scene, 'kalk', '#e0dcd0');

  const schiff = BJS.MeshBuilder.CreateBox('schiff', { width: 4.4, height: 3.4, depth: 7 }, scene);
  schiff.parent = root; schiff.position.y = 1.7; schiff.material = kalk;

  satteldach(scene, root, { w: 4.4, d: 7, h: 3.4, farbe: '#4a5a66', giebelFarbe: '#e0dcd0', neigung: 0.7 });

  const turm = BJS.MeshBuilder.CreateBox('turm', { width: 2.0, height: 6.4, depth: 2.0 }, scene);
  turm.parent = root; turm.position.set(0, 3.2, 4.0); turm.material = kalk;
  const spitze = BJS.MeshBuilder.CreateCylinder('spitze', { height: 2.6, diameterTop: 0, diameterBottom: 2.6, tessellation: 4 }, scene);
  spitze.parent = root; spitze.position.set(0, 7.7, 4.0); spitze.rotation.y = Math.PI / 4;
  spitze.material = m(scene, 'spitzeM', '#4a5a66');

  // Die Glocke: „so weit ich klinge"
  const glocke = BJS.MeshBuilder.CreateCylinder('glocke', { height: 0.7, diameterTop: 0.3, diameterBottom: 0.72, tessellation: 12 }, scene);
  glocke.parent = root; glocke.position.set(0, 5.6, 4.0);
  glocke.material = m(scene, 'glockeM', '#9a8248', { spec: 0.6, emissive: '#6a5020', glow: 0.18 });
  root.glocke = glocke;

  const tor = BJS.MeshBuilder.CreatePlane('tor', { width: 1.5, height: 2.4 }, scene);
  tor.parent = root; tor.position.set(0, 1.2, 3.02 + 2.0);
  tor.material = m(scene, 'torM', '#3a2a1c');

  const fensterM = m(scene, 'kfenster', '#6aa8c0', { emissive: '#4a88a0', glow: 0.55, alpha: 0.9 });
  for (const z of [-2, 0, 2]) {
    for (const s of [-1, 1]) {
      const f = BJS.MeshBuilder.CreatePlane('kf', { width: 0.6, height: 1.4 }, scene);
      f.parent = root; f.position.set(s * 2.22, 2.1, z);
      f.rotation.y = s * Math.PI / 2;
      f.material = fensterM;
    }
  }
  return root;
}

/** Die Vahl-Mühle mit Rad. */
export function muehle(scene) {
  const BJS = B();
  const root = new BJS.TransformNode('muehle', scene);
  const holzM = m(scene, 'muehleHolz', '#7a6448');
  const haus1 = BJS.MeshBuilder.CreateBox('mhaus', { width: 4.6, height: 4.2, depth: 4.0 }, scene);
  haus1.parent = root; haus1.position.y = 2.1; haus1.material = holzM;
  satteldach(scene, root, { w: 4.6, d: 4.0, h: 4.2, farbe: '#54606a', giebelFarbe: '#7a6448', neigung: 0.66 });

  const rad = new BJS.TransformNode('rad', scene);
  rad.parent = root; rad.position.set(-2.8, 1.8, 0);
  const nabe = BJS.MeshBuilder.CreateCylinder('nabe', { height: 0.5, diameter: 0.4, tessellation: 10 }, scene);
  nabe.parent = rad; nabe.rotation.z = Math.PI / 2; nabe.material = holzM;
  for (let i = 0; i < 10; i++) {
    const s = BJS.MeshBuilder.CreateBox('speiche', { width: 0.11, height: 3.0, depth: 0.42 }, scene);
    s.parent = rad; s.rotation.x = (i / 10) * Math.PI * 2; s.material = holzM;
    const schaufel = BJS.MeshBuilder.CreateBox('schaufel', { width: 0.55, height: 0.1, depth: 0.5 }, scene);
    schaufel.parent = rad;
    const a = (i / 10) * Math.PI * 2;
    schaufel.position.set(0, Math.cos(a) * 1.5, Math.sin(a) * 1.5);
    schaufel.rotation.x = a;
    schaufel.material = m(scene, 'schaufelM', '#5a4a34');
  }
  root.rad = rad;
  return root;
}

/** Baum. Der Kiefernwald steht überall, wo Klarwasser aufhört. */
export function baum(scene, opts = {}) {
  const BJS = B();
  const root = new BJS.TransformNode('baum', scene);
  const h = opts.h ?? (3.5 + Math.random() * 2.5);
  const stamm = BJS.MeshBuilder.CreateCylinder('stamm', { height: h * 0.55, diameterTop: 0.16, diameterBottom: 0.3, tessellation: 7 }, scene);
  stamm.parent = root; stamm.position.y = h * 0.275;
  stamm.material = m(scene, 'stammM', opts.stamm ?? '#4a3826');
  const laubM = m(scene, 'laubM', opts.laub ?? '#3a5232');
  if (opts.kiefer !== false) {
    for (let i = 0; i < 3; i++) {
      const k = BJS.MeshBuilder.CreateCylinder('krone', {
        height: h * 0.4, diameterTop: 0, diameterBottom: (1.9 - i * 0.42) * (opts.breite ?? 1), tessellation: 8,
      }, scene);
      k.parent = root;
      k.position.y = h * (0.5 + i * 0.22);
      k.material = laubM;
    }
  } else {
    const k = BJS.MeshBuilder.CreateSphere('krone', { diameterX: 2.4, diameterY: 2.0, diameterZ: 2.4, segments: 8 }, scene);
    k.parent = root; k.position.y = h * 0.75; k.material = laubM;
  }
  return root;
}

/** Fass, Kiste, Tisch, Bank — Kleinkram, der einen Ort bewohnt aussehen lässt. */
export function fass(scene) {
  const BJS = B();
  const f = BJS.MeshBuilder.CreateCylinder('fass', { height: 0.9, diameterTop: 0.58, diameterBottom: 0.58, tessellation: 12 }, scene);
  f.position.y = 0.45;
  f.material = m(scene, 'fassM', '#6a4e30');
  return f;
}

export function kiste(scene) {
  const BJS = B();
  const k = BJS.MeshBuilder.CreateBox('kiste', { width: 0.7, height: 0.6, depth: 0.7 }, scene);
  k.position.y = 0.3;
  k.material = m(scene, 'kisteM', '#7a5e3a');
  return k;
}

export function tisch(scene) {
  const BJS = B();
  const root = new BJS.TransformNode('tisch', scene);
  const holz = m(scene, 'tischHolz', '#6a5238');
  const platte = BJS.MeshBuilder.CreateBox('platte', { width: 1.7, height: 0.1, depth: 0.9 }, scene);
  platte.parent = root; platte.position.y = 0.78; platte.material = holz;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const b = BJS.MeshBuilder.CreateBox('tbein', { width: 0.1, height: 0.78, depth: 0.1 }, scene);
    b.parent = root; b.position.set(sx * 0.72, 0.39, sz * 0.34); b.material = holz;
  }
  return root;
}

/** Wimpel — beim Erntefest hängen sie über den Gassen. */
export function wimpelkette(scene, laenge = 8) {
  const BJS = B();
  const root = new BJS.TransformNode('wimpel', scene);
  const farben = ['#c04838', '#c8a14a', '#3a6a5a', '#8a4a70', '#d8c8a0'];
  const seil = BJS.MeshBuilder.CreateCylinder('seil', { height: laenge, diameter: 0.03, tessellation: 5 }, scene);
  seil.parent = root; seil.rotation.z = Math.PI / 2; seil.position.y = 3.0;
  seil.material = m(scene, 'seilM', '#3a3028');
  for (let i = 0; i < laenge * 2; i++) {
    const w = BJS.MeshBuilder.CreateCylinder('wp', { height: 0.34, diameterTop: 0.26, diameterBottom: 0, tessellation: 3 }, scene);
    w.parent = root;
    w.position.set(-laenge / 2 + i * 0.5, 2.82, 0);
    w.rotation.x = Math.PI;
    w.material = m(scene, `wpM${i % 5}`, farben[i % farben.length], { doppelseitig: true });
    root.getChildren && (w.wehen = i);
  }
  return root;
}

/** Lagerfeuer mit Licht. */
export function lagerfeuer(scene) {
  const BJS = B();
  const root = new BJS.TransformNode('feuer', scene);
  const holz = m(scene, 'feuerholz', '#3a2a1c');
  for (let i = 0; i < 5; i++) {
    const s = BJS.MeshBuilder.CreateCylinder('scheit', { height: 0.8, diameter: 0.11, tessellation: 5 }, scene);
    s.parent = root;
    const a = (i / 5) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.18, 0.28, Math.sin(a) * 0.18);
    s.rotation.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6);
    s.material = holz;
  }
  const flamme = BJS.MeshBuilder.CreateCylinder('flamme', { height: 0.75, diameterTop: 0, diameterBottom: 0.5, tessellation: 8 }, scene);
  flamme.parent = root; flamme.position.y = 0.6;
  flamme.material = m(scene, 'flammeM', '#ff9030', { emissive: '#ff7020', glow: 1.3, alpha: 0.85 });
  root.flamme = flamme;
  const l = new BJS.PointLight('feuerlicht', new BJS.Vector3(0, 0.9, 0), scene);
  l.parent = root; l.diffuse = BJS.Color3.FromHexString('#ff9040');
  l.intensity = 1.0; l.range = 11;
  root.licht = l;
  return root;
}

/** Spiegel ohne Vorderseite (Spiegelhof). */
export function spiegel(scene) {
  const BJS = B();
  const root = new BJS.TransformNode('spiegel', scene);
  const rahmen = BJS.MeshBuilder.CreateBox('rahmen', { width: 1.5, height: 2.6, depth: 0.14 }, scene);
  rahmen.parent = root; rahmen.position.y = 1.3;
  rahmen.material = m(scene, 'rahmenM', '#8a8478', { spec: 0.2 });
  const flaeche = BJS.MeshBuilder.CreatePlane('sflaeche', { width: 1.25, height: 2.3 }, scene);
  flaeche.parent = root; flaeche.position.set(0, 1.3, 0.09);
  const sm = m(scene, 'sflaecheM', '#0a1218', { emissive: '#28505e', glow: 0.35, alpha: 0.9, spec: 0.9 });
  flaeche.material = sm;
  return root;
}

/** Kerze — im Spiegelhof brennen sie unter den Stiefeln. */
export function kerze(scene, opts = {}) {
  const BJS = B();
  const root = new BJS.TransformNode('kerze', scene);
  const k = BJS.MeshBuilder.CreateCylinder('kerzenkorpus', { height: 0.3, diameter: 0.08, tessellation: 7 }, scene);
  k.parent = root; k.position.y = 0.15; k.material = m(scene, 'kerzeM', '#e8e0c8');
  const f = BJS.MeshBuilder.CreateSphere('kflamme', { diameter: 0.09, segments: 6 }, scene);
  f.parent = root; f.position.y = 0.36;
  f.material = m(scene, 'kflammeM', '#ffd070', { emissive: '#ffb040', glow: 1.4 });
  if (opts.licht !== false) {
    const l = new BJS.PointLight('kl', new BJS.Vector3(0, 0.4, 0), scene);
    l.parent = root; l.diffuse = BJS.Color3.FromHexString('#ffc060');
    l.intensity = 0.2; l.range = 4;
  }
  return root;
}

/** Gründerstein im Pflaster. Elf davon liegen auf dem Marktplatz, ein zwölfter ungesetzt. */
export function gruenderstein(scene, opts = {}) {
  const BJS = B();
  const root = new BJS.TransformNode('gstein', scene);
  const s = BJS.MeshBuilder.CreateCylinder('gs', { height: 0.14, diameter: 0.9, tessellation: 6 }, scene);
  s.parent = root; s.position.y = 0.07;
  const mm = m(scene, 'gsM', opts.farbe ?? '#c8c0a8', { spec: 0.14 });
  s.material = mm;
  root.stein = s;
  root.material = mm;
  return root;
}

/** Bücherregal (Bibliothek der Letzten Worte). */
export function regal(scene, opts = {}) {
  const BJS = B();
  const root = new BJS.TransformNode('regal', scene);
  const h = opts.h ?? 5.5;
  const holz = m(scene, 'regalHolz', '#2a2430');
  const korpus = BJS.MeshBuilder.CreateBox('rkorpus', { width: 2.2, height: h, depth: 0.55 }, scene);
  korpus.parent = root; korpus.position.y = h / 2; korpus.material = holz;
  const fachM = m(scene, 'fachM', opts.leer ? '#14101a' : '#5a4a6a',
    opts.leer ? {} : { emissive: '#6a5a8a', glow: 0.22 });
  const faecher = Math.floor(h / 0.7);
  for (let i = 0; i < faecher; i++) {
    const f = BJS.MeshBuilder.CreatePlane('fach', { width: 1.9, height: 0.5 }, scene);
    f.parent = root; f.position.set(0, 0.45 + i * 0.7, 0.29);
    f.material = fachM;
  }
  return root;
}

/** Goldhaufen (Klauths Hort). */
export function goldhaufen(scene, opts = {}) {
  const BJS = B();
  const r = opts.r ?? 2.2;
  const h = BJS.MeshBuilder.CreateSphere('gold', { diameterX: r * 2, diameterY: r * 0.6, diameterZ: r * 1.7, segments: 10 }, scene);
  h.position.y = r * 0.16;
  h.material = m(scene, 'goldM', '#d8b050', { spec: 0.8, emissive: '#8a6a20', glow: 0.25 });
  return h;
}

/** Verkohlte Ruine (Akt III). */
export function ruine(scene) {
  const BJS = B();
  const root = new BJS.TransformNode('ruine', scene);
  const kohleM = m(scene, 'kohleM', '#2a2420');
  for (let i = 0; i < 5; i++) {
    const b = BJS.MeshBuilder.CreateBox('balken', {
      width: 0.16, height: 1.2 + Math.random() * 1.6, depth: 0.16,
    }, scene);
    b.parent = root;
    b.position.set((Math.random() - 0.5) * 2.4, b.getBoundingInfo().boundingBox.extendSize.y, (Math.random() - 0.5) * 2.2);
    b.rotation.z = (Math.random() - 0.5) * 0.7;
    b.rotation.x = (Math.random() - 0.5) * 0.5;
    b.material = kohleM;
  }
  const sockel = BJS.MeshBuilder.CreateBox('sockel', { width: 2.8, height: 0.35, depth: 2.6 }, scene);
  sockel.parent = root; sockel.position.y = 0.17;
  sockel.material = m(scene, 'sockelM', '#3a3028');
  return root;
}

/** Felsbrocken. */
export function fels(scene, opts = {}) {
  const BJS = B();
  const s = opts.s ?? (0.7 + Math.random() * 1.1);
  const f = BJS.MeshBuilder.CreatePolyhedron('fels', { type: 1, size: s }, scene);
  f.position.y = s * 0.55;
  f.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  f.material = m(scene, 'felsM', opts.farbe ?? '#5e5a54');
  return f;
}

/** Steintür mit Runen (der Abstieg in Sitzung 4). */
export function steintuer(scene) {
  const BJS = B();
  const root = new BJS.TransformNode('steintuer', scene);
  const t = BJS.MeshBuilder.CreateBox('stuer', { width: 2.0, height: 3.0, depth: 0.4 }, scene);
  t.parent = root; t.position.y = 1.5;
  t.material = m(scene, 'stuerM', '#6a6458', { spec: 0.1 });
  const runenM = m(scene, 'runenM', '#6aa8c0', { emissive: '#4a88a8', glow: 0.75 });
  for (let i = 0; i < 11; i++) {
    const r = BJS.MeshBuilder.CreateBox('rune', { width: 0.12, height: 0.12, depth: 0.02 }, scene);
    r.parent = root;
    r.position.set(-0.6 + (i % 4) * 0.4, 0.8 + Math.floor(i / 4) * 0.55, 0.21);
    r.rotation.z = (i * 0.7) % 1.5;
    r.material = runenM;
  }
  return root;
}

/** Der zwölfte Stein mit dem Stab (Endkampf). */
export function stabImStein(scene) {
  const BJS = B();
  const root = new BJS.TransformNode('stabstein', scene);
  const stein = gruenderstein(scene, { farbe: '#8a8478' });
  stein.parent = root;
  const stab = BJS.MeshBuilder.CreateCylinder('stabmesh', { height: 1.6, diameter: 0.075, tessellation: 8 }, scene);
  stab.parent = root; stab.position.y = 0.9;
  stab.material = m(scene, 'stabWeiss', '#e8e4d8', { emissive: '#a8c8d8', glow: 0.5 });
  const l = new BJS.PointLight('stabLicht', new BJS.Vector3(0, 1.6, 0), scene);
  l.parent = root; l.diffuse = BJS.Color3.FromHexString('#a8d8e8'); l.intensity = 0.7; l.range = 9;
  root.stab = stab;
  return root;
}

/** Marktstand. */
export function marktstand(scene, opts = {}) {
  const BJS = B();
  const root = new BJS.TransformNode('stand', scene);
  const holz = m(scene, 'standHolz', '#6a5238');
  const platte = BJS.MeshBuilder.CreateBox('sp', { width: 2.2, height: 0.12, depth: 1.1 }, scene);
  platte.parent = root; platte.position.y = 0.95; platte.material = holz;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const b = BJS.MeshBuilder.CreateBox('sb', { width: 0.1, height: 0.95, depth: 0.1 }, scene);
    b.parent = root; b.position.set(sx * 0.95, 0.47, sz * 0.45); b.material = holz;
    const st = BJS.MeshBuilder.CreateCylinder('stange', { height: 2.2, diameter: 0.07, tessellation: 5 }, scene);
    st.parent = root; st.position.set(sx * 1.0, 1.1, sz * 0.5); st.material = holz;
  }
  const planeM = m(scene, 'planeM', opts.farbe ?? '#a84838', { doppelseitig: true });
  for (const s of [-1, 1]) {
    const f = BJS.MeshBuilder.CreateBox('sdach', { width: 2.4, height: 0.06, depth: 1.05 }, scene);
    f.parent = root;
    f.rotation.x = s * 0.55;
    f.position.set(0, 2.32, s * 0.46);
    f.material = planeM;
  }
  return root;
}

/** Netzfäden über dem Marktplatz (Akt II). */
export function netzfaden(scene, von, nach) {
  const BJS = B();
  const dx = nach.x - von.x; const dy = nach.y - von.y; const dz = nach.z - von.z;
  const len = Math.hypot(dx, dy, dz);
  const f = BJS.MeshBuilder.CreateCylinder('faden', { height: len, diameter: 0.035, tessellation: 4 }, scene);
  f.position.set((von.x + nach.x) / 2, (von.y + nach.y) / 2, (von.z + nach.z) / 2);
  const up = new BJS.Vector3(0, 1, 0);
  const dir = new BJS.Vector3(dx, dy, dz).normalize();
  const axis = BJS.Vector3.Cross(up, dir);
  const angle = Math.acos(BJS.Vector3.Dot(up, dir));
  if (axis.length() > 0.001) f.rotationQuaternion = BJS.Quaternion.RotationAxis(axis.normalize(), angle);
  f.material = m(scene, 'fadenM', '#2a1a2a', { emissive: '#4a2a4a', glow: 0.3, alpha: 0.85 });
  f.isPickable = false;
  return f;
}

export const PROP_BUILDERS = {
  haus, brunnen, kapelle, muehle, baum, fass, kiste, tisch, wimpelkette,
  lagerfeuer, spiegel, kerze, gruenderstein, regal, goldhaufen, ruine, fels,
  steintuer, stabImStein, marktstand,
};
