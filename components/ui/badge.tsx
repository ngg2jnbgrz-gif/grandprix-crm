import type { ReactNode } from "react";

export type BadgeTone =
  | "accent"
  | "green"
  | "amber"
  | "red"
  | "violet"
  | "muted";

const toneClass: Record<BadgeTone, string> = {
  // "accent" resolves the tenant theme var at runtime (per-client branding).
  accent:
    "border-[color-mix(in_srgb,var(--hud-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--hud-accent)_12%,transparent)] text-[var(--hud-accent)]",
  green: "border-hud-green/40 bg-hud-green/10 text-hud-green",
  amber: "border-hud-amber/40 bg-hud-amber/10 text-hud-amber",
  red: "border-hud-red/40 bg-hud-red/10 text-hud-red",
  violet: "border-hud-violet/40 bg-hud-violet/10 text-hud-violet",
  muted: "border-hud-line bg-hud-panel2 text-hud-muted",
};

export type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone = "muted", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
