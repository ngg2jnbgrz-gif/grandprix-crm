#!/usr/bin/env python3
"""Generate lib/war-room-data.ts from the Patchogue Flooring lead CSVs.

Reads:
  ~/workspace/patchogue-flooring-marketing/homeowner-prospects/prospects.csv
  ~/workspace/patchogue-flooring-marketing/homeowner-prospects/master-prospect-list.csv
Embeds HOT_LEADS (verified 2026-10-14 call queue) and ZIP_STATS (ACS 2024)
as literals. Run: python3 scripts/gen-war-room-data.py
"""
import csv
import json
import os

HOME = os.path.expanduser("~")
SRC = os.path.join(HOME, "workspace/patchogue-flooring-marketing/homeowner-prospects")
OUT = os.path.join(HOME, "workspace/grandprix-crm/lib/war-room-data.ts")


def ts_str(s):
    return json.dumps("" if s is None else str(s), ensure_ascii=False)


def num(s, default=0):
    try:
        if s is None or str(s).strip() == "":
            return default
        f = float(str(s).strip())
        return int(f) if f.is_integer() else f
    except (ValueError, TypeError):
        return default


HOT_LEADS = [
    {
        "business": "Renaissance Management",
        "contact": "Joseph Kazarnovsky",
        "phone": "631-289-4400",
        "base": "200 La Bonne Vie Dr, East Patchogue",
        "whyNow": 'JUST bought the 915-unit La Bonne Vie in Patchogue for $232.5M and publicly plans to "invest substantially to revamp" units untouched since the 70s/80s. Hundreds of unit turns coming.',
        "opener": "Joe, I'm a flooring installer based in Patchogue, two minutes from La Bonne Vie \u2014 I can turn units fast at per-unit pricing while you revamp the property.",
    },
    {
        "business": "Fairfield Properties",
        "contact": "Gary & Michael Broxmeyer",
        "phone": "631-499-6660",
        "base": "538 Broadhollow Rd, Melville",
        "whyNow": "Long Island's largest multifamily owner \u2014 225+ communities, 15,000+ units across Nassau/Suffolk, continuous value-add upgrades across the portfolio.",
        "opener": "I'm a local flooring installer who can keep your unit turns moving across Suffolk \u2014 fast per-unit pricing, Patchogue-based.",
    },
    {
        "business": "Heatherwood Communities",
        "contact": "Michael Spampinato",
        "phone": "631-234-1600",
        "base": "58 Vanderbilt Motor Pkwy, Smithtown",
        "whyNow": "14,000+ units built over 60+ years, communities in Patchogue and Holbrook, active leasing across multiple sites right now.",
        "opener": "Heatherwood's always turning units \u2014 I'm a Patchogue flooring installer, happy to quote per-unit turn pricing on any community.",
    },
    {
        "business": "TRITEC Real Estate",
        "contact": "Bob Taliana, Dir. of Property Mgmt",
        "phone": "631-751-0300",
        "base": "Ronkonkoma",
        "whyNow": "JUST launched the $175M Phase 2C at Station Yards (285 apartments, construction starting this autumn) on top of the 388-unit Core delivered in 2024. Active build pipeline.",
        "opener": "Bob, with Phase 2C breaking ground at Station Yards I wanted to get on your flooring sub list \u2014 local installer, licensed, fast turns.",
    },
    {
        "business": "JMD Einsidler Management",
        "contact": "",
        "phone": "631-752-1414",
        "base": "535 Broadhollow Rd, Melville",
        "whyNow": "1,100+ HUD/LIHTC senior units across Suffolk, fully occupied with waiting lists = constant turnover plus federally funded rehab cycles.",
        "opener": "You run over a thousand Suffolk units \u2014 I'm a local flooring installer and I'd like to be your per-unit turn guy on rehabs.",
    },
    {
        "business": "Kaled Management Corp.",
        "contact": "Edward Kalikow",
        "phone": "516-876-4800",
        "base": "7001 Brush Hollow Rd, Westbury",
        "whyNow": "7,000+ residential units across NYC/Nassau/Suffolk, family-owned since the 1920s, active acquisitions and refis in 2025.",
        "opener": "Kaled runs seven thousand units \u2014 I'm a Long Island flooring installer looking to earn a spot on your vendor list for unit turns.",
    },
    {
        "business": "D&F Development Group",
        "contact": "Peter Florey (Principal)",
        "phone": "516-437-0900",
        "base": "100 Schoolhouse Rd, Levittown",
        "whyNow": "145 homes delivered Sept 2026, 96-unit Bellport pipeline, 71-unit Farmingdale project underway \u2014 freshest turnover signal on Long Island.",
        "opener": "Peter, with Bellport and Farmingdale in the pipeline I wanted to introduce Patchogue Flooring \u2014 flooring and tile, ready when your turns start.",
    },
    {
        "business": "Keyrenter Eastern Long Island",
        "contact": "",
        "phone": "631-317-1110",
        "base": "475 E Main St #212, Patchogue",
        "whyNow": "Local investor-rental manager with a dedicated vendor contact channel and a 30-day leasing guarantee = high turnover pace, right in Patchogue.",
        "opener": "I'm a flooring installer right here in Patchogue \u2014 I'd like to be the vendor you call when a rental needs floors between tenants.",
    },
    {
        "business": "Concern Housing",
        "contact": "",
        "phone": "631-758-0474",
        "base": "312 Expressway Dr S, Medford",
        "whyNow": "250+ locations housing 1,500+ people, just awarded $14.9M in state funds for an 88-unit Brentwood rehab \u2014 highest turnover velocity per door.",
        "opener": "With the Brentwood rehab funded and 250 locations turning over, I'd like to quote your flooring work \u2014 local installer, per-unit pricing.",
    },
    {
        "business": "Greenview Properties",
        "contact": "",
        "phone": "631-666-4040",
        "base": "Bay Shore",
        "whyNow": '30+ rental communities across Suffolk, 20+ years in business, currently "Now Leasing" on new Bay Shore builds (Mill House, One East Main) = fresh flooring demand.',
        "opener": "Greenview's leasing new communities in Bay Shore \u2014 I'm a Patchogue flooring installer, fast turns, happy to quote the next building.",
    },
]

ZIP_STATS = [
    {"zip": "11782", "towns": "Sayville", "medianYrBuilt": 1966, "medianIncome": 147672, "homeValue": 637300, "ownerOccPct": 77.1, "tenurePct": 50.7},
    {"zip": "11719", "towns": "Bayport", "medianYrBuilt": 1969, "medianIncome": 126250, "homeValue": 658700, "ownerOccPct": 86.0, "tenurePct": 46.6},
    {"zip": "11772", "towns": "Patchogue / E. Patchogue", "medianYrBuilt": 1969, "medianIncome": 105245, "homeValue": 474800, "ownerOccPct": 68.9, "tenurePct": 37.7},
    {"zip": "11779", "towns": "Ronkonkoma", "medianYrBuilt": 1971, "medianIncome": 112180, "homeValue": 487300, "ownerOccPct": 75.7, "tenurePct": 39.4},
    {"zip": "11713", "towns": "Bellport", "medianYrBuilt": 1975, "medianIncome": 108173, "homeValue": 482800, "ownerOccPct": 69.1, "tenurePct": 33.5},
    {"zip": "11741", "towns": "Holbrook", "medianYrBuilt": 1975, "medianIncome": 144346, "homeValue": 536900, "ownerOccPct": 79.6, "tenurePct": 43.0},
    {"zip": "11763", "towns": "Medford", "medianYrBuilt": 1976, "medianIncome": 120783, "homeValue": 464600, "ownerOccPct": 88.5, "tenurePct": 30.4},
]


def main():
    # --- HOMEOWNERS from prospects.csv ---
    homeowners = []
    with open(os.path.join(SRC, "prospects.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            homeowners.append({
                "address": row["address"].strip(),
                "town": row["town"].strip(),
                "zip": row["zip"].strip(),
                "cls": row["class"].strip(),
                "ownerName": row["owner_name"].strip(),
                "ownerOccupied": row["owner_occupied"].strip().upper() == "Y",
                "marketValue": num(row["market_value"]),
            })

    # --- NEW OWNERS from master-prospect-list.csv (already scored) ---
    new_owners = []
    with open(os.path.join(SRC, "master-prospect-list.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            baths_full = num(row.get("baths") or 0)
            new_owners.append({
                "source": row["source"].strip(),
                "address": row["address"].strip(),
                "city": row["city"].strip(),
                "zip": row["zip"].strip(),
                "yearBuilt": num(row.get("year_built")),
                "price": num(row.get("price")),
                "beds": num(row.get("beds")),
                "baths": baths_full,
                "sqft": num(row.get("sqft")),
                "daysOnMls": num(row.get("days_on_mls")),
                "eventDate": (row.get("event_date") or "").strip(),
                "fixerMatch": (row.get("fixer_match") or "").strip(),
                "play": (row.get("play") or "").strip(),
                "score": num(row.get("score")),
                "scoreReason": (row.get("score_reason") or "").strip(),
                "url": (row.get("property_url") or "").strip(),
            })
    # highest score first
    new_owners.sort(key=lambda r: r["score"], reverse=True)

    lines = []
    lines.append("/**")
    lines.append(" * War Room data for the Patchogue Flooring lead campaign.")
    lines.append(" * GENERATED by scripts/gen-war-room-data.py \u2014 do not hand-edit.")
    lines.append(" * Sources: lead-queue-2026-10-14.md (HOT_LEADS, verified 2026-10-14),")
    lines.append(" * homeowner-prospects/prospects.csv (HOMEOWNERS),")
    lines.append(" * homeowner-prospects/master-prospect-list.csv (NEW_OWNERS, scored),")
    lines.append(" * homeowner-prospects/zcta-enrichment.md (ZIP_STATS, ACS 2024 5-yr).")
    lines.append(" */")
    lines.append("")
    lines.append("export type HotLead = {")
    lines.append("  business: string; contact: string; phone: string;")
    lines.append("  base: string; whyNow: string; opener: string;")
    lines.append("};")
    lines.append("")
    lines.append("export const HOT_LEADS: HotLead[] = [")
    for h in HOT_LEADS:
        lines.append("  {")
        for k in ("business", "contact", "phone", "base", "whyNow", "opener"):
            lines.append(f"    {k}: {ts_str(h[k])},")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("export type Homeowner = {")
    lines.append("  address: string; town: string; zip: string; cls: string;")
    lines.append("  ownerName: string; ownerOccupied: boolean; marketValue: number;")
    lines.append("};")
    lines.append("")
    lines.append(f"export const HOMEOWNERS: Homeowner[] = [ // {len(homeowners)} rows")
    for r in homeowners:
        oo = "true" if r["ownerOccupied"] else "false"
        lines.append(
            f"  {{ address: {ts_str(r['address'])}, town: {ts_str(r['town'])}, "
            f"zip: {ts_str(r['zip'])}, cls: {ts_str(r['cls'])}, "
            f"ownerName: {ts_str(r['ownerName'])}, ownerOccupied: {oo}, "
            f"marketValue: {r['marketValue']} }},"
        )
    lines.append("];")
    lines.append("")
    lines.append("export type NewOwner = {")
    lines.append("  source: string; address: string; city: string; zip: string;")
    lines.append("  yearBuilt: number; price: number; beds: number; baths: number;")
    lines.append("  sqft: number; daysOnMls: number; eventDate: string;")
    lines.append("  fixerMatch: string; play: string; score: number;")
    lines.append("  scoreReason: string; url: string;")
    lines.append("};")
    lines.append("")
    lines.append(f"export const NEW_OWNERS: NewOwner[] = [ // {len(new_owners)} rows, score desc")
    for r in new_owners:
        lines.append("  {")
        lines.append(f"    source: {ts_str(r['source'])},")
        lines.append(f"    address: {ts_str(r['address'])},")
        lines.append(f"    city: {ts_str(r['city'])},")
        lines.append(f"    zip: {ts_str(r['zip'])},")
        lines.append(f"    yearBuilt: {r['yearBuilt']},")
        lines.append(f"    price: {r['price']},")
        lines.append(f"    beds: {r['beds']},")
        lines.append(f"    baths: {r['baths']},")
        lines.append(f"    sqft: {r['sqft']},")
        lines.append(f"    daysOnMls: {r['daysOnMls']},")
        lines.append(f"    eventDate: {ts_str(r['eventDate'])},")
        lines.append(f"    fixerMatch: {ts_str(r['fixerMatch'])},")
        lines.append(f"    play: {ts_str(r['play'])},")
        lines.append(f"    score: {r['score']},")
        lines.append(f"    scoreReason: {ts_str(r['scoreReason'])},")
        lines.append(f"    url: {ts_str(r['url'])},")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("export type ZipStat = {")
    lines.append("  zip: string; towns: string; medianYrBuilt: number;")
    lines.append("  medianIncome: number; homeValue: number;")
    lines.append("  ownerOccPct: number; tenurePct: number;")
    lines.append("};")
    lines.append("")
    lines.append("export const ZIP_STATS: ZipStat[] = [")
    for z in ZIP_STATS:
        lines.append("  {")
        lines.append(f"    zip: {ts_str(z['zip'])},")
        lines.append(f"    towns: {ts_str(z['towns'])},")
        lines.append(f"    medianYrBuilt: {z['medianYrBuilt']},")
        lines.append(f"    medianIncome: {z['medianIncome']},")
        lines.append(f"    homeValue: {z['homeValue']},")
        lines.append(f"    ownerOccPct: {z['ownerOccPct']},")
        lines.append(f"    tenurePct: {z['tenurePct']},")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("/** WARM tier: owner-occupied homeowners in the three oldest ZIPs. */")
    lines.append('export const WARM_ZIPS = ["11719", "11782", "11772"];')
    lines.append("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Wrote {OUT}: {len(homeowners)} homeowners, {len(new_owners)} new owners")


if __name__ == "__main__":
    main()
