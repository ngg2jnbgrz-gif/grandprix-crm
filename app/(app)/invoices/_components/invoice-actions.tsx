"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms";
import { setInvoiceStatus, deleteInvoice } from "@/lib/actions/crm-growth";

type Props = { id: string; number: string; status: string };

/** Inline row actions: mark paid / mark overdue / delete. */
export function InvoiceActions({ id, number, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setBusy(true);
    try {
      await setInvoiceStatus(id, next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(`Delete invoice ${number}? This cannot be undone.`)
    )
      return;
    setBusy(true);
    try {
      await deleteInvoice(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status !== "paid" ? (
        <Button size="sm" variant="outline" onClick={() => change("paid")} disabled={busy}>
          Mark paid
        </Button>
      ) : null}
      {status !== "overdue" && status !== "paid" && status !== "void" ? (
        <Button size="sm" variant="outline" onClick={() => change("overdue")} disabled={busy}>
          Mark overdue
        </Button>
      ) : null}
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        Delete
      </Button>
    </div>
  );
}
