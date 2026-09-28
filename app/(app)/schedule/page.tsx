import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { HudPanel } from "@/components/ui/hud-panel";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, contactDisplayName } from "@/lib/format";
import { AppointmentDialog, type AppointmentFormData } from "./_components/appointment-dialog";
import { DeleteAppointmentButton } from "./_components/delete-appointment-button";
import type { ContactOption } from "@/app/(app)/pipeline/_components/opportunity-dialog";

export const dynamic = "force-dynamic";

type Row = AppointmentFormData & {
  contact: { firstName: string; lastName: string; company: string } | null;
};

function AppointmentRow({
  appointment,
  contacts,
}: {
  appointment: Row;
  contacts: ContactOption[];
}) {
  const when = [formatDateTime(appointment.startsAtISO)];
  if (appointment.endsAtISO) when.push(`→ ${formatDateTime(appointment.endsAtISO)}`);

  return (
    <li className="flex items-start justify-between gap-3 rounded-sm border border-hud-line bg-hud-panel2 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-hud-ink">{appointment.title}</p>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-hud-muted">
          {when.join(" ")}
        </p>
        <p className="mt-0.5 text-xs text-hud-muted">
          {[appointment.location, appointment.contact ? contactDisplayName(appointment.contact) : ""]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
        {appointment.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-hud-muted">{appointment.notes}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AppointmentDialog appointment={appointment} contacts={contacts} />
        <DeleteAppointmentButton id={appointment.id} title={appointment.title} />
      </div>
    </li>
  );
}

export default async function SchedulePage() {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const now = new Date();

  const [appointments, contacts] = await Promise.all([
    db.appointment.findMany({
      where: { businessId },
      include: {
        contact: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.contact.findMany({
      where: { businessId },
      select: { id: true, firstName: true, lastName: true, company: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const contactOptions: ContactOption[] = contacts.map((c) => ({
    id: c.id,
    name: contactDisplayName(c),
  }));

  const rows: Row[] = appointments.map((a) => ({
    id: a.id,
    title: a.title,
    startsAtISO: a.startsAt.toISOString(),
    endsAtISO: a.endsAt ? a.endsAt.toISOString() : null,
    contactId: a.contactId,
    location: a.location,
    notes: a.notes,
    contact: a.contact,
  }));

  const upcoming = rows.filter((r) => new Date(r.startsAtISO) >= now);
  const past = rows.filter((r) => new Date(r.startsAtISO) < now).reverse();

  const next7 = upcoming.filter(
    (r) => new Date(r.startsAtISO).getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
            Schedule
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Appointments</h1>
          <p className="mt-1 text-sm text-hud-muted">
            The {organization.name} calendar — measures, installs, follow-ups.
          </p>
        </div>
        <AppointmentDialog contacts={contactOptions} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Upcoming" value={upcoming.length} sub="on the calendar" tone="accent" />
        <StatCard label="Next 7 days" value={next7.length} sub="coming up soon" tone="violet" />
        <StatCard label="Past" value={past.length} sub="already happened" tone="green" />
        <StatCard label="Total" value={rows.length} sub="all appointments" />
      </div>

      <HudPanel
        title="Upcoming"
        subtitle={`${upcoming.length} scheduled, soonest first`}
        actions={upcoming.length > 0 ? <Badge tone="accent">live</Badge> : undefined}
      >
        {upcoming.length > 0 ? (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <AppointmentRow key={a.id} appointment={a} contacts={contactOptions} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nothing scheduled"
            description="Book the next measure, install, or follow-up to get it on the calendar."
            action={<AppointmentDialog contacts={contactOptions} />}
          />
        )}
      </HudPanel>

      <HudPanel title="Past" subtitle={`${past.length} appointments, most recent first`}>
        {past.length > 0 ? (
          <ul className="space-y-2">
            {past.map((a) => (
              <AppointmentRow key={a.id} appointment={a} contacts={contactOptions} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No past appointments"
            description="Completed appointments will be listed here."
          />
        )}
      </HudPanel>
    </div>
  );
}
