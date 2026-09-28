import { Suspense } from "react";
import { LoginForm } from "./login-form";

// Neutral pre-auth styling: dark background, NO tenant branding — the tenant
// is unknown until the session resolves (see the /app org gate).
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-hud-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-hud-line bg-hud-panel p-8 shadow-hud-panel">
        <h1 className="mb-1 text-xl font-semibold text-hud-ink">Sign in</h1>
        <p className="mb-6 text-sm text-hud-muted">
          Enter your credentials to access your workspace.
        </p>
        <Suspense
          fallback={
            <p className="text-sm text-hud-muted">Loading sign-in…</p>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
