"use client";

import { createAuthClient } from "better-auth/react";

// Client-side auth for the pre-auth pages (login). Post-auth pages use
// server helpers from lib/tenant.ts instead.
export const authClient = createAuthClient();
