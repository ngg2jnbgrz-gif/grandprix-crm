"use server";

// tenant-gate: exempt — platform-owner multi-tenant administration operates
// across businesses by design (it CREATES and UPDATES organizations). Every
// action here is gated by requirePlatformOwner() and audit-logged.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

export type BusinessSummary = {
  id: string;
  name: string;
  slug: string;
  website: string;
  industry: string;
  phone: string;
  status: string;
  logoUrl: string;
  primaryColor: string;
  accent: string;
  createdAt: string;
  memberCount: number;
  contactCount: number;
  opportunityCount: number;
  invoiceCount: number;
};

/** List every business with workspace counts (platform-owner view). */
export async function listBusinessesWithCounts(): Promise<BusinessSummary[]> {
  await requirePlatformOwner();
  const orgs = await db.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      website: true,
      industry: true,
      phone: true,
      status: true,
      logoUrl: true,
      primaryColor: true,
      accent: true,
      createdAt: true,
      _count: {
        select: {
          members: true,
          contacts: true,
          opportunities: true,
          invoices: true,
        },
      },
    },
  });
  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    website: o.website,
    industry: o.industry,
    phone: o.phone,
    status: o.status,
    logoUrl: o.logoUrl,
    primaryColor: o.primaryColor,
    accent: o.accent,
    createdAt: o.createdAt.toISOString(),
    memberCount: o._count.members,
    contactCount: o._count.contacts,
    opportunityCount: o._count.opportunities,
    invoiceCount: o._count.invoices,
  }));
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ORG_STATUSES = ["active", "trial", "suspended", "archived"] as const;

function assertHexColor(value: string, field: string): void {
  if (!HEX_RE.test(value.trim())) {
    throw new Error(`${field} must be a hex color like #35e7ff.`);
  }
}

export type UpdateOrganizationInput = {
  organizationId: string;
  name: string;
  logoUrl: string;
  website: string;
  industry: string;
  phone: string;
  primaryColor: string;
  accent: string;
  status: string;
};

/**
 * Update a business's profile + white-label theme. Revalidates the accounts
 * list and detail pages so the new theme applies immediately.
 */
export async function updateOrganization(
  input: UpdateOrganizationInput,
): Promise<{ ok: true }> {
  const ctx = await requirePlatformOwner();

  const name = input.name.trim();
  if (!name) throw new Error("Business name is required.");
  assertHexColor(input.primaryColor, "Primary color");
  assertHexColor(input.accent, "Accent color");
  if (!(ORG_STATUSES as readonly string[]).includes(input.status)) {
    throw new Error(`Status must be one of: ${ORG_STATUSES.join(" | ")}`);
  }

  const org = await db.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, slug: true },
  });
  if (!org) throw new Error("Business not found.");

  await db.organization.update({
    where: { id: org.id },
    data: {
      name,
      logoUrl: input.logoUrl.trim(),
      website: input.website.trim(),
      industry: input.industry.trim(),
      phone: input.phone.trim(),
      primaryColor: input.primaryColor.trim(),
      accent: input.accent.trim(),
      status: input.status,
    },
  });

  await logAudit({
    organizationId: org.id,
    actorId: ctx.user.id,
    action: "business.updated",
    entity: "organization",
    entityId: org.id,
    meta: { name, status: input.status },
  });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${org.id}`);
  return { ok: true };
}

/** Fetch one business for the detail page (platform-owner view). */
export async function getBusiness(organizationId: string) {
  await requirePlatformOwner();
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      website: true,
      industry: true,
      phone: true,
      status: true,
      logoUrl: true,
      primaryColor: true,
      accent: true,
      createdAt: true,
    },
  });
  if (!org) return null;
  return { ...org, createdAt: org.createdAt.toISOString() };
}
