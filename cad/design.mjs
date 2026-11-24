/**
 * LICHTJES 4D — centrale ontwerpmaten.
 *
 * Eén bron van waarheid: de STL-generator (cad/build.mjs), de 3D-werkplaats (web/) en de
 * bouwhandleiding (scripts/docs.mjs) lezen allemaal deze maten. Pas je hier iets aan, draai dan
 * `npm run build` en alles (STL's, 3D-omgeving, handleiding) loopt weer gelijk.
 *
 * Eenheden: millimeter.
 * Assenstelsel van het model: X = naar rechts, Y = omhoog, Z = naar de speler (voorkant).
 * Oorsprong: op tafelhoogte, midden onder de voet.
 *
 * Spelcoördinaten (gelijk aan de 4d-puzzels app, tesseract-weergave):
 *   celindex i = x + 2·y + 4·z + 8·w
 *   x: 0 = links,  1 = rechts
 *   y: 0 = boven,  1 = onder
 *   z: 0 = voor,   1 = achter
 *   w: 0 = binnenkubus, 1 = buitenkubus
 */

export const SPEC = {
  /** Afstand hart-op-hart tussen de cellen van de buitenkubus en de binnenkubus. */
  outerEdge: 160,
  innerEdge: 84, // verhouding ≈ 1,9 : 1, net als de perspectiefprojectie in de app

  /** Cel = doorschijnend blokje met holte voor de LED. */
  outerCell: {
    size: 30, // buitenmaat kubus
    cavity: 20, // holte (kubus) in het midden
    round: 2, // afronding ribben
    wChamfer: 18.5, // afstand van het hart tot het schuine vlak voor de w-buis
    wCavity: 13.5, // afstand van het hart tot de afgeschuinde hoek van de holte
    port: 12.5, // opening voor de LED-module
    portRecess: 15, // verzinking voor de kraag van de dop
    recessDepth: 1,
  },
  innerCell: {
    size: 24,
    cavity: 15,
    round: 1.6,
    wChamfer: 13.5,
    wCavity: 9,
    port: 11.5,
    portRecess: 13.5,
    recessDepth: 1,
  },

  /** Aluminium ronde buis 8 × 1 mm voor alle 32 ribben van de tesseract. */
  tube: { od: 8, id: 6, socket: 8.3, clip: 8.2, clipOpening: 6.6 },

  /** Aluminium ronde buis 12 × 1 mm als staaf. */
  rod: { od: 12, id: 10, bore: 12.3, slotW: 4, slotD: 8 },

  /** Voet. */
  base: {
    size: 190,
    radius: 16,
    height: 48, // inclusief bodemplaat
    plate: 3,
    wall: 3,
    top: 3,
    chamfer: 4,
    bossR: 12,
    bossStopY: 14, // onderkant staaf rust hier op
    cornerBoss: 80, // positie schroefbussen (±80, ±80)
    insertHole: 4.1, // M3 inzetmoer (inslagmoer met soldeerbout)
  },

  /** Ruimte tussen bovenkant voet en de onderste cellen. */
  clearance: 45,

  /** Kruizen die de kubussen op de staaf houden (klikken om de onderste ribben). */
  outerCross: { hubR: 20, hubBottom: -6, hubTop: 10, armW: 10, armH: 12, sleeveR: 7, sleeveL: 22 },
  innerCross: {
    hubR: 13,
    hubBottom: -20,
    hubTop: 6,
    socketTop: -6, // bovenkant staafgat (staaf steekt 14 mm in de naaf)
    armW: 9,
    armH: 12,
    sleeveR: 7,
    sleeveL: 18,
    grooveW: 5,
    grooveBottom: -2.5,
  },

  /** Elektronica in de voet. */
  breadboard: { len: 82.6, wid: 54.6, h: 8.5, cx: 45.3, cz: -46.7, pitch: 2.54 },
  oled: { x: -35, y: 25.5, winW: 25, winH: 14, pcb: [27.3, 27.8] },
  gx16: { x: 45, y: 25.5, hole: 16.2 },
  usb: { x: 44.0, y: 17.2, w: 13, h: 8 },
  buzzer: { x: 8, z: 42, d: 12.4 },

  /** Handcontroller met twee KY-023 joysticks. */
  controller: {
    length: 150,
    width: 66,
    height: 30,
    split: 20, // hoogte naad onder/boven
    wall: 2,
    floor: 2.5,
    roof: 2.5,
    stickX: 44, // sticks op x = ±44
    stickHole: 30,
    joyPcb: [34, 26], // KY-023 printplaat (lengte langs X, breedte langs Z) — meet je eigen module na!
    joyStickOffset: 2.5, // stick zit 2,5 mm uit het midden, weg van de pinnen
    joyPcbY: 8, // onderkant printplaat boven de bodem
  },
};

/* ------------------------------------------------------------------ afgeleide maten */

const S = SPEC;

export const BASE_TOP = S.base.height; // 48
export const OUTER_HALF = S.outerEdge / 2; // 80
export const INNER_HALF = S.innerEdge / 2; // 42
/** Hart van de tesseract. */
export const CENTER_Y = BASE_TOP + S.clearance + OUTER_HALF + S.outerCell.size / 2; // 188
export const OUTER_CROSS_Y = CENTER_Y - OUTER_HALF; // 108
export const INNER_CROSS_Y = CENTER_Y - INNER_HALF; // 146
export const ROD_BOTTOM_Y = S.base.bossStopY; // 14
export const ROD_TOP_Y = INNER_CROSS_Y + S.innerCross.socketTop; // 140
export const ROD_LENGTH = ROD_TOP_Y - ROD_BOTTOM_Y; // 126

export const AXES = ["x", "y", "z", "w"];
export const AXIS_WORDS = ["breedte", "hoogte", "diepte", "binnen–buiten"];
export const AXIS_COLORS = ["#ff7a8a", "#5ef2b4", "#6cb8ff", "#d77bff"]; // zelfde kleuren als de app
export const COORD_WORDS = [
  ["links", "rechts"],
  ["boven", "onder"],
  ["voor", "achter"],
  ["binnen", "buiten"],
];

export function cellCoord(i) {
  return { x: i & 1, y: (i >> 1) & 1, z: (i >> 2) & 1, w: (i >> 3) & 1 };
}
export function cellIndex(x, y, z, w) {
  return x + 2 * y + 4 * z + 8 * w;
}
export function cellLabel(i) {
  const c = cellCoord(i);
  return `x${c.x} y${c.y} z${c.z} w${c.w}`;
}
export function cellWords(i) {
  const c = cellCoord(i);
  return `${COORD_WORDS[0][c.x]} · ${COORD_WORDS[1][c.y]} · ${COORD_WORDS[2][c.z]} · ${COORD_WORDS[3][c.w]}`;
}

/** Tekens (±1) van de positie t.o.v. het hart van de tesseract. */
export function cellSigns(i) {
  const c = cellCoord(i);
  return [c.x ? 1 : -1, c.y ? -1 : 1, c.z ? -1 : 1];
}

export function cellHalf(i) {
  return cellCoord(i).w ? OUTER_HALF : INNER_HALF;
}

/** Hart van cel i (mm). */
export function cellPos(i) {
  const [sx, sy, sz] = cellSigns(i);
  const h = cellHalf(i);
  return [sx * h, CENTER_Y + sy * h, sz * h];
}

export function cellSpec(i) {
  return cellCoord(i).w ? S.outerCell : S.innerCell;
}

/**
 * Rotatie (3×3, kolommen = beeld van lokale x, y, z) waarmee het geprinte celblokje op plek i komt.
 * Lokaal: insteekgaten op de −x, −y en −z vlakken, w-gat in de hoek (−,−,−) (buiten) of (+,+,+)
 * (binnen), LED-opening op het +y vlak. Altijd een echte rotatie: één STL per kubus volstaat.
 */
export function cellBasis(i) {
  const [sx, sy, sz] = cellSigns(i);
  if (sx * sy * sz > 0) {
    return [
      [sx, 0, 0],
      [0, sy, 0],
      [0, 0, sz],
    ];
  }
  return [
    [0, 0, sz],
    [0, sy, 0],
    [sx, 0, 0],
  ];
}

/* ------------------------------------------------------------------ ribben (buizen) */

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => mul(a, 1 / len(a));
export const vec = { sub, add, mul, len, norm };

/** De ketting van 16 LED's volgt een Gray-code: elke stap is precies één ribbe van de tesseract. */
export const CHAIN = [2, 3, 1, 0, 4, 5, 7, 6, 14, 15, 13, 12, 8, 9, 11, 10];
export const PIXEL_OF = (() => {
  const p = new Array(16);
  CHAIN.forEach((c, k) => (p[c] = k));
  return p;
})();

function edgeKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
const chainEdges = new Map();
for (let k = 0; k < 15; k++) chainEdges.set(edgeKey(CHAIN[k], CHAIN[k + 1]), k + 1);

/** De buis waar de voedingskabel via een geboord gat in komt (cel 2 ↔ 3, binnen, onder, voor). */
export const FEED_EDGE = edgeKey(2, 3);

export const EDGES = (() => {
  const out = [];
  for (let a = 0; a < 16; a++)
    for (let bit = 0; bit < 4; bit++) {
      const b = a ^ (1 << bit);
      if (b < a) continue;
      const pa = cellPos(a);
      const pb = cellPos(b);
      let kind;
      let start;
      let end;
      if (bit < 3) {
        kind = cellCoord(a).w ? "outer" : "inner";
        const cav = cellSpec(a).cavity / 2;
        const d = norm(sub(pb, pa));
        start = add(pa, mul(d, cav));
        end = sub(pb, mul(d, cav));
      } else {
        kind = "w";
        // a = binnen (w0), b = buiten (w1)
        const d = norm(sub(pb, pa));
        start = add(pa, mul(d, S.innerCell.wCavity));
        end = sub(pb, mul(d, S.outerCell.wCavity));
      }
      const key = edgeKey(a, b);
      out.push({
        id: key,
        a,
        b,
        axis: bit,
        kind,
        start,
        end,
        length: +len(sub(end, start)).toFixed(2),
        chainStep: chainEdges.get(key) || 0, // 0 = leeg (alleen constructie)
        feed: key === FEED_EDGE,
      });
    }
  return out;
})();

export const TUBE_LENGTHS = {
  outer: +(S.outerEdge - S.outerCell.cavity).toFixed(2), // 140
  inner: +(S.innerEdge - S.innerCell.cavity).toFixed(2), // 69
  w: EDGES.find((e) => e.kind === "w").length, // 43.32
};

/** Zaagplan voor staven van 1 meter (zaagsnede ~1,5 mm). */
export const CUT_PLAN = [
  { bar: "Buis 8×1 — staaf 1", pieces: [["outer", 6], ["inner", 2]] },
  { bar: "Buis 8×1 — staaf 2", pieces: [["outer", 6], ["inner", 2]] },
  { bar: "Buis 8×1 — staaf 3", pieces: [["inner", 8], ["w", 8]] },
  { bar: "Buis 12×1 — staaf 4", pieces: [["rod", 1]] },
];

/* ------------------------------------------------------------------ bedradingspad voeding */

/** Breadboard-gat → 3D-positie in de voet (bovenkant breadboard). */
export function breadboardHole(row, col) {
  const B = S.breadboard;
  const p = B.pitch;
  const cols = { a: -13.97, b: -11.43, c: -8.89, d: -6.35, e: -3.81, f: 3.81, g: 6.35, h: 8.89, i: 11.43, j: 13.97 };
  const rails = { "-": -19.4, "+": -21.94, "-R": 19.4, "+R": 21.94 };
  const v = col in cols ? cols[col] : rails[col];
  const u = (row - 15.5) * p;
  return [B.cx + v, S.base.plate + B.h, B.cz + u];
}

/** Nano-pinnen: [rij, kolom] op het breadboard (USB-C naar de achterwand). */
export const NANO_PINS = {
  D13: [1, "c"], "3V3": [2, "c"], REF: [3, "c"], A0: [4, "c"], A1: [5, "c"], A2: [6, "c"], A3: [7, "c"],
  A4: [8, "c"], A5: [9, "c"], A6: [10, "c"], A7: [11, "c"], "5V": [12, "c"], RST: [13, "c"], GND: [14, "c"], VIN: [15, "c"],
  D12: [1, "g"], D11: [2, "g"], D10: [3, "g"], D9: [4, "g"], D8: [5, "g"], D7: [6, "g"], D6: [7, "g"], D5: [8, "g"],
  D4: [9, "g"], D3: [10, "g"], D2: [11, "g"], GND2: [12, "g"], RST2: [13, "g"], RX0: [14, "g"], TX1: [15, "g"],
};

/** Pin-toewijzing (gelijk aan de firmware). */
export const PINS = {
  LED_DATA: "D6",
  BUZZER: "D9",
  SW_L: "D2",
  SW_R: "D3",
  L_X: "A0",
  L_Y: "A1",
  R_X: "A2",
  R_Y: "A3",
  SDA: "A4",
  SCL: "A5",
};

/** GX16-8 stekker tussen voet en controller, met kleuren van een Cat5-kabel (T568B). */
export const GX16_PINS = [
  { pin: 1, signal: "5V", color: "oranje", hex: "#f08a24", nano: "5V (+ rail)" },
  { pin: 2, signal: "GND", color: "bruin", hex: "#6b4426", nano: "GND (− rail)" },
  { pin: 3, signal: "Links X", color: "wit-groen", hex: "#9fd8a8", nano: "A0" },
  { pin: 4, signal: "Links Y", color: "groen", hex: "#2e9d4c", nano: "A1" },
  { pin: 5, signal: "Links druk (SW)", color: "wit-oranje", hex: "#f7c79a", nano: "D2" },
  { pin: 6, signal: "Rechts X", color: "wit-blauw", hex: "#a9c4f0", nano: "A2" },
  { pin: 7, signal: "Rechts Y", color: "blauw", hex: "#2f62c9", nano: "A3" },
  { pin: 8, signal: "Rechts druk (SW)", color: "wit-bruin", hex: "#c9b29a", nano: "D3" },
];

/** Aansluittabel op het breadboard (stap voor stap). */
export const BREADBOARD_WIRING = [
  { from: "Nano 5V (c12)", to: "+ rail (rij 12)", hole: [12, "b"], rail: [12, "+"], color: "#e53935", what: "5V naar de plus-rail" },
  { from: "Nano GND (c14)", to: "− rail (rij 14)", hole: [14, "b"], rail: [14, "-"], color: "#222222", what: "GND naar de min-rail" },
  { from: "D6 (h7)", to: "weerstand 330 Ω → h20", hole: [7, "h"], rail: [20, "h"], color: "resistor", what: "LED-data via 330 Ω" },
  { from: "i20", to: "LED-kabel geel (DATA)", hole: [20, "i"], color: "#f2c200", what: "data naar LED 0" },
  { from: "+ rail (rij 22)", to: "LED-kabel rood (5V)", hole: [22, "+"], color: "#e53935", what: "voeding LED's" },
  { from: "− rail (rij 22)", to: "LED-kabel zwart (GND)", hole: [22, "-"], color: "#222222", what: "massa LED's" },
  { from: "+ rail (rij 25)", to: "elco 1000 µF (+)", hole: [25, "+"], rail: [25, "-"], color: "cap", what: "buffercondensator over de voeding" },
  { from: "A0 (a4)", to: "GX16 pin 3", hole: [4, "a"], color: "#9fd8a8", what: "linker stick X" },
  { from: "A1 (a5)", to: "GX16 pin 4", hole: [5, "a"], color: "#2e9d4c", what: "linker stick Y" },
  { from: "A2 (a6)", to: "GX16 pin 6", hole: [6, "a"], color: "#a9c4f0", what: "rechter stick X" },
  { from: "A3 (a7)", to: "GX16 pin 7", hole: [7, "a"], color: "#2f62c9", what: "rechter stick Y" },
  { from: "D2 (h11)", to: "GX16 pin 5", hole: [11, "h"], color: "#f7c79a", what: "linker stick indrukken" },
  { from: "D3 (h10)", to: "GX16 pin 8", hole: [10, "h"], color: "#c9b29a", what: "rechter stick indrukken" },
  { from: "+ rail (rij 28)", to: "GX16 pin 1", hole: [28, "+"], color: "#f08a24", what: "5V naar controller" },
  { from: "− rail (rij 28)", to: "GX16 pin 2", hole: [28, "-"], color: "#6b4426", what: "GND naar controller" },
  { from: "A4 (a8)", to: "OLED SDA", hole: [8, "a"], color: "#7e57c2", what: "I²C data scherm" },
  { from: "A5 (a9)", to: "OLED SCL", hole: [9, "a"], color: "#26a69a", what: "I²C klok scherm" },
  { from: "+ rail (rij 3)", to: "OLED VCC", hole: [3, "+"], color: "#e53935", what: "voeding scherm" },
  { from: "− rail (rij 3)", to: "OLED GND", hole: [3, "-"], color: "#222222", what: "massa scherm" },
  { from: "D9 (h4)", to: "buzzer +", hole: [4, "h"], color: "#ff7043", what: "piëzo-zoemer" },
  { from: "− rail (rij 18)", to: "buzzer −", hole: [18, "-"], color: "#222222", what: "massa zoemer" },
];

/** Pad van de voedingskabel (3 aders) van het breadboard naar LED 0 in cel 2. */
export function feedPath() {
  const feedTube = EDGES.find((e) => e.feed);
  const mid = mul(add(feedTube.start, feedTube.end), 0.5);
  const cell2 = cellPos(2);
  return [
    breadboardHole(20, "i"),
    [breadboardHole(20, "i")[0] - 4, 14, breadboardHole(20, "i")[2] + 6],
    [14, 8, 0],
    [0, 8, 0],
    [0, ROD_BOTTOM_Y + 2, 0],
    [0, ROD_TOP_Y, 0],
    [0, INNER_CROSS_Y + S.innerCross.grooveBottom + 1.5, 0],
    [0, INNER_CROSS_Y + 1, mid[2] - 6],
    [mid[0], mid[1], mid[2] - 2],
    [mid[0] - 8, mid[1], mid[2]],
    [cell2[0] + 10, cell2[1], cell2[2]],
    cell2,
  ];
}

/** Stroombudget (mA) — gebruikt in de handleiding. */
export const POWER = {
  ledMaxPerPixel: 60,
  colorFactor: (255 + 209 + 102) / 765, // warmgeel #ffd166
  brightnessCap: 160 / 255,
  levelOn: 70 / 255,
};
