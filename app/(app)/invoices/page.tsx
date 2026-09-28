import { requireOrg } from "@/lib/tenant";
import {
  listInvoices,
  invoiceStats,
  listContactOptions,
  suggestInvoiceNumber,
  type InvoiceRow,
} from "@/lib/actions/crm-growth";
import { HudPanel } from "@/components/ui/hud-panel";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney } from "@/lib/format";
import { InvoiceDialog } from "./_components/invoice-dialog";
import { InvoiceActions } from "./_components/invoice-actions";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  draft: "muted",
  sent: "accent",
  paid: "green",
  overdue: "red",
  void: "muted",
};

export default async function InvoicesPage() {
  await requireOrg();
  const [invoices, stats, contacts, suggestedNumber] = await Promise.all([
    listInvoices(),
    invoiceStats(),
    listContactOptions(),
    suggestInvoiceNumber(),
  ]);

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      key: "number",
      header: "Number",
      render: (i) => (
        <span className="font-mono text-sm text-[var(--hud-accent)]">
          {i.number}
        </span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (i) => <span className="text-sm">{i.contactName}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (i) => (
        <span className="font-mono tabular-nums">{formatMoney(i.amount)}</span>
      ),
    },
    {
      key: "due",
      header: "Due date",
      align: "right",
      render: (i) => (
        <span className="whitespace-nowrap font-mono text-xs text-hud-muted">
          {formatDate(i.dueDate)}
        </span>
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
          <InvoiceDialog
            invoice={i}
            contacts={contacts}
            suggestedNumber={suggestedNumber}
          />
          <InvoiceActions id={i.id} number={i.number} status={i.status} />
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
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Payments</h1>
        <p className="mt-1 text-sm text-hud-muted">
          Invoices and payment status. Status changes are audit-logged.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={formatMoney(stats.outstandingTotal)}
          sub="Sent + overdue, unpaid"
          tone="amber"
        />
        <StatCard
          label="Overdue"
          value={stats.overdueCount}
          sub="Past due date"
          tone="red"
        />
        <StatCard
          label="Collected"
          value={formatMoney(stats.paidTotal)}
          sub="Marked paid"
          tone="green"
        />
        <StatCard
          label="Invoices"
          value={stats.invoiceCount}
          sub="Total on record"
          tone="accent"
        />
      </div>

      <HudPanel
        title="Invoices"
        subtitle={`${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}`}
        actions={
          <InvoiceDialog contacts={contacts} suggestedNumber={suggestedNumber} />
        }
      >
        {invoices.length > 0 ? (
          <DataTable columns={columns} rows={invoices} keyOf={(i) => i.id} />
        ) : (
          <EmptyState
            title="No invoices yet"
            description="Create your first invoice — numbers are auto-suggested in INV-0001 style."
            action={
              <InvoiceDialog
                contacts={contacts}
                suggestedNumber={suggestedNumber}
              />
            }
          />
        )}
      </HudPanel>
    </div>
  );
}
