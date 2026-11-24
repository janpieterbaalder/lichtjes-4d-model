/**
 * Bundelt de 3D-werkplaats (web/src) tot één gewoon script app/app.js (IIFE, inclusief three.js),
 * zodat index.html ook werkt als je hem gewoon dubbelklikt (file://) — geen server nodig.
 */
import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "app"), { recursive: true });
copyFileSync(join(root, "web", "style.css"), join(root, "app", "style.css"));

const watch = process.argv.includes("--watch");
const opts = {
  entryPoints: [join(root, "web", "src", "main.js")],
  outfile: join(root, "app", "app.js"),
  bundle: true,
  format: "iife",
  target: ["es2020"],
  minify: !watch,
  sourcemap: false,
  legalComments: "none",
  loader: { ".ino": "text" },
  logLevel: "info",
};
await build(opts);
