import type { CSSProperties } from "react";
import { requireOrg, isPlatformOwner } from "@/lib/tenant";
import { db } from "@/lib/db";
import { listBusinesses } from "@/lib/actions/provisioning";
import {
  AppShell,
  type ShellNavSection,
  type ShellBusinessOption,
} from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

const DEFAULT_ACCENT = "#35e7ff";
const DEFAULT_PRIMARY = "#07111a";

/**
 * Authenticated shell layout (URL-transparent route group — /dashboard,
 * /contacts, … keep working under middleware).
 *
 * Theming cascade: requireOrg() resolves the tenant, then the business theme
 * is injected as CSS custom properties (--hud-accent / --hud-primary) on the
 * wrapper div. Fallback chain: organization values → defaults. Components
 * reference var(--hud-accent) so per-client branding applies at runtime.
 * Never applied to (auth) routes — login stays neutral.
 */
export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organization, role } = await requireOrg();
  const platformOwner = await isPlatformOwner(user.id);

  // requireOrg() carries only the fields the tenant gate needs; the logo is
  // fetched here for the shell (tenant.ts is frozen — not extended).
  const orgRow = await db.organization.findUnique({
    where: { id: organization.id },
    select: { logoUrl: true },
  });

  const accent = organization.accent?.trim() || DEFAULT_ACCENT;
  const primary = organization.primaryColor?.trim() || DEFAULT_PRIMARY;

  const sections: ShellNavSection[] = [
    {
      label: "Overview",
      items: [{ href: "/dashboard", label: "Dashboard" }],
    },
    {
      label: "Sell",
      items: [
        { href: "/outreach", label: "Outreach Deck" },
        { href: "/contacts", label: "Contacts" },
        { href: "/pipeline", label: "Pipeline" },
      ],
    },
    {
      label: "Engage",
      items: [{ href: "/campaigns", label: "Campaigns" }],
    },
    {
      label: "Schedule",
      items: [
        { href: "/schedule", label: "Appointments" },
        { href: "/tasks", label: "Tasks" },
      ],
    },
    {
      label: "Automate",
      items: [{ href: "/automations", label: "Automations" }],
    },
    {
      label: "Growth",
      items: [
        { href: "/sites", label: "Sites & Funnels" },
        { href: "/reviews", label: "Reputation" },
        { href: "/invoices", label: "Payments" },
        { href: "/social", label: "Social" },
      ],
    },
  ];

  // Client sessions never see the System section (no Client Accounts, no
  // Integrations) and never get the business switcher.
  if (platformOwner) {
    sections.push({
      label: "System",
      items: [
        { href: "/integrations", label: "Integrations" },
        { href: "/accounts", label: "Client Accounts" },
      ],
    });
  }

  const businesses: ShellBusinessOption[] = platformOwner
    ? await listBusinesses()
    : [];

  const theme = {
    "--hud-accent": accent,
    "--hud-primary": primary,
  } as CSSProperties;

  return (
    <div
      style={theme}
      className="hud-grid-bg min-h-screen bg-[var(--hud-primary)] text-hud-ink"
    >
      <AppShell
        user={{ name: user.name, email: user.email }}
        role={role}
        org={{
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logoUrl: orgRow?.logoUrl ?? "",
        }}
        platformOwner={platformOwner}
        sections={sections}
        businesses={businesses}
      >
        {children}
      </AppShell>
    </div>
  );
}
