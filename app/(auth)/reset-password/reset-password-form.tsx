"use client";

import { useState } from "react";
import { changePasswordAndClearFlag } from "@/lib/actions/auth";

export function ResetPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      // Server action changes the password via Better Auth, clears the
      // mustResetPassword flag, audit-logs, and redirects to /app.
      await changePasswordAndClearFlag({ currentPassword, newPassword });
    } catch (err) {
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Could not change password.",
      );
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-hud-line bg-hud-panel px-3 py-2 text-hud-ink placeholder:text-hud-muted/60 focus:border-hud-cyan focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="current" className="mb-1 block text-sm text-hud-muted">
          Current (temporary) password
        </label>
        <input
          id="current"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
          placeholder="The temporary password you were given"
        />
      </div>
      <div>
        <label htmlFor="new" className="mb-1 block text-sm text-hud-muted">
          New password
        </label>
        <input
          id="new"
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
          placeholder="Minimum 8 characters"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm text-hud-muted">
          Confirm new password
        </label>
        <input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
          placeholder="Repeat the new password"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-hud-red">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-hud-cyan px-4 py-2 font-medium text-hud-bg shadow-hud-glow transition disabled:opacity-50"
      >
        {loading ? "Changing password…" : "Set new password"}
      </button>
    </form>
  );
}
