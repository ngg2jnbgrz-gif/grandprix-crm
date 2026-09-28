/**
 * Shared option lists for the STAGE 4b growth/system modules.
 *
 * Kept OUT of lib/actions/crm-growth.ts on purpose: a "use server" module
 * may only export async functions, so these constants live here and are
 * imported by both the server actions (for validation) and the client
 * components (for selects/badges).
 */

export const CAMPAIGN_CHANNELS = ["email", "sms"] as const;
export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "done"] as const;

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
] as const;

export const REVIEW_STATUSES = [
  "new",
  "requested",
  "published",
  "archived",
] as const;

export const SOCIAL_CHANNELS = [
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "tiktok",
  "other",
] as const;
export const SOCIAL_STATUSES = ["draft", "scheduled", "published"] as const;

export const WEBASSET_KINDS = ["site", "funnel", "form"] as const;
export const WEBASSET_STATUSES = ["draft", "live", "archived"] as const;

export const INTEGRATION_KINDS = [
  "mcp",
  "email",
  "calendar",
  "payment",
  "other",
] as const;
export const INTEGRATION_STATUSES = ["connected", "disabled"] as const;
