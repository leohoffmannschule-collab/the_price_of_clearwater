// Prozedurale Figuren.
// Kein einziges Modell wird geladen — jede Gestalt entsteht aus Grundkörpern.
// Das hält das Spiel leicht und macht jede selbst erstellte Figur sichtbar
// verschieden: Volk bestimmt Statur, Klasse bestimmt Ausrüstung.

const B = () => window.BABYLON;

const RACE_SHAPE = {
  mensch: { h: 1.0, breit: 1.0, kopf: 1.0 },
  hochelf: { h: 1.04, breit: 0.9, kopf: 0.95, ohren: true },
  waldelf: { h: 1.0, breit: 0.88, kopf: 0.95, ohren: true },
  zwerg: { h: 0.74, breit: 1.32, kopf: 1.15, bart: true },
  halbling: { h: 0.66, breit: 1.0, kopf: 1.2 },
  halbork: { h: 1.12, breit: 1.3, kopf: 1.05, hauer: true },
  tiefling: { h: 1.02, breit: 1.0, kopf: 1.0, hoerner: true, schweif: true },
  gnom: { h: 0.64, breit: 1.05, kopf: 1.25 },
  drachenblut: { h: 1.1, breit: 1.22, kopf: 1.05, schnauze: true, schweif: true },
  halbelf: { h: 1.0, breit: 0.95, kopf: 0.97, ohren: true },
};

const CLASS_GEAR = {
  kaempfer: { waffe: 'schwert', schild: true, ruestung: 'platte' },
  schurke: { waffe: 'dolch', kapuze: true, ruestung: 'leder' },
  magier: { waffe: 'stab', robe: true, ruestung: 'robe' },
  kleriker: { waffe: 'kolben', schild: true, ruestung: 'kette', halo: true },
  waldlaeufer: { waffe: 'bogen', umhang: true, ruestung: 'leder' },
  barde: { waffe: 'laute', ruestung: 'leder', feder: true },
  paladin: { waffe: 'schwert', schild: true, ruestung: 'platte', halo: true },
  barbar: { waffe: 'axt', ruestung: 'fell', nackt: true },
  hexenmeister: { waffe: 'dolch', robe: true, ruestung: 'robe', aura: true },
  druide: { waffe: 'stab', umhang: true, ruestung: 'fell', feder: true },
};

function mat(scene, name, hex, opts = {}) {
  const BJS = B();
  const m = new BJS.StandardMaterial(name, scene);
  m.diffuseColor = BJS.Color3.FromHexString(hex);
  m.specularColor = new BJS.Color3(opts.spec ?? 0.08, opts.spec ?? 0.08, opts.spec ?? 0.1);
  if (opts.emissive) m.emissiveColor = BJS.Color3.FromHexString(opts.emissive).scale(opts.glow ?? 0.5);
  if (opts.alpha !== undefined) m.alpha = opts.alpha;
  m.freeze?.();
  return m;
}

/**
 * Eine Figur bauen.
 * @param {object} scene
 * @param {object} spec {raceId, classId, palette:{skin,hair,cloth,accent}, tint, kind, scale}
 * @returns {object} TransformNode mit .teile für Animationen
 */
export function buildFigure(scene, spec) {
  const BJS = B();
  const root = new BJS.TransformNode(`fig_${spec.uid || Math.random()}`, scene);
  const kind = spec.kind || 'humanoid';

  if (kind === 'wolf') return buildBeast(scene, root, spec, 'wolf');
  if (kind === 'klein') return buildSmall(scene, root, spec);
  if (kind === 'spinne') return buildSpider(scene, root, spec);
  if (kind === 'drache') return buildDragon(scene, root, spec);
  if (kind === 'schwarm') return buildSwarm(scene, root, spec);
  if (kind === 'wächter') return buildConstruct(scene, root, spec);

  const shape = RACE_SHAPE[spec.raceId] || RACE_SHAPE.mensch;
  const gear = CLASS_GEAR[spec.classId] || CLASS_GEAR.kaempfer;
  const pal = spec.palette || { skin: '#c9a882', hair: '#2e2620', cloth: '#4a5a6a', accent: '#c8a14a' };
  const tint = spec.tint;

  const skinM = mat(scene, 'skin', tint || pal.skin);
  const clothM = mat(scene, 'cloth', pal.cloth);
  const hairM = mat(scene, 'hair', pal.hair);
  const metalM = mat(scene, 'metal', pal.accent, { spec: 0.45 });

  const H = 1.62 * shape.h * (spec.scale || 1);
  const teile = {};

  // Beine
  const beinH = H * 0.42;
  for (const s of [-1, 1]) {
    const bein = BJS.MeshBuilder.CreateCylinder(`bein${s}`, {
      height: beinH, diameterTop: H * 0.1 * shape.breit, diameterBottom: H * 0.085 * shape.breit, tessellation: 8,
    }, scene);
    bein.parent = root;
    bein.position.set(s * H * 0.072 * shape.breit, beinH / 2, 0);
    bein.material = gear.robe ? clothM : mat(scene, 'hose', shadeHex(pal.cloth, -0.25));
    teile[`bein${s > 0 ? 'R' : 'L'}`] = bein;
  }

  // Rumpf
  const rumpfH = H * 0.36;
  const rumpf = BJS.MeshBuilder.CreateCylinder('rumpf', {
    height: rumpfH,
    diameterTop: H * 0.27 * shape.breit,
    diameterBottom: H * 0.22 * shape.breit,
    tessellation: 10,
  }, scene);
  rumpf.parent = root;
  rumpf.position.y = beinH + rumpfH / 2;
  rumpf.material = gear.nackt ? skinM : (gear.ruestung === 'platte' || gear.ruestung === 'kette' ? metalM : clothM);
  teile.rumpf = rumpf;

  // Robe (Magier / Hexenmeister)
  if (gear.robe) {
    const robe = BJS.MeshBuilder.CreateCylinder('robe', {
      height: H * 0.56, diameterTop: H * 0.26 * shape.breit, diameterBottom: H * 0.42 * shape.breit, tessellation: 12,
    }, scene);
    robe.parent = root;
    robe.position.y = H * 0.28;
    robe.material = clothM;
    teile.robe = robe;
  }

  // Umhang
  if (gear.umhang || gear.kapuze) {
    const umhang = BJS.MeshBuilder.CreateCylinder('umhang', {
      height: H * 0.5, diameterTop: H * 0.24 * shape.breit, diameterBottom: H * 0.34 * shape.breit,
      tessellation: 10, arc: 0.55,
    }, scene);
    umhang.parent = root;
    umhang.position.set(0, H * 0.46, -H * 0.045);
    umhang.rotation.y = Math.PI * 0.72;
    umhang.material = mat(scene, 'umhang', shadeHex(pal.cloth, -0.35));
    teile.umhang = umhang;
  }

  // Schultern
  const schulter = BJS.MeshBuilder.CreateCylinder('schulter', {
    height: H * 0.055, diameter: H * 0.3 * shape.breit, tessellation: 10,
  }, scene);
  schulter.parent = root;
  schulter.position.y = beinH + rumpfH - H * 0.02;
  schulter.material = gear.ruestung === 'platte' ? metalM : clothM;

  // Arme
  const armH = H * 0.32;
  for (const s of [-1, 1]) {
    const arm = BJS.MeshBuilder.CreateCylinder(`arm${s}`, {
      height: armH, diameter: H * 0.072 * shape.breit, tessellation: 7,
    }, scene);
    arm.parent = root;
    arm.setPivotPoint(new BJS.Vector3(0, armH / 2, 0));
    arm.position.set(s * H * 0.15 * shape.breit, beinH + rumpfH - armH / 2 - H * 0.03, 0);
    arm.material = gear.nackt ? skinM : (gear.ruestung === 'platte' ? metalM : clothM);
    teile[`arm${s > 0 ? 'R' : 'L'}`] = arm;
  }

  // Kopf
  const kopfD = H * 0.2 * shape.kopf;
  const kopf = BJS.MeshBuilder.CreateSphere('kopf', { diameter: kopfD, segments: 10 }, scene);
  kopf.parent = root;
  kopf.position.y = beinH + rumpfH + kopfD * 0.48;
  kopf.material = skinM;
  teile.kopf = kopf;

  // Haar / Kapuze
  if (gear.kapuze) {
    const kap = BJS.MeshBuilder.CreateSphere('kapuze', { diameter: kopfD * 1.28, segments: 9, slice: 0.62 }, scene);
    kap.parent = root;
    kap.position.y = kopf.position.y + kopfD * 0.09;
    kap.material = mat(scene, 'kapuze', shadeHex(pal.cloth, -0.4));
  } else {
    const haar = BJS.MeshBuilder.CreateSphere('haar', { diameter: kopfD * 1.07, segments: 9, slice: 0.56 }, scene);
    haar.parent = root;
    haar.position.y = kopf.position.y + kopfD * 0.075;
    haar.material = hairM;
  }

  if (shape.bart) {
    const bart = BJS.MeshBuilder.CreateCylinder('bart', {
      height: kopfD * 0.72, diameterTop: kopfD * 0.6, diameterBottom: kopfD * 0.34, tessellation: 8,
    }, scene);
    bart.parent = root;
    bart.position.set(0, kopf.position.y - kopfD * 0.44, kopfD * 0.3);
    bart.material = hairM;
  }
  if (shape.ohren) {
    for (const s of [-1, 1]) {
      const ohr = BJS.MeshBuilder.CreateCylinder(`ohr${s}`, { height: kopfD * 0.5, diameterTop: 0.002, diameterBottom: kopfD * 0.13, tessellation: 5 }, scene);
      ohr.parent = root;
      ohr.position.set(s * kopfD * 0.45, kopf.position.y + kopfD * 0.12, 0);
      ohr.rotation.z = s * -0.65;
      ohr.material = skinM;
    }
  }
  if (shape.hoerner) {
    for (const s of [-1, 1]) {
      const horn = BJS.MeshBuilder.CreateCylinder(`horn${s}`, { height: kopfD * 0.78, diameterTop: 0.004, diameterBottom: kopfD * 0.16, tessellation: 6 }, scene);
      horn.parent = root;
      horn.position.set(s * kopfD * 0.32, kopf.position.y + kopfD * 0.5, -kopfD * 0.08);
      horn.rotation.z = s * -0.42;
      horn.rotation.x = -0.35;
      horn.material = mat(scene, 'horn', '#3a2830');
    }
  }
  if (shape.hauer) {
    for (const s of [-1, 1]) {
      const hauer = BJS.MeshBuilder.CreateCylinder(`hauer${s}`, { height: kopfD * 0.3, diameterTop: 0.003, diameterBottom: kopfD * 0.08, tessellation: 5 }, scene);
      hauer.parent = root;
      hauer.position.set(s * kopfD * 0.2, kopf.position.y - kopfD * 0.26, kopfD * 0.36);
      hauer.material = mat(scene, 'hauer', '#e0dcc8');
    }
  }
  if (shape.schnauze) {
    const schnauze = BJS.MeshBuilder.CreateCylinder('schnauze', { height: kopfD * 0.55, diameterTop: kopfD * 0.34, diameterBottom: kopfD * 0.6, tessellation: 8 }, scene);
    schnauze.parent = root;
    schnauze.rotation.x = Math.PI / 2;
    schnauze.position.set(0, kopf.position.y - kopfD * 0.06, kopfD * 0.5);
    schnauze.material = skinM;
  }
  if (shape.schweif) {
    const schweif = BJS.MeshBuilder.CreateCylinder('schweif', { height: H * 0.5, diameterTop: 0.01, diameterBottom: H * 0.05, tessellation: 6 }, scene);
    schweif.parent = root;
    schweif.position.set(0, beinH * 0.85, -H * 0.13);
    schweif.rotation.x = 0.9;
    schweif.material = skinM;
    teile.schweif = schweif;
  }

  // Waffe in der rechten Hand
  const hand = new BJS.TransformNode('hand', scene);
  hand.parent = root;
  hand.position.set(H * 0.2 * shape.breit, beinH + rumpfH * 0.42, H * 0.06);
  teile.hand = hand;
  addWeapon(scene, hand, gear.waffe, H, metalM, pal);

  if (gear.schild) {
    const schild = BJS.MeshBuilder.CreateCylinder('schild', { height: H * 0.02, diameter: H * 0.29, tessellation: 12 }, scene);
    schild.parent = root;
    schild.rotation.x = Math.PI / 2;
    schild.rotation.z = 0.2;
    schild.position.set(-H * 0.21 * shape.breit, beinH + rumpfH * 0.5, H * 0.09);
    schild.material = metalM;
  }
  if (gear.halo) {
    const halo = BJS.MeshBuilder.CreateTorus('halo', { diameter: kopfD * 1.5, thickness: 0.012, tessellation: 20 }, scene);
    halo.parent = root;
    halo.position.y = kopf.position.y + kopfD * 0.75;
    halo.material = mat(scene, 'halo', '#ffe8a0', { emissive: '#ffd070', glow: 1.1 });
    teile.halo = halo;
  }
  if (gear.aura) {
    const aura = BJS.MeshBuilder.CreateSphere('aura', { diameter: H * 0.62, segments: 10 }, scene);
    aura.parent = root;
    aura.position.y = H * 0.5;
    aura.material = mat(scene, 'auraM', '#6a3a8a', { emissive: '#8a4ab0', glow: 0.35, alpha: 0.13 });
    aura.isPickable = false;
    teile.aura = aura;
  }

  root.hoehe = H;
  root.teile = teile;
  root.spec = spec;
  return root;
}

function addWeapon(scene, hand, kind, H, metalM, pal) {
  const BJS = B();
  const holz = mat(scene, 'holz', '#4a3826');
  if (kind === 'schwert') {
    const klinge = BJS.MeshBuilder.CreateBox('klinge', { width: H * 0.035, height: H * 0.52, depth: H * 0.012 }, scene);
    klinge.parent = hand; klinge.position.y = H * 0.22; klinge.material = metalM;
    const griff = BJS.MeshBuilder.CreateCylinder('griff', { height: H * 0.11, diameter: H * 0.022, tessellation: 6 }, scene);
    griff.parent = hand; griff.position.y = -H * 0.06; griff.material = holz;
    const parier = BJS.MeshBuilder.CreateBox('parier', { width: H * 0.13, height: H * 0.017, depth: H * 0.02 }, scene);
    parier.parent = hand; parier.material = metalM;
  } else if (kind === 'axt') {
    const stiel = BJS.MeshBuilder.CreateCylinder('stiel', { height: H * 0.62, diameter: H * 0.026, tessellation: 6 }, scene);
    stiel.parent = hand; stiel.position.y = H * 0.18; stiel.material = holz;
    const blatt = BJS.MeshBuilder.CreateCylinder('blatt', { height: H * 0.02, diameterTop: H * 0.1, diameterBottom: H * 0.2, tessellation: 3 }, scene);
    blatt.parent = hand; blatt.position.set(H * 0.07, H * 0.42, 0); blatt.rotation.z = Math.PI / 2; blatt.material = metalM;
  } else if (kind === 'stab') {
    const stab = BJS.MeshBuilder.CreateCylinder('stab', { height: H * 0.95, diameter: H * 0.024, tessellation: 7 }, scene);
    stab.parent = hand; stab.position.y = H * 0.3; stab.material = mat(scene, 'stabM', '#d8d4c4');
    const knauf = BJS.MeshBuilder.CreateSphere('knauf', { diameter: H * 0.06, segments: 8 }, scene);
    knauf.parent = hand; knauf.position.y = H * 0.76;
    knauf.material = mat(scene, 'knaufM', pal.accent, { emissive: pal.accent, glow: 0.55 });
  } else if (kind === 'bogen') {
    const bogen = BJS.MeshBuilder.CreateTorus('bogen', { diameter: H * 0.46, thickness: H * 0.018, tessellation: 14, arc: 0.55 }, scene);
    bogen.parent = hand; bogen.rotation.y = Math.PI / 2; bogen.rotation.z = 0.35;
    bogen.position.y = H * 0.12; bogen.material = holz;
  } else if (kind === 'kolben') {
    const stiel = BJS.MeshBuilder.CreateCylinder('kstiel', { height: H * 0.34, diameter: H * 0.024, tessellation: 6 }, scene);
    stiel.parent = hand; stiel.position.y = H * 0.1; stiel.material = holz;
    const kopf = BJS.MeshBuilder.CreateCylinder('kkopf', { height: H * 0.1, diameter: H * 0.08, tessellation: 7 }, scene);
    kopf.parent = hand; kopf.position.y = H * 0.3; kopf.material = metalM;
  } else if (kind === 'dolch') {
    const klinge = BJS.MeshBuilder.CreateBox('dklinge', { width: H * 0.022, height: H * 0.2, depth: H * 0.008 }, scene);
    klinge.parent = hand; klinge.position.y = H * 0.1; klinge.material = metalM;
  } else if (kind === 'laute') {
    const korpus = BJS.MeshBuilder.CreateSphere('korpus', { diameterX: H * 0.18, diameterY: H * 0.22, diameterZ: H * 0.1, segments: 9 }, scene);
    korpus.parent = hand; korpus.position.y = H * 0.02; korpus.material = holz;
    const hals = BJS.MeshBuilder.CreateBox('hals', { width: H * 0.026, height: H * 0.3, depth: H * 0.02 }, scene);
    hals.parent = hand; hals.position.y = H * 0.22; hals.material = mat(scene, 'hals', '#6a4a2a');
  }
}

/* ───────────── Sondergestalten ───────────── */

function buildSmall(scene, root, spec) {
  // Nasser Kleiner: Kinderkleidung, und was darin steckt, ist Schlamm und Wasser.
  const BJS = B();
  const wasserM = mat(scene, 'nassM', spec.tint || '#5a7a80', { alpha: 0.86, emissive: '#3a6a78', glow: 0.22 });
  const kleidM = mat(scene, 'kleidM', '#4a5258');
  const koerper = BJS.MeshBuilder.CreateCylinder('nk', { height: 0.62, diameterTop: 0.2, diameterBottom: 0.3, tessellation: 9 }, scene);
  koerper.parent = root; koerper.position.y = 0.31; koerper.material = kleidM;
  const kopf = BJS.MeshBuilder.CreateSphere('nkkopf', { diameter: 0.28, segments: 9 }, scene);
  kopf.parent = root; kopf.position.y = 0.74; kopf.material = wasserM;
  for (const s of [-1, 1]) {
    const arm = BJS.MeshBuilder.CreateCylinder(`nkarm${s}`, { height: 0.3, diameter: 0.06, tessellation: 6 }, scene);
    arm.parent = root; arm.position.set(s * 0.15, 0.45, 0); arm.rotation.z = s * 0.3; arm.material = wasserM;
    root.teile = root.teile || {};
    root.teile[`arm${s > 0 ? 'R' : 'L'}`] = arm;
  }
  const pfuetze = BJS.MeshBuilder.CreateDisc('pf', { radius: 0.34, tessellation: 14 }, scene);
  pfuetze.parent = root; pfuetze.rotation.x = Math.PI / 2; pfuetze.position.y = 0.01;
  pfuetze.material = mat(scene, 'pfM', '#3a5a64', { alpha: 0.45, emissive: '#2a4a58', glow: 0.3 });
  root.hoehe = 0.9;
  root.teile = root.teile || {};
  root.teile.kopf = kopf;
  root.teile.rumpf = koerper;
  return root;
}

function buildBeast(scene, root, spec, kind) {
  const BJS = B();
  const fell = mat(scene, 'fell', spec.tint || '#6a6258');
  const koerper = BJS.MeshBuilder.CreateSphere('leib', { diameterX: 0.52, diameterY: 0.46, diameterZ: 1.05, segments: 10 }, scene);
  koerper.parent = root; koerper.position.y = 0.52; koerper.material = fell;
  const kopf = BJS.MeshBuilder.CreateSphere('bkopf', { diameterX: 0.3, diameterY: 0.3, diameterZ: 0.42, segments: 9 }, scene);
  kopf.parent = root; kopf.position.set(0, 0.62, 0.6); kopf.material = fell;
  const schnauze = BJS.MeshBuilder.CreateCylinder('bschn', { height: 0.26, diameterTop: 0.12, diameterBottom: 0.19, tessellation: 7 }, scene);
  schnauze.parent = root; schnauze.rotation.x = Math.PI / 2; schnauze.position.set(0, 0.57, 0.84); schnauze.material = fell;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const bein = BJS.MeshBuilder.CreateCylinder(`bbein${sx}${sz}`, { height: 0.46, diameter: 0.1, tessellation: 6 }, scene);
    bein.parent = root; bein.position.set(sx * 0.18, 0.23, sz * 0.33); bein.material = fell;
  }
  const schweif = BJS.MeshBuilder.CreateCylinder('bschweif', { height: 0.4, diameterTop: 0.03, diameterBottom: 0.09, tessellation: 6 }, scene);
  schweif.parent = root; schweif.position.set(0, 0.62, -0.58); schweif.rotation.x = -0.9; schweif.material = fell;
  root.hoehe = 0.95;
  root.teile = { kopf, rumpf: koerper };
  return root;
}

function buildSpider(scene, root, spec) {
  const BJS = B();
  const chitin = mat(scene, 'chitin', spec.tint || '#503a60', { spec: 0.3 });
  const leib = BJS.MeshBuilder.CreateSphere('sleib', { diameterX: 0.6, diameterY: 0.44, diameterZ: 0.78, segments: 10 }, scene);
  leib.parent = root; leib.position.y = 0.52; leib.material = chitin;
  const kopf = BJS.MeshBuilder.CreateSphere('skopf', { diameter: 0.34, segments: 9 }, scene);
  kopf.parent = root; kopf.position.set(0, 0.46, 0.46); kopf.material = chitin;
  const augen = mat(scene, 'augen', '#d04040', { emissive: '#ff5030', glow: 0.9 });
  for (const s of [-1, 1]) {
    const auge = BJS.MeshBuilder.CreateSphere(`sauge${s}`, { diameter: 0.07, segments: 6 }, scene);
    auge.parent = root; auge.position.set(s * 0.09, 0.52, 0.6); auge.material = augen;
  }
  const beine = [];
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const bein = BJS.MeshBuilder.CreateCylinder(`sbein${i}${s}`, { height: 0.8, diameterTop: 0.02, diameterBottom: 0.06, tessellation: 5 }, scene);
      bein.parent = root;
      const ang = (i - 1.5) * 0.42;
      bein.position.set(s * 0.32, 0.46, Math.sin(ang) * 0.34);
      bein.rotation.z = s * (0.95 + Math.cos(ang) * 0.12);
      bein.rotation.x = ang * 0.5;
      bein.material = chitin;
      beine.push(bein);
    }
  }
  root.hoehe = 0.9;
  root.teile = { kopf, rumpf: leib, beine };
  return root;
}

function buildConstruct(scene, root, spec) {
  const BJS = B();
  const stein = mat(scene, 'steinM', spec.tint || '#8a8578', { spec: 0.05 });
  const leib = BJS.MeshBuilder.CreateBox('kleib', { width: 0.62, height: 0.95, depth: 0.45 }, scene);
  leib.parent = root; leib.position.y = 0.95; leib.material = stein;
  const kopf = BJS.MeshBuilder.CreateBox('kkopf2', { width: 0.34, height: 0.34, depth: 0.34 }, scene);
  kopf.parent = root; kopf.position.y = 1.58; kopf.material = stein;
  const glut = mat(scene, 'glutM', '#c8a14a', { emissive: '#e0b060', glow: 1.0 });
  for (const s of [-1, 1]) {
    const auge = BJS.MeshBuilder.CreateBox(`kauge${s}`, { width: 0.07, height: 0.04, depth: 0.02 }, scene);
    auge.parent = root; auge.position.set(s * 0.08, 1.6, 0.18); auge.material = glut;
    const arm = BJS.MeshBuilder.CreateBox(`karm${s}`, { width: 0.18, height: 0.72, depth: 0.2 }, scene);
    arm.parent = root; arm.position.set(s * 0.42, 1.0, 0); arm.material = stein;
    root.teile = root.teile || {};
    root.teile[`arm${s > 0 ? 'R' : 'L'}`] = arm;
  }
  for (const s of [-1, 1]) {
    const bein = BJS.MeshBuilder.CreateBox(`kbein${s}`, { width: 0.22, height: 0.5, depth: 0.24 }, scene);
    bein.parent = root; bein.position.set(s * 0.16, 0.25, 0); bein.material = stein;
  }
  root.hoehe = 1.8;
  root.teile = { ...(root.teile || {}), kopf, rumpf: leib };
  return root;
}

function buildSwarm(scene, root, spec) {
  const BJS = B();
  const federM = mat(scene, 'federM', spec.tint || '#2a2a32', { alpha: 0.9 });
  const teile = [];
  for (let i = 0; i < 26; i++) {
    const f = BJS.MeshBuilder.CreatePlane(`feder${i}`, { width: 0.16, height: 0.3 }, scene);
    f.parent = root;
    const a = (i / 26) * Math.PI * 2;
    const r = 0.25 + Math.random() * 0.45;
    f.position.set(Math.cos(a) * r, 0.4 + Math.random() * 1.0, Math.sin(a) * r);
    f.rotation.set(Math.random() * 3, a, Math.random() * 3);
    f.material = federM;
    teile.push(f);
  }
  root.hoehe = 1.5;
  root.teile = { federn: teile };
  root.schwarm = true;
  return root;
}

function buildDragon(scene, root, spec) {
  const BJS = B();
  const skala = spec.scale || 1;
  const haut = mat(scene, 'dhaut', spec.tint || '#c03818', { spec: 0.22 });
  const leib = BJS.MeshBuilder.CreateSphere('dleib', { diameterX: 1.5 * skala, diameterY: 1.3 * skala, diameterZ: 3.0 * skala, segments: 12 }, scene);
  leib.parent = root; leib.position.y = 1.5 * skala; leib.material = haut;
  const hals = BJS.MeshBuilder.CreateCylinder('dhals', { height: 1.7 * skala, diameterTop: 0.5 * skala, diameterBottom: 0.9 * skala, tessellation: 9 }, scene);
  hals.parent = root; hals.position.set(0, 2.3 * skala, 1.4 * skala); hals.rotation.x = 0.65; hals.material = haut;
  const kopf = BJS.MeshBuilder.CreateSphere('dkopf', { diameterX: 0.7 * skala, diameterY: 0.62 * skala, diameterZ: 1.15 * skala, segments: 10 }, scene);
  kopf.parent = root; kopf.position.set(0, 3.0 * skala, 2.2 * skala); kopf.material = haut;
  const glut = mat(scene, 'dglut', '#ff8030', { emissive: '#ff5000', glow: 1.2 });
  for (const s of [-1, 1]) {
    const auge = BJS.MeshBuilder.CreateSphere(`dauge${s}`, { diameter: 0.15 * skala, segments: 7 }, scene);
    auge.parent = root; auge.position.set(s * 0.22 * skala, 3.1 * skala, 2.5 * skala); auge.material = glut;
    const horn = BJS.MeshBuilder.CreateCylinder(`dhorn${s}`, { height: 0.75 * skala, diameterTop: 0.01, diameterBottom: 0.16 * skala, tessellation: 6 }, scene);
    horn.parent = root; horn.position.set(s * 0.26 * skala, 3.4 * skala, 1.9 * skala);
    horn.rotation.set(-0.7, 0, s * -0.35); horn.material = mat(scene, 'dhornM', '#6a5040');
    // Flügel
    const fluegel = BJS.MeshBuilder.CreatePlane(`dfl${s}`, { width: 3.2 * skala, height: 2.1 * skala }, scene);
    fluegel.parent = root; fluegel.position.set(s * 1.5 * skala, 2.3 * skala, -0.2 * skala);
    fluegel.rotation.set(0.35, s * 1.3, s * 0.4);
    const flM = mat(scene, 'dflM', shadeHex(spec.tint || '#c03818', -0.35), { alpha: 0.94 });
    flM.backFaceCulling = false;
    fluegel.material = flM;
    // Beine
    for (const z of [1, -1]) {
      const bein = BJS.MeshBuilder.CreateCylinder(`dbein${s}${z}`, { height: 1.3 * skala, diameterTop: 0.3 * skala, diameterBottom: 0.42 * skala, tessellation: 7 }, scene);
      bein.parent = root; bein.position.set(s * 0.65 * skala, 0.65 * skala, z * 0.95 * skala); bein.material = haut;
    }
  }
  const schweif = BJS.MeshBuilder.CreateCylinder('dschweif', { height: 3.4 * skala, diameterTop: 0.06 * skala, diameterBottom: 0.65 * skala, tessellation: 8 }, scene);
  schweif.parent = root; schweif.position.set(0, 1.3 * skala, -2.4 * skala); schweif.rotation.x = 1.25; schweif.material = haut;
  root.hoehe = 3.6 * skala;
  root.teile = { kopf, rumpf: leib };
  return root;
}

/* ───────────── Hilfen ───────────── */

export function shadeHex(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255; let g = (n >> 8) & 255; let b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + 255 * amount)));
  g = Math.max(0, Math.min(255, Math.round(g + 255 * amount)));
  b = Math.max(0, Math.min(255, Math.round(b + 255 * amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Welche Gestalt gehört zu welchem Gegner? */
export function figureKindFor(creatureId) {
  if (/nasser_kleiner/.test(creatureId)) return 'klein';
  if (/wolf/.test(creatureId)) return 'wolf';
  if (/spinnenbrut/.test(creatureId)) return 'spinne';
  if (/ghortan_p3/.test(creatureId)) return 'spinne';
  if (/klauth|drache/.test(creatureId)) return 'drache';
  if (/steinerner_zeuge/.test(creatureId)) return 'wächter';
  if (/federwaechter/.test(creatureId)) return 'schwarm';
  if (/drakeling|brutmutter/.test(creatureId)) return 'wolf';
  return 'humanoid';
}

/** Portrait als 2D-Zeichnung für HUD und Dialog (kein 3D nötig). */
export function drawPortrait(canvas, spec) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width; const H = canvas.height;
  const pal = spec.palette || { skin: '#c9a882', hair: '#2e2620', cloth: '#4a5a6a', accent: '#c8a14a' };
  const shape = RACE_SHAPE[spec.raceId] || RACE_SHAPE.mensch;
  const gear = CLASS_GEAR[spec.classId] || CLASS_GEAR.kaempfer;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#242230');
  g.addColorStop(1, '#0e0d12');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Schulterlinie
  ctx.fillStyle = gear.ruestung === 'platte' || gear.ruestung === 'kette' ? pal.accent : pal.cloth;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 1.04, W * 0.46 * shape.breit, H * 0.34, 0, Math.PI, 0);
  ctx.fill();

  // Hals
  ctx.fillStyle = pal.skin;
  ctx.fillRect(W / 2 - W * 0.09, H * 0.6, W * 0.18, H * 0.2);

  // Kopf
  const kr = W * 0.21 * shape.kopf;
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.46, kr, kr * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Haar oder Kapuze
  ctx.fillStyle = gear.kapuze ? shadeHex(pal.cloth, -0.35) : pal.hair;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.4, kr * (gear.kapuze ? 1.3 : 1.06), kr * (gear.kapuze ? 1.24 : 0.92), 0, Math.PI, 0);
  ctx.fill();
  if (gear.kapuze) {
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.47, kr * 0.86, kr * 0.98, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Augen
  if (!gear.kapuze) {
    ctx.fillStyle = '#14131a';
    ctx.beginPath(); ctx.ellipse(W / 2 - kr * 0.38, H * 0.46, W * 0.028, H * 0.018, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W / 2 + kr * 0.38, H * 0.46, W * 0.028, H * 0.018, 0, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(W / 2 - kr * 0.34, H * 0.47, W * 0.022, H * 0.012, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W / 2 + kr * 0.34, H * 0.47, W * 0.022, H * 0.012, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Merkmale
  if (shape.bart) {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.62, kr * 0.78, kr * 0.62, 0, 0, Math.PI);
    ctx.fill();
  }
  if (shape.hoerner) {
    ctx.strokeStyle = '#3a2830'; ctx.lineWidth = W * 0.035; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W / 2 - kr * 0.7, H * 0.33); ctx.quadraticCurveTo(W / 2 - kr * 1.1, H * 0.18, W / 2 - kr * 0.72, H * 0.12);
    ctx.moveTo(W / 2 + kr * 0.7, H * 0.33); ctx.quadraticCurveTo(W / 2 + kr * 1.1, H * 0.18, W / 2 + kr * 0.72, H * 0.12);
    ctx.stroke();
  }
  if (shape.ohren) {
    ctx.fillStyle = pal.skin;
    ctx.beginPath(); ctx.moveTo(W / 2 - kr * 0.94, H * 0.44); ctx.lineTo(W / 2 - kr * 1.5, H * 0.3); ctx.lineTo(W / 2 - kr * 0.9, H * 0.52); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W / 2 + kr * 0.94, H * 0.44); ctx.lineTo(W / 2 + kr * 1.5, H * 0.3); ctx.lineTo(W / 2 + kr * 0.9, H * 0.52); ctx.fill();
  }
  if (shape.hauer) {
    ctx.fillStyle = '#e0dcc8';
    ctx.beginPath(); ctx.moveTo(W / 2 - kr * 0.3, H * 0.58); ctx.lineTo(W / 2 - kr * 0.38, H * 0.48); ctx.lineTo(W / 2 - kr * 0.16, H * 0.57); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W / 2 + kr * 0.3, H * 0.58); ctx.lineTo(W / 2 + kr * 0.38, H * 0.48); ctx.lineTo(W / 2 + kr * 0.16, H * 0.57); ctx.fill();
  }

  // Rahmen
  ctx.strokeStyle = 'rgba(200,161,74,.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
}
