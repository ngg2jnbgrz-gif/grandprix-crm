import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { HudPanel } from "@/components/ui/hud-panel";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/forms";
import {
  formatMoney,
  formatDate,
  formatDateTime,
  contactDisplayName,
} from "@/lib/format";
import { ContactDialog, type ContactFormData } from "../_components/contact-dialog";
import { DeleteContactButton } from "../_components/delete-contact-button";

export const dynamic = "force-dynamic";

const temperatureTone: Record<string, BadgeTone> = {
  hot: "red",
  warm: "amber",
  cold: "muted",
};

const stageTone: Record<string, BadgeTone> = {
  new: "accent",
  contacted: "violet",
  quoted: "amber",
  won: "green",
  lost: "red",
};

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-hud-muted">
        {label}
      </p>
      <p className="mt-1 text-sm text-hud-ink">{value || "—"}</p>
    </div>
  );
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const { id } = await params;

  const contact = await db.contact.findFirst({
    where: { id, businessId },
  });
  if (!contact) notFound();

  const [openOpps, tasks, appointments] = await Promise.all([
    db.opportunity.findMany({
      where: { businessId, contactId: contact.id, stage: { notIn: ["won", "lost"] } },
      orderBy: { value: "desc" },
    }),
    db.task.findMany({
      where: { businessId, contactId: contact.id },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
    }),
    db.appointment.findMany({
      where: { businessId, contactId: contact.id },
      orderBy: { startsAt: "desc" },
      take: 10,
    }),
  ]);

  const formData: ContactFormData = {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    website: contact.website,
    town: contact.town,
    category: contact.category,
    temperature: contact.temperature,
    priority: contact.priority,
    source: contact.source,
    notes: contact.notes,
  };
  const displayName = contactDisplayName(contact);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/contacts"
            className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted hover:text-[var(--hud-accent)]"
          >
            ← Contacts
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-hud-ink">
            {displayName}
            {contact.priority ? (
              <span className="text-xl text-[var(--hud-accent)]" aria-label="Priority">
                ★
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-sm text-hud-muted">
            <Badge tone={temperatureTone[contact.temperature] ?? "muted"}>
              {contact.temperature}
            </Badge>
            {contact.category ? (
              <span className="ml-2">· {contact.category}</span>
            ) : null}
            {contact.town ? <span className="ml-2">· {contact.town}</span> : null}
          </p>
        </div>
        <div className="flex gap-2">
          <ContactDialog contact={formData} />
          <DeleteContactButton id={contact.id} name={displayName} redirectTo="/contacts" />
        </div>
      </div>

      <HudPanel title="Details" subtitle="Everything on file for this contact">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FieldRow label="First name" value={contact.firstName} />
          <FieldRow label="Last name" value={contact.lastName} />
          <FieldRow label="Company" value={contact.company} />
          <FieldRow label="Email" value={contact.email} />
          <FieldRow label="Phone" value={contact.phone} />
          <FieldRow label="Website" value={contact.website} />
          <FieldRow label="Town" value={contact.town} />
          <FieldRow label="Category" value={contact.category} />
          <FieldRow label="Source" value={contact.source} />
        </div>
        {contact.notes ? (
          <div className="mt-5 border-t border-hud-line/60 pt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-hud-muted">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-hud-ink">
              {contact.notes}
            </p>
          </div>
        ) : null}
      </HudPanel>

      <HudPanel
        title="Open opportunities"
        subtitle={`${openOpps.length} open ${openOpps.length === 1 ? "deal" : "deals"} on this contact`}
        actions={
          <Link href="/pipeline">
            <Button variant="outline" size="sm">Pipeline</Button>
          </Link>
        }
      >
        {openOpps.length > 0 ? (
          <ul className="space-y-2">
            {openOpps.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-sm border border-hud-line bg-hud-panel2 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-hud-ink">{o.title}</p>
                  <p className="text-xs text-hud-muted">
                    Expected close {formatDate(o.expectedClose)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm tabular-nums text-hud-ink">
                    {formatMoney(o.value === null ? null : Number(o.value))}
                  </span>
                  <Badge tone={stageTone[o.stage] ?? "muted"}>{o.stage}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No open opportunities"
            description="Deals linked to this contact will show up here."
          />
        )}
      </HudPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <HudPanel
          title="Tasks"
          subtitle="Everything assigned to this contact"
          actions={
            <Link href="/tasks">
              <Button variant="outline" size="sm">Tasks</Button>
            </Link>
          }
        >
          {tasks.length > 0 ? (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-sm border border-hud-line bg-hud-panel2 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-hud-ink">{t.title}</p>
                    <p className="text-xs text-hud-muted">Due {formatDate(t.dueDate)}</p>
                  </div>
                  <Badge tone={t.done ? "green" : "amber"}>
                    {t.done ? "Done" : "Open"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No tasks" description="Nothing assigned to this contact yet." />
          )}
        </HudPanel>

        <HudPanel
          title="Appointments"
          subtitle="Scheduled time with this contact"
          actions={
            <Link href="/schedule">
              <Button variant="outline" size="sm">Schedule</Button>
            </Link>
          }
        >
          {appointments.length > 0 ? (
            <ul className="space-y-2">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="rounded-sm border border-hud-line bg-hud-panel2 px-3 py-2"
                >
                  <p className="text-sm font-medium text-hud-ink">{a.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-hud-muted">
                    {formatDateTime(a.startsAt)}
                    {a.location ? ` · ${a.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No appointments" description="No appointments with this contact yet." />
          )}
        </HudPanel>
      </div>
    </div>
  );
}
