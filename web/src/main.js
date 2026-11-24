/**
 * LICHTJES 4D — 3D-werkplaats met bouwplan.
 * Scène, camera, nabewerking (bloom + omlijning), model, controller, simulatie en interface.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import FIRMWARE from "../../firmware/lichtjes4d/lichtjes4d.ino";
import { buildWorkshop, makeMaterials, BENCH_TOP } from "./workshop.js";
import { buildModel, buildController, partGeometry } from "./model.js";
import { Lichtjes4D, drawOled, SOUNDS, CHAIN } from "./sim.js";
import { Input } from "./input.js";
import { Buzzer } from "./audio.js";
import { buildUI } from "./ui.js";
import { STEPS, STAGES } from "./content.js";
import { SPEC, CENTER_Y } from "../../cad/design.mjs";

const container = document.getElementById("scene");
const loading = document.getElementById("loading");

/* ------------------------------------------------------------------ renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById("labels") });
labelRenderer.setSize(container.clientWidth, container.clientHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1c);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.01, 40);
camera.position.set(1.35, 1.65, 2.1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1.05, 0);
controls.minDistance = 0.12;
controls.maxDistance = 4.5;
controls.maxPolarAngle = Math.PI * 0.92;

/* ------------------------------------------------------------------ inhoud */
const mats = makeMaterials();
const workshop = buildWorkshop(scene, mats, FIRMWARE);
const model = buildModel(mats);
const MODEL_POS = new THREE.Vector3(-0.06, BENCH_TOP + 0.003 + 0.002, -0.03);
model.root.position.copy(MODEL_POS);
scene.add(model.root);
const ctrl = buildController(mats);
ctrl.root.position.set(0.16, BENCH_TOP + 0.002, 0.2);
ctrl.root.rotation.y = -0.16;
scene.add(ctrl.root);
const ENTRIES = [...model.registry, ...ctrl.registry];

// cel in de printer + extra geprinte onderdelen op de bank
const cellPrintMat = new THREE.MeshPhysicalMaterial({ color: 0xf6f1e7, roughness: 0.45, transmission: 0.5, thickness: 6 });
workshop.printer.setPart(partGeometry("cell-outer"), cellPrintMat, SPEC.outerCell.size);
const tray = new THREE.Group();
tray.position.set(0.24, BENCH_TOP, -0.25);
tray.rotation.y = 0.3;
const trayMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a6fb5, roughness: 0.6 }));
trayMesh.position.y = 0.006;
trayMesh.receiveShadow = true;
tray.add(trayMesh);
[["cell-outer", -0.04, -0.02], ["cell-inner", 0.0, -0.025], ["cell-inner", 0.035, 0.0], ["plug-outer", -0.035, 0.03], ["plug-inner", 0.0, 0.03]].forEach(([id, x, z], k) => {
  const m = new THREE.Mesh(partGeometry(id), cellPrintMat);
  m.scale.setScalar(0.001);
  const bb = partGeometry(id).boundingBox;
  m.position.set(x, 0.012 - bb.min.y * 0.001, z);
  m.rotation.y = k;
  m.castShadow = true;
  tray.add(m);
});
scene.add(tray);
const jig = new THREE.Mesh(partGeometry("saw-jig"), new THREE.MeshStandardMaterial({ color: 0xe0582b, roughness: 0.55 }));
jig.scale.setScalar(0.001);
jig.position.set(-0.5, BENCH_TOP, 0.25);
jig.rotation.y = 0.15;
jig.castShadow = true;
jig.receiveShadow = true;
scene.add(jig);

/* ------------------------------------------------------------------ kabels (wereldcoördinaten) */
function cable(points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.4);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, radius, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  m.castShadow = true;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
scene.updateMatrixWorld(true);
const zf = SPEC.base.size / 2;
const plugEnd = model.root.localToWorld(new THREE.Vector3(SPEC.gx16.x, SPEC.gx16.y, zf + 3 + 18 + 16));
const ctrlOut = ctrl.root.localToWorld(new THREE.Vector3(0, 11, -48));
const ctrlCable = cable(
  [ctrlOut, ctrlOut.clone().add(new THREE.Vector3(0, -0.006, -0.02)), new THREE.Vector3(ctrlOut.x - 0.01, BENCH_TOP + 0.005, ctrlOut.z - 0.06), new THREE.Vector3(plugEnd.x + 0.04, BENCH_TOP + 0.005, plugEnd.z + 0.06), plugEnd.clone().add(new THREE.Vector3(0, -0.008, 0.03)), plugEnd],
  0.0026,
  0x1a1a1a,
);
const usbStart = model.root.localToWorld(new THREE.Vector3(SPEC.usb.x, SPEC.usb.y, -zf - 22));
workshop.laptop.updateMatrixWorld(true);
const usbEnd = workshop.laptop.localToWorld(new THREE.Vector3(0.165, 0.008, 0.02));
const usbCable = cable(
  [usbStart, usbStart.clone().add(new THREE.Vector3(0, -0.01, -0.03)), new THREE.Vector3(usbStart.x - 0.05, BENCH_TOP + 0.003, usbStart.z - 0.08), new THREE.Vector3(-0.42, BENCH_TOP + 0.003, -0.08), usbEnd.clone().add(new THREE.Vector3(0.05, -0.006, 0)), usbEnd],
  0.0022,
  0x2b2b2e,
);
const CABLES = { controller: ctrlCable, usb: usbCable };

/* ------------------------------------------------------------------ nabewerking */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const outline = new OutlinePass(new THREE.Vector2(container.clientWidth, container.clientHeight), scene, camera);
outline.edgeStrength = 4;
outline.edgeGlow = 0.6;
outline.edgeThickness = 1.6;
outline.pulsePeriod = 2.2;
outline.visibleEdgeColor.set(0x4cc9f0);
outline.hiddenEdgeColor.set(0x1d5f74);
composer.addPass(outline);
const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.32, 0.5, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ simulatie, invoer, geluid */
const game = new Lichtjes4D({ now: performance.now() });
const input = new Input(game);
const buzzer = new Buzzer();
game.on((type) => SOUNDS[type] && buzzer.play(SOUNDS[type]));
window.addEventListener("pointerdown", () => buzzer.unlock(), { once: false });
window.addEventListener("keydown", () => buzzer.unlock());

/* ------------------------------------------------------------------ camera-standpunten */
const W = (x, y, z) => new THREE.Vector3(x, y, z);
const mp = MODEL_POS;
const cp = ctrl.root.position;
const pp = workshop.printer.group.position;
const lp = workshop.laptop.position;
const VIEWS = {
  werkplaats: { pos: W(1.45, 1.62, 2.05), target: W(-0.05, 1.05, -0.05) },
  model: { pos: mp.clone().add(W(0.42, 0.3, 0.62)), target: mp.clone().add(W(0, 0.15, 0)) },
  play: { pos: mp.clone().add(W(0.1, 0.36, 0.78)), target: mp.clone().add(W(0.06, 0.14, 0.08)) },
  inner: { pos: mp.clone().add(W(0.3, 0.3, 0.45)), target: mp.clone().add(W(0, 0.17, 0)) },
  explode: { pos: mp.clone().add(W(0.62, 0.52, 0.95)), target: mp.clone().add(W(0, 0.3, 0)) },
  under: { pos: mp.clone().add(W(0.34, 0.07, 0.46)), target: mp.clone().add(W(0, 0.13, 0)) },
  base: { pos: mp.clone().add(W(0.2, 0.17, 0.3)), target: mp.clone().add(W(0, 0.03, 0)) },
  controller: { pos: cp.clone().add(W(0.04, 0.2, 0.2)), target: cp.clone().add(W(0, 0.01, 0)) },
  printer: { pos: pp.clone().add(W(-0.18, 0.28, 0.55)), target: pp.clone().add(W(0, 0.18, 0)) },
  laptop: { pos: lp.clone().add(W(0.3, 0.22, 0.38)), target: lp.clone().add(W(0, 0.1, -0.05)) },
};
let camTween = null;
function setView(name, instant = false) {
  const v = VIEWS[name];
  if (!v) return;
  if (instant) {
    camera.position.copy(v.pos);
    controls.target.copy(v.target);
    return;
  }
  camTween = { t0: performance.now(), dur: 1100, fromP: camera.position.clone(), fromT: controls.target.clone(), toP: v.pos.clone(), toT: v.target.clone() };
}

let ui = null;

/* ------------------------------------------------------------------ weergavetoestand */
const state = {
  mode: "all", // 'all' = compleet model, 'build' = tot en met een bouwfase
  stage: null,
  focus: [],
  xray: false,
  labels: false,
  dims: false,
  explode: 0,
  explodeTarget: 0,
  chainTest: false,
  flyStart: 0,
  flyStage: null,
  selected: null,
};
const stageIdx = (s) => (s ? STAGES.indexOf(s) : -1);

const fadeMats = new Map();
function setFade(material, on) {
  const list = Array.isArray(material) ? material : [material];
  for (const m of list) {
    if (!fadeMats.has(m)) fadeMats.set(m, { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite, transmission: m.transmission });
    const o = fadeMats.get(m);
    m.transparent = on ? true : o.transparent;
    m.opacity = on ? 0.14 : o.opacity;
    m.depthWrite = on ? false : o.depthWrite;
    if (m.transmission !== undefined) m.transmission = on ? 0 : o.transmission;
    m.needsUpdate = true;
  }
}

function applyState() {
  const cur = stageIdx(state.stage);
  for (const e of ENTRIES) {
    let vis = true;
    if (state.mode === "build") {
      vis = stageIdx(e.stage) <= cur && (!e.stageMax || cur <= stageIdx(e.stageMax));
    } else if (e.stageMax) vis = false;
    e.visibleBase = vis;
  }
  const seen = new Set();
  for (const e of ENTRIES)
    if (e.fade)
      e.obj.traverse((o) => {
        if (o.isMesh && !seen.has(o.material)) {
          seen.add(o.material);
          setFade(o.material, state.xray);
        }
      });
  model.labels.forEach((l, i) => (l.visible = state.labels && model.cells[i].cell.userData.entry.visibleBase !== false));
  model.dims.visible = state.dims;
  CABLES.controller.visible = state.mode === "all" || stageIdx(state.stage) >= stageIdx("controller");
  CABLES.usb.visible = state.mode === "all" || stageIdx(state.stage) >= stageIdx("base-close");
  updateOutline();
}

function updateOutline() {
  const objs = [];
  for (const e of ENTRIES) if (e.visibleBase && state.focus.some((g) => e.groups.has(g) || (g === "stage" && e.stage === state.stage))) objs.push(e.obj);
  if (state.selected) objs.push(state.selected.obj);
  outline.selectedObjects = objs;
}

function setStep(index) {
  const s = STEPS[index];
  const v = s.view || {};
  state.mode = v.mode || "all";
  state.stage = v.stage || null;
  state.focus = v.focus || (v.stage ? ["stage"] : []);
  state.xray = !!v.xray;
  state.labels = !!v.xray && (v.stage === "inner-chain" || v.stage === "outer-chain" || v.chainTest);
  state.chainTest = !!v.chainTest;
  state.explodeTarget = v.explode || 0;
  state.flyStage = v.stage || null;
  state.flyStart = performance.now();
  input.enabled = state.mode === "all";
  if (v.cam) setView(v.cam);
  applyState();
  ui?.syncToggles();
}

function resetToPlay() {
  state.mode = "all";
  state.xray = false;
  state.labels = false;
  state.stage = null;
  state.focus = [];
  state.chainTest = false;
  state.explodeTarget = 0;
  input.enabled = true;
  applyState();
  ui?.syncToggles();
}

/* ------------------------------------------------------------------ selecteren door te klikken */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([model.root, ctrl.root], true).filter((h) => h.object.visible && h.object.userData.entry && isShown(h.object));
  const hit = state.xray ? hits.find((h) => !h.object.userData.entry.fade) || hits[0] : hits[0];
  state.selected = hit ? hit.object.userData.entry : null;
  updateOutline();
  ui.showSelection(state.selected, hit?.object);
});
function isShown(o) {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

/* ------------------------------------------------------------------ interface */
ui = buildUI({
  game,
  input,
  buzzer,
  model,
  state,
  actions: {
    setView,
    setStep,
    resetToPlay,
    toggle(name) {
      state[name] = !state[name];
      applyState();
      ui?.syncToggles();
    },
    setExplode(v) {
      state.explodeTarget = v;
    },
    focus(groups) {
      state.focus = groups;
      updateOutline();
    },
    clearSelection() {
      state.selected = null;
      updateOutline();
    },
    camButton(axis, value, down) {
      camButtons[axis] = down ? value : camButtons[axis] === value ? 0 : camButtons[axis];
    },
    applyState,
  },
});

/* ------------------------------------------------------------------ camera schuiven en zoomen */
// Knoppen op het scherm en toetsen: I/K = omhoog/omlaag, J/L = links/rechts, U/O = in-/uitzoomen.
// Met de muis: linksslepen = draaien, rechtsslepen (of shift+slepen) = schuiven, scrollen = zoomen.
const camButtons = { x: 0, y: 0, zoom: 0 };
const CAM_KEYS = {
  KeyJ: ["x", -1],
  KeyL: ["x", 1],
  KeyI: ["y", 1],
  KeyK: ["y", -1],
  PageUp: ["y", 1],
  PageDown: ["y", -1],
  KeyU: ["zoom", -1],
  KeyO: ["zoom", 1],
  NumpadAdd: ["zoom", -1],
  NumpadSubtract: ["zoom", 1],
};
const camKeysDown = new Set();
window.addEventListener("keydown", (e) => {
  if (/input|textarea|select/i.test(e.target?.tagName || "") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (CAM_KEYS[e.code]) {
    camKeysDown.add(e.code);
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => camKeysDown.delete(e.code));
window.addEventListener("blur", () => camKeysDown.clear());
const camRight = new THREE.Vector3();
const camOff = new THREE.Vector3();
function moveCamera(dt) {
  const v = { ...camButtons };
  for (const code of camKeysDown) {
    const [axis, val] = CAM_KEYS[code];
    v[axis] = val;
  }
  if (!v.x && !v.y && !v.zoom) return;
  camTween = null;
  const dist = camera.position.distanceTo(controls.target);
  const speed = Math.max(0.12, dist) * 0.8 * dt;
  camRight.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
  camOff.copy(camRight).multiplyScalar(v.x * speed);
  camOff.y += v.y * speed;
  camera.position.add(camOff);
  controls.target.add(camOff);
  if (controls.target.y < 0.05) {
    const d = 0.05 - controls.target.y;
    controls.target.y += d;
    camera.position.y += d;
  }
  if (v.zoom) {
    const dir = camera.position.clone().sub(controls.target);
    const len = THREE.MathUtils.clamp(dir.length() * Math.exp(v.zoom * dt * 1.3), controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(dir.setLength(len));
  }
}
let lastFrame = performance.now();

/* ------------------------------------------------------------------ animatie */
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let lastOled = 0;
const oledCtx = model.oledCanvas.getContext("2d");
const chainLevels = new Array(16).fill(0);

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const t = now / 1000;

  // invoer & simulatie
  input.update(now);
  game.tick(now);
  ctrl.setSticks(input.axes, input.buttons);

  // LED's
  let levels;
  if (state.mode === "build") {
    if (state.chainTest) {
      const tt = (now - state.flyStart) % 3200;
      for (let k = 0; k < 16; k++) chainLevels[CHAIN[k]] = tt > k * 70 ? (tt < k * 70 + 140 ? 255 : tt < 2600 ? 96 : 0) : 0;
      levels = chainLevels;
    } else levels = new Array(16).fill(0);
  } else levels = game.levels(now);
  model.setLeds(levels, game.cursor);

  // OLED (± 12 beelden/s)
  if (now - lastOled > 80) {
    lastOled = now;
    if (state.mode === "build" && stageIdx(state.stage) < stageIdx("base")) {
      oledCtx.fillStyle = "#000";
      oledCtx.fillRect(0, 0, 128, 64);
    } else drawOled(oledCtx, game, now);
    model.oledTex.needsUpdate = true;
    ui.tick(now);
  }

  // explode & invliegen
  state.explode += (state.explodeTarget - state.explode) * 0.12;
  if (Math.abs(state.explodeTarget - state.explode) < 0.001) state.explode = state.explodeTarget;
  const flyT = Math.min(1, (now - state.flyStart) / 1300);
  const flyK = 1 - ease(flyT);
  for (const e of ENTRIES) {
    e.obj.position.copy(e.home).addScaledVector(e.explode, state.explode);
    if (state.mode === "build" && e.stage === state.flyStage && flyK > 0) {
      const fly = e.fly || new THREE.Vector3(0, 60, 0);
      e.obj.position.addScaledVector(fly, flyK);
    }
    e.obj.visible = e.visibleBase !== false && !(e.hideOnExplode && state.explode > 0.02);
  }

  // printer
  workshop.printer.update(t);

  // camera
  moveCamera(Math.min(0.05, (now - lastFrame) / 1000));
  lastFrame = now;
  if (camTween) {
    const k = Math.min(1, (now - camTween.t0) / camTween.dur);
    const e = ease(k);
    camera.position.lerpVectors(camTween.fromP, camTween.toP, e);
    controls.target.lerpVectors(camTween.fromT, camTween.toT, e);
    if (k >= 1) camTween = null;
  }
  controls.update();
  composer.render();
  labelRenderer.render(scene, camera);
}

function applyViewOffset() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const panel = document.querySelector(".panel");
  const wide = w > 900 && panel && !panel.classList.contains("collapsed");
  const shift = wide ? (panel.offsetWidth + 16) / 2 : 0;
  if (shift) camera.setViewOffset(w, h, shift, 0, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  applyViewOffset();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  labelRenderer.setSize(w, h);
}
window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(container);

applyState();
applyViewOffset();
document.querySelector(".panel-toggle")?.addEventListener("click", () => setTimeout(applyViewOffset, 320));
setView("werkplaats", true);
setTimeout(() => setView("play"), 700);
loading.classList.add("done");
setTimeout(() => loading.remove(), 900);
frame();

// voor debuggen in de console
window.LICHTJES = { THREE, scene, camera, controls, game, model, ctrl, workshop, state, setView, setStep, renderer, CENTER_Y };
