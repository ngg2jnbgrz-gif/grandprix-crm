import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformOwner } from "@/lib/tenant";
import { getBusiness } from "@/lib/actions/accounts";
import { listOrgUsers } from "@/lib/actions/provisioning";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { ThemeForm } from "./_components/theme-form";
import { UsersPanel } from "./_components/users-panel";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Platform-owner only: non-owners get the audited denial + redirect to /app.
  await requirePlatformOwner();
  const { id } = await params;
  const org = await getBusiness(id);
  if (!org) notFound();
  const users = await listOrgUsers(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/accounts"
          className="text-xs uppercase tracking-[0.18em] text-hud-muted transition hover:text-[var(--hud-accent)]"
        >
          ← Client accounts
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-hud-ink">{org.name}</h1>
          <Badge tone={org.status === "active" ? "green" : "amber"}>
            {org.status}
          </Badge>
          <span className="font-mono text-xs text-hud-muted">{org.slug}</span>
        </div>
        <p className="mt-1 text-sm text-hud-muted">
          Workspace provisioned {formatDate(org.createdAt)} · {users.length}{" "}
          {users.length === 1 ? "user" : "users"}
        </p>
      </div>

      <ThemeForm org={org} />
      <UsersPanel orgId={org.id} initialUsers={users} />
    </div>
  );
}
