-- LeadReel D1 schema. Applied by the platform on deploy (app.manifest.json
-- sets "db": true). ONE live database — keep every change additive
-- (CREATE TABLE IF NOT EXISTS / ADD COLUMN). Bound as env.DB
-- (see src/lib/bindings.server.ts). fnf stays the source of truth for the
-- generations themselves; these tables are LeadReel's own product layer.

-- Leads the signed-in user saved from a search (or pitched directly).
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  lat REAL,
  lon REAL,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS leads_user_source ON leads (user_id, source_id);
CREATE INDEX IF NOT EXISTS leads_user_updated ON leads (user_id, updated_at);

-- One row per Kling 3.0 pitch video submitted for a lead. `id` is the fnf
-- generation id, so History can label each video with its lead.
CREATE TABLE IF NOT EXISTS pitches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS pitches_user_lead ON pitches (user_id, lead_id);

-- The user's reusable pitch settings and last search, so the rail is
-- pre-filled on the next visit.
CREATE TABLE IF NOT EXISTS pitch_profiles (
  user_id TEXT PRIMARY KEY,
  sender_name TEXT NOT NULL DEFAULT '',
  offer TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'friendly',
  last_query TEXT NOT NULL DEFAULT '',
  last_location TEXT NOT NULL DEFAULT '',
  last_radius_km INTEGER NOT NULL DEFAULT 10,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
