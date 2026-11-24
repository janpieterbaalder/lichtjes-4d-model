/** Procedurele texturen (canvas) — geen externe afbeeldingen nodig, werkt ook offline. */
import * as THREE from "three";
import { SPEC, breadboardHole } from "../../cad/design.mjs";

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Tegelbare value-noise. */
function noise2(seed, N = 64) {
  const r = rng(seed);
  const g = new Float32Array(N * N);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (x, y) => g[(((y % N) + N) % N) * N + (((x % N) + N) % N)];
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function fbm(n, x, y, oct = 4) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let o = 0; o < oct; o++) {
    s += a * n(x * f, y * f);
    f *= 2;
    a *= 0.5;
  }
  return s;
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function tex(c, { srgb = true, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  return t;
}

function pixelTexture(w, h, fn, opts) {
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return { color: tex(c, opts), canvas: c };
}

/** Werkbankblad: verlijmde beuken stroken (butcher block). Geeft kleur + bump. */
export function woodTextures() {
  const W = 1024;
  const H = 512;
  const n = noise2(11, 64);
  const n2 = noise2(23, 64);
  const strips = 14;
  const stripTone = Array.from({ length: strips }, (_, i) => 0.82 + 0.3 * rng(i * 7 + 3)());
  const heights = new Float32Array(W * H);
  const col = pixelTexture(
    W,
    H,
    (x, y) => {
      const s = Math.floor((y / H) * strips);
      const tone = stripTone[s];
      const u = x / W;
      const v = y / H;
      const warp = fbm(n, u * 8, v * 64 + s * 3, 3) * 6;
      const grain = 0.5 + 0.5 * Math.sin((v * strips * 22 + warp) * Math.PI * 2);
      const fine = fbm(n2, u * 120, v * 8, 2);
      const seam = Math.abs(((y / H) * strips) % 1 - 0) < 0.012 || Math.abs(((y / H) * strips) % 1 - 1) < 0.012 ? 0.7 : 1;
      const k = tone * (0.86 + 0.1 * grain + 0.08 * fine) * seam;
      heights[y * W + x] = grain * 0.6 + fine * 0.4;
      return [Math.min(255, 196 * k), Math.min(255, 148 * k), Math.min(255, 98 * k)];
    },
    { repeat: [1, 1] },
  );
  const bump = pixelTexture(W, H, (x, y) => {
    const v = heights[y * W + x] * 255;
    return [v, v, v];
  }, { srgb: false });
  return { map: col.color, bump: bump.color };
}

export function concreteTexture() {
  const n = noise2(5, 64);
  const n2 = noise2(9, 64);
  const r = rng(77);
  return pixelTexture(512, 512, (x, y) => {
    const u = x / 512;
    const v = y / 512;
    const blot = fbm(n, u * 6, v * 6, 4);
    const fine = fbm(n2, u * 60, v * 60, 2);
    const speck = r() < 0.015 ? -18 : r() < 0.01 ? 14 : 0;
    const k = 112 + blot * 46 + fine * 16 + speck;
    return [k, k * 0.99, k * 0.96];
  }, { repeat: [6, 6] }).color;
}

export function plasterTexture() {
  const n = noise2(31, 64);
  return pixelTexture(512, 512, (x, y) => {
    const u = x / 512;
    const v = y / 512;
    const k = 0.9 + fbm(n, u * 10, v * 10, 4) * 0.12;
    return [218 * k, 213 * k, 202 * k];
  }, { repeat: [4, 2] }).color;
}

/** Gaatjesbord: tegel van 4×4 gaten (25 mm raster). */
export function pegboardTexture() {
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  const n = noise2(41, 32);
  const img = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const k = 0.92 + fbm(n, x / 32, y / 32, 3) * 0.12;
      const i = (y * 256 + x) * 4;
      img.data[i] = 176 * k;
      img.data[i + 1] = 140 * k;
      img.data[i + 2] = 98 * k;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  for (let gy = 0; gy < 4; gy++)
    for (let gx = 0; gx < 4; gx++) {
      const cx = 32 + gx * 64;
      const cy = 32 + gy * 64;
      const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, 9);
      grd.addColorStop(0, "#1a140e");
      grd.addColorStop(0.75, "#2a2016");
      grd.addColorStop(1, "rgba(80,60,40,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  return tex(c, { repeat: [16, 8] });
}

/** Snijmat 600 × 450 mm met raster. */
export function cuttingMatTexture() {
  const W = 1200;
  const H = 900;
  const c = canvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2c6a4e";
  ctx.fillRect(0, 0, W, H);
  const n = noise2(3, 32);
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const y = (i / W) | 0;
    const k = 0.94 + fbm(n, x / 90, y / 90, 3) * 0.1;
    img.data[i * 4] *= k;
    img.data[i * 4 + 1] *= k;
    img.data[i * 4 + 2] *= k;
  }
  ctx.putImageData(img, 0, 0);
  const s = 2; // px per mm
  for (let mmv = 0; mmv <= 600; mmv += 10) {
    ctx.strokeStyle = mmv % 50 === 0 ? "rgba(240,236,180,0.75)" : "rgba(220,230,210,0.35)";
    ctx.lineWidth = mmv % 50 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(mmv * s, 0);
    ctx.lineTo(mmv * s, H);
    ctx.stroke();
  }
  for (let mmv = 0; mmv <= 450; mmv += 10) {
    ctx.strokeStyle = mmv % 50 === 0 ? "rgba(240,236,180,0.75)" : "rgba(220,230,210,0.35)";
    ctx.lineWidth = mmv % 50 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, mmv * s);
    ctx.lineTo(W, mmv * s);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(240,236,180,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(H, 0);
  ctx.stroke();
  ctx.fillStyle = "rgba(240,236,180,0.85)";
  ctx.font = "bold 16px sans-serif";
  for (let mmv = 50; mmv < 600; mmv += 50) ctx.fillText(String(mmv / 10), mmv * s + 4, 18);
  for (let mmv = 50; mmv < 450; mmv += 50) ctx.fillText(String(mmv / 10), 4, mmv * s - 4);
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("SELF-HEALING  A2", W - 260, H - 18);
  return tex(c);
}

/** PEI-printbed (goudkleurig, gespikkeld). */
export function peiTexture() {
  const n = noise2(91, 64);
  const r = rng(5);
  return pixelTexture(512, 512, (x, y) => {
    const k = 0.85 + fbm(n, x / 40, y / 40, 3) * 0.2 + (r() - 0.5) * 0.12;
    return [200 * k, 156 * k, 72 * k];
  }).color;
}

/** Breadboard-bovenkant op exacte maat (10 px/mm), met gaten, rails en opdruk. */
export function breadboardTexture() {
  const B = SPEC.breadboard;
  const s = 10;
  const W = Math.round(B.wid * s);
  const H = Math.round(B.len * s);
  const c = canvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f1eee6";
  ctx.fillRect(0, 0, W, H);
  // middengoot
  ctx.fillStyle = "#d9d5ca";
  ctx.fillRect(W / 2 - 1.2 * s, 0, 2.4 * s, H);
  const toPx = (row, col) => {
    const p = breadboardHole(row, col);
    // u = x (breedte), v = z (lengte; rij 1 boven in de textuur = achterkant)
    return [(p[0] - B.cx + B.wid / 2) * s, (p[2] - B.cz + B.len / 2) * s];
  };
  ctx.fillStyle = "#2b2a28";
  for (let row = 1; row <= 30; row++)
    for (const col of "abcdefghij") {
      const [x, y] = toPx(row, col);
      ctx.fillRect(x - 5, y - 5, 10, 10);
    }
  for (let row = 2; row <= 29; row++) {
    if ((row - 2) % 6 === 5) continue; // groepjes van 5
    for (const col of ["-", "+", "-R", "+R"]) {
      const [x, y] = toPx(row, col);
      ctx.fillRect(x - 5, y - 5, 10, 10);
    }
  }
  // rail-lijnen
  const lines = [
    ["+", "#d32f2f", -1],
    ["-", "#1e5bd6", 1],
    ["+R", "#d32f2f", 1],
    ["-R", "#1e5bd6", -1],
  ];
  for (const [col, color, side] of lines) {
    const [x] = toPx(1, col);
    ctx.fillStyle = color;
    ctx.fillRect(x + side * 9 - 2, 10, 4, H - 20);
  }
  ctx.fillStyle = "#6b6760";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  for (const col of "abcdefghij") {
    const [x] = toPx(1, col);
    ctx.fillText(col, x, 16);
    ctx.fillText(col, x, H - 4);
  }
  ctx.font = "15px sans-serif";
  for (let row = 1; row <= 30; row += row === 1 ? 4 : 5) {
    const [, y] = toPx(row, "a");
    const [xa] = toPx(row, "a");
    const [xj] = toPx(row, "j");
    ctx.fillText(String(row), xa - 16, y + 5);
    ctx.fillText(String(row), xj + 16, y + 5);
  }
  return tex(c, { repeat: [1, 1] });
}

/** Printplaat met opdruk. labels: [{text,x,y,size,align}] in px. */
export function pcbTexture(w, h, color, draw) {
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  const n = noise2(13, 16);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    const k = 0.92 + fbm(n, (i % w) / 30, ((i / w) | 0) / 30, 2) * 0.12;
    img.data[i * 4] *= k;
    img.data[i * 4 + 1] *= k;
    img.data[i * 4 + 2] *= k;
  }
  ctx.putImageData(img, 0, 0);
  draw(ctx, w, h);
  return tex(c);
}

/** Arduino Nano bovenkant (45 × 18 mm → 450 × 180 px), pinnamen zoals op het echte bordje. */
export function nanoTexture() {
  return pcbTexture(180, 432, "#1d58b8", (ctx, w, h) => {
    const left = ["D13", "3V3", "REF", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "5V", "RST", "GND", "VIN"];
    const right = ["D12", "D11", "D10", "D9", "D8", "D7", "D6", "D5", "D4", "D3", "D2", "GND", "RST", "RX0", "TX1"];
    const top = 46;
    for (let i = 0; i < 15; i++) {
      const y = top + i * 25.4;
      for (const x of [14, w - 14]) {
        ctx.fillStyle = "#d4b35a";
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#f4f4f4";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(left[i], 26, y + 4);
      ctx.textAlign = "right";
      ctx.fillText(right[i], w - 26, y + 4);
    }
    ctx.save();
    ctx.translate(w / 2, h / 2 + 40);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#f4f4f4";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NANO V3", 0, 0);
    ctx.font = "12px sans-serif";
    ctx.fillText("ATMEGA328P · CH340", 0, 18);
    ctx.restore();
  });
}

export function joystickPcbTexture() {
  return pcbTexture(340, 260, "#1b3f8f", (ctx, w, h) => {
    ctx.fillStyle = "#f2f2f2";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("KY-023", 14, 26);
    const pins = ["GND", "+5V", "VRx", "VRy", "SW"];
    ctx.font = "bold 13px sans-serif";
    pins.forEach((p, i) => {
      const y = 70 + i * 25;
      ctx.fillStyle = "#d4b35a";
      ctx.fillRect(w - 34, y - 8, 22, 16);
      ctx.fillStyle = "#f2f2f2";
      ctx.textAlign = "right";
      ctx.fillText(p, w - 40, y + 5);
    });
    ctx.textAlign = "left";
    for (const [x, y] of [
      [16, 16],
      [w - 16, 16],
      [16, h - 16],
      [w - 16, h - 16],
    ]) {
      ctx.fillStyle = "#d4b35a";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function ledPcbTexture() {
  return pcbTexture(128, 128, "#121212", (ctx, w) => {
    ctx.fillStyle = "#d4b35a";
    for (const [x, y] of [
      [26, 40],
      [26, 64],
      [26, 88],
      [102, 40],
      [102, 64],
      [102, 88],
    ])
      ctx.fillRect(x - 10, y - 7, 20, 14);
    ctx.fillStyle = "#eee";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("DIN", 8, 22);
    ctx.fillText("DOUT", 80, 22);
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("→", w / 2 - 10, 118);
  });
}

/** Laptopscherm met de firmware in een Arduino-IDE-achtige donkere editor. */
export function codeScreenTexture(code) {
  const W = 1280;
  const H = 820;
  const c = canvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1f2329";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#0f7f86";
  ctx.fillRect(0, 0, W, 54);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("✓  →   Arduino Nano  ▾", 22, 36);
  ctx.fillStyle = "#2a2f37";
  ctx.fillRect(0, 54, W, 40);
  ctx.fillStyle = "#e6e6e6";
  ctx.font = "20px sans-serif";
  ctx.fillText("lichtjes4d.ino", 26, 81);
  const lines = code.split("\n");
  const start = Math.max(0, lines.findIndex((l) => l.includes("SPELREGELS")) - 1);
  const kw = /\b(uint16_t|uint8_t|int8_t|int|bool|void|return|for|if|else|const|struct|switch|case|break|while|unsigned|long|enum)\b/g;
  ctx.font = "21px Consolas, 'Courier New', monospace";
  for (let i = 0; i < 30; i++) {
    const line = lines[start + i] ?? "";
    const y = 128 + i * 23.5;
    ctx.fillStyle = "#5b6370";
    ctx.textAlign = "right";
    ctx.fillText(String(start + i + 1), 60, y);
    ctx.textAlign = "left";
    let x = 80;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      ctx.fillStyle = "#7f9a6a";
      ctx.fillText(line, x, y);
      continue;
    }
    // eenvoudige kleuring: sleutelwoorden blauw, getallen groen, rest licht
    const parts = line.split(/(\b(?:uint16_t|uint8_t|int8_t|int|bool|void|return|for|if|else|const|struct|switch|case|break|while|unsigned|long|enum)\b|\b\d+u?\b|"[^"]*"|\/\/.*$)/);
    for (const p of parts) {
      if (!p) continue;
      if (kw.test(p)) ctx.fillStyle = "#5fa8ff";
      else if (/^\d+u?$/.test(p)) ctx.fillStyle = "#b5e08a";
      else if (p.startsWith('"')) ctx.fillStyle = "#e7a36b";
      else if (p.startsWith("//")) ctx.fillStyle = "#7f9a6a";
      else ctx.fillStyle = "#dcdcdc";
      kw.lastIndex = 0;
      ctx.fillText(p, x, y);
      x += ctx.measureText(p).width;
    }
  }
  ctx.fillStyle = "#15181c";
  ctx.fillRect(0, H - 76, W, 76);
  ctx.fillStyle = "#8fd18f";
  ctx.font = "19px Consolas, monospace";
  ctx.fillText("Sketch uses 25356 bytes (82%) of program storage space.", 20, H - 44);
  ctx.fillText("Done uploading.", 20, H - 18);
  return tex(c, { aniso: 4 });
}

/** Kleine tekstlabels als textuur (bijv. voor spoelen/doosjes). */
export function labelTexture(text, { w = 256, h = 96, bg = "#f4f1ea", fg = "#222", font = "bold 34px sans-serif" } = {}) {
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2);
  return tex(c);
}

/** Lucht achter het raam. */
export function skyTexture() {
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#9cc3ec");
  g.addColorStop(0.6, "#d7e8f6");
  g.addColorStop(0.62, "#7d9a6b");
  g.addColorStop(1, "#5d7a4e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return tex(c);
}
