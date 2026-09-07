import type { LeadDto, LeadSearchCenter } from "./leads.shared";

/**
 * Lead discovery on OpenStreetMap: Nominatim turns "Lynchburg, VA" into a
 * coordinate, Overpass lists named businesses around it. Both are public,
 * key-free services with usage policies (identify yourself, stay polite),
 * so requests carry a descriptive User-Agent, hit fixed hosts only (no
 * user-controlled URLs), and are capped in size and time.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;
const USER_AGENT = "LeadReel/1.0 (Higgsfield app; local business lead discovery)";
const GEOCODE_TIMEOUT_MS = 12_000;
const OVERPASS_EXACT_TIMEOUT_MS = 25_000;
const OVERPASS_FUZZY_TIMEOUT_MS = 18_000;
const OVERPASS_QUERY_TIMEOUT_S = 20;
/** Skip the scanning pass when the indexed pass already spent this long. */
const FUZZY_PASS_BUDGET_MS = 14_000;
export const MAX_SEARCH_RESULTS = 60;

export class LeadSearchError extends Error {
  readonly code: "geocode_failed" | "search_failed";

  constructor(code: "geocode_failed" | "search_failed", message: string) {
    super(message);
    this.name = "LeadSearchError";
    this.code = code;
  }
}

/** OSM keys whose values name what a business does. */
const CATEGORY_KEYS = ["amenity", "shop", "office", "craft", "healthcare", "leisure", "tourism"] as const;

/** Common search terms → the OSM tags that mean them (exact matches). */
const SYNONYMS: Record<string, readonly string[]> = {
  dentist: ["amenity=dentist", "healthcare=dentist"],
  dental: ["amenity=dentist", "healthcare=dentist"],
  orthodontist: ["amenity=dentist", "healthcare=dentist"],
  doctor: ["amenity=doctors", "healthcare=doctor"],
  physician: ["amenity=doctors", "healthcare=doctor"],
  clinic: ["amenity=clinic", "healthcare=clinic"],
  chiropractor: ["healthcare=chiropractor", "office=chiropractor"],
  physiotherapist: ["healthcare=physiotherapist"],
  "physical therapy": ["healthcare=physiotherapist"],
  vet: ["amenity=veterinary"],
  veterinarian: ["amenity=veterinary"],
  veterinary: ["amenity=veterinary"],
  pharmacy: ["amenity=pharmacy"],
  optometrist: ["healthcare=optometrist", "shop=optician"],
  optician: ["shop=optician"],
  restaurant: ["amenity=restaurant"],
  cafe: ["amenity=cafe"],
  coffee: ["amenity=cafe", "shop=coffee"],
  "coffee shop": ["amenity=cafe", "shop=coffee"],
  bar: ["amenity=bar", "amenity=pub"],
  pub: ["amenity=pub", "amenity=bar"],
  bakery: ["shop=bakery"],
  gym: ["leisure=fitness_centre"],
  fitness: ["leisure=fitness_centre"],
  yoga: ["leisure=fitness_centre"],
  salon: ["shop=hairdresser", "shop=beauty"],
  "hair salon": ["shop=hairdresser"],
  hairdresser: ["shop=hairdresser"],
  barber: ["shop=hairdresser"],
  barbershop: ["shop=hairdresser"],
  spa: ["leisure=spa", "shop=beauty", "shop=massage"],
  massage: ["shop=massage"],
  nails: ["shop=beauty"],
  "nail salon": ["shop=beauty"],
  lawyer: ["office=lawyer"],
  attorney: ["office=lawyer"],
  "law firm": ["office=lawyer"],
  accountant: ["office=accountant"],
  accounting: ["office=accountant"],
  cpa: ["office=accountant"],
  "real estate": ["office=estate_agent"],
  realtor: ["office=estate_agent"],
  insurance: ["office=insurance"],
  plumber: ["craft=plumber"],
  plumbing: ["craft=plumber"],
  electrician: ["craft=electrician"],
  roofer: ["craft=roofer"],
  roofing: ["craft=roofer"],
  hvac: ["craft=hvac"],
  carpenter: ["craft=carpenter"],
  painter: ["craft=painter"],
  landscaper: ["craft=gardener", "shop=garden_centre"],
  landscaping: ["craft=gardener", "shop=garden_centre"],
  mechanic: ["shop=car_repair"],
  "auto repair": ["shop=car_repair"],
  "car repair": ["shop=car_repair"],
  "car dealer": ["shop=car"],
  dealership: ["shop=car"],
  "car wash": ["amenity=car_wash"],
  hotel: ["tourism=hotel", "tourism=motel"],
  motel: ["tourism=motel", "tourism=hotel"],
  florist: ["shop=florist"],
  flowers: ["shop=florist"],
  photographer: ["craft=photographer", "shop=photo"],
  photography: ["craft=photographer", "shop=photo"],
  tattoo: ["shop=tattoo"],
  jeweler: ["shop=jewelry"],
  jewelry: ["shop=jewelry"],
  furniture: ["shop=furniture"],
  "pet store": ["shop=pet"],
  groomer: ["shop=pet_grooming"],
  "pet grooming": ["shop=pet_grooming"],
  daycare: ["amenity=childcare", "amenity=kindergarten"],
  childcare: ["amenity=childcare", "amenity=kindergarten"],
  school: ["amenity=school"],
  tutoring: ["office=educational_institution"],
  church: ["amenity=place_of_worship"],
  bank: ["amenity=bank"],
  laundry: ["shop=laundry", "shop=dry_cleaning"],
  "dry cleaner": ["shop=dry_cleaning"],
  boutique: ["shop=boutique", "shop=clothes"],
  clothing: ["shop=clothes", "shop=boutique"],
  bookstore: ["shop=books"],
  "bike shop": ["shop=bicycle"],
  bicycle: ["shop=bicycle"],
  coworking: ["office=coworking", "amenity=coworking_space"],
  "marketing agency": ["office=advertising_agency", "office=marketing"],
  marketing: ["office=advertising_agency", "office=marketing"],
  agency: ["office=advertising_agency", "office=marketing"],
  "web design": ["office=it"],
  "it services": ["office=it"],
  "grocery store": ["shop=supermarket", "shop=convenience"],
  supermarket: ["shop=supermarket"],
  pizza: ["amenity=restaurant", "amenity=fast_food"],
  "fast food": ["amenity=fast_food"],
  brewery: ["craft=brewery", "amenity=pub"],
  winery: ["craft=winery"],
  "wedding venue": ["amenity=events_venue"],
  "event venue": ["amenity=events_venue"],
  storage: ["shop=storage_rental"],
  "self storage": ["shop=storage_rental"],
  cleaning: ["shop=cleaning", "craft=cleaning"],
  "cleaning service": ["shop=cleaning", "craft=cleaning"],
  "moving company": ["office=moving_company", "shop=moving"],
  movers: ["office=moving_company", "shop=moving"],
  "travel agency": ["shop=travel_agency"],
  contractor: ["office=construction_company", "craft=builder"],
  "general contractor": ["office=construction_company", "craft=builder"],
  builder: ["craft=builder", "office=construction_company"],
  locksmith: ["craft=locksmith", "shop=locksmith"],
  "auto parts": ["shop=car_parts"],
  "tire shop": ["shop=tyres"],
  tires: ["shop=tyres"],
};

/** Tag values → friendlier category labels. Anything else is just humanized. */
const CATEGORY_LABELS: Record<string, string> = {
  doctors: "doctor's office",
  estate_agent: "real estate agency",
  fitness_centre: "fitness center",
  car_repair: "auto repair shop",
  car: "car dealership",
  car_wash: "car wash",
  car_parts: "auto parts store",
  tyres: "tire shop",
  place_of_worship: "place of worship",
  hairdresser: "hair salon",
  beauty: "beauty salon",
  dentist: "dental practice",
  veterinary: "veterinary clinic",
  lawyer: "law office",
  accountant: "accounting firm",
  insurance: "insurance agency",
  cafe: "cafe",
  fast_food: "fast food restaurant",
  pet_grooming: "pet groomer",
  pet: "pet store",
  garden_centre: "garden center",
  gardener: "landscaping company",
  advertising_agency: "marketing agency",
  it: "IT services company",
  educational_institution: "tutoring center",
  storage_rental: "self storage",
  moving_company: "moving company",
  construction_company: "construction company",
  events_venue: "event venue",
  dry_cleaning: "dry cleaner",
  books: "bookstore",
  clothes: "clothing store",
  bicycle: "bike shop",
  coworking_space: "coworking space",
  supermarket: "grocery store",
  convenience: "convenience store",
  childcare: "childcare center",
  kindergarten: "preschool",
  travel_agency: "travel agency",
  optician: "optician",
  photo: "photo studio",
};

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
  remark?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name?: string;
}

function normalizeTerm(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9&' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Word-boundary-ish POSIX regex for a term: "real estate" → real[ _-]?estate */
function termRegex(term: string): string {
  return term
    .split(" ")
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, ""))
    .join("[ _-]?");
}

function singularize(term: string): string {
  if (term.endsWith("ies")) return `${term.slice(0, -3)}y`;
  if (term.endsWith("ses") || term.endsWith("xes") || term.endsWith("shes") || term.endsWith("ches")) {
    return term.slice(0, -2);
  }
  if (term.endsWith("s") && !term.endsWith("ss")) return term.slice(0, -1);
  return term;
}

const CATEGORY_KEY_REGEX = `^(${CATEGORY_KEYS.join("|")})$`;

/** Every tag that can carry a business's own site; all must be absent. */
const WEBSITE_TAGS = ["website", "contact:website", "url"] as const;
const NO_WEBSITE_FILTER = WEBSITE_TAGS.map((tag) => `[!"${tag}"]`).join("");
const EARTH_RADIUS_M = 6_371_000;

/** Bounding box (south, west, north, east) covering `radiusM` around the center. */
function bboxAround(center: LeadSearchCenter, radiusM: number): string {
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const cosLat = Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01);
  const dLon = dLat / cosLat;
  const south = Math.max(center.lat - dLat, -90);
  const north = Math.min(center.lat + dLat, 90);
  const west = Math.max(center.lon - dLon, -180);
  const east = Math.min(center.lon + dLon, 180);
  return [south, west, north, east].map((value) => value.toFixed(6)).join(",");
}

/** Great-circle distance in meters (haversine). */
function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A bounding-box query (index-friendly — `around` on ways makes the public
 * servers crawl and time out). Exact synonym tags are cheap unions; two regex
 * clauses cover "category value mentions the term" and "business name mentions
 * the term", both scoped to elements that carry a business category key so the
 * scan never touches every named road or building. Nodes + ways only. The
 * circle is enforced afterwards with `distanceMeters`.
 *
 * `withoutWebsite` filters inside the query rather than after it: the result
 * cap would otherwise be filled by businesses that do have a site, leaving
 * only a handful of the ones actually being looked for.
 *
 * Split into two passes because they cost wildly different amounts. The EXACT
 * pass matches known tag values and is index-backed, so it answers in a second
 * or two. The FUZZY pass regex-matches category values and business names,
 * which Overpass cannot index — it scans the box and is the pass that times out
 * on a busy public server. Running them separately means a slow fuzzy pass
 * trims the result set instead of failing the whole search.
 */
function buildOverpassQueries(
  term: string,
  center: LeadSearchCenter,
  radiusM: number,
  withoutWebsite: boolean,
): { exact?: string; fuzzy?: string } {
  const singular = singularize(term);
  const exactPairs = new Set<string>([...(SYNONYMS[term] ?? []), ...(SYNONYMS[singular] ?? [])]);
  const regex = termRegex(singular);
  const noSite = withoutWebsite ? NO_WEBSITE_FILTER : "";
  const wrap = (clauses: string[]) =>
    `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}][bbox:${bboxAround(center, radiusM)}];` +
    `(${clauses.join("")});out center tags ${MAX_SEARCH_RESULTS * 3};`;

  const exactClauses: string[] = [];
  for (const pair of exactPairs) {
    const [key, value] = pair.split("=");
    if (key && value) exactClauses.push(`nw["name"]["${key}"="${value}"]${noSite};`);
  }
  const fuzzyClauses =
    regex.length > 0
      ? [
          `nw["name"][~"${CATEGORY_KEY_REGEX}"~"${regex}",i]${noSite};`,
          `nw["name"~"${regex}",i][~"${CATEGORY_KEY_REGEX}"~"."]${noSite};`,
        ]
      : [];

  return {
    ...(exactClauses.length > 0 ? { exact: wrap(exactClauses) } : {}),
    ...(fuzzyClauses.length > 0 ? { fuzzy: wrap(fuzzyClauses) } : {}),
  };
}

function humanizeCategory(tags: Record<string, string>): string | null {
  for (const key of CATEGORY_KEYS) {
    const value = tags[key];
    if (!value || value === "yes") continue;
    const primary = value.split(";")[0]?.trim() ?? value;
    const label = CATEGORY_LABELS[primary] ?? primary.replace(/_/g, " ");
    if (primary === "restaurant" && tags.cuisine) {
      const cuisine = tags.cuisine.split(";")[0]?.replace(/_/g, " ");
      return cuisine ? `${cuisine} restaurant` : label;
    }
    return label;
  }
  return null;
}

function firstValue(value: string | undefined): string | null {
  if (!value) return null;
  const first = value.split(";")[0]?.trim();
  return first ? first : null;
}

function normalizeWebsite(value: string | undefined): string | null {
  const first = firstValue(value);
  if (!first) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(first) ? first : `https://${first}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString().slice(0, 300);
  } catch {
    return null;
  }
}

function buildAddress(tags: Record<string, string>): string | null {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ").trim();
  const parts = [street || null, tags["addr:postcode"] ?? null].filter(
    (part): part is string => part != null && part !== "",
  );
  if (parts.length === 0) return tags["addr:full"] ?? null;
  return parts.join(", ");
}

function elementToLead(element: OverpassElement): LeadDto | null {
  const tags = element.tags ?? {};
  const name = tags.name?.replace(/\s+/g, " ").trim();
  if (!name) return null;
  const lat = element.lat ?? element.center?.lat ?? null;
  const lon = element.lon ?? element.center?.lon ?? null;
  const sourceId = `osm:${element.type}/${element.id}`;

  return {
    id: sourceId,
    sourceId,
    saved: false,
    name: name.slice(0, 200),
    category: humanizeCategory(tags),
    address: buildAddress(tags),
    city: tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"] ?? null,
    phone: firstValue(tags.phone ?? tags["contact:phone"] ?? tags["contact:mobile"])?.slice(0, 60) ?? null,
    website: normalizeWebsite(tags.website ?? tags["contact:website"] ?? tags.url),
    email: firstValue(tags.email ?? tags["contact:email"])?.slice(0, 200) ?? null,
    lat,
    lon,
    status: "new",
    notes: "",
    pitchCount: 0,
    createdAt: null,
    updatedAt: null,
  };
}

/** Leads with more ways to reach them rank first. */
function contactScore(lead: LeadDto): number {
  return (
    (lead.phone ? 3 : 0) + (lead.website ? 2 : 0) + (lead.email ? 2 : 0) + (lead.address ? 1 : 0)
  );
}

export async function geocodeLocation(location: string): Promise<LeadSearchCenter> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", location.trim());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  let results: NominatimResult[];
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new LeadSearchError(
        "geocode_failed",
        `The location service answered ${response.status}. Please try again in a moment.`,
      );
    }
    results = (await response.json()) as NominatimResult[];
  } catch (error) {
    if (error instanceof LeadSearchError) throw error;
    throw new LeadSearchError(
      "geocode_failed",
      "Couldn't reach the location service. Check your connection and try again.",
    );
  }

  const first = Array.isArray(results) ? results[0] : undefined;
  const lat = first ? Number.parseFloat(first.lat) : Number.NaN;
  const lon = first ? Number.parseFloat(first.lon) : Number.NaN;
  if (!first || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new LeadSearchError(
      "geocode_failed",
      `We couldn't find "${location.trim()}". Try a city and state, like "Lynchburg, VA".`,
    );
  }
  const label = first.display_name?.split(",").slice(0, 3).join(",").trim() || location.trim();
  return { lat, lon, label };
}

async function runOverpass(query: string, timeoutMs: number): Promise<OverpassResponse> {
  let lastError: unknown;
  for (const endpoint of OVERPASS_URLS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        lastError = new Error(`Overpass ${endpoint} answered ${response.status}`);
        continue;
      }
      const body = (await response.json()) as OverpassResponse;
      if (body.remark && /timed out|runtime error/i.test(body.remark) && !body.elements?.length) {
        lastError = new Error(body.remark);
        continue;
      }
      return body;
    } catch (error) {
      lastError = error;
    }
  }
  console.error("[leads] overpass failed", {
    reason: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw new LeadSearchError(
    "search_failed",
    "The map data service is busy right now. Please try again in a few seconds.",
  );
}

export async function searchNearbyBusinesses(
  query: string,
  center: LeadSearchCenter,
  radiusKm: number,
  withoutWebsite = false,
): Promise<LeadDto[]> {
  const term = normalizeTerm(query);
  if (term.length === 0) {
    throw new LeadSearchError("search_failed", "Describe the kind of business you're looking for.");
  }
  const radiusM = Math.min(Math.max(radiusKm, 1), 50) * 1000;
  const queries = buildOverpassQueries(term, center, radiusM, withoutWebsite);

  const elements: OverpassElement[] = [];
  let failure: unknown;
  const startedAt = Date.now();

  if (queries.exact != null) {
    try {
      const body = await runOverpass(queries.exact, OVERPASS_EXACT_TIMEOUT_MS);
      elements.push(...(body.elements ?? []));
    } catch (error) {
      failure = error;
    }
  }
  // Well-known terms already have their matches; a slow scanning pass then only
  // costs the user extra names, never the whole search.
  if (queries.fuzzy != null && Date.now() - startedAt < FUZZY_PASS_BUDGET_MS) {
    try {
      const body = await runOverpass(queries.fuzzy, OVERPASS_FUZZY_TIMEOUT_MS);
      elements.push(...(body.elements ?? []));
    } catch (error) {
      failure ??= error;
    }
  }
  if (elements.length === 0 && failure != null) throw failure;

  const seen = new Set<string>();
  const leads: LeadDto[] = [];
  for (const element of elements) {
    const lead = elementToLead(element);
    if (!lead) continue;
    // A malformed or non-http site value survives the query filter but is
    // dropped by normalizeWebsite, so re-check the parsed lead too.
    if (withoutWebsite && lead.website != null) continue;
    if (lead.lat != null && lead.lon != null) {
      if (distanceMeters(center, { lat: lead.lat, lon: lead.lon }) > radiusM) continue;
    }
    // The two passes overlap, so an element can arrive twice under its own id.
    if (seen.has(lead.sourceId)) continue;
    seen.add(lead.sourceId);
    const dedupeKey = `${lead.name.toLowerCase()}|${lead.address ?? ""}|${lead.city ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    leads.push(lead);
  }

  leads.sort((a, b) => contactScore(b) - contactScore(a) || a.name.localeCompare(b.name));
  return leads.slice(0, MAX_SEARCH_RESULTS);
}
