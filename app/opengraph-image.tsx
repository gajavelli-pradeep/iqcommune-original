import { ImageResponse } from "next/og";

/**
 * Default social card (audit H6). Satori cannot resolve `var(--token)`, so the
 * brand colours are the literal values from globals.css `:root`
 * (ink #0f1117, cream #f8f7f4, gold #c9982a) — kept in sync by hand.
 */
export const runtime = "nodejs";
export const alt = "iqcommune — financial intelligence connects";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0f1117",
          color: "#f8f7f4",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#c9982a",
            fontWeight: 600,
          }}
        >
          iqcommune
        </div>
        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            fontSize: 68,
            lineHeight: 1.12,
            fontWeight: 600,
            maxWidth: 900,
          }}
        >
          <span>Real financial insight from&nbsp;</span>
          <span style={{ color: "#c9982a" }}>active&nbsp;</span>
          <span>professionals</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "rgba(248,247,244,0.6)" }}>
          Small, in-person sessions. People still in the field.
        </div>
      </div>
    ),
    size,
  );
}
