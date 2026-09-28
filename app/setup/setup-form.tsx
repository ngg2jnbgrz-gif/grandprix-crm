"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runSetup } from "./actions";

const inputCls =
  "w-full rounded-md border border-hud-line bg-hud-panel px-3 py-2 text-hud-ink placeholder:text-hud-muted/60 focus:border-hud-cyan focus:outline-none";
const labelCls = "mb-1 block text-sm text-hud-muted";

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ imported: number; hot: number } | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await runSetup(new FormData(e.currentTarget));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone({ imported: res.imported, hot: res.hot });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-hud-cyan/50 bg-hud-cyan/10 text-xl text-hud-cyan">
          ✓
        </div>
        <h2 className="text-lg font-semibold text-hud-ink">
          Workspace is live
        </h2>
        <p className="text-sm text-hud-muted">
          {done.imported > 0 ? (
            <>
              Imported <span className="text-hud-ink">{done.imported}</span>{" "}
              partner leads
              {done.hot > 0 && (
                <>
                  , including <span className="text-hud-ink">{done.hot}</span>{" "}
                  hot-list opportunities
                </>
              )}{" "}
              into Patchogue Flooring.
            </>
          ) : (
            "Your owner account is ready — no leads file was uploaded."
          )}
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full rounded-md bg-hud-cyan px-4 py-2 font-medium text-hud-bg shadow-hud-glow transition"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="setup-name" className={labelCls}>
          Your name
        </label>
        <input
          id="setup-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Chris James"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="setup-email" className={labelCls}>
          Email
        </label>
        <input
          id="setup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@grandprixdynamics.com"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="setup-password" className={labelCls}>
          Password <span className="text-hud-muted/70">(min 12 characters)</span>
        </label>
        <input
          id="setup-password"
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          placeholder="••••••••••••"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="setup-leads" className={labelCls}>
          Partner leads spreadsheet{" "}
          <span className="text-hud-muted/70">(optional .xlsx)</span>
        </label>
        <input
          id="setup-leads"
          name="leads"
          type="file"
          accept=".xlsx,.xls"
          className="w-full rounded-md border border-hud-line bg-hud-panel px-3 py-2 text-sm text-hud-muted file:mr-3 file:rounded file:border-0 file:bg-hud-cyan/15 file:px-3 file:py-1 file:text-hud-cyan"
        />
        <p className="mt-1 text-xs text-hud-muted/70">
          Upload the lead tracker to import every contact — hot-list rows
          become priority opportunities automatically.
        </p>
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
        {loading ? "Building your workspace…" : "Create workspace"}
      </button>
    </form>
  );
}
