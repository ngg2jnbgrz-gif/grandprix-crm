"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/forms";
import { createTask, updateTask, type TaskInput } from "@/lib/actions/crm-core";
import type { ContactOption } from "@/app/(app)/pipeline/_components/opportunity-dialog";

export type TaskFormData = {
  id: string;
  title: string;
  /** UTC ISO string for the client to render in local time. */
  dueDateISO: string | null;
  done: boolean;
  contactId: string | null;
  notes: string;
};

/** Convert a UTC ISO instant to a datetime-local string in browser time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  /** When set, the dialog edits this task; otherwise it creates one. */
  task?: TaskFormData | null;
  contacts: ContactOption[];
};

/** Create/edit task dialog. Renders its own trigger. */
export function TaskDialog({ task = null, contacts }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDueDate(toLocalInput(task?.dueDateISO ?? null));
      setContactId(task?.contactId ?? "");
      setNotes(task?.notes ?? "");
      setError(null);
    }
  }, [open, task]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const input: TaskInput = {
      title,
      // datetime-local has no zone: interpret in the browser's zone, store UTC.
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      contactId: contactId || null,
      notes,
    };
    try {
      if (task) {
        await updateTask(task.id, input);
      } else {
        await createTask(input);
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
      {task ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          + New task
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={task ? "Edit task" : "New task"}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Title" htmlFor="t-title" required>
            <Input
              id="t-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Call back about the lobby tile quote"
              required
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due date" htmlFor="t-due">
              <Input
                id="t-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field label="Contact" htmlFor="t-contact">
              <Select
                id="t-contact"
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
          </div>
          <Field label="Notes" htmlFor="t-notes">
            <Textarea
              id="t-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Details, prep, talking points…"
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
              {saving ? "Saving…" : task ? "Save changes" : "Create task"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
