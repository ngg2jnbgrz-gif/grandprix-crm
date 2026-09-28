/**
 * Owner bootstrap — run once at first boot (see DEPLOY.md):
 *
 *   SEED_ADMIN_EMAIL=owner@example.com \
 *   SEED_ADMIN_PASSWORD='<strong temp password>' \
 *   SEED_ADMIN_NAME='Chris James' \
 *   npm run bootstrap:admin
 *
 * Finds the "grand-prix-dynamics" org (created by prisma/seed.ts), creates
 * the owner User with a Better Auth scrypt-hashed credential Account, and
 * adds them as role "owner". Idempotent: skips anything that already exists.
 *
 * NEVER commit real values — pass them via the environment only.
 */
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "@prisma/client";

const PLATFORM_ORG_SLUG = "grand-prix-dynamics";

const emailRaw = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const passwordRaw = process.env.SEED_ADMIN_PASSWORD;
const name = process.env.SEED_ADMIN_NAME?.trim() || "Platform Owner";

if (!emailRaw || !passwordRaw) {
  console.error(
    "bootstrap:admin requires SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in the environment.",
  );
  process.exit(1);
}
if (passwordRaw.length < 12) {
  console.error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

// Narrowed for use inside main()'s closure.
const email: string = emailRaw;
const password: string = passwordRaw;

const db = new PrismaClient();

async function main() {
  const org = await db.organization.findUnique({
    where: { slug: PLATFORM_ORG_SLUG },
  });
  if (!org) {
    throw new Error(
      `Organization "${PLATFORM_ORG_SLUG}" not found — run the seed (npm run prisma:seed) first.`,
    );
  }

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    // Mirror better-auth's own credential account shape exactly:
    // providerId "credential", accountId = user.id, scrypt-hashed password.
    const hashed = await hashPassword(password);
    user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name,
          email,
          emailVerified: true,
          mustResetPassword: true, // forced-reset flow picks them up on first sign-in
        },
      });
      await tx.account.create({
        data: {
          userId: u.id,
          providerId: "credential",
          accountId: u.id,
          password: hashed,
        },
      });
      return u;
    });
    console.log(`created user ${email}`);
  } else {
    console.log(`user ${email} already exists — skipping creation`);
    const cred = await db.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (!cred) {
      const hashed = await hashPassword(password);
      await db.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashed,
        },
      });
      console.log(`added missing credential account for ${email}`);
    }
  }

  const member = await db.member.findFirst({
    where: { userId: user.id, organizationId: org.id },
  });
  if (!member) {
    await db.member.create({
      data: { userId: user.id, organizationId: org.id, role: "owner" },
    });
    console.log(`added ${email} as owner of ${PLATFORM_ORG_SLUG}`);
  } else {
    console.log(
      `${email} is already a member of ${PLATFORM_ORG_SLUG} (role: ${member.role}) — skipping`,
    );
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await db.$disconnect();
    process.exit(1);
  });
