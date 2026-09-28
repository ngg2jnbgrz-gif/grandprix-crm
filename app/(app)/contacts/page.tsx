import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { HudPanel } from "@/components/ui/hud-panel";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { contactDisplayName } from "@/lib/format";
import { ContactDialog, type ContactFormData } from "./_components/contact-dialog";
import { DeleteContactButton } from "./_components/delete-contact-button";
import { ContactsToolbar } from "./_components/contacts-toolbar";

export const dynamic = "force-dynamic";

const temperatureTone: Record<string, BadgeTone> = {
  hot: "red",
  warm: "amber",
  cold: "muted",
};

type SearchParams = {
  q?: string;
  category?: string;
  temperature?: string;
  priority?: string;
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const params = await searchParams;

  const q = (params.q ?? "").trim();
  const category = (params.category ?? "").trim();
  const temperature = (params.temperature ?? "").trim();
  const priorityOnly = params.priority === "1";

  const where: Prisma.ContactWhereInput = { businessId };
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;
  if (temperature && ["hot", "warm", "cold"].includes(temperature)) {
    where.temperature = temperature;
  }
  if (priorityOnly) where.priority = true;

  const [contacts, categoryRows, totalCount, hotCount, warmCount, priorityCount] =
    await Promise.all([
      db.contact.findMany({
        where,
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 200,
      }),
      db.contact.findMany({
        where: { businessId, category: { not: "" } },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
      db.contact.count({ where: { businessId } }),
      db.contact.count({ where: { businessId, temperature: "hot" } }),
      db.contact.count({ where: { businessId, temperature: "warm" } }),
      db.contact.count({ where: { businessId, priority: true } }),
    ]);

  const rows: ContactFormData[] = contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    company: c.company,
    email: c.email,
    phone: c.phone,
    website: c.website,
    town: c.town,
    category: c.category,
    temperature: c.temperature,
    priority: c.priority,
    source: c.source,
    notes: c.notes,
  }));

  const columns: DataTableColumn<ContactFormData>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <div>
          <Link
            href={`/contacts/${c.id}`}
            className="font-medium text-hud-ink hover:text-[var(--hud-accent)]"
          >
            {contactDisplayName(c)}
          </Link>
          {c.email ? (
            <p className="text-xs text-hud-muted">{c.email}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (c) => <span>{c.company || "—"}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (c) =>
        c.phone ? (
          <span className="font-mono tabular-nums">{c.phone}</span>
        ) : (
          <span className="text-hud-muted">—</span>
        ),
    },
    {
      key: "town",
      header: "Town",
      render: (c) => <span>{c.town || "—"}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (c) => <span>{c.category || "—"}</span>,
    },
    {
      key: "temperature",
      header: "Temp",
      align: "center",
      render: (c) => (
        <Badge tone={temperatureTone[c.temperature] ?? "muted"}>
          {c.temperature}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "★",
      align: "center",
      render: (c) =>
        c.priority ? (
          <span className="text-base text-[var(--hud-accent)]" aria-label="Priority">
            ★
          </span>
        ) : (
          <span className="text-hud-muted/40">☆</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-2">
          <ContactDialog contact={c} />
          <DeleteContactButton id={c.id} name={contactDisplayName(c)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
            Sell
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Contacts</h1>
          <p className="mt-1 text-sm text-hud-muted">
            Every person and company in the {organization.name} workspace.
          </p>
        </div>
        <ContactDialog />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total contacts" value={totalCount} sub="in workspace" />
        <StatCard label="Hot" value={hotCount} sub="temperature hot" tone="red" />
        <StatCard label="Warm" value={warmCount} sub="temperature warm" tone="amber" />
        <StatCard label="Priority" value={priorityCount} sub="starred contacts" tone="violet" />
      </div>

      <HudPanel title="Contact list" subtitle="Search and filter the workspace address book">
        <div className="mb-4 border-b border-hud-line/60 pb-4">
          <ContactsToolbar categories={categoryRows.map((r) => r.category)} />
        </div>
        {rows.length > 0 ? (
          <DataTable columns={columns} rows={rows} keyOf={(c) => c.id} />
        ) : (
          <EmptyState
            title="No contacts found"
            description={
              totalCount === 0
                ? "Add the first contact to start building the pipeline."
                : "Try widening the search or clearing a filter."
            }
            action={<ContactDialog />}
          />
        )}
      </HudPanel>
    </div>
  );
}
