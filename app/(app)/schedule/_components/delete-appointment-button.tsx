"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms";
import { deleteAppointment } from "@/lib/actions/crm-core";

type Props = { id: string; title: string };

/** Delete button with a native confirm step. */
export function DeleteAppointmentButton({ id, title }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Delete appointment "${title}"? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAppointment(id);
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
