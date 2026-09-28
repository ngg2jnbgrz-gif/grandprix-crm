import type { ReactNode } from "react";

export type StatCardTone = "accent" | "green" | "amber" | "red" | "violet";

const toneText: Record<StatCardTone, string> = {
  accent: "text-[var(--hud-accent)]",
  green: "text-hud-green",
  amber: "text-hud-amber",
  red: "text-hud-red",
  violet: "text-hud-violet",
};

export type StatCardProps = {
  /** Uppercase micro-label. */
  label: string;
  /** Big figure — pass a pre-formatted string/number (monospace, tabular). */
  value: ReactNode;
  /** Supporting line under the figure. */
  sub?: ReactNode;
  tone?: StatCardTone;
  className?: string;
};

export function StatCard({
  label,
  value,
  sub,
  tone = "accent",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`hud-clip-sm border border-hud-line bg-hud-panel p-4 ${className}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-hud-muted">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${toneText[tone]}`}
      >
        {value}
      </p>
      {sub ? <div className="mt-1 text-xs text-hud-muted">{sub}</div> : null}
    </div>
  );
}
