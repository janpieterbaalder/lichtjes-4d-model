/**
 * Vercel: zet de (al gebouwde) statische site in public/. Geen npm install nodig.
 * Lokaal gewoon index.html openen; dit script is alleen voor de online versie.
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const p of ["index.html", "app", "stl", "firmware", "wokwi", "docs", "README.md"]) cpSync(join(root, p), join(out, p), { recursive: true });
console.log("public/ klaar");
