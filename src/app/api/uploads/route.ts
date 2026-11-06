import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireActiveUser } from "@/lib/auth";
import { hit } from "@/lib/rate-limit";
import { uploader } from "@/lib/storage";

/**
 * Image upload endpoint.
 *
 * Saves uploaded banners under `public/uploads/` so Next serves them at
 * `/uploads/<hash>.<ext>`. Fine for single-server deploys (our Dockerfile
 * path); on a read-only filesystem this needs to swap to object storage.
 *
 * Security notes:
 *   • Extension allow-list — no .svg (would execute inline scripts on
 *     /uploads/*.svg loads), no .html / .js / .php.
 *   • MIME sniffing via magic bytes — we don't trust the `type` the
 *     client sends; a file saved as `.jpg` could carry `<script>` if we
 *     accepted the client's word for it.
 *   • Filename is a 24-hex-char random token; no user-controlled bytes
 *     in the path, so no traversal.
 *   • Size capped at 5 MB pre-read via Content-Length (streaming cap
 *     happens in Next), and post-read before persistence.
 *   • Rate-limited to 30 / hour / user to throttle abuse.
 */

const MAX_BYTES = 5 * 1024 * 1024;

type Allowed = "jpg" | "png" | "webp" | "gif";

const EXT_BY_MIME: Record<string, Allowed> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif"
};

/** Magic-byte signatures for each accepted format. Checking the first
 *  bytes of the buffer rules out a mislabelled script that's been
 *  renamed to .jpg and given the `image/jpeg` MIME client-side. */
function sniffFormat(buf: Buffer): Allowed | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";

  // GIF: 47 49 46 38 (3|3B) 61
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return "gif";

  // WEBP: RIFF........WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";

  return null;
}

export async function POST(req: Request) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const bucket = hit(`upload:${gate.userId}`, 30, 60 * 60 * 1000);
  if (!bucket.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Try again later." },
      { status: 429, headers: { "Retry-After": String(bucket.retryAfter) } }
    );
  }

  // Cheap pre-read bail-out on outrageous payloads. Next itself clamps
  // body size, but an explicit check gives us a clean 413 rather than a
  // generic framework error.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BYTES * 1.1) {
    return NextResponse.json(
      { error: "File is too large. Max 5 MB." },
      { status: 413 }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Max 5 MB." },
      { status: 413 }
    );
  }

  const claimedExt = EXT_BY_MIME[file.type];
  if (!claimedExt) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPG, PNG, WEBP, or GIF." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffFormat(buffer);
  if (!sniffed) {
    return NextResponse.json(
      { error: "File doesn't look like a real image." },
      { status: 400 }
    );
  }
  // Use the sniffed extension — trust magic bytes over the client MIME.
  const ext = sniffed;

  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  const url = await uploader.write(name, buffer, file.type);

  return NextResponse.json({ url });
}
