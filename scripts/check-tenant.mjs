/**
 * Tenant-isolation grep gate.
 *
 * Scans lib/actions/*.ts and FAILS if any file neither scopes Prisma queries
 * by the tenant key ("businessId") nor carries an explicit exemption comment:
 *
 *   // tenant-gate: exempt — <reason>
 *
 * Exemptions are for session/org-management and platform-owner provisioning
 * files that operate outside tenant data by design (they still resolve the
 * caller from their session and are audit-logged).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ACTIONS_DIR = join(process.cwd(), "lib", "actions");
const EXEMPT_MARKER = "tenant-gate: exempt";

let failed = false;
let checked = 0;

for (const entry of readdirSync(ACTIONS_DIR)) {
  if (!entry.endsWith(".ts")) continue;
  const file = join(ACTIONS_DIR, entry);
  const src = readFileSync(file, "utf8");
  checked += 1;
  if (src.includes("businessId")) {
    console.log(`ok      ${entry} (references businessId)`);
    continue;
  }
  if (src.includes(EXEMPT_MARKER)) {
    console.log(`exempt  ${entry} (explicit tenant-gate exemption)`);
    continue;
  }
  console.error(
    `FAIL    ${entry}: no "businessId" scoping and no "${EXEMPT_MARKER}" comment`,
  );
  failed = true;
}

if (checked === 0) {
  console.error("FAIL    no action files found in lib/actions/");
  failed = true;
}

process.exit(failed ? 1 : 0);
