"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms";
import { publishSocialPost, deleteSocialPost } from "@/lib/actions/crm-growth";

type Props = { id: string; status: string };

/** Inline row actions: publish-now (marks the CRM record published) + delete. */
export function SocialActions({ id, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    try {
      await publishSocialPost(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteSocialPost(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status !== "published" ? (
        <Button size="sm" variant="outline" onClick={publish} disabled={busy}>
          Publish now
        </Button>
      ) : null}
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>
        Delete
      </Button>
    </div>
  );
}
