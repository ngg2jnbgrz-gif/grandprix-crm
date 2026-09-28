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
  let userCount: number;
  try {
    userCount = await db.user.count();
  } catch {
    // No database attached yet, or migrations haven't run (e.g. the very
    // first one-click deploy builds before a DB exists). Never 500 here —
    // tell the owner exactly how to finish the job.
    return (
      <main className="flex min-h-screen items-center justify-center bg-hud-bg px-4 py-10">
        <div className="w-full max-w-md rounded-lg border border-hud-line bg-hud-panel p-8 shadow-hud-panel">
          <p className="mb-1 text-xs uppercase tracking-widest text-hud-cyan">
            First boot
          </p>
          <h1 className="mb-1 text-xl font-semibold text-hud-ink">
            Database not ready yet
          </h1>
          <p className="mb-4 text-sm text-hud-muted">
            The app is live, but it can&apos;t reach its database. Two quick
            steps in your Netlify dashboard:
          </p>
          <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-hud-ink">
            <li>
              Attach a database: your site →{" "}
              <span className="font-semibold">Database</span> → create or
              connect one (or set a{" "}
              <span className="font-mono">DATABASE_URL</span> environment
              variable).
            </li>
            <li>
              Redeploy so migrations run:{" "}
              <span className="font-semibold">
                Deploys → Trigger deploy → Deploy site
              </span>
              .
            </li>
          </ol>
          <p className="text-sm text-hud-muted">
            Then come back here — this setup screen will be waiting.
          </p>
        </div>
      </main>
    );
  }
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
