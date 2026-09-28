"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms";
import { setReviewStatus, deleteReview } from "@/lib/actions/crm-growth";

type Props = { id: string; author: string; status: string };

/** Status workflow buttons: new → requested → published, or archived. */
export function ReviewActions({ id, author, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setBusy(true);
    try {
      await setReviewStatus(id, next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete the review from ${author}? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteReview(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status === "new" ? (
        <Button size="sm" variant="outline" onClick={() => change("requested")} disabled={busy}>
          Mark requested
        </Button>
      ) : null}
      {status === "new" || status === "requested" ? (
        <Button size="sm" variant="outline" onClick={() => change("published")} disabled={busy}>
          Publish
        </Button>
      ) : null}
      {status !== "archived" ? (
        <Button size="sm" variant="ghost" onClick={() => change("archived")} disabled={busy}>
          Archive
        </Button>
      ) : null}
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        Delete
      </Button>
    </div>
  );
}
