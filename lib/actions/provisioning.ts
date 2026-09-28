"use server";

// tenant-gate: exempt — platform-owner provisioning operates across tenants
// by design (it CREATES organizations and users). Every action here is gated
// by requirePlatformOwner() and audit-logged. organizationId (the tenant key
// behind businessId) is threaded through every write.

import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

const ORG_ROLES = ["owner", "admin", "member"] as const;
type OrgRole = (typeof ORG_ROLES)[number];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEMP_PASSWORD_MIN_LENGTH = 12;

function assertTempPassword(pw: string): void {
  if (!pw || pw.length < TEMP_PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Temporary password must be at least ${TEMP_PASSWORD_MIN_LENGTH} characters.`,
    );
  }
}

function assertRole(role: string): asserts role is OrgRole {
  if (!(ORG_ROLES as readonly string[]).includes(role)) {
    throw new Error(`Role must be one of: ${ORG_ROLES.join(" | ")}`);
  }
}

function normalizeEmail(email: string): string {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Invalid email.");
  return e;
}

export type CreateBusinessInput = {
  name: string;
  slug: string;
  website?: string;
  industry?: string;
  phone?: string;
  adminName: string;
  adminEmail: string;
  tempPassword: string;
};

/**
 * Create a client business (Organization) plus its first admin user.
 * The admin gets a scrypt-hashed credential account and mustResetPassword=true
 * so the forced-reset flow picks them up on first sign-in.
 * Returns { orgId } — NEVER the password.
 */
export async function createBusinessWithAdmin(
  input: CreateBusinessInput,
): Promise<{ orgId: string }> {
  const ctx = await requirePlatformOwner();

  const slug = input.slug.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers and hyphens.");
  }
  assertTempPassword(input.tempPassword);
  const adminEmail = normalizeEmail(input.adminEmail);
  const name = input.name.trim();
  const adminName = input.adminName.trim();
  if (!name) throw new Error("Business name is required.");
  if (!adminName) throw new Error("Admin name is required.");

  if (await db.organization.findUnique({ where: { slug } })) {
    throw new Error(`Slug "${slug}" is already taken.`);
  }
  if (await db.user.findUnique({ where: { email: adminEmail } })) {
    throw new Error(
      `A user with email ${adminEmail} already exists — add them to the business via createPortalUser instead.`,
    );
  }

  // scrypt (Better Auth's hasher) BEFORE opening the transaction.
  const password = await hashPassword(input.tempPassword);

  const { org, admin } = await db.$transaction(async (tx) => {
    // Mirror better-auth's own user/account shape exactly:
    // Account = { providerId: "credential", accountId: <user.id>, password: <scrypt hash> }
    const adminUser = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        emailVerified: false,
        mustResetPassword: true,
      },
    });
    await tx.account.create({
      data: {
        userId: adminUser.id,
        providerId: "credential",
        accountId: adminUser.id,
        password,
      },
    });
    const newOrg = await tx.organization.create({
      data: {
        name,
        slug,
        website: input.website?.trim() ?? "",
        industry: input.industry?.trim() ?? "",
        phone: input.phone?.trim() ?? "",
        primaryColor: "#07111a",
        accent: "#35e7ff",
        status: "active",
      },
    });
    await tx.member.create({
      data: {
        userId: adminUser.id,
        organizationId: newOrg.id,
        role: "owner",
      },
    });
    return { org: newOrg, admin: adminUser };
  });

  await logAudit({
    organizationId: org.id,
    actorId: ctx.user.id,
    action: "business.created",
    entity: "organization",
    entityId: org.id,
    meta: { slug, adminEmail: admin.email },
  });

  return { orgId: org.id };
}

export type CreatePortalUserInput = {
  organizationId: string;
  name: string;
  email: string;
  tempPassword: string;
  role: string;
};

/**
 * Add a user to a business. Better Auth users are GLOBAL (one login can
 * belong to many orgs), so:
 *  - email uniqueness is enforced PER ORG at app level (no duplicate member
 *    emails inside one org);
 *  - if the email already exists as a user elsewhere, we reuse that login
 *    and only add the membership (their existing password is untouched —
 *    tempPassword is ignored in that case).
 * Returns { userId } — NEVER the password.
 */
export async function createPortalUser(
  input: CreatePortalUserInput,
): Promise<{ userId: string }> {
  const ctx = await requirePlatformOwner();
  assertRole(input.role);
  assertTempPassword(input.tempPassword);
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");

  const org = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, slug: true },
  });
  if (!org) throw new Error("Business not found.");

  const clash = await db.member.findFirst({
    where: { organizationId: org.id, user: { email } },
    select: { id: true },
  });
  if (clash) {
    throw new Error(`This business already has a user with email ${email}.`);
  }

  let user = await db.user.findUnique({ where: { email } });
  let created = false;
  if (!user) {
    const password = await hashPassword(input.tempPassword);
    const createdUser = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { name, email, emailVerified: false, mustResetPassword: true },
      });
      await tx.account.create({
        data: {
          userId: u.id,
          providerId: "credential",
          accountId: u.id,
          password,
        },
      });
      return u;
    });
    user = createdUser;
    created = true;
  }

  await db.member.create({
    data: { userId: user.id, organizationId: org.id, role: input.role },
  });

  await logAudit({
    organizationId: org.id,
    actorId: ctx.user.id,
    action: created ? "user.created" : "user.added_to_org",
    entity: "user",
    entityId: user.id,
    meta: { email, role: input.role, reusedLogin: !created },
  });

  return { userId: user.id };
}

/** List all businesses (platform-owner view). */
export async function listBusinesses() {
  await requirePlatformOwner();
  const orgs = await db.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      industry: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });
  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    status: o.status,
    industry: o.industry,
    memberCount: o._count.members,
    createdAt: o.createdAt.toISOString(),
  }));
}

/** List users (members) of one business. */
export async function listOrgUsers(organizationId: string) {
  await requirePlatformOwner();
  const members = await db.member.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          mustResetPassword: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => ({
    membershipId: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    mustResetPassword: m.user.mustResetPassword,
    createdAt: m.user.createdAt.toISOString(),
  }));
}

/** Change a member's role. Protects the last owner of an org. */
export async function setUserRole(input: {
  organizationId: string;
  userId: string;
  role: string;
}) {
  const ctx = await requirePlatformOwner();
  assertRole(input.role);

  const membership = await db.member.findFirst({
    where: { organizationId: input.organizationId, userId: input.userId },
  });
  if (!membership) throw new Error("Membership not found.");

  if (membership.role === "owner" && input.role !== "owner") {
    const owners = await db.member.count({
      where: { organizationId: input.organizationId, role: "owner" },
    });
    if (owners <= 1) {
      throw new Error("Cannot demote the last owner of a business.");
    }
  }

  await db.member.update({
    where: { id: membership.id },
    data: { role: input.role },
  });

  await logAudit({
    organizationId: input.organizationId,
    actorId: ctx.user.id,
    action: "user.role_changed",
    entity: "user",
    entityId: input.userId,
    meta: { from: membership.role, to: input.role },
  });

  return { ok: true };
}

/**
 * Revoke a user's access to a business by deleting their Member row.
 * The User + credential Account rows are kept — the human may belong to
 * other orgs with the same login. Protects the last owner of an org.
 */
export async function deactivateUser(input: {
  organizationId: string;
  userId: string;
}) {
  const ctx = await requirePlatformOwner();

  const membership = await db.member.findFirst({
    where: { organizationId: input.organizationId, userId: input.userId },
  });
  if (!membership) throw new Error("Membership not found.");

  if (membership.role === "owner") {
    const owners = await db.member.count({
      where: { organizationId: input.organizationId, role: "owner" },
    });
    if (owners <= 1) {
      throw new Error("Cannot remove the last owner of a business.");
    }
  }

  await db.member.delete({ where: { id: membership.id } });

  await logAudit({
    organizationId: input.organizationId,
    actorId: ctx.user.id,
    action: "user.deactivated",
    entity: "user",
    entityId: input.userId,
    meta: { role: membership.role },
  });

  return { ok: true };
}
