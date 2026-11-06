import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Field from "@/components/ui/Field";
import PageTitle from "../_parts/PageTitle";
import SavedPill from "../_parts/SavedPill";

async function updateContactInfo(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/contact-info");

  const name    = String(formData.get("name")    ?? "").trim().slice(0, 80);
  const bio     = String(formData.get("bio")     ?? "").trim().slice(0, 600);
  const city    = String(formData.get("city")    ?? "").trim().slice(0, 80);
  const country = String(formData.get("country") ?? "").trim().slice(0, 80);
  const tribe   = String(formData.get("tribe")   ?? "").trim().slice(0, 40);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name } : {}),
      bio:     bio     || null,
      city:    city    || null,
      country: country || null,
      tribe:   tribe   || null
    }
  });

  revalidatePath("/account/contact-info");
  redirect("/account/contact-info?saved=1");
}

export default async function ContactInfoPage({
  searchParams
}: {
  searchParams?: { saved?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account/contact-info");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in");

  const saved = searchParams?.saved === "1";

  return (
    <>
      <PageTitle>Contact Info</PageTitle>
      <form action={updateContactInfo} className="max-w-2xl space-y-4">
        <Field label="First name / display name">
          <input
            name="name"
            defaultValue={user.name ?? ""}
            maxLength={80}
            className="input"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City">
            <input
              name="city"
              defaultValue={user.city ?? ""}
              maxLength={80}
              className="input"
              placeholder="London"
            />
          </Field>
          <Field label="Country">
            <input
              name="country"
              defaultValue={user.country ?? ""}
              maxLength={80}
              className="input"
              placeholder="United Kingdom"
            />
          </Field>
        </div>
        <Field label="Tribe (optional)">
          <input
            name="tribe"
            defaultValue={user.tribe ?? ""}
            maxLength={40}
            className="input"
            placeholder="Dinka, Nuer, Bari…"
          />
        </Field>
        <Field label="Short bio" hint={`${(user.bio ?? "").length}/600`} hintPosition="right">
          <textarea
            name="bio"
            defaultValue={user.bio ?? ""}
            maxLength={600}
            rows={4}
            className="input min-h-28 py-2"
            placeholder="Tell people a little about yourself."
          />
        </Field>
        <div className="flex items-center justify-end gap-4">
          {saved && <SavedPill />}
          <button type="submit" className="btn btn-primary">Save changes</button>
        </div>
      </form>
    </>
  );
}
