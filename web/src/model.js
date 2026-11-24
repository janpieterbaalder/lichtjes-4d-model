/**
 * Het fysieke model in 3D (eenheden: mm, de groepen worden ×0,001 geschaald naar meters).
 * Alle geprinte onderdelen komen uit dezelfde CAD als de STL's (app/parts.js).
 */
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  SPEC,
  EDGES,
  CHAIN,
  PIXEL_OF,
  CENTER_Y,
  OUTER_CROSS_Y,
  INNER_CROSS_Y,
  ROD_BOTTOM_Y,
  ROD_TOP_Y,
  BASE_TOP,
  cellPos,
  cellBasis,
  cellCoord,
  cellSpec,
  cellLabel,
  breadboardHole,
  BREADBOARD_WIRING,
  GX16_PINS,
} from "../../cad/design.mjs";
import * as T from "./textures.js";

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const C = new THREE.Vector3(0, CENTER_Y, 0);

function b64(s) {
  const bin = atob(s);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return buf;
}

const geoCache = {};
export function partGeometry(id) {
  if (geoCache[id]) return geoCache[id];
  const d = window.LICHTJES_PARTS[id];
  let g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(b64(d.p)), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(b64(d.i)), 1));
  g = toCreasedNormals(g, (32 * Math.PI) / 180);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  geoCache[id] = g;
  return g;
}

function mesh(geo, mat, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

/** Drie aders (rood/zwart/geel) langs een pad, met parallelle verschuiving. */
function bundle(points, colors, spread = 1.3, radius = 0.6, tension = 0.2) {
  const curve = new THREE.CatmullRomCurve3(points.map(V), false, "catmullrom", tension);
  const N = Math.max(24, Math.round(curve.getLength() / 2));
  const frames = curve.computeFrenetFrames(N, false);
  const out = [];
  colors.forEach((col, k) => {
    const a = (k / colors.length) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const p = curve.getPointAt(i / N);
      const off = frames.normals[i].clone().multiplyScalar(Math.cos(a) * spread).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a) * spread));
      pts.push(p.add(off));
    }
    const c2 = new THREE.CatmullRomCurve3(pts);
    const m = mesh(new THREE.TubeGeometry(c2, N, radius, 6), new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }), false);
    out.push(m);
  });
  return out;
}

function wire(points, color, radius = 0.55) {
  const curve = new THREE.CatmullRomCurve3(points.map(V), false, "catmullrom", 0.35);
  return mesh(new THREE.TubeGeometry(curve, 48, radius, 6), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }), false);
}

const RED = 0xd32f2f;
const BLACK = 0x1b1b1b;
const YELLOW = 0xf2c200;

export function buildModel(mats) {
  const root = new THREE.Group();
  root.name = "model";
  root.scale.setScalar(0.001);
  const registry = [];
  const reg = (obj, o) => {
    const e = {
      obj,
      home: obj.position.clone(),
      explode: o.explode ? o.explode.clone() : new THREE.Vector3(),
      groups: new Set(o.groups || []),
      stage: o.stage,
      stageMax: o.stageMax,
      fade: o.fade ?? false,
      info: o.info,
      hideOnExplode: o.hideOnExplode ?? false,
      fly: o.fly ? o.fly.clone() : null,
    };
    obj.userData.entry = e;
    obj.traverse((c) => (c.userData.entry = e));
    registry.push(e);
    return e;
  };

  /* ---------------------------------------------------------------- materialen */
  const petg = mats.petgBlack;
  const alu = new THREE.MeshStandardMaterial({ color: 0xb4b8be, roughness: 0.62, metalness: 0.7, envMapIntensity: 0.45 }); // mat geborsteld aluminium
  const ledColor = new THREE.Color("#ffb53d");

  /* ---------------------------------------------------------------- voet */
  const shell = mesh(partGeometry("base-shell"), petg);
  root.add(shell);
  reg(shell, { groups: ["shell", "base"], stage: "base", fade: true, explode: new THREE.Vector3(0, 90, 0), info: "base-shell" });
  const plate = mesh(partGeometry("base-plate"), petg);
  root.add(plate);
  reg(plate, { groups: ["plate", "base"], stage: "base", fade: true, explode: new THREE.Vector3(0, 0, 0), info: "base-plate" });

  // breadboard
  const B = SPEC.breadboard;
  const bbTop = new THREE.MeshStandardMaterial({ map: T.breadboardTexture(), roughness: 0.6 });
  const bbSide = new THREE.MeshStandardMaterial({ color: 0xeeebe3, roughness: 0.6 });
  const elec = new THREE.Group();
  const bb = mesh(new THREE.BoxGeometry(B.wid, B.h, B.len), [bbSide, bbSide, bbTop, bbSide, bbSide, bbSide]);
  bb.position.set(B.cx, SPEC.base.plate + B.h / 2, B.cz);
  elec.add(bb);
  // Arduino Nano
  const nano = new THREE.Group();
  const nanoZ = B.cz + (8 - 15.5) * B.pitch - 0.8;
  const nanoX = B.cx - 1.27;
  const nanoTop = new THREE.MeshStandardMaterial({ map: T.nanoTexture(), roughness: 0.45 });
  const nanoSide = new THREE.MeshStandardMaterial({ color: 0x1d58b8, roughness: 0.5 });
  const pcb = mesh(new THREE.BoxGeometry(18, 1.6, 43.2), [nanoSide, nanoSide, nanoTop, nanoSide, nanoSide, nanoSide]);
  pcb.position.set(0, 0, 0);
  nano.add(pcb);
  const chip = mesh(new THREE.BoxGeometry(7, 1.1, 7), mats.blackPlastic);
  chip.position.set(0, 1.3, 3);
  chip.rotation.y = Math.PI / 4;
  nano.add(chip);
  const ch340 = mesh(new THREE.BoxGeometry(4, 1, 9), mats.blackPlastic);
  ch340.position.set(0, 1.3, -9);
  nano.add(ch340);
  const usbc = mesh(new THREE.BoxGeometry(8.9, 3.2, 7.4), mats.chrome);
  usbc.position.set(0, 2.4, -21.6 + 3.7 - 1.5);
  nano.add(usbc);
  const usbHole = mesh(new THREE.BoxGeometry(8.2, 2.4, 0.3), mats.blackPlastic);
  usbHole.position.set(0, 2.4, -21.6 - 1.4);
  nano.add(usbHole);
  for (const sx of [-1, 1]) {
    const strip = mesh(new THREE.BoxGeometry(2.5, 2.5, 38.1), mats.blackPlastic);
    strip.position.set(sx * 7.62, -2.05, 0.8);
    nano.add(strip);
  }
  const led = mesh(new THREE.BoxGeometry(1, 0.6, 1.6), new THREE.MeshBasicMaterial({ color: 0x7dff7a }));
  led.position.set(4, 1.1, -14);
  nano.add(led);
  nano.position.set(nanoX, SPEC.base.plate + B.h + 2.5 + 0.8, nanoZ);
  elec.add(nano);

  // OLED-module achter het venster
  const O = SPEC.oled;
  const oledCanvas = document.createElement("canvas");
  oledCanvas.width = 128;
  oledCanvas.height = 64;
  const oledTex = new THREE.CanvasTexture(oledCanvas);
  oledTex.magFilter = THREE.NearestFilter;
  oledTex.minFilter = THREE.LinearFilter;
  oledTex.colorSpace = THREE.SRGBColorSpace;
  const oled = new THREE.Group();
  const oPcb = mesh(new THREE.BoxGeometry(O.pcb[0], O.pcb[1], 1.2), new THREE.MeshStandardMaterial({ color: 0x1d58b8, roughness: 0.5 }));
  oPcb.position.set(0, 0, -2);
  oled.add(oPcb);
  const glassO = mesh(new THREE.BoxGeometry(26.7, 19.3, 1.4), new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.15, metalness: 0.2 }));
  glassO.position.set(0, -1, -0.7);
  oled.add(glassO);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(21.7, 10.9), new THREE.MeshBasicMaterial({ map: oledTex, toneMapped: false }));
  screen.position.set(0, 0, 0.03);
  oled.add(screen);
  for (let k = 0; k < 4; k++) {
    const pin = mesh(new THREE.BoxGeometry(0.64, 0.64, 7), mats.brass, false);
    pin.position.set(-3.81 + k * 2.54, 12.3, -5.5);
    oled.add(pin);
  }
  oled.position.set(O.x, O.y, SPEC.base.size / 2 - SPEC.base.wall);
  root.add(oled);
  reg(oled, { groups: ["electronics", "base", "oled"], stage: "base", explode: new THREE.Vector3(0, 90, 60), info: "oled" });

  // GX16-8 chassisdeel
  const G = SPEC.gx16;
  const gx = new THREE.Group();
  const zf = SPEC.base.size / 2;
  const fl = mesh(new THREE.CylinderGeometry(10.5, 10.5, 2.5, 40), mats.chrome);
  fl.rotation.x = Math.PI / 2;
  fl.position.z = zf + 1.25;
  gx.add(fl);
  const mouth = mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.6, 40), mats.blackPlastic);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.z = zf + 2.6;
  gx.add(mouth);
  const body = mesh(new THREE.CylinderGeometry(7.9, 7.9, 10, 40), mats.chrome);
  body.rotation.x = Math.PI / 2;
  body.position.z = zf - 6;
  gx.add(body);
  const nut = mesh(new THREE.CylinderGeometry(10.5, 10.5, 2.4, 6), mats.chrome);
  nut.rotation.x = Math.PI / 2;
  nut.position.z = zf - 4.4;
  gx.add(nut);
  gx.position.set(G.x, G.y, 0);
  root.add(gx);
  reg(gx, { groups: ["electronics", "base", "gx16"], stage: "base", explode: new THREE.Vector3(0, 90, 75), info: "gx16" });
  const gxPin = (p) => {
    const a = ((p - 1) / 8) * Math.PI * 2;
    return [G.x + Math.cos(a) * 4.2, G.y + Math.sin(a) * 4.2, zf - 12];
  };

  // zoemer, elco, weerstand
  const Z = SPEC.buzzer;
  const buzz = mesh(new THREE.CylinderGeometry(6, 6, 8.5, 32), mats.blackPlastic);
  buzz.position.set(Z.x, SPEC.base.plate + 4.25, Z.z);
  elec.add(buzz);
  const capP = breadboardHole(25, "+");
  const capM = breadboardHole(25, "-");
  const cap = mesh(new THREE.CylinderGeometry(5, 5, 13, 24), new THREE.MeshStandardMaterial({ color: 0x23358a, roughness: 0.4 }));
  cap.position.set((capP[0] + capM[0]) / 2, capP[1] + 9, capP[2]);
  elec.add(cap);
  const stripe = mesh(new THREE.CylinderGeometry(5.05, 5.05, 12, 24, 1, true, -0.5, 1), new THREE.MeshStandardMaterial({ color: 0xc7c9d0, roughness: 0.4 }));
  stripe.position.copy(cap.position);
  elec.add(stripe);
  const r0 = breadboardHole(7, "h");
  const r1 = breadboardHole(20, "h");
  elec.add(wire([[r0[0], r0[1] - 1, r0[2]], [r0[0], r0[1] + 5, r0[2] + 2], [r1[0], r1[1] + 5, r1[2] - 2], [r1[0], r1[1] - 1, r1[2]]], 0xbfc4ca, 0.3));
  const res = mesh(new THREE.CapsuleGeometry(1.2, 5, 4, 12), new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.6 }));
  res.rotation.x = Math.PI / 2;
  res.position.set(r0[0], r0[1] + 5.4, (r0[2] + r1[2]) / 2);
  elec.add(res);

  // jumperdraden volgens de aansluittabel
  const oledPin = (k) => [O.x - 3.81 + k * 2.54, O.y + 12.3, zf - SPEC.base.wall - 9];
  const dest = (w) => {
    if (w.rail) return breadboardHole(w.rail[0], w.rail[1]);
    const m = /GX16 pin (\d)/.exec(w.to);
    if (m) return gxPin(+m[1]);
    if (w.to === "OLED GND") return oledPin(0);
    if (w.to === "OLED VCC") return oledPin(1);
    if (w.to === "OLED SCL") return oledPin(2);
    if (w.to === "OLED SDA") return oledPin(3);
    if (w.to === "buzzer +") return [Z.x + 2.5, SPEC.base.plate + 8.5, Z.z];
    if (w.to === "buzzer −") return [Z.x - 2.5, SPEC.base.plate + 8.5, Z.z];
    return null;
  };
  for (const w of BREADBOARD_WIRING) {
    if (w.color === "resistor" || w.color === "cap" || w.to.startsWith("LED-kabel")) continue;
    const a = breadboardHole(w.hole[0], w.hole[1]);
    const b = dest(w);
    if (!b) continue;
    const short = Math.hypot(a[0] - b[0], a[2] - b[2]) < 15 && Math.abs(a[1] - b[1]) < 1;
    const lift = short ? 4 : 10 + Math.random() * 6;
    const mid = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + lift, (a[2] + b[2]) / 2];
    const pts = [[a[0], a[1] - 2, a[2]], [a[0], a[1] + 3, a[2]], mid, [b[0], b[1] + (w.rail ? 3 : 0), b[2] + (w.rail ? 0 : -2)], [b[0], b[1] - (w.rail ? 2 : 0), b[2]]];
    elec.add(wire(pts, w.color, 0.5));
  }
  // ballast
  const washer = new THREE.CylinderGeometry(13, 13, 2.5, 32);
  for (const [cx, cz] of [
    [-48, -45],
    [-48, 38],
  ])
    for (const [dx, dz] of [
      [-11, -12],
      [11, -12],
      [-11, 13],
      [11, 13],
    ])
      for (let k = 0; k < 4; k++) {
        const wsh = mesh(new THREE.CylinderGeometry(10.5, 10.5, 2.3, 28), mats.steelLight);
        wsh.position.set(cx + dx, SPEC.base.plate + 1.2 + k * 2.4, cz + dz);
        elec.add(wsh);
      }
  root.add(elec);
  reg(elec, { groups: ["electronics", "base"], stage: "base", explode: new THREE.Vector3(0, 0, 0), info: "electronics" });

  // voetjes en USB-C stekker (afronden)
  const close = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const f = mesh(new THREE.CylinderGeometry(6, 6, 3, 24), mats.rubber);
    f.position.set(sx * 70, -1.5, sz * 70);
    close.add(f);
  }
  const Us = SPEC.usb;
  const usbPlug = mesh(new THREE.BoxGeometry(11, 6, 22), mats.blackPlastic);
  usbPlug.position.set(Us.x, Us.y, -SPEC.base.size / 2 - 11);
  close.add(usbPlug);
  root.add(close);
  reg(close, { groups: ["base"], stage: "base-close", explode: new THREE.Vector3(0, 0, -40), info: "usb" });

  /* ---------------------------------------------------------------- staaf en kruizen */
  const rodShape = [new THREE.Vector2(SPEC.rod.id / 2, 0), new THREE.Vector2(SPEC.rod.od / 2, 0), new THREE.Vector2(SPEC.rod.od / 2, ROD_TOP_Y - ROD_BOTTOM_Y), new THREE.Vector2(SPEC.rod.id / 2, ROD_TOP_Y - ROD_BOTTOM_Y), new THREE.Vector2(SPEC.rod.id / 2, 0)];
  const rod = mesh(new THREE.LatheGeometry(rodShape, 40), alu);
  rod.position.y = ROD_BOTTOM_Y;
  root.add(rod);
  reg(rod, { groups: ["rod"], stage: "rod", explode: new THREE.Vector3(0, 160, 0), info: "rod", fly: new THREE.Vector3(0, -160, 0) });

  const cOut = mesh(partGeometry("cross-outer"), petg);
  cOut.position.y = OUTER_CROSS_Y;
  root.add(cOut);
  reg(cOut, { groups: ["crosses"], stage: "crosses", fade: true, explode: new THREE.Vector3(0, 235, 0), info: "cross-outer", fly: new THREE.Vector3(0, -80, 0) });
  const cIn = mesh(partGeometry("cross-inner"), petg);
  cIn.position.y = INNER_CROSS_Y;
  root.add(cIn);
  reg(cIn, { groups: ["crosses"], stage: "crosses", fade: true, explode: new THREE.Vector3(0, 300, 0), info: "cross-inner", fly: new THREE.Vector3(0, -80, 0) });

  /* ---------------------------------------------------------------- cellen, doppen, LED's */
  const cells = [];
  const ledPcbMat = new THREE.MeshStandardMaterial({ map: T.ledPcbTexture(), roughness: 0.5 });
  const lift = new THREE.Vector3(0, 380, 0);
  for (let i = 0; i < 16; i++) {
    const outer = cellCoord(i).w === 1;
    const sp = cellSpec(i);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xdcd6cb,
      roughness: 0.5,
      metalness: 0,
      transmission: 0.55,
      thickness: 6,
      ior: 1.57,
      attenuationColor: new THREE.Color(0xfff4e0),
      attenuationDistance: 30,
      emissive: ledColor,
      emissiveIntensity: 0,
    });
    const B3 = cellBasis(i);
    const basis = new THREE.Matrix4().makeBasis(V(B3[0]), V(B3[1]), V(B3[2]));
    const q = new THREE.Quaternion().setFromRotationMatrix(basis);
    const p = V(cellPos(i));
    const cell = mesh(partGeometry(outer ? "cell-outer" : "cell-inner"), mat);
    cell.position.copy(p);
    cell.quaternion.copy(q);
    root.add(cell);
    const stage = outer ? "outer-chain" : "inner-chain";
    const radial = p.clone().sub(C).multiplyScalar(0.9).add(lift);
    reg(cell, { groups: ["cells", outer ? "cells-outer" : "cells-inner"], stage, fade: true, explode: radial, info: outer ? "cell-outer" : "cell-inner", fly: p.clone().sub(C).normalize().multiplyScalar(40) });
    const portN = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const plug = mesh(partGeometry(outer ? "plug-outer" : "plug-inner"), mat);
    plug.position.copy(p);
    plug.quaternion.copy(q);
    root.add(plug);
    reg(plug, { groups: ["plugs"], stage, fade: true, explode: radial.clone().add(portN.clone().multiplyScalar(30)), info: outer ? "plug-outer" : "plug-inner" });
    // LED-module op de pennetjes van de dop, LED naar binnen
    const h = sp.size / 2;
    const wall = (sp.size - sp.cavity) / 2;
    const ledGroup = new THREE.Group();
    const lp = mesh(new THREE.CylinderGeometry(5, 5, 1.6, 24), [new THREE.MeshStandardMaterial({ color: 0x151515 }), ledPcbMat, new THREE.MeshStandardMaterial({ color: 0x151515 })]);
    lp.position.y = h - wall - 2.5 - 0.8;
    ledGroup.add(lp);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f2, emissive: ledColor, emissiveIntensity: 0, roughness: 0.3 });
    const chipL = mesh(new THREE.BoxGeometry(5, 1.5, 5), ledMat);
    chipL.position.y = h - wall - 2.5 - 1.6 - 0.75;
    ledGroup.add(chipL);
    ledGroup.position.copy(p);
    ledGroup.quaternion.copy(q);
    root.add(ledGroup);
    reg(ledGroup, { groups: ["leds"], stage, explode: radial.clone().add(portN.clone().multiplyScalar(15)), info: "led" });
    cells.push({ i, cell, plug, mat, ledMat, ledGroup, pos: p, outer });
  }

  /* ---------------------------------------------------------------- buizen */
  const tubeGeo = new THREE.CylinderGeometry(SPEC.tube.od / 2, SPEC.tube.od / 2, 1, 28, 1);
  const tubes = [];
  for (const e of EDGES) {
    const s = V(e.start);
    const t = V(e.end);
    const mid = s.clone().add(t).multiplyScalar(0.5);
    const tube = mesh(tubeGeo, alu);
    tube.scale.y = e.length;
    tube.position.copy(mid);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t.clone().sub(s).normalize());
    root.add(tube);
    const stage = e.chainStep ? (e.chainStep <= 7 ? "inner-chain" : "outer-chain") : "loops";
    reg(tube, {
      groups: ["tubes", e.chainStep ? "tubes-chain" : "tubes-empty", e.feed ? "tube-feed" : ""],
      stage,
      fade: true,
      explode: mid.clone().sub(C).multiplyScalar(0.9).add(lift),
      info: e.feed ? "tube-feed" : `tube-${e.kind}`,
      fly: e.chainStep ? null : t.clone().sub(s).normalize().multiplyScalar(-14),
    });
    tube.userData.edge = e;
    tubes.push({ e, tube });
  }

  /* ---------------------------------------------------------------- bedrading door de buizen */
  const wires = [];
  for (const e of EDGES.filter((x) => x.chainStep)) {
    const k = e.chainStep;
    const from = CHAIN[k - 1];
    const to = CHAIN[k];
    const pa = V(cellPos(from));
    const pb = V(cellPos(to));
    const s = V(e.start);
    const t = V(e.end);
    // start/eind horen bij a/b van de ribbe; volg de ketting-richting
    const [p0, p1] = e.a === from ? [s, t] : [t, s];
    const pts = [pa.clone().lerp(p0, 0.25).add(new THREE.Vector3(0, 0.8, 0)), p0, p1, pb.clone().lerp(p1, 0.25).add(new THREE.Vector3(0, -0.8, 0))].map((v) => v.toArray());
    const ms = bundle(pts, [RED, BLACK, YELLOW], 1.15, 0.55);
    const g = new THREE.Group();
    ms.forEach((m) => g.add(m));
    root.add(g);
    reg(g, { groups: ["wires", "wires-chain"], stage: k <= 7 ? "inner-chain" : "outer-chain", hideOnExplode: true, info: "wire" });
    wires.push(g);
  }
  // voedingskabel
  const feedTube = EDGES.find((e) => e.feed);
  const fm = V(feedTube.start).add(V(feedTube.end)).multiplyScalar(0.5);
  const c2 = V(cellPos(2));
  const feedTop = bundle(
    [
      [fm.x, fm.y - 0.5, fm.z - 3],
      [fm.x - 6, fm.y, fm.z],
      [feedTube.start[0] + 4, fm.y, fm.z],
      [c2.x + 4, c2.y - 0.8, c2.z],
    ],
    [RED, BLACK, YELLOW],
    1.0,
    0.55,
  );
  const gTop = new THREE.Group();
  feedTop.forEach((m) => gTop.add(m));
  root.add(gTop);
  reg(gTop, { groups: ["wires", "feed"], stage: "inner-chain", hideOnExplode: true, info: "feed" });
  const tail = bundle(
    [
      [fm.x, fm.y - 0.5, fm.z - 3],
      [fm.x, fm.y - 2, fm.z - 9],
      [fm.x + 4, fm.y - 25, fm.z - 14],
      [fm.x + 10, fm.y - 55, fm.z - 8],
    ],
    [RED, BLACK, YELLOW],
    1.0,
    0.55,
  );
  const gTail = new THREE.Group();
  tail.forEach((m) => gTail.add(m));
  root.add(gTail);
  reg(gTail, { groups: ["wires", "feed"], stage: "inner-chain", stageMax: "crosses", hideOnExplode: true, info: "feed" });
  const I = SPEC.innerCross;
  const feedRod = bundle(
    [
      [fm.x, fm.y - 0.5, fm.z - 3],
      [0, INNER_CROSS_Y + I.grooveBottom + 1.6, fm.z - 8],
      [0, INNER_CROSS_Y + I.grooveBottom + 1.6, 6],
      [0, INNER_CROSS_Y + I.grooveBottom - 1, 0],
      [0, ROD_TOP_Y - 4, 0],
      [0, ROD_BOTTOM_Y + 30, 0],
      [0, ROD_BOTTOM_Y - 2, 0],
    ],
    [RED, BLACK, YELLOW],
    1.4,
    0.55,
    0.05,
  );
  const gRod = new THREE.Group();
  feedRod.forEach((m) => gRod.add(m));
  root.add(gRod);
  reg(gRod, { groups: ["wires", "feed"], stage: "rod", hideOnExplode: true, info: "feed" });
  const yHole = breadboardHole(20, "i");
  const pHole = breadboardHole(22, "+");
  const mHole = breadboardHole(22, "-");
  const gBase = new THREE.Group();
  for (const [h, col, dz] of [
    [yHole, YELLOW, 0],
    [pHole, RED, -1.6],
    [mHole, BLACK, 1.6],
  ]) {
    gBase.add(wire([[h[0], h[1] - 2, h[2]], [h[0], h[1] + 4, h[2]], [h[0] - 10, 16, h[2] + 10], [20, 8, dz], [6, 7, dz], [0, ROD_BOTTOM_Y - 3, dz * 0.4]], col, 0.55));
  }
  root.add(gBase);
  reg(gBase, { groups: ["wires", "feed", "electronics"], stage: "base", hideOnExplode: true, info: "feed" });

  /* ---------------------------------------------------------------- GX16-stekker van de controller */
  const plugG = new THREE.Group();
  const knurl = mesh(new THREE.CylinderGeometry(9.5, 9.5, 18, 32), mats.chrome);
  knurl.rotation.x = Math.PI / 2;
  knurl.position.z = zf + 3 + 9;
  plugG.add(knurl);
  const boot = mesh(new THREE.CylinderGeometry(7.5, 5, 16, 24), mats.blackPlastic);
  boot.rotation.x = Math.PI / 2;
  boot.position.z = zf + 3 + 18 + 8;
  plugG.add(boot);
  plugG.position.set(G.x, G.y, 0);
  root.add(plugG);
  reg(plugG, { groups: ["controller"], stage: "controller", explode: new THREE.Vector3(0, 90, 130), info: "gx16" });

  /* ---------------------------------------------------------------- labels: LED-nummers */
  const labels = [];
  for (let i = 0; i < 16; i++) {
    const div = document.createElement("div");
    div.className = "led-label";
    div.innerHTML = `<b>LED ${PIXEL_OF[i]}</b><span>cel ${i} · ${cellLabel(i)}</span>`;
    const l = new CSS2DObject(div);
    const p = V(cellPos(i));
    const out = p.clone().sub(C).normalize().multiplyScalar(cellCoord(i).w ? 30 : 18);
    l.position.copy(p.add(out));
    l.visible = false;
    root.add(l);
    labels.push(l);
  }

  /* ---------------------------------------------------------------- maatvoering */
  const dims = new THREE.Group();
  dims.visible = false;
  const dimMat = new THREE.LineBasicMaterial({ color: 0xffd166, depthTest: false, transparent: true });
  const dim = (a, b, text, tick = new THREE.Vector3(0, 6, 0)) => {
    const A = V(a);
    const Bv = V(b);
    const geo = new THREE.BufferGeometry().setFromPoints([A, Bv, A.clone().add(tick), A.clone().sub(tick), Bv.clone().add(tick), Bv.clone().sub(tick)]);
    geo.setIndex([0, 1, 2, 3, 4, 5]);
    const l = new THREE.LineSegments(geo, dimMat);
    l.renderOrder = 999;
    dims.add(l);
    const div = document.createElement("div");
    div.className = "dim-label";
    div.textContent = text;
    const lab = new CSS2DObject(div);
    lab.position.copy(A.clone().add(Bv).multiplyScalar(0.5));
    dims.add(lab);
  };
  const H = SPEC.base.size / 2;
  const top = CENTER_Y + 80 + SPEC.outerCell.size / 2;
  dim([-80, CENTER_Y + 80 + 32, 80], [80, CENTER_Y + 80 + 32, 80], "160 mm hart-op-hart");
  dim([-42, CENTER_Y + 42, 42 + 26], [42, CENTER_Y + 42, 42 + 26], "84 mm");
  dim([H + 25, 0, H], [H + 25, top, H], `${Math.round(top)} mm totaal`, new THREE.Vector3(6, 0, 0));
  dim([-H, -12, H + 12], [H, -12, H + 12], "190 mm");
  dim([-H - 18, BASE_TOP, H], [-H - 18, OUTER_CROSS_Y - 15, H], "45 mm vrij", new THREE.Vector3(6, 0, 0));
  dim([-H - 18, 0, H], [-H - 18, BASE_TOP, H], "48 mm voet", new THREE.Vector3(6, 0, 0));
  root.add(dims);

  /* ---------------------------------------------------------------- licht van de cursor-cel */
  const cursorLight = new THREE.PointLight(0xffc56e, 0, 0.45, 2);
  root.add(cursorLight);
  const glowLight = new THREE.PointLight(0xffc56e, 0, 0.7, 2);
  glowLight.position.copy(C);
  root.add(glowLight);

  /* ---------------------------------------------------------------- API */
  const api = {
    root,
    registry,
    cells,
    tubes,
    labels,
    dims,
    oledCanvas,
    oledTex,
    /** levels: 0..255 per cel (zoals de firmware), cursor: celindex */
    setLeds(levels, cursor) {
      let sum = 0;
      for (const c of cells) {
        const lv = levels[c.i] / 255;
        const k = Math.pow(lv, 1.2);
        c.mat.emissiveIntensity = k * 2.2;
        c.ledMat.emissiveIntensity = k * 5;
        sum += k;
      }
      const cp = cells[cursor]?.pos;
      if (cp) {
        cursorLight.position.copy(cp);
        cursorLight.intensity = Math.pow(levels[cursor] / 255, 1.25) * 0.006;
      }
      glowLight.intensity = sum * 0.0015;
    },
    entries(group) {
      return registry.filter((e) => e.groups.has(group));
    },
  };
  return api;
}

/* ==================================================================== controller */

export function buildController(mats) {
  const root = new THREE.Group();
  root.name = "controller";
  root.scale.setScalar(0.001);
  const registry = [];
  const reg = (obj, o) => {
    const e = { obj, home: obj.position.clone(), explode: o.explode || new THREE.Vector3(), groups: new Set(o.groups || []), stage: "controller", fade: o.fade ?? false, info: o.info, hideOnExplode: false };
    obj.traverse((c) => (c.userData.entry = e));
    registry.push(e);
    return e;
  };
  const Cc = SPEC.controller;
  const bottom = mesh(partGeometry("ctrl-bottom"), mats.petgBlack);
  root.add(bottom);
  reg(bottom, { groups: ["controller"], fade: true, info: "ctrl-bottom" });
  const top = mesh(partGeometry("ctrl-top"), mats.petgBlack);
  root.add(top);
  reg(top, { groups: ["controller"], fade: true, explode: new THREE.Vector3(0, 50, 0), info: "ctrl-top" });

  const pcbMat = new THREE.MeshStandardMaterial({ map: T.joystickPcbTexture(), roughness: 0.5 });
  const pcbSide = new THREE.MeshStandardMaterial({ color: 0x1b3f8f, roughness: 0.5 });
  const sticks = [];
  for (const sx of [-1, 1]) {
    const joy = new THREE.Group();
    const cx = sx * (Cc.stickX - Cc.joyStickOffset);
    const p = mesh(new THREE.BoxGeometry(Cc.joyPcb[0], 1.6, Cc.joyPcb[1]), [pcbSide, pcbSide, pcbMat, pcbSide, pcbSide, pcbSide]);
    p.position.set(0, Cc.joyPcbY + 0.8, 0);
    joy.add(p);
    const stickLocalX = -Cc.joyStickOffset; // stick zit van de pinnen af
    const mech = mesh(new THREE.BoxGeometry(16, 11, 16), mats.blackPlastic);
    mech.position.set(stickLocalX, Cc.joyPcbY + 1.6 + 5.5, 0);
    joy.add(mech);
    for (const [dx, dz, ry] of [
      [stickLocalX, -10.5, 0],
      [stickLocalX - 10.5, 0, Math.PI / 2],
    ]) {
      const pot = mesh(new THREE.BoxGeometry(10, 9, 5), new THREE.MeshStandardMaterial({ color: 0x2d5fb8, roughness: 0.5 }));
      pot.position.set(dx, Cc.joyPcbY + 1.6 + 4.5, dz);
      pot.rotation.y = ry;
      joy.add(pot);
    }
    // pinnen + dupont-stekkertjes richting midden
    for (let k = 0; k < 5; k++) {
      const pin = mesh(new THREE.BoxGeometry(6, 0.64, 0.64), mats.brass, false);
      pin.position.set(Cc.joyPcb[0] / 2 + 3, Cc.joyPcbY + 0.8, -5.08 + k * 2.54);
      joy.add(pin);
      const dup = mesh(new THREE.BoxGeometry(14, 2.5, 2.5), mats.blackPlastic);
      dup.position.set(Cc.joyPcb[0] / 2 + 6 + 7, Cc.joyPcbY + 0.8, -5.08 + k * 2.54);
      joy.add(dup);
    }
    // beweegbaar deel
    const pivot = new THREE.Group();
    pivot.position.set(stickLocalX, Cc.joyPcbY + 1.6 + 11, 0);
    const dome = mesh(new THREE.SphereGeometry(8.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.blackPlastic);
    pivot.add(dome);
    const shaft = mesh(new THREE.CylinderGeometry(2.2, 2.2, 12, 16), mats.blackPlastic);
    shaft.position.y = 9;
    pivot.add(shaft);
    const capProfile = [
      [0, 0],
      [7, 0],
      [11.5, 1.5],
      [12.6, 4],
      [12.4, 6.8],
      [11, 7.2],
      [6, 5.6],
      [0, 5.2],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const capMesh = mesh(new THREE.LatheGeometry(capProfile, 48), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.75 }));
    capMesh.position.y = 13;
    pivot.add(capMesh);
    const ring = mesh(new THREE.TorusGeometry(9.3, 0.5, 8, 48), new THREE.MeshStandardMaterial({ color: 0x45484e, roughness: 0.4 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 13 + 5.6;
    pivot.add(ring);
    joy.add(pivot);
    joy.position.set(cx, 0, 0);
    if (sx > 0) joy.rotation.y = Math.PI; // pinnen naar het midden
    root.add(joy);
    reg(joy, { groups: ["controller", "electronics"], explode: new THREE.Vector3(0, 25, 0), info: "ky023" });
    sticks.push({ pivot, sx, joy });
  }
  // aders van de dupontjes naar de kabeldoorvoer
  const wiresG = new THREE.Group();
  const cols = [0xf08a24, 0x6b4426, 0x9fd8a8, 0x2e9d4c, 0xf7c79a, 0xa9c4f0, 0x2f62c9, 0xc9b29a];
  for (const sx of [-1, 1])
    for (let k = 0; k < 5; k++) {
      const x0 = sx * (Cc.stickX - Cc.joyStickOffset) - sx * (Cc.joyPcb[0] / 2 + 20);
      const z0 = sx * (-5.08 + k * 2.54);
      wiresG.add(wire([[x0, Cc.joyPcbY + 0.8, z0], [x0 - sx * 6, Cc.joyPcbY + 2, z0 - 4], [sx * 3, 11, -20], [0, 11, -30]], cols[(k + (sx > 0 ? 3 : 0)) % 8], 0.45));
    }
  const cableIn = mesh(new THREE.CylinderGeometry(2.6, 2.6, 30, 16), mats.blackPlastic);
  cableIn.rotation.x = Math.PI / 2;
  cableIn.position.set(0, 11, -33);
  wiresG.add(cableIn);
  root.add(wiresG);
  reg(wiresG, { groups: ["controller", "wires"], info: "cable" });

  const api = {
    root,
    registry,
    /** axes: [x, y, z, w] in −1..1, pressed: {L,R} */
    setSticks(axes, pressed) {
      const L = sticks[0];
      const R = sticks[1];
      const k = 0.38;
      L.pivot.rotation.set(axes[1] * k, 0, -axes[0] * k);
      // rechter stick is 180° gedraaid gemonteerd
      R.pivot.rotation.set(axes[2] * k, 0, axes[3] * k);
      L.pivot.position.y = Cc.joyPcbY + 1.6 + 11 - (pressed.L ? 1.6 : 0);
      R.pivot.position.y = Cc.joyPcbY + 1.6 + 11 - (pressed.R ? 1.6 : 0);
    },
  };
  return api;
}
