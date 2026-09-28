"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/forms";
import {
  createAppointment,
  updateAppointment,
  type AppointmentInput,
} from "@/lib/actions/crm-core";
import type { ContactOption } from "@/app/(app)/pipeline/_components/opportunity-dialog";
import { toLocalInput } from "@/app/(app)/tasks/_components/task-dialog";

export type AppointmentFormData = {
  id: string;
  title: string;
  /** UTC ISO strings for the client to render in local time. */
  startsAtISO: string;
  endsAtISO: string | null;
  contactId: string | null;
  location: string;
  notes: string;
};

type Props = {
  /** When set, the dialog edits this appointment; otherwise it creates one. */
  appointment?: AppointmentFormData | null;
  contacts: ContactOption[];
};

/** Create/edit appointment dialog. Renders its own trigger. */
export function AppointmentDialog({ appointment = null, contacts }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [contactId, setContactId] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(appointment?.title ?? "");
      setStartsAt(toLocalInput(appointment?.startsAtISO ?? null));
      setEndsAt(toLocalInput(appointment?.endsAtISO ?? null));
      setContactId(appointment?.contactId ?? "");
      setLocation(appointment?.location ?? "");
      setNotes(appointment?.notes ?? "");
      setError(null);
    }
  }, [open, appointment]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    // datetime-local has no zone: interpret in the browser's zone, store UTC.
    const input: AppointmentInput = {
      title,
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      contactId: contactId || null,
      location,
      notes,
    };
    try {
      if (appointment) {
        await updateAppointment(appointment.id, input);
      } else {
        await createAppointment(input);
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
      {appointment ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          + New appointment
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={appointment ? "Edit appointment" : "New appointment"}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Title" htmlFor="a-title" required>
            <Input
              id="a-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Measure appointment — kitchen floor"
              required
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="a-starts" required>
              <Input
                id="a-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </Field>
            <Field label="Ends" htmlFor="a-ends">
              <Input
                id="a-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </Field>
            <Field label="Contact" htmlFor="a-contact">
              <Select
                id="a-contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">No contact linked</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location" htmlFor="a-location">
              <Input
                id="a-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="123 Main St, Patchogue"
                autoComplete="off"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="a-notes">
            <Textarea
              id="a-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agenda, materials to bring, parking notes…"
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
              {saving ? "Saving…" : appointment ? "Save changes" : "Create appointment"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
