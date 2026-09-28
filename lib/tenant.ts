import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { logAudit } from "./audit";

/** Slug of the platform owner's own organization. Platform-owner powers
 *  are granted ONLY to members with role "owner" on THIS org — never to
 *  an "owner" of a client org. See ARCHITECTURE.md ("Shell contract"). */
export const PLATFORM_ORG_SLUG = "grand-prix-dynamics";

export type SessionUser = {
  user: {
    id: string;
    name: string;
    email: string;
    mustResetPassword: boolean;
  };
  session: {
    id: string;
    activeOrganizationId?: string | null;
  };
};

/**
 * Current session, or null. Server-only (uses next/headers).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });
  if (!result?.session || !result?.user) return null;
  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      mustResetPassword: result.user.mustResetPassword ?? false,
    },
    session: {
      id: result.session.id,
      activeOrganizationId: result.session.activeOrganizationId ?? null,
    },
  };
}

export type OrgContext = {
  user: SessionUser["user"];
  organization: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
    accent: string;
    status: string;
  };
  membership: { id: string };
  role: string;
};

/**
 * Resolve the caller's active tenant. NEVER returns null — redirects instead.
 *
 * Convention (enforced by `npm run check:tenant`): every server action in
 * lib/actions/* MUST call requireOrg() (or requirePlatformOwner()) and scope
 * ALL Prisma queries with `businessId: organization.id`. Never accept a
 * businessId / organizationId from client input.
 */
export async function requireOrg(): Promise<OrgContext> {
  const s = await getSessionUser();
  if (!s) redirect("/login");

  const activeOrgId = s.session.activeOrganizationId;
  if (!activeOrgId) redirect("/app"); // org gate resolves/picks the workspace

  const membership = await db.member.findFirst({
    where: { userId: s.user.id, organizationId: activeOrgId },
    include: { organization: true },
  });
  if (!membership) redirect("/app"); // stale active org — re-resolve

  return {
    user: s.user,
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      primaryColor: membership.organization.primaryColor,
      accent: membership.organization.accent,
      status: membership.organization.status,
    },
    membership: { id: membership.id },
    role: membership.role,
  };
}

/**
 * Platform-owner check: is this user an "owner" of the Grand Prix Dynamics
 * org? Client-org owners get FALSE — owner powers are platform-scoped.
 */
export async function isPlatformOwner(userId: string): Promise<boolean> {
  const m = await db.member.findFirst({
    where: {
      userId,
      role: "owner",
      organization: { slug: PLATFORM_ORG_SLUG },
    },
    select: { id: true },
  });
  return m !== null;
}

/**
 * requireOrg() + platform-owner gate. Redirects non-owners to /app and
 * audit-logs the denied attempt.
 */
export async function requirePlatformOwner(): Promise<OrgContext> {
  const ctx = await requireOrg();
  if (!(await isPlatformOwner(ctx.user.id))) {
    await logAudit({
      organizationId: ctx.organization.id,
      actorId: ctx.user.id,
      action: "platform.forbidden",
      entity: "platform",
      meta: { role: ctx.role, orgSlug: ctx.organization.slug },
    });
    redirect("/app");
  }
  return ctx;
}
