import type { D1Database } from "@cloudflare/workers-types";
import { bindings } from "./bindings.server";

/** Thrown when the D1 binding is missing (manifest not deployed with `db: true`). */
export class DbUnavailableError extends Error {
  readonly code = "db_unavailable" as const;

  constructor() {
    super("The lead database is not available right now. Please try again in a moment.");
    this.name = "DbUnavailableError";
  }
}

/** The app's single live D1 database — guard every use (see bindings.server.ts). */
export function getDb(): D1Database {
  const db = bindings().DB;
  if (db == null) throw new DbUnavailableError();
  return db;
}
