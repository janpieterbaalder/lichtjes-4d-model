/** Interface: tabbladen Spelen · Plan · Onderdelen · Bouwen · Elektronica · Code. */
import FIRMWARE from "../../firmware/lichtjes4d/lichtjes4d.ino";
import {
  PRINTED,
  FILAMENT,
  BOM,
  BOM_TOTAL,
  TOOLS,
  TUBES,
  CUTS,
  SEGMENTS,
  FEED_WIRE,
  PHASES,
  AXIS_HELP,
  CHAIN_TABLE,
  STEPS,
  GX16_PINS,
  BREADBOARD_WIRING,
  PINS,
  SPEC,
  TUBE_LENGTHS,
  ROD_LENGTH,
  CENTER_Y,
  mm,
} from "./content.js";
import { popcount } from "./sim.js";

const $ = (sel, root = document) => root.querySelector(sel);
const h = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};
const eur = (n) => (n ? `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}` : "—");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Welke 3D-groepen horen bij een geprint onderdeel (voor oplichten). */
const PART_GROUPS = {
  "cell-outer": ["cells-outer"],
  "cell-inner": ["cells-inner"],
  "plug-outer": ["plugs"],
  "plug-inner": ["plugs"],
  "cross-outer": ["crosses"],
  "cross-inner": ["crosses"],
  "base-shell": ["shell"],
  "base-plate": ["plate"],
  "ctrl-bottom": ["controller"],
  "ctrl-top": ["controller"],
  "saw-jig": [],
};

const EXTRA_INFO = {
  led: { name: "WS2812B LED-module (Ø10 mm)", text: "Eén adresseerbare RGB-LED op een rond printje. Rust op de pennetjes van de dop, LED naar binnen: het licht kaatst in de holte en de hele cel gloeit egaal." },
  rod: { name: `Staaf — aluminium 12 × 1 mm, ${ROD_LENGTH} mm`, text: `Draagt beide kubussen. Onderaan een sleuf van ${SPEC.rod.slotW} × ${SPEC.rod.slotD} mm die over de rib in de voet valt (niet draaien). Binnenin lopen de drie aders naar LED 0.` },
  "tube-outer": { name: `Ribbe buitenkubus — Al 8 × 1 mm, ${mm(TUBE_LENGTHS.outer)}`, text: "12 stuks. Steekt 5 mm in elke cel, gelijk met de binnenwand van de holte." },
  "tube-inner": { name: `Ribbe binnenkubus — Al 8 × 1 mm, ${mm(TUBE_LENGTHS.inner)}`, text: "12 stuks. Steekt 4,5 mm in elke cel." },
  "tube-w": { name: `w-ribbe — Al 8 × 1 mm, ${mm(TUBE_LENGTHS.w)}`, text: "8 stuks: verbinden elke binnencel met de bijbehorende buitencel (de vierde dimensie)." },
  "tube-feed": { name: `Buis V — binnenribbe ${mm(TUBE_LENGTHS.inner)} met Ø5 mm gat`, text: "De voedingskabel komt via het binnenkruis door het gat in het midden deze buis in en loopt naar LED 0 in cel 2." },
  electronics: { name: "Elektronica in de voet", text: "Arduino Nano op een half breadboard, elco 1000 µF, weerstand 330 Ω, zoemer en ballast. Zie het tabblad Elektronica voor elke verbinding." },
  oled: { name: "OLED 0,96\" SSD1306", text: "Toont level, aantal lampjes aan, drukken, minimum, tijd, de cursor (x y z w) en een kaartje van alle 16 cellen." },
  gx16: { name: "GX16-8 connector", text: "Verbindt de controller (8 aders: 5V, GND, 2× X, 2× Y, 2× drukknop) met de voet. Pintabel: tabblad Elektronica." },
  ky023: { name: "KY-023 joystickmodule", text: "Twee potmeters (X en Y) en een drukknop (SW). Links: x en y. Rechts: z en w." },
  feed: { name: "Voedingskabel (3 aders)", text: `${FEED_WIRE} mm: rood 5V, zwart GND, geel DATA. Van het breadboard (i20 achter de 330 Ω) door de staafkoker, de staaf, het binnenkruis en buis V naar LED 0.` },
  wire: { name: "Kettingsegment (3 aders)", text: "Rood 5V, zwart GND, geel DATA. Van DOUT van de ene LED naar DIN van de volgende, door de buis ertussen." },
  usb: { name: "USB-C en voetjes", text: "Voeding én programmeren via de USB-C van de Nano, door de uitsparing in de achterwand. Een powerbank werkt ook." },
  cable: { name: "Controllerkabel", text: "8-aderige netwerkkabel. Trekontlasting met een tie-wrap om de twee paaltjes in de onderschaal." },
};

export function buildUI({ game, input, buzzer, model, state, actions }) {
  const root = document.getElementById("ui");
  root.innerHTML = `
    <header class="brand">
      <div class="logo">${tesseractIcon()}</div>
      <div><h1>Lichtjes 4D</h1><p>bouwplan · werkplaats · speelbaar model</p></div>
    </header>
    <nav class="views">
      <div class="group" data-group="views">
        ${[["werkplaats", "Werkplaats"], ["model", "Model"], ["play", "Spelen"], ["base", "Voet"], ["controller", "Controller"], ["printer", "Printer"], ["laptop", "Laptop"]].map(([k, l]) => `<button data-view="${k}">${l}</button>`).join("")}
      </div>
      <div class="group">
        <button class="toggle" data-toggle="xray" title="Röntgen: behuizing doorzichtig">Röntgen</button>
        <button class="toggle" data-toggle="labels" title="LED-nummers tonen">LED-nrs</button>
        <button class="toggle" data-toggle="dims" title="Maten tonen">Maten</button>
        <label class="slider" title="Uit elkaar">Uit elkaar <input type="range" min="0" max="1" step="0.01" value="0" data-explode></label>
      </div>
    </nav>
    <aside class="panel">
      <div class="tabs">${["Spelen", "Plan", "Onderdelen", "Bouwen", "Elektronica", "Code"].map((t, i) => `<button data-tab="${i}">${t}</button>`).join("")}</div>
      <div class="tab-body"></div>
      <button class="panel-toggle" title="Paneel in-/uitklappen">⟩</button>
    </aside>
    <div class="selection hidden"></div>
  `;
  const body = $(".tab-body", root);
  const panel = $(".panel", root);
  const explode = $("[data-explode]", root);
  let current = 0;
  let step = 0;
  const tabs = [tabPlay, tabPlan, tabParts, tabBuild, tabElectronics, tabCode].map((fn) => fn());
  tabs.forEach((t) => {
    t.classList.add("tab");
    body.appendChild(t);
  });
  function showTab(i) {
    current = i;
    tabs.forEach((t, k) => t.classList.toggle("active", k === i));
    root.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", +b.dataset.tab === i));
    body.scrollTop = 0;
    if (i === 3) actions.setStep(step);
    else if (i === 0) {
      actions.resetToPlay();
      actions.setView("play");
    } else if (i === 4) {
      actions.resetToPlay();
      if (!state.xray) actions.toggle("xray");
      actions.setView("base");
      actions.focus(["electronics", "wires"]);
    } else if (i === 5) {
      actions.resetToPlay();
      actions.setView("laptop");
    } else {
      actions.resetToPlay();
      actions.focus([]);
    }
  }
  root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => showTab(+b.dataset.tab)));
  root.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => actions.setView(b.dataset.view)));
  root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => actions.toggle(b.dataset.toggle)));
  explode.addEventListener("input", () => actions.setExplode(+explode.value));
  $(".panel-toggle", root).addEventListener("click", () => panel.classList.toggle("collapsed"));

  /* ================================================================ Spelen */
  function tabPlay() {
    const el = h(`<section>
      <div class="status">
        <div><span>Level</span><b data-s="level">1</b></div>
        <div><span>Aan</span><b data-s="on">0</b></div>
        <div><span>Gedrukt</span><b data-s="presses">0</b></div>
        <div><span>Minimaal</span><b data-s="par">0</b></div>
        <div><span>Tijd</span><b data-s="time">00:00</b></div>
      </div>
      <p class="message" data-s="msg">Zet alle lampjes uit. Een druk wisselt de gekozen cel en zijn vier buren.</p>
      <div class="pads">
        ${pad("L", "Linker stick", [["↑", 1, -1, "y"], ["←", 0, -1, "x"], ["→", 0, 1, "x"], ["↓", 1, 1, "y"]])}
        ${pad("R", "Rechter stick", [["↑", 2, 1, "z"], ["←", 3, -1, "w"], ["→", 3, 1, "w"], ["↓", 2, -1, "z"]])}
      </div>
      <div class="row buttons">
        <button data-act="new">Nieuwe puzzel <kbd>N</kbd></button>
        <button data-act="hint">Hint <kbd>H</kbd></button>
        <button data-act="restart">Opnieuw <kbd>R</kbd></button>
        <button data-act="sound" class="toggle on">Geluid</button>
      </div>
      <h3>Zo bedien je hem</h3>
      <table class="axes">${AXIS_HELP.map((a) => `<tr><td><i style="background:${a.color}"></i>${a.axis}</td><td>${a.stick}</td><td>${a.values}</td></tr>`).join("")}</table>
      <p class="small">Toetsenbord: <kbd>A</kbd><kbd>D</kbd> x · <kbd>W</kbd><kbd>S</kbd> y · <kbd>↑</kbd><kbd>↓</kbd> z · <kbd>←</kbd><kbd>→</kbd> w · <kbd>spatie</kbd>/<kbd>enter</kbd> = stick indrukken (vasthouden = hint).<br>
      Een PlayStation-controller via USB of Bluetooth werkt ook: sticks bewegen, <b>L3/R3</b> of <b>×</b> = drukken. <span data-s="pad"></span></p>
      <h3>LED-standen</h3>
      <div class="legend"><span><i class="led off"></i>uit</span><span><i class="led mid"></i>aan (middel)</span><span><i class="led hi"></i>gekozen (fel)</span><span><i class="led breath"></i>gekozen maar uit (ademt)</span></div>
      <h3>Instellingen (ook in de firmware)</h3>
      <label class="opt"><input type="checkbox" data-opt="cursor" checked> Gekozen cel 'ademt' als hij uit staat <code>CURSOR_STYLE 1</code></label>
      <label class="opt"><input type="checkbox" data-opt="rule" checked> Lichtjes-regel: cel + 4 buren <code>NEIGHBOR_RULE 1</code></label>
      <h3>Seriële monitor <small>(zoals op 115200 baud)</small></h3>
      <pre class="serial" data-s="board"></pre>
    </section>`);
    el.querySelectorAll("[data-press]").forEach((b) => {
      const target = b.dataset.press.length === 1 ? b.dataset.press : b.dataset.press.split(",").map(Number);
      const down = (e) => {
        e.preventDefault();
        buzzer.unlock();
        b.setPointerCapture?.(e.pointerId);
        input.uiPress(target, true);
        b.classList.add("down");
      };
      const up = () => {
        input.uiPress(target, false);
        b.classList.remove("down");
      };
      b.addEventListener("pointerdown", down);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("lostpointercapture", up);
    });
    el.querySelector('[data-act="new"]').onclick = () => game.newGame(performance.now());
    el.querySelector('[data-act="hint"]').onclick = () => game.hint(performance.now());
    el.querySelector('[data-act="restart"]').onclick = () => game.restart(performance.now());
    el.querySelector('[data-act="sound"]').onclick = (e) => {
      buzzer.muted = !buzzer.muted;
      e.currentTarget.classList.toggle("on", !buzzer.muted);
    };
    el.querySelector('[data-opt="cursor"]').onchange = (e) => (game.cursorStyle = e.target.checked ? 1 : 0);
    el.querySelector('[data-opt="rule"]').onchange = (e) => {
      game.neighborRule = e.target.checked;
      game.newGame(performance.now());
    };
    return el;
  }

  function pad(id, title, dirs) {
    const pos = { "↑": "up", "←": "left", "→": "right", "↓": "down" };
    return `<div class="pad"><div class="pad-title">${title}</div><div class="pad-grid">
      ${dirs.map(([sym, a, v, ax]) => `<button class="dir ${pos[sym]}" data-press="${a},${v}" style="--c:${AXIS_HELP.find((x) => x.axis === ax).color}">${sym}<small>${ax}</small></button>`).join("")}
      <button class="press" data-press="${id}">druk</button></div></div>`;
  }

  /* ================================================================ Plan */
  function tabPlan() {
    const totalHours = PHASES.reduce((s, p) => s + p.hours, 0);
    return h(`<section>
      <h2>Wat je bouwt</h2>
      <p>De 2×2×2×2 <b>Lichtjes</b>-puzzel uit je 4d-puzzels app, maar dan echt: zestien lichtgevende blokjes op de hoekpunten van een <b>buitenkubus</b> (160 mm) en een <b>binnenkubus</b> (84 mm) — precies de tesseract-weergave. De 32 ribben zijn aluminium buisjes; acht daarvan (de w-ribben) verbinden binnen met buiten. Eén staaf draagt alles op een voet met de Arduino, een schermpje en een aansluiting voor de controller.</p>
      <div class="cards">
        ${card("Hoogte", `${Math.round(CENTER_Y + 95)} mm`)}
        ${card("Voet", `${SPEC.base.size} × ${SPEC.base.size} mm`)}
        ${card("LED's", "16 × WS2812B")}
        ${card("Buizen", "32 + staaf")}
        ${card("Kosten", `± ${eur(Math.round(BOM_TOTAL))}`)}
        ${card("Printtijd", `± ${Math.round(FILAMENT.hours)} uur`)}
        ${card("Filament", `${Math.round(FILAMENT.dark)} g zwart + ${Math.round(FILAMENT.light)} g naturel`)}
        ${card("Totaal werk", `± ${totalHours} uur`)}
      </div>
      <h2>Fasen</h2>
      <ol class="phases">${PHASES.map((p) => `<li><b>${p.name}</b> <span class="chip">${p.days}</span><p>${p.text}</p></li>`).join("")}</ol>
      <h2>Zo zit 4D in het object</h2>
      <p>Elke cel heeft vier coördinaten (x, y, z, w), elk 0 of 1. Celnummer = x + 2·y + 4·z + 8·w — net als in de app. De w-coördinaat kies je tussen <b>binnen</b> (w0) en <b>buiten</b> (w1): de schuine ribben zijn de vierde richting.</p>
      <table class="axes">${AXIS_HELP.map((a) => `<tr><td><i style="background:${a.color}"></i>${a.axis}</td><td>${a.stick}</td><td>${a.values}</td></tr>`).join("")}</table>
      <p>Iedere cel heeft precies vier buren (één per as). Een druk wisselt dus altijd vijf lampjes. Wiskundig leuk: voor de tesseract is de drukmatrix zijn eigen inverse, dus <b>elke</b> stand is oplosbaar en de oplossing is uniek — de firmware rekent de hint in één regel uit.</p>
      <h2>Bestanden</h2>
      <ul class="files">
        <li><a href="stl/" target="_blank">stl/</a> — 11 printklare STL's</li>
        <li><a href="firmware/lichtjes4d/lichtjes4d.ino" download>firmware/lichtjes4d/lichtjes4d.ino</a> — Arduino-code</li>
        <li><a href="wokwi/diagram.json" download>wokwi/</a> — simulatie van de echte firmware</li>
        <li><a href="docs/BOUWHANDLEIDING.md" target="_blank">docs/BOUWHANDLEIDING.md</a> — alles uit deze werkplaats als tekst om te printen</li>
        <li><a href="cad/design.mjs" target="_blank">cad/design.mjs</a> — alle maten op één plek (aanpassen + <code>npm run build</code>)</li>
      </ul>
    </section>`);
  }
  function card(k, v) {
    return `<div class="card"><span>${k}</span><b>${v}</b></div>`;
  }

  /* ================================================================ Onderdelen */
  function tabParts() {
    const groups = [...new Set(BOM.map((b) => b.group))];
    const el = h(`<section>
      <h2>Te printen <small>${PRINTED.reduce((s, p) => s + p.qty, 0)} stuks</small></h2>
      <p class="small">Klik op een rij om het onderdeel in 3D te laten oplichten en uit elkaar te halen. STL's staan al in printoriëntatie.</p>
      <div class="parts">${PRINTED.map(
        (p) => `<details class="part" data-part="${p.id}">
          <summary><i style="background:${p.color}"></i><b>${p.name}</b><span>${p.qty}×</span><span>${Math.round(p.gramsTotal)} g</span><span>${p.hours.toFixed(1)} u</span></summary>
          <p>${p.purpose}</p>
          <dl><dt>Materiaal</dt><dd>${p.material}</dd><dt>Oriëntatie</dt><dd>${p.orient}</dd><dt>Instellingen</dt><dd>${p.settings}</dd><dt>Afmeting</dt><dd>${p.size ? p.size.join(" × ") + " mm" : ""}</dd></dl>
          <a class="dl" href="${p.file}" download>⤓ ${p.file}</a>
        </details>`,
      ).join("")}</div>
      <h2>Inkooplijst <small>± ${eur(Math.round(BOM_TOTAL))}</small></h2>
      ${groups
        .map(
          (g) => `<h4>${g}</h4><table class="bom">${BOM.filter((b) => b.group === g)
            .map((b) => `<tr><td class="q">${b.qty}×</td><td>${esc(b.name)}${b.note ? `<small> — ${b.note}</small>` : ""}<div class="where">${esc(b.where)}</div></td><td class="p">${eur(b.price)}</td></tr>`)
            .join("")}</table>`,
        )
        .join("")}
      <h2>Zaagplan</h2>
      <table class="bom">${TUBES.map((t) => `<tr><td class="q">${t.qty}×</td><td><b>${mm(t.len)}</b> ${t.name}<div class="where">${t.stock}${t.note ? " · " + t.note : ""}</div></td></tr>`).join("")}</table>
      <table class="bom">${CUTS.map((c) => `<tr><td>${c.bar}</td><td>${c.pieces}</td></tr>`).join("")}</table>
      <h2>Draden</h2>
      <p class="small">Drie siliconen aders (rood 5V · zwart GND · geel DATA) per segment, 50 mm extra per kant om te solderen.</p>
      <table class="bom">${SEGMENTS.map((s) => `<tr><td class="q">S${s.n}</td><td>LED ${s.ledFrom} → ${s.ledTo} <small>(cel ${s.from} → ${s.to}, ${s.kind === "outer" ? "buiten" : s.kind === "inner" ? "binnen" : "w"})</small>${s.feed ? " <span class='chip'>buis V</span>" : ""}</td><td class="p">${s.wire} mm</td></tr>`).join("")}
      <tr><td class="q">V</td><td>Voedingskabel breadboard → LED 0</td><td class="p">${FEED_WIRE} mm</td></tr></table>
      <h2>Gereedschap</h2>
      <ul>${TOOLS.map((t) => `<li>${t}</li>`).join("")}</ul>
    </section>`);
    el.querySelectorAll("[data-part]").forEach((d) =>
      d.addEventListener("toggle", () => {
        if (!d.open) return;
        el.querySelectorAll("[data-part]").forEach((o) => o !== d && (o.open = false));
        const groups = PART_GROUPS[d.dataset.part] || [];
        actions.focus(groups);
        actions.setExplode(groups.length ? 0.5 : 0);
        explode.value = groups.length ? 0.5 : 0;
        if (groups.includes("controller")) actions.setView("controller");
        else if (groups.includes("shell") || groups.includes("plate")) actions.setView("base");
        else actions.setView(groups.length ? "explode" : "model");
      }),
    );
    return el;
  }

  /* ================================================================ Bouwen */
  function tabBuild() {
    const el = h(`<section>
      <div class="stepnav">
        <button data-step="-1">← Vorige</button>
        <div class="progress"><div></div><span></span></div>
        <button data-step="1">Volgende →</button>
      </div>
      <article class="step"></article>
      <h3>Alle stappen</h3>
      <ol class="steplist">${STEPS.map((s, i) => `<li data-i="${i}"><span class="chip">${PHASES.find((p) => p.id === s.phase)?.name}</span> ${s.title}</li>`).join("")}</ol>
    </section>`);
    const render = () => {
      const s = STEPS[step];
      const ph = PHASES.find((p) => p.id === s.phase);
      el.querySelector(".progress div").style.width = `${((step + 1) / STEPS.length) * 100}%`;
      el.querySelector(".progress span").textContent = `Stap ${step + 1} van ${STEPS.length}`;
      el.querySelector(".step").innerHTML = `
        <span class="chip">${ph?.name}</span>
        <h2>${step + 1}. ${s.title}</h2>
        <p class="intro">${s.intro}</p>
        <h4>Doen</h4><ol>${s.do.map((d) => `<li>${d}</li>`).join("")}</ol>
        ${s.check ? `<h4>Controle</h4><ul class="check">${s.check.map((d) => `<li>${d}</li>`).join("")}</ul>` : ""}
        ${s.tips ? `<h4>Let op</h4><ul class="tips">${s.tips.map((d) => `<li>${d}</li>`).join("")}</ul>` : ""}`;
      el.querySelectorAll(".steplist li").forEach((li) => li.classList.toggle("active", +li.dataset.i === step));
      explode.value = s.view?.explode || 0;
    };
    el.querySelectorAll("[data-step]").forEach((b) =>
      b.addEventListener("click", () => {
        step = Math.max(0, Math.min(STEPS.length - 1, step + +b.dataset.step));
        render();
        actions.setStep(step);
        el.closest(".tab-body").scrollTop = 0;
      }),
    );
    el.querySelectorAll(".steplist li").forEach((li) =>
      li.addEventListener("click", () => {
        step = +li.dataset.i;
        render();
        actions.setStep(step);
        el.closest(".tab-body").scrollTop = 0;
      }),
    );
    render();
    return el;
  }

  /* ================================================================ Elektronica */
  function tabElectronics() {
    return h(`<section>
      <h2>Schema</h2>
      ${schematic()}
      <h2>Pinnen van de Nano</h2>
      <table class="bom">${Object.entries({
        "D6": "LED-data → 330 Ω → DIN van LED 0",
        "D2": "linker stick indrukken (SW, interne pull-up)",
        "D3": "rechter stick indrukken (SW, interne pull-up)",
        "A0": "linker stick X (VRx)",
        "A1": "linker stick Y (VRy)",
        "A2": "rechter stick X (VRx) → w",
        "A3": "rechter stick Y (VRy) → z",
        "A4 / A5": "OLED SDA / SCL (I²C, adres 0x3C)",
        "D9": "passieve zoemer (+)",
        "5V / GND": "via + en − rail naar LED's, controller, OLED",
      })
        .map(([k, v]) => `<tr><td class="q"><b>${k}</b></td><td>${v}</td></tr>`)
        .join("")}</table>
      <h2>Breadboard, verbinding voor verbinding</h2>
      <p class="small">Nano in rij 1–15, pinnen in kolom <b>c</b> (D13, A0…A7, 5V, GND) en <b>g</b> (D12…D2). USB-C bij rij 1 = achterwand. Controleer de opdruk op jouw Nano.</p>
      <table class="bom wiring">${BREADBOARD_WIRING.map((w, i) => `<tr><td class="q">${i + 1}</td><td><i class="wire" style="background:${w.color === "resistor" ? "linear-gradient(90deg,#d8c39a 40%,#8b4513 40% 50%,#d8c39a 50%)" : w.color === "cap" ? "#23358a" : w.color}"></i>${esc(w.from)} → ${esc(w.to)}<div class="where">${w.what}</div></td></tr>`).join("")}</table>
      <h2>GX16-8 en controllerkabel</h2>
      <table class="bom">${GX16_PINS.map((p) => `<tr><td class="q">${p.pin}</td><td><i class="wire" style="background:${p.hex}"></i>${p.color}</td><td>${p.signal}</td><td>${p.nano}</td></tr>`).join("")}</table>
      <h2>LED-ketting</h2>
      <p class="small">De ketting volgt een Gray-code: elke stap wisselt precies één coördinaat, dus loopt hij altijd door één buis naar de buurcel. 15 buizen dragen draad, 17 zijn leeg.</p>
      <table class="bom chain">${CHAIN_TABLE.map((c) => `<tr><td class="q">LED ${c.led}</td><td>cel ${c.cell}</td><td>${c.label}</td><td><small>${c.words}</small></td></tr>`).join("")}</table>
      <h2>Stroombudget</h2>
      <p>Per LED maximaal ±28 mA (warmgeel, helderheid begrensd op 160/255). Tijdens spelen: 15 cellen 'aan' ≈ 15 × 2,4 mA + cursor 28 mA + ruststroom ≈ <b>75 mA</b>. Zelfs de win-animatie blijft onder ±200 mA: een gewone USB-lader of powerbank volstaat.</p>
    </section>`);
  }

  function schematic() {
    const pinsL = [["A0", "#9fd8a8"], ["A1", "#2e9d4c"], ["A2", "#a9c4f0"], ["A3", "#2f62c9"], ["D2", "#f7c79a"], ["D3", "#c9b29a"], ["5V", "#e53935"], ["GND", "#9e9e9e"]];
    const pinsR = [["D6", "#f2c200"], ["A4", "#7e57c2"], ["A5", "#26a69a"], ["D9", "#ff7043"], ["5V", "#e53935"], ["GND", "#9e9e9e"]];
    const y0 = 70;
    const dy = 26;
    const left = pinsL.map(([p, c], i) => {
      const y = y0 + i * dy;
      return `<line x1="120" y1="${y}" x2="210" y2="${y}" stroke="${c}" stroke-width="3"/><text x="216" y="${y + 4}" class="pin">${p}</text>`;
    });
    const right = pinsR.map(([p, c], i) => {
      const y = y0 + i * dy + (i >= 4 ? 52 : 0);
      return `<line x1="310" y1="${y}" x2="400" y2="${y}" stroke="${c}" stroke-width="3"/><text x="304" y="${y + 4}" class="pin" text-anchor="end">${p}</text>`;
    });
    return `<svg class="schematic" viewBox="0 0 520 330" role="img" aria-label="Schema">
      <rect x="210" y="40" width="100" height="260" rx="8" class="nano"/><text x="260" y="30" text-anchor="middle" class="title">Arduino Nano</text>
      ${left.join("")}${right.join("")}
      <rect x="10" y="56" width="110" height="160" rx="8" class="blk"/><text x="65" y="80" text-anchor="middle" class="title">Controller</text><text x="65" y="100" text-anchor="middle" class="sub">via GX16-8</text>
      <text x="65" y="130" text-anchor="middle" class="sub">links: X Y SW</text><text x="65" y="148" text-anchor="middle" class="sub">rechts: X Y SW</text><text x="65" y="166" text-anchor="middle" class="sub">5V · GND</text>
      <rect x="400" y="52" width="112" height="40" rx="8" class="blk"/><text x="456" y="70" text-anchor="middle" class="title">16× WS2812B</text><text x="456" y="85" text-anchor="middle" class="sub">via 330 Ω</text>
      <rect x="400" y="98" width="112" height="44" rx="8" class="blk"/><text x="456" y="118" text-anchor="middle" class="title">OLED 128×64</text><text x="456" y="134" text-anchor="middle" class="sub">I²C 0x3C</text>
      <rect x="400" y="148" width="112" height="22" rx="8" class="blk"/><text x="456" y="163" text-anchor="middle" class="sub">zoemer</text>
      <rect x="400" y="210" width="112" height="60" rx="8" class="blk"/><text x="456" y="232" text-anchor="middle" class="title">USB-C 5 V</text><text x="456" y="248" text-anchor="middle" class="sub">1000 µF over</text><text x="456" y="262" text-anchor="middle" class="sub">+ en − rail</text>
    </svg>`;
  }

  /* ================================================================ Code */
  function tabCode() {
    const lines = FIRMWARE.split("\n");
    const code = lines
      .map((l, i) => `<span class="ln">${i + 1}</span>${highlight(l)}`)
      .join("\n");
    return h(`<section>
      <h2>Firmware</h2>
      <p>De code voor de Arduino Nano. De simulatie in deze werkplaats is er regel voor regel van nagebouwd (zelfde drempels, tijden en LED-standen).</p>
      <p><a class="dl" href="firmware/lichtjes4d/lichtjes4d.ino" download>⤓ lichtjes4d.ino</a></p>
      <h3>Uploaden met de Arduino IDE</h3>
      <ol>
        <li>Bibliotheekbeheer: <b>Adafruit NeoPixel</b> en <b>Adafruit SSD1306</b> installeren (afhankelijkheden accepteren).</li>
        <li>Board <b>Arduino Nano</b>, processor <b>ATmega328P (Old Bootloader)</b> bij de meeste klonen, juiste COM-poort.</li>
        <li>Uploaden — gebruikt ± 25 kB flash (82%) en 738 B RAM + 1 kB voor het scherm.</li>
      </ol>
      <h3>Eerst in Wokwi</h3>
      <ol>
        <li>Open <a href="https://wokwi.com/projects/new/arduino-nano" target="_blank" rel="noopener">wokwi.com → nieuw Arduino Nano-project</a>.</li>
        <li>Plak <code>wokwi/sketch.ino</code>, <code>wokwi/diagram.json</code> en <code>wokwi/libraries.txt</code> in de tabbladen met dezelfde naam.</li>
        <li>▶ Start. De 16 pixels staan als vier bordjes (kolom = binnen | buiten, rij = voor | achter), net als het OLED-kaartje.</li>
      </ol>
      <h3>Seriële commando's</h3>
      <p class="small"><kbd>a</kbd>/<kbd>d</kbd> x · <kbd>w</kbd>/<kbd>s</kbd> y · <kbd>i</kbd>/<kbd>k</kbd> z · <kbd>j</kbd>/<kbd>l</kbd> w · <kbd>spatie</kbd> druk · <kbd>h</kbd> hint · <kbd>n</kbd> nieuw · <kbd>r</kbd> opnieuw · <kbd>c</kbd> bord</p>
      <pre class="code">${code}</pre>
    </section>`);
  }
  function highlight(line) {
    const e = esc(line);
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return `<span class="c">${e}</span>`;
    return e
      .replace(/(\/\/.*)$/, '<span class="c">$1</span>')
      .replace(/\b(uint16_t|uint8_t|int8_t|int|bool|void|return|for|if|else|const|struct|switch|case|break|while|unsigned|long|enum|true|false)\b/g, '<span class="k">$1</span>')
      .replace(/(#\w+)/g, '<span class="p">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="n">$1</span>');
  }

  /* ================================================================ selectie */
  const sel = $(".selection", root);
  function showSelection(entry) {
    if (!entry) {
      sel.classList.add("hidden");
      return;
    }
    const p = PRINTED.find((x) => x.id === entry.info);
    const x = EXTRA_INFO[entry.info];
    const name = p ? p.name : x?.name || entry.info;
    const text = p ? p.purpose : x?.text || "";
    sel.innerHTML = `<button class="close">×</button><b>${name}</b>${p ? `<span class="chip">${p.qty}× · ${p.material}</span>` : ""}<p>${text}</p>${p ? `<a class="dl" href="${p.file}" download>⤓ ${p.file}</a>` : ""}`;
    sel.classList.remove("hidden");
    sel.querySelector(".close").onclick = () => {
      sel.classList.add("hidden");
      actions.clearSelection();
    };
  }

  /* ================================================================ live-updates */
  const S = (k) => tabs[0].querySelector(`[data-s="${k}"]`);
  let lastBoard = "";
  let lastMode = "";
  function tick(now) {
    S("level").textContent = game.level;
    S("on").textContent = `${popcount(game.lights)}/16`;
    S("presses").textContent = game.presses;
    S("par").textContent = game.par;
    const t = Math.floor(((game.mode === "won" ? game.tSolved : now) - game.tStart) / 1000);
    S("time").textContent = game.mode === "boot" ? "—" : `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    if (game.mode !== lastMode) {
      lastMode = game.mode;
      S("msg").textContent =
        game.mode === "won"
          ? `Opgelost in ${game.presses} drukken (minimaal ${game.par})! Druk op een stick voor level ${game.level}.`
          : game.mode === "boot"
            ? "Opstarten: LED-test 0 → 15…"
            : "Zet alle lampjes uit. Een druk wisselt de gekozen cel en zijn vier buren.";
      S("msg").classList.toggle("won", game.mode === "won");
    }
    const b = game.boardText();
    if (b !== lastBoard) {
      lastBoard = b;
      S("board").textContent = b;
    }
    S("pad").textContent = input.gamepadName ? `Verbonden: ${input.gamepadName.slice(0, 40)}` : "";
  }

  function syncToggles() {
    root.querySelectorAll("[data-toggle]").forEach((b) => b.classList.toggle("on", !!state[b.dataset.toggle]));
    explode.value = state.explodeTarget;
  }

  showTab(0);
  return { tick, syncToggles, showSelection };
}

function tesseractIcon() {
  return `<svg viewBox="0 0 40 40" width="34" height="34"><g fill="none" stroke="#ffd166" stroke-width="1.6"><rect x="4" y="4" width="32" height="32" rx="2"/><rect x="13" y="13" width="14" height="14" rx="1.5"/><path d="M4 4l9 9M36 4l-9 9M4 36l9-9M36 36l-9-9"/></g><g fill="#ffd166"><circle cx="4" cy="4" r="2.6"/><circle cx="36" cy="36" r="2.6"/><circle cx="27" cy="13" r="2.2"/></g></svg>`;
}
