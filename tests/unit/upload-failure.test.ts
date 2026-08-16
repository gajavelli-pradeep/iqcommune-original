import { describe, expect, it } from "vitest";

import { networkFailure, readFailure } from "@/lib/api/failure";

/**
 * Every way a photo upload can fail, and what the sender is told.
 *
 * All of these used to arrive as one sentence — "we could not reach the server"
 * — because the response was parsed as JSON without asking whether it was, and
 * the whole submit sat in one catch. The misleading case is a body refused by
 * the platform before the route ever runs: that answers with HTML, so parsing
 * threw, so a working connection was blamed.
 */

const TOO_LARGE = "Those photos were too large to send in one go.";
const FOUR_MB = 4 * 1024 * 1024;

const jsonFailure = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const htmlFailure = (status: number) =>
  new Response("<html><body>Request Entity Too Large</body></html>", {
    status,
    headers: { "Content-Type": "text/html" },
  });

describe("a failure our own route described", () => {
  it("uses the message the route sent", async () => {
    const failure = await readFailure(
      jsonFailure(400, { error: { message: "Add at least one photo" } }),
      TOO_LARGE,
    );
    expect(failure.message).toBe("Add at least one photo");
  });

  it("carries the field detail through, for a form that shows it", async () => {
    const failure = await readFailure(
      jsonFailure(400, { error: { message: "Check the fields", fields: { photos: "Too few" } } }),
      TOO_LARGE,
    );
    expect(failure.fields).toEqual({ photos: "Too few" });
  });
});

describe("a failure nothing in the app produced", () => {
  it("reads a rejected body as too large, not as a broken connection", async () => {
    // The one that sent practitioners to check a connection that was working.
    // The platform cuts the request off above its body limit and answers with
    // HTML, so there is no message of ours to find.
    const failure = await readFailure(htmlFailure(413), TOO_LARGE);
    expect(failure.message).toBe(TOO_LARGE);
  });

  it("says timed out when it timed out", async () => {
    expect((await readFailure(htmlFailure(504), TOO_LARGE)).message).toMatch(/timed out/i);
    expect((await readFailure(htmlFailure(408), TOO_LARGE)).message).toMatch(/timed out/i);
  });

  it("says the server is refusing uploads when it is", async () => {
    expect((await readFailure(htmlFailure(503), TOO_LARGE)).message).toMatch(/not accepting uploads/i);
  });

  it("still names the status when it recognises nothing", async () => {
    // Better a number they can quote than a shrug.
    const failure = await readFailure(htmlFailure(418), TOO_LARGE);
    expect(failure.message).toContain("418");
  });

  it("never throws on a body it cannot read", async () => {
    // The whole point: this runs *because* parsing failed elsewhere.
    await expect(readFailure(new Response("", { status: 500 }), TOO_LARGE)).resolves.toBeTruthy();
  });
});

describe("a request that never got an answer", () => {
  it("blames the connection only when the payload was small", () => {
    expect(networkFailure(50 * 1024, FOUR_MB)).toMatch(/check your connection/i);
  });

  it("offers size as the likely cause when the payload was large", () => {
    // A body refused mid-flight is indistinguishable from a dropped connection
    // in the browser, so the more probable explanation goes first.
    expect(networkFailure(3 * 1024 * 1024, FOUR_MB)).toMatch(/too large/i);
    expect(networkFailure(3 * 1024 * 1024, FOUR_MB)).not.toMatch(/check your connection/i);
  });
});
