import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { OutreachDeck, type DeckTarget } from "./_components/outreach-deck";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Outreach Deck",
};

/**
 * The Outreach Deck queue: every priority contact in the workspace, with its
 * open partner opportunity (if any). Untouched targets (stage "new" or no
 * opportunity yet) come first; the rest follow alphabetically.
 */
export default async function OutreachPage() {
  const { organization } = await requireOrg();
  const businessId = organization.id;

  const contacts = await db.contact.findMany({
    where: { businessId, priority: true },
    include: {
      opportunities: {
        where: { businessId, stage: { notIn: ["won", "lost"] } },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { stage: true },
      },
    },
  });

  const targets: DeckTarget[] = contacts.map((c) => ({
    id: c.id,
    company: c.company,
    firstName: c.firstName,
    phone: c.phone,
    town: c.town,
    category: c.category,
    notes: c.notes,
    worked:
      c.opportunities.length > 0 && c.opportunities[0].stage !== "new",
  }));

  targets.sort((a, b) => {
    if (a.worked !== b.worked) return a.worked ? 1 : -1;
    return a.company.localeCompare(b.company);
  });

  return <OutreachDeck initialTargets={targets} />;
}
