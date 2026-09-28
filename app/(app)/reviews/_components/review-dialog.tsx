"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Textarea, Select } from "@/components/ui/forms";
import {
  saveReview,
  type ReviewRow,
  type ContactOption,
  
} from "@/lib/actions/crm-growth";
import {
  REVIEW_STATUSES
} from "@/lib/crm-growth-lists";

type Props = {
  review?: ReviewRow | null;
  contacts: ContactOption[];
};

/**
 * Create/edit dialog for reviews. Renders its own trigger: "+ Log review"
 * when creating, a small Edit button when editing.
 */
export function ReviewDialog({ review = null, contacts }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState("5");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<string>("new");
  const [text, setText] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setAuthor(review?.author ?? "");
    setRating(review ? String(review.rating) : "5");
    setSource(review?.source ?? "");
    setStatus(review?.status ?? "new");
    setText(review?.text ?? "");
    setContactId(review?.contactId ?? "");
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveReview({
        id: review?.id,
        author,
        rating,
        text,
        source,
        status,
        contactId: contactId || null,
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
      {review ? (
        <Button size="sm" variant="ghost" onClick={openDialog}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={openDialog}>
          + Log review
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={review ? "Edit review" : "Log review"}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Author" htmlFor="r-author" required>
            <Input
              id="r-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Jane D."
              required
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rating" htmlFor="r-rating" required>
              <Select
                id="r-rating"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={String(n)}>
                    {"★".repeat(n)}{"☆".repeat(5 - n)} ({n})
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Source"
              htmlFor="r-source"
              hint="Google, Yelp, Facebook, …"
            >
              <Input
                id="r-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Google"
                autoComplete="off"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="r-status" required>
              <Select
                id="r-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {REVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Linked contact" htmlFor="r-contact">
              <Select
                id="r-contact"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Review text" htmlFor="r-text">
            <Textarea
              id="r-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What the customer said…"
              rows={4}
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
              {saving ? "Saving…" : review ? "Save changes" : "Log review"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
