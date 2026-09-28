"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input } from "@/components/ui/forms";
import { createBusinessWithAdmin } from "@/lib/actions/provisioning";

function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function generatePassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

type Created = { name: string; adminEmail: string };

/**
 * "New business" dialog: provisions an Organization plus its first admin
 * login via createBusinessWithAdmin. The temporary password is never
 * displayed back after creation — the success view only confirms the admin
 * email it was set for.
 */
export function NewBusinessDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(suggestSlug(name));
  }, [name, slugTouched]);

  function reset() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setWebsite("");
    setIndustry("");
    setPhone("");
    setAdminName("");
    setAdminEmail("");
    setTempPassword("");
    setError(null);
    setCreated(null);
  }

  function close() {
    setOpen(false);
    // Keep the success view until the dialog is reopened fresh.
    if (created) reset();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createBusinessWithAdmin({
        name,
        slug,
        website,
        industry,
        phone,
        adminName,
        adminEmail,
        tempPassword,
      });
      setCreated({ name: name.trim(), adminEmail: adminEmail.trim().toLowerCase() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Business creation failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => { reset(); setOpen(true); }}>
        + New business
      </Button>
      <Modal open={open} onClose={close} title="Provision business" wide>
        {created ? (
          <div className="text-center">
            <p className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-hud-green/50 bg-hud-green/10 font-mono text-lg text-hud-green">
              ✓
            </p>
            <h3 className="text-lg font-semibold text-hud-ink">
              {created.name} is live
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-hud-muted">
              Workspace created and admin login provisioned for{" "}
              <span className="font-mono text-hud-ink">{created.adminEmail}</span>.
              Share the temporary password you set with them through a secure
              channel — they will be forced to reset it on first sign-in.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => { reset(); setOpen(true); }}>
                Create another
              </Button>
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" htmlFor="nb-name" required>
                <Input
                  id="nb-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Flooring Co."
                  required
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Slug"
                htmlFor="nb-slug"
                hint="Lowercase letters, numbers, hyphens."
                required
              >
                <Input
                  id="nb-slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                  placeholder="acme-flooring-co"
                  required
                  autoComplete="off"
                  className="font-mono"
                />
              </Field>
              <Field label="Website" htmlFor="nb-website">
                <Input
                  id="nb-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="acmeflooring.com"
                  autoComplete="off"
                />
              </Field>
              <Field label="Industry" htmlFor="nb-industry">
                <Input
                  id="nb-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Flooring & tile"
                  autoComplete="off"
                />
              </Field>
              <Field label="Phone" htmlFor="nb-phone">
                <Input
                  id="nb-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(631) 555-0100"
                  autoComplete="off"
                />
              </Field>
              <div />
            </div>

            <div className="border-t border-hud-line pt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-hud-muted">
                Admin login
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Admin name" htmlFor="nb-admin-name" required>
                  <Input
                    id="nb-admin-name"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Jordan Smith"
                    required
                    autoComplete="off"
                  />
                </Field>
                <Field label="Admin email" htmlFor="nb-admin-email" required>
                  <Input
                    id="nb-admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="jordan@acmeflooring.com"
                    required
                    autoComplete="off"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label="Temporary password"
                    htmlFor="nb-password"
                    hint="Minimum 12 characters. Never shown again after creation."
                    required
                  >
                    <div className="flex gap-2">
                      <Input
                        id="nb-password"
                        type="text"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        placeholder="Set a temporary password"
                        required
                        minLength={12}
                        autoComplete="new-password"
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setTempPassword(generatePassword())}
                      >
                        Generate
                      </Button>
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            {error ? (
              <p className="rounded-sm border border-hud-red/40 bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Provisioning…" : "Create business"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
