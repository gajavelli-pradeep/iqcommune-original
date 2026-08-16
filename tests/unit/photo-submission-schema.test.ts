import { describe, expect, it } from "vitest";

import {
  photoSubmissionSchema,
  tokenedPhotoSubmissionSchema,
} from "@/lib/schemas/photo-submission";

/**
 * Which submission is validated against which rules.
 *
 * The two paths look alike and are not: on the public form a stranger types
 * every field, and on the emailed link the practitioner types none of them —
 * name, email, date and module are read off the record the token names. Rules
 * written for typed input do not belong on the second, and one of them caused a
 * submission to be refused for a field the sender never saw.
 */

/** Comfortably future, whatever day this runs. */
const AHEAD = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const PAST = "2026-07-31";

const submission = (sessionDate: string) => ({
  submitterName: "Vikram Varma",
  submitterEmail: "vikram@example.com",
  sessionDate,
  moduleTaught: "Equity Investing Simplified",
  participantConsent: true,
});

describe("a submission somebody typed", () => {
  it("accepts a session that has already happened", () => {
    expect(photoSubmissionSchema.safeParse(submission(PAST)).success).toBe(true);
  });

  it("refuses a date in the future, which is a typo", () => {
    const parsed = photoSubmissionSchema.safeParse(submission(AHEAD));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("That date is in the future");
  });
});

describe("a submission arriving through the emailed link", () => {
  it("accepts a session still to come", () => {
    // The photo guide goes out BEFORE the session and tells the practitioner to
    // bookmark the link, so the session's own date is routinely ahead when they
    // open it. Refusing that produced "Please check the highlighted fields" —
    // naming a field the practitioner never saw and could not have got wrong.
    expect(tokenedPhotoSubmissionSchema.safeParse(submission(AHEAD)).success).toBe(true);
  });

  it("still insists on a real date rather than anything at all", () => {
    // Only the future-date guard is dropped. A malformed date is a broken
    // record, not a judgement call about timing.
    const parsed = tokenedPhotoSubmissionSchema.safeParse(submission("not a date"));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("Choose the date of the session");
  });

  it("keeps every other rule the typed form has", () => {
    const parsed = tokenedPhotoSubmissionSchema.safeParse({
      ...submission(PAST),
      submitterEmail: "not an email",
      participantConsent: false,
    });
    expect(parsed.success).toBe(false);
    const messages = parsed.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toContain("Enter a valid email address");
    expect(messages).toContain("Consent is required before photos can be submitted");
  });
});
