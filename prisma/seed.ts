/**
 * Grand Prix CRM seed (stage 1).
 *
 * Parses the Patchogue Flooring B2B partner lead list markdown and loads it
 * into the database:
 *  - Organization "Patchogue Flooring"  <- 202 partner-lead Contacts
 *  - Organization "Grand Prix Dynamics" <- empty tenant shell
 *  - TOP 25 hot-list items -> Contact.priority/temperature + Opportunity each
 *
 * This seed creates NO users. Owner/user bootstrap (Better Auth, scrypt
 * password hashing) is handled by a separate bootstrap script in the auth
 * stage.
 *
 * Usage:
 *   npm run prisma:seed:dry   # parse only, print counts, no DB writes
 *   npm run prisma:seed        # write to DB (idempotent by org slug)
 *
 * Optional env:
 *   SEED_LEADS_PATH      override path to the leads markdown
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");

const LEADS_PATH =
  process.env.SEED_LEADS_PATH ??
  path.join(
    os.homedir(),
    "workspace/your_files/patchogue-flooring/patchogue-flooring-leads.md",
  );

const SEED_SOURCE = "seed:patchogue-flooring-leads 2026-09-28";

interface LeadRow {
  company: string;
  contact: string;
  phone: string;
  website: string;
  town: string;
  why: string;
  category: string;
}

// Short category label per numbered section of the leads doc.
function categoryForSection(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("property management")) return "Property Management";
  if (t.includes("real estate")) return "Real Estate";
  if (t.includes("contractor") || t.includes("remodel")) return "Contractor";
  if (t.includes("designer")) return "Designer";
  if (t.includes("short-term") || t.includes("rental manager")) return "STR Manager";
  return title.trim();
}

/** Markdown table cell cleanup: unescape \" and trim. */
function cleanCell(raw: string): string {
  return raw.replace(/\\"/g, '"').trim();
}

/** "—" (em dash) in the source means "unknown / could not verify". */
function cleanPhone(raw: string): string {
  const v = cleanCell(raw);
  return v === "—" || v === "-" ? "" : v;
}

function cleanWebsite(raw: string): string {
  const v = cleanCell(raw);
  return v === "—" || v === "-" ? "" : v;
}

const HEADER_FIRST_CELLS = new Set([
  "business",
  "team/agent",
  "studio/designer",
  "business/co-host",
]);

function isSeparatorRow(line: string): boolean {
  return /^\|\s*-+/.test(line);
}

function isTableLine(line: string): boolean {
  return line.startsWith("|");
}

function splitRow(line: string): string[] {
  // Drop the leading/trailing pipe, then split.
  const inner = line.replace(/^\||\|$/g, "");
  return inner.split("|").map(cleanCell);
}

function parseLeads(text: string): LeadRow[] {
  const rows: LeadRow[] = [];
  let currentCategory = "";

  for (const line of text.split("\n")) {
    const section = line.match(/^##\s+(\d+)\.\s*(.+?)\s*$/);
    if (section) {
      currentCategory = categoryForSection(section[2] ?? "");
      continue;
    }
    // Stop parsing lead tables once the hot list begins.
    if (/^##\s+🔥/.test(line)) break;
    if (!currentCategory) continue;
    if (!isTableLine(line) || isSeparatorRow(line)) continue;

    const cells = splitRow(line);
    if (cells.length < 6) continue;
    if (HEADER_FIRST_CELLS.has((cells[0] ?? "").toLowerCase())) continue;

    rows.push({
      company: cells[0] ?? "",
      contact: cells[1] ?? "",
      phone: cleanPhone(cells[2] ?? ""),
      website: cleanWebsite(cells[3] ?? ""),
      town: cells[4] ?? "",
      why: cells[5] ?? "",
      category: currentCategory,
    });
  }

  return rows;
}

interface HotItem {
  raw: string; // e.g. "Renaissance Management (Patchogue)"
  candidates: string[]; // progressively looser match strings
}

function parseHotList(text: string): HotItem[] {
  const items: HotItem[] = [];
  const hotSection = text.split(/^##\s+🔥/m)[1] ?? "";
  for (const line of hotSection.split("\n")) {
    // End of the hot list at the research-notes subsection.
    if (/^###\s+Research notes/.test(line)) break;
    const m = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
    if (!m || !m[1]) continue;
    const raw = m[1].trim();
    // Strip trailing "(Town)" parenthetical, then a trailing ", Person" suffix.
    const noTown = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const noPerson = noTown.split(",")[0]?.trim() ?? noTown;
    const candidates = [noTown];
    if (noPerson && noPerson !== noTown) candidates.push(noPerson);
    items.push({ raw, candidates });
  }
  return items;
}

/** Find the contact whose company best matches a hot-list item. */
function matchHotItem(item: HotItem, rows: LeadRow[]): LeadRow | null {
  for (const candidate of item.candidates) {
    const c = candidate.toLowerCase();
    const hits = rows.filter((r) => {
      const company = r.company.toLowerCase();
      return company.includes(c) || c.includes(company);
    });
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) {
      // Prefer the tightest match: shortest company name containing it.
      const sorted = [...hits].sort(
        (a, b) => a.company.length - b.company.length,
      );
      return sorted[0] ?? null;
    }
  }
  return null;
}

function printDryRun(rows: LeadRow[], hot: HotItem[]): void {
  const byCategory = new Map<string, number>();
  for (const r of rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);

  console.log(`[dry-run] Leads file: ${LEADS_PATH}`);
  console.log(`[dry-run] Sections parsed: ${byCategory.size}`);
  for (const [cat, n] of byCategory) console.log(`[dry-run]   ${cat}: ${n} contacts`);
  console.log(`[dry-run] Total contacts to create: ${rows.length}`);

  let matched = 0;
  const unmatched: string[] = [];
  const used = new Set<LeadRow>();
  for (const item of hot) {
    const hit = matchHotItem(item, rows.filter((r) => !used.has(r)));
    if (hit) {
      matched++;
      used.add(hit);
    } else {
      unmatched.push(item.raw);
    }
  }
  console.log(`[dry-run] Hot-list items: ${hot.length}`);
  console.log(`[dry-run] Hot-list matches -> priority contacts + opportunities: ${matched}`);
  for (const u of unmatched) {
    console.warn(`[dry-run] WARNING: hot-list item did not match any contact: "${u}"`);
  }

  console.log("[dry-run] Users: none created (owner bootstrap is auth-stage).");
  console.log("[dry-run] No database writes performed.");
}

async function runSeed(rows: LeadRow[], hot: HotItem[]): Promise<void> {
  const db = new PrismaClient();
  try {
    // Idempotency: skip entirely if either organization slug already exists.
    const existing = await db.organization.findFirst({
      where: { slug: { in: ["patchogue-flooring", "grand-prix-dynamics"] } },
      select: { slug: true },
    });
    if (existing) {
      console.log(
        `[seed] Organization slug "${existing.slug}" already exists — skipping (idempotent).`,
      );
      return;
    }

    const pf = await db.organization.create({
      data: {
        name: "Patchogue Flooring",
        slug: "patchogue-flooring",
        website: "https://patchogueflooring.com",
        industry: "Flooring & Tile",
      },
    });
    const gpd = await db.organization.create({
      data: {
        name: "Grand Prix Dynamics",
        slug: "grand-prix-dynamics",
        website: "https://grandprixdynamics.com",
        industry: "Technology & Consulting",
      },
    });
    console.log(`[seed] Created organizations: ${pf.slug}, ${gpd.slug}`);

    // Contacts for the Patchogue Flooring org.
    let contactCount = 0;
    const idByRow = new Map<LeadRow, string>();
    for (const r of rows) {
      const created = await db.contact.create({
        data: {
          businessId: pf.id,
          company: r.company,
          firstName: r.contact,
          phone: r.phone,
          website: r.website,
          town: r.town,
          category: r.category,
          temperature: "warm",
          priority: false,
          source: SEED_SOURCE,
          notes: r.why,
        },
        select: { id: true },
      });
      idByRow.set(r, created.id);
      contactCount++;
    }
    console.log(`[seed] Created ${contactCount} contacts for ${pf.slug}`);

    // Hot list -> priority + opportunities.
    let hotMatched = 0;
    const remaining = [...rows];
    for (const item of hot) {
      const hit = matchHotItem(item, remaining);
      if (!hit) {
        console.warn(`[seed] WARNING: hot-list item did not match any contact: "${item.raw}"`);
        continue;
      }
      const id = idByRow.get(hit);
      if (id === undefined) {
        console.warn(`[seed] WARNING: matched contact has no id: "${item.raw}"`);
        continue;
      }
      remaining.splice(remaining.indexOf(hit), 1);
      await db.contact.update({
        where: { id },
        data: { priority: true, temperature: "hot" },
      });
      await db.opportunity.create({
        data: {
          businessId: pf.id,
          contactId: id,
          title: `Partner outreach — ${hit.company}`,
          stage: "new",
          probability: 10,
          notes: "Priority partner from the TOP 25 hot list.",
        },
      });
      hotMatched++;
    }
    console.log(
      `[seed] Hot list: ${hotMatched}/${hot.length} matched -> priority contacts + opportunities`,
    );

    // NOTE (auth stage): the bootstrap script creates the owner via Better
    // Auth. This seed intentionally creates no users.
    console.log(
      "[seed] Done. No users created — owner bootstrap runs in the auth stage.",
    );
  } finally {
    await db.$disconnect();
  }
}

async function main(): Promise<void> {
  if (!fs.existsSync(LEADS_PATH)) {
    console.error(`[seed] Leads file not found: ${LEADS_PATH}`);
    console.error("[seed] Set SEED_LEADS_PATH to override.");
    process.exit(1);
  }
  const text = fs.readFileSync(LEADS_PATH, "utf8");
  const rows = parseLeads(text);
  const hot = parseHotList(text);

  if (rows.length === 0) {
    console.error("[seed] Parsed 0 lead rows — aborting.");
    process.exit(1);
  }

  if (DRY_RUN) {
    printDryRun(rows, hot);
    return;
  }
  await runSeed(rows, hot);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
