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

export function GalleryManager({ readOnly = false }: { readOnly?: boolean } = {}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Upload form
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [topLeft, setTopLeft] = useState("");
  const [bottomRight, setBottomRight] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // Object-URL lifecycle: created in the picker (event handler), revoked here on change/unmount.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Validate client-side before accepting a file (drag-drop can bypass the input's accept).
  const pickFile = useCallback((f: File | null | undefined) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("Please choose a JPEG, PNG or WebP image."); return;
    }
    if (f.size > 5 * 1024 * 1024) { setError("Image exceeds the 5 MB limit."); return; }
    setError("");
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const fmtBytes = (b: number) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`);

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

  async function handleUpload() {
    if (!file) { setError("Choose an image first."); return; }
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("captionTopLeft", topLeft);
    fd.append("captionBottomRight", bottomRight);
    try {
      const res = await fetch("/api/admin/gallery", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Upload failed."); }
      else {
        setPhotos((prev) => [...prev, j.data as GalleryPhoto]);
        clearFile(); setTopLeft(""); setBottomRight("");
        flash("Photo added to the gallery.");
      }
    } catch { setError("Network error."); }
    finally { setUploading(false); }
  }

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

  async function togglePublish(p: GalleryPhoto) {
    setBusyId(p.id);
    const ok = await patch(p.id, { published: !p.published });
    if (ok) setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: !x.published } : x)));
    else setError("Could not update.");
    setBusyId(null);
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    const a = photos[index], b = photos[target];
    setBusyId(a.id);
    // Swap sort_order values, persist both, reorder locally.
    const ok = (await patch(a.id, { sort_order: b.sort_order })) && (await patch(b.id, { sort_order: a.sort_order }));
    if (ok) {
      setPhotos((prev) => {
        const next = [...prev];
        next[index] = { ...b, sort_order: a.sort_order };
        next[target] = { ...a, sort_order: b.sort_order };
        return next;
      });
    } else setError("Could not reorder.");
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

  return (
    <div>
      {toast && (
        <div style={{ background: "var(--green-light)", border: "1px solid var(--green-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--green)", marginBottom: 14 }}>{toast}</div>
      )}
      {error && (
        <div style={{ background: "var(--red-light)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--red)", marginBottom: 14 }}>{error}</div>
      )}

      {/* Upload panel — hidden for the read-only User tier (view-only gallery). */}
      {!readOnly && (
      <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>Add a photo</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Image</label>
            {/* Hidden native input, driven by the dropzone below */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => pickFile(e.target.files?.[0])}
              style={{ display: "none" }}
            />
            {file && previewUrl ? (
              // Selected-file preview card
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, border: "1px solid rgba(20,18,12,.15)", borderRadius: 10, background: "var(--surface-soft)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: "1px solid rgba(20,18,12,.1)" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{fmtBytes(file.size)}</div>
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} style={smallBtn}>Change</button>
                <button type="button" onClick={clearFile} aria-label="Remove image" style={{ ...smallBtn, border: "1px solid var(--red-border)", color: "var(--red)" }}>Remove</button>
              </div>
            ) : (
              // Empty dropzone
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "1.75rem 1rem", textAlign: "center", cursor: "pointer",
                  border: `1.5px dashed ${dragging ? "var(--gold)" : "rgba(20,18,12,.22)"}`,
                  borderRadius: 10,
                  background: dragging ? "var(--input-hover)" : "var(--input-paper)",
                  transition: "border-color .12s, background .12s",
                }}
              >
                <svg width={26} height={26} fill="none" stroke="var(--ink-faint)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div style={{ fontSize: 13, color: "var(--ink)" }}>
                  <span style={{ fontWeight: 600, color: "var(--gold-dark)" }}>Click to upload</span> or drag &amp; drop
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>JPEG, PNG or WebP · up to 5 MB</div>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Caption (a full sentence describing the session)</label>
            <input style={inputStyle} value={topLeft} onChange={(e) => setTopLeft(e.target.value)} placeholder="e.g. A full room learning retirement planning" />
          </div>
          <div>
            <label style={labelStyle}>City (optional)</label>
            <input style={inputStyle} value={bottomRight} onChange={(e) => setBottomRight(e.target.value)} placeholder="Mumbai" />
          </div>
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          style={{ marginTop: 14, background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: uploading || !file ? "not-allowed" : "pointer", opacity: uploading || !file ? 0.6 : 1, fontFamily: "inherit" }}
        >
          {uploading ? "Uploading…" : "Add to gallery"}
        </button>
      </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>Loading…</div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-muted)", marginBottom: 4 }}>Nothing published yet</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
            {readOnly
              ? "No gallery photos have been published yet."
              : "Curate a few photos above and click Publish to populate the landing page gallery."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, overflow: "hidden", opacity: p.published ? 1 : 0.6 }}>
              {/* Thumbnail with live overlay preview */}
              <div style={{ position: "relative", aspectRatio: "4/3", background: "#0a0a0a" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {/* V5 caption: top-left translucent badge + faint bottom-right city
                    — mirrors the landing render. */}
                {p.caption_top_left && (
                  <div style={{ position: "absolute", top: 8, left: 8, maxWidth: "70%", background: "rgba(26,26,26,0.55)", borderRadius: 6, padding: "4px 8px", fontSize: 10.5, fontWeight: 500, color: "rgba(255,255,255,0.85)", lineHeight: 1.35 }}>{p.caption_top_left}</div>
                )}
                {p.caption_bottom_right && (
                  <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(26,26,26,0.55)", borderRadius: 6, padding: "2px 7px", fontSize: 9.5, fontWeight: 500, color: "rgba(255,255,255,0.92)" }}>{p.caption_bottom_right}</span>
                )}
                {!p.published && (
                  <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9.5, fontWeight: 600, color: "var(--ink)", background: "var(--amber-light)", border: "0.5px solid var(--amber)", borderRadius: 100, padding: "2px 8px" }}>Draft</span>
                )}
              </div>

              {/* Edit controls — hidden for the read-only User tier. */}
              {!readOnly && (
              <div style={{ padding: "10px 12px", display: "grid", gap: 8 }}>
                <input style={inputStyle} defaultValue={p.caption_top_left ?? ""} placeholder="Caption (full sentence)" onBlur={(e) => saveCaption(p, "caption_top_left", e.target.value)} />
                <input style={inputStyle} defaultValue={p.caption_bottom_right ?? ""} placeholder="City (optional)" onBlur={(e) => saveCaption(p, "caption_bottom_right", e.target.value)} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => togglePublish(p)} disabled={busyId === p.id} style={smallBtn}>{p.published ? "Unpublish" : "Publish"}</button>
                  <button onClick={() => move(i, -1)} disabled={busyId === p.id || i === 0} style={{ ...smallBtn, opacity: i === 0 ? 0.4 : 1 }} aria-label="Move up">↑</button>
                  <button onClick={() => move(i, 1)} disabled={busyId === p.id || i === photos.length - 1} style={{ ...smallBtn, opacity: i === photos.length - 1 ? 0.4 : 1 }} aria-label="Move down">↓</button>
                  {confirmDeleteId === p.id ? (
                    <button onClick={() => remove(p)} disabled={busyId === p.id} style={{ ...smallBtn, border: "1px solid var(--red-border)", color: "var(--red)", marginLeft: "auto" }}>Confirm</button>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(p.id)} style={{ ...smallBtn, border: "1px solid var(--red-border)", color: "var(--red)", marginLeft: "auto" }}>Delete</button>
                  )}
                </div>
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "var(--ink-faint)", marginBottom: 5, fontWeight: 500,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px", border: "1px solid rgba(20,18,12,.18)", borderRadius: 8,
  fontSize: 13, fontFamily: "inherit", background: "var(--input-paper)", color: "var(--ink)", boxSizing: "border-box",
};
const smallBtn: React.CSSProperties = {
  fontSize: 12, padding: "5px 11px", border: "1px solid rgba(20,18,12,.18)", borderRadius: 6,
  background: "var(--surface)", cursor: "pointer", fontFamily: "inherit", color: "var(--ink)", whiteSpace: "nowrap",
};
