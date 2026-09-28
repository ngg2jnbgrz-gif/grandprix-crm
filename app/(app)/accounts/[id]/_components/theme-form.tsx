"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HudPanel } from "@/components/ui/hud-panel";
import { Button, Field, Input, Select } from "@/components/ui/forms";
import { updateOrganization, type getBusiness } from "@/lib/actions/accounts";

type Business = NonNullable<Awaited<ReturnType<typeof getBusiness>>>;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const fallback = (v: string, d: string) => (HEX_RE.test(v.trim()) ? v.trim() : d);

/**
 * White-label theme editor for one business. Color inputs stay in sync with
 * the hex text fields; the preview strip shows exactly what the client
 * shell will render with the chosen colors.
 */
export function ThemeForm({ org }: { org: Business }) {
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [logoUrl, setLogoUrl] = useState(org.logoUrl);
  const [website, setWebsite] = useState(org.website);
  const [industry, setIndustry] = useState(org.industry);
  const [phone, setPhone] = useState(org.phone);
  const [primaryColor, setPrimaryColor] = useState(fallback(org.primaryColor, "#07111a"));
  const [accent, setAccent] = useState(fallback(org.accent, "#35e7ff"));
  const [status, setStatus] = useState(org.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateOrganization({
        organizationId: org.id,
        name,
        logoUrl,
        website,
        industry,
        phone,
        primaryColor,
        accent,
        status,
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HudPanel
      title="Branding & theme"
      subtitle="White-label identity — applies to the client shell immediately"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="tf-name" required>
            <Input
              id="tf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
            />
          </Field>
          <Field label="Logo URL" htmlFor="tf-logo" hint="HTTPS image; blank falls back to initials.">
            <Input
              id="tf-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
              autoComplete="off"
              className="font-mono"
            />
          </Field>
          <Field label="Website" htmlFor="tf-website">
            <Input
              id="tf-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Industry" htmlFor="tf-industry">
            <Input
              id="tf-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Phone" htmlFor="tf-phone">
            <Input
              id="tf-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Status" htmlFor="tf-status">
            <Select
              id="tf-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">active</option>
              <option value="trial">trial</option>
              <option value="suspended">suspended</option>
              <option value="archived">archived</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary color" htmlFor="tf-primary" hint="Shell background.">
            <div className="flex items-center gap-2">
              <input
                id="tf-primary"
                type="color"
                value={fallback(primaryColor, "#07111a")}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="hud-swatch h-10 w-14 shrink-0 cursor-pointer"
                aria-label="Primary color picker"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="font-mono"
                aria-label="Primary color hex"
                spellCheck={false}
              />
            </div>
          </Field>
          <Field label="Accent color" htmlFor="tf-accent" hint="Neon highlights, links, glows.">
            <div className="flex items-center gap-2">
              <input
                id="tf-accent"
                type="color"
                value={fallback(accent, "#35e7ff")}
                onChange={(e) => setAccent(e.target.value)}
                className="hud-swatch h-10 w-14 shrink-0 cursor-pointer"
                aria-label="Accent color picker"
              />
              <Input
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="font-mono"
                aria-label="Accent color hex"
                spellCheck={false}
              />
            </div>
          </Field>
        </div>

        {/* Live preview of the client shell theme */}
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-hud-muted">
            Theme preview
          </p>
          <div
            className="hud-clip-sm border border-hud-line p-4"
            style={{ backgroundColor: fallback(primaryColor, "#07111a") }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: fallback(accent, "#35e7ff") }}
            >
              {name || "Business name"}
            </p>
            <p className="mt-1 text-sm" style={{ color: "#e8f4fa" }}>
              This is how the client shell header reads with the chosen theme.
            </p>
            <span
              className="mt-2 inline-block rounded-sm border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]"
              style={{
                color: fallback(accent, "#35e7ff"),
                borderColor: fallback(accent, "#35e7ff"),
              }}
            >
              Accent badge
            </span>
          </div>
        </div>

        {error ? (
          <p className="rounded-sm border border-hud-red/40 bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-sm border border-hud-green/40 bg-hud-green/10 px-3 py-2 text-sm text-hud-green">
            Theme saved — the client shell now renders with these colors.
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save theme"}
          </Button>
        </div>
      </form>
    </HudPanel>
  );
}
