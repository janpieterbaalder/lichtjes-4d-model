/**
 * Simulatie van de firmware (firmware/lichtjes4d/lichtjes4d.ino), regel voor regel nagebouwd:
 * zelfde spelregels, drempels, tijden, LED-standen en schermen. Zo test je in de 3D-werkplaats
 * precies wat de Arduino straks doet. Geen DOM-code hier: ook bruikbaar in Node (scripts/test-logic.mjs).
 */
export const CHAIN = [2, 3, 1, 0, 4, 5, 7, 6, 14, 15, 13, 12, 8, 9, 11, 10];
export const PIXEL_OF = (() => {
  const p = [];
  CHAIN.forEach((c, k) => (p[c] = k));
  return p;
})();

export const FW = {
  COLOR: [255, 209, 102],
  LEVEL_ON: 96,
  LEVEL_CURSOR: 255,
  LEVEL_BREATH_MIN: 20,
  MAX_BRIGHTNESS: 160,
  STICK_ON: 300,
  STICK_OFF: 150,
  DEBOUNCE_MS: 25,
  HINT_MS: 800,
  NEWGAME_MS: 1500,
  MAX_LEVEL: 8,
};

export function popcount(v) {
  let n = 0;
  while (v) {
    v &= v - 1;
    n++;
  }
  return n;
}

export function tri8(phase) {
  phase &= 511;
  return phase < 256 ? phase : 511 - phase;
}

/** Adafruit NeoPixel gamma8 (γ ≈ 2,6). */
export function gamma8(x) {
  return Math.round(Math.pow(x / 255, 2.6) * 255);
}

export class Lichtjes4D {
  constructor({ now = 0, random = Math.random } = {}) {
    this.random = random;
    this.cursorStyle = 1;
    this.neighborRule = true;
    this.mode = "boot";
    this.tMode = now;
    this.lights = 0;
    this.startLights = 0;
    this.cursor = 0;
    this.par = 0;
    this.level = 1;
    this.hints = 0;
    this.presses = 0;
    this.tStart = now;
    this.tSolved = 0;
    this.hintFlashUntil = 0;
    this.armed = [true, true, true, true];
    this.btn = { L: false, R: false };
    this.anyDown = false;
    this.chord = false;
    this.consumed = false;
    this.tDown = 0;
    this.listeners = [];
    this.log = [];
  }

  on(fn) {
    this.listeners.push(fn);
  }
  emit(type, data) {
    for (const fn of this.listeners) fn(type, data);
  }

  pressMask(c) {
    if (!this.neighborRule) return 1 << c;
    return (1 << c) | (1 << (c ^ 1)) | (1 << (c ^ 2)) | (1 << (c ^ 4)) | (1 << (c ^ 8));
  }

  /** De drukmatrix is zijn eigen inverse: cel j drukken ⇔ (lampjes ∩ masker(j)) oneven. */
  solution(L = this.lights) {
    if (!this.neighborRule) return L;
    let sol = 0;
    for (let j = 0; j < 16; j++) if (popcount(L & this.pressMask(j)) & 1) sol |= 1 << j;
    return sol;
  }

  newPuzzle(now) {
    const k = Math.min(this.level + 2, 10);
    const cells = [...Array(16).keys()];
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(this.random() * (16 - i));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    this.lights = 0;
    for (let i = 0; i < k; i++) this.lights ^= this.pressMask(cells[i]);
    this.par = popcount(this.solution(this.lights));
    this.startLights = this.lights;
    this.presses = 0;
    this.hints = 0;
    this.tStart = now;
    this.mode = "play";
    this.emit("new");
  }

  restart(now) {
    this.lights = this.startLights;
    this.presses = 0;
    this.hints = 0;
    this.mode = "play";
    this.tStart = now;
    this.emit("new");
  }

  move(axis, val, now) {
    if (this.mode !== "play") return;
    const bit = 1 << axis;
    const next = val ? this.cursor | bit : this.cursor & ~bit;
    if (next === this.cursor) {
      this.emit("bump");
      return;
    }
    this.cursor = next;
    this.hintFlashUntil = 0;
    this.emit("move", { axis, val });
  }

  press(now) {
    if (this.mode === "won") {
      this.newPuzzle(now);
      return;
    }
    if (this.mode !== "play") return;
    this.lights ^= this.pressMask(this.cursor);
    this.presses++;
    this.hintFlashUntil = 0;
    if (this.lights === 0) {
      this.mode = "won";
      this.tSolved = now;
      if (this.level < FW.MAX_LEVEL) this.level++;
      this.emit("win");
    } else this.emit("press");
  }

  hint(now) {
    if (this.mode !== "play") return;
    const sol = this.solution();
    if (!sol) return;
    let best = -1;
    let bestD = 99;
    for (let c = 0; c < 16; c++)
      if ((sol >> c) & 1) {
        const d = popcount(c ^ this.cursor);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    this.cursor = best;
    this.hints++;
    this.hintFlashUntil = now + 1200;
    this.emit("hint", { cell: best, left: popcount(sol) });
  }

  newGame(now) {
    this.newPuzzle(now);
  }

  /* ---- sticks: value in −1..1 (rechts/omlaag/achter/buiten = +1) */
  setAxis(axis, value) {
    const d = value * 512;
    if (this.armed[axis]) {
      if (d > FW.STICK_ON) {
        this.armed[axis] = false;
        this.move(axis, 1);
      } else if (d < -FW.STICK_ON) {
        this.armed[axis] = false;
        this.move(axis, 0);
      }
    } else if (Math.abs(d) < FW.STICK_OFF) this.armed[axis] = true;
  }

  /* ---- knoppen (al ontdenderd): zelfde toestandsmachine als handleButtons() */
  setButton(which, down, now) {
    this.btn[which] = down;
    this.buttons(now);
  }

  buttons(now) {
    const l = this.btn.L;
    const r = this.btn.R;
    if (!this.anyDown && (l || r)) {
      this.anyDown = true;
      this.chord = false;
      this.consumed = false;
      this.tDown = now;
    }
    if (l && r) this.chord = true;
    if (this.anyDown && !l && !r) {
      this.anyDown = false;
      if (!this.consumed && !this.chord && now - this.tDown < FW.HINT_MS) this.press(now);
      return;
    }
    if (this.anyDown && !this.consumed) {
      if (l && r && now - this.tDown >= FW.NEWGAME_MS) {
        this.consumed = true;
        this.newGame(now);
      } else if (!this.chord && now - this.tDown >= FW.HINT_MS) {
        this.consumed = true;
        this.hint(now);
      }
    }
  }

  tick(now) {
    if (this.mode === "boot" && now - this.tMode > 1700) this.newPuzzle(now);
    if (this.mode === "play" || this.mode === "won") this.buttons(now);
  }

  /** Helderheid per cel (0..255, vóór gamma), exact zoals renderLeds(). */
  levels(now) {
    const out = new Array(16).fill(0);
    for (let c = 0; c < 16; c++) {
      const on = (this.lights >> c) & 1;
      let lvl = 0;
      if (this.mode === "play") {
        if (c === this.cursor) {
          if (now < this.hintFlashUntil) lvl = Math.floor(now / 90) & 1 ? FW.LEVEL_CURSOR : 0;
          else if (on || this.cursorStyle === 0) lvl = FW.LEVEL_CURSOR;
          else lvl = FW.LEVEL_BREATH_MIN + Math.floor(((FW.LEVEL_CURSOR - FW.LEVEL_BREATH_MIN) * tri8(Math.floor(now / 2))) / 255);
        } else lvl = on ? FW.LEVEL_ON : 0;
      } else if (this.mode === "won") {
        const t = now - this.tSolved;
        if (t < 2600) lvl = Math.floor((tri8(Math.floor(t / 2) + PIXEL_OF[c] * 32) * 180) / 255);
        else lvl = 24 + Math.floor((tri8(Math.floor(t / 4)) * 70) / 255);
      }
      out[c] = lvl;
    }
    if (this.mode === "boot") {
      const t = now - this.tMode;
      for (let k = 0; k < 16; k++) {
        let lvl = 0;
        if (t > k * 70) lvl = t < k * 70 + 140 ? 255 : t < 1400 ? FW.LEVEL_ON : 0;
        out[CHAIN[k]] = lvl;
      }
    }
    return out;
  }

  /** Lichtsterkte zoals het oog hem ziet (0..1): gamma + helderheidsbegrenzing van de firmware. */
  intensity(lvl) {
    return (gamma8(lvl) / 255) * (FW.MAX_BRIGHTNESS / 255);
  }

  boardText() {
    const rows = [];
    rows.push(`Level ${this.level} | aan ${popcount(this.lights)} | gedrukt ${this.presses} (min ${this.par}) | cel ${this.cursor}`);
    rows.push("           binnen (w0)              buiten (w1)");
    rows.push("        voor      achter         voor      achter");
    for (let y = 0; y < 2; y++) {
      let s = y ? " onder " : " boven ";
      for (let w = 0; w < 2; w++) {
        for (let z = 0; z < 2; z++) {
          for (let x = 0; x < 2; x++) {
            const c = x | (y << 1) | (z << 2) | (w << 3);
            const on = (this.lights >> c) & 1;
            s += (c === this.cursor ? "[" : " ") + (on ? "#" : ".") + (c === this.cursor ? "]" : " ");
          }
          s += "    ";
        }
        s += "   ";
      }
      rows.push(s);
    }
    return rows.join("\n");
  }
}

/** OLED-scherm 128×64 tekenen op een canvas-context (zelfde indeling als renderOled()). */
export function drawOled(ctx, g, now) {
  const W = 128;
  const H = 64;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#d8ecff";
  ctx.strokeStyle = "#d8ecff";
  ctx.textBaseline = "top";
  const font = (size) => (ctx.font = `${size === 2 ? 16 : 8}px "Courier New", monospace`);
  const txt = (s, x, y, size = 1) => {
    font(size);
    const cw = size === 2 ? 12 : 6;
    for (let i = 0; i < s.length; i++) ctx.fillText(s[i], x + i * cw, y + (size === 2 ? 0 : 0));
  };
  const time = (ms) => {
    let s = Math.floor(ms / 1000);
    if (s > 5999) s = 5999;
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };
  if (g.mode === "boot") {
    txt("LICHTJES", 0, 6, 2);
    txt("4D", 0, 26, 2);
    txt("LED-test 0..15", 0, 52);
  } else if (g.mode === "play") {
    txt(`LICHTJES 4D   Lv ${g.level}`, 0, 0);
    ctx.fillRect(0, 9, 128, 1);
    txt(`Aan  ${popcount(g.lights)}/16`, 0, 14);
    txt(`Druk ${g.presses}`, 0, 24);
    txt(`Min  ${g.par}`, 0, 34);
    txt(`Tijd ${time(now - g.tStart)}`, 0, 44);
    const c = g.cursor;
    txt(`x${c & 1}y${(c >> 1) & 1}z${(c >> 2) & 1}w${(c >> 3) & 1}`, 0, 56);
    for (let i = 0; i < 16; i++) {
      const x = i & 1;
      const y = (i >> 1) & 1;
      const z = (i >> 2) & 1;
      const w = (i >> 3) & 1;
      const px = 79 + w * 26 + x * 11;
      const py = 13 + z * 26 + y * 11;
      const on = (g.lights >> i) & 1;
      if (on) ctx.fillRect(px, py, 10, 10);
      else ctx.strokeRect(px + 0.5, py + 0.5, 9, 9);
      if (i === g.cursor && Math.floor(now / 250) & 1) {
        ctx.fillStyle = on ? "#000" : "#d8ecff";
        ctx.fillRect(px + 3, py + 3, 4, 4);
        ctx.fillStyle = "#d8ecff";
      }
    }
  } else if (g.mode === "won") {
    txt("OPGELOST!", 10, 2, 2);
    txt(`${g.presses} drukken (min ${g.par})`, 0, 26);
    txt(`Tijd ${time(g.tSolved - g.tStart)}  hints ${g.hints}`, 0, 38);
    txt(`Druk = level ${g.level}`, 0, 54);
  }
}

/** Geluiden van de zoemer (frequentie Hz, duur ms), zelfde als in de firmware. */
export const SOUNDS = {
  move: [[1800, 12]],
  bump: [[180, 45]],
  press: [
    [988, 28],
    [1319, 40],
  ],
  hint: [
    [1568, 50],
    [0, 40],
    [1568, 50],
  ],
  new: [
    [784, 60],
    [1047, 80],
  ],
  win: [
    [1047, 110],
    [1319, 110],
    [1568, 110],
    [2093, 260],
    [0, 60],
    [1568, 90],
    [2093, 380],
  ],
};
