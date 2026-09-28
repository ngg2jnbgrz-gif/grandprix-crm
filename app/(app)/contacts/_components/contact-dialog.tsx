"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/forms";
import {
  createContact,
  updateContact,
  type ContactInput,
} from "@/lib/actions/crm-core";

/** Plain-serializable contact shape passed from server components. */
export type ContactFormData = {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  town: string;
  category: string;
  temperature: string;
  priority: boolean;
  source: string;
  notes: string;
};

type Props = {
  /** When set, the dialog edits this contact; otherwise it creates one. */
  contact?: ContactFormData | null;
};

const empty: ContactInput = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  town: "",
  category: "",
  temperature: "warm",
  priority: false,
  source: "",
  notes: "",
};

/** Create/edit contact dialog. Renders its own trigger button. */
export function ContactDialog({ contact = null }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ContactInput>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        contact
          ? {
              firstName: contact.firstName,
              lastName: contact.lastName,
              company: contact.company,
              email: contact.email,
              phone: contact.phone,
              website: contact.website,
              town: contact.town,
              category: contact.category,
              temperature: contact.temperature,
              priority: contact.priority,
              source: contact.source,
              notes: contact.notes,
            }
          : empty,
      );
      setError(null);
    }
  }, [open, contact]);

  const set = (key: keyof ContactInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const value =
      e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (contact) {
        await updateContact(contact.id, form);
      } else {
        await createContact(form);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {contact ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          + New contact
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={contact ? "Edit contact" : "New contact"}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="c-first">
              <Input
                id="c-first"
                value={form.firstName ?? ""}
                onChange={set("firstName")}
                placeholder="Alex"
                autoComplete="off"
              />
            </Field>
            <Field label="Last name" htmlFor="c-last">
              <Input
                id="c-last"
                value={form.lastName ?? ""}
                onChange={set("lastName")}
                placeholder="Rivera"
                autoComplete="off"
              />
            </Field>
            <Field label="Company" htmlFor="c-company">
              <Input
                id="c-company"
                value={form.company ?? ""}
                onChange={set("company")}
                placeholder="Rivera Construction"
                autoComplete="off"
              />
            </Field>
            <Field label="Category" htmlFor="c-category" hint="e.g. Contractor, Realtor, Property manager">
              <Input
                id="c-category"
                value={form.category ?? ""}
                onChange={set("category")}
                placeholder="Contractor"
                autoComplete="off"
              />
            </Field>
            <Field label="Email" htmlFor="c-email">
              <Input
                id="c-email"
                type="email"
                value={form.email ?? ""}
                onChange={set("email")}
                placeholder="alex@example.com"
                autoComplete="off"
              />
            </Field>
            <Field label="Phone" htmlFor="c-phone">
              <Input
                id="c-phone"
                type="tel"
                value={form.phone ?? ""}
                onChange={set("phone")}
                placeholder="(631) 555-0100"
                autoComplete="off"
              />
            </Field>
            <Field label="Website" htmlFor="c-website">
              <Input
                id="c-website"
                value={form.website ?? ""}
                onChange={set("website")}
                placeholder="riveraconstruction.com"
                autoComplete="off"
              />
            </Field>
            <Field label="Town" htmlFor="c-town">
              <Input
                id="c-town"
                value={form.town ?? ""}
                onChange={set("town")}
                placeholder="Patchogue"
                autoComplete="off"
              />
            </Field>
            <Field label="Temperature" htmlFor="c-temp">
              <Select id="c-temp" value={form.temperature ?? "warm"} onChange={set("temperature")}>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </Select>
            </Field>
            <Field label="Source" htmlFor="c-source" hint="How this contact was found">
              <Input
                id="c-source"
                value={form.source ?? ""}
                onChange={set("source")}
                placeholder="Referral, website, cold call…"
                autoComplete="off"
              />
            </Field>
          </div>
          <Field label="Priority" htmlFor="c-priority">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-hud-ink">
              <input
                id="c-priority"
                type="checkbox"
                checked={form.priority === true}
                onChange={set("priority")}
                className="h-4 w-4 accent-[var(--hud-accent)]"
              />
              Star this contact as priority
            </label>
          </Field>
          <Field label="Notes" htmlFor="c-notes">
            <Textarea
              id="c-notes"
              value={form.notes ?? ""}
              onChange={set("notes")}
              placeholder="Context, preferences, last conversation…"
              rows={3}
            />
          </Field>

          {error ? (
            <p className="rounded-sm border border-hud-red/40 bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : contact ? "Save changes" : "Create contact"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
