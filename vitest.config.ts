import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest config.
 *
 * Without this file Vitest doesn't honour the `@/*` path alias from
 * tsconfig.json, so any test that imports through `@/lib/...` fails
 * with "Failed to load url". Mirroring the alias here means library
 * code can keep using `@/` and still be testable.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  test: {
    environment: "node",
    globals: true,
    /* Stub the env vars `src/lib/env.ts` requires so unit tests don't
       need a real .env. The production-safety assertions in env.ts are
       skipped when NODE_ENV !== "production", which is the default
       under vitest. */
    env: {
      DATABASE_URL:    "postgres://test:test@localhost:5432/test",
      NEXTAUTH_SECRET: "test-secret-that-is-at-least-thirty-two-chars",
      NODE_ENV:        "test"
    }
  }
});
