import { describe, expect, it } from "vitest";

import { escapeHtml, safeHref } from "./html";

describe("escapeHtml", () => {
  it("encodes every HTML-special character", () => {
    expect(escapeHtml(`<script>alert("hi") & 'bye'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;hi&quot;) &amp; &#x27;bye&#x27;&lt;/script&gt;",
    );
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Vikram Kulkarni")).toBe("Vikram Kulkarni");
  });
});

describe("safeHref", () => {
  it("passes through http/https URLs, HTML-encoded", () => {
    expect(safeHref("https://iqcommune.example/status?t=abc&x=1")).toBe(
      "https://iqcommune.example/status?t=abc&amp;x=1",
    );
  });

  it("blocks javascript: and data: URIs — escapeHtml alone wouldn't catch these", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBe("#");
  });

  it("blocks a malformed URL rather than throwing", () => {
    expect(safeHref("not a url")).toBe("#");
  });
});
