"use server";

// tenant-gate: exempt — session-scoped auth events, not tenant data access.
// Org context here is the caller's own, resolved from their session.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

/**
 * Audit a successful sign-in. The login page calls this right after
 * authClient.signIn.email() succeeds, before pushing to /app. Uses the
 * caller's active (or first) org as tenant context; tenant-less sign-ins
 * (no orgs yet) are skipped by logAudit by design.
 */
export async function auditSignIn(): Promise<void> {
  const s = await getSessionUser();
  if (!s) return;
  const membership = await db.member.findFirst({
    where: {
      userId: s.user.id,
      ...(s.session.activeOrganizationId
        ? { organizationId: s.session.activeOrganizationId }
        : {}),
    },
    select: { organizationId: true },
  });
  await logAudit({
    organizationId: membership?.organizationId ?? null,
    actorId: s.user.id,
    action: "auth.sign_in",
    entity: "session",
    entityId: s.session.id,
  });
}

/**
 * Forced/voluntary password change. The caller supplies their current
 * (possibly temporary) password — they were given it out-of-band — so
 * changePassword (not an admin reset) is the right primitive. Clears the
 * mustResetPassword flag and audit-logs. Ends with a redirect to /app.
 */
export async function changePasswordAndClearFlag(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<never> {
  const s = await getSessionUser();
  if (!s) redirect("/login");

  if (!input.newPassword || input.newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
    });
  } catch {
    // Don't leak which half failed; the usual cause is a wrong temp password.
    throw new Error(
      "Password change failed — check your current password and try again.",
    );
  }

  await db.user.update({
    where: { id: s.user.id },
    data: { mustResetPassword: false },
  });

  const membership = await db.member.findFirst({
    where: { userId: s.user.id },
    select: { organizationId: true },
  });
  await logAudit({
    organizationId: membership?.organizationId ?? null,
    actorId: s.user.id,
    action: "auth.password_reset",
    entity: "user",
    entityId: s.user.id,
  });

  redirect("/app");
}
