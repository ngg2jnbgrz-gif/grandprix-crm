import type { Prisma } from "@prisma/client";
import { db } from "./db";

export type AuditParams = {
  /** Tenant the event belongs to. Omit ONLY for tenant-less auth events
   *  (e.g. a sign-in attempt that never resolved an org) — in that case no
   *  row is written, because AuditLog is tenant-scoped by design. */
  organizationId?: string | null;
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Append an AuditLog row. Best-effort: audit must never break the action it
 * records, so failures are swallowed (and would surface in server logs).
 */
export async function logAudit({
  organizationId,
  actorId,
  action,
  entity = "",
  entityId = null,
  meta,
}: AuditParams): Promise<void> {
  if (!organizationId) return;
  try {
    await db.auditLog.create({
      data: {
        businessId: organizationId,
        actorId: actorId ?? null,
        action,
        entity,
        entityId,
        meta: meta as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // audit is best-effort; never fail the caller's action
  }
}
