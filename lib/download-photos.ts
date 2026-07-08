// Downloads every photo in a submission. Reuses the admin view endpoint's
// `downloadUrls` (signed, Content-Disposition: attachment) and triggers a
// staggered <a download> click per file. Client-only (uses document).
export async function downloadPhotoSet(photoId: string): Promise<{ ok: boolean; count: number }> {
  const res = await fetch(`/api/admin/photos/${photoId}/view`);
  if (!res.ok) return { ok: false, count: 0 };
  const { downloadUrls } = (await res.json()) as { downloadUrls?: string[] };
  const urls = downloadUrls ?? [];
  urls.forEach((url, i) => {
    // stagger so the browser doesn't drop concurrent downloads
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 300);
  });
  return { ok: urls.length > 0, count: urls.length };
}
