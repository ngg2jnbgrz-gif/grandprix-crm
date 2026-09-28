"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HudPanel } from "@/components/ui/hud-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, Field, Input, Select } from "@/components/ui/forms";
import {
  createPortalUser,
  setUserRole,
  deactivateUser,
  type listOrgUsers,
} from "@/lib/actions/provisioning";
import { formatDate } from "@/lib/format";

type OrgUser = Awaited<ReturnType<typeof listOrgUsers>>[number];

function generatePassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const roleTone = (role: string) =>
  role === "owner" ? ("accent" as const) : role === "admin" ? ("violet" as const) : ("muted" as const);

/**
 * User management for one business: add-user form plus the member roster
 * with per-user role changes and deactivation. All mutations go through the
 * audited provisioning actions; the page refreshes from the server after
 * each change.
 */
export function UsersPanel({
  orgId,
  initialUsers,
}: {
  orgId: string;
  initialUsers: OrgUser[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function afterMutation(message: string) {
    setNotice(message);
    setError(null);
    router.refresh();
  }

  async function onAddUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await createPortalUser({
        organizationId: orgId,
        name,
        email,
        tempPassword,
        role,
      });
      setName("");
      setEmail("");
      setTempPassword("");
      setRole("member");
      await afterMutation(
        `Login provisioned for ${email.trim().toLowerCase()} — share the temporary password through a secure channel.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add user.");
    } finally {
      setSaving(false);
    }
  }

  async function onRoleChange(u: OrgUser, nextRole: string) {
    if (nextRole === u.role) return;
    setBusyUser(u.userId);
    setError(null);
    setNotice(null);
    try {
      await setUserRole({ organizationId: orgId, userId: u.userId, role: nextRole });
      await afterMutation(`Role for ${u.email} changed to ${nextRole}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role change failed.");
    } finally {
      setBusyUser(null);
    }
  }

  async function onDeactivate(u: OrgUser) {
    if (
      !window.confirm(
        `Revoke ${u.name} (${u.email})'s access to this business? Their login survives for other workspaces.`,
      )
    ) {
      return;
    }
    setBusyUser(u.userId);
    setError(null);
    setNotice(null);
    try {
      await deactivateUser({ organizationId: orgId, userId: u.userId });
      await afterMutation(`${u.email} was removed from this business.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivation failed.");
    } finally {
      setBusyUser(null);
    }
  }

  const columns: DataTableColumn<OrgUser>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => (
        <div>
          <p className="font-medium text-hud-ink">{u.name}</p>
          <p className="font-mono text-[11px] text-hud-muted">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Select
            value={u.role}
            disabled={busyUser !== null}
            onChange={(e) => onRoleChange(u, e.target.value)}
            className="w-32"
            aria-label={`Role for ${u.email}`}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </Select>
          <Badge tone={roleTone(u.role)}>{u.role}</Badge>
        </div>
      ),
    },
    {
      key: "flags",
      header: "Flags",
      render: (u) =>
        u.mustResetPassword ? (
          <Badge tone="amber">must reset pw</Badge>
        ) : (
          <span className="text-hud-muted/50">—</span>
        ),
    },
    {
      key: "created",
      header: "Added",
      align: "right",
      render: (u) => (
        <span className="whitespace-nowrap font-mono text-xs text-hud-muted">
          {formatDate(u.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (u) => (
        <Button
          variant="danger"
          size="sm"
          disabled={busyUser !== null}
          onClick={() => onDeactivate(u)}
        >
          {busyUser === u.userId ? "Working…" : "Deactivate"}
        </Button>
      ),
    },
  ];

  return (
    <HudPanel
      title="Users"
      subtitle={`${initialUsers.length} ${initialUsers.length === 1 ? "member" : "members"} in this workspace`}
    >
      <div className="space-y-6">
        {error ? (
          <p className="rounded-sm border border-hud-red/40 bg-hud-red/10 px-3 py-2 text-sm text-hud-red">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-sm border border-hud-green/40 bg-hud-green/10 px-3 py-2 text-sm text-hud-green">
            {notice}
          </p>
        ) : null}

        <form onSubmit={onAddUser} className="rounded-sm border border-hud-line bg-hud-panel2 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-hud-muted">
            Add user
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Name" htmlFor="au-name" required>
              <Input
                id="au-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
              />
            </Field>
            <Field label="Email" htmlFor="au-email" required>
              <Input
                id="au-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </Field>
            <Field
              label="Temp password"
              htmlFor="au-password"
              hint="Min 12 chars."
              required
            >
              <div className="flex gap-2">
                <Input
                  id="au-password"
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
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
                  Gen
                </Button>
              </div>
            </Field>
            <Field label="Role" htmlFor="au-role" required>
              <Select
                id="au-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Adding…" : "Add user"}
              </Button>
            </div>
          </div>
        </form>

        {initialUsers.length > 0 ? (
          <DataTable
            columns={columns}
            rows={initialUsers}
            keyOf={(u) => u.membershipId}
          />
        ) : (
          <EmptyState
            title="No users yet"
            description="Add the first user above to give this business a login."
          />
        )}
      </div>
    </HudPanel>
  );
}
