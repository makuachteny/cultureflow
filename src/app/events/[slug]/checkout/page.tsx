import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
type Props = { params: { slug: string }; searchParams: SP };

/**
 * Legacy /events/[slug]/checkout entry point.
 *
 * The checkout flow is now a popup that lives on the event
 * detail page itself (toggled by `?checkout=1`). This route exists
 * purely to land sign-in callbacks (and any old bookmarks) back on the
 * event page with the modal already open. We forward `t_<tierId>=<qty>`
 * params verbatim so the user's tier picks survive the round-trip.
 */
export default function LegacyCheckoutEntry({ params, searchParams }: Props) {
  const sp = new URLSearchParams();
  sp.set("checkout", "1");
  for (const [k, v] of Object.entries(searchParams)) {
    if (v == null) continue;
    if (k === "checkout") continue; // already set
    const values = Array.isArray(v) ? v : [v];
    for (const x of values) sp.append(k, x);
  }
  redirect(`/events/${params.slug}?${sp.toString()}`);
}
