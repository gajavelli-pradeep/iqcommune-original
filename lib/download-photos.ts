import { fetchJson } from "@/lib/http";

export type PhotoDownloadResult = {
  /** True only when every file was saved. */
  ok: boolean;
  saved: number;
  total: number;
  /** Present when nothing could be attempted (fetch/auth/empty set). */
  error?: string;
};

/**
 * Saving a cross-origin file needs a same-origin `blob:` URL.
 *
 * An <a download> pointing at another origin does NOT download — the spec makes
 * the browser ignore `download` cross-origin, so the click becomes a top-level
 * navigation that only becomes a save because Supabase sends
 * Content-Disposition: attachment. Fire several of those in a row and each
 * navigation supersedes the one before it, so an arbitrary subset of files is
 * silently lost (this is why the old code staggered clicks and still dropped
 * files). Fetching the bytes first and pointing the anchor at a blob: URL keeps
 * it same-origin: `download` is honoured, nothing navigates, and — the point of
 * the exercise — each file reports whether it actually saved.
 */
async function saveOne(url: string, index: number): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();

    // Name from the real MIME type — these are PNGs, previously saved as ".jpg".
    const subtype = blob.type.split("/")[1] ?? "";
    const ext = (subtype === "jpeg" ? "jpg" : subtype) || "jpg";

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `iqcommune-photo-${index + 1}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Release only after the browser has taken the blob; revoking immediately
    // can cancel an in-flight save.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    return true;
  } catch {
    return false;
  }
}

/** Download the given signed URLs, reporting how many actually saved. */
export async function downloadPhotoUrls(urls: string[]): Promise<PhotoDownloadResult> {
  if (urls.length === 0) return { ok: false, saved: 0, total: 0, error: "There are no photo files to download." };

  let saved = 0;
  // Sequential: concurrent saves re-introduce the throttling this fix removes.
  for (const [i, url] of urls.entries()) {
    if (await saveOne(url, i)) saved++;
  }
  return { ok: saved === urls.length, saved, total: urls.length };
}

/** Download every photo in a submission. */
export async function downloadPhotoSet(photoId: string): Promise<PhotoDownloadResult> {
  let downloadUrls: string[];
  try {
    const data = await fetchJson<{ downloadUrls?: string[] }>(`/api/admin/photos/${photoId}/view`);
    downloadUrls = data.downloadUrls ?? [];
  } catch (e) {
    return { ok: false, saved: 0, total: 0, error: (e as Error).message };
  }
  return downloadPhotoUrls(downloadUrls);
}
