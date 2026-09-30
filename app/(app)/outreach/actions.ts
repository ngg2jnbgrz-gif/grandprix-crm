"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/tenant";
import { db } from "@/lib/db";

export type OutreachOutcome =
  | "connected"
  | "voicemail"
  | "no-answer"
  | "not-interested";

const OUTCOME_LABEL: Record<OutreachOutcome, string> = {
  connected: "Connected",
  voicemail: "Left voicemail",
  "no-answer": "No answer",
  "not-interested": "Not interested",
};

export type LogOutcomeResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Log a call outcome from the Outreach Deck.
 *
 * - Appends a timestamped line to the contact's notes (the outreach log).
 * - Moves the partner opportunity forward: any attempt marks it "contacted";
 *   a "not interested" closes it as "lost" and cools the contact.
 * - Voicemail / no-answer automatically schedules a follow-up task in 2 days
 *   so no lead ever goes cold.
 * - Creates the partner opportunity if one doesn't exist yet.
 */
export async function logOutreachOutcome(input: {
  contactId: string;
  outcome: OutreachOutcome;
  note?: string;
}): Promise<LogOutcomeResult> {
  const { organization } = await requireOrg();
  const businessId = organization.id;

  const contact = await db.contact.findFirst({
    where: { id: input.contactId, businessId },
  });
  if (!contact) return { ok: false, error: "Contact not found." };

  let opportunity = await db.opportunity.findFirst({
    where: {
      businessId,
      contactId: contact.id,
      stage: { notIn: ["won", "lost"] },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!opportunity) {
    opportunity = await db.opportunity.create({
      data: {
        businessId,
        contactId: contact.id,
        title: `Partner outreach — ${contact.company}`,
        stage: "new",
        probability: 10,
        notes: "Priority partner from the TOP 25 hot list.",
      },
    });
  }

  const label = OUTCOME_LABEL[input.outcome];
  const stamp = new Date().toISOString().slice(0, 10);
  const extra = input.note?.trim() ? ` — ${input.note.trim()}` : "";
  const logLine = `[${stamp}] ${label}${extra}`;
  const notes = contact.notes ? `${contact.notes}\n${logLine}` : logLine;

  const stage =
    input.outcome === "not-interested"
      ? "lost"
      : opportunity.stage === "new"
        ? "contacted"
        : opportunity.stage;

  const needsFollowUp =
    input.outcome === "voicemail" || input.outcome === "no-answer";

  await db.$transaction([
    db.contact.update({
      where: { id: contact.id },
      data: {
        notes,
        temperature:
          input.outcome === "not-interested" ? "cold" : contact.temperature,
      },
    }),
    db.opportunity.update({
      where: { id: opportunity.id },
      data: {
        stage,
        probability:
          input.outcome === "connected" ? 25 : opportunity.probability,
      },
    }),
    ...(needsFollowUp
      ? [
          db.task.create({
            data: {
              businessId,
              contactId: contact.id,
              title: `Follow up: ${contact.company}`,
              dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              notes: `Outreach follow-up after ${label.toLowerCase()} on ${stamp}.`,
            },
          }),
        ]
      : []),
  ]);

  revalidatePath("/outreach");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/tasks");
  revalidatePath(`/contacts/${contact.id}`);

  return { ok: true };
}
