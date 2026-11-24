/**
 * Controleert de spellogica (gelijk aan de firmware) en de ontwerpmaten.
 * Gebruik: npm test
 */
import assert from "node:assert/strict";
import { Lichtjes4D, popcount, CHAIN } from "../web/src/sim.js";
import { EDGES, cellPos, cellBasis, TUBE_LENGTHS, ROD_LENGTH, CENTER_Y } from "../cad/design.mjs";

let n = 0;
const ok = (name) => console.log(`  ✓ ${name}`) || n++;

// 1. Drukmatrix is zijn eigen inverse: twee keer 'oplossing' toepassen geeft de stand terug
{
  const g = new Lichtjes4D();
  for (let L = 0; L < 1 << 16; L++) {
    const sol = g.solution(L);
    let x = L;
    for (let c = 0; c < 16; c++) if ((sol >> c) & 1) x ^= g.pressMask(c);
    if (x !== 0) assert.fail(`stand ${L} niet opgelost`);
  }
  ok("alle 65 536 standen zijn oplosbaar met de berekende oplossing");
}

// 2. Puzzels per level: minimaal aantal drukken = level + 2
{
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);
  const g = new Lichtjes4D({ random: rnd });
  for (let level = 1; level <= 8; level++) {
    g.level = level;
    for (let i = 0; i < 200; i++) {
      g.newPuzzle(0);
      assert.equal(g.par, Math.min(level + 2, 10));
      assert.ok(g.lights !== 0);
    }
  }
  ok("puzzels per level hebben precies level+2 minimale drukken");
}

// 3. Spelen tot het einde via hints
{
  const g = new Lichtjes4D({ random: Math.random });
  g.newPuzzle(0);
  let t = 0;
  let guard = 0;
  while (g.mode === "play" && guard++ < 50) {
    g.hint((t += 100));
    g.press((t += 100));
  }
  assert.equal(g.mode, "won");
  assert.equal(g.level, 2);
  ok("met hints wordt elke puzzel opgelost; level gaat omhoog");
}

// 4. Knoppen-toestandsmachine
{
  const g = new Lichtjes4D();
  g.newPuzzle(0);
  const before = g.lights;
  g.setButton("L", true, 1000);
  g.setButton("L", false, 1200);
  assert.notEqual(g.lights, before);
  assert.equal(g.presses, 1);
  g.setButton("R", true, 2000);
  g.tick(2900);
  g.setButton("R", false, 3000);
  assert.equal(g.hints, 1);
  assert.equal(g.presses, 1);
  g.setButton("L", true, 4000);
  g.setButton("R", true, 4050);
  g.tick(5600);
  g.setButton("L", false, 5700);
  g.setButton("R", false, 5700);
  assert.equal(g.presses, 0);
  ok("kort = drukken, 0,8 s = hint, beide 1,5 s = nieuwe puzzel");
}

// 5. Ketting volgt ribben (Gray-code)
{
  for (let k = 0; k < 15; k++) assert.equal(popcount(CHAIN[k] ^ CHAIN[k + 1]), 1);
  assert.equal(new Set(CHAIN).size, 16);
  assert.equal(EDGES.filter((e) => e.chainStep).length, 15);
  ok("ketting van 16 LED's loopt over 15 ribben, elke cel één keer");
}

// 6. Ontwerpmaten
{
  assert.equal(EDGES.length, 32);
  assert.equal(TUBE_LENGTHS.outer, 140);
  assert.equal(TUBE_LENGTHS.inner, 69);
  assert.ok(Math.abs(TUBE_LENGTHS.w - 43.32) < 0.01);
  assert.equal(ROD_LENGTH, 126);
  assert.equal(CENTER_Y, 188);
  for (let i = 0; i < 16; i++) {
    const B = cellBasis(i);
    const det =
      B[0][0] * (B[1][1] * B[2][2] - B[2][1] * B[1][2]) - B[1][0] * (B[0][1] * B[2][2] - B[2][1] * B[0][2]) + B[2][0] * (B[0][1] * B[1][2] - B[1][1] * B[0][2]);
    assert.equal(det, 1, `cel ${i} heeft een spiegeling nodig`);
    // insteekgat −lokale as wijst naar de buurcel
    const p = cellPos(i);
    for (let a = 0; a < 3; a++) {
      const dir = B[a].map((v) => -v);
      const target = [p[0] + dir[0] * 10, p[1] + dir[1] * 10, p[2] + dir[2] * 10];
      const center = [0, CENTER_Y, 0];
      assert.ok(Math.hypot(...target.map((v, k) => v - center[k])) < Math.hypot(...p.map((v, k) => v - center[k])), `cel ${i} as ${a} wijst niet naar binnen`);
    }
  }
  ok("32 ribben, buislengtes 140 / 69 / 43,32 mm, staaf 126 mm, alle cellen zonder spiegeling");
}

console.log(`\n${n} tests geslaagd.`);
