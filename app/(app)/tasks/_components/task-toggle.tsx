"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleTaskDone } from "@/lib/actions/crm-core";

type Props = { id: string; done: boolean; title: string };

/** Done checkbox — flips the task immediately via server action. */
export function TaskToggle({ id, done, title }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onChange(next: boolean) {
    setPending(true);
    try {
      await toggleTaskDone(id, next);
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={done}
      disabled={pending}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={`Mark "${title}" as ${done ? "not done" : "done"}`}
      className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--hud-accent)] disabled:opacity-50"
    />
  );
}
