import Link from "next/link";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";
import { HudPanel } from "@/components/ui/hud-panel";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/forms";
import { formatMoney, formatDate, contactDisplayName } from "@/lib/format";
import {
  OpportunityDialog,
  type OpportunityFormData,
  type ContactOption,
} from "./_components/opportunity-dialog";
import { DeleteOpportunityButton } from "./_components/delete-opportunity-button";
import { StageSelect } from "./_components/stage-select";

export const dynamic = "force-dynamic";

const STAGES = ["new", "contacted", "quoted", "won", "lost"] as const;

const stageTone: Record<string, BadgeTone> = {
  new: "accent",
  contacted: "violet",
  quoted: "amber",
  won: "green",
  lost: "red",
};

function probabilityTone(p: number): BadgeTone {
  if (p >= 70) return "green";
  if (p >= 40) return "amber";
  return "muted";
}

type Row = {
  id: string;
  title: string;
  value: number | null;
  stage: string;
  probability: number;
  expectedClose: Date | null;
  contactId: string | null;
  notes: string;
  contact: { firstName: string; lastName: string; company: string } | null;
};

function toFormData(o: Row): OpportunityFormData {
  return {
    id: o.id,
    title: o.title,
    contactId: o.contactId,
    value: o.value,
    stage: o.stage,
    probability: o.probability,
    expectedClose: o.expectedClose
      ? o.expectedClose.toISOString().slice(0, 10)
      : null,
    notes: o.notes,
  };
}

function OppCard({
  opp,
  contacts,
}: {
  opp: Row;
  contacts: ContactOption[];
}) {
  return (
    <div className="rounded-sm border border-hud-line bg-hud-panel2 p-3">
      <div className="flex items-start justify-between gap-2">
        <OpportunityDialog
          opportunity={toFormData(opp)}
          contacts={contacts}
          trigger="link"
        />
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-hud-ink">
          {formatMoney(opp.value)}
        </span>
      </div>
      <p className="mt-1 text-xs text-hud-muted">{contactDisplayName(opp.contact)}</p>
      <div className="mt-2 flex items-center gap-2">
        <Badge tone={probabilityTone(opp.probability)}>{opp.probability}%</Badge>
        {opp.expectedClose ? (
          <span className="text-xs text-hud-muted">
            Close {formatDate(opp.expectedClose)}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <StageSelect id={opp.id} stage={opp.stage} title={opp.title} />
        </div>
        <OpportunityDialog opportunity={toFormData(opp)} contacts={contacts} />
        <DeleteOpportunityButton id={opp.id} title={opp.title} />
      </div>
    </div>
  );
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const params = await searchParams;
  const listView = params.view === "list";

  const [opportunities, contacts] = await Promise.all([
    db.opportunity.findMany({
      where: { businessId },
      include: {
        contact: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.contact.findMany({
      where: { businessId },
      select: { id: true, firstName: true, lastName: true, company: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const rows: Row[] = opportunities.map((o) => ({
    id: o.id,
    title: o.title,
    value: o.value === null ? null : Number(o.value),
    stage: o.stage,
    probability: o.probability,
    expectedClose: o.expectedClose,
    contactId: o.contactId,
    notes: o.notes,
    contact: o.contact,
  }));

  const contactOptions: ContactOption[] = contacts.map((c) => ({
    id: c.id,
    name: contactDisplayName(c),
  }));

  const openRows = rows.filter((r) => r.stage !== "won" && r.stage !== "lost");
  const wonRows = rows.filter((r) => r.stage === "won");
  const lostRows = rows.filter((r) => r.stage === "lost");
  const openValue = openRows.reduce((sum, r) => sum + (r.value ?? 0), 0);
  const wonValue = wonRows.reduce((sum, r) => sum + (r.value ?? 0), 0);

  const listColumns: DataTableColumn<Row>[] = [
    {
      key: "opp",
      header: "Opportunity",
      render: (o) => (
        <div>
          <p className="font-medium">{o.title}</p>
          <p className="text-xs text-hud-muted">{contactDisplayName(o.contact)}</p>
        </div>
      ),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      render: (o) => (
        <span className="font-mono tabular-nums">{formatMoney(o.value)}</span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      align: "center",
      render: (o) => <Badge tone={stageTone[o.stage] ?? "muted"}>{o.stage}</Badge>,
    },
    {
      key: "probability",
      header: "Prob.",
      align: "center",
      render: (o) => (
        <Badge tone={probabilityTone(o.probability)}>{o.probability}%</Badge>
      ),
    },
    {
      key: "close",
      header: "Expected close",
      render: (o) => <span>{formatDate(o.expectedClose)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (o) => (
        <div className="flex items-center justify-end gap-2">
          <OpportunityDialog opportunity={toFormData(o)} contacts={contactOptions} />
          <DeleteOpportunityButton id={o.id} title={o.title} />
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
          <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Pipeline</h1>
          <p className="mt-1 text-sm text-hud-muted">
            Deals for {organization.name}, from first touch to close.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pipeline">
            <Button variant={listView ? "outline" : "primary"} size="sm">
              Kanban
            </Button>
          </Link>
          <Link href="/pipeline?view=list">
            <Button variant={listView ? "primary" : "outline"} size="sm">
              List
            </Button>
          </Link>
          <OpportunityDialog contacts={contactOptions} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={formatMoney(openValue)}
          sub={`${openRows.length} open ${openRows.length === 1 ? "deal" : "deals"}`}
          tone="green"
        />
        <StatCard label="Won" value={wonRows.length} sub={`${formatMoney(wonValue)} closed`} tone="green" />
        <StatCard label="Lost" value={lostRows.length} sub="closed lost" tone="red" />
        <StatCard
          label="Total deals"
          value={rows.length}
          sub="across all stages"
          tone="violet"
        />
      </div>

      {listView ? (
        <HudPanel title="All opportunities" subtitle="Every deal in the workspace">
          {rows.length > 0 ? (
            <DataTable columns={listColumns} rows={rows} keyOf={(o) => o.id} />
          ) : (
            <EmptyState
              title="No opportunities yet"
              description="Create the first deal to start filling the pipeline."
              action={<OpportunityDialog contacts={contactOptions} />}
            />
          )}
        </HudPanel>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((stage) => {
            const stageRows = rows.filter((r) => r.stage === stage);
            const stageValue = stageRows.reduce((sum, r) => sum + (r.value ?? 0), 0);
            return (
              <HudPanel
                key={stage}
                title={stage}
                subtitle={`${stageRows.length} · ${formatMoney(stageValue)}`}
                bodyClassName="space-y-3"
              >
                {stageRows.length > 0 ? (
                  stageRows.map((o) => (
                    <OppCard key={o.id} opp={o} contacts={contactOptions} />
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-hud-muted">
                    No deals in {stage}.
                  </p>
                )}
              </HudPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
