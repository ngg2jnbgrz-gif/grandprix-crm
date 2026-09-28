"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/forms";
import {
  createOpportunity,
  updateOpportunity,
  type OpportunityInput,
} from "@/lib/actions/crm-core";

export type OpportunityFormData = {
  id: string;
  title: string;
  contactId: string | null;
  /** Decimal value serialized to a plain number. */
  value: number | null;
  stage: string;
  probability: number;
  /** ISO date "yyyy-MM-dd" for the date input. */
  expectedClose: string | null;
  notes: string;
};

export type ContactOption = { id: string; name: string };

type Props = {
  /** When set, the dialog edits this opportunity; otherwise it creates one. */
  opportunity?: OpportunityFormData | null;
  /** Tenant-scoped contacts for the link dropdown. */
  contacts: ContactOption[];
  /** Card variant renders a compact trigger; default is "+ New opportunity". */
  trigger?: "button" | "link";
};

const STAGES = ["new", "contacted", "quoted", "won", "lost"] as const;

/** Create/edit opportunity dialog. Renders its own trigger. */
export function OpportunityDialog({ opportunity = null, contacts, trigger = "button" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState("new");
  const [probability, setProbability] = useState(10);
  const [expectedClose, setExpectedClose] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(opportunity?.title ?? "");
      setContactId(opportunity?.contactId ?? "");
      setValue(opportunity?.value === null || opportunity?.value === undefined ? "" : String(opportunity.value));
      setStage(opportunity?.stage ?? "new");
      setProbability(opportunity?.probability ?? 10);
      setExpectedClose(opportunity?.expectedClose ?? "");
      setNotes(opportunity?.notes ?? "");
      setError(null);
    }
  }, [open, opportunity]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const input: OpportunityInput = {
      title,
      contactId: contactId || null,
      value: value === "" ? null : Number(value),
      stage,
      probability,
      expectedClose: expectedClose || null,
      notes,
    };
    try {
      if (opportunity) {
        await updateOpportunity(opportunity.id, input);
      } else {
        await createOpportunity(input);
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
      {opportunity ? (
        trigger === "link" ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-left font-medium text-hud-ink hover:text-[var(--hud-accent)]"
          >
            {opportunity.title}
          </button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Edit
          </Button>
        )
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          + New opportunity
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={opportunity ? "Edit opportunity" : "New opportunity"}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Title" htmlFor="o-title" required>
                <Input
                  id="o-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kitchen remodel — Rivera residence"
                  required
                  autoComplete="off"
                />
              </Field>
            </div>
            <Field label="Contact" htmlFor="o-contact">
              <Select
                id="o-contact"
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
            <Field label="Value (USD)" htmlFor="o-value">
              <Input
                id="o-value"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="8500"
                autoComplete="off"
              />
            </Field>
            <Field label="Stage" htmlFor="o-stage">
              <Select id="o-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Expected close" htmlFor="o-close">
              <Input
                id="o-close"
                type="date"
                value={expectedClose}
                onChange={(e) => setExpectedClose(e.target.value)}
              />
            </Field>
          </div>
          <Field
            label={`Probability — ${probability}%`}
            htmlFor="o-prob"
            hint="Likelihood this deal closes."
          >
            <input
              id="o-prob"
              type="range"
              min={0}
              max={100}
              step={5}
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="w-full accent-[var(--hud-accent)]"
            />
          </Field>
          <Field label="Notes" htmlFor="o-notes">
            <Textarea
              id="o-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope, materials, follow-ups…"
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
              {saving ? "Saving…" : opportunity ? "Save changes" : "Create opportunity"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
