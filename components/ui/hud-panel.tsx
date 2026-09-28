import type { ReactNode } from "react";

export type HudPanelProps = {
  /** Micro-label shown in the title bar (uppercase, letter-spaced). */
  title: string;
  subtitle?: string;
  /** Right-aligned header content (buttons, badges, links). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

/**
 * Angular HUD panel: clipped corners, thin line border, micro-label title
 * bar. The title accent comes from the tenant theme var (--hud-accent), so
 * per-client branding applies at runtime.
 */
export function HudPanel({
  title,
  subtitle,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: HudPanelProps) {
  return (
    <section
      className={`hud-clip border border-hud-line bg-hud-panel shadow-hud-panel ${className}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-hud-line px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--hud-accent)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-hud-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
