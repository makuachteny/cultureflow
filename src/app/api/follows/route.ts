import { NextResponse } from "next/server";
import { guard } from "@/lib/rate-limit";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(["follow", "unfollow"])
});

export async function POST(req: Request) {
  // Cap spam-tap follow/unfollow toggling.
  const limited = guard(req, "follows", 60, 60000);
  if (limited) return limited;

  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) return gate;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { targetUserId, action } = parsed.data;
  if (targetUserId === gate.userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  if (action === "follow") {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: gate.userId, followingId: targetUserId } },
      update: {},
      create: { followerId: gate.userId, followingId: targetUserId }
    });
  } else {
    await prisma.follow.deleteMany({
      where: { followerId: gate.userId, followingId: targetUserId }
    });
  }
  return NextResponse.json({ ok: true });
}
