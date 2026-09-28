import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { HudPanel } from "@/components/ui/hud-panel";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, contactDisplayName } from "@/lib/format";
import { TaskDialog, type TaskFormData } from "./_components/task-dialog";
import { DeleteTaskButton } from "./_components/delete-task-button";
import { TaskToggle } from "./_components/task-toggle";
import type { ContactOption } from "@/app/(app)/pipeline/_components/opportunity-dialog";

export const dynamic = "force-dynamic";

/** Grouping is done in the operator's timezone so "today" means today. */
const OPERATOR_TZ = "America/New_York";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: OPERATOR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayString(d: Date): string {
  return dayFmt.format(d); // "yyyy-MM-dd" — string-comparable
}

type Row = TaskFormData & {
  contact: { firstName: string; lastName: string; company: string } | null;
};

function TaskRow({ task, contacts }: { task: Row; contacts: ContactOption[] }) {
  return (
    <li className="flex items-start gap-3 rounded-sm border border-hud-line bg-hud-panel2 px-3 py-2.5">
      <TaskToggle id={task.id} done={task.done} title={task.title} />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${task.done ? "text-hud-muted line-through" : "text-hud-ink"}`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 text-xs text-hud-muted">
          {task.dueDateISO ? (
            <span className="font-mono tabular-nums">
              {formatDateTime(task.dueDateISO)}
            </span>
          ) : (
            <span>No due date</span>
          )}
          {task.contact ? ` · ${contactDisplayName(task.contact)}` : ""}
        </p>
        {task.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-hud-muted">{task.notes}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TaskDialog task={task} contacts={contacts} />
        <DeleteTaskButton id={task.id} title={task.title} />
      </div>
    </li>
  );
}

export default async function TasksPage() {
  const { organization } = await requireOrg();
  const businessId = organization.id;

  const [tasks, contacts] = await Promise.all([
    db.task.findMany({
      where: { businessId },
      include: {
        contact: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: [{ done: "asc" }, { dueDate: "asc" }],
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

  const rows: Row[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueDateISO: t.dueDate ? t.dueDate.toISOString() : null,
    done: t.done,
    contactId: t.contactId,
    notes: t.notes,
    contact: t.contact,
  }));

  const today = dayString(new Date());
  const overdue = rows.filter(
    (t) => !t.done && t.dueDateISO && dayString(new Date(t.dueDateISO)) < today,
  );
  const dueToday = rows.filter(
    (t) => !t.done && t.dueDateISO && dayString(new Date(t.dueDateISO)) === today,
  );
  const upcoming = rows.filter(
    (t) =>
      !t.done &&
      (!t.dueDateISO || dayString(new Date(t.dueDateISO)) > today),
  );
  const done = rows.filter((t) => t.done);

  const groups: { key: string; title: string; rows: Row[]; emptyHint: string }[] = [
    { key: "overdue", title: "Overdue", rows: overdue, emptyHint: "Nothing in this bucket — enjoy the quiet." },
    { key: "today", title: "Today", rows: dueToday, emptyHint: "Nothing in this bucket — enjoy the quiet." },
    { key: "upcoming", title: "Upcoming", rows: upcoming, emptyHint: "Nothing in this bucket — enjoy the quiet." },
    { key: "done", title: "Done", rows: done, emptyHint: "Completed tasks land here." },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
            Schedule
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Tasks</h1>
          <p className="mt-1 text-sm text-hud-muted">
            Follow-ups and to-dos for {organization.name}.
          </p>
        </div>
        <TaskDialog contacts={contactOptions} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Overdue" value={overdue.length} sub="past due" tone="red" />
        <StatCard label="Due today" value={dueToday.length} sub="on the list" tone="accent" />
        <StatCard label="Upcoming" value={upcoming.length} sub="scheduled ahead" tone="amber" />
        <StatCard label="Done" value={done.length} sub="completed" tone="green" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <HudPanel key={g.key} title={g.title} subtitle={`${g.rows.length} ${g.rows.length === 1 ? "task" : "tasks"}`}>
            {g.rows.length > 0 ? (
              <ul className="space-y-2">
                {g.rows.map((t) => (
                  <TaskRow key={t.id} task={t} contacts={contactOptions} />
                ))}
              </ul>
            ) : (
              <EmptyState
                title={`No ${g.title.toLowerCase()} tasks`}
                description={g.emptyHint}
              />
            )}
          </HudPanel>
        ))}
      </div>
    </div>
  );
}
