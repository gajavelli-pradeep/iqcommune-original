"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface GalleryPhoto {
  id: string;
  caption_top_left: string | null;
  caption_bottom_right: string | null;
  sort_order: number;
  published: boolean;
  url: string;
}

export function GalleryManager() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Upload form
  const [file, setFile] = useState<File | null>(null);
  const [topLeft, setTopLeft] = useState("");
  const [bottomRight, setBottomRight] = useState("");
  const [uploading, setUploading] = useState(false);
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
        setFile(null); setTopLeft(""); setBottomRight("");
        if (fileRef.current) fileRef.current.value = "";
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

      {/* Upload panel */}
      <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>Add a photo</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Image (JPEG / PNG / WebP · max 5 MB)</label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={labelStyle}>Top-left caption (gold pill — e.g. topic)</label>
            <input style={inputStyle} value={topLeft} onChange={(e) => setTopLeft(e.target.value)} placeholder="Foundations" />
          </div>
          <div>
            <label style={labelStyle}>Bottom-right caption (e.g. city)</label>
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

      {/* Grid */}
      {loading ? (
        <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>Loading…</div>
      ) : photos.length === 0 ? (
        <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>No photos yet — the public gallery shows placeholder cards until you add some.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {photos.map((p, i) => (
            <div key={p.id} style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, overflow: "hidden", opacity: p.published ? 1 : 0.6 }}>
              {/* Thumbnail with live overlay preview */}
              <div style={{ position: "relative", aspectRatio: "4/3", background: "#0a0a0a" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {p.caption_top_left && (
                  <span style={{ position: "absolute", top: 8, left: 8, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--gold)", background: "rgba(201,152,42,0.16)", border: "0.5px solid var(--gold-border)", borderRadius: 100, padding: "3px 8px" }}>{p.caption_top_left}</span>
                )}
                {p.caption_bottom_right && (
                  <span style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, color: "rgba(255,255,255,0.75)" }}>{p.caption_bottom_right}</span>
                )}
                {!p.published && (
                  <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9.5, fontWeight: 600, color: "var(--ink)", background: "var(--amber-light)", border: "0.5px solid var(--amber)", borderRadius: 100, padding: "2px 8px" }}>Draft</span>
                )}
              </div>

              {/* Edit */}
              <div style={{ padding: "10px 12px", display: "grid", gap: 8 }}>
                <input style={inputStyle} defaultValue={p.caption_top_left ?? ""} placeholder="Top-left caption" onBlur={(e) => saveCaption(p, "caption_top_left", e.target.value)} />
                <input style={inputStyle} defaultValue={p.caption_bottom_right ?? ""} placeholder="Bottom-right caption" onBlur={(e) => saveCaption(p, "caption_bottom_right", e.target.value)} />
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
