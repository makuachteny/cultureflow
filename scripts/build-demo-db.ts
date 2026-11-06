/**
 * Builds the embedded demo database snapshot used when DEMO_DB=pglite.
 *
 *   1. Starts an empty in-memory PGlite (Postgres in WASM).
 *   2. Applies every Prisma migration in prisma/migrations, in order.
 *   3. Runs prisma/seed.ts against it.
 *   4. Writes the data directory to prisma/demo/demo-db.tar.gz.
 *
 * Run manually with `npm run demo:db`. `npm run build` calls it with
 * `--if-demo`, which is a no-op unless DEMO_DB=pglite.
 */
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";

async function run() {
  if (process.argv.includes("--if-demo") && (process.env.DEMO_DB ?? "").toLowerCase() !== "pglite") {
    console.log("[demo-db] DEMO_DB is not 'pglite' — skipping snapshot build.");
    return;
  }

  const root = process.cwd();
  const migrationsDir = path.join(root, "prisma", "migrations");
  const outFile = path.join(root, "prisma", "demo", "demo-db.tar.gz");

  const pg = new PGlite();
  await pg.waitReady;

  const migrations = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const name of migrations) {
    // Drop any box-drawing CLI banner (e.g. Prisma's "Update available"
    // notice) that was captured into a migration file by accident.
    const sql = fs
      .readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8")
      .split("\n")
      .filter((line) => !/^[┌│└]/.test(line))
      .join("\n");
    await pg.exec(sql);
    console.log(`[demo-db] applied ${name}`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) });
  (globalThis as { __seedPrisma?: PrismaClient }).__seedPrisma = prisma;
  const { seeded } = await import("../prisma/seed");
  await seeded;

  const dump = await pg.dumpDataDir("gzip");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.from(await dump.arrayBuffer()));
  console.log(`[demo-db] wrote ${path.relative(root, outFile)} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);

  await prisma.$disconnect();
  await pg.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
