/**
 * Outreach script library for the Outreach Deck.
 *
 * These are Cj's real talk tracks (from the partner-lead pack): a 30-second
 * opener matched to the lead's category, a voicemail drop, a follow-up SMS,
 * and objection handlers. `[Name]` is replaced with the contact's first
 * name (or a fallback) at render time.
 */

export const SCRIPT_CATEGORIES = [
  "Property Mgmt",
  "GC/Remodeler",
  "Realtor/Investor",
  "Designer",
  "STR Manager",
] as const;

const OPENERS: Record<string, string> = {
  "Property Mgmt":
    `"Hi [Name], it's Cj with Patchogue Flooring — we're flooring installers right here in Patchogue. Quick question: who handles flooring on your unit turns?"\n\n[Listen. Then:]\n\n"We do hardwood, LVP and tile across Suffolk — every job laser-measured and moisture-tested, free estimates in 24 to 48 hours. Most managers use us to cut days off turn time between tenants. Worth a 10-minute walkthrough on your next turn?"`,

  "GC/Remodeler":
    `"Hi [Name], Cj from Patchogue Flooring in Patchogue. We sub flooring and tile for remodelers across Suffolk — hardwood, LVP, tile, laser-level and moisture-tested on every job. Do you have a go-to flooring sub right now, or is that a gap when jobs stack up?"`,

  "Realtor/Investor":
    `"Hi [Name], Cj with Patchogue Flooring in Patchogue. We do fast flooring refreshes for flips and listings across Suffolk — LVP and tile, free laser-measured estimates in 24–48 hours. When a deal needs floors before closing, we're the call. Who should I talk to about your next project?"`,

  Designer:
    `"Hi [Name], Cj with Patchogue Flooring in Patchogue. We install the floors designers spec across Suffolk and Nassau — hardwood, LVP and tile, laser-measured and moisture-tested on every job, free estimates in 24–48 hours. When your next reno needs an installer who protects the design intent, we're the call. Worth a quick intro?"`,

  "STR Manager":
    `"Hi [Name], Cj with Patchogue Flooring in Patchogue. We do fast flooring refreshes for short-term rentals across Long Island — durable LVP and tile that survives turnover, free estimates in 24–48 hours. Post-season is the perfect window. Worth a quick chat about your units?"`,
};

const GENERIC_OPENER =
  `"Hi [Name], it's Cj with Patchogue Flooring — flooring and tile installers right here in Patchogue. We do hardwood, LVP and tile across Long Island, every job laser-measured and moisture-tested, free estimates in 24 to 48 hours. Quick question: who handles flooring on your projects?"`;

const VOICEMAIL =
  `"Hi [Name], Cj with Patchogue Flooring, local installers in Patchogue. We help property managers and contractors with unit turns and sub flooring — free laser-measured estimates in 24 to 48 hours. My number is (631) 260-7480. I'll shoot you a quick email too. Thanks!"`;

const SMS_BODY =
  `Hi [Name], Cj from Patchogue Flooring (Patchogue) — just left a voicemail. We do flooring + tile across Suffolk, 24–48 hr free estimates. Worth a quick chat this week? — Cj`;

export const OBJECTION_HANDLERS: { title: string; script: string }[] = [
  {
    title: "\u201CWe already have someone\u201D",
    script: `"Totally get it — most of our best partners did too. Honestly we're usually the backup that becomes the primary when their guy is booked three weeks out, or a turn needs to happen in days not weeks. Can I earn a shot on just one unit?"`,
  },
  {
    title: "\u201CWhat do you charge?\u201D",
    script: `"Happy to — our 2026 installed ranges are right on patchogueflooring.com. But every job prices on accurate square footage and subfloor condition, so the free laser measurement is what makes the number real. Can I swing by for 20 minutes this week?"`,
  },
  {
    title: "\u201CJust send me info\u201D",
    script: `"Happy to — I'll text it right over after this call so you have my number. Real quick so I send the right thing: is it mostly unit turns, or full renos?"`,
  },
];

/** Fill [Name] with the contact's first name (or a neutral fallback). */
export function personalize(script: string, firstName: string): string {
  const name = firstName.trim() || "there";
  return script.replaceAll("[Name]", name);
}

export function openerForCategory(category: string, firstName: string): string {
  const key = Object.keys(OPENERS).find(
    (k) => k.toLowerCase() === category.trim().toLowerCase(),
  );
  return personalize(OPENERS[key ?? ""] ?? GENERIC_OPENER, firstName);
}

export function voicemailFor(firstName: string): string {
  return personalize(VOICEMAIL, firstName);
}

export function smsFor(firstName: string): string {
  return personalize(SMS_BODY, firstName);
}

/** sms: link with a prefilled body — works on iOS and Android. */
export function smsHref(phone: string, body: string): string {
  const digits = phone.replace(/\D/g, "");
  return `sms:${digits}?body=${encodeURIComponent(body)}`;
}

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `+1${digits}` : `+${digits}`;
  return `tel:${normalized}`;
}
