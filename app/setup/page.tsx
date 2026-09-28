import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SetupForm } from "./setup-form";

// This page touches the database and must never be statically prerendered.
export const dynamic = "force-dynamic";

/**
 * First-boot setup. Creates the organizations, the platform owner, and
 * optionally imports the partner-lead spreadsheet. Permanently redirects
 * to /login the moment ANY user exists — this screen can only ever run once.
 */
export default async function SetupPage() {
  const userCount = await db.user.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-hud-bg px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-hud-line bg-hud-panel p-8 shadow-hud-panel">
        <p className="mb-1 text-xs uppercase tracking-widest text-hud-cyan">
          First boot
        </p>
        <h1 className="mb-1 text-xl font-semibold text-hud-ink">
          Set up your workspace
        </h1>
        <p className="mb-6 text-sm text-hud-muted">
          Create your owner account for Grand Prix Dynamics. This screen
          disappears forever after setup.
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
