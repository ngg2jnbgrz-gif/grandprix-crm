"use server";

// tenant-gate: exempt — session/org-switch management, not tenant data
// access. The organizationId handled here is the caller's own active org,
// resolved from their session (never from client input beyond the
// membership-verified org id) — with one deliberate exception: a platform
// owner stepping into a client workspace from the shell switcher, which
// auto-provisions an audit-logged operator membership on first entry.

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSessionUser, isPlatformOwner } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

/**
 * Switch the caller's active organization. Verifies membership first, then
 * updates the session row's activeOrganizationId via Better Auth and
 * audit-logs the switch. Platform owners may enter any business workspace;
 * first entry auto-provisions an audit-logged operator membership.
 * Ends with a redirect to /dashboard.
 */
export async function setActiveOrg(organizationId: string): Promise<never> {
  const s = await getSessionUser();
  if (!s) redirect("/login");

  const membership = await db.member.findFirst({
    where: { userId: s.user.id, organizationId },
    include: { organization: { select: { slug: true, name: true } } },
  });

  // Platform owners (mission control) can step into ANY business workspace
  // from the shell switcher. First entry auto-provisions an operator
  // membership so the tenant shell resolves; the grant is audit-logged.
  // Non-owners still need an existing membership.
  let org = membership?.organization ?? null;
  if (!membership) {
    if (!(await isPlatformOwner(s.user.id))) {
      throw new Error("You are not a member of that workspace.");
    }
    const created = await db.member.create({
      data: { userId: s.user.id, organizationId, role: "admin" },
      include: { organization: { select: { slug: true, name: true } } },
    });
    org = created.organization;
    await logAudit({
      organizationId,
      actorId: s.user.id,
      action: "user.added_to_org",
      entity: "user",
      entityId: s.user.id,
      meta: { role: "admin", reason: "platform_owner_workspace_entry" },
    });
  }

  // Updates the session row in the DB (source of truth); the session token
  // cookie itself is unchanged.
  await auth.api.setActiveOrganization({
    headers: await headers(),
    body: { organizationId },
  });

  await logAudit({
    organizationId,
    actorId: s.user.id,
    action: "org.switched",
    entity: "organization",
    entityId: organizationId,
    meta: { slug: org?.slug ?? organizationId },
  });

  revalidatePath("/app");
  redirect("/dashboard");
}

/**
 * Audit a sign-out. Call BEFORE authClient.signOut() clears the session
 * client-side, while the session (and active org) is still readable.
 * Best-effort: never blocks sign-out.
 */
export async function auditSignOut(): Promise<void> {
  const s = await getSessionUser();
  if (!s) return;
  await logAudit({
    organizationId: s.session.activeOrganizationId ?? null,
    actorId: s.user.id,
    action: "auth.sign_out",
    entity: "session",
    entityId: s.session.id,
  });
}
