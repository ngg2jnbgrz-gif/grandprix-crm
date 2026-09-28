"use server";

/**
 * STAGE 4b — growth & system module actions: campaigns, automations,
 * invoices, reviews, social posts, web assets, integrations.
 *
 * Every action resolves the caller with requireOrg() (or
 * requirePlatformOwner() for integrations) and scopes ALL Prisma queries by
 * `businessId: organization.id`. No businessId / organizationId is ever
 * taken from client input.
 */

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOrg, requirePlatformOwner } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { contactDisplayName } from "@/lib/format";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES,
  INVOICE_STATUSES,
  REVIEW_STATUSES,
  SOCIAL_CHANNELS,
  SOCIAL_STATUSES,
  WEBASSET_KINDS,
  WEBASSET_STATUSES,
  INTEGRATION_KINDS,
  INTEGRATION_STATUSES,
} from "@/lib/crm-growth-lists";

// ── shared helpers ────────────────────────────────────────────────────

function assertOneOf(
  value: string,
  allowed: readonly string[],
  field: string,
): void {
  if (!allowed.includes(value)) {
    throw new Error(`${field} must be one of: ${allowed.join(" | ")}.`);
  }
}

function parseAmount(raw: string, field = "Amount"): number {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }
  return Math.round(n * 100) / 100;
}

function parseOptionalDate(raw: string | null | undefined): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date.");
  return d;
}

function parseRating(raw: string): number {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error("Rating must be a whole number from 1 to 5.");
  }
  return n;
}

export type ContactOption = { id: string; name: string };

/** Contacts for select inputs — tenant-scoped. */
export async function listContactOptions(): Promise<ContactOption[]> {
  const { organization } = await requireOrg();
  const contacts = await db.contact.findMany({
    where: { businessId: organization.id },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, company: true },
  });
  return contacts.map((c) => ({ id: c.id, name: contactDisplayName(c) }));
}

// ── Campaigns ─────────────────────────────────────────────────────────

export type CampaignRow = {
  id: string;
  name: string;
  channel: string;
  status: string;
  body: string;
  createdAt: string;
};

export async function listCampaigns(): Promise<CampaignRow[]> {
  const { organization } = await requireOrg();
  const rows = await db.campaign.findMany({
    where: { businessId: organization.id },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel,
    status: c.status,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  }));
}

export type CampaignInput = {
  id?: string;
  name: string;
  channel: string;
  status: string;
  body?: string;
};

export async function saveCampaign(input: CampaignInput): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;

  const name = input.name.trim();
  if (!name) throw new Error("Campaign name is required.");
  assertOneOf(input.channel, CAMPAIGN_CHANNELS, "Channel");
  assertOneOf(input.status, CAMPAIGN_STATUSES, "Status");
  const body = (input.body ?? "").trim();

  if (input.id) {
    const existing = await db.campaign.findFirst({
      where: { id: input.id, businessId },
      select: { id: true },
    });
    if (!existing) throw new Error("Campaign not found.");
    await db.campaign.update({
      where: { id: existing.id },
      data: { name, channel: input.channel, status: input.status, body },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "campaign.updated",
      entity: "campaign",
      entityId: existing.id,
      meta: { name, status: input.status },
    });
  } else {
    const created = await db.campaign.create({
      data: { businessId, name, channel: input.channel, status: input.status, body },
      select: { id: true },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "campaign.created",
      entity: "campaign",
      entityId: created.id,
      meta: { name, channel: input.channel },
    });
  }

  revalidatePath("/campaigns");
  return { ok: true };
}

export async function setCampaignStatus(
  id: string,
  status: string,
): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  assertOneOf(status, CAMPAIGN_STATUSES, "Status");
  const existing = await db.campaign.findFirst({
    where: { id, businessId },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Campaign not found.");
  await db.campaign.update({ where: { id: existing.id }, data: { status } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "campaign.status_changed",
    entity: "campaign",
    entityId: existing.id,
    meta: { name: existing.name, status },
  });
  revalidatePath("/campaigns");
  return { ok: true };
}

export async function deleteCampaign(id: string): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.campaign.findFirst({
    where: { id, businessId },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Campaign not found.");
  await db.campaign.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "campaign.deleted",
    entity: "campaign",
    entityId: existing.id,
    meta: { name: existing.name },
  });
  revalidatePath("/campaigns");
  return { ok: true };
}

// ── Automations (rule records — NOT a live execution engine) ──────────

export type AutomationRow = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
};

export async function listAutomations(): Promise<AutomationRow[]> {
  const { organization } = await requireOrg();
  const rows = await db.automation.findMany({
    where: { businessId: organization.id },
    orderBy: { name: "asc" },
  });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    trigger: a.trigger,
    action: a.action,
    enabled: a.enabled,
  }));
}

export type AutomationInput = {
  id?: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
};

export async function saveAutomation(
  input: AutomationInput,
): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;

  const name = input.name.trim();
  if (!name) throw new Error("Automation name is required.");
  const trigger = input.trigger.trim();
  const action = input.action.trim();
  if (!trigger) throw new Error("Trigger is required.");
  if (!action) throw new Error("Action is required.");

  if (input.id) {
    const existing = await db.automation.findFirst({
      where: { id: input.id, businessId },
      select: { id: true },
    });
    if (!existing) throw new Error("Automation not found.");
    await db.automation.update({
      where: { id: existing.id },
      data: { name, trigger, action, enabled: input.enabled },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "automation.updated",
      entity: "automation",
      entityId: existing.id,
      meta: { name },
    });
  } else {
    const created = await db.automation.create({
      data: {
        businessId,
        name,
        trigger,
        action,
        enabled: input.enabled,
      },
      select: { id: true },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "automation.created",
      entity: "automation",
      entityId: created.id,
      meta: { name },
    });
  }

  revalidatePath("/automations");
  return { ok: true };
}

export async function toggleAutomation(
  id: string,
  enabled: boolean,
): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.automation.findFirst({
    where: { id, businessId },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Automation not found.");
  await db.automation.update({
    where: { id: existing.id },
    data: { enabled },
  });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "automation.toggled",
    entity: "automation",
    entityId: existing.id,
    meta: { name: existing.name, enabled },
  });
  revalidatePath("/automations");
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.automation.findFirst({
    where: { id, businessId },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Automation not found.");
  await db.automation.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "automation.deleted",
    entity: "automation",
    entityId: existing.id,
    meta: { name: existing.name },
  });
  revalidatePath("/automations");
  return { ok: true };
}

// ── Invoices ──────────────────────────────────────────────────────────

export type InvoiceRow = {
  id: string;
  number: string;
  contactId: string | null;
  contactName: string;
  amount: number;
  status: string;
  dueDate: string | null;
  notes: string;
};

export type InvoiceStats = {
  outstandingTotal: number;
  overdueCount: number;
  paidTotal: number;
  invoiceCount: number;
};

export async function listInvoices(): Promise<InvoiceRow[]> {
  const { organization } = await requireOrg();
  // Invoice has no createdAt — ids are cuid() (time-sortable), so
  // descending id approximates newest-first.
  const rows = await db.invoice.findMany({
    where: { businessId: organization.id },
    orderBy: { id: "desc" },
    include: {
      contact: {
        select: { firstName: true, lastName: true, company: true },
      },
    },
  });
  return rows.map((i) => ({
    id: i.id,
    number: i.number,
    contactId: i.contactId,
    contactName: contactDisplayName(i.contact),
    amount: Number(i.amount),
    status: i.status,
    dueDate: i.dueDate ? i.dueDate.toISOString() : null,
    notes: i.notes,
  }));
}

export async function invoiceStats(): Promise<InvoiceStats> {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const [outstanding, paid, overdueCount, invoiceCount] = await Promise.all([
    db.invoice.aggregate({
      where: { businessId, status: { in: ["sent", "overdue"] } },
      _sum: { amount: true },
    }),
    db.invoice.aggregate({
      where: { businessId, status: "paid" },
      _sum: { amount: true },
    }),
    db.invoice.count({
      where: {
        businessId,
        status: { in: ["sent", "overdue"] },
        dueDate: { lt: new Date() },
      },
    }),
    db.invoice.count({ where: { businessId } }),
  ]);
  return {
    outstandingTotal: Number(outstanding._sum.amount ?? 0),
    overdueCount,
    paidTotal: Number(paid._sum.amount ?? 0),
    invoiceCount,
  };
}

/** Suggest the next invoice number (INV-0001 style) for this business. */
export async function suggestInvoiceNumber(): Promise<string> {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const recent = await db.invoice.findMany({
    where: { businessId },
    orderBy: { id: "desc" },
    take: 200,
    select: { number: true },
  });
  let max = 0;
  for (const r of recent) {
    const m = /(\d+)\s*$/.exec(r.number);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const count = await db.invoice.count({ where: { businessId } });
  const next = Math.max(max + 1, count + 1);
  return `INV-${String(next).padStart(4, "0")}`;
}

export type InvoiceInput = {
  id?: string;
  number: string;
  contactId?: string | null;
  amount: string;
  dueDate?: string | null;
  status: string;
  notes?: string;
};

export async function saveInvoice(input: InvoiceInput): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;

  const number = input.number.trim();
  if (!number) throw new Error("Invoice number is required.");
  assertOneOf(input.status, INVOICE_STATUSES, "Status");
  const amount = parseAmount(input.amount);
  const dueDate = parseOptionalDate(input.dueDate);
  const notes = (input.notes ?? "").trim();

  let contactId: string | null = null;
  if (input.contactId) {
    const contact = await db.contact.findFirst({
      where: { id: input.contactId, businessId },
      select: { id: true },
    });
    if (!contact) throw new Error("Contact not found.");
    contactId = contact.id;
  }

  if (input.id) {
    const existing = await db.invoice.findFirst({
      where: { id: input.id, businessId },
      select: { id: true, number: true },
    });
    if (!existing) throw new Error("Invoice not found.");
    const duplicate = await db.invoice.findFirst({
      where: { businessId, number, id: { not: existing.id } },
      select: { id: true },
    });
    if (duplicate) throw new Error(`Invoice number ${number} is already in use.`);
    await db.invoice.update({
      where: { id: existing.id },
      data: { number, contactId, amount, dueDate, status: input.status, notes },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "invoice.updated",
      entity: "invoice",
      entityId: existing.id,
      meta: { number, status: input.status, amount },
    });
  } else {
    const duplicate = await db.invoice.findFirst({
      where: { businessId, number },
      select: { id: true },
    });
    if (duplicate) throw new Error(`Invoice number ${number} is already in use.`);
    const created = await db.invoice.create({
      data: { businessId, number, contactId, amount, dueDate, status: input.status, notes },
      select: { id: true },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "invoice.created",
      entity: "invoice",
      entityId: created.id,
      meta: { number, status: input.status, amount },
    });
  }

  revalidatePath("/invoices");
  return { ok: true };
}

export async function setInvoiceStatus(
  id: string,
  status: string,
): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  assertOneOf(status, INVOICE_STATUSES, "Status");
  const existing = await db.invoice.findFirst({
    where: { id, businessId },
    select: { id: true, number: true },
  });
  if (!existing) throw new Error("Invoice not found.");
  await db.invoice.update({ where: { id: existing.id }, data: { status } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "invoice.status_changed",
    entity: "invoice",
    entityId: existing.id,
    meta: { number: existing.number, status },
  });
  revalidatePath("/invoices");
  return { ok: true };
}

export async function deleteInvoice(id: string): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.invoice.findFirst({
    where: { id, businessId },
    select: { id: true, number: true },
  });
  if (!existing) throw new Error("Invoice not found.");
  await db.invoice.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "invoice.deleted",
    entity: "invoice",
    entityId: existing.id,
    meta: { number: existing.number },
  });
  revalidatePath("/invoices");
  return { ok: true };
}

// ── Reviews ───────────────────────────────────────────────────────────

export type ReviewRow = {
  id: string;
  author: string;
  rating: number;
  text: string;
  source: string;
  status: string;
  contactId: string | null;
  contactName: string;
};

export async function listReviews(): Promise<ReviewRow[]> {
  const { organization } = await requireOrg();
  const rows = await db.review.findMany({
    where: { businessId: organization.id },
    orderBy: { id: "desc" },
    include: {
      contact: {
        select: { firstName: true, lastName: true, company: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    author: r.author,
    rating: r.rating,
    text: r.text,
    source: r.source,
    status: r.status,
    contactId: r.contactId,
    contactName: contactDisplayName(r.contact),
  }));
}

export type ReviewInput = {
  id?: string;
  author: string;
  rating: string;
  text?: string;
  source?: string;
  status: string;
  contactId?: string | null;
};

export async function saveReview(input: ReviewInput): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;

  const author = input.author.trim();
  if (!author) throw new Error("Author is required.");
  const rating = parseRating(input.rating);
  assertOneOf(input.status, REVIEW_STATUSES, "Status");
  const text = (input.text ?? "").trim();
  const source = (input.source ?? "").trim();

  let contactId: string | null = null;
  if (input.contactId) {
    const contact = await db.contact.findFirst({
      where: { id: input.contactId, businessId },
      select: { id: true },
    });
    if (!contact) throw new Error("Contact not found.");
    contactId = contact.id;
  }

  if (input.id) {
    const existing = await db.review.findFirst({
      where: { id: input.id, businessId },
      select: { id: true },
    });
    if (!existing) throw new Error("Review not found.");
    await db.review.update({
      where: { id: existing.id },
      data: { author, rating, text, source, status: input.status, contactId },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "review.updated",
      entity: "review",
      entityId: existing.id,
      meta: { author, rating, status: input.status },
    });
  } else {
    const created = await db.review.create({
      data: {
        businessId,
        author,
        rating,
        text,
        source,
        status: input.status,
        contactId,
      },
      select: { id: true },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "review.created",
      entity: "review",
      entityId: created.id,
      meta: { author, rating, source },
    });
  }

  revalidatePath("/reviews");
  return { ok: true };
}

export async function setReviewStatus(
  id: string,
  status: string,
): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  assertOneOf(status, REVIEW_STATUSES, "Status");
  const existing = await db.review.findFirst({
    where: { id, businessId },
    select: { id: true, author: true },
  });
  if (!existing) throw new Error("Review not found.");
  await db.review.update({ where: { id: existing.id }, data: { status } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "review.status_changed",
    entity: "review",
    entityId: existing.id,
    meta: { author: existing.author, status },
  });
  revalidatePath("/reviews");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.review.findFirst({
    where: { id, businessId },
    select: { id: true, author: true },
  });
  if (!existing) throw new Error("Review not found.");
  await db.review.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "review.deleted",
    entity: "review",
    entityId: existing.id,
    meta: { author: existing.author },
  });
  revalidatePath("/reviews");
  return { ok: true };
}

// ── Social posts ──────────────────────────────────────────────────────

export type SocialPostRow = {
  id: string;
  channel: string;
  content: string;
  scheduledAt: string | null;
  status: string;
};

export async function listSocialPosts(): Promise<SocialPostRow[]> {
  const { organization } = await requireOrg();
  const rows = await db.socialPost.findMany({
    where: { businessId: organization.id },
    orderBy: { id: "desc" },
  });
  return rows.map((p) => ({
    id: p.id,
    channel: p.channel,
    content: p.content,
    scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
    status: p.status,
  }));
}

export type SocialPostInput = {
  id?: string;
  channel: string;
  content: string;
  scheduledAt?: string | null;
  status: string;
};

export async function saveSocialPost(
  input: SocialPostInput,
): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;

  assertOneOf(input.channel, SOCIAL_CHANNELS, "Channel");
  const content = input.content.trim();
  if (!content) throw new Error("Content is required.");
  assertOneOf(input.status, SOCIAL_STATUSES, "Status");
  const scheduledAt = parseOptionalDate(input.scheduledAt);

  if (input.id) {
    const existing = await db.socialPost.findFirst({
      where: { id: input.id, businessId },
      select: { id: true },
    });
    if (!existing) throw new Error("Post not found.");
    await db.socialPost.update({
      where: { id: existing.id },
      data: { channel: input.channel, content, scheduledAt, status: input.status },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "social.updated",
      entity: "social_post",
      entityId: existing.id,
      meta: { channel: input.channel, status: input.status },
    });
  } else {
    const created = await db.socialPost.create({
      data: {
        businessId,
        channel: input.channel,
        content,
        scheduledAt,
        status: input.status,
      },
      select: { id: true },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "social.created",
      entity: "social_post",
      entityId: created.id,
      meta: { channel: input.channel, status: input.status },
    });
  }

  revalidatePath("/social");
  return { ok: true };
}

/**
 * Mark a post as published in the CRM record. This does NOT post to any
 * network — publishing to the actual channel happens outside the CRM.
 */
export async function publishSocialPost(id: string): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.socialPost.findFirst({
    where: { id, businessId },
    select: { id: true, channel: true },
  });
  if (!existing) throw new Error("Post not found.");
  await db.socialPost.update({
    where: { id: existing.id },
    data: { status: "published" },
  });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "social.published",
    entity: "social_post",
    entityId: existing.id,
    meta: { channel: existing.channel },
  });
  revalidatePath("/social");
  return { ok: true };
}

export async function deleteSocialPost(id: string): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.socialPost.findFirst({
    where: { id, businessId },
    select: { id: true, channel: true },
  });
  if (!existing) throw new Error("Post not found.");
  await db.socialPost.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "social.deleted",
    entity: "social_post",
    entityId: existing.id,
    meta: { channel: existing.channel },
  });
  revalidatePath("/social");
  return { ok: true };
}

// ── Sites & funnels (web assets — records tracker, not live publishing)

export type WebAssetRow = {
  id: string;
  name: string;
  kind: string;
  url: string;
  status: string;
  notes: string;
};

export async function listWebAssets(): Promise<WebAssetRow[]> {
  const { organization } = await requireOrg();
  const rows = await db.webAsset.findMany({
    where: { businessId: organization.id },
    orderBy: { name: "asc" },
  });
  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    kind: w.kind,
    url: w.url,
    status: w.status,
    notes: w.notes,
  }));
}

export type WebAssetInput = {
  id?: string;
  name: string;
  kind: string;
  url?: string;
  status: string;
  notes?: string;
};

export async function saveWebAsset(
  input: WebAssetInput,
): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;

  const name = input.name.trim();
  if (!name) throw new Error("Asset name is required.");
  assertOneOf(input.kind, WEBASSET_KINDS, "Kind");
  assertOneOf(input.status, WEBASSET_STATUSES, "Status");
  const url = (input.url ?? "").trim();
  const notes = (input.notes ?? "").trim();

  if (input.id) {
    const existing = await db.webAsset.findFirst({
      where: { id: input.id, businessId },
      select: { id: true },
    });
    if (!existing) throw new Error("Web asset not found.");
    await db.webAsset.update({
      where: { id: existing.id },
      data: { name, kind: input.kind, url, status: input.status, notes },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "webasset.updated",
      entity: "web_asset",
      entityId: existing.id,
      meta: { name, kind: input.kind, status: input.status },
    });
  } else {
    const created = await db.webAsset.create({
      data: { businessId, name, kind: input.kind, url, status: input.status, notes },
      select: { id: true },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "webasset.created",
      entity: "web_asset",
      entityId: created.id,
      meta: { name, kind: input.kind },
    });
  }

  revalidatePath("/sites");
  return { ok: true };
}

export async function deleteWebAsset(id: string): Promise<{ ok: true }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.webAsset.findFirst({
    where: { id, businessId },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Web asset not found.");
  await db.webAsset.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "webasset.deleted",
    entity: "web_asset",
    entityId: existing.id,
    meta: { name: existing.name },
  });
  revalidatePath("/sites");
  return { ok: true };
}

// ── Integrations (PLATFORM OWNER ONLY — defense in depth: the nav already
// hides this route from client shells, and the page itself gates with
// requirePlatformOwner() before rendering anything).

export type IntegrationRow = {
  id: string;
  name: string;
  kind: string;
  configJson: string;
  status: string;
};

function parseConfigJson(raw: string): Prisma.InputJsonValue {
  const s = raw.trim();
  const parsed: unknown = s === "" ? {} : JSON.parse(s);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Config must be a JSON object (e.g. { \"url\": \"…\" }).");
  }
  return parsed as Prisma.InputJsonValue;
}

export async function listIntegrations(): Promise<IntegrationRow[]> {
  const { organization } = await requirePlatformOwner();
  const rows = await db.integration.findMany({
    where: { businessId: organization.id },
    orderBy: { name: "asc" },
  });
  return rows.map((i) => ({
    id: i.id,
    name: i.name,
    kind: i.kind,
    configJson: JSON.stringify(i.config ?? {}),
    status: i.status,
  }));
}

export type IntegrationInput = {
  id?: string;
  name: string;
  kind: string;
  configJson: string;
  status: string;
};

export async function saveIntegration(
  input: IntegrationInput,
): Promise<{ ok: true }> {
  const { user, organization } = await requirePlatformOwner();
  const businessId = organization.id;

  const name = input.name.trim();
  if (!name) throw new Error("Integration name is required.");
  assertOneOf(input.kind, INTEGRATION_KINDS, "Kind");
  assertOneOf(input.status, INTEGRATION_STATUSES, "Status");
  let config: Prisma.InputJsonValue;
  try {
    config = parseConfigJson(input.configJson);
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Config must be valid JSON.",
    );
  }

  if (input.id) {
    const existing = await db.integration.findFirst({
      where: { id: input.id, businessId },
      select: { id: true },
    });
    if (!existing) throw new Error("Integration not found.");
    await db.integration.update({
      where: { id: existing.id },
      data: { name, kind: input.kind, config, status: input.status },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "integration.updated",
      entity: "integration",
      entityId: existing.id,
      meta: { name, kind: input.kind, status: input.status },
    });
  } else {
    const created = await db.integration.create({
      data: { businessId, name, kind: input.kind, config, status: input.status },
      select: { id: true },
    });
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "integration.created",
      entity: "integration",
      entityId: created.id,
      meta: { name, kind: input.kind },
    });
  }

  revalidatePath("/integrations");
  return { ok: true };
}

export async function setIntegrationStatus(
  id: string,
  status: string,
): Promise<{ ok: true }> {
  const { user, organization } = await requirePlatformOwner();
  const businessId = organization.id;
  assertOneOf(status, INTEGRATION_STATUSES, "Status");
  const existing = await db.integration.findFirst({
    where: { id, businessId },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Integration not found.");
  await db.integration.update({
    where: { id: existing.id },
    data: { status },
  });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "integration.status_changed",
    entity: "integration",
    entityId: existing.id,
    meta: { name: existing.name, status },
  });
  revalidatePath("/integrations");
  return { ok: true };
}

export async function deleteIntegration(id: string): Promise<{ ok: true }> {
  const { user, organization } = await requirePlatformOwner();
  const businessId = organization.id;
  const existing = await db.integration.findFirst({
    where: { id, businessId },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Integration not found.");
  await db.integration.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "integration.deleted",
    entity: "integration",
    entityId: existing.id,
    meta: { name: existing.name },
  });
  revalidatePath("/integrations");
  return { ok: true };
}
