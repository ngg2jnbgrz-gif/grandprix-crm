import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { HudPanel } from "@/components/ui/hud-panel";
import { StatCard } from "@/components/ui/stat-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/forms";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatMoney,
  formatDate,
  formatDateTime,
  contactDisplayName,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/** Opportunity stages that still count as "open" pipeline. */
const OPEN_STAGES = { notIn: ["won", "lost"] };

const stageTone: Record<string, BadgeTone> = {
  new: "accent",
  contacted: "violet",
  quoted: "amber",
  won: "green",
  lost: "red",
};

export default async function DashboardPage() {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [
    totalContacts,
    hotContacts,
    openValueAgg,
    openOppCount,
    openTasks,
    upcomingAppts,
    activeCampaigns,
    unpaidAgg,
    unpaidCount,
    hotOpps,
    overdueTasks,
    soonAppts,
    hotTargetTotal,
    hotTargetWorked,
  ] = await Promise.all([
    db.contact.count({ where: { businessId } }),
    db.contact.count({
      where: { businessId, OR: [{ priority: true }, { temperature: "hot" }] },
    }),
    db.opportunity.aggregate({
      where: { businessId, stage: OPEN_STAGES },
      _sum: { value: true },
    }),
    db.opportunity.count({ where: { businessId, stage: OPEN_STAGES } }),
    db.task.count({ where: { businessId, done: false } }),
    db.appointment.count({
      where: { businessId, startsAt: { gte: now, lte: in7Days } },
    }),
    db.campaign.count({
      where: { businessId, status: { in: ["scheduled", "sent"] } },
    }),
    db.invoice.aggregate({
      where: { businessId, status: { notIn: ["paid", "void"] } },
      _sum: { amount: true },
    }),
    db.invoice.count({
      where: { businessId, status: { notIn: ["paid", "void"] } },
    }),
    db.opportunity.findMany({
      where: {
        businessId,
        stage: OPEN_STAGES,
        contact: { priority: true },
      },
      include: {
        contact: {
          select: { firstName: true, lastName: true, company: true },
        },
      },
      orderBy: { value: "desc" },
      take: 5,
    }),
    db.task.findMany({
      where: { businessId, done: false, dueDate: { lt: now } },
      include: {
        contact: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    db.appointment.findMany({
      where: { businessId, startsAt: { gte: now, lte: in48h } },
      include: {
        contact: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    db.contact.count({ where: { businessId, priority: true } }),
    db.contact.count({
      where: {
        businessId,
        priority: true,
        opportunities: {
          some: { businessId, stage: { notIn: ["won", "lost", "new"] } },
        },
      },
    }),
  ]);

  const openValue = Number(openValueAgg._sum.value ?? 0);
  const unpaidValue = Number(unpaidAgg._sum.amount ?? 0);

  type HotOpp = (typeof hotOpps)[number];
  const oppColumns: DataTableColumn<HotOpp>[] = [
    {
      key: "opp",
      header: "Opportunity",
      render: (o) => (
        <div>
          <p className="font-medium">{o.title}</p>
          <p className="text-xs text-hud-muted">
            {contactDisplayName(o.contact)}
          </p>
        </div>
      ),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      render: (o) => (
        <span className="font-mono tabular-nums">
          {formatMoney(o.value === null ? null : Number(o.value))}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      align: "center",
      render: (o) => (
        <Badge tone={stageTone[o.stage] ?? "muted"}>{o.stage}</Badge>
      ),
    },
  ];

  const needsAttention = overdueTasks.length > 0 || soonAppts.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
          Command deck
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-hud-muted">
          Live operational overview for {organization.name} — every figure is
          computed from the workspace database.
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Total contacts"
          value={<AnimatedNumber value={totalContacts} />}
          sub="in workspace"
        />
        <StatCard
          label="Hot / priority"
          value={<AnimatedNumber value={hotContacts} />}
          sub="priority or hot temperature"
          tone="amber"
        />
        <StatCard
          label="Open pipeline"
          value={formatMoney(openValue)}
          sub={`${openOppCount} open ${openOppCount === 1 ? "opportunity" : "opportunities"}`}
          tone="green"
        />
        <StatCard
          label="Open tasks"
          value={<AnimatedNumber value={openTasks} />}
          sub="not completed"
        />
        <StatCard
          label="Appointments · 7d"
          value={<AnimatedNumber value={upcomingAppts} />}
          sub="scheduled ahead"
          tone="violet"
        />
        <StatCard
          label="Active campaigns"
          value={<AnimatedNumber value={activeCampaigns} />}
          sub="scheduled or sent"
        />
        <StatCard
          label="Unpaid invoices"
          value={<AnimatedNumber value={unpaidCount} />}
          sub={`${formatMoney(unpaidValue)} outstanding`}
          tone={unpaidCount > 0 ? "red" : "green"}
        />
      </div>

      {/* ── Today's mission ────────────────────────────────── */}
      {hotTargetTotal > 0 ? (
        <HudPanel
          title="Today's mission"
          subtitle="Work the hot list — call, text, log the outcome, repeat"
          actions={
            <Link href="/outreach">
              <Button size="sm">Open Outreach Deck →</Button>
            </Link>
          }
        >
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="font-mono text-4xl font-bold tabular-nums text-[var(--hud-accent)]">
                <AnimatedNumber value={hotTargetTotal - hotTargetWorked} />
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-hud-muted">
                hot targets remaining
              </p>
            </div>
            <div className="min-w-[200px] flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-hud-line/40">
                <div
                  className="h-full rounded-full bg-[var(--hud-accent)] transition-all"
                  style={{
                    width: `${Math.round((hotTargetWorked / hotTargetTotal) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm text-hud-muted">
                {hotTargetWorked} of {hotTargetTotal} hot targets worked — your
                scripts, call buttons, and follow-ups are waiting in the deck.
              </p>
            </div>
          </div>
        </HudPanel>
      ) : null}

      {/* ── Hot opportunities ──────────────────────────────── */}
      <HudPanel
        title="Hot opportunities"
        subtitle="Open deals on priority contacts, highest value first"
      >
        {hotOpps.length > 0 ? (
          <DataTable
            columns={oppColumns}
            rows={hotOpps}
            keyOf={(o) => o.id}
          />
        ) : (
          <EmptyState
            title="No hot opportunities"
            description="When a priority contact has an open opportunity, the top five by value appear here."
          />
        )}
      </HudPanel>

      {/* ── Needs attention ────────────────────────────────── */}
      <HudPanel
        title="Needs attention"
        subtitle="Overdue tasks and appointments in the next 48 hours"
      >
        {needsAttention ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-hud-red">
                Overdue tasks
              </p>
              {overdueTasks.length > 0 ? (
                <ul className="space-y-2">
                  {overdueTasks.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-sm border border-hud-red/30 bg-hud-red/[0.06] px-3 py-2"
                    >
                      <p className="text-sm font-medium text-hud-ink">{t.title}</p>
                      <p className="mt-0.5 text-xs text-hud-muted">
                        Due {formatDate(t.dueDate)}
                        {t.contact ? ` · ${contactDisplayName(t.contact)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-hud-muted">No overdue tasks.</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--hud-accent)]">
                Next 48 hours
              </p>
              {soonAppts.length > 0 ? (
                <ul className="space-y-2">
                  {soonAppts.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-sm border border-hud-line bg-hud-panel2 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-hud-ink">{a.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-hud-muted">
                        {formatDateTime(a.startsAt)}
                        {a.contact ? ` · ${contactDisplayName(a.contact)}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-hud-muted">
                  Nothing scheduled in the next 48 hours.
                </p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="All clear"
            description="No overdue tasks and nothing on the calendar in the next 48 hours."
          />
        )}
      </HudPanel>
    </div>
  );
}
