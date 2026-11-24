/** Piëzo-zoemer nagebootst met WebAudio (blokgolf, zelfde tonen als de firmware). */
export class Buzzer {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.t = 0;
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  play(notes) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    let t = Math.max(this.ctx.currentTime + 0.005, this.t);
    for (const [f, ms] of notes) {
      const d = ms / 1000;
      if (f) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "square";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.045, t + 0.003);
        g.gain.setValueAtTime(0.045, t + Math.max(0.004, d - 0.006));
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(this.ctx.destination);
        o.start(t);
        o.stop(t + d + 0.01);
      }
      t += d + 0.008;
    }
    this.t = t;
  }
}
