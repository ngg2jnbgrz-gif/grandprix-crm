"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui/forms";
import {
  setCampaignStatus,
  deleteCampaign,
  
} from "@/lib/actions/crm-growth";
import {
  CAMPAIGN_STATUSES
} from "@/lib/crm-growth-lists";

type Props = { id: string; status: string };

/** Inline row actions: quick status change + delete. */
export function CampaignActions({ id, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function changeStatus(next: string) {
    if (next === status || busy) return;
    setBusy(true);
    try {
      await setCampaignStatus(id, next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this campaign? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteCampaign(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Change status"
        value={status}
        disabled={busy}
        onChange={(e) => changeStatus(e.target.value)}
        className="!w-auto !py-1 text-xs"
      >
        {CAMPAIGN_STATUSES.map((s) => (
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
