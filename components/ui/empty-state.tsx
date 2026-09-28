import type { ReactNode } from "react";

export type EmptyStateProps = {
  /** Optional icon element (inline SVG recommended). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action (button or link). */
  action?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      {icon ? <div className="mb-3 text-hud-muted">{icon}</div> : null}
      <p className="text-sm font-medium text-hud-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-hud-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
