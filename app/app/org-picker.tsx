"use client";

import { useState } from "react";
import { setActiveOrg } from "@/lib/actions/org";

export type OrgChoice = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export function OrgPicker({ orgs }: { orgs: OrgChoice[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function pick(id: string) {
    setError(null);
    setPending(id);
    try {
      // Server action verifies membership, sets the active org, audits,
      // then redirects to /dashboard.
      await setActiveOrg(id);
    } catch (err) {
      // NEXT_REDIRECT surfaces as an error to the caller only when the
      // redirect fails; surface anything else honestly.
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return;
      }
      setError(err instanceof Error ? err.message : "Could not switch workspace.");
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {orgs.map((org) => (
        <button
          key={org.id}
          onClick={() => pick(org.id)}
          disabled={pending !== null}
          className="flex w-full items-center justify-between rounded-md border border-hud-line bg-hud-panel px-4 py-3 text-left transition hover:border-hud-cyan disabled:opacity-50"
        >
          <span>
            <span className="block font-medium text-hud-ink">{org.name}</span>
            <span className="block text-sm text-hud-muted">
              {org.slug} · {org.role}
            </span>
          </span>
          <span className="text-sm text-hud-cyan">
            {pending === org.id ? "Entering…" : "Enter →"}
          </span>
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-hud-red">
          {error}
        </p>
      )}
    </div>
  );
}
