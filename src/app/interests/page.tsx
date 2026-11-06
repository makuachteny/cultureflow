import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORIES } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Interests"
};

async function updateInterests(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/interests");

  const validKeys: ReadonlySet<string> = new Set(CATEGORIES.map((c) => c.key));
  // Filter the form's multi-checkbox payload through the allow-list so a
  // tampered POST can't stuff arbitrary strings into the interests[] column.
  const picked = formData
    .getAll("interest")
    .map((v) => String(v))
    .filter((v) => validKeys.has(v));

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { interests: Array.from(new Set(picked)) }
  });

  revalidatePath("/interests");
  revalidatePath("/");
  redirect("/interests?saved=1");
}

export default async function InterestsPage({
  searchParams
}: {
  searchParams?: { saved?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/interests");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { interests: true }
  });
  const current = new Set(user?.interests ?? []);
  const saved = searchParams?.saved === "1";

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-[28px] font-bold text-nile-900">Interests</h1>
        <p className="mt-1 text-[14px] text-ink-600">
          Pick the categories you care about. We&apos;ll surface matching
          events on your home feed and in your notifications.
        </p>
      </header>

      <form action={updateInterests}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const on = current.has(c.key);
            return (
              <label
                key={c.key}
                className={
                  "flex items-start gap-3 rounded-md border bg-white px-4 py-3 cursor-pointer transition-colors " +
                  (on
                    ? "border-nile bg-nile-50/40"
                    : "border-[color:var(--border-hairline)] hover:border-nile-200")
                }
              >
                <input
                  type="checkbox"
                  name="interest"
                  value={c.key}
                  defaultChecked={on}
                  className="mt-0.5 h-5 w-5 accent-nile"
                />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink-900">{c.label}</span>
                  <span className="block text-[12px] text-ink-600 line-clamp-2">{c.blurb}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-end gap-4">
          {saved && (
            <span role="status" className="text-sm font-semibold text-acacia-600">
              Saved ✓
            </span>
          )}
          <button type="submit" className="btn btn-primary">
            Save interests
          </button>
        </div>
      </form>
    </div>
  );
}
