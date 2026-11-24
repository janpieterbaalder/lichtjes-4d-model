/**
 * Invoer: toetsenbord, knoppen op het scherm en een echte gamepad (PlayStation via USB/Bluetooth).
 * Alles wordt vertaald naar dezelfde 'sticks' en 'knoppen' als op de Arduino.
 *   as 0 = x (rechts +1)   as 1 = y (omlaag +1)   as 2 = z (achter +1)   as 3 = w (buiten +1)
 */
export class Input {
  constructor(game) {
    this.game = game;
    this.axes = [0, 0, 0, 0];
    this.sources = { key: [0, 0, 0, 0], pad: [0, 0, 0, 0], ui: [0, 0, 0, 0] };
    this.buttons = { L: false, R: false };
    this.btnSources = { key: { L: false, R: false }, pad: { L: false, R: false }, ui: { L: false, R: false } };
    this.gamepadName = null;
    this.enabled = true;
    this.onAny = null;
    const keyAxis = {
      KeyA: [0, -1],
      KeyD: [0, 1],
      KeyW: [1, -1],
      KeyS: [1, 1],
      ArrowUp: [2, 1],
      ArrowDown: [2, -1],
      ArrowLeft: [3, -1],
      ArrowRight: [3, 1],
    };
    const isTyping = (e) => /input|textarea|select/i.test(e.target?.tagName || "");
    window.addEventListener("keydown", (e) => {
      if (!this.enabled || isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const now = performance.now();
      if (keyAxis[e.code]) {
        const [a, v] = keyAxis[e.code];
        this.sources.key[a] = v;
        e.preventDefault();
      } else if (e.code === "Space") {
        this.btnSources.key.L = true;
        e.preventDefault();
      } else if (e.code === "Enter") {
        this.btnSources.key.R = true;
        e.preventDefault();
      } else if (e.code === "KeyH" && !e.repeat) this.game.hint(now);
      else if (e.code === "KeyN" && !e.repeat) this.game.newGame(now);
      else if (e.code === "KeyR" && !e.repeat) this.game.restart(now);
      else return;
      this.onAny?.();
    });
    window.addEventListener("keyup", (e) => {
      if (keyAxis[e.code]) {
        const [a, v] = keyAxis[e.code];
        if (this.sources.key[a] === v) this.sources.key[a] = 0;
      } else if (e.code === "Space") this.btnSources.key.L = false;
      else if (e.code === "Enter") this.btnSources.key.R = false;
    });
    window.addEventListener("blur", () => {
      this.sources.key = [0, 0, 0, 0];
      this.btnSources.key = { L: false, R: false };
    });
    window.addEventListener("gamepadconnected", (e) => (this.gamepadName = e.gamepad.id));
    window.addEventListener("gamepaddisconnected", () => (this.gamepadName = null));
  }

  /** Knop op het scherm: as + waarde, of 'L'/'R' voor indrukken. */
  uiPress(target, value) {
    if (target === "L" || target === "R") this.btnSources.ui[target] = value;
    else this.sources.ui[target[0]] = value ? target[1] : 0;
    this.onAny?.();
  }

  update(now) {
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((p) => p && p.connected);
    if (gp) {
      this.gamepadName = gp.id;
      const dz = (v) => (Math.abs(v) < 0.12 ? 0 : v);
      this.sources.pad = [dz(gp.axes[0] || 0), dz(gp.axes[1] || 0), -dz(gp.axes[3] || 0), dz(gp.axes[2] || 0)];
      const b = (i) => !!gp.buttons[i]?.pressed;
      this.btnSources.pad = { L: b(10) || b(0), R: b(11) || b(1) };
      if (this.sources.pad.some((v) => v) || b(0) || b(1) || b(10) || b(11)) this.onAny?.();
    } else {
      this.sources.pad = [0, 0, 0, 0];
      this.btnSources.pad = { L: false, R: false };
    }
    for (let a = 0; a < 4; a++) {
      const vals = [this.sources.key[a], this.sources.pad[a], this.sources.ui[a]];
      this.axes[a] = vals.reduce((best, v) => (Math.abs(v) > Math.abs(best) ? v : best), 0);
      if (this.enabled) this.game.setAxis(a, this.axes[a]);
    }
    for (const k of ["L", "R"]) {
      const down = this.btnSources.key[k] || this.btnSources.pad[k] || this.btnSources.ui[k];
      if (down !== this.buttons[k]) {
        this.buttons[k] = down;
        if (this.enabled) this.game.setButton(k, down, now);
      }
    }
  }
}
