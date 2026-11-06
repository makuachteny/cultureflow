/**
 * Structured logger.
 *
 * Emits one JSON object per line with: level, msg, ts, plus any caller
 * context fields. Dev mode also pretty-prints a colored line for humans.
 *
 * Replaces scattered `console.error` / `console.warn` so production
 * log aggregation (Datadog, Loki, CloudWatch) can parse every line.
 *
 * Usage:
 *   import { log } from "@/lib/logger";
 *
 *   log.info("user signed in",   { userId });
 *   log.warn("low capacity",     { eventId, remaining });
 *   log.error("webhook failed",  { err: String(err), sessionId });
 *
 * Design notes:
 *   • Never logs secrets. Callers must redact tokens / passwords.
 *   • Never logs the full Stripe event payload — IDs and type are fine.
 *   • In dev, errors print a human-readable line; JSON line always emits
 *     for pipe scraping.
 */

type Level = "debug" | "info" | "warn" | "error";

const PRIORITY: Record<Level, number> = {
  debug: 10, info: 20, warn: 30, error: 40
};

const LEVEL_ENV = (process.env.LOG_LEVEL ?? "").toLowerCase() as Level | "";
const MIN_LEVEL: Level = ["debug", "info", "warn", "error"].includes(LEVEL_ENV)
  ? (LEVEL_ENV as Level)
  : (process.env.NODE_ENV === "production" ? "info" : "debug");

const IS_DEV = process.env.NODE_ENV !== "production";

type Context = Record<string, unknown>;

function emit(level: Level, msg: string, ctx?: Context) {
  if (PRIORITY[level] < PRIORITY[MIN_LEVEL]) return;

  const line = { level, msg, ts: new Date().toISOString(), ...ctx };
  // A single stream per process — stdout — so orchestrators can tail it.
  // Writing JSON is deliberate: any log aggregator can parse it.
  process.stdout.write(JSON.stringify(line) + "\n");

  // Humans in dev get a second, legible line. Skipped in prod to keep
  // log volume predictable.
  if (IS_DEV) {
    const color =
      level === "error" ? "\x1b[31m" :
      level === "warn"  ? "\x1b[33m" :
      level === "info"  ? "\x1b[36m" :
                          "\x1b[90m";
    const tag = `${color}${level.toUpperCase().padEnd(5)}\x1b[0m`;
    const fields = ctx && Object.keys(ctx).length > 0
      ? " " + Object.entries(ctx).map(([k, v]) => `${k}=${fmt(v)}`).join(" ")
      : "";
    process.stderr.write(`${tag} ${msg}${fields}\n`);
  }
}

function fmt(v: unknown): string {
  if (typeof v === "string") return v.length > 200 ? v.slice(0, 200) + "…" : v;
  if (v instanceof Error)    return v.message;
  try   { return JSON.stringify(v); }
  catch { return String(v); }
}

export const log = {
  debug: (msg: string, ctx?: Context) => emit("debug", msg, ctx),
  info:  (msg: string, ctx?: Context) => emit("info",  msg, ctx),
  warn:  (msg: string, ctx?: Context) => emit("warn",  msg, ctx),
  error: (msg: string, ctx?: Context) => emit("error", msg, ctx)
};
