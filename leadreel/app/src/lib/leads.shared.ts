/**
 * Types and pure helpers shared by the browser and the server. Nothing in
 * here may import a `*.server.ts` module or touch browser globals.
 */

export const LEAD_STATUSES = ["new", "contacted", "replied", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  won: "Won",
  lost: "Lost",
};

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

/** One business lead — a fresh search result (`saved: false`) or a saved row. */
export interface LeadDto {
  /** Saved row id (uuid) — or the `sourceId` while the lead is only a search result. */
  id: string;
  /** Stable identity of the underlying place, e.g. `osm:node/123`. */
  sourceId: string;
  saved: boolean;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  lat: number | null;
  lon: number | null;
  status: LeadStatus;
  notes: string;
  /** Number of Kling pitch videos generated for this lead. */
  pitchCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** The fields the browser sends when saving a search result. */
export type LeadInput = Pick<
  LeadDto,
  "sourceId" | "name" | "category" | "address" | "city" | "phone" | "website" | "email" | "lat" | "lon"
>;

export function toLeadInput(lead: LeadDto): LeadInput {
  return {
    sourceId: lead.sourceId,
    name: lead.name,
    category: lead.category,
    address: lead.address,
    city: lead.city,
    phone: lead.phone,
    website: lead.website,
    email: lead.email,
    lat: lead.lat,
    lon: lead.lon,
  };
}

export interface LeadSearchCenter {
  lat: number;
  lon: number;
  label: string;
}

export interface LeadSearchParams {
  query: string;
  location: string;
  radiusKm: number;
  /** Return only businesses with no website listed — the strongest pitch. */
  withoutWebsite: boolean;
}

/** A lead with no site of its own is the one a video pitch helps most. */
export function hasWebsite(lead: Pick<LeadDto, "website">): boolean {
  return lead.website != null && lead.website !== "";
}

export const RADIUS_OPTIONS_KM = [5, 10, 25, 50] as const;

export const PITCH_TONES = ["friendly", "professional", "bold"] as const;
export type PitchTone = (typeof PITCH_TONES)[number];

export function isPitchTone(value: string): value is PitchTone {
  return (PITCH_TONES as readonly string[]).includes(value);
}

export const PITCH_TONE_LABELS: Record<PitchTone, { title: string; subtitle: string }> = {
  friendly: { title: "Friendly", subtitle: "Warm and upbeat" },
  professional: { title: "Professional", subtitle: "Calm and polished" },
  bold: { title: "Bold", subtitle: "High-energy and punchy" },
};

/** The user's reusable pitch settings plus their last search. */
export interface PitchProfile {
  senderName: string;
  offer: string;
  tone: PitchTone;
  lastQuery: string;
  lastLocation: string;
  lastRadiusKm: number;
  lastWithoutWebsite: boolean;
}

export const DEFAULT_PITCH_PROFILE: PitchProfile = {
  senderName: "",
  offer: "",
  tone: "friendly",
  lastQuery: "",
  lastLocation: "",
  lastRadiusKm: 10,
  lastWithoutWebsite: false,
};

export const EXAMPLE_OFFER =
  "We make short AI video ads that bring new local customers through your door, and your first one is on us.";

const TONE_DIRECTION: Record<PitchTone, string> = {
  friendly: "a warm, upbeat presenter who smiles easily",
  professional: "a calm, polished presenter in smart business attire",
  bold: "a high-energy, charismatic presenter with punchy delivery",
};

export interface PitchPromptInput {
  leadName: string;
  category: string | null;
  city: string | null;
  senderName: string;
  offer: string;
  tone: PitchTone;
  duration: number;
}

/** Kling 3.0 accepts up to 2500 characters; keep the spoken offer tight. */
const MAX_OFFER_CHARS = 400;

function clampText(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`).trim();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function endsWithPunctuation(value: string): boolean {
  return /[.!?…]$/.test(value);
}

/**
 * The exact Kling 3.0 prompt LeadReel submits: a presenter speaks a spoken,
 * lip-synced line addressed to the lead by name, then closes. Longer clips
 * get a b-roll beat in the middle.
 */
export function buildPitchPrompt(input: PitchPromptInput): string {
  const lead = input.leadName.replace(/\s+/g, " ").trim() || "your business";
  const category = input.category?.trim() || null;
  const city = input.city?.trim() || null;
  const sender = input.senderName.replace(/\s+/g, " ").trim() || "a new partner";
  const rawOffer = clampText(input.offer || EXAMPLE_OFFER, MAX_OFFER_CHARS);
  const offer = endsWithPunctuation(rawOffer) ? rawOffer : `${rawOffer}.`;

  const who = [category ? `a ${category}` : null, city ? `in ${city}` : null]
    .filter((part): part is string => part != null)
    .join(" ");
  const subject = who ? `${lead}, ${who}` : lead;
  const spoken = `Hi ${lead} team, I'm ${sender}. ${offer}`;
  const closing = "Let's talk this week.";
  const beats =
    input.duration >= 10
      ? `Then a quick cinematic b-roll beat of a thriving ${category ?? "local business"} with happy customers, before cutting back to the presenter, who smiles and says: "${closing}"`
      : `The presenter smiles and closes with: "${closing}"`;

  return [
    `Personalized video pitch for ${subject}.`,
    `${capitalize(TONE_DIRECTION[input.tone])} stands in a bright modern studio, looks into the camera and speaks naturally with clear lip-sync: "${spoken}"`,
    beats,
    "Soft commercial lighting, shallow depth of field, steady camera, realistic natural voice, no on-screen text, no captions, no logos.",
  ].join(" ");
}

export type OpportunityTier = "high" | "medium" | "low";

export interface LeadOpportunity {
  /** 0-100. Comparable across searches, not a probability. */
  score: number;
  tier: OpportunityTier;
  /** Short factual phrases behind the score. */
  reasons: string[];
}

export const OPPORTUNITY_TIER_LABELS: Record<OpportunityTier, string> = {
  high: "Strong fit",
  medium: "Worth a try",
  low: "Long shot",
};

/**
 * How promising a lead is, derived only from what OpenStreetMap actually
 * lists. Two things decide it: how much the business NEEDS what you sell — no
 * website is the loudest signal — and whether you can REACH them at all. A
 * business with no site and no phone number is a walk-in, not a lead, so
 * reachability caps the score no matter how badly they need the help.
 */
export function scoreLead(
  lead: Pick<LeadDto, "website" | "phone" | "email" | "address">,
): LeadOpportunity {
  const site = hasWebsite(lead);
  const phone = lead.phone != null && lead.phone !== "";
  const email = lead.email != null && lead.email !== "";
  const reach = (phone ? 30 : 0) + (email ? 10 : 0);
  const raw = (site ? 20 : 60) + reach + (lead.address ? 10 : 0);
  const score = Math.min(100, reach === 0 ? Math.min(raw, 45) : raw);

  const reasons: string[] = [];
  if (!site) reasons.push("No website");
  if (phone) reasons.push("Phone listed");
  else if (email) reasons.push("Email listed");
  else reasons.push("No contact listed");
  if (lead.address) reasons.push("Street address");

  return { score, tier: score >= 80 ? "high" : score >= 50 ? "medium" : "low", reasons };
}

/** Best opportunities first, ties broken by name so the order never jitters. */
export function compareByOpportunity(a: LeadDto, b: LeadDto): number {
  return scoreLead(b).score - scoreLead(a).score || a.name.localeCompare(b.name);
}

export interface OutreachDraft {
  subject: string;
  email: string;
  sms: string;
}

function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const stop = clean.search(/[.!?](\s|$)/);
  return stop > 0 ? clean.slice(0, stop + 1) : clean;
}

/**
 * The message that goes with the video. Everything here comes from the lead's
 * own listing and the user's saved pitch, so nothing is invented about the
 * business — the "no website" line is only used when the listing really has no
 * site.
 */
export function buildOutreach(
  lead: Pick<LeadDto, "name" | "category" | "city" | "website">,
  profile: Pick<PitchProfile, "senderName" | "offer">,
): OutreachDraft {
  const name = lead.name.replace(/\s+/g, " ").trim() || "there";
  const sender = profile.senderName.replace(/\s+/g, " ").trim() || "a local partner";
  const offer = firstSentence(profile.offer || EXAMPLE_OFFER);
  const trade = lead.category?.trim() || "business like yours";
  const place = lead.city?.trim();
  const site = hasWebsite(lead);

  const context = site
    ? `I had a look at ${hostLabel(lead.website ?? "")} and had a couple of ideas specific to ${name}.`
    : `Right now there's no website listed for you, so someone searching for a ${trade}${place ? ` in ${place}` : ""} has a hard time finding you at all.`;

  const subject = site ? `Quick idea for ${name}` : `${name} is hard to find online`;

  const email = [
    `Hi ${name} team,`,
    "",
    `I'm ${sender}. ${offer}`,
    "",
    context,
    "",
    `If it's useful I'll send over a short video showing exactly what that would look like for ${name} — no charge, no commitment.`,
    "",
    "Worth a look?",
    "",
    sender,
  ].join("\n");

  const sms = `Hi ${name} — ${sender} here. ${offer} Can I send you a 30-second video showing what it would look like? No charge.`;

  return { subject, email, sms };
}

/** "dentist · Lynchburg" style one-liner for compact lead labels. */
export function describeLead(lead: Pick<LeadDto, "category" | "city">): string {
  return [lead.category, lead.city].filter((part): part is string => part != null && part !== "").join(" · ");
}

/** Only http(s) URLs may become hrefs — anything else renders as plain text. */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function telHref(phone: string): string | null {
  const digits = phone.replace(/[^+\d]/g, "");
  return digits.length >= 6 ? `tel:${digits}` : null;
}

export function mailHref(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : null;
}
