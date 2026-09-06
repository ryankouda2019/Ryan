import { createFileRoute } from "@tanstack/react-router";
import { requireCurrentUser } from "@/lib/auth.server";
import { DbUnavailableError, getDb } from "@/lib/db.server";

/**
 * CSV export of the signed-in user's saved leads. Fetched with credentials by
 * the browser (see lib/download-authenticated.ts) because the app runs inside
 * the Higgsfield iframe, where a plain download link would lose the session.
 */

interface ExportRow {
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  status: string;
  notes: string;
  pitch_count: number | null;
  lat: number | null;
  lon: number | null;
  source_id: string;
  created_at: string;
  updated_at: string;
}

const HEADER = [
  "name",
  "category",
  "address",
  "city",
  "phone",
  "website",
  "email",
  "status",
  "notes",
  "pitch_videos",
  "lat",
  "lon",
  "source_id",
  "saved_at",
  "updated_at",
];

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  // Neutralize spreadsheet formula injection, then quote when needed.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export const Route = createFileRoute("/api/leads/export")({
  server: {
    handlers: {
      GET: async () => {
        const auth = await requireCurrentUser();
        if (!auth.ok) {
          return Response.json(
            { ok: false, error: { code: "unauthorized", message: "Sign in to export leads." } },
            { status: auth.status },
          );
        }

        try {
          const rows = await getDb()
            .prepare(
              `SELECT l.name, l.category, l.address, l.city, l.phone, l.website, l.email, l.status,
                      l.notes, l.lat, l.lon, l.source_id, l.created_at, l.updated_at,
                      (SELECT COUNT(*) FROM pitches p WHERE p.lead_id = l.id AND p.user_id = l.user_id) AS pitch_count
               FROM leads l WHERE l.user_id = ? ORDER BY l.updated_at DESC LIMIT 2000`,
            )
            .bind(auth.user.id)
            .all<ExportRow>();

          const lines = [
            HEADER.join(","),
            ...rows.results.map((row) =>
              [
                row.name,
                row.category,
                row.address,
                row.city,
                row.phone,
                row.website,
                row.email,
                row.status,
                row.notes,
                row.pitch_count ?? 0,
                row.lat,
                row.lon,
                row.source_id,
                row.created_at,
                row.updated_at,
              ]
                .map(csvCell)
                .join(","),
            ),
          ];

          return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
            status: 200,
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "content-disposition": 'attachment; filename="leadreel-leads.csv"',
              "cache-control": "no-store",
            },
          });
        } catch (error) {
          const status = error instanceof DbUnavailableError ? 503 : 500;
          console.error("[api/leads/export] failed", {
            status,
            reason: error instanceof Error ? error.message : String(error),
          });
          return Response.json(
            {
              ok: false,
              error: {
                code: status === 503 ? "db_unavailable" : "export_failed",
                message:
                  status === 503
                    ? "The lead database is not available right now."
                    : "The export could not be generated. Please try again.",
              },
            },
            { status },
          );
        }
      },
    },
  },
});
