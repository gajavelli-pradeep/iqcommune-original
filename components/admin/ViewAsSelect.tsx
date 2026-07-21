"use client";

import { useAdminUI, type RoleView } from "@/components/admin/AdminUIContext";

// V5: single "Viewing as" switcher, three scopes. Only a real global admin sees
// it (callers gate), and it can only ever downgrade what they see — the server
// still enforces real permissions, so this is a preview, never an escalation.
const VIEW_OPTIONS: { value: RoleView; label: string }[] = [
  { value: "global", label: "Viewing as: Global Admin" },
  { value: "admin", label: "Viewing as: Admin" },
  { value: "user", label: "Viewing as: User" },
];

// Inline ink chevron for the custom-styled select (var() can't be used in the
// data-URI, so the ink hex is inlined here by necessity).
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%235b5e6c' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

/**
 * The "Viewing as" preview switcher. Rendered twice — in the top nav on desktop
 * and in the sidebar drawer on a phone, where the nav has no room for it — so it
 * lives here as one component rather than two copies that drift.
 *
 * The phone copy is not optional: the top-nav one is `display: none` below 768px,
 * and without a second home a global admin who previews as User on a phone has no
 * control left to switch back with.
 */
export function ViewAsSelect({ className, fullWidth = false }: { className?: string; fullWidth?: boolean }) {
  const { viewAs, setViewAs } = useAdminUI();

  return (
    <select
      className={className}
      value={viewAs}
      onChange={(e) => setViewAs(e.target.value as RoleView)}
      aria-label="Preview the console as another role"
      title="Preview what each role sees — your real permissions are unchanged"
      style={{
        fontSize: 12,
        fontFamily: "inherit",
        color: "var(--ink)",
        background: `${CHEVRON} no-repeat right 10px center, var(--surface-soft)`,
        border: "1px solid rgba(15,17,23,.18)",
        borderRadius: 100,
        padding: "6px 30px 6px 14px",
        appearance: "none",
        WebkitAppearance: "none",
        cursor: "pointer",
        ...(fullWidth ? { width: "100%", minHeight: 44 } : { maxWidth: 180 }),
      }}
    >
      {VIEW_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
