/**
 * Inhoud van het bouwplan: onderdelen, inkooplijst, printinstellingen, zaagplan en bouwstappen.
 * Wordt gebruikt door de 3D-werkplaats én door scripts/docs.mjs (BOUWHANDLEIDING.md).
 */
import {
  SPEC,
  TUBE_LENGTHS,
  ROD_LENGTH,
  CHAIN,
  EDGES,
  CENTER_Y,
  BASE_TOP,
  OUTER_CROSS_Y,
  cellLabel,
  cellWords,
  cellCoord,
  GX16_PINS,
  BREADBOARD_WIRING,
  PINS,
} from "../../cad/design.mjs";
import REPORT from "./generated/report.js";

const fmt = (n, d = 1) => n.toLocaleString("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });
export const mm = (n) => `${fmt(n, n % 1 ? 1 : 0)} mm`;

/* ------------------------------------------------------------------ geprinte onderdelen */

const rep = Object.fromEntries(REPORT.map((r) => [r.id, r]));
const GRAMS_PER_HOUR = 12; // indicatie voor een gemiddelde printer met 0,4 mm nozzle

export const PRINTED = [
  {
    id: "cell-outer",
    name: "Cel buitenkubus",
    qty: 8,
    material: "PETG naturel/transparant (of PLA wit)",
    color: "#f3ede2",
    orient: "LED-opening naar beneden (zo staat de STL al)",
    settings: "0,2 mm laag · 3 wanden · 100% infill · geen support",
    purpose: "Doorschijnend blokje op een hoekpunt van de buitenkubus. In de holte zit de LED; 3 insteekgaten voor de ribben en een schuin gat voor de w-buis.",
  },
  {
    id: "cell-inner",
    name: "Cel binnenkubus",
    qty: 8,
    material: "PETG naturel/transparant (of PLA wit)",
    color: "#f3ede2",
    orient: "LED-opening naar boven (zo staat de STL al)",
    settings: "0,2 mm laag · 3 wanden · 100% infill · geen support",
    purpose: "Kleiner blokje voor de binnenkubus. Het schuine gat voor de w-buis wijst naar buiten.",
  },
  {
    id: "plug-outer",
    name: "Dop buitencel",
    qty: 8,
    material: "zelfde als de cellen",
    color: "#f3ede2",
    orient: "kraag op het bed",
    settings: "0,2 mm · 100% infill",
    purpose: "Sluit de LED-opening. De LED-module rust op de drie pennetjes, LED naar binnen gericht.",
  },
  {
    id: "plug-inner",
    name: "Dop binnencel",
    qty: 8,
    material: "zelfde als de cellen",
    color: "#f3ede2",
    orient: "kraag op het bed",
    settings: "0,2 mm · 100% infill",
    purpose: "Dop voor de kleinere binnencellen.",
  },
  {
    id: "cross-outer",
    name: "Buitenkruis",
    qty: 1,
    material: "PETG zwart",
    color: "#1d1f24",
    orient: "plat, zoals de STL",
    settings: "0,2 mm · 4 wanden · 40% infill · geen support",
    purpose: "Klikt met vier C-klemmen om de onderste ribben van de buitenkubus en klemt met een M3-bout op de staaf.",
  },
  {
    id: "cross-inner",
    name: "Binnenkruis",
    qty: 1,
    material: "PETG zwart",
    color: "#1d1f24",
    orient: "ondersteboven (kabelgoot op het bed)",
    settings: "0,2 mm · 4 wanden · 40% infill · geen support",
    purpose: "Klikt om de onderste ribben van de binnenkubus; de staaf wordt erin gelijmd. Door de goot loopt de voedingskabel naar LED 0.",
  },
  {
    id: "base-shell",
    name: "Voet — behuizing",
    qty: 1,
    material: "PETG zwart",
    color: "#1d1f24",
    orient: "ondersteboven (bovenkant op het bed)",
    settings: "0,2 mm · 3 wanden · 20% gyroid · geen support · evt. 5 mm brim",
    purpose: "Bevat de staafkoker met anti-draairib, venster voor het OLED-scherm, gat voor de GX16-stekker en de USB-C-uitsparing.",
  },
  {
    id: "base-plate",
    name: "Voet — bodemplaat",
    qty: 1,
    material: "PETG zwart",
    color: "#1d1f24",
    orient: "plat",
    settings: "0,2 mm · 3 wanden · 25% infill",
    purpose: "Draagt het breadboard (kader), de zoemer en twee ballastvakken. Met 4× M3 verzonken aan de behuizing.",
  },
  {
    id: "ctrl-bottom",
    name: "Controller — onderschaal",
    qty: 1,
    material: "PETG zwart",
    color: "#1d1f24",
    orient: "plat",
    settings: "0,2 mm · 3 wanden · 20% infill",
    purpose: "Houdt de twee KY-023 joysticks in hoekgeleiders. Kabeldoorvoer met tie-wrap trekontlasting.",
  },
  {
    id: "ctrl-top",
    name: "Controller — bovenschaal",
    qty: 1,
    material: "PETG zwart",
    color: "#1d1f24",
    orient: "ondersteboven (bovenkant op het bed)",
    settings: "0,2 mm · 3 wanden · 20% infill",
    purpose: "Klemt de joystick-printjes vast met pennen. Eén stip = linker stick (x/y), twee stippen = rechter stick (z/w).",
  },
  {
    id: "saw-jig",
    name: "Zaagmal",
    qty: 1,
    material: "PETG/PLA, elke kleur",
    color: "#e0582b",
    orient: "plat",
    settings: "0,2 mm · 20% infill",
    purpose: `Hulpmiddel: buis tegen de aanslag, zagen in de sleuf. Sleuven op ${mm(TUBE_LENGTHS.w)} (1 stip), ${mm(TUBE_LENGTHS.inner)} (2), ${mm(TUBE_LENGTHS.outer)} (3) en staaf ${mm(ROD_LENGTH)} (4).`,
  },
].map((p) => {
  const r = rep[p.id] || {};
  const grams = r.grams_each || 0;
  return {
    ...p,
    file: r.file,
    grams,
    gramsTotal: r.grams_total || 0,
    size: r.print_size_mm,
    hours: (grams * p.qty) / GRAMS_PER_HOUR,
  };
});

export const FILAMENT = (() => {
  const light = PRINTED.filter((p) => p.material.startsWith("PETG naturel") || p.material.startsWith("zelfde")).reduce((s, p) => s + p.gramsTotal, 0);
  const dark = PRINTED.filter((p) => p.material === "PETG zwart").reduce((s, p) => s + p.gramsTotal, 0);
  const hours = PRINTED.reduce((s, p) => s + p.hours, 0);
  return { light, dark, hours };
})();

/* ------------------------------------------------------------------ inkoop */

export const BOM = [
  { group: "Elektronica", name: "Arduino Nano V3 (ATmega328P, CH340, USB-C, headers gesoldeerd)", qty: 1, price: 7, where: "Tinytronics / AliExpress: 'Nano V3 Type-C'" },
  { group: "Elektronica", name: "WS2812B LED-module, rond printje Ø10 mm (1 pixel per printje)", qty: 20, note: "16 + 4 reserve", price: 8, where: "AliExpress: 'WS2812B 10mm round PCB' / Tinytronics" },
  { group: "Elektronica", name: "KY-023 analoge joystickmodule (PS2-stijl, met drukknop)", qty: 2, price: 4, where: "Tinytronics / AliExpress: 'KY-023'" },
  { group: "Elektronica", name: "OLED 0,96\" SSD1306 128×64, I²C, 4 pinnen (optioneel)", qty: 1, price: 4, where: "Tinytronics / AliExpress" },
  { group: "Elektronica", name: "Passieve zoemer 12 mm (piëzo) (optioneel)", qty: 1, price: 0.5, where: "Tinytronics: 'passieve buzzer'" },
  { group: "Elektronica", name: "GX16-8 luchtvaartconnector, set stekker + chassisdeel", qty: 1, price: 3, where: "AliExpress / Amazon: 'GX16 8 pin'" },
  { group: "Elektronica", name: "Half breadboard 400 punten (82×55 mm, plakstrip)", qty: 1, price: 3, where: "Tinytronics" },
  { group: "Elektronica", name: "Dupont jumperdraden (M-M, M-F), set", qty: 1, price: 4, where: "Tinytronics / Action" },
  { group: "Elektronica", name: "Weerstand 330 Ω ¼ W", qty: 1, price: 0.1, where: "Tinytronics" },
  { group: "Elektronica", name: "Elco 1000 µF / 10 V", qty: 1, price: 0.3, where: "Tinytronics" },
  { group: "Elektronica", name: "Siliconen draad 26 AWG — rood, zwart, geel (± 4 m per kleur)", qty: 1, price: 8, where: "Tinytronics / AliExpress" },
  { group: "Elektronica", name: "Netwerkkabel Cat5e/6, ≥ 1,5 m (8 aders, voor de controller)", qty: 1, price: 2, where: "Action / oude kabel" },
  { group: "Elektronica", name: "JST-SM 3-pins stekkerpaar (optioneel: tesseract afneembaar)", qty: 1, price: 1, where: "AliExpress: 'JST SM 3 pin'" },
  { group: "Elektronica", name: "Krimpkous-assortiment", qty: 1, price: 4, where: "Action / Gamma" },
  { group: "Elektronica", name: "USB-C datakabel + 5 V USB-lader (≥ 1 A) of powerbank", qty: 1, price: 0, note: "meestal al in huis", where: "—" },
  { group: "Metaal & bevestiging", name: "Aluminium ronde buis 8 × 1 mm, lengte 1 m", qty: 3, price: 12, where: "Gamma / Praxis / Hornbach" },
  { group: "Metaal & bevestiging", name: "Aluminium ronde buis 12 × 1 mm, lengte 0,5–1 m", qty: 1, price: 5, where: "Gamma / Praxis / Hornbach" },
  { group: "Metaal & bevestiging", name: "M3 inzetmoeren (heat-set, M3 × 5,7)", qty: 4, price: 3, where: "AliExpress / Tinytronics" },
  { group: "Metaal & bevestiging", name: "M3 × 10 verzonken bout", qty: 4, price: 1, where: "Gamma (assortimentsdoos)" },
  { group: "Metaal & bevestiging", name: "M3 × 16 bolkop/cilinderkop bout", qty: 6, note: "5 controller + 1 klem buitenkruis", price: 1, where: "Gamma" },
  { group: "Metaal & bevestiging", name: "M3 moer", qty: 1, price: 0.1, where: "Gamma" },
  { group: "Metaal & bevestiging", name: "Rubber voetjes Ø12 mm, zelfklevend", qty: 4, price: 2, where: "Action / Gamma" },
  { group: "Metaal & bevestiging", name: "Ballast: ± 300 g stalen sluitringen (M10/M12) of vislood", qty: 1, price: 3, where: "Gamma / hengelsport" },
  { group: "Metaal & bevestiging", name: "Kleine tie-wrap", qty: 1, price: 0, where: "—" },
  { group: "Lijm", name: "2-componentenlijm (epoxy, 5 minuten)", qty: 1, price: 5, where: "Gamma / Action" },
  { group: "Lijm", name: "Secondelijm, medium", qty: 1, price: 3, where: "Gamma / Action" },
  { group: "Filament", name: `PETG zwart (± ${Math.round(FILAMENT.dark / 50) * 50} g nodig)`, qty: 1, price: 20, note: "spoel 1 kg", where: "Prusament / Elegoo / Bambu" },
  { group: "Filament", name: `PETG naturel/transparant (± ${Math.round(FILAMENT.light / 10) * 10} g nodig)`, qty: 1, price: 20, note: "spoel 1 kg, of PLA wit", where: "Prusament / Elegoo / Bambu" },
];
export const BOM_TOTAL = BOM.reduce((s, b) => s + b.price, 0);

export const TOOLS = [
  "3D-printer met bed van minstens 200 × 200 mm (voet en buitenkruis zijn 190 en 174 mm)",
  "Soldeerbout (± 330 °C) met fijne punt, soldeertin met flux, derde hand",
  "Afstriptang, zijkniptang, pincet",
  "Pijpsnijder (aanrader) of ijzerzaag + de geprinte zaagmal, vijl of ontbramer",
  "Boormachine met Ø5 mm boor (voedingsgat) en een Ø8 mm boor om gaten met de hand na te ruimen",
  "Schuifmaat, multimeter, lijmpistool, markeerstift en schilderstape",
  "Inbussleutel/schroevendraaier voor M3, soldeerbout-opzetstuk of gewone punt voor de inzetmoeren",
  "Computer met Arduino IDE 2 en een USB-C datakabel",
];

/* ------------------------------------------------------------------ zaagplan & draden */

export const TUBES = [
  { kind: "outer", name: "Ribbe buitenkubus", qty: 12, len: TUBE_LENGTHS.outer, stock: "Al 8 × 1 mm" },
  { kind: "inner", name: "Ribbe binnenkubus", qty: 12, len: TUBE_LENGTHS.inner, stock: "Al 8 × 1 mm", note: "één ervan wordt buis V: Ø5 mm gat precies in het midden" },
  { kind: "w", name: "w-ribbe (binnen ↔ buiten)", qty: 8, len: TUBE_LENGTHS.w, stock: "Al 8 × 1 mm" },
  { kind: "rod", name: "Staaf", qty: 1, len: ROD_LENGTH, stock: "Al 12 × 1 mm", note: `sleuf ${SPEC.rod.slotW} × ${SPEC.rod.slotD} mm aan de onderkant` },
];

export const CUTS = [
  { bar: "Staaf 1 (8 × 1, 1 m)", pieces: `6 × ${mm(TUBE_LENGTHS.outer)} + 2 × ${mm(TUBE_LENGTHS.inner)}` },
  { bar: "Staaf 2 (8 × 1, 1 m)", pieces: `6 × ${mm(TUBE_LENGTHS.outer)} + 2 × ${mm(TUBE_LENGTHS.inner)}` },
  { bar: "Staaf 3 (8 × 1, 1 m)", pieces: `8 × ${mm(TUBE_LENGTHS.inner)} + 8 × ${mm(TUBE_LENGTHS.w)}` },
  { bar: "Staaf 4 (12 × 1)", pieces: `1 × ${mm(ROD_LENGTH)}` },
];

const SLACK = 50; // per kant extra draad in de cel om te solderen
export const SEGMENTS = CHAIN.slice(0, 15).map((from, k) => {
  const to = CHAIN[k + 1];
  const e = EDGES.find((x) => (x.a === from && x.b === to) || (x.a === to && x.b === from));
  return {
    n: k + 1,
    from,
    to,
    ledFrom: k,
    ledTo: k + 1,
    kind: e.kind,
    tube: e.length,
    wire: Math.round((e.length + 2 * SLACK) / 5) * 5,
    feed: e.feed,
  };
});
export const FEED_WIRE = 550;

/* ------------------------------------------------------------------ fasen */

export const PHASES = [
  { id: "bestellen", name: "Bestellen", days: "1–3 weken levertijd", hours: 1, text: "Bestel alles uit de inkooplijst. Begin intussen met virtueel testen en printen." },
  { id: "virtueel", name: "Virtueel testen", days: "1 avond", hours: 1, text: "Speel in deze 3D-werkplaats en draai de echte firmware in Wokwi. Zo weet je dat de code klopt vóór er gesoldeerd wordt." },
  { id: "printen", name: "Printen", days: "± 4–6 printavonden", hours: Math.round(FILAMENT.hours), text: "11 verschillende onderdelen, 39 stuks. Cellen in doorschijnend PETG, de rest zwart." },
  { id: "metaal", name: "Zagen & boren", days: "1 middag", hours: 2, text: "33 stukken buis op maat met de zaagmal, ontbramen, voedingsgat boren, sleuf in de staaf." },
  { id: "bedraden", name: "Ketting bouwen", days: "2–3 avonden", hours: 7, text: "16 LED's solderen terwijl je de draden door de buizen trekt. Na elke cel testen." },
  { id: "frame", name: "Frame & kruizen", days: "1–2 avonden", hours: 4, text: "Lussen sluiten met de 17 lege buizen, haaks zetten, lijmen, kruizen erom klikken, staaf erin." },
  { id: "voet", name: "Voet & controller", days: "2 avonden", hours: 5, text: "Breadboard bedraden, OLED en GX16 inbouwen, controller solderen en dichtschroeven." },
  { id: "afronden", name: "Firmware & kalibratie", days: "1 avond", hours: 1, text: "Uploaden, sticks kalibreren en spelen." },
];

/* ------------------------------------------------------------------ uitleg 4D */

export const AXIS_HELP = [
  { axis: "x", color: "#ff7a8a", stick: "Linker stick ← →", values: "0 = links, 1 = rechts" },
  { axis: "y", color: "#5ef2b4", stick: "Linker stick ↑ ↓", values: "0 = boven, 1 = onder" },
  { axis: "z", color: "#6cb8ff", stick: "Rechter stick ↑ ↓", values: "0 = voor, 1 = achter (↑ = verder weg)" },
  { axis: "w", color: "#d77bff", stick: "Rechter stick ← →", values: "0 = binnenkubus, 1 = buitenkubus" },
];

export const CHAIN_TABLE = CHAIN.map((cell, led) => ({ led, cell, label: cellLabel(cell), words: cellWords(cell), outer: cellCoord(cell).w === 1 }));

/* ------------------------------------------------------------------ bouwstappen */

const segLine = (s) =>
  `S${s.n}: LED ${s.ledFrom} (cel ${s.from}) → LED ${s.ledTo} (cel ${s.to}), ${s.kind === "outer" ? "buitenribbe" : s.kind === "inner" ? "binnenribbe" : "w-ribbe"} ${mm(s.tube)}, draad ${s.wire} mm`;

export const STEPS = [
  {
    id: "overzicht",
    phase: "bestellen",
    title: "Het plan in één oogopslag",
    view: { cam: "model", mode: "all" },
    intro:
      "Je bouwt de 2×2×2×2 Lichtjes-puzzel uit de 4d-puzzels app als echt object: 16 lichtgevende blokjes op de hoekpunten van een binnen- en een buitenkubus (de tesseract-weergave), gedragen door één staaf op een voet. Twee duimsticks kiezen de cel, indrukken = drukken.",
    do: [
      "Draai rond het model (slepen), zoom (scrollen) en klik op onderdelen om te zien wat het is.",
      "Bekijk het tabblad Onderdelen voor de inkooplijst en zet je bestelling uit — levertijd uit China is 1–3 weken.",
      "Lees deze stappen één keer helemaal door voordat je begint: de volgorde van stap 8 t/m 14 is belangrijk.",
    ],
    check: [`Totale hoogte ± ${Math.round(CENTER_Y + 80 + 15)} mm, voet ${SPEC.base.size} × ${SPEC.base.size} mm.`, `Kosten ± € ${Math.round(BOM_TOTAL)} (zonder gereedschap en printer).`],
  },
  {
    id: "virtueel",
    phase: "virtueel",
    title: "Eerst virtueel testen: hier én in Wokwi",
    view: { cam: "play", mode: "all" },
    intro: "De simulatie in deze werkplaats gebruikt exact dezelfde spelregels, drempels en LED-standen als de Arduino-code. In Wokwi draait de échte firmware op een gesimuleerde Nano.",
    do: [
      "Tabblad Spelen: speel een paar puzzels met toetsenbord, de knoppen op het scherm of een echte PlayStation-controller (USB/Bluetooth).",
      "Ga naar wokwi.com → New Project → Arduino Nano. Plak de inhoud van wokwi/sketch.ino, wokwi/diagram.json en wokwi/libraries.txt in de gelijknamige tabbladen.",
      "Druk op ▶. Je ziet de LED-test (0 → 15), daarna een puzzel. Beweeg de joysticks, klik erop, open de seriële monitor voor het tekstbord.",
    ],
    check: ["Na een stick-klik wisselen 5 lampjes (cel + 4 buren).", "Alle lampjes uit → 'OPGELOST!' en een melodietje."],
  },
  {
    id: "print-cellen",
    phase: "printen",
    title: "Printen: 16 cellen en 16 doppen",
    view: { cam: "explode", mode: "all", focus: ["cells", "plugs"], explode: 0.55 },
    intro: "De cellen bepalen hoe mooi het licht wordt. Print ze in doorschijnend PETG (naturel) of wit PLA, met 100% infill zodat het licht egaal verstrooit.",
    do: [
      "Open stl/cel-buiten.stl en stl/cel-binnen.stl in je slicer. Ze staan al in de juiste oriëntatie (geen support nodig).",
      "Instellingen: 0,2 mm laaghoogte, 3 wanden, 100% infill (rechtlijnig), PETG ± 235 °C / bed 80 °C.",
      "Print 8 buitencellen en 8 binnencellen (bv. 4 tegelijk), plus 8 + 8 doppen (stl/dop-*.stl, kraag op het bed).",
      "Ruim alle insteekgaten na met een Ø8 mm boor in je hand (niet in de boormachine): de buis moet er strak maar zonder kracht in schuiven.",
    ],
    check: ["Een 8 mm buis schuift in elk gat tot in de holte.", "De dop klikt vlak in de verzinking en is er met een naald weer uit te wippen."],
    tips: ["Gebruik een lijmstift op het bed bij PETG om te voorkomen dat het te hard hecht.", "Kleine 'haartjes' (stringing) in de holte met een aansteker of föhn kort wegsmelten."],
  },
  {
    id: "print-rest",
    phase: "printen",
    title: "Printen: voet, kruizen, controller en zaagmal",
    view: { cam: "explode", mode: "all", focus: ["shell", "plate", "crosses", "controller"], explode: 0.6 },
    intro: "Alle zwarte delen in PETG. De STL's liggen al in printoriëntatie; nergens support nodig.",
    do: [
      "voet-behuizing.stl (ondersteboven, 20% gyroid) — de grootste print, ± 190 × 190 mm. Gebruik een brim als je printer last heeft van kromtrekken.",
      "voet-bodemplaat.stl (plat), buitenkruis.stl (plat), binnenkruis.stl (ondersteboven).",
      "controller-onder.stl en controller-boven.stl; zaagmal.stl in een opvallende kleur.",
      "Controleer of de C-klemmen van de kruizen over een stukje buis klikken. Te strak? Met een mesje de invoerschuinte iets verruimen.",
    ],
    check: ["De 12 mm staaf schuift door het buitenkruis en 14 mm diep in het binnenkruis.", "Een M3-moer past in de sleuf van het buitenkruis."],
  },
  {
    id: "zagen",
    phase: "metaal",
    title: "Buizen zagen, ontbramen en boren",
    view: { cam: "explode", mode: "all", focus: ["tubes", "rod"], explode: 0.5 },
    intro: "Alle 32 ribben zijn aluminium buis 8 × 1 mm; de staaf is 12 × 1 mm. Maten zijn tot op 0,5 mm belangrijk, anders worden de kubussen scheef.",
    do: [
      `Leg de buis in de zaagmal tegen de aanslag en zaag in de sleuf: 12 × ${mm(TUBE_LENGTHS.outer)}, 12 × ${mm(TUBE_LENGTHS.inner)}, 8 × ${mm(TUBE_LENGTHS.w)}. Zaagplan: zie Onderdelen.`,
      `Staaf: 1 × ${mm(ROD_LENGTH)} uit de 12 mm buis. Zaag onderaan een sleuf van ${SPEC.rod.slotW} mm breed en ${SPEC.rod.slotD} mm diep (twee zaagsneden, lipje eruit buigen, vijlen).`,
      `Ontbraam alle uiteinden binnen én buiten — scherpe randen snijden anders door de isolatie van de draden.`,
      `Kies één binnenribbe (${mm(TUBE_LENGTHS.inner)}) als buis V (voeding): boor precies in het midden (${mm(TUBE_LENGTHS.inner / 2)}) een gat van Ø5 mm dwars door één wand. Goed ontbramen en markeren met tape.`,
      "Leg de buizen per soort op een rij en tel na: 12 + 12 + 8 + staaf.",
    ],
    check: [`Alle buizen van één soort zijn even lang (± 0,3 mm).`, "Er steekt nergens een braam uit (draai een wattenstaafje rond in de buis: blijft er niets aan haken?)."],
    tips: ["Een pijpsnijder geeft rechtere, schonere sneden dan een zaag. Zet hem op de streep die je met de zaagmal hebt afgetekend."],
  },
  {
    id: "led-test",
    phase: "bedraden",
    title: "LED-modules testen en de proefopstelling",
    view: { cam: "base", mode: "all", xray: true, focus: ["electronics", "leds"] },
    intro: "Test elke WS2812B-module vóór hij in een cel verdwijnt. Dat scheelt later veel zoekwerk.",
    do: [
      "Zet de Nano op het breadboard (rij 1–15, kolom c en g, USB-C aan de kant van rij 1) en upload de firmware (zie stap 18).",
      "Soldeer aan één module tijdelijk drie draadjes aan DIN, 5V en GND (de pijl op het printje wijst van DIN naar DOUT).",
      "Sluit aan: 5V → + rail, GND → − rail, DIN → via 330 Ω op D6. Bij het opstarten licht LED 0 even fel op (de ketting-test).",
      "Herhaal voor alle 16 (+ reserve) modules. Markeer slechte exemplaren.",
    ],
    check: ["Elke module licht warmgeel op tijdens de opstarttest."],
    tips: ["Zet een elco van 1000 µF over de + en − rail, met de min-streep naar de − rail."],
  },
  {
    id: "draden",
    phase: "bedraden",
    title: "Draadstukken knippen en labelen",
    view: { cam: "model", mode: "all", xray: true, focus: ["wires"] },
    intro: "De 16 LED's vormen één ketting die langs 15 ribben loopt (Gray-code: elke stap wisselt precies één coördinaat). Elk stuk ketting = 3 aders: rood 5V, zwart GND, geel DATA.",
    do: [
      "Draai voor elk segment drie siliconen draden (rood, zwart, geel) losjes in elkaar en knip ze op lengte:",
      ...SEGMENTS.map(segLine),
      `Voedingskabel (V): ${FEED_WIRE} mm, van het breadboard via de staaf en de goot van het binnenkruis naar LED 0.`,
      "Label elk segment aan beide kanten met tape (S1, S2, …) en strip 4 mm af.",
    ],
    check: ["15 segmenten + 1 voedingskabel, gelabeld."],
  },
  {
    id: "ketting-binnen",
    phase: "bedraden",
    title: "Ketting deel 1: binnenkubus (LED 0 – 7)",
    view: { cam: "inner", mode: "build", stage: "inner-chain", xray: true },
    intro: "Je bouwt de binnenkubus langs de ketting: cel na cel, buis na buis. De buizen gaan nog niet vast — alles wordt eerst 'droog' gemonteerd en getest.",
    do: [
      "LED 0 = cel 2 (binnen · links · onder · voor). Steek buis V (gat naar achteren/binnen gericht) in het x-gat van cel 2. Duw de voedingskabel van buiten door het Ø5-gat en door buis V naar cel 2; laat de rest uit het gat hangen.",
      "Schuif segment S1 door buis V vanaf cel 2 naar het andere eind. Trek bij cel 2 de voedingskabel en S1 door de LED-opening naar buiten.",
      "Soldeer de voedingskabel aan DIN/5V/GND en S1 aan DOUT/5V/GND van een LED-module. Krimpkous of een druppel hete lijm over de soldeerpunten.",
      "Duw de module met de draden terug in de holte, LED naar binnen gericht. Doppen pas na de kettingtest plaatsen.",
      "Zet cel 3 (LED 1) op het andere eind van buis V, trek S1 erin en naar buiten, schuif S2 door de buis naar de volgende cel, soldeer, terugduwen.",
      "Herhaal langs de ketting: cel 2 → 3 → 1 → 0 → 4 → 5 → 7 → 6. Elke buis gaat zo ver in de cel dat het uiteinde gelijk ligt met de binnenwand van de holte (kijk met een zaklamp door de opening).",
    ],
    check: ["Na elke cel: voedingskabel op het breadboard, Nano aan → alle LED's tot nu toe lichten op tijdens de opstarttest."],
    tips: ["De holte is krap: houd de draden in de cel kort (± 4 cm) en plooi ze als een harmonica.", "Let goed op DIN versus DOUT. Omgedraaid = de ketting stopt bij die LED."],
  },
  {
    id: "ketting-buiten",
    phase: "bedraden",
    title: "Ketting deel 2: w-ribbe en buitenkubus (LED 8 – 15)",
    view: { cam: "model", mode: "build", stage: "outer-chain", xray: true },
    intro: "Vanaf cel 6 (binnen · links · onder · achter) springt de ketting via één w-ribbe naar de buitenkubus.",
    do: [
      `Schuif S8 door een w-ribbe (${mm(TUBE_LENGTHS.w)}). Steek die in het schuine gat van cel 6 (wijst naar buiten) en zet cel 14 (buiten · links · onder · achter) erop.`,
      "Soldeer LED 8 in cel 14 en ga verder langs de buitenkubus: 14 → 15 → 13 → 12 → 8 → 9 → 11 → 10.",
      `De buitenribben zijn ${mm(TUBE_LENGTHS.outer)}; ze steken 5 mm in elke cel (gelijk met de binnenwand van de holte).`,
      "LED 15 (cel 10) heeft alleen een ingang: DOUT blijft leeg.",
    ],
    check: ["De hele ketting hangt nu als een slinger aan elkaar: 16 cellen, 15 buizen."],
  },
  {
    id: "ketting-test",
    phase: "bedraden",
    title: "Kettingtest: alle 16 LED's",
    view: { cam: "model", mode: "build", stage: "outer-chain", xray: true, chainTest: true },
    intro: "Nu de hele ketting bestaat: test hem in één keer voordat er iets gelijmd wordt.",
    do: [
      "Sluit de voedingskabel aan op het breadboard (geel → i20 achter de 330 Ω, rood → +, zwart → −) en start de Nano.",
      "Tijdens de opstarttest lichten LED 0 → 15 één voor één fel op en blijven half branden. In de seriële monitor zie je het bord.",
      "Speel even via de seriële monitor (a/d, w/s, i/k, j/l, spatie) en kijk of de juiste cellen reageren.",
      "Druk nu pas de doppen in de cellen (LED-module rust op de drie pennetjes).",
    ],
    check: ["Stopt de ketting bij LED n? Dan zit de fout bij DOUT van LED n−1 of DIN van LED n (of een braam heeft de draad beschadigd)."],
  },
  {
    id: "lussen",
    phase: "frame",
    title: "Lussen sluiten: de 17 lege buizen",
    view: { cam: "model", mode: "build", stage: "loops" },
    intro: "De ketting gebruikt 15 van de 32 ribben. De overige 17 zijn alleen constructie. Dankzij de doorlopende gaten (tot in de holte) kun je ze tussen twee vaste cellen plaatsen.",
    do: [
      "Schuif een lege buis eerst helemaal door in cel A (tot in de holte, zo'n 6 mm extra), breng hem in lijn met cel B en schuif hem terug tot hij in beide cellen 5 mm insteekt.",
      "Plaats zo de 5 ontbrekende binnenribben, 7 w-ribben en 5 buitenribben (zie de oplichtende buizen).",
      "Controleer of de kubussen haaks staan: de diagonaal van elk zijvlak (hart tot hart van de cellen) is buiten 226 mm en binnen 119 mm.",
    ],
    check: ["Alle 32 ribben zitten erin, niets wiebelt meer veel.", "De binnenkubus zit precies in het midden van de buitenkubus."],
    tips: ["Een liniaal of winkelhaak op de werkbank helpt om de onderkant vlak te zetten."],
  },
  {
    id: "lijmen",
    phase: "frame",
    title: "Haaks zetten en lijmen",
    view: { cam: "model", mode: "build", stage: "loops", focus: ["joints"] },
    intro: "Pas na de geslaagde kettingtest wordt er gelijmd.",
    do: [
      "Zet de tesseract met de onderkant van de buitenkubus op een vlakke plaat. Meet de diagonalen nog één keer.",
      "Laat bij elke insteekverbinding (64 stuks) een druppel medium secondelijm in de spleet lopen. Doe eerst de buitenkubus, dan de w-ribben, dan de binnenkubus.",
      "Voor extra sterkte: de 8 w-ribben met 5-minuten epoxy (tandenstoker).",
      "Een uur laten uitharden.",
    ],
    check: ["Niets verschuift meer als je de tesseract voorzichtig aan de buitenkubus optilt."],
    tips: ["Secondelijm geeft witte waas op doorschijnend PETG: weinig lijm, en eventueel tape op de cellen rond de gaten."],
  },
  {
    id: "kruizen",
    phase: "frame",
    title: "Kruizen om de onderste ribben klikken",
    view: { cam: "under", mode: "build", stage: "crosses" },
    intro: "Twee kruizen verbinden de kubussen met de staaf. Ze klikken met C-klemmen om het midden van de onderste ribben.",
    do: [
      "Binnenkruis: kabelgoot naar boven, de arm met de goot naar vóren. Druk de vier klemmen van onderen om de vier onderste binnenribben — de voorste klem precies over het Ø5-gat van buis V.",
      "Leg de voedingskabel vanuit het gat in de goot en duw hem door het gaatje in het midden naar beneden, het staafgat in.",
      "Buitenkruis: moersleuf naar boven. Klik het van onderen om de vier onderste buitenribben. Steek een M3-moer in de sleuf.",
    ],
    check: ["Beide kruizen zitten midden onder hun kubus en de naven staan recht boven elkaar."],
  },
  {
    id: "staaf",
    phase: "frame",
    title: "De staaf plaatsen",
    view: { cam: "model", mode: "build", stage: "rod" },
    intro: `De staaf (${mm(ROD_LENGTH)}) loopt van de voet door het buitenkruis tot in het binnenkruis.`,
    do: [
      "Steek de voedingskabel van boven door de staaf en trek hem er onderaan (bij de sleuf) uit.",
      "Schuif de staaf van onderen door het buitenkruis en 14 mm diep in de naaf van het binnenkruis, met een beetje epoxy. De sleuf onderaan wijst naar LINKS (−x) als de voorkant van de tesseract naar je toe staat.",
      "Draai de M3 × 16 bout in het buitenkruis vast tegen de staaf (niet te hard: de buis is maar 1 mm dik).",
    ],
    check: [`Van onderkant staaf tot hart van het buitenkruis: ${mm(OUTER_CROSS_Y - SPEC.base.bossStopY)}.`],
  },
  {
    id: "voet",
    phase: "voet",
    title: "De voet: elektronica inbouwen en bedraden",
    view: { cam: "base", mode: "build", stage: "base", xray: true },
    intro: "Alles in de voet zit op een half breadboard: geen printplaat nodig en je kunt later makkelijk iets veranderen.",
    do: [
      "Druk met de soldeerbout (± 220 °C) de 4 M3-inzetmoeren in de hoekbussen van de behuizing.",
      "OLED: schuif het schermpje (glas naar voren, pinnen boven) tussen de geleiders achter het venster en zet het vast met een druppel hete lijm.",
      "GX16-8 chassisdeel door het ronde gat in de voorwand, moer van binnen vast. Soldeer 8 Dupont-draden aan de soldeercups volgens de pintabel (tabblad Elektronica).",
      "Plak het breadboard in het kader op de bodemplaat (rij 1 bij de achterwand), zet de zoemer in de houder en de ballast in de twee vakken (vastzetten met hete lijm).",
      "Bedraad het breadboard precies volgens de tabel 'Breadboard' in het tabblad Elektronica (21 verbindingen).",
    ],
    check: ["Zonder tesseract aangesloten: Nano aan → OLED toont het startscherm, de controller (stap 17) beweegt de cursor op het kaartje."],
    tips: ["Gebruik korte jumperdraden; lange lussen zitten straks in de weg bij het sluiten."],
  },
  {
    id: "voet-sluiten",
    phase: "voet",
    title: "Tesseract op de voet en dichtschroeven",
    view: { cam: "base", mode: "build", stage: "base-close" },
    intro: "De staaf staat los in de koker en wordt tegen draaien vastgehouden door de rib in de sleuf.",
    do: [
      "Leid de voedingskabel van boven door de staafkoker en via het zijvenster naar het breadboard (eventueel via het JST-SM stekkertje).",
      "Zet de staaf in de koker: draai tot de sleuf over de rib valt. De tesseract staat nu recht vooruit.",
      "Sluit de voedingskabel aan (geel i20, rood +, zwart −), leg de bodemplaat eronder (USB-C van de Nano bij de uitsparing in de achterwand) en schroef dicht met 4× M3 × 10 verzonken.",
      "Plak de 4 rubber voetjes in de verdiepingen.",
    ],
    check: ["De USB-C-stekker gaat vanaf de achterkant in de Nano."],
  },
  {
    id: "controller",
    phase: "voet",
    title: "De controller",
    view: { cam: "controller", mode: "build", stage: "controller", xray: true },
    intro: "Een eenvoudige 'PlayStation'-controller met twee duimsticks, via een 8-aderige kabel en GX16-stekker aan de voet.",
    do: [
      "Strip de netwerkkabel aan beide kanten 6 cm. Controller-kant: 5V (oranje) en GND (bruin) splitsen naar beide joysticks.",
      "Linker joystick: VRx → wit-groen, VRy → groen, SW → wit-oranje. Rechter: VRx → wit-blauw, VRy → blauw, SW → wit-bruin. Met Dupont-stekkertjes of direct gesoldeerd.",
      "Leg de KY-023's in de hoekgeleiders van de onderschaal, pinnen naar het midden. Kabel door het gat achter, tie-wrap om de twee paaltjes.",
      "Bovenschaal erop (stippen: 1 = links, 2 = rechts), 5× M3 × 16 van onderen.",
      "Voet-kant: soldeer de 8 aders aan de GX16-8 stekker volgens de pintabel en schroef de huls dicht.",
    ],
    check: ["Doorpiepen met de multimeter: elke GX16-pin komt uit bij de juiste joystickpin."],
    tips: ["Meet je KY-023 na: wijkt de printplaat af van 34 × 26 mm, pas dan 'joyPcb' aan in cad/design.mjs en draai npm run stl."],
  },
  {
    id: "firmware",
    phase: "afronden",
    title: "Firmware uploaden",
    view: { cam: "laptop", mode: "all" },
    intro: "De firmware staat in firmware/lichtjes4d/lichtjes4d.ino.",
    do: [
      "Arduino IDE 2 → Bibliotheekbeheer: installeer 'Adafruit NeoPixel' en 'Adafruit SSD1306' (accepteer 'Adafruit GFX Library' en 'Adafruit BusIO').",
      "Open lichtjes4d.ino. Hulpmiddelen → Board: Arduino Nano. Processor: ATmega328P (Old Bootloader) bij de meeste klonen. Poort: de COM-poort van de Nano (CH340-driver nodig als hij niet verschijnt).",
      "Uploaden. Open de seriële monitor op 115200 baud om het bord en de hulp te zien.",
    ],
    check: ["Na het uploaden: LED-test 0 → 15, daarna verschijnt een puzzel."],
  },
  {
    id: "kalibreren",
    phase: "afronden",
    title: "Sticks kalibreren",
    view: { cam: "controller", mode: "all" },
    intro: "Elke joystickmodule is anders gemonteerd. De kalibratie stelt vast welke draad welke richting is en bewaart dat in het EEPROM.",
    do: [
      "Houd beide sticks ingedrukt en steek de USB-C-kabel in (of druk op reset).",
      "Laat los. Volg het schermpje: 'LINKS >' (duw links naar rechts), 'LINKS ^' (links omhoog), 'RECHTS ^', 'RECHTS >'. Steeds ver duwen en loslaten.",
      "De LED's laten zien welke kant bedoeld is. Na stap 4 hoor je een melodietje: klaar.",
    ],
    check: ["Linker stick naar rechts → cursor naar rechts; rechter stick naar rechts → naar de buitenkubus."],
  },
  {
    id: "spelen",
    phase: "afronden",
    title: "Spelen!",
    view: { cam: "play", mode: "all" },
    intro: "Zet alle lampjes uit. Elke druk wisselt de gekozen cel en zijn vier buren — in elke richting x, y, z en w precies één.",
    do: [
      "Kort indrukken = drukken. Eén stick 0,8 s vasthouden = hint. Beide sticks 1,5 s = nieuwe puzzel.",
      "Na elke oplossing gaat het level omhoog: level 1 is 3 drukken (zoals 'Tesseract' in de app), level 8 is 10 drukken.",
      "Elke stand is oplosbaar en de oplossing is uniek: twee keer op dezelfde cel drukken heft zichzelf op.",
    ],
    check: ["Veel plezier — en laat iemand die nog nooit van 4D heeft gehoord het eens proberen."],
  },
];

export const STAGES = ["inner-chain", "outer-chain", "loops", "crosses", "rod", "base", "base-close", "controller"];

export { GX16_PINS, BREADBOARD_WIRING, PINS, SPEC, TUBE_LENGTHS, ROD_LENGTH, CENTER_Y, BASE_TOP };
