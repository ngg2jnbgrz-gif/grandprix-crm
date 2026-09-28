"use client";

import { useEffect, useRef, useState } from "react";
import { setActiveOrg } from "@/lib/actions/org";
import type { ShellBusinessOption } from "./app-shell";

export type OrgSwitcherProps = {
  businesses: ShellBusinessOption[];
  activeId: string;
};

/**
 * Platform-owner business switcher. Lists every business (via the
 * platform-owner listBusinesses action, passed in as props) and switches
 * with the shared setActiveOrg() server action. Rendered only for platform
 * owners — hidden from client sessions entirely.
 */
export function OrgSwitcher({ businesses, activeId }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open ]);

  const active = businesses.find((b) => b.id === activeId);

  async function pick(id: string) {
    if (id === activeId || pending) {
      setOpen(false);
      return;
    }
    setPending(true);
    setError(null);
    try {
      // Ends in a redirect to /dashboard; on success this never resolves.
      await setActiveOrg(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Workspace switch failed.");
      setPending(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        className="flex max-w-44 items-center gap-2 rounded-sm border border-hud-line bg-hud-panel px-3 py-1.5 text-sm text-hud-ink transition hover:border-[var(--hud-accent)]/60 disabled:opacity-60 sm:max-w-56"
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            backgroundColor:
              active?.status === "active" ? "#3ef2a5" : "#ffb224",
          }}
        />
        <span className="truncate">
          {pending ? "Switching…" : (active?.name ?? "Workspace")}
        </span>
        <span aria-hidden="true" className="text-[10px] text-hud-muted">
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Switch business workspace"
          className="absolute right-0 z-50 mt-2 max-h-80 w-72 overflow-y-auto border border-hud-line bg-hud-panel shadow-hud-panel"
        >
          <p className="border-b border-hud-line px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-hud-muted">
            Switch business
          </p>
          {businesses.map((b) => (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={b.id === activeId}
              onClick={() => pick(b.id)}
              disabled={pending}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/[0.04] disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block truncate text-hud-ink">{b.name}</span>
                <span className="block truncate font-mono text-[11px] text-hud-muted">
                  {b.slug} · {b.status}
                </span>
              </span>
              {b.id === activeId ? (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--hud-accent)] shadow-[0_0_6px_var(--hud-accent)]"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-xs text-hud-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
