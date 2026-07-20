"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRealtimeChannel } from "@/lib/hooks/use-realtime-list";

interface GalleryPhoto {
  id: string;
  caption_top_left: string | null;
  caption_bottom_right: string | null;
  sort_order: number;
  published: boolean;
  url: string;
}

const GAL_MAX = 20;

export function GalleryManager({ readOnly = false }: { readOnly?: boolean } = {}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(() => {
    fetch("/api/admin/gallery")
      .then((r) => r.json())
      .then((j) => { if (j.photos) setPhotos(j.photos); else setError("Failed to load gallery."); })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live: any change to gallery_photos (from another admin) refetches — the row's
  // signed image URL is resolved server-side, so a light refetch beats patching.
  useRealtimeChannel("gallery_photos", load);

  // Drop/pick → upload each file straight to DRAFT (published=false); captions are
  // filled per-card afterwards, matching the V6 two-stage flow.
  const uploadFiles = useCallback(async (files: FileList | File[] | null | undefined) => {
    if (!files) return;
    const list = Array.from(files);
    if (!list.length) return;
    setError("");
    setUploading(true);
    for (const f of list) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        setError("Please choose JPEG, PNG or WebP images."); continue;
      }
      if (f.size > 5 * 1024 * 1024) { setError(`${f.name} exceeds the 5 MB limit.`); continue; }
      const fd = new FormData();
      fd.append("photo", f);
      fd.append("captionTopLeft", "");
      fd.append("captionBottomRight", "");
      fd.append("published", "false");
      try {
        const res = await fetch("/api/admin/gallery", { method: "POST", body: fd });
        const j = await res.json();
        if (!res.ok) setError(j.error ?? "Upload failed.");
        else setPhotos((prev) => [...prev, j.data as GalleryPhoto]);
      } catch { setError("Network error."); }
    }
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
  }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  // Save a caption on blur only if it changed.
  async function saveCaption(p: GalleryPhoto, field: "caption_top_left" | "caption_bottom_right", value: string) {
    const next = value.trim() || null;
    if (next === p[field]) return;
    setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: next } : x)));
    const ok = await patch(p.id, { [field]: next });
    if (ok) flash("Caption saved."); else setError("Could not save caption.");
  }

  // Publish every draft. The server enforces the 20 cap by unpublishing the oldest
  // (never deleting), so a refetch reflects the final live set.
  async function publishAllDrafts(count: number) {
    if (!count) return;
    setPublishing(true);
    const drafts = photos.filter((p) => !p.published);
    let ok = true;
    for (const d of drafts) ok = (await patch(d.id, { published: true })) && ok;
    load();
    setPublishing(false);
    if (ok) flash(`Published — ${count} photo(s) added to the live gallery.`);
    else setError("Some photos could not be published.");
  }

  // Live "remove" = send back to draft (non-destructive). Draft ✕ = delete the upload.
  async function unpublish(p: GalleryPhoto) {
    setBusyId(p.id);
    const ok = await patch(p.id, { published: false });
    if (ok) setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: false } : x)));
    else setError("Could not update.");
    setBusyId(null);
  }

  async function remove(p: GalleryPhoto) {
    setBusyId(p.id);
    const res = await fetch(`/api/admin/gallery/${p.id}`, { method: "DELETE" });
    if (res.ok) { setPhotos((prev) => prev.filter((x) => x.id !== p.id)); flash("Photo removed."); }
    else setError("Could not delete.");
    setBusyId(null);
    setConfirmDeleteId(null);
  }

  const drafts = photos.filter((p) => !p.published);
  const live = [...photos.filter((p) => p.published)].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      {toast && (
        <div style={{ background: "var(--green-light)", border: "1px solid var(--green-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--green)", marginBottom: 14 }}>{toast}</div>
      )}
      {error && (
        <div style={{ background: "var(--red-light)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--red)", marginBottom: 14 }}>{error}</div>
      )}

      {/* ── DRAFT card — upload + stage, publish to go live ── */}
      {!readOnly && (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>Draft photos — add city and a caption, then publish</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", background: "var(--surface-soft)", padding: "5px 12px", borderRadius: 100 }}>{drafts.length} in draft</div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => uploadFiles(e.target.files)}
          style={{ display: "none" }}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            padding: 24, textAlign: "center", cursor: "pointer",
            border: `2px dashed ${dragging ? "var(--gold)" : "var(--border-strong)"}`,
            borderRadius: 10,
            background: dragging ? "var(--input-hover)" : "var(--input-paper)",
            transition: "border-color .15s, background .15s",
          }}
        >
          <svg width={26} height={26} fill="none" stroke="var(--ink-faint)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{uploading ? "Uploading…" : "Drag photos here, or click to browse"}</div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>JPG or PNG — multiple files at once</div>
        </div>

        {/* Draft grid — 3-col, per-card city + caption */}
        {drafts.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
            {drafts.map((p) => (
              <div key={p.id} style={{ border: "1px solid var(--border-strong)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ position: "relative", aspectRatio: "1" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {confirmDeleteId === p.id ? (
                    <button onClick={() => remove(p)} disabled={busyId === p.id} style={{ position: "absolute", top: 5, right: 5, borderRadius: 100, background: "var(--red)", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600, padding: "3px 8px" }}>Confirm</button>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(p.id)} aria-label="Remove draft" style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", background: "rgba(26,26,26,.75)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
                  )}
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  <input style={draftInput} defaultValue={p.caption_bottom_right ?? ""} placeholder="City" onBlur={(e) => saveCaption(p, "caption_bottom_right", e.target.value)} />
                  <input style={draftInput} defaultValue={p.caption_top_left ?? ""} placeholder="Caption (e.g. 'Group discussion, Q&amp;A round')" onBlur={(e) => saveCaption(p, "caption_top_left", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
            {drafts.length === 0 ? "Nothing in draft yet" : `${drafts.length} photo${drafts.length === 1 ? "" : "s"} ready — not live until published`}
          </div>
          <button
            onClick={() => publishAllDrafts(drafts.length)}
            disabled={drafts.length === 0 || publishing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, background: "var(--ink)", color: "#fff", border: "none",
              borderRadius: 100, padding: "6px 12px", fontSize: 12, fontWeight: 500, fontFamily: "inherit",
              cursor: drafts.length === 0 || publishing ? "not-allowed" : "pointer", opacity: drafts.length === 0 || publishing ? 0.4 : 1, whiteSpace: "nowrap",
            }}
          >
            <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            {publishing ? "Publishing…" : "Publish — adds to live gallery"}
          </button>
        </div>
      </div>
      )}

      {/* ── Currently live section ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Currently live on the landing page</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", background: "var(--surface-soft)", padding: "5px 12px", borderRadius: 100 }}>{live.length} / {GAL_MAX}</div>
      </div>

      {loading ? (
        <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>Loading…</div>
      ) : live.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "4rem 2rem", textAlign: "center", color: "var(--ink-faint)" }}>
          <svg width={32} height={32} fill="none" stroke="var(--border-strong)" strokeWidth={1.2} viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-muted)" }}>Nothing published yet</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", maxWidth: 380, lineHeight: 1.6 }}>
            {readOnly ? "No gallery photos have been published yet." : "Curate a few photos above and click Publish to populate the landing page gallery."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {live.map((p, i) => (
            <div key={p.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {i === 0 && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "rgba(26,26,26,.7)", color: "#fff", fontSize: 9, textAlign: "center", padding: "2px 0" }}>oldest — next to go</div>
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,.65))", color: "#fff", fontSize: 10, padding: "12px 6px 4px" }}>
                {p.caption_top_left && <div style={{ fontWeight: 500 }}>{p.caption_top_left}</div>}
                {p.caption_bottom_right && <div style={{ opacity: 0.85 }}>{p.caption_bottom_right}</div>}
              </div>
              {!readOnly && (
                <button onClick={() => unpublish(p)} disabled={busyId === p.id} title="Remove from the live gallery (moves it back to drafts)" aria-label="Remove from live" style={{ position: "absolute", top: 5, right: 5, width: 20, height: 20, borderRadius: "50%", background: "rgba(26,26,26,.75)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const draftInput: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 12, padding: "6px 8px",
  border: "1px solid var(--border-strong)", borderRadius: 5,
  background: "var(--input-paper)", color: "var(--ink)", width: "100%", boxSizing: "border-box",
};
