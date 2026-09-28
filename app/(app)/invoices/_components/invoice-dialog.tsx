"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Textarea, Select } from "@/components/ui/forms";
import {
  saveInvoice,
  type InvoiceRow,
  type ContactOption,
  
} from "@/lib/actions/crm-growth";
import {
  INVOICE_STATUSES
} from "@/lib/crm-growth-lists";

type Props = {
  invoice?: InvoiceRow | null;
  contacts: ContactOption[];
  suggestedNumber: string;
};

/**
 * Create/edit dialog for invoices. Renders its own trigger: "+ New
 * invoice" when creating, a small Edit button when editing.
 */
export function InvoiceDialog({ invoice = null, contacts, suggestedNumber }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [contactId, setContactId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setNumber(invoice?.number ?? suggestedNumber);
    setContactId(invoice?.contactId ?? "");
    setAmount(invoice ? String(invoice.amount) : "");
    setDueDate(invoice?.dueDate ? invoice.dueDate.slice(0, 10) : "");
    setStatus(invoice?.status ?? "draft");
    setNotes(invoice?.notes ?? "");
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveInvoice({
        id: invoice?.id,
        number,
        contactId: contactId || null,
        amount,
        dueDate: dueDate || null,
        status,
        notes,
      });
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
      {invoice ? (
        <Button size="sm" variant="ghost" onClick={openDialog}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={openDialog}>
          + New invoice
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={invoice ? "Edit invoice" : "New invoice"}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Invoice number" htmlFor="i-number" required>
              <Input
                id="i-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder={suggestedNumber}
                required
                autoComplete="off"
                className="font-mono"
              />
            </Field>
            <Field label="Contact" htmlFor="i-contact">
              <Select
                id="i-contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount (USD)" htmlFor="i-amount" required>
              <Input
                id="i-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="font-mono"
              />
            </Field>
            <Field label="Due date" htmlFor="i-due">
              <Input
                id="i-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field label="Status" htmlFor="i-status" required>
              <Select
                id="i-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <div />
          </div>
          <Field label="Notes" htmlFor="i-notes">
            <Textarea
              id="i-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, line items, …"
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
              {saving ? "Saving…" : invoice ? "Save changes" : "Create invoice"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
