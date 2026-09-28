import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/tenant";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

// Neutral pre-/mid-auth styling: no tenant branding. Requires a session;
// the middleware routes mustResetPassword users here from protected pages.
export default async function ResetPasswordPage() {
  const s = await getSessionUser();
  if (!s) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-hud-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-hud-line bg-hud-panel p-8 shadow-hud-panel">
        <h1 className="mb-1 text-xl font-semibold text-hud-ink">
          {s.user.mustResetPassword
            ? "Set your password"
            : "Change your password"}
        </h1>
        <p className="mb-6 text-sm text-hud-muted">
          {s.user.mustResetPassword
            ? "Your account was created with a temporary password. Choose a new one to continue."
            : "Enter your current password and choose a new one."}
        </p>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
