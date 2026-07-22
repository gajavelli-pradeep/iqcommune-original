import { KeyValueGrid } from "@/components/ui/KeyValueGrid";
import { MAX_PHOTOS } from "@/lib/schemas/photo-submission";

/**
 * Operational settings — read-only. V7 has no settings table; these are the
 * system's live operating parameters, surfaced so an admin can confirm them
 * without reading code. Editable settings arrive with a settings store.
 */
export function SettingsPanel() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="mb-1 text-lg font-semibold text-ink">System settings</h2>
      <p className="mb-5 text-base text-ink-muted">
        The platform&apos;s current operating parameters. These are read-only until a settings store
        is added.
      </p>
      <KeyValueGrid
        variant="grid"
        rows={[
          { label: "Photo retention", value: "30 days from submission" },
          { label: "Photos per submission", value: `Up to ${MAX_PHOTOS}` },
          { label: "Public rate limit", value: "5 requests / 10 minutes per IP" },
          { label: "Payout basis", value: "Gross (pre-tax); TDS/GST administered offline" },
          { label: "Tokenised links", value: "HMAC-signed, short expiry, single-use invites" },
          { label: "Email delivery", value: "Live only when EMAIL_DELIVERY=live; otherwise a dry run" },
        ]}
      />
    </div>
  );
}
