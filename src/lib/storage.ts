/**
 * Object storage adapter.
 *
 * The `uploader` exported from this module has a single concrete
 * implementation today — local disk under `public/uploads/` — but the
 * interface is identical to the shape an S3 / R2 / GCS driver would
 * take, so switching storage backends is a one-file change (drop a
 * new driver into `drivers/` and flip `STORAGE_DRIVER` in env).
 *
 * Why factor it out now: local-disk writes break in any deploy target
 * that has a read-only or ephemeral filesystem (Vercel, Netlify, most
 * serverless platforms). Keeping the write path behind an interface
 * means the prod fix is swap-a-driver, not refactor-every-call-site.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface StorageDriver {
  /** Persist the bytes and return a public URL path. */
  write(key: string, body: Buffer, contentType: string): Promise<string>;
  /** Human-readable name for logs / error messages. */
  readonly name: string;
}

/* ─────────────────────── Local disk driver ─────────────────────── */

class LocalDiskDriver implements StorageDriver {
  readonly name = "local-disk";
  private readonly root: string;
  private readonly publicPrefix: string;

  constructor() {
    this.root = path.join(process.cwd(), "public", "uploads");
    this.publicPrefix = "/uploads";
  }

  async write(key: string, body: Buffer, _contentType: string): Promise<string> {
    await mkdir(this.root, { recursive: true });
    await writeFile(path.join(this.root, key), body);
    return `${this.publicPrefix}/${key}`;
  }
}

/* ─────────────────────── S3 driver (stub) ──────────────────────
   To enable, install `@aws-sdk/client-s3`, drop this stub for a real
   implementation, and set STORAGE_DRIVER=s3. Leaving the stub in the
   file so the shape is documented; it throws loudly if selected
   without being implemented. */

class S3Driver implements StorageDriver {
  readonly name = "s3";
  async write(_key: string, _body: Buffer, _contentType: string): Promise<string> {
    throw new Error(
      "[storage] S3 driver isn't implemented yet. Install @aws-sdk/client-s3, " +
      "fill in this class, and set S3_BUCKET + S3_REGION + AWS credentials."
    );
  }
}

/* ─────────────────────── Resolver ────────────────────────── */

function pickDriver(): StorageDriver {
  const which = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  switch (which) {
    case "local": return new LocalDiskDriver();
    case "s3":    return new S3Driver();
    default:
      throw new Error(`[storage] Unknown STORAGE_DRIVER="${which}". Use "local" or "s3".`);
  }
}

export const uploader: StorageDriver = pickDriver();
