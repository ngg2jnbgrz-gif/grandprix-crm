"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Textarea } from "@/components/ui/forms";
import { saveAutomation, type AutomationRow } from "@/lib/actions/crm-growth";

type Props = { automation?: AutomationRow | null };

/**
 * Create/edit dialog for automation rules. Renders its own trigger: "+ New
 * rule" when creating, a small Edit button when editing.
 */
export function AutomationDialog({ automation = null }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setName(automation?.name ?? "");
    setTrigger(automation?.trigger ?? "");
    setAction(automation?.action ?? "");
    setEnabled(automation?.enabled ?? true);
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveAutomation({
        id: automation?.id,
        name,
        trigger,
        action,
        enabled,
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
      {automation ? (
        <Button size="sm" variant="ghost" onClick={openDialog}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={openDialog}>
          + New rule
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={automation ? "Edit automation rule" : "New automation rule"}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name" htmlFor="a-name" required>
            <Input
              id="a-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Thank-you follow-up on won jobs"
              required
              autoComplete="off"
            />
          </Field>
          <Field
            label="Trigger"
            htmlFor="a-trigger"
            hint='The event this rule fires on, e.g. "opportunity.stage → won".'
            required
          >
            <Input
              id="a-trigger"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="opportunity.stage → won"
              required
              autoComplete="off"
              className="font-mono"
            />
          </Field>
          <Field
            label="Action"
            htmlFor="a-action"
            hint='What should happen, e.g. "create task: send thank-you".'
            required
          >
            <Textarea
              id="a-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="create task: send thank-you"
              rows={3}
              required
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-hud-ink">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--hud-accent)]"
            />
            Enabled
          </label>

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
              {saving ? "Saving…" : automation ? "Save changes" : "Create rule"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
