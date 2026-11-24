/**
 * Parametrische 3D-printonderdelen voor LICHTJES 4D, gebouwd met manifold-3d (robuuste CSG).
 * Alle onderdelen worden gebouwd in het montage-assenstelsel (Y omhoog, mm). build.mjs draait ze
 * daarna in printoriëntatie voor de STL's.
 */
import Module from "manifold-3d";
import { SPEC, OUTER_HALF, INNER_HALF } from "./design.mjs";

let W; // manifold wasm module
export async function initCAD() {
  W = await Module();
  W.setup();
  return W;
}

const SEG = 64; // segmenten voor ronde gaten
const deg = (r) => (r * 180) / Math.PI;

/* ------------------------------------------------------------------ helpers */

function box(min, max) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return W.Manifold.cube(size, false).translate(min);
}

/** Cilinder langs Y van y0 tot y1. */
function cylY(r, y0, y1, x = 0, z = 0, seg = SEG, r1 = r) {
  return W.Manifold.cylinder(y1 - y0, r, r1, seg, false).rotate([-90, 0, 0]).translate([x, y0, z]);
}

/** Euler-hoeken die de Z-as op richting d leggen. */
function alignZ(d) {
  const l = Math.hypot(d[0], d[1], d[2]);
  const dx = d[0] / l;
  const dy = d[1] / l;
  const dz = d[2] / l;
  return [deg(-Math.asin(dy)), deg(Math.atan2(dx, dz)), 0];
}

/** Cilinder van punt p0 naar p1. */
function cylAlong(r, p0, p1, seg = SEG, r1 = r) {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const L = Math.hypot(d[0], d[1], d[2]);
  return W.Manifold.cylinder(L, r, r1, seg, false).rotate(alignZ(d)).translate(p0);
}

/** Halfruimte { p : n·p ≥ dist } (als groot blok). */
function halfspace(n, dist) {
  const l = Math.hypot(n[0], n[1], n[2]);
  return W.Manifold.cube([600, 600, 600], true)
    .translate([0, 0, 300 + dist])
    .rotate(alignZ([n[0] / l, n[1] / l, n[2] / l]));
}

function roundedBox(sx, sy, sz, r, seg = 24) {
  const pts = [];
  for (const ix of [-1, 1])
    for (const iy of [-1, 1])
      for (const iz of [-1, 1])
        pts.push(W.Manifold.sphere(r, seg).translate([ix * (sx / 2 - r), iy * (sy / 2 - r), iz * (sz / 2 - r)]));
  return W.Manifold.hull(pts);
}

/** Afgeronde rechthoek (hoekstraal cr) als prisma langs Y, met afschuining boven/onder. */
function roundedSlab(halfX, halfZ, cr, y0, y1, chamferBottom = 0, chamferTop = 0) {
  const parts = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const cx = sx * (halfX - cr);
      const cz = sz * (halfZ - cr);
      parts.push(cylY(cr, y0 + chamferBottom, y1 - chamferTop, cx, cz, 48));
      if (chamferBottom) parts.push(cylY(cr - chamferBottom, y0, y0 + chamferBottom, cx, cz, 48));
      if (chamferTop) parts.push(cylY(cr - chamferTop, y1 - chamferTop, y1, cx, cz, 48));
    }
  return W.Manifold.hull(parts);
}

/** Stadionvorm (pil) langs X, als prisma langs Y. */
function stadium(halfLen, r, y0, y1, chamferBottom = 0, chamferTop = 0) {
  const c = halfLen - r;
  const parts = [];
  for (const sx of [-1, 1]) {
    parts.push(cylY(r, y0 + chamferBottom, y1 - chamferTop, sx * c, 0, 96));
    if (chamferBottom) parts.push(cylY(r - chamferBottom, y0, y0 + chamferBottom, sx * c, 0, 96));
    if (chamferTop) parts.push(cylY(r - chamferTop, y1 - chamferTop, y1, sx * c, 0, 96));
  }
  return W.Manifold.hull(parts);
}

const U = (list) => W.Manifold.union(list.filter(Boolean));

/* ------------------------------------------------------------------ cellen */

function cell(spec, outer) {
  const h = spec.size / 2;
  const c = spec.cavity / 2;
  const sr = SPEC.tube.socket / 2;
  const n = outer ? [-1, -1, -1] : [1, 1, 1];
  const nn = n.map((v) => v / Math.sqrt(3));

  let body = roundedBox(spec.size, spec.size, spec.size, spec.round);
  body = body.subtract(halfspace(n, spec.wChamfer));

  const cav = W.Manifold.cube([2 * c, 2 * c, 2 * c], true).subtract(halfspace(n, spec.wCavity));
  const cuts = [cav];
  // insteekgaten op de −x, −y, −z vlakken (doorlopend tot in de holte: schuifruimte bij montage)
  cuts.push(cylAlong(sr, [-h - 1, 0, 0], [-c + 1, 0, 0]));
  cuts.push(cylAlong(sr, [0, -h - 1, 0], [0, -c + 1, 0]));
  cuts.push(cylAlong(sr, [0, 0, -h - 1], [0, 0, -c + 1]));
  // w-buis door de afgeschuinde hoek
  cuts.push(cylAlong(sr, nn.map((v) => v * (spec.wCavity - 1)), nn.map((v) => v * (spec.wChamfer + 1))));
  // LED-opening met verzinking op +y
  cuts.push(cylY(spec.port / 2, c - 1, h + 1));
  cuts.push(cylY(spec.portRecess / 2, h - spec.recessDepth, h + 1));
  return body.subtract(U(cuts));
}

function plug(spec) {
  const h = spec.size / 2;
  const wall = (spec.size - spec.cavity) / 2;
  const flange = cylY(spec.portRecess / 2 - 0.12, h - spec.recessDepth, h);
  const insert = cylY(spec.port / 2 - 0.12, h - wall, h - spec.recessDepth + 0.01);
  const pins = [];
  const pr = spec.port * 0.3;
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 3;
    pins.push(cylY(0.9, h - wall - 2.5, h - wall + 0.01, Math.cos(a) * pr, Math.sin(a) * pr, 20));
  }
  // klein gaatje om de dop met een naald weer uit te wippen
  const pry = cylY(0.6, h - 1.2, h + 1, spec.portRecess / 2 - 1.1, 0, 16);
  return U([flange, insert, ...pins]).subtract(pry);
}

export const cellOuter = () => cell(SPEC.outerCell, true);
export const cellInner = () => cell(SPEC.innerCell, false);
export const plugOuter = () => plug(SPEC.outerCell);
export const plugInner = () => plug(SPEC.innerCell);

/* ------------------------------------------------------------------ kruizen */

/** Klemhuls om een ribbe-buis: as langs 'axis' ('x' of 'z'), opening (C-vorm) aan de onderkant. */
function sleeve(axis, center, r, L) {
  const [x, y, z] = center;
  const p0 = axis === "x" ? [x - L / 2, y, z] : [x, y, z - L / 2];
  const p1 = axis === "x" ? [x + L / 2, y, z] : [x, y, z + L / 2];
  return cylAlong(r, p0, p1, 64);
}
function sleeveCuts(axis, center, L) {
  const [x, y, z] = center;
  const cr = SPEC.tube.clip / 2;
  const op = SPEC.tube.clipOpening / 2;
  const p0 = axis === "x" ? [x - L / 2 - 1, y, z] : [x, y, z - L / 2 - 1];
  const p1 = axis === "x" ? [x + L / 2 + 1, y, z] : [x, y, z + L / 2 + 1];
  const bore = cylAlong(cr, p0, p1, 64);
  const slot =
    axis === "x"
      ? box([x - L / 2 - 1, y - 20, z - op], [x + L / 2 + 1, y, z + op])
      : box([x - op, y - 20, z - L / 2 - 1], [x + op, y, z + L / 2 + 1]);
  // invoerschuinte zodat de klem makkelijk over de buis klikt
  const lead =
    axis === "x"
      ? W.Manifold.hull([box([x - L / 2 - 1, y - cr - 3.2, z - op - 1.6], [x + L / 2 + 1, y - cr - 3.1, z + op + 1.6]), box([x - L / 2 - 1, y - cr + 0.5, z - op], [x + L / 2 + 1, y - cr + 0.6, z + op])])
      : W.Manifold.hull([box([x - op - 1.6, y - cr - 3.2, z - L / 2 - 1], [x + op + 1.6, y - cr - 3.1, z + L / 2 + 1]), box([x - op, y - cr + 0.5, z - L / 2 - 1], [x + op, y - cr + 0.6, z + L / 2 + 1])]);
  return U([bore, slot, lead]);
}

export function crossOuter() {
  const O = SPEC.outerCross;
  const H = OUTER_HALF;
  const hw = O.armW / 2;
  const add = [cylY(O.hubR, O.hubBottom, O.hubTop)];
  const cuts = [];
  const sleeves = [
    { axis: "x", c: [0, 0, H], arm: box([-hw, -O.armH / 2, O.hubR - 3], [hw, O.armH / 2, H]) },
    { axis: "x", c: [0, 0, -H], arm: box([-hw, -O.armH / 2, -H], [hw, O.armH / 2, -O.hubR + 3]) },
    { axis: "z", c: [H, 0, 0], arm: box([O.hubR - 3, -O.armH / 2, -hw], [H, O.armH / 2, hw]) },
    { axis: "z", c: [-H, 0, 0], arm: box([-H, -O.armH / 2, -hw], [-O.hubR + 3, O.armH / 2, hw]) },
  ];
  for (const s of sleeves) {
    add.push(s.arm, sleeve(s.axis, s.c, O.sleeveR, O.sleeveL));
    cuts.push(sleeveCuts(s.axis, s.c, O.sleeveL));
  }
  let part = U(add);
  part = part.subtract(box([-200, -50, -200], [200, O.hubBottom, 200])); // vlakke onderkant
  // staafgat + klemschroef M3 met moeropsluiting (diagonaal tussen twee armen)
  cuts.push(cylY(SPEC.rod.bore / 2, -50, 50));
  const d = [Math.SQRT1_2, 0, Math.SQRT1_2];
  cuts.push(cylAlong(1.7, [d[0] * 4, 2, d[2] * 4], [d[0] * (O.hubR + 2), 2, d[2] * (O.hubR + 2)], 32));
  const nut = box([-1.45, 2 - 3.05, -2.95], [1.45, O.hubTop + 1, 2.95])
    .rotate([0, -45, 0])
    .translate([d[0] * 12.5, 0, d[2] * 12.5]);
  cuts.push(nut);
  return part.subtract(U(cuts));
}

export function crossInner() {
  const I = SPEC.innerCross;
  const H = INNER_HALF;
  const hw = I.armW / 2;
  const add = [cylY(I.hubR, I.hubBottom, I.hubTop)];
  const cuts = [];
  const sleeves = [
    { axis: "x", c: [0, 0, H], arm: box([-hw, -I.armH / 2, I.hubR - 3], [hw, I.armH / 2, H]) },
    { axis: "x", c: [0, 0, -H], arm: box([-hw, -I.armH / 2, -H], [hw, I.armH / 2, -I.hubR + 3]) },
    { axis: "z", c: [H, 0, 0], arm: box([I.hubR - 3, -I.armH / 2, -hw], [H, I.armH / 2, hw]) },
    { axis: "z", c: [-H, 0, 0], arm: box([-H, -I.armH / 2, -hw], [-I.hubR + 3, I.armH / 2, hw]) },
  ];
  for (const s of sleeves) {
    add.push(s.arm, sleeve(s.axis, s.c, I.sleeveR, I.sleeveL));
    cuts.push(sleeveCuts(s.axis, s.c, I.sleeveL));
  }
  let part = U(add);
  part = part.subtract(box([-200, I.hubTop, -200], [200, 50, 200])); // vlakke bovenkant (print ondersteboven)
  // staafgat van onderen, draadgat omhoog en kabelgoot naar de voorste klemhuls
  cuts.push(cylY(SPEC.rod.bore / 2, I.hubBottom - 1, I.socketTop));
  cuts.push(cylY(2.6, I.socketTop - 0.5, I.grooveBottom + 0.5, 0, 0, 32));
  cuts.push(box([-I.grooveW / 2, I.grooveBottom, -I.grooveW / 2], [I.grooveW / 2, I.hubTop + 1, H - 2]));
  return part.subtract(U(cuts));
}

/* ------------------------------------------------------------------ voet */

export function baseShell() {
  const B = SPEC.base;
  const half = B.size / 2;
  const y0 = B.plate;
  const y1 = B.height;
  const outer = roundedSlab(half, half, B.radius, y0, y1, 0, B.chamfer);
  const inner = roundedSlab(half - B.wall, half - B.wall, B.radius - B.wall, y0 - 1, y1 - B.top, 0, 0);
  let shell = outer.subtract(inner);

  const adds = [cylY(B.bossR, y0, y1 - 1)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) adds.push(cylY(5, y0, y1 - 1, sx * B.cornerBoss, sz * B.cornerBoss, 40));
  // geleiders voor het OLED-schermpje achter de voorwand
  const O = SPEC.oled;
  const zi = half - B.wall; // binnenkant voorwand
  const pcbHalf = O.pcb[0] / 2 + 0.75;
  adds.push(box([O.x - pcbHalf - 3, 9.3, zi - 6], [O.x - pcbHalf, y1 - 1, zi + 0.5]));
  adds.push(box([O.x + pcbHalf, 9.3, zi - 6], [O.x + pcbHalf + 3, y1 - 1, zi + 0.5]));
  adds.push(box([O.x - pcbHalf - 3, 9.3, zi - 6], [O.x + pcbHalf + 3, O.y - O.pcb[1] / 2 - 0.3, zi + 0.5]));
  shell = U([shell, ...adds]);

  const cuts = [];
  // staafkoker: boring, doorvoer en zijvenster voor de draden
  cuts.push(cylY(SPEC.rod.bore / 2, B.bossStopY, y1 + 1));
  cuts.push(cylY(3.5, y0 - 1, B.bossStopY + 0.5, 0, 0, 32));
  cuts.push(box([0, y0 - 1, -4.5], [B.bossR + 2, 13, 4.5]));
  // inzetmoeren
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cuts.push(cylY(B.insertHole / 2, y0 - 1, y0 + 8, sx * B.cornerBoss, sz * B.cornerBoss, 32));
  // OLED-venster
  cuts.push(box([O.x - O.winW / 2, O.y - O.winH / 2, zi - 1], [O.x + O.winW / 2, O.y + O.winH / 2, half + 2]));
  // GX16-8 contrastekker
  const G = SPEC.gx16;
  cuts.push(cylAlong(G.hole / 2, [G.x, G.y, zi - 2], [G.x, G.y, half + 2]));
  // USB-C uitsparing in de achterwand + verdunning aan de binnenkant
  const Us = SPEC.usb;
  const corner = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) corner.push(cylAlong(2, [Us.x + sx * (Us.w / 2 - 2), Us.y + sy * (Us.h / 2 - 2), -half - 2], [Us.x + sx * (Us.w / 2 - 2), Us.y + sy * (Us.h / 2 - 2), -zi + 1], 24));
  cuts.push(W.Manifold.hull(corner));
  cuts.push(box([Us.x - 12, Us.y - 8, -half + 1.2], [Us.x + 12, Us.y + 8, -zi + 0.5]));

  shell = shell.subtract(U(cuts));
  // anti-draairib onderin de staafkoker (valt in de zaagsleuf van de staaf)
  const rib = box([-SPEC.rod.bore / 2 - 0.3, B.bossStopY, -1.7], [-4.2, B.bossStopY + SPEC.rod.slotD, 1.7]);
  return U([shell, rib]);
}

export function basePlate() {
  const B = SPEC.base;
  const half = B.size / 2;
  let plate = roundedSlab(half, half, B.radius, 0, B.plate);
  const adds = [];
  // centreerrand binnen de wanden
  const lipO = roundedSlab(half - B.wall - 0.3, half - B.wall - 0.3, B.radius - B.wall - 0.3, B.plate - 0.01, B.plate + 2);
  const lipI = roundedSlab(half - B.wall - 1.9, half - B.wall - 1.9, B.radius - B.wall - 1.9, B.plate - 1, B.plate + 3);
  adds.push(lipO.subtract(lipI));
  // breadboard-kader
  const BB = SPEC.breadboard;
  const t = 0.3;
  const rib = 1.6;
  const bx0 = BB.cx - BB.wid / 2 - t;
  const bx1 = BB.cx + BB.wid / 2 + t;
  const bz0 = BB.cz - BB.len / 2 - t;
  const bz1 = BB.cz + BB.len / 2 + t;
  adds.push(box([bx0 - rib, B.plate - 0.01, bz0 - rib], [bx1 + rib, B.plate + 4, bz1 + rib]).subtract(box([bx0, 0, bz0], [bx1, 20, bz1])));
  // zoemerhouder
  const Z = SPEC.buzzer;
  adds.push(cylY(Z.d / 2 + 1.6, B.plate - 0.01, B.plate + 5, Z.x, Z.z, 48).subtract(cylY(Z.d / 2, 0, 20, Z.x, Z.z, 48)));
  // ballastvakken
  for (const [x0, z0, x1, z1] of [
    [-72, -72, -24, -18],
    [-72, 14, -24, 62],
  ])
    adds.push(box([x0, B.plate - 0.01, z0], [x1, B.plate + 12, z1]).subtract(box([x0 + 2, 0, z0 + 2], [x1 - 2, 30, z1 - 2])));
  plate = U([plate, ...adds]);

  const cuts = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = sx * B.cornerBoss;
      const z = sz * B.cornerBoss;
      cuts.push(cylY(1.7, -1, B.plate + 3, x, z, 32));
      cuts.push(cylY(3.15, -0.01, 1.45, x, z, 32, 1.7)); // verzinking M3 verzonken kop
      cuts.push(cylY(6.25, -0.01, 0.6, sx * 70, sz * 70, 40)); // plek rubber voetje
    }
  // geluidsgaatjes onder de zoemer
  cuts.push(cylY(1, -1, B.plate + 1, Z.x, Z.z, 16));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    cuts.push(cylY(1, -1, B.plate + 1, Z.x + Math.cos(a) * 3.4, Z.z + Math.sin(a) * 3.4, 16));
  }
  return plate.subtract(U(cuts));
}

/* ------------------------------------------------------------------ controller */

function controllerLayout() {
  const C = SPEC.controller;
  const halfLen = C.length / 2;
  const r = C.width / 2;
  const pcbs = [-1, 1].map((sx) => {
    const cx = sx * (C.stickX - C.joyStickOffset);
    return { sx, cx, x0: cx - C.joyPcb[0] / 2, x1: cx + C.joyPcb[0] / 2, z0: -C.joyPcb[1] / 2, z1: C.joyPcb[1] / 2 };
  });
  const screws = [
    [-64, 0],
    [64, 0],
    [0, 24],
    [-16, -25],
    [16, -25],
  ];
  return { C, halfLen, r, pcbs, screws };
}

export function controllerBottom() {
  const { C, halfLen, r, pcbs, screws } = controllerLayout();
  const outer = stadium(halfLen, r, 0, C.split, 2, 0);
  const inner = stadium(halfLen - C.wall, r - C.wall, C.floor, C.split + 1);
  let part = outer.subtract(inner);
  const adds = [];
  // passingsrand
  const lo = stadium(halfLen - C.wall - 0.25, r - C.wall - 0.25, C.split - 1, C.split + 2.5);
  const li = stadium(halfLen - C.wall - 1.45, r - C.wall - 1.45, C.split - 2, C.split + 3);
  adds.push(lo.subtract(li));
  // steunen en hoekgeleiders voor de KY-023 printplaten
  for (const p of pcbs) {
    for (const [x, z, ix, iz] of [
      [p.x0, p.z0, 1, 1],
      [p.x1, p.z0, -1, 1],
      [p.x0, p.z1, 1, -1],
      [p.x1, p.z1, -1, -1],
    ]) {
      adds.push(box([Math.min(x, x + ix * 5), C.floor - 0.01, Math.min(z, z + iz * 5)], [Math.max(x, x + ix * 5), C.joyPcbY, Math.max(z, z + iz * 5)]));
      const gx = x - ix * 0.4;
      const gz = z - iz * 0.4;
      adds.push(box([Math.min(gx, gx - ix * 1.2), C.floor - 0.01, Math.min(gz - iz * 1.2, gz + iz * 5)], [Math.max(gx, gx - ix * 1.2), C.joyPcbY + 4, Math.max(gz - iz * 1.2, gz + iz * 5)]));
      adds.push(box([Math.min(gx - ix * 1.2, gx + ix * 5), C.floor - 0.01, Math.min(gz, gz - iz * 1.2)], [Math.max(gx - ix * 1.2, gx + ix * 5), C.joyPcbY + 4, Math.max(gz, gz - iz * 1.2)]));
    }
  }
  for (const [x, z] of screws) adds.push(cylY(3.5, C.floor - 0.01, C.split, x, z, 40));
  // trekontlasting: twee paaltjes voor een tie-wrap
  for (const sx of [-1, 1]) adds.push(box([sx * 6 - 2, C.floor - 0.01, -27], [sx * 6 + 2, 14, -23]));
  part = U([part, ...adds]);
  const cuts = [];
  for (const [x, z] of screws) {
    cuts.push(cylY(1.7, -1, C.split + 1, x, z, 32));
    cuts.push(cylY(3.1, -1, 3, x, z, 32));
  }
  cuts.push(cylAlong(3.5, [0, 11, -r - 2], [0, 11, -r + C.wall + 1], 40)); // kabeldoorvoer
  return part.subtract(U(cuts));
}

export function controllerTop() {
  const { C, halfLen, r, pcbs, screws } = controllerLayout();
  const outer = stadium(halfLen, r, C.split, C.height, 0, 3);
  const inner = stadium(halfLen - C.wall, r - C.wall, C.split - 1, C.height - C.roof);
  let part = outer.subtract(inner);
  const adds = [];
  const roofY = C.height - C.roof;
  for (const p of pcbs)
    for (const [x, z] of [
      [p.x0 + 2.5, p.z0 + 2.5],
      [p.x1 - 2.5, p.z0 + 2.5],
      [p.x0 + 2.5, p.z1 - 2.5],
      [p.x1 - 2.5, p.z1 - 2.5],
    ])
      adds.push(cylY(2, C.joyPcbY + 1.6 + 0.2, roofY + 0.5, x, z, 24));
  for (const [x, z] of screws) adds.push(cylY(3.5, C.split + 0.3, roofY + 0.5, x, z, 40));
  part = U([part, ...adds]);
  const cuts = [];
  for (const [x, z] of screws) cuts.push(cylY(1.3, C.split, roofY - 1, x, z, 24));
  for (const sx of [-1, 1]) cuts.push(cylY(C.stickHole / 2, roofY - 1, C.height + 1, sx * C.stickX, 0, 96));
  // kleine markering: linker stick = x/y (1 stip), rechter stick = z/w (2 stippen)
  cuts.push(cylY(1.2, C.height - 0.6, C.height + 1, -C.stickX, 21, 20));
  cuts.push(cylY(1.2, C.height - 0.6, C.height + 1, C.stickX - 3, 21, 20));
  cuts.push(cylY(1.2, C.height - 0.6, C.height + 1, C.stickX + 3, 21, 20));
  return part.subtract(U(cuts));
}

/* ------------------------------------------------------------------ zaagmal */

export function sawJig(lengths) {
  const x0 = -80;
  let part = box([-86, 0, -22], [x0 + 150, 16, 22]);
  const cuts = [];
  const sr = SPEC.tube.socket / 2 + 0.05;
  cuts.push(box([x0, 11, -10 - sr], [x0 + 151, 20, -10 + sr]));
  cuts.push(cylAlong(sr, [x0, 11, -10], [x0 + 151, 11, -10], 48));
  const rr = SPEC.rod.bore / 2 + 0.1;
  cuts.push(box([x0, 10, 10 - rr], [x0 + 151, 20, 10 + rr]));
  cuts.push(cylAlong(rr, [x0, 10, 10], [x0 + 151, 10, 10], 48));
  const marks = [];
  lengths.tubes.forEach((L, k) => {
    cuts.push(box([x0 + L, 3, -23], [x0 + L + 1.2, 20, 0.5]));
    for (let m = 0; m <= k; m++) marks.push(cylY(0.9, 15.4, 17, x0 + L - 4 - m * 3, -19.5, 16));
  });
  cuts.push(box([x0 + lengths.rod, 3, -0.5], [x0 + lengths.rod + 1.2, 20, 23]));
  for (let m = 0; m < 4; m++) marks.push(cylY(0.9, 15.4, 17, x0 + lengths.rod - 4 - m * 3, 19.5, 16));
  return part.subtract(U([...cuts, ...marks]));
}
