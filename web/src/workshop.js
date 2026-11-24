/** De werkplaats: ruimte, werkbank, gereedschap, 3D-printer, soldeerstation, laptop, lampen. Eenheden: meter. */
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import * as T from "./textures.js";

export const BENCH_TOP = 0.9;

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r1, r2, h, s = 32) => new THREE.CylinderGeometry(r1, r2, h, s);

function M(geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  return m;
}

export function makeMaterials() {
  const wood = T.woodTextures();
  wood.map.repeat.set(2, 1);
  wood.bump.repeat.set(2, 1);
  return {
    benchTop: new THREE.MeshStandardMaterial({ map: wood.map, bumpMap: wood.bump, bumpScale: 0.6, roughness: 0.58, metalness: 0 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.45, metalness: 0.65 }),
    steelLight: new THREE.MeshStandardMaterial({ color: 0x9aa1a9, roughness: 0.3, metalness: 0.9 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.12, metalness: 1 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.3, metalness: 1 }),
    blackPlastic: new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.6, metalness: 0 }),
    petgBlack: new THREE.MeshPhysicalMaterial({ color: 0x1c1e23, roughness: 0.42, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }),
    plywood: new THREE.MeshStandardMaterial({ color: 0xc9a777, roughness: 0.8 }),
    cabinet: new THREE.MeshStandardMaterial({ color: 0x3d4a5a, roughness: 0.5, metalness: 0.35 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.3, metalness: 1 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc07040, roughness: 0.35, metalness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 0.6 }),
  };
}

export function buildWorkshop(scene, mats, code) {
  RectAreaLightUniformsLib.init();
  const g = new THREE.Group();
  g.name = "werkplaats";
  scene.add(g);

  /* ---------------- ruimte */
  const floorMat = new THREE.MeshStandardMaterial({ map: T.concreteTexture(), roughness: 0.88, metalness: 0 });
  g.add(M(new THREE.PlaneGeometry(10, 10), floorMat, 0, 0, 1.5, { rx: -Math.PI / 2, cast: false }));
  const wallMat = new THREE.MeshStandardMaterial({ map: T.plasterTexture(), roughness: 0.92 });
  const backWall = M(new THREE.PlaneGeometry(10, 3.2), wallMat, 0, 1.6, -0.64, { cast: false });
  g.add(backWall);
  g.add(M(new THREE.PlaneGeometry(10, 3.2), wallMat, 0, 1.6, 4.2, { ry: Math.PI, cast: false }));
  g.add(M(new THREE.PlaneGeometry(5, 3.2), wallMat, 2.9, 1.6, 1.8, { ry: -Math.PI / 2, cast: false }));
  // linkermuur met raamopening (x = -2.4), raam z −0.1..1.1, y 1.0..2.2
  const lw = (w, h, z, y) => g.add(M(new THREE.PlaneGeometry(w, h), wallMat, -2.4, y, z, { ry: Math.PI / 2 }));
  lw(0.54, 3.2, -0.37, 1.6);
  lw(3.1, 3.2, 2.65, 1.6);
  lw(1.2, 1.0, 0.5, 0.5);
  lw(1.2, 1.0, 0.5, 2.7);
  const ceil = M(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0xcfcac0, roughness: 1 }), 0, 3.2, 1.5, { rx: Math.PI / 2, cast: false });
  g.add(ceil);
  // plint
  g.add(M(box(10, 0.08, 0.015), mats.white, 0, 0.04, -0.63));
  // raamkozijn + glas + lucht
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.5 });
  for (const [w, h, d, x, y, z] of [
    [0.12, 0.06, 1.32, -2.4, 0.97, 0.5],
    [0.12, 0.06, 1.32, -2.4, 2.23, 0.5],
    [0.12, 1.32, 0.06, -2.4, 1.6, -0.13],
    [0.12, 1.32, 0.06, -2.4, 1.6, 1.13],
    [0.08, 1.2, 0.04, -2.4, 1.6, 0.5],
    [0.25, 0.03, 1.36, -2.33, 0.95, 0.5],
  ])
    g.add(M(box(w, h, d), frameMat, x, y, z));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.12 }));
  glass.position.set(-2.42, 1.6, 0.5);
  glass.rotation.y = Math.PI / 2;
  g.add(glass);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ map: T.skyTexture(), toneMapped: false }));
  sky.position.set(-4.5, 1.8, 0.5);
  sky.rotation.y = Math.PI / 2;
  g.add(sky);
  // plantje op de vensterbank
  const pot = M(cyl(0.05, 0.04, 0.09), new THREE.MeshStandardMaterial({ color: 0xb5643c, roughness: 0.8 }), -2.3, 1.01, 0.95);
  g.add(pot);
  for (let i = 0; i < 7; i++) {
    const leaf = M(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3f7f3a, roughness: 0.7 }), -2.3 + Math.cos(i) * 0.03, 1.1 + (i % 3) * 0.03, 0.95 + Math.sin(i * 2) * 0.03);
    leaf.scale.set(1, 0.6, 1.6);
    leaf.rotation.y = i;
    g.add(leaf);
  }

  /* ---------------- licht */
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(-6, 3.6, 1.8);
  sun.target.position.set(0, 0.9, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -1.6;
  sun.shadow.camera.right = 1.6;
  sun.shadow.camera.top = 1.4;
  sun.shadow.camera.bottom = -1.2;
  sun.shadow.camera.near = 3;
  sun.shadow.camera.far = 10;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  g.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xdde6f0, 0x5a5048, 0.35);
  g.add(hemi);

  // TL-armatuur boven de bank
  const tube = new THREE.RectAreaLight(0xf4f8ff, 5, 1.3, 0.14);
  tube.position.set(0, 2.85, 0.05);
  tube.lookAt(0, 0, 0.05);
  g.add(tube);
  g.add(M(box(1.36, 0.05, 0.2), mats.white, 0, 2.9, 0.05, { cast: false }));
  g.add(M(box(1.3, 0.025, 0.12), new THREE.MeshBasicMaterial({ color: 0xf6f9ff }), 0, 2.865, 0.05, { cast: false }));
  for (const x of [-0.5, 0.5]) g.add(M(cyl(0.003, 0.003, 0.28, 6), mats.steel, x, 3.05, 0.05, { cast: false }));

  /* ---------------- werkbank: blad x −1..1, z −0.4..0.4, bovenkant 0.9 */
  g.add(M(box(2.0, 0.05, 0.8), mats.benchTop, 0, BENCH_TOP - 0.025, 0));
  for (const x of [-0.95, 0.95]) for (const z of [-0.35, 0.35]) g.add(M(box(0.06, BENCH_TOP - 0.05, 0.06), mats.steel, x, (BENCH_TOP - 0.05) / 2, z));
  for (const z of [-0.35, 0.35]) g.add(M(box(1.84, 0.06, 0.04), mats.steel, 0, 0.8, z));
  for (const x of [-0.95, 0.95]) g.add(M(box(0.04, 0.06, 0.64), mats.steel, x, 0.8, 0));
  for (const x of [-0.95, 0.95]) g.add(M(box(0.04, 0.04, 0.64), mats.steel, x, 0.16, 0));
  g.add(M(box(1.86, 0.025, 0.7), mats.plywood, 0, 0.19, 0));
  // ladenblok
  g.add(M(box(0.48, 0.56, 0.62), mats.cabinet, 0.62, 0.52, 0.02));
  for (let i = 0; i < 3; i++) {
    const y = 0.7 - i * 0.18;
    g.add(M(box(0.44, 0.16, 0.012), new THREE.MeshStandardMaterial({ color: 0x4b5a6c, roughness: 0.45, metalness: 0.4 }), 0.62, y, 0.335));
    g.add(M(box(0.16, 0.014, 0.02), mats.alu, 0.62, y + 0.04, 0.35));
    g.add(M(box(0.06, 0.025, 0.004), mats.white, 0.52, y - 0.03, 0.342));
  }
  // bakjes op de onderplank
  const binColors = [0x2f6fb5, 0xd9472b, 0xf2b636, 0x2f6fb5, 0x3c9a52];
  binColors.forEach((c, i) => {
    const bin = M(box(0.2, 0.11, 0.3), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }), -0.85 + i * 0.24, 0.258, 0.05);
    g.add(bin);
  });

  /* ---------------- gaatjesbord + gereedschap */
  const peg = M(box(1.6, 0.8, 0.012), new THREE.MeshStandardMaterial({ map: T.pegboardTexture(), roughness: 0.85 }), -0.15, 1.45, -0.625);
  g.add(peg);
  g.add(M(box(1.64, 0.03, 0.03), mats.plywood, -0.15, 1.865, -0.62));
  const wood = new THREE.MeshStandardMaterial({ color: 0x9c6b3c, roughness: 0.6 });
  // hamer
  g.add(M(cyl(0.012, 0.014, 0.3, 16), wood, -0.82, 1.48, -0.6));
  g.add(M(box(0.11, 0.028, 0.03), mats.steel, -0.82, 1.64, -0.6));
  // schroevendraaiers
  [0xd9472b, 0xf2b636, 0x2f6fb5, 0x111111, 0x3c9a52].forEach((c, i) => {
    const x = -0.66 + i * 0.045;
    g.add(M(cyl(0.012, 0.014, 0.095, 16), new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 }), x, 1.62, -0.6));
    g.add(M(cyl(0.0028, 0.0028, 0.12, 8), mats.chrome, x, 1.51, -0.6));
  });
  // tangen
  const red = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.45 });
  for (const [x, a] of [
    [-0.36, 0.12],
    [-0.27, -0.1],
  ]) {
    g.add(M(box(0.016, 0.13, 0.012), red, x - 0.012, 1.47, -0.6, { rz: a }));
    g.add(M(box(0.016, 0.13, 0.012), red, x + 0.012, 1.47, -0.6, { rz: -a }));
    g.add(M(box(0.022, 0.06, 0.012), mats.steel, x, 1.565, -0.6));
  }
  // steeksleutels
  for (let i = 0; i < 6; i++) {
    const L = 0.12 + i * 0.02;
    g.add(M(box(0.012 + i * 0.001, L, 0.004), mats.chrome, -0.12 + i * 0.035, 1.66 - L / 2, -0.612));
    g.add(M(new THREE.TorusGeometry(0.012 + i * 0.001, 0.004, 8, 16), mats.chrome, -0.12 + i * 0.035, 1.66 - L, -0.612));
  }
  // ijzerzaag
  const sawFrame = new THREE.CatmullRomCurve3([new THREE.Vector3(0.12, 1.3, -0.605), new THREE.Vector3(0.12, 1.38, -0.605), new THREE.Vector3(0.44, 1.38, -0.605), new THREE.Vector3(0.44, 1.3, -0.605)], false, "catmullrom", 0.05);
  g.add(M(new THREE.TubeGeometry(sawFrame, 30, 0.005, 8), mats.steelLight, 0, 0, 0));
  g.add(M(box(0.32, 0.012, 0.002), mats.chrome, 0.28, 1.305, -0.605));
  g.add(M(box(0.03, 0.09, 0.025), new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.5 }), 0.46, 1.27, -0.6, { rz: 0.4 }));
  // rolmaat
  g.add(M(box(0.07, 0.07, 0.035), new THREE.MeshStandardMaterial({ color: 0xf5c400, roughness: 0.4 }), 0.55, 1.6, -0.6));
  // haspel soldeertin
  g.add(M(cyl(0.03, 0.03, 0.025, 24), mats.steelLight, 0.55, 1.3, -0.6, { rx: Math.PI / 2 }));
  // plankje met potjes
  g.add(M(box(0.3, 0.012, 0.09), mats.plywood, 0.45, 1.18, -0.575));
  [0x6d4c41, 0xffffff, 0x90a4ae].forEach((c, i) => g.add(M(cyl(0.022, 0.022, 0.06, 20), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, transparent: c === 0xffffff, opacity: 0.6 }), 0.36 + i * 0.07, 1.216, -0.575)));

  /* ---------------- plank met filamentspoelen */
  g.add(M(box(1.7, 0.025, 0.26), mats.plywood, -0.15, 2.02, -0.51));
  for (const x of [-0.85, 0.55]) g.add(M(box(0.02, 0.18, 0.2), mats.steel, x, 1.93, -0.53));
  const spoolColors = [0x1c1e23, 0xf3ede2, 0xe0582b, 0x2a7de1, 0x3fa34d, 0xf2c200];
  spoolColors.forEach((c, i) => {
    const s = spool(c, mats);
    s.position.set(-0.85 + i * 0.235, 2.135, -0.5);
    g.add(s);
  });

  /* ---------------- bureaulamp (spot op het model) */
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.4, metalness: 0.5 });
  const lampBase = new THREE.Vector3(-0.3, BENCH_TOP, -0.36);
  g.add(M(cyl(0.05, 0.06, 0.025, 32), lampMat, lampBase.x, BENCH_TOP + 0.0125, lampBase.z));
  const elbow = new THREE.Vector3(-0.31, 1.32, -0.3);
  const head = new THREE.Vector3(-0.2, 1.36, -0.17);
  for (const [a, b] of [
    [lampBase.clone().setY(BENCH_TOP + 0.02), elbow],
    [elbow, head],
  ]) {
    const d = b.clone().sub(a);
    const arm = M(cyl(0.007, 0.007, d.length(), 12), lampMat, 0, 0, 0);
    arm.position.copy(a.clone().add(b).multiplyScalar(0.5));
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.add(arm);
  }
  g.add(M(new THREE.SphereGeometry(0.014, 16, 12), lampMat, elbow.x, elbow.y, elbow.z));
  const shade = M(new THREE.ConeGeometry(0.075, 0.11, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }), head.x, head.y, head.z);
  const lampTarget = new THREE.Vector3(-0.05, 1.02, -0.02);
  shade.lookAt(lampTarget);
  shade.rotateX(-Math.PI / 2);
  g.add(shade);
  const bulb = M(new THREE.SphereGeometry(0.025, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff2d6 }), 0, 0, 0, { cast: false });
  bulb.position.copy(head.clone().add(lampTarget.clone().sub(head).normalize().multiplyScalar(0.03)));
  g.add(bulb);
  const spot = new THREE.SpotLight(0xffe2b8, 0.7, 2.5, 0.62, 0.65, 2);
  spot.position.copy(head.clone().add(lampTarget.clone().sub(head).normalize().multiplyScalar(0.04)));
  spot.target.position.copy(lampTarget);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0002;
  spot.shadow.normalBias = 0.01;
  spot.shadow.camera.near = 0.05;
  spot.shadow.camera.far = 2;
  g.add(spot, spot.target);

  /* ---------------- snijmat */
  const mat = M(box(0.6, 0.002, 0.45), new THREE.MeshStandardMaterial({ map: T.cuttingMatTexture(), roughness: 0.75 }), -0.04, BENCH_TOP + 0.001, 0.02, { cast: false });
  g.add(mat);

  /* ---------------- soldeerstation */
  const station = new THREE.Group();
  station.position.set(-0.64, BENCH_TOP, -0.27);
  station.rotation.y = 0.35;
  station.add(M(box(0.13, 0.09, 0.15), new THREE.MeshStandardMaterial({ color: 0x2d3e50, roughness: 0.45, metalness: 0.3 }), 0, 0.045, 0));
  station.add(M(box(0.07, 0.03, 0.002), new THREE.MeshBasicMaterial({ color: 0x220000 }), 0, 0.062, 0.076));
  station.add(M(box(0.066, 0.026, 0.001), new THREE.MeshBasicMaterial({ map: T.labelTexture("330°", { bg: "#2a0000", fg: "#ff3b2f", font: "bold 64px monospace" }), toneMapped: false }), 0, 0.062, 0.078));
  station.add(M(cyl(0.017, 0.017, 0.02, 24), mats.blackPlastic, 0.0, 0.025, 0.08, { rx: Math.PI / 2 }));
  // houder met spiraal en sponsje
  const holder = new THREE.Group();
  holder.position.set(0.15, 0, 0.02);
  holder.add(M(cyl(0.05, 0.055, 0.02, 32), mats.steel, 0, 0.01, 0));
  holder.add(M(box(0.06, 0.008, 0.04), new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.9 }), 0, 0.024, 0.02));
  const helix = [];
  for (let i = 0; i <= 120; i++) {
    const a = i * 0.45;
    const t = i / 120;
    helix.push(new THREE.Vector3(Math.cos(a) * 0.014, 0.03 + t * 0.09, Math.sin(a) * 0.014 - t * 0.05));
  }
  holder.add(M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 400, 0.0018, 6), mats.chrome, 0, 0, 0));
  // bout zelf
  const iron = new THREE.Group();
  iron.add(M(cyl(0.011, 0.013, 0.11, 20), new THREE.MeshStandardMaterial({ color: 0x1f6f5c, roughness: 0.5 }), 0, 0, 0));
  iron.add(M(cyl(0.004, 0.004, 0.07, 12), mats.chrome, 0, -0.09, 0));
  iron.add(M(new THREE.ConeGeometry(0.004, 0.02, 12), mats.copper, 0, -0.135, 0, { rx: Math.PI }));
  iron.position.set(0, 0.11, -0.03);
  iron.rotation.x = -0.5;
  holder.add(iron);
  station.add(holder);
  const ironCable = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.06, 0.05, 0.07), new THREE.Vector3(0.0, 0.005, 0.12), new THREE.Vector3(0.12, 0.005, 0.1), new THREE.Vector3(0.15, 0.16, 0.0)]);
  station.add(M(new THREE.TubeGeometry(ironCable, 40, 0.003, 8), mats.blackPlastic, 0, 0, 0));
  // tinhaspel
  station.add(M(cyl(0.025, 0.025, 0.02, 24), mats.steelLight, -0.1, 0.01, 0.07));
  g.add(station);

  /* ---------------- laptop met de firmware */
  const laptop = new THREE.Group();
  laptop.position.set(-0.74, BENCH_TOP, 0.06);
  laptop.rotation.y = 0.45;
  const lapMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.7 });
  laptop.add(M(box(0.33, 0.016, 0.23), lapMat, 0, 0.008, 0));
  laptop.add(M(box(0.29, 0.002, 0.11), new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.7 }), 0, 0.017, -0.03, { cast: false }));
  laptop.add(M(box(0.1, 0.002, 0.06), new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.4 }), 0, 0.017, 0.07, { cast: false }));
  const lid = new THREE.Group();
  lid.position.set(0, 0.016, -0.115);
  lid.rotation.x = -0.32;
  lid.add(M(box(0.33, 0.215, 0.007), lapMat, 0, 0.1075, -0.0035));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.198), new THREE.MeshBasicMaterial({ map: T.codeScreenTexture(code), toneMapped: false }));
  screen.position.set(0, 0.109, 0.0004);
  screen.material.color.setScalar(0.85);
  lid.add(screen);
  laptop.add(lid);
  g.add(laptop);

  /* ---------------- multimeter */
  const mm = new THREE.Group();
  mm.position.set(0.39, BENCH_TOP, 0.27);
  mm.rotation.y = -0.4;
  mm.add(M(box(0.085, 0.035, 0.17), new THREE.MeshStandardMaterial({ color: 0xf2b316, roughness: 0.6 }), 0, 0.0175, 0));
  mm.add(M(box(0.06, 0.003, 0.035), new THREE.MeshBasicMaterial({ map: T.labelTexture("4.98", { bg: "#aeb8a0", fg: "#1b1b1b", font: "bold 64px monospace" }) }), 0, 0.036, -0.05));
  mm.add(M(cyl(0.022, 0.022, 0.008, 24), mats.blackPlastic, 0, 0.038, 0.02));
  for (const [x, c] of [
    [-0.02, 0xc62828],
    [0.02, 0x111111],
  ]) {
    const lead = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.03, 0.075), new THREE.Vector3(x * 3, 0.004, 0.12), new THREE.Vector3(x * 6, 0.004, 0.16)]);
    mm.add(M(new THREE.TubeGeometry(lead, 20, 0.0022, 8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }), 0, 0, 0));
  }
  g.add(mm);

  /* ---------------- aluminium buizen + schuifmaat + pijpsnijder */
  const stock = new THREE.Group();
  stock.position.set(-0.38, BENCH_TOP, 0.33);
  for (let i = 0; i < 4; i++) stock.add(M(cyl(0.004, 0.004, 0.62, 20), mats.alu, 0, 0.004 + (i % 2) * 0.007, i * 0.009 - 0.012, { rz: Math.PI / 2 }));
  stock.add(M(cyl(0.006, 0.006, 0.45, 24), mats.alu, 0.06, 0.006, 0.03, { rz: Math.PI / 2 }));
  g.add(stock);
  const caliper = new THREE.Group();
  caliper.position.set(-0.6, BENCH_TOP + 0.002, 0.25);
  caliper.rotation.y = 0.2;
  caliper.add(M(box(0.2, 0.004, 0.016), mats.chrome, 0, 0, 0));
  caliper.add(M(box(0.012, 0.004, 0.045), mats.chrome, -0.094, 0, 0.022));
  caliper.add(M(box(0.03, 0.008, 0.05), mats.chrome, -0.04, 0.002, 0.018));
  caliper.add(M(box(0.022, 0.002, 0.014), new THREE.MeshBasicMaterial({ map: T.labelTexture("140.00", { bg: "#b9c2ad", fg: "#111", font: "bold 50px monospace" }) }), -0.04, 0.0065, 0.012));
  g.add(caliper);
  const cutter = new THREE.Group();
  cutter.position.set(-0.2, BENCH_TOP + 0.012, 0.3);
  cutter.add(M(new THREE.TorusGeometry(0.022, 0.006, 10, 24, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.4 }), 0, 0, 0, { rx: Math.PI / 2 }));
  cutter.add(M(cyl(0.006, 0.006, 0.06, 12), mats.chrome, 0.045, 0, 0, { rz: Math.PI / 2 }));
  g.add(cutter);

  /* ---------------- krukje */
  const stool = new THREE.Group();
  stool.position.set(0.15, 0, 0.85);
  stool.add(M(cyl(0.18, 0.18, 0.04, 40), new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.7 }), 0, 0.66, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const leg = M(cyl(0.012, 0.012, 0.67, 12), mats.steel, Math.cos(a) * 0.12, 0.33, Math.sin(a) * 0.12);
    leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    stool.add(leg);
  }
  stool.add(M(new THREE.TorusGeometry(0.13, 0.008, 8, 40), mats.steel, 0, 0.25, 0, { rx: Math.PI / 2 }));
  g.add(stool);

  /* ---------------- prullenbak en filamentdoos */
  g.add(M(cyl(0.15, 0.13, 0.4, 32, true), new THREE.MeshStandardMaterial({ color: 0x5f6b73, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }), 1.25, 0.2, 0.2));
  g.add(M(box(0.22, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: 0xa8865c, roughness: 0.9 }), 1.3, 0.11, -0.35, { ry: 0.3 }));

  /* ---------------- 3D-printer */
  const printer = buildPrinter(mats);
  printer.group.position.set(0.64, BENCH_TOP, -0.08);
  printer.group.rotation.y = -0.25;
  g.add(printer.group);

  return {
    group: g,
    lights: { sun, hemi, spot, tube },
    printer,
    laptop,
    station,
    mat,
    lampTarget,
  };
}

function spool(color, mats) {
  const s = new THREE.Group();
  const flange = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, transparent: true, opacity: 0.92 });
  const fil = new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
  for (const z of [-0.033, 0.033]) s.add(M(cyl(0.1, 0.1, 0.004, 48), flange, 0, 0, z, { rx: Math.PI / 2 }));
  s.add(M(cyl(0.085, 0.085, 0.062, 48), fil, 0, 0, 0, { rx: Math.PI / 2 }));
  s.add(M(cyl(0.028, 0.028, 0.07, 24), mats.white, 0, 0, 0, { rx: Math.PI / 2 }));
  return s;
}

/** Eenvoudige bedslinger-printer die een cel print (met een clipping-vlak dat omhoog kruipt). */
function buildPrinter(mats) {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.5, metalness: 0.6 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xe0582b, roughness: 0.5 });
  g.add(M(box(0.42, 0.07, 0.4), frame, 0, 0.035, 0));
  g.add(M(box(0.05, 0.04, 0.38), frame, 0, 0.09, 0));
  const bed = new THREE.Group();
  bed.add(M(box(0.25, 0.006, 0.25), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.5 }), 0, 0, 0));
  bed.add(M(box(0.235, 0.002, 0.235), new THREE.MeshStandardMaterial({ map: T.peiTexture(), roughness: 0.45, metalness: 0.3 }), 0, 0.004, 0));
  bed.position.set(0, 0.115, 0);
  g.add(bed);
  for (const x of [-0.2, 0.2]) {
    g.add(M(box(0.03, 0.42, 0.03), frame, x, 0.28, -0.03));
    g.add(M(cyl(0.004, 0.004, 0.38, 10), mats.chrome, x * 0.85, 0.27, -0.03));
  }
  g.add(M(box(0.43, 0.03, 0.03), frame, 0, 0.505, -0.03));
  const gantry = new THREE.Group();
  gantry.add(M(box(0.4, 0.025, 0.02), frame, 0, 0, -0.03));
  const carriage = new THREE.Group();
  carriage.add(M(box(0.05, 0.06, 0.04), orange, 0, -0.005, -0.005));
  carriage.add(M(cyl(0.016, 0.016, 0.012, 24), mats.blackPlastic, 0, -0.01, 0.02, { rx: Math.PI / 2 }));
  carriage.add(M(box(0.018, 0.016, 0.018), mats.steelLight, 0, -0.04, -0.005));
  carriage.add(M(new THREE.ConeGeometry(0.004, 0.008, 12), mats.brass, 0, -0.052, -0.005, { rx: Math.PI }));
  gantry.add(carriage);
  gantry.position.set(0, 0.2, 0.0);
  g.add(gantry);
  // display
  const disp = M(box(0.1, 0.055, 0.015), frame, 0.13, 0.05, 0.205, { rx: -0.35 });
  g.add(disp);
  const dispScreen = M(new THREE.PlaneGeometry(0.075, 0.04), new THREE.MeshBasicMaterial({ map: T.labelTexture("PRINTEN 37%", { bg: "#0b2a4a", fg: "#9fd3ff", font: "bold 30px sans-serif" }), toneMapped: false }), 0.13, 0.05, 0.2135, { rx: -0.35, cast: false });
  g.add(dispScreen);
  // spoel op de bovenbalk
  const sp = spool(0xf3ede2, mats);
  sp.position.set(0, 0.6, -0.04);
  sp.rotation.y = Math.PI / 2;
  sp.scale.setScalar(0.9);
  g.add(sp);
  g.add(M(cyl(0.005, 0.005, 0.1, 8), mats.chrome, 0, 0.6, -0.04, { rz: Math.PI / 2 }));
  // filamentdraad naar de extruder
  const filCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.52, 0.0), new THREE.Vector3(0.08, 0.46, 0.06), new THREE.Vector3(0.0, 0.26, 0.02)]);
  const filament = M(new THREE.TubeGeometry(filCurve, 30, 0.0012, 6), new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.3 }), 0, 0, 0);
  g.add(filament);

  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const state = { bed, gantry, carriage, clip, printPart: null, partHeight: 0.03, filCurve, filament };
  state.setPart = (geometry, material, heightMm) => {
    const m = material.clone();
    m.clippingPlanes = [clip];
    m.clipShadows = true;
    m.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geometry, m);
    mesh.scale.setScalar(0.001);
    mesh.castShadow = true;
    mesh.rotation.x = Math.PI; // LED-opening naar beneden, zoals de STL
    mesh.position.set(0, 0.005 + (heightMm / 2) * 0.001, 0);
    bed.add(mesh);
    state.printPart = mesh;
    state.partHeight = heightMm * 0.001;
  };
  state.update = (t) => {
    const cycle = 26;
    const p = (t % cycle) / cycle;
    const layer = Math.min(1, p * 1.08);
    const h = layer * state.partHeight;
    bed.position.z = Math.sin(t * 3.1) * 0.012;
    carriage.position.x = Math.sin(t * 4.3) * 0.012 + Math.sin(t * 1.7) * 0.004;
    gantry.position.y = 0.115 + 0.005 + h + 0.052;
    if (state.printPart) {
      const wp = new THREE.Vector3();
      bed.getWorldPosition(wp);
      // het clipping-vlak (wereldcoördinaten) loopt mee met de laaghoogte
      const normal = new THREE.Vector3(0, -1, 0);
      clip.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(0, wp.y + 0.005 + h, 0));
      state.printPart.visible = p < 0.96;
    }
  };
  return { group: g, ...state };
}
