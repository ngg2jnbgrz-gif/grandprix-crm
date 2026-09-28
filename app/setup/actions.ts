"use server";

import { hashPassword } from "better-auth/crypto";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * First-boot setup — the ONLY unauthenticated write path in the app.
 *
 * Creates the two organizations, the platform owner account, and
 * optionally imports the Patchogue Flooring partner-lead spreadsheet.
 * Permanently disables itself the moment ANY user exists: both the page
 * and this action refuse to run when db.user.count() > 0.
 */

const ORGS = [
  {
    name: "Patchogue Flooring",
    slug: "patchogue-flooring",
    website: "https://patchogueflooring.com",
    industry: "Flooring & Tile",
  },
  {
    name: "Grand Prix Dynamics",
    slug: "grand-prix-dynamics",
    website: "https://grandprixdynamics.com",
    industry: "Technology & Consulting",
  },
];

const SEED_SOURCE = "setup-import";

export type SetupResult =
  | { ok: true; imported: number; hot: number }
  | { ok: false; error: string };

function str(v: unknown): string {
  return String(v ?? "").trim();
}

export async function runSetup(formData: FormData): Promise<SetupResult> {
  // Gate: one-shot. If anyone already exists, this endpoint is dead.
  const existingUsers = await db.user.count();
  if (existingUsers > 0) {
    return {
      ok: false,
      error: "This workspace is already set up. Sign in instead.",
    };
  }

  const name = str(formData.get("name"));
  const email = str(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { ok: false, error: "Enter your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (password.length < 12)
    return { ok: false, error: "Password must be at least 12 characters." };

  // Organizations (idempotent — safe to re-run before any user exists).
  const orgId: Record<string, string> = {};
  for (const o of ORGS) {
    const org = await db.organization.upsert({
      where: { slug: o.slug },
      update: {},
      create: o,
    });
    orgId[o.slug] = org.id;
  }

  // Owner account — mirrors Better Auth's own credential shape exactly
  // (providerId "credential", accountId = user.id, scrypt hash).
  // mustResetPassword=false: they just chose this password themselves.
  const hashed = await hashPassword(password);
  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        mustResetPassword: false,
      },
    });
    await tx.account.create({
      data: {
        userId: u.id,
        providerId: "credential",
        accountId: u.id,
        password: hashed,
      },
    });
    return u;
  });
  await db.member.create({
    data: {
      userId: user.id,
      organizationId: orgId["grand-prix-dynamics"],
      role: "owner",
    },
  });

  // Optional lead import from the partner-lead spreadsheet.
  let imported = 0;
  let hot = 0;
  const file = formData.get("leads");
  if (file instanceof File && file.size > 0) {
    const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), {
      type: "buffer",
    });
    const sheet = wb.Sheets["All Leads"] ?? wb.Sheets[wb.SheetNames[0]];
    if (!sheet) {
      return { ok: false, error: "Could not read any sheet from that file." };
    }
    // Header row: ID | HOT | Business | Contact | Phone | Website | Town |
    //             Category | Why a fit | Status | Last contact | Next follow-up | Notes
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: "",
    });
    const pfId = orgId["patchogue-flooring"];
    for (const row of rows.slice(1)) {
      if (!Array.isArray(row)) continue;
      const company = str(row[2]);
      if (!company) continue;
      const isHot = str(row[1]).toUpperCase() === "YES";
      const contact = await db.contact.create({
        data: {
          businessId: pfId,
          company,
          firstName: str(row[3]),
          phone: str(row[4]),
          website: str(row[5]),
          town: str(row[6]),
          category: str(row[7]),
          temperature: isHot ? "hot" : "warm",
          priority: isHot,
          source: SEED_SOURCE,
          notes: str(row[8]),
        },
        select: { id: true },
      });
      imported++;
      if (isHot) {
        await db.opportunity.create({
          data: {
            businessId: pfId,
            contactId: contact.id,
            title: `Partner outreach — ${company}`,
            stage: "new",
            probability: 10,
            notes: "Priority partner from the TOP 25 hot list.",
          },
        });
        hot++;
      }
    }
  }

  await logAudit({
    organizationId: orgId["grand-prix-dynamics"],
    actorId: user.id,
    action: "workspace.setup",
    entity: "organization",
    meta: { imported, hot },
  });

  return { ok: true, imported, hot };
}
