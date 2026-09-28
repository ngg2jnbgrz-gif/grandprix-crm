"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms";
import { deleteContact } from "@/lib/actions/crm-core";

type Props = {
  id: string;
  name: string;
  /** Where to go after a successful delete (used from the detail page). */
  redirectTo?: string;
};

/** Delete button with a native confirm step. */
export function DeleteContactButton({ id, name, redirectTo }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Delete contact "${name}"? Linked pipeline records stay, unassigned.`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteContact(id);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
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
