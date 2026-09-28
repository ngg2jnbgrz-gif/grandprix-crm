"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { auditSignIn } from "@/lib/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (res.error) {
        throw new Error("Invalid email or password.");
      }
      // Audit the sign-in server-side while the session is fresh, then
      // let the org gate (/app) resolve the workspace.
      await auditSignIn();
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm text-hud-muted"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-hud-line bg-hud-panel px-3 py-2 text-hud-ink placeholder:text-hud-muted/60 focus:border-hud-cyan focus:outline-none"
          placeholder="you@business.com"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm text-hud-muted"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-hud-line bg-hud-panel px-3 py-2 text-hud-ink placeholder:text-hud-muted/60 focus:border-hud-cyan focus:outline-none"
          placeholder="••••••••"
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
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
