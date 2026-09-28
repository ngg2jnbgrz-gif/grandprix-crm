import { requireOrg } from "@/lib/tenant";
import {
  listReviews,
  listContactOptions,
  type ReviewRow,
} from "@/lib/actions/crm-growth";
import { HudPanel } from "@/components/ui/hud-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewDialog } from "./_components/review-dialog";
import { ReviewActions } from "./_components/review-actions";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  new: "accent",
  requested: "amber",
  published: "green",
  archived: "muted",
};

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, rating));
  return (
    <span
      aria-label={`${rating} out of 5 stars`}
      className="whitespace-nowrap font-mono text-sm text-[var(--hud-accent)]"
    >
      {"★".repeat(filled)}
      <span className="text-hud-muted/40">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

export default async function ReviewsPage() {
  await requireOrg();
  const [reviews, contacts] = await Promise.all([
    listReviews(),
    listContactOptions(),
  ]);

  const columns: DataTableColumn<ReviewRow>[] = [
    {
      key: "stars",
      header: "Rating",
      render: (r) => <Stars rating={r.rating} />,
    },
    {
      key: "author",
      header: "Author",
      render: (r) => (
        <span>
          <span className="font-medium text-hud-ink">{r.author}</span>
          {r.text ? (
            <span className="block max-w-md truncate text-xs text-hud-muted">
              {r.text}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (r) => (
        <span className="text-sm text-hud-muted">{r.source || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (r) => (
        <Badge tone={statusTone[r.status] ?? "muted"}>{r.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <ReviewDialog review={r} contacts={contacts} />
          <ReviewActions id={r.id} author={r.author} status={r.status} />
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
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Reputation</h1>
        <p className="mt-1 text-sm text-hud-muted">
          Customer reviews, tracked from first sighting (new) through request
          to published — or archived.
        </p>
      </div>

      <HudPanel
        title="Reviews"
        subtitle={`${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`}
        actions={<ReviewDialog contacts={contacts} />}
      >
        {reviews.length > 0 ? (
          <DataTable columns={columns} rows={reviews} keyOf={(r) => r.id} />
        ) : (
          <EmptyState
            title="No reviews yet"
            description="Log customer reviews as they come in, then work them through to published."
            action={<ReviewDialog contacts={contacts} />}
          />
        )}
      </HudPanel>
    </div>
  );
}
