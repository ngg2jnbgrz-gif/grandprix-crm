"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Textarea, Select } from "@/components/ui/forms";
import {
  saveWebAsset,
  type WebAssetRow,
  
} from "@/lib/actions/crm-growth";
import {
  WEBASSET_KINDS,
  WEBASSET_STATUSES
} from "@/lib/crm-growth-lists";

type Props = { asset?: WebAssetRow | null };

/**
 * Create/edit dialog for web assets. Renders its own trigger: "+ New
 * asset" when creating, a small Edit button when editing.
 */
export function WebAssetDialog({ asset = null }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("site");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setName(asset?.name ?? "");
    setKind(asset?.kind ?? "site");
    setUrl(asset?.url ?? "");
    setStatus(asset?.status ?? "draft");
    setNotes(asset?.notes ?? "");
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveWebAsset({
        id: asset?.id,
        name,
        kind,
        url,
        status,
        notes,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {asset ? (
        <Button size="sm" variant="ghost" onClick={openDialog}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={openDialog}>
          + New asset
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={asset ? "Edit web asset" : "New web asset"}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name" htmlFor="w-name" required>
            <Input
              id="w-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main website"
              required
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind" htmlFor="w-kind" required>
              <Select
                id="w-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {WEBASSET_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="w-status" required>
              <Select
                id="w-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {WEBASSET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="URL" htmlFor="w-url" hint="Full URL including https://">
            <Input
              id="w-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoComplete="off"
              className="font-mono"
            />
          </Field>
          <Field label="Notes" htmlFor="w-notes">
            <Textarea
              id="w-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hosting, access, credentials location, …"
              rows={3}
            />
          </Field>

          {error ? (
            <p className="rounded-sm border border-hud-red/40 bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : asset ? "Save changes" : "Create asset"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
