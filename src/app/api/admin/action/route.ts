import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["user", "event", "comment"]),
  id: z.string().min(1),
  action: z.enum(["suspend", "unsuspend", "feature", "unfeature", "publish", "unlist", "hide_comment"]),
  reason: z.string().max(500).optional()
});

export async function POST(req: Request) {
  // Admin writes — defence-in-depth alongside role check.
  const limited = guard(req, "admin-action", 30, 60000);
  if (limited) return limited;

  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { kind, id, action, reason } = parsed.data;

  if (kind === "user") {
    if (action === "suspend")    await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
    if (action === "unsuspend")  await prisma.user.update({ where: { id }, data: { status: "ACTIVE"    } });
  } else if (kind === "event") {
    if (action === "feature")    await prisma.event.update({ where: { id }, data: { featured: true  } });
    if (action === "unfeature")  await prisma.event.update({ where: { id }, data: { featured: false } });
    if (action === "publish")    await prisma.event.update({ where: { id }, data: { status: "PUBLISHED" } });
    if (action === "unlist")     await prisma.event.update({ where: { id }, data: { status: "DRAFT"     } });
  } else if (kind === "comment") {
    if (action === "hide_comment") await prisma.comment.update({ where: { id }, data: { status: "HIDDEN" } });
  }

  await prisma.moderationLog.create({
    data: { adminId: gate.userId, action: `${kind}_${action}`, targetId: id, reason }
  });

  return NextResponse.json({ ok: true });
}
