"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { auditSignOut } from "@/lib/actions/org";

/**
 * Sign-out for the app shell top bar. Audits first (session still readable),
 * then clears the session client-side and lands on /login.
 */
export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    if (loading) return;
    setLoading(true);
    try {
      await auditSignOut();
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login");
            router.refresh();
          },
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="rounded-sm border border-hud-line px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-hud-muted transition hover:border-hud-red/60 hover:text-hud-red disabled:opacity-50"
    >
      {loading ? "Exiting…" : "Sign out"}
    </button>
  );
}
