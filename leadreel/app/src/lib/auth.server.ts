/**
 * Higgsfield auth guard for server code. The platform attaches the visitor's
 * identity to server-side `https://fnf.internal` egress, so the current user
 * is simply whoever `/user` returns. Every server function or route that
 * touches user-owned data (leads, pitches, profile, CSV export) calls this
 * first and stops on 401 — the UI gate is only for the experience.
 */
export type AuthUser = { id: string };
export type AuthResult = { ok: true; user: AuthUser } | { ok: false; status: number };

export async function requireCurrentUser(): Promise<AuthResult> {
  const response = await fetch("https://fnf.internal/user");
  if (response.status === 401) return { ok: false, status: 401 };
  if (!response.ok) return { ok: false, status: response.status };

  const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
  if (body == null || typeof body.id !== "string" || body.id.length === 0) {
    return { ok: false, status: 401 };
  }
  return { ok: true, user: { id: body.id } };
}
