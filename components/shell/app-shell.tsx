"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/format";
import { OrgSwitcher } from "./org-switcher";
import { SignOutButton } from "./sign-out-button";

export type ShellNavItem = { href: string; label: string };
export type ShellNavSection = { label: string; items: ShellNavItem[] };
export type ShellBusinessOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type AppShellProps = {
  user: { name: string; email: string };
  role: string;
  org: { id: string; name: string; slug: string; logoUrl: string };
  platformOwner: boolean;
  sections: ShellNavSection[];
  businesses: ShellBusinessOption[];
  children: ReactNode;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavSections({
  sections,
  pathname,
  onNavigate,
}: {
  sections: ShellNavSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div>
      {sections.map((section) => (
        <div key={section.label} className="mb-5">
          <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-hud-muted/70">
            {section.label}
          </p>
          <nav aria-label={section.label} className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group relative block px-4 py-2 text-sm transition ${
                    active
                      ? "bg-[color-mix(in_srgb,var(--hud-accent)_10%,transparent)] font-medium text-[var(--hud-accent)]"
                      : "text-hud-muted hover:bg-white/[0.04] hover:text-hud-ink"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-0 h-full w-0.5 transition ${
                      active
                        ? "bg-[var(--hud-accent)] shadow-[0_0_8px_var(--hud-accent)]"
                        : "bg-transparent group-hover:bg-hud-line"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}

function OrgMark({ name, logoUrl }: { name: string; logoUrl: string }) {
  if (logoUrl) {
    return (
      <>
        {/* Plain <img> is intentional: logoUrl is an arbitrary
            client-provided URL; next/image would need per-tenant
            remotePatterns. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          className="h-9 w-9 shrink-0 object-contain"
          loading="lazy"
        />
      </>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--hud-accent)]/50 bg-[color-mix(in_srgb,var(--hud-accent)_12%,transparent)] font-mono text-sm font-semibold text-[var(--hud-accent)]"
    >
      {initials(name)}
    </span>
  );
}

/**
 * Authenticated HUD shell: fixed top bar + grouped sidebar (desktop) /
 * slide-over drawer (mobile) + content area. Theme vars (--hud-accent,
 * --hud-primary) are set on the layout wrapper; this component only
 * references them, never hard-codes tenant branding.
 */
export function AppShell({
  user,
  role,
  org,
  platformOwner,
  sections,
  businesses,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-screen">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-hud-line bg-[var(--hud-primary)]">
        <div className="flex h-full items-center gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="rounded-sm p-2 text-hud-muted transition hover:bg-white/5 hover:text-hud-ink lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <OrgMark name={org.name} logoUrl={org.logoUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-hud-ink">
              {org.name}
            </p>
            <p className="truncate font-mono text-[11px] text-hud-muted">
              {org.slug}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {platformOwner && businesses.length > 0 ? (
              <OrgSwitcher businesses={businesses} activeId={org.id} />
            ) : null}

            <div className="hidden text-right md:block">
              <p className="max-w-44 truncate text-sm font-medium text-hud-ink">
                {user.name}
              </p>
              <p className="max-w-44 truncate text-[11px] text-hud-muted">
                {user.email}
              </p>
            </div>
            <Badge tone={platformOwner ? "accent" : "muted"}>
              {platformOwner ? "platform owner" : role}
            </Badge>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* ── Sidebar (desktop) ───────────────────────────────── */}
      <aside className="fixed bottom-0 left-0 top-16 z-20 hidden w-64 overflow-y-auto border-r border-hud-line bg-[var(--hud-primary)] px-0 py-6 lg:block">
        <NavSections sections={sections} pathname={pathname} />
      </aside>

      {/* ── Slide-over (mobile) ─────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={drawerOpen ? undefined : true}
      >
        <div
          onClick={closeDrawer}
          className={`absolute inset-0 bg-black/70 transition-opacity ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-hud-line bg-[var(--hud-primary)] py-6 shadow-hud-panel transition-transform duration-200 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center gap-2 px-4">
            <OrgMark name={org.name} logoUrl={org.logoUrl} />
            <p className="truncate text-sm font-semibold text-hud-ink">{org.name}</p>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close navigation"
              className="ml-auto p-1 text-xl leading-none text-hud-muted hover:text-hud-ink"
            >
              &times;
            </button>
          </div>
          <NavSections sections={sections} pathname={pathname} onNavigate={closeDrawer} />
        </aside>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="pt-16 lg:pl-64">
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
