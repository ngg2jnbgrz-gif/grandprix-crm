"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms";
import { deleteWebAsset } from "@/lib/actions/crm-growth";

type Props = { id: string; name: string };

/** Delete action for a web asset row. */
export function WebAssetActions({ id, name }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteWebAsset(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
      Delete
    </Button>
  );
}
