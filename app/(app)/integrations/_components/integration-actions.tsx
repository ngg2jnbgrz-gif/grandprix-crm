"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui/forms";
import {
  setIntegrationStatus,
  deleteIntegration,
  
} from "@/lib/actions/crm-growth";
import {
  INTEGRATION_STATUSES
} from "@/lib/crm-growth-lists";

type Props = { id: string; name: string; status: string };

/** Inline row actions: connected/disabled toggle + delete. */
export function IntegrationActions({ id, name, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    if (next === status || busy) return;
    setBusy(true);
    try {
      await setIntegrationStatus(id, next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the integration "${name}"? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await deleteIntegration(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        aria-label="Change status"
        value={status}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="!w-auto !py-1 text-xs"
      >
        {INTEGRATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        Delete
      </Button>
    </div>
  );
}
