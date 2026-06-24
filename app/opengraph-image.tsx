import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "iqcommune — Finance Learning Sessions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#14161d", /* literal: Satori (OG image) cannot resolve CSS var() */
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#c9982a",
          marginBottom: 28,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        iqcommune
      </div>
      <div
        style={{
          fontSize: 58,
          fontWeight: 700,
          color: "#fff",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          marginBottom: 28,
        }}
      >
        Real practitioners.
        <br />
        <span style={{ color: "#c9982a" }}>Real sessions.</span>
      </div>
      <div
        style={{
          fontSize: 22,
          color: "rgba(255,255,255,0.55)",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        In-person finance sessions for your organisation.
        <br />
        No products. No pitch. Just knowledge.
      </div>
    </div>,
    { ...size }
  );
}
