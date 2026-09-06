/**
 * Download a protected same-origin `/api/...` file from inside the Higgsfield
 * iframe. Native `<a download>` navigation can drop the embedded session and
 * come back 401, so fetch with credentials and hand the bytes to a Blob URL.
 * Browser-only: call from an event handler, never during render.
 */
export async function downloadAuthenticatedFile(url: string, filename: string): Promise<void> {
  const target = new URL(url, window.location.href);
  if (target.origin !== window.location.origin || !target.pathname.startsWith("/api/")) {
    throw new Error("Authenticated downloads require an app-local /api/... URL");
  }

  const response = await fetch(target, { credentials: "include" });
  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {}
    throw new Error(message);
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  try {
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  }
}
