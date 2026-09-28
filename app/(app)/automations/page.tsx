import { requireOrg } from "@/lib/tenant";
import { listAutomations, type AutomationRow } from "@/lib/actions/crm-growth";
import { HudPanel } from "@/components/ui/hud-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AutomationDialog } from "./_components/automation-dialog";
import { AutomationRowActions } from "./_components/automation-row-actions";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  await requireOrg();
  const automations = await listAutomations();

  const columns: DataTableColumn<AutomationRow>[] = [
    {
      key: "name",
      header: "Rule",
      render: (a) => (
        <span>
          <span className="font-medium text-hud-ink">{a.name}</span>
          <span className="mt-0.5 block">
            <Badge tone={a.enabled ? "green" : "muted"}>
              {a.enabled ? "enabled" : "disabled"}
            </Badge>
          </span>
        </span>
      ),
    },
    {
      key: "trigger",
      header: "Trigger",
      render: (a) => (
        <span className="font-mono text-xs text-hud-muted">{a.trigger}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (a) => <span className="text-sm text-hud-ink">{a.action}</span>,
    },
    {
      key: "toggle",
      header: "Enabled",
      align: "center",
      render: (a) => (
        <AutomationRowActions id={a.id} name={a.name} enabled={a.enabled} />
      ),
    },
    {
      key: "edit",
      header: "Edit",
      align: "right",
      render: (a) => <AutomationDialog automation={a} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
          Automate
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Automations</h1>
        <p className="mt-1 max-w-2xl text-sm text-hud-muted">
          Rule records: each rule documents a trigger and the action it should
          produce. These are definitions tracked here — they are not executed
          by this screen.
        </p>
      </div>

      <HudPanel
        title="Automation rules"
        subtitle={`${automations.length} ${automations.length === 1 ? "rule" : "rules"} · ${automations.filter((a) => a.enabled).length} enabled`}
        actions={<AutomationDialog />}
      >
        {automations.length > 0 ? (
          <DataTable
            columns={columns}
            rows={automations}
            keyOf={(a) => a.id}
          />
        ) : (
          <EmptyState
            title="No automation rules yet"
            description='Define your first rule — e.g. trigger "opportunity.stage → won" with action "create task: send thank-you".'
            action={<AutomationDialog />}
          />
        )}
      </HudPanel>
    </div>
  );
}
