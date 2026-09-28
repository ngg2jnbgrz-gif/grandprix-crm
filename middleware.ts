import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth";

// Routes that require an authenticated session.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/contacts",
  "/pipeline",
  "/tasks",
  "/schedule",
  "/campaigns",
  "/automations",
  "/invoices",
  "/reviews",
  "/social",
  "/sites",
  "/integrations",
  "/accounts",
  "/app",
];

// Always public (checked before the protected list).
function isPublic(path: string): boolean {
  if (path === "/") return true;
  if (path === "/login" || path === "/reset-password") return true;
  // /setup is the one-shot first-boot wizard — it must stay reachable
  // without a session. Its own page + server action refuse to run once any
  // user exists, so listing it here grants no ongoing access.
  if (path === "/setup") return true;
  if (path.startsWith("/api/auth/")) return true;
  if (path === "/api/health") return true;
  return false;
}

function isProtected(path: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/"),
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (isPublic(path) || !isProtected(path)) return NextResponse.next();

  // Primary check: full session via Better Auth. With
  // `session.cookieCache` enabled in lib/auth.ts this validates against the
  // signed session_data cookie and is DB-free while the cache is warm —
  // which is what makes it safe to run in edge middleware.
  let session: { user: { mustResetPassword?: boolean } } | null = null;
  let cookieOnly = false;
  try {
    const result = await auth.api.getSession({ headers: request.headers });
    session = result
      ? { user: { mustResetPassword: result.user.mustResetPassword ?? undefined } }
      : null;
  } catch {
    // Edge runtime has no DB access: if the cookie cache is cold/expired the
    // DB fallback throws. Fall back to session-cookie presence — the user
    // stays "authenticated" for routing, and the mustResetPassword gate is
    // enforced authoritatively in server components/actions (lib/tenant.ts,
    // app/app, reset-password) which run on Node with full DB access.
    session = null;
    cookieOnly = getSessionCookie(request, { cookiePrefix: "gpd" }) !== null;
  }

  if (!session && !cookieOnly) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (
    session?.user?.mustResetPassword &&
    path !== "/reset-password" &&
    !path.startsWith("/reset-password/")
  ) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
