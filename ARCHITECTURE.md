# Grand Prix CRM — Architecture (stage 2: auth & multi-tenant isolation)

White-label, multi-tenant CRM. One deployment serves many businesses; every
tenant-facing row carries a `businessId` and all data access is tenant-scoped.
Next.js 15 (App Router) · TypeScript strict · Tailwind v3 · Prisma v6 ·
PostgreSQL 16 · Better Auth 1.7.x.

## Auth model (Better Auth — implemented)

- Identity is owned by Better Auth (`lib/auth.ts`). Session/cookie signing
  and password hashing (**scrypt** — never bcrypt) are handled by it.
- `baseURL` comes from `APP_URL` (**required** — the app throws a clear error
  at boot if unset) so callbacks/cookies work on Netlify's URL today and on
  `app.grandprixdynamics.com` later.
- `emailAndPassword` enabled, `requireEmailVerification: false`,
  `autoSignIn: false`. Sessions live 7 days; cookies use prefix `gpd`.
- `session.cookieCache` is **enabled** (15 min): a signed `session_data`
  cookie lets edge middleware validate sessions **without a DB round-trip**.
  Authoritative reads (`requireOrg()`, server actions) always hit the DB on
  Node — the cookie cache is a routing fast-path only.
- `user.additionalFields`: `mustResetPassword` (boolean, default true) —
  drives the forced-reset flow.
- `organization` plugin enabled; membership roles are exactly
  `"owner" | "admin" | "member"` (Better Auth defaults — do not invent new
  roles without updating `lib/tenant.ts`).
- `organization.additionalFields`: `website`, `industry`, `phone`, `logoUrl`,
  `primaryColor`, `accent`, `status` (all optional strings).
- The Prisma auth tables (`User`, `Session`, `Account`, `Verification`,
  `Organization`, `Member`, `Invitation`) use Better Auth's **exact field
  names** — verified with `npx @better-auth/cli generate` (see "Schema
  check" below). All IDs are `String @default(cuid())`.
- The tenant is the **Organization** (slug `patchogue-flooring`,
  `grand-prix-dynamics`). CRM tables reference it via `businessId`.
- **Manual user creation** (provisioning, bootstrap) must mirror Better
  Auth's own shape exactly: hash with
  `import { hashPassword } from "better-auth/crypto"` (scrypt), then
  `prisma.account.create({ providerId: "credential", accountId: <user.id>, password: <hash> })`
  — note `accountId` is the **user id**, not the email.

## Auth handoff (stage 1 → auth stage)

- ~~Auth is **Better Auth** ... there is no custom auth code in this stage.~~
  Implemented in stage 2 — see "Auth model" above.
- `prisma/seed.ts` creates **no users**. The owner bootstrap script
  `prisma/bootstrap-admin.ts` (`npm run bootstrap:admin`) consumes
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` and creates
  the owner `User` + scrypt credential `Account` + `Member` (role `owner`) on
  the Grand Prix Dynamics org. Idempotent — skips anything that exists.
  Run it once at first boot (DEPLOY.md), never commit the values.
- Runtime secrets: `BETTER_AUTH_SECRET` (min 32 chars,
  `openssl rand -base64 32`), `APP_URL` (required), `SEED_ADMIN_*`
  (bootstrap only).

## Conventions for later stages

### Routes
- `app/(auth)/login` — neutral sign-in (no tenant branding; the tenant is
  resolved from the user's session, not the URL).
- `app/(auth)/reset-password` — forced-reset flow for `mustResetPassword`
  users; also neutral.
- `app/(app)/*` — authenticated shell: `dashboard`, `contacts`, `pipeline`,
  `tasks`, `schedule`, `campaigns`, `automations`, `invoices`, `reviews`,
  `social`, `sites`, `integrations`, `accounts`.
- `app/api/health` — liveness probe (`{ ok: true }`); must stay DB-free.

### Data access
- Server actions live in `lib/actions/*.ts` (one file per domain).
- **The requireOrg() convention:** every server action MUST call
  `requireOrg()` (or `requirePlatformOwner()`) from `lib/tenant.ts` and scope
  **all** Prisma queries by `businessId: organization.id`. Never accept a
  `businessId`/`organizationId` from client input. Enforced by
  `npm run check:tenant`, which fails any `lib/actions/*.ts` file that
  neither references `businessId` nor carries an explicit
  `// tenant-gate: exempt — <reason>` comment (exemptions are for
  session/org-management and owner provisioning, which operate outside
  tenant data by design).
- Shared Prisma client: `lib/db.ts` (globalThis singleton).
- Audit-sensitive writes also append an `AuditLog` row via
  `logAudit()` (`lib/audit.ts`) — best-effort, never throws.

### Tenant resolution & shell contract
- `getSessionUser()` → `{ user, session } | null` (server-only).
- `requireOrg()` → `{ user, organization, membership, role }`; redirects to
  `/login` when unauthenticated, to `/app` when no active org is set. Never
  returns null.
- **Owner vs client shell:** platform-owner powers come ONLY from
  `isPlatformOwner(userId)` — membership with role `"owner"` on the org
  whose slug is `grand-prix-dynamics`. An `"owner"` of a client org is NOT a
  platform owner. The client shell hides: business switcher, Client Accounts
  admin, Integrations/MCP.
- **Email uniqueness:** Better Auth users are GLOBAL (`User.email` is
  `@unique` across the platform) — the same human CAN belong to multiple
  orgs with one login. App-level email uniqueness is enforced PER ORG only
  (see `createPortalUser`): one org cannot have two members with the same
  email, but two orgs can share the human.
- `middleware.ts` protects `/dashboard /contacts /pipeline /tasks /schedule
  /campaigns /automations /invoices /reviews /social /sites /integrations
  /accounts /app` via `auth.api.getSession` (DB-free on edge while the
  cookie cache is warm; falls back to session-cookie presence on cold cache,
  fail-closed to `/login`). `user.mustResetPassword` redirects to
  `/reset-password` from any protected route. Public: `/`, `/login`,
  `/reset-password`, `/api/auth/*`, `/api/health`.

### UI
- Reusable primitives in `components/ui/` (Button, Input, Card, Table, …).
- Tailwind v3 theme extension in `tailwind.config.js` under `hud.*`
  (e.g. `bg-hud-bg`, `text-hud-cyan`, `border-hud-line`, `shadow-hud-glow`).
  Per-tenant theming later reads `Organization.primaryColor` /
  `Organization.accent` (defaults `#07111a` / `#35e7ff`).

### Auth model (implemented in the auth stage — see "Auth handoff" above)
- Better Auth owns identity: `User` (email globally `@unique`), credentials
  in `Account` (scrypt-hashed `password`), DB-backed `Session` rows.
- Tenancy is via `Member`: a `User` belongs to one or more `Organization`s
  with a `role` (`owner` | `admin` | `member`).
- Invites flow through `Invitation` (`pending` → accepted).

### Auth flows (stage 2)
- `app/(auth)/login` — neutral sign-in (no tenant branding; the tenant is
  resolved from the user's session, not the URL). Client form →
  `authClient.signIn.email()` → `auditSignIn()` → `/app`.
- `app/app` — post-login org gate: 0 orgs → "no workspace" message;
  1 org → `setActiveOrg()` then `/dashboard`; 2+ → workspace picker.
  `setActiveOrg` verifies membership, updates the session row's
  `activeOrganizationId` via `auth.api.setActiveOrganization`, audit-logs
  (`org.switched`), redirects to `/dashboard`.
- `app/(auth)/reset-password` — forced-reset flow for `mustResetPassword`
  users (also neutral); server action uses `auth.api.changePassword` with
  the current (temp) password, clears the flag, audit-logs
  (`auth.password_reset`), redirects to `/app`.
- Owner provisioning (`lib/actions/provisioning.ts`, platform-owner ONLY via
  `requirePlatformOwner()`, every call audit-logged): `createBusinessWithAdmin`,
  `createPortalUser`, `listBusinesses`, `listOrgUsers`, `setUserRole`,
  `deactivateUser` (deletes the Member row; the User/Account rows survive so
  the human keeps other org logins). Last-owner-of-org is protected.
  Provisioning returns ids only — temp passwords live in memory/args, are
  never logged or returned.
- Audit events wired: `auth.sign_in`, `auth.sign_out`, `auth.password_reset`,
  `org.switched`, `business.created`, `user.created`, `user.added_to_org`,
  `user.role_changed`, `user.deactivated`, `platform.forbidden`.

## Database

Schema: `prisma/schema.prisma`. Migrations via `npm run db:migrate`
(dev) — in Docker/prod, run `npx prisma migrate deploy` at deploy time,
**before** starting the app (see `Dockerfile` note and `docker-compose.yml`).

Seed: `npm run prisma:seed` (idempotent — skips if either organization slug
exists). `npm run prisma:seed:dry` parses only and prints counts.
The seed loads the Patchogue Flooring B2B partner lead list into the
`patchogue-flooring` organization and flags the TOP 25 hot list as
`priority=true`, `temperature="hot"` with one `new` Opportunity each.
The seed creates NO users; owner bootstrap is the auth stage's job
(`npm run bootstrap:admin`, consumes `SEED_ADMIN_*`).

Schema check (stage 2): `npx @better-auth/cli generate` was run against
`lib/auth.ts` and diffed with `prisma/schema.prisma`. It found ONE
functional gap — `Invitation.inviterId`, required by the organization
plugin's invite flow — which was added (as `inviterId` + `inviter` relation
on `Invitation`, `invitations` on `User`), along with better-auth's
reference `@@index`es on the auth tables. Remaining diffs vs the generated
file are intentional: `User.mustResetPassword` is non-null (not `Boolean?`)
and the inviter relation is named `inviter`/`InvitationInviter` instead of
`user` — the scalar `inviterId` (what the adapter writes) matches exactly.
No Better Auth field was renamed. Re-run after any auth config change.

## Environments

| Var | Purpose |
| --- | ------- |
| `DATABASE_URL` | Prisma connection string |
| `APP_URL` | Public base URL |
| `BETTER_AUTH_SECRET` | Signs Better Auth sessions/cookies |
| `DB_PASSWORD` | Postgres password (compose `db` service) |
| `SEED_ADMIN_*` | Auth-stage owner bootstrap (not the seed) |

Copy `.env.example` → `.env`. Never commit `.env`.

## UI shell (stage 3: Tron/JARVIS HUD)

### Theming contract (server-side cascade)
- `app/(app)/layout.tsx` awaits `requireOrg()`, then injects the business
  theme as CSS custom properties on the wrapper div:
  `--hud-accent` ← `organization.accent`, `--hud-primary` ←
  `organization.primaryColor`, fallback chain organization → `#35e7ff` /
  `#07111a`. Set via `style={{ "--hud-accent": … } as CSSProperties}`.
- Components reference the vars, never tenant values directly:
  `text-[var(--hud-accent)]`, `border-[var(--hud-accent)]`,
  `bg-[var(--hud-primary)]`, or `color-mix(in srgb, var(--hud-accent) …)`
  for translucent treatments. Per-client branding then applies at runtime
  with zero client JS.
- `:root` in `app/globals.css` carries the same fallback values.
- Tenant branding NEVER touches `(auth)` routes — login/reset stay neutral.

### Shell layout
- `app/(app)/layout.tsx` (route group is URL-transparent: `/dashboard` etc.
  keep working under middleware): resolves tenant + `isPlatformOwner`,
  fetches `logoUrl` (requireOrg's shape is frozen — tenant.ts is not
  extended), builds the nav, and renders `components/shell/app-shell.tsx`.
- `AppShell` (client): fixed top bar (hamburger on mobile, business logo or
  initials + name, `OrgSwitcher`, user name/email + role `Badge`,
  `SignOutButton`), grouped sidebar on desktop, slide-over drawer on mobile.
- Nav map (server-built, owner-gated):
  OVERVIEW: Dashboard · SELL: Contacts, Pipeline · ENGAGE: Campaigns ·
  SCHEDULE: Appointments (/schedule), Tasks (/tasks) · AUTOMATE: Automations
  · GROWTH: Sites & Funnels (/sites), Reputation (/reviews), Payments
  (/invoices), Social (/social) · SYSTEM (platform owner only): Integrations,
  Client Accounts (/accounts).
- Client sessions (non-platform-owners) never see: the System section
  (Client Accounts + Integrations) and the business switcher.
- `OrgSwitcher` lists businesses via `listBusinesses` and switches with the
  shared `setActiveOrg()`. Platform owners may step into ANY workspace:
  first entry auto-provisions an audit-logged `admin` membership
  (`user.added_to_org`, reason `platform_owner_workspace_entry`) so the
  tenant shell resolves; non-owners still require an existing membership.

### Component inventory (`components/ui/`, barrel `components/ui/index.ts`)
- `HudPanel({ title, subtitle?, actions?, children, className?, bodyClassName? })`
- `StatCard({ label, value, sub?, tone?: "accent"|"green"|"amber"|"red"|"violet" })`
- `DataTable<T>({ columns: DataTableColumn<T>[], rows, keyOf, emptyMessage? })`
  with `DataTableColumn<T> = { key, header, align?, render: (row: T) => ReactNode }`
- `Badge({ tone?: "accent"|"green"|"amber"|"red"|"violet"|"muted", children })`
- `EmptyState({ icon?, title, description?, action? })`
- `Field({ label, htmlFor?, hint?, error?, required?, children })`,
  `Input` / `Textarea` / `Select` (native props + dark HUD styling),
  `Button({ variant?: "primary"|"outline"|"danger"|"ghost", size?: "sm"|"md", …buttonProps })`
- `Modal({ open, onClose, title, children, wide? })` — Escape/backdrop close.
- Shell: `components/shell/app-shell.tsx` exports `AppShell` +
  `ShellNavSection` / `ShellNavItem` / `ShellBusinessOption` types;
  `org-switcher.tsx`, `sign-out-button.tsx` (audit-first, then
  `authClient.signOut()` → `/login`).
- Server components by default; `"use client"` only for interactivity
  (nav/drawer, switcher, modals, forms). `forms.tsx` is client so `Button`
  etc. accept `onClick` from client parents.
- `lib/format.ts`: `formatMoney`, `formatDate`, `formatDateTime`,
  `contactDisplayName`, `initials`.

### Module-page contract for later stages
- Every module page lives under `app/(app)/<route>/page.tsx` (server
  component, `export const dynamic = "force-dynamic"`), calls
  `requireOrg()` first, and scopes ALL Prisma queries with
  `businessId: organization.id`. New server actions go in `lib/actions/*.ts`
  and must reference `businessId` or carry `// tenant-gate: exempt — <reason>`.
- Style with the `components/ui` primitives above; use `var(--hud-accent)`
  for anything brand-colored so white-labeling holds. Tables scroll
  horizontally on mobile (`DataTable` handles it); stat grids use
  `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`.

### Accounts (platform-owner control center)
- `app/(app)/accounts/page.tsx` — `requirePlatformOwner()` (audited denial),
  business list via `listBusinessesWithCounts()` (new, in
  `lib/actions/accounts.ts`), "New business" modal → `createBusinessWithAdmin`
  (temp password never displayed back).
- `app/(app)/accounts/[id]/page.tsx` — theme editor (`updateOrganization`:
  name, logoUrl, website, industry, phone, primaryColor, accent, status;
  live preview; revalidates `/accounts` + detail) and user management
  (`listOrgUsers` + `createPortalUser` add-form, `setUserRole` inline,
  `deactivateUser` with confirm; last-owner protected by provisioning).
