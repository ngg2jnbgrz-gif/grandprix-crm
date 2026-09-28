"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HudPanel } from "@/components/ui/hud-panel";
import { Button, Field, Input, Textarea, Select } from "@/components/ui/forms";
import {
  saveSocialPost,
  type SocialPostRow,
  
} from "@/lib/actions/crm-growth";
import {
  SOCIAL_CHANNELS
} from "@/lib/crm-growth-lists";

function toDatetimeLocal(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

/**
 * Post composer: channel select, content with live character count,
 * optional scheduled time, save-as-draft or schedule. Also edits existing
 * drafts/scheduled posts.
 */
export function SocialComposer({ post = null }: { post?: SocialPostRow | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(post !== null);
  const [channel, setChannel] = useState(post?.channel ?? "facebook");
  const [content, setContent] = useState(post?.content ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    toDatetimeLocal(post?.scheduledAt ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = post !== null;

  async function submit(status: "draft" | "scheduled") {
    setSaving(true);
    setError(null);
    try {
      await saveSocialPost({
        id: post?.id,
        channel,
        content,
        scheduledAt: scheduledAt || null,
        status,
      });
      if (!editing) {
        setContent("");
        setScheduledAt("");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Default submit (Enter) saves a draft; the Schedule button passes
    // "scheduled" explicitly.
    void submit("draft");
  }

  if (editing && !open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );
  }

  return (
    <HudPanel
      title={editing ? "Edit post" : "Composer"}
      subtitle={
        editing
          ? "Update the draft, then save or reschedule."
          : "Draft a post for any channel. Scheduling keeps it queued here."
      }
      actions={
        editing ? (
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : null
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Channel" htmlFor={editing ? "s-ch-e" : "s-ch"} required>
            <Select
              id={editing ? "s-ch-e" : "s-ch"}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {SOCIAL_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Scheduled for"
            htmlFor={editing ? "s-when-e" : "s-when"}
            hint="Leave blank to keep it an unscheduled draft."
          >
            <Input
              id={editing ? "s-when-e" : "s-when"}
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Content"
          htmlFor={editing ? "s-content-e" : "s-content"}
          hint={`${content.length} character${content.length === 1 ? "" : "s"}`}
          required
        >
          <Textarea
            id={editing ? "s-content-e" : "s-content"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What should this post say?"
            rows={5}
            required
          />
        </Field>

        {error ? (
          <p className="rounded-sm border border-hud-red/40 bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => void submit("draft")}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button onClick={() => void submit("scheduled")} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save & schedule" : "Schedule post"}
          </Button>
        </div>
      </form>
    </HudPanel>
  );
}
