"use server";

// STAGE 4a — core CRM modules: contacts, opportunities (pipeline), tasks,
// appointments. Every action resolves the tenant via requireOrg() internally
// and scopes ALL Prisma queries by businessId (tenant-isolation gate).

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// ── Shared helpers ────────────────────────────────────────────────────

const TEMPERATURES = ["cold", "warm", "hot"] as const;
type Temperature = (typeof TEMPERATURES)[number];

function assertTemperature(t: string): asserts t is Temperature {
  if (!(TEMPERATURES as readonly string[]).includes(t)) {
    throw new Error(`Temperature must be one of: ${TEMPERATURES.join(" | ")}.`);
  }
}

const STAGES = ["new", "contacted", "quoted", "won", "lost"] as const;
type Stage = (typeof STAGES)[number];

function assertStage(s: string): asserts s is Stage {
  if (!(STAGES as readonly string[]).includes(s)) {
    throw new Error(`Stage must be one of: ${STAGES.join(" | ")}.`);
  }
}

function clampProbability(p: number): number {
  if (!Number.isFinite(p)) throw new Error("Probability must be a number.");
  return Math.min(100, Math.max(0, Math.round(p)));
}

/** Verify an optional contactId belongs to the caller's org (or is blank). */
async function assertContactOwned(
  businessId: string,
  contactId: string | null | undefined,
): Promise<string | null> {
  const id = (contactId ?? "").trim();
  if (!id) return null;
  const contact = await db.contact.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!contact) throw new Error("Selected contact does not exist.");
  return contact.id;
}

function parseDate(value: string | null | undefined): Date | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date.");
  return d;
}

// ── Contacts ──────────────────────────────────────────────────────────

export type ContactInput = {
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  town?: string;
  category?: string;
  temperature?: string;
  priority?: boolean;
  source?: string;
  notes?: string;
};

function contactData(input: ContactInput) {
  const temperature = (input.temperature ?? "warm").trim() || "warm";
  assertTemperature(temperature);
  return {
    firstName: (input.firstName ?? "").trim(),
    lastName: (input.lastName ?? "").trim(),
    company: (input.company ?? "").trim(),
    email: (input.email ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    website: (input.website ?? "").trim(),
    town: (input.town ?? "").trim(),
    category: (input.category ?? "").trim(),
    temperature,
    priority: input.priority === true,
    source: (input.source ?? "").trim(),
    notes: (input.notes ?? "").trim(),
  };
}

export async function createContact(input: ContactInput): Promise<{ id: string }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const data = contactData(input);
  const contact = await db.contact.create({ data: { ...data, businessId } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "contact.created",
    entity: "contact",
    entityId: contact.id,
  });
  revalidatePath("/contacts");
  return { id: contact.id };
}

export async function updateContact(
  id: string,
  input: ContactInput,
): Promise<{ id: string }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.contact.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!existing) throw new Error("Contact not found.");
  const data = contactData(input);
  await db.contact.update({ where: { id: existing.id }, data });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "contact.updated",
    entity: "contact",
    entityId: existing.id,
  });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${existing.id}`);
  return { id: existing.id };
}

export async function deleteContact(id: string): Promise<void> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.contact.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!existing) throw new Error("Contact not found.");
  // Related opportunities/tasks/appointments are SetNull by the schema, so
  // linked pipeline history survives the contact's removal.
  await db.contact.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "contact.deleted",
    entity: "contact",
    entityId: existing.id,
  });
  revalidatePath("/contacts");
}

// ── Opportunities (pipeline) ──────────────────────────────────────────

export type OpportunityInput = {
  title: string;
  contactId?: string | null;
  value?: number | null;
  stage?: string;
  probability?: number;
  expectedClose?: string | null;
  notes?: string;
};

function opportunityData(input: OpportunityInput) {
  const title = (input.title ?? "").trim();
  if (!title) throw new Error("Opportunity title is required.");
  const stage = (input.stage ?? "new").trim() || "new";
  assertStage(stage);
  const value =
    input.value === null || input.value === undefined ? null : Number(input.value);
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    throw new Error("Value must be a non-negative number.");
  }
  return {
    title,
    value,
    stage,
    probability: clampProbability(input.probability ?? 10),
    expectedClose: parseDate(input.expectedClose),
    notes: (input.notes ?? "").trim(),
  };
}

export async function createOpportunity(
  input: OpportunityInput,
): Promise<{ id: string }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const data = opportunityData(input);
  const contactId = await assertContactOwned(businessId, input.contactId);
  const opp = await db.opportunity.create({
    data: { ...data, contactId, businessId },
  });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "opportunity.created",
    entity: "opportunity",
    entityId: opp.id,
    meta: { title: opp.title, stage: opp.stage },
  });
  revalidatePath("/pipeline");
  return { id: opp.id };
}

export async function updateOpportunity(
  id: string,
  input: OpportunityInput,
): Promise<{ id: string }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.opportunity.findFirst({
    where: { id, businessId },
    select: { id: true, stage: true },
  });
  if (!existing) throw new Error("Opportunity not found.");
  const data = opportunityData(input);
  const contactId = await assertContactOwned(businessId, input.contactId);
  await db.opportunity.update({
    where: { id: existing.id },
    data: { ...data, contactId },
  });
  if (data.stage !== existing.stage) {
    await logAudit({
      organizationId: businessId,
      actorId: user.id,
      action: "opportunity.stage_changed",
      entity: "opportunity",
      entityId: existing.id,
      meta: { from: existing.stage, to: data.stage, via: "edit" },
    });
  }
  revalidatePath("/pipeline");
  return { id: existing.id };
}

/** Move an opportunity between kanban stages; stage changes are audited. */
export async function moveOpportunityStage(
  id: string,
  stage: string,
): Promise<void> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  assertStage(stage);
  const existing = await db.opportunity.findFirst({
    where: { id, businessId },
    select: { id: true, stage: true, title: true },
  });
  if (!existing) throw new Error("Opportunity not found.");
  if (existing.stage === stage) return;
  await db.opportunity.update({ where: { id: existing.id }, data: { stage } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "opportunity.stage_changed",
    entity: "opportunity",
    entityId: existing.id,
    meta: { from: existing.stage, to: stage, via: "kanban" },
  });
  revalidatePath("/pipeline");
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.opportunity.findFirst({
    where: { id, businessId },
    select: { id: true, title: true },
  });
  if (!existing) throw new Error("Opportunity not found.");
  await db.opportunity.delete({ where: { id: existing.id } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "opportunity.deleted",
    entity: "opportunity",
    entityId: existing.id,
    meta: { title: existing.title },
  });
  revalidatePath("/pipeline");
}

// ── Tasks ─────────────────────────────────────────────────────────────

export type TaskInput = {
  title: string;
  dueDate?: string | null;
  contactId?: string | null;
  notes?: string;
};

function taskData(input: TaskInput) {
  const title = (input.title ?? "").trim();
  if (!title) throw new Error("Task title is required.");
  return {
    title,
    dueDate: parseDate(input.dueDate),
    notes: (input.notes ?? "").trim(),
  };
}

export async function createTask(input: TaskInput): Promise<{ id: string }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const data = taskData(input);
  const contactId = await assertContactOwned(businessId, input.contactId);
  const task = await db.task.create({ data: { ...data, contactId, businessId } });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "task.created",
    entity: "task",
    entityId: task.id,
  });
  revalidatePath("/tasks");
  return { id: task.id };
}

export async function updateTask(
  id: string,
  input: TaskInput,
): Promise<{ id: string }> {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.task.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!existing) throw new Error("Task not found.");
  const data = taskData(input);
  const contactId = await assertContactOwned(businessId, input.contactId);
  await db.task.update({
    where: { id: existing.id },
    data: { ...data, contactId },
  });
  revalidatePath("/tasks");
  return { id: existing.id };
}

export async function toggleTaskDone(id: string, done: boolean): Promise<void> {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.task.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!existing) throw new Error("Task not found.");
  await db.task.update({ where: { id: existing.id }, data: { done } });
  revalidatePath("/tasks");
}

export async function deleteTask(id: string): Promise<void> {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.task.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!existing) throw new Error("Task not found.");
  await db.task.delete({ where: { id: existing.id } });
  revalidatePath("/tasks");
}

// ── Appointments (schedule) ───────────────────────────────────────────

export type AppointmentInput = {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  contactId?: string | null;
  location?: string;
  notes?: string;
};

function appointmentData(input: AppointmentInput) {
  const title = (input.title ?? "").trim();
  if (!title) throw new Error("Appointment title is required.");
  const startsAt = parseDate(input.startsAt);
  if (!startsAt) throw new Error("Start time is required.");
  const endsAt = parseDate(input.endsAt);
  if (endsAt && endsAt < startsAt) {
    throw new Error("End time cannot be before the start time.");
  }
  return {
    title,
    startsAt,
    endsAt,
    location: (input.location ?? "").trim(),
    notes: (input.notes ?? "").trim(),
  };
}

export async function createAppointment(
  input: AppointmentInput,
): Promise<{ id: string }> {
  const { user, organization } = await requireOrg();
  const businessId = organization.id;
  const data = appointmentData(input);
  const contactId = await assertContactOwned(businessId, input.contactId);
  const appt = await db.appointment.create({
    data: { ...data, contactId, businessId },
  });
  await logAudit({
    organizationId: businessId,
    actorId: user.id,
    action: "appointment.created",
    entity: "appointment",
    entityId: appt.id,
  });
  revalidatePath("/schedule");
  return { id: appt.id };
}

export async function updateAppointment(
  id: string,
  input: AppointmentInput,
): Promise<{ id: string }> {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.appointment.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!existing) throw new Error("Appointment not found.");
  const data = appointmentData(input);
  const contactId = await assertContactOwned(businessId, input.contactId);
  await db.appointment.update({
    where: { id: existing.id },
    data: { ...data, contactId },
  });
  revalidatePath("/schedule");
  return { id: existing.id };
}

export async function deleteAppointment(id: string): Promise<void> {
  const { organization } = await requireOrg();
  const businessId = organization.id;
  const existing = await db.appointment.findFirst({
    where: { id, businessId },
    select: { id: true },
  });
  if (!existing) throw new Error("Appointment not found.");
  await db.appointment.delete({ where: { id: existing.id } });
  revalidatePath("/schedule");
}
