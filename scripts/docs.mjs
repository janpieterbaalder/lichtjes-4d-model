/**
 * Schrijft docs/BOUWHANDLEIDING.md uit dezelfde inhoud als de 3D-werkplaats (web/src/content.js).
 * Gebruik: npm run docs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as C from "../web/src/content.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const eur = (n) => (n ? `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}` : "—");
const L = [];
const p = (s = "") => L.push(s);
const table = (head, rows) => {
  p(`| ${head.join(" | ")} |`);
  p(`| ${head.map(() => "---").join(" | ")} |`);
  for (const r of rows) p(`| ${r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`);
  p();
};

p("# Lichtjes 4D — bouwhandleiding");
p();
p("> Automatisch gegenereerd uit `web/src/content.js` en `cad/design.mjs` (`npm run docs`). Open `index.html` voor de 3D-werkplaats met dezelfde stappen, interactief.");
p();
p("Een echte, speelbare versie van de 2×2×2×2 **Lichtjes**-puzzel (Lights Out) uit de 4d-puzzels app: 16 lichtgevende cellen op de hoekpunten van een binnen- en een buitenkubus (tesseract-weergave), één staaf, een voet met Arduino Nano en een controller met twee duimsticks.");
p();
p("## In het kort");
p();
table(
  ["", ""],
  [
    ["Hoogte", `${Math.round(C.CENTER_Y + 95)} mm`],
    ["Voet", `${C.SPEC.base.size} × ${C.SPEC.base.size} × ${C.SPEC.base.height} mm`],
    ["Buitenkubus / binnenkubus", `${C.SPEC.outerEdge} / ${C.SPEC.innerEdge} mm hart-op-hart`],
    ["Cellen", `${C.SPEC.outerCell.size} mm (buiten) en ${C.SPEC.innerCell.size} mm (binnen), doorschijnend PETG`],
    ["Ribben", `32 × aluminium buis 8 × 1 mm + staaf 12 × 1 mm`],
    ["Elektronica", "Arduino Nano, 16 × WS2812B, 2 × KY-023, OLED 0,96\", zoemer"],
    ["Kosten", `± ${eur(Math.round(C.BOM_TOTAL))} zonder gereedschap`],
    ["Printtijd / filament", `± ${Math.round(C.FILAMENT.hours)} uur · ${Math.round(C.FILAMENT.dark)} g zwart + ${Math.round(C.FILAMENT.light)} g naturel`],
  ],
);
p("## Fasen");
p();
C.PHASES.forEach((ph, i) => p(`${i + 1}. **${ph.name}** (${ph.days}, ± ${ph.hours} u) — ${ph.text}`));
p();
p("## Zo zit 4D in het object");
p();
p("Elke cel heeft vier coördinaten x, y, z, w (0 of 1). Celnummer = x + 2·y + 4·z + 8·w, net als in de app.");
p();
table(["As", "Stick", "Betekenis"], C.AXIS_HELP.map((a) => [a.axis, a.stick, a.values]));
p("Elke cel heeft vier buren (één per as). Een druk wisselt de cel en de vier buren. Voor de tesseract is de drukmatrix zijn eigen inverse: elke stand is oplosbaar en de oplossing is uniek.");
p();

p("## Te printen onderdelen");
p();
table(
  ["Onderdeel", "Aantal", "Materiaal", "Oriëntatie", "Instellingen", "Gewicht", "Tijd*", "Bestand"],
  C.PRINTED.map((x) => [x.name, x.qty, x.material, x.orient, x.settings, `${Math.round(x.gramsTotal)} g`, `${x.hours.toFixed(1)} u`, `\`${x.file}\``]),
);
p("\\* indicatie bij ± 12 g per uur.");
p();
for (const x of C.PRINTED) p(`- **${x.name}** — ${x.purpose}`);
p();
p("## Inkooplijst");
p();
for (const g of [...new Set(C.BOM.map((b) => b.group))]) {
  p(`### ${g}`);
  p();
  table(["Aantal", "Onderdeel", "Prijs (indicatie)", "Waar"], C.BOM.filter((b) => b.group === g).map((b) => [b.qty, b.name + (b.note ? ` (${b.note})` : ""), eur(b.price), b.where]));
}
p(`**Totaal ± ${eur(Math.round(C.BOM_TOTAL))}**`);
p();
p("## Gereedschap");
p();
for (const t of C.TOOLS) p(`- ${t}`);
p();
p("## Zaagplan");
p();
table(["Aantal", "Lengte", "Wat", "Materiaal", "Opmerking"], C.TUBES.map((t) => [t.qty, C.mm(t.len), t.name, t.stock, t.note || ""]));
table(["Staaf", "Stukken"], C.CUTS.map((c) => [c.bar, c.pieces]));
p("## Draden (ketting)");
p();
p("Per segment drie siliconen aders 26 AWG: **rood = 5V, zwart = GND, geel = DATA**, 50 mm extra per kant.");
p();
table(
  ["Segment", "Van → naar", "Buis", "Draadlengte"],
  [...C.SEGMENTS.map((s) => [`S${s.n}`, `LED ${s.ledFrom} (cel ${s.from}) → LED ${s.ledTo} (cel ${s.to})`, `${s.kind === "outer" ? "buitenribbe" : s.kind === "inner" ? "binnenribbe" : "w-ribbe"} ${C.mm(s.tube)}${s.feed ? " (buis V)" : ""}`, `${s.wire} mm`]), ["V", "breadboard → LED 0 (via staaf en binnenkruis)", "—", `${C.FEED_WIRE} mm`]],
);

p("## Bouwstappen");
p();
C.STEPS.forEach((s, i) => {
  const ph = C.PHASES.find((x) => x.id === s.phase);
  p(`### ${i + 1}. ${s.title}`);
  p();
  p(`*Fase: ${ph?.name}*`);
  p();
  p(s.intro);
  p();
  p("**Doen**");
  p();
  s.do.forEach((d, k) => p(`${k + 1}. ${d}`));
  p();
  if (s.check) {
    p("**Controle**");
    p();
    s.check.forEach((d) => p(`- [ ] ${d}`));
    p();
  }
  if (s.tips) {
    p("**Let op**");
    p();
    s.tips.forEach((d) => p(`- ⚠️ ${d}`));
    p();
  }
});

p("## Elektronica");
p();
p("### Pinnen van de Nano");
p();
table(
  ["Pin", "Functie"],
  [
    ["D6", "LED-data → 330 Ω → DIN van LED 0"],
    ["D2", "linker stick indrukken (SW, interne pull-up)"],
    ["D3", "rechter stick indrukken (SW, interne pull-up)"],
    ["A0 / A1", "linker stick X / Y"],
    ["A2 / A3", "rechter stick X (→ w) / Y (→ z)"],
    ["A4 / A5", "OLED SDA / SCL (I²C 0x3C)"],
    ["D9", "passieve zoemer"],
    ["5V / GND", "+ en − rail"],
  ],
);
p("### Breadboard, verbinding voor verbinding");
p();
p("Nano in rij 1–15, pinnen in kolom **c** (D13, 3V3, REF, A0…A7, 5V, RST, GND, VIN) en **g** (D12…D2, GND, RST, RX0, TX1). USB-C bij rij 1, tegen de achterwand. Controleer de opdruk op jouw Nano.");
p();
table(["#", "Van", "Naar", "Waarvoor"], C.BREADBOARD_WIRING.map((w, i) => [i + 1, w.from, w.to, w.what]));
p("### GX16-8 en controllerkabel (Cat5, T568B-kleuren)");
p();
table(["Pin", "Kleur", "Signaal", "Nano"], C.GX16_PINS.map((g) => [g.pin, g.color, g.signal, g.nano]));
p("### LED-ketting");
p();
table(["LED", "Cel", "Coördinaten", "Plek"], C.CHAIN_TABLE.map((c) => [c.led, c.cell, c.label, c.words]));
p("### Stroombudget");
p();
p("Per LED max. ± 28 mA (warmgeel, helderheid begrensd op 160/255). Tijdens spelen ± 75 mA, win-animatie < 200 mA: een USB-lader of powerbank volstaat.");
p();
p("## Firmware");
p();
p("- Code: `firmware/lichtjes4d/lichtjes4d.ino`");
p("- Bibliotheken: Adafruit NeoPixel, Adafruit SSD1306 (+ Adafruit GFX Library, Adafruit BusIO)");
p("- Board: Arduino Nano, processor *ATmega328P (Old Bootloader)* bij de meeste klonen");
p("- Seriële monitor 115200 baud: `a/d` x · `w/s` y · `i/k` z · `j/l` w · spatie = druk · `h` hint · `n` nieuw · `r` opnieuw · `c` bord");
p("- Kalibratie: houd beide sticks ingedrukt tijdens het aanzetten en volg het schermpje (LINKS >, LINKS ^, RECHTS ^, RECHTS >).");
p();
p("### Wokwi");
p();
p("Nieuw Arduino Nano-project op wokwi.com → plak `wokwi/sketch.ino`, `wokwi/diagram.json` en `wokwi/libraries.txt` → ▶.");
p();
p("## Zelf aanpassen");
p();
p("Alle maten staan in `cad/design.mjs`. Na een wijziging: `npm install` (eenmalig) en `npm run build` — dat maakt opnieuw de STL's, de 3D-werkplaats, het Wokwi-project en deze handleiding. `npm test` controleert de spellogica en de maten.");
p();

mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs", "BOUWHANDLEIDING.md"), L.join("\n"));
console.log(`docs/BOUWHANDLEIDING.md (${L.length} regels)`);
