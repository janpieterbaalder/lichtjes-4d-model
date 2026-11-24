/**
 * Maakt het Wokwi-project in wokwi/: sketch.ino (= de echte firmware), diagram.json en libraries.txt.
 * In Wokwi: New Project → Arduino Nano → plak de drie bestanden → ▶.
 */
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAIN, cellCoord } from "../cad/design.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "wokwi");
mkdirSync(out, { recursive: true });
copyFileSync(join(root, "firmware", "lichtjes4d", "lichtjes4d.ino"), join(out, "sketch.ino"));
writeFileSync(join(out, "libraries.txt"), "# Wokwi Library List\nAdafruit NeoPixel\nAdafruit SSD1306\nAdafruit GFX Library\nAdafruit BusIO\n");

const parts = [
  { type: "wokwi-arduino-nano", id: "nano", top: 120, left: -40, attrs: {} },
  { type: "wokwi-analog-joystick", id: "joyL", top: 330, left: -130, attrs: { bounce: "0" } },
  { type: "wokwi-analog-joystick", id: "joyR", top: 330, left: 60, attrs: { bounce: "0" } },
  { type: "board-ssd1306", id: "oled", top: -40, left: -60, attrs: { i2cAddress: "0x3c" } },
  { type: "wokwi-buzzer", id: "bz", top: -60, left: 120, attrs: { volume: "0.1" } },
  { type: "wokwi-resistor", id: "r1", top: 70, left: 220, attrs: { value: "330" } },
];
// 16 pixels als vier bordjes van 2×2 (kolom = w: binnen | buiten, rij = z: voor | achter), zelfde als het OLED-kaartje
for (let c = 0; c < 16; c++) {
  const { x, y, z, w } = cellCoord(c);
  parts.push({ type: "wokwi-neopixel", id: `led${c}`, top: 20 + z * 150 + y * 55, left: 330 + w * 150 + x * 55, attrs: {} });
}

const con = (a, b, color = "green") => [a, b, color, []];
const connections = [
  con("joyL:VCC", "nano:5V", "red"),
  con("joyL:GND", "nano:GND.1", "black"),
  con("joyL:HORZ", "nano:A0", "orange"),
  con("joyL:VERT", "nano:A1", "orange"),
  con("joyL:SEL", "nano:2", "blue"),
  con("joyR:VCC", "nano:5V", "red"),
  con("joyR:GND", "nano:GND.1", "black"),
  con("joyR:HORZ", "nano:A2", "violet"),
  con("joyR:VERT", "nano:A3", "violet"),
  con("joyR:SEL", "nano:3", "blue"),
  con("oled:VCC", "nano:5V", "red"),
  con("oled:GND", "nano:GND.2", "black"),
  con("oled:SDA", "nano:A4", "purple"),
  con("oled:SCL", "nano:A5", "cyan"),
  con("bz:2", "nano:9", "orange"),
  con("bz:1", "nano:GND.2", "black"),
  con("nano:6", "r1:1", "gold"),
  con("r1:2", `led${CHAIN[0]}:DIN`, "gold"),
  con(`led${CHAIN[0]}:VDD`, "nano:5V", "red"),
  con(`led${CHAIN[0]}:VSS`, "nano:GND.2", "black"),
];
for (let k = 1; k < 16; k++) {
  const a = `led${CHAIN[k - 1]}`;
  const b = `led${CHAIN[k]}`;
  connections.push(con(`${a}:DOUT`, `${b}:DIN`, "gold"));
  connections.push(con(`${a}:VDD`, `${b}:VDD`, "red"));
  connections.push(con(`${a}:VSS`, `${b}:VSS`, "black"));
}

const diagram = { version: 1, author: "Lichtjes 4D", editor: "wokwi", parts, connections, dependencies: {} };
writeFileSync(join(out, "diagram.json"), JSON.stringify(diagram, null, 2) + "\n");
console.log(`wokwi/: sketch.ino, diagram.json (${parts.length} onderdelen, ${connections.length} verbindingen), libraries.txt`);
