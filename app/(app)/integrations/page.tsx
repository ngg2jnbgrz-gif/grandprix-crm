import { requirePlatformOwner } from "@/lib/tenant";
import {
  listIntegrations,
  type IntegrationRow,
} from "@/lib/actions/crm-growth";
import { HudPanel } from "@/components/ui/hud-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IntegrationDialog } from "./_components/integration-dialog";
import { IntegrationActions } from "./_components/integration-actions";

export const dynamic = "force-dynamic";

const kindTone: Record<string, BadgeTone> = {
  mcp: "accent",
  email: "violet",
  calendar: "amber",
  payment: "green",
  other: "muted",
};

const statusTone: Record<string, BadgeTone> = {
  connected: "green",
  disabled: "muted",
};

/** Best-effort pull of a server/endpoint URL out of the stored JSON config. */
function configUrl(configJson: string): string | null {
  try {
    const cfg = JSON.parse(configJson) as Record<string, unknown>;
    for (const key of ["url", "serverUrl", "server_url", "endpoint"]) {
      const v = cfg[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  } catch {
    // stored JSON is validated server-side; be lenient here
  }
  return null;
}

export default async function IntegrationsPage() {
  // Platform-owner only: non-owners get the audited denial + redirect to
  // /app before anything renders (the nav already hides this section from
  // client shells — this is defense in depth).
  await requirePlatformOwner();
  const integrations = await listIntegrations();

  const columns: DataTableColumn<IntegrationRow>[] = [
    {
      key: "name",
      header: "Integration",
      render: (i) => (
        <span>
          <span className="font-medium text-hud-ink">{i.name}</span>
          {configUrl(i.configJson) ? (
            <span className="block max-w-md truncate font-mono text-[11px] text-hud-muted">
              {configUrl(i.configJson)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      align: "center",
      render: (i) => (
        <Badge tone={kindTone[i.kind] ?? "muted"}>{i.kind}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (i) => (
        <Badge tone={statusTone[i.status] ?? "muted"}>{i.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          <IntegrationDialog integration={i} />
          <IntegrationActions id={i.id} name={i.name} status={i.status} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
          System
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">
          Integrations
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-hud-muted">
          External connections for this workspace. MCP servers registered here
          make their tools available to the CRM&rsquo;s automation layer.
          Registering a record stores its configuration — it does not verify
          or contact the remote server.
        </p>
      </div>

      <HudPanel
        title="Integrations"
        subtitle={`${integrations.length} ${integrations.length === 1 ? "integration" : "integrations"}`}
        actions={<IntegrationDialog />}
      >
        {integrations.length > 0 ? (
          <DataTable
            columns={columns}
            rows={integrations}
            keyOf={(i) => i.id}
          />
        ) : (
          <EmptyState
            title="No integrations yet"
            description="Register an MCP server or a generic email, calendar, payment, or other connection."
            action={<IntegrationDialog />}
          />
        )}
      </HudPanel>
    </div>
  );
}
