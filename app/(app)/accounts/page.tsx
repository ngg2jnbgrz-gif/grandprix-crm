import Link from "next/link";
import { requirePlatformOwner } from "@/lib/tenant";
import { listBusinessesWithCounts } from "@/lib/actions/accounts";
import { HudPanel } from "@/components/ui/hud-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { NewBusinessDialog } from "./_components/new-business-dialog";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  active: "green",
  trial: "accent",
  suspended: "amber",
  archived: "muted",
};

export default async function AccountsPage() {
  // Platform-owner only: non-owners get the audited denial + redirect to /app.
  await requirePlatformOwner();
  const businesses = await listBusinessesWithCounts();

  type Row = (typeof businesses)[number];
  const columns: DataTableColumn<Row>[] = [
    {
      key: "business",
      header: "Business",
      render: (b) => (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-8 w-8 shrink-0 border"
            style={{
              borderColor: b.accent,
              backgroundColor: b.primaryColor,
              boxShadow: `inset 0 0 0 2px ${b.accent}33`,
            }}
            title={`Theme: ${b.primaryColor} / ${b.accent}`}
          />
          <span>
            <Link
              href={`/accounts/${b.id}`}
              className="font-medium text-[var(--hud-accent)] hover:underline"
            >
              {b.name}
            </Link>
            <span className="block font-mono text-[11px] text-hud-muted">
              {b.slug}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "website",
      header: "Website",
      render: (b) =>
        b.website ? (
          <span className="font-mono text-xs text-hud-muted">{b.website}</span>
        ) : (
          <span className="text-hud-muted/50">—</span>
        ),
    },
    {
      key: "industry",
      header: "Industry",
      render: (b) => b.industry || <span className="text-hud-muted/50">—</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (b) => <Badge tone={statusTone[b.status] ?? "muted"}>{b.status}</Badge>,
    },
    {
      key: "contacts",
      header: "Contacts",
      align: "right",
      render: (b) => (
        <span className="font-mono tabular-nums">{b.contactCount}</span>
      ),
    },
    {
      key: "users",
      header: "Users",
      align: "right",
      render: (b) => (
        <span className="font-mono tabular-nums">{b.memberCount}</span>
      ),
    },
    {
      key: "created",
      header: "Created",
      align: "right",
      render: (b) => (
        <span className="whitespace-nowrap font-mono text-xs text-hud-muted">
          {formatDate(b.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
          Mission control
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">
          Client accounts
        </h1>
        <p className="mt-1 text-sm text-hud-muted">
          Every business on the platform. Open one to edit its white-label
          theme and manage its users.
        </p>
      </div>

      <HudPanel
        title="Businesses"
        subtitle={`${businesses.length} ${businesses.length === 1 ? "business" : "businesses"} provisioned`}
        actions={<NewBusinessDialog />}
      >
        {businesses.length > 0 ? (
          <DataTable
            columns={columns}
            rows={businesses}
            keyOf={(b) => b.id}
          />
        ) : (
          <EmptyState
            title="No businesses yet"
            description="Provision the first client business to get it a workspace, theme, and admin login."
            action={<NewBusinessDialog />}
          />
        )}
      </HudPanel>
    </div>
  );
}
