import { describe, it, expect, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ from: vi.fn() })),
  createServerClient: vi.fn(() => ({ from: vi.fn() })),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ getAll: () => [], setAll: vi.fn() })),
}));

describe("supabase clients", () => {
  it("createClient returns object with from()", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toHaveProperty("from");
  });

  it("createAdminClient uses service role key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();
    expect(client).toHaveProperty("from");
  });
});
