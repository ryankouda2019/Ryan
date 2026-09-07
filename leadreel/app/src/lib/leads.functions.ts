import type { D1Database } from "@cloudflare/workers-types";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCurrentUser } from "./auth.server";
import { DbUnavailableError, getDb } from "./db.server";
import {
  DEFAULT_PITCH_PROFILE,
  LEAD_STATUSES,
  PITCH_TONES,
  RADIUS_OPTIONS_KM,
  isLeadStatus,
  isPitchTone,
  type LeadDto,
  type LeadSearchCenter,
  type PitchProfile,
} from "./leads.shared";
import { LeadSearchError, geocodeLocation, searchNearbyBusinesses } from "./osm.server";

/**
 * LeadReel's own product layer: lead search (OpenStreetMap), the saved-lead
 * pipeline, pitch bookkeeping and the reusable pitch profile — all in D1,
 * all behind the Higgsfield auth guard. Generation itself stays with fnf
 * (see fnf.functions.ts); `pitches` only links a generation id to a lead.
 */

export type LeadsErrorCode =
  | "unauthorized"
  | "db_unavailable"
  | "not_found"
  | "geocode_failed"
  | "search_failed"
  | "unexpected";

export type LeadsError = { ok: false; code: LeadsErrorCode; message: string };
export type LeadsResult<T> = ({ ok: true } & T) | LeadsError;

export interface PitchDto {
  id: string;
  leadId: string;
  leadName: string;
  createdAt: string;
}

interface LeadRow {
  id: string;
  source_id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  lat: number | null;
  lon: number | null;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  pitch_count: number | null;
}

interface PitchRow {
  id: string;
  lead_id: string;
  lead_name: string;
  created_at: string;
}

interface ProfileRow {
  sender_name: string;
  offer: string;
  tone: string;
  last_query: string;
  last_location: string;
  last_radius_km: number;
  last_without_website: number;
}

const LEAD_COLUMNS = `l.id, l.source_id, l.name, l.category, l.address, l.city, l.phone, l.website,
  l.email, l.lat, l.lon, l.status, l.notes, l.created_at, l.updated_at,
  (SELECT COUNT(*) FROM pitches p WHERE p.lead_id = l.id AND p.user_id = l.user_id) AS pitch_count`;

function fail(code: LeadsErrorCode, message: string): LeadsError {
  return { ok: false, code, message };
}

function rowToLead(row: LeadRow): LeadDto {
  return {
    id: row.id,
    sourceId: row.source_id,
    saved: true,
    name: row.name,
    category: row.category,
    address: row.address,
    city: row.city,
    phone: row.phone,
    website: row.website,
    email: row.email,
    lat: row.lat,
    lon: row.lon,
    status: isLeadStatus(row.status) ? row.status : "new",
    notes: row.notes ?? "",
    pitchCount: Number(row.pitch_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProfile(row: ProfileRow | null): PitchProfile {
  if (row == null) return DEFAULT_PITCH_PROFILE;
  const radius = Number(row.last_radius_km);
  return {
    senderName: row.sender_name ?? "",
    offer: row.offer ?? "",
    tone: isPitchTone(row.tone) ? row.tone : "friendly",
    lastQuery: row.last_query ?? "",
    lastLocation: row.last_location ?? "",
    lastRadiusKm: (RADIUS_OPTIONS_KM as readonly number[]).includes(radius)
      ? radius
      : DEFAULT_PITCH_PROFILE.lastRadiusKm,
    lastWithoutWebsite: Number(row.last_without_website) === 1,
  };
}

/** Auth first, then the database; every failure becomes a typed result. */
async function withUserDb<T>(
  operation: string,
  run: (userId: string, db: D1Database) => Promise<LeadsResult<T>>,
): Promise<LeadsResult<T>> {
  const auth = await requireCurrentUser();
  if (!auth.ok) return fail("unauthorized", "Sign in with Higgsfield to manage your leads.");
  try {
    return await run(auth.user.id, getDb());
  } catch (error) {
    if (error instanceof DbUnavailableError) return fail("db_unavailable", error.message);
    console.error(`[leads] ${operation} failed`, {
      reason: error instanceof Error ? error.message : String(error),
    });
    return fail("unexpected", "Something went wrong on our side. Please try again.");
  }
}

async function loadSavedLead(
  db: D1Database,
  userId: string,
  leadId: string,
): Promise<LeadDto | null> {
  const row = await db
    .prepare(`SELECT ${LEAD_COLUMNS} FROM leads l WHERE l.user_id = ? AND l.id = ?`)
    .bind(userId, leadId)
    .first<LeadRow>();
  return row ? rowToLead(row) : null;
}

const searchInput = z.object({
  query: z.string().trim().min(1).max(80),
  location: z.string().trim().min(1).max(160),
  radiusKm: z.number().int().min(1).max(50),
  withoutWebsite: z.boolean(),
});

/** Geocode + Overpass search, with saved-lead state merged onto the results. */
export const searchLeadsFn = createServerFn({ method: "POST" })
  .validator(searchInput)
  .handler(
    async ({ data }): Promise<LeadsResult<{ leads: LeadDto[]; center: LeadSearchCenter }>> => {
      const auth = await requireCurrentUser();
      if (!auth.ok) return fail("unauthorized", "Sign in with Higgsfield to search for leads.");

      let center: LeadSearchCenter;
      let leads: LeadDto[];
      try {
        center = await geocodeLocation(data.location);
        leads = await searchNearbyBusinesses(
          data.query,
          center,
          data.radiusKm,
          data.withoutWebsite,
        );
      } catch (error) {
        if (error instanceof LeadSearchError) return fail(error.code, error.message);
        console.error("[leads] search failed", {
          reason: error instanceof Error ? error.message : String(error),
        });
        return fail("search_failed", "Lead search failed. Please try again.");
      }

      // Saved rows win over fresh results so status / pitch counts survive a re-search.
      try {
        const db = getDb();
        const saved = await db
          .prepare(`SELECT ${LEAD_COLUMNS} FROM leads l WHERE l.user_id = ?`)
          .bind(auth.user.id)
          .all<LeadRow>();
        const bySource = new Map(saved.results.map((row) => [row.source_id, rowToLead(row)]));
        leads = leads.map((lead) => bySource.get(lead.sourceId) ?? lead);
      } catch (error) {
        if (!(error instanceof DbUnavailableError)) {
          console.error("[leads] saved-state merge failed", {
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return { ok: true, leads, center };
    },
  );

export const listLeadsFn = createServerFn({ method: "POST" }).handler(
  (): Promise<LeadsResult<{ leads: LeadDto[] }>> =>
    withUserDb("listLeads", async (userId, db) => {
      const rows = await db
        .prepare(`SELECT ${LEAD_COLUMNS} FROM leads l WHERE l.user_id = ? ORDER BY l.updated_at DESC LIMIT 500`)
        .bind(userId)
        .all<LeadRow>();
      return { ok: true, leads: rows.results.map(rowToLead) };
    }),
);

const leadInput = z.object({
  sourceId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  category: z.string().max(120).nullable(),
  address: z.string().max(300).nullable(),
  city: z.string().max(120).nullable(),
  phone: z.string().max(60).nullable(),
  website: z.string().max(300).nullable(),
  email: z.string().max(200).nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
});

/** Upsert a search result into the user's pipeline (idempotent per place). */
export const saveLeadFn = createServerFn({ method: "POST" })
  .validator(leadInput)
  .handler(
    ({ data }): Promise<LeadsResult<{ lead: LeadDto }>> =>
      withUserDb("saveLead", async (userId, db) => {
        await db
          .prepare(
            `INSERT INTO leads (id, user_id, source_id, name, category, address, city, phone, website, email, lat, lon)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id, source_id) DO UPDATE SET
               name = excluded.name, category = excluded.category, address = excluded.address,
               city = excluded.city, phone = excluded.phone, website = excluded.website,
               email = excluded.email, lat = excluded.lat, lon = excluded.lon,
               updated_at = datetime('now')`,
          )
          .bind(
            crypto.randomUUID(),
            userId,
            data.sourceId,
            data.name,
            data.category,
            data.address,
            data.city,
            data.phone,
            data.website,
            data.email,
            data.lat,
            data.lon,
          )
          .run();
        const row = await db
          .prepare(`SELECT ${LEAD_COLUMNS} FROM leads l WHERE l.user_id = ? AND l.source_id = ?`)
          .bind(userId, data.sourceId)
          .first<LeadRow>();
        if (!row) return fail("unexpected", "The lead was not saved. Please try again.");
        return { ok: true, lead: rowToLead(row) };
      }),
  );

const updateInput = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateLeadFn = createServerFn({ method: "POST" })
  .validator(updateInput)
  .handler(
    ({ data }): Promise<LeadsResult<{ lead: LeadDto }>> =>
      withUserDb("updateLead", async (userId, db) => {
        const existing = await loadSavedLead(db, userId, data.id);
        if (!existing) return fail("not_found", "That lead is no longer in your saved list.");
        await db
          .prepare(
            `UPDATE leads SET status = ?, notes = ?, updated_at = datetime('now') WHERE user_id = ? AND id = ?`,
          )
          .bind(data.status ?? existing.status, data.notes ?? existing.notes, userId, data.id)
          .run();
        const lead = await loadSavedLead(db, userId, data.id);
        if (!lead) return fail("not_found", "That lead is no longer in your saved list.");
        return { ok: true, lead };
      }),
  );

export const deleteLeadFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1).max(64) }))
  .handler(
    ({ data }): Promise<LeadsResult<{ id: string }>> =>
      withUserDb("deleteLead", async (userId, db) => {
        await db.batch([
          db.prepare(`DELETE FROM pitches WHERE user_id = ? AND lead_id = ?`).bind(userId, data.id),
          db.prepare(`DELETE FROM leads WHERE user_id = ? AND id = ?`).bind(userId, data.id),
        ]);
        return { ok: true, id: data.id };
      }),
  );

const recordPitchInput = z.object({
  leadId: z.string().min(1).max(64),
  generationIds: z.array(z.string().min(1).max(64)).min(1).max(8),
  prompt: z.string().min(1).max(2500),
  model: z.string().min(1).max(64),
});

/** Link freshly submitted generation ids to the lead they pitch. */
export const recordPitchFn = createServerFn({ method: "POST" })
  .validator(recordPitchInput)
  .handler(
    ({ data }): Promise<LeadsResult<{ lead: LeadDto }>> =>
      withUserDb("recordPitch", async (userId, db) => {
        const existing = await loadSavedLead(db, userId, data.leadId);
        if (!existing) return fail("not_found", "Save the lead before recording a pitch for it.");
        await db.batch(
          data.generationIds.map((generationId) =>
            db
              .prepare(
                `INSERT OR IGNORE INTO pitches (id, user_id, lead_id, prompt, model) VALUES (?, ?, ?, ?, ?)`,
              )
              .bind(generationId, userId, data.leadId, data.prompt, data.model),
          ),
        );
        await db
          .prepare(`UPDATE leads SET updated_at = datetime('now') WHERE user_id = ? AND id = ?`)
          .bind(userId, data.leadId)
          .run();
        const lead = await loadSavedLead(db, userId, data.leadId);
        if (!lead) return fail("not_found", "That lead is no longer in your saved list.");
        return { ok: true, lead };
      }),
  );

export const listPitchesFn = createServerFn({ method: "POST" }).handler(
  (): Promise<LeadsResult<{ pitches: PitchDto[] }>> =>
    withUserDb("listPitches", async (userId, db) => {
      const rows = await db
        .prepare(
          `SELECT p.id, p.lead_id, l.name AS lead_name, p.created_at
           FROM pitches p JOIN leads l ON l.id = p.lead_id AND l.user_id = p.user_id
           WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 500`,
        )
        .bind(userId)
        .all<PitchRow>();
      return {
        ok: true,
        pitches: rows.results.map((row) => ({
          id: row.id,
          leadId: row.lead_id,
          leadName: row.lead_name,
          createdAt: row.created_at,
        })),
      };
    }),
);

export const getPitchProfileFn = createServerFn({ method: "POST" }).handler(
  (): Promise<LeadsResult<{ profile: PitchProfile }>> =>
    withUserDb("getPitchProfile", async (userId, db) => {
      const row = await db
        .prepare(
          `SELECT sender_name, offer, tone, last_query, last_location, last_radius_km,
                  last_without_website
           FROM pitch_profiles WHERE user_id = ?`,
        )
        .bind(userId)
        .first<ProfileRow>();
      return { ok: true, profile: rowToProfile(row) };
    }),
);

const profileInput = z.object({
  senderName: z.string().max(120),
  offer: z.string().max(1200),
  tone: z.enum(PITCH_TONES),
  lastQuery: z.string().max(80),
  lastLocation: z.string().max(160),
  lastRadiusKm: z.number().int().min(1).max(50),
  lastWithoutWebsite: z.boolean(),
});

export const savePitchProfileFn = createServerFn({ method: "POST" })
  .validator(profileInput)
  .handler(
    ({ data }): Promise<LeadsResult<{ profile: PitchProfile }>> =>
      withUserDb("savePitchProfile", async (userId, db) => {
        await db
          .prepare(
            `INSERT INTO pitch_profiles (user_id, sender_name, offer, tone, last_query, last_location,
                                         last_radius_km, last_without_website)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               sender_name = excluded.sender_name, offer = excluded.offer, tone = excluded.tone,
               last_query = excluded.last_query, last_location = excluded.last_location,
               last_radius_km = excluded.last_radius_km,
               last_without_website = excluded.last_without_website,
               updated_at = datetime('now')`,
          )
          .bind(
            userId,
            data.senderName.trim(),
            data.offer.trim(),
            data.tone,
            data.lastQuery.trim(),
            data.lastLocation.trim(),
            data.lastRadiusKm,
            data.lastWithoutWebsite ? 1 : 0,
          )
          .run();
        return { ok: true, profile: data };
      }),
  );
