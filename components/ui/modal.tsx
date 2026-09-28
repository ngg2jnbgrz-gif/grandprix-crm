"use client";

import { useEffect, type ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
};

/**
 * Simple HUD dialog. Closes on Escape or backdrop click, locks body scroll
 * while open. Rendered inline (no portal) — keep it near the root of the
 * client tree that owns its state.
 */
export function Modal({ open, onClose, title, children, wide = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`hud-clip relative max-h-[88vh] w-full ${wide ? "max-w-2xl" : "max-w-lg"} flex flex-col border border-hud-line bg-hud-panel shadow-hud-panel`}
      >
        <div className="flex items-center justify-between border-b border-hud-line px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--hud-accent)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="px-1 text-lg leading-none text-hud-muted transition hover:text-hud-ink"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
