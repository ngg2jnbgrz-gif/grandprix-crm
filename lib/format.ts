/** Small presentation formatters shared by the (app) shell pages. */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number | null | undefined): string {
  return usd.format(typeof value === "number" && Number.isFinite(value) ? value : 0);
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: Date | string | null | undefined): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : "—";
}

export function formatDateTime(value: Date | string | null | undefined): string {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : "—";
}

export function contactDisplayName(
  c:
    | { firstName?: string | null; lastName?: string | null; company?: string | null }
    | null
    | undefined,
): string {
  if (!c) return "—";
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  if (name) return c.company ? `${name} · ${c.company}` : name;
  return c.company || "—";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
