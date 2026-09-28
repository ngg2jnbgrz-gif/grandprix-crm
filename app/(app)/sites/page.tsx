import { requireOrg } from "@/lib/tenant";
import { listWebAssets, type WebAssetRow } from "@/lib/actions/crm-growth";
import { HudPanel } from "@/components/ui/hud-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WebAssetDialog } from "./_components/web-asset-dialog";
import { WebAssetActions } from "./_components/web-asset-actions";

export const dynamic = "force-dynamic";

const kindTone: Record<string, BadgeTone> = {
  site: "accent",
  funnel: "violet",
  form: "amber",
};

const statusTone: Record<string, BadgeTone> = {
  draft: "muted",
  live: "green",
  archived: "muted",
};

export default async function SitesPage() {
  await requireOrg();
  const assets = await listWebAssets();

  const columns: DataTableColumn<WebAssetRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (w) => <span className="font-medium text-hud-ink">{w.name}</span>,
    },
    {
      key: "kind",
      header: "Kind",
      align: "center",
      render: (w) => (
        <Badge tone={kindTone[w.kind] ?? "muted"}>{w.kind}</Badge>
      ),
    },
    {
      key: "url",
      header: "URL",
      render: (w) =>
        w.url ? (
          <a
            href={w.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-[var(--hud-accent)] hover:underline"
          >
            {w.url}
          </a>
        ) : (
          <span className="text-hud-muted/50">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (w) => (
        <Badge tone={statusTone[w.status] ?? "muted"}>{w.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (w) => (
        <div className="flex items-center justify-end gap-1">
          <WebAssetDialog asset={w} />
          <WebAssetActions id={w.id} name={w.name} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
          Growth
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">
          Sites &amp; funnels
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-hud-muted">
          A records tracker for the business&rsquo;s websites, funnels, and
          forms — what they are, where they live, and their status. This page
          tracks the records; it does not publish anything.
        </p>
      </div>

      <HudPanel
        title="Web assets"
        subtitle={`${assets.length} ${assets.length === 1 ? "asset" : "assets"}`}
        actions={<WebAssetDialog />}
      >
        {assets.length > 0 ? (
          <DataTable columns={columns} rows={assets} keyOf={(w) => w.id} />
        ) : (
          <EmptyState
            title="No web assets yet"
            description="Record the business's websites, funnels, and lead forms here."
            action={<WebAssetDialog />}
          />
        )}
      </HudPanel>
    </div>
  );
}
