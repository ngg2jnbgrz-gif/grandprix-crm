"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms";
import { deleteOpportunity } from "@/lib/actions/crm-core";

type Props = { id: string; title: string };

/** Delete button with a native confirm step. */
export function DeleteOpportunityButton({ id, title }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Delete opportunity "${title}"? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteOpportunity(id);
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Delete failed.");
      setDeleting(false);
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
      {deleting ? "Deleting…" : "Delete"}
    </Button>
  );
}
