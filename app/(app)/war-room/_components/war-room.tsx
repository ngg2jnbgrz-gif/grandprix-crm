"use client";

import { useMemo, useState } from "react";
import {
  HOT_LEADS,
  HOMEOWNERS,
  NEW_OWNERS,
  ZIP_STATS,
  WARM_ZIPS,
  type NewOwner,
} from "@/lib/war-room-data";
import { telHref } from "@/lib/outreach-scripts";

type Tab = "hot" | "new" | "homeowners" | "intel" | "play";
type Outcome = "called" | "no-answer" | "interested" | "not-interested";

const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: "called", label: "Called" },
  { key: "no-answer", label: "No answer" },
  { key: "interested", label: "Interested" },
  { key: "not-interested", label: "Not interested" },
];

const STORE_KEY = "pf-war-room-outcomes-v1";

function loadOutcomes(): Record<string, { outcome: Outcome; at: string }> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, { outcome: Outcome; at: string }>) : {};
  } catch {
    return {};
  }
}

function fmtMoney(n: number): string {
  if (!n) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

function isStandout(r: NewOwner): boolean {
  if (r.score >= 75) return true;
  if (r.yearBuilt > 0 && r.yearBuilt <= 1850) return true;
  if (r.source === "fixer_watchlist" && r.yearBuilt > 0 && r.yearBuilt <= 1923 && r.score >= 69)
    return true;
  return false;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color, boxShadow: `0 0 8px ${color}` }}
      />
    </div>
  );
}

export function WarRoom() {
  const [tab, setTab] = useState<Tab>("hot");
  const [outcomes, setOutcomes] = useState<Record<string, { outcome: Outcome; at: string }>>(() =>
    typeof window === "undefined" ? {} : loadOutcomes(),
  );

  // NEW OWNERS state
  const [noFilter, setNoFilter] = useState<"all" | "recent_sold" | "fixer_watchlist">("all");
  const [noSort, setNoSort] = useState<"score" | "price" | "year">("score");

  // HOMEOWNERS state
  const [q, setQ] = useState("");
  const [occ, setOcc] = useState<"all" | "oo" | "abs">("all");
  const [valDir, setValDir] = useState<"desc" | "asc">("desc");

  const contacted = Object.keys(outcomes).length;
  const hotProgress = Math.round((contacted / HOT_LEADS.length) * 100);

  function logOutcome(idx: number, outcome: Outcome) {
    setOutcomes((prev) => {
      const next = { ...prev, [idx]: { outcome, at: new Date().toISOString() } };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — state still updates in memory */
      }
      return next;
    });
  }

  const newOwners = useMemo(() => {
    let rows = NEW_OWNERS.filter((r) => (noFilter === "all" ? true : r.source === noFilter));
    rows = [...rows].sort((a, b) => {
      if (noSort === "price") return b.price - a.price;
      if (noSort === "year") return (a.yearBuilt || 9999) - (b.yearBuilt || 9999);
      return b.score - a.score;
    });
    return rows;
  }, [noFilter, noSort]);

  const homeowners = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = HOMEOWNERS.filter((h) => {
      if (occ === "oo" && !h.ownerOccupied) return false;
      if (occ === "abs" && h.ownerOccupied) return false;
      if (!needle) return true;
      return (
        h.ownerName.toLowerCase().includes(needle) ||
        h.address.toLowerCase().includes(needle) ||
        h.zip.includes(needle) ||
        h.town.toLowerCase().includes(needle)
      );
    });
    rows = [...rows].sort((a, b) =>
      valDir === "desc" ? b.marketValue - a.marketValue : a.marketValue - b.marketValue,
    );
    return rows;
  }, [q, occ, valDir]);

  const ooCount = HOMEOWNERS.filter((h) => h.ownerOccupied).length;
  const tabs: { key: Tab; label: string; count: string }[] = [
    { key: "hot", label: "HOT", count: "10" },
    { key: "new", label: "NEW OWNERS", count: String(NEW_OWNERS.length) },
    { key: "homeowners", label: "HOMEOWNERS", count: String(HOMEOWNERS.length) },
    { key: "intel", label: "INTEL", count: "7" },
    { key: "play", label: "PLAY", count: "" },
  ];

  return (
    <div className="war-room -m-4 p-4 sm:-m-6 sm:p-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-5 flex items-start gap-4">
        {/* radar sweep */}
        <div className="relative hidden h-20 w-20 shrink-0 sm:block" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-[rgba(0,229,255,0.25)]" />
          <div className="absolute inset-[30%] rounded-full border border-[rgba(0,229,255,0.2)]" />
          <div
            className="wr-sweep absolute inset-0 rounded-full"
            style={{ background: "conic-gradient(from 0deg, rgba(0,229,255,0.5), transparent 25%)" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-lg font-bold tabular-nums text-[#00e5ff] wr-glow-text">
              {HOT_LEADS.length - contacted}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#00e5ff]">
            Osiris command interface
          </p>
          <h1 className="wr-glow-text mt-1 font-mono text-3xl font-black tracking-tight text-[#00e5ff] sm:text-4xl">
            WAR ROOM
          </h1>
          <p className="mt-1 font-mono text-xs text-[#5f7a8c]">
            PATCHOGUE FLOORING · LEAD CAMPAIGN · 2026-10-14 ·{" "}
            <span className="wr-blink inline-block h-2 w-2 rounded-full bg-[#00e5ff]" /> LIVE
          </p>
        </div>
      </div>

      {/* stat strip */}
      <div className="mb-5 grid grid-cols-4 gap-2">
        {[
          { n: "10", l: "HOT TARGETS", c: "#ffb300" },
          { n: String(NEW_OWNERS.length), l: "NEW OWNERS", c: "#00e5ff" },
          { n: String(HOMEOWNERS.length), l: "HOMEOWNERS", c: "#00e5ff" },
          { n: "7", l: "ZIP ZONES", c: "#00e5ff" },
        ].map((s) => (
          <div key={s.l} className="wr-panel px-3 py-2.5 text-center">
            <p className="font-mono text-xl font-bold tabular-nums" style={{ color: s.c, textShadow: `0 0 10px ${s.c}66` }}>
              {s.n}
            </p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[#5f7a8c]">{s.l}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-[rgba(0,229,255,0.14)]" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-4 py-2.5 font-mono text-sm font-semibold tracking-wide transition ${
              tab === t.key
                ? "border-b-2 border-[#00e5ff] text-[#00e5ff] wr-glow-text"
                : "text-[#5f7a8c] hover:text-[#d9f6ff]"
            }`}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 text-xs opacity-70">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {/* ── HOT ────────────────────────────────────────────── */}
      {tab === "hot" && (
        <div className="space-y-4">
          <div className="wr-panel px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffb300]">
                Priority strike queue
              </p>
              <p className="font-mono text-sm tabular-nums text-[#d9f6ff]">
                {contacted}/{HOT_LEADS.length} contacted · {hotProgress}%
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${hotProgress}%`, background: "#ffb300", boxShadow: "0 0 12px #ffb300" }}
              />
            </div>
          </div>

          {HOT_LEADS.map((lead, i) => {
            const logged = outcomes[i];
            return (
              <div key={i} className="wr-panel wr-panel-amber p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[#5f7a8c]">#{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-lg font-bold text-[#d9f6ff]">{lead.business}</h3>
                  <span className="wr-pulse rounded-sm bg-[#ffb300] px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.15em] text-black">
                    HOT
                  </span>
                  {logged ? (
                    <span className="rounded-sm border border-[#00e5ff]/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#00e5ff]">
                      {OUTCOMES.find((o) => o.key === logged.outcome)?.label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-xs text-[#5f7a8c]">
                  {lead.contact || "Main line"}
                  {lead.base ? ` · ${lead.base}` : ""}
                </p>
                <p className="mt-2 border-l-2 border-[#ffb300]/60 pl-3 text-sm leading-relaxed text-[#d9f6ff]/90">
                  {lead.whyNow}
                </p>
                <div className="mt-3 rounded-sm bg-black/30 p-3">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#00e5ff]">Opener</p>
                  <p className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[#d9f6ff]">
                    “{lead.opener}”
                  </p>
                </div>
                <a
                  href={telHref(lead.phone)}
                  className="mt-3 flex items-center justify-center gap-2 rounded-sm bg-[#ffb300] px-4 py-4 text-lg font-black tracking-wide text-black transition-transform active:scale-95"
                  style={{ boxShadow: "0 0 24px rgba(255,179,0,0.35)" }}
                >
                  <PhoneIcon /> CALL {lead.phone}
                </a>
                <div className="mt-2">
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5f7a8c]">
                    Log outcome
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {OUTCOMES.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => logOutcome(i, o.key)}
                        className={`rounded-sm px-2 py-2 font-mono text-xs font-semibold transition-transform active:scale-95 ${
                          logged?.outcome === o.key
                            ? "bg-[#00e5ff] text-black"
                            : "border border-[rgba(0,229,255,0.25)] text-[#00e5ff] hover:bg-[rgba(0,229,255,0.08)]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── NEW OWNERS ─────────────────────────────────────── */}
      {tab === "new" && (
        <div className="space-y-4">
          <div className="wr-panel p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00e5ff]">
              Fresh targets · scored
            </p>
            <p className="mt-1 text-sm text-[#5f7a8c]">
              Homes sold in the last 90 days (new owners renovate) + active fixer listings
              (investor watchlist). Scores from age, tenure, investor signals.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(
                [
                  ["all", `All (${NEW_OWNERS.length})`],
                  ["recent_sold", `Recent solds (${NEW_OWNERS.filter((r) => r.source === "recent_sold").length})`],
                  ["fixer_watchlist", `Fixer watchlist (${NEW_OWNERS.filter((r) => r.source === "fixer_watchlist").length})`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setNoFilter(k)}
                  className={`rounded-sm px-3 py-1.5 font-mono text-xs font-semibold ${
                    noFilter === k
                      ? "bg-[#00e5ff] text-black"
                      : "border border-[rgba(0,229,255,0.25)] text-[#00e5ff]"
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <label htmlFor="no-sort" className="font-mono text-xs text-[#5f7a8c]">Sort</label>
                <select
                  id="no-sort"
                  value={noSort}
                  onChange={(e) => setNoSort(e.target.value as typeof noSort)}
                  className="rounded-sm border border-[rgba(0,229,255,0.25)] bg-black/40 px-2 py-1.5 font-mono text-xs text-[#d9f6ff]"
                >
                  <option value="score">Score</option>
                  <option value="price">Price</option>
                  <option value="year">Year built (oldest)</option>
                </select>
              </div>
            </div>
          </div>

          {newOwners.map((r, i) => {
            const standout = isStandout(r);
            return (
              <div key={`${r.url}-${i}`} className={`wr-panel p-4 ${standout ? "wr-panel-amber" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[#d9f6ff]">
                    {r.address}, {r.city} {r.zip}
                  </h3>
                  {standout ? (
                    <span className="wr-pulse rounded-sm bg-[#ffb300] px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.15em] text-black">
                      Standout
                    </span>
                  ) : null}
                  <span
                    className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                      r.source === "fixer_watchlist"
                        ? "border border-[#ffb300]/50 text-[#ffb300]"
                        : "border border-[#00e5ff]/40 text-[#00e5ff]"
                    }`}
                  >
                    {r.source === "fixer_watchlist" ? "Fixer" : "Sold"}
                  </span>
                  <span className="ml-auto font-mono text-sm font-bold tabular-nums text-[#00e5ff]">
                    {r.score} pts
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-[#5f7a8c]">
                  <span>Built <b className="text-[#d9f6ff]">{r.yearBuilt || "—"}</b></span>
                  <span>Price <b className="text-[#d9f6ff]">{fmtMoney(r.price)}</b></span>
                  {r.beds ? <span>{r.beds} bd</span> : null}
                  {r.baths ? <span>{r.baths} ba</span> : null}
                  {r.sqft ? <span>{r.sqft.toLocaleString()} sqft</span> : null}
                  <span>{r.source === "fixer_watchlist" ? "Listed" : "Sold"} {r.eventDate ? r.eventDate.slice(0, 10) : "—"}</span>
                </div>
                {r.fixerMatch ? (
                  <p className="mt-1 font-mono text-xs text-[#ffb300]">Flag: {r.fixerMatch}</p>
                ) : null}
                <p className="mt-2 text-sm text-[#d9f6ff]/85">{r.play}</p>
                <p className="mt-1 font-mono text-[11px] text-[#5f7a8c]">{r.scoreReason}</p>
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-mono text-xs text-[#00e5ff] underline decoration-[rgba(0,229,255,0.4)] underline-offset-2"
                  >
                    View listing →
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* ── HOMEOWNERS ─────────────────────────────────────── */}
      {tab === "homeowners" && (
        <div className="space-y-4">
          <div className="wr-panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, street, town, ZIP…"
                className="min-w-0 flex-1 rounded-sm border border-[rgba(0,229,255,0.25)] bg-black/40 px-3 py-2.5 font-mono text-sm text-[#d9f6ff] placeholder:text-[#5f7a8c]/70"
              />
              <select
                value={valDir}
                onChange={(e) => setValDir(e.target.value as "desc" | "asc")}
                className="rounded-sm border border-[rgba(0,229,255,0.25)] bg-black/40 px-2 py-2.5 font-mono text-xs text-[#d9f6ff]"
                aria-label="Sort by market value"
              >
                <option value="desc">Value ↓</option>
                <option value="asc">Value ↑</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["all", `All (${HOMEOWNERS.length})`],
                  ["oo", `Owner-occupied (${ooCount})`],
                  ["abs", `Absentee (${HOMEOWNERS.length - ooCount})`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setOcc(k)}
                  className={`rounded-sm px-3 py-1.5 font-mono text-xs font-semibold ${
                    occ === k
                      ? "bg-[#00e5ff] text-black"
                      : "border border-[rgba(0,229,255,0.25)] text-[#00e5ff]"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="ml-auto self-center font-mono text-xs tabular-nums text-[#5f7a8c]">
                {homeowners.length} of {HOMEOWNERS.length} shown
              </span>
            </div>
          </div>

          <div className="wr-panel divide-y divide-[rgba(0,229,255,0.08)]">
            {homeowners.map((h, i) => {
              const warm = h.ownerOccupied && WARM_ZIPS.includes(h.zip);
              return (
                <div key={`${h.address}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#d9f6ff]">
                      {h.address} <span className="text-[#5f7a8c]">· {h.town} {h.zip}</span>
                    </p>
                    <p className="truncate font-mono text-xs text-[#5f7a8c]">
                      {h.ownerName} · class {h.cls}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
                      warm ? "bg-[#ffb300]/15 text-[#ffb300]" : "bg-white/5 text-[#5f7a8c]"
                    }`}
                  >
                    {warm ? "Warm" : "Cold"}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[#00e5ff]">
                    {fmtMoney(h.marketValue)}
                  </span>
                </div>
              );
            })}
            {homeowners.length === 0 ? (
              <p className="px-4 py-8 text-center font-mono text-sm text-[#5f7a8c]">
                No matches in this sector.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* ── INTEL ──────────────────────────────────────────── */}
      {tab === "intel" && (
        <div className="space-y-4">
          <div className="wr-panel p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00e5ff]">
              Zone intel · ACS 2024 5-year
            </p>
            <p className="mt-1 text-sm text-[#5f7a8c]">
              Seven ZIP zones ranked oldest first. Older stock + affluent owners =
              flooring demand.
            </p>
          </div>
          {ZIP_STATS.map((z, i) => (
            <div key={z.zip} className="wr-panel p-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#5f7a8c]">#{i + 1}</span>
                <h3 className="font-mono text-lg font-bold text-[#00e5ff] wr-glow-text">{z.zip}</h3>
                <p className="text-sm text-[#5f7a8c]">{z.towns}</p>
                {i < 3 ? (
                  <span className="ml-auto rounded-sm bg-[#ffb300]/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#ffb300]">
                    Wave 1
                  </span>
                ) : (
                  <span className="ml-auto rounded-sm bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5f7a8c]">
                    Wave 2
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
                {[
                  { l: `Median built ${z.medianYrBuilt}`, pct: ((1977 - z.medianYrBuilt) / 11) * 100 },
                  { l: `Income $${z.medianIncome.toLocaleString()}`, pct: (z.medianIncome / 147672) * 100 },
                  { l: `Home value $${z.homeValue.toLocaleString()}`, pct: (z.homeValue / 658700) * 100 },
                  { l: `Owner-occ ${z.ownerOccPct}%`, pct: (z.ownerOccPct / 88.5) * 100 },
                  { l: `25+ yr tenure ${z.tenurePct}%`, pct: (z.tenurePct / 50.7) * 100 },
                ].map((m) => (
                  <div key={m.l}>
                    <p className="mb-1 font-mono text-[11px] tabular-nums text-[#d9f6ff]/80">{m.l}</p>
                    <Bar pct={m.pct} color={i < 3 ? "#ffb300" : "#00e5ff"} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PLAY ───────────────────────────────────────────── */}
      {tab === "play" && (
        <div className="space-y-4">
          <div className="wr-panel p-4 sm:p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00e5ff]">
              Campaign playbook
            </p>
            <ol className="mt-3 space-y-3">
              {[
                {
                  t: "1 · EDDM postcards",
                  d: "USPS Every Door Direct Mail to carrier routes in 11719 (Bayport), 11782 mainland Sayville, 11772 (Patchogue/E. Patchogue). No mailing list needed — every mailbox on the route. Check current per-piece rates on usps.com before printing.",
                },
                {
                  t: "2 · Meta ZIP geo-fence",
                  d: "When the Facebook campaigns go live, geo-fence ad sets to 11782, 11719, 11772 first — homeowners in 50+ year-old houses. Add 11779 (Ronkonkoma) as wave two once the first three deliver.",
                },
                {
                  t: "3 · Door hangers",
                  d: "Sayville village streets, Bayport residential blocks, Patchogue village / E. Patchogue dense owner-occupancy. Skip Fire Island (seasonal second homes). Weekday late afternoons + Saturday mornings.",
                },
              ].map((s) => (
                <li key={s.t} className="border-l-2 border-[#00e5ff]/50 pl-3">
                  <p className="font-mono text-sm font-bold text-[#00e5ff]">{s.t}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#d9f6ff]/85">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="wr-panel p-4 sm:p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffb300]">
              Postcard copy — ready to print
            </p>
            <p className="mt-3 whitespace-pre-wrap border border-[rgba(255,179,0,0.25)] bg-black/30 p-4 font-mono text-[13px] leading-relaxed text-[#d9f6ff]">
              If your home was built before 1970, your floors have 50 years of stories in them — and probably 50 years of wear. Patchogue Flooring rips out the tired stuff and installs hardwood, luxury vinyl plank, tile, or laminate that makes the whole house feel like a palace. Free, no-pressure estimates in Bayport, Sayville, Patchogue and across Suffolk. Call or text (631)-260-7480.
            </p>
          </div>

          <div className="wr-panel p-4 sm:p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00e5ff]">
              Channel status
            </p>
            <ul className="mt-3 space-y-2 font-mono text-[13px]">
              {[
                ["GO", "Thumbtack Pro — pay-per-quote, profile live in ~30 min", "#00e5ff"],
                ["GO", "Nextdoor Business — free; answer the verification call", "#00e5ff"],
                ["WAIT", "Google LSA — needs verified GBP first (GBP exists, verify/claim it)", "#ffb300"],
                ["WAIT", "FB page — blocked on Meta professional consent; 3 launch posts ready", "#ffb300"],
                ["WAIT", "2 Meta ad campaigns drafted — awaiting budget confirmation", "#ffb300"],
                ["HOLD", "Angi — 12-mo lock-in, shared leads; not for the jobs-now push", "#5f7a8c"],
              ].map(([s, d, c]) => (
                <li key={d} className="flex gap-3">
                  <span className="shrink-0 font-bold" style={{ color: c as string }}>[{s}]</span>
                  <span className="text-[#d9f6ff]/85">{d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="wr-panel p-4 sm:p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00e5ff]">
              Rules of engagement
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#d9f6ff]/85">
              <li>No cold calling, no phone skip-tracing — mail, ads, door hangers only.</li>
              <li>Don&apos;t mail absentee rows — LLCs and out-of-area owners burn postage.</li>
              <li>Don&apos;t blast all seven ZIPs equally — waves, not spray.</li>
              <li>Three touches minimum per neighborhood: postcard → hanger/ad → postcard.</li>
              <li>Real before/after photos only — one local job beats ten stock fakes.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
