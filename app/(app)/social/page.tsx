import { requireOrg } from "@/lib/tenant";
import { listSocialPosts, type SocialPostRow } from "@/lib/actions/crm-growth";
import { HudPanel } from "@/components/ui/hud-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { SocialComposer } from "./_components/social-composer";
import { SocialActions } from "./_components/social-actions";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  draft: "muted",
  scheduled: "amber",
  published: "green",
  failed: "red",
};

const channelTone: Record<string, BadgeTone> = {
  facebook: "accent",
  instagram: "violet",
  linkedin: "accent",
  x: "muted",
  tiktok: "violet",
  other: "muted",
};

function postColumns(withEdit: boolean): DataTableColumn<SocialPostRow>[] {
  return [
    {
      key: "channel",
      header: "Channel",
      render: (p) => (
        <Badge tone={channelTone[p.channel] ?? "muted"}>{p.channel}</Badge>
      ),
    },
    {
      key: "content",
      header: "Content",
      render: (p) => (
        <span className="block max-w-xl whitespace-pre-wrap text-sm text-hud-ink">
          {p.content}
        </span>
      ),
    },
    {
      key: "scheduled",
      header: "Scheduled",
      align: "right",
      render: (p) => (
        <span className="whitespace-nowrap font-mono text-xs text-hud-muted">
          {formatDateTime(p.scheduledAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (p) => (
        <Badge tone={statusTone[p.status] ?? "muted"}>{p.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          {withEdit ? <SocialComposer post={p} /> : null}
          <SocialActions id={p.id} status={p.status} />
        </div>
      ),
    },
  ];
}

export default async function SocialPage() {
  await requireOrg();
  const posts = await listSocialPosts();
  const queued = posts.filter((p) => p.status !== "published");
  const published = posts.filter((p) => p.status === "published");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-hud-muted">
          Growth
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-hud-ink">Social</h1>
        <p className="mt-1 max-w-2xl text-sm text-hud-muted">
          Draft and queue posts per channel. &ldquo;Publish now&rdquo; marks the
          post published in the CRM record — posting to the actual network
          happens in that network&rsquo;s own app.
        </p>
      </div>

      <SocialComposer />

      <HudPanel
        title="Queued"
        subtitle={`${queued.length} draft${queued.length === 1 ? "" : "s"} / scheduled`}
      >
        {queued.length > 0 ? (
          <DataTable columns={postColumns(true)} rows={queued} keyOf={(p) => p.id} />
        ) : (
          <EmptyState
            title="Queue is empty"
            description="Compose a post above to queue it here."
          />
        )}
      </HudPanel>

      <HudPanel
        title="Published history"
        subtitle={`${published.length} published`}
      >
        {published.length > 0 ? (
          <DataTable
            columns={postColumns(false)}
            rows={published}
            keyOf={(p) => p.id}
          />
        ) : (
          <EmptyState
            title="Nothing published yet"
            description="Posts you publish will appear here as history."
          />
        )}
      </HudPanel>
    </div>
  );
}
