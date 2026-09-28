"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Textarea, Select } from "@/components/ui/forms";
import {
  saveCampaign,
  type CampaignRow,
} from "@/lib/actions/crm-growth";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES
} from "@/lib/crm-growth-lists";

type Props = { campaign?: CampaignRow | null };

/**
 * Create/edit dialog for campaigns. Renders its own trigger: "+ New
 * campaign" when creating, a small Edit button when editing.
 */
export function CampaignDialog({ campaign = null }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<string>("email");
  const [status, setStatus] = useState<string>("draft");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function seed() {
    setName(campaign?.name ?? "");
    setChannel(campaign?.channel ?? "email");
    setStatus(campaign?.status ?? "draft");
    setBody(campaign?.body ?? "");
    setError(null);
  }

  function openDialog() {
    seed();
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveCampaign({
        id: campaign?.id,
        name,
        channel,
        status,
        body,
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
      {campaign ? (
        <Button size="sm" variant="ghost" onClick={openDialog}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={openDialog}>
          + New campaign
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={campaign ? "Edit campaign" : "New campaign"}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name" htmlFor="c-name" required>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="October tile promo"
              required
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Channel" htmlFor="c-channel" required>
              <Select
                id="c-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                {CAMPAIGN_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="c-status" required>
              <Select
                id="c-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Body"
            htmlFor="c-body"
            hint="The message text for this campaign."
          >
            <Textarea
              id="c-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {name} — ..."
              rows={6}
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
              {saving ? "Saving…" : campaign ? "Save changes" : "Create campaign"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
