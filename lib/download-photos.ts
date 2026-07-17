export type PhotoDownloadResult = {
  ok: boolean;
  /** Files saved (subset path); for the ZIP path this is 1 archive on success. */
  saved: number;
  total: number;
  /** Present on failure. */
  error?: string;
};

/** Save a blob under a filename via a same-origin object URL. */
function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Release after the browser has taken the blob; revoking immediately can cancel the save.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

const dispositionFilename = (header: string | null): string | undefined =>
  header?.match(/filename="?([^"]+)"?/i)?.[1];

/**
 * Download every photo in a submission as one ZIP.
 *
 * The server streams a single same-origin attachment, so there is exactly one
 * request to succeed or fail — no cross-origin `download` that the browser
 * ignores, no navigation race that silently drops files, and a partial result is
 * impossible (the route 500s rather than returning a short archive).
 */
export async function downloadPhotoSet(photoId: string): Promise<PhotoDownloadResult> {
  const url = `/api/admin/photos/${photoId}/download`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { ok: false, saved: 0, total: 0, error: "Network error — please check your connection and try again." };
  }

  if (!res.ok) {
    // Error responses are JSON; parse defensively in case a proxy returns HTML.
    const body = await res.json().catch(() => null);
    const message =
      body && typeof body.error === "string"
        ? body.error
        : res.status === 401
          ? "Your session has expired — please sign in again."
          : `Couldn't prepare the download (${res.status}). Please try again.`;
    return { ok: false, saved: 0, total: 0, error: message };
  }

  const blob = await res.blob();
  saveBlob(blob, dispositionFilename(res.headers.get("content-disposition")) ?? "photos.zip");
  return { ok: true, saved: 1, total: 1 };
}

/**
 * Download a chosen subset of already-signed URLs (the View modal's "Download
 * selected"). Fetches each as a same-origin blob so `download` is honoured and
 * each file reports whether it saved — the ZIP route can't serve a subset.
 */
export async function downloadPhotoUrls(urls: string[]): Promise<PhotoDownloadResult> {
  if (urls.length === 0) return { ok: false, saved: 0, total: 0, error: "There are no photos selected to download." };

  let saved = 0;
  for (const [i, url] of urls.entries()) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      saveBlob(blob, `iqcommune-photo-${i + 1}.${ext}`);
      saved++;
    } catch {
      /* counted as not-saved below */
    }
  }
  return { ok: saved === urls.length, saved, total: urls.length };
}
