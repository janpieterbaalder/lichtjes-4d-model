/**
 * Bouwt alle 3D-printonderdelen en schrijft:
 *   stl/*.stl            — printklaar, in printoriëntatie (Z omhoog, op het bed)
 *   app/parts.js         — dezelfde geometrie voor de 3D-werkplaats (montage-oriëntatie)
 *   cad/rapport.json     — volume, gewicht, afmetingen per onderdeel
 *
 * Gebruik: npm run stl
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initCAD,
  cellOuter,
  cellInner,
  plugOuter,
  plugInner,
  crossOuter,
  crossInner,
  baseShell,
  basePlate,
  controllerBottom,
  controllerTop,
  sawJig,
} from "./parts.mjs";
import { TUBE_LENGTHS, ROD_LENGTH } from "./design.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PETG = 1.27; // g/cm³

/** fill = geschatte vulgraad van het geprinte volume (wanden + infill). */
export const PRINT_PARTS = [
  { id: "cell-outer", file: "cel-buiten.stl", build: cellOuter, flip: true, count: 8, fill: 1.0 },
  { id: "cell-inner", file: "cel-binnen.stl", build: cellInner, flip: false, count: 8, fill: 1.0 },
  { id: "plug-outer", file: "dop-buiten.stl", build: plugOuter, flip: true, count: 8, fill: 1.0 },
  { id: "plug-inner", file: "dop-binnen.stl", build: plugInner, flip: true, count: 8, fill: 1.0 },
  { id: "cross-outer", file: "buitenkruis.stl", build: crossOuter, flip: false, count: 1, fill: 0.75 },
  { id: "cross-inner", file: "binnenkruis.stl", build: crossInner, flip: true, count: 1, fill: 0.8 },
  { id: "base-shell", file: "voet-behuizing.stl", build: baseShell, flip: true, count: 1, fill: 0.55 },
  { id: "base-plate", file: "voet-bodemplaat.stl", build: basePlate, flip: false, count: 1, fill: 0.7 },
  { id: "ctrl-bottom", file: "controller-onder.stl", build: controllerBottom, flip: false, count: 1, fill: 0.55 },
  { id: "ctrl-top", file: "controller-boven.stl", build: controllerTop, flip: true, count: 1, fill: 0.55 },
  {
    id: "saw-jig",
    file: "zaagmal.stl",
    build: () => sawJig({ tubes: [TUBE_LENGTHS.w, TUBE_LENGTHS.inner, TUBE_LENGTHS.outer], rod: ROD_LENGTH }),
    flip: false,
    count: 1,
    fill: 0.35,
  },
];

function meshArrays(manifold) {
  const m = manifold.getMesh();
  const np = m.numProp;
  const nv = m.vertProperties.length / np;
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    pos[i * 3] = m.vertProperties[i * np];
    pos[i * 3 + 1] = m.vertProperties[i * np + 1];
    pos[i * 3 + 2] = m.vertProperties[i * np + 2];
  }
  return { pos, idx: new Uint32Array(m.triVerts) };
}

function stlBinary({ pos, idx }) {
  const nt = idx.length / 3;
  const buf = Buffer.alloc(84 + nt * 50);
  buf.write("LICHTJES 4D - gegenereerd door cad/build.mjs (mm)", 0, "ascii");
  buf.writeUInt32LE(nt, 80);
  let o = 84;
  for (let t = 0; t < nt; t++) {
    const a = idx[t * 3] * 3;
    const b = idx[t * 3 + 1] * 3;
    const c = idx[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const v of [nx, ny, nz, pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2], pos[c], pos[c + 1], pos[c + 2]]) {
      buf.writeFloatLE(v, o);
      o += 4;
    }
    buf.writeUInt16LE(0, o);
    o += 2;
  }
  return buf;
}

const b64 = (typed) => Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength).toString("base64");

async function main() {
  await initCAD();
  mkdirSync(join(root, "stl"), { recursive: true });
  mkdirSync(join(root, "app"), { recursive: true });
  const web = {};
  const report = [];
  for (const p of PRINT_PARTS) {
    const t0 = Date.now();
    const part = p.build();
    const asm = meshArrays(part);
    web[p.id] = { p: b64(asm.pos), i: b64(asm.idx) };

    let printed = p.flip ? part.rotate([180, 0, 0]) : part;
    printed = printed.rotate([90, 0, 0]); // Y-omhoog → Z-omhoog (slicer)
    const bb = printed.boundingBox();
    printed = printed.translate([-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, -bb.min[2]]);
    const bb2 = printed.boundingBox();
    writeFileSync(join(root, "stl", p.file), stlBinary(meshArrays(printed)));

    const vol = part.volume();
    const grams = (vol / 1000) * PETG * p.fill;
    const size = [0, 1, 2].map((k) => +(bb2.max[k] - bb2.min[k]).toFixed(1));
    report.push({
      id: p.id,
      file: `stl/${p.file}`,
      count: p.count,
      triangles: asm.idx.length / 3,
      volume_cm3: +(vol / 1000).toFixed(2),
      grams_each: +grams.toFixed(1),
      grams_total: +(grams * p.count).toFixed(1),
      print_size_mm: size,
      genus: part.genus(),
    });
    console.log(`${p.file.padEnd(24)} ${String(asm.idx.length / 3).padStart(6)} drieh.  ${size.join(" × ").padEnd(22)} ${grams.toFixed(1).padStart(6)} g  (${Date.now() - t0} ms)`);
  }
  writeFileSync(join(root, "app", "parts.js"), `/* gegenereerd door cad/build.mjs — niet met de hand wijzigen */\nwindow.LICHTJES_PARTS=${JSON.stringify(web)};\n`);
  writeFileSync(join(root, "cad", "rapport.json"), JSON.stringify(report, null, 2) + "\n");
  mkdirSync(join(root, "web", "src", "generated"), { recursive: true });
  writeFileSync(join(root, "web", "src", "generated", "report.js"), `/* gegenereerd door cad/build.mjs */\nexport default ${JSON.stringify(report)};\n`);
  const total = report.reduce((s, r) => s + r.grams_total, 0);
  console.log(`\nTotaal filament ≈ ${total.toFixed(0)} g`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
