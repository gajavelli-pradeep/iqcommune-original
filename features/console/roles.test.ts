import { describe, expect, it } from "vitest";

import { can, tabsFor, toConsoleRole, CONSOLE_TABS } from "./roles";

/**
 * The capability model is the console's access control, so it is tested as
 * such rather than as configuration. The mockup hides controls with CSS; these
 * assertions are what make the difference real.
 */

describe("console roles", () => {
  it("gives the user role no way to change anything", () => {
    // "View & download only" is the spec's own description of this role.
    for (const capability of ["mutate", "manageTeam", "override", "purge"] as const) {
      expect(can("user", capability)).toBe(false);
    }
  });

  it("keeps team management to the global admin", () => {
    // The spec's own label: "Admin — full access except managing team members".
    expect(can("admin", "manageTeam")).toBe(false);
    expect(can("global_admin", "manageTeam")).toBe(true);
  });

  it("keeps the audit trail and permanent deletion to the global admin", () => {
    expect(can("admin", "viewActivity")).toBe(false);
    expect(can("admin", "purge")).toBe(false);
    expect(can("global_admin", "viewActivity")).toBe(true);
    expect(can("global_admin", "purge")).toBe(true);
  });

  it("omits a tab a role cannot open rather than rendering it hidden", () => {
    const adminTabs = tabsFor("admin").map((tab) => tab.id);
    expect(adminTabs).not.toContain("activity");
    expect(tabsFor("global_admin").map((tab) => tab.id)).toContain("activity");
  });

  it("gives every role a usable console", () => {
    for (const role of ["user", "admin", "global_admin"] as const) {
      expect(tabsFor(role).length).toBeGreaterThan(0);
    }
    expect(tabsFor("global_admin")).toHaveLength(CONSOLE_TABS.length);
  });

  it("rejects a role value it does not recognise", () => {
    // Anything unexpected in app_metadata must fail closed, not default to a
    // role with access.
    expect(toConsoleRole("super_admin")).toBeNull();
    expect(toConsoleRole(undefined)).toBeNull();
    expect(toConsoleRole("global_admin")).toBe("global_admin");
  });
});
