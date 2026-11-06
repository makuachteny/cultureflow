#!/usr/bin/env node
/**
 * Regenerates the public brand SVGs whenever `brand.config.json` is
 * saved. Run alongside `npm run dev` in a second terminal:
 *
 *   $ npm run brand:watch
 *   watching brand.config.json …
 *
 * A single save in your editor triggers a full rebuild of the five
 * public SVG files, and Next's dev server reloads the pages that
 * import them. Strings that live in React (BRAND_NAME, tagline, etc.)
 * re-render automatically via Next HMR — you don't need this watcher
 * for those.
 */

import { watch } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, "..");
const CONFIG    = join(ROOT, "brand.config.json");
const BUILDER   = join(__dirname, "build-brand-svgs.mjs");

function rebuild(reason) {
  const child = spawn("node", [BUILDER], { stdio: ["ignore", "pipe", "pipe"], cwd: ROOT });
  let out = "";
  child.stdout.on("data", (d) => { out += d.toString(); });
  child.stderr.on("data", (d) => { process.stderr.write(d); });
  child.on("close", (code) => {
    const stamp = new Date().toLocaleTimeString();
    if (code === 0) {
      const lastLine = out.trim().split("\n").pop();
      console.log(`[${stamp}] ${reason} → ${lastLine}`);
    } else {
      console.error(`[${stamp}] ${reason} → build failed (exit ${code})`);
    }
  });
}

// Initial build so anyone running `brand:watch` alone still has fresh
// SVGs even without a save.
rebuild("initial");

// Debounce — editors often emit multiple events per save (truncate, write).
let pending = null;
watch(CONFIG, (event) => {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => rebuild(`brand.config.json ${event}`), 120);
});

console.log(`watching ${CONFIG} …`);
console.log("press Ctrl+C to stop.");
