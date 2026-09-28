"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Textarea, Select } from "@/components/ui/forms";
import {
  saveIntegration,
  type IntegrationRow,
  
} from "@/lib/actions/crm-growth";
import {
  INTEGRATION_KINDS,
  INTEGRATION_STATUSES
} from "@/lib/crm-growth-lists";

type Props = { integration?: IntegrationRow | null };

function pretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

/**
 * Create/edit dialog for integrations. Config is edited as raw JSON with
 * server-side validation. Renders its own trigger.
 */
export function IntegrationDialog({ integration = null }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("mcp");
  const [configJson, setConfigJson] = useState("");
  const [status, setStatus] = useState<string>("disabled");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setName(integration?.name ?? "");
    setKind(integration?.kind ?? "mcp");
    setConfigJson(
      integration
        ? pretty(integration.configJson)
        : '{\n  "url": "https://…",\n  "notes": "auth via …"\n}',
    );
    setStatus(integration?.status ?? "disabled");
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveIntegration({
        id: integration?.id,
        name,
        kind,
        configJson,
        status,
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
      {integration ? (
        <Button size="sm" variant="ghost" onClick={openDialog}>
          Edit
        </Button>
      ) : (
        <Button size="sm" onClick={openDialog}>
          + New integration
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={integration ? "Edit integration" : "New integration"}
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name" htmlFor="g-name" required>
            <Input
              id="g-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CRM tools MCP server"
              required
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind" htmlFor="g-kind" required>
              <Select
                id="g-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {INTEGRATION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="g-status" required>
              <Select
                id="g-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {INTEGRATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Config (JSON)"
            htmlFor="g-config"
            hint="Must be a valid JSON object. For MCP servers include the server URL and auth notes."
            required
          >
            <Textarea
              id="g-config"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              rows={8}
              required
              spellCheck={false}
              className="font-mono text-xs"
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
              {saving ? "Saving…" : integration ? "Save changes" : "Create integration"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
