import { requireOrg } from "@/lib/tenant";
import { listCampaigns, type CampaignRow } from "@/lib/actions/crm-growth";
import { HudPanel } from "@/components/ui/hud-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { CampaignDialog } from "./_components/campaign-dialog";
import { CampaignActions } from "./_components/campaign-actions";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  draft: "muted",
  active: "green",
  paused: "amber",
  done: "accent",
};

const channelTone: Record<string, BadgeTone> = {
  email: "accent",
  sms: "violet",
};

export default async function CampaignsPage() {
  await requireOrg();
  const campaigns = await listCampaigns();

  const columns: DataTableColumn<CampaignRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (c) => (
        <span>
          <span className="font-medium text-hud-ink">{c.name}</span>
          {c.body ? (
            <span className="block max-w-md truncate text-xs text-hud-muted">
              {c.body}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      align: "center",
      render: (c) => (
        <Badge tone={channelTone[c.channel] ?? "muted"}>{c.channel}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (c) => (
        <Badge tone={statusTone[c.status] ?? "muted"}>{c.status}</Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      align: "right",
      render: (c) => (
        <span className="whitespace-nowrap font-mono text-xs text-hud-muted">
          {formatDate(c.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <CampaignDialog campaign={c} />
          <CampaignActions id={c.id} status={c.status} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
          Engage
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Campaigns</h1>
        <p className="mt-1 text-sm text-hud-muted">
          Email and SMS outreach campaigns. Draft the message here — sending
          itself happens through your mail/SMS provider.
        </p>
      </div>

      <HudPanel
        title="Campaigns"
        subtitle={`${campaigns.length} ${campaigns.length === 1 ? "campaign" : "campaigns"}`}
        actions={<CampaignDialog />}
      >
        {campaigns.length > 0 ? (
          <DataTable columns={columns} rows={campaigns} keyOf={(c) => c.id} />
        ) : (
          <EmptyState
            title="No campaigns yet"
            description="Create your first email or SMS campaign to start a coordinated outreach."
            action={<CampaignDialog />}
          />
        )}
      </HudPanel>
    </div>
  );
}
