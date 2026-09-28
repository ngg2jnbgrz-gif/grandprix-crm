"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moveOpportunityStage } from "@/lib/actions/crm-core";

const STAGES = ["new", "contacted", "quoted", "won", "lost"] as const;

type Props = { id: string; stage: string; title: string };

/** Per-card stage mover for the kanban board (no drag-and-drop). */
export function StageSelect({ id, stage, title }: Props) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);

  async function onChange(next: string) {
    if (next === stage || moving) return;
    setMoving(true);
    try {
      await moveOpportunityStage(id, next);
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Stage move failed.");
      setMoving(false);
    }
  }

  return (
    <select
      value={stage}
      disabled={moving}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Move "${title}" to stage`}
      className="w-full rounded-sm border border-hud-line bg-[#0a1620] px-2 py-1.5 text-xs uppercase tracking-[0.1em] text-hud-muted outline-none transition focus:border-[var(--hud-accent)] disabled:opacity-50"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {moving ? "Moving…" : s}
        </option>
      ))}
    </select>
  );
}
