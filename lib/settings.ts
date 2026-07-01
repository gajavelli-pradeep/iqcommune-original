import { createAdminClient } from "@/lib/supabase/admin";

/** Whether regular (non-super) admins may manage the homepage gallery. Default true. */
export async function isGalleryAdminAccessEnabled(): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("app_settings")
    .select("value")
    .eq("key", "gallery_admin_access")
    .maybeSingle();
  // Missing row → default true; only an explicit false disables it.
  return data?.value === false ? false : true;
}
