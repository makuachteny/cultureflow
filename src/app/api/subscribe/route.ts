import { NextResponse } from "next/server";
import { z } from "zod";
import { hit, clientIp } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const gate = hit(`subscribe:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many subscribe attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  let email: string | undefined;
  if (isJson) {
    const body = await req.json().catch(() => ({}));
    email = body?.email;
  } else {
    const form = await req.formData().catch(() => null);
    email = form?.get("email")?.toString();
  }
  const parsed = schema.safeParse({ email });
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  // Placeholder: a real implementation persists to a Subscriber table
  // or forwards to an ESP (Resend / Postmark / Sendgrid). For now we
  // accept the address and record it server-side in dev only.
  if (process.env.NODE_ENV !== "production") {
    log.info("newsletter subscribe", { email: parsed.data.email });
  }
  // JSON clients get a plain 200 + { ok: true }; HTML form submits get
  // a 303 redirect back to the home page with ?subscribed=1 so the UI
  // can show a toast.
  return isJson
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL("/?subscribed=1", req.url), 303);
}
