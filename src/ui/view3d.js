// Die dreidimensionale Ansicht (Babylon.js).
// Schräge Kamera wie in einem taktischen Rollenspiel, prozedurale Schauplätze,
// Bewegungsraster, Flächenvorschau und alles, was blinkt, wenn jemand getroffen wird.

import { theme } from './theme.js';
import { buildFigure, figureKindFor, shadeHex } from './figures.js';
import { PROP_BUILDERS, netzfaden } from './props.js';

const B = () => window.BABYLON;
export const TILE = 1.0;

export class View3D {
  constructor(canvas) {
    const BJS = B();
    this.canvas = canvas;
    this.engine = new BJS.Engine(canvas, true, {
      preserveDrawingBuffer: true, stencil: true, antialias: true,
      powerPreference: 'high-performance',
    }, true);
    this.engine.setHardwareScalingLevel(Math.min(1, 1 / (window.devicePixelRatio || 1)) * (window.devicePixelRatio > 1.5 ? 1.35 : 1));
    this.scene = new BJS.Scene(this.engine);
    this.scene.clearColor = BJS.Color4.FromHexString('#0a0c10ff');
    this.scene.ambientColor = new BJS.Color3(0.3, 0.3, 0.35);
    this.actors = new Map();
    this.areaNodes = [];
    this.highlightMeshes = { bewegung: null, flaeche: null, ziel: null };
    this.animierte = [];
    this.tick = 0;
    this.area = null;
    this.onTileClick = null;
    this.onActorClick = null;
    this.onHover = null;

    this.setupCamera();
    this.setupLights();
    this.setupPost();
    this.setupPicking();

    this.scene.registerBeforeRender(() => this.update());
    this.engine.runRenderLoop(() => {
      if (this.scene.activeCamera) this.scene.render();
    });
    this._resize = () => this.engine.resize();
    window.addEventListener('resize', this._resize);
  }

  setupCamera() {
    const BJS = B();
    const cam = new BJS.ArcRotateCamera('kamera', -Math.PI / 2 - 0.55, 0.74, 26, new BJS.Vector3(10, 0, 8), this.scene);
    cam.lowerBetaLimit = 0.28;
    cam.upperBetaLimit = 1.32;
    cam.lowerRadiusLimit = 7;
    cam.upperRadiusLimit = 52;
    cam.wheelPrecision = 12;
    cam.panningSensibility = 42;
    cam.angularSensibilityX = 950;
    cam.angularSensibilityY = 950;
    cam.inertia = 0.78;
    cam.panningInertia = 0.7;
    cam.attachControl(this.canvas, true);
    // Linke Maustaste bleibt für Befehle frei — Drehen nur mit rechts/mittig.
    cam.inputs.attached.pointers.buttons = [1, 2];
    this.camera = cam;
  }

  setupLights() {
    const BJS = B();
    this.hemi = new BJS.HemisphericLight('hemi', new BJS.Vector3(0, 1, 0), this.scene);
    this.hemi.intensity = 0.6;
    this.sun = new BJS.DirectionalLight('sonne', new BJS.Vector3(-0.4, -1, -0.5), this.scene);
    this.sun.position = new BJS.Vector3(30, 44, 30);
    this.sun.intensity = 1.0;
    this.shadow = new BJS.ShadowGenerator(1024, this.sun);
    this.shadow.useBlurExponentialShadowMap = true;
    this.shadow.blurKernel = 24;
    this.shadow.darkness = 0.42;
  }

  setupPost() {
    const BJS = B();
    try {
      const pipe = new BJS.DefaultRenderingPipeline('pipe', true, this.scene, [this.camera]);
      pipe.fxaaEnabled = true;
      pipe.bloomEnabled = true;
      pipe.bloomThreshold = 0.72;
      pipe.bloomWeight = 0.38;
      pipe.bloomKernel = 48;
      pipe.imageProcessing.vignetteEnabled = true;
      pipe.imageProcessing.vignetteWeight = 2.6;
      pipe.imageProcessing.vignetteColor = new BJS.Color4(0, 0, 0.02, 0);
      pipe.imageProcessing.contrast = 1.14;
      pipe.imageProcessing.exposure = 1.05;
      pipe.imageProcessing.toneMappingEnabled = true;
      this.pipeline = pipe;
    } catch (e) {
      console.warn('Nachbearbeitung nicht verfügbar:', e.message);
    }
  }

  setupPicking() {
    const BJS = B();
    this.scene.onPointerObservable.add((info) => {
      if (info.type === BJS.PointerEventTypes.POINTERTAP) {
        if (info.event.button !== 0) return;
        const pick = info.pickInfo;
        if (!pick?.hit) return;
        const actor = this.findActorByMesh(pick.pickedMesh);
        if (actor && this.onActorClick) { this.onActorClick(actor.uid); return; }
        if (this.onTileClick && pick.pickedPoint) {
          const t = this.worldToTile(pick.pickedPoint);
          if (t) this.onTileClick(t.x, t.y);
        }
      } else if (info.type === BJS.PointerEventTypes.POINTERMOVE) {
        if (!this.onHover) return;
        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (!pick?.hit) { this.onHover(null); return; }
        const actor = this.findActorByMesh(pick.pickedMesh);
        if (actor) this.onHover({ typ: 'figur', uid: actor.uid });
        else if (pick.pickedPoint) {
          const t = this.worldToTile(pick.pickedPoint);
          this.onHover(t ? { typ: 'feld', ...t } : null);
        }
      }
    });
  }

  findActorByMesh(mesh) {
    if (!mesh) return null;
    let node = mesh;
    for (let i = 0; i < 8 && node; i++) {
      for (const a of this.actors.values()) if (a.root === node) return a;
      node = node.parent;
    }
    return null;
  }

  worldToTile(p) {
    const x = Math.floor(p.x / TILE);
    const y = Math.floor(p.z / TILE);
    if (!this.area) return null;
    if (x < 0 || y < 0 || x >= this.area.w || y >= this.area.h) return null;
    return { x, y };
  }

  tileToWorld(x, y, h = 0) {
    const BJS = B();
    return new BJS.Vector3((x + 0.5) * TILE, h, (y + 0.5) * TILE);
  }

  /* ─────────────────────── Schauplatz bauen ─────────────────────── */

  clearArea() {
    for (const n of this.areaNodes) n.dispose(false, true);
    this.areaNodes = [];
    for (const a of this.actors.values()) a.root.dispose(false, true);
    this.actors.clear();
    this.animierte = [];
    for (const k of Object.keys(this.highlightMeshes)) {
      this.highlightMeshes[k]?.dispose();
      this.highlightMeshes[k] = null;
    }
  }

  /**
   * @param {object} area {id,name,theme,w,h,tiles,props:[{type,x,y,rot,opts}]}
   */
  buildArea(area) {
    const BJS = B();
    this.clearArea();
    this.area = area;
    const th = theme(area.theme);
    this.currentTheme = th;

    // Licht und Nebel
    this.scene.fogMode = BJS.Scene.FOGMODE_EXP2;
    this.scene.fogColor = BJS.Color3.FromHexString(th.nebel);
    this.scene.fogDensity = th.nebelDichte;
    this.scene.clearColor = BJS.Color4.FromHexString(`${th.himmel}ff`);
    this.hemi.diffuse = BJS.Color3.FromHexString(th.ambient);
    this.hemi.groundColor = BJS.Color3.FromHexString(th.nebel);
    this.hemi.intensity = th.ambientStaerke;
    this.sun.diffuse = BJS.Color3.FromHexString(th.sonne);
    this.sun.intensity = th.sonneStaerke;
    this.sun.direction = new BJS.Vector3(...th.richtung).normalize();
    this.sun.position = new BJS.Vector3(area.w / 2 - th.richtung[0] * 40, 46, area.h / 2 - th.richtung[2] * 40);

    // Innenräume bekommen zusätzlich ein weiches Deckenlicht, sonst versinken sie.
    this.deckenlicht?.dispose();
    if (th.innen) {
      this.deckenlicht = new BJS.PointLight('decke', new BJS.Vector3(area.w / 2, 5.5, area.h / 2), this.scene);
      this.deckenlicht.diffuse = BJS.Color3.FromHexString(th.sonne);
      this.deckenlicht.intensity = 0.75;
      this.deckenlicht.range = Math.max(area.w, area.h) * 1.6;
    } else {
      this.deckenlicht = null;
    }

    this.buildGround(area, th);
    this.buildWalls(area, th);
    this.buildProps(area, th);

    const start = area.spawns?.party?.[0] || { x: Math.floor(area.w / 2), y: Math.floor(area.h / 2) };
    // Bildausschnitt: überwiegend Kartenmitte, leicht zur Gruppe hin verschoben.
    const mitte = {
      x: (start.x + area.w) / 3,
      y: (start.y + area.h) / 3,
    };
    this.camera.setTarget(this.tileToWorld(mitte.x, mitte.y));
    // Die Karten sind fast alle breiter als tief, und die Kamera blickt der
    // Tiefe entlang — die Breite bestimmt daher, wie weit sie zurück muss.
    this.camera.radius = area.kameraRadius
      ?? Math.min(34, Math.max(16, Math.max(area.w * 0.8, area.h * 1.15)));
    this.camera.beta = 0.74;

    // Statische Kulisse einfrieren — spart jede Menge Rechenzeit.
    for (const n of this.areaNodes) {
      const meshes = n.getChildMeshes ? [n, ...n.getChildMeshes()] : [n];
      for (const m of meshes) {
        if (m.freezeWorldMatrix) m.freezeWorldMatrix();
        if (m.material?.freeze) m.material.freeze();
      }
    }
    this.pruefeLeistung();
    return this;
  }

  /** Nach zwei Sekunden messen und bei schwacher Hardware Effekte abschalten. */
  pruefeLeistung() {
    if (this.leistungGeprueft) return;
    setTimeout(() => {
      const fps = this.engine.getFps();
      if (!Number.isFinite(fps)) return;
      this.leistungGeprueft = true;
      if (fps < 22) {
        this.sparmodus = true;
        if (this.pipeline) {
          this.pipeline.bloomEnabled = false;
          this.pipeline.fxaaEnabled = false;
        }
        if (this.shadow) {
          this.shadow.dispose();
          this.shadow = { addShadowCaster() {}, dispose() {} };
        }
        this.engine.setHardwareScalingLevel(1.6);
        console.info(`Sparmodus aktiv (${Math.round(fps)} Bilder/s): Nachbearbeitung und Schatten aus.`);
      }
    }, 2400);
  }

  buildGround(area, th) {
    const BJS = B();
    const px = 24; // Pixel pro Feld
    const tex = new BJS.DynamicTexture('boden', { width: area.w * px, height: area.h * px }, this.scene, true);
    const ctx = tex.getContext();
    const rnd = mulberry(area.seed || 1);

    for (let y = 0; y < area.h; y++) {
      for (let x = 0; x < area.w; x++) {
        const t = area.tiles[y * area.w + x];
        let farbe;
        if (t === 3) farbe = th.wasser;
        else if (t === 2) farbe = th.akzent;
        else if (t === 1) farbe = shadeHex(th.boden[0], -0.18);
        else if (t === 6) farbe = shadeHex(th.boden[0], -0.26);
        else farbe = th.boden[Math.floor(rnd() * th.boden.length)];
        ctx.fillStyle = shadeHex(farbe, (rnd() - 0.5) * 0.07);
        ctx.fillRect(x * px, y * px, px, px);
        // Fugen
        if (area.pflaster) {
          ctx.strokeStyle = 'rgba(0,0,0,.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * px + .5, y * px + .5, px - 1, px - 1);
        }
        // Sprenkel
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`;
          ctx.fillRect(x * px + rnd() * px, y * px + rnd() * px, 2 + rnd() * 3, 2 + rnd() * 3);
        }
      }
    }
    tex.update(false);

    // Umland: verhindert, dass man über den Kartenrand ins Leere sieht.
    const umland = BJS.MeshBuilder.CreateGround('umland', {
      width: area.w * TILE * 4 + 60, height: area.h * TILE * 4 + 60,
    }, this.scene);
    umland.position.set(area.w * TILE / 2, th.innen ? -0.8 : -0.12, area.h * TILE / 2);
    const um = new BJS.StandardMaterial('umlandM', this.scene);
    um.diffuseColor = BJS.Color3.FromHexString(th.innen ? shadeHex(th.nebel, -0.05) : shadeHex(th.nebel, 0.03));
    um.specularColor = new BJS.Color3(0, 0, 0);
    umland.material = um;
    umland.isPickable = false;
    this.areaNodes.push(umland);

    const ground = BJS.MeshBuilder.CreateGround('boden', {
      width: area.w * TILE, height: area.h * TILE, subdivisions: 1,
    }, this.scene);
    ground.position.set(area.w * TILE / 2, 0, area.h * TILE / 2);
    const gm = new BJS.StandardMaterial('bodenM', this.scene);
    gm.diffuseTexture = tex;
    gm.emissiveTexture = tex;
    gm.emissiveColor = new BJS.Color3(0.14, 0.14, 0.16);
    gm.specularColor = new BJS.Color3(0.02, 0.02, 0.03);
    ground.material = gm;
    ground.receiveShadows = true;
    this.areaNodes.push(ground);
    this.ground = ground;

    // Wasserflächen als eigene, leicht tiefere, schimmernde Ebenen
    const wasserFelder = [];
    for (let y = 0; y < area.h; y++) {
      for (let x = 0; x < area.w; x++) if (area.tiles[y * area.w + x] === 3) wasserFelder.push({ x, y });
    }
    if (wasserFelder.length) {
      const w = BJS.MeshBuilder.CreateGround('wasserG', { width: area.w * TILE, height: area.h * TILE }, this.scene);
      w.position.set(area.w * TILE / 2, 0.06, area.h * TILE / 2);
      const wtex = new BJS.DynamicTexture('wasserTex', { width: area.w * 8, height: area.h * 8 }, this.scene, false);
      const wc = wtex.getContext();
      wc.clearRect(0, 0, area.w * 8, area.h * 8);
      for (const f of wasserFelder) { wc.fillStyle = '#ffffff'; wc.fillRect(f.x * 8, f.y * 8, 8, 8); }
      wtex.update(false);
      wtex.hasAlpha = true;
      const wm = new BJS.StandardMaterial('wasserM', this.scene);
      wm.diffuseColor = BJS.Color3.FromHexString(th.wasser);
      wm.emissiveColor = BJS.Color3.FromHexString(th.wasser).scale(0.3);
      wm.specularColor = new BJS.Color3(0.7, 0.75, 0.8);
      wm.specularPower = 64;
      wm.opacityTexture = wtex;
      wm.alpha = 0.78;
      w.material = wm;
      w.isPickable = false;
      this.areaNodes.push(w);
      this.animierte.push({ typ: 'wasser', mesh: w, basis: 0.06 });
    }
  }

  buildWalls(area, th) {
    const BJS = B();
    const wallTiles = [];
    for (let y = 0; y < area.h; y++) {
      for (let x = 0; x < area.w; x++) if (area.tiles[y * area.w + x] === 1) wallTiles.push({ x, y });
    }
    if (!wallTiles.length) return;
    const proto = BJS.MeshBuilder.CreateBox('wandProto', { width: TILE, height: area.wandHoehe ?? 2.6, depth: TILE }, this.scene);
    const wm = new BJS.StandardMaterial('wandM', this.scene);
    wm.diffuseColor = BJS.Color3.FromHexString(shadeHex(th.akzent, 0.04));
    wm.emissiveColor = BJS.Color3.FromHexString(th.ambient).scale(0.12);
    wm.specularColor = new BJS.Color3(0.02, 0.02, 0.02);
    proto.material = wm;
    // Achtung: Thin-Instance-Matrizen sind lokal zum Basisnetz. Das Netz muss
    // also im Ursprung bleiben, sonst stehen sämtliche Mauern woanders.
    proto.position.setAll(0);
    proto.receiveShadows = true;
    const matrices = [];
    for (const t of wallTiles) {
      const mtx = BJS.Matrix.Translation((t.x + 0.5) * TILE, (area.wandHoehe ?? 2.6) / 2, (t.y + 0.5) * TILE);
      matrices.push(mtx);
    }
    const buffer = new Float32Array(matrices.length * 16);
    matrices.forEach((mtx, i) => mtx.copyToArray(buffer, i * 16));
    proto.thinInstanceSetBuffer('matrix', buffer, 16);
    this.shadow.addShadowCaster(proto);
    this.areaNodes.push(proto);
  }

  buildProps(area, th) {
    const BJS = B();
    for (const p of area.props || []) {
      const builder = PROP_BUILDERS[p.type];
      if (!builder) continue;
      const node = builder(this.scene, { ...(p.opts || {}) });
      const pos = this.tileToWorld(p.x, p.y, p.h || 0);
      if (node.position) node.position.copyFrom(pos);
      if (p.rot !== undefined) node.rotation ? (node.rotation.y = p.rot) : null;
      if (p.scale) node.scaling = new BJS.Vector3(p.scale, p.scale, p.scale);
      this.areaNodes.push(node);
      // Schatten für alles, was groß genug ist
      const kinder = node.getChildMeshes ? node.getChildMeshes() : [node];
      for (const k of kinder) {
        if (k.getBoundingInfo && k.getBoundingInfo().boundingBox.extendSize.y > 0.3) this.shadow.addShadowCaster(k);
        k.isPickable = false;
      }
      if (node.flamme) this.animierte.push({ typ: 'flamme', mesh: node.flamme, licht: node.licht });
      if (node.rad) this.animierte.push({ typ: 'rad', mesh: node.rad });
      if (node.wasser) this.animierte.push({ typ: 'brunnen', mesh: node.wasser });
      if (p.type === 'wimpelkette') this.animierte.push({ typ: 'wimpel', node });
      if (p.type === 'kerze') {
        const f = node.getChildMeshes().find((c) => c.name === 'kflamme');
        if (f) this.animierte.push({ typ: 'flamme', mesh: f });
      }
      if (p.type === 'stabImStein' && node.stab) this.animierte.push({ typ: 'stab', mesh: node.stab });
    }
    // Netzfäden über dem Platz
    if (th.netz) {
      for (let i = 0; i < 24; i++) {
        const a = new BJS.Vector3(Math.random() * area.w, 3 + Math.random() * 3, Math.random() * area.h);
        const b = new BJS.Vector3(Math.random() * area.w, 3 + Math.random() * 3, Math.random() * area.h);
        this.areaNodes.push(netzfaden(this.scene, a, b));
      }
    }
    if (th.federn) this.buildFeathers(area);
  }

  buildFeathers(area) {
    const BJS = B();
    const proto = BJS.MeshBuilder.CreatePlane('federProto', { width: 0.18, height: 0.34 }, this.scene);
    const fm = new BJS.StandardMaterial('federProtoM', this.scene);
    fm.diffuseColor = BJS.Color3.FromHexString('#1a1a22');
    fm.backFaceCulling = false;
    proto.material = fm;
    const n = 400;
    const buf = new Float32Array(n * 16);
    for (let i = 0; i < n; i++) {
      const mtx = BJS.Matrix.RotationYawPitchRoll(Math.random() * 6, Math.random() * 6, Math.random() * 6)
        .multiply(BJS.Matrix.Translation(Math.random() * area.w, 0.04 + Math.random() * 0.08, Math.random() * area.h));
      mtx.copyToArray(buf, i * 16);
    }
    proto.thinInstanceSetBuffer('matrix', buf, 16);
    proto.isPickable = false;
    this.areaNodes.push(proto);
  }

  /* ─────────────────────── Figuren ─────────────────────── */

  addActor(spec) {
    const BJS = B();
    const kind = spec.kind || (spec.creatureId ? figureKindFor(spec.creatureId) : 'humanoid');
    const root = buildFigure(this.scene, { ...spec, kind });
    root.position.copyFrom(this.tileToWorld(spec.x, spec.y));
    root.rotation.y = spec.facing ?? Math.PI;
    for (const mesh of root.getChildMeshes()) {
      this.shadow.addShadowCaster(mesh);
      mesh.isPickable = true;
    }

    // Auswahlring
    const ring = BJS.MeshBuilder.CreateTorus(`ring_${spec.uid}`, { diameter: spec.large ? 1.9 : 1.05, thickness: 0.045, tessellation: 28 }, this.scene);
    ring.parent = root;
    ring.position.y = 0.035;
    const rm = new BJS.StandardMaterial(`ringM_${spec.uid}`, this.scene);
    const farbe = spec.side === 'held' ? '#6aa8c0' : spec.side === 'verbuendet' ? '#6fa85c' : '#a83c32';
    rm.diffuseColor = BJS.Color3.FromHexString(farbe);
    rm.emissiveColor = BJS.Color3.FromHexString(farbe).scale(0.55);
    rm.alpha = 0.75;
    ring.material = rm;
    ring.isPickable = false;

    const actor = {
      uid: spec.uid, root, ring, ringMat: rm, spec,
      x: spec.x, y: spec.y, tot: false, hoehe: root.hoehe || 1.6,
      basisY: 0, phase: Math.random() * 6,
    };
    this.actors.set(spec.uid, actor);
    return actor;
  }

  removeActor(uid) {
    const a = this.actors.get(uid);
    if (!a) return;
    a.root.dispose(false, true);
    this.actors.delete(uid);
  }

  setActorTile(uid, x, y) {
    const a = this.actors.get(uid);
    if (!a) return;
    a.x = x; a.y = y;
    a.root.position.copyFrom(this.tileToWorld(x, y));
  }

  /** Figur entlang eines Pfades laufen lassen. */
  walk(uid, path, done) {
    const a = this.actors.get(uid);
    if (!a || !path || path.length < 2) { done?.(); return; }
    a.gehen = { pfad: path.slice(1), i: 0, t: 0, done };
    a.x = path[path.length - 1].x;
    a.y = path[path.length - 1].y;
  }

  faceTowards(uid, tx, ty) {
    const a = this.actors.get(uid);
    if (!a) return;
    const dx = (tx + 0.5) * TILE - a.root.position.x;
    const dz = (ty + 0.5) * TILE - a.root.position.z;
    if (Math.hypot(dx, dz) < 0.01) return;
    a.zielDrehung = Math.atan2(dx, dz);
  }

  playAttack(uid, targetUid) {
    const a = this.actors.get(uid);
    const t = this.actors.get(targetUid);
    if (!a) return;
    if (t) this.faceTowards(uid, t.x, t.y);
    a.angriff = { t: 0 };
  }

  playCast(uid) {
    const a = this.actors.get(uid);
    if (!a) return;
    a.zaubern = { t: 0 };
  }

  playHit(uid, crit = false) {
    const a = this.actors.get(uid);
    if (!a) return;
    a.treffer = { t: 0, crit };
    for (const mesh of a.root.getChildMeshes()) {
      if (!mesh.material || mesh.material._blitzGesichert) continue;
      mesh.material._urEmissive = mesh.material.emissiveColor?.clone();
    }
  }

  playDeath(uid) {
    const a = this.actors.get(uid);
    if (!a) return;
    a.tot = true;
    a.sterben = { t: 0 };
    a.ring.setEnabled(false);
  }

  setSelected(uid) {
    for (const [id, a] of this.actors) {
      const aktiv = id === uid;
      a.ausgewaehlt = aktiv;
      a.ringMat.alpha = aktiv ? 1 : 0.55;
      a.ringMat.emissiveColor = B().Color3.FromHexString(
        aktiv ? '#e6c878' : (a.spec.side === 'held' ? '#6aa8c0' : a.spec.side === 'verbuendet' ? '#6fa85c' : '#a83c32'),
      ).scale(aktiv ? 0.9 : 0.5);
    }
  }

  /* ─────────────────────── Hervorhebungen ─────────────────────── */

  highlight(name, tiles, hex, hoehe = 0.03) {
    const BJS = B();
    this.highlightMeshes[name]?.dispose();
    this.highlightMeshes[name] = null;
    if (!tiles || !tiles.length) return;
    const proto = BJS.MeshBuilder.CreateGround(`hl_${name}`, { width: TILE * 0.92, height: TILE * 0.92 }, this.scene);
    const hm = new BJS.StandardMaterial(`hlM_${name}`, this.scene);
    hm.diffuseColor = BJS.Color3.FromHexString(hex);
    hm.emissiveColor = BJS.Color3.FromHexString(hex).scale(0.65);
    hm.alpha = 0.32;
    hm.disableLighting = true;
    proto.material = hm;
    proto.isPickable = false;
    const buf = new Float32Array(tiles.length * 16);
    tiles.forEach((t, i) => {
      BJS.Matrix.Translation((t.x + 0.5) * TILE, hoehe, (t.y + 0.5) * TILE).copyToArray(buf, i * 16);
    });
    proto.thinInstanceSetBuffer('matrix', buf, 16);
    this.highlightMeshes[name] = proto;
  }

  clearHighlight(name) {
    this.highlightMeshes[name]?.dispose();
    this.highlightMeshes[name] = null;
  }

  clearAllHighlights() {
    for (const k of Object.keys(this.highlightMeshes)) this.clearHighlight(k);
  }

  /** Kurzer Lichtblitz an einer Stelle — für Zauber und Explosionen. */
  burst(x, y, hex = '#ff8030', groesse = 1.4) {
    const BJS = B();
    const s = BJS.MeshBuilder.CreateSphere('burst', { diameter: 0.4, segments: 10 }, this.scene);
    s.position.copyFrom(this.tileToWorld(x, y, 0.8));
    const sm = new BJS.StandardMaterial('burstM', this.scene);
    sm.emissiveColor = BJS.Color3.FromHexString(hex);
    sm.diffuseColor = BJS.Color3.FromHexString(hex);
    sm.alpha = 0.85;
    sm.disableLighting = true;
    s.material = sm;
    s.isPickable = false;
    const licht = new BJS.PointLight('burstL', s.position.clone(), this.scene);
    licht.diffuse = BJS.Color3.FromHexString(hex);
    licht.intensity = 2.2; licht.range = 12;
    let t = 0;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      t += this.engine.getDeltaTime() / 1000;
      const k = Math.min(1, t / 0.45);
      s.scaling.setAll(0.4 + k * groesse * 5);
      sm.alpha = 0.85 * (1 - k);
      licht.intensity = 2.2 * (1 - k);
      if (k >= 1) {
        this.scene.onBeforeRenderObservable.remove(obs);
        s.dispose(); licht.dispose();
      }
    });
  }

  /** Projektil von A nach B. */
  projectile(fromUid, toUid, hex = '#c8a14a', done) {
    const BJS = B();
    const a = this.actors.get(fromUid); const b = this.actors.get(toUid);
    if (!a || !b) { done?.(); return; }
    const s = BJS.MeshBuilder.CreateSphere('geschoss', { diameter: 0.22, segments: 8 }, this.scene);
    const sm = new BJS.StandardMaterial('geschossM', this.scene);
    sm.emissiveColor = BJS.Color3.FromHexString(hex);
    sm.disableLighting = true;
    s.material = sm;
    s.isPickable = false;
    const von = a.root.position.add(new BJS.Vector3(0, a.hoehe * 0.6, 0));
    const nach = b.root.position.add(new BJS.Vector3(0, b.hoehe * 0.55, 0));
    let t = 0;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      t += this.engine.getDeltaTime() / 1000 / 0.34;
      const k = Math.min(1, t);
      s.position = BJS.Vector3.Lerp(von, nach, k);
      s.position.y += Math.sin(k * Math.PI) * 0.8;
      if (k >= 1) {
        this.scene.onBeforeRenderObservable.remove(obs);
        s.dispose();
        done?.();
      }
    });
  }

  /* ─────────────────────── Bildschirmkoordinaten ─────────────────────── */

  project(worldPos) {
    const BJS = B();
    const p = BJS.Vector3.Project(
      worldPos,
      BJS.Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight()),
    );
    // Die Projektion rechnet in Renderpunkten, die Oberfläche darüber in
    // CSS-Pixeln. Beides ist nur bei Skalierung 1 dasselbe — im Sparmodus
    // ist der Puffer kleiner, auf feinen Bildschirmen größer. Ohne diese
    // Umrechnung wandern sämtliche Namensschilder von ihren Figuren weg.
    const skala = this.engine.getHardwareScalingLevel();
    return { x: p.x * skala, y: p.y * skala, hinten: p.z > 1 };
  }

  actorScreenPos(uid, hoehenOffset = 1.0) {
    const a = this.actors.get(uid);
    if (!a) return null;
    const BJS = B();
    return this.project(a.root.position.add(new BJS.Vector3(0, a.hoehe * hoehenOffset, 0)));
  }

  tileScreenPos(x, y, h = 1) {
    return this.project(this.tileToWorld(x, y, h));
  }

  focusOn(x, y, sofort = false) {
    const ziel = this.tileToWorld(x, y);
    if (sofort) { this.camera.setTarget(ziel); return; }
    this.kameraZiel = ziel;
  }

  /* ─────────────────────── Laufende Animation ─────────────────────── */

  update() {
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
    this.tick += dt;
    const BJS = B();

    // Kamera sanft nachführen
    if (this.kameraZiel) {
      const cur = this.camera.target;
      const neu = BJS.Vector3.Lerp(cur, this.kameraZiel, Math.min(1, dt * 3.4));
      this.camera.setTarget(neu);
      if (BJS.Vector3.Distance(neu, this.kameraZiel) < 0.06) this.kameraZiel = null;
    }

    for (const a of this.actors.values()) {
      // Gehen
      if (a.gehen) {
        const g = a.gehen;
        const ziel = g.pfad[g.i];
        if (!ziel) { a.gehen = null; g.done?.(); }
        else {
          const zielPos = this.tileToWorld(ziel.x, ziel.y);
          const d = zielPos.subtract(a.root.position);
          d.y = 0;
          const dist = d.length();
          if (dist < 0.08) {
            a.root.position.x = zielPos.x; a.root.position.z = zielPos.z;
            g.i++;
            if (g.i >= g.pfad.length) { a.gehen = null; g.done?.(); }
          } else {
            const v = d.normalize().scale(Math.min(dist, dt * 4.6));
            a.root.position.addInPlace(v);
            a.zielDrehung = Math.atan2(d.x, d.z);
            // Schrittwippen
            a.root.position.y = Math.abs(Math.sin(this.tick * 11)) * 0.05;
            const bl = a.root.teile?.beinL; const br = a.root.teile?.beinR;
            if (bl && br) {
              bl.rotation.x = Math.sin(this.tick * 11) * 0.5;
              br.rotation.x = -Math.sin(this.tick * 11) * 0.5;
            }
          }
        }
      } else if (!a.tot) {
        // Atmen
        a.root.position.y = Math.sin(this.tick * 1.5 + a.phase) * 0.015;
        const bl = a.root.teile?.beinL; const br = a.root.teile?.beinR;
        if (bl && br) { bl.rotation.x *= 0.85; br.rotation.x *= 0.85; }
        if (a.root.teile?.rumpf) {
          a.root.teile.rumpf.scaling.y = 1 + Math.sin(this.tick * 1.5 + a.phase) * 0.012;
        }
      }

      // Drehen
      if (a.zielDrehung !== undefined) {
        let diff = a.zielDrehung - a.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.root.rotation.y += diff * Math.min(1, dt * 9);
        if (Math.abs(diff) < 0.02) a.zielDrehung = undefined;
      }

      // Angriff
      if (a.angriff) {
        a.angriff.t += dt;
        const k = a.angriff.t / 0.42;
        const arm = a.root.teile?.armR;
        if (arm) arm.rotation.x = -Math.sin(Math.min(1, k) * Math.PI) * 2.1;
        const vor = Math.sin(Math.min(1, k) * Math.PI) * 0.28;
        a.root.position.x += Math.sin(a.root.rotation.y) * vor * dt * 8;
        a.root.position.z += Math.cos(a.root.rotation.y) * vor * dt * 8;
        if (k >= 1) { a.angriff = null; if (arm) arm.rotation.x = 0; }
      }

      // Zaubern
      if (a.zaubern) {
        a.zaubern.t += dt;
        const k = a.zaubern.t / 0.6;
        const arm = a.root.teile?.armR;
        if (arm) arm.rotation.x = -Math.sin(Math.min(1, k) * Math.PI) * 2.6;
        if (a.root.teile?.hand && k < 1) {
          // Lichtpunkt in der Hand
          if (!a.zauberLicht) {
            a.zauberLicht = new BJS.PointLight('zl', new BJS.Vector3(0, 0, 0), this.scene);
            a.zauberLicht.parent = a.root.teile.hand;
            a.zauberLicht.diffuse = BJS.Color3.FromHexString('#8ac8e0');
            a.zauberLicht.range = 6;
          }
          a.zauberLicht.intensity = Math.sin(k * Math.PI) * 1.6;
        }
        if (k >= 1) {
          a.zaubern = null;
          if (arm) arm.rotation.x = 0;
          a.zauberLicht?.dispose(); a.zauberLicht = null;
        }
      }

      // Treffer
      if (a.treffer) {
        a.treffer.t += dt;
        const k = a.treffer.t / 0.3;
        const staerke = Math.max(0, 1 - k);
        for (const mesh of a.root.getChildMeshes()) {
          if (!mesh.material?.emissiveColor) continue;
          const basis = mesh.material._urEmissive || new BJS.Color3(0, 0, 0);
          mesh.material.emissiveColor = basis.add(new BJS.Color3(staerke * 0.9, staerke * 0.12, staerke * 0.08));
        }
        a.root.position.x += (Math.random() - 0.5) * staerke * 0.09;
        if (k >= 1) {
          a.treffer = null;
          for (const mesh of a.root.getChildMeshes()) {
            if (mesh.material?._urEmissive) mesh.material.emissiveColor = mesh.material._urEmissive.clone();
            else if (mesh.material?.emissiveColor) mesh.material.emissiveColor = new BJS.Color3(0, 0, 0);
          }
        }
      }

      // Sterben
      if (a.sterben) {
        a.sterben.t += dt;
        const k = Math.min(1, a.sterben.t / 0.8);
        a.root.rotation.x = k * Math.PI * 0.46;
        a.root.position.y = -k * 0.25;
        for (const mesh of a.root.getChildMeshes()) {
          if (mesh.material) { mesh.material.alpha = 1 - k * 0.55; mesh.material.needAlphaBlending = () => k > 0; }
        }
        if (k >= 1) a.sterben = null;
      }

      // Auswahlring pulsieren
      if (a.ausgewaehlt) {
        a.ring.scaling.setAll(1 + Math.sin(this.tick * 3) * 0.05);
        a.ring.rotation.y += dt * 0.6;
      }

      // Schwarm flattert
      if (a.root.schwarm && a.root.teile?.federn) {
        a.root.teile.federn.forEach((f, i) => {
          f.rotation.y += dt * (1 + (i % 3));
          f.position.y += Math.sin(this.tick * 3 + i) * dt * 0.3;
        });
      }
    }

    // Kulissen
    for (const an of this.animierte) {
      if (an.typ === 'flamme') {
        const s = 0.85 + Math.sin(this.tick * 9 + (an.mesh.uniqueId % 7)) * 0.13 + Math.random() * 0.06;
        an.mesh.scaling.set(s, 1 + Math.sin(this.tick * 13) * 0.16, s);
        if (an.licht) an.licht.intensity = 0.85 + Math.sin(this.tick * 7.5) * 0.22 + Math.random() * 0.08;
      } else if (an.typ === 'rad') {
        an.mesh.rotation.x += dt * 0.55;
      } else if (an.typ === 'wasser') {
        an.mesh.position.y = an.basis + Math.sin(this.tick * 1.1) * 0.016;
      } else if (an.typ === 'brunnen') {
        an.mesh.material.alpha = 0.86 + Math.sin(this.tick * 1.6) * 0.07;
      } else if (an.typ === 'stab') {
        an.mesh.material.emissiveColor = B().Color3.FromHexString('#a8c8d8').scale(0.4 + Math.sin(this.tick * 2.2) * 0.22);
      } else if (an.typ === 'wimpel') {
        for (const w of an.node.getChildMeshes()) {
          if (w.name.startsWith('wp')) w.rotation.z = Math.sin(this.tick * 2 + w.position.x) * 0.16;
        }
      }
    }
  }

  dispose() {
    window.removeEventListener('resize', this._resize);
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
