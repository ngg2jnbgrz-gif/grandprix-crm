import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins/organization";
import { db } from "./db";

// NOTE for programmatic user creation (provisioning scripts, bootstrap):
// use `import { hashPassword } from "better-auth/crypto"` and store the
// result on Account.password. Better Auth uses scrypt — NEVER bcrypt.
// Credential accounts must mirror better-auth's own shape exactly:
//   { providerId: "credential", accountId: <user.id>, password: <scrypt hash> }

const appUrl = process.env.APP_URL;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (!appUrl && !isBuildPhase) {
  // Fail fast at real boot (dev server, production runtime). The build phase
  // (NEXT_PHASE=phase-production-build) imports this module to collect page
  // data without env vars present — there it gets a throwaway placeholder
  // that can never serve traffic, because any real boot still throws above.
  throw new Error(
    "APP_URL is not set. Set APP_URL to the public base URL of this deployment " +
      "(e.g. https://app.grandprixdynamics.com) so Better Auth callbacks, " +
      "cookie domains and email links work.",
  );
}
if (!process.env.BETTER_AUTH_SECRET && !isBuildPhase) {
  // Never sign sessions with better-auth's insecure default secret.
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.",
  );
}

export const auth = betterAuth({
  baseURL: appUrl ?? "http://localhost:3000", // placeholder only during production build; APP_URL is required at boot (see above)
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: false,
  },

  plugins: [
    organization({
      // Membership roles used across the platform: "owner" | "admin" | "member".
      // These are better-auth's defaults — do not invent custom roles without
      // updating lib/tenant.ts (isPlatformOwner) and the shell contract in
      // ARCHITECTURE.md.
    }),
  ],

  user: {
    additionalFields: {
      mustResetPassword: {
        type: "boolean",
        defaultValue: true,
        required: false,
      },
    },
  },

  organization: {
    additionalFields: {
      website: { type: "string", required: false },
      industry: { type: "string", required: false },
      phone: { type: "string", required: false },
      logoUrl: { type: "string", required: false },
      primaryColor: { type: "string", required: false },
      accent: { type: "string", required: false },
      status: { type: "string", required: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    // Signed cookie cache lets edge middleware (which has no DB access)
    // validate sessions without a database round-trip. See middleware.ts.
    cookieCache: {
      enabled: true,
      maxAge: 60 * 15, // 15 minutes
    },
  },

  advanced: {
    cookiePrefix: "gpd",
  },
});

export type Auth = typeof auth;
