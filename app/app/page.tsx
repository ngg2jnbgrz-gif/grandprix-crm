import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/tenant";
import { db } from "@/lib/db";
import { setActiveOrg } from "@/lib/actions/org";
import { OrgPicker } from "./org-picker";

export const dynamic = "force-dynamic";

/**
 * Post-login org gate. Resolves which workspace the session enters:
 *  - 0 orgs  → "no workspace" message (an owner must provision access)
 *  - 1 org   → set it active and continue to /dashboard
 *  - 2+ orgs → render the workspace picker
 */
export default async function AppGate() {
  const s = await getSessionUser();
  if (!s) redirect("/login");
  if (s.user.mustResetPassword) redirect("/reset-password");

  const memberships = await db.member.findMany({
    where: { userId: s.user.id },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-hud-bg px-4">
        <div className="w-full max-w-md rounded-lg border border-hud-line bg-hud-panel p-8 text-center shadow-hud-panel">
          <h1 className="mb-2 text-xl font-semibold text-hud-ink">
            No workspace yet
          </h1>
          <p className="text-sm text-hud-muted">
            Your account isn&apos;t attached to a business workspace. Ask your
            administrator to provision access, then sign in again.
          </p>
        </div>
      </main>
    );
  }

  if (memberships.length === 1) {
    // Verifies membership, sets the active org, audit-logs, redirects.
    await setActiveOrg(memberships[0].organizationId);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-hud-bg px-4">
      <div className="w-full max-w-md rounded-lg border border-hud-line bg-hud-panel p-8 shadow-hud-panel">
        <h1 className="mb-1 text-xl font-semibold text-hud-ink">
          Choose a workspace
        </h1>
        <p className="mb-6 text-sm text-hud-muted">
          You belong to more than one business. Pick where to work.
        </p>
        <OrgPicker
          orgs={memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role,
          }))}
        />
      </div>
    </main>
  );
}
