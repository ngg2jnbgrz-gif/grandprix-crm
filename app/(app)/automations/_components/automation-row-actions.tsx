"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms";
import { toggleAutomation, deleteAutomation } from "@/lib/actions/crm-growth";

type Props = { id: string; name: string; enabled: boolean };

/** Enabled toggle switch + delete for an automation rule row. */
export function AutomationRowActions({ id, name, enabled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function flip() {
    setBusy(true);
    try {
      await toggleAutomation(id, !enabled);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the rule "${name}"? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await deleteAutomation(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? "Disable rule" : "Enable rule"}
        disabled={busy}
        onClick={flip}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition disabled:opacity-50 ${
          enabled
            ? "border-[var(--hud-accent)] bg-[var(--hud-accent)]/30"
            : "border-hud-line bg-hud-panel2"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-3.5 w-3.5 transform rounded-full transition ${
            enabled
              ? "translate-x-4 bg-[var(--hud-accent)]"
              : "translate-x-0.5 bg-hud-muted"
          }`}
        />
      </button>
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        Delete
      </Button>
    </div>
  );
}
