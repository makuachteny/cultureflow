import fs from "node:fs";
import path from "node:path";
import type { PGlite as PGliteType } from "@electric-sql/pglite";
import type { PrismaPGlite as PrismaPGliteType } from "pglite-prisma-adapter";

/**
 * Embedded demo database (DEMO_DB=pglite).
 *
 * Boots an in-process Postgres (PGlite, WASM) from the seeded snapshot
 * produced at build time by `scripts/build-demo-db.ts`. Each serverless
 * instance gets its own copy: reads always work, writes last only until
 * that instance is recycled. Intended for demos, never for real data.
 *
 * PGlite and its Prisma adapter are loaded with Node's own `require`
 * (their CJS builds) rather than `import`: a static import of PGlite's
 * ESM entry turns every module that touches the DB into an async
 * webpack module, which breaks NextAuth's `auth()` export through an
 * import cycle. The packages are added to the serverless bundle via
 * `outputFileTracingIncludes` in next.config.mjs.
 */
export const DEMO_SNAPSHOT = path.join(process.cwd(), "prisma", "demo", "demo-db.tar.gz");

// Webpack rewrites `require`/`createRequire`; `__non_webpack_require__`
// compiles to Node's real `require`. Fall back to plain `require` when
// this file runs outside webpack (e.g. under tsx).
declare const __non_webpack_require__: NodeRequire | undefined;
const nodeRequire: NodeRequire =
  typeof __non_webpack_require__ === "function" ? __non_webpack_require__ : require;

export function createDemoAdapter(): PrismaPGliteType {
  if (!fs.existsSync(DEMO_SNAPSHOT)) {
    throw new Error(
      `[demo-db] Snapshot not found at ${DEMO_SNAPSHOT}. ` +
        "Run `npm run demo:db` (it also runs automatically during `npm run build` when DEMO_DB=pglite)."
    );
  }
  const { PGlite } = nodeRequire("@electric-sql/pglite") as { PGlite: typeof PGliteType };
  const { PrismaPGlite } = nodeRequire("pglite-prisma-adapter") as {
    PrismaPGlite: typeof PrismaPGliteType;
  };

  const snapshot = new Blob([fs.readFileSync(DEMO_SNAPSHOT)]);
  const pg = new PGlite({ loadDataDir: snapshot });
  return new PrismaPGlite(pg);
}
