# LeadReel — find local leads, pitch them with Kling 3.0 videos

**Live app:** https://leadreel.higgsfield.app

LeadReel is a Higgsfield app. You sign in with your Higgsfield account, search for
local businesses (for example *dentists in Lynchburg, VA*), save the ones you want
to reach, and generate a personalized pitch video for each lead with **Kling 3.0**.
The presenter in the video speaks a script addressed to the business by name, with
your name and your offer, using Kling 3.0's native lip-synced audio.

## How it works

1. **Find leads** — type a business type and a city. The app geocodes the location
   with Nominatim and lists named businesses around it from OpenStreetMap
   (Overpass API): phone, website, email and address when they are public.
2. **Pick a lead and write your offer** — choose a business, add your name and one or
   two sentences about what you offer. The script is built automatically and can be
   previewed before generating. Tone, aspect ratio (16:9 / 9:16 / 1:1), duration
   (5–15 s), quality (720p / 1080p / 4K) and an optional start-frame image are
   adjustable.
3. **Generate and send** — the Higgsfield host asks you to approve the credit cost,
   then Kling 3.0 renders the video on your Higgsfield credits. Finished videos
   appear under **Videos**, labelled with the lead they were made for.
4. **Track the pipeline** — saved leads carry a status (new, contacted, replied,
   won, lost), can be filtered, and export to CSV.

## What is in this folder

This folder holds the LeadReel-specific source that was layered onto Higgsfield's
"preset" app starter (React 19 + TanStack Start, server-rendered on one Cloudflare
Worker). The vendored Higgsfield packages (`@higgsfield/quanta`, `@higgsfield/fnf`,
`@higgsfield/fnf-react`) and the shared template components live in the app's
Higgsfield repository and are not duplicated here.

| Path | Purpose |
| --- | --- |
| `app/app.manifest.json` | Opts the app into a D1 database (`db: true`). |
| `app/migrations/0001_init.sql` | Schema: `leads`, `pitches`, `pitch_profiles`. |
| `app/src/layouts/preset.tsx` | The whole screen: lead rail, Leads / Videos / How-it-works tabs. |
| `app/src/components/lead-card/` | `LeadCard` and `SelectedLeadCard` (Quanta primitives). |
| `app/src/lib/leads.shared.ts` | Shared types, statuses, and the Kling 3.0 prompt builder. |
| `app/src/lib/osm.server.ts` | Nominatim geocoding + Overpass business search (server only). |
| `app/src/lib/leads.functions.ts` | Server functions: search, save, update, delete, pitches, profile. |
| `app/src/lib/auth.server.ts` | Higgsfield auth guard (`https://fnf.internal/user`). |
| `app/src/lib/db.server.ts` | Guarded access to the D1 binding. |
| `app/src/lib/fnf.browser.ts` | Browser-safe fnf adapter; registers the `kling3_0` job. |
| `app/src/lib/download-authenticated.ts` | Credentialed CSV download that works inside the Higgsfield iframe. |
| `app/src/routes/api/leads/export.ts` | `GET /api/leads/export` — CSV of saved leads. |
| `app/src/app-meta.json` | Title, description, favicon and generated launch cover. |
| `app/public/favicon.svg` | App icon. |

Generated image assets (the launch cover and the empty-state art derived from it)
are uploaded to Higgsfield storage and referenced by URL from `app-meta.json`;
the small `.webp` crops used by the empty states ship in `app/public/assets/` in
the deployed app.

## Notes

- Every video is generated on the signed-in user's Higgsfield credits; the host's
  approval dialog shows the exact cost before anything is submitted.
- Lead data comes from OpenStreetMap contributors (ODbL). Businesses without a
  listed phone or website still show up, so the pitch video can be the first touch.
